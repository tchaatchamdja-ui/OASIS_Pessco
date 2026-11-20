// OASIS — « Profils de Risque » (PR) : la barre supérieure — l'instance
// regardée —, publiée en globales (ADR-003, 5.c — n° 5.f.129).
//
// Le second sas de PR. Il se construit vers
// `public/modules/profil_risque/app/pr-instances.js`, sous le nom que la page
// portait déjà, à la même position : après `pr-shell.js`, dont il lit
// `MODULE_API` au moment de l'appel, et avant le script en ligne qui appelle
// `prDessinerActions` au démarrage.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `prDessinerActions` | **oui** — posé à la main, et `function` | la page, au démarrage |
// | `prAppliquerInstance` | **oui** — `function` | sa propre action de barre, par fermeture |
// | `PR_VUE_REGIONALE` | **non** — `const` lexicale | aucun autre fichier |
//
// Les trois sont posés : ils étaient atteignables par leur nom, et retirer un
// nom n'est pas l'objet d'une conversion. Aucun autre fichier de PR ne les
// déclare — mesuré.
import { PR_VUE_REGIONALE, prAppliquerInstance, prDessinerActions } from '../instances';

declare global {
  interface Window {
    PR_VUE_REGIONALE?: typeof PR_VUE_REGIONALE;
    prAppliquerInstance?: typeof prAppliquerInstance;
    prDessinerActions?: typeof prDessinerActions;
  }
}

window.PR_VUE_REGIONALE = PR_VUE_REGIONALE;
window.prAppliquerInstance = prAppliquerInstance;
window.prDessinerActions = prDessinerActions;
