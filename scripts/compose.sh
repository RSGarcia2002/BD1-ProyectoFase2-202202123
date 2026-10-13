#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# El perfil separado evita QEMU en este Mac ARM sin cambiar el contexto global.
if [ -z "${DOCKER_CONTEXT:-}" ] && command -v colima >/dev/null 2>&1 && docker context inspect colima-bd1-fase2 >/dev/null 2>&1; then
  export DOCKER_CONTEXT=colima-bd1-fase2
fi
if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
elif command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose "$@"
else
  echo 'Se requiere Docker Compose (docker compose o docker-compose).' >&2
  exit 1
fi
