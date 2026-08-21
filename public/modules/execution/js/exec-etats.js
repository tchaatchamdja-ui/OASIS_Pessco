/* Module « Exécution de la Surveillance » — menu « États ».
   Là où « Déclenchement » et « Dossiers » présentaient chacun une facette du
   circuit, ce menu donne la situation d'ensemble : ce qui reste à déclencher,
   ce qui est engagé, ce qui est clos, ce qui est archivé. Les délais du
   processus (menu Paramètres) fondent les alertes de retard.
   ─────────────────────────────────────────────────────────────────────── */

const EXEC_ETATS_DELAIS_DEFAUT = {
  notification_avant_activite: 30,
  validation_notification: 3,
  confirmation_prestataire: 7,
  redaction_rapport: 15,
  validation_rapport: 7,
  transmission_rapport: 5,
  archivage_apres_cloture: 30,
  horizon_a_declencher: 3,
};

// Intitulés et portée de chaque délai, tels qu'ils se lisent dans Paramètres.
const EXEC_ETATS_DELAIS_DESCRIPTION = [
  { cle: 'notification_avant_activite', libelle: 'Notification avant l’activité',
    aide: 'Jours avant la date de début où l’activité doit être déclenchée.', unite: 'jours' },
  { cle: 'validation_notification', libelle: 'Validation de la notification',
    aide: 'Jours pour valider une notification soumise.', unite: 'jours' },
  { cle: 'confirmation_prestataire', libelle: 'Confirmation de l’activité',
    aide: 'Jours pour confirmer l’activité après transmission au prestataire.', unite: 'jours' },
  { cle: 'redaction_rapport', libelle: 'Soumission du projet de rapport',
    aide: 'Jours après la fin de l’activité pour soumettre le rapport.', unite: 'jours' },
  { cle: 'validation_rapport', libelle: 'Validation du rapport',
    aide: 'Jours pour valider un rapport soumis.', unite: 'jours' },
  { cle: 'transmission_rapport', libelle: 'Transmission du rapport',
    aide: 'Jours pour transmettre au prestataire un rapport validé.', unite: 'jours' },
  { cle: 'archivage_apres_cloture', libelle: 'Archivage du dossier clôturé',
    aide: 'Jours après la clôture du dossier au terme desquels l’archivage est attendu.', unite: 'jours' },
  { cle: 'horizon_a_declencher', libelle: 'Horizon « à déclencher »',
    aide: 'Mois à venir pris en compte dans la liste des activités à déclencher.', unite: 'mois' },
];

const EXEC_ETATS = { sub: 'a_declencher', delais: { ...EXEC_ETATS_DELAIS_DEFAUT }, ouvertes: {} };

// Arrêter ou archiver une activité relève de l'administration du parc : les
// rôles portail SUPERADMIN et ADMIN AAC seuls, dans leur portée (le serveur
// vérifie le domaine et le secteur).
const execEtatsPeutAdministrer = () => ['SUPERADMIN', 'ADMIN']
  .includes((EXEC_STATE.user || {}).role) && _execCanValidate();
const execEtatsEstSuperadmin = () => (EXEC_STATE.user || {}).role === 'SUPERADMIN';

// ── Dates ──
const execEtatsJour = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const execEtatsDate = (v) => {
  if (!v) return null;
  // Une échéance déjà calculée arrive comme objet Date, une donnée stockée
  // comme chaîne ISO : les deux se lisent ici.
  const d = v instanceof Date ? new Date(v.getTime()) : new Date(String(v).slice(0, 10));
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};
// Jours séparant une date d'aujourd'hui : négatif si la date est passée.
function execEtatsJoursRestants(v) {
  const d = execEtatsDate(v);
  if (!d) return null;
  return Math.round((d - execEtatsJour()) / 86400000);
}
const execEtatsPlus = (v, jours) => {
  const d = execEtatsDate(v);
  if (!d) return null;
  d.setDate(d.getDate() + (jours || 0));
  return d;
};

// Badge de délai : « J-5 », « Aujourd’hui », « 3 j de retard ».
function execEtatsBadgeDelai(jours) {
  if (jours === null || jours === undefined) return '<span class="exec-delai">—</span>';
  if (jours < 0) return `<span class="exec-delai retard">${Math.abs(jours)} j de retard</span>`;
  if (jours === 0) return '<span class="exec-delai urgent">Aujourd’hui</span>';
  const classe = jours <= 7 ? 'urgent' : (jours <= 15 ? 'proche' : '');
  return `<span class="exec-delai ${classe}">J-${jours}</span>`;
}

async function execEtatsChargerDelais() {
  try {
    const r = await api(`${EXEC_MODULE_API}/parametres/delais`);
    EXEC_ETATS.delais = { ...EXEC_ETATS_DELAIS_DEFAUT, ...(r.valeurs || {}) };
    EXEC_ETATS.delaisModifiable = !!r.modifiable;
  } catch (e) { /* les valeurs par défaut suffisent à l'affichage */ }
}

// ══════════════════════════════════════
//  Collecte : toutes les activités, planifiées ou non
// ══════════════════════════════════════
// Une ligne d'état réunit l'activité, sa notification et son dossier ; les
// écrans qui suivent ne travaillent que sur cette forme commune.
function execEtatsLignes() {
  const notifs = EXEC_STATE.data.notifications || [];
  const dossiers = EXEC_STATE.data.dossiers || [];
  const rapports = EXEC_STATE.data.rapports || [];
  const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
  const inspecteurs = EXEC_STATE.data.inspecteurs || [];
  const nomResp = (id) => {
    const u = inspecteurs.find((x) => x.id === id);
    return u ? `${u.prenom || ''} ${u.nom || ''}`.trim() || u.nom || '' : '';
  };

  const lignes = [];
  plans.forEach((plan) => {
    (plan.activites || []).forEach((a) => {
      const notif = notifs.find((n) => n.activite_id === a.id) || null;
      const dossier = notif ? dossiers.find((d) => d.notification_id === notif.id) || null : null;
      lignes.push({
        planId: plan.id, activiteId: a.id, horsPlan: false,
        objet: a.objet || a.description || '',
        prestataire: a.prestataire_nom || '',
        debut: a.date_debut || '', fin: a.date_fin || '',
        responsable_id: a.responsable_id || '',
        responsable: nomResp(a.responsable_id) || '',
        notif, dossier,
        rapports: dossier ? rapports.filter((r) => r.dossier_id === dossier.id) : [],
      });
    });
  });
  // Activités hors plan : la notification en tient lieu.
  notifs.filter((n) => n.hors_plan).forEach((n) => {
    const dossier = dossiers.find((d) => d.notification_id === n.id) || null;
    lignes.push({
      planId: 'hors-plan', activiteId: n.id, horsPlan: true,
      objet: n.objet_activite || '',
      prestataire: n.prestataire_nom || '',
      debut: n.date_activite || '', fin: n.date_fin_effective || '',
      responsable_id: '', responsable: '',
      notif: n, dossier,
      rapports: dossier ? rapports.filter((r) => r.dossier_id === dossier.id) : [],
    });
  });
  return lignes;
}

