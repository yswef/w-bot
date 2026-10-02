#!/usr/bin/env node
// =============================================
// 📱 npm run qr — اطبع رمز ربط واتساب داخل طرفية السيرفر
// =============================================
// للسيرفرات العامة التي لا تملك متصفحاً: يقرأ رمز QR من لوحة التحكم الشغّالة
// ويرسمه في الطرفية مباشرة، ويحدّثه كل ثوانٍ حتى يكتمل الربط.
//
// الاستخدام:
//   npm run qr                 ← يعرض الرمز ويتابع الحالة حتى الاتصال
//   npm run qr -- --once       ← اعرض الرمز مرة واحدة ثم اخرج
//   npm run qr -- mysession    ← جلسة محددة

const { loadEnv, findLiveDashboard, apiGet, parseArgs, dashboardUrl } = require('./lib/dashboard');

const out = (msg = '') => process.stdout.write(msg + '\n');
const warn = (msg) => process.stderr.write('⚠️  ' + msg + '\n');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function printQr(qrText) {
  try {
    // مكتبة تابعة للمشروع نفسه — ترسم الرمز بالحروف داخل أي طرفية
    require('qrcode-terminal').generate(qrText, { small: true });
  } catch {
    out('\n(مكتبة qrcode-terminal غير مثبتة) نص الرمز الخام — انسخه إلى أي مولّد QR:');
    out(qrText);
  }
}

function clearScreen() {
  if (process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

async function fetchStatus(live) {
  const res = await apiGet(live.port, '/api/status', live.token, 8000);
  if (res.status === 401) {
    warn('رمز الوصول مرفوض (401). ضع في ملف .env:  DASHBOARD_TOKEN=الرمز_المطبوع_في_سجل_التشغيل');
    return null;
  }
  if (res.status !== 200) {
    warn(`استجابة غير متوقعة من اللوحة (${res.status}).`);
    return null;
  }
  return res.data;
}

function render(data, wantedSession) {
  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  if (!sessions.length) {
    out('لا توجد جلسات بعد — شغّل البوت أولاً:  npm start');
    return { state: 'none' };
  }

  const session =
    (wantedSession ? sessions.find((s) => s.name === wantedSession) : null) ||
    sessions.find((s) => s.connection === 'qr') ||
    sessions[0];

  out(`🧩 الجلسة: ${session.name}`);
  if (session.connection === 'open') {
    out(`✅ متصلة بواتساب — الرقم: ${String(session.user || '').split(':')[0]}`);
    return { state: 'open' };
  }
  if (session.connection === 'loggedout') {
    out('⛔ واتساب أنهى هذه الجلسة (loggedOut) — تحتاج إعادة ربط:');
    out('   npm run reconnect     (ثم أعد تشغيل هذا السكربت)');
    return { state: 'loggedout' };
  }
  if (session.qr) {
    out('📱 في واتساب: الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز التالي');
    out('─'.repeat(46));
    printQr(session.qr);
    out('─'.repeat(46));
    out('ℹ️  الرمز يتغيّر كل ~20 ثانية — سيُحدَّث هنا تلقائياً.');
    return { state: 'qr' };
  }
  out('🔴 لا يوجد رمز QR حالياً — الجلسة تحاول الاتصال. لو استمرت، نفّذ: npm run reconnect');
  return { state: 'other' };
}

async function main() {
  loadEnv();
  const { positional, has } = parseArgs(process.argv.slice(2));

  if (has('help') || has('h')) {
    out(`
📱 عرض رمز ربط واتساب في الطرفية / Print the WhatsApp QR in your terminal

  npm run qr                 ← يعرض الرمز ويتابع الحالة حتى يكتمل الربط
  npm run qr -- --once       ← اعرض الرمز مرة واحدة ثم اخرج
  npm run qr -- mysession    ← جلسة محددة بالاسم
  npm run reconnect          ← إعادة الربط لو طُردت الجلسة (loggedOut)
`);
    return;
  }

  const live = await findLiveDashboard({ maxPorts: 12 });
  if (!live) {
    warn('لم أجد لوحة تحكم شغّالة — شغّل البوت في طرفية أخرى:  npm start');
    out('   (رمز QR يُطبع تلقائياً في سجل التشغيل عند بدء البوت)');
    process.exit(1);
  }

  if (!live.token) {
    warn('DASHBOARD_TOKEN غير مضبوط في .env — لا أستطيع قراءة اللوحة بدون الرمز.');
    out('   الحل: ضع في ملف .env:  DASHBOARD_TOKEN=الرمز_المطبوع_في_سجل_التشغيل  ثم أعد التشغيل.');
    process.exit(1);
  }

  out(`🔎 لوحة التحكم على المنفذ ${live.port} — ${dashboardUrl(live.port, live.token)}`);

  const wanted = positional[0];
  const once = has('once');
  let lastQr = null;
  let ticks = 0;

  for (;;) {
    const data = await fetchStatus(live);
    if (!data) process.exit(1);

    const session =
      (wanted ? (data.sessions || []).find((s) => s.name === wanted) : null) ||
      (data.sessions || []).find((s) => s.connection === 'qr') ||
      (data.sessions || [])[0];
    const qrNow = session?.qr || null;

    // لا نعيد الرسم إلا عند تغيّر الرمز أو الحالة (حتى لا تومض الطرفية)
    if (qrNow !== lastQr || ticks === 0) {
      clearScreen();
      out(`🖥️  لوحة التحكم: ${dashboardUrl(live.port, live.token)}\n`);
      const { state } = render(data, wanted);
      lastQr = qrNow;
      if (once || state === 'open') {
        if (state === 'open') out('\n🎉 تم الربط بنجاح — البوت يعمل الآن.');
        return;
      }
    }

    ticks += 1;
    await sleep(3000);
  }
}

main().catch((err) => {
  warn('فشل السكربت: ' + (err?.stack || err));
  process.exit(1);
});
