// OASIS — « Planification » : la page « Mes Activités », publiée pour les
// fichiers restés en JavaScript (ADR-003, 5.c — n° 5.f.104).
//
// ── La surface, mesurée ──
//
// `pl-mes-activites.js` posait dix noms au premier niveau. Quatre sont lus hors
// du module — par l'aiguillage de `pl-shell.js`, ou par les `onclick` de son
// propre balisage, qui s'évaluent dans la portée de la page :
//
// | Nom | Lu par |
// |---|---|
// | `planRenderMesActivites` | `pl-shell.js`, l'aiguillage des pages |
// | `planMaSetFiltre` | six `onchange` de la barre de filtres |
// | `planMaReinit` | le `onclick` du bouton de réinitialisation |
// | `planMaOuvrir` | le `onclick` de chaque ligne |
//
// Ce sas pose ces quatre-là. Les six autres — les deux constantes, les quatre
// aides — ne sont lus par personne d'autre, et quittent la portée globale :
// c'est la différence déclarée, que la photographie de la page vérifie.
import {
  planMaOuvrir, planMaReinit, planMaSetFiltre, planRenderMesActivites,
} from '../mes-activites';

declare global {
  interface Window {
    /** La page « Mes Activités » — posée sur la seule page de PLAN. */
    planRenderMesActivites?: typeof planRenderMesActivites;
    /** Un filtre de la page. */
    planMaSetFiltre?: typeof planMaSetFiltre;
    /** Les filtres rendus vides. */
    planMaReinit?: typeof planMaReinit;
    /** Une activité ouverte en lecture. */
    planMaOuvrir?: typeof planMaOuvrir;
  }
}

window.planRenderMesActivites = planRenderMesActivites;
window.planMaSetFiltre = planMaSetFiltre;
window.planMaReinit = planMaReinit;
window.planMaOuvrir = planMaOuvrir;
