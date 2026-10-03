#!/usr/bin/env node
// =============================================
// 🔌 npm run port — من يحجز منفذ لوحة التحكم؟
// =============================================
// يحل رسالة الخطأ: "تعذر تشغيل لوحة التحكم على المنفذ 8080: listen EADDRINUSE"
// يعمل داخل الحاويات الخفيفة أيضاً (بدون ss/lsof/netstat) لأنه يقرأ /proc مباشرة،
// ويستخدم تلك الأدوات إن وُجدت كمعلومة إضافية.
//
// الاستخدام:
//   npm run port            ← يفحص PORT من .env (أو 3000)
//   npm run port -- 8080    ← يفحص منفذاً محدداً

const fs = require('fs');
const { execSync } = require('child_process');

const { loadEnv, dashboardConfig, findLiveDashboard, isPortOpen, dashboardUrl } = require('./lib/dashboard');

const out = (msg = '') => process.stdout.write(msg + '\n');
const warn = (msg) => process.stderr.write('⚠️  ' + msg + '\n');

// ── قراءة منافذ LISTEN من /proc/net/tcp{,6} ──────────────────────────
function listenInodesForPort(port) {
  const inodes = new Set();
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const [localAddress, state, inode] = [parts[1], parts[3], parts[9]];
      if (state !== '0A') continue; // 0A = TCP_LISTEN
      const localPort = parseInt(String(localAddress).split(':')[1], 16);
      if (localPort === port && inode && inode !== '0') inodes.add(inode);
    }
  }
  return inodes;
}

// ── تحويل inode إلى رقم عملية (PID) بمسح /proc/*/fd ──────────────────
function pidsForInodes(inodes) {
  const found = [];
  if (!inodes.size) return found;
  let pids = [];
  try {
    pids = fs.readdirSync('/proc').filter((name) => /^\d+$/.test(name));
  } catch {
    return found;
  }
  for (const pid of pids) {
    let fds = [];
    try {
      fds = fs.readdirSync(`/proc/${pid}/fd`);
    } catch {
      continue; // عملية مملوكة لمستخدم آخر أو انتهت
    }
    for (const fd of fds) {
      let target;
      try {
        target = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
      } catch {
        continue;
      }
      const match = /^socket:\[(\d+)\]$/.exec(target || '');
      if (match && inodes.has(match[1])) {
        found.push({ pid: Number(pid), inode: match[1] });
        break;
      }
    }
  }
  return found;
}

function processDetails(pid) {
  const read = (file) => {
    try {
      return fs.readFileSync(`/proc/${pid}/${file}`, 'utf8');
    } catch {
      return '';
    }
  };
  const cmdline = read('cmdline').split('\0').filter(Boolean).join(' ');
  const comm = read('comm').trim();
  const status = read('status');
  const ppid = Number(/PPid:\s*(\d+)/.exec(status)?.[1] || 0);
  const uid = Number(/Uid:\s*(\d+)/.exec(status)?.[1] || -1);
  let started = '';
  try {
    started = fs.statSync(`/proc/${pid}`).mtime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    /* تجاهل */
  }
  return { pid, comm, cmdline, ppid, uid, started };
}

function tryExternalTools(port) {
  const lines = [];
  const commands = [
    `ss -ltnp 'sport = :${port}' 2>/dev/null || true`,
    `lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true`,
    `netstat -ltnp 2>/dev/null | grep ':${port} ' || true`,
  ];
  for (const cmd of commands) {
    try {
      const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (stdout) lines.push(stdout);
    } catch {
      /* الأداة غير مثبتة — لا مشكلة، اعتمدنا على /proc */
    }
  }
  return lines;
}

