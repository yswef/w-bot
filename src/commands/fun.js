const { getLastSeen, getCachedCharacterImage, setCachedCharacterImage } = require('../database/db');
const logger = require('../utils/logger');

// شخصيات بلاك كلوفر الأصلية (روابط صور ثابتة موثوقة) - تُستخدم حصرياً
// مع تسمية "مملكة كلوفر" حتى لا يحدث خلط مع شخصيات مسلسلات أخرى
const blackCloverMales = [
  { name: 'أستا (Asta)', image: 'https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg', universe: 'blackclover' },
  { name: 'يامي سوكيهيرو (Yami)', image: 'https://i.pinimg.com/736x/43/66/dc/4366dcce596fc8eb3ddedae34f6ba6df.jpg', universe: 'blackclover' },
  { name: 'يونو (Yuno)', image: 'https://i.pinimg.com/736x/d6/f1/b7/d6f1b7d5e49eeebfceca8ccaf745a96f.jpg', universe: 'blackclover' },
  { name: 'جوليوس (Julius)', image: 'https://i.pinimg.com/736x/67/cc/d6/67ccd6abec7e928236d90a6e3cefe18c.jpg', universe: 'blackclover' },
  { name: 'فينرال (Finral)', image: 'https://i.pinimg.com/736x/0a/63/06/0a630623ec67a30ff16e3eb39dc75ee1.jpg', universe: 'blackclover' },
];

const blackCloverFemales = [
  { name: 'نويلي سيلفا (Noelle)', image: 'https://i.pinimg.com/736x/21/df/b6/21dfb6ba4f1c1fce727289569ed9aeb5.jpg', universe: 'blackclover' },
  { name: 'ميريليونا (Mereoleona)', image: 'https://i.pinimg.com/736x/01/a0/0c/01a00cc91866ff3428d000cd23a544f8.jpg', universe: 'blackclover' },
  { name: 'فانيسا (Vanessa)', image: 'https://i.pinimg.com/736x/95/9b/38/959b380feecfb6cdd2e08df2b9442ef5.jpg', universe: 'blackclover' },
  { name: 'تشارمي (Charmy)', image: 'https://i.pinimg.com/736x/ff/15/48/ff1548e6db966beab75083ece49efac9.jpg', universe: 'blackclover' },
];

// شخصيات معروفة وآمنة (بطلات/أبطال شونين مشهورون) من مسلسلات أخرى - بدون
// رابط صورة ثابت، تُجلب صورتها الحقيقية تلقائياً وقت الطلب (انظر
// getCharacterImageUrl) بدل حفظ روابط قد تنكسر مع الوقت.
const otherAnimeMales = [
  { name: 'لاك فولتيا (Luck)', universe: 'other' },
  { name: 'ناروتو (Naruto)', universe: 'other' },
  { name: 'ساسكي (Sasuke)', universe: 'other' },
  { name: 'لوفي (Luffy)', universe: 'other' },
  { name: 'زورو (Zoro)', universe: 'other' },
  { name: 'غوكو (Goku)', universe: 'other' },
  { name: 'إيتشيغو (Ichigo)', universe: 'other' },
  { name: 'ناتسو (Natsu)', universe: 'other' },
  { name: 'إيرين (Eren)', universe: 'other' },
  { name: 'ليفاي (Levi)', universe: 'other' },
];

const otherAnimeFemales = [
  { name: 'ساكورا (Sakura)', universe: 'other' },
  { name: 'نامي (Nami)', universe: 'other' },
  { name: 'هيناتا (Hinata)', universe: 'other' },
  { name: 'روكيا (Rukia)', universe: 'other' },
  { name: 'إيرزا (Erza)', universe: 'other' },
  { name: 'لوسي (Lucy)', universe: 'other' },
  { name: 'ميكاسا (Mikasa)', universe: 'other' },
  { name: 'أسونا (Asuna)', universe: 'other' },
];

// القوائم الكاملة المستخدمة في أوامر .زوج/.زوجة/.انمي
const maleCharacters = [...blackCloverMales, ...otherAnimeMales];
const femaleCharacters = [...blackCloverFemales, ...otherAnimeFemales];
const blackCloverCharacters = [...blackCloverMales, ...blackCloverFemales];
const allCharacters = [...maleCharacters, ...femaleCharacters];

// اقتباسات بلاك كلوفر - تُستخدم فقط مع شخصيات بلاك كلوفر الحقيقية
const blackCloverQuotes = [
  'حتى لو لم أكن أمتلك سحراً، سأصبح إمبراطور السحر! ✨',
  'تجاوز حدودك هنا والآن! ⚔️',
  'أنا لن أستسلم، هذا هو سحري! 🍀',
];

// اقتباسات عامة محايدة - لا تنسب لمسلسل معين، تصلح لأي شخصية أنمي أخرى
const genericAnimeQuotes = [
  'الإرادة هي ما تصنع الفارق 🌟',
  'كل بطل بدأ يوماً من نقطة الصفر 🔥',
  'المغامرة الحقيقية تبدأ من هنا! 🌸',
];

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// يستخرج الاسم الإنجليزي من صيغة "الاسم بالعربي (English Name)"
function extractEnglishName(displayName) {
  const match = displayName.match(/\(([^)]+)\)/);
  return match ? match[1] : displayName;
}

// ذاكرة تخزين مؤقت داخل الجلسة الحالية أيضاً (طبقة أولى أسرع من قاعدة البيانات)
const characterImageCache = new Map();

