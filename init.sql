-- Comercial La Estrella - Fase 2 - Randall Quinteros, 202202123
-- Ejecutado automaticamente por docker/init.sh con sqlcmd.
:on error exit
USE master;
GO
IF DB_ID(N'ComercialEstrellaFase2') IS NULL CREATE DATABASE ComercialEstrellaFase2;
GO
USE ComercialEstrellaFase2;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
GO
CREATE TABLE pais (
    id_pa       BIGINT    CONSTRAINT pk_pais PRIMARY KEY,
    nombre_pa   NVARCHAR(50)  NOT NULL,
    CONSTRAINT uq_pais_nombre UNIQUE (nombre_pa)
);

CREATE TABLE departamento (
    id_dep       BIGINT    CONSTRAINT pk_departamento PRIMARY KEY,
    nombre_dep   NVARCHAR(80)  NOT NULL,
    id_pa        BIGINT    NOT NULL,
    CONSTRAINT uq_departamento_nombre UNIQUE (id_pa, nombre_dep),
    CONSTRAINT fk_departamento_pais FOREIGN KEY (id_pa) REFERENCES pais (id_pa)
);

CREATE TABLE municipio (
    id_mun       BIGINT     CONSTRAINT pk_municipio PRIMARY KEY,
    nombre_mun   NVARCHAR(100)  NOT NULL,
    id_dep       BIGINT     NOT NULL,
    CONSTRAINT uq_municipio_nombre UNIQUE (id_dep, nombre_mun),
    CONSTRAINT fk_municipio_departamento FOREIGN KEY (id_dep)
        REFERENCES departamento (id_dep)
);

CREATE TABLE tipo_tienda (
    id_tip_tie       BIGINT    CONSTRAINT pk_tipo_tienda PRIMARY KEY,
    nombre_tip_tie   NVARCHAR(60)  NOT NULL,
    CONSTRAINT uq_tipo_tienda_nombre UNIQUE (nombre_tip_tie)
);

CREATE TABLE tipo_identificacion (
    id_tip_ide       BIGINT    CONSTRAINT pk_tipo_identificacion PRIMARY KEY,
    nombre_tip_ide   NVARCHAR(40)  NOT NULL,
    CONSTRAINT uq_tipo_ident_nombre UNIQUE (nombre_tip_ide)
);

CREATE TABLE cargo (
    id_car       BIGINT    CONSTRAINT pk_cargo PRIMARY KEY,
    nombre_car   NVARCHAR(60)  NOT NULL,
    CONSTRAINT uq_cargo_nombre UNIQUE (nombre_car)
);

CREATE TABLE categoria (
    id_cat       BIGINT    CONSTRAINT pk_categoria PRIMARY KEY,
    nombre_cat   NVARCHAR(60)  NOT NULL,
    CONSTRAINT uq_categoria_nombre UNIQUE (nombre_cat)
);

CREATE TABLE marca (
    id_mar       BIGINT    CONSTRAINT pk_marca PRIMARY KEY,
    nombre_mar   NVARCHAR(60)  NOT NULL,
    CONSTRAINT uq_marca_nombre UNIQUE (nombre_mar)
);

CREATE TABLE estado_venta (
    id_es_ven       BIGINT    CONSTRAINT pk_estado_venta PRIMARY KEY,
    nombre_es_ven   NVARCHAR(20)  NOT NULL,
    CONSTRAINT uq_estado_venta_nombre UNIQUE (nombre_es_ven),
    CONSTRAINT ck_estado_venta_nombre CHECK (nombre_es_ven IN ('REGISTRADA', 'PAGADA', 'ANULADA'))
);

CREATE TABLE metodo_pago (
    id_met_pag       BIGINT    CONSTRAINT pk_metodo_pago PRIMARY KEY,
    nombre_met_pag   NVARCHAR(60)  NOT NULL,
    CONSTRAINT uq_metodo_pago_nombre UNIQUE (nombre_met_pag)
);

