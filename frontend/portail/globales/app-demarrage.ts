// OASIS — Le démarrage du portail, publié en globales (ADR-003, 5.c).
//
// Sas, construit vers `public/app/app-demarrage.js`, sous le nom que la page
// portait déjà.
//
// ── La surface, mesurée — et ce qui en est retiré le 13 octobre 2026 ──
//
// | Nom | Lu par |
// |---|---|
// | `toggleSidebar` | l'`onclick` du bouton de la page (`index.html`) |
// | `onLangChange` | `applyLang`, dans le sas des libellés — voir plus bas |
// | `refreshNotifications` | **une couture d'essai**, déclarée sur sa ligne |
// | `VIEWS` | posé dans l'état partagé, non ici |
//
// `navigate` et `loadMe` étaient lus à travers `window` par `accueil.ts`,
// `modules-hote.ts`, `parametres.ts` et `profil.ts` : des **dettes**, non des
// interfaces. Les quatre fichiers les importent depuis le 14 octobre 2026
// (5.e.9), et les publications partent avec les dettes.
//
// `initIcons` est **déposé** (5.e.5) : il était sur `window` parce qu'une
// `function` du premier niveau s'y pose, et il n'a jamais eu de lecteur.
import {
  basculerBarre, brancherGestes, demarrer, langueChangee, naviguer,
  poserVuesDeBase, rafraichirNotifications,
} from '../demarrage';

window.toggleSidebar = basculerBarre;

// La bascule de langue redessine la vue courante. **Déclaré par ce sas**, qui le
// pose : il l'était dans le sas des libellés, qui ne fait que l'appeler.
window.onLangChange = langueChangee;

// ── La seule couture d'essai de la surface du portail ──
//
// La pastille des notifications ne se mesure pas par son geste : `notifBell`
// rafraîchit **puis masque** la pastille, si bien que le nombre qu'on veut lire
// n'est observable à aucun instant par le clic. La suite « parcours » appelle
// donc la fonction, et il lui faut une globale — un contrôle dans un navigateur
// n'atteint pas autrement une fonction empaquetée.
//
// La déclaration est sur la ligne qui suit, à côté de ce qu'elle justifie : une
// liste de dispenses à part aurait pourri, comme trois dispenses de gestes non
// couverts l'avaient fait avant d'être démasquées.
// couture-essai : la pastille des notifications ne se mesure pas par son geste
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
