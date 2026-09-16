// Fumée — module « Plans de Surveillance » : plans et activités, cycle de vie
// d'un plan (création → soumission → validation → amendement → annulation),
// synchronisation des risques et fil de discussion.
const { demarrer, verifier, bilan } = require('./harness');

// Ouvre une session sur un compte au privilège LECTEUR pour le secteur visé
// et tente les écritures : le serveur doit les refuser.
async function controlerLecteur(srv) {
  const identite = await srv.connexion('m.ahoyo@anac.bj');
  const moi = (await srv.appel('/api/me')).corps;
  const acces = (await srv.appel('/api/m/droits/PLAN/my-access')).corps;
  // Secteur hors de ses portées : privilège effectif LECTEUR
  const secteurLecteur = Object.entries(acces.secteurs || {})
    .find(([, priv]) => priv === 'LECTEUR');
  const secteurs = (await srv.appel('/api/secteurs')).corps;
  const sec = secteurLecteur ? secteurs.find((x) => x.id === secteurLecteur[0]) : null;

  const cible = (await srv.appel('/api/m/planification/plans')).corps
    .find((p) => p.statut === 'soumis') || { id: 'inexistant' };
  const creation = sec ? (await srv.appel('/api/m/planification/plans', {
    method: 'POST',
    body: JSON.stringify({ titre: 'interdit', annee: 2031, type: 'periodique', domaine_id: sec.domaine_id, secteur_id: sec.id }),
  })).statut : null;
  const validation = (await srv.appel(`/api/m/planification/plans/${cible.id}/valider`, {
    method: 'POST', body: JSON.stringify({ commentaire: '' }),
  })).statut;
  const lecture = (await srv.appel('/api/m/planification/plans')).statut;

  await srv.connexion();   // retour au compte d'administration
  return {
    connecte: !!identite && moi && moi.user && moi.user.username === 'm.ahoyo@anac.bj',
    privilegeBase: acces.privilege,
    secteurTeste: sec ? sec.code : null,
    creation, validation, lecture,
  };
}

