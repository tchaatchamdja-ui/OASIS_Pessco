/* Module « Exécution de la Surveillance » — fiche officielle de notification.
   Le portage PESSCO produisait une fiche sans en-tête institutionnel ni mise
   en page d'impression. Cet écran la remplace : mêmes données, présentation
   de document officiel, prête à imprimer sur papier.
   ─────────────────────────────────────────────────────────────────────── */

// Valeur affichable : un champ vide se lit « — », jamais un blanc.
const _fVal = (v) => (v === 0 || v ? _esc(String(v)) : '—');
const _fDate = (d) => (d ? _formatDate(d) : '—');

// Ligne d'un tableau d'identification.
const _fLigne = (libelle, valeur) =>
  `<tr><th>${_esc(libelle)}</th><td>${valeur}</td></tr>`;

const _fSection = (numero, titre, contenu) => `
  <section class="fiche-section">
    <h2><span class="fiche-num">${numero}</span>${_esc(titre)}</h2>
    ${contenu}
  </section>`;

function _showNotificationPreview(data, fromForm) {
  const prest = (EXEC_STATE.data.prestataires || []).find((p) => p.id === data.prestataire_id) || {};
  const aac = EXEC_STATE.data.aac || {};
  const programme = data.programme || [];
  const equipe = data.equipe || [];
  const ref = data.reference || (EXEC_STATE.selectedNotification || {}).reference || '';
  // Les lignes saisies commencent souvent par un tiret : la puce de la liste
  // en tient lieu, on ne garde pas les deux.
  const perimetre = String(data.perimetre || data.perimetre_activite || '')
    .split('\n').map((l) => l.trim().replace(/^[-–—•*]\s*/, '')).filter(Boolean);

  const entete = `
    <header class="fiche-entete">
      <div class="fiche-emetteur">
        ${aac.logo ? `<img class="fiche-logo" src="${_escAttr(aac.logo)}" alt="">` : ''}
        <div>
          <div class="fiche-etat">${_esc(aac.pays || aac.etat || '')}</div>
          <div class="fiche-aac">${_esc(aac.nom || aac.sigle || '')}</div>
          ${aac.sigle && aac.nom ? `<div class="fiche-sigle">${_esc(aac.sigle)}</div>` : ''}
        </div>
      </div>
      <div class="fiche-identite">
        <div class="fiche-ref"><span>Référence</span><strong>${_fVal(ref)}</strong></div>
        <div class="fiche-ref"><span>Édité le</span><strong>${_formatDate(oasisJour())}</strong></div>
      </div>
    </header>
    <h1 class="fiche-titre">Fiche de notification d'activité de surveillance</h1>
    <div class="fiche-destinataire">
      <span>À l'attention de</span>
      <strong>${_fVal(prest.nom || data.prestataire_nom)}</strong>
    </div>`;

  const prestataire = _fSection(1, 'Prestataire', `
    <table class="fiche-table">
      ${_fLigne('Désignation', _fVal(prest.nom || data.prestataire_nom))}
      ${_fLigne('Nom du 1er responsable', _fVal(data.nom_responsable || data.dirigeant || prest.dirigeant))}
      ${_fLigne('Fonction du 1er responsable', _fVal(data.fonction_responsable || prest.fonction_responsable))}
      ${_fLigne('Interlocuteur principal', _fVal(data.interlocuteur_nom || prest.point_focal))}
      ${_fLigne('Fonction de l’interlocuteur', _fVal(data.interlocuteur || prest.fonction_point_focal))}
      ${_fLigne('Courriel de l’interlocuteur', _fVal(data.interlocuteur_email || prest.email_point_focal))}
    </table>`);

  const equipeSection = _fSection(2, "Équipe d'audit / inspection", equipe.length ? `
    <table class="fiche-table fiche-grille">
      <thead><tr><th style="width:2.5rem;">#</th><th>Nom et prénoms</th><th>Rôle</th></tr></thead>
      <tbody>
        ${equipe.map((m, i) => {
          const nom = typeof m === 'object' ? (m.nom || '') : m;
          const role = typeof m === 'object' ? (m.role || m.fonction || '') : '';
          return `<tr><td>${i + 1}</td><td>${_fVal(nom)}</td><td>${_fVal(role)}</td></tr>`;
        }).join('')}
      </tbody>
    </table>` : '<p class="fiche-vide">Équipe non encore désignée.</p>');

  const activite = _fSection(3, 'Activité', `
    <table class="fiche-table">
      ${_fLigne('Nature de l’activité', _fVal(data.type_supervision || data.nature_activite))}
      ${_fLigne('Objet', _fVal(data.objet || data.objet_activite))}
      ${_fLigne('Dates prévues', `${_fDate(data.date_debut_prevue || data.date_activite)} &nbsp;→&nbsp; ${_fDate(data.date_fin_prevue || data.date_fin_effective)}`)}
      ${_fLigne('Lieu', _fVal(data.lieu || data.lieu_activite))}
    </table>
    <div class="fiche-sous-titre">Périmètre couvert</div>
    ${perimetre.length
      ? `<ul class="fiche-liste">${perimetre.map((l) => `<li>${_esc(l)}</li>`).join('')}</ul>`
      : '<p class="fiche-vide">Périmètre non précisé.</p>'}`);

  const programmeSection = _fSection(4, 'Programme de travail', programme.length ? `
    <table class="fiche-table fiche-grille">
      <thead><tr>
        <th style="width:6.5rem;">Date</th><th style="width:7rem;">Horaire</th>
        <th>Actions prévues</th><th style="width:11rem;">Correspondant</th>
      </tr></thead>
      <tbody>
        ${programme.map((p) => `<tr>
          <td>${p.date ? _formatDate(p.date) : '—'}</td>
          <td>${_fVal(p.horaire)}</td>
          <td>${_fVal(p.actions)}</td>
          <td>${_fVal(p.correspondant)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="fiche-vide">Programme non encore arrêté.</p>');

  const cadre = _fSection(5, 'Cadre de référence', `
    <table class="fiche-table">
      ${_fLigne('Référentiels applicables', _fVal(data.referentiels))}
      ${_fLigne('Documents requis', _fVal(data.documents_requis))}
    </table>`);

  const signature = `
    <section class="fiche-signature">
      <div class="fiche-lieu">
        <div>Fait à <strong>${_fVal(data.fait_a)}</strong>, le <strong>${_fDate(data.date_signature || data.date_edition)}</strong></div>
      </div>
      <div class="fiche-cartouche">
        <div class="fiche-cartouche-titre">Pour l'Autorité</div>
        <div class="fiche-cartouche-espace"></div>
        <div class="fiche-cartouche-nom">${_fVal(data.signataire)}</div>
      </div>
    </section>`;

  // Le pied ferme la page : il vient après l'accusé quand il y en a un.
  const pied = `
    <footer class="fiche-pied">
      ${_esc(aac.sigle || aac.nom || '')}${ref ? ` · ${_esc(ref)}` : ''} · Document établi par OASIS
    </footer>`;

  // Accusé de réception du prestataire, en pied de fiche. Dates et périmètre
  // sont ceux figés au moment de l'accusé : l'engagement porte sur ce qui a
  // été lu, pas sur une version ultérieure de la notification.
  const accuse = Number(data.accuse_reception) === 1 ? `
    <section class="fiche-section fiche-accuse">
      <h2>ACCUSÉ DE RÉCEPTION</h2>
      <p class="fiche-accuse-texte">
        Nous accusons réception de la notification et sommes disposés à vous recevoir
        du <strong>${_fDate(data.accuse_date_debut || data.date_debut_effective || data.date_activite)}</strong>
        au <strong>${_fDate(data.accuse_date_fin || data.date_fin_effective)}</strong>
        dans le cadre de la supervision des activités suivantes :
        <strong class="fiche-accuse-perimetre">${_fVal(data.accuse_perimetre || data.perimetre_activite || data.perimetre)}</strong>
      </p>
      <div class="fiche-accuse-pied">
        <span>Accusé le <strong>${_fDate(String(data.accuse_le || '').slice(0, 10))}</strong></span>
        <span>par <strong>${_fVal(data.accuse_par_nom || data.accuse_par)}</strong></span>
      </div>
    </section>` : '';

  const bodyHtml = `
    <div class="official-doc-form">
      <article class="official-doc-page fiche-notification">
        ${entete}
        ${prestataire}
        ${equipeSection}
        ${activite}
        ${programmeSection}
        ${cadre}
        ${signature}
        ${accuse}
        ${pied}
      </article>
    </div>`;

  const footerHtml = fromForm
    ? `<button class="btn btn-outline" onclick="execOpenNotificationForm(EXEC_STATE.selectedNotification)">
         ${EXEC_ICONS.back} ${te('retour_formulaire')}
       </button>
       <button class="btn btn-primary" onclick="execSubmitNotificationForValidation()">
         ${EXEC_ICONS.send} ${te('soumettre_validation')}
       </button>`
    : `<button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
       ${_execCanValidate() && data.statut === 'soumis' ? `
         <button class="btn btn-success" onclick="execValidateNotification('${data.id}')">${te('valider')}</button>
         <button class="btn btn-danger" onclick="execRejectNotification('${data.id}')">${te('rejeter')}</button>` : ''}`;

  execSwitchSlider(`${EXEC_ICONS.eye} ${te('apercu_fiche')}`, bodyHtml, footerHtml, 'xl');
}

window._showNotificationPreview = _showNotificationPreview;

/* ── Aperçu d'un rapport ──────────────────────────────────────────────────
   L'aperçu reprend le document final lui-même (celui produit à l'impression :
   en-tête de l'Autorité, encadré Prestataire / Activité, rubriques, annexes),
   affiché tel quel dans un cadre. La page se partage en deux : un quart pour
   les commentaires du validateur, trois quarts pour la prévisualisation.
   ─────────────────────────────────────────────────────────────────────── */
async function execPreviewRapport(rapportId) {
  let rapport;
  try {
    rapport = await api(`${EXEC_MODULE_API}/rapports/${rapportId}`);
  } catch (e) {
    _execToast((e && e.message) || te('err_chargement_rapport'), 'error');
    return;
  }
  if (!rapport) return;
  EXEC_STATE.selectedRapport = rapport;

  const dossierId = (EXEC_STATE.selectedDossier || {}).id || '';
  const peutCommenter = _execCanValidate() && rapport.statut === 'soumis';
  const commentaires = rapport.commentaires_apercu || '';

  // Document final, rendu dans un cadre isolé : ses styles d'impression ne
  // débordent pas sur l'application.
  let document_ = '';
  try {
    document_ = await execDownloadRapport(rapportId, false, true);
    // La barre d'outils de la fenêtre d'impression n'a pas cours ici : le
    // volet porte déjà ses propres actions.
    document_ = document_.replace('</head>',
      '<style>.no-print{display:none !important;}body{padding:0;}</style></head>');
  } catch (e) {
    document_ = '';
  }

  const bodyHtml = `
    <div class="exec-apercu-rapport">
      <aside class="exec-apercu-commentaires">
        <h4>Commentaires sur le rapport</h4>
        <p class="exec-apercu-meta">
          <strong>${_esc(rapport.reference || '')}</strong> (v${rapport.version || 1})
          ${_execStatusBadge(rapport.statut)}
        </p>
        <textarea id="apercu_commentaires" class="form-input" rows="16"
          placeholder="${peutCommenter ? 'Saisir vos observations…' : ''}"
          ${peutCommenter ? '' : 'readonly'}>${_esc(commentaires)}</textarea>
        ${peutCommenter ? `<button class="btn btn-primary btn-sm" onclick="execSaveApercuComments('${rapportId}')">
          ${EXEC_ICONS.clipboard} Enregistrer les observations</button>` : ''}
      </aside>
      <section class="exec-apercu-document">
        <h4>Prévisualisation</h4>
        ${document_
          ? `<iframe class="exec-apercu-cadre" title="Rapport ${_escAttr(rapport.reference || '')}"
               srcdoc="${document_.replace(/"/g, '&quot;')}"></iframe>`
          : '<p class="exec-proc-vide">Document indisponible.</p>'}
      </section>
    </div>`;

  const footerHtml = `
    <button class="btn btn-outline" onclick="execBackToValidation('${dossierId}')">${EXEC_ICONS.back} Retour</button>
    <button class="btn btn-primary btn-sm" onclick="execDownloadRapport('${rapportId}', true)">${EXEC_ICONS.pdf} Exporter PDF</button>`;

  execShowSlider(`${EXEC_ICONS.rapports} ${te('apercu')}`, bodyHtml, footerHtml, 'max');
}

window.execPreviewRapport = execPreviewRapport;
