// OASIS — L'état partagé du portail, posé en globales (ADR-003, 5.c).
//
// Sas, construit vers `public/app/etat.js`, et **chargé avant `app.js`** : les
// trois fichiers du portail restés en JavaScript trouvent les sept noms déjà
// posés, et leurs affectations nues — `ME = …`, `CURRENT_VIEW = v` — atteignent
// la propriété de `window` au lieu de déclarer une globale lexicale.
//
// C'est la seule chose que ce fichier fait, et la raison est dans `../etat.ts` :
// tant qu'un `let` du premier niveau tient cet état, aucun fichier du portail ne
// peut être converti seul.
//
// ── Ce qui doit rester vrai, et qu'un garde-fou vérifie ──
//
// Aucun fichier du portail ne doit **redéclarer** l'un de ces sept noms. Un
// `let ME` réintroduit dans `app.js` recréerait une globale lexicale qui
// masquerait la propriété de `window` : les fichiers en JavaScript écriraient
// dans l'ombre, et un module lirait un état figé à sa valeur initiale — sans
// erreur, sans trace. C'est le mode de défaillance le plus coûteux de ce dépôt,
// et c'est pourquoi la suite « taille » le refuse.
import { initialiser } from '../etat';

initialiser();
