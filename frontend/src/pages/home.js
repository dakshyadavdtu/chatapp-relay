import { getJson } from '../api/client.js';
import { authState } from '../features/auth/state.js';

export async function renderHome(container) {
  const title = document.createElement('h1');
  title.textContent = 'Relay';
  container.append(title);

  const sessionLine = document.createElement('p');
  if (authState.status === 'checking') {
    sessionLine.textContent = 'Session: checking';
  } else if (authState.status === 'signed_in') {
    const name = authState.user?.username || authState.user?.name || authState.user?.id || 'user';
    sessionLine.textContent = `Session: signed in (${name})`;
  } else {
    sessionLine.textContent = 'Session: signed out';
  }
  container.append(sessionLine);

  const line = document.createElement('p');
  line.textContent = 'Checking API…';
  container.append(line);

  try {
    const body = await getJson('/api/health');
    if (body?.success && body?.data?.ok) {
      line.textContent = 'API reachable';
    } else {
      line.textContent = 'API returned an unexpected shape';
    }
  } catch {
    line.textContent = 'API not reachable (start the backend on port 3000)';
  }
}