CREATE TABLE persona (
    id_per          BIGINT     CONSTRAINT pk_persona PRIMARY KEY,
    nombre_per      NVARCHAR(80)   NOT NULL,
    apellido_per    NVARCHAR(80)   NOT NULL,
    telefono        NVARCHAR(20)   NOT NULL,
    correo_per      NVARCHAR(150),
    direccion_per   NVARCHAR(250)  NOT NULL,
    id_mun          BIGINT     NOT NULL,
    CONSTRAINT fk_persona_municipio FOREIGN KEY (id_mun) REFERENCES municipio (id_mun)
);

CREATE TABLE tienda (
    id_ti          BIGINT     CONSTRAINT pk_tienda PRIMARY KEY,
    nombre_ti      NVARCHAR(120)  NOT NULL,
    direccion_ti   NVARCHAR(250)  NOT NULL,
    telefono_ti    NVARCHAR(20)   NOT NULL,
    id_mun         BIGINT     NOT NULL,
    id_tip_tie     BIGINT     NOT NULL,
    CONSTRAINT fk_tienda_municipio FOREIGN KEY (id_mun) REFERENCES municipio (id_mun),
    CONSTRAINT fk_tienda_tipo FOREIGN KEY (id_tip_tie) REFERENCES tipo_tienda (id_tip_tie)
);

CREATE TABLE empleado (
    id_emp               BIGINT  CONSTRAINT pk_empleado PRIMARY KEY,
    fecha_contratacion   DATETIME2(0)        NOT NULL,
    id_ti                BIGINT  NOT NULL,
    id_car               BIGINT  NOT NULL,
    id_per               BIGINT  NOT NULL,
    CONSTRAINT uq_empleado_persona UNIQUE (id_per),
    CONSTRAINT fk_empleado_tienda FOREIGN KEY (id_ti) REFERENCES tienda (id_ti),
    CONSTRAINT fk_empleado_cargo FOREIGN KEY (id_car) REFERENCES cargo (id_car),
    CONSTRAINT fk_empleado_persona FOREIGN KEY (id_per) REFERENCES persona (id_per)
);

CREATE TABLE cliente (
    id_cli                  BIGINT    CONSTRAINT pk_cliente PRIMARY KEY,
    id_tip_ide              BIGINT    NOT NULL,
    numero_identificacion   NVARCHAR(30)  NOT NULL,
    id_per                  BIGINT    NOT NULL,
    CONSTRAINT uq_cliente_identificacion UNIQUE (id_tip_ide, numero_identificacion),
    CONSTRAINT uq_cliente_persona UNIQUE (id_per),
    CONSTRAINT fk_cliente_tipo_id FOREIGN KEY (id_tip_ide)
        REFERENCES tipo_identificacion (id_tip_ide),
    CONSTRAINT fk_cliente_persona FOREIGN KEY (id_per) REFERENCES persona (id_per)
);

CREATE TABLE producto (
    id_pro            BIGINT     CONSTRAINT pk_producto PRIMARY KEY,
    nombre_pro        NVARCHAR(120)  NOT NULL,
    descripcion_pro   NVARCHAR(500)  NOT NULL,
    id_cat            BIGINT     NOT NULL,
    id_mar            BIGINT     NOT NULL,
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_cat) REFERENCES categoria (id_cat),
    CONSTRAINT fk_producto_marca FOREIGN KEY (id_mar) REFERENCES marca (id_mar)
);

CREATE TABLE catalogo_producto (
    precio_vigente_cat_pro      DECIMAL(12,2) NOT NULL,
    existencia_actual_cat_pro   BIGINT   NOT NULL,
    id_ti                       BIGINT   NOT NULL,
    id_pro                      BIGINT   NOT NULL,
    CONSTRAINT pk_catalogo_producto PRIMARY KEY (id_ti, id_pro),
    CONSTRAINT ck_catalogo_precio CHECK (precio_vigente_cat_pro > 0),
    CONSTRAINT ck_catalogo_existencia CHECK (existencia_actual_cat_pro >= 0),
    CONSTRAINT fk_catalogo_tienda FOREIGN KEY (id_ti) REFERENCES tienda (id_ti),
    CONSTRAINT fk_catalogo_producto FOREIGN KEY (id_pro) REFERENCES producto (id_pro)
);

