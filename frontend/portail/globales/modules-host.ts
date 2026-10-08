// OASIS — L'hôte des modules, publié en globales (ADR-003, 5.c).
//
// Sas, construit vers `public/app/modules-host.js`, sous le nom que la page
// portait déjà.
//
// ── La surface, et pourquoi elle comprend trois noms que personne ne lit ──
//
// Mesuré : seuls **deux** des sept noms sont lus hors de ce fichier —
// `planSetModuleChrome` par `app-demarrage.js`, et `moduleHostRegisterViews` par
// `app-demarrage.js` et `app.js`. `planBackToPortal` est appelé par le message
// d'un module, non par son nom.
//
// Les trois derniers — `moduleHostLoadRegistry`, `moduleHostRender`,
// `moduleHostChrome` — étaient sur `window` **sans que personne ne les lise** :
// une `function` au premier niveau d'un script s'y pose, qu'on le veuille ou
// non. Ils y restent parce qu'ils y étaient : retirer un nom de la surface est un
// changement, et il se fera en le disant, pas en passant. C'est la même conduite
// que pour `_icon` des icônes.
import {
  afficherModule, basculerPleinEcran, brancherMessages, chargerRegistre,
  enregistrerVues, retourAuPortail,
} from '../modules-hote';

// Le nom historique est conservé : `app.js` l'appelle ainsi.
window.planSetModuleChrome = basculerPleinEcran;
window.planBackToPortal = retourAuPortail;
window.moduleHostRegisterViews = enregistrerVues;

window.moduleHostLoadRegistry = chargerRegistre;
window.moduleHostRender = afficherModule;
window.moduleHostChrome = basculerPleinEcran;

brancherMessages();

// L'ordre du fichier d'origine : les vues sont enregistrées dès le chargement, et
// `app-demarrage.js` le refait une fois la session ouverte — le registre n'est
// lisible qu'à ce moment-là.
void enregistrerVues();

export { enregistrerVues };
