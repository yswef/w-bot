// =============================================
// 🎮 ألعاب بلاك كلوفر - حجر ورقة مقص + تخمين رقم + تحدي معلومات + فعالية تفكيك الحروف
// =============================================

const { setGameState, getGameState, clearGameState } = require('../database/db');
const config = require('../config');

const rpsOptions = ['حجر', 'ورقه', 'مقص'];
const rpsEmoji = { 'حجر': '✊', 'ورقه': '✋', 'مقص': '✌️' };

// تحدي المعلومات (Trivia) - تمت زيادة عدد الأسئلة وإصلاح مطابقة الإجابات
const triviaDb = [
  { q: 'ما اسم السيف الأول الذي حصل عليه أستا؟', a: 'قاتل الشياطين', alts: ['قاتل الشياطين', 'demon slayer sword'] },
  { q: 'من هو قائد فرقة الثيران السوداء؟', a: 'يامي', alts: ['يامي', 'yami'] },
  { q: 'ما هو العنصر السحري لنويلي؟', a: 'الماء', alts: ['الماء', 'ماء', 'water'] },
  { q: 'من هو غريم أستا الذي يمتلك سحر الرياح؟', a: 'يونو', alts: ['يونو', 'yuno'] },
  { q: 'ما اسم إمبراطور السحر في بداية الأنمي؟', a: 'جوليوس', alts: ['جوليوس', 'julius'] },
  { q: 'من هي عمة نويلي الملقبة بـ«الملكة العزباء»؟', a: 'ميريليونا', alts: ['ميريليونا', 'mereoleona'] },
  { q: 'ما اسم فرقة يونو السحرية؟', a: 'الفجر الذهبي', alts: ['الفجر الذهبي', 'golden dawn'] },
  { q: 'من الشخصية التي تمتلك سحر المكان وتنقل الفريق؟', a: 'فينرال', alts: ['فينرال', 'finral'] },
  { q: 'ما اسم القرية التي نشأ فيها أستا ويونو؟', a: 'هاج', alts: ['هاج', 'hage'] },
  { q: 'من مؤلف مانغا بلاك كلوفر؟', a: 'يوكي تاباتا', alts: ['تاباتا', 'tabata'] },
  { q: 'ما نوع سحر لاك فولتيا؟', a: 'البرق', alts: ['البرق', 'برق', 'lightning'] },
  { q: 'من الشخصية المهووسة بالطعام في الثيران السوداء؟', a: 'تشارمي', alts: ['تشارمي', 'charmy'] },
  { q: 'ما نوع سحر ماجنا سوينغ؟', a: 'النار', alts: ['النار', 'نار', 'fire'] },
  { q: 'من قائد فرقة النسر الفضي؟', a: 'نوزيل', alts: ['نوزيل', 'nozel'] },
  { q: 'ما نوع سحر ميموزا؟', a: 'النبات', alts: ['النبات', 'نبات', 'plant'] },
  { q: 'من هو قائد فرقة الفجر الذهبي؟', a: 'ويليام', alts: ['ويليام', 'william'] },
  { q: 'ما اسم أخت غوش التي يحبها كثيراً؟', a: 'ماري', alts: ['ماري', 'marie'] },
  { q: 'من قائدة فرقة الورود الزرقاء؟', a: 'شارلوت', alts: ['شارلوت', 'charlotte'] },
  { q: 'ما نوع سحر غراي في بلاك كلوفر؟', a: 'التحويل', alts: ['التحويل', 'transformation'] },
  { q: 'ما اسم الشيطان الذي يسكن كتاب أستا؟', a: 'ليبي', alts: ['ليبي', 'liebe'] },
  { q: 'من هو معلم ناروتو الذي علّمه الراسينغان؟', a: 'جيرايا', alts: ['جيرايا', 'jiraiya'] },
  { q: 'ما اسم الوحش المختوم داخل ناروتو؟', a: 'كوراما', alts: ['كوراما', 'kurama', 'الثعلب'] },
  { q: 'ما اسم قرية ناروتو؟', a: 'كونوها', alts: ['كونوها', 'konoha', 'الورق'] },
  { q: 'من أخو ساسكي الأكبر؟', a: 'إيتاتشي', alts: ['إيتاتشي', 'itachi'] },
  { q: 'ما اسم تقنية كاكاشي الشهيرة؟', a: 'تشيدوري', alts: ['تشيدوري', 'chidori', 'رايكيري'] },
  { q: 'ما حلم لوفي؟', a: 'ملك القراصنة', alts: ['ملك القراصنة', 'pirate king'] },
  { q: 'كم سيفاً يستخدم زورو في أسلوبه الأقصى؟', a: 'ثلاثة', alts: ['ثلاثة', '3', 'three'] },
  { q: 'ما اسم سفينة طاقم قبعة القش الثانية؟', a: 'ثاوزند ساني', alts: ['ساني', 'sunny'] },
  { q: 'من طباخ طاقم قبعة القش؟', a: 'سانجي', alts: ['سانجي', 'sanji'] },
  { q: 'ما اسم كوكب غوكو الأصلي؟', a: 'فيجيتا', alts: ['فيجيتا', 'vegeta'] },
  { q: 'ما اسم تقنية غوكو الشهيرة؟', a: 'كاميهاميها', alts: ['كاميهاميها', 'kamehameha'] },
  { q: 'من قائد فرقة الاستطلاع الأقوى؟', a: 'ليفاي', alts: ['ليفاي', 'levi'] },
  { q: 'ما اسم الجدار الخارجي في هجوم العمالقة؟', a: 'ماريا', alts: ['ماريا', 'maria'] },
  { q: 'من هو زعيم الشياطين في قاتل الشياطين؟', a: 'موزان', alts: ['موزان', 'muzan'] },
  { q: 'ما اسم أخت تانجيرو؟', a: 'نيزوكو', alts: ['نيزوكو', 'nezuko'] },
  { q: 'ما نوع تنفّس تانجيرو الأساسي؟', a: 'الماء', alts: ['الماء', 'ماء', 'water'] },
  { q: 'ما اسم قوة ميدوريا التي ورثها؟', a: 'ون فور أول', alts: ['ون فور أول', 'one for all'] },
  { q: 'من بطل العالم رقم واحد في بداية أكاديميتي للأبطال؟', a: 'أول مايت', alts: ['أول مايت', 'all might'] },
  { q: 'ما اسم تقنية غوجو اللانهائية؟', a: 'لا نهاية', alts: ['لا نهاية', 'infinity', 'limitless'] },
  { q: 'من الشيطان الذي سكن جسد يوجي؟', a: 'سوكونا', alts: ['سوكونا', 'sukuna'] },
  { q: 'ما القانون الأساسي في الخيمياء بأنمي الفولاذي؟', a: 'التبادل المتكافئ', alts: ['التبادل المتكافئ', 'equivalent exchange'] },
  { q: 'ما اسم قوة الطاقة في هنتر × هنتر؟', a: 'نين', alts: ['نين', 'nen'] },
  { q: 'ما اسم سيف إيتشيغو؟', a: 'زانغيتسو', alts: ['زانغيتسو', 'zangetsu'] },
  { q: 'ما اسم نقابة ناتسو؟', a: 'فيري تيل', alts: ['فيري تيل', 'fairy tail', 'ذيل الجنية'] },
  { q: 'كم ضربة يحتاج سايتاما عادةً لهزيمة خصمه؟', a: 'واحدة', alts: ['واحدة', '1', 'one'] },
];

