import { authState } from '../features/auth/state.js';

export function createLayout() {
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const nav = document.createElement('nav');
  nav.className = 'app-nav';

  const aHome = document.createElement('a');
  aHome.href = '#/';
  aHome.textContent = 'Home';

  const sep = document.createElement('span');
  sep.className = 'app-nav-sep';
  sep.textContent = '·';

  const aChat = document.createElement('a');
  aChat.href = '#/chat';
  aChat.textContent = 'Chat';

  const status = document.createElement('span');
  status.className = 'app-auth-status';
  status.textContent =
    authState.status === 'signed_in' ? 'Signed in' : 'Signed out';

  nav.append(aHome, document.createTextNode(' '), sep, document.createTextNode(' '), aChat, document.createTextNode(' '), status);

  const main = document.createElement('main');
  main.className = 'layout-outlet';
  main.dataset.outlet = '';

  shell.append(nav, main);
  return shell;
}
