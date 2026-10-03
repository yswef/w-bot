// يتحقق من لوحة التحكم: الحماية برمز الوصول، نقطة /health، إعادة الربط /api/reconnect،
// والانتقال التلقائي إلى منفذ بديل عند EADDRINUSE (مشكلة السيرفرات العامة).
//
// ملاحظة: نستبدل وحدتي قاعدة البيانات ومدير الجلسات بنسخ وهمية حتى يعمل الاختبار
// بدون better-sqlite3 مبنية وبدون فتح اتصال حقيقي بواتساب.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

let depsMissing = null;
for (const dep of ['pino', 'qrcode', 'dotenv']) {
  try {
    require.resolve(dep);
  } catch (err) {
    depsMissing = `الاعتمادية ${dep} غير مثبتة — نفّذ npm install`;
  }
}
const skip = depsMissing || false;

const TOKEN = 'test-token-abc123';
process.env.DASHBOARD_TOKEN = TOKEN;
process.env.LOG_LEVEL = 'silent'; // حتى لا تختلط سجلات pino بمخرجات الاختبار

function stubModule(requestPath, exports) {
  const resolved = require.resolve(requestPath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
    children: [],
    paths: [],
  };
  return exports;
}

// قاعدة بيانات وهمية: كل دالة تُرجع قائمة فارغة (getGlobalSetting تُرجع '0')
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

// مدير جلسات وهمي: جلسة واحدة بانتظار مسح QR
const sessionStub = {
  resets: [],
  sessions: [{ name: 'default', connection: 'qr', qr: '2@TESTQR', user: null, connectedAt: null, lastDisconnect: null }],
  getSessionsStatus() {
    return this.sessions;
  },
  getConfiguredSessionNames: () => ['default', 'second'],
  normalizeSessionName: (value) => (value || 'default').trim(),
  recoveryInstructions: (name = 'default') => ({
    sessionName: name,
    sessionDir: `/tmp/session/${name}`,
    commands: [`npm run reconnect -- ${name}`],
  }),
  async resetSession(name) {
    this.resets.push(name);
    return {};
  },
  getActiveSocket: () => null,
};
stubModule('../src/sessionManager', sessionStub);

const startDashboard = require('../src/web/app');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.on('error', reject);
  });
}

function fetchJson(port, path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let data = raw;
        try {
          data = JSON.parse(raw);
        } catch {
          /* نص عادي */
        }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function withServer(port, run) {
  process.env.PORT = String(port);
  const server = startDashboard();
  await new Promise((resolve) => setTimeout(resolve, 250)); // ننتظر حدث listening
  try {
    return await run(server);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test(
  'نقطة /health متاحة بدون رمز وصول (تحتاجها منصات الاستضافة)',
  { skip },
  async () => {
    const port = await getFreePort();
    await withServer(port, async () => {
      const res = await fetchJson(port, '/health');
      assert.equal(res.status, 200);
      assert.equal(res.data.ok, true);
      assert.equal(res.data.connected, false);
    });
  }
);

test(
  'واجهات API ترفض الطلب بدون رمز وصول صحيح (401)',
  { skip },
  async () => {
    const port = await getFreePort();
    await withServer(port, async () => {
      assert.equal((await fetchJson(port, '/api/status')).status, 401);
      assert.equal((await fetchJson(port, '/api/status', { token: 'wrong-token-xxxx' })).status, 401);
      assert.equal(
        (await fetchJson(port, '/api/reconnect', { method: 'POST', body: { session: 'default' } })).status,
        401
      );
    });
  }
);

test(
  '/api/status يعيد الحالة مع صورة QR وأوامر إعادة الربط',
  { skip },
  async () => {
    const port = await getFreePort();
    await withServer(port, async () => {
      const res = await fetchJson(port, '/api/status', { token: TOKEN });
      assert.equal(res.status, 200);
      assert.equal(res.data.sessions.length, 1);
      assert.equal(res.data.sessions[0].connection, 'qr');
      assert.match(String(res.data.sessions[0].qrImage), /^data:image\/png;base64,/);
      assert.equal(res.data.dashboardPort, port);
      assert.deepEqual(res.data.recovery.commands, ['npm run reconnect -- default']);
    });
  }
);

test(
  '/api/reconnect يعيد ربط الجلسة المطلوبة ويرفض الجلسات غير المعروفة',
  { skip },
  async () => {
    const port = await getFreePort();
    await withServer(port, async () => {
      sessionStub.resets.length = 0;

      const ok = await fetchJson(port, '/api/reconnect', { method: 'POST', token: TOKEN, body: { session: 'second' } });
      assert.equal(ok.status, 200);
      assert.equal(ok.data.ok, true);
      assert.equal(ok.data.session, 'second');
      assert.deepEqual(sessionStub.resets, ['second']);

      // بدون اسم جلسة ← يستخدم الجلسة الأولى المضبوطة
      const fallback = await fetchJson(port, '/api/reconnect', { method: 'POST', token: TOKEN, body: {} });
      assert.equal(fallback.status, 200);
      assert.equal(fallback.data.session, 'default');

      const bad = await fetchJson(port, '/api/reconnect', {
        method: 'POST',
        token: TOKEN,
        body: { session: 'not-configured' },
      });
      assert.equal(bad.status, 400);
      assert.deepEqual(bad.data.sessions, ['default', 'second']);
    });
  }
);

test(
  'لوحة التحكم تنتقل إلى منفذ بديل عندما يكون المنفذ محجوزاً (EADDRINUSE)',
  { skip },
  async () => {
    const port = await getFreePort();
    const blocker = http.createServer((req, res) => res.end('busy'));
    await new Promise((resolve) => blocker.listen(port, '0.0.0.0', resolve));

    process.env.PORT = String(port);
    const server = startDashboard();
    let found = null;
    try {
      // المنفذ المحجوز يظل للمشغّل القديم
      const busy = await fetchJson(port, '/health').catch(() => null);
      assert.ok(!busy || busy.data === 'busy' || busy.data?.ok !== true);

      // والمنفذ التالي يصبح للوحة التحكم (الانتقال التلقائي يحدث خلال أجزاء من الثانية)
      for (let attempt = 0; attempt < 40 && !found; attempt += 1) {
        for (let candidate = port + 1; candidate <= port + 5; candidate += 1) {
          const res = await fetchJson(candidate, '/health').catch(() => null);
          if (res?.status === 200 && res.data?.ok) {
            found = candidate;
            break;
          }
        }
        if (!found) await new Promise((resolve) => setTimeout(resolve, 150));
      }
      assert.ok(found, 'لم تعمل لوحة التحكم على أي منفذ بديل');
      assert.equal(startDashboard.getDashboardPort(), found);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await new Promise((resolve) => blocker.close(resolve));
    }
  }
);
