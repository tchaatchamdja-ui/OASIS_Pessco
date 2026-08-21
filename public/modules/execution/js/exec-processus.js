/* Module « Exécution de la Surveillance » — processus d'une activité.
   Depuis « Activités de Supervision », un clic sur une activité ouvre un volet
   couvrant, du bord droit de la barre latérale au bord de l'écran, qui porte
   tout le circuit : déclenchement, confirmation, réalisation, rapport,
   validation, transmission.
   Les formulaires du module (notification, échanges, dossier) s'affichent dans
   ce même volet : le fil d'avancement reste en tête, et l'on ne quitte jamais
   la page de l'activité. Aucun écran n'est réécrit — les fonctions du module
   sont réutilisées, et leur rendu est simplement composé avec le fil.
   ─────────────────────────────────────────────────────────────────────── */

const EXEC_PROC_ETAPES = [
  { id: 'notification', label: 'Notification' },
  { id: 'confirmation', label: 'Confirmation' },
  { id: 'realisation', label: 'Réalisation' },
  { id: 'rapport', label: 'Rapport' },
  { id: 'validation', label: 'Validation' },
  { id: 'transmission', label: 'Transmission' },
];

// Étapes portées par le formulaire Dossier, et onglet correspondant.
const EXEC_PROC_VERS_DOSSIER = {
  realisation: 'realisation',
  rapport: 'redaction',
  validation: 'validation',
  transmission: 'validation',
};

// Contexte courant du volet.
let EXEC_PROC = null;

// ── État du circuit ──
function execProcEtat(notif, dossier) {
  const st = notif ? notif.statut : '';
  const rapports = (dossier && dossier.rapports) || [];
  // Un rapport renvoyé pour correction repasse en brouillon : il ne vaut plus
  // soumission tant qu'il n'est pas soumis de nouveau.
  const rapportSoumis = rapports.some((r) => ['soumis', 'valide', 'transmis'].includes(r.statut));
  const rapportValide = rapports.some((r) => ['valide', 'transmis'].includes(r.statut));
  const rapportTransmis = rapports.some((r) => r.statut === 'transmis');

  const cloture = !!dossier && dossier.statut === 'cloture';

  // Jalons de fin d'étape :
  //   Réalisation  → clôture de l'exécution sur le terrain
  //   Rapport      → soumission du rapport
  //   Validation   → validation du rapport
  //   Transmission → transmission du rapport au prestataire
  const faites = {
    notification: ['envoye', 'acte'].includes(st),
    confirmation: st === 'acte',
    realisation: !!(dossier && dossier.realisation_closed),
    rapport: rapportSoumis,
    validation: rapportValide,
    transmission: rapportTransmis,
  };
  const ouvertes = {
    notification: true,
    confirmation: ['envoye', 'acte'].includes(st),
    realisation: !!dossier,
    rapport: !!(dossier && dossier.realisation_closed),
    validation: rapportSoumis,
    transmission: rapportValide,
  };
  return {
    faites,
    ouvertes,
    courante: EXEC_PROC_ETAPES.map((e) => e.id).find((id) => !faites[id]) || null,
    cloture,
    rapports,
  };
}

// ══════════════════════════════════════
//  Fils d'avancement (chevrons)
// ══════════════════════════════════════
// `etapes` : { id, label, done, current, selected, disabled, onClick }
// `current` = étape où en est le circuit (orange) ; `selected` = celle que
// l'on consulte (couleur du thème). L'étape en cours reste orange.
function execProcFilHtml(etapes, petit) {
  return `<div class="eval-steps exec-proc-fil${petit ? ' exec-proc-fil-sm' : ''}">
    ${etapes.map((e) => {
      const cls = ['eval-step', 'exec-proc-step', e.done ? 'done' : '', e.current ? 'current' : '',
        e.selected ? 'selected' : '', e.disabled ? 'verrouillee' : ''].filter(Boolean).join(' ');
      const action = e.onClick && !e.disabled ? ` onclick="${e.onClick}"` : '';
      return `<button class="${cls}"${e.disabled ? ' disabled' : ''}${action} title="${_esc(e.label)}">${_esc(e.label)}</button>`;
    }).join('')}
  </div>`;
}

function execProcFilPrincipal() {
  const etat = execProcEtat(EXEC_PROC.notif, EXEC_PROC.dossier);
  const fil = execProcFilHtml(EXEC_PROC_ETAPES.map((e) => ({
    id: e.id, label: e.label,
    done: etat.faites[e.id],
    current: etat.courante === e.id,
    // Dossier clôturé : le circuit est achevé, toutes les étapes se lisent en
    // vert — la consultation ne recolore plus l'étape ouverte.
    selected: !etat.cloture && EXEC_PROC.etape === e.id,
    disabled: !etat.ouvertes[e.id],
    onClick: `execProcAller('${e.id}')`,
  })));
  return `<div class="exec-proc-barre">
    ${fil}
    <span class="exec-proc-fin ${etat.cloture ? 'closed' : ''}">${etat.cloture ? 'Clôturé' : 'En cours'}</span>
  </div>`;
}

// ══════════════════════════════════════
//  Composition : le fil coiffe tout écran affiché dans le volet
// ══════════════════════════════════════
// Les formulaires du module passent tous par execShowSlider /
// execSwitchSlider / _execFadeSliderContent. Tant qu'un processus est ouvert,
// on enveloppe leur corps du fil d'avancement : ils s'affichent donc dans la
// page de l'activité, sans être modifiés.
const _execProcOrig = {
  show: window.execShowSlider,
  switch: window.execSwitchSlider,
  fade: window._execFadeSliderContent,
  close: window.execCloseSlider,
};

// Le fil principal, puis l'entête de l'étape (titre, informations, sous-fil),
// puis l'écran hébergé : sa bordure supérieure vient au contact du sous-fil.
const execProcCoiffe = (bodyHtml) => {
  if (!EXEC_PROC || !EXEC_PROC.actif) return bodyHtml;
  // Confirmation : discussions à gauche, confirmation de l'activité à droite.
  const corps = EXEC_PROC.etape === 'confirmation'
    ? `<div class="exec-proc-2col">
         <div class="exec-proc-col">${bodyHtml}</div>
         <div class="exec-proc-col exec-proc-col-accord">${execProcColonneAccord()}</div>
       </div>`
    : bodyHtml;
  return `${execProcFilPrincipal()}${execProcEnteteEtape()}<div class="exec-proc-hote">${corps}</div>`;
};

// Colonne droite de l'étape Confirmation : dates et périmètre retenus.
function execProcColonneAccord() {
  const n = EXEC_PROC.notif;
  if (!n) return '';
  const acte = n.statut === 'acte';
  const peut = _execCanContribute() && !_execIsPrestataire();
  if (acte) {
    return `<h4 class="exec-proc-col-titre">Activité confirmée</h4>
      <div class="exec-proc-bloc">
        ${execProcLigne('Référence d’activité', _esc(n.reference_activite || ''))}
        ${execProcLigne('Dates retenues', `${_formatDate(n.date_debut_effective)} → ${_formatDate(n.date_fin_effective)}`)}
        ${execProcLigne('Périmètre validé', _esc(n.perimetre_valide || ''))}
      </div>`;
  }
  return `<h4 class="exec-proc-col-titre">Confirmer l'activité</h4>
    <div class="exec-proc-bloc">
      <label class="form-label">Date de début effective</label>
      <input type="date" class="form-control" id="exec_proc_debut" value="${_esc((n.date_activite || '').slice(0, 10))}" ${peut ? '' : 'disabled'}>
      <label class="form-label">Date de fin effective</label>
      <input type="date" class="form-control" id="exec_proc_fin" value="${_esc((n.date_fin_effective || '').slice(0, 10))}" ${peut ? '' : 'disabled'}>
      <label class="form-label">Périmètre validé</label>
      <textarea class="form-control" id="exec_proc_perimetre" rows="8" ${peut ? '' : 'disabled'}>${_esc(n.perimetre_activite || '')}</textarea>
    </div>
    `;
}

// Les écrans repris de PESSCO nomment diversement le refus (« Rejeter »,
// « Renvoyer »). Dans le volet du processus, tous portent la même couleur.
// Pied du formulaire de notification, dans le volet du processus : l'aperçu
// n'y a plus cours et l'enregistrement porte un libellé court.
function execProcAjusterPiedFormulaire() {
  if (!EXEC_PROC || !EXEC_PROC.actif) return;
  requestAnimationFrame(() => {
    document.querySelectorAll('#execSlider .exec-slider-footer button').forEach((b) => {
      const action = b.getAttribute('onclick') || '';
      if (action.includes('execPreviewNotificationFromForm')) b.remove();
      // Le volet ne se quitte que par le bandeau : les « Fermer » hérités des
      // écrans autonomes n'ont plus d'objet dans le processus.
      else if (/^\s*execCloseSlider\(\s*\)\s*;?\s*$/.test(action)) b.remove();
      else if (action.includes('execSaveNotificationDraft')) {
        // Seul le libellé change : l'icône du bouton est conservée.
        const texte = [...b.childNodes].find((x) => x.nodeType === 3 && x.textContent.trim());
        if (texte) texte.textContent = ' Brouillon';
      }
    });
  });
}

// ── Répartition des actions entre la ligne de titre et la barre inférieure ──
// Les actions qui font franchir l'étape siègent sur la ligne du titre, à
// droite ; les impressions et exports rejoignent la barre inférieure.
function execProcPiedVolet(volet) {
  let pied = volet.querySelector('.exec-slider-footer');
  if (!pied) {
    pied = document.createElement('div');
    pied.className = 'exec-slider-footer';
    volet.appendChild(pied);
  }
  return pied;
}

const EXEC_PROC_IMPRESSION = /imprimer|exporter pdf|télécharger|generer pdf|générer pdf/i;