// ⚠️ إصلاح: كنا نستخدم Jikan API (api.jikan.moe) لجلب صورة الشخصية عند
// الطلب، لكن تبيّن أنه غير موثوق بشكل متكرر من استضافة Railway (يرجع
// أخطاء 502/503/504 كثيراً - نفس المشكلة التي رأيناها مع أمر الأخبار).
// الآن نستخدم AniList (graphql.anilist.co) وهو أكثر استقراراً بكثير،
// ونُخزّن كل نتيجة ناجحة بشكل دائم في قاعدة البيانات (وليس فقط في
// الذاكرة المؤقتة) حتى لا نحتاج طلب نفس الشخصية مرتين أبداً طوال عمر
// البوت، حتى لو أعيد تشغيله.
async function getCharacterImageUrl(displayName) {
  const englishName = extractEnglishName(displayName);

  if (characterImageCache.has(englishName)) {
    return characterImageCache.get(englishName);
  }

  const dbCached = getCachedCharacterImage(englishName);
  if (dbCached !== undefined) {
    characterImageCache.set(englishName, dbCached);
    return dbCached; // قد تكون null (بحثنا سابقاً ولم نجد) أو رابط صورة حقيقي
  }

  const attempt = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query ($search: String) { Character(search: $search) { image { large } } }`,
          variables: { search: englishName },
        }),
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.statusCode = res.status;
        throw err;
      }
      const data = await res.json();
      return data?.data?.Character?.image?.large || null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let url = null;
  try {
    url = await attempt();
  } catch (err) {
    if ([429, 500, 502, 503, 504].includes(err.statusCode)) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        url = await attempt();
      } catch (err2) {
        logger.warn(`فشل جلب صورة الشخصية "${englishName}" من AniList بعد إعادة المحاولة: ${err2.message}`);
      }
    } else {
      logger.warn(`فشل جلب صورة الشخصية "${englishName}" من AniList: ${err.message}`);
    }
  }

  characterImageCache.set(englishName, url);
  // نخزّن في قاعدة البيانات حتى لو null (بحث فاشل)، لتفادي إعادة محاولة
  // فورية لنفس الاسم؛ يمكن حذف السجل يدوياً لاحقاً إذا أردنا إعادة المحاولة
  setCachedCharacterImage(englishName, url);
  return url;
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

// يبني ويرسل نتيجة اختيار شخصية (مستخدَم في .زوج / .زوجة / .انمي)
// إذا لم تملك الشخصية رابط صورة ثابت، يحاول جلب واحد ديناميكياً باسمها
async function sendCharacterResult(sock, msg, chatId, character, title) {
  const quotePool = character.universe === 'blackclover' ? blackCloverQuotes : genericAnimeQuotes;
  const quote = getRandom(quotePool);
  const response = `${title}\n\n⚔️ *${character.name}* 🌸\n\n💬 ${quote}`;

  const imageUrl = character.image || (await getCharacterImageUrl(character.name));

  if (imageUrl) {
    try {
      const imgBuffer = await fetchImageSafe(imageUrl);
      await sock.sendMessage(chatId, { image: imgBuffer, caption: response }, { quoted: msg });
      return;
    } catch {
      // محاولة ثانية: نترك واتساب نفسه يجلب الصورة من الرابط مباشرة
      // بدل تحميلها نحن أولاً - أحياناً تنجح رغم فشل التحميل اليدوي
      try {
        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: response }, { quoted: msg });
        return;
      } catch {
        await sock.sendMessage(chatId, { text: response + '\n\n*(تعذر تحميل الصورة هذه المرة 💥)*' }, { quoted: msg });
        return;
      }
    }
  }
  // لا توجد صورة متاحة أصلاً لهذه الشخصية - لا داعي لادعاء وجود خطأ في التحميل
  await sock.sendMessage(chatId, { text: response }, { quoted: msg });
}

module.exports = async function funCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  // ⚠️ إصلاح شامل لأمر .انمي: كان يعتمد على شخصية عشوائية بالكامل من
  // خارج المسلسل (Jikan API) قد تكون من أي عمل - بما فيه أعمال غير مناسبة
  // لمجموعة عامة - وكان يفشل أحياناً بسبب بطء/تعطل ذلك الـ API. الآن يختار
  // من قائمتنا المحلية المُنسّقة (شخصيات شونين معروفة ومناسبة للجميع)، وتُجلب
  // صورة الشخصية الحقيقية بشكل موثوق مع إعادة محاولة عند الحاجة.
  if (commandKey === 'anime' || commandKey === 'انمي') {
    const character = getRandom(allCharacters);
    const title = character.universe === 'blackclover' ? '🌸 *مملكة كلوفر*' : '🌸 *عالم الأنمي*';
    await sendCharacterResult(sock, msg, chatId, character, `${title}\n\nشخصية الأنمي الخاصة بك اليوم:`);
    return;
  }

  // ===== زوج (شخصية ذكر) =====
  if (commandKey === 'زوج') {
    const character = getRandom(maleCharacters);
    await sendCharacterResult(sock, msg, chatId, character, '💖 زوجك السحري هو:');
    return;
  }

  // ===== زوجة (شخصية أنثى) =====
  if (commandKey === 'زوجة') {
    const character = getRandom(femaleCharacters);
    await sendCharacterResult(sock, msg, chatId, character, '💖 زوجتك السحرية هي:');
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
