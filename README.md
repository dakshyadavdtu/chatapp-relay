# Relay

Relay is a chat app we’re building in the open: a Node server for the API and realtime side, and a Vite-based web client. Nothing fancy in the pitch—just a place to grow rooms, messages, and presence over time.

## Current status

We’re still laying the groundwork: repo layout, backend and frontend folders, and basic dev commands. The interesting stuff (full API, persistence, realtime) comes next.

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
```

**Frontend** — from `frontend/`:

```bash
npm install
npm run dev
```

If you need custom ports or API URLs, copy `.env.example` to `.env` in `backend/` or `frontend/` and edit there.
