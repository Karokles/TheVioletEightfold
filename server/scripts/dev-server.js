import { spawn } from 'node:child_process';
import http from 'node:http';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT || 3001);
const baseUrl = `http://localhost:${port}`;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const desiredAiProviderEnabled = String(process.env.AI_PROVIDER_ENABLED || 'false').trim().toLowerCase() === 'true';

const getProcessEnv = () => {
  if (process.platform !== 'win32') {
    return process.env;
  }

  const env = { ...process.env };
  if (env.Path && env.PATH) {
    env.Path = env.Path || env.PATH;
    delete env.PATH;
  }
  return env;
};

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn([command, ...args].join(' '), {
      shell: true,
      stdio: options.stdio || 'inherit',
      env: getProcessEnv(),
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });

const requestJson = (path) =>
  new Promise((resolve, reject) => {
    const req = http.get(`${baseUrl}${path}`, { timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch {
          reject(new Error(`Non-JSON response from ${path}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Timed out connecting to ${path}`));
    });
    req.on('error', reject);
  });

const getExistingServerStatus = async () => {
  const health = await requestJson('/api/health');
  if (health.statusCode !== 200 || health.body?.status !== 'ok') {
    throw new Error('Health endpoint did not return ok');
  }

  try {
    const runtime = await requestJson('/api/runtime/status');
    return runtime.body;
  } catch {
    return null;
  }
};

const main = async () => {
  await run(npmCommand, ['run', 'build']);

  try {
    const status = await getExistingServerStatus();
    console.log(`[DEV] Violet API is already running on ${baseUrl}.`);

    if (status?.services?.ai) {
      console.log(`[DEV] AI service: ${status.services.ai}`);
    }
    if (status?.featureFlags) {
      console.log(`[DEV] AI_PROVIDER_ENABLED=${status.featureFlags.aiProviderEnabled}`);

      if (status.featureFlags.aiProviderEnabled !== desiredAiProviderEnabled) {
        throw new Error(
          `Existing server env mismatch: running AI_PROVIDER_ENABLED=${status.featureFlags.aiProviderEnabled}, ` +
          `but server/.env wants AI_PROVIDER_ENABLED=${desiredAiProviderEnabled}. Stop the old server and run npm.cmd run dev again.`
        );
      }
    }

    console.log('[DEV] Reusing the existing server instead of starting a second one.');
    return;
  } catch (error) {
    if (error.message?.startsWith('Existing server env mismatch:')) {
      throw error;
    }
    // No compatible server responded on this port. Start a fresh one below.
  }

  const server = spawn('node dist/server.js', {
    shell: true,
    stdio: 'inherit',
    env: getProcessEnv(),
  });

  server.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
};

main().catch((error) => {
  console.error('[DEV] Failed to start Violet API.');
  console.error(error.message);
  console.error('');
  console.error(`If port ${port} is blocked by another process, run:`);
  console.error(`  netstat -ano | findstr :${port}`);
  console.error('Then stop the listed PID with:');
  console.error('  taskkill /PID <PID> /F');
  process.exit(1);
});
