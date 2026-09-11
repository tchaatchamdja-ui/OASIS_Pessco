/* Module « Plans de Surveillance » — prestataires
   Profils de risque des prestataires et cycles de surveillance.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  PRESTATAIRES PAGE
// ══════════════════════════════════════

function planRenderPrestataires() {
    const prestRisques = PLAN_STATE.data.prestataireRisques || [];
    // Map validation dates from shared risk profiles (profil de risque module)
    const riskProfiles = PLAN_STATE.data.riskProfiles || [];
    const rpByPrestId = new Map(riskProfiles.map(rp => [rp.prestataire_id, rp]));
    const canEditCycles = _canValidate();

    // Apply filters
    let filtered = [...prestRisques];
    const F = PLAN_STATE.filters;
    if (F.domaine) filtered = filtered.filter(p => p.domaine_id === F.domaine);
    if (F.secteur) filtered = filtered.filter(p => p.secteur_id === F.secteur);
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(p => (p.nom || '').toLowerCase().includes(s));
    }

    // Prestataires without risk evaluation
    const allPrest = PLAN_STATE.data.prestataires || [];
    const evaluatedIds = new Set(prestRisques.map(pr => pr.id));
    const noEvalPrest = allPrest.filter(p => !evaluatedIds.has(p.id));

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('profils_de_risques')}</h2>
            <div class="page-actions">
                <button class="btn btn-outline btn-sm" onclick="planSyncPrestatairesRisques()" title="${tp('sync_risk_profiles')}">${PLAN_ICONS.sync} ${tp('sync_risk_profiles')}</button>
                <button class="btn btn-primary btn-sm" onclick="planShowAddRiskProfileModal()">${PLAN_ICONS.add} ${tp('add_risk_profile')}</button>
            </div>
        </div>

        ${_renderFilterBar('planRenderPage()', { showPrestataire: false, showSousActivite: true, showTheme: true, showStatut: false, showYear: false })}

        <div class="card">
            <div class="card-body" style="overflow-x:auto;">
                ${filtered.length ? `
                <table class="data-table">
                    <thead><tr>
                        <th>${tp('provider')}</th>
                        <th>${tp('sector')}</th>
                        <th>${tp('risk_label')}</th>
                        <th>${tp('csrbo')}</th>
                        <th>${tp('intensity')}</th>
                        <th>${tp('debut_cycle')}</th>
                        <th>${tp('fin_cycle')}</th>
                        <th>${tp('evaluation_date')}</th>
                        <th></th>
                    </tr></thead>
                    <tbody>
                        ${filtered.map(p => {
                            const sect = (PLAN_STATE.data.secteurs || []).find(s => s.id === p.secteur_id);
                            // Parse sous_activites risk details from evaluation
                            const saDetails = _parseSADetails(p);
                            return `<tr>
                                <td><strong>${_esc(p.nom)}</strong></td>
                                <td>${sect ? sect.code : '-'}</td>
                                <td>${_riskBadge(p.risk_label)}</td>
                                <td>${p.csrbo || '-'} mois</td>
                                <td>${_esc(p.intensite || '-')}</td>
                                <td>${canEditCycles ?
                                    `<input type="date" class="cycle-date-input" value="${p.debut_cycle || ''}" onchange="planUpdateCycleDate('${p.id}','debut_cycle',this.value,this)">` :
                                    (p.debut_cycle || '-')}</td>
                                <td>${canEditCycles ?
                                    `<input type="date" class="cycle-date-input" value="${p.fin_cycle || ''}" onchange="planUpdateCycleDate('${p.id}','fin_cycle',this.value,this)">` :
                                    (p.fin_cycle || '-')}</td>
                                <td>${(rpByPrestId.get(p.id)?.date_validation || p.evaluation_date || '').substring(0, 10)}</td>
                                <td><button class="btn-icon" onclick="this.closest('tr').nextElementSibling.classList.toggle('hidden')" title="${tp('details')}">${PLAN_ICONS.chevron}</button></td>
                            </tr>
                            <tr class="hidden prest-detail-row">
                                <td colspan="9" style="padding:0;">
                                    <div class="prest-accordion-content">
                                        <div class="prest-accordion-header">
                                            <strong>${tp('risk_profile_sub_activities')}</strong>
                                            <span class="text-muted" style="font-size:0.78rem;margin-left:0.5rem;">(${tp('source_freq_surveillance')})</span>
                                        </div>
                                        ${saDetails.length ? `<table class="data-table sa-risk-table" style="margin:0;width:100%;background:var(--bg);">
                                            <thead><tr>
                                                <th>${tp('sub_activity')}</th>
                                                <th>${tp('risk_label')}</th>
                                                <th>${tp('frequency')}</th>
                                                <th>${tp('intensity')}</th>
                                            </tr></thead>
                                            <tbody>${saDetails.map(sa => `<tr>
                                                <td><strong>${_esc(sa.nom)}</strong></td>
                                                <td>${_riskBadge(sa.risk_label)}</td>
                                                <td>${sa.frequence || '-'}x / ${tp('cycle_unit')}</td>
                                                <td>${_esc(sa.intensite || '-')}</td>
                                            </tr>`).join('')}</tbody>
                                        </table>` : `<p style="padding:0.5rem 1rem;color:var(--text-muted);font-size:0.85rem;font-style:italic;">${tp('no_risk_profile_data')}</p>`}
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>` : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`}
            </div>
        </div>
    </div>`;
}

function _parseSADetails(prest) {
    // Parse sub-activity risk details from prestataire risk profile (evaluation resultats)
    const sousActivites = PLAN_STATE.data.sousActivites || [];
    const globalCsrbo = prest.csrbo || 0;
    let saDetails = [];
    try {
        const resultats = typeof prest.resultats === 'string' ? JSON.parse(prest.resultats || '{}') : (prest.resultats || {});
        const saResults = resultats.sousActivites || resultats.sous_activites || {};
        for (const [saId, saData] of Object.entries(saResults)) {
            const saRef = sousActivites.find(s => s.id === saId);
            // Support both formats:
            // New format: saData.risk = "2b" (string), saData.freq = 1 (number)
            // Old format: saData.risk = {label:"2b", csrbo:12, freq:1, ...}
            const riskIsObj = saData.risk && typeof saData.risk === 'object';
            // Badge lisible : le niveau textuel (« Très Élevé ») suivi de la
            // case de matrice ; à défaut, la case seule.
            const matrice = riskIsObj ? (saData.risk.label || '') : (saData.risk || saData.riskLabel || '');
            const desc = riskIsObj ? (saData.risk.risk || '') : (saData.risk_desc || '');
            saDetails.push({
                id: saId,
                nom: saRef ? `${saRef.code} - ${saRef.nom}` : saId,
                risk_label: desc ? `${desc}${matrice ? ` (${String(matrice).toUpperCase()})` : ''}` : matrice,
                risk_desc: desc,
                csrbo: saData.csrbo || (riskIsObj ? saData.risk.csrbo : '') || globalCsrbo || '',
                frequence: saData.freq || (riskIsObj ? saData.risk.freq : '') || saData.frequence || '',
                intensite: saData.intensite || (riskIsObj ? saData.risk.intensite : '') || ''
            });
        }
    } catch { /* ignore parse errors */ }
    return saDetails;
}

