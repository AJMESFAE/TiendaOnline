#!/usr/bin/env bash
# Crea o actualiza las páginas legales en la tienda de Azure:
# Aviso legal, Política de privacidad, Política de cookies,
# Condiciones de venta y Envíos y devoluciones (scripts/legal-pages.mjs).
#
# Uso (los datos pendientes se pueden pasar como variables):
#   CONTACT_EMAIL=tienda@fundacionandalusi.org \
#   FOUNDATION_REGISTRY="Registro de Fundaciones ..., n.º ..." \
#   SHIPPING_COST="4,95 € IVA incluido" SHIPPING_DAYS="2 a 5 días laborables" \
#   SHIPPING_PREP_DAYS="24-48 horas laborables" \
#   ./infra/create-pages.sh
#
#   ./infra/create-pages.sh --dry-run    (muestra qué datos faltan)
# Se puede repetir: actualiza las páginas existentes.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
[[ -f infra/.deploy.env ]] && source infra/.deploy.env
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-tienda-albayan}"
PREFIX="${PREFIX:-albayantienda}"
: "${ADMIN_EMAIL:?Falta ADMIN_EMAIL (ejecute antes ./infra/deploy.sh)}"
: "${ADMIN_PASSWORD:?Falta ADMIN_PASSWORD (ejecute antes ./infra/deploy.sh)}"

APP_NAME="$(az webapp list -g "$RESOURCE_GROUP" --query "[?starts_with(name, '${PREFIX}-app-')].name | [0]" -o tsv)"
[[ -n "$APP_NAME" ]] || { echo "No encuentro la Web App en $RESOURCE_GROUP"; exit 1; }
URL="$(az webapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --query "[?name=='EVERSHOP_HOME_URL'].value | [0]" -o tsv)"
URL="${URL:-https://$(az webapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query defaultHostName -o tsv)}"

echo "Tienda: $URL"
# En el aviso legal se cita el dominio definitivo de la tienda.
STORE_PUBLIC_URL="${STORE_PUBLIC_URL:-https://tienda.fundacionandalusi.org}" \
  node scripts/create-pages.mjs --to "$URL" --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" "$@"
