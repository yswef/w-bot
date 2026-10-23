// =============================================
// 📺 أوامر الأنمي: الموسم، البحث، المواعيد، الأخبار، النشرة اليومية
// =============================================
// ⚠️ تم نقل المصدر من Jikan (توقف نهائياً في 1 أكتوبر 2026) إلى AniList،
// والأخبار من RSS (ANN / MyAnimeList / Crunchyroll).

const config = require('../config');
const responses = require('../utils/responses');
const db = require('../database/db');
const { isAdminJid } = require('../utils/permissions');
const anilist = require('../services/anilist');
const animeFeed = require('../services/animeFeed');
const logger = require('../utils/logger');

const SEASON_AR = { WINTER: 'الشتاء', SPRING: 'الربيع', SUMMER: 'الصيف', FALL: 'الخريف' };
const STATUS_AR = {
  FINISHED: 'منتهٍ', RELEASING: 'يُعرض الآن', NOT_YET_RELEASED: 'لم يُعرض بعد',
  CANCELLED: 'ملغى', HIATUS: 'متوقف مؤقتاً',
};

function isAdminUser(senderId) {
  return isAdminJid(senderId);
}

function fmtDate(unixSec) {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: config.timezone, weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(unixSec * 1000));
}

function clip(s, n) {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

async function reply(sock, chatId, msg, text, extra = {}) {
  return sock.sendMessage(chatId, { text, ...extra }, msg ? { quoted: msg } : undefined);
}

async function showSeason(sock, chatId, msg) {
  const { season, seasonYear, items } = await anilist.seasonAnime(10);
  if (!items.length) return reply(sock, chatId, msg, '📭 لا توجد نتائج للموسم الحالي الآن.');
  const lines = items.map((a, i) => {
    const score = a.averageScore ? `⭐ ${(a.averageScore / 10).toFixed(1)}` : '⭐ —';
    const next = a.nextAiringEpisode
      ? `⏭️ الحلقة ${a.nextAiringEpisode.episode}: ${fmtDate(a.nextAiringEpisode.airingAt)}`
      : `📺 ${STATUS_AR[a.status] || a.status || ''}`;
    return `${i + 1}. 🎬 *${anilist.titleOf(a)}*\n   ${score} • ${next}`;
  });
  return reply(sock, chatId, msg,
    `🌸 *أنميات موسم ${SEASON_AR[season]} ${seasonYear}* (حسب الشعبية)\n\n${lines.join('\n')}\n\n🔎 للتفاصيل: ${config.prefix}بحث-انمي <الاسم>`);
}

async function searchAnimeCmd(sock, chatId, msg, args) {
  const query = args.join(' ').trim();
  if (!query) return reply(sock, chatId, msg, `⚠️ اكتب اسم الأنمي. مثال: ${config.prefix}بحث-انمي Jujutsu Kaisen`);
  const [a] = await anilist.searchAnime(query, 1);
  if (!a) return reply(sock, chatId, msg, `🔍 ما لقيت أنمي باسم: ${query}`);
  const lines = [
    `🎬 *${anilist.titleOf(a)}*`,
    a.title?.native ? `🈷️ ${a.title.native}` : null,
    `📺 النوع: ${a.format || '—'} • الحلقات: ${a.episodes || '—'}`,
    `⭐ التقييم: ${a.averageScore ? (a.averageScore / 10).toFixed(1) + '/10' : '—'}`,
    `📌 الحالة: ${STATUS_AR[a.status] || a.status || '—'}`,
    a.nextAiringEpisode ? `⏭️ الحلقة ${a.nextAiringEpisode.episode}: ${fmtDate(a.nextAiringEpisode.airingAt)}` : null,
    a.siteUrl ? `🔗 ${a.siteUrl}` : null,
  ].filter(Boolean);
  const caption = lines.join('\n');
  if (a.coverImage?.large) {
    try {
      return await sock.sendMessage(chatId, { image: { url: a.coverImage.large }, caption }, msg ? { quoted: msg } : undefined);
    } catch {
      /* نرسل نصاً إن فشلت الصورة */
    }
  }
  return reply(sock, chatId, msg, caption);
}

async function showSchedule(sock, chatId, msg, args) {
  const which = (args[0] || '').toLowerCase();
  const when = which === 'بكرة' || which === 'غداً' || which === 'غدا' || which === 'tomorrow' ? 'tomorrow' : 'today';
  const base = new Date(Date.now() + (when === 'tomorrow' ? 24 * 3600 * 1000 : 0));
  const bounds = animeFeed.localDayBounds(base);
  let airing = [];
  let error = null;
  try {
    airing = await anilist.airingBetween(bounds.from, bounds.to, 100);
  } catch (err) {
    error = err.message;
  }
  const custom = db.listCustomSchedule().filter((r) => r.day_of_week === bounds.weekday);
  const lines = [
    ...airing.map((a) => `• ${animeFeed.formatClock(a.airingAt)} — ${clip(a.title, 60)} (حلقة ${a.episode})`),
    ...custom.map((c) => `• ${c.time_local} — ${c.title}${c.note ? ` (${c.note})` : ''}`),
  ];
  const head = `🗓️ *مواعيد ${when === 'tomorrow' ? 'الغد' : 'اليوم'}*\n📅 ${bounds.dateLabel}\n🕒 التوقيت: ${config.timezone}`;
  if (!lines.length) {
    return reply(sock, chatId, msg, `${head}\n\n${error ? '⚠️ تعذر جلب المواعيد الآن، حاول لاحقاً.' : '📭 لا توجد حلقات مجدولة.'}`);
  }
  return reply(sock, chatId, msg, `${head}\n\n${lines.join('\n')}`);
}

async function showNews(sock, chatId, msg, args) {
  let limit = Number(args[0]);
  if (!Number.isFinite(limit) || limit < 1) limit = 5;
  limit = Math.min(limit, 10);
  let items = db.listRecentNewsItems(limit);
  if (!items.length) {
    await animeFeed.refreshNewsSources();
    items = db.listRecentNewsItems(limit);
  }
  if (!items.length) return reply(sock, chatId, msg, '📭 لا توجد أخبار متاحة الآن، جرّب لاحقاً.');
  const lines = items.map((n, i) => {
    const when = n.published_at ? fmtDate(Math.floor(n.published_at / 1000)) : '';
    let block = `${i + 1}. *${clip(n.title, 140)}*`;
    if (when) block += `\n   🕒 ${when}`;
    if (n.link) block += `\n   🔗 ${n.link}`;
    block += `\n   _(${n.source_name})_`;
    return block;
  });
  return reply(sock, chatId, msg, `🗞️ *آخر أخبار الأنمي*\n\n${lines.join('\n\n')}`);
}

async function digestCmd(sock, chatId, msg, senderId, args) {
  if (!isAdminUser(senderId)) return reply(sock, chatId, msg, responses.get('persona', 'denied_admin'));
  const sub = (args[0] || '').toLowerCase();
  if (sub === 'ايقاف' || sub === 'إيقاف' || sub === 'off') {
    db.unsubscribeNewsletter(chatId);
    return reply(sock, chatId, msg, '🔕 تم إيقاف نشرة الأنمي في هذه المحادثة.');
  }
  if (sub === 'الان' || sub === 'الآن' || sub === 'now') {
    const digest = await animeFeed.buildDigest();
    return reply(sock, chatId, msg, digest.text);
  }
  db.subscribeNewsletter({ chatId, addedBy: senderId });
  const time = db.getGlobalSetting('anime_digest_time') || '09:00';
  return reply(sock, chatId, msg,
    `📺 تم تفعيل نشرة الأنمي اليومية لهذه المحادثة ✅\n🕒 تُرسل كل يوم الساعة ${time} (${config.timezone}).\n` +
    `الأخبار تُنشر مرة واحدة لكل خبر، والمواعيد تشمل حلقات اليوم.\n\n` +
    `💡 لإيقافها: ${config.prefix}إيقاف-نشرة • لإرسالها الآن: ${config.prefix}نشرة-انمي الان`);
}

module.exports = async function animeNewsCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  try {
    switch (commandKey) {
      case 'انميات':
      case 'موسم':
        return await showSeason(sock, chatId, msg);
      case 'بحث-انمي':
      case 'searchanime':
        return await searchAnimeCmd(sock, chatId, msg, args);
      case 'مواعيد-انمي':
      case 'جدول-انمي':
      case 'anischedule':
        return await showSchedule(sock, chatId, msg, args);
      case 'اخبار-انمي':
      case 'anews':
        return await showNews(sock, chatId, msg, args);
      case 'نشرة-انمي':
        return await digestCmd(sock, chatId, msg, senderId, args);
      case 'إيقاف-نشرة':
        if (!isAdminUser(senderId)) return reply(sock, chatId, msg, responses.get('persona', 'denied_admin'));
        db.unsubscribeNewsletter(chatId);
        return reply(sock, chatId, msg, '🔕 تم إيقاف نشرة الأنمي في هذه المحادثة.');
      default:
        return reply(sock, chatId, msg, '⚠️ أمر غير معروف.');
    }
  } catch (err) {
    logger.error(`[anime] ${commandKey}: ${err.message}`);
    return reply(sock, chatId, msg, '⚠️ تعذر جلب بيانات الأنمي الآن (مصدر البيانات لا يستجيب). حاول بعد قليل.');
  }
};

module.exports.isAdminUser = isAdminUser;
