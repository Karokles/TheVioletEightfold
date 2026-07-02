#!/usr/bin/env node

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const TEST_USERNAME = 'lion';
const TEST_SECRET = process.env.LOCAL_SECRET_LION || 'dev-lion-secret';

let authToken = '';

const request = async (method, path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
};

const test = async (name, fn) => {
  process.stdout.write(`- ${name}... `);
  await fn();
  console.log('ok');
};

const run = async () => {
  console.log(`No-budget smoke test: ${BASE_URL}`);

  await test('health endpoint responds', async () => {
    const data = await request('GET', '/api/health');
    if (data.status !== 'ok') {
      throw new Error(`Expected health status ok, got ${data.status}`);
    }
  });

  await test('runtime reports safe local mode', async () => {
    const data = await request('GET', '/api/runtime/status');
    if (data.environment !== 'local') {
      throw new Error(`Expected APP_ENV local, got ${data.environment}`);
    }
    if (data.featureFlags.aiProviderEnabled !== false) {
      throw new Error('AI_PROVIDER_ENABLED must be false for no-budget mode');
    }
    if (data.featureFlags.databaseEnabled !== false) {
      throw new Error('DATABASE_ENABLED must be false for no-budget mode');
    }
    if (data.featureFlags.paymentEnabled !== false) {
      throw new Error('PAYMENT_ENABLED must be false for no-budget mode');
    }
  });

  await test('local test-user login works', async () => {
    const data = await request('POST', '/api/login', {
      body: { username: TEST_USERNAME, secret: TEST_SECRET },
    });
    if (!data.token || !data.userId) {
      throw new Error('Login response missing token or userId');
    }
    authToken = data.token;
  });

  const authHeaders = () => ({ Authorization: `Bearer ${authToken}` });

  await test('council endpoint uses mock provider', async () => {
    const data = await request('POST', '/api/council', {
      headers: authHeaders(),
      body: {
        messages: [{ id: '1', role: 'user', content: 'No-budget smoke test', timestamp: Date.now() }],
        userProfile: { language: 'EN', lore: 'Smoke test lore' },
      },
    });
    if (data.provider !== 'mock') {
      throw new Error(`Expected provider mock, got ${data.provider || 'missing'}`);
    }
    if (!data.reply) {
      throw new Error('Mock council response missing reply');
    }
  });

  await test('meaning endpoint uses mock provider', async () => {
    const data = await request('POST', '/api/meaning/analyze', {
      headers: authHeaders(),
      body: {
        mode: 'council',
        messages: [{ role: 'user', content: 'Smoke test meaning input' }],
      },
    });
    if (data.provider !== 'mock') {
      throw new Error(`Expected provider mock, got ${data.provider || 'missing'}`);
    }
    if (!Array.isArray(data.questLogEntries) || !Array.isArray(data.soulTimelineEvents) || !Array.isArray(data.breakthroughs)) {
      throw new Error('Meaning mock response missing expected arrays');
    }
  });

  await test('payment endpoint stays mocked', async () => {
    const data = await request('GET', '/api/payment/status', {
      headers: authHeaders(),
    });
    if (data.provider !== 'mock') {
      throw new Error(`Expected payment provider mock, got ${data.provider || 'missing'}`);
    }
    if (data.entitlement !== 'free') {
      throw new Error(`Expected free entitlement, got ${data.entitlement}`);
    }
  });

  console.log('No-budget smoke test passed.');
};

if (typeof fetch === 'undefined') {
  console.error('fetch is not available. Use Node.js 18+.');
  process.exit(1);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
