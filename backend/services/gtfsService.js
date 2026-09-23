import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Dados gerados por scripts/buildGtfs.js a partir do GTFS da SPTrans
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'gtfs-lines.json');

let gtfsLines = null;

function loadGtfs() {
  if (gtfsLines) return gtfsLines;
  try {
    gtfsLines = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`[GTFS] ${Object.keys(gtfsLines).length} linhas carregadas.`);
  } catch (err) {
    console.warn('[GTFS] Arquivo data/gtfs-lines.json não encontrado. Rode: node scripts/buildGtfs.js <pasta-gtfs>');
    gtfsLines = {};
  }
  return gtfsLines;
}

// Normaliza nomes para comparar letreiro do GTFS com tp/ts da Olho Vivo
const normalize = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Retorna { shape, stops } do GTFS para uma linha da Olho Vivo.
 * @param {{lt: string, tl: number|string, sl: number|string, tp?: string, ts?: string}} linha
 */
export function getGtfsLine(linha) {
  if (!linha?.lt || !linha?.tl) return null;
  const route = loadGtfs()[`${linha.lt}-${linha.tl}`];
  if (!route) return null;

  // Na Olho Vivo, tp/ts são os LETREIROS de cada sentido: no sentido 1 o ônibus mostra tp
  // (seu destino) e no sentido 2 mostra ts. Comparamos com o letreiro (headsign) do GTFS.
  const sl = Number(linha.sl) || 1;
  const matches = (headsign, nome) => {
    const a = normalize(headsign);
    const b = normalize(nome);
    return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
  };
  const destino = sl === 1 ? linha.tp : linha.ts;
  const origem = sl === 1 ? linha.ts : linha.tp;
  let direction = Object.keys(route).find(d => matches(route[d].headsign, destino));
  if (!direction) {
    const oposta = Object.keys(route).find(d => matches(route[d].headsign, origem));
    if (oposta) direction = Object.keys(route).find(d => d !== oposta);
  }
  if (!direction) direction = String(sl - 1);

  return route[direction] || Object.values(route)[0];
}

// Índice de paradas: cp -> { parada, linhas que passam nela }
let stopsIndex = null;

function getStopsIndex() {
  if (stopsIndex) return stopsIndex;
  stopsIndex = new Map();
  for (const [routeId, directions] of Object.entries(loadGtfs())) {
    const sep = routeId.lastIndexOf('-');
    const lt = routeId.slice(0, sep);
    const tl = routeId.slice(sep + 1);
    for (const dir of Object.values(directions)) {
      for (const stop of dir.stops) {
        if (!stopsIndex.has(stop.cp)) stopsIndex.set(stop.cp, { ...stop, linhas: [] });
        const entry = stopsIndex.get(stop.cp);
        if (!entry.linhas.some(l => l.lt === lt && l.tl === tl && l.destino === dir.headsign)) {
          entry.linhas.push({ lt, tl, destino: dir.headsign });
        }
      }
    }
  }
  return stopsIndex;
}

// Distância em metros entre dois pontos (haversine)
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Paradas mais próximas de uma coordenada, ordenadas pela distância.
 * Se não houver nenhuma no raio pedido, amplia até 1,5 km.
 */
export function getNearbyStops(lat, lng, raio = 500, limite = 20) {
  const all = [];
  for (const stop of getStopsIndex().values()) {
    // Pré-filtro barato (~2 km) antes do cálculo exato
    if (Math.abs(stop.py - lat) > 0.02 || Math.abs(stop.px - lng) > 0.02) continue;
    all.push({ ...stop, distancia: Math.round(distanceMeters(lat, lng, stop.py, stop.px)) });
  }
  all.sort((a, b) => a.distancia - b.distancia);

  for (const r of [raio, 1000, 1500]) {
    const inside = all.filter(s => s.distancia <= r);
    if (inside.length > 0 || r === 1500) return inside.slice(0, limite);
  }
  return [];
}

export function getStop(cp) {
  return getStopsIndex().get(Number(cp)) || null;
}

// Carrega na inicialização para não travar a primeira requisição
loadGtfs();
