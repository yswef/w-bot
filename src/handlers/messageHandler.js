const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveMessage, saveLastSeen, getCustomReplies, getWelcomeMessage, getGlobalSetting, getChatSettings } = require('../database/db');
const { createWelcomeCard } = require('../utils/welcomeCard');
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
  'بلاك كلوفر': 'بلاك كلوفر يملك سحرًا خاصًا، وأنا أضيف إليه لمسة من الأناقة والأنمي 🌙✨',
  'انمي': 'أنا أحب الأنمي، وأحاول أن أكون بوت لا يستسلم مثل معلمي يوسف 🖤',
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
  const settings = getChatSettings(chatId);
  if (settings.welcome_enabled !== 1) return;

  const stubType = msg.message?.messageStubType;
  const participant = msg.message?.messageStubParameters?.[0];

  if ((stubType === 27 || stubType === 28) && participant) {
    try {
      const userName = participant.split('@')[0];
      let pfp;
      try {
        pfp = await sock.profilePictureUrl(participant, 'image');
      } catch {
        pfp = null;
      }

      const buffer = await createWelcomeCard(userName, pfp);
      await sock.sendMessage(chatId, { image: buffer, caption: 'أهلاً وسهلاً بك في مجموعة أستا ساما! نأمل ألا تختفي إرادتك للمشاركة! 🍀⚔️' });
    } catch (err) {
      logger.warn('Failed to send canvas welcome message: ' + err.message);
    }
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

      const isMaintenance = getGlobalSetting('maintenance_mode') === '1';
      const isOwner = senderId === (config.ownerNumber + '@s.whatsapp.net');
      if (isMaintenance && !isOwner) {
        if (text && text.startsWith(config.prefix)) {
          await sock.sendMessage(chatId, { text: '🏋️ أستا يتدرب الان ليصبح اقوى، قومو بالدعاء له! الإصرار لا يموت! 💥' }, { quoted: msg });
        }
        continue;
      }

      // 🛡️ حماية ضد الروابط (Anti-Link)
      if (chatId.endsWith('@g.us') && !msg.key.fromMe) {
        const chatSettings = getChatSettings(chatId);
        if (chatSettings.anti_link === 1 && !isOwner) {
          const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi;
          if (linkRegex.test(text)) {
            await sock.sendMessage(chatId, { text: '⚔️ أستا لن يسمح بنشر سحر الأعداء في هذا الجروب! روابط ممنوعة!' }, { quoted: msg });
            try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (e) { }
            continue; // Stop processing this message
          }
        }
      }

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
          logger.warn('Failed to download media: ' + e.message);
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

      const chatType = chatId.endsWith('@g.us') ? '[Group]' : '[Private]';
      logger.info(`${chatType} ${msg.pushName || senderId}: ${text || '<media>'}`);

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
      logger.error('Error handling message: ' + err.message);
    }
  }
}

module.exports = handleIncomingMessages;
