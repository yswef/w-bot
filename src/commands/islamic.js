// =============================================
// 🕌 الأوامر الإسلامية - آيات عشوائية وأذكار مجدولة
// المسؤول فقط يقدر يضبط الإرسال ويحدد المستلمين والوقت
// =============================================

const { db } = require('../database/db');
const config = require('../config');

// قائمة آيات قرآنية كريمة مختارة
const quranVerses = [
    { verse: '﴿وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ﴾', ref: 'الطلاق: 3' },
    { verse: '﴿إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾', ref: 'الشرح: 6' },
    { verse: '﴿وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ﴾', ref: 'يوسف: 87' },
    { verse: '﴿قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ﴾', ref: 'الزمر: 53' },
    { verse: '﴿وَبَشِّرِ الصَّابِرِينَ﴾', ref: 'البقرة: 155' },
    { verse: '﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾', ref: 'البقرة: 153' },
    { verse: '﴿حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ﴾', ref: 'آل عمران: 173' },
    { verse: '﴿وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ﴾', ref: 'النحل: 127' },
    { verse: '﴿فَإِذَا فَرَغْتَ فَانصَبْ ۝ وَإِلَىٰ رَبِّكَ فَارْغَب﴾', ref: 'الشرح: 7-8' },
    { verse: '﴿الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾', ref: 'الرعد: 28' },
];

// قائمة أذكار متنوعة
const athkar = [
    'سبحان الله وبحمده، سبحان الله العظيم 🌿',
    'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير ✨',
    'أستغفر الله العظيم وأتوب إليه 🌙',
    'اللهم صل وسلم وبارك على نبينا محمد ﷺ 💚',
    'لا حول ولا قوة إلا بالله العلي العظيم 🌟',
    'الحمد لله على كل حال ❤️',
    'بسم الله الرحمن الرحيم 🍀',
    'اللهم اغفر لي وارحمني واهدني وارزقني وعافني وعفُ عني 🤲',
];

function getRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// التأكد من إنشاء جدول الجدولة الإسلامية في قاعدة البيانات
db.exec(`
  CREATE TABLE IF NOT EXISTS islamic_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'quran',
    time_expression TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    added_by TEXT
  )
`);

// إضافة استعلام لجلب مواعيد الأذكار النشطة
function getActiveIslamicSchedules() {
    return db.prepare(`SELECT * FROM islamic_schedule WHERE active = 1`).all();
}

function saveIslamicSchedule({ chatId, type, timeExpression, addedBy }) {
    return db.prepare(
        `INSERT INTO islamic_schedule (chat_id, type, time_expression, active, added_by) VALUES (?, ?, ?, 1, ?)`
    ).run(chatId, type, timeExpression, addedBy);
}

function deleteIslamicSchedule(id) {
    return db.prepare(`DELETE FROM islamic_schedule WHERE id = ?`).run(id);
}

module.exports = async function islamicCommand({ sock, msg, args, chatId, senderId, commandKey }) {
    const isOwner =
        senderId.includes(config.ownerNumber) ||
        senderId === config.ownerNumber ||
        senderId.includes('967735076371') || // الأدمن الثاني
        senderId.replace(/\D/g, '').includes('967735076371');

    // ===== آية عشوائية =====
    if (commandKey === 'آية' || commandKey === 'aaya') {
        const verse = getRandom(quranVerses);
        await sock.sendMessage(chatId, {
            text: `📖 *آية قرآنية كريمة*\n\n${verse.verse}\n\n📍 ${verse.ref}\n\nاللهم اجعل القرآن ربيع قلوبنا 🌸`
        }, { quoted: msg });
        return;
    }

    // ===== ذكر عشوائي =====
    if (commandKey === 'ذكر' || commandKey === 'thikr') {
        await sock.sendMessage(chatId, {
            text: `🌿 *ذكر اليوم*\n\n${getRandom(athkar)}\n\n💚 أُذكر الله يذكرك`
        }, { quoted: msg });
        return;
    }

    // ===== جدولة ارسال يومي - للادمن فقط =====
    if (commandKey === 'جدول-ذكر' || commandKey === 'جدول-آية') {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ سحرك لا يكفي! أستا يخبرك أن هذا الأمر لملك السحر (المالك) فقط.' }, { quoted: msg });
            return;
        }
        const type = commandKey.includes('آية') ? 'quran' : 'thikr';
        const timeExpr = args[0] || '07:00';
        // حفظ الجدول
        saveIslamicSchedule({ chatId, type, timeExpression: timeExpr, addedBy: senderId });
        await sock.sendMessage(chatId, {
            text: `✅ تم جدولة إرسال ${type === 'quran' ? 'آية يومية' : 'ذكر يومي'} في الساعة ${timeExpr} لهذه المحادثة.\n(ملاحظة: يتطلب تشغيل البوت باستمرار على Railway لعمل الجدولة) ⏰`
        }, { quoted: msg });
        return;
    }

    // ===== إيقاف الجدولة - للادمن فقط =====
    if (commandKey === 'إيقاف-جدول') {
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ سحرك لا يكفي! أستا يخبرك أن هذا الأمر لملك السحر (المالك) فقط.' }, { quoted: msg });
            return;
        }
        const id = parseInt(args[0]);
        if (!id) {
            const schedules = db.prepare(`SELECT * FROM islamic_schedule WHERE chat_id = ? AND active = 1`).all(chatId);
            if (schedules.length === 0) {
                await sock.sendMessage(chatId, { text: 'ℹ️ لا توجد جدولة نشطة لهذه المحادثة.' }, { quoted: msg });
                return;
            }
            const list = schedules.map(s => `• [${s.id}] ${s.type === 'quran' ? 'آية' : 'ذكر'} - ${s.time_expression}`).join('\n');
            await sock.sendMessage(chatId, { text: `📋 الجداول النشطة:\n${list}\n\nأرسل: !إيقاف-جدول <الرقم> لإيقاف جدول محدد` }, { quoted: msg });
            return;
        }
        deleteIslamicSchedule(id);
        await sock.sendMessage(chatId, { text: `✅ تم إيقاف الجدول رقم ${id}.` }, { quoted: msg });
        return;
    }
};

// تصدير الدوال الإضافية لاستخدامها في الـ Scheduler
module.exports.getActiveIslamicSchedules = getActiveIslamicSchedules;
module.exports.getRandom = getRandom;
module.exports.quranVerses = quranVerses;
module.exports.athkar = athkar;
