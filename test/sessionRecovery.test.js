// يتحقق من سلوك الجلسات عند الانقطاع: إعادة الاتصال التلقائية، والتعافي من
// "تسجيل الخروج" (loggedOut) بحذف الجلسة وطباعة رمز QR جديد، ومنع التشغيل المكرر.
//
// نستبدل baileys وقاعدة البيانات بنسخ وهمية حتى يعمل الاختبار بلا شبكة ولا sqlite مبنية.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let depsMissing = null;
for (const dep of ['pino', 'node-cron']) {
  try {
    require.resolve(dep);
  } catch {
    depsMissing = `الاعتمادية ${dep} غير مثبتة — نفّذ npm install`;
  }
}
const skip = depsMissing || false;

process.env.LOG_LEVEL = 'silent';
process.env.AUTO_RESET_ON_LOGOUT = 'true';
process.env.AUTO_RESET_COOLDOWN_MS = '1000';
process.env.AUTO_RESET_MAX_ATTEMPTS = '3';
const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'asta-sessions-'));
process.env.SESSION_BASE_DIR = tmpBase;

function stubModule(requestPath, exports) {
  const resolved = require.resolve(requestPath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports, children: [], paths: [] };
  return exports;
}

// قاعدة بيانات وهمية
stubModule(
  '../src/database/db',
  new Proxy(
    { getGlobalSetting: () => '0', setGlobalSetting: () => {} },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return undefined;
        return () => [];
      },
    }
  )
);

// أوامر الترفيه (تُستدعى عند الاتصال) — نسخة فارغة
stubModule('../src/commands/fun', { warmupCharacterImages: async () => {} });

// معالجا الرسائل — نسخ فارغة حتى لا نُحمّل سلسلة الأوامر (ملصقات/sharp) في الاختبار
stubModule('../src/handlers/messageHandler', () => {});
stubModule('../src/handlers/deleteHandler', () => {});

// ── baileys وهمية ────────────────────────────────────────────────────
class FakeEv {
  constructor() {
    this.handlers = new Map();
  }
  on(name, cb) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(cb);
    return this;
  }
  emit(name, data) {
    for (const cb of this.handlers.get(name) || []) cb(data);
  }
}

const sockets = [];
function makeFakeSocket() {
  const sock = {
    ev: new FakeEv(),
    user: { id: '967700000000@s.whatsapp.net' },
    closedIntentionally: false,
    sendMessage: async () => ({}),
    end() {
      sock.ended = true;
    },
  };
  sock.ws = {
    close() {
      sock.closedIntentionally = true;
      // محاكاة ما تفعله baileys: إغلاق الاتصال يُطلق حدث انقطاع
      setTimeout(() => sock.ev.emit('connection.update', { connection: 'close', lastDisconnect: null }), 5);
    },
  };
  sockets.push(sock);
  return sock;
}

stubModule('@whiskeysockets/baileys', {
  default: makeFakeSocket,
  useMultiFileAuthState: async () => ({ state: { creds: {}, keys: {} }, saveCreds: () => {} }),
  DisconnectReason: { loggedOut: 401, connectionClosed: 420, timedOut: 408 },
  fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 1] }),
});

const sessionManager = require('../src/sessionManager');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function lastSocket() {
  return sockets[sockets.length - 1];
}

test(
  'الانقطاع العادي يعيد الاتصال تلقائياً بدون حذف الجلسة',
  { skip },
  async () => {
    sockets.length = 0;
    const name = 'normal';
    const dir = path.join(tmpBase, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'creds.json'), '{"keep":true}');

    await sessionManager.startBot(name);
    assert.equal(sockets.length, 1);

    // انقطاع عادي (420) ← إعادة اتصال بعد 3 ثوانٍ
    lastSocket().ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 420 } } },
    });

    const status = sessionManager.getSessionsStatus().find((s) => s.name === name);
    assert.equal(status.connection, 'close');
    assert.equal(status.lastDisconnect.willReconnect, true);

    await sleep(3600);
    assert.equal(sockets.length, 2, 'كانت يجب أن تُنشأ جلسة جديدة تلقائياً');
    assert.ok(fs.existsSync(path.join(dir, 'creds.json')), 'الانقطاع العادي يجب ألا يحذف بيانات الجلسة');
  }
);

