// OASIS — Les paramètres de l'instance, posés en globales (ADR-003, 5.d.5).
//
// Sas, construit vers `public/app/parametres.js`, et **chargé avant `app.js`**.
// Dix noms, que `renderConfig` branche sur quatre de ses onze sous-vues, et que
// les `onclick` du balisage appellent.
//
// Onze avec `cameraIcon`, que **personne ne lit hors du module** : il est publié
// parce qu'il l'était — une `function` au premier niveau d'un script classique se
// pose sur `window`, qu'on le veuille ou non. C'est la règle que `_icon` tient
// depuis 5.c : retirer un nom de la surface est un changement qui se décide, et
// une conversion n'est pas le moment de le décider.
//
// `saveAacLogo` n'y est pas, et la cause est autre : elle est devenue **privée**.
// Elle s'y posait aussi, et ses deux seuls appelants — les deux gestes du logo —
// sont dans ce module. La retirer est donc le seul changement de surface de ce
// sas, et il est écrit ici.
//
// `app-config.js` **ne doit plus les déclarer**, ni redéclarer `AAC_CFG` : la
// fenêtre d'édition lit ce que le rendu de l'écran y a posé, et une copie
// lexicale la ferait ouvrir vide.
import {
  cameraIcon, cfgSectionAAC, cfgSectionModules, cfgSectionSecurite,
  cfgSectionSysteme, openAacEdit, removeAacLogo, saveAAC, saveSecurite,
  saveSysteme, uploadAacLogo,
} from '../parametres';

window.cfgSectionAAC = cfgSectionAAC;
window.cameraIcon = cameraIcon;
window.openAacEdit = openAacEdit;
window.uploadAacLogo = uploadAacLogo;
window.removeAacLogo = removeAacLogo;
window.saveAAC = saveAAC;
window.cfgSectionSecurite = cfgSectionSecurite;
window.saveSecurite = saveSecurite;
window.cfgSectionModules = cfgSectionModules;
window.cfgSectionSysteme = cfgSectionSysteme;
window.saveSysteme = saveSysteme;
