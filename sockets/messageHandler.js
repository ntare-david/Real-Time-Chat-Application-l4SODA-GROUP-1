function sanitizeText(value) {
  return String(value || "").trim();
}

function sanitizeAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const name = sanitizeText(attachment.name);
  const type = sanitizeText(attachment.type);
  const dataUrl = sanitizeText(attachment.dataUrl);

  if (!name || !type || !dataUrl) {
    return null;
  }

  return { name, type, dataUrl };
}

function setupMessageHandlers(io, socket, users, messages) {
  socket.on("request_messages", () => {
    socket.emit("messages_history", messages);
  });

  socket.on("send_message", (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user) {
      callback?.({ success: false, message: "Please join before messaging." });
      return;
    }

    const messageText = sanitizeText(payload.message);
    const attachment = sanitizeAttachment(payload.attachment);

    if (!messageText && !attachment) {
      callback?.({ success: false, message: "Message or attachment is required." });
      return;
    }

    const messageData = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      authorSocketId: socket.id,
      username: user.username,
      category: user.category,
      focusMode: user.focusMode,
      message: messageText,
      attachment,
      time: new Date().toISOString(),
      updatedAt: null,
      isQuestion: messageText.includes("?"),
    };

    messages.push(messageData);
    io.emit("receive_message", messageData);
    callback?.({ success: true });
  });

  socket.on("edit_message", (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user) {
      callback?.({ success: false, message: "Please join before editing." });
      return;
    }

    const messageId = sanitizeText(payload.messageId);
    const newText = sanitizeText(payload.message);

    if (!messageId || !newText) {
      callback?.({ success: false, message: "Message text cannot be empty." });
      return;
    }

    const targetMessage = messages.find((entry) => entry.id === messageId);
    if (!targetMessage) {
      callback?.({ success: false, message: "Message not found." });
      return;
    }

    if (targetMessage.authorSocketId !== socket.id) {
      callback?.({ success: false, message: "You can edit only your messages." });
      return;
    }

    if (targetMessage.attachment) {
      callback?.({ success: false, message: "Attachment messages cannot be edited." });
      return;
    }

    targetMessage.message = newText;
    targetMessage.isQuestion = newText.includes("?");
    targetMessage.updatedAt = new Date().toISOString();

    io.emit("message_updated", targetMessage);
    callback?.({ success: true });
  });

  socket.on("delete_message", (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user) {
      callback?.({ success: false, message: "Please join before deleting." });
      return;
    }

    const messageId = sanitizeText(payload.messageId);
    const messageIndex = messages.findIndex((entry) => entry.id === messageId);

    if (messageIndex === -1) {
      callback?.({ success: false, message: "Message not found." });
      return;
    }

    const targetMessage = messages[messageIndex];
    if (targetMessage.authorSocketId !== socket.id) {
      callback?.({ success: false, message: "You can delete only your messages." });
      return;
    }

    messages.splice(messageIndex, 1);
    io.emit("message_deleted", { messageId });
    callback?.({ success: true });
  });

  socket.on("typing", () => {
    const user = users.get(socket.id);
    if (!user) {
      return;
    }

    socket.broadcast.emit("typing", { username: user.username });
  });

  socket.on("stop_typing", () => {
    const user = users.get(socket.id);
    if (!user) {
      return;
    }

    socket.broadcast.emit("stop_typing", { username: user.username });
  });
}

module.exports = setupMessageHandlers;

