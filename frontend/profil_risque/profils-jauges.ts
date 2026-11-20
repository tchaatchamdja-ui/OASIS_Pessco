// OASIS — « Profils de Risque » (PR) — la jauge demi-cercle et les seuils des trois axes (ADR-003, 5.c — n° 5.f.134).
//
// Une partie de `pr-profils.js`, convertie à la lettre : le balisage est rendu
// caractère pour caractère.
import { requis } from './partage';

/** Les seuils d'un axe, en pour cent. */
export interface SeuilsPr { high: number; low: number }
/** Les options d'une jauge. */
export interface OptionsJauge { width?: number | string; height?: number | string; noData?: boolean; compact?: boolean; minWidth?: string }

// Jauge demi-cercle du tableau de bord (aiguille + 3 zones de seuils).
// type 'conf'|'perf' : rouge→jaune→vert ; 'comp' : vert→jaune→rouge.
// Seuils (%) issus de la configuration des indices, par axe.
export function prSeuils(type: string): SeuilsPr {
    const c = requis('APP_STATE').data!.indices || {};
    const TH: Record<string, SeuilsPr | undefined> & { conf: SeuilsPr } = {
        conf: { high: (c.conf1 ?? 0.80) * 100, low: (c.conf2 ?? 0.50) * 100 },
        perf: { high: (c.perf1 ?? 0.80) * 100, low: (c.perf2 ?? 0.50) * 100 },
        comp: { high: (c.expo1 ?? 0.80) * 100, low: (c.expo2 ?? 0.50) * 100 },
    };
    return TH[type] || TH.conf;
}

// Couleur d'un taux selon les seuils : conf/perf rouge→jaune→vert,
// complexité inversée (un taux élevé est défavorable).
export function prTauxColor(pct: number, type: string): string {
    const th = prSeuils(type);
    return (type === 'comp')
        ? (pct <= th.low ? '#22c55e' : pct <= th.high ? '#f59e0b' : '#ef4444')
        : (pct >= th.high ? '#22c55e' : pct >= th.low ? '#f59e0b' : '#ef4444');
}

export function prMakeGauge(label: string, pct: number, type: string, opts?: OptionsJauge): string {
    const o: OptionsJauge = opts || {};
    const th = prSeuils(type);
    const isReverse = (type === 'comp');
    const valColor = prTauxColor(pct, type);
    const lowAngle = (th.low / 100) * 180;
    const highAngle = (th.high / 100) * 180;
    const needleDeg = (pct / 100) * 180;
    const pointAt = (deg: number, r: number): { x: number; y: number } => {
        const rad = (-180 + deg) * Math.PI / 180;
        return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) };
    };
    const arcPath = (startDeg: number, endDeg: number): string => {
        const s = pointAt(startDeg, 80), e = pointAt(endDeg, 80);
        return `M ${s.x} ${s.y} A 80 80 0 ${(endDeg - startDeg) > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
    };
    const c1 = isReverse ? '#22c55e' : '#ef4444';
    const c3 = isReverse ? '#ef4444' : '#22c55e';
    const np = pointAt(needleDeg, 60);
    const w = o.width || 150, h = o.height || 80;
    const noData = o.noData;
    // Taille de police du taux alignée sur celle du libellé de l'indicateur
    const fs = o.compact ? '0.72rem' : '0.8rem';

    return `<div class="chart-card" style="padding:${o.compact ? '0.35rem 0.4rem' : '0.5rem 0.75rem'};text-align:center;min-width:${o.minWidth || '150px'};flex:1;">
        <div style="font-weight:700;font-size:${fs};margin-bottom:0.2rem;">${label}</div>
        <svg viewBox="0 0 200 105" width="${w}" height="${h}" style="max-width:100%;">
            <path d="${arcPath(0, lowAngle)}" fill="none" stroke="${c1}" stroke-width="14" stroke-linecap="butt"/>
            <path d="${arcPath(lowAngle, highAngle)}" fill="none" stroke="#f59e0b" stroke-width="14" stroke-linecap="butt"/>
            <path d="${arcPath(highAngle, 180)}" fill="none" stroke="${c3}" stroke-width="14" stroke-linecap="butt"/>
            ${noData ? '' : `<line x1="100" y1="100" x2="${np.x}" y2="${np.y}" stroke="#1a365d" stroke-width="3" stroke-linecap="round"/>`}
            <circle cx="100" cy="100" r="5" fill="#1a365d"/>
            <text x="20" y="102" font-size="9" fill="#888">0%</text>
            <text x="168" y="102" font-size="9" fill="#888">100%</text>
        </svg>
        <div style="font-size:${fs};font-weight:800;color:${noData ? 'var(--text-muted)' : valColor};margin-top:0;">${noData ? '—' : pct.toFixed(1) + '%'}</div>
    </div>`;
}
