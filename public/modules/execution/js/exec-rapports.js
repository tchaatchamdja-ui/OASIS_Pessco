/* OASIS — Module « Exécution de la Surveillance »
 * Écran 7 — Rapports d’audit.
 *
 * Rédaction, transmission et impression des rapports de surveillance.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  7. RAPPORTS D'AUDIT
// ══════════════════════════════════════

function execRenderRapports() {
    // Only closed (transmitted) reports are listed on this page
    const allRapports = (EXEC_STATE.data.rapports || []).filter(r => r.statut === 'transmis');
    const F = EXEC_STATE.filters;
    const isPrest = _execIsPrestataire();
    const prestataires = EXEC_STATE.data.prestataires || [];
    const secteurs = EXEC_STATE.data.secteurs || [];

    // Build prestataire -> secteur/domaine lookup
    const prestInfo = {};
    prestataires.forEach(p => {
        const sec = secteurs.find(s => s.id === p.secteur_id);
        prestInfo[p.id] = { secteur_id: p.secteur_id || '', domaine_id: sec ? sec.domaine_id : '' };
    });

    let filtered = allRapports;
    if (F.domaine) filtered = filtered.filter(r => {
        const info = prestInfo[r.prestataire_id];
        return (info && info.domaine_id === F.domaine) || r.prestataire_domaine_id === F.domaine;
    });
    if (F.secteur) filtered = filtered.filter(r => {
        const info = prestInfo[r.prestataire_id];
        return info && info.secteur_id === F.secteur;
    });
    if (F.prestataire) filtered = filtered.filter(r => r.prestataire_id === F.prestataire);
    if (F.annee) filtered = filtered.filter(r => {
        const d = r.date_transmission || r.date_creation || '';
        return d.slice(0, 4) === String(F.annee);
    });
    if (F.trimestre) filtered = filtered.filter(r => {
        const d = r.date_transmission || r.date_creation || '';
        if (d.length < 7) return false;
        const m = parseInt(d.slice(5, 7));
        const t = Math.ceil(m / 3);
        return String(t) === String(F.trimestre);
    });
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(r =>
            (r.reference || '').toLowerCase().includes(s) ||
            (r.titre || '').toLowerCase().includes(s) ||
            (r.prestataire_nom || '').toLowerCase().includes(s) ||
            (r.prestataire_domaine_nom || '').toLowerCase().includes(s)
        );
    }

    // Prestataire view: only show their own data and a restricted filter set
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showSearch: true }
        : { showDomaine: true, showSecteur: true, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showSearch: true };

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('rapports')}</h2>
            <p style="color:var(--text-muted);">${te('rapports_closed_intro')}</p>
        </div>

        ${_execRenderFilterBar('execRenderPage()', filterOpts)}

        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
                <thead>
                    <tr>
                        <th style="width:150px;">${te('ref_rapport')}</th>
                        <th style="width:320px;">${te('titre_rapport')} & ${te('provider')}</th>
                        <th style="width:170px;">${te('domaine')}</th>
                        <th style="width:130px;">${te('date_transmission')}</th>
                        <th style="width:120px;">${te('statut')}</th>
                        <th style="width:130px;text-align:center;">${te('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    filtered.map(r => {
                        return `<tr>
                            <td><strong>${_esc(r.reference || '')}</strong></td>
                            <td>
                                <div>${_esc(r.titre || '')}</div>
                                <div style="font-size:0.78rem;color:var(--text-muted);">${_esc(r.prestataire_nom || '')}${r.notification_ref ? ' | ' + _esc(r.notification_ref) : ''}</div>
                            </td>
                            <td>${_esc(r.prestataire_domaine_nom || r.prestataire_domaine_code || '-')}</td>
                            <td>${_formatDate(r.date_transmission || '')}</td>
                            <td>${_execStatusBadge(r.statut)}</td>
                            <td class="exec-etats-actions">
                                <button class="btn btn-outline btn-sm" onclick="execDownloadRapport('${r.id}')" title="${te('apercu_pdf')}">
                                    ${EXEC_ICONS.eye}
                                </button>
                                <a href="javascript:void(0)"
                                   onclick="execDownloadRapport('${r.id}', true)"
                                   title="${te('telecharger_pdf_identique')}"
                                   style="display:inline-flex;align-items:center;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#1e293b;text-decoration:none;cursor:pointer;transition:all 0.15s;"
                                   onmouseover="this.style.background='#e0f2fe';this.style.borderColor='#0284c7';"
                                   onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
                                    <svg width="18" height="22" viewBox="0 0 24 24" fill="#dc2626" stroke="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6" fill="#fee2e2"/><text x="12" y="17" font-size="6" font-weight="700" fill="#fff" text-anchor="middle">PDF</text></svg>
                                </a>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
          </div>
        </div>
    </div>`;
}

// ── Download a transmitted report as a printable HTML file ─────
async function execDownloadRapport(rapportId, autoPrint, retournerHtml) {
    let rapport;
    try {
        rapport = await api(`${EXEC_MODULE_API}/rapports/${rapportId}`);
    } catch (e) {
        console.error('Load rapport error:', e);
        _execToast((e && e.message) || te('err_chargement_rapport'), 'error');
        return;
    }
    if (!rapport) return;

    // Load dossier for full context
    let dossier = EXEC_STATE.selectedDossier || {};
    if (rapport.dossier_id && rapport.dossier_id !== dossier.id) {
        try { dossier = await api(`${EXEC_MODULE_API}/dossiers/${rapport.dossier_id}`); } catch { /* use cached */ }
    }
    const d = _execRapportDonnees(rapport, dossier);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${_esc(rapport.reference || 'Rapport')}</title>
<style>${_execRapportStyles()}</style>
</head><body>
${_execRapportBarre(rapport)}
<div id="report-content">
${_execRapportPrincipal(d)}

