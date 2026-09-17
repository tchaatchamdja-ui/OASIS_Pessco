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
  accuse_reception: 5,
  redaction_rapport: 15,
  validation_rapport: 7,
  transmission_rapport: 5,
  cloture_dossier: 10,
  archivage_apres_cloture: 30,
  soumission_constatation: 10,
  validation_constatation: 5,
  correction_constatation: 7,
  transmission_constatation: 5,
  soumission_pac: 15,
  acceptation_pac: 7,
  correction_pac: 10,
  verification_cloture: 10,
  horizon_a_declencher: 3,
  seuil_vigilance: 15,
  seuil_urgence: 7,
};

// Relevé des attentes des deux processus du module. Chaque entrée nomme le
// point de départ (`depuis`) et l'événement attendu (`jusqua`) : c'est ce
// couple qui rend le délai calculable, et l'écran le montre pour qu'on sache
// exactement ce que le nombre saisi compte. `ou` dit où le retard se voit.
const EXEC_ETATS_DELAIS_GROUPES = [
  {
    cle: 'activite',
    titre: 'Processus Activité',
    aide: 'De la préparation de la notification à l’archivage du dossier.',
    delais: [
      { cle: 'notification_avant_activite', libelle: 'Déclenchement de l’activité',
        depuis: 'Date de début planifiée', jusqua: 'Notification créée',
        aide: 'Jours avant la date de début où l’activité doit être déclenchée.',
        unite: 'jours', ou: 'États → À déclencher' },
      { cle: 'validation_notification', libelle: 'Validation de la notification',
        depuis: 'Soumission de la notification', jusqua: 'Notification validée',
        aide: 'Jours pour valider une notification soumise.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'confirmation_prestataire', libelle: 'Confirmation de l’activité',
        depuis: 'Envoi de la notification', jusqua: 'Dates confirmées par le prestataire',
        aide: 'Jours pour confirmer l’activité après transmission au prestataire.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'accuse_reception', libelle: 'Accusé de réception',
        depuis: 'Envoi de la notification', jusqua: 'Réception accusée par le prestataire',
        aide: 'Jours pour que le prestataire accuse réception de la notification.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'redaction_rapport', libelle: 'Soumission du projet de rapport',
        depuis: 'Fin de l’activité', jusqua: 'Rapport soumis',
        aide: 'Jours après la fin de l’activité pour soumettre le rapport.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'validation_rapport', libelle: 'Validation du rapport',
        depuis: 'Soumission du rapport', jusqua: 'Rapport validé',
        aide: 'Jours pour valider un rapport soumis.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'transmission_rapport', libelle: 'Transmission du rapport',
        depuis: 'Validation du rapport', jusqua: 'Rapport transmis au prestataire',
        aide: 'Jours pour transmettre au prestataire un rapport validé.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'cloture_dossier', libelle: 'Clôture du dossier',
        depuis: 'Transmission du rapport', jusqua: 'Dossier clôturé',
        aide: 'Jours après la transmission du rapport pour clôturer le dossier d’activité.',
        unite: 'jours', ou: 'États → En cours' },
      { cle: 'archivage_apres_cloture', libelle: 'Archivage du dossier clôturé',
        depuis: 'Clôture du dossier', jusqua: 'Dossier archivé',
        aide: 'Jours après la clôture du dossier au terme desquels l’archivage est attendu.',
        unite: 'jours', ou: 'États → Clôturées' },
    ],
  },
  {
    cle: 'constatation',
    titre: 'Processus Constatation',
    aide: 'Circuit d’une constatation, de sa préparation à sa remise au prestataire.',
    delais: [
      { cle: 'soumission_constatation', libelle: 'Soumission de la constatation',
        depuis: 'Ouverture de la constatation', jusqua: 'Constatation soumise',
        aide: 'Jours pour soumettre à validation une constatation en préparation.',
        unite: 'jours', ou: 'Cloche des alertes' },
      { cle: 'validation_constatation', libelle: 'Validation de la constatation',
        depuis: 'Soumission de la constatation', jusqua: 'Constatation validée, renvoyée ou rejetée',
        aide: 'Jours pour statuer sur une constatation soumise.',
        unite: 'jours', ou: 'Cloche des alertes' },
      { cle: 'correction_constatation', libelle: 'Correction après renvoi',
        depuis: 'Renvoi de la constatation', jusqua: 'Constatation soumise à nouveau',
        aide: 'Jours pour corriger et resoumettre une constatation renvoyée.',
        unite: 'jours', ou: 'Cloche des alertes' },
      { cle: 'transmission_constatation', libelle: 'Transmission de la constatation',
        depuis: 'Validation de la constatation', jusqua: 'Constatation transmise au prestataire',
        aide: 'Jours pour transmettre au prestataire une constatation validée.',
        unite: 'jours', ou: 'Cloche des alertes' },
    ],
  },
  {
    cle: 'pac',
    titre: 'Plan d’actions correctives',
    aide: 'Réponse du prestataire à une constatation ouverte, et son solde.',
    delais: [
      { cle: 'soumission_pac', libelle: 'Soumission du PAC',
        depuis: 'Transmission de la constatation', jusqua: 'PAC soumis par le prestataire',
        aide: 'Jours laissés au prestataire pour soumettre son plan d’actions.',
        unite: 'jours', ou: 'Cloche des alertes' },
      { cle: 'acceptation_pac', libelle: 'Acceptation du PAC',
        depuis: 'Soumission du PAC', jusqua: 'PAC accepté ou rejeté',
        aide: 'Jours pour statuer sur un plan d’actions soumis.',
        unite: 'jours', ou: 'Cloche des alertes' },
      { cle: 'correction_pac', libelle: 'Correction du PAC rejeté',
        depuis: 'Rejet du PAC', jusqua: 'PAC soumis à nouveau',
        aide: 'Jours pour reprendre et resoumettre un plan d’actions rejeté.',
        unite: 'jours', ou: 'Cloche des alertes' },
      { cle: 'verification_cloture', libelle: 'Vérification et clôture',
        depuis: 'Échéance de solde de la constatation', jusqua: 'Constatation soldée',
        aide: 'Jours après l’échéance de solde pour vérifier les actions et clôturer.',
        unite: 'jours', ou: 'Cloche des alertes' },
    ],
  },
  {
    cle: 'surveillance',
    titre: 'Réglages de surveillance',
    aide: 'Ce que les écrans montrent, et à partir de quand ils alertent.',
    delais: [
      { cle: 'horizon_a_declencher', libelle: 'Horizon « à déclencher »',
        depuis: 'Aujourd’hui', jusqua: 'Dernière activité listée',
        aide: 'Mois à venir pris en compte dans la liste des activités à déclencher.',
        unite: 'mois', ou: 'États → À déclencher' },
      { cle: 'seuil_vigilance', libelle: 'Seuil de vigilance',
        depuis: 'Échéance de l’étape', jusqua: 'Badge orange',
        aide: 'Jours restants en deçà desquels une échéance passe en vigilance.',
        unite: 'jours', ou: 'Tous les badges de délai' },
      { cle: 'seuil_urgence', libelle: 'Seuil d’urgence',
        depuis: 'Échéance de l’étape', jusqua: 'Badge rouge',
        aide: 'Jours restants en deçà desquels une échéance passe en urgence.',
        unite: 'jours', ou: 'Tous les badges de délai' },
    ],
  },
];

