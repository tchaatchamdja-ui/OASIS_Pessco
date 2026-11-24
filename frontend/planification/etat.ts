// OASIS — « Planification de la Surveillance » : l'adresse de son API et son état.
//
// Ils vivaient en tête de `pl-i18n.js`, avec les libellés : « toutes les parties
// partagent la portée globale de la page », disait l'en-tête. Ce sont deux
// choses distinctes, et le fichier des libellés n'a pas à porter l'état d'un
// écran. Ils sont séparés à la conversion, sans rien changer à ce qu'ils valent
// (ADR-003, n° 5.f.101).

// L'adresse vit dans `adresse.ts`, sans effet de bord ; elle est réexportée ici
// pour ceux qui lisent l'état et l'adresse ensemble.
export { PLAN_MODULE_API } from './adresse';

import type { Plan } from './liste-plans';

/** Le compte connecté, tel que le portail ou l'hôte le pose. */
export interface CompteOasis {
  id?: string;
  username?: string;
  email?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  role_m2?: string;
}

/** Les droits du compte sur PLAN, rendus par `/api/m/droits/PLAN/my-access`. */
export interface AccesPlan {
  hasAccess: boolean;
  privilege: string;
  secteurs: Record<string, string>;
}

/** Les filtres des pages, que la barre partagée et ses gestes en ligne écrivent. */
export type FiltresPlan = Record<
  'domaine' | 'secteur' | 'prestataire' | 'sousActivite' | 'theme' | 'statut' | 'search' | 'annee', string>;

/** Les filtres du calendrier, posés à sa première vue. */
export type FiltresCal = Record<
  'domaine' | 'secteur' | 'prestataire' | 'annee' | 'trimestre' | 'responsable' | 'search', string>;

/**
 * L'état de l'écran — **tous** ses champs, déclarés ici et nulle part ailleurs
 * (n° 5.f.110). Il portait une signature d'index du temps où des fichiers en
 * JavaScript y ajoutaient des champs à la volée ; chaque page en déclarait sa
 * part et la lisait par une conversion de type, que rien ne confrontait aux
 * autres. Un champ mal nommé passe désormais par tsc.
 *
 * Les gestes en ligne des gabarits écrivent aussi `PLAN_STATE.<champ>` dans du
 * texte, que tsc ne lit pas : la suite `planification-navigateur` confronte
 * chacun de ces noms à cette déclaration.
 */
export interface EtatPlan {
  /** Le compte : posé au démarrage ; sans lui, la page renvoie à la connexion. */
  user: CompteOasis | null;
  /** Les droits du module : absents jusqu'au premier chargement. */
  access?: AccesPlan;
  lang: string;
  theme: string;
  currentPage: string;
  currentSub: string;
  planSubMenu: string;
  sidebarCollapsed: boolean;
  data: Record<string, unknown>;
  filters: FiltresPlan;

  // ── Le détail d'un plan ──
  selectedPlan: Plan | null;
  /** Les activités dont le dernier avis est un rejet. */
  selectedPlanActivityRejet?: Set<string>;
  /** L'organisme que la prochaine saisie d'activité proposera. */
  prefillPrestataire?: string;
  /** Garder cet organisme au prochain rendu du détail. */
  _keepPrefill?: boolean;

  // ── Le tableau de bord ──
  carteChoisie?: string;
  _dashboardInitialized?: boolean;

  // ── Le calendrier : sa page, et son volet ──
  calendarYear?: number | null;
  calendarView?: string;
  calendarMonth?: number | null;
  calendarWeek?: number;
  calFilters?: FiltresCal | null;
  calendrierVolet?: boolean;
}

/**
 * Lu au chargement, comme l'ancien : `localStorage.getItem` n'est pas gardé, et
 * ne l'était pas — un stockage fermé arrêtait le script, et arrête ce module de
 * même. Le changer n'est pas l'objet d'une conversion.
 */
export const PLAN_STATE: EtatPlan = {
  user: null,
  lang: 'fr',
  theme: 'blue-dark',
  currentPage: 'dashboard',
  currentSub: '',
  planSubMenu: 'planifiees', // planifiees | inopinees | speciale
  selectedPlan: null,
  sidebarCollapsed: localStorage.getItem('plan_sidebar') === 'true',
  data: {},
  filters: {
    domaine: '', secteur: '', prestataire: '', sousActivite: '', theme: '', statut: '', search: '', annee: '',
  },
};
