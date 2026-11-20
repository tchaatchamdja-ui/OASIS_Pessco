// OASIS — « Profils de Risque » (PR) : le tableau de bord, publié en globales
// (ADR-003, 5.c — n° 5.f.131).
//
// Le quatrième sas de PR. Il se construit vers
// `public/modules/profil_risque/app/pr-dashboard.js`, à la position de
// l'ancien : après `pr-shell.js`, qui appelle `renderDashboard` à chaque rendu,
// et avant `pr-profils.js`, dont il lit `renderStatistiques` au moment du rendu
// seulement.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `renderDashboard` | **oui** — `function` | `pr-shell.js`, l'aiguillage |
// | `prNiveauRisque`, `prCompterRisques`, `prFinDeCycle`, `prEcheancesProches`, `_prCartesIndicateurs` | **oui** — `function` | aucun autre fichier |
// | `PR_NIVEAU_DE_CASE` | **non** — `const` lexicale | aucun autre fichier |
//
// Les sept sont posés : retirer un nom n'est pas l'objet d'une conversion.
// Aucun autre fichier de PR ne les déclare — mesuré.
import {
  PR_NIVEAU_DE_CASE, _prCartesIndicateurs, prCompterRisques, prEcheancesProches, prFinDeCycle, prNiveauRisque,
  renderDashboard,
} from '../tableau-de-bord';

declare global {
  interface Window {
    PR_NIVEAU_DE_CASE?: typeof PR_NIVEAU_DE_CASE;
    prNiveauRisque?: typeof prNiveauRisque;
    prCompterRisques?: typeof prCompterRisques;
    prFinDeCycle?: typeof prFinDeCycle;
    prEcheancesProches?: typeof prEcheancesProches;
    _prCartesIndicateurs?: typeof _prCartesIndicateurs;
    renderDashboard?: typeof renderDashboard;
  }
}

window.PR_NIVEAU_DE_CASE = PR_NIVEAU_DE_CASE;
window.prNiveauRisque = prNiveauRisque;
window.prCompterRisques = prCompterRisques;
window.prFinDeCycle = prFinDeCycle;
window.prEcheancesProches = prEcheancesProches;
window._prCartesIndicateurs = _prCartesIndicateurs;
window.renderDashboard = renderDashboard;
