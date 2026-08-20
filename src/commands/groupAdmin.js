// =============================================
// 🛡️ أوامر المشرفين والمجموعات (Group Admin Tools)
// =============================================

const config = require('../config');
const { setChatSetting, addScheduledEvent, banUser, unbanUser, getBannedUsers } = require('../database/db');
const responses = require('../utils/responses');

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

// التحقق من صلاحية المالك (يشمل كل أرقام المالكين + الأدمن الثاني)
function isOwner(senderId) {
    const digits = (senderId || '').replace(/\D/g, '');
    const owners = config.adminNumbers || [config.ownerNumber];
    return owners.some((o) => o && digits.includes(o));
}

function resolveTarget(msg, args) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    return mentioned || quotedParticipant || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : null);
}

// تنفيذ فعل إداري على المجموعة مع طلب الترقية تلقائياً إذا لم يملك أستا صلاحية مشرف
async function runGroupAction(sock, chatId, msg, action) {
    try {
        await action();
        return true;
    } catch (err) {
        const msgText = (err?.message || '').toLowerCase();
        const forbidden = err?.output?.statusCode === 403 || msgText.includes('forbidden') || msgText.includes('not-authorized') || msgText.includes('403');
        if (forbidden) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'needs_promotion') }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { text: `⚠️ حدث خطأ أثناء تنفيذ الأمر: ${err.message}` }, { quoted: msg });
        }
        return false;
    }
}

