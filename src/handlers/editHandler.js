// =============================================
// ✏️ معالج الرسائل المعدَّلة (Edited Messages / Anti-Edit)
// =============================================
// خلفية المشكلة التي يحلها هذا الملف:
// واتساب يرسل تعديل الرسالة بأكثر من شكل حسب إصدار Baileys والجهاز المُرسِل:
//   1) داخل حدث messages.upsert برسالة تحتوي protocolMessage.type === 14
//      (MESSAGE_EDIT) والمحتوى الجديد في protocolMessage.editedMessage.
//   2) داخل حدث messages.update بحقل update.message.editedMessage أو
//      update.message.protocolMessage.editedMessage (بدون أي upsert).
// الكود القديم كان يتعامل مع الحالة الأولى فقط، ويطبع "لقد قلت سابقاً" بالنص
// القديم دون إظهار النص الجديد إطلاقاً، ولم يكن يحفظ التعديل في أي مكان،
// كما كان يتجاهل تعديلات رقم البوت نفسه (fromMe) لأنها تُلتقط قبل الفحص.
// هذا الملف يوحّد الحالتين، يعرض "قبل/بعد"، ويحفظ السجل في قاعدة البيانات.

const {
  getMessage,
  recordMessageEdit,
  getChatSettings,
  saveMessage,
} = require('../database/db');
const logger = require('../utils/logger');

// حماية من التكرار: نفس التعديل قد يصل عبر upsert و update معاً
const recentlyReported = new Map(); // key -> timestamp
const DUPLICATE_WINDOW_MS = 60 * 1000;

function alreadyReported(messageId, newText) {
  const key = `${messageId}::${newText || ''}`;
  const now = Date.now();
  // تنظيف المفاتيح القديمة حتى لا تكبر الذاكرة بلا حدود
  for (const [k, t] of recentlyReported) {
    if (now - t > DUPLICATE_WINDOW_MS) recentlyReported.delete(k);
  }
  if (recentlyReported.has(key)) return true;
  recentlyReported.set(key, now);
  return false;
}

// استخراج النص من أي شكل رسالة (بما فيها الرسائل الملفوفة)
function extractText(message) {
  if (!message) return '';
  const inner =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.documentWithCaptionMessage?.message ||
    message;

  return (
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    ''
  );
}

/**
 * يحاول استخراج تفاصيل التعديل من أي شكل من أشكال الحدث.
 * يرجع { originalId, newText } أو null إذا لم تكن رسالة تعديل.
 */
function parseEdit(message) {
  if (!message) return null;

  const protocol =
    message.protocolMessage ||
    message.ephemeralMessage?.message?.protocolMessage ||
    null;

  // النوع 14 = MESSAGE_EDIT في بروتوكول واتساب
  if (protocol && (protocol.type === 14 || protocol.type === 'MESSAGE_EDIT')) {
    return {
      originalId: protocol.key?.id || null,
      newText: extractText(protocol.editedMessage),
    };
  }

  // بعض الإصدارات ترسل editedMessage مباشرة
  if (message.editedMessage) {
    const edited = message.editedMessage.message || message.editedMessage;
    const innerProtocol = edited?.protocolMessage;
    if (innerProtocol) {
      return {
        originalId: innerProtocol.key?.id || null,
        newText: extractText(innerProtocol.editedMessage),
      };
    }
    return { originalId: null, newText: extractText(edited) };
  }

  return null;
}

function shortName(jid) {
  return (jid || '').split('@')[0] || 'مجهول';
}

/**
 * المعالج الموحّد لأي تعديل رسالة.
 * @param {object} p
 * @param {object} p.sock     - سوكيت Baileys
 * @param {string} p.chatId   - معرّف المحادثة
 * @param {string} p.editorId - معرّف من قام بالتعديل
 * @param {string} p.editorName - اسم من قام بالتعديل (pushName)
 * @param {string} p.originalId - معرّف الرسالة الأصلية
 * @param {string} p.newText  - النص بعد التعديل
 * @param {object} [p.quoted] - الرسالة التي نرد عليها (اختياري)
 * @param {boolean} [p.fromMe] - هل التعديل صادر من رقم البوت نفسه
 */
