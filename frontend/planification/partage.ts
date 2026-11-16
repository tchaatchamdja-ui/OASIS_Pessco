// OASIS — « Planification de la Surveillance » : ce que les paquets de PLAN
// partagent, lu sur la page et non importé.
//
// ── Un état par page, et pourquoi ce fichier existe ──
//
// Chaque sas de PLAN est un **paquet séparé**, chargé à la position du fichier
// qu'il remplace : la cohabitation avec les scripts restés en JavaScript
// l'impose. Un paquet qui **importerait** `etat.ts` ou `traductions.ts`
// emporterait sa propre copie du module — un second `PLAN_STATE`, distinct de
// celui que la page partage. Sa langue resterait « fr » pour toujours, ses
// filtres ne verraient rien, et rien ne le dirait : l'écran passerait en
// anglais, sauf la page convertie.
//
// Seul le sas `pl-i18n` importe donc l'état et les libellés, et les publie.
// Les autres modules les lisent **ici**, sur `window`, au moment de l'appel —
// comme les fichiers en JavaScript les lisaient par leur nom. Un garde-fou le
// tient : aucun autre paquet de PLAN n'atteint `etat.ts` (ADR-003, n° 5.f.104).
import type { EtatPlan } from './etat';

/** L'état de la page — celui que `pl-i18n` a posé. */
export function etat(): EtatPlan {
  const e = window.PLAN_STATE;
  if (!e) throw new Error('PLAN : l’état de la page manque — `pl-i18n` n’est pas chargé.');
  return e;
}

/** Un libellé de PLAN, par la fonction que la page porte. */
export function tp(cle: string, ...args: unknown[]): string {
  return window.tp(cle, ...args);
}

/**
 * Un nom qu'un fichier resté en JavaScript définit (voir `restant.d.ts`), exigé
 * au moment de l'appel. L'ancien code le lisait par son nom nu, et levait
 * `ReferenceError` s'il manquait ; celui-ci lève une erreur qui dit lequel.
 */
export function requis<K extends keyof Window>(nom: K): NonNullable<Window[K]> {
  const v = window[nom];
  if (v === undefined || v === null) {
    throw new Error(`PLAN : « ${String(nom)} » manque — le fichier qui le définit n’est pas chargé.`);
  }
  return v as NonNullable<Window[K]>;
}

/**
 * Une liste des données chargées de l'écran — plans, activités, référentiels.
 * Elles viennent du serveur, sans schéma ici : le type est celui que le module
 * qui les lit en attend, et c'est une affirmation, non une vérification.
 */
export function donnees<T>(nom: string): T[] {
  return (etat().data[nom] || []) as T[];
}
