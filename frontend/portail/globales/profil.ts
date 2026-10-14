// OASIS — L'écran du profil, posé en globales (ADR-003, 5.e.2).
//
// Cinq gestes, tous appelés par un attribut `onclick` du balisage.
//
// `renderProfile` y était — une des cinq vues, que `demarrage.ts` appelait à
// travers `window` et qu'il importe depuis le 14 octobre 2026 (5.e.9).
//
// `pfExtraSection` est déposée le 13 octobre 2026 (5.e.5) : seule `renderProfile`
// l'appelle, et elle l'importe.
//
// `ROLE_LABELS` et `saveProfile` n'étaient déjà pas publiés : le premier était un
// `const` du premier niveau, donc absent de `window` ; le second est devenu
// **privé** en 5.e.2, ses cinq appelants étant dans ce module.
import {
  removeProfilePhoto, saveProfileExtra, saveProfileInfos, submitProfilePassword,
  uploadProfilePhoto,
} from '../profil';

window.uploadProfilePhoto = uploadProfilePhoto;
window.removeProfilePhoto = removeProfilePhoto;
window.saveProfileInfos = saveProfileInfos;
window.submitProfilePassword = submitProfilePassword;
window.saveProfileExtra = saveProfileExtra;
