# 📱 Asta WhatsApp Bot

A powerful, fully-featured WhatsApp bot inspired by Asta from Black Clover! It includes robust logging, dynamic games, auto-reminders, and more.

---

## ⚠️ Important Note

- This bot uses unofficial libraries (Baileys) to connect to WhatsApp. This violates WhatsApp's Terms of Service and might result in a **banned number**.
- **Use a test number, not your primary one.**
- This project is for personal use and learning purposes. Do not use it for massive spam or commercial broadcasting.

---

## 📋 Features

- **Asta Persona**: The bot replies with Asta's fiery determination!
- **Message Logging**: Automatically saves all messages to a local SQLite database.
- **Deleted Message Recovery**: Automatically catches deleted messages and re-sends them.
- **Sticker Maker**: Converts images/videos into stickers seamlessly.
- **Games & Anime Tools**: Play anime trivia, guess the character, or get anime quotes.
- **Group Management**: Anti-link protection, custom canvas welcome cards, and scheduled events.
- **Maintenance Mode**: An owner-exclusive toggle to train the bot without disturbing group members.
- **Resilient Image Fetching**: Bypasses hotlinking restrictions safely with strict timeouts and validations.

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

## 📜 License & Usage
If you want to use this bot, please talk to the owner of this bot.
