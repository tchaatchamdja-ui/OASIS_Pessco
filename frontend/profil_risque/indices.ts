// OASIS — « Profils de Risque » (PR) : les taux, les indices et le profil de
// risque d'une évaluation (ADR-003, 5.c — n° 5.f.128).
//
// La seconde moitié de `pr-utils.js`, transportée telle quelle — commentaires
// compris —, et seulement typée. La conversion ne change pas un opérateur des
// formules, et une comparaison sur des milliers d'entrées tirées au sort
// l'atteste avant le retrait de l'ancien. Les deux `as number` qui suivent un
// test de présence ne disent que ce que le test vient d'établir.
import { t } from './traductions';

/** Des notes par indicateur — ou par couple « sous-activité_indicateur ». */
export type Notes = Record<string, number | undefined>;
/** Un indicateur, tel que le barème le porte : seul `actif` décide ici. */
export interface Indicateur { id: string; actif?: boolean | number }
/** L'indice de sécurité : la lettre, son libellé, et l'incohérence. */
export interface IndiceSecurite { val: string; desc: string; isIncoherent: boolean }
/** L'indice de risque, global ou par sous-activité. */
export interface IndiceRisque { risk: string; label: string; csnMod?: number; freq: number; intensity?: string }

// ══════════════════════════════════════
// ── Scoring & Calculation Functions ──
// ══════════════════════════════════════

/**
 * Calculate taux (rate) = sum_of_notes / (nb_active_indicators * 3)
 * @param {Object} notesObj - {indicator_id: score(1-3), ...}
 * @param {Array} indicateurs - list of indicator objects
 * @param {string} [saId] - if provided, filter conformity keys by SA: "saId_indId"
 * @returns {number} taux between 0 and 1
 */
export function calculateTaux(notesObj: Notes | undefined, indicateurs: Indicateur[] | undefined, saId?: string): number {
    const active = (indicateurs || []).filter(i => i?.actif !== false && i?.actif !== 0);
    if (!active.length) return 0;
    let sum = 0;
    active.forEach(ind => {
        let note: number | undefined;
        if (saId) {
            // Conformity mode: key is "saId_indId"
            note = notesObj?.[`${saId}_${ind.id}`];
        } else {
            note = notesObj?.[ind.id];
        }
        if (note) sum += note;
    });
    return sum / (active.length * 3);
}

/**
 * Calculate conformity taux over ALL sub-activities (for global IDC)
 * Formula: sum_of_ALL_conf_notes / (total_conf_indicators_in_sector * 3)
 * where total = nb_SA * nb_conf_indicators (each indicator evaluated per SA)
 */
export function calculateTauxConfGlobal(notesConf: Notes | undefined, confInds: Indicateur[] | undefined, sas: { id: string }[]): number {
    const active = (confInds || []).filter(i => i?.actif !== false && i?.actif !== 0);
    if (!active.length || !sas.length) return 0;
    let sum = 0;
    const totalSlots = active.length * sas.length;
    sas.forEach(sa => {
        active.forEach(ind => {
            const key = `${sa.id}_${ind.id}`;
            if (notesConf?.[key]) sum += notesConf[key] as number;
        });
    });
    return sum / (totalSlots * 3);
}

/**
 * Calculate complexity taux over ALL sub-activities (for global IDE)
 * Each SA has its own set of complexity indicators
 */
export function calculateTauxCompGlobal(notesComp: Notes | undefined, indComplex: Indicateur[] | undefined): number {
    const active = (indComplex || []).filter(i => i?.actif !== false && i?.actif !== 0);
    if (!active.length) return 0;
    let sum = 0;
    active.forEach(ind => {
        if (notesComp?.[ind.id]) sum += notesComp[ind.id] as number;
    });
    return sum / (active.length * 3);
}

/**
 * Convert taux to 3-level index (1, 2, 3)
 * - If limit1 < taux ≤ 1 → 3
 * - If limit2 < taux ≤ limit1 → 2
 * - If 0 < taux ≤ limit2 → 1
 * - If taux = 0 → 0 (no data)
 */
