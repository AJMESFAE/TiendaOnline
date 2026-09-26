// Contenido de las páginas legales de la tienda (Aviso legal, Privacidad,
// Cookies, Condiciones de venta, Envíos y devoluciones).
//
// Redactado según la normativa española aplicable a una tienda online
// (LSSI-CE, RGPD y LOPDGDD, y el texto refundido de la Ley General para la
// Defensa de los Consumidores y Usuarios). Es un modelo: conviene que lo
// revise quien lleve los asuntos legales de la Fundación antes de publicarlo.
//
// Los datos que no se conocen se muestran como [COMPLETAR: …]. Se pueden
// pasar al crear las páginas (ver infra/create-pages.sh).

const P = (text) => ({ type: 'paragraph', data: { text } });
const H = (text, level = 2) => ({ type: 'header', data: { text, level } });
const UL = (items) => ({ type: 'list', data: { style: 'unordered', items } });
const OL = (items) => ({ type: 'list', data: { style: 'ordered', items } });

const todo = (what) => `<b>[COMPLETAR: ${what}]</b>`;

export function buildLegalPages(opts = {}) {
  const o = {
    owner: 'Fundación Método Andalusí de España',
    taxId: 'G42979898',
    address: 'Calle Anastasio Herrero 5, 28020 Madrid',
    email: opts.email || todo('email de contacto'),
    phone: opts.phone || '',
    registry:
      opts.registry ||
      todo('registro de fundaciones y número de inscripción'),
    storeUrl: opts.storeUrl || 'https://tienda.institutoalbayan.com',
    shippingDays: opts.shippingDays || todo('plazo de entrega, p. ej. 2 a 5 días laborables'),
    prepDays: opts.prepDays || todo('plazo de preparación, p. ej. 24-48 horas laborables'),
    shippingCost: opts.shippingCost || todo('coste de envío, p. ej. 4,95 € IVA incluido'),
    freeShippingFrom: opts.freeShippingFrom || '',
    updated: opts.updated || new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  };
  const emailLink = o.email.startsWith('<b>') ? o.email : `<a href="mailto:${o.email}">${o.email}</a>`;
  const contactLine = `${emailLink}${o.phone ? ` · teléfono ${o.phone}` : ''}`;
  const titular = [
    `<b>Titular:</b> ${o.owner}`,
    `<b>CIF:</b> ${o.taxId}`,
    `<b>Domicilio:</b> ${o.address}`,
    `<b>Contacto:</b> ${contactLine}`,
    `<b>Datos registrales:</b> ${o.registry}`
  ];
  const updated = P(`<i>Última actualización: ${o.updated}.</i>`);

  return [
    // ----------------------------------------------------------- AVISO LEGAL
    {
      url_key: 'aviso-legal',
      name: 'Aviso legal',
      meta_title: 'Aviso legal · Tienda Instituto Al-Bayān',
      meta_description: `Datos identificativos del titular de la tienda online del Instituto Al-Bayān, ${o.owner}.`,
      blocks: [
        P(`En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web, <a href="${o.storeUrl}">${o.storeUrl.replace('https://', '')}</a> (en adelante, «la Tienda»).`),
        H('1. Datos identificativos'),
        UL(titular),
        P('La Tienda es el canal de venta online del <b>Instituto Al-Bayān</b>, proyecto educativo de la Fundación dedicado a la enseñanza del árabe y la cultura islámica en español mediante el Método Andalusí.'),
        H('2. Objeto y aceptación'),
        P('Este aviso legal regula el acceso y el uso de la Tienda. Navegar por ella atribuye la condición de usuario e implica la aceptación de estas condiciones. Las compras se rigen además por las <a href="/condiciones-de-venta">Condiciones de venta</a>, y el tratamiento de datos personales por la <a href="/politica-de-privacidad">Política de privacidad</a>.'),
        H('3. Uso de la Tienda'),
        P('El usuario se compromete a hacer un uso adecuado y lícito de la Tienda y de sus contenidos, conforme a la ley, la buena fe y el orden público, y a no emplearlos para actividades ilícitas o que puedan dañar a la Fundación o a terceros.'),
        H('4. Propiedad intelectual e industrial'),
        P('Los contenidos de la Tienda (textos, imágenes, logotipos, diseño, materiales didácticos y el propio Método Andalusí) son titularidad de la Fundación o de terceros que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial. Queda prohibida su reproducción, distribución, comunicación pública o transformación sin autorización expresa, salvo el uso personal y privado.'),
        H('5. Responsabilidad'),
        P('La Fundación procura que la información de la Tienda sea exacta y esté actualizada, y la corrige en cuanto conoce un error. No se hace responsable de los daños derivados de interrupciones técnicas ajenas a su control, ni del contenido de sitios web de terceros enlazados desde la Tienda, que se ofrecen solo a título informativo.'),
        H('6. Legislación aplicable y jurisdicción'),
        P('Estas condiciones se rigen por la legislación española. Para cualquier controversia, cuando el usuario tenga la condición de consumidor, serán competentes los juzgados y tribunales de su domicilio; en los demás casos, los de Madrid.'),
        updated
      ]
    },

    // ------------------------------------------------ POLÍTICA DE PRIVACIDAD
    {
      url_key: 'politica-de-privacidad',
      name: 'Política de privacidad',
      meta_title: 'Política de privacidad · Tienda Instituto Al-Bayān',
      meta_description: 'Cómo tratamos tus datos personales en la tienda online del Instituto Al-Bayān.',
      blocks: [
        P('Esta política explica cómo tratamos los datos personales de quienes compran o se registran en la Tienda, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).'),
        H('1. Responsable del tratamiento'),
        UL(titular.slice(0, 4)),
        H('2. Qué datos tratamos'),
        UL([
          '<b>Identificación y contacto:</b> nombre y apellidos, email y teléfono.',
          '<b>Direcciones</b> de envío y de facturación.',
          '<b>Datos del pedido:</b> productos, importes, historial de compras y comunicaciones relacionadas.',
          '<b>Cuenta de cliente</b>, si decides crearla: email y contraseña (guardada cifrada).',
          '<b>Datos de pago:</b> no conocemos ni guardamos los datos de tu tarjeta. El pago se realiza directamente en la pasarela segura de Redsys y de tu entidad bancaria; solo recibimos la confirmación del resultado y un código de autorización.'
        ]),
        H('3. Para qué los usamos y con qué base legal'),
        UL([
          '<b>Gestionar tu pedido</b> (cobro, preparación, envío, atención y devoluciones). Base legal: ejecución del contrato de compraventa (art. 6.1.b RGPD).',
          '<b>Gestionar tu cuenta de cliente</b>, si la creas. Base legal: ejecución del contrato.',
          '<b>Cumplir obligaciones legales</b> contables, fiscales y de consumo (facturación, conservación de documentos, atención de reclamaciones). Base legal: obligación legal (art. 6.1.c RGPD).',
          '<b>Responder a tus consultas.</b> Base legal: tu solicitud y nuestro interés legítimo en atenderla (art. 6.1.f RGPD).',
          '<b>Enviarte información sobre cursos, actividades o novedades</b> solo si lo aceptas expresamente. Base legal: consentimiento (art. 6.1.a RGPD), que puedes retirar en cualquier momento.'
        ]),
        P('No elaboramos perfiles ni tomamos decisiones automatizadas con efectos jurídicos sobre ti.'),
        H('4. Cuánto tiempo los conservamos'),
        P('Mientras sea necesario para la finalidad para la que se recogieron. Los datos de pedidos y facturas se conservan durante los plazos legales: seis años para la documentación contable (art. 30 del Código de Comercio) y el plazo de prescripción de las obligaciones fiscales. Los datos de tu cuenta, hasta que solicites su baja.'),
        H('5. A quién se comunican'),
        P('No vendemos ni cedemos tus datos. Solo los conocen, en la medida necesaria, estos destinatarios:'),
        UL([
          '<b>Entidad bancaria y Redsys</b> (Servicios de Pago, S.L.), para procesar el pago.',
          '<b>Empresas de transporte y mensajería</b>, para entregarte el pedido.',
          '<b>Proveedores tecnológicos</b> que actúan como encargados del tratamiento con contrato conforme al art. 28 RGPD: alojamiento de la Tienda en Microsoft Azure (centro de datos en España) y el servicio de correo electrónico con el que te enviamos las confirmaciones.',
          '<b>Administraciones públicas y juzgados</b>, cuando exista obligación legal.'
        ]),
        P('Nuestros proveedores tratan los datos dentro del Espacio Económico Europeo. Si alguno realizara una transferencia fuera de él, se haría con las garantías del capítulo V del RGPD (decisión de adecuación, como el Marco de Privacidad de Datos UE-EE. UU., o cláusulas contractuales tipo).'),
        H('6. Tus derechos'),
        P(`Puedes ejercer en cualquier momento tus derechos de <b>acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad</b>, así como retirar tu consentimiento, escribiendo a ${emailLink} o por correo postal a ${o.address}, indicando el derecho que ejerces y acreditando tu identidad.`),
        P('Si consideras que no hemos atendido correctamente tu solicitud, puedes presentar una reclamación ante la <a href="https://www.aepd.es" target="_blank" rel="noopener">Agencia Española de Protección de Datos</a>.'),
        H('7. Seguridad'),
        P('Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos: conexión cifrada (HTTPS), contraseñas cifradas, acceso restringido al panel de gestión y copias de seguridad.'),
        H('8. Menores de edad'),
        P('Para comprar en la Tienda es necesario ser mayor de edad. Los mayores de 14 años pueden facilitar sus datos para otras finalidades (art. 7 LOPDGDD); por debajo de esa edad se requiere el consentimiento de sus padres o tutores.'),
        updated
      ]
    },

    // --------------------------------------------------- POLÍTICA DE COOKIES
    {
      url_key: 'politica-de-cookies',
      name: 'Política de cookies',
      meta_title: 'Política de cookies · Tienda Instituto Al-Bayān',
      meta_description: 'Qué cookies utiliza la tienda online del Instituto Al-Bayān.',
      blocks: [
        P('Una cookie es un pequeño archivo que un sitio web guarda en tu navegador para recordar información entre visitas o entre páginas. Esta política explica qué cookies usa la Tienda, conforme al artículo 22.2 de la LSSI-CE y a la guía de la Agencia Española de Protección de Datos.'),
        H('1. Cookies que utilizamos'),
        P('La Tienda <b>solo utiliza cookies técnicas</b>, imprescindibles para que funcione. No usamos cookies de análisis, de publicidad ni de redes sociales. Por eso no te pedimos consentimiento: las cookies técnicas están exentas (art. 22.2 LSSI-CE).'),
        UL([
          '<b>sid</b> (propia, técnica): mantiene tu sesión de compra, es decir, tu carrito, el proceso de pago y el acceso a tu cuenta. Caduca a las 24 horas o al cerrar la sesión.',
          '<b>asid</b> (propia, técnica): mantiene la sesión del personal de la Fundación en el panel de gestión. Solo se instala a quien accede a ese panel.'
        ]),
        H('2. Servicios de terceros'),
        P('Para mostrar las tipografías de la web se cargan fuentes desde Google Fonts. Este servicio no instala cookies, pero tu navegador se conecta a los servidores de Google, que reciben tu dirección IP. Durante el pago eres redirigido a la pasarela de Redsys, que aplica su propia política de cookies.'),
        H('3. Cómo gestionar o eliminar las cookies'),
        P('Puedes consultar, bloquear o eliminar las cookies desde la configuración de tu navegador (<a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Chrome</a>, <a href="https://support.mozilla.org/es/kb/Borrar%20cookies" target="_blank" rel="noopener">Firefox</a>, <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a>, <a href="https://support.microsoft.com/es-es/microsoft-edge" target="_blank" rel="noopener">Edge</a>). Si bloqueas las cookies técnicas, no podrás usar el carrito ni completar compras.'),
        H('4. Cambios'),
        P('Si en el futuro incorporamos cookies que requieran tu consentimiento, como las de análisis, lo indicaremos en esta página y te lo pediremos antes de instalarlas.'),
        updated
      ]
    },

    // -------------------------------------------------- CONDICIONES DE VENTA
    {
      url_key: 'condiciones-de-venta',
      name: 'Condiciones de venta',
      meta_title: 'Condiciones de venta · Tienda Instituto Al-Bayān',
      meta_description: 'Condiciones generales de compra de la tienda online del Instituto Al-Bayān: precios, pago, entrega, desistimiento y garantías.',
      blocks: [
        P('Estas condiciones generales regulan la compra de productos en la Tienda. Se rigen por el Real Decreto Legislativo 1/2007, texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios (TRLGDCU), por la LSSI-CE y por el resto de la normativa aplicable. Al realizar un pedido declaras haberlas leído y aceptado.'),
        H('1. Vendedor'),
        UL(titular),
        H('2. Productos'),
        P('La Tienda ofrece libros, láminas y material didáctico del Método Andalusí y del Instituto Al-Bayān. Cada ficha describe las características esenciales del producto. Las imágenes son orientativas.'),
        H('3. Precios'),
        P('Los precios se indican en euros e <b>incluyen el IVA</b> aplicable. Los gastos de envío se muestran por separado antes de confirmar el pedido y se suman al total, que verás siempre antes de pagar. El precio aplicable es el vigente en el momento de hacer el pedido.'),
        H('4. Cómo comprar'),
        OL([
          'Añade los productos al carrito y pulsa <i>Finalizar compra</i>.',
          'Indica tu email y tus direcciones de envío y facturación, y elige el método de envío.',
          'Revisa el resumen del pedido (productos, gastos de envío y total) y pulsa <i>Pagar ahora</i>.',
          'Completa el pago en la pasarela segura de Redsys.',
          'Recibirás un email con la confirmación del pedido, que sirve como justificante de la compra.'
        ]),
        P('El contrato se formaliza en español. La Fundación archiva el documento electrónico del pedido, al que puedes acceder desde tu cuenta de cliente o solicitándolo por email. Antes de pagar puedes corregir cualquier dato volviendo a los pasos anteriores.'),
        H('5. Pago'),
        P('Se aceptan <b>tarjetas de débito y crédito</b> (Visa, Mastercard) y <b>Bizum</b>, a través de la pasarela segura Redsys. El cargo se realiza en el momento de la compra. La Fundación no tiene acceso a los datos de tu tarjeta. El pedido se considera confirmado cuando la entidad bancaria autoriza el pago.'),
        H('6. Envío y entrega'),
        P('Los plazos, zonas y costes de envío se detallan en <a href="/envios-y-devoluciones">Envíos y devoluciones</a>. Salvo que se indique otro plazo, la entrega se realizará como máximo en 30 días naturales desde la confirmación del pedido (art. 66 bis TRLGDCU).'),
        H('7. Derecho de desistimiento'),
        P('Si eres consumidor, puedes <b>desistir de la compra en un plazo de 14 días naturales</b> sin necesidad de justificación. El plazo empieza el día en que tú, o un tercero que indiques y que no sea el transportista, recibís el producto.'),
        P(`Para ejercerlo, comunícanoslo antes de que venza el plazo mediante una declaración inequívoca: un email a ${emailLink}, una carta a ${o.address} o el formulario modelo que encontrarás al final de estas condiciones (su uso no es obligatorio).`),
        UL([
          '<b>Devolución del producto:</b> envíalo a la dirección anterior sin demora indebida y, como máximo, en los 14 días naturales siguientes a comunicarnos tu decisión. Los costes directos de la devolución corren a tu cargo, salvo que el producto sea defectuoso o no corresponda con lo pedido.',
          '<b>Reembolso:</b> te devolvemos todos los pagos recibidos, incluidos los gastos del envío estándar inicial, en un plazo máximo de 14 días naturales desde que nos comuniques el desistimiento, por el mismo medio de pago que usaste. Podemos retener el reembolso hasta recibir el producto o hasta que acredites su envío.',
          '<b>Estado del producto:</b> solo respondes de la disminución de valor debida a una manipulación distinta de la necesaria para conocer su naturaleza y características.'
        ]),
        P('No hay derecho de desistimiento en los casos del artículo 103 TRLGDCU, por ejemplo: productos confeccionados conforme a tus especificaciones o personalizados; grabaciones sonoras o de vídeo precintadas que se hayan desprecintado tras la entrega; y contenido digital sin soporte material cuya ejecución haya comenzado con tu consentimiento expreso y tu conocimiento de que pierdes este derecho.'),
        H('8. Garantía legal'),
        P('Todos los productos cuentan con la garantía legal de conformidad: la Fundación responde de las faltas de conformidad que se manifiesten en un plazo de <b>tres años</b> desde la entrega (art. 120 TRLGDCU). Si recibes un producto defectuoso o dañado, escríbenos y lo repararemos, sustituiremos o, si no es posible, te devolveremos su importe, sin coste para ti.'),
        H('9. Atención al cliente y reclamaciones'),
        P(`Para cualquier consulta, incidencia o reclamación, escríbenos a ${emailLink}. Respondemos en el menor plazo posible y, en todo caso, en un máximo de un mes. Tienes a tu disposición hojas oficiales de reclamación. También puedes acudir al sistema arbitral de consumo a través de la Junta Arbitral de Consumo de tu comunidad autónoma.`),
        H('10. Legislación aplicable'),
        P('Estas condiciones se rigen por la legislación española. Las controversias con consumidores se someterán a los juzgados y tribunales de su domicilio.'),
        H('Formulario de desistimiento', 3),
        P('Rellena y envíanos este formulario solo si deseas desistir del contrato:'),
        UL([
          `A la atención de ${o.owner}, ${o.address}${o.email.startsWith('<b>') ? '' : `, ${o.email}`}.`,
          'Por la presente le comunico que desisto de mi contrato de venta del siguiente bien: …………………',
          'Número de pedido: ……… · Pedido el: ……… · Recibido el: ………',
          'Nombre del consumidor: …………………',
          'Domicilio del consumidor: …………………',
          'Firma (solo si el formulario se presenta en papel) y fecha: ………'
        ]),
        updated
      ]
    },

    // ------------------------------------------------ ENVÍOS Y DEVOLUCIONES
    {
      url_key: 'envios-y-devoluciones',
      name: 'Envíos y devoluciones',
      meta_title: 'Envíos y devoluciones · Tienda Instituto Al-Bayān',
      meta_description: 'Plazos, costes de envío y cómo devolver un pedido en la tienda online del Instituto Al-Bayān.',
      blocks: [
        H('Envíos'),
        UL([
          '<b>Zona de envío:</b> España. Si necesitas un envío a otro destino, escríbenos antes de hacer el pedido.',
          `<b>Preparación:</b> ${o.prepDays} desde la confirmación del pago.`,
          `<b>Entrega:</b> ${o.shippingDays} desde el envío.`,
          `<b>Coste:</b> ${o.shippingCost}. El importe exacto se muestra en el carrito antes de pagar.${o.freeShippingFrom ? ` <b>Envío gratuito</b> en pedidos a partir de ${o.freeShippingFrom}.` : ''}`,
          '<b>Seguimiento:</b> cuando enviemos tu pedido recibirás un email, con el número de seguimiento cuando el transportista lo facilite. También puedes consultar el estado en tu cuenta.'
        ]),
        P('Los plazos son orientativos y pueden alargarse en periodos de mucha demanda, en festivos o por causas ajenas a nosotros. Si un pedido se retrasa, te avisaremos. En todo caso, el plazo máximo de entrega es de 30 días naturales.'),
        H('Al recibir tu pedido'),
        P(`Comprueba el paquete al recibirlo. Si llega dañado o falta algo, anótalo en el albarán del transportista y escríbenos a ${emailLink} con el número de pedido y, si puedes, una foto. Lo solucionaremos sin coste para ti.`),
        H('Devoluciones'),
        P('Tienes <b>14 días naturales</b> desde la recepción para devolver cualquier producto sin dar explicaciones, conforme al derecho de desistimiento (ver <a href="/condiciones-de-venta">Condiciones de venta</a>, apartado 7).'),
        OL([
          `Escríbenos a ${emailLink} indicando el número de pedido y los productos que devuelves, o usa el formulario de desistimiento.`,
          `Envía el producto, bien protegido, a: <b>${o.owner} · ${o.address}</b>.`,
          'Cuando lo recibamos, o cuando acredites que lo has enviado, te reembolsaremos el importe por el mismo medio de pago en un máximo de 14 días naturales.'
        ]),
        P('Los gastos de devolución corren a tu cargo, salvo que el producto sea defectuoso, llegue dañado o no corresponda con lo que pediste. En esos casos nos hacemos cargo de todo.'),
        H('Productos defectuosos'),
        P('Todos los productos tienen una garantía legal de tres años. Si detectas un defecto, escríbenos y te ofreceremos la reparación, la sustitución o el reembolso, sin ningún coste para ti.'),
        updated
      ]
    }
  ].map((page) => ({
    url_key: page.url_key,
    name: page.name,
    // El título de la página también se usa en la ruta de navegación.
    meta_title: page.name,
    meta_description: page.meta_description,
    meta_keywords: '',
    status: 1,
    content: [
      {
        id: `r_${page.url_key.replace(/-/g, '_')}`,
        size: 1,
        className: 'md:grid-cols-1',
        columns: [
          {
            id: `c_${page.url_key.replace(/-/g, '_')}`,
            size: 1,
            data: {
              time: Date.now(),
              version: '2.31.0',
              blocks: page.blocks.map((b, i) => ({ id: `${page.url_key.replace(/-/g, '_')}_${i}`, ...b }))
            }
          }
        ]
      }
    ]
  }));
}
