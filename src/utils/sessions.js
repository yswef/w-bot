// =============================================
// 🧩 أسماء ومسارات الجلسات — منطق مشترك
// =============================================
// يُستخدم من src/sessionManager.js ومن سكربتات الطرفية (scripts/*.js)
// حتى تبقى المسارات متطابقة بين البوت وأدوات الصيانة.

const path = require('path');

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
  const baseDir = process.env.SESSION_BASE_DIR || path.join(__dirname, '..', '..', 'session');
  return path.join(baseDir, normalizeSessionName(sessionName));
}

// 📋 أوامر إعادة الربط الجاهزة (تُطبع في الطرفية وتُعرض في لوحة التحكم)
function recoveryInstructions(sessionName = 'default') {
  const name = normalizeSessionName(sessionName);
  return {
    sessionName: name,
    sessionDir: getSessionPath(name),
    commands: [`npm run reconnect -- ${name}`, `rm -rf "${getSessionPath(name)}" && npm start`],
  };
}

module.exports = {
  normalizeSessionName,
  getConfiguredSessionNames,
  getSessionPath,
  recoveryInstructions,
};
