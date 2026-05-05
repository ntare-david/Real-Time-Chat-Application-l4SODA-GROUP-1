const socket = io();

const joinPanel = document.getElementById("join-panel");
const chatPanel = document.getElementById("chat-panel");
const joinError = document.getElementById("join-error");
const joinButton = document.getElementById("join-btn");
const usernameInput = document.getElementById("username-input");
const categorySelect = document.getElementById("category-select");
const focusSelect = document.getElementById("focus-select");
const focusBadge = document.getElementById("focus-badge");
const roomTitle = document.getElementById("room-title");
const chatList = document.getElementById("chat-list");
const chatListEmpty = document.getElementById("chat-list-empty");
const chatSearchInput = document.getElementById("chat-search-input");
const messagesContainer = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const attachButton = document.getElementById("attach-btn");
const emojiButton = document.getElementById("emoji-btn");
const fileInput = document.getElementById("file-input");
const emojiPicker = document.getElementById("emoji-picker");
const contextMenu = document.getElementById("message-context-menu");
const contextEditButton = document.getElementById("context-edit-btn");
const contextDeleteButton = document.getElementById("context-delete-btn");

let currentUser = null;
let typingTimeout = null;
const allMessages = [];
const activeTypers = new Set();
let activeChatUser = null;
let contextMessageId = null;

const EMOJIS = ["😀", "😂", "😍", "🤝", "🔥", "👍", "🙏", "🎉", "❤️", "😎"];

const FOCUS_LABELS = {
  chat_with_friends: "Focus: Chat with friends",
  ask_a_question: "Focus: Ask a question",
  just_browsing: "Focus: Just browsing",
};

function formatCategory(value) {
  return value.replaceAll("_", " ");
}

function formatTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessagePreview(entry) {
  if (entry.message) {
    return entry.message;
  }

  if (entry.attachment) {
    return `Attachment: ${entry.attachment.name}`;
  }

  return "";
}

function hideContextMenu() {
  contextMenu.classList.add("hidden");
  contextMessageId = null;
}

function hideEmojiPicker() {
  emojiPicker.classList.add("hidden");
}

function messagePriority(message) {
  if (!currentUser) {
    return 3;
  }

  if (currentUser.focusMode === "chat_with_friends") {
    if (message.category === "close_friends") return 0;
    if (message.category === "friends") return 1;
    return 3;
  }

  if (currentUser.focusMode === "ask_a_question") {
    return message.isQuestion ? 0 : 2;
  }

  if (message.category === "close_friends") {
    return 1;
  }

  return 2;
}