// Attentes du module dont la durée ne se règle pas ici : le relevé serait
// trompeur s'il les passait sous silence.
const EXEC_ETATS_DELAIS_AILLEURS = [
  { libelle: 'Délai de solde d’une constatation',
    depuis: 'Ouverture de la constatation', jusqua: 'Échéance de solde',
    source: 'Paramètres → Criticité (colonne « Délai de clôture »)' },
  { libelle: 'Échéance d’une action corrective',
    depuis: 'Acceptation du PAC', jusqua: 'Action réalisée',
    source: 'Saisie action par action dans le PAC' },
];

// Liste à plat : la lecture et l'enregistrement travaillent clé par clé.
const EXEC_ETATS_DELAIS_DESCRIPTION = EXEC_ETATS_DELAIS_GROUPES
  .reduce((acc, g) => acc.concat(g.delais), []);

const EXEC_ETATS = { sub: 'a_declencher', delais: { ...EXEC_ETATS_DELAIS_DEFAUT }, ouvertes: {} };

// Arrêter ou archiver une activité relève de l'administration du parc : les
// rôles portail SUPERADMIN et ADMIN AAC seuls, dans leur portée (le serveur
// vérifie le domaine et le secteur).
const execEtatsPeutAdministrer = () => _execAdministreParc();
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

