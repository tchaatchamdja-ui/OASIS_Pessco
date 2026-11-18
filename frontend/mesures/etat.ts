// OASIS — « Mesures d'Application » (CARE) : l'état de l'écran, l'adresse de
// son API, ses données et les droits du compte (ADR-003, 5.c — n° 5.f.124).
//
// Ils vivaient en tête de `mes-app.js`, la coquille. Ils sont la feuille du
// paquet : tout le reste de la coquille les importe, eux n'importent rien
// d'elle. Les autres paquets de CARE ne les importent pas — ils fabriqueraient
// un second état — : ils lisent celui-ci sur `window`, où le sas le pose
// (`partage.ts`).
//
// Converti à la lettre : le balisage est rendu caractère pour caractère,
// chaque requête part avec le même corps.
import { requis } from './partage';

declare global {
  /** Ce que `/instance` rend : l'instance retenue, et celles qu'on peut prendre. */
  interface EtatInstanceCare {
    disponible?: boolean;
    courante?: string;
    instances?: string[];
    locale?: string;
  }

  /** Une catégorie de mesure, telle que `/parametres` la rend. */
  interface CategorieCare { id: string; code: string; libelle: string }
  /** Un type de mesure, rattaché à sa catégorie par le code de celle-ci. */
  interface TypeMesureCare { id: string; code?: string; libelle: string; categorie_code?: string }
  /** Un type d'investigation ou un comité : un libellé, un code. */
  interface ElementParametreCare { id: string; code?: string; libelle: string }

  /** Ce que `/parametres` rend : les quatre listes, et ce que le compte y peut. */
  interface ParametresCare {
    modifiable?: boolean;
    supprimable?: boolean;
    categories?: CategorieCare[];
    types?: TypeMesureCare[];
    types_investigation?: ElementParametreCare[];
    comites?: ElementParametreCare[];
  }

  /**
   * Les données chargées de l'écran, telles que les **autres** paquets les
   * lisent. Seules celles qu'ils lisent sont nommées ; la coquille, qui les
   * charge, en tient la forme entière (`DonneesCoquille`, ci-dessous).
   */
  interface DonneesCare {
    parametres: ParametresCare;
    [nom: string]: unknown;
  }

  /**
   * L'état de l'écran, tel que les autres paquets le lisent. Seuls les champs
   * qu'ils lisent sont nommés, d'où la signature d'index ; la coquille en tient
   * la forme entière (`EtatCoquille`).
   */
  interface EtatCare {
    lang?: string;
    user?: { role?: string } | null;
    instances?: EtatInstanceCare;
    data: DonneesCare;
    /** Le sous-menu ouvert des Paramètres, et la bande repliée ou non. */
    paramSousMenu?: string;
    paramBarreRepliee?: boolean;
    /** L'élément qu'une fenêtre des Paramètres modifie — `{}` pour un nouveau. */
    categorieEnCours?: Partial<CategorieCare> | null;
    typeEnCours?: Partial<TypeMesureCare> | null;
    typeInvestigationEnCours?: Partial<ElementParametreCare> | null;
    comiteEnCours?: Partial<ElementParametreCare> | null;
    /** La constatation du volet de saisie ; la fenêtre la referme. */
    constatEnCours?: unknown;
    [champ: string]: unknown;
  }
}

/** Le compte connecté, tel que `/context` le rend. */
export interface CompteCare { role?: string; role_m4?: string; nom?: string; prenom?: string }

/** Un organisme, tel que `/referentiels` le rend. */
export interface PrestataireCare { id: string; nom?: string }

/** Une mesure du registre — les champs que la coquille lit. */
export interface MesureCare {
  id: string;
  reference?: string;
  objet?: string;
  description?: string;
  prestataire_id?: string;
  prestataire_nom?: string;
  categorie?: string;
  type_mesure?: string;
  statut?: string;
  date_emission?: string;
  date_sanction?: string;
  date_echeance?: string;
  date_notification?: string;
  date_cloture?: string;
  portee?: string;
  duree_valeur?: number | string;
  duree_unite?: string;
  constatation_id?: string;
  constatation_ref?: string;
  suivi_statut?: string;
  recours_intente?: unknown;
}

/** Une carence — relevée par un module, ou saisie ici. */
export interface ConstatationCare {
  id: string;
  reference?: string;
  titre?: string;
  description?: string;
  prestataire_id?: string;
  prestataire_nom?: string;
  criticite?: string;
  statut?: string;
  statut_care?: string;
  origine?: string;
  origine_libelle?: string;
  date_ouverture?: string;
  date_due_cloture?: string;
  date_cloture?: string;
  delai_jours?: string | number;
  classee?: unknown;
  traitement_clos?: unknown;
  traitement_etape?: string;
  mesures_liees?: number;
}

