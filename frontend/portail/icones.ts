// OASIS — Les icônes du portail. Le portail, en TypeScript (ADR-003, 5.c).
//
// Quarante-six dessins au trait, du style Feather : trait de 2 pixels,
// `currentColor`, et la taille en argument. Onze de plus associent un code de
// module à son icône.
//
// ── Un nom de plus, et c'en est un de trop ──
//
// `frontend/socle/utils.ts` porte **aussi** un `ICONS`, et ce n'est pas le même :
// le sien est un répertoire de chaînes, celui-ci de fonctions prenant une taille.
// Les deux ne se croisent pas aujourd'hui — aucune page ne charge les deux sas —
// mais c'est une collision qui attend, et elle est écrite ici pour qu'on ne la
// découvre pas en la provoquant.
//
// Ce fichier ne touche pas à `window` : c'est `globales/icons.ts` qui publie.
//
// Les deux tables sont reprises **verbatim**, indentation comprise.

type Dessin = (taille?: number) => string;

const _icon = (chemins: string, taille?: number): string =>
  `<svg width="${taille || 18}" height="${taille || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chemins}</svg>`;

export const ICONS: Readonly<Record<string, Dessin>> = {
  // ── Navigation & UI ──
  home: (s) => _icon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', s),
  users: (s) => _icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', s),
  list: (s) => _icon('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', s),
  settings: (s) => _icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', s),
  bell: (s) => _icon('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', s),
  logout: (s) => _icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', s),
  chevronLeft: (s) => _icon('<polyline points="15 18 9 12 15 6"/>', s),
  chevronRight: (s) => _icon('<polyline points="9 18 15 12 9 6"/>', s),
  plus: (s) => _icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', s),
  edit: (s) => _icon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', s),
  trash: (s) => _icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', s),
  x: (s) => _icon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', s),
  check: (s) => _icon('<polyline points="20 6 9 17 4 12"/>', s),
  checklist: (s) => _icon('<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/><line x1="9" y1="17.5" x2="15" y2="17.5"/>', s),
  save: (s) => _icon('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', s),
  link: (s) => _icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', s),
  lock: (s) => _icon('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', s),
  unlock: (s) => _icon('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>', s),
  key: (s) => _icon('<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>', s),
  userPlus: (s) => _icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>', s),
  userCheck: (s) => _icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 23 8"/>', s),
  power: (s) => _icon('<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>', s),

  // ── Statistiques / entités ──
  landmark: (s) => _icon('<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7 12 2"/>', s),
  layers: (s) => _icon('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', s),
  grid: (s) => _icon('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>', s),
  monitor: (s) => _icon('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>', s),
  sitemap: (s) => _icon('<rect x="9" y="2" width="6" height="4" rx="1"/><rect x="2" y="14" width="6" height="4" rx="1"/><rect x="9" y="14" width="6" height="4" rx="1"/><rect x="16" y="14" width="6" height="4" rx="1"/><path d="M12 6v4M5 14v-2h14v2M12 10v4M19 14v-2"/>', s),
  globe: (s) => _icon('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', s),
  flag: (s) => _icon('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>', s),
  fileText: (s) => _icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', s),
  briefcase: (s) => _icon('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', s),
  database: (s) => _icon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', s),
  refresh: (s) => _icon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', s),
  shield: (s) => _icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', s),
  sliders: (s) => _icon('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>', s),
  download: (s) => _icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', s),

  // ── Modules métiers ──
  calendar: (s) => _icon('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', s),
  search: (s) => _icon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', s),
  plane: (s) => _icon('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>', s),
  bookOpen: (s) => _icon('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>', s),
  award: (s) => _icon('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>', s),
  alertTriangle: (s) => _icon('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', s),
  graduation: (s) => _icon('<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.66 2.69 3 6 3s6-1.34 6-3v-4.5"/><line x1="22" y1="10" x2="22" y2="15"/>', s),
  creditCard: (s) => _icon('<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>', s),
  // Tracé de contrôle : la carence relevée, puis le retour à la ligne — c'est
  // ce que suivent les mesures d'application.
  // Aéronef en vol, vu de dessus, sa traînée derrière lui : l'inspection se
  // fait sur l'appareil qui vient de se poser.
  // Décollage : l'aéronef quitte la piste — silhouette du jeu Material Symbols
  // (Apache 2.0), reprise telle quelle, piste comprise.
  planeTrail: (s) => _icon('<path fill="currentColor" stroke="none" d="M22.07 9.64c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49s7.12-1.9 16.57-4.43c.81-.23 1.28-1.05 1.07-1.85z"/><path fill="currentColor" stroke="none" d="M2.5 18.6h19v1.9h-19z"/>', s),
  pulse: (s) => _icon('<path d="M2 10.5h4.8L10.4 2.5l4.2 16 2.6-8h4.8"/>', s),
};

// Icône par code module
export const MODULE_ICONS: Readonly<Record<string, string>> = {
  PLAN: 'calendar',
  SURV: 'search',
  CARE: 'pulse',
  RAMP: 'planeTrail',
  REG: 'fileText',
  DOC: 'bookOpen',
  CERT: 'award',
  RISK: 'alertTriangle',
  FORM: 'graduation',
  COM: 'globe',
  PAY: 'creditCard',
};

// Le dessin de secours, nommé. Il était écrit `ICONS.grid` à deux endroits ; un
// nom le dit une fois, et un contrôle de type s'assure qu'il existe.
const SECOURS = 'grid';

/**
 * Le dessin d'une icône, à la taille demandée. Une icône inconnue rend la
 * grille — un écran sans icône se lit, un écran qui lève ne se lit pas.
 */
export function icon(nom: string, taille?: number): string {
  const dessin = ICONS[nom] ?? ICONS[SECOURS];
  // `SECOURS` est une clé de la table, mais le type ne le sait pas : avec
  // `noUncheckedIndexedAccess`, l'index rend `Dessin | undefined`. On rend la
  // chaîne vide plutôt que d'affirmer, et un contrôle vérifie que la grille
  // existe — affirmer ce qu'on peut simplement vérifier est ce qui a fait
  // mentir deux déclarations du socle.
  return dessin ? dessin(taille) : '';
}

/** L'icône d'un module, par son code. À défaut, la grille. */
export const moduleIcon = (code: string, taille?: number): string =>
  icon(MODULE_ICONS[code] ?? SECOURS, taille);

// ── La palette des priorités (ADR-003, 5.d.5) ──
//
// Cinq teintes, une par niveau de priorité de la feuille de route. Elle était
// `const PRIO_COLORS` au premier niveau d'`app.js` — donc une globale
// **lexicale**, qu'aucun module ne peut atteindre. C'est le même obstacle que
// `LEVEL_COLORS` en 5.d.3 et `CURRENT_CFG` en 5.d.1, et la cinquième fois qu'il
// décide d'un déplacement.
//
// Elle n'est pas dans l'un des deux écrans qui la lisent — la liste des modules
// du portail (`app.js`) et l'écran « Modules » de la configuration
// (`parametres.ts`) —, et c'est **parce qu'ils sont deux** : une palette rangée
// dans l'un des deux serait lue par l'autre à travers `window`, ce qui est
// précisément la dépendance qu'on retire. Elle rejoint donc les icônes, dont
// elle partage la nature : de la présentation, sans état.
export const PRIO_COLORS: Readonly<Record<number, string>> = {
  1: '#2563eb', 2: '#0891b2', 3: '#f59e0b', 4: '#10b981', 5: '#8b5cf6',
};
