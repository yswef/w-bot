const config = require('../config');
const logger = require('../utils/logger');

// =============================================
// 🧩 مسجل الأوامر الرئيسي - أضف ملف جديد وسجّله هنا
// =============================================
const commands = {
  // --- أوامر عامة ---
  ping: require('../commands/ping'),
  sticker: require('../commands/sticker'),
  ملصق: require('../commands/sticker'),
  info: require('../commands/info'),
  مساعدة: require('../commands/info'),
  help: require('../commands/info'),

  // --- أوامر الأنمي والترفيه ---
  anime: require('../commands/fun'),
  انمي: require('../commands/fun'),
  زوجني: require('../commands/fun'),
  lastseen: require('../commands/fun'),
  'آخر-مرة': require('../commands/fun'),
  آخرمرة: require('../commands/fun'),

  // --- ألعاب بلاك كلوفر ---
  لعبة: require('../commands/games'),
  game: require('../commands/games'),
  أفكاري: require('../commands/games'),
  حجر: require('../commands/games'),
  ورقه: require('../commands/games'),
  مقص: require('../commands/games'),
  تخمين: require('../commands/games'),
  اخمن: require('../commands/games'),

  // --- أوامر إسلامية ---
  آية: require('../commands/islamic'),
  aaya: require('../commands/islamic'),
  ذكر: require('../commands/islamic'),
  thikr: require('../commands/islamic'),
  'جدول-ذكر': require('../commands/islamic'),
  'جدول-آية': require('../commands/islamic'),
  'إيقاف-جدول': require('../commands/islamic'),

  // --- أوامر المجموعات ---
  طرد: require('../commands/groupAdmin'),
  kick: require('../commands/groupAdmin'),
  ترقية: require('../commands/groupAdmin'),
  promote: require('../commands/groupAdmin'),
  تخفيض: require('../commands/groupAdmin'),
  demote: require('../commands/groupAdmin'),
  قفل: require('../commands/groupAdmin'),
  lock: require('../commands/groupAdmin'),
  فتح: require('../commands/groupAdmin'),
  unlock: require('../commands/groupAdmin'),
  الكل: require('../commands/groupAdmin'),
  احية: require('../commands/groupAdmin'),
  all: require('../commands/groupAdmin'),
  'معلومات-مجموعة': require('../commands/groupAdmin'),
  groupinfo: require('../commands/groupAdmin'),

  // --- أوامر المالك ---
  صيانة: require('../commands/owner'),
  maintenance: require('../commands/owner'),
  stats: require('../commands/owner'),
  احصائيات: require('../commands/owner'),

  // --- أوامر الإدارة ---
  رد: require('../commands/admin'),
  حذفرد: require('../commands/admin'),
  ترحيب: require('../commands/admin'),
  جلسات: require('../commands/admin'),
  اعادةربط: require('../commands/admin'),
  reconnect: require('../commands/admin'),
  بث: require('../commands/admin'),

  // --- أوامر متنوعة ---
  حب: require('../commands/extras'),
  love: require('../commands/extras'),
  سعر: require('../commands/extras'),
  currency: require('../commands/extras'),
  ترجم: require('../commands/extras'),
  translate: require('../commands/extras'),
  استطلاع: require('../commands/extras'),
  poll: require('../commands/extras'),
  نكتة: require('../commands/extras'),
  joke: require('../commands/extras'),
  اقتباس: require('../commands/extras'),
  quote: require('../commands/extras'),

  // --- أوامر الأنمي المتقدمة ---
  انميات: require('../commands/animeNews'),
  موسم: require('../commands/animeNews'),
  'بحث-انمي': require('../commands/animeNews'),
  searchanime: require('../commands/animeNews'),
  'نشرة-انمي': require('../commands/animeNews'),
  'إيقاف-نشرة': require('../commands/animeNews'),

  // --- أدوات عامة ---
  طقس: require('../commands/utils'),
  weather: require('../commands/utils'),
  ويكي: require('../commands/utils'),
  wiki: require('../commands/utils'),
  'تفعيل-بوت': require('../commands/utils'),
  'إيقاف-بوت': require('../commands/utils'),
  سلسلة: require('../commands/utils'),
};

async function handleCommand({ sock, msg, text, chatId, senderId }) {
  const withoutPrefix = text.slice(config.prefix.length).trim();
  const [cmdName, ...args] = withoutPrefix.split(/\s+/);
  const commandKey = cmdName ? cmdName : '';

  const command = commands[commandKey];
  if (!command) {
    logger.info(`أمر غير معروف: ${commandKey}`);
    return;
  }

  try {
    await command({ sock, msg, args, chatId, senderId, commandKey });
  } catch (err) {
    logger.error(`[Command Error] Command: ${commandKey}, User: ${senderId}, Error: ${err.message}\n${err.stack}`);
    await sock.sendMessage(chatId, { text: '💥 أستا متعب الان بعد كل هذا الجهد... ولكن أستا لن يستسلم يوماً! هناك خلل سحري صغير.' }, { quoted: msg });
  }
}

module.exports = handleCommand;
