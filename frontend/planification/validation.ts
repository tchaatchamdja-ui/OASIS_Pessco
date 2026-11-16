// OASIS — Planification : la page de validation — les écarts entre versions,
// les décisions — et l'historique des plans (ADR-003, 5.c — n° 5.f.105).
//
// Converti à la lettre depuis `pl-validation.js` ; la photographie du lot — les
// deux pages sous leurs filtres, un amendement qui déplace, retire et ajoute
// une activité — n'a pas d'écart. `_applyPlanFilters`, défini par le paquet du
// tableau de bord, est lu sur la page : un paquet n'en importe pas un autre.
import { donnees, requis, tp } from './partage';

// ══════════════════════════════════════
//  WORKFLOW / VALIDATION PAGE
// ══════════════════════════════════════

interface Plan {
  id: string; titre?: string; annee?: number; type?: string; statut?: string; version?: number;
  secteur_id?: string; parent_plan_id?: string; nb_activites?: number;
  date_validation?: string; date_creation?: string;
}
type Activite = Record<string, unknown> & {
  id: string; plan_id?: string; parent_activite_id?: string; objet?: string; titre?: string;
  prestataire_id?: string; secteur_id?: string; responsable_id?: string;
  mode_supervision_id?: string; type_supervision_id?: string;
};
interface Ref { id: string; nom?: string; prenom?: string; code?: string; mode?: string; libelle?: string; type_supervision?: string }

interface Champ {
  key: string;
  label: () => string;
  isList?: boolean;
  resolve?: (id: unknown) => string;
}
interface Changement { field: Champ; from: string; to: string }
interface Ecart {
  added: Activite[]; removed: Activite[];
  modified: { activity: Activite; original: Activite; changes: Changement[] }[];
  totalCount: number;
}

const esc = (v: unknown): string => requis('_esc')(v);
const trouve = (coll: string, id: unknown): Ref | undefined => donnees<Ref>(coll).find((x) => x.id === id);

// Fields to compare for an amendment diff (key => label getter)
const _PLAN_DIFF_FIELDS: Champ[] = [
  { key: 'objet', label: () => tp('objet') },
  { key: 'titre', label: () => tp('plan_title') },
  { key: 'description_activite', label: () => tp('description_activite') },
  { key: 'date_debut', label: () => tp('start_date') },
  { key: 'date_fin', label: () => tp('end_date') },
  { key: 'priorite', label: () => tp('priority') },
  { key: 'risk_label', label: () => tp('risk_label') },
  { key: 'intensite', label: () => tp('intensity') },
  { key: 'frequence', label: () => tp('frequency') },
  { key: 'cycle_mois', label: () => tp('cycle') },
  { key: 'nombre_inspecteurs', label: () => tp('nombre_inspecteurs') },
  { key: 'notes', label: () => tp('notes') },
  { key: 'lieu_activite', label: () => tp('lieu_activite') },
  { key: 'prestataire_id', label: () => tp('provider'), resolve: (id) => { const p = trouve('prestataires', id); return p ? String(p.nom) : String(id || ''); } },
  { key: 'secteur_id', label: () => tp('sector'), resolve: (id) => { const s = trouve('secteurs', id); return s ? `${s.code} - ${s.nom}` : String(id || ''); } },
  { key: 'mode_supervision_id', label: () => tp('mode_supervision'), resolve: (id) => { const m = trouve('modesSupervision', id); return m ? (m.mode || m.libelle || '') : String(id || ''); } },
  { key: 'type_supervision_id', label: () => tp('type_supervision'), resolve: (id) => { const t = trouve('typesSupervision', id); return t ? (t.type_supervision || t.libelle || '') : String(id || ''); } },
  { key: 'responsable_id', label: () => tp('responsable_activite'), resolve: (id) => { const i = trouve('inspecteurs', id); return i ? ((i.nom || '') + ' ' + (i.prenom || '')).trim() : String(id || ''); } },
  { key: 'sous_activite_ids', label: () => tp('sub_activity'), isList: true, resolve: (id) => { const s = trouve('sousActivites', id); return s ? `${s.code} - ${s.nom}` : String(id || ''); } },
  { key: 'themes_couverts', label: () => tp('themes_couverts'), isList: true, resolve: (id) => { const t = trouve('themesSupervision', id); return t ? String(t.libelle) : String(id || ''); } },
];

