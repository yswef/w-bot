// =============================================
// 🍀 أستا — نقطة تشغيل البوت / Asta bot entry point
// =============================================

const logger = require('./utils/logger');
const { startAllSessions } = require('./sessionManager');
const startProfessionalDashboard = require('./web/app');

// شبكة أمان للتعامل مع الأخطاء غير المتوقعة حتى لا تتوقف العملية بالكامل
process.on('unhandledRejection', (err) => {
  logger.error('خطأ غير متوقع (unhandledRejection): ' + (err?.stack || err));
});

process.on('uncaughtException', (err) => {
  logger.error('خطأ غير معالَج (uncaughtException): ' + (err?.stack || err));
});

// إيقاف نظيف عند إغلاق الخدمة (Ctrl+C أو إعادة نشر على الاستضافة)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.info(`🛑 تم استلام ${signal} — إيقاف أستا بأمان...`);
    process.exit(0);
  });
}

// 🖥️ لوحة التحكم تعمل أولاً حتى يستطيع المستخدم مشاهدة رمز QR من المتصفح
// (كانت معطّلة تماماً في النسخة السابقة فلم يجد أحد طريقة للوصول إليها)
if (process.env.ENABLE_DASHBOARD !== 'false') {
  try {
    startProfessionalDashboard();
  } catch (err) {
    logger.error('تعذر تشغيل لوحة التحكم: ' + err.message);
  }
} else {
  logger.info('ℹ️ لوحة التحكم معطّلة (ENABLE_DASHBOARD=false)');
}

// تشغيل كافة جلسات البوت
startAllSessions().catch((err) => {
  logger.error('فشل تشغيل البوت: ' + err.message);
});
