const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveMessage, saveLastSeen, getCustomReplies, getWelcomeMessage } = require('../database/db');
const config = require('../config');
const logger = require('../utils/logger');
const handleCommand = require('./commandHandler');

const AUTO_REPLIES = {
  سلام: 'وعليكم السلام ورحمة الله وبركاته، أهلاً بك! 👋🤖🍀',
  مرحبا: 'أهلاً وسهلاً! كيف أقدر أساعدك اليوم؟ 🤖🍀',
  هلا: 'أهلاً بك! تفضل كيف أقدر أساعدك؟ 🤖🍀',
  صباح: 'صباح الخير والسرور! أتمنى لك يوماً سعيداً 🌅🤖🍀',
  مساء: 'مساء النور والسرور! كيف أقدر أساعدك؟ 🌃🤖🍀',
  يوسف: 'يا عيون يوسف، أنت كيف الحال؟ 🤖🍀',
  شكرا: 'العفو! في خدمتك دائماً ✨🤖🍀',
  مشكور: 'العفو، أتمنى لك يوماً طيباً ✨🤖🍀',
  يعطيك: 'الله يعافيك ويسلمك! ✨🤖🍀',
  تسلم: 'الله يسلمك ويحفظك ✨🤖🍀',
  '.': 'يوسف قد يبدو متصلاً لكنه يشتغل الآن (رد آلي 🤖🍀)',
  'من أنت': 'أنا استا ساما، وأنا بوت صممني مالكي، وأحب معلمي يوسف وأحب الرسائل المحذوفة لأنني أستطيع مساعدتك في استرجاعها 🖤✨',
  'انا استا ساما': 'أجل، أنا استا ساما، بوت أنمي لطيف ومشغول بمساعدة الناس 💫🖤',
  'معلمك': 'معلمي يوسف هو من علمني كيف أكون أكثر فائدة ومحبوباً 🌸',
  'بلك كلوفر': 'بلوك كلوفر يملك سحرًا خاصًا، وأنا أضيف إليه لمسة من الأناقة والأنمي 🌙✨',
  'انمي': 'أنا أحب الأنمي، وأحاول أن أكون بوتًا أنيقًا وذكيًا مثل عالم بلاك كلوفر 🖤',
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

function isGroupChat(chatId) {
  return chatId?.endsWith('@g.us');
}

function resolveCustomReply(text, chatId) {
  const replies = getCustomReplies(isGroupChat(chatId) ? 'group' : 'private');
  const fallback = getCustomReplies('all');
  const combined = [...fallback, ...replies];

  for (const item of combined) {
    if (text.toLowerCase().includes(item.keyword.toLowerCase())) {
      return item.reply;
    }
  }

  return null;
}

async function handleWelcomeMessage(msg, sock, chatId) {
  const welcome = getWelcomeMessage(chatId);
  if (!welcome || welcome.enabled !== 1) return;

  const text = welcome.message || 'مرحباً بك في القروب! 🌸🤖';
  try {
    if (welcome.image_path && fs.existsSync(welcome.image_path)) {
      const buffer = fs.readFileSync(welcome.image_path);
      await sock.sendMessage(chatId, { image: buffer, caption: text });
    } else {
      await sock.sendMessage(chatId, { text });
    }
  } catch (err) {
    logger.warn('تعذر إرسال رسالة ترحيب: ' + err.message);
  }
}

async function handleIncomingMessages({ messages }, sock) {
  for (const msg of messages) {
    try {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const chatId = msg.key.remoteJid;
      const senderId = msg.key.participant || chatId;
      const text = extractText(msg.message);
      const msgType = Object.keys(msg.message)[0];

      const isSystemEvent = msg.message?.messageStubType === 27 || msg.message?.messageStubType === 28;
      if (isSystemEvent) {
        await handleWelcomeMessage(msg, sock, chatId);
      }

      let mediaPath = null;
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

      saveLastSeen({ chatId, senderId });

      logger.info(`[رسالة] ${msg.pushName || senderId}: ${text || '<وسائط>'}`);

      if (config.features && text.startsWith(config.prefix)) {
        await handleCommand({ sock, msg, text, chatId, senderId });
        continue;
      }

      if (config.features.autoReply) {
        const customReply = resolveCustomReply(text, chatId);
        if (customReply) {
          await sock.sendMessage(chatId, { text: customReply }, { quoted: msg });
          continue;
        }

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
