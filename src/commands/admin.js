const { saveCustomReply, deleteCustomReply, setWelcomeMessage, getWelcomeMessage } = require('../database/db');
const config = require('../config');
const responses = require('../utils/responses');
// ⚠️ تُحمَّل بشكل كسول لتفادي اعتماد دائري (sessionManager ← commandHandler ← admin)
function sessionManager() {
  return require('../sessionManager');
}

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

  // 🖥️ يعرض رابط لوحة التحكم مع رمز الوصول (للمالك فقط — تم التحقق بالأعلى)
  if (commandKey === 'لوحة' || commandKey === 'dashboard' || commandKey === 'panel') {
    const port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
    const token = require('../web/app').DASHBOARD_TOKEN;
    const publicUrl = process.env.DASHBOARD_PUBLIC_URL || `http://localhost:${port}`;
    const text =
      `🖥️ *لوحة تحكم أستا*\n\n` +
      `🔗 الرابط:\n${publicUrl}/?token=${token}\n\n` +
      `🔑 رمز الوصول: \`${token}\`\n\n` +
      `📊 من اللوحة تقدر تشوف: الرسائل المعدَّلة، الرسائل المحذوفة، الإحصائيات، ` +
      `الردود والتفاعلات التلقائية، المحظورين، التذكيرات، ورمز QR للربط.\n\n` +
      `🧩 الجلسات المتاحة: ${sessionManager().getConfiguredSessionNames().join(', ')}\n\n` +
      `💡 لتثبيت الرمز بشكل دائم ضع \`DASHBOARD_TOKEN\` في ملف .env`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  if (commandKey === 'جلسات') {
    const statuses = sessionManager().getSessionsStatus();
    const details = statuses.length
      ? statuses.map((st) => {
          const icon = st.connection === 'open' ? '🟢 متصل' : st.connection === 'qr' ? '🟡 بانتظار QR' : '🔴 منقطع';
          return `• ${st.name}: ${icon}`;
        }).join('\n')
      : 'لا توجد جلسات نشطة';
    const text = `🧩 *حالة الجلسات*\n\n${details}`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  if (commandKey === 'اعادةربط' || commandKey === 'reconnect') {
    const name = args[0] || 'default';
    await sock.sendMessage(chatId, { text: `🔄 جاري إعادة ربط الجلسة ${name}...` }, { quoted: msg });
    await sessionManager().resetSession(name);
    await sock.sendMessage(chatId, { text: `✅ تم إعادة ربط الجلسة ${name}` }, { quoted: msg });
    return;
  }

  if (commandKey === 'بث') {
    const message = args.join(' ');
    if (!message) {
      await sock.sendMessage(chatId, { text: `استخدم: ${config.prefix}بث <الرسالة>` }, { quoted: msg });
      return;
    }
    // ⚠️ تحسين: كان "البث" يرسل للمحادثة الحالية فقط (أي أنه لم يكن بثاً إطلاقاً).
    // الآن يرسل لكل المجموعات التي ينتمي إليها البوت، مع فاصل زمني بسيط بين
    // كل رسالة والتي تليها تجنّباً لحظر الرقم بسبب الإرسال السريع.
    let targets = [chatId];
    try {
      const groups = await sock.groupFetchAllParticipating();
      const ids = Object.keys(groups || {});
      if (ids.length) targets = ids;
    } catch (err) {
      await sock.sendMessage(chatId, { text: '⚠️ تعذر جلب قائمة المجموعات، سيتم الإرسال للمحادثة الحالية فقط.' }, { quoted: msg });
    }

    let sent = 0;
    let failed = 0;
    for (const target of targets) {
      try {
        await sock.sendMessage(target, { text: `📢 *رسالة من إدارة أستا*\n\n${message}` });
        sent += 1;
      } catch {
        failed += 1;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    await sock.sendMessage(chatId, { text: `✅ تم إرسال البث إلى ${sent} محادثة${failed ? ` (فشل ${failed})` : ''}.` }, { quoted: msg });
  }
};
