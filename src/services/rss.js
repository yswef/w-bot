// =============================================
// 📰 قراءة خلاصات RSS / Atom بدون مكتبات خارجية
// =============================================

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function cleanText(s) {
  return decodeEntities(String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function rawTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
}

function attrOf(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b([^>]*)/?>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  const a = m[1].match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return a ? decodeEntities(a[1]) : '';
}

function atomAlternateLink(block) {
  const re = /<link\b([^>]*)\/?>/gi;
  let m;
  let fallback = '';
  while ((m = re.exec(block))) {
    const href = m[1].match(/href\s*=\s*["']([^"']+)["']/i);
    if (!href) continue;
    const rel = (m[1].match(/rel\s*=\s*["']([^"']+)["']/i) || [])[1] || 'alternate';
    if (rel === 'alternate') return decodeEntities(href[1]);
    if (!fallback) fallback = decodeEntities(href[1]);
  }
  return fallback;
}

function parseDate(s) {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/**
 * يحوّل نص RSS/Atom إلى قائمة أخبار موحّدة.
 * @returns {{guid:string,title:string,link:string,summary:string,image:string|null,publishedAt:number|null}[]}
 */
function parseFeed(xml) {
  const text = String(xml || '');
  const blocks = text.match(/<item\b[\s\S]*?<\/item>/gi) || text.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const b of blocks) {
    const title = cleanText(rawTag(b, 'title'));
    const link = cleanText(rawTag(b, 'link')) || atomAlternateLink(b);
    const guid = cleanText(rawTag(b, 'guid')) || cleanText(rawTag(b, 'id')) || link || title;
    if (!title || !guid) continue;
    const summary = cleanText(rawTag(b, 'description') || rawTag(b, 'summary') || rawTag(b, 'content:encoded') || rawTag(b, 'content')).slice(0, 240);
    const image =
      attrOf(b, 'media:thumbnail', 'url') ||
      attrOf(b, 'media:content', 'url') ||
      (/image\//i.test(attrOf(b, 'enclosure', 'type')) ? attrOf(b, 'enclosure', 'url') : '') ||
      null;
    const publishedAt = parseDate(cleanText(rawTag(b, 'pubDate')) || cleanText(rawTag(b, 'published')) || cleanText(rawTag(b, 'updated')));
    items.push({ guid, title, link, summary, image: image || null, publishedAt });
  }
  return items;
}

module.exports = { parseFeed, cleanText, decodeEntities };
