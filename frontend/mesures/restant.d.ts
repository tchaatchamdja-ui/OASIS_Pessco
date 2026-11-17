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

  /**
   * L'état de l'écran, tel que les fichiers convertis le lisent. Seuls les champs
   * lus d'ici sont nommés ; les fichiers en JavaScript en écrivent bien d'autres,
   * d'où la signature d'index. La forme se resserrera avec la coquille.
   */
  interface EtatCare {
    lang?: string;
    user?: { role?: string } | null;
    instances?: EtatInstanceCare;
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
  }
}

export {};
