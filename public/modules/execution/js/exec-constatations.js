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
                ? `<span style="color:#16a34a;font-weight:600;">${te('cloturee_dans_delais') || 'Clôturée dans les délais'}</span>`
                : `<span style="color:#dc2626;font-weight:600;">${te('hors_delais') || 'Hors délais'} (+${diffDays} ${te('jours') || 'jours'})</span>`;
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
                        return `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteFormById('${c.id}')" title="${te('modifier_fnc')||'Modifier'}">${EXEC_ICONS.edit||''}</button>`;
                    if (st === 'direct_soumis')
                        return isVal
                            ? `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Valider">${EXEC_ICONS.check||''}</button>`
                            : `<button class="btn btn-sm btn-outline" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Consulter">${EXEC_ICONS.eye||''}</button>`;
                    if (st === 'direct_valide')
                        return `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Transmettre">${EXEC_ICONS.send||''}</button>`;
                    if (st === 'direct_rejete')
                        return `<button class="btn btn-sm btn-outline" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Consulter">${EXEC_ICONS.eye||''}</button>`;
                    if (OPEN_STATUTS.has(st))
                        return ouvrePac ? ''
                            : `<button class="btn btn-sm btn-outline" onclick="execOpenPACSlider('${c.id}')" title="${te('suivi_pac')}">${EXEC_ICONS.clipboard}</button>`;
                    return `<button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${c.dossier_id}','constatations')" title="${te('dossier')||'Dossier'}">${EXEC_ICONS.file}</button>`;
                })()}
                ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.25rem 0.4rem;" onclick="execDeleteConstatation('${c.id}')" title="${te('delete')}">${EXEC_ICONS.x}</button>` : ''}
            </td>
        </tr>
        <tr id="${rowId}" style="display:none;">
            <td colspan="8" style="padding:0.6rem 1rem;background:var(--bg);border-top:none;">
                <div style="display:grid;gap:0.5rem;font-size:0.8rem;">
                    <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('description_constatation') || 'Description'}</span>
                    <p style="margin:0.2rem 0 0;">${_esc(c.description || c.titre || '-')}</p></div>
                    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;">
                        <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_ouverture') || "Date d'ouverture"}</span><div>${dateOuv ? _formatDate(dateOuv) : '-'}</div></div>
                        <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_due_label') || 'Due Date'}</span><div style="color:#dc2626;font-weight:600;">${dueDate ? _formatDate(dueDate) : '-'}</div></div>
                        ${isSoldee ? `<div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_solde')}</span><div style="color:#16a34a;font-weight:600;">${dateSolde ? _formatDate(dateSolde) : '-'}</div></div>` : ''}
                        ${delaiInfo ? `<div>${delaiInfo}</div>` : ''}
                    </div>
                    ${c.motif_rejet_pac && c.statut === 'direct_rejete' ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:#fef2f2;border-left:3px solid #dc2626;border-radius:3px;font-size:0.8rem;"><strong style="color:#dc2626;">Motif de rejet :</strong> ${_esc(c.motif_rejet_pac)}</div>` : ''}
                    ${c.motif_renvoi && c.statut === 'direct_renvoye' ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:#fff7ed;border-left:3px solid #f97316;border-radius:3px;font-size:0.8rem;"><strong style="color:#f97316;">Motif de renvoi :</strong> ${_esc(c.motif_renvoi)}</div>` : ''}
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
    return parts.length ? parts.join('   ·   ') : (te('aucun_filtre') || 'Aucun filtre');
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
                <div><span>${te('visa_inspecteur') || 'Visa de l’inspecteur'}</span></div>
                <div><span>${te('visa_prestataire') || 'Visa du prestataire'}</span></div>
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
    if (!fenetre) { _execToast(te('bloqueur_fenetre') || 'Autorisez les fenêtres surgissantes pour l\'export', 'warning'); return; }
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
    catch (e) { console.error(e); _execToast('Erreur chargement', 'error'); return; }
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
        { groupe: te('general') || 'Général', options: [['general', 'Commentaire général']] },
        { groupe: 'A — Identification', options: [
            ['prestataire', te('provider') || 'Prestataire'],
            ['emis_par', te('emis_par') || 'Émis par'],
            ['adresse_a', te('adresse_a') || 'Adressé à'],
            ['date_ouverture', te('date_ouverture') || "Date d'ouverture"],
            ['source', te('source') || 'Source'],
            ['domaine', te('domaine') || 'Domaine'],
            ['secteur', 'Secteur'],
        ] },
        { groupe: 'B — Constat', options: [
            ['ref_reglementaires', te('ref_reglementaires') || 'Réf. réglementaires'],
            ['titre', 'Titre'],
            ['description', 'Description'],
        ] },
        { groupe: 'C — Traitement', options: [
            ['criticite', te('criticite') || 'Criticité'],
            ['date_due', te('date_due') || "Date d'échéance"],
            ['pieces', te('pieces_jointes') || 'Pièces jointes'],
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
                title="Déplier" onclick="execCdBasculerCommentaires()">
            ${EXEC_ICONS.chevronLeft || EXEC_ICONS.back || '‹'}
            <span class="exec-cd-com-titre-replie">${te('commentaires_validation')
                || 'Commentaires de validation'}${nombre ? ` (${nombre})` : ''}</span>
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
            <textarea class="form-input exec-cd-com-texte" rows="2" placeholder="Observation du valideur"
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
                    : '<div class="exec-cd-com-vide">Aucun commentaire à cette version.</div>'}
            </div>` : ''}
        </div>`;
    };

    return `${poignee}
    <div class="exec-cd-com-panneau">
        <div class="exec-cd-com-bandeau">
            <span class="exec-cd-com-pastille">i</span>
            <strong>${te('commentaires_validation') || 'Commentaires de validation'}</strong>
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
                : '<div class="exec-cd-com-vide">Aucun commentaire en cours.</div>'}`}
            ${versions.filter((v) => v.close_le).length ? `
                <div class="exec-cd-com-vide" style="margin:.6rem 0 .2rem;">Versions précédentes</div>
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
        if (!silencieux) _execToast('Commentaires enregistrés', 'success');
        return true;
    } catch (e) {
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
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
                <span class="exec-cd-motif-consigne">Corrigez la constatation, puis soumettez-la de nouveau.</span>
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
                <label>${te('provider') || 'Prestataire'} *</label>
                <select class="form-select" id="cd_prestataire" onchange="execCdOnPrestataireChange()">
                    <option value="">${te('select_option') || 'Sélectionner'}</option>
                    ${prestataires.map(p => `<option value="${p.id}" ${c.prestataire_id===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('emis_par') || 'Émis par'}</label>
                <input type="text" class="form-input" id="cd_emis_par" value="${_escAttr(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a') || 'Adressé à'}</label>
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
                <label>${te('source') || 'Source'}</label>
                <select class="form-select" id="cd_source">
                    <option value="audit" ${defaultSource === 'audit' ? 'selected' : ''}>${te('source_audit') || 'Audit'}</option>
                    <option value="inspection" ${defaultSource === 'inspection' ? 'selected' : ''}>${te('source_inspection') || 'Inspection'}</option>
                    <option value="autre" ${defaultSource === 'autre' ? 'selected' : ''}>${te('source_autre') || 'Autre'}</option>
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('domaine') || 'Domaine'} *</label>
                <select class="form-select" id="cd_domaine">
                    <option value="">${te('select_option') || 'Sélectionner'}</option>
                    ${domaines.map(d => `<option value="${d.id}" ${defaultDomaineId===d.id?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>Secteur</label>
                <select class="form-select" id="cd_secteur" onchange="execCdOnSecteurChange()">
                    <option value="">${te('select_option') || 'Sélectionner'}</option>
                    ${secteurs.map(s => `<option value="${s.id}" ${defaultSecteurId===s.id?'selected':''}>${_esc(s.code || s.nom)}</option>`).join('')}
                </select>
            </div>
        </div>
        `, true, '', te('cd_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
<!-- Row 3 : Réf. Réglementaires (tag-input multi) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
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
                <label>${te('criticite') || 'Criticité'} *</label>
                <select class="form-select" id="cd_criticite" onchange="execApplyCriticiteDelai('cd_criticite','cd_delai','execCdCalcDateDue')">
                    ${_execCriticiteOptions(c.criticite || c.gravite)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('cas') || 'Cas'}</label>
                <select class="form-select" id="cd_cas">
                    ${_execTypeCasOptions(c.cas_type || c.cas, true)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>Délai</label>
                <input type="number" class="form-input" id="cd_delai" min="1" value="${_escAttr(c.delai_solde || c.delai_correction || _execCriticiteDelai(c.criticite || c.gravite) || '30')}" oninput="execCdCalcDateDue()" onchange="execCdCalcDateDue()">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_due') || 'Date Due'}</label>
                <input type="date" class="form-input" id="cd_date_due" value="${_escAttr(c.date_due_cloture || c.date_due || '')}" readonly style="background:var(--bg);">
            </div>
        </div>

        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label>${te('recommandation') || 'Recommandation'}</label>
            <textarea class="form-input" id="cd_reco" rows="2">${_esc(c.recommandation || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
<!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves') || 'Preuves'}</label>
            <div id="cd_preuves_list">
                ${(c.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.5rem;padding:1.25rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('cd_proof_input').click()">
                ${EXEC_ICONS.upload || '↑'} ${te('upload_zone') || 'Glisser ou cliquer pour téléverser'}
                <input type="file" id="cd_proof_input" style="display:none;" multiple onchange="execCdUploadProof(this.files)">
            </div>
        </div>
        `, true, '', te('fnc_aide_preuves'))}
    </div>`;

    // Barre inférieure : sortie, impression de la fiche, brouillon.
    const footer = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>
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
        _execToast(te('fill_required') || 'Remplir les champs obligatoires', 'warning');
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
            _execToast(te('saved') || 'Enregistré', 'success');
            execRenderPage();
        }
    } catch (e) {
        console.error('Save constatation directe error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

// Soumission à la validation. Aucun validateur n'est désigné : la
// constatation entre dans la file de ceux qui ont qualité pour la prononcer.
async function execSubmitConstatationDirecteForValidation(fncId) {
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-soumettre`, { method: 'PUT' });
        await execRefreshDynamic();
        execCloseSlider();
        _execToast(te('submitted_for_validation') || 'Soumis pour validation', 'success');
        execRenderPage();
    } catch (e) {
        console.error('Submit constatation directe error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
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
        + `<button class="btn btn-primary btn-sm" onclick="execValidateConstatationDirecte('${fnc.id}')">${EXEC_ICONS.check} ${te('valider') || 'Valider'}</button>`
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
            ${roField(te('reference') || 'Référence', fnc.reference)}
            ${roField(te('provider') || 'Prestataire', prestataire ? prestataire.nom : fnc.prestataire_id)}
            ${roField(te('emis_par') || 'Émis par', fnc.emis_par)}
            ${roField(te('adresse_a') || 'Adressé à', fnc.adresse_a)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
            ${roField(te('source') || 'Source', sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine') || 'Domaine', dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        `, true, '', te('cd_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
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
            ${roField(te('criticite') || 'Criticité', fnc.criticite)}
            ${roField(te('cas') || 'Cas', fnc.cas_type || fnc.cas)}
            ${roField('Délai', fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due') || 'Date Due', fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : '')}
        </div>
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation') || 'Recommandation'}</label>
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
    let footer = `<button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>`;
    footer += `<button class="btn btn-outline" onclick="execFicheConstatPdf('${fnc.id}')">${EXEC_ICONS.pdf || EXEC_ICONS.file} ${te('imprimer_constatation')}</button>`;
    if (etape === 'preparation' && isCreator && ['direct_brouillon', 'direct_renvoye'].includes(st)) {
        footer += `<button class="btn btn-primary" onclick="execCloseSlider();execOpenConstatationDirecteForm(${JSON.stringify(fnc).replace(/"/g,'&quot;')})">${te('edit') || 'Modifier'}</button>`;
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
                   placeholder="adresse@prestataire.bj"${ro}>
        </div>
        <div class="exec-courriel-copies">
            <div class="form-group">
                <label>Copie (Cc)</label>
                <input type="text" class="form-input" id="courriel_copie" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
            <div class="form-group">
                <label>Copie cachée (Cci)</label>
                <input type="text" class="form-input" id="courriel_copie_cachee" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
        </div>
        <div class="form-group">
            <label>Objet</label>
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
    if (!destinataire) { _execToast('Indiquez au moins un destinataire', 'error'); return; }
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
        _execToast(te('validated') || 'Validé', 'success');
        execRenderPage();
        // La décision prise, le formulaire se rouvre sur l'étape suivante.
        execOpenConstatationDirecteSlider(fncId, 'transmission');
    } catch (e) {
        console.error('Validate error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
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
            <textarea id="exec_comment_text" class="form-input" rows="3" placeholder="Saisir le motif…" style="resize:vertical;"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
            <button class="btn btn-outline" onclick="document.getElementById('exec_comment_modal').remove()">Annuler</button>
            <button class="btn" style="background:${color};color:#fff;border:none;" id="exec_comment_confirm">Confirmer</button>
        </div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#exec_comment_confirm').onclick = () => {
        const txt = (document.getElementById('exec_comment_text')?.value || '').trim();
        if (!txt) { _execToast('Commentaire obligatoire', 'warning'); return; }
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
            Les commentaires de validation sont transmis comme motif ; cette version est figée.
        </p>
        ${entrees.length ? `<div class="exec-cd-motif-corps" style="padding:0;">
            ${entrees.map((x) => `<div class="exec-cd-motif-ligne">
                <i>${_esc(execCdLibelleCible(x.cible))}</i> : ${_esc(x.texte)}</div>`).join('')}
        </div>`
        : `<p style="color:#b91c1c;font-size:.84rem;margin:0;">Aucun commentaire enregistré :
           le postulant ne saura pas ce qui est attendu.</p>`}`;
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
            <button class="btn btn-outline" onclick="document.getElementById('${id}').remove()">${te('cancel') || 'Annuler'}</button>
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
            _execToast('Constatation renvoyée pour correction', 'success');
            execOpenConstatationDirecteSlider(fncId, 'preparation');
            execRenderPage();
        } catch (e) { _execToast('Erreur: ' + (e?.message || ''), 'error'); }
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
            _execToast('Constatation rejetée', 'success');
            execRenderPage();
            execOpenConstatationDirecteSlider(fncId, 'validation');
        } catch (e) { _execToast('Erreur: ' + (e?.message || ''), 'error'); }
    });
}


// ══════════════════════════════════════
//  PAC FOLLOW-UP SLIDER
// ══════════════════════════════════════

// ══════════════════════════════════════
//  Fil d'avancement du Suivi des PAC
// ══════════════════════════════════════
// Quatre étapes, chacune bornée par un jalon vérifiable :
//   Soumission     transmission de la constatation → soumission du PAC par le prestataire
//   Acceptation    soumission du PAC → acceptation du plan par l'AAC
//   Mise en oeuvre acceptation du plan → acceptation des preuves de mise en oeuvre
//   Clôture        l'AAC solde la constatation
// Un PAC renvoyé au prestataire ramène le fil à l'étape Soumission.
const EXEC_PAC_ETAPES = [
    { id: 'soumission', cle: 'pac_etape_soumission' },
    { id: 'acceptation', cle: 'pac_etape_acceptation' },
    { id: 'mise_oeuvre', cle: 'pac_etape_mise_oeuvre' },
    { id: 'cloture', cle: 'pac_etape_cloture' },
];

function execPacEtat(statut, evaluationANAC, submitInfo) {
    const acceptation = (evaluationANAC && evaluationANAC.acceptation) || {};
    const verification = (evaluationANAC && evaluationANAC.verification) || {};
    const cloture = (evaluationANAC && evaluationANAC.cloture) || {};

    const soldee = statut === 'soldee';
    const rejete = statut === 'pac_rejetee';
    // Le statut fait foi autant que la saisie : un PAC porté à « pac_valide »
    // est accepté, même si le bloc d'évaluation a été vidé par un
    // enregistrement antérieur. Sans cela le circuit se retrouvait bloqué,
    // sans action ni côté AAC ni côté prestataire.
    const valide = statut === 'pac_valide';
    // Le PAC a été soumis au moins une fois — un renvoi annule ce jalon, le
    // prestataire devant soumettre de nouveau.
    const soumis = !rejete && (statut === 'pac_soumis' || valide || soldee || !!submitInfo
        || acceptation.accepte === 'OUI');
    const accepte = acceptation.accepte === 'OUI' || valide || soldee;
    // Preuves de mise en oeuvre acceptées : prononcé explicite de l'AAC,
    // isolement et risques traités, ou mise en oeuvre déclarée effective.
    const preuvesAcceptees = verification.preuves_acceptees === 'OUI'
        || (verification.isolement_realise === 'OUI' && verification.risques_traites === 'OUI')
        || cloture.mise_en_oeuvre_effective === 'OUI';

    const faites = {
        soumission: soumis,
        acceptation: accepte,
        // Une constatation soldée a nécessairement franchi la mise en oeuvre.
        mise_oeuvre: (accepte && preuvesAcceptees) || soldee,
        cloture: soldee,
    };
    return {
        faites,
        soldee,
        rejete,
        courante: EXEC_PAC_ETAPES.map((e) => e.id).find((id) => !faites[id]) || null,
    };
}

function execPacFilHtml(statut, evaluationANAC, submitInfo, actionsHtml) {
    const etat = execPacEtat(statut, evaluationANAC, submitInfo);
    const etapes = EXEC_PAC_ETAPES.map((e) => {
        const cls = ['eval-step', 'exec-pac-step',
            etat.faites[e.id] ? 'done' : '',
            // Un PAC renvoyé signale le retour à l'étape Soumission en rouge.
            !etat.faites[e.id] && etat.courante === e.id && etat.rejete && e.id === 'soumission' ? 'rejected' : '',
            !etat.faites[e.id] && etat.courante === e.id && !(etat.rejete && e.id === 'soumission') ? 'current' : '',
        ].filter(Boolean).join(' ');
        const label = te(e.cle);
        return `<div class="${cls}" title="${_escAttr(label)}">${_esc(label)}</div>`;
    }).join('');
    return `<div class="exec-proc-barre exec-pac-barre">
        <div class="eval-steps exec-proc-fil">${etapes}</div>
        ${actionsHtml ? `<div class="exec-proc-actions-etape">${actionsHtml}</div>` : ''}
    </div>`;
}

// ══════════════════════════════════════
//  Amendement du PAC : champs suivis et motifs
// ══════════════════════════════════════
// Comparés à la dernière version acceptée du plan. Toute divergence lève un
// drapeau et réclame le motif de la modification avant toute soumission.
const EXEC_PAC_CHAMPS_SUIVIS = [
    { cle: 'cause_primaire', id: 'pac_cause_primaire', libelle: 'cause_root', ancre: 'pac_cause_primaire' },
    { cle: 'action_curative', id: 'pac_action_curative', libelle: 'action_curative_correction', ancre: 'pac_action_curative' },
    { cle: 'curative_date_prevue', id: 'pac_curative_date_prevue', libelle: 'date_prevue_curative', ancre: 'pac_action_curative' },
    { cle: 'actions_correctives', id: 'pac_actions_correctives', libelle: 'action_corrective_prevention', ancre: 'pac_actions_correctives' },
    { cle: 'corrective_date_prevue', id: 'pac_corrective_date_prevue', libelle: 'date_prevue_corrective', ancre: 'pac_actions_correctives' },
];

const EXEC_PAC_MOTIFS = [
    'motif_nouvelle_cause', 'motif_nouvelle_action', 'motif_refonte_action',
    'motif_modification_date', 'motif_observations_aac', 'motif_correction_mineure', 'motif_autres',
];

// Bloc posé sous le champ : drapeau, intitulé du champ, motif, précision.
function _execPacMotifHtml(champ, valeurInitiale, motif, editable, modifie) {
    const m = motif || {};
    const autre = m.motif === 'motif_autres';
    if (!editable) {
        // Lecture seule (AAC, versions figées) : le motif enregistré s'affiche
        // tel quel, précédé du drapeau.
        if (!m.motif) return '';
        const texte = m.motif === 'motif_autres' ? (m.precision || te('motif_autres')) : te(m.motif);
        return `<div class="exec-pac-motif visible" data-cle="${champ.cle}">
            <span class="exec-pac-drapeau" title="${te('champ_amende')}">${EXEC_ICONS.flag || '⚑'}</span>
            <span class="exec-pac-motif-champ">${te(champ.libelle)}</span>
            <span class="exec-pac-motif-valeur">${_esc(texte)}</span>
        </div>`;
    }
    return `<div class="exec-pac-motif${(modifie || m.motif) ? ' visible' : ''}" id="motif_bloc_${champ.cle}" data-cle="${champ.cle}"
                 data-initial="${_escAttr(valeurInitiale || '')}">
        <span class="exec-pac-drapeau" title="${te('champ_amende')}">${EXEC_ICONS.flag || '⚑'}</span>
        <span class="exec-pac-motif-champ">${te(champ.libelle)}</span>
        <select class="form-input exec-pac-motif-select" id="motif_sel_${champ.cle}"
                onchange="execPacMotifChange('${champ.cle}')">
            <option value="">${te('motif_choisir')}</option>
            ${EXEC_PAC_MOTIFS.map((k) => `<option value="${k}"${m.motif === k ? ' selected' : ''}>${te(k)}</option>`).join('')}
        </select>
        <input type="text" class="form-input exec-pac-motif-precision" id="motif_txt_${champ.cle}"
               placeholder="${te('motif_preciser')}" value="${_escAttr(m.precision || '')}"${autre ? '' : ' hidden'}>
    </div>`;
}

// Affiche ou masque le champ de précision selon le motif retenu.
window.execPacMotifChange = function (cle) {
    const sel = document.getElementById(`motif_sel_${cle}`);
    const txt = document.getElementById(`motif_txt_${cle}`);
    if (!sel || !txt) return;
    txt.hidden = sel.value !== 'motif_autres';
    // Le signalement rouge s'efface dès que le motif est renseigné.
    if (sel.value) sel.classList.remove('exec-pac-manquant');
    if (!txt.hidden) { txt.oninput = () => txt.classList.toggle('exec-pac-manquant', !txt.value.trim()); txt.focus(); }
};

// Un champ suivi vient d'être touché : le bloc de motif suit la divergence
// avec la version acceptée, sans reconstruire le formulaire.
window.execPacSurveillerChamp = function (cle) {
    const champ = EXEC_PAC_CHAMPS_SUIVIS.find((c) => c.cle === cle);
    const saisie = champ && document.getElementById(champ.id);
    const bloc = document.getElementById(`motif_bloc_${cle}`);
    if (!saisie || !bloc) return;
    const modifie = String(saisie.value || '').trim() !== String(bloc.dataset.initial || '').trim();
    bloc.classList.toggle('visible', modifie);
    saisie.classList.toggle('exec-pac-champ-amende', modifie);
    if (!modifie) {
        const sel = document.getElementById(`motif_sel_${cle}`);
        const txt = document.getElementById(`motif_txt_${cle}`);
        if (sel) sel.value = '';
        if (txt) { txt.value = ''; txt.hidden = true; }
    }
};

// Motifs saisis, et champs amendés restés sans motif.
function _execPacMotifs() {
    const motifs = {};
    const manquants = [];
    EXEC_PAC_CHAMPS_SUIVIS.forEach((champ) => {
        const bloc = document.getElementById(`motif_bloc_${champ.cle}`);
        const saisie = document.getElementById(champ.id);
        if (!bloc || !saisie) return;
        if (String(saisie.value || '').trim() === String(bloc.dataset.initial || '').trim()) return;
        const motif = (document.getElementById(`motif_sel_${champ.cle}`) || {}).value || '';
        const precision = ((document.getElementById(`motif_txt_${champ.cle}`) || {}).value || '').trim();
        if (!motif || (motif === 'motif_autres' && !precision)) {
            manquants.push({ champ, motif });
            return;
        }
        motifs[champ.cle] = { motif, precision: motif === 'motif_autres' ? precision : '' };
    });
    return { motifs, manquants };
}

// Bloc repliable des versions du PAC : le bandeau porte l'état de son bloc.
window.execPacBlocToggle = function (bouton) {
    const bloc = bouton && bouton.parentElement;
    if (!bloc) return;
    const ouvert = bloc.classList.toggle('ouvert');
    bouton.setAttribute('aria-expanded', String(ouvert));
};

// Volet des commentaires de suivi : replié par défaut, déplié à la demande.
window.execPacVoletToggle = function () {
    const volet = document.getElementById('execPacVolet');
    if (!volet) return;
    const ouvert = volet.classList.toggle('ouvert');
    const poignee = volet.querySelector('.exec-pac-volet-poignee');
    if (poignee) {
        poignee.setAttribute('aria-expanded', String(ouvert));
        poignee.title = ouvert ? te('volet_replier') : te('volet_deplier');
    }
};

// ══════════════════════════════════════
//  AJUSTEMENT DU RAPPEL DE LA CONSTATATION
// ══════════════════════════════════════
// Revenir sur un délai, une criticité ou l'énoncé d'une constatation déjà
// notifiée engage l'administration : réservé aux comptes SUPERADMIN et ADMIN
// sur leur portée, confirmé par mot de passe, et tracé dans le volet de droite.
const EXEC_AJUST_PORTEES = {
    prorogation: { champs: ['delai_solde'], couleur: '#0284c7' },
    criticite: { champs: ['delai_solde', 'criticite'], couleur: '#f97316' },
    complet: {
        champs: ['delai_solde', 'criticite', 'date_ouverture', 'description', 'ref_reglementaires'],
        couleur: '#7c3aed',
    },
};

function _execPeutAjuster() {
    return ['SUPERADMIN', 'ADMIN'].includes((EXEC_STATE.user || {}).role) && _execCanValidate();
}

function _execAjustBoutons(fnc) {
    if (!_execPeutAjuster()) return '';
    const b = (portee, libelle) => `<button type="button" class="btn btn-sm btn-outline exec-ajust-btn"
        onclick="event.stopPropagation();execAjustOuvrir('${fnc.id}','${portee}')"
        title="${_escAttr(te('ajust_' + portee + '_aide'))}">${_esc(libelle)}</button>`;
    return `<span class="exec-ajust-actions" onclick="event.stopPropagation();">
        ${b('prorogation', te('ajust_prorogation'))}
        ${b('criticite', te('ajust_criticite'))}
        ${b('complet', te('ajust_complet'))}
    </span>`;
}

// Volet de traçabilité, sur le modèle des commentaires de suivi : le dernier
// ajustement déplié, les précédents repliés.
function _execAjustVoletHtml(fnc) {
    const liste = fnc.ajustements || [];
    const cartes = liste.map((a, i) => {
        const deplie = i === liste.length - 1;
        const couleur = (EXEC_AJUST_PORTEES[a.portee] || {}).couleur || '#0284c7';
        return `<div class="exec-suivi-comm exec-ajust-carte${deplie ? '' : ' replie'}"
                     style="border-left-color:${couleur};">
            <div class="exec-suivi-comm-tete" onclick="execSuiviCommToggle(this)">
                <span class="exec-suivi-comm-chevron">${EXEC_ICONS.chevronDown}</span>
                <strong>${te('ajust_rang')} ${i + 1}</strong>
                <span>
                    <em class="exec-suivi-auteur">${_esc(a.auteur || '')}</em>
                    ${a.date ? _formatDate(String(a.date).slice(0, 10)) : ''}
                </span>
            </div>
            <div class="exec-suivi-comm-corps">
                <div class="exec-suivi-comm-items">
                    <span style="background:${couleur}22;color:${couleur};">${te('ajust_' + a.portee)}</span>
                </div>
                <div class="exec-ajust-changements">
                    ${(a.changements || []).map((c) => `<div class="exec-ajust-ligne">
                        <span class="lib">${_esc(c.libelle || c.champ)}</span>
                        <span class="avant">${_esc(c.avant || '—')}</span>
                        ${EXEC_ICONS.next || '→'}
                        <span class="apres">${_esc(c.apres || '—')}</span>
                    </div>`).join('')}
                </div>
                <div class="exec-suivi-comm-texte">${_esc(a.motif || '')}</div>
            </div>
        </div>`;
    }).join('');
    // Volet rabattable à l'horizontale, sur le modèle des détails de suivi :
    // replié il ne montre que sa poignée verticale.
    return `
    <div class="exec-pac-volet exec-rappel-volet" id="execAjustVolet">
        <button type="button" class="exec-pac-volet-poignee" onclick="execAjustVoletToggle()"
                title="${_escAttr(te('volet_deplier'))}" aria-expanded="false" aria-controls="execAjustVoletCorps">
            <span class="exec-pac-volet-chevron">${EXEC_ICONS.chevronDown}</span>
            <span class="exec-pac-volet-titre">${te('ajust_journal')}${liste.length ? ` (${liste.length})` : ''}</span>
        </button>
        <div class="exec-pac-volet-corps" id="execAjustVoletCorps">
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header exec-teinte-ambre" onclick="execAjustVoletToggle()">
                    <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                    <span class="exec-form-section-title">${te('ajust_journal')}</span>
                    <span class="exec-suivi-comm-compte">${liste.length}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                    <div class="exec-ajust-liste">
                        ${cartes || `<em class="exec-ajust-vide">${te('ajust_aucun')}</em>`}
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

window.execAjustVoletToggle = function () {
    const volet = document.getElementById('execAjustVolet');
    if (!volet) return;
    const ouvert = volet.classList.toggle('ouvert');
    const poignee = volet.querySelector('.exec-pac-volet-poignee');
    if (poignee) {
        poignee.setAttribute('aria-expanded', String(ouvert));
        poignee.title = ouvert ? te('volet_replier') : te('volet_deplier');
    }
};

window.execAjustOuvrir = function (fncId, portee) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    const cfg = EXEC_AJUST_PORTEES[portee];
    if (!cfg) return;
    const dateOuv = String(fnc.date_ouverture || fnc.date_creation || '').slice(0, 10);
    const champ = {
        delai_solde: `<div class="form-group">
            <label class="form-label" for="ajust_delai_solde">${te('delai_solde')}</label>
            <input type="number" min="1" class="form-input" id="ajust_delai_solde"
                   value="${_escAttr(fnc.delai_solde || '')}" oninput="execAjustEcheance()">
        </div>`,
        criticite: `<div class="form-group">
            <label class="form-label" for="ajust_criticite">${te('criticite_label')}</label>
            <select class="form-select" id="ajust_criticite">
                ${_execCriticiteOptions(fnc.criticite || fnc.gravite)}
            </select>
        </div>`,
        date_ouverture: `<div class="form-group">
            <label class="form-label" for="ajust_date_ouverture">${te('date_ouverture')}</label>
            <input type="date" class="form-input" id="ajust_date_ouverture"
                   value="${_escAttr(dateOuv)}" onchange="execAjustEcheance()">
        </div>`,
        description: `<div class="form-group">
            <label class="form-label" for="ajust_description">${te('description_constatation')}</label>
            <textarea class="form-input" id="ajust_description" rows="4">${_esc(fnc.description || fnc.titre || '')}</textarea>
        </div>`,
        ref_reglementaires: `<div class="form-group">
            <label class="form-label" for="ajust_ref_reglementaires">${te('ref_reglementaires_label')}</label>
            <input type="text" class="form-input" id="ajust_ref_reglementaires"
                   value="${_escAttr(fnc.ref_reglementaires || fnc.exigence_ref || '')}">
        </div>`,
    };
    // Les mesures de la constatation — date d'ouverture, délai, criticité,
    // échéance — se lisent sur une même grille : ce sont les quatre bornes
    // d'un même engagement, elles doivent s'aligner.
    const mesures = ['date_ouverture', 'delai_solde', 'criticite'].filter((c) => cfg.champs.includes(c));
    const textes = cfg.champs.filter((c) => !mesures.includes(c));
    const corps = `
    <div class="exec-proc-bloc exec-ajust-form" data-date-ouverture="${_escAttr(dateOuv)}">
        <p class="exec-ajust-intro">${te('ajust_intro')}</p>
        <div class="exec-ajust-mesures">
            ${mesures.map((c) => champ[c] || '').join('')}
            <div class="form-group">
                <label class="form-label">${te('date_due_label')}</label>
                <input type="text" class="form-input exec-ajust-echeance" id="ajust_apercu_echeance" readonly>
            </div>
        </div>
        ${textes.map((c) => champ[c] || '').join('')}
        <div class="form-group">
            <label class="form-label" for="ajust_motif">${te('ajust_motif')}</label>
            <textarea class="form-input" id="ajust_motif" rows="3"
                      placeholder="${_escAttr(te('ajust_motif_aide'))}"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label" for="ajust_mdp">${te('ajust_mot_de_passe')}</label>
            <input type="password" class="form-input" id="ajust_mdp" autocomplete="current-password">
        </div>
        <p class="exec-proc-erreur" id="ajust_erreur"></p>
    </div>`;
    const pied = `
        <button class="btn btn-outline" onclick="execAjustRetour('${fncId}')">${te('cancel') || 'Annuler'}</button>
        <button class="btn btn-primary" onclick="execAjustAppliquer('${fncId}','${portee}')">
            ${EXEC_ICONS.check || ''} ${te('appliquer')}
        </button>`;
    // Bandeau : le retour au formulaire de suivi précède l'intitulé, et la
    // croix de fermeture n'a plus lieu d'être.
    const titre = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execAjustRetour('${fncId}')">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.edit || ''} ${te('ajust_' + portee)} — ${_esc(fnc.reference || '')}`;
    execShowSlider(titre, corps, pied, 'third');
    document.querySelector('#execSlider .exec-slider-close')?.remove();
    execAjustEcheance();
};

// Retour : le formulaire de suivi d'où l'on vient reprend la main.
window.execAjustRetour = function (fncId) {
    execCloseSlider();
    setTimeout(() => execOpenPACSlider(fncId), 80);
};

// Aperçu de l'échéance : elle découle du délai et de la date d'ouverture,
// autant la montrer avant de valider.
window.execAjustEcheance = function () {
    const boite = document.querySelector('.exec-ajust-form');
    const apercu = document.getElementById('ajust_apercu_echeance');
    if (!boite || !apercu) return;
    const delai = parseInt((document.getElementById('ajust_delai_solde') || {}).value, 10);
    const ouv = (document.getElementById('ajust_date_ouverture') || {}).value || boite.dataset.dateOuverture;
    if (Number.isNaN(delai) || !/^\d{4}-\d{2}-\d{2}$/.test(String(ouv || ''))) { apercu.value = '—'; return; }
    const d = new Date(`${ouv}T00:00:00`);
    d.setDate(d.getDate() + delai);
    apercu.value = _formatDate(d.toISOString().slice(0, 10));
};

window.execAjustAppliquer = async function (fncId, portee) {
    const cfg = EXEC_AJUST_PORTEES[portee];
    const err = document.getElementById('ajust_erreur');
    const val = (id) => (document.getElementById(id) || {}).value;
    const motif = String(val('ajust_motif') || '').trim();
    const mdp = String(val('ajust_mdp') || '');
    if (!motif) { err.textContent = te('ajust_motif_requis'); return; }
    if (!mdp) { err.textContent = te('ajust_mot_de_passe_requis'); return; }
    const champs = {};
    cfg.champs.forEach((c) => {
        const v = val('ajust_' + c);
        if (v !== undefined) champs[c] = v;
    });
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/ajuster`, {
            method: 'PUT',
            body: JSON.stringify({ portee, champs, motif, admin_password: mdp }),
        });
        execCloseSlider();
        await execRefreshDynamic();
        _execToast(te('ajust_ok'), 'success');
        execOpenPACSlider(fncId);
    } catch (e) {
        err.textContent = (e && e.message) || te('action_impossible');
    }
};

// ── Suivi du PAC : contexte, fabriques de HTML, puis ouverture du volet ──
// Le formulaire est le plus dense du module : on sépare ce qui se calcule (les
// droits, les données) de ce qui s'écrit (chaque section de l'écran). Toutes
// les fabriques reçoivent le même contexte `c`.

// Droits et état du circuit : qui écrit quoi, à quelle étape.
function _execPacDroits(fnc, fncId) {
    // ── Role + status flags ──────────────────────────────────────────
    const isAAC = _execIsAAC();
    const isPostulant = !isAAC;
    const statut = fnc.statut || 'ouvert';
    const isSoldee = statut === 'soldee';
    const isPACSoumis = statut === 'pac_soumis';
    const isPACRejete = statut === 'pac_rejetee';
    const isOuverte = statut === 'ouvert' || statut === 'ouverte';

    // ── Évaluation de l'AAC : lue tôt, le fil et les droits d'écriture en dépendent ──
    let evalData = {};
    if (fnc.commentaire_evaluation) {
        if (typeof fnc.commentaire_evaluation === 'object') {
            evalData = fnc.commentaire_evaluation;
        } else {
            try { evalData = JSON.parse(fnc.commentaire_evaluation); } catch (e) {
                evalData = { legacy_comment: fnc.commentaire_evaluation };
            }
        }
    }
    const evaluationANAC = evalData.evaluation_anac || {};
    const submitInfo = evalData.submit_info || null;
    const etatFil = execPacEtat(statut, evaluationANAC, submitInfo);

    // Étape « Mise en oeuvre », côté prestataire : deux modes d'écriture, choisis
    // par bouton. `preuves` n'ouvre que le dépôt des preuves ; `amendement`
    // rouvre tout le plan et remettra l'acceptation en jeu à la soumission.
    const modePac = (EXEC_STATE.pacMode && EXEC_STATE.pacMode.fncId === fncId)
        ? (EXEC_STATE.pacMode.modes || []) : [];
    const enMiseEnOeuvre = isPostulant && !isSoldee && etatFil.courante === 'mise_oeuvre';
    if (!enMiseEnOeuvre && modePac.length) EXEC_STATE.pacMode = null;
    // Les deux modes se cumulent. À la soumission, l'amendement l'emporte :
    // le plan repart en acceptation, preuves comprises.
    const modes = enMiseEnOeuvre ? modePac : [];
    const modeAmendement = modes.includes('amendement');
    const modePreuves = modes.includes('preuves');
    const modeSoumission = modeAmendement ? 'amendement' : (modePreuves ? 'preuves' : null);

    // PAC fields are filled ONLY by the postulant (applicant). AAC users always see them read-only.
    const pacEditable = !isSoldee && isPostulant
        && (isOuverte || isPACRejete || modeAmendement);
    // Dépôt des preuves : ouvert aussi quand le plan est figé mais que le
    // prestataire a demandé à joindre ses preuves de mise en oeuvre.
    const preuvesEditable = pacEditable || modePreuves;
    // L'évaluation n'a pas d'objet tant que le plan n'est pas soumis : les
    // « Résultats du Suivi » et les commentaires restent en lecture seule
    // jusqu'à l'étape Acceptation.
    const evaluationOuverte = etatFil.faites.soumission;
    const aacEditable = isAAC && !isSoldee && evaluationOuverte;
    // Postulant only sees the AAC evaluation section once the FNC is soldée.
    const showAACSection = isAAC || isSoldee;

    const pacRO = pacEditable ? '' : 'readonly';
    const aacRO = aacEditable ? '' : 'readonly';
    const aacDis = aacEditable ? '' : 'disabled';
    const lockedBg = (editable) => editable ? '' : 'background:var(--bg);';
    return {
        isAAC, isPostulant, statut, isSoldee, isPACSoumis, isPACRejete, isOuverte,
        evalData, evaluationANAC, submitInfo, etatFil, enMiseEnOeuvre, modes,
        modeAmendement, modePreuves, modeSoumission, pacEditable, preuvesEditable,
        evaluationOuverte, aacEditable, showAACSection, pacRO, aacRO, aacDis, lockedBg,
    };
}

// Données affichées : intitulés résolus, échéance, plan, évaluation et suivi.
function _execPacDonnees(fnc, droits) {
    const { isAAC, evalData, evaluationANAC } = droits;
    // ── Resolve domaine + prestataire ────────────────────────────────
    const domaines = EXEC_STATE.data.domaines || [];
    const domaineObj = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const domaineName = domaineObj ? domaineObj.nom : (fnc.domaine || fnc.domaine_id || '-');

    const prestataires = EXEC_STATE.data.prestataires || [];
    let prestataireName = '-';
    if (fnc.prestataire_id) {
        const prestObj = prestataires.find(p => p.id === fnc.prestataire_id);
        prestataireName = prestObj ? prestObj.nom : (fnc.prestataire_nom || fnc.prestataire_id);
    } else if (fnc.prestataire_nom) {
        prestataireName = fnc.prestataire_nom;
    } else if (fnc.dossier_id) {
        const dossiers = EXEC_STATE.data.dossiers || [];
        const rel = dossiers.find(d => d.id === fnc.dossier_id);
        if (rel) prestataireName = rel.prestataire_nom || '-';
    }

    // ── Compute date due ─────────────────────────────────────────────
    let dateDue = fnc.date_due_cloture;
    if (!dateDue || dateDue.length < 8 || isNaN(new Date(dateDue).getTime())) {
        const dl = parseInt(fnc.delai_solde || fnc.delai_correction || '0');
        const dO = fnc.date_ouverture || fnc.date_creation;
        if (dl > 0 && dO) { const d = new Date(dO); d.setDate(d.getDate() + dl); dateDue = d.toISOString().slice(0,10); } else { dateDue = ''; }
    }

    // ── Parse PAC data ───────────────────────────────────────────────
    const actions = fnc.actions_correctives || [];
    const pac = actions[0] || {};

    const acceptation = evaluationANAC.acceptation || {};
    const verification = evaluationANAC.verification || {};
    const cloture = evaluationANAC.cloture || {};
    const itemsComments = evalData.items_comments || {};
    // Commentaires de suivi : le fil courant, précédé des échanges enregistrés
    // item par item dans l'ancienne présentation en table.
    const commentairesSuivi = [
        // Les échanges de l'ancienne table sont réputés transmis.
        ...Object.entries(itemsComments).flatMap(([cle, liste]) => (liste || []).map((c) => ({
            date: c.date || '', auteur: c.auteur || '',
            items: [cle === 'cause_primaire' ? 'cause' : cle], precision: '', texte: c.texte || '',
            publie: true,
        }))),
        ...(evalData.suivi_commentaires || []),
    ]
        .filter((c) => c.publie || isAAC)      // le prestataire ne lit que le transmis
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const rejetInfo = evalData.rejet_info || null;
    const preuvesInfo = evalData.preuves_info || null;
    const preuvesRefus = evalData.preuves_refus || null;
    const retourMiseEnOeuvre = evalData.retour_mise_oeuvre || null;
    const versionsPac = fnc.versions_pac || [];

    return {
        domaineName, prestataireName, dateDue, pac, acceptation, verification, cloture,
        commentairesSuivi, rejetInfo, preuvesInfo, preuvesRefus, retourMiseEnOeuvre, versionsPac,
    };
}

// Fabriques dépendant du mode d'édition : motifs d'amendement, preuves, versions.
function _execPacOutils(fnc, c) {
    const { pac, modeAmendement, preuvesEditable, versionsPac } = c;
    const pacAccepte = ((fnc.pac_accepte || {}).actions_correctives || [])[0] || pac;
    const motifsEnregistres = pac.motifs_amendement || {};
    const motifBloc = (cle) => {
        const champ = EXEC_PAC_CHAMPS_SUIVIS.find((c) => c.cle === cle);
        if (!champ) return '';
        const initiale = pacAccepte[cle] || '';
        const modifie = String(pac[cle] || '').trim() !== String(initiale).trim();
        return _execPacMotifHtml(champ, initiale, motifsEnregistres[cle], modeAmendement, modifie);
    };
    const surveille = (cle) => (modeAmendement
        ? `oninput="execPacSurveillerChamp('${cle}')" onchange="execPacSurveillerChamp('${cle}')"` : '');
    // Champ déjà divergent à l'ouverture (brouillon enregistré avant soumission).
    const classeAmendee = (cle) => (modeAmendement
        && String(pac[cle] || '').trim() !== String(pacAccepte[cle] || '').trim()
        ? ' exec-pac-champ-amende' : '');

    const renderProofList = (proofs, containerId, editable) => {
        if (!proofs || !Array.isArray(proofs) || proofs.length === 0) return '';
        return proofs
            .map((p, i) => _execPreuveHtml(typeof p === 'string' ? { filename: p } : p, i + 1, editable))
            .join('');
    };

    const renderUploadZone = (prefix, listId, editable) => {
        if (!editable) return '';
        return `<div style="margin-top:0.35rem;padding:0.5rem;border:2px dashed var(--border);border-radius:6px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.75rem;" onclick="execUploadPACProof('${prefix}')">
            ${EXEC_ICONS.upload} ${te('upload_zone')}
            <input type="file" id="${prefix}_input" style="display:none;" multiple onchange="execHandlePACProofUpload(this.files, '${listId}')">
        </div>`;
    };
    const renderVersionsPac = () => {
        if (!versionsPac.length) return '';
        const ligne = (libelle, valeur) => valeur
            ? `<div style="margin-top:0.3rem;"><span style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${libelle}</span><div>${valeur}</div></div>`
            : '';
        return `<div class="exec-pac-versions">
            <button type="button" class="exec-pac-versions-bandeau" aria-expanded="false"
                    onclick="execPacBlocToggle(this)">
                <span class="exec-pac-versions-pastille">${versionsPac.length}</span>
                <span class="exec-pac-versions-titre">${te('versions_pac')}</span>
                <span class="exec-pac-versions-chevron">${EXEC_ICONS.chevronDown}</span>
            </button>
            <div class="exec-pac-versions-corps">
                ${versionsPac.map((v, i) => {
                    const p = (v.actions_correctives || [])[0] || {};
                    const acc = v.acceptation || {};
                    const detail = [
                        `${te('amende_le')} ${_formatDate((v.date || '').slice(0, 10))}`,
                        v.auteur ? _esc(v.auteur) : '',
                        acc.date ? `${te('date_acceptation')} ${_formatDate(acc.date)}` : '',
                    ].filter(Boolean).join(' · ');
                    return `<div class="exec-pac-version">
                        <button type="button" class="exec-pac-versions-bandeau" aria-expanded="false"
                                onclick="execPacBlocToggle(this)">
                            <span class="exec-pac-versions-titre">${te('version_n')} ${i + 1}
                                <span style="font-weight:normal;color:var(--text-muted);">— ${detail}</span>
                            </span>
                            <span class="exec-pac-versions-chevron">${EXEC_ICONS.chevronDown}</span>
                        </button>
                        <div class="exec-pac-version-corps">
                            ${ligne(te('cause_root'), _esc(p.cause_primaire || ''))}
                            ${ligne(te('action_curative_correction'), _esc(p.action_curative || ''))}
                            ${ligne(te('action_corrective_prevention'), _esc(p.actions_correctives || ''))}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    };
    return { motifBloc, surveille, classeAmendee, renderProofList, renderUploadZone, renderVersionsPac };
}

// Boutons du circuit, portés par la ligne du fil d'avancement.
function _execPacActionsFil(c) {
    const {
        fncId, isAAC, isPostulant, isOuverte, isPACRejete, isPACSoumis,
        isSoldee, enMiseEnOeuvre, modes, modeSoumission, etatFil,
    } = c;
    let filActions = '';
    if (isPostulant && (isOuverte || isPACRejete)) {
        filActions = `<button class="btn btn-primary btn-sm" onclick="execSubmitPAC('${fncId}')">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    } else if (isPostulant && isPACSoumis) {
        // État désactivé : le PAC attend l'examen de l'AAC.
        filActions = `<button class="btn btn-primary btn-sm" disabled title="${te('pac_soumis')}">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    }
    // Étape Mise en oeuvre, côté prestataire : joindre les preuves, rouvrir le
    // plan, ou les deux. La soumission n'a de sens qu'un mode au moins choisi.
    if (enMiseEnOeuvre) {
        const btn = (mode, cle) => `<button class="btn btn-sm ${modes.includes(mode) ? 'btn-primary' : 'btn-outline'}"
            aria-pressed="${modes.includes(mode)}" onclick="execPacModeEdition('${fncId}', '${mode}')">${te(cle)}</button>`;
        filActions += ` ${btn('preuves', 'ajouter_preuves')}`;
        filActions += ` ${btn('amendement', 'amender_pac')}`;
        filActions += modeSoumission
            ? ` <button class="btn btn-primary btn-sm" onclick="execSoumettreMiseEnOeuvre('${fncId}', '${modeSoumission}')">${EXEC_ICONS.send} ${te('soumettre')}</button>`
            : ` <button class="btn btn-primary btn-sm" disabled title="${te('choisir_mode_pac')}">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    }
    if (isAAC && isPACSoumis) {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execReturnPACtoPostulant('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer')}</button>`;
    }
    // Étape Mise en oeuvre, côté AAC : statuer sur les preuves déposées.
    if (isAAC && !isSoldee && etatFil.courante === 'mise_oeuvre') {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execPreuvesNonAcceptables('${fncId}')">${EXEC_ICONS.x} ${te('preuves_non_acceptables')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPreuves('${fncId}')">${EXEC_ICONS.check} ${te('acceptation')}</button>`;
    }
    // Étape Clôture, côté AAC : renvoyer à la mise en oeuvre, ou clôturer.
    if (isAAC && !isSoldee && etatFil.courante === 'cloture') {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execRenvoyerMiseEnOeuvre('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execCloseFNC('${fncId}')">${EXEC_ICONS.check} ${te('cloturer')}</button>`;
    }
    // Étape Acceptation, côté AAC : accepter le plan seul, ou plan et preuves.
    // Le second jalon clôt d'un coup l'acceptation et la mise en oeuvre.
    if (isAAC && isPACSoumis && etatFil.courante === 'acceptation') {
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPAC('${fncId}', false)">${EXEC_ICONS.check} ${te('accepter_pac')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPAC('${fncId}', true)">${EXEC_ICONS.check} ${te('accepter_pac_preuves')}</button>`;
    }
    return filActions;
}

// Bandeaux d’information : renvois, soumissions, preuves, clôture.
function _execPacBandeauxHtml(c) {
    const {
        fnc, isSoldee, submitInfo, modes, modeAmendement, modePreuves,
        verification, rejetInfo, preuvesInfo, preuvesRefus, retourMiseEnOeuvre,
    } = c;
    return `
    ${rejetInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('pac_renvoye_titre')} ${rejetInfo.date ? `(${_formatDate(rejetInfo.date)})` : ''} ${rejetInfo.auteur ? `— ${_esc(rejetInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(rejetInfo.motif || '')}</div>
    </div>` : ''}
    ${submitInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.check} ${te('pac_soumis_titre') || 'PAC soumis pour validation'} ${submitInfo.date ? `(${_formatDate(submitInfo.date)})` : ''} ${submitInfo.auteur ? `— ${_esc(submitInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#14532d;"><strong>${te('motif')} :</strong> ${_esc(submitInfo.motif || '')}</div>
    </div>` : ''}
    ${preuvesInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;">
        <div style="font-weight:600;color:#1e40af;font-size:0.85rem;">${EXEC_ICONS.check} ${te('preuves_soumises_titre')} ${preuvesInfo.date ? `(${_formatDate(preuvesInfo.date)})` : ''} ${preuvesInfo.auteur ? `— ${_esc(preuvesInfo.auteur)}` : ''}</div>
    </div>` : ''}
    ${preuvesRefus ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('preuves_refusees_titre')} ${preuvesRefus.date ? `(${_formatDate(preuvesRefus.date)})` : ''} ${preuvesRefus.auteur ? `— ${_esc(preuvesRefus.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(preuvesRefus.motif || '')}</div>
    </div>` : ''}
    ${verification.preuves_acceptees === 'OUI' ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('preuves_acceptees_titre')} ${verification.date_acceptation_preuves ? `(${_formatDate(verification.date_acceptation_preuves)})` : ''} ${verification.acceptees_par ? `— ${_esc(verification.acceptees_par)}` : ''}</div>
    </div>` : ''}
    ${verification.verification_terrain && !isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;">
        <div style="font-weight:600;color:#92400e;font-size:0.85rem;">${EXEC_ICONS.alarm} ${te('verification_terrain_annoncee')}</div>
    </div>` : ''}
    ${retourMiseEnOeuvre ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('renvoye_mise_oeuvre')} ${retourMiseEnOeuvre.date ? `(${_formatDate(retourMiseEnOeuvre.date)})` : ''} ${retourMiseEnOeuvre.auteur ? `— ${_esc(retourMiseEnOeuvre.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(retourMiseEnOeuvre.motif || '')}</div>
    </div>` : ''}
    ${modes.length ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;">
        ${modeAmendement && modePreuves
            ? `<div style="font-weight:600;color:#92400e;font-size:0.85rem;">${te('mode_mixte_actif')}</div>`
            : `<div style="font-weight:600;color:#92400e;font-size:0.85rem;">${modeAmendement ? te('mode_amendement_actif') : te('mode_preuves_actif')}</div>`}
    </div>` : ''}
    ${isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('constatation_soldee') || 'Constatation soldée'}${fnc.date_solde ? ` — ${te('date_solde')} : ${_formatDate(fnc.date_solde.slice(0,10))}` : ''}</div>
    </div>` : ''}`;
}

// Section A — rappel de la constatation et volet d’ajustement.
function _execPacRappelHtml(c) {
    const {
        fnc, domaineName, prestataireName, dateDue,
    } = c;
    return `
    <div class="exec-rappel-rangee">
    <div class="exec-form-section expanded exec-rappel-corps">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">A</span>
            <span class="exec-form-section-title">${te('rappel_constatation')}</span>
            ${_execAjustBoutons(fnc)}
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <div style="display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr 1fr 1fr;gap:0.6rem;font-size:0.78rem;margin-bottom:0.6rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('provider')}</div>
                    <div><strong>${_esc(prestataireName)}</strong></div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('domaine_label')}</div>
                    <div>${_esc(domaineName)}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('date_ouverture')}</div>
                    <div>${fnc.date_ouverture ? _formatDate(fnc.date_ouverture) : (fnc.date_creation ? _formatDate(fnc.date_creation.slice(0,10)) : '-')}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('delai_label')}</div>
                    <div><strong>${_esc(fnc.delai_solde || '-')} ${te('jours')}</strong></div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('criticite_label')}</div>
                    <div>${_execGraviteBadge(fnc.criticite || fnc.gravite)}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('date_due_label')}</div>
                    <div style="color:#dc2626;font-weight:600;">${dateDue ? _formatDate(dateDue) : '-'}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:0.85rem;margin-top:0.4rem;font-size:0.8rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;font-weight:600;">${te('description_constatation')}</div>
                    <p style="margin:0.2rem 0 0 0;color:var(--text);">${_esc(fnc.description || fnc.titre || '')}</p>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;font-weight:600;">${te('ref_reglementaires_label')}</div>
                    <div>${_esc(fnc.ref_reglementaires || fnc.exigence_ref || '-')}</div>
                </div>
            </div>
        </div>
    </div>
    ${_execAjustVoletHtml(fnc)}
    </div>`;
}

// Section B, colonne gauche — le plan d’actions correctives et ses preuves.
function _execPacPlanHtml(c) {
    const {
        isSoldee, isPACSoumis, isPACRejete, pacEditable, preuvesEditable, pacRO,
        lockedBg, prestataireName, pac, motifBloc, surveille, classeAmendee,
        renderProofList, renderUploadZone, renderVersionsPac,
    } = c;
    return `
        <div class="exec-pac-col-gauche">
            <!-- Section 2 : Plan d'Actions Correctives -->
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <span class="exec-form-section-letter">B</span>
                    <span class="exec-form-section-title">${te('plan_actions_correctives')}${isPACSoumis || isPACRejete || isSoldee ? ` <span style="font-weight:normal;color:var(--text-muted);font-size:0.78rem;">(Soumis par ${_esc(prestataireName)})</span>` : ''}</span>
                    <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;">
                    <div class="form-group">
                        <label for="pac_cause_primaire" style="font-size:0.8rem;font-weight:600;">${te('cause_root')}</label>
                        <textarea class="form-input${classeAmendee('cause_primaire')}" id="pac_cause_primaire" rows="2" ${pacRO} ${surveille('cause_primaire')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.cause_primaire || '')}</textarea>
                        ${motifBloc('cause_primaire')}
                    </div>
                    <!-- La date prévue accompagne l'intitulé de l'action, à
                         l'extrême droite de sa ligne ; les preuves occupent
                         ensuite toute la largeur. -->
                    <div class="form-group" style="margin-top:0.55rem;">
                        <div class="exec-pac-ligne-action">
                            <label for="pac_action_curative" style="font-size:0.8rem;font-weight:600;">${te('action_curative_correction')}</label>
                            <div class="exec-pac-date-inline">
                                <label for="pac_curative_date_prevue">${te('date_prevue')}</label>
                                <input type="date" class="form-input${classeAmendee('curative_date_prevue')}" id="pac_curative_date_prevue" value="${_escAttr(pac.curative_date_prevue || '')}" ${pacRO} ${surveille('curative_date_prevue')} style="${lockedBg(pacEditable)}">
                            </div>
                        </div>
                        <textarea class="form-input${classeAmendee('action_curative')}" id="pac_action_curative" rows="2" ${pacRO} ${surveille('action_curative')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.action_curative || '')}</textarea>
                        ${motifBloc('action_curative')}
                        ${motifBloc('curative_date_prevue')}
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                        <div id="pac_curative_preuves_list">${renderProofList(pac.curative_preuves, 'pac_curative_preuves_list', preuvesEditable)}</div>
                        ${renderUploadZone('pac_curative_preuves', 'pac_curative_preuves_list', preuvesEditable)}
                    </div>
                    <div class="form-group" style="margin-top:0.55rem;">
                        <div class="exec-pac-ligne-action">
                            <label for="pac_actions_correctives" style="font-size:0.8rem;font-weight:600;">${te('action_corrective_prevention')}</label>
                            <div class="exec-pac-date-inline">
                                <label for="pac_corrective_date_prevue">${te('date_prevue')}</label>
                                <input type="date" class="form-input${classeAmendee('corrective_date_prevue')}" id="pac_corrective_date_prevue" value="${_escAttr(pac.corrective_date_prevue || '')}" ${pacRO} ${surveille('corrective_date_prevue')} style="${lockedBg(pacEditable)}">
                            </div>
                        </div>
                        <textarea class="form-input${classeAmendee('actions_correctives')}" id="pac_actions_correctives" rows="2" ${pacRO} ${surveille('actions_correctives')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.actions_correctives || '')}</textarea>
                        ${motifBloc('actions_correctives')}
                        ${motifBloc('corrective_date_prevue')}
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                        <div id="pac_corrective_preuves_list">${renderProofList(pac.corrective_preuves, 'pac_corrective_preuves_list', preuvesEditable)}</div>
                        ${renderUploadZone('pac_corrective_preuves', 'pac_corrective_preuves_list', preuvesEditable)}
                    </div>
                    ${renderVersionsPac()}
                </div>
            </div>

        </div>`;
}

// Section B, volet droit — les commentaires de suivi de l’Autorité.
function _execPacSuiviHtml(c) {
    const {
        isAAC, isSoldee, evaluationOuverte, aacEditable, pac, commentairesSuivi,
    } = c;
    return `
        <div class="exec-pac-volet" id="execPacVolet">
            <button type="button" class="exec-pac-volet-poignee" onclick="execPacVoletToggle()"
                    title="${te('volet_deplier')}" aria-expanded="false" aria-controls="execPacVoletCorps">
                <span class="exec-pac-volet-chevron">${EXEC_ICONS.chevronDown}</span>
                <span class="exec-pac-volet-titre">${te('details_suivi')}</span>
            </button>
            <div class="exec-pac-volet-corps" id="execPacVoletCorps">
                <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                    <div class="exec-form-section-header exec-teinte-ambre" onclick="execPacVoletToggle()">
                        <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                        <span class="exec-form-section-title">${te('details_suivi')}</span>
                    </div>
                    <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                        <p style="font-size:0.74rem;color:var(--text-muted);margin:0 0 0.5rem 0;">${te('details_suivi_intro')}</p>
                        <div id="pac_suivi_liste" class="exec-suivi-liste">
                            ${commentairesSuivi.length
                                ? (() => { let rang = 0; const dernier = commentairesSuivi.length - 1;
                                    return commentairesSuivi
                                        .map((c, i) => _execCommentaireSuiviHtml(c, aacEditable,
                                            c.publie ? ++rang : 0, i === dernier))
                                        .join(''); })()
                                : `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>`}
                        </div>
                        ${isAAC && !isSoldee && !evaluationOuverte ? `
                        <p class="exec-suivi-attente">${te('suivi_attente_soumission')}</p>` : ''}
                        ${aacEditable ? `
                        <!-- Rédaction réservée à l'AAC : items visés, précision, texte -->
                        <div class="exec-suivi-composeur">
                            <div class="exec-suivi-items">
                                ${EXEC_PAC_ITEMS_COMMENTABLES.map((it) => `<label class="exec-suivi-puce">
                                    <input type="checkbox" value="${it}" onchange="execSuiviItemsChange(this)"> <span>${te(`item_${it}`)}</span>
                                </label>`).join('')}
                                <label class="exec-suivi-puce">
                                    <input type="checkbox" value="autres" id="pac_suivi_autres" onchange="execSuiviItemsChange(this)"> <span>${te('motif_autres')}</span>
                                </label>
                                <input type="text" class="form-input exec-suivi-precision" id="pac_suivi_precision"
                                       placeholder="${te('motif_preciser')}" hidden>
                            </div>
                            <div class="exec-suivi-saisie">
                                <textarea class="form-input" id="pac_suivi_texte" rows="2" disabled
                                          placeholder="${te('suivi_choisir_item')}"></textarea>
                                <button class="btn btn-sm btn-primary" id="pac_suivi_ajouter" disabled
                                        onclick="execAjouterCommentaireSuivi()">${te('ajouter_commentaire')}</button>
                            </div>
                            <!-- Pièces jointes du commentaire, déposées avant l'ajout. -->
                            <div class="exec-suivi-pj">
                                <div id="pac_suivi_pj_liste"></div>
                                <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()">
                                    ${EXEC_ICONS.upload} ${te('joindre_fichier')}
                                </button>
                                <input type="file" style="display:none;" multiple
                                       onchange="execSuiviJoindreFichiers(this)">
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

// Section C — résultats du suivi : acceptation, vérification, clôture. Elle
// n'apparaît qu'à l'Autorité, et au prestataire une fois la constatation soldée.
function _execPacResultatsHtml(c) {
    const {
        fnc, aacEditable, showAACSection, aacRO, aacDis, lockedBg,
        pac, acceptation, verification, cloture, renderProofList, renderUploadZone,
    } = c;
    if (!showAACSection) return '';
    return `
    <div class="exec-form-section expanded exec-resultats" id="exec_resultats_suivi" style="margin-top:0.6rem;">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">C</span>
            <span class="exec-form-section-title">${te('resultats_suivi')}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <!-- Trois blocs de largeurs 1 / 3 / 2, de hauteurs alignées. -->
            <div style="display:grid;grid-template-columns:1fr 3fr 2fr;gap:0.85rem;align-items:stretch;">

                <!-- C1 Acceptation -->
                <div class="exec-resultats-bloc">
                    <div class="exec-resultats-bloc-titre">${te('acceptation_propositions')}</div>
                    <label class="exec-pac-case">
                        <input type="checkbox" id="anac_pac_accepte" onchange="execPacTeinteResultats()" ${acceptation.accepte === 'OUI' ? 'checked' : ''} ${aacDis}>
                        <span>${te('pac_accepte')}</span>
                    </label>
                    <div class="form-group" style="margin-top:0.45rem;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_acceptation')}</label>
                        <input type="date" class="form-input" id="anac_date_acceptation" value="${_escAttr(acceptation.date || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                    </div>
                </div>

                <!-- C2 Commentaire général de suivi : autant d'entrées que de
                     suivis, chacune datée et signée. -->
                <div class="exec-resultats-bloc" style="display:flex;flex-direction:column;">
                    <div class="exec-resultats-bloc-titre">${te('commentaire_general_suivi')}</div>
                    <div id="anac_suivis_list" class="exec-suivis" style="flex:1;">
                        ${(verification.suivis || []).length
                            ? (verification.suivis || []).map((s) => _execSuiviHtml(s, aacEditable)).join('')
                            : `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_suivi')}</em>`}
                    </div>
                    ${aacEditable ? `<div style="display:flex;gap:0.35rem;margin-top:0.45rem;">
                        <textarea class="form-input" id="anac_suivi_saisie" rows="1" placeholder="${te('suivi_placeholder')}" style="flex:1;font-size:0.76rem;padding:0.3rem;"></textarea>
                        <button class="btn btn-sm btn-primary" onclick="execAjouterSuivi()" style="padding:0.3rem 0.55rem;font-size:0.72rem;">${te('ajouter_suivi')}</button>
                    </div>` : ''}
                    <label class="exec-pac-case" style="margin-top:0.45rem;">
                        <input type="checkbox" id="anac_verif_terrain" onchange="execPacTeinteResultats()" ${verification.verification_terrain ? 'checked' : ''} ${aacDis}>
                        <span>${te('verifier_terrain')}</span>
                    </label>
                </div>

                <!-- C3 Preuves de mise en oeuvre recueillies -->
                <div class="exec-resultats-bloc">
                    <div class="exec-resultats-bloc-titre">${te('preuves_recueillies')}</div>
                    <div id="anac_preuves_mise_oeuvre_list">${renderProofList(verification.preuves_mise_oeuvre, 'anac_preuves_mise_oeuvre_list', aacEditable)}</div>
                    ${renderUploadZone('anac_preuves_mise_oeuvre', 'anac_preuves_mise_oeuvre_list', aacEditable)}
                </div>

            </div>

            <!-- 3d Clôture : pleine largeur, sous les trois blocs -->
            <div class="exec-resultats-bloc" style="margin-top:0.85rem;">
                <div class="exec-resultats-bloc-titre">${te('cloture_fnc')}</div>
                    <label class="exec-pac-case">
                        <input type="checkbox" id="anac_mise_effective" onchange="execPacTeinteResultats()" ${cloture.mise_en_oeuvre_effective === 'OUI' ? 'checked' : ''} ${aacDis}>
                        <span>${te('mise_oeuvre_effective')}</span>
                    </label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.45rem;">
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_solde')}</label>
                            <input type="date" class="form-input" id="anac_date_solde" value="${_escAttr(cloture.date_solde || (fnc.date_solde ? fnc.date_solde.slice(0,10) : ''))}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('solde_par')}</label>
                            <input type="text" class="form-input" id="anac_solde_par" value="${_escAttr(cloture.solde_par || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                    </div>
            </div>
        </div>`;
}

// Volet « Suivi du PAC » : assemble le contexte, les sections, puis l'affiche.
async function execOpenPACSlider(fncId) {
    let fnc;
    let echangesPac = [];
    try {
        [fnc, echangesPac] = await Promise.all([
            api(`${EXEC_MODULE_API}/constatations/${fncId}`),
            api(`${EXEC_MODULE_API}/constatations/${fncId}/echanges`).catch(() => []),
        ]);
    } catch (e) {
        console.error('Load constatation error:', e);
        return;
    }
    if (!fnc) return;
    echangesPac = echangesPac || [];
    EXEC_STATE.selectedConstatation = fnc;
    // Le formulaire se rappelle lui-même à chaque étape : la provenance ne
    // doit se perdre que si l'on passe à une autre constatation.
    execPrendreRetour('pac:' + fncId);

    const droits = _execPacDroits(fnc, fncId);
    const donnees = _execPacDonnees(fnc, droits);
    const c = { fnc, fncId, ...droits, ...donnees };
    Object.assign(c, _execPacOutils(fnc, c));

    const bodyHtml = `
    <div class="exec-proc-entete-collant">${execPacFilHtml(c.statut, c.evaluationANAC, c.submitInfo, _execPacActionsFil(c))}</div>
    ${_execPacBandeauxHtml(c)}
    ${_execPacRappelHtml(c)}

    <!-- Section B — PAC (à gauche) + Commentaires de suivi (à droite) -->
    <div class="exec-pac-rangee">
        ${_execPacPlanHtml(c)}
        ${_execPacSuiviHtml(c)}
    </div>

    ${_execPacResultatsHtml(c)}`;

    // ── Barre du bas ─────────────────────────────────────────────────
    // Annuler abandonne les saisies en cours sans refermer le formulaire.
    let footerHtml = `<button class="btn btn-outline" onclick="execAnnulerSaisiePAC('${fncId}')">${te('cancel')}</button>`;

    // Brouillon — visible for AAC and Postulant when not soldée
    if (!c.isSoldee) {
        footerHtml += ` <button class="btn btn-outline" onclick="execSaveDraftPAC('${fncId}')">${te('sauver_brouillon')}</button>`;
    }

    // Soumettre, Renvoyer, Accepter PAC, Accepter PAC et Preuves, Non
    // acceptable, Acceptable, Clôturer : tous sur la ligne du fil.

    // Export PDF de la fiche complète, à tout moment du circuit.
    footerHtml += ` <button class="btn btn-primary" onclick="execExporterFncPdf('${fncId}')">${EXEC_ICONS.download} ${te('export_pdf')}</button>`;

    // Bandeau : sortie du formulaire à l'extrême gauche, avant son intitulé.
    // Retour ramène là d'où l'on vient quand une provenance a été armée, et
    // referme simplement le volet sinon.
    const titreHtml = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execRetourVolet()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.constatations} ${te('suivi_pac')} — ${_esc(fnc.reference || '')}`;
    execShowSlider(titreHtml, bodyHtml, footerHtml, 'max');
    EXEC_STATE.voletRejouer = () => execOpenPACSlider(fncId);
    // Le formulaire se rejoue à chaque étape : pas de glissement du volet ni de
    // fondu du corps entre deux états.
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
    // Le bandeau porte l'accès aux discussions à la place de la croix.
    _execPacInstallerDiscussions(fncId, echangesPac, c.isSoldee);
    execPacTeinteResultats();
}


function _collectProofsFromContainer(containerId) {
    const proofs = [];
    document.querySelectorAll(`#${containerId} > div`).forEach((div, i) => {
        const d = div.dataset || {};
        if (!d.path) return;
        proofs.push({
            numero: i + 1,
            filename: d.filename || d.intitule || '',
            path: d.path,
            intitule: d.intitule || '',
            commentaire: d.commentaire || '',
            date: d.date || '',
        });
    });
    return proofs;
}

// ── Pièces jointes : intitulé, commentaire, numérotation ─────────
// Une pièce se lit de la même façon qu'elle vienne du serveur ou d'un dépôt
// à l'instant : un seul gabarit, et une renumérotation après chaque retrait.
function _execPreuveHtml(p, numero, editable) {
    const intitule = p.intitule || p.filename || '';
    const fichier = p.filename || '';
    // Le fichier s'ouvre dans un onglet, servi sous l'intitulé de la pièce ;
    // son nom d'origine ne paraît nulle part.
    const lien = p.path
        ? `${p.path}${p.path.includes('?') ? '&' : '?'}nom=${encodeURIComponent(intitule)}`
        : '';
    const date = (p.date || '').slice(0, 10);
    return `<div class="exec-preuve" data-path="${_escAttr(p.path || '')}" data-filename="${_escAttr(fichier)}"
                 data-intitule="${_escAttr(intitule)}" data-commentaire="${_escAttr(p.commentaire || '')}"
                 data-date="${_escAttr(date)}">
        <div class="exec-preuve-tete">
            <span class="exec-preuve-num">${numero}</span>
            ${EXEC_ICONS.file}
            ${lien
                ? `<a class="exec-preuve-intitule" href="${_escAttr(lien)}" target="_blank" rel="noopener"
                       title="${te('ouvrir_piece')}">${_esc(intitule)}</a>`
                : `<span class="exec-preuve-intitule">${_esc(intitule)}</span>`}
            ${date ? `<span class="exec-preuve-date" title="${te('preuve_date')}">${_formatDate(date)}</span>` : ''}
            ${editable ? `<button type="button" class="btn btn-sm btn-outline" title="${te('modifier_piece')}"
                onclick="execPreuveModifier(this)">${EXEC_ICONS.edit}</button>
            <button type="button" class="btn btn-sm btn-danger" title="${te('supprimer') || 'Supprimer'}"
                onclick="execPreuveSupprimer(this)">${EXEC_ICONS.x}</button>` : ''}
        </div>
        <div class="exec-preuve-comm"${p.commentaire ? '' : ' hidden'}>${_esc(p.commentaire || '')}</div>
    </div>`;
}

// Reprise de l'intitulé et du commentaire d'une pièce déjà déposée.
window.execPreuveModifier = async function (bouton) {
    const ligne = bouton.closest('.exec-preuve');
    if (!ligne) return;
    const d = ligne.dataset;
    const saisie = await _execPreuveModal(d.intitule || d.filename || '', {
        titre: te('modifier_piece'),
        intitule: d.intitule || '',
        commentaire: d.commentaire || '',
        valider: te('enregistrer') || 'Enregistrer',
    });
    if (!saisie) return;
    d.intitule = saisie.intitule;
    d.commentaire = saisie.commentaire;
    const titre = ligne.querySelector('.exec-preuve-intitule');
    if (titre) {
        titre.textContent = saisie.intitule;
        if (titre.tagName === 'A' && d.path) {
            titre.href = `${d.path}${d.path.includes('?') ? '&' : '?'}nom=${encodeURIComponent(saisie.intitule)}`;
        }
    }
    const comm = ligne.querySelector('.exec-preuve-comm');
    if (comm) {
        comm.textContent = saisie.commentaire;
        comm.hidden = !saisie.commentaire;
    }
};

function _execRenumeroterPreuves(container) {
    if (!container) return;
    [...container.children].forEach((div, i) => {
        const num = div.querySelector('.exec-preuve-num');
        if (num) num.textContent = String(i + 1);
    });
}

window.execPreuveSupprimer = function (bouton) {
    const ligne = bouton.closest('.exec-preuve');
    const container = ligne && ligne.parentElement;
    if (ligne) ligne.remove();
    _execRenumeroterPreuves(container);
};

// Boîte de dialogue posée avant l'envoi : intitulé de la pièce, puis
// commentaire facultatif adressé à l'AAC. Résout à `null` si l'on renonce.
function _execPreuveModal(nomFichier, reprise) {
    return new Promise((resolve) => {
        document.getElementById('exec_preuve_modal')?.remove();
        const r = reprise || {};
        const defaut = r.intitule !== undefined && r.intitule !== ''
            ? r.intitule
            : String(nomFichier || '').replace(/\.[^.]+$/, '');
        const el = document.createElement('div');
        el.id = 'exec_preuve_modal';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
        const fermer = (valeur) => { el.remove(); resolve(valeur); };
        el.onclick = (e) => { if (e.target === el) fermer(null); };
        el.innerHTML = `
        <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 1rem;font-size:1rem;font-weight:700;">${r.titre || te('preuve_dialogue_titre')}</h3>
            <div class="form-group" style="margin-bottom:0.85rem;">
                <label for="exec_preuve_intitule" style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">${te('preuve_intitule')} *</label>
                <input type="text" id="exec_preuve_intitule" class="form-input" value="${_escAttr(defaut)}" placeholder="${te('preuve_intitule_exemple')}">
            </div>
            <div class="form-group" style="margin-bottom:1.25rem;">
                <label for="exec_preuve_commentaire" style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">${te('preuve_commentaire')}</label>
                <textarea id="exec_preuve_commentaire" class="form-input" rows="3" style="resize:vertical;" placeholder="${te('preuve_commentaire_aide')}">${_esc(r.commentaire || '')}</textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
                <button class="btn btn-outline" id="exec_preuve_annuler">${te('cancel') || 'Annuler'}</button>
                <button class="btn btn-primary" id="exec_preuve_ok">${r.valider || te('ajouter') || 'Ajouter'}</button>
            </div>
        </div>`;
        document.body.appendChild(el);
        const champ = el.querySelector('#exec_preuve_intitule');
        champ.focus();
        champ.select();
        el.querySelector('#exec_preuve_annuler').onclick = () => fermer(null);
        el.querySelector('#exec_preuve_ok').onclick = () => {
            const intitule = (champ.value || '').trim();
            if (!intitule) { _execToast(te('preuve_intitule_requis'), 'warning'); champ.focus(); return; }
            fermer({ intitule, commentaire: (el.querySelector('#exec_preuve_commentaire').value || '').trim() });
        };
        champ.onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('#exec_preuve_ok').click(); };
    });
}

function execUploadPACProof(inputPrefix) {
    document.getElementById(`${inputPrefix}_input`)?.click();
}

async function execHandlePACProofUpload(files, containerId) {
    if (!files || files.length === 0) return;
    const container = document.getElementById(containerId);
    for (const file of files) {
        // L'intitulé est demandé avant l'envoi : renoncer n'envoie rien.
        const saisie = await _execPreuveModal(file.name);
        if (!saisie) continue;
        const formData = new FormData();
        formData.append('file', file);
        // Le serveur enregistre la pièce sous cet intitulé, non sous le nom
        // du fichier choisi sur le poste.
        formData.append('nom', saisie.intitule);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok' && container) {
                container.insertAdjacentHTML('beforeend', _execPreuveHtml({
                    filename: data.filename, path: data.path,
                    intitule: saisie.intitule, commentaire: saisie.commentaire,
                    date: new Date().toISOString().slice(0, 10),
                }, container.children.length + 1, true));
                _execRenumeroterPreuves(container);
            }
        } catch (e) {
            console.error('Upload PAC proof error:', e);
            _execToast((e && e.message) || 'Erreur lors du dépôt de la pièce', 'error');
        }
    }
}

// ── Per-item comment thread (Détails du suivi) ───────────────────


// ══════════════════════════════════════
//  Fiche complète d'une constatation, prête à imprimer
// ══════════════════════════════════════
// Reprend l'intégralité du dossier : identification, plan d'actions et ses
// preuves, versions antérieures, évaluation de l'AAC, commentaires, échanges.
// ══════════════════════════════════════
//  Documents imprimables du module
// ══════════════════════════════════════
// Un seul squelette pour toutes les fiches : même en-tête d'autorité, même
// typographie, mêmes règles de coupure. Les documents restent lisibles en
// noir et blanc, et les aplats de couleur s'impriment (print-color-adjust).
function _execDocStyles() {
    return `
      @page { size: A4; margin: 16mm 13mm 18mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font: 10.5pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #16202c; margin: 0; }
      header.doc { display: flex; align-items: center; gap: 12px;
                   border-bottom: 2.5px solid #12406b; padding-bottom: 8px; margin-bottom: 14px; }
      header.doc .logo { height: 52px; width: auto; flex: 0 0 auto; }
      header.doc .ident { flex: 1; min-width: 0; }
      header.doc .sigle { font-size: 11pt; font-weight: 700; color: #12406b; letter-spacing: .01em; }
      header.doc .lieu { font-size: 8pt; color: #5b6b7d; }
      header.doc h1 { font-size: 14pt; margin: 4px 0 2px; letter-spacing: .01em; }
      header.doc .meta { font-size: 8pt; color: #5b6b7d; }
      header.doc .cartouche { flex: 0 0 auto; text-align: right; }
      header.doc .cartouche .ref { font: 700 11pt/1.2 ui-monospace, "SFMono-Regular", Menlo, monospace; color: #12406b; }
      header.doc .cartouche .statut {
          display: inline-block; margin-top: 3px; padding: 1.5px 7px; border-radius: 9px;
          font-size: 8pt; font-weight: 700; background: #12406b14; color: #12406b;
      }
      .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 14px;
                border: 1px solid #dde4ec; border-radius: 4px; padding: 8px 10px; margin-bottom: 10px; }
      .grille > div { min-width: 0; }
      .grille span { display: block; font-size: 7.5pt; text-transform: uppercase;
                     letter-spacing: .05em; color: #5b6b7d; }
      .grille strong { font-size: 10pt; font-weight: 600; overflow-wrap: anywhere; }
      section { margin-top: 10px; break-inside: avoid; }
      section > h2 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .06em; color: #fff;
                     background: #12406b; margin: 0 0 5px; padding: 3.5px 8px; border-radius: 3px;
                     border-left: 3px solid #0b2b48; }
      section h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d;
                   margin: 8px 0 2px; }
      section p, section ol, section ul { margin: 0; }
      section ol, section ul { padding-left: 17px; }
      section li { margin-bottom: 1.5px; }
      table.fiche { width: 100%; border-collapse: collapse; }
      table.fiche td { border-bottom: 1px solid #eef2f6; padding: 2.5px 6px 2.5px 0; vertical-align: top; }
      table.fiche tr:last-child td { border-bottom: none; }
      td.date { width: 68px; color: #5b6b7d; white-space: nowrap; }
      td.auteur { width: 120px; font-weight: 600; }
      .paire { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .encadre { border: 1px solid #dde4ec; border-radius: 4px; padding: 7px 9px; }
      .texte { white-space: pre-wrap; overflow-wrap: anywhere; }
      .vide { color: #98a5b3; }
      .etiquette { display: inline-block; padding: 1px 6px; border-radius: 9px;
                   font-size: 7.5pt; font-weight: 700; background: #0284c71f; color: #075985; }
      .crit-critique, .crit-majeure { background: #dc26261f; color: #991b1b; }
      .crit-mineure { background: #16a34a1f; color: #166534; }
      footer.doc { position: fixed; bottom: 5mm; left: 0; right: 0; font-size: 7.5pt; color: #5b6b7d;
                   border-top: 1px solid #dde4ec; padding-top: 3px; display: flex; justify-content: space-between; }
      @media print {
        section > h2 { background: #12406b !important; color: #fff !important; }
        header.doc { border-bottom-color: #12406b !important; }
      }`;
}

// En-tête d'autorité, commun à toutes les fiches.
function _execDocEntete(titre, reference, statut) {
    const aac = EXEC_STATE.data.aac || {};
    const lieu = [aac.ville, aac.pays].filter(Boolean).map(_esc).join(', ');
    return `<header class="doc">
        ${aac.logo ? `<img class="logo" src="${aac.logo}" alt="">` : ''}
        <div class="ident">
            <div class="sigle">${_esc(aac.sigle || '')}${aac.nom ? ` — ${_esc(aac.nom)}` : ''}</div>
            ${lieu ? `<div class="lieu">${lieu}</div>` : ''}
            <h1>${titre}</h1>
            <div class="meta">${te('edite_le')} ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        ${reference || statut ? `<div class="cartouche">
            ${reference ? `<div class="ref">${_esc(reference)}</div>` : ''}
            ${statut ? `<div class="statut">${_esc(statut)}</div>` : ''}
        </div>` : ''}
    </header>`;
}

// Ouvre le document dans un onglet et présente la boîte d'impression.
// Document complet, prêt à imprimer ou à rendre en PDF côté serveur.
function _execDocHtml(titreOnglet, corps) {
    const aac = EXEC_STATE.data.aac || {};
    const jour = new Date().toLocaleDateString('fr-FR');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${_esc(titreOnglet)}</title><style>${_execDocStyles()}</style></head><body>
    ${corps}
    <footer class="doc"><span>OASIS — ${_esc(aac.sigle || '')}</span><span>${_esc(titreOnglet)}</span><span>${jour}</span></footer>
    </body></html>`;
}

function _execDocOuvrir(titreOnglet, corps) {
    const html = _execDocHtml(titreOnglet, corps);
    const fenetre = window.open('', '_blank');
    if (!fenetre) { _execToast(te('bloqueur_fenetre'), 'warning'); return; }
    fenetre.document.write(html);
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 400);
}

// Petites fabriques partagées par les fiches.
const _execDocJour = (d) => (d ? _formatDate(String(d).slice(0, 10)) : '—');
const _execDocChamp = (libelle, valeur) => `<div><span>${libelle}</span><strong>${valeur || '—'}</strong></div>`;
const _execDocSection = (titre, corps) => `<section><h2>${titre}</h2>${corps || `<p class="vide">—</p>`}</section>`;
const _execDocTexte = (valeur) => (String(valeur || '').trim()
    ? `<p class="texte">${_esc(valeur)}</p>` : '<p class="vide">—</p>');
const _execDocLignes = (lignes) => (lignes.length
    ? `<table class="fiche"><tbody>${lignes.map((l) => `<tr>
            <td class="date">${l[0]}</td><td class="auteur">${_esc(l[1] || '')}</td><td>${l[2]}</td>
        </tr>`).join('')}</tbody></table>`
    : '');
const _execDocPreuves = (liste) => ((liste || []).length
    ? `<ol>${(liste || []).map((p) => `<li>${_esc(p.intitule || p.filename || '')}`
        + `${p.date ? ` <em>(${_execDocJour(p.date)})</em>` : ''}`
        + `${p.commentaire ? ` — ${_esc(p.commentaire)}` : ''}</li>`).join('')}</ol>`
    : '');

// Évaluation d'une constatation, quelle que soit sa forme de stockage.
function _execDocEvaluation(fnc) {
    let ev = fnc && fnc.commentaire_evaluation;
    if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
    return ev || {};
}

// Date de solde attendue : celle enregistrée, sinon ouverture + délai.
function _execDocDateDue(fnc) {
    if (fnc.date_due_cloture) return String(fnc.date_due_cloture).slice(0, 10);
    const delai = parseInt(fnc.delai_solde || fnc.delai_correction || '0', 10);
    const ouv = fnc.date_ouverture || String(fnc.date_creation || '').slice(0, 10);
    if (!delai || !ouv) return '';
    const d = new Date(ouv);
    d.setDate(d.getDate() + delai);
    return d.toISOString().slice(0, 10);
}

// ── Fiche de constat ─────────────────────────────────────────────
// Le constat lui-même : ce qui a été relevé, au regard de quoi, avec quelle
// échéance de traitement. Une page par constatation.
function _execFicheConstatCorps(fnc, dossier) {
    const ev = _execDocEvaluation(fnc);
    const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const sec = (EXEC_STATE.data.secteurs || []).find((x) => x.id === fnc.secteur_id);
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();
    const preuves = fnc.preuves_constatation || [];
    return `
    ${_execDocEntete(te('fiche_constat'), fnc.reference || '', _execStatutLisible(fnc.statut))}
    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(fnc.prestataire_nom || (dossier || {}).prestataire_nom || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(dom ? dom.nom : (fnc.domaine_id || '')))}
        ${_execDocChamp('Secteur', _esc(sec ? sec.nom : (fnc.secteur_id || '')))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('delai_label'), `${_esc(fnc.delai_solde || '—')} ${te('jours')}`)}
        ${_execDocChamp(te('date_due_label'), _execDocJour(_execDocDateDue(fnc)))}
        ${_execDocChamp(te('emis_par'), _esc(fnc.emis_par || ''))}
        ${_execDocChamp(te('adresse_a'), _esc(fnc.adresse_a || ''))}
    </div>
    ${(dossier && (dossier.reference || dossier.notification_ref)) ? `<div class="grille">
        ${_execDocChamp(te('dossier') || 'Dossier', _esc(dossier.reference || ''))}
        ${_execDocChamp('Notification', _esc(dossier.notification_ref || ''))}
        ${_execDocChamp(te('objet'), _esc(dossier.objet_activite || dossier.notification_objet || ''))}
    </div>` : ''}
    ${_execDocSection(te('ref_reglementaires_label'), _execDocTexte(fnc.ref_reglementaires || fnc.exigence_ref))}
    ${_execDocSection(te('description_constatation'), _execDocTexte(fnc.description || fnc.titre))}
    ${_execDocSection(te('recommandation'), _execDocTexte(fnc.recommandation))}
    ${_execDocSection(te('preuves'), _execDocPreuves(preuves))}
    ${ev.rejet_info ? _execDocSection(te('motif_rejet') || 'Motif de rejet', _execDocTexte(ev.rejet_info.motif)) : ''}`;
}

function execFicheConstatPdf(fncId) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const fnc = (dossier.constatations || []).find((c) => c.id === fncId)
        || (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
    if (!fnc) { _execToast(te('no_data'), 'warning'); return; }
    _execDocOuvrir(`${te('fiche_constat')} — ${fnc.reference || ''}`,
        _execFicheConstatCorps(fnc, dossier));
}

// Toutes les constatations d'un dossier, une fiche par page.
function execFichesConstatDossier(dossierId) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const liste = dossier.constatations || [];
    if (!liste.length) { _execToast(te('no_data'), 'info'); return; }
    const corps = liste.map((c, i) => `<div${i ? ' style="page-break-before:always;"' : ''}>`
        + `${_execFicheConstatCorps(c, dossier)}</div>`).join('');
    _execDocOuvrir(`${te('fiches_constat')} — ${dossier.reference || dossierId}`, corps);
}

// ── Fiche de suivi (plan d'actions correctives) ──────────────────
// Le traitement de la constatation : plan retenu, preuves, évaluation de
// l'AAC et échanges de suivi. Se lit à la suite de la fiche de constat.
async function execExporterFncPdf(fncId) {
    let fnc;
    try {
        fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`);
    } catch (e) {
        console.error('Export FNC :', e);
        _execToast((e && e.message) || 'Erreur lors de la préparation du document', 'error');
        return;
    }
    if (!fnc) return;

    const ev = _execDocEvaluation(fnc);
    const anac = ev.evaluation_anac || {};
    const acceptation = anac.acceptation || {};
    const verif = anac.verification || {};
    const cloture = anac.cloture || {};
    const pac = (fnc.actions_correctives || [])[0] || {};
    const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();

    const commentaires = [
        ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
            date: x.date, auteur: x.auteur, items: [cle === 'cause_primaire' ? 'cause' : cle], texte: x.texte,
        }))),
        ...(ev.suivi_commentaires || []).filter((x) => x.publie),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const corps = `
    ${_execDocEntete(te('fiche_suivi_pac'), fnc.reference || '', _execStatutLisible(fnc.statut))}
    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(fnc.prestataire_nom || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(dom ? dom.nom : (fnc.domaine_id || '')))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('date_due_label'), _execDocJour(_execDocDateDue(fnc)))}
        ${_execDocChamp(te('date_solde'), _execDocJour(cloture.date_solde || fnc.date_solde))}
    </div>

    ${_execDocSection(te('description_constatation'), _execDocTexte(fnc.description || fnc.titre))}

    ${_execDocSection(te('plan_actions_correctives'), `
        <h3>${te('cause_root')}</h3>${_execDocTexte(pac.cause_primaire)}
        <h3>${te('action_curative_correction')}${pac.curative_date_prevue
            ? ` — ${te('date_prevue')} : ${_execDocJour(pac.curative_date_prevue)}` : ''}</h3>
        ${_execDocTexte(pac.action_curative)}
        ${_execDocPreuves(pac.curative_preuves)}
        <h3>${te('action_corrective_prevention')}${pac.corrective_date_prevue
            ? ` — ${te('date_prevue')} : ${_execDocJour(pac.corrective_date_prevue)}` : ''}</h3>
        ${_execDocTexte(pac.actions_correctives)}
        ${_execDocPreuves(pac.corrective_preuves)}`)}

    ${_execDocSection(te('evaluation_suivi_aac'), `
        <div class="paire">
            <div class="encadre">
                <h3 style="margin-top:0;">${te('acceptation_propositions')}</h3>
                <p>${te('pac_accepte')} : <strong>${acceptation.accepte === 'OUI' ? te('oui_label') : '—'}</strong>${
                    acceptation.date ? ` · ${te('date_acceptation')} ${_execDocJour(acceptation.date)}` : ''}</p>
                <p>${te('verifier_terrain')} : <strong>${verif.verification_terrain ? te('oui_label') : te('non_label')}</strong></p>
                <h3>${te('preuves_recueillies')}</h3>
                ${_execDocPreuves(verif.preuves_mise_oeuvre) || '<p class="vide">—</p>'}
            </div>
            <div class="encadre">
                <h3 style="margin-top:0;">${te('cloture_fnc')}</h3>
                <p>${te('mise_oeuvre_effective')} : <strong>${cloture.mise_en_oeuvre_effective === 'OUI' ? te('oui_label') : '—'}</strong></p>
                <p>${te('date_solde')} : ${_execDocJour(cloture.date_solde || fnc.date_solde)}</p>
                <p>${te('solde_par')} : ${_esc(cloture.solde_par || '—')}</p>
            </div>
        </div>
        <h3>${te('commentaire_general_suivi')}</h3>
        ${_execDocLignes((verif.suivis || []).map((x) => [_execDocJour(x.date), x.auteur, _esc(x.texte || '')]))
            || '<p class="vide">—</p>'}`)}

    ${_execDocSection(te('details_suivi'), _execDocLignes(commentaires.map((c) => [
        _execDocJour(c.date), c.auteur,
        `${(c.items || []).map((k) => `<span class="etiquette">${_esc(k === 'autres'
            ? (c.precision || te('motif_autres')) : te(`item_${k}`))}</span>`).join(' ')} ${_esc(c.texte || '')}`,
    ])))}`;

    _execDocOuvrir(`${te('fiche_suivi_pac')} — ${fnc.reference || ''}`, corps);
}

// Libellé lisible d'un statut de constatation.
function _execStatutLisible(statut) {
    const cle = String(statut || '');
    const libelle = te(cle);
    return libelle && libelle !== cle ? libelle : cle;
}

// ══════════════════════════════════════
//  Échanges AAC ↔ prestataire sur une constatation
// ══════════════════════════════════════
// Même présentation que la négociation de l'étape Confirmation : fil de
// bulles, réponse en bas. Sans le volet d'accord, propre à l'activité.
function _execEchangesPacHtml(echanges, fncId, verrouille) {
    const moi = (EXEC_STATE.user || {}).username || '';
    const fil = (echanges || []).map((e, i) => {
        const aMoi = e.auteur_id && e.auteur_id === moi;
        const suivant = echanges[i + 1];
        const dernierDuGroupe = !(suivant && suivant.auteur_id === e.auteur_id);
        const initiales = ((e.auteur_prenom || 'U')[0] + ((e.auteur_nom || '')[0] || '')).toUpperCase();
        const nom = `${_esc(e.auteur_prenom || '')} ${_esc(e.auteur_nom || '')}`.trim();
        const avatar = !aMoi
            ? `<div class="exchange-avatar"${dernierDuGroupe ? '' : ' style="visibility:hidden;"'}>${initiales}</div>`
            : '';
        return `<div class="exchange-bubble-row ${aMoi ? 'self' : 'other'}">
            ${avatar}
            <div class="exchange-bubble">
                <div class="exchange-bubble-body">${_esc(String(e.contenu || '').trim())}</div>
            </div>
        </div>
        ${dernierDuGroupe ? `<div class="exchange-bubble-time ${aMoi ? 'self' : 'other'}">
            <span class="exchange-bubble-auteur">${nom || (e.auteur_type === 'aac' ? te('aac_label') || 'AAC' : '—')}</span>
            <span>${_formatDatetime(e.date_creation)}</span>
        </div>` : ''}`;
    }).join('');

    return `<div class="exchange-chat discussions-chat" id="exec_pac_echanges">
        ${echanges && echanges.length ? fil
            : `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.25rem 0;">${te('no_data')}</p>`}
    </div>
    ${verrouille ? '' : `<div class="exchange-reply">
        <label>${te('repondre')}</label>
        <div class="exchange-reply-row">
            <textarea class="form-input" id="exec_pac_echange_msg" rows="1" placeholder="${te('votre_message')}"
                      style="resize:none;overflow:hidden;min-height:2.2rem;line-height:1.4;"
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"></textarea>
            <button class="btn btn-primary" onclick="execEnvoyerEchangePac('${fncId}')">
                ${EXEC_ICONS.send} ${te('envoyer')}
            </button>
        </div>
    </div>`}`;
}

// Repère de lecture : dernier passage du compte dans le fil de la
// constatation. Un message d'autrui postérieur est réputé non lu.
function _execPacCleLecture(fncId) {
    const u = (EXEC_STATE.user || {}).username || 'anonyme';
    return `pac_echanges_lu_${fncId}_${u}`;
}

function _execPacNonLus(fncId, echanges) {
    const moi = (EXEC_STATE.user || {}).username || '';
    const repere = localStorage.getItem(_execPacCleLecture(fncId)) || '';
    return (echanges || []).filter((e) => e.auteur_id !== moi
        && String(e.date_creation || '') > repere).length;
}

// Bouton du bandeau + tiroir des discussions, à la place de la croix.
function _execPacInstallerDiscussions(fncId, echanges, verrouille) {
    const entete = document.querySelector('#execSlider .exec-slider-header');
    if (!entete) return;
    entete.querySelector('.exec-slider-close')?.remove();
    entete.querySelector('.exec-pac-discussions')?.remove();

    const nonLus = _execPacNonLus(fncId, echanges);
    const bouton = document.createElement('button');
    bouton.className = `exec-pac-discussions${nonLus ? ' alerte' : ''}`;
    bouton.type = 'button';
    bouton.title = te('discussions');
    bouton.innerHTML = `${EXEC_ICONS.send} <span>${te('discussions')}</span>
        ${nonLus ? `<span class="exec-pac-discussions-pastille">${nonLus}</span>`
            : (echanges || []).length ? `<span class="exec-pac-discussions-compte">${echanges.length}</span>` : ''}`;
    bouton.onclick = () => execPacDiscussionsOuvrir(fncId);
    entete.appendChild(bouton);

    // Tiroir : glisse de la droite, sur le tiers de la largeur.
    document.getElementById('execPacTiroir')?.remove();
    const tiroir = document.createElement('div');
    tiroir.id = 'execPacTiroir';
    tiroir.className = 'exec-pac-tiroir';
    tiroir.innerHTML = `<div class="exec-pac-tiroir-tete">
            <span>${te('discussions')}</span>
            <button type="button" onclick="execPacDiscussionsFermer()" title="${te('close')}">${EXEC_ICONS.close}</button>
        </div>
        <div class="exec-pac-tiroir-corps">${_execEchangesPacHtml(echanges, fncId, verrouille)}</div>`;
    document.body.appendChild(tiroir);
    // Bord supérieur calé sur celui du formulaire, quelle que soit la hauteur
    // du bandeau de l'application.
    const volet = document.getElementById('execSlider');
    if (volet) tiroir.style.top = `${Math.round(volet.getBoundingClientRect().top)}px`;
}

window.execPacDiscussionsOuvrir = function (fncId) {
    const tiroir = document.getElementById('execPacTiroir');
    if (!tiroir) return;
    tiroir.classList.add('ouvert');
    // Tout est lu à l'ouverture : le bouton reprend sa couleur.
    localStorage.setItem(_execPacCleLecture(fncId), new Date().toISOString());
    const bouton = document.querySelector('.exec-pac-discussions');
    if (bouton) {
        bouton.classList.remove('alerte');
        bouton.querySelector('.exec-pac-discussions-pastille')?.classList.add('exec-pac-discussions-compte');
        bouton.querySelector('.exec-pac-discussions-pastille')?.classList.remove('exec-pac-discussions-pastille');
    }
    const fil = tiroir.querySelector('.exchange-chat');
    if (fil) fil.scrollTop = fil.scrollHeight;
    tiroir.querySelector('#exec_pac_echange_msg')?.focus();
};

window.execPacDiscussionsFermer = function () {
    document.getElementById('execPacTiroir')?.classList.remove('ouvert');
};

async function execEnvoyerEchangePac(fncId) {
    const zone = document.getElementById('exec_pac_echange_msg');
    const contenu = (zone && zone.value || '').trim();
    if (!contenu) return;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/echanges`, {
            method: 'POST',
            body: JSON.stringify({ contenu }),
        });
        zone.value = '';
        await execOpenPACSlider(fncId);
        execPacDiscussionsOuvrir(fncId);          // le tiroir reste ouvert
    } catch (e) {
        console.error('Envoi échange PAC :', e);
        _execToast((e && e.message) || 'Erreur lors de l\'envoi du message', 'error');
    }
}

// ══════════════════════════════════════
//  Commentaires de suivi (volet droit du formulaire PAC)
// ══════════════════════════════════════
// Champs du plan pouvant faire l'objet d'un commentaire, plus « Autres ».
// Rédaction réservée à l'AAC ; le prestataire lit.
const EXEC_PAC_ITEMS_COMMENTABLES = [
    'cause', 'action_curative', 'date_curative', 'preuves_curative',
    'action_corrective', 'date_corrective', 'preuves_corrective',
];

// `modifiable` : commentaire encore au brouillon, non transmis au prestataire.
// `rang` numérote les suivis transmis au postulant — 0 pour un brouillon,
// qui n'en porte pas encore. `deplie` n'est vrai que pour le dernier : les
// précédents se consultent d'un clic sur leur en-tête.
function _execCommentaireSuiviHtml(c, modifiable, rang, deplie) {
    const items = (c.items || []).map((k) => (k === 'autres'
        ? (c.precision || te('motif_autres')) : te(`item_${k}`)));
    const brouillon = !c.publie;
    const fichiers = c.fichiers || [];
    return `<div class="exec-suivi-comm${brouillon ? ' brouillon' : ''}${deplie ? '' : ' replie'}" data-date="${_escAttr(c.date || '')}" data-auteur="${_escAttr(c.auteur || '')}"
                 data-items="${_escAttr((c.items || []).join(','))}" data-precision="${_escAttr(c.precision || '')}"
                 data-texte="${_escAttr(c.texte || '')}" data-publie="${c.publie ? '1' : ''}"
                 data-fichiers="${_escAttr(JSON.stringify(fichiers))}">
        <div class="exec-suivi-comm-tete" onclick="execSuiviCommToggle(this)">
            <span class="exec-suivi-comm-chevron">${EXEC_ICONS.chevronDown}</span>
            <strong>${rang ? `${te('suivi_rang')} ${rang}` : _esc(c.auteur || '')}</strong>
            <span>
                ${rang ? `<em class="exec-suivi-auteur">${_esc(c.auteur || '')}</em>` : ''}
                ${brouillon ? `<em class="exec-suivi-brouillon">${te('non_transmis')}</em>` : ''}
                ${c.date ? _formatDate(String(c.date).slice(0, 10)) : ''}
                ${modifiable && brouillon ? `<button type="button" class="exec-suivi-action" title="${te('modifier')}"
                        onclick="event.stopPropagation();execModifierCommentaireSuivi(this)">${EXEC_ICONS.edit}</button>
                    <button type="button" class="exec-suivi-action exec-suivi-supprimer" title="${te('supprimer')}"
                        onclick="event.stopPropagation();execSupprimerCommentaireSuivi(this)">${EXEC_ICONS.x}</button>` : ''}
            </span>
        </div>
        <div class="exec-suivi-comm-corps">
            <div class="exec-suivi-comm-items">${items.map((l) => `<span>${_esc(l)}</span>`).join('')}</div>
            <div class="exec-suivi-comm-texte">${_esc(c.texte || '')}</div>
            ${fichiers.length ? `<div class="exec-suivi-comm-pj">${fichiers.map((f) => `
                <a href="${_escAttr(f.path || '')}?nom=${encodeURIComponent(f.filename || '')}" target="_blank" rel="noopener">
                    ${EXEC_ICONS.file} ${_esc(f.filename || '')}</a>`).join('')}</div>` : ''}
        </div>
    </div>`;
}

// Un suivi se replie et se déplie d'un clic sur son en-tête.
window.execSuiviCommToggle = function (tete) {
    tete.closest('.exec-suivi-comm')?.classList.toggle('replie');
}

// Reprise d'un commentaire non transmis : il repart dans le composeur.
window.execModifierCommentaireSuivi = function (bouton) {
    const bloc = bouton.closest('.exec-suivi-comm');
    const composeur = document.querySelector('.exec-suivi-composeur');
    if (!bloc || !composeur) return;
    const items = (bloc.dataset.items || '').split(',').filter(Boolean);
    composeur.querySelectorAll('.exec-suivi-items input').forEach((i) => {
        i.checked = items.includes(i.value);
    });
    const p = document.getElementById('pac_suivi_precision');
    if (p) p.value = bloc.dataset.precision || '';
    const t = document.getElementById('pac_suivi_texte');
    if (t) t.value = bloc.dataset.texte || '';
    // Les pièces du brouillon repartent avec lui dans le composeur.
    const pj = document.getElementById('pac_suivi_pj_liste');
    if (pj) {
        pj.innerHTML = '';
        let fichiers = [];
        try { fichiers = JSON.parse(bloc.dataset.fichiers || '[]'); } catch { fichiers = []; }
        fichiers.forEach((f) => {
            const ligne = document.createElement('span');
            ligne.className = 'exec-suivi-pj-item';
            ligne.dataset.path = f.path || '';
            ligne.dataset.filename = f.filename || '';
            ligne.innerHTML = `${EXEC_ICONS.file} ${_esc(f.filename || '')}
                <button type="button" title="${te('supprimer')}"
                        onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            pj.appendChild(ligne);
        });
    }
    bloc.remove();
    execSuiviItemsChange();
    if (t) t.focus();
};

window.execSupprimerCommentaireSuivi = async function (bouton) {
    if (!await oasisConfirmer(te('confirm_supprimer_commentaire'))) return;
    const liste = document.getElementById('pac_suivi_liste');
    bouton.closest('.exec-suivi-comm')?.remove();
    if (liste && !liste.querySelector('.exec-suivi-comm')) {
        liste.innerHTML = `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>`;
    }
};

// Les commentaires en attente deviennent visibles du prestataire dès que
// l'AAC rend une décision : ils ne sont alors plus modifiables.
function _execPublierCommentairesSuivi(evalData) {
    (evalData.suivi_commentaires || []).forEach((c) => { c.publie = true; });
    return evalData;
}

// Le commentaire ne s'ouvre qu'une fois l'item désigné ; « Autres » réclame
// sa précision.
// Intitulé porté par une case du composeur.
function _execSuiviLibelleItem(cle) {
    return cle === 'autres' ? te('motif_autres') : te(`item_${cle}`);
}

// Les lignes inscrites par les cases se reconnaissent à leur numérotation ;
// ce que l'AAC écrit à leur suite est du texte libre, jamais renuméroté.
const EXEC_SUIVI_LIGNE = /^\s*\d+\.\s/;

// La numérotation suit l'ordre des choix, sans trou : cocher ajoute une ligne,
// décocher retire la sienne, et les lignes restantes se renumérotent.
function _execSuiviRenumeroter(zone) {
    let n = 0;
    zone.value = zone.value.split('\n').map((ligne) => (EXEC_SUIVI_LIGNE.test(ligne)
        ? ligne.replace(EXEC_SUIVI_LIGNE, () => `${++n}. `)
        : ligne)).join('\n');
}

// ── Teinte des « Résultats du Suivi » ────────────────────────────
// La couleur de la section dit où en est la constatation, d'un coup d'œil :
//   PAC refusé                       rouge clair
//   PAC accepté                      orange
//   … et vérification sur le terrain vert clair
//   … et mise en oeuvre effective    vert foncé (comme une clôture)
function execPacTeinteResultats() {
    const section = document.getElementById('exec_resultats_suivi');
    if (!section) return;
    const coche = (id) => !!document.getElementById(id)?.checked;
    const accepte = coche('anac_pac_accepte');
    const effective = coche('anac_mise_effective');
    const soldee = (EXEC_STATE.selectedConstatation || {}).statut === 'soldee';
    const etat = (!accepte && 'refuse')
        || ((effective || soldee) && 'clos')
        || (coche('anac_verif_terrain') && 'terrain')
        || 'accepte';
    section.classList.remove('teinte-refuse', 'teinte-accepte', 'teinte-terrain', 'teinte-clos');
    section.classList.add(`teinte-${etat}`);
}

function execSuiviItemsChange(caseCochee) {
    const composeur = document.querySelector('.exec-suivi-composeur');
    if (!composeur) return;
    const coches = [...composeur.querySelectorAll('.exec-suivi-items input:checked')];
    const autres = document.getElementById('pac_suivi_autres');
    const precision = document.getElementById('pac_suivi_precision');
    if (precision) precision.hidden = !(autres && autres.checked);
    const pret = coches.length > 0;
    const texte = document.getElementById('pac_suivi_texte');
    const bouton = document.getElementById('pac_suivi_ajouter');
    if (texte) {
        texte.disabled = !pret;
        texte.placeholder = pret ? te('suivi_saisir_commentaire') : te('suivi_choisir_item');
    }
    if (bouton) bouton.disabled = !pret;

    // L'item choisi s'inscrit dans la saisie : l'AAC n'a plus qu'à commenter.
    if (texte && caseCochee) {
        const libelle = _execSuiviLibelleItem(caseCochee.value);
        if (caseCochee.checked) {
            const fin = texte.value.replace(/\s+$/, '');
            texte.value = `${fin}${fin ? '\n' : ''}0. ${libelle} : `;
        } else {
            // Décocher retire la ligne de l'item — sauf si l'AAC y a déjà écrit :
            // ses mots priment sur la case.
            const marque = new RegExp(`^\\s*\\d+\\.\\s*${libelle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:(.*)$`);
            texte.value = texte.value.split('\n')
                .filter((l) => { const m = marque.exec(l); return !m || m[1].trim(); })
                .join('\n');
        }
        _execSuiviRenumeroter(texte);
        if (caseCochee.checked) {
            texte.focus();
            texte.setSelectionRange(texte.value.length, texte.value.length);
        }
    }
}

function execAjouterCommentaireSuivi() {
    const composeur = document.querySelector('.exec-suivi-composeur');
    const liste = document.getElementById('pac_suivi_liste');
    if (!composeur || !liste) return;
    const items = [...composeur.querySelectorAll('.exec-suivi-items input:checked')].map((i) => i.value);
    const texte = (document.getElementById('pac_suivi_texte')?.value || '').trim();
    const precision = (document.getElementById('pac_suivi_precision')?.value || '').trim();
    if (!items.length || !texte) return;
    if (items.includes('autres') && !precision) {
        _execToast(te('motif_manquant'), 'warning');
        document.getElementById('pac_suivi_precision')?.focus();
        return;
    }
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    liste.querySelector('.exec-suivi-vide')?.remove();
    liste.insertAdjacentHTML('beforeend', _execCommentaireSuiviHtml({
        date: new Date().toISOString().slice(0, 10), auteur, items, precision, texte,
        fichiers: _execSuiviFichiersDeposes(), publie: false,
    }, true, 0, true));
    liste.querySelectorAll('.exec-suivi-comm:not(:last-child)')
        .forEach((c) => c.classList.add('replie'));
    liste.scrollTop = liste.scrollHeight;
    // Le composeur repart à zéro pour le commentaire suivant.
    composeur.querySelectorAll('.exec-suivi-items input:checked').forEach((i) => { i.checked = false; });
    const p = document.getElementById('pac_suivi_precision');
    if (p) { p.value = ''; p.hidden = true; }
    const t = document.getElementById('pac_suivi_texte');
    if (t) t.value = '';
    const pj = document.getElementById('pac_suivi_pj_liste');
    if (pj) pj.innerHTML = '';
    execSuiviItemsChange();
}

// Pièces déposées dans le composeur, en attente d'être portées au commentaire.
function _execSuiviFichiersDeposes() {
    return [...document.querySelectorAll('#pac_suivi_pj_liste [data-path]')].map((e) => ({
        filename: e.dataset.filename || '', path: e.dataset.path || '',
    }));
}

async function execSuiviJoindreFichiers(input) {
    const liste = document.getElementById('pac_suivi_pj_liste');
    if (!liste || !input.files || !input.files.length) return;
    for (const fichier of [...input.files]) {
        const formData = new FormData();
        formData.append('file', fichier);
        formData.append('nom', fichier.name);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData,
            });
            const data = await res.json();
            if (data.status !== 'ok') throw new Error(data.error || 'Téléversement refusé');
            const ligne = document.createElement('span');
            ligne.className = 'exec-suivi-pj-item';
            ligne.dataset.path = data.path;
            ligne.dataset.filename = data.filename;
            ligne.innerHTML = `${EXEC_ICONS.file} ${_esc(data.filename)}
                <button type="button" title="${te('supprimer')}"
                        onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            liste.appendChild(ligne);
        } catch (e) {
            console.error('Pièce jointe du suivi :', e);
            _execToast(`${fichier.name} : ${(e && e.message) || 'téléversement impossible'}`, 'error');
        }
    }
    input.value = '';
}

function _collectCommentairesSuivi() {
    const liste = document.getElementById('pac_suivi_liste');
    if (!liste) return null;
    return [...liste.querySelectorAll('.exec-suivi-comm')].map((d) => ({
        date: d.dataset.date || '',
        auteur: d.dataset.auteur || '',
        items: (d.dataset.items || '').split(',').filter(Boolean),
        precision: d.dataset.precision || '',
        texte: d.dataset.texte || '',
        fichiers: (() => { try { return JSON.parse(d.dataset.fichiers || '[]'); } catch { return []; } })(),
        publie: !!d.dataset.publie,
    })).filter((c) => c.texte);
}

// ── Commentaires généraux de suivi (AAC) ─────────────────────────
// Chaque suivi porte sa date et le nom de qui l'a enregistré.
function _execSuiviHtml(s, modifiable) {
    return `<div class="exec-suivi" data-date="${_escAttr(s.date || '')}" data-auteur="${_escAttr(s.auteur || '')}" data-texte="${_escAttr(s.texte || '')}">
        <div class="exec-suivi-tete">
            <strong>${_esc(s.auteur || '')}</strong>
            <span>
                ${s.date ? _formatDate(String(s.date).slice(0, 10)) : ''}
                ${modifiable ? `<button type="button" class="exec-suivi-action" title="${te('modifier')}"
                        onclick="execModifierSuivi(this)">${EXEC_ICONS.edit}</button>
                    <button type="button" class="exec-suivi-action exec-suivi-supprimer" title="${te('supprimer')}"
                        onclick="execSupprimerSuivi(this)">${EXEC_ICONS.x}</button>` : ''}
            </span>
        </div>
        <div>${_esc(s.texte || '')}</div>
    </div>`;
}

// Un suivi reste amendable tant que la constatation n'est pas clôturée.
window.execModifierSuivi = function (bouton) {
    const bloc = bouton.closest('.exec-suivi');
    const zone = document.getElementById('anac_suivi_saisie');
    if (!bloc || !zone) return;
    zone.value = bloc.dataset.texte || '';
    bloc.remove();
    zone.focus();
};

window.execSupprimerSuivi = async function (bouton) {
    if (!await oasisConfirmer(te('confirm_supprimer_commentaire'))) return;
    const liste = document.getElementById('anac_suivis_list');
    bouton.closest('.exec-suivi')?.remove();
    if (liste && !liste.querySelector('.exec-suivi')) {
        liste.innerHTML = `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_suivi')}</em>`;
    }
};

function execAjouterSuivi() {
    const zone = document.getElementById('anac_suivi_saisie');
    const texte = (zone && zone.value || '').trim();
    if (!texte) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    const liste = document.getElementById('anac_suivis_list');
    if (!liste) return;
    liste.querySelector('.exec-suivi-vide')?.remove();       // retire « aucun suivi »
    liste.insertAdjacentHTML('beforeend', _execSuiviHtml({
        date: new Date().toISOString().slice(0, 10), auteur, texte,
    }, true));
    zone.value = '';
    liste.scrollTop = liste.scrollHeight;
}

function _collectSuivis() {
    const liste = document.getElementById('anac_suivis_list');
    if (!liste) return null;
    return [...liste.querySelectorAll('.exec-suivi')].map((d) => ({
        date: d.dataset.date || '', auteur: d.dataset.auteur || '', texte: d.dataset.texte || '',
    })).filter((s) => s.texte);
}

function _collectEvaluationANAC() {
    // Ce que l'écran ne porte plus (isolement, traitement des risques, prononcé
    // sur les preuves) reste tel qu'enregistré : la saisie ne l'efface pas.
    const ancienne = ((EXEC_STATE.selectedConstatation?.commentaire_evaluation || {}).evaluation_anac) || {};
    const coche = (id) => (document.getElementById(id)?.checked ? 'OUI' : '');
    return {
        acceptation: {
            ...(ancienne.acceptation || {}),
            accepte: coche('anac_pac_accepte'),
            date: document.getElementById('anac_date_acceptation')?.value || ''
        },
        verification: {
            ...(ancienne.verification || {}),
            suivis: _collectSuivis() || (ancienne.verification || {}).suivis || [],
            preuves_mise_oeuvre: _collectProofsFromContainer('anac_preuves_mise_oeuvre_list'),
            verification_terrain: !!document.getElementById('anac_verif_terrain')?.checked,
        },
        cloture: {
            ...(ancienne.cloture || {}),
            mise_en_oeuvre_effective: coche('anac_mise_effective'),
            date_solde: document.getElementById('anac_date_solde')?.value || '',
            solde_par: document.getElementById('anac_solde_par')?.value || ''
        }
    };
}

function _collectFullEvalData() {
    // Preserve any pre-existing rejet_info from the loaded constatation.
    const prev = EXEC_STATE.selectedConstatation?.commentaire_evaluation;
    let prevObj = {};
    if (prev) {
        if (typeof prev === 'object') prevObj = prev;
        else { try { prevObj = JSON.parse(prev); } catch (e) { prevObj = {}; } }
    }
    const out = {
        evaluation_anac: _collectEvaluationANAC(),
        // Le fil de commentaires reprend les échanges de l'ancienne table :
        // ils y sont repris à l'affichage, la table n'a plus lieu d'être.
        suivi_commentaires: _collectCommentairesSuivi() || prevObj.suivi_commentaires || [],
    };
    if (prevObj.rejet_info) out.rejet_info = prevObj.rejet_info;
    return out;
}

function _collectPACData() {
    return {
        actions_correctives: [{
            cause_primaire: document.getElementById('pac_cause_primaire')?.value || '',
            action_curative: document.getElementById('pac_action_curative')?.value || '',
            curative_date_prevue: document.getElementById('pac_curative_date_prevue')?.value || '',
            curative_preuves: _collectProofsFromContainer('pac_curative_preuves_list'),
            actions_correctives: document.getElementById('pac_actions_correctives')?.value || '',
            corrective_date_prevue: document.getElementById('pac_corrective_date_prevue')?.value || '',
            corrective_preuves: _collectProofsFromContainer('pac_corrective_preuves_list'),
            // Motifs d'amendement : ceux affichés à l'écran s'ils existent —
            // un brouillon les conserve, même incomplets —, sinon ceux déjà
            // enregistrés avec le plan.
            motifs_amendement: _execPacMotifsSaisis()
                || (EXEC_STATE.selectedConstatation?.actions_correctives || [{}])[0]?.motifs_amendement || null,
        }]
    };
}

// Motifs tels qu'affichés, sans exiger qu'ils soient complets : c'est ce
// qu'un enregistrement en brouillon doit retenir. `null` hors amendement.
function _execPacMotifsSaisis() {
    if (!document.getElementById(`motif_sel_${EXEC_PAC_CHAMPS_SUIVIS[0].cle}`)) return null;
    const motifs = {};
    EXEC_PAC_CHAMPS_SUIVIS.forEach((champ) => {
        const sel = document.getElementById(`motif_sel_${champ.cle}`);
        const bloc = document.getElementById(`motif_bloc_${champ.cle}`);
        if (!sel || !bloc || !bloc.classList.contains('visible')) return;
        const motif = sel.value || '';
        if (!motif) return;
        const precision = ((document.getElementById(`motif_txt_${champ.cle}`) || {}).value || '').trim();
        motifs[champ.cle] = { motif, precision: motif === 'motif_autres' ? precision : '' };
    });
    return motifs;
}

// ── Brouillon: PUT without changing status ───────────────────────
async function execSaveDraftPAC(fncId) {
    const pac = _collectPACData();
    const evalData = _collectFullEvalData();
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({
                actions_correctives: pac.actions_correctives,
                commentaire_evaluation: evalData
            })
        });
        _execToast(te('brouillon_enregistre'), 'success');
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Save draft PAC error:', e);
    }
}

// ── Soumettre pour Validation (Postulant) ────────────────────────
async function execSubmitPAC(fncId) {
    const pac = _collectPACData();
    const evalData = _collectFullEvalData();
    // Detect modified fields by comparing current form values with saved PAC
    const fnc = EXEC_STATE.selectedConstatation || {};
    const prevPac = (fnc.actions_correctives || [])[0] || {};
    const newPac = pac.actions_correctives[0] || {};
    const fieldLabels = {
        cause_primaire: te('item_cause'),
        action_curative: te('item_action_curative'),
        curative_date_prevue: te('item_date_curative'),
        actions_correctives: te('item_action_corrective'),
        corrective_date_prevue: te('item_date_corrective')
    };
    const modifiedFields = [];
    for (const [key, label] of Object.entries(fieldLabels)) {
        const prev = (prevPac[key] || '').toString().trim();
        const curr = (newPac[key] || '').toString().trim();
        if (curr !== prev) modifiedFields.push(label);
    }
    // Build submit_info (green notification, replaces rejet_info)
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || '';
    evalData.submit_info = {
        date: new Date().toISOString().slice(0, 10),
        auteur,
        motif: modifiedFields.length > 0 ? modifiedFields.join(', ') : te('aucune_modification') || 'Aucune modification'
    };
    // Clear any previous rejet_info since postulant is resubmitting
    delete evalData.rejet_info;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-pac`, {
            method: 'PUT',
            body: JSON.stringify({
                actions_correctives: pac.actions_correctives,
                evaluation: evalData
            })
        });
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Submit PAC error:', e);
    }
}

// ── Renvoyer au postulant (AAC) ──────────────────────────────────
async function execReturnPACtoPostulant(fncId) {
    if (!await oasisConfirmer(te('confirm_renvoyer'))) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    // Build motif from items that have comments
    const itemsComments = evalData.items_comments || {};
    const itemLabels = {
        cause_primaire: te('item_cause'),
        action_curative: te('item_action_curative'),
        date_curative: te('item_date_curative'),
        preuves_curative: te('item_preuves_curative'),
        action_corrective: te('item_action_corrective'),
        date_corrective: te('item_date_corrective'),
        preuves_corrective: te('item_preuves_corrective')
    };
    const commentedItems = [];
    for (const [key, label] of Object.entries(itemLabels)) {
        if (itemsComments[key] && itemsComments[key].length > 0) commentedItems.push(label);
    }
    evalData.rejet_info = {
        date: new Date().toISOString().slice(0, 10),
        auteur,
        motif: commentedItems.length > 0 ? commentedItems.join(', ') : ''
    };
    // Clear any previous submit_info since AAC is rejecting
    delete evalData.submit_info;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/reject-pac`, {
            method: 'PUT',
            body: JSON.stringify({
                motif: evalData.rejet_info.motif,
                commentaire_evaluation: evalData
            })
        });
        _execToast(te('pac_renvoye_titre'), 'success');
        await execRefreshDynamic();
        // Refresh the slider with the updated FNC state
        const updated = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId);
        if (updated) EXEC_STATE.selectedConstatation = updated;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Return PAC error:', e);
        _execToast((e && e.message) || 'Erreur lors du renvoi du PAC', 'error');
    }
}

// ── Étape Mise en oeuvre (prestataire) ───────────────────────────
// Choix du mode d'écriture. Un second clic sur le même bouton le referme.
// Les deux modes se cumulent : chaque bouton ouvre ou referme le sien.
// Renoncer à l'amendement rend le plan à sa version acceptée — y compris ce
// qu'un enregistrement en brouillon avait déjà écrit. Les preuves déposées
// entre-temps ne relèvent pas de l'amendement : elles sont conservées.
async function execPacModeEdition(fncId, mode) {
    const courants = (EXEC_STATE.pacMode && EXEC_STATE.pacMode.fncId === fncId)
        ? (EXEC_STATE.pacMode.modes || []) : [];
    const actif = courants.includes(mode);
    if (!actif && mode === 'amendement') await _execPacAssurerEmpreinte(fncId);
    if (actif && mode === 'amendement') {
        if (!await oasisConfirmer(te('confirm_quitter_amendement'))) return;
        await _execPacRetablirPlanAccepte(fncId);
    }
    const modes = actif ? courants.filter((m) => m !== mode) : courants.concat([mode]);
    EXEC_STATE.pacMode = modes.length ? { fncId, modes } : null;
    execOpenPACSlider(fncId);
}

// Empreinte du plan accepté : posée à l'acceptation depuis cette version du
// module. Les constatations acceptées auparavant n'en ont pas — on la prend
// alors à l'entrée en amendement, avant toute modification : le plan en base
// est encore celui que l'AAC a accepté.
async function _execPacAssurerEmpreinte(fncId) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    if (fnc.id !== fncId || fnc.statut !== 'pac_valide') return;
    if (((fnc.pac_accepte || {}).actions_correctives || []).length) return;
    const empreinte = { date: new Date().toISOString(), actions_correctives: fnc.actions_correctives || [] };
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ pac_accepte: empreinte }),
        });
        fnc.pac_accepte = empreinte;             // disponible sans attendre le rechargement
        await execRefreshDynamic();
    } catch (e) {
        console.error('Empreinte du plan accepté :', e);
    }
}