CREATE TABLE venta (
    id_ven      BIGINT CONSTRAINT pk_venta PRIMARY KEY,
    total_ven   DECIMAL(18,2) NOT NULL CONSTRAINT df_venta_total DEFAULT 0,
    fecha_ven   DATETIME2(0)       NOT NULL,
    id_ti       BIGINT NOT NULL,
    id_emp      BIGINT NOT NULL,
    id_cli      BIGINT NOT NULL,
    id_es_ven   BIGINT NOT NULL,
    CONSTRAINT fk_venta_tienda FOREIGN KEY (id_ti) REFERENCES tienda (id_ti),
    CONSTRAINT fk_venta_empleado FOREIGN KEY (id_emp) REFERENCES empleado (id_emp),
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cli) REFERENCES cliente (id_cli),
    CONSTRAINT fk_venta_estado FOREIGN KEY (id_es_ven) REFERENCES estado_venta (id_es_ven)
);

CREATE TABLE desglose_venta (
    cantidad_des_ven          BIGINT   NOT NULL,
    precio_unitario_des_ven   DECIMAL(12,2) NOT NULL,
    subtotal_des_ven AS CONVERT(DECIMAL(14,2), cantidad_des_ven * precio_unitario_des_ven) PERSISTED,
    id_ven                    BIGINT   NOT NULL,
    id_pro                    BIGINT   NOT NULL,
    CONSTRAINT pk_desglose_venta PRIMARY KEY (id_ven, id_pro),
    CONSTRAINT ck_desglose_cantidad CHECK (cantidad_des_ven > 0),
    CONSTRAINT ck_desglose_precio CHECK (precio_unitario_des_ven > 0),
    CONSTRAINT fk_desglose_venta FOREIGN KEY (id_ven) REFERENCES venta (id_ven),
    CONSTRAINT fk_desglose_producto FOREIGN KEY (id_pro) REFERENCES producto (id_pro)
);

CREATE TABLE pago (
    id_pag       BIGINT   CONSTRAINT pk_pago PRIMARY KEY,
    monto_pag    DECIMAL(14,2) NOT NULL,
    id_met_pag   BIGINT   NOT NULL,
    id_ven       BIGINT   NOT NULL,
    CONSTRAINT ck_pago_monto CHECK (monto_pag > 0),
    CONSTRAINT fk_pago_metodo FOREIGN KEY (id_met_pag) REFERENCES metodo_pago (id_met_pag),
    CONSTRAINT fk_pago_venta FOREIGN KEY (id_ven) REFERENCES venta (id_ven)
);

-- Indices para las columnas utilizadas con frecuencia en JOIN y filtros.
CREATE INDEX ix_departamento_pais ON departamento (id_pa);
CREATE INDEX ix_municipio_departamento ON municipio (id_dep);
CREATE INDEX ix_persona_municipio ON persona (id_mun);
CREATE INDEX ix_tienda_municipio ON tienda (id_mun);
CREATE INDEX ix_tienda_tipo ON tienda (id_tip_tie);
CREATE INDEX ix_empleado_tienda ON empleado (id_ti);
CREATE INDEX ix_empleado_cargo ON empleado (id_car);
CREATE INDEX ix_cliente_tipo_id ON cliente (id_tip_ide);
CREATE INDEX ix_producto_categoria ON producto (id_cat);
CREATE INDEX ix_producto_marca ON producto (id_mar);
CREATE INDEX ix_venta_tienda ON venta (id_ti);
CREATE INDEX ix_venta_empleado ON venta (id_emp);
CREATE INDEX ix_venta_cliente ON venta (id_cli);
CREATE INDEX ix_venta_estado ON venta (id_es_ven);
CREATE INDEX ix_pago_metodo ON pago (id_met_pag);
CREATE INDEX ix_pago_venta ON pago (id_ven);


