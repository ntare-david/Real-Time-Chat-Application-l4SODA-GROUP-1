const ALLOWED_CATEGORIES = new Set(["close_friends", "friends", "others"]);
const ALLOWED_FOCUS_MODES = new Set([
  "chat_with_friends",
  "ask_a_question",
  "just_browsing",
]);

function sanitizeText(value) {
  return String(value || "").trim();
}

function setupUserHandlers(io, socket, users) {
  socket.on("join_user", (payload = {}, callback) => {
    const username = sanitizeText(payload.username);
    const category = sanitizeText(payload.category);
    const focusMode = sanitizeText(payload.focusMode);

    if (!username) {
      callback?.({ success: false, message: "Username is required." });
      return;
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      callback?.({ success: false, message: "Invalid user category." });
      return;
    }

    if (!ALLOWED_FOCUS_MODES.has(focusMode)) {
      callback?.({ success: false, message: "Invalid focus mode." });
      return;
    }

    const duplicateUser = Array.from(users.values()).some(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );

    if (duplicateUser) {
      callback?.({ success: false, message: "Username already taken." });
      return;
    }

    users.set(socket.id, {
      socketId: socket.id,
      username,
      category,
      focusMode,
    });

    io.emit("online_users", Array.from(users.values()));
    io.emit("user_connected", {
      username,
      category,
      time: new Date().toISOString(),
    });

    callback?.({ success: true });
  });

  socket.on("disconnect", () => {
    const disconnectedUser = users.get(socket.id);
    if (!disconnectedUser) {
      return;
    }

    users.delete(socket.id);
    io.emit("online_users", Array.from(users.values()));
    io.emit("user_disconnected", {
      username: disconnectedUser.username,
      category: disconnectedUser.category,
      time: new Date().toISOString(),
    });
    socket.broadcast.emit("stop_typing", {
      username: disconnectedUser.username,
    });
  });
}

module.exports = setupUserHandlers;