// Remet les champs amendables à leur valeur acceptée et efface les motifs.
async function _execPacRetablirPlanAccepte(fncId) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    const accepte = ((fnc.pac_accepte || {}).actions_correctives || [])[0];
    if (!accepte) return;                       // aucune empreinte : rien à rendre
    const courant = (fnc.actions_correctives || [])[0] || {};
    const divergent = EXEC_PAC_CHAMPS_SUIVIS
        .some((c) => String(courant[c.cle] || '').trim() !== String(accepte[c.cle] || '').trim());
    if (!divergent && !courant.motifs_amendement) return;

    // Le plan revient à l'accepté ; les pièces jointes du moment demeurent.
    const rendu = { ...courant };
    EXEC_PAC_CHAMPS_SUIVIS.forEach((c) => { rendu[c.cle] = accepte[c.cle] || ''; });
    rendu.motifs_amendement = null;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ actions_correctives: [rendu] }),
        });
        _execToast(te('plan_retabli'), 'success');
        await execRefreshDynamic();
    } catch (e) {
        console.error('Rétablissement du plan accepté :', e);
        _execToast((e && e.message) || 'Erreur lors du rétablissement du plan', 'error');
    }
}

// Soumission depuis l'étape Mise en oeuvre.
//   preuves    : le plan reste tel quel, seules les preuves partent ; le
//                circuit demeure à « Mise en oeuvre ».
//   amendement : le plan est rouvert ; l'acceptation tombe et le circuit
//                revient à « Acceptation ». L'ancien plan est versionné.
async function execSoumettreMiseEnOeuvre(fncId, mode) {
    const amendement = mode === 'amendement';

    // Amendement : tout champ divergent de la version acceptée doit porter son
    // motif. Sans quoi la soumission ne part pas.
    let motifsAmendement = null;
    if (amendement) {
        const { motifs, manquants } = _execPacMotifs();
        if (manquants.length) {
            // Chaque motif absent est encerclé de rouge ; le premier reçoit le
            // curseur.
            document.querySelectorAll('.exec-pac-manquant')
                .forEach((e) => e.classList.remove('exec-pac-manquant'));
            manquants.forEach((m) => {
                const champ = document.getElementById(m.motif === 'motif_autres'
                    ? `motif_txt_${m.champ.cle}` : `motif_sel_${m.champ.cle}`);
                if (champ) champ.classList.add('exec-pac-manquant');
            });
            const premier = manquants[0];
            const cible = document.getElementById(premier.motif === 'motif_autres'
                ? `motif_txt_${premier.champ.cle}` : `motif_sel_${premier.champ.cle}`);
            if (cible) { cible.scrollIntoView({ block: 'center' }); cible.focus(); }
            _execToast(`${te('motif_manquant')} : ${manquants.map((m) => te(m.champ.libelle)).join(', ')}`, 'warning');
            return;
        }
        motifsAmendement = motifs;
    }

    if (!await oasisConfirmer(amendement ? te('confirm_soumettre_amendement') : te('confirm_soumettre_preuves'))) return;

    const pac = _collectPACData();
    if (amendement && pac.actions_correctives[0]) {
        pac.actions_correctives[0].motifs_amendement = motifsAmendement;
    }
    const evalData = _collectFullEvalData();
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || '';
    const aujourdhui = new Date().toISOString().slice(0, 10);

    try {
        if (amendement) {
            // L'acceptation est remise en jeu : le serveur la vide et archive
            // le plan précédent. Le bandeau de dépôt de preuves n'a plus cours.
            delete evalData.preuves_info;
            delete evalData.rejet_info;
            evalData.submit_info = { date: aujourdhui, auteur, motif: te('pac_amende') };
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-pac`, {
                method: 'PUT',
                body: JSON.stringify({ actions_correctives: pac.actions_correctives, evaluation: evalData, amendement: true }),
            });
            _execToast(te('pac_amende_soumis'), 'success');
        } else {
            evalData.preuves_info = { date: aujourdhui, auteur };
            // De nouvelles preuves annulent le refus précédent.
            delete evalData.preuves_refus;
            const anacP = evalData.evaluation_anac || (evalData.evaluation_anac = {});
            if ((anacP.verification || {}).preuves_acceptees === 'NON') {
                anacP.verification = { ...anacP.verification, preuves_acceptees: '' };
            }
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-preuves`, {
                method: 'PUT',
                body: JSON.stringify({ actions_correctives: pac.actions_correctives, evaluation: evalData }),
            });
            _execToast(te('preuves_soumises'), 'success');
        }
        EXEC_STATE.pacMode = null;
        await execRefreshDynamic();
        const maj = (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
        if (maj) EXEC_STATE.selectedConstatation = maj;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Soumission mise en oeuvre error:', e);
        _execToast((e && e.message) || 'Erreur lors de la soumission', 'error');
    }
}

