/* OASIS — Les palettes de l'application.
 *
 * Un seul endroit sait quelles palettes existent, comment elles s'appellent,
 * et ce qu'il advient d'une clé qui a changé de nom. Le portail, la page de
 * connexion et les six modules s'y réfèrent plutôt que de tenir chacun sa
 * liste — trois d'entre elles s'étaient déjà désaccordées.
 *
 * Ce fichier se charge avant tout ce qui lit la préférence : la conversion
 * doit être faite quand le premier lecteur se présente.
 */
(function () {
    const CLE = 'pr_theme';

    const THEMES = ['blue-dark', 'corporate', 'retro-avionics'];

    // Un nom propre ne se traduit pas : ces libellés sont les mêmes dans les
    // trois langues. Le portail tient les siens dans sa table de traduction,
    // pour l'infobulle des pastilles ; ceux-ci servent aux six modules.
    const NOMS = {
        'blue-dark': 'Bleu',
        corporate: 'Corporate',
        'retro-avionics': 'Retro-Avionics Jet',
    };

    // La palette « Retro-Avionics Jet » s'est appelée « grey » tant qu'elle
    // était grise. Les navigateurs des agents portent encore l'ancienne clé :
    // elle se convertit à la lecture, et la préférence est réécrite sous son
    // nouveau nom — une fois, sans que personne ait à y penser.
    const ANCIENS = { grey: 'retro-avionics' };

    const lire = () => {
        try { return localStorage.getItem(CLE); } catch (e) { return null; }
    };
    const ecrire = (v) => {
        try { localStorage.setItem(CLE, v); } catch (e) { /* stockage fermé */ }
    };

    // Ramène une clé à une palette servie : l'ancienne à sa remplaçante, une
    // clé inconnue — palette retirée, stockage abîmé — au thème par défaut.
    function oasisThemeNormalise(cle) {
        const converti = ANCIENS[cle] || cle;
        return THEMES.includes(converti) ? converti : THEMES[0];
    }

    // La préférence enregistrée, convertie si besoin — et réécrite dans la
    // foulée, pour que la conversion ne se refasse pas à chaque page.
    function oasisThemeEnregistre() {
        const brut = lire();
        const theme = oasisThemeNormalise(brut);
        if (brut !== theme) ecrire(theme);
        return theme;
    }

    const oasisNomTheme = (cle) => NOMS[cle] || cle;

    window.OASIS_THEMES = THEMES;
    window.oasisThemeNormalise = oasisThemeNormalise;
    window.oasisThemeEnregistre = oasisThemeEnregistre;
    window.oasisNomTheme = oasisNomTheme;

    // La conversion est faite dès le chargement : les lecteurs qui suivent
    // trouvent une préférence déjà à jour.
    oasisThemeEnregistre();
}());
