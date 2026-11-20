// OASIS — « Profils de Risque » (PR) : les Paramètres et la cloche des
// notifications, publiés en globales (ADR-003, 5.c — n° 5.f.132).
//
// Le cinquième sas de PR, un seul pour les trois parties de `pr-parametres.js`
// — les pages, la saisie, la cloche —, qui forment un seul paquet. Il se
// construit vers `public/modules/profil_risque/app/pr-parametres.js`, à la
// position de l'ancien : après `pr-bibliotheque` et `pr-evaluations.js`, dont il
// lit `ICON_EXPAND` et `ICON_COLLAPSE` au moment du rendu, avant
// `pr-instances`.
//
// Les trois filtres — domaines, indicateurs, organismes — sont posés au
// chargement, dans l'ordre de l'ancien, par `parametres.ts`.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `renderParametres` | **oui** — `function` | `pr-shell.js`, l'aiguillage |
// | `prUpdateNotifBadge` | **oui** — `function` | `pr-shell.js`, au chargement des données |
// | `prToggleNotifPanel` | **oui** — `function` | la cloche que `pr-shell.js` rend, en gestionnaire en ligne |
// | `fileToBase64` | **oui** — `function` | la bibliothèque, la fiche d'évaluation |
// | `basculerBarreParam`, `exportIndicateursExcel`, `importIndicateursExcel`, `openEntityModal`, `saveEntity`, `deleteEntity`, `saveIndices` | **oui** — `function` | le balisage, en gestionnaires en ligne |
// | `renderParamCapacite`, `renderParamArchives`, `renderParamIndicateurs`, `renderParamIndices`, `_prIndFiltresHtml`, `_prIndConformiteHtml`, `_prIndPerformanceHtml`, `_prIndComplexiteHtml`, `showImportBanner`, `_getPRNotifAlerts` | **oui** — `function` | ce fichier seul |
//
// Les vingt et un sont posés : retirer un nom n'est pas l'objet d'une
// conversion. Aucun autre fichier de PR ne les déclare — mesuré.
import {
  _prIndComplexiteHtml, _prIndConformiteHtml, _prIndFiltresHtml, _prIndPerformanceHtml, basculerBarreParam,
  renderParamArchives, renderParamCapacite, renderParamIndicateurs, renderParametres,
} from '../parametres';
import {
  deleteEntity, exportIndicateursExcel, fileToBase64, importIndicateursExcel, openEntityModal, renderParamIndices,
  saveEntity, saveIndices, showImportBanner,
} from '../parametres-saisie';
import { _getPRNotifAlerts, prToggleNotifPanel, prUpdateNotifBadge } from '../notifications';

declare global {
  interface Window {
    renderParametres?: typeof renderParametres;
    basculerBarreParam?: typeof basculerBarreParam;
    renderParamCapacite?: typeof renderParamCapacite;
    renderParamArchives?: typeof renderParamArchives;
    renderParamIndicateurs?: typeof renderParamIndicateurs;
    _prIndFiltresHtml?: typeof _prIndFiltresHtml;
    _prIndConformiteHtml?: typeof _prIndConformiteHtml;
    _prIndPerformanceHtml?: typeof _prIndPerformanceHtml;
    _prIndComplexiteHtml?: typeof _prIndComplexiteHtml;
    exportIndicateursExcel?: typeof exportIndicateursExcel;
    fileToBase64?: typeof fileToBase64;
    importIndicateursExcel?: typeof importIndicateursExcel;
    showImportBanner?: typeof showImportBanner;
    openEntityModal?: typeof openEntityModal;
    saveEntity?: typeof saveEntity;
    deleteEntity?: typeof deleteEntity;
    renderParamIndices?: typeof renderParamIndices;
    saveIndices?: typeof saveIndices;
    _getPRNotifAlerts?: typeof _getPRNotifAlerts;
    prUpdateNotifBadge?: typeof prUpdateNotifBadge;
    prToggleNotifPanel?: typeof prToggleNotifPanel;
  }
}

window.renderParametres = renderParametres;
window.basculerBarreParam = basculerBarreParam;
window.renderParamCapacite = renderParamCapacite;
window.renderParamArchives = renderParamArchives;
window.renderParamIndicateurs = renderParamIndicateurs;
window._prIndFiltresHtml = _prIndFiltresHtml;
window._prIndConformiteHtml = _prIndConformiteHtml;
window._prIndPerformanceHtml = _prIndPerformanceHtml;
window._prIndComplexiteHtml = _prIndComplexiteHtml;
window.exportIndicateursExcel = exportIndicateursExcel;
window.fileToBase64 = fileToBase64;
window.importIndicateursExcel = importIndicateursExcel;
window.showImportBanner = showImportBanner;
window.openEntityModal = openEntityModal;
window.saveEntity = saveEntity;
window.deleteEntity = deleteEntity;
window.renderParamIndices = renderParamIndices;
window.saveIndices = saveIndices;
window._getPRNotifAlerts = _getPRNotifAlerts;
window.prUpdateNotifBadge = prUpdateNotifBadge;
window.prToggleNotifPanel = prToggleNotifPanel;
