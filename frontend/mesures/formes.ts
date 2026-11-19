// OASIS — « Mesures d'Application » (CARE) : les formes que l'API du module
// rend, déclarées une fois (ADR-003, 5.c — n° 5.f.126).
//
// Le traitement d'une carence — ce que `/traitement` rend — était déclaré
// **cinq** fois : par le fil du traitement, par la qualification, par le suivi,
// par l'historique, et par l'état, qui le tenait pour `unknown`. Chaque vue ne
// nommait que les champs qu'elle lisait, et les lisait par une conversion de
// type ; rien ne les confrontait. La carence l'était quatre fois, la mesure du
// registre trois. Elles le sont ici, une fois chacune, et l'état les porte.
//
// Ce fichier ne contient que des types : esbuild l'efface, aucun paquet n'en
// emporte une ligne.

// ── Le compte et les référentiels ──

/** Le compte connecté, tel que `/context` le rend. */
export interface CompteCare { role?: string; role_m4?: string; nom?: string; prenom?: string }

/** Ce que `/instance` rend : l'instance retenue, et celles qu'on peut prendre. */
export interface EtatInstanceCare {
  disponible?: boolean;
  courante?: string;
  instances?: string[];
  locale?: string;
}

/** Un organisme, tel que `/referentiels` le rend. */
export interface PrestataireCare { id: string; nom?: string }

// ── Le paramétrage ──

/** Une catégorie de mesure, telle que `/parametres` la rend. */
export interface CategorieCare { id: string; code: string; libelle: string }
/** Un type de mesure, rattaché à sa catégorie par le code de celle-ci. */
export interface TypeMesureCare { id: string; code?: string; libelle: string; categorie_code?: string }
/** Un type d'investigation ou un comité : un libellé, un code. */
export interface ElementParametreCare { id: string; code?: string; libelle: string }

/** Ce que `/parametres` rend : les quatre listes, et ce que le compte y peut. */
export interface ParametresCare {
  modifiable?: boolean;
  supprimable?: boolean;
  categories?: CategorieCare[];
  types?: TypeMesureCare[];
  types_investigation?: ElementParametreCare[];
  comites?: ElementParametreCare[];
}

// ── Les pièces et les personnes ──

/** Une pièce jointe, telle que `/upload` la rend. */
export interface Piece { nom?: string; path?: string; size?: number }
/** Un enquêteur, un membre de comité ou d'instance de recours. */
export interface Personne { nom?: string; prenom?: string; email?: string; contact?: string }

// ── La mesure ──

/** Le recours qu'un prestataire forme contre une mesure, et ce que l'instance en décide. */
export interface Recours {
  intente_texte?: string; pieces?: Piece[]; instance_code?: string; membres?: Personne[];
  commentaire?: string; decision?: string; decision_pieces?: Piece[];
}

/**
 * Une mesure du registre — `/mesures`, et les mesures liées que `/traitement`
 * rend. Le menu « Mesures », le suivi et l'historique la lisaient chacun par
 * sa vue.
 */
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
  date_creation?: string;
  created_by?: string;
  date_emission?: string;
  date_sanction?: string;
  date_echeance?: string;
  date_notification?: string;
  date_fin_sanction?: string;
  date_cloture?: string;
  portee?: string;
  duree_valeur?: number | string;
  duree_unite?: string;
  constatation_id?: string;
  constatation_ref?: string;
  suivi_commentaire?: string;
  suivi_statut?: string;
  suivi_pieces?: Piece[];
  recours_intente?: boolean;
  recours?: Recours | null;
}

/** Ce que la mesure était avant que le recours ne la fasse modifier. */
export interface VersionPrecedente {
  portee?: string; duree_valeur?: number | string; duree_unite?: string; categorie?: string;
  type_mesure?: string; date_sanction?: string; date_fin?: string; commentaire?: string;
}

/** Une mesure telle que la qualification l'arrête, avant le registre. */
export interface MesureQual {
  categorie?: string; type_mesure?: string; date_sanction?: string; portee?: string;
  duree_valeur?: number | string; duree_unite?: string; date_fin?: string; commentaire?: string;
  suivi_requis?: boolean; recours_intente?: boolean; recours?: Recours | null;
  statut_recours?: string; version_precedente?: VersionPrecedente | null;
}

// ── La carence ──

/**
 * Une carence — relevée par un module, ou saisie ici —, telle que
 * `/constatations` la rend. Les listes, le volet du traitement, la page des
 * états et l'historique la lisaient chacun par sa vue.
 */
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
  classee?: boolean;
  classement_motif?: string;
  traitement_clos?: boolean;
  traitement_etape?: string;
  traitement_decision?: string;
  traitement_cloture_le?: string;
  mesures_liees?: number;
}

/** La constatation du volet de saisie : celle qu'on modifie, ou `{}`. */
export type ConstatSaisie = Partial<Record<keyof ConstatationCare, unknown>> & { id?: string };

// ── Le traitement d'une carence ──

interface Travail { type?: string; resultats?: string; pieces?: Piece[] }
interface Renvoi { renvoye_le?: string; renvoye_par?: string; motif?: string }
/**
 * L'investigation d'une carence. Les trois listes sont tenues pour présentes,
 * comme l'ancien le tenait : il y ajoutait sans vérifier.
 */
export interface Investigation {
  equipe: Personne[]; travaux: Travail[]; autres_texte?: string; autres_pieces: Piece[]; rapport?: string;
  soumise_le?: string; soumise_par?: string; renvois?: Renvoi[];
}

export interface Reunion { date?: string; objet?: string; resultat?: string }
/**
 * La qualification d'une carence. Les quatre listes sont tenues pour présentes,
 * comme l'ancien le tenait : il y ajoutait sans vérifier.
 */
export interface Qualification {
  comite_code?: string; membres: Personne[]; reunions: Reunion[];
  infraction_constituee?: boolean; infraction_non_constituee?: boolean;
  renvoi_demande?: boolean; renvoi_motif?: string;
  nature?: string; caracterisation?: string; circonstances?: string;
  mesures: MesureQual[]; pieces: Piece[];
}

interface PreuvePac { action?: string; intitule?: string; depose_le?: string; commentaire?: string }
/** Le plan d'actions du prestataire, tel que son module le publie. */
interface Pac {
  preuves?: PreuvePac[]; cause_primaire?: string; action_curative?: string; curative_date_prevue?: string;
  actions_correctives?: string; corrective_date_prevue?: string; statut?: string; date_soumission?: string;
  motif_rejet?: string;
}

/** Le commentaire général du suivi, et qui l'a mis à jour. */
export interface SuiviCare { commentaire_general?: string; maj_le?: string; maj_par?: string }

/** Le traitement d'une carence, tel que `/traitement` le rend. */
export interface TraitementCare {
  etape?: string;
  date_creation?: string; created_by?: string;
  informations?: string; pieces?: Piece[]; pac?: Pac;
  decision?: string; decide_le?: string; decide_par?: string; decision_motif?: string;
  investigation?: Investigation;
  qualification?: Qualification;
  qualifie_le?: string; qualifie_par?: string;
  recours_ouvert_le?: string; recours_ouvert_par?: string;
  mesures?: MesureCare[];
  suivi?: SuiviCare;
  classe_le?: string; classe_par?: string;
  cloture_le?: string; cloture_par?: string;
}
