/* OASIS — Module « Exécution de la Surveillance »
 * Écran 5 — Prestataires.
 *
 * Fiches des organismes surveillés et de leur suivi.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  5. PRESTATAIRES
// ══════════════════════════════════════

function execRenderPrestataires() {
    const prestataires = EXEC_STATE.data.prestataires || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    const notifications = EXEC_STATE.data.notifications || [];
    const F = EXEC_STATE.filters;
    const subTab = EXEC_STATE.dossierPageTab || 'en_cours';

    let filtered = prestataires;
    if (F.domaine) filtered = filtered.filter(p => p.domaine_id === F.domaine);
    if (F.secteur) filtered = filtered.filter(p => p.secteur_id === F.secteur);
    if (F.prestataire) filtered = filtered.filter(p => p.id === F.prestataire);
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(p => (p.nom || '').toLowerCase().includes(s) || (p.code || '').toLowerCase().includes(s));
    }

    // Décompte par onglet : nombre de DOSSIERS (des prestataires filtrés).
    const filteredPrestIds = new Set(filtered.map(p => p.id));
    const scopedDoss = dossiers.filter(d => filteredPrestIds.has(d.prestataire_id));
    const enCoursCount = scopedDoss.filter(d => d.statut !== 'cloture' && d.statut !== 'archive').length;
    const cloturesCount = scopedDoss.filter(d => d.statut === 'cloture').length;
    const archivesCount = scopedDoss.filter(d => d.statut === 'archive').length;

    const subTabs = [
        { id: 'en_cours', label: `Dossiers en cours (${enCoursCount})` },
        { id: 'clotures', label: `Dossiers clôturés (${cloturesCount})` },
        { id: 'archives', label: `Dossiers Archivés (${archivesCount})` }
    ];

    let content = '';
    if (subTab === 'en_cours') {
        content = _renderDossiersEnCours(filtered, dossiers, notifications, domaines);
    } else if (subTab === 'clotures') {
        content = _renderDossiersClotures(filtered, dossiers, notifications, domaines);
    } else if (subTab === 'archives') {
        content = _renderDossiersArchives(filtered, dossiers, domaines);
    }

    return `
    <div class="page-content">
        <div class="page-header" style="margin-bottom:0.4rem;">
            <h2 style="margin:0;">${te('prestataires')}</h2>
        </div>

        ${_execRenderFilterBar('execRenderPage()', { showSecteur: true, showPrestataire: true, showStatut: false })}

        <div class="exec-workflow-tabs" style="margin-bottom:0.5rem;">
            ${subTabs.map(t => `<button class="exec-tab ${subTab === t.id ? 'active' : ''}" onclick="EXEC_STATE.dossierPageTab='${t.id}';execRenderPage()">
                ${t.label}
            </button>`).join('')}
        </div>

        <div id="dossier_page_content" style="animation: execFadeIn 0.3s ease;">
            ${content}
        </div>
    </div>`;
}

// Tri de la table "Dossiers en cours" (regroupée par domaine).
function execSortDossiersEnCours(col) {
    const s = EXEC_STATE.dossierEnCoursSort || (EXEC_STATE.dossierEnCoursSort = { col: 'date', dir: 'asc' });
    if (s.col === col) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
    else { s.col = col; s.dir = 'asc'; }
    execRenderPage();
}

function _renderDossiersEnCours(prestataires, dossiers, notifications, domaines) {
    const sort = EXEC_STATE.dossierEnCoursSort || (EXEC_STATE.dossierEnCoursSort = { col: 'date', dir: 'asc' });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    // Dossiers en cours des prestataires filtrés
    const enCours = dossiers.filter(d => d.statut !== 'cloture' && d.statut !== 'archive' && prestById[d.prestataire_id]);
    if (enCours.length === 0) return `<div class="card"><p style="color:var(--text-muted);">${te('no_data')}</p></div>`;
    // Regroupement par domaine (domaine de rattachement du prestataire)
    const groups = {};
    enCours.forEach(d => {
        const domId = (prestById[d.prestataire_id] || {}).domaine_id || '';
        (groups[domId] = groups[domId] || []).push(d);
    });
    const _domNom = id => (domaines.find(x => x.id === id) || {}).nom || 'Domaine non défini';
    const domIds = Object.keys(groups).sort((a, b) => _domNom(a).localeCompare(_domNom(b)));
    const _val = (d, col) => {
        const p = prestById[d.prestataire_id] || {};
        if (col === 'ref') return (d.reference || d.id || '').toLowerCase();
        if (col === 'prest') return (d.prestataire_nom || p.nom || '').toLowerCase();
        if (col === 'objet') return (d.notification_objet || d.objet_activite || '').toLowerCase();
        if (col === 'date') return d.date_debut_execution || d.date_creation || '';
        if (col === 'statut') return (d.statut || '').toLowerCase();
        return '';
    };
    const sortList = list => {
        const s = [...list].sort((a, b) => { const va = _val(a, sort.col), vb = _val(b, sort.col); return va < vb ? -1 : va > vb ? 1 : 0; });
        return sort.dir === 'desc' ? s.reverse() : s;
    };
    const arrow = col => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (col, label, extra) => `<th style="cursor:pointer;${extra || ''}" onclick="execSortDossiersEnCours('${col}')">${label}${arrow(col)}</th>`;

    return domIds.map(domId => {
        const rows = sortList(groups[domId]);
        return `
        <div class="card" style="margin-bottom:0.5rem;padding:0.6rem 0.75rem;overflow-x:auto;">
            <div style="margin-bottom:0.35rem;"><strong style="font-size:1rem;">${_esc(_domNom(domId))}</strong></div>
            <table class="exec-data-table exec-compact-table" style="margin-bottom:0;table-layout:fixed;min-width:760px;">
                <thead><tr>
                    ${th('ref', te('reference'), 'width:130px;')}
                    ${th('prest', te('provider'), 'width:150px;')}
                    ${th('objet', te('objet'))}
                    ${th('date', te('date_debut'), 'width:125px;')}
                    ${th('statut', te('status'), 'width:115px;')}
                    <th style="width:90px;text-align:center;">${te('actions')}</th>
                </tr></thead>
                <tbody>
                    ${rows.map(d => `<tr>
                        <td><strong>${_esc(d.reference || d.id)}</strong></td>
                        <td>${_esc(d.prestataire_nom || (prestById[d.prestataire_id] || {}).nom || '')}</td>
                        <td>${_esc(d.notification_objet || d.objet_activite || '')}</td>
                        <td style="white-space:nowrap;">${_formatDate(d.date_debut_execution || d.date_creation)}</td>
                        <td>${_execStatusBadge(d.statut)}</td>
                        <td style="text-align:center;white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${d.id}','realisation')" title="${te('ouvrir_dossier')}">${EXEC_ICONS.openFolder}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

// Tri des tables "Dossiers clôturés" / "Dossiers archivés" (regroupées par domaine).
function execSortDossiersClotures(col) {
    const s = EXEC_STATE.dossierCloturesSort || (EXEC_STATE.dossierCloturesSort = { col: 'date', dir: 'asc' });
    if (s.col === col) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
    else { s.col = col; s.dir = 'asc'; }
    execRenderPage();
}
function execSortDossiersArchives(col) {
    const s = EXEC_STATE.dossierArchivesSort || (EXEC_STATE.dossierArchivesSort = { col: 'date', dir: 'asc' });
    if (s.col === col) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
    else { s.col = col; s.dir = 'asc'; }
    execRenderPage();
}

function _renderDossiersClotures(prestataires, dossiers, notifications, domaines) {
    const sort = EXEC_STATE.dossierCloturesSort || (EXEC_STATE.dossierCloturesSort = { col: 'date', dir: 'asc' });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    const list = dossiers.filter(d => d.statut === 'cloture' && prestById[d.prestataire_id]);
    if (list.length === 0) return `<div class="card"><p style="color:var(--text-muted);">${te('no_data')}</p></div>`;
    const groups = {};
    list.forEach(d => {
        const domId = (prestById[d.prestataire_id] || {}).domaine_id || '';
        (groups[domId] = groups[domId] || []).push(d);
    });
    const _domNom = id => (domaines.find(x => x.id === id) || {}).nom || 'Domaine non défini';
    const domIds = Object.keys(groups).sort((a, b) => _domNom(a).localeCompare(_domNom(b)));
    const _val = (d, col) => {
        const p = prestById[d.prestataire_id] || {};
        const rn = notifications.find(n => n.id === d.notification_id) || {};
        if (col === 'ref') return (d.reference || d.id || '').toLowerCase();
        if (col === 'prest') return (d.prestataire_nom || p.nom || '').toLowerCase();
        if (col === 'notif') return (rn.reference || '').toLowerCase();
        if (col === 'objet') return (d.notification_objet || d.objet_activite || rn.objet_activite || '').toLowerCase();
        if (col === 'date') return d.date_fin_execution || '';
        if (col === 'statut') return (d.statut || '').toLowerCase();
        return '';
    };
    const sortList = l => {
        const s = [...l].sort((a, b) => { const va = _val(a, sort.col), vb = _val(b, sort.col); return va < vb ? -1 : va > vb ? 1 : 0; });
        return sort.dir === 'desc' ? s.reverse() : s;
    };
    const arrow = col => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (col, label, extra) => `<th style="cursor:pointer;${extra || ''}" onclick="execSortDossiersClotures('${col}')">${label}${arrow(col)}</th>`;

    return domIds.map(domId => {
        const rows = sortList(groups[domId]);
        return `
        <div class="card" style="margin-bottom:0.5rem;padding:0.6rem 0.75rem;overflow-x:auto;">
            <div style="margin-bottom:0.35rem;"><strong style="font-size:1rem;">${_esc(_domNom(domId))}</strong></div>
            <table class="exec-data-table exec-compact-table" style="margin-bottom:0;table-layout:fixed;min-width:760px;">
                <thead><tr>
                    ${th('ref', te('reference'), 'width:130px;')}
                    ${th('prest', te('provider'), 'width:150px;')}
                    ${th('objet', te('objet'))}
                    ${th('date', 'Date clôture', 'width:125px;')}
                    ${th('statut', te('status'), 'width:115px;')}
                    <th style="width:110px;text-align:center;">${te('actions')}</th>
                </tr></thead>
                <tbody>
                    ${rows.map(d => {
                        const relNotif = notifications.find(n => n.id === d.notification_id) || {};
                        return `<tr>
                        <td><strong>${_esc(d.reference || d.id)}</strong></td>
                        <td>${_esc(d.prestataire_nom || (prestById[d.prestataire_id] || {}).nom || '')}</td>
                        <td>${_esc(d.notification_objet || d.objet_activite || relNotif.objet_activite || '')}</td>
                        <td style="white-space:nowrap;">${_formatDate(d.date_fin_execution || '')}</td>
                        <td>${_execStatusBadge(d.statut)}</td>
                        <td style="text-align:center;white-space:nowrap;"><div class="exec-cellule-boutons serre">
                            <button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${d.id}','notification')" title="${te('ouvrir_dossier')}">${EXEC_ICONS.openFolder}</button>
                            ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:var(--exec-accent);border-color:var(--exec-accent);" onclick="execArchiveDossier('${d.id}')" title="Archiver">${EXEC_ICONS.folder}</button>` : ''}
                        </div></td>
                    </tr>`}).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

function _renderDossiersArchives(prestataires, dossiers, domaines) {
    const sort = EXEC_STATE.dossierArchivesSort || (EXEC_STATE.dossierArchivesSort = { col: 'date', dir: 'asc' });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    const list = dossiers.filter(d => d.statut === 'archive' && prestById[d.prestataire_id]);
    if (list.length === 0) return `<div class="card"><p style="color:var(--text-muted);">${te('no_data')}</p></div>`;
    const groups = {};
    list.forEach(d => {
        const domId = (prestById[d.prestataire_id] || {}).domaine_id || '';
        (groups[domId] = groups[domId] || []).push(d);
    });
    const _domNom = id => (domaines.find(x => x.id === id) || {}).nom || 'Domaine non défini';
    const domIds = Object.keys(groups).sort((a, b) => _domNom(a).localeCompare(_domNom(b)));
    const _val = (d, col) => {
        const p = prestById[d.prestataire_id] || {};
        if (col === 'ref') return (d.reference || d.id || '').toLowerCase();
        if (col === 'prest') return (d.prestataire_nom || p.nom || '').toLowerCase();
        if (col === 'objet') return (d.notification_objet || d.objet_activite || '').toLowerCase();
        if (col === 'date') return d.date_fin_execution || '';
        return '';
    };
    const sortList = l => {
        const s = [...l].sort((a, b) => { const va = _val(a, sort.col), vb = _val(b, sort.col); return va < vb ? -1 : va > vb ? 1 : 0; });
        return sort.dir === 'desc' ? s.reverse() : s;
    };
    const arrow = col => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (col, label, extra) => `<th style="cursor:pointer;${extra || ''}" onclick="execSortDossiersArchives('${col}')">${label}${arrow(col)}</th>`;

    return domIds.map(domId => {
        const rows = sortList(groups[domId]);
        return `
        <div class="card" style="margin-bottom:0.5rem;padding:0.6rem 0.75rem;overflow-x:auto;">
            <div style="margin-bottom:0.35rem;"><strong style="font-size:1rem;">${_esc(_domNom(domId))}</strong></div>
            <table class="exec-data-table exec-compact-table" style="margin-bottom:0;table-layout:fixed;min-width:760px;">
                <thead><tr>
                    ${th('ref', te('reference'), 'width:130px;')}
                    ${th('prest', te('provider'), 'width:150px;')}
                    ${th('objet', te('objet'))}
                    ${th('date', 'Date clôture', 'width:125px;')}
                    <th style="width:90px;text-align:center;">${te('actions')}</th>
                </tr></thead>
                <tbody>
                    ${rows.map(d => `<tr>
                        <td><strong>${_esc(d.reference || d.id)}</strong></td>
                        <td>${_esc(d.prestataire_nom || (prestById[d.prestataire_id] || {}).nom || '')}</td>
                        <td>${_esc(d.notification_objet || d.objet_activite || '')}</td>
                        <td style="white-space:nowrap;">${_formatDate(d.date_fin_execution || '')}</td>
                        <td style="text-align:center;white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${d.id}','notification')" title="${te('ouvrir_dossier')}">${EXEC_ICONS.openFolder}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

async function execArchiveDossier(dossierId) {
    if (!await oasisConfirmer(te('confirmer_archiver_dossier'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'PUT', body: JSON.stringify({ statut: 'archive' }) });
        await execRefreshDynamic();
        _execToast(te('dossier_archive_ok'), 'success');
        execRenderPage();
    } catch (e) {
        console.error('Archive dossier error:', e);
        _execToast(te('err_archivage'), 'error');
    }
}


