import { cacheGet, cacheSet } from './cache.js';

const BASE = 'https://wca-rest-api.robiningelbrecht.be';
const COMP_SCHEMA = 'v1'; // súbela si cambias los campos que guardamos de cada competición

async function fetchJson(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (res.status === 404) {
    const err = new Error(`No encontrado: ${path}`);
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!res.ok) throw new Error(`Error HTTP ${res.status} en ${path}`);
  return res.json();
}

// Fecha del export de la WCA: sirve como versión de caché (los datos cambian 1 vez al día).
export async function getExportDate() {
  const v = await fetchJson('version.json');
  return v.export_date ?? v.exportDate ?? 'unknown';
}

export async function getPerson(wcaId, version) {
  const key = `person:${wcaId}`;
  const cached = cacheGet(key, version);
  if (cached) return cached;

  const data = await fetchJson(`persons/${wcaId}.json`);
  cacheSet(key, version, data);
  return data;
}

// Guardamos solo lo necesario de cada competición (el JSON original incluye mucho texto).
export async function getCompetition(id) {
  const key = `comp:${id}`;
  const cached = cacheGet(key, COMP_SCHEMA);
  if (cached) return cached;

  const c = await fetchJson(`competitions/${id}.json`);
  const slim = {
    id: c.id,
    name: c.name,
    city: c.city,
    country: c.country,
    from: c.date?.from ?? null,
    till: c.date?.till ?? null,
  };
  cacheSet(key, COMP_SCHEMA, slim);
  return slim;
}

// Descarga varias competiciones con concurrencia limitada para no saturar la red.
export async function getCompetitions(ids, { concurrency = 8, onProgress } = {}) {
  const out = {};
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        out[id] = await getCompetition(id);
      } catch (err) {
        console.warn(`No se pudo cargar la competición ${id}:`, err);
        out[id] = null;
      }
      onProgress?.(++done, ids.length);
    }
  }

  const n = Math.min(concurrency, ids.length);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}