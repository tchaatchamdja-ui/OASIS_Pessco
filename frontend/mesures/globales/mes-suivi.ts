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
// Le sas pose les dix-neuf, un à un.
import {
  mesActionsSuivi, mesBlocSuiviMesure, mesCollecterSuivi, mesEnregistrerSuivi, mesMajSuivi,
  mesSectionPlanAction, mesSectionSuiviMesures, mesSuivi, mesSuiviActionRecours, mesSuiviClos,
  mesSuiviCloturer, mesSuiviIssue, mesSuiviMesures, mesSuiviModifiable, mesSuiviModifier,
  mesSuiviRecours, mesSuiviRetirerPiece, mesSuiviStatut, mesSuiviTeleverser,
} from '../suivi';

declare global {
  interface Window {
    mesSuivi?: typeof mesSuivi;
    mesSuiviMesures?: typeof mesSuiviMesures;
    /** Lu par le fil de `mes-traitement.js`. */
    mesSuiviClos?: typeof mesSuiviClos;
    mesSuiviModifiable?: typeof mesSuiviModifiable;
    /** Les deux sections de l'étape — lues par le volet de `mes-app.js`. */
    mesSectionSuiviMesures?: typeof mesSectionSuiviMesures;
    mesSectionPlanAction?: typeof mesSectionPlanAction;
    mesBlocSuiviMesure?: typeof mesBlocSuiviMesure;
    mesCollecterSuivi?: typeof mesCollecterSuivi;
    mesMajSuivi?: typeof mesMajSuivi;
    mesSuiviModifier?: typeof mesSuiviModifier;
    mesSuiviStatut?: typeof mesSuiviStatut;
    mesSuiviRecours?: typeof mesSuiviRecours;
    mesSuiviRetirerPiece?: typeof mesSuiviRetirerPiece;
    mesSuiviTeleverser?: typeof mesSuiviTeleverser;
    /** Lu par la barre du fil de `mes-traitement.js`. */
    mesEnregistrerSuivi?: typeof mesEnregistrerSuivi;
    mesActionsSuivi?: typeof mesActionsSuivi;
    mesSuiviIssue?: typeof mesSuiviIssue;
    mesSuiviCloturer?: typeof mesSuiviCloturer;
    mesSuiviActionRecours?: typeof mesSuiviActionRecours;
  }
}

window.mesSuivi = mesSuivi;
window.mesSuiviMesures = mesSuiviMesures;
window.mesSuiviClos = mesSuiviClos;
window.mesSuiviModifiable = mesSuiviModifiable;
window.mesSectionSuiviMesures = mesSectionSuiviMesures;
window.mesSectionPlanAction = mesSectionPlanAction;
window.mesBlocSuiviMesure = mesBlocSuiviMesure;
window.mesCollecterSuivi = mesCollecterSuivi;
window.mesMajSuivi = mesMajSuivi;
window.mesSuiviModifier = mesSuiviModifier;
window.mesSuiviStatut = mesSuiviStatut;
window.mesSuiviRecours = mesSuiviRecours;
window.mesSuiviRetirerPiece = mesSuiviRetirerPiece;
window.mesSuiviTeleverser = mesSuiviTeleverser;
window.mesEnregistrerSuivi = mesEnregistrerSuivi;
window.mesActionsSuivi = mesActionsSuivi;
window.mesSuiviIssue = mesSuiviIssue;
window.mesSuiviCloturer = mesSuiviCloturer;
window.mesSuiviActionRecours = mesSuiviActionRecours;
