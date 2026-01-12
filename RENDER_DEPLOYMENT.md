# Render Backend Deployment - Step-by-Step Guide

**Last Updated:** 2025-01-27  
**Critical:** Server will crash on start if `JWT_SECRET` is not set in production.

---

## ⚠️ CRITICAL: JWT_SECRET Required

**The server WILL crash on start if `JWT_SECRET` is missing in production.**

Error message:
```
ERROR: JWT_SECRET environment variable is required in production
```

**Fix:** Set `JWT_SECRET` in Render Environment Variables BEFORE deploying.

---

## Step 1: Generate JWT_SECRET

**Before deploying, generate a secure JWT_SECRET:**

```bash
openssl rand -base64 32
```

**Example output:**
```
aB3xY9mK2pL8qR5tW7vN4jH6fG1dS0cE2bA9zX8yU6iO3pL5mN7k
```

**Copy this value** - you'll need it in Step 3.

---

## Step 2: Render Service Setup

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **Create New Web Service** (or select existing service)
3. **Connect Repository:**
   - Select: `Karokles/TheVioletEightfold` (or your repo)
   - Branch: `main`

---

## Step 3: Environment Variables (CRITICAL - DO THIS FIRST)

**Go to:** Render Dashboard → Your Service → Environment

**Add these variables (in this order):**

### Required Variables (MUST SET):

| Variable | Value | How to Get |
|----------|-------|------------|
| `NODE_ENV` | `production` | Literal value |
| `JWT_SECRET` | `<paste from Step 1>` | Generated with `openssl rand -base64 32` |
| `OPENAI_API_KEY` | `sk-...` | From https://platform.openai.com/api-keys |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` | Your Vercel frontend URL + localhost |

### Optional Variables (Can skip if not using Supabase):

| Variable | Value | How to Get |
|----------|-------|------------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | From Supabase Dashboard → Settings → API |

**⚠️ IMPORTANT:**
- Set `JWT_SECRET` FIRST before deploying
- Do NOT set `PORT` - Render sets this automatically
- `ALLOWED_ORIGINS` must include your exact Vercel domain (no trailing slash)

---

## Step 4: Build & Start Commands

**In Render Service Settings:**

**Build Command:**
```bash
cd server && npm install && npm run build
```

**Start Command:**
```bash
cd server && npm start
```

**Health Check Path:**
```
/api/health
```

**Node Version:**
- Render auto-detects from `package.json` or `.nvmrc`
- Recommended: Node.js 18+ (check `server/package.json` for `engines` field)

---

## Step 5: Deploy

1. **Save all settings** (Environment Variables, Build/Start Commands)
2. **Click "Save Changes"**
3. **Render will auto-deploy** (or click "Manual Deploy")

**Watch the logs** - you should see:
```
Server running on port <PORT>
Environment: production
```

**If you see:**
```
ERROR: JWT_SECRET environment variable is required in production
```
→ Go back to Step 3 and set `JWT_SECRET`

---

## Step 6: Verify Deployment

### 6.1 Health Check

```bash
curl https://your-backend.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2025-01-27T...",
  "environment": "production",
  "commitHash": "abc123",
  "jwtSecretSet": true,
  "supabaseStatus": "configured"
}
```

**✅ Success if:**
- `status: "ok"`
- `jwtSecretSet: true`
- `environment: "production"`

### 6.2 Auth Health Check

```bash
curl https://your-backend.onrender.com/api/auth/health
```

**Expected Response:**
```json
{
  "ok": true,
  "hasJwtSecret": true,
  "hasSupabase": true,
  "build": "abc123"
}
```

**✅ Success if:**
- `ok: true`
- `hasJwtSecret: true`

### 6.3 Test Login

```bash
curl -X POST https://your-backend.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lion","secret":"TuerOhneWiederkehr2025"}'
```

**Expected Response:**
```json
{
  "userId": "lion",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**✅ Success if:**
- Returns `userId` and `token`
- Token is JWT format (3 segments, separated by dots)

### 6.4 Test Council Endpoint (with auth)

```bash
# First, get token from login (see 6.3)
TOKEN="<paste token from 6.3>"

curl -X POST https://your-backend.onrender.com/api/council \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messages": [{"id":"1","role":"user","content":"Hello","timestamp":1234567890}],
    "userProfile": {"language":"EN"}
  }'
```

**Expected Response:**
```json
{
  "reply": "Response from OpenAI..."
}
```

**✅ Success if:**
- Returns `reply` with AI-generated content
- No 401 Unauthorized errors

---

## Troubleshooting

### Server Crashes on Start: "JWT_SECRET required"

**Problem:** `JWT_SECRET` not set in Render Environment Variables.

**Fix:**
1. Go to Render Dashboard → Your Service → Environment
2. Add `JWT_SECRET` variable
3. Generate value: `openssl rand -base64 32`
4. Paste value
5. Save and redeploy

---

### 401 Unauthorized on /api/council

**Problem:** JWT token invalid or expired.

**Fix:**
1. Check `JWT_SECRET` is set in Render
2. Verify token format (should be JWT with 3 segments)
3. Try logging in again to get new token
4. Check Render logs for `[AUTH]` messages

---

### CORS Errors

**Problem:** Frontend origin not in `ALLOWED_ORIGINS`.

**Fix:**
1. Check `ALLOWED_ORIGINS` in Render Environment Variables
2. Must include exact Vercel domain (e.g., `https://your-app.vercel.app`)
3. No trailing slashes
4. Case-sensitive
5. Comma-separated if multiple origins

---

### OpenAI API Errors

**Problem:** `OPENAI_API_KEY` not set or invalid.

**Fix:**
1. Check `OPENAI_API_KEY` in Render Environment Variables
2. Verify key is valid at https://platform.openai.com/api-keys
3. Check Render logs for `[COUNCIL] OpenAI API error` messages

---

## Environment Variables Reference

### Required (Server crashes without these):

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ | Must be `production` | `production` |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars) | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key | `sk-...` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated frontend URLs | `https://app.vercel.app,http://localhost:3000` |

### Optional (Server works without these):

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | ❌ | Auto-set by Render | - |
| `SUPABASE_URL` | ⚠️ | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Supabase service role key | `eyJ...` |

---

## Quick Checklist

Before deploying:
- [ ] Generated `JWT_SECRET` with `openssl rand -base64 32`
- [ ] Set `JWT_SECRET` in Render Environment Variables
- [ ] Set `NODE_ENV=production` in Render
- [ ] Set `OPENAI_API_KEY` in Render
- [ ] Set `ALLOWED_ORIGINS` with Vercel domain
- [ ] Build Command: `cd server && npm install && npm run build`
- [ ] Start Command: `cd server && npm start`
- [ ] Health Check Path: `/api/health`

After deploying:
- [ ] Health endpoint returns `status: "ok"`
- [ ] Auth health returns `hasJwtSecret: true`
- [ ] Login endpoint returns JWT token
- [ ] Council endpoint accepts JWT token
- [ ] No errors in Render logs

---

**Last Updated:** 2025-01-27

