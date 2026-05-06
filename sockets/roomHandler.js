function sanitize(value) {
  return String(value || "").trim();
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data));
}

function broadcastToRoom(wss, users, roomId, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => {
    const u = users.get(c);
    if (u && u.roomId === roomId && c.readyState === c.OPEN) c.send(msg);
  });
}

function setupRoomHandlers(wss, ws, users, rooms, payload) {
  const { event } = payload;
  const user = users.get(ws);

  if (event === "request_rooms") {
    const list = Array.from(rooms.values()).map(({ id, name, icon, isGroup, memberCount }) => ({
      id, name, icon, isGroup, memberCount,
    }));
    send(ws, { event: "rooms_list", rooms: list });
  }

  if (event === "create_room") {
    if (!user) return send(ws, { event: "create_room_ack", success: false, message: "Join first." });
    const name = sanitize(payload.name).slice(0, 40);
    const icon = sanitize(payload.icon).slice(0, 2) || "💬";
    if (!name) return send(ws, { event: "create_room_ack", success: false, message: "Room name required." });
    const exists = Array.from(rooms.values()).some((r) => r.name.toLowerCase() === name.toLowerCase() && r.isGroup);
    if (exists) return send(ws, { event: "create_room_ack", success: false, message: "Room name already taken." });

    const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    rooms.set(id, { id, name, icon, isGroup: true, messages: [], memberCount: 0 });

    const list = Array.from(rooms.values()).map(({ id, name, icon, isGroup, memberCount }) => ({ id, name, icon, isGroup, memberCount }));
    wss.clients.forEach((c) => { if (c.readyState === c.OPEN) c.send(JSON.stringify({ event: "rooms_list", rooms: list })); });
    send(ws, { event: "create_room_ack", success: true, roomId: id });
  }

  if (event === "join_room") {
    if (!user) return send(ws, { event: "join_room_ack", success: false, message: "Join first." });
    const roomId = sanitize(payload.roomId);
    const room = rooms.get(roomId);
    if (!room) return send(ws, { event: "join_room_ack", success: false, message: "Room not found." });

    // leave previous room
    if (user.roomId && user.roomId !== roomId) {
      const prev = rooms.get(user.roomId);
      if (prev) {
        prev.memberCount = Math.max(0, prev.memberCount - 1);
        broadcastToRoom(wss, users, user.roomId, { event: "user_left_room", username: user.username, roomId: user.roomId });
      }
    }

    user.roomId = roomId;
    room.memberCount = (room.memberCount || 0) + 1;

    send(ws, { event: "join_room_ack", success: true, roomId, messages: room.messages });
    broadcastToRoom(wss, users, roomId, { event: "user_joined_room", username: user.username, roomId, time: new Date().toISOString() });

    const list = Array.from(rooms.values()).map(({ id, name, icon, isGroup, memberCount }) => ({ id, name, icon, isGroup, memberCount }));
    wss.clients.forEach((c) => { if (c.readyState === c.OPEN) c.send(JSON.stringify({ event: "rooms_list", rooms: list })); });
  }
}

module.exports = { setupRoomHandlers, broadcastToRoom };
