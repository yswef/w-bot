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
    welcome_enabled INTEGER DEFAULT 0,
    anti_edit INTEGER DEFAULT 1
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

// =============================================
// 🔧 ترحيل تلقائي للأعمدة الجديدة على قواعد البيانات القديمة
// (SQLite لا يضيف الأعمدة الجديدة لجدول موجود مسبقاً، فنضيفها يدوياً)
// =============================================
function ensureColumn(table, column, definition) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    // لا نوقف البوت بسبب فشل ترحيل واحد
    console.error(`[db] تعذر إضافة العمود ${column} إلى ${table}: ${err.message}`);
  }
}

ensureColumn('chat_settings', 'anti_edit', 'INTEGER DEFAULT 1');
ensureColumn('messages', 'is_edited', 'INTEGER DEFAULT 0');
ensureColumn('messages', 'edit_count', 'INTEGER DEFAULT 0');

// =============================================
// ✏️ سجل الرسائل المعدَّلة (Edited messages log)
// يحفظ النص قبل التعديل وبعده حتى يظهر للمستخدم ويبقى في لوحة التحكم
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS message_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT,
    old_text TEXT,
    new_text TEXT,
    edited_at INTEGER NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_message_edits_msg ON message_edits (message_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_chat_time ON messages (chat_id, timestamp DESC)`);

function recordMessageEdit({ messageId, chatId, senderId, senderName, oldText, newText }) {
  db.prepare(`
    INSERT INTO message_edits (message_id, chat_id, sender_id, sender_name, old_text, new_text, edited_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(messageId, chatId, senderId || null, senderName || null, oldText || null, newText || null, Date.now());

  // نحدّث النص المحفوظ للنسخة الأحدث مع تعليم الرسالة كمعدّلة
  db.prepare(`
    UPDATE messages
    SET text_content = ?, is_edited = 1, edit_count = COALESCE(edit_count, 0) + 1
    WHERE id = ?
  `).run(newText || null, messageId);
}

function getEditHistory(messageId) {
  return db.prepare(`SELECT * FROM message_edits WHERE message_id = ? ORDER BY edited_at ASC`).all(messageId);
}

function getRecentEdits(limit = 50) {
  return db.prepare(`SELECT * FROM message_edits ORDER BY edited_at DESC LIMIT ?`).all(limit);
}

function getRecentDeleted(limit = 50) {
  return db.prepare(`SELECT * FROM messages WHERE is_deleted = 1 ORDER BY timestamp DESC LIMIT ?`).all(limit);
}

function getRecentMessages(limit = 50) {
  return db.prepare(`SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?`).all(limit);
}

function getMessagesForChat(chatId, limit = 50) {
  return db.prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?`).all(chatId, limit);
}

// إحصائيات عامة تُعرض في لوحة التحكم وفي أمر .احصائيات
function getStats() {
  const one = (sql, ...params) => {
    try { return db.prepare(sql).get(...params)?.n ?? 0; } catch { return 0; }
  };
  return {
    totalMessages: one(`SELECT COUNT(*) AS n FROM messages`),
    totalChats: one(`SELECT COUNT(DISTINCT chat_id) AS n FROM messages`),
    totalUsers: one(`SELECT COUNT(DISTINCT sender_id) AS n FROM messages`),
    deletedMessages: one(`SELECT COUNT(*) AS n FROM messages WHERE is_deleted = 1`),
    editedMessages: one(`SELECT COUNT(*) AS n FROM message_edits`),
    customReplies: one(`SELECT COUNT(*) AS n FROM custom_replies`),
    customReactions: one(`SELECT COUNT(*) AS n FROM custom_reactions`),
    bannedUsers: one(`SELECT COUNT(*) AS n FROM banned_users`),
    pendingReminders: one(`SELECT COUNT(*) AS n FROM reminders WHERE sent = 0`),
    scheduledEvents: one(`SELECT COUNT(*) AS n FROM scheduled_events WHERE active = 1`),
    messagesToday: one(`SELECT COUNT(*) AS n FROM messages WHERE timestamp >= ?`, Date.now() - 24 * 60 * 60 * 1000),
  };
}

// ⚠️ إصلاح: كان INSERT OR REPLACE يمسح أعمدة التعديل/الحذف عند إعادة حفظ نفس
// الرسالة. الآن الحفظ الأول يثبت، والإعادة لا تمسح النص المعدّل ولا حالة الحذف.
function saveMessage(msg) {
  const stmt = db.prepare(`
    INSERT INTO messages
    (id, chat_id, sender_id, sender_name, message_type, text_content, media_path, timestamp, is_deleted)
    VALUES (@id, @chat_id, @sender_id, @sender_name, @message_type, @text_content, @media_path, @timestamp, 0)
    ON CONFLICT(id) DO UPDATE SET
      media_path = COALESCE(excluded.media_path, messages.media_path)
  `);
  stmt.run(msg);
}

function hasMessage(id) {
  return !!db.prepare(`SELECT 1 FROM messages WHERE id = ?`).get(id);
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
  const row = db.prepare(`SELECT * FROM welcome_messages WHERE chat_id = ?`).get(chatId);
  if (!row) return null;
  // ⚠️ إصلاح: العمود في القاعدة اسمه image_path بينما بقية الكود (admin.js
  // والاختبارات) يقرأ imagePath، فكان مسار الصورة يضيع عند كل تحديث لرسالة
  // الترحيب. نُرجع الاسمين معاً للتوافق.
  return { ...row, imagePath: row.image_path };
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
  return row || { anti_link: 0, welcome_enabled: 0, anti_edit: 1 };
}

function setChatSetting(chatId, key, value) {
  const validKeys = ['anti_link', 'welcome_enabled', 'anti_edit'];
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

function addScheduledEvent(chatId, cronExpression, message) {
  const stmt = db.prepare(`INSERT INTO scheduled_events (chat_id, cron_expression, message, active) VALUES (?, ?, ?, 1)`);
  return Number(stmt.run(chatId, cronExpression, message).lastInsertRowid);
}

function getScheduledEvents() {
  return db.prepare(`SELECT * FROM scheduled_events WHERE active = 1`).all();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS custom_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    emoji TEXT NOT NULL
  )
`);

function saveCustomReaction({ keyword, emoji }) {
  const stmt = db.prepare(`INSERT INTO custom_reactions (keyword, emoji) VALUES (?, ?)`);
  stmt.run(keyword, emoji);
}

function getCustomReactions() {
  return db.prepare(`SELECT * FROM custom_reactions`).all();
}

function deleteCustomReaction(id) {
  return db.prepare(`DELETE FROM custom_reactions WHERE id = ?`).run(id);
}

// =============================================
// 🚫 نظام الحظر (Ban System)
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS banned_users (
    user_id TEXT PRIMARY KEY,
    banned_by TEXT,
    banned_at INTEGER
  )
`);

function banUser(userId, bannedBy) {
  db.prepare(`INSERT OR REPLACE INTO banned_users (user_id, banned_by, banned_at) VALUES (?, ?, ?)`)
    .run(userId, bannedBy, Date.now());
}

function unbanUser(userId) {
  return db.prepare(`DELETE FROM banned_users WHERE user_id = ?`).run(userId);
}

function isBanned(userId) {
  return !!db.prepare(`SELECT 1 FROM banned_users WHERE user_id = ?`).get(userId);
}

function getBannedUsers() {
  return db.prepare(`SELECT * FROM banned_users ORDER BY banned_at DESC`).all();
}

// =============================================
// ⏰ نظام التذكيرات (Reminders) - أمر !تذكير
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_jid TEXT NOT NULL,
    created_by TEXT,
    text TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    sent INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  )
`);