export function _normalizeList(val: unknown): unknown[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((v) => v !== null && v !== undefined && v !== '');
  if (typeof val === 'string') {
    try { const p: unknown = JSON.parse(val); return Array.isArray(p) ? p.filter((v) => v !== null && v !== undefined && v !== '') : []; }
    catch { return val ? [val] : []; }
  }
  return [];
}

function _sameValue(a: unknown, b: unknown, isList?: boolean): boolean {
  if (isList) {
    const la = _normalizeList(a).slice().sort();
    const lb = _normalizeList(b).slice().sort();
    if (la.length !== lb.length) return false;
    return la.every((v, i) => v === lb[i]);
  }
  const na = (a === null || a === undefined) ? '' : String(a);
  const nb = (b === null || b === undefined) ? '' : String(b);
  // Date fields: compare just YYYY-MM-DD
  return na.substring(0, 10) === nb.substring(0, 10) || na === nb;
}

function _formatDiffValue(val: unknown, field: Champ): string {
  if (field.isList) {
    const list = _normalizeList(val);
    if (!list.length) return '—';
    return list.map((id) => (field.resolve ? field.resolve(id) : id)).join(', ');
  }
  if (val === null || val === undefined || val === '') return '—';
  if (field.resolve) return field.resolve(val) || '—';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  return String(val);
}

function _computeActivityDiff(newAct: Activite | undefined, oldAct: Activite | undefined): Changement[] {
  const changes: Changement[] = [];
  _PLAN_DIFF_FIELDS.forEach((f) => {
    const nv = newAct ? newAct[f.key] : undefined;
    const ov = oldAct ? oldAct[f.key] : undefined;
    if (!_sameValue(nv, ov, f.isList)) {
      changes.push({ field: f, from: _formatDiffValue(ov, f), to: _formatDiffValue(nv, f) });
    }
  });
  return changes;
}

function _computePlanDiff(currentPlan: Plan, overrideParentId?: string): Ecart | null {
  const parentId = overrideParentId || currentPlan.parent_plan_id;
  if (!parentId) return null;
  const allActs = donnees<Activite>('allActivites');
  const currentActs = allActs.filter((a) => a.plan_id === currentPlan.id);
  const parentActs = allActs.filter((a) => a.plan_id === parentId);

  // Activities across versions share the SAME root ancestor id.
  // Backend stores `parent_activite_id` = root ancestor id (walked back at amendment time),
  // so match via root key = (parent_activite_id || id).
  const rootKey = (a: Activite): string => a.parent_activite_id || a.id;
  const parentByRoot = new Map(parentActs.map((a) => [rootKey(a), a]));

  const added: Activite[] = [];
  const modified: Ecart['modified'] = [];
  const matchedParentIds = new Set<string>();

  currentActs.forEach((a) => {
    const key = rootKey(a);
    const orig = parentByRoot.get(key);
    if (orig) {
      matchedParentIds.add(orig.id);
      const changes = _computeActivityDiff(a, orig);
      if (changes.length) modified.push({ activity: a, original: orig, changes });
      // Unchanged activity → excluded from the diff entirely
    } else {
      added.push(a);
    }
  });

  const removed = parentActs.filter((a) => !matchedParentIds.has(a.id));
  return { added, removed, modified, totalCount: added.length + removed.length + modified.length };
}