/** La constatation du volet de saisie : celle qu'on modifie, ou `{}`. */
export type ConstatSaisie = Partial<Record<keyof ConstatationCare, unknown>> & { id?: string };

/** La mesure qu'un dossier ouvert prépare. */
export interface MesureEnCours {
  categorie: string;
  constatation_id: string;
  prestataire_id: string;
  objet: string;
  statut?: string;
}

/** Les données chargées, sous leur forme entière. */
export interface DonneesCoquille extends DonneesCare {
  mesures: MesureCare[];
  constatations: ConstatationCare[];
  prestataires: PrestataireCare[];
  domaines: unknown[];
  secteurs: unknown[];
}

/** Les filtres des trois écrans, par préfixe : tableau de bord, mesures, carences. */
export type CleFiltre =
  | 'db_prest' | 'db_cat' | 'db_type' | 'db_statut' | 'db_echeance'
  | 'mes_categorie' | 'mes_statut' | 'mes_prest' | 'mes_recherche' | 'mes_carence'
  | 'crit_statut' | 'crit_prest' | 'crit_origine' | 'crit_recherche';

/** L'état de l'écran, sous sa forme entière — celle que la coquille écrit. */
export interface EtatCoquille extends EtatCare {
  user: CompteCare | null;
  privilege: string;
  instances: EtatInstanceCare;
  currentPage: string;
  paramSousMenu: string;
  paramBarreRepliee: boolean;
  sidebarCollapsed: boolean;
  theme: string;
  lang: string;
  data: DonneesCoquille;
  filtres: Record<CleFiltre, string>;
  mesureEnCours: MesureEnCours | null;
  carenceEnCours: ConstatationCare | null;
  traitement: unknown;
  etapeVue: string;
  categorieEnCours: Partial<CategorieCare> | null;
  typeEnCours: Partial<TypeMesureCare> | null;
  sliderOpen: boolean;
  constatEnCours?: ConstatSaisie | null;
  /** La source et la catégorie retenues aux graphiques du tableau de bord. */
  sourceGraphe?: string;
  categorieGraphe?: string;
}

export const MES_API = '/api/m/mesures';

export const MES_STATE: EtatCoquille = {
  user: null,
  privilege: '',
  // Instance regardée, servie par le contexte : { disponible, locale,
  // courante, instances }. La barre supérieure en fait une liste déroulante.
  instances: {},
  currentPage: 'dashboard',
  // Menu Paramètres : le sous-menu ouvert, et le repli de sa bande latérale.
  paramSousMenu: 'categories',
  paramBarreRepliee: false,
  sidebarCollapsed: localStorage.getItem('mes_sidebar') === 'true',
  theme: 'blue-dark',
  lang: 'fr',
  data: {
    mesures: [], constatations: [], prestataires: [], domaines: [], secteurs: [],
    parametres: { categories: [], types: [], modifiable: false, supprimable: false },
  },
  filtres: {
    db_prest: '', db_cat: '', db_type: '', db_statut: '', db_echeance: '',
    mes_categorie: '', mes_statut: '', mes_prest: '', mes_recherche: '', mes_carence: '',
    crit_statut: '', crit_prest: '', crit_origine: '', crit_recherche: '',
  },
  mesureEnCours: null,
  // Carence dont le traitement est ouvert, et son fil d'avancement.
  carenceEnCours: null,
  traitement: null,
  // Étape du fil que l'on regarde ; l'étape atteinte vient du traitement.
  etapeVue: '',
  categorieEnCours: null,
  typeEnCours: null,
  sliderOpen: false,
};

// ── Requêtes ──
// Le client vient du socle (oasis-commun.js). Il imposait ici un type JSON
// jusque sur les dépôts de fichiers : le corps partait sans sa frontière
// multipart, et le serveur répondait « Aucun fichier fourni ».
export function mesApi(chemin: string, options?: RequestInit): Promise<unknown> {
  return window.oasisJson(MES_API + chemin, options);
}

// ── Échappement ──
// `_mesEsc` protège le texte ; `_mesAttr` protège une valeur d'attribut, où
// un guillemet refermerait l'attribut. Tout libellé saisi peut en contenir.
// L'échappement vient du socle (oasis-commun.js) : un seul barème pour tous
// les modules. Le nom demeure, les gabarits n'ont rien à changer.
export function _mesEsc(v: unknown): string { return window.oasisEsc(v); }
export const _mesAttr = (v: unknown): string => window.oasisEsc(v);

