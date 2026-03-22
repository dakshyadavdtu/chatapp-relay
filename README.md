# Relay

Relay is a chat-style web app with a JavaScript backend and browser client.

**Stack:** Node.js backend, Vite frontend (folders will be filled in as the project grows).

**Status:** Early setup. The repo root and layout are being put in order first.

Setup and run instructions will be added once the apps are wired up.

## Environment

Copy `backend/.env.example` or `frontend/.env.example` to `.env` in the same folder if you need overrides.

Only **`PORT`** (backend) and **`VITE_API_BASE_URL`** (frontend) are used right now. Both are optional: the backend defaults to port `3000`, and the client defaults to same-origin when the URL is empty.

## License

See [LICENSE](./LICENSE).
