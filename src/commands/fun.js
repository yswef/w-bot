const { getLastSeen } = require('../database/db');

// شخصيات ذكور معروفة (تُستخدم مع أمر .زوج)
const maleCharacters = [
  { name: 'أستا (Asta)', image: 'https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg' },
  { name: 'يامي سوكيهيرو (Yami)', image: 'https://i.pinimg.com/736x/43/66/dc/4366dcce596fc8eb3ddedae34f6ba6df.jpg' },
  { name: 'يونو (Yuno)', image: 'https://i.pinimg.com/736x/d6/f1/b7/d6f1b7d5e49eeebfceca8ccaf745a96f.jpg' },
  { name: 'جوليوس (Julius)', image: 'https://i.pinimg.com/736x/67/cc/d6/67ccd6abec7e928236d90a6e3cefe18c.jpg' },
  { name: 'فينرال (Finral)', image: 'https://i.pinimg.com/736x/0a/63/06/0a630623ec67a30ff16e3eb39dc75ee1.jpg' },
  { name: 'لاك فولتيا (Luck)' },
  { name: 'ناروتو (Naruto)' },
  { name: 'ساسكي (Sasuke)' },
  { name: 'لوفي (Luffy)' },
  { name: 'زورو (Zoro)' },
  { name: 'غوكو (Goku)' },
  { name: 'إيتشيغو (Ichigo)' },
  { name: 'ناتسو (Natsu)' },
  { name: 'إيرين (Eren)' },
  { name: 'ليفاي (Levi)' },
];

// شخصيات إناث معروفة (تُستخدم مع أمر .زوجة)
const femaleCharacters = [
  { name: 'نويلي سيلفا (Noelle)', image: 'https://i.pinimg.com/736x/21/df/b6/21dfb6ba4f1c1fce727289569ed9aeb5.jpg' },
  { name: 'ميريليونا (Mereoleona)', image: 'https://i.pinimg.com/736x/01/a0/0c/01a00cc91866ff3428d000cd23a544f8.jpg' },
  { name: 'فانيسا (Vanessa)', image: 'https://i.pinimg.com/736x/95/9b/38/959b380feecfb6cdd2e08df2b9442ef5.jpg' },
  { name: 'تشارمي (Charmy)', image: 'https://i.pinimg.com/736x/ff/15/48/ff1548e6db966beab75083ece49efac9.jpg' },
  { name: 'ساكورا (Sakura)' },
  { name: 'نامي (Nami)' },
  { name: 'هيناتا (Hinata)' },
  { name: 'روكيا (Rukia)' },
  { name: 'إيرزا (Erza)' },
  { name: 'لوسي (Lucy)' },
  { name: 'ميكاسا (Mikasa)' },
  { name: 'أسونا (Asuna)' },
];

// كل الشخصيات مجتمعة (لأمر .زوجني العام)
const blackCloverCharacters = [...maleCharacters, ...femaleCharacters];

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

async function fetchImageSafe(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000); // 8s timeout
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg, image/png, image/webp'
      }
    });
    if (!res.ok) throw new Error('Bad status: ' + res.status);
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Not an image. Content-Type: ' + contentType);
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('Image too large (> 5MB)');
    return Buffer.from(buffer);
  } finally {
    clearTimeout(id);
  }
}

async function sendMarriageResult(sock, msg, chatId, character, title) {
  const quote = getRandom(animeQuotes);
  const response = `💖 ${title}\n\n💍 الشريك المختار هو: *${character.name}* 🌸\n\n💬 ${quote}`;
  if (character.image) {
    try {
      const imgBuffer = await fetchImageSafe(character.image);
      await sock.sendMessage(chatId, { image: imgBuffer, caption: response }, { quoted: msg });
      return;
    } catch {
      // نكمل بالنص فقط إن فشل تحميل الصورة
    }
  }
  await sock.sendMessage(chatId, { text: response }, { quoted: msg });
}

module.exports = async function funCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  // إصلاح: أمر انمي يرسل صورة الشخصية مع الاسم والمقولة
  if (commandKey === 'anime' || commandKey === 'انمي') {
    try {
      const res = await fetch('https://api.jikan.moe/v4/random/characters');
      const data = await res.json();
      const char = data.data;
      const text = `🌸 *مملكة الأنمي*\n\nشخصية الأنمي الخاصة بك اليوم:\n⚔️ *${char.name}*\n${char.name_kanji ? `(${char.name_kanji})\n` : ''}\n💬 "${getRandom(animeQuotes)}"`;
      const imageUrl = char.images.jpg.image_url;

      try {
        const imgBuffer = await fetchImageSafe(imageUrl);
        await sock.sendMessage(chatId, { image: imgBuffer, caption: text }, { quoted: msg });
      } catch (imgErr) {
        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: text }, { quoted: msg });
      }
    } catch (err) {
      // Fallback in case of Jikan API failure or rate limit
      const character = getRandom(blackCloverCharacters);
      const text = `🌸 *مملكة كلوفر*\n\nشخصية الأنمي الخاصة بك اليوم:\n⚔️ *${character.name}*\n\n💬 "${getRandom(animeQuotes)}"`;
      await sock.sendMessage(chatId, { text: text + '\n\n*(عذرا، السحر الخاص بي لم يتمكن من جلب الصورة! 💥)*' }, { quoted: msg });
    }
    return;
  }

  // ===== زوجني (عام - أي شخصية) =====
  if (commandKey === 'زوجني') {
    try {
      const res = await fetch('https://api.jikan.moe/v4/random/characters');
      const data = await res.json();
      const char = data.data;
      await sendMarriageResult(sock, msg, chatId, { name: char.name, image: char.images?.jpg?.image_url }, 'لقد تم اختيار شريك حياتك من عالم الأنمي!');
    } catch (err) {
      const character = getRandom(blackCloverCharacters);
      await sendMarriageResult(sock, msg, chatId, character, 'لقد تم اختيار شريك حياتك من عالم بلاك كلوفر!');
    }
    return;
  }

  // ===== زوج (شخصية ذكر) =====
  if (commandKey === 'زوج') {
    const character = getRandom(maleCharacters);
    await sendMarriageResult(sock, msg, chatId, character, 'زوجك السحري هو:');
    return;
  }

  // ===== زوجة (شخصية أنثى) =====
  if (commandKey === 'زوجة') {
    const character = getRandom(femaleCharacters);
    await sendMarriageResult(sock, msg, chatId, character, 'زوجتك السحرية هي:');
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
