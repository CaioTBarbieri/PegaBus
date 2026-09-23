/**
 * Sobe o backend e abre um túnel público da Cloudflare (https://xxxx.trycloudflare.com)
 * para acessar o PegaBus pelo celular de qualquer rede, inclusive 4G.
 *
 * Uso: npm run celular
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import qrcode from 'qrcode-terminal';

// Inicia o servidor normalmente
await import('../server.js');

const PORT = process.env.PORT || 3001;

function findCloudflared() {
  const candidates = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'cloudflared', 'cloudflared.exe'),
    path.join(process.env.ProgramFiles || '', 'cloudflared', 'cloudflared.exe')
  ];
  return candidates.find(p => p && fs.existsSync(p)) || 'cloudflared';
}

// --protocol http2: redes como a da FATEC bloqueiam UDP (QUIC, o padrão do cloudflared)
const tunnel = spawn(findCloudflared(), ['tunnel', '--url', `http://localhost:${PORT}`, '--protocol', 'http2', '--no-autoupdate'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Só mostra o link depois que o túnel conectou: se o celular abrir antes,
// o DNS da rede pode guardar "endereço não existe" por alguns minutos.
let url = null;
let connected = false;
let shown = false;
console.log('[Túnel] Conectando à Cloudflare...');

const onOutput = (chunk) => {
  const text = chunk.toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !url) url = match[0];
  if (/Registered tunnel connection/i.test(text)) connected = true;
  if (!url || !connected || shown) return;
  shown = true;
  console.log('\n===============================================');
  console.log('🌍 Link público (celular, 4G, qualquer rede):');
  console.log(`   ${url}`);
  console.log('   Aponte a câmera do celular para o QR Code:\n');
  qrcode.generate(url, { small: true });
  console.log('   O link muda toda vez que o comando é iniciado.');
  console.log('===============================================\n');
};
tunnel.stdout.on('data', onOutput);
tunnel.stderr.on('data', onOutput);

tunnel.on('error', (err) => {
  console.error('[Túnel] Não foi possível iniciar o cloudflared:', err.message);
  console.error('        Instale com: winget install Cloudflare.cloudflared');
});
tunnel.on('exit', (code) => {
  if (code) console.warn(`[Túnel] cloudflared encerrou (código ${code}).`);
});

// Encerra o túnel junto com o servidor
const stop = () => {
  tunnel.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
