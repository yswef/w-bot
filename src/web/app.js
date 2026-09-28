// =============================================
// 🖥️ لوحة تحكم أستا — Asta Bot Control Panel
// =============================================
// كانت اللوحة القديمة معطّلة بالكامل (مُعلَّقة في index.js)، وبلا أي حماية،
// وبلا أي معلومات مفيدة. هذه النسخة:
//   • تعمل تلقائياً عند تشغيل البوت وتطبع رابطها بوضوح في السجل
//   • محميّة برمز وصول (token) يُقرأ من .env أو يُولَّد عشوائياً عند الإقلاع
//   • تعرض حالة الاتصال ورمز QR للربط مباشرة من المتصفح
//   • تعرض الإحصائيات، الرسائل، *الرسائل المعدَّلة*، الرسائل المحذوفة،
//     الردود والتفاعلات المخصصة، المحظورين، والتذكيرات
// =============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  getRecentChats,
  getLatestMessageForChat,
  getMessagesForChat,
  getRecentMessages,
  getRecentEdits,
  getRecentDeleted,
  getStats,
  saveCustomReply,
  getCustomReplies,
  deleteCustomReply,
  saveCustomReaction,
  getCustomReactions,
  deleteCustomReaction,
  getBannedUsers,
  unbanUser,
  getPendingReminders,
  deleteReminder,
  getGlobalSetting,
  setGlobalSetting,
} = require('../database/db');

const config = require('../config');
const logger = require('../utils/logger');

// رمز الوصول: من .env أو يُولَّد تلقائياً ويُطبع في السجل عند كل إقلاع
const DASHBOARD_TOKEN =
  process.env.DASHBOARD_TOKEN || crypto.randomBytes(12).toString('hex');

function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('الطلب كبير جداً'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('صيغة JSON غير صحيحة'));
      }
    });
    req.on('error', reject);
  });
}

