const os = require('os');
const { getGlobalSetting, setGlobalSetting, getStats, db } = require('../database/db');
const config = require('../config');
const responses = require('../utils/responses');

// أوامر المالك
module.exports = async function ownerCommand({ sock, msg, args, chatId, senderId, commandKey }) {
    const digits = (senderId || '').replace(/\D/g, '');
    const owners = config.adminNumbers || [config.ownerNumber];
    const isOwner = owners.some((o) => o && digits.includes(o));

    if (!isOwner) {
        await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
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
        const totalMem = os.totalmem() / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        const heap = process.memoryUsage().heapUsed / 1024 / 1024;

        const s = getStats();
        const groups = db.prepare("SELECT COUNT(DISTINCT chat_id) as count FROM messages WHERE chat_id LIKE '%@g.us'").get().count;

        const up = process.uptime();
        const uptime = `${Math.floor(up / 86400)}ي ${Math.floor((up % 86400) / 3600)}س ${Math.floor((up % 3600) / 60)}د`;

        const stats =
            `⚙️ *إحصائيات أستا ساما* ⚙️\n\n` +
            `⏱️ *مدة التشغيل:* ${uptime}\n` +
            `📊 *المجموعات النشطة:* ${groups}\n` +
            `👥 *إجمالي المحادثات:* ${s.totalChats}  ·  *المستخدمون:* ${s.totalUsers}\n` +
            `💬 *إجمالي الرسائل:* ${s.totalMessages}\n` +
            `🕐 *رسائل آخر 24 ساعة:* ${s.messagesToday}\n` +
            `✏️ *رسائل معدَّلة مرصودة:* ${s.editedMessages}\n` +
            `🗑️ *رسائل محذوفة مرصودة:* ${s.deletedMessages}\n` +
            `🤖 *ردود مخصصة:* ${s.customReplies}  ·  *تفاعلات:* ${s.customReactions}\n` +
            `🚫 *المحظورون:* ${s.bannedUsers}\n` +
            `⏰ *تذكيرات معلّقة:* ${s.pendingReminders}  ·  *مهام مجدولة:* ${s.scheduledEvents}\n` +
            `🧠 *الذاكرة:* ${usedMem.toFixed(0)} / ${totalMem.toFixed(0)} MB (البوت: ${heap.toFixed(1)} MB)\n` +
            `🟢 *Node.js:* ${process.version}\n\n` +
            `🍀 *أستا في أفضل حالاته! طاقتي السحرية في أوجها!*`;

        await sock.sendMessage(chatId, { text: stats }, { quoted: msg });
        return;
    }
};
