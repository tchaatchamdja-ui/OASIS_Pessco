# Déploiement d'OASIS

Application **monolithique mono-port** : Express sert l'API sous `/api` et le front statique
depuis `public/`. Aucune étape de build, aucun service séparé, pas de CORS à configurer.
Un seul **Web Service** Render suffit.

---

## 1. Ce que le déploiement suppose

| Élément | Valeur |
|---|---|
| Runtime | Node ≥ 20 (`engines` dans `package.json`) |
| Commande de construction | `npm ci --include=dev && npm run build` — voir § 1.1 |
| Commande de démarrage | `npm start` → `node server.js` |
| Port | `process.env.PORT`, écoute sur `0.0.0.0` |
| Sonde de santé | `GET /api/health` |
| Stockage | fichiers JSON dans `OASIS_DATA_DIR` (défaut `./data`) |
| Base de données | aucune — PostgreSQL est la cible prévue, non branchée |

### 1.1 Les écrans se construisent

Les écrans portés en React + TypeScript ([ADR-003](docs/ADR-003-cadre-du-frontend.md)) ne sont
pas servis depuis leurs sources : `npm run build` les assemble dans
`public/modules/<module>/app/`. **Ce paquet n'est pas versionné** — un paquet obsolète
servi en production est un défaut qui ne se voit pas.

Conséquence : `npm ci` seul ne suffit plus. Une plateforme qui installe et démarre sans
construire met un service en ligne qui **démarre, répond 200 sur `/api/health`, répond
200 sur la page de l'écran — et sert un écran blanc.** Mesuré : en retirant du
`Dockerfile` la seule ligne qui copie le paquet, ces trois vérifications restent vertes
et seul `/modules/droits/app/main.js` manque.

Deux pièges, l'un et l'autre rencontrés :

| Piège | Ce qui arrive | Ce qui l'évite |
|---|---|---|
| `npm ci` sans `--include=dev` | `NODE_ENV=production` suffit à faire écarter les dépendances de développement par npm ; la construction échoue en annonçant qu'esbuild est introuvable, **loin de sa cause** | `--include=dev`, explicite, dans la commande de construction |
| Construire sans `NODE_ENV=production` | Le paquet part sans minification, avec sa carte de source, et **React en régime de développement** : 3,2 Mo au lieu de 244 Ko | Poser `NODE_ENV=production` *avant* `npm run build` |

Les deux se tiennent ensemble : la variable qui fait bien construire est celle qui fait
mal installer. C'est pourquoi `--include=dev` est écrit partout où la construction passe.

La CI ne se contente pas de constater que l'image se construit : elle la **démarre et
demande le paquet** (§ 6). « L'image se construit » ne dit pas qu'elle sert quelque chose.

---

## 2. Avertissement sur la persistance (plan gratuit)

Le disque d'un service Render **free est éphémère**. À chaque redéploiement, et à chaque
réveil après les 15 minutes de mise en veille, `data/` repart vide :

- les référentiels sont réamorcés (6 domaines, 6 secteurs, 2 prestataires de démonstration) ;
- les trois comptes sont recréés ;
- **tout ce qui a été saisi est perdu** : plans, notifications, dossiers, rapports, audit.

Ce déploiement vaut donc pour la **démonstration**, pas pour l'exploitation.

### Passer à un stockage durable

1. Service en plan **Starter** (~7 $/mois) — les disques ne sont pas offerts sur le plan free.
2. Ajouter un **disque** : *Settings → Disks* → nom `oasis-data`, point de montage
   `/var/data`, taille 1 Go.
3. Ajouter la variable **`OASIS_DATA_DIR=/var/data`**.
4. Redéployer. Les données survivent alors aux redéploiements.

À plus long terme, la configuration prévoit PostgreSQL (`config/oasis.config.json`,
section `database`) : c'est un chantier de remplacement de `src/store.js`.

---

## 3. Première mise en service

### 3.1 Dépôt

Le code est sur GitHub : `tchaatchamdja-ui/OASIS_Pessco`, dépôt **privé**.

### Et pourquoi cette ligne a compté

