// =============================================
// 🧩 واجهات برمجة إضافية للوحة التحكم (مشرفون، نقاط، أنمي، مهام)
// =============================================
// تُستدعى من app.js قبل مسار 404. تعيد true إذا عالجت الطلب.

const config = require('../config');
const db = require('../database/db');
const { normalizePhone } = require('../utils/permissions');
const logger = require('../utils/logger');

function sockets() {
  try {
    return require('../sessionManager').getActiveSocket();
  } catch {
    return null;
  }
}

function validHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function validHHMM(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

function chatJid(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  return v.includes('@') ? v : null;
}

module.exports = async function handleExtraApi(req, res, url, pathname, { json, readBody }) {
  const method = req.method;
  const id = Number(url.searchParams.get('id'));

  // ---------------- المشرفون ----------------
  if (pathname === '/api/admins') {
    if (method === 'GET') {
      json(res, {
        owners: config.ownerNumbers,
        configured: config.adminNumbers,
        stored: db.listBotAdmins(),
      });
      return true;
    }
    if (method === 'POST') {
      const body = await readBody(req);
      const number = normalizePhone(body.number);
      if (!number) return json(res, { error: 'أدخل رقماً صحيحاً (6-20 رقماً)' }, 400), true;
      if (config.adminNumbers.includes(number)) return json(res, { error: 'هذا الرقم مشرف بالفعل من الإعدادات' }, 400), true;
      db.addBotAdmin(number, 'panel');
      logger.info(`👑 أُضيف مشرف جديد من اللوحة: ${number}`);
      json(res, { ok: true });
      return true;
    }
    if (method === 'DELETE') {
      const number = normalizePhone(url.searchParams.get('id'));
      if (!number) return json(res, { error: 'المعرّف مطلوب' }, 400), true;
      if (config.adminNumbers.includes(number)) return json(res, { error: 'لا يمكن حذف مشرف معرّف في .env' }, 400), true;
      db.removeBotAdmin(number);
      json(res, { ok: true });
      return true;
    }
  }

  // ---------------- النقاط ----------------
  if (pathname === '/api/points') {
    if (method === 'GET') {
      const chat = url.searchParams.get('chat');
      const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
      json(res, db.getPointsLeaderboard(chat || null, limit));
      return true;
    }
    if (method === 'POST') {
      const body = await readBody(req);
      const chatId = chatJid(body.chatId);
      const userId = chatJid(body.userId);
      const delta = Math.trunc(Number(body.delta));
      if (!chatId || !userId || !Number.isFinite(delta)) return json(res, { error: 'المحادثة والمستخدم والقيمة مطلوبة' }, 400), true;
      const current = db.getUserPoints(chatId, userId)?.points || 0;
      db.setUserPoints(chatId, userId, current + delta);
      json(res, { ok: true, points: Math.max(0, current + delta) });
      return true;
    }
  }

  // ---------------- المهام المجدولة للمجموعات ----------------
  if (pathname === '/api/jobs') {
    if (method === 'GET') {
      json(res, db.listScheduledEvents());
      return true;
    }
    if (method === 'DELETE') {
      if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400), true;
      db.deactivateScheduledEvent(id);
      try { require('../scheduler/events').reloadGroupEvents(); } catch { /* تجاهل */ }
      json(res, { ok: true });
      return true;
    }
  }

  if (!pathname.startsWith('/api/anime')) return false;

  // ---------------- الأنمي: نظرة عامة ----------------
  if (pathname === '/api/anime/overview' && method === 'GET') {
    json(res, {
      digestTime: db.getGlobalSetting('anime_digest_time') || '09:00',
      timezone: config.timezone,
      sources: db.listNewsSources(),
      subscribers: db.getNewsletterSubscribers(),
      customNews: db.listCustomNews(20),
      schedule: db.listCustomSchedule(),
      news: db.listRecentNewsItems(15),
    });
    return true;
  }

  // ---------------- مصادر الأخبار ----------------
  if (pathname === '/api/anime/sources') {
    if (method === 'POST') {
      const body = await readBody(req);
      const name = String(body.name || '').trim().slice(0, 80);
      const sourceUrl = String(body.url || '').trim();
      if (!name || !validHttpUrl(sourceUrl)) return json(res, { error: 'الاسم ورابط RSS صحيح مطلوبان' }, 400), true;
      const newId = db.addNewsSource({ name, url: sourceUrl, addedBy: 'panel' });
      if (!newId) return json(res, { error: 'هذا المصدر مضاف بالفعل' }, 400), true;
      json(res, { ok: true, id: newId });
      return true;
    }
    if (method === 'DELETE') {
      if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400), true;
      db.deleteNewsSource(id);
      json(res, { ok: true });
      return true;
    }
  }
  if (pathname === '/api/anime/sources/toggle' && method === 'POST') {
    const body = await readBody(req);
    if (!body.id) return json(res, { error: 'المعرّف مطلوب' }, 400), true;
    db.setNewsSourceEnabled(Number(body.id), !!body.enabled);
    json(res, { ok: true });
    return true;
  }
  if (pathname === '/api/anime/sources/refresh' && method === 'POST') {
    const animeFeed = require('../services/animeFeed');
    const results = await animeFeed.refreshNewsSources();
    json(res, { ok: true, results });
    return true;
  }

  // ---------------- أخبار من الإدارة ----------------
  if (pathname === '/api/anime/custom-news') {
    if (method === 'POST') {
      const body = await readBody(req);
      const title = String(body.title || '').trim().slice(0, 200);
      const link = String(body.link || '').trim();
      if (!title) return json(res, { error: 'عنوان الخبر مطلوب' }, 400), true;
      if (link && !validHttpUrl(link)) return json(res, { error: 'الرابط غير صحيح' }, 400), true;
      const newId = db.addCustomNews({ title, body: String(body.body || '').trim().slice(0, 600) || null, link: link || null, createdBy: 'panel' });
      json(res, { ok: true, id: newId });
      return true;
    }
    if (method === 'DELETE') {
      if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400), true;
      db.deleteCustomNews(id);
      json(res, { ok: true });
      return true;
    }
  }

  // ---------------- مواعيد مخصصة ----------------
  if (pathname === '/api/anime/schedule') {
    if (method === 'POST') {
      const body = await readBody(req);
      const title = String(body.title || '').trim().slice(0, 120);
      const day = Number(body.day);
      const time = validHHMM(body.time);
      if (!title || !Number.isInteger(day) || day < 0 || day > 6 || !time) {
        return json(res, { error: 'العنوان واليوم (0=الأحد) والوقت HH:MM مطلوبة' }, 400), true;
      }
      const newId = db.addCustomSchedule({ title, dayOfWeek: day, timeLocal: time, note: String(body.note || '').trim().slice(0, 80) || null });
      json(res, { ok: true, id: newId });
      return true;
    }
    if (method === 'DELETE') {
      if (!id) return json(res, { error: 'المعرّف مطلوب' }, 400), true;
      db.deleteCustomSchedule(id);
      json(res, { ok: true });
      return true;
    }
  }

  // ---------------- المشتركون في النشرة ----------------
  if (pathname === '/api/anime/subscribers') {
    if (method === 'POST') {
      const body = await readBody(req);
      const chatId = chatJid(body.chatId);
      if (!chatId) return json(res, { error: 'معرّف المحادثة غير صحيح (يجب أن يحتوي @)' }, 400), true;
      db.subscribeNewsletter({ chatId, addedBy: 'panel' });
      json(res, { ok: true });
      return true;
    }
    if (method === 'DELETE') {
      const chatId = chatJid(url.searchParams.get('chatId'));
      if (!chatId) return json(res, { error: 'معرّف المحادثة مطلوب' }, 400), true;
      db.unsubscribeNewsletter(chatId);
      json(res, { ok: true });
      return true;
    }
  }

  // ---------------- وقت النشرة + المعاينة + الإرسال الآن ----------------
  if (pathname === '/api/anime/digest-time' && method === 'POST') {
    const body = await readBody(req);
    const time = validHHMM(body.time);
    if (!time) return json(res, { error: 'الوقت يجب أن يكون HH:MM' }, 400), true;
    db.setGlobalSetting('anime_digest_time', time);
    const applied = require('../scheduler/events').rescheduleDigest();
    json(res, { ok: true, time: applied });
    return true;
  }
  if (pathname === '/api/anime/digest-preview' && method === 'GET') {
    const digest = await require('../services/animeFeed').buildDigest();
    json(res, { text: digest.text, newsCount: digest.newsCount, scheduleCount: digest.scheduleCount, scheduleError: digest.scheduleError });
    return true;
  }
  if (pathname === '/api/anime/digest-send' && method === 'POST') {
    const sock = sockets();
    if (!sock) return json(res, { error: 'لا توجد جلسة متصلة حالياً' }, 503), true;
    const result = await require('../services/animeFeed').sendDigest(sock);
    json(res, { ok: true, ...result });
    return true;
  }

  return false;
};
