// OASIS — « Profils de Risque » (PR) : les évaluations — leurs deux pages,
// leur rapport, la fenêtre d'une nouvelle évaluation, et ce que la fiche et
// les profils leur empruntent —, publiées en globales (ADR-003, 5.c — n° 5.f.133).
//
// Le sixième sas de PR, un seul pour les quatre parties de `pr-evaluations.js`.
// Il se construit vers `public/modules/profil_risque/app/pr-evaluations.js`, à
// la position de l'ancien : après `pr-profils.js`, avant la fiche d'évaluation,
// qui lit ses noms au moment de l'appel.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `renderEvaluations` | **oui** — `function` | `pr-shell.js`, l'aiguillage |
// | `ICON_EXPAND`, `ICON_COLLAPSE` | **non** — `const` lexicales | les profils, la fiche, et le paquet des Paramètres |
// | `ICON_SEND`, `ICON_SUBMIT` | **non** — `const` lexicales | la fiche d'évaluation |
// | `buildSynthesisAccordion`, `exportEvalReport`, `prCanSupprimerEval` | **oui** — `function` | les profils, la fiche |
// | `evalStatutLabel`, `evalStepDate`, `renderEvalProcessSteps`, `evalNotesSource`, `prCanReevaluer`, `evalEligibleEvaluators`, `evalUserById`, `evalUserLabel` | **oui** — `function` | la fiche d'évaluation |
// | `openNewEvalModal`, `createEval` | **oui** — `function` | le balisage, en gestionnaires en ligne |
// | les vingt autres | **oui** — `function`, ou **non** — `const` : `EVAL_STEPS`, `EVAL_STEP_HINT`, `EVAL_ETAPE_KEYS`, `PR_MANAGE`, `PR_CONTRIB` | ce fichier seul |
//
// Les trente-six sont posés : retirer un nom n'est pas l'objet d'une
// conversion. Neuf étaient des `const` lexicales : posées sur `window`, elles
// restent atteignables par leur nom depuis les scripts restés en JavaScript —
// un nom qu'aucune déclaration lexicale ne porte se lit sur l'objet global.
// Aucun autre fichier de PR ne les déclare — mesuré.
import {
  buildSynthesisAccordion, EVAL_ETAPE_KEYS, EVAL_STEP_HINT, EVAL_STEPS, evalAllNotesSubmitted, evalCurrentStep, evalNotesSource, evalStatutLabel, evalStepDate, getLatestEvals, ICON_COLLAPSE, ICON_EXPAND, ICON_SEND, ICON_SUBMIT, PR_CONTRIB, PR_MANAGE, prAccess, prCanCreateEval, prCanReevaluer, prCanSeeEval, prCanSeeEvalsEnCours, prCanSupprimerEval, prManagedSecteurs, prPrivOn, prReevaluationEnCours, prSecteurOf, renderEvalProcessSteps,
} from '../evaluations-commun';
import {
  renderEvalResults, renderEvaluations,
} from '../evaluations';
import {
  buildEvalReportHtml, exportEvalReport,
} from '../rapport';
import {
  createEval, evalEligibleEvaluators, evalUserById, evalUserLabel, openNewEvalModal,
} from '../nouvelle-evaluation';

declare global {
  interface Window {
    getLatestEvals?: typeof getLatestEvals;
    buildSynthesisAccordion?: typeof buildSynthesisAccordion;
    EVAL_STEPS?: typeof EVAL_STEPS;
    evalAllNotesSubmitted?: typeof evalAllNotesSubmitted;
    evalCurrentStep?: typeof evalCurrentStep;
    EVAL_STEP_HINT?: typeof EVAL_STEP_HINT;
    EVAL_ETAPE_KEYS?: typeof EVAL_ETAPE_KEYS;
    evalStatutLabel?: typeof evalStatutLabel;
    evalStepDate?: typeof evalStepDate;
    renderEvalProcessSteps?: typeof renderEvalProcessSteps;
    ICON_EXPAND?: typeof ICON_EXPAND;
    ICON_COLLAPSE?: typeof ICON_COLLAPSE;
    ICON_SEND?: typeof ICON_SEND;
    ICON_SUBMIT?: typeof ICON_SUBMIT;
    evalNotesSource?: typeof evalNotesSource;
    PR_MANAGE?: typeof PR_MANAGE;
    PR_CONTRIB?: typeof PR_CONTRIB;
    prAccess?: typeof prAccess;
    prPrivOn?: typeof prPrivOn;
    prManagedSecteurs?: typeof prManagedSecteurs;
    prCanCreateEval?: typeof prCanCreateEval;
    prCanSeeEval?: typeof prCanSeeEval;
    prReevaluationEnCours?: typeof prReevaluationEnCours;
    prSecteurOf?: typeof prSecteurOf;
    prCanReevaluer?: typeof prCanReevaluer;
    prCanSupprimerEval?: typeof prCanSupprimerEval;
    prCanSeeEvalsEnCours?: typeof prCanSeeEvalsEnCours;
    renderEvaluations?: typeof renderEvaluations;
    renderEvalResults?: typeof renderEvalResults;
    buildEvalReportHtml?: typeof buildEvalReportHtml;
    exportEvalReport?: typeof exportEvalReport;
    openNewEvalModal?: typeof openNewEvalModal;
    createEval?: typeof createEval;
    evalEligibleEvaluators?: typeof evalEligibleEvaluators;
    evalUserById?: typeof evalUserById;
    evalUserLabel?: typeof evalUserLabel;
  }
}

window.getLatestEvals = getLatestEvals;
window.buildSynthesisAccordion = buildSynthesisAccordion;
window.EVAL_STEPS = EVAL_STEPS;
window.evalAllNotesSubmitted = evalAllNotesSubmitted;
window.evalCurrentStep = evalCurrentStep;
window.EVAL_STEP_HINT = EVAL_STEP_HINT;
window.EVAL_ETAPE_KEYS = EVAL_ETAPE_KEYS;
window.evalStatutLabel = evalStatutLabel;
window.evalStepDate = evalStepDate;
window.renderEvalProcessSteps = renderEvalProcessSteps;
window.ICON_EXPAND = ICON_EXPAND;
window.ICON_COLLAPSE = ICON_COLLAPSE;
window.ICON_SEND = ICON_SEND;
window.ICON_SUBMIT = ICON_SUBMIT;
window.evalNotesSource = evalNotesSource;
window.PR_MANAGE = PR_MANAGE;
window.PR_CONTRIB = PR_CONTRIB;
window.prAccess = prAccess;
window.prPrivOn = prPrivOn;
window.prManagedSecteurs = prManagedSecteurs;
window.prCanCreateEval = prCanCreateEval;
window.prCanSeeEval = prCanSeeEval;
window.prReevaluationEnCours = prReevaluationEnCours;
window.prSecteurOf = prSecteurOf;
window.prCanReevaluer = prCanReevaluer;
window.prCanSupprimerEval = prCanSupprimerEval;
window.prCanSeeEvalsEnCours = prCanSeeEvalsEnCours;
window.renderEvaluations = renderEvaluations;
window.renderEvalResults = renderEvalResults;
window.buildEvalReportHtml = buildEvalReportHtml;
window.exportEvalReport = exportEvalReport;
window.openNewEvalModal = openNewEvalModal;
window.createEval = createEval;
window.evalEligibleEvaluators = evalEligibleEvaluators;
window.evalUserById = evalUserById;
window.evalUserLabel = evalUserLabel;
