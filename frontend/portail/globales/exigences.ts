// OASIS — Les exigences réglementaires, posées en globales (ADR-003, 5.d.2).
//
// Sas, construit vers `public/app/exigences.js`, et **chargé avant `app.js`**.
// `app-config.js` appelle ces sept noms en identifiants nus — dont
// `cfgSectionExigences`, que `renderConfig` branche sur la sous-vue.
//
// `app-config.js` **ne doit plus les déclarer**, ni redéclarer `EXIG_OPEN` ni
// `fmtDay` : les deux sont partis dans le module, qui est leur seul lecteur.
import {
  cfgSectionExigences, closeExigDrawer, openExigDrawer, openReglementForm,
  saveExigDrawer, saveReglement, toggleExigGroup,
} from '../exigences';

window.toggleExigGroup = toggleExigGroup;
window.cfgSectionExigences = cfgSectionExigences;
window.openExigDrawer = openExigDrawer;
window.closeExigDrawer = closeExigDrawer;
window.saveExigDrawer = saveExigDrawer;
window.openReglementForm = openReglementForm;
window.saveReglement = saveReglement;
