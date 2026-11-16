// OASIS — Planification : les actes du circuit d'un plan — soumettre,
// décider, approuver, transmettre, amender — ses commentaires et l'historique
// de son circuit (ADR-003, 5.c — n° 5.f.108).
//
// La moitié « actes » de `pl-actions.js`, convertie à la lettre ; voir
// `affichage.ts`, dans le même paquet, dont elle prend l'échappement et les
// pastilles.
//
// Le brouillon d'une décision vit sur `window._planDecisionDraft`, comme à
// l'origine : la suite PLAN le lit là, entre la fenêtre de confirmation et son
// application.
import { donnees, etat, requis, tp } from './partage';
import { _esc, _statusBadge } from './affichage';

interface Activite { id: string; objet?: string; titre?: string; prestataire_id?: string; commentaire_validation?: string }
interface Plan { id: string; titre?: string; version?: number; activites?: Activite[] }
interface Brouillon {
  planId: string; decision: string; commentaire: string;
  perActivity: { activity_id: string; activity_objet: string; commentaire: string }[];
}
interface ElementFil {
  id?: string; timeline_type?: string; action?: string; commentaire?: string; contenu?: string;
  user_display_name?: string; auteur?: string; user_id?: string; plan_version?: number;
  date_action?: string; date_creation?: string; createdAt?: string;
}

declare global {
  interface Window {
    /** Le brouillon d'une décision, entre sa confirmation et son application. */
    _planDecisionDraft?: Brouillon | null;
  }
}

const toast = (m: unknown, t: string): unknown => requis('oasisToast')(m, t);
const confirmer = (m: string): Promise<boolean> => requis('oasisConfirmer')(m);
const saisir = (m: string, o?: Record<string, string>): Promise<string | null> => requis('oasisSaisir')(m, o);
const API = (): string => window.PLAN_MODULE_API;
const ouvert = (): Plan | null | undefined => (etat() as { selectedPlan?: Plan | null }).selectedPlan;

// ══════════════════════════════════════
//  WORKFLOW ACTIONS
// ══════════════════════════════════════

export function planSubmit(planId: string): void {
  const plan = ouvert();
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
  requis('planShowModal')(tp('confirm_submit_title'), body, footer);
}

