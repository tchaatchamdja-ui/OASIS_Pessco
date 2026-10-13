// OASIS — Le cycle de rendu de la configuration, posé en globales (5.d.6).
//
// Trois noms. `cfgNavigate` et `toggleCfgSidebar` sont appelés par les `onclick`
// de la barre latérale que ce module écrit ; `renderConfig` est appelée **à
// travers `window`** par huit fichiers du portail — la plus grosse des dettes
// nommées à l'ADR, et celle qui rend sa publication obligatoire.
//
// `CFG_TABS` n'est pas publié : c'était un `const` du premier niveau
// d'`app-config.js`, donc **absent de `window`**. Le poser y serait *ajouter* à
// la surface.
import { CFG_TABS, cfgNavigate, renderConfig, toggleCfgSidebar } from '../configuration';

window.cfgNavigate = cfgNavigate;
window.toggleCfgSidebar = toggleCfgSidebar;
window.renderConfig = renderConfig;

export { CFG_TABS };
