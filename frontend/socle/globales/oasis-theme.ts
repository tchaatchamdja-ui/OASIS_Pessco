// OASIS — Les palettes, publiées en globales (ADR-003, 5.b).
//
// Ce fichier est un **sas de cohabitation**, et il n'a pas d'autre raison
// d'être. Huit écrans sont encore en JavaScript et lisent le socle comme des
// globales ; ce sas les leur pose, à partir de la source typée voisine.
//
// Il se construit vers `public/shared/app/oasis-theme.js`, sous le nom que les
// balises `<script>` portaient déjà. Le répertoire change et dit la vérité :
// `shared/js/` est ce qui est encore écrit en JavaScript, `shared/app/` ce qui
// est construit. Le jour où `shared/js/` est vide, il disparaît — et ce fichier
// avec lui.
//
// ── Les quatre noms ci-dessous sont un contrat ──
//
// Huit écrans les lisent, et aucun ne le déclare. Les retirer, les renommer,
// changer leur forme, c'est les casser **en silence**. C'est pourquoi la
// surface du socle est relevée dans un navigateur et figée dans
// `tests/smoke/surface-socle.json` : la suite `frontend` compare, et refuse.
import { THEMES, nomTheme, themeEnregistre, themeNormalise } from '../theme';

declare global {
  interface Window {
    OASIS_THEMES: readonly string[];
    oasisThemeNormalise: (cle: string | null) => string;
    oasisThemeEnregistre: () => string;
    oasisNomTheme: (cle: string) => string;
  }
}

window.OASIS_THEMES = THEMES;
window.oasisThemeNormalise = themeNormalise;
window.oasisThemeEnregistre = themeEnregistre;
window.oasisNomTheme = nomTheme;

// La conversion est faite dès le chargement : les lecteurs qui suivent trouvent
// une préférence déjà à jour. `i18n.js` en est un, et un garde-fou de forme
// vérifie qu'aucune page ne le charge avant celui-ci.
themeEnregistre();
