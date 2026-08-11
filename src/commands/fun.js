const fs = require('fs');
const path = require('path');
const { getLastSeen } = require('../database/db');

const animeCharacters = [
  'ميريلي',
  'إيزو',
  'أساكا',
  'يوكيو',
  'أني',
  'إيلا',
  'ماكيو',
  'تسوباسا',
  'نيل',
  'لوسيفر',
];

const animeQuotes = [
  'زوجتك الجميلة هي شخصية أنمي ساحرة من عالم بلاك كلوفر ✨',
  'أنت الآن تحت حماية شخصية أنمي قوية ومشرقة 🌙',
  'تم اختيارك من قبل قلبٍ أنميٍّ يختار لك الأفضل 🌸',
];

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = async function funCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  if (commandKey === 'anime' || commandKey === 'انمي') {
    const imagePath = path.join(__dirname, '..', '..', 'media_store', 'anime-sample.png');
    const text = `🌸 *بلاك كلوفر*\n\nأنت الآن مع شخصية أنمي ساحرة:\n${getRandom(animeCharacters)}\n\n${getRandom(animeQuotes)}`;

    if (fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      await sock.sendMessage(chatId, { image: buffer, caption: text }, { quoted: msg });
    } else {
      await sock.sendMessage(chatId, { text }, { quoted: msg });
    }
    return;
  }

  if (commandKey === 'زوجني') {
    const character = getRandom(animeCharacters);
    const quote = getRandom(animeQuotes);
    const response = `💖 زوجتك الجميلة هي ${character} 🌸\n\n${quote}`;
    await sock.sendMessage(chatId, { text: response }, { quoted: msg });
    return;
  }

  if (commandKey === 'lastseen' || commandKey === 'آخر-مرة' || commandKey === 'آخرمرة') {
    const target = args[0] || senderId;
    const seen = getLastSeen(chatId, target);
    if (!seen) {
      await sock.sendMessage(chatId, { text: 'ℹ️ لا توجد بيانات لآخر مرة شوهدت فيها هذا الشخص.' }, { quoted: msg });
      return;
    }
    const date = new Date(seen.last_seen).toLocaleString('ar-SA');
    await sock.sendMessage(chatId, { text: `👀 آخر مرة شوهدت فيها ${target} كانت: ${date}` }, { quoted: msg });
  }
};
