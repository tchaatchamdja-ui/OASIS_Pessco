// OASIS — Le mode dégradé, publié en globales (ADR-003, 5.b).
//
// Sas de cohabitation, et **le dernier du socle**.
//
// L'enveloppe de `fetch` vient ici **après** celle d'`oasis-requete` : l'ordre est
// porté par les balises des pages, et l'en-tête d'origine applicative est donc
// déjà posé quand on arrive. C'est la seule propriété de ce chantier que les
// fichiers ne portent pas eux-mêmes.
import { API, brancher } from '../hors-ligne';
import type { ApiHorsLigne } from '../hors-ligne';

declare global {
  interface Window {
    oasisHorsLigne: ApiHorsLigne;
  }
}

window.oasisHorsLigne = API;
brancher();