// Badge de délai : « J-5 », « Aujourd’hui », « 3 j de retard ». Les deux
// seuils viennent des paramètres : ce qui est urgent pour une autorité ne
// l'est pas pour une autre.
function execEtatsBadgeDelai(jours) {
  if (jours === null || jours === undefined) return '<span class="exec-delai">—</span>';
  if (jours < 0) return `<span class="exec-delai retard">${Math.abs(jours)} j de retard</span>`;
  if (jours === 0) return '<span class="exec-delai urgent">Aujourd’hui</span>';
  const D = EXEC_ETATS.delais || EXEC_ETATS_DELAIS_DEFAUT;
  const urgence = D.seuil_urgence || EXEC_ETATS_DELAIS_DEFAUT.seuil_urgence;
  const vigilance = D.seuil_vigilance || EXEC_ETATS_DELAIS_DEFAUT.seuil_vigilance;
  const classe = jours <= urgence ? 'urgent' : (jours <= vigilance ? 'proche' : '');
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
  const ajouterPlan = (plan, planArchive) => {
    (plan.activites || []).forEach((a) => {
      // La lignée fait foi : une activité déclenchée sous une version
      // précédente du plan garde son processus dans celle qui la reprend.
      const notif = execNotifDeActivite(a, notifs);
      const dossier = notif ? dossiers.find((d) => d.notification_id === notif.id) || null : null;
      lignes.push({
        planId: plan.id, activiteId: a.id, horsPlan: false,
        planNom: plan.titre || plan.reference || '',
        planArchive, planArchiveLe: planArchive ? (plan.archiver_le || '') : '',
        objet: a.objet || a.description || '',
        prestataire: a.prestataire_nom || '',
        debut: a.date_debut || '', fin: a.date_fin || '',
        responsable_id: a.responsable_id || '',
        responsable: nomResp(a.responsable_id) || '',
        notif, dossier,
        rapports: dossier ? rapports.filter((r) => r.dossier_id === dossier.id) : [],
      });
    });
  };
  plans.forEach((plan) => ajouterPlan(plan, false));
  // Les activités d'un plan archivé restent consultables : elles ne sortent
  // des états courants que pour rejoindre l'onglet des archives.
  (EXEC_STATE.data.plansArchivesPlanif || []).forEach((plan) => ajouterPlan(plan, true));
  // Activités hors plan : la notification en tient lieu.
  notifs.filter((n) => n.hors_plan).forEach((n) => {
    const dossier = dossiers.find((d) => d.notification_id === n.id) || null;
    lignes.push({
      planId: 'hors-plan', activiteId: n.id, horsPlan: true,
      planNom: 'Autres Activités',
      planArchiveLe: Number(n.archive) === 1 ? (n.date_archivage || '') : '',
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

// ── Avancement global d'une activité ──
// Le fil du processus compte une dizaine d'étapes ; quatre niveaux suffisent à
// dire où en est une activité, et ce sont eux que lisent le tableau de bord,
// la table des activités et le calendrier :
//   — « Non Initiée » tant que rien n'est déclenché ;
//   — « Initiée » du déclenchement à la confirmation des dates ;
//   — « En Réalisation » de la confirmation à la validation du rapport ;
//   — « Réalisée » dès la transmission du rapport.
const EXEC_AVANCEMENTS = ['non_initiee', 'initiee', 'en_realisation', 'realisee'];
const EXEC_AVANCEMENT_COULEURS = {
  non_initiee: '#64748b', initiee: '#2563eb', en_realisation: '#f59e0b', realisee: '#16a34a',
};

function execAvancement(notif, dossier) {
  if (!notif) return 'non_initiee';
  const d = dossier || null;
  const rapports = d
    ? (d.rapports || (EXEC_STATE.data.rapports || []).filter((r) => r.dossier_id === d.id))
    : [];
  if (rapports.some((r) => r.statut === 'transmis')) return 'realisee';
  // La confirmation des dates par l'organisme acte la notification : c'est
  // elle qui ouvre la réalisation.
  if (notif.statut === 'acte') return 'en_realisation';
  return 'initiee';
}

window.execAvancementBadge = function (notif, dossier) {
  const cle = execAvancement(notif, dossier);
  const couleur = EXEC_AVANCEMENT_COULEURS[cle];
  return `<span class="exec-avancement" style="color:${couleur};border-color:${couleur}55;background:${couleur}14;">${
    _esc(te('avancement_' + cle))}</span>`;
};

// ── Répartition des lignes par état ──
function execEtatsRepartir() {
  const D = EXEC_ETATS.delais;
  const lignes = execEtatsLignes();
  const horizon = new Date(execEtatsJour());
  horizon.setMonth(horizon.getMonth() + (D.horizon_a_declencher || 3));

  const aDeclencher = lignes
    .filter((l) => !l.notif && !l.horsPlan && !l.planArchive)
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
    rapport: [], validation_rapport: [], transmission: [], cloture: [],
  };
  lignes.forEach((l) => {
    const n = l.notif;
    if (!n || l.planArchive || Number(n.archive) === 1) return;
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
      // Deux attentes se superposent après l'envoi : l'accusé de réception,
      // puis la confirmation des dates. C'est la plus proche qui commande —
      // sinon un accusé oublié ne se verrait qu'au terme de la confirmation.
      const echeances = [
        execEtatsPlus(n.date_envoi, D.confirmation_prestataire),
        Number(n.accuse_reception) === 1 ? null : execEtatsPlus(n.date_envoi, D.accuse_reception),
      ].map(execEtatsJoursRestants).filter((j) => j !== null);
      enCours.confirmation.push({
        ...l,
        jours: echeances.length ? Math.min(...echeances) : null,
        attenteAccuse: Number(n.accuse_reception) !== 1,
      });
    } else if (d) {
      const fin = n.date_fin_effective || l.fin;
      if (transmis.length) {
        // Rapport transmis, dossier encore ouvert : reste la clôture, qui a
        // désormais son propre délai plutôt que de disparaître des états.
        enCours.cloture.push({
          ...l,
          jours: execEtatsJoursRestants(execEtatsPlus(transmis[0].date_transmission, D.cloture_dossier)),
        });
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
  // Archiver le plan archive tout ce qu'il porte : une activité l'est aussi
  // par son plan, même si elle n'a jamais été déclenchée.
  const archivee = (l) => l.planArchive
    || Number((l.notif || {}).archive) === 1
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
    // Tout ce qui porte la marque d'archivage y figure, quel qu'ait été son
    // sort : une activité rangée avec son plan — ou avec le lot « Autres
    // Activités » — n'a pas eu à être clôturée pour l'être.
    archivees: lignes.filter((l) => archivee(l)),
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
      <td>${l.limite ? _formatDate(oasisJour(l.limite)) : '—'}</td>
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
      <h3>${te('activites_a_notifier')} <span class="exec-etats-compte">${R.aDeclencher.length}</span></h3>
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
      ], lignes, te('etats_vide_a_declencher'))}
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
  { cle: 'cloture', titre: 'Dossiers en attente de clôture', echeance: 'À clôturer avant' },
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
          <button class="btn btn-sm btn-outline" onclick="execEtatsRappel('${l.planId}','${l.activiteId}','${_escAttr(s.titre)}')">
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
          ? `<span class="exec-statut-etape arrete" title="${_escAttr(n.motif_arret || '')}">${te('arrete_badge')}</span>`
          : etape}</td>
        <td class="exec-etats-actions">
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="${execEtatsOuvrir(l)}"
            title="${te('consulter_processus')}" aria-label="${te('consulter_processus')}">${EXEC_ICONS.eye || ''}</button>
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="execProcHistorique('${l.planId}','${l.activiteId}')"
            title="${te('historique')}" aria-label="${te('historique')}">${EXEC_ICONS.clock || ''}</button>
          ${administre ? (l.arretee
            ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="execEtatsReprendre('${n.id}')"
                 title="${te('reprendre_processus')}" aria-label="${te('reprendre_processus')}">${EXEC_ICONS.refresh || EXEC_ICONS.back || ''}</button>
               <button class="btn btn-sm btn-primary btn-icon-only" onclick="execEtatsArchiverActivite('${n.id}',true)"
                 title="${te('archiver_activite')}" aria-label="${te('archiver_activite')}">${EXEC_ICONS.folder || ''}</button>`
            : `<button class="btn btn-sm btn-icon-only exec-btn-rejet" onclick="execEtatsArreter('${n.id}')"
                 title="${te('arreter_processus')}" aria-label="${te('arreter_processus')}">${EXEC_ICONS.close || '✕'}</button>`) : ''}
          ${superadmin ? `<button class="btn btn-sm btn-icon-only exec-btn-rejet" onclick="execEtatsSupprimer('${n.id}')"
            title="${te('supprimer_activite_btn')}" aria-label="${te('supprimer_activite_btn')}">${EXEC_ICONS.delete || EXEC_ICONS.trash || '🗑'}</button>` : ''}
        </td>
      </tr>`;
  }).join('');
  const arretees = R.enVie.filter((l) => l.arretee).length;
  return `
    <div class="card">
      <h3>${te('activites_en_cours_titre')}
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
      ], lignes, te('etats_vide_en_cours'))}
    </div>`;
}

// ── Onglets 4 et 5 : clôturées, archivées ──
function execEtatsPanClos(items, archivees) {
  const ligneDe = (l) => {
    // Une activité archivée par son plan peut n'avoir jamais été déclenchée :
    // ni dossier, ni rapport, ni date de clôture à afficher.
    const d = l.dossier || null;
    const rapport = (l.rapports || []).find((r) => r.statut === 'transmis') || (l.rapports || [])[0];
    const dateArchivage = l.planArchive ? l.planArchiveLe : (d && d.date_archivage);
    const dateCloture = d ? (d.date_fin_execution || d.date_maj) : '';
    return `
      <tr class="exec-act-row"${d ? ' style="cursor:pointer;"' : ''}
          ${d ? `onclick="if(!event.target.closest('button'))${execEtatsOuvrir(l)}"` : ''}>
        <td>${_esc(l.prestataire || '—')}</td>
        <td>${_esc(l.objet || '—')}</td>
        <td>${_formatDate(l.debut)} → ${_formatDate(l.fin)}</td>
        <td>${d ? _esc(d.reference || '') : '<span style="color:var(--text-muted);">' + te('non_declenchee') + '</span>'}</td>
        <td>${rapport ? _esc(rapport.reference || '') : '—'}</td>
        <td>${dateArchivage || dateCloture ? _formatDate(archivees ? dateArchivage : dateCloture) : '—'}</td>
        ${archivees ? '' : `<td>${execEtatsBadgeDelai(execEtatsJoursRestants(
          execEtatsPlus(dateCloture, EXEC_ETATS.delais.archivage_apres_cloture)))}</td>`}
        <td class="exec-etats-actions">
          ${d ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="${execEtatsOuvrir(l)}"
            title="${te('consulter_dossier')}" aria-label="${te('consulter_dossier')}">${EXEC_ICONS.eye || ''}</button>` : ''}
          ${rapport ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="execPreviewRapport('${rapport.id}')"
            title="${te('rapport_col')}" aria-label="${te('rapport_col')}">${EXEC_ICONS.rapports || ''}</button>` : ''}
          <button class="btn btn-sm btn-outline btn-icon-only" onclick="execProcHistorique('${l.planId}','${l.activiteId}')"
            title="${te('historique')}" aria-label="${te('historique')}">${EXEC_ICONS.clock || ''}</button>
          ${(execEtatsPeutAdministrer() && d && !l.planArchive) ? `<button class="btn btn-sm btn-icon-only ${archivees ? 'btn-outline' : 'btn-primary'}"
            onclick="execEtatsArchiver('${d.id}',${archivees ? 'false' : 'true'})"
            title="${archivees ? 'Désarchiver' : 'Archiver'}" aria-label="${archivees ? 'Désarchiver' : 'Archiver'}">
            ${(archivees ? EXEC_ICONS.back : EXEC_ICONS.folder) || ''}</button>` : ''}
          ${(archivees && execEtatsPeutAdministrer() && (l.planArchive || (!d && l.notif))) ? `<button class="btn btn-sm btn-outline btn-icon-only"
            onclick="execEtatsDesarchiverActivite('${l.activiteId}',${l.planArchive ? 'true' : 'false'})"
            title="${te('desarchiver_activite')}" aria-label="${te('desarchiver_activite')}">
            ${EXEC_ICONS.back || ''}</button>` : ''}
        </td>
      </tr>`;
  };

  const colonnes = [
    // Huit colonnes : l'objet cède la place pour que la consultation reste
    // visible sans faire défiler la table.
    { titre: 'Prestataire', largeur: '150px' }, { titre: 'Objet', largeur: '190px' },
    { titre: 'Période', largeur: '160px' }, { titre: 'Dossier', largeur: '120px' },
    { titre: 'Rapport', largeur: '120px' },
    { titre: archivees ? 'Archivé le' : 'Clôturé le', largeur: '95px' },
    ...(archivees ? [] : [{ titre: 'À archiver avant', largeur: '110px' }]),
    { titre: 'Consultation', largeur: '150px', centre: true },
  ];
  const intro = archivees
    ? 'Activités archivées, une à une ou avec leur plan de surveillance. Les pièces '
      + 'produites restent consultables ; les constatations qui en sont issues '
      + 'poursuivent leur suivi et ne sont pas archivées.'
    : `Dossiers clôturés non encore archivés : l'archivage est attendu dans les `
      + `${EXEC_ETATS.delais.archivage_apres_cloture} jours suivant la clôture. `
      + `Les constatations issues de l'activité poursuivent leur suivi et ne sont pas archivées.`;

  // Les archives se lisent par plan : une activité rangée se retrouve par le
  // plan qui la portait, « Autres Activités » tenant lieu de plan pour celles
  // qui n'en avaient pas.
  let corps;
  if (archivees) {
    const groupes = new Map();
    items.forEach((l) => {
      const cle = l.planId || 'hors-plan';
      if (!groupes.has(cle)) {
        groupes.set(cle, { nom: l.planNom || (l.horsPlan ? 'Autres Activités' : '—'), lignes: [], le: '' });
      }
      const g = groupes.get(cle);
      g.lignes.push(l);
      // Deux plans peuvent porter le même intitulé : la date d'archivage les
      // distingue, et dit quand le lot a été rangé.
      const le = l.planArchiveLe || (l.dossier || {}).date_archivage || '';
      if (le && (!g.le || le > g.le)) g.le = le;
    });
    // « Autres Activités » ferme la marche : les plans d'abord, par nom.
    const ordre = [...groupes.entries()].sort((a, b) => {
      if (a[0] === 'hors-plan') return 1;
      if (b[0] === 'hors-plan') return -1;
      return a[1].nom.localeCompare(b[1].nom);
    });
    // Chaque plan se replie : les archives s'accumulent, on n'ouvre que le lot
    // qu'on vient consulter. Le premier groupe reste déplié.
    corps = ordre.length
      ? ordre.map(([cle, g], i) => {
        const parPlan = cle !== 'hors-plan' && g.lignes.some((l) => l.planArchive);
        return `
        <div class="exec-etats-groupe${i === 0 ? ' ouvert' : ''}">
          <h4 class="exec-etats-groupe-titre" onclick="execEtatsGroupeToggle(this)">
            <span class="exec-etats-groupe-chevron">${EXEC_ICONS.chevronDown || '▾'}</span>
            ${cle === 'hors-plan' ? (EXEC_ICONS.trigger || '') : (EXEC_ICONS.plans || '')}
            <span>${_esc(g.nom)}</span>
            <span class="exec-etats-compte">${g.lignes.length}</span>
            ${g.le ? `<span class="exec-etats-groupe-date">archivé le ${_formatDate(g.le)}</span>` : ''}
            ${(parPlan && execEtatsPeutAdministrer()) ? `<button class="btn btn-sm btn-outline exec-etats-desarchiver"
              onclick="event.stopPropagation();execEtatsDesarchiverPlan('${cle}')"
              title="${te('sortir_des_archives')}">
              ${EXEC_ICONS.back || ''} Désarchiver le plan</button>` : ''}
          </h4>
          <div class="exec-etats-groupe-corps">
            ${execEtatsTableau(colonnes, g.lignes.map(ligneDe).join(''), te('etats_vide_archivees'))}
          </div>
        </div>`;
      }).join('')
      : execEtatsTableau(colonnes, '', te('etats_vide_archivees'));
  } else {
    corps = execEtatsTableau(colonnes, items.map(ligneDe).join(''),
      te('etats_vide_a_archiver'));
  }

  return `
    <div class="card">
      <h3>${archivees ? 'Activités archivées' : 'Activités clôturées'}
        <span class="exec-etats-compte">${items.length}</span></h3>
      <p class="exec-etats-intro">${intro}</p>
      ${corps}
    </div>`;
}

function execRenderEtats() {
  const R = execEtatsRepartir();
  const retards = Object.values(R.enCours)
    .reduce((n, x) => n + x.filter((l) => l.jours !== null && l.jours < 0).length, 0)
    + R.aDeclencher.filter((l) => l.jours !== null && l.jours < 0).length;

  // Barre des sous-menus : les intitulés seuls. Chaque panneau redonne son
  // compte en tête de section, où il se lit à côté de ce qu'il dénombre ;
  // dans la barre, la pastille se glissait devant l'intitulé dès qu'un rang
  // se repliait.
  const onglets = [
    { cle: 'a_declencher', titre: 'Activités à déclencher' },
    { cle: 'en_vie', titre: 'Activités en cours' },
    { cle: 'en_cours', titre: 'Actions en attentes' },
    { cle: 'cloturees', titre: 'Activités clôturées' },
    { cle: 'archivees', titre: 'Activités archivées' },
  ];
  const barre = `<div class="exec-workflow-tabs exec-tabs-serrees">
    <div class="exec-tabs-rang">${onglets.map((o) => `
    <button class="exec-tab ${EXEC_ETATS.sub === o.cle ? 'active' : ''}"
      onclick="EXEC_ETATS.sub='${o.cle}';execRenderPage();">
      ${_esc(o.titre)}
    </button>`).join('')}</div>
  </div>`;

  let corps = '';
  if (EXEC_ETATS.sub === 'en_vie') corps = execEtatsPanEn_vie(R);
  else if (EXEC_ETATS.sub === 'en_cours') corps = execEtatsPanEn_cours(R);
  else if (EXEC_ETATS.sub === 'cloturees') corps = execEtatsPanClos(R.cloturees, false);
  else if (EXEC_ETATS.sub === 'archivees') corps = execEtatsPanClos(R.archivees, true);
  else corps = execEtatsPanA_declencher(R);

  return `
    <div class="page-content exec-etats">
      <div class="page-header">
        <h2>${te('etats_titre')}</h2>
        ${retards ? `<span class="exec-etats-alerte">${retards} action${retards > 1 ? 's' : ''} en retard</span>` : ''}
      </div>
      ${barre}
      ${corps}
    </div>`;
}

// ══════════════════════════════════════
//  Actions
// ══════════════════════════════════════
// L'étape en cours d'une ligne d'état : c'est elle qui dit qui est attendu.
const execEtatsEtapeCourante = (l) => {
  const n = l.notif;
  const d = l.dossier;
  if (!n) return 'notification:soumission';
  if (n.statut === 'soumis') return 'notification:validation';
  if (n.statut === 'valide') return 'notification:transmission';
  if (n.statut === 'envoye') return 'confirmation';
  if (!d) return 'confirmation';
  const transmis = (l.rapports || []).some((r) => r.statut === 'transmis');
  const valides = (l.rapports || []).some((r) => r.statut === 'valide');
  const soumis = (l.rapports || []).some((r) => r.statut === 'soumis');
  if (transmis) return 'transmission';
  if (valides) return 'transmission';
  if (soumis) return 'validation';
  return 'realisation';
};

// Libellés des clés d'étape du menu Processus, pour le seul affichage.
const EXEC_ETATS_ETAPE_LIBELLE = {
  'notification:soumission': 'Notification — Soumission',
  'notification:validation': 'Notification — Validation',
  'notification:transmission': 'Notification — Transmission',
  confirmation: 'Confirmation',
  realisation: 'Réalisation',
  validation: 'Validation du rapport',
  transmission: 'Transmission du rapport',
};

window.execEtatsRappel = async function (planId, activiteId, motif) {
  const l = execEtatsLignes().find((x) => x.planId === planId && x.activiteId === activiteId);
  if (!l) return;
  const inspecteurs = EXEC_STATE.data.inspecteurs || [];
  // Le rappel s'adresse d'abord aux intervenants que le processus désigne
  // pour l'étape en cours ; le responsable de l'activité ne prend le relais
  // que si aucun processus ne s'applique. Un rappel envoyé à qui n'a pas la
  // main ne fait pas avancer le circuit.
  const etape = execEtatsEtapeCourante(l);
  let attendus = [];
  if (l.notif) {
    try {
      const r = await api(`${EXEC_MODULE_API}/processus/attendus`
        + `?notification_id=${encodeURIComponent(l.notif.id)}`
        + `&etape=${encodeURIComponent(etape)}`);
      if (r && r.declare) {
        const comptes = new Set(r.comptes || []);
        // Le serveur rend `user_id || email` : on rapproche sur les deux.
        attendus = inspecteurs.filter((u) => comptes.has(u.user_id) || comptes.has(u.email));
      }
    } catch (e) { /* sans processus applicable, le responsable suffit */ }
  }
  const vises = attendus.length ? attendus.map((u) => u.id) : [l.responsable_id];
  const options = inspecteurs.map((u) => {
    const nom = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.nom || u.id;
    const designe = attendus.some((x) => x.id === u.id);
    return `<option value="${_escAttr(u.email || u.id)}" ${u.id === vises[0] ? 'selected' : ''}>`
      + `${_esc(nom)}${u.email ? ` — ${_esc(u.email)}` : ''}${designe ? ' · désigné au processus' : ''}</option>`;
  }).join('');
  const texte = `Rappel : l'activité « ${l.objet} » (${l.prestataire}) prévue du `
    + `${_formatDate(l.debut)} au ${_formatDate(l.fin)} appelle une action de votre part`
    + `${motif ? ` — ${motif}` : ''}.`;

  const note = attendus.length
    ? te('rappel_etape_en_cours', `<strong>${_esc(EXEC_ETATS_ETAPE_LIBELLE[etape] || etape)}</strong>`)
    : te('rappel_sans_processus');

  const corps = `
    <div class="exec-proc-bloc">
      <p class="exec-proc-note">${note}</p>
      <label class="form-label">Destinataire</label>
      <select class="form-control" id="rappel_dest">
        ${options || `<option value="">${te('aucun_inspecteur_enregistre')}</option>`}
      </select>
      <label class="form-label">Message</label>
      <textarea class="form-control" id="rappel_msg" rows="5">${_esc(texte)}</textarea>
      <p class="exec-proc-erreur" id="rappel_erreur"></p>
    </div>`;
  const pied = `
    <button class="btn btn-outline" onclick="execCloseSlider()">Annuler</button>
    <button class="btn btn-primary" onclick="execEtatsEnvoyerRappel('${planId}','${activiteId}','${_escAttr(motif || '')}')">
      ${EXEC_ICONS.send || ''} Envoyer le rappel
    </button>`;
  execShowSlider(
    `${EXEC_ICONS.bell || ''} Rappel — ${_esc(EXEC_ETATS_ETAPE_LIBELLE[etape] || etape)}`,
    corps, pied, 'md',
  );
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
    _execToast(te('rappel_envoye', r.destinataire), 'success');
  } catch (e) {
    erreur.textContent = (e && e.message) || te('envoi_impossible');
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
    _execToast(te('processus_arrete'), 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || te('arret_impossible'), 'error'); }
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
    _execToast(te('processus_repris'), 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || te('reprise_impossible'), 'error'); }
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
    _execToast(archiver ? te('activite_archivee') : te('activite_desarchivee'), 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || te('action_impossible'), 'error'); }
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
    _execToast(te('reference_non_conforme'), 'error');
    return;
  }
  try {
    await api(`${EXEC_MODULE_API}/activites-en-cours/${notifId}`, { method: 'DELETE' });
    await execRefreshDynamic();
    _execToast(te('activite_supprimee'), 'success');
    execRenderPage();
  } catch (e) { _execToast((e && e.message) || te('suppression_impossible'), 'error'); }
};

