// =============================================
// 🎮 ألعاب بلاك كلوفر - Rock Paper Scissors + Guess the Number
// =============================================

const rpsOptions = ['حجر', 'ورقه', 'مقص'];
const rpsEmoji = { 'حجر': '✊', 'ورقه': '✋', 'مقص': '✌️' };

// تتبع ألعاب تخمين الأرقام النشطة لكل مستخدم
const activeGuessGames = new Map();

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
    activeGuessGames.set(senderId, { secret, attempts: 0 });
    await sock.sendMessage(chatId,
      { text: `🎲 *لعبة التخمين* - بلاك كلوفر\n\nفكرت بـ رقم بين 1 و 20 🔢\nالعندك 5 محاولات، أرسل: !اخمن <رقم>` },
      { quoted: msg }
    );
    return;
  }

  // ===== محاولة تخمين رقم =====
  if (commandKey === 'اخمن') {
    const game = activeGuessGames.get(senderId);
    if (!game) {
      await sock.sendMessage(chatId, { text: '⚠️ ما عندك لعبة نشطة! أرسل: !تخمين لبدء لعبة جديدة' }, { quoted: msg });
      return;
    }
    const guess = parseInt(args[0]);
    if (isNaN(guess)) {
      await sock.sendMessage(chatId, { text: '⚠️ أرسل رقم صالح. مثال: !اخمن 7' }, { quoted: msg });
      return;
    }
    game.attempts++;
    if (guess === game.secret) {
      activeGuessGames.delete(senderId);
      await sock.sendMessage(chatId,
        { text: `✅ *أحسنت يا بطل!* 🎉\nالرقم الصح هو *${game.secret}* وخمنته في ${game.attempts} محاولات!\n⚔️ تجاوز حدودك هنا والآن!` },
        { quoted: msg }
      );
    } else if (game.attempts >= 5) {
      activeGuessGames.delete(senderId);
      await sock.sendMessage(chatId,
        { text: `😵 انتهت محاولاتك!\nالرقم الصح كان *${game.secret}*\n!تخمين أرسل لتبدأ من جديد` },
        { quoted: msg }
      );
    } else {
      const hint = guess < game.secret ? 'أكبر' : 'أصغر';
      await sock.sendMessage(chatId,
        { text: `🔍 الرقم المطلوب ${hint} من ${guess}.\nلديك ${5 - game.attempts} محاولات متبقية.` },
        { quoted: msg }
      );
    }
    return;
  }

  // ===== لعبة المصير - حظ أنمي =====
  if (commandKey === 'لعبة' || commandKey === 'game') {
    const text = `🎮 *ألعاب بلاك كلوفر* - اختر:\n\n✊ !حجر  ✋ !ورقه  ✌️ !مقص\n(حجر ورقة مقص ضد البوت)\n\n🔢 !تخمين\n(تخمين رقم سري بين 1 و20)`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  // ===== اختبار الحظ القديم =====
  if (commandKey === 'أفكاري' || commandKey === 'guess') {
    const value = Number(args[0]);
    const result = value && value > 0 && value <= 10
      ? '✅ ممتاز! أنت تمتلك حظًا أنميًا قويًا مثل أستا!'
      : '⚠️ اكتب رقمًا صالحًا بين 1 و10. مثال: !أفكاري 7';
    await sock.sendMessage(chatId, { text: result }, { quoted: msg });
  }
};
