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
  // حدّ الكلمة: لا حرف (\p{L})، ولا رقم (\p{N})، ولا علامة تشكيل متبقية (\p{M}) قبلها أو بعدها
  const re = new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])${escapeRegex(k)}(?![\\p{L}\\p{N}\\p{M}])`, 'u');
  return re.test(t);
}

/** تطبيع للمقارنة التامة: يحذف علامات الترقيم والرموز من الأطراف والداخل ويوحّد المسافات */
function looseNormalize(s) {
  return normalizeArabic(s).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

/** يطابق النص التام (بعد التطبيع)، فيُقبل "هلا!" و"هلا" معاً */
function exactMatch(text, keyword) {
  const k = looseNormalize(keyword);
  if (!k) return false;
  return looseNormalize(text) === k;
}

/**
 * هل ينطبق الرد المخصص على النص؟
 * matchMode 'exact' = الرسالة كاملة تساوي الكلمة، غير ذلك = كلمة مستقلة داخل الرسالة.
 */
function matchesReply(text, item) {
  if (item.match_mode === 'exact') return exactMatch(text, item.keyword);
  return containsKeyword(text, item.keyword);
}

module.exports = { normalizeArabic, containsKeyword, exactMatch, matchesReply };