// ── Étape Mise en oeuvre : prononcé de l'AAC sur les preuves ─────
// Refus : le circuit reste à la mise en oeuvre, un bandeau rouge porte le
// motif, et le prestataire reprend la main pour déposer de nouvelles preuves.
function execPreuvesNonAcceptables(fncId) {
    _execCommentModal(te('preuves_non_acceptables'), '#dc2626', async (motif) => {
        const user = EXEC_STATE.user || {};
        const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
        const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
        const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
        anac.verification = { ...(anac.verification || {}), preuves_acceptees: 'NON' };
        evalData.preuves_refus = { date: new Date().toISOString().slice(0, 10), auteur, motif };
        delete evalData.preuves_info;
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ commentaire_evaluation: evalData }),
            });
            _execToast(te('preuves_refusees'), 'success');
            await execRefreshDynamic();
            execOpenPACSlider(fncId);
        } catch (e) {
            console.error('Refus des preuves :', e);
            _execToast((e && e.message) || 'Erreur lors du refus des preuves', 'error');
        }
    });
}

// Acceptation : l'étape « Mise en oeuvre » se ferme et la clôture s'ouvre.
// Si l'AAC a coché « À vérifier sur le terrain », un bandeau l'annonce.
async function execAccepterPreuves(fncId) {
    const terrain = !!document.getElementById('anac_verif_terrain')?.checked;
    if (!await oasisConfirmer(terrain ? te('confirm_accepter_preuves_terrain') : te('confirm_accepter_preuves'))) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
    anac.verification = {
        ...(anac.verification || {}),
        preuves_acceptees: 'OUI',
        verification_terrain: terrain,
        date_acceptation_preuves: new Date().toISOString().slice(0, 10),
        acceptees_par: auteur,
    };
    delete evalData.preuves_refus;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ commentaire_evaluation: evalData }),
        });
        _execToast(te('preuves_acceptees_ok'), 'success');
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Acceptation des preuves :', e);
        _execToast((e && e.message) || 'Erreur lors de l\'acceptation des preuves', 'error');
    }
}

