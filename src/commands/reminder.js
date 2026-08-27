// =============================================
// ⏰ أمر التذكير العام - !تذكير [نص حر] [الوقت]
// مثال: !تذكير موعد_الاجتماع_ومراجعة_الكود 3h
// يدعم الوحدات: s(ثانية) m(دقيقة) h(ساعة) d(يوم)
// كما يدعم رقم فقط (يُعتبر دقائق) مثل: !تذكير راجع_الايميل 30
// =============================================
const config = require('../config');
const responses = require('../utils/responses');
const { addReminder } = require('../database/db');

const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function isAdminUser(senderId) {
  const admins = config.adminNumbers || [config.ownerNumber];
  const digits = (senderId || '').replace(/\D/g, '');
  return admins.some((a) => a && digits.includes(a));
}

// يحوّل نص مثل "3h" أو "45m" أو "2d" أو "30" إلى مللي ثانية
function parseDuration(raw) {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*([smhd]?)$/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unit = (match[2] || 'm').toLowerCase(); // بدون وحدة = دقائق افتراضياً
  if (!UNIT_MS[unit] || amount <= 0) return null;
  return Math.round(amount * UNIT_MS[unit]);
}

module.exports = async function reminderCommand({ sock, msg, args, chatId, senderId }) {
  // الأمر مخصص للمالك/الأدمن فقط (أداة شخصية للمطوّر)
  if (!isAdminUser(senderId)) {
    await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') || '⚠️ هذا الأمر للمالك/الأدمن فقط.' }, { quoted: msg });
    return;
  }

  if (args.length < 2) {
    await sock.sendMessage(
      chatId,
      { text: `📌 الاستخدام:\n${config.prefix}تذكير النص_المطلوب الوقت\n\nمثال:\n${config.prefix}تذكير موعد_الاجتماع_ومراجعة_الكود 3h\n\nالوحدات المتاحة: s(ثانية) m(دقيقة) h(ساعة) d(يوم)\nمثال آخر: ${config.prefix}تذكير راجع_الايميل 45m` },
      { quoted: msg }
    );
    return;
  }

  // آخر عنصر هو الوقت، البقية هي نص التذكير
  const timeArg = args[args.length - 1];
  const reminderText = args.slice(0, -1).join(' ').replace(/_/g, ' ').trim();

  const durationMs = parseDuration(timeArg);
  if (!durationMs) {
    await sock.sendMessage(
      chatId,
      { text: `⚠️ صيغة الوقت غير صحيحة: "${timeArg}"\nاستخدم مثل: 30s / 10m / 3h / 1d` },
      { quoted: msg }
    );
    return;
  }

  if (!reminderText) {
    await sock.sendMessage(chatId, { text: '⚠️ لم تكتب نص التذكير.' }, { quoted: msg });
    return;
  }

  const remindAt = Date.now() + durationMs;
  // يُرسل التذكير دائماً لرقم المالك الأساسي (الأدمن) بغض النظر عن مكان إرسال الأمر
  const targetJid = `${config.ownerNumber}@s.whatsapp.net`;

  addReminder({ targetJid, createdBy: senderId, text: reminderText, remindAt });

  const remindDate = new Date(remindAt);
  const formatted = remindDate.toLocaleString('ar-EG', { timeZone: config.timezone, hour12: true });

  await sock.sendMessage(
    chatId,
    { text: `✅ تم ضبط التذكير!\n📝 ${reminderText}\n⏰ سيصلك في: ${formatted}` },
    { quoted: msg }
  );
};
