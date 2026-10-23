const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveMessage, saveLastSeen, getCustomReplies, getGlobalSetting, getChatSettings, getCustomReactions, isBanned } = require('../database/db');
const config = require('../config');
const logger = require('../utils/logger');
const responses = require('../utils/responses');
const handleCommand = require('./commandHandler');
const { handleEditFromUpsert } = require('./editHandler');
const { handleRevokeFromUpsert } = require('./deleteHandler');
const { isOwnerId } = require('./commandHandler');
const { checkActiveAnswer } = require('../commands/games');
const { extractText, getRealMessageType } = require('../utils/messageContent');
const { containsKeyword, exactMatch, normalizeArabic } = require('../utils/matcher');
const { awardForMessage } = require('../services/points');
const { jidUser } = require('../utils/permissions');

// دالة التحقق من إيقاف البوت في مجموعة معينة (safe import)
let isBotDisabled;
try { isBotDisabled = require('../commands/utils').isBotDisabled; }
catch (e) { isBotDisabled = () => false; }

// الردود الآلية المشتركة تُقرأ من responses.json (سهل التعديل بدون لمس الكود)
function getGreetings() {
  const g = responses.all().greetings || {};
  return { EXACT_REPLIES: g.exact || {}, CONTAINS_REPLIES: g.contains || {} };
}

const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/)\S+/i;
const HELP_WORDS = ['اوامر', 'الاوامر', 'أوامر', 'الأوامر', 'مساعدة', 'مساعده', 'قائمة الاوامر', 'menu', 'help', 'commands'];

function isGroupChat(chatId) {
  return chatId?.endsWith('@g.us');
}

// ⚠️ منع معالجة الرسالة مرتين (تكرار الحدث بعد إعادة الاتصال يسبب تنفيذ الأمر مرتين)
const seenMessages = new Map(); // key -> timestamp
const SEEN_TTL_MS = 10 * 60 * 1000;
function alreadySeen(key) {
  const now = Date.now();
  if (seenMessages.size > 5000) {
    for (const [k, t] of seenMessages) if (now - t > SEEN_TTL_MS) seenMessages.delete(k);
  }
  if (seenMessages.has(key)) return true;
  seenMessages.set(key, now);
  return false;
}

// ⚠️ إصلاح: كانت المطابقة includes داخل النص، فيُطابق "كم" داخل "كمامة".
// الآن تطابق كلمة كاملة، وعند تعدد المطابقات تُفضَّل الكلمة الأطول (الأدق).
function resolveCustomReply(text, chatId) {
  const replies = getCustomReplies(isGroupChat(chatId) ? 'group' : 'private');
  const matches = replies
    .filter((item) => containsKeyword(text, item.keyword))
    .sort((a, b) => normalizeArabic(b.keyword).length - normalizeArabic(a.keyword).length);
  return matches[0]?.reply || null;
}

// تنفيذ الأوامر تلقائياً إذا كانت مُرسلة من رقم البوت نفسه (هاتفك المربوط)
async function handleSelfCommand(msg, sock, text) {
  if (!config.features.selfCommandExecution) return;
  try {
    if (!text || !text.startsWith(config.prefix)) return;
    const chatId = msg.key.remoteJid;
    const selfNumber = jidUser(sock.user?.id || '');
    const senderId = selfNumber ? `${selfNumber}@s.whatsapp.net` : chatId;
    await handleCommand({ sock, msg, text, chatId, senderId });
  } catch (err) {
    logger.error('خطأ أثناء تنفيذ أمر ذاتي (من رقم البوت): ' + err.message);
  }
}

// حفظ رسائل الرقم نفسه (لازم للتعديل والحذف لاحقاً)، بدون تنزيل الوسائط
function saveOwnMessage(msg, sock, text, msgType) {
  const selfNumber = jidUser(sock.user?.id || '');
  const chatId = msg.key.remoteJid;
  saveMessage({
    id: msg.key.id,
    chat_id: chatId,
    sender_id: selfNumber ? `${selfNumber}@s.whatsapp.net` : chatId,
    sender_name: msg.pushName || 'أنا',
    message_type: msgType || null,
    text_content: text || null,
    media_path: null,
    timestamp: Number(msg.messageTimestamp) ? Number(msg.messageTimestamp) * 1000 : Date.now(),
  });
}

