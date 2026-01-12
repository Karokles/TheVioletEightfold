# Render Timeout Fix - Deployment Guide

**Date:** 2025-01-27  
**Issue:** Render build succeeds but deployment times out  
**Status:** ✅ Fixed

---

## Problem

Render build succeeds, but deployment times out with "Deploying... Timed Out" because:
1. Server not binding to `0.0.0.0` (Render requirement)
2. PORT not parsed as number
3. No startup logs to debug
4. Health endpoint too slow (git execSync blocking)

---

## Fixes Implemented

### 1. Server Binding to 0.0.0.0 ✅

**File:** `server/server.ts:867`

**Before:**
```typescript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**After:**
```typescript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] ✅ Server running on port ${PORT}`);
  // ... more logs
});
```

**Why:** Render requires binding to `0.0.0.0` to detect the service is listening.

---

### 2. PORT Parsing as Number ✅

**File:** `server/server.ts:54`

**Before:**
```typescript
const PORT = process.env.PORT || 3001;
```

**After:**
```typescript
const PORT = Number(process.env.PORT) || 3001;
```

**Why:** Ensures PORT is a number (Render sets it as string).

---

### 3. Fast Health Endpoint ✅

**File:** `server/server.ts:250-260`

**Before:**
- `/api/health` executed `git rev-parse` (blocking, slow)
- Could timeout on Render

**After:**
- `/api/health` returns immediately: `{status: 'ok', timestamp: '...'}`
- `/api/health/detailed` for diagnostics (includes git hash, uptime, etc.)

**Why:** Render health checks must respond quickly (< 1 second).

---

### 4. Startup Logs ✅

**File:** `server/server.ts:19-25, 54, 866-872`

**Added logs:**
- `[STARTUP] Initializing server...`
- `[STARTUP] Node version: ...`
- `[STARTUP] Environment: ...`
- `[STARTUP] Environment variables loaded`
- `[STARTUP] Server will listen on port: ...`
- `[STARTUP] Starting server...`
- `[STARTUP] ✅ Server running on port ...`

**Why:** Helps debug startup issues in Render logs.

---

## Changed Files

1. **`server/server.ts`**
   - Added startup logs (lines 19-25, 54, 866-872)
   - Fixed PORT parsing: `Number(process.env.PORT)` (line 54)
   - Fixed server binding: `app.listen(PORT, '0.0.0.0', ...)` (line 867)
   - Optimized health endpoint: fast `/api/health`, detailed `/api/health/detailed` (lines 250-280)

---

## Build & Start Commands

### Build
```bash
cd server
npm install
npm run build
```

**Output:** `server/dist/server.js`

### Start
```bash
cd server
npm start
```

**Or directly:**
```bash
cd server
node dist/server.js
```

---

## Verification

### Local Test

1. **Build:**
   ```bash
   cd server
   npm run build
   ```

2. **Start:**
   ```bash
   cd server
   npm start
   ```

3. **Expected logs:**
   ```
   [STARTUP] Initializing server...
   [STARTUP] Node version: v20.x.x
   [STARTUP] Environment: development
   [STARTUP] Environment variables loaded
   [STARTUP] Server will listen on port: 3001
   [STARTUP] Starting server...
   ================================================================================
   [STARTUP] ✅ Server running on port 3001
   [STARTUP] Environment: development
   [STARTUP] Health check: http://0.0.0.0:3001/api/health
   ================================================================================
   ```

4. **Test health endpoint:**
   ```bash
   curl http://localhost:3001/api/health
   ```

   **Expected:**
   ```json
   {"status":"ok","timestamp":"2025-01-27T..."}
   ```

---

## Render Deployment

### Environment Variables (Required)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `JWT_SECRET` | `<generate with: openssl rand -base64 32>` | Required (server crashes without it) |
| `OPENAI_API_KEY` | `sk-...` | Required |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` | Required |
| `PORT` | Auto-set by Render | Do NOT override |

### Build Command
```bash
cd server && npm install && npm run build
```

### Start Command
```bash
cd server && npm start
```

### Health Check Path
```
/api/health
```

---

## Render Logs (Expected)

When deployment succeeds, you should see:

```
[STARTUP] Initializing server...
[STARTUP] Node version: v20.x.x
[STARTUP] Environment: production
[STARTUP] Environment variables loaded
[STARTUP] Server will listen on port: <PORT>
[STARTUP] Starting server...
================================================================================
[STARTUP] ✅ Server running on port <PORT>
[STARTUP] Environment: production
[STARTUP] Health check: http://0.0.0.0:<PORT>/api/health
================================================================================
```

**Render will detect:** Service is listening on port and health check responds.

---

## Troubleshooting

### Still Timing Out?

1. **Check Render logs:**
   - Look for `[STARTUP]` logs
   - Verify server reaches `app.listen()`
   - Check for errors before `app.listen()`

2. **Verify health endpoint:**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```
   Should return `{"status":"ok",...}` in < 1 second

3. **Check PORT:**
   - Render sets `PORT` automatically
   - Don't override it in environment variables
   - Server logs show: `[STARTUP] Server will listen on port: <PORT>`

4. **Check binding:**
   - Server must bind to `0.0.0.0` (not `localhost` or `127.0.0.1`)
   - Code: `app.listen(PORT, '0.0.0.0', ...)`

### Health Check Failing?

1. **Fast endpoint:**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```
   Should return immediately

2. **Detailed endpoint:**
   ```bash
   curl https://your-backend.onrender.com/api/health/detailed
   ```
   Includes git hash, uptime, etc.

---

## Quick Checklist

Before deploying:
- [ ] Build command: `cd server && npm install && npm run build`
- [ ] Start command: `cd server && npm start`
- [ ] Health check path: `/api/health`
- [ ] Environment variables set (JWT_SECRET, OPENAI_API_KEY, etc.)

After deploying:
- [ ] Render logs show `[STARTUP] ✅ Server running on port ...`
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] No timeout errors
- [ ] Service shows as "Live" in Render dashboard

---

**Status:** ✅ Ready for Deployment

**Last Updated:** 2025-01-27

