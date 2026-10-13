// OASIS — Les paramètres de l'instance, posés en globales (ADR-003, 5.d.5 ;
// dépose du pont 5.e.5).
//
// Six gestes, tous nommés dans des attributs `onclick` que ce module écrit.
//
// ── Cinq noms déposés le 13 octobre 2026 ──
//
// Les quatre sous-vues — `cfgSectionAAC`, `cfgSectionSecurite`,
// `cfgSectionModules`, `cfgSectionSysteme` — sont **importées** par `renderConfig`
// depuis 5.d.6 ; seul le comparateur les lisait encore sur `window`.
// `cameraIcon` n'a jamais eu de lecteur hors de ce module : elle était sur
// `window` parce qu'une `function` du premier niveau s'y pose.
//
// `saveAacLogo` n'y était déjà plus, et pour une autre cause : elle est devenue
// **privée** en 5.d.5, ses deux appelants étant les deux gestes du logo.
//
// `AAC_CFG` n'est pas publiée : la fenêtre d'édition lit ce que le rendu de
// l'écran y a posé, et une copie lexicale la ferait ouvrir vide.
import {
  openAacEdit, removeAacLogo, saveAAC, saveSecurite, saveSysteme, uploadAacLogo,
} from '../parametres';

window.openAacEdit = openAacEdit;
window.uploadAacLogo = uploadAacLogo;
window.removeAacLogo = removeAacLogo;
window.saveAAC = saveAAC;
window.saveSecurite = saveSecurite;
window.saveSysteme = saveSysteme;
