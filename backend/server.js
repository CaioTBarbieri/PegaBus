import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { olhoVivoService } from './services/olhoVivoService.js';
import { getRouteGeometry } from './services/routeGeometryService.js';
import { getGtfsLine, getNearbyStops, getStop } from './services/gtfsService.js';
import { DEMO_LINHAS, DEMO_PARADAS, getDemoPositions, getDemoPrevisao } from './services/demoData.js';
import https from 'https';
import { getLanIps, getLocalCertificate } from './services/localCert.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Estado de modo da aplicação: 'official' (usa a API SPTrans) ou 'demo'
let appMode = process.env.SPTRANS_TOKEN ? 'official' : 'demo';

// Inicializa token do ambiente se presente
if (process.env.SPTRANS_TOKEN) {
  olhoVivoService.setToken(process.env.SPTRANS_TOKEN);
  olhoVivoService.authenticate().catch(err => {
    console.warn('[Server] Falha inicial ao autenticar token do .env, iniciando em modo demo:', err.message);
    appMode = 'demo';
  });
}

// ==================== ROTAS DE AUTENTICAÇÃO E STATUS ====================

app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: olhoVivoService.isAuthenticated,
    mode: appMode,
    hasToken: Boolean(olhoVivoService.getToken())
  });
});

// Rotas que alteram o token/modo: só com o header x-admin-key igual a ADMIN_KEY.
// Sem ADMIN_KEY definida, ficam desativadas (o app é público na internet).
function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && req.get('x-admin-key') === adminKey) return next();
  res.status(403).json({ error: 'Acesso negado.' });
}

app.get('/api/config', (req, res) => {
  res.json({
    cartoApiKey: process.env.CARTO_API_KEY || ''
  });
});

app.post('/api/auth/token', requireAdmin, async (req, res) => {
  const { token, mode } = req.body;
  if (!token && mode !== 'demo') {
    return res.status(400).json({ error: 'Token é obrigatório.' });
  }

  if (mode === 'demo') {
    appMode = 'demo';
    return res.json({ success: true, mode: 'demo', message: 'Modo Demonstração ativado.' });
  }

  try {
    olhoVivoService.setToken(token);
    await olhoVivoService.authenticate(true);
    appMode = 'official';
    res.json({
      success: true,
      mode: 'official',
      message: 'Token SPTrans Olho Vivo autenticado com sucesso!'
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message || 'Erro ao autenticar token na SPTrans.'
    });
  }
});

app.post('/api/auth/toggle-mode', requireAdmin, (req, res) => {
  const { mode } = req.body;
  if (mode === 'demo' || mode === 'official') {
    appMode = mode;
    return res.json({ success: true, mode: appMode });
  }
  appMode = appMode === 'official' ? 'demo' : 'official';
  res.json({ success: true, mode: appMode });
});

// Cache simples de populares oficiais
let cachedPopulares = null;
let lastPopularesFetch = 0;

app.get('/api/linhas/populares', async (req, res) => {
  if (appMode === 'official' && olhoVivoService.isAuthenticated) {
    const ONE_HOUR = 60 * 60 * 1000;
    if (cachedPopulares && (Date.now() - lastPopularesFetch < ONE_HOUR)) {
      return res.json(cachedPopulares);
    }

    try {
      const [l8000, l875H, l107T] = await Promise.all([
        olhoVivoService.buscarLinhas('8000').catch(() => []),
        olhoVivoService.buscarLinhas('875H').catch(() => []),
        olhoVivoService.buscarLinhas('107T').catch(() => [])
      ]);

      const reais = [
        ...(l8000 || []).slice(0, 2),
        ...(l875H || []).slice(0, 2),
        ...(l107T || []).slice(0, 2)
      ];

      if (reais.length > 0) {
        cachedPopulares = reais;
        lastPopularesFetch = Date.now();
        return res.json(reais);
      }
    } catch (e) {
      console.warn('[Server] Falha ao carregar linhas populares da SPTrans:', e.message);
    }
  }

  res.json(DEMO_LINHAS);
});

