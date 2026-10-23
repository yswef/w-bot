// =============================================
// 🔍 مطابقة الكلمات المفتاحية — كلمات كاملة فقط
// =============================================
// ⚠️ إصلاح: كان الرد على "كم" يعمل داخل "كمامة" لأن المطابقة substring.
// الآن الكلمة المفتاحية تُطابَق ككلمة مستقلة: لا يسبقها ولا يليها حرف أو رقم.

function normalizeArabic(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // التشكيل والتطويل
    .replace(/[\u200c\u200d\u200e\u200f]/g, '') // محارف الاتجاه/الربط المخفية
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * هل يحتوي النص على الكلمة كاملة؟
 * مثال: containsKeyword("كم السعر؟", "كم") = true
 *       containsKeyword("كمامة جديدة", "كم") = false
 */
function containsKeyword(text, keyword) {
  const t = normalizeArabic(text);
  const k = normalizeArabic(keyword);
  if (!t || !k) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(k)}(?![\\p{L}\\p{N}])`, 'u');
  return re.test(t);
}

/** يطابق النص التام (بعد التطبيع) */
function exactMatch(text, keyword) {
  return normalizeArabic(text) === normalizeArabic(keyword);
}

module.exports = { normalizeArabic, containsKeyword, exactMatch };
