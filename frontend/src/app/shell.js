import { createLayout } from '../components/Layout.js';
import { getRoute, onRouteChange, navigate } from './router.js';
import { renderChatPage } from '../pages/chat.js';
import { renderHome } from '../pages/home.js';
import { authState } from '../features/auth/state.js';
import { startChatRealtime, stopChatRealtime } from '../features/chat/realtime.js';
import { resetChatState } from '../features/chat/state.js';

function getOutlet(root) {
  return root.querySelector('[data-outlet]');
}

async function renderRoute(outlet) {
  outlet.replaceChildren();
  const route = getRoute();
  if (route === '/chat') {
    if (authState.sessionChecked && authState.status !== 'signed_in') {
      stopChatRealtime();
      resetChatState();
      navigate('/');
      await renderHome(outlet);
      return;
    }
    if (authState.status === 'signed_in') {
      startChatRealtime();
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
