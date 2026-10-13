#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"
node scripts/configurar-env.js
if command -v colima >/dev/null 2>&1 && docker context inspect colima-bd1-fase2 >/dev/null 2>&1; then
  colima start --profile bd1-fase2 --activate=false
fi
npm ci --no-audit --no-fund
./scripts/compose.sh up -d --build
node --input-type=module - <<'JS'
import 'dotenv/config';
const base=process.env.API_BASE_URL||'http://localhost:3002';
for(let i=0;i<60;i++){
 try{if((await fetch(`${base}/health`)).ok)process.exit(0);}catch{}
 await new Promise(r=>setTimeout(r,1000));
}
throw new Error('La API no respondio en 60 segundos');
JS
node --input-type=module - <<'JS'
import 'dotenv/config';
import {spawnSync} from 'node:child_process';
const base=process.env.API_BASE_URL||'http://localhost:3002';
const r=await fetch(`${base}/api/paises?limit=1`);if(!r.ok)throw new Error('No se pudo verificar la carga');
if((await r.json()).total===0){const p=spawnSync(process.execPath,['scripts/importar-datos.js'],{stdio:'inherit'});process.exit(p.status??1);}
console.log('La base ya tiene datos; se conserva su contenido.');
JS
echo 'API: http://localhost:3002/api'
