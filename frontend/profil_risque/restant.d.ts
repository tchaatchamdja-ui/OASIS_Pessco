// OASIS — « Profils de Risque » (PR) : ce que les fichiers restés en
// JavaScript définissent, et que les fichiers convertis lisent.
//
// La frontière de la cohabitation, écrite à un seul endroit, comme pour PLAN
// et CARE (ADR-003, n° 5.f.102, 5.f.117). Le TypeScript ne peut pas voir ces
// noms — il n'y a rien à importer —, il les **déclare**.
//
// Chaque ligne part avec la conversion du fichier qui définit le nom : alors
// c'est lui, et lui seul, qui le déclarera — la règle de 5.b.
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
  interface EtatShellModule {
    instances?: EtatInstancePr;
  }

  /**
   * `pr-shell.js` — le préfixe de l'API du module. Un `const` de premier
   * niveau : une globale **lexicale**, que l'on atteint par son nom et qui
   * n'est pas sur `window`.
   */
  const MODULE_API: string;
}

export {};