// Actions qui closent une étape : elles se lisent sur la ligne du titre, à
// droite. Elles sont reconnues à l'action portée par le bouton, non à l'étape
// consultée : un rapport renvoyé en rédaction depuis la Transmission fait
// réapparaître « Soumettre », qui rejoint la ligne comme les autres.
const EXEC_PROC_FIN_ETAPE = [
  { action: 'execCloseRealisation', libelle: 'Rédiger Rapport', classe: 'exec-proc-btn-rapport' },
  { action: 'execSubmitDossier', classe: 'exec-proc-btn-soumettre' },
  { action: 'execSendRapportValidated', classe: 'exec-proc-btn-envoyer' },
  { action: 'execCloseDossier', libelle: 'Clôturer', classe: 'exec-proc-btn-cloturer' },
];

// Étape Réalisation déjà close : le bouton mène simplement à la rédaction.
const EXEC_PROC_REPLI_REALISATION = {
  classe: 'exec-proc-btn-rapport', libelle: 'Rédiger Rapport', action: "execProcAller('rapport')",
};

// Étape Validation : « Valider » se décide en regard de la version soumise,
// dans la colonne Action de la table des rapports, et non en pied de page.
function execProcValiderDansTable(volet, pied) {
  const bouton = [...pied.querySelectorAll('button')]
    .find((b) => (b.getAttribute('onclick') || '').includes('execValidateRapport'));
  if (!bouton) return;
  const id = ((bouton.getAttribute('onclick') || '').match(/execValidateRapport\('([^']+)'\)/) || [])[1];
  const cellule = id && [...volet.querySelectorAll('.exec-data-table td')]
    .find((td) => td.querySelector(`button[onclick*="${id}"]`));
  if (!cellule) return;
  bouton.className = 'btn btn-sm btn-success exec-proc-btn-valider';
  cellule.classList.add('exec-proc-td-actions');
  cellule.insertBefore(bouton, cellule.firstChild);
}

// Table des versions du rapport : la version en cours se distingue des
// précédentes, qui restent consultables sans occuper le regard.
function execProcSoignerTableRapports(volet) {
  volet.querySelectorAll('.exec-data-table').forEach((table) => {
    const lignes = [...table.querySelectorAll('tbody tr')]
      .filter((tr) => tr.querySelector('button[onclick*="execPreviewRapport"]'));
    if (!lignes.length) return;
    table.classList.add('exec-proc-rapports');
    // La version « en cours » est celle qui appelle une décision — elle porte
    // d'autres actions que l'aperçu ; à défaut, la plus récente.
    const courante = lignes.find((tr) => tr.querySelectorAll('button').length > 1) || lignes[0];
    lignes.forEach((tr) => {
      tr.classList.add('exec-proc-rap');
      const estCourante = tr === courante;
      if (estCourante) tr.classList.add('exec-proc-rap-courante');
      // La version se lit comme une pastille, non comme un texte de tableau.
      const cellule = tr.children[1];
      if (cellule && !cellule.querySelector('.exec-proc-version')) {
        const libelle = cellule.textContent.trim();
        cellule.innerHTML = `<span class="exec-proc-version">${_esc(libelle)}</span>`
          + (estCourante ? '<span class="exec-proc-version-courante">en cours</span>' : '');
      }
      const ref = tr.children[0];
      if (ref) ref.classList.add('exec-proc-rap-ref');
    });
  });
}

// Les observations portées sur une version sont l'information utile de
// l'étape : elles s'affichent dépliées, sous un intitulé explicite.
function execProcOuvrirCommentaires(volet) {
  volet.querySelectorAll('.exec-data-table details').forEach((d) => {
    d.open = true;
    d.classList.add('exec-proc-commentaires');
    const resume = d.querySelector('summary');
    if (resume && !resume.dataset.procTitre) {
      resume.dataset.procTitre = '1';
      const version = (resume.textContent.match(/v\d+/) || [''])[0];
      resume.textContent = `Observations du validateur${version ? ` — ${version}` : ''}`;
    }
  });
}

function execProcRepartirActions() {
  if (!EXEC_PROC || !EXEC_PROC.actif) return;
  requestAnimationFrame(() => {
    const volet = document.getElementById('execSlider');
    if (!volet) return;
    const titre = volet.querySelector('.exec-proc-titre');

    // Impressions et exports : barre inférieure, à droite.
    const pied = execProcPiedVolet(volet);
    // La fiche officielle s'imprime depuis la barre inférieure.
    if (EXEC_PROC.etape === 'notification' && EXEC_PROC.notif
        && execProcFicheAffichee(EXEC_PROC.sousEtape || execProcSousDefaut())
        && !pied.querySelector('.exec-proc-btn-fiche')) {
      const b = document.createElement('button');
      b.className = 'btn btn-outline btn-sm exec-proc-btn-impression exec-proc-btn-fiche';
      b.setAttribute('onclick', 'execProcImprimerFiche()');
      b.textContent = 'Imprimer la fiche';
      pied.appendChild(b);
    }
    volet.querySelectorAll('.exec-slider-body button, .exec-proc-titre button').forEach((b) => {
      if (!EXEC_PROC_IMPRESSION.test(b.textContent || '')) return;
      if (b.closest('.exec-slider-footer')) return;
      b.classList.add('exec-proc-btn-impression');
      pied.appendChild(b);
    });

    // Étape Validation : la validation se décide sur la ligne du rapport
    // concerné, dans la colonne Action de la table des versions.
    if (EXEC_PROC.etape === 'validation') execProcValiderDansTable(volet, pied);
    execProcSoignerTableRapports(volet);
    execProcOuvrirCommentaires(volet);

    // Les actions de fin d'étape quittent la barre inférieure pour la ligne du
    // titre : « Rédiger Rapport » à la Réalisation, « Soumettre » au Rapport,
    // « Envoyer » et « Clôturer » à la Transmission.
    if (!titre) return;
    // Le groupe d'actions de l'étape est repoussé à l'extrême droite de la
    // ligne : les boutons déplacés le rejoignent, ils ne suivent pas le titre.
    let cible = titre.querySelector('.exec-proc-actions-etape');
    if (!cible) {
      cible = document.createElement('div');
      cible.className = 'exec-proc-actions-etape';
      titre.appendChild(cible);
    }
    EXEC_PROC_FIN_ETAPE.forEach((fin) => {
      const bouton = [...pied.querySelectorAll('button')]
        .find((b) => (b.getAttribute('onclick') || '').includes(fin.action));
      if (!bouton) return;
      bouton.className = `btn btn-sm btn-primary ${fin.classe}`;
      if (fin.libelle) bouton.textContent = fin.libelle;
      cible.appendChild(bouton);
    });
    const r = EXEC_PROC_REPLI_REALISATION;
    if (EXEC_PROC.etape === 'realisation' && (EXEC_PROC.dossier || {}).realisation_closed
        && !titre.querySelector(`.${r.classe}`)) {
      const b = document.createElement('button');
      b.className = `btn btn-sm btn-primary ${r.classe}`;
      b.setAttribute('onclick', r.action);
      b.textContent = r.libelle;
      cible.appendChild(b);
    }
  });
}

// L'étape Réalisation reste ouverte à la saisie tant que le rapport n'est pas
// soumis : clore l'exécution sur le terrain ouvre la rédaction sans figer les
// constats déjà portés.
const _execProcEtatEtape = window._dossierStepState;
if (typeof _execProcEtatEtape === 'function') {
  window._dossierStepState = function (dossier, stepId) {
    const etat = _execProcEtatEtape(dossier, stepId);
    if (!EXEC_PROC || !EXEC_PROC.actif || stepId !== 'realisation' || !etat.closed) return etat;
    const rapports = (dossier || {}).rapports || [];
    const soumis = rapports.some((r) => ['soumis', 'valide', 'transmis'].includes(r.statut));
    if (soumis || (dossier || {}).statut === 'cloture' || !_execCanContribute()) return etat;
    return { ...etat, closed: false, editable: true };
  };
}

// Étape « Rapport » : ses sous-onglets sont le fil d'avancement de l'étape.
// Ils rejoignent la ligne du titre, comme les sous-étapes de la Notification.
// La barre garde son identifiant : les bascules d'onglet continuent d'opérer.
function execProcRemonterSousOnglets() {
  if (!EXEC_PROC || !EXEC_PROC.actif) return;
  requestAnimationFrame(() => {
    const titre = document.querySelector('#execSlider .exec-proc-titre');
    const barre = document.querySelector('#execSlider #dossier_redaction_subtab_bar');
    if (!titre || !barre || titre.contains(barre)) return;
    barre.style.marginBottom = '0';
    titre.insertBefore(barre, titre.querySelector('.exec-proc-actions-etape') || null);
  });
}

function execProcMarquerRejets() {
  if (!EXEC_PROC || !EXEC_PROC.actif) return;
  requestAnimationFrame(() => {
    document.querySelectorAll('#execSlider button').forEach((b) => {
      if (/rejet|renvoy/i.test(b.textContent || '')) b.classList.add('exec-btn-rejet');
    });
  });
}

// Dans le processus, tout écran adopte le bandeau et la largeur du volet :
// certains écrans repris de PESSCO s'ouvraient en tiroir étroit (échanges).
const execProcTitreOu = (title) => (EXEC_PROC && EXEC_PROC.actif ? execProcTitre() : title);
const execProcTailleOu = (size) => (EXEC_PROC && EXEC_PROC.actif ? 'max' : size);

// Le processus est une page, non une succession de tiroirs : le passage d'une
// étape ou d'une sous-étape à l'autre est immédiat, sans glissement ni fondu.
// Le volet ne se ferme, lui, que sur un menu, « Retour au portail » ou
// « Retour à la liste d'Activité » : le voile et la croix n'y donnent plus lieu.
function execProcFixerVolet() {
  if (!EXEC_PROC || !EXEC_PROC.actif) return;
  const slider = document.getElementById('execSlider');
  const voile = document.getElementById('execSliderOverlay');
  if (slider) { slider.classList.add('exec-proc-instant', 'open'); }
  if (voile) { voile.classList.add('exec-proc-instant', 'open'); voile.onclick = null; }
  const croix = slider && slider.querySelector('.exec-slider-close');
  if (croix) croix.remove();
}

// Les barres inférieures s'alignent sur le chevron de rétraction de la barre
// latérale : les deux pieds de page ont alors la même hauteur.
function execProcAlignerPieds() {
  const chevron = document.querySelector('.sidebar-toggle');
  if (!chevron) return;
  const h = Math.round(chevron.getBoundingClientRect().height);
  if (h) document.documentElement.style.setProperty('--exec-pied-hauteur', `${h}px`);
}

function execProcApresRendu() {
  execProcAlignerPieds();
  execProcFixerVolet();
  execProcMarquerRejets();
  execProcAjusterPiedFormulaire();
  execProcRemonterSousOnglets();
  execProcRepartirActions();
}

window.execShowSlider = function (title, bodyHtml, footerHtml, size) {
  const r = _execProcOrig.show(execProcTitreOu(title), execProcCoiffe(bodyHtml), footerHtml, execProcTailleOu(size));
  execProcApresRendu();
  return r;
};
window.execSwitchSlider = function (title, bodyHtml, footerHtml, size) {
  const r = _execProcOrig.switch(execProcTitreOu(title), execProcCoiffe(bodyHtml), footerHtml, execProcTailleOu(size));
  execProcApresRendu();
  return r;
};
window._execFadeSliderContent = function (title, bodyHtml, footerHtml, size) {
  const r = _execProcOrig.fade(execProcTitreOu(title), execProcCoiffe(bodyHtml), footerHtml, execProcTailleOu(size));
  execProcApresRendu();
  // Le fondu du corps est posé dans une frame ultérieure : on le retire après.
  requestAnimationFrame(() => requestAnimationFrame(execProcFixerVolet));
  return r;
};
// `immediate` marque la remise à zéro interne faite avant d'ouvrir un autre
// écran : le processus reste alors ouvert. Seule une fermeture demandée par
// l'utilisateur met fin au volet.
window.execCloseSlider = function (immediate) {
  if (EXEC_PROC && EXEC_PROC.enAction) EXEC_PROC.fermeDemandee = true;
  if (EXEC_PROC && !immediate && !EXEC_PROC.enAction) EXEC_PROC.actif = false;
  return _execProcOrig.close(immediate);
};

// Thème et langue ne sont pas des sorties du processus : ils rhabillent
// l'application, le volet est rétabli tel qu'il était.
function execProcPreserver(fn) {
  return function () {
    if (!EXEC_PROC || !EXEC_PROC.actif) return fn.apply(null, arguments);
    EXEC_PROC.enAction = true;
    EXEC_PROC.fermeDemandee = false;
    try { fn.apply(null, arguments); } finally { EXEC_PROC.enAction = false; }
    // Le re-rendu de l'application ferme le volet (avec un retard d'animation) :
    // on le reprend aussitôt, à l'étape où il était.
    if (EXEC_PROC.fermeDemandee) {
      EXEC_PROC.fermeDemandee = false;
      _execProcOrig.close(true);
      execProcAfficher();
    }
  };
}
window.execSetLang = execProcPreserver(window.execSetLang);
window.execSetTheme = execProcPreserver(window.execSetTheme);

// Enveloppe une action du processus : les écrans qu'elle ouvre restent dans le
// volet, même si elles referment le volet courant au passage.
async function execProcEnAction(fn) {
  EXEC_PROC.enAction = true;
  try { return await fn(); } finally { EXEC_PROC.enAction = false; }
}

// ══════════════════════════════════════
//  Ouverture du volet
// ══════════════════════════════════════
async function execProcCharger(activiteId, notifId) {
  const notifs = EXEC_STATE.data.notifications || [];
  const notif = notifId
    ? notifs.find((n) => n.id === notifId) || null
    : notifs.find((n) => n.activite_id === activiteId) || null;
  let dossier = null;
  if (notif) {
    const entete = (EXEC_STATE.data.dossiers || []).find((d) => d.notification_id === notif.id);
    // Le détail porte les rapports et les constatations, absents de la liste.
    if (entete) dossier = await api(`${EXEC_MODULE_API}/dossiers/${entete.id}`).catch(() => entete);
  }
  return { notif, dossier };
}

async function execOpenActiviteProcessus(planId, activiteId, etape) {
  // Hors plan : `activiteId` désigne la notification, seule source d'information.
  const horsPlan = planId === 'hors-plan';
  const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
  const plan = horsPlan ? null : plans.find((p) => p.id === planId);
  let act = plan ? (plan.activites || []).find((a) => a.id === activiteId) : null;

  const { notif, dossier } = await execProcCharger(activiteId, horsPlan ? activiteId : null);
  if (horsPlan) {
    if (!notif) return;
    act = {
      id: notif.activite_id || notif.id,
      prestataire_id: notif.prestataire_id,
      prestataire_nom: notif.prestataire_nom || '',
      objet: notif.objet_activite || '',
      date_debut: notif.date_activite || '',
      date_fin: notif.date_fin_effective || '',
      secteur_id: notif.secteur_id || '',
      perimetre: notif.perimetre_activite || '',
    };
  }
  if (!act) return;

  // La page d'appel est retenue : « Retour » y ramène, quel que soit le menu
  // depuis lequel l'activité a été ouverte.
  const origine = {
    page: EXEC_STATE.currentPage,
    sub: EXEC_STATE.currentPage === 'etats' && window.EXEC_ETATS ? EXEC_ETATS.sub : '',
  };
  EXEC_PROC = { planId, activiteId, notifId: horsPlan ? activiteId : null, horsPlan,
    act, plan, notif, dossier, actif: true, origine };
  const etat = execProcEtat(notif, dossier);
  EXEC_PROC.etape = etape || etat.courante || 'transmission';
  execProcAfficher();
}

// Bandeau du volet : mêmes informations à toutes les étapes.
const execProcTitre = () => {
  const a = EXEC_PROC.act || {};
  const n = EXEC_PROC.notif;
  const d = EXEC_PROC.dossier;
  const refs = [n && n.reference, d && d.reference].filter(Boolean).join(' / ') || '—';
  const statut = d ? (d.statut || '') : (n ? n.statut : 'planifie');
  const bloc = (libelle, valeur) => `<span class="exec-proc-bandeau-item"><i>${_esc(libelle)}</i>${valeur}</span>`;
  return `<div class="exec-proc-bandeau">
    <button class="btn btn-outline btn-sm exec-proc-retour" onclick="execProcRetourListe()">
      ${EXEC_ICONS.back || ''} Retour
    </button>
    ${bloc('Prestataire', `<strong>${_esc(a.prestataire_nom || '—')}</strong>`)}
    ${bloc('Objet', _esc(a.objet || a.description || '—'))}
    ${bloc('Références', `<span class="exec-proc-bandeau-ref">${_esc(refs)}</span>`)}
    ${bloc('Statut', _execStatusBadge(statut))}
  </div>`;
};

// Sortie du processus : le volet se ferme et l'on revient à la page d'où
// l'activité a été ouverte — liste des activités, ou l'un des états.
window.execProcRetourListe = function () {
  const origine = (EXEC_PROC && EXEC_PROC.origine) || {};
  if (EXEC_PROC) EXEC_PROC.actif = false;
  _execProcOrig.close();
  if (origine.sub && window.EXEC_ETATS) EXEC_ETATS.sub = origine.sub;
  execNavigateTo(origine.page || 'plan_surveillance');
};

// Affiche l'étape courante : soit un écran propre au processus (notification,
// confirmation), soit le formulaire Dossier, embarqué tel quel.
function execProcAfficher() {
  const cible = EXEC_PROC_VERS_DOSSIER[EXEC_PROC.etape];
  if (cible && EXEC_PROC.dossier) {
    EXEC_STATE.selectedDossier = null;      // force le rechargement du détail
    execOpenDossierSlider(EXEC_PROC.dossier.id, cible);
    return;
  }
  const sous = EXEC_PROC.sousEtape || execProcSousDefaut();
  EXEC_PROC.sousEtape = sous;

  // Dès la validation interne, la fiche officielle devient l'écran de
  // consultation : elle se lit avant la transmission, et après.
  if (EXEC_PROC.etape === 'notification' && EXEC_PROC.notif
      && execProcFicheAffichee(sous)) {
    execProcEnAction(() => execPreviewNotification(EXEC_PROC.notif.id));
    return;
  }
  // Le formulaire est l'écran des sous-étapes « Soumission » et
  // « Validation ». Il s'ouvre toujours en lecture seule : « Déclencher »
  // l'active pour la saisie, « Autoriser l'édition » pour la correction.
  if (EXEC_PROC.etape === 'notification' && (sous === 'soumission' || sous === 'validation')) {
    const ouvrir = EXEC_PROC.notif
      ? () => execEditNotification(EXEC_PROC.notif.id)
      : () => execStartNotification(EXEC_PROC.planId, EXEC_PROC.activiteId);
    if (!EXEC_PROC.notif && EXEC_PROC.horsPlan) return;
    execProcEnAction(ouvrir).then(() => execProcAppliquerLecture(sous));
    return;
  }
  // Le fil de discussion est l'écran de l'étape Confirmation.
  if (EXEC_PROC.etape === 'confirmation' && EXEC_PROC.notif) {
    execProcEnAction(() => execOpenExchangeSlider(EXEC_PROC.notif.id));
    return;
  }
  execShowSlider(execProcTitre(), execProcPanneau(), '', 'max');
}

// Recharge notification et dossier, puis réaffiche.
async function execProcRecharger(etape) {
  await execRefreshDynamic();
  const { notif, dossier } = await execProcCharger(EXEC_PROC.activiteId, EXEC_PROC.notifId);
  EXEC_PROC.notif = notif;
  EXEC_PROC.dossier = dossier;
  // Après toute transition, le formulaire revient en lecture seule : l'édition
  // se redemande explicitement.
  EXEC_PROC.editionAutorisee = false;
  const etat = execProcEtat(notif, dossier);
  EXEC_PROC.etape = etape || etat.courante || EXEC_PROC.etape;
  execProcAfficher();
  if (EXEC_STATE.currentPage === 'plan_surveillance') execRenderPage();
}

window.execProcAller = function (etape) {
  const etat = execProcEtat(EXEC_PROC.notif, EXEC_PROC.dossier);
  if (!etat.ouvertes[etape]) return;
  EXEC_PROC.etape = etape;
  EXEC_PROC.sousEtape = null;
  EXEC_PROC.editionAutorisee = false;
  execProcAfficher();
};

// ══════════════════════════════════════
//  Écrans propres au processus
// ══════════════════════════════════════
function execProcPanneau() {
  const sous = EXEC_PROC.sousEtape || execProcSousDefaut();
  return EXEC_PROC.etape === 'confirmation'
    ? execProcPanConfirmation(sous)
    : execProcPanNotification(sous);
}

// Sous-étapes de chaque étape : le fil sert à consulter, jamais à agir.
const EXEC_PROC_SOUS = {
  notification: [
    { id: 'soumission', label: 'Soumission' },
    { id: 'validation', label: 'Validation' },
    { id: 'transmission', label: 'Transmission' },
  ],
  // Confirmation : une seule page, échanges et confirmation côte à côte.
  confirmation: [],
};

// La fiche officielle est l'écran de la seule sous-étape « Transmission »,
// dès que la notification est validée : on la relit avant de l'envoyer.
function execProcFicheAffichee(sous) {
  const st = EXEC_PROC.notif ? EXEC_PROC.notif.statut : '';
  return sous === 'transmission' && ['valide', 'envoye', 'acte'].includes(st);
}

// Sous-étape franchie ?
function execProcSousFaite(id) {
  const n = EXEC_PROC.notif;
  const st = n ? n.statut : '';
  const rang = ['brouillon', 'soumis', 'valide', 'envoye', 'acte'].indexOf(st);
  return {
    soumission: rang >= 1,
    validation: rang >= 2,
    transmission: rang >= 3,
    echanges: st === 'acte',
    accord: st === 'acte',
  }[id];
}

// Sous-étape à consulter par défaut : la première non franchie.
function execProcSousDefaut() {
  const liste = EXEC_PROC_SOUS[EXEC_PROC.etape] || [];
  const enCours = liste.find((x) => !execProcSousFaite(x.id));
  return (enCours || liste[liste.length - 1] || {}).id || '';
}

function execProcSousFil() {
  const liste = EXEC_PROC_SOUS[EXEC_PROC.etape];
  if (!liste) return '';
  const courante = EXEC_PROC.sousEtape || execProcSousDefaut();
  const enCours = execProcSousDefaut();
  return execProcFilHtml(liste.map((x) => ({
    id: x.id, label: x.label,
    done: execProcSousFaite(x.id),
    current: enCours === x.id,
    selected: courante === x.id,
    // Toutes les sous-étapes franchies, plus celle en cours, sont consultables.
    disabled: !execProcSousFaite(x.id) && x.id !== enCours,
    onClick: `execProcConsulter('${x.id}')`,
  })), true);
}

window.execProcConsulter = function (sousEtape) {
  EXEC_PROC.sousEtape = sousEtape;
  EXEC_PROC.editionAutorisee = false;
  execProcAfficher();
};

// Qui a transmis la notification, et quand.
function execProcInfoTransmission() {
  const n = EXEC_PROC.notif;
  if (!n || EXEC_PROC.etape !== 'notification') return '';
  if ((EXEC_PROC.sousEtape || execProcSousDefaut()) !== 'transmission') return '';
  if (!execProcSousFaite('transmission')) return '';
  const par = n.envoye_par_nom || n.envoye_par || '';
  return `<div class="exec-proc-transmission">
    <span><i>Transmise le</i> <strong>${_formatDate(n.date_envoi)}</strong></span>
    ${par ? `<span><i>par</i> <strong>${_esc(par)}</strong></span>` : ''}
    <span><i>Destinataire</i> <strong>${_esc(n.interlocuteur_nom || n.prestataire_interlocuteur || n.prestataire_nom || '')}</strong></span>
  </div>`;
}

// Notification renvoyée : l'initiateur retrouve les observations du
// validateur à la sous-étape « Soumission », là où il corrige.
function execProcBanniereRejet() {
  const n = EXEC_PROC.notif;
  if (!n || EXEC_PROC.etape !== 'notification') return '';
  if ((EXEC_PROC.sousEtape || execProcSousDefaut()) !== 'soumission') return '';
  if (n.statut !== 'brouillon' || !n.motif_rejet) return '';
  return `<div class="exec-proc-rejet">
    <span class="exec-proc-rejet-titre">Notification renvoyée pour correction${n.date_rejet ? ` le ${_formatDate(n.date_rejet)}` : ''}</span>
    <span class="exec-proc-rejet-motif">${_esc(n.motif_rejet)}</span>
  </div>`;
}

// Sous-étape « Validation (interne) » : observations à l'initiateur et
// autorisation de corriger directement le formulaire.
function execProcBlocValidation() {
  if (EXEC_PROC.etape !== 'notification' || !EXEC_PROC.notif) return '';
  if ((EXEC_PROC.sousEtape || execProcSousDefaut()) !== 'validation') return '';
  return `<div class="exec-proc-validation">
    <label class="form-label" for="exec_proc_observations">Observations à l'attention de l'initiateur</label>
    <textarea class="form-control" id="exec_proc_observations" rows="2"
      placeholder="Renseigner en cas de corrections demandées">${_esc(EXEC_PROC.observations || EXEC_PROC.notif.motif_rejet || '')}</textarea>
  </div>`;
}

// Verrouille le formulaire hébergé tant que l'édition n'est pas autorisée.
function execProcAppliquerLecture(sous) {
  if (!['soumission', 'validation'].includes(sous) || EXEC_PROC.editionAutorisee) return;
  requestAnimationFrame(() => {
    const hote = document.querySelector('.exec-proc-hote');
    if (!hote) return;
    hote.classList.add('exec-proc-lecture');
    hote.querySelectorAll('input, select, textarea, button').forEach((el) => { el.disabled = true; });
    // Le pied du formulaire (enregistrer, aperçu) n'a pas cours en lecture.
    const pied = document.querySelector('#execSlider .exec-slider-footer');
    if (pied) pied.style.display = 'none';
  });
}

window.execProcBasculerEdition = function () {
  EXEC_PROC.observations = (document.getElementById('exec_proc_observations') || {}).value || '';
  EXEC_PROC.editionAutorisee = !EXEC_PROC.editionAutorisee;
  execProcAfficher();
};

// Boutons de transition — ceux des menus « Déclenchement » et « Exécution ».
function execProcActionsEtape() {
  const n = EXEC_PROC.notif;
  const st = n ? n.statut : '';
  const peut = _execCanContribute();
  const peutValider = _execCanValidate();
  const rang = ['brouillon', 'soumis', 'valide', 'envoye', 'acte'].indexOf(st);
  const sousCourante = EXEC_PROC.sousEtape || execProcSousDefaut();
  const boutons = [];

  if (EXEC_PROC.etape === 'notification') {
    // Bascule lecture seule / édition, en tête des actions de l'étape.
    if (n && sousCourante === 'validation' && peutValider) {
      const edite = !!EXEC_PROC.editionAutorisee;
      boutons.push(`<button class="btn btn-sm ${edite ? 'btn-primary' : 'btn-outline'}" onclick="execProcBasculerEdition()">
        ${EXEC_ICONS.edit || ''} ${edite ? 'Revenir en lecture seule' : 'Autoriser l’édition'}</button>`);
    }
    // « Déclencher » ouvre la saisie ; une fois le brouillon enregistré, il
    // n'y a plus rien à déclencher : la reprise de la saisie passe par
    // « Modifier ».
    if (sousCourante === 'soumission' && rang < 1 && peut && !EXEC_PROC.editionAutorisee) {
      boutons.push(n
        ? `<button class="btn btn-sm btn-primary" onclick="execProcDeclencher()">${EXEC_ICONS.edit || ''} Modifier</button>`
        : `<button class="btn btn-sm btn-primary" onclick="execProcDeclencher()">${EXEC_ICONS.send || ''} Déclencher</button>`);
    }
    if (n && st === 'brouillon' && peut) boutons.push(`<button class="btn btn-sm btn-primary" onclick="execProcAction('submit','Notification soumise')">Soumettre</button>`);
    if (n && st === 'soumis' && peutValider) boutons.push(`<button class="btn btn-sm btn-primary" onclick="execProcAction('validate','Notification validée')">Valider</button>`);
    if (n && st === 'soumis' && peutValider) boutons.push(`<button class="btn btn-sm exec-btn-rejet" onclick="execProcRejeter()">Rejeter</button>`);
    if (n && st === 'valide' && peut) boutons.push(`<button class="btn btn-sm btn-primary" onclick="execProcAction('send','Notification transmise')">Transmettre</button>`);
    // Avant transmission, la notification validée peut repartir en correction.
    if (n && st === 'valide' && sousCourante === 'transmission' && peut) {
      boutons.push(`<button class="btn btn-sm exec-btn-rejet" onclick="execProcRenvoyerSoumission()">Renvoyer</button>`);
    }
  }
  // 4. L'action qui clôt l'étape Confirmation siège sur la ligne du titre.
  if (EXEC_PROC.etape === 'confirmation' && n && st !== 'acte' && peut && !_execIsPrestataire()) {
    boutons.push(`<button class="btn btn-sm btn-primary exec-proc-btn-accord" onclick="execProcValiderAccord()">Confirmer l'activité</button>`);
  }
  return boutons.length ? `<div class="exec-proc-actions-etape">${boutons.join('')}</div>` : '';
}

const execProcLigne = (libelle, valeur) =>
  `<div class="exec-proc-ligne"><span>${_esc(libelle)}</span><strong>${valeur || '—'}</strong></div>`;

// ── Écrans de consultation ──
// Une sous-étape déjà franchie se relit ; celle en cours affiche son écran de
// travail. Les transitions passent par les boutons d'action de l'étape.
function execProcPanNotification(sous) {
  const n = EXEC_PROC.notif;
  const a = EXEC_PROC.act || {};
  if (!n) {
    return `<p class="exec-proc-vide">Activité planifiée non encore déclenchée.<br>
      Utilisez « Déclencher » pour ouvrir le formulaire de notification.</p>`;
  }
  // Les sous-étapes Soumission et Validation affichent le formulaire ; ce
  // panneau ne sert qu'aux cas où il n'a pas pu être ouvert.
  if (sous === 'soumission') {
    return `<div class="exec-proc-bloc">
      ${execProcLigne('Notification', _esc(n.reference || ''))}
      ${execProcLigne('Créée le', _formatDate(n.date_creation))}
      ${execProcLigne('Soumise le', _formatDate(n.date_soumission))}
      ${execProcLigne('Prestataire', _esc(a.prestataire_nom || ''))}
    </div>`;
  }
  if (sous === 'validation') {
    return execProcSousFaite('validation')
      ? `<div class="exec-proc-bloc">
          ${execProcLigne('Validée le', _formatDate(n.date_validation))}
          ${execProcLigne('Validateur', _esc(n.validateur_id || ''))}
        </div>`
      : `<p class="exec-proc-vide">Validation interne en attente.</p>${n.motif_rejet ? `<div class="exec-proc-bloc">${execProcLigne('Motif du dernier rejet', _esc(n.motif_rejet))}</div>` : ''}`;
  }
  return `<p class="exec-proc-vide">Notification pas encore transmise au prestataire.</p>`;
}

// Sans notification transmise, l'étape Confirmation n'a rien à afficher.
function execProcPanConfirmation() {
  return `<p class="exec-proc-vide">La notification doit d'abord être transmise.</p>`;
}

function execProcEnteteEtape() {
  const e = EXEC_PROC_ETAPES.find((x) => x.id === EXEC_PROC.etape) || {};
  const etat = execProcEtat(EXEC_PROC.notif, EXEC_PROC.dossier);
  const fait = etat.faites[EXEC_PROC.etape];
  return `<div class="exec-proc-titre">
      <h4>${_esc(e.label || '')}</h4>
      <span class="exec-proc-etat ${fait ? 'fait' : ''}">${fait ? 'Étape franchie' : 'À traiter'}</span>
      ${execProcSousFil()}
      ${execProcActionsEtape()}
    </div>
    ${execProcInfoTransmission()}
    ${execProcBanniereRejet()}
    ${execProcBlocValidation()}`;
}

// ══════════════════════════════════════
//  Confirmation avant de franchir une étape
// ══════════════════════════════════════
// Franchir une étape engage le circuit : chaque passage se confirme dans une
// boîte de dialogue qui rappelle l'étape quittée et celle qui s'ouvre.
// `saisie` ajoute un champ d'observations : la promesse rend alors le texte
// saisi (chaîne, éventuellement vide) plutôt que `true`.
function execProcConfirmer({ titre, message, depuis, vers, libelle, saisie }) {
  return new Promise((resoudre) => {
    const fond = document.createElement('div');
    fond.className = 'exec-proc-dialogue-fond';
    fond.innerHTML = `
      <div class="exec-proc-dialogue" role="dialog" aria-modal="true">
        <h4>${_esc(titre)}</h4>
        <p>${_esc(message)}</p>
        ${depuis && vers ? `<div class="exec-proc-dialogue-fil">
          <span>${_esc(depuis)}</span>${EXEC_ICONS.next || '→'}<span class="vers">${_esc(vers)}</span>
        </div>` : ''}
        ${saisie ? `<label class="form-label">${_esc(saisie.label || '')}</label>
          <textarea class="form-control exec-proc-dialogue-saisie" rows="4"
            placeholder="${_esc(saisie.placeholder || '')}"></textarea>` : ''}
        <div class="exec-proc-dialogue-actions">
          <button class="btn btn-outline btn-sm" data-rep="non">Annuler</button>
          <button class="btn btn-primary btn-sm" data-rep="oui">${_esc(libelle || 'Confirmer')}</button>
        </div>
      </div>`;
    const champ = () => fond.querySelector('.exec-proc-dialogue-saisie');
    const fermer = (accepte) => {
      const valeur = saisie && accepte ? (champ() || {}).value || '' : false;
      fond.remove();
      resoudre(saisie ? valeur : accepte);
    };
    fond.addEventListener('click', (ev) => {
      const rep = ev.target.closest('[data-rep]');
      if (rep) fermer(rep.dataset.rep === 'oui');
      else if (ev.target === fond) fermer(false);
    });
    document.body.appendChild(fond);
    requestAnimationFrame(() => (champ() || fond.querySelector('[data-rep="oui"]') || {}).focus?.());
  });
}

const execProcLibelleEtape = (id) => (EXEC_PROC_ETAPES.find((e) => e.id === id) || {}).label || id;

// Les écrans repris de PESSCO posent leur propre `confirm()` natif : la boîte
// du processus l'a déjà remplacé, on ne demande pas deux fois.
async function execProcSansConfirm(fn, reponsePrompt) {
  const confirmOrig = window.confirm;
  const promptOrig = window.prompt;
  window.confirm = () => true;
  if (reponsePrompt !== undefined) window.prompt = () => reponsePrompt;
  try { return await fn(); } finally { window.confirm = confirmOrig; window.prompt = promptOrig; }
}

// ══════════════════════════════════════
//  Actions
// ══════════════════════════════════════
window.execProcDeclencher = function () {
  EXEC_PROC.sousEtape = 'soumission';
  EXEC_PROC.editionAutorisee = true;
  execProcAfficher();
};

// Transitions simples de la notification : soumettre, valider, transmettre.
// La transmission clôt l'étape Notification : elle demande confirmation.
window.execProcAction = async function (action, message) {
  if (action === 'send') {
    const ok = await execProcConfirmer({
      titre: 'Transmettre la notification',
      message: 'La notification part au prestataire : l’étape Notification est franchie et l’étape Confirmation s’ouvre.',
      depuis: execProcLibelleEtape('notification'), vers: execProcLibelleEtape('confirmation'),
      libelle: 'Transmettre',
    });
    if (!ok) return;
  }
  try {
    await api(`${EXEC_MODULE_API}/notifications/${EXEC_PROC.notif.id}/${action}`, { method: 'PUT', body: '{}' });
    _execToast(message, 'success');
    EXEC_PROC.sousEtape = null;   // la sous-étape suivante devient la courante
    await execProcRecharger();
  } catch (e) {
    _execToast((e && e.message) || 'Action impossible', 'error');
  }
};

// Certaines actions du formulaire Dossier font franchir une étape du fil : le
// volet du processus doit suivre, plutôt que rester sur l'étape quittée.
// Chaque entrée : action du formulaire Dossier → jalon qu'elle franchit et
// étape à ouvrir ensuite. Le passage n'a lieu que si le jalon est bien
// atteint : une action annulée laisse le fil en place.
const EXEC_PROC_APRES = {
  execCloseRealisation: { jalon: 'realisation', suivante: 'rapport',
    titre: 'Clôturer l’exécution sur le terrain',
    message: 'L’exécution sur le terrain est déclarée terminée : la rédaction du rapport s’ouvre.',
    libelle: 'Clôturer l’exécution' },
  execSubmitDossier: { jalon: 'rapport', suivante: 'validation',
    titre: 'Soumettre le rapport',
    message: 'Le rapport part en validation : l’étape Rapport est franchie.',
    libelle: 'Soumettre' },
  execValidateRapport: { jalon: 'validation', suivante: 'transmission',
    titre: 'Valider le rapport',
    message: 'Le rapport validé peut être transmis au prestataire.',
    libelle: 'Valider' },
};

Object.entries(EXEC_PROC_APRES).forEach(([nom, { jalon, suivante, titre, message, libelle }]) => {
  const orig = window[nom];
  if (typeof orig !== 'function') return;
  window[nom] = async function (...args) {
    if (!EXEC_PROC || !EXEC_PROC.actif) return orig.apply(this, args);
    const ok = await execProcConfirmer({
      titre, message, libelle,
      depuis: execProcLibelleEtape(jalon === 'realisation' ? 'realisation' : jalon),
      vers: execProcLibelleEtape(suivante),
    });
    if (!ok) return undefined;
    const r = await execProcEnAction(() => execProcSansConfirm(() => orig.apply(this, args)));
    const { notif, dossier } = await execProcCharger(EXEC_PROC.activiteId, EXEC_PROC.notifId);
    EXEC_PROC.notif = notif;
    EXEC_PROC.dossier = dossier;
    if (execProcEtat(notif, dossier).faites[jalon]) {
      EXEC_PROC.etape = suivante;
      EXEC_PROC.sousEtape = null;
    }
    execProcAfficher();
    return r;
  };
});

// Renvoi d'une notification validée vers la soumission, pour correction.
window.execProcRenvoyerSoumission = async function () {
  const motif = window.prompt('Motif du renvoi à la soumission (facultatif) :', '') ;
  if (motif === null) return;                       // renvoi annulé
  try {
    await api(`${EXEC_MODULE_API}/notifications/${EXEC_PROC.notif.id}/cancel`, {
      method: 'PUT', body: JSON.stringify({ motif: motif || 'Corrections complémentaires demandées' }),
    });
    _execToast('Notification renvoyée à la soumission', 'success');
    EXEC_PROC.sousEtape = null;
    await execProcRecharger('notification');
  } catch (e) {
    _execToast((e && e.message) || 'Renvoi impossible', 'error');
  }
};

// Impression de la fiche affichée : la mise en page du volet est reprise telle
// quelle dans une fenêtre d'impression, avec les styles du module.
window.execProcImprimerFiche = function () {
  const fiche = document.querySelector('.exec-proc-hote');
  if (!fiche) return;
  const f = window.open('', '_blank', 'width=900,height=1000');
  if (!f) { _execToast('Le popup est bloqué par le navigateur', 'error'); return; }
  f.document.open();
  f.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
    <title>Fiche de notification</title>
    <link rel="stylesheet" href="/shared/css/oasis-module.css">
    <link rel="stylesheet" href="/modules/execution/css/exec-styles.css">
    <style>body{margin:0;padding:1.5rem;background:#fff;}@page{margin:14mm;}</style>
    </head><body>${fiche.innerHTML}</body></html>`);
  f.document.close();
  f.onload = () => setTimeout(() => { try { f.focus(); f.print(); } catch (e) { /* impression annulée */ } }, 250);
};

// Le rejet reprend les observations saisies : l'initiateur sait quoi corriger.
window.execProcRejeter = async function () {
  const motif = (document.getElementById('exec_proc_observations') || {}).value || '';
  try {
    await api(`${EXEC_MODULE_API}/notifications/${EXEC_PROC.notif.id}/reject`, {
      method: 'PUT', body: JSON.stringify({ motif }),
    });
    _execToast('Notification renvoyée à l’initiateur', 'success');
    EXEC_PROC.sousEtape = null;
    EXEC_PROC.observations = '';
    EXEC_PROC.editionAutorisee = false;
    await execProcRecharger();
  } catch (e) {
    _execToast((e && e.message) || 'Rejet impossible', 'error');
  }
};

window.execProcValiderAccord = async function () {
  const val = (id) => (document.getElementById(id) || {}).value || '';
  const ok = await execProcConfirmer({
    titre: 'Confirmer l’activité',
    message: 'Les dates et le périmètre retenus sont arrêtés, le dossier d’exécution est ouvert.',
    depuis: execProcLibelleEtape('confirmation'), vers: execProcLibelleEtape('realisation'),
    libelle: 'Confirmer l’activité',
  });
  if (!ok) return;
  try {
    await api(`${EXEC_MODULE_API}/notifications/${EXEC_PROC.notif.id}/validate-accord`, {
      method: 'PUT',
      body: JSON.stringify({
        date_debut_effective: val('exec_proc_debut'),
        date_fin_effective: val('exec_proc_fin'),
        perimetre_valide: val('exec_proc_perimetre'),
      }),
    });
    _execToast('Activité confirmée — dossier ouvert', 'success');
    EXEC_PROC.sousEtape = null;
    await execProcRecharger('realisation');
  } catch (e) {
    _execToast((e && e.message) || 'Validation impossible', 'error');
  }
};

// Dernière étape : la transmission du rapport, puis la clôture du dossier,
// achèvent le circuit. L'une et l'autre se confirment aussi.
[['execSendRapportValidated', {
  titre: 'Transmettre le rapport',
  message: 'Le rapport validé est transmis au prestataire.',
  libelle: 'Transmettre',
}], ['execCloseDossier', {
  titre: 'Clôturer le dossier',
  message: 'Le dossier est clos : le circuit de l’activité s’achève.',
  depuis: 'Transmission', vers: 'Clôturé', libelle: 'Clôturer',
}]].forEach(([nom, dialogue]) => {
  const orig = window[nom];
  if (typeof orig !== 'function') return;
  window[nom] = async function (...args) {
    if (!EXEC_PROC || !EXEC_PROC.actif) return orig.apply(this, args);
    if (!await execProcConfirmer(dialogue)) return undefined;
    const r = await execProcEnAction(() => execProcSansConfirm(() => orig.apply(this, args)));
    await execProcRecharger(EXEC_PROC.etape);
    return r;
  };
});

// Amendement d'un rapport transmis ou validé : les observations se saisissent
// dans la boîte du processus, non dans une invite du navigateur, et le circuit
// revient à l'étape Rapport, où la nouvelle version se rédige.
const _execProcAmender = window.execAmendRapport;
if (typeof _execProcAmender === 'function') {
  window.execAmendRapport = async function (...args) {
    if (!EXEC_PROC || !EXEC_PROC.actif) return _execProcAmender.apply(this, args);
    const observations = await execProcConfirmer({
      titre: 'Amender le rapport',
      message: 'Le rapport repart en rédaction : une nouvelle version sera établie à partir des points relevés.',
      depuis: execProcLibelleEtape(EXEC_PROC.etape), vers: execProcLibelleEtape('rapport'),
      libelle: 'Renvoyer en rédaction',
      saisie: { label: 'Points à reprendre', placeholder: 'Observations à l’attention du rédacteur…' },
    });
    if (observations === false) return undefined;
    const r = await execProcEnAction(() => execProcSansConfirm(() => _execProcAmender.apply(this, args), observations));
    EXEC_PROC.sousEtape = null;
    await execProcRecharger('rapport');
    return r;
  };
}

// Les écrans repris de PESSCO referment le volet après un enregistrement et
// reviennent à la liste. Dans le processus, on reste sur l'activité : le volet
// est maintenu et l'étape est réaffichée avec son état à jour.
['execSaveNotificationDraft', 'execSubmitNotificationForValidation',
 'execSendExchangeMessage', 'execValidateAccord'].forEach((nom) => {
  const orig = window[nom];
  if (typeof orig !== 'function') return;
  window[nom] = async function (...args) {
    if (!EXEC_PROC || !EXEC_PROC.actif) return orig.apply(this, args);
    const r = await execProcEnAction(() => orig.apply(this, args));
    await execProcRecharger(EXEC_PROC.etape);
    return r;
  };
});

// ══════════════════════════════════════
//  Activités hors plan de surveillance
// ══════════════════════════════════════
// Une activité peut être déclenchée sans figurer au plan validé : inspection
// inopinée, suite d'événement, demande extérieure. Elle est portée par la
// notification seule, qui déclare alors son année, son domaine et son secteur.

// Formulaire de déclenchement.
window.execProcNouvelleActivite = function () {
  const D = EXEC_STATE.data || {};
  const annee = new Date().getFullYear();
  const options = (liste, libelle) => (liste || [])
    .map((x) => `<option value="${x.id}">${_esc(libelle(x))}</option>`).join('');

  const corps = `
    <div class="exec-proc-bloc">
      <div class="exec-proc-grille">
        <div>
          <label class="form-label">Année *</label>
          <input type="number" class="form-control" id="hp_annee" value="${annee}" min="2000" max="2100">
        </div>
        <div>
          <label class="form-label">Domaine *</label>
          <select class="form-control" id="hp_domaine" onchange="execProcHpSecteurs()">
            <option value="">— Choisir —</option>
            ${options(D.domaines, (d) => (d.code ? `${d.code} — ${d.nom}` : d.nom))}
          </select>
        </div>
        <div>
          <label class="form-label">Secteur d'activité *</label>
          <select class="form-control" id="hp_secteur" onchange="execProcHpPrestataires()">
            <option value="">— Choisir un domaine —</option>
          </select>
        </div>
        <div>
          <label class="form-label">Prestataire *</label>
          <select class="form-control" id="hp_prestataire">
            <option value="">— Choisir un secteur —</option>
          </select>
        </div>
        <div>
          <label class="form-label">Types de supervision</label>
          <select class="form-control" id="hp_type">
            <option value="">— Choisir —</option>
            ${(D.typesSupervision || []).map((t) => `<option value="${t.id}">${_esc(t.type_supervision || t.libelle || t.nom || '')}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Date de début</label>
          <input type="date" class="form-control" id="hp_debut">
        </div>
        <div>
          <label class="form-label">Date de fin</label>
          <input type="date" class="form-control" id="hp_fin">
        </div>
      </div>
      <label class="form-label">Objet de l'activité *</label>
      <input type="text" class="form-control" id="hp_objet" placeholder="Objet de la surveillance">
      <label class="form-label">Périmètre — sous-activités et thèmes de supervision</label>
      <div class="exec-hp-perimetre" id="hp_perimetre_liste">
        <p class="exec-proc-vide">Choisissez d'abord un secteur d'activité.</p>
      </div>
      <p class="exec-proc-erreur" id="hp_erreur"></p>
    </div>`;

  const pied = `
    <button class="btn btn-outline" onclick="execCloseSlider()">Annuler</button>
    <button class="btn btn-primary" onclick="execProcCreerHorsPlan()">${EXEC_ICONS.send || ''} Déclencher</button>`;

  execShowSlider('Nouvelle activité hors plan', corps, pied, 'md');
};

// Les listes se filtrent en cascade : domaine → secteur → prestataire.
window.execProcHpSecteurs = function () {
  const domaine = (document.getElementById('hp_domaine') || {}).value || '';
  const secteurs = (EXEC_STATE.data.secteurs || []).filter((s) => s.domaine_id === domaine);
  const sel = document.getElementById('hp_secteur');
  sel.innerHTML = `<option value="">— Choisir —</option>${secteurs
    .map((s) => `<option value="${s.id}">${_esc(s.code ? `${s.code} — ${s.nom}` : s.nom)}</option>`).join('')}`;
  execProcHpPrestataires();
};

// Périmètre : sous-activités du secteur, chacune avec ses thèmes de
// supervision, tels que configurés au portail. L'utilisateur coche ce qui
// entre dans le périmètre de l'activité.
window.execProcHpPerimetre = function () {
  const secteur = (document.getElementById('hp_secteur') || {}).value || '';
  const hote = document.getElementById('hp_perimetre_liste');
  if (!hote) return;
  if (!secteur) {
    hote.innerHTML = '<p class="exec-proc-vide">Choisissez d’abord un secteur d’activité.</p>';
    return;
  }
  const sousActs = (EXEC_STATE.data.sousActivites || []).filter((sa) => sa.secteur_id === secteur);
  const themes = EXEC_STATE.data.themesSupervision || [];
  if (!sousActs.length) {
    hote.innerHTML = '<p class="exec-proc-vide">Aucune sous-activité configurée pour ce secteur.</p>';
    return;
  }
  hote.innerHTML = sousActs.map((sa) => {
    const siens = themes.filter((t) => t.sous_activite_id === sa.id);
    return `<div class="exec-hp-sa">
      <label class="exec-hp-ligne exec-hp-sa-titre">
        <input type="checkbox" class="hp-sa" value="${sa.id}" onchange="execProcHpCocherSousActivite(this)">
        <span><strong>${_esc(sa.nom || sa.libelle || sa.code || '')}</strong>
          ${sa.code ? `<em>${_esc(sa.code)}</em>` : ''}</span>
      </label>
      ${siens.length ? `<div class="exec-hp-themes">
        ${siens.map((t) => `<label class="exec-hp-ligne">
          <input type="checkbox" class="hp-theme" data-sa="${sa.id}" value="${t.id}"
                 onchange="execProcHpCocherTheme(this)">
          <span>${_esc(t.libelle || t.nom || t.code || '')}</span>
        </label>`).join('')}
      </div>` : '<p class="exec-proc-vide" style="margin-left:1.6rem;">Aucun thème configuré.</p>'}
    </div>`;
  }).join('');
};

// Cocher une sous-activité entraîne ses thèmes, et inversement.
window.execProcHpCocherSousActivite = function (el) {
  document.querySelectorAll(`.hp-theme[data-sa="${el.value}"]`).forEach((t) => { t.checked = el.checked; });
};

window.execProcHpCocherTheme = function (el) {
  const sa = el.dataset.sa;
  const freres = [...document.querySelectorAll(`.hp-theme[data-sa="${sa}"]`)];
  const parent = document.querySelector(`.hp-sa[value="${sa}"]`);
  if (parent) parent.checked = freres.some((t) => t.checked);
};

// Texte du périmètre, au format des notifications : une ligne par
// sous-activité, ses thèmes retenus entre parenthèses.
function execProcHpPerimetreTexte() {
  const lignes = [];
  document.querySelectorAll('.hp-sa').forEach((sa) => {
    const themes = [...document.querySelectorAll(`.hp-theme[data-sa="${sa.value}"]`)].filter((t) => t.checked);
    if (!sa.checked && !themes.length) return;
    const nom = sa.closest('.exec-hp-sa').querySelector('strong').textContent;
    const libelles = themes.map((t) => t.parentElement.querySelector('span').textContent.trim());
    lignes.push(libelles.length ? `- ${nom} (${libelles.join(' ; ')})` : `- ${nom}`);
  });
  return lignes.join('\n');
}

window.execProcHpPrestataires = function () {
  const secteur = (document.getElementById('hp_secteur') || {}).value || '';
  const liste = (EXEC_STATE.data.prestataires || []).filter((p) => p.secteur_id === secteur);
  const sel = document.getElementById('hp_prestataire');
  sel.innerHTML = `<option value="">— Choisir —</option>${liste
    .map((p) => `<option value="${p.id}">${_esc(p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom)}</option>`).join('')}`;
  execProcHpPerimetre();
};

// Libellé du type de supervision retenu, tel qu'il est configuré au portail.
function execProcHpTypeLibelle() {
  const id = (document.getElementById('hp_type') || {}).value || '';
  const t = (EXEC_STATE.data.typesSupervision || []).find((x) => x.id === id);
  return t ? (t.type_supervision || t.libelle || t.nom || '') : '';
}

window.execProcCreerHorsPlan = async function () {
  const val = (id) => ((document.getElementById(id) || {}).value || '').trim();
  const erreur = document.getElementById('hp_erreur');
  const manquants = [['hp_annee', 'Année'], ['hp_domaine', 'Domaine'], ['hp_secteur', 'Secteur'],
    ['hp_prestataire', 'Prestataire'], ['hp_objet', 'Objet']].filter(([id]) => !val(id));
  if (manquants.length) {
    erreur.textContent = `À renseigner : ${manquants.map(([, l]) => l).join(', ')}.`;
    return;
  }
  try {
    const r = await api(`${EXEC_MODULE_API}/notifications`, {
      method: 'POST',
      body: JSON.stringify({
        hors_plan: true,
        annee: val('hp_annee'),
        domaine_id: val('hp_domaine'),
        secteur_id: val('hp_secteur'),
        prestataire_id: val('hp_prestataire'),
        // Le type vient du référentiel du portail : on garde l'identifiant et
        // le libellé, ce dernier étant celui qu'affichent fiches et rapports.
        type_supervision_id: val('hp_type'),
        type_supervision: execProcHpTypeLibelle(),
        objet: val('hp_objet'),
        perimetre: execProcHpPerimetreTexte(),
        date_debut_prevue: val('hp_debut'),
        date_fin_prevue: val('hp_fin'),
      }),
    });
    _execToast(`Activité déclenchée — ${r.reference || ''}`, 'success');
    await execRefreshDynamic();
    if (EXEC_STATE.currentPage === 'plan_surveillance') execRenderPage();
    execOpenActiviteProcessus('hors-plan', r.id);
  } catch (e) {
    erreur.textContent = (e && e.message) || 'Déclenchement impossible';
  }
};

// ══════════════════════════════════════
//  Statut d'une activité dans les listes
// ══════════════════════════════════════
// La colonne « Statut » des tables d'activités dit où en est le circuit, dans
// les termes mêmes du fil d'avancement : l'étape en cours et, pour la
// Notification, la sous-étape attendue. Une activité close se lit « Clôturé ».
// Libellés propres à la colonne « Statut » : ils nomment ce qui reste à faire,
// là où le fil d'avancement nomme l'étape.
const EXEC_PROC_STATUT_LIBELLE = {
  rapport: 'Elaboration Rapport',
  validation: 'Validation Rapport',
  transmission: 'Transmission Rapport',
};

function execProcStatutActivite(notif, dossier) {
  if (!notif) return { etape: 'Non déclenché', sous: '', clos: false };
  // La liste des dossiers ne porte pas les rapports : on les reprend du cache
  // du module, sans quoi les étapes Rapport à Transmission se confondraient.
  let d = dossier;
  if (d && !d.rapports) {
    d = { ...d, rapports: (EXEC_STATE.data.rapports || []).filter((r) => r.dossier_id === d.id) };
  }
  const etat = execProcEtat(notif, d);
  if (etat.cloture) return { etape: 'Clôturé', sous: '', clos: true };
  const courante = etat.courante || 'transmission';
  if (courante === 'notification') {
    const sous = { brouillon: 'Soumission', soumis: 'Validation', valide: 'Transmission' }[notif.statut] || '';
    return { etape: 'Notification', sous, clos: false };
  }
  return {
    etape: EXEC_PROC_STATUT_LIBELLE[courante] || execProcLibelleEtape(courante),
    sous: '', clos: false,
  };
}

// Badge repris dans les tables d'activités (plan et hors plan).
window.execProcStatutBadge = function (notif, dossier) {
  const s = execProcStatutActivite(notif, dossier);
  return `<span class="exec-statut-etape${s.clos ? ' clos' : ''}">${_esc(s.etape)}${
    s.sous ? `<i>${_esc(s.sous)}</i>` : ''}</span>`;
};

// ══════════════════════════════════════
//  Historique d'une activité
// ══════════════════════════════════════
// L'historique suit le fil du processus : une section par étape, et sous
// chacune les sous-étapes attendues, datées et signées. Ce qui n'est pas
// encore advenu reste visible, en attente : on lit d'un coup d'œil où en est
// l'activité et ce qu'il reste à faire.
function execProcNomActeur(id) {
  if (!id) return '';
  const gens = [...(EXEC_STATE.data.inspecteurs || []), ...(EXEC_STATE.data.users || [])];
  const u = gens.find((x) => x.id === id || x.username === id || x.email === id);
  if (u) return `${u.prenom || ''} ${u.nom || ''}`.trim() || u.username || id;
  const moi = EXEC_STATE.user || {};
  if (id === moi.id || id === moi.username) return `${moi.prenom || ''} ${moi.nom || ''}`.trim() || id;
  return id;
}

function execProcHistoriqueEtapes(notif, dossier, rapports) {
  const n = notif || {};
  const d = dossier || {};
  const versions = (rapports || []).slice()
    .sort((a, b) => (a.version || 0) - (b.version || 0));
  const soumis = versions.filter((r) => ['soumis', 'valide', 'transmis'].includes(r.statut));
  const valides = versions.filter((r) => ['valide', 'transmis'].includes(r.statut));
  const transmis = versions.filter((r) => r.statut === 'transmis');
  // `detail` porte une référence ; `alerte` un motif de rejet ou de renvoi,
  // qui se lit autrement.
  const j = (date, libelle, acteur, detail, alerte) => ({
    date: date || '', libelle, acteur: execProcNomActeur(acteur),
    detail: detail || '', alerte: !!alerte,
  });

  return [
    {
      id: 'notification', titre: 'Notification',
      sous: [
        {
          nom: 'Soumission',
          jalons: [
            notif && j(n.date_creation, 'Notification créée', n.created_by),
            n.date_rejet && j(n.date_rejet, 'Renvoyée à l’initiateur', n.rejete_par, n.motif_rejet, true),
            n.date_soumission && j(n.date_soumission, 'Soumise à validation', n.created_by),
          ].filter(Boolean),
        },
        {
          nom: 'Validation',
          jalons: [n.date_validation && j(n.date_validation, 'Notification validée', n.validateur_id)].filter(Boolean),
        },
        {
          nom: 'Transmission',
          jalons: [n.date_envoi && j(n.date_envoi, 'Transmise au prestataire', n.envoye_par)].filter(Boolean),
        },
      ],
    },
    {
      id: 'confirmation', titre: 'Confirmation',
      sous: [{
        nom: 'Échanges et accord',
        jalons: [n.date_accord && j(n.date_accord, 'Activité confirmée', n.acte_par,
          n.reference_activite ? `Réf. activité ${n.reference_activite}` : '')].filter(Boolean),
      }],
    },
    {
      id: 'realisation', titre: 'Réalisation',
      sous: [{
        nom: 'Exécution sur le terrain',
        jalons: [
          d.id && j(d.date_creation || d.date_ouverture, 'Dossier d’exécution ouvert', d.created_by, d.reference),
          d.realisation_closed && j(d.date_maj, 'Exécution sur le terrain clôturée', d.created_by),
        ].filter(Boolean),
      }],
    },
    {
      id: 'rapport', titre: 'Elaboration Rapport',
      sous: [{
        nom: 'Rédaction et soumission',
        jalons: versions.flatMap((r) => [
          j(r.date_creation, `Version v${r.version || 1} rédigée`, r.created_by || r.auteur_nom, r.reference),
          r.observations_retour && j(r.date_maj, `Version v${r.version || 1} renvoyée en rédaction`, '', r.observations_retour, true),
          ['soumis', 'valide', 'transmis'].includes(r.statut)
            && j(d.date_soumission, `Version v${r.version || 1} soumise à validation`, r.created_by),
        ].filter(Boolean)),
      }],
    },
    {
      id: 'validation', titre: 'Validation Rapport',
      sous: [{
        nom: 'Validation',
        jalons: valides.map((r) => j(r.date_validation, `Rapport ${r.reference || ''} validé`, r.valide_par)),
      }],
    },
    {
      id: 'transmission', titre: 'Transmission Rapport',
      sous: [
        {
          nom: 'Transmission',
          jalons: transmis.map((r) => j(r.date_transmission, `Rapport ${r.reference || ''} transmis au prestataire`, r.transmis_par)),
        },
        {
          nom: 'Clôture',
          jalons: [d.statut === 'cloture' && j(d.date_fin_execution || d.date_maj, 'Dossier clôturé', d.created_by)].filter(Boolean),
        },
      ],
    },
  ];
}

window.execProcHistorique = function (planId, activiteId) {
  const horsPlan = planId === 'hors-plan';
  const notifs = EXEC_STATE.data.notifications || [];
  const notif = horsPlan
    ? notifs.find((n) => n.id === activiteId) || null
    : notifs.find((n) => n.activite_id === activiteId) || null;
  const dossier = notif ? (EXEC_STATE.data.dossiers || []).find((d) => d.notification_id === notif.id) : null;
  const rapports = dossier
    ? (EXEC_STATE.data.rapports || []).filter((r) => r.dossier_id === dossier.id) : [];

  const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
  const plan = horsPlan ? null : plans.find((p) => p.id === planId);
  const act = plan ? (plan.activites || []).find((a) => a.id === activiteId) : null;
  const objet = (act && (act.objet || act.description)) || (notif && notif.objet_activite) || '';
  const prestataire = (act && act.prestataire_nom) || (notif && notif.prestataire_nom) || '';

  const etat = execProcEtat(notif, dossier ? { ...dossier, rapports } : null);
  const etapes = execProcHistoriqueEtapes(notif, dossier, rapports);

  const corps = etapes.map((e) => {
    const faite = etat.faites[e.id];
    const courante = etat.courante === e.id;
    const classe = ['exec-histo-etape', faite ? 'faite' : '', courante ? 'courante' : ''].filter(Boolean).join(' ');
    const sous = e.sous.map((s) => `
      <div class="exec-histo-sous${s.jalons.length ? '' : ' vide'}">
        <div class="exec-histo-sous-nom">${_esc(s.nom)}</div>
        ${s.jalons.length ? s.jalons.map((x) => `
          <div class="exec-histo-jalon">
            <span class="exec-histo-date">${x.date ? (_formatDatetime ? _formatDatetime(x.date) : _formatDate(x.date)) : '—'}</span>
            <span class="exec-histo-libelle">${_esc(x.libelle)}</span>
            ${x.acteur ? `<span class="exec-histo-acteur">${_esc(x.acteur)}</span>` : ''}
            ${x.detail ? `<span class="exec-histo-detail${x.alerte ? ' alerte' : ''}">${_esc(x.detail)}</span>` : ''}
          </div>`).join('') : '<div class="exec-histo-attente">En attente</div>'}
      </div>`).join('');
    return `
      <section class="${classe}">
        <header>
          <span class="exec-histo-puce"></span>
          <h4>${_esc(e.titre)}</h4>
          <span class="exec-histo-etat">${faite ? 'Franchie' : (courante ? 'En cours' : 'À venir')}</span>
        </header>
        <div class="exec-histo-sous-liste">${sous}</div>
      </section>`;
  }).join('');

  const bodyHtml = `
    <div class="exec-histo">
      <div class="exec-histo-entete">
        <div class="exec-histo-objet">${_esc(objet || '—')}</div>
        <div class="exec-histo-meta">${_esc(prestataire)}${notif && notif.reference ? ` · ${_esc(notif.reference)}` : ''}${
          dossier && dossier.reference ? ` · ${_esc(dossier.reference)}` : ''}</div>
      </div>
      ${corps}
      <div class="exec-histo-fin ${etat.cloture ? 'clos' : ''}">${etat.cloture ? 'Circuit clôturé' : 'Circuit en cours'}</div>
    </div>`;

  // L'historique se lit à côté de la liste : deux cinquièmes de l'écran.
  execShowSlider(`${EXEC_ICONS.clock} ${te('historique')}`, bodyHtml, '', 'two-fifths');
};

// La table du plan appelle l'écran hérité : il cède la place à celui-ci.
window.execShowActiviteHistorique = function (activiteId, planId) {
  return window.execProcHistorique(planId, activiteId);
};

// Groupe « Autres Activités » : les activités déclenchées hors plan.
function execProcGroupeHorsPlan(F) {
  const notifs = (EXEC_STATE.data.notifications || []).filter((n) => n.hors_plan);
  if (!notifs.length) return '';
  const dossiers = EXEC_STATE.data.dossiers || [];
  const secteurs = EXEC_STATE.data.secteurs || [];
  const domaines = EXEC_STATE.data.domaines || [];

  let lignes = notifs;
  if (F && F.annee) lignes = lignes.filter((n) => String(n.annee) === String(F.annee));
  if (F && F.domaine) lignes = lignes.filter((n) => n.domaine_id === F.domaine);
  if (F && F.prestataire) lignes = lignes.filter((n) => n.prestataire_id === F.prestataire);
  if (F && F.search) {
    const q = F.search.toLowerCase();
    lignes = lignes.filter((n) => `${n.objet_activite || ''} ${n.prestataire_nom || ''} ${n.reference || ''}`
      .toLowerCase().includes(q));
  }

  const nom = (liste, id, champ) => {
    const x = liste.find((y) => y.id === id);
    return x ? (x[champ] || x.nom || '') : '';
  };

  const corps = lignes.length ? lignes.map((n) => {
    const dos = dossiers.find((d) => d.notification_id === n.id);
    return `<tr class="exec-act-row" style="cursor:pointer;"
        onclick="if(!event.target.closest('button'))execOpenActiviteProcessus('hors-plan','${n.id}')"
        title="Ouvrir le processus de l'activité">
      <td>${_esc(n.prestataire_nom || '')}</td>
      <td>${_esc(n.objet_activite || '')}</td>
      <td>${_formatDate(n.date_activite)}</td>
      <td>${_formatDate(n.date_fin_effective)}</td>
      <td>${_esc(nom(domaines, n.domaine_id, 'code'))} · ${_esc(nom(secteurs, n.secteur_id, 'code'))}</td>
      <td>${execProcStatutBadge(n, dos)}</td>
      <td style="white-space:nowrap;text-align:center;">
        <button class="btn-icon" onclick="execProcHistorique('hors-plan','${n.id}')" title="${te('historique')}">${EXEC_ICONS.clock}</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data')}</td></tr>`;

  return `
  <div class="card expanded" style="margin-bottom:0.75rem;">
    <div class="exec-accordion-header" onclick="this.parentElement.classList.toggle('expanded')"
         style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;padding:0.35rem 0.6rem;font-weight:600;flex-wrap:wrap;background:#fef3c7;border-radius:6px 6px 0 0;font-size:0.85rem;">
      <span class="exec-form-section-chevron" style="transition:transform 0.2s;">${EXEC_ICONS.chevronDown}</span>
      ${EXEC_ICONS.trigger || ''} <span>Autres Activités</span>
      <span style="color:#334155;font-weight:500;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.02em;">
        · hors plan de surveillance · ${lignes.length} activité(s)
      </span>
    </div>
    <div class="exec-accordion-body" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
      <table class="exec-data-table exec-compact-table" style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
        <thead><tr>
          <th style="width:160px;">${te('provider')}</th>
          <th style="width:300px;">${te('objet')}</th>
          <th style="width:95px;">${te('date_debut')}</th>
          <th style="width:95px;">${te('date_fin')}</th>
          <th style="width:150px;">Domaine · Secteur</th>
          <th style="width:110px;">${te('status')}</th>
          <th style="width:80px;text-align:center;">${te('actions')}</th>
        </tr></thead>
        <tbody>${corps}</tbody>
      </table>
    </div>
  </div>`;
}
window.execProcGroupeHorsPlan = execProcGroupeHorsPlan;
