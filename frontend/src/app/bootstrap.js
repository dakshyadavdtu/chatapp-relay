import { loadSession } from '../features/auth/state.js';
import { markBootstrapped } from '../state/store.js';

export async function bootstrapApp() {
  await loadSession();
  markBootstrapped();
}
