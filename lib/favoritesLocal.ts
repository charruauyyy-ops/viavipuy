const KEY = "viavip:favorites:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getLocalFavorites(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id: unknown) => typeof id === "string" && id.length > 0))];
  } catch {
    return [];
  }
}

export function setLocalFavorites(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  } catch {}
}

export function addLocalFavorite(id: string): void {
  const ids = getLocalFavorites();
  if (!ids.includes(id)) {
    ids.push(id);
    setLocalFavorites(ids);
  }
}

export function removeLocalFavorite(id: string): void {
  const ids = getLocalFavorites().filter((x) => x !== id);
  setLocalFavorites(ids);
}

export function toggleLocalFavorite(id: string): { nowFav: boolean; ids: string[] } {
  const ids = getLocalFavorites();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    setLocalFavorites(ids);
    return { nowFav: false, ids };
  } else {
    ids.push(id);
    setLocalFavorites(ids);
    return { nowFav: true, ids };
  }
}

export function isLocalFavorite(id: string): boolean {
  return getLocalFavorites().includes(id);
}

export function clearLocalFavorites(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function getMigrationFlag(userId: string): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(`viavip:favorites:migratedForUser:${userId}`) === "1";
  } catch {
    return false;
  }
}

export function setMigrationFlag(userId: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(`viavip:favorites:migratedForUser:${userId}`, "1");
  } catch {}
}
