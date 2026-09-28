const fs = require('fs');
const path = require('path');
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

const activeBots = new Map();

// 📊 حالة كل جلسة (تُعرض في لوحة التحكم): متصل/غير متصل + آخر رمز QR
const sessionStatus = new Map();

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

function normalizeSessionName(value) {
  return (value || 'default').trim().replace(/[\\/]+/g, '-').replace(/^\.+/, '');
}

function getConfiguredSessionNames() {
  const raw = process.env.SESSION_NAMES || process.env.SESSION_NAME || process.env.SESSION_DIR || 'default';
  const names = raw
    .split(',')
    .map((name) => normalizeSessionName(name))
    .filter(Boolean);
  return names.length ? names : ['default'];
}

function getSessionPath(sessionName) {
  const baseDir = process.env.SESSION_BASE_DIR || path.join(__dirname, '..', 'session');
  return path.join(baseDir, normalizeSessionName(sessionName));
}

async function startBot(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);
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
      logger.info(`[${normalizedName}] امسح رمز QR التالي من واتساب > الأجهزة المرتبطة:`);
      qrcode.generate(qr, { small: true });
      // نخزّن الرمز حتى يظهر أيضاً داخل لوحة التحكم (أسهل بكثير من الطرفية)
      updateStatus(normalizedName, { connection: 'qr', qr });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(`[${normalizedName}] Connection closed. Reconnect? ${shouldReconnect}`);
      updateStatus(normalizedName, {
        connection: 'close',
        qr: null,
        lastDisconnect: { at: Date.now(), statusCode: statusCode || null, willReconnect: shouldReconnect },
      });
      if (shouldReconnect) {
        setTimeout(() => startBot(normalizedName), 3000);
      } else {
        logger.error(`[${normalizedName}] Logged out. Delete session ${normalizedName} or use reconnect command.`);
      }
    } else if (connection === 'open') {
      logger.info(`[${normalizedName}] ✅ Connected to WhatsApp successfully.`);
      updateStatus(normalizedName, {
        connection: 'open',
        qr: null,
        user: sock.user?.id || null,
        connectedAt: Date.now(),
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

async function resetSession(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);
  const sessionDir = getSessionPath(normalizedName);

  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  const existingBot = activeBots.get(normalizedName);
  if (existingBot?.ws?.close) {
    existingBot.ws.close();
  }
  activeBots.delete(normalizedName);

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
};
