// =============================================
// 📖 سجل أوامر أستا — مصدر واحد للحقيقة
// =============================================
// كل أمر يُعرَّف هنا مرة واحدة مع وصفه وفئته وصلاحياته، ويُستخدم هذا السجل في:
//   • قائمة المساعدة (.مساعدة) وقوائم الفئات
//   • اقتراح الأمر الصحيح عند الخطأ الإملائي ("هل تقصد…؟")
//   • توثيق README
// بهذا لا تتقادم قائمة الأوامر أبداً كلما أُضيف أمر جديد.

// slug = الكلمة التي يكتبها المستخدم بعد الأمر: مثال `.مساعدة العاب`
const CATEGORIES = {
  anime:   { key: 'anime',   slug: 'انمي',    emoji: '🌸', ar: 'الأنمي والترفيه',  en: 'Anime & Fun' },
  games:   { key: 'games',   slug: 'العاب',   emoji: '🎮', ar: 'الألعاب',           en: 'Games' },
  islamic: { key: 'islamic', slug: 'اسلامية', emoji: '🕌', ar: 'إسلامية',           en: 'Islamic' },
  tools:   { key: 'tools',   slug: 'ادوات',   emoji: '🧰', ar: 'أدوات مفيدة',       en: 'Utilities' },
  media:   { key: 'media',   slug: 'ملصقات',  emoji: '🖼️', ar: 'الوسائط والملصقات', en: 'Media & Stickers' },
  group:   { key: 'group',   slug: 'مجموعات', emoji: '🛡️', ar: 'إدارة المجموعات',   en: 'Group Admin' },
  logs:    { key: 'logs',    slug: 'سجلات',   emoji: '🕵️', ar: 'المراقبة والسجلات', en: 'Monitoring & Logs' },
  owner:   { key: 'owner',   slug: 'مالك',    emoji: '👑', ar: 'أوامر المالك',      en: 'Owner' },
};

