#!/usr/bin/env bash
# Cambia la URL pública de la tienda (EVERSHOP_HOME_URL) a un dominio ya
# vinculado al App Service, p. ej. devtienda.institutoalbayan.com.
#
# EverShop construye con esa URL todos los enlaces absolutos: el formulario de
# acceso al panel, las llamadas del navegador a la API y las URL de retorno y
# notificación de Redsys. Si no coincide con el dominio por el que se entra,
# el navegador bloquea esas peticiones (p. ej. "Something went wrong" al
# iniciar sesión en /admin).
#
# Uso:  ./infra/set-url.sh devtienda.institutoalbayan.com
set -euo pipefail
cd "$(dirname "$0")/.."
DOMAIN="${1:?Indique el dominio, p. ej. ./infra/set-url.sh devtienda.institutoalbayan.com}"
DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN%%/*}"
STATE_FILE="infra/.deploy.env"
# shellcheck disable=SC1090
[[ -f "$STATE_FILE" ]] && source "$STATE_FILE"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-tienda-albayan}"
PREFIX="${PREFIX:-albayantienda}"

APP_NAME="$(az webapp list -g "$RESOURCE_GROUP" --query "[?starts_with(name, '${PREFIX}-app-')].name | [0]" -o tsv)"
[[ -n "$APP_NAME" ]] || { echo "No encuentro la Web App en $RESOURCE_GROUP"; exit 1; }

if [[ "$DOMAIN" != *.azurewebsites.net ]] && \
   ! az webapp config hostname list -g "$RESOURCE_GROUP" --webapp-name "$APP_NAME" --query "[].name" -o tsv | grep -qx "$DOMAIN"; then
  echo "Aviso: $DOMAIN no está vinculado a $APP_NAME. Vincúlelo antes (Portal → Dominios personalizados, o ./infra/bind-domain.sh)."
  exit 1
fi

echo "==> EVERSHOP_HOME_URL = https://$DOMAIN"
az webapp config appsettings set -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --settings EVERSHOP_HOME_URL="https://$DOMAIN" -o none

# Para que deploy.sh mantenga este dominio en futuras ejecuciones.
if [[ -f "$STATE_FILE" ]]; then
  if [[ "$DOMAIN" == *.azurewebsites.net ]]; then
    sed -i.bak "s|^USE_CUSTOM_DOMAIN=.*|USE_CUSTOM_DOMAIN='false'|" "$STATE_FILE"
  else
    sed -i.bak "s|^CUSTOM_DOMAIN=.*|CUSTOM_DOMAIN='$DOMAIN'|; s|^USE_CUSTOM_DOMAIN=.*|USE_CUSTOM_DOMAIN='true'|" "$STATE_FILE"
  fi
  rm -f "$STATE_FILE.bak"
fi

echo "==> Reiniciando la tienda"
az webapp restart -g "$RESOURCE_GROUP" -n "$APP_NAME"
echo "Listo. Espere 1-2 minutos y entre en https://$DOMAIN/admin"
