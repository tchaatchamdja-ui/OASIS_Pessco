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
export interface SecteurPr { id: string; code?: string; nom?: string; domaine_id?: string }
/** Un domaine. */
export interface DomainePr { id: string; code?: string; nom?: string }

/** Le résultat global d'une évaluation : l'indice de risque, le CSRBO, les indices. */
export interface ResultatGlobalPr {
  globalRisk?: { label?: string; risk?: string };
  csrbo?: number | string;
  ids_g?: string;
  safetyIndex?: { val?: string };
  ide_g?: number;
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
  resultats?: { global?: ResultatGlobalPr };
}

/** Un document de la bibliothèque, tel que `/api/documents` le rend. */
export interface DocumentPr { id: string; nom?: string; type?: string; taille?: number; date_upload?: string }
