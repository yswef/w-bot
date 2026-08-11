const animeResponses = [
  '🌙 أنت محظوظ اليوم، والفرصة تميل إليك.',
  '✨ قد تكون الخطوة القادمة هي المفتاح.',
  '🖤 لا تتسرع، فالوقت يفتح أبوابه ببطء.',
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = async function gamesCommand({ sock, msg, args, chatId, commandKey }) {
  if (commandKey === 'لعبة' || commandKey === 'game') {
    const text = `🎮 لعبة بسيطة:\nأرسل رقمًا من 1 إلى 10 لتكتشف الحظ الأنمي لديك.\n${pick(animeResponses)}`;
    await sock.sendMessage(chatId, { text }, { quoted: msg });
    return;
  }

  if (commandKey === 'أفكاري' || commandKey === 'guess') {
    const value = Number(args[0]);
    const result = value && value > 0 && value <= 10 ? '✅ ممتاز! أنت تمتلك حظًا أنميًا قويًا.' : '⚠️ اكتب رقمًا صالحًا بين 1 و10.';
    await sock.sendMessage(chatId, { text: result }, { quoted: msg });
  }
};