test(
  'تسجيل الخروج (loggedOut) يحذف الجلسة ويعيد الربط برمز QR جديد',
  { skip },
  async () => {
    sockets.length = 0;
    const name = 'loggedout';
    const dir = path.join(tmpBase, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'creds.json'), '{"dead":true}');
    fs.writeFileSync(path.join(dir, 'pre-key-1.json'), '{}');

    await sessionManager.startBot(name);
    const first = lastSocket();

    first.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 401 } } },
    });

    const status = sessionManager.getSessionsStatus().find((s) => s.name === name);
    assert.equal(status.connection, 'loggedout');
    assert.equal(status.needsRelink, true);

    // بعد مهلة إعادة الضبط (1 ثانية هنا) تُحذف الجلسة الميتة وتبدأ جلسة جديدة
    await sleep(2500);
    assert.ok(first.closedIntentionally, 'الجلسة القديمة يجب أن تُغلق');
    assert.equal(sockets.length, 2, 'يجب أن تبدأ جلسة جديدة برمز QR جديد');
    assert.ok(!fs.existsSync(path.join(dir, 'pre-key-1.json')), 'بيانات الجلسة الميتة يجب أن تُحذف');

    // رمز QR الجديد يصل إلى الحالة (لتعرضه اللوحة والطرفية)
    lastSocket().ev.emit('connection.update', { connection: 'connecting', qr: '2@NEWQR' });
    const after = sessionManager.getSessionsStatus().find((s) => s.name === name);
    assert.equal(after.connection, 'qr');
    assert.equal(after.qr, '2@NEWQR');
  }
);

test(
  'التشغيل المكرر لنفس الجلسة يُتجاهل (حتى لا يطرد واتساب إحدى النسختين)',
  { skip },
  async () => {
    sockets.length = 0;
    const name = 'dup';
    await Promise.all([sessionManager.startBot(name), sessionManager.startBot(name), sessionManager.startBot(name)]);
    assert.equal(sockets.length, 1, 'يجب ألا تُنشأ أكثر من جلسة واحدة');
  }
);

test(
  'resetSession تلغي إعادة الاتصال المعلّقة فلا تتكرر الجلسة',
  { skip },
  async () => {
    sockets.length = 0;
    const name = 'manual';
    await sessionManager.startBot(name);

    // انقطاع عادي ← جدولة إعادة اتصال بعد 3 ثوانٍ
    lastSocket().ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 420 } } },
    });

    // لكن المستخدم أعاد الربط يدوياً قبلها ← يجب إلغاء المؤقّت القديم
    await sessionManager.resetSession(name);
    assert.equal(sockets.length, 2);

    await sleep(3600);
    assert.equal(sockets.length, 2, 'المؤقّت القديم يجب أن يُلغى فلا تُنشأ جلسة ثالثة');
  }
);

test(
  'recoveryInstructions تعرض أوامر طرفية صحيحة بمسار الجلسة الفعلي',
  { skip },
  () => {
    const info = sessionManager.recoveryInstructions('default');
    assert.equal(info.sessionName, 'default');
    assert.equal(info.sessionDir, path.join(tmpBase, 'default'));
    assert.deepEqual(info.commands, [
      'npm run reconnect -- default',
      `rm -rf "${path.join(tmpBase, 'default')}" && npm start`,
    ]);
  }
);

test(
  'أسماء الجلسات تُنظَّف ولا تخرج عن المجلد المخصص',
  { skip },
  () => {
    // محاولة الخروج من المجلد (path traversal) تبقى اسماً داخل مجلد الجلسات
    const escaped = sessionManager.getSessionPath('../../etc/passwd');
    assert.ok(escaped.startsWith(tmpBase), `المسار خرج عن المجلد المخصص: ${escaped}`);
    assert.equal(sessionManager.getSessionPath('a/b'), path.join(tmpBase, 'a-b'));
    assert.equal(sessionManager.getSessionPath('  default  '), path.join(tmpBase, 'default'));
  }
);

test('تنظيف المجلد المؤقت', { skip }, () => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
  assert.ok(true);
});
