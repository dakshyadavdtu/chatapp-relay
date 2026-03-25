const routes = [];

export function any(path, handler) {
  routes.push({ methods: null, path, handler });
}

export function route(methods, path, handler) {
  const list = Array.isArray(methods) ? methods : [methods];
  routes.push({ methods: list, path, handler });
}

function splitPath(path) {
  if (!path || path === '/') {
    return [];
  }
  return path.split('/').filter(Boolean);
}

function matchPath(pattern, actual) {
  if (pattern === actual) {
    return { ok: true, params: Object.create(null) };
  }

  const pSeg = splitPath(pattern);
  const aSeg = splitPath(actual);
  if (pSeg.length !== aSeg.length) {
    return { ok: false, params: null };
  }

  const params = Object.create(null);
  for (let i = 0; i < pSeg.length; i++) {
    const p = pSeg[i];
    const a = aSeg[i];
    if (p.startsWith(':') && p.length > 1) {
      params[p.slice(1)] = decodeURIComponent(a);
      continue;
    }
    if (p !== a) {
      return { ok: false, params: null };
    }
  }
  return { ok: true, params };
}

function methodAllowed(method, routeMethods) {
  if (routeMethods === null) {
    return true;
  }
  if (routeMethods.includes(method)) {
    return true;
  }
  if (method === 'HEAD' && routeMethods.includes('GET')) {
    return true;
  }
  return false;
}

export function match(method, path) {
  for (const r of routes) {
    const m = matchPath(r.path, path);
    if (!m.ok) {
      continue;
    }
    if (!methodAllowed(method, r.methods)) {
      continue;
    }
    return { handler: r.handler, params: m.params };
  }
  return null;
}
