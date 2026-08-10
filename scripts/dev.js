import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const rootDir = process.cwd();
const serverEntry = path.join(rootDir, 'server', 'index.js');
const viteEntry = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:5000';

const sharedOptions = {
  stdio: 'inherit',
  env: process.env,
  shell: false,
};

const clientProcess = spawn(process.execPath, [viteEntry], sharedOptions);
let serverProcess = null;

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of [serverProcess, clientProcess]) {
    if (child && !child.killed) {
      child.kill();
    }
  }

  process.exit(code);
}

clientProcess.on('exit', (code) => {
  if (!shuttingDown) shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function probeBackendHealth(baseUrl) {
  return new Promise((resolve) => {
    const request = http.get(`${baseUrl}/api/health`, (response) => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1200, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const backendRunning = await probeBackendHealth(apiBaseUrl);

  if (backendRunning) {
    console.log(`ℹ️ Reusing backend already running at ${apiBaseUrl}`);
  } else {
    serverProcess = spawn(process.execPath, [serverEntry], sharedOptions);
    serverProcess.on('exit', (code) => {
      if (!shuttingDown) shutdown(code ?? 0);
    });
  }
}

main().catch((error) => {
  console.error('Failed to start dev environment:', error);
  shutdown(1);
});