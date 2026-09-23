import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000
});

export const getAuthStatus = async () => {
  const res = await api.get('/auth/status');
  return res.data;
};

export const getConfig = async () => {
  const res = await api.get('/config');
  return res.data;
};

export const updateToken = async (token, mode = 'official') => {
  const res = await api.post('/auth/token', { token, mode });
  return res.data;
};

export const toggleMode = async (mode) => {
  const res = await api.post('/auth/toggle-mode', { mode });
  return res.data;
};

export const getPopularLines = async () => {
  const res = await api.get('/linhas/populares');
  return res.data;
};

export const searchLines = async (termo) => {
  const res = await api.get('/linhas/buscar', {
    params: { termo }
  });
  return res.data;
};

// Dados que o backend usa para achar a linha no GTFS (letreiro, tipo, sentido e terminais)
const lineParams = (linha) => ({
  lt: linha.lt,
  tl: linha.tl,
  sl: linha.sl,
  tp: linha.tp,
  ts: linha.ts
});

export const getLineStops = async (linha) => {
  const res = await api.get(`/linhas/${linha.cl}/paradas`, { params: lineParams(linha) });
  return res.data;
};

export const getLinePositions = async (codigoLinha) => {
  const res = await api.get(`/linhas/${codigoLinha}/posicoes`);
  return res.data;
};

export const getLineRoute = async (linha) => {
  const res = await api.get(`/linhas/${linha.cl}/rota`, { params: lineParams(linha) });
  return res.data;
};

export const getLinePrevisao = async (codigoLinha) => {
  const res = await api.get(`/linhas/${codigoLinha}/previsao`);
  return res.data;
};

export const getNearbyStops = async (lat, lng, raio = 500) => {
  const res = await api.get('/paradas/proximas', { params: { lat, lng, raio } });
  return res.data;
};

export const getStopPrevisao = async (codigoParada) => {
  const res = await api.get(`/paradas/${codigoParada}/previsao`);
  return res.data;
};

export default api;
