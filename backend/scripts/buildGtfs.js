/**
 * Converte o GTFS da SPTrans em um JSON compacto usado pelo backend.
 *
 * Uso:  node scripts/buildGtfs.js <pasta-do-gtfs-descompactado>
 * Saída: data/gtfs-lines.json
 *
 * Formato: { "<route_id>": { "<direction_id>": { headsign, shape: [[lng, lat], ...], stops: [{cp, np, ed, py, px}, ...] } } }
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gtfsDir = process.argv[2];
if (!gtfsDir) {
  console.error('Uso: node scripts/buildGtfs.js <pasta-do-gtfs>');
  process.exit(1);
}
const outFile = path.join(__dirname, '..', 'data', 'gtfs-lines.json');

// Parser CSV simples com suporte a campos entre aspas
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function readCsv(file, onRow) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(gtfsDir, file), 'utf8'),
    crlfDelay: Infinity
  });
  let header = null;
  for await (const raw of rl) {
    const line = raw.replace(/^﻿/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!header) { header = cols; continue; }
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i]; });
    onRow(row);
  }
}

const round = (n) => Math.round(parseFloat(n) * 1e6) / 1e6;

// 0. Apenas linhas de ônibus (route_type 3); metrô e CPTM ficam de fora
const busRoutes = new Set();
await readCsv('routes.txt', (r) => {
  if (r.route_type === '3') busRoutes.add(r.route_id);
});

// 1. trips: um trip representativo por route_id + direction_id
const trips = new Map(); // trip_id -> { route_id, direction_id, shape_id }
const chosen = new Map(); // `${route_id}|${direction_id}` -> trip_id
await readCsv('trips.txt', (r) => {
  if (!busRoutes.has(r.route_id)) return;
  const key = `${r.route_id}|${r.direction_id}`;
  if (chosen.has(key)) return;
  chosen.set(key, r.trip_id);
  trips.set(r.trip_id, { route_id: r.route_id, direction_id: r.direction_id, shape_id: r.shape_id, headsign: r.trip_headsign });
});
const neededShapes = new Set([...trips.values()].map(t => t.shape_id));
console.log(`trips: ${trips.size} (linha+sentido)`);

// 2. shapes
const shapes = new Map(); // shape_id -> [[seq, lng, lat]]
await readCsv('shapes.txt', (r) => {
  if (!neededShapes.has(r.shape_id)) return;
  if (!shapes.has(r.shape_id)) shapes.set(r.shape_id, []);
  shapes.get(r.shape_id).push([+r.shape_pt_sequence, round(r.shape_pt_lon), round(r.shape_pt_lat)]);
});
console.log(`shapes: ${shapes.size}`);

// 3. stop_times dos trips escolhidos
const tripStops = new Map(); // trip_id -> [[seq, stop_id]]
await readCsv('stop_times.txt', (r) => {
  if (!trips.has(r.trip_id)) return;
  if (!tripStops.has(r.trip_id)) tripStops.set(r.trip_id, []);
  tripStops.get(r.trip_id).push([+r.stop_sequence, r.stop_id]);
});

// 4. stops (apenas os usados)
const usedStops = new Set();
for (const list of tripStops.values()) list.forEach(([, id]) => usedStops.add(id));
const stops = new Map();
await readCsv('stops.txt', (r) => {
  if (!usedStops.has(r.stop_id)) return;
  stops.set(r.stop_id, {
    cp: Number(r.stop_id),
    np: r.stop_name,
    ed: r.stop_desc || '',
    py: round(r.stop_lat),
    px: round(r.stop_lon)
  });
});
console.log(`paradas: ${stops.size}`);

// 5. Monta saída
const result = {};
for (const [tripId, t] of trips) {
  const shape = (shapes.get(t.shape_id) || [])
    .sort((a, b) => a[0] - b[0])
    .map(([, lng, lat]) => [lng, lat]);
  const stopList = (tripStops.get(tripId) || [])
    .sort((a, b) => a[0] - b[0])
    .map(([, id]) => stops.get(id))
    .filter(Boolean);

  result[t.route_id] ??= {};
  result[t.route_id][t.direction_id] = { headsign: t.headsign, shape, stops: stopList };
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(result));
const mb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
console.log(`OK: ${Object.keys(result).length} linhas -> ${outFile} (${mb} MB)`);
