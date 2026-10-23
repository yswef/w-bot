// =============================================
// 🛠️ أوامر الإدارة: الردود والتفاعلات والمشرفون ولوحة التحكم والبث
// =============================================
const {
  saveCustomReply,
  deleteCustomReply,
  getCustomReplyById,
  saveCustomReaction,
  deleteCustomReaction,
  getCustomReactionById,
  addBotAdmin,
  removeBotAdmin,
  listBotAdmins,
} = require('../database/db');
const config = require('../config');
const responses = require('../utils/responses');
const { isAdminJid, isOwnerJid, normalizePhone, jidUser } = require('../utils/permissions');

// ⚠️ تُحمَّل بشكل كسول لتفادي اعتماد دائري (sessionManager ← commandHandler ← admin)
function sessionManager() {
  return require('../sessionManager');
}

const MAX_KEYWORD = 100;
const MAX_REPLY = 2000;

/** يفصل "الكلمة | الرد" أو "الكلمة الرد" */
function splitKeywordReply(args) {
  const joined = args.join(' ').trim();
  if (joined.includes('|')) {
    const [k, ...rest] = joined.split('|');
    return { keyword: k.trim(), reply: rest.join('|').trim() };
  }
  const [keyword, ...replyParts] = args;
  return { keyword: (keyword || '').trim(), reply: replyParts.join(' ').trim() };
}

async function say(sock, chatId, msg, text) {
  await sock.sendMessage(chatId, { text }, msg ? { quoted: msg } : undefined);
}

