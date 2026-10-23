// =============================================
// 📦 استخراج المحتوى من الرسالة — يفك الأغلفة (ephemeral / viewOnce ...)
// =============================================
// ⚠️ إصلاح: المجموعات التي فيها رسائل مؤقتة تلف كل رسالة داخل ephemeralMessage،
// فكان النص يُحفظ فارغاً، وبالتالي تظهر "قبل التعديل" غير محفوظة، وتفشل الردود.

const { normalizeMessageContent } = require('@whiskeysockets/baileys');

const NON_CONTENT_KEYS = new Set(['messageContextInfo', 'senderKeyDistributionMessage', 'deviceSentMessage']);

function unwrap(message) {
  if (!message) return null;
  try {
    return normalizeMessageContent(message) || message;
  } catch {
    return message;
  }
}

function extractText(message) {
  const m = unwrap(message);
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  );
}

/** اسم نوع المحتوى الحقيقي (مثل imageMessage) بعد فك الأغلفة */
function getRealMessageType(message) {
  const m = unwrap(message);
  if (!m) return undefined;
  return Object.keys(m).find((k) => !NON_CONTENT_KEYS.has(k));
}

module.exports = { unwrap, extractText, getRealMessageType };
