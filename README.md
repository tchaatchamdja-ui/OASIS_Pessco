# OASIS — Outils d'Administration et de Supervision Intégrée de la Sécurité

Outil intégré de supervision de la sécurité de l'aviation civile — **UEMOA / URSAC**.

Un portail, un socle transverse, et six modules métier montés par manifeste.
Une seule application Node, un seul port, aucun cadre côté navigateur.

## Démarrage

```bash
npm install
npm start
```

Application sur **http://localhost:4750**.

Au premier démarrage, trois comptes sont créés — `superadmin@anac.bj`,
`admin@anac.bj` et `m.ahoyo@anac.bj`. Leur mot de passe est **tiré au hasard et
affiché une seule fois sur la console du serveur** ; il doit être changé à la
première connexion. Pour le fixer — développement, démonstration :

```bash
OASIS_SEED_PASSWORD='UnMotDePasse!2026' npm start
```

## Contrôles

```bash
npm run smoke
```

Neuf suites, **624 contrôles**, exécutés contre un vrai serveur lancé sur un jeu
de données isolé (`tests/fixtures/`) : `data/` n'est jamais touché. La même
commande tourne en intégration continue à chaque poussée, avec `npm audit` au
niveau « high » et un contrôle de syntaxe sur chaque fichier
(`.github/workflows/ci.yml`).

Trois suites vérifient le code plutôt que le comportement : taille des fichiers
et des fonctions, redéfinitions de sélecteurs CSS, échappement des valeurs
rendues, et parité des trois tables de traduction.

## Les modules

Chaque module se décrit dans un manifeste (`src/modules/<nom>/module.json`) :
préfixe d'API, journal d'audit, module de droits, fichiers du front, et les
services qu'il publie ou consomme. Le socle n'en connaît aucun en particulier —
`src/module_loader.js` les découvre et les monte.

| Code | Module | TDR | Publie / consomme |
|---|---|---|---|
| **PLAN** | Plans de Surveillance | D.6 | publie `plansValides` · consomme `PR.riskProfiles`, `SURV.activitesDeclenchees` |
| **PR** | Profils de Risques | D.6 | publie `riskProfiles` |
| **SURV** | Exécution de la Surveillance | D.7.1 | publie `activitesDeclenchees`, `constatationsOuvertes`, `pacDeConstatation` · consomme `PLAN.plansValides` |
| **CARE** | Mesures d'Application | D.7.2 | publie `mesuresParConstatation`, `suitesParConstatation` · consomme les constatations de SURV et de RAMP |
| **RAMP** | Inspections d'aéronefs sur aire de trafic | D.8 | publie `constatationsCritiques`, `pacDeConstatation` |
| **DROITS** | Gestion des Droits | socle | — |

Les échanges passent par un bus de services (`src/services.js`) : un module
n'appelle jamais un autre module, il demande un service au nom déclaré.

## Le socle

- **Authentification** (§F.3) : mots de passe hachés par scrypt, politique de
  12 caractères et complexité, changement imposé à la première connexion,
  verrouillage après 5 échecs, session unique, expiration après 30 minutes
  d'inactivité, authentification multifacteur par code à usage unique
  (désactivée par défaut).
- **Utilisateurs** (§C.2) : super-administrateur régional ou national,
  administrateur et utilisateur d'AAC, administrateur et utilisateur
  prestataire ; privilèges par module attribués dans « Gestion des Droits ».
- **Instances** : chaque AAC ne voit et n'écrit que ses propres dossiers ; la
  vue régionale, réservée au super-administrateur régional, lit tout le
  dispositif (`src/instances.js`).
- **Vue Prestataire** : un compte d'organisme ne voit que ses propres données ;
  le cloisonnement est posé au serveur, jamais à l'écran.
- **Journal d'audit inaltérable** (§F.3) : ajout seul, chaque entrée portant
  l'empreinte SHA-256 de la précédente. Un journal pour le socle, un par module.
- **Multilinguisme** (§F.7) : français, anglais, portugais, par utilisateur.
- **Trois palettes** : Bleu, Corporate, Retro-Avionics Jet.

## Architecture des fichiers

```
OASIS/
├── server.js                 # Socle : authentification, comptes, référentiels, montage des modules
├── config/
│   ├── oasis.config.json     # Instance, politique de sécurité, modules actifs, messagerie
│   └── modules.json          # Registre des modules du TDR (D.1–D.10)
├── src/
│   ├── store.js              # Persistance (fichiers JSON — cible : PostgreSQL 16)
│   ├── auth.js  mfa.js       # Sessions, mots de passe, code à usage unique
│   ├── audit.js              # Journal chaîné du socle
│   ├── module_audit.js       # Journal chaîné par module
│   ├── module_loader.js      # Découverte et montage des manifestes
│   ├── services.js           # Bus de services entre modules
│   ├── instances.js          # Cloisonnement par AAC, vue régionale
│   ├── vues_prestataire.js   # Cloisonnement des comptes d'organisme
│   ├── valider.js erreurs.js # Validation des corps, erreurs normalisées
│   └── modules/<code>/       # Un dossier par module : manifeste, routes, vues, magasin
├── public/
│   ├── index.html  js/  css/ # Portail
│   ├── shared/               # Socle du front : requêtes, thème, filtres, retours d'action
│   └── modules/<nom>/        # Un dossier par module
├── tests/smoke/              # Neuf suites, exécutées par npm run smoke
├── scripts/sauvegarde.sh     # Archives horodatées de data/ et config/
└── docs/
```

## Documentation

| Document | Contenu |
|---|---|
| `DEPLOYMENT.md` | Déploiement Render et Docker, variables, ennuis courants |
| `docs/SECURITE.md` | Politique de sécurité : mesures, emplacements, points ouverts |
| `docs/architecture-uml.md` | Modèle de données et enchaînements |
| `docs/MAGASIN-POSTGRESQL.md` | Le magasin PostgreSQL : ce qui est fait, ce qui bloque la bascule |
| `docs/ADR-001-magasin-de-donnees.md` | Décision : différer la bascule, spécifier la réplication d'abord |
| `docs/CONFORMITE-FICHE-TECHNIQUE.md` | Conformité à la fiche technique URSAC/GT2 : ce qui est tenu, ce qui ne l'est pas |
| `docs/PLAN-CONFORMITE.md` | Plan de mise en conformité : ce qui peut être fait, ce qui ne le peut pas |
| `CHANGELOG.md` | Journal des versions |
| `.env.example` | Variables d'environnement, commentées |

## Déploiement

Image Docker à deux étages, compte non privilégié, sonde de santé sur
`/api/health` (`Dockerfile`). Déploiement continu sur Render depuis la branche
suivie par `render.yaml`. Le détail est dans `DEPLOYMENT.md`.

## En production

Le stockage par fichiers JSON de `src/store.js` est la couche de démonstration :
la cible est PostgreSQL 16, une base par État, avec réplication logique
asynchrone vers le serveur central UEMOA.

Le magasin PostgreSQL est écrit (`src/store_pg.js`) et la reprise des données
éprouvée sur les données réelles (`scripts/migrer-pg.js`) ; la bascule, elle,
demande de rendre asynchrones les quelque 450 accès des modules. L'état du
chantier et les chemins possibles : `docs/MAGASIN-POSTGRESQL.md`.

Les autres points ouverts sont recensés au §8 de `docs/SECURITE.md`.

© 2026 UEMOA / URSAC
