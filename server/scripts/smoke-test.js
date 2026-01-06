#!/usr/bin/env node

/**
 * Smoke Test Script for Authentication and Core Flows
 * 
 * Usage:
 *   node server/scripts/smoke-test.js [BASE_URL]
 * 
 * Example:
 *   node server/scripts/smoke-test.js http://localhost:3001
 *   node server/scripts/smoke-test.js https://thevioleteightfold-4224.onrender.com
 */

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const TEST_USERNAME = 'lion';
const TEST_SECRET = 'TuerOhneWiederkehr2025';

let authToken = null;
let userId = null;

// Test utilities
const test = async (name, fn) => {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Body: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
};

const request = async (method, path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    method,
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    error.response = { status: response.status, data };
    throw error;
  }

  return data;
};

// Test cases
const tests = [
  {
    name: 'Health Check',
    fn: async () => {
      const data = await request('GET', '/api/health');
      if (data.status !== 'ok') {
        throw new Error(`Expected status: 'ok', got: '${data.status}'`);
      }
      console.log(`   Response: ${JSON.stringify(data)}`);
    },
  },
  {
    name: 'Login',
    fn: async () => {
      const data = await request('POST', '/api/login', {
        body: {
          username: TEST_USERNAME,
          secret: TEST_SECRET,
        },
      });
      if (!data.userId || !data.token) {
        throw new Error('Missing userId or token in response');
      }
      authToken = data.token;
      userId = data.userId;
      // Check if token is JWT (has 3 dot-separated segments)
      const isJWT = authToken.split('.').length === 3;
      console.log(`   User ID: ${userId}`);
      console.log(`   Token format: ${isJWT ? 'JWT' : 'Legacy'}`);
      console.log(`   Token preview: ${authToken.substring(0, 20)}...`);
    },
  },
  {
    name: 'Auth Diagnose Endpoint (Public)',
    fn: async () => {
      const data = await request('GET', '/auth/diagnose', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (data.verifyResult !== 'ok') {
        throw new Error(`Expected verifyResult: 'ok', got: '${data.verifyResult}'`);
      }
      if (data.authHeaderFormat !== 'bearer') {
        throw new Error(`Expected authHeaderFormat: 'bearer', got: '${data.authHeaderFormat}'`);
      }
      if (!data.tokenLooksLikeJwt) {
        throw new Error(`Expected tokenLooksLikeJwt: true, got: ${data.tokenLooksLikeJwt}`);
      }
      console.log(`   Format: ${data.authHeaderFormat}`);
      console.log(`   Is JWT: ${data.tokenLooksLikeJwt}`);
      console.log(`   Verify: ${data.verifyResult}`);
    },
  },
  {
    name: 'Auth Debug Endpoint (Protected)',
    fn: async () => {
      const data = await request('GET', '/api/auth/debug', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (data.verificationResult !== 'ok') {
        throw new Error(`Expected verificationResult: 'ok', got: '${data.verificationResult}'`);
      }
      if (data.userInfo?.userId !== userId) {
        throw new Error(`User ID mismatch: expected ${userId}, got ${data.userInfo?.userId}`);
      }
      console.log(`   Verification: ${data.verificationResult}`);
      console.log(`   User: ${data.userInfo?.username}`);
    },
  },
  {
    name: 'Single Chat (Direct Archetype)',
    fn: async () => {
      const data = await request('POST', '/api/council', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: {
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'Hello, this is a test message.',
              timestamp: Date.now(),
            },
          ],
          userProfile: {
            activeArchetype: 'SOVEREIGN',
            language: 'EN',
            lore: 'Test user lore',
          },
        },
      });
      if (!data.reply || typeof data.reply !== 'string') {
        throw new Error('Missing or invalid reply in response');
      }
      console.log(`   Reply length: ${data.reply.length} chars`);
      console.log(`   Reply preview: ${data.reply.substring(0, 100)}...`);
    },
  },
  {
    name: 'Council Session (Multi-Archetype)',
    fn: async () => {
      const data = await request('POST', '/api/council', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: {
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'I need advice on making an important decision.',
              timestamp: Date.now(),
            },
          ],
          userProfile: {
            language: 'EN',
            lore: 'Test user lore',
          },
        },
      });
      if (!data.reply || typeof data.reply !== 'string') {
        throw new Error('Missing or invalid reply in response');
      }
      // Check for council format (should have [[SPEAKER:]] tags)
      const hasSpeakerTags = data.reply.includes('[[SPEAKER:');
      console.log(`   Reply length: ${data.reply.length} chars`);
      console.log(`   Has speaker tags: ${hasSpeakerTags}`);
      console.log(`   Reply preview: ${data.reply.substring(0, 150)}...`);
    },
  },
  {
    name: 'Invalid Token Handling',
    fn: async () => {
      try {
        await request('POST', '/api/council', {
          headers: {
            Authorization: 'Bearer invalid-token-12345',
          },
          body: {
            messages: [{ id: '1', role: 'user', content: 'test', timestamp: Date.now() }],
            userProfile: { language: 'EN' },
          },
        });
        throw new Error('Expected 401 error for invalid token');
      } catch (error) {
        if (error.response?.status !== 401) {
          throw new Error(`Expected 401, got ${error.response?.status}`);
        }
        // Check for structured error response
        const errorData = error.response?.data || {};
        if (errorData.reason) {
          console.log(`   Correctly rejected with reason: ${errorData.reason}`);
        } else {
          console.log(`   Correctly rejected invalid token with 401`);
        }
      }
    },
  },
];

// Run all tests
const runTests = async () => {
  console.log(`\n🚀 Starting smoke tests against: ${BASE_URL}`);
  console.log(`   Test user: ${TEST_USERNAME}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  const results = [];
  for (const testCase of tests) {
    const passed = await test(testCase.name, testCase.fn);
    results.push({ name: testCase.name, passed });
  }

  // Summary
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Passed: ${results.filter(r => r.passed).length}`);
  console.log(`   Failed: ${results.filter(r => !r.passed).length}`);

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log(`\n✅ All tests passed!`);
    process.exit(0);
  } else {
    console.log(`\n❌ Some tests failed.`);
    process.exit(1);
  }
};

// Handle fetch polyfill for Node < 18
if (typeof fetch === 'undefined') {
  console.error('Error: fetch is not available. Please use Node.js 18+ or install node-fetch.');
  process.exit(1);
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

