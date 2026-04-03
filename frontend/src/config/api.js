export function apiBase() {
  const raw = import.meta?.env?.VITE_API_BASE_URL ?? '';
  if (!raw) {
    return '';
  }
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${p}` : p;
}
