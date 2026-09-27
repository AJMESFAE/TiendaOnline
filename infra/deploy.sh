#!/usr/bin/env bash
# =============================================================================
#  Despliegue completo de tienda.institutoalbayan.com en Azure
#
#  Crea (o actualiza) todo lo necesario y publica la tienda, con el mismo
#  esquema que VillaDelCasar (Web App Linux Node 22 + startup.sh):
#    grupo de recursos · PostgreSQL · Blob Storage · App Service ·
#    código compilado · administrador inicial
#
#  Uso (Azure Cloud Shell en modo Bash, o Linux/macOS/WSL con Azure CLI,
#  Node.js 20+ y zip):
#      az login                       # no hace falta en Cloud Shell
#      ./infra/deploy.sh
#
#  Se puede volver a ejecutar cuando se quiera: actualiza la infraestructura y
#  publica el código actual.
#
#  Opciones por variable de entorno (todas opcionales):
#      RESOURCE_GROUP   (rg-tienda-albayan)   LOCATION (spaincentral; si no
#                       admite clientes nuevos se prueban otras regiones)
#      PREFIX           (albayantienda)       APP_SKU  (B1)
#      SHARE_PLAN_WITH_APP  nombre de otra Web App (p. ej. villadelcasar) cuyo
#                       plan se reutiliza en vez de crear uno nuevo
#      ADMIN_EMAIL      (admin@institutoalbayan.com)
#      REDSYS_ENVIRONMENT/REDSYS_MERCHANT_CODE/REDSYS_TERMINAL/REDSYS_SECRET_KEY
#                       (por defecto: entorno PÚBLICO DE PRUEBAS de Redsys)
#      SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD MAIL_FROM
#      DEPLOY_CODE      true/false: subir el código desde aquí (por defecto,
#                       false si ya hay un workflow de GitHub para la Web App)
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
LOCATION="${LOCATION:-spaincentral}"
PREFIX="${PREFIX:-albayantienda}"
APP_SKU="${APP_SKU:-B1}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-tienda.institutoalbayan.com}"
USE_CUSTOM_DOMAIN="${USE_CUSTOM_DOMAIN:-false}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@institutoalbayan.com}"
SHARE_PLAN_WITH_APP="${SHARE_PLAN_WITH_APP:-}"

# Redsys: entorno público de pruebas (datos publicados por Redsys para integración)
REDSYS_ENVIRONMENT="${REDSYS_ENVIRONMENT:-test}"
REDSYS_MERCHANT_CODE="${REDSYS_MERCHANT_CODE:-999008881}"
REDSYS_TERMINAL="${REDSYS_TERMINAL:-1}"
REDSYS_SECRET_KEY="${REDSYS_SECRET_KEY:-sq7HjrUOBfKmC576ILgskD5srU870gJ7}"

SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
MAIL_FROM="${MAIL_FROM:-Fundación Andalusí <tienda@institutoalbayan.com>}"

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
command -v node >/dev/null || fail "Hace falta Node.js 20 o superior (Cloud Shell ya lo trae)."
command -v zip >/dev/null || fail "Hace falta el comando zip."
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
SHARE_PLAN_WITH_APP='$SHARE_PLAN_WITH_APP'
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
for ns in Microsoft.Web Microsoft.DBforPostgreSQL Microsoft.Storage; do
  az provider register --namespace "$ns" --wait >/dev/null
done

EXISTING_PLAN_ID=""
if [[ -n "$SHARE_PLAN_WITH_APP" ]]; then
  step "Buscando el plan de App Service de '$SHARE_PLAN_WITH_APP' para compartirlo"
  EXISTING_PLAN_ID="$(az webapp list --query "[?name=='$SHARE_PLAN_WITH_APP'].serverFarmId | [0]" -o tsv)"
  [[ -n "$EXISTING_PLAN_ID" ]] || fail "No encuentro la Web App '$SHARE_PLAN_WITH_APP' en esta suscripción."
  LOCATION="$(az appservice plan show --ids "$EXISTING_PLAN_ID" --query location -o tsv)"
  # Azure exige que la Web App esté en el mismo grupo de recursos que su plan.
  RESOURCE_GROUP="$(az appservice plan show --ids "$EXISTING_PLAN_ID" --query resourceGroup -o tsv)"
  sed -i.bak "s|^RESOURCE_GROUP=.*|RESOURCE_GROUP='$RESOURCE_GROUP'|; s|^LOCATION=.*|LOCATION='$LOCATION'|" "$STATE_FILE"
  rm -f "$STATE_FILE.bak"
  echo "Plan: $EXISTING_PLAN_ID ($LOCATION). La tienda se crea en el grupo $RESOURCE_GROUP."
  echo "Aviso: un plan B1 tiene 1,75 GB de RAM para las dos webs; si va justo, suba a B2."
fi

