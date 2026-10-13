// OASIS — L'hôte des modules, publié en globales (ADR-003, 5.c ; dépose du pont
// 5.e.5).
//
// ── Sept noms publiés, un seul qui reste ──
//
// `moduleHostRegisterViews` est appelé par `accueil.ts` à travers `window` : une
// dette nommée à l'ADR, et la publication qu'elle impose.
//
// Les six autres sont déposés le 13 octobre 2026 :
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

window.moduleHostRegisterViews = enregistrerVues;

brancherMessages();

// L'ordre du fichier d'origine : les vues sont enregistrées dès le chargement, et
// le démarrage le refait une fois la session ouverte — le registre n'est lisible
// qu'à ce moment-là.
void enregistrerVues();

export { enregistrerVues };
