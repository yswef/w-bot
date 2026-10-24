// =============================================
// 🛡️ الصلاحيات — مقارنة دقيقة للأرقام
// =============================================
// ⚠️ إصلاح: كانت الصلاحيات تُفحص بـ digits.includes(owner)، فيعتبر أي رقم
// يحتوي على رقم المالك (مثلاً 9677846093 أو 1967784609423) مالكاً أو أدمناً.
// الآن نستخرج جزء المستخدم من الـ JID (قبل @ وقبل : الخاص بالجهاز) ونقارنه
// بالتطابق التام فقط.

const config = require('../config');
const { isStoredAdmin } = require('../database/db');

/** يعيد رقم المستخدم فقط من أي JID، مثل 967784609423:12@s.whatsapp.net -> 967784609423 */
function jidUser(jid) {
  const raw = String(jid || '');
  const user = raw.split('@')[0].split(':')[0];
  return user.replace(/\D/g, '');
}

function isOwnerJid(jid) {
  const u = jidUser(jid);
  return !!u && config.ownerNumbers.includes(u);
}

// المشرف = مالك، أو الأدمن الثاني من .env، أو مشرف أُضيف من لوحة التحكم
function isAdminJid(jid) {
  const u = jidUser(jid);
  if (!u) return false;
  if (config.adminNumbers.includes(u)) return true;
  try {
    return isStoredAdmin(u);
  } catch {
    return false;
  }
}

// الأشخاص الذين لا يُكشف حذفهم ولا تُنشر رسائلهم المحذوفة: المالك والمشرفون والمطوّر
function isProtectedJid(jid) {
  if (isAdminJid(jid)) return true;
  const u = jidUser(jid);
  return !!u && u === jidUser(config.developerContact);
}

/** يحوّل رقم مُدخل (بأي صيغة) إلى رقم نظيف، أو null إذا كان غير صالح */
function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 20 ? digits : null;
}

module.exports = { jidUser, isOwnerJid, isAdminJid, isProtectedJid, normalizePhone };
