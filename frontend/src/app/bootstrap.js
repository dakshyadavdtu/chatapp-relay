import { authState, loadSession } from '../features/auth/state.js';
import { startChatRealtime } from '../features/chat/realtime.js';
import { markBootstrapped } from '../state/store.js';

export async function bootstrapApp() {
  await loadSession();
  if (authState.status === 'signed_in') {
    startChatRealtime();
  }
  markBootstrapped();
}