// Un lot d'archives se replie : on n'ouvre que le plan qu'on vient consulter.
window.execEtatsGroupeToggle = function (titre) {
  titre.closest('.exec-etats-groupe')?.classList.toggle('ouvert');
};

// Sortie des archives d'un plan entier : il redevient un plan validé et ses
// activités reprennent leur place dans les états courants.
window.execEtatsDesarchiverPlan = async function (planId) {
  const ok = await execProcConfirmer({
    titre: 'Sortir le plan des archives',
    message: 'Le plan revient parmi les plans de surveillance validés, avec toutes ses activités. '
      + 'Elles réapparaissent dans « Activités de Supervision » et dans les états courants.',
    libelle: 'Désarchiver',
  });
  if (!ok) return;
  try {
    await api(`/api/m/planification/plans/${planId}/desarchiver`, { method: 'POST', body: JSON.stringify({}) });
    await execLoadData();
    _execToast(te('plan_desarchive'), 'success');
    execRenderPage();
  } catch (e) {
    _execToast((e && e.message) || te('action_impossible'), 'error');
  }
};

// Désarchivage d'une activité prise isolément. Deux origines possibles, donc
// deux chemins : archivée avec son plan, l'exception se pose sur l'activité
// dans la Planification ; archivée seule, c'est sa notification qui porte la
// marque et le module la lève lui-même.
window.execEtatsDesarchiverActivite = async function (activiteId, parLePlan) {
  const ok = await execProcConfirmer({
    titre: 'Sortir l’activité des archives',
    message: parLePlan
      ? 'Le plan reste archivé ; cette activité seule revient parmi les activités en cours. '
        + 'Elle réapparaît dans « Activités de Supervision », sous son plan d’origine.'
      : 'L’activité revient parmi les activités en cours.',
    libelle: 'Désarchiver',
  });
  if (!ok) return;
  try {
    if (parLePlan) {
      await api(`/api/m/planification/activites/${activiteId}/desarchiver`, { method: 'PUT', body: JSON.stringify({}) });
      await execLoadData();
    } else {
      await api(`${EXEC_MODULE_API}/activites-en-cours/${activiteId}/desarchiver`, { method: 'PUT' });
      await execRefreshDynamic();
    }
    _execToast(te('activite_desarchivee'), 'success');
    execRenderPage();
  } catch (e) {
    _execToast((e && e.message) || te('action_impossible'), 'error');
  }
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
    _execToast(archiver ? te('dossier_archive') : te('dossier_desarchive'), 'success');
    execRenderPage();
  } catch (e) {
    _execToast((e && e.message) || te('action_impossible'), 'error');
  }
};

