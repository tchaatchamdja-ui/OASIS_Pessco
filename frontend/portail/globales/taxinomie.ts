// OASIS — Le personnel et la taxinomie, posés en globales (ADR-003, 5.d.4).
//
// Sas, construit vers `public/app/taxinomie.js`, et **chargé avant `app.js`**.
// Quatre noms, que `renderConfig` branche sur deux de ses onze sous-vues.
//
// `app-config.js` **ne doit plus les déclarer**, ni redéclarer `CFG_OPEN` : les
// deux écrans le partagent, et une copie lexicale ferait que déplier une fiche
// n'agirait plus sur ce que l'écran rend.
import {
  cfgSectionDomaines, cfgSectionPersonnel, toggleAcc, togglePers,
} from '../taxinomie';

window.cfgSectionPersonnel = cfgSectionPersonnel;
window.cfgSectionDomaines = cfgSectionDomaines;
window.togglePers = togglePers;
window.toggleAcc = toggleAcc;
