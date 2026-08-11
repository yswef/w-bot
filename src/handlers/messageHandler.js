const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveMessage } = require('../database/db');
const config = require('../config');
const logger = require('../utils/logger');
const handleCommand = require('./commandHandler');

// ردود ثابتة بسيطة: كلمة مفتاحية -> رد
// عدّل أو وسّع هالقائمة كيفما تحب
const AUTO_REPLIES = {
  السلام: 'وعليكم السلام ورحمة الله 👋',
  مرحبا: 'أهلاً وسهلاً! كيف أقدر أساعدك؟',
  السعر: 'تواصل معنا على الرقم كذا للأسعار 📞',
};

function extractText(message) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ''
  );
}

async function handleIncomingMessages({ messages }, sock) {
  for (const msg of messages) {
    try {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // نتجاهل رسائلنا احنا

      const chatId = msg.key.remoteJid;
      const senderId = msg.key.participant || chatId;
      const text = extractText(msg.message);
      const msgType = Object.keys(msg.message)[0];

      let mediaPath = null;
      // نخزن الوسائط (صور/فيديو/صوت) محلياً عشان لو انحذفت نقدر نعيدها
      if (['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(msgType)) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          const dir = path.join(__dirname, '..', '..', 'media_store');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const ext = msgType.replace('Message', '');
          mediaPath = path.join(dir, `${msg.key.id}.${ext}`);
          fs.writeFileSync(mediaPath, buffer);
        } catch (e) {
          logger.warn('تعذر تحميل الوسائط: ' + e.message);
        }
      }

      // 1) تسجيل الرسالة في قاعدة البيانات (لازم قبل أي رد عشان ميزة كشف الحذف تشتغل)
      saveMessage({
        id: msg.key.id,
        chat_id: chatId,
        sender_id: senderId,
        sender_name: msg.pushName || senderId,
        message_type: msgType,
        text_content: text,
        media_path: mediaPath,
        timestamp: Date.now(),
      });

      logger.info(`[رسالة] ${msg.pushName || senderId}: ${text || '<وسائط>'}`);

      // 2) لو الرسالة أمر (تبدأ بالبادئة) نمررها لمعالج الأوامر
      if (config.features && text.startsWith(config.prefix)) {
        await handleCommand({ sock, msg, text, chatId, senderId });
        continue;
      }

      // 3) رد تلقائي بسيط حسب كلمات مفتاحية
      if (config.features.autoReply) {
        for (const [keyword, reply] of Object.entries(AUTO_REPLIES)) {
          if (text.includes(keyword)) {
            await sock.sendMessage(chatId, { text: reply }, { quoted: msg });
            break;
          }
        }
      }
    } catch (err) {
      logger.error('خطأ في معالجة رسالة: ' + err.message);
    }
  }
}

module.exports = handleIncomingMessages;
