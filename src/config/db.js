import 'dotenv/config';
import sql from 'mssql';
const config = {
 server: process.env.DB_SERVER || 'localhost', port: Number(process.env.DB_PORT || 1435),
 database: process.env.DB_NAME || 'ComercialEstrellaFase2', user: process.env.DB_USER || 'estrella_api',
 password: process.env.DB_PASSWORD,
 options: {encrypt: true, trustServerCertificate: true, abortTransactionOnError: true},
 pool: {max: 10, min: 0, idleTimeoutMillis: 30000}, requestTimeout: 60000
};
export const pool = new sql.ConnectionPool(config);
pool.on('error', e => console.error('Conexion SQL:', e.code || e.name));
export {sql};
