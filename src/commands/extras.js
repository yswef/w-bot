// =============================================
// 🌐 أوامر متنوعة - نسبة الحب / محول العملات / الترجمة / استطلاعات الرأي
// =============================================

const https = require('https');

// دالة مساعدة لجلب البيانات من URL
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

// تخزين الاستطلاعات النشطة
const activePolls = new Map();

module.exports = async function extrasCommand({ sock, msg, args, chatId, senderId, commandKey }) {

    // ===== نسبة الحب والتوافق =====
    if (commandKey === 'حب' || commandKey === 'love') {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        let person1, person2;
        if (mentioned && mentioned.length === 2) {
            person1 = `@${mentioned[0].split('@')[0]}`;
            person2 = `@${mentioned[1].split('@')[0]}`;
        } else if (mentioned && mentioned.length === 1) {
            person1 = `@${senderId.split('@')[0]}`;
            person2 = `@${mentioned[0].split('@')[0]}`;
        } else {
            person1 = args[0] || 'أستا';
            person2 = args[1] || 'نويل';
        }
        const percentage = Math.floor(Math.random() * 101);
        let emoji = percentage >= 80 ? '💖💖💖' : percentage >= 50 ? '💕' : percentage >= 30 ? '💛' : '💔';
        let comment = percentage >= 80 ? 'توافق مثالي! مثل أستا ونويل! 🍀' :
            percentage >= 50 ? 'توافق جيد، اعطوه وقت ينمو 🌱' :
                percentage >= 30 ? 'في أمل، لكن يحتاج جهد! ⚔️' :
                    'مقدّر، بس هذي الحياة 😅';
        const text = `${emoji} *نتيجة التوافق* ${emoji}\n\n${person1} ❤️ ${person2}\n\n💯 نسبة الحب: ${percentage}%\n\n${comment}`;
        await sock.sendMessage(chatId, {
            text,
            mentions: mentioned || []
        }, { quoted: msg });
        return;
    }

    // ===== محول العملات =====
    if (commandKey === 'سعر' || commandKey === 'currency') {
        const amount = parseFloat(args[0]) || 1;
        const from = (args[1] || 'USD').toUpperCase();
        const to = (args[2] || 'SAR').toUpperCase();
        const waitMsg = await sock.sendMessage(chatId, { text: `🔄 جاري جلب سعر ${from} إلى ${to}...` }, { quoted: msg });
        try {
            const data = await fetchJSON(`https://open.er-api.com/v6/latest/${from}`);
            if (data.result === 'success' && data.rates[to]) {
                const rate = data.rates[to];
                const result = (amount * rate).toFixed(2);
                await sock.sendMessage(chatId, {
                    text: `💱 *محول العملات*\n\n${amount} ${from} = *${result} ${to}*\n\n📅 آخر تحديث: ${data.time_last_update_utc}`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: `⚠️ عملة غير مدعومة: ${from} أو ${to}` }, { quoted: msg });
            }
        } catch {
            await sock.sendMessage(chatId, { text: `⚠️ تعذر جلب بيانات العملات، تأكد من الاتصال بالإنترنت.` }, { quoted: msg });
        }
        return;
    }

    // ===== ترجمة النص =====
    if (commandKey === 'ترجم' || commandKey === 'translate') {
        const targetLang = args[0] || 'ar';
        const textToTranslate = args.slice(1).join(' ') || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
        if (!textToTranslate) {
            await sock.sendMessage(chatId, { text: '⚠️ أرسل النص بعد الأمر. مثال:\n!ترجم en مرحبا بالعالم\n(أو رد على رسالة بـ !ترجم en)' }, { quoted: msg });
            return;
        }
        try {
            const encodedText = encodeURIComponent(textToTranslate);
            const data = await fetchJSON(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`);
            const translated = data[0].map(t => t[0]).join('');
            await sock.sendMessage(chatId, {
                text: `🌍 *ترجمة النص*\n\n📝 النص الأصلي:\n${textToTranslate}\n\n✅ الترجمة (${targetLang}):\n${translated}`
            }, { quoted: msg });
        } catch {
            await sock.sendMessage(chatId, { text: '⚠️ تعذرت الترجمة، تأكد من رمز اللغة. (مثال: ar, en, fr, tr)' }, { quoted: msg });
        }
        return;
    }

    // ===== إنشاء استطلاع رأي =====
    if (commandKey === 'استطلاع' || commandKey === 'poll') {
        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim());
        if (parts.length < 3) {
            await sock.sendMessage(chatId, {
                text: '⚠️ صيغة الاستطلاع:\n!استطلاع <السؤال> | <خيار 1> | <خيار 2> | ...\n\nمثال:\n!استطلاع أفضل شخصية؟ | أستا | يونو | نويل'
            }, { quoted: msg });
            return;
        }
        const question = parts[0];
        const options = parts.slice(1);
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const pollId = `poll_${Date.now()}`;
        const pollData = { question, options, votes: {}, voters: new Set(), msgId: pollId };
        activePolls.set(pollId, pollData);

        const optionsList = options.map((o, i) => `${emojis[i]} ${o}`).join('\n');
        const text = `📊 *استطلاع رأي*\n\n❓ ${question}\n\n${optionsList}\n\n📝 للتصويت: أرسل رقم الخيار (1, 2, 3...)`;
        const sentMsg = await sock.sendMessage(chatId, { text }, { quoted: msg });
        // حفظ ID الرسالة لمطابقة التصويتات
        pollData.chatId = chatId;
        pollData.msgId = sentMsg?.key?.id || pollId;
        activePolls.set(pollData.msgId, pollData);
        return;
    }

    // ===== نكتة عشوائية =====
    if (commandKey === 'نكتة' || commandKey === 'joke') {
        const jokes = [
            'الطالب: دكتور، أنا مضطر أغيب يوم عشان زواجي. الدكتور: وهذا يستحق؟! 😂',
            'ليش الكمبيوتر دايم بارد؟ عشان عنده مراوح كثيرة 🌀😂',
            'شخص قال لصاحبه: أنا خسرت ذاكرتي! صاحبه: من امتى؟ قال: من امتى ايش؟ 😅',
            'لماذا لا يستطيع النمل اللعب على الكمبيوتر؟ لأنه يأكل الكوكيز! 🐜🍪',
            'قالوا: الوقت من ذهب. أنا قلت: طيب، ليش دوامي طويل؟ 😂',
            'أستا لو يجي المدرسة: مدرس: ليش معك سيف؟ أستا: هذا قلمي 🗡️😂',
        ];
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        await sock.sendMessage(chatId, { text: `😄 *نكتة اليوم*\n\n${joke}` }, { quoted: msg });
        return;
    }

    // ===== اقتباس أنمي عشوائي =====
    if (commandKey === 'اقتباس' || commandKey === 'quote') {
        const quotes = [
            { q: 'تجاوز حدودك هنا والآن!', from: 'أستا - Black Clover' },
            { q: 'حتى لو لم يكن لدي سحر، سأصبح إمبراطور السحر!', from: 'أستا - Black Clover' },
            { q: 'الذين يستسلمون هم الأكثر حاجة إلى التشجيع.', from: 'يونو - Black Clover' },
            { q: 'القوة بدون تقنية لا معنى لها، والتقنية بدون قوة لا تكفي.', from: 'يامي - Black Clover' },
            { q: 'نحن لا نفوز لأننا أقوياء. نفوز لأننا لا نعرف كلمة استسلام.', from: 'أستا - Black Clover' },
            { q: 'الأمل شيء لا يموت أبداً.', from: 'يونو - Black Clover' },
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        await sock.sendMessage(chatId, {
            text: `💬 *اقتباس أنمي*\n\n"${quote.q}"\n\n— ${quote.from} 🍀`
        }, { quoted: msg });
        return;
    }
};

// تصدير الاستطلاعات النشطة لمعالجة التصويتات خارج الملف
module.exports.activePolls = activePolls;
