# Relay

Relay is a chat app we’re building in the open: a Node server for the API and realtime side, and a Vite-based web client. Nothing fancy in the pitch—just a place to grow rooms, messages, and presence over time.

## Current status

There are early HTTP routes, a websocket connection, and a Vite client that calls `/api` (proxied in dev) with hash routes. Storage is not wired to a real database yet; full chat and persistence are still to come.

## Project structure

```
.
├── .gitignore
├── backend/     # API and server
├── frontend/    # Web UI
├── LICENSE
└── README.md
```

## Local setup

You’ll need Node 20+ and npm.

**Backend** — from `backend/`:

```bash
npm install
npm run dev
npm test
```

**Frontend** — from `frontend/`:

```bash
npm install
npm run dev
```

If you need custom ports or API URLs, copy `.env.example` to `.env` in `backend/` or `frontend/` and edit there. The web UI uses hash routes (`#/`, `#/chat`) and proxies `/api` to the backend in dev.
