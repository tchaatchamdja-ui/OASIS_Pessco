# OASIS — image d'exécution.
# Trois étages : les dépendances d'exécution d'un côté, la construction du
# frontend de l'autre, et l'image finale qui ne contient que le nécessaire et
# tourne sous un compte non privilégié.

FROM node:22-alpine AS dependances
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── La construction du frontend (ADR-003) ──
#
# Les écrans en React + TypeScript se construisent ; leur paquet n'est pas
# versionné, parce qu'un paquet obsolète servi en production est un défaut qui ne
# se voit pas. L'image doit donc le produire elle-même.
#
# `--ignore-scripts` : l'arbre de développement porte Puppeteer, qui télécharge
# Chromium à l'installation. Cet étage n'a besoin que d'esbuild, de TypeScript et
# de React — et ce téléchargement pèse plus que tout le reste réuni.
#
# `NODE_ENV=production` est posé **ici**, et non laissé vide : c'est lui qui dit
# à esbuild de minifier, d'omettre les cartes de source, et surtout de construire
# React en régime de production. Laissé vide, l'image emportait un paquet de
# développement — trois fois plus lourd, et React en mode développement sur un
# serveur de production. Render pose la variable ; l'image ne l'aurait pas posée,
# et les deux chemins auraient servi deux paquets différents.
#
# Du coup `--include=dev` n'est pas une précaution de style : npm tire de
# `NODE_ENV=production` la conclusion qu'il peut sauter les dépendances de
# développement, et la construction échouerait en annonçant qu'esbuild est
# introuvable, loin de sa cause. L'étage exerce donc le même piège que Render.
FROM node:22-alpine AS construction
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --include=dev --ignore-scripts
COPY frontend ./frontend
RUN npm run build

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
# Tout ce que l'étage de construction a produit, par-dessus `public/` :
# `express.static` le sert comme le reste. Sans cette ligne, la page se charge et
# l'écran reste blanc — la réponse HTTP est 200, et c'est bien le problème.
#
# On copie `public/` **entier**, et non `public/modules` : l'étage de
# construction ne porte que ce qu'il a produit — il ne reçoit que `frontend/` —
# donc ce répertoire ne contient rien d'autre, et la copie fusionne. Nommer les
# sous-répertoires un par un a coûté le défaut suivant, trouvé par le contrôle
# d'image de la CI : le socle commun passé en TypeScript se construit vers
# `public/shared/app/`, qui n'était pas dans la liste. L'image servait alors un
# 404 sur `oasis-theme.js` — pour **les neuf écrans**, pas pour un seul.
COPY --from=construction /app/public ./public

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
