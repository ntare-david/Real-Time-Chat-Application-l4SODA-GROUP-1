const ALLOWED_CATEGORIES = new Set(["student", "professional", "hobbyist", "other"]);
const ALLOWED_FOCUS_MODES = new Set(["online", "away", "busy"]);

function sanitize(value) {
  return String(value || "").trim();
}

function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => c.readyState === c.OPEN && c.send(msg));
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data));
}

function setupUserHandlers(wss, ws, users, payload) {
  const { event } = payload;

  if (event === "join_user") {
    const username = sanitize(payload.username);
    const category = sanitize(payload.category);
    const focusMode = sanitize(payload.focusMode);

    if (!username || username.length > 20) return send(ws, { event: "join_ack", success: false, message: "Username is required (max 20 chars)." });
    if (!ALLOWED_CATEGORIES.has(category)) return send(ws, { event: "join_ack", success: false, message: "Invalid category." });
    if (!ALLOWED_FOCUS_MODES.has(focusMode)) return send(ws, { event: "join_ack", success: false, message: "Invalid focus mode." });

    const taken = Array.from(users.values()).some(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (taken) return send(ws, { event: "join_ack", success: false, message: "Username already taken." });

    users.set(ws, { username, category, focusMode, roomId: null });
    send(ws, { event: "join_ack", success: true, username, category, focusMode });
    broadcast(wss, { event: "user_connected", username, category, time: new Date().toISOString() });
  }

  if (event === "disconnect") {
    const user = users.get(ws);
    if (!user) return;
    users.delete(ws);
    broadcast(wss, { event: "user_disconnected", username: user.username, time: new Date().toISOString() });
    wss.clients.forEach((c) => {
      if (c.readyState === c.OPEN && c !== ws)
        c.send(JSON.stringify({ event: "stop_typing", username: user.username }));
    });
  }
}

module.exports = setupUserHandlers;
