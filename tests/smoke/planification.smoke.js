// Fumée — module « Plans de Surveillance » : plans et activités, cycle de vie
// d'un plan (création → soumission → validation → amendement → annulation),
// synchronisation des risques et fil de discussion.
const { demarrer, verifier, horsPortee, bilan } = require('./harness');

// Ouvre une session sur un compte au privilège LECTEUR pour le secteur visé
// et tente les écritures : le serveur doit les refuser.
// `supplement` : une épreuve de plus à mener **sous ce compte-là**, rendue à
// l'appelant. Elle est passée plutôt que recopiée, parce qu'ouvrir une seconde
// session de lecteur ailleurs ferait deux chemins à tenir d'accord — et la
// fonction rend ensuite la main au compte d'administration, ce qu'un contrôle
// écrit à part oublierait un jour.
async function controlerLecteur(srv, supplement) {
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
  const resultatSupplement = supplement ? await supplement(srv) : undefined;

  await srv.connexion();   // retour au compte d'administration
  return {
    connecte: !!identite && moi && moi.user && moi.user.username === 'm.ahoyo@anac.bj',
    privilegeBase: acces.privilege,
    secteurTeste: sec ? sec.code : null,
    creation, validation, lecture,
    supplement: resultatSupplement,
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

    // Un plan amendé ne se supprime pas : sa lignée se couperait.
    const suppAmende = await srv.appel(`/api/m/planification/plans/${id}`, { method: 'DELETE' });
    verifier('plan amendé : suppression refusée',
      suppAmende.statut === 409 && suppAmende.corps.error === 'plan_amende'
      && (suppAmende.corps.amendements || []).includes(enfant.id), `statut ${suppAmende.statut}`);
    const avisEnfant = await P(`/api/m/planification/plans/${enfant.id}/commentaires`, { contenu: 'Avis sur l’amendement' });
    verifier('avis posé sur l’amendement', avisEnfant.statut === 200 || avisEnfant.statut === 201,
      `statut ${avisEnfant.statut}`);
    const annule = await P(`/api/m/planification/plans/${enfant.id}/annuler-amendement`, { commentaire: '' });
    verifier('annulation de l’amendement', annule.statut === 200 && annule.corps.parent_plan_id === id);
    // Ce qu'aucune route ne sert : le reste d'un amendement annulé. C'est tout
    // l'objet du contrôle, et il se lit donc sur le fichier.
    if (srv.local) {
      const apresAnnul = await srv.donnees('planification');
      const restesEnfant = ['activites', 'workflow', 'commentaires', 'versions']
        .map((c) => [c, (apresAnnul[c] || []).filter((x) => x.plan_id === enfant.id).length])
        .filter(([, n]) => n);
      verifier('l’amendement annulé n’a rien laissé derrière lui', restesEnfant.length === 0,
        restesEnfant.map(([c, n]) => `${c} : ${n}`).join(' · '));
    } else {
      horsPortee('l’amendement annulé n’a rien laissé derrière lui', 'se lit sur le disque du serveur');
    }

    const sync = await srv.appel(`/api/m/planification/plans/${id}/sync-risques`);
    verifier('synchronisation des risques : écarts calculés',
      sync.statut === 200 && 'has_changes' in sync.corps && Array.isArray(sync.corps.changes));

    // ── Six routes converties qu'aucun contrôle n'exerçait ──
    //
    // `apply-sync`, les trois dernières transitions du circuit, le retrait de la
    // version remplacée et les archives : toutes récrites en transformation unique
    // (ADR-002, jalon n° 13), et toutes sans contrôle avant celui-ci. Un `await`
    // oublié y rendrait une liste vide ou une promesse sérialisée en `{}`, sans la
    // moindre erreur — c'est précisément là que le défaut se logeait.

    // 1. Appliquer la synchronisation. Le plan étant en vigueur, elle ouvre un
    //    amendement, y recopie les activités, et y applique les écarts retenus :
    //    c'était une écriture par activité, plus deux. Les écarts peuvent être
    //    vides selon le jeu de données ; ce qui s'éprouve ici, c'est que la route
    //    réponde et que l'amendement soit ouvert avec ses activités.
    const appliquee = await P(`/api/m/planification/plans/${id}/apply-sync`, {
      prestataire_ids: (sync.corps.changes || []).map((c) => c.prestataire_id),
    });
    verifier('application de la synchronisation',
      appliquee.statut === 200 && appliquee.corps.ok === true && !!appliquee.corps.target_plan_id,
      JSON.stringify(appliquee.corps).slice(0, 140));
    const cibleSync = (await srv.appel(`/api/m/planification/plans/${appliquee.corps.target_plan_id}`)).corps || {};
    // **La copie se reconnaît à `parent_activite_id`**, et non au nombre
    // d'activités : si rien n'était recopié, la synchronisation en créerait de
    // neuves pour les mêmes organismes, et un simple décompte passerait. C'est ce
    // qu'a montré la contre-épreuve — l'assertion d'abord écrite ne mordait pas.
    const copiees = (cibleSync.activites || []).filter((a) => a.parent_activite_id === act.corps.id);
    verifier('la cible de synchronisation porte les activités recopiées du plan',
      appliquee.corps.amended === true
      && cibleSync.parent_plan_id === id
      && copiees.length === 1,
      `amendé ${appliquee.corps.amended} · ${copiees.length} copie(s) sur ${(cibleSync.activites || []).length} activité(s)`);

    // 2. Valider l'amendement : la version précédente se retire, et son circuit
    //    doit porter la décision qui l'a retirée. C'étaient deux écritures par
    //    ancêtre — entre elles, une version retirée sans que rien ne dise par quoi.
    await P(`/api/m/planification/plans/${cibleSync.id}/soumettre`, { commentaire: '' });
    await P(`/api/m/planification/plans/${cibleSync.id}/valider`, { commentaire: 'version suivante' });
    const parentRetire = (await srv.appel(`/api/m/planification/plans/${id}`)).corps || {};
    verifier('la version précédente se retire au profit de la suivante',
      parentRetire.statut === 'remplace' && parentRetire.remplace_par === cibleSync.id,
      `statut ${parentRetire.statut}`);
    const circuitParent = (await srv.appel(`/api/m/planification/plans/${id}/workflow`)).corps || [];
    verifier('et son circuit porte la décision qui l’a retirée',
      Array.isArray(circuitParent) && circuitParent.some((w) => w.action === 'remplacer'),
      (circuitParent.map ? circuitParent.map((w) => w.action).join(', ') : String(circuitParent)).slice(0, 120));

    // 3. Les deux dernières transitions. L'approbation du directeur porte la
    //    lettre de transmission, que l'écran demande : elle doit rester, sur le
    //    plan et dans son circuit — elle se perdait (ADR-003, n° 5.f.100). Une
    //    lettre qui n'est pas un texte est refusée, et le plan ne bouge pas.
    const lettreRefusee = await P(`/api/m/planification/plans/${cibleSync.id}/approuver-dg`,
      { commentaire: '', lettre_transmission: { pas: 'un texte' } });
    verifier('une lettre de transmission qui n’est pas un texte est refusée, et le plan reste validé',
      lettreRefusee.statut === 400
      && (await srv.appel(`/api/m/planification/plans/${cibleSync.id}`)).corps.statut === 'valide',
      `statut ${lettreRefusee.statut}`);
    const LETTRE = 'Lettre de transmission n° 2030-42';
    for (const [transition, attendu] of [['approuver-dg', 'approuve_dg'], ['transmettre', 'transmis']]) {
      const r = await P(`/api/m/planification/plans/${cibleSync.id}/${transition}`,
        transition === 'approuver-dg' ? { commentaire: '', lettre_transmission: LETTRE } : { commentaire: '' });
      const apres = (await srv.appel(`/api/m/planification/plans/${cibleSync.id}`)).corps || {};
      verifier(`transition « ${transition} »`, r.statut === 200 && apres.statut === attendu,
        `statut ${r.statut}, plan « ${apres.statut} »`);
    }
    const planTransmis = (await srv.appel(`/api/m/planification/plans/${cibleSync.id}`)).corps || {};
    const circuitDG = ((await srv.appel(`/api/m/planification/plans/${cibleSync.id}/workflow`)).corps || [])
      .find((w) => w.action === 'approuver-dg') || {};
    verifier('la lettre de transmission saisie à l’approbation reste, sur le plan et dans son circuit',
      planTransmis.lettre_transmission === LETTRE && circuitDG.lettre_transmission === LETTRE,
      JSON.stringify({ plan: planTransmis.lettre_transmission, circuit: circuitDG.lettre_transmission }));

    // 4. L'exception d'archive posée activité par activité, puis levée.
    const actCible = (cibleSync.activites || [])[0] || {};
    const sortie = await srv.appel(`/api/m/planification/activites/${actCible.id}/desarchiver`, { method: 'PUT' });
    verifier('activité sortie des archives à titre d’exception',
      sortie.statut === 200 && Number(sortie.corps.desarchivee) === 1 && !!sortie.corps.desarchiver_par,
      `statut ${sortie.statut}`);

    // 5. Archiver le plan, puis le sortir des archives : la sortie remet le plan
    //    en vigueur **et** lève les exceptions posées activité par activité —
    //    c'était une écriture par activité, plus deux.
    await P(`/api/m/planification/plans/${cibleSync.id}/archiver`, { commentaire: 'fin de plan' });
    verifier('plan archivé',
      (await srv.appel(`/api/m/planification/plans/${cibleSync.id}`)).corps.statut === 'archive');
    const sortiePlan = await P(`/api/m/planification/plans/${cibleSync.id}/desarchiver`, {});
    const revenu = (await srv.appel(`/api/m/planification/plans/${cibleSync.id}`)).corps || {};
    verifier('plan sorti des archives, exceptions levées',
      sortiePlan.statut === 200 && revenu.statut === 'valide'
      && (revenu.activites || []).every((a) => !Number(a.desarchivee)),
      `statut ${revenu.statut} · ${(revenu.activites || []).filter((a) => Number(a.desarchivee)).length} exception(s) restante(s)`);
    // Sortir deux fois n'a pas de sens : le refus se relit dans la transformation.
    const deuxFois = await P(`/api/m/planification/plans/${cibleSync.id}/desarchiver`, {});
    verifier('sortie des archives refusée deux fois de suite',
      deuxFois.statut === 409 && deuxFois.corps.error === 'plan_non_archive', `statut ${deuxFois.statut}`);

    // 6. Et le retour aux archives d'une activité.
    const retour = await srv.appel(`/api/m/planification/activites/${actCible.id}/rearchiver`, { method: 'PUT' });
    verifier('activité rendue aux archives',
      retour.statut === 200 && !Number(retour.corps.desarchivee) && !retour.corps.desarchiver_par,
      `statut ${retour.statut}`);

    // La version suivante s'en va, et elle seule : le plan d'origine sert encore
    // aux contrôles de suppression, plus bas. Une lignée se supprime par le bas —
    // le parent refuse tant qu'un descendant le cite (« plan_amende »).
    verifier('la version suivante se supprime, libérant sa lignée',
      (await srv.appel(`/api/m/planification/plans/${cibleSync.id}`, { method: 'DELETE' })).statut === 200);

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

    // ── Un profil de risque écrit depuis l'écran de PLAN ──
    //
    // Le producteur normal d'un profil est PR : `PR.riskProfiles` est une
    // **projection** sur les évaluations validées, et le bus est à sens unique.
    // L'écran de PLAN portait pourtant un formulaire qui en fabriquait un, dont
    // l'enregistrement postait vers une route **qui n'existait pas** — un geste
    // mort depuis l'origine, que la ronde a trouvé en cherchant pourquoi
    // `planSaveRiskProfile` n'était pas exercé. La maîtrise d'ouvrage a décidé
    // le 4 novembre 2026 d'ouvrir la route plutôt que de retirer le formulaire.
    //
    // Cinq règles s'y éprouvent, et quatre sont des refus.
    {
      const refs = (await srv.appel('/api/referentiels')).corps || {};
      const prest = (refs.prestataires || [])[0] || {};
      const secteur = (refs.secteurs || []).find((s) => s.id === prest.secteur_id)
        || (refs.secteurs || [])[0] || {};
      const corps = {
        prestataire_id: prest.id,
        secteur_id: secteur.id,
        risk_label: 'Élevé',
        intensite: 'Renforcée',
        csrbo: 9,
        debut_cycle: '2026-01-15',
        evaluation_date: '2026-01-10',
        sous_activites: { sa1: { risk: 'Modéré', freq: 2, intensite: 'Normale' } },
      };
      const pose = await srv.appel('/api/m/planification/risk-profiles',
        { method: 'POST', body: JSON.stringify(corps) });
      verifier('un profil de risque s’écrit depuis PLAN, et porte la marque de son origine',
        pose.statut === 201
        && pose.corps.origine === 'plan'
        && !!pose.corps.cree_par && !!pose.corps.cree_le
        // `niveau` et non `matrice` : c'est `niveau` que la comparaison des
        // écarts lit pour en faire le `risk_label` d'une activité.
        && pose.corps.niveau === 'Élevé'
        && pose.corps.intensite === 'Renforcée' && pose.corps.csrbo === 9
        && pose.corps.secteur_id === secteur.id
        && pose.corps.domaine_id === (secteur.domaine_id || '')
        && pose.corps.date_validation === '2026-01-10'
        && pose.corps.sous_activites.sa1.freq === 2,
        `statut ${pose.statut} · ${JSON.stringify(pose.corps).slice(0, 200)}`);

      // La fin du cycle se déduit du début et du CSRBO, **côté serveur** : la
      // même règle pour tous les appelants, et non celle que le client calcule.
      verifier('la fin du cycle se déduit du début et du CSRBO, et le cycle du prestataire suit',
        pose.statut === 201
        && (await srv.appel('/api/m/planification/prestataires-risques')).corps
          .some((p) => p.id === prest.id && p.debut_cycle === '2026-01-15'
            && p.fin_cycle === '2026-10-15'),
        JSON.stringify(((await srv.appel('/api/m/planification/prestataires-risques')).corps || [])
          .find((p) => p.id === prest.id) || {}).slice(0, 200));

      // ── La primauté de l'évaluation, éprouvée dans les deux sens ──
      //
      // L'union rend les profils dérivés par PR **plus** les directs, et sur un
      // même couple prestataire + secteur c'est le dérivé qui l'emporte : un
      // profil écrit à la main comble un vide, il ne recouvre pas une
      // évaluation validée. Une règle qui n'est éprouvée que du côté où elle
      // laisse passer n'est pas éprouvée.
      //
      // Mon premier contrôle n'en voyait qu'un côté, et il est tombé : le
      // prestataire qu'il avait pris **était déjà couvert**, et son profil
      // direct a donc été masqué — exactement comme prévu, par la règle que
      // j'avais écrite une page plus haut.
      const derives = (await srv.appel('/api/shared/risk-profiles')).corps || [];
      const couverts = new Set(derives.map((p) => `${p.prestataire_id}|${p.secteur_id}`));
      const estCouvert = couverts.has(`${prest.id}|${secteur.id}`);
      const servis = await srv.appel('/api/m/planification/risk-profiles');
      const paraitDansLUnion = (servis.corps || []).some((p) => p.id === pose.corps.id);
      verifier('sur un couple que PR couvre, le profil direct est masqué ; sur un couple qu’il ne couvre pas, il paraît',
        pose.statut === 201 && servis.statut === 200
        // Le cas du jeu d'essai, mesuré et non supposé.
        && estCouvert === !paraitDansLUnion,
        `couple ${estCouvert ? 'couvert' : 'non couvert'} par PR → ${
          paraitDansLUnion ? 'il paraît' : 'il est masqué'} · ${derives.length} dérivé(s)`);

      // ── L'autre côté de la règle ──
      //
      // Mon premier jet cherchait un **organisme** que PR ne couvre pas, n'en
      // trouvait aucun — tous ont une évaluation validée dans le jeu d'essai —
      // et déclarait le contrôle hors de portée. C'était abandonner une moitié
      // de la règle, et une règle dont une moitié n'est pas éprouvée n'est pas
      // éprouvée.
      //
      // Or la clé de l'union est le **couple** prestataire + secteur, non
      // l'organisme : le même organisme sur un autre secteur est un couple que
      // PR ne couvre pas. Le jeu d'essai en porte donc autant qu'il a de
      // secteurs. *Quand on ne trouve pas le cas qu'on cherche, il faut
      // d'abord vérifier qu'on cherche la bonne clé.*
      const autreSecteur = (refs.secteurs || [])
        .find((s) => s.id !== secteur.id && !couverts.has(`${prest.id}|${s.id}`));
      const direct = autreSecteur ? await srv.appel('/api/m/planification/risk-profiles', {
        method: 'POST',
        body: JSON.stringify({ ...corps, secteur_id: autreSecteur.id }),
      }) : null;
      const apres = (await srv.appel('/api/m/planification/risk-profiles')).corps || [];
      verifier('un profil direct sur un couple que PR ne couvre pas rejoint ceux que le module sert, et porte son origine',
        !!autreSecteur && direct.statut === 201
        && apres.some((p) => p.id === direct.corps.id && p.origine === 'plan'
          && p.secteur_id === autreSecteur.id),
        `${autreSecteur ? `secteur ${autreSecteur.code}` : 'aucun secteur libre'} · statut ${
          direct && direct.statut} · ${apres.length} profil(s) servi(s)`);

      // ── Les quatre refus ──
      const sans = async (cle) => {
        const c = { ...corps };
        delete c[cle];
        return (await srv.appel('/api/m/planification/risk-profiles',
          { method: 'POST', body: JSON.stringify(c) })).statut;
      };
      const avec = async (cle, valeur) => (await srv.appel('/api/m/planification/risk-profiles',
        { method: 'POST', body: JSON.stringify({ ...corps, [cle]: valeur }) })).statut;
      const refus = {
        sansPrestataire: await sans('prestataire_id'),
        sansSecteur: await sans('secteur_id'),
        sansNiveau: await sans('risk_label'),
        sansIntensite: await sans('intensite'),
        sansCsrbo: await sans('csrbo'),
        csrboNul: await avec('csrbo', 0),
        prestataireInconnu: await avec('prestataire_id', 'pr_inexistant'),
        secteurInconnu: await avec('secteur_id', 'sec_inexistant'),
        finAvantDebut: await avec('fin_cycle', '2025-12-01'),
      };
      verifier('un profil incomplet, borné hors limites ou pointant sur un inconnu est refusé',
        // Les cinq champs requis, et la borne du CSRBO : tenus par le schéma.
        refus.sansPrestataire === 400 && refus.sansSecteur === 400
        && refus.sansNiveau === 400 && refus.sansIntensite === 400
        && refus.sansCsrbo === 400 && refus.csrboNul === 400
        // Et les trois que le schéma ne peut pas tenir : l'existence des
        // référentiels visés, et l'ordre des deux dates.
        && refus.prestataireInconnu === 400 && refus.secteurInconnu === 400
        && refus.finAvantDebut === 400,
        JSON.stringify(refus));

      // Le privilège : un profil engage la planification de la surveillance
      // d'un organisme. Il relève du validateur, comme le cycle.
      const lecteurProfil = await controlerLecteur(srv, async (s) => (await s.appel(
        '/api/m/planification/risk-profiles',
        { method: 'POST', body: JSON.stringify(corps) })).statut);
      verifier('l’écriture d’un profil est refusée hors privilège de validation',
        lecteurProfil.supplement === 403, `statut ${lecteurProfil.supplement}`);
    }

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

    if (srv.local) {
      const avantSuppr = await srv.donnees('planification');
      verifier('le plan de test porte des décisions de circuit',
        (avantSuppr.workflow || []).some((w) => w.plan_id === id));
    } else {
      horsPortee('le plan de test porte des décisions de circuit', 'se lit sur le disque du serveur');
    }
    const suppr = await srv.appel(`/api/m/planification/plans/${id}`, { method: 'DELETE' });
    verifier('suppression du plan de test', suppr.statut === 200);

    // Un plan supprimé emporte ce qui n'existe que par lui. Ses décisions et
    // ses avis ne se lisent qu'à travers sa lignée ; lui parti, elles restaient
    // en base sans que rien ne puisse plus les atteindre — la base de travail
    // en porte trente-quatre, de seize plans disparus.
    if (srv.local) {
      const apresSuppr = await srv.donnees('planification');
      const restes = ['workflow', 'commentaires', 'versions']
        .map((c) => [c, (apresSuppr[c] || []).filter((x) => x.plan_id === id || x.plan_id === brouillon.corps.id).length])
        .filter(([, n]) => n);
      verifier('décisions, avis et versions emportés avec le plan', restes.length === 0,
        restes.map(([c, n]) => `${c} : ${n}`).join(' · '));
    } else {
      horsPortee('décisions, avis et versions emportés avec le plan', 'se lit sur le disque du serveur');
    }
  } finally {
    srv.arreter();
  }
  return bilan('Module PLAN');
};