function renderMessages() {
  const filteredMessages = allMessages.filter((entry) => {
    if (!activeChatUser) {
      return true;
    }

    if (entry.username === "System") {
      return false;
    }

    return entry.username === activeChatUser || entry.username === currentUser?.username;
  });

  const sortedMessages = [...filteredMessages].sort((a, b) => {
    const diff = messagePriority(a) - messagePriority(b);
    if (diff !== 0) {
      return diff;
    }
    return new Date(a.time) - new Date(b.time);
  });

  messagesContainer.innerHTML = "";

  sortedMessages.forEach((entry) => {
    const messageItem = document.createElement("article");
    messageItem.className = `message message-${entry.category}`;
    if (entry.username === currentUser?.username) {
      messageItem.classList.add("message-own");
    }

    if (entry.isQuestion) {
      messageItem.classList.add("message-question");
    }

    const header = document.createElement("div");
    header.className = "message-header";
    header.innerHTML = `<span>${entry.username} - ${formatCategory(entry.category)}</span><span>${formatTime(entry.time)}</span>`;

    const messageText = document.createElement("p");
    messageText.className = "message-text";
    messageText.textContent = entry.message || "";

    const isOwnMessage = entry.username === currentUser?.username;
    messageItem.append(header);

    if (entry.message) {
      messageItem.append(messageText);
    }

    if (entry.attachment) {
      const attachmentLink = document.createElement("a");
      attachmentLink.className = "message-attachment";
      attachmentLink.href = entry.attachment.dataUrl;
      attachmentLink.target = "_blank";
      attachmentLink.rel = "noopener noreferrer";
      attachmentLink.download = entry.attachment.name;
      attachmentLink.textContent = `📎 ${entry.attachment.name}`;
      messageItem.append(attachmentLink);
    }

    if (isOwnMessage && entry.username !== "System") {
      messageItem.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        contextMessageId = entry.id;
        contextMenu.style.left = `${event.clientX}px`;
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.classList.remove("hidden");
      });
    }

    messagesContainer.appendChild(messageItem);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function buildRecentChats() {
  const entries = new Map();

  allMessages.forEach((entry) => {
    if (!currentUser || entry.username === "System" || entry.username === currentUser.username) {
      return;
    }

    const previous = entries.get(entry.username);
    if (!previous || new Date(entry.time) > new Date(previous.time)) {
      entries.set(entry.username, entry);
    }
  });

  return Array.from(entries.values()).sort((a, b) => new Date(b.time) - new Date(a.time));
}

function renderChatList() {
  const recentChats = buildRecentChats();
  const query = chatSearchInput.value.trim().toLowerCase();

  const filteredChats = recentChats.filter((entry) =>
    entry.username.toLowerCase().includes(query) ||
    getMessagePreview(entry).toLowerCase().includes(query)
  );

  chatList.innerHTML = "";

  filteredChats.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "chat-list-item";
    if (entry.username === activeChatUser) {
      item.classList.add("active");
    }

    item.innerHTML = `
      <div class="chat-avatar">${entry.username[0]?.toUpperCase() || "U"}</div>
      <div class="chat-meta">
        <div class="chat-meta-top">
          <strong>${entry.username}</strong>
          <span>${formatTime(entry.time)}</span>
        </div>
        <p>${getMessagePreview(entry)}</p>
      </div>
    `;

    item.addEventListener("click", () => {
      activeChatUser = entry.username;
      roomTitle.textContent = entry.username;
      renderChatList();
      renderMessages();
    });

    chatList.appendChild(item);
  });

  chatListEmpty.style.display = filteredChats.length ? "none" : "block";
}

function addSystemMessage(text, time = new Date().toISOString()) {
  allMessages.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: "System",
    category: "others",
    message: text,
    time,
    isQuestion: false,
  });
  renderChatList();
  renderMessages();
}

joinButton.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const category = categorySelect.value;
  const focusMode = focusSelect.value;

  if (!username) {
    joinError.textContent = "Please enter a username.";
    return;
  }

  socket.emit(
    "join_user",
    {
      username,
      category,
      focusMode,
    },
    (response) => {
      if (!response?.success) {
        joinError.textContent = response?.message || "Could not join chat.";
        return;
      }

      currentUser = { username, category, focusMode };
      joinPanel.classList.add("hidden");
      chatPanel.classList.remove("hidden");
      focusBadge.textContent = FOCUS_LABELS[focusMode] || "Focus: Active";
      roomTitle.textContent = "Room Feed";
      joinError.textContent = "";
      messageInput.focus();
      addSystemMessage(`You joined as ${username}.`);
      socket.emit("request_messages");
    }
  );
});

socket.on("receive_message", (messageData) => {
  allMessages.push(messageData);
  renderChatList();
  renderMessages();
});

socket.on("messages_history", (messages = []) => {
  const systemMessages = allMessages.filter((entry) => entry.username === "System");
  allMessages.length = 0;
  allMessages.push(...messages, ...systemMessages);
  renderChatList();
  renderMessages();
});

socket.on("message_updated", (updatedMessage) => {
  const targetIndex = allMessages.findIndex((entry) => entry.id === updatedMessage.id);
  if (targetIndex === -1) {
    return;
  }

  allMessages[targetIndex] = updatedMessage;
  renderChatList();
  renderMessages();
});

socket.on("message_deleted", ({ messageId }) => {
  const targetIndex = allMessages.findIndex((entry) => entry.id === messageId);
  if (targetIndex === -1) {
    return;
  }

  allMessages.splice(targetIndex, 1);
  renderChatList();
  renderMessages();
});

