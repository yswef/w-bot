// =============================================
// 📜 سجل الرسائل المعدَّلة والمحذوفة (Edit / Delete history)
// =============================================
// يتيح استعراض التعديلات والحذف من داخل واتساب نفسه بدون فتح لوحة التحكم.

const {
  getEditHistory,
  getRecentEdits,
  getRecentDeleted,
  getChatSettings,
} = require('../database/db');
const config = require('../config');

function when(ts) {
  try {
    return new Date(Number(ts)).toLocaleString('ar-EG', { timeZone: config.timezone });
  } catch {
    return '—';
  }
}

function shortJid(jid) {
  return String(jid || '').split('@')[0] || 'مجهول';
}

module.exports = async function historyCommand({ sock, msg, args, chatId, commandKey }) {
  // ===== .تعديلات — سجل الرسائل المعدَّلة =====
  if (commandKey === 'تعديلات' || commandKey === 'edits') {
    // إذا كان الأمر رداً على رسالة، نعرض سجل تعديلات تلك الرسالة بالتحديد
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quotedId = ctx?.stanzaId;

    if (quotedId) {
      const history = getEditHistory(quotedId);
      if (!history.length) {
        await sock.sendMessage(chatId, { text: '✅ هذه الرسالة لم تُعدَّل إطلاقاً.' }, { quoted: msg });
        return;
      }
      const body = history
        .map((h, i) => `*${i + 1}.* ${when(h.edited_at)}\n📝 قبل: "${h.old_text || '—'}"\n✨ بعد: "${h.new_text || '—'}"`)
        .join('\n\n');
      await sock.sendMessage(chatId, { text: `✏️ *سجل تعديلات هذه الرسالة* (${history.length})\n\n${body}` }, { quoted: msg });
      return;
    }

    const limit = Math.min(parseInt(args[0], 10) || 10, 25);
    const rows = getRecentEdits(200).filter((r) => r.chat_id === chatId).slice(0, limit);
    if (!rows.length) {
      const enabled = getChatSettings(chatId).anti_edit !== 0;
      await sock.sendMessage(chatId, {
        text: `ℹ️ لا توجد رسائل معدَّلة مسجّلة في هذه المحادثة بعد.\n` +
          `كشف التعديل حالياً: *${enabled ? 'مفعّل ✅' : 'متوقف ⛔'}*\n` +
          `للتبديل: \`${config.prefix}ضد_التعديل\` / \`${config.prefix}ضد_التعديل ايقاف\``,
      }, { quoted: msg });
      return;
    }
    const body = rows
      .map((r, i) => `*${i + 1}.* @${shortJid(r.sender_id)} — ${when(r.edited_at)}\n📝 قبل: "${r.old_text || '—'}"\n✨ بعد: "${r.new_text || '—'}"`)
      .join('\n\n');
    await sock.sendMessage(chatId, {
      text: `✏️ *آخر ${rows.length} رسالة معدَّلة في هذه المحادثة*\n\n${body}`,
      mentions: [...new Set(rows.map((r) => r.sender_id).filter(Boolean))],
    }, { quoted: msg });
    return;
  }

  // ===== .محذوفات — سجل الرسائل المحذوفة =====
  if (commandKey === 'محذوفات' || commandKey === 'deleted') {
    const limit = Math.min(parseInt(args[0], 10) || 10, 25);
    const rows = getRecentDeleted(200).filter((r) => r.chat_id === chatId).slice(0, limit);
    if (!rows.length) {
      await sock.sendMessage(chatId, { text: 'ℹ️ لا توجد رسائل محذوفة مسجّلة في هذه المحادثة.' }, { quoted: msg });
      return;
    }
    const body = rows
      .map((r, i) => `*${i + 1}.* @${shortJid(r.sender_id)} — ${when(r.timestamp)}\n🗑️ "${r.text_content || '[وسائط]'}"`)
      .join('\n\n');
    await sock.sendMessage(chatId, {
      text: `🗑️ *آخر ${rows.length} رسالة محذوفة في هذه المحادثة*\n\n${body}`,
      mentions: [...new Set(rows.map((r) => r.sender_id).filter(Boolean))],
    }, { quoted: msg });
  }
};
