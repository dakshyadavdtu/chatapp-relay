import { getJson } from '../api/client.js';

export async function renderHome(container) {
  const title = document.createElement('h1');
  title.textContent = 'Relay';
  container.append(title);

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
