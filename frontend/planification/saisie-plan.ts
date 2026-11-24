// OASIS — Planification : les fenêtres d'un plan — sa création, son édition,
// son archivage, sa suppression —, le volet des prestataires de son secteur,
// et la synchronisation des risques (ADR-003, 5.c — n° 5.f.107).
//
// La première moitié de `pl-crud.js`, converti à la lettre, avec
// `saisie-activite.ts` : le fichier passait les 600 lignes accordées à un
// fichier de frontend. Les deux modules vont dans le même paquet. La
// photographie — chaque fenêtre, chaque refus de saisie, chaque confirmation
// refusée puis acceptée, et **ce qui part au serveur**, appel par appel et
// corps compris — n'a pas d'écart.
import { donnees, etat, requis, tp } from './partage';

interface Plan {
  id: string; titre?: string; annee?: number; type?: string; statut?: string; domaine_id?: string;
  secteur_id?: string; activites?: { prestataire_id?: string }[];
}
interface Ref {
  id: string; code?: string; nom?: string; libelle?: string; trigramme?: string; secteur_id?: string;
  sous_activite_id?: string; statut?: string; actif?: boolean | number;
}
interface Risque { id: string; risk_label?: string; csrbo?: number | string; resultats?: { sousActivites?: Record<string, { freq?: number }>; sous_activites?: Record<string, { freq?: number }> } }
interface Changement {
  prestataire_id: string; type?: string;
  current?: { risk_label?: string; csrbo?: number | string };
  avant?: { risk_label?: string; csrbo?: number | string }; apres?: { risk_label?: string; csrbo?: number | string };
}

export const esc = (v: unknown): string => requis('_esc')(v);
export const toast = (m: unknown, t: string): unknown => requis('oasisToast')(m, t);
export const E = etat;
const valeur = (id: string): string => (document.getElementById(id) as HTMLInputElement | null)?.value || '';
const API = (): string => window.PLAN_MODULE_API;

// ══════════════════════════════════════
//  CRUD OPERATIONS
// ══════════════════════════════════════

