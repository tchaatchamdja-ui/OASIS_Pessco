// OASIS — L'hôte des modules, publié en globales (ADR-003, 5.c ; dépose du pont
// 5.e.5).
//
// ── Sept noms publiés, plus aucun ──
//
// `moduleHostRegisterViews` était le dernier : `accueil.ts` l'appelait à travers
// `window`, et l'importe depuis le 14 octobre 2026 (5.e.9).
//
// Ce fichier ne publie donc plus rien, et il reste : ses deux **effets** sont ce
// qui compte — brancher l'écoute des messages des modules, et enregistrer les
// vues dès le chargement. Un sas n'est pas seulement une publication ; c'est
// aussi la place où l'on décide *quand* un effet se produit, et celle-là est
// hors du module exprès (voir `globales/module-chrome.ts` du socle, même règle).
//
// Les six autres ont été déposés le 13 octobre 2026 :
//
//   · `planSetModuleChrome` et `planBackToPortal` portaient les noms historiques
//     qu'`app.js` appelait. `app.js` n'existe plus, et les écrans de module ne
//     chargent **aucun** fichier du portail : ils lui parlent par `postMessage`,
//     et `brancherMessages()` ci-dessous est ce qui les écoute. Les relevés
//     cherchant `parent.<nom>` et `top.<nom>` dans tout le dépôt n'en trouvent
//     aucun — la voie du message est la seule.
//   · `moduleHostLoadRegistry`, `moduleHostRender` et `moduleHostChrome` étaient
//     sur `window` sans lecteur, une `function` du premier niveau s'y posant
//     d'office.
import {
  brancherMessages, enregistrerVues,
} from '../modules-hote';

brancherMessages();

// L'ordre du fichier d'origine : les vues sont enregistrées dès le chargement, et
// le démarrage le refait une fois la session ouverte — le registre n'est lisible
// qu'à ce moment-là.
void enregistrerVues();

export { enregistrerVues };
