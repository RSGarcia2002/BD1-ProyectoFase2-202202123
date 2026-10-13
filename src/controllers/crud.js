import {pool,sql} from '../config/db.js';
export function bad(message,status=400){return Object.assign(new Error(message),{status});}
export function validateValue(name,value,c){
 if(value===null){if(c.required)throw bad(`${name} no puede ser nulo`);return null;}
 if(c.type==='string'){
  if(typeof value!=='string'||!value.trim()||value.length>c.maxLength)throw bad(`${name} debe ser texto no vacio de hasta ${c.maxLength} caracteres`);
 }else if(c.type==='integer'){
  if(!Number.isSafeInteger(value)||value<0||value>9999999999)throw bad(`${name} debe ser un entero entre 0 y 9999999999`);
 }else if(c.type==='decimal'){
  const number=typeof value==='string'&&/^-?\d+(\.\d{1,2})?$/.test(value)?Number(value):value;
  if(typeof number!=='number'||!Number.isFinite(number)||Math.abs(number)>=10**(c.precision-c.scale)||Math.abs(number*100-Math.round(number*100))>0.0001)throw bad(`${name} debe ser un decimal valido de hasta dos decimales`);
  return number;
 }else if(c.type==='date'){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$/.test(value))throw bad(`${name} debe usar YYYY-MM-DD o fecha ISO`);
  const d=new Date(value.length===10?`${value}T00:00:00Z`:value.endsWith('Z')?value:`${value}Z`);
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value.slice(0,10)||d.getUTCFullYear()<1)throw bad(`${name} contiene una fecha invalida`);
  return d;
 }
 return value;
}
export function validateBody(body,meta,creating=false){
 if(!body||Array.isArray(body)||typeof body!=='object')throw bad('Se espera un objeto JSON');
 const result={};
 for(const [name,value] of Object.entries(body)){
  const c=meta.columns[name];
  if(!c)throw bad(`Campo desconocido: ${name}`);
  if(c.readOnly){
   if(name==='subtotal_des_ven')continue;
   throw bad(`${name} es calculado por SQL Server`);
  }
  if(!creating&&meta.keys.includes(name))throw bad(`La llave ${name} no se puede modificar`);
  result[name]=validateValue(name,value,c);
 }
 if(creating)for(const [name,c] of Object.entries(meta.columns)){
  if(c.readOnly)continue;
  if(!(name in result)){if(c.required)throw bad(`Falta el campo ${name}`);result[name]=null;}
 }
 if('subtotal_des_ven' in body){
  if(body.cantidad_des_ven===undefined||body.precio_unitario_des_ven===undefined)throw bad('Para validar subtotal incluye cantidad y precio');
  if(Math.abs(Number(body.subtotal_des_ven)-Number(body.cantidad_des_ven)*Number(body.precio_unitario_des_ven))>0.005||!Number.isFinite(Number(body.subtotal_des_ven)))throw bad('subtotal_des_ven no coincide con cantidad por precio');
 }
 if(!Object.keys(result).length)throw bad('No hay campos modificables');
 return result;
}
function type(c){return c.type==='integer'?sql.BigInt:c.type==='decimal'?sql.Decimal(c.precision,c.scale):c.type==='date'?sql.DateTime2:sql.NVarChar(c.maxLength);}
function bind(request,name,value,c){request.input(name,type(c),value);return `@${name}`;}
function whereKeys(request,meta,params,prefix='k'){
 return meta.keys.map((k,i)=>`[${k}]=${bind(request,`${prefix}${i}`,validateValue(k,Number(params[k]),meta.columns[k]),meta.columns[k])}`).join(' AND ');
}
export function controller(table,meta){
 const target=`dbo.[${table}]`;
 return {
  list:async(req,res)=>{
   const limit=Number(req.query.limit??100),offset=Number(req.query.offset??0);
   if(!Number.isInteger(limit)||limit<1||limit>10000||!Number.isInteger(offset)||offset<0)throw bad('limit debe estar entre 1 y 10000; offset debe ser un entero no negativo');
   const r=await pool.request().input('limit',sql.Int,limit).input('offset',sql.Int,offset).query(`SELECT * FROM ${target} ORDER BY ${meta.keys.map(k=>`[${k}]`).join(',')} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY; SELECT COUNT_BIG(*) AS total FROM ${target};`);
   res.json({data:r.recordsets[0],total:Number(r.recordsets[1][0].total),limit,offset});
  },
  get:async(req,res)=>{
   const r=pool.request(),w=whereKeys(r,meta,req.params);
   const result=await r.query(`SELECT * FROM ${target} WHERE ${w}`);
   if(!result.recordset.length)throw bad('Registro no encontrado',404);
   res.json(result.recordset[0]);
  },
  create:async(req,res)=>{
   const many=Array.isArray(req.body),rows=many?req.body:[req.body];
   if(!rows.length||rows.length>10000)throw bad('El lote debe contener entre 1 y 10000 registros');
   const validated=rows.map(row=>validateBody(row,meta,true));
   const columns=Object.keys(validated[0]);
   const tx=new sql.Transaction(pool);await tx.begin();let committed=false;
   try{
    const result=[];
    for(let i=0;i<validated.length;i+=50){
     const chunk=validated.slice(i,i+50),request=new sql.Request(tx);
     const values=chunk.map((row,j)=>`(${columns.map((c,k)=>bind(request,`p${j}_${k}`,row[c],meta.columns[c])).join(',')})`);
     const filter=chunk.map((row,j)=>`(${meta.keys.map(k=>`[${k}]=@p${j}_${columns.indexOf(k)}`).join(' AND ')})`).join(' OR ');
     const r=await request.query(`INSERT INTO ${target} (${columns.map(c=>`[${c}]`).join(',')}) VALUES ${values.join(',')}; SELECT * FROM ${target} WHERE ${filter} ORDER BY ${meta.keys.map(k=>`[${k}]`).join(',')};`);
     result.push(...r.recordset);
    }
    await tx.commit();committed=true;res.status(201).json(many?{data:result,count:result.length}:result[0]);
   }catch(e){if(!committed)await tx.rollback().catch(()=>{});throw e;}
  },
  update:async(req,res)=>{
   const row=validateBody(req.body,meta),r=pool.request(),w=whereKeys(r,meta,req.params);
   const set=Object.entries(row).map(([k,v],i)=>`[${k}]=${bind(r,`p${i}`,v,meta.columns[k])}`).join(',');
   const result=await r.query(`UPDATE ${target} SET ${set} WHERE ${w}; SELECT * FROM ${target} WHERE ${w};`);
   if(!result.recordset.length)throw bad('Registro no encontrado',404);res.json(result.recordset[0]);
  },
  remove:async(req,res)=>{
   const r=pool.request(),w=whereKeys(r,meta,req.params);
   const query=table==='venta'?`UPDATE ${target} SET id_es_ven=(SELECT id_es_ven FROM dbo.estado_venta WHERE nombre_es_ven='ANULADA') WHERE ${w}; SELECT @@ROWCOUNT AS afectados;`:`DELETE FROM ${target} WHERE ${w}; SELECT @@ROWCOUNT AS afectados;`;
   const result=await r.query(query);
   if(!result.recordset[0].afectados)throw bad('Registro no encontrado',404);
   res.json({message:table==='venta'?'Venta ANULADA; inventario restituido':'Registro eliminado'});
  }
 };
}
