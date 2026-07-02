# Deployment Runbook - The Violet Eightfold

**Last Updated:** 2025-01-27  
**Repository:** `the-violet-eightfoldCoreUsabilityCheck`  
**Frontend:** Vercel  
**Backend:** Render

---

## ðŸ“‹ Pre-Deployment Checklist

### Backend (Render)
- [ ] `JWT_SECRET` generiert (min. 32 Zeichen)
- [ ] `OPENAI_API_KEY` vorhanden
- [ ] `ALLOWED_ORIGINS` Liste vorbereitet (inkl. Vercel-Domain)
- [ ] `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` (optional)

### Frontend (Vercel)
- [ ] `VITE_API_BASE_URL` = Render Backend URL
- [ ] GitHub-Repo mit Vercel verbunden

---

## ðŸš€ Deployment Steps

### Phase 1: Backend Deployment (Render)

#### 1.1 Environment Variables setzen

Gehe zu **Render Dashboard â†’ Your Service â†’ Environment** und setze:

```bash
# REQUIRED
NODE_ENV=production
JWT_SECRET=<generiere mit: openssl rand -base64 32>
OPENAI_API_KEY=sk-<dein-openai-key>
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000

# OPTIONAL (wenn Supabase verwendet wird)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
```

**Wichtig:**
- `ALLOWED_ORIGINS` muss die exakte Vercel-Domain enthalten (ohne trailing slash)
- `JWT_SECRET` muss mindestens 32 Zeichen lang sein
- `PORT` wird automatisch von Render gesetzt

#### 1.2 Build & Start Commands

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

#### 1.3 Deployment auslÃ¶sen

- **Option A:** Auto-Deploy (wenn GitHub-Webhook konfiguriert)
  - Push zu `main` Branch â†’ Render deployt automatisch

- **Option B:** Manual Deploy
  - Render Dashboard â†’ Manual Deploy â†’ Select Branch/Commit

#### 1.4 Verification

```bash
# Health Check
curl https://your-backend.onrender.com/api/health

# Expected Response:
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2025-01-27T...",
  "environment": "production",
  "commitHash": "abc123",
  "jwtSecretSet": true,
  "supabaseStatus": "configured"
}

# Auth Health Check
curl https://your-backend.onrender.com/api/auth/health

# Expected Response:
{
  "ok": true,
  "hasJwtSecret": true,
  "hasSupabase": true,
  "build": "abc123"
}
```

**âœ… Backend ist bereit wenn:**
- Health endpoint returns `status: "ok"`
- Auth health returns `hasJwtSecret: true`
- Keine Fehler in Render Logs

---

### Phase 2: Frontend Deployment (Vercel)

#### 2.1 Environment Variables setzen

Gehe zu **Vercel Dashboard â†’ Your Project â†’ Settings â†’ Environment Variables**:

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com
```

**Wichtig:**
- Variable muss `VITE_API_BASE_URL` heiÃŸen (nicht `VITE_API_URL`)
- URL muss exakt der Render Backend URL entsprechen
- FÃ¼r alle Environments setzen (Production, Preview, Development)

#### 2.2 Build Configuration

Vercel erkennt automatisch Vite-Projekte. Die `vercel.json` ist bereits konfiguriert:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Install Command:** `npm install` (automatisch)

#### 2.3 Deployment auslÃ¶sen

- **Option A:** Auto-Deploy (wenn GitHub-Webhook konfiguriert)
  - Push zu `main` Branch â†’ Vercel deployt automatisch

- **Option B:** Manual Deploy
  - Vercel Dashboard â†’ Deployments â†’ Deploy

#### 2.4 Verification

1. **Frontend Ã¶ffnen:** `https://your-app.vercel.app`
2. **Login testen:**
   - Username: `lion` / Secret: `<local-test-secret>`
   - Oder andere Test-User aus `server/server.ts`
3. **Single Chat testen:** Archetype auswÃ¤hlen â†’ Nachricht senden
4. **Council Session testen:** Topic eingeben â†’ Session starten

**âœ… Frontend ist bereit wenn:**
- Login funktioniert (JWT Token wird gespeichert)
- Single Chat funktioniert
- Council Session funktioniert
- Keine CORS-Fehler in Browser Console
- Keine "VITE_API_BASE_URL is not set" Fehler

---

## ðŸ” Troubleshooting

### Problem: 401 "Unauthorized" auf /api/council

**Ursachen & Fixes:**

1. **JWT_SECRET fehlt oder falsch**
   ```bash
   # Check:
   curl https://your-backend.onrender.com/api/auth/health
   # Sollte zeigen: "hasJwtSecret": true
   
   # Fix: JWT_SECRET in Render Environment Variables setzen
   # Generate: openssl rand -base64 32
   ```

2. **Token abgelaufen**
   - User muss sich neu einloggen
   - Frontend sollte automatisch logout bei 401

3. **Token-Format falsch**
   - Token muss JWT sein (3 Segmente, durch `.` getrennt)
   - Frontend sendet: `Authorization: Bearer <token>`

4. **User nicht in Backend vorhanden**
   - Check: `server/server.ts` â†’ `users[]` Array
   - User muss existieren mit korrektem `secretHash`

---

### Problem: CORS Errors

**Symptom:**
```
Access to fetch at 'https://backend.onrender.com/api/council' from origin 'https://frontend.vercel.app' has been blocked by CORS policy
```

**Fix:**
1. **Check ALLOWED_ORIGINS in Render:**
   ```bash
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
   ```
   - Muss exakte Vercel-Domain enthalten (ohne trailing slash)
   - Case-sensitive
   - Keine Leerzeichen nach Kommas

