# Quick Start Guide

## 🚀 Starting the App Locally

### Step 1: Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend (in project root):**
```bash
npm install
```

### Step 2: Set Up Environment Variables

**Backend** - Create `server/.env`:
```env
OPENAI_API_KEY=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
PORT=3001
NODE_ENV=development
```

**Frontend** - Create `.env` in project root (optional):
```env
VITE_API_BASE_URL=http://localhost:3001
```

### Step 3: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
✅ Backend running on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
npm run dev
```
✅ Frontend running on http://localhost:3000

### Step 4: Open in Browser

Open http://localhost:3000 and login with:
- Username: `friend1`
- Secret: `secret1`

---

## 👥 Adding Your Friends as Users

Edit `server/server.ts` and add more users to the `users` array:

```typescript
const users: User[] = [
  // ... existing users ...
  {
    id: 'user6',
    username: 'alice',
    secretHash: createHash('sha256').update('alice-secret-123').digest('hex'),
  },
  {
    id: 'user7',
    username: 'bob',
    secretHash: createHash('sha256').update('bob-secret-456').digest('hex'),
  },
];
```

**Important:** After adding users, restart the backend server.

---

## 🌐 Sharing with Friends (Deployment Options)

### Option 1: Local Network (Easiest for Testing)

1. **Find your local IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update frontend `.env`:**
   ```env
   VITE_API_BASE_URL=http://YOUR_IP_ADDRESS:3001
   ```

3. **Update backend CORS** (if needed) in `server/server.ts`:
   ```typescript
   app.use(cors({
     origin: ['http://localhost:3000', 'http://YOUR_IP_ADDRESS:3000']
   }));
   ```

4. **Rebuild frontend:**
   ```bash
   npm run build
   ```

5. **Share:**
   - Friends on same WiFi: `http://YOUR_IP_ADDRESS:3000`
   - Make sure your firewall allows connections on ports 3000 and 3001

### Option 2: Deploy to Cloud (Recommended for Production)

#### Using Vercel/Netlify (Frontend) + Railway/Render (Backend)

**Backend Deployment (Railway/Render):**

1. Push code to GitHub
2. Connect to Railway or Render
3. Set environment variables:
   - `OPENAI_API_KEY=your-key`
   - `PORT=3001` (or let platform assign)
   - `NODE_ENV=production`
4. Deploy

**Frontend Deployment (Vercel/Netlify):**

1. Connect your GitHub repo
2. Set build command: `npm run build`
3. Set environment variable:
   - `VITE_API_BASE_URL=https://your-backend-url.railway.app` (or Render URL)
4. Deploy

**Update frontend `.env.production`:**
```env
VITE_API_BASE_URL=https://your-backend-url.railway.app
```

### Option 3: Simple VPS (DigitalOcean, Linode, etc.)

1. **SSH into your server**
2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone your repo:**
   ```bash
   git clone your-repo-url
   cd the-violet-eightfoldCoreUsabilityCheck
   ```

4. **Set up backend:**
   ```bash
   cd server
   npm install
   # Create .env with your OpenAI key
   npm run build
   ```

5. **Set up frontend:**
   ```bash
   cd ..
   npm install
   # Create .env with backend URL
   npm run build
   ```

6. **Use PM2 to run servers:**
   ```bash
   npm install -g pm2
   cd server
   pm2 start dist/server.js --name violet-backend
   cd ..
   pm2 serve dist --name violet-frontend --port 3000
   ```

7. **Set up reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
       }

       location /api {
           proxy_pass http://localhost:3001;
       }
   }
   ```

---

## 📱 Mobile Access

The app is mobile-responsive! Friends can:
- Open the URL on their phone browser
- Add to home screen (PWA-ready)
- Use it like a native app

---

## 🔐 Security Notes

- **Never commit `.env` files** (already in `.gitignore`)
- **Change default test user passwords** before sharing
- **Use HTTPS in production** (Let's Encrypt is free)
- **Limit CORS origins** to your domain only

---

## 🐛 Troubleshooting

**Backend won't start:**
- Check if port 3001 is already in use
- Verify OpenAI API key is correct
- Check `server/.env` exists

**Frontend can't connect:**
- Verify backend is running
- Check `VITE_API_BASE_URL` matches backend URL
- Check browser console for CORS errors

**Friends can't access:**
- Check firewall settings
- Verify IP address is correct
- Make sure both servers are running
- Check CORS configuration

---

## 📞 Quick Reference

**Default URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

**Test Login:**
- Username: `friend1`
- Secret: `secret1`

**Add Users:**
- Edit `server/server.ts` → `users` array
- Restart backend









