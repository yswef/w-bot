const fs = require('fs');
const path = require('path');
const { getLastSeen } = require('../database/db');

// تحديث: قائمة شخصيات بلاك كلوفر مع أسماء وصور حقيقية
const blackCloverCharacters = [
  { name: 'أستا (Asta)', image: 'https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg' },
  { name: 'يامي سوكيهيرو (Yami)', image: 'https://i.pinimg.com/736x/43/66/dc/4366dcce596fc8eb3ddedae34f6ba6df.jpg' },
  { name: 'نويلي سيلفا (Noelle)', image: 'https://i.pinimg.com/736x/21/df/b6/21dfb6ba4f1c1fce727289569ed9aeb5.jpg' },
  { name: 'يونو (Yuno)', image: 'https://i.pinimg.com/736x/d6/f1/b7/d6f1b7d5e49eeebfceca8ccaf745a96f.jpg' },
  { name: 'ميريليونا (Mereoleona)', image: 'https://i.pinimg.com/736x/01/a0/0c/01a00cc91866ff3428d000cd23a544f8.jpg' },
  { name: 'جوليوس (Julius)', image: 'https://i.pinimg.com/736x/67/cc/d6/67ccd6abec7e928236d90a6e3cefe18c.jpg' },
  { name: 'فينرال (Finral)', image: 'https://i.pinimg.com/736x/0a/63/06/0a630623ec67a30ff16e3eb39dc75ee1.jpg' },
  { name: 'فانيسا (Vanessa)', image: 'https://i.pinimg.com/736x/95/9b/38/959b380feecfb6cdd2e08df2b9442ef5.jpg' },
  { name: 'تشارمي (Charmy)', image: 'https://i.pinimg.com/736x/ff/15/48/ff1548e6db966beab75083ece49efac9.jpg' },
  { name: 'لاك فولتيا (Luck)', image: 'https://i.pinimg.com/736x/46/7d/53/467d5320ec952e4baeda3fefff41e3d3.jpg' }
];

// تحديث: اقتباسات خاصه ببلاك كلوفر
const animeQuotes = [
  'حتى لو لم أكن أمتلك سحراً، سأصبح إمبراطور السحر! ✨',
  'تجاوز حدودك هنا والآن! ⚔️',
  'أنا لن أستسلم، هذا هو سحري! 🍀',
  'السحر ليس كل شيء، الإرادة هي ما تصنع الفارق 🌟',
  'في عالم السحر، من لا يملك القوة عليه أن يملك العزيمة 🔥'
];

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = async function funCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  // إصلاح: أمر انمي يرسل صورة الشخصية مع الاسم والمقولة
  if (commandKey === 'anime' || commandKey === 'انمي') {
    const character = getRandom(blackCloverCharacters);
    const text = `🌸 *مملكة كلوفر*\n\nشخصية الأنمي الخاصة بك اليوم:\n⚔️ *${character.name}*\n\n💬 "${getRandom(animeQuotes)}"`;

    try {
      await sock.sendMessage(chatId, { image: { url: character.image }, caption: text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(chatId, { text: text + '\n\n*(عذرا، تعذر تحميل الصورة من المصدر)*' }, { quoted: msg });
    }
    return;
  }

  // إصلاح: أمر زوجني يرسل صورة الشخصية واسمها بدلاً من النص فقط
  if (commandKey === 'زوجني') {
    const character = getRandom(blackCloverCharacters);
    const quote = getRandom(animeQuotes);
    const response = `💖 لقد تم اختيار شريك حياتك من عالم بلاك كلوفر!\n\n💍 زوجتك/زوجك الجميل(ة) هي/هو: *${character.name}* 🌸\n\n💬 ${quote}`;
    
    try {
      await sock.sendMessage(chatId, { image: { url: character.image }, caption: response }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(chatId, { text: response }, { quoted: msg });
    }
    return;
  }

  // الأمر القديم بقي كما هو دون تغيير
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
