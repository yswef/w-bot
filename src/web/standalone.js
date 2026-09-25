// =============================================
// 🖥️ معاينة محلية للوحة التحكم فقط (بدون واتساب)
// =============================================
// تفيدك إذا أردت فتح اللوحة وتجربتها بدون ربط رقم واتساب:
//   npm run dashboard
// اللوحة الكاملة تعمل هنا، لكن لن تكون هناك جلسة واتساب متصلة.
// للإنتاج استخدم: npm start

process.env.ENABLE_DASHBOARD = 'true';
const logger = require('../utils/logger');
const config = require('../config');

require('./app')();

logger.info('هذه معاينة فقط — البوت غير متصل بواتساب. للتشغيل الكامل: npm start');
logger.info('المنفذ الحالي: ' + config.dashboard.port + ' | الحماية: ' + (config.dashboard.token ? 'توكن مضبوط' : 'بدون توكن'));

const keepAlive = setInterval(() => {}, 60 * 60 * 1000);
process.on('SIGINT', () => {
  clearInterval(keepAlive);
  process.exit(0);
});
