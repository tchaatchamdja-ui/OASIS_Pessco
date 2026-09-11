/* OASIS — Module « Exécution de la Surveillance »
 * Paramètres du module.
 *
 * Niveaux de constatation, types de cas et checklists.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  Paramètres M3 : Niveau de constatations + Types de cas
// ══════════════════════════════════════

function execRenderParametres() {
    if (!window._execParamSub) window._execParamSub = 'constatations';
    const sub = window._execParamSub;
    // Compteurs sur chaque onglet (à l'image des onglets de la page Déclenchement)
    const counts = {
        constatations: (EXEC_STATE.data.criticites || []).length + (EXEC_STATE.data.typesCas || []).length,
        checklists: (EXEC_STATE.data.checklists || []).length
    };
    const tabs = `<div class="exec-workflow-tabs">
        <button class="exec-tab ${sub==='constatations'?'active':''}" onclick="window._execParamSub='constatations';execRenderPage();">
            Constatations <span class="exec-tab-badge">${counts.constatations}</span>
        </button>
        <button class="exec-tab ${sub==='checklists'?'active':''}" onclick="window._execParamSub='checklists';execRenderPage();">
            Checklists <span class="exec-tab-badge">${counts.checklists}</span>
        </button>
        <button class="exec-tab ${sub==='delais'?'active':''}" onclick="window._execParamSub='delais';execRenderPage();">
            Délais
        </button>
        <button class="exec-tab ${sub==='autres'?'active':''}" onclick="window._execParamSub='autres';execRenderPage();">
            Autres paramètres
        </button>
    </div>`;
    const compactCss = `<style>
        .exec-params-compact .exec-table { font-size: 0.78rem; }
        .exec-params-compact .exec-table th { font-size: 0.72rem; padding: 0.35rem 0.55rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .exec-params-compact .exec-table td { padding: 0.32rem 0.55rem; }
        .exec-params-compact .card { margin-bottom: 0.75rem; }
        .exec-params-compact .card h3 { font-size: 0.86rem !important; }
    </style>`;
    const body = sub === 'checklists' ? execRenderChecklistsTab()
        : sub === 'delais' ? execRenderDelaisTab()
        : sub === 'autres' ? execRenderAutresParametresTab()
        : execRenderConstatationsTab();
    return `<div class="page-content exec-params-compact">
        ${compactCss}
        <div class="page-header"><h2>${te('parametres')}</h2></div>
        ${tabs}
        ${body}
    </div>`;
}

// ── Paramètre « Équipe d'audit / inspection » ────────────────────────
// Les rôles créés ici alimentent la composition de l'équipe à l'étape
// Réalisation, et les acteurs « équipe » du menu Processus : une seule liste,
// tenue à un seul endroit.
const EXEC_ROLES_EQUIPE_DEFAUT = [
    "Chef d'équipe", "Membre d'équipe", 'Stagiaire',
    "Formation en cours d'emploi", 'Experts ou Autres',
];

// Rôles disponibles : ceux du paramétrage, ou la liste d'origine tant que rien
// n'a été saisi — un module fraîchement installé ne doit pas offrir un choix vide.
function _execRolesEquipe() {
    const liste = (EXEC_STATE.data.rolesEquipe || [])
        .filter(r => r.actif !== 0 && r.actif !== false)
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
        .map(r => r.item || r.libelle || '')
        .filter(Boolean);
    return liste.length ? liste : EXEC_ROLES_EQUIPE_DEFAUT;
}

function execRenderRolesEquipeTab() {
    const roles = (EXEC_STATE.data.rolesEquipe || [])
        .slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const isAdmin = _execIsAdmin();
    const lignes = roles.length ? roles.map(r => `
        <tr>
            <td style="text-align:center;">${r.ordre || ''}</td>
            <td><strong>${_esc(r.item || '')}</strong></td>
            <td>${_esc(r.description || '')}</td>
            <td style="text-align:right;white-space:nowrap;">
                ${isAdmin ? `
                    <button class="btn btn-sm btn-ghost" title="${te('modifier')}" onclick="execOpenRoleEquipeModal('${r.id}')">${EXEC_ICONS.edit}</button>
                    <button class="btn btn-sm btn-ghost" style="color:#ef4444;" title="${te('supprimer')}" onclick="execDeleteRoleEquipe('${r.id}')">${EXEC_ICONS.delete}</button>` : ''}
            </td>
        </tr>`).join('')
        : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('roles_equipe_vide')}</td></tr>`;

    return `
    <div class="card" style="margin-top:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
            <h3 style="margin:0;font-size:0.9rem;">${te('param_equipe')}</h3>
            ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="execOpenRoleEquipeModal()">${EXEC_ICONS.add} ${te('ajouter')}</button>` : ''}
        </div>
        <p style="padding:0.5rem 0.7rem 0;font-size:0.78rem;color:var(--text-muted);margin:0;">${te('roles_equipe_intro')}</p>
        <div style="overflow-x:auto;">
            <table class="exec-table" style="width:100%;">
                <thead><tr>
                    <th style="width:70px;text-align:center;">${te('ordre')}</th>
                    <th>${te('item')}</th>
                    <th>${te('description')}</th>
                    <th style="width:90px;"></th>
                </tr></thead>
                <tbody>${lignes}</tbody>
            </table>
        </div>
    </div>`;
}

window.execOpenRoleEquipeModal = function (id) {
    const r = (EXEC_STATE.data.rolesEquipe || []).find(x => x.id === id) || {};
    const corps = `
    <div class="exec-proc-bloc">
        <label class="form-label" for="req_item">${te('item')}</label>
        <input type="text" class="form-control" id="req_item" value="${_escAttr(r.item || '')}">
        <label class="form-label" for="req_ordre">${te('ordre')}</label>
        <input type="number" class="form-control" id="req_ordre" min="1" value="${_escAttr(r.ordre || ((EXEC_STATE.data.rolesEquipe || []).length + 1))}">
        <label class="form-label" for="req_description">${te('description')}</label>
        <textarea class="form-control" id="req_description" rows="2">${_esc(r.description || '')}</textarea>
        <p class="exec-proc-erreur" id="req_erreur"></p>
    </div>`;
    const pied = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>
        <button class="btn btn-primary" onclick="execSaveRoleEquipe('${id || ''}')">${EXEC_ICONS.check || ''} ${te('save')}</button>`;
    execShowSlider(`${EXEC_ICONS.add || ''} ${id ? te('modifier') : te('ajouter')} — ${te('param_equipe')}`, corps, pied, 'third');
};

window.execSaveRoleEquipe = async function (id) {
    const val = (x) => (document.getElementById(x) || {}).value || '';
    const err = document.getElementById('req_erreur');
    const item = val('req_item').trim();
    if (!item) { err.textContent = te('item_requis'); return; }
    const corps = { item, ordre: parseInt(val('req_ordre'), 10) || 1, description: val('req_description').trim(), actif: 1 };
    try {
        if (id) await api(`${EXEC_MODULE_API}/exec-roles-equipe/${id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await api(`${EXEC_MODULE_API}/exec-roles-equipe`, { method: 'POST', body: JSON.stringify(corps) });
        execCloseSlider();
        await execChargerRolesEquipe();
        _execToast(te('enregistre'), 'success');
        execRenderPage();
    } catch (e) {
        err.textContent = (e && e.message) || te('action_impossible');
    }
};

window.execDeleteRoleEquipe = async function (id) {
    const r = (EXEC_STATE.data.rolesEquipe || []).find(x => x.id === id) || {};
    const ok = await execProcConfirmer({
        titre: te('supprimer'),
        message: te('role_equipe_supprimer_message').replace('{item}', r.item || ''),
        libelle: te('supprimer'),
    });
    if (!ok) return;
    try {
        await api(`${EXEC_MODULE_API}/exec-roles-equipe/${id}`, { method: 'DELETE' });
        await execChargerRolesEquipe();
        _execToast(te('supprime'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

async function execChargerRolesEquipe() {
    try { EXEC_STATE.data.rolesEquipe = await api(`${EXEC_MODULE_API}/exec-roles-equipe`) || []; }
    catch (e) { EXEC_STATE.data.rolesEquipe = []; }
}
window.execChargerRolesEquipe = execChargerRolesEquipe;
window.execRenderRolesEquipeTab = execRenderRolesEquipeTab;
window._execRolesEquipe = _execRolesEquipe;

function execRenderConstatationsTab() {
    const crits = EXEC_STATE.data.criticites || [];
    const tcs   = EXEC_STATE.data.typesCas || [];
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const addBtn = (onclick, label) => isAdmin
        ? `<button class="btn btn-sm btn-primary" onclick="${onclick}" style="display:inline-flex;align-items:center;gap:0.3rem;">
               ${EXEC_ICONS.add} ${label}
           </button>`
        : '';

    // ── Table 1 : Niveau de constatations
    const critRows = crits.length
        ? crits.map(c => `
            <tr>
                <td><strong>${_esc(c.item)}</strong></td>
                <td>${c.alias ? _esc(c.alias) : '<span style="color:var(--text-muted);">—</span>'}</td>
                <td style="text-align:center;">${c.niveau}</td>
                <td style="text-align:center;">${c.delai_cloture} ${te('days') || 'jours'}</td>
                <td style="text-align:right;white-space:nowrap;">
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-ghost" title="${te('edit') || 'Modifier'}" onclick="execOpenCriticiteModal('${c.id}')">${EXEC_ICONS.edit}</button>
                        <button class="btn btn-sm btn-ghost" title="${te('delete') || 'Supprimer'}" onclick="execDeleteCriticite('${c.id}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
                    ` : ''}
                </td>
            </tr>`).join('')
        : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data') || 'Aucune donnée'}</td></tr>`;

    // ── Table 2 : Types de cas
    const tcRows = tcs.length
        ? tcs.map(t => `
            <tr>
                <td><strong>${_esc(t.item)}</strong></td>
                <td>${_esc(t.description || '')}</td>
                <td style="text-align:right;white-space:nowrap;">
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-ghost" title="${te('edit') || 'Modifier'}" onclick="execOpenTypeCasModal('${t.id}')">${EXEC_ICONS.edit}</button>
                        <button class="btn btn-sm btn-ghost" title="${te('delete') || 'Supprimer'}" onclick="execDeleteTypeCas('${t.id}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
                    ` : ''}
                </td>
            </tr>`).join('')
        : `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data') || 'Aucune donnée'}</td></tr>`;

    return `
        <div class="card" style="margin-bottom:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
                <h3 style="margin:0;font-size:0.9rem;">${te('niveau_constatations')}</h3>
                ${addBtn('execOpenCriticiteModal()', 'Ajouter')}
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>${te('item')}</th>
                            <th>Alias</th>
                            <th style="text-align:center;">${te('niveau')}</th>
                            <th style="text-align:center;">${te('delai_cloture')}</th>
                            <th style="text-align:right;width:90px;"></th>
                        </tr>
                    </thead>
                    <tbody>${critRows}</tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
                <h3 style="margin:0;font-size:0.9rem;">${te('types_cas')}</h3>
                ${addBtn('execOpenTypeCasModal()', 'Ajouter')}
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>${te('item')}</th>
                            <th>${te('description') || 'Description'}</th>
                            <th style="text-align:right;width:90px;"></th>
                        </tr>
                    </thead>
                    <tbody>${tcRows}</tbody>
                </table>
            </div>
        </div>`;
}

// ══════════════════════════════════════
//  Paramètres M3 : Checklists
// ══════════════════════════════════════

function _execCl_data() {
    return {
        checklists: EXEC_STATE.data.checklists || [],
        items: EXEC_STATE.data.checklistItems || [],
        statuts: EXEC_STATE.data.checklistStatuts || [],
        sousThemes: EXEC_STATE.data.checklistSousThemes || []
    };
}

// Filtre de recherche de la liste des checklists. Conservé hors du rendu pour
// survivre au re-rendu de la page (thème, langue, retour d'un sous-écran).
let EXEC_CL_RECHERCHE = '';

// Une ligne par checklist. La description passe sous le nom : elle se lit en
// entier au lieu d'être tronquée à 80 caractères dans sa propre colonne, et la
// place ainsi libérée sert à montrer la portée réelle de la checklist.
function _execClLigne(c, D, refs, isAdmin) {
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const itemsCount = D.items.filter(i => i.checklist_id === c.id).length;
    // Portée : on nomme ce qui tient, on compte le reste. Une checklist sans
    // portée s'applique partout — le dire vaut mieux qu'un tiret.
    const puce = (ids, source, classe) => {
        const noms = ids.map(id => {
            const x = source.find(s => s.id === id);
            return x ? (x.code || x.sigle || x.nom || x.libelle || '') : '';
        }).filter(Boolean);
        if (!noms.length) return '';
        const visibles = noms.slice(0, 3).map(n => `<span class="exec-cl-puce ${classe}">${_escAttr(n)}</span>`).join('');
        const reste = noms.length - 3;
        return visibles + (reste > 0
            ? `<span class="exec-cl-puce ${classe}" title="${_escAttr(noms.slice(3).join(', '))}">+${reste}</span>` : '');
    };
    const portee = [
        puce(_parse(c.domaines_ids), refs.domaines, 'dom'),
        puce(_parse(c.secteurs_ids), refs.secteurs, 'sec'),
        puce(_parse(c.sous_activites_ids), refs.sousActivites, 'sa'),
    ].filter(Boolean).join('');

    return `<tr>
        <td><span class="exec-cl-ref">${_esc(c.reference || '—')}</span></td>
        <td>
            <div class="exec-cl-nom">${_esc(c.nom)}</div>
            ${c.description ? `<div class="exec-cl-desc">${_esc(c.description)}</div>` : ''}
        </td>
        <td>${portee || '<span class="exec-cl-partout">Toutes portées</span>'}</td>
        <td style="text-align:center;">
            <span class="exec-cl-compte ${itemsCount ? '' : 'vide'}"
                  title="${itemsCount} item${itemsCount > 1 ? 's' : ''}">${itemsCount}</span>
        </td>
        <td class="exec-etats-actions" style="text-align:right;white-space:nowrap;">
            <button class="btn btn-sm btn-outline btn-icon-only" onclick="execOpenChecklistEditor('${c.id}')"
                    title="Items de la checklist">${EXEC_ICONS.list}</button>
            ${isAdmin ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="execOpenChecklistModal('${c.id}')"
                    title="${_escAttr(te('modifier') || 'Modifier')}">${EXEC_ICONS.edit}</button>
            <button class="btn btn-sm btn-outline btn-icon-only" onclick="execDeleteChecklist('${c.id}')"
                    style="color:#dc2626;border-color:#dc2626;" title="Supprimer">${EXEC_ICONS.delete}</button>` : ''}
        </td>
    </tr>`;
}

function execRenderChecklistsTab() {
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const D = _execCl_data();
    const shared = window.PESSCO?.sharedData || {};
    const refs = {
        domaines: shared.domaines || [],
        secteurs: shared.secteurs || [],
        sousActivites: shared.sousActivites || [],
    };
    const q = _execNorm(EXEC_CL_RECHERCHE);
    const toutes = D.checklists.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const checklists = q
        ? toutes.filter(c => _execNorm(`${c.reference || ''} ${c.nom || ''} ${c.description || ''}`).includes(q))
        : toutes;

    const rowsHtml = checklists.length
        ? checklists.map(c => _execClLigne(c, D, refs, isAdmin)).join('')
        : `<tr><td colspan="5" class="exec-cl-aucune">
             ${q ? `Aucune checklist ne correspond à « ${_esc(EXEC_CL_RECHERCHE)} ».`
                 : 'Aucune checklist enregistrée.'}
           </td></tr>`;

    return `
        <div class="card exec-cl-card">
            <div class="exec-cl-entete">
                <div class="exec-cl-titre">
                    <h3>Checklists</h3>
                    <span class="exec-cl-total">${toutes.length}</span>
                </div>
                <div class="exec-cl-outils">
                    <div class="exec-cl-recherche">
                        ${EXEC_ICONS.search}
                        <input type="text" id="clRecherche" placeholder="Rechercher une checklist…"
                               value="${_escAttr(EXEC_CL_RECHERCHE)}" oninput="execClRechercher(this.value)">
                    </div>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline" onclick="execOpenStatutsManager()"
                            title="Statuts d'évaluation des items">${EXEC_ICONS.settings} Statuts</button>` : ''}
                    ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="execOpenChecklistModal()">
                            ${EXEC_ICONS.add} Ajouter</button>` : ''}
                </div>
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table exec-cl-table">
                    <thead><tr>
                        <th style="width:118px;">Réf.</th>
                        <th style="width:36%;">Checklist</th>
                        <th style="width:auto;">Portée</th>
                        <th style="text-align:center;width:66px;">Items</th>
                        <th style="text-align:right;width:126px;">Actions</th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>`;
}

// La recherche ne redessine que le corps du tableau : re-rendre la page
// entière ferait perdre le curseur à chaque frappe.
function execClRechercher(valeur) {
    EXEC_CL_RECHERCHE = valeur || '';
    const corps = document.querySelector('.exec-cl-table tbody');
    if (!corps) return;
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const D = _execCl_data();
    const shared = window.PESSCO?.sharedData || {};
    const refs = {
        domaines: shared.domaines || [],
        secteurs: shared.secteurs || [],
        sousActivites: shared.sousActivites || [],
    };
    const q = _execNorm(EXEC_CL_RECHERCHE);
    const liste = D.checklists.slice()
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .filter(c => !q || _execNorm(`${c.reference || ''} ${c.nom || ''} ${c.description || ''}`).includes(q));
    corps.innerHTML = liste.length
        ? liste.map(c => _execClLigne(c, D, refs, isAdmin)).join('')
        : `<tr><td colspan="5" class="exec-cl-aucune">Aucune checklist ne correspond à « ${_esc(EXEC_CL_RECHERCHE)} ».</td></tr>`;
}
window.execClRechercher = execClRechercher;

// « Tout / Aucun » d'une grille de cases : cocher un domaine à la fois pour
// dire « tout le domaine » est le geste le plus fréquent du paramétrage.
function _clBoutonsPortee(classe, suite) {
    return `<span class="exec-cl-portee-actions">
        <a href="#" onclick="_clCocherPortee('${classe}',true,'${suite}');return false;">Tout</a>
        <a href="#" onclick="_clCocherPortee('${classe}',false,'${suite}');return false;">Aucun</a>
    </span>`;
}

function _clCocherPortee(classe, valeur, suite) {
    document.querySelectorAll('.' + classe).forEach((c) => { c.checked = valeur; });
    if (suite && typeof window[suite] === 'function') window[suite]();
}
window._clCocherPortee = _clCocherPortee;

// ── Modal Checklist (entête) ──
function execOpenChecklistModal(clId) {
    const D = _execCl_data();
    const item = clId ? D.checklists.find(c => c.id === clId) : null;
    const shared = window.PESSCO?.sharedData || {};
    const domaines = shared.domaines || [];
    const secteurs = shared.secteurs || [];
    const sousActivites = shared.sousActivites || [];
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const selDom = _parse(item?.domaines_ids);
    const selSec = _parse(item?.secteurs_ids);
    const selSa  = _parse(item?.sous_activites_ids);
    // Une case par cellule de grille (5 colonnes), alignée à gauche, libellé = sigle/code.
    const checkbox = (id, arr, lbl, cls) => `<label style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;text-align:left;white-space:nowrap;">
        <input type="checkbox" class="${cls}" value="${id}" ${arr.includes(id)?'checked':''}>
        <span>${lbl}</span>
    </label>`;
    // 5 colonnes auto-largeur, packées à gauche (justify-content:start) — chaque case juste assez large pour son sigle.
    const boxStyle = 'display:grid;grid-template-columns:repeat(5, max-content);justify-content:start;gap:0.25rem 1.4rem;max-height:160px;overflow:auto;border:1px solid var(--border);border-radius:4px;padding:0.45rem 0.6rem;';
    // Pré-stocke les listes pour les refresh dynamiques sans refaire de fetch.
    window._clModalCtx = { domaines, secteurs, sousActivites, item };
    shellShowModal((item ? 'Modifier' : 'Ajouter') + ' — Checklist', `
        <div class="shell-form-row" style="display:grid;grid-template-columns:140px 1fr;gap:0.6rem;">
            <div class="shell-form-group">
                <label>Réf.</label>
                <input id="clRef" class="shell-input" value="${_escAttr(item?.reference || '')}" placeholder="ex. CHK-001">
            </div>
            <div class="shell-form-group">
                <label>Nom *</label>
                <input id="clNom" class="shell-input" value="${_escAttr(item?.nom || '')}" placeholder="Nom de la checklist">
            </div>
        </div>
        <div class="shell-form-group">
            <label>Description</label>
            <textarea id="clDesc" class="shell-input" rows="2">${_esc(item?.description || '')}</textarea>
        </div>
        <p class="exec-proc-note" style="margin:.2rem 0 .6rem;">
            La portée se resserre de gauche à droite : les secteurs proposés découlent des
            domaines cochés, les sous-activités des secteurs. Ne rien cocher rend la
            checklist applicable partout.
        </p>
        <div class="shell-form-group">
            <label>Domaines applicables ${_clBoutonsPortee('cl-doms-cb', '_clRefreshSecteurs')}</label>
            <div id="clDomsBox" style="${boxStyle}" onchange="_clRefreshSecteurs()">
                ${domaines.map(d => checkbox(d.id, selDom, (d.code || d.sigle || d.nom || '?'), 'cl-doms-cb')).join('') || '<span style="color:var(--text-muted);font-size:0.75rem;">Aucun domaine</span>'}
            </div>
        </div>
        <div class="shell-form-group">
            <label>Secteurs applicables <span id="clSecsHint" style="color:var(--text-muted);font-size:0.7rem;font-weight:400;"></span>
                ${_clBoutonsPortee('cl-secs-cb', '_clRefreshSousActivites')}</label>
            <div id="clSecsBox" style="${boxStyle}" onchange="_clRefreshSousActivites()"></div>
        </div>
        <div class="shell-form-group">
            <label>Sous-activités applicables <span id="clSasHint" style="color:var(--text-muted);font-size:0.7rem;font-weight:400;"></span>
                ${_clBoutonsPortee('cl-sas-cb', '')}</label>
            <div id="clSasBox" style="${boxStyle}"></div>
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveChecklist('${clId || ''}')">Enregistrer</button>
    `);
    // Initialisation des deux listes dépendantes après l'ouverture du modal
    setTimeout(() => _clRefreshSecteurs(), 0);
}

// Refresh dynamique des listes selon les sélections en cascade
//   Domaines  → Secteurs (filtre par domaine_id)
//   Secteurs  → Sous-activités (filtre par secteur_id)
function _clRefreshSecteurs() {
    const ctx = window._clModalCtx; if (!ctx) return;
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const initSec = _parse(ctx.item?.secteurs_ids);
    const selDom = Array.from(document.querySelectorAll('.cl-doms-cb')).filter(c => c.checked).map(c => c.value);
    // Préserve les coches déjà visibles
    const prevChecked = new Set(Array.from(document.querySelectorAll('.cl-secs-cb')).filter(c => c.checked).map(c => c.value));
    const checkedSec = (prevChecked.size || document.querySelector('.cl-secs-cb')) ? prevChecked : new Set(initSec);
    const filtered = selDom.length
        ? ctx.secteurs.filter(s => selDom.includes(s.domaine_id))
        : ctx.secteurs;
    const box = document.getElementById('clSecsBox'); if (!box) return;
    box.innerHTML = filtered.length
        ? filtered.map(s => `<label style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;white-space:nowrap;">
            <input type="checkbox" class="cl-secs-cb" value="${s.id}" ${checkedSec.has(s.id)?'checked':''}>
            <span>${s.code || s.sigle || s.nom || '?'}</span>
        </label>`).join('')
        : `<span style="color:var(--text-muted);font-size:0.75rem;grid-column:1/-1;">${selDom.length?'Aucun secteur pour les domaines sélectionnés':'Sélectionnez un domaine'}</span>`;
    const hint = document.getElementById('clSecsHint');
    if (hint) hint.textContent = selDom.length ? `(${filtered.length} disponible${filtered.length>1?'s':''})` : '';
    _clRefreshSousActivites();
}

function _clRefreshSousActivites() {
    const ctx = window._clModalCtx; if (!ctx) return;
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const initSa = _parse(ctx.item?.sous_activites_ids);
    const selSec = Array.from(document.querySelectorAll('.cl-secs-cb')).filter(c => c.checked).map(c => c.value);
    const prevChecked = new Set(Array.from(document.querySelectorAll('.cl-sas-cb')).filter(c => c.checked).map(c => c.value));
    const checkedSa = (prevChecked.size || document.querySelector('.cl-sas-cb')) ? prevChecked : new Set(initSa);
    const filtered = selSec.length
        ? ctx.sousActivites.filter(sa => selSec.includes(sa.secteur_id))
        : ctx.sousActivites;
    const box = document.getElementById('clSasBox'); if (!box) return;
    box.innerHTML = filtered.length
        ? filtered.map(sa => `<label style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;white-space:nowrap;">
            <input type="checkbox" class="cl-sas-cb" value="${sa.id}" ${checkedSa.has(sa.id)?'checked':''}>
            <span>${sa.code || sa.sigle || sa.nom || '?'}</span>
        </label>`).join('')
        : `<span style="color:var(--text-muted);font-size:0.75rem;grid-column:1/-1;">${selSec.length?'Aucune sous-activité pour les secteurs sélectionnés':'Sélectionnez un secteur'}</span>`;
    const hint = document.getElementById('clSasHint');
    if (hint) hint.textContent = selSec.length ? `(${filtered.length} disponible${filtered.length>1?'s':''})` : '';
}

async function execSaveChecklist(clId) {
    const collect = cls => Array.from(document.querySelectorAll('.' + cls)).filter(c => c.checked).map(c => c.value);
    const data = {
        reference: document.getElementById('clRef')?.value.trim() || '',
        nom: document.getElementById('clNom')?.value.trim() || '',
        description: document.getElementById('clDesc')?.value.trim() || '',
        domaines_ids: JSON.stringify(collect('cl-doms-cb')),
        secteurs_ids: JSON.stringify(collect('cl-secs-cb')),
        sous_activites_ids: JSON.stringify(collect('cl-sas-cb'))
    };
    if (!data.nom) { shellShowToast('Nom requis', 'error'); return; }
    try {
        if (clId) await api('/api/exec-checklists/' + clId, { method: 'PUT', body: JSON.stringify(data) });
        else      await api('/api/exec-checklists',          { method: 'POST', body: JSON.stringify(data) });
        shellCloseModal();
        await execRefreshChecklists();
        execRenderPage();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

async function execDeleteChecklist(clId) {
    if (!await oasisConfirmer('Supprimer cette checklist et tous ses items ?')) return;
    try {
        // Cascade : supprime items + sous-thèmes liés
        const D = _execCl_data();
        await Promise.all(D.items.filter(i => i.checklist_id === clId)
            .map(i => api('/api/exec-checklist-items/' + i.id, { method: 'DELETE' }).catch(() => {})));
        await Promise.all(D.sousThemes.filter(s => s.checklist_id === clId)
            .map(s => api('/api/exec-checklist-sous-themes/' + s.id, { method: 'DELETE' }).catch(() => {})));
        await api('/api/exec-checklists/' + clId, { method: 'DELETE' });
        await execRefreshChecklists();
        execRenderPage();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Statuts d'évaluation manager ──
function execOpenStatutsManager() {
    const D = _execCl_data();
    const rows = D.statuts.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const rowsHtml = rows.length ? rows.map(s => `<tr>
        <td>${s.libelle}</td>
        <td>${s.alias ? s.alias : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td style="text-align:center;"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${s.couleur || '#9ca3af'};"></span></td>
        <td style="text-align:center;">${s.ordre || 0}</td>
        <td style="text-align:right;">
            <button class="btn btn-sm btn-ghost" onclick="execOpenStatutModal('${s.id}')">${EXEC_ICONS.edit}</button>
            <button class="btn btn-sm btn-ghost" onclick="execDeleteStatut('${s.id}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
        </td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:0.6rem;">Aucun statut défini.</td></tr>';
    shellShowModal("Statuts d'évaluation des questions", `
        <div style="margin-bottom:0.5rem;text-align:right;">
            <button class="btn btn-sm btn-primary" onclick="execOpenStatutModal()">${EXEC_ICONS.add} Ajouter un statut</button>
        </div>
        <table class="exec-table" style="width:100%;font-size:0.8rem;">
            <thead><tr><th>Libellé</th><th>Alias</th><th style="text-align:center;width:60px;">Couleur</th><th style="text-align:center;width:60px;">Ordre</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <p style="font-size:0.74rem;color:var(--text-muted);margin-top:0.4rem;">L'alias (s'il est renseigné) est la valeur affichée dans les listes déroulantes des checklists à renseigner.</p>
    `, `<button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Fermer</button>`);
}

function execOpenStatutModal(sId) {
    const D = _execCl_data();
    const s = sId ? D.statuts.find(x => x.id === sId) : null;
    const nextOrder = D.statuts.length ? Math.max(...D.statuts.map(x => x.ordre || 0)) + 1 : 1;
    shellShowModal((s ? 'Modifier' : 'Ajouter') + " — Statut d'évaluation", `
        <div class="shell-form-group">
            <label>Libellé *</label>
            <input id="stLib" class="shell-input" value="${(s?.libelle || '').replace(/"/g, '&quot;')}" placeholder="ex. Satisfaisant / Non Satisfaisant / Non Applicable">
        </div>
        <div class="shell-form-group">
            <label>Alias</label>
            <input id="stAlias" class="shell-input" value="${(s?.alias || '').replace(/"/g, '&quot;')}" placeholder="Valeur affichée dans les checklists (ex. S / NS / NA)">
        </div>
        <div class="shell-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
            <div class="shell-form-group">
                <label>Couleur</label>
                <input id="stCol" type="color" class="shell-input" value="${s?.couleur || '#3b82f6'}">
            </div>
            <div class="shell-form-group">
                <label>Ordre</label>
                <input id="stOrd" type="number" class="shell-input" value="${s?.ordre ?? nextOrder}" min="0">
            </div>
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="execOpenStatutsManager()">Retour</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveStatut('${sId || ''}')">Enregistrer</button>
    `);
}

async function execSaveStatut(sId) {
    const data = {
        libelle: document.getElementById('stLib')?.value.trim() || '',
        alias: document.getElementById('stAlias')?.value.trim() || '',
        couleur: document.getElementById('stCol')?.value || '',
        ordre: parseInt(document.getElementById('stOrd')?.value || '0', 10) || 0
    };
    if (!data.libelle) { shellShowToast('Libellé requis', 'error'); return; }
    try {
        if (sId) await api('/api/exec-checklist-statuts/' + sId, { method: 'PUT', body: JSON.stringify(data) });
        else     await api('/api/exec-checklist-statuts',         { method: 'POST', body: JSON.stringify(data) });
        await execRefreshChecklists();
        execOpenStatutsManager();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

async function execDeleteStatut(sId) {
    if (!await oasisConfirmer('Supprimer ce statut ?')) return;
    try {
        await api('/api/exec-checklist-statuts/' + sId, { method: 'DELETE' });
        await execRefreshChecklists();
        execOpenStatutsManager();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Éditeur Items d'une checklist — SLICER plein largeur avec édition inline ──
function execOpenChecklistEditor(clId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    if (!cl) { shellShowToast('Checklist introuvable', 'error'); return; }
    // Ferme un éventuel slicer existant
    document.getElementById('execCliEditorWrap')?.remove();
    // Auto-rétracte la barre de menu (mémorise l'état pour le restaurer à la fermeture)
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        window._execCliEditorPrevCollapsed = wrapper ? wrapper.classList.contains('sidebar-collapsed') : false;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = true;
        if (wrapper) wrapper.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.classList.add('collapsed');
    } catch (e) {}
    const html = `
    <div id="execCliEditorWrap" class="exec-cli-slicer-wrap">
        <div class="exec-cli-slicer-overlay" onclick="execCloseChecklistEditor()"></div>
        <aside class="exec-cli-slicer" role="dialog" aria-modal="true">
            <header class="exec-cli-slicer-header">
                <div class="exec-cli-ident">
                    <button class="btn btn-sm btn-outline btn-icon-only" onclick="execCloseChecklistEditor()"
                            title="Fermer">${EXEC_ICONS.back}</button>
                    <div>
                        <div class="exec-cli-surtitre">
                            Checklist${cl.reference ? ` · <span class="exec-cl-ref">${_esc(cl.reference)}</span>` : ''}
                        </div>
                        <div class="exec-cli-titre">${_esc(cl.nom || '')}</div>
                    </div>
                    <span class="exec-cl-compte" id="execCliCompte"
                          title="Items de la checklist">${D.items.filter(i => i.checklist_id === clId).length}</span>
                </div>
                <div class="exec-cli-actions">
                    <span id="execCliSaveState" class="exec-cli-etat"></span>
                    <button class="btn btn-sm btn-outline btn-icon-only" onclick="execChecklistExportXlsx('${clId}')"
                            title="Exporter la checklist en Excel">${EXEC_ICONS.download}</button>
                    <button class="btn btn-sm btn-outline btn-icon-only" title="Importer des items depuis Excel"
                            onclick="document.getElementById('execCliImportFile').click()">${EXEC_ICONS.upload}</button>
                    <input type="file" id="execCliImportFile" accept=".xlsx" style="display:none" onchange="execChecklistImportXlsx('${clId}', event)">
                    <button class="btn btn-sm btn-outline" onclick="execOpenSousThemesManager('${clId}')"
                            title="Gérer les sous-thèmes de cette checklist">${EXEC_ICONS.layers} Sous-thèmes</button>
                    <button class="btn btn-sm btn-primary" onclick="execAddChecklistRow('${clId}')">
                        ${EXEC_ICONS.add} Ajouter une ligne</button>
                </div>
            </header>
            <div class="exec-cli-slicer-body" style="padding:0.75rem 1rem;">
                <div style="overflow:auto;">
                    <table id="execCliItemsTable" class="exec-cli-inline-table">
                        <thead><tr>
                            <th style="width:55px;">Ordre</th>
                            <th style="width:85px;">Réf. Item</th>
                            <th style="width:110px;">Thème</th>
                            <th style="width:130px;">Sous-thème</th>
                            <th style="width:170px;">Réf. Règlement</th>
                            <th style="min-width:320px;">Description</th>
                            <th style="min-width:320px;">Directives</th>
                            <th style="width:44px;"></th>
                        </tr></thead>
                        <tbody id="execCliItemsBody"></tbody>
                    </table>
                </div>
            </div>
        </aside>
    </div>
    <style>
        .exec-cli-slicer-wrap { position:fixed; top:var(--topbar-height, 56px); left:var(--sidebar-width, 240px); right:0; bottom:0; z-index:1100; transition:left 0.3s ease; }
        body.app-sidebar-collapsed .exec-cli-slicer-wrap { left:var(--sidebar-collapsed, 60px); }
        .exec-cli-slicer-overlay { position:absolute; inset:0; background:rgba(15,23,42,0.35); }
        .exec-cli-slicer { position:absolute; top:0; right:0; bottom:0; left:0; width:auto; max-width:100%;
            background:var(--bg, #fff); box-shadow:-8px 0 30px rgba(0,0,0,0.18);
            display:flex; flex-direction:column; animation:execCliSlideIn 0.25s ease; }
        @media (max-width: 640px) { .exec-cli-slicer-wrap { left:0; } }
        @keyframes execCliSlideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        .exec-cli-slicer-header { display:flex; align-items:center; justify-content:space-between; padding:0.7rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-card); gap:0.5rem; flex-wrap:wrap; }
        .exec-cli-ident { display:flex; align-items:center; gap:0.6rem; min-width:0; }
        .exec-cli-surtitre { font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
        .exec-cli-titre { font-weight:700; font-size:1rem; line-height:1.25; }
        .exec-cli-actions { display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap; }
        .exec-cli-etat { font-size:0.75rem; color:var(--text-muted); min-width:0; }
        .exec-cli-slicer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
        .exec-cli-inline-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
        .exec-cli-inline-table tbody tr:nth-child(even) { background:rgba(100,116,139,0.045); }
        .exec-cli-inline-table thead th { background:#1a365d; color:#fff; text-align:left; padding:0.45rem 0.55rem; font-weight:600; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; position:sticky; top:0; z-index:1; }
        .exec-cli-inline-table tbody td { border-bottom:1px solid var(--border); padding:0.25rem 0.35rem; vertical-align:top; }
        .exec-cli-inline-table tbody tr:hover { background:rgba(59,130,246,0.04); }
        .exec-cli-inline-table input, .exec-cli-inline-table select, .exec-cli-inline-table textarea {
            width:100%; border:1px solid transparent; border-radius:4px; padding:0.25rem 0.35rem; font-size:0.76rem; background:transparent; resize:vertical; font-family:inherit;
        }
        .exec-cli-inline-table input:focus, .exec-cli-inline-table select:focus, .exec-cli-inline-table textarea:focus {
            outline:none; border-color:#3b82f6; background:#fff; box-shadow:0 0 0 2px rgba(59,130,246,0.15);
        }
        .exec-cli-inline-table textarea { min-height:32px; max-height:140px; line-height:1.3; }
        .exec-cli-inline-table .ord-input { width:50px; text-align:center; }
        .exec-cli-inline-table .ref-input { width:80px; }
        .exec-cli-inline-table .row-delete { background:transparent; border:none; cursor:pointer; color:#ef4444; line-height:0; padding:0.3rem; border-radius:4px; }
        .exec-cli-inline-table .row-delete:hover { background:#fee2e2; }
        .exec-cli-empty { text-align:center; color:var(--text-muted); font-style:italic; padding:1.2rem; }
    </style>`;
    document.body.insertAdjacentHTML('beforeend', html);
    _execCliRenderRows(clId);
}

function execCloseChecklistEditor() {
    document.getElementById('execCliEditorWrap')?.remove();
    // Restaure l'état antérieur de la barre de menu
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        const prev = !!window._execCliEditorPrevCollapsed;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = prev;
        if (wrapper) wrapper.classList.toggle('sidebar-collapsed', prev);
        if (sidebar) sidebar.classList.toggle('collapsed', prev);
    } catch (e) {}
}

// Rendu (ou re-rendu) du corps de la table d'items en mode édition inline
function _execCliRenderRows(clId) {
    const tbody = document.getElementById('execCliItemsBody');
    if (!tbody) return;
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    if (!cl) return;
    const items = D.items.filter(i => i.checklist_id === clId).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const statuts = D.statuts.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId);
    const _esc2 = oasisEsc;

    // Le compteur de l'entête suit les ajouts et suppressions faits ici.
    const compteur = document.getElementById('execCliCompte');
    if (compteur) compteur.textContent = items.length;
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="exec-cli-empty">Aucun item — cliquez sur « Ajouter une ligne » pour commencer.</td></tr>';
        return;
    }
    // Construit un sigle (initiales) à partir du libellé d'un thème, pour ne pas
    // élargir la colonne — le libellé complet reste accessible via le `title`.
    const _sigle = lbl => {
        const s = String(lbl || '').trim();
        if (!s) return '—';
        const words = s.split(/\s+/).filter(w => w && !/^(de|des|du|le|la|les|et|à|au|aux|en|sur|d')$/i.test(w));
        if (words.length >= 2) return words.slice(0, 4).map(w => w.charAt(0).toUpperCase()).join('');
        return s.length > 6 ? s.substring(0, 6) : s;
    };
    // Statut + Observations sont volontairement omis ici : ils sont renseignés
    // uniquement lors de l'exécution de la checklist, pas au paramétrage.
    tbody.innerHTML = items.map(it => {
        const subOpts = sousThemes.filter(s => !it.theme_id || s.theme_id === it.theme_id);
        const themeCurrent = themes.find(t => t.id === it.theme_id);
        const themeTooltip = themeCurrent ? _esc2(themeCurrent.libelle) : '';
        return `<tr data-item-id="${it.id}">
            <td><input type="number" class="ord-input" value="${it.ordre || 0}" min="0" onchange="_execCliAutosave('${it.id}','ordre',parseInt(this.value)||0)"></td>
            <td><input class="ref-input" value="${_esc2(it.ref_item || '')}" onchange="_execCliAutosave('${it.id}','ref_item',this.value)"></td>
            <td><select title="${themeTooltip}" onchange="_execCliAutosave('${it.id}','theme_id',this.value);_execCliRowThemeChanged('${clId}','${it.id}')">
                <option value="" title="">—</option>
                ${themes.map(t => `<option value="${t.id}" ${it.theme_id===t.id?'selected':''} title="${_esc2(t.libelle)}">${_esc2(_sigle(t.libelle))}</option>`).join('')}
            </select></td>
            <td><select onchange="_execCliAutosave('${it.id}','sous_theme_id',this.value)">
                <option value="">—</option>
                ${subOpts.map(s => `<option value="${s.id}" ${it.sous_theme_id===s.id?'selected':''} title="${_esc2(s.libelle)}">${_esc2(s.libelle)}</option>`).join('')}
            </select></td>
            <td>${_execCliRefReglementCell(it, clId)}</td>
            <td><textarea rows="3" onchange="_execCliAutosave('${it.id}','description',this.value)">${_esc2(it.description || '')}</textarea></td>
            <td><textarea rows="3" onchange="_execCliAutosave('${it.id}','directives',this.value)">${_esc2(it.directives || '')}</textarea></td>
            <td><button class="row-delete" title="Supprimer l'item"
                onclick="execDeleteChecklistItemInline('${it.id}','${clId}')">${EXEC_ICONS.delete}</button></td>
        </tr>`;
    }).join('');
}

// ── Export / Import xlsx d'une checklist ──
async function execChecklistExportXlsx(clId) {
    const token = localStorage.getItem('pr_token');
    try {
        const res = await fetch(`/api/m/execution/checklists/${clId}/export-xlsx`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === clId);
        a.href = url;
        a.download = `checklist_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 60)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { shellShowToast('Export échoué : ' + (e.message || e), 'error'); }
}

async function execChecklistImportXlsx(clId, ev) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const replace = await oasisConfirmer('Les lignes du fichier remplacent-elles les items existants, ou s\'y ajoutent-elles ?\n« Remplacer » supprime d\'abord tous les items de la checklist.', { titre: 'Import des items', libelle: 'Remplacer', libelleAnnuler: 'Ajouter', danger: true });
    const mode = replace ? 'replace' : 'append';
    const token = localStorage.getItem('pr_token');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mode', mode);
    try {
        const res = await fetch(`/api/m/execution/checklists/${clId}/import-xlsx`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
        shellShowToast(`Import OK : ${j.imported} ligne(s) — mode ${j.mode}.`, 'success');
        await execRefreshChecklists();
        _execCliRenderRows(clId);
    } catch (e) {
        shellShowToast('Import échoué : ' + (e.message || e), 'error');
    } finally {
        // Réinitialise l'input pour permettre une nouvelle sélection du même fichier
        if (ev?.target) ev.target.value = '';
    }
}

// ── Réf. Règlement : sélecteur multi-exigences ──
// Le champ ref_reglement peut contenir soit :
//   - un texte libre (legacy), affiché tel quel ;
//   - un tableau JSON d'ids d'exigences (nouveau), résolu en libellés via la liste partagée.
function _execCliParseReglement(raw) {
    if (!raw) return { isList: false, list: [], text: '' };
    const s = String(raw).trim();
    if (s.startsWith('[')) {
        try {
            const arr = JSON.parse(s);
            if (Array.isArray(arr)) return { isList: true, list: arr.map(String), text: '' };
        } catch (e) { /* fallthrough */ }
    }
    return { isList: false, list: [], text: s };
}

