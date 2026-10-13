#!/bin/bash
set -euo pipefail
SQLCMD=/opt/mssql-tools18/bin/sqlcmd
version="$($SQLCMD -S sqlserver -U sa -C -b -h -1 -W -Q "SET NOCOUNT ON; IF DB_ID('ComercialEstrellaFase2') IS NOT NULL EXEC('USE ComercialEstrellaFase2; IF OBJECT_ID(''dbo.schema_version'') IS NOT NULL SELECT MAX(version) FROM dbo.schema_version;');")"
if [[ "$version" =~ ^[[:space:]]*1[[:space:]]*$ ]]; then
  echo 'Esquema version 1 ya instalado. Se conserva la informacion.'
else
  $SQLCMD -S sqlserver -U sa -C -b -i /init.sql -v API_PASSWORD="$DB_PASSWORD" READ_PASSWORD="$READ_PASSWORD"
  echo 'Base de datos, vistas, triggers y usuarios creados.'
fi
