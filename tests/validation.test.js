import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {validateBody,validateValue} from '../src/controllers/crud.js';
import {entities} from '../src/config/entities.js';
import {pool} from '../src/config/db.js';
after(()=>pool.close());
test('Rechaza campos desconocidos y llaves en PUT',()=>{
 assert.throws(()=>validateBody({id_pa:1,nombre_pa:'GT',sql:'DROP TABLE pais'},entities.pais,true),/Campo desconocido/);
 assert.throws(()=>validateBody({id_pa:2},entities.pais),/llave/);
});
test('Rechaza fechas imposibles y valores fuera del dominio',()=>{
 assert.throws(()=>validateValue('fecha','2026-02-30',{type:'date',required:true}),/invalida/);
 assert.throws(()=>validateValue('id',1.2,{type:'integer',required:true}),/entero/);
 assert.throws(()=>validateValue('nombre','',{type:'string',maxLength:50}),/no vacio/);
 assert.throws(()=>validateValue('monto',1.001,{type:'decimal',precision:14,scale:2}),/decimal/);
});
test('Exige los campos obligatorios y preserva columnas opcionales',()=>{
 assert.throws(()=>validateBody({id_pa:1},entities.pais,true),/Falta/);
 const value=validateBody({id_per:1,nombre_per:'A',apellido_per:'B',telefono:'1',direccion_per:'Zona 1',id_mun:1},entities.persona,true);
 assert.equal(value.correo_per,null);
});
test('No permite alterar totales calculados y comprueba subtotal recibido',()=>{
 assert.throws(()=>validateBody({total_ven:20},entities.venta),/calculado/);
 assert.throws(()=>validateBody({id_ven:1,id_pro:1,cantidad_des_ven:2,precio_unitario_des_ven:10,subtotal_des_ven:99},entities.desglose_venta,true),/no coincide/);
 const value=validateBody({id_ven:1,id_pro:1,cantidad_des_ven:2,precio_unitario_des_ven:10,subtotal_des_ven:20},entities.desglose_venta,true);
 assert.equal(value.subtotal_des_ven,undefined);
});
test('BIGINT se devuelve como numero sin alterar telefonos',async()=>{
 const {normalizeJSON}=await import('../src/config/json.js');
 assert.deepEqual(normalizeJSON({id_per:'8855624450',telefono:'50212345678',numero_identificacion:'202202123'}),{id_per:8855624450,telefono:'50212345678',numero_identificacion:'202202123'});
 assert.equal(normalizeJSON({unidades_totales_vendidas:'9007199254740992'}).unidades_totales_vendidas,'9007199254740992');
});
