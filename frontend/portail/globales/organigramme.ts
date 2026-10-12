// OASIS — L'organigramme, posé en globales (ADR-003, 5.d.3).
//
// Sas, construit vers `public/app/organigramme.js`, et **chargé avant
// `app.js`**. Quinze noms, dont trois que ce module ne fait que **prêter** :
// `LEVEL_COLORS`, `orgChainFor` et `circuitHtml`.
//
// ── Le prêt, et pourquoi il ne se rend pas encore ──
//
// L'accordéon des domaines et la fiche d'une personne les lisaient ; ils sont
// convertis depuis 5.d.4 et `taxinomie.ts` les importe de la source. J'ai donc
// voulu retirer les trois publications — et les deux comparateurs se sont
// cassés.
//
// Ils avaient raison : `scripts/comparer-taxinomie.js` doit faire tourner
// `cfgSectionPersonnel` **tel qu'il était**, et sa version d'origine lit ces
// noms dans la portée globale. Reproduire l'environnement d'avant exige donc que
// le sas les y pose. Ma première formule — « un sas qui publie un nom que
// personne ne lit mentirait » — était inexacte : **le comparateur les lit**.
//
// Le prêt se rendra avec `app-config.js` lui-même (5.d.6), quand les
// comparateurs des blocs convertis deviendront des pièces d'archive.
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
