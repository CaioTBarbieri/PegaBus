import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import express from 'express';
import app from './app.js';
import { getLanIps, getLocalCertificate } from './services/localCert.js';

// Servidor local: serve o frontend compilado e abre HTTPS para o celular.
// Na Vercel isto não é usado: o frontend é estático e a API roda em api/index.js.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// ==================== ARQUIVOS ESTÁTICOS DO FRONTEND ====================

const distPath = path.join(__dirname, '../frontend/dist');
const noCache = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

app.use((req, res, next) => {
  noCache(res);
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
  noCache(res);
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

// Hospedagem em nuvem (Render define RENDER) já fornece HTTPS
const useLocalHttps = !process.env.RENDER;
const lanIps = useLocalHttps ? getLanIps() : [];

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 PegaBus rodando em http://localhost:${PORT}`);
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
