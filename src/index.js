const logger = require('./utils/logger');
const { startAllSessions, resetSession, getConfiguredSessionNames } = require('./sessionManager');
const startProfessionalDashboard = require('./web/app');

// شبكة أمان: لو صار خطأ غير متوقع ما نخلي العملية كلها توقف
process.on('unhandledRejection', (err) => {
  logger.error('خطأ غير متوقع (unhandledRejection): ' + err);
});

startAllSessions().catch((err) => {
  logger.error('فشل تشغيل البوت: ' + err.message);
});

startProfessionalDashboard();

// module.exports = { startAllSessions, resetSession, getConfiguredSessionNames };