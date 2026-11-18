// OASIS — « Mesures d'Application » (CARE) : ce que les fichiers restés en
// JavaScript définissent, et que les fichiers convertis lisent.
//
// La frontière de la cohabitation, écrite à un seul endroit, comme pour PLAN
// (ADR-003, n° 5.f.102). Le TypeScript ne peut pas voir ces noms — il n'y a rien
// à importer —, il les **déclare**.
//
// **Tous optionnels**, parce que c'est la vérité : le programme TypeScript est un
// seul ensemble, et ces noms n'existent que sur la page de CARE, une fois ses
// scripts chargés. Chaque ligne part avec la conversion du fichier qui définit le
// nom : alors c'est lui, et lui seul, qui le déclarera — la règle de 5.b.

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

  /** Les données chargées de l'écran. Seules celles lues d'ici sont nommées. */
  interface DonneesCare {
    parametres: ParametresCare;
    [nom: string]: unknown;
  }

  /**
   * L'état de l'écran, tel que les fichiers convertis le lisent. Seuls les champs
   * lus d'ici sont nommés ; les fichiers en JavaScript en écrivent bien d'autres,
   * d'où la signature d'index. La forme se resserrera avec la coquille.
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
    /** La constatation du volet de saisie — `mes-app.js` ; la fenêtre la referme. */
    constatEnCours?: unknown;
    [champ: string]: unknown;
  }

  interface Window {
    /**
     * `mes-app.js` — l'état de l'écran, posé sur `window` par son
     * `Object.assign`.
     */
    MES_STATE?: EtatCare;
    /** `mes-app.js` — une requête à l'API du module (`/api/m/mesures` + chemin). */
    mesApi?: (chemin: string, options?: RequestInit) => Promise<unknown>;
    /** `mes-app.js` — un message éphémère, par le toast du socle. */
    mesToast?: (message: string, type?: string) => unknown;
    /** `mes-app.js` — les icônes de l'écran, par nom. */
    MES_ICONS?: Record<string, string>;
    /** `mes-app.js` — redessiner la page courante. */
    mesRenderPage?: () => void;
    /** `mes-app.js` — relire `/parametres`, puis redessiner. */
    mesRechargerParametres?: () => Promise<void>;
    /**
     * `mes-app.js` — les listes du paramétrage. Les quatre premières étaient des
     * `const` du premier niveau, invisibles à un module : `mes-app.js` les pose
     * désormais sur `window` (n° 5.f.118).
     */
    mesCategories?: () => CategorieCare[];
    mesTypes?: () => TypeMesureCare[];
    mesTypesDe?: (categorie: string) => TypeMesureCare[];
    mesLibelleCategorie?: (code: string | undefined) => string;
    mesTypesInvestigation?: () => ElementParametreCare[];
    mesComites?: () => ElementParametreCare[];
    /**
     * `mes-app.js` — le jour, la date courte, le badge du statut d'une carence.
     * Trois `const`, posés sur `window` pour le menu « États » (n° 5.f.119).
     */
    mesJour?: () => string;
    mesDate?: (v: unknown) => string;
    mesBadgeStatutCare?: (cle: string | undefined) => string;
    /** `mes-app.js` — le libellé de l'origine d'une carence. */
    mesOrigine?: (code: string) => string;
    /** `mes-etats.js` — les icônes de l'historique et des exports. */
    MES_ICONES_ETAT?: Record<string, string>;
    /** `mes-traitement.js` — le nom d'une étape du traitement. */
    mesNomEtape?: (cle: string) => string;
    /**
     * `mes-app.js` — les droits du compte sur le module, le chemin sûr d'une
     * pièce, le libellé d'un type de mesure. Quatre `const`, posés sur `window`
     * pour l'étape du suivi (n° 5.f.120).
     */
    mesPeutEcrire?: () => boolean;
    mesPeutDecider?: () => boolean;
    _mesChemin?: (v: unknown) => string;
    mesLibelleType?: (code: string | undefined) => string;
    /** `mes-app.js` — les statuts du suivi d'une mesure, leurs libellés et leurs aides. */
    MES_SUIVI?: Record<string, unknown>;
    mesStatutSuivi?: (m: unknown) => string;
    mesLibelleSuivi?: (cle: string) => string;
    mesAideSuivi?: (cle: string) => string;
    /** `mes-app.js` — redessiner le volet du dossier ouvert. */
    mesAfficherSlider?: (o?: { anime?: boolean }) => void;
    /** `mes-app.js` — relire `/mesures`, puis redessiner. */
    mesRechargerMesures?: () => Promise<void>;
    /**
     * `mes-traitement.js` — une section lettrée du volet. Un `const`, posé sur
     * `window` pour l'étape du suivi (n° 5.f.120).
     */
    mesSection?: (lettre: string, titre: string, corps: string) => string;
    /** `mes-traitement.js` — le dossier clos, ou classé. */
    mesTraitementClos?: () => boolean;
    /** `mes-traitement.js` — la fenêtre qui confirme un passage d'étape. */
    mesConfirmerEtape?: (o: Record<string, unknown>) => Promise<boolean>;
  }
}

export {};
