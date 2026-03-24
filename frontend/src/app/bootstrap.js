import { fetchSession } from '../api/auth.js';
import { applySessionResult } from '../features/auth/state.js';
import { markBootstrapped } from '../state/store.js';

export async function bootstrapApp() {
  const session = await fetchSession();
  applySessionResult(session);
  markBootstrapped();
}