Elle nommait `tchaatchamdja-ui/OASIS` — le dépôt d'origine, conservé sous le
nom de distant `ancien`. Le Blueprint de Render avait donc été créé **sur ce
dépôt-là**, et `autoDeploy: true` y attendait des poussées qui n'arrivaient
plus : au 3 novembre 2026, le dépôt servi était **165 commits en arrière**, et
chaque commit depuis le changement de dépôt déclenchait un redéploiement de
rien.

Un déploiement automatique ne dit pas qu'il surveille le mauvais dépôt : il se
tait, exactement comme s'il n'y avait rien à déployer. *Le nom du dépôt servi
est une donnée de déploiement, pas une mention de courtoisie* — c'est pourquoi
il est écrit ici, et pourquoi le changer sans le corriger ici était un défaut.

Au recablage : *New → Blueprint → `OASIS_Pessco` → branche `main`*, puis
supprimer l'ancien service, qui servirait sinon une version figée sous une URL
qui a l'air vivante.

La branche déployée est **`main`** — c'est elle que `render.yaml` désigne. Le dépôt
n'a plus qu'une branche : les travaux de la Phase 2, longtemps portés par
`phase-2`, l'ont rejointe.

Le point de retour vers le socle Phase 1 est le tag **`phase-1`**. En cas
d'incident, `branch: phase-1` dans `render.yaml` ramène le service à cet état ;
un tag n'avance pas, la reprise est donc stable.

Chaque poussée sur la branche déployée déclenche un redéploiement (`autoDeploy: true`).

### 3.2 Créer le service sur Render

Le fichier `render.yaml` décrit le service ; Render le lit comme un *Blueprint*.