2. **Check Render Logs:**
   - Suche nach `[CORS] Request blocked`
   - Log zeigt welche Origin blockiert wurde

3. **Test:**
   ```bash
   # TemporÃ¤r fÃ¼r Debugging (NICHT in Production):
   ALLOWED_ORIGINS=*
   ```

---

### Problem: "VITE_API_BASE_URL is not set"

**Symptom:**
- Frontend Build schlÃ¤gt fehl mit Error
- Oder Frontend lÃ¤dt, aber API-Calls gehen an localhost:3001

**Fix:**
1. **Check Vercel Environment Variables:**
   - Variable heiÃŸt `VITE_API_BASE_URL` (nicht `VITE_API_URL`)
   - Muss fÃ¼r alle Environments gesetzt sein (Production, Preview, Development)

2. **Redeploy nach Variable setzen:**
   - Vercel â†’ Deployments â†’ Redeploy

3. **Verify:**
   ```bash
   # In Browser Console:
   console.log(import.meta.env.VITE_API_BASE_URL)
   # Sollte die Render URL zeigen
   ```

---

### Problem: OpenAI API Errors

**Symptom:**
- 500 Error auf /api/council
- Error Message: "OpenAI API key not configured" oder "OpenAI API authentication failed"

**Fix:**
1. **Check OPENAI_API_KEY in Render:**
   - Muss gesetzt sein
   - Format: `sk-...`
   - Keine Leerzeichen

2. **Check Render Logs:**
   - Suche nach `[COUNCIL] OpenAI API error`
   - Log zeigt Status Code und Error Details

3. **Common Errors:**
   - **401:** API Key invalid â†’ Neuen Key generieren
   - **429:** Rate Limit â†’ Warten oder Plan upgraden
   - **500/502/503:** OpenAI Service down â†’ Warten

---

### Problem: Build Failures

#### Backend Build (Render)

**Error:** `tsc` compilation errors

**Fix:**
```bash
# Lokal testen:
cd server
npm install
npm run build

# Fix TypeScript errors
# Dann commit & push
```

#### Frontend Build (Vercel)

**Error:** `VITE_API_BASE_URL is not set`

**Fix:**
- Setze `VITE_API_BASE_URL` in Vercel Environment Variables
- Redeploy

**Error:** Module not found / Import errors

**Fix:**
```bash
# Lokal testen:
npm install
npm run build

# Fix import errors
# Dann commit & push
```

---

## ðŸ“Š Health Check Endpoints

### Backend Health Checks

```bash
# General Health
GET https://your-backend.onrender.com/api/health

# Auth Health
GET https://your-backend.onrender.com/api/auth/health

# Auth Diagnostics (mit Token)
GET https://your-backend.onrender.com/api/auth/debug
Headers: Authorization: Bearer <token>

# User Info (mit Token)
GET https://your-backend.onrender.com/api/me
Headers: Authorization: Bearer <token>
```

---

## ðŸ”„ Rollback Plan

### Backend (Render)

1. **Revert to Previous Version:**
   - Render Dashboard â†’ Deployments â†’ Select Previous Deployment â†’ Deploy

2. **Or Revert Git:**
   ```bash
   git revert HEAD
   git push
   ```

### Frontend (Vercel)

1. **Revert to Previous Version:**
   - Vercel Dashboard â†’ Deployments â†’ Select Previous Deployment â†’ Promote to Production

2. **Or Revert Git:**
   ```bash
   git revert HEAD
   git push
   ```

**âš ï¸ Wichtig:** Nach Rollback mÃ¼ssen User sich neu einloggen (JWT Tokens werden ungÃ¼ltig).

---

## ðŸ“ Environment Variables Reference

### Backend (Render)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | âœ… | Environment | `production` |
| `JWT_SECRET` | âœ… | JWT signing secret (min 32 chars) | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | âœ… | OpenAI API key | `sk-...` |
| `ALLOWED_ORIGINS` | âœ… | Comma-separated frontend URLs | `https://app.vercel.app,http://localhost:3000` |
| `PORT` | âŒ | Server port (auto-set by Render) | - |
| `SUPABASE_URL` | âš ï¸ | Supabase project URL (optional) | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | âš ï¸ | Supabase service role key (optional) | `eyJ...` |

### Frontend (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | âœ… | Backend API URL | `https://backend.onrender.com` |

---

## âœ… Post-Deployment Checklist

### Backend
- [ ] Health endpoint returns `status: "ok"`
- [ ] Auth health returns `hasJwtSecret: true`
- [ ] Login endpoint returns JWT token
- [ ] Council endpoint accepts JWT token
- [ ] No errors in Render logs

### Frontend
- [ ] Frontend loads without errors
- [ ] Login works (JWT token stored)
- [ ] Single Chat works
- [ ] Council Session works
- [ ] No CORS errors in browser console
- [ ] No "VITE_API_BASE_URL is not set" errors

### Integration
- [ ] User can login â†’ get JWT â†’ use Single Chat â†’ use Council Session
- [ ] All API calls use correct backend URL
- [ ] All API calls include `Authorization: Bearer <token>` header
- [ ] 401 errors trigger auto-logout

---

## ðŸ†˜ Support

Bei Problemen:
1. Check Render Logs (Backend)
2. Check Vercel Logs (Frontend)
3. Check Browser Console (Frontend)
4. Test Health Endpoints
5. Verify Environment Variables

**Last Updated:** 2025-01-27



