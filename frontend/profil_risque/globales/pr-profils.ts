// OASIS — « Profils de Risque » (PR) : les profils de risque — courants,
// archivés, détaillés et individuels — et l'écran des statistiques, publiés en
// globales (ADR-003, 5.c — n° 5.f.134).
//
// Le septième sas de PR, un seul pour les six parties de `pr-profils.js`. Il se
// construit vers `public/modules/profil_risque/app/pr-profils.js`, à la
// position de l'ancien : après le tableau de bord, qui lit
// `renderStatistiques` au moment du rendu, et avant les évaluations.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `renderProfils` | **oui** — `function` | `pr-shell.js`, l'aiguillage |
// | `renderStatistiques` | **oui** — `function` | le paquet du tableau de bord |
// | `printPage` | **oui** — `function` | le balisage de quatre paquets, en gestionnaires en ligne |
// | `setTauxBarSelection`, `setSABarSelection`, `openIndividualIndicator`, `openIndividualGroup`, `setVueApercu`, `ouvrirProfilPrestataire`, `retourVuePrestataires` | **oui** — `function` | le balisage de ce fichier, en gestionnaires en ligne |
// | `APERCU_VUES`, `APERCU_AXES` | **non** — `const` lexicales | ce fichier seul |
// | les douze autres | **oui** — `function` | ce fichier seul |
//
// Les vingt-quatre sont posés : retirer un nom n'est pas l'objet d'une
// conversion. Aucun autre fichier de PR ne les déclare — mesuré.
import {
  renderProfils, setSABarSelection, setTauxBarSelection,
} from '../profils';
import {
  openIndividualGroup, openIndividualIndicator,
} from '../profils-indicateur';
import {
  APERCU_AXES, APERCU_VUES, ouvrirProfilPrestataire, prVueApercu, renderApercuProfils, renderProfilIndividuel, retourVuePrestataires, setVueApercu,
} from '../profils-apercu';
import {
  prMakeGauge, prSeuils, prTauxColor,
} from '../profils-jauges';
import {
  _prStatsPortee, _prStatsRisquesHtml, _prStatsSousActivites, _prStatsTendancesHtml,
} from '../statistiques';
import {
  _prStatsIndicateursHtml, _prStatsTauxHtml, printPage, renderStatistiques,
} from '../statistiques-indicateurs';

declare global {
  interface Window {
    renderProfils?: typeof renderProfils;
    setTauxBarSelection?: typeof setTauxBarSelection;
    setSABarSelection?: typeof setSABarSelection;
    openIndividualIndicator?: typeof openIndividualIndicator;
    openIndividualGroup?: typeof openIndividualGroup;
    APERCU_VUES?: typeof APERCU_VUES;
    APERCU_AXES?: typeof APERCU_AXES;
    prVueApercu?: typeof prVueApercu;
    setVueApercu?: typeof setVueApercu;
    ouvrirProfilPrestataire?: typeof ouvrirProfilPrestataire;
    retourVuePrestataires?: typeof retourVuePrestataires;
    renderApercuProfils?: typeof renderApercuProfils;
    renderProfilIndividuel?: typeof renderProfilIndividuel;
    prSeuils?: typeof prSeuils;
    prTauxColor?: typeof prTauxColor;
    prMakeGauge?: typeof prMakeGauge;
    _prStatsPortee?: typeof _prStatsPortee;
    _prStatsTendancesHtml?: typeof _prStatsTendancesHtml;
    _prStatsRisquesHtml?: typeof _prStatsRisquesHtml;
    _prStatsSousActivites?: typeof _prStatsSousActivites;
    _prStatsIndicateursHtml?: typeof _prStatsIndicateursHtml;
    _prStatsTauxHtml?: typeof _prStatsTauxHtml;
    renderStatistiques?: typeof renderStatistiques;
    printPage?: typeof printPage;
  }
}

window.renderProfils = renderProfils;
window.setTauxBarSelection = setTauxBarSelection;
window.setSABarSelection = setSABarSelection;
window.openIndividualIndicator = openIndividualIndicator;
window.openIndividualGroup = openIndividualGroup;
window.APERCU_VUES = APERCU_VUES;
window.APERCU_AXES = APERCU_AXES;
window.prVueApercu = prVueApercu;
window.setVueApercu = setVueApercu;
window.ouvrirProfilPrestataire = ouvrirProfilPrestataire;
window.retourVuePrestataires = retourVuePrestataires;
window.renderApercuProfils = renderApercuProfils;
window.renderProfilIndividuel = renderProfilIndividuel;
window.prSeuils = prSeuils;
window.prTauxColor = prTauxColor;
window.prMakeGauge = prMakeGauge;
window._prStatsPortee = _prStatsPortee;
window._prStatsTendancesHtml = _prStatsTendancesHtml;
window._prStatsRisquesHtml = _prStatsRisquesHtml;
window._prStatsSousActivites = _prStatsSousActivites;
window._prStatsIndicateursHtml = _prStatsIndicateursHtml;
window._prStatsTauxHtml = _prStatsTauxHtml;
window.renderStatistiques = renderStatistiques;
window.printPage = printPage;
