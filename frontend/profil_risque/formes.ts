// OASIS — « Profils de Risque » (PR) : les formes que l'API du module rend,
// déclarées une fois (ADR-003, 5.c — n° 5.f.131).
//
// La leçon de CARE (n° 5.f.126) appliquée d'emblée : une forme déclarée par
// chaque fichier qui la lit finit en cinq vues que rien ne confronte. Celles de
// PR vivent ici, et chaque fichier converti y ajoute ce qu'il lit — non une vue
// à lui. Des types seuls : esbuild efface ce fichier.

/** Un organisme évalué, tel que les référentiels le rendent. */
export interface PrestatairePr {
  id: string; nom?: string; trigramme?: string; actif?: boolean | number;
  secteur_id?: string; domaine_id?: string;
}
/** Un secteur, rattaché à son domaine. */
export interface SecteurPr { id: string; code?: string; nom?: string; domaine_id?: string; csn?: number | string }
/** Un domaine. */
export interface DomainePr { id: string; code?: string; nom?: string }

/** Le résultat global d'une évaluation : l'indice de risque, le CSRBO, les indices. */
export interface ResultatGlobalPr {
  globalRisk?: { label?: string; risk?: string; csnMod?: number; intensity?: string; freq?: number };
  csrbo?: number | string;
  csn?: number | string;
  idc_g?: number | string;
  idp_g?: number | string;
  ids_g?: string;
  safetyIndex?: { val?: string };
  ide_g?: number;
  tauxConf?: number;
  tauxPerf?: number;
  tauxComp?: number;
}

/** Le résultat d'une sous-activité. */
export interface ResultatSaPr {
  idc_s?: number | string; idp_s?: number | string; ids_s?: string; ide_s?: number | string;
  safetyIndex?: { val?: string }; risk?: string; risk_desc?: string; freq?: number | string;
  globalRisk?: { label?: string; risk?: string; freq?: number | string };
}

/** Des notes par indicateur, par évaluateur : `perf[<adresse>][<indicateur>]`. */
export interface NotesParEvaluateurPr {
  perf?: Record<string, Record<string, number> | undefined>;
  comp?: Record<string, Record<string, number> | undefined>;
}

/** Les sept champs libres des généralités d'une évaluation. */
export interface GeneralitesPr {
  introduction?: string; resume?: string; evaluateurs?: string; parties?: string; sources?: string;
  actions?: string; conclusion?: string;
}

/** Une évaluation — les champs que les fichiers convertis lisent. */
export interface EvaluationPr {
  id: string;
  statut?: string;
  prestataire_id?: string;
  secteur_id?: string;
  date?: string;
  date_validation?: string;
  date_debut_cycle?: string;
  date_fin_cycle?: string;
  resultats?: { global?: ResultatGlobalPr; sousActivites?: Record<string, ResultatSaPr | undefined> };
  /** Les identifiants des évaluateurs désignés — des adresses. */
  evaluateurs_designes?: string[];
  notes_conf?: Record<string, number>;
  notes_perf?: Record<string, number>;
  notes_comp?: Record<string, number>;
  notes_per_evaluator?: NotesParEvaluateurPr;
  notes_per_evaluator_draft?: NotesParEvaluateurPr;
  /** Les horodatages du fil d'avancement, posés par le serveur. */
  etapes?: Record<string, string | undefined>;
  generalites?: GeneralitesPr;
  createdAt?: string; updatedAt?: string; created_by?: string;
  soumis_le?: string; decide_le?: string; decide_par?: string; date_revue_directeur?: string;
  commentaire_directeur?: string;
  /** La réévaluation : l'origine, et le cycle suivant. */
  parent_id?: string; enfant_id?: string; cycle?: number;
}

/** Un compte, tel que la liste des utilisateurs le rend. */
export interface UtilisateurPr {
  id: string; nom?: string; prenom?: string; nom_utilisateur?: string; email?: string;
  role_m1?: string; domaines?: string[]; username?: string; fullName?: string;
}

/** Les droits du compte sur le module : le privilège de base, et par secteur. */
export interface AccesPr { hasAccess: boolean; privilege: string; secteurs: Record<string, string | undefined> }

/** Une sous-activité, rattachée à son secteur. */
export interface SousActivitePr { id: string; code?: string; nom?: string; secteur_id?: string }

/** Un indicateur du barème — de conformité, de performance ou de complexité. */
export interface IndicateurPr {
  id: string; code?: string; label?: string; c1?: string; c2?: string; c3?: string;
  secteur_id?: string; sous_activite_id?: string; actif?: boolean | number;
}

/** Les seuils des trois indices. */
export interface IndicesPr {
  conf1?: number; conf2?: number; perf1?: number; perf2?: number; expo1?: number; expo2?: number;
}

/** Un plan de surveillance, tel que le module le rend — ce que la cloche lit. */
export interface PlanPr { statut?: string; date_prochaine?: string; prestataire_id?: string }

/**
 * Un élément que la fenêtre de saisie des paramètres modifie : un domaine, un
 * secteur, une sous-activité, un indicateur ou un organisme. Ses champs sont
 * ceux de l'un ou de l'autre, tous facultatifs.
 */
export interface EntitePr {
  id?: string; code?: string; nom?: string; label?: string; c1?: string; c2?: string; c3?: string;
  domaine_id?: string; secteur_id?: string; sous_activite_id?: string; csn?: number | string;
  trigramme?: string; contact_nom?: string; contact_tel?: string; contact_email?: string;
  date_certification?: string; is_nouveau?: boolean | number; date_butoir?: string;
}

/** Un document de la bibliothèque, tel que `/api/documents` le rend. */
export interface DocumentPr { id: string; nom?: string; type?: string; taille?: number; date_upload?: string }
