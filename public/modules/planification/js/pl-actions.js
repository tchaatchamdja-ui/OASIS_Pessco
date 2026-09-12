/* Module « Plans de Surveillance » — actions
   Actions de workflow, commentaires, exports et utilitaires.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  WORKFLOW ACTIONS
// ══════════════════════════════════════

function planSubmit(planId) {
    const plan = PLAN_STATE.selectedPlan;
    const nb = (plan?.activites || []).length;
    const body = `
        <p style="font-size:0.9rem;margin-bottom:0.5rem;">${tp('confirm_submit_intro')}</p>
        <ul style="font-size:0.86rem;margin:0 0 .75rem 1.1rem;color:var(--text-muted);">
            <li><strong>${_esc(plan?.titre || '')}</strong> — v${plan?.version || 1}</li>
            <li>${nb} ${tp('activities').toLowerCase()}</li>
        </ul>
        <p style="font-size:0.82rem;color:var(--text-muted);">${tp('confirm_submit_hint')}</p>`;
    const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planConfirmSubmit('${planId}')">${PLAN_ICONS.send} ${tp('submit_plan')}</button>`;
    planShowModal(tp('confirm_submit_title'), body, footer);
}

async function planConfirmSubmit(planId) {
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}/soumettre`, {
            method: 'POST', body: JSON.stringify({ commentaire: '' })
        });
        planCloseModal();
        await planLoadData();
        await planOpenDetail(planId);
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

function _collectValidatorActivityComments(planId) {
    // Collect per-activity validator comments typed in the diff accordion.
    // Returns an array of { activity_id, activity_objet, commentaire }.
    const nodes = document.querySelectorAll(`.validator-activity-comment[data-plan-id="${planId}"]`);
    const items = [];
    nodes.forEach(n => {
        const val = (n.value || '').trim();
        if (val) items.push({
            activity_id:    n.getAttribute('data-activity-id') || '',
            activity_objet: n.getAttribute('data-activity-objet') || '',
            commentaire:    val
        });
    });
    return items;
}


// Le commentaire général est saisi dans le bloc de validation ; le clic sur
// Valider / Rejeter ouvre une confirmation reprenant la décision.
function _planGeneralComment(planId) {
    return (document.getElementById(`validComment_${planId}`)?.value || '').trim();
}

function planValidate(planId) {
    _planConfirmDecision(planId, 'valider');
}

function planReject(planId) {
    _planConfirmDecision(planId, 'rejeter');
}

// Rejet définitif : le plan est rejeté et reste en lecture seule.
function planRejectClose(planId) {
    _planConfirmDecision(planId, 'rejeter-annuler');
}

function _planConfirmDecision(planId, decision) {
    const plan = (PLAN_STATE.data.plans || []).find(p => p.id === planId) || {};
    const commentaire = _planGeneralComment(planId);
    const perActivity = _collectValidatorActivityComments(planId);
    window._planDecisionDraft = { planId, decision, commentaire, perActivity };

    const estClos = decision === 'rejeter-annuler';
    const estRejet = estClos || decision === 'rejeter';
    const body = `
        <p style="font-size:0.9rem;margin-bottom:0.5rem;">
            ${estClos ? tp('confirm_reject_close_intro')
                : (estRejet ? tp('confirm_reject_intro') : tp('confirm_validate_intro'))}
        </p>
        <ul style="font-size:0.86rem;margin:0 0 .75rem 1.1rem;color:var(--text-muted);">
            <li><strong>${_esc(plan.titre || '')}</strong> — v${plan.version || 1}</li>
            ${perActivity.length ? `<li>${perActivity.length} ${tp('activity_comments_heading').toLowerCase()}</li>` : ''}
        </ul>
        <div class="form-group">
            <label>${tp('general_comment')}</label>
            <div class="valid-comment-recap">${commentaire ? _esc(commentaire) : `<em class="text-muted">${tp('no_comment')}</em>`}</div>
        </div>
        ${estRejet && !commentaire ? `<p style="color:#b45309;font-size:0.82rem;">${tp('reject_needs_comment')}</p>` : ''}`;
    const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn ${estRejet ? 'btn-danger' : 'btn-primary'}" onclick="planApplyDecision()">
            ${estRejet ? PLAN_ICONS.x : PLAN_ICONS.check || ''} ${estClos ? tp('reject_close') : (estRejet ? tp('reject_plan') : tp('validate_plan'))}
        </button>`;
    planShowModal(estClos ? tp('confirm_reject_close_title')
        : (estRejet ? tp('confirm_reject_title') : tp('confirm_validate_title')), body, footer);
}

async function planApplyDecision() {
    const d = window._planDecisionDraft;
    if (!d) return;
    const route = ['rejeter', 'rejeter-annuler'].includes(d.decision) ? d.decision : 'valider';
    try {
        await api(`${PLAN_MODULE_API}/plans/${d.planId}/${route}`, {
            method: 'POST',
            body: JSON.stringify({ commentaire: d.commentaire, activity_comments: d.perActivity }),
        });
        window._planDecisionDraft = null;
        planCloseModal();
        await planLoadData();
        planRenderPage();
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// Phase 7 — Approbation DG + transmission (Chap. 4 §4.2.3.e-f)
async function planApprouverDG(planId) {
    // Les deux champs sont facultatifs et n'ont jamais suspendu l'approbation :
    // les boutons le disent, plutôt qu'un « Annuler » qui approuvait quand même.
    const commentaire = (await oasisSaisir('Commentaire d’approbation (facultatif)',
        { titre: 'Approbation du DG', libelle: 'Suivant', libelleAnnuler: 'Sans commentaire' })) || '';
    const lettre = (await oasisSaisir('Lettre de transmission au prestataire',
        { titre: 'Approbation du DG', libelle: 'Approuver', libelleAnnuler: 'Sans lettre' })) || '';
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}/approuver-dg`, {
            method: 'POST', body: JSON.stringify({ commentaire, lettre_transmission: lettre })
        });
        await planLoadData(); await planOpenDetail(planId);
        oasisToast(tp('plan_approuve_dg_ok'), 'success');
    } catch (e) { oasisToast(e.message, 'error'); }
}

async function planTransmettre(planId) {
    if (!await oasisConfirmer(tp('confirmer_plan_transmis'))) return;
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}/transmettre`, { method: 'POST' });
        await planLoadData(); await planOpenDetail(planId);
        oasisToast(tp('plan_transmis_ok'), 'success');
    } catch (e) { oasisToast(e.message, 'error'); }
}

async function planAmend(planId) {
    // Confirmation dialog
    if (!await oasisConfirmer(tp('confirm_amend'))) return;
    const motif = await oasisSaisir(tp('reason'));
    if (motif === null) return;
    try {
        const result = await api(`${PLAN_MODULE_API}/plans/${planId}/amender`, {
            method: 'POST', body: JSON.stringify({ motif })
        });
        await planLoadData();
        // Open the NEW amendment plan (copy in brouillon)
        if (result.new_plan_id) {
            await planOpenDetail(result.new_plan_id);
        } else {
            await planOpenDetail(planId);
        }
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planCancelAmendment(planId) {
    if (!await oasisConfirmer(tp('confirm_cancel_amend'))) return;
    const comment = await oasisSaisir(tp('comment'));
    if (comment === null) return;
    try {
        const result = await api(`${PLAN_MODULE_API}/plans/${planId}/annuler-amendement`, {
            method: 'POST', body: JSON.stringify({ commentaire: comment })
        });
        await planLoadData();
        // Redirect to parent plan (which stays valide)
        if (result.parent_plan_id) {
            await planOpenDetail(result.parent_plan_id);
        } else {
            PLAN_STATE.currentPage = 'plans';
            planRenderPage();
        }
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// Volet de lecture du commentaire de validation d'une activité (1/3 de
// l'écran, ouvert à droite). Le commentaire est saisi par le validateur
// depuis la page de validation du plan.
function planShowValidationComment(actId) {
    const plan = PLAN_STATE.selectedPlan;
    const a = (plan?.activites || []).find(x => x.id === actId)
        || (PLAN_STATE.data.allActivites || []).find(x => x.id === actId);
    if (!a) return;
    const prest = (PLAN_STATE.data.prestataires || []).find(p => p.id === a.prestataire_id);
    const texte = (a.commentaire_validation || '').trim();
    const body = `
        <div class="vc-meta">
            <div><span class="text-muted">${tp('objet')} :</span> <strong>${_esc(a.objet || a.titre || '-')}</strong></div>
            ${prest ? `<div><span class="text-muted">${tp('provider')} :</span> ${_esc(prest.nom)}</div>` : ''}
        </div>
        ${texte
            ? `<div class="vc-comment">${_esc(texte)}</div>`
            : `<p class="text-center" style="padding:1rem;color:var(--text-muted);font-style:italic;">${tp('no_validation_comment')}</p>`}`;
    const footer = `<button class="btn btn-ghost" onclick="planCloseModal()">${tp('close')}</button>`;
    planShowModal(tp('validation_comment'), body, footer, 'modal-drawer modal-drawer-1-3');
}

// Export PDF : le document est composé ici puis remis à la fenêtre
// d'impression du navigateur (aucun générateur PDF côté serveur).
function planExportPDF(planId) {
    const plan = (PLAN_STATE.selectedPlan && PLAN_STATE.selectedPlan.id === planId)
        ? PLAN_STATE.selectedPlan
        : (PLAN_STATE.data.plans || []).find(p => p.id === planId);
    if (!plan) { oasisToast(tp('no_data'), 'warning'); return; }
    const activites = plan.activites
        || (PLAN_STATE.data.allActivites || []).filter(a => a.plan_id === planId);
    const aac = PLAN_STATE.data.aac || {};
    const dom = (PLAN_STATE.data.domaines || []).find(d => d.id === plan.domaine_id);
    const sec = (PLAN_STATE.data.secteurs || []).find(x => x.id === plan.secteur_id);
    const lignes = activites.map((a, i) => {
        const prest = (PLAN_STATE.data.prestataires || []).find(p => p.id === a.prestataire_id);
        const s = (PLAN_STATE.data.secteurs || []).find(x => x.id === a.secteur_id);
        const resp = (PLAN_STATE.data.inspecteurs || []).find(x => x.id === a.responsable_id);
        const mode = (PLAN_STATE.data.modesSupervision || []).find(m => m.id === a.mode_supervision_id);
        const typeS = (PLAN_STATE.data.typesSupervision || []).find(t => t.id === a.type_supervision_id);
        return `<tr>
            <td>${i + 1}</td>
            <td>${_esc(prest ? prest.nom : '-')}</td>
            <td>${_esc(a.objet || a.titre || '-')}</td>
            <td>${_esc(s ? s.code : '-')}</td>
            <td>${_esc(`${mode ? (mode.mode || '') : '-'} / ${typeS ? (typeS.type_supervision || '') : '-'}`)}</td>
            <td>${_esc(a.lieu_activite || '-')}</td>
            <td>${_esc(resp ? `${resp.nom || ''} ${resp.prenom || ''}`.trim() : '-')}</td>
            <td>${(a.date_debut || '').substring(0, 10) || '-'}</td>
            <td>${(a.date_fin || '').substring(0, 10) || '-'}</td>
        </tr>`;
    }).join('');

    // Détail de chaque activité — le commentaire de validation est exclu
    const details = activites.map((a, i) => {
        const prest = (PLAN_STATE.data.prestataires || []).find(p => p.id === a.prestataire_id);
        const saIds = _normalizeList(a.sous_activite_ids).length
            ? _normalizeList(a.sous_activite_ids) : (a.sous_activite_id ? [a.sous_activite_id] : []);
        const themeIds = _normalizeList(a.themes_couverts);
        // Deux colonnes alignées : chaque paire de sous-activités forme une
        // ligne, les cellules restent alignées en haut.
        const cellules = saIds.map(sid => {
            const sa = (PLAN_STATE.data.sousActivites || []).find(x => x.id === sid);
            const ths = themeIds
                .map(tid => (PLAN_STATE.data.themesSupervision || []).find(t => t.id === tid))
                .filter(t => t && t.sous_activite_id === sid);
            return `<div class="sa-t">${_esc(sa ? `${sa.code} - ${sa.nom}` : sid)}</div>
                ${ths.length ? `<ul>${ths.map(t => `<li>${_esc(t.libelle)}</li>`).join('')}</ul>` : '<div class="muted">-</div>'}`;
        });
        let blocs = '';
        for (let k = 0; k < cellules.length; k += 2) {
            blocs += `<tr>
                <td class="sa">${cellules[k]}</td>
                <td class="sa">${cellules[k + 1] || ''}</td>
            </tr>`;
        }
        return `<div class="detail">
            <div class="detail-h">${i + 1}. ${_esc(a.objet || a.titre || '-')}${prest ? ` — ${_esc(prest.nom)}` : ''}</div>
            <table class="meta"><tr>
                <td class="k">Inspecteurs :</td><td>${a.nombre_inspecteurs || 1}</td>
                <td class="k">Niveau de risque :</td><td>${_esc(a.risk_label || '-')}</td>
                <td class="k">Description :</td><td>${_esc(a.description_activite || '-')}</td>
            </tr></table>
            <div class="sa-title">Sous-activités / Thèmes couverts</div>
            ${blocs ? `<table class="sa-grid">${blocs}</table>` : '<div class="muted">-</div>'}
        </div>`;
    }).join('');

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${_esc(plan.titre || '')}</title>
<style>
  /* Mise en page compacte : pas de saut forcé, blocs insécables */
  @page { size: A4 landscape; margin: 10mm 10mm 12mm; }
  body { font-family: Calibri, Arial, sans-serif; color: #111; font-size: 9pt; margin: 0; }
  .runhead { text-align: center; font-size: 9pt; margin-bottom: 6px; }
  h1 { text-align: center; font-size: 14pt; font-weight: 400; color: #2f5496; margin: 2px 0 8px; }
  .meta { border-collapse: collapse; }
  .meta td { padding: 0 10px 1px 0; font-size: 9pt; vertical-align: top; }
  .meta td.k { color: #555; white-space: nowrap; }
  table.acts { border-collapse: collapse; width: 100%; margin-top: 8px; }
  table.acts th { border: 1px solid #8ea9db; background: #d9e2f3; text-align: left; padding: 2px 5px; font-size: 8pt; font-weight: 600; }
  table.acts td { border: 1px solid #8ea9db; padding: 2px 5px; font-size: 8pt; vertical-align: top; }
  h2 { font-size: 11pt; font-weight: 400; color: #2f5496; margin: 10px 0 5px; }
  .detail { border: 1px solid #d0d7e5; border-radius: 3px; padding: 4px 6px; margin-bottom: 5px; page-break-inside: avoid; }
  .detail-h { font-weight: 700; font-size: 9pt; margin-bottom: 2px; color: #1f3864; }
  .sa-title { font-size: 7.5pt; font-weight: 700; color: #555; margin: 4px 0 1px; text-transform: uppercase; letter-spacing: .02em; }
  .sa-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .sa-grid td.sa { width: 50%; vertical-align: top; padding: 0 12px 5px 0; break-inside: avoid; }
  .sa-t { font-size: 8pt; font-weight: 600; }
  .sa ul { margin: 1px 0 0 14px; padding: 0; font-size: 7.5pt; }
  .sa li { break-inside: avoid; }
  .muted { color: #888; font-size: 8pt; }
</style></head><body>
  <div class="runhead">${_esc(aac.nom || "Autorité de l'Aviation Civile")}</div>
  <h1>${_esc(plan.titre || '')}</h1>
  <table class="meta">
    <tr>
      <td class="k">Année :</td><td>${plan.annee || '-'}</td>
      <td class="k">Domaine :</td><td>${_esc(dom ? `${dom.code} - ${dom.nom}` : '-')}</td>
      <td class="k">Version :</td><td>v${plan.version || 1}</td>
    </tr>
    <tr>
      <td class="k">Type :</td><td>${_esc(tp(plan.type) || plan.type || '-')}</td>
      <td class="k">Secteur :</td><td>${_esc(sec ? `${sec.code} - ${sec.nom}` : '-')}</td>
      <td class="k">Statut :</td><td>${_esc(tp(plan.statut) || plan.statut || '-')} — ${activites.length} activité(s)</td>
    </tr>
  </table>
  <table class="acts">
    <thead><tr>
      <th>#</th><th>Prestataire</th><th>Objet</th><th>Secteur</th><th>Mode / Type</th>
      <th>Lieu</th><th>Responsable</th><th>Début</th><th>Fin</th>
    </tr></thead>
    <tbody>${lignes || '<tr><td colspan="9" style="text-align:center;color:#777;">Aucune activité</td></tr>'}</tbody>
  </table>
  ${activites.length ? `<h2>Détail des activités</h2>${details}` : ''}
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) { oasisToast(tp('popup_blocked'), 'warning'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
}

// ══════════════════════════════════════
//  COMMENTS (Timeline / Conversation)
// ══════════════════════════════════════

async function planLoadComments(planId) {
    const container = document.getElementById('planCommentsContainer');
    if (!container) return;
    try {
        const all = await api(`${PLAN_MODULE_API}/plans/${planId}/commentaires`);
        const me = PLAN_STATE.user || {};
        const miens = [me.username, me.email, me.id].filter(Boolean);
        const VALIDATION = ['valider', 'validation', 'rejeter', 'rejeter-annuler', 'rejet'];

        // Commentaires des utilisateurs + commentaires émis lors de la
        // validation ou du rejet du plan (affichés en rouge).
        const items = (all || []).filter(it => it.timeline_type !== 'workflow'
            || (VALIDATION.includes(it.action) && it.commentaire));

        if (!items.length) {
            container.innerHTML = `<p class="text-center" style="padding:1rem;color:var(--text-muted);">${tp('no_data')}</p>`;
            return;
        }

        container.innerHTML = `<div class="disc-list">${items.map(it => {
            const validation = it.timeline_type === 'workflow';
            const auteur = it.user_display_name || it.auteur || it.user_id || '';
            const mien = !validation && miens.includes(it.auteur || it.user_id);
            const date = (validation ? it.date_action : (it.date_creation || it.createdAt)) || '';
            const texte = validation ? it.commentaire : it.contenu;
            return `<div class="disc-item ${mien ? 'disc-mine' : ''} ${validation ? 'disc-validation' : ''}">
                <div class="disc-bubble">
                    <div class="disc-head">
                        <strong class="disc-author">${_esc(auteur)}</strong>
                        ${validation ? `<span class="disc-tag">${_esc(tp(it.action) || it.action)}</span>` : ''}
                        ${it.plan_version ? `<span class="disc-version">v${it.plan_version}</span>` : ''}
                        <span class="disc-date">${String(date).substring(0, 16).replace('T', ' ')}</span>
                        ${!validation && mien ? `<button class="btn-icon text-danger btn-xs" onclick="planDeleteComment('${it.id}','${planId}')" title="${tp('delete')}">${PLAN_ICONS.delete}</button>` : ''}
                    </div>
                    <div class="disc-body">${_esc(texte || '')}</div>
                </div>
            </div>`;
        }).join('')}</div>`;
    } catch (e) {
        container.innerHTML = `<p class="text-danger">${e.message}</p>`;
    }
}

function planShowCommentModal(planId) {
    const body = `
        <div class="form-group">
            <label>${tp('comment')}</label>
            <textarea class="form-input" id="commentContenu" rows="4"></textarea>
        </div>`;
    const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planCreateComment('${planId}')">${tp('save')}</button>`;
    planShowModal(tp('new_comment'), body, footer);
}

async function planCreateComment(planId) {
    const contenu = document.getElementById('commentContenu')?.value || '';
    if (!contenu.trim()) return;
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}/commentaires`, {
            method: 'POST', body: JSON.stringify({ contenu })
        });
        planCloseModal();
        planLoadComments(planId);
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planDeleteComment(comId, planId) {
    if (!await oasisConfirmer(tp('confirm_delete'))) return;
    try {
        await api(`${PLAN_MODULE_API}/commentaires/${comId}`, { method: 'DELETE' });
        planLoadComments(planId);
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// ══════════════════════════════════════
//  VERSION / WORKFLOW HISTORY MODALS
// ══════════════════════════════════════


async function planShowWorkflowHistory(planId) {
    try {
        const wfs = await api(`${PLAN_MODULE_API}/plans/${planId}/workflow`);
        const body = wfs.length ? `
        <table class="data-table">
            <thead><tr><th>${tp('action')}</th><th>${tp('utilisateur')}</th><th>${tp('version')}</th><th>${tp('date')}</th><th>${tp('comment')}</th></tr></thead>
            <tbody>${wfs.map(w => `<tr>
                <td>${_statusBadge(w.action)}</td><td>${_esc(w.user_id)}</td>
                <td>v${w.version || '-'}</td>
                <td>${(w.date_action || '').substring(0, 16)}</td><td>${_esc(w.commentaire)}</td>
            </tr>`).join('')}</tbody>
        </table>` : `<p>${tp('no_data')}</p>`;
        planShowModal(tp('workflow_history'), body);
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// ── Parse validator-merged commentaire to extract per-activity comments ──
// Ancien format de commentaire fusionné, encore présent dans l'historique :
//   <global comment>
//
//   Commentaires par activité:
//   • <activity objet> : <comment>
//   • <activity objet> : <comment>
function _parseActivityCommentsFromText(text) {
    if (!text) return { global: '', perActivity: [] };
    // Split on the heading (any locale) or the "•" bullet
    const headings = ['Commentaires par activité', 'Per-activity comments', 'Comentários por atividade'];
    let idx = -1;
    for (const h of headings) {
        const i = text.indexOf(h);
        if (i >= 0) { idx = i; break; }
    }
    const global = (idx >= 0 ? text.substring(0, idx) : text).trim();
    const block  = idx >= 0 ? text.substring(idx) : '';
    const perActivity = [];
    if (block) {
        const lines = block.split(/\r?\n/);
        lines.forEach(line => {
            const m = line.match(/^\s*[•\-*]\s*(.+?)\s*:\s*(.+)$/);
            if (m) perActivity.push({ objet: m[1].trim(), commentaire: m[2].trim() });
        });
    }
    return { global, perActivity };
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

// L'échappement vient du socle (oasis-commun.js) : un seul barème pour tous
// les modules. Le nom demeure, les gabarits n'ont rien à changer.
function _esc(v) { return oasisEsc(v); }

// Interpolation dans un attribut : les guillemets doivent partir aussi, ce que
// `_esc` ne fait pas — il passe par innerHTML, qui les laisse tels quels.
function _escAttr(v) { return oasisEsc(v); }

function _statusBadge(status) {
    const color = _statusColor(status);
    const label = tp(status) || status;
    return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

function _statusColor(status) {
    const colors = {
        brouillon: '#f59e0b', soumis: '#3b82f6', en_revue: '#8b5cf6',
        valide: '#10b981', rejete: '#ef4444', rejete_clos: '#991b1b', en_cours_amendement: '#f97316', archive: '#9ca3af', remplace: '#94a3b8',
        planifie: '#6366f1', en_cours: '#f59e0b', termine: '#10b981', annule: '#6b7280',
        creation: '#6366f1', soumission: '#3b82f6', validation: '#10b981',
        rejet: '#ef4444', amendement: '#f59e0b'
    };
    return colors[status] || '#6b7280';
}

function _planTypeBadge(type) {
    const colors = { periodique: '#3b82f6', annuel: '#3b82f6', inopine: '#f97316', ponctuel_special: '#8b5cf6' };
    const color = colors[type] || '#6b7280';
    const label = tp(type) || type;
    return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

function _riskBadge(riskLabel) {
    if (!riskLabel) return '-';
    const color = _riskColor(riskLabel);
    return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${_esc(riskLabel)}</span>`;
}

function _riskColor(label) {
    if (!label) return '#6b7280';
    const l = label.toLowerCase();
    if (l.includes('très élevé') || l.includes('very high')) return '#dc2626';
    if (l.includes('élevé') || l.includes('high')) return '#f97316';
    if (l.includes('modéré') || l.includes('moderate')) return '#f59e0b';
    if (l.includes('faible') || l.includes('low')) return '#10b981';
    if (l.includes('très faible') || l.includes('very low')) return '#059669';
    return '#6b7280';
}

// Prestataire color palette for calendar views
const _PRESTATAIRE_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#06b6d4', '#84cc16', '#ef4444', '#a855f7', '#f59e0b',
    '#10b981', '#6366f1', '#e11d48', '#0891b2', '#65a30d'
];
const _prestataireColorCache = {};
function _prestataireColor(prestataireId) {
    if (!prestataireId) return '#6b7280';
    if (_prestataireColorCache[prestataireId]) return _prestataireColorCache[prestataireId];
    const idx = Object.keys(_prestataireColorCache).length % _PRESTATAIRE_COLORS.length;
    _prestataireColorCache[prestataireId] = _PRESTATAIRE_COLORS[idx];
    return _prestataireColorCache[prestataireId];
}


// ══════════════════════════════════════
//  NOTIFICATION BELL
// ══════════════════════════════════════

function _getPlanNotifAlerts() {
    const D = PLAN_STATE.data;
    const alerts = [];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Draft plans pending submission
    const plans = D.plans || [];
    plans.forEach(p => {
        if (p.statut === 'brouillon') {
            alerts.push({ type: 'info', icon: PLAN_ICONS.plans, label: `${tp('brouillon')}: ${_esc(p.titre || '')}`, date: p.date_creation || '' });
        }
        // Rejected plans needing attention
        if (p.statut === 'rejete') {
            alerts.push({ type: 'overdue', icon: PLAN_ICONS.x, label: `${tp('rejete')}: ${_esc(p.titre || '')}`, date: p.date_validation || '' });
        }
        // Submitted plans awaiting validation (for validators)
        if (p.statut === 'soumis' && _canValidate()) {
            alerts.push({ type: 'task', icon: PLAN_ICONS.send, label: `${tp('pending_validation')}: ${_esc(p.titre || '')}`, date: p.date_soumission || '' });
        }
    });

    // 2. Activities with approaching deadlines (within 30 days)
    plans.filter(p => p.statut === 'valide').forEach(p => {
        (p.activites || []).forEach(a => {
            const dFin = a.date_fin ? new Date(a.date_fin) : null;
            if (dFin && dFin >= now && dFin <= in30) {
                const days = Math.ceil((dFin - now) / (24 * 60 * 60 * 1000));
                const prest = (D.prestataires || []).find(pr => pr.id === a.prestataire_id);
                alerts.push({ type: 'deadline', icon: PLAN_ICONS.clock, label: `${_esc(a.objet || a.titre || '')} - ${_esc(prest?.nom || '')}`, date: a.date_fin, days });
            }
            // Overdue activities
            if (dFin && dFin < now) {
                const daysLate = Math.ceil((now - dFin) / (24 * 60 * 60 * 1000));
                const prest = (D.prestataires || []).find(pr => pr.id === a.prestataire_id);
                alerts.push({ type: 'overdue', icon: PLAN_ICONS.clock, label: `${_esc(a.objet || a.titre || '')} - ${_esc(prest?.nom || '')} (${daysLate}j)`, date: a.date_fin, days: -daysLate });
            }
        });
    });

    // 3. High-risk providers needing attention
    const prestRisques = D.prestataireRisques || [];
    prestRisques.forEach(pr => {
        const risk = (pr.risk_label || '').toLowerCase();
        if (risk.includes('très élevé') || risk.includes('very high')) {
            alerts.push({ type: 'overdue', icon: PLAN_ICONS.shield, label: `${tp('very_high_risk')}: ${_esc(pr.nom || '')}`, date: '' });
        }
    });

    alerts.sort((a, b) => (a.days || 999) - (b.days || 999));
    return alerts;
}

function planUpdateNotifBadge() {
    const alerts = _getPlanNotifAlerts();
    const badge = document.getElementById('planNotifBadge');
    if (badge) {
        if (alerts.length > 0) {
            badge.textContent = alerts.length > 99 ? '99+' : alerts.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function planToggleNotifPanel() {
    const existing = document.getElementById('planNotifPanel');
    if (existing) { existing.remove(); return; }

    const alerts = _getPlanNotifAlerts();
    const panel = document.createElement('div');
    panel.id = 'planNotifPanel';
    panel.className = 'plan-notif-panel';
    panel.innerHTML = `
        <div class="plan-notif-panel-header">
            <strong>${PLAN_ICONS.bell} Notifications (${alerts.length})</strong>
            <button style="border:none;background:none;cursor:pointer;" onclick="document.getElementById('planNotifPanel')?.remove()">${PLAN_ICONS.close}</button>
        </div>
        <div class="plan-notif-panel-body">
            ${alerts.length === 0 ? `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">${tp('no_data')}</div>` :
            alerts.map(a => `
                <div class="plan-notif-item ${a.type}">
                    <div style="flex-shrink:0;">${a.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.84rem;font-weight:500;">${a.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">
                            ${a.days !== undefined ? (a.days < 0 ? `<span style="color:#ef4444;font-weight:600;">${Math.abs(a.days)}j en retard</span>` : `<span>J-${a.days}</span>`) : ''}
                            ${a.date ? `<span>${a.date.substring(0, 10)}</span>` : ''}
                        </div>
                    </div>
                </div>`).join('')}
        </div>`;

    const bell = document.querySelector('.plan-notif-bell');
    if (bell) {
        const rect = bell.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
    }
    document.body.appendChild(panel);

    setTimeout(() => {
        const handler = (e) => {
            if (!panel.contains(e.target) && !e.target.closest('.plan-notif-bell')) {
                panel.remove();
                document.removeEventListener('click', handler);
            }
        };
        document.addEventListener('click', handler);
    }, 100);
}
