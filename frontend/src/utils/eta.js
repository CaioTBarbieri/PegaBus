// Minutos até um horário "HH:MM" (previsão da SPTrans). Retorna null se inválido.
export function minutesUntil(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = Math.round((target - now) / 60000);
  if (diff < -720) diff += 1440; // virou o dia
  return Math.max(diff, 0);
}

// "Chegando", "12 min" ou o texto original se não for um horário
export function formatEta(hhmm) {
  const min = minutesUntil(hhmm);
  if (min === null) return hhmm;
  if (min <= 1) return 'Chegando';
  return `${min} min`;
}

// Ordena veículos pela chegada mais próxima
export const sortByEta = (vs = []) =>
  [...vs].sort((a, b) => (minutesUntil(a.t) ?? 999) - (minutesUntil(b.t) ?? 999));
