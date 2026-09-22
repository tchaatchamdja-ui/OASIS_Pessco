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

### Tests
- Jeu de données de référence versionné dans `tests/fixtures` : `npm run smoke`
  ne dépend plus de l'état de `data/`. *(TEST-01)*

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