1. [render.com](https://render.com) → se connecter avec GitHub.
2. **New → Blueprint**, choisir le dépôt `OASIS_Pessco`, branche `main`.
3. Render lit `render.yaml` et propose le service `oasis` (runtime Node, plan free,
   région Frankfurt).
4. Renseigner la seule variable laissée vide : **`OASIS_SEED_PASSWORD`** — le mot de passe
   des trois comptes créés à chaque démarrage à froid. Choisir un mot de passe conforme à
   la politique : 12 caractères au moins, majuscule, minuscule, chiffre et caractère spécial.
5. **Apply**. Le premier déploiement prend deux à trois minutes.

Sans Blueprint (création manuelle) : *New → Web Service*, dépôt `OASIS_Pessco`, runtime Node,
build **`npm ci --include=dev && npm run build`**, start `npm start`, health check
`/api/health`, puis les variables du § 4. Le `--include=dev` et le `build` ne sont pas
optionnels : sans eux le service démarre et sert des écrans blancs (§ 1.1).

### 3.3 Variables d'environnement

| Variable | Valeur | Rôle |
|---|---|---|
| `NODE_ENV` | `production` | Cookie `Secure`, HSTS, cache des fichiers statiques |
| `OASIS_TRUST_PROXY` | `1` | `req.ip` = adresse réelle du client, derrière le proxy Render |
| `OASIS_COMPRESSION` | `0` | Le proxy Render compresse déjà |
| `OASIS_SEED_PASSWORD` | *(à saisir)* | Mot de passe des comptes d'amorçage |
| `OASIS_MFA` | `1` | **Authentification multifacteur — requise en production, et exige les quatre suivantes** |
| `OASIS_SMTP_HOST` | *(à saisir)* | Serveur de messagerie — **sans lui, aucun code ne part** |
| `OASIS_SMTP_PORT` | *(à saisir)* | 587 le plus souvent |
| `OASIS_SMTP_USER` | *(à saisir)* | Compte d'envoi |
| `OASIS_SMTP_PASS` | *(à saisir)* | Son mot de passe |
| `OASIS_DATA_DIR` | `/var/data` | **Seulement** si un disque persistant est monté |

`PORT` est fourni par Render : ne pas le définir.

**L'ordre compte : la messagerie d'abord, l'authentification multifacteur
ensuite.**

Le fichier de configuration est cuit dans l'image : `config/oasis.config.json`
pointe sur `localhost:1025`, le Mailpit d'un poste de développement. Sur un
hébergement, ce serveur n'existe pas. Poser `OASIS_MFA=1` sans les variables
SMTP **ferme l'application à tout le monde** : la connexion rend bien un code à
saisir, mais le courriel qui le porte ne part nulle part.

La marche à suivre :

1. Renseigner `OASIS_SMTP_HOST`, `_PORT`, `_USER`, `_PASS` dans *Environment*.
2. Redéployer, et vérifier dans les journaux la ligne
   `authentification multifacteur active` avec le nom du serveur.
3. Alors seulement passer `OASIS_MFA` à `1`.

Le démarrage ne refuse ni l'un ni l'autre — laisser une Autorité dehors sur un
paramètre manquant serait pire — mais il écrit sur la console et inscrit au
journal d'audit : `MFA_DESACTIVEE_EN_PRODUCTION` si elle est éteinte,
`MFA_SANS_MESSAGERIE` si elle est active sans messagerie joignable.

---

## 4. Premiers pas après le déploiement

```bash
# Le service répond
curl -I https://<votre-service>.onrender.com

# Santé : statut, version, modules montés, accès au stockage
curl https://<votre-service>.onrender.com/api/health

# Connexion (le mot de passe est celui de OASIS_SEED_PASSWORD)
curl -X POST https://<votre-service>.onrender.com/api/login \
  -H 'Content-Type: application/json' \
  -H 'X-OASIS-Request: 1' \
  -d '{"username":"superadmin@anac.bj","password":"<OASIS_SEED_PASSWORD>"}'
```

Comptes créés à chaque démarrage à froid :

| Identifiant | Rôle |
|---|---|
| `superadmin@anac.bj` | SUPERADMIN |
| `admin@anac.bj` | ADMIN AAC |
| `m.ahoyo@anac.bj` | AAC |

Si `OASIS_SEED_PASSWORD` n'est pas défini, les mots de passe sont tirés au hasard et
**affichés une seule fois dans les journaux de Render** (*Logs*, au démarrage).

### Vérifications à faire dans le navigateur

- [ ] Le portail s'affiche et la connexion aboutit
- [ ] Les quatre modules s'ouvrent (Droits, Planification, Profils de risque, Exécution)
- [ ] Une écriture fonctionne (créer un plan, par exemple)
- [ ] Aucune erreur en console
- [ ] HTTPS actif (automatique sur Render)

---

## 5. Exploitation

### Redéployer

Pousser sur `main` suffit. Sinon : *Manual Deploy → Deploy latest commit*, ou le
*Deploy Hook* (Settings → Deploy Hook) :

```bash
curl -X POST 'https://api.render.com/deploy/srv-xxxx?key=yyyy'
```

### Journaux

*Logs* dans le tableau de bord. En production, **une ligne est un objet JSON** —
`{"ts","niveau","message","details"}` — que le collecteur de l'hébergeur indexe
tel quel : filtrer sur `niveau` suffit à isoler les alertes et les exceptions.
En développement, la même trace s'écrit en clair.

| Niveau | Ce qu'on y trouve |
|---|---|
| `erreur` | Exception non rattrapée (avec sa référence, sa route et sa pile), port occupé, module non monté |
| `alerte` | Authentification multifacteur éteinte en production, service attendu sans producteur |
| `info` | Démarrage (port, environnement, modules), reprises de format |
| `debug` | Rien pour l'instant — le niveau existe pour les mises au point |

`OASIS_LOG_LEVEL` abaisse ou relève le seuil (`erreur`, `alerte`, `info`,
`debug` ; `info` par défaut). Une exception rendue à l'appelant porte une
référence courte : la même figure dans la trace et dans le journal d'audit,
ce qui relie le rapport d'un agent à ce que le serveur a vu.

**Suivi des erreurs.** Il n'y a pas de service tiers branché, et c'est
délibéré : les traces d'une autorité de l'aviation civile ne sortent pas du
dispositif sans décision. Le collecteur de l'hébergeur joue ce rôle — une
alerte sur `"niveau":"erreur"` dans les journaux vaut une sonde.

### Un seul processus par répertoire de données

Le magasin par fichiers n'a pas de verrou de base : **deux processus servant le
même répertoire s'effacent l'un l'autre en silence**. C'est la condition qui
rend les fichiers acceptables (ADR-001), et le serveur la tient désormais
lui-même : au démarrage il pose un `.verrou` dans le répertoire de données, et
refuse de démarrer si un autre le tient.

| Situation | Ce qui se passe |
|---|---|
| Répertoire libre | Le verrou se pose, le serveur démarre. |
| Un processus vivant le tient, même machine | **Démarrage refusé**, avec le `ps -p` qui le retrouve. |
| Verrou laissé par un arrêt brutal | Repris, le démarrage se poursuit ; une alerte le signale. |
| Verrou d'une autre machine | **Démarrage refusé** : rien ici ne peut savoir si ce processus vit. C'est le cas de deux conteneurs sur un même volume — n'en servir qu'un. |

Sur Render, un service à disque ne tourne qu'en une instance : la contrainte est
tenue par la plateforme, et le verrou ne fait que la rendre visible.

`OASIS_VERROU=0` le lève, pour l'opérateur qui sait pourquoi il le fait. Une
archive de sauvegarde n'emporte pas le verrou : restaurée ailleurs, elle
empêcherait le démarrage.

### Mode dégradé et service worker

L'application s'installe et tient sans réseau sur les deux modules de terrain (RAMP, SURV) —
les TDR le déclarent obligatoire (§F.2). Deux conséquences d'exploitation :

| Point | Ce qu'il faut savoir |
|---|---|
| **HTTPS obligatoire** | Un service worker ne s'enregistre qu'en HTTPS (ou sur `localhost`). Derrière un proxy inverse en clair, le mode dégradé ne s'active pas — silencieusement. |
| **`/sw.js` et `/manifest.webmanifest` ne sont jamais mis en cache** | `Cache-Control: no-cache`. Un service worker gardé une heure servirait l'ancienne réserve pendant une heure après un déploiement. Ne pas les faire dormir dans un CDN. |
| **Purge après déploiement** | Le service worker efface les caches des versions antérieures à son activation. Rien à faire côté exploitation. |
| **Saisies en attente** | Elles vivent dans IndexedDB, **dans le navigateur de l'agent** — jamais sur le serveur. Un poste réinstallé avant le retour du réseau perd ce qu'il n'a pas envoyé. À dire aux agents de terrain. |

### Les sauvegardes, et la sonde qui dit si elles existent

[ADR-001](docs/ADR-001-magasin-de-donnees.md) a différé la bascule vers PostgreSQL en
écrivant ce que cela coûte : **pas de restauration à un instant donné ; les archives
horodatées sont le seul recours.** Elles doivent donc être planifiées, et la planification
doit être *vérifiable* — une tâche `cron` emportée par un conteneur recréé, un disque
plein, un `tar` interrompu, un répertoire remonté ailleurs : dans tous ces cas
**l'application continue de servir parfaitement**, et le jour où l'on apprend qu'elle
n'était plus protégée est le jour où l'on en avait besoin.

Planifier :

```bash
0 2 * * * /chemin/vers/oasis/scripts/sauvegarde.sh /var/sauvegardes/oasis 30
```

Et dire au serveur où regarder, s'il n'écrit pas dans `./sauvegardes` :

```bash
OASIS_SAUVEGARDES_DIR=/var/sauvegardes/oasis
```

`GET /api/health` rend alors un verdict, et une trace est écrite au démarrage **puis chaque
jour** — parce qu'un serveur qui tourne des semaines ne dirait la chose qu'une fois, le
jour où elle était encore vraie :

| Verdict | Ce que ça veut dire | Niveau de trace | Conduite à tenir |
|---|---|---|---|
| `ok` | Une archive de taille plausible, dans le seuil | `info` | — |
| `perimee` | La dernière dépasse le seuil (26 h par défaut) | **`erreur`** | La planification s'est arrêtée ; `age_h` dit depuis quand |
| `tronquee` | La dernière est trop petite pour être une sauvegarde | **`erreur`** | Un `tar` interrompu, le plus souvent un disque plein. **Elle est fraîche et elle ne vaut rien** |
| `aucune` | Le répertoire existe et ne porte aucune archive | **`erreur`** | La planification n'a jamais tourné, ou n'écrit pas là |
| `non_configure` | Le répertoire est introuvable | `alerte` | **La sonde ne sait pas.** Poser `OASIS_SAUVEGARDES_DIR` sur le répertoire réellement employé |

Deux choix à souligner.

**La sonde ne dit jamais « ok » quand elle ne voit rien.** « Introuvable » et « vide » sont
deux états distincts de « à jour », et chacun a sa conduite à tenir. Une sonde qui rassure
faute de pouvoir regarder fournit l'assurance exacte qu'on n'a pas.

**`non_configure` est une alerte, non une erreur.** Crier « erreur » sur ce qu'on ignore
est la meilleure façon de faire ignorer les vraies. `OASIS_SAUVEGARDES_SEUIL_H` règle le
seuil ; `OASIS_SONDE_SAUVEGARDES=0` éteint la sonde.

Le `statut` global de la sonde **ne passe pas** à `degrade` pour une sauvegarde manquante :
le service n'est pas dégradé, il est non protégé. Confondre les deux ferait ignorer
`degrade`. C'est l'alerte sur `"niveau":"erreur"` dans les journaux qui porte celle-ci.

### Environnements

Trois, qui ne se distinguent que par leurs variables — le code est le même :

| | `NODE_ENV` | `OASIS_ENV` | Données |
|---|---|---|---|
| Développement | absent | absent | `data/`, jeu local |
| Recette | `production` | `recette` | Disque propre, jeu de démonstration |
| Production | `production` | `production` | Disque persistant, sauvegardes planifiées |

`NODE_ENV=production` commande le cookie `Secure`, HSTS, le cache des fichiers
statiques et la trace structurée : une recette doit le porter, sans quoi elle
n'éprouve pas ce qui sera servi. `OASIS_ENV` ne sert qu'à les nommer.

`GET /api/health` rend l'environnement et l'instance installée, ce qui évite
d'agir sur la mauvaise fenêtre :

```bash
curl -s https://oasis-xxxx.onrender.com/api/health
# {"statut":"ok","version":"0.1.0","environnement":"recette","instance":"Bénin",…}
```

### Notifications

*Settings → Notifications* : recevoir un courriel en cas d'échec de déploiement.

### Mise en veille (plan free)

Le service s'endort après 15 minutes sans trafic ; la première requête suivante attend
environ 30 secondes. Le réveil **réinitialise les données** (voir § 2).

### Sauvegarde

Avec un disque persistant, `scripts/sauvegarde.sh` produit une archive horodatée :

```bash
scripts/sauvegarde.sh /var/data/sauvegardes 30
```

Sur le plan gratuit, il n'y a rien à sauvegarder qui survive au réveil.

---

## 6. Déploiement par conteneur

Le `Dockerfile` du dépôt est utilisable tel quel, en local ou sur toute plateforme
acceptant une image :

```bash
docker build -t oasis .
docker run -p 4750:4750 \
  -e NODE_ENV=production \
  -e OASIS_SEED_PASSWORD='UnMotDePasse!2026' \
  -v oasis-data:/app/data \
  oasis
```

`docker-compose.yml` fait la même chose avec un volume nommé et la sonde de santé.

### Ce que l'image construit elle-même

L'image a trois étages : les dépendances d'exécution, la **construction des écrans**, et
l'image finale. L'étage de construction installe l'arbre de développement et lance
`npm run build` ; l'image finale copie le paquet produit par-dessus `public/`.

Rien de cela n'est visible depuis l'extérieur, d'où deux précautions qui le rendent
vérifiable :

- **`.dockerignore` exclut `public/modules/*/app/`.** Présent sur la machine du
  développeur, le paquet local serait emporté par `COPY public` et l'image paraîtrait
  correcte alors que rien dans la chaîne ne l'aura construit — un faux vert dont la seule
  cause est l'état d'un disque. Le seul paquet qu'une image porte est celui qu'elle a
  produit.
- **La CI démarre l'image et demande le paquet** (`.github/workflows/ci.yml`, tâche
  `image`). C'est le seul contrôle qui distingue une image qui se construit d'une image
  qui sert. Éprouvé dans les deux sens : il rend 0 sur l'image correcte, 1 sur une image
  dont on a retiré la ligne de copie.

