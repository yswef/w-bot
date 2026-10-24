// يتحقق من أوامر الترفيه التفاعلية: فصل خيارات "خيّر"، ثبات التقييم/اللقب/الحظ خلال اليوم، وشريط الحظ.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const social = require('../src/commands/social');

test('فصل الخيارات يدعم «،» و«أو» و«او» و«|»', () => {
  assert.deepEqual(social.splitChoices('قهوة، شاي أو عصير'), ['قهوة', 'شاي', 'عصير']);
  assert.deepEqual(social.splitChoices('تفاح او موز'), ['تفاح', 'موز']);
  assert.deepEqual(social.splitChoices('a | b'), ['a', 'b']);
  assert.deepEqual(social.splitChoices('  وحدة  '), ['وحدة']);
  assert.deepEqual(social.splitChoices(''), []);
});

test('البذرة ثابتة لنفس النص ومختلفة لنصوص مختلفة', () => {
  assert.equal(social.hashSeed('967700000001@s.whatsapp.net|2026-10-24|rate'), social.hashSeed('967700000001@s.whatsapp.net|2026-10-24|rate'));
  assert.notEqual(social.hashSeed('a|2026-10-24|rate'), social.hashSeed('b|2026-10-24|rate'));
});

test('شريط الحظ دائماً 10 خانات', () => {
  for (const pct of [0, 1, 50, 99, 100]) {
    assert.equal([...social.luckBar(pct)].length, 10);
  }
  assert.equal(social.luckBar(100), '🟩'.repeat(10));
  assert.equal(social.luckBar(0), '⬜'.repeat(10));
});

test('التاريخ اليومي بصيغة YYYY-MM-DD', () => {
  assert.match(social.todayKey(new Date(2026, 9, 24)), /^2026-10-24$/);
});

test('تعليق الحظ يتدرج حسب النسبة', () => {
  assert.notEqual(social.luckComment(95), social.luckComment(5));
});
