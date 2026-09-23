import React, { useEffect, useRef, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Marker, 
  Popup,
  Circle,
  ZoomControl,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { formatEta, sortByEta } from '../utils/eta';
import { Crosshair, Bus, Clock, Accessibility, MapPin, Layers } from 'lucide-react';

// Fix para ícones padrão do Leaflet no bundler Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente para controlar zoom e centro do mapa suavemente
// Margens para o conteúdo não ficar atrás da barra de busca e do painel lateral
const overlayPadding = () => {
  const isDesktop = window.innerWidth >= 640;
  return {
    paddingTopLeft: [isDesktop ? 420 : 30, 130],
    // No celular o painel ocupa a parte de baixo da tela
    paddingBottomRight: [isDesktop ? 70 : 30, isDesktop ? 40 : Math.round(window.innerHeight * 0.5)]
  };
};

// Voa até um ponto deixando-o no centro da área visível (fora da busca e do painel)
const flyToVisible = (map, latlng, duration) =>
  map.flyToBounds(L.latLngBounds([latlng, latlng]), { ...overlayPadding(), maxZoom: 16, duration });

function MapController({ routeGeometry, paradas, selectedStop, nearbyMode, userLocation, nearbyStops, nearbyStop, stopBuses = [] }) {
  const map = useMap();
  const fittedStopRef = useRef(null);

  // Recalcula o tamanho do mapa quando o container muda (rotação do celular, barra do navegador, etc.)
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  // Quando a previsão da parada chega, enquadra a parada + ônibus a caminho (uma vez por parada)
  useEffect(() => {
    if (!nearbyMode || !nearbyStop) {
      fittedStopRef.current = null;
      return;
    }
    const buses = stopBuses.filter(b => b.py && b.px);
    if (buses.length === 0 || fittedStopRef.current === nearbyStop.cp) return;
    fittedStopRef.current = nearbyStop.cp;
    const points = [[nearbyStop.py, nearbyStop.px], ...buses.map(b => [b.py, b.px])];
    map.flyToBounds(L.latLngBounds(points), { ...overlayPadding(), maxZoom: 16, duration: 1.0 });
  }, [nearbyMode, nearbyStop, stopBuses, map]);

  // Modo "Perto de mim": enquadra você + paradas próximas, ou foca na parada escolhida
  useEffect(() => {
    if (!nearbyMode) return;
    if (nearbyStop) {
      flyToVisible(map, [nearbyStop.py, nearbyStop.px], 1.0);
    } else if (userLocation) {
      const points = [[userLocation.lat, userLocation.lng], ...nearbyStops.map(s => [s.py, s.px])];
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { ...overlayPadding(), maxZoom: 17 });
      } else {
        map.flyTo(points[0], 16);
      }
    }
  }, [nearbyMode, userLocation, nearbyStops, nearbyStop, map]);

  // Ajusta visão para a rota completa ou paradas
  useEffect(() => {
    if (nearbyMode) return;
    if (selectedStop && selectedStop.py && selectedStop.px) {
      flyToVisible(map, [selectedStop.py, selectedStop.px], 1.2);
      return;
    }

    if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
      const bounds = L.latLngBounds(
        routeGeometry.coordinates.map(coord => [coord[1], coord[0]])
      );
      map.fitBounds(bounds, { ...overlayPadding(), maxZoom: 16 });
    } else if (paradas && paradas.length > 0) {
      const bounds = L.latLngBounds(
        paradas.map(p => [p.py, p.px])
      );
      map.fitBounds(bounds, { ...overlayPadding(), maxZoom: 16 });
    }
  }, [routeGeometry, paradas, selectedStop, nearbyMode, map]);

  return null;
}

// Cria ícone customizado de ônibus
function createBusIcon(prefixo, acessivel = false) {
  return L.divIcon({
    className: 'bus-marker-icon',
    html: `
      <div class="bus-pin">
        <div class="bus-pin-pulse"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M16 6v6"/>
          <path d="M4 6c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/>
          <path d="M4 14h16"/>
          <path d="M9 19v2"/>
          <path d="M15 19v2"/>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20]
  });
}

// Ônibus com previsão para a parada, com o número da linha
function createLineBusIcon(linha) {
  return L.divIcon({
    className: 'line-bus-icon',
    html: `
      <div style="display:flex;align-items:center;gap:3px;padding:3px 7px 3px 4px;border-radius:9999px;background:#2563eb;color:#fff;font:700 11px/1 system-ui,sans-serif;box-shadow:0 2px 6px rgba(15,23,42,.35);border:2px solid #fff;white-space:nowrap;transform:translate(-50%,-50%);width:max-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M4 6c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><path d="M4 14h16"/></svg>
        ${linha}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -14]
  });
}

