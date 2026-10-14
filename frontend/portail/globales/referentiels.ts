// OASIS — Le CRUD générique des référentiels, posé en globales (ADR-003, 5.d.1).
//
// Six gestes nommés dans les attributs `onclick` que ce module et trois de ses
// voisins écrivent. `closeRefModal` est en outre appelée à travers `window` par
// `barre.ts` et `organigramme.ts` : **cette dette-là reste**, et la décision est
// de 5.e.0 — l'import en retour ferait un cycle qui dirait faux sur ce qui
// dépend de quoi, la vraie cause étant que la fenêtre d'import et celles des
// référentiels **partagent la racine `cfgModalRoot`**. Elle se dénouera quand
// cette racine aura son module, et la publication tombera alors d'elle-même.
//
// `orgTopLevelType` y était pour la même raison apparente, mais sans ce
// couplage : `organigramme.ts` l'importe depuis le 14 octobre 2026 (5.e.9).
//
// `refTable` est déposée le 13 octobre 2026 (5.e.5) : `renderConfig` l'importe
// depuis 5.d.6, et seul le comparateur la lisait encore sur `window`.
import {
  closeRefModal, deleteRef, openRefModal, orgTypeChanged, saveRef,
  toggleInspectorFields,
} from '../referentiels';

window.openRefModal = openRefModal;
window.closeRefModal = closeRefModal;
window.saveRef = saveRef;
window.deleteRef = deleteRef;
window.orgTypeChanged = orgTypeChanged;
window.toggleInspectorFields = toggleInspectorFields;