function addReminder({ targetJid, createdBy, text, remindAt }) {
  const stmt = db.prepare(`
    INSERT INTO reminders (target_jid, created_by, text, remind_at, sent, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `);
  const info = stmt.run(targetJid, createdBy, text, remindAt, Date.now());
  return info.lastInsertRowid;
}

// يجلب كل التذكيرات المستحقة (وقتها حان) ولم تُرسل بعد
function getDueReminders(now = Date.now()) {
  return db.prepare(`SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ?`).all(now);
}

function markReminderSent(id) {
  db.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`).run(id);
}

function getPendingReminders() {
  return db.prepare(`SELECT * FROM reminders WHERE sent = 0 ORDER BY remind_at ASC`).all();
}

function deleteReminder(id) {
  return db.prepare(`DELETE FROM reminders WHERE id = ?`).run(id);
}

// =============================================
// 🖼️ ذاكرة تخزين دائمة لصور شخصيات الأنمي (character_image_cache)
// حتى لا نُضطر لطلب نفس الشخصية أكثر من مرة واحدة عبر عمر البوت كله
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS character_image_cache (
    name TEXT PRIMARY KEY,
    image_url TEXT,
    updated_at INTEGER NOT NULL
  )
`);

function getCachedCharacterImage(name) {
  const row = db.prepare(`SELECT image_url FROM character_image_cache WHERE name = ?`).get(name);
  return row ? row.image_url : undefined; // undefined = غير مخزّن أصلاً، null = بحثنا سابقاً ولم نجد صورة
}

