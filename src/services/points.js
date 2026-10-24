// =============================================
// ⭐ نظام النقاط (XP): كل رسالة تعطي نقاطاً حسب نوعها
// =============================================
const { awardPoints, getUserPoints, getChatPointsRank, getPointsLeaderboard } = require('../database/db');

const COOLDOWN_MS = 5000; // حتى لا يُستغل السبام لجمع النقاط
const TITLES = [
  [0, 'مبتدئ 🌱'],
  [50, 'مقاتل ⚔️'],
  [200, 'فارس 🛡️'],
  [500, 'قائد 🏹'],
  [1000, 'أسطورة 🔥'],
];

function titleFor(points) {
  let title = TITLES[0][1];
  for (const [min, name] of TITLES) if (points >= min) title = name;
  return title;
}

/** يمنح نقاط الرسالة. النص = نقطة، الوسائط = نقطتان. */
function awardForMessage({ chatId, senderId, senderName, hasMedia = false, now = Date.now() }) {
  return awardPoints({
    chatId,
    userId: senderId,
    userName: senderName,
    amount: hasMedia ? 2 : 1,
    cooldownMs: COOLDOWN_MS,
    now,
  });
}

function getProfile(chatId, senderId) {
  const row = getUserPoints(chatId, senderId);
  return {
    points: row?.points || 0,
    messages: row?.messages || 0,
    rank: row ? getChatPointsRank(chatId, senderId) : null,
    title: titleFor(row?.points || 0),
  };
}

function leaderboard(chatId, limit = 10) {
  return getPointsLeaderboard(chatId, limit);
}

module.exports = { awardForMessage, getProfile, leaderboard, titleFor, COOLDOWN_MS, TITLES };
