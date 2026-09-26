#!/usr/bin/env bash
# Regenera infra/.deploy.env a partir de la configuración de la Web App en
# Azure (por ejemplo, si Cloud Shell se reinició y se perdió la carpeta).
# Las contraseñas no se pierden: están en las variables de entorno de la app.
#
# Uso:  ./infra/restore-state.sh [grupo-de-recursos]   (por defecto rg-tienda-albayan)
set -euo pipefail
cd "$(dirname "$0")/.."
RESOURCE_GROUP="${1:-${RESOURCE_GROUP:-rg-tienda-albayan}}"
PREFIX="${PREFIX:-albayantienda}"
STATE_FILE="infra/.deploy.env"

APP_NAME="$(az webapp list -g "$RESOURCE_GROUP" --query "[?starts_with(name, '${PREFIX}-app-')].name | [0]" -o tsv)"
[[ -n "$APP_NAME" ]] || { echo "No encuentro la Web App en $RESOURCE_GROUP"; exit 1; }
LOCATION="$(az webapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query location -o tsv | tr -d ' ' | tr '[:upper:]' '[:lower:]')"
SKU="$(az appservice plan show --ids "$(az webapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query serverFarmId -o tsv)" --query sku.name -o tsv)"
SETTINGS="$(az webapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" -o json)"
get() { printf '%s' "$SETTINGS" | python3 -c "import json,sys; d={s['name']:s['value'] for s in json.load(sys.stdin)}; print(d.get('$1',''))"; }

HOME_URL="$(get EVERSHOP_HOME_URL)"
DOMAIN="${HOME_URL#https://}"
if [[ "$DOMAIN" == *.azurewebsites.net || -z "$DOMAIN" ]]; then
  USE_CUSTOM_DOMAIN=false; DOMAIN=tienda.institutoalbayan.com
else
  USE_CUSTOM_DOMAIN=true
fi

umask 077
cat > "$STATE_FILE" <<EOS
RESOURCE_GROUP='$RESOURCE_GROUP'
LOCATION='$LOCATION'
PREFIX='$PREFIX'
APP_SKU='$SKU'
CUSTOM_DOMAIN='$DOMAIN'
USE_CUSTOM_DOMAIN='$USE_CUSTOM_DOMAIN'
ADMIN_EMAIL='$(get ADMIN_EMAIL)'
SHARE_PLAN_WITH_APP=''
ADMIN_PASSWORD='$(get ADMIN_PASSWORD)'
DB_PASSWORD='$(get DB_PASSWORD)'
REDSYS_ENVIRONMENT='$(get REDSYS_ENVIRONMENT)'
REDSYS_MERCHANT_CODE='$(get REDSYS_MERCHANT_CODE)'
REDSYS_TERMINAL='$(get REDSYS_TERMINAL)'
REDSYS_SECRET_KEY='$(get REDSYS_SECRET_KEY)'
SMTP_HOST='$(get SMTP_HOST)'
SMTP_PORT='$(get SMTP_PORT)'
SMTP_USER='$(get SMTP_USER)'
SMTP_PASSWORD='$(get SMTP_PASSWORD)'
MAIL_FROM='$(get MAIL_FROM)'
EOS
echo "Recuperado $STATE_FILE desde $APP_NAME (URL: ${HOME_URL:-sin definir})."
echo "Administrador: $(get ADMIN_EMAIL)  ·  contraseña inicial: grep ADMIN_PASSWORD $STATE_FILE"
