const socket = io();

const joinPanel = document.getElementById("join-panel");
const chatPanel = document.getElementById("chat-panel");
const joinError = document.getElementById("join-error");
const joinButton = document.getElementById("join-btn");
const usernameInput = document.getElementById("username-input");
const categorySelect = document.getElementById("category-select");
const focusSelect = document.getElementById("focus-select");
const focusBadge = document.getElementById("focus-badge");
const usersList = document.getElementById("users-list");
const messagesContainer = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let currentUser = null;
let typingTimeout = null;
const allMessages = [];
const activeTypers = new Set();

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
  const sortedMessages = [...allMessages].sort((a, b) => {
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

    if (entry.isQuestion) {
      messageItem.classList.add("message-question");
    }

    const header = document.createElement("div");
    header.className = "message-header";
    header.innerHTML = `<span>${entry.username} - ${formatCategory(entry.category)}</span><span>${formatTime(entry.time)}</span>`;

    const messageText = document.createElement("p");
    messageText.className = "message-text";
    messageText.textContent = entry.message;

    messageItem.append(header, messageText);
    messagesContainer.appendChild(messageItem);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      joinError.textContent = "";
      messageInput.focus();
      addSystemMessage(`You joined as ${username}.`);
    }
  );
});

socket.on("online_users", (users = []) => {
  usersList.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("li");
    row.textContent = `${user.username} (${formatCategory(user.category)})`;
    usersList.appendChild(row);
  });
});

socket.on("receive_message", (messageData) => {
  allMessages.push(messageData);
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
