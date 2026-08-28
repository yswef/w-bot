const { getLastSeen, getCachedCharacterImage, setCachedCharacterImage } = require('../database/db');
const logger = require('../utils/logger');

// شخصيات بلاك كلوفر - روابط صور ثابتة موثوقة (لا تعتمد على أي API خارجي)
const blackCloverMales = [
  { name: 'أستا (Asta)', searchName: 'Asta', image: 'https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg', universe: 'blackclover', quote: 'لا أملك سحراً لكن أملك إرادة لا تنكسر! ⚔️' },
  { name: 'يامي سوكيهيرو (Yami)', searchName: 'Yami Sukehiro', image: 'https://i.pinimg.com/736x/43/66/dc/4366dcce596fc8eb3ddedae34f6ba6df.jpg', universe: 'blackclover', quote: 'القوة الحقيقية تأتي من الهدوء قبل العاصفة 🖤' },
  { name: 'يونو (Yuno)', searchName: 'Yuno Grinberryall', image: 'https://i.pinimg.com/736x/d6/f1/b7/d6f1b7d5e49eeebfceca8ccaf745a96f.jpg', universe: 'blackclover', quote: 'الريح تحمل حلمي نحو القمة 🌪️' },
  { name: 'جوليوس (Julius)', searchName: 'Julius Novachrono', image: 'https://i.pinimg.com/736x/67/cc/d6/67ccd6abec7e928236d90a6e3cefe18c.jpg', universe: 'blackclover', quote: 'التضحية من أجل الآخرين هي أسمى أنواع السحر ✨' },
  { name: 'فينرال (Finral)', searchName: 'Finral Roulacase', image: 'https://i.pinimg.com/736x/0a/63/06/0a630623ec67a30ff16e3eb39dc75ee1.jpg', universe: 'blackclover', quote: 'حتى أبسط الأبواب قد تقود لأعظم الفرص 🌀' },
];

const blackCloverFemales = [
  { name: 'نويلي سيلفا (Noelle)', searchName: 'Noelle Silva', image: 'https://i.pinimg.com/736x/21/df/b6/21dfb6ba4f1c1fce727289569ed9aeb5.jpg', universe: 'blackclover', quote: 'لم أعد تلك الفتاة الضعيفة، أنا الآن فارسة الماء 🌊' },
  { name: 'ميريليونا (Mereoleona)', searchName: 'Mereoleona Vermillion', image: 'https://i.pinimg.com/736x/01/a0/0c/01a00cc91866ff3428d000cd23a544f8.jpg', universe: 'blackclover', quote: 'القوة تُصقل بالنار لا بالراحة 🔥' },
  { name: 'فانيسا (Vanessa)', searchName: 'Vanessa Enoteca', image: 'https://i.pinimg.com/736x/95/9b/38/959b380feecfb6cdd2e08df2b9442ef5.jpg', universe: 'blackclover', quote: 'الحياة كلها قماشة، وأنا أرسم قدري بنفسي 🧵' },
  { name: 'تشارمي (Charmy)', searchName: 'Charmy Pappitson', image: 'https://i.pinimg.com/736x/ff/15/48/ff1548e6db966beab75083ece49efac9.jpg', universe: 'blackclover', quote: 'أفضل طريق للقلب يمر عبر معدة ممتلئة 🍞' },
];