const execEtatsRapportsPar = (l, statuts) => (l.rapports || []).filter((r) => statuts.includes(r.statut));

// ── Répartition des lignes par état ──
function execEtatsRepartir() {
  const D = EXEC_ETATS.delais;
  const lignes = execEtatsLignes();
  const horizon = new Date(execEtatsJour());
  horizon.setMonth(horizon.getMonth() + (D.horizon_a_declencher || 3));

  const aDeclencher = lignes
    .filter((l) => !l.notif && !l.horsPlan)
    .filter((l) => {
      const d = execEtatsDate(l.debut);
      return d && d <= horizon;
    })
    .map((l) => {
      // L'échéance de déclenchement précède le début de l'activité.
      const limite = execEtatsPlus(l.debut, -(D.notification_avant_activite || 0));
      return { ...l, limite, jours: limite ? execEtatsJoursRestants(limite) : null };
    })
    .sort((a, b) => (a.jours === null ? 1 : a.jours) - (b.jours === null ? 1 : b.jours));

  const enCours = {
    brouillons: [], validation_notif: [], confirmation: [],
    rapport: [], validation_rapport: [], transmission: [],
  };
  lignes.forEach((l) => {
    const n = l.notif;
    if (!n) return;
    const d = l.dossier;
    if (d && d.statut === 'cloture') return;
    const soumis = execEtatsRapportsPar(l, ['soumis']);
    const valides = execEtatsRapportsPar(l, ['valide']);
    const transmis = execEtatsRapportsPar(l, ['transmis']);

    if (n.statut === 'brouillon') {
      enCours.brouillons.push({ ...l, jours: execEtatsJoursRestants(execEtatsPlus(l.debut, -(D.notification_avant_activite || 0))) });
    } else if (n.statut === 'soumis') {
      enCours.validation_notif.push({ ...l, jours: execEtatsJoursRestants(execEtatsPlus(n.date_soumission, D.validation_notification)) });
    } else if (n.statut === 'envoye') {
      enCours.confirmation.push({ ...l, jours: execEtatsJoursRestants(execEtatsPlus(n.date_envoi, D.confirmation_prestataire)) });
    } else if (d) {
      const fin = n.date_fin_effective || l.fin;
      if (transmis.length) {
        // Rapport transmis mais dossier encore ouvert : reste la clôture.
        return;
      }
      if (valides.length) {
        const r = valides[0];
        enCours.transmission.push({ ...l, jours: execEtatsJoursRestants(execEtatsPlus(r.date_validation, D.transmission_rapport)) });
      } else if (soumis.length) {
        enCours.validation_rapport.push({ ...l, jours: execEtatsJoursRestants(execEtatsPlus(d.date_soumission, D.validation_rapport)) });
      } else {
        enCours.rapport.push({ ...l, jours: execEtatsJoursRestants(execEtatsPlus(fin, D.redaction_rapport)) });
      }
    }
  });
  Object.keys(enCours).forEach((k) => enCours[k]
    .sort((a, b) => (a.jours === null ? 1 : a.jours) - (b.jours === null ? 1 : b.jours)));

  // Une activité est archivée dès que sa notification ou son dossier le porte :
  // un processus arrêté s'archive sans dossier clôturé.
  const archivee = (l) => Number((l.notif || {}).archive) === 1
    || Number((l.dossier || {}).archive) === 1;
  const arretee = (l) => Number((l.notif || {}).arret) === 1
    || (l.dossier && l.dossier.statut === 'arrete');
  const close = (l) => l.dossier && l.dossier.statut === 'cloture';

  // Activités déclenchées dont le circuit n'est ni clos ni archivé : elles
  // vivent encore, qu'elles avancent ou qu'elles soient arrêtées.
  const enVie = lignes
    .filter((l) => l.notif && !close(l) && !archivee(l))
    .map((l) => ({ ...l, arretee: arretee(l) }))
    .sort((a, b) => String(a.debut).localeCompare(String(b.debut)));

  // Les activités arrêtées quittent les actions en attente : plus rien n'y est
  // attendu tant que le processus n'a pas repris.
  Object.keys(enCours).forEach((k) => { enCours[k] = enCours[k].filter((l) => !arretee(l)); });

  return {
    aDeclencher,
    enVie,
    enCours,
    cloturees: lignes.filter((l) => close(l) && !archivee(l)),
    archivees: lignes.filter((l) => (close(l) || arretee(l)) && archivee(l)),
  };
}

// ══════════════════════════════════════
//  Rendu
// ══════════════════════════════════════
// Les tables des états reprennent le format de la table des activités
// (menu « Activités de Supervision ») : même densité, mêmes largeurs fixes,
// même défilement horizontal — on passe de l'une à l'autre sans dépaysement.
function execEtatsTableau(colonnes, lignesHtml, vide) {
  if (!lignesHtml) return `<p class="exec-etats-vide">${_esc(vide || te('no_data'))}</p>`;
  return `<div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
    <table class="exec-data-table exec-compact-table exec-etats-table"
      style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
      <thead><tr>${colonnes.map((c) => {
        const style = [c.largeur ? `width:${c.largeur}` : '', c.centre ? 'text-align:center' : '']
          .filter(Boolean).join(';');
        return `<th${style ? ` style="${style};"` : ''}>${_esc(c.titre)}</th>`;
      }).join('')}</tr></thead>
      <tbody>${lignesHtml}</tbody>
    </table>
  </div>`;
}