async function planUpdateCycleDate(prestId, field, value, champ) {
    // Saisie en ligne : les deux dates du cycle sont les deux champs de la
    // ligne, sans identifiant — le contrôle les y prend.
    const ligne = champ && champ.closest ? champ.closest('tr') : null;
    const dates = ligne ? [...ligne.querySelectorAll('.cycle-date-input')] : [];
    if (dates.length === 2 && !oasisDatesValider({ debut: dates[0], fin: dates[1] })) return;
    try {
        const prest = (PLAN_STATE.data.prestataireRisques || []).find(p => p.id === prestId);
        const data = {
            debut_cycle: prest?.debut_cycle || '',
            fin_cycle: prest?.fin_cycle || ''
        };
        data[field] = value;

        // Auto-calculate fin_cycle if debut_cycle set and fin_cycle empty
        if (field === 'debut_cycle' && value && !data.fin_cycle && prest?.csrbo) {
            const d = new Date(value);
            d.setMonth(d.getMonth() + parseInt(prest.csrbo));
            data.fin_cycle = d.toISOString().substring(0, 10);
        }

        await api(`${PLAN_MODULE_API}/prestataires/${prestId}/cycle`, {
            method: 'PUT', body: JSON.stringify(data)
        });
        // Update local state
        if (prest) {
            prest.debut_cycle = data.debut_cycle;
            prest.fin_cycle = data.fin_cycle;
        }
        planRenderPage();
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// ══════════════════════════════════════
//  Add Risk Profile (directly from Prestataires page)
// ══════════════════════════════════════

function planShowAddRiskProfileModal() {
    const allPrest = PLAN_STATE.data.prestataires || [];
    const prestRisques = PLAN_STATE.data.prestataireRisques || [];
    const evaluatedIds = new Set(prestRisques.map(pr => pr.id));
    const candidates = allPrest.filter(p => !evaluatedIds.has(p.id));
    const secteurs = PLAN_STATE.data.secteurs || [];
    const today = new Date().toISOString().substring(0, 10);

    const body = `
    <div class="form-grid">
        <div class="form-group">
            <label>${tp('provider')} *</label>
            <select id="rpPrestataire" class="form-select" onchange="planRPFillDefaults()">
                <option value="">-- ${tp('provider')} --</option>
                ${candidates.map(p => {
                    const sect = secteurs.find(s => s.id === p.secteur_id);
                    return `<option value="${p.id}" data-secteur="${p.secteur_id || ''}">${_esc(p.trigramme || '')} - ${_esc(p.nom)}${sect ? ' (' + sect.code + ')' : ''}</option>`;
                }).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('sector')} *</label>
            <select id="rpSecteur" class="form-select" onchange="planRPRenderSARows()">
                <option value="">${tp('select_option')}</option>
                ${secteurs.map(s => `<option value="${s.id}">${s.code} - ${_esc(s.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('risk_label')} *</label>
            <input type="text" class="form-input" id="rpRiskLabel" placeholder="ex: Élevé">
        </div>
        <div class="form-group">
            <label>${tp('csrbo')} (${tp('months_unit')}) *</label>
            <input type="number" class="form-input" id="rpCsrbo" min="1" value="12">
        </div>
        <div class="form-group">
            <label>${tp('intensity')} *</label>
            <input type="text" class="form-input" id="rpIntensite" placeholder="ex: Normale">
        </div>
        <div class="form-group">
            <label>${tp('debut_cycle')}</label>
            <input type="date" class="form-input" id="rpDebutCycle" value="${today}">
        </div>
        <div class="form-group">
            <label>${tp('fin_cycle')}</label>
            <input type="date" class="form-input" id="rpFinCycle">
        </div>
        <div class="form-group">
            <label>${tp('evaluation_date')} *</label>
            <input type="date" class="form-input" id="rpEvalDate" value="${today}">
        </div>
        <div class="form-group full-width">
            <label>${tp('sub_activity')}</label>
            <div id="rpSARowsWrap" style="border:1px solid var(--border);border-radius:6px;padding:0.5rem;background:var(--bg);">
                <p class="text-muted" style="margin:0;font-size:0.85rem;">${tp('select_sector_first')}</p>
            </div>
        </div>
    </div>`;

    const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planSaveRiskProfile()">${tp('save')}</button>`;

    planShowModal(tp('add_risk_profile'), body, footer, 'modal-lg');
    // Le cycle ne se ferme pas avant de s'ouvrir.
    oasisDatesLier({ debut: 'rpDebutCycle', fin: 'rpFinCycle' });
}

function planRPFillDefaults() {
    const sel = document.getElementById('rpPrestataire');
    const opt = sel?.selectedOptions[0];
    const secteurId = opt?.getAttribute('data-secteur') || '';
    if (secteurId) {
        const secSel = document.getElementById('rpSecteur');
        if (secSel) { secSel.value = secteurId; planRPRenderSARows(); }
    }
}

function planRPRenderSARows() {
    const secteurId = document.getElementById('rpSecteur')?.value || '';
    const wrap = document.getElementById('rpSARowsWrap');
    if (!wrap) return;
    const sas = (PLAN_STATE.data.sousActivites || []).filter(sa => sa.secteur_id === secteurId);
    if (!secteurId) {
        wrap.innerHTML = `<p class="text-muted" style="margin:0;font-size:0.85rem;">${tp('select_sector_first')}</p>`;
        return;
    }
    if (!sas.length) {
        wrap.innerHTML = `<p class="text-muted" style="margin:0;font-size:0.85rem;">${tp('no_data')}</p>`;
        return;
    }
    wrap.innerHTML = `
    <table class="data-table" style="margin:0;width:100%;">
        <thead><tr>
            <th>${tp('sub_activity')}</th>
            <th style="width:130px;">${tp('risk_label')}</th>
            <th style="width:110px;">${tp('frequency')}</th>
            <th style="width:130px;">${tp('intensity')}</th>
        </tr></thead>
        <tbody>
            ${sas.map(sa => `<tr data-sa-id="${sa.id}">
                <td><strong>${_esc(sa.code)}</strong> - ${_esc(sa.nom)}</td>
                <td><input type="text" class="form-input rp-sa-risk" style="padding:0.25rem 0.4rem;" placeholder="ex: 2b"></td>
                <td><input type="number" class="form-input rp-sa-freq" style="padding:0.25rem 0.4rem;" min="0" step="0.5" value="1"></td>
                <td><input type="text" class="form-input rp-sa-intensite" style="padding:0.25rem 0.4rem;" placeholder="ex: Normale"></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

async function planSaveRiskProfile() {
    if (!oasisDatesValider({ debut: 'rpDebutCycle', fin: 'rpFinCycle' })) return;
    const pid = document.getElementById('rpPrestataire')?.value || '';
    const secteurId = document.getElementById('rpSecteur')?.value || '';
    const riskLabel = document.getElementById('rpRiskLabel')?.value || '';
    const csrbo = parseInt(document.getElementById('rpCsrbo')?.value || '12', 10);
    const intensite = document.getElementById('rpIntensite')?.value || '';
    const debutCycle = document.getElementById('rpDebutCycle')?.value || '';
    let finCycle = document.getElementById('rpFinCycle')?.value || '';
    const evalDate = document.getElementById('rpEvalDate')?.value || new Date().toISOString().substring(0, 10);

    if (!pid || !secteurId || !riskLabel || !intensite) {
        oasisToast(tp('required_fields'), 'warning');
        return;
    }

    // Auto-compute fin_cycle if empty
    if (debutCycle && !finCycle && csrbo) {
        const d = new Date(debutCycle);
        d.setMonth(d.getMonth() + csrbo);
        finCycle = d.toISOString().substring(0, 10);
    }

    // Collect SA rows
    const saRows = [...document.querySelectorAll('#rpSARowsWrap tbody tr')];
    const sousActivites = {};
    saRows.forEach(tr => {
        const saId = tr.getAttribute('data-sa-id');
        const risk = tr.querySelector('.rp-sa-risk')?.value || '';
        const freq = parseFloat(tr.querySelector('.rp-sa-freq')?.value || '0') || 0;
        const saIntensite = tr.querySelector('.rp-sa-intensite')?.value || '';
        if (risk || freq || saIntensite) {
            sousActivites[saId] = { risk, freq, intensite: saIntensite };
        }
    });

    const payload = {
        prestataire_id: pid,
        secteur_id: secteurId,
        risk_label: riskLabel,
        csrbo,
        intensite,
        debut_cycle: debutCycle,
        fin_cycle: finCycle,
        evaluation_date: evalDate,
        sous_activites: sousActivites
    };

    try {
        await api(`${PLAN_MODULE_API}/risk-profiles`, { method: 'POST', body: JSON.stringify(payload) });
        planCloseModal();
        if (typeof planShowEphemeralToast === 'function') planShowEphemeralToast(tp('risk_profile_saved'), 'success', 4000);
        await planLoadData();
        planRenderPage();
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}



async function planSyncPrestatairesRisques() {
    try {
        // Recharge les derniers profils validés (source : « Synthèses Profils »)
        const [freshData, freshProfiles] = await Promise.all([
            api(`${PLAN_MODULE_API}/prestataires-risques`),
            api(`${PLAN_MODULE_API}/risk-profiles`),
        ]);
        PLAN_STATE.data.prestataireRisques = freshData;
        PLAN_STATE.data.riskProfiles = freshProfiles;
        planRenderPage();
        if (typeof showToast === 'function') showToast(tp('sync_success'), 'success');
        else oasisToast(tp('sync_success'), 'success');
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

