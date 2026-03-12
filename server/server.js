// ============================================================
//  CEREBRO CODE RED SYNCHRONIZER — Server
//  Stranger Things themed real-time video sync server
//  Node.js + Express + Socket.io
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 3000;

// Serve static files from /client
app.use(express.static(path.join(__dirname, '../client')));

// Fallback to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ─────────────────────────────────────────────────────────────
//  Room State Management
// ─────────────────────────────────────────────────────────────
const rooms = {};
// rooms[code] = {
//   broadcaster: socketId | null,
//   listeners: Set<socketId>,
//   currentTime: number,
//   playing: boolean,
//   videoSrc: string | null,
//   lastUpdate: Date
// }

function getOrCreateRoom(code) {
  if (!rooms[code]) {
    rooms[code] = {
      broadcaster: null,
      listeners: new Set(),
      currentTime: 0,
      playing: false,
      videoSrc: null,
      lastUpdate: new Date(),
    };
    console.log(`[CEREBRO] Room created: ${code}`);
  }
  return rooms[code];
}

function getRoomInfo(code) {
  const room = rooms[code];
  if (!room) return null;
  return {
    code,
    broadcasterConnected: !!room.broadcaster,
    listenerCount: room.listeners.size,
    currentTime: room.currentTime,
    playing: room.playing,
    videoSrc: room.videoSrc,
  };
}

function broadcastRoomStatus(code) {
  const info = getRoomInfo(code);
  if (!info) return;
  io.to(code).emit('room-status', info);
}

// ─────────────────────────────────────────────────────────────
//  Socket.io Connection Handler
// ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[CEREBRO] Agent connected: ${socket.id}`);

  let currentRoom = null;
  let currentRole = null;

  // ── BROADCASTER: Create Room ──────────────────────────────
  socket.on('create-room', ({ roomCode }) => {
    const code = roomCode.toUpperCase().trim();
    const room = getOrCreateRoom(code);

    if (room.broadcaster && room.broadcaster !== socket.id) {
      socket.emit('error-msg', { message: 'Room already has a broadcaster. Use a different room code.' });
      return;
    }

    room.broadcaster = socket.id;
    currentRoom = code;
    currentRole = 'broadcaster';

    socket.join(code);
    socket.emit('room-joined', { role: 'broadcaster', roomCode: code, info: getRoomInfo(code) });
    broadcastRoomStatus(code);

    console.log(`[CEREBRO] Broadcaster ${socket.id} created room ${code}`);
  });

  // ── LISTENER: Join Room ────────────────────────────────────
  socket.on('join-room', ({ roomCode }) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      socket.emit('error-msg', { message: `Room ${code} not found. Ask the broadcaster to create it first.` });
      return;
    }

    room.listeners.add(socket.id);
    currentRoom = code;
    currentRole = 'listener';

    socket.join(code);

    // Send current playback state immediately to the new listener
    socket.emit('room-joined', {
      role: 'listener',
      roomCode: code,
      info: getRoomInfo(code),
      syncState: {
        currentTime: room.currentTime,
        playing: room.playing,
        videoSrc: room.videoSrc,
      },
    });
    broadcastRoomStatus(code);

    console.log(`[CEREBRO] Listener ${socket.id} joined room ${code}`);
  });

  // ── PLAYBACK EVENTS from Broadcaster ─────────────────────
  socket.on('play', ({ roomCode, currentTime }) => {
    const code = (roomCode || currentRoom || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || room.broadcaster !== socket.id) return;

    room.playing = true;
    room.currentTime = currentTime;
    room.lastUpdate = new Date();

    // Relay to all listeners in the room
    socket.to(code).emit('play', { currentTime, serverTime: Date.now() });
    broadcastRoomStatus(code);
    console.log(`[CEREBRO] PLAY @ ${currentTime.toFixed(2)}s in room ${code}`);
  });

  socket.on('pause', ({ roomCode, currentTime }) => {
    const code = (roomCode || currentRoom || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || room.broadcaster !== socket.id) return;

    room.playing = false;
    room.currentTime = currentTime;
    room.lastUpdate = new Date();

    socket.to(code).emit('pause', { currentTime, serverTime: Date.now() });
    broadcastRoomStatus(code);
    console.log(`[CEREBRO] PAUSE @ ${currentTime.toFixed(2)}s in room ${code}`);
  });

  socket.on('seek', ({ roomCode, currentTime }) => {
    const code = (roomCode || currentRoom || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || room.broadcaster !== socket.id) return;

    room.currentTime = currentTime;
    room.lastUpdate = new Date();

    socket.to(code).emit('seek', { currentTime, serverTime: Date.now() });
    broadcastRoomStatus(code);
    console.log(`[CEREBRO] SEEK → ${currentTime.toFixed(2)}s in room ${code}`);
  });

  // ── PERIODIC SYNC BROADCAST ────────────────────────────────
  // Broadcaster sends this every ~5s so listeners can drift-correct
  socket.on('sync-broadcast', ({ roomCode, currentTime, playing }) => {
    const code = (roomCode || currentRoom || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || room.broadcaster !== socket.id) return;

    room.currentTime = currentTime;
    room.playing = playing;
    room.lastUpdate = new Date();

    socket.to(code).emit('sync', {
      currentTime,
      playing,
      serverTime: Date.now(),
    });
  });

  // ── VIDEO SOURCE Change ────────────────────────────────────
  socket.on('video-src', ({ roomCode, src }) => {
    const code = (roomCode || currentRoom || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || room.broadcaster !== socket.id) return;

    room.videoSrc = src;
    // Can't relay blob URLs across network — just signal that a video is loaded
    socket.to(code).emit('video-loaded', { message: 'Broadcaster loaded a video. Load the same video file.' });
    broadcastRoomStatus(code);
  });

  // ── LATENCY PING / PONG ────────────────────────────────────
  socket.on('ping-latency', ({ t }) => {
    socket.emit('pong-latency', { t });
  });

  // ── SYNC REQUEST from Listener ─────────────────────────────
  socket.on('sync-request', ({ roomCode }) => {
    const code = (roomCode || currentRoom || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return;

    // Ask broadcaster to send current time
    if (room.broadcaster) {
      io.to(room.broadcaster).emit('sync-request-from-listener', { listenerId: socket.id });
    }
  });

  // ── SYNC RESPONSE from Broadcaster to specific listener ────
  socket.on('sync-response', ({ listenerId, currentTime, playing }) => {
    io.to(listenerId).emit('sync', { currentTime, playing, serverTime: Date.now() });
  });

  // ── DISCONNECT ─────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[CEREBRO] Agent disconnected: ${socket.id}`);

    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];

    if (currentRole === 'broadcaster') {
      room.broadcaster = null;
      io.to(currentRoom).emit('broadcaster-disconnected', {
        message: 'SIGNAL LOST — Broadcaster has disconnected.',
      });
      console.log(`[CEREBRO] Broadcaster left room ${currentRoom}`);
    } else {
      room.listeners.delete(socket.id);
    }

    broadcastRoomStatus(currentRoom);

    // Cleanup empty rooms
    if (!room.broadcaster && room.listeners.size === 0) {
      delete rooms[currentRoom];
      console.log(`[CEREBRO] Room ${currentRoom} closed (empty)`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          CEREBRO CODE RED SYNCHRONIZER v1.0              ║');
  console.log('║           Hawkins Lab — Signal Broadcasting              ║');
  console.log(`║              Listening on port ${PORT}                      ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Access: http://localhost:${PORT}`);
  console.log('  Status: UPSIDE DOWN CONNECTION ACTIVE');
  console.log('');
});