app.get('/api/linhas/buscar', async (req, res) => {
  const termo = req.query.termo || '';

  if (appMode === 'demo' || !olhoVivoService.isAuthenticated) {
    const termoLower = termo.toLowerCase();
    const filtered = DEMO_LINHAS.filter(l => 
      l.lt.toLowerCase().includes(termoLower) ||
      l.tp.toLowerCase().includes(termoLower) ||
      l.ts.toLowerCase().includes(termoLower)
    );
    return res.json(filtered.length > 0 ? filtered : DEMO_LINHAS);
  }

  try {
    const linhas = await olhoVivoService.buscarLinhas(termo);
    res.json(linhas || []);
  } catch (err) {
    console.error('[API] Erro ao buscar linhas:', err.message);
    res.status(500).json({ error: 'Erro ao consultar linhas na SPTrans', details: err.message });
  }
});

// ==================== ROTAS DE PARADAS E GEOMETRIA ====================

// Dados da linha (lt, tl, sl, tp, ts) vêm na query para localizar a linha no GTFS
const linhaFromQuery = (query) => ({ lt: query.lt, tl: query.tl, sl: query.sl, tp: query.tp, ts: query.ts });

app.get('/api/linhas/:codigo/paradas', async (req, res) => {
  const codigoLinha = req.params.codigo;
  const isDemo = appMode === 'demo' || !olhoVivoService.isAuthenticated;

  if (isDemo && DEMO_PARADAS[codigoLinha]) {
    return res.json(DEMO_PARADAS[codigoLinha]);
  }

  // GTFS da SPTrans: tem as paradas de todas as linhas, ao contrário da Olho Vivo
  const gtfs = getGtfsLine(linhaFromQuery(req.query));
  if (gtfs?.stops?.length) {
    return res.json(gtfs.stops);
  }

  if (isDemo) {
    return res.json(DEMO_PARADAS[33857] || []);
  }

  try {
    const paradas = await olhoVivoService.buscarParadasPorLinha(codigoLinha);
    res.json(paradas || []);
  } catch (err) {
    console.error(`[API] Erro ao buscar paradas da linha ${codigoLinha}:`, err.message);
    // Não usa paradas demo aqui: seriam de outra linha
    res.json([]);
  }
});

app.get('/api/linhas/:codigo/rota', async (req, res) => {
  const codigoLinha = req.params.codigo;
  const isDemo = appMode === 'demo' || !olhoVivoService.isAuthenticated;

  // Traçado oficial do GTFS (shapes.txt), quando disponível
  if (!(isDemo && DEMO_PARADAS[codigoLinha])) {
    const gtfs = getGtfsLine(linhaFromQuery(req.query));
    if (gtfs?.shape?.length > 1) {
      return res.json({ type: 'LineString', coordinates: gtfs.shape });
    }
  }

  try {
    let paradas = [];
    if (isDemo) {
      paradas = DEMO_PARADAS[codigoLinha] || DEMO_PARADAS[33857] || [];
    } else {
      // Sem fallback para paradas demo: desenharia o trajeto de outra linha
      paradas = (await olhoVivoService.buscarParadasPorLinha(codigoLinha)) || [];
    }

    const geometry = await getRouteGeometry(paradas, codigoLinha);
    res.json(geometry);
  } catch (err) {
    console.error(`[API] Erro ao gerar geometria para linha ${codigoLinha}:`, err.message);
    res.status(500).json({ error: 'Erro ao calcular traçado da rota' });
  }
});

// ==================== ROTAS DE POSIÇÃO DOS ÔNIBUS ====================

app.get('/api/linhas/:codigo/posicoes', async (req, res) => {
  const codigoLinha = req.params.codigo;

  if (appMode === 'demo' || !olhoVivoService.isAuthenticated) {
    return res.json(getDemoPositions(codigoLinha));
  }

  try {
    const posicoes = await olhoVivoService.obterPosicoesLinha(codigoLinha);
    res.json(posicoes || { hr: '', vs: [] });
  } catch (err) {
    console.error(`[API] Erro ao buscar posições da linha ${codigoLinha}:`, err.message);
    res.json(getDemoPositions(codigoLinha));
  }
});

