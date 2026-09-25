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

const config = {
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

  // =============================================
  // 🧩 لوحة التحكم (Dashboard)
  // =============================================
  dashboard: {
    // تعمل افتراضياً. لإيقافها تماماً: ENABLE_DASHBOARD=false
    enabled: process.env.ENABLE_DASHBOARD !== 'false',
    // على Railway/Render/Heroku لا تغيّر شيئاً: المنصة تعطي PORT تلقائياً،
    // ونُعطي PORT الأولوية حتى يوافق المنفذ الذي يحدده النطاق العام.
    port: Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000),
    // كلمة سر اللوحة. إذا تُركت فارغة تكون اللوحة مكشوفة لأي شخص يعرف الرابط!
    token: (process.env.DASHBOARD_TOKEN || '').trim(),
    // رابط اللوحة العام (اختياري). لو تُرك فارغاً يُكتشف تلقائياً من Railway.
    publicUrl: (process.env.DASHBOARD_PUBLIC_URL || '').trim(),
    // عدد الرسائل المعروضة في اللوحة
    recentLimit: Number(process.env.DASHBOARD_RECENT_LIMIT || 50),
  },
};

// يبني الرابط العام للوحة: قيمة DASHBOARD_PUBLIC_URL يدوياً، ثم متغيرات Railway
// التي تُحقن تلقائياً بعد توليد نطاق عام (Public Networking → Generate Domain).
config.buildPublicUrl = function buildPublicUrl() {
  const explicit = config.dashboard.publicUrl;
  if (explicit) return explicit.replace(/\/+$/, '');

  const railwayDomain = (process.env.RAILWAY_PUBLIC_DOMAIN || '').trim();
  if (railwayDomain) {
    return (`${railwayDomain.startsWith('http') ? '' : 'https://'}${railwayDomain}`).replace(/\/+$/, '');
  }

  const railwayStatic = (process.env.RAILWAY_STATIC_URL || '').trim();
  if (railwayStatic) return railwayStatic.replace(/\/+$/, '');

  return `http://localhost:${config.dashboard.port}`;
};

module.exports = config;
