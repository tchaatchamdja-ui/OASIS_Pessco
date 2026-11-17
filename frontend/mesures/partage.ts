// OASIS — « Mesures d'Application » (CARE) : ce que les paquets de CARE
// partagent, lu sur la page et non importé.
//
// Chaque sas de CARE est un **paquet séparé**, chargé à la position du fichier
// qu'il remplace. Un paquet qui importerait `traductions.ts` emporterait sa
// propre copie des trois volets — 88 Ko de plus par paquet —, et un paquet qui
// importerait un état en fabriquerait un second, distinct de celui que la page
// partage : la leçon de PLAN (ADR-003, n° 5.f.104).
//
// Seul le sas `mes-i18n` importe donc les libellés, et les publie. Les autres
// modules lisent ici, sur `window`, au moment de l'appel — comme les fichiers
// en JavaScript les lisaient par leur nom (n° 5.f.117).

/** L'état de la page — celui que `mes-app.js` a posé. */
export function etat(): EtatCare {
  const e = window.MES_STATE;
  if (!e) throw new Error('CARE : l’état de la page manque — `mes-app.js` n’est pas chargé.');
  return e;
}

/** Un libellé de CARE, par la fonction que la page porte. */
export function mt(cle: string, ...valeurs: unknown[]): string {
  return window.mt(cle, ...valeurs);
}

/**
 * Un nom qu'un autre script de la page publie — déclaré optionnel —, exigé au
 * moment de l'appel. L'ancien code le lisait par son nom nu, et levait
 * `ReferenceError` s'il manquait ; celui-ci lève une erreur qui dit lequel.
 */
export function requis<K extends keyof Window>(nom: K): NonNullable<Window[K]> {
  const v = window[nom];
  if (v === undefined || v === null) {
    throw new Error(`CARE : « ${String(nom)} » manque — le fichier qui le définit n’est pas chargé.`);
  }
  return v as NonNullable<Window[K]>;
}
