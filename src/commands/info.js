const config = require('../config');

module.exports = async function info({ sock, msg, chatId }) {
  const text = `🤖 *قائمة الأوامر*

${config.prefix}ping - فحص سرعة البوت
${config.prefix}sticker (مع الرد على صورة/فيديو) - تحويلها لملصق
${config.prefix}info - عرض هذي القائمة

✅ ميزات تعمل تلقائياً بدون أمر:
- تسجيل الرسائل
- إعادة إرسال أي رسالة تُحذف
- ردود آلية على كلمات معينة`;

  await sock.sendMessage(chatId, { text }, { quoted: msg });
};
