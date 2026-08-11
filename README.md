# 📱 Asta WhatsApp Bot

A powerful, fully-featured WhatsApp bot inspired by Asta from Black Clover! It includes robust logging, dynamic games, auto-reminders, anime updates, and advanced group management.

---

## ⚠️ Important Note

- This bot uses unofficial libraries (Baileys) to connect to WhatsApp. This violates WhatsApp's Terms of Service and might result in a **banned number**.
- **Use a test number, not your primary one.**
- This project is for personal use and learning purposes. Do not use it for massive spam or commercial broadcasting.

---

## 📋 Features

- **Asta Persona**: The bot replies varying between Asta's fiery determination and helpful information!
- **Message Logging**: Automatically saves all messages to a local SQLite database (`bot.db`).
- **Deleted Message Recovery**: Automatically catches deleted messages and re-sends them.
- **Sticker Maker**: Converts images/videos into stickers seamlessly (`!ملصق`).
- **Games & Anime Tools**: Play anime trivia (`!خمن`), get random characters (`!انمي`, `!زوجني`), search anime info (`!بحث-انمي`), or get anime quotes. 
  - *Images are fetched safely using the official free Jikan API.*
- **Islamic Tools**: View Quranic verses and athkar, or subscribe groups to daily scheduled verses and athkar.
- **Group Management**: Anti-link protection (`!منع-الروابط`), custom canvas welcome cards (`!ترحيب`), promote/demote/kick, and scheduled events.
- **Maintenance Mode**: An owner-exclusive toggle (`!صيانة`) to train the bot without disturbing group members.
- **Resilient Media Fetching**: Bypasses hotlinking restrictions safely with strict timeouts and validations.

---

## 🚀 Setup Instructions

### 1) Prerequisites
- **Node.js** version 18 or newer
- Git

### 2) Installation
```bash
git clone <your_repo_url>
cd whatsapp-bot
npm install
cp .env.example .env
```
Edit `.env` and configure your variables (such as `OWNER_NUMBER` and `COMMAND_PREFIX`).

### 3) Running the Bot
```bash
npm start
```
- Scan the QR code shown in the terminal using your WhatsApp **Linked Devices**.
- Once connected, the session is stored locally (no need to scan upon every restart).

### 4) Deployment Update
Use the included `update.sh` script to fetch the latest changes efficiently on your server:
```bash
bash update.sh
```

---

## 🛡️ Session Management & Deployment Warnings

If you deploy this bot on a platform like **Railway, Render, or Heroku**, you might face session issues (like `Connection Closed` or `MessageCounterError`). This happens because the `session/` folder is deleted on every restart.

**🔴 Do NOT save the session to GitHub automatically!**
WhatsApp updates its security keys with almost every message sent or received. Pushing the session to GitHub automatically will rapidly exhaust GitHub API limits and bloat your repository.

**✅ Recommended Solutions:**
1. **Persistent Volumes:** If your host supports disks/volumes (like Railway Volumes), mount it to the `/session` directory.
2. **MongoDB Auth State:** Modify `sessionManager.js` to use `useMongoDBAuthState` (supported natively by Baileys) to store credentials in a free cloud database like MongoDB Atlas. (Highly recommended for cloud).

---

## 🤖 Prompt for the Next AI Model

*(Copy and paste this section to the next AI you work with so it understands the project instantly)*

```text
You are an expert full-stack developer working on the "Asta WhatsApp Bot".

Project Tech Stack: Node.js, @whiskeysockets/baileys, better-sqlite3 (SQLite).
Key Files: 
- `src/index.js` (Entry point)
- `src/sessionManager.js` (Handles Baileys sessions & connection)
- `src/handlers/messageHandler.js` (Routes commands)
- `src/commands/*.js` (Contains all features, separated by category)
- `bot.db` (SQLite DB for state, scheduled messages, settings)

Current Status & Important Notes:
1. The bot is fully functional with scheduling, anime APIs (Jikan), and games.
2. The user has had issues with Baileys session states (`MessageCounterError` and `Status 428 Precondition Required`) when deploying/restarting because local files wipe. Do NOT suggest syncing the session to GitHub. Instead, if session persistence is requested, guide the user to set up a Railway Volume, OR implement Baileys `useMongoDBAuthState` to store credentials in MongoDB Atlas.
3. Keep changes modular. Asta's "loud and energetic" persona is a key requirement for responses.
4. Images in anime functions (`!انمي`, `!زوجني`) now use `https://api.jikan.moe/v4/random/characters` and its image url successfully.

Your goal is to continue development seamlessly without breaking existing sqlite mechanisms. Always refer to `src/database/db.js` for existing schemas before creating new state mechanisms.
```

---

## 📜 License & Usage
If you want to use this bot, please talk to the owner of this bot.
