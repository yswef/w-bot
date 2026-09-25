// =============================================
// 📂 مسارات الجلسة وقاعدة البيانات والوسائط
// =============================================
// ملف مستقل لا يستورد شيئاً من ملفات المشروع، حتى تستخدمه لوحة التحكم وأوامر
// المالك دون الوقوع في حلقة الاستيراد مع sessionManager.
//
// لماذا كل هذا التعقيد؟ لأن أكبر مصدر حيرة على السحابة هو:
//   «أين تُحفظ بياناتي؟ ولماذا تختفي بعد كل deploy؟»
// لذلك تُحسب المسارات في مكان واحد، ويُكتشف قرص Railway الدائم تلقائياً،
// وتُطبع مصادرها في !جلسات ولوحة التحكم (describePaths).
//
// أولوية كل مسار: متغير بيئي يدوي ← Volume إن وُجد ← جذر المشروع.
// =============================================

const path = require('path');

const ROOT = path.join(__dirname, '..');

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

/**
 * مسار الـ Volume الذي تركّبه Railway على الخدمة.
 * Railway تُحقّنه تلقائياً (RAILWAY_VOLUME_MOUNT_PATH) فلا يحتاج المستخدم أن
 * يكتب أي متغير: بمجرد إرفاق Volume تنتقل البيانات إليه بعد إعادة النشر.
 */
function getVolumeMountPath() {
  const volume = (process.env.RAILWAY_VOLUME_MOUNT_PATH || '').trim();
  return volume.startsWith('/') ? volume.replace(/\/+$/, '') : '';
}

// صيغة واحدة لكل المسارات: تجاوز يدوي ← Volume ← جذر المشروع
function resolvePath(envName, volumeSubPath, projectSubPath) {
  const manual = (process.env[envName] || '').trim();
  if (manual) return manual;
  const volume = getVolumeMountPath();
  if (volume) return path.join(volume, volumeSubPath);
  return path.join(ROOT, projectSubPath);
}

/** مجلدات جلسات Baileys (creds/keys) — إن لم يكن على Volume فسيُحذف مع كل deploy */
function getSessionBaseDir() {
  return resolvePath('SESSION_BASE_DIR', 'session', 'session');
}

/** مجلد الوسائط المنزّلة/المسترجَعة */
function getMediaStoreDir() {
  return resolvePath('MEDIA_STORE_DIR', 'media_store', 'media_store');
}

/** ملف SQLite (رسائل، ردود، حظر، تذكيرات، حالات ألعاب) */
function getDatabasePath() {
  return resolvePath('DB_PATH', 'bot.db', 'bot.db');
}

function getSessionPath(sessionName) {
  return path.join(getSessionBaseDir(), normalizeSessionName(sessionName));
}

/**
 * تشخيص المسارات ومصادرها — يُستخدم في أمر !جلسات وفي /api/status.
 * يقطع 90% من أسئلة «فقدت بياناتي بعد النشر» قبل أن تُسأل.
 */
function describePaths() {
  const volume = getVolumeMountPath();
  const origin = (envName, current) => {
    if ((process.env[envName] || '').trim()) return `متغير ${envName} (يدوي)`;
    if (volume && current.startsWith(volume)) return 'Volume ✅ (RAILWAY_VOLUME_MOUNT_PATH)';
    return 'جذر المشروع ⚠️ (يُمسح مع كل deploy)';
  };
  const sessionBaseDir = getSessionBaseDir();
  const mediaStoreDir = getMediaStoreDir();
  const databasePath = getDatabasePath();
  return {
    volumeMountPath: volume || null,
    sessionBaseDir,
    sessionOrigin: origin('SESSION_BASE_DIR', sessionBaseDir),
    mediaStoreDir,
    mediaOrigin: origin('MEDIA_STORE_DIR', mediaStoreDir),
    databasePath,
    dbOrigin: origin('DB_PATH', databasePath),
  };
}

module.exports = {
  ROOT,
  normalizeSessionName,
  getConfiguredSessionNames,
  getVolumeMountPath,
  getSessionBaseDir,
  getSessionPath,
  getMediaStoreDir,
  getDatabasePath,
  describePaths,
};
