// OASIS — La barre d'écran, en globales (5.e.0 ; dépose du pont 5.e.5).
//
// ── Cinq noms déposés le 13 octobre 2026 ──
//
// `tr`, `searchInputHtml`, `exportBar`, `pdfWindow` et `filterScope` ne sont plus
// publiés. Les trois premiers étaient les **prêts** que les cinq modules de 5.d
// lisaient sur `window` ; ils les importent de la source depuis 5.e.0, et seuls
// les comparateurs les lisaient encore. Les deux derniers n'ont jamais eu de
// lecteur : `pdfWindow` et `filterScope` étaient sur `window` parce qu'une
// `function` du premier niveau s'y pose, qu'on le veuille ou non.
//
// ── Les neuf qui restent, et pourquoi ──
//
// Les six gestes de la recherche et de l'import sont nommés dans des attributs
// `onclick` que ce module écrit lui-même ; `portailReinitialiserRecherche` est
// appelée par `configuration.ts` et `demarrage.ts` à travers `window`.
//
// **`exportPdf` et `exportPdfActivites` ont failli partir avec les cinq autres**,
// et c'est la leçon de cette étape. Le relevé de surface ne regardait que les
// attributs `on…=` du balisage, et `exportBar` écrit `onclick="${pdf}"` : le
// gestionnaire est **assemblé en deux temps**, son attribut ne porte qu'une
// interpolation. Les deux noms paraissaient donc morts, et les retirer aurait
// rendu inertes les boutons « Exporter PDF » de onze référentiels et de la
// taxinomie — `onclick` échouant en silence sur un nom absent, sans une ligne de
// console. Le relevé cherche désormais le nom **appelé depuis une chaîne**, quel
// que soit le chemin par lequel la chaîne atteint le balisage.
//
// `PORTAIL_RECHERCHE` et `CFG_I18N` ne sont pas publiés : c'étaient des `const`
// du premier niveau, donc absents de `window`, et personne ne les lit.
import {
  doImport, exportPdf, exportPdfActivites, openImportModal, portailChercher,
  portailFermerRechercheSiVide, portailOuvrirRecherche,
  portailReinitialiserRecherche, portailViderRecherche,
} from '../barre';

window.portailOuvrirRecherche = portailOuvrirRecherche;
window.portailChercher = portailChercher;
window.portailViderRecherche = portailViderRecherche;
window.portailFermerRechercheSiVide = portailFermerRechercheSiVide;
window.portailReinitialiserRecherche = portailReinitialiserRecherche;
window.exportPdf = exportPdf;
window.exportPdfActivites = exportPdfActivites;
window.openImportModal = openImportModal;
window.doImport = doImport;