export function planShowCreateModal(subMenu = 'planifiees'): void {
  const domaines = donnees<Ref>('domaines');
  const secteurs = donnees<Ref>('secteurs');
  const currentYear = new Date().getFullYear();

  // Default type based on sub-menu
  let defaultType = 'periodique';
  if (subMenu === 'inopinees') defaultType = 'inopine';
  else if (subMenu === 'speciale') defaultType = 'ponctuel_special';

  const body = `
    <div class="form-grid">
        <div class="form-group full-width">
            <label>${tp('plan_title')}</label>
            <input type="text" class="form-input" id="planTitre" value="Plan de Surveillance ${currentYear}">
        </div>
        <div class="form-group">
            <label>${tp('year')}</label>
            <input type="number" class="form-input" id="planAnnee" value="${currentYear}">
        </div>
        <div class="form-group">
            <label>${tp('plan_type')}</label>
            <select class="form-select" id="planType">
                <option value="periodique" ${defaultType === 'periodique' ? 'selected' : ''}>${tp('periodic')}</option>
                <option value="inopine" ${defaultType === 'inopine' ? 'selected' : ''}>${tp('inopine')}</option>
                <option value="ponctuel_special" ${defaultType === 'ponctuel_special' ? 'selected' : ''}>${tp('ponctuel_special')}</option>
            </select>
        </div>
        <div class="form-group">
            <label>${tp('domain')}</label>
            <select class="form-select" id="planDomaine">
                <option value="">${tp('all_domains')}</option>
                ${domaines.map((d) => `<option value="${d.id}">${d.code} - ${esc(d.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('sector')}</label>
            <select class="form-select" id="planSecteur">
                <option value="">${tp('all_sectors')}</option>
                ${secteurs.map((s) => `<option value="${s.id}">${s.code} - ${esc(s.nom)}</option>`).join('')}
            </select>
        </div>
    </div>`;

  const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planCreatePlan()">${tp('save')}</button>`;

  requis('planShowModal')(tp('new_plan'), body, footer);
}

// Volet des prestataires actifs du secteur, déplié par le chevron placé
// devant le titre du plan. Pour chaque prestataire : les thèmes de
// supervision du secteur, leur fréquence (issue du profil de risque,
// nombre de surveillances par cycle de la sous-activité) et le nombre de
// fois où le thème est déjà planifié dans ce plan.
// Réservé aux plans périodiques : les plans inopinés et ponctuels ne
// découlent pas des fréquences du cycle de surveillance.
export function planPrestThemesPanel(plan: Plan | null | undefined): string {
  if (!plan || plan.type !== 'periodique' || !plan.secteur_id) return '';
  const secteurId = plan.secteur_id;
  const actif = (o: Ref): boolean => (o.statut ? o.statut === 'actif' : (o.actif !== false && o.actif !== 0));
  const prestataires = donnees<Ref>('prestataires').filter((p) => p.secteur_id === secteurId && actif(p));
  const themes = donnees<Ref>('themesSupervision').filter((th) => th.secteur_id === secteurId && actif(th));
  const sousActivites = donnees<Ref>('sousActivites');
  const risques = donnees<Risque>('prestataireRisques');
  const riskBadge = requis('_riskBadge');

  if (!prestataires.length) {
    return `<div class="plan-prest-empty">${tp('no_active_provider_sector')}</div>`;
  }

  // Activités déjà planifiées dans ce plan
  const activites = donnees<{ plan_id?: string; prestataire_id?: string; themes_couverts?: unknown }>('allActivites')
    .filter((a) => a.plan_id === plan.id);
  const themesDe = (a: { themes_couverts?: unknown }): unknown[] => {
    const raw = a.themes_couverts;
    if (!raw) return [];
    try { return (typeof raw === 'string' ? JSON.parse(raw) : raw) as unknown[]; } catch { return []; }
  };
  const planValide = ['valide', 'approuve_dg', 'transmis', 'archive', 'remplace'].includes(plan.statut || '');
  const couleurPlanifie = planValide ? '#15803d' : '#ea580c';

  const cartes = prestataires.map((p) => {
    const rq: Partial<Risque> = risques.find((r) => r.id === p.id) || {};
    const saRes = (rq.resultats && (rq.resultats.sousActivites || rq.resultats.sous_activites)) || {};
    const actsPrest = activites.filter((a) => a.prestataire_id === p.id);
    const lignes = themes.map((th) => {
      const sa = sousActivites.find((x) => x.id === th.sous_activite_id);
      const freq = saRes[th.sous_activite_id || '']?.freq;
      const nbPlan = actsPrest.filter((a) => themesDe(a).includes(th.id)).length;
      const saLbl = sa ? `${sa.code || ''} - ${sa.nom || ''}` : '';
      return `<tr>
                <td data-sort="${esc(th.code || '')}"><strong>${esc(th.code || '')}</strong></td>
                <td data-sort="${esc(th.libelle || th.nom || '')}">${esc(th.libelle || th.nom || '')}</td>
                <td data-sort="${esc(saLbl)}">${saLbl ? esc(saLbl) : '-'}</td>
                <td data-sort="${freq || 0}" style="text-align:center;white-space:nowrap;">${freq
                    ? `<strong>${freq}</strong>x / ${tp('cycle_unit')}`
                    : `<span class="text-muted">-</span>`}</td>
                <td data-sort="${nbPlan}" style="text-align:center;">
                    <strong style="color:${couleurPlanifie};">${nbPlan}</strong></td>
            </tr>`;
    }).join('');

    const th = (label: string, col: number, align?: string): string =>
      `<th style="cursor:pointer;user-select:none;white-space:nowrap;${align ? `text-align:${align};` : ''}"
                 onclick="planSortThemeTable(this,${col})" title="${tp('sort')}">${label}<span class="sort-ind"></span></th>`;

    return `<details class="plan-prest-item">
            <summary class="plan-prest-summary">
                <strong>${esc(p.nom || '')}</strong>
                ${p.trigramme ? `<span class="text-muted">(${esc(p.trigramme)})</span>` : ''}
                <span style="margin-left:auto;display:inline-flex;align-items:center;gap:0.4rem;">
                    ${rq.risk_label ? riskBadge(rq.risk_label) : `<span class="text-muted" style="font-size:0.75rem;">${tp('no_risk_profile_data')}</span>`}
                    ${rq.csrbo ? `<span class="text-muted" style="font-size:0.75rem;">CSRBO ${rq.csrbo} ${tp('months_unit')}</span>` : ''}
                    <span class="text-muted" style="font-size:0.75rem;">${themes.length} ${tp('themes_count')}</span>
                    ${requis('_canContribute')() ? `<button class="btn btn-primary btn-sm"
                        onclick="event.stopPropagation();event.preventDefault();planOpenDetailForPrestataire('${plan.id}','${p.id}')"
                        title="${tp('plan_activity_for_provider')}">${PLAN_ICONS.add} ${tp('plan_activity')}</button>` : ''}
                </span>
            </summary>
            ${themes.length ? `<table class="data-table plan-theme-table" style="margin:0;width:100%;background:var(--bg);">
                <thead><tr>
                    ${th(tp('code_label'), 0)}
                    ${th(tp('theme_label'), 1)}
                    ${th(tp('sub_activity'), 2)}
                    ${th(tp('frequency'), 3, 'center')}
                    ${th(tp('planned'), 4, 'center')}
                </tr></thead>
                <tbody>${lignes}</tbody>
            </table>` : `<p class="text-muted" style="padding:0.5rem 0.75rem;font-size:0.82rem;font-style:italic;">${tp('no_theme_sector')}</p>`}
        </details>`;
  }).join('');

  return `<div class="plan-prest-body">${cartes}</div>`;
}

// Tri d'une table de thèmes, sur place : le volet reste ouvert.
export function planSortThemeTable(thEl: HTMLElement, col: number): void {
  const table = thEl.closest('table');
  const tbody = table && table.tBodies[0];
  if (!table || !tbody) return;
  const dir = thEl.dataset.dir === 'asc' ? 'desc' : 'asc';
  table.querySelectorAll('th').forEach((h) => {
    h.dataset.dir = '';
    const ind = h.querySelector('.sort-ind');
    if (ind) ind.textContent = '';
  });
  thEl.dataset.dir = dir;
  const ind = thEl.querySelector('.sort-ind');
  if (ind) ind.textContent = dir === 'asc' ? ' ▲' : ' ▼';

  const val = (tr: HTMLTableRowElement): string => {
    const c = tr.cells[col];
    return c ? (c.dataset.sort !== undefined ? c.dataset.sort : (c.textContent || '').trim()) : '';
  };
  const rows = [...tbody.rows].sort((a, b) => {
    const va = val(a); const vb = val(b);
    const na = parseFloat(va); const nb = parseFloat(vb);
    const cmp = (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '')
      ? na - nb : String(va).localeCompare(String(vb));
    return dir === 'asc' ? cmp : -cmp;
  });
  rows.forEach((r) => tbody.appendChild(r));
}

// Déplie / replie le volet d'un plan depuis le chevron du titre.
export function planTogglePrestRow(planId: string, btn?: HTMLElement): void {
  const row = document.getElementById(`prestRow_${planId}`);
  if (!row) return;
  const ouvert = row.hasAttribute('hidden');
  if (ouvert) row.removeAttribute('hidden'); else row.setAttribute('hidden', '');
  if (btn) btn.classList.toggle('expanded', ouvert);
}

// Ouvre le plan avec le prestataire mémorisé : ses données pré-renseignent
// le formulaire de création d'activité.
export function planOpenDetailForPrestataire(planId: string, prestId: string): void {
  E().prefillPrestataire = prestId;
  E()._keepPrefill = true;
  void requis('planOpenDetail')(planId);
}

export async function planCreatePlan(): Promise<void> {
  const data = {
    titre: valeur('planTitre'),
    annee: parseInt(valeur('planAnnee')) || new Date().getFullYear(),
    type: valeur('planType') || 'periodique',
    domaine_id: valeur('planDomaine'),
    secteur_id: valeur('planSecteur'),
  };
  try {
    await window.api(`${API()}/plans`, { method: 'POST', body: JSON.stringify(data) });
    requis('planCloseModal')();
    await requis('planLoadData')();
    requis('planNavigateTo')('plans');
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export function planShowEditModal(planId: string): void {
  const plan = donnees<Plan>('plans').find((p) => p.id === planId);
  if (!plan) return;
  const domaines = donnees<Ref>('domaines');
  const secteurs = donnees<Ref>('secteurs');

  const body = `
    <div class="form-grid">
        <div class="form-group full-width">
            <label>${tp('plan_title')}</label>
            <input type="text" class="form-input" id="editPlanTitre" value="${esc(plan.titre)}">
        </div>
        <div class="form-group">
            <label>${tp('year')}</label>
            <input type="number" class="form-input" id="editPlanAnnee" value="${plan.annee}">
        </div>
        <div class="form-group">
            <label>${tp('plan_type')}</label>
            <select class="form-select" id="editPlanType">
                <option value="periodique" ${plan.type === 'periodique' || plan.type === 'annuel' ? 'selected' : ''}>${tp('periodic')}</option>
                <option value="inopine" ${plan.type === 'inopine' ? 'selected' : ''}>${tp('inopine')}</option>
                <option value="ponctuel_special" ${plan.type === 'ponctuel_special' ? 'selected' : ''}>${tp('ponctuel_special')}</option>
            </select>
        </div>
        <div class="form-group">
            <label>${tp('domain')}</label>
            <select class="form-select" id="editPlanDomaine">
                <option value="">${tp('all_domains')}</option>
                ${domaines.map((d) => `<option value="${d.id}" ${plan.domaine_id === d.id ? 'selected' : ''}>${d.code} - ${esc(d.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('sector')}</label>
            <select class="form-select" id="editPlanSecteur">
                <option value="">${tp('all_sectors')}</option>
                ${secteurs.map((s) => `<option value="${s.id}" ${plan.secteur_id === s.id ? 'selected' : ''}>${s.code} - ${esc(s.nom)}</option>`).join('')}
            </select>
        </div>
    </div>`;

  const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planUpdatePlan('${planId}')">${tp('save')}</button>`;

  requis('planShowModal')(tp('edit') + ' - ' + esc(plan.titre), body, footer);
}

export async function planUpdatePlan(planId: string): Promise<void> {
  const data = {
    titre: valeur('editPlanTitre'),
    annee: parseInt(valeur('editPlanAnnee')) || new Date().getFullYear(),
    type: valeur('editPlanType') || 'periodique',
    domaine_id: valeur('editPlanDomaine'),
    secteur_id: valeur('editPlanSecteur'),
  };
  try {
    await window.api(`${API()}/plans/${planId}`, { method: 'PUT', body: JSON.stringify(data) });
    requis('planCloseModal')();
    await requis('planLoadData')();
    if (E().selectedPlan?.id === planId) {
      await requis('planOpenDetail')(planId);
    } else {
      requis('planRenderPage')();
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planDeletePlan(planId: string): Promise<void> {
  if (!await requis('oasisConfirmer')(tp('confirm_delete'))) return;
  try {
    await window.api(`${API()}/plans/${planId}`, { method: 'DELETE' });
    await requis('planLoadData')();
    requis('planNavigateTo')('plans');
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planArchivePlan(planId: string): Promise<void> {
  if (!await requis('oasisConfirmer')(tp('confirm_archive'))) return;
  try {
    await window.api(`${API()}/plans/${planId}/archiver`, { method: 'POST' });
    await requis('planLoadData')();
    requis('planRenderPage')();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ══════════════════════════════════════
//  IMPORT / SYNC RISK PROFILES
// ══════════════════════════════════════

// Ephemeral toast for planification module (5-second default)
export function planShowEphemeralToast(message: unknown, type = 'info', duration = 5000): unknown {
  if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
  return window.oasisToast(message, type, duration);
}

export async function planSyncRisksSelective(planId: string): Promise<void> {
  try {
    const result = await window.api(`${API()}/plans/${planId}/sync-risques`) as { has_changes?: boolean; changes?: Changement[] };
    if (!result.has_changes) {
      planShowEphemeralToast(tp('sync_no_changes'), 'info', 4000);
      return;
    }

    const changes = result.changes || [];
    const prestMap: Record<string, string | undefined> = {};
    donnees<Ref>('prestataires').forEach((p) => { prestMap[p.id] = p.nom; });

    // Check which prestataires already have activities in this plan
    const plan = E().selectedPlan;
    const existingPrestIds = new Set((plan?.activites || []).map((a) => a.prestataire_id));

    const rows = changes.map((c) => {
      const prestNom = esc(prestMap[c.prestataire_id] || c.prestataire_id);
      const isNew = c.type === 'nouveau';
      const alreadyImported = existingPrestIds.has(c.prestataire_id);

      let changeDetail = '';
      if (isNew) {
        changeDetail = `<span class="status-badge" style="background:#10b98120;color:#10b981;border:1px solid #10b98140;">${tp('sync_type_nouveau')}</span>`;
        if (c.current) changeDetail += ` <small>${tp('sync_risk_change')}: ${esc(c.current.risk_label || '-')}, ${tp('sync_cycle_change')}: ${c.current.csrbo || '-'}</small>`;
      } else {
        changeDetail = `<span class="status-badge" style="background:#f59e0b20;color:#f59e0b;border:1px solid #f59e0b40;">${tp('sync_type_modifie')}</span>`;
        if (c.avant && c.apres) {
          const parts: string[] = [];
          if (c.avant.risk_label !== c.apres.risk_label) parts.push(`${tp('sync_risk_change')}: ${esc(c.avant.risk_label)} → ${esc(c.apres.risk_label)}`);
          if (c.avant.csrbo !== c.apres.csrbo) parts.push(`${tp('sync_cycle_change')}: ${c.avant.csrbo} → ${c.apres.csrbo}`);
          changeDetail += ` <small>${parts.join(', ')}</small>`;
        }
      }

      const disabledAttr = (alreadyImported && isNew) ? 'disabled' : '';
      const checkedAttr = (alreadyImported && isNew) ? '' : 'checked';
      const rowOpacity = (alreadyImported && isNew) ? 'opacity:0.5;' : '';

      return `<tr style="${rowOpacity}">
                <td><input type="checkbox" class="sync-check" data-pid="${c.prestataire_id}" ${checkedAttr} ${disabledAttr}></td>
                <td><strong>${prestNom}</strong></td>
                <td>${changeDetail}</td>
                <td>${(alreadyImported && isNew) ? `<span style="color:var(--text-muted);font-size:0.75rem;">${tp('sync_already_imported')}</span>` : ''}</td>
            </tr>`;
    }).join('');

    const isValidated = plan?.statut === 'valide';
    const amendWarning = isValidated ? `
            <div style="background:#f59e0b15;border:1px solid #f59e0b40;border-radius:8px;padding:0.6rem 0.8rem;margin-bottom:0.75rem;font-size:0.82rem;color:#92400e;">
                <strong>⚠ ${tp('amendment_in_progress')}</strong> — Ce plan est validé. L'application des changements créera automatiquement une version brouillon (amendement) du plan.
            </div>` : '';

    const body = `
            ${amendWarning}
            <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.75rem;">
                <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;cursor:pointer;">
                    <input type="checkbox" id="syncSelectAll" checked onchange="document.querySelectorAll('.sync-check:not([disabled])').forEach(cb=>cb.checked=this.checked);">
                    ${tp('sync_select_all')}
                </label>
                <span style="color:var(--text-muted);font-size:0.8rem;">${tp('sync_changes', changes.length)}</span>
            </div>
            <div style="max-height:400px;overflow-y:auto;">
                <table class="data-table" style="font-size:0.82rem;">
                    <thead><tr><th style="width:30px;"></th><th>${tp('provider')}</th><th>${tp('status')}</th><th></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

    const footer = `
            <button class="btn btn-primary" onclick="planApplySyncSelection('${planId}')">${tp('sync_apply_selected')}</button>
            <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>`;

    requis('planShowModal')(tp('sync_select_changes'), body, footer, 'modal-lg');
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planApplySyncSelection(planId: string): Promise<void> {
  const checks = document.querySelectorAll<HTMLInputElement>('.sync-check:checked:not([disabled])');
  const pids = [...checks].map((cb) => cb.dataset.pid);
  if (!pids.length) {
    planShowEphemeralToast(tp('select_at_least_one'), 'warning', 3000);
    return;
  }
  try {
    const result = await window.api(`${API()}/plans/${planId}/apply-sync`, {
      method: 'POST',
      body: JSON.stringify({ prestataire_ids: pids }),
    }) as { amended?: boolean; target_plan_id?: string; activities_created?: number; skipped?: number };
    requis('planCloseModal')();
    await requis('planLoadData')();

    if (result.amended && result.target_plan_id) {
      // Plan was auto-amended — navigate to the new brouillon amendment
      const newPlan = donnees<{ id: string; version?: number }>('plans').find((p) => p.id === result.target_plan_id);
      const version = newPlan ? newPlan.version : '?';
      planShowEphemeralToast(tp('sync_auto_amended', version), 'success', 7000);
      await requis('planOpenDetail')(result.target_plan_id);
    } else {
      planShowEphemeralToast(tp('sync_applied', result.activities_created, result.skipped), 'success', 5000);
      await requis('planOpenDetail')(planId);
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}
