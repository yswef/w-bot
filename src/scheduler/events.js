const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * عرّف فعالياتك هنا. كل فعالية: تعبير cron + الشات المستهدف + الرسالة.
 * صيغة cron: دقيقة ساعة يوم-الشهر شهر يوم-الأسبوع
 * أمثلة:
 *  '0 9 * * *'   -> كل يوم الساعة 9 صباحاً
 *  '0 20 * * 5'  -> كل يوم جمعة الساعة 8 مساءً
 */
function startScheduler(sock) {
  if (!config.features.scheduler) return;

  const events = [
    {
      cronExpr: '0 9 * * *',
      chatId: 'PUT_GROUP_OR_CHAT_ID_HERE@g.us', // غيّرها لمعرف القروب/الشخص
      message: '🌅 صباح الخير! فعالية اليوم بدأت 🎉',
    },
    // ضيف فعاليات إضافية هنا بنفس الشكل
  ];

  events.forEach((ev) => {
    cron.schedule(
      ev.cronExpr,
      async () => {
        try {
          await sock.sendMessage(ev.chatId, { text: ev.message });
          logger.info(`تم إرسال فعالية مجدولة إلى ${ev.chatId}`);
        } catch (err) {
          logger.error('فشل إرسال فعالية مجدولة: ' + err.message);
        }
      },
      { timezone: config.timezone }
    );
  });

  logger.info(`تم تفعيل ${events.length} فعالية/فعاليات مجدولة`);
}

module.exports = startScheduler;
