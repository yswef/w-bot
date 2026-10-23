// =============================================
// 📺 AniList GraphQL — مصدر بيانات الأنمي
// =============================================
// ⚠️ تم الاستبدال عن Jikan (api.jikan.moe) لأن واجهته العامة توقفت نهائياً في 1 أكتوبر 2026.
// AniList مجانية بدون مفتاح، وتعطي مواعيد الحلقات بالتوقيت الدقيق (airingAt).
// نستبعد المحتوى للبالغين (isAdult: false) لأن البوت يعمل في مجموعات.

const { request } = require('./http');

const ENDPOINT = 'https://graphql.anilist.co';

async function gql(query, variables = {}) {
  const res = await request(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    timeoutMs: 15000,
    retries: 1,
  });
  const json = await res.json();
  if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'AniList error');
  return json.data;
}

function titleOf(media) {
  return media?.title?.english || media?.title?.romaji || media?.title?.native || 'بدون عنوان';
}

function currentSeason(date = new Date()) {
  const m = date.getUTCMonth();
  const season = m <= 2 ? 'WINTER' : m <= 5 ? 'SPRING' : m <= 8 ? 'SUMMER' : 'FALL';
  return { season, seasonYear: date.getUTCFullYear() };
}

const MEDIA_FIELDS = `
  id siteUrl isAdult format episodes averageScore status
  title { romaji english native }
  coverImage { large }
  nextAiringEpisode { airingAt episode }
`;

async function searchAnime(search, limit = 5) {
  const data = await gql(
    `query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }`,
    { search, perPage: limit }
  );
  return (data?.Page?.media || []).filter((m) => !m.isAdult);
}

async function seasonAnime(limit = 10, date = new Date()) {
  const { season, seasonYear } = currentSeason(date);
  const data = await gql(
    `query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC, isAdult: false, format_in: [TV, TV_SHORT, ONA]) {
          ${MEDIA_FIELDS}
        }
      }
    }`,
    { season, seasonYear, perPage: limit }
  );
  return { season, seasonYear, items: (data?.Page?.media || []).filter((m) => !m.isAdult) };
}

/** الحلقات التي تُعرض بين الثانيتين (Unix seconds) */
async function airingBetween(fromSec, toSec, limit = 100) {
  const data = await gql(
    `query ($from: Int, $to: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
          airingAt
          episode
          media { id siteUrl isAdult title { romaji english native } }
        }
      }
    }`,
    { from: fromSec, to: toSec, perPage: limit }
  );
  return (data?.Page?.airingSchedules || [])
    .filter((s) => s.media && !s.media.isAdult)
    .map((s) => ({ airingAt: s.airingAt, episode: s.episode, title: titleOf(s.media), url: s.media.siteUrl }));
}

module.exports = { searchAnime, seasonAnime, airingBetween, titleOf, currentSeason };
