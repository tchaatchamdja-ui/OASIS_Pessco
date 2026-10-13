// OASIS — Le démarrage du portail, publié en globales (ADR-003, 5.c).
//
// Sas, construit vers `public/app/app-demarrage.js`, sous le nom que la page
// portait déjà.
//
// ── La surface, mesurée — et ce qui en est retiré le 13 octobre 2026 ──
//
// | Nom | Lu par |
// |---|---|
// | `navigate` | `accueil.ts` et `modules-hote.ts`, à travers `window` |
// | `toggleSidebar` | l'`onclick` du bouton de la page (`index.html`) |
// | `onLangChange` | `applyLang`, dans le sas des libellés — à travers `window` |
// | `loadMe` | `parametres.ts` et `profil.ts`, à travers `window` |
// | `refreshNotifications` | `organigramme.ts`, à travers `window` |
// | `VIEWS` | posé dans l'état partagé, non ici |
//
// Les quatre lectures « à travers `window` » sont des **dettes** nommées à
// l'ADR, non des interfaces : ces fichiers pourraient importer ce qu'ils
// appellent. Tant qu'ils ne le font pas, la publication est obligatoire — et
// c'est pourquoi le relevé de surface distingue cette sorte de lecteur au lieu
// de déclarer ces noms morts (il l'a fait, et dix-sept écrans en seraient
// restés inertes au clic).
//
// `initIcons` est **déposé** : il était sur `window` parce qu'une `function` du
// premier niveau s'y pose, et il n'a jamais eu de lecteur.
import {
  basculerBarre, brancherGestes, chargerMoi, demarrer, langueChangee,
  naviguer, poserVuesDeBase, rafraichirNotifications,
} from '../demarrage';

window.navigate = naviguer;
window.toggleSidebar = basculerBarre;

// La bascule de langue redessine la vue courante. **Déclaré par ce sas**, qui le
// pose : il l'était dans le sas des libellés, qui ne fait que l'appeler.
window.onLangChange = langueChangee;

// Les deux noms que le portail se relit sur `window`.
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
