// =============================================
// 📖 قائمة أوامر أستا (.مساعدة) — تُبنى تلقائياً من registry.js
// =============================================
// كانت القائمة القديمة مكتوبة يدوياً وتقادمت (أوامر ناقصة وأخرى محذوفة)،
// وطويلة جداً في رسالة واحدة. الآن تُولَّد من سجل الأوامر وتنقسم لفئات.

const config = require('../config');
const { CATEGORIES, COMMANDS, byCategory, renderCategory, resolveCategory } = require('./registry');

// صورة أستا / شعار Black Clover
const astaLogoUrl = 'https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg';

function mainMenu(prefix) {
  const lines = Object.values(CATEGORIES).map((cat) => {
    const count = byCategory(cat.key).length;
    return `${cat.emoji} \`${prefix}مساعدة ${cat.slug}\`\n   ${cat.ar} — ${cat.en} (${count} أمر)`;
  });

  return (
    `⚔️ *أستا — بوت الكلوفر الأسود* ⚔️\n` +
    `🍀 Black Clover × WhatsApp\n\n` +
    `📌 بادئة الأوامر: \`${prefix}\`  ·  إجمالي الأوامر: *${COMMANDS.length}*\n` +
    `${'─'.repeat(24)}\n\n` +
    `📚 *اختر فئة لعرض أوامرها:*\n\n${lines.join('\n\n')}\n\n` +
    `${'─'.repeat(24)}\n` +
    `📜 \`${prefix}مساعدة الكل\` — عرض كل الأوامر دفعة واحدة\n` +
    `🔎 \`${prefix}شخصية <اسم>\` — ابحث عن شخصية أنمي\n` +
    `🖥️ \`${prefix}لوحة\` — رابط لوحة التحكم (للمالك)\n\n` +
    `✅ *ميزات تعمل تلقائياً بدون أوامر:*\n` +
    `• ✏️ كشف الرسائل *المعدَّلة* مع نصها قبل وبعد التعديل\n` +
    `• 🗑️ إعادة إرسال الرسائل المحذوفة\n` +
    `• 🤖 ردود وتفاعلات آلية قابلة للتخصيص\n` +
    `• 🎉 ترحيب تلقائي بالأعضاء الجدد\n` +
    `• 🛡️ حماية من الروابط ونظام حظر\n` +
    `• ⏰ مهام وتذكيرات مجدولة\n\n` +
    `🛡️ = للمشرفين · 👑 = للمالك\n\n` +
    `🍀 *تجاوز حدودك هنا والآن!*`
  );
}

function fullMenu(prefix) {
  const sections = Object.keys(CATEGORIES)
    .map((key) => renderCategory(key, prefix))
    .filter(Boolean);
  return (
    `⚔️ *كل أوامر أستا* (${COMMANDS.length} أمر)\n` +
    `📌 البادئة: \`${prefix}\` · 🛡️ للمشرفين · 👑 للمالك\n\n` +
    sections.join(`\n\n${'═'.repeat(22)}\n\n`) +
    `\n\n🍀 تجاوز حدودك هنا والآن!`
  );
}

module.exports = async function info({ sock, msg, args, chatId }) {
  const p = config.prefix;
  const requested = (args && args.join(' ').trim()) || '';

  // .مساعدة الكل — القائمة الكاملة
  if (['الكل', 'كل', 'all', 'full'].includes(requested.toLowerCase())) {
    await sock.sendMessage(chatId, { text: fullMenu(p) }, { quoted: msg });
    return;
  }

  // .مساعدة <فئة> — فئة محددة
  if (requested) {
    const catKey = resolveCategory(requested);
    if (catKey) {
      await sock.sendMessage(chatId, {
        text: `${renderCategory(catKey, p)}\n\n${'─'.repeat(22)}\n↩️ للعودة للقائمة الرئيسية: \`${p}مساعدة\``,
      }, { quoted: msg });
      return;
    }
    await sock.sendMessage(chatId, {
      text: `🤔 ما لقيت فئة باسم "${requested}".\n\nالفئات المتاحة:\n` +
        Object.values(CATEGORIES).map((c) => `${c.emoji} \`${p}مساعدة ${c.slug}\` — ${c.ar}`).join('\n') +
        `\n\nمثال: \`${p}مساعدة العاب\``,
    }, { quoted: msg });
    return;
  }

  // القائمة الرئيسية مع صورة أستا
  const text = mainMenu(p);
  try {
    await sock.sendMessage(chatId, { image: { url: astaLogoUrl }, caption: text }, { quoted: msg });
  } catch {
    // في حال فشل تحميل الصورة يُرسل النص فقط
    await sock.sendMessage(chatId, { text }, { quoted: msg });
  }
};

module.exports.mainMenu = mainMenu;
module.exports.fullMenu = fullMenu;
