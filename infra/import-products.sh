#!/usr/bin/env bash
# Copia los productos de la tienda Shopify actual (tienda.institutoalbayan.com)
# a la tienda nueva de Azure. Se puede repetir: no duplica productos (SKU).
#
# Uso:  ./infra/import-products.sh             (importa todos)
#       ./infra/import-products.sh --dry-run   (solo muestra lo que importaría)
#       ./infra/import-products.sh --handles alifato,el-metodo-andalusi-nivel-basico
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

echo "Tienda nueva: $URL"
node scripts/import-shopify.mjs --from "${SHOPIFY_URL:-https://tienda.institutoalbayan.com}" \
  --to "$URL" --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" "$@"