L'étage de construction installe avec `--ignore-scripts` : l'arbre de développement porte
Puppeteer, qui télécharge Chromium à l'installation, et cet étage n'a besoin que
d'esbuild, de TypeScript et de React — ce téléchargement pèse plus que tout le reste réuni.

---

## 7. Ennuis courants

| Symptôme | Cause probable | Correction |
|---|---|---|
| Build en échec sur `npm ci` | `cdn.sheetjs.com` injoignable — la dépendance `xlsx` corrigée n'est pas sur npm | Relancer ; en cas de blocage durable, revenir à `xlsx@0.18.5` **au prix de deux vulnérabilités connues** |
| `403 origine_non_reconnue` | Écriture sans l'en-tête `X-OASIS-Request` | Appeler l'API depuis l'application, ou ajouter l'en-tête dans les appels directs |
| `429` à la connexion | Plus de 20 tentatives en 15 minutes depuis une IP | Attendre le délai indiqué par `Retry-After` |
| Impossible de se connecter | Mot de passe d'amorçage inconnu après un réveil | Définir `OASIS_SEED_PASSWORD`, ou lire les journaux du démarrage |
| « démarrage refusé — le répertoire de données est déjà servi » | Un autre processus tient le répertoire | Le message donne le `ps -p` qui le retrouve ; l'arrêter, ou servir un autre répertoire (`OASIS_DATA_DIR`) |
| « le répertoire de données porte un verrou posé par … » | Verrou d'une autre machine — deux conteneurs sur un volume partagé | N'en servir qu'un. Si c'est un reste, effacer `.verrou` dans le répertoire de données |
| Données disparues | Disque éphémère du plan free | Passer au plan Starter avec un disque (§ 2) |
| Trace « sauvegardes : répertoire de sauvegardes introuvable » | La sonde ne voit pas le répertoire — elle ne prétend pas que tout va bien | Poser `OASIS_SAUVEGARDES_DIR` sur le répertoire réellement employé (§ 5) |
| Trace « sauvegardes : la dernière archive est trop petite » | Un `tar` interrompu, le plus souvent un disque plein | Libérer de la place, relancer `scripts/sauvegarde.sh`, **et ne pas compter sur cette archive** |
| Trace « sauvegardes : la dernière sauvegarde dépasse le seuil » | La planification s'est arrêtée | Vérifier la tâche `cron` ou l'ordonnanceur ; `age_h` dans la trace dit depuis quand |
| Première requête très lente | Mise en veille du plan free | Normal : environ 30 secondes de réveil |
| « Moteur de rendu PDF indisponible sur ce serveur » | Chromium n'a pas pu démarrer : les 512 Mo du plan free ne lui suffisent pas | Le reste de l'application n'est pas touché — le rendu PDF exige le plan Starter |
| Build long ou en échec au premier déploiement | `npm ci` télécharge Chromium (≈ 170 Mo) | Normal une seule fois : `PUPPETEER_CACHE_DIR` le conserve d'une construction à l'autre |
| Écran blanc sur un module, la page répondant 200 | Le paquet de l'écran n'a pas été construit : commande de construction sans `npm run build` | Rétablir `npm ci --include=dev && npm run build` (§ 1.1). Vérifier par `curl -I https://…/modules/droits/app/main.js` — un 404 est le symptôme |
| Build en échec : « esbuild introuvable » | `NODE_ENV=production` a fait écarter les dépendances de développement | Ajouter `--include=dev` à `npm ci` (§ 1.1) |
| Écran lent et paquet anormalement lourd | Construit sans `NODE_ENV=production` : React en régime de développement | Poser `NODE_ENV=production` avant `npm run build` |
