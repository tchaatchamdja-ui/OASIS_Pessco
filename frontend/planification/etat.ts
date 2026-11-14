// OASIS — « Planification de la Surveillance » : l'adresse de son API et son état.
//
// Ils vivaient en tête de `pl-i18n.js`, avec les libellés : « toutes les parties
// partagent la portée globale de la page », disait l'en-tête. Ce sont deux
// choses distinctes, et le fichier des libellés n'a pas à porter l'état d'un
// écran. Ils sont séparés à la conversion, sans rien changer à ce qu'ils valent
// (ADR-003, n° 5.f.101).

/** La racine des routes du module. */
export const PLAN_MODULE_API = '/api/m/planification';

/**
 * L'état de l'écran. Les douze fichiers restés en JavaScript l'écrivent et le
 * lisent librement — page courante, filtres, données chargées, plan ouvert —, et
 * en ajoutent des champs à la volée (`prefillPrestataire`, `_keepPrefill`…) :
 * d'où la signature d'index. Le typage se resserrera fichier par fichier, à
 * mesure qu'ils passeront en TypeScript.
 */
export interface EtatPlan {
  user: unknown;
  lang: string;
  theme: string;
  currentPage: string;
  currentSub: string;
  planSubMenu: string;
  selectedPlan: unknown;
  sidebarCollapsed: boolean;
  data: Record<string, unknown>;
  filters: Record<string, string>;
  [champ: string]: unknown;
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
