# Déploiement d'OASIS

Application **monolithique mono-port** : Express sert l'API sous `/api` et le front statique
depuis `public/`. Aucune étape de build, aucun service séparé, pas de CORS à configurer.
Un seul **Web Service** Render suffit.

---

## 1. Ce que le déploiement suppose

| Élément | Valeur |
|---|---|
| Runtime | Node ≥ 20 (`engines` dans `package.json`) |
| Commande de construction | `npm ci` |
| Commande de démarrage | `npm start` → `node server.js` |
| Port | `process.env.PORT`, écoute sur `0.0.0.0` |
| Sonde de santé | `GET /api/health` |
| Stockage | fichiers JSON dans `OASIS_DATA_DIR` (défaut `./data`) |
| Base de données | aucune — PostgreSQL est la cible prévue, non branchée |

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

Le code est sur GitHub : `tchaatchamdja-ui/OASIS`.

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
2. **New → Blueprint**, choisir le dépôt OASIS, branche `main`.
3. Render lit `render.yaml` et propose le service `oasis` (runtime Node, plan free,
   région Frankfurt).
4. Renseigner la seule variable laissée vide : **`OASIS_SEED_PASSWORD`** — le mot de passe
   des trois comptes créés à chaque démarrage à froid. Choisir un mot de passe conforme à
   la politique : 12 caractères au moins, majuscule, minuscule, chiffre et caractère spécial.
5. **Apply**. Le premier déploiement prend deux à trois minutes.

Sans Blueprint (création manuelle) : *New → Web Service*, dépôt OASIS, runtime Node,
build `npm ci`, start `npm start`, health check `/api/health`, puis les variables du § 4.

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

---

## 7. Ennuis courants

| Symptôme | Cause probable | Correction |
|---|---|---|
| Build en échec sur `npm ci` | `cdn.sheetjs.com` injoignable — la dépendance `xlsx` corrigée n'est pas sur npm | Relancer ; en cas de blocage durable, revenir à `xlsx@0.18.5` **au prix de deux vulnérabilités connues** |
| `403 origine_non_reconnue` | Écriture sans l'en-tête `X-OASIS-Request` | Appeler l'API depuis l'application, ou ajouter l'en-tête dans les appels directs |
| `429` à la connexion | Plus de 20 tentatives en 15 minutes depuis une IP | Attendre le délai indiqué par `Retry-After` |
| Impossible de se connecter | Mot de passe d'amorçage inconnu après un réveil | Définir `OASIS_SEED_PASSWORD`, ou lire les journaux du démarrage |
| Données disparues | Disque éphémère du plan free | Passer au plan Starter avec un disque (§ 2) |
| Première requête très lente | Mise en veille du plan free | Normal : environ 30 secondes de réveil |
| « Moteur de rendu PDF indisponible sur ce serveur » | Chromium n'a pas pu démarrer : les 512 Mo du plan free ne lui suffisent pas | Le reste de l'application n'est pas touché — le rendu PDF exige le plan Starter |
| Build long ou en échec au premier déploiement | `npm ci` télécharge Chromium (≈ 170 Mo) | Normal une seule fois : `PUPPETEER_CACHE_DIR` le conserve d'une construction à l'autre |
