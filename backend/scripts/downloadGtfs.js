/**
 * Baixa o GTFS da SPTrans e gera data/gtfs-lines.json (usado no build do deploy, ex.: Vercel).
 *
 * Uso:  node scripts/downloadGtfs.js
 * Fonte: GTFS_URL (padrão: espelho público diário da Mobility Database)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import axios from 'axios';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GTFS_URL = process.env.GTFS_URL || 'https://files.mobilitydatabase.org/mdb-8/latest.zip';
const NEEDED = ['routes.txt', 'trips.txt', 'shapes.txt', 'stop_times.txt', 'stops.txt'];

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pegabus-gtfs-'));

try {
  console.log(`[GTFS] Baixando ${GTFS_URL} ...`);
  const res = await axios.get(GTFS_URL, { responseType: 'arraybuffer', timeout: 120000, maxRedirects: 5 });
  console.log(`[GTFS] ${(res.data.byteLength / 1024 / 1024).toFixed(1)} MB baixados. Extraindo...`);

  const zip = new AdmZip(Buffer.from(res.data));
  for (const name of NEEDED) {
    const entry = zip.getEntries().find(e => path.basename(e.entryName) === name);
    if (!entry) throw new Error(`Arquivo ${name} não encontrado no GTFS`);
    fs.writeFileSync(path.join(tmpDir, name), entry.getData());
  }

  const result = spawnSync(process.execPath, [path.join(__dirname, 'buildGtfs.js'), tmpDir], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('buildGtfs.js falhou');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
