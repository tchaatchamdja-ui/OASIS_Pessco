// OASIS — L'accueil, posé en globales (ADR-003, 5.e.3 ; dépose du pont 5.e.5).
//
// Sas, construit dans le paquet du portail. **Deux noms**, et les deux sont
// mesurés lus (`node scripts/relever-surface.js`) :
//
//   · `setModulesView` — appelé par un `onclick` du balisage de `../accueil.ts` ;
//   · `renderHome` — appelé par `demarrage.ts` **à travers `window`**, comme les
//     quatre autres vues. C'est une dette nommée à l'ADR, pas une interface ;
//     tant qu'elle est là, la publication est obligatoire.
//
// `MODULES_VIEW`, `COULEURS_MODULE`, `THEMES_ORDER` et `OASIS_FULLNAME_HTML` ne
// sont **pas** publiés : c'étaient des globales **lexicales** d'`app.js` — un
// `const` du premier niveau n'est pas sur `window` —, et personne ne les lit
// hors du module. Les publier serait *ajouter* à la surface.
//
// Le premier jet de ce fichier publiait `OASIS_FULLNAME_HTML` en croyant le
// rendre à sa place, et le commentaire qui l'accompagnait confondait ce `const`
// avec `OASIS_LOGO_IMG`, qui lui **est** monté sur `window` (voir `etat.ts`,
// 5.c) parce que `demarrage.ts` le lit. Deux noms voisins, deux situations
// contraires : le critère reste **ce qu'un autre fichier doit atteindre**.
import { renderHome, setModulesView } from '../accueil';

window.setModulesView = setModulesView;
window.renderHome = renderHome;
