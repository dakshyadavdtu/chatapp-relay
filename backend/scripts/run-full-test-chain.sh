#!/usr/bin/env bash
# Full backend test chain with citest.env (Mongo + Redis expected up).
set -euo pipefail
cd "$(dirname "$0")/.."
export DOTENV_CONFIG_PATH="${DOTENV_CONFIG_PATH:-./citest.env}"

node -r dotenv/config scripts/verify-baseline.js
node tests/env-validate-refresh-pepper.required.spawn.test.js
node -r dotenv/config tests/origins.test.js
node -r dotenv/config tests/ack-drop.test.js
node -r dotenv/config tests/backpressure-enforcement.test.js
node -r dotenv/config tests/db-idempotency.test.js
node -r dotenv/config tests/rate-limit-router.test.js
node -r dotenv/config tests/reconnect/reconnect.test.js
node -r dotenv/config tests/presence/presence-refresh-race.test.js
node -r dotenv/config tests/metrics/metrics.test.js
node -r dotenv/config tests/diagnostics/diagnostics.test.js
node -r dotenv/config tests/auth/roles.test.js
node -r dotenv/config tests/auth/auth-contract-6b.test.js
node -r dotenv/config tests/suspicious/suspicious.test.js
node -r dotenv/config tests/admin/admin-endpoints.test.js
node -r dotenv/config tests/admin/admin-report-context-window.test.js
node -r dotenv/config tests/admin/phase2-admin-users.test.js
node -r dotenv/config tests/admin/admin.messages.test.js
node -r dotenv/config tests/observability.safety.test.js
node -r dotenv/config tests/observability/aggregators/messages.test.js
node -r dotenv/config tests/api/api-contract.test.js
node -r dotenv/config tests/http/body-limit.test.js
node -r dotenv/config tests/chat/read-cursor-persistence.test.js
node -r dotenv/config tests/chat/chats-lastmessage-direct-only.test.js
node --test tests/redis/*.test.js
node scripts/enforce-state-ownership.js

echo "✅ Full backend test chain passed."