// شخصيات أنمي شهيرة (بالأحرف اللاتينية) تُستخدم في لعبة تفكيك الحروف
const scrambleNames = [
  'Asta', 'Yami', 'Yuno', 'Noelle', 'Luck', 'Charmy', 'Vanessa', 'Finral',
  'Julius', 'Mereoleona', 'Magna', 'Gauche', 'Zora', 'Nozel', 'Mimosa', 'Secre',
  'Charlotte', 'Fuegoleon', 'William', 'Nacht', 'Langris', 'Leopold', 'Klaus', 'Gordon',
  'Dorothy', 'Rebecca', 'Grey', 'Henry', 'Liebe', 'Patry', 'Naruto', 'Sasuke',
  'Sakura', 'Kakashi', 'Itachi', 'Hinata', 'Gaara', 'Jiraiya', 'Tsunade', 'Madara',
  'Shikamaru', 'Rock Lee', 'Luffy', 'Zoro', 'Nami', 'Sanji', 'Chopper', 'Robin',
  'Usopp', 'Franky', 'Brook', 'Shanks', 'Ace', 'Law', 'Goku', 'Vegeta',
  'Gohan', 'Piccolo', 'Frieza', 'Trunks', 'Bulma', 'Krillin', 'Ichigo', 'Rukia',
  'Renji', 'Byakuya', 'Orihime', 'Yoruichi', 'Aizen', 'Kenpachi', 'Natsu', 'Lucy',
  'Erza', 'Gray', 'Happy', 'Juvia', 'Wendy', 'Laxus', 'Gajeel', 'Mirajane',
  'Eren', 'Levi', 'Mikasa', 'Armin', 'Historia', 'Sasha', 'Hange', 'Reiner',
  'Erwin', 'Tanjiro', 'Nezuko', 'Zenitsu', 'Inosuke', 'Giyu', 'Shinobu', 'Rengoku',
  'Mitsuri', 'Muzan', 'Kanao', 'Deku', 'Bakugo', 'Todoroki', 'Ochaco', 'Momo',
  'Tsuyu', 'Iida', 'Kirishima', 'All Might', 'Gojo', 'Yuji', 'Megumi', 'Nobara',
  'Sukuna', 'Maki', 'Nanami', 'Toji', 'Killua', 'Gon', 'Kurapika', 'Hisoka',
  'Leorio', 'Meruem', 'Edward', 'Alphonse', 'Winry', 'Mustang', 'Riza', 'Envy',
  'Saitama', 'Genos', 'Kirito', 'Asuna', 'Sinon', 'Denji', 'Power', 'Makima',
  'Aki', 'Rimuru', 'Meliodas', 'Escanor', 'Ban', 'Elizabeth', 'Thorfinn', 'Senku',
  'Shinra', 'Anya', 'Yor', 'Loid', 'Rem', 'Emilia', 'Subaru', 'Megumin',
  'Aqua', 'Kazuma', 'Violet', 'Kurisu', 'Mikoto', 'Marin', 'Kaguya', 'Chika',
  'Hinata Shoyo', 'Kageyama', 'Kuroo', 'Oikawa',
];

