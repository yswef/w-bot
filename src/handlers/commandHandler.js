const config = require('../config');
const logger = require('../utils/logger');

// كل ملف داخل commands/ يمثل أمر مستقل - أضف ملف جديد وسجّله هنا
const commands = {
  ping: require('../commands/ping'),
  sticker: require('../commands/sticker'),
  ملصق: require('../commands/sticker'),
  info: require('../commands/info'),
  مساعدة: require('../commands/info'),
  anime: require('../commands/fun'),
  انمي: require('../commands/fun'),
  زوجني: require('../commands/fun'),
  lastseen: require('../commands/fun'),
  'آخر-مرة': require('../commands/fun'),
  'آخرمرة': require('../commands/fun'),
  رد: require('../commands/admin'),
  حذفرد: require('../commands/admin'),
  ترحيب: require('../commands/admin'),
  لوحة: require('../commands/admin'),
  جلسات: require('../commands/admin'),
  اعادةربط: require('../commands/admin'),
  reconnect: require('../commands/admin'),
  بث: require('../commands/admin'),
  لعبة: require('../commands/games'),
  game: require('../commands/games'),
  أفكاري: require('../commands/games'),
  guess: require('../commands/games'),
};

async function handleCommand({ sock, msg, text, chatId, senderId }) {
  const withoutPrefix = text.slice(config.prefix.length).trim();
  const [cmdName, ...args] = withoutPrefix.split(/\s+/);
  const commandKey = cmdName ? cmdName.toLowerCase() : '';

  const command = commands[commandKey];
  if (!command) {
    logger.info(`أمر غير معروف: ${commandKey}`);
    return;
  }

  try {
    await command({ sock, msg, args, chatId, senderId, commandKey });
  } catch (err) {
    logger.error(`فشل تنفيذ الأمر ${commandKey}: ${err.message}`);
    await sock.sendMessage(chatId, { text: '⚠️ صار خطأ أثناء تنفيذ الأمر.' }, { quoted: msg });
  }
}

module.exports = handleCommand;
