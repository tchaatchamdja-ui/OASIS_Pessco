# OASIS — image d'exécution.
# Deux étages : les dépendances sont installées à part, l'image finale ne
# contient que le nécessaire et tourne sous un compte non privilégié.

FROM node:22-alpine AS dependances
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4750

COPY --from=dependances /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
COPY config ./config

# Les données vivent hors de l'image : un volume les porte d'une version à
# l'autre. Le répertoire est créé et cédé au compte applicatif.
RUN mkdir -p /app/data \
 && addgroup -S oasis && adduser -S oasis -G oasis \
 && chown -R oasis:oasis /app
VOLUME /app/data
USER oasis

EXPOSE 4750
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4750/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
