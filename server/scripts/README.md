# Smoke Test Script

## Overview

The smoke test script verifies that authentication and core API flows work correctly.

## Prerequisites

- Node.js 18+ (for native `fetch` support)
- Backend server running (local or production)

## Usage

### Test Local Server
```bash
cd server
npm run test:smoke
# Or with custom URL:
node scripts/smoke-test.js http://localhost:3001
```

### Test Production Server
```bash
cd server
npm run test:smoke:prod
# Or with custom URL:
node scripts/smoke-test.js https://thevioleteightfold-4224.onrender.com
```

## What It Tests

1. **Health Check** - Verifies `/api/health` endpoint responds
2. **Login** - Tests authentication and token issuance
3. **Auth Debug** - Verifies `/api/auth/debug` endpoint and token validation
4. **Single Chat** - Tests direct archetype conversation (Einzelgespräch)
5. **Council Session** - Tests multi-archetype council dialogue
6. **Invalid Token** - Verifies 401 error handling for invalid tokens

## Expected Output

```
🚀 Starting smoke tests against: http://localhost:3001
   Test user: lion
   Time: 2025-01-27T...

🧪 Testing: Health Check
   Response: {"status":"ok","uptime":123,"timestamp":"..."}
✅ PASS: Health Check

🧪 Testing: Login
   User ID: lion
   Token: abc123def4567890...
✅ PASS: Login

...

📊 Test Summary:
   Total: 6
   Passed: 6
   Failed: 0

✅ All tests passed!
```

## Troubleshooting

- **"fetch is not available"**: Upgrade to Node.js 18+ or install `node-fetch`
- **401 errors**: Check that test user credentials are correct
- **Connection errors**: Verify server is running and URL is correct






