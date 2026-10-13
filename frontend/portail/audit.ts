// OASIS — Le journal d'audit (ADR-003, 5.e.3).
//
// Cinquième pièce d'`app.js`, et la plus courte. Elle montre la chaîne SHA-256
// des actes — ce que la fiche technique appelle le §F.3 — et son état de
// validité.
//
// ── Ce que cet écran ne fait pas, et c'est voulu ──
//
// Il **n'écrit rien**. Pas un geste, pas une route en écriture : un journal
// chaîné qu'un écran pourrait modifier ne serait pas un journal. Son seul geste
// est le bouton qui **relit** la chaîne et dit le résultat dans un bandeau.
//
// C'est aussi pourquoi il n'a aucun état : la vérification est demandée deux fois
// — une fois au rendu pour le bandeau, une fois au clic — et rien n'est retenu
// entre les deux. Le dire ici évite qu'on prenne cette seconde requête pour un
// oubli.
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t } from './traductions';
import { fmtDate } from './outils';

/** Une entrée du journal, telle que `/api/audit` la rend. */
export interface EntreeAudit {
  id: number;
  ts: string;
  user: string;
  action: string;
  details: unknown;
  hash: string;
}

/** L'état de la chaîne, tel que `/api/audit/verify` le rend. */
export interface EtatChaine {
  valid: boolean;
  total?: number;
  brokenAt?: number;
}

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

export async function renderAudit(): Promise<void> {
  const [entriesRes, verifyRes] = await Promise.all([appel('/api/audit'), appel('/api/audit/verify')]);
  const entries = await entriesRes.json() as EntreeAudit[];
  const verify = await verifyRes.json() as EtatChaine;

  const verifyBanner = verify.valid
    ? `<span class="shell-badge badge-active">${escapeHtml(t('audit_ok'))} (${verify.total})</span>`
    : `<span class="shell-badge badge-inactive">${escapeHtml(t('audit_broken'))} #${verify.brokenAt}</span>`;

  const rows = entries
    .map(
      (e: EntreeAudit) => `
      <tr>
        <td>${e.id}</td>
        <td style="white-space:nowrap;">${fmtDate(e.ts)}</td>
        <td><strong>${escapeHtml(e.user)}</strong></td>
        <td><span class="shell-badge badge-neutral">${escapeHtml(e.action)}</span></td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(JSON.stringify(e.details))}</td>
        <td style="font-family:monospace;font-size:.68rem;color:var(--text-muted);">${escapeHtml(e.hash.slice(0, 12))}…</td>
      </tr>`
    )
    .join('');

  const vue = document.getElementById('mainView');
  if (!vue) throw new Error("la vue principale est absente : « mainView » n'est pas dans le document");
  vue.innerHTML = `
    <div class="portal-page-header">
      <h2>${escapeHtml(t('audit_title'))}</h2>
      <div class="portal-page-actions">
        ${verifyBanner}
        <button class="shell-btn shell-btn-outline" id="verifyBtn">${icon('link', 14)} ${escapeHtml(t('audit_verify'))}</button>
      </div>
    </div>
    <div class="shell-table-container">
      <table class="shell-table shell-table-compact">
        <thead><tr>
          <th>${escapeHtml(t('audit_col_id'))}</th><th>${escapeHtml(t('audit_col_ts'))}</th><th>${escapeHtml(t('audit_col_user'))}</th>
          <th>${escapeHtml(t('audit_col_action'))}</th><th>${escapeHtml(t('audit_col_details'))}</th><th>${escapeHtml(t('audit_col_hash'))}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const verifyBtn = document.getElementById('verifyBtn');
  if (!verifyBtn) throw new Error("le bouton de vérification est absent du balisage rendu");
  verifyBtn.addEventListener('click', async () => {
    const res = await appel('/api/audit/verify');
    const v = await res.json() as EtatChaine;
    showToast(v.valid ? `${t('audit_ok')} — ${t('entrees_n', v.total)}` : `${t('audit_broken')} #${v.brokenAt}`, v.valid ? 'success' : 'error', 4000);
  });
}