// role: 'all' | 'admin' (مشرف مجموعة) | 'owner' (مالك البوت)
const COMMANDS = [
  // ---------- الأنمي والترفيه ----------
  { name: 'انمي',        aliases: ['anime'],        cat: 'anime', role: 'all', ar: 'شخصية أنمي عشوائية مع صورتها ومقولتها', en: 'Random anime character with image & quote' },
  { name: 'زوج',         aliases: [],               cat: 'anime', role: 'all', ar: 'شريك حياة سحري (شخصية ذكر)', en: 'Random male character as your partner' },
  { name: 'زوجة',        aliases: [],               cat: 'anime', role: 'all', ar: 'شريكة حياة سحرية (شخصية أنثى)', en: 'Random female character as your partner' },
  { name: 'شخصية',       aliases: ['character'],    cat: 'anime', role: 'all', args: '<اسم>', ar: 'ابحث عن شخصية معيّنة بالاسم', en: 'Search a character by name' },
  { name: 'شخصيات',      aliases: ['characters'],   cat: 'anime', role: 'all', ar: 'عدد الشخصيات المتاحة وتوزيعها', en: 'Roster size and breakdown' },
  { name: 'اقتباس',      aliases: ['quote'],        cat: 'anime', role: 'all', ar: 'مقولة فخمة من عالم الأنمي', en: 'Random anime quote' },
  { name: 'نكتة',        aliases: ['joke'],         cat: 'anime', role: 'all', ar: 'نكتة عشوائية', en: 'Random joke' },
  { name: 'حب',          aliases: ['love'],         cat: 'anime', role: 'all', args: '@شخص1 @شخص2', ar: 'نسبة التوافق بين شخصين', en: 'Love compatibility percentage' },
  { name: 'انميات',      aliases: ['موسم'],         cat: 'anime', role: 'all', ar: 'أنميات الموسم الحالي', en: 'Current season anime list' },
  { name: 'بحث-انمي',    aliases: ['searchanime'],  cat: 'anime', role: 'all', args: '<اسم>', ar: 'تفاصيل أي أنمي', en: 'Search anime details' },
  { name: 'نشرة-انمي',   aliases: [],               cat: 'anime', role: 'admin', ar: 'جدولة نشرة أنمي دورية للمجموعة', en: 'Schedule a recurring anime newsletter' },
  { name: 'إيقاف-نشرة',  aliases: [],               cat: 'anime', role: 'admin', ar: 'إيقاف نشرة الأنمي', en: 'Stop the anime newsletter' },
  { name: 'lastseen',    aliases: ['آخرمرة', 'آخر-مرة'], cat: 'anime', role: 'all', ar: 'آخر ظهور لمستخدم في المحادثة', en: 'Last seen time for a user' },

  // ---------- الألعاب ----------
  { name: 'لعبة',        aliases: ['game'],         cat: 'games', role: 'all', ar: 'قائمة الألعاب المتاحة', en: 'List available games' },
  { name: 'حجر',         aliases: ['ورقه', 'مقص'],  cat: 'games', role: 'all', ar: 'حجر ورقة مقص ضد البوت', en: 'Rock paper scissors vs the bot' },
  { name: 'تخمين',       aliases: [],               cat: 'games', role: 'all', ar: 'ابدأ لعبة تخمين رقم بين 1 و20', en: 'Start the number guessing game' },
  { name: 'اخمن',        aliases: [],               cat: 'games', role: 'all', args: '<رقم>', ar: 'أرسل تخمينك للرقم السري', en: 'Submit your guess' },
  { name: 'سؤال',        aliases: ['trivia'],       cat: 'games', role: 'all', ar: 'سؤال معلومات أنمي — أجب مباشرة بالدردشة', en: 'Anime trivia — answer directly in chat' },
  { name: 'كشف',         aliases: ['reveal'],       cat: 'games', role: 'all', ar: 'اكشف إجابة السؤال النشط', en: 'Reveal the active trivia answer' },
  { name: 'جواب',        aliases: ['answer'],       cat: 'games', role: 'all', args: '<إجابتك>', ar: 'إرسال إجابة للسؤال أو الفعالية النشطة', en: 'Submit an answer to the active question/event' },
  { name: 'فعالية',      aliases: ['تفكيك', 'event'], cat: 'games', role: 'admin', args: '<عدد الجولات>', ar: 'فعالية تفكيك حروف جماعية (حتى 20 جولة)', en: 'Group word-scramble event (up to 20 rounds)' },
  { name: 'تخطي',        aliases: ['skip'],         cat: 'games', role: 'admin', ar: 'تخطي الجولة الحالية في الفعالية', en: 'Skip the current event round' },
  { name: 'ايقاف_فعالية', aliases: [],              cat: 'games', role: 'admin', ar: 'إنهاء الفعالية وعرض لوحة الصدارة', en: 'End the event and show the scoreboard' },
  { name: 'سلسلة',       aliases: [],               cat: 'games', role: 'all', ar: 'لعبة سلسلة الحروف', en: 'Word chain game' },

  // ---------- إسلامية ----------
  { name: 'آية',         aliases: ['aaya'],         cat: 'islamic', role: 'all', ar: 'آية قرآنية كريمة عشوائية', en: 'Random Quran verse' },
  { name: 'ذكر',         aliases: ['thikr'],        cat: 'islamic', role: 'all', ar: 'ذكر من الأذكار اليومية', en: 'Random daily remembrance' },
  { name: 'جدول-آية',    aliases: [],               cat: 'islamic', role: 'admin', args: '<وقت>', ar: 'جدولة آية يومية للمجموعة', en: 'Schedule a daily verse' },
  { name: 'جدول-ذكر',    aliases: [],               cat: 'islamic', role: 'admin', args: '<وقت>', ar: 'جدولة ذكر يومي للمجموعة', en: 'Schedule a daily remembrance' },
  { name: 'إيقاف-جدول',  aliases: [],               cat: 'islamic', role: 'admin', ar: 'إيقاف الجداول الإسلامية', en: 'Stop Islamic schedules' },

  // ---------- أدوات ----------
  { name: 'ping',        aliases: [],               cat: 'tools', role: 'all', ar: 'فحص سرعة استجابة البوت', en: 'Check bot latency' },
  { name: 'مساعدة',      aliases: ['help', 'info', 'اوامر', 'الاوامر', 'أوامر', 'menu', 'commands'], cat: 'tools', role: 'all', args: '[الفئة]', ar: 'عرض قائمة الأوامر (أو فئة محددة)', en: 'Show the command list (or one category)' },
  { name: 'سعر',         aliases: ['currency'],     cat: 'tools', role: 'all', args: '<مبلغ> <من> <إلى>', ar: 'محوّل عملات بسعر حي', en: 'Live currency converter' },
  { name: 'ترجم',        aliases: ['translate'],    cat: 'tools', role: 'all', args: '<لغة> <نص>', ar: 'ترجمة نص أو رسالة مقتبسة', en: 'Translate text or a quoted message' },
  { name: 'طقس',         aliases: ['weather'],      cat: 'tools', role: 'all', args: '<مدينة>', ar: 'حالة الطقس لأي مدينة', en: 'Weather for any city' },
  { name: 'ويكي',        aliases: ['wiki'],         cat: 'tools', role: 'all', args: '<كلمة>', ar: 'ملخّص من ويكيبيديا', en: 'Wikipedia summary' },
  { name: 'استطلاع',     aliases: ['poll'],         cat: 'tools', role: 'all', args: '<سؤال>|<خيار>|<خيار>', ar: 'إنشاء استطلاع واتساب أصلي', en: 'Create a native WhatsApp poll' },
  { name: 'تذكير',       aliases: ['reminder', 'remind'], cat: 'tools', role: 'all', args: '<وقت> <نص>', ar: 'ذكّرني برسالة بعد مدة محددة', en: 'Set a reminder' },
  { name: 'ايدي',        aliases: ['myid', 'whoami', 'معرفي'], cat: 'tools', role: 'all', ar: 'عرض معرّفك وصلاحياتك', en: 'Show your JID and permissions' },
  { name: 'تواصل',       aliases: ['المطور', 'developer', 'contact'], cat: 'tools', role: 'all', ar: 'التواصل مع مطوّر البوت', en: 'Contact the developer' },

  // ---------- الوسائط ----------
  { name: 'ملصق',        aliases: ['sticker'],      cat: 'media', role: 'all', ar: 'تحويل صورة/فيديو إلى ملصق', en: 'Convert an image/video to a sticker' },
  { name: 'سرقة',        aliases: ['steal'],        cat: 'media', role: 'all', ar: 'سرقة ملصق موجود بردّك عليه', en: 'Steal an existing sticker' },

  // ---------- إدارة المجموعات ----------
  { name: 'طرد',         aliases: ['kick'],         cat: 'group', role: 'admin', args: '@عضو', ar: 'طرد عضو من المجموعة', en: 'Remove a member' },
  { name: 'ترقية',       aliases: ['promote'],      cat: 'group', role: 'admin', args: '@عضو', ar: 'ترقية عضو إلى مشرف', en: 'Promote a member to admin' },
  { name: 'تخفيض',       aliases: ['demote'],       cat: 'group', role: 'admin', args: '@مشرف', ar: 'تخفيض مشرف إلى عضو', en: 'Demote an admin' },
  { name: 'قفل',         aliases: ['lock'],         cat: 'group', role: 'admin', ar: 'قفل المجموعة (المشرفون فقط يرسلون)', en: 'Lock the group' },
  { name: 'فتح',         aliases: ['unlock'],       cat: 'group', role: 'admin', ar: 'فتح المجموعة للجميع', en: 'Unlock the group' },
  { name: 'الكل',        aliases: ['all', 'احية'],  cat: 'group', role: 'admin', args: '<رسالة>', ar: 'منشن ظاهر لجميع الأعضاء', en: 'Mention everyone (visible)' },
  { name: 'تنبيه',       aliases: [],               cat: 'group', role: 'admin', args: '<رسالة>', ar: 'منشن مخفي للجميع بدون قائمة @', en: 'Hidden mention for everyone' },
  { name: 'همسة',        aliases: ['منشن'],         cat: 'group', role: 'admin', args: '<رسالة>', ar: 'منشن مخفي لعضو واحد (بالرد عليه)', en: 'Hidden mention for one member' },
  { name: 'منع-الروابط', aliases: ['antilink'],     cat: 'group', role: 'admin', args: '[ايقاف]', ar: 'حذف أي رابط يُنشر في المجموعة', en: 'Auto-delete links' },
  { name: 'ضد_التعديل',  aliases: ['antiedit', 'ضد-التعديل'], cat: 'group', role: 'admin', args: '[ايقاف|حالة]', ar: 'كشف الرسائل المعدَّلة وإظهار نصها قبل وبعد', en: 'Reveal edited messages (before & after)' },
  { name: 'ترحيب',       aliases: ['welcome'],      cat: 'group', role: 'admin', args: '[رسالة|ايقاف]', ar: 'بطاقة ترحيب تلقائية للأعضاء الجدد', en: 'Auto welcome card for new members' },
  { name: 'معلومات-مجموعة', aliases: ['groupinfo'], cat: 'group', role: 'admin', ar: 'تفاصيل وإحصائيات المجموعة', en: 'Group details and stats' },
  { name: 'جدولة',       aliases: [],               cat: 'group', role: 'admin', args: '<قفل|فتح|اذكار>', ar: 'جدولة مهام تلقائية للمجموعة', en: 'Schedule automatic group tasks' },
  { name: 'تفعيل-بوت',   aliases: [],               cat: 'group', role: 'admin', ar: 'تفعيل البوت في هذه المحادثة', en: 'Enable the bot in this chat' },
  { name: 'إيقاف-بوت',   aliases: [],               cat: 'group', role: 'admin', ar: 'إيقاف البوت في هذه المحادثة', en: 'Disable the bot in this chat' },

  // ---------- المراقبة والسجلات ----------
  { name: 'تعديلات',     aliases: ['edits'],        cat: 'logs', role: 'all', args: '[عدد]', ar: 'آخر الرسائل المعدَّلة (أو رُدَّ على رسالة لسجلها)', en: 'Recent edited messages (or reply to one)' },
  { name: 'محذوفات',     aliases: ['deleted'],      cat: 'logs', role: 'all', args: '[عدد]', ar: 'آخر الرسائل المحذوفة في المحادثة', en: 'Recent deleted messages' },

  // ---------- المالك ----------
  { name: 'لوحة',        aliases: ['dashboard', 'panel'], cat: 'owner', role: 'owner', ar: 'رابط لوحة التحكم مع رمز الوصول', en: 'Dashboard link with access token' },
  { name: 'احصائيات',    aliases: ['stats'],        cat: 'owner', role: 'owner', ar: 'إحصائيات البوت الكاملة', en: 'Full bot statistics' },
  { name: 'صيانة',       aliases: ['maintenance'],  cat: 'owner', role: 'owner', args: '[on|off]', ar: 'تفعيل/إيقاف وضع الصيانة', en: 'Toggle maintenance mode' },
  { name: 'رد',          aliases: [],               cat: 'owner', role: 'owner', args: '<كلمة> <رد>', ar: 'إضافة رد تلقائي مخصص', en: 'Add a custom auto-reply' },
  { name: 'حذفرد',       aliases: [],               cat: 'owner', role: 'owner', args: '<id>', ar: 'حذف رد تلقائي', en: 'Delete a custom auto-reply' },
  { name: 'تفاعل',       aliases: [],               cat: 'owner', role: 'owner', args: '<كلمة> <إيموجي>', ar: 'إضافة تفاعل تلقائي على كلمة', en: 'Add an auto-reaction keyword' },
  { name: 'حذفتفاعل',    aliases: [],               cat: 'owner', role: 'owner', args: '<id>', ar: 'حذف تفاعل تلقائي', en: 'Delete an auto-reaction' },
  { name: 'حظر',         aliases: ['ban'],          cat: 'owner', role: 'owner', args: '@عضو', ar: 'منع عضو من استخدام البوت', en: 'Ban a user from the bot' },
  { name: 'رفع-حظر',     aliases: ['unban'],        cat: 'owner', role: 'owner', args: '@عضو', ar: 'رفع الحظر عن عضو', en: 'Unban a user' },
  { name: 'المحظورين',   aliases: ['banlist'],      cat: 'owner', role: 'owner', ar: 'قائمة المحظورين', en: 'List banned users' },
  { name: 'بث',          aliases: [],               cat: 'owner', role: 'owner', args: '<رسالة>', ar: 'إرسال رسالة لكل المجموعات', en: 'Broadcast to all groups' },
  { name: 'جلسات',       aliases: [],               cat: 'owner', role: 'owner', ar: 'حالة جلسات الاتصال', en: 'Session connection status' },
  { name: 'اعادةربط',    aliases: ['reconnect'],    cat: 'owner', role: 'owner', args: '[اسم الجلسة]', ar: 'إعادة ربط جلسة واتساب', en: 'Re-link a WhatsApp session' },
];

