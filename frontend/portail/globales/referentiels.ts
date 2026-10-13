// OASIS — Le CRUD générique des référentiels, posé en globales (ADR-003, 5.d.1).
//
// Six gestes nommés dans les attributs `onclick` que ce module et trois de ses
// voisins écrivent — `closeRefModal` est en outre appelée à travers `window` par
// `barre.ts` et `organigramme.ts`, qui partagent sa racine `cfgModalRoot` —, plus
// `orgTopLevelType`, que `organigramme.ts` lit de la même façon.
//
// `refTable` est déposée le 13 octobre 2026 (5.e.5) : `renderConfig` l'importe
// depuis 5.d.6, et seul le comparateur la lisait encore sur `window`.
import {
  closeRefModal, deleteRef, openRefModal, orgTopLevelType, orgTypeChanged,
  saveRef, toggleInspectorFields,
} from '../referentiels';

window.openRefModal = openRefModal;
window.closeRefModal = closeRefModal;
window.saveRef = saveRef;
window.deleteRef = deleteRef;
window.orgTopLevelType = orgTopLevelType;
window.orgTypeChanged = orgTypeChanged;
window.toggleInspectorFields = toggleInspectorFields;