const execEtatsOuvrir = (l) => `execOpenActiviteProcessus('${l.planId}','${l.activiteId}')`;

// ── Onglet 1 : activités à déclencher ──
function execEtatsPanA_declencher(R) {
  const lignes = R.aDeclencher.map((l) => `
    <tr class="exec-act-row" style="cursor:pointer;"
        onclick="if(!event.target.closest('button'))${execEtatsOuvrir(l)}">
      <td>${_esc(l.prestataire || '—')}</td>
      <td>${_esc(l.objet || '—')}</td>
      <td>${_formatDate(l.debut)}</td>
      <td>${l.limite ? _formatDate(l.limite.toISOString().slice(0, 10)) : '—'}</td>
      <td>${execEtatsBadgeDelai(l.jours)}</td>
      <td>${_esc(l.responsable || '—')}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button class="btn btn-sm btn-outline" onclick="execEtatsRappel('${l.planId}','${l.activiteId}')">
          ${EXEC_ICONS.bell || ''} Rappel
        </button>
      </td>
    </tr>`).join('');
  return `
    <div class="card">
      <h3>Activités à notifier <span class="exec-etats-compte">${R.aDeclencher.length}</span></h3>
      <p class="exec-etats-intro">
        Activités planifiées non encore déclenchées, dont la date de début tombe dans les
        ${EXEC_ETATS.delais.horizon_a_declencher} prochains mois. L'échéance de déclenchement
        précède le début de ${EXEC_ETATS.delais.notification_avant_activite} jours.
      </p>
      ${execEtatsTableau([
        { titre: 'Prestataire', largeur: '160px' }, { titre: 'Objet', largeur: '300px' },
        { titre: 'Début', largeur: '95px' }, { titre: 'À notifier avant', largeur: '110px' },
        { titre: 'Délai', largeur: '110px' }, { titre: 'Responsable', largeur: '150px' },
        { titre: 'Action', largeur: '95px', centre: true },
      ], lignes, 'Aucune activité à déclencher sur la période.')}
    </div>`;
}

// ── Onglet 2 : activités en cours ──
const EXEC_ETATS_SECTIONS = [
  { cle: 'brouillons', titre: 'Brouillons en attente de soumission', echeance: 'Déclenchement attendu' },
  { cle: 'validation_notif', titre: 'Notifications en attente de validation', echeance: 'À valider avant' },
  { cle: 'confirmation', titre: 'Confirmations d’activités en attente', echeance: 'À confirmer avant' },
  { cle: 'rapport', titre: 'Projets de rapport en attente', echeance: 'À soumettre avant' },
  { cle: 'validation_rapport', titre: 'Rapports en attente de validation', echeance: 'À valider avant' },
  { cle: 'transmission', titre: 'Rapports validés en attente de transmission', echeance: 'À transmettre avant' },
];

function execEtatsPanEn_cours(R) {
  return EXEC_ETATS_SECTIONS.map((s) => {
    const items = R.enCours[s.cle] || [];
    const retard = items.filter((l) => l.jours !== null && l.jours < 0).length;
    const lignes = items.map((l) => `
      <tr class="exec-act-row" style="cursor:pointer;"
          onclick="if(!event.target.closest('button'))${execEtatsOuvrir(l)}">
        <td>${_esc(l.prestataire || '—')}</td>
        <td>${_esc(l.objet || '—')}</td>
        <td>${_esc((l.notif && l.notif.reference) || '—')}</td>
        <td>${_formatDate(l.debut)} → ${_formatDate(l.fin)}</td>
        <td>${execEtatsBadgeDelai(l.jours)}</td>
        <td style="text-align:center;white-space:nowrap;">
          <button class="btn btn-sm btn-outline" onclick="execEtatsRappel('${l.planId}','${l.activiteId}','${_esc(s.titre)}')">
            ${EXEC_ICONS.bell || ''} Rappel
          </button>
        </td>
      </tr>`).join('');
    // Chaque section est un volet : on déplie ce qui appelle une action.
    const ouvert = EXEC_ETATS.ouvertes[s.cle] !== undefined
      ? EXEC_ETATS.ouvertes[s.cle] : items.length > 0;
    return `
      <details class="card exec-etats-section" ${ouvert ? 'open' : ''}
        ontoggle="EXEC_ETATS.ouvertes['${s.cle}']=this.open;">
        <summary>
          <span class="exec-etats-chevron">${EXEC_ICONS.chevronDown || ''}</span>
          <span class="exec-etats-titre">${_esc(s.titre)}</span>
          <span class="exec-etats-compte${items.length > 1 ? ' alerte' : ''}">${items.length}</span>
          ${retard ? `<span class="exec-etats-compte retard">${retard} en retard</span>` : ''}
        </summary>
        <div class="exec-etats-section-corps">
          ${execEtatsTableau([
            { titre: 'Prestataire', largeur: '160px' }, { titre: 'Objet', largeur: '300px' },
            { titre: 'Référence', largeur: '140px' }, { titre: 'Période', largeur: '170px' },
            { titre: s.echeance, largeur: '120px' }, { titre: 'Action', largeur: '95px', centre: true },
          ], lignes, 'Rien en attente.')}
        </div>
      </details>`;
  }).join('');
}

