// OASIS — « Mesures d'Application » (CARE) : le menu « États », publié pour
// la page (ADR-003, 5.c — n° 5.f.119).
//
// ── La surface, mesurée ──
//
// `mes-page-etats.js` portait quinze noms au premier niveau. **Onze** étaient
// sur `window` — neuf fonctions, et deux `const` que son `Object.assign`
// reposait : `MES_ETATS`, `MES_ETATS_ETAPES`. Quatre n'y étaient pas —
// `mesEtatsCarte`, `mesEtatsActions`, `mesEtatsLigneCarence`,
// `mesEtatsReperes`, des `const` que personne d'autre ne lisait : ils quittent
// la portée globale, et c'est la différence déclarée entre les deux
// photographies de la page.
//
// Lus ailleurs : `mesRenderEtats`, par l'aiguillage de `mes-app.js` ;
// `mesEtatsVoir` par les onglets ; `MES_ETATS` par le `ontoggle` de chaque
// volet d'étape — c'est **le même objet** que le module tient, posé une fois,
// jamais remplacé. Le sas pose les onze, un à un.
import {
  MES_ETATS, MES_ETATS_ETAPES, mesEtatsDelai, mesEtatsPanATraiter, mesEtatsPanClassees,
  mesEtatsPanCloturees, mesEtatsPanEnCours, mesEtatsRepartir, mesEtatsTableau, mesEtatsVoir,
  mesRenderEtats,
} from '../page-etats';

declare global {
  interface Window {
    /** Le sous-menu ouvert et les volets dépliés — lu par les `ontoggle`. */
    MES_ETATS?: typeof MES_ETATS;
    MES_ETATS_ETAPES?: typeof MES_ETATS_ETAPES;
    mesEtatsRepartir?: typeof mesEtatsRepartir;
    mesEtatsDelai?: typeof mesEtatsDelai;
    mesEtatsTableau?: typeof mesEtatsTableau;
    mesEtatsPanATraiter?: typeof mesEtatsPanATraiter;
    mesEtatsPanEnCours?: typeof mesEtatsPanEnCours;
    mesEtatsPanCloturees?: typeof mesEtatsPanCloturees;
    mesEtatsPanClassees?: typeof mesEtatsPanClassees;
    /** Le menu « États » — lu par l'aiguillage de `mes-app.js`. */
    mesRenderEtats?: typeof mesRenderEtats;
    mesEtatsVoir?: typeof mesEtatsVoir;
  }
}

window.MES_ETATS = MES_ETATS;
window.MES_ETATS_ETAPES = MES_ETATS_ETAPES;
window.mesEtatsRepartir = mesEtatsRepartir;
window.mesEtatsDelai = mesEtatsDelai;
window.mesEtatsTableau = mesEtatsTableau;
window.mesEtatsPanATraiter = mesEtatsPanATraiter;
window.mesEtatsPanEnCours = mesEtatsPanEnCours;
window.mesEtatsPanCloturees = mesEtatsPanCloturees;
window.mesEtatsPanClassees = mesEtatsPanClassees;
window.mesRenderEtats = mesRenderEtats;
window.mesEtatsVoir = mesEtatsVoir;
