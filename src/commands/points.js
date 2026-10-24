// =============================================
// ⭐ أوامر النقاط: نقاطي + المتصدرين
// =============================================
const config = require('../config');
const { jidUser } = require('../utils/permissions');
const points = require('../services/points');

module.exports = async function pointsCommand({ sock, msg, chatId, senderId, commandKey }) {
  const isGroup = chatId.endsWith('@g.us');
  if (commandKey === 'المتصدرين' || commandKey === 'توب' || commandKey === 'leaderboard') {
    const rows = points.leaderboard(chatId, 10);
    if (!rows.length) {
      return sock.sendMessage(chatId, { text: '📭 لا توجد نقاط مسجّلة بعد. تكسب نقطة مع كل رسالة!' }, { quoted: msg });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = rows.map((r, i) => {
      const name = r.user_name || jidUser(r.user_id);
      return `${medals[i] || `${i + 1}.`} ${name} — ${r.points} نقطة (${points.titleFor(r.points)})`;
    });
    return sock.sendMessage(chatId, {
      text: `🏆 *المتصدرون في هذه المحادثة*\n\n${lines.join('\n')}`,
    }, { quoted: msg });
  }

  const p = points.getProfile(chatId, senderId);
  const who = jidUser(senderId);
  const nextTitle = points.TITLES.find(([min]) => min > p.points);
  const progress = nextTitle ? `\n⬆️ باقي ${nextTitle[0] - p.points} نقطة للرتبة التالية: ${nextTitle[1]}` : '';
  const text =
    `⭐ *نقاطك*\n\n` +
    `👤 @${who}\n` +
    `🏅 الرتبة: ${p.title}\n` +
    `💯 النقاط: ${p.points}\n` +
    `💬 الرسائل المحسوبة: ${p.messages}\n` +
    `🏁 ترتيبك: ${p.rank ? '#' + p.rank : '—'}${progress}\n\n` +
    (isGroup
      ? `📌 النقاط: نقطة لكل رسالة نصية، ونقطتان للوسائط (بفاصل 5 ثوانٍ). المتصدرون: ${config.prefix}المتصدرين`
      : `📌 تُحسب النقاط في المجموعات فقط.`);
  return sock.sendMessage(chatId, { text, mentions: [senderId] }, { quoted: msg });
};
