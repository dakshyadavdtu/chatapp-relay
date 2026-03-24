import { createLayout } from '../components/Layout.js';
import { getRoute, onRouteChange } from './router.js';
import { renderChatPlaceholder } from '../pages/chat.js';
import { renderHome } from '../pages/home.js';

function getOutlet(root) {
  return root.querySelector('[data-outlet]');
}

async function renderRoute(outlet) {
  outlet.replaceChildren();
  const route = getRoute();
  if (route === '/chat') {
    await renderChatPlaceholder(outlet);
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