async function main() {
  loadEnv();
  const argPort = Number(process.argv[2]);
  const { port: envPort, token, publicUrl } = dashboardConfig();
  const port = Number.isFinite(argPort) && argPort > 0 ? argPort : envPort;

  out(`\n🔌 فحص المنفذ ${port} / Port check`);
  out('─'.repeat(64));

  const open = await isPortOpen(port);
  if (!open) {
    out(`✅ المنفذ ${port} حرّ — لا توجد عملية تستمع عليه.`);
  } else {
    out(`⛔ المنفذ ${port} محجوز. البحث عن العملية المالكة...`);
    const inodes = listenInodesForPort(port);
    const owners = pidsForInodes(inodes);

    if (!owners.length) {
      out('   لم أستطع تحديد الـ PID من /proc (صلاحيات ناقصة غالباً).');
      out('   جرّب بنفسك:  ss -ltnp | grep :' + port + '   أو   lsof -i :' + port + '   أو   fuser ' + port + '/tcp');
    }

    for (const owner of owners) {
      const info = processDetails(owner.pid);
      out('');
      out(`   🧾 PID: ${info.pid}   الاسم: ${info.comm || '؟'}   المستخدم(UID): ${info.uid}`);
      out(`      الأمر: ${info.cmdline || '؟'}`);
      if (info.ppid) out(`      العملية الأم (PPID): ${info.ppid}`);
      if (info.started) out(`      بدأت تقريباً: ${info.started}`);
      out(`      لإيقافها:  kill ${info.pid}      (وللإيقاف القسري: kill -9 ${info.pid})`);

      const looksLikeBot = /src\/index\.js|whatsapp-auto-bot|asta/i.test(info.cmdline || '');
      if (looksLikeBot) {
        out('');
        out('   ⚠️  هذه على الأغلب نسخة قديمة من البوت ما زالت تعمل!');
        out('      وجود نسختين بنفس الجلسة يجعل واتساب يطرد إحداهما (loggedOut).');
        out(`      أوقفها ثم شغّل نسخة واحدة فقط:  kill ${info.pid} && npm start`);
      }
    }

    const extra = tryExternalTools(port);
    if (extra.length) {
      out('');
      out('   📎 مخرجات أدوات النظام (إن وُجدت):');
      for (const block of extra) {
        for (const line of block.split('\n')) out('      ' + line);
      }
    }
  }

  // ── أين لوحة التحكم فعلياً؟ ─────────────────────────────────────────
  out('');
  out('🖥️  البحث عن لوحة التحكم الشغّالة...');
  const live = await findLiveDashboard({ maxPorts: 12 });
  if (live) {
    out(`   ✅ تعمل على المنفذ ${live.port}${live.port !== port ? ` (انتقلت إليه لأن ${port} كان محجوزاً)` : ''}`);
    out(`   🔗 ${dashboardUrl(live.port, live.token || token)}`);
    out(`   🩺 الحالة: ${JSON.stringify(live.health)}`);
    if (!token) {
      warn('DASHBOARD_TOKEN غير مضبوط في .env — الرمز عشوائي ويتغيّر مع كل تشغيل. ابحث عنه في سجل التشغيل (npm start).');
    }
  } else {
    out('   ❌ لا توجد لوحة تحكم شغّالة — شغّل البوت أولاً:  npm start');
  }

  out('');
  out('🛠️  خيارات الحل:');
  out(`   • أوقف العملية التي تحجز المنفذ ثم أعد التشغيل:  kill <PID> && npm start`);
  out(`   • أو ثبّت منفذاً آخر في ملف .env:              PORT=3000`);
  out(`   • أو افتح المنفذ في الجدار الناري للوصول من خارج السيرفر:  sudo ufw allow ${port}/tcp`);
  if (publicUrl) out(`   • رابط اللوحة العام المضبوط:                  ${publicUrl}`);
  out(`   • للوصول من جهازك بدون فتح المنفذ:            ssh -L ${port}:localhost:${port} user@SERVER_IP`);
  out('─'.repeat(64) + '\n');
}

main().catch((err) => {
  warn('فشل السكربت: ' + (err?.stack || err));
  process.exit(1);
});
