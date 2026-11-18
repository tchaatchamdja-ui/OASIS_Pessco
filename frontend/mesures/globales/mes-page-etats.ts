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
// jamais remplacé. Le sas posait les onze, un à un.
//
// ── La façade retirée (n° 5.f.125) ──
//
// Huit noms ne sont plus posés : personne ne les lit sur `window` — ni un
// gestionnaire en ligne, ni un autre paquet, ni la page. Le sas ne pose plus
// que les trois qu'on y lit. Les noms retirés : `MES_ETATS_ETAPES`,
// `mesEtatsRepartir`, `mesEtatsDelai`, `mesEtatsTableau`,
// `mesEtatsPanATraiter`, `mesEtatsPanEnCours`, `mesEtatsPanCloturees`,
// `mesEtatsPanClassees`.
import {
  MES_ETATS, mesEtatsVoir, mesRenderEtats,
} from '../page-etats';

declare global {
  interface Window {
    /** Le sous-menu ouvert et les volets dépliés — lu par les `ontoggle`. */
    MES_ETATS?: typeof MES_ETATS;
    /** Le menu « États » — lu par l'aiguillage de `mes-app.js`. */
    mesRenderEtats?: typeof mesRenderEtats;
    mesEtatsVoir?: typeof mesEtatsVoir;
  }
}

window.MES_ETATS = MES_ETATS;
window.mesRenderEtats = mesRenderEtats;
window.mesEtatsVoir = mesEtatsVoir;
