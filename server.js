const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const setupUserHandlers = require("./sockets/userHandler");
const setupMessageHandlers = require("./sockets/messageHandler");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

const server = http.createServer((req, res) => {
  const filePath = path.join(
    __dirname,
    "public",
    req.url === "/" ? "index.html" : req.url
  );
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const users = new Map();
const messages = [];

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    setupUserHandlers(wss, ws, users, payload);
    setupMessageHandlers(wss, ws, users, messages, payload);
  });

  ws.on("close", () => {
    setupUserHandlers(wss, ws, users, { event: "disconnect" });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
