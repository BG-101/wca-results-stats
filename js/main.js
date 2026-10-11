import { getExportDate, getPerson, getCompetitions } from "./api/wcaClient";

const form = document.getElementById('search-form');
const input = document.getElementById('wca-id');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const chartsEl = document.getElementById('charts');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', isError);
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    loadPerson(input.value.trim().toUpperCase());
});

// Permite compartir enlaces: index.html?id=2009ZEMD01
const initialId = new URLSearchParams(location.search).get('id');
if (initialId) {
    input.value = initialId.toUpperCase();
    loadPerson(input.value);
}

async function loadPerson(wcaId) {
    summaryEl.hidden = true;
    chartsEl.hidden = true;
    setStatus('Cargando datos de la WCA...');

    try {
        const version = await getExportDate();
        const person = await getPerson(wcaId, version);

        const compIds = Object.keys(person.results ?? {});
        const competitions = await getCompetitions(compIds, {
            onProgress: (done, total) => setStatus(`Cargando fechas de competiciones... ${done}/${total}`),
        });

        // Próximos pasos: normalize -> stats -> charts
        renderSummary(person, competitions, version);
        history.replaceState(null, '', `?id=${wcaId}`);
        setStatus('');
    } catch (err) {
        console.error(err);
        setStatus(
            err.code === 'NOT_FOUND' ? `No existe el WCA id ${wcaId}.` : `Error: ${err.message}`,
            true,
        );
    }
}

function renderSummary(person, competitions, version) {
    const { gold = 0, silver = 0, bronze = 0 } = person.medals ?? {};
    const rs = person.records?.single ?? {};
    const ra = person.records?.average ?? {};
    const total = Object.keys(competitions).length;
    const withDate = Object.values(competitions).filter((c) => c?.from).length;

    summaryEl.innerHTML = `
        <h2>${esc(person.name)} <small>${esc(person.id)} · ${esc(person.country)}</small></h2>
        <dl class="stats-grid">
            <div><dt>Competiciones</dt><dd>${esc(person.numberOfCompetitions)}</dd></div>
            <div><dt>Medallas</dt><dd>🥇 ${gold} · 🥈 ${silver} · 🥉 ${bronze}</dd></div>
            <div><dt>Récords (single)</dt><dd>WR ${rs.WR ?? 0} · CR ${rs.CR ?? 0} · NR ${rs.NR ?? 0}</dd></dt>
            <div><dt>Récords (media)</dt><dd>WR ${ra.WR ?? 0} · CR ${ra.CR ?? 0} · NR ${ra.NR ?? 0}</dd></dt>
            <div><dt>Fechas cargadas</dt><dd>${withDate}/${total}</dd></div>
            <div><dt>Versión de los datos</dt><dd>${esc(version)}</dd></div>
        </dl>`;
    summaryEl.hidden = false;
}