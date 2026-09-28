// اختبارات معالج الرسائل المعدَّلة والمحذوفة
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  saveMessage,
  getMessage,
  getEditHistory,
  setChatSetting,
} = require('../src/database/db');
const { handleEditFromUpsert, handleEditFromUpdate, parseEdit } = require('../src/handlers/editHandler');

// سوكيت وهمي يسجّل الرسائل المُرسلة بدل إرسالها فعلياً
function fakeSock() {
  const sent = [];
  return {
    sent,
    user: { id: '967700000000:1@s.whatsapp.net' },
    sendMessage: async (chatId, content) => {
      sent.push({ chatId, content });
      return { key: { id: 'sent-' + sent.length } };
    },
  };
}

const CHAT = '120363111111111111@g.us';
const SENDER = '967711111111@s.whatsapp.net';

function seedOriginal(id, text) {
  saveMessage({
    id,
    chat_id: CHAT,
    sender_id: SENDER,
    sender_name: 'يوسف',
    message_type: 'conversation',
    text_content: text,
    media_path: null,
    timestamp: Date.now(),
  });
}

test('parseEdit يتعرف على protocolMessage من النوع 14', () => {
  const parsed = parseEdit({
    protocolMessage: {
      type: 14,
      key: { id: 'ABC' },
      editedMessage: { conversation: 'النص الجديد' },
    },
  });
  assert.equal(parsed.originalId, 'ABC');
  assert.equal(parsed.newText, 'النص الجديد');
});

test('parseEdit يرجع null للرسائل العادية', () => {
  assert.equal(parseEdit({ conversation: 'رسالة عادية' }), null);
});

test('تعديل عبر upsert: يعرض النص قبل وبعد ويحفظه في قاعدة البيانات', async () => {
  const id = 'MSG_UPSERT_' + Date.now();
  seedOriginal(id, 'النص الأصلي');
  setChatSetting(CHAT, 'anti_edit', true);

  const sock = fakeSock();
  const handled = await handleEditFromUpsert({
    key: { remoteJid: CHAT, participant: SENDER, fromMe: false, id: 'wrapper' },
    pushName: 'يوسف',
    message: {
      protocolMessage: { type: 14, key: { id }, editedMessage: { conversation: 'النص بعد التعديل' } },
    },
  }, sock);

  assert.equal(handled, true, 'يجب أن يُعالَج كرسالة تعديل');
  assert.equal(sock.sent.length, 1, 'يجب إرسال تنبيه واحد');

  const body = sock.sent[0].content.text;
  assert.match(body, /تم تعديل رسالة/);
  assert.match(body, /النص الأصلي/, 'يجب أن يظهر النص قبل التعديل');
  assert.match(body, /النص بعد التعديل/, 'يجب أن يظهر النص بعد التعديل');

  const history = getEditHistory(id);
  assert.equal(history.length, 1);
  assert.equal(history[0].old_text, 'النص الأصلي');
  assert.equal(history[0].new_text, 'النص بعد التعديل');

  // الرسالة المحفوظة تُحدَّث للنسخة الأحدث وتُعلَّم كمعدَّلة
  const stored = getMessage(id);
  assert.equal(stored.text_content, 'النص بعد التعديل');
  assert.equal(stored.is_edited, 1);
});

test('تعديل عبر update: يعمل أيضاً (المسار الذي كان مفقوداً تماماً)', async () => {
  const id = 'MSG_UPDATE_' + Date.now();
  seedOriginal(id, 'قبل');
  const sock = fakeSock();

  const handled = await handleEditFromUpdate({
    key: { remoteJid: CHAT, id, participant: SENDER },
    update: {
      message: { protocolMessage: { type: 14, key: { id }, editedMessage: { conversation: 'بعد' } } },
    },
  }, sock);

  assert.equal(handled, true);
  assert.match(sock.sent[0].content.text, /قبل/);
  assert.match(sock.sent[0].content.text, /بعد/);
});

test('لا يُبلَّغ عن نفس التعديل مرتين (upsert + update معاً)', async () => {
  const id = 'MSG_DUP_' + Date.now();
  seedOriginal(id, 'أصلي');
  const sock = fakeSock();

  const payload = {
    key: { remoteJid: CHAT, participant: SENDER, fromMe: false },
    message: { protocolMessage: { type: 14, key: { id }, editedMessage: { conversation: 'معدّل' } } },
  };
  await handleEditFromUpsert(payload, sock);
  await handleEditFromUpsert(payload, sock);

  assert.equal(sock.sent.length, 1, 'التكرار يجب أن يُتجاهل');
});

test('عند إيقاف ضد_التعديل: لا يُرسل تنبيه لكن يبقى التسجيل', async () => {
  const quietChat = '120363999999999999@g.us';
  const id = 'MSG_QUIET_' + Date.now();
  saveMessage({
    id, chat_id: quietChat, sender_id: SENDER, sender_name: 'يوسف',
    message_type: 'conversation', text_content: 'صامت', media_path: null, timestamp: Date.now(),
  });
  setChatSetting(quietChat, 'anti_edit', false);

  const sock = fakeSock();
  await handleEditFromUpsert({
    key: { remoteJid: quietChat, participant: SENDER, fromMe: false },
    message: { protocolMessage: { type: 14, key: { id }, editedMessage: { conversation: 'صامت معدّل' } } },
  }, sock);

  assert.equal(sock.sent.length, 0, 'لا تنبيه عند الإيقاف');
  assert.equal(getEditHistory(id).length, 1, 'لكن التعديل يُسجَّل للوحة التحكم');
});

test('تعديل من رقم البوت نفسه (fromMe) يُرصد أيضاً', async () => {
  const id = 'MSG_SELF_' + Date.now();
  seedOriginal(id, 'رسالتي');
  const sock = fakeSock();

  const handled = await handleEditFromUpsert({
    key: { remoteJid: CHAT, fromMe: true },
    message: { protocolMessage: { type: 14, key: { id }, editedMessage: { conversation: 'رسالتي بعد التعديل' } } },
  }, sock);

  assert.equal(handled, true);
  assert.match(sock.sent[0].content.text, /أنت/);
});
