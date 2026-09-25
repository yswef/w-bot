const { saveCustomReply, deleteCustomReply, setWelcomeMessage, getWelcomeMessage } = require('../database/db');
const config = require('../config');
const responses = require('../utils/responses');
const runtimeState = require('../runtimeState');

// ⚠️ نطلب sessionManager عند الحاجة فقط (lazy) لأن استيراده في أعلى الملف
// يحدث حلقة استيراد: sessionManager -> handlers/messageHandler ->
// handlers/commandHandler -> commands/admin -> sessionManager (غير مكتمل
// بعد) فتصبح الدوال undefined. الطلب المتأخر يضمن الحصول عليها دائماً.
const loadSessionManager = () => require('../sessionManager');

module.exports = async function adminCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  // التحقق من صلاحية المالك - يشمل كل المالكين والأدمن الثاني
  const admins = config.adminNumbers || [config.ownerNumber];
  const isOwner = admins.some(a => a && senderId.replace(/\D/g, '').includes(a));
  if (!isOwner) {
    await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
    return;
  }

  if (commandKey === 'رد') {
    const [keyword, ...replyParts] = args;
    const reply = replyParts.join(' ');
    if (!keyword || !reply) {
      await sock.sendMessage(chatId, { text: `استخدم: ${config.prefix}رد <الكلمة> <الرد>` }, { quoted: msg });
      return;
    }
    saveCustomReply({ keyword, reply, scope: chatId.endsWith('@g.us') ? 'group' : 'private' });
    await sock.sendMessage(chatId, { text: `✅ تم حفظ رد مخصص لكلمة: ${keyword}` }, { quoted: msg });
    return;
  }

  if (commandKey === 'تفاعل') {
    const [keyword, emoji] = args;
    if (!keyword || !emoji) {
      await sock.sendMessage(chatId, { text: `استخدم: ${config.prefix}تفاعل <الكلمة> <الايموجي>` }, { quoted: msg });
      return;
    }
    const { saveCustomReaction } = require('../database/db');
    saveCustomReaction({ keyword, emoji });
    await sock.sendMessage(chatId, { text: `✅ تم إضافة التفاعل ${emoji} للكلمة: ${keyword}` }, { quoted: msg });
    return;
  }

  if (commandKey === 'حذفتفاعل') {
    const id = Number(args[0]);
    if (!id) {
      await sock.sendMessage(chatId, { text: `استخدم: ${config.prefix}حذفتفاعل <id>` }, { quoted: msg });
      return;
    }
    const { deleteCustomReaction } = require('../database/db');
    deleteCustomReaction(id);
    await sock.sendMessage(chatId, { text: `✅ تم حذف التفاعل رقم ${id}` }, { quoted: msg });
    return;
  }

  if (commandKey === 'حذفرد') {
    const id = Number(args[0]);
    if (!id) {
      await sock.sendMessage(chatId, { text: `استخدم: ${config.prefix}حذفرد <id>` }, { quoted: msg });
      return;
    }
    deleteCustomReply(id);
    await sock.sendMessage(chatId, { text: `✅ تم حذف الرد رقم ${id}` }, { quoted: msg });
    return;
  }

  if (commandKey === 'ترحيب') {
    const text = args.join(' ');
    const welcome = getWelcomeMessage(chatId) || {};
    setWelcomeMessage({ chatId, message: text || welcome.message || 'مرحباً بك في القروب! 🌸🤖', imagePath: welcome.imagePath || null });
    await sock.sendMessage(chatId, { text: '✅ تم تحديث رسالة الترحيب.' }, { quoted: msg });
    return;
  }

  if (['لوحة', 'لوحة-التحكم', 'dashboard', 'link'].includes(commandKey)) {
    const { getConfiguredSessionNames } = loadSessionManager();
    const dashboardUrl = config.buildPublicUrl();
    const tokenQuery = config.dashboard.token ? `/?token=${config.dashboard.token}` : '';
    const running = config.dashboard.enabled;

    const text = running
      ? `🧩 *لوحة التحكم أستا ساما*

🌐 *الرابط:* ${dashboardUrl}${tokenQuery}

🔌 *المنفذ (PORT):* ${config.dashboard.port}${process.env.PORT ? ' (مضبوط تلقائياً من المنصة)' : ' (افتراضي)'}
🔑 *الحماية:* ${config.dashboard.token ? 'مفعّلة بـ DASHBOARD_TOKEN' : '⚠️ لا يوجد توكن — أي شخص يعرف الرابط يدخل!'}

📋 *طرق فتح اللوحة:*
1) الرابط أعلاه مباشرة في المتصفح.
2) على Railway: Services → خدماتك → Settings → Networking → Public Networking → *Generate Domain*، ثم استخدم النطاق الذي يظهر.
3) من سجلات التشغيل (Deploy Logs) ابحث عن سطر: "🧩 لوحة التحكم تعمل على المنفذ".

🔄 *الجلسات:* نشطة: ${runtimeState.getActiveSessionNames().join(', ') || 'لا شيء'} | مضبوطة: ${getConfiguredSessionNames().join(', ')}

⏱️ *زمن التشغيل:* ${Math.floor(runtimeState.getUptimeSeconds() / 60)} دقيقة`
      : `🚫 لوحة التحكم معطّلة الآن.
فعّلها من متغيرات البيئة بإزالة ENABLE_DASHBOARD أو ضبطه على true، ثم أعد النشر (Deploy).`;

    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  if (commandKey === 'جلسات') {
    const { getConfiguredSessionNames, getSessionPath } = loadSessionManager();
    const active = runtimeState.getSessions();
    const lines = getConfiguredSessionNames().map((name) => {
      const on = active.find((x) => x.name === name)?.connected;
      return `${on ? '🟢' : '🔴'} ${name} — ${on ? 'متصلة' : 'غير متصلة'}\n📁 ${getSessionPath(name)}`;
    });
    const paths = sessionPaths.describePaths();
    await sock.sendMessage(chatId, {
      text: `🧩 *حالة الجلسات*\n\n${lines.join('\n')}\n\n🗄️ *قاعدة البيانات:* ${paths.databasePath}\n   مصدرها: ${paths.dbOrigin}\n🖼️ *الوسائط:* ${paths.mediaStoreDir}\n   مصدرها: ${paths.mediaOrigin}\n💽 *Volume:* ${paths.volumeMountPath || 'لا يوجد — أضِف Volume من Railway لتبقى جلستك ورسائلك بعد كل deploy'}\n\n💡 إن لم يكن المسار على Volume فستحتاج مسح QR جديد بعد كل إعادة تشغيل.`,
    }, { quoted: msg });
    return;
  }

  if (commandKey === 'اعادةربط' || commandKey === 'reconnect') {
    const name = args[0] || 'default';
    await sock.sendMessage(chatId, { text: `🔄 جاري إعادة ربط الجلسة ${name}...` }, { quoted: msg });
    await loadSessionManager().resetSession(name);
    await sock.sendMessage(chatId, { text: `✅ تم إعادة ربط الجلسة ${name}` }, { quoted: msg });
    return;
  }

  if (commandKey === 'بث') {
    const message = args.join(' ');
    if (!message) {
      await sock.sendMessage(chatId, { text: `استخدم: ${config.prefix}بث <الرسالة>` }, { quoted: msg });
      return;
    }
    const groups = [chatId];
    for (const target of groups) {
      await sock.sendMessage(target, { text: message });
    }
    await sock.sendMessage(chatId, { text: '✅ تم إرسال البث.' }, { quoted: msg });
  }
};
