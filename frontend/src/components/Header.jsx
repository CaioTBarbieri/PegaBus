import React from 'react';
import { Bus, RefreshCw, Sparkles } from 'lucide-react';

export default function Header({ 
  authStatus, 
  onOpenSettings, 
  isRefreshing, 
  onManualRefresh, 
  lastUpdated 
}) {
  const isOfficial = authStatus?.mode === 'official' && authStatus?.authenticated;

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 sm:py-3 flex items-center justify-between shadow-sm z-30 relative select-none">
      {/* Logo & App Name */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
          <Bus className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 leading-none">
              Pega<span className="text-blue-600">Bus</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              SPTrans
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Rastreamento e itinerários em tempo real
          </p>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mode Badge Indicator */}
        <div
          title={isOfficial ? 'SPTrans Ao Vivo' : 'Modo Demonstração'}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
            isOfficial
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isOfficial ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="sm:hidden">Ao vivo</span>
              <span className="hidden sm:inline">SPTrans Ao Vivo</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Modo Demonstração</span>
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors border border-slate-200 ${
            isRefreshing ? 'animate-spin text-blue-600' : ''
          }`}
          title={lastUpdated ? `Última atualização: ${lastUpdated}. Clique para atualizar agora.` : 'Atualizar posições'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
