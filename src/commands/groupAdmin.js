// =============================================
// 🛡️ أوامر المشرفين والمجموعات (Group Admin Tools)
// =============================================

const config = require('../config');
const { setChatSetting, addScheduledEvent } = require('../database/db');

// التحقق من صلاحيات المشرف داخل المجموعة
async function isGroupAdmin(sock, chatId, senderId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participant = metadata.participants.find(p => p.id === senderId);
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch {
        return false;
    }
}

// التحقق من صلاحية المالك.
function isOwner(senderId) {
    const secondAdmin = '967735076371';
    return (
        senderId.includes(config.ownerNumber) ||
        senderId === config.ownerNumber ||
        senderId.replace(/\D/g, '').includes(secondAdmin)
    );
}

module.exports = async function groupAdminCommand({ sock, msg, args, chatId, senderId, commandKey }) {

    // هذه الأوامر للمجموعات فقط
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر يعمل في المجموعات فقط.' }, { quoted: msg });
        return;
    }

    const adminOrOwner = isOwner(senderId) || await isGroupAdmin(sock, chatId, senderId);

    // ===== طرد عضو من المجموعة =====
    if (commandKey === 'طرد' || commandKey === 'kick') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
            return;
        }
        // استخراج رقم المنشن أو المستخدم
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target = mentioned || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : null);
        if (!target) {
            await sock.sendMessage(chatId, { text: '⚠️ منشن العضو الذي تريد طرده. مثال: !طرد @عضو' }, { quoted: msg });
            return;
        }
        await sock.groupParticipantsUpdate(chatId, [target], 'remove');
        await sock.sendMessage(chatId, { text: `✅ تم طرد العضو من المجموعة. ⚔️` }, { quoted: msg });
        return;
    }

    // ===== ترقية عضو لمشرف =====
    if (commandKey === 'ترقية' || commandKey === 'promote') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمالك فقط.' }, { quoted: msg });
            return;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target = mentioned || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : null);
        if (!target) {
            await sock.sendMessage(chatId, { text: '⚠️ منشن العضو الذي تريد ترقيته. مثال: !ترقية @عضو' }, { quoted: msg });
            return;
        }
        await sock.groupParticipantsUpdate(chatId, [target], 'promote');
        await sock.sendMessage(chatId, { text: `✅ تمت ترقية العضو إلى مشرف. 👑` }, { quoted: msg });
        return;
    }

    // ===== تخفيض مشرف لعضو =====
    if (commandKey === 'تخفيض' || commandKey === 'demote') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمالك فقط.' }, { quoted: msg });
            return;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target = mentioned || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : null);
        if (!target) {
            await sock.sendMessage(chatId, { text: '⚠️ منشن المشرف الذي تريد تخفيضه.' }, { quoted: msg });
            return;
        }
        await sock.groupParticipantsUpdate(chatId, [target], 'demote');
        await sock.sendMessage(chatId, { text: `✅ تم تخفيض المشرف إلى عضو عادي.` }, { quoted: msg });
        return;
    }

    // ===== قفل المجموعة - للمشرفين فقط =====
    if (commandKey === 'قفل' || commandKey === 'lock') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
            return;
        }
        await sock.groupSettingUpdate(chatId, 'announcement');
        await sock.sendMessage(chatId, { text: '🔒 تم قفل المجموعة. فقط المشرفون يستطيعون الإرسال الآن.' }, { quoted: msg });
        return;
    }

    // ===== فتح المجموعة - للمشرفين فقط =====
    if (commandKey === 'فتح' || commandKey === 'unlock') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
            return;
        }
        await sock.groupSettingUpdate(chatId, 'not_announcement');
        await sock.sendMessage(chatId, { text: '🔓 تم فتح المجموعة. الكل يستطيع الإرسال الآن.' }, { quoted: msg });
        return;
    }

    // ===== منشن الجميع - للمشرفين فقط =====
    if (commandKey === 'الكل' || commandKey === 'احية' || commandKey === 'all') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
            return;
        }
        try {
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants.map(p => p.id);
            const customMsg = args.join(' ') || '📢 تنبيه للجميع!';
            const mentionText = participants.map(p => `@${p.split('@')[0]}`).join(' ');
            await sock.sendMessage(chatId, {
                text: `${customMsg}\n\n${mentionText}`,
                mentions: participants
            }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(chatId, { text: '⚠️ تعذر منشن الأعضاء: ' + err.message }, { quoted: msg });
        }
        return;
    }

    // ===== معلومات عن المجموعة =====
    if (commandKey === 'معلومات-مجموعة' || commandKey === 'groupinfo') {
        try {
            const metadata = await sock.groupMetadata(chatId);
            const admins = metadata.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ');
            const text =
                `ℹ️ *معلومات المجموعة*\n\n` +
                `📌 الاسم: ${metadata.subject}\n` +
                `👥 الأعضاء: ${metadata.participants.length}\n` +
                `👑 المشرفون: ${admins || 'غير معروف'}\n` +
                `📅 تاريخ الإنشاء: ${new Date(metadata.creation * 1000).toLocaleDateString('ar-SA')}`;
            await sock.sendMessage(chatId, { text }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(chatId, { text: '⚠️ تعذر جلب المعلومات.' }, { quoted: msg });
        }
        return;
    }

    // ===== حماية الروابط =====
    if (commandKey === 'منع-الروابط' || commandKey === 'antilink') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
        const enable = args[0] !== 'off' && args[0] !== 'ايقاف';
        setChatSetting(chatId, 'anti_link', enable);
        await sock.sendMessage(chatId, { text: enable ? '🛡️ تم تفعيل منع الروابط! سيف أستا سيحطم أي رابط غريب!' : '🔓 تم إيقاف منع الروابط.' }, { quoted: msg });
        return;
    }

    // ===== إعداد الترحيب =====
    if (commandKey === 'ترحيب' || commandKey === 'welcome') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
        const enable = args[0] !== 'off' && args[0] !== 'ايقاف';
        setChatSetting(chatId, 'welcome_enabled', enable);
        await sock.sendMessage(chatId, { text: enable ? '🎉 تم تفعيل بطاقات الترحيب السحرية بالانضمام للجروب!' : '🚫 تم إيقاف الترحيب.' }, { quoted: msg });
        return;
    }

    // ===== الجدولة السحرية للمشرفين =====
    if (commandKey === 'جدولة') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر للمشرفين فقط.' }, { quoted: msg });
        const type = args[0];
        if (type === 'قفل') {
            addScheduledEvent(chatId, '0 0 * * *', 'COMMAND:lock');
            await sock.sendMessage(chatId, { text: '⏰ أستا مستعد! تم جدولة قفل الجروب تلقائياً في منتصف الليل! (سيعمل غداً وسيتم تطبيقه بعد أي إعادة تشغيل)' }, { quoted: msg });
        } else if (type === 'فتح') {
            addScheduledEvent(chatId, '0 6 * * *', 'COMMAND:unlock');
            await sock.sendMessage(chatId, { text: '⏰ أستا مستعد! تم جدولة فتح الجروب تلقائياً في السادسة صباحاً! (سيتم تفعيله بعد إعادة التشغيل القادمة)' }, { quoted: msg });
        } else if (type === 'اذكار') {
            addScheduledEvent(chatId, '0 14 * * 5', '📿 جمعة مباركة أصدقائي! أستا يذكركم بقراءة سورة الكهف والإكثار من الصلاة على النبي!');
            await sock.sendMessage(chatId, { text: '⏰ تم إضافة التنبيه! سأقوم بتذكير الجروب كل جمعة الساعة 2 ظهراً.' }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ حدد نوع السحر المطلوب: `!جدولة قفل` | `!جدولة فتح` | `!جدولة اذكار`' }, { quoted: msg });
        }
        return;
    }
};