// ── Onglet 2 : activités en cours ──
// Tout ce qui est déclenché et pas encore clos : on y consulte le processus et
// son historique, on arrête un circuit qui ne peut pas se poursuivre, on
// archive ce qui est arrêté, et le super-administrateur peut supprimer.
function execEtatsPanEn_vie(R) {
  const superadmin = execEtatsEstSuperadmin();
  const administre = execEtatsPeutAdministrer();
  const lignes = R.enVie.map((l) => {
    const n = l.notif || {};
    const etape = execProcStatutBadge(l.notif, l.dossier);
    return `
      <tr class="exec-act-row${l.arretee ? ' exec-etats-arretee' : ''}" style="cursor:pointer;"
          onclick="if(!event.target.closest('button'))${execEtatsOuvrir(l)}">
        <td>${_esc(l.prestataire || '—')}</td>
        <td>${_esc(l.objet || '—')}</td>
        <td>${_esc(n.reference || '—')}</td>
        <td>${_formatDate(l.debut)} → ${_formatDate(l.fin)}</td>
        <td>${l.arretee
          ? `<span class="exec-statut-etape arrete" title="${_esc(n.motif_arret || '')}">Arrêté</span>`
          : etape}</td>
        <td class="exec-etats-actions">
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="${execEtatsOuvrir(l)}"
            title="Consulter le processus" aria-label="Consulter le processus">${EXEC_ICONS.eye || ''}</button>
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="execProcHistorique('${l.planId}','${l.activiteId}')"
            title="${te('historique')}" aria-label="${te('historique')}">${EXEC_ICONS.clock || ''}</button>
          ${administre ? (l.arretee
            ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="execEtatsReprendre('${n.id}')"
                 title="Reprendre le processus" aria-label="Reprendre le processus">${EXEC_ICONS.refresh || EXEC_ICONS.back || ''}</button>
               <button class="btn btn-sm btn-primary btn-icon-only" onclick="execEtatsArchiverActivite('${n.id}',true)"
                 title="Archiver l’activité" aria-label="Archiver l’activité">${EXEC_ICONS.folder || ''}</button>`
            : `<button class="btn btn-sm btn-icon-only exec-btn-rejet" onclick="execEtatsArreter('${n.id}')"
                 title="Arrêter le processus" aria-label="Arrêter le processus">${EXEC_ICONS.close || '✕'}</button>`) : ''}
          ${superadmin ? `<button class="btn btn-sm btn-icon-only exec-btn-rejet" onclick="execEtatsSupprimer('${n.id}')"
            title="Supprimer l’activité" aria-label="Supprimer l’activité">${EXEC_ICONS.delete || EXEC_ICONS.trash || '🗑'}</button>` : ''}
        </td>
      </tr>`;
  }).join('');
  const arretees = R.enVie.filter((l) => l.arretee).length;
  return `
    <div class="card">
      <h3>Activités en cours
        <span class="exec-etats-compte${R.enVie.length > 1 ? ' alerte' : ''}">${R.enVie.length}</span>
        ${arretees ? `<span class="exec-etats-compte retard">${arretees} arrêtée${arretees > 1 ? 's' : ''}</span>` : ''}
      </h3>
      <p class="exec-etats-intro">
        Activités déclenchées dont le circuit n'est pas clôturé. Un processus qui ne peut pas
        se poursuivre s'arrête : il reste consultable et peut être archivé, ou repris.
      </p>
      ${execEtatsTableau([
        { titre: 'Prestataire', largeur: '160px' }, { titre: 'Objet', largeur: '300px' },
        { titre: 'Référence', largeur: '140px' }, { titre: 'Période', largeur: '170px' },
        { titre: 'Étape', largeur: '150px' },
        { titre: 'Consultation', largeur: '170px', centre: true },
      ], lignes, 'Aucune activité en cours.')}
    </div>`;
}

// ── Onglets 4 et 5 : clôturées, archivées ──
function execEtatsPanClos(items, archivees) {
  const lignes = items.map((l) => {
    const d = l.dossier;
    const rapport = (l.rapports || []).find((r) => r.statut === 'transmis') || (l.rapports || [])[0];
    return `
      <tr class="exec-act-row" style="cursor:pointer;"
          onclick="if(!event.target.closest('button'))${execEtatsOuvrir(l)}">
        <td>${_esc(l.prestataire || '—')}</td>
        <td>${_esc(l.objet || '—')}</td>
        <td>${_formatDate(l.debut)} → ${_formatDate(l.fin)}</td>
        <td>${_esc(d.reference || '')}</td>
        <td>${rapport ? _esc(rapport.reference || '') : '—'}</td>
        <td>${_formatDate(archivees ? d.date_archivage : (d.date_fin_execution || d.date_maj))}</td>
        ${archivees ? '' : `<td>${execEtatsBadgeDelai(execEtatsJoursRestants(
          execEtatsPlus(d.date_fin_execution || d.date_maj, EXEC_ETATS.delais.archivage_apres_cloture)))}</td>`}
        <td class="exec-etats-actions">
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="${execEtatsOuvrir(l)}"
            title="Consulter le dossier" aria-label="Consulter le dossier">${EXEC_ICONS.eye || ''}</button>
          ${rapport ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="execPreviewRapport('${rapport.id}')"
            title="Rapport" aria-label="Rapport">${EXEC_ICONS.rapports || ''}</button>` : ''}
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="execProcHistorique('${l.planId}','${l.activiteId}')"
            title="${te('historique')}" aria-label="${te('historique')}">${EXEC_ICONS.clock || ''}</button>
          ${execEtatsPeutAdministrer() ? `<button class="btn btn-sm btn-icon-only ${archivees ? 'btn-outline' : 'btn-primary'}"
            onclick="execEtatsArchiver('${d.id}',${archivees ? 'false' : 'true'})"
            title="${archivees ? 'Désarchiver' : 'Archiver'}" aria-label="${archivees ? 'Désarchiver' : 'Archiver'}">
            ${(archivees ? EXEC_ICONS.back : EXEC_ICONS.folder) || ''}</button>` : ''}
        </td>
      </tr>`;
  }).join('');
  return `
    <div class="card">
      <h3>${archivees ? 'Activités archivées' : 'Activités clôturées'}
        <span class="exec-etats-compte">${items.length}</span></h3>
      <p class="exec-etats-intro">${archivees
        ? 'Dossiers clôturés puis archivés. Les pièces produites restent consultables.'
        : `Dossiers clôturés non encore archivés : l'archivage est attendu dans les `
          + `${EXEC_ETATS.delais.archivage_apres_cloture} jours suivant la clôture. `
          + `Les constatations issues de l'activité poursuivent leur suivi et ne sont pas archivées.`}</p>
      ${execEtatsTableau([
        // Huit colonnes : l'objet cède la place pour que la consultation reste
        // visible sans faire défiler la table.
        { titre: 'Prestataire', largeur: '150px' }, { titre: 'Objet', largeur: '190px' },
        { titre: 'Période', largeur: '160px' }, { titre: 'Dossier', largeur: '120px' },
        { titre: 'Rapport', largeur: '120px' },
        { titre: archivees ? 'Archivé le' : 'Clôturé le', largeur: '95px' },
        ...(archivees ? [] : [{ titre: 'À archiver avant', largeur: '110px' }]),
        { titre: 'Consultation', largeur: '150px', centre: true },
      ], lignes, archivees ? 'Aucune activité archivée.' : 'Aucune activité clôturée en attente d’archivage.')}
    </div>`;
}

function execRenderEtats() {
  const R = execEtatsRepartir();
  const enCoursTotal = Object.values(R.enCours).reduce((n, x) => n + x.length, 0);
  const retards = Object.values(R.enCours)
    .reduce((n, x) => n + x.filter((l) => l.jours !== null && l.jours < 0).length, 0)
    + R.aDeclencher.filter((l) => l.jours !== null && l.jours < 0).length;

  const onglets = [
    { cle: 'a_declencher', titre: 'Activités à déclencher', compte: R.aDeclencher.length },
    { cle: 'en_vie', titre: 'Activités en cours', compte: R.enVie.length },
    { cle: 'en_cours', titre: 'Actions en attentes', compte: enCoursTotal },
    { cle: 'cloturees', titre: 'Activités clôturées', compte: R.cloturees.length },
    { cle: 'archivees', titre: 'Activités archivées', compte: R.archivees.length },
  ];
  const barre = `<div class="exec-workflow-tabs">${onglets.map((o) => `
    <button class="exec-tab ${EXEC_ETATS.sub === o.cle ? 'active' : ''}"
      onclick="EXEC_ETATS.sub='${o.cle}';execRenderPage();">
      ${_esc(o.titre)} <span class="exec-tab-badge">${o.compte}</span>
    </button>`).join('')}</div>`;

  let corps = '';
  if (EXEC_ETATS.sub === 'en_vie') corps = execEtatsPanEn_vie(R);
  else if (EXEC_ETATS.sub === 'en_cours') corps = execEtatsPanEn_cours(R);
  else if (EXEC_ETATS.sub === 'cloturees') corps = execEtatsPanClos(R.cloturees, false);
  else if (EXEC_ETATS.sub === 'archivees') corps = execEtatsPanClos(R.archivees, true);
  else corps = execEtatsPanA_declencher(R);

  return `
    <div class="page-content exec-etats">
      <div class="page-header">
        <h2>États</h2>
        ${retards ? `<span class="exec-etats-alerte">${retards} action${retards > 1 ? 's' : ''} en retard</span>` : ''}
      </div>
      ${barre}
      ${corps}
    </div>`;
}

// ══════════════════════════════════════
//  Actions
// ══════════════════════════════════════
window.execEtatsRappel = function (planId, activiteId, motif) {
  const l = execEtatsLignes().find((x) => x.planId === planId && x.activiteId === activiteId);
  if (!l) return;
  const inspecteurs = EXEC_STATE.data.inspecteurs || [];
  const defaut = inspecteurs.find((u) => u.id === l.responsable_id) || {};
  const options = inspecteurs.map((u) => {
    const nom = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.nom || u.id;
    return `<option value="${_esc(u.email || u.id)}" ${u.id === l.responsable_id ? 'selected' : ''}>${_esc(nom)}${u.email ? ` — ${_esc(u.email)}` : ''}</option>`;
  }).join('');
  const texte = `Rappel : l'activité « ${l.objet} » (${l.prestataire}) prévue du `
    + `${_formatDate(l.debut)} au ${_formatDate(l.fin)} appelle une action de votre part`
    + `${motif ? ` — ${motif}` : ''}.`;

  const corps = `
    <div class="exec-proc-bloc">
      <label class="form-label">Destinataire</label>
      <select class="form-control" id="rappel_dest">
        ${options || `<option value="">— Aucun inspecteur enregistré —</option>`}
      </select>
      <label class="form-label">Message</label>
      <textarea class="form-control" id="rappel_msg" rows="5">${_esc(texte)}</textarea>
      <p class="exec-proc-erreur" id="rappel_erreur"></p>
    </div>`;
  const pied = `
    <button class="btn btn-outline" onclick="execCloseSlider()">Annuler</button>
    <button class="btn btn-primary" onclick="execEtatsEnvoyerRappel('${planId}','${activiteId}','${_esc(motif || '')}')">
      ${EXEC_ICONS.send || ''} Envoyer le rappel
    </button>`;
  execShowSlider(`${EXEC_ICONS.bell || ''} Rappel au responsable${defaut.nom ? '' : ''}`, corps, pied, 'md');
};