function _execCliExigencesForChecklist(clId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const secIds = _parse(cl?.secteurs_ids);
    const domIds = _parse(cl?.domaines_ids);
    const allExigences = (window.PESSCO?.sharedData?.exigences) || [];
    // Une exigence s'applique si elle correspond à une SA, à défaut un secteur, à défaut un domaine de la checklist.
    return allExigences.filter(e => {
        if (saIds.length && e.sous_activite_id) return saIds.includes(e.sous_activite_id);
        if (secIds.length && e.secteur_id) return secIds.includes(e.secteur_id);
        if (domIds.length && e.domaine_id) return domIds.includes(e.domaine_id);
        return true; // pas de restriction
    });
}

function _execCliRefReglementCell(it, clId) {
    const _esc2 = oasisEsc;
    const parsed = _execCliParseReglement(it.ref_reglement);
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    const labels = parsed.isList
        ? parsed.list.map(id => {
              const e = exigencesAll.find(x => x.id === id);
              return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '(?)';
          })
        : parsed.text.split('\n').filter(Boolean);
    const preview = labels.length
        ? `<div style="display:flex;flex-direction:column;gap:0.1rem;font-size:0.72rem;line-height:1.25;max-height:60px;overflow:auto;">
              ${labels.map(l => `<span>• ${_esc2(l)}</span>`).join('')}
           </div>`
        : `<span style="color:var(--text-muted);font-style:italic;font-size:0.72rem;">Aucune disposition</span>`;
    return `<div style="display:flex;flex-direction:column;gap:0.2rem;">
        ${preview}
        <button class="btn btn-sm btn-ghost" style="padding:0.15rem 0.4rem;font-size:0.7rem;align-self:flex-start;" onclick="execOpenRefReglementPicker('${it.id}','${clId}')">✎ Choisir</button>
    </div>`;
}