export function getIndice3Levels(taux: number, limit1: number, limit2: number): number {
    if (taux > limit1 && taux <= 1) return 3;
    if (taux > limit2 && taux <= limit1) return 2;
    if (taux > 0 && taux <= limit2) return 1;
    return 0;
}

/**
 * Determine Security Index (IDS) from conformity + performance indices.
 * Combinations (idc, idp):
 *   (2,3)|(3,3) → a/A  Performance élevée
 *   (2,2)|(3,2) → b/B  Performance moyen
 *   (1,2)|(2,1)|(3,1) → c/C  Performance faible
 *   (1,1) → d/D  Performance très faible
 *   (1,3) → Incohérant (réévaluation nécessaire)
 *
 * @param {number} idc - conformity index (1-3)
 * @param {number} idp - performance index (1-3)
 * @param {boolean} isGlobal - true for uppercase (A-D), false for lowercase (a-d)
 */
export function getSecurityIndex(idc: number, idp: number, isGlobal?: boolean): IndiceSecurite {
    const map: Record<string, { grade: string; desc: string; descKey: string } | undefined> = {
        '2,3': { grade: 'a', desc: 'Performance de sécurité élevée', descKey: 'high' },
        '3,3': { grade: 'a', desc: 'Performance de sécurité élevée', descKey: 'high' },
        '2,2': { grade: 'b', desc: 'Performance de sécurité moyen', descKey: 'moderate' },
        '3,2': { grade: 'b', desc: 'Performance de sécurité moyen', descKey: 'moderate' },
        '1,2': { grade: 'c', desc: 'Performance de sécurité faible', descKey: 'low' },
        '2,1': { grade: 'c', desc: 'Performance de sécurité faible', descKey: 'low' },
        '3,1': { grade: 'c', desc: 'Performance de sécurité faible', descKey: 'low' },
        '1,1': { grade: 'd', desc: 'Performance de sécurité très faible', descKey: 'very_low' },
        '1,3': { grade: 'inc', desc: 'Incohérant - réévaluation nécessaire', descKey: 'incoherent' }
    };
    const key = `${idc},${idp}`;
    const entry = map[key];
    if (!entry) return { val: '-', desc: 'N/A', isIncoherent: false };
    if (entry.grade === 'inc') {
        return { val: 'Incohérant', desc: entry.desc, isIncoherent: true };
    }
    const val = isGlobal ? entry.grade.toUpperCase() : entry.grade;
    return { val, desc: entry.desc, isIncoherent: false };
}


/**
 * Determine Risk Index from complexity index + security index.
 *
 * GLOBAL level (uppercase): IDE_g + IDS_g → e.g. "2B"
 *   1A → Très Faible | 2A,1B → Faible | 3A,2B,1C → Modéré | 3B,2C,1D → Élevé | 3C,2D,3D → Très Élevé
 *
 * SA level (lowercase): ide_s + ids_s → e.g. "2b"
 *   1a,2a,1b → Faible | 3a,2b,1c → Modéré | 3b,2c,1d → Élevé | 3c,2d,3d → Très Élevé
 *
 * @param {number} complexityIndex - IDE (1-3)
 * @param {string} securityVal - security grade letter (A-D or a-d)
 * @param {boolean} isGlobal - true for global level
 */
