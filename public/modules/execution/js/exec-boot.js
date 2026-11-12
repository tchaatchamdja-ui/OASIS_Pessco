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

// ── Le dépôt d'une pièce jointe : une seule fonction, et pourquoi ──
//
// Huit écrans du module versent des fichiers par `POST …/upload`, et chacun
// portait sa copie de l'appel. Les copies avaient divergé sur deux points, et
// les deux ont été mesurés le 11 novembre 2026 :
//
//   1. **le nom de la pièce.** La route nomme ce qu'elle reçoit d'après le champ
//      `nom` du formulaire — « le nom d'origine ne ressort pas : c'est
//      l'intitulé qui nomme la pièce ». Quatre copies ne l'envoyaient pas : la
//      route repliait alors sur `piece-jointe`, et **tout fichier versé depuis
//      la réalisation, la zone « autres documents », les annexes et les preuves
//      d'une constatation s'appelait `piece-jointe.pdf`**. Trois pièces versées,
//      trois fois le même nom — indiscernables dans le rapport, et dans le
//      courriel qui les annonce au prestataire ;
//   2. **le refus.** Hors de ses huit extensions la route répond 400 « Type de
//      fichier non autorisé » — une phrase que le socle traduit déjà en deux
//      langues. Cinq copies lisaient `data.status === 'ok'` sans rien dire
//      sinon : rien ne paraissait dans la liste, et rien n'était dit. Leur
//      `catch` ne s'en mêlait pas, `fetch` ne levant pas sur un 400.
//      *Un refus que l'écran avale est un geste qui ne marche pas sans le dire.*
//
// Deux copies sur huit étaient justes sur les deux points. C'est d'elles que
// celle-ci est tirée.
//
// Elle passe par `api()`, qui relève le refus et le traduit : l'appelant n'a
// plus qu'à le dire, et il doit le dire.
async function execDeposerPiece(fichier, intitule) {
    const fd = new FormData();
    fd.append('file', fichier);
    // L'intitulé nomme la pièce quand l'écran en demande un ; à défaut, le nom
    // du fichier choisi sur le poste.
    fd.append('nom', String(intitule || (fichier && fichier.name) || ''));
    return api(`${EXEC_MODULE_API}/upload`, { method: 'POST', body: fd });
}

// ── Un niveau de portée se nomme par son identifiant, ou par son code ──
//
// Les exigences réglementaires du référentiel nomment leur domaine et leur
// secteur par leur **code** — `OPS`, `OPS-TAC` — ; les écrans, eux, les
// choisissent par leur **identifiant** : une checklist range ses domaines sous
// forme d'ids, et la liste déroulante d'un formulaire porte `value="${s.id}"`.
//
// Trois endroits comparaient les deux chaînes telles quelles, et la comparaison
// ne pouvait **jamais** correspondre :
//
//   1. le sélecteur de dispositions d'un item de checklist : dès qu'une
//      checklist avait une portée, il annonçait « 0 disposition disponible »
//      sur un référentiel qui en porte — mesuré le 12 novembre 2026, et il
//      n'avait jamais rien proposé d'autre ;
//   2. la liste des références réglementaires du formulaire de constatation,
//      **à son ouverture** — le secteur y est pré-rempli depuis l'organisme du
//      dossier, donc toujours renseigné ;
//   3. la même liste à chaque changement de secteur.
//
// L'écran savait déjà que les deux formes circulent : une seule ligne, dans la
// fiche d'une constatation, cherche son domaine par `d.id === … || d.code === …`.
// La règle existait donc, dans un coin, et n'avait jamais été appliquée là où
// elle décide de ce que l'inspecteur voit. *Une règle qui ne vit qu'à un endroit
// garde cet endroit, et rien d'autre.*
//
// Elle est ici, et elle rend les **clés** d'un niveau : identifiants et codes
// mêlés, de sorte que la comparaison tienne quelle que soit la forme écrite de
// part et d'autre. Normaliser le référentiel aurait été l'autre voie — c'est
// une migration de données, et elle casserait l'import d'un classeur où une AAC
// écrit naturellement des codes.
function execClesDePortee(ids, source) {
    const cles = new Set();
    (Array.isArray(ids) ? ids : [ids]).filter(Boolean).forEach((brut) => {
        const cle = String(brut);
        cles.add(cle);
        const x = (source || []).find((s) => String(s.id) === cle || String(s.code) === cle);
        if (x) {
            if (x.id) cles.add(String(x.id));
            if (x.code) cles.add(String(x.code));
        }
    });
    return cles;
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
