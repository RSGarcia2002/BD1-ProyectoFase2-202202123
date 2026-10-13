import express from 'express';
import {normalizeJSON} from './config/json.js';
import {api} from './routes/api.js';
import {pool} from './config/db.js';
export const app=express();
app.disable('x-powered-by');
app.use((req,res,next)=>{const json=res.json.bind(res);res.json=value=>json(normalizeJSON(value));next();});
app.use(express.json({limit:'20mb'}));
app.get('/health',async(req,res)=>{await pool.request().query('SELECT 1 AS ok');res.json({status:'ok',database:'ComercialEstrellaFase2'});});
app.use('/api',api);
app.use((req,res)=>res.status(404).json({error:'Ruta no encontrada'}));
app.use((err,req,res,next)=>{
 const details=[err,...(err.precedingErrors||[]),err.originalError?.info].filter(Boolean);
 const business=details.find(e=>Number(e.number)>=51000&&Number(e.number)<52000);
 let status=err.status||500,message=err.message;
 if(business){status=400;message=business.message;}
 else if(details.some(e=>[2601,2627].includes(Number(e.number)))){status=409;message='Ya existe un registro con esa llave o valor unico';}
 else if(details.some(e=>Number(e.number)===547)){status=409;message='La operacion viola una relacion o restriccion de la base de datos';}
 else if(details.some(e=>Number(e.number)===1205)){status=409;message='Conflicto de transacciones; vuelve a intentar';}
 else if(details.some(e=>[515,8115,8152,2628,241,242].includes(Number(e.number)))){status=400;message='Datos invalidos para la base de datos';}
 else if(err.type==='entity.parse.failed'){status=400;message='JSON invalido';}
 else if(err.type==='entity.too.large'){status=413;message='La solicitud excede 20 MB';}
 if(status>=500){console.error('Error:',err.code||err.name,err.number||'');message='No se pudo completar la operacion';}
 res.status(status).json({error:message});
});