// شخصيات معروفة من مسلسلات أخرى - بلا رابط صورة ثابت، تُجلب صورتها
// الحقيقية تلقائياً (انظر getCharacterImageUrl) باستخدام اسمها الكامل
// الدقيق (searchName) لتفادي أي التباس مع شخصية أخرى بنفس النطق تقريباً
const otherAnimeMales = [
  { name: 'لاك فولتيا (Luck)', searchName: 'Luck Voltia', universe: 'other', quote: 'المخاطرة هي التوابل الحقيقية للمعركة 🎲' },
  { name: 'ناروتو (Naruto)', searchName: 'Naruto Uzumaki', universe: 'other', quote: 'لن أتراجع عن كلمتي، فهذا وعدي الذي لا يتغير! 🍥' },
  { name: 'ساسكي (Sasuke)', searchName: 'Sasuke Uchiha', universe: 'other', quote: 'القوة وحدها لا تكفي دون هدف واضح ⚡' },
  { name: 'لوفي (Luffy)', searchName: 'Monkey D. Luffy', universe: 'other', quote: 'سأصبح ملك القراصنة، هذا قراري ولن يتغير! 🏴‍☠️' },
  { name: 'زورو (Zoro)', searchName: 'Roronoa Zoro', universe: 'other', quote: 'الطريق للقمة مليء بالسقوط، لكنني لن أتراجع أبداً ⚔️' },
  { name: 'غوكو (Goku)', searchName: 'Son Goku', universe: 'other', quote: 'القتال ضد الأقوياء هو ما يجعلني أشعر بأنني حي! 🔥' },
  { name: 'إيتشيغو (Ichigo)', searchName: 'Ichigo Kurosaki', universe: 'other', quote: 'سأحمي من أحب مهما كلفني الأمر 🗡️' },
  { name: 'ناتسو (Natsu)', searchName: 'Natsu Dragneel', universe: 'other', quote: 'طالما ناري مشتعلة، لن أستسلم أبداً 🔥' },
  { name: 'إيرين (Eren)', searchName: 'Eren Yeager', universe: 'other', quote: 'سأقاتل حتى أحرر نفسي من هذا القفص 🗡️' },
  { name: 'ليفاي (Levi)', searchName: 'Levi Ackerman', universe: 'other', quote: 'اختر بحكمة، فلا وقت للندم لاحقاً 🖤' },
  { name: 'تانجيرو (Tanjiro)', searchName: 'Tanjiro Kamado', universe: 'other', quote: 'سأحمي عائلتي مهما حدث، هذا قسمي الذي لا يتغير 🌊' },
  { name: 'ميدوريا (Izuku)', searchName: 'Izuku Midoriya', universe: 'other', quote: 'يمكنك أن تصبح بطلاً حتى لو بدأت من الصفر 💚' },
  { name: 'إدوارد (Edward Elric)', searchName: 'Edward Elric', universe: 'other', quote: 'لكل شيء تكافؤ، وثمن النهوض دائماً يستحق الألم ⚙️' },
  { name: 'غون (Gon)', searchName: 'Gon Freecss', universe: 'other', quote: 'لن أتوقف حتى أحقق ما وعدت به نفسي 🎣' },
];

const otherAnimeFemales = [
  { name: 'ساكورا (Sakura)', searchName: 'Sakura Haruno', universe: 'other', quote: 'الشفاء أيضاً نوع من أنواع القوة 🌸' },
  { name: 'نامي (Nami)', searchName: 'Nami', universe: 'other', quote: 'خريطتي إلى الحرية ترسمها يدي وحدها 🗺️' },
  { name: 'هيناتا (Hinata)', searchName: 'Hinata Hyuga', universe: 'other', quote: 'الخطوة الصغيرة بثقة أفضل من الوقوف بالمكان 🌸' },
  { name: 'روكيا (Rukia)', searchName: 'Rukia Kuchiki', universe: 'other', quote: 'الواجب لا يمنع القلب من الشعور ❄️' },
  { name: 'إيرزا (Erza)', searchName: 'Erza Scarlet', universe: 'other', quote: 'قوّي داخلك أولاً، فالدروع وحدها لا تحمي قلباً هشاً ⚔️' },
  { name: 'لوسي (Lucy)', searchName: 'Lucy Heartfilia', universe: 'other', quote: 'الصداقة الحقيقية أقوى من أي سحر ✨' },
  { name: 'ميكاسا (Mikasa)', searchName: 'Mikasa Ackerman', universe: 'other', quote: 'العالم قاسٍ، لكن من أحبهم يستحقون كل قوتي 🗡️' },
  { name: 'أسونا (Asuna)', searchName: 'Asuna Yuuki', universe: 'other', quote: 'لن أنتظر أن يُنقذني أحد، سأقاتل بنفسي ⚔️' },
  { name: 'نيزوكو (Nezuko)', searchName: 'Nezuko Kamado', universe: 'other', quote: 'حتى في أحلك الظروف، يبقى الحب سبب صمودي 🌸' },
  { name: 'أوتشاكو (Ochaco)', searchName: 'Ochaco Uraraka', universe: 'other', quote: 'سأرتقي بجهدي الخاص، خطوة بخطوة 💪' },
  { name: 'وينري (Winry)', searchName: 'Winry Rockbell', universe: 'other', quote: 'أصلح ما تكسّر، وأمنح الأمل شكلاً جديداً 🔧' },
  { name: 'كاغومي (Kagome)', searchName: 'Kagome Higurashi', universe: 'other', quote: 'بين عالمين، اخترت أن أقاتل من أجل من أحب ✨' },
];

