/* OASIS — Exécution de la Surveillance
 * Suite de exec-pac.js : les fiches imprimables, les échanges, le suivi item par item et les décisions sur le PAC.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ══════════════════════════════════════
//  Fiche complète d'une constatation, prête à imprimer
// ══════════════════════════════════════
// Reprend l'intégralité du dossier : identification, plan d'actions et ses
// preuves, versions antérieures, évaluation de l'AAC, commentaires, échanges.
// ══════════════════════════════════════
//  Documents imprimables du module
// ══════════════════════════════════════
// Un seul squelette pour toutes les fiches : même en-tête d'autorité, même
// typographie, mêmes règles de coupure. Les documents restent lisibles en
// noir et blanc, et les aplats de couleur s'impriment (print-color-adjust).
function _execDocStyles() {
    return `
      @page { size: A4; margin: 16mm 13mm 18mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font: 10.5pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #16202c; margin: 0; }
      header.doc { display: flex; align-items: center; gap: 12px;
                   border-bottom: 2.5px solid #12406b; padding-bottom: 8px; margin-bottom: 14px; }
      header.doc .logo { height: 52px; width: auto; flex: 0 0 auto; }
      header.doc .ident { flex: 1; min-width: 0; }
      header.doc .sigle { font-size: 11pt; font-weight: 700; color: #12406b; letter-spacing: .01em; }
      header.doc .lieu { font-size: 8pt; color: #5b6b7d; }
      header.doc h1 { font-size: 14pt; margin: 4px 0 2px; letter-spacing: .01em; }
      header.doc .meta { font-size: 8pt; color: #5b6b7d; }
      header.doc .cartouche { flex: 0 0 auto; text-align: right; }
      header.doc .cartouche .ref { font: 700 11pt/1.2 ui-monospace, "SFMono-Regular", Menlo, monospace; color: #12406b; }
      header.doc .cartouche .statut {
          display: inline-block; margin-top: 3px; padding: 1.5px 7px; border-radius: 9px;
          font-size: 8pt; font-weight: 700; background: #12406b14; color: #12406b;
      }
      .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 14px;
                border: 1px solid #dde4ec; border-radius: 4px; padding: 8px 10px; margin-bottom: 10px; }
      .grille > div { min-width: 0; }
      .grille span { display: block; font-size: 7.5pt; text-transform: uppercase;
                     letter-spacing: .05em; color: #5b6b7d; }
      .grille strong { font-size: 10pt; font-weight: 600; overflow-wrap: anywhere; }
      section { margin-top: 10px; break-inside: avoid; }
      section > h2 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .06em; color: #fff;
                     background: #12406b; margin: 0 0 5px; padding: 3.5px 8px; border-radius: 3px;
                     border-left: 3px solid #0b2b48; }
      section h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d;
                   margin: 8px 0 2px; }
      section p, section ol, section ul { margin: 0; }
      section ol, section ul { padding-left: 17px; }
      section li { margin-bottom: 1.5px; }
      table.fiche { width: 100%; border-collapse: collapse; }
      table.fiche td { border-bottom: 1px solid #eef2f6; padding: 2.5px 6px 2.5px 0; vertical-align: top; }
      table.fiche tr:last-child td { border-bottom: none; }
      td.date { width: 68px; color: #5b6b7d; white-space: nowrap; }
      td.auteur { width: 120px; font-weight: 600; }
      .paire { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .encadre { border: 1px solid #dde4ec; border-radius: 4px; padding: 7px 9px; }
      .texte { white-space: pre-wrap; overflow-wrap: anywhere; }
      .vide { color: #98a5b3; }
      .etiquette { display: inline-block; padding: 1px 6px; border-radius: 9px;
                   font-size: 7.5pt; font-weight: 700; background: #0284c71f; color: #075985; }
      .crit-critique, .crit-majeure { background: #dc26261f; color: #991b1b; }
      .crit-mineure { background: #16a34a1f; color: #166534; }
      footer.doc { position: fixed; bottom: 5mm; left: 0; right: 0; font-size: 7.5pt; color: #5b6b7d;
                   border-top: 1px solid #dde4ec; padding-top: 3px; display: flex; justify-content: space-between; }
      @media print {
        section > h2 { background: #12406b !important; color: #fff !important; }
        header.doc { border-bottom-color: #12406b !important; }
      }`;
}

// En-tête d'autorité, commun à toutes les fiches.
function _execDocEntete(titre, reference, statut) {
    const aac = EXEC_STATE.data.aac || {};
    const lieu = [aac.ville, aac.pays].filter(Boolean).map(_esc).join(', ');
    return `<header class="doc">
        ${aac.logo ? `<img class="logo" src="${aac.logo}" alt="">` : ''}
        <div class="ident">
            <div class="sigle">${_esc(aac.sigle || '')}${aac.nom ? ` — ${_esc(aac.nom)}` : ''}</div>
            ${lieu ? `<div class="lieu">${lieu}</div>` : ''}
            <h1>${titre}</h1>
            <div class="meta">${te('edite_le')} ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        ${reference || statut ? `<div class="cartouche">
            ${reference ? `<div class="ref">${_esc(reference)}</div>` : ''}
            ${statut ? `<div class="statut">${_esc(statut)}</div>` : ''}
        </div>` : ''}
    </header>`;
}

// Ouvre le document dans un onglet et présente la boîte d'impression.
// Document complet, prêt à imprimer ou à rendre en PDF côté serveur.
function _execDocHtml(titreOnglet, corps) {
    const aac = EXEC_STATE.data.aac || {};
    const jour = new Date().toLocaleDateString('fr-FR');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${_esc(titreOnglet)}</title><style>${_execDocStyles()}</style></head><body>
    ${corps}
    <footer class="doc"><span>OASIS — ${_esc(aac.sigle || '')}</span><span>${_esc(titreOnglet)}</span><span>${jour}</span></footer>
    </body></html>`;
}

function _execDocOuvrir(titreOnglet, corps) {
    const html = _execDocHtml(titreOnglet, corps);
    const fenetre = window.open('', '_blank');
    if (!fenetre) { _execToast(te('bloqueur_fenetre'), 'warning'); return; }
    fenetre.document.write(html);
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 400);
}

// Petites fabriques partagées par les fiches.
const _execDocJour = (d) => (d ? _formatDate(String(d).slice(0, 10)) : '—');
const _execDocChamp = (libelle, valeur) => `<div><span>${libelle}</span><strong>${valeur || '—'}</strong></div>`;
const _execDocSection = (titre, corps) => `<section><h2>${titre}</h2>${corps || `<p class="vide">—</p>`}</section>`;
const _execDocTexte = (valeur) => (String(valeur || '').trim()
    ? `<p class="texte">${_esc(valeur)}</p>` : '<p class="vide">—</p>');
const _execDocLignes = (lignes) => (lignes.length
    ? `<table class="fiche"><tbody>${lignes.map((l) => `<tr>
            <td class="date">${l[0]}</td><td class="auteur">${_esc(l[1] || '')}</td><td>${l[2]}</td>
        </tr>`).join('')}</tbody></table>`
    : '');
const _execDocPreuves = (liste) => ((liste || []).length
    ? `<ol>${(liste || []).map((p) => `<li>${_esc(p.intitule || p.filename || '')}`
        + `${p.date ? ` <em>(${_execDocJour(p.date)})</em>` : ''}`
        + `${p.commentaire ? ` — ${_esc(p.commentaire)}` : ''}</li>`).join('')}</ol>`
    : '');

// Évaluation d'une constatation, quelle que soit sa forme de stockage.
function _execDocEvaluation(fnc) {
    let ev = fnc && fnc.commentaire_evaluation;
    if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
    return ev || {};
}

// Date de solde attendue : celle enregistrée, sinon ouverture + délai.
function _execDocDateDue(fnc) {
    if (fnc.date_due_cloture) return String(fnc.date_due_cloture).slice(0, 10);
    const delai = parseInt(fnc.delai_solde || fnc.delai_correction || '0', 10);
    const ouv = fnc.date_ouverture || String(fnc.date_creation || '').slice(0, 10);
    if (!delai || !ouv) return '';
    const d = new Date(ouv);
    d.setDate(d.getDate() + delai);
    return d.toISOString().slice(0, 10);
}

// ── Fiche de constat ─────────────────────────────────────────────
// Le constat lui-même : ce qui a été relevé, au regard de quoi, avec quelle
// échéance de traitement. Une page par constatation.
function _execFicheConstatCorps(fnc, dossier) {
    const ev = _execDocEvaluation(fnc);
    const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const sec = (EXEC_STATE.data.secteurs || []).find((x) => x.id === fnc.secteur_id);
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();
    const preuves = fnc.preuves_constatation || [];
    return `
    ${_execDocEntete(te('fiche_constat'), fnc.reference || '', _execStatutLisible(fnc.statut))}
    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(fnc.prestataire_nom || (dossier || {}).prestataire_nom || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(dom ? dom.nom : (fnc.domaine_id || '')))}
        ${_execDocChamp('Secteur', _esc(sec ? sec.nom : (fnc.secteur_id || '')))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('delai_label'), `${_esc(fnc.delai_solde || '—')} ${te('jours')}`)}
        ${_execDocChamp(te('date_due_label'), _execDocJour(_execDocDateDue(fnc)))}
        ${_execDocChamp(te('emis_par'), _esc(fnc.emis_par || ''))}
        ${_execDocChamp(te('adresse_a'), _esc(fnc.adresse_a || ''))}
    </div>
    ${(dossier && (dossier.reference || dossier.notification_ref)) ? `<div class="grille">
        ${_execDocChamp(te('dossier'), _esc(dossier.reference || ''))}
        ${_execDocChamp('Notification', _esc(dossier.notification_ref || ''))}
        ${_execDocChamp(te('objet'), _esc(dossier.objet_activite || dossier.notification_objet || ''))}
    </div>` : ''}
    ${_execDocSection(te('ref_reglementaires_label'), _execDocTexte(fnc.ref_reglementaires || fnc.exigence_ref))}
    ${_execDocSection(te('description_constatation'), _execDocTexte(fnc.description || fnc.titre))}
    ${_execDocSection(te('recommandation'), _execDocTexte(fnc.recommandation))}
    ${_execDocSection(te('preuves'), _execDocPreuves(preuves))}
    ${ev.rejet_info ? _execDocSection(te('motif_rejet'), _execDocTexte(ev.rejet_info.motif)) : ''}`;
}

function execFicheConstatPdf(fncId) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const fnc = (dossier.constatations || []).find((c) => c.id === fncId)
        || (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
    if (!fnc) { _execToast(te('no_data'), 'warning'); return; }
    _execDocOuvrir(`${te('fiche_constat')} — ${fnc.reference || ''}`,
        _execFicheConstatCorps(fnc, dossier));
}

// Toutes les constatations d'un dossier, une fiche par page.
function execFichesConstatDossier(dossierId) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const liste = dossier.constatations || [];
    if (!liste.length) { _execToast(te('no_data'), 'info'); return; }
    const corps = liste.map((c, i) => `<div${i ? ' style="page-break-before:always;"' : ''}>`
        + `${_execFicheConstatCorps(c, dossier)}</div>`).join('');
    _execDocOuvrir(`${te('fiches_constat')} — ${dossier.reference || dossierId}`, corps);
}

// ── Fiche de suivi (plan d'actions correctives) ──────────────────
// Le traitement de la constatation : plan retenu, preuves, évaluation de
// l'AAC et échanges de suivi. Se lit à la suite de la fiche de constat.
async function execExporterFncPdf(fncId) {
    let fnc;
    try {
        fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`);
    } catch (e) {
        console.error('Export FNC :', e);
        _execToast((e && e.message) || te('err_preparation_document'), 'error');
        return;
    }
    if (!fnc) return;

    const ev = _execDocEvaluation(fnc);
    const anac = ev.evaluation_anac || {};
    const acceptation = anac.acceptation || {};
    const verif = anac.verification || {};
    const cloture = anac.cloture || {};
    const pac = (fnc.actions_correctives || [])[0] || {};
    const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();

    const commentaires = [
        ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
            date: x.date, auteur: x.auteur, items: [cle === 'cause_primaire' ? 'cause' : cle], texte: x.texte,
        }))),
        ...(ev.suivi_commentaires || []).filter((x) => x.publie),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const corps = `
    ${_execDocEntete(te('fiche_suivi_pac'), fnc.reference || '', _execStatutLisible(fnc.statut))}
    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(fnc.prestataire_nom || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(dom ? dom.nom : (fnc.domaine_id || '')))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('date_due_label'), _execDocJour(_execDocDateDue(fnc)))}
        ${_execDocChamp(te('date_solde'), _execDocJour(cloture.date_solde || fnc.date_solde))}
    </div>

    ${_execDocSection(te('description_constatation'), _execDocTexte(fnc.description || fnc.titre))}

    ${_execDocSection(te('plan_actions_correctives'), `
        <h3>${te('cause_root')}</h3>${_execDocTexte(pac.cause_primaire)}
        <h3>${te('action_curative_correction')}${pac.curative_date_prevue
            ? ` — ${te('date_prevue')} : ${_execDocJour(pac.curative_date_prevue)}` : ''}</h3>
        ${_execDocTexte(pac.action_curative)}
        ${_execDocPreuves(pac.curative_preuves)}
        <h3>${te('action_corrective_prevention')}${pac.corrective_date_prevue
            ? ` — ${te('date_prevue')} : ${_execDocJour(pac.corrective_date_prevue)}` : ''}</h3>
        ${_execDocTexte(pac.actions_correctives)}
        ${_execDocPreuves(pac.corrective_preuves)}`)}

    ${_execDocSection(te('evaluation_suivi_aac'), `
        <div class="paire">
            <div class="encadre">
                <h3 style="margin-top:0;">${te('acceptation_propositions')}</h3>
                <p>${te('pac_accepte')} : <strong>${acceptation.accepte === 'OUI' ? te('oui_label') : '—'}</strong>${
                    acceptation.date ? ` · ${te('date_acceptation')} ${_execDocJour(acceptation.date)}` : ''}</p>
                <p>${te('verifier_terrain')} : <strong>${verif.verification_terrain ? te('oui_label') : te('non_label')}</strong></p>
                <h3>${te('preuves_recueillies')}</h3>
                ${_execDocPreuves(verif.preuves_mise_oeuvre) || '<p class="vide">—</p>'}
            </div>
            <div class="encadre">
                <h3 style="margin-top:0;">${te('cloture_fnc')}</h3>
                <p>${te('mise_oeuvre_effective')} : <strong>${cloture.mise_en_oeuvre_effective === 'OUI' ? te('oui_label') : '—'}</strong></p>
                <p>${te('date_solde')} : ${_execDocJour(cloture.date_solde || fnc.date_solde)}</p>
                <p>${te('solde_par')} : ${_esc(cloture.solde_par || '—')}</p>
            </div>
        </div>
        <h3>${te('commentaire_general_suivi')}</h3>
        ${_execDocLignes((verif.suivis || []).map((x) => [_execDocJour(x.date), x.auteur, _esc(x.texte || '')]))
            || '<p class="vide">—</p>'}`)}

    ${_execDocSection(te('details_suivi'), _execDocLignes(commentaires.map((c) => [
        _execDocJour(c.date), c.auteur,
        `${(c.items || []).map((k) => `<span class="etiquette">${_esc(k === 'autres'
            ? (c.precision || te('motif_autres')) : te(`item_${k}`))}</span>`).join(' ')} ${_esc(c.texte || '')}`,
    ])))}`;

    _execDocOuvrir(`${te('fiche_suivi_pac')} — ${fnc.reference || ''}`, corps);
}

// Libellé lisible d'un statut de constatation.
function _execStatutLisible(statut) {
    const cle = String(statut || '');
    const libelle = te(cle);
    return libelle && libelle !== cle ? libelle : cle;
}

// ══════════════════════════════════════
//  Échanges AAC ↔ prestataire sur une constatation
// ══════════════════════════════════════
// Même présentation que la négociation de l'étape Confirmation : fil de
// bulles, réponse en bas. Sans le volet d'accord, propre à l'activité.
function _execEchangesPacHtml(echanges, fncId, verrouille) {
    const moi = (EXEC_STATE.user || {}).username || '';
    const fil = (echanges || []).map((e, i) => {
        const aMoi = e.auteur_id && e.auteur_id === moi;
        const suivant = echanges[i + 1];
        const dernierDuGroupe = !(suivant && suivant.auteur_id === e.auteur_id);
        const initiales = ((e.auteur_prenom || 'U')[0] + ((e.auteur_nom || '')[0] || '')).toUpperCase();
        const nom = `${_esc(e.auteur_prenom || '')} ${_esc(e.auteur_nom || '')}`.trim();
        const avatar = !aMoi
            ? `<div class="exchange-avatar"${dernierDuGroupe ? '' : ' style="visibility:hidden;"'}>${initiales}</div>`
            : '';
        return `<div class="exchange-bubble-row ${aMoi ? 'self' : 'other'}">
            ${avatar}
            <div class="exchange-bubble">
                <div class="exchange-bubble-body">${_esc(String(e.contenu || '').trim())}</div>
            </div>
        </div>
        ${dernierDuGroupe ? `<div class="exchange-bubble-time ${aMoi ? 'self' : 'other'}">
            <span class="exchange-bubble-auteur">${nom || (e.auteur_type === 'aac' ? te('aac_label') : '—')}</span>
            <span>${_formatDatetime(e.date_creation)}</span>
        </div>` : ''}`;
    }).join('');

    return `<div class="exchange-chat discussions-chat" id="exec_pac_echanges">
        ${echanges && echanges.length ? fil
            : `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.25rem 0;">${te('no_data')}</p>`}
    </div>
    ${verrouille ? '' : `<div class="exchange-reply">
        <label>${te('repondre')}</label>
        <div class="exchange-reply-row">
            <textarea class="form-input" id="exec_pac_echange_msg" rows="1" placeholder="${te('votre_message')}"
                      style="resize:none;overflow:hidden;min-height:2.2rem;line-height:1.4;"
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"></textarea>
            <button class="btn btn-primary" onclick="execEnvoyerEchangePac('${fncId}')">
                ${EXEC_ICONS.send} ${te('envoyer')}
            </button>
        </div>
    </div>`}`;
}

// Repère de lecture : dernier passage du compte dans le fil de la
// constatation. Un message d'autrui postérieur est réputé non lu.
function _execPacCleLecture(fncId) {
    const u = (EXEC_STATE.user || {}).username || 'anonyme';
    return `pac_echanges_lu_${fncId}_${u}`;
}

function _execPacNonLus(fncId, echanges) {
    const moi = (EXEC_STATE.user || {}).username || '';
    const repere = localStorage.getItem(_execPacCleLecture(fncId)) || '';
    return (echanges || []).filter((e) => e.auteur_id !== moi
        && String(e.date_creation || '') > repere).length;
}

// Bouton du bandeau + tiroir des discussions, à la place de la croix.
function _execPacInstallerDiscussions(fncId, echanges, verrouille) {
    const entete = document.querySelector('#execSlider .exec-slider-header');
    if (!entete) return;
    entete.querySelector('.exec-slider-close')?.remove();
    entete.querySelector('.exec-pac-discussions')?.remove();

    const nonLus = _execPacNonLus(fncId, echanges);
    const bouton = document.createElement('button');
    bouton.className = `exec-pac-discussions${nonLus ? ' alerte' : ''}`;
    bouton.type = 'button';
    bouton.title = te('discussions');
    bouton.innerHTML = `${EXEC_ICONS.send} <span>${te('discussions')}</span>
        ${nonLus ? `<span class="exec-pac-discussions-pastille">${nonLus}</span>`
            : (echanges || []).length ? `<span class="exec-pac-discussions-compte">${echanges.length}</span>` : ''}`;
    bouton.onclick = () => execPacDiscussionsOuvrir(fncId);
    entete.appendChild(bouton);

    // Tiroir : glisse de la droite, sur le tiers de la largeur.
    document.getElementById('execPacTiroir')?.remove();
    const tiroir = document.createElement('div');
    tiroir.id = 'execPacTiroir';
    tiroir.className = 'exec-pac-tiroir';
    tiroir.innerHTML = `<div class="exec-pac-tiroir-tete">
            <span>${te('discussions')}</span>
            <button type="button" onclick="execPacDiscussionsFermer()" title="${te('close')}">${EXEC_ICONS.close}</button>
        </div>
        <div class="exec-pac-tiroir-corps">${_execEchangesPacHtml(echanges, fncId, verrouille)}</div>`;
    document.body.appendChild(tiroir);
    // Bord supérieur calé sur celui du formulaire, quelle que soit la hauteur
    // du bandeau de l'application.
    const volet = document.getElementById('execSlider');
    if (volet) tiroir.style.top = `${Math.round(volet.getBoundingClientRect().top)}px`;
}

window.execPacDiscussionsOuvrir = function (fncId) {
    const tiroir = document.getElementById('execPacTiroir');
    if (!tiroir) return;
    tiroir.classList.add('ouvert');
    // Tout est lu à l'ouverture : le bouton reprend sa couleur.
    localStorage.setItem(_execPacCleLecture(fncId), new Date().toISOString());
    const bouton = document.querySelector('.exec-pac-discussions');
    if (bouton) {
        bouton.classList.remove('alerte');
        bouton.querySelector('.exec-pac-discussions-pastille')?.classList.add('exec-pac-discussions-compte');
        bouton.querySelector('.exec-pac-discussions-pastille')?.classList.remove('exec-pac-discussions-pastille');
    }
    const fil = tiroir.querySelector('.exchange-chat');
    if (fil) fil.scrollTop = fil.scrollHeight;
    tiroir.querySelector('#exec_pac_echange_msg')?.focus();
};

window.execPacDiscussionsFermer = function () {
    document.getElementById('execPacTiroir')?.classList.remove('ouvert');
};

async function execEnvoyerEchangePac(fncId) {
    const zone = document.getElementById('exec_pac_echange_msg');
    const contenu = (zone && zone.value || '').trim();
    if (!contenu) return;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/echanges`, {
            method: 'POST',
            body: JSON.stringify({ contenu }),
        });
        zone.value = '';
        await execOpenPACSlider(fncId);
        execPacDiscussionsOuvrir(fncId);          // le tiroir reste ouvert
    } catch (e) {
        console.error('Envoi échange PAC :', e);
        _execToast((e && e.message) || te('err_envoi_message'), 'error');
    }
}

// ══════════════════════════════════════
//  Commentaires de suivi (volet droit du formulaire PAC)
// ══════════════════════════════════════
// Champs du plan pouvant faire l'objet d'un commentaire, plus « Autres ».
// Rédaction réservée à l'AAC ; le prestataire lit.
const EXEC_PAC_ITEMS_COMMENTABLES = [
    'cause', 'action_curative', 'date_curative', 'preuves_curative',
    'action_corrective', 'date_corrective', 'preuves_corrective',
];

// `modifiable` : commentaire encore au brouillon, non transmis au prestataire.
// `rang` numérote les suivis transmis au postulant — 0 pour un brouillon,
// qui n'en porte pas encore. `deplie` n'est vrai que pour le dernier : les
// précédents se consultent d'un clic sur leur en-tête.
function _execCommentaireSuiviHtml(c, modifiable, rang, deplie) {
    const items = (c.items || []).map((k) => (k === 'autres'
        ? (c.precision || te('motif_autres')) : te(`item_${k}`)));
    const brouillon = !c.publie;
    const fichiers = c.fichiers || [];
    return `<div class="exec-suivi-comm${brouillon ? ' brouillon' : ''}${deplie ? '' : ' replie'}" data-date="${_escAttr(c.date || '')}" data-auteur="${_escAttr(c.auteur || '')}"
                 data-items="${_escAttr((c.items || []).join(','))}" data-precision="${_escAttr(c.precision || '')}"
                 data-texte="${_escAttr(c.texte || '')}" data-publie="${c.publie ? '1' : ''}"
                 data-fichiers="${_escAttr(JSON.stringify(fichiers))}">
        <div class="exec-suivi-comm-tete" onclick="execSuiviCommToggle(this)">
            <span class="exec-suivi-comm-chevron">${EXEC_ICONS.chevronDown}</span>
            <strong>${rang ? `${te('suivi_rang')} ${rang}` : _esc(c.auteur || '')}</strong>
            <span>
                ${rang ? `<em class="exec-suivi-auteur">${_esc(c.auteur || '')}</em>` : ''}
                ${brouillon ? `<em class="exec-suivi-brouillon">${te('non_transmis')}</em>` : ''}
                ${c.date ? _formatDate(String(c.date).slice(0, 10)) : ''}
                ${modifiable && brouillon ? `<button type="button" class="exec-suivi-action" title="${te('modifier')}"
                        onclick="event.stopPropagation();execModifierCommentaireSuivi(this)">${EXEC_ICONS.edit}</button>
                    <button type="button" class="exec-suivi-action exec-suivi-supprimer" title="${te('supprimer')}"
                        onclick="event.stopPropagation();execSupprimerCommentaireSuivi(this)">${EXEC_ICONS.x}</button>` : ''}
            </span>
        </div>
        <div class="exec-suivi-comm-corps">
            <div class="exec-suivi-comm-items">${items.map((l) => `<span>${_esc(l)}</span>`).join('')}</div>
            <div class="exec-suivi-comm-texte">${_esc(c.texte || '')}</div>
            ${fichiers.length ? `<div class="exec-suivi-comm-pj">${fichiers.map((f) => `
                <a href="${_escAttr(f.path || '')}?nom=${encodeURIComponent(f.filename || '')}" target="_blank" rel="noopener">
                    ${EXEC_ICONS.file} ${_esc(f.filename || '')}</a>`).join('')}</div>` : ''}
        </div>
    </div>`;
}

// Un suivi se replie et se déplie d'un clic sur son en-tête.
window.execSuiviCommToggle = function (tete) {
    tete.closest('.exec-suivi-comm')?.classList.toggle('replie');
}

// Reprise d'un commentaire non transmis : il repart dans le composeur.
window.execModifierCommentaireSuivi = function (bouton) {
    const bloc = bouton.closest('.exec-suivi-comm');
    const composeur = document.querySelector('.exec-suivi-composeur');
    if (!bloc || !composeur) return;
    const items = (bloc.dataset.items || '').split(',').filter(Boolean);
    composeur.querySelectorAll('.exec-suivi-items input').forEach((i) => {
        i.checked = items.includes(i.value);
    });
    const p = document.getElementById('pac_suivi_precision');
    if (p) p.value = bloc.dataset.precision || '';
    const t = document.getElementById('pac_suivi_texte');
    if (t) t.value = bloc.dataset.texte || '';
    // Les pièces du brouillon repartent avec lui dans le composeur.
    const pj = document.getElementById('pac_suivi_pj_liste');
    if (pj) {
        pj.innerHTML = '';
        let fichiers = [];
        try { fichiers = JSON.parse(bloc.dataset.fichiers || '[]'); } catch { fichiers = []; }
        fichiers.forEach((f) => {
            const ligne = document.createElement('span');
            ligne.className = 'exec-suivi-pj-item';
            ligne.dataset.path = f.path || '';
            ligne.dataset.filename = f.filename || '';
            ligne.innerHTML = `${EXEC_ICONS.file} ${_esc(f.filename || '')}
                <button type="button" title="${te('supprimer')}"
                        onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            pj.appendChild(ligne);
        });
    }
    bloc.remove();
    execSuiviItemsChange();
    if (t) t.focus();
};

window.execSupprimerCommentaireSuivi = async function (bouton) {
    if (!await oasisConfirmer(te('confirm_supprimer_commentaire'))) return;
    const liste = document.getElementById('pac_suivi_liste');
    bouton.closest('.exec-suivi-comm')?.remove();
    if (liste && !liste.querySelector('.exec-suivi-comm')) {
        liste.innerHTML = `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>`;
    }
};

// Les commentaires en attente deviennent visibles du prestataire dès que
// l'AAC rend une décision : ils ne sont alors plus modifiables.
function _execPublierCommentairesSuivi(evalData) {
    (evalData.suivi_commentaires || []).forEach((c) => { c.publie = true; });
    return evalData;
}

// Le commentaire ne s'ouvre qu'une fois l'item désigné ; « Autres » réclame
// sa précision.
// Intitulé porté par une case du composeur.
function _execSuiviLibelleItem(cle) {
    return cle === 'autres' ? te('motif_autres') : te(`item_${cle}`);
}

// Les lignes inscrites par les cases se reconnaissent à leur numérotation ;
// ce que l'AAC écrit à leur suite est du texte libre, jamais renuméroté.
const EXEC_SUIVI_LIGNE = /^\s*\d+\.\s/;

// La numérotation suit l'ordre des choix, sans trou : cocher ajoute une ligne,
// décocher retire la sienne, et les lignes restantes se renumérotent.
function _execSuiviRenumeroter(zone) {
    let n = 0;
    zone.value = zone.value.split('\n').map((ligne) => (EXEC_SUIVI_LIGNE.test(ligne)
        ? ligne.replace(EXEC_SUIVI_LIGNE, () => `${++n}. `)
        : ligne)).join('\n');
}

// ── Teinte des « Résultats du Suivi » ────────────────────────────
// La couleur de la section dit où en est la constatation, d'un coup d'œil :
//   PAC refusé                       rouge clair
//   PAC accepté                      orange
//   … et vérification sur le terrain vert clair
//   … et mise en oeuvre effective    vert foncé (comme une clôture)
function execPacTeinteResultats() {
    const section = document.getElementById('exec_resultats_suivi');
    if (!section) return;
    const coche = (id) => !!document.getElementById(id)?.checked;
    const accepte = coche('anac_pac_accepte');
    const effective = coche('anac_mise_effective');
    const soldee = (EXEC_STATE.selectedConstatation || {}).statut === 'soldee';
    const etat = (!accepte && 'refuse')
        || ((effective || soldee) && 'clos')
        || (coche('anac_verif_terrain') && 'terrain')
        || 'accepte';
    section.classList.remove('teinte-refuse', 'teinte-accepte', 'teinte-terrain', 'teinte-clos');
    section.classList.add(`teinte-${etat}`);
}

function execSuiviItemsChange(caseCochee) {
    const composeur = document.querySelector('.exec-suivi-composeur');
    if (!composeur) return;
    const coches = [...composeur.querySelectorAll('.exec-suivi-items input:checked')];
    const autres = document.getElementById('pac_suivi_autres');
    const precision = document.getElementById('pac_suivi_precision');
    if (precision) precision.hidden = !(autres && autres.checked);
    const pret = coches.length > 0;
    const texte = document.getElementById('pac_suivi_texte');
    const bouton = document.getElementById('pac_suivi_ajouter');
    if (texte) {
        texte.disabled = !pret;
        texte.placeholder = pret ? te('suivi_saisir_commentaire') : te('suivi_choisir_item');
    }
    if (bouton) bouton.disabled = !pret;

    // L'item choisi s'inscrit dans la saisie : l'AAC n'a plus qu'à commenter.
    if (texte && caseCochee) {
        const libelle = _execSuiviLibelleItem(caseCochee.value);
        if (caseCochee.checked) {
            const fin = texte.value.replace(/\s+$/, '');
            texte.value = `${fin}${fin ? '\n' : ''}0. ${libelle} : `;
        } else {
            // Décocher retire la ligne de l'item — sauf si l'AAC y a déjà écrit :
            // ses mots priment sur la case.
            const marque = new RegExp(`^\\s*\\d+\\.\\s*${libelle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:(.*)$`);
            texte.value = texte.value.split('\n')
                .filter((l) => { const m = marque.exec(l); return !m || m[1].trim(); })
                .join('\n');
        }
        _execSuiviRenumeroter(texte);
        if (caseCochee.checked) {
            texte.focus();
            texte.setSelectionRange(texte.value.length, texte.value.length);
        }
    }
}

function execAjouterCommentaireSuivi() {
    const composeur = document.querySelector('.exec-suivi-composeur');
    const liste = document.getElementById('pac_suivi_liste');
    if (!composeur || !liste) return;
    const items = [...composeur.querySelectorAll('.exec-suivi-items input:checked')].map((i) => i.value);
    const texte = (document.getElementById('pac_suivi_texte')?.value || '').trim();
    const precision = (document.getElementById('pac_suivi_precision')?.value || '').trim();
    if (!items.length || !texte) return;
    if (items.includes('autres') && !precision) {
        _execToast(te('motif_manquant'), 'warning');
        document.getElementById('pac_suivi_precision')?.focus();
        return;
    }
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    liste.querySelector('.exec-suivi-vide')?.remove();
    liste.insertAdjacentHTML('beforeend', _execCommentaireSuiviHtml({
        date: oasisJour(), auteur, items, precision, texte,
        fichiers: _execSuiviFichiersDeposes(), publie: false,
    }, true, 0, true));
    liste.querySelectorAll('.exec-suivi-comm:not(:last-child)')
        .forEach((c) => c.classList.add('replie'));
    liste.scrollTop = liste.scrollHeight;
    // Le composeur repart à zéro pour le commentaire suivant.
    composeur.querySelectorAll('.exec-suivi-items input:checked').forEach((i) => { i.checked = false; });
    const p = document.getElementById('pac_suivi_precision');
    if (p) { p.value = ''; p.hidden = true; }
    const t = document.getElementById('pac_suivi_texte');
    if (t) t.value = '';
    const pj = document.getElementById('pac_suivi_pj_liste');
    if (pj) pj.innerHTML = '';
    execSuiviItemsChange();
}

// Pièces déposées dans le composeur, en attente d'être portées au commentaire.
function _execSuiviFichiersDeposes() {
    return [...document.querySelectorAll('#pac_suivi_pj_liste [data-path]')].map((e) => ({
        filename: e.dataset.filename || '', path: e.dataset.path || '',
    }));
}

async function execSuiviJoindreFichiers(input) {
    const liste = document.getElementById('pac_suivi_pj_liste');
    if (!liste || !input.files || !input.files.length) return;
    for (const fichier of [...input.files]) {
        const formData = new FormData();
        formData.append('file', fichier);
        formData.append('nom', fichier.name);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData,
            });
            const data = await res.json();
            if (data.status !== 'ok') throw new Error(oasisMessageErreur(data, res.status, te('televersement_refuse')));
            const ligne = document.createElement('span');
            ligne.className = 'exec-suivi-pj-item';
            ligne.dataset.path = data.path;
            ligne.dataset.filename = data.filename;
            ligne.innerHTML = `${EXEC_ICONS.file} ${_esc(data.filename)}
                <button type="button" title="${te('supprimer')}"
                        onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            liste.appendChild(ligne);
        } catch (e) {
            console.error('Pièce jointe du suivi :', e);
            _execToast(`${fichier.name} : ${(e && e.message) || te('televersement_impossible')}`, 'error');
        }
    }
    input.value = '';
}

function _collectCommentairesSuivi() {
    const liste = document.getElementById('pac_suivi_liste');
    if (!liste) return null;
    return [...liste.querySelectorAll('.exec-suivi-comm')].map((d) => ({
        date: d.dataset.date || '',
        auteur: d.dataset.auteur || '',
        items: (d.dataset.items || '').split(',').filter(Boolean),
        precision: d.dataset.precision || '',
        texte: d.dataset.texte || '',
        fichiers: (() => { try { return JSON.parse(d.dataset.fichiers || '[]'); } catch { return []; } })(),
        publie: !!d.dataset.publie,
    })).filter((c) => c.texte);
}

// ── Commentaires généraux de suivi (AAC) ─────────────────────────
// Chaque suivi porte sa date et le nom de qui l'a enregistré.
function _execSuiviHtml(s, modifiable) {
    return `<div class="exec-suivi" data-date="${_escAttr(s.date || '')}" data-auteur="${_escAttr(s.auteur || '')}" data-texte="${_escAttr(s.texte || '')}">
        <div class="exec-suivi-tete">
            <strong>${_esc(s.auteur || '')}</strong>
            <span>
                ${s.date ? _formatDate(String(s.date).slice(0, 10)) : ''}
                ${modifiable ? `<button type="button" class="exec-suivi-action" title="${te('modifier')}"
                        onclick="execModifierSuivi(this)">${EXEC_ICONS.edit}</button>
                    <button type="button" class="exec-suivi-action exec-suivi-supprimer" title="${te('supprimer')}"
                        onclick="execSupprimerSuivi(this)">${EXEC_ICONS.x}</button>` : ''}
            </span>
        </div>
        <div>${_esc(s.texte || '')}</div>
    </div>`;
}

// Un suivi reste amendable tant que la constatation n'est pas clôturée.
window.execModifierSuivi = function (bouton) {
    const bloc = bouton.closest('.exec-suivi');
    const zone = document.getElementById('anac_suivi_saisie');
    if (!bloc || !zone) return;
    zone.value = bloc.dataset.texte || '';
    bloc.remove();
    zone.focus();
};

window.execSupprimerSuivi = async function (bouton) {
    if (!await oasisConfirmer(te('confirm_supprimer_commentaire'))) return;
    const liste = document.getElementById('anac_suivis_list');
    bouton.closest('.exec-suivi')?.remove();
    if (liste && !liste.querySelector('.exec-suivi')) {
        liste.innerHTML = `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_suivi')}</em>`;
    }
};

function execAjouterSuivi() {
    const zone = document.getElementById('anac_suivi_saisie');
    const texte = (zone && zone.value || '').trim();
    if (!texte) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    const liste = document.getElementById('anac_suivis_list');
    if (!liste) return;
    liste.querySelector('.exec-suivi-vide')?.remove();       // retire « aucun suivi »
    liste.insertAdjacentHTML('beforeend', _execSuiviHtml({
        date: oasisJour(), auteur, texte,
    }, true));
    zone.value = '';
    liste.scrollTop = liste.scrollHeight;
}

function _collectSuivis() {
    const liste = document.getElementById('anac_suivis_list');
    if (!liste) return null;
    return [...liste.querySelectorAll('.exec-suivi')].map((d) => ({
        date: d.dataset.date || '', auteur: d.dataset.auteur || '', texte: d.dataset.texte || '',
    })).filter((s) => s.texte);
}

function _collectEvaluationANAC() {
    // Ce que l'écran ne porte plus (isolement, traitement des risques, prononcé
    // sur les preuves) reste tel qu'enregistré : la saisie ne l'efface pas.
    const ancienne = ((EXEC_STATE.selectedConstatation?.commentaire_evaluation || {}).evaluation_anac) || {};
    const coche = (id) => (document.getElementById(id)?.checked ? 'OUI' : '');
    return {
        acceptation: {
            ...(ancienne.acceptation || {}),
            accepte: coche('anac_pac_accepte'),
            date: document.getElementById('anac_date_acceptation')?.value || ''
        },
        verification: {
            ...(ancienne.verification || {}),
            suivis: _collectSuivis() || (ancienne.verification || {}).suivis || [],
            preuves_mise_oeuvre: _collectProofsFromContainer('anac_preuves_mise_oeuvre_list'),
            verification_terrain: !!document.getElementById('anac_verif_terrain')?.checked,
        },
        cloture: {
            ...(ancienne.cloture || {}),
            mise_en_oeuvre_effective: coche('anac_mise_effective'),
            date_solde: document.getElementById('anac_date_solde')?.value || '',
            solde_par: document.getElementById('anac_solde_par')?.value || ''
        }
    };
}

function _collectFullEvalData() {
    // Preserve any pre-existing rejet_info from the loaded constatation.
    const prev = EXEC_STATE.selectedConstatation?.commentaire_evaluation;
    let prevObj = {};
    if (prev) {
        if (typeof prev === 'object') prevObj = prev;
        else { try { prevObj = JSON.parse(prev); } catch (e) { prevObj = {}; } }
    }
    const out = {
        evaluation_anac: _collectEvaluationANAC(),
        // Le fil de commentaires reprend les échanges de l'ancienne table :
        // ils y sont repris à l'affichage, la table n'a plus lieu d'être.
        suivi_commentaires: _collectCommentairesSuivi() || prevObj.suivi_commentaires || [],
    };
    if (prevObj.rejet_info) out.rejet_info = prevObj.rejet_info;
    return out;
}

function _collectPACData() {
    return {
        actions_correctives: [{
            cause_primaire: document.getElementById('pac_cause_primaire')?.value || '',
            action_curative: document.getElementById('pac_action_curative')?.value || '',
            curative_date_prevue: document.getElementById('pac_curative_date_prevue')?.value || '',
            curative_preuves: _collectProofsFromContainer('pac_curative_preuves_list'),
            actions_correctives: document.getElementById('pac_actions_correctives')?.value || '',
            corrective_date_prevue: document.getElementById('pac_corrective_date_prevue')?.value || '',
            corrective_preuves: _collectProofsFromContainer('pac_corrective_preuves_list'),
            // Motifs d'amendement : ceux affichés à l'écran s'ils existent —
            // un brouillon les conserve, même incomplets —, sinon ceux déjà
            // enregistrés avec le plan.
            motifs_amendement: _execPacMotifsSaisis()
                || (EXEC_STATE.selectedConstatation?.actions_correctives || [{}])[0]?.motifs_amendement || null,
        }]
    };
}

// Motifs tels qu'affichés, sans exiger qu'ils soient complets : c'est ce
// qu'un enregistrement en brouillon doit retenir. `null` hors amendement.
function _execPacMotifsSaisis() {
    if (!document.getElementById(`motif_sel_${EXEC_PAC_CHAMPS_SUIVIS[0].cle}`)) return null;
    const motifs = {};
    EXEC_PAC_CHAMPS_SUIVIS.forEach((champ) => {
        const sel = document.getElementById(`motif_sel_${champ.cle}`);
        const bloc = document.getElementById(`motif_bloc_${champ.cle}`);
        if (!sel || !bloc || !bloc.classList.contains('visible')) return;
        const motif = sel.value || '';
        if (!motif) return;
        const precision = ((document.getElementById(`motif_txt_${champ.cle}`) || {}).value || '').trim();
        motifs[champ.cle] = { motif, precision: motif === 'motif_autres' ? precision : '' };
    });
    return motifs;
}

// ── Brouillon: PUT without changing status ───────────────────────
async function execSaveDraftPAC(fncId) {
    const pac = _collectPACData();
    const evalData = _collectFullEvalData();
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({
                actions_correctives: pac.actions_correctives,
                commentaire_evaluation: evalData
            })
        });
        _execToast(te('brouillon_enregistre'), 'success');
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Save draft PAC error:', e);
    }
}

// ── Soumettre pour Validation (Postulant) ────────────────────────
async function execSubmitPAC(fncId) {
    const pac = _collectPACData();
    const evalData = _collectFullEvalData();
    // Detect modified fields by comparing current form values with saved PAC
    const fnc = EXEC_STATE.selectedConstatation || {};
    const prevPac = (fnc.actions_correctives || [])[0] || {};
    const newPac = pac.actions_correctives[0] || {};
    const fieldLabels = {
        cause_primaire: te('item_cause'),
        action_curative: te('item_action_curative'),
        curative_date_prevue: te('item_date_curative'),
        actions_correctives: te('item_action_corrective'),
        corrective_date_prevue: te('item_date_corrective')
    };
    const modifiedFields = [];
    for (const [key, label] of Object.entries(fieldLabels)) {
        const prev = (prevPac[key] || '').toString().trim();
        const curr = (newPac[key] || '').toString().trim();
        if (curr !== prev) modifiedFields.push(label);
    }
    // Build submit_info (green notification, replaces rejet_info)
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || '';
    evalData.submit_info = {
        date: oasisJour(),
        auteur,
        motif: modifiedFields.length > 0 ? modifiedFields.join(', ') : te('aucune_modification')
    };
    // Clear any previous rejet_info since postulant is resubmitting
    delete evalData.rejet_info;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-pac`, {
            method: 'PUT',
            body: JSON.stringify({
                actions_correctives: pac.actions_correctives,
                evaluation: evalData
            })
        });
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Submit PAC error:', e);
    }
}

// ── Renvoyer au postulant (AAC) ──────────────────────────────────
async function execReturnPACtoPostulant(fncId) {
    if (!await oasisConfirmer(te('confirm_renvoyer'))) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    // Build motif from items that have comments
    const itemsComments = evalData.items_comments || {};
    const itemLabels = {
        cause_primaire: te('item_cause'),
        action_curative: te('item_action_curative'),
        date_curative: te('item_date_curative'),
        preuves_curative: te('item_preuves_curative'),
        action_corrective: te('item_action_corrective'),
        date_corrective: te('item_date_corrective'),
        preuves_corrective: te('item_preuves_corrective')
    };
    const commentedItems = [];
    for (const [key, label] of Object.entries(itemLabels)) {
        if (itemsComments[key] && itemsComments[key].length > 0) commentedItems.push(label);
    }
    evalData.rejet_info = {
        date: oasisJour(),
        auteur,
        motif: commentedItems.length > 0 ? commentedItems.join(', ') : ''
    };
    // Clear any previous submit_info since AAC is rejecting
    delete evalData.submit_info;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/reject-pac`, {
            method: 'PUT',
            body: JSON.stringify({
                motif: evalData.rejet_info.motif,
                commentaire_evaluation: evalData
            })
        });
        _execToast(te('pac_renvoye_titre'), 'success');
        await execRefreshDynamic();
        // Refresh the slider with the updated FNC state
        const updated = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId);
        if (updated) EXEC_STATE.selectedConstatation = updated;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Return PAC error:', e);
        _execToast((e && e.message) || te('err_renvoi_pac'), 'error');
    }
}

// ── Étape Mise en oeuvre (prestataire) ───────────────────────────
// Choix du mode d'écriture. Un second clic sur le même bouton le referme.
// Les deux modes se cumulent : chaque bouton ouvre ou referme le sien.
// Renoncer à l'amendement rend le plan à sa version acceptée — y compris ce
// qu'un enregistrement en brouillon avait déjà écrit. Les preuves déposées
// entre-temps ne relèvent pas de l'amendement : elles sont conservées.
async function execPacModeEdition(fncId, mode) {
    const courants = (EXEC_STATE.pacMode && EXEC_STATE.pacMode.fncId === fncId)
        ? (EXEC_STATE.pacMode.modes || []) : [];
    const actif = courants.includes(mode);
    if (!actif && mode === 'amendement') await _execPacAssurerEmpreinte(fncId);
    if (actif && mode === 'amendement') {
        if (!await oasisConfirmer(te('confirm_quitter_amendement'))) return;
        await _execPacRetablirPlanAccepte(fncId);
    }
    const modes = actif ? courants.filter((m) => m !== mode) : courants.concat([mode]);
    EXEC_STATE.pacMode = modes.length ? { fncId, modes } : null;
    execOpenPACSlider(fncId);
}

// Empreinte du plan accepté : posée à l'acceptation depuis cette version du
// module. Les constatations acceptées auparavant n'en ont pas — on la prend
// alors à l'entrée en amendement, avant toute modification : le plan en base
// est encore celui que l'AAC a accepté.
async function _execPacAssurerEmpreinte(fncId) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    if (fnc.id !== fncId || fnc.statut !== 'pac_valide') return;
    if (((fnc.pac_accepte || {}).actions_correctives || []).length) return;
    const empreinte = { date: new Date().toISOString(), actions_correctives: fnc.actions_correctives || [] };
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ pac_accepte: empreinte }),
        });
        fnc.pac_accepte = empreinte;             // disponible sans attendre le rechargement
        await execRefreshDynamic();
    } catch (e) {
        console.error('Empreinte du plan accepté :', e);
    }
}

// Remet les champs amendables à leur valeur acceptée et efface les motifs.
async function _execPacRetablirPlanAccepte(fncId) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    const accepte = ((fnc.pac_accepte || {}).actions_correctives || [])[0];
    if (!accepte) return;                       // aucune empreinte : rien à rendre
    const courant = (fnc.actions_correctives || [])[0] || {};
    const divergent = EXEC_PAC_CHAMPS_SUIVIS
        .some((c) => String(courant[c.cle] || '').trim() !== String(accepte[c.cle] || '').trim());
    if (!divergent && !courant.motifs_amendement) return;

    // Le plan revient à l'accepté ; les pièces jointes du moment demeurent.
    const rendu = { ...courant };
    EXEC_PAC_CHAMPS_SUIVIS.forEach((c) => { rendu[c.cle] = accepte[c.cle] || ''; });
    rendu.motifs_amendement = null;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ actions_correctives: [rendu] }),
        });
        _execToast(te('plan_retabli'), 'success');
        await execRefreshDynamic();
    } catch (e) {
        console.error('Rétablissement du plan accepté :', e);
        _execToast((e && e.message) || te('err_retablissement_plan'), 'error');
    }
}

// Soumission depuis l'étape Mise en oeuvre.
//   preuves    : le plan reste tel quel, seules les preuves partent ; le
//                circuit demeure à « Mise en oeuvre ».
//   amendement : le plan est rouvert ; l'acceptation tombe et le circuit
//                revient à « Acceptation ». L'ancien plan est versionné.
async function execSoumettreMiseEnOeuvre(fncId, mode) {
    const amendement = mode === 'amendement';

    // Amendement : tout champ divergent de la version acceptée doit porter son
    // motif. Sans quoi la soumission ne part pas.
    let motifsAmendement = null;
    if (amendement) {
        const { motifs, manquants } = _execPacMotifs();
        if (manquants.length) {
            // Chaque motif absent est encerclé de rouge ; le premier reçoit le
            // curseur.
            document.querySelectorAll('.exec-pac-manquant')
                .forEach((e) => e.classList.remove('exec-pac-manquant'));
            manquants.forEach((m) => {
                const champ = document.getElementById(m.motif === 'motif_autres'
                    ? `motif_txt_${m.champ.cle}` : `motif_sel_${m.champ.cle}`);
                if (champ) champ.classList.add('exec-pac-manquant');
            });
            const premier = manquants[0];
            const cible = document.getElementById(premier.motif === 'motif_autres'
                ? `motif_txt_${premier.champ.cle}` : `motif_sel_${premier.champ.cle}`);
            if (cible) { cible.scrollIntoView({ block: 'center' }); cible.focus(); }
            _execToast(`${te('motif_manquant')} : ${manquants.map((m) => te(m.champ.libelle)).join(', ')}`, 'warning');
            return;
        }
        motifsAmendement = motifs;
    }

    if (!await oasisConfirmer(amendement ? te('confirm_soumettre_amendement') : te('confirm_soumettre_preuves'))) return;

    const pac = _collectPACData();
    if (amendement && pac.actions_correctives[0]) {
        pac.actions_correctives[0].motifs_amendement = motifsAmendement;
    }
    const evalData = _collectFullEvalData();
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || '';
    const aujourdhui = oasisJour();

    try {
        if (amendement) {
            // L'acceptation est remise en jeu : le serveur la vide et archive
            // le plan précédent. Le bandeau de dépôt de preuves n'a plus cours.
            delete evalData.preuves_info;
            delete evalData.rejet_info;
            evalData.submit_info = { date: aujourdhui, auteur, motif: te('pac_amende') };
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-pac`, {
                method: 'PUT',
                body: JSON.stringify({ actions_correctives: pac.actions_correctives, evaluation: evalData, amendement: true }),
            });
            _execToast(te('pac_amende_soumis'), 'success');
        } else {
            evalData.preuves_info = { date: aujourdhui, auteur };
            // De nouvelles preuves annulent le refus précédent.
            delete evalData.preuves_refus;
            const anacP = evalData.evaluation_anac || (evalData.evaluation_anac = {});
            if ((anacP.verification || {}).preuves_acceptees === 'NON') {
                anacP.verification = { ...anacP.verification, preuves_acceptees: '' };
            }
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-preuves`, {
                method: 'PUT',
                body: JSON.stringify({ actions_correctives: pac.actions_correctives, evaluation: evalData }),
            });
            _execToast(te('preuves_soumises'), 'success');
        }
        EXEC_STATE.pacMode = null;
        await execRefreshDynamic();
        const maj = (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
        if (maj) EXEC_STATE.selectedConstatation = maj;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Soumission mise en oeuvre error:', e);
        _execToast((e && e.message) || te('err_soumission'), 'error');
    }
}

// ── Étape Mise en oeuvre : prononcé de l'AAC sur les preuves ─────
// Refus : le circuit reste à la mise en oeuvre, un bandeau rouge porte le
// motif, et le prestataire reprend la main pour déposer de nouvelles preuves.
function execPreuvesNonAcceptables(fncId) {
    _execCommentModal(te('preuves_non_acceptables'), '#dc2626', async (motif) => {
        const user = EXEC_STATE.user || {};
        const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
        const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
        const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
        anac.verification = { ...(anac.verification || {}), preuves_acceptees: 'NON' };
        evalData.preuves_refus = { date: oasisJour(), auteur, motif };
        delete evalData.preuves_info;
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ commentaire_evaluation: evalData }),
            });
            _execToast(te('preuves_refusees'), 'success');
            await execRefreshDynamic();
            execOpenPACSlider(fncId);
        } catch (e) {
            console.error('Refus des preuves :', e);
            _execToast((e && e.message) || te('err_refus_preuves'), 'error');
        }
    });
}

// Acceptation : l'étape « Mise en oeuvre » se ferme et la clôture s'ouvre.
// Si l'AAC a coché « À vérifier sur le terrain », un bandeau l'annonce.
async function execAccepterPreuves(fncId) {
    const terrain = !!document.getElementById('anac_verif_terrain')?.checked;
    if (!await oasisConfirmer(terrain ? te('confirm_accepter_preuves_terrain') : te('confirm_accepter_preuves'))) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
    anac.verification = {
        ...(anac.verification || {}),
        preuves_acceptees: 'OUI',
        verification_terrain: terrain,
        date_acceptation_preuves: oasisJour(),
        acceptees_par: auteur,
    };
    delete evalData.preuves_refus;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ commentaire_evaluation: evalData }),
        });
        _execToast(te('preuves_acceptees_ok'), 'success');
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Acceptation des preuves :', e);
        _execToast((e && e.message) || te('err_acceptation_preuves'), 'error');
    }
}

// Annuler : les saisies non enregistrées sont abandonnées et le formulaire se
// recharge tel qu'il est en base. Il ne se referme pas.
async function execAnnulerSaisiePAC(fncId) {
    if (!await oasisConfirmer(te('confirm_annuler_saisie'))) return;
    execOpenPACSlider(fncId);
}

// Étape Clôture : l'AAC rend la main au prestataire en rouvrant la mise en
// oeuvre — l'acceptation des preuves est retirée, le motif est consigné.
function execRenvoyerMiseEnOeuvre(fncId) {
    _execCommentModal(te('renvoyer_mise_oeuvre'), '#dc2626', async (motif) => {
        const user = EXEC_STATE.user || {};
        const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
        const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
        const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
        anac.verification = {
            ...(anac.verification || {}),
            preuves_acceptees: '', date_acceptation_preuves: '', acceptees_par: '',
        };
        anac.cloture = { ...(anac.cloture || {}), mise_en_oeuvre_effective: '' };
        evalData.retour_mise_oeuvre = { date: oasisJour(), auteur, motif };
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ commentaire_evaluation: evalData }),
            });
            _execToast(te('renvoye_mise_oeuvre'), 'success');
            await execRefreshDynamic();
            execOpenPACSlider(fncId);
        } catch (e) {
            console.error('Renvoi à la mise en oeuvre :', e);
            _execToast((e && e.message) || te('err_renvoi'), 'error');
        }
    });
}

// ── Accepter le PAC (AAC) ────────────────────────────────────────
// `avecPreuves` = faux : seul le plan d'actions est accepté ; l'étape
// « Mise en oeuvre » s'ouvre et attend les preuves.
// `avecPreuves` = vrai : plan et preuves acceptés d'un même geste ; les deux
// étapes se ferment et le circuit se présente à la clôture.
async function execAccepterPAC(fncId, avecPreuves) {
    const question = avecPreuves ? te('confirm_accepter_pac_preuves') : te('confirm_accepter_pac');
    if (!await oasisConfirmer(question)) return;

    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
    const aujourdhui = oasisJour();

    anac.acceptation = { ...(anac.acceptation || {}), accepte: 'OUI' };
    if (!anac.acceptation.date) anac.acceptation.date = aujourdhui;

    if (avecPreuves) {
        const user = EXEC_STATE.user || {};
        anac.verification = {
            ...(anac.verification || {}),
            preuves_acceptees: 'OUI',
            date_acceptation_preuves: aujourdhui,
            acceptees_par: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username || 'AAC',
        };
    }
    // Le plan est accepté : la mention de renvoi n'a plus lieu d'être.
    delete evalData.rejet_info;

    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/validate-pac`, {
            method: 'PUT',
            body: JSON.stringify({ evaluation: evalData }),
        });
        _execToast(avecPreuves ? te('pac_preuves_acceptes') : te('pac_accepte_ok'), 'success');
        await execRefreshDynamic();
        const maj = (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
        if (maj) EXEC_STATE.selectedConstatation = maj;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Accepter PAC error:', e);
        _execToast((e && e.message) || te('err_acceptation_pac'), 'error');
    }
}

// ── Solder la Constatation (AAC) ─────────────────────────────────
async function execCloseFNC(fncId) {
    if (!await oasisConfirmer(te('confirm_solder'))) return;
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/close`, {
            method: 'PUT',
            body: JSON.stringify({ evaluation: evalData })
        });
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Close FNC error:', e);
    }
}
