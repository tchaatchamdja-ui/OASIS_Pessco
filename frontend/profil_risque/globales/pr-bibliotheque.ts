// OASIS — « Profils de Risque » (PR) : la bibliothèque documentaire, publiée
// en globales (ADR-003, 5.c — n° 5.f.130).
//
// Le troisième sas de PR. Il se construit vers
// `public/modules/profil_risque/app/pr-bibliotheque.js`, à la position de
// l'ancien : après `pr-shell.js`, qui appelle `renderBibliotheque` à chaque
// rendu de la page, et avant `pr-parametres.js`, dont il lit `fileToBase64`
// au moment de l'envoi seulement.
//
// ── La surface, mesurée et non supposée ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `renderBibliotheque` | **oui** — `function` | `pr-shell.js`, l'aiguillage |
// | `triggerFileUpload`, `handleDocFileSelected`, `uploadDocWithFile`, `deleteDoc`, `downloadDoc` | **oui** — `function` | le balisage de la page, en gestionnaires en ligne |
// | `DOC_MAX_BYTES` | **non** — `const` lexicale | aucun autre fichier |
//
// Les sept sont posés : retirer un nom n'est pas l'objet d'une conversion.
// Aucun autre fichier de PR ne les déclare — mesuré.
import {
  DOC_MAX_BYTES, deleteDoc, downloadDoc, handleDocFileSelected, renderBibliotheque, triggerFileUpload,
  uploadDocWithFile,
} from '../bibliotheque';

declare global {
  interface Window {
    renderBibliotheque?: typeof renderBibliotheque;
    triggerFileUpload?: typeof triggerFileUpload;
    DOC_MAX_BYTES?: typeof DOC_MAX_BYTES;
    handleDocFileSelected?: typeof handleDocFileSelected;
    uploadDocWithFile?: typeof uploadDocWithFile;
    deleteDoc?: typeof deleteDoc;
    downloadDoc?: typeof downloadDoc;
  }
}

window.renderBibliotheque = renderBibliotheque;
window.triggerFileUpload = triggerFileUpload;
window.DOC_MAX_BYTES = DOC_MAX_BYTES;
window.handleDocFileSelected = handleDocFileSelected;
window.uploadDocWithFile = uploadDocWithFile;
window.deleteDoc = deleteDoc;
window.downloadDoc = downloadDoc;
