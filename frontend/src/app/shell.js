import { createLayout } from '../components/Layout.js';
import { getRoute, onRouteChange } from './router.js';
import { renderChatPage } from '../pages/chat.js';
import { renderHome } from '../pages/home.js';
import { authState } from '../features/auth/state.js';

function getOutlet(root) {
  return root.querySelector('[data-outlet]');
}

async function renderRoute(outlet) {
  outlet.replaceChildren();
  const route = getRoute();
  if (route === '/chat') {
    if (authState.status !== 'signed_in') {
      const p = document.createElement('p');
      p.className = 'chat-empty';
      p.textContent = 'Sign in to open chat.';
      outlet.append(p);
      return;
    }
    await renderChatPage(outlet);
    return;
  }
  await renderHome(outlet);
}

export async function mountShell(root) {
  if (!root) {
    return;
  }
  const layout = createLayout();
  root.replaceChildren(layout);
  const outlet = getOutlet(layout);
  if (!outlet) {
    return;
  }
  await renderRoute(outlet);
  onRouteChange(() => {
    void renderRoute(outlet);
  });
}
