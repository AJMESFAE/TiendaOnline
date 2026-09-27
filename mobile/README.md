# App de gestión de la tienda (Android e iOS)

App móvil para administrar la tienda desde el teléfono, al estilo de la app de Shopify.
Es una sola base de código ([Expo](https://expo.dev) / React Native) que se compila
para **Android** y para **iOS**.

Habla directamente con la API de administración de EverShop (la misma que usa el panel
web `/admin`), así que no necesita ningún servidor adicional.

## Qué se puede hacer

**Inicio**
- Importe y número de pedidos, y pedidos por enviar (cobrados o contra reembolso).
- Gráfico del importe de los pedidos de los últimos 6 días, semanas o meses (toque una barra para ver su importe).
- Lista de los pedidos por enviar.

**Pedidos**
- Lista con búsqueda (número, nombre o email) y filtros: *Por enviar*, *Pagados*, *Enviados*, *Cancelados*.
- Detalle: artículos, totales, cliente (con enlaces para escribir o llamar), direcciones,
  nota del cliente e historial.
- **Marcar como enviado**, con transportista y número de seguimiento, avisando al cliente por email.
- **Marcar como entregado**.
- **Cancelar el pedido** (repone el stock).
- **Devolver el importe** total o parcial por el TPV de **Redsys** (la extensión `extensions/redsys`).

**Artículos**
- Lista con búsqueda, foto, precio y stock.
- **Crear un artículo nuevo** y editar los existentes: nombre, SKU, precio, descripción,
  stock, peso, envío sí/no, categoría, impuesto, activo y visible.
- **Fotos desde la galería o haciéndolas con la cámara**; se suben a la tienda (Blob Storage
  en Azure). La primera es la principal: toque otra para cambiarla.
- Borrar artículos.

**Avisos de pedido nuevo**
- Cada móvil con la sesión abierta recibe una notificación cuando se confirma un pedido:
  *«Nuevo pedido #10023 — María López · 34,90 € · 2 artículos»*. Al tocarla se abre el pedido.
- Con Redsys, el aviso llega **cuando el pago se confirma** (no por carritos abandonados);
  con contra reembolso, al hacerse el pedido.
- El estado se ve en *Ajustes → Avisos*. Al cerrar sesión, el móvil deja de recibirlos; también
  un móvil que no abre la app con la sesión iniciada en 30 días.

Lo demás (clientes, cupones, zonas de envío, impuestos, diseño) sigue en el panel web;
la pestaña *Ajustes* tiene un botón para abrirlo.

## Inicio de sesión y seguridad

Se entra con el **mismo email y contraseña que en el panel web**. La app pide a la tienda
un token (`POST /api/user/tokens`), lo guarda cifrado en el llavero del teléfono
(Keychain en iOS, Keystore en Android) y nunca guarda la contraseña. El token de acceso
dura 15 minutos y se renueva solo; tras **15 horas** sin renovar hay que volver a
introducir la contraseña.

Para emitir esos tokens la tienda necesita dos secretos, `JWT_ADMIN_SECRET` y
`JWT_ADMIN_REFRESH_SECRET`:

- **En Azure no hay que hacer nada**: `scripts/start.mjs` los genera a partir de
  `DB_PASSWORD`, así que basta con desplegar esta versión de la tienda. Si prefiere
  secretos propios, defínalos en las App Settings y se usarán esos.
- **En local**, añádalos al `.env` (vea `.env.example`).

Si faltan, la app lo dice al iniciar sesión.

## Probarla en el móvil en 5 minutos (Expo Go)

Requisitos: Node.js 20 o superior en el ordenador y la app **Expo Go** en el teléfono
(App Store o Google Play).

```bash
cd mobile
npm ci
npx expo start
```

Escanee el código QR con la cámara (iPhone) o con Expo Go (Android). El teléfono y el
ordenador deben estar en la misma red; si no, use `npx expo start --tunnel`.

En la pantalla de acceso la dirección de la tienda ya viene rellena
(`https://tienda.fundacionandalusi.org`). Para probar con otra, por ejemplo
`https://devtienda.fundacionandalusi.org`, cámbiela ahí. La dirección por defecto está en
`app.json` → `expo.extra.defaultStoreUrl`.

## Compilar e instalar la app de verdad (EAS Build)

Las apps se compilan en la nube con **EAS** (el servicio de Expo), sin Xcode ni Android
Studio. Hace falta una cuenta gratuita en [expo.dev](https://expo.dev).

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init          # solo la primera vez: vincula el proyecto a su cuenta
```

**Android (APK para instalar directamente, sin Google Play):**

```bash
npx eas-cli@latest build --platform android --profile preview
```

Al terminar muestra un enlace y un QR para descargar el `.apk` e instalarlo en los
móviles del equipo.

**iOS:** Apple solo permite instalar apps firmadas, así que hace falta una cuenta de
**Apple Developer** (99 $/año).

```bash
npx eas-cli@latest build --platform ios --profile preview      # instalación interna (registra los iPhone)
npx eas-cli@latest build --platform ios --profile production   # para TestFlight / App Store
npx eas-cli@latest submit --platform ios
```

**Publicar en las tiendas** (opcional; para uso interno basta con lo anterior):

- Google Play: cuenta de desarrollador (25 $, pago único),
  `eas build --platform android --profile production` y `eas submit --platform android`.
- App Store: `eas submit --platform ios` y rellenar la ficha en App Store Connect.
  Como es una app de uso interno, lo más sencillo es distribuirla por **TestFlight**.

Identificador de la app en las dos plataformas: `org.fundacionandalusi.tienda.gestion`
(`app.json`). Cámbielo antes de la primera compilación si la Fundación usa otro.

## Configurar los avisos de pedido nuevo

Los avisos **solo funcionan en la app compilada** (EAS Build), no en Expo Go. El servidor
los envía con el servicio gratuito Expo Push, que los reenvía a Apple y a Google. Hay que
darle a Expo las credenciales de cada plataforma una sola vez y **volver a compilar**.

**Requisito:** `mobile/app.json` debe tener `expo.extra.eas.projectId` (lo añade
`eas init`). Súbalo al repositorio; sin él la app muestra «Falta el projectId de EAS».

**iOS** (clave de APNs de la cuenta de Apple de la Fundación):

```bash
npx eas-cli@latest credentials --platform ios
```

Elija el perfil *production* → *Push Notifications: Manage your Apple Push Notifications
Key* → *Set up Push Notifications for your project* → genere una clave nueva. Después,
`eas build --platform ios --profile production` y `eas submit`.

**Android** (Firebase Cloud Messaging, gratuito):

1. En [console.firebase.google.com](https://console.firebase.google.com) cree un proyecto
   (por ejemplo «Tienda Fundación») y añada una app **Android** con el paquete
   `org.fundacionandalusi.tienda.gestion`.
2. Descargue `google-services.json`, cópielo en `mobile/` y añada en `app.json`, dentro de
   `expo.android`: `"googleServicesFile": "./google-services.json"`. Súbalo al repositorio
   (no es secreto).
3. En Firebase → *Configuración del proyecto* → *Cuentas de servicio* → *Generar nueva clave
   privada*: descarga un JSON. **Ese sí es secreto**: no lo suba al repositorio.
4. `npx eas-cli@latest credentials --platform android` → *production* → *Google Service
   Account* → *Manage your Google Service Account Key for Push Notifications (FCM V1)* →
   súbalo.
5. Vuelva a compilar: `eas build --platform android --profile preview`.

**Probar:** abra la app compilada, inicie sesión y acepte el permiso de notificaciones
(*Ajustes → Avisos* debe decir «Activados»). Haga un pedido de prueba en la tienda.

Si en expo.dev se activa *Enhanced security for push notifications*, defina en Azure la
variable `EXPO_ACCESS_TOKEN` con un token de acceso de Expo; si no, no hace falta nada en el
servidor.

## Estructura

```
src/app/                 Pantallas (Expo Router: cada fichero es una ruta)
  login.tsx              Acceso
  (tabs)/index.tsx       Inicio
  (tabs)/orders.tsx      Lista de pedidos
  (tabs)/products.tsx    Lista de artículos
  (tabs)/settings.tsx    Ajustes
  order/[uuid].tsx       Detalle y acciones del pedido
  product/new.tsx        Nuevo artículo
  product/[id].tsx       Editar artículo
src/components/          Formulario de artículo, filas, hoja inferior, controles
src/lib/api.ts           Cliente de la API: tokens, renovación, subida de fotos
src/lib/queries.ts       Consultas GraphQL y acciones REST de EverShop
src/lib/description.ts   Descripción de EverShop (bloques del editor) ⇄ texto
src/lib/notifications.ts Permiso y registro del móvil para los avisos de pedido nuevo
tests/                   Pruebas (npm test)
```

## Desarrollo

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # pruebas de description.ts y format.ts
npx expo-doctor     # comprueba dependencias y configuración de Expo
```

Añada dependencias con `npx expo install <paquete>` (elige la versión compatible con el
SDK de Expo). Las carpetas `ios/` y `android/` se generan al compilar; no se editan a mano.

La descripción de los artículos se edita como texto plano (un párrafo por bloque). Si un
artículo tiene formato hecho en el panel web (negritas, títulos, columnas), la app solo lo
sustituye si se cambia el texto de la descripción.