// Chemin d'une pièce jointe servie par ce module. Échapper l'attribut ne suffit
// pas : « javascript:… » y tiendrait sans guillemet. Seul le chemin que
// /upload rend devient un lien.
export const _mesChemin = (v: unknown): string => (/^\/api\/m\/mesures\/uploads\/[A-Za-z0-9._-]+$/.test(String(v || ''))
  ? String(v) : '');

// Comparaison tolérante aux accents et à la casse, pour les recherches.
export const _mesNorm = (v: unknown): string => String(v == null ? '' : v)
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ── Droits ──
export const mesRole = (): string => (MES_STATE.user || {}).role_m4 || 'M4_Non Autorisé';
export const mesEstAdmin = (): boolean => mesRole() === 'M4_Administrateur';
// Supprimer une mesure efface une sanction prononcée : le geste ne relève pas
// du module mais du compte qui administre l'application. Le serveur pose la
// même garde — sans quoi ce test ne ferait que cacher un bouton.
export const mesEstSuperAdmin = (): boolean => (MES_STATE.user || {}).role === 'SUPERADMIN';
export const mesPeutDecider = (): boolean => ['M4_Validateur', 'M4_Administrateur'].includes(mesRole());
export const mesPeutEcrire = (): boolean => ['M4_Contributeur', 'M4_Validateur', 'M4_Administrateur'].includes(mesRole());

// ── Paramétrage : catégories et types ──
export const mesCategories = (): CategorieCare[] => (MES_STATE.data.parametres.categories || []);
export const mesTypes = (): TypeMesureCare[] => (MES_STATE.data.parametres.types || []);
export const mesTypesDe = (categorie: string | undefined): TypeMesureCare[] => mesTypes().filter((t) => t.categorie_code === categorie);
export const mesLibelleCategorie = (code: string | undefined): string => {
  const c = mesCategories().find((x) => x.code === code);
  return c ? c.libelle : (code || '—');
};
export const mesLibelleType = (code: string | undefined): string => {
  const t = mesTypes().find((x) => x.code === code);
  return t ? t.libelle : (code || '—');
};

// ── Dates ──
export const mesJour = (): string => window.oasisJour();
export const mesDate = (v: unknown): string => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

// Le message d'une erreur levée, lu comme l'ancien fichier le lisait : `e.message`.
export const messageDe = (e: unknown): string | undefined => (e as { message?: string }).message;

export function mesToast(message: string, type?: string): unknown {
  if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
  return window.oasisToast(message, type);
}

// ── Chargement des données ──
interface Referentiels { prestataires?: PrestataireCare[]; domaines?: unknown[]; secteurs?: unknown[] }

export async function mesLoadData(): Promise<void> {
  const [mesures, constatations, refs, parametres] = await Promise.all([
    mesApi('/mesures').catch(() => []),
    mesApi('/constatations').catch(() => []),
    mesApi('/referentiels').catch(() => ({})),
    mesApi('/parametres').catch(() => ({ categories: [], types: [] })),
  ]);
  const r = refs as Referentiels;
  MES_STATE.data.mesures = (mesures as MesureCare[] | null) || [];
  MES_STATE.data.constatations = (constatations as ConstatationCare[] | null) || [];
  MES_STATE.data.prestataires = r.prestataires || [];
  MES_STATE.data.domaines = r.domaines || [];
  MES_STATE.data.secteurs = r.secteurs || [];
  MES_STATE.data.parametres = (parametres as ParametresCare | null) || { categories: [], types: [] };
}

// Redessiner passe par la page, comme l'ancien fichier appelait le nom nu :
// la page redessinée est celle de la coquille, quel que soit le paquet.
export async function mesRechargerMesures(): Promise<void> {
  MES_STATE.data.mesures = await mesApi('/mesures').catch(() => MES_STATE.data.mesures) as MesureCare[];
  requis('mesRenderPage')();
}

export const mesTypesInvestigation = (): ElementParametreCare[] => ((MES_STATE.data.parametres || {}).types_investigation) || [];
export const mesComites = (): ElementParametreCare[] => ((MES_STATE.data.parametres || {}).comites) || [];

export async function mesRechargerParametres(): Promise<void> {
  MES_STATE.data.parametres = await mesApi('/parametres')
    .catch(() => MES_STATE.data.parametres) as ParametresCare;
  requis('mesRenderPage')();
}

