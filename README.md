# The Violet Eightfold - Inner Council App

An AI-powered personal governance application that simulates an inner council of eight archetypal voices to help with life decisions, self-reflection, and strategic planning.

## Features

- **Direct Counsel**: 1-on-1 chat with individual archetypes (Sovereign, Warrior, Sage, Lover, Creator, Caregiver, Explorer, Alchemist)
- **Council Session**: Multi-archetype debate simulation for complex decisions
- **Soul Blueprint**: Track your personal stats, milestones, attributes, and quests
- **Multi-language Support**: English and German
- **Mobile-Responsive**: Optimized for mobile devices and PWA-ready

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express + OpenAI API
- **Authentication**: Simple token-based auth (MVP)
- **Storage**: localStorage (per-user scoped) - ready for backend migration

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server/` directory:
```env
OPENAI_API_KEY=your-openai-api-key-here
PORT=3001
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

### Frontend Setup

1. In the project root, install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root (optional, defaults to localhost:3001):
```env
VITE_API_BASE_URL=http://localhost:3001
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` by default.

### Production Build

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
npm run build
npm run preview
```

## Test Users

For the MVP, the following test users are pre-configured:

- Username: `friend1`, Secret: `secret1`
- Username: `friend2`, Secret: `secret2`
- Username: `friend3`, Secret: `secret3`
- Username: `friend4`, Secret: `secret4`
- Username: `friend5`, Secret: `secret5`

To add more users, edit `server/server.ts` and add entries to the `users` array.

## Project Structure

```
.
├── server/              # Backend Express server
│   ├── server.ts        # Main server file
│   └── package.json     # Backend dependencies
├── src/                 # Frontend source (if using src/ structure)
├── components/          # React components
├── services/            # Frontend services (AI, user)
├── config/              # Content configuration files
│   ├── archetypes.json  # Archetype definitions
│   ├── ui-text.json     # UI strings (EN/DE)
│   ├── branding.json    # App branding
│   └── loader.ts        # Config loader utility
├── types.ts             # TypeScript type definitions
├── constants.ts         # Non-content constants (icons, enums)
└── package.json         # Frontend dependencies
```

## Removed Features (MVP)

The following features were removed for the MVP:
- Treasury/Finance tracking
- World Map/Psychogeography
- Calendar interface

These can be re-added in future versions if needed.

## Development Notes

- All personal lore and stats are stored per-user in localStorage
- The backend uses OpenAI's `gpt-4o-mini` model for council sessions
- Authentication is token-based and stored in localStorage
- Content (archetypes, UI text) is loaded from JSON config files

## Future Enhancements

- Backend database for persistent storage
- Proper authentication system (Firebase Auth, Auth0, etc.)
- Scribe analysis for automatic lore/stats updates
- Streaming responses for better UX
- PWA manifest and service worker
- Custom archetypes per user

## Quick Start

See [QUICK_START.md](./QUICK_START.md) for step-by-step instructions to run the app locally.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to share with friends.

## License

Private project - All rights reserved
