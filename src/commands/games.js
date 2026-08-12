// =============================================
// 🎮 ألعاب بلاك كلوفر - Rock Paper Scissors + Guess the Number
// =============================================

const { setGameState, getGameState, clearGameState } = require('../database/db');

const rpsOptions = ['حجر', 'ورقه', 'مقص'];
const rpsEmoji = { 'حجر': '✊', 'ورقه': '✋', 'مقص': '✌️' };

// Trivia DB (Asta/Black Clover themed)
const triviaDb = [
  { q: 'ما اسم السيف الأول الذي حصل عليه أستا؟', a: 'قاتل الشياطين' },
  { q: 'من هو قائد فرقة الثيران السوداء؟', a: 'يامي' },
  { q: 'ما هو العنصر السحري لنويلي؟', a: 'الماء' },
  { q: 'من هو غريم أستا الذي يمتلك سحر الرياح؟', a: 'يونو' },
  { q: 'كم ورقة توجد في كتاب أستا السحري؟', a: 'خمس' },
];

function playRPS(userChoice, botChoice) {
  if (userChoice === botChoice) return 'تعادل 🤝';
  if (
    (userChoice === 'حجر' && botChoice === 'مقص') ||
    (userChoice === 'ورقه' && botChoice === 'حجر') ||
    (userChoice === 'مقص' && botChoice === 'ورقه')
  ) return 'فزت! 🎉';
  return 'البوت فاز! 🤖 حاول ثانية';
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
      { text: `🎲 *لعبة التخمين السحرية*\n\nفكرت برقم بين 1 و 20 🔢\nلديك 5 محاولات، أرسل: !اخمن <رقم>` },
      { quoted: msg }
    );
    return;
  }

  // ===== محاولة تخمين رقم =====
  if (commandKey === 'اخمن') {
    const gameState = getGameState(senderId);
    if (!gameState || gameState.game_type !== 'guess_number') {
      await sock.sendMessage(chatId, { text: '⚠️ لم تبدأ لعبة تخمين الرقم بعد! أرسل `!تخمين` أولاً.' }, { quoted: msg });
      return;
    }
    const game = gameState.state_data;
    const guess = parseInt(args[0]);
    if (isNaN(guess)) {
      await sock.sendMessage(chatId, { text: '⚠️ سحر ضعيف! أرسل رقم صالح. مثال: !اخمن 7' }, { quoted: msg });
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
        { text: `😵 انتهت محاولاتك السحرية!\nالرقم الصحيح كان *${game.secret}*\nأرسل !تخمين لتبدأ من جديد ولا تستسلم أبدًا!` },
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

  // ===== لعبة سؤال وجواب (Trivia) =====
  if (commandKey === 'سؤال' || commandKey === 'trivia') {
    const question = triviaDb[Math.floor(Math.random() * triviaDb.length)];
    setGameState(chatId, 'trivia', { answer: question.a }); // Use chatId so anyone in group can answer
    await sock.sendMessage(chatId, { text: `❓ *سؤال من أستا:* \n\n${question.q}\n\n💡 خمن الإجابة عبر كتابة: !جواب <إجابتك>` }, { quoted: msg });
    return;
  }

  if (commandKey === 'جواب' || commandKey === 'answer') {
    const gameState = getGameState(chatId);
    if (!gameState || gameState.game_type !== 'trivia') {
      return await sock.sendMessage(chatId, { text: '⚠️ لا يوجد سؤال مجهّز حالياً! اكتب `!سؤال` لبدء التحدي ولنشعل حماسنا للتدريب!' }, { quoted: msg });
    }

    const answer = args.join(' ').toLowerCase();
    if (!answer) {
      return await sock.sendMessage(chatId, { text: '⚠️ اكتب إجابتك! مثال: `!جواب سحر`' }, { quoted: msg });
    }

    if (answer.includes(gameState.state_data.answer.toLowerCase()) || gameState.state_data.answer.toLowerCase().includes(answer)) {
      clearGameState(chatId);
      await sock.sendMessage(chatId, { text: `✨ يووووش! إجابة صحيحة من بطلنا السحري!\nالإجابة هي: *${gameState.state_data.answer}*` }, { quoted: msg });
    } else {
      await sock.sendMessage(chatId, { text: '❌ خطأ! الجواب لا يبدو قريباً حتى... حاول مرة ثانية ولا تستسلم كفرسان السحر المحبطين!' }, { quoted: msg });
    }
    return;
  }

  // ===== لعبة المصير - حظ أنمي =====
  if (commandKey === 'لعبة' || commandKey === 'game') {
    const text = `🎮 *ألعاب بلاك كلوفر السحرية* - اختر:\n\n✊ !حجر  ✋ !ورقه  ✌️ !مقص\n(حجر ورقة مقص ضد البوت)\n\n🔢 !تخمين\n(تخمين رقم سري بين 1 و20)\n\n❓ !سؤال\n(اختبر معلوماتك في الأنمي)`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }
};
