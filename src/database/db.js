const Database = require('better-sqlite3');
const path = require('path');

// قاعدة بيانات محلية بسيطة - تُنشأ تلقائياً أول مرة
const db = new Database(path.join(__dirname, '..', '..', 'bot.db'));

db.pragma('journal_mode = WAL');

// جدول لتخزين كل رسالة توصل (نصوص + وسائط) عشان نقدر نعيد إرسالها لو انحذفت
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    message_type TEXT,
    text_content TEXT,
    media_path TEXT,
    timestamp INTEGER,
    is_deleted INTEGER DEFAULT 0
  )
`);

// جدول بسيط لتخزين الفعاليات المجدولة (اختياري لو تبي تضيفها ديناميكياً بدل الكود)
db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    message TEXT NOT NULL,
    active INTEGER DEFAULT 1
  )
`);

function saveMessage(msg) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO messages
    (id, chat_id, sender_id, sender_name, message_type, text_content, media_path, timestamp, is_deleted)
    VALUES (@id, @chat_id, @sender_id, @sender_name, @message_type, @text_content, @media_path, @timestamp, 0)
  `);
  stmt.run(msg);
}

function markDeleted(id) {
  db.prepare(`UPDATE messages SET is_deleted = 1 WHERE id = ?`).run(id);
}

function getMessage(id) {
  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id);
}

module.exports = { db, saveMessage, markDeleted, getMessage };
