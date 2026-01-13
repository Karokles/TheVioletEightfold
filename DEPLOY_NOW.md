# Deploy Now - Step-by-Step Guide

**Date:** 2025-01-27  
**Status:** Ready for Deployment

---

## 🚀 Quick Deploy Checklist

### Prerequisites
- [ ] GitHub Repo: `Karokles/TheVioletEightfold` (oder dein Repo)
- [ ] Render Account (für Backend)
- [ ] Vercel Account (für Frontend)
- [ ] OpenAI API Key
- [ ] Terminal/Command Line Zugriff

---

## 📋 Step 1: Prepare Environment Variables

### Generate JWT_SECRET
```bash
openssl rand -base64 32
```
**Kopiere den Output** - du brauchst ihn für Render.

### Get OpenAI API Key
- Gehe zu: https://platform.openai.com/api-keys
- Erstelle einen neuen API Key
- **Kopiere den Key** (beginnt mit `sk-`)

---

## 🔧 Step 2: Deploy Backend (Render)

### 2.1 Create Render Service

1. **Gehe zu:** https://dashboard.render.com
2. **Klicke:** "New +" → "Web Service"
3. **Connect Repository:**
   - Wähle: `Karokles/TheVioletEightfold` (oder dein Repo)
   - Branch: `main`

### 2.2 Configure Service

**Name:** `violet-eightfold-backend` (oder dein Name)

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

### 2.3 Set Environment Variables

**Gehe zu:** Render Dashboard → Your Service → Environment

**Add these variables:**

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Literal value |
| `JWT_SECRET` | `<paste from openssl rand -base64 32>` | **REQUIRED** |
| `OPENAI_API_KEY` | `sk-<your-key>` | **REQUIRED** |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` | **REQUIRED** - Ersetze `your-app.vercel.app` mit deiner Vercel-Domain |

**Optional (wenn Supabase verwendet wird):**
| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |

### 2.4 Deploy

1. **Klicke:** "Save Changes"
2. **Render deployt automatisch** (oder klicke "Manual Deploy")
3. **Warte** bis Deployment fertig ist (2-5 Minuten)

### 2.5 Verify Backend

**Check Render Logs:**
Du solltest sehen:
```
[STARTUP] Initializing server...
[STARTUP] ✅ Server running on port <PORT>
[STARTUP] Health check: http://0.0.0.0:<PORT>/api/health
```

**Test Health Endpoint:**
```bash
curl https://your-backend.onrender.com/api/health
```

**Expected:**
```json
{"status":"ok","timestamp":"..."}
```

**Notiz:** Kopiere die Backend URL (z.B. `https://violet-eightfold-xxxx.onrender.com`) - du brauchst sie für Vercel.

---

## 🎨 Step 3: Deploy Frontend (Vercel)

### 3.1 Create Vercel Project

1. **Gehe zu:** https://vercel.com/dashboard
2. **Klicke:** "Add New..." → "Project"
3. **Import Repository:**
   - Wähle: `Karokles/TheVioletEightfold` (oder dein Repo)
   - Framework Preset: **Vite** (wird automatisch erkannt)

### 3.2 Configure Project

**Root Directory:** `.` (root)

**Build Settings:**
- Build Command: `npm run build` (automatisch)
- Output Directory: `dist` (automatisch)
- Install Command: `npm install` (automatisch)

### 3.3 Set Environment Variables

**Gehe zu:** Project Settings → Environment Variables

**Add:**
| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` | Production, Preview, Development |

**Wichtig:** Ersetze `your-backend.onrender.com` mit deiner tatsächlichen Render Backend URL.

### 3.4 Deploy

1. **Klicke:** "Deploy"
2. **Warte** bis Deployment fertig ist (1-2 Minuten)
3. **Notiere** die Frontend URL (z.B. `https://the-violet-eightfold.vercel.app`)

### 3.5 Update Render ALLOWED_ORIGINS

**Wichtig:** Nach dem Vercel-Deploy musst du Render aktualisieren!

1. **Gehe zurück zu Render:** Dashboard → Your Service → Environment
2. **Update `ALLOWED_ORIGINS`:**
   ```
   https://your-actual-vercel-domain.vercel.app,http://localhost:3000
   ```
3. **Save** und **Redeploy** (oder warte auf Auto-Deploy)

---

