// يتحقق من شخصيات الزوجات والشخصيات الكوميدية وصور الذكاء الاصطناعي المحلية:
// الملفات موجودة وصالحة، ولا توجد أسماء مكررة، ولا مسار يخرج من مجلد assets.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'wa-sticker-formatter' || request === 'sharp') {
    return new Proxy(function () {}, { get: () => () => ({}), apply: () => ({}) });
  }
  return origLoad.call(this, request, ...rest);
};
after(() => { Module._load = origLoad; });

const root = path.join(__dirname, '..');
const { characterPools } = require(path.join(root, 'src/commands/fun'));
const { allCharacters, comedyMales, comedyFemales, aiWives, ASSETS_DIR } = characterPools;

test('صور الزوجات المولّدة بالذكاء الاصطناعي موجودة وبصيغة JPEG صالحة وبحجم معقول', () => {
  assert.equal(aiWives.length, 6);
  for (const wife of aiWives) {
    assert.equal(wife.aiGenerated, true, `${wife.name} يجب أن يكون موسوماً بأنه مولّد بالذكاء الاصطناعي`);
    const full = path.join(ASSETS_DIR, wife.localAsset);
    assert.ok(fs.existsSync(full), `الصورة غير موجودة: ${wife.localAsset}`);
    const buf = fs.readFileSync(full);
    assert.deepEqual([...buf.slice(0, 3)], [0xff, 0xd8, 0xff], `ليست JPEG: ${wife.localAsset}`);
    assert.ok(buf.length < 5 * 1024 * 1024, `الصورة أكبر من 5MB: ${wife.localAsset}`);
  }
});

test('الشخصيات الكوميدية موجودة في القائمة الكاملة وبلا أسماء مكررة', () => {
  assert.ok(comedyMales.length >= 2 && comedyFemales.length >= 2);
  for (const c of [...comedyMales, ...comedyFemales]) {
    assert.ok(allCharacters.includes(c), `${c.name} غير موجودة في القائمة الكاملة`);
    assert.equal(c.universe, 'comedy');
    assert.ok(c.searchName && c.quote && c.anime, `بيانات ناقصة: ${c.name}`);
  }
  const names = allCharacters.map((c) => c.name);
  assert.equal(new Set(names).size, names.length, 'توجد أسماء شخصيات مكررة');
});

test('كل شخصية لها اسم بحث (أو صورة محلية) حتى لا يتعطل .شخصية', () => {
  for (const c of allCharacters) {
    assert.ok(c.searchName || c.localAsset || c.image, `شخصية بلا اسم بحث: ${c.name}`);
  }
});

test('أصول الصور لا تسمح بالخروج من مجلد assets (path traversal)', () => {
  for (const wife of aiWives) {
    const resolved = path.resolve(ASSETS_DIR, wife.localAsset);
    assert.ok(resolved.startsWith(ASSETS_DIR + path.sep));
  }
});