// ══════════════════════════════════════
//  Paramètres : onglet « Délais »
// ══════════════════════════════════════
function execRenderDelaisTab() {
  const D = EXEC_ETATS.delais;
  const modifiable = EXEC_ETATS.delaisModifiable !== false;

  const ligne = (d) => `
    <tr>
      <td>
        <div class="exec-delai-nom">${_esc(d.libelle)}</div>
        <div class="exec-delai-aide">${_esc(d.aide)}</div>
      </td>
      <td class="exec-delai-course">
        <span class="exec-delai-borne">${_esc(d.depuis)}</span>
        <span class="exec-delai-fleche">→</span>
        <span class="exec-delai-borne">${_esc(d.jusqua)}</span>
      </td>
      <td class="exec-delai-saisie">
        <input type="number" min="0" max="365" class="form-control exec-delai-champ"
          id="delai_${d.cle}" value="${_escAttr(D[d.cle])}" ${modifiable ? '' : 'disabled'}>
        <span class="exec-delai-unite">${_esc(d.unite)}</span>
      </td>
      <td class="exec-delai-ou">${_esc(d.ou)}</td>
    </tr>`;

  const groupes = EXEC_ETATS_DELAIS_GROUPES.map((g) => `
    <div class="exec-delai-groupe">
      <div class="exec-delai-groupe-entete">
        <h4>${_esc(g.titre)}</h4>
        <span>${_esc(g.aide)}</span>
      </div>
      <table class="exec-table exec-delais-table">
        <thead><tr>
          <th>Attente</th>
          <th style="width:32%;">${te('court_de_a')}</th>
          <th style="width:140px;">${te('delai_col')}</th>
          <th style="width:20%;">${te('signale_dans')}</th>
        </tr></thead>
        <tbody>${g.delais.map(ligne).join('')}</tbody>
      </table>
    </div>`).join('');

  const ailleurs = EXEC_ETATS_DELAIS_AILLEURS.map((a) => `
    <tr>
      <td><div class="exec-delai-nom">${_esc(a.libelle)}</div></td>
      <td class="exec-delai-course">
        <span class="exec-delai-borne">${_esc(a.depuis)}</span>
        <span class="exec-delai-fleche">→</span>
        <span class="exec-delai-borne">${_esc(a.jusqua)}</span>
      </td>
      <td colspan="2" class="exec-delai-ou">${_esc(a.source)}</td>
    </tr>`).join('');

  return `
    <div class="card">
      <h3>${te('delais_processus')}</h3>
      <p class="exec-etats-intro">
        Relevé des attentes des processus « Activité » et « Constatation ». Chaque ligne
        court d'une date enregistrée jusqu'à l'événement attendu. Ces délais n'empêchent
        aucune action : ils déterminent à partir de quand une étape est signalée en retard.
      </p>
      ${groupes}
      <div class="exec-delai-groupe">
        <div class="exec-delai-groupe-entete">
          <h4>${te('regles_ailleurs')}</h4>
          <span>${te('deux_attentes_ailleurs')}</span>
        </div>
        <table class="exec-table exec-delais-table"><tbody>${ailleurs}</tbody></table>
      </div>
      ${modifiable ? `<div style="margin-top:0.9rem;display:flex;gap:0.5rem;">
        <button class="btn btn-primary btn-sm" onclick="execEtatsEnregistrerDelais()">
          ${EXEC_ICONS.check || ''} Enregistrer
        </button>
        <button class="btn btn-outline btn-sm" onclick="execEtatsDelaisDefaut()">
          ${EXEC_ICONS.reset || ''} Valeurs par défaut
        </button>
      </div>` : '<p class="exec-etats-intro">' + te('delais_admin_seul') + '</p>'}
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
    _execToast(te('delais_enregistres'), 'success');
  } catch (e) {
    _execToast((e && e.message) || te('enregistrement_impossible'), 'error');
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
          value="${_escAttr(s.valeur || '')}" ${off}
          oninput="execRefsSaisir('${objet}',${index},'valeur',this)">` : ''}
        ${meta.longueur ? `<input type="number" class="form-control" min="1" max="8" title="${te('nombre_chiffres')}"
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
    return '<div class="card"><p class="exec-etats-intro">' + te('chargement_parametres') + '</p></div>';
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
            <span></span><span>${te('element_col')}</span><span>Valeur</span><span>Rendu</span><span></span>
          </div>
          <div class="exec-ref-segments">
            ${segments.map((s, i) => execRefsLigneSegment(o.cle, i, s, segments.length)).join('')}
          </div>
          <div class="exec-ref-pied">
            <button class="btn btn-sm btn-outline" ${off} onclick="execRefsAjouter('${o.cle}')">
              ${EXEC_ICONS.add || '+'} Ajouter un élément
            </button>
            <label class="exec-ref-sep">${te('separateur_col')}
              <input type="text" class="form-control" maxlength="3" value="${_escAttr(m.separateur === undefined ? '-' : m.separateur)}"
                ${off} oninput="execRefsMajSeparateur('${o.cle}',this.value)">
            </label>
            <span class="exec-ref-total">${segments.length} élément${segments.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </details>`;
  }).join('');

  return `
    <div class="card">
      <h3>${te('composition_references')}</h3>
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
      <button class="btn btn-outline btn-sm" onclick="execRefsDefaut()">${te('compositions_defaut')}</button>
    </div>` : '<p class="exec-etats-intro">' + te('references_admin_seul') + '</p>'}
    ${execRenderRolesEquipeTab()}`;
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
    _execToast(te('composition_refs_enregistree'), 'success');
    execRenderPage();
  } catch (e) {
    _execToast((e && e.message) || te('enregistrement_impossible'), 'error');
  }
};

window.execRenderAutresParametresTab = execRenderAutresParametresTab;
window.execRefsCharger = execRefsCharger;
