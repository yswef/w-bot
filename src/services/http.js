// =============================================
// 🌐 طلبات HTTP موحّدة: مهلة زمنية + إعادة المحاولة عند 429/5xx
// =============================================
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AstaBot/2.0';

async function request(url, { method = 'GET', headers = {}, body, timeoutMs = 15000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        body,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': BROWSER_UA, Accept: '*/*', ...headers },
      });
      clearTimeout(timer);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
      lastErr.status = res.status;
      if (![429, 500, 502, 503, 504].includes(res.status)) break;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err.name === 'AbortError' ? new Error('timeout') : err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw lastErr;
}

async function fetchText(url, opts) {
  const res = await request(url, opts);
  return res.text();
}

async function fetchJson(url, opts) {
  const res = await request(url, opts);
  return res.json();
}

module.exports = { request, fetchText, fetchJson, BROWSER_UA };
