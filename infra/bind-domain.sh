#!/usr/bin/env bash
# =============================================================================
#  Vincula tienda.institutoalbayan.com al App Service con certificado HTTPS
#  gratuito (gestionado por Azure) y cambia la URL pública de la tienda.
#
#  Requisito: haber creado en el DNS los registros que indica deploy.sh:
#      CNAME  tienda        -> <app>.azurewebsites.net
#      TXT    asuid.tienda  -> <id de verificación>
#
#  Uso:  ./infra/bind-domain.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
STATE_FILE="infra/.deploy.env"
[[ -f "$STATE_FILE" ]] || { echo "Ejecute primero ./infra/deploy.sh"; exit 1; }
# shellcheck disable=SC1090
source "$STATE_FILE"

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

APP_NAME="$(az webapp list -g "$RESOURCE_GROUP" --query "[?starts_with(name, '${PREFIX}-app-')].name | [0]" -o tsv)"
[[ -n "$APP_NAME" ]] || { echo "No se encuentra el App Service en $RESOURCE_GROUP"; exit 1; }

step "Comprobando el DNS de $CUSTOM_DOMAIN"
if command -v nslookup >/dev/null; then
  nslookup -type=CNAME "$CUSTOM_DOMAIN" || echo "Aviso: todavía no se ve el CNAME; si falla, espere a que se propague el DNS."
fi

step "Añadiendo el dominio al App Service"
az webapp config hostname add -g "$RESOURCE_GROUP" --webapp-name "$APP_NAME" \
  --hostname "$CUSTOM_DOMAIN" -o none

step "Creando el certificado gestionado (gratuito) — puede tardar unos minutos"
THUMBPRINT="$(az webapp config ssl create -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --hostname "$CUSTOM_DOMAIN" --query thumbprint -o tsv)"

step "Activando HTTPS"
az webapp config ssl bind -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --certificate-thumbprint "$THUMBPRINT" --ssl-type SNI -o none

step "Cambiando la URL pública de la tienda a https://$CUSTOM_DOMAIN"
az webapp config appsettings set -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --settings EVERSHOP_HOME_URL="https://$CUSTOM_DOMAIN" -o none
# Para que futuras ejecuciones de deploy.sh mantengan el dominio
sed -i.bak "s/^USE_CUSTOM_DOMAIN=.*/USE_CUSTOM_DOMAIN='true'/" "$STATE_FILE" && rm -f "$STATE_FILE.bak"
az webapp restart -g "$RESOURCE_GROUP" -n "$APP_NAME"

echo
echo "Listo: https://$CUSTOM_DOMAIN"
