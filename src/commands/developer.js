// =============================================
// 👨‍💻 التواصل مع المطور
// =============================================
const responses = require('../utils/responses');

module.exports = async function developerCommand({ sock, msg, chatId }) {
  await sock.sendMessage(chatId, { text: responses.get('developer', 'card') }, { quoted: msg });
};
