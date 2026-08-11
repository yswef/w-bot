// =============================================
// 📺 أوامر الأنمي المتقدمة - قائمة الأنميات الحالية / النشرة اليومية
// يستخدم Jikan API (مجاني بدون مفتاح)
// =============================================

const https = require('https');
const { db } = require('../database/db');
const config = require('../config');

// دالة مساعدة لجلب البيانات
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'AstaBot/1.0' } }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// جدول قاعدة بيانات المشتركين في النشرة اليومية للأنمي
db.exec(`
  CREATE TABLE IF NOT EXISTS anime_newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL UNIQUE,
    added_by TEXT,
    active INTEGER DEFAULT 1
  )
`);

function getNewsletterSubscribers() {
    return db.prepare(`SELECT * FROM anime_newsletter WHERE active = 1`).all();
}

function subscribeToNewsletter(chatId, addedBy) {
    return db.prepare(
        `INSERT OR REPLACE INTO anime_newsletter (chat_id, added_by, active) VALUES (?, ?, 1)`
    ).run(chatId, addedBy);
}

function unsubscribeFromNewsletter(chatId) {
    return db.prepare(`DELETE FROM anime_newsletter WHERE chat_id = ?`).run(chatId);
}

// التحقق من صلاحية الأدمن
function isAdminUser(senderId) {
    const admins = config.adminNumbers || [config.ownerNumber];
    return admins.some(a => senderId.replace(/\D/g, '').includes(a));
}

module.exports = async function animeNewsCommand({ sock, msg, args, chatId, senderId, commandKey }) {

    // ===== أحدث أنميات الموسم الحالي =====
    if (commandKey === 'انميات' || commandKey === 'موسم') {
        await sock.sendMessage(chatId, { text: '⏳ جاري جلب قائمة أحدث الأنميات...' }, { quoted: msg });
        try {
            const data = await fetchJSON('https://api.jikan.moe/v4/seasons/now?limit=10');
            if (!data.data || data.data.length === 0) throw new Error('لا توجد نتائج');
            const list = data.data.slice(0, 10).map((a, i) => {
                return `${i + 1}. 🎬 *${a.title}*\n   ⭐ التقييم: ${a.score || 'غير محدد'} | 📺 ${a.episodes || '?'} حلقة`;
            }).join('\n\n');
            await sock.sendMessage(chatId, {
                text: `📺 *أنميات الموسم الحالي* 🍀\n\n${list}\n\n🔮 استمتع بمشاهدة عالم السحر!`
            }, { quoted: msg });
        } catch {
            await sock.sendMessage(chatId, { text: '⚠️ تعذر جلب قائمة الأنميات، حاول لاحقاً.' }, { quoted: msg });
        }
        return;
    }

    // ===== بحث عن أنمي محدد =====
    if (commandKey === 'بحث-انمي' || commandKey === 'searchanime') {
        const query = args.join(' ');
        if (!query) {
            await sock.sendMessage(chatId, { text: '⚠️ أرسل اسم الأنمي. مثال: !بحث-انمي Naruto' }, { quoted: msg });
            return;
        }
        await sock.sendMessage(chatId, { text: `🔍 جاري البحث عن: ${query}...` }, { quoted: msg });
        try {
            const data = await fetchJSON(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
            if (!data.data || data.data.length === 0) throw new Error('لا توجد نتائج');
            const a = data.data[0];
            const text =
                `🎌 *${a.title}* (${a.title_japanese || ''})\n\n` +
                `⭐ التقييم: ${a.score || 'غير محدد'} | 🏆 الرتبة: #${a.rank || '?'}\n` +
                `📺 الحلقات: ${a.episodes || '?'} | 📅 ${a.aired?.string || 'غير محدد'}\n` +
                `🔖 النوع: ${a.genres?.map(g => g.name).join(', ') || 'غير محدد'}\n\n` +
                `📝 *القصة:*\n${a.synopsis ? a.synopsis.slice(0, 400) + '...' : 'لا يوجد وصف'}`;
            if (a.images?.jpg?.image_url) {
                await sock.sendMessage(chatId, { image: { url: a.images.jpg.image_url }, caption: text }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text }, { quoted: msg });
            }
        } catch {
            await sock.sendMessage(chatId, { text: `⚠️ لم يُعثر على نتائج لـ "${query}"` }, { quoted: msg });
        }
        return;
    }

    // ===== الاشتراك في النشرة اليومية للأنمي - للأدمن فقط =====
    if (commandKey === 'نشرة-انمي') {
        if (!isAdminUser(senderId)) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمسؤول فقط.' }, { quoted: msg });
            return;
        }
        subscribeToNewsletter(chatId, senderId);
        await sock.sendMessage(chatId, {
            text: `✅ تم تفعيل النشرة اليومية للأنمي في هذه المحادثة!\nستصلك تقريباً كل يوم في الساعة 9 صباحاً قائمة بأفضل أنميات الموسم. 📺🍀`
        }, { quoted: msg });
        return;
    }

    // ===== إلغاء الاشتراك من النشرة - للأدمن فقط =====
    if (commandKey === 'إيقاف-نشرة') {
        if (!isAdminUser(senderId)) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمسؤول فقط.' }, { quoted: msg });
            return;
        }
        unsubscribeFromNewsletter(chatId);
        await sock.sendMessage(chatId, { text: '✅ تم إلغاء الاشتراك في النشرة اليومية.' }, { quoted: msg });
        return;
    }
};

// تصدير الدوال للـ Scheduler
module.exports.getNewsletterSubscribers = getNewsletterSubscribers;
module.exports.fetchJSON = fetchJSON;
