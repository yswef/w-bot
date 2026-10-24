// =============================================
// ⏰ الجدولة الرئيسية للبوت
// =============================================
// ⚠️ إصلاحات جوهرية:
//  - يُشغَّل الجدولة مرة واحدة فقط لكل عملية (كانت تُنشأ من جديد مع كل إعادة اتصال
//    فتتراكم المهام، فتتكرر الأوامر والتذكيرات والنشرات).
//  - المهام تستخدم السوكيت "الحالي" عبر دالة، فلا تعمل بسوكيت قديم منتهٍ.
//  - آية/ذكر الصباح والمساء تحترم الوقت المحفوظ لكل جدول (كانت ثابتة 7 و5).
//  - المهام الديناميكية للمجموعات تُعاد تحميلها فوراً بعد الإضافة أو الحذف.
//  - التذكيرات تُطالَب بها ذرياً قبل الإرسال، فلا تُرسل مرتين.

const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../database/db');
const islamic = require('../commands/islamic');
const animeFeed = require('../services/animeFeed');
const startCleanupCron = require('./cleanup');

const NEWS_REFRESH_CRON = '*/30 * * * *';
const DEFAULT_DIGEST_TIME = '09:00';

let started = false;
let getSock = () => null;
let digestTask = null;
let newsTask = null;
let reminderTask = null;
let reminderRunning = false;
let islamicTasks = [];
let groupTasks = [];

const pad = (n) => String(n).padStart(2, '0');

/** يحوّل "HH:MM" إلى ساعة ودقيقة، ويرجع null إذا كانت الصيغة غير صالحة */
function parseHHMM(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return { h, mi, text: `${pad(h)}:${pad(mi)}` };
}

function stopAll(list) {
  for (const t of list) {
    try { t.stop(); } catch { /* تجاهل */ }
  }
}

function currentSock() {
  return getSock();
}

// ---------- الآيات والأذكار حسب الوقت المحفوظ ----------
async function sendIslamicItem(sched) {
  const sock = currentSock();
  if (!sock) return;
  try {
    if (sched.type === 'quran') {
      const verse = islamic.getRandom(islamic.quranVerses);
      await sock.sendMessage(sched.chat_id, {
        text: `📖 *آية اليوم*\n\n${verse.verse}\n\n📍 ${verse.ref}\n\n🌅 اللهم اجعل القرآن ربيع قلوبنا 🌸`,
      });
    } else if (sched.type === 'thikr') {
      const thikr = islamic.getRandom(islamic.athkar);
      await sock.sendMessage(sched.chat_id, {
        text: `🌿 *ذكر اليوم*\n\n${thikr}\n\n🤲 عساكم بخير وعافية`,
      });
    }
    logger.info(`تم إرسال ${sched.type === 'quran' ? 'آية' : 'ذكر'} مجدول إلى ${sched.chat_id}`);
  } catch (err) {
    logger.error(`فشل الإرسال المجدول (id=${sched.id}): ${err.message}`);
  }
}

function reloadIslamicSchedules() {
  stopAll(islamicTasks);
  islamicTasks = [];
  let count = 0;
  for (const sched of islamic.getActiveIslamicSchedules()) {
    const fallback = sched.type === 'quran' ? '07:00' : '17:00';
    const t = parseHHMM(sched.time_expression) || parseHHMM(fallback);
    try {
      islamicTasks.push(cron.schedule(`${t.mi} ${t.h} * * *`, () => sendIslamicItem(sched), { timezone: config.timezone }));
      count++;
    } catch (err) {
      logger.warn(`تعذر جدولة الجدول الإسلامي (id=${sched.id}): ${err.message}`);
    }
  }
  return count;
}

// ---------- الجدولة الديناميكية للمجموعات ----------
async function runGroupEvent(evt) {
  const sock = currentSock();
  if (!sock) return;
  try {
    if (evt.message.startsWith('COMMAND:')) {
      const cmd = evt.message.slice('COMMAND:'.length);
      if (cmd === 'lock') await sock.groupSettingUpdate(evt.chat_id, 'announcement');
      if (cmd === 'unlock') await sock.groupSettingUpdate(evt.chat_id, 'not_announcement');
      logger.info(`Scheduled Event (${cmd}) للمجموعة ${evt.chat_id}`);
    } else {
      await sock.sendMessage(evt.chat_id, { text: evt.message });
      logger.info(`Scheduled Event: أُرسلت رسالة إلى ${evt.chat_id}`);
    }
  } catch (err) {
    logger.error(`فشل تشغيل جدولة المجموعة (id=${evt.id}): ${err.message}`);
  }
}

function reloadGroupEvents() {
  stopAll(groupTasks);
  groupTasks = [];
  let loaded = 0;
  for (const evt of db.listScheduledEvents()) {
    if (!cron.validate(evt.cron_expression)) {
      logger.warn(`تم تجاهل جدولة بصيغة cron غير صالحة (id=${evt.id}): ${evt.cron_expression}`);
      continue;
    }
    try {
      groupTasks.push(cron.schedule(evt.cron_expression, () => runGroupEvent(evt), { timezone: config.timezone }));
      loaded++;
    } catch (err) {
      logger.error(`فشل تسجيل جدولة (id=${evt.id}): ${err.message}`);
    }
  }
  return loaded;
}

