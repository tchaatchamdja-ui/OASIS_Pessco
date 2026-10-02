// Fumée — module « Profils de Risques » : contexte, collections, droits,
// service publié et cohérence des profils produits.
const { demarrer, verifier, horsPortee, bilan } = require('./harness');

module.exports = async function profilRisqueSmoke(port) {
  console.log('\n── Module PR — Profils de Risques ──');
  const srv = await demarrer({ port });
  const M = '/api/m/profil-risque';
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
      ? (((await srv.donnees('profil_risque')).evaluations || [])
        .find((x) => x.parent_id === ev.corps.id) || {}).id
      : undefined);
    verifier('réévaluation lancée', reev.statut === 200 && !!enfantId, `statut ${reev.statut}`);

    // ── Les trois classeurs, qu'aucun contrôle n'exerçait ──
    //
    // Ces routes lisent le magasin trois fois chacune, en boucle sur les familles
    // d'indicateurs. Converties en asynchrone (jalon n° 13), un `await` oublié y
    // rendrait un classeur **vide et bien formé** : trois feuilles, leurs
    // entêtes, aucune ligne. Rien ne l'aurait dit — et personne ne les exerçait.
    for (const [quoi, chemin] of [
      ['export des indicateurs', `${M}/indicateurs/export`],
      ['modèle d’indicateurs', `${M}/indicateurs/template`],
      ['export des notes d’une évaluation', `${M}/evaluations/${ev.corps.id}/export-excel`],
    ]) {
      const r = await srv.appel(chemin);
      // Un classeur xlsx est un zip : « PK » en tête. Le corps rendu est du
      // texte, mais ses deux premiers octets suffisent à le dire.
      verifier(`${quoi} rend un classeur`,
        r.statut === 200 && typeof r.corps === 'string' && r.corps.slice(0, 2) === 'PK',
        `statut ${r.statut}, ${String(r.corps).length} octet(s)`);
    }

    // L'import, lui, écrit — en une seule transformation, dont les compteurs se
    // remettent à zéro à chaque essai. Deux lignes, puis les mêmes : la seconde
    // passe doit les dire « inchangées » et ne rien écrire.
    const XLSX = require('xlsx');
    const classeur = (lignes) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Code', 'Label', 'Secteur_ID', 'Critere 1', 'Critere 2', 'Critere 3'], ...lignes,
      ]), 'Conformite');
      return `data:x;base64,${XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })}`;
    };
    const importer = (lignes) => srv.appel(`${M}/indicateurs/import`, {
      method: 'POST', body: JSON.stringify({ fileB64: classeur(lignes) }),
    });
    const LIGNES = [['SMK-1', 'Indicateur d’essai', '', 'a', 'b', 'c'], ['SMK-2', 'Second', '', 'd', 'e', 'f']];
    const premier = await importer(LIGNES);
    verifier('import d’indicateurs : deux lignes ajoutées',
      premier.statut === 200 && premier.corps.added === 2 && premier.corps.updated === 0,
      JSON.stringify(premier.corps).slice(0, 120));
    const second = await importer(LIGNES);
    verifier('import d’indicateurs : le même classeur ne réécrit rien',
      second.statut === 200 && second.corps.added === 0 && second.corps.unchanged === 2,
      JSON.stringify(second.corps).slice(0, 120));
    const poses = ((await srv.appel(`${M}/indicateurs-conf`)).corps || [])
      .filter((i) => String(i.code || '').startsWith('SMK-'));
    verifier('import d’indicateurs : deux enregistrements, pas quatre',
      poses.length === 2, `${poses.length} enregistrement(s)`);
    for (const i of poses) await srv.appel(`${M}/indicateurs-conf/${i.id}`, { method: 'DELETE' });

    // ── Un cycle ne s'ouvre qu'une fois ──
    //
    // Le refus d'une seconde réévaluation, et le lien qui tient : le parent
    // désigne le clone qui existe.
    //
    // **Ce contrôle est séquentiel, et il faut dire pourquoi.** La rafale de dix
    // demandes simultanées a été écrite, puis retirée : la contre-épreuve — la
    // logique d'avant, en trois temps avec la vérification hors de l'écriture —
    // **l'a passée sans broncher**. Dix requêtes HTTP contre un gestionnaire
    // rapide se sérialisent, la fenêtre ne s'ouvre pas, et le contrôle aurait
    // laissé croire qu'il gardait quelque chose. C'est la même mesure que pour le
    // compteur du second facteur.
    //
    // L'atomicité se prouve donc là où elle se décide : en processus, sur
    // `modifier` (suite « unitaires », fenêtre lire-vérifier-écrire), et par la
    // forme — la suite « taille » vérifie que la garde est **dans** la
    // transformation.
    const refusSecond = await srv.appel(`${EV}/${ev.corps.id}/reevaluer`, { method: 'POST', body: '{}' });
    verifier('une seconde réévaluation est refusée',
      refusSecond.statut === 409 && refusSecond.corps.error === 'reevaluation_deja_lancee',
      `statut ${refusSecond.statut}`);
    const parent = (await srv.appel(`${EV}/${ev.corps.id}`)).corps || {};
    verifier('le parent désigne le cycle ouvert', parent.enfant_id === enfantId,
      `enfant_id ${parent.enfant_id || '(vide)'}`);
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
      const restes = await srv.donnees('profil_risque');
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
