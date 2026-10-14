// OASIS — Le cycle de rendu de la configuration, posé en globales (5.d.6).
//
// Deux noms : `cfgNavigate` et `toggleCfgSidebar`, appelés par les `onclick` de
// la barre latérale que ce module écrit.
//
// `renderConfig` y était, et c'était **la plus grosse dette du portail** : huit
// fichiers l'appelaient à travers `window`. Les huit l'importent depuis le
// 14 octobre 2026 (5.e.9) — le cycle que cela crée est réel, assumé, et sûr :
// aucun des deux noms n'est lu à l'initialisation.
//
// `CFG_TABS` n'est pas publié : c'était un `const` du premier niveau
// d'`app-config.js`, donc **absent de `window`**. Le poser y serait *ajouter* à
// la surface.
import { CFG_TABS, cfgNavigate, toggleCfgSidebar } from '../configuration';

window.cfgNavigate = cfgNavigate;
window.toggleCfgSidebar = toggleCfgSidebar;

export { CFG_TABS };
