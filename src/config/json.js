import {entities} from './entities.js';
// Tedious entrega BIGINT como texto. Los NUMBER(10) del modelo caben sin
// perdida en enteros seguros de JavaScript; no convertir telefonos ni documentos.
const integerFields=new Set(Object.values(entities).flatMap(e=>Object.entries(e.columns).filter(([,c])=>c.type==='integer').map(([k])=>k)));
for(const k of ['cantidad_ventas','unidades_totales_vendidas','codigo_producto'])integerFields.add(k);
export function normalizeJSON(value){
 if(Array.isArray(value))return value.map(normalizeJSON);
 if(value&&typeof value==='object'&&!(value instanceof Date))return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,integerFields.has(k)&&typeof v==='string'&&/^-?\d+$/.test(v)&&Number.isSafeInteger(Number(v))?Number(v):normalizeJSON(v)]));
 return value;
}
