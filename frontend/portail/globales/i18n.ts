// OASIS — Les libellés du portail, publiés en globales (ADR-003, 5.c).
//
// Sas de cohabitation. Sept fichiers du portail sont encore en JavaScript et
// lisent ces noms comme des globales ; ce sas les leur pose, depuis la source
// typée voisine. Il se construit vers `public/app/i18n.js`, sous le nom que les
// trois pages portaient déjà, le répertoire changeant seul — comme
// `shared/js` est devenu `shared/app`.
//
// ── La surface, mesurée et non supposée ──
//
// Relevée dans un navigateur sur une page vierge servie par l'application, les
// deux fichiers chargés seuls. Partir de `index.html` aurait donné un `window`
// déjà peuplé par tout le portail : c'est l'erreur qui a faussé deux fois la
// mesure du socle.
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `t` | **oui** — déclaré en `function` | 6 fichiers, et `oasis-cookies.js` |
// | `applyLang` | **oui** | 3 fichiers, et 3 `onclick` de la page |
// | `applyTheme` | **oui** | 1 fichier, et 3 `onclick` de la page |
// | `CURRENT_LANG` | **non** — déclaré en `let` | `app.js`, `app-config.js`, en **identifiant nu** |
//
// ── `CURRENT_LANG` est tout le sujet de ce fichier ──
//
// Il était un `let` au premier niveau d'un script classique : une liaison du
// **périmètre lexical global**, que l'on atteint par son nom et qui n'est posée
// nulle part sur `window`. Deux fichiers le lisent ainsi.
//
// Converti en module, ce `let` devient local au module : les deux lectures nues
// lèveraient `CURRENT_LANG is not defined`, et l'écran s'arrêterait net. C'est
// exactement ce qui est arrivé à `window.dtPriv` sur l'écran des droits, et c'est
// la raison pour laquelle la surface se mesure avant de convertir.
//
// Il est donc **posé sur `window`**, où une lecture nue le retrouve — une
// propriété de `window` est lisible par son seul nom. Et il doit être **tenu à
// jour** : `applyLang` le réassignait, et deux fichiers le relisent après. Un sas
// qui le poserait une fois au chargement rendrait la langue d'avant la bascule,
// silencieusement.
import { langueRetenue, poserLangue, t, tSouple } from '../traductions';
import { themeEnregistre } from '../../socle/theme';
import { appliquerPalette } from '../theme';

declare global {
  interface Window {
    /**
     * Les libellés du portail. Clé lue à l'exécution : la forme tolérante.
     *
     * **Optionnelle, et déclarée ici seulement.** Trois fichiers du socle la
     * lisaient et la déclaraient chacun pour soi, faute de définisseur ; ce sas
     * en est un, et la règle de 5.b veut que le module qui définit un nom soit
     * le seul à le déclarer.
     *
     * Elle reste optionnelle parce que c'est la vérité : **seules les trois
     * pages du portail chargent ce sas**. Les six écrans de module ne l'ont pas,
     * et `oasis-cookies` y retombe sur ses libellés français — ce que son
     * `typeof window.t === 'function'` dit déjà.
     */
    t?: (cle: string, ...args: unknown[]) => string;
    /** Change la langue, retraduit le balisage marqué. */
    applyLang: (lang: string) => void;
    /** Applique une palette et la retient. */
    applyTheme: (theme: string) => void;
    /**
     * La langue retenue. **Posée sur `window` alors qu'elle ne l'était pas** :
     * `let CURRENT_LANG` était une globale lexicale, et un module ne peut pas en
     * créer. Deux fichiers la lisent en identifiant nu, ce qu'une propriété de
     * `window` satisfait.
     *
     * Optionnelle, et déclarée ici seulement : `dates.ts` et `toast.ts` la
     * déclaraient chacun, faute de définisseur. Les six écrans de module ne la
     * posent pas, et le socle y retombe sur `localStorage` — c'est pourquoi le
     * relevé de surface la liste « optionnelle absente, déclarée telle » sur
     * leurs pages.
     */
    CURRENT_LANG?: string;
    // `onLangChange` est déclaré par son **définisseur**, le sas du démarrage
    // (`globales/app-demarrage.ts`). Il l'était ici, faute d'en avoir un : le
    // portail était du JavaScript sans types. Ce sas ne fait que l'appeler.
  }
}

// La forme tolérante est celle que publie le sas : les appelants en JavaScript
// passent des clés venues du balisage, et une clé absente ne doit pas lever.
window.t = (cle, ...args) => tSouple(cle, ...args);

window.applyLang = (lang) => {
  const retenue = poserLangue(lang);
  // Tenu à jour **ici**, après chaque bascule. C'est la ligne qui remplace la
  // réassignation du `let`, et sans elle deux fichiers liraient la langue
  // d'avant sans que rien ne le dise.
  window.CURRENT_LANG = retenue;
  if (typeof window.onLangChange === 'function') window.onLangChange();
};

// ── Le thème ──
//
// La liste des palettes et la conversion d'une clé ancienne sont tenues par le
// socle, qui est désormais du TypeScript : on l'importe au lieu de lire les
// globales que son sas publie. Deux affirmations de moins, et le même code.
//
// Les trois gestes vivent dans `../theme.ts`, que la page de connexion importe
// aussi : un fichier typé n'a pas à passer par `window` pour en atteindre un
// autre.
window.applyTheme = (demande) => { appliquerPalette(demande); };

// L'ordre du fichier d'origine, conservé : la langue est posée avant que
// quiconque puisse la lire, et la palette appliquée dès le chargement.
window.CURRENT_LANG = langueRetenue();
window.applyTheme(themeEnregistre());

// `t` est exporté pour que le garde-fou de surface puisse le citer ; rien ne
// l'importe. Sans cet export, `verbatimModuleSyntax` ne verrait qu'un fichier
// d'effets de bord — ce qu'il est, et c'est bien ainsi.
export { t };