module.exports = async function groupAdminCommand({ sock, msg, args, chatId, senderId, commandKey }) {

    // ===== أوامر الحظر تعمل حتى خارج المجموعات (خاص أيضاً) =====
    if (commandKey === 'حظر' || commandKey === 'ban') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
            return;
        }
        const target = resolveTarget(msg, args);
        if (!target) {
            await sock.sendMessage(chatId, { text: `⚠️ منشن أو اكتب رقم العضو الذي تريد حظره. مثال: ${config.prefix}حظر @عضو` }, { quoted: msg });
            return;
        }
        banUser(target, senderId);
        await sock.sendMessage(chatId, { text: `🚫 تم حظر @${target.split('@')[0]} من استخدام أستا نهائياً! ⚔️`, mentions: [target] }, { quoted: msg });
        return;
    }

    if (commandKey === 'رفع-حظر' || commandKey === 'unban') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
            return;
        }
        const target = resolveTarget(msg, args);
        if (!target) {
            await sock.sendMessage(chatId, { text: `⚠️ منشن أو اكتب رقم العضو الذي تريد رفع الحظر عنه.` }, { quoted: msg });
            return;
        }
        unbanUser(target);
        await sock.sendMessage(chatId, { text: `✅ تم رفع الحظر عن @${target.split('@')[0]}، مرحباً به من جديد! 🍀`, mentions: [target] }, { quoted: msg });
        return;
    }

    if (commandKey === 'المحظورين' || commandKey === 'banlist') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
            return;
        }
        const banned = getBannedUsers();
        if (banned.length === 0) {
            await sock.sendMessage(chatId, { text: '✅ لا يوجد أي محظورين حالياً!' }, { quoted: msg });
            return;
        }
        const list = banned.map((b, i) => `${i + 1}. @${b.user_id.split('@')[0]}`).join('\n');
        await sock.sendMessage(chatId, { text: `🚫 *قائمة المحظورين:*\n\n${list}`, mentions: banned.map(b => b.user_id) }, { quoted: msg });
        return;
    }

    // باقي أوامر هذا الملف للمجموعات فقط
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_group_only') }, { quoted: msg });
        return;
    }

    const adminOrOwner = isOwner(senderId) || await isGroupAdmin(sock, chatId, senderId);

    // ===== طرد عضو من المجموعة =====
    if (commandKey === 'طرد' || commandKey === 'kick') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
            return;
        }
        const target = resolveTarget(msg, args);
        if (!target) {
            await sock.sendMessage(chatId, { text: `⚠️ منشن العضو الذي تريد طرده. مثال: ${config.prefix}طرد @عضو` }, { quoted: msg });
            return;
        }
        const ok = await runGroupAction(sock, chatId, msg, () => sock.groupParticipantsUpdate(chatId, [target], 'remove'));
        if (ok) await sock.sendMessage(chatId, { text: `✅ تم طرد العضو من المجموعة. ⚔️` }, { quoted: msg });
        return;
    }

    // ===== ترقية عضو لمشرف =====
    if (commandKey === 'ترقية' || commandKey === 'promote') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
            return;
        }
        const target = resolveTarget(msg, args);
        if (!target) {
            await sock.sendMessage(chatId, { text: `⚠️ منشن العضو الذي تريد ترقيته. مثال: ${config.prefix}ترقية @عضو` }, { quoted: msg });
            return;
        }
        const ok = await runGroupAction(sock, chatId, msg, () => sock.groupParticipantsUpdate(chatId, [target], 'promote'));
        if (ok) await sock.sendMessage(chatId, { text: `✅ تمت ترقية العضو إلى مشرف. 👑` }, { quoted: msg });
        return;
    }

    // ===== تخفيض مشرف لعضو =====
    if (commandKey === 'تخفيض' || commandKey === 'demote') {
        if (!isOwner(senderId)) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });
            return;
        }
        const target = resolveTarget(msg, args);
        if (!target) {
            await sock.sendMessage(chatId, { text: '⚠️ منشن المشرف الذي تريد تخفيضه.' }, { quoted: msg });
            return;
        }
        const ok = await runGroupAction(sock, chatId, msg, () => sock.groupParticipantsUpdate(chatId, [target], 'demote'));
        if (ok) await sock.sendMessage(chatId, { text: `✅ تم تخفيض المشرف إلى عضو عادي.` }, { quoted: msg });
        return;
    }

    // ===== قفل المجموعة - للمشرفين فقط =====
    if (commandKey === 'قفل' || commandKey === 'lock') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
            return;
        }
        const ok = await runGroupAction(sock, chatId, msg, () => sock.groupSettingUpdate(chatId, 'announcement'));
        if (ok) await sock.sendMessage(chatId, { text: '🔒 تم قفل المجموعة. فقط المشرفون يستطيعون الإرسال الآن.' }, { quoted: msg });
        return;
    }

    // ===== فتح المجموعة - للمشرفين فقط =====
    if (commandKey === 'فتح' || commandKey === 'unlock') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
            return;
        }
        const ok = await runGroupAction(sock, chatId, msg, () => sock.groupSettingUpdate(chatId, 'not_announcement'));
        if (ok) await sock.sendMessage(chatId, { text: '🔓 تم فتح المجموعة. الكل يستطيع الإرسال الآن.' }, { quoted: msg });
        return;
    }

    // ===== منشن الجميع (ظاهر) - للمشرفين فقط =====
    if (commandKey === 'الكل' || commandKey === 'احية' || commandKey === 'all') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
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

    // ===== منشن الجميع (مخفي) - يرسل الرسالة فقط بدون عرض قائمة @الأسماء لكن الجميع يتنبّه =====
    if (commandKey === 'تنبيه') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
            return;
        }
        try {
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants.map(p => p.id);
            const customMsg = args.join(' ') || '📢 تنبيه سحري خفي من أستا!';
            await sock.sendMessage(chatId, { text: customMsg, mentions: participants }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(chatId, { text: '⚠️ تعذر إرسال التنبيه: ' + err.message }, { quoted: msg });
        }
        return;
    }

    // ===== منشن مخفي لعضو واحد مرفق برسالة (رد على رسالته أو منشنه) =====
    if (commandKey === 'همسة' || commandKey === 'منشن') {
        if (!adminOrOwner) {
            await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
            return;
        }
        const target = resolveTarget(msg, args);
        if (!target) {
            await sock.sendMessage(chatId, { text: `⚠️ رد على رسالة العضو أو منشنه، مع رسالتك. مثال: ${config.prefix}همسة تعال هنا` }, { quoted: msg });
            return;
        }
        const customMsg = args.filter(a => !a.startsWith('@')).join(' ') || 'أستا يناديك بصمت! 🤫';
        await sock.sendMessage(chatId, { text: customMsg, mentions: [target] }, { quoted: msg });
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
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
        const enable = args[0] !== 'off' && args[0] !== 'ايقاف';
        setChatSetting(chatId, 'anti_link', enable);
        await sock.sendMessage(chatId, { text: enable ? '🛡️ تم تفعيل منع الروابط! سيف أستا سيحطم أي رابط غريب!' : '🔓 تم إيقاف منع الروابط.' }, { quoted: msg });
        return;
    }

    // ===== إعداد الترحيب =====
    if (commandKey === 'ترحيب' || commandKey === 'welcome') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
        const enable = args[0] !== 'off' && args[0] !== 'ايقاف';
        setChatSetting(chatId, 'welcome_enabled', enable);
        await sock.sendMessage(chatId, { text: enable ? '🎉 تم تفعيل بطاقات الترحيب السحرية بالانضمام للجروب!' : '🚫 تم إيقاف الترحيب.' }, { quoted: msg });
        return;
    }

    // ===== الجدولة السحرية للمشرفين =====
    if (commandKey === 'جدولة') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
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
            await sock.sendMessage(chatId, { text: `⚠️ حدد نوع السحر المطلوب: \`${config.prefix}جدولة قفل\` | \`${config.prefix}جدولة فتح\` | \`${config.prefix}جدولة اذكار\`` }, { quoted: msg });
        }
        return;
    }
};
