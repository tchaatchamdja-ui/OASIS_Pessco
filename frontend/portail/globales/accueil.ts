// OASIS — L'accueil, posé en globales (ADR-003, 5.e.3 ; dépose du pont 5.e.5).
//
// Sas, construit dans le paquet du portail. **Un seul nom** : `setModulesView`,
// appelé par un `onclick` du balisage de `../accueil.ts`.
//
// `renderHome` y était : `demarrage.ts` l'appelait à travers `window`, faute de
// pouvoir importer un fichier qui n'existait pas quand la navigation a été
// écrite. Il l'importe depuis le 14 octobre 2026 (5.e.9), et la publication part
// avec la dette.
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
import { setModulesView } from '../accueil';

window.setModulesView = setModulesView;
