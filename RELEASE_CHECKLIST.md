# Release Checklist - Production Stabilization

**Branch:** `stabilize-prod`  
**Date:** 2025-01-27  
**Target:** Render (Backend) + Vercel (Frontend)

---

## Pre-Deployment Verification

### ✅ Code Changes Completed
- [x] Fixed userId validation (uses `req.user.id` server-side)
- [x] Updated health endpoint to return `{status: "ok"}`
- [x] Restricted CORS to allowed origins (configurable via env var)
- [x] Added production check for `VITE_API_BASE_URL`
- [x] Added error handling for missing `OPENAI_API_KEY`
- [x] Removed userId from request bodies (backend derives from token)
- [x] Sanitized error messages in production

### ✅ Files Changed
1. `server/server.ts` - Auth validation, CORS, health endpoint, error handling
2. `services/aiService.ts` - Production env check, removed userId from body
3. `AUDIT_FINDINGS.md` - Audit documentation (new)
4. `RELEASE_CHECKLIST.md` - This file (new)

---

## Backend Deployment (Render)

### Environment Variables Required
```env
OPENAI_API_KEY=sk-...                    # REQUIRED - Your OpenAI API key
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-dev.vercel.app  # REQUIRED - Comma-separated list of frontend URLs
NODE_ENV=production                       # Optional but recommended
PORT=10000                                # Optional - Render sets this automatically
```

### Render Service Configuration
- **Root Directory:** `server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment:** Node

### Verification Steps
1. **Health Check:**
   ```bash
   curl https://thevioleteightfold-4224.onrender.com/api/health
   ```
   Expected: `{"status":"ok"}`

2. **Check Logs:**
   - Render Dashboard → Logs
   - Verify: "Server running on port XXXX"
   - Verify: No errors about missing `OPENAI_API_KEY`

3. **Test Login:**
   ```bash
   curl -X POST https://thevioleteightfold-4224.onrender.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"lion","secret":"TuerOhneWiederkehr2025"}'
   ```
   Expected: `{"userId":"lion","token":"..."}`

---

## Frontend Deployment (Vercel)

### Environment Variables Required
```env
VITE_API_BASE_URL=https://thevioleteightfold-4224.onrender.com  # REQUIRED - Backend URL
```

### Vercel Configuration
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install` (default)

### Verification Steps
1. **Build Check:**
   - Vercel Dashboard → Deployments
   - Verify build succeeds
   - Verify no errors about missing `VITE_API_BASE_URL`

2. **Runtime Check:**
   - Open deployed frontend URL
   - Open browser console (F12)
   - Verify: No errors about API base URL
   - Verify: Network tab shows requests to Render backend (not localhost)

3. **Functional Test:**
   - Login with test credentials
   - Test Single Chat (Einzelgespräch)
   - Test Council Session
   - Verify: All API calls succeed

---

## Post-Deployment Verification

### End-to-End Tests
1. **Single Chat Flow:**
   - [ ] Login successful
   - [ ] Select archetype (e.g., SOVEREIGN)
   - [ ] Send message
   - [ ] Receive response
   - [ ] Messages persist in session

2. **Council Session Flow:**
   - [ ] Enter topic
   - [ ] Start session
   - [ ] Receive council dialogue
   - [ ] Continue conversation
   - [ ] Dialogue persists in session

3. **Questlog Integration:**
   - [ ] Note: Integration button exists but is stubbed (expected)
   - [ ] Button closes session without errors

### Security Verification
- [ ] CORS: Frontend can access backend
- [ ] CORS: Other origins are blocked (test with curl from different origin)
- [ ] Auth: Invalid tokens return 401
- [ ] Auth: Valid tokens work correctly
- [ ] Data Isolation: Each user only sees their own data (localStorage scoped)

### Performance Check
- [ ] Backend responds to health check < 1s
- [ ] API calls complete < 5s (depends on OpenAI)
- [ ] No memory leaks (check Render metrics)

---

## Rollback Plan

If deployment fails:

1. **Backend Issues:**
   - Check Render logs for errors
   - Verify environment variables are set correctly
   - Revert to previous deployment in Render dashboard
   - Fix issues and redeploy

2. **Frontend Issues:**
   - Check Vercel build logs
   - Verify `VITE_API_BASE_URL` is set correctly
   - Revert to previous deployment in Vercel dashboard
   - Fix issues and redeploy

3. **CORS Issues:**
   - Temporarily set `ALLOWED_ORIGINS=*` in Render (for debugging only)
   - Verify frontend URL matches exactly (including https://)
   - Fix and redeploy

---

## Monitoring & Maintenance

### What to Monitor
1. **Render Dashboard:**
   - Service uptime
   - Response times
   - Error rates
   - Memory usage

2. **Vercel Dashboard:**
   - Build success rate
   - Deployment status
   - Function logs (if using serverless)

3. **Application Logs:**
   - Backend: Render → Logs
   - Frontend: Browser console (for client-side errors)

### Common Issues & Solutions

#### Issue: Backend returns 500 errors
**Check:**
1. Is `OPENAI_API_KEY` set correctly?
2. Are there errors in Render logs?
3. Is the backend service running?

#### Issue: Frontend shows "VITE_API_BASE_URL is not set"
**Check:**
1. Is `VITE_API_BASE_URL` set in Vercel environment variables?
2. Did you rebuild after setting the variable?
3. Is the variable name exactly `VITE_API_BASE_URL`?

#### Issue: CORS errors in browser console
**Check:**
1. Is frontend URL in `ALLOWED_ORIGINS`?
2. Does URL match exactly (including protocol)?
3. Are credentials enabled in CORS config?

#### Issue: 401 Unauthorized errors
**Check:**
1. Is user logged in?
2. Is token stored in localStorage?
3. Did backend restart (tokens are in-memory)?

---

## Deployment Commands

### After Merging to Main

```bash
# 1. Verify you're on main branch
git checkout main
git pull origin main

# 2. Tag the release (optional)
git tag -a v1.0.0-stable -m "Production stabilization release"
git push origin v1.0.0-stable

# 3. Deploy to Render (automatic if connected to GitHub)
# Or manually trigger deployment in Render dashboard

# 4. Deploy to Vercel (automatic if connected to GitHub)
# Or manually trigger deployment in Vercel dashboard

# 5. Verify deployments
curl https://thevioleteightfold-4224.onrender.com/api/health
# Open frontend URL and test
```

---

## Success Criteria

✅ **Backend:**
- Health endpoint returns `{status: "ok"}`
- Login endpoint works
- Council endpoint works with authentication
- CORS allows frontend origin only

✅ **Frontend:**
- Builds successfully
- Connects to Render backend (not localhost)
- Single chat works
- Council session works
- No console errors

✅ **Security:**
- userId validated server-side
- CORS restricted
- Error messages sanitized in production
- No secrets in logs

---

## Next Steps After Deployment

1. Monitor for 24 hours
2. Collect user feedback
3. Plan next improvements:
   - Questlog integration backend endpoint
   - Database persistence
   - Token refresh mechanism
   - Rate limiting

---

## Emergency Contacts

- **Render Support:** https://render.com/docs/support
- **Vercel Support:** https://vercel.com/support
- **GitHub Repo:** https://github.com/Karokles/TheVioletEightfold

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Backend URL:** https://thevioleteightfold-4224.onrender.com  
**Frontend URL:** _______________  
**Status:** ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Failed




