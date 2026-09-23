import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import selfsigned from 'selfsigned';

// Certificado autoassinado para servir o app via HTTPS na rede local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, '..', 'certs');
const CERT_FILE = path.join(CERT_DIR, 'cert.json');

// IPv4 da máquina na rede local, com o Wi-Fi primeiro (é por ele que o celular acessa)
export function getLanIps() {
  const isWifi = (name) => /wi-?fi|wlan|wireless/i.test(name);
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, list]) => (list || []).map(i => ({ ...i, name })))
    .filter(i => i.family === 'IPv4' && !i.internal)
    .sort((a, b) => Number(isWifi(b.name)) - Number(isWifi(a.name)))
    .map(i => i.address);
}

/**
 * Retorna { key, cert }. Reaproveita o certificado salvo em certs/cert.json
 * e só gera outro se os IPs da máquina mudarem.
 */
export function getLocalCertificate(ips) {
  const hosts = ['localhost', '127.0.0.1', ...ips].sort();

  try {
    const saved = JSON.parse(fs.readFileSync(CERT_FILE, 'utf8'));
    if (JSON.stringify(saved.hosts) === JSON.stringify(hosts)) {
      return { key: saved.key, cert: saved.cert };
    }
  } catch {
    // ainda não existe: gera abaixo
  }

  const altNames = hosts.map(h =>
    /^\d+\.\d+\.\d+\.\d+$/.test(h) ? { type: 7, ip: h } : { type: 2, value: h }
  );
  const pems = selfsigned.generate([{ name: 'commonName', value: 'PegaBus Local' }], {
    days: 825,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames }]
  });

  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(CERT_FILE, JSON.stringify({ hosts, key: pems.private, cert: pems.cert }));
  return { key: pems.private, cert: pems.cert };
}
