#!/usr/bin/env bash
# =============================================================================
#  Despliegue completo de tienda.institutoalbayan.com en Azure
#
#  Crea (o actualiza) todo lo necesario y publica la tienda:
#    grupo de recursos · PostgreSQL · Blob Storage · Container Registry ·
#    App Service · imagen de la tienda · administrador inicial
#
#  Uso (Azure Cloud Shell en modo Bash, o Linux/macOS/WSL con Azure CLI):
#      az login                       # no hace falta en Cloud Shell
#      ./infra/deploy.sh
#
#  Se puede volver a ejecutar cuando se quiera: actualiza la infraestructura y
#  publica una imagen nueva con el código actual.
#
#  Opciones por variable de entorno (todas opcionales):
#      RESOURCE_GROUP   (rg-tienda-albayan)   LOCATION (westeurope)
#      PREFIX           (albayantienda)       APP_SKU  (B1)
#      ADMIN_EMAIL      (admin@institutoalbayan.com)
#      REDSYS_ENVIRONMENT/REDSYS_MERCHANT_CODE/REDSYS_TERMINAL/REDSYS_SECRET_KEY
#                       (por defecto: entorno PÚBLICO DE PRUEBAS de Redsys)
#      SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD MAIL_FROM
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
STATE_FILE="infra/.deploy.env"   # contraseñas generadas (no se sube a git)

# Valores guardados de una ejecución anterior (reutiliza las contraseñas).
# Una variable pasada en la línea de comandos tiene prioridad sobre la guardada.
if [[ -f "$STATE_FILE" ]]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[A-Z_]+$ ]] || continue
    if [[ -z "${!key:-}" ]]; then
      value="${value#\'}"; value="${value%\'}"
      printf -v "$key" '%s' "$value"
    fi
  done < "$STATE_FILE"
fi

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-tienda-albayan}"
LOCATION="${LOCATION:-westeurope}"
PREFIX="${PREFIX:-albayantienda}"
APP_SKU="${APP_SKU:-B1}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-tienda.institutoalbayan.com}"
USE_CUSTOM_DOMAIN="${USE_CUSTOM_DOMAIN:-false}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@institutoalbayan.com}"

# Redsys: entorno público de pruebas (datos publicados por Redsys para integración)
REDSYS_ENVIRONMENT="${REDSYS_ENVIRONMENT:-test}"
REDSYS_MERCHANT_CODE="${REDSYS_MERCHANT_CODE:-999008881}"
REDSYS_TERMINAL="${REDSYS_TERMINAL:-1}"
REDSYS_SECRET_KEY="${REDSYS_SECRET_KEY:-sq7HjrUOBfKmC576ILgskD5srU870gJ7}"

SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
MAIL_FROM="${MAIL_FROM:-Instituto Al-Bayān <tienda@institutoalbayan.com>}"

genpass() { # 24 caracteres: letras, números y un símbolo seguro
  echo "$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 22)A9"
}
DB_PASSWORD="${DB_PASSWORD:-$(genpass)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(genpass)}"

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
step "Comprobando Azure CLI"
command -v az >/dev/null || fail "Instale Azure CLI (https://aka.ms/azcli) o use Azure Cloud Shell."
az account show >/dev/null 2>&1 || fail "Inicie sesión con: az login"
az bicep install >/dev/null 2>&1 || true
echo "Suscripción: $(az account show --query name -o tsv)"

step "Guardando la configuración en $STATE_FILE"
umask 077
cat > "$STATE_FILE" <<EOF
RESOURCE_GROUP='$RESOURCE_GROUP'
LOCATION='$LOCATION'
PREFIX='$PREFIX'
APP_SKU='$APP_SKU'
CUSTOM_DOMAIN='$CUSTOM_DOMAIN'
USE_CUSTOM_DOMAIN='$USE_CUSTOM_DOMAIN'
ADMIN_EMAIL='$ADMIN_EMAIL'
ADMIN_PASSWORD='$ADMIN_PASSWORD'
DB_PASSWORD='$DB_PASSWORD'
REDSYS_ENVIRONMENT='$REDSYS_ENVIRONMENT'
REDSYS_MERCHANT_CODE='$REDSYS_MERCHANT_CODE'
REDSYS_TERMINAL='$REDSYS_TERMINAL'
REDSYS_SECRET_KEY='$REDSYS_SECRET_KEY'
SMTP_HOST='$SMTP_HOST'
SMTP_PORT='$SMTP_PORT'
SMTP_USER='$SMTP_USER'
SMTP_PASSWORD='$SMTP_PASSWORD'
MAIL_FROM='$MAIL_FROM'
EOF

