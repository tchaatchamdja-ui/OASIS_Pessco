// OASIS — L'organigramme, posé en globales (ADR-003, 5.d.3 ; dépose du pont
// 5.e.5).
//
// Dix gestes, tous nommés dans des attributs `onclick`, `ondragstart`,
// `ondragover`, `ondragleave` ou `ondrop` que ce module écrit lui-même. Ils sont
// la famille dont la nécessité ne se voit pas en cherchant des lecteurs : aucun
// fichier ne les appelle, et les retirer casserait l'écran.
//
// ── Les cinq prêts, rendus le 13 octobre 2026 ──
//
// `LEVEL_COLORS`, `orgChainFor` et `circuitHtml` étaient lus par l'accordéon des
// domaines et la fiche d'une personne ; `taxinomie.ts` les importe depuis 5.d.4.
// `cfgSectionOrganigramme` est importée par `renderConfig` depuis 5.d.6, et
// `normalizeOrgTopLevel` par `parametres.ts`.
//
// En 5.d.4, j'avais voulu retirer les trois premiers et **les comparateurs se
// sont cassés** : leur version d'origine les cherche dans la portée globale. Ils
// avaient raison, et ma formule — « un sas qui publie un nom que personne ne lit
// mentirait » — était inexacte : *le comparateur les lisait*. C'est le dernier
// lecteur qui s'éteint ici, la maîtrise d'ouvrage ayant fait des comparateurs des
// pièces d'archive.
//
// `ORG_VIEW` n'est pas publiée : elle est privée au module, et une copie lexicale
// ferait que la bascule des deux présentations n'agirait plus sur ce que l'écran
// rend.
import {
  openPosteRegistre, orgAllowDrop, orgConfirmInterim, orgDragLeave, orgDragStart,
  orgDrop, orgEndInterim, orgStartInterim, orgUnassign, setOrgView,
} from '../organigramme';

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