function execOpenRefReglementPicker(itId, clId) {
    const D = _execCl_data();
    const it = D.items.find(i => i.id === itId);
    if (!it) return;
    const parsed = _execCliParseReglement(it.ref_reglement);
    const selected = new Set(parsed.list);
    const exigences = _execCliExigencesForChecklist(clId).slice().sort((a, b) =>
        (a.reference || '').localeCompare(b.reference || ''));
    const _esc2 = oasisEsc;
    const list = exigences.length
        ? exigences.map(e => `<label style="display:flex;align-items:flex-start;gap:0.4rem;padding:0.25rem 0.35rem;border-bottom:1px solid var(--border);font-size:0.78rem;cursor:pointer;">
              <input type="checkbox" class="exg-cb" value="${e.id}" ${selected.has(e.id) ? 'checked' : ''}>
              <span><strong>${_esc2(e.reference || '')}</strong>${e.libelle ? ' — ' + _esc2(e.libelle) : ''}${e.theme ? `<span style="color:var(--text-muted);font-size:0.72rem;"> [${_esc2(e.theme)}]</span>` : ''}</span>
          </label>`).join('')
        : '<div style="padding:1rem;text-align:center;color:var(--text-muted);font-style:italic;">Aucune exigence applicable aux domaines/secteurs/sous-activités de cette checklist.</div>';

    // Champ libre legacy proposé en complément si l'utilisateur souhaite saisir du texte libre.
    const legacyText = parsed.isList ? '' : parsed.text;

    shellShowModal('Réf. Règlement — sélection des exigences', `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.4rem;">
            <input id="exgSearch" class="shell-input" placeholder="Filtrer…" oninput="_execCliRefRegFilter()">
            <span style="color:var(--text-muted);font-size:0.75rem;">${exigences.length} disposition${exigences.length>1?'s':''} disponibles</span>
        </div>
        <div id="exgListWrap" style="max-height:46vh;overflow:auto;border:1px solid var(--border);border-radius:6px;">
            ${list}
        </div>
        <details style="margin-top:0.5rem;">
            <summary style="font-size:0.78rem;cursor:pointer;color:var(--text-muted);">Texte libre (compatibilité)</summary>
            <textarea id="exgLegacy" class="shell-input" rows="2" placeholder="Saisi librement — utilisé si aucune exigence cochée">${_esc2(legacyText)}</textarea>
        </details>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="_execCliRefRegSave('${itId}','${clId}')">Valider</button>
    `);
}

