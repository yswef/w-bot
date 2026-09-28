// =============================================
// 🗑️ معالج الرسائل المحذوفة (Anti-Delete) + توجيه التعديلات
// =============================================
// واتساب يبلّغ عن "حذف لدى الجميع" بطريقتين حسب الجهاز/الإصدار:
//   1) messages.update مع update.message = null (أو messageStubType = 1).
//   2) messages.upsert برسالة تحتوي protocolMessage.type === 0 (REVOKE)
//      ومفتاح الرسالة المحذوفة داخل protocolMessage.key.
// كان الملف القديم يعالج الحالة الأولى فقط، فكانت بعض عمليات الحذف تمرّ
// بصمت. الآن الحالتان مدعومتان.

const fs = require('fs');
const { getMessage, markDeleted } = require('../database/db');
const { handleEditFromUpdate } = require('./editHandler');
const logger = require('../utils/logger');

// منع تكرار الإبلاغ عن نفس الحذف إذا وصل عبر القناتين معاً
const reportedDeletions = new Set();

function markReported(id) {
  if (reportedDeletions.has(id)) return false;
  reportedDeletions.add(id);
  // تنظيف بسيط حتى لا تكبر المجموعة بلا حدود
  if (reportedDeletions.size > 2000) {
    const first = reportedDeletions.values().next().value;
    reportedDeletions.delete(first);
  }
  return true;
}

/**
 * يعيد إرسال نسخة الرسالة المحذوفة المحفوظة عندنا.
 * @returns {boolean} true إذا تم الإبلاغ فعلاً
 */
async function announceDeletion(sock, chatId, messageId) {
  if (!messageId || !chatId) return false;

  const original = getMessage(messageId);
  if (!original) return false; // ما عندنا نسخة محفوظة، تجاهل
  if (original.is_deleted === 1) return false; // أبلغنا عنها سابقاً
  if (!markReported(messageId)) return false;

  markDeleted(messageId);

  const when = new Date(original.timestamp || Date.now()).toLocaleString('ar-EG');
  const notice =
    `🗑️ *رسالة محذوفة!*\n\n` +
    `👤 المُرسِل: @${(original.sender_id || '').split('@')[0]}\n` +
    `🕒 وقت الإرسال: ${when}\n\n` +
    `📝 المحتوى:\n${original.text_content || '_(وسائط مرفقة بالأسفل)_'}\n\n` +
    `⚔️ أستا لا ينسى ولا يتراجع!`;

  await sock.sendMessage(chatId, {
    text: notice,
    mentions: original.sender_id ? [original.sender_id] : [],
  });

  // لو فيه ملف وسائط محفوظ، نعيد إرساله كمان
  if (original.media_path && fs.existsSync(original.media_path)) {
    try {
      const type = (original.message_type || '').replace('Message', '');
      const buffer = fs.readFileSync(original.media_path);
      if (type === 'image') await sock.sendMessage(chatId, { image: buffer, caption: '🗑️ صورة محذوفة' });
      else if (type === 'video') await sock.sendMessage(chatId, { video: buffer, caption: '🗑️ فيديو محذوف' });
      else if (type === 'audio') await sock.sendMessage(chatId, { audio: buffer, mimetype: 'audio/mp4' });
      else if (type === 'sticker') await sock.sendMessage(chatId, { sticker: buffer });
    } catch (err) {
      logger.warn('تعذر إعادة إرسال وسائط الرسالة المحذوفة: ' + err.message);
    }
  }

  logger.info(`🗑️ تم اكتشاف حذف رسالة وإعادة إرسالها من ${original.sender_name}`);
  return true;
}

/**
 * يلتقط حذف الرسائل الوارد داخل messages.upsert (protocolMessage type 0 = REVOKE).
 * @returns {boolean} true إذا كانت الرسالة إشعار حذف (فيجب تخطي باقي المعالجة)
 */
async function handleRevokeFromUpsert(msg, sock) {
  const protocol = msg.message?.protocolMessage;
  if (!protocol) return false;
  const isRevoke = protocol.type === 0 || protocol.type === 'REVOKE';
  if (!isRevoke) return false;

  const chatId = msg.key?.remoteJid;
  const targetId = protocol.key?.id;
  try {
    await announceDeletion(sock, chatId, targetId);
  } catch (err) {
    logger.error('خطأ في معالج كشف الحذف (upsert): ' + err.message);
  }
  return true;
}

/**
 * معالج حدث messages.update: يغطي التعديلات والحذف معاً.
 */
async function handleMessageUpdates(updates, sock) {
  for (const update of updates) {
    try {
      // ✏️ التعديلات أولاً (بعض الأجهزة ترسل التعديل عبر update فقط)
      if (await handleEditFromUpdate(update, sock)) continue;

      const { key, update: upd } = update;
      const isRevoke =
        upd?.message === null ||
        upd?.messageStubType === 1 ||
        upd?.message?.protocolMessage?.type === 0;

      if (!isRevoke) continue;

      await announceDeletion(sock, key?.remoteJid, key?.id);
    } catch (err) {
      logger.error('خطأ في معالج كشف الحذف: ' + err.message);
    }
  }
}

module.exports = handleMessageUpdates;
module.exports.handleRevokeFromUpsert = handleRevokeFromUpsert;
module.exports.announceDeletion = announceDeletion;
