// يتحقق من ميزات الجلسات الجديدة: ربط برقم الهاتف (كود 8 أحرف)، وإضافة/حذف جلسات متعددة،
// ودمج جلسات .env مع الجلسات المحفوظة في القاعدة، ومنع حذف الجلسة الأساسية.
//
// baileys وقاعدة البيانات تُستبدلان بنسخ وهمية: لا شبكة واتساب هنا.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.LOG_LEVEL = 'silent';
process.env.PAIRING_REQUEST_DELAY_MS = '10';
process.env.AUTO_RESET_ON_LOGOUT = 'false';
const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'asta-pair-'));
process.env.SESSION_BASE_DIR = tmpBase;

let depsMissing = null;
for (const dep of ['pino', 'node-cron']) {
  try { require.resolve(dep); } catch { depsMissing = `الاعتمادية ${dep} غير مثبتة — نفّذ npm install`; }
}
const skip = depsMissing || false;

function stubModule(requestPath, exports) {
  const resolved = require.resolve(requestPath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports, children: [], paths: [] };
}

// قاعدة بيانات وهمية: جدول الجلسات الإضافية في الذاكرة
const waRows = new Map();
const dbCalls = { upsert: [], deactivate: [] };
stubModule('../src/database/db', new Proxy(
  {
    getGlobalSetting: () => '0',
    setGlobalSetting: () => {},
    listWaSessions: () => [...waRows.values()].filter((r) => r.active !== 0),
    upsertWaSession: (row) => {
      dbCalls.upsert.push(row);
      // نفس أسماء أعمدة جدول wa_sessions الحقيقي
      waRows.set(row.name, { name: row.name, active: 1, login_method: row.loginMethod, phone: row.phone });
    },
    deactivateWaSession: (name) => {
      dbCalls.deactivate.push(name);
      const r = waRows.get(name);
      if (r) r.active = 0;
    },
  },
  { get(target, prop) { if (prop in target) return target[prop]; if (typeof prop === 'symbol') return undefined; return () => []; } }
));
stubModule('../src/commands/fun', { warmupCharacterImages: async () => {} });
stubModule('../src/handlers/messageHandler', () => {});
stubModule('../src/handlers/deleteHandler', () => {});

// baileys وهمية مع requestPairingCode
class FakeEv {
  constructor() { this.handlers = new Map(); }
  on(name, cb) { if (!this.handlers.has(name)) this.handlers.set(name, []); this.handlers.get(name).push(cb); return this; }
  emit(name, data) { for (const cb of this.handlers.get(name) || []) cb(data); }
}
const sockets = [];
const pairingRequests = [];
function makeFakeSocket() {
  const sock = {
    ev: new FakeEv(),
    user: null,
    sendMessage: async () => ({}),
    end() { sock.ended = true; },
    async requestPairingCode(phone) {
      pairingRequests.push(phone);
      return 'abcd2345'; // كود 8 أحرف بصيغة واتساب (بدون شرطة، بحروف صغيرة أحياناً)
    },
  };
  sockets.push(sock);
  return sock;
}
stubModule('@whiskeysockets/baileys', {
  default: makeFakeSocket,
  useMultiFileAuthState: async () => ({ state: { creds: { registered: false } }, saveCreds: () => {} }),
  DisconnectReason: { loggedOut: 401, connectionClosed: 420, timedOut: 408 },
  fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 1] }),
});

const sessionManager = require('../src/sessionManager');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('الربط برقم الهاتف يطلب كود 8 أحرف ويعرضه بصيغة XXXX-XXXX', { skip }, async () => {
  pairingRequests.length = 0;
  const created = sessionManager.addSession({ name: 'pairA', phone: '967771234567' });
  assert.deepEqual(created, { name: 'pairA', method: 'pairing' });
  assert.equal(dbCalls.upsert.at(-1).loginMethod, 'pairing');

  await sleep(200);
  assert.deepEqual(pairingRequests, ['967771234567']);
  const st = sessionManager.getSessionsStatus().find((s) => s.name === 'pairA');
  assert.equal(st.pairingCode, 'ABCD-2345');
  assert.equal(st.pairingPhone, '967771234567');
});

test('يُمسح كود الربط عند نجاح الاتصال', { skip }, async () => {
  // نحاكي اكتمال الربط: السوكيت الحالي يفتح الاتصال
  const current = sockets.at(-1);
  current.user = { id: '967771234567:1@s.whatsapp.net' };
  current.ev.emit('connection.update', { connection: 'open' });
  const st = sessionManager.getSessionsStatus().find((s) => s.name === 'pairA');
  assert.equal(st.connection, 'open');
  assert.equal(st.pairingCode, null);
  assert.equal(st.pairingPhone, null);
});

test('إعادة ربط جلسة أُضيفت بكود الهاتف تطلب كوداً جديداً ولا تتحول إلى QR', { skip }, async () => {
  pairingRequests.length = 0;
  await sessionManager.resetSession('pairA');
  await sleep(200);
  assert.deepEqual(pairingRequests, ['967771234567'], 'يجب طلب كود جديد للهاتف المحفوظ');
});

test('التحقق من الاسم ورقم الهاتف يرفض المدخلات الخاطئة', { skip }, () => {
  assert.throws(() => sessionManager.addSession({ name: 'bad name!' }), /اسم الجلسة/);
  assert.throws(() => sessionManager.addSession({ name: 'x'.repeat(40) }), /اسم الجلسة/);
  assert.throws(() => sessionManager.addSession({ name: 'okName', phone: '+967771234567' }), /رقم الهاتف/);
  assert.throws(() => sessionManager.addSession({ name: 'okName', phone: '0771' }), /رقم الهاتف/);
});

test('الجلسة الأساسية من .env لا تُحذف من اللوحة', { skip }, () => {
  assert.throws(() => sessionManager.removeSession('default'), /لا يمكن حذف الجلسة الأساسية/);
});

test('القائمة الكاملة تدمج .env مع الجلسات المحفوظة في القاعدة ولا تكرر', { skip }, () => {
  waRows.set('stored', { name: 'stored', active: 1 });
  const names = sessionManager.getAllSessionNames();
  assert.ok(names.includes('default'));
  assert.ok(names.includes('stored'));
  assert.equal(new Set(names).size, names.length);
});

test('حذف جلسة إضافية يغلقها ويمسح بياناتها ويعطّلها في القاعدة', { skip }, () => {
  const dir = path.join(tmpBase, 'stored');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'creds.json'), '{}');
  sessionManager.removeSession('stored');
  assert.equal(fs.existsSync(dir), false, 'يجب مسح مجلد الجلسة');
  assert.ok(dbCalls.deactivate.includes('stored'));
  assert.equal(sessionManager.getAllSessionNames().includes('stored'), false);
});
