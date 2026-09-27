#!/usr/bin/env node
// Genera las plantillas de los correos de la tienda (emails/*.html) con la
// imagen de la Fundación Andalusí: cabecera con el logotipo, franja verde con
// el título, contenido en tarjeta blanca y pie verde con los datos legales.
//
//   node scripts/build-emails.mjs
//
// Las plantillas son Handlebars (las rellena EverShop al enviar cada correo) y
// se activan en config/default.json → system.notification_emails.*.templatePath.
// HTML de correo: tablas y estilos en línea, para que se vean bien en Gmail,
// Outlook y Apple Mail. Tras editar este fichero, vuelva a ejecutarlo.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'emails');

const C = {
  brand: '#009240',
  brandDark: '#065927',
  ink: '#3c3c3b',
  soft: '#5b6573',
  line: '#e2e2e2',
  smoke: '#f5f5f5'
};
const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const HEADING = "Tajawal, Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
const SITE = 'https://fundacionandalusi.org';
const EMAIL = 'tienda@fundacionandalusi.org';

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px;">
  <tr>
    <td align="center" bgcolor="${C.brand}" style="border-radius:16px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:16px;">${label}&nbsp;&rarr;</a>
    </td>
  </tr>
</table>`;

const p = (html, extra = '') =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.ink};${extra}">${html}</p>`;

const h2 = (text) =>
  `<h2 style="margin:28px 0 12px;font-family:${HEADING};font-size:19px;font-weight:500;color:${C.ink};">${text}</h2>`;

