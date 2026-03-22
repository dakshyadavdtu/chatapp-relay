const base = () => import.meta.env.VITE_API_BASE_URL ?? '';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base()}${p}`;
}

export async function getJson(path) {
  const res = await fetch(apiUrl(path));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
