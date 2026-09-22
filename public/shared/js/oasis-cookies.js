/* OASIS — Bandeau des témoins de connexion.
 *
 * Ce qu'OASIS dépose tient en deux choses : un témoin de session, strictement
 * nécessaire, et des préférences d'affichage rangées dans le navigateur. Rien
 * qui trace, rien qui sorte du dispositif. Le bandeau l'annonce à la première
 * visite ; il informe, il ne quémande pas un consentement — un témoin
 * nécessaire ne se refuse pas, il se documente.
 *
 * Le fait de l'avoir lu se range là où vont les préférences : dans le
 * navigateur, sur cet appareil. Effacer les données du navigateur le fait
 * donc réapparaître, ce qui est la bonne conduite.
 */
(function () {
    const CLE = 'oasis_cookies_vu';
    const PAGE = '/cookies.html';

    // Le bandeau ne s'affiche pas sur la page qui l'explique : elle dit déjà
    // tout ce qu'il annonce.
    const surLaPage = () => window.location.pathname === PAGE;

    const lu = () => {
        try { return localStorage.getItem(CLE) === '1'; } catch (e) { return true; }
    };
    const marquerLu = () => {
        try { localStorage.setItem(CLE, '1'); } catch (e) { /* navigation privée */ }
    };

    // Les libellés viennent de la table du portail quand elle est chargée ;
    // à défaut, le français, pour qu'un bandeau muet ne s'affiche jamais.
    const dire = (cle, secours) => (typeof t === 'function' ? t(cle) : secours) || secours;

    function afficher() {
        if (document.getElementById('oasisCookies')) return;
        const boite = document.createElement('div');
        boite.className = 'oasis-cookies';
        boite.id = 'oasisCookies';
        boite.setAttribute('role', 'note');
        boite.innerHTML = `
            <div class="oasis-cookies-texte">
                <span data-i18n="cookies_bandeau">${dire('cookies_bandeau', '')}</span>
                <a href="${PAGE}" data-i18n="cookies_en_savoir">${dire('cookies_en_savoir', 'En savoir plus')}</a>
            </div>
            <div class="oasis-cookies-actions">
                <button type="button" id="oasisCookiesOk"
                        data-i18n="cookies_compris">${dire('cookies_compris', 'J’ai compris')}</button>
            </div>`;
        document.body.appendChild(boite);
        document.getElementById('oasisCookiesOk').addEventListener('click', () => {
            marquerLu();
            boite.remove();
        });
    }

    function demarrer() {
        if (surLaPage() || lu()) return;
        afficher();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', demarrer);
    } else {
        demarrer();
    }

    // Effacement des préférences, appelé par la page des témoins : tout ce que
    // l'application a rangé dans ce navigateur part, y compris la marque de
    // lecture du bandeau.
    window.oasisEffacerPreferences = function oasisEffacerPreferences() {
        const partent = [];
        try {
            for (let i = 0; i < localStorage.length; i += 1) {
                const cle = localStorage.key(i);
                if (/^(pr_|ramp_|exec_|oasis_)/.test(cle)) partent.push(cle);
            }
            partent.forEach((cle) => localStorage.removeItem(cle));
        } catch (e) { /* stockage indisponible : rien à effacer */ }
        return partent.length;
    };
}());