function setCachedCharacterImage(name, imageUrl) {
  db.prepare(`
    INSERT INTO character_image_cache (name, image_url, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET image_url = excluded.image_url, updated_at = excluded.updated_at
  `).run(name, imageUrl, Date.now());
}

// =============================================
// 👑 المشرفون الإضافيون (يُدارون من لوحة التحكم أو بالأمر)
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_admins (
    user_id TEXT PRIMARY KEY,
    added_by TEXT,
    added_at INTEGER NOT NULL
  )
`);

function addBotAdmin(userId, addedBy = null) {
  db.prepare(`INSERT OR IGNORE INTO bot_admins (user_id, added_by, added_at) VALUES (?, ?, ?)`)
    .run(userId, addedBy, Date.now());
}
function removeBotAdmin(userId) {
  return db.prepare(`DELETE FROM bot_admins WHERE user_id = ?`).run(userId);
}
function listBotAdmins() {
  return db.prepare(`SELECT * FROM bot_admins ORDER BY added_at DESC`).all();
}
function isStoredAdmin(userId) {
  return !!db.prepare(`SELECT 1 FROM bot_admins WHERE user_id = ?`).get(userId);
}

// =============================================
// ⭐ نظام النقاط (XP) لكل محادثة
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS user_points (
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    messages INTEGER NOT NULL DEFAULT 0,
    last_award_at INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (chat_id, user_id)
  )
`);

function getUserPoints(chatId, userId) {
  return db.prepare(`SELECT * FROM user_points WHERE chat_id = ? AND user_id = ?`).get(chatId, userId) || null;
}
function getPointsLeaderboard(chatId = null, limit = 10) {
  if (chatId) {
    return db.prepare(`SELECT * FROM user_points WHERE chat_id = ? ORDER BY points DESC, messages DESC LIMIT ?`).all(chatId, limit);
  }
  return db.prepare(`
    SELECT user_id, MAX(user_name) AS user_name, SUM(points) AS points, SUM(messages) AS messages
    FROM user_points GROUP BY user_id ORDER BY points DESC LIMIT ?
  `).all(limit);
}
function getChatPointsRank(chatId, userId) {
  const row = db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM user_points
    WHERE chat_id = ? AND points > (SELECT COALESCE(MAX(points), 0) FROM user_points WHERE chat_id = ? AND user_id = ?)
  `).get(chatId, chatId, userId);
  return row?.rank || null;
}
// يضيف نقاطاً ويعيد الرصيد الجديد. cooldownMs يمنع الاستغلال بالرسائل المتكررة.
function awardPoints({ chatId, userId, userName, amount, cooldownMs = 0, now = Date.now() }) {
  const row = getUserPoints(chatId, userId);
  if (row && cooldownMs > 0 && now - row.last_award_at < cooldownMs) return { awarded: false, points: row.points };
  db.prepare(`
    INSERT INTO user_points (chat_id, user_id, user_name, points, messages, last_award_at)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(chat_id, user_id) DO UPDATE SET
      points = points + excluded.points,
      messages = messages + 1,
      user_name = COALESCE(excluded.user_name, user_points.user_name),
      last_award_at = excluded.last_award_at
  `).run(chatId, userId, userName || null, amount, now);
  return { awarded: true, points: (row?.points || 0) + amount };
}
function setUserPoints(chatId, userId, points) {
  db.prepare(`
    INSERT INTO user_points (chat_id, user_id, points, messages, last_award_at)
    VALUES (?, ?, ?, 0, 0)
    ON CONFLICT(chat_id, user_id) DO UPDATE SET points = excluded.points
  `).run(chatId, userId, Math.max(0, Math.floor(points)));
}

// =============================================
// ⏰ المطالبة بالتذكير بشكل ذري: يمنع إرساله أكثر من مرة حتى لو تداخلت المهام
// =============================================
function claimReminder(id) {
  const info = db.prepare(`UPDATE reminders SET sent = 2 WHERE id = ? AND sent = 0`).run(id);
  return info.changes === 1;
}
function releaseReminder(id) {
  db.prepare(`UPDATE reminders SET sent = 0 WHERE id = ? AND sent = 2`).run(id);
}

// =============================================
// 📅 المهام المجدولة للمجموعات (.جدولة)
// =============================================
function listScheduledEvents() {
  return db.prepare(`SELECT * FROM scheduled_events WHERE active = 1 ORDER BY id ASC`).all();
}
function deactivateScheduledEvent(id) {
  return db.prepare(`UPDATE scheduled_events SET active = 0 WHERE id = ?`).run(id);
}

// =============================================
// 🧾 تعديل مفاتيح الحظر/الردود المجمعة + تنظيف الأعضاء المحظورين
// =============================================
function getCustomReplyById(id) {
  return db.prepare(`SELECT * FROM custom_replies WHERE id = ?`).get(id) || null;
}
function getCustomReactionById(id) {
  return db.prepare(`SELECT * FROM custom_reactions WHERE id = ?`).get(id) || null;
}

// =============================================
// 📺 الأنمي: المصادر والأخبار والمواعيد المخصصة والمشتركون في النشرة
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS anime_newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL UNIQUE,
    added_by TEXT,
    active INTEGER DEFAULT 1,
    created_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS anime_news_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_ok_at INTEGER,
    last_error TEXT,
    last_count INTEGER NOT NULL DEFAULT 0,
    added_by TEXT,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS anime_news_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    guid TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT,
    summary TEXT,
    image TEXT,
    published_at INTEGER,
    fetched_at INTEGER NOT NULL,
    posted INTEGER NOT NULL DEFAULT 0,
    UNIQUE (source_id, guid)
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_anime_news_posted ON anime_news_items (posted, published_at DESC)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS anime_news_custom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL,
    posted INTEGER NOT NULL DEFAULT 0,
    posted_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS anime_schedule_custom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    time_local TEXT NOT NULL,
    note TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);

function listNewsSources() {
  return db.prepare(`SELECT * FROM anime_news_sources ORDER BY id ASC`).all();
}
function getEnabledNewsSources() {
  return db.prepare(`SELECT * FROM anime_news_sources WHERE enabled = 1 ORDER BY id ASC`).all();
}
function addNewsSource({ name, url, addedBy = null }) {
  const info = db.prepare(`
    INSERT OR IGNORE INTO anime_news_sources (name, url, enabled, added_by, created_at) VALUES (?, ?, 1, ?, ?)
  `).run(name, url, addedBy, Date.now());
  return info.changes === 1 ? info.lastInsertRowid : null;
}
function setNewsSourceEnabled(id, enabled) {
  return db.prepare(`UPDATE anime_news_sources SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}
