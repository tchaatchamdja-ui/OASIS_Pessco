# Journal des modifications — OASIS

Les versions suivent les phases du projet ; les entrées les plus récentes en tête.

## Non publié

### Sécurité
- Les comptes créés au premier démarrage reçoivent un mot de passe **tiré au hasard**,
  affiché une seule fois sur la console. `OASIS_SEED_PASSWORD` permet de l'imposer.
  Les mots de passe ne figurent plus ni dans le code ni dans le README. *(SEC-02)*
- **Limitation de débit** sur `/api/login` et les routes MFA : 20 tentatives par
  adresse IP et par quart d'heure, réponse 429 avec `Retry-After`. *(SEC-03)*
- **En-têtes de sécurité** sur toutes les réponses : politique de contenu,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, et HSTS en production. *(SEC-04)*
- Cookie de session marqué **`Secure`** hors développement. *(SEC-05)*
- **Protection contre les requêtes forgées** : toute écriture sur `/api` doit porter
  l'en-tête `X-OASIS-Request`, posé par les pages de l'application. *(SEC-06)*
- **Validation des corps de requête** (`src/valider.js`) appliquée à la création de
  comptes, de plans, d'activités, de notifications et de rappels. *(SEC-08)*
- **Dernier filet** : une exception non rattrapée est inscrite au journal et rendue
  sous une erreur normalisée portant une référence — la trace d'exécution ne part
  plus au navigateur. *(SEC-09)*
- **Témoins de connexion** : page publique `/cookies.html` — ce que l'application
  dépose, pourquoi, pour combien de temps, et de quoi effacer ses préférences —,
  bandeau d'information à la première visite, et mention au pied de la page de
  connexion. Trois langues. *(SEC-10)*
- **Politique de sécurité** consignée : `docs/SECURITE.md` — mesures en place,
  emplacement dans le code, et ce qui reste ouvert.
- Dépendance `nodemailer` relevée (faille de niveau « high » sur la validation du
  domaine destinataire) ; l'intégration continue échoue désormais à ce niveau,
  là où elle n'arrêtait que le niveau « critical ».

### Exploitation
- `Dockerfile` multi-étages (utilisateur non privilégié, sonde de santé),
  `docker-compose.yml` et intégration continue GitHub Actions. *(DEP-01)*
- Point de santé **`GET /api/health`** : état, version, modules montés, accès en
  écriture au stockage, temps de fonctionnement. *(DEP-02)*
- Script de sauvegarde horodatée avec rétention : `scripts/sauvegarde.sh`. *(DEP-02)*

### Performance
- **Compression gzip** des réponses et des fichiers statiques textuels :
  `exec-app.js` passe de 664 Ko à 137 Ko. *(PERF-01)*
- Cache des fichiers statiques avec revalidation par ETag. *(PERF-02)*
- Le cache mémoire du stockage se **relit quand le fichier change** sur le disque :
  deux processus servant le même répertoire ne s'ignorent plus. *(PERF-04)*

### Magasin de données
- **Le magasin PostgreSQL a tourné contre un vrai serveur** (16.15), et deux défauts
  en sont sortis que la base simulée des contrôles avait couverts.
- `jsonb` → **`json`** pour les deux colonnes. `jsonb` réordonne les clés ; le sceau
  d'une entrée d'audit couvrant `JSON.stringify(details)`, les six chaînes des données
  réelles — 1 667 entrées du socle, 1 582 des modules — étaient **rompues** après un
  aller-retour. La chaîne du socle ne cédait qu'à la 29ᵉ entrée : un petit échantillon
  serait passé. Après correction, 15 collections et 3 249 entrées reprises, six chaînes
  intactes.
- **`modifier(nom, defaut, transformer)`** : lire-modifier-réécrire atomique par `rev`.
  La base rend l'écriture atomique, pas le geste complet — deux agents qui lisent une
  collection, y ajoutent chacun une ligne et la réécrivent en perdaient une, *en base
  comme sur fichier*. Cinquante écritures concurrentes, aucune perdue ; un conflit sans
  issue est refusé plutôt qu'écrasé.
- Consigné : si ce geste est sûr aujourd'hui sur fichiers, c'est parce que `load` et
  `save` sont **synchrones**. La conversion en asynchrone détruit cette garantie avant
  même qu'un second processus existe.
- **`src/magasin.js`** — la façade qui permet de basculer une collection à la fois.
  Asynchrone des deux côtés : un appel converti fonctionne sur fichiers comme en base.
  Liste d'autorisation : ce qui n'y est pas nommé reste sur fichiers. Sur fichiers,
  `modifier` est rendu atomique par une file d'attente par collection.
