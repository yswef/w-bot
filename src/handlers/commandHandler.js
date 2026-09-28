const config = require('../config');
const logger = require('../utils/logger');
const responses = require('../utils/responses');
const { isBanned } = require('../database/db');
const { suggestCommand } = require('../commands/registry');

// =============================================
// 🧩 مسجل الأوامر الرئيسي - أضف ملف جديد وسجّله هنا
// =============================================
const commands = {
  // --- أوامر عامة ---
  ping: require('../commands/ping'),
  sticker: require('../commands/sticker'),
  ملصق: require('../commands/sticker'),
  سرقة: require('../commands/sticker'),
  steal: require('../commands/sticker'),
  info: require('../commands/info'),
  مساعدة: require('../commands/info'),
  help: require('../commands/info'),
  اوامر: require('../commands/info'),
  الاوامر: require('../commands/info'),
  أوامر: require('../commands/info'),
  menu: require('../commands/info'),
  commands: require('../commands/info'),

  // --- أوامر الأنمي والترفيه ---
  anime: require('../commands/fun'),
  انمي: require('../commands/fun'),
  زوج: require('../commands/fun'),
  زوجة: require('../commands/fun'),
  شخصية: require('../commands/fun'),
  character: require('../commands/fun'),
  شخصيات: require('../commands/fun'),
  characters: require('../commands/fun'),
  lastseen: require('../commands/fun'),
  'آخر-مرة': require('../commands/fun'),
  آخرمرة: require('../commands/fun'),

  // --- ألعاب بلاك كلوفر ---
  لعبة: require('../commands/games'),
  game: require('../commands/games'),
  حجر: require('../commands/games'),
  ورقه: require('../commands/games'),
  مقص: require('../commands/games'),
  تخمين: require('../commands/games'),
  اخمن: require('../commands/games'),
  سؤال: require('../commands/games'),
  trivia: require('../commands/games'),
  جواب: require('../commands/games'),
  answer: require('../commands/games'),
  فعالية: require('../commands/games'),
  تفكيك: require('../commands/games'),
  event: require('../commands/games'),
  ايقاف_فعالية: require('../commands/games'),
  كشف: require('../commands/games'),
  reveal: require('../commands/games'),
  تخطي: require('../commands/games'),
  skip: require('../commands/games'),

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
  'منع-الروابط': require('../commands/groupAdmin'),
  antilink: require('../commands/groupAdmin'),
  welcome: require('../commands/groupAdmin'),
  جدولة: require('../commands/groupAdmin'),
  حظر: require('../commands/groupAdmin'),
  ban: require('../commands/groupAdmin'),
  'رفع-حظر': require('../commands/groupAdmin'),
  unban: require('../commands/groupAdmin'),
  المحظورين: require('../commands/groupAdmin'),
  banlist: require('../commands/groupAdmin'),
  تنبيه: require('../commands/groupAdmin'),
  همسة: require('../commands/groupAdmin'),
  منشن: require('../commands/groupAdmin'),
  ضد_التعديل: require('../commands/groupAdmin'),
  'ضد-التعديل': require('../commands/groupAdmin'),
  antiedit: require('../commands/groupAdmin'),

  // --- أوامر المالك ---
  صيانة: require('../commands/owner'),
  maintenance: require('../commands/owner'),
  stats: require('../commands/owner'),
  احصائيات: require('../commands/owner'),

  // --- أوامر الإدارة ---
  تفاعل: require('../commands/admin'),
  حذفتفاعل: require('../commands/admin'),
  رد: require('../commands/admin'),
  حذفرد: require('../commands/admin'),
  ترحيب: require('../commands/admin'),
  لوحة: require('../commands/admin'),
  dashboard: require('../commands/admin'),
  panel: require('../commands/admin'),
  جلسات: require('../commands/admin'),
  اعادةربط: require('../commands/admin'),
  reconnect: require('../commands/admin'),
  بث: require('../commands/admin'),

  // --- سجل التعديلات والحذف ---
  تعديلات: require('../commands/history'),
  edits: require('../commands/history'),
  محذوفات: require('../commands/history'),
  deleted: require('../commands/history'),

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

  // --- التذكيرات ---
  تذكير: require('../commands/reminder'),
  reminder: require('../commands/reminder'),
  remind: require('../commands/reminder'),

  // --- تشخيص الهوية/الصلاحيات ---
  ايدي: require('../commands/whoami'),
  معرفي: require('../commands/whoami'),
  myid: require('../commands/whoami'),
  whoami: require('../commands/whoami'),

  // --- التواصل مع المطور ---
  تواصل: require('../commands/developer'),
  المطور: require('../commands/developer'),
  developer: require('../commands/developer'),
  contact: require('../commands/developer'),
};

