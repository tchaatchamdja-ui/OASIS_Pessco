// OASIS — L'accueil, posé en globales (ADR-003, 5.e.3).
//
// Sas, construit vers `public/app/accueil.js`. **Deux noms** : la bascule de
// présentation, qu'un `onclick` du balisage appelle, et la vue elle-même,
// qu'`app-demarrage` lit parmi les cinq.
//
// `MODULES_VIEW`, `COULEURS_MODULE`, `THEMES_ORDER` et `OASIS_FULLNAME_HTML` ne
// sont **pas** publiés, et pour la même raison : c'étaient des globales
// **lexicales** d'`app.js` — un `const` ou un `let` du premier niveau n'est pas
// sur `window` —, et personne ne les lit hors du module. Les publier serait
// *ajouter* à la surface, ce qu'un sas n'a pas à faire.
//
// Le premier jet de ce fichier publiait `OASIS_FULLNAME_HTML` en croyant le
// rendre à sa place, et le commentaire qui l'accompagnait confondait ce `const`
// avec `OASIS_LOGO_IMG`, qui lui **est** monté sur `window` (voir `etat.ts`,
// 5.c) parce qu'`app-demarrage` le lit. Deux noms voisins, deux situations
// contraires : le critère reste **ce qu'un autre fichier doit atteindre**.
import { renderHome, setModulesView } from '../accueil';

window.setModulesView = setModulesView;
window.renderHome = renderHome;