async function reportEdit({ sock, chatId, editorId, editorName, originalId, newText, quoted, fromMe }) {
  if (!originalId) return false;
  if (alreadyReported(originalId, newText)) return false;

  const settings = getChatSettings(chatId);
  // الميزة مفعّلة افتراضياً، وتُطفأ لكل محادثة بأمر: .ضد_التعديل ايقاف
  if (settings.anti_edit === 0) {
    // ما زلنا نحفظ التعديل في قاعدة البيانات حتى يظهر في لوحة التحكم
    const stored = getMessage(originalId);
    recordMessageEdit({
      messageId: originalId,
      chatId,
      senderId: editorId,
      senderName: editorName || shortName(editorId),
      oldText: stored?.text_content || null,
      newText,
    });
    return false;
  }

  const stored = getMessage(originalId);
  const oldText = stored?.text_content || null;

  // إذا لم يتغير النص فعلياً لا داعي لإزعاج المجموعة
  if (oldText !== null && oldText === newText) return false;

  // إذا لم تكن الرسالة الأصلية محفوظة عندنا (وصلت قبل تشغيل البوت) نحفظها الآن
  // كي تعمل التعديلات اللاحقة عليها بشكل صحيح.
  if (!stored) {
    try {
      saveMessage({
        id: originalId,
        chat_id: chatId,
        sender_id: editorId || chatId,
        sender_name: editorName || shortName(editorId),
        message_type: 'conversation',
        text_content: newText,
        media_path: null,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.warn('تعذر حفظ الرسالة الأصلية للتعديل: ' + err.message);
    }
  }

  recordMessageEdit({
    messageId: originalId,
    chatId,
    senderId: editorId,
    senderName: editorName || shortName(editorId),
    oldText,
    newText,
  });

  const who = fromMe ? 'أنت' : `@${shortName(editorId)}`;
  const lines = [
    '✏️ *تم تعديل رسالة!*',
    '',
    `👤 المُعدِّل: ${who}`,
    '',
    `📝 *قبل التعديل:*\n${oldText ? `"${oldText}"` : '_(غير محفوظة لدى أستا — وصلت قبل تشغيل البوت)_'}`,
    '',
    `✨ *بعد التعديل:*\n${newText ? `"${newText}"` : '_(بدون نص)_'}`,
    '',
    '⚔️ أستا لا ينسى ولا يتراجع!',
  ];

  const mentions = !fromMe && editorId ? [editorId] : [];

  try {
    await sock.sendMessage(chatId, { text: lines.join('\n'), mentions }, quoted ? { quoted } : undefined);
  } catch (err) {
    logger.warn('تعذر إرسال تنبيه التعديل: ' + err.message);
    return false;
  }

  logger.info(`✏️ تم رصد تعديل رسالة من ${editorName || shortName(editorId)} في ${chatId}`);
  return true;
}

/**
 * يتعامل مع التعديلات القادمة عبر messages.upsert.
 * يرجع true إذا كانت الرسالة رسالة تعديل وتمت معالجتها.
 */
async function handleEditFromUpsert(msg, sock) {
  const edit = parseEdit(msg.message);
  if (!edit) return false;

  const chatId = msg.key.remoteJid;
  const editorId = msg.key.fromMe
    ? (sock.user?.id ? `${sock.user.id.split(':')[0].split('@')[0]}@s.whatsapp.net` : chatId)
    : (msg.key.participant || msg.key.remoteJid);

  await reportEdit({
    sock,
    chatId,
    editorId,
    editorName: msg.pushName,
    originalId: edit.originalId,
    newText: edit.newText,
    quoted: msg,
    fromMe: !!msg.key.fromMe,
  });

  return true;
}

/**
 * يتعامل مع التعديلات القادمة عبر messages.update.
 * يرجع true إذا كان التحديث تعديل رسالة وتمت معالجته.
 */
async function handleEditFromUpdate(update, sock) {
  const message = update?.update?.message || update?.message;
  const edit = parseEdit(message);
  if (!edit) return false;

  const chatId = update.key?.remoteJid;
  if (!chatId) return false;

  // في التحديثات لا يصلنا معرّف الرسالة الأصلية أحياناً، فنستخدم مفتاح التحديث نفسه
  const originalId = edit.originalId || update.key?.id;
  const stored = originalId ? getMessage(originalId) : null;
  const editorId = update.key?.participant || stored?.sender_id || chatId;

  await reportEdit({
    sock,
    chatId,
    editorId,
    editorName: stored?.sender_name,
    originalId,
    newText: edit.newText,
    fromMe: !!update.key?.fromMe,
  });

  return true;
}

module.exports = {
  handleEditFromUpsert,
  handleEditFromUpdate,
  parseEdit,
  extractText,
};
