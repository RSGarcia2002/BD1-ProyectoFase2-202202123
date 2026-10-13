# Guia para explicar y defender el proyecto

## Arquitectura y responsabilidades

Postman envia HTTP a Express; Express valida forma y tipos y ejecuta T-SQL parametrizado mediante `mssql`; SQL Server comprueba llaves, restricciones, stock y estados. Los reportes se resuelven en vistas, sin JOINs analiticos en el codigo de la API.

Docker Compose inicia tres servicios: el motor, un inicializador de una sola ejecucion y la API. Un volumen conserva los archivos de la base. `depends_on` con healthcheck evita que la API intente conectar antes de completar el esquema.

El motor corre en SQL Server 2022 Developer dentro de un contenedor. En este Mac ARM se verifico usando Rosetta en el perfil Colima separado. Microsoft soporta oficialmente las imagenes sobre Linux x86-64; el entorno local emulado es de desarrollo.

## Diferencias respecto a Oracle

- `NUMBER(10)` pasa a BIGINT: INT de SQL Server no alcanza todo el dominio de diez digitos.
- `NUMBER(p,s)` pasa a DECIMAL(p,s), adecuado para dinero sin el error de FLOAT.
- `VARCHAR2` pasa a NVARCHAR para preservar caracteres Unicode.
- DATE de Oracle puede guardar hora; se usa DATETIME2(0) para conservar esa capacidad.
- La unicidad opcional del correo se implementa con un indice filtrado, permitiendo varias personas sin correo.
- `subtotal_des_ven` es calculado y persistido; `total_ven` es una columna adicional mantenida por el trigger.
- Se conservan las 19 tablas y las llaves compuestas de catalogo y desglose.

## Insert_Detalle

Es un trigger AFTER INSERT, UPDATE, DELETE. `inserted` contiene las filas nuevas; `deleted` contiene las antiguas. En un UPDATE existen ambas. Son conjuntos completos, no una sola fila, porque un INSERT puede introducir varias filas.

Se identifican todas las ventas afectadas y se bloquean sus filas con UPDLOCK/HOLDLOCK durante la transaccion. Se agrupa la diferencia de cantidades por tienda y producto. Un UPDATE atomico descuenta solo si la existencia alcanza; si falta un catalogo o stock, THROW 51001 produce `Stock insuficiente` y revierte toda la operacion. Borrar o disminuir cantidades devuelve existencias.

Finalmente se recalcula el total de las ventas afectadas y, si procede, su estado. La API no descuenta inventario ni calcula el total. Los lotes de la API son transaccionales incluso cuando necesitan varias sentencias por el limite de parametros.

Pregunta frecuente: **¿por que agrupar?** Dos filas del lote pueden vender el mismo producto en la misma tienda. Validarlas separadas permitiria que cada una parezca tener stock suficiente aunque su suma no lo tenga.

## Insert_Pago

Es AFTER INSERT, UPDATE, DELETE. Bloquea las ventas afectadas, suma TODOS sus pagos y compara ese resultado con `total_ven`. Una venta con total positivo se marca PAGADA si el pago acumulado alcanza o supera el total; de otro modo queda REGISTRADA.

No se aceptan pagos de una venta sin detalles ni de una anulada. Corregir o borrar un pago recalcula el estado; esto evita que una venta siga PAGADA despues de retirar el abono que la habia completado.

La API solo confirma el pago y devuelve el registro. Para mostrar el cambio se realiza un GET de la venta.

## Validar_Venta, regla adicional

Comprueba que el empleado pertenezca a la tienda. Impide crear ventas inicialmente pagadas, reasignar una venta que ya tenga detalles/pagos y reactivar una venta anulada. La API no puede marcar arbitrariamente PAGADA.

Cuando una venta pasa a ANULADA, el trigger devuelve las cantidades al catalogo. El DELETE de ventas es logico e idempotente: repetirlo no devuelve stock dos veces. Los pagos y detalles permanecen como historial. No se modelan reembolsos financieros porque la Fase 1 no contiene esa entidad.

`TRIGGER_NESTLEVEL()` permite distinguir el cambio automatico de estado producido por los triggers de un UPDATE directo de estado. No se utiliza contexto de sesion para desactivar validaciones durante la carga.

## Vista_Ventas_Ubicacion

Une tienda, municipio, departamento y pais. Las ventas se filtran por estado antes de agregarlas; cuenta una fila por venta y suma `total_ven`. Esto evita multiplicar los totales o el conteo por la cantidad de detalles o pagos. LEFT JOIN incluye tiendas sin ventas.

## Vista_Top_Productos

Une producto, categoria, marca, desglose, venta y estado. Excluye anuladas, agrupa por producto y suma cantidad y subtotal. La vista no impone orden; el endpoint ordena por unidades y despues por codigo.

## Vista_Saldos_Pendientes

Primero agrupa pagos por venta y despues los relaciona con la venta. LEFT JOIN y COALESCE permiten que una venta sin pagos muestre cero abonado. Solo devuelve REGISTRADA; saldo = total - pagos. No une directamente detalles y pagos porque multiplicaria ambas colecciones.

## Seguridad y transacciones

El usuario de DBeaver solo tiene SELECT. La API tiene SELECT/INSERT/UPDATE/DELETE, sin permisos para crear o borrar objetos. El inicializador usa sa para DDL y usuarios. La API usa parametros para cada valor y tablas/columnas de una lista fija.

THROW y XACT_ABORT abortan los errores de negocio. El controlador de lotes abre una transaccion explicita y hace rollback en caso de fallo. Los errores de stock se traducen a HTTP 400; duplicados y restricciones a 409; registros ausentes a 404.

El pool reutiliza conexiones y se cierra con SIGINT/SIGTERM. La API no publica mensajes internos SQL en errores 500. El proyecto se expone solo en localhost para la demostracion local.

## Demostracion sugerida

1. Mostrar los servicios con `./scripts/compose.sh ps` y la ruta `/health`.
2. En Postman ejecutar el lote de stock invalido: HTTP 400, sin detalle y sin decremento.
3. Insertar cantidad valida y consultar el catalogo de esa tienda.
4. Registrar el primer abono y consultar venta REGISTRADA.
5. Completar los pagos y consultar venta PAGADA.
6. Consultar los tres reportes y explicar agregaciones y exclusiones.
7. Mostrar el caso concurrente de `npm run verificar`.

Practica una modificacion pequena: agregar un filtro de tienda a una vista o exponerlo con un parametro, manteniendo el calculo en SQL. Antes de presentarlo, revisa y comprende cada regla y ejecuta personalmente la coleccion.

## Referencias tecnicas

- [Triggers de multiples filas, Microsoft](https://learn.microsoft.com/en-us/sql/relational-databases/triggers/create-dml-triggers-to-handle-multiple-rows-of-data?view=sql-server-ver16).
- [Contenedores SQL Server, Microsoft](https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment?view=sql-server-ver17).
