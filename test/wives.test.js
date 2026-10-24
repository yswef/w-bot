const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

// sharp غير مثبت في بيئة الاختبار: نستبدل وحدة الملصقات بوهمية
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'wa-sticker-formatter' || request === 'sharp') {
    return new Proxy(function () {}, { get: () => () => ({}), apply: () => ({}) });
  }
  return origLoad.call(this, request, ...rest);
};
after(() => { Module._load = origLoad; });

const root = path.join(__dirname, '..');
const imageUpload = require(path.join(root, 'src/utils/imageUpload'));
const db = require(path.join(root, 'src/database/db'));

// صورة PNG صالحة 1×1
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('يقبل PNG صالحاً ويرفض ملفات نصية مُسمّاة صورة', () => {
  const ok = imageUpload.parseImageDataUrl(PNG_1PX);
  assert.equal(ok.ext, 'png');
  assert.ok(ok.buffer.length > 0);

  const fake = 'data:image/png;base64,' + Buffer.from('<html>not an image</html>').toString('base64');
  assert.throws(() => imageUpload.parseImageDataUrl(fake), /ليس صورة صالحة/);
  assert.throws(() => imageUpload.parseImageDataUrl('data:text/html;base64,PGgxPg=='), /غير مدعومة/);
  assert.throws(() => imageUpload.parseImageDataUrl(undefined), /غير مدعومة/);
});

test('أسماء الملفات تُولَّد على الخادم ولا تقبل مسارات', () => {
  const name = imageUpload.saveUpload(imageUpload.parseImageDataUrl(PNG_1PX));
  assert.match(name, /^[0-9a-f]{24}\.png$/);
  assert.ok(imageUpload.readUpload(name));
  assert.equal(imageUpload.uploadFilePath('../bot.db'), null);
  assert.equal(imageUpload.uploadFilePath('sub/x.png'), null);
  imageUpload.removeUpload(name);
  assert.equal(imageUpload.readUpload(name), null);
});

test('واجهة الصور: رفع ثم عرض ثم حذف', async () => {
  const handle = require(path.join(root, 'src/web/extraApi'));
  const readBody = async (req) => req._body || {};
  const call = async (method, p, body) => {
    const url = new URL('http://x' + p);
    let out = null;
    let status = 200;
    const json = (_res, data, st = 200) => { out = data; status = st; };
    const res = {
      writeHead(code, headers) { status = code; this.headers = headers; },
      end(buf) { out = buf; },
    };
    const handled = await handle({ method, _body: body }, res, url, url.pathname, { json, readBody });
    return { handled, status, out, headers: res.headers };
  };

  const created = await call('POST', '/api/wives', { kind: 'female', name: 'اختبار', note: 'ملاحظة', dataUrl: PNG_1PX });
  assert.equal(created.status, 200);
  const id = created.out.id;

  const list = await call('GET', '/api/wives');
  const item = list.out.find((w) => w.id === id);
  assert.ok(item, 'الصورة المرفوعة تظهر في القائمة');
  assert.equal(item.file_name, undefined, 'اسم الملف الداخلي لا يُعرض');

  const img = await call('GET', `/api/wives/image?id=${id}`);
  assert.equal(img.headers['Content-Type'], 'image/png');
  assert.ok(Buffer.isBuffer(img.out));

  const bad = await call('POST', '/api/wives', { kind: 'other', name: 'x', dataUrl: PNG_1PX });
  assert.equal(bad.status, 400);

  await call('DELETE', `/api/wives?id=${id}`);
  assert.equal(db.getWifeUpload(id), null);
});

test('.زوجة يرسل الصورة المرفوعة من المالك', async () => {
  const fun = require(path.join(root, 'src/commands/fun'));
  const id = db.addWifeUpload({ kind: 'female', name: 'صورة المالك', fileName: imageUpload.saveUpload(imageUpload.parseImageDataUrl(PNG_1PX)) });
  const sent = [];
  const sock = { sendMessage: async (jid, content) => { sent.push({ jid, content }); return {}; } };
  const realRandom = Math.random;
  Math.random = () => 0.999999; // اختيار العنصر الأخير = الصورة المرفوعة
  try {
    await fun({ sock, msg: {}, args: [], chatId: 'g@g.us', senderId: 'u@s.whatsapp.net', commandKey: 'زوجة' });
  } finally {
    Math.random = realRandom;
    const row = db.getWifeUpload(id);
    imageUpload.removeUpload(row.file_name);
    db.deleteWifeUpload(id);
  }
  assert.equal(sent.length, 1);
  assert.ok(Buffer.isBuffer(sent[0].content.image));
  assert.match(sent[0].content.caption, /صورة المالك/);
});
