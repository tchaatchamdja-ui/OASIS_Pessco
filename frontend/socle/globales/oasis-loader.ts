// OASIS — L'attente, publiée en globales (ADR-003, 5.b).
//
// Sas de cohabitation : trois globales, et le branchement au chargement de la
// page. L'observateur de mutations est activé ici, non dans le module — un écran
// en React qui importerait `loader.ts` voudra décider lui-même quand observer et
// quand s'arrêter.
//
// `oasisLoaderPoser` porte le nom de la fonction publiée, non celui de la
// fonction interne (`balayer`) : huit écrans l'appellent par ce nom-là, et le
// renommer en passant serait une migration déguisée en conversion.
import { balayer, loaderHtml, moduleIndisponible, observer } from '../loader';

declare global {
  interface Window {
    oasisLoaderHtml: (legende?: string) => string;
    oasisLoaderPoser: (racine?: ParentNode | null) => void;
    oasisModuleIndisponible: (cause: unknown) => string;
  }
}

window.oasisLoaderHtml = loaderHtml;
window.oasisLoaderPoser = balayer;
window.oasisModuleIndisponible = moduleIndisponible;

document.addEventListener('DOMContentLoaded', () => {
  balayer();
  observer();
});
