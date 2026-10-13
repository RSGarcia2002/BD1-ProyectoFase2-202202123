# Comercial La Estrella - Proyecto Fase 2

**Randall Steve Quinteros Garcia · Carnet 202202123 · Bases de Datos 1 · Segundo semestre 2026**

Backend REST sobre Microsoft SQL Server 2022. Conserva las 19 tablas, nombres de columnas y relaciones de la Fase 1 de Oracle. Incluye inicializacion automatica, CRUD por entidad, tres vistas, dos triggers principales, un trigger adicional de integridad, carga del dataset por API y pruebas reproducibles.

Entrega indicada en el enunciado: **15 de octubre de 2026**. La carpeta comprimida es `[BD1]_ProyectoFase2_202202123.zip`.

## Inicio en esta computadora

La carpeta del proyecto es `/Users/randall/proyectos/ProyectoFase2_202202123`.

```bash
cd /Users/randall/proyectos/ProyectoFase2_202202123
./iniciar.command
```

Tambien puedes abrir `iniciar.command` con doble clic. El script conserva las claves y datos existentes, instala las dependencias, levanta los servicios y carga el dataset solamente si la base esta vacia.

- API: <http://localhost:3002/api>
- Salud: <http://localhost:3002/health>
- SQL Server: `localhost:1435`, base `ComercialEstrellaFase2`.
- Docker Compose: proyecto `estrella-fase2-202202123`.
- Node.js 22 o superior y Docker con Compose son necesarios.

### Mac ARM y Colima

En este equipo, el perfil original `colima` usa QEMU y SQL Server falla con `Invalid mapping of address`. Se creo el perfil separado `bd1-fase2` con Virtualization Framework y Rosetta; se comprobo que SQL Server arranca en el. El contexto Docker global se conserva en `colima`. El wrapper `scripts/compose.sh` selecciona el contexto `colima-bd1-fase2` cuando existe, sin cambiarlo globalmente.

Si necesitas recrear este perfil en otro Mac Apple Silicon:

```bash
colima start --profile bd1-fase2 --activate=false --vm-type vz --vz-rosetta --cpu 4 --memory 4 --disk 25 --mount /Users/randall/proyectos:w
```

En Linux x86-64 o Docker Desktop configurado para ejecutar `linux/amd64`, el mismo Compose funciona sin Colima. Microsoft ofrece soporte oficial para SQL Server en contenedores sobre hosts Linux Intel/AMD x86-64; la ejecucion con Rosetta aqui es para desarrollo academico. Referencia: [Contenedores SQL Server](https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment?view=sql-server-ver17).

## Instalacion manual desde el ZIP

Descomprime el proyecto y ejecuta desde su raiz:

```bash
node scripts/configurar-env.js
npm ci
./scripts/compose.sh up -d --build
npm run importar
```

La configuracion crea `.env` con claves aleatorias. No se incluye ese archivo ni `node_modules` en la entrega. **Conserva `.env` mientras conserves el volumen de la base**: los usuarios SQL mantienen sus claves originales.

`init` espera el healthcheck del motor y ejecuta `init.sql`. La API espera a que `init` termine con exito. Los errores detienen la inicializacion; el esquema se crea dentro de una transaccion y la version instalada evita recrearlo en reinicios.

Para ejecutar Node.js localmente manteniendo la base en Docker:

```bash
./scripts/compose.sh stop api
npm start
```

Para regresar a la API dockerizada, detiene `npm start` con Ctrl+C y ejecuta `./scripts/compose.sh up -d api`.

## Estructura

```text
init.sql                       DDL, llaves, indices, vistas, triggers y permisos
docker-compose.yml             SQL Server, inicializador y API
Dockerfile                     API Node.js sin privilegios root
src/config/                    Conexion, metadatos de las 19 entidades y JSON
src/controllers/crud.js         Controladores parametrizados, validacion y lotes
src/routes/api.js               Rutas por entidad y reportes
src/app.js                     HTTP y manejo uniforme de errores
src/server.js                  Inicio y cierre de conexiones
scripts/importar-datos.js       Carga oficial a traves de HTTP
scripts/verificar-api.js        Pruebas de integracion y concurrencia
datos/dataset-fase1.json        9068 registros convertidos del SQL original
postman/                       Coleccion y entorno YAML v3 para Postman local
postman-json/                  Exportaciones JSON para entrega y Newman
docs/                          Guia de API, explicacion y evidencias
```