// ==================== ROTAS DE PREVISÃO DE CHEGADA ====================

app.get('/api/linhas/:codigo/previsao', async (req, res) => {
  const codigoLinha = req.params.codigo;

  if (appMode === 'demo' || !olhoVivoService.isAuthenticated) {
    return res.json(getDemoPrevisao(codigoLinha));
  }

  try {
    const previsao = await olhoVivoService.obterPrevisaoLinha(codigoLinha);
    res.json(previsao || {});
  } catch (err) {
    console.error(`[API] Erro ao buscar previsão da linha ${codigoLinha}:`, err.message);
    res.json(getDemoPrevisao(codigoLinha));
  }
});

// Paradas próximas a uma coordenada (a partir do GTFS)
app.get('/api/paradas/proximas', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const raio = Math.min(parseInt(req.query.raio, 10) || 500, 1500);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Parâmetros lat e lng são obrigatórios' });
  }

  res.json(getNearbyStops(lat, lng, raio));
});

app.get('/api/paradas/:codigo/previsao', async (req, res) => {
  const codigoParada = req.params.codigo;

  if (appMode === 'demo' || !olhoVivoService.isAuthenticated) {
    // Previsão simulada com as linhas que realmente passam na parada (GTFS)
    const stop = getStop(codigoParada);
    const agora = new Date();
    const horario = (min) =>
      new Date(agora.getTime() + min * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const linhas = (stop?.linhas || [{ lt: '8000', tl: '10', destino: 'Terminal Lapa' }]).slice(0, 6);

    return res.json({
      hr: horario(0),
      p: {
        cp: Number(codigoParada),
        np: stop?.np || 'Parada Selecionada',
        py: stop?.py,
        px: stop?.px,
        l: linhas.map((l, i) => ({
          c: `${l.lt}-${l.tl}`,
          cl: 0,
          sl: 1,
          // lt0/lt1 = letreiros tp/ts; no sentido 1 o destino é lt0
          lt0: l.destino,
          lt1: '',
          qv: 2,
          vs: [3 + i * 4, 15 + i * 5].map((min, j) => ({
            p: `${l.lt.replace(/\D/g, '').slice(0, 3)}${i}${j}`,
            t: horario(min),
            a: j === 0,
            py: stop ? stop.py + 0.004 * (j + 1) * (i % 2 ? 1 : -1) : undefined,
            px: stop ? stop.px + 0.003 * (j + 1) : undefined
          }))
        }))
      }
    });
  }

  try {
    const previsao = await olhoVivoService.obterPrevisaoParada(codigoParada);
    res.json(previsao || {});
  } catch (err) {
    console.error(`[API] Erro ao buscar previsão da parada ${codigoParada}:`, err.message);
    res.status(500).json({ error: 'Erro ao consultar previsão da parada' });
  }
});

// ==================== ARQUIVOS ESTÁTICOS DO FRONTEND ====================

const distPath = path.join(__dirname, '../frontend/dist');

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(distPath, {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
// Na nuvem (Render define RENDER) o HTTPS é fornecido pela plataforma
const useLocalHttps = !process.env.RENDER;
const lanIps = useLocalHttps ? getLanIps() : [];

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 PegaBus rodando em http://localhost:${PORT}`);
  console.log(`📡 Modo ativo: ${appMode.toUpperCase()}`);
  console.log(`===============================================`);
});

// HTTPS para acessar pelo celular na mesma rede Wi-Fi:
// o navegador só libera a localização (GPS) em páginas https.
if (useLocalHttps) try {
  https.createServer(getLocalCertificate(lanIps), app).listen(HTTPS_PORT, () => {
    console.log(`📱 No celular (mesmo Wi-Fi), abra:`);
    lanIps.forEach((ip, i) => console.log(`   https://${ip}:${HTTPS_PORT}${i === 0 && lanIps.length > 1 ? '  ← normalmente este' : ''}`));
    console.log(`   (aceite o aviso de certificado na primeira vez)`);
    console.log(`===============================================`);
  });
} catch (err) {
  console.warn('[HTTPS] Não foi possível iniciar o servidor HTTPS:', err.message);
}
