#!/bin/sh
# Comando de arranque para Azure App Service (Linux, Node 22).
#
# Se ejecuta como "bash startup.sh" con /home/site/wwwroot como directorio de
# trabajo. El paquete llega YA compilado (scripts/build-package.sh, desde el
# workflow de GitHub o infra/deploy.sh). Compilar EverShop dentro de un B1
# tarda más que el límite de arranque de Azure (15 min), así que si falta algo
# se falla enseguida con un mensaje claro en vez de agotar el tiempo.
set -e
cd "$(dirname "$0")"

echo "== startup.sh: directorio actual: $(pwd) =="

missing=""
[ -f node_modules/@evershop/evershop/package.json ] || missing="$missing node_modules"
[ -d .evershop/build ] || missing="$missing .evershop/build"
[ -d extensions/redsys/dist ] || missing="$missing extensions/redsys/dist"
[ -d themes/albayan/dist ] || missing="$missing themes/albayan/dist"
if [ -n "$missing" ]; then
  echo "== startup.sh: ERROR: el paquete desplegado no está compilado (falta:$missing)."
  echo "== Despliegue el paquete de scripts/build-package.sh (workflow de GitHub o infra/deploy.sh)."
  exit 1
fi

echo "== startup.sh: arrancando la tienda en el puerto ${PORT:-8080} =="
export NODE_ENV=production
exec node scripts/start.mjs
