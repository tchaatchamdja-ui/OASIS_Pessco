// OASIS — Planification : les profils de risque des prestataires, et leurs
// cycles de surveillance (ADR-003, 5.c — n° 5.f.104).
//
// Converti à la lettre depuis `pl-prestataires.js` : le balisage est rendu
// caractère pour caractère, et la photographie de la page — vingt états, des
// filtres à la fenêtre d'ajout — n'a pas d'écart. L'état et les libellés sont
// lus sur la page (`partage.ts`) ; les aides des autres paquets, que leur sas
// déclare, sont exigées au moment de l'appel, comme l'ancien les lisait par
// leur nom.
import { etat, requis, tp } from './partage';

interface PrestRisque {
  id: string; nom?: string; domaine_id?: string; secteur_id?: string; risk_label?: string;
  csrbo?: number | string; intensite?: string; debut_cycle?: string; fin_cycle?: string;
  evaluation_date?: string; resultats?: unknown;
}
interface Prestataire { id: string; nom: string; trigramme?: string; secteur_id?: string }
interface Secteur { id: string; code: string; nom: string }
interface SousActivite { id: string; code: string; nom: string; secteur_id?: string }
interface ProfilRisque { prestataire_id: string; date_validation?: string }
interface DetailSA {
  id: string; nom: string; risk_label: string; risk_desc: string;
  csrbo: unknown; frequence: unknown; intensite: unknown;
}
/** Le risque d'une sous-activité : une case de matrice, ou l'ancien objet. */
interface RisqueSA { label?: string; risk?: string; csrbo?: unknown; freq?: unknown; intensite?: unknown }
interface ResultatSA {
  risk?: RisqueSA | string; riskLabel?: string; risk_desc?: string;
  csrbo?: unknown; freq?: unknown; frequence?: unknown; intensite?: unknown;
}

/** Une liste des données chargées. Elles viennent du serveur, sans schéma ici. */
function liste<T>(nom: string): T[] {
  return (etat().data[nom] || []) as T[];
}

const esc = (v: unknown): string => requis('_esc')(v);
// Le socle déclare `oasisToast` optionnel : il est exigé à l'appel, comme le reste.
const toast = (message: unknown, type: string): unknown => requis('oasisToast')(message, type);
const champ = (id: string): HTMLInputElement | null => document.getElementById(id) as HTMLInputElement | null;

// ══════════════════════════════════════
//  PRESTATAIRES PAGE
// ══════════════════════════════════════

