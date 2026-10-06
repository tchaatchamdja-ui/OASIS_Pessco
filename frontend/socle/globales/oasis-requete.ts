// OASIS — Le marquage des requêtes, publié en globales (ADR-003, 5.b).
//
// Sas de cohabitation. Deux gestes, et l'ordre compte : `oasisSessionPerdue` est
// posé **avant** l'enveloppement, parce que le fichier d'origine le posait avant
// son garde de réentrance. Une page qui charge ce fichier deux fois — `execution`
// et `ramp` le font — doit obtenir la fonction dans les deux cas, et l'enveloppe
// une seule fois.
import { marquer, sessionPerdue } from '../requete';

declare global {
  interface Window {
    oasisSessionPerdue: () => void;
  }
}

window.oasisSessionPerdue = sessionPerdue;
marquer();
