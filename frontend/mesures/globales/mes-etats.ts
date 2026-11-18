// OASIS — « Mesures d'Application » (CARE) : états exportables, historique
// d'une carence, mesures prises sur elle — publiés pour la page (ADR-003,
// 5.c — n° 5.f.121).
//
// ── La surface, mesurée ──
//
// `mes-etats.js` portait douze noms au premier niveau. **Onze** étaient sur
// `window`. Lus ailleurs : `MES_ICONES_ETAT` par `mes-app.js`,
// `mes-traitement.js` et le menu « États » ; `mesBoutonsExport` et
// `mesMajLiensExport` par les deux listes de `mes-app.js` ; `mesHistorique` et
// `mesMesuresDeCarence` par leurs lignes ; les deux fabriques de paramètres
// **par leur nom, sur `window`** — `mesUrlExport` les y cherche, et c'est
// pourquoi elles doivent y rester. Le douzième, `MES_HISTO_ETAPES`, un `const`
// que personne d'autre ne lisait, quitte la portée globale : c'est la
// différence déclarée.
//
// `MES_ICONES_ETAT` quitte la frontière (`restant.d.ts`) : c'est ce sas qui le
// déclare désormais.
import {
  MES_EXPORTS, MES_ICONES_ETAT, mesBoutonsExport, mesFermerHistorique, mesHistorique,
  mesHistoriqueEtapes, mesMajLiensExport, mesMesuresDeCarence, mesParametresCarences,
  mesParametresMesures, mesUrlExport,
} from '../etats';

declare global {
  interface Window {
    /** Les icônes des exports et de l'historique — lues par trois fichiers. */
    MES_ICONES_ETAT?: typeof MES_ICONES_ETAT;
    /** Les deux fabriques — cherchées par leur nom sur `window`. */
    mesParametresCarences?: typeof mesParametresCarences;
    mesParametresMesures?: typeof mesParametresMesures;
    MES_EXPORTS?: typeof MES_EXPORTS;
    mesUrlExport?: typeof mesUrlExport;
    mesBoutonsExport?: typeof mesBoutonsExport;
    mesMajLiensExport?: typeof mesMajLiensExport;
    mesHistoriqueEtapes?: typeof mesHistoriqueEtapes;
    mesHistorique?: typeof mesHistorique;
    mesFermerHistorique?: typeof mesFermerHistorique;
    mesMesuresDeCarence?: typeof mesMesuresDeCarence;
  }
}

window.MES_ICONES_ETAT = MES_ICONES_ETAT;
window.mesParametresCarences = mesParametresCarences;
window.mesParametresMesures = mesParametresMesures;
window.MES_EXPORTS = MES_EXPORTS;
window.mesUrlExport = mesUrlExport;
window.mesBoutonsExport = mesBoutonsExport;
window.mesMajLiensExport = mesMajLiensExport;
window.mesHistoriqueEtapes = mesHistoriqueEtapes;
window.mesHistorique = mesHistorique;
window.mesFermerHistorique = mesFermerHistorique;
window.mesMesuresDeCarence = mesMesuresDeCarence;
