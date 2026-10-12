// OASIS — Le CRUD générique des référentiels, posé en globales (ADR-003, 5.d.1).
//
// Sas, construit vers `public/app/referentiels.js`, et **chargé après
// `schemas.js` et avant `app.js`** : `app-config.js` appelle ces huit noms en
// identifiants nus, et les trouve posés.
//
// `app-config.js` **ne doit plus les déclarer**, ni redéclarer `CURRENT_CFG` —
// un `let` du premier niveau masquerait la propriété de `window` pour tout ce
// fichier, et les deux versions coexisteraient sans une erreur. Le garde-fou de
// la suite « taille » le refuse.
import {
  closeRefModal, deleteRef, openRefModal, orgTopLevelType, orgTypeChanged,
  refTable, saveRef, toggleInspectorFields,
} from '../referentiels';

window.refTable = refTable;
window.openRefModal = openRefModal;
window.closeRefModal = closeRefModal;
window.saveRef = saveRef;
window.deleteRef = deleteRef;
window.orgTopLevelType = orgTopLevelType;
window.orgTypeChanged = orgTypeChanged;
window.toggleInspectorFields = toggleInspectorFields;
