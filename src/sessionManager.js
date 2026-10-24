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
const { handleParticipantsUpdate } = require('./handlers/welcomeHandler');
const {
  normalizeSessionName,
  getConfiguredSessionNames,
  getSessionPath,
  recoveryInstructions,
} = require('./utils/sessions');
const { listWaSessions, upsertWaSession, deactivateWaSession } = require('./database/db');

const activeBots = new Map();

// 📊 حالة كل جلسة (تُعرض في لوحة التحكم): متصل/غير متصل + آخر رمز QR
const sessionStatus = new Map();

// 🚧 منع تشغيل جلستين بنفس الاسم في نفس اللحظة (التشغيل المكرر = طرد من واتساب)
const bootingSessions = new Map(); // name -> Promise<sock>

// ⏱️ مؤقّتات إعادة الاتصال المعلّقة (تُلغى عند إعادة الربط اليدوي حتى لا تتكرّر الجلسة)
const reconnectTimers = new Map(); // name -> Timeout

// 🧷 جلسات أُغلقت بقصد (من resetSession) — لا يجب إعادة اتصالها تلقائياً
const intentionalClose = new Set();
// ربط برقم الهاتف (كود بدل QR): name -> رقم الهاتف. يبقى حتى يكتمل الربط فقط،
// فيُطلب كود جديد تلقائياً عند كل إعادة اتصال قبل اكتمال الربط.
const pendingPairing = new Map();
const PAIRING_DELAY_MS = Math.max(0, Number(process.env.PAIRING_REQUEST_DELAY_MS || 3000));
const PAIRING_MAX_ATTEMPTS = 4;

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

