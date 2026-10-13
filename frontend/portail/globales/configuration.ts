// OASIS — Le cycle de rendu de la configuration, posé en globales (5.d.6).
//
// Sas, construit vers `public/app/configuration.js`, et **chargé avant `app.js`**,
// qui appelle `renderConfig()` quand la vue « config » s'ouvre.
//
// Quatre noms. `CFG_TABS` est publié bien que personne ne le lise : c'était un
// `const` du premier niveau d'`app-config.js`, donc **absent de `window`**. Le
// poser y serait *ajouter* à la surface, ce qu'un sas n'a pas à faire — il ne
// l'est donc pas.
import { CFG_TABS, cfgNavigate, renderConfig, toggleCfgSidebar } from '../configuration';

window.cfgNavigate = cfgNavigate;
window.toggleCfgSidebar = toggleCfgSidebar;
window.renderConfig = renderConfig;

export { CFG_TABS };
