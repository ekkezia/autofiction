// light/server.js — Lighting control server
// Browser → Socket.IO (HTTP 4003) → OSC UDP → TouchDesigner (9001)

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const dgram = require('dgram');
const osc   = require('osc-min');
const { Server } = require('socket.io');

const HTTP_PORT   = 4003;
const TD_IP       = '127.0.0.1';
const TD_OSC_PORT = 9001;

const udp = dgram.createSocket('udp4');

function sendOSC(address, value) {
  const type = typeof value === 'number' ? 'integer' : 'string';
  const buf  = osc.toBuffer({ address, args: [{ type, value }] });
  udp.send(buf, TD_OSC_PORT, TD_IP, (err) => {
    if (err) console.error('OSC error:', err.message);
    else     console.log(`OSC → ${address} = ${value}`);
  });
}

// ── HTTP — serve index.html ─────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }
});

// ── Socket.IO ───────────────────────────────────────────────────────────────

const io = new Server(httpServer, { cors: { origin: '*' } });

let state = { spotlight: false, pathlight: false, timer: false };
let timerInterval = null;
let seconds = 0;

function startTimer(socket) {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    seconds++;
    io.emit('timer_tick', seconds);
    sendOSC('/light/timer', seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  seconds = 0;
  io.emit('timer_tick', 0);
  sendOSC('/light/timer', 0);
}

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('state', { ...state, seconds });

  socket.on('spotlight', (val) => {
    state.spotlight = val;
    io.emit('state', { ...state, seconds });
    sendOSC('/light/spotlight', val ? 1 : 0);
  });

  socket.on('pathlight', (val) => {
    state.pathlight = val;
    io.emit('state', { ...state, seconds });
    sendOSC('/light/pathlight', val ? 1 : 0);
  });

  socket.on('timer', (val) => {
    state.timer = val;
    io.emit('state', { ...state, seconds });
    if (val) {
      startTimer();
    } else {
      resetTimer();
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`Light control → http://localhost:${HTTP_PORT}`);
  console.log(`OSC → TouchDesigner at ${TD_IP}:${TD_OSC_PORT}`);
});
