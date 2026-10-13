// OASIS — L'écran des comptes, posé en globales (ADR-003, 5.e.1).
//
// Sas, construit vers `public/app/utilisateurs.js`. Cinq noms : les deux gestes
// de la barre latérale, les deux enregistrements que les `onclick` du balisage
// appellent, et la fermeture des fenêtres.
//
// `renderUsers` n'y est **pas** : c'est une des cinq vues du portail, et
// `app-demarrage` les enregistre déjà toutes depuis `window`. Elle y est posée
// par `app.js` tant qu'il existe ; quand il partira, elle rejoindra cette liste
// avec les quatre autres vues.
//
// `USER_TAB`, `USER_COLLAPSED` et `ALL_MODULES` ne sont pas publiés : c'étaient
// des `let` du premier niveau, donc absents de `window`, et personne ne les lit.
// Les publier serait *ajouter* à la surface.
//
// `showModulesModal`, `showEditUserModal`, `showEffacerUserModal` et
// `showNewUserModal` ne le sont pas non plus : elles étaient des `function` du
// premier niveau — donc sur `window` —, mais seul `renderUsers` les appelle, et
// il les importe. Elles restent publiées **le temps que les comparateurs les
// lisent** : voir la décision inscrite à l'ADR.
import { splitName, userRole } from '../comptes';
import {
  closeUserModal, effacerUtilisateur, renderUsers, saveUserModules, setUserTab,
  showEditUserModal, showEffacerUserModal, showModulesModal, showNewUserModal,
  submitEditUser, toggleUserSidebar,
} from '../utilisateurs';

window.setUserTab = setUserTab;
window.toggleUserSidebar = toggleUserSidebar;
window.saveUserModules = saveUserModules;
window.submitEditUser = submitEditUser;
window.closeUserModal = closeUserModal;

// ── Les cinq noms publiés « parce qu'ils l'étaient » ──
//
// Une `function` au premier niveau d'un script classique se pose sur `window`,
// qu'on le veuille ou non. `renderUsers` est lue par `app-demarrage` (une des
// cinq vues) ; les quatre fenêtres ne sont lues que par `renderUsers`, qui les
// importe. Retirer un nom de la surface est un changement qui se décide, non qui
// se glisse dans une conversion — la règle que `_icon` tient depuis 5.c.
window.renderUsers = renderUsers;
window.userRole = userRole;
window.splitName = splitName;
window.effacerUtilisateur = effacerUtilisateur;
window.showModulesModal = showModulesModal;
window.showEditUserModal = showEditUserModal;
window.showEffacerUserModal = showEffacerUserModal;
window.showNewUserModal = showNewUserModal;
