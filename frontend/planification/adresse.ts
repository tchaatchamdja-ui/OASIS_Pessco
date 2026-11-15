// OASIS — « Planification de la Surveillance » : la racine de ses routes.
//
// Seule, et sans effet de bord : un paquet qui n'a besoin que de l'adresse —
// `pages/pl-instances.ts` — l'importe sans emporter `etat.ts`, dont
// l'évaluation fabriquerait un **second** état de l'écran, distinct de celui
// que la page partage (ADR-003, n° 5.f.102).

/** La racine des routes du module. */
export const PLAN_MODULE_API = '/api/m/planification';
