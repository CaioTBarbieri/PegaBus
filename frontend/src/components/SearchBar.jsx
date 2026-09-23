import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowRight, BusFront, Star, LocateFixed } from 'lucide-react';
import { searchLines } from '../services/api';
import { origemLinha, destinoLinha } from '../utils/linha';

export default function SearchBar({
  onSelectLine,
  selectedLine,
  onNearby,
  nearbyActive = false,
  favorites = [],
  isFavorite = () => false,
  onToggleFavorite
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Linha fechada: limpa o texto que mostrava a linha escolhida
  useEffect(() => {
    if (!selectedLine) {
      setQuery('');
      setResults([]);
    }
  }, [selectedLine]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchLines(query.trim());
        setResults(data || []);
        // Não reabre aqui: quem abre a lista é a digitação (onChange). Assim, preencher o
        // campo ao escolher uma linha não faz a lista reaparecer sozinha.
      } catch (err) {
        console.error('Erro na busca de linhas:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (linha) => {
    onSelectLine(linha);
    setIsOpen(false);
    setQuery(`${linha.lt}-${linha.tl || 10} ${destinoLinha(linha)}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={dropdownRef}>
      {/* Search Input Box */}
      <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <div className="pl-4 text-slate-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Busque por número da linha ou destino (ex: 8000, Lapa, Paulista)..."
          className="w-full py-3.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none rounded-2xl"
        />

        {query && (
          <button
            onClick={handleClear}
            className="p-2 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {onNearby && (
          <button
            onClick={() => { setIsOpen(false); onNearby(); }}
            className={`mr-2 shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              nearbyActive
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            title="Ver paradas e ônibus perto de mim"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Perto de mim</span>
          </button>
        )}
      </div>

      {/* Linhas favoritas */}
      {!query && !isOpen && (
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            Favoritos:
          </span>
          {favorites.length > 0 ? (
            favorites.map((linha) => {
              const isActive = selectedLine?.cl === linha.cl;
              return (
                <button
                  key={linha.cl}
                  onClick={() => handleSelect(linha)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm border transition-all shadow-sm shrink-0 ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white/90 border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/80 text-slate-700'
                  }`}
                  title={`${linha.lt}-${linha.tl} ${origemLinha(linha)} ➔ ${destinoLinha(linha)}`}
                >
                  <span className={`font-bold ${isActive ? 'text-white' : 'text-blue-600'}`}>{linha.lt}</span>
                  <span className="truncate max-w-[120px]">{destinoLinha(linha)}</span>
                </button>
              );
            })
          ) : (
            <span className="text-[11px] text-slate-500 bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-full px-2.5 py-1 shadow-sm shrink-0">
              Toque na <Star className="w-3 h-3 inline -mt-0.5 text-amber-500" /> de uma linha para salvar aqui
            </span>
          )}
        </div>
      )}

      {/* Resultados da Pesquisa Dropdown */}
      {isOpen && (results.length > 0 || (query.trim().length > 1 && !isLoading)) && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Linhas encontradas ({results.length})</span>
                <span className="text-[10px] text-slate-400">Clique para rastrear</span>
              </div>
              {results.map((linha) => (
                <div key={`${linha.cl}-${linha.sl}`} className="flex items-center hover:bg-blue-50/60 transition-colors">
                <button
                  onClick={() => handleSelect(linha)}
                  className="flex-1 min-w-0 pl-4 pr-1 py-3 text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-blue-500/20">
                      {linha.lt}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">
                        Para {destinoLinha(linha)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-[10px] truncate">
                          Saindo de {origemLinha(linha)}
                        </span>
                        {linha.lc && (
                          <span className="text-amber-600 font-medium text-[10px]">Circular</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(linha)}
                    className="p-3 mr-1 rounded-full hover:bg-amber-50 transition-colors shrink-0"
                    title={isFavorite(linha) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star className={`w-4 h-4 ${isFavorite(linha) ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
                  </button>
                )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">
              <BusFront className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>Nenhuma linha encontrada para "{query}".</p>
              <p className="text-xs text-slate-400 mt-1">Tente buscar apenas pelo número ou pelo bairro principal.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
