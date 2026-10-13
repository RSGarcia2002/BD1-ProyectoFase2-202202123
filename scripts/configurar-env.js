import {existsSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const path=new URL('../.env',import.meta.url);
if(!existsSync(path)){
 let text=readFileSync(new URL('../.env.example',import.meta.url),'utf8');
 for(const [template,prefix] of [['CambiaSa_2026!','Sa9!'],['CambiaApi_2026!','Api9!'],['CambiaLectura_2026!','Read9!']])text=text.replace(template,prefix+randomBytes(16).toString('hex'));
 writeFileSync(path,text);chmodSync(path,0o600);console.log('.env creado con claves aleatorias.');
}else console.log('Se conserva el archivo .env existente.');