CREATE UNIQUE INDEX uq_persona_correo ON persona(correo_per) WHERE correo_per IS NOT NULL;
CREATE INDEX ix_desglose_producto ON desglose_venta(id_pro);

GO
CREATE VIEW dbo.Vista_Ventas_Ubicacion AS
SELECT t.id_ti, t.nombre_ti AS tienda, m.nombre_mun AS municipio,
 d.nombre_dep AS departamento, p.nombre_pa AS pais,
 COUNT_BIG(v.id_ven) AS cantidad_ventas,
 CONVERT(DECIMAL(18,2), COALESCE(SUM(v.total_ven),0)) AS total_facturado
FROM dbo.tienda t
JOIN dbo.municipio m ON m.id_mun=t.id_mun
JOIN dbo.departamento d ON d.id_dep=m.id_dep
JOIN dbo.pais p ON p.id_pa=d.id_pa
LEFT JOIN (dbo.venta v JOIN dbo.estado_venta ev ON ev.id_es_ven=v.id_es_ven
 AND ev.nombre_es_ven <> 'ANULADA') ON v.id_ti=t.id_ti
GROUP BY t.id_ti,t.nombre_ti,m.nombre_mun,d.nombre_dep,p.nombre_pa;
GO
CREATE VIEW dbo.Vista_Top_Productos AS
SELECT p.id_pro AS codigo_producto,p.nombre_pro AS producto,
 c.nombre_cat AS categoria,m.nombre_mar AS marca,
 SUM(d.cantidad_des_ven) AS unidades_totales_vendidas,
 CONVERT(DECIMAL(18,2),SUM(d.subtotal_des_ven)) AS monto_total_generado
FROM dbo.producto p JOIN dbo.categoria c ON c.id_cat=p.id_cat
JOIN dbo.marca m ON m.id_mar=p.id_mar
JOIN dbo.desglose_venta d ON d.id_pro=p.id_pro
JOIN dbo.venta v ON v.id_ven=d.id_ven
JOIN dbo.estado_venta e ON e.id_es_ven=v.id_es_ven
WHERE e.nombre_es_ven <> 'ANULADA'
GROUP BY p.id_pro,p.nombre_pro,c.nombre_cat,m.nombre_mar;
GO
CREATE VIEW dbo.Vista_Saldos_Pendientes AS
SELECT v.id_ven,v.fecha_ven,v.id_ti,v.id_cli,v.total_ven AS total_venta,
 CONVERT(DECIMAL(18,2),COALESCE(p.total_pagado,0)) AS monto_total_pagado,
 CONVERT(DECIMAL(18,2),v.total_ven-COALESCE(p.total_pagado,0)) AS saldo_pendiente
