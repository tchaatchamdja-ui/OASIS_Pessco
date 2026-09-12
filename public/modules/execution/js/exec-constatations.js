/* OASIS — Module « Exécution de la Surveillance »
 * Écran 6 — Constatations et plans d’actions correctives.
 *
 * Constatations (y compris hors activité), suivi terrain, PAC et ses preuves, fiches imprimables.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  6. CONSTATATIONS / PAC
// ══════════════════════════════════════

// Sub-nav for Constatations
function execRenderConstatations() {
    const isPrest = _execIsPrestataire();
    // Le prestataire n'a ni la liste « En Préparation » ni le « Suivi Terrain ».
    if (isPrest) EXEC_STATE.currentConstSub = 'suivi';
    const sub = EXEC_STATE.currentConstSub || 'suivi';
    const all = EXEC_STATE.data.constatations || [];
    const PRE_TRANSMIT  = new Set(['brouillon', 'direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const POST_TRANSMIT = new Set(EXEC_CONSTA_EN_VIGUEUR);
    const countList  = all.filter(c => PRE_TRANSMIT.has(c.statut  || '')).length;
    const countSuivi = all.filter(c => POST_TRANSMIT.has(c.statut || '')).length;
    const countTerrain = _execConstaTerrain(all).length;
    // Suivi d'abord, puis En Préparation, puis Suivi Terrain.
    const subNav = `
    <div class="exec-workflow-tabs" style="margin-bottom:1rem;">
        <button class="exec-tab ${sub==='suivi'?'active':''}" onclick="EXEC_STATE.currentConstSub='suivi';execRenderPage();">
            ${te('consta_sub_suivi')} <span class="exec-tab-badge">${countSuivi}</span>
        </button>
        ${isPrest ? '' : `<button class="exec-tab ${sub==='terrain'?'active':''}" onclick="EXEC_STATE.currentConstSub='terrain';execRenderPage();">
            ${te('consta_sub_terrain')} <span class="exec-tab-badge">${countTerrain}</span>
        </button>`}
        ${isPrest ? '' : `<button class="exec-tab ${sub==='list'?'active':''}" onclick="EXEC_STATE.currentConstSub='list';execRenderPage();">
            ${te('consta_sub_list')} <span class="exec-tab-badge">${countList}</span>
        </button>`}
    </div>`;
    if (sub === 'terrain') return _execRenderConstaTerrain(subNav);
    return sub === 'suivi' ? _execRenderConstaSuivi(subNav) : _execRenderConstaList(subNav);
}

// Constatations à l'étape Clôture dont la vérification sur le terrain a été
// demandée par l'AAC, et qui ne sont pas encore soldées.
function _execConstaTerrain(liste) {
    return (liste || []).filter((c) => {
        if ((c.statut || '') === 'soldee') return false;
        let ev = c.commentaire_evaluation;
        if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
        const anac = (ev || {}).evaluation_anac || {};
        const v = anac.verification || {};
        if (!v.verification_terrain) return false;
        // Étape Clôture : acceptation du plan et des preuves prononcées.
        const accepte = (anac.acceptation || {}).accepte === 'OUI' || c.statut === 'pac_valide';
        const preuves = v.preuves_acceptees === 'OUI'
            || (v.isolement_realise === 'OUI' && v.risques_traites === 'OUI')
            || (anac.cloture || {}).mise_en_oeuvre_effective === 'OUI';
        return accepte && preuves;
    });
}

// Shared: apply common filters to a constatation list
function _execApplyConstaFilters(list) {
    const F = EXEC_STATE.filters;
    let filtered = list;
    if (F.statut) filtered = filtered.filter(c => c.statut === F.statut);
    if (F.prestataire) filtered = filtered.filter(c => c.prestataire_id === F.prestataire || (EXEC_STATE.data.dossiers || []).find(d => d.id === c.dossier_id && d.prestataire_id === F.prestataire));
    if (F.domaine) filtered = filtered.filter(c => c.domaine_id === F.domaine || c.domaine === F.domaine);
    if (F.annee) filtered = filtered.filter(c => { const d = c.date_ouverture || c.date_creation || ''; return d.slice(0, 4) === String(F.annee); });
    if (F.trimestre) filtered = filtered.filter(c => { const d = c.date_ouverture || c.date_creation || ''; if (d.length < 7) return false; const m = parseInt(d.slice(5, 7)); return String(Math.ceil(m / 3)) === String(F.trimestre); });
    if (F.criticite) filtered = filtered.filter(c => (c.criticite || c.gravite || '').toLowerCase() === String(F.criticite).toLowerCase());
    if (F.search) { const s = F.search.toLowerCase(); filtered = filtered.filter(c => (c.reference || '').toLowerCase().includes(s) || (c.titre || '').toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s) || (c.prestataire_nom || '').toLowerCase().includes(s)); }
    return filtered;
}

// Shared: render constatation table rows
function _execRenderConstaRows(filtered) {
    const DIRECT_STATUTS = new Set(['direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const OPEN_STATUTS = new Set(EXEC_CONSTA_EN_VIGUEUR);
    if (!filtered.length) return `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>`;
    return filtered.map(c => {
        const domNom = (EXEC_STATE.data.domaines || []).find(d => d.id === c.domaine_id || d.code === c.domaine_id)?.nom || c.domaine_id || c.domaine || '';
        let dueDate = c.date_due_cloture;
        if (!dueDate || dueDate.length < 8 || isNaN(new Date(dueDate).getTime())) {
            const delai = parseInt(c.delai_solde || c.delai_correction || '0');
            const dateOuv = c.date_ouverture || c.date_creation;
            if (delai > 0 && dateOuv) { const dt = new Date(dateOuv); dt.setDate(dt.getDate() + delai); dueDate = dt.toISOString().slice(0, 10); }
            else { dueDate = ''; }
        }
        const isSoldee = (c.statut || '') === 'soldee';
        const dateSolde = c.date_solde ? c.date_solde.slice(0, 10) : '';
        let delaiInfo = '';
        if (isSoldee && dateSolde && dueDate) {
            const diffDays = Math.round((new Date(dateSolde) - new Date(dueDate)) / 86400000);
            delaiInfo = diffDays <= 0
                ? `<span style="color:#16a34a;font-weight:600;">${te('cloturee_dans_delais')}</span>`
                : `<span style="color:#dc2626;font-weight:600;">${te('hors_delais')} (+${diffDays} ${te('jours')})</span>`;
        }
        const dateOuv = c.date_ouverture || (c.date_creation ? c.date_creation.slice(0, 10) : '');
        const rowId = `fnc_accordion_${c.id}`;
        // Sous-menu « Suivi » : la ligne ouvre directement le formulaire de
        // suivi ; ailleurs elle déplie le détail sous la ligne.
        const ouvrePac = (EXEC_STATE.currentConstSub === 'suivi') && OPEN_STATUTS.has(c.statut || '');
        const actionLigne = ouvrePac
            ? `execOpenPACSlider('${c.id}')`
            : `document.getElementById('${rowId}').style.display = document.getElementById('${rowId}').style.display === 'none' ? 'table-row' : 'none';`;
        return `<tr style="cursor:pointer;" onclick="${actionLigne}">
            <td><strong>${_esc(c.reference || '')}</strong>${ouvrePac ? ''
                : ` <span style="font-size:0.7rem;color:var(--text-muted);">${EXEC_ICONS.chevronDown}</span>`}</td>
            <td>${_esc(c.prestataire_nom || '')}</td>
            <td>${_esc(domNom)}</td>
            <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
            <td>${dueDate ? _formatDate(dueDate) : '-'}</td>
            <td>${dueDate ? _daysUntilBadge(dueDate) : '-'}</td>
            <td>${_execStatusBadge(c.statut)}</td>
            <td class="exec-etats-actions" onclick="event.stopPropagation();">
                ${(() => {
                    const st = c.statut || '';
                    const meId = (EXEC_STATE.user || {}).id || '';
                    const isVal = c.valideur_pac_id === meId || _execCanValidate();
                    if (st === 'direct_brouillon' || st === 'direct_renvoye')
                        return `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteFormById('${c.id}')" title="${te('modifier_fnc')}">${EXEC_ICONS.edit||''}</button>`;
                    if (st === 'direct_soumis')
                        return isVal
                            ? `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="${te('valider')}">${EXEC_ICONS.check||''}</button>`
                            : `<button class="btn btn-sm btn-outline" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Consulter">${EXEC_ICONS.eye||''}</button>`;
                    if (st === 'direct_valide')
                        return `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Transmettre">${EXEC_ICONS.send||''}</button>`;
                    if (st === 'direct_rejete')
                        return `<button class="btn btn-sm btn-outline" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Consulter">${EXEC_ICONS.eye||''}</button>`;
                    if (OPEN_STATUTS.has(st))
                        return ouvrePac ? ''
                            : `<button class="btn btn-sm btn-outline" onclick="execOpenPACSlider('${c.id}')" title="${te('suivi_pac')}">${EXEC_ICONS.clipboard}</button>`;
                    return `<button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${c.dossier_id}','constatations')" title="${te('dossier')}">${EXEC_ICONS.file}</button>`;
                })()}
                ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.25rem 0.4rem;" onclick="execDeleteConstatation('${c.id}')" title="${te('delete')}">${EXEC_ICONS.x}</button>` : ''}
            </td>
        </tr>
        <tr id="${rowId}" style="display:none;">
            <td colspan="8" style="padding:0.6rem 1rem;background:var(--bg);border-top:none;">
                <div style="display:grid;gap:0.5rem;font-size:0.8rem;">
                    <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('description_constatation')}</span>
                    <p style="margin:0.2rem 0 0;">${_esc(c.description || c.titre || '-')}</p></div>
                    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;">
                        <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_ouverture') || "Date d'ouverture"}</span><div>${dateOuv ? _formatDate(dateOuv) : '-'}</div></div>
                        <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_due_label')}</span><div style="color:#dc2626;font-weight:600;">${dueDate ? _formatDate(dueDate) : '-'}</div></div>
                        ${isSoldee ? `<div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_solde')}</span><div style="color:#16a34a;font-weight:600;">${dateSolde ? _formatDate(dateSolde) : '-'}</div></div>` : ''}
                        ${delaiInfo ? `<div>${delaiInfo}</div>` : ''}
                    </div>
                    ${c.motif_rejet_pac && c.statut === 'direct_rejete' ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:#fef2f2;border-left:3px solid #dc2626;border-radius:3px;font-size:0.8rem;"><strong style="color:#dc2626;">${te('motif_rejet_label')}</strong> ${_esc(c.motif_rejet_pac)}</div>` : ''}
                    ${c.motif_renvoi && c.statut === 'direct_renvoye' ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:#fff7ed;border-left:3px solid #f97316;border-radius:3px;font-size:0.8rem;"><strong style="color:#f97316;">${te('motif_renvoi_label')}</strong> ${_esc(c.motif_renvoi)}</div>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Sub-menu 1 : Constatations — brouillons (avant transmission)
function _execRenderConstaList(subNav) {
    const allConstatations = EXEC_STATE.data.constatations || [];
    const isPrest = _execIsPrestataire();
    // Statuts pré-transmission : brouillon normal + workflow direct avant transmit
    const PRE_TRANSMIT = new Set(['brouillon', 'direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const base = allConstatations.filter(c => PRE_TRANSMIT.has(c.statut || ''));
    const filtered = _execApplyConstaFilters(base);
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    const canCreateDirect = !isPrest && (typeof _execCanContribute === 'function' ? _execCanContribute() : true);
    EXEC_STATE.constaExport = filtered.map((c) => c.id);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('consta_sub_list')}</h2>
            <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            ${_execBoutonsExport()}
            ${canCreateDirect ? `<button class="btn btn-primary exec-btn-27" onclick="execOpenConstatationDirecteForm()">${EXEC_ICONS.plus || '+'} Nouvelle Constatation</button>` : ''}
        </div>
        </div>
        ${subNav}
        ${_execRenderFilterBar('execRenderPage()', filterOpts)}
        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
              <thead><tr>
                <th style="width:160px;">${te('ref_consta')}</th><th style="width:180px;">${te('provider')}</th>
                <th style="width:190px;">${te('domaine')}</th><th style="width:110px;">${te('criticite')}</th>
                <th style="width:100px;">${te('date_due')}</th><th style="width:100px;">${te('echeance')}</th>
                <th style="width:130px;">${te('statut_pac')}</th>
                <th style="width:130px;text-align:center;">${te('actions')}</th>
              </tr></thead>
              <tbody>${_execRenderConstaRows(filtered)}</tbody>
            </table>
          </div>
        </div>
    </div>`;
}

// Sub-menu 2 : Suivi — constatations ouvertes (post-transmission) + PAC workflow
function _execRenderConstaSuivi(subNav) {
    const allConstatations = EXEC_STATE.data.constatations || [];
    const isPrest = _execIsPrestataire();
    // Statuts post-transmission : ouvert/ouverte (compat) + PAC + soldée
    const POST_TRANSMIT = new Set(EXEC_CONSTA_EN_VIGUEUR);
    const base = allConstatations.filter(c => POST_TRANSMIT.has(c.statut || ''));
    const filtered = _execApplyConstaFilters(base);
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    EXEC_STATE.constaExport = filtered.map((c) => c.id);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('consta_sub_suivi')}</h2>
            ${_execBoutonsExport()}
        </div>
        ${subNav}
        ${_execRenderFilterBar('execRenderPage()', filterOpts)}
        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
              <thead><tr>
                <th style="width:160px;">${te('ref_consta')}</th><th style="width:180px;">${te('provider')}</th>
                <th style="width:190px;">${te('domaine')}</th><th style="width:110px;">${te('criticite')}</th>
                <th style="width:100px;">${te('date_due')}</th><th style="width:100px;">${te('echeance')}</th>
                <th style="width:130px;">${te('statut_pac')}</th>
                <th style="width:130px;text-align:center;">${te('actions')}</th>
              </tr></thead>
              <tbody>${_execRenderConstaRows(filtered)}</tbody>
            </table>
          </div>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  Export des constatations : classeur et document imprimable
// ══════════════════════════════════════
// Les deux exports portent sur la liste telle qu'elle est affichée : les
// filtres actifs sont donc appliqués, et rappelés en tête du document.
function _execBoutonsExport() {
    return `<div class="exec-export-actions">
        <button class="btn btn-sm btn-primary" onclick="execExporterConstatationsPdf()">
            ${EXEC_ICONS.download} ${te('export_pdf')}
        </button>
        <button class="btn btn-sm btn-primary" onclick="execExporterConstatationsXlsx()">
            ${EXEC_ICONS.download} ${te('export_excel')}
        </button>
    </div>`;
}

function _execFiltresLisibles() {
    const F = EXEC_STATE.filters || {};
    const nom = (coll, id) => (EXEC_STATE.data[coll] || []).find((x) => x.id === id)?.nom || id;
    const parts = [];
    if (F.domaine) parts.push(`${te('domaine')} : ${nom('domaines', F.domaine)}`);
    if (F.prestataire) parts.push(`${te('provider')} : ${nom('prestataires', F.prestataire)}`);
    if (F.annee) parts.push(`${te('exp_annee')} : ${F.annee}`);
    if (F.trimestre) parts.push(`${te('trimestre')} : T${F.trimestre}`);
    if (F.criticite) parts.push(`${te('criticite')} : ${F.criticite}`);
    if (F.statut) parts.push(`${te('statut')} : ${F.statut}`);
    if (F.search) parts.push(`${te('exp_recherche')} : « ${F.search} »`);
    return parts.length ? parts.join('   ·   ') : (te('aucun_filtre'));
}

function _execTitreSousMenu() {
    const sub = EXEC_STATE.currentConstSub || 'suivi';
    if (sub === 'terrain') return te('consta_sub_terrain');
    if (sub === 'suivi') return `${te('constatations')} — ${te('consta_sub_suivi')}`;
    return `${te('constatations')} — ${te('consta_sub_list')}`;
}

function _execConstatationsExportees() {
    const ids = EXEC_STATE.constaExport || [];
    const par = new Map((EXEC_STATE.data.constatations || []).map((c) => [c.id, c]));
    return ids.map((id) => par.get(id)).filter(Boolean);
}

async function execExporterConstatationsXlsx() {
    const ids = EXEC_STATE.constaExport || [];
    if (!ids.length) { _execToast(te('no_data'), 'warning'); return; }

    // Voie normale : le navigateur télécharge lui-même la réponse, guidé par
    // l'en-tête Content-Disposition. Aucune manipulation de blob, donc rien
    // que le navigateur puisse écarter silencieusement.
    const parametres = new URLSearchParams({
        ids: ids.join(','), titre: _execTitreSousMenu(), filtres: _execFiltresLisibles(),
    });
    const url = `${EXEC_MODULE_API}/constatations/export-xlsx?${parametres}`;
    if (url.length < 6000) { window.location.href = url; return; }

    // Liste trop longue pour une URL : on repasse par le corps de requête.
    try {
        const reponse = await fetch(`${EXEC_MODULE_API}/constatations/export-xlsx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: JSON.stringify({ ids, titre: _execTitreSousMenu(), filtres: _execFiltresLisibles() }),
        });
        // 404 : la route d'export n'est pas montée — serveur à redémarrer.
        if (reponse.status === 404) throw new Error(te('export_route_absente'));
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        const blob = await reponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `constatations-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
        console.error('Export xlsx :', e);
        _execToast((e && e.message) || 'Erreur lors de l\'export', 'error');
    }
}

// Document imprimable : mise en page A4, un dossier par bloc, coupures
// maîtrisées. L'impression du navigateur produit le PDF.
function execExporterConstatationsPdf() {
    const liste = _execConstatationsExportees();
    if (!liste.length) { _execToast(te('no_data'), 'warning'); return; }
    const aac = EXEC_STATE.data.aac || {};
    const entete = `${_esc(aac.sigle || '')}${aac.nom ? ` — ${_esc(aac.nom)}` : ''}`;
    const lieu = [aac.ville, aac.pays].filter(Boolean).map(_esc).join(', ');
    const aujourdhui = new Date().toLocaleDateString('fr-FR');

    const dossiers = liste.map((c, i) => {
        let ev = c.commentaire_evaluation;
        if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
        ev = ev || {};
        const anac = ev.evaluation_anac || {};
        const verif = anac.verification || {};
        const pac = (c.actions_correctives || [])[0] || {};
        const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === c.domaine_id || d.code === c.domaine_id);
        const commentaires = [
            ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
                date: x.date, auteur: x.auteur, items: [cle === 'cause_primaire' ? 'cause' : cle], texte: x.texte,
            }))),
            ...(ev.suivi_commentaires || []).filter((x) => x.publie),
        ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const preuves = [...(pac.curative_preuves || []), ...(pac.corrective_preuves || [])];

        const champ = (l, v) => `<div><span>${l}</span><strong>${v || '—'}</strong></div>`;
        const bloc = (t, corps) => `<section><h3>${t}</h3>${corps || '<p class="vide">—</p>'}</section>`;

        return `<article class="fnc"${i ? ' style="page-break-before:always;"' : ''}>
            <h2>${_esc(c.reference || '')} <small>${_esc(c.prestataire_nom || '')}</small></h2>
            <div class="grille">
                ${champ(te('domaine'), _esc(dom ? dom.nom : (c.domaine_id || '')))}
                ${champ(te('criticite'), _esc(c.criticite || c.gravite || ''))}
                ${champ(te('date_ouverture'), c.date_ouverture ? _formatDate(c.date_ouverture) : '')}
                ${champ(te('delai_label'), `${_esc(c.delai_solde || '')} ${te('jours')}`)}
                ${champ(te('ref_reglementaires_label'), _esc(c.ref_reglementaires || c.exigence_ref || ''))}
                ${champ(te('verifier_terrain'), verif.verification_terrain ? te('oui_label') : te('non_label'))}
            </div>
            ${bloc(te('description_constatation'), `<p>${_esc(c.description || c.titre || '')}</p>`)}
            ${bloc(te('cause_root'), `<p>${_esc(pac.cause_primaire || '')}</p>`)}
            ${bloc(`${te('action_curative_correction')}${pac.curative_date_prevue ? ` — ${te('date_prevue')} : ${_formatDate(pac.curative_date_prevue)}` : ''}`,
                `<p>${_esc(pac.action_curative || '')}</p>`)}
            ${bloc(`${te('action_corrective_prevention')}${pac.corrective_date_prevue ? ` — ${te('date_prevue')} : ${_formatDate(pac.corrective_date_prevue)}` : ''}`,
                `<p>${_esc(pac.actions_correctives || '')}</p>`)}
            ${bloc(te('preuves_action'), preuves.length
                ? `<ol>${preuves.map((p) => `<li>${_esc(p.intitule || p.filename || '')}${p.date ? ` <em>(${_formatDate(String(p.date).slice(0, 10))})</em>` : ''}${p.commentaire ? ` — ${_esc(p.commentaire)}` : ''}</li>`).join('')}</ol>` : '')}
            ${bloc(te('details_suivi'), commentaires.length
                ? `<table><tbody>${commentaires.map((x) => `<tr>
                        <td class="date">${x.date ? _formatDate(String(x.date).slice(0, 10)) : ''}</td>
                        <td class="auteur">${_esc(x.auteur || '')}</td>
                        <td>${(x.items || []).map((k) => `<em>${_esc(k === 'autres' ? (x.precision || te('motif_autres')) : te(`item_${k}`))}</em>`).join(', ')} — ${_esc(x.texte || '')}</td>
                    </tr>`).join('')}</tbody></table>` : '')}
            ${bloc(te('commentaire_general_suivi'), (verif.suivis || []).length
                ? `<table><tbody>${(verif.suivis || []).map((s) => `<tr>
                        <td class="date">${s.date ? _formatDate(String(s.date).slice(0, 10)) : ''}</td>
                        <td class="auteur">${_esc(s.auteur || '')}</td>
                        <td>${_esc(s.texte || '')}</td>
                    </tr>`).join('')}</tbody></table>` : '')}
            <div class="visa">
                <div><span>${te('visa_inspecteur')}</span></div>
                <div><span>${te('visa_prestataire')}</span></div>
            </div>
        </article>`;
    }).join('');

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${te('consta_sub_terrain')} — ${aujourdhui}</title>
    <style>
      @page { size: A4; margin: 14mm 12mm 16mm; }
      /* Sans cela, les navigateurs suppriment les aplats de couleur à
         l'impression : bandeaux de section, pastilles, filets colorés. */
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font: 11px/1.45 "Helvetica Neue", Arial, sans-serif; color: #16202c; margin: 0; }
      header.doc { display: flex; align-items: center; gap: 10px;
                   border-bottom: 2px solid #12406b; padding-bottom: 6px; margin-bottom: 12px; }
      header.doc .logo { height: 46px; width: auto; flex: 0 0 auto; }
      header.doc .titre { flex: 1; }
      header.doc .lieu { font-size: 9.5px; color: #5b6b7d; }
      header.doc .sigle { font-size: 12px; font-weight: 700; color: #12406b; letter-spacing: .02em; }
      header.doc h1 { font-size: 17px; margin: 4px 0 2px; }
      header.doc .meta { font-size: 10px; color: #5b6b7d; }
      article.fnc { border: 1px solid #dde4ec; border-radius: 4px; padding: 8px 10px 10px; margin-bottom: 10px; }
      article.fnc h2 { font-size: 13px; margin: 0 0 6px; color: #12406b; border-bottom: 1px solid #dde4ec; padding-bottom: 4px; }
      article.fnc h2 small { float: right; font-weight: 500; color: #5b6b7d; font-size: 11px; }
      .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 12px; margin-bottom: 8px; }
      .grille span { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d; }
      .grille strong { font-size: 11px; font-weight: 600; }
      section { margin-top: 7px; break-inside: avoid; }
      section h3 { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #5b6b7d;
                   margin: 0 0 3px; border-bottom: 1px dotted #dde4ec; padding-bottom: 2px; }
      section p { margin: 0; }
      section ol { margin: 0; padding-left: 16px; }
      section table { width: 100%; border-collapse: collapse; }
      section td { border-bottom: 1px solid #eef2f6; padding: 2px 4px 2px 0; vertical-align: top; }
      td.date { width: 62px; color: #5b6b7d; white-space: nowrap; }
      td.auteur { width: 110px; font-weight: 600; }
      .vide { color: #98a5b3; }
      .visa { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; break-inside: avoid; }
      .visa div { border-top: 1px solid #98a5b3; padding-top: 3px; height: 42px; }
      .visa span { font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d; }
      footer.doc { position: fixed; bottom: 4mm; left: 0; right: 0; font-size: 8.5px; color: #5b6b7d;
                   border-top: 1px solid #dde4ec; padding-top: 3px; }
      @media print { article.fnc { border-color: #c9d3de; } }
    </style></head><body>
    <header class="doc">
        ${aac.logo ? `<img class="logo" src="${aac.logo}" alt="">` : ''}
        <div class="titre">
            <div class="sigle">${entete}</div>
            ${lieu ? `<div class="lieu">${lieu}</div>` : ''}
            <h1>${te('consta_sub_terrain')}</h1>
            <div class="meta">${_esc(_execFiltresLisibles())} &nbsp;·&nbsp; ${liste.length} ${te('a_verifier_terrain')} &nbsp;·&nbsp; ${te('edite_le')} ${aujourdhui}</div>
        </div>
    </header>
    ${dossiers}
    <footer class="doc">OASIS — ${entete} · ${te('consta_sub_terrain')} · ${aujourdhui}</footer>
    </body></html>`;

    const fenetre = window.open('', '_blank');
    if (!fenetre) { _execToast(te('bloqueur_fenetre'), 'warning'); return; }
    fenetre.document.write(html);
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 350);
}

// ══════════════════════════════════════
//  Sous-menu « Suivi Terrain »
// ══════════════════════════════════════
// Table des constatations à vérifier sur place, chacune dépliable sur le
// rappel de la constatation, le plan d'actions et les commentaires.
function _execRenderConstaTerrain(subNav) {
    const filtered = _execApplyConstaFilters(_execConstaTerrain(EXEC_STATE.data.constatations || []));
    const isPrest = _execIsPrestataire();
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    EXEC_STATE.constaExport = filtered.map((c) => c.id);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('consta_sub_terrain')}</h2>
            ${_execBoutonsExport()}
        </div>
        ${subNav}
        ${_execRenderFilterBar('execRenderPage()', filterOpts)}
        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:900px;">
              <thead><tr>
                <th style="width:180px;">${te('ref_consta')}</th><th style="width:180px;">${te('provider')}</th>
                <th style="width:190px;">${te('domaine')}</th><th style="width:110px;">${te('criticite')}</th>
                <th style="width:110px;">${te('date_due')}</th>
                <th style="width:120px;text-align:center;">${te('actions')}</th>
              </tr></thead>
              <tbody>${_execTerrainLignes(filtered)}</tbody>
            </table>
          </div>
        </div>
    </div>`;
}

function _execTerrainLignes(liste) {
    if (!liste.length) {
        return `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>`;
    }
    return liste.map((c, i) => {
        const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === c.domaine_id || d.code === c.domaine_id);
        let due = c.date_due_cloture;
        if (!due || due.length < 8) {
            const delai = parseInt(c.delai_solde || c.delai_correction || '0', 10);
            const ouv = c.date_ouverture || c.date_creation;
            if (delai > 0 && ouv) { const d = new Date(ouv); d.setDate(d.getDate() + delai); due = d.toISOString().slice(0, 10); }
            else due = '';
        }
        return `<tr class="exec-terrain-ligne" onclick="execTerrainBasculer(${i})">
            <td><span class="exec-terrain-chevron" id="terrain_chev_${i}">${EXEC_ICONS.chevronDown}</span><strong>${_esc(c.reference || '')}</strong></td>
            <td>${_esc(c.prestataire_nom || '')}</td>
            <td>${_esc(dom ? dom.nom : (c.domaine_id || ''))}</td>
            <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
            <td>${due ? _formatDate(due) : '-'}</td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-outline" title="${te('suivi_pac')}"
                        onclick="event.stopPropagation();execOpenPACSlider('${c.id}')">${EXEC_ICONS.eye || EXEC_ICONS.file}</button>
            </td>
        </tr>
        <tr class="exec-terrain-detail" id="terrain_detail_${i}" hidden>
            <td colspan="6">${_execTerrainDetailHtml(c)}</td>
        </tr>`;
    }).join('');
}

window.execTerrainBasculer = function (i) {
    const ligne = document.getElementById(`terrain_detail_${i}`);
    const chev = document.getElementById(`terrain_chev_${i}`);
    if (!ligne) return;
    ligne.hidden = !ligne.hidden;
    if (chev) chev.classList.toggle('ouvert', !ligne.hidden);
};

// Volet déroulant : rappel de la constatation, plan d'actions, commentaires.
function _execTerrainDetailHtml(c) {
    let ev = c.commentaire_evaluation;
    if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
    ev = ev || {};
    const anac = ev.evaluation_anac || {};
    const pac = (c.actions_correctives || [])[0] || {};
    const suivis = (anac.verification || {}).suivis || [];
    const commentaires = [
        ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
            date: x.date || '', auteur: x.auteur || '', items: [cle === 'cause_primaire' ? 'cause' : cle],
            precision: '', texte: x.texte || '', publie: true,
        }))),
        ...(ev.suivi_commentaires || []).filter((x) => x.publie),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const vide = `<em class="exec-terrain-vide">—</em>`;
    // Un bloc : titre, éventuelle date d'échéance en pastille, contenu.
    const bloc = (titre, contenu, date) => `<div class="exec-terrain-bloc">
        <div class="exec-terrain-bloc-titre">
            <span>${titre}</span>
            ${date ? `<span class="exec-terrain-echeance" title="${te('date_prevue')}">${_formatDate(date)}</span>` : ''}
        </div>
        <div class="exec-terrain-bloc-corps">${contenu || vide}</div>
    </div>`;
    const champ = (libelle, valeur) => `<div class="exec-terrain-champ">
        <span>${libelle}</span><strong>${valeur}</strong>
    </div>`;

    return `<div class="exec-terrain-detail-corps">
        <!-- Rappel de la constatation, pleine largeur -->
        <div class="exec-terrain-bloc exec-terrain-rappel-bloc">
            <div class="exec-terrain-bloc-titre"><span>${te('rappel_constatation')}</span></div>
            <div class="exec-terrain-champs">
                ${champ(te('date_ouverture'), c.date_ouverture ? _formatDate(c.date_ouverture) : '—')}
                ${champ(te('delai_label'), `${_esc(c.delai_solde || '—')} ${te('jours')}`)}
                ${champ(te('date_due_label'), (() => {
                    const delai = parseInt(c.delai_solde || '0', 10);
                    const ouv = c.date_ouverture || (c.date_creation || '').slice(0, 10);
                    if (c.date_due_cloture) return _formatDate(c.date_due_cloture.slice(0, 10));
                    if (!delai || !ouv) return '—';
                    const d = new Date(ouv); d.setDate(d.getDate() + delai);
                    return _formatDate(d.toISOString().slice(0, 10));
                })())}
                ${champ(te('ref_reglementaires_label'), _esc(c.ref_reglementaires || c.exigence_ref || '—'))}
            </div>
            <p class="exec-terrain-description">${_esc(c.description || c.titre || '')}</p>
        </div>

        <!-- Le plan d'actions : cause, action curative, action corrective -->
        <div class="exec-terrain-grille-3">
            ${bloc(te('cause_root'), _esc(pac.cause_primaire || ''))}
            ${bloc(te('action_curative_correction'), _esc(pac.action_curative || ''), pac.curative_date_prevue)}
            ${bloc(te('action_corrective_prevention'), _esc(pac.actions_correctives || ''), pac.corrective_date_prevue)}
        </div>

        <!-- Les deux fils de commentaires -->
        <div class="exec-terrain-grille-2">
            ${bloc(`${te('details_suivi')}${commentaires.length ? ` <b>${commentaires.length}</b>` : ''}`,
                commentaires.length
                    ? `<div class="exec-terrain-fil">${commentaires.map((x) => _execCommentaireSuiviHtml(x, false)).join('')}</div>`
                    : '')}
            ${bloc(`${te('commentaire_general_suivi')}${suivis.length ? ` <b>${suivis.length}</b>` : ''}`,
                suivis.length
                    ? `<div class="exec-terrain-fil">${suivis.map((s) => _execSuiviHtml(s, false)).join('')}</div>`
                    : '')}
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  CONSTATATION DIRECTE — create + workflow
// ══════════════════════════════════════
// Workflow Directe: direct_brouillon → direct_soumis → direct_valide/direct_rejete
//                  → ouvert (transmitted) → PAC workflow (pac_soumis → pac_valide → soldee).
// Workflow Normal:  brouillon (created in dossier) → ouvert (when rapport transmitted)
//                  → PAC workflow.

// Open direct constatation form in edit mode (fetches fresh data by ID)
async function execOpenConstatationDirecteFormById(fncId) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); _execToast(te('err_chargement'), 'error'); return; }
    execOpenConstatationDirecteForm(fnc);
}


// ── Helpers: Secteur/Exigences dynamic update ───────────────────────────────
function execCdOnPrestataireChange() {
    const prestId = document.getElementById('cd_prestataire')?.value || '';
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestId);
    const secteurId = prest?.secteur_id || '';
    const secteur = (EXEC_STATE.data.secteurs || []).find(s => s.id === secteurId);
    const domaineId = secteur?.domaine_id || '';
    const secteurSel = document.getElementById('cd_secteur');
    if (secteurSel) secteurSel.value = secteurId;
    const domaineSel = document.getElementById('cd_domaine');
    if (domaineSel) domaineSel.value = domaineId;
    execCdUpdateExigences(secteurId);
}

function execCdOnSecteurChange() {
    const secteurId = document.getElementById('cd_secteur')?.value || '';
    execCdUpdateExigences(secteurId);
}

function execCdUpdateExigences(secteurId) {
    const all = EXEC_STATE.data.exigences || [];
    const filtered = secteurId
        ? all.filter(e => e.secteur_id === secteurId && (e.statut || 'actif') !== 'inactif')
        : all.filter(e => (e.statut || 'actif') !== 'inactif');
    const list = document.getElementById('cd_exig_list');
    if (!list) return;
    list.innerHTML = filtered.map(e =>
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');
}

function execCdAddRef(raw) {
    const ref = (raw || '').split(' — ')[0].trim();
    if (!ref) return;
    const container = document.getElementById('cd_ref_tags');
    const input = document.getElementById('cd_ref_input');
    if (!container || !input) return;
    // Deduplicate
    const existing = Array.from(container.querySelectorAll('.cd-ref-tag')).map(t => t.dataset.ref);
    if (existing.includes(ref)) return;
    const exig = (EXEC_STATE.data.exigences || []).find(e => e.reference === ref);
    const tag = document.createElement('span');
    tag.className = 'cd-ref-tag';
    tag.dataset.ref = ref;
    if (exig?.libelle) tag.title = exig.libelle;
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;';
    tag.innerHTML = `${_esc(ref)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button>`;
    container.insertBefore(tag, input);
}

// ══════════════════════════════════════
//  Constatation hors activités de supervision : fil d'avancement
// ══════════════════════════════════════
// Trois étapes : Préparation (de la création à la soumission), Validation
// (de la soumission au prononcé) et Transmission (remise au prestataire).
// Un rejet ou un renvoi ramène en préparation.
const EXEC_CD_ETAPES = [
    { id: 'preparation', cle: 'cd_etape_preparation' },
    { id: 'validation', cle: 'cd_etape_validation' },
    { id: 'transmission', cle: 'cd_etape_transmission' },
];

// La constatation est remise au prestataire : elle entre alors dans le suivi
// du PAC, sous les statuts communs aux constatations d'activité.
const EXEC_CD_TRANSMISES = ['ouvert', 'ouverte', 'pac_soumis', 'pac_valide',
    'pac_rejetee', 'soldee'];
function _execCdTransmise(statut) {
    return EXEC_CD_TRANSMISES.includes(String(statut || ''));
}

function execCdEtat(statut) {
    const st = String(statut || 'direct_brouillon');
    // Un renvoi ramène en préparation, pour correction. Un rejet arrête le
    // circuit : la constatation ne repart pas, elle se lit.
    const renvoye = st === 'direct_renvoye';
    const rejete = st === 'direct_rejete';
    const soumis = !renvoye && ['direct_soumis', 'direct_rejete', 'direct_valide',
        'ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee'].includes(st);
    const valide = ['direct_valide', 'ouvert', 'ouverte', 'pac_soumis', 'pac_valide',
        'pac_rejetee', 'soldee'].includes(st);
    const faites = { preparation: soumis, validation: valide, transmission: _execCdTransmise(st) };
    return {
        faites,
        renvoye,
        rejete,
        courante: rejete ? 'validation'
            : (EXEC_CD_ETAPES.map((e) => e.id).find((id) => !faites[id]) || null),
    };
}

// Étape consultée dans le formulaire hors activités : le fil sert à la
// parcourir, jamais à agir — comme le fil du processus Activité.
let EXEC_CD = { id: '', etape: '' };

// Une étape n'est consultable qu'une fois atteinte.
function execCdOuvertes(statut) {
    const etat = execCdEtat(statut);
    return {
        preparation: true,
        validation: etat.faites.preparation,
        transmission: etat.faites.validation,
    };
}

// Étape à consulter par défaut : celle où en est la constatation.
function execCdEtapeDefaut(statut) {
    return execCdEtat(statut).courante || 'transmission';
}

window.execCdConsulter = function (etape) {
    if (!EXEC_CD.id) return;
    execOpenConstatationDirecteSlider(EXEC_CD.id, etape);
};

// Le fil se parcourt d'une traite : ni glissement du volet, ni fondu du corps
// entre deux étapes.
// Décisions prises à la Validation : chaque renvoi, chaque rejet, daté,
// signé et motivé. L'historique sert à réviser une constatation corrigée —
// on relit ce qui avait été demandé avant de se prononcer de nouveau.
function _execCdDecisions(c) {
    const journal = Array.isArray(c.decisions_validation) ? c.decisions_validation : [];
    if (journal.length) return journal;
    // Constatations antérieures au journal : le dernier motif en tient lieu.
    if (c.motif_renvoi) {
        return [{ type: 'renvoi', motif: c.motif_renvoi, date: c.date_renvoi || '', auteur: '' }];
    }
    if (c.motif_rejet_pac) {
        return [{ type: 'rejet', motif: c.motif_rejet_pac, date: c.date_rejet_pac || '', auteur: '' }];
    }
    return [];
}

// Consigne une décision sans écraser les précédentes.
function _execCdJournaliser(c, type, motif) {
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim()
        || user.email || user.username || '';
    return [..._execCdDecisions(c), {
        type, motif, auteur, date: new Date().toISOString(),
    }];
}

function _execCdHistoriqueHtml(c) {
    const journal = _execCdDecisions(c);
    if (!journal.length) return '';
    const lignes = journal.slice().reverse().map((d, i) => `
        <div class="exec-cd-decision${d.type === 'rejet' ? ' rejet' : ''}">
            <div class="exec-cd-decision-tete">
                <span class="exec-cd-decision-type">${d.type === 'rejet' ? te('motif_rejet_titre') : te('motif_renvoi_titre')}</span>
                <span class="exec-cd-decision-rang">${journal.length - i}/${journal.length}</span>
                <span>${_esc(d.auteur || '')}</span>
                <span>${d.date ? _formatDate(String(d.date).slice(0, 10)) : ''}</span>
            </div>
            <div class="exec-cd-decision-motif">${_esc(d.motif || '')}</div>
        </div>`).join('');
    // Ce bandeau n'est pas une section du formulaire : il n'en porte ni la
    // lettre ni la hauteur. Rouge, à mi-hauteur, il signale un incident de
    // parcours plutôt qu'une rubrique à remplir.
    return `
    <div class="exec-form-section expanded exec-cd-journal">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-title">${te('historique_decisions')}</span>
            <span class="exec-form-section-aide">${_esc(te('aide_historique_decisions'))}</span>
            <span class="exec-form-section-badge">${journal.length}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">${lignes}</div>
    </div>`;
}

// ══════════════════════════════════════
//  Commentaires de validation (constatation hors activités)
// ══════════════════════════════════════
// Même principe que la fiche d'inspection du module SAFA : le valideur annote
// champ par champ, ses observations vivent par versions, et la décision les
// fige. Le motif de renvoi n'est plus une phrase saisie à part : ce sont ces
// commentaires, rendus en tête du formulaire à corriger.

// État de saisie du panneau, propre à la constatation ouverte.
let EXEC_CD_COM = { id: '', saisie: [], replie: false, versionsOuvertes: {} };

// Ce sur quoi porte un commentaire : les champs du formulaire, ses sections,
// ou la constatation dans son ensemble.
function execCdCibles() {
    return [
        { groupe: te('general'), options: [['general', 'Commentaire général']] },
        { groupe: 'A — Identification', options: [
            ['prestataire', te('provider')],
            ['emis_par', te('emis_par')],
            ['adresse_a', te('adresse_a')],
            ['date_ouverture', te('date_ouverture') || "Date d'ouverture"],
            ['source', te('source')],
            ['domaine', te('domaine')],
            ['secteur', 'Secteur'],
        ] },
        { groupe: 'B — Constat', options: [
            ['ref_reglementaires', te('ref_reglementaires')],
            ['titre', 'Titre'],
            ['description', 'Description'],
        ] },
        { groupe: 'C — Traitement', options: [
            ['criticite', te('criticite')],
            ['date_due', te('date_due') || "Date d'échéance"],
            ['pieces', te('pieces_jointes')],
        ] },
    ];
}

function execCdLibelleCible(cle) {
    for (const g of execCdCibles()) {
        const t = g.options.find(([v]) => v === cle);
        if (t) return t[1];
    }
    return cle || 'Commentaire général';
}

const execCdVersions = (c) => (c && Array.isArray(c.commentaires_validation))
    ? c.commentaires_validation : [];
const execCdVersionCourante = (c) => execCdVersions(c).find((v) => !v.close_le) || null;

// Horodatage sur une ligne : « le 29/08/2026 à 09:12 par KOFFI Ama ».
function execCdQuand(iso, par) {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `le ${date} à ${heure}${par ? ` par ${par}` : ''}`;
}

// Panneau latéral : bandeau ambré, saisie de la version en cours, versions
// précédentes repliées.
function execCdCommentairesHtml(c, modifiable) {
    const versions = execCdVersions(c).slice().reverse();
    const courante = execCdVersionCourante(c);
    const saisie = EXEC_CD_COM.saisie || [];
    const nombre = modifiable ? saisie.length : ((courante && courante.entrees) || []).length;
    const replie = EXEC_CD_COM.replie;

    const poignee = `<button class="exec-cd-com-poignee" type="button"
            title="${replie ? 'Déplier' : 'Replier'}"
            onclick="execCdBasculerCommentaires()">${EXEC_ICONS.chevronLeft || EXEC_ICONS.back || '‹'}</button>`;

    // Replié, le panneau se réduit à sa poignée, qui porte l'intitulé.
    if (replie) {
        return `<button class="exec-cd-com-poignee pleine" type="button"
                title="${te('deplier')}" onclick="execCdBasculerCommentaires()">
            ${EXEC_ICONS.chevronLeft || EXEC_ICONS.back || '‹'}
            <span class="exec-cd-com-titre-replie">${te('commentaires_validation')}${nombre ? ` (${nombre})` : ''}</span>
        </button>`;
    }

    const entree = (x, i) => `
        <div class="exec-cd-com-entree">
            <div class="exec-cd-com-entree-tete">
                <select class="form-select" onchange="execCdCommentaireChamp(${i}, 'cible', this.value)">
                    ${execCdCibles().map((g) => `<optgroup label="${_escAttr(g.groupe)}">
                        ${g.options.map(([v, l]) => `<option value="${_escAttr(v)}"
                            ${x.cible === v ? 'selected' : ''}>${_esc(l)}</option>`).join('')}
                    </optgroup>`).join('')}
                </select>
                <button class="btn btn-outline btn-sm" title="Retirer"
                        onclick="execCdRetirerCommentaire(${i})">${EXEC_ICONS.x}</button>
            </div>
            <textarea class="form-input exec-cd-com-texte" rows="2" placeholder="${te('observation_valideur')}"
                      oninput="execCdCommentaireChamp(${i}, 'texte', this.value)">${_esc(x.texte || '')}</textarea>
        </div>`;

    const lu = (x) => `
        <div class="exec-cd-com-lu"><i>${_esc(execCdLibelleCible(x.cible))}</i>
            <div>${_esc(x.texte)}</div></div>`;

    const close = (v) => {
        const ouvert = !!EXEC_CD_COM.versionsOuvertes[v.version];
        const issue = v.issue === 'validation' ? 'Validée'
            : (v.issue === 'rejet' ? 'Rejetée' : 'Renvoyée');
        return `
        <div class="exec-cd-com-version">
            <button class="exec-cd-com-version-tete" type="button" aria-expanded="${ouvert}"
                    onclick="execCdBasculerVersion(${v.version})">
                <span class="exec-cd-com-chevron${ouvert ? ' ouvert' : ''}">${EXEC_ICONS.chevronDown}</span>
                <strong>Version ${v.version}</strong>
                <span class="exec-cd-com-issue ${v.issue}">${issue}</span>
                <span class="exec-cd-com-quand">${_esc(execCdQuand(v.close_le, v.close_par))}</span>
            </button>
            ${ouvert ? `<div class="exec-cd-com-corps">
                ${(v.entrees || []).length ? v.entrees.map(lu).join('')
                    : `<div class="exec-cd-com-vide">${te('aucun_commentaire_version')}</div>`}
            </div>` : ''}
        </div>`;
    };

    return `${poignee}
    <div class="exec-cd-com-panneau">
        <div class="exec-cd-com-bandeau">
            <span class="exec-cd-com-pastille">i</span>
            <strong>${te('commentaires_validation')}</strong>
            <span class="exec-cd-com-compte">${nombre}</span>
        </div>
        <div class="exec-cd-com-contenu">
            ${modifiable ? `
                ${saisie.map(entree).join('')}
                <div class="exec-cd-com-actions">
                    <button class="btn btn-outline btn-sm" onclick="execCdAjouterCommentaire()">
                        ${EXEC_ICONS.plus || '+'} Ajouter</button>
                    <button class="btn btn-primary btn-sm" onclick="execCdEnregistrerCommentaires()">
                        ${EXEC_ICONS.check} Enregistrer</button>
                </div>
`
            : `${courante && (courante.entrees || []).length
                ? `<div class="exec-cd-com-corps">${courante.entrees.map(lu).join('')}</div>`
                : `<div class="exec-cd-com-vide">${te('aucun_commentaire_en_cours')}</div>`}`}
            ${versions.filter((v) => v.close_le).length ? `
                <div class="exec-cd-com-vide" style="margin:.6rem 0 .2rem;">${te('versions_precedentes')}</div>
                ${versions.filter((v) => v.close_le).map(close).join('')}` : ''}
        </div>
    </div>`;
}

function execCdBasculerCommentaires() {
    EXEC_CD_COM.replie = !EXEC_CD_COM.replie;
    execCdRedessinerCommentaires();
}

function execCdBasculerVersion(n) {
    EXEC_CD_COM.versionsOuvertes[n] = !EXEC_CD_COM.versionsOuvertes[n];
    execCdRedessinerCommentaires();
}

function execCdAjouterCommentaire() {
    EXEC_CD_COM.saisie = (EXEC_CD_COM.saisie || []).concat([{ cible: 'general', texte: '' }]);
    execCdRedessinerCommentaires();
}

function execCdRetirerCommentaire(i) {
    EXEC_CD_COM.saisie = (EXEC_CD_COM.saisie || []).filter((x, rang) => rang !== i);
    execCdRedessinerCommentaires();
}

function execCdCommentaireChamp(i, champ, valeur) {
    const liste = EXEC_CD_COM.saisie || [];
    if (!liste[i]) return;
    liste[i][champ] = valeur;
    // La cible redessine ; le texte, non — la frappe s'y perdrait.
    if (champ === 'cible') execCdRedessinerCommentaires();
}

function execCdRedessinerCommentaires() {
    const zone = document.getElementById('execCdCommentaires');
    if (!zone) return;
    const c = _execCdCourante(EXEC_CD.id);
    const modifiable = execCdPeutCommenter(c);
    zone.className = `exec-cd-commentaires${EXEC_CD_COM.replie ? ' replie' : ''}`;
    zone.innerHTML = execCdCommentairesHtml(c, modifiable);
}

function execCdPeutCommenter(c) {
    return String((c || {}).statut || '') === 'direct_soumis'
        && (_execCanValidate() || _execIsAdmin());
}

async function execCdEnregistrerCommentaires(silencieux) {
    const entrees = (EXEC_CD_COM.saisie || [])
        .map((x) => ({ cible: x.cible || 'general', texte: (x.texte || '').trim() }))
        .filter((x) => x.texte);
    try {
        await api(`${EXEC_MODULE_API}/constatations/${EXEC_CD.id}/commentaires-validation`, {
            method: 'PUT', body: JSON.stringify({ entrees }),
        });
        await execRefreshDynamic();
        EXEC_CD_COM.saisie = entrees.slice();
        execCdRedessinerCommentaires();
        if (!silencieux) _execToast(te('commentaires_enregistres'), 'success');
        return true;
    } catch (e) {
        _execToast(te('erreur_x', (e && e.message) || ''), 'error');
        return false;
    }
}

// Le motif transmis avec la décision reprend les commentaires : le circuit
// existant continue d'afficher un motif, sans double saisie.
function execCdMotifDepuisCommentaires() {
    const entrees = (EXEC_CD_COM.saisie || []).filter((x) => (x.texte || '').trim());
    if (!entrees.length) return '';
    return entrees.map((x) => `${execCdLibelleCible(x.cible)} : ${x.texte.trim()}`).join(' ; ');
}

// Motif d'un renvoi ou d'un rejet : c'est la première chose à lire en
// rouvrant le circuit, il coiffe donc l'écran, quelle que soit l'étape.
function _execCdMotifHtml(c) {
    const st = String(c.statut || '');
    if (st === 'direct_renvoye') {
        // Les commentaires du valideur tiennent lieu de motif : une ligne par
        // champ, « Champ : ce qui est demandé ». Les renvois antérieurs se
        // relisent, repliés.
        const renvois = execCdVersions(c).filter((v) => v.issue === 'renvoi').reverse();
        const dernier = renvois[0];
        const anciens = renvois.slice(1);
        if (!dernier && !c.motif_renvoi) return '';
        const ligne = (x) => `<div class="exec-cd-motif-ligne">
            <i>${_esc(execCdLibelleCible(x.cible))}</i> : ${_esc(x.texte)}</div>`;
        return `
        <div class="exec-cd-motif">
            <div class="exec-cd-motif-bandeau">
                <strong>${te('motif_renvoi_titre')}</strong>
                <span class="exec-cd-motif-quand">${_esc(dernier
                    ? execCdQuand(dernier.close_le, dernier.close_par)
                    : (c.date_renvoi ? _formatDate(String(c.date_renvoi).slice(0, 10)) : ''))}</span>
                <span class="exec-cd-motif-consigne">${te('corriger_constatation')}</span>
            </div>
            <div class="exec-cd-motif-corps">
                ${dernier && (dernier.entrees || []).length
                    ? dernier.entrees.map(ligne).join('')
                    : `<div class="exec-cd-motif-ligne">${_esc(c.motif_renvoi || '')}</div>`}
                ${anciens.length ? anciens.map((v) => {
                    const ouvert = !!EXEC_CD_COM.versionsOuvertes[`r${v.version}`];
                    return `
                    <div class="exec-cd-com-version">
                        <button class="exec-cd-com-version-tete" type="button" aria-expanded="${ouvert}"
                                onclick="execCdBasculerVersion('r${v.version}')">
                            <span class="exec-cd-com-chevron${ouvert ? ' ouvert' : ''}">${EXEC_ICONS.chevronDown}</span>
                            <strong>Version ${v.version}</strong>
                            <span class="exec-cd-com-quand">${_esc(execCdQuand(v.close_le, v.close_par))}</span>
                        </button>
                        ${ouvert ? `<div class="exec-cd-motif-corps">
                            ${(v.entrees || []).map(ligne).join('')}</div>` : ''}
                    </div>`;
                }).join('') : ''}
            </div>
        </div>`;
    }
    if (st === 'direct_rejete' && c.motif_rejet_pac) {
        return `<div class="exec-cd-rejet">
            <strong>${te('motif_rejet_titre')}${c.date_rejet_pac ? ` — ${_formatDate(String(c.date_rejet_pac).slice(0, 10))}` : ''}</strong>
            <div>${_esc(c.motif_rejet_pac)}</div>
            <p class="exec-cd-arret">${te('constatation_rejetee_arret')}</p></div>`;
    }
    return '';
}

function _execCdCourante(fncId) {
    return (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId) || {};
}

function _execCdInstantane() {
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
}

function execCdFilHtml(statut, actionsHtml, consultee) {
    const etat = execCdEtat(statut);
    const ouvertes = execCdOuvertes(statut);
    const selectionnee = consultee || execCdEtapeDefaut(statut);
    const etapes = EXEC_CD_ETAPES.map((e) => {
        const courante = !etat.faites[e.id] && etat.courante === e.id;
        const cls = ['eval-step', 'exec-pac-step',
            etat.faites[e.id] ? 'done' : '',
            courante && ((etat.renvoye && e.id === 'preparation')
                || (etat.rejete && e.id === 'validation')) ? 'rejected' : '',
            courante && !((etat.renvoye && e.id === 'preparation')
                || (etat.rejete && e.id === 'validation')) ? 'current' : '',
            selectionnee === e.id ? 'selected' : '',
            !ouvertes[e.id] ? 'verrouillee' : '',
        ].filter(Boolean).join(' ');
        const label = te(e.cle);
        const action = ouvertes[e.id] && EXEC_CD.id ? ` onclick="execCdConsulter('${e.id}')"` : '';
        return `<button class="${cls}" type="button"${ouvertes[e.id] ? '' : ' disabled'}${action}`
            + ` title="${_escAttr(label)}">${_esc(label)}</button>`;
    }).join('');
    return `<div class="exec-proc-barre exec-pac-barre">
        <div class="eval-steps exec-proc-fil">${etapes}</div>
        ${actionsHtml ? `<div class="exec-proc-actions-etape">${actionsHtml}</div>` : ''}
    </div>`;
}

// Bandeau : sortie du formulaire à gauche, avant son intitulé. La croix est
// retirée par `_execCdInstallerBandeau`.
function _execCdTitre(reference) {
    return `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execRetourVolet()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.constatations} ${te('constatation_hors_activites')}${reference ? ` — ${_esc(reference)}` : ''}`;
}

function _execCdRetirerCroix() {
    document.querySelector('#execSlider .exec-slider-close')?.remove();
}

function execOpenConstatationDirecteForm(existing) {
    const c = existing || {};
    const prestataires = EXEC_STATE.data.prestataires || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const today = new Date().toISOString().slice(0, 10);
    const defaultEmisPar = c.emis_par || (EXEC_STATE.user && EXEC_STATE.user.nom) || '';
    const defaultDateOuverture = c.date_ouverture ? (c.date_ouverture.slice ? c.date_ouverture.slice(0, 10) : c.date_ouverture) : today;

    // Resolve default secteur + domaine from prestataire
    const selectedPrest = prestataires.find(p => p.id === c.prestataire_id);
    const defaultSecteurId = c.secteur_id || selectedPrest?.secteur_id || '';
    const defSecteur = secteurs.find(s => s.id === defaultSecteurId);
    const defaultDomaineId = c.domaine_id || defSecteur?.domaine_id || '';

    // Source default: 'autre' for new, keep existing for edit
    const defaultSource = c.source && c.source !== 'source_direct' ? c.source : 'autre';

    // Initial exigences filtered by default secteur
    const allExig = EXEC_STATE.data.exigences || [];
    const initExig = defaultSecteurId
        ? allExig.filter(e => e.secteur_id === defaultSecteurId && (e.statut || 'actif') !== 'inactif')
        : allExig.filter(e => (e.statut || 'actif') !== 'inactif');
    const exigOptions = initExig.map(e =>
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');

    const G = 'gap:0.6rem;'; // compact gap
    const MB = 'margin-bottom:0.5rem;'; // compact margin

    // Soumettre siège sur la ligne du fil, à l'extrême droite.
    const filActions = `<button class="btn btn-primary btn-sm" onclick="execSaveConstatationDirecte('${c.id || ''}', true)">${EXEC_ICONS.send} ${te('soumettre')}</button>`;

    // Le fil du formulaire navigue lui aussi, dès lors que la constatation
    // existe : sans identifiant, il n'y a rien à consulter ailleurs.
    EXEC_CD = { id: c.id || '', etape: 'preparation' };

    const body = `
    <div class="exec-proc-entete-collant">${execCdFilHtml(c.statut, filActions, 'preparation')}</div>
    <div class="exec-real">
        ${_execCdMotifHtml(c)}

        ${_execFormSection('A', 'fnc_section_identification', `
<!-- Row 1 : Prestataire ; Emis Par ; Adressé à ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('provider')} *</label>
                <select class="form-select" id="cd_prestataire" onchange="execCdOnPrestataireChange()">
                    <option value="">${te('select_option')}</option>
                    ${prestataires.map(p => `<option value="${p.id}" ${c.prestataire_id===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('emis_par')}</label>
                <input type="text" class="form-input" id="cd_emis_par" value="${_escAttr(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a')}</label>
                <input type="text" class="form-input" id="cd_adresse_a" value="${_escAttr(c.adresse_a || '')}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_ouverture') || "Date d'ouverture"}</label>
                <input type="date" class="form-input" id="cd_date_ouverture" value="${_escAttr(defaultDateOuverture)}" onchange="execCdCalcDateDue()">
            </div>
        </div>

        <!-- Row 2 : Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('source')}</label>
                <select class="form-select" id="cd_source">
                    <option value="audit" ${defaultSource === 'audit' ? 'selected' : ''}>${te('source_audit')}</option>
                    <option value="inspection" ${defaultSource === 'inspection' ? 'selected' : ''}>${te('source_inspection')}</option>
                    <option value="autre" ${defaultSource === 'autre' ? 'selected' : ''}>${te('source_autre')}</option>
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('domaine')} *</label>
                <select class="form-select" id="cd_domaine">
                    <option value="">${te('select_option')}</option>
                    ${domaines.map(d => `<option value="${d.id}" ${defaultDomaineId===d.id?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('secteur')}</label>
                <select class="form-select" id="cd_secteur" onchange="execCdOnSecteurChange()">
                    <option value="">${te('select_option')}</option>
                    ${secteurs.map(s => `<option value="${s.id}" ${defaultSecteurId===s.id?'selected':''}>${_esc(s.code || s.nom)}</option>`).join('')}
                </select>
            </div>
        </div>
        `, true, '', te('cd_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
<!-- Row 3 : Réf. Réglementaires (tag-input multi) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires')}</label>
            <div id="cd_ref_tags" style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);min-height:2.2rem;cursor:text;" onclick="document.getElementById('cd_ref_input').focus()">
                ${(c.ref_reglementaires || c.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span class="cd-ref-tag" data-ref="${_escAttr(r)}" title="${_escAttr(exig?.libelle || '')}" style="display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;">${_esc(r)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button></span>`;
                }).join('')}
                <input type="text" id="cd_ref_input" list="cd_exig_list" autocomplete="off"
                    placeholder="${(c.ref_reglementaires || '') ? '' : 'Ajouter une référence…'}"
                    style="border:none;outline:none;background:transparent;flex:1;min-width:10rem;font-size:0.85rem;padding:0.1rem 0;"
                    onchange="execCdAddRef(this.value);this.value='';"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();execCdAddRef(this.value);this.value='';}">
            </div>
            <datalist id="cd_exig_list">${exigOptions}</datalist>
        </div>

        <!-- Titre -->
        <div class="form-group" style="${MB}">
            <label>Titre</label>
            <input type="text" class="form-input" id="cd_titre" value="${_escAttr(c.titre || '')}">
        </div>

        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label>Description *</label>
            <textarea class="form-input" id="cd_description" rows="3">${_esc(c.description || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_constat'))}

        ${_execFormSection('C', 'fnc_section_traitement', `
<!-- Row 4 : Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('criticite')} *</label>
                <select class="form-select" id="cd_criticite" onchange="execApplyCriticiteDelai('cd_criticite','cd_delai','execCdCalcDateDue')">
                    ${_execCriticiteOptions(c.criticite || c.gravite)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('cas')}</label>
                <select class="form-select" id="cd_cas">
                    ${_execTypeCasOptions(c.cas_type || c.cas, true)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('delai_col')}</label>
                <input type="number" class="form-input" id="cd_delai" min="1" value="${_escAttr(c.delai_solde || c.delai_correction || _execCriticiteDelai(c.criticite || c.gravite) || '30')}" oninput="execCdCalcDateDue()" onchange="execCdCalcDateDue()">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_due')}</label>
                <input type="date" class="form-input" id="cd_date_due" value="${_escAttr(c.date_due_cloture || c.date_due || '')}" readonly style="background:var(--bg);">
            </div>
        </div>

        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label>${te('recommandation')}</label>
            <textarea class="form-input" id="cd_reco" rows="2">${_esc(c.recommandation || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
<!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves')}</label>
            <div id="cd_preuves_list">
                ${(c.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.5rem;padding:1.25rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('cd_proof_input').click()">
                ${EXEC_ICONS.upload || '↑'} ${te('upload_zone')}
                <input type="file" id="cd_proof_input" style="display:none;" multiple onchange="execCdUploadProof(this.files)">
            </div>
        </div>
        `, true, '', te('fnc_aide_preuves'))}
    </div>`;

    // Barre inférieure : sortie, impression de la fiche, brouillon.
    const footer = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel')}</button>
        ${c.id ? `<button class="btn btn-outline" onclick="execFicheConstatPdf('${c.id}')">${EXEC_ICONS.pdf || EXEC_ICONS.file} ${te('imprimer_constatation')}</button>` : ''}
        <button class="btn btn-outline" onclick="execSaveConstatationDirecte('${c.id || ''}', false)">${te('sauver_brouillon')}</button>
    `;
    execShowSlider(_execCdTitre(c.reference), body, footer, 'max');
    _execCdInstantane();
    _execCdRetirerCroix();
    setTimeout(() => execCdCalcDateDue(), 100);
}

// Compute date_due from date_ouverture + délai (same logic as execCalcDateDue for FNC).
function execCdCalcDateDue() {
    const delai = parseInt(document.getElementById('cd_delai')?.value || '30');
    const dateOuv = document.getElementById('cd_date_ouverture')?.value;
    const out = document.getElementById('cd_date_due');
    if (!out) return;
    if (!dateOuv || isNaN(delai) || delai < 1) { out.value = ''; return; }
    const dt = new Date(dateOuv);
    if (isNaN(dt.getTime())) { out.value = ''; return; }
    dt.setDate(dt.getDate() + delai);
    out.value = dt.toISOString().slice(0, 10);
}

// Uploads proofs for the Constatation Directe form; stores returned paths on
// the preview row so the save picks them up.
async function execCdUploadProof(files) {
    if (!files || !files.length) return;
    const list = document.getElementById('cd_preuves_list');
    for (const f of files) {
        try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await api(`${EXEC_MODULE_API}/upload`, { method: 'POST', body: fd, isFormData: true });
            const path = (res && (res.path || res.filepath || res.url)) || '';
            const filename = f.name;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;';
            row.dataset.path = path;
            row.innerHTML = `${EXEC_ICONS.file} <span style="flex:1;">${_esc(filename)}</span>
                <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            list.appendChild(row);
        } catch (e) { console.error('Upload proof error:', e); }
    }
}

async function execSaveConstatationDirecte(fncId, thenSubmit) {
    // Collect preuves from the list (items added via execCdUploadProof)
    const preuves = Array.from(document.querySelectorAll('#cd_preuves_list > div')).map(el => ({
        path: el.dataset.path || '',
        filename: (el.querySelector('span')?.textContent || '').trim()
    })).filter(p => p.filename);

    const payload = {
        prestataire_id: document.getElementById('cd_prestataire')?.value || '',
        emis_par: document.getElementById('cd_emis_par')?.value || '',
        adresse_a: document.getElementById('cd_adresse_a')?.value || '',
        date_ouverture: document.getElementById('cd_date_ouverture')?.value || '',
        source: document.getElementById('cd_source')?.value || 'direct',
        domaine_id: document.getElementById('cd_domaine')?.value || '',
        ref_reglementaires: (() => {
            const tags = Array.from(document.querySelectorAll('#cd_ref_tags .cd-ref-tag')).map(t => t.dataset.ref);
            const inp = (document.getElementById('cd_ref_input')?.value || '').split(' — ')[0].trim();
            if (inp && !tags.includes(inp)) tags.push(inp);
            return tags.join(', ');
        })(),
        description: document.getElementById('cd_description')?.value || '',
        criticite: document.getElementById('cd_criticite')?.value || 'mineure',
        cas_type: document.getElementById('cd_cas')?.value || '',
        titre: document.getElementById('cd_titre')?.value || '',
        delai_solde: document.getElementById('cd_delai')?.value || '30',
        date_due_cloture: document.getElementById('cd_date_due')?.value || '',
        recommandation: document.getElementById('cd_reco')?.value || '',
        preuves_constatation: preuves,
        direct: true
    };
    if (!payload.prestataire_id || !payload.domaine_id || !payload.description) {
        _execToast(te('fill_required'), 'warning');
        return;
    }
    try {
        let savedId = fncId;
        if (fncId) {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            const res = await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(payload) });
            savedId = res.id;
        }
        await execRefreshDynamic();
        if (thenSubmit && savedId) {
            // La constatation part à la validation sans désigner de validateur :
            // qui en a le droit la trouve dans sa liste.
            await execSubmitConstatationDirecteForValidation(savedId);
        } else {
            execCloseSlider();
            _execToast(te('saved'), 'success');
            execRenderPage();
        }
    } catch (e) {
        console.error('Save constatation directe error:', e);
        _execToast(te('erreur_x', (e && e.message) || ''), 'error');
    }
}

// Soumission à la validation. Aucun validateur n'est désigné : la
// constatation entre dans la file de ceux qui ont qualité pour la prononcer.
async function execSubmitConstatationDirecteForValidation(fncId) {
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-soumettre`, { method: 'PUT' });
        await execRefreshDynamic();
        execCloseSlider();
        _execToast(te('submitted_for_validation'), 'success');
        execRenderPage();
    } catch (e) {
        console.error('Submit constatation directe error:', e);
        _execToast(te('erreur_x', (e && e.message) || ''), 'error');
    }
}

async function execOpenConstatationDirecteSlider(fncId, etapeVoulue) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); return; }
    if (!fnc) return;
    execPrendreRetour('cd:' + fncId);
    EXEC_STATE.voletRejouer = () => execOpenConstatationDirecteSlider(fncId, etapeVoulue);
    const me = (EXEC_STATE.user || {}).id || '';
    const isCreator = fnc.created_by === me;
    // Aucun validateur n'est désigné à la soumission : la qualité pour
    // valider suffit.
    const isValidateur = _execCanValidate() || _execIsAdmin();
    const st = fnc.statut || '';
    const prestataires = EXEC_STATE.data.prestataires || [];
    const prestataire = prestataires.find(p => p.id === fnc.prestataire_id);
    const domaines = EXEC_STATE.data.domaines || [];
    const dom = domaines.find(d => d.id === fnc.domaine_id);

    const secteurs = EXEC_STATE.data.secteurs || [];
    const secteur = secteurs.find(s => s.id === fnc.secteur_id);
    const allExig = EXEC_STATE.data.exigences || [];
    const refList = (fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean);
    const G = 'gap:0.6rem;'; const MB = 'margin-bottom:0.75rem;';
    const roField = (label, val) => `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${label}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2rem;white-space:pre-wrap;">${val || '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>`;

    const sourceLabels = { audit: 'Audit', inspection: 'Inspection', autre: 'Autre' };

    const transmise = _execCdTransmise(st);
    EXEC_CD = { id: fnc.id, etape: '' };
    // L'étape demandée doit être atteinte ; sinon on retombe sur l'étape en cours.
    const ouvertes = execCdOuvertes(st);
    const etape = ouvertes[etapeVoulue] ? etapeVoulue : execCdEtapeDefaut(st);
    EXEC_CD.etape = etape;

    // Renvoyer, Rejeter puis Valider : les décisions de l'étape se prennent sur
    // la ligne du fil, dans l'ordre où elles s'envisagent.
    const filActions = (etape === 'validation' && isValidateur && st === 'direct_soumis')
        ? `<button class="btn btn-sm btn-outline exec-cd-renvoyer" onclick="execRenvoyerConstatationModal('${fnc.id}')">${EXEC_ICONS.back || ''} Renvoyer</button>`
        + `<button class="btn btn-sm btn-outline exec-cd-rejeter" onclick="execRejeterConstatationModal('${fnc.id}')">${EXEC_ICONS.x} Rejeter</button>`
        + `<button class="btn btn-primary btn-sm" onclick="execValidateConstatationDirecte('${fnc.id}')">${EXEC_ICONS.check} ${te('valider')}</button>`
        : '';

    // La Transmission ne rejoue pas le formulaire validé : elle ne porte que
    // le courriel de remise.
    const fiche = etape !== 'transmission';

    // Le panneau de commentaires accompagne l'étape de validation : à gauche
    // ce qui est soumis, à droite les observations du valideur.
    const avecCommentaires = etape === 'validation';
    if (EXEC_CD_COM.id !== fnc.id) {
        EXEC_CD_COM = { id: fnc.id, saisie: [], replie: false, versionsOuvertes: {} };
    }
    const ouverteCom = execCdVersionCourante(fnc);
    EXEC_CD_COM.saisie = ouverteCom ? (ouverteCom.entrees || []).map((x) => ({ ...x })) : [];

    const body = `
    <div class="exec-proc-entete-collant">${execCdFilHtml(st, filActions, etape)}</div>
    <div class="${avecCommentaires ? 'exec-cd-validation' : ''}">
    <div class="exec-real${avecCommentaires ? ' exec-cd-validation-corps' : ''}">
        ${_execCdMotifHtml(fnc)}
        ${etape === 'validation' ? _execCdHistoriqueHtml(fnc) : ''}

        ${!fiche ? '' : `
        ${_execFormSection('A', 'fnc_section_identification', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('reference'), fnc.reference)}
            ${roField(te('provider'), prestataire ? prestataire.nom : fnc.prestataire_id)}
            ${roField(te('emis_par'), fnc.emis_par)}
            ${roField(te('adresse_a'), fnc.adresse_a)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
            ${roField(te('source'), sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine'), dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        `, true, '', te('cd_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires')}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);min-height:2rem;">
                ${refList.length ? refList.map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span title="${_escAttr(exig?.libelle || '')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
                }).join('') : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        ${roField('Titre', fnc.titre)}
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">Description</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:3rem;white-space:pre-wrap;">${fnc.description ? _esc(fnc.description) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        `, true, '', te('fnc_aide_constat'))}

        ${_execFormSection('C', 'fnc_section_traitement', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('criticite'), fnc.criticite)}
            ${roField(te('cas'), fnc.cas_type || fnc.cas)}
            ${roField('Délai', fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due'), fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : '')}
        </div>
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation')}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2.5rem;white-space:pre-wrap;">${fnc.recommandation ? _esc(fnc.recommandation) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
        <div class="form-group">
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;">
                ${(fnc.preuves_constatation || []).length
                    ? fnc.preuves_constatation.map(p => `<div style="display:flex;align-items:center;gap:0.4rem;padding:0.2rem 0;">${EXEC_ICONS.file || ''} ${_execPieceLien(p.path, p.filename || p)}</div>`).join('')
                    : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        `, true, String((fnc.preuves_constatation || []).length || ''), te('fnc_aide_preuves'))}
        `}

        ${etape === 'transmission' ? _execCourrielConstatation(fnc, prestataire) : ''}
    </div>
    ${avecCommentaires ? `<div id="execCdCommentaires" class="exec-cd-commentaires">${
        execCdCommentairesHtml(fnc, execCdPeutCommenter(fnc))}</div>` : ''}
    </div>`;

    // Barre inférieure : sortie, impression, puis les actions de l'étape.
    let footer = `<button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel')}</button>`;
    footer += `<button class="btn btn-outline" onclick="execFicheConstatPdf('${fnc.id}')">${EXEC_ICONS.pdf || EXEC_ICONS.file} ${te('imprimer_constatation')}</button>`;
    if (etape === 'preparation' && isCreator && ['direct_brouillon', 'direct_renvoye'].includes(st)) {
        footer += `<button class="btn btn-primary" onclick="execCloseSlider();execOpenConstatationDirecteForm(${JSON.stringify(fnc).replace(/"/g,'&quot;')})">${te('edit')}</button>`;
    }

    execShowSlider(_execCdTitre(fnc.reference), body, footer, 'max');
    _execCdInstantane();
    _execCdRetirerCroix();
}

// ── Transmission d'une constatation hors activités de supervision ──
// Même remise que pour un rapport d'activité : le courriel ne porte que des
// liens, la fiche de constat et les pièces restent dans OASIS.
function _execCourrielConstatation(fnc, prestataire) {
    const transmise = _execCdTransmise(fnc.statut);
    const nomPrest = (prestataire || {}).nom || fnc.prestataire_nom || '';
    const adresse = transmise ? (fnc.transmis_a || '')
        : ((prestataire || {}).email_point_focal || (prestataire || {}).email_prestataire || '');
    const objet = `${te('fiche_constat')} ${fnc.reference || ''} — ${nomPrest}`.trim();
    const message = [
        'Madame, Monsieur,',
        '',
        `La constatation ${fnc.reference || ''} est mise à votre disposition dans OASIS. `
            + 'Les liens de téléchargement figurent au bas de ce message.',
        '',
        'Elle appelle un plan d\'actions correctives, à soumettre dans le délai indiqué '
            + `(${_esc(fnc.delai_solde || '—')} jours à compter de la date d'ouverture).`,
        '',
        'Nous vous prions d\'agréer nos salutations distinguées.',
    ].join('\n');
    const ro = transmise ? ' readonly' : '';

    return `
    <div class="exec-courriel" id="exec_courriel_transmission">
        <div class="exec-courriel-entete">
            <span>${EXEC_ICONS.send}</span>
            <h4>${te('transmission_constatation')}</h4>
            ${transmise ? `<span class="exec-courriel-etat">Transmise le ${_formatDate(fnc.date_transmission || fnc.date_ouverture)}${
                fnc.transmis_a ? ` à ${_esc(fnc.transmis_a)}` : ''}</span>` : ''}
        </div>
        <div class="form-group">
            <label>Destinataire</label>
            <input type="text" class="form-input" id="courriel_destinataire" value="${_escAttr(adresse)}"
                   placeholder="${te('ex_adresse_prestataire')}"${ro}>
        </div>
        <div class="exec-courriel-copies">
            <div class="form-group">
                <label>Copie (Cc)</label>
                <input type="text" class="form-input" id="courriel_copie" placeholder="${te('adresses_virgules')}"${ro}>
            </div>
            <div class="form-group">
                <label>${te('copie_cachee')}</label>
                <input type="text" class="form-input" id="courriel_copie_cachee" placeholder="${te('adresses_virgules')}"${ro}>
            </div>
        </div>
        <div class="form-group">
            <label>${te('objet')}</label>
            <input type="text" class="form-input" id="courriel_objet" value="${_escAttr(objet)}"${ro}>
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea class="form-input" id="courriel_message" rows="8" style="resize:vertical;"${ro}>${_esc(message)}</textarea>
        </div>
        <div class="form-group">
            <label>Documents transmis</label>
            <p class="exec-courriel-note">Le message ne porte aucune pièce jointe : il annonce des liens
               de téléchargement, que le prestataire suit depuis son compte OASIS.</p>
            <div id="courriel_pieces">
                <div class="exec-piece exec-piece-rapport">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien((fnc.document || {}).path, `${fnc.reference || 'constatation'}.pdf`,
                        `execFicheConstatPdf('${fnc.id}')`)}
                    <span class="exec-piece-mention">${te('fiche_constat')} — jointe d'office</span>
                </div>
                ${(transmise ? (fnc.pieces_transmises || []) : []).map(f => `
                <div class="exec-piece">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien(f.path, f.intitule || f.filename || '')}
                    <span class="exec-piece-mention">${_esc(f.filename || '')}</span>
                </div>`).join('')}
            </div>
            ${transmise ? '' : `
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()" style="margin-top:0.5rem;">
                ${EXEC_ICONS.upload} Ajouter un fichier
            </button>
            <input type="file" style="display:none;" multiple onchange="execCourrielAjouterFichiers(this)">`}
        </div>
        <div class="exec-courriel-pied">
            ${transmise ? '' : `
            <button class="btn btn-primary btn-sm" id="courriel_envoyer"
                    onclick="execTransmettreConstatation('${fnc.id}')">
                ${EXEC_ICONS.send} Envoyer
            </button>`}
        </div>
    </div>`;
}

async function execTransmettreConstatation(fncId) {
    const val = (id) => (document.getElementById(id) || {}).value || '';
    const destinataire = val('courriel_destinataire').trim();
    if (!destinataire) { _execToast(te('indiquez_destinataire'), 'error'); return; }
    const bouton = document.getElementById('courriel_envoyer');
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi…'; }
    try {
        const fnc = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId) || {};
        // Le document remis est la fiche de constat, telle qu'elle s'imprime.
        const html = _execDocHtml(`${te('fiche_constat')} — ${fnc.reference || ''}`,
            _execFicheConstatCorps(fnc, {}));
        const remise = await api(`${EXEC_MODULE_API}/constatations/${fncId}/transmettre`, {
            method: 'POST',
            body: JSON.stringify({
                destinataire,
                copie: val('courriel_copie'),
                copie_cachee: val('courriel_copie_cachee'),
                objet: val('courriel_objet'),
                message: val('courriel_message'),
                piece: { nom: `${fnc.reference || 'constatation'}.pdf`, contenu: html },
                fichiers: _execCourrielFichiers(),
            }),
        });
        _execToast(remise && remise.envoye === false
            ? te('transmis_sans_courriel')
            : 'Constatation transmise au prestataire', remise && remise.envoye === false ? 'warning' : 'success');
        await execRefreshDynamic();
        execOpenConstatationDirecteSlider(fncId);
    } catch (e) {
        console.error('Transmission constatation :', e);
        _execToast((e && e.message) || 'Erreur lors de la transmission', 'error');
        if (bouton) { bouton.disabled = false; bouton.innerHTML = `${EXEC_ICONS.send} Envoyer`; }
    }
}

async function execValidateConstatationDirecte(fncId) {
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-valider`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('validated'), 'success');
        execRenderPage();
        // La décision prise, le formulaire se rouvre sur l'étape suivante.
        execOpenConstatationDirecteSlider(fncId, 'transmission');
    } catch (e) {
        console.error('Validate error:', e);
        _execToast(te('erreur_x', (e && e.message) || ''), 'error');
    }
}

function _execCommentModal(title, color, onConfirm) {
    document.getElementById('exec_comment_modal')?.remove();
    const el = document.createElement('div');
    el.id = 'exec_comment_modal';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
    el.onclick = e => { if (e.target === el) el.remove(); };
    el.innerHTML = `
    <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:420px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 1rem;font-size:1rem;font-weight:700;color:${color};">${title}</h3>
        <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">Commentaire *</label>
            <textarea id="exec_comment_text" class="form-input" rows="3" placeholder="${te('saisir_motif')}" style="resize:vertical;"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
            <button class="btn btn-outline" onclick="document.getElementById('exec_comment_modal').remove()">Annuler</button>
            <button class="btn" style="background:${color};color:#fff;border:none;" id="exec_comment_confirm">Confirmer</button>
        </div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#exec_comment_confirm').onclick = () => {
        const txt = (document.getElementById('exec_comment_text')?.value || '').trim();
        if (!txt) { _execToast(te('commentaire_obligatoire'), 'warning'); return; }
        el.remove();
        onConfirm(txt);
    };
}

// Renvoi et rejet ne redemandent plus un motif : ce sont les commentaires de
// validation. La fenêtre confirme et rappelle ce qui sera transmis.
function execCdDecisionModal(titre, couleur, verbe, action) {
    const entrees = (EXEC_CD_COM.saisie || []).filter((x) => (x.texte || '').trim());
    const corps = `
        <p style="margin:0 0 .6rem;font-size:.86rem;">
            ${te('commentaires_comme_motif')}
        </p>
        ${entrees.length ? `<div class="exec-cd-motif-corps" style="padding:0;">
            ${entrees.map((x) => `<div class="exec-cd-motif-ligne">
                <i>${_esc(execCdLibelleCible(x.cible))}</i> : ${_esc(x.texte)}</div>`).join('')}
        </div>`
        : `<p style="color:#b91c1c;font-size:.84rem;margin:0;">${te('renvoi_sans_commentaire_postulant')}</p>`}`;
    _execConfirmModal(titre, corps, verbe, couleur, action);
}

// Petite fenêtre de confirmation, réutilisable : intitulé, corps libre, un
// bouton qui agit et un qui renonce.
function _execConfirmModal(titre, corpsHtml, verbe, couleur, action) {
    const id = 'exec_confirm_modal';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;'
        + 'display:flex;align-items:center;justify-content:center;';
    el.onclick = (ev) => { if (ev.target === el) el.remove(); };
    el.innerHTML = `
    <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:520px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 .8rem;font-size:1rem;font-weight:700;color:${couleur};">${_esc(titre)}</h3>
        <div style="margin-bottom:1rem;max-height:40vh;overflow:auto;">${corpsHtml}</div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
            <button class="btn btn-outline" onclick="document.getElementById('${id}').remove()">${te('cancel')}</button>
            <button class="btn" style="background:${couleur};color:#fff;border:none;" id="exec_confirm_ok">${_esc(verbe)}</button>
        </div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#exec_confirm_ok').onclick = async () => {
        el.remove();
        await action();
    };
}

function execRenvoyerConstatationModal(fncId) {
    execCdDecisionModal('Renvoyer pour correction', '#f97316', 'Confirmer le renvoi', async () => {
        try {
            await execCdEnregistrerCommentaires(true);
            const motif = execCdMotifDepuisCommentaires() || 'Voir les commentaires de validation';
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-renvoyer`, {
                method: 'PUT',
                body: JSON.stringify({
                    motif,
                    decisions_validation: _execCdJournaliser(_execCdCourante(fncId), 'renvoi', motif),
                })
            });
            await execRefreshDynamic();
            _execToast(te('constat_renvoye'), 'success');
            execOpenConstatationDirecteSlider(fncId, 'preparation');
            execRenderPage();
        } catch (e) { _execToast(te('erreur_x', e?.message || ''), 'error'); }
    });
}

function execRejeterConstatationModal(fncId) {
    execCdDecisionModal('Rejeter la constatation', '#dc2626', 'Confirmer le rejet', async () => {
        try {
            await execCdEnregistrerCommentaires(true);
            const motif = execCdMotifDepuisCommentaires() || 'Voir les commentaires de validation';
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-rejeter`, {
                method: 'PUT',
                body: JSON.stringify({
                    motif,
                    decisions_validation: _execCdJournaliser(_execCdCourante(fncId), 'rejet', motif),
                })
            });
            await execRefreshDynamic();
            _execToast(te('constat_rejete'), 'success');
            execRenderPage();
            execOpenConstatationDirecteSlider(fncId, 'validation');
        } catch (e) { _execToast(te('erreur_x', e?.message || ''), 'error'); }
    });
}
