// =============================================
// 🧩 لوحة التحكم — خادم HTTP بسيط بدون أي مكتبة خارجية
// =============================================
// كيف تعمل؟
//   1) تُشغَّل تلقائياً مع البوت (انظر src/index.js).
//   2) على Railway اذهب لـ: Service → Settings → Networking → Public Networking
//      ثم "Generate Domain" — الرابط الذي يظهر هو رابط اللوحة.
//   3) من داخل واتساب أرسل:  !لوحة   أو   !dashboard   ليبعث لك الرابط الجاهز.
//
// الحماية:
//   إذا ضبطت DASHBOARD_TOKEN في .env، فكل شيء خلف اللوحة يحتاج هذا التوكن
//   (عبر ?token=... أو Cookie أو Authorization: Bearer). بدون توكن اللوحة مكشوفة!
//   استثناء واحد: /health بدون حماية حتى يستخدمه Railway كـ Health Check Path.
// =============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('../config');
const logger = require('../utils/logger');
const runtimeState = require('../runtimeState');
const database = require('../database/db');

let qrcodeTerminal = null;
try {
  // اختيارية تماماً: تُستخدم فقط لرسم رمز QR داخل المتصفح لتسهيل إعادة الربط
  qrcodeTerminal = require('qrcode-terminal');
} catch {
  qrcodeTerminal = null;
}

const COOKIE_NAME = 'asta_dash_token';
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 يوم
const htmlPath = path.join(__dirname, 'index.html');

// ---------- أدوات صغيرة ----------
function send(res, status, body, headers = {}) {
  const isJson = typeof body === 'object' && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body, null, 2) : body;
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : headers['Content-Type'] || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

function sendJson(res, data, status = 200) {
  send(res, status, data, { 'Content-Type': 'application/json; charset=utf-8' });
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        resolve({});
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        try {
          // نموذج HTML العادي (application/x-www-form-urlencoded)
          const obj = {};
          for (const [k, v] of new URLSearchParams(raw)) obj[k] = v;
          resolve(obj);
        } catch {
          resolve({});
        }
      }
    });
    req.on('error', () => resolve({}));
  });
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function isAuthorized(req, url) {
  const expected = config.dashboard.token;
  if (!expected) return true; // لا توكن = اللوحة مفتوحة (غير مُستحسن)

  const bearer = String(req.headers.authorization || '');
  const bearerToken = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '';
  const provided = url.searchParams.get('token') || bearerToken || parseCookies(req)[COOKIE_NAME] || '';
  return safeEqual(provided, expected);
}

// ---------- الحالة العامة ----------
function isConnected() {
  return runtimeState.isConnected();
}

function buildStatus() {
  return {
    ok: true,
    name: 'أستا ساما / Asta Sama Bot',
    version: (() => {
      try {
        return require('../../package.json').version;
      } catch {
        return 'unknown';
      }
    })(),
    uptimeSeconds: runtimeState.getUptimeSeconds(),
    connectedToWhatsApp: isConnected(),
    activeSessions: runtimeState.getActiveSessionNames(),
    sessions: runtimeState.getSessions(),
    // نقرأ أسماء الجلسات من sessionPaths (خفيف وبدون حلقة استيراد) بدل sessionManager
    configuredSessions: require('../sessionPaths').getConfiguredSessionNames(),
    prefix: config.prefix,
    timezone: config.timezone,
    features: config.features,
    ownerNumbers: config.ownerNumbers,
    adminNumbers: config.adminNumbers,
    dashboard: {
      url: config.buildPublicUrl(),
      port: config.dashboard.port,
      protected: Boolean(config.dashboard.token),
    },
    stats: database.getDatabaseStats(),
    // أين تعيش الملفات فعلياً + من حدّدها (يشخص مشكلة «لماذا فقدت بياناتي بعد deploy؟»)
    paths: require('../sessionPaths').describePaths(),
    runtime: {
      pid: process.pid,
      node: process.version,
      memoryUsedMB: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1),
      platform: process.platform,
      freeMB: +(require('os').freemem() / 1024 / 1024).toFixed(1),
      totalMB: +(require('os').totalmem() / 1024 / 1024).toFixed(1),
    },
  };
}