// مقارنة آمنة ضد هجمات التوقيت
function tokenMatches(provided) {
  if (!provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(DASHBOARD_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function extractToken(req, url) {
  const fromQuery = url.searchParams.get('token');
  if (fromQuery) return fromQuery;

  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)asta_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  return null;
}

// حالة الجلسات تُقرأ بشكل كسول لتفادي دورة require دائرية مع sessionManager
function getSessions() {
  try {
    return require('../sessionManager').getSessionsStatus();
  } catch {
    return [];
  }
}

async function qrToDataUrl(qrText) {
  if (!qrText) return null;
  try {
    const QRCode = require('qrcode');
    return await QRCode.toDataURL(qrText, { margin: 1, width: 320 });
  } catch {
    return null; // مكتبة qrcode غير مثبتة — يظل رمز QR متاحاً في الطرفية
  }
}

function startProfessionalDashboard() {
  const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000);
  const htmlPath = path.join(__dirname, 'index.html');

  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      return json(res, { error: 'طلب غير صالح' }, 400);
    }

    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    // نقطة فحص الصحة — متاحة بدون رمز وصول (تحتاجها منصات الاستضافة)
    if (pathname === '/health') {
      const sessions = getSessions();
      return json(res, {
        ok: true,
        uptimeSeconds: Math.floor(process.uptime()),
        connected: sessions.some((s) => s.connection === 'open'),
      });
    }

    const token = extractToken(req, url);
    const authorized = tokenMatches(token);

    if (!authorized) {
      if (pathname.startsWith('/api/')) {
        return json(res, { error: 'رمز وصول غير صحيح — Unauthorized' }, 401);
      }
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>لوحة تحكم أستا — تسجيل الدخول</title></head>
        <body style="font-family:system-ui,Segoe UI,Tahoma,sans-serif;background:#0b1020;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <form method="GET" action="/" style="background:#111a33;padding:32px;border-radius:18px;border:1px solid #7c3aed;max-width:420px;width:90%">
            <h2 style="margin-top:0;color:#f0abfc">🍀 لوحة تحكم أستا</h2>
            <p style="opacity:.8;font-size:14px">أدخل رمز الوصول (تجده مطبوعاً في سجل تشغيل البوت، أو اضبطه عبر <code>DASHBOARD_TOKEN</code> في ملف .env)</p>
            <p style="opacity:.8;font-size:13px">Enter your access token (printed in the bot startup log, or set <code>DASHBOARD_TOKEN</code> in .env)</p>
            <input name="token" placeholder="رمز الوصول / Access token" autofocus
              style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #334155;background:#0b1020;color:#fff;margin:8px 0" />
            <button type="submit" style="width:100%;padding:12px;border:0;border-radius:10px;cursor:pointer;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#fff;font-weight:700">دخول / Sign in</button>
          </form>
        </body></html>`);
    }

    try {
      // ---------------- الحالة والاتصال ----------------
      if (pathname === '/api/status') {
        const sessions = await Promise.all(
          getSessions().map(async (s) => ({
            ...s,
            qrImage: await qrToDataUrl(s.qr),
          }))
        );
        return json(res, {
          sessions,
          prefix: config.prefix,
          timezone: config.timezone,
          features: config.features,
          maintenance: getGlobalSetting('maintenance_mode') === '1',
          uptimeSeconds: Math.floor(process.uptime()),
        });
      }

      if (pathname === '/api/stats') {
        return json(res, getStats());
      }

      // ---------------- المحادثات والرسائل ----------------
      if (pathname === '/api/chats') {
        const limit = Number(url.searchParams.get('limit')) || 25;
        const chats = getRecentChats(limit).map((item) => {
          const last = getLatestMessageForChat(item.chat_id);
          return {
            chatId: item.chat_id,
            isGroup: item.chat_id.endsWith('@g.us'),
            lastTimestamp: item.last_timestamp,
            lastMessage: last ? last.text_content || `[${last.message_type}]` : null,
            lastSender: last ? last.sender_name : null,
          };
        });
        return json(res, chats);
      }

      if (pathname === '/api/messages') {
        const chatId = url.searchParams.get('chat');
        const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
        return json(res, chatId ? getMessagesForChat(chatId, limit) : getRecentMessages(limit));
      }

      // ✏️ الرسائل المعدَّلة — الميزة التي كانت مفقودة تماماً
      if (pathname === '/api/edits') {
        const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
        return json(res, getRecentEdits(limit));
      }

      if (pathname === '/api/deleted') {
        const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
        return json(res, getRecentDeleted(limit));
      }

      // ---------------- الردود المخصصة ----------------
      if (pathname === '/api/replies') {
        if (req.method === 'GET') return json(res, getCustomReplies('all'));
        if (req.method === 'POST') {
          const body = await readBody(req);
          if (!body.keyword || !body.reply) return json(res, { error: 'الكلمة والرد مطلوبان' }, 400);
          saveCustomReply({ keyword: body.keyword, reply: body.reply, scope: body.scope || 'all' });
          return json(res, { ok: true });
        }
        if (req.method === 'DELETE') {
          const id = Number(url.searchParams.get('id'));
          if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400);
          deleteCustomReply(id);
          return json(res, { ok: true });
        }
      }

      // ---------------- التفاعلات المخصصة ----------------
      if (pathname === '/api/reactions') {
        if (req.method === 'GET') return json(res, getCustomReactions());
        if (req.method === 'POST') {
          const body = await readBody(req);
          if (!body.keyword || !body.emoji) return json(res, { error: 'الكلمة والإيموجي مطلوبان' }, 400);
          saveCustomReaction({ keyword: body.keyword, emoji: body.emoji });
          return json(res, { ok: true });
        }
        if (req.method === 'DELETE') {
          const id = Number(url.searchParams.get('id'));
          if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400);
          deleteCustomReaction(id);
          return json(res, { ok: true });
        }
      }

      // ---------------- المحظورون ----------------
      if (pathname === '/api/bans') {
        if (req.method === 'GET') return json(res, getBannedUsers());
        if (req.method === 'DELETE') {
          const userId = url.searchParams.get('id');
          if (!userId) return json(res, { error: 'المعرّف مطلوب' }, 400);
          unbanUser(userId);
          return json(res, { ok: true });
        }
      }

      // ---------------- التذكيرات ----------------
      if (pathname === '/api/reminders') {
        if (req.method === 'GET') return json(res, getPendingReminders());
        if (req.method === 'DELETE') {
          const id = Number(url.searchParams.get('id'));
          if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400);
          deleteReminder(id);
          return json(res, { ok: true });
        }
      }

      // ---------------- وضع الصيانة ----------------
      if (pathname === '/api/maintenance' && req.method === 'POST') {
        const body = await readBody(req);
        setGlobalSetting('maintenance_mode', body.enabled ? '1' : '0');
        return json(res, { ok: true, maintenance: !!body.enabled });
      }

      // ---------------- إرسال رسالة من اللوحة ----------------
      if (pathname === '/api/send' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body.chatId || !body.text) return json(res, { error: 'المحادثة والنص مطلوبان' }, 400);
        const sock = require('../sessionManager').getActiveSocket(body.session);
        if (!sock) return json(res, { error: 'لا توجد جلسة متصلة حالياً' }, 503);
        await sock.sendMessage(body.chatId, { text: body.text });
        return json(res, { ok: true });
      }

      if (pathname.startsWith('/api/')) {
        return json(res, { error: 'المسار غير موجود' }, 404);
      }

      // ---------------- الصفحة الرئيسية ----------------
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        // نحفظ الرمز في كوكي حتى لا يحتاج المستخدم لإعادة إدخاله في كل مرة
        'Set-Cookie': `asta_token=${encodeURIComponent(DASHBOARD_TOKEN)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      });
      res.end(html);
    } catch (err) {
      logger.error('خطأ في لوحة التحكم: ' + err.message);
      json(res, { error: err.message }, 500);
    }
  });

  server.on('error', (err) => {
    logger.error(`تعذر تشغيل لوحة التحكم على المنفذ ${port}: ${err.message}`);
  });

  server.listen(port, '0.0.0.0', () => {
    const line = '─'.repeat(58);
    logger.info(line);
    logger.info('🖥️  لوحة تحكم أستا جاهزة / Asta dashboard is ready');
    logger.info(`🔗  الرابط المحلي / Local URL: http://localhost:${port}/?token=${DASHBOARD_TOKEN}`);
    logger.info(`🔑  رمز الوصول / Access token: ${DASHBOARD_TOKEN}`);
    if (!process.env.DASHBOARD_TOKEN) {
      logger.info('ℹ️  الرمز عشوائي ويتغيّر عند كل تشغيل. ثبّته بوضع DASHBOARD_TOKEN في ملف .env');
      logger.info('ℹ️  Token is random per run. Set DASHBOARD_TOKEN in .env to keep it fixed.');
    }
    logger.info(line);
  });

  return server;
}

module.exports = startProfessionalDashboard;
module.exports.DASHBOARD_TOKEN = DASHBOARD_TOKEN;
