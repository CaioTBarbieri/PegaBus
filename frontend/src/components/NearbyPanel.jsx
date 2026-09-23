import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  X,
  Info,
  Loader2
} from 'lucide-react';
import { minutesUntil, formatEta } from '../utils/eta';
import { destinoPrevisao } from '../utils/linha';


function formatDistance(m) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

// Agrupa a previsão da parada por linha, ordenando pela chegada mais próxima
function getArrivals(previsao) {
  const linhas = previsao?.p?.l || [];
  return linhas
    .map(l => ({
      ...l,
      vs: [...(l.vs || [])].sort((a, b) => (minutesUntil(a.t) ?? 999) - (minutesUntil(b.t) ?? 999))
    }))
    .filter(l => l.vs.length > 0)
    .sort((a, b) => (minutesUntil(a.vs[0].t) ?? 999) - (minutesUntil(b.vs[0].t) ?? 999));
}

export default function NearbyPanel({
  status,
  error,
  stops = [],
  selectedStop,
  previsao,
  isLoadingPrevisao,
  onSelectStop,
  onBack,
  onSelectLine,
  onRelocate,
  onClose
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const arrivals = getArrivals(previsao);

  return (
    <div className={`bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl transition-all duration-300 flex flex-col overflow-hidden w-full sm:w-96 sm:max-h-[calc(100dvh-190px)] ${
      isCollapsed ? 'pb-[env(safe-area-inset-bottom)] sm:pb-0 bg-slate-900' : 'h-[46dvh] sm:h-[580px]'
    }`}>
      {/* Cabeçalho (no celular, tocar recolhe/expande) */}
      <div className="relative px-3.5 pt-4 pb-3 sm:p-3.5 bg-slate-900 text-white shrink-0 flex items-center justify-between select-none">
        <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-600" />
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedStop ? (
            <button
              onClick={onBack}
              className="p-2 sm:p-1.5 -ml-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Voltar para paradas próximas"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-inner">
              <LocateFixed className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1 cursor-pointer sm:cursor-default" onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className="font-bold text-xs truncate text-slate-100">
              {selectedStop ? selectedStop.np : 'Perto de mim'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {selectedStop
                ? `${formatDistance(selectedStop.distancia)} de você`
                : status === 'ready'
                  ? `${stops.length} paradas próximas`
                  : 'Paradas e ônibus ao seu redor'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onRelocate}
            className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Atualizar minha localização"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {status === 'locating' || status === 'loading' ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              {status === 'locating' ? 'Obtendo sua localização...' : 'Buscando paradas próximas...'}
            </div>
          ) : status === 'error' ? (
            <div className="p-8 text-center text-xs">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">{error}</p>
              <button
                onClick={onRelocate}
                className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : selectedStop ? (
            /* Ônibus que vão passar na parada selecionada */
            <div className="space-y-1.5">
              <div className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Próximos ônibus neste ponto
              </div>
              {isLoadingPrevisao && arrivals.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  Consultando previsão em tempo real...
                </div>
              ) : arrivals.length > 0 ? (
                arrivals.map((linha, idx) => (
                  <button
                    key={`${linha.c}-${linha.sl}-${idx}`}
                    onClick={() => onSelectLine(linha)}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 transition-colors flex items-center gap-2.5"
                    title="Ver trajeto desta linha"
                  >
                    <div className="px-2 h-8 min-w-[3.5rem] rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                      {linha.c}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {destinoPrevisao(linha) || 'Destino não informado'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {linha.vs.slice(0, 3).map((v, vIdx) => (
                          <span
                            key={v.p || vIdx}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              vIdx === 0
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                            title={`Prefixo ${v.p} · previsto ${v.t}`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {formatEta(v.t)}
                            {v.a && <span title="Acessível">♿</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Nenhum ônibus com previsão para este ponto agora.
                  {selectedStop.linhas?.length > 0 && (
                    <div className="mt-3 text-slate-500">
                      Linhas que atendem este ponto:
                      <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                        {selectedStop.linhas.map((l, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {l.lt}-{l.tl}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : stops.length > 0 ? (
            /* Lista de paradas próximas */
            <div className="space-y-1">
              {stops.map((stop) => {
                const linhasUnicas = [...new Set((stop.linhas || []).map(l => `${l.lt}-${l.tl}`))];
                return (
                  <button
                    key={stop.cp}
                    onClick={() => onSelectStop(stop)}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-slate-900 leading-tight">{stop.np}</h4>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          {formatDistance(stop.distancia)}
                        </span>
                      </div>
                      {linhasUnicas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {linhasUnicas.slice(0, 6).map(c => (
                            <span key={c} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {c}
                            </span>
                          ))}
                          {linhasUnicas.length > 6 && (
                            <span className="px-1.5 py-0.5 text-slate-400 font-semibold text-[10px]">
                              +{linhasUnicas.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Nenhuma parada encontrada em até 1,5 km de você.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
