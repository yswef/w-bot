const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');

const logger = require('./utils/logger');
const handleIncomingMessages = require('./handlers/messageHandler');
const handleMessageUpdates = require('./handlers/deleteHandler');
const startScheduler = require('./scheduler/events');

async function startBot() {
  // بيانات الجلسة تُحفظ في مجلد session/ عشان ما تسوي مسح QR كل مرة تشغّل البوت
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, '..', 'session')
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // نتحكم بطباعة الـ QR يدوياً تحت
    logger: require('pino')({ level: 'silent' }), // نطفي لوق Baileys الداخلي، عندنا اللوقر الخاص فينا
    browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
  });

  // ---- الاتصال وحالة QR / إعادة الاتصال ----
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('امسح كود QR التالي بواتساب (الأجهزة المرتبطة > ربط جهاز):');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(`انقطع الاتصال. إعادة اتصال؟ ${shouldReconnect}`);
      if (shouldReconnect) {
        startBot();
      } else {
        logger.error('تم تسجيل الخروج. احذف مجلد session/ وشغّل البوت من جديد لعمل ربط جديد.');
      }
    } else if (connection === 'open') {
      logger.info('✅ تم الاتصال بواتساب بنجاح! البوت شغّال الحين.');
    }
  });

  // حفظ بيانات الجلسة كل ما تتحدث
  sock.ev.on('creds.update', saveCreds);

  // الرسائل الجديدة الواردة/الصادرة
  sock.ev.on('messages.upsert', (payload) => handleIncomingMessages(payload, sock));

  // تحديثات الرسائل (يشمل الحذف)
  sock.ev.on('messages.update', (updates) => handleMessageUpdates(updates, sock));

  // تشغيل الفعاليات المجدولة بعد الاتصال
  startScheduler(sock);

  return sock;
}

// شبكة أمان: لو صار خطأ غير متوقع ما نخلي العملية كلها توقف
process.on('unhandledRejection', (err) => {
  logger.error('خطأ غير متوقع (unhandledRejection): ' + err);
});

startBot().catch((err) => {
  logger.error('فشل تشغيل البوت: ' + err.message);
});