// ---------- نشرة الأنمي اليومية ----------
function digestTime() {
  return parseHHMM(db.getGlobalSetting('anime_digest_time')) || parseHHMM(DEFAULT_DIGEST_TIME);
}

async function runDigest() {
  const sock = currentSock();
  if (!sock) return { sent: 0, failed: 0, reason: 'no-socket' };
  try {
    return await animeFeed.sendDigest(sock);
  } catch (err) {
    logger.error('فشل إرسال نشرة الأنمي: ' + err.message);
    return { sent: 0, failed: 0, reason: err.message };
  }
}

function rescheduleDigest() {
  if (digestTask) {
    try { digestTask.stop(); } catch { /* تجاهل */ }
    digestTask = null;
  }
  const t = digestTime();
  digestTask = cron.schedule(`${t.mi} ${t.h} * * *`, runDigest, { timezone: config.timezone });
  return t.text;
}

async function refreshNews() {
  try {
    const results = await animeFeed.refreshNewsSources();
    const ok = results.filter((r) => r.ok).length;
    logger.info(`📰 تحديث أخبار الأنمي: ${ok}/${results.length} مصادر تعمل`);
    return results;
  } catch (err) {
    logger.error('فشل تحديث أخبار الأنمي: ' + err.message);
    return [];
  }
}

// ---------- التذكيرات ----------
async function checkReminders() {
  if (reminderRunning) return;
  const sock = currentSock();
  if (!sock) return;
  reminderRunning = true;
  try {
    for (const r of db.getDueReminders()) {
      if (!db.claimReminder(r.id)) continue; // أخذها غيرنا
      try {
        await sock.sendMessage(r.target_jid, {
          text: `⏰ *تذكير!*\n\n📝 ${r.text}\n\n✅ حان الوقت الذي حددته لهذه المهمة.`,
        });
        db.markReminderSent(r.id);
        logger.info(`تم إرسال تذكير (id=${r.id}) إلى ${r.target_jid}`);
      } catch (err) {
        db.releaseReminder(r.id);
        logger.error(`فشل إرسال التذكير (id=${r.id}): ${err.message}`);
      }
    }
  } catch (err) {
    logger.error('فشل فحص التذكيرات المستحقة: ' + err.message);
  } finally {
    reminderRunning = false;
  }
}

/**
 * يُشغَّل مرة واحدة فقط. يقبل دالة تعيد السوكيت الحالي (مُفضَّل) أو سوكيت ثابت.
 */
function startScheduler(sockOrGetter) {
  if (started) {
    if (typeof sockOrGetter === 'function') getSock = sockOrGetter;
    return;
  }
  started = true;
  getSock = typeof sockOrGetter === 'function' ? sockOrGetter : () => sockOrGetter;
  if (!config.features.scheduler) {
    logger.info('الجدولة معطّلة من الإعدادات (ENABLE_SCHEDULER=false)');
    return;
  }

  // مصادر الأخبار الافتراضية تُضاف فوراً عند أول تشغيل (تظهر في اللوحة مباشرة)
  try { animeFeed.seedDefaultSources(); } catch (err) { logger.warn('تعذر تهيئة مصادر الأخبار: ' + err.message); }

  // مصادر الأخبار: تحديث كل 30 دقيقة، وأول تحديث بعد دقيقة من التشغيل
  newsTask = cron.schedule(NEWS_REFRESH_CRON, refreshNews, { timezone: config.timezone });
  const firstRefresh = setTimeout(refreshNews, 60 * 1000);
  if (firstRefresh.unref) firstRefresh.unref();

  const digestAt = rescheduleDigest();
  logger.info(`📺 نشرة الأنمي اليومية الساعة ${digestAt}`);

  const loadedIslamic = reloadIslamicSchedules();
  const loadedGroups = reloadGroupEvents();
  logger.info(`✅ جدولة: ${loadedIslamic} جدول إسلامي، ${loadedGroups} جدولة للمجموعات`);

  reminderTask = cron.schedule('* * * * *', checkReminders, { timezone: config.timezone });
  startCleanupCron();
}

/** إيقاف كل المهام (يُستخدم في الاختبارات) */
function stopScheduler() {
  stopAll([digestTask, newsTask, reminderTask].filter(Boolean));
  stopAll(islamicTasks);
  stopAll(groupTasks);
  digestTask = newsTask = reminderTask = null;
  islamicTasks = [];
  groupTasks = [];
  started = false;
}

module.exports = startScheduler;
module.exports.startScheduler = startScheduler;
module.exports.stopScheduler = stopScheduler;
module.exports.reloadIslamicSchedules = reloadIslamicSchedules;
module.exports.reloadGroupEvents = reloadGroupEvents;
module.exports.rescheduleDigest = rescheduleDigest;
module.exports.runDigest = runDigest;
module.exports.refreshNews = refreshNews;
module.exports.parseHHMM = parseHHMM;
