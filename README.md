# Relay

Chat-style web app: a Node.js backend and a Vite frontend in one repo.

## Project structure

```
.
├── .gitignore
├── backend/     # HTTP server (Node)
├── frontend/    # Browser UI (Vite)
├── LICENSE
└── README.md
```

## Current status

Day 1: layout, env examples, and minimal runnable apps. No production deployment, database, or auth wiring yet.

## Setup

You need Node.js 20+ and npm.

**Backend** (from `backend/`):

```bash
npm install
npm run dev
```

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

More detailed runbooks (ports, API wiring, builds) will be added as the project grows.

## Environment

Optional: copy `backend/.env.example` or `frontend/.env.example` to `.env` in the same folder.

Variables in use today: **`PORT`** (backend, defaults to `3000`) and **`VITE_API_BASE_URL`** (frontend; leave empty for same-origin).

## License

See [LICENSE](./LICENSE).