window.execEtatsEnvoyerRappel = async function (planId, activiteId, motif) {
  const val = (id) => ((document.getElementById(id) || {}).value || '').trim();
  const erreur = document.getElementById('rappel_erreur');
  if (!val('rappel_dest')) { erreur.textContent = 'Choisissez un destinataire.'; return; }
  try {
    const r = await api(`${EXEC_MODULE_API}/rappels`, {
      method: 'POST',
      body: JSON.stringify({
        activite_id: activiteId, motif: motif || '',
        destinataire: val('rappel_dest'), message: val('rappel_msg'),
        objet: motif || 'Activité de surveillance à déclencher',
      }),
    });
    execCloseSlider();
    _execToast(`Rappel envoyé à ${r.destinataire}`, 'success');
  } catch (e) {
    erreur.textContent = (e && e.message) || 'Envoi impossible';
  }
};

// Arrêt d'un processus : le motif est demandé, il reste attaché à l'activité.
window.execEtatsArreter = async function (notifId) {
  const motif = await execProcConfirmer({
    titre: 'Arrêter le processus',
    message: 'Le circuit de cette activité s’interrompt. Elle reste consultable et pourra être archivée, ou reprise.',
    libelle: 'Arrêter le processus',
    saisie: { label: 'Motif de l’arrêt', placeholder: 'Activité annulée, plan revu, prestataire indisponible…' },
  });
  if (motif === false) return;
  try {
    await api(`${EXEC_MODULE_API}/activites-en-cours/${notifId}/arreter`, {
      method: 'PUT', body: JSON.stringify({ motif }),
    });
    await execRefreshDynamic();
    _execToast('Processus arrêté', 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || 'Arrêt impossible', 'error'); }
};

