// =============================================
// 📜 محمّل ملف الردود المركزي (responses.json)
// عدّل الردود المشتركة من هناك دون لمس الكود
// =============================================
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const RESPONSES_PATH = path.join(__dirname, '..', 'responses.json');

let cache = {};
function load() {
  try {
    cache = JSON.parse(fs.readFileSync(RESPONSES_PATH, 'utf8'));
  } catch (err) {
    logger.warn('تعذر تحميل responses.json: ' + err.message);
    cache = {};
  }
  return cache;
}

load();

function pickRandom(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value[Math.floor(Math.random() * value.length)];
  }
  return value || '';
}

/**
 * جلب رد من responses.json
 * @param {string} category مثال: 'persona'
 * @param {string} key مثال: 'denied_owner'
 * @param {object} vars قيم لاستبدال {placeholders} داخل النص
 */
function get(category, key, vars = {}) {
  const bucket = cache?.[category]?.[key];
  let text = pickRandom(bucket);
  for (const [k, v] of Object.entries(vars)) {
    text = text.split(`{${k}}`).join(v);
  }
  return text;
}

module.exports = { get, reload: load, all: () => cache };
