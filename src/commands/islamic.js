// =============================================
// 🕌 الأوامر الإسلامية - آيات عشوائية وأذكار مجدولة
// المسؤول فقط يقدر يضبط الإرسال ويحدد المستلمين والوقت
// =============================================

const { db } = require('../database/db');
const config = require('../config');
const { isAdminJid } = require('../utils/permissions');

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

// إضافة استعلام لجلب مواعيد الأذكار النشطة
function getActiveIslamicSchedules() {
    return db.prepare(`SELECT * FROM islamic_schedule WHERE active = 1`).all();
}

// يتحقق من صيغة HH:MM ويعيد الوقت المنسَّق أو null
function parseHHMM(value) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return { h, mi, text: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` };
}

// يعيد تحميل الجدولة فوراً بعد أي تعديل (بدون إعادة تشغيل)
function reloadIslamicSchedules() {
    try {
        require('../scheduler/events').reloadIslamicSchedules();
    } catch { /* الجدولة قد تكون معطّلة */ }
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
    // ⚠️ إصلاح: كان الرقم الثاني مكتوباً يدوياً (hardcoded) بدل قراءته من
    // الإعدادات، فأي تغيير في .env لرقم الأدمن الثاني لا ينعكس هنا.
    // الآن يستخدم config.adminNumbers (كل المالكين + الأدمن الثاني ديناميكياً).
    const isOwner = isAdminJid(senderId);

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
        // ⚠️ إصلاح: الوقت لم يكن يُتحقق منه، وكان الجدول يُرسل دائماً الساعة 7 و5 بغض النظر عن الوقت المحفوظ.
        const parsed = parseHHMM(args[0] || (type === 'quran' ? '07:00' : '17:00'));
        if (!parsed) {
            await sock.sendMessage(chatId, { text: `⚠️ صيغة الوقت غير صحيحة. استخدم HH:MM مثل 06:30 أو 18:00 (بتوقيت ${config.timezone}).` }, { quoted: msg });
            return;
        }
        saveIslamicSchedule({ chatId, type, timeExpression: parsed.text, addedBy: senderId });
        reloadIslamicSchedules();
        await sock.sendMessage(chatId, {
            text: `✅ تم جدولة إرسال ${type === 'quran' ? 'آية يومية' : 'ذكر يومي'} الساعة ${parsed.text} (${config.timezone}) لهذه المحادثة. ⏰`
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
        reloadIslamicSchedules();
        await sock.sendMessage(chatId, { text: `✅ تم إيقاف الجدول رقم ${id}.` }, { quoted: msg });
        return;
    }
};

// تصدير الدوال الإضافية لاستخدامها في الـ Scheduler
module.exports.getActiveIslamicSchedules = getActiveIslamicSchedules;
module.exports.getRandom = getRandom;
module.exports.quranVerses = quranVerses;
module.exports.athkar = athkar;
