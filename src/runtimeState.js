// =============================================
// 🧠 حالة التشغيل المشتركة (Runtime State)
// =============================================
// ملف صغير جداً لا يستورد أي شيء آخر، والغرض منه:
// 1) مشاركة معلومات الجلسات الحية بين البوت ولوحة التحكم.
// 2) كسر الاستيراد الدائري (circular require) بين:
//    sessionManager -> handlers -> commands/admin -> sessionManager
//    والذي كان يجعل دوال مثل resetSession/getActiveSessionNames تساوي undefined
//    داخل commands/admin.js (فتتوقف أوامر !جلسات و !اعادةربط و !لوحة).
// 3) تخزين آخر رمز QR صدر من واتساب لكل جلسة، حتى تعرضه لوحة التحكم كصورة
//    قابلة للمسح بدل البحث عنه داخل سجلات Railway.
// =============================================

const startedAt = Date.now();

/** @type {Map<string, { sock: any, connectedAt: number, connected: boolean }>} */
const bots = new Map();

/** @type {Map<string, { qr: string, at: number }>} */
const lastQr = new Map();

function registerBot(name, sock) {
  const prev = bots.get(name);
  bots.set(name, { sock, connectedAt: prev?.connectedAt || 0, connected: false });
}

// ⚠️ الاتصال الفعلي لا يعني مجرد إنشاء الـ socket، بل حدث connection.update = open.
// لوحدة القياس هذه أهمية: بدونها تظن اللوحة أن البوت متصل وهو في حلقة إعادة محاولة.
function markConnected(name) {
  const entry = bots.get(name);
  if (entry) { entry.connected = true; entry.connectedAt = Date.now(); }
}

function markDisconnected(name) {
  const entry = bots.get(name);
  if (entry) entry.connected = false;
}

function isConnected(name) {
  if (name) return !!bots.get(name)?.connected;
  for (const entry of bots.values()) if (entry.connected) return true;
  return false;
}

/** قائمة الجلسات مع حالة كل واحدة — تستخدمها اللوحة و !جلسات */
function getSessions() {
  return Array.from(bots.entries()).map(([name, entry]) => ({
    name,
    connected: entry.connected,
    connectedAt: entry.connectedAt || null,
    jid: entry.sock?.user?.id || null,
  }));
}

function unregisterBot(name) {
  bots.delete(name);
  lastQr.delete(name);
}

function getBot(name) {
  return bots.get(name) || null;
}

function getActiveSessionNames() {
  return Array.from(bots.keys());
}

/** أول socket نشط (الجلسة الأساسية) — تستخدمه لوحة التحكم للعمليات السريعة */
function getPrimarySocket() {
  const first = bots.values().next();
  return first.done ? null : first.value.sock;
}

function setQr(name, qr) {
  if (qr) lastQr.set(name, { qr, at: Date.now() });
  else lastQr.delete(name);
}

/** يعيد قائمة { session, qr, ageSeconds } لآخر رمز QR صدر ولم يُستبدل بمسح ناجح */
function getPendingQrCodes(maxAgeSeconds = 300) {
  const now = Date.now();
  const out = [];
  for (const [name, item] of lastQr.entries()) {
    const ageSeconds = Math.round((now - item.at) / 1000);
    if (ageSeconds > maxAgeSeconds) continue;
    out.push({ session: name, qr: item.qr, ageSeconds });
  }
  return out;
}

function getUptimeSeconds() {
  return Math.round((Date.now() - startedAt) / 1000);
}

module.exports = {
  startedAt,
  registerBot,
  markConnected,
  markDisconnected,
  isConnected,
  getSessions,
  unregisterBot,
  getBot,
  getActiveSessionNames,
  getPrimarySocket,
  setQr,
  getPendingQrCodes,
  getUptimeSeconds,
};
