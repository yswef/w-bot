// يتحقق من قواعد مطابقة الكلمات في الردود: كلمة كاملة فقط، مع تجاهل التشكيل
// وعلامات الترقيم، ووضع "الرسالة كاملة" للردود الدقيقة.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { containsKeyword, exactMatch, matchesReply } = require('../src/utils/matcher');

test('الكلمة تُطابَق فقط ككلمة مستقلة (لا حروف قبلها أو بعدها)', () => {
  assert.equal(containsKeyword('كم السعر؟', 'كم'), true);
  assert.equal(containsKeyword('كمامة جديدة', 'كم'), false);
  assert.equal(containsKeyword('ماكم', 'كم'), false);
  assert.equal(containsKeyword('أكم', 'كم'), false);
});

test('علامات الترقيم والرموز والمسافات تُعد حدوداً للكلمة', () => {
  assert.equal(containsKeyword('كم كم؟', 'كم'), true);
  assert.equal(containsKeyword('يا كم، ليش', 'كم'), true);
  assert.equal(containsKeyword('كم😀', 'كم'), true);
  assert.equal(containsKeyword('كم-ساعة', 'كم'), true);
});

test('الأرقام تُعد جزءاً من الكلمة فلا تُطابَق معها', () => {
  assert.equal(containsKeyword('٣كم', 'كم'), false);
  assert.equal(containsKeyword('كم٣', 'كم'), false);
});

test('التشكيل وتنوع الهمزة لا يمنعان المطابقة', () => {
  assert.equal(containsKeyword('كَمّ', 'كم'), true);
  assert.equal(containsKeyword('اكرام الضيف', 'إكرام'), true);
  assert.equal(containsKeyword('إكرامي', 'إكرام'), false);
});

test('وضع "الرسالة كاملة" يقبل الكلمة وحدها فقط (مع تجاهل الترقيم الطرفي)', () => {
  assert.equal(exactMatch('هلا!', 'هلا'), true);
  assert.equal(exactMatch('  هلا  ', 'هلا'), true);
  assert.equal(exactMatch('هلا والله', 'هلا'), false);
  assert.equal(exactMatch('', 'هلا'), false);
  assert.equal(exactMatch('x', ''), false);
});

test('matchesReply يختار الوضع حسب match_mode (والافتراضي كلمة مستقلة)', () => {
  assert.equal(matchesReply('كم السعر', { keyword: 'كم', match_mode: 'word' }), true);
  assert.equal(matchesReply('كم السعر', { keyword: 'كم', match_mode: 'exact' }), false);
  assert.equal(matchesReply('كم', { keyword: 'كم', match_mode: 'exact' }), true);
  assert.equal(matchesReply('كم السعر', { keyword: 'كم' }), true);
});
