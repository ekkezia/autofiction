// queue.js — Match Fit registration & queue server
// Frontend communicates via Socket.IO (HTTP_PORT)
// Arduino / physical hardware communicates via raw TCP (TCP_PORT)
// TouchDesigner receives OSC UDP on TD_OSC_PORT

require('dotenv').config({ path: '.env.local' });

const net = require('net');
const http = require('http');
const dgram = require('dgram');
const { exec } = require('child_process');
const { Server } = require('socket.io');

const TCP_PORT = 4000;
const HTTP_PORT = 4002;
const TD_IP = '127.0.0.1'; // change to TD machine IP if on separate machine
const TD_OSC_PORT = 9000;
const CALL_VOICE_RATE = 240; // words/min for macOS `say` (slightly slower than previous)
const CALL_WORD_RATE_JITTER = 12; // random +/- rate per word
const CALL_WORD_PITCH_BASE = 50; // macOS speech base pitch command center
const CALL_WORD_PITCH_JITTER = 7; // random +/- pitch per word
const CALL_LOOP_GAP_MS = 1200;

let seq = 1000;
const queue = new Map(); // code → ticket

// ── OSC UDP out to TouchDesigner ────────────────────────────────────────────

const udp = dgram.createSocket('udp4');

function oscString(str) {
	// null-terminate, then pad total length to multiple of 4
	const len = Math.ceil((str.length + 1) / 4) * 4;
	const buf = Buffer.alloc(len);
	buf.write(str, 0, 'utf8');
	return buf;
}

// ── ElevenLabs TTS + looping playback ──────────────────────────────────────

let audioProcess = null; // current afplay child process
let callingCode = null; // code of ticket currently being called
let audioTimer = null; // timer between words / loops

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shellQuote(value) {
	return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildCallPhrase(ticket) {
	return `Now serving, ${ticket.name}, Ticket ${ticket.code.replace(/-/g, ' ')}. Please go to the office and enjoy your service.`;
}

function stopAudio() {
	if (audioTimer) {
		clearTimeout(audioTimer);
		audioTimer = null;
	}
	if (audioProcess) {
		audioProcess.kill();
		audioProcess = null;
	}
	callingCode = null;
}

function startCallingLoop(ticket) {
	callingCode = ticket.code;
	const phrase = buildCallPhrase(ticket);
	console.log('Announcing:', phrase);

	function speakPhrase() {
		if (callingCode !== ticket.code) return;
		const pitch = CALL_WORD_PITCH_BASE + randomInt(-CALL_WORD_PITCH_JITTER, CALL_WORD_PITCH_JITTER);
		const rate = CALL_VOICE_RATE + randomInt(-CALL_WORD_RATE_JITTER, CALL_WORD_RATE_JITTER);
		const text = `[[pbas ${pitch}]] ${phrase}`;
		const cmd = `say -v "Fred" -r ${rate} ${shellQuote(text)}`;

		audioProcess = exec(cmd, () => {
			if (callingCode !== ticket.code) return;
			audioTimer = setTimeout(speakPhrase, CALL_LOOP_GAP_MS);
		});
	}

	speakPhrase();
}

function notifyTD(address, value) {
	const addrBuf = oscString(address);
	const typesBuf = oscString(',s');
	const valBuf = oscString(String(value));
	const buf = Buffer.concat([addrBuf, typesBuf, valBuf]);
	udp.send(buf, TD_OSC_PORT, TD_IP, (err) => {
		if (err) console.error('OSC send error:', err.message);
		else console.log(`OSC → TD  ${address}  "${value}"`);
	});
}

// ── Queue helpers ────────────────────────────────────────────────────────────

function mkCode() {
	seq += 1;
	return `${String(seq).padStart(4, '0')}`;
}

function createTicket(name) {
	const code = mkCode();
	const ticket = {
		code,
		name: name.trim(),
		barcode: code,
		timestamp: new Date().toISOString(),
		status: 'waiting',
		counter: 'A1',
	};
	queue.set(code, ticket);
	return ticket;
}

function emitSnapshot() {
	io.emit('queue_snapshot', Array.from(queue.values()));
}

function currentCalling() {
	return Array.from(queue.values()).find((t) => t.status === 'calling') || null;
}

// Oldest waiting = smallest timestamp
function oldestWaiting() {
	return (
		Array.from(queue.values())
			.filter((t) => t.status === 'waiting')
			.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0] || null
	);
}