## Operaciones REST

Todos los endpoints usan `/api`. Los cuerpos y respuestas son JSON. Se aceptan las columnas originales del modelo. Los IDs se suministran explicitamente, conservando los IDs del dataset. Los campos calculados no se pueden modificar.

| Operacion | Metodo y ruta |
|---|---|
| Listar | `GET /api/{entidad}?limit=100&offset=0` |
| Consultar | `GET /api/{entidad}/{id}` |
| Crear | `POST /api/{entidad}` |
| Modificar | `PUT /api/{entidad}/{id}` |
| Eliminar | `DELETE /api/{entidad}/{id}` |
| Crear lote | `POST /api/{entidad}` con un arreglo JSON |

La lista devuelve `{data, total, limit, offset}`; `limit` admite de 1 a 10000. Un lote admite hasta 10000 filas y se ejecuta en una transaccion: una fila invalida revierte todo el lote. El alta individual devuelve el registro con HTTP 201. PUT acepta los campos que se quieran cambiar, excepto llaves y campos calculados.

**Llaves compuestas:** `catalogos-producto/{id_ti}/{id_pro}` y `detalles-venta/{id_ven}/{id_pro}`. Las 19 rutas y ejemplos estan en [docs/API.md](docs/API.md).

- `subtotal_des_ven` se calcula como cantidad por precio; si se recibe en un POST se comprueba y luego se omite del INSERT.
- `total_ven` se mantiene por trigger como la suma de detalles.
- Las ventas nuevas deben tener estado `REGISTRADA`; `PAGADA` se determina en el motor.
- `DELETE /ventas/{id}` anula logicamente y restituye inventario una sola vez. No borra el historial ni los pagos.
- Detalles solo pueden modificarse mientras la venta esta `REGISTRADA`. Para corregir una venta pagada, primero corrige o elimina sus pagos.
- No se admiten pagos ni cambios de detalles en ventas anuladas.
- Los registros con dependencias devuelven HTTP 409 al intentar borrarlos.

### Inventario por tienda

En la Fase 1, las existencias pertenecen a `catalogo_producto`, cuya llave es `(id_ti,id_pro)`. El trigger usa la tienda de la venta. La consulta para demostrar el descuento es `GET /api/catalogos-producto/{id_ti}/{id_pro}`. Tambien existe `GET /api/productos/{id_pro}/inventario`, que devuelve las existencias de ese producto por tienda.

### Reportes

- `GET /api/reportes/ventas-ubicacion`: `Vista_Ventas_Ubicacion`, excluye anuladas y cuenta cada venta una vez. Incluye tiendas con cero ventas.
- `GET /api/reportes/top-productos`: `Vista_Top_Productos`, excluye anuladas; ordena por unidades vendidas.
- `GET /api/reportes/saldos-pendientes`: `Vista_Saldos_Pendientes`, exclusivamente ventas `REGISTRADA`, incluidos abonos o cero pagos.

Los endpoints consultan directamente las vistas. Los JOINs y agregaciones analiticas estan en T-SQL.

### Errores

| HTTP | Caso |
|---|---|
| 400 | Stock insuficiente, reglas de negocio, JSON o campos invalidos |
| 404 | Registro o ruta inexistente |
| 409 | Llave duplicada, dependencia, CHECK o conflicto de transacciones |
| 413 | Cuerpo mayor a 20 MB |
| 500 | Error interno; no expone credenciales ni detalles SQL |

El error de inventario devuelve exactamente `{"error":"Stock insuficiente"}`. `THROW` y `XACT_ABORT` revierten la sentencia/transaccion; la API captura el numero de error del motor.

## Carga del dataset

