# 📡 CEREBRO CODE RED SYNCHRONIZER

> *"FRIENDS DON'T LIE"* — Stranger Things, Hawkins Lab, 1986

A real-time synchronized video player system inspired by the **Stranger Things universe**.
One **Broadcaster** controls the stream — all connected **Listeners** receive and mirror the exact same playback state instantly via WebSockets.

---

## 🛸 FEATURES

- 🎥 **Real-time Video Synchronization** — Play, pause, seek events broadcast to all listeners
- 📡 **Room System** — Create or join rooms with a custom code (e.g. `HAWKINS1986`)
- 🖥️ **Hawkins Lab UI** — Full retro 1980s CRT terminal aesthetic with scanlines, radar, glitch effects, neon palette
- 📊 **Sync Dashboard** — Host vs. Your time comparison, delta (ms), ⚠ DESYNC warning if drift > 500ms
- 🔭 **Radar Visualization** — Animated radar showing connected listener dots
- ⚡ **Connection Health Meter** — Real-time latency monitoring and sync quality display
- 🛸 **WebSocket Debug Log** — All Socket.io events logged in a retro terminal

---

## 🔧 TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Real-time | Socket.io 4.x |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Video | HTML5 `<video>` |
| Fonts | Orbitron, Press Start 2P, VT323 |

---

## 🚀 INSTALLATION & RUNNING

### 1. Install Dependencies

```bash
cd "Cerebro Code Red Synchronizer"
npm install
```

### 2. Start the Server

```bash
node server/server.js
```

You should see:

```
╔══════════════════════════════════════════════════════════╗
║          CEREBRO CODE RED SYNCHRONIZER v1.0              ║
║           Hawkins Lab — Signal Broadcasting              ║
║              Listening on port 3000                      ║
╚══════════════════════════════════════════════════════════╝

  Access: http://localhost:3000
  Status: UPSIDE DOWN CONNECTION ACTIVE
```

### 3. Open Browser

Navigate to: **http://localhost:3000**

---

## 🎮 HOW TO USE

### As a Broadcaster
1. Open `http://localhost:3000`
2. Click **BROADCASTER**
3. Enter a room code (e.g. `HAWKINS1986`) → Click **ESTABLISH CONNECTION**
4. Click **LOAD VIDEO FILE** → select any MP4/WebM video from your device
5. Press ▶ PLAY — all connected listeners will sync instantly!
6. Use ⏸ PAUSE, scrub the seek bar — all events are broadcast in real-time

### As a Listener
1. Open `http://localhost:3000` in **a second browser tab or device**
2. Click **LISTENER**
3. Enter the **same room code** as the broadcaster → **ESTABLISH CONNECTION**
4. Click **LOAD SAME VIDEO** — load the exact same video file
5. The player will auto-sync to the broadcaster's playback state

> **Note:** HTML5 video uses local file URLs (blob:) which cannot be transmitted over the network.  
> Both broadcaster and listener must load the **same video file** from their local device.  
> For a true streaming demo, use an online video URL by modifying `mainVideo.src` directly.

---

## 📁 PROJECT STRUCTURE

```
Cerebro Code Red Synchronizer/
│
├── server/
│   └── server.js          # Express + Socket.io backend
│
├── client/
│   ├── index.html         # Landing page (role selector)
│   ├── host.html          # Broadcaster control panel
│   ├── listener.html      # Listener sync feed
│   └── style.css          # Retro Stranger Things CSS theme
│
├── package.json
└── README.md
```

---

## 🔌 SOCKET.IO EVENTS

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `create-room` | Client → Server | `{ roomCode }` | Broadcaster creates a room |
| `join-room` | Client → Server | `{ roomCode }` | Listener joins a room |
| `play` | Broadcaster → Server → Listeners | `{ currentTime }` | Video play event |
| `pause` | Broadcaster → Server → Listeners | `{ currentTime }` | Video pause event |
| `seek` | Broadcaster → Server → Listeners | `{ currentTime }` | Video seek event |
| `sync-broadcast` | Broadcaster → Listeners | `{ currentTime, playing }` | Drift correction every 5s |
| `sync-request` | Listener → Server | `{ roomCode }` | Request re-sync from broadcaster |
| `sync-response` | Broadcaster → Listener | `{ currentTime, playing }` | Response to sync request |
| `ping-latency` | Any → Server | `{ t }` | Latency measurement |
| `pong-latency` | Server → Any | `{ t }` | Latency response |
| `room-status` | Server → All | `{ listenerCount, ... }` | Room state update |

---

## 🎨 UI THEME

- **Black** (`#050505`) — base background
- **Neon Red** (`#ff003c`) — broadcaster / alert / warning
- **Neon Blue** (`#00d4ff`) — primary HUD / listener
- **CRT Green** (`#39ff14`) — connected status / sync OK

### Animations
- 📺 CRT scanline overlay (repeating gradient)
- ✨ Glitch text effect on titles
- 🔭 Animated radar sweep (SVG rotation)
- 🔴 Blinking warning lights
- 💥 Desync warning flash

---

## 🏆 HACKATHON DEMO TIPS

1. **Open two browser windows side by side** — one as Broadcaster, one as Listener
2. Load the same video in both, then press Play in the Broadcaster window
3. Show the sync time panel — notice < 100ms delta
4. Scrub the video — listener jumps to the same position instantly
5. Show the radar with multiple listener tabs open

---

*Built for hackathon — Hawkins Lab, 1986. The Mind Flayer cannot stop the signal.*
