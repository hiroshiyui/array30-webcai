import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = 3000;

const WATCH_DIRS = [
  join(__dirname, 'src'),
];
const WATCH_FILES = [
  join(__dirname, 'index.html'),
  join(__dirname, 'vite.config.ts'),
  join(__dirname, 'tsconfig.json'),
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.cin': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// --- SSE clients for live reload ---
const sseClients = new Set();

// --- Static server with SSE endpoint ---
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', `http://localhost:${PORT}`).pathname;

  // SSE endpoint for live reload
  if (pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  const filePath = join(DIST, pathname === '/' ? '/index.html' : pathname);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }

  try {
    let data = await readFile(filePath);
    const ext = extname(filePath);
    // Inject reload script into HTML
    if (ext === '.html') {
      const script = `<script>new EventSource('/__reload').onmessage=e=>{if(e.data==='reload')location.reload()}</script>`;
      data = Buffer.from(data.toString().replace('</body>', script + '</body>'));
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

function notifyReload() {
  for (const client of sseClients) {
    client.write('data: reload\n\n');
  }
}

// --- Build ---
let building = false;
let pendingBuild = false;

function runBuild() {
  if (building) {
    pendingBuild = true;
    return;
  }
  building = true;
  console.log('\x1b[36m[dev-build]\x1b[0m Building...');
  const proc = spawn('npx', ['tsc', '--noEmit', '&&', 'npx', 'vite', 'build'], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit',
  });
  proc.on('close', (code) => {
    building = false;
    if (code === 0) {
      console.log('\x1b[32m[dev-build]\x1b[0m Build succeeded, reloading browsers.');
      notifyReload();
    } else {
      console.log('\x1b[31m[dev-build]\x1b[0m Build failed.');
    }
    if (pendingBuild) {
      pendingBuild = false;
      runBuild();
    }
  });
}

// --- Watch ---
let debounceTimer = null;

function onFileChange(eventType, filename) {
  // Ignore tsc-emitted .js files in src/
  if (filename && /\.js$/.test(filename)) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`\x1b[36m[dev-build]\x1b[0m Change detected: ${filename ?? 'unknown'}`);
    runBuild();
  }, 200);
}

for (const dir of WATCH_DIRS) {
  try {
    watch(dir, { recursive: true }, onFileChange);
  } catch { /* dir may not exist yet */ }
}
for (const file of WATCH_FILES) {
  try {
    watch(file, onFileChange);
  } catch { /* file may not exist */ }
}

// --- Start ---
runBuild();
server.listen(PORT, () => {
  console.log(`\x1b[36m[dev-build]\x1b[0m Serving at http://localhost:${PORT} (with live reload)`);
});
