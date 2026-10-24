// =============================================
// 🎲 أوامر تفاعلية ممتعة للمجموعات: مين؟ · خيّر · حظ · تقييم · لقب
// =============================================
// الأوامر تستخدم عشوائية، إلا تقييم ولقب فيُحسبان من (الشخص + اليوم)،
// فيعطيان نفس النتيجة طوال اليوم حتى لا يتلاعب أحد بالنتيجة بتكرار الأمر.

const { jidUser } = require('../utils/permissions');

const CHOICE_SPLIT = /\s*(?:،|,|\s+أو\s+|\s+او\s+|\s+ولا\s+|\s*\|\s*)\s*/u;

/** يفصل خيارات الأمر "خيّر" — مثال: "قهوة، شاي أو عصير" */
function splitChoices(text) {
  return String(text || '')
    .split(CHOICE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** تجزئة نصية بسيطة وثابتة (FNV-1a) لإنتاج بذرة رقمية */
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** اليوم بتوقيت البوت (YYYY-MM-DD) */
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** اختيار ثابت من قائمة حسب البذرة */
function pickSeeded(seed, list) {
  return list[seed % list.length];
}

/** شريط حظ من 10 خانات لنسبة 0–100 */
function luckBar(pct) {
  const filled = Math.round(Math.max(0, Math.min(100, pct)) / 10);
  return '🟩'.repeat(filled) + '⬜'.repeat(10 - filled);
}

const LUCK_COMMENTS = [
  [90, 'حظك يشع اليوم كالنجوم! ✨'],
  [70, 'يوم قوي، استثمره بذكاء 💪'],
  [40, 'متوسط… لا تراهن على كل شي 🎲'],
  [0, 'اليوم الأفضل له نوم مبكر 😴'],
];
function luckComment(pct) {
  return (LUCK_COMMENTS.find(([min]) => pct >= min) || LUCK_COMMENTS[LUCK_COMMENTS.length - 1])[1];
}

const RATING_COMMENTS = [
  [9, 'أسطورة! 🏆'],
  [7, 'ممتاز، بس لا تغرّ 😎'],
  [5, 'مقبول، وفيه مجال للتحسين 🙂'],
  [0, 'تحتاج تدريب أكثر 😅'],
];

const TITLE_PREFIX = ['سلطان', 'أمير', 'بطل', 'فيلسوف', 'ملك', 'حكيم', 'نجم', 'مغامر', 'وحش', 'قائد'];
const TITLE_SUFFIX = ['الكيبورد', 'الضحك', 'المطبخ', 'النوم', 'الشاورما', 'الطرطشة', 'القهوة', 'الستوريات', 'المواعيد المتأخرة', 'التقليب'];

function userLabel(jid) {
  return `@${jidUser(jid) || String(jid).split('@')[0]}`;
}

module.exports = async function socialCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  const reply = (text, mentions = []) =>
    sock.sendMessage(chatId, { text, mentions }, { quoted: msg });
  const isGroup = chatId.endsWith('@g.us');
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  // 👥 .مين <سؤال> — يختار عضواً عشوائياً من المجموعة
  if (['مين', 'who'].includes(commandKey)) {
    if (!isGroup) return reply('👥 هذا الأمر يعمل داخل المجموعات فقط.');
    let participants = [];
    try {
      const meta = await sock.groupMetadata(chatId);
      participants = (meta?.participants || []).map((p) => p.id).filter(Boolean);
    } catch {
      return reply('⚠️ تعذّر قراءة أعضاء المجموعة الآن.');
    }
    if (!participants.length) return reply('⚠️ لا يوجد أعضاء لعرضهم.');
    const pick = participants[Math.floor(Math.random() * participants.length)];
    const question = args.join(' ').trim();
    const head = question ? `❓ *${question}*\n\n` : '';
    return reply(`${head}🎯 الاختيار وقع على: ${userLabel(pick)}`, [pick]);
  }

  // 🎯 .خيّر خيار1، خيار2، خيار3 — يختار خياراً بعشوائية
  if (['خيّر', 'خير', 'choose'].includes(commandKey)) {
    const options = splitChoices(args.join(' '));
    if (options.length < 2) {
      return reply('🎯 اكتب خيارين أو أكثر مفصولة بـ «،» أو «أو».\nمثال: `.خيّر قهوة، شاي، عصير`');
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    return reply(`🎯 اخترت لك: *${pick}*`);
  }

  // 🍀 .حظ [سؤال] — مقياس حظ اليوم (ثابت لكل شخص خلال اليوم)
  if (['حظ', 'luck'].includes(commandKey)) {
    const seed = hashSeed(`${senderId}|${todayKey()}|luck`);
    const pct = seed % 101;
    const question = args.join(' ').trim();
    const head = question ? `❓ ${question}\n\n` : '';
    return reply(`${head}🍀 حظك اليوم: *${pct}%*\n${luckBar(pct)}\n${luckComment(pct)}`);
  }

  // ⭐ .تقييم [@شخص] — تقييم من 10 (ثابت لنفس الشخص خلال اليوم)
  if (['تقييم', 'rate'].includes(commandKey)) {
    const target = mentioned[0] || senderId;
    const seed = hashSeed(`${target}|${todayKey()}|rate`);
    const score = (seed % 101) / 10; // 0.0 – 10.0
    const comment = RATING_COMMENTS.find(([min]) => score >= min)[1];
    return reply(
      `⭐ تقييم ${userLabel(target)}: *${score.toFixed(1)}/10*\n${comment}`,
      [target]
    );
  }

  // 🏷️ .لقب [@شخص] — لقب مضحك (ثابت خلال اليوم)
  if (['لقب', 'title'].includes(commandKey)) {
    const target = mentioned[0] || senderId;
    const seed = hashSeed(`${target}|${todayKey()}|title`);
    const prefix = pickSeeded(seed, TITLE_PREFIX);
    const suffix = pickSeeded(seed >>> 8, TITLE_SUFFIX);
    return reply(`🏷️ لقب ${userLabel(target)} اليوم: *${prefix} ${suffix}* 👑`, [target]);
  }
};

module.exports.splitChoices = splitChoices;
module.exports.hashSeed = hashSeed;
module.exports.luckBar = luckBar;
module.exports.luckComment = luckComment;
module.exports.todayKey = todayKey;
