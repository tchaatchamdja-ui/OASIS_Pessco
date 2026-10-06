# `public/shared/` — socle de présentation

Assets communs à tous les modules OASIS. **Règle : un module ne référence
jamais les assets d'un autre module ; il charge le socle puis les siens.**

| Fichier | Contenu |
|---|---|
| `css/oasis-module.css` | variables et thèmes, mise en page (barre latérale, entête), composants (boutons, formulaires, cartes, tableaux, badges, modales, accordéons, filtres), chrome de module, styles d'impression |
| `js/oasis-utils.js` | `api()`, `escapeHtml()`, `formatDate()`, `showToast()`, `ICONS`, `_pesSearchInput()` |
| `js/module-chrome.js` | super-menus, « Retour au Portail », pont `postMessage` avec le portail |

Ordre de chargement dans un `index.html` de module :

```html
<link rel="stylesheet" href="/shared/css/oasis-module.css">
<link rel="stylesheet" href="/modules/<code>/css/<code>-styles.css">
...
<script src="/shared/app/oasis-utils.js"></script>
<script src="/modules/<code>/js/<code>-app.js"></script>
<script src="/shared/app/module-chrome.js"></script>
```
