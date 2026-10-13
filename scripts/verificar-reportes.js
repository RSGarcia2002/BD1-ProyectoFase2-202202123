import 'dotenv/config';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.API_BASE_URL||'http://localhost:3002';
async function get(path){const r=await fetch(`${base}/api/${path}`);assert.ok(r.ok);return (await r.json()).data;}
const names=['ventas','detalles-venta','pagos','tiendas','municipios','departamentos','paises','productos','categorias','marcas','estados-venta'];
const all=await Promise.all(names.map(x=>get(`${x}?limit=10000`)));
const [sales,details,payments,stores,towns,depts,countries,products,categories,brands,states]=all;
const by=(arr,key)=>new Map(arr.map(row=>[row[key],row]));
const saleMap=by(sales,'id_ven'),stateMap=by(states,'id_es_ven');
const totals=new Map(),paid=new Map();
for(const d of details)totals.set(d.id_ven,(totals.get(d.id_ven)||0)+Math.round(d.precio_unitario_des_ven*100)*d.cantidad_des_ven);
for(const p of payments)paid.set(p.id_ven,(paid.get(p.id_ven)||0)+Math.round(p.monto_pag*100));
for(const s of sales)assert.equal(Math.round(s.total_ven*100),totals.get(s.id_ven)||0,`Total venta ${s.id_ven}`);
const townMap=by(towns,'id_mun'),deptMap=by(depts,'id_dep'),countryMap=by(countries,'id_pa');
const location=await get('reportes/ventas-ubicacion');assert.equal(location.length,stores.length);
for(const store of stores){
 const valid=sales.filter(s=>s.id_ti===store.id_ti&&stateMap.get(s.id_es_ven).nombre_es_ven!=='ANULADA');
 const r=location.find(r=>r.id_ti===store.id_ti),town=townMap.get(store.id_mun),dept=deptMap.get(town.id_dep);
 assert.equal(r.cantidad_ventas,valid.length);assert.equal(Math.round(r.total_facturado*100),valid.reduce((n,s)=>n+(totals.get(s.id_ven)||0),0));
 assert.equal(r.municipio,town.nombre_mun);assert.equal(r.departamento,dept.nombre_dep);assert.equal(r.pais,countryMap.get(dept.id_pa).nombre_pa);
}
const productTotals=new Map();
for(const d of details){if(stateMap.get(saleMap.get(d.id_ven).id_es_ven).nombre_es_ven==='ANULADA')continue;const t=productTotals.get(d.id_pro)||{qty:0,money:0};t.qty+=d.cantidad_des_ven;t.money+=Math.round(d.precio_unitario_des_ven*100)*d.cantidad_des_ven;productTotals.set(d.id_pro,t);}
const top=await get('reportes/top-productos');assert.equal(top.length,productTotals.size);
const productMap=by(products,'id_pro'),categoryMap=by(categories,'id_cat'),brandMap=by(brands,'id_mar');
for(const r of top){const t=productTotals.get(r.codigo_producto),p=productMap.get(r.codigo_producto);assert.equal(r.unidades_totales_vendidas,t.qty);assert.equal(Math.round(r.monto_total_generado*100),t.money);assert.equal(r.categoria,categoryMap.get(p.id_cat).nombre_cat);assert.equal(r.marca,brandMap.get(p.id_mar).nombre_mar);}
const pending=await get('reportes/saldos-pendientes'),registered=sales.filter(s=>stateMap.get(s.id_es_ven).nombre_es_ven==='REGISTRADA');assert.equal(pending.length,registered.length);
for(const r of pending){assert.equal(stateMap.get(saleMap.get(r.id_ven).id_es_ven).nombre_es_ven,'REGISTRADA');assert.equal(Math.round(r.total_venta*100),totals.get(r.id_ven)||0);assert.equal(Math.round(r.monto_total_pagado*100),paid.get(r.id_ven)||0);assert.equal(Math.round(r.saldo_pendiente*100),(totals.get(r.id_ven)||0)-(paid.get(r.id_ven)||0));}
const result={fecha:new Date().toISOString(),resultado:'APROBADO',ventasRevisadas:sales.length,ubicaciones:location.length,productos:top.length,saldos:pending.length,descripcion:'Totales y resultados de las tres vistas comparados por HTTP contra un calculo independiente en centavos.'};
writeFileSync(new URL('../docs/evidencias/reportes.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
