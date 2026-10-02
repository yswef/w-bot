#!/usr/bin/env node
// =============================================
// ♻️ npm run reconnect — إعادة ربط جلسة واتساب من طرفية السيرفر
// =============================================
// المشكلة التي يحلها: عندما يطردك واتساب (loggedOut) لا ينفع أمر ".اعادةربط"
// لأن البوت نفسه مقطوع ولا يستقبل رسائل. هذا السكربت يعيد الربط من الطرفية:
//   1) يكلّم لوحة التحكم الشغّالة (POST /api/reconnect) إن أمكن — بدون إعادة تشغيل
//   2) وإلا يحذف مجلد الجلسة من القرص مباشرة
//
// الاستخدام:
//   npm run reconnect                 ← الجلسة الأولى (default غالباً)
//   npm run reconnect -- mysession    ← جلسة باسمها
//   npm run reconnect -- --all        ← كل الجلسات
//   npm run reconnect -- --status     ← اعرض الحالة فقط (بدون حذف)
//   npm run reconnect -- --start      ← بعد إعادة الربط شغّل البوت في نفس الطرفية
//   npm run reconnect -- --disk       ← تجاهل اللوحة واحذف من القرص مباشرة

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { loadEnv, findLiveDashboard, apiPost, apiGet, parseArgs, ROOT } = require('./lib/dashboard');
const { getConfiguredSessionNames, getSessionPath } = require('../src/utils/sessions');

const out = (msg = '') => process.stdout.write(msg + '\n');
const warn = (msg) => process.stderr.write('⚠️  ' + msg + '\n');

function sessionFilesOnDisk(name) {
  const dir = getSessionPath(name);
  if (!fs.existsSync(dir)) return { dir, exists: false, files: [] };
  const files = fs.readdirSync(dir).filter((f) => f !== '.' && f !== '..');
  return { dir, exists: true, files };
}

async function showStatus() {
  const live = await findLiveDashboard();
  const names = getConfiguredSessionNames();

  out('\n🧩 حالة الجلسات / Sessions status');
  out('─'.repeat(60));

  if (live) {
    out(`✅ البوت يعمل الآن — لوحة التحكم على المنفذ ${live.port}`);
    try {
      const res = await apiGet(live.port, '/api/status', live.token);
      if (res.status === 200 && Array.isArray(res.data?.sessions)) {
        for (const s of res.data.sessions) {
          const state =
            s.connection === 'open'
              ? '🟢 متصل'
              : s.connection === 'qr'
                ? '🟡 ينتظر مسح QR'
                : s.connection === 'loggedout'
                  ? '⛔ خرج من واتساب (يحتاج إعادة ربط)'
                  : '🔴 منقطع';
          out(`  • ${s.name}: ${state}${s.user ? ` — ${String(s.user).split(':')[0]}` : ''}`);
        }
      } else if (res.status === 401) {
        warn('رمز الوصول غير صحيح — ضع DASHBOARD_TOKEN الصحيح في ملف .env (اللوحة تعمل لكن لا أستطيع قراءتها).');
      }
    } catch (err) {
      warn('تعذّر قراءة حالة الجلسات من اللوحة: ' + err.message);
    }
  } else {
    warn('لا توجد لوحة تحكم شغّالة على المنافذ المتوقعة — البوت متوقف على الأرجح.');
  }

  out('');
  for (const name of names) {
    const info = sessionFilesOnDisk(name);
    out(`  📁 ${name}: ${info.dir}`);
    out(`     ${info.exists ? `بيانات الربط موجودة (${info.files.length} ملف)` : 'لا توجد بيانات ربط — سيُطلب مسح QR عند التشغيل'}`);
  }
  out('─'.repeat(60));
  out('💡 لإعادة الربط: npm run reconnect        ولعرض رمز QR في الطرفية: npm run qr\n');
}

