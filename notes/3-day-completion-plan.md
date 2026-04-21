# Relay — 3 Day Completion Plan

## 1. Current public project state

**Repo layout** — Single app split into `backend/` (Node 20+, ESM) and `frontend/` (Vite 6, vanilla JS). Root `README.md` describes setup and main API routes. There is no monorepo tooling, no shared `packages/` contract package, and no deployment manifests in-tree beyond what the README mentions.

**Backend** — The server is `node:http` plus `ws`, not Express. Entry is `backend/src/index.js` → `server/start.js`, which creates the HTTP handler and attaches WebSocket upgrade handling on the same port (`PORT`, default 3000 from `config/env.js`). Routing is custom (`http/router.js`, `http/routes.js`) with thin handlers under `http/handlers/` (auth, chats, uploads, health).

Chat logic lives in `chat/service.js` on top of `storage/index.js`, which is a **singleton in-memory store** (`storage/memory.js`). Persistence resets on process restart. There is seeded data (`direct:u1:u2`) for tests/dev. The service implements direct chats, message append/list, unread/read cursors, search across chats and recent message text, and image messages tied to `/uploads/:uploadId`.

**Auth/session** — `auth/service.js` implements password login that only checks non-empty username/password; any password works for a given username. Sessions are in-memory tokens; `login` sets `Set-Cookie: sid=…; Path=/; HttpOnly` (no `Secure`/`SameSite` flags in code). `POST /api/register` is wired but `registerWithBody` returns `NOT_IMPLEMENTED` and handlers return **501**. `POST /api/auth/refresh` re-validates the cookie session.

**Realtime** — WebSocket runs on the same HTTP server (`websocket/runtime.js`). After connect, clients can send JSON `ping` → server `pong`, and `presence` is routed to `websocket/presence.js`. Outbound chat delivery uses `MESSAGE_RECEIVE` payloads built in `websocket/outbound.js` and fan-out via `realtime/bus.js` on message creation. Tests cover ping, auth close on bad cookie, and message-created events.

**Frontend** — Hash routing (`#/`, `#/chat`) via `app/router.js`. Bootstrap (`app/bootstrap.js`) loads session, starts realtime when signed in, and kicks unauthenticated users off `/chat`. Chat UI is imperative DOM in `pages/chat.js` with state in `features/chat/state.js`, API wrappers in `api/`, and WebSocket client in `transport/ws.js` (reconnect with cap, auth-close handling). `vite.config.js` proxies `/api` to `localhost:3000` only; **`VITE_WS_URL` must be set manually** if API and WS hosts differ (documented in README). Styling is minimal (`styles/base.css`), not a utility CSS framework.

**Tests** — Backend: `node --test` under `backend/test/` — **72 tests, all passing** (HTTP, chat service, storage, websocket behavior). Frontend: `node --test` on `src/features/**/*.test.js` — **28 tests, all passing** (auth state, message normalization, chat state, uploads). There is no browser E2E harness in the repo.

**Docs/config** — `README.md` is accurate and fairly detailed about routes and behavior. `backend/.env.example` only documents `PORT`. `frontend/.env.example` documents `VITE_API_BASE_URL` and `VITE_WS_URL`. No in-repo architecture doc beyond README.

**Incomplete or risky areas (verified in code)** —

- **`frontend/src/pages/home.js`** — On logout, the click handler sets `statusEl.textContent`, but **`statusEl` is never defined**; only `sessionLine` exists. That throws at runtime when a signed-in user clicks Log out.
- **Registration** — Public API exposes register but it is explicitly not implemented.
- **Auth model** — No password verification, no account store, no roles; usernames map to synthetic `user:<name>` ids. This is fine for a demo but far from a production auth story.
- **Persistence** — All state is process-local memory; no migration path to a database in this repo yet.
- **Operational surface** — No rate limiting, no admin HTTP routes, no metrics/redis/email/pdf stack; CORS and cookie policy are minimal (implicit same-origin dev setup).
- **Dual send paths** — Both `POST /api/chat/send` and `POST /api/chats/:chatId/messages` exist; the codebase tests both, but clients must stay consistent to avoid drift.

**Code quality patterns** — Generally small modules, handler layer separated from `chat/service.js`, and tests anchored to HTTP/json shapes. Some payload normalization is duplicated between HTTP layers and websocket outbound (nested `message` vs flat fields) but the frontend already tolerates both.

---

## 2. Main gap areas

