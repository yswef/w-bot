const config = require('../config');
const logger = require('../utils/logger');

// كل ملف داخل commands/ يمثل أمر مستقل - أضف ملف جديد وسجّله هنا
const commands = {
  ping: require('../commands/ping'),
  sticker: require('../commands/sticker'),
  ملصق: require('../commands/sticker'), // نفس أمر الملصق بس بالعربي
  info: require('../commands/info'),
  مساعدة: require('../commands/info'),
};

async function handleCommand({ sock, msg, text, chatId, senderId }) {
  const withoutPrefix = text.slice(config.prefix.length).trim();
  const [cmdName, ...args] = withoutPrefix.split(/\s+/);
  const commandKey = cmdName.toLowerCase();

  const command = commands[commandKey];
  if (!command) {
    logger.info(`أمر غير معروف: ${commandKey}`);
    return;
  }

  try {
    await command({ sock, msg, args, chatId, senderId });
  } catch (err) {
    logger.error(`فشل تنفيذ الأمر ${commandKey}: ${err.message}`);
    await sock.sendMessage(chatId, { text: '⚠️ صار خطأ أثناء تنفيذ الأمر.' }, { quoted: msg });
  }
}

module.exports = handleCommand;