// القوائم الكاملة المستخدمة في أوامر .زوج/.زوجة/.انمي
const maleCharacters = [...blackCloverMales, ...otherAnimeMales];
const femaleCharacters = [...blackCloverFemales, ...otherAnimeFemales];
const allCharacters = [...maleCharacters, ...femaleCharacters];

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// تطبيع النص للمقارنة (إزالة حالة الأحرف والرموز الزائدة) لفحص تطابق الأسماء
function normalizeForCompare(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// ⚠️ إصلاح حرج: البحث بالاسم الحر عبر API خارجي قد يُرجع شخصية مختلفة
// تماماً بسبب تشابه الحروف (مثال حقيقي واجهناه: طلب "Lucy" أرجع صورة
// "Luffy" لتشابه الإملاء!). قبل قبول أي نتيجة، نتحقق أن الاسم الذي
// أرجعته الـ API فعلاً يطابق (أو يحتوي) الاسم الذي بحثنا عنه، وإلا
// نرفضها تماماً بدل عرض صورة خاطئة لشخصية أخرى.
function namesReasonablyMatch(searched, returned) {
  const a = normalizeForCompare(searched);
  const b = normalizeForCompare(returned);
  if (!a || !b) return false;
  const aWords = a.split(' ').filter((w) => w.length > 2);
  const bWords = new Set(b.split(' ').filter((w) => w.length > 2));
  // يكفي أن تتطابق كلمة واحدة مهمة (مثل الاسم الأول أو اسم العائلة)
  return aWords.some((w) => bWords.has(w));
}

// ذاكرة تخزين مؤقت داخل الجلسة الحالية (طبقة أولى أسرع من قاعدة البيانات)
const characterImageCache = new Map();

// ⚠️ إصلاح: كنا نعتمد على Jikan API وتبيّن عدم استقراره (أخطاء 502/503/504
// متكررة من استضافة Railway). الآن نستخدم AniList (أكثر استقراراً)، مع
// التحقق من صحة تطابق الاسم قبل القبول (انظر namesReasonablyMatch)، ونُخزّن
// كل نتيجة ناجحة بشكل دائم في قاعدة البيانات فلا تُطلب الشخصية مرتين أبداً.
async function getCharacterImageUrl(searchName) {
  if (characterImageCache.has(searchName)) {
    return characterImageCache.get(searchName);
  }

  const dbCached = getCachedCharacterImage(searchName);
  if (dbCached !== undefined) {
    characterImageCache.set(searchName, dbCached);
    return dbCached; // قد تكون null (بحث سابق فاشل) أو رابط صورة حقيقي
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
          query: `query ($search: String) { Character(search: $search) { name { full } image { large } } }`,
          variables: { search: searchName },
        }),
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.statusCode = res.status;
        throw err;
      }
      const data = await res.json();
      const character = data?.data?.Character;
      if (!character?.image?.large) return null;
      if (!namesReasonablyMatch(searchName, character.name?.full)) {
        logger.warn(`تجاهل نتيجة غير مطابقة: بحثنا عن "${searchName}" فأرجعت API اسم "${character.name?.full}"`);
        return null;
      }
      return character.image.large;
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
        logger.warn(`فشل جلب صورة الشخصية "${searchName}" من AniList بعد إعادة المحاولة: ${err2.message}`);
      }
    } else {
      logger.warn(`فشل جلب صورة الشخصية "${searchName}" من AniList: ${err.message}`);
    }
  }

  characterImageCache.set(searchName, url);
  setCachedCharacterImage(searchName, url);
  return url;
}