These are the largest practical gaps between what this repo ships today and the direction implied by aiming at a **full production-integrated chat** (persistent accounts, hardened server, rich client, and operational/admin features). Wording stays tied to observable engineering gaps, not generic “quality” slogans.

1. **No durable persistence** — Chat history, sessions, and uploads are in-memory. Restart loses data; there is no schema, backup, or migration story in this codebase.
2. **Auth is a stub** — Passwords are not verified; there is no user directory, password hashing, email verification, session rotation hardening, or CSRF/same-site strategy beyond basic cookie issuance.
3. **`POST /api/register` is a dead end** — Route exists; service returns `NOT_IMPLEMENTED`. Any client expecting account creation will hit 501.
4. **Confirmed frontend bug on logout** — Undefined `statusEl` in `home.js` breaks the signed-in logout path.
5. **Client stack mismatch vs a rich dashboard-style app** — This repo is vanilla JS + minimal CSS. A production-style target typically implies a component framework, design system, routing, and charting/admin views; none of that exists here, so “resemblance” cannot mean a full UI rewrite inside three days without abandoning scope control.
6. **No admin, moderation, or reporting HTTP API** — There are no routes for user administration, message reports, exports, or session revocation in the public tree.
7. **No caching/queue/realtime scaling layer** — No Redis or equivalent; connection registry is in-process only.
8. **Environment and deployment contract is thin** — Only `PORT` is documented on the backend; production cookie flags, trusted proxies, CORS, and split API/WS URLs for static hosting are not codified in config modules.
9. **WebSocket path and HTTP share origin only by convention** — Client defaults to `ws://localhost:3000`; split deployments need discipline around `VITE_WS_URL` and TLS (`wss:`).
10. **Search is in-memory scan** — Acceptable at small scale; will not behave like indexed full-text search on large histories without a different backend approach.

---

## 3. Planning assumptions

- **Three days** means roughly **three focused dev days**, not a calendar week with research spikes. Overtime can absorb small surprises, not a database migration plus UI rewrite.
- The **current architecture (Node http + ws + Vite vanilla client + memory store)** is assumed to stay; replacing it with Express + React + Mongo + Redis is **out of scope** for this window. That work is a **multi-week** effort if you want parity with a large integrated backend.
- **Goal for the sprint** is to make the **open Relay** feel **finished for its own stack**: stable core flows, honest feature set (implement or remove stubs), aligned docs/config, and a clear **deferred backlog** for persistence and admin.
- **Tests already pass**; the plan assumes we **keep them green** and add targeted tests when fixing bugs (e.g. logout) or tightening contracts.
- **“Resemblance” to a much larger system** is interpreted as **closing the gap on behaviors that fit this codebase** (reliable chat, search, media, session/realtime, honest API surface), **not** cloning every subsystem of a production monolith.
- **Styling** can improve lightly (layout, accessibility hints) but **Tailwind or full design-system adoption** is deferred unless it blocks usability.
- **Local git exclude** is already how private reference material stays out of commits; this plan does not rely on changing tracked ignore rules.

---

## 4. What will be done in these 3 days

**In scope**

- Fix the **logout runtime bug** in `home.js` and verify login/logout/realtime start/stop manually.
- Decide and execute one of: **minimal in-memory register** (create stable user id + session) **or** **remove/hide register** from API/docs until real auth exists—pick the option that matches how you want demos to behave.
- **Backend config pass**: expand `.env.example` (and optionally `loadConfig`) for anything you need for local vs production hints (cookie flags behind env, allowed origins if you add CORS helper later).
- **Frontend integration pass**: `VITE_API_BASE_URL` behavior vs dev proxy, image URLs when API is on another host, reconnect + active chat refresh behavior under manual tests.
- **Documentation sync**: README sections for env vars, known limitations (memory store), and manual test checklist.
- **Light consistency pass** on duplicate endpoints (`/api/chat/send` vs `/api/chats/:id/messages`) — document canonical client usage; change code only if a real mismatch shows up in manual testing.

**Out of scope (must not be started in these 3 days)**

- MongoDB/Redis/queue integration, Express migration, React rewrite, admin dashboards, email, PDF exports, full security audit tooling.
- Full-text search infrastructure, horizontal scaling, or message encryption.
- Rewriting the entire CSS layer or importing a large component library.

**Cleaned only lightly**

- Naming nits and small refactors that do not unblock flows.
- Deep deduplication of payload shapes between HTTP and WS unless a bug forces it.

**Intentionally untouched unless blocking**

