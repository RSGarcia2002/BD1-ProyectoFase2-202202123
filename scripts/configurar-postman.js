import {existsSync,mkdirSync,copyFileSync} from 'node:fs';
const config=new URL('../postman/.postman/resources.yaml',import.meta.url);
if(!existsSync(config)){
 mkdirSync(new URL('../postman/.postman/',import.meta.url),{recursive:true});
 copyFileSync(new URL('../postman/workspace.example.yaml',import.meta.url),config);
 console.log('Workspace local de Postman configurado para YAML v3.');
}else console.log('Se conserva la configuracion local existente de Postman.');
