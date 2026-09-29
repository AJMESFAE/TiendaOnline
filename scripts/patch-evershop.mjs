#!/usr/bin/env node
// Ajustes sobre el paquete de EverShop instalado en node_modules, aplicados antes de
// compilar (npm run build). Idempotente.
//
// 1. Stripe: el módulo de Stripe del núcleo importa '@stripe/stripe-js', que al cargarse
//    inserta el script de js.stripe.com en la página de pago aunque Stripe no se use
//    (la tienda cobra con Redsys). Con '@stripe/stripe-js/pure' el script solo se carga
//    si de verdad se inicia Stripe. Así el navegador del cliente no contacta con Stripe.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const patches = [
  {
    file: 'node_modules/@evershop/evershop/dist/modules/stripe/pages/frontStore/checkout/Stripe.js',
    from: "import { loadStripe } from '@stripe/stripe-js';",
    to: "import { loadStripe } from '@stripe/stripe-js/pure';"
  }
];

let failed = false;
for (const p of patches) {
  const file = join(ROOT, p.file);
  if (!existsSync(file)) {
    console.error(`✗ No existe ${p.file}`);
    failed = true;
    continue;
  }
  const src = readFileSync(file, 'utf8');
  if (src.includes(p.to)) {
    console.log(`· ${p.file}: ya aplicado`);
  } else if (src.includes(p.from)) {
    writeFileSync(file, src.replace(p.from, p.to));
    console.log(`✓ ${p.file}`);
  } else {
    console.error(`✗ ${p.file}: no se encuentra el texto a cambiar (¿otra versión de EverShop?)`);
    failed = true;
  }
}
if (failed) process.exit(1);
