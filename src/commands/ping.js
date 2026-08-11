module.exports = async function ping({ sock, msg, chatId }) {
  const start = Date.now();
  await sock.sendMessage(chatId, { text: '🏓 Pong! جاري القياس...' }, { quoted: msg });
  const latency = Date.now() - start;
  await sock.sendMessage(chatId, { text: `⏱️ السرعة: ${latency}ms` });
};
