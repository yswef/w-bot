// =============================================
// 🌤️ الطقس / 🌐 بحث ويكيبيديا / ⛔ تفعيل-إيقاف البوت / 🔠 سلسلة الحروف
// =============================================

const https = require('https');
const { db } = require('../database/db');
const config = require('../config');

// جدول مجموعات البوت المُوقف فيها
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_disabled_chats (
    chat_id TEXT PRIMARY KEY,
    disabled_by TEXT,
    disabled_at INTEGER
  )
`);

function isBotDisabled(chatId) {
    return !!db.prepare(`SELECT 1 FROM bot_disabled_chats WHERE chat_id = ?`).get(chatId);
}

function disableBotInChat(chatId, by) {
    db.prepare(`INSERT OR REPLACE INTO bot_disabled_chats (chat_id, disabled_by, disabled_at) VALUES (?, ?, ?)`).run(chatId, by, Date.now());
}

function enableBotInChat(chatId) {
    db.prepare(`DELETE FROM bot_disabled_chats WHERE chat_id = ?`).run(chatId);
}

// تتبع لعبة سلسلة الحروف لكل مستخدم
const chainGames = new Map();

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'AstaBot/1.0' } }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function fetchJSON(url) {
    return fetchText(url).then(d => JSON.parse(d));
}

function isAdminUser(senderId) {
    const admins = config.adminNumbers || [config.ownerNumber];
    return admins.some(a => senderId.replace(/\D/g, '').includes(a));
}

module.exports = async function utilsCommand({ sock, msg, args, chatId, senderId, commandKey }) {

    // ===== الطقس - wttr.in مجاني بدون API Key =====
    if (commandKey === 'طقس' || commandKey === 'weather') {
        const city = args.join(' ') || 'Riyadh';
        try {
            const data = await fetchJSON(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
            const current = data.current_condition[0];
            const area = data.nearest_area[0];
            const cityName = area.areaName[0].value + ', ' + area.country[0].value;
            const temp = current.temp_C;
            const feels = current.FeelsLikeC;
            const humidity = current.humidity;
            const desc = current.lang_ar?.[0]?.value || current.weatherDesc[0].value;
            const text =
                `🌤️ *طقس ${cityName}*\n\n` +
                `🌡️ الحرارة: ${temp}°C (تبدو كـ ${feels}°C)\n` +
                `💧 الرطوبة: ${humidity}%\n` +
                `📍 الحالة: ${desc}`;
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        } catch {
            await sock.sendMessage(chatId, { text: `⚠️ تعذر جلب طقس "${args.join(' ')}". تأكد من اسم المدينة.` }, { quoted: msg });
        }
        return;
    }

    // ===== بحث ويكيبيديا =====
    if (commandKey === 'ويكي' || commandKey === 'wiki') {
        const query = args.join(' ');
        if (!query) {
            await sock.sendMessage(chatId, { text: '⚠️ أرسل موضوع البحث. مثال: !ويكي بلاك كلوفر' }, { quoted: msg });
            return;
        }
        try {
            const searchData = await fetchJSON(
                `https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
            );
            const text = `🌐 *${searchData.title}*\n\n${searchData.extract?.slice(0, 600) || 'لا يوجد ملخص'}...\n\n📖 المصدر: ${searchData.content_urls?.desktop?.page || 'ويكيبيديا'}`;
            if (searchData.thumbnail?.source) {
                await sock.sendMessage(chatId, { image: { url: searchData.thumbnail.source }, caption: text }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text }, { quoted: msg });
            }
        } catch {
            await sock.sendMessage(chatId, { text: `⚠️ لم يُعثر على نتائج لـ "${query}" في ويكيبيديا.` }, { quoted: msg });
        }
        return;
    }

    // ===== تفعيل البوت في المجموعة =====
    if (commandKey === 'تفعيل-بوت') {
        if (!isAdminUser(senderId)) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمسؤول فقط.' }, { quoted: msg });
            return;
        }
        enableBotInChat(chatId);
        await sock.sendMessage(chatId, { text: '✅ تم تفعيل البوت في هذه المحادثة. 🍀' }, { quoted: msg });
        return;
    }

    // ===== إيقاف البوت عن مجموعة =====
    if (commandKey === 'إيقاف-بوت') {
        if (!isAdminUser(senderId)) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمسؤول فقط.' }, { quoted: msg });
            return;
        }
        disableBotInChat(chatId, senderId);
        await sock.sendMessage(chatId, { text: '⛔ تم إيقاف البوت عن هذه المحادثة. لتفعيله مجدداً: !تفعيل-بوت' }, { quoted: msg });
        return;
    }

    // ===== لعبة سلسلة الحروف =====
    if (commandKey === 'سلسلة') {
        const botWords = ['أنمي', 'إلهام', 'مجموعة', 'علم', 'مغامرة', 'ارادة', 'ابداع', 'عزيمة', 'نجاح', 'حلم', 'مسؤولية', 'اتحاد'];
        const gameKey = `${chatId}_${senderId}`;
        const userWord = args[0];

        if (!userWord) {
            // بدء لعبة جديدة
            const startWord = botWords[Math.floor(Math.random() * botWords.length)];
            chainGames.set(gameKey, startWord);
            await sock.sendMessage(chatId, {
                text: `🔠 *لعبة سلسلة الحروف*\n\nأبدأت بكلمة: *${startWord}*\nأرسل كلمة تبدأ بـ الحرف *${[...startWord].pop()}*\n\nمثال: !سلسلة كلمتك`
            }, { quoted: msg });
            return;
        }

        const lastWord = chainGames.get(gameKey);
        if (!lastWord) {
            await sock.sendMessage(chatId, { text: '⚠️ أرسل !سلسلة أولاً لبدء اللعبة.' }, { quoted: msg });
            return;
        }

        const lastChar = [...lastWord].pop();
        const firstChar = [...userWord][0];

        if (firstChar !== lastChar) {
            await sock.sendMessage(chatId, {
                text: `❌ خطأ! كلمتك يجب أن تبدأ بحرف *${lastChar}*\nكلمتك "${userWord}" تبدأ بـ "${firstChar}"`
            }, { quoted: msg });
            return;
        }

        // البوت يرد بكلمة تبدأ بآخر حرف من كلمة المستخدم
        const userLastChar = [...userWord].pop();
        const botReply = botWords.find(w => [...w][0] === userLastChar);
        if (botReply) {
            chainGames.set(gameKey, botReply);
            await sock.sendMessage(chatId, {
                text: `✅ ممتاز! الآن دوري:\n🤖 *${botReply}*\n\nأرسل كلمة تبدأ بـ *${[...botReply].pop()}*`
            }, { quoted: msg });
        } else {
            chainGames.delete(gameKey);
            await sock.sendMessage(chatId, {
                text: `🏆 فزت! ما عندي كلمة تبدأ بـ "${userLastChar}". أنت الفائز! ⚔️🍀`
            }, { quoted: msg });
        }
        return;
    }
};

// تصدير دالة isBotDisabled لاستخدامها في messageHandler
module.exports.isBotDisabled = isBotDisabled;
