// tcp_socketio_server.js
// TCP server for Arduino + Socket.IO for frontend

const net = require('net');
const http = require('http');
const { Server } = require('socket.io');

const TCP_PORT = 4000;
const HTTP_PORT = 4001;

let frontendConnected = false;
let currentTicket = null;
let ticketSequence = 1233;
const ticketsByNumber = new Map();

function createNextTicket() {
	ticketSequence += 1;
	const ticket = {
		number: String(ticketSequence),
		counter: 'A1',
		barcode: `${String(ticketSequence).padStart(4, '0')}`, // no hyphen — safer for CODE128
		time: new Date().toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
		}),
		status: 'waiting',
		createdAt: Date.now(),
	};
	ticketsByNumber.set(ticket.number, ticket);
	return ticket;
}

function parseTicketNumber(raw) {
	if (!raw) return '';
	const value = String(raw).trim();
	const prefixed = value.match(/MATCHFIT(\d+)/i);
	if (prefixed) return prefixed[1];
	const digits = value.match(/\d+/);
	return digits ? digits[0] : '';
}

function emitTicketLifecycle() {
	io.emit('tickets_snapshot', Array.from(ticketsByNumber.values()));
}

// ── Socket.IO server ────────────────────────────────────────────────────────

const httpServer = http.createServer();
const io = new Server(httpServer, {
	cors: { origin: '*' },
});

io.on('connection', (socket) => {
	frontendConnected = true;
	console.log('Frontend client connected');

	if (!currentTicket) {
		currentTicket = createNextTicket();
		console.log('Initialized current ticket for new frontend:', currentTicket);
	}
	socket.emit('current_ticket_updated', currentTicket);
	socket.emit('tickets_snapshot', Array.from(ticketsByNumber.values()));

	socket.on('get_current_ticket', () => {
		if (!currentTicket) {
			currentTicket = createNextTicket();
		}
		socket.emit('current_ticket_updated', currentTicket);
	});

	socket.on('get_tickets_snapshot', () => {
		socket.emit('tickets_snapshot', Array.from(ticketsByNumber.values()));
	});

	socket.on('request_ticket', () => {
		currentTicket = createNextTicket();
		io.emit('current_ticket_updated', currentTicket);
		io.emit('arduino_request', currentTicket);
		emitTicketLifecycle();
		console.log('Frontend requested ticket:', currentTicket);
	});

	socket.on('verify_ticket', (payload = {}) => {
		const number = parseTicketNumber(payload.number);
		const counter = payload.counter ? String(payload.counter) : 'A1';
		if (!number) {
			socket.emit('ticket_verification_error', {
				reason: 'invalid_ticket_number',
				input: payload.number,
			});
			return;
		}

		const ticket = ticketsByNumber.get(number);
		if (!ticket) {
			socket.emit('ticket_verification_error', {
				reason: 'ticket_not_found',
				number,
			});
			return;
		}

		const verifiedTicket = {
			...ticket,
			counter,
			status: 'verified',
			verifiedAt: Date.now(),
		};
		ticketsByNumber.set(number, verifiedTicket);
		if (currentTicket && String(currentTicket.number) === number) {
			currentTicket = verifiedTicket;
		}

		io.emit('ticket_verified', verifiedTicket);
		emitTicketLifecycle();
		console.log('Ticket verified:', verifiedTicket);
	});

	socket.on('disconnect', () => {
		frontendConnected = io.engine.clientsCount > 0;
		console.log('Frontend client disconnected');
	});
});

httpServer.listen(HTTP_PORT, () => {
	console.log(`Socket.IO server listening on port ${HTTP_PORT}`);
});

// ── TCP server for Arduino ──────────────────────────────────────────────────

const tcpServer = net.createServer((socket) => {
	console.log('Arduino connected:', socket.remoteAddress);

	socket.on('data', (data) => {
		const msg = data.toString().trim();

		if (msg === 'request_ticket') {
			currentTicket = createNextTicket();

			// Text-only payload — Arduino uses printBarcode() for CODE128, no bitmap needed
			const ticketInfoStr =
				`Ticket: ${currentTicket.number}\n` +
				`Counter: ${currentTicket.counter}\n` +
				`Barcode: ${currentTicket.barcode}\n` +
				`Time: ${currentTicket.time}\n` +
				`BitmapWidth: 0\n` +
				`BitmapHeight: 0\n` +
				`BitmapBase64: \n`;

			socket.write(ticketInfoStr + '\n');

			io.emit('current_ticket_updated', currentTicket);
			io.emit('arduino_request', currentTicket);
			emitTicketLifecycle();
			console.log('Sent ticket to Arduino:', currentTicket);
		}

		if (msg === 'printing_ticket') {
			console.log('Arduino confirmed: printing ticket', currentTicket?.number);
			if (currentTicket) {
				const printingTicket = { ...currentTicket, status: 'printing' };
				ticketsByNumber.set(currentTicket.number, printingTicket);
				currentTicket = printingTicket;
				emitTicketLifecycle();
			}
		}
	});

	socket.on('end', () => {
		console.log('Arduino disconnected');
	});

	socket.on('error', (err) => {
		console.error('Arduino socket error:', err.message);
	});
});

tcpServer.listen(TCP_PORT, () => {
	console.log(`TCP server listening on port ${TCP_PORT}`);
});