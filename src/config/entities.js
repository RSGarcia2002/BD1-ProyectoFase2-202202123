import {readFileSync} from 'node:fs';
export const entities = JSON.parse(readFileSync(new URL('./entities.json', import.meta.url)));
export const routes = {
 pais:'paises', departamento:'departamentos', municipio:'municipios', tipo_tienda:'tipos-tienda',
 tipo_identificacion:'tipos-identificacion', cargo:'cargos', categoria:'categorias', marca:'marcas',
 estado_venta:'estados-venta', metodo_pago:'metodos-pago', persona:'personas', tienda:'tiendas',
 empleado:'empleados', cliente:'clientes', producto:'productos', catalogo_producto:'catalogos-producto',
 venta:'ventas', desglose_venta:'detalles-venta', pago:'pagos'
};
