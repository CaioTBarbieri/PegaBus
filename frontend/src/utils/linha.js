// Na API Olho Vivo, tp e ts são os LETREIROS da linha em cada sentido:
// no sentido 1 o ônibus mostra tp (é o destino), no sentido 2 mostra ts.
export const destinoLinha = (linha) => (linha?.sl === 2 ? linha.ts : linha?.tp);
export const origemLinha = (linha) => (linha?.sl === 2 ? linha.tp : linha?.ts);

// Na previsão, lt0/lt1 são os mesmos letreiros (tp/ts) da linha
export const destinoPrevisao = (l) => (l?.sl === 2 ? l.lt1 : l?.lt0);
