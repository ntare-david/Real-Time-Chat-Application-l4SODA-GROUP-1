const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const setupUserHandlers = require("./sockets/userHandler");
const setupMessageHandlers = require("./sockets/messageHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Map();
const messages = [];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  setupUserHandlers(io, socket, users);
  setupMessageHandlers(io, socket, users, messages);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
