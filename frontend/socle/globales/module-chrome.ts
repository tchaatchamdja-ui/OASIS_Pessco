// OASIS — Le chrome des modules, publié en globales (ADR-003, 5.b).
//
// Sas de cohabitation : quatre noms, et les deux gestes de publication —
// l'injection au chargement puis son observation continue, le shell du module
// étant re-rendu à chaque navigation.
//
// Ces deux gestes sont **ici** et non dans le module : un écran en React qui
// importerait `chrome.ts` voudrait décider lui-même quand injecter et quand
// cesser d'observer.
import {
  backToPortal, goSuper, injectChrome, moduleActions, moduleMention, observer,
} from '../chrome';
import type { ActionBarre } from '../chrome';

declare global {
  interface Window {
    oasisBackToPortal: () => void;
    oasisGoSuper: (key: string) => void;
    oasisModuleActions: (liste?: readonly ActionBarre[]) => void;
    oasisModuleMention: (texte?: string) => void;
  }
}

window.oasisBackToPortal = backToPortal;
window.oasisGoSuper = goSuper;
window.oasisModuleActions = moduleActions;
window.oasisModuleMention = moduleMention;

document.addEventListener('DOMContentLoaded', () => {
  injectChrome();
  observer();
});
