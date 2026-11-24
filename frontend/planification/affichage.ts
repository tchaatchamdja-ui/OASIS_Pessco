// OASIS — Planification : l'échappement, les pastilles, les couleurs, l'export
// PDF d'un plan et le panneau des notifications (ADR-003, 5.c — n° 5.f.108).
//
// La moitié « affichage » de `pl-actions.js`, convertie à la lettre ; l'autre
// moitié, les actes du circuit et les commentaires, est `decisions.ts`, dans le
// même paquet. La photographie — chaque acte, les invites répondues « non »
// puis « oui », ce qui part au serveur, le document de l'export, les pastilles
// et le panneau des notifications — n'a pas d'écart.
//
// ── Un cache qui doit rester unique ──
//
// La couleur d'un organisme lui est attribuée au premier passage, dans
// l'ordre : c'est ce qui la rend stable d'une vue à l'autre. Le cache vit dans
// ce module, et ce module n'est chargé que par le paquet de `pl-actions` —
// les autres appellent `_prestataireColor` sur la page. Un second paquet qui
// l'importerait aurait son propre cache, et les mêmes organismes changeraient
// de couleur selon la page.
import { donnees, etat, requis, tp } from './partage';

interface Ref { id: string; code?: string; nom?: string; prenom?: string; libelle?: string; mode?: string; type_supervision?: string; sous_activite_id?: string; risk_label?: string }
interface Activite {
  id?: string; plan_id?: string; objet?: string; titre?: string; prestataire_id?: string; secteur_id?: string;
  responsable_id?: string; mode_supervision_id?: string; type_supervision_id?: string; lieu_activite?: string;
  date_debut?: string; date_fin?: string; nombre_inspecteurs?: number; risk_label?: string;
  description_activite?: string; sous_activite_ids?: unknown; sous_activite_id?: string; themes_couverts?: unknown;
}
interface Plan {
  id: string; titre?: string; annee?: number; version?: number; type?: string; statut?: string;
  domaine_id?: string; secteur_id?: string; activites?: Activite[];
  date_creation?: string; date_validation?: string; date_soumission?: string;
}
interface Alerte { type: string; icon: string | undefined; label: string; date: string; days?: number }

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

// L'échappement vient du socle (oasis-commun.js) : un seul barème pour tous
// les modules. Le nom demeure, les gabarits n'ont rien à changer.
export function _esc(v: unknown): string { return window.oasisEsc(v); }

// Interpolation dans un attribut : les guillemets doivent partir aussi, ce que
// `_esc` ne fait pas — il passe par innerHTML, qui les laisse tels quels.
export function _escAttr(v: unknown): string { return window.oasisEsc(v); }

