// =============================================
// 👋 الترحيب بالأعضاء الجدد
// =============================================
// ⚠️ إصلاح: كان الترحيب يقرأ messageStubType من داخل msg.message، وهذا الحقل
// موجود أعلى الرسالة، والرسائل النظامية تُتجاهل أصلاً قبل الوصول إليه، فلم يكن
// الترحيب يعمل. كما أن النوع 28 هو "إزالة عضو" وليس "انضمام"، فكان يرحّب
// بالمطرودين. الآن نستخدم حدث group-participants.update مع action === 'add'.

const { getChatSettings, getWelcomeMessage } = require('../database/db');
const { createWelcomeCard } = require('../utils/welcomeCard');
const logger = require('../utils/logger');

const DEFAULT_TEXT = '🍀 أهلاً وسهلاً بك يا {name} في المجموعة!\nنأمل ألا تختفي إرادتك للمشاركة! ⚔️';

function renderText(template, userName) {
  return String(template || DEFAULT_TEXT).replace(/\{name\}/g, `@${userName}`);
}

async function handleParticipantsUpdate({ id, participants = [], action }, sock) {
  if (action !== 'add' || !id?.endsWith('@g.us')) return;
  const settings = getChatSettings(id);
  if (settings.welcome_enabled !== 1) return;

  const custom = getWelcomeMessage(id);
  const template = custom?.message || null;

  for (const jid of participants) {
    const jidStr = typeof jid === 'string' ? jid : jid?.id;
    if (!jidStr) continue;
    const userName = jidStr.split('@')[0].split(':')[0];
    const caption = renderText(template, userName);
    try {
      let pfp = null;
      try {
        pfp = await sock.profilePictureUrl(jidStr, 'image');
      } catch {
        pfp = null;
      }
      const buffer = await createWelcomeCard(userName, pfp);
      await sock.sendMessage(id, { image: buffer, caption, mentions: [jidStr] });
    } catch (err) {
      // حتى لو فشلت بطاقة Canvas (غير مثبتة/خطأ في الرسم) نرحّب نصياً
      logger.warn('تعذر إرسال بطاقة الترحيب، نرسل نصاً: ' + err.message);
      try {
        await sock.sendMessage(id, { text: caption, mentions: [jidStr] });
      } catch (fallbackErr) {
        logger.warn('تعذر إرسال رسالة الترحيب: ' + fallbackErr.message);
      }
    }
  }
}

module.exports = { handleParticipantsUpdate, renderText, DEFAULT_TEXT };
