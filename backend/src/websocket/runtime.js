import { rejectWebSocketUpgrade } from './upgrade.js';

export function createWebSocketRuntime() {
  return {
    handleUpgrade: rejectWebSocketUpgrade,
  };
}