${_execRapportAnnexes(d)}
</div><!-- /#report-content -->
<script>
// Set document title to empty so the browser print header shows nothing
// (the URL/date may still appear unless user disables headers/footers in dialog).
try { document.title = ' '; } catch (e) {}
${autoPrint ? `// Auto-trigger print dialog (user picks "Save as PDF")
window.addEventListener('load', () => { setTimeout(() => { try { window.focus(); window.print(); } catch (e) {} }, 600); });` : ''}
<\/script>
</body></html>`;

    // Le même document sert à l'aperçu intégré : on le renvoie sur demande.
    if (retournerHtml) return html;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    _execToast(te('telecharger'), 'success');
    return html;
}

// Données du rapport, lues sur le rapport et sur son dossier.
function _execRapportDonnees(rapport, dossier) {
    const aac = EXEC_STATE.data.aac || {};
    const constatations = dossier.constatations || [];
    const logoImg = aac.logo_data ? `<img src="${aac.logo_data}" style="max-height:70px;">` : '';
    const notifRef = rapport.notification_ref || dossier.notif_reference || '';
    const natureActivite = dossier.notif_nature || 'Inspection';
    // « RAPPORT D’AUDIT » mais « RAPPORT DE SUIVI » : la liaison suit l'initiale.
    const nature = natureActivite.toUpperCase();
    const intituleRapport = _execIntituleRapport(dossier,
        `RAPPORT ${/^[AEIOUYÀÂÉÈÊËÎÏÔÖÙÛÜ]/.test(nature) ? 'D’' : 'DE '}${nature}`);
    const prestNom = rapport.prestataire_nom || dossier.prestataire_nom || '';
    const prestCode = rapport.prestataire_code || dossier.prestataire_code || '';
    const refAgrement = dossier.ref_agrement || prestCode || '';
    const secteur = (() => {
        const sid = dossier.notif_secteur_id || '';
        const s = (EXEC_STATE.data.secteurs || []).find(x => x.id === sid);
        return s ? (s.code + ' - ' + s.nom) : sid;
    })();
    const refActivite = dossier.notif_reference_activite || notifRef || '';
    const lieu = dossier.notif_lieu || dossier.notif_fait_a || aac.ville || '';
    const dateExec = dossier.dates_activite || ((dossier.notif_date_debut || '') + (dossier.notif_date_fin ? (' au ' + dossier.notif_date_fin) : ''));
    const objet = dossier.objet_activite || dossier.notification_objet || '';

    // Équipe d'inspection - parse from dossier
    const equipeText = dossier.equipe_inspection || '';
    const equipeRows = equipeText.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(/[;:,\-–—]+/).map(s => s.trim());
        return { nom: parts[0] || line.trim(), role: parts[1] || '' };
    });

    // Périmètre (aspects couverts)
    const perimetre = dossier.aspects_couverts || dossier.notif_perimetre || '';
    const perimetreLines = perimetre.split('\n').filter(l => l.trim());

    // Référentiel
    const referentiel = dossier.referentiel || '';
    const refLines = referentiel.split('\n').filter(l => l.trim());

    // Constatations count by criticité
    const nbCritique = constatations.filter(c => (c.criticite || '').toLowerCase().includes('critique')).length;
    const nbMajeure = constatations.filter(c => (c.criticite || '').toLowerCase().includes('majeur')).length;
    const nbMineure = constatations.filter(c => (c.criticite || '').toLowerCase().includes('mineur')).length;

    // Chef d'équipe
    const chefEquipe = dossier.equipe_chef || (equipeRows.length > 0 ? equipeRows[0].nom : '');
    const interlocuteur = dossier.notif_interlocuteur_nom || dossier.notif_interlocuteur || '';
    const interlocuteurFonction = dossier.notif_fonction_responsable || '';
    return {
        rapport, dossier, aac, constatations, logoImg, notifRef, natureActivite, intituleRapport,
        prestNom, refAgrement, secteur, refActivite, lieu, dateExec, objet, equipeRows,
        perimetreLines, refLines, nbCritique, nbMajeure, nbMineure, chefEquipe, interlocuteur, interlocuteurFonction,
    };
}

// Feuille de style du rapport : l'aperçu à l'écran, puis l'impression.
function _execRapportStyles() {
    return `
    @page { size: A4; margin: 2cm 1.5cm; }
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.45; margin: 0; padding: 0; }
    .page { max-width: 720px; margin: 0 auto; padding: 1.5cm; }
    /* Header */
    .doc-hdr { display: flex; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 0.5cm; }
    .doc-hdr-logo { flex: 0 0 180px; text-align: center; }
    .doc-hdr-logo img { max-height: 70px; }
    .doc-hdr-right { flex: 1; text-align: right; }
    .doc-hdr-title { font-size: 20pt; font-weight: 700; margin-bottom: 2px; }
    .doc-hdr-ref { color: #ee0000; font-weight: 700; font-size: 11pt; }
    .doc-hdr-notif { font-size: 10pt; color: #555; }
    .doc-hdr-admin { font-size: 10pt; text-align: center; color: #333; margin-top: 4px; }
    /* Info box */
    .info-box { background: #f2f2f2; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 12px 16px; margin-bottom: 1cm; }
    .info-box table { width: 100%; border-collapse: collapse; }
    .info-box td { padding: 3px 6px; font-size: 10.5pt; vertical-align: top; }
    .info-box .lbl { font-weight: 700; }
    .info-box .cat { font-weight: 700; color: #156082; font-size: 11pt; padding-bottom: 2px; }
    /* Sections */
    .sec-title { font-size: 13pt; font-weight: 700; margin: 1cm 0 0.3cm; padding-bottom: 4px; border-bottom: 1.5px solid #333; text-transform: uppercase; }
    .sub-label { font-weight: 700; margin: 0.3cm 0 0.1cm; font-size: 10.5pt; }
    p, li { font-size: 10.5pt; margin: 0.1cm 0; }
    ul { padding-left: 1.2em; margin: 0.15cm 0; }
    /* Tables */
    table.data-tbl { width: 100%; border-collapse: collapse; margin: 0.2cm 0 0.4cm; font-size: 10pt; }
    table.data-tbl th, table.data-tbl td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
    table.data-tbl th { background: #e8e8e8; font-weight: 700; }
    /* SWOT */
    .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3cm; margin: 0.2cm 0 0.4cm; }
    .swot-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; font-size: 10pt; }
    .swot-box strong { display: block; margin-bottom: 4px; color: #156082; }
    /* Signatures */
    .sig-block { margin-top: 1cm; }
    .sig-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5cm; text-align: center; font-size: 9.5pt; margin-top: 0.5cm; }
    .sig-item { padding-top: 0.5cm; }
    .sig-line { border-top: 1px solid #111; margin: 0.5cm auto 0; width: 80%; }
    /* Annexe */
    .page-break { page-break-before: always; }
    .annexe-title { font-size: 14pt; font-weight: 700; text-align: center; margin: 0.5cm 0 0.5cm; color: #156082; }
    .attestation { font-size: 10pt; line-height: 1.5; margin: 0.3cm 0; font-style: italic; }
    .visa-box { display: grid; grid-template-columns: 1fr 1fr; gap: 1cm; margin-top: 0.5cm; font-size: 10pt; }
    .visa-box .v-label { font-weight: 700; }
    @page { size: A4; margin: 10mm 12mm; }
    @media print {
        html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        .page { padding: 0 !important; max-width: none !important; box-shadow: none !important; margin: 0 !important; background: #fff !important; }
        .page + .page { page-break-before: always; }
        .no-print, .preview-toolbar, .page-offset, #print-tip { display: none !important; visibility: hidden !important; height: 0 !important; }
        tr, .swot-box, .info-box, .sig-block, .visa-box { page-break-inside: avoid; break-inside: avoid; }
        .sec-title, .sub-label, .annexe-title { page-break-after: avoid; break-after: avoid; }
    }
    @media screen {
        body { background: #e5e5e5; }
        .page { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.15); margin: 1cm auto; }
        .preview-toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #1e293b; padding: 10px 20px; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.4); }
        .preview-toolbar-title { color: #94a3b8; font-size: 13px; }
        .preview-toolbar-ref { color: #fff; font-weight: 700; font-size: 14px; margin-right: auto; }
        .preview-toolbar-spacer { flex: 1; }
        .preview-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
        .preview-btn-primary { background: #2563eb; color: #fff; }
        .preview-btn-primary:hover { background: #1d4ed8; }
        .preview-btn-success { background: #059669; color: #fff; }
        .preview-btn-success:hover { background: #047857; }
        .preview-btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #334155; }
        .preview-btn-ghost:hover { background: #334155; color: #fff; }
        .preview-btn:disabled { opacity: 0.5; cursor: wait; }
        .preview-toolbar-status { color: #fbbf24; font-size: 12px; font-style: italic; margin-right: 6px; }
        .page-offset { height: 110px; }
    }
`;
}

// Barre d'outils de l'aperçu, masquée à l'impression.
function _execRapportBarre(rapport) {
    return `<div class="no-print preview-toolbar">
    <span class="preview-toolbar-title">${te('apercu_puce')}</span>
    <span class="preview-toolbar-ref">${_esc(rapport.reference || 'Rapport')}</span>
    <button class="preview-btn preview-btn-success" onclick="window.print()" title="${te('astuce_enregistrer_pdf')}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${te('telecharger_pdf')}
    </button>
    <button class="preview-btn preview-btn-ghost" onclick="window.close()">${te('fermer_croix')}</button>
</div>
<div id="print-tip" class="no-print" style="position:fixed;top:56px;left:0;right:0;z-index:998;background:#fef3c7;color:#92400e;padding:8px 20px;font-size:13px;border-bottom:1px solid #fbbf24;display:flex;align-items:center;gap:10px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span><strong>Astuce :</strong> dans la boîte de dialogue, ouvrez « Plus de paramètres » et décochez « En-têtes et pieds de page » pour un PDF sans URL ni date (à faire une seule fois — votre navigateur retient le réglage).</span>
    <button onclick="this.parentElement.style.display='none'" style="margin-left:auto;background:transparent;border:none;color:#92400e;cursor:pointer;font-size:18px;font-weight:700;">×</button>
</div>
<div class="no-print page-offset"></div>`;
}

// Le corps du rapport : identification, introduction, synthèse, constatations,
// conclusion et signatures.
function _execRapportPrincipal(d) {
    const {
        rapport, dossier, aac, constatations, logoImg, notifRef, natureActivite, intituleRapport,
        prestNom, refAgrement, secteur, refActivite, lieu, dateExec, objet, equipeRows,
        perimetreLines, refLines, nbCritique, nbMajeure, nbMineure, chefEquipe, interlocuteur, interlocuteurFonction,
    } = d;
    return `<div class="page">
    <!-- HEADER -->
    <div class="doc-hdr">
        <div class="doc-hdr-logo">
            ${logoImg}
            <div class="doc-hdr-admin">${_esc(aac.nom || '')}</div>
        </div>
        <div class="doc-hdr-right">
            <div class="doc-hdr-title">${_esc(intituleRapport)}</div>
            <div class="doc-hdr-ref">${_esc(rapport.reference || '')}</div>
            <div class="doc-hdr-notif">${notifRef ? 'Réf. Notification : ' + _esc(notifRef) : ''}</div>
        </div>
    </div>

    <!-- INFO BOX -->
    <div class="info-box">
        <table>
            <tr><td class="cat" width="50%">Prestataire</td><td class="cat">Activité</td></tr>
            <tr><td><span class="lbl">Nom du prestataire</span> : ${_esc(prestNom)}</td>
                <td><span class="lbl">Nature de l\u2019activité</span> : ${_esc(natureActivite)}</td></tr>
            <tr><td><span class="lbl">Réf Agrément</span> : ${_esc(refAgrement)}</td>
                <td><span class="lbl">Objet de l\u2019activité</span> : ${_esc(objet)}</td></tr>
            <tr><td><span class="lbl">Lieu</span> : ${_esc(lieu)}</td>
                <td><span class="lbl">Date d\u2019exécution</span> : ${_esc(dateExec)}</td></tr>
            <tr><td><span class="lbl">Secteur d\u2019activité</span> : ${_esc(secteur)}</td>
                <td><span class="lbl">Réf Activité</span> : ${_esc(refActivite)}</td></tr>
        </table>
    </div>

    <!-- 1. INTRODUCTION -->
    <div class="sec-title">INTRODUCTION</div>
    <p class="sub-label">Description générale de l\u2019activité :</p>
    <p>${_esc(dossier.description_activite || objet || '-')}</p>

    <p class="sub-label">Équipe d\u2019inspection :</p>
    ${equipeRows.length > 0 ? `<table class="data-tbl">
        <thead><tr><th>Nom et Prénom</th><th>Rôle</th></tr></thead>
        <tbody>${equipeRows.map(m => `<tr><td>${_esc(m.nom)}</td><td>${_esc(m.role)}</td></tr>`).join('')}</tbody>
    </table>` : '<p>-</p>'}

    <p class="sub-label">Périmètre de l\u2019activité :</p>
    ${perimetreLines.length > 0 ? `<ul>${perimetreLines.map(l => `<li><strong>${_esc(l)}</strong></li>`).join('')}</ul>` : '<p>-</p>'}

    <p class="sub-label">Référentiel :</p>
    ${refLines.length > 0 ? `<ul>${refLines.map(l => `<li>${_esc(l)}</li>`).join('')}</ul>` : '<p>-</p>'}

    <!-- 2. SYNTHESE ET RECOMMANDATIONS -->
    <div class="sec-title">SYNTHÈSE ET RECOMMANDATIONS</div>
    <div class="swot-grid">
        <div class="swot-box"><strong>Points Forts</strong>${_esc(dossier.synthese_points_forts || '-')}</div>
        <div class="swot-box"><strong>Points Faibles</strong>${_esc(dossier.synthese_points_faibles || '-')}</div>
    </div>
    <p class="sub-label">Opportunités d\u2019amélioration :</p>
    <p>${_esc(dossier.opportunites_amelioration || '-')}</p>
    <p class="sub-label">Résumé global des constatations :</p>
    <p>${_esc(dossier.resume_global_constatations || '-')}</p>

    <!-- 3. LISTE DES CONSTATATIONS -->
    <div class="sec-title">LISTE DES CONSTATATIONS</div>
    ${constatations.length === 0 ? `<p>${te('aucune_constatation')}</p>` : `
    <table class="data-tbl">
        <thead><tr><th>Réf</th><th>Criticité</th><th>Description</th><th>Statut</th></tr></thead>
        <tbody>${constatations.map(c => `<tr>
            <td>${_esc(c.reference || '')}</td>
            <td>${_esc(c.criticite || '')}</td>
            <td>${_esc(c.description || '')}</td>
            <td>${_esc(c.statut || '')}</td>
        </tr>`).join('')}</tbody>
    </table>
    <p style="font-size:9.5pt;color:#555;font-style:italic;">Note : La fiche détaillée de chaque constatation est jointe en Annexe B.</p>`}

    <!-- 4. CONCLUSION -->
    <div class="sec-title">CONCLUSION</div>
    <p>${_esc(dossier.conclusion || '-')}</p>

    <!-- Signatures -->
    <div class="sig-block">
        <p>${_esc(lieu)}, le _______________</p>
        ${equipeRows.length > 1 ? `<div class="sig-grid">
            ${equipeRows.slice(1).reverse().map(m => `<div class="sig-item">${_esc(m.nom)}<div class="sig-line"></div></div>`).join('')}
        </div>` : ''}
        <div style="text-align:center;margin-top:0.7cm;">
            <p style="font-weight:700;">Le Chef d\u2019équipe</p>
            <p>${_esc(chefEquipe)}</p>
            <div class="sig-line" style="width:200px;margin:0.5cm auto 0;"></div>
        </div>
    </div>
</div>`;
}

// Les annexes : fiche d'acceptation des constatations (A), fiches détaillées (B).
function _execRapportAnnexes(d) {
    const {
        rapport, dossier, aac, constatations, logoImg, notifRef, natureActivite, intituleRapport,
        prestNom, refAgrement, secteur, refActivite, lieu, dateExec, objet, equipeRows,
        perimetreLines, refLines, nbCritique, nbMajeure, nbMineure, chefEquipe, interlocuteur, interlocuteurFonction,
    } = d;
    return `<!-- ═══════ ANNEXE A ═══════ -->
<div class="page page-break">
    <div class="doc-hdr">
        <div class="doc-hdr-logo">${logoImg}<div class="doc-hdr-admin">${_esc(aac.nom || '')}</div></div>
        <div class="doc-hdr-right">
            <div class="doc-hdr-title">${_esc(intituleRapport)}</div>
            <div class="doc-hdr-ref">${_esc(rapport.reference || '')}</div>
        </div>
    </div>
    <div class="annexe-title">ANNEXES AU RAPPORT</div>
    <div class="annexe-title" style="font-size:12pt;">Annexe A \u2013 Fiche d\u2019acceptation des constatations</div>

    <div class="info-box">
        <table>
            <tr><td class="cat" width="50%">Prestataire</td><td class="cat">Activité</td></tr>
            <tr><td><span class="lbl">Nom du prestataire</span> : ${_esc(prestNom)}</td>
                <td><span class="lbl">Nature de l\u2019activité</span> : ${_esc(natureActivite)}</td></tr>
            <tr><td><span class="lbl">Réf Agrément</span> : ${_esc(refAgrement)}</td>
                <td><span class="lbl">Objet de l\u2019activité</span> : ${_esc(objet)}</td></tr>
            <tr><td><span class="lbl">Lieu</span> : ${_esc(lieu)}</td>
                <td><span class="lbl">Date d\u2019exécution</span> : ${_esc(dateExec)}</td></tr>
            <tr><td><span class="lbl">Secteur d\u2019activité</span> : ${_esc(secteur)}</td>
                <td><span class="lbl">Réf Activité</span> : ${_esc(refActivite)}</td></tr>
        </table>
    </div>

    <p class="sub-label">Équipe d\u2019inspection :</p>
    ${equipeRows.length > 0 ? `<table class="data-tbl">
        <thead><tr><th>Nom et Prénom</th><th>Rôle</th></tr></thead>
        <tbody>${equipeRows.map(m => `<tr><td>${_esc(m.nom)}</td><td>${_esc(m.role)}</td></tr>`).join('')}</tbody>
    </table>` : ''}

    <p class="sub-label">Point Focal Prestataire :</p>
    <table class="data-tbl">
        <tr><td><strong>${_esc(interlocuteur || '-')}</strong></td><td>${_esc(interlocuteurFonction || '-')}</td></tr>
    </table>

    <p class="sub-label">Périmètre de l\u2019activité :</p>
    ${perimetreLines.length > 0 ? `<ul>${perimetreLines.map(l => `<li><strong>${_esc(l)}</strong></li>`).join('')}</ul>` : '<p>-</p>'}

    <p class="sub-label">Résultat :</p>
    <table class="data-tbl">
        <tr><td><strong>Nombre de constatation Critique</strong></td><td>${nbCritique}</td></tr>
        <tr><td><strong>Nombre de constatation Majeure</strong></td><td>${nbMajeure}</td></tr>
        <tr><td><strong>Nombre de constatation Mineure</strong></td><td>${nbMineure}</td></tr>
        <tr><td><strong>Nombre Total de constatation</strong></td><td>${constatations.length}</td></tr>
    </table>

    <div style="margin-top:0.7cm;">
        <p class="sub-label">Visa du Chef d\u2019équipe</p>
        <p><strong>${_esc(chefEquipe)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; __________________________</p>
    </div>

    <div style="margin-top:0.7cm;border-top:1px solid #ccc;padding-top:0.3cm;">
        <p class="sub-label">Visa d\u2019acceptation des constatations de la Personne habilitée du Prestataire</p>
        <p class="attestation">Nous attestons avoir pris connaissance des constatations relevées. Par ce visa, nous confirmons avoir accepté les constatations relevées. Un plan d\u2019action vous sera soumis dans les délais. Les preuves de mise en \u0153uvre de plans d\u2019actions acceptés seront transmises en vue de la clôture des constatations.</p>
        <p class="sub-label">Personne habilitée</p>
        <div class="visa-box">
            <div><span class="v-label">Nom :</span> _______________________</div>
            <div><span class="v-label">Date :</span> _______________________</div>
            <div><span class="v-label">Fonction :</span> ___________________</div>
            <div><span class="v-label">Visa :</span> ______________________</div>
        </div>
    </div>
</div>

<!-- ═══════ ANNEXE B ═══════ -->
${constatations.length > 0 ? `
<div class="page page-break">
    <div class="annexe-title">Annexe B - Fiches de Constatations Détaillées</div>
    ${constatations.map((c, idx) => `
    ${idx > 0 ? '<div class="page-break"></div>' : ''}
    <div style="margin-bottom:1cm;">
        <p style="font-weight:700;font-size:12pt;color:#156082;margin-bottom:0.3cm;">Fiche détaillée Constatation ${idx + 1} — ${_esc(c.reference || '')}</p>
        <table class="data-tbl">
            <tr><td width="30%"><strong>Référence</strong></td><td>${_esc(c.reference || '')}</td></tr>
            <tr><td><strong>Criticité</strong></td><td>${_esc(c.criticite || '')}</td></tr>
            <tr><td><strong>Description</strong></td><td>${_esc(c.description || '')}</td></tr>
            <tr><td><strong>Réf. Réglementaires</strong></td><td>${_esc(c.ref_reglementaires || c.exigence_ref || '')}</td></tr>
            <tr><td><strong>Date d\u2019ouverture</strong></td><td>${_esc(c.date_ouverture || '')}</td></tr>
            <tr><td><strong>Délai de correction</strong></td><td>${_esc(c.delai_solde || c.delai_correction || '')} jours</td></tr>
            <tr><td><strong>Date due</strong></td><td>${_esc(c.date_due_cloture || c.date_due || '')}</td></tr>
            <tr><td><strong>Statut</strong></td><td>${_esc(c.statut || '')}</td></tr>
        </table>
    </div>`).join('')}
</div>` : ''}`;
}

// ── Export constatations list (xlsx / pdf) ───────────────────────
function execExportConstatations(dossierId, format) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const constatations = dossier.constatations || [];
    if (constatations.length === 0) { _execToast(te('no_data'), 'info'); return; }
    const aac = EXEC_STATE.data.aac || {};
    const headers = [te('reference'), te('criticite'), te('description_constatation'), te('date_ouverture_court'), te('delai'), te('date_due'), te('status')];
    const rows = constatations.map(c => [
        c.reference || '',
        c.criticite || c.gravite || '',
        c.description || c.titre || '',
        c.date_ouverture || '',
        c.delai_solde || c.delai_correction || '',
        c.date_due_cloture || c.date_due || '',
        c.statut || ''
    ]);
    const title = `Constatations — ${_esc(dossier.reference || dossierId)}`;
    if (format === 'xlsx') {
        _exportTableXLSX(title, headers, rows, `constatations_${dossier.reference || dossierId}`);
    } else {
        _exportTablePDF(title, headers, rows, `constatations_${dossier.reference || dossierId}`, aac);
    }
}

function _exportTableXLSX(title, headers, rows, filename) {
    let csv = headers.join('\t') + '\n';
    rows.forEach(r => { csv += r.map(c => String(c).replace(/\t/g, ' ')).join('\t') + '\n'; });
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    _execToast(te('telecharger'), 'success');
}

function _exportTablePDF(title, headers, rows, filename, aac) {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${_esc(title)}</title>
        <style>body{font-family:Arial,sans-serif;margin:1.5rem;color:#111;font-size:0.85rem;}
        h1{font-size:1.1rem;text-align:center;margin-bottom:1rem;}
        .header{display:flex;justify-content:space-between;font-size:0.78rem;color:#555;margin-bottom:0.5rem;}
        table{width:100%;border-collapse:collapse;font-size:0.78rem;}
        th,td{border:1px solid #999;padding:0.35rem 0.5rem;text-align:left;}
        th{background:#f3f4f6;font-weight:600;}
        @media print{body{margin:0.5cm;}}</style></head><body>
        <div class="header"><div>${_esc((aac||{}).pays || '')}<br>${_esc((aac||{}).designation || '')}</div><div>${new Date().toLocaleDateString('fr-FR')}</div></div>
        <h1>${_esc(title)}</h1>
        <table><thead><tr>${headers.map(h => `<th>${_esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${_esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <script>window.onload=()=>{setTimeout(()=>window.print(),300)};<\/script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}

// ── Export "Situation Générale" (xlsx / pdf) ────────
// Relit la table rendue dans le DOM pour exporter exactement ce que voit
// l'utilisateur, filtres compris : une ligne par prestataire, précédée de son
// domaine et de son secteur. Les sous-totaux, qui se recalculent, n'y sont
// pas. Les intitulés suivent les colonnes affichées : les criticités viennent
// du référentiel, et n'étaient pas toujours les trois écrites ici en dur.
function execExportSituationGenerale(format) {
    const root = document.getElementById('execSituationGeneraleRoot');
    const table = root && root.querySelector('table.sg-prest-table');
    if (!table) { _execToast(te('no_data'), 'info'); return; }

    const colonnes = Array.from(table.querySelectorAll('thead tr.exec-sg-colonnes th'))
        .map(th => th.textContent.trim());
    const n = (colonnes.length - 6) / 2;   // le nom, trois colonnes d'activités, deux totaux
    const crit = colonnes.slice(4, 4 + n);
    const act = te('sg_activites'), nb = te('sg_nb_constatations'), tx = te('sg_taux_cloture');
    const flatHeaders = [
        te('domaine'), te('secteur'), te('provider'),
        `${act} — ${colonnes[1]}`, `${act} — ${colonnes[2]}`, `${act} — ${colonnes[3]}`,
        ...crit.map(c => `${nb} — ${c}`), `${nb} — ${colonnes[4 + n]}`,
        ...crit.map(c => `${tx} — ${c}`), `${tx} — ${colonnes[colonnes.length - 1]}`,
    ];

    const rows = Array.from(table.querySelectorAll('tbody tr.sg-ligne-prest')).map(tr => [
        tr.getAttribute('data-domaine') || '',
        tr.getAttribute('data-secteur') || '',
        ...Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()),
    ]);

    if (!rows.length) { _execToast(te('no_data'), 'info'); return; }

    const now = new Date();
    const stamp = oasisJour(now);
    const title = 'Situation Générale';
    const filename = `situation_generale_${stamp}`;

    if (format === 'xlsx') {
        _exportTableXLSX(title, flatHeaders, rows, filename);
    } else {
        const aac = EXEC_STATE.data.aac || {};
        _exportTablePDF(title, flatHeaders, rows, filename, aac);
    }
}

// ── Volet rétractable des fiches (par constatation) ──
function _execToggleFiches(fncId) {
    const row = document.getElementById('fiches_row_' + fncId);
    const btn = document.getElementById('fiches_btn_' + fncId);
    if (!row) return;
    const open = row.style.display !== 'none';
    row.style.display = open ? 'none' : 'table-row';
    const caret = btn?.querySelector('.caret');
    if (caret) caret.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
}

// ── Helper: résout les métadonnées communes pour Fiche Constat / Fiche Suivi ──
function _execResolveFicheCtx(fncId) {
    const fnc = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId);
    if (!fnc) { _execToast(te('constat_introuvable'), 'error'); return null; }
    const aac = EXEC_STATE.data.aac || {};
    const domaines = EXEC_STATE.data.domaines || [];
    const domaineObj = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const domaineName = domaineObj ? domaineObj.nom : (fnc.domaine || fnc.domaine_id || '-');
    const prestataires = EXEC_STATE.data.prestataires || [];
    const prestObj = prestataires.find(p => p.id === fnc.prestataire_id);
    const prestName = prestObj ? prestObj.nom : (fnc.prestataire_nom || '-');
    let dateDue = fnc.date_due_cloture;
    if (!dateDue || isNaN(new Date(dateDue).getTime())) {
        const dl = parseInt(fnc.delai_solde || fnc.delai_correction || '0');
        const dO = fnc.date_ouverture || fnc.date_creation;
        if (dl > 0 && dO) { const d = new Date(dO); d.setDate(d.getDate() + dl); dateDue = d.toISOString().slice(0,10); }
    }
    return { fnc, aac, domaineName, prestName, dateDue };
}

// ── Fiche Constat (Section 1 + Section 2 vide) ──────────────────
// format: 'pdf' (impression navigateur, par défaut) ou 'word' (téléchargement .doc)
function execExportFicheConstat(fncId, format) {
    const ctx = _execResolveFicheCtx(fncId); if (!ctx) return;
    const fmt = format || 'pdf';
    const html = _buildFicheHTML(ctx.aac, {
        title: te('fiche_constat'),
        fnc: ctx.fnc, domaineName: ctx.domaineName, prestName: ctx.prestName, dateDue: ctx.dateDue,
        showSection2: true, showSection3: false, forWord: fmt === 'word'
    });
    if (fmt === 'word') {
        _execDownloadAsWord(html, `Fiche_Constat_${ctx.fnc.reference || ctx.fnc.id}.doc`);
    } else {
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    }
}

// ── Fiche Suivi (Section 1 + Section 3 vide) ────────────────────
function execExportFicheSuivi(fncId, format) {
    const ctx = _execResolveFicheCtx(fncId); if (!ctx) return;
    const fmt = format || 'pdf';
    const html = _buildFicheHTML(ctx.aac, {
        title: te('fiche_suivi'),
        fnc: ctx.fnc, domaineName: ctx.domaineName, prestName: ctx.prestName, dateDue: ctx.dateDue,
        showSection2: false, showSection3: true, forWord: fmt === 'word'
    });
    if (fmt === 'word') {
        _execDownloadAsWord(html, `Fiche_Suivi_${ctx.fnc.reference || ctx.fnc.id}.doc`);
    } else {
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    }
}

function _buildFicheHTML(aac, opts) {
    const { title, fnc, domaineName, prestName, dateDue, showSection2, showSection3, forWord } = opts;
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();
    // Zone à remplir à la main : quelques lignes réglées, ou une seule ligne.
    const zone = (lignes) => `<div class="a-remplir" style="min-height:${lignes * 7}mm;"></div>`;
    const ligne = () => `<div class="a-remplir" style="min-height:7mm;"></div>`;
    const rubrique = (libelle, contenu) => `<div class="rubrique">
        <div class="rubrique-titre">${libelle}</div>${contenu}</div>`;
    const cocher = (libelle) => `<div class="case"><span class="carre"></span>${libelle}</div>`;

    const corps = `
    ${_execDocEntete(title, fnc.reference || '', _execStatutLisible(fnc.statut))}

    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(prestName || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(domaineName || ''))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('delai_label'), `${_esc(fnc.delai_solde || fnc.delai_correction || '—')} ${te('jours')}`)}
        ${_execDocChamp(te('date_due_label'), dateDue ? _execDocJour(dateDue) : '—')}
    </div>

    ${_execDocSection(`1. ${te('rappel_constatation')}`, `
        <h3>${te('ref_reglementaires_label')}</h3>
        ${_execDocTexte(fnc.ref_reglementaires || fnc.exigence_ref)}
        <h3>${te('description_constatation')}</h3>
        ${_execDocTexte(fnc.description || fnc.titre)}
        ${String(fnc.recommandation || '').trim() ? `<h3>${te('recommandation')}</h3>${_execDocTexte(fnc.recommandation)}` : ''}`)}

    ${showSection2 ? _execDocSection(
        `2. ${te('plan_actions_correctives')} <span class="mention">${te('a_completer_prestataire')}</span>`, `
        ${rubrique(te('item_cause'), zone(3))}
        ${rubrique(te('item_action_curative'), zone(3))}
        <div class="paire">
            ${rubrique(te('item_date_curative'), ligne())}
            ${rubrique(te('item_preuves_curative'), ligne())}
        </div>
        ${rubrique(te('item_action_corrective'), zone(3))}
        <div class="paire">
            ${rubrique(te('item_date_corrective'), ligne())}
            ${rubrique(te('item_preuves_corrective'), ligne())}
        </div>
        <div class="visa">
            <div><span>${te('visa_prestataire')}</span></div>
            <div><span>${te('date')}</span></div>
        </div>`) : ''}

    ${showSection3 ? _execDocSection(
        `3. ${te('evaluation_suivi_aac')}`, `
        <div class="paire">
            <div class="encadre">
                <h3 style="margin-top:0;">${te('acceptation_propositions')}</h3>
                ${cocher(te('pac_accepte'))}
                ${rubrique(te('date_acceptation'), ligne())}
            </div>
            <div class="encadre">
                <h3 style="margin-top:0;">${te('cloture_fnc')}</h3>
                ${cocher(te('mise_oeuvre_effective'))}
                <div class="paire">
                    ${rubrique(te('date_solde'), ligne())}
                    ${rubrique(te('solde_par'), ligne())}
                </div>
            </div>
        </div>
        ${rubrique(te('preuves_recueillies'), zone(2))}
        ${cocher(te('verifier_terrain'))}
        ${rubrique(te('commentaire_general_suivi'), zone(4))}
        <div class="visa">
            <div><span>${te('visa_inspecteur')}</span></div>
            <div><span>${te('date')}</span></div>
        </div>`) : ''}`;

    const stylesFiche = `
      .mention { text-transform: none; letter-spacing: 0; font-weight: 500; opacity: .85; }
      .rubrique { margin-top: 6px; }
      .rubrique-titre { font-size: 8pt; text-transform: uppercase; letter-spacing: .04em;
                        color: #5b6b7d; margin-bottom: 2px; }
      .a-remplir { border: 1px solid #c9d3de; border-radius: 3px; background:
                   repeating-linear-gradient(to bottom, transparent 0 6.5mm, #eef2f6 6.5mm 6.6mm); }
      .case { display: flex; align-items: center; gap: 6px; margin: 4px 0; font-size: 9.5pt; }
      .case .carre { width: 11px; height: 11px; border: 1.2px solid #5b6b7d; border-radius: 2px; flex: 0 0 auto; }
      .visa { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 12px; break-inside: avoid; }
      .visa div { border-top: 1px solid #98a5b3; padding-top: 3px; height: 18mm; }
      .visa span { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d; }`;

    const impression = forWord ? ''
        : `<script>window.onload=()=>{setTimeout(()=>window.print(),400)};<\/script>`;
    const jour = new Date().toLocaleDateString('fr-FR');
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
    <title>${_esc(title)} — ${_esc(fnc.reference || '')}</title>
    <style>${_execDocStyles()}${stylesFiche}</style></head><body>
    ${corps}
    <footer class="doc"><span>OASIS — ${_esc((aac || {}).sigle || '')}</span><span>${_esc(title)} · ${_esc(fnc.reference || '')}</span><span>${jour}</span></footer>
    ${impression}
    </body></html>`;
}

// ── Téléchargement d'un document Word (.doc) composé en HTML ──
// Le module s'affiche dans une iframe, où le téléchargement d'une URL blob:
// est ignoré sans message selon le navigateur. Le document est donc posté au
// serveur, qui le renvoie en pièce jointe : une réponse HTTP ordinaire, que
// tous les navigateurs enregistrent.
// Enveloppe qui fait ouvrir un document HTML par Word.
function _execHtmlVersWord(html) {
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
        + String(html).replace(/^<!DOCTYPE[^>]*>/i, '').replace(/^<html[^>]*>/i, '');
}

async function _execDownloadAsWord(html, filename) {
    const wordHtml = _execHtmlVersWord(html);
    try {
        const reponse = await fetch(`${EXEC_MODULE_API}/documents/word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: JSON.stringify({ nom: filename, contenu: wordHtml }),
        });
        // 404 : la route n'est pas montée — serveur à redémarrer.
        if (reponse.status === 404) throw new Error(te('export_route_absente'));
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        const { jeton } = await reponse.json();
        // Réponse en pièce jointe : la page courante n'est pas quittée.
        window.location.href = `${EXEC_MODULE_API}/documents/word/${jeton}`;
    } catch (e) {
        console.error('Export Word :', e);
        _execToast((e && e.message) || te('err_telechargement'), 'error');
    }
}

async function execPreviewRapport(rapportId) {
    let rapport;
    try {
        rapport = await api(`${EXEC_MODULE_API}/rapports/${rapportId}`);
    } catch (e) {
        console.error('Load rapport error:', e);
        return;
    }
    if (!rapport) return;
    EXEC_STATE.selectedRapport = rapport;

    const aac = EXEC_STATE.data.aac || {};
    const dossier = EXEC_STATE.selectedDossier || {};
    const dossierId = dossier.id || '';
    const canComment = _execCanValidate() && rapport.statut === 'soumis';
    const existingComments = rapport.commentaires_apercu || '';

    const previewHtml = `
    <div class="official-doc-form">
        <div class="official-doc-page">
            <div class="doc-header">
                <div class="doc-header-left">
                    ${_esc(aac.pays || 'REPUBLIQUE')}<br>
                    ${_esc(aac.designation || 'Autorite Aeronautique Civile')}
                </div>
                <div class="doc-header-right">${_esc(rapport.reference || '')}</div>
            </div>
            <div class="doc-title">${_esc(_execIntituleRapport(dossier, 'RAPPORT DE SURVEILLANCE'))}</div>
            <div class="doc-ref">${_esc(rapport.notification_ref || '')}</div>

            <div class="doc-section-title">1. INTRODUCTION</div>
            <p><strong>Objet :</strong> ${_esc(dossier.objet_activite || '-')}</p>
            <p><strong>Date d'exécution :</strong> ${_esc(dossier.dates_activite || '-')}</p>
            <p><strong>Équipe :</strong> ${_esc(dossier.equipe_inspection || '-')}</p>
            <p><strong>Aspects couverts :</strong> ${_esc(dossier.aspects_couverts || '-')}</p>
            <p><strong>Référentiel :</strong> ${_esc(dossier.referentiel || '-')}</p>

            <div class="doc-section-title">2. SYNTHÈSE ET RECOMMANDATIONS</div>
            <p><strong>Points forts :</strong> ${_esc(dossier.synthese_points_forts || '-')}</p>
            <p><strong>Points faibles :</strong> ${_esc(dossier.synthese_points_faibles || '-')}</p>
            <p><strong>Opportunités d'amélioration :</strong> ${_esc(dossier.opportunites_amelioration || '-')}</p>
            <p><strong>Résumé global :</strong> ${_esc(dossier.resume_global_constatations || '-')}</p>

            <div class="doc-section-title">3. CONSTATATIONS</div>
            ${(dossier.constatations || []).length === 0 ? '<p>-</p>' : (dossier.constatations || []).map(c => `
                <p><strong>${_esc(c.reference || '')}</strong> (${_esc(c.criticite || '')}) - ${_esc(c.description || '')}</p>
            `).join('')}

            <div class="doc-section-title">4. CONCLUSION</div>
            <p>${_esc(dossier.conclusion || '-')}</p>
        </div>
    </div>`;

    const bodyHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start;">
        <div style="position:sticky;top:0;">
            <h4 style="margin-bottom:0.5rem;">${te('commentaires_rapport')}</h4>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">Rapport : <strong>${_esc(rapport.reference || '')}</strong> (v${rapport.version || 1}) — ${_execStatusBadge(rapport.statut)}</p>
            <textarea id="apercu_commentaires" class="form-input" rows="18" style="resize:vertical;width:100%;${!canComment ? 'background:var(--bg);' : ''}" placeholder="${canComment ? 'Saisir vos observations...' : ''}" ${canComment ? '' : 'readonly'}>${_esc(existingComments)}</textarea>
            ${canComment ? `<button class="btn btn-primary btn-sm" style="margin-top:0.5rem;" onclick="execSaveApercuComments('${rapportId}')">${EXEC_ICONS.clipboard} Enregistrer les observations</button>` : ''}
        </div>
        <div style="border-left:1px solid var(--border);padding-left:1rem;max-height:80vh;overflow-y:auto;">
            <h4 style="margin-bottom:0.5rem;">${te('previsualisation')}</h4>
            ${previewHtml}
        </div>
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execBackToValidation('${dossierId}')">${EXEC_ICONS.back} Retour</button>
        <button class="btn btn-primary btn-sm" onclick="window.print()" title="Exporter PDF">${EXEC_ICONS.pdf} Exporter PDF</button>
    `;

    execShowSlider(`${EXEC_ICONS.rapports} ${te('apercu')}`, bodyHtml, footerHtml, 'max');
}

function execBackToValidation(dossierId) {
    if (dossierId) {
        EXEC_STATE.dossierStep = 'validation';
        execOpenDossierSlider(dossierId, 'validation');
    } else {
        execCloseSlider();
    }
}

async function execSaveApercuComments(rapportId) {
    const ta = document.getElementById('apercu_commentaires');
    if (!ta) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/apercu-comments`, {
            method: 'PUT', body: JSON.stringify({ commentaires: ta.value })
        });
        _execToast(te('observations_enregistrees'), 'success');
    } catch (e) {
        console.error('Save apercu error:', e);
        _execToast(te('err_enregistrement'), 'error');
    }
}