export function planRenderPrestataires(): string {
  const prestRisques = liste<PrestRisque>('prestataireRisques');
  // Map validation dates from shared risk profiles (profil de risque module)
  const riskProfiles = liste<ProfilRisque>('riskProfiles');
  const rpByPrestId = new Map(riskProfiles.map((rp) => [rp.prestataire_id, rp]));
  const canEditCycles = requis('_canValidate')();
  const riskBadge = requis('_riskBadge');
  const dateFr = requis('planDateFr');

  // Apply filters
  let filtered = [...prestRisques];
  const F = etat().filters;
  if (F.domaine) filtered = filtered.filter((p) => p.domaine_id === F.domaine);
  if (F.secteur) filtered = filtered.filter((p) => p.secteur_id === F.secteur);
  if (F.search) {
    const s = F.search.toLowerCase();
    filtered = filtered.filter((p) => (p.nom || '').toLowerCase().includes(s));
  }

  return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('profils_de_risques')}</h2>
            <div class="page-actions">
                <button class="btn btn-outline btn-sm" onclick="planSyncPrestatairesRisques()" title="${tp('sync_risk_profiles')}">${PLAN_ICONS.sync} ${tp('sync_risk_profiles')}</button>
                <button class="btn btn-primary btn-sm" onclick="planShowAddRiskProfileModal()">${PLAN_ICONS.add} ${tp('add_risk_profile')}</button>
            </div>
        </div>

        ${requis('_renderFilterBar')('planRenderPage()', { showPrestataire: false, showSousActivite: true, showTheme: true, showStatut: false, showYear: false })}

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
                        ${filtered.map((p) => {
                            const sect = liste<Secteur>('secteurs').find((s) => s.id === p.secteur_id);
                            // Parse sous_activites risk details from evaluation
                            const saDetails = _parseSADetails(p);
                            return `<tr>
                                <td><strong>${esc(p.nom)}</strong></td>
                                <td>${sect ? sect.code : '-'}</td>
                                <td>${riskBadge(p.risk_label)}</td>
                                <td>${p.csrbo || '-'} mois</td>
                                <td>${esc(p.intensite || '-')}</td>
                                <td>${canEditCycles ?
                                    `<input type="date" class="cycle-date-input" value="${p.debut_cycle || ''}" onchange="planUpdateCycleDate('${p.id}','debut_cycle',this.value,this)">` :
                                    (p.debut_cycle || '-')}</td>
                                <td>${canEditCycles ?
                                    `<input type="date" class="cycle-date-input" value="${p.fin_cycle || ''}" onchange="planUpdateCycleDate('${p.id}','fin_cycle',this.value,this)">` :
                                    (p.fin_cycle || '-')}</td>
                                <td>${dateFr(rpByPrestId.get(p.id)?.date_validation || p.evaluation_date)}</td>
                                <td><button class="btn-icon prest-bascule" aria-expanded="false" onclick="planPrestBasculer(this)" title="${tp('details')}" aria-label="${tp('details')}">${PLAN_ICONS.chevron}</button></td>
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
                                            <tbody>${saDetails.map((sa) => `<tr>
                                                <td><strong>${esc(sa.nom)}</strong></td>
                                                <td>${riskBadge(sa.risk_label)}</td>
                                                <td>${sa.frequence || '-'}x / ${tp('cycle_unit')}</td>
                                                <td>${esc(sa.intensite || '-')}</td>
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

// Ouvre ou referme le volet des sous-activités d'un prestataire, et dit son
// état : le chevron pivote sur lui (voir pl-styles.css), les lecteurs d'écran
// l'entendent.
export function planPrestBasculer(bouton: HTMLElement): void {
  const volet = bouton.closest('tr')?.nextElementSibling;
  if (!volet) return;
  const ouvert = !volet.classList.toggle('hidden');
  bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
}

function _parseSADetails(prest: PrestRisque): DetailSA[] {
  // Parse sub-activity risk details from prestataire risk profile (evaluation resultats)
  const sousActivites = liste<SousActivite>('sousActivites');
  const globalCsrbo = prest.csrbo || 0;
  const saDetails: DetailSA[] = [];
  try {
    const resultats = (typeof prest.resultats === 'string' ? JSON.parse(prest.resultats || '{}') : (prest.resultats || {})) as
      { sousActivites?: Record<string, ResultatSA>; sous_activites?: Record<string, ResultatSA> };
    const saResults = resultats.sousActivites || resultats.sous_activites || {};
    for (const [saId, saData] of Object.entries(saResults)) {
      const saRef = sousActivites.find((s) => s.id === saId);
      // Support both formats:
      // New format: saData.risk = "2b" (string), saData.freq = 1 (number)
      // Old format: saData.risk = {label:"2b", csrbo:12, freq:1, ...}
      const objet = saData.risk && typeof saData.risk === 'object' ? saData.risk : null;
      // Badge lisible : le niveau textuel (« Très Élevé ») suivi de la
      // case de matrice ; à défaut, la case seule.
      const matrice = objet ? (objet.label || '') : (saData.risk || saData.riskLabel || '');
      const desc = objet ? (objet.risk || '') : (saData.risk_desc || '');
      saDetails.push({
        id: saId,
        nom: saRef ? `${saRef.code} - ${saRef.nom}` : saId,
        risk_label: desc ? `${desc}${matrice ? ` (${String(matrice).toUpperCase()})` : ''}` : String(matrice),
        risk_desc: desc,
        csrbo: saData.csrbo || (objet ? objet.csrbo : '') || globalCsrbo || '',
        frequence: saData.freq || (objet ? objet.freq : '') || saData.frequence || '',
        intensite: saData.intensite || (objet ? objet.intensite : '') || '',
      });
    }
  } catch { /* ignore parse errors */ }
  return saDetails;
}

export async function planUpdateCycleDate(prestId: string, field: 'debut_cycle' | 'fin_cycle',
  value: string, champSaisi?: HTMLElement): Promise<void> {
  // Saisie en ligne : les deux dates du cycle sont les deux champs de la
  // ligne, sans identifiant — le contrôle les y prend.
  const ligne = champSaisi && champSaisi.closest ? champSaisi.closest('tr') : null;
  const dates = ligne ? [...ligne.querySelectorAll<HTMLInputElement>('.cycle-date-input')] : [];
  if (dates.length === 2 && !window.oasisDatesValider({ debut: dates[0], fin: dates[1] })) return;
  try {
    const prest = liste<PrestRisque>('prestataireRisques').find((p) => p.id === prestId);
    const data = {
      debut_cycle: prest?.debut_cycle || '',
      fin_cycle: prest?.fin_cycle || '',
    };
    data[field] = value;

    // Auto-calculate fin_cycle if debut_cycle set and fin_cycle empty
    if (field === 'debut_cycle' && value && !data.fin_cycle && prest?.csrbo) {
      const d = new Date(value);
      d.setMonth(d.getMonth() + parseInt(String(prest.csrbo), 10));
      data.fin_cycle = d.toISOString().substring(0, 10);
    }

    await window.api(`${window.PLAN_MODULE_API}/prestataires/${prestId}/cycle`, {
      method: 'PUT', body: JSON.stringify(data),
    });
    // Update local state
    if (prest) {
      prest.debut_cycle = data.debut_cycle;
      prest.fin_cycle = data.fin_cycle;
    }
    requis('planRenderPage')();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// ══════════════════════════════════════
//  Add Risk Profile (directly from Prestataires page)
// ══════════════════════════════════════

export function planShowAddRiskProfileModal(): void {
  const allPrest = liste<Prestataire>('prestataires');
  const prestRisques = liste<PrestRisque>('prestataireRisques');
  const evaluatedIds = new Set(prestRisques.map((pr) => pr.id));
  const candidates = allPrest.filter((p) => !evaluatedIds.has(p.id));
  const secteurs = liste<Secteur>('secteurs');
  const today = window.oasisJour();

  const body = `
    <div class="form-grid">
        <div class="form-group">
            <label>${tp('provider')} *</label>
            <select id="rpPrestataire" class="form-select" onchange="planRPFillDefaults()">
                <option value="">-- ${tp('provider')} --</option>
                ${candidates.map((p) => {
                    const sect = secteurs.find((s) => s.id === p.secteur_id);
                    return `<option value="${p.id}" data-secteur="${p.secteur_id || ''}">${esc(p.trigramme || '')} - ${esc(p.nom)}${sect ? ' (' + sect.code + ')' : ''}</option>`;
                }).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('sector')} *</label>
            <select id="rpSecteur" class="form-select" onchange="planRPRenderSARows()">
                <option value="">${tp('select_option')}</option>
                ${secteurs.map((s) => `<option value="${s.id}">${s.code} - ${esc(s.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('risk_label')} *</label>
            <input type="text" class="form-input" id="rpRiskLabel" placeholder="${tp('ex_niveau_risque')}">
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

  requis('planShowModal')(tp('add_risk_profile'), body, footer, 'modal-lg');
  // Le cycle ne se ferme pas avant de s'ouvrir.
  window.oasisDatesLier({ debut: 'rpDebutCycle', fin: 'rpFinCycle' });
}

export function planRPFillDefaults(): void {
  const sel = document.getElementById('rpPrestataire') as HTMLSelectElement | null;
  const opt = sel?.selectedOptions[0];
  const secteurId = opt?.getAttribute('data-secteur') || '';
  if (secteurId) {
    const secSel = document.getElementById('rpSecteur') as HTMLSelectElement | null;
    if (secSel) { secSel.value = secteurId; planRPRenderSARows(); }
  }
}

export function planRPRenderSARows(): void {
  const secteurId = (document.getElementById('rpSecteur') as HTMLSelectElement | null)?.value || '';
  const wrap = document.getElementById('rpSARowsWrap');
  if (!wrap) return;
  const sas = liste<SousActivite>('sousActivites').filter((sa) => sa.secteur_id === secteurId);
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
            ${sas.map((sa) => `<tr data-sa-id="${sa.id}">
                <td><strong>${esc(sa.code)}</strong> - ${esc(sa.nom)}</td>
                <td><input type="text" class="form-input rp-sa-risk" style="padding:0.25rem 0.4rem;" placeholder="ex: 2b"></td>
                <td><input type="number" class="form-input rp-sa-freq" style="padding:0.25rem 0.4rem;" min="0" step="0.5" value="1"></td>
                <td><input type="text" class="form-input rp-sa-intensite" style="padding:0.25rem 0.4rem;" placeholder="ex: Normale"></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

export async function planSaveRiskProfile(): Promise<void> {
  if (!window.oasisDatesValider({ debut: 'rpDebutCycle', fin: 'rpFinCycle' })) return;
  const pid = champ('rpPrestataire')?.value || '';
  const secteurId = champ('rpSecteur')?.value || '';
  const riskLabel = champ('rpRiskLabel')?.value || '';
  const csrbo = parseInt(champ('rpCsrbo')?.value || '12', 10);
  const intensite = champ('rpIntensite')?.value || '';
  const debutCycle = champ('rpDebutCycle')?.value || '';
  let finCycle = champ('rpFinCycle')?.value || '';
  const evalDate = champ('rpEvalDate')?.value || window.oasisJour();

  if (!pid || !secteurId || !riskLabel || !intensite) {
    toast(tp('required_fields'), 'warning');
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
  const sousActivites: Record<string, { risk: string; freq: number; intensite: string }> = {};
  saRows.forEach((tr) => {
    const saId = tr.getAttribute('data-sa-id') || '';
    const risk = tr.querySelector<HTMLInputElement>('.rp-sa-risk')?.value || '';
    const freq = parseFloat(tr.querySelector<HTMLInputElement>('.rp-sa-freq')?.value || '0') || 0;
    const saIntensite = tr.querySelector<HTMLInputElement>('.rp-sa-intensite')?.value || '';
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
    sous_activites: sousActivites,
  };

  try {
    await window.api(`${window.PLAN_MODULE_API}/risk-profiles`, { method: 'POST', body: JSON.stringify(payload) });
    requis('planCloseModal')();
    window.planShowEphemeralToast?.(tp('risk_profile_saved'), 'success', 4000);
    await requis('planLoadData')();
    requis('planRenderPage')();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planSyncPrestatairesRisques(): Promise<void> {
  try {
    // Recharge les derniers profils validés (source : « Synthèses Profils »)
    const [freshData, freshProfiles] = await Promise.all([
      window.api(`${window.PLAN_MODULE_API}/prestataires-risques`),
      window.api(`${window.PLAN_MODULE_API}/risk-profiles`),
    ]);
    const e = etat();
    e.data.prestataireRisques = freshData;
    e.data.riskProfiles = freshProfiles;
    requis('planRenderPage')();
    if (typeof window.showToast === 'function') window.showToast(tp('sync_success'), 'success');
    else toast(tp('sync_success'), 'success');
  } catch (err) {
    toast((err as Error).message, 'error');
  }
}
