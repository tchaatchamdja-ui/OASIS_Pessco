// OASIS — Les instances du dispositif, publiées en globales (ADR-003, 5.c).
//
// Sas, construit vers `public/app/portail-instances.js`, sous le nom que la page
// portait déjà.
//
// ── La surface, et pourquoi elle est si large ──
//
// Douze noms, et ils se partagent en trois familles :
//
// | Famille | Noms | Lus par |
// |---|---|---|
// | Trois **globales lexicales** | `PORTEE_LABELS`, `porteeDe`, `jeSuisRegional` | `app.js`, `app-config.js` |
// | Cinq fonctions du formulaire et de la configuration | `porteeFieldsHtml`, `brancherPortee`, `majBandeauInstance`, `cfgChargerInstances`, `cfgSectionInstances` | `app.js`, `app-config.js`, le démarrage |
// | Quatre **gestes** | `basculerInstance`, `supprimerInstance`, `ouvrirInstance`, `changerInstance` | les `onclick` du balisage que ce fichier produit |
//
// Les trois premières étaient des `const` : **lexicales**, invisibles à un
// module. C'est l'inverse du blocage habituel — ici ce fichier les *définit*, et
// ce sont `app.js` et `app-config.js`, restés en JavaScript, qui les lisent. Le
// sas les leur pose, et ils n'ont rien changé.
//
// Les quatre gestes **doivent** être sur `window` : ils sont nommés dans des
// attributs `onclick` que ce fichier écrit lui-même. Aucun fichier ne les lit, et
// pourtant les retirer casserait l'écran — c'est la seule famille de la surface
// dont la nécessité ne se voit pas en cherchant des lecteurs.
import {
  PORTEE_LABELS, basculerInstance, brancherPortee, cfgChargerInstances, cfgSectionInstances,
  changerInstance, jeSuisRegional, majBandeauInstance, ouvrirInstance, porteeDe,
  porteeFieldsHtml, supprimerInstance,
} from '../instances';

window.PORTEE_LABELS = PORTEE_LABELS;
window.porteeDe = porteeDe;
window.jeSuisRegional = jeSuisRegional;

window.porteeFieldsHtml = porteeFieldsHtml;
window.brancherPortee = brancherPortee;
window.majBandeauInstance = majBandeauInstance;
window.cfgChargerInstances = cfgChargerInstances;
window.cfgSectionInstances = cfgSectionInstances;

window.basculerInstance = basculerInstance;
window.supprimerInstance = supprimerInstance;
window.ouvrirInstance = ouvrirInstance;
window.changerInstance = changerInstance;

export { majBandeauInstance };
