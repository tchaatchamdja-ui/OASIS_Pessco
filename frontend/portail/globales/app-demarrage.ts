// OASIS — Le démarrage du portail, publié en globales (ADR-003, 5.c).
//
// Sas, construit vers `public/app/app-demarrage.js`, sous le nom que la page
// portait déjà.
//
// ── La surface, mesurée ──
//
// Trois noms étaient lus hors de ce fichier, et un quatrième par la page :
//
// | Nom | Lu par |
// |---|---|
// | `navigate` | `app.js`, et l'hôte des modules (retour au portail) |
// | `toggleSidebar` | l'`onclick` du bouton de la page |
// | `onLangChange` | le sas des libellés, après chaque bascule |
// | `VIEWS` | posé dans l'état partagé, non ici |
//
// `initIcons`, `loadMe` et `refreshNotifications` étaient aussi sur `window` —
// une `function` du premier niveau s'y pose — **sans lecteur**. Ils y restent
// parce qu'ils y étaient, sous leurs anciens noms : retirer un nom de la surface
// est un changement, qui se fera en le disant.
import {
  basculerBarre, brancherGestes, chargerMoi, demarrer, langueChangee,
  naviguer, poserIcones, poserVuesDeBase, rafraichirNotifications,
} from '../demarrage';

window.navigate = naviguer;
window.toggleSidebar = basculerBarre;

// La bascule de langue redessine la vue courante. **Déclaré par ce sas**, qui le
// pose : il l'était dans le sas des libellés, qui ne fait que l'appeler.
window.onLangChange = langueChangee;

// Les trois noms sans lecteur, conservés tels quels.
window.initIcons = poserIcones;
window.loadMe = chargerMoi;
window.refreshNotifications = rafraichirNotifications;

poserVuesDeBase();
brancherGestes();

// Le démarrage. Sans session, l'appel ramène déjà la fenêtre à la connexion et
// interrompt la suite : le rejet qui s'ensuit est attendu et n'a pas à s'afficher
// en console. Tout autre échec, lui, doit se voir.
demarrer().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  if (message !== 'unauthenticated') console.error(e);
});

export { naviguer };