// ---------- نقطة واحدة لكل أمر/إجراء (تجنّب تضخم المسارات) ----------
async function handleAction(name, params, req) {
  const body = ['GET', 'HEAD'].includes(req.method) ? {} : await readBody(req);
  const get = (key) => params.get(key) ?? body[key];
  const num = (key) => Number(get(key));
  const db = database;

  switch (name) {
    // ===== الردود الآلية المخصصة =====
    case 'replies/add': {
      const keyword = String(get('keyword') || '').trim();
      const reply = String(get('reply') || '').trim();
      const scope = String(get('scope') || 'all').trim();
      if (!keyword || !reply) return { ok: false, error: 'keyword و reply مطلوبان' };
      db.saveCustomReply({ keyword, reply, scope });
      return { ok: true };
    }
    case 'replies/delete': {
      const id = num('id');
      if (!id) return { ok: false, error: 'id مطلوب' };
      db.deleteCustomReply(id);
      return { ok: true };
    }

    // ===== التفاعلات (Emoji) التلقائية =====
    case 'reactions/add': {
      const keyword = String(get('keyword') || '').trim();
      const emoji = String(get('emoji') || '').trim();
      if (!keyword || !emoji) return { ok: false, error: 'keyword و emoji مطلوبان' };
      db.saveCustomReaction({ keyword, emoji });
      return { ok: true };
    }
    case 'reactions/delete': {
      const id = num('id');
      if (!id) return { ok: false, error: 'id مطلوب' };
      db.deleteCustomReaction(id);
      return { ok: true };
    }

    // ===== الحظر =====
    case 'bans/add': {
      const user = String(get('user') || '').trim();
      if (!user) return { ok: false, error: 'user مطلوب (مثال: 9677xxxxxxx@s.whatsapp.net)' };
      const jid = user.includes('@') ? user : `${user.replace(/\D/g, '')}@s.whatsapp.net`;
      db.banUser(jid, 'dashboard');
      return { ok: true, user: jid };
    }
    case 'bans/remove': {
      const user = String(get('user') || '').trim();
      if (!user) return { ok: false, error: 'user مطلوب' };
      const jid = user.includes('@') ? user : `${user.replace(/\D/g, '')}@s.whatsapp.net`;
      db.unbanUser(jid);
      return { ok: true, user: jid };
    }

    // ===== وضع الصيانة =====
    case 'settings/maintenance': {
      const on = String(get('on') ?? '1') === '1' || String(get('on')).toLowerCase() === 'true';
      db.setGlobalSetting('maintenance_mode', on ? '1' : '0');
      return { ok: true, maintenance: on };
    }

    // ===== التذكيرات =====
    case 'reminders/delete': {
      const id = num('id');
      if (!id) return { ok: false, error: 'id مطلوب' };
      db.deleteReminder(id);
      return { ok: true };
    }

    // ===== الجداول المرسلة تلقائياً =====
    case 'events/delete': {
      const id = num('id');
      if (!id) return { ok: false, error: 'id مطلوب' };
      db.db.prepare('UPDATE scheduled_events SET active = 0 WHERE id = ?').run(id);
      return { ok: true };
    }

    // ===== إعادة ربط الجلسة (يحذف الجلسة ويطلب QR جديد) =====
    case 'session/reconnect': {
      const confirm = String(get('confirm') || '');
      if (confirm !== 'RECONNECT') {
        return { ok: false, error: 'خطوة أمان: أعد الطلب مع confirm=RECONNECT (سيُحذف الربط الحالي ويحتاج مسح QR جديد)' };
      }
      const name = String(get('session') || 'default');
      const { resetSession } = require('../sessionManager');
      await resetSession(name);
      return { ok: true, session: name, note: 'تم إنشاء جلسة جديدة — امسح رمز QR من تبويب الربط' };
    }

    default:
      return { ok: false, error: `إجراء غير معروف: ${name}` };
  }
}

