import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import MapComponent from './components/MapComponent';
import LineInfoPanel from './components/LineInfoPanel';
import NearbyPanel from './components/NearbyPanel';
import useFavorites from './hooks/useFavorites';
import { destinoPrevisao } from './utils/linha';
import {
  getAuthStatus,
  getConfig,
  getLineStops,
  getLinePositions,
  getLineRoute,
  getLinePrevisao,
  getNearbyStops,
  getStopPrevisao,
  searchLines
} from './services/api';

export default function App() {
  const [authStatus, setAuthStatus] = useState(null);
  const [cartoApiKey, setCartoApiKey] = useState('');
  const [selectedLine, setSelectedLine] = useState(null);
  const [paradas, setParadas] = useState([]);
  const [posicoes, setPosicoes] = useState([]);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [previsoes, setPrevisoes] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isLoadingLine, setIsLoadingLine] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const lineRequestRef = useRef(0);
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  // Modo "Perto de mim"
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyStatus, setNearbyStatus] = useState('idle'); // idle | locating | loading | ready | error
  const [nearbyError, setNearbyError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyStops, setNearbyStops] = useState([]);
  const [nearbyStop, setNearbyStop] = useState(null);
  const [stopPrevisao, setStopPrevisao] = useState(null);
  const [isLoadingPrevisao, setIsLoadingPrevisao] = useState(false);
  const nearbyStopRef = useRef(null);

  // Carrega status da autenticação, config e linha inicial
  const checkStatus = useCallback(async () => {
    try {
      const [status, cfg] = await Promise.all([
        getAuthStatus().catch(() => null),
        getConfig().catch(() => null)
      ]);
      if (status) setAuthStatus(status);
      if (cfg?.cartoApiKey) setCartoApiKey(cfg.cartoApiKey);
    } catch (err) {
      console.warn('Erro ao verificar status do backend:', err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);


  // Selecionar uma linha e carregar seus dados
  // focusStop: parada para destacar no mapa depois que a linha carregar
  const handleSelectLine = async (linha, focusStop = null) => {
    if (!linha) return;
    const requestId = ++lineRequestRef.current;
    setSelectedLine(linha);
    setSelectedStop(null);
    // Limpa o trajeto/paradas da linha anterior enquanto a nova carrega
    setRouteGeometry(null);
    setParadas([]);
    setPosicoes([]);
    setIsLoadingLine(true);

    try {
      // Carrega paradas e posições em paralelo
      const [stopsData, positionsData, routeData, prevData] = await Promise.all([
        getLineStops(linha).catch(() => []),
        getLinePositions(linha.cl).catch(() => ({ vs: [] })),
        getLineRoute(linha).catch(() => null),
        getLinePrevisao(linha.cl).catch(() => null)
      ]);

      // Ignora respostas de uma linha que já foi trocada por outra
      if (requestId !== lineRequestRef.current) return;

      setParadas(stopsData || []);
      setPosicoes(positionsData?.vs || []);
      setRouteGeometry(routeData);
      setPrevisoes(prevData);
      if (focusStop) {
        setSelectedStop((stopsData || []).find(p => p.cp === focusStop.cp) || focusStop);
      }
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Erro ao carregar dados da linha:', err);
    } finally {
      if (requestId === lineRequestRef.current) setIsLoadingLine(false);
    }
  };

  // Fecha a linha aberta e limpa o mapa
  const handleCloseLine = () => {
    lineRequestRef.current++; // descarta respostas ainda a caminho
    setSelectedLine(null);
    setSelectedStop(null);
    setRouteGeometry(null);
    setParadas([]);
    setPosicoes([]);
    setPrevisoes(null);
    setIsLoadingLine(false);
  };

  // Atualização periódica das posições dos ônibus (a cada 15 segundos)
  const refreshVehicles = useCallback(async () => {
    if (!selectedLine) return;
    setIsRefreshing(true);
    try {
      const [posData, prevData] = await Promise.all([
        getLinePositions(selectedLine.cl).catch(() => null),
        getLinePrevisao(selectedLine.cl).catch(() => null)
      ]);

      if (posData?.vs) {
        setPosicoes(posData.vs);
      }
      if (prevData) {
        setPrevisoes(prevData);
      }
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.warn('Falha na atualização automática:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedLine]);

  useEffect(() => {
    if (!selectedLine || nearbyMode) return;

    const interval = setInterval(() => {
      refreshVehicles();
    }, 15000); // 15s

    return () => clearInterval(interval);
  }, [selectedLine, nearbyMode, refreshVehicles]);

  // ==================== PREVISÃO DA PARADA SELECIONADA (MODO LINHA) ====================
  // A previsão por linha da SPTrans vem vazia para muitas linhas; a previsão por parada é
  // confiável, então ao escolher um ponto consultamos a parada e filtramos a linha aberta.
  const [linhaStopPrevisao, setLinhaStopPrevisao] = useState(null); // { cp, loading, vs }

  useEffect(() => {
    if (nearbyMode || !selectedLine || !selectedStop?.cp) {
      setLinhaStopPrevisao(null);
      return;
    }
    const cp = selectedStop.cp;
    let cancelled = false;

    const load = async () => {
      setLinhaStopPrevisao(current => (current?.cp === cp ? current : { cp, loading: true, vs: [] }));
      try {
        const data = await getStopPrevisao(cp);
        const doLinha = (data?.p?.l || []).filter(l =>
          l.cl === selectedLine.cl ||
          (l.c === `${selectedLine.lt}-${selectedLine.tl}` && l.sl === selectedLine.sl)
        );
        if (!cancelled) setLinhaStopPrevisao({ cp, loading: false, vs: doLinha.flatMap(l => l.vs || []) });
      } catch {
        if (!cancelled) setLinhaStopPrevisao({ cp, loading: false, vs: [] });
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [nearbyMode, selectedLine, selectedStop]);

  // Junta a previsão da linha com a da parada selecionada (esta tem prioridade)
  const previsoesComParada = linhaStopPrevisao && !linhaStopPrevisao.loading
    ? {
        ...(previsoes || {}),
        ps: [
          ...(previsoes?.ps || []).filter(p => p.cp !== linhaStopPrevisao.cp),
          { cp: linhaStopPrevisao.cp, vs: linhaStopPrevisao.vs }
        ]
      }
    : previsoes;

  // ==================== MODO "PERTO DE MIM" ====================

  const startNearby = () => {
    setNearbyMode(true);
    nearbyStopRef.current = null;
    setNearbyStop(null);
    setStopPrevisao(null);
    setNearbyError('');

    if (!navigator.geolocation) {
      setNearbyStatus('error');
      setNearbyError('Seu navegador não suporta geolocalização.');
      return;
    }

    setNearbyStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        setUserLocation(loc);
        setNearbyStatus('loading');
        try {
          const stops = await getNearbyStops(loc.lat, loc.lng);
          setNearbyStops(stops || []);
          setNearbyStatus('ready');
        } catch (err) {
          setNearbyStatus('error');
          setNearbyError('Não foi possível buscar as paradas próximas.');
        }
      },
      (err) => {
        setNearbyStatus('error');
        setNearbyError(
          err.code === err.PERMISSION_DENIED
            ? 'Permita o acesso à sua localização no navegador para ver as paradas próximas.'
            : 'Não foi possível obter sua localização. Tente novamente.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const loadStopPrevisao = useCallback(async (stop) => {
    setIsLoadingPrevisao(true);
    try {
      const data = await getStopPrevisao(stop.cp);
      // Ignora se o usuário já trocou de parada
      if (nearbyStopRef.current?.cp !== stop.cp) return;
      setStopPrevisao(data);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.warn('Erro ao buscar previsão da parada:', err);
    } finally {
      setIsLoadingPrevisao(false);
    }
  }, []);

  const handleSelectNearbyStop = (stop) => {
    nearbyStopRef.current = stop;
    setNearbyStop(stop);
    setStopPrevisao(null);
    loadStopPrevisao(stop);
  };

  // Atualiza a previsão da parada selecionada a cada 15s
  useEffect(() => {
    if (!nearbyMode || !nearbyStop) return;
    const interval = setInterval(() => loadStopPrevisao(nearbyStop), 15000);
    return () => clearInterval(interval);
  }, [nearbyMode, nearbyStop, loadStopPrevisao]);

  // Abre a linha escolhida na previsão da parada, com a parada em destaque
  const handleSelectLineFromStop = async (entry) => {
    const sep = entry.c.lastIndexOf('-');
    const lt = entry.c.slice(0, sep);
    const tl = Number(entry.c.slice(sep + 1));
    let linha = entry.cl
      ? {
          cl: entry.cl,
          lt,
          tl,
          sl: entry.sl,
          // lt0/lt1 da previsão são os letreiros tp/ts da linha (não dependem do sentido)
          tp: entry.lt0,
          ts: entry.lt1
        }
      : null;

    if (!linha) {
      const results = await searchLines(lt).catch(() => []);
      linha = results?.find(l => l.lt === lt && Number(l.tl) === tl && l.sl === entry.sl)
        || results?.find(l => l.lt === lt && Number(l.tl) === tl);
    }
    if (linha) {
      setNearbyMode(false);
      handleSelectLine(linha, nearbyStop);
    }
  };

  // Ônibus com previsão para a parada selecionada (para desenhar no mapa)
  const stopBuses = (stopPrevisao?.p?.l || []).flatMap(l =>
    (l.vs || []).map(v => ({ ...v, linha: l.c, destino: destinoPrevisao(l) }))
  );

  // Inverter sentido da linha (Ida / Volta)
  const handleSwapDirection = async () => {
    if (!selectedLine) return;
    setIsLoadingLine(true);
    try {
      // Procura a linha com mesmo letreiro mas sentido inverso
      const targetSentido = selectedLine.sl === 1 ? 2 : 1;
      const results = await searchLines(selectedLine.lt);
      const oppositeLine = results?.find(l =>
        l.lt === selectedLine.lt && Number(l.tl) === Number(selectedLine.tl) && l.sl === targetSentido
      );

      if (oppositeLine) {
        handleSelectLine(oppositeLine);
      } else {
        // Sentido único ou não encontrado: troca só o sentido (o destino segue o sl)
        handleSelectLine({ ...selectedLine, sl: targetSentido });
      }
    } catch (err) {
      console.error('Erro ao inverter sentido:', err);
      setIsLoadingLine(false);
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Header Principal */}
      <Header
        authStatus={authStatus}
        isRefreshing={isRefreshing}
        onManualRefresh={refreshVehicles}
        lastUpdated={lastUpdated}
      />

      {/* Conteúdo Principal com Mapa e Elementos Sobrepostos */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {/* Mapa Leaflet em tela cheia */}
        <MapComponent
          routeGeometry={nearbyMode ? null : routeGeometry}
          paradas={nearbyMode ? [] : paradas}
          posicoes={nearbyMode ? [] : posicoes}
          selectedStop={nearbyMode ? null : selectedStop}
          onSelectStop={(p) => setSelectedStop(p)}
          previsoes={previsoesComParada}
          stopPrevisaoLoading={linhaStopPrevisao?.loading ? linhaStopPrevisao.cp : null}
          selectedLine={selectedLine}
          cartoApiKey={cartoApiKey}
          onLocateMe={startNearby}
          userLocation={userLocation}
          nearbyMode={nearbyMode}
          nearbyStops={nearbyStops}
          nearbyStop={nearbyStop}
          onSelectNearbyStop={handleSelectNearbyStop}
          stopBuses={stopBuses}
        />

        {/* Barra de Pesquisa Flutuante Superior */}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-20 pointer-events-auto">
          <SearchBar
            onSelectLine={(linha) => { setNearbyMode(false); handleSelectLine(linha); }}
            selectedLine={selectedLine}
            onNearby={startNearby}
            nearbyActive={nearbyMode}
            favorites={favorites}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        {/* Painel "Perto de mim" */}
        {nearbyMode && (
          <div className="absolute left-0 right-0 bottom-0 sm:left-4 sm:bottom-4 sm:right-auto z-20 pointer-events-auto">
            <NearbyPanel
              status={nearbyStatus}
              error={nearbyError}
              stops={nearbyStops}
              selectedStop={nearbyStop}
              previsao={stopPrevisao}
              isLoadingPrevisao={isLoadingPrevisao}
              onSelectStop={handleSelectNearbyStop}
              onBack={() => { nearbyStopRef.current = null; setNearbyStop(null); setStopPrevisao(null); }}
              onSelectLine={handleSelectLineFromStop}
              onRelocate={startNearby}
              onClose={() => setNearbyMode(false)}
            />
          </div>
        )}

        {/* Painel de Informações da Linha Flutuante (Estilo Moovit) */}
        {selectedLine && !nearbyMode && (
          <div className="absolute left-0 right-0 bottom-0 sm:left-4 sm:bottom-4 sm:right-auto z-20 pointer-events-auto">
            <LineInfoPanel
              selectedLine={selectedLine}
              paradas={paradas}
              posicoes={posicoes}
              previsoes={previsoesComParada}
              stopPrevisaoLoading={linhaStopPrevisao?.loading ? linhaStopPrevisao.cp : null}
              selectedStop={selectedStop}
              onSelectStop={(p) => setSelectedStop(p)}
              onSwapDirection={handleSwapDirection}
              isLoading={isLoadingLine}
              isFavorite={isFavorite(selectedLine)}
              onToggleFavorite={toggleFavorite}
              onClose={handleCloseLine}
            />
          </div>
        )}
      </div>
    </div>
  );
}
