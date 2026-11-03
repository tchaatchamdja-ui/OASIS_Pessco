/* OASIS — Profils de Risque
 * Suite de pr-evaluations.js : la fiche d'une évaluation : contexte, corps, onglets, réunions, notes et circuit de validation.
 *
 *
 * ── Document imprimé : français seulement, et c'est une décision ──
 *
 * Les libellés de ce document ne passent pas par la table de traduction, et
 * n'ont pas à y passer : **la maîtrise d'ouvrage a tranché le 3 octobre 2026 —
 * les documents eux-mêmes ne sont pas à traduire.** Un acte de surveillance
 * d'une AAC de l'UEMOA est rédigé en français ; l'écran qui le compose est
 * trilingue, le document qu'il produit ne l'est pas.
 *
 * Ce n'est donc pas un oubli à rattraper. Le garde-fou des traductions ne
 * couvre que les écrans, et il n'a pas à être élargi ici.
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// L'écran le plus dense du module : on sépare ce qui se calcule (les droits de
// l'utilisateur, les indicateurs, les totaux) de ce qui s'écrit (le corps de la
// fiche, puis sa barre d'actions). Les deux fabriques reçoivent le contexte.

// Contexte de la fiche : évaluation, portée de l'utilisateur, indicateurs et totaux.
// Renvoie `null` quand l'évaluation n'existe pas.
function _prEvalContexte(evalId) {
    const D = APP_STATE.data;
    const ev = (D.evaluations || []).find(e => e.id === evalId);
    if (!ev) return null;
    const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id);
    // Use the raw (unfiltered) sub-activity list so designated evaluators outside
    // the eval's domain still see the full structure on Conformité / Complexité tabs.
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const indices = D.indices || {};
    const canEditDomain = APP_STATE.allowedSecteurs === null || (APP_STATE.allowedSecteurs || []).includes(ev.secteur_id);
    // Consolidation override: when active, indicators stay editable even if soumis_directeur
    // After save, a "consolidation_locked" flag forces read-only regardless of statut.
    const _consolKey = 'pr_consol_' + evalId;
    const _consolLockKey = 'pr_consol_locked_' + evalId;
    const _consolActive = !!localStorage.getItem(_consolKey);
    const _consolLocked = !!localStorage.getItem(_consolLockKey);
    const isReadonly = ['valide', 'cloturee', 'rejetee'].includes(ev.statut)
        || (APP_STATE.user?.role === 'Consultation')
        || !canEditDomain
        || (['soumis_directeur', 'acceptee'].includes(ev.statut) && !_consolActive)
        || (_consolLocked && !_consolActive);

    // ── Multi-evaluator: validator vs designated evaluator ──
    const currentUserId = APP_STATE.user?.id || '';
    const isValidator = prCanValidate(ev.secteur_id);
    if (!ev.evaluateurs_designes || !Array.isArray(ev.evaluateurs_designes)) ev.evaluateurs_designes = [];
    if (!ev.notes_per_evaluator || typeof ev.notes_per_evaluator !== 'object') ev.notes_per_evaluator = {};
    if (!ev.notes_per_evaluator.perf) ev.notes_per_evaluator.perf = {};
    if (!ev.notes_per_evaluator.comp) ev.notes_per_evaluator.comp = {};
    if (!ev.notes_per_evaluator_draft || typeof ev.notes_per_evaluator_draft !== 'object') ev.notes_per_evaluator_draft = {};
    if (!ev.notes_per_evaluator_draft.perf) ev.notes_per_evaluator_draft.perf = {};
    if (!ev.notes_per_evaluator_draft.comp) ev.notes_per_evaluator_draft.comp = {};
    const isDesignated = (ev.evaluateurs_designes || []).includes(currentUserId);
    const isDraftMode = isDesignated && !isValidator; // designated evaluator who is not validator → private brouillon

    // Store active tab for this modal — default to "Généralités"
    if (!window._evalDetailTab) window._evalDetailTab = 'generalites';

    // Helper to render criteria rows with color coding
    function renderEvalCriteria(ind, isComplexity) {
        const rows = [];
        if (ind.c1) {
            const cls = isComplexity ? 'criteria-score-1-good' : 'criteria-score-1-bad';
            rows.push(`<div class="eval-criteria-row ${cls}"><span class="cr-score">1</span><span class="cr-text">${ind.c1}</span></div>`);
        }
        if (ind.c2) {
            rows.push(`<div class="eval-criteria-row criteria-score-2-mid"><span class="cr-score">2</span><span class="cr-text">${ind.c2}</span></div>`);
        }
        if (ind.c3) {
            const cls = isComplexity ? 'criteria-score-3-bad' : 'criteria-score-3-good';
            rows.push(`<div class="eval-criteria-row ${cls}"><span class="cr-score">3</span><span class="cr-text">${ind.c3}</span></div>`);
        }
        return rows.length ? `<div class="eval-criteria-list">${rows.join('')}</div>` : '';
    }

    // Helper to render one indicator card with criteria + score buttons
    // For Perf/Comp the scoring rules differ per role:
    //   - Validator: clicks set the FINAL note (notes_perf/notes_comp) AND sees each evaluator's note
    //   - Designated evaluator (non-validator): clicks set ONLY their own slot in notes_per_evaluator
    //   - Other users: read-only view of the final note
    function renderEvalIndicator(ind, noteField, noteKey, isComplexity) {
        const isPerfOrComp = (noteField === 'notes_perf' || noteField === 'notes_comp');
        const slot = (noteField === 'notes_perf') ? 'perf' : (noteField === 'notes_comp' ? 'comp' : null);
        let note = 0;
        let writeMode = 'final'; // 'final' (notes_perf/notes_comp) | 'evaluator' (notes_per_evaluator)
        let canScore = !isReadonly;

        if (isPerfOrComp && slot) {
            if (isValidator) {
                note = ev[noteField]?.[noteKey] || 0;
                writeMode = 'final';
            } else if (isDesignated) {
                // Private draft: each evaluator sees only their own notes (not visible to validator/admin)
                // If already submitted (published), show the published value and lock editing.
                const publishedNote = ev.notes_per_evaluator[slot]?.[currentUserId]?.[noteKey] || 0;
                const draftNote = ev.notes_per_evaluator_draft[slot]?.[currentUserId]?.[noteKey] || 0;
                if (publishedNote > 0) {
                    note = publishedNote;
                    canScore = false; // already submitted — read-only for this evaluator
                } else {
                    note = draftNote;
                    writeMode = 'evaluator_draft';
                }
            } else {
                // Not validator, not designated → read-only of final note
                note = ev[noteField]?.[noteKey] || 0;
                canScore = false;
            }
        } else {
            // Conformity: only Validateur/Administrateur can score (§4.2.2.c — chef service)
            note = ev[noteField]?.[noteKey] || 0;
            if (!isValidator) canScore = false;
        }

        // For validator on Perf/Comp: status badge + line of evaluators' individual notes
        let evalsLine = '';
        if (isValidator && isPerfOrComp && slot && (ev.evaluateurs_designes || []).length) {
            const compiled = compileIndicatorStatus(slot, noteKey);
            const badgeMap = {
                consensus: { color:'#059669', txt:'Consensus' },
                discuss:   { color:'#d97706', txt:'À discuter (majorité)' },
                reevaluate:{ color:'#dc2626', txt:'À réévaluer' },
                pending:   { color:'#6b7280', txt:'En attente' }
            };
            const b = badgeMap[compiled.status] || badgeMap.pending;
            const badge = `<span style="background:${b.color}20;color:${b.color};border:1px solid ${b.color}55;border-radius:4px;padding:0.05rem 0.4rem;font-size:0.7rem;font-weight:700;margin-right:0.5rem;">${b.txt}</span>`;
            const items = ev.evaluateurs_designes.map(uid => {
                const n = ev.notes_per_evaluator[slot]?.[uid]?.[noteKey];
                return `<span style="margin-right:0.65rem;">${_escapeHtml(evalUserLabel(uid))}: <strong>${n || '-'}</strong></span>`;
            }).join('');
            evalsLine = `<div style="font-size:0.72rem;color:var(--text-muted);padding:0.2rem 0 0 2.4rem;">${badge}${items}</div>`;
        }

        // Inline comment per indicator
        // - Editable when statut === 'soumis_directeur'
        // - Read-only and visible to ALL users from acceptance onwards (acceptee/cloturee/valide/rejetee)
        const cSlot = (noteField === 'notes_conf') ? 'conf' : (noteField === 'notes_perf' ? 'perf' : (noteField === 'notes_comp' ? 'comp' : null));
        if (!ev.commentaires_indicateurs || typeof ev.commentaires_indicateurs !== 'object') ev.commentaires_indicateurs = {};
        if (cSlot && !ev.commentaires_indicateurs[cSlot]) ev.commentaires_indicateurs[cSlot] = {};
        const commentVal = (cSlot ? (ev.commentaires_indicateurs[cSlot][noteKey] || '') : '');
        const isSoumis = (ev.statut === 'soumis_directeur');
        const commentEditable = isSoumis;
        const commentHasValue = !!commentVal.trim();
        const commentRowId = 'cmt_row_' + (evalId.slice(-6)) + '_' + (cSlot || 'x') + '_' + noteKey.replace(/[^a-zA-Z0-9]/g, '_');
        const taStyle = 'width:100%;padding:0.4rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.85rem;font-family:inherit;line-height:1.4;min-height:2.8rem;resize:vertical;';
        let commentBlock = '';
        if (cSlot && (commentHasValue || commentEditable)) {
            if (commentHasValue || !commentEditable) {
                commentBlock = `<div id="${commentRowId}" style="margin-top:0.35rem;">
                    <textarea class="eval-indicator-comment" data-slot="${cSlot}" data-key="${noteKey}" rows="2" placeholder="Commentaire..." ${commentEditable ? '' : 'readonly'}
                        style="${taStyle}">${_escapeHtml(commentVal)}</textarea>
                </div>`;
            } else {
                commentBlock = `<div id="${commentRowId}" style="margin-top:0.35rem;">
                    <button class="btn btn-outline" onclick="_inlineCommentReveal('${commentRowId}','${cSlot}','${noteKey}')" style="padding:0.22rem 0.7rem;font-size:0.78rem;">${t('add_comment_btn')}</button>
                </div>`;
            }
        }

        return `<div class="eval-indicator">
            <div class="eval-indicator-header">
                <span class="ind-code">${ind.code}</span>
                <span class="ind-label">${ind.label}</span>
                <div class="score-selector${isComplexity ? ' inverse' : ''}">
                    ${[1,2,3].map(n => `<button class="score-btn ${note === n ? 'active-'+n : ''}" onclick="setScore('${evalId}','${noteField}','${noteKey}',${n},'${writeMode}')" ${canScore ? '' : 'disabled'}>${n}</button>`).join('')}
                </div>
            </div>
            ${evalsLine}
            ${renderEvalCriteria(ind, isComplexity)}
            ${commentBlock}
        </div>`;
    }
    function _escapeHtml(s) { return oasisEsc(s); }

    // Phase 2 — Compile per-evaluator scores for an indicator (4.2.2.d)
    function compileIndicatorStatus(slot, indKey) {
        const map = ev.notes_per_evaluator?.[slot] || {};
        const votes = (ev.evaluateurs_designes || [])
            .map(uid => map[uid]?.[indKey])
            .filter(n => n && n > 0);
        if (votes.length === 0) return { status: 'pending', votes: [] };
        const unique = [...new Set(votes)];
        if (unique.length === 1) return { status: 'consensus', votes };
        if (unique.length === 2) {
            const [a, b] = unique.sort((x, y) => x - y);
            // Adjacent (1&2 or 2&3) → majority + discuss
            if (b - a === 1) return { status: 'discuss', votes };
        }
        return { status: 'reevaluate', votes };
    }

    // Compute taux/indices for display (all 3 types)
    const g = ev.resultats?.global || {};

    // Check completeness per type (for Validé button logic)
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const confCount = Object.keys(ev.notes_conf || {}).filter(k => ev.notes_conf[k] > 0).length;
    const _srcPerf = evalNotesSource(ev, 'perf');
    const _srcComp = evalNotesSource(ev, 'comp');
    const perfCount = Object.keys(_srcPerf).filter(k => _srcPerf[k] > 0).length;
    const compCount = Object.keys(_srcComp).filter(k => _srcComp[k] > 0).length;
    const confTotal = confInds.length * sas.length;
    const perfTotal = perfInds.length;
    const compTotal = allCompInds.length;
    const allThreeScored = confCount > 0 && perfCount > 0 && compCount > 0;

    // Sum of scores obtained per type (for the bandeaux)
    const sumConf = sas.reduce((s, sa) => s + confInds.reduce((s2, ind) => s2 + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0), 0);
    const sumPerf = perfInds.reduce((s, ind) => s + (_srcPerf[ind.id] || 0), 0);
    const sumComp = allCompInds.reduce((s, ind) => s + (_srcComp[ind.id] || 0), 0);
    const maxConf = confTotal * 3;
    const maxPerf = perfTotal * 3;
    const maxComp = compTotal * 3;

    // Export/Import toolbar (réunions are now dedicated tabs after Complexité)
    return {
        // Fabriques internes : elles ferment sur l'évaluation et servent au corps.
        renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus,
        evalId, D, ev, prest, sect, sas, indices, canEditDomain,
        _consolKey, _consolLockKey, _consolActive, _consolLocked, isReadonly,
        currentUserId, isValidator, isDesignated, isDraftMode, g,
        confInds, perfInds, allCompInds, confCount, _srcPerf, _srcComp,
        perfCount, compCount, confTotal, perfTotal, compTotal, allThreeScored,
        sumConf, sumPerf, sumComp, maxConf, maxPerf, maxComp,
    };
}

// Corps de la fiche : barre d'outils, rappel d'un renvoi, entête et onglets.
function _prEvalCorpsHtml(c) {
    const { ev, evalId } = c;
    let bodyHtml = _prEvalEnteteHtml(c);

    // Inner tabs: Généralités + 3 indicator types
    const activeTab = window._evalDetailTab || 'generalites';
    bodyHtml += _prEvalOngletsHtml(c, activeTab);

    bodyHtml += '<div id="evalModalBody">';

    // Render content based on active tab
    if (activeTab === 'generalites') {
        bodyHtml += _prEvalGeneralitesHtml(c);
    } else if (activeTab === 'conformite') {
        bodyHtml += _prEvalConformiteHtml(c);
    } else if (activeTab === 'performance') {
        bodyHtml += _prEvalPerformanceHtml(c);
    } else if (activeTab === 'complexite') {
        bodyHtml += _prEvalComplexiteHtml(c);
    } else if (activeTab === 'reunion_evaluateurs') {
        // Phase 3 — §4.2.2.e : placeholder, loader called after slicer rendered
        bodyHtml += `<div id="reunionEvalContent" style="padding:0.5rem 0.25rem;">
            <div style="color:var(--text-muted);font-size:0.85rem;">${t('loading_meetings')}</div>
        </div>`;
        window._evalPendingLoader = { kind: 'reunion_evaluateurs', evalId };
    } else if (activeTab === 'reunion_prestataire') {
        // Phase 5 — §4.2.2.g : placeholder, loader called after slicer rendered
        bodyHtml += `<div id="reunionPrestContent" style="padding:0.5rem 0.25rem;">
            <div style="color:var(--text-muted);font-size:0.85rem;">Chargement...</div>
        </div>`;
        window._evalPendingLoader = { kind: 'reunion_prestataire', evalId, prestataireId: ev.prestataire_id };
    } else {
        window._evalPendingLoader = null;
    }

    bodyHtml += '</div>';
    return bodyHtml;
}

// Entête de la fiche : barre d'outils, rappel d'un renvoi, métadonnées et
// bandeaux des trois familles d'indicateurs.
function _prEvalEnteteHtml(c) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;

    let toolbarHtml = `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
        ${renderEvalProcessSteps(ev)}
        <span style="margin-left:auto;"></span>
        <button class="btn btn-primary btn-sm" onclick="exportEvalExcel('${evalId}')" title="Exporter Excel">${ICONS.file_excel} Exporter Excel</button>
        <button class="btn btn-primary btn-sm" onclick="exportEvalPDF('${evalId}')" title="Exporter PDF">${ICONS.download} Exporter PDF</button>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('evalImportFile').click();" title="Importer">${ICONS.upload} Importer</button>
        <input type="file" id="evalImportFile" accept=".xlsx,.xls" style="display:none" onchange="importEvalExcel(event,'${evalId}','conformite')">
        <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalModalBody',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
        <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalModalBody',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
    </div>`;

    // Renvoi comment block (Chap. 4 §4.2.2.f) — visible when statut='renvoyee'
    const renvoiHeader = (ev.statut === 'renvoyee' && (ev.commentaire_directeur || '').trim())
        ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;border-radius:6px;padding:0.6rem 0.85rem;margin-bottom:0.6rem;">
            <div style="font-weight:700;color:#991b1b;font-size:0.88rem;">${t('eval_returned_banner')}</div>
            <div style="font-size:0.78rem;color:#7f1d1d;margin-top:0.15rem;">${ev.date_revue_directeur ? 'Le ' + formatDate(ev.date_revue_directeur) : ''}</div>
            <div style="font-size:0.88rem;margin-top:0.4rem;white-space:pre-wrap;color:#7f1d1d;"><strong>Motif :</strong> ${_escapeHtml(ev.commentaire_directeur)}</div>
          </div>`
        : '';

    // Statut = étape en cours du fil d'avancement ; seule la couleur dépend du
    // statut technique (Chap. 4 §4.2.2.f).
    const statusClsHdr = {
        brouillon: 'badge-draft', soumis_directeur: 'badge-warning', renvoyee: 'badge-danger',
        acceptee: 'badge-info', cloturee: 'badge-info', rejetee: 'badge-danger', valide: 'badge-validated',
    };
    const smHdr = { cls: statusClsHdr[ev.statut] || 'badge-draft', lbl: evalStatutLabel(ev) };
    const stepDate = evalStepDate(ev);

    // Toolbar at top, then compact metadata row, then KPI bandeaux
    let bodyHtml = `${toolbarHtml}
    ${renvoiHeader}
    <div class="eval-meta-row" style="display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;align-items:baseline;font-size:0.82rem;margin-bottom:0.5rem;">
        <div><span style="color:var(--text-muted);">${t('provider')}:</span> <strong>${prest?.nom || '-'}</strong></div>
        <div><span style="color:var(--text-muted);">${t('sector')}:</span> ${sect?.nom || '-'}</div>
        <div><span style="color:var(--text-muted);">${t('status')}:</span> <span class="badge ${smHdr.cls}" style="padding:1px 8px;">${smHdr.lbl}</span></div>
        <div><span style="color:var(--text-muted);">${t('date')}:</span> <span title="Date de lancement de l'étape « ${smHdr.lbl} »">${stepDate ? formatDate(stepDate) : '-'}</span></div>
    </div>
    <div style="display:${isValidator ? 'grid' : 'none'};grid-template-columns:repeat(3,1fr);gap:0.4rem;margin-bottom:0.4rem;">
        <div style="padding:0.3rem 0.55rem;background:var(--bg);border-radius:6px;border-left:3px solid #3182ce;font-size:0.78rem;line-height:1.35;">
            <strong style="color:#3182ce;">${t('conformity')}</strong>
            ${isValidator ? `&nbsp;·&nbsp; Taux: <strong id="evalTauxConf">${g.tauxConf !== undefined ? (g.tauxConf*100).toFixed(1)+'%' : '-'}</strong>
            &nbsp;·&nbsp; IDC: <span id="evalIdcG">${g.idc_g || '-'}</span>
            &nbsp;·&nbsp; Notes: <strong id="evalSumConf">${sumConf}</strong>/${maxConf}
            <span style="color:var(--text-muted);margin-left:0.35rem;">(<span id="evalCntConf">${confCount}</span>/${confTotal})</span>` : ''}
        </div>
        ${isValidator ? `<div style="padding:0.3rem 0.55rem;background:var(--bg);border-radius:6px;border-left:3px solid #059669;font-size:0.78rem;line-height:1.35;">
            <strong style="color:#059669;">${t('performance')}</strong>
            &nbsp;·&nbsp; Taux: <strong id="evalTauxPerf">${g.tauxPerf !== undefined ? (g.tauxPerf*100).toFixed(1)+'%' : '-'}</strong>
            &nbsp;·&nbsp; IDP: <span id="evalIdpG">${g.idp_g || '-'}</span>
            &nbsp;·&nbsp; Notes: <strong id="evalSumPerf">${sumPerf}</strong>/${maxPerf}
            <span style="color:var(--text-muted);margin-left:0.35rem;">(<span id="evalCntPerf">${perfCount}</span>/${perfTotal})</span>
        </div>
        <div style="padding:0.3rem 0.55rem;background:var(--bg);border-radius:6px;border-left:3px solid #d97706;font-size:0.78rem;line-height:1.35;">
            <strong style="color:#d97706;">${t('complexity')}</strong>
            &nbsp;·&nbsp; Taux: <strong id="evalTauxComp">${g.tauxComp !== undefined ? (g.tauxComp*100).toFixed(1)+'%' : '-'}</strong>
            &nbsp;·&nbsp; IDE: <span id="evalIdeG">${g.ide_g || '-'}</span>
            &nbsp;·&nbsp; Notes: <strong id="evalSumComp">${sumComp}</strong>/${maxComp}
            <span style="color:var(--text-muted);margin-left:0.35rem;">(<span id="evalCntComp">${compCount}</span>/${compTotal})</span>
        </div>` : ''}
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:0.25rem 0 0.6rem;">`;
    return bodyHtml;
}

// Onglets de la fiche : Généralités, les trois familles d'indicateurs, puis les réunions.
function _prEvalOngletsHtml(c, activeTab) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;
    let bodyHtml = '';
    bodyHtml += `<div class="eval-inner-tabs" style="display:flex;gap:0;margin-bottom:1rem;border-bottom:2px solid var(--border);">
        <button class="eval-tab-btn ${activeTab === 'generalites' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','generalites')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'generalites' ? '700' : '400'};color:${activeTab === 'generalites' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'generalites' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('tab_generalites')}
        </button>
        <button class="eval-tab-btn ${activeTab === 'conformite' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','conformite')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'conformite' ? '700' : '400'};color:${activeTab === 'conformite' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'conformite' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('eval_tab_conf')} ${isValidator ? `<span style="font-size:0.75rem;opacity:0.7;">(${confCount}/${confTotal})</span>` : ''}
        </button>
        <button class="eval-tab-btn ${activeTab === 'performance' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','performance')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'performance' ? '700' : '400'};color:${activeTab === 'performance' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'performance' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('eval_tab_perf')} ${isValidator ? `<span style="font-size:0.75rem;opacity:0.7;">(${perfCount}/${perfTotal})</span>` : ''}
        </button>
        <button class="eval-tab-btn ${activeTab === 'complexite' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','complexite')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'complexite' ? '700' : '400'};color:${activeTab === 'complexite' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'complexite' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('eval_tab_comp')} ${isValidator ? `<span style="font-size:0.75rem;opacity:0.7;">(${compCount}/${compTotal})</span>` : ''}
        </button>
        ${isValidator ? `<button class="eval-tab-btn ${activeTab === 'reunion_evaluateurs' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','reunion_evaluateurs')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'reunion_evaluateurs' ? '700' : '400'};color:${activeTab === 'reunion_evaluateurs' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'reunion_evaluateurs' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            Consolidation
        </button>` : ''}
        ${(isValidator && ['acceptee', 'cloturee', 'valide'].includes(ev.statut)) ? `<button class="eval-tab-btn ${activeTab === 'reunion_prestataire' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','reunion_prestataire')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'reunion_prestataire' ? '700' : '400'};color:${activeTab === 'reunion_prestataire' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'reunion_prestataire' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('provider_meeting_tab')}
        </button>` : ''}
    </div>`;
    return bodyHtml;
}

// Onglet « Généralités » : les champs libres du rapport et les évaluateurs désignés.
function _prEvalGeneralitesHtml(c) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;
    let bodyHtml = '';
    const gen = ev.generalites || {};
    // Chaque champ est une pièce du rapport : son libellé au-dessus, sa
    // saisie en dessous, la mise en forme dans la feuille du module.
    const fld = (id, key, labelKey, defaultValue) =>
        `<div class="pr-gen-champ">
            <label for="${id}">${t(labelKey)}</label>
            <textarea id="${id}" class="auto-grow eval-gen-field" rows="4" data-key="${key}"
                ${isReadonly ? 'readonly' : ''}>${gen[key] || defaultValue || ''}</textarea>
        </div>`;

    // Designated evaluators selector — editable only by Validateur/Administrateur.
    // Eligible roles: M1_Contributeur, M1_Validateur, M1_Administrateur
    // Restricted to the eval's domain (or users with no domain restriction).
    // Source : Gestion des Droits du module. Sont éligibles les utilisateurs
    // ayant le module dans leurs accès et un privilège Contributeur,
    // Validateur ou Administrateur couvrant le domaine ET le secteur du
    // prestataire évalué. Les SUPERADMIN du portail sont exclus (côté serveur).
    const evalDom = ev.domaine_id || '';
    const evalSec = ev.secteur_id || '';
    const eligibleUsers = (evalEligibleEvaluators(evalDom, evalSec) || [])
        .filter(u => u.id !== currentUserId);
    const eligibleLoading = evalEligibleEvaluators(evalDom, evalSec) === null;
    const designated = ev.evaluateurs_designes || [];
    const nbMin = (ev.nb_evaluateurs_min !== undefined && ev.nb_evaluateurs_min !== null) ? Number(ev.nb_evaluateurs_min) : 3;
    // Never expose raw user ids in the UI (§ requirement)
    // « NOM Prénom », jamais l'adresse e-mail
    const userName = u => {
        const full = `${(u.nom || '').trim()} ${(u.prenom || '').trim()}`.trim();
        if (full) return full;
        if (u.fullName) return u.fullName;
        if (u.nom_utilisateur) return u.nom_utilisateur;
        if (u.email) return u.email.split('@')[0];
        return '(sans nom)';
    };
    const nbCount = designated.length;
    const countBadge = (() => {
        if (nbMin <= 0) return '';
        const ok = nbCount >= nbMin;
        const color = ok ? '#059669' : '#d97706';
        const txt = ok ? `${nbCount}/${nbMin} évaluateurs désignés ✓` : `${nbCount}/${nbMin} évaluateurs désignés (minimum non atteint)`;
        return `<span style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}55;border-radius:4px;padding:0.1rem 0.5rem;font-size:0.75rem;font-weight:600;margin-left:0.5rem;">${txt}</span>`;
    })();
    let evalSelector = '';
    if (isValidator && !isReadonly) {
        evalSelector = `<div class="pr-gen-champ pr-gen-champ-court">
            <label for="evalNbMin">${t('min_assessors')}</label>
            <div class="pr-gen-nb">
                <input type="number" id="evalNbMin" min="0" max="20" value="${nbMin}">
                <span class="pr-gen-aide">${t('aucun_minimum')}</span>
            </div>
        </div>
        <div class="pr-gen-champ">
            <label>${t('designated_assessors')} <span class="pr-gen-aide">${t('perf_comp_hint')}</span> ${countBadge}</label>
            <ul id="evalDesignesBox" class="pr-gen-designes">
                ${eligibleUsers.length ? eligibleUsers.map(u => `
                    <li>
                        <input type="checkbox" class="eval-designe-cb" id="cb_eval_${u.id}" data-uid="${u.id}" ${designated.includes(u.id) ? 'checked' : ''}>
                        <label for="cb_eval_${u.id}" title="${_escapeHtml(u.privilege || '')}">${_escapeHtml(userName(u))}</label>
                    </li>`).join('')
                    : `<li class="pr-gen-vide">${t(eligibleLoading ? 'loading_eligible' : 'no_eligible_user')}</li>`}
            </ul>
        </div>`;
    } else if (designated.length) {
        const items = designated.map(uid => {
            const u = evalUserById(uid) || { id: uid };
            return `<span class="pr-gen-jeton">${_escapeHtml(userName(u))}</span>`;
        }).join('');
        evalSelector = `<div class="pr-gen-champ">
            <label>Évaluateurs désignés ${countBadge}</label>
            <div class="pr-gen-jetons">${items}</div>
        </div>`;
    }

    // Pre-fill "Liste des évaluateurs" with selected evaluator names (one per line, prefixed "- ")
    const designatedDefaultList = designated.map(uid => {
        const u = evalUserById(uid);
        return u ? ' - ' + userName(u) : '';
    }).filter(Boolean).join('\n');

    // Les sept champs libres du rapport se lisaient à la file, sans rien
    // qui dise à quoi chacun sert. Ils se rangent en trois temps : le cadre
    // posé, les personnes qui y prennent part, puis ce que l'évaluation en
    // conclut.
    const bloc = (titreKey, contenu) => `<section class="pr-gen-bloc">
        <h4>${t(titreKey)}</h4>
        ${contenu}
    </section>`;

    bodyHtml += `<div class="pr-gen">
        ${bloc('gen_sec_cadre', `<div class="pr-gen-duo">
            ${fld('genIntroduction', 'introduction', 'gen_introduction')}
            ${fld('genSources', 'sources', 'gen_sources')}
        </div>`)}
        ${bloc('gen_sec_participants', `${evalSelector}
        <div class="pr-gen-duo">
            ${fld('genEvaluateurs', 'evaluateurs', 'gen_evaluateurs', designatedDefaultList)}
            ${fld('genParties', 'parties', 'gen_parties')}
        </div>`)}
        ${bloc('gen_sec_analyse', `${fld('genResume', 'resume', 'gen_resume')}
        ${fld('genActions', 'actions', 'gen_actions')}
        ${fld('genConclusion', 'conclusion', 'gen_conclusion')}`)}
    </div>`;
    return bodyHtml;
}

// Onglet « Conformité » : une section par sous-activité.
function _prEvalConformiteHtml(c) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;
    let bodyHtml = '';
    const indicators = confInds;
    if (sas.length && indicators.length) {
        sas.forEach((sa, saIdx) => {
            const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
            const saTaux = saRes.tauxConf !== undefined ? (saRes.tauxConf * 100).toFixed(1) + '%' : '-';
            const saIdc = saRes.idc_s || '-';
            const saAccId = `evalSa_conf_${saIdx}`;
            const saConfSum = indicators.reduce((s, ind) => s + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0);
            const saConfMax = indicators.length * 3;
            // Conformité is scored by the validator only — hide aggregate stats for non-validators
            // so designated evaluators don't see partial validator data.
            const _confStats = isValidator
                ? `Notes: <strong id="evalSaSum_conf_${sa.id}">${saConfSum}</strong>/${saConfMax} | Taux: <span id="evalSaTaux_conf_${sa.id}">${saTaux}</span> | idc: <span id="evalSaIdc_${sa.id}">${saIdc}</span>`
                : '';
            bodyHtml += `<div class="accordion-item" style="margin-bottom:0.5rem;">
                <div class="accordion-header" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')" style="padding:0.5rem 0.75rem;">
                    <span class="chevron">${ICONS.chevron}</span>
                    <span class="acc-title" style="font-weight:700;">${escapeHtml(`${sa.code} - ${sa.nom}`)}</span>
                    <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">${_confStats}</span>
                </div>
                <div class="accordion-body" id="acc-body-${saAccId}">`;
            indicators.forEach(ind => {
                const noteKey = `${sa.id}_${ind.id}`;
                bodyHtml += renderEvalIndicator(ind, 'notes_conf', noteKey, false);
            });
            bodyHtml += `</div></div>`;
        });
    } else {
        bodyHtml += `<div class="text-center">${t('no_data')}</div>`;
    }
    return bodyHtml;
}

// Onglet « Performance » : les indicateurs du secteur.
function _prEvalPerformanceHtml(c) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;
    let bodyHtml = '';
    const indicators = perfInds;
    if (indicators.length && sect) {
        // Performance indicators are scoped at the secteur level (not per sous-activité).
        // Source des notes selon le rôle : brouillon de l'évaluateur ou notes publiées.
        const _src = evalNotesSource(ev, 'perf');
        const saAccId = `evalSa_perf_${sect.id}`;
        const saPerfSum = indicators.reduce((s, ind) => s + (_src[ind.id] || 0), 0);
        const saPerfMax = indicators.length * 3;
        let saTauxPerf, saIdp;
        const _ind = D.indices || {};
        if (isDraftMode) {
            const _t = saPerfMax > 0 ? (saPerfSum / saPerfMax) : 0;
            saTauxPerf = saPerfSum > 0 ? (_t * 100).toFixed(1) + '%' : '-';
            saIdp = (typeof getIndice3Levels === 'function' && saPerfSum > 0)
                ? getIndice3Levels(_t, _ind.perf1 || 0.8, _ind.perf2 || 0.5) : '-';
        } else {
            const gRes = ev.resultats?.global || {};
            saTauxPerf = gRes.tauxPerf !== undefined ? (gRes.tauxPerf * 100).toFixed(1) + '%' : '-';
            saIdp = gRes.idp_g || '-';
        }
        bodyHtml += `<div class="accordion-item" style="margin-bottom:0.5rem;">
            <div class="accordion-header expanded" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')" style="padding:0.5rem 0.75rem;">
                <span class="chevron expanded">${ICONS.chevron}</span>
                <span class="acc-title" style="font-weight:700;">${sect.code || ''} - ${sect.nom || ''}</span>
                <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">Notes: <strong id="evalSaSum_perf_${sect.id}">${saPerfSum}</strong>/${saPerfMax} | Taux: <span id="evalSaTaux_perf_${sect.id}">${saTauxPerf}</span> | idp: <span id="evalSaIdp_${sect.id}">${saIdp}</span></span>
            </div>
            <div class="accordion-body expanded" id="acc-body-${saAccId}">`;
        indicators.forEach(ind => {
            bodyHtml += renderEvalIndicator(ind, 'notes_perf', ind.id, false);
        });
        bodyHtml += `</div></div>`;
    } else {
        bodyHtml += `<div class="text-center">${t('no_data')}</div>`;
    }
    return bodyHtml;
}

// Onglet « Complexité » : une section par sous-activité qui en porte.
function _prEvalComplexiteHtml(c) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;
    let bodyHtml = '';
    sas.forEach((sa, saIdx) => {
        const indicators = (D.indComplex || []).filter(i => i.sous_activite_id === sa.id && i.actif !== false);
        if (!indicators.length) return;
        const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
        // In draft mode (designated non-validator), the bandeau reflects the current
        // evaluator's own draft notes, not the published final notes.
        const _src = evalNotesSource(ev, 'comp');
        const saAccId = `evalSa_comp_${saIdx}`;
        const saCompSum = indicators.reduce((s, ind) => s + (_src[ind.id] || 0), 0);
        const saCompMax = indicators.length * 3;
        let saTaux, saIde;
        if (isDraftMode) {
            const _t = saCompMax > 0 ? (saCompSum / saCompMax) : 0;
            saTaux = saCompSum > 0 ? (_t * 100).toFixed(1) + '%' : '-';
            const _ind = D.indices || {};
            saIde = (typeof getIndice3Levels === 'function' && saCompSum > 0)
                ? getIndice3Levels(_t, _ind.expo1 || 0.8, _ind.expo2 || 0.5) : '-';
        } else {
            saTaux = saRes.tauxComp !== undefined ? (saRes.tauxComp * 100).toFixed(1) + '%' : '-';
            saIde = saRes.ide_s || '-';
        }
        bodyHtml += `<div class="accordion-item" style="margin-bottom:0.5rem;">
            <div class="accordion-header" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')" style="padding:0.5rem 0.75rem;">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title" style="font-weight:700;">${escapeHtml(`${sa.code} - ${sa.nom}`)}</span>
                <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">Notes: <strong id="evalSaSum_comp_${sa.id}">${saCompSum}</strong>/${saCompMax} | Taux: <span id="evalSaTaux_comp_${sa.id}">${saTaux}</span> | ide: <span id="evalSaIde_${sa.id}">${saIde}</span></span>
            </div>
            <div class="accordion-body" id="acc-body-${saAccId}">`;
        indicators.forEach(ind => {
            bodyHtml += renderEvalIndicator(ind, 'notes_comp', ind.id, true);
        });
        bodyHtml += `</div></div>`;
    });
    return bodyHtml;
}

// Barre d'actions : enregistrement, soumission et décisions du circuit.
function _prEvalPiedHtml(c) {
    const { _escapeHtml } = c;
    const {
        ev, prest, isReadonly, currentUserId, isValidator, isDraftMode,
        allThreeScored, evalId,
    } = c;

    // Smaller buttons in the footer (reduced ~1/4)
    const _bs = 'style="padding:0.28rem 0.85rem;font-size:0.82rem;"';
    let footerHtml = `<button class="btn btn-outline" ${_bs} onclick="closeSlicer()">${t('cancel')}</button>`;
    const canValidate = allThreeScored;
    // Acteur du circuit : privilège Validateur ou Gestionnaire sur le secteur
    const isWorkflowActor = isValidator;
    // Save button — when indicators are editable OR comments are editable (soumis_directeur)
    if (!isReadonly || ev.statut === 'soumis_directeur') {
        const _saveLabel = isDraftMode ? 'Brouillon' : t('save');
        footerHtml += `<button class="btn btn-primary" ${_bs} onclick="saveEvalScores('${evalId}')" title="${isDraftMode ? 'Enregistrer mes notes en brouillon (privées)' : ''}">${ICONS.check} ${_saveLabel}</button>`;
        // Designated non-validator: also offer "Soumettre mes notes" → promotes private draft to published (visible to validator)
        if (isDraftMode && !['valide','cloturee','rejetee','soumis_directeur','acceptee'].includes(ev.statut)) {
            const _myPerfPub = ev.notes_per_evaluator?.perf?.[currentUserId] || {};
            const _myCompPub = ev.notes_per_evaluator?.comp?.[currentUserId] || {};
            const _alreadySubmitted = Object.keys(_myPerfPub).length > 0 || Object.keys(_myCompPub).length > 0;
            if (!_alreadySubmitted) {
                footerHtml += `<button class="btn btn-success" ${_bs} onclick="soumettreMesNotes('${evalId}')" title="${t('submit_my_scores')}">${ICON_SEND} Soumettre mes notes</button>`;
            } else {
                footerHtml += `<span ${_bs} style="padding:0.28rem 0.6rem;color:var(--text-muted);font-size:0.78rem;">${t('scores_already_submitted')}</span>`;
            }
        }
    }
    // Workflow buttons (Phase 4 — Chap. 4 §4.2.2.f) — multi-step validation
    if (isWorkflowActor) {
        if (ev.statut === 'brouillon' || ev.statut === 'renvoyee') {
            footerHtml += `<button class="btn btn-primary" ${_bs} onclick="soumettreDirecteur('${evalId}')" ${!canValidate ? 'disabled' : ''}>${ICON_SUBMIT} Soumettre à la Validation</button>`;
        } else if (ev.statut === 'soumis_directeur') {
            footerHtml += `<button class="btn btn-success" ${_bs} onclick="decisionDirecteur('${evalId}','accepter')">${ICONS.check} Accepter</button>`;
            footerHtml += `<button class="btn btn-outline" ${_bs} onclick="decisionDirecteur('${evalId}','renvoyer')">↩ Renvoyer</button>`;
            footerHtml += `<button class="btn btn-danger" ${_bs} onclick="decisionDirecteur('${evalId}','rejeter')">✕ Rejeter</button>`;
        } else if (ev.statut === 'cloturee') {
            footerHtml += `<button class="btn btn-success" ${_bs} onclick="decisionDirecteur('${evalId}','valider')">${ICONS.check} Valider</button>`;
        } else if (ev.statut === 'valide' && prCanReevaluer(ev)) {
            footerHtml += `<button class="btn btn-outline" ${_bs} onclick="reevaluerEval('${evalId}')">${t('reevaluer_btn')}</button>`;
        }
    }

    return footerHtml;
}

function openEvalDetail(evalId) {
    const c = _prEvalContexte(evalId);
    if (!c) return;
    APP_STATE.currentEvalId = evalId;
    const bodyHtml = _prEvalCorpsHtml(c);
    const footerHtml = _prEvalPiedHtml(c);
    openSlicer(`${t('eval_indicators')} - ${c.prest?.nom || ''}`, bodyHtml, footerHtml, { retour: true });

    // Une fois le volet rendu, on lance le chargement d'onglet en attente.
    const pending = window._evalPendingLoader;
    if (pending) {
        setTimeout(() => {
            if (pending.kind === 'reunion_evaluateurs') _loadReunionEvalTab(pending.evalId);
            else if (pending.kind === 'reunion_prestataire') _loadReunionPrestTab(pending.evalId, pending.prestataireId);
            window._evalPendingLoader = null;
        }, 0);
    }
}

async function _loadReunionEvalTab(evalId) {
    const target = document.getElementById('reunionEvalContent');
    if (!target) return;
    // Cancellation token: only the LATEST loader writes to the DOM
    const myGen = (window._reunionEvalGen = (window._reunionEvalGen || 0) + 1);
    try {
        const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
        // When eval is locked (cloturee / rejetee / valide), all editing is disabled in this tab
        const isLocked = !!ev && ['valide', 'cloturee', 'rejetee'].includes(ev.statut);
        const rows = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
        const allMeetings = rows || [];
        const today = oasisJour();
        const escVal = s => String(s || '').replace(/"/g, '&quot;');
        const escTxt = oasisEsc;

        // 1 consolidation per meeting record (no cross-meeting aggregation)
        // Used by the consolidation section header to know if at least 1 meeting exists (for re-submit button)
        const cur = { id: allMeetings.length ? '_multi_' : '', __anyMeeting: allMeetings.length > 0 };

        // ── Active consolidation snapshot (in localStorage) ──
        const snapKey = 'pr_consol_' + evalId;
        let snap = null;
        try { snap = JSON.parse(localStorage.getItem(snapKey) || 'null'); } catch (e) {}
        const currentChanges = snap ? _computeConsolidationChanges(ev, snap) : [];

        // ── Section "Consolidation des évaluations" — round actif uniquement (attaché au prochain compte-rendu) ──
        const consolHtml = `<details open style="border:1px solid var(--border);border-radius:6px;margin-bottom:1rem;background:var(--bg-card);">
            <summary style="cursor:pointer;padding:0.6rem 0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;list-style:none;">
                <strong style="font-size:0.95rem;">Consolidation des évaluations${isLocked ? ' — lecture seule' : ''}</strong>
                ${isLocked
                    ? ''
                    : (snap
                        ? `<span class="badge badge-warning" style="padding:2px 10px;">${t('consolidation_active')}</span>`
                        : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();startConsolidation('${evalId}')">${t('refresh_consolidation')}</button>`)}
            </summary>
            <div style="padding:0 0.75rem 0.75rem;">
                ${snap
                    ? (currentChanges.length
                        ? _renderConsolidationTable([], currentChanges, 0)
                        : `<div style="color:var(--text-muted);font-size:0.8rem;font-style:italic;">${t('no_change_since_start')}</div>`)
                    : '<div style="color:var(--text-muted);font-size:0.8rem;">Cliquez pour permettre la modification des notes. Une consolidation indépendante est rattachée à chaque compte-rendu de réunion enregistré.</div>'}
            </div>
        </details>`;

        // ── Section "Comptes-rendus de la consolidation" — chaque carte = 1 réunion + sa consolidation + export PDF ──
        const meetingsListHtml = allMeetings.length ? allMeetings.map(m => {
            const nb = Array.isArray(m.participants) ? m.participants.length : 0;
            const mChanges = (m.consolidation_data && Array.isArray(m.consolidation_data.cumulative_changes))
                ? m.consolidation_data.cumulative_changes : [];
            // Bandeau compact : date + compteurs ; le détail (compte-rendu,
            // ordre du jour, consolidation) est replié par défaut.
            return `<details class="cr-item">
                <summary class="cr-summary">
                    <span class="cr-chevron">${ICONS.chevron}</span>
                    <span class="cr-date">${escTxt(m.date || '(sans date)')}</span>
                    <span class="cr-tags">
                        <span class="cr-tag">${nb} participant${nb > 1 ? 's' : ''}</span>
                        ${mChanges.length ? `<span class="cr-tag cr-tag-accent">${mChanges.length} changement${mChanges.length > 1 ? 's' : ''}</span>` : ''}
                    </span>
                    <span class="cr-actions">
                        ${isLocked ? '' : `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();event.preventDefault();reunionEvalEditInline('${evalId}','${m.id}')">${t('edit')}</button>`}
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();exportReunionPdf('${m.id}','${evalId}')">${ICONS.download} Exporter PDF</button>
                    </span>
                </summary>
                <div class="cr-body">
                    ${m.ordre_du_jour ? `<div class="cr-block"><span class="cr-label">${t('agenda')}</span><div class="cr-text">${escTxt(m.ordre_du_jour)}</div></div>` : ''}
                    ${Array.isArray(m.participants) && m.participants.length ? `<div class="cr-block"><span class="cr-label">Participants</span><div class="cr-text">${escTxt(m.participants.join(', '))}</div></div>` : ''}
                    <div class="cr-block"><span class="cr-label">Compte rendu</span><div class="cr-text">${m.compte_rendu ? escTxt(m.compte_rendu) : `<em style="color:var(--text-muted);">${t('no_minutes')}</em>`}</div></div>
                    ${mChanges.length ? `<div class="cr-block"><span class="cr-label">${t('linked_consolidation')}</span>${_renderConsolidationTable(mChanges, [], 0)}</div>` : ''}
                </div>
            </details>`;
        }).join('') : `<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">${t('no_meeting')}</div>`;

        const showResubmit = (cur.__anyMeeting && ev && ev.statut !== 'valide' && ev.statut !== 'rejetee' && !isLocked);
        const formHtml = `<details open style="border:1px solid var(--border);border-radius:6px;margin-bottom:0.75rem;background:var(--bg-card);">
            <summary style="cursor:pointer;padding:0.6rem 0.75rem;font-weight:700;font-size:0.95rem;list-style:none;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <span>Comptes-rendus de la consolidation${allMeetings.length ? ' (' + allMeetings.length + ')' : ''}${isLocked ? ' — lecture seule' : ''}</span>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                    ${isLocked ? '' : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();reunionEvalEditInline('${evalId}','')">${t('new_meeting_btn')}</button>`}
                    ${showResubmit ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();soumettreDirecteur('${evalId}')">${ICON_SUBMIT} Soumettre à la Validation</button>` : ''}
                </div>
            </summary>
            <div id="reunionEvalListInner" style="padding:0 1rem 0.75rem;">
                ${meetingsListHtml}
            </div>
        </details>`;

        // Stale loader guard: only the latest call writes
        if (myGen !== window._reunionEvalGen) return;
        const liveTarget = document.getElementById('reunionEvalContent');
        if (!liveTarget) return;
        // Order requested: Compte-rendu first, then Consolidation des évaluations
        liveTarget.innerHTML = formHtml + consolHtml;
    } catch (e) {
        if (myGen !== window._reunionEvalGen) return;
        const liveTarget = document.getElementById('reunionEvalContent');
        if (liveTarget) liveTarget.innerHTML = `<div style="color:#dc2626;">Erreur : ${e.message}</div>`;
    }
}

// Compute changes between snapshot and current notes (Phase 5 consolidation, §4.2.2.e)
function _computeConsolidationChanges(ev, snap) {
    const D = APP_STATE.data;
    const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const changes = [];
    sas.forEach(sa => {
        confInds.forEach(ind => {
            const key = `${sa.id}_${ind.id}`;
            const oldN = snap.notes_conf?.[key] || 0;
            const newN = ev.notes_conf?.[key] || 0;
            if (oldN !== newN) changes.push({ sa_code: sa.code, sa_nom: sa.nom, type: 'Conformité', ind_code: ind.code, ind_label: ind.label, old: oldN, new: newN });
        });
    });
    perfInds.forEach(ind => {
        const oldN = snap.notes_perf?.[ind.id] || 0;
        const newN = ev.notes_perf?.[ind.id] || 0;
        if (oldN !== newN) changes.push({ sa_code: '—', sa_nom: '(global)', type: 'Performance', ind_code: ind.code, ind_label: ind.label, old: oldN, new: newN });
    });
    sas.forEach(sa => {
        const compInds = allCompInds.filter(i => i.sous_activite_id === sa.id);
        compInds.forEach(ind => {
            const oldN = snap.notes_comp?.[ind.id] || 0;
            const newN = ev.notes_comp?.[ind.id] || 0;
            if (oldN !== newN) changes.push({ sa_code: sa.code, sa_nom: sa.nom, type: 'Complexité', ind_code: ind.code, ind_label: ind.label, old: oldN, new: newN });
        });
    });
    return changes;
}

function _renderConsolidationTable(cumulative, currentChanges, roundsCount) {
    cumulative = Array.isArray(cumulative) ? cumulative : [];
    currentChanges = Array.isArray(currentChanges) ? currentChanges : [];
    if (!cumulative.length && !currentChanges.length) {
        return `<div style="color:var(--text-muted);font-size:0.8rem;font-style:italic;">${t('no_score_change')}</div>`;
    }
    const esc = oasisEsc;
    // Tag the current (in-progress) changes with the next round index
    const nextRound = (roundsCount || 0) + 1;
    const inProgress = currentChanges.map(c => ({ ...c, round: nextRound, in_progress: true }));
    const all = [...cumulative, ...inProgress];
    // Group by SA + type
    const groups = {};
    all.forEach(c => {
        const k = (c.sa_code || '—') + ' :: ' + c.type;
        if (!groups[k]) groups[k] = { sa_code: c.sa_code, sa_nom: c.sa_nom, type: c.type, items: [] };
        groups[k].items.push(c);
    });
    const rowsHtml = Object.values(groups).map(g => {
        const head = `<tr style="background:var(--bg);"><td colspan="5" style="font-weight:700;padding:4px 8px;font-size:0.82rem;">${esc(g.sa_code)} — ${esc(g.sa_nom)} · ${esc(g.type)}</td></tr>`;
        const rows = g.items.map(c => {
            const roundBadge = c.in_progress
                ? `<span style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 5px;font-size:0.7rem;">R${c.round || '?'} en cours</span>`
                : `<span style="background:var(--bg);color:var(--text-muted);border-radius:3px;padding:0 5px;font-size:0.7rem;">R${c.round || '?'}</span>`;
            return `<tr><td style="padding:4px 8px;">${roundBadge}</td>
                 <td style="padding:4px 8px;font-family:monospace;font-size:0.78rem;">${esc(c.ind_code)}</td>
                 <td style="padding:4px 8px;font-size:0.82rem;">${esc(c.ind_label)}</td>
                 <td style="padding:4px 8px;text-align:center;color:var(--text-muted);">${c.old || '-'}</td>
                 <td style="padding:4px 8px;text-align:center;font-weight:700;color:#059669;">${c.new || '-'}</td></tr>`;
        }).join('');
        return head + rows;
    }).join('');
    return `<div style="margin-top:0.5rem;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;border:1px solid var(--border);">
            <thead><tr style="background:var(--bg);">
                <th style="padding:5px 8px;text-align:left;font-size:0.78rem;">Round</th>
                <th style="padding:5px 8px;text-align:left;font-size:0.78rem;">${t('ref_short')}</th>
                <th style="padding:5px 8px;text-align:left;font-size:0.78rem;">${t('label')}</th>
                <th style="padding:5px 8px;text-align:center;font-size:0.78rem;">Ancienne</th>
                <th style="padding:5px 8px;text-align:center;font-size:0.78rem;">${t('new_f')}</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:0.4rem;font-size:0.75rem;color:var(--text-muted);">
            Total : ${cumulative.length} changement(s) consolidé(s)${inProgress.length ? ` + ${inProgress.length} en cours (round ${nextRound})` : ''}.
            Les changements précédents sont conservés à chaque round.
        </div>
    </div>`;
}

async function startConsolidation(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    if (!await oasisConfirmer(t('confirmer_consolidation'))) return;
    const snap = {
        notes_conf: { ...(ev.notes_conf || {}) },
        notes_perf: { ...(ev.notes_perf || {}) },
        notes_comp: { ...(ev.notes_comp || {}) },
        started_at: new Date().toISOString()
    };
    try {
        localStorage.setItem('pr_consol_' + evalId, JSON.stringify(snap));
        // Release any previous post-save lock so indicators can be edited during this round
        localStorage.removeItem('pr_consol_locked_' + evalId);
    } catch (e) {}
    // Re-render the slicer so isReadonly is recomputed (indicators become editable)
    openEvalDetail(evalId);
    showToast(t('consolidation_on'));
}

// Phase 5 — réunion prestataire : single record, form intégré directement (§4.2.2.g)
async function _loadReunionPrestTab(evalId, prestId) {
    const target = document.getElementById('reunionPrestContent');
    if (!target) return;
    // Cancellation token: only the LATEST loader writes to the DOM
    const myGen = (window._reunionPrestGen = (window._reunionPrestGen || 0) + 1);
    try {
        const rows = await api(`${MODULE_API}/eval-reunions-prest?eval_id=${evalId}`);
        if (myGen !== window._reunionPrestGen) return;
        const cur = (rows && rows[0]) || { eval_id: evalId, prestataire_id: prestId };
        const today = oasisJour();
        const escVal = s => String(s || '').replace(/"/g, '&quot;');
        const escTxt = oasisEsc;
        const evNow = APP_STATE.data.evaluations.find(e => e.id === evalId);
        // Lock all form fields and hide write buttons when eval reached a terminal/locked state
        const isLocked = !!evNow && ['valide', 'cloturee', 'rejetee'].includes(evNow.statut);
        const ro = isLocked ? 'readonly' : '';
        const dis = isLocked ? 'disabled' : '';
        const liveTarget = document.getElementById('reunionPrestContent');
        if (!liveTarget) return;
        liveTarget.innerHTML = `
            <div style="border:1px solid var(--border);border-radius:6px;padding:0.6rem 1rem 0.75rem;background:var(--bg-card);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
                    <span style="font-weight:700;font-size:0.95rem;">Compte-rendu de la réunion prestataire${cur.id ? ' (existant)' : ' (nouveau)'}${isLocked ? ' — lecture seule' : ''}</span>
                    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                        ${isLocked ? '' : `<button class="btn btn-primary" onclick="reunionPrestSaveFromTab('${evalId}','${prestId}')" style="padding:0.28rem 0.85rem;font-size:0.82rem;">${ICONS.check} ${cur.id ? 'Mettre à jour' : 'Enregistrer'}</button>`}
                        ${cur.id ? `<button class="btn btn-outline btn-sm" onclick="exportReunionPrestPdf('${cur.id}','${evalId}')">${ICONS.download} Exporter PDF</button>` : ''}
                        ${(evNow?.statut === 'acceptee') ? `<button class="btn btn-success" onclick="decisionDirecteur('${evalId}','cloturer')" style="padding:0.28rem 0.85rem;font-size:0.82rem;">${t('close_meeting_btn')}</button>` : ''}
                    </div>
                </div>
                <input type="hidden" id="rpId" value="${escVal(cur.id || '')}">
                <!-- Row 1: Date 1/5 width -->
                <div class="form-group" style="max-width:20%;min-width:160px;"><label>${t('meeting_date')}</label>
                    <input type="date" id="rpDate" value="${escVal(cur.date || today)}" style="width:100%;" ${ro}></div>
                <!-- Row 2: Participants AAC + Participants prestataire (2 columns) -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                    <div class="form-group"><label>${t('participants_caa')}</label>
                        <textarea id="rpAac" rows="3" style="width:100%;" ${ro}>${escTxt((cur.participants_aac || []).join('\n'))}</textarea></div>
                    <div class="form-group"><label>${t('participants_provider')}</label>
                        <textarea id="rpPrest" rows="3" style="width:100%;" ${ro}>${escTxt((cur.participants_prestataire || []).join('\n'))}</textarea></div>
                </div>
                <!-- Row 3: Résumé des échanges (full width) -->
                <div class="form-group"><label>${t('exchanges_summary')}</label>
                    <textarea id="rpResume" rows="4" style="width:100%;" ${ro}>${escTxt(cur.resume_echanges || '')}</textarea></div>
                <!-- Row 4: Recommandations (full width) -->
                <div class="form-group"><label>Recommandations</label>
                    <textarea id="rpReco" rows="3" style="width:100%;" ${ro}>${escTxt(cur.recommandations || '')}</textarea></div>
                <!-- Row 5: Signature prestataire + Signature AAC -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                    <div class="form-group"><label>${t('signature_provider')}</label>
                        <input id="rpSigPrest" value="${escVal(cur.signature_prestataire || '')}" ${ro}></div>
                    <div class="form-group"><label>${t('signature_caa')}</label>
                        <input id="rpSigAac" value="${escVal(cur.signature_aac || '')}" ${ro}></div>
                </div>
            </div>`;
    } catch (e) {
        if (myGen !== window._reunionPrestGen) return;
        const liveTarget = document.getElementById('reunionPrestContent');
        if (liveTarget) liveTarget.innerHTML = `<div style="color:#dc2626;">Erreur : ${e.message}</div>`;
    }
}

// Switch between inner tabs in eval detail slicer
function switchEvalTab(evalId, tab) {
    // Preserve any unsaved Généralités field values + designated evaluators into local state before re-render
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (ev) {
        if (!ev.generalites || typeof ev.generalites !== 'object') ev.generalites = {};
        document.querySelectorAll('textarea.eval-gen-field').forEach(ta => {
            const key = ta.dataset.key;
            if (key) ev.generalites[key] = ta.value;
        });
        const cbs = document.querySelectorAll('input.eval-designe-cb');
        if (cbs.length) {
            ev.evaluateurs_designes = Array.from(cbs).filter(c => c.checked).map(c => c.dataset.uid);
        }
        const nbMinInput = document.getElementById('evalNbMin');
        if (nbMinInput) {
            const v = parseInt(nbMinInput.value, 10);
            ev.nb_evaluateurs_min = Number.isFinite(v) && v >= 0 ? v : 0;
        }
    }
    window._evalDetailTab = tab;
    openEvalDetail(evalId);
}

// Reveal an inline comment textarea below an indicator (replaces the "Ajouter un commentaire" button)
function _inlineCommentReveal(rowId, slot, key) {
    const el = document.getElementById(rowId);
    if (!el) return;
    el.innerHTML = `<textarea class="eval-indicator-comment" data-slot="${slot}" data-key="${key}" rows="2" placeholder="Commentaire..."
        style="width:100%;padding:0.4rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.85rem;font-family:inherit;line-height:1.4;min-height:2.8rem;resize:vertical;"></textarea>`;
    const ta = el.querySelector('textarea');
    if (ta) ta.focus();
}

function setScore(evalId, field, key, value, writeMode) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const userId = APP_STATE.user?.id || '';
    let target;
    if (writeMode === 'evaluator_draft') {
        // Per-evaluator PRIVATE draft (Brouillon) — not visible to validator/admin
        if (!ev.notes_per_evaluator_draft || typeof ev.notes_per_evaluator_draft !== 'object') ev.notes_per_evaluator_draft = {};
        const slot = (field === 'notes_perf') ? 'perf' : (field === 'notes_comp' ? 'comp' : null);
        if (!slot) return;
        if (!ev.notes_per_evaluator_draft[slot]) ev.notes_per_evaluator_draft[slot] = {};
        if (!ev.notes_per_evaluator_draft[slot][userId]) ev.notes_per_evaluator_draft[slot][userId] = {};
        target = ev.notes_per_evaluator_draft[slot][userId];
    } else if (writeMode === 'evaluator') {
        // Per-evaluator published slot (Perf/Comp non-validator) — visible to validator
        if (!ev.notes_per_evaluator || typeof ev.notes_per_evaluator !== 'object') ev.notes_per_evaluator = {};
        const slot = (field === 'notes_perf') ? 'perf' : (field === 'notes_comp' ? 'comp' : null);
        if (!slot) return;
        if (!ev.notes_per_evaluator[slot]) ev.notes_per_evaluator[slot] = {};
        if (!ev.notes_per_evaluator[slot][userId]) ev.notes_per_evaluator[slot][userId] = {};
        target = ev.notes_per_evaluator[slot][userId];
    } else {
        // Final notes (validator picks, or Conformity single-track)
        if (!ev[field]) ev[field] = {};
        target = ev[field];
    }
    const current = target[key] || 0;
    const newValue = (current === value) ? 0 : value;
    if (newValue === 0) delete target[key]; else target[key] = newValue;
    // Update the score buttons visually
    const btnGroup = event.target.parentElement;
    btnGroup.querySelectorAll('.score-btn').forEach(b => { b.className = 'score-btn'; });
    if (newValue !== 0) event.target.className = `score-btn active-${newValue}`;
    // Live update of totals + taux + indices (only meaningful when final notes change)
    refreshEvalTotals(evalId);
}

function refreshEvalTotals(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const D = APP_STATE.data;
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const indices = D.indices || {};

    // ── Sums ──
    const _srcPerf = evalNotesSource(ev, 'perf');
    const _srcComp = evalNotesSource(ev, 'comp');
    const sumConf = sas.reduce((s, sa) => s + confInds.reduce((s2, ind) => s2 + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0), 0);
    const sumPerf = perfInds.reduce((s, ind) => s + (_srcPerf[ind.id] || 0), 0);
    const sumComp = allCompInds.reduce((s, ind) => s + (_srcComp[ind.id] || 0), 0);
    const confCount = Object.keys(ev.notes_conf || {}).filter(k => ev.notes_conf[k] > 0).length;
    const perfCount = Object.keys(_srcPerf).filter(k => _srcPerf[k] > 0).length;
    const compCount = Object.keys(_srcComp).filter(k => _srcComp[k] > 0).length;

    // ── Taux & indices (live) ──
    const tauxConf = (typeof calculateTauxConfGlobal === 'function')
        ? calculateTauxConfGlobal(ev.notes_conf || {}, confInds, sas)
        : (sumConf / Math.max(1, confInds.length * sas.length * 3));
    const tauxPerf = (typeof calculateTaux === 'function')
        ? calculateTaux(ev.notes_perf || {}, perfInds)
        : (sumPerf / Math.max(1, perfInds.length * 3));
    const tauxComp = (typeof calculateTauxCompGlobal === 'function')
        ? calculateTauxCompGlobal(ev.notes_comp || {}, allCompInds)
        : (sumComp / Math.max(1, allCompInds.length * 3));
    const idcG = (typeof getIndice3Levels === 'function') ? getIndice3Levels(tauxConf, indices.conf1 || 0.8, indices.conf2 || 0.5) : '-';
    const idpG = (typeof getIndice3Levels === 'function') ? getIndice3Levels(tauxPerf, indices.perf1 || 0.8, indices.perf2 || 0.5) : '-';
    const ideG = (typeof getIndice3Levels === 'function') ? getIndice3Levels(tauxComp, indices.expo1 || 0.8, indices.expo2 || 0.5) : '-';
    const fmtPct = v => (v ? (v * 100).toFixed(1) + '%' : '-');

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    // Global bandeaux
    set('evalSumConf', sumConf); set('evalSumPerf', sumPerf); set('evalSumComp', sumComp);
    set('evalCntConf', confCount); set('evalCntPerf', perfCount); set('evalCntComp', compCount);
    set('evalTauxConf', fmtPct(tauxConf)); set('evalTauxPerf', fmtPct(tauxPerf)); set('evalTauxComp', fmtPct(tauxComp));
    set('evalIdcG', idcG || '-'); set('evalIdpG', idpG || '-'); set('evalIdeG', ideG || '-');

    // Per-secteur Performance bandeau (single accordion per eval)
    {
        const _perfSrc = evalNotesSource(ev, 'perf');
        const saPerfSum = perfInds.reduce((s, ind) => s + (_perfSrc[ind.id] || 0), 0);
        const saTauxPerf = (typeof calculateTaux === 'function') ? calculateTaux(_perfSrc, perfInds) : (saPerfSum / Math.max(1, perfInds.length * 3));
        const saIdp = (typeof getIndice3Levels === 'function' && saPerfSum > 0) ? getIndice3Levels(saTauxPerf, indices.perf1 || 0.8, indices.perf2 || 0.5) : '-';
        const sectId = ev.secteur_id;
        set(`evalSaSum_perf_${sectId}`, saPerfSum);
        set(`evalSaTaux_perf_${sectId}`, fmtPct(saTauxPerf));
        set(`evalSaIdp_${sectId}`, saIdp || '-');
    }
    // Per-SA bandeaux
    sas.forEach(sa => {
        // Conformity
        const saConfSum = confInds.reduce((s, ind) => s + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0);
        const saTauxConf = (typeof calculateTaux === 'function') ? calculateTaux(ev.notes_conf || {}, confInds, sa.id) : (saConfSum / Math.max(1, confInds.length * 3));
        const saIdc = (typeof getIndice3Levels === 'function') ? getIndice3Levels(saTauxConf, indices.conf1 || 0.8, indices.conf2 || 0.5) : '-';
        set(`evalSaSum_conf_${sa.id}`, saConfSum);
        set(`evalSaTaux_conf_${sa.id}`, fmtPct(saTauxConf));
        set(`evalSaIdc_${sa.id}`, saIdc || '-');
        // Complexity — in draft mode, use the current evaluator's draft notes
        const saCompInds = allCompInds.filter(i => i.sous_activite_id === sa.id);
        const _compSrc = evalNotesSource(ev, 'comp');
        const saCompSum = saCompInds.reduce((s, ind) => s + (_compSrc[ind.id] || 0), 0);
        const saTauxComp = (typeof calculateTaux === 'function') ? calculateTaux(_compSrc, saCompInds) : (saCompSum / Math.max(1, saCompInds.length * 3));
        const saIde = (typeof getIndice3Levels === 'function' && saCompSum > 0) ? getIndice3Levels(saTauxComp, indices.expo1 || 0.8, indices.expo2 || 0.5) : '-';
        set(`evalSaSum_comp_${sa.id}`, saCompSum);
        set(`evalSaTaux_comp_${sa.id}`, fmtPct(saTauxComp));
        set(`evalSaIde_${sa.id}`, saIde || '-');
    });
}

async function saveEvalScores(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const D = APP_STATE.data;
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id);
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const indices = D.indices || {};
    const csn = parseInt(sect?.csn || 24);

    const resultats = { global: {}, sousActivites: {} };
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);

    // §4.2.2.d — for non-validator designated evaluators, all Perf+Comp indicators must be scored before save.
    // Skip this check during soumis_directeur (form is in comments-only mode at that stage).
    const _isVal = prCanValidate(ev.secteur_id);
    // Brouillon mode: designated non-validator saves their private draft — no completeness requirement.
    // (Validator/Administrateur still goes through its own publication flow elsewhere.)

    // ── Per Sub-Activity calculations ──
    // Performance taux is global (same for all SA)
    const tauxPerf = calculateTaux(ev.notes_perf || {}, perfInds);
    const idp_g_temp = getIndice3Levels(tauxPerf, indices.perf1 || 0.8, indices.perf2 || 0.5);

    let hasIncoherent = false;

    sas.forEach(sa => {
        // 1. IDC_s: conformity index per SA
        const tauxConf = calculateTaux(ev.notes_conf || {}, confInds, sa.id);
        const idc_s = getIndice3Levels(tauxConf, indices.conf1 || 0.8, indices.conf2 || 0.5);

        // Note: IDP is global only, but we use it at SA level for security index
        const idp_s = idp_g_temp;

        // 4. IDE_s: complexity index per SA
        const compInds = (D.indComplex || []).filter(i => i.sous_activite_id === sa.id && i.actif !== false);
        const tauxComp = calculateTaux(ev.notes_comp || {}, compInds);
        const ide_s = getIndice3Levels(tauxComp, indices.expo1 || 0.8, indices.expo2 || 0.5);

        // 6a. IDS_s: security index per SA (lowercase a,b,c,d)
        const ids_s = getSecurityIndex(idc_s, idp_s, false);
        if (ids_s.isIncoherent) hasIncoherent = true;

        // 7a. SA risk index (lowercase): ide_s + ids_s → e.g. "2b"
        const saRisk = getRiskIndex(ide_s, ids_s.val, false);

        // 9. Frequency: based on SA risk index
        const freq = saRisk.freq || 1;

        resultats.sousActivites[sa.id] = {
            idc_s, idp_s: idp_s, ide_s,
            ids_s: ids_s.val,  // lowercase: a,b,c,d or Incohérant
            ids_desc: ids_s.desc,
            risk: saRisk.label,   // e.g. "2b"
            risk_desc: saRisk.risk,
            freq,
            tauxConf, tauxPerf, tauxComp
        };
    });

    // ── Global calculations ──

    // 2. IDC_g: global conformity = sum ALL conf notes / (nb_conf_inds * nb_SA * 3)
    const globalConfTaux = calculateTauxConfGlobal(ev.notes_conf || {}, confInds, sas);
    const idc_g = getIndice3Levels(globalConfTaux, indices.conf1 || 0.8, indices.conf2 || 0.5);

    // 3. IDP_g: global performance
    const idp_g = idp_g_temp;

    // 5. IDE_g: global complexity = sum ALL comp notes / (nb_total_comp_inds * 3)
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false &&
        sas.some(sa => sa.id === i.sous_activite_id));
    const globalCompTaux = calculateTauxCompGlobal(ev.notes_comp || {}, allCompInds);
    const ide_g = getIndice3Levels(globalCompTaux, indices.expo1 || 0.8, indices.expo2 || 0.5);

    // 6b. IDS_g: global security index (uppercase A,B,C,D)
    const ids_g = getSecurityIndex(idc_g, idp_g, true);
    if (ids_g.isIncoherent) hasIncoherent = true;

    // 7b. Global risk index (uppercase): ide_g + ids_g → e.g. "2B"
    const globalRisk = getRiskIndex(ide_g, ids_g.val, true);

    // 8. Surveillance cycle CSRBO = CSn * csnMod
    const csrbo = Math.round(csn * (globalRisk.csnMod || 1));

    resultats.global = {
        idc_g, idp_g, ide_g,
        ids_g: ids_g.val,     // uppercase: A,B,C,D or Incohérant
        ids_desc: ids_g.desc,
        tauxConf: globalConfTaux,
        tauxPerf,
        tauxComp: globalCompTaux,
        globalRisk: {
            risk: globalRisk.risk,
            label: globalRisk.label,    // e.g. "2B"
            csnMod: globalRisk.csnMod,
            freq: globalRisk.freq,
            intensity: globalRisk.intensity
        },
        csrbo,  // Cycle de surveillance en mois
        csn
    };

    // Capture Généralités fields if the tab is currently rendered
    const generalites = ev.generalites && typeof ev.generalites === 'object' ? { ...ev.generalites } : {};
    document.querySelectorAll('textarea.eval-gen-field').forEach(ta => {
        const key = ta.dataset.key;
        if (key) generalites[key] = ta.value;
    });
    ev.generalites = generalites;

    // Capture designated-evaluators selection if the validator UI is rendered
    const cbs = document.querySelectorAll('input.eval-designe-cb');
    if (cbs.length) {
        ev.evaluateurs_designes = Array.from(cbs).filter(c => c.checked).map(c => c.dataset.uid);
    }
    // Capture minimum-evaluators-required field if the validator UI is rendered
    const nbMinInput = document.getElementById('evalNbMin');
    if (nbMinInput) {
        const v = parseInt(nbMinInput.value, 10);
        ev.nb_evaluateurs_min = Number.isFinite(v) && v >= 0 ? v : 0;
    }

    // Capture per-indicator comments from any open Conformité/Performance/Complexité tab
    if (!ev.commentaires_indicateurs || typeof ev.commentaires_indicateurs !== 'object') ev.commentaires_indicateurs = {};
    document.querySelectorAll('textarea.eval-indicator-comment').forEach(ta => {
        const slot = ta.dataset.slot;
        const key = ta.dataset.key;
        const val = (ta.value || '').trim();
        if (!ev.commentaires_indicateurs[slot]) ev.commentaires_indicateurs[slot] = {};
        if (val) ev.commentaires_indicateurs[slot][key] = val;
        else delete ev.commentaires_indicateurs[slot][key];
    });

    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT',
            body: JSON.stringify({
                notes_conf: ev.notes_conf, notes_perf: ev.notes_perf,
                notes_comp: ev.notes_comp, resultats, generalites,
                evaluateurs_designes: ev.evaluateurs_designes || [],
                notes_per_evaluator: ev.notes_per_evaluator || {},
                notes_per_evaluator_draft: ev.notes_per_evaluator_draft || {},
                nb_evaluateurs_min: ev.nb_evaluateurs_min !== undefined ? ev.nb_evaluateurs_min : 3,
                commentaires_indicateurs: ev.commentaires_indicateurs || {}
            })
        });
        // Reload data in the background but keep the slicer open. Preserve the
        // current scroll inside the slicer body across the re-render.
        const slicerBody = document.querySelector('.pr-slicer-body');
        const savedScroll = slicerBody ? slicerBody.scrollTop : 0;
        await loadAllData();
        renderPage();
        // Re-open the eval detail (refreshes synthesis/indices) without closing.
        openEvalDetail(evalId);
        const newSlicerBody = document.querySelector('.pr-slicer-body');
        if (newSlicerBody) newSlicerBody.scrollTop = savedScroll;
        showToast(t('draft_saved'));
        if (hasIncoherent) {
            showToast(t('incoherent_msg'), 'error');
        }
    } catch (e) { showToast(e.message, 'error'); }
}




// ── Phase 3 — Réunions des évaluateurs (Chap. 4 §4.2.2.e) ──
async function openReunionEvaluateursList(evalId) {
    // Sans cette garde, un échec de chargement faisait afficher « aucune
    // réunion » : l'écran affirmait qu'il n'y en avait pas, au lieu de dire
    // qu'il n'avait pas pu le savoir.
    let rows = [];
    try { rows = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`); }
    catch (e) { showToast(t('chargement_impossible', e.message), 'error'); return; }
    const list = rows.length ? rows.map(r => `
        <div style="border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.4rem;">
            <div style="display:flex;justify-content:space-between;font-weight:600;font-size:0.88rem;">
                <span>📅 ${r.date || '(sans date)'}</span>
                <button class="btn btn-outline btn-sm" onclick="openReunionEvaluateursForm('${evalId}','${r.id}')">${t('edit')}</button>
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">Participants : ${(r.participants || []).length}</div>
            ${r.compte_rendu ? `<div style="font-size:0.82rem;margin-top:0.3rem;white-space:pre-wrap;">${_genEsc(r.compte_rendu)}</div>` : ''}
        </div>`).join('') : `<div class="text-muted" style="padding:1rem;text-align:center;">${t('no_meeting')}</div>`;
    const body = `${list}
        <hr style="margin:1rem 0;">
        <button class="btn btn-primary" onclick="openReunionEvaluateursForm('${evalId}','')">${t('new_meeting_btn')}</button>`;
    const footer = `<button class="btn btn-outline" onclick="closeModal()">${t('close_btn')}</button>`;
    showModal(`Réunions des évaluateurs (§4.2.2.e)`, body, footer, 'modal-lg');
}

async function openReunionEvaluateursForm(evalId, rid) {
    let cur = { eval_id: evalId };
    if (rid) {
        try {
            const all = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
            cur = all.find(r => r.id === rid) || cur;
        } catch (e) {
            // Ouvrir le formulaire vide sur une réunion qu'on n'a pas su lire,
            // c'est offrir de l'écraser par des champs blancs.
            showToast(t('chargement_impossible', e.message), 'error');
            return;
        }
    }
    const today = oasisJour();
    const body = `
        <div class="form-group"><label>${t('date')}</label><input type="date" id="reDate" value="${cur.date || today}"></div>
        <div class="form-group"><label>${t('participants_one_per_line')}</label>
            <textarea id="reParts" rows="3" style="width:100%;">${(cur.participants || []).join('\n')}</textarea></div>
        <div class="form-group"><label>${t('agenda')}</label>
            <textarea id="reOdj" rows="2" style="width:100%;">${cur.ordre_du_jour || ''}</textarea></div>
        <div class="form-group"><label>Compte rendu</label>
            <textarea id="reCr" rows="5" style="width:100%;">${cur.compte_rendu || ''}</textarea></div>`;
    const footer = `
        <button class="btn btn-outline" onclick="openReunionEvaluateursList('${evalId}')">${t('back_arrow')}</button>
        <button class="btn btn-primary" onclick="saveReunionEval('${evalId}','${rid || ''}')">${ICONS.check} Enregistrer</button>`;
    showModal(`Réunion évaluateurs`, body, footer, 'modal-lg');
}

async function saveReunionEval(evalId, rid) {
    const data = {
        eval_id: evalId,
        date: document.getElementById('reDate').value,
        participants: document.getElementById('reParts').value.split('\n').map(s => s.trim()).filter(Boolean),
        ordre_du_jour: document.getElementById('reOdj').value,
        compte_rendu: document.getElementById('reCr').value
    };
    try {
        if (rid) await api(`${MODULE_API}/eval-reunions/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions`, { method: 'POST', body: JSON.stringify(data) });
        closeModal();
        showToast(t('meeting_saved'));
    } catch (e) { showToast(e.message, 'error'); }
}


// Compte-rendu de réunion en PDF. Aucun endpoint serveur ne génère de PDF :
// le document est composé ici puis remis à la fenêtre d'impression du
// navigateur (« Enregistrer au format PDF »), comme le rapport d'évaluation.
async function exportReunionPdf(rid, evalId) {
    try {
        const m = await api(`${MODULE_API}/eval-reunions/${rid}`);
        _printCompteRendu(m, evalId || m.eval_id, 'Compte-rendu de réunion de consolidation');
    } catch (e) { showToast(t('export_failed', e.message), 'error'); }
}

async function exportReunionPrestPdf(rid, evalId) {
    try {
        const m = await api(`${MODULE_API}/eval-reunions-prest/${rid}`);
        _printCompteRendu(m, evalId || m.eval_id, 'Compte-rendu de réunion prestataire');
    } catch (e) { showToast(t('export_failed', e.message), 'error'); }
}

function _printCompteRendu(m, evalId, titre) {
    if (!m || !m.id) { showToast(t('minutes_not_found'), 'error'); return; }
    const D = APP_STATE.data;
    const ev = (D.evaluations || []).find(e => e.id === evalId) || {};
    const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id) || {};
    const aac = D.aac || {};
    const esc = oasisEsc;
    const txt = s => (String(s == null ? '' : s).trim() ? esc(s).replace(/\n/g, '<br>') : '-');

    // Deux sortes de comptes-rendus passent ici, et elles ne portent pas les
    // mêmes champs : la réunion de consolidation a `participants`,
    // `ordre_du_jour` et `compte_rendu` ; la réunion prestataire a deux listes
    // de participants, un résumé des échanges et des recommandations. Composer
    // les uns avec les noms des autres rendait un document vide de sa substance
    // — en-tête, prestataire, secteur et date, et plus rien.
    const estPrestataire = !Array.isArray(m.participants)
        && (Array.isArray(m.participants_aac) || Array.isArray(m.participants_prestataire));
    const parts = estPrestataire
        ? [...(m.participants_aac || []).map(p => `AAC : ${p}`),
           ...(m.participants_prestataire || []).map(p => `Organisme : ${p}`)]
        : (Array.isArray(m.participants) ? m.participants : []);
    const sections = estPrestataire
        ? [[t('exchanges_summary'), m.resume_echanges], ['Recommandations', m.recommandations],
           [t('signature_caa'), m.signature_aac], [t('signature_provider'), m.signature_prestataire]]
        : [[t('agenda'), m.ordre_du_jour], ['Compte rendu', m.compte_rendu]];
    const changes = (m.consolidation_data && Array.isArray(m.consolidation_data.cumulative_changes))
        ? m.consolidation_data.cumulative_changes : [];
    const changesHtml = changes.length ? `
      <table class="rep-tbl">
        <thead><tr><th style="width:12%">S.A.</th><th style="width:12%">${t('ref_short')}</th><th style="width:34%">${t('label')}</th>
          <th style="width:14%">Axe</th><th style="width:14%">Ancienne</th><th style="width:14%">${t('new_f')}</th></tr></thead>
        <tbody>${changes.map(c => `<tr>
          <td>${esc(c.sa_code || '-')}</td><td>${esc(c.ind_code || '-')}</td><td>${esc(c.ind_label || '-')}</td>
          <td>${esc(c.type || '-')}</td><td>${esc(c.old || '-')}</td><td>${esc(c.new || '-')}</td></tr>`).join('')}
        </tbody>
      </table>` : `<div class="rep-field">${t('no_score_change_meeting')}</div>`;

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${esc(titre)} — ${esc(prest.nom || '')}</title>
<style>
  @page { size: A4; margin: 18mm 14mm 16mm; }
  body { font-family: Calibri, Arial, sans-serif; color: #111; font-size: 10.5pt; margin: 0; }
  .rep-runhead { text-align: center; font-size: 10pt; color: #222; padding-bottom: 6px; margin-bottom: 14px; }
  h1 { text-align: center; font-size: 16pt; font-weight: 400; color: #2f5496; margin: 6px 0 22px; }
  h2 { font-size: 12pt; font-weight: 400; color: #2f5496; margin: 18px 0 8px; }
  .rep-meta td { padding: 3px 0; vertical-align: top; font-size: 10.5pt; }
  .rep-meta td:first-child { width: 190px; }
  .rep-field { margin: 2px 0 12px; }
  .rep-list { margin: 4px 0 12px 26px; }
  .rep-tbl { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  .rep-tbl th { border: 1px solid #8ea9db; background: #d9e2f3; text-align: left;
                padding: 4px 7px; font-size: 8.5pt; font-weight: 400; }
  .rep-tbl td { border: 1px solid #8ea9db; padding: 4px 7px; font-size: 8.5pt; vertical-align: top; }
</style></head>
<body>
  <div class="rep-runhead">${esc(aac.nom || "Autorité de l'Aviation Civile")}</div>
  <h1>${esc(titre)}</h1>
  <table class="rep-meta">
    <tr><td>${t('provider_name_label')}</td><td>${esc(prest.nom || '-')}</td></tr>
    <tr><td>${t('sector_label')}</td><td>${esc(sect.code || '')} ${sect.nom ? '- ' + esc(sect.nom) : ''}</td></tr>
    <tr><td>${t('meeting_date_label')}</td><td>${esc(m.date || '-')}</td></tr>
    <tr><td>${t('eval_ref_label')}</td><td>eval_${esc(String(ev.id || '').slice(-4))}</td></tr>
  </table>
  <h2>Participants</h2>
  <div class="rep-list">${parts.length ? parts.map(p => '- ' + esc(p)).join('<br>') : '-'}</div>
  ${sections.map(([titreSection, valeur]) => `<h2>${esc(titreSection)}</h2>
  <div class="rep-field">${txt(valeur)}</div>`).join('')}
  ${estPrestataire ? '' : `<h2>${t('linked_consolidation')}</h2>
  ${changesHtml}`}
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) { showToast(t('allow_popups_pdf'), 'error'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
}

// Edit a meeting INLINE inside the Consolidation tab (replaces the list area)
async function reunionEvalEditInline(evalId, rid) {
    const inner = document.getElementById('reunionEvalListInner');
    if (!inner) return;
    let cur = { eval_id: evalId };
    if (rid) {
        try {
            const all = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
            cur = (all || []).find(r => r.id === rid) || cur;
        } catch (e) {
            showToast(t('chargement_impossible', e.message), 'error');
            return;
        }
    }
    const today = oasisJour();
    const escVal = s => String(s || '').replace(/"/g, '&quot;');
    const escTxt = oasisEsc;
    inner.innerHTML = `
        <div style="border:1px solid var(--border);border-radius:6px;padding:0.6rem 0.85rem;background:var(--bg-card);">
            <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.4rem;">${rid ? 'Modifier la réunion' : 'Nouvelle réunion'}</div>
            <input type="hidden" id="reId" value="${escVal(cur.id || '')}">
            <div class="form-group"><label>${t('date')}</label>
                <input type="date" id="reDate" value="${escVal(cur.date || today)}"></div>
            <div style="display:grid;grid-template-columns:1fr 4fr;gap:0.75rem;">
                <div class="form-group"><label>${t('participants_one_per_line')}</label>
                    <textarea id="reParts" rows="5" style="width:100%;">${escTxt((cur.participants || []).join('\n'))}</textarea></div>
                <div class="form-group"><label>Compte rendu</label>
                    <textarea id="reCr" rows="5" style="width:100%;">${escTxt(cur.compte_rendu || '')}</textarea></div>
            </div>
            <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                <button class="btn btn-outline" onclick="_loadReunionEvalTab('${evalId}')" style="padding:0.22rem 0.7rem;font-size:0.8rem;">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="reunionEvalSaveFromTab('${evalId}')" style="padding:0.22rem 0.7rem;font-size:0.8rem;">${ICONS.check} Enregistrer</button>
            </div>
        </div>`;
}

async function reunionEvalSaveFromTab(evalId) {
    const rid = document.getElementById('reId')?.value || '';
    const data = {
        eval_id: evalId,
        date: document.getElementById('reDate').value,
        participants: document.getElementById('reParts').value.split('\n').map(s => s.trim()).filter(Boolean),
        compte_rendu: document.getElementById('reCr').value
    };

    // Cumulative consolidation: append in-progress round to existing rounds (no overwrite)
    let existingCumulative = [];
    let roundsCount = 0;
    try {
        const existing = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
        const cur = (existing && existing[0]) || {};
        if (cur.consolidation_data) {
            existingCumulative = Array.isArray(cur.consolidation_data.cumulative_changes)
                ? cur.consolidation_data.cumulative_changes : [];
            roundsCount = cur.consolidation_data.rounds_count || 0;
        }
    } catch (e) {
        // Les tours déjà consolidés se cumulent : enregistrer sans les avoir
        // lus les effacerait.
        showToast(t('chargement_impossible', e.message), 'error');
        return;
    }

    const snapKey = 'pr_consol_' + evalId;
    const rawSnap = localStorage.getItem(snapKey);
    if (rawSnap) {
        try {
            const snap = JSON.parse(rawSnap);
            const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
            const newChanges = _computeConsolidationChanges(ev, snap);
            const finishedAt = new Date().toISOString();
            const newRound = roundsCount + 1;
            const enriched = newChanges.map(c => ({ ...c, round: newRound, finished_at: finishedAt }));
            data.consolidation_data = {
                cumulative_changes: [...existingCumulative, ...enriched],
                rounds_count: newRound,
                last_finished_at: finishedAt
            };
        } catch (e) { console.error(e); }
    } else if (existingCumulative.length || roundsCount) {
        // No active round but previous data exists → preserve as-is (don't overwrite)
        data.consolidation_data = {
            cumulative_changes: existingCumulative,
            rounds_count: roundsCount
        };
    }

    try {
        if (rid) await api(`${MODULE_API}/eval-reunions/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions`, { method: 'POST', body: JSON.stringify(data) });
        // End consolidation round: notes go back to read-only (any statut)
        localStorage.removeItem(snapKey);
        try { localStorage.setItem('pr_consol_locked_' + evalId, '1'); } catch (e) {}
        // Refresh APP_STATE then re-render the tab inline (no slicer rebuild → no "Chargement..." flash)
        await loadAllData();
        await _loadReunionEvalTab(evalId);
        showToast(rawSnap ? t('reunion_enregistree_verrou') : t('reunion_enregistree'));
    } catch (e) { showToast(e.message, 'error'); }
}

async function reunionPrestSaveFromTab(evalId, prestId) {
    const rid = document.getElementById('rpId')?.value || '';
    const data = {
        eval_id: evalId, prestataire_id: prestId,
        date: document.getElementById('rpDate').value,
        participants_aac: document.getElementById('rpAac').value.split('\n').map(s => s.trim()).filter(Boolean),
        participants_prestataire: document.getElementById('rpPrest').value.split('\n').map(s => s.trim()).filter(Boolean),
        resume_echanges: document.getElementById('rpResume').value,
        recommandations: document.getElementById('rpReco').value,
        signature_aac: document.getElementById('rpSigAac').value,
        signature_prestataire: document.getElementById('rpSigPrest').value,
        statut: 'finalise'
    };
    try {
        if (rid) await api(`${MODULE_API}/eval-reunions-prest/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions-prest`, { method: 'POST', body: JSON.stringify(data) });
        // Reload the list inline (no slicer re-render, no "Chargement..." stuck)
        await _loadReunionPrestTab(evalId, prestId);
        showToast(t('provider_meeting_saved'));
    } catch (e) { showToast(e.message, 'error'); }
}


// L'échappement vient du socle (oasis-commun.js).
function _genEsc(s) { return oasisEsc(s); }

// Helper — capture any pending indicator comments from the DOM and persist them BEFORE a workflow
// transition (Soumettre / Accepter / Renvoyer / Rejeter / Cloturer / Valider). This prevents loss
// of comments typed by the user who clicks a workflow button without saving first.
async function _persistPendingComments(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const tas = document.querySelectorAll('textarea.eval-indicator-comment');
    if (!tas.length) return;
    if (!ev.commentaires_indicateurs || typeof ev.commentaires_indicateurs !== 'object') ev.commentaires_indicateurs = {};
    let dirty = false;
    tas.forEach(ta => {
        const slot = ta.dataset.slot;
        const key = ta.dataset.key;
        const val = (ta.value || '').trim();
        if (!ev.commentaires_indicateurs[slot]) ev.commentaires_indicateurs[slot] = {};
        const prev = ev.commentaires_indicateurs[slot][key] || '';
        if (val !== prev) {
            dirty = true;
            if (val) ev.commentaires_indicateurs[slot][key] = val;
            else delete ev.commentaires_indicateurs[slot][key];
        }
    });
    if (!dirty) return;
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT', body: JSON.stringify({ commentaires_indicateurs: ev.commentaires_indicateurs })
        });
    } catch (e) { console.warn('Pending comments save failed:', e); }
}

// Designated non-validator submits their private draft → promote to published
// notes_per_evaluator so the validator/administrator can see and continue the workflow.
async function soumettreMesNotes(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const uid = APP_STATE.user?.id;
    if (!uid) return;
    if (!(ev.evaluateurs_designes || []).includes(uid)) {
        showToast(t('not_designated'), 'error');
        return;
    }
    // Verify completeness on the draft (Perf + Comp for this user)
    const D = APP_STATE.data;
    const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const compInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const draftPerf = ev.notes_per_evaluator_draft?.perf?.[uid] || {};
    const draftComp = ev.notes_per_evaluator_draft?.comp?.[uid] || {};
    const perfMissing = perfInds.filter(ind => !(draftPerf[ind.id] > 0));
    const compMissing = compInds.filter(ind => !(draftComp[ind.id] > 0));
    if (perfMissing.length || compMissing.length) {
        showToast(t('submit_missing_scores', perfMissing.length, compMissing.length), 'error');
        return;
    }
    if (!await oasisConfirmer(t('confirmer_soumettre_notes'))) return;

    // Promote draft → published for this user, then clear the draft slot
    if (!ev.notes_per_evaluator || typeof ev.notes_per_evaluator !== 'object') ev.notes_per_evaluator = {};
    if (!ev.notes_per_evaluator.perf) ev.notes_per_evaluator.perf = {};
    if (!ev.notes_per_evaluator.comp) ev.notes_per_evaluator.comp = {};
    ev.notes_per_evaluator.perf[uid] = { ...draftPerf };
    ev.notes_per_evaluator.comp[uid] = { ...draftComp };
    if (ev.notes_per_evaluator_draft?.perf) delete ev.notes_per_evaluator_draft.perf[uid];
    if (ev.notes_per_evaluator_draft?.comp) delete ev.notes_per_evaluator_draft.comp[uid];

    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT',
            body: JSON.stringify({
                notes_per_evaluator: ev.notes_per_evaluator || {},
                notes_per_evaluator_draft: ev.notes_per_evaluator_draft || {}
            })
        });
        showToast(t('scores_submitted'), 'success');
        await loadAllData();
        renderPage();
        openEvalDetail(evalId);
    } catch (e) {
        showToast(t('submit_error', e.message || e), 'error');
    }
}

// ── Phase 4 — Workflow validation directeur (4.2.2.f) ──
async function soumettreDirecteur(evalId) {
    if (!await oasisConfirmer(t('confirmer_soumettre_evaluation'))) return;
    try {
        await _persistPendingComments(evalId);
        await saveEvalScores(evalId);
        await api(`${MODULE_API}/evaluations/${evalId}/soumettre-directeur`, { method: 'POST' });
        await loadAllData(); renderPage();
        showToast(t('submitted_validation'));
    } catch (e) { showToast(e.message, 'error'); }
}

async function decisionDirecteur(evalId, decision) {
    // Always capture any pending comments before transitioning workflow
    await _persistPendingComments(evalId);
    const promptByDecision = {
        valider:  'Commentaire de validation (facultatif) :',
        accepter: 'Commentaire d\'acceptation (facultatif) :',
        renvoyer: 'Motif du renvoi (obligatoire) :',
        rejeter:  'Motif du rejet (obligatoire) :',
        cloturer: 'Commentaire de clôture (facultatif) :'
    };
    const successMsg = {
        valider: 'Évaluation validée',
        accepter: 'Évaluation acceptée — onglet Réunion prestataire disponible',
        renvoyer: 'Évaluation renvoyée',
        rejeter: 'Évaluation rejetée',
        cloturer: 'Réunion prestataire clôturée — vous pouvez valider'
    };
    const requiresMotif = (decision === 'renvoyer' || decision === 'rejeter');
    if (requiresMotif && decision === 'rejeter' && !await oasisConfirmer(t('confirmer_rejet_evaluation'))) return;
    if (requiresMotif && decision === 'renvoyer' && !await oasisConfirmer(t('confirmer_renvoi_observations'))) return;
    if (decision === 'cloturer' && !await oasisConfirmer(t('confirmer_cloture_reunion'))) return;
    const commentaire = (requiresMotif || decision !== 'accepter')
        ? ((await oasisSaisir(promptByDecision[decision], { requis: requiresMotif })) || '') : '';
    if (requiresMotif && !commentaire.trim()) {
        showToast(t('reason_required_for', decision), 'error'); return;
    }
    try {
        await api(`${MODULE_API}/evaluations/${evalId}/decision-directeur`, {
            method: 'POST', body: JSON.stringify({ decision, commentaire })
        });
        // Keep the slicer open for intermediate states; close on terminal states
        const terminal = (decision === 'valider' || decision === 'rejeter');
        if (terminal) closeSlicer();
        await loadAllData();
        renderPage();
        if (!terminal) openEvalDetail(evalId);
        showToast(successMsg[decision] || 'OK');
    } catch (e) { showToast(e.message, 'error'); }
}

// Update Début/Fin Cycle on a validated evaluation. When Début changes, Fin is
// auto-recalculated as Début + csrbo months (admin/validateur may override Fin manually).
async function updateCycleDate(evalId, kind, value, csrbo, champ) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    // Règle commune : le cycle ne se ferme pas avant de s'ouvrir. Les deux
    // champs se saisissent côte à côte, sans identifiant — on les prend là.
    const bande = champ && champ.closest ? champ.closest('div') : null;
    const dates = bande ? [...bande.querySelectorAll('input[type="date"]')] : [];
    if (dates.length === 2 && !oasisDatesValider({ debut: dates[0], fin: dates[1] })) {
        renderPage();
        return;
    }
    if (!prCanValidate(ev.secteur_id)) {
        showToast(t('cycle_dates_reserved'), 'error');
        renderPage();
        return;
    }
    const payload = {};
    if (kind === 'debut') {
        payload.date_debut_cycle = value || null;
        // Auto-recompute Fin = Début + csrbo months
        if (value && csrbo) {
            const dt = new Date(value + 'T00:00:00');
            if (!isNaN(dt.getTime())) {
                dt.setMonth(dt.getMonth() + parseInt(csrbo));
                payload.date_fin_cycle = oasisJour(dt);
            }
        } else if (!value) {
            payload.date_fin_cycle = null;
        }
    } else if (kind === 'fin') {
        payload.date_fin_cycle = value || null;
    }
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT', body: JSON.stringify(payload)
        });
        // Reflect locally without full reload to avoid losing scroll
        Object.assign(ev, payload);
        renderPage();
    } catch (e) {
        showToast(t('dates_save_error', e.message || e), 'error');
    }
}

// ── Phase 8 — Réévaluation (4.3) ──
async function reevaluerEval(evalId) {
    const motif = await oasisSaisir(t('motif_reevaluation'), { titre: t('reevaluer_titre'), valeur: t('fin_de_cycle') });
    if (!motif) return;
    try {
        const res = await api(`${MODULE_API}/evaluations/${evalId}/reevaluer`, {
            method: 'POST', body: JSON.stringify({ motif })
        });
        closeSlicer(); await loadAllData();
        APP_STATE.currentPage = 'evaluations';
        APP_STATE.currentSub = 'eval_indicateurs';
        renderPage();
        showToast(t('new_revision'));
    } catch (e) {
        showToast(e.message === 'privilege_insuffisant'
            ? t('reevaluation_privilege')
            : (e.message === 'reevaluation_deja_lancee' ? t('reevaluation_en_cours') : e.message), 'error');
    }
}

async function deleteEval(evalId) {
    const _ev = (APP_STATE.data.evaluations || []).find(e => e.id === evalId);
    if (_ev && !prCanSupprimerEval(_ev)) {
        showToast(t('delete_reserved'), 'error');
        return;
    }
    if (!await oasisConfirmer(t('confirm_delete'))) return;
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, { method: 'DELETE' });
        await loadAllData();
        renderPage();
        showToast('OK');
    } catch (e) { showToast(e.message, 'error'); }
}


// ── Evaluation Export/Import ──
async function exportEvalExcel(evalId) {
    try {
        // Jeton mort retiré (rien n'écrit `pr_token`), et l'ancre attachée
        // avant d'être cliquée : détachée, après un `await`, elle ne télécharge
        // rien et ne dit rien. Même correction qu'à la bibliothèque.
        const res = await fetch(`${MODULE_API}/evaluations/${evalId}/export-excel`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `evaluation_${evalId}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { showToast(e.message, 'error'); }
}

// Même rapport que « Exporter PDF » de la liste : fenêtre d'impression
function exportEvalPDF(evalId) {
    exportEvalReport(evalId, 'pdf');
}

async function importEvalExcel(event, evalId, type) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const fileB64 = await fileToBase64(file);
        const res = await fetch(`${MODULE_API}/evaluations/${evalId}/import-excel`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileB64, type })
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error === 'evaluation_verrouillee'
                ? t('evaluation_verrouillee_import')
                : oasisMessageErreur(d, res.status, t('import_refuse')));
        }
        const d = await res.json().catch(() => ({}));
        event.target.value = '';
        closeModal();
        await loadAllData();
        renderPage();
        showToast(t('import_scores', d.updated || 0), 'success');
    } catch (e) { showToast(e.message, 'error'); }
}
