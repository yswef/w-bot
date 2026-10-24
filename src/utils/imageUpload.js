// =============================================
// 🖼️ رفع صور الزوجات/الشخصيات من لوحة التحكم
// =============================================
// الصور يرفعها المالك بنفسه ويتحمّل مسؤولية أن لديه حق استخدامها.
// نقبل PNG و JPEG و WEBP فقط، ونتحقق من محتوى الملف الفعلي (magic bytes)
// لا من اسمه أو نوعه المُرسَل، ونحفظه باسم عشوائي داخل data/uploads.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

const TYPES = {
  'image/png': { ext: 'png', test: (b) => b.length > 8 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { ext: 'jpg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { ext: 'webp', test: (b) => b.length > 12 && b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
};

const MIME_BY_EXT = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

/** يحوّل data URL إلى ملف صورة صالح، أو يرمي خطأ بالعربية */
function parseImageDataUrl(dataUrl) {
  const text = String(dataUrl || '');
  // حدّ مبكر لحجم النص قبل فك التشفير حتى لا نحمّل ذاكرة ضخمة
  if (text.length > Math.ceil((MAX_BYTES * 4) / 3) + 64) throw new Error('حجم الصورة أكبر من 5 ميغابايت');
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(text);
  if (!m) throw new Error('صيغة الصورة غير مدعومة (PNG أو JPEG أو WEBP فقط)');
  const buffer = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) throw new Error('الملف فارغ');
  if (buffer.length > MAX_BYTES) throw new Error('حجم الصورة أكبر من 5 ميغابايت');
  const spec = TYPES[m[1]];
  if (!spec.test(buffer)) throw new Error('محتوى الملف ليس صورة صالحة');
  return { ext: spec.ext, buffer };
}

/** يحفظ الصورة ويعيد اسم الملف (داخل UPLOAD_DIR) */
function saveUpload({ ext, buffer }) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const fileName = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
  return fileName;
}

/** مسار ملف مرفوع. الاسم يُولَّد على الخادم فقط، ونرفض أي مسار فيه فواصل */
function uploadFilePath(fileName) {
  const base = path.basename(String(fileName || ''));
  if (!base || base !== fileName) return null;
  return path.join(UPLOAD_DIR, base);
}

function readUpload(fileName) {
  const p = uploadFilePath(fileName);
  if (!p || !fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

function removeUpload(fileName) {
  const p = uploadFilePath(fileName);
  if (p && fs.existsSync(p)) fs.unlinkSync(p);
}

function mimeFor(fileName) {
  return MIME_BY_EXT[path.extname(String(fileName)).slice(1).toLowerCase()] || 'application/octet-stream';
}

module.exports = { parseImageDataUrl, saveUpload, uploadFilePath, readUpload, removeUpload, mimeFor, MAX_BYTES, UPLOAD_DIR };
