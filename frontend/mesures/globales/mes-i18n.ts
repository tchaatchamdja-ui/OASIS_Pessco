// OASIS — « Mesures d'Application » (CARE) : les libellés, publiés en globales
// (ADR-003, 5.c — n° 5.f.116).
//
// Sas de cohabitation, le premier de CARE. Huit fichiers de l'écran sont encore
// en JavaScript et appellent `mt` ; ce sas la leur pose, depuis la source typée
// voisine. Il se construit vers `public/modules/mesures/app/mes-i18n.js`, sous le
// nom que la page portait déjà, le répertoire changeant seul — `js/` devient
// `app/`, comme pour PLAN.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `mt` | **oui** — `function` ; `mes-app.js` l'y repose | 8 fichiers, en identifiant nu |
// | `MES_TR` | **non** — `const` | aucun autre fichier |
//
// `MES_TR`, que personne ne lit hors de ce fichier, est posé quand même : il
// était atteignable par son nom, et retirer un nom n'est pas l'objet d'une
// conversion. Aucun autre fichier ne déclare l'un de ces deux noms — mesuré —,
// faute de quoi la pose sur `window` serait masquée par une globale lexicale.
//
// Le sas se charge **à la place** de l'ancien, à la même position : avant
// `mes-app.js`, dont l'`Object.assign(window, { …, mt, … })` relit `mt` en
// identifiant nu dès son premier niveau.
import { MES_TR, mt } from '../traductions';

declare global {
  interface Window {
    /** Les trois volets des libellés de CARE. */
    MES_TR: typeof MES_TR;
    /** Un libellé de CARE, avec textes à trou. */
    mt: typeof mt;
  }
}

window.MES_TR = MES_TR;
window.mt = mt;
