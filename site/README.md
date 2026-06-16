# Lazarus Engine Website

This is the public website project for `lazarus-engine.eu`.

## Why this exists

The app, the API, and the public website now have different jobs:

- `lazarus-engine.eu` -> public website
- `app.lazarus-engine.eu` -> application
- `api.lazarus-engine.eu` -> backend

Keeping the website in `site/` lets you connect a second Vercel project with:

- Repository: this repo
- Root Directory: `site`
- Production Branch: `main`

## Local development

```bash
cd site
npm install
npm run dev
```

The site runs on `http://localhost:4173`.

## Vercel setup

Create a new Vercel project and set:

- Root Directory: `site`
- Framework Preset: `Vite`
- Production Branch: `main`

Point your main domain to this project:

- `lazarus-engine.eu`
- optionally `www.lazarus-engine.eu`

Leave the app and backend on their existing subdomains:

- `app.lazarus-engine.eu`
- `api.lazarus-engine.eu`
