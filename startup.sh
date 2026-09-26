#!/bin/sh
# Comando de arranque para Azure App Service (Linux, Node 22).
#
# Se ejecuta como "bash startup.sh" con /home/site/wwwroot como directorio de
# trabajo. Es autosuficiente: si el paquete desplegado no trae dependencias o
# la tienda compilada (p. ej. un despliegue solo con el código fuente), las
# instala y compila antes de arrancar, en vez de fallar en seco.
set -e
cd "$(dirname "$0")"

echo "== startup.sh: directorio actual: $(pwd) =="

if [ ! -f node_modules/@evershop/evershop/package.json ]; then
  echo "== startup.sh: faltan dependencias, instalando (npm ci)… =="
  npm ci --include=dev --no-audit --no-fund
fi

if [ ! -d .evershop/build ] || [ ! -d extensions/redsys/dist ] || [ ! -d themes/albayan/dist ]; then
  echo "== startup.sh: la tienda no está compilada, compilando (npm run build)… =="
  NODE_ENV=production npm run build
fi

echo "== startup.sh: arrancando la tienda en el puerto ${PORT:-8080} =="
export NODE_ENV=production
exec node scripts/start.mjs
