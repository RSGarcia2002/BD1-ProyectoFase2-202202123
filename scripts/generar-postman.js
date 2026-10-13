import {readFileSync,writeFileSync} from 'node:fs';
const evidence=JSON.parse(readFileSync(new URL('../docs/evidencias/verificacion-api.json',import.meta.url)));
const ids=[...new Set(JSON.stringify(evidence.evidencia).match(/\b8\d{9}\b/g)||[])].map(Number).sort((a,b)=>a-b);
const first=ids[0],vars=new Map(ids.map((id,i)=>[id,`id_${i}`]));
const replace=s=>{for(const [id,name] of vars)s=s.replaceAll(String(id),`{{${name}}}`);return s;};
const requests=[];
for(const e of evidence.evidencia){
 if(e.method)requests.push(e);
 else if(e.caso==='Compras concurrentes'){
  // Runner ejecuta secuencialmente el mismo conflicto de stock. La prueba
  // concurrente real se conserva en verificar-api.js y su evidencia JSON.
  const product=ids.find(id=>e.resultados.some(r=>r.body.id_pro===id));
  const catalog=evidence.evidencia.find(r=>r.method==='POST'&&r.path==='catalogos-producto'&&r.body.id_pro===product);
  for(const r of [...e.resultados].sort((a,b)=>a.status-b.status))requests.push({method:'POST',path:'detalles-venta',body:{id_ven:r.sale,id_pro:product,cantidad_des_ven:5,precio_unitario_des_ven:10},status:r.status,response:r.body});
 }
}
const items=requests.map((e,index)=>{
 const path=e.path==='../health'?'/health':`/api/${e.path}`;
 const tests=[`pm.test('HTTP ${e.status}', () => pm.response.to.have.status(${e.status}));`,"pm.test('Respuesta JSON', () => pm.response.to.be.json);"];
 if(e.response?.error)tests.push(`pm.test('Mensaje esperado', () => pm.expect(pm.response.json().error).to.eql(${JSON.stringify(e.response.error)}));`);
 if(e.method==='GET'&&e.response&&'existencia_actual_cat_pro' in e.response)tests.push(`pm.test('Inventario correcto', () => pm.expect(pm.response.json().existencia_actual_cat_pro).to.eql(${e.response.existencia_actual_cat_pro}));`);
 if(e.method==='GET'&&e.response&&'total_ven' in e.response){
  tests.push(`pm.test('Total calculado en SQL', () => pm.expect(pm.response.json().total_ven).to.eql(${e.response.total_ven}));`);
  tests.push(`pm.test('Estado correcto', () => pm.expect(pm.response.json().id_es_ven).to.eql(${e.response.id_es_ven}));`);
 }
 if(e.status===201&&!Array.isArray(e.body))tests.push("pm.test('Llaves devueltas', () => { const b=JSON.parse(pm.variables.replaceIn(pm.request.body.raw)); const r=pm.response.json(); Object.keys(b).filter(k=>k.startsWith('id_')).forEach(k=>pm.expect(r[k]).to.eql(b[k])); });");
 const item={name:`${String(index+1).padStart(3,'0')} ${e.method} ${replace(e.path)} → ${e.status}`,request:{method:e.method,header:[],url:`{{baseUrl}}${replace(path)}`},event:[{listen:'test',script:{type:'text/javascript',exec:tests}}]};
 if(e.body!==undefined){item.request.header=[{key:'Content-Type',value:'application/json'}];item.request.body={mode:'raw',raw:replace(JSON.stringify(e.body,null,2)),options:{raw:{language:'json'}}};}
 return item;
});
const init=["if (pm.info.requestName.startsWith('001 ')) {"," const base = 8000000000 + (Date.now() % 1000000000);"];
for(const [id,name] of vars)init.push(` pm.collectionVariables.set('${name}', String(base + ${id-first}));`);
init.push('}');
const collection={info:{name:'BD1 Fase 2 - Comercial La Estrella - 202202123',description:'Coleccion reproducible obtenida de las peticiones verificadas contra SQL Server real. Ejecutar completa con Runner en orden, una iteracion. Requiere cargar antes el dataset original. Crea registros de prueba con IDs nuevos; las ventas se eliminan logicamente. La prueba concurrente real se ejecuta con npm run verificar.',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:[{key:'baseUrl',value:'http://localhost:3002'},...Array.from(vars,([id,key])=>({key,value:String(id)}))],event:[{listen:'prerequest',script:{type:'text/javascript',exec:init}}],item:items};
writeFileSync(new URL('../postman/ComercialLaEstrella.postman_collection.json',import.meta.url),JSON.stringify(collection,null,2)+'\n');
writeFileSync(new URL('../postman/Local.postman_environment.json',import.meta.url),JSON.stringify({name:'Comercial La Estrella - Local',values:[{key:'baseUrl',value:'http://localhost:3002',enabled:true}],_postman_variable_scope:'environment'},null,2)+'\n');
console.log(`Coleccion generada: ${items.length} peticiones.`);