// ⚠️ ميزة جديدة: تحميل وتخزين صور كل الشخصيات مسبقاً عند بدء تشغيل البوت
// (وليس عند أول طلب من مستخدم)، حتى تكون الأوامر سريعة وموثوقة من أول
// استخدام. تُنادى مرة واحدة بعد نجاح الاتصال بواتساب، ولا توقف عمل
// البوت أثناء انتظارها (تعمل في الخلفية). المهلة بين كل طلب والذي يليه
// (1.2 ثانية) تحترم حدود معدل طلبات AniList.
async function warmupCharacterImages() {
  const toFetch = allCharacters.filter((c) => !c.image); // فقط من لا يملك رابط صورة ثابت
  logger.info(`⏳ بدء تحميل مسبق لصور ${toFetch.length} شخصية أنمي...`);
  let success = 0;
  let failed = 0;
  for (const character of toFetch) {
    try {
      const url = await getCharacterImageUrl(character.searchName);
      if (url) success += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 1200)); // احترام حدود معدل الطلبات
  }
  logger.info(`✅ انتهى التحميل المسبق لصور الشخصيات: ${success} نجحت، ${failed} فشلت (ستُعاد المحاولة عند أول طلب فعلي لها).`);
}

async function fetchImageSafe(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
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
async function sendCharacterResult(sock, msg, chatId, character, title) {
  const response = `${title}\n\n⚔️ *${character.name}* 🌸\n\n💬 ${character.quote}`;

  const imageUrl = character.image || (await getCharacterImageUrl(character.searchName));

  if (imageUrl) {
    try {
      const imgBuffer = await fetchImageSafe(imageUrl);
      await sock.sendMessage(chatId, { image: imgBuffer, caption: response }, { quoted: msg });
      return;
    } catch {
      try {
        // محاولة ثانية: نترك واتساب نفسه يجلب الصورة من الرابط مباشرة
        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: response }, { quoted: msg });
        return;
      } catch {
        await sock.sendMessage(chatId, { text: response + '\n\n*(تعذر تحميل الصورة هذه المرة 💥)*' }, { quoted: msg });
        return;
      }
    }
  }
  await sock.sendMessage(chatId, { text: response }, { quoted: msg });
}

module.exports = async function funCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  if (commandKey === 'anime' || commandKey === 'انمي') {
    const character = getRandom(allCharacters);
    const title = character.universe === 'blackclover' ? '🌸 *مملكة كلوفر*' : '🌸 *عالم الأنمي*';
    await sendCharacterResult(sock, msg, chatId, character, `${title}\n\nشخصية الأنمي الخاصة بك اليوم:`);
    return;
  }

  if (commandKey === 'زوج') {
    const character = getRandom(maleCharacters);
    await sendCharacterResult(sock, msg, chatId, character, '💖 زوجك السحري هو:');
    return;
  }

  if (commandKey === 'زوجة') {
    const character = getRandom(femaleCharacters);
    await sendCharacterResult(sock, msg, chatId, character, '💖 زوجتك السحرية هي:');
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

module.exports.warmupCharacterImages = warmupCharacterImages;
