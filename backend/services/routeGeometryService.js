import axios from 'axios';

// Cache em memória para geometrias de linhas calculadas
const geometryCache = new Map();

/**
 * Calcula a geometria de rota acompanhando as ruas através dos pontos de parada da linha
 * @param {Array<{py: number, px: number, np: string, cp: number}>} paradas 
 * @param {number|string} codigoLinha
 */
export async function getRouteGeometry(paradas, codigoLinha) {
  if (!paradas || paradas.length === 0) {
    return { type: 'LineString', coordinates: [] };
  }

  const cacheKey = `linha_geom_${codigoLinha}`;
  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey);
  }

  // Se tiver menos de 2 paradas, não há trajeto
  if (paradas.length < 2) {
    const coords = paradas.map(p => [p.px, p.py]);
    return { type: 'LineString', coordinates: coords };
  }

  // Tenta obter traçado real pelas vias urbanas usando OSRM
  try {
    // Reduz pontos muito próximos para evitar sobrecarga no OSRM
    const filteredPoints = [];
    let lastPoint = null;

    for (const p of paradas) {
      if (!p.py || !p.px) continue;
      if (!lastPoint) {
        filteredPoints.push(p);
        lastPoint = p;
      } else {
        // Distância euclidiana mínima aproximada (~15 metros)
        const dist = Math.hypot(p.py - lastPoint.py, p.px - lastPoint.px);
        if (dist > 0.00015) {
          filteredPoints.push(p);
          lastPoint = p;
        }
      }
    }

    if (filteredPoints.length < 2) {
      const fallback = { type: 'LineString', coordinates: paradas.map(p => [p.px, p.py]) };
      geometryCache.set(cacheKey, fallback);
      return fallback;
    }

    // Dividir em blocos de até 25 pontos por chamada OSRM para garantir confiabilidade e rapidez
    const CHUNK_SIZE = 25;
    let fullCoordinates = [];

    for (let i = 0; i < filteredPoints.length - 1; i += (CHUNK_SIZE - 1)) {
      const chunk = filteredPoints.slice(i, i + CHUNK_SIZE);
      if (chunk.length < 2) break;

      const coordsQuery = chunk.map(p => `${p.px},${p.py}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;

      try {
        const osrmRes = await axios.get(url, { timeout: 6000 });
        if (osrmRes.data && osrmRes.data.routes && osrmRes.data.routes[0]) {
          const chunkCoords = osrmRes.data.routes[0].geometry.coordinates;
          if (fullCoordinates.length > 0) {
            fullCoordinates.push(...chunkCoords.slice(1));
          } else {
            fullCoordinates.push(...chunkCoords);
          }
        } else {
          // Fallback para segmento direto
          chunk.forEach(p => fullCoordinates.push([p.px, p.py]));
        }
      } catch (chunkErr) {
        // Se a chamada OSRM falhar (timeout/limite), traça em linha reta entre os pontos
        chunk.forEach(p => fullCoordinates.push([p.px, p.py]));
      }
    }

    const resultGeoJSON = {
      type: 'LineString',
      coordinates: fullCoordinates.length > 0 ? fullCoordinates : paradas.map(p => [p.px, p.py])
    };

    geometryCache.set(cacheKey, resultGeoJSON);
    return resultGeoJSON;
  } catch (err) {
    console.warn(`[RouteGeometry] Falha no roteamento OSRM da linha ${codigoLinha}. Usando traçado direto entre paradas.`);
    const fallback = {
      type: 'LineString',
      coordinates: paradas.map(p => [p.px, p.py])
    };
    geometryCache.set(cacheKey, fallback);
    return fallback;
  }
}
