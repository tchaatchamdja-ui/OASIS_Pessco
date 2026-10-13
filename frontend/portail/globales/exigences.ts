// OASIS — Les exigences réglementaires, posées en globales (ADR-003, 5.d.2).
//
// Six gestes, tous nommés dans des attributs `onclick` que ce module écrit.
//
// `cfgSectionExigences` est déposée le 13 octobre 2026 (5.e.5) : `renderConfig`
// l'**importe** depuis 5.d.6, et seul le comparateur la lisait encore sur
// `window`.
import {
  closeExigDrawer, openExigDrawer, openReglementForm, saveExigDrawer,
  saveReglement, toggleExigGroup,
} from '../exigences';

window.toggleExigGroup = toggleExigGroup;
window.openExigDrawer = openExigDrawer;
window.closeExigDrawer = closeExigDrawer;
window.saveExigDrawer = saveExigDrawer;
window.openReglementForm = openReglementForm;
window.saveReglement = saveReglement;
