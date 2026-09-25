<div dir="rtl">

# ⚔️ أستا ساما — بوت واتساب + لوحة تحكم / Asta Sama WhatsApp Bot

> "حتى لو لم أكن أمتلك سحراً، سأصبح إمبراطور السحر!" 🍀
> *"I don't have magic, but I'll become the Wizard King!"*

بوت واتساب عربي مستوحى من عالم **Black Clover**، مبني على مكتبة **Baileys** (بدون API رسمي وبدون أي اشتراك)، ويتضمّن **لوحة تحكم ويب** لإدارة الردود ومتابعة الرسائل وحالة الجلسات.

An Arabic-first WhatsApp bot inspired by **Black Clover**, built on **Baileys** (no official API, no subscription), and it ships with a **web dashboard** to manage auto-replies, browse logged messages, and watch session status.

| | |
|---|---|
| 🧩 لوحة التحكم / Dashboard | **مضمّنة وتعمل تلقائياً** — التفاصيل في [قسم اللوحة](#-لوحة-التحكم--dashboard-اقرأ-هذا-أولاً) |
| 💰 التكلفة / Cost | مجاني 100% — Free |
| 🗄️ قاعدة البيانات / DB | SQLite (`bot.db`) — بدون سيرفر خارجي |
| ☁️ النشر / Deploy | Railway / Render / أي VPS — Nixpacks جاهز |
| 🌍 اللغات / Languages | أوامر عربية + أسماء بديلة إنجليزية لكل أمر |

</div>

---

## 📑 المحتوى / Table of Contents

1. [⚠️ اقرأ قبل الاستخدام / Read before using](#-اقرأ-قبل-الاستخدام--read-before-using)
2. [✨ كل المميزات / All Features](#-كل-المميزات--all-features)
3. [🧩 لوحة التحكم — كيف تصل للرابط (Railway)](#-لوحة-التحكم--dashboard-اقرأ-هذا-أولاً)
4. [⌨️ مرجع الأوامر الكامل / Full Command Reference](#-مرجع-الأوامر-الكامل--full-command-reference)
5. [🔐 الصلاحيات / Roles & Permissions](#-الصلاحيات--roles--permissions)
6. [⚙️ كل متغيرات البيئة / All Environment Variables](#-كل-متغيرات-البيئة--environment-variables)
7. [🚀 التشغيل محلياً / Running Locally](#-التشغيل-محلياً--running-locally)
8. [☁️ النشر على Railway / Deploying to Railway](#-النشر-على-railway--step-by-step)
9. [💾 بقاء الجلسة والبيانات / Persisting Session & Data](#-بقاء-الجلسة-والبيانات-على-railway--session--data-persistence)
10. [📡 واجهة API للوحة / Dashboard REST API](#-واجهة-api-الخاصة-باللوحة--dashboard-rest-api)
11. [🩺 حل المشاكل / Troubleshooting](#-حل-المشاكل--troubleshooting)
12. [🗂️ بنية المشروع / Project Structure](#-بنية-المشروع--project-structure)
13. [🛠️ كيف تضيف أمراً جديداً / Adding a Command](#-كيف-تضيف-أمراً-جديداً--adding-a-new-command)
14. [🧠 ملخّص ذكي للمشروع / AI Summary](#-ملخّص-ذكي-للمشروع-ai-summary)

---

## 🆕 ما الذي تغيّر في هذا التحديث / What changed

<div dir="rtl">

| التغيير | التفصيل |
|---|---|
| ✅ **تشغيل لوحة التحكم** | كانت معطّلة (استدعاء معلّق بالتعليقات في `src/index.js` و `src/sessionManager.js`) — الآن تُشغَّل تلقائياً وتطبع الرابط العام في السجلات |
| ✅ **أمر `!لوحة`** | كان موجوداً في الكود وغير مسجَّل في `commandHandler.js`، وكان يطبع `localhost:3000` دائماً — الآن مسجّل (`!لوحة` / `!dashboard` / `!link`) ويطبع الرابط الحقيقي + التوكن |
| ✅ **حماية التوكن** | `DASHBOARD_TOKEN` مع مقارنة زمنية ثابتة (timing-safe)، كوكي، و`Authorization: Bearer` |
| ✅ **QR من المتصفح** | تبويب "ربط واتساب" يعرض رمز QR مرسوماً يتجدد تلقائياً + زر إعادة ربط — لا حاجة للبحث في سجلات Railway |
| ✅ **إصلاح حلقة استيراد** | `commands/admin.js` كان يستورد `sessionManager` أعلا الملف → `resetSession` و`getActiveSessionNames` تساويان `undefined` فتفشل `!جلسات` و`!اعادةربط`. أُضيف `src/runtimeState.js` و`src/sessionPaths.js` |
| ✅ **أوامر كانت ميتة** | `!ضد_التعديل` (مُسجَّل بلا تنفيذ) صار يعمل ويُفعّل/يوقف كشف التعديل لكل مجموعة؛ `!أفكاري` صار يعرض قائمة الألعاب |
| ✅ **لوحة أغنى** | إحصائيات، سجل رسائل مع بحث، ردود، تفاعلات، حظر، تذكيرات، جداول، وضع صيانة، حالة الجلسات، تبديل عربي/إنجليزي |
| ✅ **بقاء البيانات تلقائياً** | البوت يكتشف `RAILWAY_VOLUME_MOUNT_PATH` (من Railway) وينقل إليه الجلسة و`bot.db` والوسائط، مع `SESSION_BASE_DIR`/`DB_PATH`/`MEDIA_STORE_DIR` للتجاوز اليدوي، و`!جلسات` يطبع المسارات ومصادرها |
| ✅ **دعم Railpack** | أُضيف `railpack.json` لأن Railway جعلته المبني الافتراضي وهو **لا يقرأ** `nixpacks.toml` |
| ✅ **`ffmpeg` على Railway** | أُضيف لـ `nixpacks.toml` (بدونه تفشل ملصقات الفيديو/GIF المتحركة بخطأ `ffmpeg not found`) |
| ✅ **توثيق** | ملف `.env.example` كامل (كل المتغيرات)، قائمة أوامر `!مساعدة` محدّثة، وهذا README عربي + إنجليزي |

> ⚠️ **بعد سحب التحديث على Railway:** عدَّل **Variables** (أضِف `DASHBOARD_TOKEN`) ثم **Trigger Redeploy**، وبعدها توليد/تأكيد النطاق العام كما هو موضح أدناه.

</div>

> **EN:** The dashboard is now actually started (it was commented out), `!لوحة` is registered and prints the real public URL instead of `localhost:3000`, token auth + a browser-rendered QR code + reconnect button were added, a circular-import bug that silently broke `!جلسات` / `!اعادةربط` was fixed, two dead command aliases now work, and `ffmpeg` was added to `nixpacks.toml` for animated stickers. After pulling: set `DASHBOARD_TOKEN` in Railway **Variables**, redeploy, then generate/confirm the public domain.

---

## ⚠️ اقرأ قبل الاستخدام / Read before using

<div dir="rtl">

- البوت يستخدم **Baileys** وهي مكتبة **غير رسمية** تخالف شروط استخدام واتساب → **قد يُحظر الرقم**.
- **استخدم رقم تجربي** (شريحة ثانية/رقم احتياطي) وليس رقمك الأساسي أبداً.
- لا تستخدمه للسبام أو البث التجاري الجماعي؛ الفكرة للمجموعات الشخصية والتعليم.
- كل رسالة واردة تُخزَّن في ملف `bot.db` المحلي — اعتبره بيانات حساسة.

</div>

> **EN:** The bot uses **Baileys**, an **unofficial** library that violates WhatsApp's terms — **your number can be banned**. Use a **spare/test number**, never your main number, and don't use it for spam. Every incoming message is stored in `bot.db`, so treat that file as sensitive.

---

## ✨ كل المميزات / All Features

<div dir="rtl">

### 🧠 التسجيل والاسترجاع
- **تسجيل كل الرسائل** (نص + وسائط) في SQLite مع الوقت والمرسل ونوع الرسالة.
- **استرجاع الرسائل المحذوفة**: إذا حذف أحدهم رسالته بـ"حذف لدى الجميع"، يعيد أستا نشر النص + الوسائط.
- **كشف تعديل الرسائل**: يكشف النص الأصلي للرسالة المعدّلة (`!ضد_التعديل off` لإيقافه لكل مجموعة).
- **تتبّع آخر ظهور** لكل عضو في كل محادثة (`!lastseen`).
- **تنزيل وحفظ الوسائط** في `media_store/` مع تنظيف تلقائي للملفات الأقدم من 24 ساعة (4 صباحاً).

### 🤖 الردود التلقائية
- **ردود آلية جاهزة** (سلام، صباح/مساء، شكرًا، "من أنت"…) من ملف `src/responses.json` — عدّل النص بدون لمس الكود.
- **ردود مخصصة من صاحب البوت**: `!رد <كلمة> <الرد>` بنطاق (خاص / مجموعات / الكل)، وإدارتها من اللوحة.
- **تفاعلات إيموجي تلقائية** عند احتواء الرسالة على كلمة معينة: `!تفاعل <كلمة> <إيموجي>`.
- **تفاعل 🤖 تلقائي** بعد نجاح تنفيذ أي أمر.

### 🎨 الملصقات
- **تحويل صورة/فيديو/GIF (≤15 ثانية) إلى ملصق** بالرد عليها **أو** بإرسالها مع `!ملصق` كتعليق (caption).
- **سرقة الملصقات** `!سرقة` لإعادة نشر أي ملصق بحقوقك (اسم الحزمة والمؤلف من `.env`).

### 🛡️ حماية وإدارة المجموعات
- **حماية من الروابط** تحذف أي رابط وتنذّر صاحبه (`!منع-الروابط on/off`).
- **بطاقة ترحيب مصوّرة بـ Canvas** للعضو الجديد (صورته داخل إطار دائري) + رسالة ترحيب مخصصة.
- **حظر من استخدام البوت** (`!حظر` / `!رفع-حظر` / `!المحظورين`) — المحظور تُتجاهل رسائله ولا ينفّذ أي أمر.
- **قفل/فتح المجموعة**، **طرد**، **ترقية/تخفيض** (الترقية والتخفيض للمالك فقط).
- **منشن ذكي**: `!الكل` (منشن ظاهر)، `!تنبيه` (منشن مخفي بدون قائمة @)، `!همسة` (منشن مخفي لعضو واحد).
- **إيقاف البوت في محادثة معينة** `!إيقاف-بوت` / `!تفعيل-بوت`.
- **وضع الصيانة** `!صيانة` — لا يردّ البوت على أحد غير المالكين.

### ⏰ الجدولة والنشرات
- **آية قرآنية يومية 7 صباحاً** و**أذكار المساء 5 مساءً** للمجموعات المشتركة (`!جدول-آية` / `!جدول-ذكر`).
- **نشرة أنمي يومية 9 صباحاً** (`!نشرة-انمي` / `!إيقاف-نشرة`).
- **جدولة مهام**: `!جدولة قفل` (منتصف الليل)، `!جدولة فتح` (6 صباحاً)، `!جدولة اذكار` (الجمعة 2 ظهراً).
- **تذكيرات شخصية** لا تضيع عند إعادة التشغيل لأنهم في قاعدة البيانات: `!تذكير نص_المهمة 30m`.
- كل الجدولة تحترم `TIMEZONE` (افتراضياً `Asia/Riyadh`).

### 🎮 الألعاب والفعاليات
- حجر ورقة مقص، تخمين رقم (1–20 في 5 محاولات)، سؤال معلومات عن بلاك كلوفر (أجب **مباشرة في الدردشة بدون أمر**)، لعبة سلسلة الحروف.
- **فعالية تفكيك الحروف الجماعية** حتى 20 جولة مع لوحة صدارة 🏆 وأول من يكتب الإجابة في الدردشة يفوز بالنقطة.

### 🌐 أدوات تعتمد على خدمات عامة
- طقس (`wttr.in`)، بحث ويكيبيديا العربية، أسعار عملات حيّة (`open.er-api.com`)، ترجمة (Google Translate endpoint)، استطلاع رأي، نسبة حب، نكت، اقتباسات، أنميات الموسم وبحث أنمي (`Jikan` + `AniList`).

### 🖥️ لوحة تحكم ويب (مهمّة)
- تعمل تلقائياً مع البوت: نظرة عامة، حالة واتساب، **رمز QR من المتصفح**، الرسائل، الردود، التفاعلات، الحظر، التذكيرات، الجدولة، وضع الصيانة، إعادة ربط الجلسة.
- محمية بتوكن `DASHBOARD_TOKEN` + رابط عام يُكتشف تلقائياً على Railway.
- كل التفاصيل والشروحات في [القسم التالي](#-لوحة-التحكم--dashboard-اقرأ-هذا-أولاً).

</div>

> **EN — short version**
> **Logging & recovery:** full message logging in SQLite, deleted-message recovery, edit detection, last-seen tracking, media download with 24h auto-cleanup.
> **Auto-replies:** ready-made Arabic replies editable in `src/responses.json`, custom keyword replies per scope, auto emoji reactions, 🤖 confirmation reaction on every successful command.
> **Stickers:** image/video/GIF (≤15s) → sticker via reply *or* caption, and sticker "steal" with your own pack/author metadata.
> **Group protection:** anti-link (delete + warn), Canvas welcome cards with the joiner's avatar, per-user bot ban list, lock/unlock, kick, promote/demote (owner only), smart mentions (visible `الكل`, silent `تنبيه`, silent single-user `همسة`), per-chat bot disable, maintenance mode.
> **Scheduling:** daily Quran verse (07:00) & evening athkar (17:00), daily anime newsletter (09:00), scheduled group lock/unlock/Friday reminders, DB-backed personal reminders that survive restarts, all respecting `TIMEZONE`.
> **Games:** RPS, number guessing, anime trivia answered directly in chat, word-chain game, and a group letter-scramble event (up to 20 rounds) with a leaderboard.
> **Tools:** weather, Arabic Wikipedia, live currency rates, translation, polls, love %, jokes, anime quotes, seasonal anime search.
> **Dashboard:** zero-dependency web panel — see the next section.

---

## 🧩 لوحة التحكم — Dashboard (اقرأ هذا أولاً!)

<div dir="rtl">

### ❓ لماذا لم تكن اللوحة تظهر عندك على Railway؟

لأنها **ما كانت تشتغل أصلاً** 😅 — الكود موجود لكن استدعاءها كان **معلّقاً بـ comment** في مكانين:

```js
// src/index.js  (قبل التعديل)
// const startProfessionalDashboard = require('./web/app');
// startProfessionalDashboard();          ← كان معلّقاً!

// src/sessionManager.js  (قبل التعديل)
// if (!dashboardStarted) { startDashboard(); }   ← وكان معلّقاً!
```

**النتيجة:** لا يوجد أي خادم ويب يعمل داخل السيرفر → لا منفذ → Railway لا يستطيع توليد رابط، ولا توجد صفحة لتفتحها. أيضاً أمر `!لوحة` كان مكتوباً داخل `admin.js` لكنه **لم يُسجَّل** في `commandHandler.js`، فكان مستحيلاً تشغيله من واتساب، وحتى لو اشتغل كان يطبع `http://localhost:3000` (رابط محلي لا يعمل من هاتفك!).

**تم إصلاح هذا الآن:** اللوحة تُشغَّل تلقائياً مع البوت، وتطبع رابطها العام في السجلات، وأمر `!لوحة` صار مسجّلاً ويعرض الرابط الحقيقي + التوكن.

</div>

> **EN — Why you couldn't find the dashboard:** it was never running. The HTTP server calls were commented out in `src/index.js` and `src/sessionManager.js`, so no port was bound and Railway had nothing to expose. This is now wired up automatically.

---

### 🔗 كيف تعرف رابط اللوحة؟ / How to find the URL

<div dir="rtl">

#### الطريقة ① — من داخل واتساب (الأسهل) ✅
أرسل أيّاً من هذه الأوامر **من رقمك المالك** (في الخاص أو المجموعة):

```
!لوحة        !لوحة-التحكم        !dashboard        !link
```

سيردّك البوت برسالة فيها: الرابط العام جاهز للنسخ + رقم المنفذ + حالة الحماية + حالة الجلسات.

> 💡 تلميح: إذا كانت بادئتك `.` اكتب `.لوحة`. وإذا أردت تجربة أسرع، اكتب الأمر **في محادثة رقمك نفسه** (المحادثة مع نفسك) — البوت ينفّذ الأوامر المرسلة من رقمه تلقائياً.

#### الطريقة ② — من سجلات Railway (Deploy Logs)
Railway → خدماتك → تبويب **Deployments** → اضغط على آخر Deployment → **View Logs**.
ابحث عن هذه الأسطر:

```
[info] 🧩 لوحة التحكم تعمل على المنفذ 8080
[info]    الرابط المحلي : http://localhost:8080
[info]    الرابط العام  : https://w-bot-production.up.railway.app/?token=xxxx
```

السطر الثالث هو رابطك الجاهز. لو السطر يقول `http://localhost:...` معناه أنه **لا يوجد نطاق عام بعد** → نفّذ الطريقة ③.

#### الطريقة ③ — توليد نطاق عام على Railway (لازم مرة واحدة)
1. ادخل مشروعك في Railway → اضغط على **الخدمة** (المربع، لا المشروع).
2. تبويب **Settings** → قسم **Networking**.
3. تحت **Public Networking** اضغط **`Generate Domain`**.
4. اختر **Port** = المنفذ الذي يطبعه البوت في السجلات (إن لم تضبط `PORT`/`DASHBOARD_PORT` فهو `3000`).
5. سيظهر لك نطاق مثل:

```
https://اسم-خدمتك.up.railway.app
```

6. **رابط لوحتك =** `https://اسم-خدمتك.up.railway.app/?token=قيمة_DASHBOARD_TOKEN`
7. اضغط **Deploy → Manual Deploy → Trigger Redeploy** بعد إضافة النطاق حتى تُحقن متغيرات Railway (`PORT`, `RAILWAY_PUBLIC_DOMAIN`) ويصبح الرابط العام في السجلات صحيحاً.

#### الطريقة ④ — لو الرابط ما زال غلط
اضبط متغيراً يدوياً في Railway (Variables) باسم:

```
DASHBOARD_PUBLIC_URL=https://اسم-خدمتك.up.railway.app
```

البوت سيستخدمه كما هو في أمر `!لوحة` وفي السجلات.

</div>

> **EN — 4 ways to get the URL**
> 1. **From WhatsApp (easiest):** send `!لوحة` / `!dashboard` / `!link` from an owner number — it replies with the real public URL, port, protection status and sessions.
> 2. **From Railway Deploy Logs:** look for `🧩 لوحة التحكم تعمل على المنفذ` and `الرابط العام` — that's your URL. If it says `http://localhost:…`, you have no public domain yet.
> 3. **Generate a public domain (one time):** Railway → your **service** → **Settings → Networking → Public Networking → `Generate Domain`**, pick the port the bot logs (default `3000` unless `PORT`/`DASHBOARD_PORT` is set). You get `https://<name>.up.railway.app` → open `https://<name>.up.railway.app/?token=<DASHBOARD_TOKEN>`. Then **redeploy** so Railway injects `PORT` and `RAILWAY_PUBLIC_DOMAIN`.
> 4. **Override manually:** set `DASHBOARD_PUBLIC_URL=https://<name>.up.railway.app`.

---

### 🔑 الحماية (لا تتجاهلها) / Token protection

<div dir="rtl">

- اللوحة **تفتح كل شيء** (نصوص رسائلك، الردود، الحظر، وضع الصيانة، إعادة الربط!) لأي شخص يصل الرابط.
- لذلك **اضبط `DASHBOARD_TOKEN`** بقيمة طويلة عشوائية؛ بعدها كل طلب يحتاج التوكن عبر:
  - `?token=...` في الرابط (الأسهل)، أو
  - `Authorization: Bearer <token>`، أو
  - كوكي يُحفظ تلقائياً بعد أول فتح بالرابط الصحيح.
- بدون توكن تطبع السجلات تحذيراً صريحاً: `⚠️ DASHBOARD_TOKEN غير مضبوط`.
- استثناء واحد بلا توكن: مسار `/health` (مفحوص الصحة لـ Railway).
- إنشاء توكن سريع:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

</div>

> **EN:** The dashboard exposes your message log and admin actions, so **always set `DASHBOARD_TOKEN`**. Requests then need `?token=…`, an `Authorization: Bearer` header, or the cookie stored on first visit. Only `/health` stays open (for Railway health checks). Generate one with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

---

### 🖥️ ماذا يوجد داخل اللوحة؟ / What's inside

| التبويب / Tab | المحتوى / Contents |
|---|---|
| 📊 **نظرة عامة / Overview** | حالة الاتصال بواتساب، المنفذ، الرابط العام، الجلسات، وقت التشغيل، استهلاك الرام، عدد الرسائل/المجموعات/الردود/المحظورين، وآخر المحادثات |
| 📱 **ربط واتساب / WhatsApp link** | **رمز QR مرسوم داخل المتصفح** للمسح مباشرة (بدون فتح السجلات!) + زر `إعادة ربط` يمسح الجلسة ويولّد QR جديد |
| 💬 **الرسائل / Messages** | تصفح والبحث في سجل الرسائل مع فلترة بمحادثة (`🗑️` للرسائل المحذوفة المسترجعة) |
| 🤖 **الردود الآلية / Auto replies** | إضافة/حذف رد مخصص مع اختيار النطاق (all / group / private) |
| ✨ **التفاعلات / Reactions** | إدارة تفاعلات الإيموجي التلقائية |
| 🚫 **المحظورون / Bans** | حظر/رفع حظر مستخدم من استخدام البوت |
| ⏰ **التذكيرات والجدولة / Reminders & events** | تذكيرات معلّقة وجداول cron النشطة مع حذفها |
| ⚙️ **الإعدادات / Settings** | زر تفعيل/إيقاف وضع الصيانة + عرض المتغيرات الفعّالة |

**لغة الواجهة:** زر `EN / عربي` في الأعلى يبدّل النصوص والاتجاه (RTL/LTR) فوراً.

<div dir="rtl">

> 🧪 **معاينة محلية بدون واتساب:** `npm run dashboard` تشغّل اللوحة وحدها لتجربتها على `http://localhost:3000`.

</div>

---

### 🩺 اللوحة لا تعمل؟ تحقق بالترتيب / Dashboard not working?

<div dir="rtl">

| العرض | السبب المحتمل والحل |
|---|---|
| **تفتح الصفحة لكن تظهر رسالة 401** | التوكن ناقص أو خاطئ → افتح `الرابط/?token=DASHBOARD_TOKEN` |
| **الرابط في السجلات يبدأ بـ `http://localhost`** | لم تولّد نطاقاً عاماً بعد → نفّذ الطريقة ③ أعلاه |
| **Railway يقول "Application error" / 502** | النطاق وُلّد على منفذ غير الذي يستمع عليه البوت → ولّد نطاقاً جديداً على المنفذ الصحيح، أو اضبط `PORT` صراحةً واجعله مطابقاً |
| **اللوحة لا تفتح إطلاقاً** | `ENABLE_DASHBOARD=false` مضبوط، أو البوت فشل قبل تشغيل اللوحة → راجع Deploy Logs |
| **خطأ `EADDRINUSE` في السجلات** | المنفذ مستخدم من عملية أخرى → غيّر `DASHBOARD_PORT` (محلياً فقط) أو أوقف تلك العملية |
| **لا يظهر رمز QR في اللوحة** | البوت متصل بالفعل (لا يوجد رمز معلّق) أو انتهت صلاحية الرمز؛ أعد النشر أو اضغط `إعادة ربط` |

</div>

> **EN:** 401 → wrong/missing `?token=`. URL shows `localhost` → no public domain generated. Railway "Application error"/502 → the domain points at a port the app doesn't listen on; regenerate the domain with the right port or pin `PORT`. Nothing at all → `ENABLE_DASHBOARD=false` or the process crashed (check logs). `EADDRINUSE` → change `DASHBOARD_PORT`. No QR shown → you're already connected, or the code expired (restart / use Reconnect).

---

## ⌨️ مرجع الأوامر الكامل / Full Command Reference

<div dir="rtl">

**البادئة الافتراضية `.`** — لمعظم الأوامر اسم عربي **وآخر إنجليزي** مكافئ. استُخدمت `!` في الجداول للتوضيح فقط؛ استبدلها ببادئتك من `COMMAND_PREFIX`.
الأوامر تعمل في **الخاص والمجموعات**، ومعظم أوامر الإدارة تحتاج **مشرفاً** (⭐) أو **مالكاً** (👑).

</div>

> **EN:** Default prefix is `.`; every command has an Arabic name and an English alias. `!` below is just illustrative. Commands work in private chats and groups; ⭐ = needs group admin or owner, 👑 = owner/admin numbers only.

### 🌐 عام / General

| الأمر / Command | الوصف / Description | من / Who |
|---|---|---|
| `!ping` | فحص سرعة الاستجابة / latency check | الكل / everyone |
| `!مساعدة` · `!help` · `!info` · `!botinfo` | قائمة الأوامر كاملة مع صورة أستا / full command list | الكل / everyone |
| `!لوحة` · `!لوحة-التحكم` · `!dashboard` · `!link` | 🔑 رابط لوحة التحكم + المنفذ + حالة الحماية / dashboard URL & status | 👑 |
| `!ايدي` · `!معرفي` · `!myid` · `!whoami` | معرّفك الحقيقي عند البوت وهل أنت أدمن (يكشف مشكلة `@lid`) / your ID + admin check | الكل / everyone |
| `!تواصل` · `!المطور` · `!developer` · `!contact` | بطاقة المطور / developer card | الكل / everyone |

### 🌸 أنمي وترفيه / Anime & Fun

| الأمر | الوصف | من / Who |
|---|---|---|
| `!انمي` · `!anime` | شخصية أنمي عشوائية + صورتها من AniList + مقولتها / random character card | الكل |
| `!زوج` | "زوجك السحري" — شخصية ذكر / random male character | الكل |
| `!زوجة` | "زوجتك السحرية" — شخصية أنثى / random female character | الكل |
| `!اقتباس` · `!quote` | اقتباس من بلاك كلوفر / anime quote | الكل |
| `!انميات` · `!موسم` | أنميات الموسم الحالي (Jikan) / current season list | الكل |
| `!بحث-انمي <اسم>` · `!searchanime <name>` | تفاصيل أنمي: تقييم، حلقات، قصة / anime details | الكل |
| `!نشرة-انمي` | اشتراك المحادثة بالنشرة اليومية 9 ص / subscribe to daily newsletter | ⭐ |
| `!إيقاف-نشرة` | إلغاء الاشتراك / unsubscribe | ⭐ |
| `!lastseen` · `!آخر-مرة` · `!آخرمرة` | آخر ظهور مسجّل / last seen | الكل |

### 🎮 ألعاب / Games

| الأمر | الوصف | من / Who |
|---|---|---|
| `!لعبة` · `!game` · `!أفكاري` | قائمة الألعاب / games menu | الكل |
| `!حجر` · `!ورقه` · `!مقص` | حجر ورقة مقص ضد البوت / rock-paper-scissors | الكل |
| `!تخمين` | بدء تخمين رقم 1–20 / start number guessing | الكل |
| `!اخمن <رقم>` | إرسال التخمين (5 محاولات) / submit guess | الكل |
| `!سؤال` · `!trivia` | سؤال معلومات — أجب **في الدردشة مباشرة** / trivia, answer in plain chat | الكل |
| `!جواب <نص>` · `!answer <text>` | إرسال الإجابة بأمر (اختياري) / explicit answer form | الكل |
| `!فعالية <جولات>` · `!تفكيك` · `!event` | 🔥 فعالية تفكيك حروف جماعية (حتى 20 جولة) / group scramble event | ⭐ group |
| `!ايقاف_فعالية` | إنهاء الفعالية + لوحة الصدارة / stop event + leaderboard | ⭐ group |
| `!سلسلة` | لعبة سلسلة الحروف / word-chain game | الكل |

### 🕌 إسلامي / Islamic

| الأمر | الوصف | من |
|---|---|---|
| `!آية` · `!aaya` | آية قرآنية عشوائية / random verse | الكل |
| `!ذكر` · `!thikr` | ذكر عشوائي / random dhikr | الكل |
| `!جدول-آية <وقت>` | جدولة آية يومية لهذه المحادثة (افتراضياً 07:00) / schedule daily verse | 👑 |
| `!جدول-ذكر <وقت>` | جدولة ذكر يومي (افتراضياً 17:00) / schedule daily dhikr | 👑 |
| `!إيقاف-جدول [رقم]` | عرض الجداول أو إيقاف واحد / list or stop schedules | 👑 |

### 🛡️ مجموعات وإدارة / Groups & Moderation

| الأمر | الوصف | من |
|---|---|---|
| `!طرد @عضو` · `!kick` | طرد عضو / kick member | ⭐ group |
| `!ترقية @عضو` · `!promote` | ترقية لمشرف / promote | 👑 group |
| `!تخفيض @مشرف` · `!demote` | تخفيض لمشرف / demote | 👑 group |
| `!قفل` · `!lock` | إرسال للمشرفين فقط / lock group | ⭐ group |
| `!فتح` · `!unlock` | فتح الإرسال للجميع / unlock group | ⭐ group |
| `!معلومات-مجموعة` · `!groupinfo` | الاسم، الأعضاء، المشرفون، تاريخ الإنشاء / group info | الكل group |
| `!منع-الروابط on\|off` · `!antilink` | حذف أي رابط تلقائياً / anti-link toggle | ⭐ group |
| `!welcome on\|off` | بطاقة ترحيب Canvas للعضو الجديد / welcome card toggle | ⭐ group |
| `!ضد_التعديل on\|off` · `!منع-التعديل` | كشف تعديل الرسائل / anti-edit toggle | ⭐ group |
| `!الكل <رسالة>` · `!all` | منشن ظاهر للجميع / visible @all | ⭐ group |
| `!تنبيه <رسالة>` | منشن **مخفي** للجميع بدون قائمة @ / silent @all | ⭐ group |
| `!همسة <رسالة>` · `!منشن` | منشن مخفي لعضو واحد / silent single mention | ⭐ group |
| `!جدولة قفل\|فتح\|اذكار` | جدولة تلقائية: قفل 00:00 / فتح 06:00 / أذكار الجمعة 14:00 / scheduled group tasks | ⭐ group |
| `!حظر @عضو` · `!ban` | منع عضو من كل أوامر البوت / ban from the bot | 👑 |
| `!رفع-حظر @عضو` · `!unban` | فك الحظر / unban | 👑 |
| `!المحظورين` · `!banlist` | قائمة المحظورين / ban list | 👑 |
| `!إيقاف-بوت` | إيقاف البوت في هذه المحادثة (يتجاهل كل شيء) / disable bot in this chat | ⭐ |
| `!تفعيل-بوت` | إعادة تشغيله / re-enable bot in this chat | ⭐ |

### 🎨 ملصقات / Stickers

| الأمر | الوصف | من / Who |
|---|---|---|
| `!ملصق` · `!sticker` | حوّل صورة/فيديو/GIF (≤15 ثانية) لملصق — بالرد عليها **أو** بإرسالها مع الأمر كتعليق. الحقوق من `STICKER_PACK_NAME`/`STICKER_AUTHOR_NAME` | الكل |
| `!سرقة` · `!steal` | رد على أي ملصق → يُعاد نشره بحقوقك / re-upload a sticker with your metadata | الكل |

### 🌐 أدوات / Tools

| الأمر | الوصف | من / Who |
|---|---|---|
| `!طقس <مدينة>` · `!weather <city>` | طقس فوري (wttr.in، بدون مفتاح) — افتراضياً الرياض | الكل |
| `!ويكي <موضوع>` · `!wiki <topic>` | ملخص من ويكيبيديا العربية + صورة | الكل |
| `!سعر <مبلغ> <من> <إلى>` · `!currency` | تحويل عملات بسعر حي (مثال: `!سعر 100 USD SAR`) | الكل |
| `!ترجم <lang> <نص>` · `!translate` | ترجمة (أو ردّ على رسالة مع `!ترجم en`) | الكل |
| `!استطلاع <سؤال>\|<خيار1>\|<خيار2>` · `!poll` | استطلاع برقم للتصويت | الكل |
| `!حب @أ @ب` · `!love` | نسبة توافق عشوائية مرحة / love % | الكل |
| `!نكتة` · `!joke` | نكتة عشوائية / random joke | الكل |
| `!تذكير <نص> <وقت>` · `!reminder` | تذكير شخصي محفوظ (مثال: `!تذكير مراجعة_الكود 3h`) — الوحدات `s m h d`، والوقت بدون وحدة = دقائق، ويصل دائماً لرقم المالك | ⭐ |

### 👑 المالك / Owner

| الأمر | الوصف | من / Who |
|---|---|---|
| `!صيانة` · `!maintenance` | تبديل وضع الصيانة: لا يردّ البوت على غير المالكين | 👑 |
| `!احصائيات` · `!stats` | مجموعات نشطة، رسائل اليوم، استهلاك الرام | 👑 |
| `!بث <رسالة>` | بث رسالة (حالياً للمحادثة الحالية — عدّل `groups` في `admin.js` لبث أوسع) | 👑 |
| `!جلسات` | حالة جلسات واتساب + مسار المجلد على القرص | 👑 |
| `!اعادةربط [اسم]` · `!reconnect` | حذف مجلد الجلسة وبدء طلب QR جديد | 👑 |
| `!رد <كلمة> <رد>` | إضافة رد آلي مخصص بنطاق المحادثة الحالية | 👑 |
| `!حذفرد <رقم>` | حذف رد مخصص (الرقم من اللوحة أو من `!رد`) | 👑 |
| `!تفاعل <كلمة> <إيموجي>` | تفاعل تلقائي عند ذكر الكلمة | 👑 |
| `!حذفتفاعل <رقم>` | حذف تفاعل | 👑 |
| `!ترحيب <رسالة>` | ضبط نص رسالة الترحيب للمجموعة | 👑 |

<div dir="rtl">

> ⚠️ أوامر غير موجودة (انتبه للنسخ القديمة من التوثيق): `!زوجني` — الصحيح `!زوج` و`!زوجة`.

</div>

---

## 🔐 الصلاحيات / Roles & Permissions

<div dir="rtl">

| الدور | كيف تحصل عليه | ماذا يملك |
|---|---|---|
| **مالك / Owner** | رقمك في `OWNER_NUMBER` أو `EXTRA_OWNER_NUMBERS` | كل شيء: صيانة، إحصائيات، حظر، ترقية/تخفيض، ردود، بث، إعادة ربط، اللوحة |
| **أدمن ثاني / Second admin** | `SECOND_ADMIN_NUMBER` | نفس صلاحيات المالك تقريباً (تجاوز الصيانة، تجاوز الحظر، أوامر المالك/الإدارة) |
| **مشرف مجموعة / Group admin** | ترقيته من واتساب | أوامر المجموعات: طرد، قفل/فتح، منشن، حماية، ترحيب، جدولة، فعاليات |
| **عضو / Member** | — | الأوامر العامة والترفيه والألعاب |
| **محظور / Banned** | `!حظر` | لا شيء — تُتجاهل رسائله وترفض أوامره |

- **ملاحظة مهمة عن `@lid`:** واتساب صار أحياناً يوصلّ للبوت معرّف خصوصية بدل رقمك. إذا قال `!ايدي` أنه غير معرّف كأدمن وهو رقمك، انسخ **الأرقام الظاهرة في الأمر** وضعها في `SECOND_ADMIN_NUMBER` بدل رقم الهاتف.
- **تنفيذ ذاتي:** أي أمر تكتبه **من رقم البوت نفسه** (من هاتفك المربوط بالجلسة) ينفَّذ تلقائياً بصلاحية المالك — مفيد لتجربة سريعة بدون ما ترسل الرسائل لغيرك. يعطّله `ENABLE_SELF_EXECUTION=false`.

</div>

> **EN:** Owner = `OWNER_NUMBER` + `EXTRA_OWNER_NUMBERS`; second admin = `SECOND_ADMIN_NUMBER` (gets maintenance bypass, anti-link immunity, ban override and owner commands); group admin from WhatsApp gets group tools; members get fun commands; banned users get nothing. If `!whoami` says you're *not* an admin although it's your number, WhatsApp is sending a `@lid` privacy ID — copy the digits it prints into `SECOND_ADMIN_NUMBER`. Commands typed **from the bot's own number** auto-run with owner powers (disable with `ENABLE_SELF_EXECUTION=false`).

---

## ⚙️ كل متغيرات البيئة / Environment Variables

<div dir="rtl">

تُضبط في ملف `.env` محلياً، أو في Railway تبويب **Variables**. انسخ `cp .env.example .env` وابدأ.

</div>

| المتغير / Variable | الافتراضي / Default | الوظيفة / Purpose |
|---|---|---|
| `COMMAND_PREFIX` | `.` | بادئة الأوامر / command prefix |
| `OWNER_NUMBER` | `967784609423` | رقم المالك الأساسي (دولي بدون `+`) / main owner |
| `SECOND_ADMIN_NUMBER` | `967735076371` | أدمن ثانٍ بصلاحيات كاملة / second admin |
| `EXTRA_OWNER_NUMBERS` | `967784773314,967784609423` | مالكون إضافيون بفاصلة / extra owners |
| `ENABLE_AUTO_REPLY` | `true` | الردود الآلية / auto replies |
| `ENABLE_ANTI_DELETE` | `true` | استرجاع المحذوف / anti-delete |
| `ENABLE_STICKER_MAKER` | `true` | صناعة الملصقات / stickers |
| `ENABLE_SCHEDULER` | `true` | الجدولة والنشرات / scheduler |
| `ENABLE_SELF_EXECUTION` | `true` | تنفيذ الأوامر من رقم البوت نفسه / self-execution |
| `ENABLE_DASHBOARD` | `true` | 🔑 تشغيل لوحة التحكم / enable dashboard |
| `DASHBOARD_TOKEN` | — (فارغ = مكشوف!) | 🔑 توكن الدخول للوحة / dashboard access token |
| `DASHBOARD_PORT` | `PORT` أو `3000` | منفذ اللوحة (اتركه فارغاً على Railway) |
| `DASHBOARD_PUBLIC_URL` | مكتشف من Railway | رابط اللوحة العام اليدوي / explicit public URL |
| `DASHBOARD_RECENT_LIMIT` | `50` | عدد الرسائل في اللوحة |
| `SESSION_NAMES` | `default` | أسماء الجلسات (جلسة لكل رقم، بفاصلة) / multi-session names |
| `SESSION_BASE_DIR` | تلقائياً داخل الـ Volume إن وُجد، وإلا `./session` | مكان مجلدات الجلسات / session folder |
| `DB_PATH` | تلقائياً داخل الـ Volume إن وُجد، وإلا `./bot.db` | مكان ملف SQLite / SQLite file path |
| `MEDIA_STORE_DIR` | تلقائياً داخل الـ Volume إن وُجد، وإلا `./media_store` | مكان الوسائط المحفوظة / stored media |
| `RAILWAY_VOLUME_MOUNT_PATH` | من Railway | يُقرأ تلقائياً — لا تضبطه يدوياً / injected by Railway |
| `STICKER_PACK_NAME` | `أستا ساما هو الأفضل` | اسم حزمة الملصق / sticker pack name |
| `STICKER_AUTHOR_NAME` | `ENG.YOUSEF` | اسم مؤلف الملصق / sticker author |
| `TIMEZONE` | `Asia/Riyadh` | منطقة الجدولة والتذكيرات |
| `DEVELOPER_CONTACT` | `967784609423` | يظهر في `!تواصل` |
| `DEVELOPER_WEBSITE` | `https://engyusef.alpha-code.net` | يظهر في `!تواصل` |
| `LOG_LEVEL` | `info` | مستوى السجلات (pino) |
| `NODE_ENV` | — | `development` يفعّل سجلات ملوّنة (pino-pretty) |
| `PORT` | من المنصة | **لا تضبطه يدوياً على Railway** — المنصة تعطيه والنطاق يُبنى عليه |

---

## 🚀 التشغيل محلياً / Running Locally

<div dir="rtl">

### المتطلبات / Requirements
- **Node.js 20+** (`engines` في package.json) — Node 20 or newer
- npm / Git
- على لينكس قد تحتاج مكتبات نظام لـ `canvas`:
  `sudo apt install -y build-essential python3 pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

### الخطوات / Steps

```bash
# 1) تنزيل الكود / clone
git clone <repo-url> && cd w-bot

# 2) تثبيت الحزم / install
npm install

# 3) الإعدادات / configuration
cp .env.example .env
# ثم عدّل OWNER_NUMBER و DASHBOARD_TOKEN

# 4) التشغيل / start
npm start

# (تطوير مع إعادة تشغيل تلقائية / dev with auto-reload)
npm run dev
```

```
[info] default 📱 امسح رمز QR التالي من واتساب (الأجهزة المرتبطة):
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ...  QR في الطرفية  ... █
[info] default ✅ Connected to WhatsApp successfully.
[info] 🧩 لوحة التحكم تعمل على المنفذ 3000
```

5. **امسح الرمز:** واتساب في هاتفك → ⋮ / Settings → **Linked devices** → **Link a device**.
6. افتح اللوحة: **http://localhost:3000/?token=التوكن_الذي_ضبطته**
7. جرّب البوت: أرسل لنفسك `.مساعدة` أو `.لوحة` أو `.انمي`.

### أوامر التشغيل / npm scripts

| الأمر | الوظيفة |
|---|---|
| `npm start` | تشغيل البوت + اللوحة (الإنتاج) / start bot + dashboard |
| `npm run dev` | نفس الشيء مع `nodemon` (إعادة تشغيل تلقائي) |
| `npm run dashboard` | **اللوحة فقط** بدون واتساب — للتجربة السريعة |
| `npm test` | اختبار قاعدة البيانات (`node --test test/`) |

> ⚠️ **تحذير للنشر على سحابة ephemeral:** مجلد `session/` يُحذف مع كل إعادة تشغيل، فتضطر لمسح QR من جديد. الحل في [قسم البقاء](#-بقاء-الجلسة-والبيانات-على-railway--session--data-persistence).

</div>

> **EN:** `git clone` → `npm install` → `cp .env.example .env` (set `OWNER_NUMBER` + `DASHBOARD_TOKEN`) → `npm start` → scan the terminal QR with WhatsApp → **Linked devices** → open `http://localhost:3000/?token=<DASHBOARD_TOKEN>`. Use `npm run dev` for auto-reload, `npm run dashboard` for dashboard-only, `npm test` for the DB test. On Linux you may need cairo/pango dev packages for `canvas`.

---

## ☁️ النشر على Railway — خطوة خطوة / Deploying to Railway (step by step)

<div dir="rtl">

الملفات اللازمة **موجودة مسبقاً** في المستودع:

| الملف | متى يُقرأ | ماذا يفعل |
|---|---|---|
| `nixpacks.toml` | إذا كان الـ Builder = **Nixpacks** | يثبّت مكتبات `canvas` الأصلية (cairo, pango, giflib, pixman) و`ffmpeg`، وأمر البدء `node src/index.js` |
| `railpack.json` | إذا كان الـ Builder = **Railpack** (الافتراضي الجديد على Railway) | نفس الشغل بصيغة Railpack: `buildAptPackages` لمكتبات البناء + `deploy.aptPackages` للتشغيل + `startCommand` + Node 20 |
| `Dockerfile` | — | غير موجود؛ لو أضفته سيغيّر طريقة البناء كلها |

> ⚠️ **فخ حقيقي:** Railway نقل المشاريع الجديدة إلى **Railpack** ووضع Nixpacks في «وضع الصيانة»، و**Railpack لا يقرأ `nixpacks.toml` إطلاقاً** (تجاهل صامت). إن ظهر في سجل البناء سطر مثل `Using Railpack` فلا تحذف `railpack.json` — بدونه تفشل ملصقات الصور/الفيديو وبطاقات الترحيب لأن `canvas` تحتاج cairo/pango.
> تحقق/غيّر الـ Builder من: **Service → Settings → Build → Build provider**.

- البوت يستمع على `process.env.PORT` تلقائياً → هذا ما يجعل النطاق العام يعمل.

### ① أنشئ المشروع / Create the project
1. ارفع الكود على GitHub (مستودع **خاص** أفضل لأن فيه أرقامك).
2. Railway → **New Project** → **Deploy from GitHub repo** → اختر `w-bot`.
3. اترك Build/Nixpacks كما هو (سيقرأ `nixpacks.toml`).

### ② اختر الـ Builder وتأكد منه / Check the build provider
> ⚠️ **مهم وحالي:** Railway استبدل **Nixpacks** بـ **Railpack** كمبني افتراضي، و**Railpack لا يقرأ `nixpacks.toml` إطلاقاً** (تجاهل صامت). لهذا المستودع يضم ملفين:
> - `nixpacks.toml` → إذا كان الـ Builder = Nixpacks.
> - `railpack.json` → إذا كان الـ Builder = Railpack (وهو الافتراضي الآن): يثبّت مكتبات `canvas` و`python3/pkg-config` للبناء و`ffmpeg` لملصقات الفيديو، ويضبط أمر البدء.
>
> تأكد منه في: **Service → Settings → Build → Build provider**. لو ظهر في سجل البناء `Using Railpack` فتأكد أن `railpack.json` لم يُحذف من المستودع.

### ③ اضبط المتغيرات / Set variables
تبويب **Variables** → أضِف (على الأقل):

```
COMMAND_PREFIX=.
OWNER_NUMBER=967784609423
DASHBOARD_TOKEN=<نص_عشوائي_طويل>
TIMEZONE=Asia/Riyadh
```

> لا تضبط `PORT` — Railway يضبطه. وإن أردت منفذاً ثابتاً اضبط `PORT=3000` واستخدم 3000 في توليد النطاق.

### ④ اربط قرص دائم (اختياري لكن مهم) / Attach a volume (recommended)
**Service → right-click / ⋯ → Attach Volume**
- **Mount Path: `/app/data`** ← لأن Railway يضع ملفات التطبيق في `/app` (هذا ما تؤكده وثائق Railway الرسمية).
- ✅ **لا تحتاج أي متغير إضافي**: البوت يقرأ `RAILWAY_VOLUME_MOUNT_PATH` الذي تعطيه Railway تلقائياً، فينقل الجلسة وقاعدة البيانات والوسائط إلى القرص الدائم من نفسه.
- إن أردت التحكّم اليدوي فاستخدم `SESSION_BASE_DIR=/app/data/session` و`DB_PATH=/app/data/bot.db`.
- 🔍 *للتأكد من المسار الفعلي:* أرسل `!جلسات` من رقم المالك — يطبع مسار مجلد الجلسة كما يراه البوت.

### ⑤ ولّد الرابط العام / Generate a public domain
**Service → Settings → Networking → Public Networking → `Generate Domain`** → اختر المنفذ المطابق (3000 أو قيمة `PORT`).
سيظهر: `https://<name>.up.railway.app`

### ⑥ أعد النشر / Redeploy
**Deployments → ⋯ → Trigger Redeploy** حتى تُحقن `RAILWAY_PUBLIC_DOMAIN` ويظهر الرابط الصحيح في السجلات وأمر `!لوحة`.

### ⑦ اربط واتساب / Link WhatsApp (المرحلة الحرجة)
1. **Deploy Logs** → انسخ سطر `نص الرمز (يمكن نسخه لأي أداة QR): 2@...`
   أو افتح اللوحة → تبويب **📱 ربط واتساب** → ستجد **QR مرسوماً** (أجدد وأنظف من السجلات).
2. واتساب → **Linked devices** → **Link a device** → امسح.
3. انتهى! البوت يعمل، واللوحة على `https://<name>.up.railway.app/?token=...`

> ⏱️ الرمز ينتهي خلال ~60 ثانية ويتجدد تلقائياً — أعِد فتح تبويب «ربط واتساب» للحصول على رمز جديد.
> 💡 صورة الـ ASCII داخل سجلات Railway غالباً لا تُقرأ جيداً (السجلات تُسطّح ألوان الطرفية)، ولهذا نعرض الرمز مرسوماً داخل اللوحة نفسها.

### ⑧ (اختياري) فحص الصحة / Health check
**Settings → Networking → Healthcheck Path** = `/health`
(مسار مفتوح بدون توكن — يعرض `ok` وحالة الاتصال).

### ⑨ التحديث لاحقاً / Updating
`git push` إلى الفرع الذي يراقبه Railway → يتم النشر تلقائياً (Auto-Deploy مفعّل). وإن كان الربط يدوياً استخدم **Trigger Redeploy**.

> على VPS عادي: `git pull && npm ci --omit=dev && pm2 restart w-bot || pm2 start src/index.js --name w-bot`

</div>

> **EN — condensed:** 1) Railway → New Project → Deploy from GitHub. Both builders are covered: `nixpacks.toml` for Nixpacks and `railpack.json` for Railpack (now Railway's default, and it ignores `nixpacks.toml`) — both install the native libs `canvas` needs plus `ffmpeg` for video stickers. 2) In **Variables** set `COMMAND_PREFIX`, `OWNER_NUMBER`, `DASHBOARD_TOKEN`, `TIMEZONE` (don't set `PORT`; Railway injects it). 3) Optional but recommended: **Attach Volume** at `/app/data` — the bot then stores session + `bot.db` + media there automatically via `RAILWAY_VOLUME_MOUNT_PATH`. 4) **Settings → Networking → Public Networking → Generate Domain**, pick the listening port → `https://<name>.up.railway.app`. 5) **Trigger Redeploy** so `RAILWAY_PUBLIC_DOMAIN` is injected. 6) Link WhatsApp from **Deploy Logs** or — much easier — from the dashboard's **📱 WhatsApp link** tab which renders a scannable QR that refreshes automatically (codes expire in ~60s). 7) Optional Healthcheck Path `/health`. 8) Updates: just `git push` (auto-deploy) or Trigger Redeploy.

---

## 💾 بقاء الجلسة والبيانات على Railway / Session & Data persistence

<div dir="rtl">

| الشيء | المسار الافتراضي (بدون Volume) | ماذا يحدث بعد كل deploy |
|---|---|---|
| جلسة واتساب (creds/keys) | `/app/session/<name>` | 🔴 تُمسح → **امسح QR من جديد** |
| قاعدة البيانات | `/app/bot.db` (+ `-wal`, `-shm`) | 🔴 تضيع الرسائل/الردود/الحظر/التذكيرات |
| الوسائط المسترجَعة | `/app/media_store/` | 🟠 تُفقد الوسائط القديمة |

### ✅ الحل الموصى به: Volume (خطوة واحدة فقط)
1. من لوحة المشروع: **⋯ / Command Palette → Attach Volume** → اربطه بالخدمة → **Mount Path = `/app/data`**.
2. **Deploy.** لا متغيرات ولا تعديل كود: `src/sessionPaths.js` يقرأ `RAILWAY_VOLUME_MOUNT_PATH` (تُحقنه Railway تلقائياً) فيصبح:
   - الجلسة → `/app/data/session/<name>`
   - قاعدة البيانات → `/app/data/bot.db`
   - الوسائط → `/app/data/media_store`
3. **تحقّق:** أرسل `!جلسات` — سترى المسارات ومصدرها (`Volume ✅` أو «جذر المشروع ⚠️ زائل»).

> 📌 ملاحظات من وثائق Railway: القرص يُركَّب **عند بدء التشغيل** وليس أثناء البناء (فلا تكتب بيانات مهمة في وقت البناء عليه)، وليس overlay، ومملوك لـ `root` — لو ظهر خطأ صلاحيات أضِف المتغير `RAILWAY_RUN_UID=0`.

### 🔧 التجاوز اليدوي (اختياري)
| المتغير | الوظيفة | مثال |
|---|---|---|
| `SESSION_BASE_DIR` | مكان مجلدات الجلسات (أعلى أولوية من اكتشاف Volume) | `/data/wa/sessions` |
| `DB_PATH` | مكان ملف SQLite | `/data/wa/bot.db` |
| `MEDIA_STORE_DIR` | مكان الوسائط المحفوظة | `/data/wa/media` |

### 🌤️ بديل سحابي: MongoDB للجلسة
Baileys تدعم `useMongoDBAuthState` رسمياً — مريح إن لا تريد إدارة قرص (لكن `bot.db` يبقى محلياً ما لم تنقله لخدمة أخرى):

```bash
npm i mongodb
```

```js
// في src/sessionManager.js — بديلاً عن useMultiFileAuthState(sessionDir)
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const { state, saveCreds } = await useMongoDBAuthState(client.db('asta').collection('session'));
```

> 🔴 **لا ترفع `session/` إلى GitHub أبداً** (متجاهَل في `.gitignore`): واتساب يحدّث المفاتيح باستمرار، والرفع التلقائي يستنزف حدود GitHub **ويعرّض جلستك للسرقة**.

</div>

> **EN:** Railway puts your app in `/app` and wipes the container filesystem on every deploy, so `session/`, `bot.db` and `media_store/` vanish. Fix in one step: **Attach Volume → Mount Path `/app/data`** — the bot detects `RAILWAY_VOLUME_MOUNT_PATH` (injected by Railway) and stores the session, SQLite file and media there automatically; `!sessions` prints the real paths and their source. Override manually with `SESSION_BASE_DIR`, `DB_PATH`, `MEDIA_STORE_DIR` if you prefer. Volumes mount at container start (not build time), are not overlays, and are root-owned (add `RAILWAY_RUN_UID=0` on permission errors). Cloud alternative: `useMongoDBAuthState` + MongoDB Atlas. Never commit/push `session/`.

---

## 📡 واجهة API الخاصة باللوحة / Dashboard REST API

<div dir="rtl">

كل المسارات تحتاج التوكن (إلا `/health`)، ويمكن تمريره `?token=...` أو `Authorization: Bearer ...`.

</div>

| Method | المسار / Path | الوظيفة / Function |
|---|---|---|
| `GET` | `/health` | فحص صحة عام: `ok`, `uptimeSeconds`, `connectedToWhatsApp`, `sessions` |
| `GET` | `/` | صفحة اللوحة / dashboard UI |
| `GET` | `/api/status` | كل شيء: نسخة، جلسات، بادئة، مميزات، أرقام المالكين، إحصائيات DB، الرام، الرابط |
| `GET` | `/api/chats?limit=25` | آخر المحادثات مع عدد الرسائل وآخر وقت |
| `GET` | `/api/messages?limit=50&chatId=&q=` | سجل الرسائل مع فلترة/بحث |
| `GET` | `/api/replies` · `/api/reactions` · `/api/bans` · `/api/reminders` · `/api/events` · `/api/settings` | قراءة القوائم |
| `GET` | `/api/qr` | رموز QR المعلّقة (نص + ASCII جاهز للرسم) |
| `POST` | `/api/action/replies/add?keyword=&reply=&scope=` | إضافة رد آلي |
| `POST` | `/api/action/replies/delete?id=` | حذف رد |
| `POST` | `/api/action/reactions/add?keyword=&emoji=` · `.../delete?id=` | تفاعلات |
| `POST` | `/api/action/bans/add?user=` · `.../remove?user=` | حظر/رفع حظر |
| `POST` | `/api/action/settings/maintenance?on=1\|0` | وضع الصيانة |
| `POST` | `/api/action/reminders/delete?id=` · `/api/action/events/delete?id=` | حذف تذكير/جدول |
| `POST` | `/api/action/session/reconnect?session=default&confirm=RECONNECT` | ⚠️ حذف الجلسة وبدء QR جديد (يلزم `confirm=RECONNECT`) |

```bash
# مثال سريع / quick example
curl "https://<name>.up.railway.app/api/status?token=<TOKEN>" | jq '.connectedToWhatsApp, .stats'
```

> كل الإجراءات تقبل **POST** (وتقبل GET للتوافق مع النسخ القديمة). كل ردود JSON بـ `charset=utf-8`.

---

## 🩺 حل المشاكل / Troubleshooting

<div dir="rtl">

| العَرَض | السبب | الحل |
|---|---|---|
| `Cannot derive from empty media key` في السجلات | رسائل قديمة من مزامنة السجل بعد كل اتصال | ✅ مُعالَج: البوت يتجاهل `type !== 'notify'` |
| الصور لا تُحفظ/لا تُنزّل | مفتاح نوع الرسالة كان `messageContextInfo` | ✅ مُعالَج: `getRealMessageType()` يتجاهل المفاتيح غير المحتوى |
| `MessageCounterError` أو `status 428` عند إعادة النشر | مفاتيح جلسة قديمة/تالفة | احذف `session/<name>` ثم `!اعادةربط`/أعد النشر وامسح QR جديد |
| البوت يطلب QR بعد كل deploy | مجلد الجلسة على قرص متقلب | Volume (القسم السابق) أو MongoDB auth state |
| البطاقة الترحيبية لا تُرسل / `canvas` يفشل | مكتبات نظام ناقصة أو بناء بطيء | `nixpacks.toml` يعالج Railway؛ محلياً ثبّت libcairo2-dev/libpango |
| `!ايدي` يقول "لست أدمن" رغم أنه رقمك | واتساب يرسل معرّف `@lid` | ضع الأرقام الظاهرة في `SECOND_ADMIN_NUMBER` |
| أوامر الإدارة لا تنفذ في مجموعة | البوت ليس مشرفاً | البوت ينبّهك تلقائياً — رقّيه (مشرف = القادر على `!قفل`/`!طرد`) |
| لا يرد على أحد | `!صيانة` مفعّل، أو البوت موقوف للمحادثة (`!إيقاف-بوت`)، أو المستخدم محظور | `!صيانة` للإيقاف، `!تفعيل-بوت`، `!رفع-حظر` |
| `!انمي` بلا صورة | AniList rate limit أو انقطاع | طبيعي — يُخزَّن مؤقتاً للأبد في `character_image_cache` ويُعاد المحاولة لاحقاً |
| `⚠️ تعذر جلب قائمة الأنميات` | Jikan يرجع 429/502/503 بكثرة | مُعالَج بإعادة محاولة؛ أعد الطلب بعد دقيقة |
| التذكيرات/النشرات لا تصل | `ENABLE_SCHEDULER=false` أو المنصة توقف الخدمة | فعّلها؛ وتأكد أن الخدمة لا تنام (خطة Railway المدفوعة/إبقاء الخدمة حية) |
| اللوحة تعمل محلياً لا على الإنترنت | لا يوجد نطاق عام | Generate Domain (الطريقة ③) |
| `EADDRINUSE` | منفذ مشغول | غيّر `DASHBOARD_PORT` (محلياً) أو أوقف العملية الأخرى |
| المنفذ في اللوحة لا يطابق الرابط | ضبطت `DASHBOARD_PORT` و`PORT` معاً على Railway | احذف `DASHBOARD_PORT` — الأولوية لـ `PORT` |
| الرقم محظور من واتساب | استخدام رقم أساسي + كثرة رسائل | رقم احتياطي، رسائل أبطأ، بدون بث جماعي |

</div>

> **EN — quick map:** *empty media key / old messages* → fixed by ignoring non-`notify` upserts. *Images not downloaded* → fixed by real content-type detection. *`MessageCounterError` / `428`* → delete the session folder, `!reconnect`, scan again. *QR asked after every deploy* → volume or MongoDB auth state. *`!whoami` not admin* → WhatsApp `@lid` ID, paste the printed digits into `SECOND_ADMIN_NUMBER`. *Admin commands fail in a group* → bot isn't an admin. *No replies at all* → maintenance mode / bot disabled for that chat / user banned. *Anime data flaky* → Jikan/AniList rate limits, retried automatically. *Scheduling silent* → scheduler disabled or the platform sleeps your service. *Dashboard unreachable* → no public domain. *Port mismatch* → don't set `DASHBOARD_PORT` alongside Railway's `PORT`. *Number banned* → use a spare number and message less aggressively.

---

## 🗂️ بنية المشروع / Project Structure

```text
w-bot/
├── nixpacks.toml              # إعداد البناء على Railway (مكتبات canvas + أمر البدء)
├── railpack.json              # نفس الإعداد بمبني Railpack (المبني الافتراضي الجديد لـ Railway)
├── package.json               # scripts: start / dev / dashboard / test
├── .env.example               # كل المتغيرات موثّقة (عربي + إنجليزي)
├── bot.db                     # قاعدة SQLite (تُنشأ تلقائياً)
├── media_store/               # وسائط مُنزّلة (تنظيف تلقائي بعد 24 ساعة)
├── session/<name>/            # بيانات اعتماد Baileys لكل جلسة (متجاهَل في git)
├── test/db.test.js            # اختبار الردود ورسائل الترحيب
└── src/
    ├── index.js               # 👈 نقطة الدخول: يشغّل اللوحة ثم الجلسات
    ├── config.js              # كل الإعدادات + buildPublicUrl()
    ├── runtimeState.js        # حالة الجلسات + رموز QR (يكسر حلقة الاستيراد)
    ├── sessionPaths.js        # 📂 مسارات الجلسة/القاعدة/الوسائط + اكتشاف Volume تلقائياً
    ├── sessionManager.js      # Baileys: اتصال، QR، إعادة اتصال، متعدد الجلسات
    ├── responses.json         # الردود المشتركة — عدّل هنا بدون كود
    ├── database/db.js         # طبقة SQLite (كل الجداول والدوال)
    ├── handlers/
    │   ├── messageHandler.js  # الردود الآلية، التسجيل، الحذف، التعديل، الروابط، الترحيب
    │   ├── commandHandler.js  # 📋 سجل الأوامر (هنا تُسجّل أوامرك الجديدة)
    │   └── deleteHandler.js   # استرجاع الرسائل المحذوفة
    ├── commands/              # ملف لكل فئة أوامر
    │   ├── ping.js  info.js  whoami.js  developer.js
    │   ├── fun.js  games.js  extras.js  sticker.js
    │   ├── islamic.js  animeNews.js  utils.js  reminder.js
    │   └── groupAdmin.js  admin.js  owner.js
    ├── scheduler/
    │   ├── events.js          # cron: آية، أذكار، نشرة أنمي، تذكيرات، جداول ديناميكية
    │   └── cleanup.js         # تنظيف media_store/tmp يومياً 4 صباحاً
    ├── utils/
    │   ├── logger.js          # pino (pino-pretty في التطوير)
    │   ├── responses.js       # قارئ responses.json + ردود عشوائية
    │   └── welcomeCard.js     # بطاقة الترحيب بـ Canvas
    └── web/
        ├── app.js             # 🧩 خادم اللوحة + API + التوكن + QR
        ├── index.html         # واجهة اللوحة (RTL/LTR، عربي/إنجليزي، تبويبات + QR)
        ├── standalone.js      # `npm run dashboard` — اللوحة بدون بوت
        └── dashboard.js       # ملف توافقية يحوّل إلى app.js
```

### 🗄️ جداول قاعدة البيانات / SQLite schema

| الجدول | يحفظ / Stores |
|---|---|
| `messages` | كل رسالة: id, chat_id, sender_id, sender_name, نوع، نص، مسار وسائط، وقت، `is_deleted` |
| `last_seen` | آخر ظهور لكل عضو في كل محادثة |
| `custom_replies` | الردود المخصصة (keyword, reply, scope=all/group/private) |
| `custom_reactions` | تفاعلات الإيموجي (keyword, emoji) |
| `welcome_messages` | رسالة ترحيب كل مجموعة + مسار صورة |
| `chat_settings` | لكل مجموعة: `anti_link`, `welcome_enabled`, `anti_edit` (يُضاف العمود تلقائياً للجداول القديمة) |
| `global_settings` | إعدادات عامة مثل `maintenance_mode` |
| `scheduled_events` | جداول cron للمجموعات (قد تحمل `COMMAND:lock` / `COMMAND:unlock`) |
| `islamic_schedule` | جداول الآية/الذكر لكل محادثة |
| `anime_newsletter` | المشتركون في نشرة الأنمي |
| `reminders` | التذكيرات (target_jid, text, remind_at, sent) |
| `banned_users` | المحظورون (user_id, banned_by, banned_at) |
| `game_states` | حالة اللعب لكل محادثة/لاعب (تخمين، trivia، تفكيك) |
| `bot_disabled_chats` | المحادثات التي أُوقف فيها البوت |
| `character_image_cache` | روابط صور الشخصيات (تخزين دائم يمنع تكرار الطلب) |

---

## 🛠️ كيف تضيف أمراً جديداً / Adding a new command

<div dir="rtl">

**ثلاث خطوات فقط:**

**1) أنشئ `src/commands/myCommand.js`:**

```js
const config = require('../config');
const responses = require('../utils/responses');

module.exports = async function myCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  // اختيارياً: اطلب صلاحية المالك/الأدمن
  const digits = (senderId || '').replace(/\D/g, '');
  const isAdmin = (config.adminNumbers || []).some((n) => n && digits.includes(n));
  if (!isAdmin) return sock.sendMessage(chatId, { text: responses.get('persona', 'denied_owner') }, { quoted: msg });

  await sock.sendMessage(chatId, { text: `أمر جديد! الوسائط: ${args.join(' ') || 'لا شيء'} 🍀` }, { quoted: msg });
};
```

**2) سجّله في `src/handlers/commandHandler.js`:**

```js
const commands = {
  // ...
  'أمر-جديد': require('../commands/myCommand'),
  'newcmd': require('../commands/myCommand'),
};
```

**3) لا تنسَ تحديث `.مساعدة` في `src/commands/info.js` و README هنا.**

**قواعد مهمة مبنية على أخطاء سابقة في هذا المستودع:**
- ❌ لا تستورد `sessionManager` في أعلى ملف أوامر (حلقة استيراد) — استخدم `../runtimeState` و `../sessionPaths`، أو `require` داخل الدالة.
- ✅ كل الأوامر تُنسّب عبر `commandKey`؛ اكتب فرعاً لكل اسم مسجّل وإلا سيكون الاسم **ميتاً** (حدث هذا مع `لوحة` و `ضد_التعديل` و `أفكاري` قبل إصلاحها).
- ✅ جداول جديدة → أنشئها في `src/database/db.js` بـ `CREATE TABLE IF NOT EXISTS`.
- ✅ الردود المشتركة → ضعها في `src/responses.json` (تدعم مصفوفة نصوص لاختيار عشوائي).
- ✅ لا ترمِ استثناءات غير ملتقطة داخل الأوامر — الـ handler يلتقطها ويرد برسالة خطأ عامة.

</div>

> **EN:** Create the file in `src/commands/`, register one key **per alias** in `handlers/commandHandler.js` (an unregistered or unhandled key is a dead command — that's how `لوحة`, `ضد_التعديل` and `أفكاري` were silently broken), and update `info.js` + this README. Don't `require('../sessionManager')` at the top of a command file (circular import); use `runtimeState`/`sessionPaths` or a lazy require. New tables: `CREATE TABLE IF NOT EXISTS` in `database/db.js`. Shared texts: `src/responses.json` (arrays = random pick).

---

## 🧠 ملخّص ذكي للمشروع / AI Summary

<div dir="rtl">

انسخ هذا الصندوق لأي مساعد برمجي حتى يفهم المشروع فوراً (محدّث بتاريخ هذا الملف):

</div>

```text
Project: "Asta WhatsApp Bot" (w-bot) — Arabic-first WhatsApp bot, Black Clover theme.
Stack: Node.js 20+, CommonJS, no framework. @whiskeysockets/baileys (unofficial WhatsApp),
better-sqlite3 (SQLite at repo root: bot.db), node-cron, canvas (welcome cards),
wa-sticker-formatter, pino. Zero-dependency HTTP dashboard (src/web/app.js) — no Express.

Entry: src/index.js starts the dashboard FIRST (binds process.env.PORT), then
startAllSessions() from src/sessionManager.js. Both used to be commented out — that is
the historical reason "no dashboard URL on Railway"; now enabled via ENABLE_DASHBOARD (default true).

Key modules:
- src/config.js: prefix, owners (OWNER_NUMBER, SECOND_ADMIN_NUMBER, EXTRA_OWNER_NUMBERS ->
  config.adminNumbers used by every permission check), features flags, buildPublicUrl()
  (DASHBOARD_PUBLIC_URL > RAILWAY_PUBLIC_DOMAIN > RAILWAY_STATIC_URL > localhost).
- src/runtimeState.js: active sockets + latest QR per session (created to break the
  circular require sessionManager -> handlers -> commands/admin -> sessionManager).
- src/sessionPaths.js: session names/base dir (SESSION_NAMES, SESSION_BASE_DIR).
- src/handlers/commandHandler.js: the single command registry (123 aliases, AR + EN).
  Commands = one async fn per file receiving {sock,msg,args,chatId,senderId,commandKey}.
- src/handlers/messageHandler.js: ignores non-'notify' upserts (fixes "Cannot derive from
  empty media key"), getRealMessageType() skips messageContextInfo (fixes media not
  downloading), anti-delete, anti-edit (protocolMessage 14, per-chat toggle), anti-link,
  custom replies/reactions, welcome cards (stubType 27/28), self-command execution from
  the bot's own number, group/private parity, ban + maintenance gating.
- src/database/db.js: 15 tables, all CREATE TABLE IF NOT EXISTS; auto ALTER for chat_settings.anti_edit.
- src/scheduler/events.js: built-in cron (verse 07:00, athkar 17:00, anime news 09:00),
  DB-driven dynamic schedules (invalid cron is skipped, not fatal), reminders every minute.
- src/web/app.js: token auth (DASHBOARD_TOKEN, timing-safe; cookie/Bearer/query), open
  /health for Railway healthchecks, /api/* read endpoints, /api/action/<name> mutations,
  /api/qr renders a scannable ASCII QR from qrcode-terminal, /api/action/session/reconnect
  requires confirm=RECONNECT. Dashboard UI: src/web/index.html (RTL, AR/EN toggle, vanilla JS).

Ops notes: canvas needs system libs on Railway (provided by nixpacks.toml: cairo, pango,
libjpeg, giflib, pixman, python3, pkg-config). Ephemeral FS wipes session/ and bot.db on
redeploy → attach a Railway Volume (SESSION_BASE_DIR=/app/data/session) or switch to
useMongoDBAuthState. Never commit session/. Railway exposes the app only after
Settings → Networking → Public Networking → Generate Domain (port must match the port the
app binds); redeploy afterwards so RAILWAY_PUBLIC_DOMAIN is injected and buildPublicUrl() is right.
User-facing command for the URL: `.لوحة` / `.dashboard` (owner-only).

Style rules: keep everything modular, Arabic persona messages enthusiastic ("تجاوز حدودك
هنا والآن!"), shared texts in responses.json, and always re-check commandHandler.js alias
registration when touching commands (several commands existed but were never routed).
```

---

## 👨‍💻 عن المطور / About the developer

<div dir="rtl">

هذا البوت من تصميم وتطوير **يوسف (Eng.Yousef)** — كل سطر فيه كُتب بنفس روح أستا: لا استسلام.

- 🌐 الموقع: **[engyusef.alpha-code.net](https://engyusef.alpha-code.net)**
- 📱 واتساب مباشر: **wa.me/967784609423**
- 💬 من داخل البوت: `!تواصل`

</div>

> **EN:** Built with love by **Eng.Yousef** · [engyusef.alpha-code.net](https://engyusef.alpha-code.net) · `wa.me/967784609423` · in-bot: `!developer`.

---

## 📜 الترخيص / License

<div dir="rtl">

لا يوجد ملف ترخيص في المستودع — الاستخدام تجاري أو إعادة نشر باسم آخر يحتاج إذن المالك أولاً.
استخدم رقم تجربي، وتحمل مسؤولية حسابك.

</div>

> **EN:** No license file is present in this repository; ask the owner before commercial use or re-publishing. Use a test number — your account, your responsibility.

---

<div align="center">

🍀 **تجاوز حدودك هنا والآن!** / *Beyond your limits, right here, right now!*

⚔️ أستا لن يستسلم — وأستا الآن يعرف كيف يخبرك برابط لوحته ⚔️

</div>

</div>
