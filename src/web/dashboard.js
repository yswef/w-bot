const http = require('http');
const { getRecentChats, getLatestMessageForChat } = require('../database/db');

function startDashboard() {
  const port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;

  const server = http.createServer((_req, res) => {
    const recentChats = getRecentChats(10);
    const rows = recentChats.map((item) => ({
      chatId: item.chat_id,
      lastMessage: getLatestMessageForChat(item.chat_id) || null,
    }));

    const html = `<!doctype html>
      <html>
        <head><meta charset="utf-8" /><title>WhatsApp Bot Dashboard</title></head>
        <body style="font-family:Arial; padding:20px; background:#0f172a; color:#fff;">
          <h1>🧩 لوحة تحكم البوت</h1>
          <p>الرسائل الأخيرة واللقاءات الحالية</p>
          <ul>${rows.map((row) => `<li><strong>${row.chatId}</strong> — ${row.lastMessage ? row.lastMessage.text_content || 'وسائط' : 'لا توجد رسائل'}</li>`).join('')}</ul>
        </body>
      </html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

server.listen(port, '0.0.0.0', () => {
    console.log(`Dashboard listening on port ${port}`);
  });
}

module.exports = startDashboard;
