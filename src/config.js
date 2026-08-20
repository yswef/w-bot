require('dotenv').config();

const ownerNumber = (process.env.OWNER_NUMBER || '967784609423').replace(/\D/g, '');

// رقم الأدمن الثاني المعتمد (قابل للتعديل من .env)
const secondAdminNumber = (process.env.SECOND_ADMIN_NUMBER || '967735076371').replace(/\D/g, '');

// أرقام المالكين الإضافية - يمكن ضبطها عبر EXTRA_OWNER_NUMBERS في .env (مفصولة بفاصلة)
const extraOwnerNumbers = (process.env.EXTRA_OWNER_NUMBERS || '967784773314,967784609423')
  .split(',')
  .map((n) => n.replace(/\D/g, ''))
  .filter(Boolean);

// كل أرقام المالكين (بدون تكرار)
const ownerNumbers = [...new Set([ownerNumber, ...extraOwnerNumbers])].filter(Boolean);

module.exports = {
  prefix: process.env.COMMAND_PREFIX || '.',
  stickerPackName: process.env.STICKER_PACK_NAME || 'أستا ساما هو الأفضل',
  stickerAuthorName: process.env.STICKER_AUTHOR_NAME || 'ENG.YOUSEF',
  ownerNumber,
  secondAdminNumber,
  ownerNumbers,
  // قائمة كل الأرقام التي لها صلاحيات الأدمن (مالكون + أدمن ثاني)
  adminNumbers: [...new Set([...ownerNumbers, secondAdminNumber])].filter(Boolean),
  developerContact: process.env.DEVELOPER_CONTACT || '967784609423',
  developerWebsite: process.env.DEVELOPER_WEBSITE || 'https://engyusef.alpha-code.net',
  features: {
    autoReply: process.env.ENABLE_AUTO_REPLY !== 'false',
    antiDelete: process.env.ENABLE_ANTI_DELETE !== 'false',
    stickerMaker: process.env.ENABLE_STICKER_MAKER !== 'false',
    scheduler: process.env.ENABLE_SCHEDULER !== 'false',
    // تنفيذ الأوامر تلقائياً إذا كانت مرسلة من رقم البوت نفسه (هاتفك المربوط)
    selfCommandExecution: process.env.ENABLE_SELF_EXECUTION !== 'false',
  },
  timezone: process.env.TIMEZONE || 'Asia/Riyadh',
};
