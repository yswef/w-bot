// =============================================
// 🌐 أوامر متنوعة - نسبة الحب / محول العملات / الترجمة / استطلاعات الرأي
// =============================================

const https = require('https');
const config = require('../config');

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
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText =
            quoted?.conversation ||
            quoted?.extendedTextMessage?.text ||
            quoted?.imageMessage?.caption ||
            quoted?.videoMessage?.caption;
        const textToTranslate = args.slice(1).join(' ') || quotedText;
        if (!textToTranslate) {
            await sock.sendMessage(chatId, { text: `⚠️ أرسل النص بعد الأمر. مثال:\n${config.prefix}ترجم en مرحبا بالعالم\n(أو رد على رسالة بـ ${config.prefix}ترجم en)` }, { quoted: msg });
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
    // ⚠️ تحسين: كانت النسخة السابقة ترسل نصاً عادياً وتطلب من الناس كتابة
    // رقم الخيار، ولم يكن هناك أي كود يحتسب الأصوات إطلاقاً (خزّنها في Map
    // ونسيها). الآن نستخدم استطلاعات واتساب الأصلية التي يحتسبها التطبيق نفسه.
    if (commandKey === 'استطلاع' || commandKey === 'poll') {
        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length < 3) {
            await sock.sendMessage(chatId, {
                text: `⚠️ صيغة الاستطلاع:\n${config.prefix}استطلاع <السؤال> | <خيار 1> | <خيار 2> | ...\n\n` +
                    `مثال:\n${config.prefix}استطلاع أفضل شخصية؟ | أستا | يونو | نويل`
            }, { quoted: msg });
            return;
        }
        const question = parts[0];
        const options = parts.slice(1, 13); // واتساب يدعم حتى 12 خياراً
        try {
            await sock.sendMessage(chatId, {
                poll: { name: `📊 ${question}`, values: options, selectableCount: 1 },
            });
        } catch (err) {
            // احتياطي: لو لم يدعم الإصدار الاستطلاعات الأصلية نرسل نصاً
            const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','1️⃣1️⃣','1️⃣2️⃣'];
            const optionsList = options.map((o, i) => `${emojis[i]} ${o}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `📊 *استطلاع رأي*\n\n❓ ${question}\n\n${optionsList}\n\n📝 للتصويت أرسل رقم الخيار.`
            }, { quoted: msg });
        }
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
            'أستا لو يجي المدرسة: المدرس: ليش معك سيف؟ أستا: هذا قلمي 🗡️😂',
            'سألوا المبرمج: كيف تنام؟ قال: أنام على شكل حلقة لا نهائية، وأستيقظ على خطأ 😴💻',
            'واحد قال لصاحبه: أنا أثق فيك ثقة عمياء. قال له: طيب افتح عينك 👀😂',
            'المدرس: اكتب جملة فيها كلمة "بالرغم". الطالب: بالرغم أني ما ذاكرت، بالرغم نجحت 😅',
            'ليش السمكة ما تستخدم الواتساب؟ لأنها تخاف من الشبكة 🎣😂',
            'قالوا للبطارية: كيف حالك؟ قالت: على وشك 🔋😂',
            'واحد اشترى مروحة سقف، رجع يشتكي: ما تشتغل! قالوا له: طيب ركّبها. قال: وين؟ في السقف؟ 😂',
            'المدير: ليش تأخرت؟ الموظف: الطريق زحمة. المدير: وأمس؟ الموظف: نفس الطريق 🚗😂',
            'سألوا الإنترنت: وش أكثر شي يضايقك؟ قال: لما يقولون "الشبكة ضعيفة" وأنا شغال 📶😂',
            'واحد يقول لصاحبه: عندي فكرة مليون دولار! قال له: وش هي؟ قال: أحتاج مليون دولار عشان أنفذها 💸😂',
            'ليش القهوة راحت للشرطة؟ لأنها انسرقت منها النومة ☕😂',
            'الطالب للمدرس: هل تعاقبني على شيء لم أفعله؟ المدرس: طبعاً لا. الطالب: طيب أنا ما حليت الواجب 📚😂',
            'يونو لأستا: أنا هادئ دائماً. أستا: وأنا صوتي عالي دائماً، وكل واحد له سحره 🍀😂',
            'قال البرنامج للمستخدم: حدّثني. قال المستخدم: بعدين. وبعد سنة ما زال "بعدين" 🔄😂',
            'واحد دخل مكتبة وقال: أبغى كتاب عن الصبر. البائع: خلّصنا، تعال بعد سنة 📖😂',
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
            { q: 'نحن لا نفوز لأننا أقوياء، بل لأننا لا نعرف كلمة استسلام.', from: 'أستا - Black Clover' },
            { q: 'الأمل شيء لا يموت أبداً.', from: 'يونو - Black Clover' },
            { q: 'تجاوز حدودك، ثم تجاوزها مرة أخرى.', from: 'يامي - Black Clover' },
            { q: 'عندما تسقط، انهض بسرعة أكبر مما سقطت.', from: 'أستا - Black Clover' },
            { q: 'لا يوجد شيء اسمه مستحيل، يوجد فقط من لم يحاول بما يكفي.', from: 'ميريليونا - Black Clover' },
            { q: 'القائد الحقيقي يحمل أحلام من خلفه لا سيفه فقط.', from: 'فويغوليون - Black Clover' },
            { q: 'الشخص الذي لا يعرف الفشل لا يعرف قيمة النجاح.', from: 'ناروتو - Naruto' },
            { q: 'من يخالف القوانين حثالة، لكن من يتخلى عن رفاقه أسوأ من الحثالة.', from: 'كاكاشي - Naruto' },
            { q: 'البطل الحقيقي هو من يصنع أبطالاً بعده.', from: 'جيرايا - Naruto' },
            { q: 'السلام لا يأتي بالانتظار، بل بمن يصنعه.', from: 'ناغاتو - Naruto' },
            { q: 'سأصبح ملك القراصنة!', from: 'لوفي - One Piece' },
            { q: 'عندما يموت الإنسان حقاً؟ حين ينساه الجميع.', from: 'دكتور هيلوك - One Piece' },
            { q: 'إذا كنت لا تخاطر، فلا يمكنك خلق مستقبل.', from: 'لوفي - One Piece' },
            { q: 'الخسارة تعلّمك ما لا يعلّمه الفوز أبداً.', from: 'فيجيتا - Dragon Ball' },
            { q: 'كلما ازداد الخصم قوة، ازداد حماسي.', from: 'غوكو - Dragon Ball' },
            { q: 'لا تندم على اختيارك، فقط اجعله صحيحاً.', from: 'ليفاي - Attack on Titan' },
            { q: 'إذا لم تضحِّ بشيء، فلن تحصل على شيء.', from: 'أرمين - Attack on Titan' },
            { q: 'القلب المنكسر لا يعني الاستسلام، بل بداية جديدة.', from: 'تانجيرو - Demon Slayer' },
            { q: 'أشعل قلبك، وتجاوز حدودك.', from: 'رينغوكو - Demon Slayer' },
            { q: 'حتى الضعيف يمكنه إنقاذ شخص ما.', from: 'ميدوريا - My Hero Academia' },
            { q: 'لا بأس الآن، لأنني هنا!', from: 'أول مايت - My Hero Academia' },
            { q: 'الأقوى لا يشك في نفسه أبداً.', from: 'غوجو - Jujutsu Kaisen' },
            { q: 'العمل الجاد لا يخون صاحبه أبداً.', from: 'نانامي - Jujutsu Kaisen' },
            { q: 'لكل شيء ثمن، ولا شيء يُمنح مجاناً.', from: 'إدوارد إلريك - Fullmetal Alchemist' },
            { q: 'الوقوف مرة أخرى بعد كل سقوط هو تعريف القوة.', from: 'سايتاما - One Punch Man' },
            { q: 'الصداقة الحقيقية لا تحتاج سحراً لتدوم.', from: 'ناتسو - Fairy Tail' },
            { q: 'الخوف ليس عدوك، بل دليلك على أنك تهتم.', from: 'زينيتسو - Demon Slayer' },
            { q: 'العلم لا يخذل من يؤمن به.', from: 'سينكو - Dr. Stone' },
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        await sock.sendMessage(chatId, {
            text: `💬 *اقتباس أنمي*\n\n"${quote.q}"\n\n— ${quote.from} 🍀`
        }, { quoted: msg });
        return;
    }
};
