const socket = new WebSocket(`ws://${location.host}`);
const emit = (event, data = {}) => socket.send(JSON.stringify({ event, ...data }));

const joinPanel = document.getElementById("join-panel");
const chatPanel = document.getElementById("chat-panel");
const joinError = document.getElementById("join-error");
const joinButton = document.getElementById("join-btn");
const usernameInput = document.getElementById("username-input");
const categorySelect = document.getElementById("category-select");
const focusSelect = document.getElementById("focus-select");
const focusBadge = document.getElementById("focus-badge");
const roomTitle = document.getElementById("room-title");
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
const micButton = document.getElementById("mic-btn");
const editBar = document.getElementById("edit-bar");
const editBarPreview = document.getElementById("edit-bar-preview");
const editCancelButton = document.getElementById("edit-cancel-btn");
const themeToggle = document.getElementById("theme-toggle");
const newGroupBtn = document.getElementById("new-group-btn");
const newGroupModal = document.getElementById("new-group-modal");
const newGroupNameInput = document.getElementById("new-group-name");
const newGroupError = document.getElementById("new-group-error");
const newGroupCancel = document.getElementById("new-group-cancel");
const newGroupSubmit = document.getElementById("new-group-submit");
const groupList = document.getElementById("group-list");
const groupListEmpty = document.getElementById("group-list-empty");
const dmList = document.getElementById("dm-list");
const dmListEmpty = document.getElementById("dm-list-empty");
const dmUsernameInput = document.getElementById("dm-username-input");
const chatPlaceholder = document.getElementById("chat-placeholder");
const chatView = document.getElementById("chat-view");
const roomAvatar = document.getElementById("room-avatar");
const roomSubtitle = document.getElementById("room-subtitle");
const sidebarTabs = document.querySelectorAll(".sidebar-tab");
const tabGroups = document.getElementById("tab-groups");
const tabDms = document.getElementById("tab-dms");
const userAvatarEl = document.getElementById("user-avatar");
const userNameDisplay = document.getElementById("user-name-display");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenuBtnPlaceholder = document.getElementById("mobile-menu-btn-placeholder");
const mobileOverlay = document.getElementById("mobile-overlay");

// Initialize sidebarVisible based on viewport width
let sidebarVisible = window.innerWidth > 768;

let currentUser = null;
let typingTimeout = null;
const allMessages = [];
const activeTypers = new Set();
let activeChatUser = null;
let activeGroup = null;
let contextMessageId = null;
let editingMessageId = null;
const systemPills = [];
const groups = [{ name: "General", members: 0 }];
const dmChats = new Map();

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", current === "dark" ? "" : "dark");
});

sidebarTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    sidebarTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    if (target === "groups") {
      tabGroups.classList.remove("hidden");
      tabDms.classList.add("hidden");
    } else {
      tabGroups.classList.add("hidden");
      tabDms.classList.remove("hidden");
    }
  });
});

function addSystemMessage(text, time = new Date().toISOString()) {
  systemPills.push({ text, time });
  renderMessages();
}

function showChat(type, identifier) {
  chatPlaceholder.classList.add("hidden");
  chatView.classList.remove("hidden");
  if (type === "group") {
    activeGroup = identifier;
    activeChatUser = null;
    const group = groups.find(g => g.name === identifier);
    roomTitle.textContent = identifier;
    roomAvatar.textContent = identifier[0]?.toUpperCase() || "G";
    roomSubtitle.textContent = `${group?.members || 0} members`;
  } else {
    activeChatUser = identifier;
    activeGroup = null;
    roomTitle.textContent = identifier;
    roomAvatar.textContent = identifier[0]?.toUpperCase() || "U";
    roomSubtitle.textContent = "Direct message";
  }
  renderMessages();
  autoCloseMobileSidebar();
}

function enterEditMode(entry) {
  editingMessageId = entry.id;
  messageInput.value = entry.message;
  editBarPreview.textContent = entry.message;
  editBar.classList.remove("hidden");
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
}

function exitEditMode() {
  editingMessageId = null;
  messageInput.value = "";
  editBar.classList.add("hidden");
}

