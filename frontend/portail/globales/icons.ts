// OASIS — Les icônes du portail, publiées en globales (ADR-003, 5.c).
//
// Sas de cohabitation, construit vers `public/app/icons.js`. Quatre fichiers du
// portail appellent `icon()`, deux `moduleIcon()`.
//
// ── Les trois noms, et la mesure qui les a fixés ──
//
// | Nom | Était-il sur `window` ? | Lu par |
// |---|---|---|
// | `icon` | **oui** — `function` | `app.js`, `app-config.js`, `app-demarrage.js`, `portail-instances.js` |
// | `moduleIcon` | **oui** — `function` | `app.js`, `app-config.js` |
// | `_icon` | **oui**, et lu par **personne** | — |
//
// `_icon` est publié parce qu'il **l'était** : une `function` au premier niveau
// d'un script se pose sur `window`, qu'on le veuille ou non. Le relevé de surface
// le compare à chaque campagne, et retirer un nom qu'aucun fichier ne lit reste
// un changement de surface — on le fera, mais en le disant, pas en passant.
//
// `ICONS` et `MODULE_ICONS` ne sont **pas** publiés : ils étaient des `const`,
// donc absents de `window`, et aucun autre fichier ne les lit. Les publier serait
// *ajouter* à la surface, ce qu'un sas n'a pas à faire.
import { PRIO_COLORS, icon, moduleIcon } from '../icones';

declare global {
  interface Window {
    /** Le dessin d'une icône, à la taille demandée. */
    icon: (nom: string, taille?: number) => string;
    /** L'icône d'un module, par son code. */
    moduleIcon: (code: string, taille?: number) => string;
    /**
     * L'enveloppe SVG. Publiée parce qu'elle l'était, lue par personne.
     * Le souligné disait déjà qu'elle est interne ; le script classique ne
     * pouvait pas l'empêcher d'être globale, un module peut.
     */
    _icon: (chemins: string, taille?: number) => string;
    /**
     * La palette des priorités de la feuille de route (5.d.5).
     *
     * **Posée sur `window` alors qu'elle ne l'était pas** : `const PRIO_COLORS`
     * au premier niveau d'`app.js` est une globale lexicale, et l'écran
     * « Modules », converti en 5.d.5, ne peut pas l'y lire. `app.js` la lit
     * désormais ici — c'est un prêt dans l'autre sens, qui se rendra quand
     * `app.js` sera converti à son tour.
     */
    PRIO_COLORS: Readonly<Record<number, string>>;
  }
}

window.icon = icon;
window.PRIO_COLORS = PRIO_COLORS;
window.moduleIcon = moduleIcon;
window._icon = (chemins, taille) => `<svg width="${taille || 18}" height="${taille || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chemins}</svg>`;

export { icon };
