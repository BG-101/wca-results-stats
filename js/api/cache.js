// Caché en localStorage con versión: si la versión cambia, el dato se considera caducado.
const PREFIX = 'wcastats:';

export function cacheGet(key, version) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.version === version ? entry.data : null;
  } catch {
    return null;
  }
}

export function cacheSet(key, version, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ version, data }));
  } catch (err) {
    // Cuota excedida (~5 MB) o almacenamiento no disponible: la caché es opcional.
    console.warn('No se pudo guardar en caché:', key, err);
  }
}