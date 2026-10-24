// =============================================
// 🛡️ أوامر المشرفين والمجموعات (Group Admin Tools)
// =============================================

const config = require('../config');
const {
    setChatSetting, getChatSettings, addScheduledEvent, banUser, unbanUser, getBannedUsers,
    setWelcomeMessage, getWelcomeMessage, listScheduledEvents, deactivateScheduledEvent,
} = require('../database/db');
const responses = require('../utils/responses');
const { isAdminJid } = require('../utils/permissions');
const { DEFAULT_TEXT } = require('../handlers/welcomeHandler');

// إعادة تحميل جدولة المجموعات فوراً (بدون انتظار إعادة التشغيل)
function reloadGroupSchedules() {
    try {
        require('../scheduler/events').reloadGroupEvents();
    } catch (err) {
        return false;
    }
    return true;
}

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

// التحقق من صلاحية المشرف على البوت (مطابقة دقيقة للرقم)
function isOwner(senderId) {
    return isAdminJid(senderId);
}

// يقرأ الوقت HH:MM من أول وسيط ويعيد {h, m} أو null
function parseTime(value) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return { h, m: mi };
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

    // ===== كشف الرسائل المعدَّلة (Anti-Edit) =====
    // كان هذا الأمر مسجّلاً في commandHandler بدون أي تنفيذ فعلي (أمر ميت)
    if (commandKey === 'ضد_التعديل' || commandKey === 'ضد-التعديل' || commandKey === 'antiedit') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
        const arg = (args[0] || '').toLowerCase();
        if (arg === 'حالة' || arg === 'status') {
            const current = getChatSettings(chatId).anti_edit !== 0;
            await sock.sendMessage(chatId, { text: `✏️ كشف الرسائل المعدَّلة حالياً: *${current ? 'مفعّل ✅' : 'متوقف ⛔'}*` }, { quoted: msg });
            return;
        }
        const enable = arg !== 'off' && arg !== 'ايقاف' && arg !== 'إيقاف';
        setChatSetting(chatId, 'anti_edit', enable);
        await sock.sendMessage(chatId, {
            text: enable
                ? '✏️ تم تفعيل كشف الرسائل المعدَّلة! أي رسالة تُعدَّل سيعرض أستا نصها *قبل وبعد* التعديل. ⚔️'
                : '🔕 تم إيقاف كشف الرسائل المعدَّلة في هذه المحادثة (يبقى التسجيل في لوحة التحكم).',
        }, { quoted: msg });
        return;
    }

    // ===== إعداد الترحيب =====
    // .ترحيب            ← عرض الحالة
    // .ترحيب تشغيل|ايقاف ← تشغيل/إيقاف
    // .ترحيب <نص>       ← نص مخصص (يُفعَّل تلقائياً، و{name} يُستبدل باسم العضو)
    if (commandKey === 'ترحيب' || commandKey === 'welcome') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
        const first = (args[0] || '').toLowerCase();
        const on = ['تشغيل', 'on', 'تفعيل'];
        const off = ['ايقاف', 'إيقاف', 'off'];
        if (!args.length) {
            const enabled = getChatSettings(chatId).welcome_enabled === 1;
            const custom = getWelcomeMessage(chatId)?.message;
            await sock.sendMessage(chatId, {
                text: `🎉 الترحيب: *${enabled ? 'مفعّل ✅' : 'متوقف ⛔'}*\n\n📝 النص الحالي:\n${custom || DEFAULT_TEXT}\n\nالأوامر: ${config.prefix}ترحيب تشغيل | ${config.prefix}ترحيب ايقاف | ${config.prefix}ترحيب <نص> (استخدم {name} لاسم العضو)`,
            }, { quoted: msg });
            return;
        }
        if (on.includes(first) || off.includes(first)) {
            const enable = on.includes(first);
            setChatSetting(chatId, 'welcome_enabled', enable);
            await sock.sendMessage(chatId, { text: enable ? '🎉 تم تفعيل الترحيب بالأعضاء الجدد!' : '🚫 تم إيقاف الترحيب.' }, { quoted: msg });
            return;
        }
        const text = args.join(' ').trim();
        if (text.length > 1000) {
            await sock.sendMessage(chatId, { text: '⚠️ نص الترحيب طويل جداً (الحد 1000 حرف).' }, { quoted: msg });
            return;
        }
        setWelcomeMessage({ chatId, message: text, enabled: true });
        setChatSetting(chatId, 'welcome_enabled', true);
        await sock.sendMessage(chatId, { text: '✅ تم حفظ نص الترحيب الجديد وتفعيله.' }, { quoted: msg });
        return;
    }

    // ===== الجدولة للمجموعة (تبدأ فوراً) =====
    // .جدولة قفل [HH:MM]        ← قفل المجموعة يومياً (افتراضي 00:00)
    // .جدولة فتح [HH:MM]        ← فتح المجموعة يومياً (افتراضي 06:00)
    // .جدولة اذكار             ← تذكير أسبوعي يوم الجمعة 14:00
    // .جدولة نص HH:MM <الرسالة> ← رسالة يومية
    // .جدولة قائمة | .جدولة حذف <id>
    if (commandKey === 'جدولة') {
        if (!adminOrOwner) return await sock.sendMessage(chatId, { text: responses.get('persona', 'denied_admin') }, { quoted: msg });
        const type = args[0];
        const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: msg });

        if (type === 'قائمة' || type === 'list') {
            const mine = listScheduledEvents().filter((e) => e.chat_id === chatId);
            if (!mine.length) return reply('📭 لا توجد مهام مجدولة في هذه المجموعة.');
            const lines = mine.map((e) => `• [${e.id}] ${e.cron_expression} — ${e.message.startsWith('COMMAND:') ? e.message.slice(8) : e.message.slice(0, 60)}`);
            return reply(`🗓️ *المهام المجدولة*\n\n${lines.join('\n')}\n\nللحذف: ${config.prefix}جدولة حذف <id>`);
        }
        if (type === 'حذف' || type === 'delete') {
            const id = Number(args[1]);
            const mine = listScheduledEvents().find((e) => e.id === id && e.chat_id === chatId);
            if (!mine) return reply(`⚠️ لا توجد مهمة برقم ${args[1] || ''} في هذه المجموعة.`);
            deactivateScheduledEvent(id);
            reloadGroupSchedules();
            return reply(`✅ تم حذف المهمة رقم ${id}.`);
        }

        let cron = null;
        let message = null;
        let label = '';
        if (type === 'قفل' || type === 'فتح') {
            const t = parseTime(args[1]) || (type === 'قفل' ? { h: 0, m: 0 } : { h: 6, m: 0 });
            cron = `${t.m} ${t.h} * * *`;
            message = type === 'قفل' ? 'COMMAND:lock' : 'COMMAND:unlock';
            label = `${type} المجموعة يومياً الساعة ${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
        } else if (type === 'اذكار') {
            cron = '0 14 * * 5';
            message = '📿 جمعة مباركة أصدقائي! لا تنسوا الإكثار من الصلاة على النبي ﷺ 🤍';
            label = 'تذكير يوم الجمعة 14:00';
        } else if (type === 'نص') {
            const t = parseTime(args[1]);
            const text = args.slice(2).join(' ').trim();
            if (!t || !text) return reply(`⚠️ الصيغة: ${config.prefix}جدولة نص HH:MM <الرسالة>`);
            cron = `${t.m} ${t.h} * * *`;
            message = text;
            label = `رسالة يومية الساعة ${args[1]}`;
        } else {
            return reply(`⚠️ اختر نوع المهمة: \`${config.prefix}جدولة قفل [HH:MM]\` | \`${config.prefix}جدولة فتح [HH:MM]\` | \`${config.prefix}جدولة نص HH:MM <رسالة>\` | \`${config.prefix}جدولة اذكار\` | \`${config.prefix}جدولة قائمة\``);
        }

        const id = addScheduledEvent(chatId, cron, message);
        reloadGroupSchedules();
        return reply(`⏰ تمت الجدولة (رقم ${id}): ${label}. ستعمل من الآن بدون الحاجة لإعادة التشغيل.`);
    }
};