export async function planConfirmSubmit(planId: string): Promise<void> {
  try {
    await window.api(`${API()}/plans/${planId}/soumettre`, {
      method: 'POST', body: JSON.stringify({ commentaire: '' }),
    });
    requis('planCloseModal')();
    await requis('planLoadData')();
    await requis('planOpenDetail')(planId);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

function _collectValidatorActivityComments(planId: string): Brouillon['perActivity'] {
  // Collect per-activity validator comments typed in the diff accordion.
  // Returns an array of { activity_id, activity_objet, commentaire }.
  const nodes = document.querySelectorAll<HTMLTextAreaElement>(`.validator-activity-comment[data-plan-id="${planId}"]`);
  const items: Brouillon['perActivity'] = [];
  nodes.forEach((n) => {
    const val = (n.value || '').trim();
    if (val) {
      items.push({
        activity_id: n.getAttribute('data-activity-id') || '',
        activity_objet: n.getAttribute('data-activity-objet') || '',
        commentaire: val,
      });
    }
  });
  return items;
}

// Le commentaire général est saisi dans le bloc de validation ; le clic sur
// Valider / Rejeter ouvre une confirmation reprenant la décision.
function _planGeneralComment(planId: string): string {
  return ((document.getElementById(`validComment_${planId}`) as HTMLTextAreaElement | null)?.value || '').trim();
}

export function planValidate(planId: string): void {
  _planConfirmDecision(planId, 'valider');
}

export function planReject(planId: string): void {
  _planConfirmDecision(planId, 'rejeter');
}

// Rejet définitif : le plan est rejeté et reste en lecture seule.
export function planRejectClose(planId: string): void {
  _planConfirmDecision(planId, 'rejeter-annuler');
}

function _planConfirmDecision(planId: string, decision: string): void {
  const plan: Partial<Plan> = donnees<Plan>('plans').find((p) => p.id === planId) || {};
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
  requis('planShowModal')(estClos ? tp('confirm_reject_close_title')
    : (estRejet ? tp('confirm_reject_title') : tp('confirm_validate_title')), body, footer);
}

export async function planApplyDecision(): Promise<void> {
  const d = window._planDecisionDraft;
  if (!d) return;
  const route = ['rejeter', 'rejeter-annuler'].includes(d.decision) ? d.decision : 'valider';
  try {
    await window.api(`${API()}/plans/${d.planId}/${route}`, {
      method: 'POST',
      body: JSON.stringify({ commentaire: d.commentaire, activity_comments: d.perActivity }),
    });
    window._planDecisionDraft = null;
    requis('planCloseModal')();
    await requis('planLoadData')();
    requis('planRenderPage')();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// Phase 7 — Approbation DG + transmission (Chap. 4 §4.2.3.e-f)
export async function planApprouverDG(planId: string): Promise<void> {
  // Les deux champs sont facultatifs et n'ont jamais suspendu l'approbation :
  // les boutons le disent, plutôt qu'un « Annuler » qui approuvait quand même.
  const commentaire = (await saisir(tp('commentaire_approbation_dg'),
    { titre: tp('approbation_dg_titre'), libelle: tp('suivant'), libelleAnnuler: tp('sans_commentaire') })) || '';
  const lettre = (await saisir(tp('lettre_transmission_prestataire'),
    { titre: tp('approbation_dg_titre'), libelle: tp('approuver'), libelleAnnuler: tp('sans_lettre') })) || '';
  try {
    await window.api(`${API()}/plans/${planId}/approuver-dg`, {
      method: 'POST', body: JSON.stringify({ commentaire, lettre_transmission: lettre }),
    });
    await requis('planLoadData')(); await requis('planOpenDetail')(planId);
    toast(tp('plan_approuve_dg_ok'), 'success');
  } catch (e) { toast((e as Error).message, 'error'); }
}

export async function planTransmettre(planId: string): Promise<void> {
  if (!await confirmer(tp('confirmer_plan_transmis'))) return;
  try {
    await window.api(`${API()}/plans/${planId}/transmettre`, { method: 'POST' });
    await requis('planLoadData')(); await requis('planOpenDetail')(planId);
    toast(tp('plan_transmis_ok'), 'success');
  } catch (e) { toast((e as Error).message, 'error'); }
}

export async function planAmend(planId: string): Promise<void> {
  // Confirmation dialog
  if (!await confirmer(tp('confirm_amend'))) return;
  const motif = await saisir(tp('reason'));
  if (motif === null) return;
  try {
    const result = await window.api(`${API()}/plans/${planId}/amender`, {
      method: 'POST', body: JSON.stringify({ motif }),
    }) as { new_plan_id?: string };
    await requis('planLoadData')();
    // Open the NEW amendment plan (copy in brouillon)
    if (result.new_plan_id) {
      await requis('planOpenDetail')(result.new_plan_id);
    } else {
      await requis('planOpenDetail')(planId);
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planCancelAmendment(planId: string): Promise<void> {
  if (!await confirmer(tp('confirm_cancel_amend'))) return;
  const comment = await saisir(tp('comment'));
  if (comment === null) return;
  try {
    const result = await window.api(`${API()}/plans/${planId}/annuler-amendement`, {
      method: 'POST', body: JSON.stringify({ commentaire: comment }),
    }) as { parent_plan_id?: string };
    await requis('planLoadData')();
    // Redirect to parent plan (which stays valide)
    if (result.parent_plan_id) {
      await requis('planOpenDetail')(result.parent_plan_id);
    } else {
      etat().currentPage = 'plans';
      requis('planRenderPage')();
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// Volet de lecture du commentaire de validation d'une activité (1/3 de
// l'écran, ouvert à droite). Le commentaire est saisi par le validateur
// depuis la page de validation du plan.
export function planShowValidationComment(actId: string): void {
  const plan = ouvert();
  const a = (plan?.activites || []).find((x) => x.id === actId)
    || donnees<Activite>('allActivites').find((x) => x.id === actId);
  if (!a) return;
  const prest = donnees<{ id: string; nom?: string }>('prestataires').find((p) => p.id === a.prestataire_id);
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
  requis('planShowModal')(tp('validation_comment'), body, footer, 'modal-drawer modal-drawer-1-3');
}

// ══════════════════════════════════════
//  COMMENTS (Timeline / Conversation)
// ══════════════════════════════════════

export async function planLoadComments(planId: string): Promise<void> {
  const container = document.getElementById('planCommentsContainer');
  if (!container) return;
  try {
    const all = await window.api(`${API()}/plans/${planId}/commentaires`) as ElementFil[];
    const me = ((etat().user || {}) as { username?: string; email?: string; id?: string });
    const miens = [me.username, me.email, me.id].filter(Boolean);
    const VALIDATION = ['valider', 'validation', 'rejeter', 'rejeter-annuler', 'rejet'];

    // Commentaires des utilisateurs + commentaires émis lors de la
    // validation ou du rejet du plan (affichés en rouge).
    const items = (all || []).filter((it) => it.timeline_type !== 'workflow'
      || (VALIDATION.includes(it.action || '') && it.commentaire));

    if (!items.length) {
      container.innerHTML = `<p class="text-center" style="padding:1rem;color:var(--text-muted);">${tp('no_data')}</p>`;
      return;
    }

    container.innerHTML = `<div class="disc-list">${items.map((it) => {
      const validation = it.timeline_type === 'workflow';
      const auteur = it.user_display_name || it.auteur || it.user_id || '';
      const mien = !validation && miens.includes(it.auteur || it.user_id);
      const date = (validation ? it.date_action : (it.date_creation || it.createdAt)) || '';
      const texte = validation ? it.commentaire : it.contenu;
      return `<div class="disc-item ${mien ? 'disc-mine' : ''} ${validation ? 'disc-validation' : ''}">
                <div class="disc-bubble">
                    <div class="disc-head">
                        <strong class="disc-author">${_esc(auteur)}</strong>
                        ${validation ? `<span class="disc-tag">${_esc(tp(it.action || '') || it.action)}</span>` : ''}
                        ${it.plan_version ? `<span class="disc-version">v${it.plan_version}</span>` : ''}
                        <span class="disc-date">${String(date).substring(0, 16).replace('T', ' ')}</span>
                        ${!validation && mien ? `<button class="btn-icon text-danger btn-xs" onclick="planDeleteComment('${it.id}','${planId}')" title="${tp('delete')}" aria-label="${tp('delete')}">${PLAN_ICONS.delete}</button>` : ''}
                    </div>
                    <div class="disc-body">${_esc(texte || '')}</div>
                </div>
            </div>`;
    }).join('')}</div>`;
  } catch (e) {
    container.innerHTML = `<p class="text-danger">${(e as Error).message}</p>`;
  }
}

export function planShowCommentModal(planId: string): void {
  const body = `
        <div class="form-group">
            <label>${tp('comment')}</label>
            <textarea class="form-input" id="commentContenu" rows="4"></textarea>
        </div>`;
  const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planCreateComment('${planId}')">${tp('save')}</button>`;
  requis('planShowModal')(tp('new_comment'), body, footer);
}

export async function planCreateComment(planId: string): Promise<void> {
  const contenu = (document.getElementById('commentContenu') as HTMLTextAreaElement | null)?.value || '';
  if (!contenu.trim()) return;
  try {
    await window.api(`${API()}/plans/${planId}/commentaires`, {
      method: 'POST', body: JSON.stringify({ contenu }),
    });
    requis('planCloseModal')();
    void planLoadComments(planId);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planDeleteComment(comId: string, planId: string): Promise<void> {
  if (!await confirmer(tp('confirm_delete'))) return;
  try {
    await window.api(`${API()}/commentaires/${comId}`, { method: 'DELETE' });
    void planLoadComments(planId);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ══════════════════════════════════════
//  VERSION / WORKFLOW HISTORY MODALS
// ══════════════════════════════════════

export async function planShowWorkflowHistory(planId: string): Promise<void> {
  try {
    const wfs = await window.api(`${API()}/plans/${planId}/workflow`) as (ElementFil & { version?: number })[];
    const body = wfs.length ? `
        <table class="data-table">
            <thead><tr><th>${tp('action')}</th><th>${tp('utilisateur')}</th><th>${tp('version')}</th><th>${tp('date')}</th><th>${tp('comment')}</th></tr></thead>
            <tbody>${wfs.map((w) => `<tr>
                <td>${_statusBadge(w.action)}</td><td>${_esc(w.user_id)}</td>
                <td>v${w.version || '-'}</td>
                <td>${(w.date_action || '').substring(0, 16)}</td><td>${_esc(w.commentaire)}</td>
            </tr>`).join('')}</tbody>
        </table>` : `<p>${tp('no_data')}</p>`;
    requis('planShowModal')(tp('workflow_history'), body);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ── Parse validator-merged commentaire to extract per-activity comments ──
// Ancien format de commentaire fusionné, encore présent dans l'historique :
//   <global comment>
//
//   Commentaires par activité:
//   • <activity objet> : <comment>
//   • <activity objet> : <comment>
export function _parseActivityCommentsFromText(text: unknown): { global: string; perActivity: { objet: string; commentaire: string }[] } {
  if (!text) return { global: '', perActivity: [] };
  const t = String(text);
  // Split on the heading (any locale) or the "•" bullet
  const headings = ['Commentaires par activité', 'Per-activity comments', 'Comentários por atividade'];
  let idx = -1;
  for (const h of headings) {
    const i = t.indexOf(h);
    if (i >= 0) { idx = i; break; }
  }
  const global = (idx >= 0 ? t.substring(0, idx) : t).trim();
  const block = idx >= 0 ? t.substring(idx) : '';
  const perActivity: { objet: string; commentaire: string }[] = [];
  if (block) {
    const lines = block.split(/\r?\n/);
    lines.forEach((line) => {
      const m = line.match(/^\s*[•\-*]\s*(.+?)\s*:\s*(.+)$/);
      if (m) perActivity.push({ objet: (m[1] as string).trim(), commentaire: (m[2] as string).trim() });
    });
  }
  return { global, perActivity };
}