// يطلب كود الربط من واتساب ويخزّنه في الحالة (تظهر في اللوحة). يتوقف إذا صار السوكيت قديماً.
async function requestPairingCodeWithRetry(sock, name, phone, attempt = 1) {
  if (activeBots.get(name) !== sock) return;
  try {
    const raw = await sock.requestPairingCode(phone);
    if (activeBots.get(name) !== sock) return;
    const code = String(raw || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    const pretty = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
    updateStatus(name, { pairingCode: pretty, pairingPhone: phone, pairingAt: Date.now(), pairingError: null });
    logger.info(`[${name}] 🔢 كود الربط بالهاتف: ${pretty} — أدخله في واتساب > الأجهزة المرتبطة > ربط برقم الهاتف.`);
  } catch (err) {
    if (activeBots.get(name) !== sock) return;
    logger.warn(`[${name}] تعذّر طلب كود الربط (محاولة ${attempt}/${PAIRING_MAX_ATTEMPTS}): ${err.message}`);
    if (attempt < PAIRING_MAX_ATTEMPTS) {
      const t = setTimeout(() => requestPairingCodeWithRetry(sock, name, phone, attempt + 1), 4000 * attempt);
      if (t.unref) t.unref();
    } else {
      updateStatus(name, { pairingCode: null, pairingError: 'تعذّر الحصول على كود الربط. تأكد من الرقم (بالصيغة الدولية بدون +) ثم أعد المحاولة.' });
    }
  }
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

  // ⚠️ إصلاح التكرار: السوكيت القديم يبقى حياً لحظة بعد إعادة الاتصال، فكان يعالج
  // الرسائل والأوامر مرة ثانية. الآن كل مستمع يتجاهل أي سوكيت لم يعد هو الحالي.
  const isCurrent = () => activeBots.get(normalizedName) === sock;

  sock.ev.on('connection.update', (update) => {
    if (!isCurrent()) {
      if (update.connection === 'close') {
        intentionalClose.delete(normalizedName);
        logger.info(`[${normalizedName}] تم إغلاق سوكيت قديم (لا يؤثر على الجلسة الحالية).`);
      }
      return;
    }
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
      pendingPairing.delete(normalizedName);
      updateStatus(normalizedName, {
        connection: 'open',
        qr: null,
        pairingCode: null,
        pairingPhone: null,
        pairingError: null,
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
  sock.ev.on('messages.upsert', (payload) => {
    if (!isCurrent()) return;
    handleIncomingMessages(payload, sock);
  });
  sock.ev.on('messages.update', (updates) => {
    if (!isCurrent()) return;
    handleMessageUpdates(updates, sock);
  });
  // الترحيب يعتمد على حدث انضمام الأعضاء الرسمي
  sock.ev.on('group-participants.update', (event) => {
    if (!isCurrent()) return;
    handleParticipantsUpdate(event, sock).catch((err) => logger.error('خطأ في الترحيب: ' + err.message));
  });

  // إن وُجد سوكيت سابق لنفس الجلسة نغلقه حتى لا يبقى حياً بالخلفية
  const previous = activeBots.get(normalizedName);
  activeBots.set(normalizedName, sock);
  if (previous && previous !== sock) {
    try { previous.end?.(undefined); } catch { /* تجاهل */ }
  }

  // ربط برقم الهاتف: نطلب الكود بعد لحظة قصيرة (يحتاج السوكيت أن يبدأ الاتصال أولاً)
  const pairingPhone = pendingPairing.get(normalizedName);
  if (pairingPhone && !state.creds?.registered) {
    updateStatus(normalizedName, { pairingPhone, pairingError: null });
    const t = setTimeout(() => requestPairingCodeWithRetry(sock, normalizedName, pairingPhone), PAIRING_DELAY_MS);
    if (t.unref) t.unref();
  } else if (state.creds?.registered) {
    pendingPairing.delete(normalizedName);
  }

  // الجدولة تعمل مرة واحدة فقط لكل عملية، وتستخدم دائماً السوكيت الحالي للجلسة الأساسية
  if (normalizedName === getConfiguredSessionNames()[0]) {
    startScheduler(() => activeBots.get(normalizedName) || null);
  }
  return sock;
}

async function startBot(sessionName = 'default') {
  const normalizedName = normalizeSessionName(sessionName);
  // 🚧 منع التكرار: إن كانت الجلسة متصلة الآن فلا نفتح سوكيت ثانياً
  if (activeBots.has(normalizedName) && sessionStatus.get(normalizedName)?.connection === 'open') {
    return activeBots.get(normalizedName);
  }

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

async function resetSession(sessionName = 'default', opts = {}) {
  const normalizedName = normalizeSessionName(sessionName);
  const sessionDir = getSessionPath(normalizedName);

  // ألغِ أي إعادة اتصال معلّقة حتى لا نحصل على جلستين تعملان معاً
  clearReconnectTimer(normalizedName);
  autoResetState.delete(normalizedName);
  // الجلسة أُضيفت بكود الهاتف ← تبقى في وضع الكود عند إعادة الربط (لا تتحول إلى QR)
  const pairingPhone = opts.pairingPhone || storedPairingPhone(normalizedName);
  if (pairingPhone) pendingPairing.set(normalizedName, pairingPhone);
  else pendingPairing.delete(normalizedName);

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
  updateStatus(normalizedName, {
    connection: 'connecting', qr: null, needsRelink: false, user: null, connectedAt: null,
    pairingCode: null, pairingError: null, pairingPhone: null,
  });

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

/** رقم الهاتف المحفوظ لجلسة أُضيفت بكود الربط (أو null) */
function storedPairingPhone(name) {
  try {
    const row = (listWaSessions() || []).find((r) => normalizeSessionName(r.name) === name);
    return row && row.login_method === 'pairing' && row.phone ? row.phone : null;
  } catch {
    return null;
  }
}

// كل الجلسات: الأساسية من .env + الإضافية المحفوظة من اللوحة
function getAllSessionNames() {
  const env = getConfiguredSessionNames();
  let extra = [];
  try {
    extra = (listWaSessions() || []).map((r) => normalizeSessionName(r.name));
  } catch {
    extra = [];
  }
  return Array.from(new Set([...env, ...extra]));
}

async function startAllSessions() {
  for (const name of getAllSessionNames()) {
    try {
      await startBot(name);
    } catch (err) {
      logger.error(`[${name}] تعذّر تشغيل الجلسة: ${err.message}`);
    }
  }
}

const SESSION_NAME_RE = /^[\p{L}\p{N}_-]{1,32}$/u;

/**
 * يضيف جلسة جديدة من اللوحة.
 * - بدون phone: تُعرض QR للربط.
 * - مع phone: يُطلب كود ربط (8 أحرف) يُدخله المستخدم في واتساب.
 * التشغيل يتم في الخلفية حتى لا تنتظر الواجهة شبكة واتساب.
 */
function addSession({ name, phone = null } = {}) {
  const normalized = normalizeSessionName(name);
  if (!SESSION_NAME_RE.test(normalized)) {
    throw new Error('اسم الجلسة يجب أن يكون حروفاً أو أرقاماً أو - أو _ (حتى 32 حرفاً)');
  }
  if (phone && !/^[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('رقم الهاتف يجب أن يكون بالصيغة الدولية بدون + أو 00 (مثال: 967771234567)');
  }
  const exists = getAllSessionNames().includes(normalized);
  if (exists && !phone) {
    const status = sessionStatus.get(normalized);
    if (status && status.connection !== 'loggedout') throw new Error(`الجلسة ${normalized} موجودة وتعمل بالفعل`);
  }

  upsertWaSession({ name: normalized, loginMethod: phone ? 'pairing' : 'qr', phone: phone || null });

  const run = phone ? resetSession(normalized, { pairingPhone: phone }) : startBot(normalized);
  run.catch((err) => logger.error(`[${normalized}] فشل تشغيل الجلسة: ${err.message}`));
  return { name: normalized, method: phone ? 'pairing' : 'qr' };
}

/** يحذف جلسة إضافية: يغلق سوكيتها ويمسح بيانات ربطها ويعطّلها في القاعدة. الجلسة الأساسية لا تُحذف من اللوحة. */
function removeSession(name) {
  const normalized = normalizeSessionName(name);
  if (normalized === getConfiguredSessionNames()[0]) {
    throw new Error('لا يمكن حذف الجلسة الأساسية من اللوحة (عرّفها في .env إن أردت تغييرها)');
  }
  clearReconnectTimer(normalized);
  autoResetState.delete(normalized);
  pendingPairing.delete(normalized);

  const sock = activeBots.get(normalized);
  if (sock) {
    intentionalClose.add(normalized);
    try { sock.end?.(undefined); } catch { /* تجاهل */ }
  }
  activeBots.delete(normalized);
  sessionStatus.delete(normalized);

  const dir = getSessionPath(normalized);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  deactivateWaSession(normalized);
  logger.info(`[${normalized}] 🗑️ حُذفت الجلسة من اللوحة.`);
  return { name: normalized };
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
  getAllSessionNames,
  addSession,
  removeSession,
};
