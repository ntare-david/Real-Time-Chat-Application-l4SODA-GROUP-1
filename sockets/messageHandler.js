function sanitize(value) {
  return String(value || "").trim();
}

function sanitizeAttachment(a) {
  if (!a || typeof a !== "object") return null;
  const name = sanitize(a.name), type = sanitize(a.type), dataUrl = sanitize(a.dataUrl);
  return name && type && dataUrl ? { name, type, dataUrl } : null;
}

function broadcast(wss, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => c.readyState === c.OPEN && c.send(msg));
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data));
}

function setupMessageHandlers(wss, ws, users, messages, payload) {
  const { event } = payload;
  const user = users.get(ws);

  if (event === "request_messages") {
    send(ws, { event: "messages_history", messages });
  }

  if (event === "send_message") {
    if (!user) return send(ws, { event: "send_ack", success: false, message: "Please join before messaging." });
    const message = sanitize(payload.message);
    const attachment = sanitizeAttachment(payload.attachment);
    const group = sanitize(payload.group);
    const recipient = sanitize(payload.recipient);
    if (!message && !attachment) return send(ws, { event: "send_ack", success: false, message: "Message or attachment is required." });

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username: user.username,
      category: user.category,
      focusMode: user.focusMode,
      message,
      attachment,
      group: group || null,
      recipient: recipient || null,
      time: new Date().toISOString(),
      updatedAt: null,
      isQuestion: message.includes("?"),
    };
    messages.push(entry);
    broadcast(wss, { event: "receive_message", ...entry });
    send(ws, { event: "send_ack", success: true });
  }

  if (event === "edit_message") {
    if (!user) return send(ws, { event: "edit_ack", success: false, message: "Please join before editing." });
    const messageId = sanitize(payload.messageId);
    const newText = sanitize(payload.message);
    if (!messageId || !newText) return send(ws, { event: "edit_ack", success: false, message: "Message text cannot be empty." });

    const target = messages.find((m) => m.id === messageId);
    if (!target) return send(ws, { event: "edit_ack", success: false, message: "Message not found." });
    if (target.username !== user.username) return send(ws, { event: "edit_ack", success: false, message: "You can only edit your own messages." });
    if (target.attachment) return send(ws, { event: "edit_ack", success: false, message: "Attachment messages cannot be edited." });

    target.message = newText;
    target.isQuestion = newText.includes("?");
    target.updatedAt = new Date().toISOString();
    broadcast(wss, { event: "message_updated", ...target });
    send(ws, { event: "edit_ack", success: true });
  }

  if (event === "delete_message") {
    if (!user) return send(ws, { event: "delete_ack", success: false, message: "Please join before deleting." });
    const messageId = sanitize(payload.messageId);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return send(ws, { event: "delete_ack", success: false, message: "Message not found." });
    if (messages[idx].username !== user.username) return send(ws, { event: "delete_ack", success: false, message: "You can only delete your own messages." });

    messages.splice(idx, 1);
    broadcast(wss, { event: "message_deleted", messageId });
    send(ws, { event: "delete_ack", success: true });
  }

  if (event === "typing" && user) {
    wss.clients.forEach((c) => {
      if (c !== ws && c.readyState === c.OPEN)
        c.send(JSON.stringify({ event: "typing", username: user.username }));
    });
  }

  if (event === "stop_typing" && user) {
    wss.clients.forEach((c) => {
      if (c !== ws && c.readyState === c.OPEN)
        c.send(JSON.stringify({ event: "stop_typing", username: user.username }));
    });
  }
}

module.exports = setupMessageHandlers;
