const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveMessage, saveLastSeen, getCustomReplies, getWelcomeMessage, getGlobalSetting, getChatSettings, getMessage, getCustomReactions, isBanned } = require('../database/db');
const { createWelcomeCard } = require('../utils/welcomeCard');
const config = require('../config');
const logger = require('../utils/logger');
const responses = require('../utils/responses');
const handleCommand = require('./commandHandler');
const { isOwnerId } = require('./commandHandler');
const { checkActiveAnswer } = require('../commands/games');
// دالة التحقق من إيقاف البوت في مجموعة معينة (safe import)
let isBotDisabled;
try { isBotDisabled = require('../commands/utils').isBotDisabled; }
catch (e) { isBotDisabled = () => false; }

// الردود الآلية المشتركة تُقرأ الآن من responses.json (سهل التعديل بدون لمس الكود)
function getGreetings() {
  const g = responses.all().greetings || {};
  return { EXACT_REPLIES: g.exact || {}, CONTAINS_REPLIES: g.contains || {} };
}

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

// تنفيذ الأوامر تلقائياً إذا كانت مُرسلة من رقم البوت نفسه (هاتفك الأساسي المربوط بالجلسة)
async function handleSelfCommand(msg, sock) {
  if (!config.features.selfCommandExecution) return;
  try {
    if (!msg.message) return;
    const chatId = msg.key.remoteJid;
    const text = extractText(msg.message);
    if (!text || !text.startsWith(config.prefix)) return;

    const rawSelfId = sock.user?.id || '';
    const selfNumber = rawSelfId.split(':')[0].split('@')[0];
    const senderId = selfNumber ? `${selfNumber}@s.whatsapp.net` : chatId;

    await handleCommand({ sock, msg, text, chatId, senderId });
  } catch (err) {
    logger.error('خطأ أثناء تنفيذ أمر ذاتي (من رقم البوت): ' + err.message);
  }
}

async function handleIncomingMessages({ messages }, sock) {
  for (const msg of messages) {
    try {
      // تخطي الرسائل الفارغة
      if (!msg.message) continue;

      // رسائل مرسلة من رقم البوت نفسه (هاتفك المربوط) -> نفّذ الأوامر تلقائياً كمالك، وتخطَّ باقي المعالجة
      if (msg.key.fromMe) {
        await handleSelfCommand(msg, sock);
        continue;
      }

      const chatId = msg.key.remoteJid;
      // في المجموعات: المرسل هو participant، وإلا هو الـ remoteJid نفسه
      const senderId = msg.key.participant || msg.key.remoteJid;

      // منع تعديل الرسائل
      const protocolType = msg.message?.protocolMessage?.type;
      if (protocolType === 14) {
        await sock.sendMessage(chatId, { text: '⚔️ أستا لاحظ أنك قمت بتعديل رسالتك! لا يمكنك التراجع عن كلماتك في قتال السحر!' }, { quoted: msg });

        const originalId = msg.message.protocolMessage.key.id;
        const oldMsg = getMessage(originalId);
        if (oldMsg && oldMsg.text_content) {
          await sock.sendMessage(chatId, { text: `لقد قلت سابقاً:\n"${oldMsg.text_content}"\n\nأستا لا ينسى ولا يتراجع!` }, { quoted: msg });
        }
        continue;
      }

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
      const isOwner = isOwnerId(senderId);
      if (isMaintenance && !isOwner) {
        if (text && text.startsWith(config.prefix)) {
          await sock.sendMessage(chatId, { text: responses.get('persona', 'maintenance') }, { quoted: msg });
        }
        continue;
      }

      // 🚫 المحظورون: نتجاهل رسائلهم تماماً في الردود الآلية والألعاب (الأوامر تُرفض داخل commandHandler)
      const senderBanned = !isOwner && isBanned(senderId);

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

      // التفاعلات المخصصة (Auto-Reactions)
      if (text && !senderBanned) {
        const reactions = getCustomReactions();
        for (const rx of reactions) {
          if (text.includes(rx.keyword)) {
            await sock.sendMessage(chatId, { react: { text: rx.emoji, key: msg.key } });
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

      // 🎮 فعاليات الأنمي التلقائية (تفكيك/تخمين): يلتقط البوت الإجابة الصحيحة مباشرة من الدردشة بدون أمر
      if (text && !senderBanned) {
        const handled = await checkActiveAnswer({ sock, msg, chatId, senderId, text });
        if (handled) continue;
      }

      // الردود الآلية (تعمل في الخاص والمجموعات)
      if (config.features.autoReply && !senderBanned) {
        const customReply = resolveCustomReply(text, chatId);
        if (customReply) {
          await sock.sendMessage(chatId, { text: customReply }, { quoted: msg });
          continue;
        }

        const trimmedText = text.trim();
        const { EXACT_REPLIES, CONTAINS_REPLIES } = getGreetings();

        // أولاً: التحقق من المطابقة التامة (Exact Match)
        if (EXACT_REPLIES[trimmedText]) {
          await sock.sendMessage(chatId, { text: EXACT_REPLIES[trimmedText] }, { quoted: msg });
          continue;
        }

        // ثانياً: التحقق من المطابقة الجزئية (Contains Match)
        let replied = false;
        for (const [keyword, reply] of Object.entries(CONTAINS_REPLIES)) {
          if (text.includes(keyword)) {
            await sock.sendMessage(chatId, { text: reply }, { quoted: msg });
            replied = true;
            break;
          }
        }
        if (replied) continue;
      }
    } catch (err) {
      logger.error('Error handling message: ' + err.message);
    }
  }
}

module.exports = handleIncomingMessages;
