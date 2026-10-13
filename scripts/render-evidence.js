import {chromium} from 'playwright';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const dir=new URL('../docs/evidencias/',import.meta.url);
const report=JSON.parse(readFileSync(new URL('postman-newman.json',dir)));
const executions=report.run.executions;
const parse=e=>JSON.parse(Buffer.from(e.response.stream.data||e.response.stream).toString());
const req=e=>e.request.body?.raw?JSON.parse(e.request.body.raw):null;
const find=(method,path,predicate=()=>true)=>executions.find(e=>e.request.method===method&&e.request.url.path.join('/')===`api/${path}`&&predicate(e));
const first=find('POST','detalles-venta',e=>e.response.code===400&&parse(e).error==='Stock insuficiente'&&!Array.isArray(req(e)));
const valid=find('POST','detalles-venta',e=>e.response.code===201&&req(e)?.cantidad_des_ven===2);
const inventory=executions.find(e=>e.request.method==='GET'&&e.request.url.path.join('/').startsWith('api/catalogos-producto/')&&parse(e).existencia_actual_cat_pro===8&&parse(e).id_pro===req(valid).id_pro);
const partial=find('POST','pagos',e=>e.response.code===201&&req(e)?.monto_pag===10);
const complete=find('POST','pagos',e=>e.response.code===201&&req(e)?.monto_pag===20);
const partialSale=executions.slice(executions.indexOf(partial)+1).find(e=>e.request.method==='GET'&&e.request.url.path.join('/').startsWith('api/ventas/')&&parse(e).total_ven===30&&parse(e).id_es_ven===1);
const paidSale=executions.slice(executions.indexOf(complete)+1).find(e=>e.request.method==='GET'&&e.request.url.path.join('/').startsWith('api/ventas/')&&parse(e).total_ven===30&&parse(e).id_es_ven===2);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function card(e){if(!e)throw new Error('Evidencia no encontrada');return `<article><div class="request"><b>${e.request.method}</b> /${e.request.url.path.join('/')} <span>HTTP ${e.response.code}</span></div>${req(e)?`<h3>Solicitud JSON</h3><pre>${escape(JSON.stringify(req(e),null,2))}</pre>`:''}<h3>Respuesta real</h3><pre>${escape(JSON.stringify(parse(e),null,2))}</pre></article>`;}
const blocks=[
 ['01-stock-insuficiente','Stock insuficiente','El trigger rechaza la venta y la API responde HTTP 400.',[first]],
 ['02-descuento-inventario','Descuento automatico de inventario','Dos unidades vendidas: existencias de 10 a 8 en la tienda correspondiente.',[valid,inventory]],
 ['03-pago-parcial','Pago parcial','Un abono de Q10 sobre Q30 conserva la venta REGISTRADA (id 1).',[partial,partialSale]],
 ['04-venta-pagada','Venta PAGADA','El siguiente abono de Q20 completa Q30 y el motor cambia a PAGADA (id 2).',[complete,paidSale]]
];
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
const styles=`body{margin:0;background:#edf2f7;color:#14273e;font:17px -apple-system,BlinkMacSystemFont,Arial,sans-serif}main{max-width:1080px;margin:auto;padding:40px}header{border-top:7px solid #1769aa;padding-top:22px}small{color:#42617c;letter-spacing:1px}h1{font-size:34px;margin:16px 0 12px}p{line-height:1.6}article{background:white;border:1px solid #d0dce7;border-radius:12px;margin-top:22px;padding:24px;box-shadow:0 3px 14px #1f477a0c}.request{font:15px ui-monospace,monospace;background:#e8f1fa;padding:14px;overflow-wrap:anywhere}.request b{color:#11603e}.request span{float:right;font-weight:bold}h3{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#547088;margin:20px 0 8px}pre{font:15px/1.55 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;margin:0;color:#152c42}footer{font-size:13px;color:#506c84;margin-top:24px;border-top:1px solid #c9d7e5;padding-top:18px}.badge{display:inline-block;padding:7px 12px;border-radius:6px;background:#d9eee3;color:#1b5d3a;font-size:14px;font-weight:600}`;
for(const [filename,title,description,cards] of blocks){
 const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>${title}</title><style>${styles}</style><main><header><small>COMERCIAL LA ESTRELLA · BD1 · 202202123</small><h1>${title}</h1><p>${description}</p><div class="badge">Coleccion Postman validada con Newman</div></header>${cards.map(card).join('')}<footer>Captura de informe generado a partir de solicitudes y respuestas reales. Ejecucion: ${report.run.timings.started ? new Date(report.run.timings.started).toLocaleString('es-GT',{timeZone:'America/Guatemala'}):''}. Fuente: postman-newman.json. No representa la interfaz grafica de Postman.</footer></main></html>`;
 writeFileSync(new URL(`${filename}.html`,dir),html);
 await page.setContent(html);await page.screenshot({path:fileURLToPath(new URL(`${filename}.png`,dir)),fullPage:true});
}
await browser.close();
// Resumen compacto para entrega; conserva la evidencia cruda en la carpeta local.
writeFileSync(new URL('postman-resumen.json',dir),JSON.stringify({fecha:new Date(report.run.timings.started).toISOString(),requests:report.run.stats.requests,assertions:report.run.stats.assertions,fallos:report.run.failures},null,2)+'\n');
console.log('Cuatro capturas creadas con respuestas reales de Newman.');
