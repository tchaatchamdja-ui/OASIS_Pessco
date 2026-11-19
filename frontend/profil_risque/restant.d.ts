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
  DocumentPr, DomainePr, EvaluationPr, PrestatairePr, SecteurPr,
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
  }

  interface EtatShellModule {
    instances?: EtatInstancePr;
    data?: DonneesPr;
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
    /** `pr-parametres.js` — un fichier, encodé en base64. */
    fileToBase64?: (fichier: File) => Promise<string>;
    /** Le fichier choisi pour la bibliothèque, entre le choix et l'envoi. */
    _pendingDocFile?: File | null;
    /** `pr-profils.js` — la page des statistiques, que le tableau de bord porte en pied. */
    renderStatistiques?: () => string;
  }

  /**
   * `pr-shell.js` — le préfixe de l'API du module. Un `const` de premier
   * niveau : une globale **lexicale**, que l'on atteint par son nom et qui
   * n'est pas sur `window`.
   */
  const MODULE_API: string;
  /** `pr-shell.js` — les privilèges qui contribuent. Globale lexicale. */
  const PR_PRIV_CONTRIB: string[];
}

export {};
