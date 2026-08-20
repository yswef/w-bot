const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../config');

/**
 * الاستخدام:
 *  - رد (reply) على صورة أو فيديو/GIF قصير واكتب .ملصق
 *  - أو أرسل صورة/فيديو مباشرة مع كتابة .ملصق كـ caption (بدون الحاجة لعمل رد)
 *  - .سرقة (رد على ملصق) -> يعيد إرساله بحقوق أستا/المطور
 * "حقوق الملصق" (اسم الباك + المؤلف) تُقرأ من .env
 */
module.exports = async function sticker({ sock, msg, chatId, commandKey }) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedType = quoted ? Object.keys(quoted)[0] : null;

  // ===== سرقة ملصق موجود: نعيد تغليفه بحقوق أستا ونعيد إرساله =====
  if (commandKey === 'سرقة' || commandKey === 'steal') {
    if (!quoted || quotedType !== 'stickerMessage') {
      await sock.sendMessage(chatId, { text: '📌 رد على ملصق موجود عشان أستا يسرقه له! ⚔️' }, { quoted: msg });
      return;
    }
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
    const stolenSticker = new Sticker(buffer, {
      pack: config.stickerPackName,
      author: config.stickerAuthorName,
      type: StickerTypes.FULL,
      quality: 70,
    });
    await sock.sendMessage(chatId, { sticker: await stolenSticker.toBuffer() }, { quoted: msg });
    return;
  }

  // ===== تحويل صورة/فيديو إلى ملصق =====
  let mediaType = null;
  let fakeMsg = null;

  // الحالة الأولى: رد على صورة أو فيديو
  if (quoted && ['imageMessage', 'videoMessage'].includes(quotedType)) {
    mediaType = quotedType;
    fakeMsg = {
      key: {
        remoteJid: chatId,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
        fromMe: false,
        participant: msg.message.extendedTextMessage.contextInfo.participant,
      },
      message: quoted,
    };
  } else {
    // الحالة الثانية: الأمر أُرسل كـ caption مباشرة مع الصورة/الفيديو (بدون رد)
    const directType = Object.keys(msg.message || {})[0];
    if (['imageMessage', 'videoMessage'].includes(directType)) {
      mediaType = directType;
      fakeMsg = msg;
    }
  }

  if (!mediaType) {
    await sock.sendMessage(
      chatId,
      { text: '📌 رد على صورة أو فيديو/GIF قصير، أو أرسلها مباشرة وأكتب الأمر كتعليق (caption)، عشان أحوّلها ملصق! ⚔️' },
      { quoted: msg }
    );
    return;
  }

  // فيديو/GIF أطول من ~15 ثانية غير مدعوم لصنع ملصق متحرك
  if (mediaType === 'videoMessage') {
    const videoInfo = quotedType === 'videoMessage' ? quoted.videoMessage : msg.message.videoMessage;
    if (videoInfo?.seconds && videoInfo.seconds > 15) {
      await sock.sendMessage(chatId, { text: '⚠️ الفيديو طويل جداً! أرسل فيديو أو GIF أقل من 15 ثانية.' }, { quoted: msg });
      return;
    }
  }

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
