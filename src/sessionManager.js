const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const logger = require('./utils/logger');
const handleIncomingMessages = require('./handlers/messageHandler');
const handleMessageUpdates = require('./handlers/deleteHandler');
const startScheduler = require('./scheduler/events');
const {
  normalizeSessionName,
  getConfiguredSessionNames,
  getSessionPath,
  recoveryInstructions,
} = require('./utils/sessions');

const activeBots = new Map();

// 📊 حالة كل جلسة (تُعرض في لوحة التحكم): متصل/غير متصل + آخر رمز QR
const sessionStatus = new Map();

// 🚧 منع تشغيل جلستين بنفس الاسم في نفس اللحظة (التشغيل المكرر = طرد من واتساب)
const bootingSessions = new Map(); // name -> Promise<sock>

// ⏱️ مؤقّتات إعادة الاتصال المعلّقة (تُلغى عند إعادة الربط اليدوي حتى لا تتكرّر الجلسة)
const reconnectTimers = new Map(); // name -> Timeout

// 🧷 جلسات أُغلقت بقصد (من resetSession) — لا يجب إعادة اتصالها تلقائياً
const intentionalClose = new Set();

// 🔁 حالة إعادة الضبط التلقائية بعد "تسجيل الخروج"
const autoResetState = new Map(); // name -> { attempts, lastAt }

// ⚙️ عندما يسجّل واتساب خروجاً (loggedOut) تصبح بيانات الجلسة ميتة ولا يمكن إحياءها،
// وأمر ".اعادةربط" لا ينفع لأن البوت نفسه مقطوع! لذلك نحذف الجلسة ونطبع رمز QR جديداً
// تلقائياً حتى يستطيع المستخدم إعادة الربط من الطرفية أو من لوحة التحكم.
const AUTO_RESET_ON_LOGOUT = process.env.AUTO_RESET_ON_LOGOUT !== 'false';
const AUTO_RESET_MAX_ATTEMPTS = Math.max(1, Number(process.env.AUTO_RESET_MAX_ATTEMPTS || 5));
const AUTO_RESET_COOLDOWN_MS = Math.max(1000, Number(process.env.AUTO_RESET_COOLDOWN_MS || 60000));

function updateStatus(name, patch) {
  const current = sessionStatus.get(name) || {
    name,
    connection: 'connecting',
    qr: null,
    user: null,
    connectedAt: null,
    lastDisconnect: null,
  };
  sessionStatus.set(name, { ...current, ...patch });
}

function getSessionsStatus() {
  return Array.from(sessionStatus.values());
}

function logRecoveryHelp(name) {
  const info = recoveryInstructions(name);
  logger.error(`[${name}] ⛔ واتساب أنهى ربط الجلسة (loggedOut) — المجلد: ${info.sessionDir}`);
  logger.error(`[${name}] 🔧 "reconnect" ليس أمر نظام! لإعادة الربط من طرفية السيرفر نفّذ أحد الأمرين:`);
  info.commands.forEach((cmd, i) => logger.error(`[${name}]    ${i + 1}) ${cmd}`));
  logger.error(`[${name}] 💡 بعد الحذف سيظهر رمز QR في الطرفية وفي لوحة التحكم ← واتساب ← الأجهزة المرتبطة ← ربط جهاز.`);
}

function clearReconnectTimer(name) {
  const timer = reconnectTimers.get(name);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(name);
  }
}

function scheduleReconnect(name, delayMs, reason = '') {
  clearReconnectTimer(name);
  const timer = setTimeout(() => {
    reconnectTimers.delete(name);
    startBot(name).catch((err) => {
      logger.error(`[${name}] فشل إعادة الاتصال: ${err.message}`);
      scheduleReconnect(name, 10000, 'بعد فشل إعادة الاتصال');
    });
  }, delayMs);
  reconnectTimers.set(name, timer);
  logger.info(`[${name}] ⏳ إعادة اتصال تلقائية بعد ${Math.round(delayMs / 1000)} ثانية ${reason}`.trim());
}

async function launchSession(normalizedName) {
  const sessionDir = getSessionPath(normalizedName);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  updateStatus(normalizedName, { connection: 'connecting' });

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
      logger.info(`[${normalizedName}] 📱 امسح رمز QR التالي من واتساب > الأجهزة المرتبطة:`);
      qrcode.generate(qr, { small: true });
      // نخزّن الرمز حتى يظهر أيضاً داخل لوحة التحكم (أسهل بكثير من الطرفية)
      updateStatus(normalizedName, { connection: 'qr', qr, qrAt: Date.now() });
    }

    if (connection === 'close') {
      // إغلاق مقصود (بسبب إعادة ربط من اللوحة/الأمر/السكربت) — لا نعيد الاتصال حتى لا تتكرر الجلسة
      if (intentionalClose.has(normalizedName)) {
        intentionalClose.delete(normalizedName);
        logger.info(`[${normalizedName}] ♻️ أُغلقت الجلسة القديمة تمهيداً لإعادة الربط.`);
        return;
      }

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(`[${normalizedName}] Connection closed. Reconnect? ${shouldReconnect}`);
      updateStatus(normalizedName, {
        connection: shouldReconnect ? 'close' : 'loggedout',
        qr: null,
        lastDisconnect: { at: Date.now(), statusCode: statusCode || null, willReconnect: shouldReconnect },
      });

      if (shouldReconnect) {
        scheduleReconnect(normalizedName, 3000, `(رمز الانقطاع: ${statusCode || 'غير معروف'})`);
      } else {
        handleLoggedOut(normalizedName);
      }
    } else if (connection === 'open') {
      logger.info(`[${normalizedName}] ✅ Connected to WhatsApp successfully.`);
      autoResetState.delete(normalizedName); // نجح الربط ← صفّر عدّاد المحاولات
      updateStatus(normalizedName, {
        connection: 'open',
        qr: null,
        user: sock.user?.id || null,
        connectedAt: Date.now(),
        lastDisconnect: null,
      });
      // تحميل مسبق لصور شخصيات الأنمي في الخلفية (لا يوقف تشغيل البوت)
      require('./commands/fun').warmupCharacterImages().catch((err) => {
        logger.error(`فشل التحميل المسبق لصور الشخصيات: ${err.message}`);
      });
    }
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', (payload) => handleIncomingMessages(payload, sock));
  sock.ev.on('messages.update', (updates) => handleMessageUpdates(updates, sock));

  activeBots.set(normalizedName, sock);

  if (normalizedName === getConfiguredSessionNames()[0]) {
    startScheduler(sock);
  }

  return sock;
}