- Chat id helper extras (`toRoomChatId` tested but not productized as “rooms” UX) unless you already expose room creation in UI.
- Presence handler depth—only fix if manual testing shows broken behavior for current clients.

---

## 5. Day 1 plan

### Unit 1 — Confirm baseline and reproduce the logout bug

- **Purpose** — Lock the starting point: clean git state, installs, tests green, manual repro of home logout failure.
- **Files/areas** — `frontend/src/pages/home.js`, `frontend/package.json`, `backend/package.json`, terminal runs.
- **Why now** — Prevents planning fiction; confirms the highest-priority user-visible defect.
- **Expected result** — Written notes (personal scratch ok) with repro steps; agreement that logout throws on `statusEl`.
- **Validation** — `cd backend && npm test`; `cd frontend && npm test`; manual: sign in, click Log out, confirm failure before fix.
- **Commit likely** — No (investigation only).

### Unit 2 — Fix logout and add a regression test if feasible

- **Purpose** — Restore a working sign-out path; avoid silent DOM errors.
- **Files/areas** — `frontend/src/pages/home.js`; optional small test under `frontend/src/features/` if you extract a tiny pure helper for “session label text”; otherwise rely on manual/browser check and existing auth tests untouched.
- **Why now** — Unblocks trustworthy manual testing for the rest of the sprint.
- **Expected result** — Logout updates UI text correctly, clears session via existing `performLogout`, stops realtime, resets chat state, navigates home without throwing.
- **Validation** — Manual: login → chat → logout → home; run `npm test` in frontend.
- **Commit likely** — Yes.

### Unit 3 — Register endpoint decision + implementation or documentation downgrade

- **Purpose** — Eliminate the “501 register” sharp edge for anyone reading OpenAPI-less code.
- **Files/areas** — `backend/src/auth/service.js`, `backend/src/http/handlers/auth/register.js`, `backend/test/*register*` or add test file, `README.md`.
- **Why now** — Auth surface is foundational; stubs confuse integrators.
- **Expected result** — Either a **minimal** register that creates in-memory users (if you add a tiny user map) **or** README + handler behavior that clearly states register is unavailable and clients should not call it (if you remove route, update tests accordingly).
- **Validation** — `npm test` backend; curl/newman-style manual POST to `/api/register` matches documented behavior.
- **Commit likely** — Yes (separate from logout fix).

### Unit 4 — Backend env example and config readability

- **Purpose** — Make local and split-URL setups less guessy.
- **Files/areas** — `backend/.env.example`, optionally `backend/src/config/env.js`, `README.md`.
- **Why now** — Cheap, reduces Day 2–3 friction when testing WS URLs.
- **Expected result** — Example documents `PORT` and any new toggles you add (even if placeholders for future `Secure` cookies).
- **Validation** — Start backend with `.env` copied from example; confirm port read.
- **Commit likely** — Yes (can bundle with README tweaks if small).

---

## 6. Day 2 plan

### Unit 1 — Manual cross-flow testing matrix (two browsers / two users)

- **Purpose** — Validate direct chat messaging, unread badges, mark-read, search, and image upload under realistic use.
- **Files/areas** — Runtime only; note issues in scratchpad for Day 3.
- **Dependency** — Day 1 logout + register story stable.
- **Expected result** — List of any mismatches (e.g. image URL relative vs absolute when using `VITE_API_BASE_URL`).
- **Validation** — Written checklist (see section 10); capture screenshots or console logs only if needed.
- **Commit likely** — No.

### Unit 2 — Frontend API base URL and asset URL alignment

- **Purpose** — Ensure `getJson`/`postJson` and image rendering work when API host ≠ page host (preview builds, tunneling).
- **Files/areas** — `frontend/src/config/api.js`, `frontend/src/pages/chat.js` (`resolveImageUrl` and friends), `frontend/.env.example`, `README.md`.
- **Dependency** — Manual matrix from Unit 1.
- **Expected result** — Documented pattern for `VITE_API_BASE_URL`; code paths resolve `/uploads/...` against API origin when configured.
- **Validation** — Build `npm run build` + `npm run preview` with backend on another port; send image message; confirm render.
- **Commit likely** — Yes.

### Unit 3 — WebSocket reconnect and active-thread recovery

- **Purpose** — Confirm capped reconnect and `recoverAfterReconnect` still match backend list endpoints after interruptions.
- **Files/areas** — `frontend/src/transport/ws.js`, `frontend/src/features/chat/state.js`, `backend/src/websocket/*`.
- **Dependency** — Stable logout/login from Day 1.
- **Expected result** — No duplicate messages or stuck “sending” states after toggling network or restarting backend once.
- **Validation** — Manual: kill backend briefly, observe client status; restore and send/receive.
- **Commit likely** — Maybe (only if you find a real bug).

