import {Router} from 'express';
import {entities,routes} from '../config/entities.js';
import {controller,bad} from '../controllers/crud.js';
import {pool,sql} from '../config/db.js';
export const api=Router();
api.get('/',(req,res)=>res.json({name:'Comercial La Estrella',version:'1.0.0',entidades:routes,reportes:['ventas-ubicacion','top-productos','saldos-pendientes']}));
api.get('/productos/:id_pro/inventario',async(req,res)=>{
 const id=Number(req.params.id_pro);if(!Number.isSafeInteger(id)||id<0)throw bad('ID de producto invalido');
 const r=await pool.request().input('id',sql.BigInt,id).query('SELECT * FROM dbo.catalogo_producto WHERE id_pro=@id ORDER BY id_ti');res.json({data:r.recordset});
});
for(const [table,route] of Object.entries(routes)){
 const c=controller(table,entities[table]),path=`/${route}`,detail=path+entities[table].keys.map(k=>`/:${k}`).join('');
 api.get(path,c.list);api.post(path,c.create);api.get(detail,c.get);api.put(detail,c.update);api.delete(detail,c.remove);
}
for(const [route,view,order] of [
 ['ventas-ubicacion','Vista_Ventas_Ubicacion','total_facturado DESC, id_ti'],
 ['top-productos','Vista_Top_Productos','unidades_totales_vendidas DESC, codigo_producto'],
 ['saldos-pendientes','Vista_Saldos_Pendientes','id_ven']
])api.get(`/reportes/${route}`,async(req,res)=>{
 const result=await pool.request().query(`SELECT * FROM dbo.[${view}] ORDER BY ${order}`);
 res.json({data:result.recordset});
});