## ✅ Step 4: Verify Deployment

### 4.1 Test Frontend

1. **Öffne:** Deine Vercel URL (z.B. `https://the-violet-eightfold.vercel.app`)
2. **Test Login:**
   - Username: `lion`
   - Secret: `TuerOhneWiederkehr2025`
3. **Test Single Chat:** Archetype auswählen → Nachricht senden
4. **Test Council Session:** Topic eingeben → Session starten

### 4.2 Check Browser Console

- **Keine CORS Errors**
- **Keine "VITE_API_BASE_URL is not set" Errors**
- **API calls gehen an Render Backend**

### 4.3 Check Render Logs

- **Keine Errors**
- **API calls werden empfangen:**
  ```
  [COUNCIL] Request - userId: lion, mode: direct
  ```

---

## 🔍 Troubleshooting

### Backend nicht erreichbar

**Problem:** Health endpoint gibt 404 oder Timeout

**Fix:**
1. Check Render Logs für Errors
2. Verify `JWT_SECRET` ist gesetzt
3. Verify Health Check Path: `/api/health`
4. Check Service Status: Sollte "Live" sein

### CORS Errors

**Problem:** Browser Console zeigt CORS Errors

**Fix:**
1. Check `ALLOWED_ORIGINS` in Render
2. Muss exakte Vercel-Domain enthalten (ohne trailing slash)
3. Case-sensitive
4. Redeploy Backend nach Änderung

### Frontend zeigt "VITE_API_BASE_URL is not set"

**Problem:** Build Error oder Runtime Error

**Fix:**
1. Check Vercel Environment Variables
2. Variable heißt `VITE_API_BASE_URL` (nicht `VITE_API_URL`)
3. Muss für alle Environments gesetzt sein
4. Redeploy Frontend

### Login funktioniert nicht

**Problem:** 401 Unauthorized oder Token invalid

**Fix:**
1. Check `JWT_SECRET` in Render ist gesetzt
2. Check Render Logs für `[AUTH]` Messages
3. Try logging in again (Token könnte abgelaufen sein)

---

## 📊 Deployment Checklist

### Pre-Deployment
- [x] Code committed und gepusht zu GitHub
- [x] JWT_SECRET generiert
- [x] OpenAI API Key vorhanden
- [x] Render Account erstellt
- [x] Vercel Account erstellt

### Backend (Render)
- [ ] Service erstellt
- [ ] Build/Start Commands gesetzt
- [ ] Environment Variables gesetzt (JWT_SECRET, OPENAI_API_KEY, ALLOWED_ORIGINS)
- [ ] Health Check Path: `/api/health`
- [ ] Deployment erfolgreich
- [ ] Health endpoint testbar

### Frontend (Vercel)
- [ ] Project erstellt
- [ ] Repository verbunden
- [ ] Environment Variable gesetzt (VITE_API_BASE_URL)
- [ ] Deployment erfolgreich
- [ ] Frontend lädt ohne Fehler

### Post-Deployment
- [ ] Render ALLOWED_ORIGINS mit Vercel-Domain aktualisiert
- [ ] Login funktioniert
- [ ] Single Chat funktioniert
- [ ] Council Session funktioniert
- [ ] Keine CORS Errors
- [ ] Keine Console Errors

---

## 🆘 Support

**Render Logs:**
- Dashboard → Your Service → Logs

**Vercel Logs:**
- Dashboard → Your Project → Deployments → Click Deployment → Logs

**Health Checks:**
```bash
# Backend
curl https://your-backend.onrender.com/api/health

# Auth Health
curl https://your-backend.onrender.com/api/auth/health
```

---

## 📝 Quick Reference

### Render Backend URL Format
```
https://<service-name>-<random-id>.onrender.com
```

### Vercel Frontend URL Format
```
https://<project-name>.vercel.app
```

### Required Environment Variables

**Render:**
- `NODE_ENV=production`
- `JWT_SECRET=<32+ chars>`
- `OPENAI_API_KEY=sk-...`
- `ALLOWED_ORIGINS=https://frontend.vercel.app,http://localhost:3000`

**Vercel:**
- `VITE_API_BASE_URL=https://backend.onrender.com`

---

**Ready to Deploy!** 🚀

Folge den Schritten oben und du solltest in 10-15 Minuten live sein.

**Last Updated:** 2025-01-27