// Annuler : les saisies non enregistrées sont abandonnées et le formulaire se
// recharge tel qu'il est en base. Il ne se referme pas.
async function execAnnulerSaisiePAC(fncId) {
    if (!await oasisConfirmer(te('confirm_annuler_saisie'))) return;
    execOpenPACSlider(fncId);
}

// Étape Clôture : l'AAC rend la main au prestataire en rouvrant la mise en
// oeuvre — l'acceptation des preuves est retirée, le motif est consigné.
function execRenvoyerMiseEnOeuvre(fncId) {
    _execCommentModal(te('renvoyer_mise_oeuvre'), '#dc2626', async (motif) => {
        const user = EXEC_STATE.user || {};
        const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
        const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
        const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
        anac.verification = {
            ...(anac.verification || {}),
            preuves_acceptees: '', date_acceptation_preuves: '', acceptees_par: '',
        };
        anac.cloture = { ...(anac.cloture || {}), mise_en_oeuvre_effective: '' };
        evalData.retour_mise_oeuvre = { date: new Date().toISOString().slice(0, 10), auteur, motif };
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ commentaire_evaluation: evalData }),
            });
            _execToast(te('renvoye_mise_oeuvre'), 'success');
            await execRefreshDynamic();
            execOpenPACSlider(fncId);
        } catch (e) {
            console.error('Renvoi à la mise en oeuvre :', e);
            _execToast((e && e.message) || 'Erreur lors du renvoi', 'error');
        }
    });
}