function deleteNewsSource(id) {
  db.prepare(`DELETE FROM anime_news_items WHERE source_id = ?`).run(id);
  return db.prepare(`DELETE FROM anime_news_sources WHERE id = ?`).run(id);
}
function markNewsSourceResult(id, { ok, count = 0, error = null }) {
  if (ok) {
    db.prepare(`UPDATE anime_news_sources SET last_ok_at = ?, last_error = NULL, last_count = ? WHERE id = ?`)
      .run(Date.now(), count, id);
  } else {
    db.prepare(`UPDATE anime_news_sources SET last_error = ? WHERE id = ?`).run(String(error || 'unknown').slice(0, 300), id);
  }
}
// يُرجع true إذا أُضيف الخبر فعلاً (لم يكن موجوداً)
function insertNewsItem(item) {
  const info = db.prepare(`
    INSERT OR IGNORE INTO anime_news_items
      (source_id, guid, title, link, summary, image, published_at, fetched_at, posted)
    VALUES (@source_id, @guid, @title, @link, @summary, @image, @published_at, @fetched_at, @posted)
  `).run(item);
  return info.changes === 1;
}
function getUnpostedNewsItems(limit = 5, sinceMs = 0) {
  return db.prepare(`
    SELECT n.*, s.name AS source_name FROM anime_news_items n
    JOIN anime_news_sources s ON s.id = n.source_id
    WHERE n.posted = 0 AND COALESCE(n.published_at, n.fetched_at) >= ?
    ORDER BY COALESCE(n.published_at, n.fetched_at) DESC LIMIT ?
  `).all(sinceMs, limit);
}
function markNewsItemsPosted(ids) {
  const stmt = db.prepare(`UPDATE anime_news_items SET posted = 1 WHERE id = ?`);
  for (const id of ids) stmt.run(id);
}
function listRecentNewsItems(limit = 30) {
  return db.prepare(`
    SELECT n.*, s.name AS source_name FROM anime_news_items n
    JOIN anime_news_sources s ON s.id = n.source_id
    ORDER BY COALESCE(n.published_at, n.fetched_at) DESC LIMIT ?
  `).all(limit);
}
function addCustomNews({ title, body = null, link = null, createdBy = null }) {
  return db.prepare(`INSERT INTO anime_news_custom (title, body, link, created_by, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(title, body, link, createdBy, Date.now()).lastInsertRowid;
}
function listCustomNews(limit = 50) {
  return db.prepare(`SELECT * FROM anime_news_custom ORDER BY id DESC LIMIT ?`).all(limit);
}
function getPendingCustomNews() {
  return db.prepare(`SELECT * FROM anime_news_custom WHERE posted = 0 ORDER BY id ASC`).all();
}
function markCustomNewsPosted(ids) {
  const stmt = db.prepare(`UPDATE anime_news_custom SET posted = 1, posted_at = ? WHERE id = ?`);
  const now = Date.now();
  for (const id of ids) stmt.run(now, id);
}
function deleteCustomNews(id) {
  return db.prepare(`DELETE FROM anime_news_custom WHERE id = ?`).run(id);
}
function addCustomSchedule({ title, dayOfWeek, timeLocal, note = null }) {
  return db.prepare(`INSERT INTO anime_schedule_custom (title, day_of_week, time_local, note, active, created_at) VALUES (?, ?, ?, ?, 1, ?)`)
    .run(title, dayOfWeek, timeLocal, note, Date.now()).lastInsertRowid;
}
function listCustomSchedule() {
  return db.prepare(`SELECT * FROM anime_schedule_custom WHERE active = 1 ORDER BY day_of_week ASC, time_local ASC`).all();
}
function deleteCustomSchedule(id) {
  return db.prepare(`UPDATE anime_schedule_custom SET active = 0 WHERE id = ?`).run(id);
}
function subscribeNewsletter({ chatId, addedBy = null }) {
  db.prepare(`
    INSERT INTO anime_newsletter (chat_id, added_by, active, created_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(chat_id) DO UPDATE SET active = 1
  `).run(chatId, addedBy, Date.now());
}
function unsubscribeNewsletter(chatId) {
  return db.prepare(`UPDATE anime_newsletter SET active = 0 WHERE chat_id = ?`).run(chatId);
}
function getNewsletterSubscribers() {
  return db.prepare(`SELECT * FROM anime_newsletter WHERE active = 1 ORDER BY id ASC`).all();
}
function getNewsletterStatus(chatId) {
  return db.prepare(`SELECT * FROM anime_newsletter WHERE chat_id = ?`).get(chatId) || null;
}

// 🕌 جدول الجدولة الإسلامية (آيات/أذكار) — يُنشأ هنا لا في أمر islamic.js
db.exec(`
  CREATE TABLE IF NOT EXISTS islamic_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'quran',
    time_expression TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    added_by TEXT
  )
`);

module.exports = {
  db,
  hasMessage,
  addBotAdmin,
  removeBotAdmin,
  listBotAdmins,
  isStoredAdmin,
  getUserPoints,
  getPointsLeaderboard,
  getChatPointsRank,
  awardPoints,
  setUserPoints,
  claimReminder,
  releaseReminder,
  listScheduledEvents,
  deactivateScheduledEvent,
  getCustomReplyById,
  getCustomReactionById,
  listNewsSources,
  getEnabledNewsSources,
  addNewsSource,
  setNewsSourceEnabled,
  deleteNewsSource,
  markNewsSourceResult,
  insertNewsItem,
  getUnpostedNewsItems,
  markNewsItemsPosted,
  listRecentNewsItems,
  addCustomNews,
  listCustomNews,
  getPendingCustomNews,
  markCustomNewsPosted,
  deleteCustomNews,
  addCustomSchedule,
  listCustomSchedule,
  deleteCustomSchedule,
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSubscribers,
  getNewsletterStatus,
  saveMessage,
  markDeleted,
  getMessage,
  saveCustomReply,
  getCustomReplies,
  deleteCustomReply,
  saveCustomReaction,
  getCustomReactions,
  deleteCustomReaction,
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
  setGlobalSetting,
  addScheduledEvent,
  getScheduledEvents,
  banUser,
  unbanUser,
  isBanned,
  getBannedUsers,
  addReminder,
  getDueReminders,
  markReminderSent,
  getPendingReminders,
  deleteReminder,
  getCachedCharacterImage,
  setCachedCharacterImage,
  recordMessageEdit,
  getEditHistory,
  getRecentEdits,
  getRecentDeleted,
  getRecentMessages,
  getMessagesForChat,
  getStats,
};
