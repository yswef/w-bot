// =============================================
// 🆔 أمر تشخيصي - يعرض الرقم/المعرّف الفعلي المرسِل للرسالة
// مفيد جداً لتشخيص مشاكل صلاحيات الأدمن، خصوصاً أن واتساب أصبح أحياناً
// يستخدم معرّفات خصوصية (@lid) بدل رقم الهاتف الحقيقي (@s.whatsapp.net)
// لبعض الحسابات، وحينها لن تطابق أي مقارنة نصية برقم الهاتف العادي.
// الاستخدام: !ايدي أو !myid
// =============================================
const config = require('../config');

module.exports = async function whoami({ sock, msg, chatId, senderId }) {
  const digits = (senderId || '').replace(/\D/g, '');
  const isLid = (senderId || '').endsWith('@lid');
  const admins = config.adminNumbers || [config.ownerNumber];
  const matchedAdmin = admins.find((a) => a && digits.includes(a));

  let text = `🆔 *معرّفك الكامل:*\n\`${senderId}\`\n\n🔢 *الأرقام المستخرجة منه:*\n\`${digits}\`\n\n`;

  if (isLid) {
    text += `⚠️ هذا معرّف خصوصية من واتساب (@lid)، وليس رقم هاتفك الحقيقي! هذا يعني أن واتساب يخفي رقمك الفعلي عن البوت في هذه المحادثة.\n\nإذا كنت تريد أن يتعرف عليك البوت كأدمن، انسخ القيمة أعلاه بالضبط (\`${digits}\`) وضعها في متغير SECOND_ADMIN_NUMBER أو EXTRA_OWNER_NUMBERS في إعدادات البيئة (.env)، بدل رقم هاتفك العادي.\n\n`;
  }

  text += matchedAdmin
    ? `✅ حالياً: أنت معرَّف كأدمن/مالك في البوت (مطابقة مع: ${matchedAdmin}).`
    : `❌ حالياً: أنت غير معرَّف كأدمن/مالك في إعدادات البوت.`;

  await sock.sendMessage(chatId, { text }, { quoted: msg });
};
