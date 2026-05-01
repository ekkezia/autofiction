// server/light.js — Lighting control server
// Browser → Socket.IO (HTTP 4003) → OSC UDP → TouchDesigner (9001)

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { Client, Message } = require('node-osc');
const { Server } = require('socket.io');

const HTTP_PORT   = 4003;
const TD_IP       = '127.0.0.1';
const TD_OSC_PORT = 9001;
const LIGHT_DIR = path.resolve(__dirname, '..', 'light');

const osc = new Client(TD_IP, TD_OSC_PORT);

function sendOSC(address, value) {
  osc.send(new Message(address, value), (err) => {
    if (err) console.error('OSC error:', err.message);
    else     console.log(`OSC → ${address} = ${value}`);
  });
}

// ── HTTP — serve index.html + config.js ─────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(LIGHT_DIR, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  if (req.url === '/config.js') {
    fs.readFile(path.join(LIGHT_DIR, 'config.js'), (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

// ── Socket.IO ───────────────────────────────────────────────────────────────

const io = new Server(httpServer, { cors: { origin: '*' } });

let state = { spotlight: false, timer: false, panic: false };

let timerInterval = null;
let seconds = 0;
const TIMER_START_SECONDS = 60;


function startTimer() {
  if (timerInterval) return;
  seconds = TIMER_START_SECONDS;
  io.emit('timer_tick', seconds);
  timerInterval = setInterval(() => {
    seconds--;
    io.emit('timer_tick', seconds);
    if (seconds <= 0) {
      stopTimer();
      state.timer = false;
      sendOSC('/light/service', 0);
      io.emit('timer_complete');
      io.emit('state', { ...state, seconds });
    }
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
}

function asBool(val) {
  return typeof val === 'boolean' ? val : Number(val) === 1;
}

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('state', { ...state, seconds });

  socket.on('/light/intro', (val) => {
    const spotlightOn = asBool(val);
    state.spotlight = spotlightOn;
    io.emit('state', { ...state, seconds });
    sendOSC('/light/intro', spotlightOn ? 1 : 0);
  });

  socket.on('/light/service', (val) => {
    const timerOn = asBool(val);
    state.timer = timerOn;
    sendOSC('/light/service', timerOn ? 1 : 0);
    io.emit('state', { ...state, seconds });
    if (timerOn) {
      startTimer();
    } else {
      resetTimer();
    }
  });

  socket.on('service_feedback', (payload) => {
    const rating = Number(payload?.rating || 0);
    const tip = String(payload?.tip || 'No Tip');
    const signature = String(payload?.signature || '').trim();
    console.log('Service feedback:', {
      rating,
      tip,
      signature,
      submittedAt: payload?.submittedAt || new Date().toISOString(),
    });
  });

  socket.on('panic', (val) => {
    const panicOn = typeof val === 'boolean' ? val : Number(val) === 1;
    state.panic = panicOn;
    io.emit('state', { ...state, seconds });
    console.log(`PANIC toggled: ${panicOn ? 'ON' : 'OFF'}`);
    sendOSC('/light/panic', panicOn ? 1 : 0);
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`Light control → http://localhost:${HTTP_PORT}`);
  console.log(`OSC → TouchDesigner at ${TD_IP}:${TD_OSC_PORT}`);
});
