#!/usr/bin/env node
// Genera las plantillas de los correos de la tienda en español, inglés y árabe
// (emails/<idioma>/*.html) con la imagen de la Fundación Andalusí: cabecera con el
// logotipo, franja verde con el título, contenido en tarjeta blanca y pie verde
// con los datos legales. El árabe va de derecha a izquierda.
//
//   node scripts/build-emails.mjs
//
// Las plantillas son Handlebars (las rellena EverShop al enviar cada correo). La
// española se activa en config/default.json (system.notification_emails.*.templatePath);
// la extensión tienda cambia a la del idioma en que compró o se registró el cliente.
// HTML de correo: tablas y estilos en línea (Gmail, Outlook, Apple Mail).
// Los textos se escriben en español (clave) y se traducen en TRANSLATIONS.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'emails');
const LANGS = ['es', 'en', 'ar'];

const C = {
  brand: '#009240',
  brandDark: '#065927',
  ink: '#3c3c3b',
  soft: '#5b6573',
  line: '#e2e2e2',
  smoke: '#f5f5f5'
};
const SITE = 'https://fundacionandalusi.org';
const EMAIL = 'tienda@fundacionandalusi.org';

/** Traducciones de los textos (clave = texto en español). */
const TRANSLATIONS = {
  en: {
    "Si cambias de opinión, tienes 14 días naturales desde que lo recibas para desistir de la compra:":
      "If you change your mind, you have 14 calendar days from receiving it to withdraw from the purchase:",
    "Tienes 14 días naturales desde hoy para desistir de la compra sin dar explicaciones. Pulsa el botón, confirma y recibirás el acuse de recibo; después nos envías los productos y te devolvemos el importe, incluidos los gastos del envío estándar.":
      "You have 14 calendar days from today to withdraw from the purchase without giving any reason. Click the button, confirm and you will receive the acknowledgement of receipt; then send us the products and we will refund you, including the standard shipping costs.",
    "Tu derecho de desistimiento":
      "Your right of withdrawal",
    "Tienes 14 días naturales desde que recibes el pedido para desistir de la compra sin dar explicaciones. Puedes hacerlo con el enlace «Desistir del contrato aquí», escribiéndonos a":
      "You have 14 calendar days from receiving your order to withdraw from the purchase without giving any reason. You can do so with the “Withdraw from contract here” link, by writing to us at",
    "o por carta, con el modelo de formulario de abajo (su uso no es obligatorio).":
      "or by letter, using the model form below (its use is not mandatory).",
    "Te devolveremos todos los pagos, incluidos los gastos del envío estándar, en un máximo de 14 días naturales desde que nos lo comuniques, por el mismo medio de pago. Podemos esperar a recibir los productos o el justificante de su envío. Los gastos de devolución corren de tu cuenta, salvo que el producto sea defectuoso o no sea lo que pediste.":
      "We will refund all payments, including standard shipping costs, within 14 calendar days of being informed, using the same payment method. We may wait until we receive the products or proof that they have been sent. You bear the cost of returning them, unless the product is defective or is not what you ordered.",
    "Todos los productos tienen una garantía legal de conformidad de tres años.":
      "All products have a three-year legal guarantee of conformity.",
    "Consulta las condiciones de venta completas":
      "Read the full terms of sale",
    "Desistir del contrato aquí":
      "Withdraw from contract here",
    "Modelo de formulario de desistimiento":
      "Model withdrawal form",
    "A la atención de":
      "To",
    "Por la presente le comunico que desisto de mi contrato de venta del siguiente bien:":
      "I hereby give notice that I withdraw from my contract of sale of the following goods:",
    "Pedido el":
      "Ordered on",
    "Recibido el":
      "Received on",
    "Nombre y domicilio del consumidor:":
      "Name and address of the consumer:",
    "Firma (solo si se presenta en papel) y fecha:":
      "Signature (only if submitted on paper) and date:",
    "Hemos recibido tu desistimiento.":
      "We have received your withdrawal.",
    "Hemos recibido tu desistimiento":
      "We have received your withdrawal",
    "Este es el acuse de recibo de tu desistimiento. Estos son los datos que nos has enviado:":
      "This is the acknowledgement of receipt of your withdrawal. These are the details you sent us:",
    "Referencia":
      "Reference",
    "Correo electrónico":
      "Email",
    "Nombre":
      "Name",
    "Productos":
      "Products",
    "Todo el pedido":
      "The whole order",
    "Comentarios":
      "Comments",
    "Productos del pedido":
      "Products in the order",
    "Próximos pasos":
      "Next steps",
    "Envíanos los productos en un plazo de 14 días naturales a esta dirección, indicando el número de pedido:":
      "Please send us the products within 14 calendar days to this address, stating the order number:",
    "Te devolveremos todos los pagos, incluidos los gastos del envío estándar, en un máximo de 14 días naturales desde hoy, por el mismo medio de pago. Podemos esperar a recibir los productos o el justificante de su envío. Los gastos de devolución corren de tu cuenta, salvo que el producto sea defectuoso o no sea lo que pediste.":
      "We will refund all payments, including standard shipping costs, within 14 calendar days from today, using the same payment method. We may wait until we receive the products or proof that they have been sent. You bear the cost of returning them, unless the product is defective or is not what you ordered.",
    'Cantidad': 'Quantity',
    '¿Tienes alguna duda? Escríbenos a': 'Any questions? Write to us at',
    'y te ayudaremos encantados.': 'and we will be happy to help.',
    'La misión de la Fundación es promover la enseñanza del árabe y preservar el patrimonio islámico en España.':
      'The Foundation’s mission is to promote the teaching of Arabic and to preserve the Islamic heritage of Spain.',
    'Tienda online': 'Online shop',
    'Condiciones de venta': 'Terms of sale',
    'Privacidad': 'Privacy',
    'Has recibido este correo por tu relación con la tienda de la Fundación Andalusí.':
      'You are receiving this email because of your relationship with the Fundación Andalusí shop.',
    'Tel.': 'Tel.',
    'Hemos recibido tu pago. Gracias por comprar en la tienda de la Fundación Andalusí.':
      'We have received your payment. Thank you for shopping at the Fundación Andalusí shop.',
    'Pedido n.º': 'Order no.',
    '¡Gracias por tu pedido!': 'Thank you for your order!',
    'Hola': 'Hello',
    'Hemos recibido tu pago y tu pedido ya está confirmado. Lo prepararemos en 24-48 horas laborables y te avisaremos cuando salga hacia tu dirección.':
      'We have received your payment and your order is confirmed. We will prepare it within 24–48 working hours and let you know when it is on its way to you.',
    'Factura adjunta.': 'Invoice attached.',
    'Encontrarás tu factura': 'You will find your invoice',
    'en PDF adjunta a este correo.': 'attached to this email as a PDF.',
    'Resumen del pedido': 'Order summary',
    'Subtotal': 'Subtotal',
    'Descuento': 'Discount',
    'Envío': 'Shipping',
    'Gratis': 'Free',
    'Total': 'Total',
    'IVA incluido': 'VAT included',
    'Dirección de envío': 'Shipping address',
    'Pago': 'Payment',
    'Tarjeta': 'Card',
    'Entrega: 2 a 5 días laborables': 'Delivery: 2 to 5 working days',
    'Seguir comprando': 'Continue shopping',
    'Tu cuenta en la tienda de la Fundación Andalusí ya está lista.': 'Your Fundación Andalusí shop account is ready.',
    'Tu cuenta': 'Your account',
    'Te damos la bienvenida': 'Welcome',
    'Gracias por crear tu cuenta en la tienda de la Fundación Andalusí. Desde ella podrás consultar tus pedidos, guardar tus direcciones y comprar más rápido.':
      'Thank you for creating your account at the Fundación Andalusí shop. From it you can check your orders, save your addresses and check out faster.',
    'En la tienda encontrarás los libros y materiales del Método Andalusí y las publicaciones de nuestra editorial, creados en castellano para aprender árabe y conocer la cultura islámica.':
      'In the shop you will find the books and materials of the Andalusi Method and the publications of our publishing house, created in Spanish to learn Arabic and discover Islamic culture.',
    'Ir a mi cuenta': 'Go to my account',
    'Crea una nueva contraseña para tu cuenta de la tienda.': 'Create a new password for your shop account.',
    'Restablece tu contraseña': 'Reset your password',
    'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en la tienda de la Fundación Andalusí. Pulsa el botón para elegir una nueva:':
      'We have received a request to reset the password of your Fundación Andalusí shop account. Press the button to choose a new one:',
    'Crear una nueva contraseña': 'Create a new password',
    'Si el botón no funciona, copia este enlace en tu navegador:': 'If the button does not work, copy this link into your browser:',
    'Si no has pedido este cambio, ignora este correo: tu contraseña seguirá siendo la misma.':
      'If you did not request this change, ignore this email: your password will stay the same.',
    'Tu pedido ya está en camino.': 'Your order is on its way.',
    'Tu pedido está en camino': 'Your order is on its way',
    '¡Buenas noticias! Hemos enviado tu pedido. Lo recibirás en un plazo de 2 a 5 días laborables.':
      'Good news! We have shipped your order. You will receive it within 2 to 5 working days.',
    'Transportista': 'Carrier',
    'Número de seguimiento': 'Tracking number',
    'Te avisaremos si el transportista nos facilita un número de seguimiento.':
      'We will let you know if the carrier provides a tracking number.',
    'Seguir mi envío': 'Track my shipment',
    'Artículos enviados': 'Items shipped',
    'Ver los detalles del pedido': 'View order details',
    'Tu pedido ha sido entregado.': 'Your order has been delivered.',
    'Tu pedido ha sido entregado': 'Your order has been delivered',
    'Tu pedido se entregó el': 'Your order was delivered on',
    'Esperamos que disfrutes de tus libros y materiales.': 'We hope you enjoy your books and materials.',
    'Artículos entregados': 'Items delivered',
    'Si algo no ha llegado bien, tienes 14 días naturales para devolverlo. Escríbenos y te explicamos cómo hacerlo.':
      'If anything has not arrived in good condition, you have 14 calendar days to return it. Write to us and we will explain how.',
    'Volver a la tienda': 'Back to the shop',
    'Fundación Andalusí de España': 'Fundación Andalusí de España'
  },
  ar: {
    "Si cambias de opinión, tienes 14 días naturales desde que lo recibas para desistir de la compra:":
      "إذا غيّرت رأيك، فلديك 14 يومًا تقويميًا من تاريخ الاستلام للعدول عن الشراء:",
    "Tienes 14 días naturales desde hoy para desistir de la compra sin dar explicaciones. Pulsa el botón, confirma y recibirás el acuse de recibo; después nos envías los productos y te devolvemos el importe, incluidos los gastos del envío estándar.":
      "لديك 14 يومًا تقويميًا من اليوم للعدول عن الشراء دون تقديم أي سبب. اضغط على الزر ثم أكّد، وسيصلك إشعار الاستلام؛ بعد ذلك ترسل إلينا المنتجات ونردّ إليك المبلغ، بما فيه تكاليف الشحن العادي.",
    "Tu derecho de desistimiento":
      "حقّك في العدول عن الشراء",
    "Tienes 14 días naturales desde que recibes el pedido para desistir de la compra sin dar explicaciones. Puedes hacerlo con el enlace «Desistir del contrato aquí», escribiéndonos a":
      "لديك 14 يومًا تقويميًا من تاريخ استلام طلبك للعدول عن الشراء دون الحاجة إلى تقديم أي سبب. يمكنك ذلك عبر رابط «العدول عن العقد من هنا»، أو بمراسلتنا على",
    "o por carta, con el modelo de formulario de abajo (su uso no es obligatorio).":
      "أو برسالة بريدية، باستخدام نموذج الاستمارة أدناه (استخدامه غير إلزامي).",
    "Te devolveremos todos los pagos, incluidos los gastos del envío estándar, en un máximo de 14 días naturales desde que nos lo comuniques, por el mismo medio de pago. Podemos esperar a recibir los productos o el justificante de su envío. Los gastos de devolución corren de tu cuenta, salvo que el producto sea defectuoso o no sea lo que pediste.":
      "سنردّ إليك جميع المبالغ المدفوعة، بما فيها تكاليف الشحن العادي، خلال 14 يومًا تقويميًا كحدّ أقصى من إبلاغنا، وبوسيلة الدفع نفسها. ويجوز لنا الانتظار حتى نستلم المنتجات أو ما يثبت إرسالها. وتتحمّل تكاليف الإرجاع، إلا إذا كان المنتج معيبًا أو غير مطابق لما طلبته.",
    "Todos los productos tienen una garantía legal de conformidad de tres años.":
      "تتمتّع جميع المنتجات بضمان قانوني للمطابقة مدّته ثلاث سنوات.",
    "Consulta las condiciones de venta completas":
      "اطّلع على شروط البيع كاملة",
    "Desistir del contrato aquí":
      "العدول عن العقد من هنا",
    "Modelo de formulario de desistimiento":
      "نموذج استمارة العدول",
    "A la atención de":
      "إلى عناية",
    "Por la presente le comunico que desisto de mi contrato de venta del siguiente bien:":
      "أُبلغكم بموجب هذا بعدولي عن عقد بيع السلعة التالية:",
    "Pedido el":
      "تاريخ الطلب",
    "Recibido el":
      "تاريخ الاستلام",
    "Nombre y domicilio del consumidor:":
      "اسم المستهلك وعنوانه:",
    "Firma (solo si se presenta en papel) y fecha:":
      "التوقيع (فقط إذا قُدّمت الاستمارة ورقيًا) والتاريخ:",
    "Hemos recibido tu desistimiento.":
      "تلقّينا طلب العدول الخاص بك.",
    "Hemos recibido tu desistimiento":
      "تلقّينا طلب العدول الخاص بك",
    "Este es el acuse de recibo de tu desistimiento. Estos son los datos que nos has enviado:":
      "هذا إشعار باستلام طلب العدول الخاص بك. وهذه هي البيانات التي أرسلتها إلينا:",
    "Referencia":
      "المرجع",
    "Correo electrónico":
      "البريد الإلكتروني",
    "Nombre":
      "الاسم",
    "Productos":
      "المنتجات",
    "Todo el pedido":
      "الطلب بالكامل",
    "Comentarios":
      "ملاحظات",
    "Productos del pedido":
      "منتجات الطلب",
    "Próximos pasos":
      "الخطوات التالية",
    "Envíanos los productos en un plazo de 14 días naturales a esta dirección, indicando el número de pedido:":
      "أرسل إلينا المنتجات خلال 14 يومًا تقويميًا إلى هذا العنوان، مع ذكر رقم الطلب:",
    "Te devolveremos todos los pagos, incluidos los gastos del envío estándar, en un máximo de 14 días naturales desde hoy, por el mismo medio de pago. Podemos esperar a recibir los productos o el justificante de su envío. Los gastos de devolución corren de tu cuenta, salvo que el producto sea defectuoso o no sea lo que pediste.":
      "سنردّ إليك جميع المبالغ المدفوعة، بما فيها تكاليف الشحن العادي، خلال 14 يومًا تقويميًا كحدّ أقصى من اليوم، وبوسيلة الدفع نفسها. ويجوز لنا الانتظار حتى نستلم المنتجات أو ما يثبت إرسالها. وتتحمّل تكاليف الإرجاع، إلا إذا كان المنتج معيبًا أو غير مطابق لما طلبته.",
    'Cantidad': 'الكمية',
    '¿Tienes alguna duda? Escríbenos a': 'هل لديك أي استفسار؟ راسلنا على',
    'y te ayudaremos encantados.': 'ويسعدنا مساعدتك.',
    'La misión de la Fundación es promover la enseñanza del árabe y preservar el patrimonio islámico en España.':
      'تتمثّل رسالة المؤسسة في تعزيز تعليم اللغة العربية والحفاظ على التراث الإسلامي في إسبانيا.',
    'Tienda online': 'المتجر الإلكتروني',
    'Condiciones de venta': 'شروط البيع',
    'Privacidad': 'الخصوصية',
    'Has recibido este correo por tu relación con la tienda de la Fundación Andalusí.':
      'وصلتك هذه الرسالة بسبب تعاملك مع متجر المؤسسة الأندلسية.',
    'Tel.': 'الهاتف:',
    'Hemos recibido tu pago. Gracias por comprar en la tienda de la Fundación Andalusí.':
      'لقد استلمنا دفعتك. شكرًا لتسوّقك من متجر المؤسسة الأندلسية.',
    'Pedido n.º': 'رقم الطلب',
    '¡Gracias por tu pedido!': 'شكرًا على طلبك!',
    'Hola': 'مرحبًا',
    'Hemos recibido tu pago y tu pedido ya está confirmado. Lo prepararemos en 24-48 horas laborables y te avisaremos cuando salga hacia tu dirección.':
      'لقد استلمنا دفعتك وتم تأكيد طلبك. سنجهّزه خلال 24-48 ساعة عمل، وسنُعلمك عند شحنه إلى عنوانك.',
    'Factura adjunta.': 'الفاتورة مرفقة.',
    'Encontrarás tu factura': 'ستجد فاتورتك',
    'en PDF adjunta a este correo.': 'بصيغة PDF مرفقة بهذه الرسالة.',
    'Resumen del pedido': 'ملخّص الطلب',
    'Subtotal': 'المجموع الفرعي',
    'Descuento': 'الخصم',
    'Envío': 'الشحن',
    'Gratis': 'مجاني',
    'Total': 'الإجمالي',
    'IVA incluido': 'شاملًا ضريبة القيمة المضافة',
    'Dirección de envío': 'عنوان الشحن',
    'Pago': 'الدفع',
    'Tarjeta': 'بطاقة بنكية',
    'Entrega: 2 a 5 días laborables': 'التوصيل: من 2 إلى 5 أيام عمل',
    'Seguir comprando': 'متابعة التسوّق',
    'Tu cuenta en la tienda de la Fundación Andalusí ya está lista.': 'حسابك في متجر المؤسسة الأندلسية جاهز.',
    'Tu cuenta': 'حسابك',
    'Te damos la bienvenida': 'أهلًا وسهلًا بك',
    'Gracias por crear tu cuenta en la tienda de la Fundación Andalusí. Desde ella podrás consultar tus pedidos, guardar tus direcciones y comprar más rápido.':
      'شكرًا لإنشائك حسابًا في متجر المؤسسة الأندلسية. من خلاله يمكنك متابعة طلباتك وحفظ عناوينك والشراء بسرعة أكبر.',
    'En la tienda encontrarás los libros y materiales del Método Andalusí y las publicaciones de nuestra editorial, creados en castellano para aprender árabe y conocer la cultura islámica.':
      'ستجد في المتجر كتب ومواد المنهج الأندلسي وإصدارات دار نشرنا، المُعدّة بالإسبانية لتعلّم اللغة العربية والتعرّف على الثقافة الإسلامية.',
    'Ir a mi cuenta': 'الذهاب إلى حسابي',
    'Crea una nueva contraseña para tu cuenta de la tienda.': 'أنشئ كلمة مرور جديدة لحسابك في المتجر.',
    'Restablece tu contraseña': 'إعادة تعيين كلمة المرور',
    'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en la tienda de la Fundación Andalusí. Pulsa el botón para elegir una nueva:':
      'تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك في متجر المؤسسة الأندلسية. اضغط على الزر لاختيار كلمة مرور جديدة:',
    'Crear una nueva contraseña': 'إنشاء كلمة مرور جديدة',
    'Si el botón no funciona, copia este enlace en tu navegador:': 'إذا لم يعمل الزر، فانسخ هذا الرابط في متصفحك:',
    'Si no has pedido este cambio, ignora este correo: tu contraseña seguirá siendo la misma.':
      'إذا لم تطلب هذا التغيير، فتجاهل هذه الرسالة؛ ستبقى كلمة مرورك كما هي.',
    'Tu pedido ya está en camino.': 'طلبك في الطريق إليك.',
    'Tu pedido está en camino': 'طلبك في الطريق إليك',
    '¡Buenas noticias! Hemos enviado tu pedido. Lo recibirás en un plazo de 2 a 5 días laborables.':
      'أخبار سارّة! لقد شحنّا طلبك، وستستلمه خلال 2 إلى 5 أيام عمل.',
    'Transportista': 'شركة الشحن',
    'Número de seguimiento': 'رقم التتبّع',
    'Te avisaremos si el transportista nos facilita un número de seguimiento.': 'سنُعلمك إذا زوّدتنا شركة الشحن برقم تتبّع.',
    'Seguir mi envío': 'تتبّع شحنتي',
    'Artículos enviados': 'المنتجات المشحونة',
    'Ver los detalles del pedido': 'عرض تفاصيل الطلب',
    'Tu pedido ha sido entregado.': 'تم تسليم طلبك.',
    'Tu pedido ha sido entregado': 'تم تسليم طلبك',
    'Tu pedido se entregó el': 'تم تسليم طلبك بتاريخ',
    'Esperamos que disfrutes de tus libros y materiales.': 'نتمنّى أن تستمتع بكتبك وموادك.',
    'Artículos entregados': 'المنتجات المسلَّمة',
    'Si algo no ha llegado bien, tienes 14 días naturales para devolverlo. Escríbenos y te explicamos cómo hacerlo.':
      'إذا وصلك أي شيء بحالة غير سليمة، فلديك 14 يومًا تقويميًا لإرجاعه. راسلنا وسنشرح لك الطريقة.',
    'Volver a la tienda': 'العودة إلى المتجر',
    'Fundación Andalusí de España': 'المؤسسة الأندلسية في إسبانيا'
  }
};