FROM dbo.venta v JOIN dbo.estado_venta e ON e.id_es_ven=v.id_es_ven
LEFT JOIN (SELECT id_ven,SUM(monto_pag) AS total_pagado FROM dbo.pago GROUP BY id_ven) p ON p.id_ven=v.id_ven
WHERE e.nombre_es_ven='REGISTRADA';
GO
-- Operaciones por conjuntos: una sentencia puede contener varias filas.
-- El bloqueo sobre venta serializa cambios de detalles y pagos de la misma venta.
CREATE TRIGGER dbo.Insert_Detalle ON dbo.desglose_venta
AFTER INSERT, UPDATE, DELETE AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @ventas TABLE(id_ven BIGINT PRIMARY KEY);
 INSERT @ventas SELECT id_ven FROM inserted UNION SELECT id_ven FROM deleted;
 DECLARE @lock BIGINT;
 SELECT @lock=v.id_ven FROM dbo.venta v WITH (UPDLOCK,HOLDLOCK)
 JOIN @ventas a ON a.id_ven=v.id_ven ORDER BY v.id_ven;
 IF EXISTS(SELECT 1 FROM dbo.venta v JOIN @ventas a ON a.id_ven=v.id_ven
 JOIN dbo.estado_venta e ON e.id_es_ven=v.id_es_ven WHERE e.nombre_es_ven <> 'REGISTRADA')
  THROW 51002, 'Solo se pueden modificar detalles de ventas REGISTRADAS', 1;
 DECLARE @delta TABLE(id_ti BIGINT,id_pro BIGINT,cantidad BIGINT,PRIMARY KEY(id_ti,id_pro));
 INSERT @delta
 SELECT v.id_ti,x.id_pro,SUM(x.cantidad)
 FROM (SELECT id_ven,id_pro,cantidad_des_ven AS cantidad FROM inserted
 UNION ALL SELECT id_ven,id_pro,-cantidad_des_ven FROM deleted) x
 JOIN dbo.venta v ON v.id_ven=x.id_ven
 GROUP BY v.id_ti,x.id_pro;
 -- UPDATE condicional y atomico: dos compradores no pueden gastar el mismo stock.
 UPDATE c WITH (UPDLOCK,HOLDLOCK)
 SET existencia_actual_cat_pro=c.existencia_actual_cat_pro-d.cantidad
 FROM dbo.catalogo_producto c JOIN @delta d ON d.id_ti=c.id_ti AND d.id_pro=c.id_pro
 WHERE c.existencia_actual_cat_pro >= d.cantidad;
 IF @@ROWCOUNT <> (SELECT COUNT(*) FROM @delta)
  THROW 51001, 'Stock insuficiente', 1;
 UPDATE v SET total_ven=COALESCE(d.total,0)
 FROM dbo.venta v JOIN @ventas a ON a.id_ven=v.id_ven
 OUTER APPLY(SELECT SUM(subtotal_des_ven) AS total FROM dbo.desglose_venta WHERE id_ven=v.id_ven) d;
 UPDATE v SET id_es_ven=e.id_es_ven
 FROM dbo.venta v JOIN @ventas a ON a.id_ven=v.id_ven
 CROSS APPLY(SELECT COALESCE(SUM(monto_pag),0) AS total FROM dbo.pago WHERE id_ven=v.id_ven) p
 JOIN dbo.estado_venta e ON e.nombre_es_ven=CASE WHEN v.total_ven>0 AND p.total>=v.total_ven THEN 'PAGADA' ELSE 'REGISTRADA' END;
END;
GO
CREATE TRIGGER dbo.Insert_Pago ON dbo.pago
AFTER INSERT, UPDATE, DELETE AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @ventas TABLE(id_ven BIGINT PRIMARY KEY);
 INSERT @ventas SELECT id_ven FROM inserted UNION SELECT id_ven FROM deleted;
 DECLARE @lock BIGINT;
 SELECT @lock=v.id_ven FROM dbo.venta v WITH (UPDLOCK,HOLDLOCK)
 JOIN @ventas a ON a.id_ven=v.id_ven ORDER BY v.id_ven;
 IF EXISTS(SELECT 1 FROM dbo.venta v JOIN @ventas a ON a.id_ven=v.id_ven
 JOIN dbo.estado_venta e ON e.id_es_ven=v.id_es_ven WHERE e.nombre_es_ven='ANULADA')
  THROW 51003, 'No se pueden modificar pagos de ventas ANULADAS', 1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.venta v ON v.id_ven=i.id_ven WHERE v.total_ven<=0)
  THROW 51004, 'La venta debe tener detalles antes de registrar pagos', 1;
 UPDATE v SET id_es_ven=e.id_es_ven
 FROM dbo.venta v JOIN @ventas a ON a.id_ven=v.id_ven
 CROSS APPLY(SELECT COALESCE(SUM(monto_pag),0) AS total FROM dbo.pago WITH (HOLDLOCK) WHERE id_ven=v.id_ven) p
 JOIN dbo.estado_venta e ON e.nombre_es_ven=CASE WHEN v.total_ven>0 AND p.total>=v.total_ven THEN 'PAGADA' ELSE 'REGISTRADA' END;
