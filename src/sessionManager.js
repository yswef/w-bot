const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const logger = require('./utils/logger');
const config = require('./config');
const runtimeState = require('./runtimeState');
const handleIncomingMessages = require('./handlers/messageHandler');
const handleMessageUpdates = require('./handlers/deleteHandler');
const startScheduler = require('./scheduler/events');

// ⚠️ ملاحظة معمارية: قائمة الجلسات النشطة انتقلت إلى src/runtimeState.js،
// وأسماء/مسارات الجلسات انتقلت إلى src/sessionPaths.js.
// السبب: كانت commands/admin.js تستدعي require('../sessionManager') في أعلى
// الملف، بينما sessionManager يستورد الـ handlers التي تستدعي الأوامر -> حلقة
// استيراد (circular require) تجعل الدوال المستوردة تساوي undefined، فتفشل
// أوامر !جلسات و !اعادةربط و !لوحة. الملفات الجديدة لا تستورد شيئاً فتنهي الحلقة.

const { normalizeSessionName, getConfiguredSessionNames, getSessionPath, getVolumeMountPath } = require('./sessionPaths');

async function startBot(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);
  const sessionDir = getSessionPath(normalizedName);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  const volume = getVolumeMountPath();
  logger.info(
    `[${normalizedName}] 📂 مجلد الجلسة: ${sessionDir}` +
    (volume
      ? ` (على Volume تلقائياً: ${volume})`
      : ' | ⚠️ داخل الحاوية (يُمسح مع كل deploy). من Railway: Service → Attach Volume → Mount Path = /app/data، وسيلتقطه البوت تلقائياً عبر RAILWAY_VOLUME_MOUNT_PATH بدون أي متغير إضافي.')
  );

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: require('pino')({ level: 'silent' }),
    browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info(`[${normalizedName}] 📱 امسح رمز QR التالي من واتساب (الأجهزة المرتبطة):`);
      qrcode.generate(qr, { small: true });
      // نخزّن الرمز حتى تعرضه لوحة التحكم أيضاً (مفيد على Railway حيث السجلات مزعجة)
      runtimeState.setQr(normalizedName, qr);
      logger.info(`[${normalizedName}] نص الرمز (يمكن نسخه لأي أداة QR): ${qr}`);
      logger.info(`[${normalizedName}] ⏳ تنتظر المسح 60 ثانية ثم يتجدد تلقائياً.`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(`[${normalizedName}] Connection closed (status ${statusCode}). Reconnect? ${shouldReconnect}`);
      runtimeState.markDisconnected(normalizedName);
      if (shouldReconnect) {
        setTimeout(() => startBot(normalizedName), 3000);
      } else {
        runtimeState.setQr(normalizedName, null);
        logger.error(`[${normalizedName}] Logged out. احذف مجلد الجلسة ${sessionDir} أو أرسل !اعادةربط ثم امسح QR جديد.`);
      }
    } else if (connection === 'open') {
      runtimeState.markConnected(normalizedName);
      runtimeState.setQr(normalizedName, null); // تم الربط بنجاح، لا حاجة للرمز
      logger.info(`[${normalizedName}] ✅ Connected to WhatsApp successfully.`);
      logger.info(`[${normalizedName}] 🧩 رقم البوت: ${sock.user?.id || 'غير معروف'} | لوحة التحكم: ${config.buildPublicUrl()}`);
      // تحميل مسبق لصور شخصيات الأنمي في الخلفية (لا يوقف تشغيل البوت)
      require('./commands/fun').warmupCharacterImages().catch((err) => {
        logger.error(`فشل التحميل المسبق لصور الشخصيات: ${err.message}`);
      });
    }
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', (payload) => handleIncomingMessages(payload, sock));
  sock.ev.on('messages.update', (updates) => handleMessageUpdates(updates, sock));

  runtimeState.registerBot(normalizedName, sock);

  if (normalizedName === getConfiguredSessionNames()[0]) {
    startScheduler(sock);
  }

  return sock;
}

async function resetSession(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);
  const sessionDir = getSessionPath(normalizedName);

  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  const existingBot = runtimeState.getBot(normalizedName)?.sock;
  if (existingBot?.ws?.close) {
    existingBot.ws.close();
  }
  runtimeState.unregisterBot(normalizedName);

  return startBot(normalizedName);
}

function getActiveSessionNames() {
  return runtimeState.getActiveSessionNames();
}

async function startAllSessions() {
  const names = getConfiguredSessionNames();
  for (const name of names) {
    await startBot(name);
  }
}

module.exports = {
  startBot,
  startAllSessions,
  resetSession,
  getActiveSessionNames,
  getConfiguredSessionNames,
  getSessionPath,
};
