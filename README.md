# Tienda online · Fundación Andalusí de España

Tienda de la **Fundación Andalusí de España** (tienda.institutoalbayan.com), construida sobre [EverShop](https://evershop.io) 2.2.1
(Node.js + React + PostgreSQL), con:

- **Tema `albayan`** (`themes/albayan`): cabecera, pie, logo, portada y paleta de colores
  alineados con fundacionandalusi.org.
- **Pasarela Redsys** (`extensions/redsys`): TPV Virtual por redirección (tarjeta y Bizum),
  firma HMAC_SHA256_V1, notificación online, devoluciones desde el panel y cancelación
  automática de pedidos abandonados.
- **Email SMTP** (`extensions/smtp-mail`): confirmaciones de pedido por Microsoft 365,
  Azure Communication Services o cualquier SMTP.
- **Facturas Odoo** (`extensions/odoo`): cada pedido pagado genera su factura en Odoo, que
  se adjunta en PDF al email de confirmación; las devoluciones generan la factura rectificativa.
- **Infraestructura Azure** (`infra/main.bicep`) y despliegue continuo con GitHub Actions.
- Traducciones al español (`translations/es`).

EverShop se usa como dependencia npm fijada a una versión exacta (`@evershop/evershop@2.2.1`),
no como fork: toda la personalización vive en el tema y las extensiones. Así se pueden
aplicar actualizaciones de EverShop sin conflictos.

```
config/            Configuración (default.json, production.json)
extensions/redsys  Pasarela de pago Redsys
extensions/smtp-mail  Servicio de email SMTP
extensions/odoo    Facturación en Odoo
themes/albayan     Tema visual de la Fundación
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

## 2. Despliegue en Azure

Mismo esquema que **VillaDelCasar**: una **Web App de Azure App Service (Linux, Node 22)**
que arranca con `startup.sh`, sin contenedores. Cada `git push` a `main` la actualiza
mediante GitHub Actions. Además, EverShop necesita **Azure Database for PostgreSQL**
(no funciona con SQLite) y guarda las imágenes de producto en **Blob Storage**.

### 2.1 Crear todo con un solo comando

Lo más sencillo es **Azure Cloud Shell** (portal.azure.com → icono `>_` → *Bash*), que ya
trae Azure CLI, Node.js, git y zip:

```bash
git clone https://github.com/AJMESFAE/TiendaOnline.git
cd TiendaOnline
git checkout claude/blissful-albattani-zuz5ux   # hasta que se fusione en main
./infra/deploy.sh
```

Desde su equipo (Linux, macOS o WSL) haga antes `az login`. Necesita Node.js 20+ y `zip`.

Para **compartir el plan B1 de VillaDelCasar** y no pagar un segundo plan:

```bash
SHARE_PLAN_WITH_APP=villadelcasar ./infra/deploy.sh
```

En ese caso la tienda se crea en el mismo grupo de recursos que VillaDelCasar, porque
Azure lo exige. Un B1 tiene 1,75 GB de RAM para las dos webs: si va justo, suba el plan a
B2.

El script tarda unos 20 minutos la primera vez y hace esto:

1. Crea PostgreSQL, Storage y la Web App (`infra/main.bicep`), con todas las variables
   de entorno ya puestas.
2. Compila la tienda (`scripts/build-package.sh`), la sube con `az webapp deploy` y
   espera a que arranque.
3. En el primer arranque se crean las tablas y el usuario administrador.
4. Muestra la URL, el usuario y la contraseña del panel, y los registros DNS del dominio.

Las contraseñas se generan solas y se guardan en `infra/.deploy.env`, que no se sube a git.
Guarde una copia. Si lo pierde (por ejemplo, porque Cloud Shell se reinició), vuelva a
clonar el repositorio y ejecute `./infra/restore-state.sh`: lo regenera a partir de la
configuración de la Web App. Volver a ejecutar `./infra/deploy.sh` actualiza la infraestructura y el
código, y reutiliza las mismas contraseñas.

Opciones (variables de entorno antes del comando):

| Variable | Por defecto |
|---|---|
| `SHARE_PLAN_WITH_APP` | vacío: crea un plan propio |
| `RESOURCE_GROUP` | `rg-tienda-albayan` |
| `LOCATION` | `spaincentral`. Si Azure responde que la región «no acepta clientes nuevos», el script prueba solo otras regiones europeas (`FALLBACK_LOCATIONS` para cambiar la lista) |
| `APP_SKU` | `B1` |
| `ADMIN_EMAIL` | `admin@institutoalbayan.com` |
| `REDSYS_ENVIRONMENT`, `REDSYS_MERCHANT_CODE`, `REDSYS_TERMINAL`, `REDSYS_SECRET_KEY` | Entorno **público de pruebas** de Redsys: `test`, `999008881`, `1` y la clave pública |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Sin email hasta que se rellenen |

La tienda queda disponible primero en `https://<app>.azurewebsites.net`, con el pago de
pruebas de Redsys funcionando.

### 2.2 Despliegue automático con cada push (GitHub Actions)

Igual que en VillaDelCasar: *Portal de Azure → Web App → Deployment Center → Source:
GitHub*, con el repositorio y la rama. Azure añade al repositorio un workflow
(`.github/workflows/<rama>_<app>.yml`) y el secreto `AZUREAPPSERVICE_PUBLISHPROFILE_…`.

**El workflow que genera Azure hay que adaptarlo**, porque sube el código fuente sin
compilar. En este repositorio ya está adaptado para `albayantienda-app-vtcunta6scoqq`:
compila con `scripts/build-package.sh`, sube el ZIP ya listo y nunca lanza dos despliegues
a la vez. Si algún día se vuelve a conectar desde el Deployment Center y Azure regenera el
fichero, repita esos cambios (los pasos *Compilar, probar y empaquetar* y
`package: tienda.zip`).

Con el workflow activo, `deploy.sh` ya no sube el código: detecta el workflow y solo
crea o actualiza la infraestructura, para no chocar con el despliegue de GitHub. Para
forzar la subida desde el script: `DEPLOY_CODE=true ./infra/deploy.sh`.

### 2.3 Dominio tienda.institutoalbayan.com y HTTPS

> **Atención:** `tienda.institutoalbayan.com` apunta hoy a la tienda de **Shopify** en
> funcionamiento. Cambiar el CNAME deja de mostrar la tienda de Shopify. Hágalo solo
> cuando la tienda nueva esté probada (productos importados, pago con Redsys real y
> páginas legales) y se decida el cambio. Hasta entonces, trabaje con la dirección
> `https://<app>.azurewebsites.net`.

1. En el DNS de institutoalbayan.com cree los dos registros que muestra `deploy.sh` al
   terminar:

   | Tipo  | Nombre         | Valor |
   |-------|----------------|-------|
   | CNAME | `tienda`       | `<app>.azurewebsites.net` |
   | TXT   | `asuid.tienda` | id de verificación |

2. Cuando el DNS se haya propagado, ejecute `./infra/bind-domain.sh`. Añade el dominio,
   crea el certificado HTTPS gratuito de Azure y cambia la URL de la tienda, que Redsys
   usa para las URL de retorno y de notificación.

**Si el dominio se vinculó a mano** (por ejemplo `devtienda.fundacionandalusi.org` desde el
portal), ejecute `./infra/set-url.sh devtienda.fundacionandalusi.org`. EverShop construye
todos los enlaces absolutos con `EVERSHOP_HOME_URL`: el acceso al panel, las llamadas a la
API y las URL de Redsys. Si no coincide con el dominio por el que se entra, el panel
muestra *«Something went wrong! Please try again.»* al iniciar sesión y los pagos no
vuelven a la tienda.

### 2.4 Importar los productos de la tienda actual (Shopify)

**Si la tienda arranca sin ningún producto, los importa sola** desde
`https://tienda.institutoalbayan.com`. Se cambia el origen con `SHOPIFY_IMPORT_URL` y se
desactiva con `SHOPIFY_IMPORT=false`, ambas en las variables de entorno de Azure. Los
productos aparecen en la portada, en la sección *Productos*. Para importar a mano o
volver a importar:

```bash
./infra/import-products.sh --dry-run   # solo lista lo que va a importar
./infra/import-products.sh             # los crea en la tienda nueva
```

El script (`scripts/import-shopify.mjs`) lee el catálogo público de Shopify
(`/products.json`) y, por cada producto:

- descarga las imágenes y las sube a la tienda nueva (a Blob Storage);
- crea la categoría a partir del «tipo de producto» de Shopify;
- crea el producto con nombre, SKU, precio, peso, descripción e imágenes;
- respeta los productos marcados en Shopify como «sin envío».

Se puede repetir sin duplicar nada: un SKU que ya existe se omite. Guarda una copia de
los datos originales en `productos-shopify.json`.

Después, revise en el panel:
- el **stock**: se pone 100 si el producto está disponible, porque Shopify no publica la
  cantidad real;
- los **precios tachados**: el script avisa si había alguno.

### 2.5 Páginas legales

```bash
CONTACT_EMAIL=tienda@fundacionandalusi.org \
FOUNDATION_REGISTRY="Registro de Fundaciones de competencia estatal, n.º ..." \
SHIPPING_COST="4,95 € IVA incluido" SHIPPING_DAYS="2 a 5 días laborables" \
SHIPPING_PREP_DAYS="24-48 horas laborables" \
./infra/create-pages.sh
```

**La tienda crea automáticamente las páginas que falten cada vez que arranca**, con los
datos disponibles; las que ya existen no se tocan. Si define en Azure (*Configuración →
Variables de entorno*) `CONTACT_EMAIL`, `FOUNDATION_REGISTRY`, `SHIPPING_COST`,
`SHIPPING_DAYS` y `SHIPPING_PREP_DAYS`, se usarán en las páginas nuevas. Para
**actualizar** páginas ya creadas con datos nuevos, use el script de arriba.

El script crea o actualiza cinco páginas: `/aviso-legal`, `/politica-de-privacidad`,
`/politica-de-cookies`, `/condiciones-de-venta` y `/envios-y-devoluciones`. Las
direcciones `/page/...` redirigen a ellas. El texto está en `scripts/legal-pages.mjs`
y sigue la LSSI-CE, el RGPD y la LOPDGDD, y la ley de consumidores (TRLGDCU): titular,
desistimiento de 14 días con formulario modelo, garantía de 3 años, cookies solo
técnicas, etc.

Los datos que no se indiquen aparecen como **[COMPLETAR: …]**, y el script los lista al
terminar. Vuelva a ejecutarlo con esos datos para actualizar las páginas. Es un modelo:
conviene que lo revise quien lleve los temas legales de la Fundación.

Las páginas usan el diseño del tema (`themes/albayan/src/pages/cmsPageView`): cabecera
verde y dorada e índice lateral de páginas legales.

### 2.6 Variables de entorno (App Settings)

Las pone `deploy.sh`. Se pueden revisar en *Web App → Configuración → Variables de
entorno*; al guardar, Azure reinicia la app.

| Variable | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE=require` | PostgreSQL |
| `EVERSHOP_HOME_URL` | URL pública (`azurewebsites.net` y, tras `bind-domain.sh`, el dominio) |
| `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME` | Imágenes en Blob Storage |
| `REDSYS_*` | Datos del TPV (ver §3). Prevalecen sobre el panel de administración |
| `SMTP_*`, `MAIL_FROM` | Envío de emails |
| `ODOO_*` | Facturación en Odoo (ver §4) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Administrador creado en el primer arranque (después no se vuelve a tocar) |

*Comando de inicio* (*Configuración → Configuración general*): `bash startup.sh`.

### 2.7 Borrar

`./infra/destroy.sh` borra la tienda y pide confirmación. Si comparte plan con
VillaDelCasar, borra **solo** la Web App, la base de datos y el Storage de la tienda; no
toca VillaDelCasar ni el plan.

### 2.8 Otras opciones

El `Dockerfile` sigue disponible por si en el futuro se prefiere desplegar como contenedor.

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

## 4. Facturas con Odoo

Igual que en VillaDelCasar, la tienda emite las facturas en Odoo mediante su API JSON-2
(`POST <ODOO_URL>/json/2/<modelo>/<método>` con una clave de API).

**Cuándo**: al confirmarse el pago de un pedido (notificación de Redsys), justo antes de
enviar el email de confirmación:

1. Busca el cliente en Odoo por email (`res.partner`) o lo crea con la dirección de
   facturación del pedido.
2. Crea la factura (`account.move`, `out_invoice`) con una línea por producto, otra para el
   envío y, si hiciera falta, una de ajuste para que el total coincida al céntimo con el pedido.
3. La valida (`action_post`), descarga el PDF y lo **adjunta al email de confirmación**
   (`factura-INV-2026-00001.pdf`).
4. Guarda el número en la tabla `odoo_invoice` y en el historial del pedido
   («Factura INV/… generada en Odoo»). Nunca se factura dos veces el mismo pedido.

Los pedidos de **0 €** no se facturan: se envía el email de confirmación sin adjunto.

Si Odoo no responde, el email se envía igualmente sin factura y el error queda en el log;
la factura se puede crear después a mano en Odoo. En una **devolución** desde el panel
(botón Redsys) se crea la factura rectificativa (`out_refund`) por el importe devuelto.
El cobro no se registra en Odoo (lo hace Redsys); concílielo desde el extracto bancario.

**Configuración** (App Settings de la Web App, *Configuración → Variables de entorno*):

| Variable | Valor |
|---|---|
| `ODOO_URL` | URL de Odoo, p. ej. `https://fundacion.odoo.com` |
| `ODOO_API_KEY` | Clave de API de un usuario con permisos de facturación (*Preferencias → Seguridad de la cuenta → Nueva clave de API*). **No la comparta por chat ni la suba al repositorio** |
| `ODOO_PRODUCT_ID` | ID del producto de Odoo con el que se facturan las ventas (p. ej. «Venta tienda online», con el impuesto *IVA 4 % incluido en el precio* para libros) |
| `ODOO_SHIPPING_PRODUCT_ID` | Opcional: producto para la línea de envío (por defecto, `ODOO_PRODUCT_ID`) |
| `ODOO_JOURNAL_ID` | Opcional: diario de ventas (por defecto, el de Odoo) |

Los precios de la tienda llevan el IVA incluido, así que el impuesto del producto en Odoo
debe estar marcado como *Incluido en el precio*. Sin `ODOO_URL`, `ODOO_API_KEY` y
`ODOO_PRODUCT_ID` la extensión no hace nada.

---

## 5. Personalización del tema

- **Colores y tipografías**: `themes/albayan/src/pages/all/albayan.css`, sección
  *Paleta de fundacionandalusi.org*. Todas las pantallas (botones, enlaces, cabecera, pie y checkout) se
  alimentan de esas variables.
- **Menú, enlaces del pie y contacto**: `themes/albayan/src/components/frontStore/brand.ts`.
- **Logo**: el de la Fundación (`themes/albayan/public/brand/`). Si se sube otro en
  *Admin → Configuración → Tienda*, se usa ese.
- **Fuentes** (Google Fonts): `themeConfig.headTags` en `config/default.json`.
- **Portada**: `themes/albayan/src/pages/homepage/AlbayanHero.tsx`. Se pueden añadir bloques
  con el editor visual del panel.

Después de cualquier cambio: `npm run build` (o `npm run dev` mientras desarrolla).

---

## 6. Antes de abrir la tienda

- [ ] Subir el logo oficial y el favicon (*Admin → Configuración → Tienda*).
- [ ] Rellenar el email y el teléfono de contacto en `brand.ts`.
- [ ] Crear las páginas legales con `./infra/create-pages.sh` (ver §2.5), completar
      los datos pendientes y revisar el texto.
- [ ] Configurar zonas y tarifas de envío (*Admin → Configuración → Envíos*) e impuestos
      (IVA; los libros tienen IVA superreducido del 4 %).
- [ ] Datos del comercio real de Redsys y `REDSYS_ENVIRONMENT=live`.
- [ ] Buzón SMTP para los emails (`SMTP_*`).
- [ ] Variables `ODOO_*` para las facturas (ver §4).

## Licencia

GPL-3.0, la misma licencia que EverShop.