export function getRiskIndex(complexityIndex: number, securityVal: string, isGlobal?: boolean): IndiceRisque {
    if (!complexityIndex || !securityVal || securityVal === '-' || securityVal === 'Incohérant') {
        return { risk: 'N/A', label: securityVal === 'Incohérant' ? 'Incohérant' : '-', csnMod: 1, freq: 1, intensity: '-' };
    }

    const idx = String(complexityIndex);
    const sec = securityVal;
    const combo = `${idx}${sec}`;

    if (isGlobal) {
        // Global risk index (uppercase): determines CSRBO cycle
        const globalMap: Record<string, IndiceRisque | undefined> = {
            '1A': { risk: t('very_low'),  label: '1A', csnMod: 2,    freq: 1, intensity: t('reduced') },
            '2A': { risk: t('low'),       label: '2A', csnMod: 1.5,  freq: 1, intensity: t('moderate') },
            '1B': { risk: t('low'),       label: '1B', csnMod: 1.5,  freq: 1, intensity: t('moderate') },
            '3A': { risk: t('moderate'),  label: '3A', csnMod: 1,    freq: 2, intensity: t('normal') },
            '2B': { risk: t('moderate'),  label: '2B', csnMod: 1,    freq: 2, intensity: t('normal') },
            '1C': { risk: t('moderate'),  label: '1C', csnMod: 1,    freq: 2, intensity: t('normal') },
            '3B': { risk: t('high'),      label: '3B', csnMod: 0.75, freq: 3, intensity: t('increased') },
            '2C': { risk: t('high'),      label: '2C', csnMod: 0.75, freq: 3, intensity: t('increased') },
            '1D': { risk: t('high'),      label: '1D', csnMod: 0.75, freq: 3, intensity: t('increased') },
            '3C': { risk: t('very_high'), label: '3C', csnMod: 0.5,  freq: 4, intensity: t('reinforced') },
            '2D': { risk: t('very_high'), label: '2D', csnMod: 0.5,  freq: 4, intensity: t('reinforced') },
            '3D': { risk: t('very_high'), label: '3D', csnMod: 0.5,  freq: 4, intensity: t('reinforced') }
        };
        return globalMap[combo] || { risk: 'N/A', label: '-', csnMod: 1, freq: 1, intensity: '-' };
    } else {
        // SA risk index (lowercase): determines frequency
        const saMap: Record<string, IndiceRisque | undefined> = {
            '1a': { risk: t('low'),       label: '1a', freq: 1 },
            '2a': { risk: t('low'),       label: '2a', freq: 1 },
            '1b': { risk: t('low'),       label: '1b', freq: 1 },
            '3a': { risk: t('moderate'),  label: '3a', freq: 2 },
            '2b': { risk: t('moderate'),  label: '2b', freq: 2 },
            '1c': { risk: t('moderate'),  label: '1c', freq: 2 },
            '3b': { risk: t('high'),      label: '3b', freq: 3 },
            '2c': { risk: t('high'),      label: '2c', freq: 3 },
            '1d': { risk: t('high'),      label: '1d', freq: 3 },
            '3c': { risk: t('very_high'), label: '3c', freq: 4 },
            '2d': { risk: t('very_high'), label: '2d', freq: 4 },
            '3d': { risk: t('very_high'), label: '3d', freq: 4 }
        };
        return saMap[combo] || { risk: 'N/A', label: '-', freq: 1 };
    }
}


/**
 * Get CSS badge class from risk label or index label
 */
export function getRiskBadgeClass(riskLabel: string | undefined): string {
    const l = (riskLabel || '').toLowerCase();
    if (l.includes('incoh')) return 'badge-risk-incoherent';
    if (l.includes('très faible') || l.includes('very low') || l.includes('muito baixo')) return 'badge-risk-very-low';
    if (l.includes('très élevé') || l.includes('very high') || l.includes('muito elevado')) return 'badge-risk-very-high';
    if (l.includes('faible') || l.includes('low') || l.includes('baixo')) return 'badge-risk-low';
    if (l.includes('modéré') || l.includes('moderate') || l.includes('moderado')) return 'badge-risk-moderate';
    if (l.includes('élevé') || l.includes('high') || l.includes('elevado')) return 'badge-risk-high';
    return '';
}

/**
 * Get intensity label from csnMod
 */
export function getIntensityLabel(csnMod: number): string {
    if (csnMod >= 2) return t('reduced');         // Réduite: 2*CSn
    if (csnMod >= 1.5) return t('moderate');      // Modérée: (3/2)*CSn
    if (csnMod === 1) return t('normal');          // Normale: CSn
    if (csnMod >= 0.75) return t('increased');     // Augmentée: (3/4)*CSn
    if (csnMod > 0) return t('reinforced');        // Renforcée: CSn/2
    return '-';
}
