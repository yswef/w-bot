const test = require('node:test');
const assert = require('node:assert/strict');
const { saveCustomReply, getCustomReplies, setWelcomeMessage, getWelcomeMessage } = require('../src/database/db');

test('save and retrieve custom replies', () => {
  saveCustomReply({ keyword: 'مرحبا', reply: 'أهلًا بك', scope: 'all' });
  const replies = getCustomReplies('all');
  assert.ok(replies.some((item) => item.keyword === 'مرحبا' && item.reply === 'أهلًا بك'));
});

test('save and retrieve welcome message', () => {
  setWelcomeMessage({ chatId: '120363000000000000@g.us', message: 'مرحبًا بالعضو الجديد', imagePath: 'media/test.png' });
  const welcome = getWelcomeMessage('120363000000000000@g.us');
  assert.equal(welcome.message, 'مرحبًا بالعضو الجديد');
  assert.equal(welcome.imagePath, 'media/test.png');
});
