// OASIS — « Profils de Risque » (PR) — la cloche des notifications : les
// brouillons, les profils à risque élevé, les plans à échéance (ADR-003, 5.c —
// n° 5.f.132).
//
// La troisième partie de `pr-parametres.js`, convertie à la lettre. Les dates
// se comparent et se soustraient par `getTime`, la valeur numérique que les
// opérateurs lisaient.
import { requis, t } from './partage';

/** Une alerte de la cloche. */
export interface AlertePr { type: string; icon: string; label: string; date?: string | undefined; days?: number }

// ══════════════════════════════════════
//  NOTIFICATIONS (bell)
// ══════════════════════════════════════

export function _getPRNotifAlerts(): AlertePr[] {
    const D = requis('APP_STATE').data!;
    const alerts: AlertePr[] = [];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Draft evaluations pending validation
    const drafts = (D.evaluations || []).filter(e => e.statut === 'brouillon');
    drafts.forEach(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        alerts.push({ type: 'info', icon: window.ICONS['evaluations'] as string, label: `${t('draft')}: ${prest?.nom || '?'}`, date: ev.date_validation || ev.date });
    });

    // 2. Evaluations with high/very high risk
    const validEvals = (D.evaluations || []).filter(e => e.statut === 'valide');
    validEvals.forEach(ev => {
        const risk = ev.resultats?.global?.globalRisk?.risk || '';
        if (risk.includes('Très élevé') || risk.includes('Very High') || risk.includes('Muito Elevado')) {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            alerts.push({ type: 'overdue', icon: window.ICONS['shield'] as string, label: `${t('very_high')} ${t('risk')}: ${prest?.nom || '?'}`, date: ev.date_validation || ev.date });
        } else if (risk.includes('Élevé') || risk.includes('High') || risk.includes('Elevado')) {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            alerts.push({ type: 'deadline', icon: window.ICONS['shield'] as string, label: `${t('high')} ${t('risk')}: ${prest?.nom || '?'}`, date: ev.date_validation || ev.date });
        }
    });

    // 3. Plans with approaching deadlines
    const plans = D.plans || [];
    plans.forEach(p => {
        if (p.statut === 'termine') return;
        const dDate = p.date_prochaine ? new Date(p.date_prochaine) : null;
        // Les dates se comparent et se soustraient par leur valeur numérique.
        if (dDate && dDate.getTime() >= now.getTime() && dDate.getTime() <= in30.getTime()) {
            const days = Math.ceil((dDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            const prest = (D.prestataires || []).find(pr => pr.id === p.prestataire_id);
            alerts.push({ type: 'deadline', icon: window.ICONS['clock'] as string, label: `${t('surveillance_freq')}: ${prest?.nom || '?'} (J-${days})`, date: p.date_prochaine, days });
        }
        // Overdue
        if (dDate && dDate.getTime() < now.getTime()) {
            const daysLate = Math.ceil((now.getTime() - dDate.getTime()) / (24 * 60 * 60 * 1000));
            const prest = (D.prestataires || []).find(pr => pr.id === p.prestataire_id);
            alerts.push({ type: 'overdue', icon: window.ICONS['clock'] as string, label: `${t('surveillance_freq')}: ${prest?.nom || '?'} (${daysLate}j)`, date: p.date_prochaine, days: -daysLate });
        }
    });

    alerts.sort((a, b) => (a.days || 999) - (b.days || 999));
    return alerts;
}

export function prUpdateNotifBadge(): void {
    const alerts = _getPRNotifAlerts();
    const badge = document.getElementById('prNotifBadge');
    if (badge) {
        if (alerts.length > 0) {
            badge.textContent = String(alerts.length > 99 ? '99+' : alerts.length);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

export function prToggleNotifPanel(): void {
    const existing = document.getElementById('prNotifPanel');
    if (existing) { existing.remove(); return; }

    const alerts = _getPRNotifAlerts();
    const panel = document.createElement('div');
    panel.id = 'prNotifPanel';
    panel.className = 'pr-notif-panel';
    panel.innerHTML = `
        <div class="pr-notif-panel-header">
            <strong>${window.ICONS['bell']} Notifications (${alerts.length})</strong>
            <button style="border:none;background:none;cursor:pointer;" onclick="document.getElementById('prNotifPanel')?.remove()">${window.ICONS['close']}</button>
        </div>
        <div class="pr-notif-panel-body">
            ${alerts.length === 0 ? `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">${t('no_data')}</div>` :
            alerts.map(a => `
                <div class="pr-notif-item ${a.type}">
                    <div style="flex-shrink:0;">${a.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.84rem;font-weight:500;">${a.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">
                            ${a.days !== undefined ? (a.days < 0 ? `<span style="color:#ef4444;font-weight:600;">${Math.abs(a.days)}j en retard</span>` : `<span>J-${a.days}</span>`) : ''}
                            ${a.date ? `<span>${window.formatDate(a.date)}</span>` : ''}
                        </div>
                    </div>
                </div>`).join('')}
        </div>`;

    const bell = document.querySelector('.pr-notif-bell');
    if (bell) {
        const rect = bell.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
    }
    document.body.appendChild(panel);

    setTimeout(() => {
        const handler = (e: MouseEvent): void => {
            const cible = e.target as Element;
            if (!panel.contains(cible) && !cible.closest('.pr-notif-bell')) {
                panel.remove();
                document.removeEventListener('click', handler);
            }
        };
        document.addEventListener('click', handler);
    }, 100);
}