const MISSING = new Set();

function build(lang) {
  const t = (s) => {
    if (lang === 'es') return s;
    const tr = TRANSLATIONS[lang]?.[s];
    if (tr === undefined) MISSING.add(`${lang}: ${s}`);
    return tr ?? s;
  };
  const rtl = lang === 'ar';
  const dir = rtl ? 'rtl' : 'ltr';
  const start = rtl ? 'right' : 'left'; // lado donde empieza el texto
  const end = rtl ? 'left' : 'right';
  const arrow = rtl ? '&larr;' : '&rarr;';
  // Enlaces a la tienda en el idioma del correo (/en/…, /ar/…; el español sin prefijo).
  const home = lang === 'es' ? '{{storeInfo.homeUrl}}' : `{{storeInfo.homeUrl}}/${lang}`;
  const FONT = rtl
    ? "Tajawal, 'Segoe UI', Tahoma, Arial, sans-serif"
    : "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const HEADING = rtl ? FONT : "Tajawal, Inter, 'Segoe UI', Helvetica, Arial, sans-serif";

  const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px;">
  <tr>
    <td align="center" bgcolor="${C.brand}" style="border-radius:16px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:16px;">${label}&nbsp;${arrow}</a>
    </td>
  </tr>
</table>`;

  /** Botón con borde (secundario). */
  const buttonOutline = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;">
  <tr>
    <td align="center" style="border:2px solid ${C.brand};border-radius:16px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:${C.brand};text-decoration:none;border-radius:16px;">${label}&nbsp;${arrow}</a>
    </td>
  </tr>
</table>`;

  const p = (html, extra = '') =>
    `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.ink};text-align:${start};${extra}">${html}</p>`;

  const h2 = (text) =>
    `<h2 style="margin:28px 0 12px;font-family:${HEADING};font-size:19px;font-weight:500;color:${C.ink};text-align:${start};">${text}</h2>`;

  /** Lista de artículos (pedido o envío). `withPrice`: miniatura e importe de cada línea. */
  const itemsTable = (list, withPrice) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="border-collapse:collapse;">
  {{#each ${list}}}
  <tr>
    ${
      withPrice
        ? `<td width="72" valign="top" style="padding:14px 0;padding-${end}:14px;border-bottom:1px solid ${C.line};">
      {{#if this.thumbnail}}<img src="{{this.thumbnail}}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid ${C.line};" />{{else}}<div style="width:64px;height:64px;border-radius:10px;background:${C.smoke};"></div>{{/if}}
    </td>`
        : ''
    }
    <td valign="middle" align="${start}" style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${FONT};text-align:${start};">
      <div style="font-size:15px;font-weight:600;color:${C.ink};">{{this.product_name}}</div>
      <div style="margin-top:4px;font-size:13px;color:${C.soft};">${t('Cantidad')}: {{this.qty}}</div>
    </td>
    ${
      withPrice
        ? `<td align="${end}" valign="middle" style="padding:14px 0;padding-${start}:12px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};white-space:nowrap;text-align:${end};">{{currency this.line_total_with_discount_incl_tax}}</td>`
        : ''
    }
  </tr>
  {{/each}}
</table>`;

  const totalRow = (label, value, strong = false) => `
  <tr>
    <td align="${start}" style="padding:${strong ? '12px 0 0' : '4px 0'};font-family:${FONT};font-size:${strong ? '17px' : '14px'};font-weight:${strong ? 700 : 400};color:${strong ? C.ink : C.soft};text-align:${start};${strong ? `border-top:1px solid ${C.line};` : ''}">${label}</td>
    <td align="${end}" style="padding:${strong ? '12px 0 0' : '4px 0'};font-family:${FONT};font-size:${strong ? '17px' : '14px'};font-weight:${strong ? 700 : 500};color:${strong ? C.brand : C.ink};text-align:${end};${strong ? `border-top:1px solid ${C.line};` : ''}">${value}</td>
  </tr>`;

  const card = (inner) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin-top:8px;background:${C.smoke};border-radius:14px;">
  <tr><td style="padding:18px 20px;text-align:${start};">${inner}</td></tr>
</table>`;

  const help = p(
    `${t('¿Tienes alguna duda? Escríbenos a')} <a href="mailto:${EMAIL}" style="color:${C.brand};font-weight:600;text-decoration:none;"><span dir="ltr">${EMAIL}</span></a> ${t('y te ayudaremos encantados.')}`,
    `margin-top:26px;font-size:14px;color:${C.soft};`
  );

  const address = (a) => `
{{#if ${a}}}
<div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink};text-align:${start};">
  <strong>{{${a}.full_name}}</strong><br />
  {{${a}.address_1}}{{#if ${a}.address_2}}, {{${a}.address_2}}{{/if}}<br />
  {{${a}.postcode}} {{${a}.city}}{{#if ${a}.province_name}} ({{${a}.province_name}}){{/if}}<br />
  {{#if ${a}.telephone}}${t('Tel.')} <span dir="ltr">{{${a}.telephone}}</span>{{/if}}
</div>
{{/if}}`;


  const OWNER = 'Fundación Método Andalusí de España';
  const OWNER_ADDRESS = 'Calle Anastasio Herrero 5, 28020 Madrid';
  const small = (html) => p(html, `font-size:13px;color:${C.soft};`);
  /** «Desistir del contrato aquí»: enlace firmado del pedido (withdrawalUrl) o, si falta, la página general. */
  const withdrawalButton = `{{#if withdrawalUrl}}${buttonOutline('{{{withdrawalUrl}}}', t('Desistir del contrato aquí'))}{{else}}${buttonOutline(`${home}/desistimiento?order={{order.order_number}}`, t('Desistir del contrato aquí'))}{{/if}}`;
  /** Información de desistimiento y formulario modelo (art. 97 y 98.7 TRLGDCU, anexo B). */
  const withdrawalInfo = `
${h2(t('Tu derecho de desistimiento'))}
${p(`${t('Tienes 14 días naturales desde que recibes el pedido para desistir de la compra sin dar explicaciones. Puedes hacerlo con el enlace «Desistir del contrato aquí», escribiéndonos a')} <a href="mailto:${EMAIL}" style="color:${C.brand};"><span dir="ltr">${EMAIL}</span></a> ${t('o por carta, con el modelo de formulario de abajo (su uso no es obligatorio).')}`, 'font-size:14px;')}
${p(t('Te devolveremos todos los pagos, incluidos los gastos del envío estándar, en un máximo de 14 días naturales desde que nos lo comuniques, por el mismo medio de pago. Podemos esperar a recibir los productos o el justificante de su envío. Los gastos de devolución corren de tu cuenta, salvo que el producto sea defectuoso o no sea lo que pediste.'), 'font-size:14px;')}
${p(`${t('Todos los productos tienen una garantía legal de conformidad de tres años.')} <a href="${home}/condiciones-de-venta" style="color:${C.brand};">${t('Consulta las condiciones de venta completas')}</a>.`, 'font-size:14px;')}
${withdrawalButton}
${card(`
<div style="font-family:${FONT};font-size:13px;line-height:1.7;color:${C.ink};">
  <strong>${t('Modelo de formulario de desistimiento')}</strong><br />
  ${t('A la atención de')} <span dir="ltr">${OWNER}, ${OWNER_ADDRESS}, ${EMAIL}</span>:<br />
  ${t('Por la presente le comunico que desisto de mi contrato de venta del siguiente bien:')} ……………………<br />
  ${t('Pedido n.º')} <span dir="ltr">{{order.order_number}}</span> · ${t('Pedido el')} {{date order.created_at}} · ${t('Recibido el')}: ………<br />
  ${t('Nombre y domicilio del consumidor:')} ……………………<br />
  ${t('Firma (solo si se presenta en papel) y fecha:')} ………
</div>`)}`;

  const orderNo = `${t('Pedido n.º')} <span dir="ltr">{{order.order_number}}</span>`;
  const detailsLink = `{{#if trackOrderUrl}}<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;text-align:${start};"><a href="{{trackOrderUrl}}" style="color:${C.brand};font-weight:600;text-decoration:none;">${t('Ver los detalles del pedido')} ${arrow}</a></p>{{/if}}`;

  /** Marco común: logotipo, franja verde con título, tarjeta con el contenido y pie verde. */
  const layout = ({ preheader, eyebrow, title, body }) => `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  <link href="{{storeInfo.homeUrl}}/fonts/fonts.css" rel="stylesheet" />
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
<body dir="${dir}" style="margin:0;padding:0;background:${C.smoke};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" bgcolor="${C.smoke}" style="background:${C.smoke};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
          <!-- Cabecera: logotipo de la Fundación -->
          <tr>
            <td align="${start}" class="px" style="padding:22px 36px;border-bottom:1px solid ${C.smoke};">
              <a href="${home}" target="_blank" style="text-decoration:none;">
                <img src="{{storeInfo.homeUrl}}/brand/logo-fundacion.png" width="150" alt="${t('Fundación Andalusí de España')}" style="display:inline-block;width:150px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <!-- Franja verde con el título -->
          <tr>
            <td class="px" bgcolor="${C.brand}" style="padding:34px 36px 32px;background:${C.brand};text-align:${start};">
              ${eyebrow ? `<div style="display:inline-block;margin-bottom:14px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.16);font-family:${FONT};font-size:12px;font-weight:600;color:#ffffff;">&#9679;&nbsp; ${eyebrow}</div>` : ''}
              <h1 class="hero-title" style="margin:0;font-family:${HEADING};font-size:30px;line-height:1.25;font-weight:400;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <!-- Contenido -->
          <tr>
            <td class="px" style="padding:32px 36px 36px;text-align:${start};">
              ${body}
            </td>
          </tr>
          <!-- Pie -->
          <tr>
            <td class="px" bgcolor="${C.brand}" style="padding:28px 36px;background:${C.brand};text-align:${start};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">
                <tr>
                  <td valign="top" style="font-family:${FONT};text-align:${start};">
                    <img src="{{storeInfo.homeUrl}}/brand/logo-fundacion-blanco.png" width="120" alt="${t('Fundación Andalusí de España')}" style="display:inline-block;width:120px;height:auto;border:0;" />
                    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#ffffff;">${t('La misión de la Fundación es promover la enseñanza del árabe y preservar el patrimonio islámico en España.')}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:18px;font-family:${FONT};font-size:12px;line-height:1.8;color:rgba(255,255,255,0.9);text-align:${start};">
                    <span dir="ltr">Fundación Método Andalusí de España · CIF G42979898</span><br />
                    <span dir="ltr">Calle Anastasio Herrero 5, 28020 Madrid</span> · <a href="mailto:${EMAIL}" style="color:#ffffff;"><span dir="ltr">${EMAIL}</span></a><br />
                    <a href="${home}" style="color:#ffffff;">${t('Tienda online')}</a> &nbsp;·&nbsp;
                    <a href="${SITE}" style="color:#ffffff;">fundacionandalusi.org</a> &nbsp;·&nbsp;
                    <a href="${home}/condiciones-de-venta" style="color:#ffffff;">${t('Condiciones de venta')}</a> &nbsp;·&nbsp;
                    <a href="${home}/politica-de-privacidad" style="color:#ffffff;">${t('Privacidad')}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:${FONT};font-size:11px;color:#9a9a9a;">${t('Has recibido este correo por tu relación con la tienda de la Fundación Andalusí.')}</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return {
    'order-confirmation.html': layout({
      preheader: t('Hemos recibido tu pago. Gracias por comprar en la tienda de la Fundación Andalusí.'),
      eyebrow: orderNo,
      title: t('¡Gracias por tu pedido!'),
      body: `
${p(`${t('Hola')}{{#if shippingAddress.full_name}} {{shippingAddress.full_name}}{{/if}}${rtl ? '،' : ','}`)}
${p(t('Hemos recibido tu pago y tu pedido ya está confirmado. Lo prepararemos en 24-48 horas laborables y te avisaremos cuando salga hacia tu dirección.'))}
{{#if invoiceName}}
${card(`<p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink};"><strong style="color:${C.brand};">${t('Factura adjunta.')}</strong> ${t('Encontrarás tu factura')} <strong dir="ltr">{{invoiceName}}</strong> ${t('en PDF adjunta a este correo.')}</p>`)}
{{/if}}
${h2(t('Resumen del pedido'))}
<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;color:${C.soft};text-align:${start};">${orderNo} · {{date order.created_at}}</p>
${itemsTable('order.items', true)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin-top:14px;">
  ${totalRow(t('Subtotal'), '{{currency order.sub_total_incl_tax}}')}
  {{#if order.discount_amount}}${totalRow(t('Descuento'), '−{{currency order.discount_amount}}')}{{/if}}
  {{#if order.shipping_fee_incl_tax}}${totalRow(t('Envío'), '{{currency order.shipping_fee_incl_tax}}')}{{else}}${totalRow(t('Envío'), t('Gratis'))}{{/if}}
  ${totalRow(t('Total'), '{{currency order.grand_total}}', true)}
  <tr><td colspan="2" align="${end}" style="padding-top:6px;font-family:${FONT};font-size:12px;color:${C.soft};text-align:${end};">${t('IVA incluido')}: {{currency order.total_tax_amount}}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="margin-top:26px;">
  <tr>
    <td class="col" width="50%" valign="top" style="padding-${end}:12px;text-align:${start};">
      <div style="margin-bottom:8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:${rtl ? '0' : '.04em'};text-transform:uppercase;color:${C.soft};">${t('Dirección de envío')}</div>
      ${address('shippingAddress')}
    </td>
    <td class="col" width="50%" valign="top" style="padding-${start}:12px;text-align:${start};">
      <div style="margin-bottom:8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:${rtl ? '0' : '.04em'};text-transform:uppercase;color:${C.soft};">${t('Pago')}</div>
      <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink};">{{#if order.payment_method_name}}{{order.payment_method_name}}{{else}}${t('Tarjeta')}{{/if}}<br />${t('Entrega: 2 a 5 días laborables')}</div>
    </td>
  </tr>
</table>
${button(home, t('Seguir comprando'))}
${withdrawalInfo}
${help}`
    }),

    'withdrawal-received.html': layout({
      preheader: t('Hemos recibido tu desistimiento.'),
      eyebrow: orderNo,
      title: t('Hemos recibido tu desistimiento'),
      body: `
${p(`${t('Hola')} {{withdrawal.fullName}}${rtl ? '،' : ','}`)}
${p(t('Este es el acuse de recibo de tu desistimiento. Estos son los datos que nos has enviado:'))}
${card(`
<div style="font-family:${FONT};font-size:14px;line-height:1.8;color:${C.ink};">
  <strong>${t('Pedido n.º')}:</strong> <span dir="ltr">{{order.order_number}}</span><br />
  <strong>${t('Recibido el')}:</strong> {{withdrawal.receivedAt}}<br />
  <strong>${t('Referencia')}:</strong> <span dir="ltr">{{withdrawal.id}}</span><br />
  <strong>${t('Nombre')}:</strong> {{withdrawal.fullName}}<br />
  <strong>${t('Correo electrónico')}:</strong> <span dir="ltr">{{withdrawal.email}}</span><br />
  <strong>${t('Productos')}:</strong> {{#if withdrawal.items}}{{withdrawal.items}}{{else}}${t('Todo el pedido')}{{/if}}
  {{#if withdrawal.comment}}<br /><strong>${t('Comentarios')}:</strong> {{withdrawal.comment}}{{/if}}
</div>`)}
${h2(t('Productos del pedido'))}
${itemsTable('products', false)}
${h2(t('Próximos pasos'))}
${p(t('Envíanos los productos en un plazo de 14 días naturales a esta dirección, indicando el número de pedido:'))}
${p(`<strong dir="ltr">${OWNER} · ${OWNER_ADDRESS}</strong>`)}
${p(t('Te devolveremos todos los pagos, incluidos los gastos del envío estándar, en un máximo de 14 días naturales desde hoy, por el mismo medio de pago. Podemos esperar a recibir los productos o el justificante de su envío. Los gastos de devolución corren de tu cuenta, salvo que el producto sea defectuoso o no sea lo que pediste.'))}
${help}`
    }),

    'customer-welcome.html': layout({
      preheader: t('Tu cuenta en la tienda de la Fundación Andalusí ya está lista.'),
      eyebrow: t('Tu cuenta'),
      title: t('Te damos la bienvenida'),
      body: `
${p(`${t('Hola')}{{#if customer.full_name}} {{customer.full_name}}{{/if}}${rtl ? '،' : ','}`)}
${p(t('Gracias por crear tu cuenta en la tienda de la Fundación Andalusí. Desde ella podrás consultar tus pedidos, guardar tus direcciones y comprar más rápido.'))}
${p(t('En la tienda encontrarás los libros y materiales del Método Andalusí y las publicaciones de nuestra editorial, creados en castellano para aprender árabe y conocer la cultura islámica.'))}
${button(`${home}/account`, t('Ir a mi cuenta'))}
${help}`
    }),

    'reset-password.html': layout({
      preheader: t('Crea una nueva contraseña para tu cuenta de la tienda.'),
      eyebrow: t('Tu cuenta'),
      title: t('Restablece tu contraseña'),
      body: `
${p(`${t('Hola')}${rtl ? '،' : ','}`)}
${p(t('Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en la tienda de la Fundación Andalusí. Pulsa el botón para elegir una nueva:'))}
${button('{{resetPasswordUrl}}', t('Crear una nueva contraseña'))}
${p(t('Si el botón no funciona, copia este enlace en tu navegador:'), `margin-top:22px;font-size:13px;color:${C.soft};`)}
<p dir="ltr" style="margin:0 0 14px;font-family:${FONT};font-size:12px;line-height:1.5;word-break:break-all;text-align:left;"><a href="{{resetPasswordUrl}}" style="color:${C.brand};">{{resetPasswordUrl}}</a></p>
${p(t('Si no has pedido este cambio, ignora este correo: tu contraseña seguirá siendo la misma.'), `font-size:14px;color:${C.soft};`)}
${help}`
    }),

    'shipment-created.html': layout({
      preheader: t('Tu pedido ya está en camino.'),
      eyebrow: orderNo,
      title: t('Tu pedido está en camino'),
      body: `
${p(`${t('Hola')}${rtl ? '،' : ','}`)}
${p(t('¡Buenas noticias! Hemos enviado tu pedido. Lo recibirás en un plazo de 2 a 5 días laborables.'))}
${card(`
<div style="font-family:${FONT};font-size:14px;line-height:1.8;color:${C.ink};">
  {{#if carrierName}}<strong>${t('Transportista')}:</strong> {{carrierName}}<br />{{/if}}
  {{#if shipment.tracking_number}}<strong>${t('Número de seguimiento')}:</strong> <span dir="ltr">{{shipment.tracking_number}}</span>{{else}}${t('Te avisaremos si el transportista nos facilita un número de seguimiento.')}{{/if}}
</div>`)}
{{#if trackingUrl}}${button('{{trackingUrl}}', t('Seguir mi envío'))}{{/if}}
${h2(t('Artículos enviados'))}
${itemsTable('items', false)}
${detailsLink}
{{#if withdrawalUrl}}${p(`${t('Si cambias de opinión, tienes 14 días naturales desde que lo recibas para desistir de la compra:')} <a href="{{{withdrawalUrl}}}" style="color:${C.brand};font-weight:700;">${t('Desistir del contrato aquí')}</a>`, `margin-top:22px;font-size:14px;color:${C.soft};`)}{{/if}}
${help}`
    }),

    'shipment-delivered.html': layout({
      preheader: t('Tu pedido ha sido entregado.'),
      eyebrow: orderNo,
      title: t('Tu pedido ha sido entregado'),
      body: `
${p(`${t('Hola')}${rtl ? '،' : ','}`)}
${p(`${t('Tu pedido se entregó el')} {{date deliveredOn}}. ${t('Esperamos que disfrutes de tus libros y materiales.')}`)}
${h2(t('Artículos entregados'))}
${itemsTable('items', false)}
${detailsLink}
${button(home, t('Volver a la tienda'))}
${h2(t('Tu derecho de desistimiento'))}
${p(t('Tienes 14 días naturales desde hoy para desistir de la compra sin dar explicaciones. Pulsa el botón, confirma y recibirás el acuse de recibo; después nos envías los productos y te devolvemos el importe, incluidos los gastos del envío estándar.'), 'font-size:14px;')}
{{#if withdrawalUrl}}${buttonOutline('{{{withdrawalUrl}}}', t('Desistir del contrato aquí'))}{{else}}${buttonOutline(`${home}/desistimiento`, t('Desistir del contrato aquí'))}{{/if}}
${help}`
    })
  };
}

for (const lang of LANGS) {
  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  for (const [file, html] of Object.entries(build(lang))) {
    writeFileSync(join(dir, file), html);
    console.log(`✓ emails/${lang}/${file}`);
  }
}
if (MISSING.size) {
  console.error(`Textos sin traducir:\n  ${[...MISSING].join('\n  ')}`);
  process.exit(1);
}