// ── Accepter le PAC (AAC) ────────────────────────────────────────
// `avecPreuves` = faux : seul le plan d'actions est accepté ; l'étape
// « Mise en oeuvre » s'ouvre et attend les preuves.
// `avecPreuves` = vrai : plan et preuves acceptés d'un même geste ; les deux
// étapes se ferment et le circuit se présente à la clôture.
async function execAccepterPAC(fncId, avecPreuves) {
    const question = avecPreuves ? te('confirm_accepter_pac_preuves') : te('confirm_accepter_pac');
    if (!await oasisConfirmer(question)) return;

    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
    const aujourdhui = new Date().toISOString().slice(0, 10);

    anac.acceptation = { ...(anac.acceptation || {}), accepte: 'OUI' };
    if (!anac.acceptation.date) anac.acceptation.date = aujourdhui;

    if (avecPreuves) {
        const user = EXEC_STATE.user || {};
        anac.verification = {
            ...(anac.verification || {}),
            preuves_acceptees: 'OUI',
            date_acceptation_preuves: aujourdhui,
            acceptees_par: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username || 'AAC',
        };
    }
    // Le plan est accepté : la mention de renvoi n'a plus lieu d'être.
    delete evalData.rejet_info;

    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/validate-pac`, {
            method: 'PUT',
            body: JSON.stringify({ evaluation: evalData }),
        });
        _execToast(avecPreuves ? te('pac_preuves_acceptes') : te('pac_accepte_ok'), 'success');
        await execRefreshDynamic();
        const maj = (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
        if (maj) EXEC_STATE.selectedConstatation = maj;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Accepter PAC error:', e);
        _execToast((e && e.message) || 'Erreur lors de l\'acceptation du PAC', 'error');
    }
}

// ── Solder la Constatation (AAC) ─────────────────────────────────
async function execCloseFNC(fncId) {
    if (!await oasisConfirmer(te('confirm_solder'))) return;
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/close`, {
            method: 'PUT',
            body: JSON.stringify({ evaluation: evalData })
        });
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Close FNC error:', e);
    }
}

