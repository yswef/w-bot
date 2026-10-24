const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

// sharp غير مثبت في بيئة الاختبار: نستبدل وحدة الملصقات بوهمية
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'wa-sticker-formatter' || request === 'sharp') {
    return new Proxy(function () {}, { get: () => () => ({}), apply: () => ({}) });
  }
  return origLoad.call(this, request, ...rest);
};
after(() => { Module._load = origLoad; });

const root = path.join(__dirname, '..');
const db = require(path.join(root, 'src/database/db'));
const handleMessages = require(path.join(root, 'src/handlers/messageHandler'));
const handleUpdates = require(path.join(root, 'src/handlers/deleteHandler'));

const { db: raw } = db;
const OWNER = '967784609423@s.whatsapp.net'; // من الإعدادات كمالك ومطوّر
const MEMBER = '967700000001@s.whatsapp.net';
const SELF = '967784609423:7@s.whatsapp.net';
const GROUP = 'pipeline-test@g.us';
const DM = '967700000001@s.whatsapp.net';
const IDS = ['PT_OWN_DM', 'PT_OWN_EDIT', 'PT_MEMBER_G', 'PT_REV_MEMBER', 'PT_OWNER_G', 'PT_REV_OWNER', 'PT_KM1', 'PT_KM2', 'PT_DUP', 'PT_APPEND'];

function cleanup() {
  for (const id of IDS) {
    raw.prepare('DELETE FROM messages WHERE id = ?').run(id);
    raw.prepare('DELETE FROM message_edits WHERE message_id = ?').run(id);
  }
  raw.prepare("DELETE FROM custom_replies WHERE keyword = 'كم'").run();
  raw.prepare('DELETE FROM user_points WHERE chat_id = ?').run(GROUP);
}

function makeSock() {
  const sent = [];
  return {
    sent,
    user: { id: SELF },
    sendMessage: async (jid, content) => { sent.push({ jid, text: content.text || '', image: content.image }); return {}; },
    updateMediaMessage: async () => {},
  };
}

cleanup();
after(cleanup);

test('المالك يكتب في الخاص ثم يعدّل: يُحفظ النص الأصلي ويُعلن التعديل', async () => {
  const sock = makeSock();
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: DM, fromMe: true, id: 'PT_OWN_DM' }, message: { conversation: 'النص الأول' }, pushName: 'أنا' }] }, sock);
  assert.equal(db.getMessage('PT_OWN_DM').text_content, 'النص الأول');

  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: DM, fromMe: true, id: 'PT_OWN_EDIT' }, message: { protocolMessage: { type: 14, key: { remoteJid: DM, fromMe: true, id: 'PT_OWN_DM' }, editedMessage: { conversation: 'النص المعدّل' } } } }] }, sock);
  const edit = raw.prepare('SELECT old_text, new_text FROM message_edits WHERE message_id = ?').get('PT_OWN_DM');
  assert.deepEqual(edit, { old_text: 'النص الأول', new_text: 'النص المعدّل' });
  assert.ok(sock.sent.some((m) => m.text.includes('تم تعديل') && m.text.includes('النص الأول')));
});

test('حذف عضو عادي يُعلن عنه، وحذف المالك لا يُعلن', async () => {
  const sock = makeSock();
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: GROUP, fromMe: false, id: 'PT_MEMBER_G', participant: MEMBER }, message: { conversation: 'رسالة عضو' }, pushName: 'عضو' }] }, sock);
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: GROUP, fromMe: false, id: 'PT_REV_MEMBER', participant: MEMBER }, message: { protocolMessage: { type: 0, key: { remoteJid: GROUP, fromMe: false, id: 'PT_MEMBER_G', participant: MEMBER } } } }] }, sock);
  assert.ok(sock.sent.some((m) => m.text.includes('رسالة محذوفة') && m.text.includes('رسالة عضو')));

  const owner = makeSock();
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: GROUP, fromMe: true, id: 'PT_OWNER_G' }, message: { conversation: 'رسالة المالك السرية' }, pushName: 'المالك' }] }, owner);
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: GROUP, fromMe: true, id: 'PT_REV_OWNER' }, message: { protocolMessage: { type: 0, key: { remoteJid: GROUP, fromMe: true, id: 'PT_OWNER_G' } } } }] }, owner);
  assert.equal(owner.sent.length, 0, 'لا إعلان عن حذف المالك');
  assert.equal(raw.prepare('SELECT is_deleted FROM messages WHERE id = ?').get('PT_OWNER_G').is_deleted, 0);
});

test('حذف رسالة مالك عبر messages.update لا يُعلن أيضاً', async () => {
  const sock = makeSock();
  await handleUpdates([{ key: { remoteJid: GROUP, fromMe: false, id: 'PT_OWNER_G', participant: MEMBER }, update: { message: null, messageStubType: 1 } }], sock);
  assert.equal(sock.sent.length, 0);
});

test('الكلمة "كم" لا تُطابق داخل "كمامة" وتُطابق ككلمة كاملة', async () => {
  raw.prepare("INSERT INTO custom_replies (keyword, reply, scope) VALUES ('كم', 'RESP_KM', 'all')").run();
  const sock = makeSock();
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: DM, fromMe: false, id: 'PT_KM1' }, message: { conversation: 'كمامة جديدة' }, pushName: 'x' }] }, sock);
  assert.equal(sock.sent.length, 0);
  await handleMessages({ type: 'notify', messages: [{ key: { remoteJid: DM, fromMe: false, id: 'PT_KM2' }, message: { conversation: 'كم السعر؟' }, pushName: 'x' }] }, sock);
  assert.equal(sock.sent.length, 1);
  assert.equal(sock.sent[0].text, 'RESP_KM');
});

test('إعادة تسليم نفس الرسالة لا تُنفِّذ الرد مرتين، وسجل المزامنة يُتجاهل', async () => {
  const sock = makeSock();
  const dup = { type: 'notify', messages: [{ key: { remoteJid: DM, fromMe: false, id: 'PT_DUP' }, message: { conversation: 'كم مرة' }, pushName: 'x' }] };
  await handleMessages(dup, sock);
  await handleMessages(dup, sock);
  assert.equal(sock.sent.length, 1);

  await handleMessages({ type: 'append', messages: [{ key: { remoteJid: DM, fromMe: false, id: 'PT_APPEND' }, message: { conversation: 'كم' }, pushName: 'x' }] }, sock);
  assert.equal(sock.sent.length, 1);
  raw.prepare("DELETE FROM custom_replies WHERE keyword = 'كم'").run();
});

test('النقاط: رسالة كل 5 ثوانٍ، والوسائط نقطتان', () => {
  const { awardForMessage } = require(path.join(root, 'src/services/points'));
  const chat = 'points-test@g.us'; // محادثة منفصلة حتى لا تتداخل مع اختبارات أخرى
  raw.prepare('DELETE FROM user_points WHERE chat_id = ?').run(chat);
  const a = awardForMessage({ chatId: chat, senderId: MEMBER, senderName: 'x', hasMedia: false, now: 1000 });
  const b = awardForMessage({ chatId: chat, senderId: MEMBER, senderName: 'x', hasMedia: false, now: 2000 });
  const c = awardForMessage({ chatId: chat, senderId: MEMBER, senderName: 'x', hasMedia: true, now: 9000 });
  raw.prepare('DELETE FROM user_points WHERE chat_id = ?').run(chat);
  assert.equal(a.awarded, true);
  assert.equal(b.awarded, false);
  assert.equal(c.points, 3);
});