const ROLE_BADGE = { all: '', admin: ' 🛡️', owner: ' 👑' };

function byCategory(catKey) {
  return COMMANDS.filter((c) => c.cat === catKey);
}

// كل الأسماء والمرادفات في قائمة واحدة (تُستخدم لاقتراح الأمر الصحيح)
function allNames() {
  const names = [];
  for (const cmd of COMMANDS) {
    names.push(cmd.name, ...(cmd.aliases || []));
  }
  return names;
}

// مسافة ليفنشتاين لاقتراح "هل تقصد…؟" عند الخطأ الإملائي
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

/** يقترح أقرب أمر لاسم مكتوب بشكل خاطئ، أو null إذا لا يوجد قريب بما يكفي. */
function suggestCommand(input) {
  const query = (input || '').toLowerCase().trim();
  if (!query) return null;

  let best = null;
  let bestScore = Infinity;
  for (const name of allNames()) {
    const candidate = name.toLowerCase();
    if (candidate.startsWith(query) || query.startsWith(candidate)) return name;
    const score = levenshtein(query, candidate);
    if (score < bestScore) {
      bestScore = score;
      best = name;
    }
  }
  // نقبل الاقتراح فقط عندما يكون الفرق صغيراً مقارنة بطول الكلمة
  const threshold = query.length <= 4 ? 1 : query.length <= 7 ? 2 : 3;
  return bestScore <= threshold ? best : null;
}