// ⚠️ إصلاح جوهري: الحدث "messages.upsert" يحمل "type": "notify" للرسائل الحقيقية
// الجديدة، و"append"/"replace" لمزامنة السجل القديم بعد الاتصال. نتجاهل المزامنة حتى لا
// نعالج أوامر قديمة أو وسائط منتهية الصلاحية.
async function handleIncomingMessages({ messages, type }, sock) {
  if (type && type !== 'notify') return;

  for (const msg of messages) {
    try {
      if (!msg.message) continue; // رسائل النظام لا تهمنا هنا (الترحيب يُعالج بحدث مستقل)

      const chatIdRaw = msg.key?.remoteJid;
      if (!chatIdRaw || chatIdRaw === 'status@broadcast') continue; // تجاهل الحالات (Status)

      if (alreadySeen(`${chatIdRaw}|${msg.key.id}|${msg.key.fromMe ? 1 : 0}`)) continue;

      // ✏️ رصد تعديل الرسائل أولاً — حتى التعديلات الصادرة من رقم البوت نفسه
      if (await handleEditFromUpsert(msg, sock)) continue;

      // 🗑️ رصد الحذف الوارد عبر upsert
      if (await handleRevokeFromUpsert(msg, sock)) continue;

      const chatId = chatIdRaw;
      const text = extractText(msg.message);
      const msgType = getRealMessageType(msg.message);

      // 📤 رسائل الرقم نفسه: نحفظها (للتعديل/الحذف) ثم ننفّذ الأوامر إن وُجدت
      if (msg.key.fromMe) {
        saveOwnMessage(msg, sock, text, msgType);
        await handleSelfCommand(msg, sock, text);
        continue;
      }

      // في المجموعات: المرسل هو participant، وإلا هو الـ remoteJid نفسه
      const senderId = msg.key.participant || msg.key.remoteJid;
      const isGroup = isGroupChat(chatId);

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

      // 🚫 المحظورون: نتجاهل رسائلهم في الردود الآلية والألعاب (الأوامر تُرفض داخل commandHandler)
      const senderBanned = !isOwner && isBanned(senderId);

      // 🛡️ حماية ضد الروابط (Anti-Link) — في المجموعات فقط
      if (isGroup && !isOwner) {
        const chatSettings = getChatSettings(chatId);
        if (chatSettings.anti_link === 1 && text && LINK_REGEX.test(text)) {
          await sock.sendMessage(chatId, { text: '⚔️ أستا لن يسمح بنشر سحر الأعداء في هذا الجروب! روابط ممنوعة!' }, { quoted: msg });
          try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (e) { /* قد لا يملك البوت صلاحية الحذف */ }
          continue;
        }
      }

      // التفاعلات المخصصة (Auto-Reactions) - كلمة كاملة
      if (text && !senderBanned) {
        for (const rx of getCustomReactions()) {
          if (containsKeyword(text, rx.keyword)) {
            await sock.sendMessage(chatId, { react: { text: rx.emoji, key: msg.key } });
          }
        }
      }

      // تسجيل الوسائط في مجلد محلي مؤقت
      let mediaPath = null;
      if (['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(msgType)) {
        try {
          // ⚠️ بدون تمرير { logger, reuploadRequest } يفشل Baileys بصمت مع الوسائط التي تحتاج إعادة طلب رابط
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
          );
          const dir = path.join(__dirname, '..', '..', 'media_store');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const ext = msgType.replace('Message', '');
          mediaPath = path.join(dir, `${msg.key.id}.${ext}`);
          fs.writeFileSync(mediaPath, buffer);
        } catch (e) {
          logger.warn('Failed to download media: ' + e.message);
        }
      }

      const isCommand = !!text && text.startsWith(config.prefix);

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

      const chatType = isGroup ? '[Group]' : '[Private]';
      logger.info(`${chatType} ${msg.pushName || senderId}: ${text || '<media>'}`);

      // ⭐ النقاط: كل رسالة عادية في المجموعة (الأوامر لا تُحتسب)
      if (isGroup && !senderBanned && !isCommand) {
        try {
          const hasMedia = !!msgType && !['conversation', 'extendedTextMessage'].includes(msgType);
          awardForMessage({ chatId, senderId, senderName: msg.pushName, hasMedia });
        } catch (err) {
          logger.warn('تعذر تحديث النقاط: ' + err.message);
        }
      }

      // معالجة الأوامر في المجموعات والخاص على حدٍّ سواء
      if (isCommand) {
        await handleCommand({ sock, msg, text, chatId, senderId });
        continue;
      }

      // 📖 كلمات مفتاحية تفتح قائمة الأوامر بدون بادئة
      if (text && !senderBanned && HELP_WORDS.includes(text.trim().toLowerCase())) {
        await handleCommand({ sock, msg, text: `${config.prefix}مساعدة`, chatId, senderId });
        continue;
      }

      // 🎮 فعاليات الأنمي التلقائية (تفكيك/تخمين): يلتقط الإجابة مباشرة من الدردشة
      if (text && !senderBanned) {
        const handled = await checkActiveAnswer({ sock, msg, chatId, senderId, text });
        if (handled) continue;
      }

      // الردود الآلية (تعمل في الخاص والمجموعات) — كلمات كاملة فقط
      if (config.features.autoReply && !senderBanned && text) {
        const customReply = resolveCustomReply(text, chatId);
        if (customReply) {
          await sock.sendMessage(chatId, { text: customReply }, { quoted: msg });
          continue;
        }

        const { EXACT_REPLIES, CONTAINS_REPLIES } = getGreetings();
        const exactKey = Object.keys(EXACT_REPLIES).find((k) => exactMatch(text, k));
        if (exactKey) {
          await sock.sendMessage(chatId, { text: EXACT_REPLIES[exactKey] }, { quoted: msg });
          continue;
        }

        const containsKey = Object.keys(CONTAINS_REPLIES).find((k) => containsKeyword(text, k));
        if (containsKey) {
          await sock.sendMessage(chatId, { text: CONTAINS_REPLIES[containsKey] }, { quoted: msg });
          continue;
        }
      }
    } catch (err) {
      logger.error('Error handling message: ' + err.message);
    }
  }
}

module.exports = handleIncomingMessages;
module.exports.handleIncomingMessages = handleIncomingMessages;
module.exports.resolveCustomReply = resolveCustomReply;
