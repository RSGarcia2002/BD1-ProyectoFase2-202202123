import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {entities,routes} from '../src/config/entities.js';
const base=process.env.API_BASE_URL||'http://localhost:3002';
const original=JSON.parse(readFileSync(new URL('../datos/dataset-fase1.json',import.meta.url)));
const run=8000000000+(Date.now()%1000000000), evidence=[];
async function api(path,method='GET',body,expected=200){
 const response=await fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();evidence.push({method,path,body,status:response.status,response:data});
 assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);return data;
}
const registered=original.estado_venta.find(x=>x.nombre_es_ven==='REGISTRADA').id_es_ven;
const paid=original.estado_venta.find(x=>x.nombre_es_ven==='PAGADA').id_es_ven;
const firstSale=original.venta[0], store=firstSale.id_ti;
const catalog=original.catalogo_producto.find(c=>c.id_ti===store);
const template={...firstSale,id_es_ven:registered};
const newSale=id=>({...template,id_ven:id});
await api('../health');
// CRUD de todas las tablas. FK protegidas y estados finitos se prueban tambien.
let index=0;
for(const [table,route] of Object.entries(routes)){
 const meta=entities[table],id=run+(++index),row={...original[table][0]};
 for(const k of meta.keys)if(meta.keys.length===1)row[k]=id;
 delete row.subtotal_des_ven;
 if(table==='estado_venta'){
  await api(route,'POST',{...row,nombre_es_ven:'REGISTRADA'},409);
  await api(`${route}/${original[table][0].id_es_ven}`,'PUT',{nombre_es_ven:original[table][0].nombre_es_ven});
  await api(`${route}/${original[table][0].id_es_ven}`,'DELETE',undefined,409);
  await api(`${route}?limit=10`);continue;
 }
 // Identificadores y textos unicos; evita reutilizar personas de clientes/empleados.
 for(const [k,c] of Object.entries(meta.columns))if(c.type==='string'&&k in row){
  if(k==='correo_per')row[k]=`t${id}@example.test`;
  else if(k.startsWith('nombre_'))row[k]=`Prueba ${id}`;
  else if(k==='numero_identificacion')row[k]=String(id);
 }
 if(['cliente','empleado'].includes(table)){
  const p={...original.persona[0],id_per:run+100+index,correo_per:`aux${id}@example.test`};await api('personas','POST',p,201);row.id_per=p.id_per;
 }
 if(table==='catalogo_producto'){
  const p={...original.producto[0],id_pro:run+500};await api('productos','POST',p,201);row.id_pro=p.id_pro;
 }
 if(table==='venta')row.id_es_ven=registered;
 if(table==='desglose_venta'){
  await api('ventas','POST',newSale(run+501),201);
  Object.assign(row,{id_ven:run+501,id_pro:catalog.id_pro,cantidad_des_ven:1,precio_unitario_des_ven:10});
 }
 if(table==='pago'){
  await api('ventas','POST',newSale(run+502),201);
  await api('detalles-venta','POST',{id_ven:run+502,id_pro:catalog.id_pro,cantidad_des_ven:1,precio_unitario_des_ven:10},201);
  Object.assign(row,{id_ven:run+502,monto_pag:2});
 }
 const created=await api(route,'POST',row,201),detail=`${route}/${meta.keys.map(k=>row[k]).join('/')}`;
 assert.ok(created);await api(`${route}?limit=1`);await api(detail);
 const mutable=Object.keys(row).find(k=>!meta.keys.includes(k)&&!meta.columns[k]?.readOnly);
 await api(detail,'PUT',{[mutable]:row[mutable]});
 await api(detail,'DELETE');
 if(table!=='venta')await api(detail,'GET',undefined,404);
 if(['cliente','empleado'].includes(table))await api(`personas/${row.id_per}`,'DELETE');
 if(table==='catalogo_producto')await api(`productos/${run+500}`,'DELETE');
 if(table==='desglose_venta')await api(`ventas/${run+501}`,'DELETE');
 if(table==='pago'){
  await api(`detalles-venta/${run+502}/${catalog.id_pro}`,'DELETE');
  await api(`ventas/${run+502}`,'DELETE');
 }
}
// Fixtures exclusivas para stock, lotes, pagos y concurrencia.
const product=run+700,sale1=run+701,sale2=run+702,sale3=run+703;
await api('productos','POST',{...original.producto[0],id_pro:product,nombre_pro:`Inventario ${run}`},201);
await api('catalogos-producto','POST',{id_ti:store,id_pro:product,precio_vigente_cat_pro:10,existencia_actual_cat_pro:10},201);
for(const id of [sale1,sale2,sale3])await api('ventas','POST',newSale(id),201);
const detail=(id,quantity)=>({id_ven:id,id_pro:product,cantidad_des_ven:quantity,precio_unitario_des_ven:10});
const stock=async()=> (await api(`catalogos-producto/${store}/${product}`)).existencia_actual_cat_pro;
const failure=await api('detalles-venta','POST',detail(sale1,11),400);
assert.equal(failure.error,'Stock insuficiente');assert.equal(await stock(),10);
await api(`detalles-venta/${sale1}/${product}`,'GET',undefined,404);
await api('detalles-venta','POST',[detail(sale1,6),detail(sale2,6)],400);assert.equal(await stock(),10);
await api('detalles-venta','POST',detail(sale1,2),201);assert.equal(await stock(),8);
await api(`detalles-venta/${sale1}/${product}`,'PUT',{cantidad_des_ven:3});assert.equal(await stock(),7);
assert.equal((await api(`ventas/${sale1}`)).total_ven,30);
const pay=(id,amount)=>({id_pag:id,monto_pag:amount,id_met_pag:original.metodo_pago[0].id_met_pag,id_ven:sale1});
await api('pagos','POST',pay(run+710,10),201);assert.equal((await api(`ventas/${sale1}`)).id_es_ven,registered);
await api('pagos','POST',pay(run+711,20),201);assert.equal((await api(`ventas/${sale1}`)).id_es_ven,paid);
await api(`pagos/${run+711}`,'DELETE');assert.equal((await api(`ventas/${sale1}`)).id_es_ven,registered);
await api(`pagos/${run+710}`,'PUT',{monto_pag:35});assert.equal((await api(`ventas/${sale1}`)).id_es_ven,paid);
// Dos POST simultaneos compiten por las siete unidades restantes.
const concurrent=await Promise.all([sale2,sale3].map(id=>fetch(`${base}/api/detalles-venta`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(detail(id,5))}).then(async r=>({sale:id,status:r.status,body:await r.json()}))));
evidence.push({caso:'Compras concurrentes',resultados:concurrent});
assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,400]);assert.equal(await stock(),2);
for(const report of ['ventas-ubicacion','top-productos','saldos-pendientes'])await api(`reportes/${report}`);
const beforeCancel=await stock();await api(`ventas/${sale1}`,'DELETE');assert.equal(await stock(),beforeCancel+3);
await api(`ventas/${sale1}`,'DELETE');assert.equal(await stock(),beforeCancel+3); // Anulacion idempotente.
await api('pagos','POST',pay(run+712,1),400);
await api('paises','POST',{id_pa:run+999,nombre_pa:'X',inyeccion:'DROP TABLE venta'},400);
await api('productos/no-es-id','GET',undefined,400);
const summary={fecha:new Date().toISOString(),resultado:'APROBADO',peticiones:evidence.length,casos:['CRUD 19 tablas','Stock insuficiente y rollback','Lote atomico','Descuento y actualizacion de stock','Abonos parciales y PAGADA','Recuperacion de estado al borrar un pago','Concurrencia sin sobreventa','Tres vistas','Anulacion y devolucion idempotente','Validacion de entradas'],evidencia:evidence};
writeFileSync(new URL('../docs/evidencias/verificacion-api.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(`APROBADO: ${evidence.length} peticiones verificadas. Evidencia en docs/evidencias/verificacion-api.json`);
