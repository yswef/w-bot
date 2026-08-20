// =============================================
// 🎮 ألعاب بلاك كلوفر - حجر ورقة مقص + تخمين رقم + تحدي معلومات + فعالية تفكيك الحروف
// =============================================

const { setGameState, getGameState, clearGameState } = require('../database/db');
const config = require('../config');

const rpsOptions = ['حجر', 'ورقه', 'مقص'];
const rpsEmoji = { 'حجر': '✊', 'ورقه': '✋', 'مقص': '✌️' };

// تحدي المعلومات (Trivia) - تمت زيادة عدد الأسئلة وإصلاح مطابقة الإجابات
const triviaDb = [
  { q: 'ما اسم السيف الأول الذي حصل عليه أستا؟', a: 'قاتل الشياطين' },
  { q: 'من هو قائد فرقة الثيران السوداء؟', a: 'يامي' },
  { q: 'ما هو العنصر السحري لنويلي؟', a: 'الماء' },
  { q: 'من هو غريم أستا الذي يمتلك سحر الرياح؟', a: 'يونو' },
  { q: 'كم ورقة توجد في كتاب أستا السحري؟', a: 'خمس' },
  { q: 'ما اسم إمبراطور السحر في بداية الأنمي؟', a: 'جوليوس' },
  { q: 'من هي عمة نويلي الشهيرة بلقب الملكة العزباء؟', a: 'ميريليونا' },
  { q: 'ما اسم فرقة يونو السحرية؟', a: 'الأسود الذهبية' },
  { q: 'من الشخصية التي تمتلك سحر التيليبورت وتنقل الفريق؟', a: 'فينرال' },
  { q: 'ما اسم قرية أستا ويونو التي نشآ فيها؟', a: 'هاج' },
  { q: 'من هو أنمي/مانغا "Black Clover" مؤلفه؟', a: 'يوكي تاباتا' },
  { q: 'ما لون شعر أستا؟', a: 'أسود' },
  { q: 'ما اسم سحر لاك المميز؟', a: 'البرق' },
  { q: 'من الشخصية المهووسة بالطعام في فرقة الثيران السوداء؟', a: 'تشارمي' },
  { q: 'ما هي رتبة أستا في بداية القصة؟', a: 'فارس متدرب' },
];

// شخصيات أنمي شهيرة (بالأحرف اللاتينية) تُستخدم في لعبة تفكيك الحروف
const scrambleNames = [
  'Asta', 'Yami', 'Yuno', 'Noelle', 'Luck', 'Charmy', 'Vanessa', 'Finral',
  'Julius', 'Mereoleona', 'Naruto', 'Sasuke', 'Sakura', 'Kakashi', 'Luffy',
  'Zoro', 'Nami', 'Chopper', 'Goku', 'Vegeta', 'Gohan', 'Ichigo', 'Rukia',
  'Natsu', 'Lucy', 'Erza', 'Eren', 'Levi', 'Mikasa', 'Deku', 'Bakugo', 'Todoroki',
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

function shuffleWord(word) {
  const letters = word.split('');
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
    const question = triviaDb[Math.floor(Math.random() * triviaDb.length)];
    setGameState(chatId, 'trivia', { answer: question.a }); // Use chatId so anyone in group can answer
    await sock.sendMessage(chatId, { text: `❓ *سؤال من أستا:* \n\n${question.q}\n\n💡 اكتب إجابتك مباشرة في الدردشة، بدون الحاجة لأي أمر!` }, { quoted: msg });
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
    const text = `🎮 *ألعاب بلاك كلوفر السحرية* - اختر:\n\n✊ ${config.prefix}حجر  ✋ ${config.prefix}ورقه  ✌️ ${config.prefix}مقص\n(حجر ورقة مقص ضد البوت)\n\n🔢 ${config.prefix}تخمين\n(تخمين رقم سري بين 1 و20)\n\n❓ ${config.prefix}سؤال\n(اختبر معلوماتك في الأنمي - أجب مباشرة بدون أمر)\n\n🔀 ${config.prefix}فعالية <عدد الجولات>\n(فعالية تفكيك حروف جماعية - للمشرفين، حتى 20 جولة)`;
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
    const answer = trimmed.toLowerCase();
    const correct = gameState.state_data.answer.toLowerCase();
    if (answer.includes(correct) || correct.includes(answer)) {
      clearGameState(chatId);
      await sock.sendMessage(chatId, { text: `✨ يووووش! إجابة صحيحة من بطلنا السحري!\nالإجابة هي: *${gameState.state_data.answer}*` }, { quoted: msg });
      return true;
    }
    return false;
  }

  // ----- Scramble (تفكيك الحروف) -----
  if (gameState.game_type === 'scramble') {
    const state = gameState.state_data;
    if (trimmed.toLowerCase() !== state.currentAnswer.toLowerCase()) return false;

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
