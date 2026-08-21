# `src/modules/` — modules OASIS

Un module = un dossier contenant **deux fichiers obligatoires** :

```
src/modules/<dossier>/
  module.json   manifeste
  index.js      register(app, deps) + seed() facultatif
```

Le socle découvre les manifestes au démarrage (`src/module_loader.js`) :
déposer un dossier suffit, **aucun fichier du socle n'est à modifier**.

## Manifeste

```jsonc
{
  "code": "PR",                       // identifiant unique
  "tdr": "D.6", "priority": 1,        // feuille de route (config/modules.json)
  "icon": "📊", "theme": "surveillance",
  "name": { "fr": "…", "en": "…", "pt": "…" },
  "desc": { "fr": "…", "en": "…", "pt": "…" },
  "apiPrefixes": ["/api/m/profil-risque"],  // journalisés dans l'audit du module
  "auditModule": "PLAN",              // journal d'audit utilisé
  "rightsModule": "PLAN",             // espace de privilèges utilisé
  "front": {                          // facultatif : entrée d'interface
    "key": "risques",                 // clé de super-menu
    "url": "/modules/profil_risque/index.html",
    "superMenu": true,
    "order": 1,
    "roles": ["SUPERADMIN", "ADMIN"]  // restriction facultative
  },
  "provides": ["PR.riskProfiles"],    // services publiés
  "requires": []                      // services consommés
}
```

## `index.js`

```js
const services = require('../../services');

function register(app, deps) {
  // deps : requireAuth, requireRole, auth, loadConfig, audit, referentiels, services
  services.publish('MON.service', fn, { description: '…' });   // si producteur
  app.get('/api/m/mon-module/…', deps.requireAuth, handler);
}
function seed() { /* initialisation idempotente des collections */ }

module.exports = { register, seed };
```

## Règles

1. **Aucun `require` d'un module voisin.** Les échanges passent par
   `services.publish` / `services.callOr` : un module absent n'empêche pas
   les autres de fonctionner.
2. **Collections propres**, via `src/store.js` (`store.load('<code>', {})`).
   Les référentiels du socle (domaines, secteurs, prestataires, inspecteurs)
   se consomment en lecture.
3. **Assets front** : le module charge `/shared/css/oasis-module.css` et
   `/shared/js/oasis-utils.js`, puis les siens. Jamais ceux d'un autre module.
4. **Une suite de fumée** par module dans `tests/smoke/`, ajoutée à
   `tests/smoke/index.js`.

## Services publiés

| Service | Producteur | Contenu | Consommateurs |
|---|---|---|---|
| `PR.riskProfiles` | Profils de Risques | dernier profil validé par prestataire (niveau, matrice, intensité, CSN, CSRBO, fréquence, résultats) | Plans de Surveillance |
| `PLAN.plansValides` | Plans de Surveillance | plans **en vigueur** (validés, approuvés DG, transmis) et leurs activités | Exécution de la Surveillance (D.7.1) |

`PLAN.plansValides(filtre)` accepte `{ annee, domaine_id, secteur_id, prestataire_id }`.
Sont exclus : brouillons, plans soumis ou rejetés, et versions remplacées
(archivées lors de la validation d'un amendement). Équivalents HTTP :
`/api/shared/surveillance-plans` et `/api/m/planification/plans-valides`.