### Unit 4 — Chat API usage documentation (canonical send path)

- **Purpose** — Reduce future drift between `/api/chat/send` and `/api/chats/:chatId/messages`.
- **Files/areas** — `README.md`, optionally inline comments in `frontend/src/api/chat.js` (keep short).
- **Dependency** — Understanding actual client usage from `api/chat.js`.
- **Expected result** — README states which endpoint the shipped client uses and when the other exists.
- **Validation** — Grep frontend for `chat/send` vs `chats/` paths; ensure docs match grep truth.
- **Commit likely** — Yes.

---

## 7. Day 3 plan

### Unit 1 — Bugfix pass from Day 2 notes

- **Purpose** — Close only verified issues (not speculative refactors).
- **Files/areas** — Whatever Day 2 surfaced (image URL, mark-read edge case, search empty states, etc.).
- **Dependency** — Day 2 matrix.
- **Expected result** — Smaller, stable issue list; tests still green.
- **Validation** — `npm test` both packages; rerun critical manual paths.
- **Commit likely** — Yes (one or more).

### Unit 2 — README and env contract final sync

- **Purpose** — Readers should be able to run backend+frontend without reading source.
- **Files/areas** — `README.md`, both `.env.example` files.
- **Dependency** — Final behavior after fixes.
- **Expected result** — Setup steps, env vars, limitations (memory store), and “not implemented” list accurate.
- **Validation** — Fresh clone simulation: delete `node_modules`, reinstall, follow README only.
- **Commit likely** — Yes.

### Unit 3 — Test gap closure (targeted)

- **Purpose** — Add tests only where cheap and high-signal (e.g. URL resolution helper, register behavior).
- **Files/areas** — `backend/test/`, `frontend/src/features/**/*.test.js`.
- **Dependency** — Stable code from Units 1–2.
- **Expected result** — New tests cover the worst regressions you fear (logout label bug should not return).
- **Validation** — Full test runs.
- **Commit likely** — Yes.

### Unit 4 — Deferred backlog write-up (same file or README section)

- **Purpose** — Make the “not in three days” list explicit so future work does not thrash the small codebase.
- **Files/areas** — Short **“Future work”** section in `README.md` or a `notes/` follow-up file the team agrees on (this plan already lives in `notes/`).
- **Dependency** — Honest assessment after three days.
- **Expected result** — Clear bullets: persistence, real auth, admin APIs, client framework, ops hardening.
- **Validation** — Team read-through; no false claims of completion.
- **Commit likely** — Optional (if you keep backlog in README).

---

## 8. Likely real issues during execution

1. **Logout bug masks other home-page issues** — After fixing `statusEl`, you might notice missing loading states or double `renderHome` edge cases. *Why likely:* the exception short-circuited manual QA. *Handle:* fix the undefined reference first, then re-run manual logout twice in a row.

2. **`VITE_API_BASE_URL` empty vs set changes relative `/uploads` resolution** — Images may work in dev (same origin via proxy) but break in preview. *Why likely:* `resolveImageUrl` behavior depends on how URLs are stored server-side (`/uploads/...`). *Handle:* centralize “API origin” resolution in one helper and test with preview mode.

3. **WebSocket default `ws://localhost:3000` vs HTTPS site** — If you test behind `https://` static hosting, mixed content blocks `ws:`. *Why likely:* local dev uses http/ws. *Handle:* document `wss:` requirement and same-host reverse proxy pattern; do not pretend auto-detection exists without code.

4. **Dual send endpoints confuse future contributors** — Someone “fixes” the client to use the other path and breaks assumptions in tests or state merge. *Why likely:* both routes are tested and valid. *Handle:* README picks a canonical client path; code comments stay minimal.

5. **In-memory register implementation collides with login id scheme** — If register assigns ids differently from `user:<name>` used in login, chat membership might fragment. *Why likely:* login and register were not designed together yet. *Handle:* pick one id scheme and unit-test that login after register sees the same user record.

6. **Mark-read racing with incoming WS messages** — Active chat might double-call or miss a cursor update under fast sends. *Why likely:* optimistic UI plus server timestamps. *Handle:* reproduce with throttled network; only then adjust `features/chat/state.js` merge rules.

