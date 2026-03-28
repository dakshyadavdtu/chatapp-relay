# Relay

Relay is a chat app we’re building in the open: a Node server for the API and realtime side, and a Vite-based web client. Nothing fancy in the pitch—just a place to grow rooms, messages, and presence over time.

## Current status

There are early HTTP routes, a Vite client that calls `/api` (proxied in dev) with hash routes (`#/`, `#/chat`), and a WebSocket the chat UI uses when you’re signed in for new messages. The dev client does not proxy WebSocket traffic like `/api`; it defaults to `ws://localhost:3000` unless you set `VITE_WS_URL` in `frontend/.env`. Storage is in-memory for now, not a real database yet.

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

If you need custom ports or API URLs, copy `.env.example` to `.env` in `backend/` or `frontend/` and edit there. In dev, Vite proxies `/api` to the backend; WebSocket URL is separate (see above).
