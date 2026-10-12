// OASIS — L'organigramme, posé en globales (ADR-003, 5.d.3).
//
// Sas, construit vers `public/app/organigramme.js`, et **chargé avant
// `app.js`**. Quinze noms, dont trois que ce module ne fait que **prêter** au
// reste d'`app-config.js` en attendant sa conversion : `LEVEL_COLORS`,
// `orgChainFor` et `circuitHtml`, que l'accordéon des domaines et la fiche d'une
// personne lisent encore.
//
// `app-config.js` **ne doit plus les déclarer**, ni redéclarer `ORG_VIEW` — qui
// est désormais privée au module, et dont une copie lexicale ferait que la
// bascule des deux présentations n'agirait plus sur ce que l'écran rend.
import {
  LEVEL_COLORS, cfgSectionOrganigramme, circuitHtml, normalizeOrgTopLevel,
  openPosteRegistre, orgAllowDrop, orgChainFor, orgConfirmInterim, orgDragLeave,
  orgDragStart, orgDrop, orgEndInterim, orgStartInterim, orgUnassign, setOrgView,
} from '../organigramme';

window.LEVEL_COLORS = LEVEL_COLORS;
window.orgChainFor = orgChainFor;
window.circuitHtml = circuitHtml;
window.cfgSectionOrganigramme = cfgSectionOrganigramme;
window.setOrgView = setOrgView;
window.orgDragStart = orgDragStart;
window.orgAllowDrop = orgAllowDrop;
window.orgDragLeave = orgDragLeave;
window.orgDrop = orgDrop;
window.openPosteRegistre = openPosteRegistre;
window.orgStartInterim = orgStartInterim;
window.orgConfirmInterim = orgConfirmInterim;
window.orgEndInterim = orgEndInterim;
window.orgUnassign = orgUnassign;
window.normalizeOrgTopLevel = normalizeOrgTopLevel;
