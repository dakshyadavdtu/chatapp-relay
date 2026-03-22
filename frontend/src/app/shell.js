import { createLayout } from '../components/Layout.js';
import { renderHome } from '../pages/home.js';

export function mountShell(root) {
  if (!root) {
    return;
  }
  const layout = createLayout();
  root.replaceChildren(layout);
  renderHome(layout);
}
