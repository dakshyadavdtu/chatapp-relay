# Relay

Relay is a chat app built in the open: Node for the HTTP and WebSocket server, Vite for the client.

## Current status

There are early HTTP routes, a Vite client that calls `/api` (proxied in dev) with hash routes (`#/`, `#/chat`), and a WebSocket the chat UI uses when you’re signed in for new messages. The dev client does not proxy WebSocket traffic like `/api`; it defaults to `ws://localhost:3000` unless you set `VITE_WS_URL` in `frontend/.env`. Storage is in-memory for now, not a real database yet.

The chat page shows per-chat loading and error states, keeps messages sorted oldest-first, disables the composer while sending, refreshes the active thread after you send, and updates chat-list unread badges and previews as messages arrive. Reconnect retries are capped, auth-related socket closes stop retry, and reconnect recovery re-syncs the active chat. Chat search can find matching chats and recent messages, then open the selected conversation from the result list. Image messages are supported with a simple upload flow from the chat composer.

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
Chat API basics: `GET /api/chats` lists chats with unread counts, `GET /api/chats/search?q=...` returns chat/message discovery rows, `POST /api/uploads/image` uploads an image for chat use, `GET /uploads/:uploadId` serves uploaded image bytes, `GET /api/chats/:chatId/open` returns chat plus recent messages, `POST /api/chats/:chatId/messages` sends a message for that chat (text or image, also available as `/api/chat/send`), and `POST /api/chats/:chatId/read` stores the current read position.

**Frontend** — from `frontend/`:

```bash
npm install
npm run dev
# optional: npm test (frontend feature tests)
```

Auth is minimal: use the home page form with any non-empty username/password. The backend sets a `sid` cookie, `/api/me` returns the current user while it’s valid, and the home page logout button clears the session, stops chat, and sends you back home if you were on `#/chat`.

If you need custom ports or URLs, copy `.env.example` to `.env` in `backend/` or `frontend/` and edit there. Vite proxies `/api` in dev only; set `VITE_WS_URL` if the WebSocket host or port differs from the default.
