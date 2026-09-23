import React, { useState } from 'react';
import { 
  Bus, 
  MapPin, 
  Clock, 
  ArrowLeftRight, 
  ChevronDown, 
  ChevronUp, 
  Accessibility, 
  Navigation,
  Info,
  Star,
  Loader2,
  X
} from 'lucide-react';
import { formatEta, sortByEta } from '../utils/eta';
import { origemLinha, destinoLinha } from '../utils/linha';

export default function LineInfoPanel({
  selectedLine,
  paradas = [],
  posicoes = [],
  previsoes = null,
  stopPrevisaoLoading = null,
  selectedStop,
  onSelectStop,
  onSwapDirection,
  isLoading,
  isFavorite = false,
  onToggleFavorite,
  onClose
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('paradas'); // 'paradas' ou 'veiculos'

  if (!selectedLine) {
    return null;
  }

  // Mapeia previsões por código de parada
  const stopPredictions = {};
  if (previsoes?.ps) {
    previsoes.ps.forEach(p => {
      stopPredictions[p.cp] = p.vs || [];
    });
  }

  return (
    <div className={`bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl transition-all duration-300 flex flex-col overflow-hidden w-full sm:w-96 sm:max-h-[calc(100dvh-190px)] ${
      isCollapsed ? 'pb-[env(safe-area-inset-bottom)] sm:pb-0 bg-slate-900' : 'h-[46dvh] sm:h-[580px]'
    }`}>
      {/* Header do Painel (no celular, tocar recolhe/expande) */}
      <div className="relative px-3.5 pt-4 pb-3 sm:p-3.5 bg-slate-900 text-white shrink-0 flex items-center justify-between select-none">
        <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-600" />
        <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer sm:cursor-default" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="w-12 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-inner">
            {selectedLine.lt}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs truncate text-slate-100 flex items-center gap-1.5">
              <span>{origemLinha(selectedLine)}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <span>Destino:</span>
              <span className="text-blue-300 font-medium">
                {destinoLinha(selectedLine)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(selectedLine)}
              className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
            </button>
          )}
          {onSwapDirection && (
            <button
              onClick={onSwapDirection}
              className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inverter Sentido (Ida / Volta)"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar linha"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Status Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-900">{posicoes.length}</span>
              <span className="text-slate-500">
                {posicoes.length === 1 ? 'ônibus operando' : 'ônibus operando'}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{paradas.length} paradas</span>
            </div>
          </div>

          {/* Abas */}
          <div className="flex border-b border-slate-200 text-xs font-semibold bg-white shrink-0">
            <button
              onClick={() => setActiveTab('paradas')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'paradas'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Itinerário & Paradas</span>
            </button>
            <button
              onClick={() => setActiveTab('veiculos')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'veiculos'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Ônibus ({posicoes.length})</span>
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {activeTab === 'paradas' ? (
              paradas.length > 0 ? (
                <div className="space-y-1">
                  {paradas.map((parada, idx) => {
                    const isSelected = selectedStop?.cp === parada.cp;
                    const predictions = stopPredictions[parada.cp] || [];

                    return (
                      <div
                        key={parada.cp || idx}
                        onClick={() => onSelectStop(parada)}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Número da parada */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx + 1}
                          </div>

                          {/* Informações da Parada */}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-slate-900 leading-tight">
                              {parada.np}
                            </h4>
                            {parada.ed && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {parada.ed}
                              </p>
                            )}

                            {/* Estimativas de Chegada (ETA) */}
                            {predictions.length > 0 ? (
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {sortByEta(predictions).slice(0, 3).map((pred, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                                      pIdx === 0
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}
                                    title={`Prefixo ${pred.p} · previsto ${pred.t}`}
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{formatEta(pred.t)}</span>
                                    {pred.a && (
                                      <span title="Veículo com acessibilidade (cadeirante)">♿</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : isSelected && (
                              <p className="text-[10px] text-slate-400 italic mt-1.5 flex items-center gap-1">
                                {stopPrevisaoLoading === parada.cp ? (
                                  <><Loader2 className="w-3 h-3 animate-spin" /> Consultando previsão...</>
                                ) : (
                                  'Nenhum ônibus desta linha a caminho agora.'
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isLoading ? 'Carregando paradas...' : 'Nenhuma parada encontrada para esta linha.'}
                </div>
              )
            ) : (
              /* Aba de Veículos em Operação */
              posicoes.length > 0 ? (
                <div className="space-y-1.5">
                  {posicoes.map((v, idx) => (
                    <div
                      key={v.p || idx}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                          <Bus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">
                              Prefixo: {v.p}
                            </span>
                            {v.a && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded flex items-center gap-0.5">
                                <Accessibility className="w-3 h-3 inline" /> ♿
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Último sinal: {v.ta ? new Date(v.ta).toLocaleTimeString('pt-BR') : 'Tempo Real'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Em Trânsito
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>Nenhum ônibus em circulação detectado nesta linha no momento.</p>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
