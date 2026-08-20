const { saveCustomReply, deleteCustomReply, setWelcomeMessage, getWelcomeMessage } = require('../database/db');
const config = require('../config');
const responses = require('../utils/responses');
const { resetSession, getActiveSessionNames, getConfiguredSessionNames } = require('../sessionManager');

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

  if (commandKey === 'لوحة') {
    const text = `🧩 لوحة التحكم جاهزة على الرابط المحلي:\nhttp://localhost:3000\n\nالجلسات المتاحة: ${getConfiguredSessionNames().join(', ')}`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  if (commandKey === 'جلسات') {
    const text = `🧩 الجلسات النشطة: ${getActiveSessionNames().join(', ') || 'لا توجد جلسات نشطة'}`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  if (commandKey === 'اعادةربط' || commandKey === 'reconnect') {
    const name = args[0] || 'default';
    await sock.sendMessage(chatId, { text: `🔄 جاري إعادة ربط الجلسة ${name}...` }, { quoted: msg });
    await resetSession(name);
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
