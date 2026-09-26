// Fumée — module « Profils de Risques » : contexte, collections, droits,
// service publié et cohérence des profils produits.
const { demarrer, verifier, horsPortee, bilan } = require('./harness');

module.exports = async function profilRisqueSmoke(port) {
  console.log('\n── Module PR — Profils de Risques ──');
  const srv = await demarrer({ port });
  try {
    await srv.connexion();

    const me = await srv.appel('/api/m/profil-risque/me');
    verifier('contexte utilisateur du module', me.statut === 200 && !!me.corps.role);

    for (const coll of ['indicateurs-conf', 'indicateurs-perf', 'indicateurs-complex', 'evaluations', 'eval-reunions']) {
      const r = await srv.appel(`/api/m/profil-risque/${coll}`);
      verifier(`collection ${coll}`, r.statut === 200 && Array.isArray(r.corps));
    }

    const docs = await srv.appel('/api/documents');
    verifier('bibliothèque documentaire', docs.statut === 200 && Array.isArray(docs.corps));

    const profils = await srv.appel('/api/shared/risk-profiles');
    verifier('service PR.riskProfiles exposé en HTTP', profils.statut === 200 && Array.isArray(profils.corps));
    const complet = (profils.corps || []).every((p) => p.prestataire_id && 'csrbo' in p && 'niveau' in p);
    verifier('contrat des profils respecté', complet, 'champs prestataire_id / niveau / csrbo');

    const unSeulParPrestataire = new Set((profils.corps || []).map((p) => p.prestataire_id)).size === (profils.corps || []).length;
    verifier('un seul profil en vigueur par prestataire', unSeulParPrestataire);

    const droits = await srv.appel('/api/m/droits/PLAN/me');
    verifier('privilège du module résolu', droits.statut === 200 && 'privilege' in droits.corps);

    // ── Décider n'est pas saisir ──
    // Le front valide une évaluation par un PUT direct : la garde ne peut pas
    // interdire `statut`, elle exige le Validateur dès qu'il porte une
    // décision. Un compte Lecteur validait ici le profil de risque d'un
    // organisme, aussitôt servi à la Planification.
    const secteurs = (await srv.appel('/api/secteurs')).corps || [];
    const sec = secteurs[0] || {};
    const ev = await srv.appel('/api/m/profil-risque/evaluations', {
      method: 'POST',
      body: JSON.stringify({ prestataire_id: 'smoke', statut: 'brouillon', domaine_id: sec.domaine_id || '', secteur_id: sec.id || '' }),
    });
    verifier('création d’une évaluation par le gestionnaire', ev.statut === 200 && !!ev.corps.id);

    await srv.connexion('m.ahoyo@anac.bj');
    const parLecteur = async (chemin, methode, corps) => (await srv.appel(chemin, {
      method: methode, body: corps === undefined ? undefined : JSON.stringify(corps),
    })).statut;

    const validation = await parLecteur(`/api/m/profil-risque/evaluations/${ev.corps.id}`, 'PUT', { statut: 'valide' });
    verifier('validation d’une évaluation refusée au lecteur', validation === 403, `statut ${validation}`);
    const decision = await parLecteur(`/api/m/profil-risque/evaluations/${ev.corps.id}/decision-directeur`, 'POST', { decision: 'valider' });
    verifier('décision du directeur refusée au lecteur', decision === 403, `statut ${decision}`);
    const bareme = await parLecteur('/api/indices', 'PUT', [{ id: 'pirate' }]);
    verifier('barème des indices non réinscriptible', bareme === 403, `statut ${bareme}`);
    const piece = await parLecteur('/api/documents', 'POST', { nom: 'x.pdf', fileB64: 'JVBER' });
    verifier('dépôt en bibliothèque refusé au lecteur', piece === 403, `statut ${piece}`);

    await srv.connexion();
    const apres = (await srv.appel(`/api/m/profil-risque/evaluations/${ev.corps.id}`)).corps || {};
    verifier('l’évaluation est restée en brouillon', apres.statut === 'brouillon', apres.statut);
    // Une évaluation réévaluée ne se supprime pas tant que sa réévaluation
    // existe : celle-ci perdrait son origine.
    const EV = '/api/m/profil-risque/evaluations';
    await srv.appel(`${EV}/${ev.corps.id}`, { method: 'PUT', body: JSON.stringify({ statut: 'valide' }) });
    const reev = await srv.appel(`${EV}/${ev.corps.id}/reevaluer`, { method: 'POST', body: '{}' });
    // La route rend l'identifiant ; le disque n'était qu'un filet pour le cas
    // où elle ne le ferait pas. À distance on s'en remet à la réponse.
    const enfantId = (reev.corps || {}).id || (srv.local
      ? ((srv.donnees('profil_risque').evaluations || [])
        .find((x) => x.parent_id === ev.corps.id) || {}).id
      : undefined);
    verifier('réévaluation lancée', reev.statut === 200 && !!enfantId, `statut ${reev.statut}`);
    const refusReev = await srv.appel(`${EV}/${ev.corps.id}`, { method: 'DELETE' });
    verifier('évaluation réévaluée : suppression refusée',
      refusReev.statut === 409 && refusReev.corps.error === 'evaluation_reevaluee', `statut ${refusReev.statut}`);
    verifier('réévaluation supprimée d’abord',
      (await srv.appel(`${EV}/${enfantId}`, { method: 'DELETE' })).statut === 200);

    // Une évaluation supprimée emporte ses réunions : elles ne se lisent que
    // sous son identifiant, et resteraient en base sans que rien les atteigne.
    const reunion = await srv.appel('/api/m/profil-risque/eval-reunions', {
      method: 'POST', body: JSON.stringify({ eval_id: ev.corps.id, date: '2026-09-17', objet: 'Réunion d’essai' }),
    });
    const reunionPrest = await srv.appel('/api/m/profil-risque/eval-reunions-prest', {
      method: 'POST', body: JSON.stringify({ eval_id: ev.corps.id, prestataire_id: 'smoke', date: '2026-09-17' }),
    });
    verifier('réunions rattachées à l’évaluation', reunion.statut === 200 && reunionPrest.statut === 200,
      `statuts ${reunion.statut} / ${reunionPrest.statut}`);
    const suppr = await srv.appel(`/api/m/profil-risque/evaluations/${ev.corps.id}`, { method: 'DELETE' });
    verifier('évaluation supprimée', suppr.statut === 200);
    // Le reste d'une réunion orpheline ne se lit sur aucune route — elles ne
    // s'atteignaient que par leur évaluation, et c'est bien le problème.
    if (srv.local) {
      const restes = srv.donnees('profil_risque');
      const orphelines = ['eval_reunions', 'eval_reunions_prest']
        .map((c) => [c, (restes[c] || []).filter((x) => x.eval_id === ev.corps.id).length]).filter(([, n]) => n);
      verifier('les réunions partent avec leur évaluation', orphelines.length === 0,
        orphelines.map(([c, n]) => `${c} : ${n}`).join(' · '));
    } else {
      horsPortee('les réunions partent avec leur évaluation', 'se lit sur le disque du serveur');
    }
  } finally {
    srv.arreter();
  }
  return bilan('Module PR');
};
