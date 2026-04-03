import { authState, loadSession } from '../features/auth/state.js';
import { startChatRealtime, stopChatRealtime } from '../features/chat/realtime.js';
import { resetChatState } from '../features/chat/state.js';
import { markBootstrapped } from '../state/store.js';

export async function bootstrapApp() {
  await loadSession();
  if (authState.status === 'signed_in') {
    startChatRealtime();
  } else {
    stopChatRealtime();
    resetChatState();
  }
  markBootstrapped();
}