END;
GO
-- Integridad adicional: empleado de la tienda, estados y anulaciones.
CREATE TRIGGER dbo.Validar_Venta ON dbo.venta AFTER INSERT, UPDATE, DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.empleado e ON e.id_emp=i.id_emp WHERE e.id_ti<>i.id_ti)
  THROW 51005, 'El empleado no pertenece a la tienda de la venta', 1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.id_ven=i.id_ven
 JOIN dbo.estado_venta e ON e.id_es_ven=i.id_es_ven WHERE d.id_ven IS NULL AND e.nombre_es_ven<>'REGISTRADA')
  THROW 51006, 'Una venta nueva debe estar REGISTRADA', 1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.id_ven=i.id_ven
 WHERE (i.id_ti<>d.id_ti OR i.id_emp<>d.id_emp OR i.id_cli<>d.id_cli)
 AND (EXISTS(SELECT 1 FROM dbo.desglose_venta x WHERE x.id_ven=i.id_ven)
 OR EXISTS(SELECT 1 FROM dbo.pago p WHERE p.id_ven=i.id_ven)))
  THROW 51007, 'No se puede reasignar una venta con detalles o pagos', 1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.id_ven=i.id_ven
 JOIN dbo.estado_venta e ON e.id_es_ven=d.id_es_ven WHERE e.nombre_es_ven='ANULADA' AND i.id_es_ven<>d.id_es_ven)
  THROW 51008, 'No se puede reactivar una venta ANULADA', 1;
 IF TRIGGER_NESTLEVEL()=1 AND EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.id_ven=i.id_ven
 JOIN dbo.estado_venta e ON e.id_es_ven=i.id_es_ven WHERE i.id_es_ven<>d.id_es_ven AND e.nombre_es_ven<>'ANULADA')
  THROW 51009, 'El estado PAGADA/REGISTRADA se calcula automaticamente', 1;
 ;WITH anuladas AS(SELECT i.id_ven,i.id_ti FROM inserted i JOIN deleted d ON d.id_ven=i.id_ven
 JOIN dbo.estado_venta ei ON ei.id_es_ven=i.id_es_ven JOIN dbo.estado_venta ed ON ed.id_es_ven=d.id_es_ven
 WHERE ei.nombre_es_ven='ANULADA' AND ed.nombre_es_ven<>'ANULADA'),
 cantidades AS(SELECT a.id_ti,d.id_pro,SUM(d.cantidad_des_ven) AS cantidad
 FROM anuladas a JOIN dbo.desglose_venta d ON d.id_ven=a.id_ven GROUP BY a.id_ti,d.id_pro)
 UPDATE c SET existencia_actual_cat_pro=c.existencia_actual_cat_pro+x.cantidad
 FROM dbo.catalogo_producto c JOIN cantidades x ON x.id_ti=c.id_ti AND x.id_pro=c.id_pro;
END;
GO
CREATE TABLE dbo.schema_version(version INT NOT NULL PRIMARY KEY,installed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
INSERT dbo.schema_version(version) VALUES(1);
COMMIT;
GO
USE master;
GO
IF SUSER_ID('estrella_api') IS NULL CREATE LOGIN estrella_api WITH PASSWORD='$(API_PASSWORD)', CHECK_POLICY=ON;
IF SUSER_ID('estrella_lectura') IS NULL CREATE LOGIN estrella_lectura WITH PASSWORD='$(READ_PASSWORD)', CHECK_POLICY=ON;
GO
USE ComercialEstrellaFase2;
GO
CREATE USER estrella_api FOR LOGIN estrella_api;
CREATE USER estrella_lectura FOR LOGIN estrella_lectura;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO estrella_api;
DENY INSERT, UPDATE, DELETE ON dbo.schema_version TO estrella_api;
GRANT SELECT ON SCHEMA::dbo TO estrella_lectura;
GO