function formatCommand(cmd, prefix) {
  const args = cmd.args ? ` ${cmd.args}` : '';
  return `\`${prefix}${cmd.name}${args}\`${ROLE_BADGE[cmd.role] || ''}\n   ${cmd.ar}`;
}

/** نص قائمة فئة واحدة */
function renderCategory(catKey, prefix) {
  const cat = CATEGORIES[catKey];
  const items = byCategory(catKey);
  if (!cat || !items.length) return null;
  const body = items.map((c) => formatCommand(c, prefix)).join('\n\n');
  return `${cat.emoji} *${cat.ar}* — ${cat.en}\n${'─'.repeat(22)}\n\n${body}`;
}

/** يحاول التعرف على فئة من كلمة كتبها المستخدم (بالعربي أو الإنجليزي) */
const CATEGORY_KEYWORDS = {
  anime: ['انمي', 'أنمي', 'ترفيه', 'anime', 'fun'],
  games: ['العاب', 'ألعاب', 'لعبة', 'games', 'game'],
  islamic: ['اسلامي', 'إسلامية', 'اسلامية', 'islamic', 'دين'],
  tools: ['ادوات', 'أدوات', 'tools', 'utils', 'مفيدة'],
  media: ['ملصقات', 'وسائط', 'media', 'sticker', 'stickers'],
  group: ['مجموعات', 'قروب', 'ادارة', 'إدارة', 'group', 'admin'],
  logs: ['سجلات', 'مراقبة', 'تعديلات', 'محذوفات', 'logs'],
  owner: ['مالك', 'المالك', 'owner'],
};

function resolveCategory(word) {
  const w = (word || '').toLowerCase().trim();
  if (!w) return null;
  if (CATEGORIES[w]) return w;
  for (const [key, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((k) => k.toLowerCase() === w || w.includes(k.toLowerCase()))) return key;
  }
  return null;
}

module.exports = {
  CATEGORIES,
  COMMANDS,
  byCategory,
  allNames,
  suggestCommand,
  renderCategory,
  resolveCategory,
  formatCommand,
};
