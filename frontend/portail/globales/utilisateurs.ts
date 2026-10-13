// OASIS — L'écran des comptes, posé en globales (ADR-003, 5.e.1 ; dépose du pont
// 5.e.5).
//
// Cinq gestes — les deux de la barre latérale, les deux enregistrements et la
// fermeture des fenêtres —, tous nommés dans des attributs `onclick` que ce
// module écrit ; plus `renderUsers`, une des cinq vues que `demarrage.ts` appelle
// à travers `window`.
//
// ── Sept noms déposés le 13 octobre 2026 ──
//
// `userRole` et `splitName` venaient de `comptes.ts` ; `effacerUtilisateur` et
// les quatre fenêtres (`showModulesModal`, `showEditUserModal`,
// `showEffacerUserModal`, `showNewUserModal`) n'étaient appelées que par
// `renderUsers`, qui les importe, ou branchées par un écouteur — c'est tout
// l'objet de 5.e.1 : *le balisage ne dit pas tous les gestes*.
//
// `userRole` partait en outre avec un défaut de voisinage : la page porte un
// `<div id="userRole">`, et un élément nommé se pose lui aussi sur `window`. Le
// sas écrasait cette référence par la fonction. Rien n'en dépendait, mais deux
// noms pour deux choses au même endroit est exactement ce qu'on ne garde pas.
//
// `USER_TAB`, `USER_COLLAPSED` et `ALL_MODULES` ne sont pas publiés : c'étaient
// des `let` du premier niveau, donc absents de `window`.
import {
  closeUserModal, renderUsers, saveUserModules, setUserTab, submitEditUser,
  toggleUserSidebar,
} from '../utilisateurs';

window.setUserTab = setUserTab;
window.toggleUserSidebar = toggleUserSidebar;
window.saveUserModules = saveUserModules;
window.submitEditUser = submitEditUser;
window.closeUserModal = closeUserModal;
window.renderUsers = renderUsers;
