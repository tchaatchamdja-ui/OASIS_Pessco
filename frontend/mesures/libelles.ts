// OASIS — « Mesures d'Application » (CARE) : les icônes, les entrées du menu,
// et les libellés des statuts — de la carence, de la mesure, de son suivi
// (ADR-003, 5.c — n° 5.f.124).
//
// Des tables et leurs lectures, sans état propre : la feuille du paquet de la
// coquille, avec `etat.ts`. Converti à la lettre depuis `mes-app.js`.
import { _mesAttr, _mesEsc, mesDate, mesJour } from './etat';
import { mt } from './partage';

export const MES_ICONS: Record<string, string> = {
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
  menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  reset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  // Sous-menus des Paramètres : les quatre listes du module. Les deux autres
  // entrées reprennent une icône déjà servie ailleurs.
  couches: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  loupe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></svg>',
  groupe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
};

// ── Navigation ──
// Les indicateurs par prestataire n'ont plus d'entrée de menu : ils se lisent
// au tableau de bord, dans le bandeau qui s'ouvre dès qu'un prestataire est
// retenu au filtre. Un écran de moins, et la mesure au même endroit que le
// reste du pilotage.
export const MES_NAV: Record<string, { cle: string; icon: string }> = {
  dashboard: { cle: 'nav_dashboard', icon: 'dashboard' },
  // La carence précède la mesure : on la constate, puis on la sanctionne.
  critiques: { cle: 'nav_carences', icon: 'warning' },
  mesures: { cle: 'nav_mesures', icon: 'shield' },
  // Les états ferment la marche : on y va pour savoir quoi faire ensuite,
  // non pour saisir — c'est la lecture d'ensemble des deux listes qui précèdent.
  etats: { cle: 'nav_etats', icon: 'chart' },
  parametres: { cle: 'nav_parametres', icon: 'settings' },
};
// Le libellé d'une page se lit dans la langue retenue, au moment de l'afficher.
export const mesNavLabel = (page: string): string => mt((MES_NAV[page] || { cle: '' }).cle || page);

// Les trois provenances d'une carence, et les cinq statuts du circuit d'une
// mesure : la clé demeure, le libellé se lit dans la langue retenue.
export const MES_CLES_ORIGINE = ['SURV', 'RAMP', 'CARE'];
export const mesOrigine = (code: string): string => mt(`origine_${code}`);

// Teintes des catégories de mesure : la gravité se lit à la couleur — l'orange
// clair de la mesure administrative, l'orange franc de la sanction, le rouge du
// pénal. Une catégorie ajoutée au paramétrage prend la teinte suivante de la
// palette.
export const MES_COULEURS_CATEGORIE = ['#1d4ed8', '#ea580c', '#7c3aed', '#059669', '#0891b2', '#b45309'];
// Provenance d'une carence : chaque module a sa teinte.
export const MES_COULEUR_PAR_SOURCE: Record<string, string> = {
  SURV: '#1d4ed8',
  RAMP: '#0891b2',
  CARE: '#7c3aed',
};

export const MES_COULEUR_PAR_CODE: Record<string, string> = {
  administrative: '#fb923c',
  sanction: '#ea580c',
  penale: '#dc2626',
};

// Statut d'une carence au sens des mesures d'application : ce que ce module
// en a fait, indépendamment de l'état qu'elle porte dans celui qui l'a
// relevée. Une constatation soldée chez le surveillant reste « à traiter »
// ici tant qu'aucune décision n'a été prise. Les statuts suivent le fil du
// traitement, dans les mêmes termes que la colonne « Actions », et se lisent
// dans l'ordre du circuit. `couleur` sert aux parts du tableau de bord,
// `classe` à la pastille de la colonne « Statut ».
interface StatutCare { cle: string; couleur: string; classe: string }
const A_TRAITER: StatutCare = { cle: 'care_a_traiter', couleur: '#dc2626', classe: 'st-a-traiter' };
export const MES_STATUT_CARE: Record<string, StatutCare> = {
  a_traiter: A_TRAITER,
  investigations: { cle: 'care_investigations', couleur: '#ea580c', classe: 'st-investigations' },
  qualification: { cle: 'care_qualification', couleur: '#d97706', classe: 'st-qualification' },
  sous_suivi: { cle: 'care_sous_suivi', couleur: '#0891b2', classe: 'st-sous-suivi' },
  traitee: { cle: 'care_traitee', couleur: '#059669', classe: 'st-traitee' },
  cloturee: { cle: 'care_cloturee', couleur: '#475569', classe: 'st-cloturee' },
  classee: { cle: 'care_classee', couleur: '#7c3aed', classe: 'st-classee' },
};
const statutCare = (cle: string | undefined): StatutCare => (cle !== undefined && MES_STATUT_CARE[cle]) || A_TRAITER;
export const mesLibelleCare = (cle: string | undefined): string => mt(statutCare(cle).cle);

