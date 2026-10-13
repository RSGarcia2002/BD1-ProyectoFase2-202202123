# Guia de API

Base: `http://localhost:3002/api`. Todos los cuerpos son JSON. Listas paginadas con `limit` y `offset`.

## Entidades y llaves

| Tabla | Ruta | Llave |
|---|---|---|
| `pais` | `/paises` | `id_pa` |
| `departamento` | `/departamentos` | `id_dep` |
| `municipio` | `/municipios` | `id_mun` |
| `tipo_tienda` | `/tipos-tienda` | `id_tip_tie` |
| `tipo_identificacion` | `/tipos-identificacion` | `id_tip_ide` |
| `cargo` | `/cargos` | `id_car` |
| `categoria` | `/categorias` | `id_cat` |
| `marca` | `/marcas` | `id_mar` |
| `estado_venta` | `/estados-venta` | `id_es_ven` |
| `metodo_pago` | `/metodos-pago` | `id_met_pag` |
| `persona` | `/personas` | `id_per` |
| `tienda` | `/tiendas` | `id_ti` |
| `empleado` | `/empleados` | `id_emp` |
| `cliente` | `/clientes` | `id_cli` |
| `producto` | `/productos` | `id_pro` |
| `catalogo_producto` | `/catalogos-producto` | `id_ti`, `id_pro` |
| `venta` | `/ventas` | `id_ven` |
| `desglose_venta` | `/detalles-venta` | `id_ven`, `id_pro` |
| `pago` | `/pagos` | `id_pag` |

Cada ruta tiene GET de lista, POST, GET por llave, PUT por llave y DELETE por llave.

## Ejemplos de cuerpos para POST

Estos ejemplos representan registros originales; para crear nuevos registros cambia sus llaves y campos unicos. Las llaves foraneas deben existir previamente. Los IDs de estados se consultan en `/estados-venta`; no asumas IDs distintos al dataset.

### POST /paises

```json
{
  "id_pa": 1,
  "nombre_pa": "Guatemala"
}
```

Obligatorios: `id_pa`, `nombre_pa`.

### POST /departamentos

```json
{
  "id_dep": 1,
  "nombre_dep": "Guatemala",
  "id_pa": 1
}
```

Obligatorios: `id_dep`, `nombre_dep`, `id_pa`.

### POST /municipios

```json
{
  "id_mun": 1,
  "nombre_mun": "Guatemala",
  "id_dep": 1
}
```

Obligatorios: `id_mun`, `nombre_mun`, `id_dep`.

### POST /tipos-tienda

```json
{
  "id_tip_tie": 1,
  "nombre_tip_tie": "Tienda de conveniencia"
}
```

Obligatorios: `id_tip_tie`, `nombre_tip_tie`.

### POST /tipos-identificacion

```json
{
  "id_tip_ide": 1,
  "nombre_tip_ide": "DPI"
}
```

Obligatorios: `id_tip_ide`, `nombre_tip_ide`.

### POST /cargos

```json
{
  "id_car": 1,
  "nombre_car": "Gerente de tienda"
}
```

Obligatorios: `id_car`, `nombre_car`.

### POST /categorias

```json
{
  "id_cat": 1,
  "nombre_cat": "Bebidas"
}
```

Obligatorios: `id_cat`, `nombre_cat`.

### POST /marcas

```json
{
  "id_mar": 1,
  "nombre_mar": "Norteña"
}
```

Obligatorios: `id_mar`, `nombre_mar`.

### POST /estados-venta

```json
{
  "id_es_ven": 1,
  "nombre_es_ven": "REGISTRADA"
}
```

Obligatorios: `id_es_ven`, `nombre_es_ven`.

### POST /metodos-pago

```json
{
  "id_met_pag": 1,
  "nombre_met_pag": "Efectivo"
}
```

Obligatorios: `id_met_pag`, `nombre_met_pag`.

### POST /personas

```json
{
  "id_per": 1,
  "nombre_per": "Cristina",
  "apellido_per": "Garcia",
  "telefono": "59398441",
  "correo_per": "cristina.garcia@correo.com",
  "direccion_per": "13 Calle 3-74 zona 4",
  "id_mun": 41
}
```

