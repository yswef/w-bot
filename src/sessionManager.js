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
const startDashboard = require('./web/dashboard');

const activeBots = new Map();
let dashboardStarted = false;

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
      logger.info(`[${normalizedName}] امسح كود QR التالي للربط:`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(`[${normalizedName}] انقطع الاتصال. إعادة اتصال؟ ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => startBot(normalizedName), 3001);
      } else {
        logger.error(`[${normalizedName}] تم تسجيل الخروج. امسح جلسة ${normalizedName} أو استخدم أمر إعادة الربط.`);
      }
    } else if (connection === 'open') {
      logger.info(`[${normalizedName}] ✅ تم الاتصال بواتساب بنجاح.`);
    }
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', (payload) => handleIncomingMessages(payload, sock));
  sock.ev.on('messages.update', (updates) => handleMessageUpdates(updates, sock));

  activeBots.set(normalizedName, sock);

if (!dashboardStarted) {
    dashboardStarted = true;
    startDashboard();
  }

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
