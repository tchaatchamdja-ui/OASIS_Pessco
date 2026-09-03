# OASIS — Outil d'Administration et de Supervision Intégrée de la Sécurité

Socle technique transverse (**Phase 1**) de l'outil intégré de supervision de la sécurité de l'aviation civile — UEMOA / URSAC.

## Démarrage

```bash
npm install
npm start
```

Application disponible sur **http://localhost:4750**.

## Comptes de démonstration

Au premier démarrage, trois comptes sont créés — `superadmin@anac.bj` (SUPERADMIN),
`admin@anac.bj` (ADMIN AAC) et `m.ahoyo@anac.bj` (AAC). Leur mot de passe est **tiré au
hasard et affiché une seule fois sur la console du serveur** ; il doit être changé à la
première connexion.

Pour fixer ce mot de passe — développement, démonstration, tests :

```bash
OASIS_SEED_PASSWORD='UnMotDePasse!2026' npm start
```

## Périmètre du socle (Phase 1 — TDR)

- **Authentification et sécurité (§F.3)** : politique de mots de passe (12+ caractères, complexité), changement obligatoire à la première connexion, blocage après 5 tentatives infructueuses (déblocage par un administrateur), session unique par utilisateur, déconnexion automatique après 30 min d'inactivité.
- **Gestion hiérarchisée des utilisateurs (§C.2)** : rôles SUPERADMIN / ADMIN / INSPECTEUR / PRESTATAIRE, création avec mot de passe temporaire, activation/désactivation, réinitialisation.
- **Journal d'audit inaltérable (§F.3)** : append-only avec chaînage cryptographique SHA-256 ; vérification d'intégrité de la chaîne intégrée à l'interface.
- **Multilinguisme (§F.7)** : interface FR / EN / PT, langue par utilisateur (localStorage).
- **Cartes des modules (D.1–D.10)** : registre des 10 modules métiers avec priorités du GT2 (§E) ; activation progressive via la configuration (SUPERADMIN).
- **Configuration** : instance État, politique de sécurité, activation des modules, cible PostgreSQL, réplication vers le serveur central UEMOA (préparée, désactivée par défaut).
- **Notifications** : cloche de notifications globales (créations de comptes, blocages, changements de configuration).
- **Design system PESSCO** : 5 thèmes, sidebar rétractable, motifs aviation, responsive.

## Architecture des fichiers

```
OASIS/
├── server.js               # API Express (auth, users, audit, config, modules)
├── config/
│   ├── oasis.config.json # Configuration de l'instance (sécurité, BDD, réplication)
│   └── modules.json        # Registre des 10 modules métiers (D.1–D.10)
├── src/
│   ├── store.js            # Persistance (JSON — production : PostgreSQL 16)
│   ├── audit.js            # Journal chaîné SHA-256
│   └── auth.js             # Sessions, politique de mots de passe, comptes
├── data/                   # Données générées (users, audit, notifications)
└── public/                 # Frontend (PESSCO design system)
```

## Production (cf. Note technique)

Le stockage JSON du socle est une couche de démonstration : en production, `src/store.js` est remplacé par PostgreSQL 16 (une base par État, réplication logique asynchrone vers le serveur central UEMOA), l'authentification par Keycloak (MFA), et le déploiement par Docker/K3s.

© 2026 UEMOA / URSAC