const MAX_ROUNDS = 20;

function playRPS(userChoice, botChoice) {
  if (userChoice === botChoice) return 'تعادل 🤝';
  if (
    (userChoice === 'حجر' && botChoice === 'مقص') ||
    (userChoice === 'ورقه' && botChoice === 'حجر') ||
    (userChoice === 'مقص' && botChoice === 'ورقه')
  ) return 'فزت! 🎉';
  return 'البوت فاز! 🤖 حاول ثانية';
}

// تطبيع النص العربي/اللاتيني لمقارنة الإجابات بعدالة:
// توحيد الألف والهمزات والتاء المربوطة، حذف التشكيل والمسافات وعلامات الترقيم.
function normalizeAnswer(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '')   // تشكيل وتطويل
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئء]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')          // حذف المسافات والرموز
    .trim();
}

// هل إجابة المستخدم مقبولة؟ تقبل الإجابة الأساسية وكل البدائل المسجّلة.
// ⚠️ إصلاح: كانت المقارنة السابقة `answer.includes(correct) || correct.includes(answer)`
// تقبل أي حرف واحد كإجابة صحيحة (لأن "ا" موجودة داخل أي إجابة تقريباً).
function answerMatches(userAnswer, question) {
  const user = normalizeAnswer(userAnswer);
  if (user.length < 2) return false;

  const candidates = [question.a, ...(question.alts || [])].map(normalizeAnswer).filter(Boolean);
  return candidates.some((c) => {
    if (user === c) return true;
    // نسمح بالاحتواء فقط عندما تكون إجابة المستخدم قريبة في الطول (تفادي المطابقات العشوائية)
    return c.length >= 4 && user.length >= c.length && user.includes(c);
  });
}

