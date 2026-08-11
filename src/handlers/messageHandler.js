const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveMessage, saveLastSeen, getCustomReplies, getWelcomeMessage } = require('../database/db');
const config = require('../config');
const logger = require('../utils/logger');
const handleCommand = require('./commandHandler');
// دالة التحقق من إيقاف البوت في مجموعة معينة (safe import)
let isBotDisabled;
try { isBotDisabled = require('../commands/utils').isBotDisabled; }
catch (e) { isBotDisabled = () => false; }


const AUTO_REPLIES = {
  "سلام": 'وعليكم السلام ورحمة الله وبركاته، أهلاً بك! 👋🤖🍀',
  "مرحبا": 'أهلاً وسهلاً! كيف أقدر أساعدك اليوم؟ 🤖🍀',
  "هلا": 'أهلاً بك! تفضل كيف أقدر أساعدك؟ 🤖🍀',
  "صباح": 'صباح الخير والسرور! أتمنى لك يوماً سعيداً 🌅🤖🍀',
  "مساء": 'مساء النور والسرور! كيف أقدر أساعدك؟ 🌃🤖🍀',
  "يوسف": 'يا عيون يوسف، أنت كيف الحال؟ 🤖🍀',
  "شكرا": 'العفو! في خدمتك دائماً ✨🤖🍀',
  "مشكور": 'العفو، أتمنى لك يوماً طيباً ✨🤖🍀',
  "يعطيك": 'الله يعافيك ويسلمك! ✨🤖🍀',
  "تسلم": 'الله يسلمك ويحفظك ✨🤖🍀',
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
      // تخطي الرسائل الفارغة
      if (!msg.message) continue;
      // تخطي رسائل البوت نفسه
      if (msg.key.fromMe) continue;

      const chatId = msg.key.remoteJid;
      // في المجموعات: المرسل هو participant، وإلا هو الـ remoteJid نفسه
      const senderId = msg.key.participant || msg.key.remoteJid;
      const text = extractText(msg.message);
      const msgType = Object.keys(msg.message)[0];

      // معالجة أحداث الانضمام للمجموعات (ترحيب تلقائي)
      const stubType = msg.message?.messageStubType;
      if (stubType === 27 || stubType === 28) {
        await handleWelcomeMessage(msg, sock, chatId);
        continue; // هذا حدث نظامي، ليس رسالة عادية
      }

      // تخطي المعالجة إذا كان البوت مُوقفاً في هذه المحادثة
      if (isBotDisabled(chatId)) continue;

      // تسجيل الوسائط في مجلد محلي مؤقت
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

      // حفظ الرسالة وآخر ظهور
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

      const chatType = chatId.endsWith('@g.us') ? '[مجموعة]' : '[خاص]';
      logger.info(`${chatType} ${msg.pushName || senderId}: ${text || '<وسائط>'}`);

      // معالجة الأوامر في المجموعات والخاص على حدٍّ سواء
      if (text && text.startsWith(config.prefix)) {
        await handleCommand({ sock, msg, text, chatId, senderId });
        continue;
      }

      // الردود الآلية (تعمل في الخاص فقط لتجنب الإزعاج في المجموعات)
      if (config.features.autoReply && !chatId.endsWith('@g.us')) {
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
