/* Module « Exécution de la Surveillance » — pont de compatibilité PESSCO.
   Le code applicatif (exec-app.js) est repris intégralement de PESSCO : il
   attend les utilitaires que fournissait la coquille PESSCO (api, modales et
   toasts « shell », libellés du portail). On les rétablit ici, à l'identique,
   sans toucher au module lui-même.
   Le socle OASIS (/shared/app/oasis-utils.js) n'est pas chargé sur cette page :
   son `api()` ne gère ni FormData ni les réponses non-JSON (PDF, export XLSX)
   dont ce module a besoin.
   ─────────────────────────────────────────────────────────────────────── */

// ── Correspondance des routes transverses PESSCO → socle OASIS ──
// Le module appelle les API générales de PESSCO (utilisateurs, référentiels,
// configuration AAC). OASIS les expose sous d'autres chemins ; la traduction
// se fait ici, ce qui laisse exec-app.js identique à l'original.
const EXEC_ROUTES_SOCLE = {
    '/api/auth/me': '/api/m/execution/moi',
    '/api/users': '/api/m/execution/utilisateurs',
    '/api/aac': '/api/m/execution/aac',
    '/api/domaines': '/api/referentiels/domaines',
    '/api/secteurs': '/api/referentiels/secteurs',
    '/api/sous-activites': '/api/referentiels/sous_activites',
    '/api/prestataires': '/api/referentiels/prestataires',
    '/api/inspecteurs': '/api/referentiels/inspecteurs',
    '/api/types-supervision': '/api/referentiels/types_supervision',
    '/api/modes-supervision': '/api/referentiels/modes_supervision',
    '/api/themes-supervision': '/api/referentiels/themes_supervision',
    '/api/exigences': '/api/referentiels/exigences',
};

// PESSCO déclarait les collections de checklists en CRUD global (/api/exec-*).
// Dans OASIS elles appartiennent au module et vivent sous son préfixe.
const EXEC_PREFIXE_CRUD = '/api/exec-';

function execRoute(path) {
    const [chemin, requete] = String(path).split('?');
    let cible = EXEC_ROUTES_SOCLE[chemin];
    // La table traduit une racine, pas une seule adresse : « /api/prestataires »
    // vaut aussi pour « /api/prestataires/{id} ». Sans cela, l'appel qui porte
    // un identifiant passait sans traduction et se perdait sur une route que le
    // serveur n'expose pas — un 404 muet, là où l'écran attendait un
    // enregistrement.
    if (!cible) {
        const racine = Object.keys(EXEC_ROUTES_SOCLE).find((r) => chemin.startsWith(r + '/'));
        if (racine) cible = EXEC_ROUTES_SOCLE[racine] + chemin.slice(racine.length);
    }
    if (!cible && chemin.startsWith(EXEC_PREFIXE_CRUD)) {
        cible = `/api/m/execution/${chemin.slice('/api/'.length)}`;
    }
    if (!cible) return path;
    return requete ? `${cible}?${requete}` : cible;
}

// ── Appel API (version PESSCO : FormData et réponses binaires supportées) ──
async function api(path, options = {}) {
    path = execRoute(path);
    const headers = { 'X-OASIS-Request': '1', ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, { ...options, headers, credentials: 'same-origin' });
    if (res.status === 401) {
        // Session perdue : le socle ramène la fenêtre entière à la connexion.
        // Le module vit en cadre — s'y rendre lui-même y aurait ouvert la page
        // de connexion, entourée de la coquille du portail.
        oasisSessionPerdue();
        throw new Error(oasisMessageErreur({ error: 'unauthenticated' }, res.status));
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(oasisMessageErreur(err, res.status));
    }
    if ((res.headers.get('content-type') || '').includes('application/json')) return res.json();
    return res;
}

// ── Modale et toasts de la coquille ──
const SHELL_ICONS = {
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

function shellShowModal(title, bodyHtml, footerHtml = '') {
    const existing = document.getElementById('shellModal');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'shellModal';
    div.className = 'shell-modal-overlay';
    div.innerHTML = `<div class="shell-modal">
        <div class="shell-modal-header"><h3>${title}</h3><button class="shell-btn-icon" onclick="shellCloseModal()" aria-label="${te("close")}" title="${te("close")}">${SHELL_ICONS.close}</button></div>
        <div class="shell-modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="shell-modal-footer">${footerHtml}</div>` : ''}
    </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => { if (e.target === div) shellCloseModal(); });
}

function shellCloseModal() {
    const modal = document.getElementById('shellModal');
    if (modal) modal.remove();
}

function shellShowToast(message, type = 'success') {
    if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
    return window.oasisToast(message, type);
}

// ── Une seconde table de libellés, et pourquoi il n'y en a plus ──
//
// Le portage PESSCO a laissé ici une table de quinze libellés, français
// seulement, et la fonction `pt` qui la lisait — **en rendant la clé** pour
// tout ce qu'elle ne connaissait pas. Un seul écran s'en servait, et il lui
// demandait sept clés dont six n'y étaient pas : reprises de PR, dont la table
// les porte. L'écran affichait donc « password », « confirm_admin_password »,
// et un mot de passe annoncé par « password_gen ». Personne ne l'avait vu
// parce que rien n'exerçait cet écran.
//
// La table du module (`EXEC_TR`, trois volets, gardée par la suite
// « traductions ») porte désormais ces libellés, et les sept appels passent
// par `te`. La seconde table et sa fonction sont retirées : deux vocabulaires
// pour un écran, dont l'un est muet sur ses manques, ne se tiennent pas
// d'accord — et c'est **ce silence**, non l'oubli, qui a produit le défaut
// (ADR-003 n° 5.f.76). Un garde-fou de « taille » refuse qu'une telle table
// revienne.