// Le statut se lit en pastille, comme les mentions de la colonne « Actions » :
// les deux colonnes disent la même chose du même dossier, de la même façon.
export const mesBadgeStatutCare = (cle: string | undefined): string => {
  const st = statutCare(cle);
  return `<span class="mes-badge ${st.classe}">${_mesEsc(mt(st.cle))}</span>`;
};

export const MES_CLES_STATUT = ['projet', 'notifiee', 'en_cours', 'cloturee', 'annulee'];
export const mesLibelleStatut = (cle: string): string => mt(`mes_${cle}`);

export const MES_CLOS = ['cloturee', 'annulee'];
/** Ce que l'échéance d'une mesure regarde. */
export interface MesureEcheance { date_echeance?: string; statut?: string }
export const mesEnRetard = (m: MesureEcheance): boolean => !!m.date_echeance && m.date_echeance < mesJour() && !MES_CLOS.includes(m.statut || '');

// Statut de suivi d'une mesure : où en est le plan d'action que le prestataire
// doit conduire. Les statuts du circuit interne — projet, notifiée, en cours —
// disaient ce que l'Autorité en avait fait, non ce que la mesure était devenue
// chez celui qu'elle vise. C'est ce dernier état que la table porte. La table
// ne retient que la classe d'affichage, le libellé et l'explication viennent
// du répertoire de traduction.
export const MES_SUIVI: Record<string, { classe: string }> = {
  attendu: { classe: 'notifiee' },
  en_cours: { classe: 'en_cours' },
  solde: { classe: 'cloturee' },
  sans_suite: { classe: 'annulee' },
  sans_objet: { classe: 'cloturee' },
  recours: { classe: 'majeure' },
};
export const mesLibelleSuivi = (cle: string): string => mt(`suivi_${cle}`);
export const mesAideSuivi = (cle: string): string => mt(`suivi_${cle}_aide`);

/** Ce que le statut de suivi d'une mesure regarde. */
export interface MesureEtatSuivi { suivi_statut?: string; recours_intente?: unknown; statut?: string }

// Tant que le suivi n'est pas ouvert, l'état se déduit du circuit de la
// mesure — une mesure annulée ne sera jamais suivie, une mesure clôturée l'a
// été. Dès que l'étape « Suivi des Mesures » écrit `suivi_statut`, c'est lui
// qui fait foi.
export function mesStatutSuivi(m: MesureEtatSuivi): string {
  if (m.suivi_statut !== undefined && MES_SUIVI[m.suivi_statut]) return m.suivi_statut;
  // Un recours prime : il suspend le suivi, quel que soit l'état du circuit.
  if (m.recours_intente) return 'recours';
  if (m.statut === 'annulee') return 'sans_suite';
  if (m.statut === 'cloturee') return 'solde';
  if (m.statut === 'en_cours') return 'en_cours';
  return 'attendu';
}

/** Ce que la pastille du suivi lit d'une mesure. */
export interface MesureStatut extends MesureEtatSuivi { date_cloture?: string; date_notification?: string }

export function mesStatutMesure(m: MesureStatut): string {
  const cle = mesStatutSuivi(m);
  const e = MES_SUIVI[cle] || { classe: '' };
  const quand = cle === 'solde' ? m.date_cloture : (cle === 'attendu' ? m.date_notification : '');
  return `<span class="mes-badge ${e.classe}" title="${_mesAttr(mesAideSuivi(cle))}">${_mesEsc(mesLibelleSuivi(cle))}</span>
        ${quand ? `<div class="mes-cell-suite">${_mesEsc(mesDate(quand))}</div>` : ''}`;
}

// Le bouton d'action dit où en est le traitement, plutôt que d'inviter
// indistinctement à « traiter » un dossier déjà bien avancé. La table ne
// retient que la clé : l'étape se nomme dans la langue retenue.
export const MES_LIBELLE_ETAPE: Record<string, string> = {
  suite: 'etape_suite',
  investigations: 'etape_investigations',
  qualification: 'etape_qualification',
  suivi: 'etape_suivi',
};
export const mesLibelleEtape = (etape: string): string => mt(MES_LIBELLE_ETAPE[etape] || 'etape_suite');