function _execCliRefRegFilter() {
    const term = (document.getElementById('exgSearch')?.value || '').toLowerCase();
    document.querySelectorAll('#exgListWrap label').forEach(l => {
        l.style.display = l.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}

async function _execCliRefRegSave(itId, clId) {
    const ids = Array.from(document.querySelectorAll('.exg-cb')).filter(c => c.checked).map(c => c.value);
    const legacy = (document.getElementById('exgLegacy')?.value || '').trim();
    // Priorité au multi-select ; fallback texte libre si rien de coché.
    const value = ids.length ? JSON.stringify(ids) : legacy;
    await _execCliAutosave(itId, 'ref_reglement', value);
    shellCloseModal();
    _execCliRenderRows(clId);
}

// Ajoute une nouvelle ligne vide (création immédiate côté serveur) et rend la table.
async function execAddChecklistRow(clId) {
    const D = _execCl_data();
    const items = D.items.filter(i => i.checklist_id === clId);
    const nextOrdre = items.length ? Math.max(...items.map(i => i.ordre || 0)) + 1 : 1;
    try {
        await api('/api/exec-checklist-items', { method: 'POST', body: JSON.stringify({
            checklist_id: clId, ref_item: '', description: '', ordre: nextOrdre
        }) });
        await execRefreshChecklists();
        _execCliRenderRows(clId);
        // Focus la première cellule éditable de la dernière ligne
        setTimeout(() => {
            const rows = document.querySelectorAll('#execCliItemsBody tr');
            const last = rows[rows.length - 1];
            last?.querySelector('input, textarea')?.focus();
        }, 30);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// Suppression d'une ligne depuis la table inline (re-rend la table en place)
async function execDeleteChecklistItemInline(itId, clId) {
    if (!await oasisConfirmer('Supprimer cette ligne ?')) return;
    try {
        await api('/api/exec-checklist-items/' + itId, { method: 'DELETE' });
        await execRefreshChecklists();
        _execCliRenderRows(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// Quand le thème d'une ligne change, recalcule les sous-thèmes éligibles de la même ligne.
function _execCliRowThemeChanged(clId, itId) {
    const row = document.querySelector(`#execCliItemsBody tr[data-item-id="${itId}"]`);
    if (!row) return;
    // Nouvelle disposition : Thème = col 2, Sous-thème = col 3
    const themeSel = row.cells[2]?.querySelector('select');
    const subSel = row.cells[3]?.querySelector('select');
    if (!themeSel || !subSel) return;
    const tId = themeSel.value || '';
    const D = _execCl_data();
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId && (!tId || s.theme_id === tId));
    const prev = subSel.value;
    subSel.innerHTML = '<option value="">—</option>' + sousThemes.map(s =>
        `<option value="${s.id}">${(s.libelle || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</option>`).join('');
    if (Array.from(subSel.options).some(o => o.value === prev)) {
        subSel.value = prev;
    } else if (prev) {
        subSel.value = '';
        _execCliAutosave(itId, 'sous_theme_id', '');
    }
}


// Sauvegarde immédiate d'un champ — appelé sur `onchange` de chaque input/select/textarea.
async function _execCliAutosave(itId, field, value) {
    const stateEl = document.getElementById('execCliSaveState');
    if (stateEl) { stateEl.textContent = '… enregistrement'; stateEl.style.color = '#d97706'; }
    try {
        await api('/api/exec-checklist-items/' + itId, { method: 'PUT', body: JSON.stringify({ [field]: value }) });
        if (stateEl) { stateEl.textContent = '✓ enregistré'; stateEl.style.color = '#059669'; }
        // Met à jour le cache local
        const it = (EXEC_STATE.data.checklistItems || []).find(i => i.id === itId);
        if (it) it[field] = value;
    } catch (e) {
        if (stateEl) { stateEl.textContent = '⚠ erreur'; stateEl.style.color = '#ef4444'; }
        shellShowToast(e.message || 'Erreur d\'enregistrement', 'error');
    }
}


// ── Manager des sous-thèmes pour une checklist ──
function execOpenSousThemesManager(clId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const themeLabel = id => themes.find(t => t.id === id)?.libelle || (allThemes.find(t => t.id === id)?.libelle || '-');
    const _esc2 = oasisEsc;

    const rowsHtml = sousThemes.length ? sousThemes.map(s => `<tr>
        <td>${_esc2(themeLabel(s.theme_id))}</td>
        <td>${_esc2(s.libelle)}</td>
        <td style="text-align:center;">${s.ordre || 0}</td>
        <td style="text-align:right;">
            <button class="btn btn-sm btn-ghost" onclick="execOpenSousThemeModal('${clId}','${s.id}')">${EXEC_ICONS.edit}</button>
            <button class="btn btn-sm btn-ghost" onclick="execDeleteSousTheme('${s.id}','${clId}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
        </td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:0.8rem;">Aucun sous-thème.</td></tr>';

    shellShowModal('Sous-thèmes — ' + (cl?.nom || ''), `
        <div style="display:flex;gap:0.4rem;justify-content:flex-end;margin-bottom:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" onclick="execSousThemesExportXlsx('${clId}')" title="Exporter Excel">${EXEC_ICONS.download || ''} Exporter Excel</button>
            <button class="btn btn-sm btn-primary" onclick="document.getElementById('execSousThemesImportFile').click()" title="Importer">${EXEC_ICONS.upload || ''} Importer</button>
            <input type="file" id="execSousThemesImportFile" accept=".xlsx" style="display:none" onchange="execSousThemesImportXlsx('${clId}',event)">
            <button class="btn btn-sm btn-primary" onclick="execOpenSousThemeModal('${clId}')">${EXEC_ICONS.add} Ajouter</button>
        </div>
        <table class="exec-table" style="width:100%;font-size:0.78rem;">
            <thead><tr><th>Thème</th><th>Sous-thème</th><th style="text-align:center;width:60px;">Ordre</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `, `<button class="shell-btn shell-btn-outline" onclick="shellCloseModal();execOpenChecklistEditor('${clId}')">Retour à la checklist</button>`);
}

// ── Export / Import xlsx des sous-thèmes d'une checklist ──
async function execSousThemesExportXlsx(clId) {
    const token = localStorage.getItem('pr_token');
    try {
        const res = await fetch(`${EXEC_MODULE_API}/checklists/${clId}/sous-themes/export-xlsx`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === clId);
        a.href = url;
        a.download = `sous_themes_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 50)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { shellShowToast('Export échoué : ' + (e.message || e), 'error'); }
}

async function execSousThemesImportXlsx(clId, ev) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('pr_token');
    const fd = new FormData();
    fd.append('file', file);
    try {
        const res = await fetch(`${EXEC_MODULE_API}/checklists/${clId}/sous-themes/import-xlsx`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
        shellShowToast(`Import OK : ${j.imported} sous-thème(s).`, 'success');
        await execRefreshChecklists();
        execOpenSousThemesManager(clId);
    } catch (e) {
        shellShowToast('Import échoué : ' + (e.message || e), 'error');
    } finally {
        if (ev?.target) ev.target.value = '';
    }
}

function execOpenSousThemeModal(clId, stId) {
    const D = _execCl_data();
    const item = stId ? D.sousThemes.find(s => s.id === stId) : null;
    const cl = D.checklists.find(c => c.id === clId);
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const _esc2 = oasisEsc;
    shellShowModal((item ? 'Modifier' : 'Ajouter') + ' — Sous-thème', `
        <div class="shell-form-group">
            <label>Thème *</label>
            <select id="stTheme" class="shell-input">
                ${themes.map(t => `<option value="${t.id}" ${item?.theme_id===t.id?'selected':''}>${_esc2(t.libelle)}</option>`).join('')}
            </select>
        </div>
        <div class="shell-form-group">
            <label>Libellé du sous-thème *</label>
            <input id="stLib2" class="shell-input" value="${_esc2(item?.libelle || '')}">
        </div>
        <div class="shell-form-group">
            <label>Ordre</label>
            <input id="stOrd2" type="number" class="shell-input" value="${item?.ordre ?? 0}" min="0">
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="execOpenSousThemesManager('${clId}')">Retour</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveSousTheme('${clId}','${stId || ''}')">Enregistrer</button>
    `);
}

async function execSaveSousTheme(clId, stId) {
    const data = {
        checklist_id: clId,
        theme_id: document.getElementById('stTheme')?.value || '',
        libelle: document.getElementById('stLib2')?.value.trim() || '',
        ordre: parseInt(document.getElementById('stOrd2')?.value || '0', 10) || 0
    };
    if (!data.theme_id || !data.libelle) { shellShowToast('Thème et libellé requis', 'error'); return; }
    try {
        if (stId) await api('/api/exec-checklist-sous-themes/' + stId, { method: 'PUT', body: JSON.stringify(data) });
        else      await api('/api/exec-checklist-sous-themes',          { method: 'POST', body: JSON.stringify(data) });
        await execRefreshChecklists();
        execOpenSousThemesManager(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

async function execDeleteSousTheme(stId, clId) {
    if (!await oasisConfirmer('Supprimer ce sous-thème ?')) return;
    try {
        await api('/api/exec-checklist-sous-themes/' + stId, { method: 'DELETE' });
        await execRefreshChecklists();
        execOpenSousThemesManager(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Chargement / refresh checklists ──
async function execRefreshChecklists() {
    try {
        const [checklists, items, statuts, sousThemes] = await Promise.all([
            api('/api/exec-checklists').catch(() => []),
            api('/api/exec-checklist-items').catch(() => []),
            api('/api/exec-checklist-statuts').catch(() => []),
            api('/api/exec-checklist-sous-themes').catch(() => [])
        ]);
        EXEC_STATE.data.checklists = checklists || [];
        EXEC_STATE.data.checklistItems = items || [];
        EXEC_STATE.data.checklistStatuts = statuts || [];
        EXEC_STATE.data.checklistSousThemes = sousThemes || [];
    } catch (e) { console.warn('Checklists refresh failed', e); }
}

function execOpenCriticiteModal(critId) {
    const crits = EXEC_STATE.data.criticites || [];
    const c = critId ? crits.find(x => x.id === critId) : null;
    const title = (c ? 'Modifier' : 'Ajouter') + ' — ' + te('niveau_constatations');
    shellShowModal(title, `
        <div class="shell-form-group">
            <label>${te('item')} *</label>
            <input id="critItem" class="shell-input" value="${_escAttr(c?.item || '')}" placeholder="Critique / Majeure / Mineure">
        </div>
        <div class="shell-form-group">
            <label>Alias</label>
            <input id="critAlias" class="shell-input" value="${_escAttr(c?.alias || '')}" placeholder="Valeur affichée dans les listes déroulantes (ex. C / M / m)">
        </div>
        <div class="shell-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
            <div class="shell-form-group">
                <label>${te('niveau')}</label>
                <input id="critNiveau" type="number" class="shell-input" value="${c?.niveau ?? 0}" min="0">
            </div>
            <div class="shell-form-group">
                <label>${te('delai_cloture_jours')}</label>
                <input id="critDelai" type="number" class="shell-input" value="${c?.delai_cloture ?? 0}" min="0">
            </div>
        </div>
        <div class="shell-form-group">
            <label>${te('ordre')}</label>
            <input id="critOrdre" type="number" class="shell-input" value="${c?.ordre ?? 0}" min="0">
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">${te('cancel') || 'Annuler'}</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveCriticite('${critId || ''}')">${te('save') || 'Enregistrer'}</button>
    `);
}

async function execSaveCriticite(critId) {
    const data = {
        item: document.getElementById('critItem')?.value.trim() || '',
        alias: document.getElementById('critAlias')?.value.trim() || '',
        niveau: parseInt(document.getElementById('critNiveau')?.value || '0', 10) || 0,
        delai_cloture: parseInt(document.getElementById('critDelai')?.value || '0', 10) || 0,
        ordre: parseInt(document.getElementById('critOrdre')?.value || '0', 10) || 0
    };
    if (!data.item) {
        shellShowToast(te('required_field') || 'Champ requis', 'error');
        return;
    }
    try {
        if (critId) {
            await api(`${EXEC_MODULE_API}/criticites/${critId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await api(`${EXEC_MODULE_API}/criticites`, { method: 'POST', body: JSON.stringify(data) });
        }
        shellCloseModal();
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

async function execDeleteCriticite(critId) {
    if (!await oasisConfirmer(te('confirm_delete') || 'Confirmer la suppression ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/criticites/${critId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

function execOpenTypeCasModal(tcId) {
    const tcs = EXEC_STATE.data.typesCas || [];
    const t = tcId ? tcs.find(x => x.id === tcId) : null;
    const title = (t ? 'Modifier' : 'Ajouter') + ' — ' + te('types_cas');
    shellShowModal(title, `
        <div class="shell-form-group">
            <label>${te('item')} *</label>
            <input id="tcItem" class="shell-input" value="${_escAttr(t?.item || '')}" placeholder="Isolé / Récurrent">
        </div>
        <div class="shell-form-group">
            <label>${te('description') || 'Description'}</label>
            <textarea id="tcDesc" class="shell-input" rows="2">${_esc(t?.description || '')}</textarea>
        </div>
        <div class="shell-form-group">
            <label>${te('ordre')}</label>
            <input id="tcOrdre" type="number" class="shell-input" value="${t?.ordre ?? 0}" min="0">
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">${te('cancel') || 'Annuler'}</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveTypeCas('${tcId || ''}')">${te('save') || 'Enregistrer'}</button>
    `);
}

async function execSaveTypeCas(tcId) {
    const data = {
        item: document.getElementById('tcItem')?.value.trim() || '',
        description: document.getElementById('tcDesc')?.value.trim() || '',
        ordre: parseInt(document.getElementById('tcOrdre')?.value || '0', 10) || 0
    };
    if (!data.item) {
        shellShowToast(te('required_field') || 'Champ requis', 'error');
        return;
    }
    try {
        if (tcId) {
            await api(`${EXEC_MODULE_API}/types-cas/${tcId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await api(`${EXEC_MODULE_API}/types-cas`, { method: 'POST', body: JSON.stringify(data) });
        }
        shellCloseModal();
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

async function execDeleteTypeCas(tcId) {
    if (!await oasisConfirmer(te('confirm_delete') || 'Confirmer la suppression ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/types-cas/${tcId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

// Propage le délai de clôture du paramètre criticité sélectionné vers le champ
// "Délai" du formulaire FNC / clôture, puis déclenche le recalcul de la date due.
function execApplyCriticiteDelai(selectId, delaiId, recomputeFnName) {
    const sel = document.getElementById(selectId);
    const delai = document.getElementById(delaiId);
    if (!sel || !delai) return;
    const opt = sel.options[sel.selectedIndex];
    const d = opt ? parseInt(opt.getAttribute('data-delai') || '0', 10) : 0;
    if (d > 0) delai.value = d;
    if (recomputeFnName && typeof window[recomputeFnName] === 'function') {
        window[recomputeFnName]();
    }
}