module.exports = async function adminCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  if (!isAdminJid(senderId)) {
    await say(sock, chatId, msg, responses.get('persona', 'denied_owner'));
    return;
  }

  // 🔐 أوامر المالك فقط (تُفحص أيضاً في commandHandler)
  const OWNER_ONLY = ['لوحة', 'dashboard', 'panel', 'جلسات', 'اعادةربط', 'reconnect', 'بث', 'ادمن', 'مشرف', 'admins'];
  if (OWNER_ONLY.includes(commandKey) && !isOwnerJid(senderId)) {
    await say(sock, chatId, msg, '🔒 هذا الأمر للمالك فقط.');
    return;
  }

  if (commandKey === 'رد') {
    const { keyword, reply } = splitKeywordReply(args);
    if (!keyword || !reply) {
      await say(sock, chatId, msg, `استخدم: ${config.prefix}رد <الكلمة> <الرد>\nأو للكلمات المتعددة: ${config.prefix}رد كيف الحال | الحمد لله`);
      return;
    }
    if (keyword.length > MAX_KEYWORD || reply.length > MAX_REPLY) {
      await say(sock, chatId, msg, `⚠️ الكلمة أطول من ${MAX_KEYWORD} حرف أو الرد أطول من ${MAX_REPLY} حرف.`);
      return;
    }
    const id = saveCustomReply({ keyword, reply, scope: chatId.endsWith('@g.us') ? 'group' : 'private' });
    await say(sock, chatId, msg, `✅ تم حفظ الرد رقم ${id} للكلمة: ${keyword}\nيعمل فقط عند ورود الكلمة كاملة (وليس جزءاً من كلمة أخرى).`);
    return;
  }

  if (commandKey === 'تفاعل') {
    const [keyword, emoji] = args;
    if (!keyword || !emoji) {
      await say(sock, chatId, msg, `استخدم: ${config.prefix}تفاعل <الكلمة> <الايموجي>`);
      return;
    }
    const id = saveCustomReaction({ keyword, emoji });
    await say(sock, chatId, msg, `✅ تم إضافة التفاعل ${emoji} للكلمة: ${keyword} (رقم ${id})`);
    return;
  }

  if (commandKey === 'حذفتفاعل') {
    const id = Number(args[0]);
    if (!id) {
      await say(sock, chatId, msg, `استخدم: ${config.prefix}حذفتفاعل <id>`);
      return;
    }
    if (!getCustomReactionById(id)) {
      await say(sock, chatId, msg, `⚠️ لا يوجد تفاعل برقم ${id}.`);
      return;
    }
    deleteCustomReaction(id);
    await say(sock, chatId, msg, `✅ تم حذف التفاعل رقم ${id}`);
    return;
  }

  if (commandKey === 'حذفرد') {
    const id = Number(args[0]);
    if (!id) {
      await say(sock, chatId, msg, `استخدم: ${config.prefix}حذفرد <id>`);
      return;
    }
    if (!getCustomReplyById(id)) {
      await say(sock, chatId, msg, `⚠️ لا يوجد رد برقم ${id}.`);
      return;
    }
    deleteCustomReply(id);
    await say(sock, chatId, msg, `✅ تم حذف الرد رقم ${id}`);
    return;
  }

  // 👑 إدارة المشرفين: .ادمن اضافة 967xxxxxxx | .ادمن حذف 967xxxxxxx | .ادمن قائمة
  if (commandKey === 'ادمن' || commandKey === 'مشرف' || commandKey === 'admins') {
    const action = (args[0] || 'قائمة').trim();
    const number = normalizePhone(args[1]);
    const configured = config.adminNumbers.map((n) => `• ${n} (من الإعدادات)`);
    if (action === 'قائمة' || action === 'list') {
      const stored = listBotAdmins().map((a) => `• ${a.user_id} (أُضيف بواسطة ${a.added_by ? jidUser(a.added_by) : '—'})`);
      await say(sock, chatId, msg, `👑 *المشرفون*\n\n${[...configured, ...stored].join('\n') || 'لا يوجد'}\n\nالإضافة: ${config.prefix}ادمن اضافة <الرقم>\nالحذف: ${config.prefix}ادمن حذف <الرقم>`);
      return;
    }
    if (!number) {
      await say(sock, chatId, msg, `⚠️ أرسل رقماً صحيحاً (مثال: ${config.prefix}ادمن اضافة 967700000000)`);
      return;
    }
    if (action === 'اضافة' || action === 'إضافة' || action === 'add') {
      if (config.adminNumbers.includes(number)) {
        await say(sock, chatId, msg, `ℹ️ ${number} مشرف بالفعل من الإعدادات.`);
        return;
      }
      addBotAdmin(number, jidUser(senderId));
      await say(sock, chatId, msg, `✅ تمت إضافة ${number} كمشرف للبوت.`);
      return;
    }
    if (action === 'حذف' || action === 'remove') {
      if (config.adminNumbers.includes(number)) {
        await say(sock, chatId, msg, '⚠️ لا يمكن حذف مشرف معرّف في ملف الإعدادات (.env).');
        return;
      }
      removeBotAdmin(number);
      await say(sock, chatId, msg, `✅ تمت إزالة ${number} من المشرفين.`);
      return;
    }
    await say(sock, chatId, msg, `استخدم: ${config.prefix}ادمن اضافة|حذف|قائمة <الرقم>`);
    return;
  }

  // 🖥️ رابط لوحة التحكم مع رمز الوصول (للمالك فقط)
  if (commandKey === 'لوحة' || commandKey === 'dashboard' || commandKey === 'panel') {
    const port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
    const token = require('../web/app').DASHBOARD_TOKEN;
    const publicUrl = process.env.DASHBOARD_PUBLIC_URL || `http://localhost:${port}`;
    const text =
      `🖥️ *لوحة تحكم أستا*\n\n` +
      `🔗 الرابط:\n${publicUrl}/?token=${token}\n\n` +
      `🔑 رمز الوصول: \`${token}\`\n\n` +
      `📱 تعمل اللوحة على الجوال. من داخلها: الأنمي والنشرة، النقاط، المشرفون، الردود، التفاعلات، المحظورون، التذكيرات، ورمز QR.\n\n` +
      `🧩 الجلسات المتاحة: ${sessionManager().getConfiguredSessionNames().join(', ')}\n\n` +
      `💡 لتثبيت الرمز بشكل دائم ضع \`DASHBOARD_TOKEN\` في ملف .env`;
    await say(sock, chatId, msg, text);
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
    await say(sock, chatId, msg, `🧩 *حالة الجلسات*\n\n${details}`);
    return;
  }

  if (commandKey === 'اعادةربط' || commandKey === 'reconnect') {
    const name = args[0] || 'default';
    await say(sock, chatId, msg, `🔄 جاري إعادة ربط الجلسة ${name}...`);
    await sessionManager().resetSession(name);
    await say(sock, chatId, msg, `✅ تم إعادة ربط الجلسة ${name}`);
    return;
  }

  if (commandKey === 'بث') {
    const message = args.join(' ');
    if (!message) {
      await say(sock, chatId, msg, `استخدم: ${config.prefix}بث <الرسالة>`);
      return;
    }
    // يرسل لكل المجموعات التي ينتمي إليها البوت مع فاصل زمني بين الرسائل تجنباً للحظر
    let targets = [chatId];
    try {
      const groups = await sock.groupFetchAllParticipating();
      const ids = Object.keys(groups || {});
      if (ids.length) targets = ids;
    } catch {
      await say(sock, chatId, msg, '⚠️ تعذر جلب قائمة المجموعات، سيتم الإرسال للمحادثة الحالية فقط.');
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
    await say(sock, chatId, msg, `✅ تم إرسال البث إلى ${sent} محادثة${failed ? ` (فشل ${failed})` : ''}.`);
  }
};
