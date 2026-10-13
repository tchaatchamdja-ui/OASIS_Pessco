// OASIS — L'écran du profil, posé en globales (ADR-003, 5.e.2).
//
// Sas, construit vers `public/app/profil.js`. Six noms, tous appelés par un
// attribut `onclick` du balisage, plus `renderProfile` — une des cinq vues du
// portail, qu'`app-demarrage` lit sur `window`.
//
// `ROLE_LABELS` et `saveProfile` ne sont **pas** publiés :
//
//   · `ROLE_LABELS` était un `const` du premier niveau, donc absent de `window`,
//     et personne ne le lit. Le publier serait *ajouter* à la surface.
//   · `saveProfile` était une `async function` du premier niveau — donc sur
//     `window` — et devient **privée** : ses cinq appelants sont dans ce module.
//     C'est le seul nom que ce bloc retire de la surface, et c'est écrit ici.
//
// `pfExtraSection` reste publiée bien que seule `renderProfile` l'appelle : elle
// y était, et retirer un nom de la surface est un changement qui se décide.
import {
  pfExtraSection, removeProfilePhoto, renderProfile, saveProfileExtra,
  saveProfileInfos, submitProfilePassword, uploadProfilePhoto,
} from '../profil';

window.uploadProfilePhoto = uploadProfilePhoto;
window.removeProfilePhoto = removeProfilePhoto;
window.saveProfileInfos = saveProfileInfos;
window.submitProfilePassword = submitProfilePassword;
window.saveProfileExtra = saveProfileExtra;
window.pfExtraSection = pfExtraSection;
window.renderProfile = renderProfile;