async function startBot(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);

  // 🚧 لو طُلب تشغيل نفس الجلسة وهي قيد التشغيل أصلاً نتجاهل الطلب المكرر،
  // لأن تشغيل جلستين بنفس بيانات الاعتماد يجعل واتساب يطرد إحداهما (loggedOut).
  const inFlight = bootingSessions.get(normalizedName);
  if (inFlight) {
    logger.warn(`[${normalizedName}] ⏳ التشغيل قيد التنفيذ بالفعل — تجاهل الطلب المكرر.`);
    return inFlight;
  }

  const bootPromise = launchSession(normalizedName);
  bootingSessions.set(normalizedName, bootPromise);
  try {
    return await bootPromise;
  } finally {
    bootingSessions.delete(normalizedName);
  }
}

// ⛔ التعامل مع تسجيل الخروج: شرح واضح + إعادة ضبط تلقائية (رمز QR جديد)
function handleLoggedOut(normalizedName) {
  logRecoveryHelp(normalizedName);

  if (!AUTO_RESET_ON_LOGOUT) {
    logger.warn(`[${normalizedName}] ℹ️ إعادة الضبط التلقائية معطّلة (AUTO_RESET_ON_LOGOUT=false) — نفّذ الأمر يدوياً.`);
    updateStatus(normalizedName, { connection: 'loggedout', needsRelink: true });
    return;
  }

  const state = autoResetState.get(normalizedName) || { attempts: 0, lastAt: 0 };
  if (state.attempts >= AUTO_RESET_MAX_ATTEMPTS) {
    logger.error(
      `[${normalizedName}] 🛑 توقفت إعادة الضبط التلقائية بعد ${state.attempts} محاولات — ` +
        'نفّذ الأمر يدوياً أو ارفع AUTO_RESET_MAX_ATTEMPTS.'
    );
    updateStatus(normalizedName, { connection: 'loggedout', needsRelink: true });
    return;
  }

  const waitMs = Math.max(0, AUTO_RESET_COOLDOWN_MS - (Date.now() - state.lastAt));
  autoResetState.set(normalizedName, { attempts: state.attempts + 1, lastAt: Date.now() });
  updateStatus(normalizedName, { connection: 'loggedout', needsRelink: true, autoResetAt: Date.now() + waitMs });

  logger.warn(
    `[${normalizedName}] 🔁 إعادة ضبط تلقائية للجلسة (محاولة ${state.attempts + 1}/${AUTO_RESET_MAX_ATTEMPTS}) ` +
      `بعد ${Math.round(waitMs / 1000)} ثانية — سيظهر رمز QR جديد.`
  );

  clearReconnectTimer(normalizedName);
  const timer = setTimeout(() => {
    reconnectTimers.delete(normalizedName);
    resetSession(normalizedName).catch((err) => {
      logger.error(`[${normalizedName}] فشلت إعادة الضبط التلقائية: ${err.message}`);
    });
  }, waitMs);
  reconnectTimers.set(normalizedName, timer);
}

async function resetSession(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);
  const sessionDir = getSessionPath(normalizedName);

  // ألغِ أي إعادة اتصال معلّقة حتى لا نحصل على جلستين تعملان معاً
  clearReconnectTimer(normalizedName);
  autoResetState.delete(normalizedName);

  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    logger.info(`[${normalizedName}] 🗑️ حُذف مجلد الجلسة: ${sessionDir}`);
  }

  const existingBot = activeBots.get(normalizedName);
  if (existingBot) {
    intentionalClose.add(normalizedName);
    try {
      existingBot.ws?.close?.();
      existingBot.end?.();
    } catch (err) {
      logger.warn(`[${normalizedName}] تعذّر إغلاق الاتصال القديم: ${err.message}`);
    }
  }
  activeBots.delete(normalizedName);
  updateStatus(normalizedName, { connection: 'connecting', qr: null, needsRelink: false, user: null, connectedAt: null });

  logger.info(`[${normalizedName}] ♻️ جاري إعادة الربط — راقب رمز QR في الطرفية أو في لوحة التحكم.`);
  return startBot(normalizedName);
}

function getActiveSessionNames() {
  return Array.from(activeBots.keys());
}

function getActiveSocket(sessionName) {
  if (sessionName) return activeBots.get(normalizeSessionName(sessionName)) || null;
  return activeBots.values().next().value || null;
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
  getSessionsStatus,
  getActiveSocket,
  normalizeSessionName,
  recoveryInstructions,
};