function _renderPlanDiffBody(diff: Ecart | null, planId: string): string {
  if (!diff || diff.totalCount === 0) {
    return `<p style="padding:0.75rem;color:var(--text-muted);">${tp('no_modifications')}</p>`;
  }
  const _scope = planId || 'x';
  const peutValider = requis('_canValidate');
  const dateFr = requis('planDateFr');

  // Unified list: modified activities + added (new lines) + removed (lines removed).
  // Each activity = ONE list entry. Only impacted activities appear.
  const rows: string[] = [];

  // Modified activities: identification info + amended fields table
  diff.modified.forEach((m) => {
    const a = m.activity;
    const prest = trouve('prestataires', a.prestataire_id);
    const sect = trouve('secteurs', a.secteur_id);
    const resp = trouve('inspecteurs', a.responsable_id);
    const mode = trouve('modesSupervision', a.mode_supervision_id);
    const typeS = trouve('typesSupervision', a.type_supervision_id);
    const modeStr = mode ? esc(mode.mode || mode.libelle || '') : '—';
    const typeStr = typeS ? esc(typeS.type_supervision || typeS.libelle || '') : '—';
    const prestStr = prest ? esc(prest.nom) : '—';
    const sectStr = sect ? esc(sect.code + ' - ' + sect.nom) : '—';
    const respStr = resp ? esc(((resp.nom || '') + ' ' + (resp.prenom || '')).trim()) : '—';
    const objetStr = esc(a.objet || a.titre || '') || '—';
    const field = (label: string, value: string): string => `
            <span style="display:inline-flex;flex-direction:column;margin-right:1.25rem;">
                <span style="color:var(--text-muted);font-size:0.75rem;">${label}</span>
                <strong style="color:var(--text);">${value}</strong>
            </span>`;

    rows.push(`
        <li style="margin-bottom:0.75rem;padding:0.6rem 0.75rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);">
            <div style="display:flex;flex-wrap:wrap;gap:0.25rem 0;margin-bottom:0.5rem;">
                ${field(tp('provider'), prestStr)}
                ${field(tp('objet'), objetStr)}
                ${field(tp('sector'), sectStr)}
                ${field((tp('mode_supervision')) + ' / ' + (tp('type_supervision')), modeStr + ' / ' + typeStr)}
                ${field(tp('responsable_activite') || "Responsable de l'Activité", respStr)}
            </div>
            <div style="margin:0.25rem 0 0.3rem 0;color:var(--danger,#ef4444);font-size:0.85rem;font-weight:700;">
                ${m.changes.length} ${m.changes.length > 1 ? (tp('fields')) : (tp('field'))} ${tp('modif_modified') ? '— ' + tp('modif_modified').toLowerCase() : 'modifié(s)'}
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead><tr>
                    <th style="text-align:left;padding:0.2rem 0.5rem;border-bottom:1px solid var(--border);width:25%;color:var(--text-muted);font-weight:600;">${tp('field')}</th>
                    <th style="text-align:left;padding:0.2rem 0.5rem;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600;">${tp('old_value')}</th>
                    <th style="text-align:left;padding:0.2rem 0.5rem;border-bottom:1px solid var(--border);color:var(--text-muted);font-weight:600;">${tp('new_value')}</th>
                </tr></thead>
                <tbody>
                    ${m.changes.map((c) => `<tr>
                        <td style="padding:0.2rem 0.5rem;color:var(--text-muted);">${esc(c.field.label())}</td>
                        <td style="padding:0.2rem 0.5rem;text-decoration:line-through;color:#ef4444;font-weight:600;">${esc(c.from)}</td>
                        <td style="padding:0.2rem 0.5rem;"><strong style="color:#065f46;">${esc(c.to)}</strong></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            ${peutValider() ? `
            <div style="margin-top:0.5rem;">
                <label style="display:block;color:var(--text-muted);font-size:0.8rem;font-weight:600;margin-bottom:0.2rem;">
                    ${tp('validator_comment')}
                </label>
                <textarea
                    class="form-input validator-activity-comment"
                    data-plan-id="${_scope}"
                    data-activity-id="${m.activity.id}"
                    data-activity-objet="${esc(m.activity.objet || m.activity.titre || '')}"
                    rows="2"
                    placeholder="${tp('validator_comment_placeholder')}"
                    style="width:100%;font-size:0.85rem;"
                    onclick="event.stopPropagation();"></textarea>
            </div>` : ''}
        </li>`);
  });

  // Added activities: display ALL fields for validator review
  diff.added.forEach((a) => {
    const prest = trouve('prestataires', a.prestataire_id);
    const sect = trouve('secteurs', a.secteur_id);
    const resp = trouve('inspecteurs', a.responsable_id);
    const mode = trouve('modesSupervision', a.mode_supervision_id);
    const typeS = trouve('typesSupervision', a.type_supervision_id);
    const saList = _normalizeList(a.sous_activite_ids).map((id) => {
      const s = trouve('sousActivites', id);
      return s ? `${s.code} - ${s.nom}` : id;
    }).join(', ') || '—';
    const themesList = _normalizeList(a.themes_couverts).map((id) => {
      const t = trouve('themesSupervision', id);
      return t ? t.libelle : id;
    }).join(', ') || '—';
    const modeStr = mode ? esc(mode.mode || mode.libelle || '') : '—';
    const typeStr = typeS ? esc(typeS.type_supervision || typeS.libelle || '') : '—';
    const prestStr = prest ? esc(prest.nom) : '—';
    const sectStr = sect ? esc(sect.code + ' - ' + sect.nom) : '—';
    const respStr = resp ? esc(((resp.nom || '') + ' ' + (resp.prenom || '')).trim()) : '—';
    const objetStr = esc(a.objet || a.titre || '') || '—';
    const field = (label: string, value: unknown): string => `
            <span style="display:inline-flex;flex-direction:column;margin-right:1.25rem;margin-bottom:0.25rem;">
                <span style="color:var(--text-muted);font-size:0.75rem;">${label}</span>
                <strong style="color:var(--text);">${value}</strong>
            </span>`;

    rows.push(`
        <li style="margin-bottom:0.75rem;padding:0.6rem 0.75rem;border:1px solid var(--success,#10b981);border-radius:6px;background:rgba(16,185,129,0.06);">
            <div style="margin:0 0 0.4rem 0;color:var(--success,#10b981);font-size:0.85rem;font-weight:700;">
                + ${tp('modif_added_label_full')}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.25rem 0;margin-bottom:0.4rem;">
                ${field(tp('provider'), prestStr)}
                ${field(tp('objet'), objetStr)}
                ${field(tp('sector'), sectStr)}
                ${field((tp('mode_supervision')) + ' / ' + (tp('type_supervision')), modeStr + ' / ' + typeStr)}
                ${field(tp('responsable_activite') || "Responsable de l'Activité", respStr)}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.25rem 0;margin-bottom:0.4rem;">
                ${field(tp('description_activite'), esc(a.description_activite || '—') || '—')}
                ${field(tp('sub_activity'), esc(saList))}
                ${field(tp('themes_couverts'), esc(themesList))}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.25rem 0;margin-bottom:0.4rem;">
                ${field(tp('lieu_activite'), esc(a.lieu_activite || '') || '—')}
                ${field(tp('start_date'), dateFr(a.date_debut) || '—')}
                ${field(tp('end_date'), dateFr(a.date_fin) || '—')}
                ${field(tp('nombre_inspecteurs'), a.nombre_inspecteurs || '—')}
                ${field(tp('priority'), esc(a.priorite || '—'))}
                ${field(tp('risk_label'), esc(a.risk_label || '—'))}
                ${field(tp('frequency'), a.frequence || '—')}
                ${field(tp('intensity'), esc(a.intensite || '—'))}
                ${field(tp('cycle'), a.cycle_mois || '—')}
            </div>
            ${a.notes ? `<div style="margin-top:0.3rem;">${field(tp('notes'), esc(a.notes))}</div>` : ''}
            ${peutValider() ? `
            <div style="margin-top:0.5rem;">
                <label style="display:block;color:var(--text-muted);font-size:0.8rem;font-weight:600;margin-bottom:0.2rem;">
                    ${tp('validator_comment')}
                </label>
                <textarea
                    class="form-input validator-activity-comment"
                    data-plan-id="${_scope}"
                    data-activity-id="${a.id}"
                    data-activity-objet="${esc(a.objet || a.titre || '')}"
                    rows="2"
                    placeholder="${tp('validator_comment_placeholder')}"
                    style="width:100%;font-size:0.85rem;"
                    onclick="event.stopPropagation();"></textarea>
            </div>` : ''}
        </li>`);
  });

  // Removed activities
  diff.removed.forEach((a) => {
    rows.push(`
        <li style="margin-bottom:0.4rem;padding:0.4rem 0.5rem;border-bottom:1px solid var(--border);">
            <strong style="text-decoration:line-through;color:var(--text-muted);">${esc(a.objet || a.titre || '')}</strong>
            <span style="color:var(--text-muted);font-size:0.8rem;margin-left:0.5rem;">[${tp('modif_removed_label')}]</span>
        </li>`);
  });

  return `<ul style="list-style:none;padding:0.25rem 0.5rem;margin:0;">${rows.join('')}</ul>`;
}

function _renderPlanDiffAccordion(plan: Plan): string {
  const isAmendment = !!plan.parent_plan_id;
  const diff = isAmendment ? _computePlanDiff(plan) : null;
  let actionsHtml = '';
  if (requis('_canValidate')(plan.secteur_id)) {
    actionsHtml += `
        <button class="btn btn-success btn-sm" onclick="event.stopPropagation();planValidate('${plan.id}')">${PLAN_ICONS.check} ${tp('validate_plan')}</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();planReject('${plan.id}')">${PLAN_ICONS.x} ${tp('reject_plan')}</button>
        <button class="btn btn-outline btn-sm" style="border-color:#dc2626;color:#dc2626;" onclick="event.stopPropagation();planRejectClose('${plan.id}')" title="${tp('reject_close_hint')}">${PLAN_ICONS.x} ${tp('reject_close')}</button>`;
  }
  // L'approbation du directeur et la transmission ne sont plus ici : cette
  // page ne reçoit que des plans « soumis », et ces deux actes exigent un plan
  // validé — leurs boutons n'y apparaissaient jamais. Ils sont passés au
  // détail du plan (`planRenderPlanDetail`, ADR-003 n° 5.f.100).

  const badge = isAmendment
    ? `<span class="badge badge-warning">${tp('amendement')}</span>
           <span>${esc(tp('modif_count', diff ? diff.totalCount : 0))}</span>`
    : `<span class="badge badge-info">${tp('initial_version')}</span>
           <span>${esc(tp('acc_nb_activites', plan.nb_activites || 0))}</span>`;

  let bodyHtml: string;
  if (!isAmendment) {
    bodyHtml = `<p style="padding:0.5rem;color:var(--text-muted);">${tp('initial_version')} — ${plan.nb_activites || 0} ${tp('activities')}</p>`;
  } else {
    bodyHtml = _renderPlanDiffBody(diff, plan.id);
  }
  // Commentaire général de la décision : repris dans le fil « Discussions »
  bodyHtml += `<div class="valid-comment">
        <label for="validComment_${plan.id}">${tp('general_comment')}</label>
        <textarea class="form-input" id="validComment_${plan.id}" rows="2" placeholder="${tp('general_comment_hint')}"></textarea>
    </div>`;

  return `
    <div class="act-acc-item">
        <div class="act-acc-header act-acc-riche" role="button" tabindex="0" aria-expanded="false"
             onclick="planAccBasculer(this)" onkeydown="planAccClavier(event, this)">
            <span class="act-acc-chevron" aria-hidden="true">${PLAN_ICONS.chevron}</span>
            <strong class="act-acc-riche-titre"><a href="#" onclick="event.stopPropagation();planOpenDetail('${plan.id}');return false;">${esc(plan.titre)}</a></strong>
            <span class="act-acc-reperes">${plan.annee} · v${plan.version || 1} · ${requis('_planTypeBadge')(plan.type)}</span>
            <span class="act-acc-reperes">${badge}</span>
            <span class="act-acc-droite">${actionsHtml}</span>
        </div>
        <div class="act-acc-body" style="padding:0.75rem 1rem;">
            ${bodyHtml}
        </div>
    </div>`;
}

export function planRenderWorkflow(): string {
  let plans = donnees<Plan>('plans');
  plans = requis('_applyPlanFilters')(plans);
  let pending = plans.filter((p) => p.statut === 'soumis');
  // Per chain (same root plan), keep only the latest pending version
  const allById = new Map(plans.map((p) => [p.id, p]));
  const _rootIdOf = (p: Plan): string => {
    let cur: Plan | undefined = p; const seen = new Set<string>();
    while (cur && cur.parent_plan_id && allById.has(cur.parent_plan_id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = allById.get(cur.parent_plan_id);
    }
    return cur ? cur.id : p.id;
  };
  const latestByChain = new Map<string, Plan>();
  pending.forEach((p) => {
    const rid = _rootIdOf(p);
    const existing = latestByChain.get(rid);
    if (!existing || (p.version || 1) > (existing.version || 1)) latestByChain.set(rid, p);
  });
  pending = [...latestByChain.values()].sort((a, b) => (b.version || 1) - (a.version || 1) || (a.titre || '').localeCompare(b.titre || ''));

  return `
    <div class="page-content">
        <div class="page-header"><h2>${tp('workflow')}</h2></div>

        ${requis('_renderFilterBar')('planRenderPage()', { showPrestataire: true, showSousActivite: false, showTheme: false, showStatut: false, showYear: true })}

        <div class="card">
            <div class="card-header"><h3>${tp('pending_validation')} (${pending.length})</h3></div>
            <div class="card-body">
                ${pending.length ? `
                <div class="plan-activities-accordion">
                    ${pending.map((p) => _renderPlanDiffAccordion(p)).join('')}
                </div>` : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`}
            </div>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  HISTORY PAGE
// ══════════════════════════════════════

export function planRenderHistory(): string {
  let plans = donnees<Plan>('plans');
  plans = requis('_applyPlanFilters')(plans);
  const typeBadge = requis('_planTypeBadge');
  const statutBadge = requis('_statusBadge');
  const dateFr = requis('planDateFr');

  // Build amendment chains: link each plan to its root ancestor via parent_plan_id
  const byId = new Map(plans.map((p) => [p.id, p]));
  const rootOf = (p: Plan): Plan => {
    let cur: Plan = p;
    const seen = new Set<string>();
    while (cur.parent_plan_id && byId.has(cur.parent_plan_id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parent_plan_id) as Plan;
    }
    return cur;
  };

  // Group by root id
  const chains = new Map<string, { root: Plan; versions: Plan[] }>();
  plans.forEach((p) => {
    const root = rootOf(p);
    if (!chains.has(root.id)) chains.set(root.id, { root, versions: [] });
    chains.get(root.id)?.versions.push(p);
  });

  // Sort versions within each chain (newest version first)
  chains.forEach((chain) => {
    chain.versions.sort((a, b) => (b.version || 1) - (a.version || 1));
  });

  const chainList = [...chains.values()]
    .sort((a, b) => (b.root.annee || 0) - (a.root.annee || 0) || (a.root.titre || '').localeCompare(b.root.titre || ''));

  return `
    <div class="page-content">
        <div class="page-header"><h2>${tp('historique')}</h2></div>

        ${requis('_renderFilterBar')('planRenderPage()', { showPrestataire: false, showSousActivite: false, showTheme: false, showStatut: true, showYear: true })}

        <div class="plan-activities-accordion">
            ${chainList.length ? chainList.map((chain) => {
                const root = chain.root;
                const versions = chain.versions; // newest → oldest
                const latest = versions[0] as Plan;
                const maxVersion = latest.version || 1;
                // Build parent map by id within the chain (same byId above covers it)
                const versionsHtml = versions.map((v) => {
                    const vParent = v.parent_plan_id && byId.has(v.parent_plan_id) ? byId.get(v.parent_plan_id) : null;
                    const isAmend = !!vParent;
                    const diff = isAmend ? _computePlanDiff(v) : null;
                    const modifCount = diff ? diff.totalCount : 0;
                    const diffRowId = `plan-diff-${v.id}`;
                    const hasDiff = isAmend;
                    return `
                    <tr>
                        <td>
                            ${hasDiff ? `<button class="btn-icon" onclick="const r=document.getElementById('${diffRowId}');r.style.display=r.style.display==='none'?'':'none';this.classList.toggle('expanded');" title="${tp('amendment_modifications')}" aria-label="${tp('amendment_modifications')}">${PLAN_ICONS.chevron}</button>` : ''}
                            v${v.version || 1}
                        </td>
                        <td>${statutBadge(v.statut)}</td>
                        <td>${dateFr(v.date_validation || v.date_creation) || '-'}</td>
                        <td>${isAmend ? `<span style="color:var(--warning);">${tp('amendement')} — ${(tp('modif_count')).replace('{0}', String(modifCount))}</span>` : `<span style="color:var(--text-muted);">${tp('initial_version')}</span>`}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="planExportPDF('${v.id}')" title="${tp('download_pdf')}">
                                ${PLAN_ICONS.pdf} v${v.version || 1}
                            </button>
                            <button class="btn-icon" onclick="planShowWorkflowHistory('${v.id}')" title="${tp('workflow_history')}" aria-label="${tp('workflow_history')}">${PLAN_ICONS.workflow}</button>
                            <button class="btn-icon" onclick="planOpenDetail('${v.id}')" title="${tp('details')}" aria-label="${tp('details')}">${PLAN_ICONS.eye}</button>
                        </td>
                    </tr>
                    ${hasDiff && vParent ? `
                    <tr id="${diffRowId}" style="display:none;">
                        <td colspan="5" style="background:var(--bg-muted,#f9fafb);padding:0.75rem 1rem;">
                            <h5 style="margin:0 0 0.5rem 0;">${tp('amendment_modifications')} (v${vParent.version || 1} → v${v.version || 1})</h5>
                            ${_renderPlanDiffBody(diff, v.id)}
                        </td>
                    </tr>` : ''}`;
                }).join('');
                return `
                <div class="act-acc-item">
                    <div class="act-acc-header act-acc-riche" role="button" tabindex="0" aria-expanded="false"
                         onclick="planAccBasculer(this)" onkeydown="planAccClavier(event, this)">
                        <span class="act-acc-chevron" aria-hidden="true">${PLAN_ICONS.chevron}</span>
                        <strong class="act-acc-riche-titre">${esc(root.titre)}</strong>
                        <span class="act-acc-reperes act-acc-droite">
                            ${typeBadge(root.type)}
                            ${statutBadge(latest.statut)}
                            <span>${root.annee} | ${versions.length} ${versions.length > 1 ? 'versions' : 'version'} (v${maxVersion})</span>
                        </span>
                    </div>
                    <div class="act-acc-body">
                        <table class="data-table">
                            <thead><tr>
                                <th>${tp('version')}</th><th>${tp('status')}</th>
                                <th>${tp('validation')}</th><th>${tp('amendment_modifications')}</th><th>${tp('actions')}</th>
                            </tr></thead>
                            <tbody>${versionsHtml}</tbody>
                        </table>
                    </div>
                </div>`;
            }).join('') : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`}
        </div>
    </div>`;
}