const EMOJI_CATEGORIES = {
  "🔥 Popular": ["🔥","✨","🎉","💯","🙌","👏","🤩","😍","🥳","🎊","💪","🚀","⭐","🌟","💫","🎯","👑","💎","🏆","🎁"],
  "😀 Smileys": ["😀","😁","😂","🤣","😃","😄","😅","😆","😇","😉","😊","😋","😌","😍","🥰","😎","😏","😐","😑","😒","😓","😔","😕","😖","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","🙁","🙂","🙃","🙄"],
  "👋 People": ["👋","🤚","✋","🖖","👌","✌","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","💪","🦾","👂","👃","👀","👁","👅","👄","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵"],
  "❤️ Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟"],
  "🐶 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐩","🐈","🐓","🦃","🦚","🦜","🦢","🦩","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔"],
  "🍎 Food": ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥒","🌶","🥔","🍠","🥐","🍞","🥖","🥨","🧀","🥚","🍳","🥞","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🌮","🌯","🥗","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🍤","🍙","🍚","🍘","🍥","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🍯","🥤","☕","🍵","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🍾"],
};

const FOCUS_LABELS = {
  online: "Online",
  away: "Away",
  busy: "Busy",
};

function formatCategory(value) { return value.replaceAll("_", " "); }
function formatTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function getMessagePreview(entry) {
  return entry.message || (entry.attachment ? `Attachment: ${entry.attachment.name}` : "");
}
function hideContextMenu() { contextMenu.classList.add("hidden"); contextMessageId = null; }
function hideEmojiPicker() { emojiPicker.classList.add("hidden"); }

function messagePriority(message) {
  if (!currentUser) return 3;
  if (currentUser.focusMode === "online") {
    if (message.category === "student") return 0;
    if (message.category === "professional") return 1;
    return 3;
  }
  if (currentUser.focusMode === "away") return message.isQuestion ? 0 : 2;
  return message.category === "student" ? 1 : 2;
}