# El grupo solo guarda metadatos: si ya existe (aunque sea en otra región) se
# reutiliza; los recursos se crean en la región elegida más abajo.
if [[ -z "$SHARE_PLAN_WITH_APP" && "$(az group exists -n "$RESOURCE_GROUP")" != "true" ]]; then
  step "Creando el grupo de recursos $RESOURCE_GROUP ($LOCATION)"
  az group create -n "$RESOURCE_GROUP" -l "$LOCATION" -o none
fi

step "Creando la infraestructura (5-10 minutos la primera vez)"
# Algunas regiones no admiten clientes nuevos en ciertas suscripciones
# ("not accepting new customers"). Si pasa, se prueba la siguiente región.
# Con plan compartido la región es la del plan y no se puede cambiar.
if [[ -n "$SHARE_PLAN_WITH_APP" ]]; then
  REGIONS=("$LOCATION")
else
  REGIONS=("$LOCATION")
  for r in ${FALLBACK_LOCATIONS:-spaincentral francecentral northeurope swedencentral germanywestcentral italynorth uksouth}; do
    [[ "$r" == "$LOCATION" ]] || REGIONS+=("$r")
  done
fi

DEPLOYED=""
ERR_FILE="$(mktemp)"
for REGION in "${REGIONS[@]}"; do
  echo "Región: $REGION"
  DEPLOYMENT="tienda-$(date +%Y%m%d%H%M%S)"
  if az deployment group create -g "$RESOURCE_GROUP" -n "$DEPLOYMENT" \
    -f infra/main.bicep \
    -p location="$REGION" prefix="$PREFIX" appServiceSku="$APP_SKU" existingPlanId="$EXISTING_PLAN_ID" \
       customDomain="$CUSTOM_DOMAIN" useCustomDomain="$USE_CUSTOM_DOMAIN" \
       adminEmail="$ADMIN_EMAIL" adminPassword="$ADMIN_PASSWORD" \
       dbAdminPassword="$DB_PASSWORD" \
       redsysEnvironment="$REDSYS_ENVIRONMENT" redsysMerchantCode="$REDSYS_MERCHANT_CODE" \
       redsysTerminal="$REDSYS_TERMINAL" redsysSecretKey="$REDSYS_SECRET_KEY" \
       smtpHost="$SMTP_HOST" smtpPort="$SMTP_PORT" smtpUser="$SMTP_USER" \
       smtpPassword="$SMTP_PASSWORD" mailFrom="$MAIL_FROM" \
    -o none 2>"$ERR_FILE"; then
    DEPLOYED="$REGION"
    break
  fi
  if grep -qiE "not accepting new customers|RequestDisallowedByAzure|LocationIsOfferRestricted|locationineligible|SkuNotAvailable|NoRegisteredProviderFound|not available in (the )?(location|region)" "$ERR_FILE"; then
    echo "  La región $REGION no está disponible para esta suscripción; pruebo otra."
    continue
  fi
  cat "$ERR_FILE" >&2
  fail "El despliegue ha fallado (ver el error de arriba)."
done
if [[ -z "$DEPLOYED" ]]; then
  cat "$ERR_FILE" >&2
  fail "Ninguna región admite los recursos. Pruebe con FALLBACK_LOCATIONS=\"<regiones>\" o revise las restricciones de la suscripción."
fi
rm -f "$ERR_FILE"
LOCATION="$DEPLOYED"
sed -i.bak "s|^LOCATION=.*|LOCATION='$LOCATION'|" "$STATE_FILE" && rm -f "$STATE_FILE.bak"
echo "Infraestructura creada en $LOCATION"

out() { az deployment group show -g "$RESOURCE_GROUP" -n "$DEPLOYMENT" --query "properties.outputs.$1.value" -o tsv; }
APP_NAME="$(out appName)"
APP_HOST="$(out appDefaultHostname)"
HOME_URL="$(out homeUrl)"
VERIFICATION_ID="$(out customDomainVerificationId)"

# Si GitHub Actions ya despliega esta Web App (workflow del Deployment Center),
# no se sube el código desde aquí: dos despliegues simultáneos hacen que Kudu
# rechace uno (error 400/409). Forzar con DEPLOY_CODE=true.
if [[ -z "${DEPLOY_CODE:-}" ]]; then
  if grep -rqs -- "$APP_NAME" .github/workflows; then DEPLOY_CODE=false; else DEPLOY_CODE=true; fi
fi

if [[ "$DEPLOY_CODE" == "true" ]]; then
  step "Compilando la tienda y generando el paquete (5-10 minutos)"
  PACKAGE="$(mktemp -d)/tienda.zip"
  scripts/build-package.sh "$PACKAGE"

  step "Subiendo el código al App Service $APP_NAME"
  az webapp deploy -g "$RESOURCE_GROUP" -n "$APP_NAME" --src-path "$PACKAGE" \
    --type zip --clean true --restart true --timeout 1800000 -o none
  rm -f "$PACKAGE"
else
  step "El código lo publica GitHub Actions (workflow de .github/workflows para $APP_NAME)"
  echo "Haga push a la rama del workflow, o lance el workflow a mano en GitHub → Actions."
fi

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