// Marcador da posição do usuário
const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25),0 2px 6px rgba(15,23,42,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// Parada próxima (modo "Perto de mim")
function createNearbyStopIcon(isActive) {
  const size = isActive ? 30 : 24;
  return L.divIcon({
    className: 'nearby-stop-icon',
    html: `
      <div style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${isActive ? '#2563eb' : '#fff'};color:${isActive ? '#fff' : '#2563eb'};border:2px solid #2563eb;box-shadow:0 2px 6px rgba(15,23,42,.3)">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size / 2}" height="${size / 2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

// Cria ícone customizado de parada
function createStopIcon(sequence, isActive = false) {
  return L.divIcon({
    className: 'stop-marker-icon',
    html: `
      <div class="stop-pin ${isActive ? 'active' : ''}">
        ${sequence}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
}

export default function MapComponent({
  routeGeometry,
  paradas = [],
  posicoes = [],
  selectedStop,
  onSelectStop,
  previsoes,
  stopPrevisaoLoading = null,
  selectedLine,
  cartoApiKey = '',
  onLocateMe,
  userLocation = null,
  nearbyMode = false,
  nearbyStops = [],
  nearbyStop = null,
  onSelectNearbyStop,
  stopBuses = []
}) {
  const mapRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('voyager'); // 'voyager' | 'positron' | 'dark' | 'osm'
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Mapeia previsões para a parada
  const getStopPredictions = (codigoParada) => {
    if (!previsoes?.ps) return [];
    const found = previsoes.ps.find(p => p.cp === codigoParada);
    return found?.vs || [];
  };

  // Traçado da rota: inverte [lng, lat] do GeoJSON para [lat, lng] do Leaflet
  const polylineCoords = routeGeometry?.coordinates
    ? routeGeometry.coordinates.map(c => [c[1], c[0]])
    : paradas.map(p => [p.py, p.px]);

  // URLs de camadas do CARTO com suporte à API Key
  const getTileUrl = () => {
    if (mapStyle === 'osm') {
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    const paths = {
      voyager: 'rastertiles/voyager',
      positron: 'light_all',
      dark: 'dark_all'
    };
    const path = paths[mapStyle] || paths.voyager;

    return cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`
      : `https://{s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}{r}.png`;
  };

  const currentTileUrl = getTileUrl();

  // Centralizar na localização atual do usuário
  const handleLocateMe = () => {
    if (onLocateMe) {
      onLocateMe();
      return;
    }
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mapRef.current) {
          mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
        }
      },
      (err) => {
        alert('Não foi possível obter sua localização: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCenterRoute = () => {
    if (!mapRef.current) return;
    if (polylineCoords.length > 0) {
      const bounds = L.latLngBounds(polylineCoords);
      mapRef.current.fitBounds(bounds, overlayPadding());
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[-23.5505, -46.6333]} // São Paulo (Praça da Sé)
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
        ref={mapRef}
      >
        {/* Zoom no canto direito (no celular fica oculto: usa o gesto de pinça) */}
        <ZoomControl position="topright" />
        {/* Camada moderna de mapa CARTO com chave ativa */}
        <TileLayer
          key={currentTileUrl}
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={currentTileUrl}
          maxZoom={19}
        />

        <MapController
          routeGeometry={routeGeometry}
          paradas={paradas}
          selectedStop={selectedStop}
          nearbyMode={nearbyMode}
          userLocation={userLocation}
          nearbyStops={nearbyStops}
          nearbyStop={nearbyStop}
          stopBuses={stopBuses}
        />

        {/* Sua localização */}
        {userLocation && (
          <>
            {userLocation.accuracy > 0 && userLocation.accuracy < 1000 && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy}
                pathOptions={{ color: '#2563eb', weight: 1, opacity: 0.4, fillOpacity: 0.08 }}
              />
            )}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} zIndexOffset={1000}>
              <Popup>
                <div className="p-2 text-xs font-semibold text-slate-800">Você está aqui</div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Paradas próximas (modo "Perto de mim") */}
        {nearbyMode && nearbyStops.map(stop => (
          <Marker
            key={`nearby-${stop.cp}`}
            position={[stop.py, stop.px]}
            icon={createNearbyStopIcon(nearbyStop?.cp === stop.cp)}
            zIndexOffset={nearbyStop?.cp === stop.cp ? 500 : 0}
            eventHandlers={{ click: () => onSelectNearbyStop?.(stop) }}
          />
        ))}

        {/* Ônibus que vão passar na parada escolhida */}
        {nearbyMode && stopBuses.map((bus, idx) => {
          if (!bus.py || !bus.px) return null;
          return (
            <Marker
              key={`stopbus-${bus.p}-${idx}`}
              position={[bus.py, bus.px]}
              icon={createLineBusIcon(bus.linha)}
              zIndexOffset={800}
            >
              <Popup>
                <div className="p-3 min-w-[180px] text-xs">
                  <div className="font-extrabold text-sm text-slate-900">{bus.linha}</div>
                  {bus.destino && <div className="text-slate-500">Sentido {bus.destino}</div>}
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5 text-slate-600">
                    <div>Prefixo: <span className="font-semibold text-slate-900">{bus.p}</span></div>
                    <div>Chegada prevista: <span className="font-semibold text-emerald-600">{bus.t}</span></div>
                    {bus.a && <div>♿ Acessível</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Linha da Rota Traçada */}
        {polylineCoords.length > 1 && (
          <>
            {/* Linha de contorno / sombra para destaque */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: '#1e3a8a',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Linha principal vibrante */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: selectedLine?.color || '#2563eb',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </>
        )}

        {/* Marcadores de Paradas */}
        {paradas.map((parada, index) => {
          const isActive = selectedStop?.cp === parada.cp;
          const predictions = getStopPredictions(parada.cp);

          return (
            <Marker
              key={parada.cp || index}
              position={[parada.py, parada.px]}
              icon={createStopIcon(index + 1, isActive)}
              eventHandlers={{
                click: () => onSelectStop(parada)
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 max-w-[240px]">
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Parada #{index + 1}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">
                    {parada.np}
                  </h4>
                  {parada.ed && (
                    <p className="text-xs text-slate-500 mt-1">
                      {parada.ed}
                    </p>
                  )}

                  {/* Previsão de Chegada nesta Parada */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Próximos Ônibus:
                    </span>
                    {predictions.length > 0 ? (
                      <div className="space-y-1">
                        {sortByEta(predictions).map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between gap-3 text-xs bg-emerald-50 px-2 py-1 rounded text-emerald-800 font-semibold">
                            <span className="flex items-center gap-1">
                              <Bus className="w-3 h-3" />
                              Prefixo {p.p}
                              {p.a && <span title="Acessível">♿</span>}
                            </span>
                            <span title={`Previsto: ${p.t}`}>{formatEta(p.t)}</span>
                          </div>
                        ))}
                      </div>
                    ) : stopPrevisaoLoading === parada.cp ? (
                      <p className="text-[11px] text-slate-400 italic">
                        Calculando previsão em tempo real...
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        {selectedStop?.cp === parada.cp
                          ? 'Nenhum ônibus desta linha a caminho agora.'
                          : 'Toque no ponto para ver a previsão.'}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcadores de Ônibus em Tempo Real */}
        {posicoes.map((veiculo, index) => {
          if (!veiculo.py || !veiculo.px) return null;

          return (
            <Marker
              key={veiculo.p || index}
              position={[veiculo.py, veiculo.px]}
              icon={createBusIcon(veiculo.p, veiculo.a)}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">
                          Ônibus em Trânsito
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-none">
                          Prefixo {veiculo.p}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    {selectedLine && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Linha:</span>
                        <span className="font-semibold text-slate-900">{selectedLine.lt}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Acessibilidade:</span>
                      <span className="font-semibold text-slate-900">
                        {veiculo.a ? '♿ Sim (Adaptado)' : 'Não'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Posicionamento:</span>
                      <span className="font-semibold text-emerald-600">GPS Ao Vivo</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Action Controls */}
      {/* No celular ficam no topo (a gaveta ocupa a parte de baixo) */}
      <div className="absolute right-3 top-[7.5rem] sm:top-auto sm:right-4 sm:bottom-8 flex flex-col gap-2 z-20">
        {/* Menu seletor de estilo do Carto */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border transition-all hover:scale-105 active:scale-95 ${
              showLayerMenu ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-600' : 'border-slate-200'
            }`}
            title="Alterar Estilo do Mapa (CARTO)"
          >
            <Layers className="w-5 h-5" />
          </button>

          {showLayerMenu && (
            <div className="absolute top-0 sm:top-auto sm:bottom-0 right-14 bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[190px] flex flex-col gap-1 z-30 animate-in fade-in">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Estilo do Mapa (CARTO)
              </span>
              <button
                onClick={() => { setMapStyle('voyager'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  mapStyle === 'voyager' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🗺️ CARTO Voyager</span>
                {mapStyle === 'voyager' && <span className="text-[10px] text-blue-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => { setMapStyle('positron'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  mapStyle === 'positron' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>☀️ CARTO Positron</span>
                {mapStyle === 'positron' && <span className="text-[10px] text-blue-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => { setMapStyle('dark'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  mapStyle === 'dark' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🌙 CARTO Dark</span>
                {mapStyle === 'dark' && <span className="text-[10px] text-blue-600 font-bold">✓</span>}
              </button>
              <button
                onClick={() => { setMapStyle('osm'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border-t border-slate-100 mt-0.5 pt-1.5 ${
                  mapStyle === 'osm' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🌍 OpenStreetMap</span>
                {mapStyle === 'osm' && <span className="text-[10px] text-blue-600 font-bold">✓</span>}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLocateMe}
          className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-all hover:scale-105 active:scale-95"
          title="Minha Localização"
        >
          <Crosshair className="w-5 h-5 text-blue-600" />
        </button>

        {polylineCoords.length > 0 && (
          <button
            onClick={handleCenterRoute}
            className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-all hover:scale-105 active:scale-95 text-xs font-semibold flex items-center justify-center"
            title="Ajustar zoom à rota inteira"
          >
            <MapPin className="w-5 h-5 text-slate-700" />
          </button>
        )}
      </div>
    </div>
  );
}