function shuffleWord(word) {
  // نتجاهل المسافات حتى لا تظهر داخل الحروف المبعثرة (مثل "All Might")
  const letters = word.replace(/\s+/g, '').split('');
  let shuffled;
  do {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    shuffled = letters.join('');
  } while (shuffled.toLowerCase() === word.toLowerCase() && word.length > 1);
  return shuffled;
}

async function isGroupAdminOrOwner(sock, chatId, senderId) {
  const digits = (senderId || '').replace(/\D/g, '');
  const admins = config.adminNumbers || [config.ownerNumber];
  if (admins.some((a) => a && digits.includes(a))) return true;
  try {
    if (!chatId.endsWith('@g.us')) return false;
    const metadata = await sock.groupMetadata(chatId);
    const participant = metadata.participants.find((p) => p.id === senderId);
    return !!(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
  } catch {
    return false;
  }
}

function pickNextName(usedNames) {
  const remaining = scrambleNames.filter((n) => !usedNames.includes(n));
  const pool = remaining.length > 0 ? remaining : scrambleNames;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function sendScrambleRound(sock, chatId, state) {
  const name = pickNextName(state.usedNames);
  state.usedNames.push(name);
  state.currentAnswer = name;
  const scrambled = shuffleWord(name);
  setGameState(chatId, 'scramble', state);
  await sock.sendMessage(chatId, {
    text: `🔀 *فعالية تفكيك الحروف* (الجولة ${state.round}/${state.totalRounds})\n\n🧩 فكّك هذا الاسم: *${scrambled.split('').join(' ')}*\n\n⚡ أول من يكتب الاسم الصحيح في الدردشة يفوز بنقطة!`,
  });
}

function buildScoreboard(scores) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return 'لم يسجّل أحد أي نقطة هذه المرة! 😅';
  const medals = ['🥇', '🥈', '🥉'];
  return entries
    .map(([userId, score], i) => `${medals[i] || '🔹'} @${userId.split('@')[0]} — ${score} نقطة`)
    .join('\n');
}

module.exports = async function gamesCommand({ sock, msg, args, chatId, senderId, commandKey }) {

  // ===== حجر ورقة مقص =====
  if (commandKey === 'حجر' || commandKey === 'ورقه' || commandKey === 'مقص') {
    const userChoice = commandKey;
    const botChoice = rpsOptions[Math.floor(Math.random() * rpsOptions.length)];
    const result = playRPS(userChoice, botChoice);
    const replyText =
      `⚔️ *حجر ورقة مقص - مملكة الكلوفر*\n\n` +
      `✊ اختيارك: ${rpsEmoji[userChoice]} ${userChoice}\n` +
      `🤖 اختيار البوت: ${rpsEmoji[botChoice]} ${botChoice}\n\n` +
      `🏆 النتيجة: ${result}`;
    await sock.sendMessage(chatId, { text: replyText }, { quoted: msg });
    return;
  }

  // ===== بدء لعبة تخمين الرقم =====
  if (commandKey === 'تخمين') {
    const secret = Math.floor(Math.random() * 20) + 1;
    setGameState(senderId, 'guess_number', { secret, attempts: 0 }); // Use senderId as PK
    await sock.sendMessage(chatId,
      { text: `🎲 *لعبة التخمين السحرية*\n\nفكرت برقم بين 1 و 20 🔢\nلديك 5 محاولات، أرسل: ${config.prefix}اخمن <رقم>` },
      { quoted: msg }
    );
    return;
  }

  // ===== محاولة تخمين رقم =====
  if (commandKey === 'اخمن') {
    const gameState = getGameState(senderId);
    if (!gameState || gameState.game_type !== 'guess_number') {
      await sock.sendMessage(chatId, { text: `⚠️ لم تبدأ لعبة تخمين الرقم بعد! أرسل \`${config.prefix}تخمين\` أولاً.` }, { quoted: msg });
      return;
    }
    const game = gameState.state_data;
    const guess = parseInt(args[0]);
    if (isNaN(guess)) {
      await sock.sendMessage(chatId, { text: `⚠️ سحر ضعيف! أرسل رقم صالح. مثال: ${config.prefix}اخمن 7` }, { quoted: msg });
      return;
    }

    game.attempts++;
    if (guess === game.secret) {
      clearGameState(senderId);
      await sock.sendMessage(chatId,
        { text: `✅ *أحسنت يا بطل!* 🎉\nالرقم الصح هو *${game.secret}* وخمنته في ${game.attempts} محاولات!\n⚔️ تجاوز حدودك هنا والآن!` },
        { quoted: msg }
      );
    } else if (game.attempts >= 5) {
      clearGameState(senderId);
      await sock.sendMessage(chatId,
        { text: `😵 انتهت محاولاتك السحرية!\nالرقم الصحيح كان *${game.secret}*\nأرسل ${config.prefix}تخمين لتبدأ من جديد ولا تستسلم أبدًا!` },
        { quoted: msg }
      );
    } else {
      const hint = guess < game.secret ? 'أكبر' : 'أصغر';
      setGameState(senderId, 'guess_number', game);
      await sock.sendMessage(chatId,
        { text: `🔍 الرقم المطلوب ${hint} من ${guess}.\nلديك ${5 - game.attempts} محاولات متبقية.` },
        { quoted: msg }
      );
    }
    return;
  }

  // ===== لعبة سؤال وجواب (Trivia) - يمكن الإجابة مباشرة من الدردشة بدون أمر =====
  if (commandKey === 'سؤال' || commandKey === 'trivia') {
    const existing = getGameState(chatId);
    if (existing && existing.game_type === 'trivia') {
      await sock.sendMessage(chatId, { text: `⏳ يوجد سؤال نشط بالفعل:\n\n❓ ${existing.state_data.q}\n\n💡 أجب عليه أولاً أو أرسل \`${config.prefix}كشف\` لعرض الإجابة.` }, { quoted: msg });
      return;
    }
    const question = triviaDb[Math.floor(Math.random() * triviaDb.length)];
    // نحفظ السؤال كاملاً (مع الإجابات البديلة) حتى تعمل المطابقة الذكية
    setGameState(chatId, 'trivia', { q: question.q, answer: question.a, alts: question.alts || [], askedAt: Date.now() });
    await sock.sendMessage(chatId, {
      text: `❓ *سؤال من أستا:*\n\n${question.q}\n\n💡 اكتب إجابتك مباشرة في الدردشة بدون أي أمر!\n🔓 لعرض الإجابة: \`${config.prefix}كشف\``,
    }, { quoted: msg });
    return;
  }

  // ===== كشف إجابة السؤال النشط =====
  if (commandKey === 'كشف' || commandKey === 'reveal') {
    const state = getGameState(chatId);
    if (!state || state.game_type !== 'trivia') {
      await sock.sendMessage(chatId, { text: `⚠️ لا يوجد سؤال نشط. ابدأ واحداً بـ \`${config.prefix}سؤال\`` }, { quoted: msg });
      return;
    }
    clearGameState(chatId);
    await sock.sendMessage(chatId, { text: `🔓 الإجابة الصحيحة هي: *${state.state_data.answer}*\n\nحاول مرة أخرى بـ \`${config.prefix}سؤال\` 🍀` }, { quoted: msg });
    return;
  }

  // ===== تخطي جولة في فعالية تفكيك الحروف =====
  if (commandKey === 'تخطي' || commandKey === 'skip') {
    const state = getGameState(chatId);
    if (!state || state.game_type !== 'scramble') {
      await sock.sendMessage(chatId, { text: '⚠️ لا توجد فعالية تفكيك نشطة حالياً.' }, { quoted: msg });
      return;
    }
    const allowed = await isGroupAdminOrOwner(sock, chatId, senderId);
    if (!allowed) {
      await sock.sendMessage(chatId, { text: '🛡️ فقط المشرفون يقدرون يتخطون الجولة.' }, { quoted: msg });
      return;
    }
    const data = state.state_data;
    await sock.sendMessage(chatId, { text: `⏭️ تم تخطي الجولة! الإجابة كانت: *${data.currentAnswer}*` }, { quoted: msg });
    if (data.round >= data.totalRounds) {
      clearGameState(chatId);
      await sock.sendMessage(chatId, {
        text: `🏁 *انتهت الفعالية!*\n\n📊 *لوحة الصدارة:*\n${buildScoreboard(data.scores)}`,
        mentions: Object.keys(data.scores),
      });
    } else {
      data.round += 1;
      await sendScrambleRound(sock, chatId, data);
    }
    return;
  }

  // إبقاء أمر "جواب" يعمل كاختصار اختياري، رغم أن الإجابة المباشرة أصبحت تعمل تلقائياً
  if (commandKey === 'جواب' || commandKey === 'answer') {
    const answer = args.join(' ');
    const handled = answer && await checkActiveAnswer({ sock, msg, chatId, senderId, text: answer });
    if (!handled) {
      await sock.sendMessage(chatId, { text: `⚠️ لا يوجد سؤال أو فعالية نشطة حالياً! اكتب \`${config.prefix}سؤال\` لبدء التحدي.` }, { quoted: msg });
    }
    return;
  }

  // ===== فعالية تفكيك الحروف (تلقائية، يديرها المشرف، بحد أقصى 20 جولة) =====
  if (commandKey === 'فعالية' || commandKey === 'تفكيك' || commandKey === 'event') {
    if (!chatId.endsWith('@g.us')) {
      await sock.sendMessage(chatId, { text: '⚠️ هذه الفعالية تعمل داخل المجموعات فقط.' }, { quoted: msg });
      return;
    }
    const allowed = await isGroupAdminOrOwner(sock, chatId, senderId);
    if (!allowed) {
      await sock.sendMessage(chatId, { text: '🛡️ فقط مشرفو المجموعة يقدرون يشغّلون فعاليات أستا السحرية!' }, { quoted: msg });
      return;
    }
    const existing = getGameState(chatId);
    if (existing && existing.game_type === 'scramble') {
      await sock.sendMessage(chatId, { text: `⚠️ في فعالية شغّالة حالياً! أوقفها أولاً بـ \`${config.prefix}ايقاف_فعالية\`.` }, { quoted: msg });
      return;
    }
    let rounds = parseInt(args[0]) || 5;
    if (rounds > MAX_ROUNDS) rounds = MAX_ROUNDS;
    if (rounds < 1) rounds = 1;

    const state = { round: 1, totalRounds: rounds, scores: {}, usedNames: [], startedBy: senderId };
    setGameState(chatId, 'scramble', state);
    await sock.sendMessage(chatId, { text: `🔥 *فعالية تفكيك الحروف بدأت!* ${rounds} جولة قادمة، استعدوا يا فرسان السحر! ⚔️` }, { quoted: msg });
    await sendScrambleRound(sock, chatId, state);
    return;
  }

  // ===== إيقاف فعالية جارية =====
  if (commandKey === 'ايقاف_فعالية') {
    const allowed = await isGroupAdminOrOwner(sock, chatId, senderId);
    if (!allowed) {
      await sock.sendMessage(chatId, { text: '🛡️ فقط مشرفو المجموعة يقدرون يوقفون الفعالية.' }, { quoted: msg });
      return;
    }
    const existing = getGameState(chatId);
    if (!existing || existing.game_type !== 'scramble') {
      await sock.sendMessage(chatId, { text: '⚠️ لا توجد فعالية نشطة حالياً.' }, { quoted: msg });
      return;
    }
    clearGameState(chatId);
    await sock.sendMessage(chatId, {
      text: `🏁 *تم إيقاف الفعالية!*\n\n📊 *لوحة الصدارة:*\n${buildScoreboard(existing.state_data.scores)}`,
      mentions: Object.keys(existing.state_data.scores),
    }, { quoted: msg });
    return;
  }

  // ===== لعبة المصير - حظ أنمي =====
  if (commandKey === 'لعبة' || commandKey === 'game') {
    const p = config.prefix;
    const text =
      `🎮 *ألعاب بلاك كلوفر السحرية* — اختر لعبتك:\n\n` +
      `✊ ${p}حجر · ✋ ${p}ورقه · ✌️ ${p}مقص\n(حجر ورقة مقص ضد البوت)\n\n` +
      `🔢 ${p}تخمين ثم ${p}اخمن <رقم>\n(خمّن الرقم السري بين 1 و20 خلال 5 محاولات)\n\n` +
      `❓ ${p}سؤال\n(${triviaDb.length} سؤال أنمي — أجب مباشرة بالدردشة بدون أمر، و${p}كشف لعرض الإجابة)\n\n` +
      `🔀 ${p}فعالية <عدد الجولات>\n(فعالية تفكيك حروف جماعية من ${scrambleNames.length} اسم — للمشرفين، حتى ${MAX_ROUNDS} جولة)\n` +
      `⏭️ ${p}تخطي — تخطي الجولة الحالية · 🏁 ${p}ايقاف_فعالية — إنهاء وعرض النتائج`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }
};

/**
 * يُستدعى من messageHandler على أي رسالة نصية عادية (ليست أمراً) للتحقق مما إذا كانت
 * إجابة صحيحة لسؤال Trivia نشط أو لجولة تفكيك حروف نشطة في هذه المحادثة.
 * يُرجع true إذا تمت معالجة الرسالة كإجابة (حتى لا تتم معالجتها كرد آلي عادي).
 */
async function checkActiveAnswer({ sock, msg, chatId, senderId, text }) {
  const gameState = getGameState(chatId);
  if (!gameState) return false;

  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  // ----- Trivia -----
  if (gameState.game_type === 'trivia') {
    if (answerMatches(trimmed, gameState.state_data)) {
      clearGameState(chatId);
      await sock.sendMessage(chatId, {
        text: `✨ يووووش! إجابة صحيحة يا @${senderId.split('@')[0]}!\nالإجابة هي: *${gameState.state_data.answer}* 🍀`,
        mentions: [senderId],
      }, { quoted: msg });
      return true;
    }
    return false;
  }

  // ----- Scramble (تفكيك الحروف) -----
  if (gameState.game_type === 'scramble') {
    const state = gameState.state_data;
    if (normalizeAnswer(trimmed) !== normalizeAnswer(state.currentAnswer)) return false;

    state.scores[senderId] = (state.scores[senderId] || 0) + 1;
    await sock.sendMessage(chatId, { text: `✅ إجابة صحيحة يا @${senderId.split('@')[0]}! الاسم كان *${state.currentAnswer}* 🎉`, mentions: [senderId] }, { quoted: msg });

    if (state.round >= state.totalRounds) {
      clearGameState(chatId);
      await sock.sendMessage(chatId, {
        text: `🏁 *انتهت فعالية تفكيك الحروف!*\n\n📊 *لوحة الصدارة النهائية:*\n${buildScoreboard(state.scores)}\n\n🍀 أستا يشكر الجميع على المشاركة!`,
        mentions: Object.keys(state.scores),
      });
    } else {
      state.round += 1;
      await sendScrambleRound(sock, chatId, state);
    }
    return true;
  }

  return false;
}

module.exports.checkActiveAnswer = checkActiveAnswer;
