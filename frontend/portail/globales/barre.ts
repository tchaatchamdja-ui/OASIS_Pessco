// OASIS — Les libellés littéraux et la barre d'écran, en globales (5.e.0).
//
// Sas, construit vers `public/app/barre.js`, et chargé dans le paquet du portail
// **avant** le sas des référentiels — qui lit `tr`, `searchInputHtml` et
// `exportBar`. L'ordre n'a plus d'importance depuis 5.d.7 (un seul paquet, des
// liaisons résolues à la construction), mais il reste celui de la lecture.
//
// ── Les trois prêts rendus, et ce que cela change ──
//
// `tr`, `searchInputHtml` et `exportBar` sont les trois noms que les cinq modules
// de 5.d lisaient sur `window`, faute de pouvoir les atteindre : leurs tables et
// leur état étaient des globales **lexicales** d'`app.js`. Ils sont désormais
// importés de leur source par `referentiels.ts` et ses voisins.
//
// Ils restent publiés ici parce que les attributs `onclick` du balisage les
// appellent — `portailOuvrirRecherche()`, `openImportModal(...)`,
// `exportPdfActivites()` — et parce que les comparateurs des blocs convertis font
// tourner les versions d'origine, qui les cherchent dans la portée globale.
//
// `PORTAIL_RECHERCHE` et `CFG_I18N` ne sont **pas** publiés : c'étaient des
// `const` du premier niveau, donc absents de `window`, et personne ne les lit.
// Les publier serait *ajouter* à la surface, ce qu'un sas n'a pas à faire.
import { tr } from '../libelles';
import {
  doImport, exportBar, exportPdf, exportPdfActivites, filterScope,
  openImportModal, pdfWindow, portailChercher, portailFermerRechercheSiVide,
  portailOuvrirRecherche, portailReinitialiserRecherche, portailViderRecherche,
  searchInputHtml,
} from '../barre';

window.tr = tr;
window.searchInputHtml = searchInputHtml;
window.portailOuvrirRecherche = portailOuvrirRecherche;
window.portailChercher = portailChercher;
window.portailViderRecherche = portailViderRecherche;
window.portailFermerRechercheSiVide = portailFermerRechercheSiVide;
window.portailReinitialiserRecherche = portailReinitialiserRecherche;
window.exportBar = exportBar;
// `pdfWindow` était sur `window` — une `function` du premier niveau s'y pose,
// qu'on le veuille ou non — et personne ne la lit. Publiée parce qu'elle l'était :
// retirer un nom de la surface est un changement qui se décide, non qui se glisse
// dans une conversion (la règle que `_icon` tient depuis 5.c).
window.pdfWindow = pdfWindow;
window.exportPdf = exportPdf;
window.exportPdfActivites = exportPdfActivites;
window.openImportModal = openImportModal;
window.doImport = doImport;
window.filterScope = filterScope;