// ── Socket.IO (frontend) ────────────────────────────────────────────────────

const httpServer = http.createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
	console.log('Frontend connected');
	socket.emit('queue_snapshot', Array.from(queue.values()));

	socket.on('register_user', ({ name }) => {
		if (!name || !name.trim()) return;
		const ticket = createTicket(name);
		console.log('Registered:', ticket);
		emitSnapshot();
		sendToArduinos(ticket);
		socket.emit('register_ack', ticket);
	});

	// Admin: call next oldest waiting → calling (max 1 at a time)
	// Audio generation: keep calling the person on call (loop)
	// Call using ElevenLabs voices: "Calling [name], ticket number [code]."
	socket.on('call_next', () => {
		console.log(
			'[call_next] received — waiting:',
			oldestWaiting()?.name,
			'| calling:',
			currentCalling()?.name,
		);
		if (currentCalling()) {
			socket.emit('call_error', { reason: 'Someone is already being called.' });
			return;
		}
		const next = oldestWaiting();
		if (!next) {
			socket.emit('call_error', { reason: 'No one is waiting.' });
			return;
		}
		const updated = { ...next, status: 'calling' };
		queue.set(next.code, updated);
		emitSnapshot();
		notifyTD('/matchfit/calling', `${updated.code} ${updated.name}`);
		startCallingLoop(updated);
		console.log('Calling:', updated);
	});

	// Admin: admit current calling → admitted
	// Audio generation: stop the call loop
	socket.on('admit_current', () => {
		const calling = currentCalling();
		if (!calling) {
			socket.emit('admit_error', {
				reason: 'No one is currently being called.',
			});
			return;
		}
		const updated = { ...calling, status: 'admitted' };
		queue.set(calling.code, updated);
		emitSnapshot();
		notifyTD('/matchfit/admitted', `${updated.code} ${updated.name}`);
		stopAudio();
		console.log('Admitted:', updated);
	});

	socket.on('get_queue', () => {
		socket.emit('queue_snapshot', Array.from(queue.values()));
	});

	socket.on('disconnect', () => console.log('Frontend disconnected'));
});

httpServer.listen(HTTP_PORT, () => {
	console.log(`Socket.IO queue server → http://localhost:${HTTP_PORT}`);
});

// ── TCP (Arduino / physical hardware) ──────────────────────────────────────

const arduinoSockets = new Set(); // track all connected Arduino clients

function formatTime(iso) {
	return new Date(iso).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function sendToArduinos(ticket) {
	// Positional format — Arduino reads line 1=code, 2=counter, 3=barcode, 4=time, blank=end
	const msg =
		`${ticket.code}\n` +
		`${ticket.counter}\n` +
		`${ticket.barcode}\n` +
		`${formatTime(ticket.timestamp)}\n` +
		`${ticket.name}\n` + // 👈 ADD THIS
		`\n`;
	for (const s of arduinoSockets) {
		try {
			s.write(msg);
		} catch (e) {
			/* socket may have closed */
		}
	}
}

const tcpServer = net.createServer((socket) => {
	console.log('TCP client connected:', socket.remoteAddress);
	arduinoSockets.add(socket);

	socket.on('end', () => {
		arduinoSockets.delete(socket);
		console.log('TCP client disconnected');
	});
	socket.on('error', (err) => {
		arduinoSockets.delete(socket);
		console.error('TCP error:', err.message);
	});
});

tcpServer.listen(TCP_PORT, () => {
	console.log(`TCP queue server → port ${TCP_PORT}`);
});
