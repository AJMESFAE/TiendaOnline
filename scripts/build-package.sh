#!/usr/bin/env bash
# Compila la tienda y genera el paquete ZIP que se sube a Azure App Service
# (mismo esquema que VillaDelCasar: código Node ya compilado + startup.sh).
#
# Uso: scripts/build-package.sh [ruta-del-zip]      (por defecto: tienda.zip)
# Trabaja en una copia temporal: no toca el node_modules de su carpeta.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
OUT="${1:-$ROOT/tienda.zip}"
[[ "$OUT" = /* ]] || OUT="$ROOT/$OUT"

command -v node >/dev/null || { echo "Hace falta Node.js 20 o superior"; exit 1; }
command -v zip >/dev/null || { echo "Hace falta el comando zip"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== Copiando el código a $WORK"
tar -C "$ROOT" \
  --exclude=./node_modules --exclude='./*/*/node_modules' --exclude=./.git \
  --exclude=./.evershop --exclude='./*/*/dist' --exclude=./.env \
  --exclude=./infra/.deploy.env --exclude=./media --exclude=./public \
  --exclude='./*.zip' -cf - . | tar -C "$WORK" -xf -

cd "$WORK"
echo "== Instalando dependencias"
npm ci --include=dev --no-audit --no-fund
echo "== Compilando (extensiones, tema y bundles de la tienda)"
NODE_ENV=production npm run build
echo "== Pruebas"
npm test
echo "== Quitando dependencias de desarrollo"
npm prune --omit=dev --no-audit --no-fund

echo "== Empaquetando $OUT"
rm -f "$OUT"
zip -qr "$OUT" . -x '.env' -x 'infra/*' -x 'docs/*'
echo "== Paquete listo: $OUT ($(du -h "$OUT" | cut -f1))"
