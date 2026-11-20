// OASIS — « Profils de Risque » (PR) : les libellés et les indices, publiés en
// globales (ADR-003, 5.c — n° 5.f.128).
//
// Sas de cohabitation, le premier de PR. Les huit autres fichiers de l'écran
// sont encore en JavaScript et appellent `t` et les fonctions d'indices par leur
// nom ; ce sas les leur pose, depuis les sources typées voisines. Il se
// construit vers `public/modules/profil_risque/app/pr-utils.js`, sous le nom que
// la page portait déjà, le répertoire changeant seul — `js/` devient `app/`,
// comme pour PLAN et CARE.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `t` | **oui** — `function` | 8 fichiers, en identifiant nu ; le socle (`cookies.ts`) par `window.t` |
// | `calculateTaux`, `calculateTauxConfGlobal`, `calculateTauxCompGlobal`, `getIndice3Levels`, `getSecurityIndex`, `getRiskIndex`, `getIntensityLabel` | **oui** — `function` | un fichier chacun |
// | `getRiskBadgeClass` | **oui** — `function` | deux fichiers |
// | `TRANSLATIONS` | **non** — `const` lexicale | aucun autre fichier |
//
// `TRANSLATIONS`, que personne ne lit hors de ce fichier, est posé quand même :
// il était atteignable par son nom, et retirer un nom n'est pas l'objet d'une
// conversion. Aucun autre fichier de PR ne déclare l'un de ces dix noms —
// mesuré —, faute de quoi la pose sur `window` serait masquée par une globale
// lexicale.
//
// `window.t` est déjà **déclaré** par le portail (`portail/globales/i18n.ts`),
// sous la même forme : deux pages, deux définisseurs, une déclaration. La
// redéclarer ici ferait deux sources pour une seule forme.
//
// Le sas se charge **à la place** de l'ancien, à la même position : le premier
// des scripts de l'écran, avant `pr-shell.js`, qui appelle `t` dès son premier
// niveau.
import { TRANSLATIONS, t } from '../traductions';
import {
  calculateTaux, calculateTauxCompGlobal, calculateTauxConfGlobal, getIndice3Levels, getIntensityLabel,
  getRiskBadgeClass, getRiskIndex, getSecurityIndex,
} from '../indices';

declare global {
  interface Window {
    /** Les trois volets des libellés de PR. */
    TRANSLATIONS?: typeof TRANSLATIONS;
    calculateTaux?: typeof calculateTaux;
    calculateTauxConfGlobal?: typeof calculateTauxConfGlobal;
    calculateTauxCompGlobal?: typeof calculateTauxCompGlobal;
    getIndice3Levels?: typeof getIndice3Levels;
    getSecurityIndex?: typeof getSecurityIndex;
    getRiskIndex?: typeof getRiskIndex;
    getRiskBadgeClass?: typeof getRiskBadgeClass;
    getIntensityLabel?: typeof getIntensityLabel;
  }
}

window.TRANSLATIONS = TRANSLATIONS;
window.t = t;
window.calculateTaux = calculateTaux;
window.calculateTauxConfGlobal = calculateTauxConfGlobal;
window.calculateTauxCompGlobal = calculateTauxCompGlobal;
window.getIndice3Levels = getIndice3Levels;
window.getSecurityIndex = getSecurityIndex;
window.getRiskIndex = getRiskIndex;
window.getRiskBadgeClass = getRiskBadgeClass;
window.getIntensityLabel = getIntensityLabel;
