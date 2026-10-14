// OASIS — Les instances du dispositif, publiées en globales (ADR-003, 5.c ;
// dépose du pont 5.e.5).
//
// ── Douze noms publiés, quatre qui restent ──
//
// Trois **gestes** restent : `basculerInstance`, `supprimerInstance` et
// `ouvrirInstance`, nommés dans des `onclick` que ce module écrit. C'est la
// famille dont la nécessité ne se voit pas en cherchant des lecteurs : aucun
// fichier ne les appelle, et les retirer casserait l'écran.
//
// `majBandeauInstance` y était : `demarrage.ts` l'appelait à travers `window`, et
// l'importe depuis le 14 octobre 2026 (5.e.9).
//
// ── Huit noms déposés le 13 octobre 2026 ──
//
// `PORTEE_LABELS`, `porteeDe` et `jeSuisRegional` étaient des `const` du premier
// niveau — **lexicaux**, invisibles à un module —, et le sas les posait pour
// `app.js` et `app-config.js`. Les cinq autres — `porteeFieldsHtml`,
// `brancherPortee`, `cfgChargerInstances`, `cfgSectionInstances`,
// `changerInstance` — leur servaient de la même façon. Les deux fichiers sont
// convertis et supprimés ; `utilisateurs.ts` et `configuration.ts` importent ce
// qu'ils en lisent, et `changerInstance` est branchée par `.onchange =` dans le
// code, non par un attribut.
import {
  basculerInstance, majBandeauInstance, ouvrirInstance, supprimerInstance,
} from '../instances';

window.basculerInstance = basculerInstance;
window.supprimerInstance = supprimerInstance;
window.ouvrirInstance = ouvrirInstance;

export { majBandeauInstance };
