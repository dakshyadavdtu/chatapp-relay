export function createLayout() {
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const nav = document.createElement('nav');
  nav.className = 'app-nav';
  nav.innerHTML =
    '<a href="#/">Home</a> <span class="app-nav-sep">·</span> <a href="#/chat">Chat</a>';

  const main = document.createElement('main');
  main.className = 'layout-outlet';
  main.dataset.outlet = '';

  shell.append(nav, main);
  return shell;
}