socket.on("user_connected", ({ username, category, time }) => {
  if (!currentUser || username === currentUser.username) {
    return;
  }
  addSystemMessage(`${username} joined (${formatCategory(category)}).`, time);
});

socket.on("user_disconnected", ({ username, time }) => {
  activeTypers.delete(username);
  typingIndicator.textContent = "";
  addSystemMessage(`${username} left the chat.`, time);
});

socket.on("typing", ({ username }) => {
  if (!currentUser || username === currentUser.username) {
    return;
  }

  activeTypers.add(username);
  typingIndicator.textContent = `${Array.from(activeTypers).join(", ")} is typing...`;
});

socket.on("stop_typing", ({ username }) => {
  activeTypers.delete(username);
  typingIndicator.textContent = activeTypers.size
    ? `${Array.from(activeTypers).join(", ")} is typing...`
    : "";
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) {
    return;
  }

  socket.emit("send_message", { message }, (response) => {
    if (!response?.success) {
      addSystemMessage(response?.message || "Could not send message.");
      return;
    }
    socket.emit("stop_typing");
    messageInput.value = "";
  });
});

function handleEdit(entry) {
  const editedText = window.prompt("Edit your message:", entry.message);
  if (editedText === null) {
    return;
  }

  const cleanText = editedText.trim();
  if (!cleanText) {
    addSystemMessage("Edited message cannot be empty.");
    return;
  }

  socket.emit(
    "edit_message",
    { messageId: entry.id, message: cleanText },
    (response) => {
      if (!response?.success) {
        addSystemMessage(response?.message || "Could not edit message.");
      }
    }
  );
}

function handleDelete(messageId) {
  const shouldDelete = window.confirm("Delete this message?");
  if (!shouldDelete) {
    return;
  }

  socket.emit("delete_message", { messageId }, (response) => {
    if (!response?.success) {
      addSystemMessage(response?.message || "Could not delete message.");
    }
  });
}

messageInput.addEventListener("input", () => {
  if (!currentUser) {
    return;
  }

  socket.emit("typing");

  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  typingTimeout = setTimeout(() => {
    socket.emit("stop_typing");
  }, 1000);
});

chatSearchInput.addEventListener("input", () => {
  renderChatList();
});

contextEditButton.addEventListener("click", () => {
  const messageId = contextMessageId;
  hideContextMenu();
  const entry = allMessages.find((item) => item.id === messageId);
  if (!entry) {
    return;
  }
  handleEdit(entry);
});

contextDeleteButton.addEventListener("click", () => {
  const messageId = contextMessageId;
  hideContextMenu();
  if (!messageId) {
    return;
  }
  handleDelete(messageId);
});

attachButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  }).catch(() => null);

  if (!dataUrl) {
    addSystemMessage("Could not attach this file.");
    fileInput.value = "";
    return;
  }

  socket.emit(
    "send_message",
    {
      message: messageInput.value.trim(),
      attachment: {
        name: file.name,
        type: file.type || "application/octet-stream",
        dataUrl,
      },
    },
    (response) => {
      if (!response?.success) {
        addSystemMessage(response?.message || "Could not send attachment.");
        return;
      }
      messageInput.value = "";
      fileInput.value = "";
    }
  );
});

emojiButton.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

EMOJIS.forEach((emoji) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "emoji-item";
  button.textContent = emoji;
  button.addEventListener("click", () => {
    const start = messageInput.selectionStart ?? messageInput.value.length;
    const end = messageInput.selectionEnd ?? messageInput.value.length;
    const current = messageInput.value;
    messageInput.value = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    messageInput.focus();
    const position = start + emoji.length;
    messageInput.setSelectionRange(position, position);
  });
  emojiPicker.appendChild(button);
});

document.addEventListener("click", (event) => {
  if (!contextMenu.contains(event.target)) {
    hideContextMenu();
  }

  if (!emojiPicker.contains(event.target) && event.target !== emojiButton && !emojiButton.contains(event.target)) {
    hideEmojiPicker();
  }
});
