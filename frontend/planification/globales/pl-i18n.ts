// OASIS — « Planification de la Surveillance » : les libellés et l'état,
// publiés en globales (ADR-003, 5.c — n° 5.f.101).
//
// Sas de cohabitation, le premier d'un écran de module. Douze fichiers de PLAN
// sont encore en JavaScript et lisent ces noms ; ce sas les leur pose, depuis la
// source typée voisine. Il se construit vers
// `public/modules/planification/app/pl-i18n.js`, sous le nom que la page portait
// déjà, le répertoire changeant seul — `js/` devient `app/`, comme pour le socle.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `PLAN_MODULE_API` | **non** — `const` | 6 fichiers, en identifiant nu |
// | `PLAN_STATE` | **oui** — posé à la main, *et* `const` | 11 fichiers, en identifiant nu |
// | `PLAN_TR` | **non** — `const` | aucun autre fichier |
// | `tp` | **oui** — `function` | 10 fichiers |
// | `pt` | **oui** — `function` | 1 fichier |
//
// Un module ne crée pas de globale lexicale. `PLAN_MODULE_API` et `PLAN_STATE`
// sont donc posés sur `window`, où une lecture nue les retrouve — c'est la leçon
// de `CURRENT_LANG` (5.c.1). `PLAN_TR`, que plus personne ne lit hors de ce
// fichier, est posé quand même : il était atteignable par son nom, et retirer un
// nom n'est pas l'objet d'une conversion. Aucun autre fichier ne redéclare l'un
// de ces cinq noms — mesuré —, faute de quoi la pose sur `window` serait masquée.
//
// Le sas se charge **à la place** de l'ancien, à la même position : avant
// `pl-shell.js`, qui lit `PLAN_STATE` dès son premier niveau.
import { PLAN_MODULE_API, PLAN_STATE, type EtatPlan } from '../etat';
import { PLAN_TR, tp, pt } from '../traductions';

declare global {
  interface Window {
    /** La racine des routes de PLAN — lue nue par six fichiers. */
    PLAN_MODULE_API: string;
    /**
     * L'état de l'écran — lu nu par onze fichiers.
     *
     * **Optionnel, et déclaré ici seulement.** Le socle le lit sur toutes les
     * pages de module (`chrome.ts` en déplie le volet latéral) et le déclarait
     * pour son compte, faute de définisseur ; ce sas en est un. Il reste
     * optionnel parce que c'est la vérité : seule la page de PLAN le pose.
     */
    PLAN_STATE?: EtatPlan;
    /** Les trois volets des libellés de PLAN. */
    PLAN_TR: typeof PLAN_TR;
    /** Un libellé de PLAN. */
    tp: typeof tp;
    /** Un libellé du portail. */
    pt: typeof pt;
  }
}

window.PLAN_MODULE_API = PLAN_MODULE_API;
window.PLAN_STATE = PLAN_STATE;
window.PLAN_TR = PLAN_TR;
window.tp = tp;
window.pt = pt;