// ⚠️ إصلاح: كانت هذه الدالة تتحقق فقط من config.ownerNumbers، وبالتالي
// الأدمن الثاني (secondAdminNumber) كان يُعامل كمستخدم عادي في: تجاوز
// وضع الصيانة، حماية الروابط (anti-link)، وتجاوز الحظر. الآن تشمل
// config.adminNumbers (كل المالكين + الأدمن الثاني).
function isOwnerId(senderId) {
  const owners = config.adminNumbers || config.ownerNumbers || [config.ownerNumber];
  const digits = (senderId || '').replace(/\D/g, '');
  return owners.some((o) => o && digits.includes(o));
}

async function handleCommand({ sock, msg, text, chatId, senderId }) {
  const withoutPrefix = text.slice(config.prefix.length).trim();
  const [cmdName, ...args] = withoutPrefix.split(/\s+/);
  const commandKey = cmdName ? cmdName : '';

  // 📖 إرسال البادئة وحدها (مثل ".") يعرض قائمة الأوامر مباشرة
  // كان المستخدم لا يجد أي طريقة لاكتشاف الأوامر، والآن أبسط محاولة تنجح.
  if (!commandKey) {
    await commands['مساعدة']({ sock, msg, args: [], chatId, senderId, commandKey: 'مساعدة' });
    return;
  }

  const command = commands[commandKey];
  if (!command) {
    logger.info(`أمر غير معروف: ${commandKey}`);
    // 🤔 "هل تقصد…؟" — اقتراح أقرب أمر بدل تجاهل المستخدم بصمت
    const suggestion = suggestCommand(commandKey);
    const hint = suggestion
      ? `🤔 ما فيه أمر اسمه \`${config.prefix}${commandKey}\`.\nهل تقصد \`${config.prefix}${suggestion}\`؟`
      : `🤔 ما فيه أمر اسمه \`${config.prefix}${commandKey}\`.`;
    try {
      await sock.sendMessage(chatId, {
        text: `${hint}\n\n📖 اكتب \`${config.prefix}مساعدة\` لعرض كل الأوامر.`,
      }, { quoted: msg });
    } catch (err) {
      logger.warn('تعذر إرسال اقتراح الأمر: ' + err.message);
    }
    return;
  }

  // 🚫 نظام الحظر - المحظورون لا يستطيعون استخدام أي أمر (باستثناء المالك)
  if (!isOwnerId(senderId) && isBanned(senderId)) {
    await sock.sendMessage(chatId, { text: responses.get('persona', 'banned') }, { quoted: msg });
    return;
  }

  try {
    await command({ sock, msg, args, chatId, senderId, commandKey });
    // 🤖 تفاعل تلقائي عند نجاح تنفيذ أي أمر
    try {
      await sock.sendMessage(chatId, { react: { text: responses.get('persona', 'auto_react') || '🤖', key: msg.key } });
    } catch (reactErr) {
      logger.warn('تعذر إرسال تفاعل النجاح: ' + reactErr.message);
    }
  } catch (err) {
    logger.error(`[Command Error] Command: ${commandKey}, User: ${senderId}, Error: ${err.message}\n${err.stack}`);
    await sock.sendMessage(chatId, { text: responses.get('persona', 'error_generic') }, { quoted: msg });
  }
}

module.exports = handleCommand;
module.exports.isOwnerId = isOwnerId;
