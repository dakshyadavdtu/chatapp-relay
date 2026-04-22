#!/usr/bin/env node
'use strict';

/**
 * Backend `npm test` entry:
 * 1) Start Mongo (and Redis) via Docker Compose when available.
 * 2) Otherwise wait for Mongo at DB_URI from `citest.env` (local mongod / Atlas).
 *
 * Set USE_HOST_MONGO=true to skip Docker and only use DB_URI from citest.env.
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { MongoClient } = require('mongodb');

const backendRoot = path.join(__dirname, '..');
const citestPath = path.join(backendRoot, 'citest.env');
const chainScript = path.join(__dirname, 'run-full-test-chain.sh');
const ciDocker = path.join(__dirname, 'ci-docker.sh');

function loadCitest() {
  require('dotenv').config({ path: citestPath });
}

async function mongoReachable(uri, timeoutMs) {
  const c = new MongoClient(uri, { serverSelectionTimeoutMS: timeoutMs });
  try {
    await c.connect();
    await c.db('admin').command({ ping: 1 });
    await c.close();
    return true;
  } catch (_) {
    try {
      await c.close();
    } catch (_) {
      /* ignore */
    }
    return false;
  }
}

async function waitMongo(uri, label, attempts = 60, delayMs = 1000) {
  for (let i = 1; i <= attempts; i += 1) {
    if (await mongoReachable(uri, 3000)) {
      console.log(`[run-tests-complete] Mongo OK (${label}) after ${i} attempt(s)`);
      return true;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

function dockerUp() {
  const r = spawnSync('bash', [ciDocker, 'up', '-d', '--wait'], {
    cwd: backendRoot,
    stdio: 'inherit',
  });
  return r.status === 0;
}

function dockerDown() {
  spawnSync('bash', [ciDocker, 'down', '-v'], { cwd: backendRoot, stdio: 'inherit' });
}

function runChain(env) {
  return spawnSync('bash', [chainScript], {
    cwd: backendRoot,
    stdio: 'inherit',
    env,
  });
}

async function main() {
  loadCitest();
  const useHostOnly = process.env.USE_HOST_MONGO === 'true';
  let dockerStarted = false;
  let mongoUri = process.env.DB_URI;

  if (!mongoUri) {
    console.error('[run-tests-complete] citest.env must define DB_URI');
    process.exit(1);
  }

  if (!useHostOnly && dockerUp()) {
    dockerStarted = true;
    loadCitest();
    mongoUri = process.env.DB_URI || mongoUri;
  }

  if (!(await waitMongo(mongoUri, dockerStarted ? 'docker' : 'host', 60))) {
    console.error(
      '[run-tests-complete] MongoDB not reachable.\n' +
        '  - Start Docker and run again (uses docker-compose.ci.yml), or\n' +
        '  - Run mongod locally and set DB_URI in backend/citest.env, or\n' +
        '  - USE_HOST_MONGO=true npm test  (skip Docker; use citest.env DB_URI only)\n'
    );
    if (dockerStarted) dockerDown();
    process.exit(1);
  }

  const env = {
    ...process.env,
    DB_URI: mongoUri,
    ALLOW_LOCAL_DB: 'true',
    DOTENV_CONFIG_PATH: citestPath,
  };

  const chain = runChain(env);
  const code = chain.status ?? 1;

  if (dockerStarted) dockerDown();

  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