module.exports = async function planificationSmoke(port) {
  console.log('\n── Module PLAN — Plans de Surveillance ──');
  const srv = await demarrer({ port });
  const P = (chemin, corps) => srv.appel(chemin, { method: 'POST', body: JSON.stringify(corps || {}) });
  try {
    await srv.connexion();

    const plans = await srv.appel('/api/m/planification/plans');
    verifier('liste des plans', plans.statut === 200 && Array.isArray(plans.corps));
    verifier('nombre d’activités joint à chaque plan',
      (plans.corps || []).every((p) => 'nb_activites' in p));

    const acts = await srv.appel('/api/m/planification/all-activites');
    verifier('activités enrichies du statut de leur plan',
      acts.statut === 200 && (acts.corps || []).every((a) => 'plan_statut' in a));

    const profils = await srv.appel('/api/m/planification/risk-profiles');
    verifier('profils de risque obtenus via le bus', profils.statut === 200 && Array.isArray(profils.corps));

    const prest = await srv.appel('/api/m/planification/prestataires-risques');
    verifier('prestataires et cycles', prest.statut === 200 && Array.isArray(prest.corps));
    verifier('dates de cycle par défaut renseignées',
      (prest.corps || []).every((p) => !p.csrbo || p.debut_cycle));

    // Une date de cycle saisie puis effacée rend la main à la date par défaut.
    const pc = (prest.corps || []).find(Boolean);
    if (pc) {
      const finDe = async () => ((await srv.appel('/api/m/planification/prestataires-risques')).corps || [])
        .find((x) => x && x.id === pc.id).fin_cycle;
      const cycle = (corps) => srv.appel(`/api/m/planification/prestataires/${pc.id}/cycle`,
        { method: 'PUT', body: JSON.stringify(corps) });
      const finAvant = await finDe();
      await cycle({ fin_cycle: '2099-01-01' });
      verifier('fin de cycle saisie', (await finDe()) === '2099-01-01');
      // Effacée, elle n'est plus la saisie : c'est la date calculée depuis le
      // profil de risque qui est servie.
      await cycle({ fin_cycle: '' });
      const finApres = await finDe();
      verifier('fin de cycle effacée', finApres !== '2099-01-01' && /^\d{4}-\d{2}-\d{2}$/.test(finApres || ''),
        `après « ${finApres} »`);
      await cycle({ fin_cycle: finAvant });
    }

    // ── Cycle de vie complet sur un plan jetable ──
    const secteur = (await srv.appel('/api/secteurs')).corps[0];
    const cree = await P('/api/m/planification/plans', {
      titre: 'Plan de fumée', annee: 2030, type: 'periodique',
      domaine_id: secteur.domaine_id, secteur_id: secteur.id,
    });
    verifier('création d’un plan', cree.statut === 200 && !!cree.corps.id);
    const id = cree.corps.id;

    const act = await P(`/api/m/planification/plans/${id}/activites`, {
      objet: 'Activité de fumée', date_debut: '2030-03-01', date_fin: '2030-03-05',
    });
    verifier('ajout d’une activité', act.statut === 200 && !!act.corps.id);

    // Vider un champ facultatif l'efface. Le validateur tenait une valeur vide
    // pour absente ; la modification fusionnant avec l'existant, l'ancienne
    // valeur revenait — un lieu ou une description ne s'effaçait jamais.
    const avecLieu = await srv.appel(`/api/m/planification/activites/${act.corps.id}`, {
      method: 'PUT', body: JSON.stringify({ objet: 'Activité de fumée', lieu_activite: 'Cotonou', description_activite: 'À effacer' }),
    });
    verifier('lieu et description enregistrés',
      avecLieu.statut === 200 && avecLieu.corps.lieu_activite === 'Cotonou' && avecLieu.corps.description_activite === 'À effacer');
    const vide = await srv.appel(`/api/m/planification/activites/${act.corps.id}`, {
      method: 'PUT', body: JSON.stringify({ objet: 'Activité de fumée', lieu_activite: '', description_activite: '' }),
    });
    verifier('lieu et description effacés',
      vide.statut === 200 && !vide.corps.lieu_activite && !vide.corps.description_activite,
      `lieu « ${vide.corps && vide.corps.lieu_activite} » · description « ${vide.corps && vide.corps.description_activite} »`);
    verifier('champ requis vide toujours refusé',
      (await srv.appel(`/api/m/planification/plans/${id}`, { method: 'PUT', body: JSON.stringify({ titre: '' }) })).statut === 400);

    const detail = await srv.appel(`/api/m/planification/plans/${id}`);
    verifier('détail du plan avec ses activités',
      detail.statut === 200 && (detail.corps.activites || []).length === 1);

    await P(`/api/m/planification/plans/${id}/soumettre`, { commentaire: '' });
    verifier('soumission', (await srv.appel(`/api/m/planification/plans/${id}`)).corps.statut === 'soumis');

    await P(`/api/m/planification/plans/${id}/rejeter`, { commentaire: 'motif de fumée' });
    const rejete = (await srv.appel(`/api/m/planification/plans/${id}`)).corps;
    verifier('rejet : plan de nouveau modifiable', rejete.statut === 'rejete');
    verifier('motif du rejet conservé', rejete.commentaire_rejet === 'motif de fumée');

    const fil = await srv.appel(`/api/m/planification/plans/${id}/commentaires`);
    verifier('commentaire de décision publié dans les discussions',
      fil.statut === 200 && fil.corps.some((c) => c.commentaire === 'motif de fumée'));
    verifier('auteur identifié par son nom complet',
      fil.corps.every((c) => !c.user_display_name || !c.user_display_name.includes('@')));

    await P(`/api/m/planification/plans/${id}/soumettre`, { commentaire: '' });
    await P(`/api/m/planification/plans/${id}/valider`, { commentaire: 'ok' });
    verifier('validation', (await srv.appel(`/api/m/planification/plans/${id}`)).corps.statut === 'valide');

    const amend = await P(`/api/m/planification/plans/${id}/amender`, { motif: 'amendement de fumée' });
    verifier('amendement : nouvelle version en brouillon', amend.statut === 200 && !!amend.corps.new_plan_id);
    const enfant = (await srv.appel(`/api/m/planification/plans/${amend.corps.new_plan_id}`)).corps;
    verifier('activités copiées et reliées à leur origine',
      (enfant.activites || []).length === 1 && !!enfant.activites[0].parent_activite_id);
    verifier('version incrémentée', enfant.version === (cree.corps.version || 1) + 1);

    // Un plan n'a qu'un amendement à la fois : le second est refusé, et le
    // refus nomme celui qui chemine déjà.
    const second = await P(`/api/m/planification/plans/${id}/amender`, { motif: 'second amendement' });
    verifier('second amendement refusé',
      second.statut === 409 && second.corps.error === 'amendement_en_cours'
      && second.corps.amendement === enfant.id, `${second.statut} ${second.corps.error || ''}`);
    verifier('aucune seconde version créée',
      (await srv.appel('/api/m/planification/plans')).corps
        .filter((p) => p.parent_plan_id === id).length === 1);

    const annule = await P(`/api/m/planification/plans/${enfant.id}/annuler-amendement`, { commentaire: '' });
    verifier('annulation de l’amendement', annule.statut === 200 && annule.corps.parent_plan_id === id);

    const sync = await srv.appel(`/api/m/planification/plans/${id}/sync-risques`);
    verifier('synchronisation des risques : écarts calculés',
      sync.statut === 200 && 'has_changes' in sync.corps && Array.isArray(sync.corps.changes));

    // ── Contrat « plans en vigueur » consommé par Exécution de la Surveillance ──
    const vigueur = await srv.appel('/api/shared/surveillance-plans');
    verifier('service PLAN.plansValides exposé en HTTP',
      vigueur.statut === 200 && Array.isArray(vigueur.corps));
    verifier('seuls les plans en vigueur sont publiés',
      (vigueur.corps || []).every((p) => ['valide', 'approuve_dg', 'transmis'].includes(p.statut)),
      (vigueur.corps || []).map((p) => p.statut).join(', '));
    verifier('chaque plan publié porte ses activités',
      (vigueur.corps || []).every((p) => Array.isArray(p.activites) && p.nb_activites === p.activites.length));
    const filtre = await srv.appel('/api/shared/surveillance-plans?annee=1900');
    verifier('filtres du contrat appliqués', filtre.statut === 200 && filtre.corps.length === 0);

    // ── Droits du module opposables côté serveur ──
    const lecteur = await controlerLecteur(srv);
    verifier('session ouverte sur un compte non gestionnaire', lecteur.connecte);
    verifier('privilège de base LECTEUR', lecteur.privilegeBase === 'LECTEUR', lecteur.privilegeBase);
    verifier('création refusée hors portée', lecteur.creation === 403,
      `secteur ${lecteur.secteurTeste} → statut ${lecteur.creation}`);
    verifier('validation refusée', lecteur.validation === 403, `statut ${lecteur.validation}`);
    verifier('consultation des plans autorisée', lecteur.lecture === 200, `statut ${lecteur.lecture}`);

    // ── Le PUT générique ne décide pas du sort du plan ──
    // Il n'avait pas de schéma : un Contributeur y posait `statut: valide` et
    // son plan entrait en vigueur — servi à « Exécution de la Surveillance »
    // sans qu'aucun validateur ne l'ait vu.
    const brouillon = await P('/api/m/planification/plans', { titre: 'Garde-fou PUT', annee: 2032, type: 'periodique' });
    const force = await srv.appel(`/api/m/planification/plans/${brouillon.corps.id}`, {
      method: 'PUT',
      body: JSON.stringify({ titre: 'Garde-fou PUT', statut: 'valide', version: 9, valider_par: 'usurpe' }),
    });
    verifier('le PUT générique ne pose pas le statut',
      force.statut === 200 && force.corps.statut === 'brouillon' && force.corps.version !== 9,
      `statut ${force.corps && force.corps.statut} · version ${force.corps && force.corps.version}`);
    verifier('le plan forcé n’entre pas en vigueur',
      !((await srv.appel('/api/shared/surveillance-plans')).corps || []).some((p) => p.id === brouillon.corps.id));

    // ── Chaque type proposé par le formulaire s'enregistre ──
    // Le schéma n'admettait que « periodique », « ponctuel » et « thematique »,
    // quand le formulaire propose « periodique », « inopine » et
    // « ponctuel_special » : un plan inopiné ou spécial était refusé à la
    // création comme à la modification.
    for (const type of ['periodique', 'inopine', 'ponctuel_special']) {
      const cree = await P('/api/m/planification/plans', { titre: `Type ${type}`, annee: 2032, type });
      verifier(`plan « ${type} » créé`,
        cree.statut === 200 && cree.corps.type === type, `statut ${cree.statut} · ${JSON.stringify(cree.corps).slice(0, 80)}`);
      if (cree.statut !== 200) continue;
      const modifie = await srv.appel(`/api/m/planification/plans/${cree.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ titre: `Type ${type}`, annee: 2032, type }),
      });
      verifier(`plan « ${type} » modifiable`, modifie.statut === 200, `statut ${modifie.statut}`);
      await srv.appel(`/api/m/planification/plans/${cree.corps.id}`, { method: 'DELETE' });
    }
    verifier('type inconnu refusé',
      (await P('/api/m/planification/plans', { titre: 'Type inconnu', annee: 2032, type: 'fantaisie' })).statut === 400);

    // Le fil de discussion suit le sort du plan : le lire suppose d'y avoir
    // accès, y écrire suppose d'y contribuer. Ces routes n'opposaient aucun
    // refus — toute session écrivait dans le fil et en effaçait les avis.
    // Le fil retient `contenu` : c'est ce champ que l'écran affiche, et le
    // seul que la route accepte désormais.
    const avis = await P(`/api/m/planification/plans/${brouillon.corps.id}/commentaires`, { contenu: 'Avis du gestionnaire' });
    await srv.connexion('m.ahoyo@anac.bj');
    const ecrit = await srv.appel(`/api/m/planification/plans/${brouillon.corps.id}/commentaires`, {
      method: 'POST', body: JSON.stringify({ contenu: 'intrus' }),
    });
    const efface = await srv.appel(`/api/m/planification/commentaires/${avis.corps.id}`, { method: 'DELETE' });
    verifier('écriture dans le fil refusée au lecteur', ecrit.statut === 403, `statut ${ecrit.statut}`);
    verifier('effacement d’un avis refusé au lecteur', efface.statut === 403, `statut ${efface.statut}`);
    await srv.connexion();
    await srv.appel(`/api/m/planification/plans/${brouillon.corps.id}`, { method: 'DELETE' });

    const suppr = await srv.appel(`/api/m/planification/plans/${id}`, { method: 'DELETE' });
    verifier('suppression du plan de test', suppr.statut === 200);
  } finally {
    srv.arreter();
  }
  return bilan('Module PLAN');
};
