#!/usr/bin/env bash
# =============================================================================
#  Conecta GitHub Actions con Azure (OIDC, sin contraseñas) para que cada push
#  a main despliegue la tienda sola (.github/workflows/main_tienda-albayan.yml).
#
#  Crea una aplicación de Entra ID con credencial federada para este
#  repositorio y le da permiso SOLO sobre la Web App de la tienda.
#
#  Uso:  ./infra/setup-github.sh [owner/repo]     (por defecto AJMESFAE/TiendaOnline)
#  Requisito: haber ejecutado antes ./infra/deploy.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
STATE_FILE="infra/.deploy.env"
[[ -f "$STATE_FILE" ]] || { echo "Ejecute primero ./infra/deploy.sh"; exit 1; }
# shellcheck disable=SC1090
source "$STATE_FILE"
REPO="${1:-AJMESFAE/TiendaOnline}"

APP_ID_RES="$(az webapp list -g "$RESOURCE_GROUP" --query "[?starts_with(name, '${PREFIX}-app-')].id | [0]" -o tsv)"
APP_NAME="${APP_ID_RES##*/}"
[[ -n "$APP_NAME" ]] || { echo "No se encuentra la Web App de la tienda en $RESOURCE_GROUP"; exit 1; }

echo "==> Creando la aplicación de Entra ID 'github-$APP_NAME'"
CLIENT_ID="$(az ad app list --display-name "github-$APP_NAME" --query '[0].appId' -o tsv)"
if [[ -z "$CLIENT_ID" ]]; then
  CLIENT_ID="$(az ad app create --display-name "github-$APP_NAME" --query appId -o tsv)"
fi
az ad sp show --id "$CLIENT_ID" >/dev/null 2>&1 || az ad sp create --id "$CLIENT_ID" -o none

echo "==> Credencial federada para $REPO (entorno 'production')"
if ! az ad app federated-credential list --id "$CLIENT_ID" --query "[?name=='github-production']" -o tsv | grep -q .; then
  az ad app federated-credential create --id "$CLIENT_ID" --parameters "{
    \"name\": \"github-production\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${REPO}:environment:production\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" -o none
fi

echo "==> Permiso 'Website Contributor' sobre la Web App $APP_NAME"
az role assignment create --assignee "$CLIENT_ID" --role "Website Contributor" \
  --scope "$APP_ID_RES" -o none 2>/dev/null || true

TENANT_ID="$(az account show --query tenantId -o tsv)"
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  echo "==> Guardando secretos y variable en GitHub ($REPO)"
  gh secret set AZURE_CLIENT_ID -R "$REPO" -b "$CLIENT_ID"
  gh secret set AZURE_TENANT_ID -R "$REPO" -b "$TENANT_ID"
  gh secret set AZURE_SUBSCRIPTION_ID -R "$REPO" -b "$SUBSCRIPTION_ID"
  gh variable set AZURE_WEBAPP_NAME -R "$REPO" -b "$APP_NAME"
  echo "Listo. El próximo push a main desplegará la tienda."
else
  cat <<EOF

Añada en GitHub → $REPO → Settings → Secrets and variables → Actions:

  Secrets (pestaña "Secrets"):
    AZURE_CLIENT_ID        $CLIENT_ID
    AZURE_TENANT_ID        $TENANT_ID
    AZURE_SUBSCRIPTION_ID  $SUBSCRIPTION_ID

  Variable (pestaña "Variables"):
    AZURE_WEBAPP_NAME      $APP_NAME

Después, el próximo push a main desplegará la tienda.
EOF
fi