function renderMessages() {
  const filtered = allMessages.filter((entry) => {
    if (activeGroup) return entry.group === activeGroup;
    if (activeChatUser) {
      return (entry.username === activeChatUser && entry.recipient === currentUser?.username) ||
             (entry.username === currentUser?.username && entry.recipient === activeChatUser);
    }
    return !entry.group && !entry.recipient;
  });

  const sorted = [...filtered].sort((a, b) => {
    const diff = messagePriority(a) - messagePriority(b);
    return diff !== 0 ? diff : new Date(a.time) - new Date(b.time);
  });

  messagesContainer.innerHTML = "";
  const pills = [...systemPills];
  let pi = 0;
  sorted.forEach((entry) => {
    while (pi < pills.length && new Date(pills[pi].time) <= new Date(entry.time)) {
      const pill = document.createElement("div");
      pill.className = "system-event";
      pill.textContent = pills[pi].text;
      messagesContainer.appendChild(pill);
      pi++;
    }
    const item = document.createElement("article");
    item.className = `message message-${entry.category}`;
    if (entry.username === currentUser?.username) item.classList.add("message-own");
    if (entry.isQuestion) item.classList.add("message-question");

    const header = document.createElement("div");
    header.className = "message-header";
    header.innerHTML = `<span>${entry.username} - ${formatCategory(entry.category)}</span><span>${formatTime(entry.time)}</span>`;
    item.append(header);

    if (entry.message) {
      const p = document.createElement("p");
      p.className = "message-text";
      p.textContent = entry.message;
      item.append(p);
    }

    if (entry.attachment) {
      if (entry.attachment.type.startsWith("audio/")) {
        const audio = document.createElement("audio");
        audio.className = "message-audio";
        audio.controls = true;
        audio.src = entry.attachment.dataUrl;
        item.append(audio);
      } else {
        const a = document.createElement("a");
        a.className = "message-attachment";
        a.href = entry.attachment.dataUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = entry.attachment.name;
        a.textContent = `📎 ${entry.attachment.name}`;
        item.append(a);
      }
    }

    if (entry.username === currentUser?.username) {
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        contextMessageId = entry.id;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.classList.remove("hidden");
      });
    }
    messagesContainer.appendChild(item);
  });
  while (pi < pills.length) {
    const pill = document.createElement("div");
    pill.className = "system-event";
    pill.textContent = pills[pi].text;
    messagesContainer.appendChild(pill);
    pi++;
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderGroupList() {
  groupList.innerHTML = "";
  groups.forEach((group) => {
    const item = document.createElement("li");
    item.className = "chat-list-item" + (group.name === activeGroup ? " active" : "");
    item.innerHTML = `
      <div class="chat-avatar group-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div class="chat-meta">
        <div class="chat-meta-top"><strong>${group.name}</strong></div>
        <p>${group.members} members</p>
      </div>`;
    item.addEventListener("click", () => showChat("group", group.name));
    groupList.appendChild(item);
  });
  groupListEmpty.classList.toggle("hidden", groups.length > 0);
}

function renderDMList() {
  const dms = new Map();
  allMessages.forEach((entry) => {
    if (!currentUser || !entry.recipient || entry.group) return;
    const otherUser = entry.recipient === currentUser.username ? entry.username : entry.recipient;
    if (otherUser === currentUser.username) return;
    const prev = dms.get(otherUser);
    if (!prev || new Date(entry.time) > new Date(prev.time)) dms.set(otherUser, entry);
  });
  const sorted = Array.from(dms.values()).sort((a, b) => new Date(b.time) - new Date(a.time));
  dmList.innerHTML = "";
  sorted.forEach((entry) => {
    const otherUser = entry.recipient === currentUser.username ? entry.username : entry.recipient;
    const item = document.createElement("li");
    item.className = "chat-list-item" + (otherUser === activeChatUser ? " active" : "");
    item.innerHTML = `
      <div class="chat-avatar">${otherUser[0]?.toUpperCase() || "U"}</div>
      <div class="chat-meta">
        <div class="chat-meta-top"><strong>${otherUser}</strong><span>${formatTime(entry.time)}</span></div>
        <p>${getMessagePreview(entry)}</p>
      </div>`;
    item.addEventListener("click", () => showChat("dm", otherUser));
    dmList.appendChild(item);
  });
  dmListEmpty.style.display = sorted.length ? "none" : "block";
}

socket.addEventListener("message", ({ data }) => {
  let payload;
  try { payload = JSON.parse(data); } catch { return; }
  const { event } = payload;

  if (event === "join_ack") {
    if (!payload.success) { joinError.textContent = payload.message || "Could not join chat."; return; }
    joinPanel.classList.add("hidden");
    chatPanel.classList.remove("hidden");
    focusBadge.textContent = FOCUS_LABELS[currentUser.focusMode] || "Focus: Active";
    userAvatarEl.textContent = currentUser.username[0]?.toUpperCase() || "U";
    userNameDisplay.textContent = currentUser.username;
    joinError.textContent = "";
    const joinTime = new Date();
    addSystemMessage(`You joined · ${joinTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, joinTime.toISOString());
    emit("request_messages");
    renderGroupList();
    renderDMList();
  }

  if (event === "messages_history") {
    allMessages.length = 0;
    allMessages.push(...(payload.messages || []));
    renderGroupList();
    renderDMList();
    renderMessages();
  }

  if (event === "receive_message") {
    const { event: _, ...msg } = payload;
    allMessages.push(msg);
    renderGroupList();
    renderDMList();
    renderMessages();
  }

  if (event === "message_updated") {
    const { event: _, ...updated } = payload;
    const idx = allMessages.findIndex((m) => m.id === updated.id);
    if (idx !== -1) allMessages[idx] = updated;
    renderGroupList();
    renderDMList();
    renderMessages();
  }

  if (event === "message_deleted") {
    const idx = allMessages.findIndex((m) => m.id === payload.messageId);
    if (idx !== -1) allMessages.splice(idx, 1);
    renderGroupList();
    renderDMList();
    renderMessages();
  }

  if (event === "send_ack" && !payload.success) addSystemMessage(payload.message || "Could not send message");
  if (event === "edit_ack" && !payload.success) addSystemMessage(payload.message || "Could not edit message");
  if (event === "delete_ack" && !payload.success) addSystemMessage(payload.message || "Could not delete message");

  if (event === "user_connected") {
    if (!currentUser || payload.username === currentUser.username) return;
    addSystemMessage(`${payload.username} joined`, payload.time);
  }

  if (event === "user_disconnected") {
    activeTypers.delete(payload.username);
    typingIndicator.textContent = "";
    addSystemMessage(`${payload.username} left`, payload.time);
  }

  if (event === "typing") {
    if (!currentUser || payload.username === currentUser.username) return;
    activeTypers.add(payload.username);
    typingIndicator.textContent = `${Array.from(activeTypers).join(", ")} is typing...`;
  }

  if (event === "stop_typing") {
    activeTypers.delete(payload.username);
    typingIndicator.textContent = activeTypers.size ? `${Array.from(activeTypers).join(", ")} is typing...` : "";
  }
});

joinButton.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) { joinError.textContent = "Please enter a username."; return; }
  currentUser = { username, category: categorySelect.value, focusMode: focusSelect.value };
  emit("join_user", { username, category: categorySelect.value, focusMode: focusSelect.value });
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  const payload = { message };
  if (activeGroup) payload.group = activeGroup;
  if (activeChatUser) payload.recipient = activeChatUser;
  if (editingMessageId) {
    emit("edit_message", { messageId: editingMessageId, message });
    exitEditMode();
  } else {
    emit("send_message", payload);
    emit("stop_typing");
    messageInput.value = "";
  }
});

messageInput.addEventListener("input", () => {
  if (!currentUser) return;
  emit("typing");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => emit("stop_typing"), 1000);
});

contextEditButton.addEventListener("click", () => {
  const id = contextMessageId;
  hideContextMenu();
  const entry = allMessages.find((m) => m.id === id);
  if (!entry) return;
  enterEditMode(entry);
});

contextDeleteButton.addEventListener("click", () => {
  const id = contextMessageId;
  hideContextMenu();
  if (!id) return;
  emit("delete_message", { messageId: id });
});

editCancelButton.addEventListener("click", exitEditMode);
attachButton.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject();
    reader.readAsDataURL(file);
  }).catch(() => null);
  if (!dataUrl) { addSystemMessage("Could not attach this file"); fileInput.value = ""; return; }
  const payload = { message: messageInput.value.trim(), attachment: { name: file.name, type: file.type || "application/octet-stream", dataUrl } };
  if (activeGroup) payload.group = activeGroup;
  if (activeChatUser) payload.recipient = activeChatUser;
  emit("send_message", payload);
  messageInput.value = "";
  fileInput.value = "";
});

emojiButton.addEventListener("click", () => emojiPicker.classList.toggle("hidden"));

(function buildEmojiPicker() {
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "emoji-search";
  searchInput.placeholder = "Search emoji...";
  emojiPicker.appendChild(searchInput);

  const tabBar = document.createElement("div");
  tabBar.className = "emoji-tab-bar";
  emojiPicker.appendChild(tabBar);

  const grid = document.createElement("div");
  grid.className = "emoji-grid";
  emojiPicker.appendChild(grid);

  let activeCategory = Object.keys(EMOJI_CATEGORIES)[0];

  function insertEmoji(emoji) {
    const start = messageInput.selectionStart ?? messageInput.value.length;
    const end = messageInput.selectionEnd ?? messageInput.value.length;
    messageInput.value = `${messageInput.value.slice(0, start)}${emoji}${messageInput.value.slice(end)}`;
    messageInput.focus();
    messageInput.setSelectionRange(start + emoji.length, start + emoji.length);
  }

  function renderGrid(emojis) {
    grid.innerHTML = "";
    emojis.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "emoji-item";
      btn.textContent = emoji;
      btn.addEventListener("click", () => insertEmoji(emoji));
      grid.appendChild(btn);
    });
  }

  function showCategory(cat) {
    activeCategory = cat;
    tabBar.querySelectorAll(".emoji-tab").forEach((t) => t.classList.toggle("active", t.dataset.cat === cat));
    searchInput.value = "";
    renderGrid(EMOJI_CATEGORIES[cat]);
  }

  Object.keys(EMOJI_CATEGORIES).forEach((cat) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "emoji-tab";
    tab.dataset.cat = cat;
    tab.textContent = cat.split(" ")[0];
    tab.title = cat.split(" ").slice(1).join(" ");
    tab.addEventListener("click", () => showCategory(cat));
    tabBar.appendChild(tab);
  });

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { showCategory(activeCategory); return; }
    const all = Object.values(EMOJI_CATEGORIES).flat();
    renderGrid(all.filter((e) => e.includes(q)));
    tabBar.querySelectorAll(".emoji-tab").forEach((t) => t.classList.remove("active"));
  });

  showCategory(activeCategory);
})();

let mediaRecorder = null;
let audioChunks = [];

async function startRecording() {
  if (!currentUser) return;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { addSystemMessage("Microphone access denied"); return; }
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    const ext = blob.type.includes("ogg") ? "ogg" : "webm";
    const reader = new FileReader();
    reader.onload = () => {
      const payload = { attachment: { name: `voice-note.${ext}`, type: blob.type, dataUrl: reader.result } };
      if (activeGroup) payload.group = activeGroup;
      if (activeChatUser) payload.recipient = activeChatUser;
      emit("send_message", payload);
    };
    reader.readAsDataURL(blob);
    micButton.classList.remove("recording");
  };
  mediaRecorder.start();
  micButton.classList.add("recording");
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
}

micButton.addEventListener("mousedown", (e) => { e.preventDefault(); startRecording(); });
micButton.addEventListener("mouseup", stopRecording);
micButton.addEventListener("mouseleave", stopRecording);
micButton.addEventListener("touchstart", (e) => { e.preventDefault(); startRecording(); }, { passive: false });
micButton.addEventListener("touchend", stopRecording);

newGroupBtn.addEventListener("click", () => {
  newGroupModal.classList.remove("hidden");
  newGroupNameInput.value = "";
  newGroupError.textContent = "";
  newGroupNameInput.focus();
});

newGroupCancel.addEventListener("click", () => {
  newGroupModal.classList.add("hidden");
});

newGroupSubmit.addEventListener("click", () => {
  const groupName = newGroupNameInput.value.trim();
  if (!groupName) { newGroupError.textContent = "Please enter a group name."; return; }
  groups.push({ name: groupName, members: 1 });
  renderGroupList();
  newGroupModal.classList.add("hidden");
  showChat("group", groupName);
});

newGroupModal.addEventListener("click", (e) => {
  if (e.target === newGroupModal) newGroupModal.classList.add("hidden");
});

dmUsernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const username = dmUsernameInput.value.trim();
    if (!username) return;
    dmUsernameInput.value = "";
    showChat("dm", username);
  }
});

document.addEventListener("click", (e) => {
  if (!contextMenu.contains(e.target)) hideContextMenu();
  if (!emojiPicker.contains(e.target) && e.target !== emojiButton && !emojiButton.contains(e.target)) hideEmojiPicker();
});

function toggleSidebar() {
  console.log("toggleSidebar called, sidebarVisible was:", sidebarVisible);
  sidebarVisible = !sidebarVisible;
  console.log("sidebarVisible is now:", sidebarVisible);
  
  if (window.innerWidth <= 768) {
    // Mobile: toggle with overlay
    console.log("Mobile view, window width:", window.innerWidth);
    if (sidebarVisible) {
      chatPanel.classList.add("sidebar-visible");
      if (mobileOverlay) mobileOverlay.classList.add("active");
    } else {
      chatPanel.classList.remove("sidebar-visible");
      if (mobileOverlay) mobileOverlay.classList.remove("active");
    }
  } else {
    // Desktop: toggle visibility
    console.log("Desktop view, window width:", window.innerWidth);
    if (sidebarVisible) {
      chatPanel.classList.remove("sidebar-hidden");
    } else {
      chatPanel.classList.add("sidebar-hidden");
    }
  }
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
  console.log("Mobile menu button listener attached");
} else {
  console.warn("mobileMenuBtn is null");
}

if (mobileMenuBtnPlaceholder) {
  mobileMenuBtnPlaceholder.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
  console.log("Mobile menu placeholder button listener attached");
} else {
  console.warn("mobileMenuBtnPlaceholder is null");
}

if (mobileOverlay) {
  mobileOverlay.addEventListener("click", () => {
    sidebarVisible = false;
    chatPanel.classList.remove("sidebar-visible");
    mobileOverlay.classList.remove("active");
  });
}

// Auto-close sidebar on mobile when selecting chat
function autoCloseMobileSidebar() {
  if (window.innerWidth <= 768) {
    sidebarVisible = false;
    chatPanel.classList.remove("sidebar-visible");
    mobileOverlay.classList.remove("active");
  }
}
