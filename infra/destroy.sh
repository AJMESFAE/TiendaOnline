#!/usr/bin/env bash
# Elimina TODOS los recursos de la tienda en Azure (base de datos incluida).
# Uso: ./infra/destroy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
[[ -f infra/.deploy.env ]] && source infra/.deploy.env
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-tienda-albayan}"
read -r -p "Se borrará el grupo '$RESOURCE_GROUP' con la base de datos y las imágenes. Escriba BORRAR para continuar: " answer
[[ "$answer" == "BORRAR" ]] || { echo "Cancelado."; exit 1; }
az group delete -n "$RESOURCE_GROUP" --yes --no-wait
echo "Borrado en curso (tarda unos minutos)."
