export function getRoute() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return path.split('?')[0] || '/';
}

export function navigate(path) {
  const next = path.startsWith('/') ? path : `/${path}`;
  window.location.hash = next;
}

export function onRouteChange(handler) {
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
