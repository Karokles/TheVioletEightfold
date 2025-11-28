# Deployment Guide

## Quick Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables set
- [ ] CORS configured correctly
- [ ] Users added to backend
- [ ] Test login works
- [ ] Mobile access tested

---

## Platform-Specific Guides

### Railway (Backend) + Vercel (Frontend) - Recommended

**Railway Backend:**

1. Sign up at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Set root directory: `server`
5. Add environment variables:
   ```
   OPENAI_API_KEY=your-key-here
   NODE_ENV=production
   ```
6. Deploy
7. Copy the generated URL (e.g., `https://your-app.railway.app`)

**Vercel Frontend:**

1. Sign up at [vercel.com](https://vercel.com)
2. Import Project → GitHub
3. Framework Preset: Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-app.railway.app
   ```
7. Deploy

**Update Backend CORS:**
```typescript
app.use(cors({
  origin: ['https://your-frontend.vercel.app']
}));
```

---

### Render (Full Stack)

**Backend Service:**

1. New → Web Service
2. Connect GitHub repo
3. Settings:
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Environment: Node
4. Environment Variables:
   ```
   OPENAI_API_KEY=your-key
   NODE_ENV=production
   PORT=10000
   ```
5. Deploy

**Frontend Static Site:**

1. New → Static Site
2. Connect GitHub repo
3. Settings:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```
5. Deploy

---

### DigitalOcean App Platform

**Single App (Full Stack):**

1. Create App → GitHub
2. Add Components:
   - **Backend Component:**
     - Source: `server/`
     - Build Command: `npm install && npm run build`
     - Run Command: `npm start`
     - Environment Variables:
       ```
       OPENAI_API_KEY=your-key
       NODE_ENV=production
       ```
   
   - **Frontend Component:**
     - Source: Root
     - Build Command: `npm install && npm run build`
     - Output Directory: `dist`
     - Environment Variables:
       ```
       VITE_API_BASE_URL=https://your-backend-url
       ```

3. Deploy

---

## Environment Variables Reference

### Backend (`server/.env`)
```env
OPENAI_API_KEY=sk-...                    # Required
PORT=3001                                 # Optional (default: 3001)
NODE_ENV=production                       # Optional
```

### Frontend (`.env` or `.env.production`)
```env
VITE_API_BASE_URL=https://your-backend-url  # Required for production
```

---

## Adding Users for Production

Edit `server/server.ts` before deploying:

```typescript
const users: User[] = [
  {
    id: 'user1',
    username: 'friend1',
    secretHash: createHash('sha256').update('strong-password-here').digest('hex'),
  },
  // Add more users...
];
```

**Or create a users.json file** (better for production):

```typescript
// server/users.json
[
  { "id": "user1", "username": "friend1", "secret": "password1" },
  { "id": "user2", "username": "friend2", "secret": "password2" }
]

// server/server.ts - Load from file
import usersData from './users.json' assert { type: 'json' };
const users = usersData.map(u => ({
  id: u.id,
  username: u.username,
  secretHash: createHash('sha256').update(u.secret).digest('hex'),
}));
```

---

## Security Checklist

- [ ] Changed default test user passwords
- [ ] Using HTTPS (not HTTP)
- [ ] CORS restricted to your frontend domain
- [ ] `.env` files not committed to git
- [ ] OpenAI API key secured
- [ ] Rate limiting considered (for production)
- [ ] Error messages don't leak sensitive info

---

## Monitoring & Maintenance

**Check Backend Health:**
```bash
curl https://your-backend-url/api/health
```

**View Logs:**
- Railway: Dashboard → Deployments → View Logs
- Render: Dashboard → Logs
- Vercel: Dashboard → Deployments → View Function Logs

**Update Users:**
1. Edit `server/server.ts`
2. Redeploy backend
3. Users take effect immediately

---

## Cost Estimates

**Railway:**
- Free tier: $5/month credit
- Backend: ~$5-10/month

**Vercel:**
- Free tier: Generous for personal projects
- Frontend: Free for most use cases

**Render:**
- Free tier: Sleeps after inactivity
- Paid: $7/month per service

**Total Estimated Cost:** $0-20/month depending on usage

---

## Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Build backend
cd server
npm install
npm run build

# Build frontend
cd ..
npm install
npm run build

echo "✅ Build complete! Ready to deploy."
echo "📦 Backend: server/dist/"
echo "📦 Frontend: dist/"
```

Run: `chmod +x deploy.sh && ./deploy.sh`

