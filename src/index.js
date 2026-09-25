// =============================================
// 🚀 نقطة الدخول الرئيسية للبوت (Entrypoint)
// =============================================
// الترتيب مهم:
//   1) نبدأ لوحة التحكم أولاً (خادم HTTP على المنفذ $PORT) حتى تظهر في سجلات
//      Railway ويعرفها Railway كخدمة ويب.
//   2) ثم نشغّل جلسات واتساب (قد تستغرق ثوانٍ وتعيد المحاولة تلقائياً).
//
// ملاحظة تاريخية: كان تشغيل اللوحة معلّقاً بـ comment هنا وفي sessionManager،
// وهذا سبب عدم ظهور أي رابط لوحة تحكم على Railway أصلاً.
// =============================================

const logger = require('./utils/logger');
const config = require('./config');
const { startAllSessions } = require('./sessionManager');

// شبكة أمان للتعامل مع الأخطاء غير المتوقعة (لا نوقف العملية كلها)
process.on('unhandledRejection', (err) => {
  logger.error('خطأ غير متوقع (unhandledRejection): ' + (err?.stack || err));
});

process.on('uncaughtException', (err) => {
  logger.error('استثناء غير ملتقط (uncaughtException): ' + (err?.stack || err));
});

// ===== 1) لوحة التحكم =====
if (config.dashboard.enabled) {
  try {
    require('./web/app')();
  } catch (err) {
    logger.error('فشل تشغيل لوحة التحكم: ' + err.message);
    logger.info('يمكنك تعطيلها مؤقتاً بـ: ENABLE_DASHBOARD=false');
  }
} else {
  logger.info('🧩 لوحة التحكم معطّلة (ENABLE_DASHBOARD=false). لتشغيلها احذف المتغير أو اجعله true');
  logger.info(`   الرابط المتوقع عند تشغيلها: http://localhost:${config.dashboard.port}`);
}

// ===== 2) جلسات واتساب =====
startAllSessions().catch((err) => {
  logger.error('فشل تشغيل البوت: ' + err.message);
  logger.info('تلميحات: تحقق من الاتصال بالإنترنت، وحذف مجلد session ثم إعادة التشغيل إذا تكرّر الخطأ.');
});
