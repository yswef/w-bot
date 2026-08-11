const config = require('../config');

module.exports = async function info({ sock, msg, chatId }) {
  const text = `🤖 *قائمة الأوامر*

${config.prefix}ping - فحص سرعة البوت
${config.prefix}sticker (مع الرد على صورة/فيديو) - تحويلها لملصق
${config.prefix}info - عرض هذي القائمة
${config.prefix}anime - صورة أنمي جذابة + رسالة بأسلوب بلاك كلوفر
${config.prefix}زوجني - يختار لك شخصية أنمي ويقول زوجتك الجميلة هي
${config.prefix}lastseen - يعرض آخر مرة شوهدت فيها هذا الشخص
${config.prefix}رد <الكلمة> <الرد> - يضيف ردًا مخصصًا
${config.prefix}حذفرد <id> - يحذف ردًا مخصصًا
${config.prefix}ترحيب <رسالة> - يحدد رسالة ترحيب للقروب
${config.prefix}لوحة - لوحة التحكم الويب الاحترافية
${config.prefix}جلسات - عرض الجلسات النشطة
${config.prefix}اعادةربط [اسم الجلسة] - إعادة ربط جلسة بعد حذفها أو فقدانها
${config.prefix}لعبة - لعبة بسيطة في أسلوب أنمي
${config.prefix}أفكاري <رقم> - اختبار الحظ الأنمي

✅ ميزات تعمل تلقائياً بدون أمر:
- تسجيل الرسائل
- إعادة إرسال أي رسالة تُحذف
- ردود آلية على كلمات معينة
- ترحيبات تلقائية للقروبات
- تتبع آخر مرة شوهدت فيها الشخص`;

  await sock.sendMessage(chatId, { text }, { quoted: msg });
};
