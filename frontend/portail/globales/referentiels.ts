// OASIS — Le CRUD générique des référentiels, posé en globales (ADR-003, 5.d.1).
//
// Cinq gestes nommés dans les attributs `onclick` que ce module et trois de ses
// voisins écrivent.
//
// `closeRefModal` **n'est plus ici** : la racine `cfgModalRoot` a son module
// depuis le 14 octobre 2026 (`../fenetres`, 5.e.10), et c'est son sas qui publie
// la fermeture — *le sas qui publie un nom est celui de son définisseur.* La
// dette que la décision de 5.e.0 avait laissée ouverte, en nommant sa vraie
// cause, est dénouée : la racine n'avait jamais appartenu au CRUD.
//
// `orgTopLevelType` y était pour la même raison apparente, mais sans ce
// couplage : `organigramme.ts` l'importe depuis le 14 octobre 2026 (5.e.9).
//
// `refTable` est déposée le 13 octobre 2026 (5.e.5) : `renderConfig` l'importe
// depuis 5.d.6, et seul le comparateur la lisait encore sur `window`.
import {
  deleteRef, openRefModal, orgTypeChanged, saveRef, toggleInspectorFields,
} from '../referentiels';

window.openRefModal = openRefModal;
window.saveRef = saveRef;
window.deleteRef = deleteRef;
window.orgTypeChanged = orgTypeChanged;
window.toggleInspectorFields = toggleInspectorFields;
