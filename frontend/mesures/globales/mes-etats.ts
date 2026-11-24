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
// **par leur nom, sur `window`** — `mesUrlExport` les y cherchait ; il les
// tient désormais lui-même (n° 5.f.125). Le douzième, `MES_HISTO_ETAPES`, un `const`
// que personne d'autre ne lisait, quitte la portée globale : c'est la
// différence déclarée.
//
// `MES_ICONES_ETAT` quitte la frontière (`restant.d.ts`) : c'est ce sas qui le
// déclare désormais.
//
// ── La façade retirée (n° 5.f.125) ──
//
// Cinq noms ne sont plus posés : personne ne les lit sur `window` — ni un
// gestionnaire en ligne, ni un autre paquet, ni la page. Le sas ne pose plus
// que les six qu'on y lit. Les noms retirés : `mesParametresCarences`,
// `mesParametresMesures`, `MES_EXPORTS`, `mesUrlExport`, `mesHistoriqueEtapes`.
import {
  MES_ICONES_ETAT, mesBoutonsExport, mesFermerHistorique, mesHistorique, mesMajLiensExport,
  mesMesuresDeCarence,
} from '../etats';

declare global {
  interface Window {
    /** Les icônes des exports et de l'historique — lues par trois fichiers. */
    MES_ICONES_ETAT?: typeof MES_ICONES_ETAT;
    mesBoutonsExport?: typeof mesBoutonsExport;
    mesMajLiensExport?: typeof mesMajLiensExport;
    mesHistorique?: typeof mesHistorique;
    mesFermerHistorique?: typeof mesFermerHistorique;
    mesMesuresDeCarence?: typeof mesMesuresDeCarence;
  }
}

window.MES_ICONES_ETAT = MES_ICONES_ETAT;
window.mesBoutonsExport = mesBoutonsExport;
window.mesMajLiensExport = mesMajLiensExport;
window.mesHistorique = mesHistorique;
window.mesFermerHistorique = mesFermerHistorique;
window.mesMesuresDeCarence = mesMesuresDeCarence;
