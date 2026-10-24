// =============================================
// 📰 خدمة أخبار ومواعيد الأنمي + النشرة اليومية
// =============================================
// المصادر: RSS (ANN / MyAnimeList / Crunchyroll) ومواعيد الحلقات من AniList.
// كل خبر يُنشر مرة واحدة فقط لكل النشرات (علامة posted) حتى لا تتكرر الأخبار.

const config = require('../config');
const db = require('../database/db');
const { fetchText } = require('./http');
const { parseFeed } = require('./rss');
const anilist = require('./anilist');
const logger = require('../utils/logger');

const DAY_MS = 24 * 60 * 60 * 1000;

// مصادر افتراضية تم التحقق من أن روابطها تعمل (يمكن تعطيلها أو إضافة غيرها من اللوحة)
const DEFAULT_SOURCES = [
  { name: 'Anime News Network', url: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us' },
  { name: 'MyAnimeList News', url: 'https://myanimelist.net/rss/news.xml' },
  { name: 'Crunchyroll News', url: 'https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss' },
];

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function seedDefaultSources() {
  if (db.getGlobalSetting('anime_sources_seeded') === '1') return;
  for (const s of DEFAULT_SOURCES) db.addNewsSource({ name: s.name, url: s.url, addedBy: 'system' });
  db.setGlobalSetting('anime_sources_seeded', '1');
}

// ---------- أدوات الوقت حسب المنطقة الزمنية ----------
function partsIn(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second, weekday: wd };
}

function offsetMs(date, tz) {
  const p = partsIn(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return asUtc - (date.getTime() - (date.getTime() % 1000));
}

/** بداية ونهاية اليوم المحلي الحالي بالثواني (Unix) */
function localDayBounds(now = new Date(), tz = config.timezone) {
  const p = partsIn(now, tz);
  const guess = Date.UTC(p.y, p.m - 1, p.d, 0, 0, 0);
  const start = guess - offsetMs(new Date(guess), tz);
  return {
    from: Math.floor(start / 1000),
    to: Math.floor((start + DAY_MS) / 1000) - 1,
    weekday: p.weekday,
    dateLabel: new Intl.DateTimeFormat('ar-EG', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now),
  };
}

function formatClock(unixSec, tz = config.timezone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(unixSec * 1000));
}

// ---------- تحديث المصادر ----------
async function refreshNewsSources() {
  seedDefaultSources();
  const results = [];
  for (const s of db.getEnabledNewsSources()) {
    try {
      const xml = await fetchText(s.url, { timeoutMs: 20000, retries: 1 });
      const items = parseFeed(xml).slice(0, 30);
      const isFirstSuccess = !s.last_ok_at;
      const now = Date.now();
      let added = 0;
      for (const it of items) {
        const inserted = db.insertNewsItem({
          source_id: s.id,
          guid: it.guid.slice(0, 500),
          title: it.title.slice(0, 300),
          link: it.link || null,
          summary: it.summary || null,
          image: it.image || null,
          published_at: it.publishedAt,
          fetched_at: now,
          // أول تحديث ناجح للمصدر يعتبر الأخبار القديمة مُنشورة مسبقاً، فلا تُغرق النشرة الأولى
          posted: isFirstSuccess ? 1 : 0,
        });
        if (inserted) added++;
      }
      db.markNewsSourceResult(s.id, { ok: true, count: items.length });
      results.push({ id: s.id, name: s.name, ok: true, count: items.length, added });
    } catch (err) {
      db.markNewsSourceResult(s.id, { ok: false, error: err.message });
      logger.warn(`تعذر تحديث مصدر الأخبار ${s.name}: ${err.message}`);
      results.push({ id: s.id, name: s.name, ok: false, error: err.message });
    }
  }
  return results;
}

// ---------- بناء النشرة ----------
async function buildTodaySchedule(now = new Date()) {
  const bounds = localDayBounds(now);
  const custom = db.listCustomSchedule().filter((r) => r.day_of_week === bounds.weekday);
  let airing = [];
  let error = null;
  try {
    airing = await anilist.airingBetween(bounds.from, bounds.to, 100);
  } catch (err) {
    error = err.message;
    logger.warn('تعذر جلب مواعيد الأنمي من AniList: ' + err.message);
  }
  return { airing, custom, error, bounds };
}

