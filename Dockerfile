# Imagen de producción de la tienda de la Fundación Andalusí (EverShop + tema albayan + Redsys)
FROM node:22-alpine AS build
WORKDIR /app
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY extensions/redsys/package.json extensions/redsys/
COPY extensions/smtp-mail/package.json extensions/smtp-mail/
COPY extensions/odoo/package.json extensions/odoo/
COPY extensions/mobile-app/package.json extensions/mobile-app/
COPY extensions/tienda/package.json extensions/tienda/
COPY themes/albayan/package.json themes/albayan/
RUN npm ci --no-audit --no-fund
COPY . .
# compila extensiones y tema (tsc) y genera los bundles de webpack
RUN NODE_ENV=production npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    TRUST_PROXY_HOPS=1
COPY --from=build /app /app
RUN mkdir -p media public && chown -R node:node /app
USER node
EXPOSE 3000
# Las migraciones de base de datos se aplican automáticamente al arrancar.
# Arranca la tienda y crea el administrador (ADMIN_EMAIL) la primera vez.
CMD ["node", "scripts/start.mjs"]