window.execEtatsReprendre = async function (notifId) {
  const ok = await execProcConfirmer({
    titre: 'Reprendre le processus',
    message: 'L’activité repart à l’étape où elle avait été arrêtée.',
    libelle: 'Reprendre',
  });
  if (!ok) return;
  try {
    await api(`${EXEC_MODULE_API}/activites-en-cours/${notifId}/reprendre`, { method: 'PUT' });
    await execRefreshDynamic();
    _execToast('Processus repris', 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || 'Reprise impossible', 'error'); }
};

window.execEtatsArchiverActivite = async function (notifId, archiver) {
  const ok = await execProcConfirmer({
    titre: archiver ? 'Archiver l’activité' : 'Sortir l’activité des archives',
    message: archiver
      ? 'L’activité arrêtée rejoint les activités archivées ; ses pièces restent consultables.'
      : 'L’activité revient parmi les activités en cours.',
    libelle: archiver ? 'Archiver' : 'Désarchiver',
  });
  if (!ok) return;
  try {
    await api(`${EXEC_MODULE_API}/activites-en-cours/${notifId}/${archiver ? 'archiver' : 'desarchiver'}`, { method: 'PUT' });
    await execRefreshDynamic();
    _execToast(archiver ? 'Activité archivée' : 'Activité désarchivée', 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || 'Action impossible', 'error'); }
};

// Suppression définitive : réservée au super-administrateur, confirmée deux
// fois — la seconde exige la référence de la notification.
window.execEtatsSupprimer = async function (notifId) {
  const n = (EXEC_STATE.data.notifications || []).find((x) => x.id === notifId) || {};
  const saisi = await execProcConfirmer({
    titre: 'Supprimer l’activité',
    message: `Tout ce qui a été produit pour cette activité — notification, échanges, dossier, `
      + `constatations, rapports — sera définitivement supprimé. Saisissez « ${n.reference || ''} » pour confirmer.`,
    libelle: 'Supprimer définitivement',
    saisie: { label: 'Référence de la notification', placeholder: n.reference || '' },
  });
  if (saisi === false) return;
  if (String(saisi).trim() !== String(n.reference || '').trim()) {
    _execToast('Référence non conforme : suppression abandonnée', 'error');
    return;
  }
  try {
    await api(`${EXEC_MODULE_API}/activites-en-cours/${notifId}`, { method: 'DELETE' });
    await execRefreshDynamic();
    _execToast('Activité supprimée', 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || 'Suppression impossible', 'error'); }
};