function scheduleLines(schedule, tz = config.timezone) {
  const lines = [];
  for (const a of schedule.airing.slice(0, 25)) {
    lines.push(`• ${formatClock(a.airingAt, tz)} — ${a.title} (حلقة ${a.episode})`);
  }
  for (const c of schedule.custom) {
    lines.push(`• ${c.time_local} — ${c.title}${c.note ? ` (${c.note})` : ''}`);
  }
  return lines;
}

async function buildDigest({ now = new Date(), newsLimit = 5 } = {}) {
  const schedule = await buildTodaySchedule(now);
  const news = db.getUnpostedNewsItems(newsLimit, now.getTime() - 3 * DAY_MS);
  const customNews = db.getPendingCustomNews();

  const parts = [];
  parts.push('📺 *نشرة أستا اليومية للأنمي* 🍀');
  parts.push(`📅 ${schedule.bounds.dateLabel}`);

  if (news.length) {
    parts.push('', '🗞️ *أبرز أخبار الأنمي*');
    news.forEach((n, i) => {
      let block = `${i + 1}. *${n.title}*`;
      if (n.summary) block += `\n   ${n.summary.length > 160 ? n.summary.slice(0, 157) + '…' : n.summary}`;
      if (n.link) block += `\n   🔗 ${n.link}`;
      block += `\n   _(${n.source_name})_`;
      parts.push(block);
    });
  }

  if (customNews.length) {
    parts.push('', '📢 *أخبار من الإدارة*');
    for (const c of customNews) {
      parts.push(`• *${c.title}*${c.body ? `\n   ${c.body}` : ''}${c.link ? `\n   🔗 ${c.link}` : ''}`);
    }
  }

  parts.push('', '🗓️ *مواعيد عرض اليوم*');
  const lines = scheduleLines(schedule);
  if (lines.length) parts.push(...lines);
  else if (schedule.error) parts.push('_تعذر جلب المواعيد الآن، حاول لاحقاً_');
  else parts.push('_لا توجد حلقات مجدولة اليوم_');

  parts.push('', '⚔️ أستا لا ينسى الأنمي!');

  return {
    text: parts.join('\n'),
    newsIds: news.map((n) => n.id),
    customNewsIds: customNews.map((c) => c.id),
    newsCount: news.length,
    scheduleCount: lines.length,
    scheduleError: schedule.error,
  };
}

// ---------- الإرسال ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let digestRunning = false;

/**
 * يرسل النشرة لكل المشتركين. يعلّم الأخبار كمُنشورة فقط إذا وصلت لمشترك واحد على الأقل.
 */
async function sendDigest(sock, { onlyChatId = null } = {}) {
  if (!sock) return { sent: 0, failed: 0, reason: 'no-socket' };
  if (digestRunning) return { sent: 0, failed: 0, reason: 'already-running' };
  digestRunning = true;
  try {
    const subs = onlyChatId
      ? db.getNewsletterSubscribers().filter((s) => s.chat_id === onlyChatId)
      : db.getNewsletterSubscribers();
    if (!subs.length) return { sent: 0, failed: 0, reason: 'no-subscribers' };

    const digest = await buildDigest();
    let sent = 0;
    let failed = 0;
    for (const s of subs) {
      try {
        await sock.sendMessage(s.chat_id, { text: digest.text });
        sent++;
      } catch (err) {
        failed++;
        logger.warn(`تعذر إرسال النشرة إلى ${s.chat_id}: ${err.message}`);
      }
      await sleep(1500);
    }
    if (sent > 0 && !onlyChatId) {
      db.markNewsItemsPosted(digest.newsIds);
      db.markCustomNewsPosted(digest.customNewsIds);
    }
    logger.info(`📰 نشرة الأنمي: أُرسلت إلى ${sent} محادثة، فشل ${failed}`);
    return { sent, failed, newsCount: digest.newsCount, scheduleCount: digest.scheduleCount };
  } finally {
    digestRunning = false;
  }
}

module.exports = {
  DEFAULT_SOURCES,
  WEEKDAYS_AR,
  seedDefaultSources,
  refreshNewsSources,
  buildDigest,
  buildTodaySchedule,
  sendDigest,
  localDayBounds,
  formatClock,
};
