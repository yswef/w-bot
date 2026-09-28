// يضمن أن قائمة المساعدة (registry.js) تبقى مطابقة للأوامر المسجّلة فعلياً
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const registry = require('../src/commands/registry');

function registeredKeys() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'handlers', 'commandHandler.js'), 'utf8');
  const block = src.slice(src.indexOf('const commands = {'), src.indexOf('function isOwnerId'));
  return new Set([...block.matchAll(/^\s*'?([^':\s,]+)'?:\s*require/gm)].map((m) => m[1]));
}

test('كل أمر في سجل المساعدة مسجَّل فعلياً في commandHandler', () => {
  const keys = registeredKeys();
  const missing = [];
  for (const cmd of registry.COMMANDS) {
    for (const name of [cmd.name, ...(cmd.aliases || [])]) {
      if (!keys.has(name)) missing.push(name);
    }
  }
  assert.deepEqual(missing, [], 'أوامر موثّقة لكنها غير مسجّلة: ' + missing.join(', '));
});

test('كل أمر مسجَّل موثَّق في سجل المساعدة (لا أوامر مخفية)', () => {
  const names = new Set(registry.allNames());
  const extra = [...registeredKeys()].filter((k) => !names.has(k));
  assert.deepEqual(extra, [], 'أوامر مسجّلة لكنها غير موثّقة: ' + extra.join(', '));
});

test('كل أمر ينتمي لفئة معروفة وله وصف بالعربية والإنجليزية', () => {
  for (const cmd of registry.COMMANDS) {
    assert.ok(registry.CATEGORIES[cmd.cat], `فئة غير معروفة للأمر ${cmd.name}: ${cmd.cat}`);
    assert.ok(cmd.ar && cmd.ar.length > 3, `وصف عربي ناقص للأمر ${cmd.name}`);
    assert.ok(cmd.en && cmd.en.length > 3, `وصف إنجليزي ناقص للأمر ${cmd.name}`);
    assert.ok(['all', 'admin', 'owner'].includes(cmd.role), `صلاحية غير صحيحة للأمر ${cmd.name}`);
  }
});

test('لا توجد أسماء أوامر مكررة', () => {
  const all = registry.allNames();
  const dupes = all.filter((n, i) => all.indexOf(n) !== i);
  assert.deepEqual(dupes, [], 'أسماء مكررة: ' + dupes.join(', '));
});

test('اقتراح الأمر الصحيح يعمل مع الأخطاء الإملائية', () => {
  assert.equal(registry.suggestCommand('انمى'), 'انمي');
  assert.equal(registry.suggestCommand('مساعده'), 'مساعدة');
  assert.equal(registry.suggestCommand('stiker'), 'sticker');
  assert.equal(registry.suggestCommand('zzzqqqxxx'), null);
});

test('كل فئة لها أوامر ويمكن استخراجها من كلمتها المفتاحية', () => {
  for (const cat of Object.values(registry.CATEGORIES)) {
    assert.ok(registry.byCategory(cat.key).length > 0, `فئة فارغة: ${cat.key}`);
    assert.equal(registry.resolveCategory(cat.slug), cat.key, `تعذر استخراج الفئة من: ${cat.slug}`);
    assert.ok(registry.renderCategory(cat.key, '.'), `تعذر عرض الفئة: ${cat.key}`);
  }
});
