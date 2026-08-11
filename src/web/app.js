const http = require('http');
const fs = require('fs');
const path = require('path');
const { getRecentChats, getLatestMessageForChat, saveCustomReply, getCustomReplies, deleteCustomReply } = require('../database/db');

function startProfessionalDashboard() {
  const port = process.env.DASHBOARD_PORT || 3000;
  const htmlPath = path.join(__dirname, 'index.html');

  const server = http.createServer((req, res) => {
    if (req.url === '/api/replies') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(getCustomReplies('all')));
      return;
    }

    if (req.url.startsWith('/api/replies/add')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const keyword = url.searchParams.get('keyword');
      const reply = url.searchParams.get('reply');
      if (keyword && reply) {
        saveCustomReply({ keyword, reply, scope: 'all' });
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url.startsWith('/api/replies/delete')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = Number(url.searchParams.get('id'));
      if (id) deleteCustomReply(id);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(port, () => {
    console.log(`Professional dashboard listening on http://localhost:${port}`);
  });
}

module.exports = startProfessionalDashboard;
