// OASIS — « Mesures d'Application » (CARE) : l'étape « Suivi des Mesures »,
// publiée pour la page (ADR-003, 5.c — n° 5.f.120).
//
// ── La surface, mesurée ──
//
// `mes-suivi.js` portait vingt noms au premier niveau. **Dix-neuf** étaient sur
// `window` — neuf fonctions, et dix `const` que son `Object.assign` reposait.
// Lus ailleurs : `mesSectionSuiviMesures` et `mesSectionPlanAction` par
// le volet de `mes-app.js` ; `mesActionsSuivi`, `mesSuiviClos` et
// `mesEnregistrerSuivi` par le fil de `mes-traitement.js` ; les gestes de
// saisie par les `onclick` et `onchange` du balisage. Le vingtième,
// `mesSuiviRedessiner`, un `const` que personne d'autre ne lisait, quitte la
// portée globale : c'est la différence déclarée.
//
// Le sas posait les dix-neuf, un à un.
//
// ── La façade retirée (n° 5.f.125) ──
//
// Sept noms ne sont plus posés : personne ne les lit sur `window` — ni un
// gestionnaire en ligne, ni un autre paquet, ni la page. Le sas ne pose plus
// que les douze qu'on y lit. Les noms retirés : `mesSuivi`,
// `mesSuiviModifiable`, `mesBlocSuiviMesure`, `mesCollecterSuivi`,
// `mesMajSuivi`, `mesSuiviModifier`, `mesSuiviIssue`.
import {
  mesActionsSuivi, mesEnregistrerSuivi, mesSectionPlanAction, mesSectionSuiviMesures,
  mesSuiviActionRecours, mesSuiviClos, mesSuiviCloturer, mesSuiviMesures, mesSuiviRecours,
  mesSuiviRetirerPiece, mesSuiviStatut, mesSuiviTeleverser,
} from '../suivi';

declare global {
  interface Window {
    mesSuiviMesures?: typeof mesSuiviMesures;
    /** Lu par le fil de `mes-traitement.js`. */
    mesSuiviClos?: typeof mesSuiviClos;
    /** Les deux sections de l'étape — lues par le volet de `mes-app.js`. */
    mesSectionSuiviMesures?: typeof mesSectionSuiviMesures;
    mesSectionPlanAction?: typeof mesSectionPlanAction;
    mesSuiviStatut?: typeof mesSuiviStatut;
    mesSuiviRecours?: typeof mesSuiviRecours;
    mesSuiviRetirerPiece?: typeof mesSuiviRetirerPiece;
    mesSuiviTeleverser?: typeof mesSuiviTeleverser;
    /** Lu par la barre du fil de `mes-traitement.js`. */
    mesEnregistrerSuivi?: typeof mesEnregistrerSuivi;
    mesActionsSuivi?: typeof mesActionsSuivi;
    mesSuiviCloturer?: typeof mesSuiviCloturer;
    mesSuiviActionRecours?: typeof mesSuiviActionRecours;
  }
}

window.mesSuiviMesures = mesSuiviMesures;
window.mesSuiviClos = mesSuiviClos;
window.mesSectionSuiviMesures = mesSectionSuiviMesures;
window.mesSectionPlanAction = mesSectionPlanAction;
window.mesSuiviStatut = mesSuiviStatut;
window.mesSuiviRecours = mesSuiviRecours;
window.mesSuiviRetirerPiece = mesSuiviRetirerPiece;
window.mesSuiviTeleverser = mesSuiviTeleverser;
window.mesEnregistrerSuivi = mesEnregistrerSuivi;
window.mesActionsSuivi = mesActionsSuivi;
window.mesSuiviCloturer = mesSuiviCloturer;
window.mesSuiviActionRecours = mesSuiviActionRecours;