step "Registrando los proveedores de recursos de Azure (solo tarda la primera vez)"
for ns in Microsoft.Web Microsoft.DBforPostgreSQL Microsoft.ContainerRegistry Microsoft.Storage; do
  az provider register --namespace "$ns" --wait >/dev/null
done

step "Creando el grupo de recursos $RESOURCE_GROUP ($LOCATION)"
az group create -n "$RESOURCE_GROUP" -l "$LOCATION" -o none

step "Creando la infraestructura (5-10 minutos la primera vez)"
DEPLOYMENT="tienda-$(date +%Y%m%d%H%M%S)"
az deployment group create -g "$RESOURCE_GROUP" -n "$DEPLOYMENT" \
  -f infra/main.bicep \
  -p prefix="$PREFIX" appServiceSku="$APP_SKU" \
     customDomain="$CUSTOM_DOMAIN" useCustomDomain="$USE_CUSTOM_DOMAIN" \
     adminEmail="$ADMIN_EMAIL" adminPassword="$ADMIN_PASSWORD" \
     dbAdminPassword="$DB_PASSWORD" \
     redsysEnvironment="$REDSYS_ENVIRONMENT" redsysMerchantCode="$REDSYS_MERCHANT_CODE" \
     redsysTerminal="$REDSYS_TERMINAL" redsysSecretKey="$REDSYS_SECRET_KEY" \
     smtpHost="$SMTP_HOST" smtpPort="$SMTP_PORT" smtpUser="$SMTP_USER" \
     smtpPassword="$SMTP_PASSWORD" mailFrom="$MAIL_FROM" \
  -o none

out() { az deployment group show -g "$RESOURCE_GROUP" -n "$DEPLOYMENT" --query "properties.outputs.$1.value" -o tsv; }
APP_NAME="$(out appName)"
ACR_NAME="$(out acrName)"
ACR_SERVER="$(out acrLoginServer)"
APP_HOST="$(out appDefaultHostname)"
HOME_URL="$(out homeUrl)"
VERIFICATION_ID="$(out customDomainVerificationId)"

TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
step "Construyendo la imagen de la tienda en Azure ($ACR_NAME, etiqueta $TAG, ~10 min)"
az acr build -r "$ACR_NAME" -t "tienda-albayan:$TAG" -t "tienda-albayan:latest" -f Dockerfile . -o none

step "Publicando la imagen en el App Service $APP_NAME"
az webapp config set -g "$RESOURCE_GROUP" -n "$APP_NAME" \
  --linux-fx-version "DOCKER|$ACR_SERVER/tienda-albayan:$TAG" -o none
az webapp restart -g "$RESOURCE_GROUP" -n "$APP_NAME"

step "Esperando a que la tienda arranque (el primer arranque crea las tablas)"
for i in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$APP_HOST/" || true)"
  if [[ "$code" == "200" ]]; then echo "La tienda responde."; break; fi
  printf '.'; sleep 15
  if [[ "$i" == 60 ]]; then
    echo; echo "La tienda todavía no responde. Revise los registros con:"
    echo "  az webapp log tail -g $RESOURCE_GROUP -n $APP_NAME"
  fi
done

cat <<EOF

=============================================================================
 TIENDA DESPLEGADA
=============================================================================
 Tienda:          $HOME_URL
 Administración:  $HOME_URL/admin
   Usuario:       $ADMIN_EMAIL
   Contraseña:    $ADMIN_PASSWORD   (guardada en $STATE_FILE)

 Redsys:          entorno '$REDSYS_ENVIRONMENT', comercio $REDSYS_MERCHANT_CODE
   Tarjeta de prueba: 4548 8100 0000 0003 · caducidad 12/49 · CVV 123

 DOMINIO $CUSTOM_DOMAIN
   1. En el DNS de institutoalbayan.com cree:
        CNAME  tienda         ->  $APP_HOST
        TXT    asuid.tienda   ->  $VERIFICATION_ID
   2. Cuando el DNS esté propagado, ejecute:  ./infra/bind-domain.sh
=============================================================================
EOF
