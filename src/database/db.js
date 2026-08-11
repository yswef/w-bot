const Database = require('better-sqlite3');
const path = require('path');

// قاعدة بيانات محلية بسيطة - تُنشأ تلقائياً أول مرة
const db = new Database(path.join(__dirname, '..', '..', 'bot.db'));

db.pragma('journal_mode = WAL');

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

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    message TEXT NOT NULL,
    active INTEGER DEFAULT 1
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS custom_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    reply TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'all'
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS welcome_messages (
    chat_id TEXT PRIMARY KEY,
    message TEXT,
    image_path TEXT,
    enabled INTEGER DEFAULT 1
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS last_seen (
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    last_seen INTEGER NOT NULL,
    PRIMARY KEY (chat_id, sender_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS game_states (
    chat_id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    state_data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_settings (
    chat_id TEXT PRIMARY KEY,
    anti_link INTEGER DEFAULT 0,
    welcome_enabled INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
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

function saveCustomReply({ keyword, reply, scope = 'all' }) {
  const stmt = db.prepare(`
    INSERT INTO custom_replies (keyword, reply, scope) VALUES (?, ?, ?)
  `);
  stmt.run(keyword, reply, scope);
}

function getCustomReplies(scope = 'all') {
  return db.prepare(`SELECT * FROM custom_replies WHERE scope = ? OR scope = 'all' ORDER BY id DESC`).all(scope);
}

function deleteCustomReply(id) {
  return db.prepare(`DELETE FROM custom_replies WHERE id = ?`).run(id);
}

function setWelcomeMessage({ chatId, message, imagePath, enabled = true }) {
  const stmt = db.prepare(`
    INSERT INTO welcome_messages (chat_id, message, image_path, enabled)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      message = excluded.message,
      image_path = excluded.image_path,
      enabled = excluded.enabled
  `);
  stmt.run(chatId, message, imagePath || null, enabled ? 1 : 0);
}

function getWelcomeMessage(chatId) {
  return db.prepare(`SELECT * FROM welcome_messages WHERE chat_id = ?`).get(chatId) || null;
}

function saveLastSeen({ chatId, senderId, lastSeen = Date.now() }) {
  const stmt = db.prepare(`
    INSERT INTO last_seen (chat_id, sender_id, last_seen)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, sender_id) DO UPDATE SET last_seen = excluded.last_seen
  `);
  stmt.run(chatId, senderId, lastSeen);
}

function getLastSeen(chatId, senderId) {
  return db.prepare(`SELECT * FROM last_seen WHERE chat_id = ? AND sender_id = ?`).get(chatId, senderId);
}

function getRecentChats(limit = 20) {
  return db.prepare(`
    SELECT chat_id, MAX(timestamp) as last_timestamp
    FROM messages
    GROUP BY chat_id
    ORDER BY last_timestamp DESC
    LIMIT ?
  `).all(limit);
}

function getLatestMessageForChat(chatId) {
  return db.prepare(`
    SELECT * FROM messages
    WHERE chat_id = ?
    ORDER BY timestamp DESC, id DESC
    LIMIT 1
  `).get(chatId);
}

function setGameState(chatId, gameType, stateData) {
  const stmt = db.prepare(`
    INSERT INTO game_states (chat_id, game_type, state_data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      game_type = excluded.game_type,
      state_data = excluded.state_data,
      updated_at = excluded.updated_at
  `);
  stmt.run(chatId, gameType, JSON.stringify(stateData), Date.now());
}

function getGameState(chatId) {
  const row = db.prepare(`SELECT * FROM game_states WHERE chat_id = ?`).get(chatId);
  if (row) {
    row.state_data = JSON.parse(row.state_data);
  }
  return row;
}

function clearGameState(chatId) {
  db.prepare(`DELETE FROM game_states WHERE chat_id = ?`).run(chatId);
}

function getChatSettings(chatId) {
  const row = db.prepare(`SELECT * FROM chat_settings WHERE chat_id = ?`).get(chatId);
  return row || { anti_link: 0, welcome_enabled: 0 };
}

function setChatSetting(chatId, key, value) {
  const validKeys = ['anti_link', 'welcome_enabled'];
  if (!validKeys.includes(key)) return;
  db.prepare(`
    INSERT INTO chat_settings (chat_id, ${key})
    VALUES (?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET ${key} = excluded.${key}
  `).run(chatId, value ? 1 : 0);
}

function getGlobalSetting(key) {
  const row = db.prepare(`SELECT value FROM global_settings WHERE key = ?`).get(key);
  return row ? row.value : null;
}

function setGlobalSetting(key, value) {
  db.prepare(`
    INSERT INTO global_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

module.exports = {
  db,
  saveMessage,
  markDeleted,
  getMessage,
  saveCustomReply,
  getCustomReplies,
  deleteCustomReply,
  setWelcomeMessage,
  getWelcomeMessage,
  saveLastSeen,
  getLastSeen,
  getRecentChats,
  getLatestMessageForChat,
  setGameState,
  getGameState,
  clearGameState,
  getChatSettings,
  setChatSetting,
  getGlobalSetting,
  setGlobalSetting
};