// ---------- الخادم ----------
function startProfessionalDashboard() {
  const { port } = config.dashboard;
  const publicUrl = config.buildPublicUrl();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = decodeURIComponent(url.pathname);

      // 1) فحص صحة بلا توكن (يستخدمه Railway كـ Healthcheck Path)
      if (pathname === '/health') {
        return sendJson(res, {
          ok: true,
          uptimeSeconds: runtimeState.getUptimeSeconds(),
          connectedToWhatsApp: isConnected(),
          sessions: runtimeState.getActiveSessionNames(),
        });
      }

      // 2) أي شيء آخر يحتاج التوكن إن كان مضبوطاً
      const authorized = isAuthorized(req, url);
      if (!authorized) {
        if (pathname === '/' || pathname === '/index.html') {
          return send(
            res,
            401,
            `<!doctype html><html dir="rtl"><meta charset="utf-8"><body style="font-family:sans-serif;background:#0f172a;color:#fff;padding:40px">
<h1>🔒 لوحة التحكم محمية</h1>
<p>أدخل التوكن (قيمة <code>DASHBOARD_TOKEN</code> في إعدادات Railway):</p>
<input id="t" style="padding:10px;width:320px" placeholder="DASHBOARD_TOKEN">
<button onclick="go()" style="padding:10px 16px">دخول</button>
<script>function go(){location.href='/?token='+encodeURIComponent(document.getElementById('t').value)}</script>
</body></html>`,
            { 'Content-Type': 'text/html; charset=utf-8' }
          );
        }
        return sendJson(res, { ok: false, error: 'غير مصرح: أضف ?token=DASHBOARD_TOKEN أو استخدم Authorization: Bearer' }, 401);
      }

      // حفظ التوكن في كوكي حتى تعمل أزرار اللوحة بدون تكراره في كل طلب
      const tokenInQuery = url.searchParams.get('token');
      if (tokenInQuery && config.dashboard.token) {
        res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(tokenInQuery)}; Path=/; Max-Age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax`);
      }

      // 3) الصفحة الرئيسية
      if (pathname === '/' || pathname === '/index.html') {
        const html = fs.readFileSync(htmlPath, 'utf8').replace('<!--__CONFIG__-->', JSON.stringify({
          apiBase: '',
          hasToken: Boolean(config.dashboard.token),
          publicUrl,
        }));
        return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8' });
      }

      // 4) حالة البوت
      if (pathname === '/api/status') return sendJson(res, buildStatus());

      // 5) المحادثات والرسائل
      if (pathname === '/api/chats') {
        const limit = Number(url.searchParams.get('limit')) || 25;
        return sendJson(res, { ok: true, chats: database.getRecentChatsDetailed(limit) });
      }
      if (pathname === '/api/messages') {
        const limit = Number(url.searchParams.get('limit')) || config.dashboard.recentLimit;
        return sendJson(res, {
          ok: true,
          messages: database.getRecentMessages({
            chatId: url.searchParams.get('chatId'),
            search: url.searchParams.get('q'),
            limit,
          }),
        });
      }

      // 6) القراءات البسيطة
      const reads = {
        '/api/replies': () => database.getCustomReplies(url.searchParams.get('scope') || 'all'),
        '/api/reactions': () => database.getCustomReactions(),
        '/api/bans': () => database.getBannedUsers(),
        '/api/reminders': () => database.getPendingReminders(),
        '/api/events': () => database.getScheduledEvents(),
        '/api/settings': () => ({ maintenance_mode: database.getGlobalSetting('maintenance_mode') === '1' }),
      };
      if (reads[pathname]) return sendJson(res, { ok: true, items: reads[pathname]() });

      // 7) رمز QR لجلسة تحتاج مسح (مفيد جداً بعد redeploy)
      if (pathname === '/api/qr') {
        const pending = runtimeState.getPendingQrCodes();
        const items = pending.map((item) => {
          let ascii = null;
          if (qrcodeTerminal) {
            try {
              let raw = '';
              qrcodeTerminal.generate(item.qr, { small: true, type: 'string' }, (out) => (raw = out));
              ascii = raw.replace(/\x1b\[[0-9;]*m/g, ''); // إزالة ألوان ANSI
            } catch {
              ascii = null;
            }
          }
          return { session: item.session, ageSeconds: item.ageSeconds, qr: item.qr, ascii };
        });
        return sendJson(res, { ok: true, waiting: items.length > 0, codes: items, renderer: qrcodeTerminal ? 'qrcode-terminal' : 'none' });
      }

      // 8) الإجراءات (تحتاج POST)
      if (pathname.startsWith('/api/action/')) {
        const action = pathname.replace('/api/action/', '');
        const result = await handleAction(action, url.searchParams, req);
        return sendJson(res, result, result.ok ? 200 : 400);
      }

      return sendJson(res, { ok: false, error: 'not found', path: pathname }, 404);
    } catch (err) {
      logger.error(`[Dashboard] ${req.method} ${req.url} → ${err.message}`);
      return sendJson(res, { ok: false, error: err.message }, 500);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`⚠️ منفذ ${port} مستخدم بالفعل. غيّر DASHBOARD_PORT أو STOP خدمة أخرى.`);
    } else {
      logger.error('⚠️ فشل تشغيل لوحة التحكم: ' + err.message);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info(`🧩 لوحة التحكم تعمل على المنفذ ${port}`);
    logger.info(`   الرابط المحلي : http://localhost:${port}`);
    logger.info(`   الرابط العام  : ${publicUrl}${config.dashboard.token ? `/?token=${config.dashboard.token}` : ''}`);
    if (!config.dashboard.token) {
      logger.warn('⚠️ DASHBOARD_TOKEN غير مضبوط: أي شخص يعرف الرابط يستطيع التحكم باللوحة! اضبطه فوراً.');
    }
    const railwayHint = !process.env.RAILWAY_PUBLIC_DOMAIN && !config.dashboard.publicUrl
      ? ' (على Railway: Service → Settings → Networking → Public Networking → Generate Domain، ثم أعِد Deploy)'
      : '';
    logger.info(`💡 إن كان الرابط العام غير صحيح${railwayHint} اضبط DASHBOARD_PUBLIC_URL يدوياً.`);
  });

  return server;
}

module.exports = startProfessionalDashboard;
module.exports.buildStatus = buildStatus;
