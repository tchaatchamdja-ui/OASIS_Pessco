/* Module « Exécution de la Surveillance » — fiche officielle de notification.
   Le portage PESSCO produisait une fiche sans en-tête institutionnel ni mise
   en page d'impression. Cet écran la remplace : mêmes données, présentation
   de document officiel, prête à imprimer sur papier.

   ── Document imprimé : français seulement, et c'est une décision ──

   Les libellés de ce document ne passent pas par la table de traduction, et
   n'ont pas à y passer : **la maîtrise d'ouvrage a tranché le 3 octobre 2026 —
   les documents eux-mêmes ne sont pas à traduire.** Un acte de surveillance
   d'une AAC de l'UEMOA est rédigé en français ; l'écran qui le compose est
   trilingue, le document qu'il produit ne l'est pas.

   Ce n'est donc pas un oubli à rattraper. Le garde-fou des traductions ne
   couvre que les écrans, et il n'a pas à être élargi ici.
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

// ── Pourquoi cette fonction rend son corps sur demande ──
//
// Le même balisage sert deux fins : l'aperçu dans le volet, et le **document
// autonome** que « Exporter PDF » ouvre en fenêtre. Il n'en servait qu'une : le
// corps était composé ici et remis directement au volet, d'où rien ne pouvait
// l'en tirer.
//
// *Le document n'existait donc pas faute que son corps fût récupérable, et non
// faute d'être écrit.* Le bouton appelait à la place une route serveur
// (`GET …/notifications/:id/pdf`) **qui n'existe pas**, et tombait toujours
// dans son repli.
//
// Le troisième paramètre est celui qu'`execDownloadRapport` porte déjà, pour
// exactement la même raison — « le même document sert à l'aperçu intégré : on
// le renvoie sur demande ». (ADR-003, n° 5.f.74)
function _showNotificationPreview(data, fromForm, retournerCorps) {
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

  if (retournerCorps) return bodyHtml;
  execSwitchSlider(`${EXEC_ICONS.eye} ${te('apercu_fiche')}`, bodyHtml, footerHtml, 'xl');
  return bodyHtml;
}

window._showNotificationPreview = _showNotificationPreview;

/* ── « Exporter PDF » de la fiche : un document, comme pour le rapport ────────

   Ce module n'a **jamais** produit de PDF au serveur, et n'en produit nulle
   part : sa convention est de composer un document HTML dans le client,
   de l'ouvrir en fenêtre, et que ce document porte lui-même son impression —
   c'est ce que fait `execDownloadRapport` pour le rapport d'activité, et ce que
   la ronde de SURV éprouve déjà sur le produit de ce geste.

   Le bouton de la fiche était le seul à ne pas suivre cette convention. Il
   appelait `GET …/notifications/:id/pdf`, route qui n'existe pas — aucune n'est
   montée sous ce chemin —, de sorte qu'il rendait toujours 404 et tombait
   toujours dans son repli : l'aperçu, et « imprimez avec Ctrl-P ». Son libellé
   promettait donc ce qu'il ne faisait pas.

   ── Les feuilles de style vont par `<link>`, et non recopiées ici ──

   Les classes du document vivent dans les feuilles du module — `.official-doc-*`
   dans `exec-documents.css`, les `.fiche-*` dans `exec-processus.css`, et les
   règles d'impression dans `exec-impression.css`. Les recopier dans une chaîne
   JavaScript en ferait une **seconde** source, qui divergerait au premier
   ajustement de la fiche : le défaut que ce dépôt a rencontré le plus souvent.
   La fenêtre ouverte hérite de l'origine de celle qui l'ouvre, et une adresse
   absolue y suffit.

   Un PDF au serveur aurait par ailleurs exigé Chromium, que `DEPLOYMENT.md`
   déclare hors de portée du plan gratuit — « le rendu PDF exige le plan
   Starter ». Le document du client ne coûte rien de cela.
   ─────────────────────────────────────────────────────────────────────── */
const _FICHE_FEUILLES = [
  '/shared/css/oasis-module.css',
  '/modules/execution/css/exec-base.css',
  '/modules/execution/css/exec-documents.css',
  '/modules/execution/css/exec-processus.css',
  '/modules/execution/css/exec-impression.css',
];

// La barre du document : elle ne s'imprime pas, et elle porte l'impression.
// Même forme que celle du rapport, et les mêmes clés de traduction — aucune
// nouvelle n'a été nécessaire.
function _execFicheBarre(ref) {
  return `<div class="no-print preview-toolbar">
    <span class="preview-toolbar-title">${te('apercu_puce')}</span>
    <span class="preview-toolbar-ref">${_esc(ref || 'Fiche de notification')}</span>
    <button class="preview-btn preview-btn-success" onclick="window.print()" title="${te('astuce_enregistrer_pdf')}">
      ${te('telecharger_pdf')}
    </button>
    <button class="preview-btn preview-btn-ghost" onclick="window.close()">${te('fermer_croix')}</button>
  </div>
  <div class="no-print page-offset"></div>`;
}

window.execExportFicheNotification = async function (notifId, autoPrint, retournerHtml) {
  // La notification peut déjà être celle que le volet porte ; sinon on la lit
  // au serveur, pour que le geste vaille aussi depuis la table des dossiers.
  let data = EXEC_STATE.selectedNotification;
  if (!data || data.id !== notifId) {
    try {
      data = await api(`${EXEC_MODULE_API}/notifications/${notifId}`);
    } catch (e) {
      _execToast((e && e.message) || te('err_chargement'), 'error');
      return null;
    }
  }
  if (!data) {
    _execToast(te('err_chargement'), 'error');
    return null;
  }
  const corps = _showNotificationPreview(data, false, true);
  const ref = data.reference || '';
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${_esc(ref || 'Fiche de notification')}</title>
${_FICHE_FEUILLES.map((f) => `<link rel="stylesheet" href="${f}">`).join('\n')}
</head><body class="exec-document-autonome">
${_execFicheBarre(ref)}
<div id="fiche-content">
${corps}
</div><!-- /#fiche-content -->
<script>
// Le titre de l'onglet se vide : l'en-tête d'impression du navigateur le
// reprend, et un document officiel n'a pas à porter le nom d'un onglet.
try { document.title = ' '; } catch (e) {}
${autoPrint ? `window.addEventListener('load', () => { setTimeout(() => { try { window.focus(); window.print(); } catch (e) {} }, 600); });` : ''}
<\/script>
</body></html>`;
  // Le même document sert à un aperçu intégré : on le renvoie sur demande,
  // comme celui du rapport.
  if (retournerHtml) return html;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  _execToast(te('telecharger'), 'success');
  return html;
};

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
