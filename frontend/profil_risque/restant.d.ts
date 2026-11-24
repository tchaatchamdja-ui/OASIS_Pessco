// OASIS — « Profils de Risque » (PR) : ce que les fichiers restés en
// JavaScript définissent, et que les fichiers convertis lisent.
//
// La frontière de la cohabitation, écrite à un seul endroit, comme pour PLAN
// et CARE (ADR-003, n° 5.f.102, 5.f.117). Le TypeScript ne peut pas voir ces
// noms — il n'y a rien à importer —, il les **déclare**.
//
// Chaque ligne part avec la conversion du fichier qui définit le nom : alors
// c'est lui, et lui seul, qui le déclarera — la règle de 5.b.
import type {
  AccesPr, DocumentPr, DomainePr, EvaluationPr, IndicateurPr, IndicesPr, PlanPr, PrestatairePr, SecteurPr,
  SousActivitePr, UtilisateurPr,
} from './formes';

declare global {
  /** Ce que `/instance` rend : l'instance retenue, et celles qu'on peut prendre. */
  interface EtatInstancePr {
    disponible?: boolean;
    courante?: string;
    instances?: string[];
    locale?: string;
  }

  /**
   * `pr-shell.js` — l'état de l'écran, `window.APP_STATE`. Sa forme partagée
   * est celle du socle (`EtatShellModule`) ; PR y ajoute ce que ses fichiers
   * convertis lisent, et rien d'autre.
   */
  /** `pr-shell.js` — les données chargées de l'écran, la part qu'on lit converti. */
  interface DonneesPr {
    documents?: DocumentPr[];
    evaluations?: EvaluationPr[];
    prestataires?: PrestatairePr[];
    secteurs?: SecteurPr[];
    domaines?: DomainePr[];
    sousActivites?: SousActivitePr[];
    users?: UtilisateurPr[];
    indConf?: IndicateurPr[];
    indPerf?: IndicateurPr[];
    indComplex?: IndicateurPr[];
    indices?: IndicesPr;
    plans?: PlanPr[];
    /** L'AAC de l'instance — son nom ouvre le rapport. */
    aac?: { nom?: string; logo_data?: string; ville?: string; etat?: string; sigle?: string };
    /** Les référentiels bruts, avant le filtre de l'instance, quand la coquille les garde. */
    _rawSecteurs?: SecteurPr[];
    _rawSousActivites?: SousActivitePr[];
  }

  interface EtatShellModule {
    instances?: EtatInstancePr;
    data?: DonneesPr;
    /** La sous-vue ouverte de la page courante. */
    currentSub?: string;
    /** La bande latérale des Paramètres, repliée ou non. */
    paramBarreRepliee?: boolean;
    /** Le compte connecté — son identifiant, une adresse, et son rôle portail. */
    user?: { id?: string; role?: string } | null;
    /** Les droits du compte sur le module. */
    access?: AccesPr;
    /** L'évaluation dont la fiche est ouverte. */
    currentEvalId?: string | null;
  }

  interface Window {
    /** `pr-shell.js` — le privilège du compte sur un secteur, le privilège de base pour `''`. */
    prPrivilegeOn?: (secteurId?: string) => string;
    /** `pr-shell.js` — la fenêtre modale de l'écran. */
    showModal?: (titre: string, corps: string, pied?: string, taille?: string) => void;
    /** `pr-shell.js` — la refermer. */
    closeModal?: () => void;
    /** `pr-shell.js` — recharger toutes les données de l'écran. */
    loadAllData?: () => Promise<void>;
    /** `pr-shell.js` — redessiner la page courante. */
    renderPage?: () => void;
    /** Le fichier choisi pour la bibliothèque, entre le choix et l'envoi. */
    _pendingDocFile?: File | null;
    /** `pr-shell.js` — le privilège de validation, sur un secteur ou en général. */
    prCanValidate?: (secteurId?: string) => boolean;
    /** `pr-evaluation-fiche.js` — l'échappement d'un texte libre des généralités. */
    _genEsc?: (s: unknown) => string;
    /** `pr-evaluation-fiche.js` — ouvrir la fiche d'une évaluation. */
    openEvalDetail?: (evalId: string) => void;
    /** `pr-shell.js` — ouvrir le volet latéral. */
    openSlicer?: (titre: string, corps: string, pied?: string, options?: { drawer?: boolean; retour?: boolean }) => void;
    /** `pr-shell.js` — déplier ou replier une section. */
    toggleAccordion?: (id: string) => void;
  }

  /**
   * `pr-shell.js` — le préfixe de l'API du module. Un `const` de premier
   * niveau : une globale **lexicale**, que l'on atteint par son nom et qui
   * n'est pas sur `window`.
   */
  const MODULE_API: string;
  /** `pr-shell.js` — les privilèges qui contribuent. Globale lexicale. */
  const PR_PRIV_CONTRIB: string[];
  /** `pr-shell.js` — les pages et leurs sous-vues. Globale lexicale. */
  const NAV_CONFIG: Record<string, { labelKey?: string; icon?: string; subs?: { id: string; labelKey: string; icon?: string }[] }>;
}

export {};