Obligatorios: `id_per`, `nombre_per`, `apellido_per`, `telefono`, `direccion_per`, `id_mun`.

### POST /tiendas

```json
{
  "id_ti": 1,
  "nombre_ti": "Comercial La Estrella Zona 1",
  "direccion_ti": "18 Avenida 7-38 zona 15",
  "telefono_ti": "24335942",
  "id_mun": 41,
  "id_tip_tie": 1
}
```

Obligatorios: `id_ti`, `nombre_ti`, `direccion_ti`, `telefono_ti`, `id_mun`, `id_tip_tie`.

### POST /empleados

```json
{
  "id_emp": 1,
  "fecha_contratacion": "2021-09-15",
  "id_ti": 1,
  "id_car": 1,
  "id_per": 1
}
```

Obligatorios: `id_emp`, `fecha_contratacion`, `id_ti`, `id_car`, `id_per`.

### POST /clientes

```json
{
  "id_cli": 1,
  "id_tip_ide": 1,
  "numero_identificacion": "3358880404",
  "id_per": 89
}
```

Obligatorios: `id_cli`, `id_tip_ide`, `numero_identificacion`, `id_per`.

### POST /productos

```json
{
  "id_pro": 1,
  "nombre_pro": "Agua pura Original",
  "descripcion_pro": "Agua pura presentacion original, categoria Bebidas",
  "id_cat": 1,
  "id_mar": 4
}
```

Obligatorios: `id_pro`, `nombre_pro`, `descripcion_pro`, `id_cat`, `id_mar`.

### POST /catalogos-producto

```json
{
  "precio_vigente_cat_pro": 231.22,
  "existencia_actual_cat_pro": 107,
  "id_ti": 1,
  "id_pro": 108
}
```

Obligatorios: `precio_vigente_cat_pro`, `existencia_actual_cat_pro`, `id_ti`, `id_pro`.

### POST /ventas

```json
{
  "id_ven": 1,
  "fecha_ven": "2026-08-23",
  "id_ti": 3,
  "id_emp": 11,
  "id_cli": 10,
  "id_es_ven": 1
}
```

Obligatorios: `id_ven`, `fecha_ven`, `id_ti`, `id_emp`, `id_cli`, `id_es_ven`.

### POST /detalles-venta

```json
{
  "cantidad_des_ven": 6,
  "precio_unitario_des_ven": 6.19,
  "id_ven": 1,
  "id_pro": 94
}
```

Obligatorios: `cantidad_des_ven`, `precio_unitario_des_ven`, `id_ven`, `id_pro`.

### POST /pagos

```json
{
  "id_pag": 1,
  "monto_pag": 114.88,
  "id_met_pag": 1,
  "id_ven": 1
}
```

Obligatorios: `id_pag`, `monto_pag`, `id_met_pag`, `id_ven`.

## Llaves compuestas

- Catalogo: `GET /catalogos-producto/3/1`, `PUT /catalogos-producto/3/1` y `DELETE /catalogos-producto/3/1`.
- Detalle: `GET /detalles-venta/1/1`, `PUT /detalles-venta/1/1` y `DELETE /detalles-venta/1/1`.

Las rutas son ejemplos de formato: consulta listados para seleccionar combinaciones existentes.

## Orden para crear una venta

1. Consultar cliente, empleado y tienda; el empleado debe pertenecer a la tienda.
2. Consultar el catalogo por tienda y producto.
3. POST de venta en REGISTRADA.
4. POST de detalles con cantidad y precio.
5. GET del catalogo para confirmar el descuento.
6. POST de pagos; GET de la venta para consultar su estado.

## Pruebas negativas

Un stock insuficiente devuelve HTTP 400 y `{"error":"Stock insuficiente"}`. Una llave duplicada devuelve 409. Una FK inexistente o un valor que incumple un CHECK devuelve 409. Un GET de una llave inexistente devuelve 404.

Todas las consultas usan parametros; el nombre de tabla y sus columnas salen de una lista fija interna. Nunca se usa un nombre de tabla suministrado por el cliente.
