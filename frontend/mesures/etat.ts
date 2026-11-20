// OASIS — « Mesures d'Application » (CARE) : l'état de l'écran, l'adresse de
// son API, ses données et les droits du compte (ADR-003, 5.c — n° 5.f.124).
//
// Ils vivaient en tête de `mes-app.js`, la coquille. Ils sont la feuille du
// paquet : tout le reste de la coquille les importe, eux n'importent rien
// d'elle. Les autres paquets de CARE n'en importent pas les valeurs — ils
// fabriqueraient un second état — : ils lisent celui-ci sur `window`, où le
// sas le pose (`partage.ts`). Ils en importent le **type**, déclaré ici une
// fois, qu'esbuild efface (n° 5.f.126).
//
// Converti à la lettre : le balisage est rendu caractère pour caractère,
// chaque requête part avec le même corps.
import { requis } from './partage';
import type {
  CategorieCare, CompteCare, ConstatSaisie, ConstatationCare, ElementParametreCare, EtatInstanceCare,
  MesureCare, ParametresCare, PrestataireCare, TraitementCare, TypeMesureCare,
} from './formes';

/** Les données chargées de l'écran. */
export interface DonneesCare {
  mesures: MesureCare[];
  constatations: ConstatationCare[];
  prestataires: PrestataireCare[];
  domaines: unknown[];
  secteurs: unknown[];
  parametres: ParametresCare;
}

/** La mesure qu'un dossier ouvert prépare. */
export interface MesureEnCours {
  categorie: string;
  constatation_id: string;
  prestataire_id: string;
  objet: string;
  statut?: string;
}

/** Les filtres des trois écrans, par préfixe : tableau de bord, mesures, carences. */
export type CleFiltre =
  | 'db_prest' | 'db_cat' | 'db_type' | 'db_statut' | 'db_echeance'
  | 'mes_categorie' | 'mes_statut' | 'mes_prest' | 'mes_recherche' | 'mes_carence'
  | 'crit_statut' | 'crit_prest' | 'crit_origine' | 'crit_recherche';

/**
 * L'état de l'écran — déclaré ici, une fois, pour la coquille et pour les sept
 * autres paquets qui le lisent sur la page (n° 5.f.126).
 *
 * Il l'était deux fois : `EtatCare`, lâche, avec une signature d'index, pour
 * les paquets ; `EtatCoquille`, qui l'étendait, pour la coquille. Un champ que
 * la coquille ne déclarait pas — le volet de la qualification, l'historique
 * ouvert — passait par la signature, et chaque lecteur le convertissait au type
 * qu'il supposait.
 */
export interface EtatCare {
  user: CompteCare | null;
  privilege: string;
  instances: EtatInstanceCare;
  currentPage: string;
  /** Le sous-menu ouvert des Paramètres, et la bande repliée ou non. */
  paramSousMenu: string;
  paramBarreRepliee: boolean;
  sidebarCollapsed: boolean;
  theme: string;
  lang: string;
  data: DonneesCare;
  filtres: Record<CleFiltre, string>;
  mesureEnCours: MesureEnCours | null;
  /** La carence dont le traitement est ouvert, et son traitement. */
  carenceEnCours: ConstatationCare | null;
  traitement: TraitementCare | null;
  /** L'étape du fil que l'on regarde ; l'étape atteinte vient du traitement. */
  etapeVue: string;
  /** Le volet ouvert de la qualification — posé au premier choix. */
  qualVolet?: string;
  /** L'historique d'une carence est-il ouvert ? Posé à la première ouverture. */
  histoOuvert?: boolean;
  /** L'élément qu'une fenêtre des Paramètres modifie — `{}` pour un nouveau. */
  categorieEnCours: Partial<CategorieCare> | null;
  typeEnCours: Partial<TypeMesureCare> | null;
  typeInvestigationEnCours?: Partial<ElementParametreCare> | null;
  comiteEnCours?: Partial<ElementParametreCare> | null;
  sliderOpen: boolean;
  /** La constatation du volet de saisie ; la fenêtre la referme. */
  constatEnCours?: ConstatSaisie | null;
  /** La source et la catégorie retenues aux graphiques du tableau de bord. */
  sourceGraphe?: string;
  categorieGraphe?: string;
}

export const MES_API = '/api/m/mesures';

export const MES_STATE: EtatCare = {
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

