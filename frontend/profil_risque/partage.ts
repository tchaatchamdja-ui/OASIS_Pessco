// OASIS — « Profils de Risque » (PR) : ce que les paquets de PR partagent, lu
// sur la page et non importé (ADR-003, 5.c — n° 5.f.129).
//
// Chaque sas de PR est un **paquet séparé**, chargé à la position du fichier
// qu'il remplace. Un paquet qui importerait `traductions.ts` emporterait sa
// propre copie des trois volets — la leçon de PLAN et de CARE (n° 5.f.104,
// 5.f.117). Seul le sas `pr-utils` importe les libellés, et les publie ; les
// autres les lisent ici, sur `window`, au moment de l'appel — comme les
// fichiers en JavaScript les lisaient par leur nom.

/** Un libellé de PR, par la fonction que la page porte (`pr-utils`). */
export function t(cle: string, ...valeurs: unknown[]): string {
  return requis('t')(cle, ...valeurs);
}

/**
 * Un nom qu'un autre script de la page publie — déclaré optionnel —, exigé au
 * moment de l'appel. L'ancien code le lisait par son nom nu, et levait
 * `ReferenceError` s'il manquait ; celui-ci lève une erreur qui dit lequel.
 */
export function requis<K extends keyof Window>(nom: K): NonNullable<Window[K]> {
  const v = window[nom];
  if (v === undefined || v === null) {
    throw new Error(`PR : « ${String(nom)} » manque — le fichier qui le définit n’est pas chargé.`);
  }
  return v as NonNullable<Window[K]>;
}
