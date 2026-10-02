<div align="center">

# ⚔️ أستا — بوت واتساب | Asta WhatsApp Bot 🍀

**بوت واتساب عربي مستوحى من عالم Black Clover — أوامر، ألعاب، حماية مجموعات، كشف الرسائل المحذوفة *والمعدَّلة*، ولوحة تحكم ويب.**

*An Arabic-first WhatsApp bot inspired by Black Clover — commands, games, group moderation, deleted **and edited** message detection, and a web control panel.*

[![Repo](https://img.shields.io/badge/GitHub-yswef%2Fw--bot-181717?logo=github)](https://github.com/yswef/w-bot)
[![Node](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Baileys](https://img.shields.io/badge/Baileys-6.x-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)

🔗 **المستودع / Repository:** https://github.com/yswef/w-bot

</div>

---

## 📑 المحتويات | Table of contents

- [نظرة سريعة / Overview](#-نظرة-سريعة--overview)
- [تحذير مهم / Important warning](#️-تحذير-مهم--important-warning)
- [التشغيل في 5 دقائق / Quick start](#-التشغيل-في-5-دقائق--quick-start-in-5-minutes)
- [لوحة التحكم / Control panel](#️-لوحة-التحكم--control-panel)
- [أوامر الصيانة في الطرفية / Terminal maintenance commands](#️-أوامر-الصيانة-في-الطرفية--terminal-maintenance-commands)
- [كيف أعرض قائمة الأوامر؟ / How to see the commands](#-كيف-أعرض-قائمة-الأوامر--how-to-see-the-command-list)
- [كل الأوامر / All commands](#-كل-الأوامر--all-commands)
- [الميزات التلقائية / Automatic features](#-الميزات-التلقائية--automatic-features)
- [كشف الرسائل المعدَّلة / Edited message detection](#️-كشف-الرسائل-المعدَّلة--edited-message-detection)
- [الإعدادات / Configuration](#-الإعدادات--configuration)
- [النشر / Deployment](#-النشر--deployment)
- [بنية المشروع / Project structure](#-بنية-المشروع--project-structure)
- [استكشاف الأخطاء / Troubleshooting](#-استكشاف-الأخطاء--troubleshooting)
- [المطوّر / Developer](#-المطوّر--developer)

---

## 🍀 نظرة سريعة | Overview

**بالعربية:** أستا بوت واتساب مبني على مكتبة [Baileys](https://github.com/WhiskeySockets/Baileys) وقاعدة بيانات SQLite محلية. يعمل كرفيق لمجموعاتك: يلعب معك، يحرس المجموعة من الروابط والمشاغبين، يرحّب بالأعضاء الجدد، يحوّل صورك لملصقات، يكشف الرسائل المحذوفة **والمعدَّلة**، ويعطيك لوحة تحكم ويب لمتابعة كل شيء.

**In English:** Asta is a WhatsApp bot built on [Baileys](https://github.com/WhiskeySockets/Baileys) with a local SQLite database. It plays games with your group, blocks links and troublemakers, welcomes new members, turns your photos into stickers, reveals deleted **and edited** messages, and ships with a web dashboard to watch it all.

| | |
|---|---|
| 🧩 **الأوامر / Commands** | 71 أمر موزّعة على 8 فئات |
| 🌸 **شخصيات الأنمي / Characters** | 145 شخصية بصور ومقولات (33 من بلاك كلوفر) |
| 🎮 **أسئلة الألعاب / Trivia** | 45 سؤال + 164 اسم لفعالية تفكيك الحروف |
| ✏️ **كشف التعديل / Anti-edit** | يعرض نص الرسالة *قبل وبعد* التعديل |
| 🗑️ **كشف الحذف / Anti-delete** | يعيد إرسال الرسائل والوسائط المحذوفة |
| 🖥️ **لوحة التحكم / Dashboard** | محمية برمز وصول، مع رمز QR للربط |

---

## ⚠️ تحذير مهم | Important warning

> **بالعربية:** البوت يستخدم مكتبة Baileys غير الرسمية، وهذا يخالف شروط استخدام واتساب وقد يعرّض الرقم للحظر. **استخدم رقماً تجريبياً وليس رقمك الأساسي.** المشروع لأغراض شخصية وتعليمية، لا تستخدمه للسبام أو البث التجاري الجماعي.
>
> **In English:** This bot uses the unofficial Baileys library, which violates WhatsApp's Terms of Service and may get the number banned. **Use a spare number, not your main one.** This project is for personal and educational use — do not use it for spam or mass commercial broadcasting.

---

## 🚀 التشغيل في 5 دقائق | Quick start in 5 minutes

### المتطلبات | Requirements
- **Node.js 20+** ([تحميل / download](https://nodejs.org))
- رقم واتساب تجريبي | A spare WhatsApp number

### الخطوات | Steps

```bash
# 1) استنساخ المستودع | Clone the repository
git clone https://github.com/yswef/w-bot.git
cd w-bot

# 2) تثبيت الحزم | Install dependencies
npm install

# 3) إنشاء ملف الإعدادات | Create your config file
cp .env.example .env
#    ثم عدّل OWNER_NUMBER برقمك | then set OWNER_NUMBER to your number

# 4) التشغيل | Run
npm start
```

### 5) الربط بواتساب | Link WhatsApp

بعد التشغيل سيظهر في الطرفية شيء مثل هذا:

```
──────────────────────────────────────────────────────────
🖥️  لوحة تحكم أستا جاهزة / Asta dashboard is ready
🔗  من نفس السيرفر / Local:   http://localhost:3000/?token=a1b2c3d4e5f6
🌐  من أي جهاز على الشبكة / Network: http://203.0.113.7:3000/?token=a1b2c3d4e5f6
🔑  رمز الوصول / Access token: a1b2c3d4e5f6
🩺  فحص سريع من طرفية السيرفر: curl -s http://localhost:3000/health
💡  السيرفر عام ولا تملك متصفحاً عليه؟ نفّذ من جهازك: ssh -L 3000:localhost:3000 user@SERVER_IP
──────────────────────────────────────────────────────────
```

ثم رمز QR في الطرفية. اختر أي طريقة للربط:

| الطريقة | الخطوات |
|---|---|
| 📱 **من الطرفية** | افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز ← امسح رمز QR الظاهر في الطرفية |
| 🖥️ **من المتصفح** | افتح الرابط المطبوع أعلاه ← تبويب **🔗 الاتصال / QR** ← امسح الرمز |
| 🖥️ **بطرفية أخرى على نفس السيرفر** | نفّذ `npm run qr` في أي وقت ليطبع الرمز ويتابع الحالة حتى يكتمل الربط |

عند نجاح الربط سترى: `✅ Connected to WhatsApp successfully.`

**In English:** After `npm start`, the terminal prints the dashboard URL (with its access token) and a QR code. Open WhatsApp → *Linked devices* → *Link a device*, then scan the QR either from the terminal or from the dashboard's **Connection / QR** tab.

---

## 🖥️ لوحة التحكم | Control panel

> ❓ **"شغّلت البوت وما عرفت كيف أوصل للوحة التحكم"** — هذا القسم يحلّ المشكلة.
> في النسخة السابقة كانت اللوحة **معطّلة بالكامل في الكود**؛ الآن تعمل تلقائياً وتطبع رابطها عند كل تشغيل.

### كيف أفتحها؟ | How do I open it?

هناك ثلاث طرق:

1. **من سجل التشغيل:** انسخ الرابط الكامل المطبوع عند بدء التشغيل (يتضمن رمز الوصول).
2. **من واتساب:** أرسل الأمر `.لوحة` من رقم المالك — سيردّ البوت بالرابط ورمز الوصول.
3. **يدوياً:** افتح `http://localhost:3000` وأدخل رمز الوصول في صفحة الدخول.

> 🔑 **رمز الوصول:** يُولَّد عشوائياً عند كل تشغيل. لتثبيته ضع `DASHBOARD_TOKEN=رمزك_السري` في ملف `.env`.
> 🔑 **Access token:** random on every run. Set `DASHBOARD_TOKEN=your_secret` in `.env` to keep it fixed.

### ماذا تعرض اللوحة؟ | What's inside?

| التبويب / Tab | المحتوى / Contents |
|---|---|
| 📊 نظرة عامة / Overview | 11 إحصائية حيّة + إرسال رسالة مباشرة |
| 🔗 الاتصال / Connection | حالة كل جلسة + رمز QR للربط + زر **♻️ إعادة ربط** لكل جلسة |
| ✏️ الرسائل المعدَّلة / Edited | كل رسالة عُدِّلت بنصها **قبل وبعد** |
| 🗑️ الرسائل المحذوفة / Deleted | أرشيف الرسائل المحذوفة |
| 💬 المحادثات / Chats | آخر المحادثات وآخر رسالة في كل منها |
| 🤖 الردود التلقائية / Auto-replies | إضافة وحذف الردود بدون كود |
| 😀 التفاعلات / Reactions | تفاعلات إيموجي تلقائية على كلمات معينة |
| 🚫 المحظورون / Bans | قائمة الحظر مع إمكانية الرفع |
| ⏰ التذكيرات / Reminders | التذكيرات المعلّقة |

اللوحة محمية برمز وصول، وتوفّر نقطة `/health` مفتوحة لفحص الصحة على منصات الاستضافة.

---

## 🛠️ أوامر الصيانة في الطرفية | Terminal maintenance commands

> ❓ **ظهر لك `Logged out. Delete session default or use reconnect command.` فسألت: ما هو أمر إعادة الاتصال؟**
> `reconnect` **ليس أمر نظام (bash)** — بل هو أمر داخل واتساب (`.اعادةربط`)، والمفارقة أن البوت المقطوع لا يستقبل أوامر أصلاً! لذلك هذه الأوامر تعمل من طرفية السيرفر دائماً:

| الأمر | ماذا يفعل |
|---|---|
| `npm run reconnect` | ♻️ إعادة ربط الجلسة: يحذف بيانات الربط المنتهية ويطلب رمز QR جديد. وإن كانت اللوحة شغّالة ينفّذها فوراً عبر `/api/reconnect` **بدون إعادة تشغيل البوت** |
| `npm run reconnect -- mysession` | إعادة ربط جلسة محددة بالاسم |
| `npm run reconnect -- --all` | إعادة ربط كل الجلسات المضبوطة في `SESSION_NAMES` |
| `npm run reconnect -- --start` | احذف البيانات ثم شغّل البوت في نفس الطرفية فوراً |
| `npm run reconnect -- --disk` | احذف من القرص مباشرة (بدون محاولة اللوحة) |
| `npm run sessions` | 🧩 حالة الجلسات (متصل / بانتظار QR / خرج) + هل بيانات الربط موجودة على القرص |
| `npm run qr` | 📱 اطبع رمز QR داخل الطرفية وتابع الحالة حتى يكتمل الربط (مثالي للسيرفر العام بلا متصفح) |
| `npm run port` | 🔌 من يحجز منفذ اللوحة؟ يطبع PID والأمر الكامل و`kill` الجاهز، ويجد اللوحة لو انتقلت تلقائياً لمنفذ بديل |

### التعافي التلقائي من loggedOut | Automatic recovery

عندما يُنهي واتساب الجلسة (`statusCode 401`) يحذفها البوت تلقائياً ويطبع رمز QR جديداً بدون أي تدخل منك، مع شرح الأمر اليدوي في السجل:

| المتغيّر | الافتراضي | الوصف |
|---|---|---|
| `AUTO_RESET_ON_LOGOUT` | `true` | إعادة الضبط التلقائية بعد تسجيل الخروج |
| `AUTO_RESET_MAX_ATTEMPTS` | `5` | أقصى عدد محاولات (حتى لا ندور في حلقة مع رقم محظور) |
| `AUTO_RESET_COOLDOWN_MS` | `60000` | المهلة بين محاولتين بالميلي ثانية |

### السيرفر عام — كيف أصل إلى اللوحة؟ | Reaching the panel on a public server

1. **نفق SSH (الأسهل والأأمن):** من جهازك نفّذ `ssh -L 3000:localhost:3000 user@SERVER_IP` ثم افتح `http://localhost:3000/?token=...`
2. **فتح المنفذ:** `sudo ufw allow 3000/tcp` + فتح المنفذ من لوحة مزوّد الاستضافة، ثم `http://SERVER_IP:3000/?token=...`
3. **بدون متصفح إطلاقاً:** `npm run qr` يطبع رمز الربط في الطرفية مباشرة.

> ⚠️ لا تفتح المنفذ للإنترنت بدون `DASHBOARD_TOKEN` ثابت وقوي في `.env`.

---

## 📖 كيف أعرض قائمة الأوامر؟ | How to see the command list

> ❓ **"ما عرفت كيف أخلّيه يرسل قوائم الأوامر"** — أضفنا أربع طرق، أي واحدة تكفي:

| الطريقة | مثال |
|---|---|
| 1️⃣ أمر المساعدة | `.مساعدة` |
| 2️⃣ البادئة وحدها | أرسل `.` فقط |
| 3️⃣ كلمة عادية بدون بادئة | اكتب `اوامر` أو `menu` |
| 4️⃣ خطأ إملائي | اكتب `.انمى` فيقترح عليك `.انمي` تلقائياً |

ثم تصفّح الفئات:

```
.مساعدة           ← القائمة الرئيسية (الفئات)
.مساعدة انمي      ← أوامر الأنمي فقط
.مساعدة العاب     ← الألعاب فقط
.مساعدة مجموعات   ← إدارة المجموعات
.مساعدة الكل      ← كل الأوامر دفعة واحدة
```

**In English:** send `.مساعدة` (or just `.`, or the plain word `menu`) to get the categorised command menu; `.مساعدة all` prints everything. Typos get a "did you mean…?" suggestion.

---

## 📜 كل الأوامر | All commands

> 📌 البادئة الافتراضية هي النقطة `.` ويمكن تغييرها من `COMMAND_PREFIX` في `.env`.
> 🛡️ = يحتاج صلاحية مشرف مجموعة · 👑 = يحتاج صلاحية مالك البوت

### 🌸 الأنمي والترفيه — Anime & Fun

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.انمي` <br><sub>.anime</sub> | شخصية أنمي عشوائية مع صورتها ومقولتها | Random anime character with image & quote | — |
| `.زوج` | شريك حياة سحري (شخصية ذكر) | Random male character as your partner | — |
| `.زوجة` | شريكة حياة سحرية (شخصية أنثى) | Random female character as your partner | — |
| `.شخصية <اسم>` <br><sub>.character</sub> | ابحث عن شخصية معيّنة بالاسم | Search a character by name | — |
| `.شخصيات` <br><sub>.characters</sub> | عدد الشخصيات المتاحة وتوزيعها | Roster size and breakdown | — |
| `.اقتباس` <br><sub>.quote</sub> | مقولة فخمة من عالم الأنمي | Random anime quote | — |
| `.نكتة` <br><sub>.joke</sub> | نكتة عشوائية | Random joke | — |
| `.حب @شخص1 @شخص2` <br><sub>.love</sub> | نسبة التوافق بين شخصين | Love compatibility percentage | — |
| `.انميات` <br><sub>.موسم</sub> | أنميات الموسم الحالي | Current season anime list | — |
| `.بحث-انمي <اسم>` <br><sub>.searchanime</sub> | تفاصيل أي أنمي | Search anime details | — |
| `.نشرة-انمي` | جدولة نشرة أنمي دورية للمجموعة | Schedule a recurring anime newsletter | 🛡️ مشرف / Admin |
| `.إيقاف-نشرة` | إيقاف نشرة الأنمي | Stop the anime newsletter | 🛡️ مشرف / Admin |
| `.lastseen` <br><sub>.آخرمرة · .آخر-مرة</sub> | آخر ظهور لمستخدم في المحادثة | Last seen time for a user | — |

### 🎮 الألعاب — Games

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.لعبة` <br><sub>.game</sub> | قائمة الألعاب المتاحة | List available games | — |
| `.حجر` <br><sub>.ورقه · .مقص</sub> | حجر ورقة مقص ضد البوت | Rock paper scissors vs the bot | — |
| `.تخمين` | ابدأ لعبة تخمين رقم بين 1 و20 | Start the number guessing game | — |
| `.اخمن <رقم>` | أرسل تخمينك للرقم السري | Submit your guess | — |
| `.سؤال` <br><sub>.trivia</sub> | سؤال معلومات أنمي — أجب مباشرة بالدردشة | Anime trivia — answer directly in chat | — |
| `.كشف` <br><sub>.reveal</sub> | اكشف إجابة السؤال النشط | Reveal the active trivia answer | — |
| `.جواب <إجابتك>` <br><sub>.answer</sub> | إرسال إجابة للسؤال أو الفعالية النشطة | Submit an answer to the active question/event | — |
| `.فعالية <عدد الجولات>` <br><sub>.تفكيك · .event</sub> | فعالية تفكيك حروف جماعية (حتى 20 جولة) | Group word-scramble event (up to 20 rounds) | 🛡️ مشرف / Admin |
| `.تخطي` <br><sub>.skip</sub> | تخطي الجولة الحالية في الفعالية | Skip the current event round | 🛡️ مشرف / Admin |
| `.ايقاف_فعالية` | إنهاء الفعالية وعرض لوحة الصدارة | End the event and show the scoreboard | 🛡️ مشرف / Admin |
| `.سلسلة` | لعبة سلسلة الحروف | Word chain game | — |

### 🕌 إسلامية — Islamic

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.آية` <br><sub>.aaya</sub> | آية قرآنية كريمة عشوائية | Random Quran verse | — |
| `.ذكر` <br><sub>.thikr</sub> | ذكر من الأذكار اليومية | Random daily remembrance | — |
| `.جدول-آية <وقت>` | جدولة آية يومية للمجموعة | Schedule a daily verse | 🛡️ مشرف / Admin |
| `.جدول-ذكر <وقت>` | جدولة ذكر يومي للمجموعة | Schedule a daily remembrance | 🛡️ مشرف / Admin |
| `.إيقاف-جدول` | إيقاف الجداول الإسلامية | Stop Islamic schedules | 🛡️ مشرف / Admin |

### 🧰 أدوات مفيدة — Utilities

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.ping` | فحص سرعة استجابة البوت | Check bot latency | — |
| `.مساعدة [الفئة]` <br><sub>.help · .info · .اوامر · .الاوامر · .أوامر · .menu · .commands</sub> | عرض قائمة الأوامر (أو فئة محددة) | Show the command list (or one category) | — |
| `.سعر <مبلغ> <من> <إلى>` <br><sub>.currency</sub> | محوّل عملات بسعر حي | Live currency converter | — |
| `.ترجم <لغة> <نص>` <br><sub>.translate</sub> | ترجمة نص أو رسالة مقتبسة | Translate text or a quoted message | — |
| `.طقس <مدينة>` <br><sub>.weather</sub> | حالة الطقس لأي مدينة | Weather for any city | — |
| `.ويكي <كلمة>` <br><sub>.wiki</sub> | ملخّص من ويكيبيديا | Wikipedia summary | — |
| `.استطلاع <سؤال>|<خيار>|<خيار>` <br><sub>.poll</sub> | إنشاء استطلاع واتساب أصلي | Create a native WhatsApp poll | — |
| `.تذكير <وقت> <نص>` <br><sub>.reminder · .remind</sub> | ذكّرني برسالة بعد مدة محددة | Set a reminder | — |
| `.ايدي` <br><sub>.myid · .whoami · .معرفي</sub> | عرض معرّفك وصلاحياتك | Show your JID and permissions | — |
| `.تواصل` <br><sub>.المطور · .developer · .contact</sub> | التواصل مع مطوّر البوت | Contact the developer | — |

### 🖼️ الوسائط والملصقات — Media & Stickers

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.ملصق` <br><sub>.sticker</sub> | تحويل صورة/فيديو إلى ملصق | Convert an image/video to a sticker | — |
| `.سرقة` <br><sub>.steal</sub> | سرقة ملصق موجود بردّك عليه | Steal an existing sticker | — |

### 🛡️ إدارة المجموعات — Group Admin

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.طرد @عضو` <br><sub>.kick</sub> | طرد عضو من المجموعة | Remove a member | 🛡️ مشرف / Admin |
| `.ترقية @عضو` <br><sub>.promote</sub> | ترقية عضو إلى مشرف | Promote a member to admin | 🛡️ مشرف / Admin |
| `.تخفيض @مشرف` <br><sub>.demote</sub> | تخفيض مشرف إلى عضو | Demote an admin | 🛡️ مشرف / Admin |
| `.قفل` <br><sub>.lock</sub> | قفل المجموعة (المشرفون فقط يرسلون) | Lock the group | 🛡️ مشرف / Admin |
| `.فتح` <br><sub>.unlock</sub> | فتح المجموعة للجميع | Unlock the group | 🛡️ مشرف / Admin |
| `.الكل <رسالة>` <br><sub>.all · .احية</sub> | منشن ظاهر لجميع الأعضاء | Mention everyone (visible) | 🛡️ مشرف / Admin |
| `.تنبيه <رسالة>` | منشن مخفي للجميع بدون قائمة @ | Hidden mention for everyone | 🛡️ مشرف / Admin |
| `.همسة <رسالة>` <br><sub>.منشن</sub> | منشن مخفي لعضو واحد (بالرد عليه) | Hidden mention for one member | 🛡️ مشرف / Admin |
| `.منع-الروابط [ايقاف]` <br><sub>.antilink</sub> | حذف أي رابط يُنشر في المجموعة | Auto-delete links | 🛡️ مشرف / Admin |
| `.ضد_التعديل [ايقاف|حالة]` <br><sub>.antiedit · .ضد-التعديل</sub> | كشف الرسائل المعدَّلة وإظهار نصها قبل وبعد | Reveal edited messages (before & after) | 🛡️ مشرف / Admin |
| `.ترحيب [رسالة|ايقاف]` <br><sub>.welcome</sub> | بطاقة ترحيب تلقائية للأعضاء الجدد | Auto welcome card for new members | 🛡️ مشرف / Admin |
| `.معلومات-مجموعة` <br><sub>.groupinfo</sub> | تفاصيل وإحصائيات المجموعة | Group details and stats | 🛡️ مشرف / Admin |
| `.جدولة <قفل|فتح|اذكار>` | جدولة مهام تلقائية للمجموعة | Schedule automatic group tasks | 🛡️ مشرف / Admin |
| `.تفعيل-بوت` | تفعيل البوت في هذه المحادثة | Enable the bot in this chat | 🛡️ مشرف / Admin |
| `.إيقاف-بوت` | إيقاف البوت في هذه المحادثة | Disable the bot in this chat | 🛡️ مشرف / Admin |

### 🕵️ المراقبة والسجلات — Monitoring & Logs

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.تعديلات [عدد]` <br><sub>.edits</sub> | آخر الرسائل المعدَّلة (أو رُدَّ على رسالة لسجلها) | Recent edited messages (or reply to one) | — |
| `.محذوفات [عدد]` <br><sub>.deleted</sub> | آخر الرسائل المحذوفة في المحادثة | Recent deleted messages | — |

### 👑 أوامر المالك — Owner

| الأمر / Command | الوصف بالعربية | Description | الصلاحية / Role |
|---|---|---|---|
| `.لوحة` <br><sub>.dashboard · .panel</sub> | رابط لوحة التحكم مع رمز الوصول | Dashboard link with access token | 👑 مالك / Owner |
| `.احصائيات` <br><sub>.stats</sub> | إحصائيات البوت الكاملة | Full bot statistics | 👑 مالك / Owner |
| `.صيانة [on|off]` <br><sub>.maintenance</sub> | تفعيل/إيقاف وضع الصيانة | Toggle maintenance mode | 👑 مالك / Owner |
| `.رد <كلمة> <رد>` | إضافة رد تلقائي مخصص | Add a custom auto-reply | 👑 مالك / Owner |
| `.حذفرد <id>` | حذف رد تلقائي | Delete a custom auto-reply | 👑 مالك / Owner |
| `.تفاعل <كلمة> <إيموجي>` | إضافة تفاعل تلقائي على كلمة | Add an auto-reaction keyword | 👑 مالك / Owner |
| `.حذفتفاعل <id>` | حذف تفاعل تلقائي | Delete an auto-reaction | 👑 مالك / Owner |
| `.حظر @عضو` <br><sub>.ban</sub> | منع عضو من استخدام البوت | Ban a user from the bot | 👑 مالك / Owner |
| `.رفع-حظر @عضو` <br><sub>.unban</sub> | رفع الحظر عن عضو | Unban a user | 👑 مالك / Owner |
| `.المحظورين` <br><sub>.banlist</sub> | قائمة المحظورين | List banned users | 👑 مالك / Owner |
| `.بث <رسالة>` | إرسال رسالة لكل المجموعات | Broadcast to all groups | 👑 مالك / Owner |
| `.جلسات` | حالة جلسات الاتصال | Session connection status | 👑 مالك / Owner |
| `.اعادةربط [اسم الجلسة]` <br><sub>.reconnect</sub> | إعادة ربط جلسة واتساب | Re-link a WhatsApp session | 👑 مالك / Owner |

---

## ✅ الميزات التلقائية | Automatic features

تعمل هذه الميزات بدون أي أمر:

| الميزة / Feature | الوصف بالعربية | Description |
|---|---|---|
| ✏️ كشف التعديل | يعرض نص الرسالة قبل وبعد التعديل ويسجّله | Shows message text before & after an edit |
| 🗑️ كشف الحذف | يعيد إرسال الرسائل والوسائط المحذوفة | Re-sends deleted messages and media |
| 🤖 ردود آلية | ردود على كلمات مفتاحية (في الخاص والمجموعات) | Keyword auto-replies in DMs and groups |
| 😀 تفاعلات آلية | إيموجي تلقائي على كلمات محددة | Automatic emoji reactions on keywords |
| 🎉 ترحيب تلقائي | بطاقة ترحيب مصمّمة للأعضاء الجدد | Designed welcome card for new members |
| 🛡️ منع الروابط | حذف أي رابط يُنشر في المجموعة | Auto-delete links posted in the group |
| 🚫 نظام الحظر | منع مستخدمين محددين من البوت | Ban specific users from using the bot |
| 🎮 التقاط الإجابات | الإجابة على الأسئلة والفعاليات مباشرة بالدردشة | Answer trivia/events directly in chat |
| ⏰ المهام المجدولة | آيات وأذكار ونشرات أنمي وتذكيرات | Scheduled verses, athkar, anime news, reminders |
| 🖼️ تخزين مسبق للصور | تحميل صور الشخصيات مسبقاً عند الإقلاع | Character images pre-fetched at startup |
| 📱 تنفيذ ذاتي | تنفيذ الأوامر المرسلة من رقم البوت نفسه | Commands sent from the bot's own number run too |

---

## ✏️ كشف الرسائل المعدَّلة | Edited message detection

> ❓ **"أشتي يظهر لي الرسائل المعدَّلة الي تم تعديلها"** — تم إصلاح هذه الميزة بالكامل.

### ما الذي كان مكسوراً؟ | What was broken?

| المشكلة | الحل |
|---|---|
| كان يعرض النص القديم فقط، ولا يُظهر النص الجديد إطلاقاً | صار يعرض **قبل وبعد** في رسالة واحدة واضحة |
| كان يلتقط شكلاً واحداً من أحداث التعديل (`messages.upsert`) | صار يلتقط الشكلين: `messages.upsert` و`messages.update` |
| تعديلات رقم البوت نفسه كانت تُتجاهل تماماً | صارت تُرصد أيضاً |
| لم يكن يُحفظ أي سجل للتعديل | صار يُحفظ في جدول `message_edits` ويظهر في لوحة التحكم |
| لم تكن هناك طريقة لإيقاف الميزة | صار هناك أمر `.ضد_التعديل` لكل محادثة |

### الشكل النهائي للتنبيه | What the alert looks like

```
✏️ تم تعديل رسالة!

👤 المُعدِّل: @967xxxxxxxxx

📝 قبل التعديل:
"النص الأصلي"

✨ بعد التعديل:
"النص الجديد"

⚔️ أستا لا ينسى ولا يتراجع!
```

### التحكم فيها | Controlling it

```
.ضد_التعديل           ← تفعيل الكشف في هذه المحادثة (مفعّل افتراضياً)
.ضد_التعديل ايقاف     ← إيقاف التنبيهات (يستمر التسجيل في لوحة التحكم)
.ضد_التعديل حالة      ← عرض الحالة الحالية
.تعديلات              ← آخر الرسائل المعدَّلة في المحادثة
.تعديلات              ← (بالرد على رسالة) سجل تعديلات تلك الرسالة بالذات
```

---

## ⚙️ الإعدادات | Configuration

كل الإعدادات في ملف `.env` (انسخه من `.env.example`):

| المتغيّر / Variable | الافتراضي | الوصف / Description |
|---|---|---|
| `COMMAND_PREFIX` | `.` | بادئة الأوامر / Command prefix |
| `OWNER_NUMBER` | — | رقم المالك بصيغة دولية بدون `+` / Owner number |
| `EXTRA_OWNER_NUMBERS` | — | أرقام مالكين إضافية مفصولة بفاصلة / Extra owners |
| `SECOND_ADMIN_NUMBER` | — | رقم الأدمن الثاني / Second admin |
| `DASHBOARD_TOKEN` | عشوائي | رمز الدخول للوحة التحكم / Dashboard token |
| `PORT` | `3000` | منفذ لوحة التحكم / Dashboard port |
| `DASHBOARD_PUBLIC_URL` | — | الرابط العام للوحة عند النشر / Public dashboard URL |
| `ENABLE_DASHBOARD` | `true` | تشغيل/إيقاف اللوحة / Toggle the dashboard |
| `SESSION_NAMES` | `default` | أسماء الجلسات مفصولة بفاصلة / Session names |
| `SESSION_BASE_DIR` | `./session` | مجلد حفظ الجلسات / Session storage folder |
| `AUTO_RESET_ON_LOGOUT` | `true` | حذف الجلسة تلقائياً وطباعة QR جديد بعد loggedOut / Auto re-link after logout |
| `AUTO_RESET_MAX_ATTEMPTS` | `5` | أقصى محاولات إعادة الضبط التلقائية / Max auto-reset attempts |
| `AUTO_RESET_COOLDOWN_MS` | `60000` | المهلة بين محاولتين / Cooldown between attempts |
| `TIMEZONE` | `Asia/Riyadh` | المنطقة الزمنية للجدولة / Scheduler timezone |
| `ENABLE_AUTO_REPLY` | `true` | الردود الآلية / Auto-replies |
| `ENABLE_ANTI_DELETE` | `true` | كشف الحذف / Anti-delete |
| `ENABLE_STICKER_MAKER` | `true` | صانع الملصقات / Sticker maker |
| `ENABLE_SCHEDULER` | `true` | المهام المجدولة / Scheduler |
| `ENABLE_SELF_EXECUTION` | `true` | تنفيذ أوامر رقم البوت / Self command execution |
| `STICKER_PACK_NAME` | — | اسم حزمة الملصقات / Sticker pack name |
| `STICKER_AUTHOR_NAME` | — | اسم مؤلف الملصقات / Sticker author |

### تخصيص الردود بدون كود | Customising replies without code

عدّل `src/responses.json` لتغيير شخصية البوت وردوده الجاهزة (رفض الصلاحيات، الصيانة، الأخطاء، التحيات)، أو استخدم لوحة التحكم / أمر `.رد` لإضافة ردود جديدة أثناء التشغيل.

---

## ☁️ النشر | Deployment

المشروع جاهز للنشر على **Railway** أو أي منصة تدعم Nixpacks (`nixpacks.toml` مرفق).

```bash
npm start   # أمر التشغيل / start command
```

### ⚠️ مشكلة الجلسة عند إعادة النشر | Session loss on redeploy

بيانات الربط تُحفظ في مجلد `session/`، وأغلب المنصات تمسح الملفات عند كل نشر — فتحتاج مسح QR من جديد وقد تظهر أخطاء `MessageCounterError` أو `Status 428`.

**الحلول / Solutions:**
1. **قرص دائم (Persistent Volume):** اربط مجلد الجلسة بقرص دائم واضبط `SESSION_BASE_DIR` عليه *(الأسهل والموصى به)*.
2. **تخزين الجلسة في قاعدة بيانات:** عدّل `src/sessionManager.js` لاستخدام `useMongoDBAuthState` مع MongoDB Atlas.

> 🚫 لا ترفع مجلد `session/` إلى GitHub أبداً — فهو يحتوي مفاتيح دخول حسابك (مستثنى في `.gitignore`).

### مكتبة canvas اختيارية | canvas is optional

مكتبة `canvas` (المستخدمة في بطاقة الترحيب المصوّرة) أصبحت ضمن `optionalDependencies`. إذا فشل بناؤها على منصتك، يكمل التثبيت ويعمل البوت بشكل طبيعي مع إرسال ترحيب نصي بدل البطاقة.

---

## 🗂️ بنية المشروع | Project structure

```
w-bot/
├── src/
│   ├── index.js                 # نقطة التشغيل (يشغّل اللوحة + الجلسات)
│   ├── config.js                # قراءة الإعدادات من .env
│   ├── sessionManager.js        # إدارة جلسات Baileys وحالة الاتصال وQR
│   ├── responses.json           # ردود البوت القابلة للتعديل بدون كود
│   ├── handlers/
│   │   ├── messageHandler.js    # توجيه كل رسالة واردة
│   │   ├── commandHandler.js    # سجل الأوامر + اقتراح "هل تقصد؟"
│   │   ├── editHandler.js       # ✏️ كشف الرسائل المعدَّلة
│   │   └── deleteHandler.js     # 🗑️ كشف الرسائل المحذوفة
│   ├── commands/
│   │   ├── registry.js          # 📖 سجل الأوامر (مصدر قائمة المساعدة)
│   │   ├── info.js              # قائمة المساعدة المولّدة تلقائياً
│   │   ├── fun.js               # 145 شخصية أنمي
│   │   ├── games.js             # الألعاب والأسئلة والفعاليات
│   │   ├── groupAdmin.js        # أوامر إدارة المجموعات
│   │   ├── history.js           # سجل التعديلات والحذف
│   │   ├── islamic.js           # الآيات والأذكار
│   │   ├── animeNews.js         # أخبار وبحث الأنمي
│   │   ├── extras.js            # عملات، ترجمة، استطلاعات، نكت
│   │   ├── utils.js             # طقس، ويكي، تفعيل/إيقاف البوت
│   │   ├── sticker.js           # صانع الملصقات
│   │   ├── reminder.js          # التذكيرات
│   │   ├── admin.js             # أوامر الإدارة والمالك
│   │   └── owner.js             # الصيانة والإحصائيات
│   ├── database/db.js           # SQLite: رسائل، تعديلات، حظر، ألعاب…
│   ├── scheduler/               # المهام المجدولة والتنظيف
│   ├── utils/                   # السجل، الردود، بطاقة الترحيب، مسارات الجلسات
│   └── web/
│       ├── app.js               # خادم لوحة التحكم + واجهة API (منها /api/reconnect)
│       └── index.html           # واجهة اللوحة
├── scripts/                     # 🛠️ أدوات الطرفية للصيانة
│   ├── reconnect.js             # npm run reconnect — إعادة ربط جلسة واتساب
│   ├── qr.js                    # npm run qr — طباعة رمز QR في الطرفية
│   ├── portinfo.js              # npm run port — من يحجز منفذ اللوحة؟
│   └── lib/dashboard.js         # عميل مشترك للتحدث مع اللوحة الشغّالة
├── test/                        # اختبارات (npm test)
├── .env.example                 # نموذج الإعدادات
└── nixpacks.toml                # إعدادات النشر
```

### الاختبارات | Tests

```bash
npm test
```

تغطي الاختبارات قاعدة البيانات، ومعالج الرسائل المعدَّلة (المسارين `upsert` و`update`، منع التكرار، حالة الإيقاف، وتعديلات رقم البوت نفسه)، وسجل الأوامر، ولوحة التحكم (الحماية برمز الوصول، `/health`، `/api/status`، `/api/reconnect`، والانتقال إلى منفذ بديل عند `EADDRINUSE`)، وسلوك الجلسات عند الانقطاع (إعادة الاتصال التلقائية، التعافي من `loggedOut`، منع التشغيل المكرر).

---

## 🔧 استكشاف الأخطاء | Troubleshooting

| المشكلة | السبب والحل |
|---|---|
| **`Logged out. Delete session default or use reconnect command.`** | واتساب أنهى الجلسة (401). `reconnect` ليس أمر bash — نفّذ `npm run reconnect` (أو احذف المجلد يدوياً: `rm -rf session/default && npm start`) ثم امسح رمز QR بـ `npm run qr`. افتراضياً يفعل البوت ذلك تلقائياً (`AUTO_RESET_ON_LOGOUT=true`). |
| **`تعذر تشغيل لوحة التحكم على المنفذ 8080: listen EADDRINUSE`** | منفذ اللوحة محجوز — غالباً نسخة قديمة من البوت ما زالت تعمل (ونسختان بنفس الجلسة = طرد من واتساب). نفّذ `npm run port` لمعرفة الـ PID وإيقافه، أو ثبّت منفذاً آخر بـ `PORT=3000` في `.env`. اللوحة الآن تنتقل تلقائياً إلى المنفذ التالي وتطبع رابطه. |
| **السيرفر عام ولا أستطيع فتح اللوحة** | استخدم نفق SSH: `ssh -L 3000:localhost:3000 user@SERVER_IP` ثم افتح `http://localhost:3000/?token=...`، أو افتح المنفذ (`sudo ufw allow 3000/tcp` + لوحة المزوّد)، أو اكتفِ بـ `npm run qr` في الطرفية. |
| **لا أجد لوحة التحكم** | الرابط يُطبع عند كل تشغيل، أو أرسل `.لوحة` من رقم المالك. تأكد أن `ENABLE_DASHBOARD` ليست `false`. |
| **اللوحة تطلب رمز وصول** | الرمز مطبوع في سجل التشغيل. ثبّته بوضع `DASHBOARD_TOKEN` في `.env`. |
| **البوت لا يرد على الأوامر** | تأكد من البادئة الصحيحة (`.` افتراضياً)، ومن أن البوت غير موقوف في المحادثة (`.تفعيل-بوت`)، ومن أنك غير محظور. |
| **البوت لا يرد في المجموعة فقط** | قد يكون موقوفاً هناك بأمر `.إيقاف-بوت` — فعّله بـ `.تفعيل-بوت`. |
| **لا تظهر الرسائل المعدَّلة** | تحقق بـ `.ضد_التعديل حالة`، وتذكّر أن الرسائل التي أُرسلت قبل تشغيل البوت لا يوجد لها نص قديم محفوظ. |
| **`Cannot derive from empty media key`** | رسائل قديمة من مزامنة السجل — يتجاهلها البوت تلقائياً، وهي غير ضارة. |
| **`MessageCounterError` / `Status 428`** | ضاعت ملفات الجلسة بعد النشر — راجع قسم [النشر](#️-النشر--deployment). |
| **فشل تثبيت `canvas`** | لا مشكلة، فهي اختيارية — سيعمل البوت ويرسل ترحيباً نصياً. |
| **أوامر الإدارة لا تعمل** | يجب أن يكون البوت **مشرفاً** في المجموعة. |

---

## 👨‍💻 المطوّر | Developer

<div align="center">

**ENG. YOUSEF** — *يوسف*

🌐 [engyusef.alpha-code.net](https://engyusef.alpha-code.net) · 💻 [github.com/yswef](https://github.com/yswef) · 📦 [github.com/yswef/w-bot](https://github.com/yswef/w-bot)

</div>

---

## 📜 الترخيص | License

هذا المشروع شخصي — إذا رغبت باستخدامه أو تطويره، تواصل مع مالك المشروع أولاً.
This is a personal project — please contact the owner before using or redistributing it.

---

<div align="center">

🍀 **تجاوز حدودك هنا والآن!** 🍀

*Surpass your limits, right here, right now!*

</div>
