import {app} from './app.js';
import {pool} from './config/db.js';
const port=Number(process.env.PORT||3002);
await pool.connect();
const server=app.listen(port,'0.0.0.0',()=>console.log(`API disponible en http://localhost:${port}/api`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
 server.close(async()=>{await pool.close();process.exit(0);});
 setTimeout(()=>process.exit(1),10000).unref();
});
