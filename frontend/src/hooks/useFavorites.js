import { useState, useCallback } from 'react';

// Linhas favoritas salvas no próprio aparelho (localStorage)
const STORAGE_KEY = 'pegabus:favoritos';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // navegador sem armazenamento (ex.: aba anônima): mantém só na memória
  }
}

// Cada sentido tem um código (cl) próprio, então o favorito é por linha + sentido
export default function useFavorites() {
  const [favorites, setFavorites] = useState(load);

  const isFavorite = useCallback(
    (linha) => !!linha && favorites.some(f => f.cl === linha.cl),
    [favorites]
  );

  const toggleFavorite = useCallback((linha) => {
    if (!linha) return;
    setFavorites(current => {
      const exists = current.some(f => f.cl === linha.cl);
      const next = exists
        ? current.filter(f => f.cl !== linha.cl)
        : [...current, { cl: linha.cl, lt: linha.lt, tl: linha.tl, sl: linha.sl, tp: linha.tp, ts: linha.ts, lc: linha.lc }];
      save(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
