// OASIS — « Profils de Risque » (PR) — le rapport d'évaluation du profil de
// risque, et son export en Word ou en PDF (ADR-003, 5.c — n° 5.f.133).
//
// La troisième partie de `pr-evaluations.js`, convertie à la lettre. Le Word
// est un document HTML enregistré par une ancre posée **sans attente** : le
// geste de l'utilisateur est encore frais (voir le socle, `telecharger`).
import { evalUserLabel } from './nouvelle-evaluation';
import type { EvaluationPr, IndicateurPr, PrestatairePr, SecteurPr, SousActivitePr } from './formes';
import { requis, t } from './partage';

// Export evaluation report (Word/PDF following Modèle de Rapport)
// Rapport d'évaluation du profil de risque — modèle AAC (7 sections + 3 appendices).
// Word : document HTML téléchargé (.doc, ouvert nativement par Word).
// PDF  : fenêtre d'impression (« Enregistrer au format PDF »).
export function buildEvalReportHtml(ev: EvaluationPr): string {
    const D = requis('APP_STATE').data!;
    const aac = D.aac || {};
    const esc = window.oasisEsc;
    // Texte libre : conserve les retours à la ligne, « - » si vide
    const txt = (s: unknown): string => (String(s == null ? '' : s).trim() ? esc(s).replace(/\n/g, '<br>') : '-');

    const prest: Partial<PrestatairePr> = (D.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
    const sect: Partial<SecteurPr> = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id) || {};
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const gen = ev.generalites || {};
    const res = ev.resultats || {};
    const g = res.global || {};
    const parSa = res.sousActivites || {};

    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);

    const dateEval = ev.date_validation || ev.decide_le || ev.updatedAt || ev.createdAt;
    const dateStr = dateEval ? new Date(dateEval).toLocaleString('fr-FR').replace(',', '') : '-';
    const reference = 'eval_' + String(ev.id || '').slice(-4);
    const preparePar = evalUserLabel(ev.decide_par || ev.created_by || (requis('APP_STATE').user || {}).id) || '-';
    const saLabel = (sa: SousActivitePr): string => `${sa.code || ''} - ${sa.nom || ''}`;
    const critereOf = (ind: IndicateurPr, note: number | string): string => (note === 1 ? ind.c1 : note === 2 ? ind.c2 : note === 3 ? ind.c3 : '') || '';

    // ── Appendices : lignes détaillées par axe ──
    const rowsConf: (string | number)[][] = [];
    sas.forEach(sa => confInds.forEach(ind => {
        const n = ev.notes_conf?.[`${sa.id}_${ind.id}`] || '';
        rowsConf.push([sa.code || '', ind.code || '', ind.label || '', n || '-', critereOf(ind, n)]);
    }));
    const rowsPerf = perfInds.map(ind => {
        const n = ev.notes_perf?.[ind.id] || '';
        return [ind.code || '', ind.label || '', n || '-', critereOf(ind, n)];
    });
    const rowsComp: (string | number)[][] = [];
    sas.forEach(sa => (D.indComplex || [])
        .filter(i => i.sous_activite_id === sa.id && i.actif !== false)
        .forEach(ind => {
            const n = ev.notes_comp?.[ind.id] || '';
            rowsComp.push([sa.code || '', ind.code || '', ind.label || '', n || '-', critereOf(ind, n)]);
        }));

    const tbl = (headers: string[], rows: (string | number)[][], widths?: string[]): string => `
    <table class="rep-tbl">
      <thead><tr>${headers.map((h, i) => `<th${widths && widths[i] ? ` style="width:${widths[i]}"` : ''}>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.length
        ? rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" class="rep-empty">${t('no_data')}</td></tr>`}</tbody>
    </table>`;

    // 4.3 / 5 — synthèse et périodicité par sous-activité
    const synthSa = sas.map(sa => {
        const r = parSa[sa.id] || {};
        return `<div class="rep-sa">${esc(saLabel(sa))}</div>` + tbl(
            ['idc', 'idp', 'ids', 'ide', 'Index Risque', 'Periodicite'],
            [[r.idc_s || '-', r.idp_s || '-', r.ids_s || '-', r.ide_s || '-', r.risk || '-', r.freq ? `${r.freq}x / cycle` : '-']]
        );
    }).join('');

    const periodiciteRows = sas.map(sa => {
        const r = parSa[sa.id] || {};
        return [saLabel(sa), r.risk || '-', r.freq ? `${r.freq}x / cycle` : '-', g.csrbo || '-'];
    });

    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport d'évaluation — ${esc(prest.nom || '')}</title>
<style>
  @page { size: A4; margin: 18mm 14mm 16mm; }
  body { font-family: Calibri, Arial, sans-serif; color: #111; font-size: 10.5pt; margin: 0; }
  .rep-runhead { text-align: center; font-size: 10pt; color: #222; padding-bottom: 6px; margin-bottom: 14px; }
  h1 { text-align: center; font-size: 18pt; font-weight: 400; color: #2f5496; margin: 6px 0 22px; }
  h2 { font-size: 13pt; font-weight: 400; color: #2f5496; margin: 20px 0 8px; }
  h3 { font-size: 11pt; font-weight: 400; color: #222; margin: 14px 0 6px; }
  .rep-meta td { padding: 3px 0; vertical-align: top; font-size: 10.5pt; }
  .rep-meta td:first-child { width: 190px; }
  .rep-field { margin: 2px 0 12px; }
  .rep-list { margin: 4px 0 12px 26px; }
  .rep-sa { font-size: 10.5pt; margin: 12px 0 4px; }
  .rep-tbl { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  .rep-tbl th { border: 1px solid #8ea9db; background: #d9e2f3; text-align: left;
                padding: 4px 7px; font-size: 8.5pt; font-weight: 400; }
  .rep-tbl td { border: 1px solid #8ea9db; padding: 4px 7px; font-size: 8.5pt; vertical-align: top; }
  .rep-empty { text-align: center; color: #777; }
  .rep-appendix { page-break-before: always; }
  @media print { .rep-appendix { page-break-before: always; } }
</style></head>
<body>
  <div class="rep-runhead">${esc(aac.nom || "Autorité de l'Aviation Civile")}</div>
  <h1>Rapport d'Évaluation du Profil de Risque</h1>

  <table class="rep-meta">
    <tr><td>Nom du Prestataire :</td><td>${esc(prest.nom || '-')}</td></tr>
    <tr><td>Secteur :</td><td>${esc(sect.code || '')} - ${esc(sect.nom || '')}</td></tr>
    <tr><td>Date d'évaluation :</td><td>${esc(dateStr)}</td></tr>
    <tr><td>Référence :</td><td>${esc(reference)}</td></tr>
    <tr><td>Préparé par :</td><td>${esc(preparePar)}</td></tr>
  </table>

  <h2>Section 1 : Introduction et résumé analytique</h2>
  <h3>Introduction</h3>
  <div class="rep-field">${txt(gen.introduction)}</div>
  <h3>Résumé analytique</h3>
  <div class="rep-field">${txt(gen.resume)}</div>

  <h2>Section 2 : Liste des évaluateurs et parties prenantes</h2>
  <h3>Liste des évaluateurs</h3>
  <div class="rep-field">${txt(gen.evaluateurs
      || (ev.evaluateurs_designes || []).map((u) => ' - ' + evalUserLabel(u)).join('\n'))}</div>
  <h3>Parties prenantes</h3>
  <div class="rep-field">${txt(gen.parties)}</div>

  <h2>Section 3 : Sources de données pour les évaluations</h2>
  <div class="rep-field">${txt(gen.sources)}</div>

  <h2>Section 4 : Profil de risque du prestataire de service</h2>
  <h3>4.1 Sous-secteurs d'activités du prestataire</h3>
  <div class="rep-list">${sas.length ? sas.map(sa => `- ${esc(saLabel(sa))}`).join('<br>') : '-'}</div>

  <h3>4.2 Synthèse globale du profil de risque</h3>
  ${tbl(['Indice Conformité (IDC)', 'Indice Performance (IDP)', 'Indice Sécurité (IDS)', 'Indice Complexité (IDE)'],
        [[g.idc_g || '-', g.idp_g || '-', g.ids_g || '-', g.ide_g || '-']])}

  <h3>4.3 Synthèse par sous-activité</h3>
  ${sas.length ? synthSa : '<div class="rep-field">-</div>'}

  <h2>Section 5 : Cycle de surveillance actuel et proposé</h2>
  ${tbl(['Cycle actuel (CSn)', 'Index Risque Sécurité', 'Intensité surveillance', 'Cycle proposé (CSRBO)'],
        [[g.csn ? `${g.csn} mois` : '-',
          g.globalRisk?.label ? `${g.globalRisk.label}${g.globalRisk.risk ? ' (' + g.globalRisk.risk + ')' : ''}` : '-',
          g.globalRisk?.intensity || '-',
          g.csrbo ? `${g.csrbo} mois` : '-']])}
  <h3>Périodicité par sous-activité :</h3>
  ${tbl(['Sous-activité', 'Index Risque', 'Périodicité', 'Cycle CSRBO (mois)'], periodiciteRows,
        ['42%', '18%', '20%', '20%'])}

  <h2>Section 6 : Actions d'améliorations proposées suite aux échanges avec les prestataires</h2>
  <div class="rep-field">${txt(gen.actions)}</div>

  <h2>Section 7 : Conclusion</h2>
  <div class="rep-field">${txt(gen.conclusion)}</div>

  <div class="rep-appendix">
    <h2>Appendices : Tableaux d'évaluations</h2>
    <h3>Appendice 1 : Détails indicateurs Conformité</h3>
    ${tbl(['S.A.', 'Code', 'Libellé', 'Score', 'Critère'], rowsConf, ['10%', '11%', '30%', '7%', '42%'])}
  </div>

  <div class="rep-appendix">
    <h3>Appendice 2 : Détails indicateurs Performance</h3>
    ${tbl(['Code', 'Libellé', 'Score', 'Critère'], rowsPerf, ['12%', '33%', '7%', '48%'])}
  </div>

  <div class="rep-appendix">
    <h3>Appendice 3 : Détails indicateurs Complexité</h3>
    ${tbl(['S.A.', 'Code', 'Libellé', 'Score', 'Critère'], rowsComp, ['10%', '11%', '30%', '7%', '42%'])}
  </div>
</body></html>`;
}

export function exportEvalReport(evalId: string, format: string): void {
    const ev = (requis('APP_STATE').data!.evaluations || []).find(e => e.id === evalId);
    if (!ev) { window.showToast(t('eval_not_found'), 'error'); return; }
    const prest: Partial<PrestatairePr> = (requis('APP_STATE').data!.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
    const base = `rapport_evaluation_${(prest.trigramme || prest.nom || 'prestataire').replace(/[^\w-]+/g, '_')}`;
    const html = buildEvalReportHtml(ev);
    try {
        if (format === 'word') {
            const blob = new Blob(['﻿' + html], { type: 'application/msword' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${base}.doc`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            window.showToast(t('word_downloaded'));
            return;
        }
        const w = window.open('', '_blank');
        if (!w) { window.showToast(t('allow_popups_pdf'), 'error'); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 350);
    } catch (e) { window.showToast((e as Error).message, 'error'); }
}