window.execEtatsArchiver = async function (dossierId, archiver) {
  const ok = await execProcConfirmer({
    titre: archiver ? 'Archiver le dossier' : 'Sortir le dossier des archives',
    message: archiver
      ? 'Le dossier quitte les affaires courantes. Ses pièces restent consultables dans les activités archivées.'
      : 'Le dossier revient parmi les activités clôturées.',
    libelle: archiver ? 'Archiver' : 'Désarchiver',
  });
  if (!ok) return;
  try {
    await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/${archiver ? 'archiver' : 'desarchiver'}`, { method: 'PUT' });
    await execRefreshDynamic();
    _execToast(archiver ? 'Dossier archivé' : 'Dossier désarchivé', 'success');
    execRenderPage();
  } catch (e) {
    _execToast((e && e.message) || 'Action impossible', 'error');
  }
};

// ══════════════════════════════════════
//  Paramètres : onglet « Délais »
// ══════════════════════════════════════
function execRenderDelaisTab() {
  const D = EXEC_ETATS.delais;
  const modifiable = EXEC_ETATS.delaisModifiable !== false;
  const lignes = EXEC_ETATS_DELAIS_DESCRIPTION.map((d) => `
    <tr>
      <td><strong>${_esc(d.libelle)}</strong><div class="exec-delai-aide">${_esc(d.aide)}</div></td>
      <td style="width:150px;white-space:nowrap;">
        <input type="number" min="0" max="365" class="form-control exec-delai-champ"
          id="delai_${d.cle}" value="${D[d.cle]}" ${modifiable ? '' : 'disabled'}>
        <span class="exec-delai-unite">${_esc(d.unite)}</span>
      </td>
    </tr>`).join('');
  return `
    <div class="card">
      <h3>Délais du processus</h3>
      <p class="exec-etats-intro">
        Ces délais n'empêchent aucune action : ils déterminent à partir de quand une étape
        est signalée en retard dans le menu « États ».
      </p>
      <table class="exec-table exec-delais-table"><tbody>${lignes}</tbody></table>
      ${modifiable ? `<div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
        <button class="btn btn-primary btn-sm" onclick="execEtatsEnregistrerDelais()">
          ${EXEC_ICONS.clipboard || ''} Enregistrer
        </button>
        <button class="btn btn-outline btn-sm" onclick="execEtatsDelaisDefaut()">Valeurs par défaut</button>
      </div>` : '<p class="exec-etats-intro">Seul un administrateur du module modifie ces délais.</p>'}
    </div>`;
}

window.execEtatsDelaisDefaut = function () {
  EXEC_ETATS_DELAIS_DESCRIPTION.forEach((d) => {
    const champ = document.getElementById(`delai_${d.cle}`);
    if (champ) champ.value = EXEC_ETATS_DELAIS_DEFAUT[d.cle];
  });
};

window.execEtatsEnregistrerDelais = async function () {
  const valeurs = {};
  EXEC_ETATS_DELAIS_DESCRIPTION.forEach((d) => {
    const champ = document.getElementById(`delai_${d.cle}`);
    valeurs[d.cle] = champ ? Number(champ.value) : EXEC_ETATS_DELAIS_DEFAUT[d.cle];
  });
  try {
    const r = await api(`${EXEC_MODULE_API}/parametres/delais`, {
      method: 'PUT', body: JSON.stringify({ valeurs }),
    });
    EXEC_ETATS.delais = { ...EXEC_ETATS_DELAIS_DEFAUT, ...(r.valeurs || {}) };
    _execToast('Délais enregistrés', 'success');
  } catch (e) {
    _execToast((e && e.message) || 'Enregistrement impossible', 'error');
  }
};

window.EXEC_ETATS = EXEC_ETATS;
window.execRenderEtats = execRenderEtats;
window.execRenderDelaisTab = execRenderDelaisTab;
window.execEtatsChargerDelais = execEtatsChargerDelais;

// ══════════════════════════════════════
//  Paramètres : onglet « Autres paramètres » — composition des références
// ══════════════════════════════════════
// Chaque objet du circuit porte une référence. Sa composition se règle ici :
// on ordonne des segments (préfixe, État, domaine, secteur, prestataire,
// année, mois, numéro d'ordre) et l'on choisit le séparateur. L'aperçu montre
// aussitôt ce que donnera la prochaine référence produite.
const EXEC_REFS = { modeles: {}, segments: [], modifiable: false, charge: false, ouvertes: {} };

const EXEC_REFS_OBJETS = [
  { cle: 'activite', libelle: 'Activité', aide: 'Référence attribuée à la confirmation de l’activité.' },
  { cle: 'notification', libelle: 'Notification', aide: 'Référence de la notification, dès son déclenchement.' },
  { cle: 'dossier', libelle: 'Dossier d’exécution', aide: 'Référence du dossier ouvert à la confirmation.' },
  { cle: 'rapport', libelle: 'Rapport (projet)', aide: 'Référence des versions successives du rapport.' },
  { cle: 'rapport_final', libelle: 'Rapport final', aide: 'Référence définitive, attribuée à la validation.' },
  { cle: 'constatation', libelle: 'Constatation', aide: 'Référence des FNC, y compris les constatations directes.' },
];

async function execRefsCharger() {
  try {
    const r = await api(`${EXEC_MODULE_API}/parametres/references`);
    EXEC_REFS.modeles = r.modeles || {};
    EXEC_REFS.defauts = r.defauts || {};
    EXEC_REFS.segments = r.segments || [];
    EXEC_REFS.modifiable = !!r.modifiable;
    EXEC_REFS.charge = true;
  } catch (e) { /* l'onglet affichera l'invite de rechargement */ }
}

// Exemple de valeurs, pour l'aperçu. Le code État est le bigramme du portail
// (Organisation → Détails sur l'Administration) ; les autres valeurs sont
// prises sur le premier secteur et le premier prestataire connus.
function execRefsExemple() {
  const D = EXEC_STATE.data || {};
  const aac = D.aac || {};
  const secteur = (D.secteurs || [])[0] || {};
  const domaine = (D.domaines || []).find((x) => x.id === secteur.domaine_id) || (D.domaines || [])[0] || {};
  const prest = (D.prestataires || [])[0] || {};
  return {
    etat: String(aac.bigramme || aac.etat || '').toUpperCase(),
    domaine: String(domaine.code || 'DOM').toUpperCase(),
    secteur: String(secteur.code || 'SEC').toUpperCase(),
    prestataire: String(prest.trigramme || 'PRE').toUpperCase(),
    annee: new Date().getFullYear(),
  };
}

function execRefsApercu(modele) {
  const ex = execRefsExemple();
  const sep = modele.separateur === undefined ? '-' : modele.separateur;
  const parties = (modele.segments || []).map((s) => {
    if (s.type === 'numero') return String(1).padStart(Number(s.longueur) || 3, '0');
    if (s.type === 'prefixe' || s.type === 'texte') return s.valeur || '';
    if (s.type === 'annee') return String(ex.annee);
    if (s.type === 'annee_courte') return String(ex.annee).slice(-2);
    if (s.type === 'mois') return String(new Date().getMonth() + 1).padStart(2, '0');
    return ex[s.type] || '';
  }).filter(Boolean);
  return parties.join(sep);
}

function execRefsLigneSegment(objet, index, s, total) {
  const meta = EXEC_REFS.segments.find((x) => x.cle === s.type) || {};
  const options = EXEC_REFS.segments
    .map((x) => `<option value="${x.cle}" ${x.cle === s.type ? 'selected' : ''}>${_esc(x.libelle)}</option>`).join('');
  const off = EXEC_REFS.modifiable ? '' : 'disabled';
  const ex = execRefsExemple();
  // Ce que ce segment donnera dans la référence, valeur d'exemple à l'appui.
  const rendu = s.type === 'numero' ? String(1).padStart(Number(s.longueur) || 3, '0')
    : (meta.saisie ? (s.valeur || '—')
      : (s.type === 'annee' ? String(ex.annee)
        : s.type === 'annee_courte' ? String(ex.annee).slice(-2)
          : s.type === 'mois' ? String(new Date().getMonth() + 1).padStart(2, '0')
            : ex[s.type] || '—'));
  return `
    <div class="exec-ref-segment">
      <span class="exec-ref-rang">${index + 1}</span>
      <select class="form-control" ${off} onchange="execRefsMajSegment('${objet}',${index},'type',this.value)">${options}</select>
      <div class="exec-ref-valeur">
        ${meta.saisie ? `<input type="text" class="form-control" maxlength="12" placeholder="Texte"
          value="${_esc(s.valeur || '')}" ${off}
          oninput="execRefsSaisir('${objet}',${index},'valeur',this)">` : ''}
        ${meta.longueur ? `<input type="number" class="form-control" min="1" max="8" title="Nombre de chiffres"
          value="${Number(s.longueur) || 3}" ${off}
          oninput="execRefsSaisir('${objet}',${index},'longueur',this)">
          <span class="exec-ref-unite">chiffres</span>` : ''}
      </div>
      <code class="exec-ref-rendu">${_esc(rendu)}</code>
      <div class="exec-ref-boutons">
        <button class="btn btn-sm btn-outline btn-icon-only" ${off || (index === 0 ? 'disabled' : '')} title="Monter"
          onclick="execRefsDeplacer('${objet}',${index},-1)">${EXEC_ICONS.chevron || '↑'}</button>
        <button class="btn btn-sm btn-outline btn-icon-only" ${off || (index === total - 1 ? 'disabled' : '')} title="Descendre"
          onclick="execRefsDeplacer('${objet}',${index},1)">${EXEC_ICONS.chevronDown || '↓'}</button>
        <button class="btn btn-sm btn-icon-only exec-btn-rejet" ${off} title="Retirer"
          onclick="execRefsRetirer('${objet}',${index})">${EXEC_ICONS.close || '✕'}</button>
      </div>
    </div>`;
}

function execRenderAutresParametresTab() {
  if (!EXEC_REFS.charge) {
    execRefsCharger().then(() => execRenderPage());
    return '<div class="card"><p class="exec-etats-intro">Chargement des paramètres…</p></div>';
  }
  const off = EXEC_REFS.modifiable ? '' : 'disabled';
  const blocs = EXEC_REFS_OBJETS.map((o) => {
    const m = EXEC_REFS.modeles[o.cle] || { separateur: '-', segments: [] };
    const segments = m.segments || [];
    // Une section par objet : dépliée à la demande, l'aperçu se lit sur le
    // bandeau sans avoir à l'ouvrir.
    const ouvert = EXEC_REFS.ouvertes[o.cle] ? 'open' : '';
    return `
      <details class="card exec-ref-objet exec-etats-section" ${ouvert}
        ontoggle="EXEC_REFS.ouvertes['${o.cle}']=this.open;">
        <summary>
          <span class="exec-etats-chevron">${EXEC_ICONS.chevronDown || ''}</span>
          <span class="exec-etats-titre">${_esc(o.libelle)}</span>
          <code class="exec-ref-apercu">${_esc(execRefsApercu(m))}</code>
        </summary>
        <div class="exec-ref-corps">
          <p class="exec-etats-intro">${_esc(o.aide)}</p>
          <div class="exec-ref-entete">
            <span></span><span>Élément</span><span>Valeur</span><span>Rendu</span><span></span>
          </div>
          <div class="exec-ref-segments">
            ${segments.map((s, i) => execRefsLigneSegment(o.cle, i, s, segments.length)).join('')}
          </div>
          <div class="exec-ref-pied">
            <button class="btn btn-sm btn-outline" ${off} onclick="execRefsAjouter('${o.cle}')">
              ${EXEC_ICONS.add || '+'} Ajouter un élément
            </button>
            <label class="exec-ref-sep">Séparateur
              <input type="text" class="form-control" maxlength="3" value="${_esc(m.separateur === undefined ? '-' : m.separateur)}"
                ${off} oninput="execRefsMajSeparateur('${o.cle}',this.value)">
            </label>
            <span class="exec-ref-total">${segments.length} élément${segments.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </details>`;
  }).join('');

  return `
    <div class="card">
      <h3>Composition des références</h3>
      <p class="exec-etats-intro">
        Les références produites par le module se composent des éléments ordonnés ci-dessous.
        Le numéro d'ordre se poursuit par famille : deux compositions différentes numérotent
        séparément. Les références déjà attribuées ne changent pas.
      </p>
    </div>
    ${blocs}
    ${EXEC_REFS.modifiable ? `<div class="exec-ref-actions">
      <button class="btn btn-primary btn-sm" onclick="execRefsEnregistrer()">
        ${EXEC_ICONS.clipboard || ''} Enregistrer
      </button>
      <button class="btn btn-outline btn-sm" onclick="execRefsDefaut()">Compositions par défaut</button>
    </div>` : '<p class="exec-etats-intro">Seul un administrateur du module compose les références.</p>'}`;
}

// Saisie au fil des frappes : le modèle est mis à jour et seuls l'aperçu et
// le rendu de la ligne sont rafraîchis. Reconstruire la page retirerait le
// curseur du champ à chaque lettre.
window.execRefsSaisir = function (objet, index, champ, el) {
  const m = EXEC_REFS.modeles[objet];
  if (!m || !m.segments[index]) return;
  const seg = m.segments[index];
  seg[champ] = champ === 'longueur' ? Number(el.value) : el.value;
  const ligne = el.closest('.exec-ref-segment');
  const rendu = ligne && ligne.querySelector('.exec-ref-rendu');
  if (rendu) {
    rendu.textContent = seg.type === 'numero'
      ? String(1).padStart(Number(seg.longueur) || 3, '0')
      : (seg.valeur || '—');
  }
  execRefsMajApercu(objet);
};

// Aperçu du bandeau de la section, sans toucher au reste de la page.
function execRefsMajApercu(objet) {
  const m = EXEC_REFS.modeles[objet];
  const bloc = [...document.querySelectorAll('.exec-ref-objet')][
    EXEC_REFS_OBJETS.findIndex((x) => x.cle === objet)];
  const apercu = bloc && bloc.querySelector('.exec-ref-apercu');
  if (m && apercu) apercu.textContent = execRefsApercu(m);
}

window.execRefsMajSegment = function (objet, index, champ, valeur) {
  const m = EXEC_REFS.modeles[objet];
  if (!m || !m.segments[index]) return;
  if (champ === 'type') {
    m.segments[index] = { type: valeur };
    if (valeur === 'numero') m.segments[index].longueur = 3;
  } else {
    m.segments[index][champ] = champ === 'longueur' ? Number(valeur) : valeur;
  }
  execRenderPage();
};

window.execRefsDeplacer = function (objet, index, sens) {
  const seg = (EXEC_REFS.modeles[objet] || {}).segments || [];
  const cible = index + sens;
  if (cible < 0 || cible >= seg.length) return;
  [seg[index], seg[cible]] = [seg[cible], seg[index]];
  execRenderPage();
};

window.execRefsRetirer = function (objet, index) {
  const seg = (EXEC_REFS.modeles[objet] || {}).segments || [];
  seg.splice(index, 1);
  execRenderPage();
};

window.execRefsAjouter = function (objet) {
  const m = EXEC_REFS.modeles[objet];
  if (!m) return;
  m.segments = m.segments || [];
  m.segments.push({ type: 'texte', valeur: '' });
  execRenderPage();
};

window.execRefsMajSeparateur = function (objet, valeur) {
  const m = EXEC_REFS.modeles[objet];
  if (!m) return;
  m.separateur = valeur;
  execRefsMajApercu(objet);
};

window.execRefsDefaut = function () {
  EXEC_REFS.modeles = JSON.parse(JSON.stringify(EXEC_REFS.defauts || {}));
  execRenderPage();
};

window.execRefsEnregistrer = async function () {
  try {
    const r = await api(`${EXEC_MODULE_API}/parametres/references`, {
      method: 'PUT', body: JSON.stringify({ modeles: EXEC_REFS.modeles }),
    });
    EXEC_REFS.modeles = r.modeles || EXEC_REFS.modeles;
    _execToast('Composition des références enregistrée', 'success');
    execRenderPage();
  } catch (e) {
    _execToast((e && e.message) || 'Enregistrement impossible', 'error');
  }
};

window.execRenderAutresParametresTab = execRenderAutresParametresTab;
window.execRefsCharger = execRefsCharger;
