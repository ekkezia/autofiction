const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = __dirname;
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const MATCHFIT_DIR = path.join(ROOT_DIR, 'matchfit');

const CONTROL_PORT = Number(process.env.LAUNCHER_PORT || 4010);
const LIGHT_PORT = 4003;
const MATCHFIT_PORT = Number(process.env.MATCHFIT_PORT || 5173);

const children = [];

function prefixPipe(child, label) {
  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
}

function spawnProcess(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  child.__label = label;
  prefixPipe(child, label);
  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[${label}] exited (${reason})`);
  });
  children.push(child);
  return child;
}

function proxyToLight(req, res) {
  const cleanPath = req.url.replace(/^\/light/, '') || '/';
  const options = {
    hostname: '127.0.0.1',
    port: LIGHT_PORT,
    method: req.method,
    path: cleanPath,
    headers: req.headers,
  };

  const upstream = http.request(options, (upRes) => {
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    upRes.pipe(res);
  });

  upstream.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Light server not ready: ${err.message}`);
  });

  req.pipe(upstream);
}

function hostnameFromHostHeader(hostHeader) {
  const host = String(hostHeader || '').trim();
  if (!host) return 'localhost';
  if (host.startsWith('[')) {
    const closeBracket = host.indexOf(']');
    if (closeBracket > 1) return host.slice(1, closeBracket);
    return 'localhost';
  }
  const colonIdx = host.indexOf(':');
  return colonIdx === -1 ? host : host.slice(0, colonIdx);
}

function renderIndex(hostname) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Autofiction Launcher</title>
    <style>
      body { font-family: Menlo, monospace; margin: 32px; background: #f8f8f8; color: #111; }
      .card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; max-width: 760px; }
      h1 { margin-top: 0; font-size: 24px; }
      ul { line-height: 1.8; }
      a { color: #0f4ad8; text-decoration: none; }
      a:hover { text-decoration: underline; }
      code { background: #f2f2f2; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Autofiction Stack</h1>
      <p>Launcher is running and has started:</p>
      <ul>
        <li><code>node server/queue.js</code></li>
        <li><code>node server/light.js</code></li>
        <li><code>npm start</code> in <code>matchfit/</code></li>
      </ul>
      <p>Open apps:</p>
      <ul>
        <li><a href="/light">Light UI (/light)</a></li>
        <li><a href="http://${hostname}:${MATCHFIT_PORT}" target="_blank" rel="noreferrer">Matchfit UI (${hostname}:${MATCHFIT_PORT})</a></li>
      </ul>
      <p>Queue Socket.IO endpoint: <code>http://${hostname}:4002</code></p>
      <p>Health: <a href="/health">/health</a></p>
    </div>
  </body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (req.url === '/health') {
    const status = children.map((child) => ({
      name: child.__label,
      pid: child.pid,
      running: child.exitCode === null && child.signalCode === null,
      exitCode: child.exitCode,
      signal: child.signalCode,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, processes: status }, null, 2));
    return;
  }

  if (req.url === '/config.js') {
    req.url = '/light/config.js';
    proxyToLight(req, res);
    return;
  }

  if (req.url === '/light') {
    res.writeHead(302, { Location: '/light/' });
    res.end();
    return;
  }

  if (req.url === '/light' || req.url.startsWith('/light/')) {
    proxyToLight(req, res);
    return;
  }

  if (req.url === '/') {
    const hostname = hostnameFromHostHeader(req.headers.host);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderIndex(hostname));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

spawnProcess('queue', 'node', ['queue.js'], SERVER_DIR);
spawnProcess('light', 'node', ['light.js'], SERVER_DIR);
spawnProcess('matchfit', npmCommand(), ['start'], MATCHFIT_DIR);

server.listen(CONTROL_PORT, () => {
  console.log(`Launcher index → http://localhost:${CONTROL_PORT}`);
  console.log(`Light proxy    → http://localhost:${CONTROL_PORT}/light`);
});

function shutdown() {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