export function _statusBadge(status: unknown): string {
  const color = _statusColor(status);
  const label = tp(String(status)) || status;
  return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

export function _statusColor(status: unknown): string {
  const colors: Record<string, string> = {
    brouillon: '#f59e0b', soumis: '#3b82f6', en_revue: '#8b5cf6',
    valide: '#10b981', rejete: '#ef4444', rejete_clos: '#991b1b', en_cours_amendement: '#f97316', archive: '#9ca3af', remplace: '#94a3b8',
    planifie: '#6366f1', en_cours: '#f59e0b', termine: '#10b981', annule: '#6b7280',
    creation: '#6366f1', soumission: '#3b82f6', validation: '#10b981',
    rejet: '#ef4444', amendement: '#f59e0b',
  };
  return colors[String(status)] || '#6b7280';
}

// Nom d'un type de plan. Le code enregistré n'est pas la clé de traduction :
// « periodique » se nomme sous « periodic ». `tp` rendant la clé elle-même
// quand elle manque, l'écran et le PDF affichaient le code brut —
// « periodique » au lieu de « Périodique ».
const PLAN_TYPE_CLES: Record<string, string> = {
  periodique: 'periodic', annuel: 'annual',
  inopine: 'inopine', ponctuel_special: 'ponctuel_special',
};

function planLibelleType(type: unknown): string {
  const cle = PLAN_TYPE_CLES[String(type)];
  return cle ? tp(cle) : (String(type || '') || '-');
}

export function _planTypeBadge(type: unknown): string {
  const colors: Record<string, string> = { periodique: '#3b82f6', annuel: '#3b82f6', inopine: '#f97316', ponctuel_special: '#8b5cf6' };
  const color = colors[String(type)] || '#6b7280';
  return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${_esc(planLibelleType(type))}</span>`;
}

export function _riskBadge(riskLabel: unknown): string {
  if (!riskLabel) return '-';
  const color = _riskColor(String(riskLabel));
  return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${_esc(riskLabel)}</span>`;
}

function _riskColor(label: string): string {
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
  '#10b981', '#6366f1', '#e11d48', '#0891b2', '#65a30d',
];
const _prestataireColorCache: Record<string, string> = {};
export function _prestataireColor(prestataireId: string | null | undefined): string {
  if (!prestataireId) return '#6b7280';
  const deja = _prestataireColorCache[prestataireId];
  if (deja) return deja;
  const idx = Object.keys(_prestataireColorCache).length % _PRESTATAIRE_COLORS.length;
  const couleur = _PRESTATAIRE_COLORS[idx] as string;
  _prestataireColorCache[prestataireId] = couleur;
  return couleur;
}

// Export PDF : le document est composé ici puis remis à la fenêtre
// d'impression du navigateur (aucun générateur PDF côté serveur).
export function planExportPDF(planId: string): void {
  const S = etat();
  const plan = (S.selectedPlan && S.selectedPlan.id === planId)
    ? S.selectedPlan
    : donnees<Plan>('plans').find((p) => p.id === planId);
  if (!plan) { requis('oasisToast')(tp('no_data'), 'warning'); return; }
  const activites = plan.activites
    || donnees<Activite>('allActivites').filter((a) => a.plan_id === planId);
  const aac = (etat().data.aac || {}) as { nom?: string };
  const dom = donnees<Ref>('domaines').find((d) => d.id === plan.domaine_id);
  const sec = donnees<Ref>('secteurs').find((x) => x.id === plan.secteur_id);
  const dateFr = requis('planDateFr');
  const normalise = requis('_normalizeList');
  const lignes = activites.map((a, i) => {
    const prest = donnees<Ref>('prestataires').find((p) => p.id === a.prestataire_id);
    const s = donnees<Ref>('secteurs').find((x) => x.id === a.secteur_id);
    const resp = donnees<Ref>('inspecteurs').find((x) => x.id === a.responsable_id);
    const mode = donnees<Ref>('modesSupervision').find((m) => m.id === a.mode_supervision_id);
    const typeS = donnees<Ref>('typesSupervision').find((t) => t.id === a.type_supervision_id);
    return `<tr>
            <td>${i + 1}</td>
            <td>${_esc(prest ? prest.nom : '-')}</td>
            <td>${_esc(a.objet || a.titre || '-')}</td>
            <td>${_esc(s ? s.code : '-')}</td>
            <td>${_esc(`${mode ? (mode.mode || '') : '-'} / ${typeS ? (typeS.type_supervision || '') : '-'}`)}</td>
            <td>${_esc(a.lieu_activite || '-')}</td>
            <td>${_esc(resp ? `${resp.nom || ''} ${resp.prenom || ''}`.trim() : '-')}</td>
            <td>${dateFr(a.date_debut) || '-'}</td>
            <td>${dateFr(a.date_fin) || '-'}</td>
        </tr>`;
  }).join('');

  // Détail de chaque activité — le commentaire de validation est exclu
  const details = activites.map((a, i) => {
    const prest = donnees<Ref>('prestataires').find((p) => p.id === a.prestataire_id);
    const saIds = (normalise(a.sous_activite_ids).length
      ? normalise(a.sous_activite_ids) : (a.sous_activite_id ? [a.sous_activite_id] : [])) as string[];
    const themeIds = normalise(a.themes_couverts);
    // Deux colonnes alignées : chaque paire de sous-activités forme une
    // ligne, les cellules restent alignées en haut.
    const cellules = saIds.map((sid) => {
      const sa = donnees<Ref>('sousActivites').find((x) => x.id === sid);
      const ths = themeIds
        .map((tid) => donnees<Ref>('themesSupervision').find((t) => t.id === tid))
        .filter((t): t is Ref => !!t && t.sous_activite_id === sid);
      return `<div class="sa-t">${_esc(sa ? `${sa.code} - ${sa.nom}` : sid)}</div>
                ${ths.length ? `<ul>${ths.map((t) => `<li>${_esc(t.libelle)}</li>`).join('')}</ul>` : '<div class="muted">-</div>'}`;
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
      <td class="k">Type :</td><td>${_esc(planLibelleType(plan.type))}</td>
      <td class="k">Secteur :</td><td>${_esc(sec ? `${sec.code} - ${sec.nom}` : '-')}</td>
      <td class="k">Statut :</td><td>${_esc(tp(plan.statut || '') || plan.statut || '-')} — ${activites.length} activité(s)</td>
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
  if (!w) { requis('oasisToast')(tp('popup_blocked'), 'warning'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

// ══════════════════════════════════════
//  NOTIFICATION BELL
// ══════════════════════════════════════

function _getPlanNotifAlerts(): Alerte[] {
  const alerts: Alerte[] = [];
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const peutValider = requis('_canValidate');

  // 1. Draft plans pending submission
  const plans = donnees<Plan>('plans');
  plans.forEach((p) => {
    if (p.statut === 'brouillon') {
      alerts.push({ type: 'info', icon: PLAN_ICONS.plans, label: `${tp('brouillon')}: ${_esc(p.titre || '')}`, date: p.date_creation || '' });
    }
    // Rejected plans needing attention
    if (p.statut === 'rejete') {
      alerts.push({ type: 'overdue', icon: PLAN_ICONS.x, label: `${tp('rejete')}: ${_esc(p.titre || '')}`, date: p.date_validation || '' });
    }
    // Submitted plans awaiting validation (for validators)
    if (p.statut === 'soumis' && peutValider()) {
      alerts.push({ type: 'task', icon: PLAN_ICONS.send, label: `${tp('pending_validation')}: ${_esc(p.titre || '')}`, date: p.date_soumission || '' });
    }
  });

  // 2. Activities with approaching deadlines (within 30 days)
  plans.filter((p) => p.statut === 'valide').forEach((p) => {
    (p.activites || []).forEach((a) => {
      const dFin = a.date_fin ? new Date(a.date_fin) : null;
      if (dFin && dFin >= now && dFin <= in30) {
        const days = Math.ceil((dFin.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const prest = donnees<Ref>('prestataires').find((pr) => pr.id === a.prestataire_id);
        alerts.push({ type: 'deadline', icon: PLAN_ICONS.clock, label: `${_esc(a.objet || a.titre || '')} - ${_esc(prest?.nom || '')}`, date: a.date_fin || '', days });
      }
      // Overdue activities
      if (dFin && dFin < now) {
        const daysLate = Math.ceil((now.getTime() - dFin.getTime()) / (24 * 60 * 60 * 1000));
        const prest = donnees<Ref>('prestataires').find((pr) => pr.id === a.prestataire_id);
        alerts.push({ type: 'overdue', icon: PLAN_ICONS.clock, label: `${_esc(a.objet || a.titre || '')} - ${_esc(prest?.nom || '')} (${daysLate}j)`, date: a.date_fin || '', days: -daysLate });
      }
    });
  });

  // 3. High-risk providers needing attention
  donnees<Ref>('prestataireRisques').forEach((pr) => {
    const risk = (pr.risk_label || '').toLowerCase();
    if (risk.includes('très élevé') || risk.includes('very high')) {
      alerts.push({ type: 'overdue', icon: PLAN_ICONS.shield, label: `${tp('very_high_risk')}: ${_esc(pr.nom || '')}`, date: '' });
    }
  });

  alerts.sort((a, b) => (a.days || 999) - (b.days || 999));
  return alerts;
}

export function planUpdateNotifBadge(): void {
  const alerts = _getPlanNotifAlerts();
  const badge = document.getElementById('planNotifBadge');
  if (badge) {
    if (alerts.length > 0) {
      badge.textContent = alerts.length > 99 ? '99+' : String(alerts.length);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

export function planToggleNotifPanel(): void {
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
            alerts.map((a) => `
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
    const handler = (e: MouseEvent): void => {
      const cible = e.target as Element;
      if (!panel.contains(cible) && !cible.closest('.plan-notif-bell')) {
        panel.remove();
        document.removeEventListener('click', handler);
      }
    };
    document.addEventListener('click', handler);
  }, 100);
}