7. **Search results open chat not in local list** — UI might label threads oddly until `GET /api/chats` refreshes. *Why likely:* search returns metadata not identical to list rows. *Handle:* confirm `openActiveChat` fetches open payload; tweak label fallback (already partially handled in `chatLabelFromResult`).

8. **Session cookie lacks `SameSite`** — Cross-site embedding or odd iframe setups may behave differently across browsers. *Why likely:* minimal cookie flags. *Handle:* document same-origin expectation; defer Secure/SameSite policy until you have a real deployment URL.

---

## 9. Commit strategy for the 3 days

- **Minimum commits** — 3 (Day 1 logout fix, Day 1 register/config, Day 2–3 integration/docs).
- **Preferred count** — 6–10: small vertical slices that keep `main` shippable.
- **Maximum** — ~15 before you are probably over-splitting; merge tiny typo commits locally if needed.

**Group together** — Docs + `.env.example` for the same behavior change; frontend URL helper + README note; tests with the feature they lock.

**Never batch together** — Unrelated backend auth changes + large frontend UI refactors in one commit; formatting-only sweeps mixed with behavior fixes (hard to bisect).

**Branches/PRs** — If you already use PRs, one short-lived branch `sprint/3-day-relay-hardening` with a single PR at end is natural; if solo, direct commits to `main` are fine if tests stay green.

**Example commit messages (plain)** —

1. Fix logout handler on home page  
2. Add tests for session label rendering after logout  
3. Document register endpoint behavior  
4. Implement basic in-memory registration  
5. Expand backend env example with port notes  
6. Resolve image URLs against API base setting  
7. Document websocket URL setup for non-local hosting  
8. Clarify which send endpoint the client uses  
9. Adjust chat search open flow after manual testing  
10. Add regression test for API base URL helper  
11. Sync README setup steps with latest env vars  
12. Note memory storage limitations in README  
13. Fix mark-read race when reconnecting  
14. Improve reconnect status text in chat header  
15. Add future work section for persistence and admin APIs  

---

## 10. Validation checklist

**Automated**

- [ ] `cd backend && npm test` — all pass  
- [ ] `cd frontend && npm test` — all pass  
- [ ] `cd frontend && npm run build` — succeeds  

**Backend boot**

- [ ] `npm run dev` starts without stack traces  
- [ ] `GET /api/health` returns expected `{ success, data }` shape used by home page  
- [ ] `GET /api/me` 401 when logged out, 200 when logged in  

**Auth/session**

- [ ] Login sets cookie and `/api/me` reflects user  
- [ ] Logout clears session server-side and client state  
- [ ] Register behavior matches README (implemented or explicitly unavailable)  

**Chat HTTP**

- [ ] `GET /api/chats` returns rows with `chatId` field as frontend expects  
- [ ] `GET /api/chats/:id/open` loads messages for a direct chat  
- [ ] `POST` send path used by UI creates message and updates list payloads  
- [ ] `POST .../read` updates unread counts coherently  

**Realtime**

- [ ] WebSocket connects when signed in  
- [ ] New message arrives as `MESSAGE_RECEIVE` to recipient  
- [ ] Invalid session closes socket without infinite reconnect loop  
- [ ] After backend restart, client ends in a sane state (reconnect cap or manual refresh acceptable if documented)  

**Search and media**

- [ ] Search with text returns plausible rows; empty query behaves as coded  
- [ ] Image upload returns metadata; image displays in thread in dev and preview modes  
- [ ] Relative upload URLs resolve correctly when `VITE_API_BASE_URL` is set  

**Regression**

- [ ] No console exception on home after logout fix  
- [ ] No unhandled promise rejections in normal send/receive loop  

**Docs**

- [ ] README env section matches actual variables  
- [ ] Known limitations (memory store, auth strength) stated plainly  

---

## 11. Final recommendation

The most realistic completion strategy for three days is to **treat Relay as its own product slice**: make login/logout, chat, search, uploads, and realtime **boringly reliable** on the current stack, **eliminate sharp stubs** (register), and **document honestly** what is not here yet. That moves the public repo toward the *experience* of a finished chat product without pretending it is the full production system.

**Do not over-engineer** a half migration (e.g. “Mongo models but still memory reads”) in this window. If persistence is next, plan it as a **separate milestone** with migration scripts and dual-write or import tooling.

**Leave alone unless blocking** — Rewriting the client in React, building admin dashboards, adding Redis rate limits, or mirroring a large external test matrix. Those belong **after** the core open-repo story is stable and credible.