- **Première collection passée en base** : `ramp_aeronefs`, la nomenclature des aéronefs.
  8 fonctions de magasin, 7 routes, 9 fichiers touchés ; **299 contrôles RAMP verts dans
  les deux régimes**, et la base porte bien la nomenclature seule — 9 550 appareils.
- Trois routes qui *vérifiaient puis écrivaient* — doublon, bascule d'activité, refus de
  suppression — passent leur vérification **dans** la transformation : une autre requête
  s'intercale désormais entre les deux gestes.
- **`src/route.js`** — `asynchrone(fn)`. Express 4 ne regarde pas la promesse d'un
  gestionnaire `async` : un rejet laissait la requête **ouverte jusqu'à expiration**, sans
  erreur 500 ni trace. Six gestionnaires étaient dans ce cas ; ils sont enveloppés.
- Le serveur **attend l'amorçage avant d'écouter** : une collection en base s'amorce par
  le réseau, et servir une route avant qu'elle soit posée rendrait une liste vide.
- **Le bus de services est asynchrone par contrat.** `services.call` et `callOr` rendent
  une promesse quoi que fasse le producteur. Fait pendant que tous les producteurs sont
  encore synchrones : le jour où l'un passera en base, ses consommateurs n'auront rien à
  reprendre. Sept consommations converties, **57 gestionnaires de route enveloppés**.
- `OASIS_BUS_DIFFERE=1` rend tout producteur asynchrone — mise en situation de la bascule,
  et recette de chacune des suivantes. La campagne complète y reste verte.
- **`emails` passée en base**, deuxième collection. `queue()` rendant déjà une promesse,
  la propagation s'arrête à ses cinq appelants. Son écriture dérive l'identifiant de la
  longueur du registre : trois envois simultanés donnent trois entrées avec `modifier`,
  **une seule** avec `load` puis `save`.
- Le garde-fou « plus rien par `store` » a trouvé un appel que rien d'autre n'aurait
  signalé : la reprise SAFA → RAMP lisait le registre des envois sur fichier au démarrage.
  Elle passe par la façade, et le serveur l'attend avant d'écouter.
- Le contrôle des trois envois concurrents **passait pour la mauvaise raison** — un Mailpit
  sur le port 1025 espaçait les envois sur le réseau. L'épreuve force désormais une
  configuration sans hôte SMTP ; la contre-épreuve mord.
- **Une fenêtre ouverte et consignée** : les cinq suppressions gardées par
  `src/suites_care.js` vérifient auprès de « Mesures d'Application » puis effacent. Le bus
  n'étant plus synchrone, une mesure peut désormais être prononcée entre les deux gestes.
  La vérification lit un module et l'effacement en écrit un autre : il y faudra une
  transaction entre modules. Porté aux points ouverts d'ADR-002.

### Tests
- Jeu de données de référence versionné dans `tests/fixtures` : `npm run smoke`
  ne dépend plus de l'état de `data/`. *(TEST-01)*
- Suite **« magasin-pg »**, 12 contrôles contre un vrai PostgreSQL, dont deux
  contre-épreuves qui les empêchent d'être vides. Sans `OASIS_PG_ESSAI`, trois
  contrôles lisent le schéma et huit se déclarent hors de portée.
- Deux contrôles de forme ferment les portes de la bascule : **aucune collection migrée
  n'est plus lue par `store`** — un appel oublié lirait le fichier figé au dernier jour
  des fichiers, sans erreur —, et **tout gestionnaire de route asynchrone passe par
  `asynchrone`**. Les deux contre-éprouvés.

### Accessibilité
- Contour de focus visible au clavier sur l'ensemble des écrans. *(A11Y-02)*

### Documentation
- `.env.example`, ce journal, et les diagrammes d'architecture
  (`docs/architecture-uml.md`). *(ARCH-02, DOC-02)*
- Spécification du module Planification : `docs/PLAN-specification.docx`.

## Phase 1 — Socle technique transverse

- Authentification (scrypt, sessions, MFA facultative, verrouillage),
  gestion hiérarchisée des utilisateurs, journal d'audit chaîné en SHA-256,
  multilinguisme FR/EN/PT, registre des dix modules du TDR.
- Modules montés : DROITS (privilèges et portées), PLAN (plans de surveillance),
  PR (profils de risque), SURV (exécution de la surveillance).