/** Lista de artículos (pedido o envío). `withPrice`: muestra el importe de cada línea. */
const itemsTable = (list, withPrice) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  {{#each ${list}}}
  <tr>
    ${
      withPrice // solo la confirmación trae la miniatura con URL absoluta
        ? `<td width="72" valign="top" style="padding:14px 14px 14px 0;border-bottom:1px solid ${C.line};">
      {{#if this.thumbnail}}<img src="{{this.thumbnail}}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid ${C.line};" />{{else}}<div style="width:64px;height:64px;border-radius:10px;background:${C.smoke};"></div>{{/if}}
    </td>`
        : ''
    }
    <td valign="middle" style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${FONT};">
      <div style="font-size:15px;font-weight:600;color:${C.ink};">{{this.product_name}}</div>
      <div style="margin-top:4px;font-size:13px;color:${C.soft};">Cantidad: {{this.qty}}</div>
    </td>
    ${
      withPrice
        ? `<td align="right" valign="middle" style="padding:14px 0 14px 12px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};white-space:nowrap;">{{currency this.line_total_with_discount_incl_tax}}</td>`
        : ''
    }
  </tr>
  {{/each}}
</table>`;

const totalRow = (label, value, strong = false) => `
  <tr>
    <td style="padding:${strong ? '12px 0 0' : '4px 0'};font-family:${FONT};font-size:${strong ? '17px' : '14px'};font-weight:${strong ? 700 : 400};color:${strong ? C.ink : C.soft};${strong ? `border-top:1px solid ${C.line};` : ''}">${label}</td>
    <td align="right" style="padding:${strong ? '12px 0 0' : '4px 0'};font-family:${FONT};font-size:${strong ? '17px' : '14px'};font-weight:${strong ? 700 : 500};color:${strong ? C.brand : C.ink};${strong ? `border-top:1px solid ${C.line};` : ''}">${value}</td>
  </tr>`;

const card = (inner) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;background:${C.smoke};border-radius:14px;">
  <tr><td style="padding:18px 20px;">${inner}</td></tr>
</table>`;

const help = p(
  `¿Tienes alguna duda? Escríbenos a <a href="mailto:${EMAIL}" style="color:${C.brand};font-weight:600;text-decoration:none;">${EMAIL}</a> y te ayudaremos encantados.`,
  `margin-top:26px;font-size:14px;color:${C.soft};`
);

/** Marco común: logotipo, franja verde con título, tarjeta con el contenido y pie verde. */
function layout({ preheader, eyebrow, title, body }) {
  return `<!DOCTYPE html>
<html lang="es" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    @media (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .hero-title { font-size: 26px !important; }
      .col { display: block !important; width: 100% !important; padding: 0 0 18px !important; }
    }
    a { color: ${C.brand}; }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.smoke};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.smoke}" style="background:${C.smoke};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
          <!-- Cabecera: logotipo de la Fundación -->
          <tr>
            <td align="left" class="px" style="padding:22px 36px;border-bottom:1px solid ${C.smoke};">
              <a href="{{storeInfo.homeUrl}}" target="_blank" style="text-decoration:none;">
                <img src="{{storeInfo.homeUrl}}/brand/logo-fundacion.png" width="150" alt="Fundación Andalusí de España" style="display:block;width:150px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <!-- Franja verde con el título -->
          <tr>
            <td class="px" bgcolor="${C.brand}" style="padding:34px 36px 32px;background:${C.brand};">
              ${eyebrow ? `<div style="display:inline-block;margin-bottom:14px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.16);font-family:${FONT};font-size:12px;font-weight:600;color:#ffffff;">&#9679;&nbsp; ${eyebrow}</div>` : ''}
              <h1 class="hero-title" style="margin:0;font-family:${HEADING};font-size:30px;line-height:1.2;font-weight:400;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <!-- Contenido -->
          <tr>
            <td class="px" style="padding:32px 36px 36px;">
              ${body}
            </td>
          </tr>
          <!-- Pie -->
          <tr>
            <td class="px" bgcolor="${C.brand}" style="padding:28px 36px;background:${C.brand};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" style="font-family:${FONT};">
                    <img src="{{storeInfo.homeUrl}}/brand/logo-fundacion-blanco.png" width="120" alt="Fundación Andalusí" style="display:block;width:120px;height:auto;border:0;" />
                    <p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:#ffffff;">La misión de la Fundación es promover la enseñanza del árabe y preservar el patrimonio islámico en España.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:18px;font-family:${FONT};font-size:12px;line-height:1.7;color:rgba(255,255,255,0.9);">
                    Fundación Método Andalusí de España · CIF G42979898<br />
                    Calle Anastasio Herrero 5, 28020 Madrid · <a href="mailto:${EMAIL}" style="color:#ffffff;">${EMAIL}</a><br />
                    <a href="{{storeInfo.homeUrl}}" style="color:#ffffff;">Tienda online</a> &nbsp;·&nbsp;
                    <a href="${SITE}" style="color:#ffffff;">fundacionandalusi.org</a> &nbsp;·&nbsp;
                    <a href="{{storeInfo.homeUrl}}/condiciones-de-venta" style="color:#ffffff;">Condiciones de venta</a> &nbsp;·&nbsp;
                    <a href="{{storeInfo.homeUrl}}/politica-de-privacidad" style="color:#ffffff;">Privacidad</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:${FONT};font-size:11px;color:#9a9a9a;">Has recibido este correo por tu relación con la tienda de la Fundación Andalusí.</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

const address = (a) => `
{{#if ${a}}}
<div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink};">
  <strong>{{${a}.full_name}}</strong><br />
  {{${a}.address_1}}{{#if ${a}.address_2}}, {{${a}.address_2}}{{/if}}<br />
  {{${a}.postcode}} {{${a}.city}}{{#if ${a}.province_name}} ({{${a}.province_name}}){{/if}}<br />
  {{#if ${a}.telephone}}Tel. {{${a}.telephone}}{{/if}}
</div>
{{/if}}`;

const templates = {
  'order-confirmation.html': layout({
    preheader: 'Hemos recibido tu pago. Gracias por comprar en la tienda de la Fundación Andalusí.',
    eyebrow: 'Pedido n.º {{order.order_number}}',
    title: '¡Gracias por tu pedido!',
    body: `
${p('Hola{{#if shippingAddress.full_name}} {{shippingAddress.full_name}}{{/if}},')}
${p('Hemos recibido tu pago y tu pedido ya está confirmado. Lo prepararemos en 24-48 horas laborables y te avisaremos cuando salga hacia tu dirección.')}
{{#if invoiceName}}
${card(`<p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.ink};"><strong style="color:${C.brand};">Factura adjunta.</strong> Encontrarás tu factura <strong>{{invoiceName}}</strong> en PDF adjunta a este correo.</p>`)}
{{/if}}
${h2('Resumen del pedido')}
<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;color:${C.soft};">Pedido n.º {{order.order_number}} · {{date order.created_at}}</p>
${itemsTable('order.items', true)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
  ${totalRow('Subtotal', '{{currency order.sub_total_incl_tax}}')}
  {{#if order.discount_amount}}${totalRow('Descuento', '−{{currency order.discount_amount}}')}{{/if}}
  ${totalRow('Envío', '{{currency order.shipping_fee_incl_tax}}')}
  ${totalRow('Total', '{{currency order.grand_total}}', true)}
  <tr><td colspan="2" align="right" style="padding-top:6px;font-family:${FONT};font-size:12px;color:${C.soft};">IVA incluido: {{currency order.total_tax_amount}}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
  <tr>
    <td class="col" width="50%" valign="top" style="padding-right:12px;">
      <div style="margin-bottom:8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${C.soft};">Dirección de envío</div>
      ${address('shippingAddress')}
    </td>
    <td class="col" width="50%" valign="top" style="padding-left:12px;">
      <div style="margin-bottom:8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${C.soft};">Pago</div>
      <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink};">{{#if order.payment_method_name}}{{order.payment_method_name}}{{else}}Tarjeta{{/if}}<br />Envío: 2 a 5 días laborables</div>
    </td>
  </tr>
</table>
${button('{{storeInfo.homeUrl}}', 'Seguir comprando')}
${help}`
  }),

  'customer-welcome.html': layout({
    preheader: 'Tu cuenta en la tienda de la Fundación Andalusí ya está lista.',
    eyebrow: 'Tu cuenta',
    title: 'Te damos la bienvenida',
    body: `
${p('Hola{{#if customer.full_name}} {{customer.full_name}}{{/if}},')}
${p('Gracias por crear tu cuenta en la tienda de la Fundación Andalusí. Desde ella podrás consultar tus pedidos, guardar tus direcciones y comprar más rápido.')}
${p('En la tienda encontrarás los libros y materiales del Método Andalusí y las publicaciones de nuestra editorial, creados en castellano para aprender árabe y conocer la cultura islámica.')}
${button('{{storeInfo.homeUrl}}/account', 'Ir a mi cuenta')}
${help}`
  }),

  'reset-password.html': layout({
    preheader: 'Crea una nueva contraseña para tu cuenta de la tienda.',
    eyebrow: 'Tu cuenta',
    title: 'Restablece tu contraseña',
    body: `
${p('Hola,')}
${p('Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en la tienda de la Fundación Andalusí. Pulsa el botón para elegir una nueva:')}
${button('{{resetPasswordUrl}}', 'Crear una nueva contraseña')}
${p('Si el botón no funciona, copia este enlace en tu navegador:', `margin-top:22px;font-size:13px;color:${C.soft};`)}
<p style="margin:0 0 14px;font-family:${FONT};font-size:12px;line-height:1.5;word-break:break-all;"><a href="{{resetPasswordUrl}}" style="color:${C.brand};">{{resetPasswordUrl}}</a></p>
${p('Si no has pedido este cambio, ignora este correo: tu contraseña seguirá siendo la misma.', `font-size:14px;color:${C.soft};`)}
${help}`
  }),

  'shipment-created.html': layout({
    preheader: 'Tu pedido ya está en camino.',
    eyebrow: 'Pedido n.º {{order.order_number}}',
    title: 'Tu pedido está en camino',
    body: `
${p('Hola,')}
${p('¡Buenas noticias! Hemos enviado tu pedido. Lo recibirás en un plazo de 2 a 5 días laborables.')}
${card(`
<div style="font-family:${FONT};font-size:14px;line-height:1.7;color:${C.ink};">
  {{#if carrierName}}<strong>Transportista:</strong> {{carrierName}}<br />{{/if}}
  {{#if shipment.tracking_number}}<strong>Número de seguimiento:</strong> {{shipment.tracking_number}}{{else}}Te avisaremos si el transportista nos facilita un número de seguimiento.{{/if}}
</div>`)}
{{#if trackingUrl}}${button('{{trackingUrl}}', 'Seguir mi envío')}{{/if}}
${h2('Artículos enviados')}
${itemsTable('items', false)}
{{#if trackOrderUrl}}<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;"><a href="{{trackOrderUrl}}" style="color:${C.brand};font-weight:600;text-decoration:none;">Ver los detalles del pedido &rarr;</a></p>{{/if}}
${help}`
  }),

  'shipment-delivered.html': layout({
    preheader: 'Tu pedido ha sido entregado.',
    eyebrow: 'Pedido n.º {{order.order_number}}',
    title: 'Tu pedido ha sido entregado',
    body: `
${p('Hola,')}
${p('Tu pedido se entregó el {{date deliveredOn}}. Esperamos que disfrutes de tus libros y materiales.')}
${h2('Artículos entregados')}
${itemsTable('items', false)}
{{#if trackOrderUrl}}<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;"><a href="{{trackOrderUrl}}" style="color:${C.brand};font-weight:600;text-decoration:none;">Ver los detalles del pedido &rarr;</a></p>{{/if}}
${p('Si algo no ha llegado bien, tienes 14 días naturales para devolverlo. Escríbenos y te explicamos cómo hacerlo.', 'margin-top:22px;')}
${button('{{storeInfo.homeUrl}}', 'Volver a la tienda')}
${help}`
  })
};

mkdirSync(OUT, { recursive: true });
for (const [file, html] of Object.entries(templates)) {
  writeFileSync(join(OUT, file), html);
  console.log(`✓ emails/${file}`);
}