`npm run importar` carga los **9068 registros originales** pasando exclusivamente por HTTP. No utiliza una conexion SQL para insertar datos. Se ejecuta en base vacia y no sobreescribe una carga existente. Si se interrumpe, revisa la causa y reinicia una base de pruebas vacia antes de repetirla; no es una carga reanudable.

Las ventas historicas se reproducen inicialmente como REGISTRADAS, despues se insertan detalles y pagos, y finalmente se anulan las ventas correspondientes. El inventario inicial se amplifica temporalmente para reproducir el historial; al terminar se restaura la instantanea oficial mediante PUT. Se verifican los estados contra el dataset original. Esto evita aplicar dos veces el efecto de ventas historicas a una instantanea de stock actual.

La carga guarda los conteos y la verificacion en `docs/evidencias/carga-datos.json`. La verificacion de conteos originales corresponde al momento anterior a crear datos adicionales de prueba.

## Pruebas y evidencias

```bash
npm test
npm run verificar
```

Las pruebas de integracion requieren el dataset cargado. Crean IDs nuevos y conservan algunas ventas de demostracion porque su DELETE es logico. Son reproducibles y no sobreescriben los IDs originales. Verifican CRUD en las 19 tablas, reglas de inventario, rollback de lotes, pagos, anulaciones y dos compras realmente simultaneas.

Ejecuta `node scripts/configurar-postman.js` para preparar el workspace sin sobreescribir tu configuracion. En Postman v12 Local Mode abre la carpeta `postman/`, que contiene la coleccion y el entorno en YAML v3. Selecciona el entorno **Comercial La Estrella - Local** y ejecuta toda la coleccion en Runner, en orden y con una iteracion. Sus variables generan IDs nuevos. Los HTTP 400/404/409 indicados son pruebas negativas esperadas.

Las exportaciones JSON originales se conservan en `postman-json/` para la entrega, Newman y versiones de Postman que permiten importar JSON. Mantenlas fuera del workspace local YAML para evitar volver a solicitar su conversion.

Alternativa con el runner de linea de comandos de Postman:

```bash
npx --yes newman run postman-json/ComercialLaEstrella.postman_collection.json
```

La coleccion reproduce secuencialmente el conflicto de stock; la concurrencia real esta en `npm run verificar`.

Las evidencias verificadas se encuentran en [docs/evidencias/README.md](docs/evidencias/README.md). Las capturas PNG se generan a partir de peticiones y respuestas reales, con sus metodos, cuerpos y resultados; representan el informe de pruebas y no la interfaz grafica de Postman.

## Verificacion estructural con DBeaver

Usa SQL Server, host `localhost`, puerto `1435`, base `ComercialEstrellaFase2`, usuario **`estrella_lectura`** y la clave `READ_PASSWORD` de tu `.env`. Activa Trust Server Certificate si el cliente lo requiere. Este usuario solo tiene SELECT. No uses `sa` ni `estrella_api` en el cliente grafico para manipular datos.

La API usa `estrella_api`, con permisos DML y SELECT, sin permisos de DDL. `sa` se utiliza solamente para instalar el esquema.

## Administracion

```bash
./scripts/compose.sh ps
./scripts/compose.sh logs --tail=50 api
./scripts/compose.sh logs --tail=50 init
./scripts/compose.sh stop
./scripts/compose.sh up -d
npm run empaquetar
```

El volumen conserva la informacion. `docker compose down -v` elimina los datos del proyecto: no es necesario para reiniciar y solo debe usarse si se desea una base vacia.

## Repositorio y defensa

Repositorio publico: [RSGarcia2002/BD1-ProyectoFase2-202202123](https://github.com/RSGarcia2002/BD1-ProyectoFase2-202202123).

```bash
git clone https://github.com/RSGarcia2002/BD1-ProyectoFase2-202202123.git
cd BD1-ProyectoFase2-202202123
node scripts/configurar-env.js
npm ci
./scripts/compose.sh up -d --build
npm run importar
```

Lee [docs/DEFENSA.md](docs/DEFENSA.md) para comprender las vistas, `inserted`/`deleted`, las transacciones y las decisiones de migracion. La evaluacion incluye una pregunta teorica y una modificacion en vivo.
