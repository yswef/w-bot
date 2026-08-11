const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../config');

/**
 * الاستخدام: رد (reply) على صورة أو فيديو/GIF قصير واكتب !sticker
 * - صورة  -> ملصق ثابت
 * - فيديو/GIF -> ملصق متحرك (لازم يكون أقل من ~10 ثواني)
 * "حقوق الملصق" (اسم الباك + المؤلف) تُقرأ من .env ممكن تغيّرها وقتها تشتغل
 */
module.exports = async function sticker({ sock, msg, chatId }) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted) {
    await sock.sendMessage(
      chatId,
      { text: '📌 رد على صورة أو فيديو قصير واكتب الأمر عشان أحوّلها ملصق.' },
      { quoted: msg }
    );
    return;
  }

  const quotedType = Object.keys(quoted)[0];
  if (!['imageMessage', 'videoMessage'].includes(quotedType)) {
    await sock.sendMessage(chatId, { text: '❌ لازم ترد على صورة أو فيديو فقط.' }, { quoted: msg });
    return;
  }

  // نبني كائن رسالة وهمي عشان نقدر نستخدم downloadMediaMessage على الرسالة المقتبَسة
  const fakeMsg = {
    key: {
      remoteJid: chatId,
      id: msg.message.extendedTextMessage.contextInfo.stanzaId,
      fromMe: false,
      participant: msg.message.extendedTextMessage.contextInfo.participant,
    },
    message: quoted,
  };

  const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});

  const stickerObj = new Sticker(buffer, {
    pack: config.stickerPackName,     // ده اللي يظهر كـ "حقوق"/اسم الباكدج
    author: config.stickerAuthorName, // وده اسم المؤلف اللي يظهر تحت الملصق
    type: StickerTypes.FULL,          // أو CROPPED للمربع الكامل
    quality: 70,
  });

  const stickerBuffer = await stickerObj.toBuffer();
  await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: msg });
};
