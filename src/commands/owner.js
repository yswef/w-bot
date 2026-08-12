const os = require('os');
const { getGlobalSetting, setGlobalSetting, db } = require('../database/db');
const config = require('../config');

// أوامر المالك
module.exports = async function ownerCommand({ sock, msg, args, chatId, senderId, commandKey }) {
    const isOwner = senderId === (config.ownerNumber + '@s.whatsapp.net') || senderId === (config.secondAdminNumber + '@s.whatsapp.net');

    if (!isOwner) {
        await sock.sendMessage(chatId, { text: '❌ همممم! أستا يقول بإن السحر الخاص بك لا يكفي لهذا الأمر.. أنت لست الملك!' }, { quoted: msg });
        return;
    }

    if (commandKey === 'صيانة' || commandKey === 'maintenance') {
        const current = getGlobalSetting('maintenance_mode');
        const newState = current === '1' ? '0' : '1';
        setGlobalSetting('maintenance_mode', newState);

        const textStatus = newState === '1'
            ? '🔴 *تم تفعيل وضع التدريب والصيانة!*\n\nأستا الآن يتدرب بكل قوة ولن يستجيب لأي سحر آخر سوى سحرك يا سيدي.'
            : '🟢 *تم إيقاف وضع الصيانة!*\n\nأستا جاهز ومستعد لمواجهة الجميع! سحري لن ينتهي!';

        await sock.sendMessage(chatId, { text: textStatus }, { quoted: msg });
        return;
    }

    if (commandKey === 'stats' || commandKey === 'احصائيات') {
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);

        const groups = db.prepare("SELECT COUNT(DISTINCT chat_id) as count FROM messages WHERE chat_id LIKE '%@g.us'").get().count;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const msgsToday = db.prepare("SELECT COUNT(*) as count FROM messages WHERE timestamp >= ?").get(startOfDay.getTime()).count;

        const stats = `⚙️ *إحصائيات أستا ساما* ⚙️\n\n` +
            `📊 *المجموعات النشطة:* ${groups}\n` +
            `💬 *الرسائل المعالجة اليوم:* ${msgsToday}\n` +
            `🧠 *استهلاك الرام:* ${usedMem} MB / ${totalMem} MB\n\n` +
            `🍀 *أستا في أفضل حالاته! طاقتي السحرية في أوجها!*`;

        await sock.sendMessage(chatId, { text: stats }, { quoted: msg });
    }
};
