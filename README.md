# Tienda online · Instituto Al-Bayān

Tienda de **tienda.institutoalbayan.com**, construida sobre [EverShop](https://evershop.io) 2.2.1
(Node.js + React + PostgreSQL), con:

- **Tema `albayan`** (`themes/albayan`): cabecera, pie, logo, portada y paleta de colores
  alineados con institutoalbayan.com.
- **Pasarela Redsys** (`extensions/redsys`): TPV Virtual por redirección (tarjeta y Bizum),
  firma HMAC_SHA256_V1, notificación online, devoluciones desde el panel y cancelación
  automática de pedidos abandonados.
- **Email SMTP** (`extensions/smtp-mail`): confirmaciones de pedido por Microsoft 365,
  Azure Communication Services o cualquier SMTP.
- **Infraestructura Azure** (`infra/main.bicep`) y despliegue continuo con GitHub Actions.
- Traducciones al español (`translations/es`).

EverShop se usa como dependencia npm fijada a una versión exacta (`@evershop/evershop@2.2.1`),
no como fork: toda la personalización vive en el tema y las extensiones. Así se pueden
aplicar actualizaciones de EverShop sin conflictos.

```
config/            Configuración (default.json, production.json)
extensions/redsys  Pasarela de pago Redsys
extensions/smtp-mail  Servicio de email SMTP
themes/albayan     Tema visual del instituto
translations/es    Textos en español
infra/             Bicep de Azure
Dockerfile         Imagen de producción
```

---

## 1. Desarrollo local

Requisitos: Node.js 20 o superior y PostgreSQL 13 o superior.

```bash
cp .env.example .env         # ajuste DB_* y, si quiere, SMTP_*
createdb evershop
npm ci
npm run build                # compila extensiones y tema, y genera los bundles
npm start                    # http://localhost:3000 (las migraciones se aplican solas)
npx evershop user:create --name "Admin" --email admin@institutoalbayan.com --password "..."
```

- Panel de administración: http://localhost:3000/admin
- `npm run dev` arranca en modo desarrollo con recarga en caliente.
- `npm test` ejecuta las pruebas de la firma Redsys (se contrastan con `openssl`).
- Datos de ejemplo: `npx evershop seed --all`. **No lo ejecute en producción.**

`.env.example` trae ya las credenciales públicas del **comercio de pruebas de Redsys**
(FUC 999008881), así que el pago funciona en modo pruebas desde el primer momento.
Para que Redsys pueda enviar la notificación a su máquina local hace falta una URL pública,
por ejemplo con `ngrok http 3000` y `EVERSHOP_HOME_URL=https://xxxx.ngrok.app`.

---

## 2. Despliegue en Azure (automático)

Arquitectura: **App Service Linux (contenedor)** → **Azure Database for PostgreSQL
Flexible Server** + **Blob Storage** (imágenes de producto). La imagen se construye en la
nube con **Azure Container Registry**, así que no hace falta Docker en su equipo.

### 2.1 Crear todo con un solo comando

La forma más sencilla es usar **Azure Cloud Shell** (portal.azure.com → icono `>_` →
*Bash*), que ya trae Azure CLI y git:

```bash
git clone https://github.com/ajmesfae/tiendaonline.git
cd tiendaonline
git checkout claude/blissful-albattani-zuz5ux   # hasta que se fusione en main
./infra/deploy.sh
```

Desde su propio equipo (Linux, macOS o WSL) haga antes `az login`.

El script tarda unos 20 minutos la primera vez y hace esto:

1. Registra los proveedores de Azure y crea el grupo `rg-tienda-albayan` en `westeurope`.
2. Crea PostgreSQL, Storage, Container Registry y App Service (`infra/main.bicep`).
3. Construye la imagen de la tienda en Azure y la publica.
4. Espera a que arranque. El primer arranque crea las tablas y el usuario administrador.
5. Muestra la URL, el usuario y la contraseña del panel, y los registros DNS del dominio.

Las contraseñas se generan solas y se guardan en `infra/.deploy.env`, que no se sube a
git. Guarde una copia de ese fichero. Para publicar cambios, vuelva a ejecutar
`./infra/deploy.sh`: reutiliza las mismas contraseñas.

Opciones (variables de entorno antes del comando):

```bash
LOCATION=spaincentral ADMIN_EMAIL=tienda@institutoalbayan.com ./infra/deploy.sh
```

| Variable | Por defecto |
|---|---|
| `RESOURCE_GROUP` | `rg-tienda-albayan` |
| `LOCATION` | `westeurope` (si la suscripción no admite PostgreSQL allí, pruebe `spaincentral` o `northeurope`) |
| `APP_SKU` | `B1` |
| `ADMIN_EMAIL` | `admin@institutoalbayan.com` |
| `REDSYS_ENVIRONMENT`, `REDSYS_MERCHANT_CODE`, `REDSYS_TERMINAL`, `REDSYS_SECRET_KEY` | Entorno **público de pruebas** de Redsys (`test`, `999008881`, `1`, clave pública) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Sin email hasta que se rellenen |

La tienda queda disponible primero en `https://<app>.azurewebsites.net` con Redsys de
pruebas funcionando.

### 2.2 Dominio tienda.institutoalbayan.com y HTTPS

1. En el DNS de institutoalbayan.com cree los dos registros que muestra `deploy.sh` al
   terminar:

   | Tipo  | Nombre         | Valor |
   |-------|----------------|-------|
   | CNAME | `tienda`       | `<app>.azurewebsites.net` |
   | TXT   | `asuid.tienda` | id de verificación |

2. Cuando el DNS se haya propagado, ejecute `./infra/bind-domain.sh`. Añade el dominio,
   crea el certificado HTTPS gratuito de Azure y cambia la URL de la tienda, que también
   usa Redsys para las URL de retorno y notificación.

### 2.3 Borrar todo

`./infra/destroy.sh` elimina el grupo de recursos completo, base de datos incluida.
Pide confirmación.

### 2.4 Despliegue continuo con GitHub Actions (opcional)

`.github/workflows/deploy.yml` ejecuta las pruebas en cada PR y, en `main`, construye la
imagen en el ACR y la despliega. Configure en el repositorio:

- **Secretos**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, de una
  aplicación de Entra ID con credencial federada para este repositorio y rol *Contributor*
  sobre el grupo de recursos y *AcrPush* sobre el registro.
- **Variables**: `AZURE_RESOURCE_GROUP`, `ACR_NAME`, `WEBAPP_NAME`.

### 2.5 Variables de entorno (App Settings)

Las fija el Bicep; se pueden cambiar en *App Service → Configuración*:

| Variable | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE=require` | PostgreSQL |
| `EVERSHOP_HOME_URL` | `https://tienda.institutoalbayan.com` (URLs absolutas y de retorno de Redsys) |
| `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME` | Imágenes en Blob Storage |
| `REDSYS_*` | Datos del TPV (ver §3). Si están definidas, prevalecen sobre el panel de administración |
| `SMTP_*`, `MAIL_FROM` | Envío de emails |

Para los secretos se recomienda usar referencias a **Key Vault**
(`@Microsoft.KeyVault(SecretUri=...)`) en lugar de valores en claro.

---

## 3. Redsys

### 3.1 Cómo funciona

1. El cliente elige **Tarjeta (Redsys)** y pulsa *Pagar ahora*. Se crea el pedido en estado
   *Pendiente* y el navegador envía un formulario firmado a Redsys.
2. Redsys envía la **notificación online** (servidor a servidor) a
   `https://tienda.institutoalbayan.com/api/redsys/notification`. Se verifican la firma,
   el importe, la moneda y el comercio, y el pedido pasa a **Pagado**. En ese momento se
   envía el email de confirmación.
3. El cliente vuelve a `/redsys/ok/<pedido>` (página de pedido completado) o a
   `/redsys/ko/<pedido>`. En este último caso el pedido se cancela, se repone el stock y se
   recupera el carrito para que pueda reintentarlo.
4. Un cron (cada 15 min) cancela los pedidos Redsys que llevan más de 3 horas sin pagar
   (`system.redsys.abandonedAfterHours` en `config/default.json`).
5. **Devoluciones**: en *Admin → Pedidos → (pedido)* aparece el botón *Reembolso*, que admite
   devoluciones totales o parciales por la API REST de Redsys.

El procesamiento es idempotente: aunque la notificación y el retorno lleguen varias veces o
en cualquier orden, el pago se registra y el email se envía una sola vez.

### 3.2 Configuración en el Portal de Administración de Redsys

En el portal del TPV (canales.redsys.es), para su comercio y terminal:

- **Tipo de notificación**: *HTTP* (notificación online) → la URL se envía en cada operación.
- **Parámetros en las URLs**: *Sí* (recomendado; se usa como respaldo de la notificación).
- **Envío de notificación**: *síncrona* o *asíncrona*; las dos valen.
- Copie la **clave de firma SHA-256** a `REDSYS_SECRET_KEY`.
- Si tiene Bizum contratado, `REDSYS_PAY_METHODS` vacío muestra tarjeta y Bizum.

### 3.3 Pruebas y paso a real

- Entorno de pruebas: `REDSYS_ENVIRONMENT=test`. Tarjeta de pruebas **4548 8100 0000 0003**,
  caducidad **12/49**, CVV **123**.
- Para pasar a real: el banco le facilita el FUC, el terminal y la clave de producción.
  Cambie `REDSYS_ENVIRONMENT=live` y los tres datos, y haga una compra real de importe bajo
  y devuélvala desde el panel.

---

## 4. Personalización del tema

- **Colores y tipografías**: `themes/albayan/src/pages/all/albayan.css`, sección
  *Paleta de marca*. Todas las pantallas (botones, enlaces, cabecera, pie y checkout) se
  alimentan de esas variables.
- **Menú, enlaces del pie y contacto**: `themes/albayan/src/components/frontStore/brand.ts`.
- **Logo**: súbalo en *Admin → Configuración → Tienda*. Mientras no haya logo se muestra el
  logotipo tipográfico «البيان Al-Bayān».
- **Fuentes** (Google Fonts): `themeConfig.headTags` en `config/default.json`.
- **Portada**: `themes/albayan/src/pages/homepage/AlbayanHero.tsx`. Se pueden añadir bloques
  con el editor visual del panel.

Después de cualquier cambio: `npm run build` (o `npm run dev` mientras desarrolla).

---

## 5. Antes de abrir la tienda

- [ ] Ajustar los colores y fuentes exactos de institutoalbayan.com en `albayan.css` (ver nota).
- [ ] Subir el logo oficial y el favicon (*Admin → Configuración → Tienda*).
- [ ] Rellenar el email y el teléfono de contacto en `brand.ts`.
- [ ] Crear en *Admin → CMS → Páginas* las páginas legales enlazadas en el pie
      (`aviso-legal`, `politica-de-privacidad`, `politica-de-cookies`,
      `condiciones-de-venta`, `envios-y-devoluciones`), obligatorias según la LSSI y la
      normativa de consumo (derecho de desistimiento de 14 días).
- [ ] Configurar zonas y tarifas de envío (*Admin → Configuración → Envíos*) e impuestos
      (IVA; los libros tienen IVA superreducido del 4 %).
- [ ] Datos del comercio real de Redsys y `REDSYS_ENVIRONMENT=live`.
- [ ] Buzón SMTP para los emails (`SMTP_*`).

> **Nota sobre la identidad visual.** Durante el desarrollo no se pudo acceder a
> institutoalbayan.com desde el entorno de construcción. La paleta actual (verde oscuro y
> dorado, con Cormorant Garamond, Lato y Amiri) es provisional y está centralizada en
> `albayan.css` para sustituirla en un solo sitio por los valores exactos de la web.

## Licencia

GPL-3.0, la misma licencia que EverShop.
