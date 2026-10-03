// =============================================
// 🧰 أدوات مشتركة لسكربتات الطرفية (CLI helpers)
// =============================================
// تستخدمها سكربتات: reconnect.js / portinfo.js / qr.js
// وظيفتها: قراءة .env، إيجاد لوحة التحكم الشغّالة (حتى لو تغيّر منفذها)،
// والتحدث معها برمز الوصول بدون أي اعتماديات خارجية.

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  try {
    require('dotenv').config({ path: envPath });
  } catch {
    // dotenv غير مثبتة — نكمل بمتغيرات البيئة الموجودة
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

function dashboardConfig() {
  return {
    port: Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000),
    token: process.env.DASHBOARD_TOKEN || '',
    publicUrl: (process.env.DASHBOARD_PUBLIC_URL || '').trim().replace(/\/+$/, ''),
  };
}

// طلب HTTP بسيط يعيد { status, data } أو يرمي خطأ عند فشل الاتصال
function request(port, pathname, { method = 'GET', body, token, timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = { Accept: 'application/json' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request({ host: '127.0.0.1', port, path: pathname, method, headers, timeout: timeoutMs }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let data = raw;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          /* استجابة غير JSON — نُبقيها نصاً */
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('timeout', () => req.destroy(new Error('انتهت المهلة')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// هل يوجد شيء يستمع على هذا المنفذ أصلاً؟
function isPortOpen(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

// 🔎 إيجاد لوحة التحكم الشغّالة: تبدأ من PORT وتفحص المنافذ التالية
// (لأن اللوحة تنتقل تلقائياً إلى منفذ بديل لو كان المنفذ الأصلي محجوزاً)
async function findLiveDashboard({ maxPorts = 10, timeoutMs = 1200 } = {}) {
  const { port, token } = dashboardConfig();
  for (let candidate = port; candidate < port + maxPorts; candidate += 1) {
    try {
      const res = await request(candidate, '/health', { timeoutMs });
      if (res.status === 200 && res.data?.ok) {
        return { port: candidate, token, health: res.data };
      }
    } catch {
      /* لا توجد لوحة على هذا المنفذ — جرّب التالي */
    }
  }
  return null;
}

async function apiGet(port, pathname, token, timeoutMs = 6000) {
  return request(port, pathname, { token, timeoutMs });
}

async function apiPost(port, pathname, body, token, timeoutMs = 20000) {
  return request(port, pathname, { method: 'POST', body: body || {}, token, timeoutMs });
}

function dashboardUrl(port, token) {
  return `http://localhost:${port}/?token=${token || '<DASHBOARD_TOKEN>'}`;
}

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) flags.add(arg.slice(2));
    else positional.push(arg);
  }
  return { flags, positional, has: (name) => flags.has(name) };
}

module.exports = {
  ROOT,
  loadEnv,
  dashboardConfig,
  request,
  isPortOpen,
  findLiveDashboard,
  apiGet,
  apiPost,
  dashboardUrl,
  parseArgs,
};
