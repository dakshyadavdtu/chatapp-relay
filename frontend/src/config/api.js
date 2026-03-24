export function apiBase() {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase()}${p}`;
}
