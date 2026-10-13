// OASIS — Le portail en **un seul paquet** (ADR-003, 5.d.7).
//
// Ce fichier n'ajoute aucun code : il importe les douze sas dans l'ordre où
// `index.html` les chargeait, et c'est tout. Ce qu'il change est l'empaquetage —
// et cet empaquetage était un **défaut de correction**, non un gaspillage.
//
// ── Ce qu'on croyait n'être qu'un poids ──
//
// esbuild construit chaque sas comme un paquet autonome : douze fichiers qui
// portent douze fois `traductions`, `icones`, `schemas`. On l'avait noté comme un
// coût en octets — 835 Ko servis pour 150 de code — et on se promettait de le
// réduire « un jour ».
//
// Ce n'était pas un coût. **Douze copies d'un module, ce sont douze copies de son
// état.** `traductions.ts` tient la langue courante dans un `let` de module :
// chaque paquet avait la sienne. `applyLang('en')` changeait celle du paquet des
// libellés, et **celle des onze autres restait au français**. Même chose pour
// `CFG_OPEN` (les accordéons), `CFG_INSTANCES` (la liste des instances),
// `EXIG_OPEN`, `ORG_VIEW`, `AAC_CFG`.
//
// Le défaut était **latent** : tant que `renderConfig` vivait dans
// `app-config.js`, il appelait les sous-vues par `window`, donc toujours la même
// copie que leurs propres gestes. En convertissant `renderConfig` (5.d.6), il a
// commencé à les importer de la source — sa copie — et le contrôle « la bascule
// de langue redessine le contenu de la vue » est tombé.
//
// C'est le meilleur de ce jalon : *un contrôle écrit pour autre chose a nommé un
// défaut d'architecture que personne ne cherchait*. Et il était déjà là, visible
// sur l'écran « Domaines & Secteurs » — changer de langue n'y traduisait rien
// jusqu'au rechargement de la page.
//
// ── L'ordre, et pourquoi il est celui-là ──
//
// Celui que `index.html` portait, à la lettre. `app-demarrage` **démarre
// l'application** en dernier : il doit rester après les onze autres, et le paquet
// entier se charge après `app.js`, dont il appelle les fonctions de rendu.
//
// Ce qui suit est volontairement sans logique : une ligne par sas, dans l'ordre.
// Un fichier qui décide de l'ordre d'exécution ne doit rien faire d'autre.
import './icons';
// Les quatre aides et le téléphone (5.e.4) : lus par tous les autres.
import './outils';
import './i18n';
// La barre d'écran et les libellés littéraux (5.e.0) : lus par les référentiels
// et leurs voisins, donc placés avant eux.
import './barre';
// L'écran des comptes (5.e.1).
import './utilisateurs';
// L'écran du profil (5.e.2).
import './profil';
// L'accueil et le journal d'audit (5.e.3).
import './accueil';
import './audit';
import './etat';
import './schemas';
import './referentiels';
import './exigences';
import './organigramme';
import './taxinomie';
import './parametres';
import './configuration';
import './portail-instances';
import './modules-host';
// `app-demarrage` en dernier : il appelle `demarrer()`, qui charge la session et
// navigue. Tout ce qu'il lui faut doit être posé avant.
import './app-demarrage';
