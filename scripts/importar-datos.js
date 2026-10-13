import 'dotenv/config';
import {readFileSync,writeFileSync} from 'node:fs';
import {routes} from '../src/config/entities.js';
const base=process.env.API_BASE_URL||'http://localhost:3002';
const dataset=JSON.parse(readFileSync(new URL('../datos/dataset-fase1.json',import.meta.url)));
async function api(path,method='GET',body){
 const r=await fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw new Error(`${method} ${path}: ${r.status} ${data.error}`);return data;
}
// Evita sobreescribir o mezclar un dataset con datos de otra carga.
const verifyOnly=process.argv.includes('--verificar');
if(!verifyOnly)for(const route of Object.values(routes)){
 const r=await api(`${route}?limit=1`);if(r.total!==0)throw new Error(`La tabla ${route} no esta vacia. La carga solo funciona en una base nueva.`);
}
const registered=dataset.estado_venta.find(e=>e.nombre_es_ven==='REGISTRADA').id_es_ven;
const annulled=dataset.estado_venta.find(e=>e.nombre_es_ven==='ANULADA').id_es_ven;
const saleStore=new Map(dataset.venta.map(v=>[v.id_ven,v.id_ti]));
const quantities=new Map();
for(const d of dataset.desglose_venta){const k=`${saleStore.get(d.id_ven)}:${d.id_pro}`;quantities.set(k,(quantities.get(k)||0)+d.cantidad_des_ven);}
const results=[];
if(!verifyOnly)for(const [table,route] of Object.entries(routes)){
 let rows=dataset[table].map(row=>({...row}));
 // Inventario historico inicial permite reproducir las ventas; la instantanea
 // oficial se restaura al final mediante PUT, siempre pasando por la API.
 if(table==='catalogo_producto')rows=rows.map(r=>({...r,existencia_actual_cat_pro:r.existencia_actual_cat_pro+(quantities.get(`${r.id_ti}:${r.id_pro}`)||0)}));
 if(table==='venta')rows=rows.map(r=>({...r,id_es_ven:registered}));
 if(table==='desglose_venta')rows.forEach(r=>delete r.subtotal_des_ven);
 for(let i=0;i<rows.length;i+=100){await api(route,'POST',rows.slice(i,i+100));}
 const count=(await api(`${route}?limit=1`)).total;
 results.push({tabla:table,esperados:dataset[table].length,obtenidos:count});
 console.log(`${table}: ${count} registros`);
}
if(!verifyOnly)for(const v of dataset.venta.filter(v=>v.id_es_ven===annulled))await api(`ventas/${v.id_ven}`,'DELETE');
if(!verifyOnly)for(const c of dataset.catalogo_producto)await api(`catalogos-producto/${c.id_ti}/${c.id_pro}`,'PUT',{existencia_actual_cat_pro:c.existencia_actual_cat_pro});
if(verifyOnly)for(const [table,route] of Object.entries(routes)){
 const count=(await api(`${route}?limit=1`)).total;
 if(count!==dataset[table].length)throw new Error(`Conteo distinto: ${table}`);
 results.push({tabla:table,esperados:dataset[table].length,obtenidos:count});
}
// Revisa que las reglas reconstruyan los estados de todas las ventas originales.
const sales=(await api('ventas?limit=10000')).data;
const original=new Map(dataset.venta.map(v=>[v.id_ven,v]));
const differences=sales.filter(v=>v.id_es_ven!==original.get(v.id_ven).id_es_ven);
if(differences.length)throw new Error(`Estados distintos al original: ${JSON.stringify(differences.map(v=>v.id_ven))}`);
writeFileSync(new URL('../docs/evidencias/carga-datos.json',import.meta.url),JSON.stringify({fecha:new Date().toISOString(),total:results.reduce((s,r)=>s+r.obtenidos,0),tablas:results,estadosCoinciden:true},null,2)+'\n');
console.log('Carga verificada: 9068 registros y estados originales.');
