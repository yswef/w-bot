const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');

// استيراد وحدات النشرات لإرسال المحتوى المجدول
let islamicModule, animeNewsModule;
try {
  islamicModule = require('../commands/islamic');
  animeNewsModule = require('../commands/animeNews');
} catch (e) {
  logger.warn('تعذر تحميل وحدات النشرات: ' + e.message);
}

/**
 * الجدولة الرئيسية للبوت
 * يوفر جدولة ثابتة مبنية في الكود + جدولة ديناميكية من قاعدة البيانات
 *
 * صيغة cron: دقيقة ساعة يوم-الشهر شهر يوم-الأسبوع
 * أمثلة:
 *  '0 9 * * *'   -> كل يوم الساعة 9 صباحاً
 *  '0 20 * * 5'  -> كل يوم جمعة الساعة 8 مساءً
 */
function startScheduler(sock) {
  if (!config.features.scheduler) return;

  // ===== آية قرآنية يومية الساعة 7 صباحاً =====
  cron.schedule('0 7 * * *', async () => {
    try {
      if (!islamicModule) return;
      const schedules = islamicModule.getActiveIslamicSchedules
        ? islamicModule.getActiveIslamicSchedules()
        : [];

      for (const sched of schedules) {
        if (sched.type === 'quran') {
          const verse = islamicModule.getRandom(islamicModule.quranVerses);
          await sock.sendMessage(sched.chat_id, {
            text: `📖 *آية الصباح*\n\n${verse.verse}\n\n📍 ${verse.ref}\n\n🌅 صباح الخير! اللهم اجعل القرآن ربيع قلوبنا 🌸`
          });
          logger.info(`تم إرسال آية يومية إلى ${sched.chat_id}`);
        }
      }
    } catch (err) {
      logger.error('فشل إرسال الآية اليومية: ' + err.message);
    }
  }, { timezone: config.timezone });

  // ===== أذكار المساء الساعة 5 مساءً =====
  cron.schedule('0 17 * * *', async () => {
    try {
      if (!islamicModule) return;
      const schedules = islamicModule.getActiveIslamicSchedules
        ? islamicModule.getActiveIslamicSchedules()
        : [];

      for (const sched of schedules) {
        if (sched.type === 'thikr') {
          const thikr = islamicModule.getRandom(islamicModule.athkar);
          await sock.sendMessage(sched.chat_id, {
            text: `🌿 *ذكر المساء*\n\n${thikr}\n\n🌙 عساكم بخير وعافية 🤲`
          });
          logger.info(`تم إرسال ذكر مساء إلى ${sched.chat_id}`);
        }
      }
    } catch (err) {
      logger.error('فشل إرسال الذكر اليومي: ' + err.message);
    }
  }, { timezone: config.timezone });

  // ===== نشرة الأنمي اليومية الساعة 9 صباحاً =====
  cron.schedule('0 9 * * *', async () => {
    try {
      if (!animeNewsModule) return;
      const subscribers = animeNewsModule.getNewsletterSubscribers
        ? animeNewsModule.getNewsletterSubscribers()
        : [];
      if (subscribers.length === 0) return;

      // جلب قائمة الأنميات الحالية
      const data = await animeNewsModule.fetchJSON('https://api.jikan.moe/v4/seasons/now?limit=5');
      if (!data.data || data.data.length === 0) return;

      const list = data.data.slice(0, 5).map((a, i) => {
        return `${i + 1}. 🎬 *${a.title}* - ⭐ ${a.score || '?'}`;
      }).join('\n');

      const message = `📺 *نشرة الأنمي اليومية* 🍀\n\n${list}\n\n🔮 مجدّب الموسم الحالي!`;

      for (const sub of subscribers) {
        await sock.sendMessage(sub.chat_id, { text: message });
        logger.info(`تم إرسال نشرة الأنمي إلى ${sub.chat_id}`);
      }
    } catch (err) {
      logger.error('فشل إرسال نشرة الأنمي: ' + err.message);
    }
  }, { timezone: config.timezone });

  logger.info('✅ تم تفعيل نظام الجدولة (آيات، أذكار، نشرة الأنمي)');

  // Dynamic User-Defined Schedules
  const { getScheduledEvents } = require('../database/db');
  const allEvents = getScheduledEvents();
  let loadedCount = 0;
  allEvents.forEach((evt) => {
    // ⚠️ إصلاح استقرار: قيمة cron_expression قد تكون غير صالحة (خطأ إدخال
    // قديم/تلف بيانات)، وسابقاً كان node-cron يرمي استثناء يوقف تحميل بقية
    // الجدولة بالكامل (بما فيها آية الصباح/الأذكار/نظام التنظيف). الآن نتحقق
    // من صحة الصيغة أولاً ونتجاوز أي جدولة تالفة بدل تعطيل كل شيء.
    if (!cron.validate(evt.cron_expression)) {
      logger.warn(`تم تجاهل جدولة ديناميكية بصيغة cron غير صالحة (id=${evt.id}): ${evt.cron_expression}`);
      return;
    }
    try {
      cron.schedule(evt.cron_expression, async () => {
        try {
          if (evt.message.startsWith('COMMAND:')) {
            const cmd = evt.message.split('COMMAND:')[1];
            if (cmd === 'lock') {
              await sock.groupSettingUpdate(evt.chat_id, 'announcement');
              logger.info(`Scheduled Event: locked group ${evt.chat_id}`);
            }
            if (cmd === 'unlock') {
              await sock.groupSettingUpdate(evt.chat_id, 'not_announcement');
              logger.info(`Scheduled Event: unlocked group ${evt.chat_id}`);
            }
          } else {
            await sock.sendMessage(evt.chat_id, { text: evt.message });
            logger.info(`Scheduled Event: sent message to group ${evt.chat_id}`);
          }
        } catch (err) {
          logger.error(`فشل تشغيل الجدولة للنظام الديناميكي: ${err.message}`);
        }
      }, { timezone: config.timezone });
      loadedCount += 1;
    } catch (err) {
      logger.error(`فشل تسجيل جدولة ديناميكية (id=${evt.id}): ${err.message}`);
    }
  });

  logger.info(`✅ تم تحميل ${loadedCount} جدولة ديناميكية للمجموعات.`);

  // ===== نظام التذكيرات (!تذكير) - يفحص كل دقيقة التذكيرات المستحقة =====
  // نستخدم قاعدة البيانات بدل setTimeout حتى لا تُفقد التذكيرات إذا أعيد
  // تشغيل البوت (فقدان الاتصال بواتساب، إعادة نشر السيرفر، الخ).
  const { getDueReminders, markReminderSent } = require('../database/db');
  cron.schedule('* * * * *', async () => {
    try {
      const due = getDueReminders();
      for (const r of due) {
        try {
          await sock.sendMessage(r.target_jid, {
            text: `⏰ *تذكير!*\n\n📝 ${r.text}\n\n✅ حان الوقت الذي حددته لهذه المهمة.`,
          });
          markReminderSent(r.id);
          logger.info(`تم إرسال تذكير (id=${r.id}) إلى ${r.target_jid}`);
        } catch (err) {
          logger.error(`فشل إرسال التذكير (id=${r.id}): ${err.message}`);
        }
      }
    } catch (err) {
      logger.error('فشل فحص التذكيرات المستحقة: ' + err.message);
    }
  }, { timezone: config.timezone });

  logger.info('✅ تم تفعيل نظام التذكيرات (!تذكير)');

  // تشغيل نظام تنظيف السيرفر
  const startCleanupCron = require('./cleanup');
  startCleanupCron();
}

module.exports = startScheduler;
