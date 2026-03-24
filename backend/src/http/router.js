const routes = [];

export function any(path, handler) {
  routes.push({ methods: null, path, handler });
}

export function route(methods, path, handler) {
  const list = Array.isArray(methods) ? methods : [methods];
  routes.push({ methods: list, path, handler });
}

export function match(method, path) {
  for (const r of routes) {
    if (r.path !== path) {
      continue;
    }
    if (r.methods === null) {
      return r.handler;
    }
    if (r.methods.includes(method)) {
      return r.handler;
    }
    if (method === 'HEAD' && r.methods.includes('GET')) {
      return r.handler;
    }
  }
  return null;
}
