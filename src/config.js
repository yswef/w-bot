require('dotenv').config();

const ownerNumber = (process.env.OWNER_NUMBER || '').replace(/\D/g, '');
// رقم الأدمن الثاني المعتمد
const secondAdminNumber = process.env.SECOND_ADMIN_NUMBER || '967735076371';

module.exports = {
  prefix: process.env.COMMAND_PREFIX || '!',
  stickerPackName: process.env.STICKER_PACK_NAME || 'My Stickers',
  stickerAuthorName: process.env.STICKER_AUTHOR_NAME || 'Me',
  ownerNumber,
  secondAdminNumber,
  // قائمة كل الأرقام التي لها صلاحيات الأدمن
  adminNumbers: [ownerNumber, secondAdminNumber].filter(Boolean),
  features: {
    autoReply: process.env.ENABLE_AUTO_REPLY !== 'false',
    antiDelete: process.env.ENABLE_ANTI_DELETE !== 'false',
    stickerMaker: process.env.ENABLE_STICKER_MAKER !== 'false',
    scheduler: process.env.ENABLE_SCHEDULER !== 'false',
  },
  timezone: process.env.TIMEZONE || 'Asia/Riyadh',
};