async function relinkViaDashboard(live, name) {
  const res = await apiPost(live.port, '/api/reconnect', { session: name }, live.token);
  if (res.status === 200 && res.data?.ok) {
    out(`✅ أُعيد ربط الجلسة "${name}" مباشرةً (بدون إعادة تشغيل البوت).`);
    out('   📱 امسح رمز QR الجديد: npm run qr  — أو من تبويب "الاتصال / QR" في لوحة التحكم.');
    return true;
  }
  if (res.status === 401) {
    warn('رمز الوصول مرفوض (401) — ثبّت DASHBOARD_TOKEN في ملف .env ثم أعد المحاولة، أو استخدم --disk.');
    return false;
  }
  warn(`استجابة غير متوقعة من اللوحة (${res.status}): ${JSON.stringify(res.data)}`);
  return false;
}

function relinkOnDisk(name) {
  const info = sessionFilesOnDisk(name);
  if (info.exists) {
    fs.rmSync(info.dir, { recursive: true, force: true });
    out(`🗑️  حُذفت بيانات الجلسة "${name}" من: ${info.dir}`);
  } else {
    out(`ℹ️  لا توجد بيانات محفوظة للجلسة "${name}" (المجلد ${info.dir} غير موجود).`);
  }
}

async function main() {
  loadEnv();
  const { flags, positional, has } = parseArgs(process.argv.slice(2));

  if (has('help') || has('h')) {
    out(`
♻️ إعادة ربط جلسات واتساب من الطرفية / Re-link WhatsApp sessions

  npm run reconnect                 ← إعادة ربط الجلسة الأولى (default غالباً)
  npm run reconnect -- mysession    ← إعادة ربط جلسة باسمها
  npm run reconnect -- --all        ← إعادة ربط كل الجلسات
  npm run reconnect -- --status     ← عرض الحالة فقط بدون حذف
  npm run reconnect -- --start      ← بعد إعادة الربط شغّل البوت في نفس الطرفية
  npm run reconnect -- --disk       ← احذف من القرص مباشرة (بدون اللوحة)
  npm run port                      ← من يحجز منفذ لوحة التحكم؟
  npm run qr                        ← اطبع رمز QR في الطرفية
`);
    return;
  }

  if (has('status')) return showStatus();

  const configured = getConfiguredSessionNames();
  const targets = has('all') ? configured : positional.length ? positional : [configured[0]];

  const live = has('disk') ? null : await findLiveDashboard();
  if (live) {
    out(`🔎 وجدت لوحة التحكم على المنفذ ${live.port} — سأعيد الربط مباشرةً بدون إعادة تشغيل.`);
    for (const name of targets) {
      try {
        await relinkViaDashboard(live, name);
      } catch (err) {
        warn(`فشلت إعادة الربط عبر اللوحة (${err.message}) — سأحذف من القرص بدلاً من ذلك.`);
        relinkOnDisk(name);
      }
    }
    out('\n✅ انتهيت. افتح لوحة التحكم أو نفّذ npm run qr لمسح الرمز الجديد.');
    return;
  }

  // لا توجد لوحة شغّالة ← الحذف من القرص ثم التشغيل
  out('🔎 لا توجد لوحة تحكم شغّالة — سأحذف بيانات الجلسة من القرص.');
  for (const name of targets) relinkOnDisk(name);

  if (has('start')) {
    out('\n🚀 تشغيل البوت الآن — راقب رمز QR في هذه الطرفية (Ctrl+C للإيقاف)...\n');
    const child = spawn(process.execPath, [path.join(ROOT, 'src', 'index.js')], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => process.exit(code || 0));
    return;
  }

  out(`
✅ جاهز لإعادة الربط. الخطوة التالية:

  1) شغّل البوت:        npm start
  2) سيظهر رمز QR في الطرفية — أو افتح اللوحة من الرابط المطبوع في السجل
  3) في واتساب:         الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز

💡 نصائح للسيرفر العام:
  • إن كان المنفذ محجوزاً (EADDRINUSE) نفّذ:  npm run port
  • لعرض رمز QR في أي وقت من طرفية أخرى:     npm run qr
  • لتثبيت رمز الدخول للوحة ضع في .env:      DASHBOARD_TOKEN=رمز_سري
`);
}

main().catch((err) => {
  warn('فشل السكربت: ' + (err?.stack || err));
  process.exit(1);
});
