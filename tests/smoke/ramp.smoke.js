// Fumée — module « Inspections d'aéronefs sur aire de trafic » (RAMP) :
// contexte, sept familles de paramètres, import en deux temps, inspections et
// écarts, dépôts, contacts et exports.
const { demarrer, verifier, bilan } = require('./harness');

module.exports = async function rampSmoke(port) {
  console.log('\n── Module RAMP — Inspections sur aire de trafic ──');
  const srv = await demarrer({ port });
  const M = '/api/m/ramp';
  try {
    await srv.connexion();

    // ── Contexte ──
    const ctx = await srv.appel(`${M}/context`);
    verifier('contexte du module', ctx.statut === 200 && !!ctx.corps.user);
    verifier('rôle RAMP reconstitué depuis le privilège RAMP',
      ctx.corps.user.role_ramp === 'Administrateur', ctx.corps.user.role_ramp);
    verifier('neuf États d’inspection servis',
      (ctx.corps.etats_inspection || []).length === 9,
      String((ctx.corps.etats_inspection || []).length));
    verifier('dix-sept États au carnet de contacts',
      (ctx.corps.etats_contact || []).length === 17,
      String((ctx.corps.etats_contact || []).length));

    // ── Paramétrage livré d'origine ──
    const params = await srv.appel(`${M}/parametres`);
    verifier('paramétrage lisible', params.statut === 200 && !!params.corps.familles);
    const F = params.corps.familles;
    verifier('54 items SAFA livrés', (F.items || []).length === 54, String((F.items || []).length));
    verifier('4 catégories d’écart livrées', (F.categories || []).length === 4);
    // Sept classes d'action : les cinq d'origine, plus « aucun constat » et
    // l'interdiction d'exploitation immédiate que porte le formulaire POI.
    verifier('7 classes d’action livrées', (F.actions || []).length === 7,
      (F.actions || []).map((a) => a.code).join(' '));
    // Les États ne sont plus une famille de paramètres : ils forment la liste
    // « Pays », qui porte le bigramme ISO et l'autorité de l'aviation civile.
    verifier('les États ne sont plus une famille de paramètres', !F.states);
    verifier('les catégories portent une pondération',
      (F.categories || []).every((c) => typeof c.ponderation === 'number'));
    verifier('cinq groupes d’items livrés', (F.groupes || []).length === 5,
      (F.groupes || []).map((g) => g.label).join(', '));
    verifier('chaque item se rattache à un groupe connu',
      (F.items || []).every((i) => i.code
        && (F.groupes || []).some((g) => g.code === i.cat)));
    verifier('les groupes portent un code dérivé de leur intitulé',
      (F.groupes || []).some((g) => g.code === 'flight_deck'),
      (F.groupes || []).map((g) => g.code).join(', '));
    verifier('la catégorie 3 pèse plus que la catégorie 1',
      (F.categories.find((c) => c.code === '3') || {}).ponderation
      > (F.categories.find((c) => c.code === '1') || {}).ponderation);

    // ── Import ──
    // L'analyse du classeur passe par un envoi multipart, que ce harnais ne
    // sait pas former : elle s'éprouve à l'écran. La route de confirmation,
    // que le front appelle une fois l'aperçu validé, est couverte ici.
    const importer = (data) => srv.appel(`${M}/inspections/import`, {
      method: 'POST', body: JSON.stringify({ data }),
    });

    const insp = {
      date: '2026-03-14', pays: 'Togo', exploitant: 'Asky Airlines',
      aeronef: 'B737-800', immatriculation: '5V-TTT', vol: 'KP041',
      status: 'Ouvert', itemsInspectes: 48,
      anomalies: [
        { itemCode: 'A05', stdRef: 'CAT.OP.MPA.175', description: 'Checklist non à jour', categorie: '2', action: '2' },
        { itemCode: 'C04', stdRef: 'CAT.IDE.A.100', description: 'Usure du pneu', categorie: '3', action: '3b' },
      ],
    };
    const i1 = await importer([insp]);
    verifier('import d’une inspection', i1.statut === 201 && i1.corps.creees === 1, i1.corps.message);

    // Le même classeur réimporté ne crée rien : les six clés le désignent déjà.
    const i2 = await importer([insp]);
    verifier('réimport à l’identique reconnu comme doublon',
      i2.corps.creees === 0 && i2.corps.doublons === 1, i2.corps.message);

    // Un statut différent met à jour sans dupliquer.
    const i3 = await importer([{ ...insp, status: 'Clôturé' }]);
    verifier('changement de statut → mise à jour',
      i3.corps.creees === 0 && i3.corps.majs === 1, i3.corps.message);

    // Deux lignes identiques dans un même envoi ne font qu'une inspection.
    const i4 = await importer([
      { ...insp, vol: 'KP099', anomalies: [] },
      { ...insp, vol: 'KP099', anomalies: [] },
    ]);
    verifier('doublon interne au même envoi non dupliqué',
      i4.corps.creees === 1, i4.corps.message);

    // ── Lecture ──
    const liste = await srv.appel(`${M}/inspections`);
    verifier('inspections servies avec leurs écarts',
      liste.statut === 200 && Array.isArray(liste.corps) && liste.corps.length === 2);
    const cible = liste.corps.find((x) => x.vol === 'KP041');
    verifier('les deux écarts rattachés', (cible.anomalies || []).length === 2);
    verifier('statut mis à jour par le réimport', cible.status === 'Clôturé', cible.status);

    // ── Suivi d'un écart ──
    const ecart = cible.anomalies[0];
    verifier('suivi d’un écart enregistré',
      (await srv.appel(`${M}/ecarts/${ecart.id}`, {
        method: 'PUT', body: JSON.stringify({ suivi: 'Corrigé le 20/03' }),
      })).statut === 200);

    // ── Suppression gardée par « Mesures d'Application » ──
    // L'écart de catégorie 3 y devient une carence. Une fois qu'une suite lui
    // est donnée, l'inspection qui le porte ne se supprime plus : la suite
    // perdrait l'écart qui la fonde.
    const CARE = '/api/m/mesures';
    const cat3 = cible.anomalies.find((a) => String(a.categorie) === '3');
    const cle = `ramp:${cat3 && cat3.id}`;
    const carence = ((await srv.appel(`${CARE}/constatations`)).corps || []).find((c) => c.id === cle);
    verifier('écart de catégorie 3 repris comme carence', !!carence);
    const classe = await srv.appel(`${CARE}/constatations/${encodeURIComponent(cle)}/classer`, {
      method: 'POST', body: JSON.stringify({ motif: 'Essai de garde' }),
    });
    verifier('carence classée', classe.statut === 200 || classe.statut === 201, `statut ${classe.statut}`);
    const refus = await srv.appel(`${M}/inspections/${cible.id}`, { method: 'DELETE' });
    verifier('inspection dont un écart a une suite : suppression refusée',
      refus.statut === 409 && refus.corps.error === 'suites_care', `statut ${refus.statut} · ${JSON.stringify(refus.corps).slice(0, 80)}`);
    verifier('classement retiré',
      (await srv.appel(`${CARE}/constatations/${encodeURIComponent(cle)}/classer`, { method: 'DELETE' })).statut === 200);

    // Une preuve déposée sur l'écart, pour vérifier qu'elle quitte le disque
    // avec l'inspection.
    const frontiere = '----oasis-essai';
    const corpsPreuve = [
      `--${frontiere}`,
      'Content-Disposition: form-data; name="file"; filename="preuve.pdf"',
      'Content-Type: application/pdf', '', '%PDF-1.4 essai', `--${frontiere}--`, '',
    ].join('\r\n');
    const depot = await srv.appel(`${M}/ecarts/${cat3.id}/preuves`, {
      method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${frontiere}` }, body: corpsPreuve,
    });
    verifier('preuve déposée sur l’écart', depot.statut === 201, `statut ${depot.statut}`);
    const fichierPreuve = ((srv.donnees('ramp').ecarts || []).find((e) => e.id === cat3.id).preuves || [])
      .map((p) => p.fichier)[0] || '';
    verifier('preuve présente sur le disque',
      !!fichierPreuve && srv.fichierExiste(`uploads/ramp/preuves/${fichierPreuve}`));

    // ── Suppression en cascade ──
    const avant = (await srv.appel(`${M}/inspections`)).corps
      .reduce((n, x) => n + (x.anomalies || []).length, 0);
    verifier('inspection supprimée',
      (await srv.appel(`${M}/inspections/${cible.id}`, { method: 'DELETE' })).statut === 200);
    const apres = (await srv.appel(`${M}/inspections`)).corps
      .reduce((n, x) => n + (x.anomalies || []).length, 0);
    verifier('les écarts partent avec leur inspection', apres === avant - 2,
      `${avant} → ${apres}`);
    verifier('les preuves des écarts quittent le disque',
      !srv.fichierExiste(`uploads/ramp/preuves/${fichierPreuve}`));

    // ── Paramètres : ajout, désactivation, garde à la suppression ──
    const nouveau = await srv.appel(`${M}/parametres`, {
      method: 'POST', body: JSON.stringify({ type: 'exploitants', label: 'Air Test' }),
    });
    verifier('paramètre créé', nouveau.statut === 201);
    verifier('famille inconnue refusée',
      (await srv.appel(`${M}/parametres`, {
        method: 'POST', body: JSON.stringify({ type: 'inconnue', label: 'X' }),
      })).statut === 400);
    const vide = await srv.appel(`${M}/parametres`, {
      method: 'POST', body: JSON.stringify({ type: 'exploitants', label: '  ' }),
    });
    verifier('libellé vide refusé, par l’erreur normalisée',
      vide.statut === 400 && vide.corps.error === 'requis' && vide.corps.objet === 'libelle',
      JSON.stringify(vide.corps));
    verifier('paramètre désactivable',
      (await srv.appel(`${M}/parametres/${nouveau.corps.id}/actif`, { method: 'PUT', body: '{}' })).corps.actif === false);
    verifier('paramètre inutilisé supprimable',
      (await srv.appel(`${M}/parametres/${nouveau.corps.id}`, { method: 'DELETE' })).statut === 200);

    // L'exploitant « Asky Airlines » porte encore une inspection.
    const asky = (await srv.appel(`${M}/parametres`)).corps.familles.exploitants
      .find((p) => p.label === 'Asky Airlines');
    verifier('paramètre encore utilisé non supprimable',
      (await srv.appel(`${M}/parametres/${asky.id}`, { method: 'DELETE' })).statut === 400);

    // ── Groupes d'items ──
    const g1 = await srv.appel(`${M}/parametres`, {
      method: 'POST', body: JSON.stringify({ type: 'groupes', label: 'Documents de bord' }),
    });
    verifier('groupe d’items créé', g1.statut === 201 && g1.corps.code === 'documents_de_bord',
      g1.corps.code || g1.corps.error);
    verifier('groupe en double refusé',
      (await srv.appel(`${M}/parametres`, {
        method: 'POST', body: JSON.stringify({ type: 'groupes', label: 'Documents de bord' }),
      })).corps.error === 'existant');

    const item = await srv.appel(`${M}/parametres`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'items', code: 'Z01', label: 'Carnet de route',
        cat: 'documents_de_bord', description: 'Présence et tenue du carnet de route à bord.',
      }),
    });
    verifier('item créé avec groupe et description', item.statut === 201);
    const itemLu = (await srv.appel(`${M}/parametres`)).corps.familles.items
      .find((x) => x.id === item.corps.id);
    verifier('description conservée', /carnet de route/i.test(itemLu.description || ''), itemLu.description);
    verifier('groupe conservé', itemLu.cat === 'documents_de_bord', itemLu.cat);

    // Renommer un groupe ne détache pas ses items : ils portent son code.
    await srv.appel(`${M}/parametres/${g1.corps.id}`, {
      method: 'PUT', body: JSON.stringify({ label: 'Documents de bord (révisé)' }),
    });
    const apresRenommage = (await srv.appel(`${M}/parametres`)).corps.familles;
    verifier('renommer un groupe ne change pas son code',
      apresRenommage.groupes.find((x) => x.id === g1.corps.id).code === 'documents_de_bord');
    verifier('l’item reste rattaché après renommage',
      apresRenommage.items.find((x) => x.id === item.corps.id).cat === 'documents_de_bord');

    verifier('groupe portant des items non supprimable',
      (await srv.appel(`${M}/parametres/${g1.corps.id}`, { method: 'DELETE' })).statut === 400);
    await srv.appel(`${M}/parametres/${item.corps.id}`, { method: 'DELETE' });
    verifier('groupe vidé de ses items supprimable',
      (await srv.appel(`${M}/parametres/${g1.corps.id}`, { method: 'DELETE' })).statut === 200);

    // ── Fiche d'inspection (POI) ──
    // La fiche naît en brouillon et ne produit rien ; validée, elle écrit
    // l'inspection et ses écarts, c'est-à-dire ce que les états lisent.
    const ctxPoi = await srv.appel(`${M}/poi/contexte`);
    verifier('contexte du formulaire servi', ctxPoi.statut === 200);
    verifier('les 54 items alimentent le formulaire', ctxPoi.corps.items.length === 54,
      String(ctxPoi.corps.items.length));
    verifier('les items du formulaire portent le code du paramétrage',
      ctxPoi.corps.items.every((i) => /^[A-E]\d\d$/.test(i.code)));
    verifier('les items sont rattachés à un groupe d’items',
      ctxPoi.corps.items.every((i) => ctxPoi.corps.groupes.some((g) => g.code === i.groupe)));
    verifier('catégories d’écart proposées', ctxPoi.corps.categories.length === 4);
    verifier('classes d’action complétées pour le formulaire',
      ['0', '1', '2', '3a', '3b', '3c', '3d'].every((c) =>
        ctxPoi.corps.actions.some((a) => a.code === c)),
      ctxPoi.corps.actions.map((a) => a.code).join(' '));
    verifier('inspecteurs du référentiel servis au formulaire',
      Array.isArray(ctxPoi.corps.inspecteurs) && ctxPoi.corps.inspecteurs.length > 0
      && ctxPoi.corps.inspecteurs.every((i) => i.nom && 'numero' in i && 'specialite' in i && 'niveau' in i),
      JSON.stringify((ctxPoi.corps.inspecteurs || [])[0] || null));
    verifier('seul le personnel inspecteur et actif est proposé',
      ctxPoi.corps.inspecteurs.length === 2
      && ctxPoi.corps.inspecteurs.every((i) => i.nom !== 'YACINTE' && i.nom !== 'SIMADIN'),
      ctxPoi.corps.inspecteurs.map((i) => i.nom).join(' '));
    verifier('spécialité et niveau rendus en clair',
      ctxPoi.corps.inspecteurs.some((i) => /SAFA|trafic/i.test(i.specialite))
      && ctxPoi.corps.inspecteurs.some((i) => i.niveau === 'Senior'),
      JSON.stringify(ctxPoi.corps.inspecteurs.map((i) => `${i.numero}/${i.specialite}/${i.niveau}`)));
    verifier('référentiels d’inspection servis',
      ctxPoi.corps.standards.map((s) => s.code).join('') === 'IMN');
    verifier('listes du paramétrage servies au formulaire',
      ctxPoi.corps.exploitants.length > 0 && ctxPoi.corps.aeroports.length === 51
      && ctxPoi.corps.pays.length === 249 && ctxPoi.corps.aeronefs.length > 900);

    const ficheVide = await srv.appel(`${M}/poi`, { method: 'POST', body: '{}' });
    verifier('fiche créée en brouillon', ficheVide.statut === 201
      && /^POI-\d{4}$/.test(ficheVide.corps.reference), ficheVide.corps.reference);
    verifier('fiche incomplète non soumissible',
      (await srv.appel(`${M}/poi/${ficheVide.corps.id}/soumettre`, { method: 'POST', body: '{}' })).statut === 400);
    verifier('fiche non soumise non validable',
      (await srv.appel(`${M}/poi/${ficheVide.corps.id}/valider`, { method: 'POST', body: '{}' })).statut === 400);
    verifier('brouillon supprimé',
      (await srv.appel(`${M}/poi/${ficheVide.corps.id}`, { method: 'DELETE' })).statut === 200);

    const fiche = await srv.appel(`${M}/poi`, {
      method: 'POST',
      body: JSON.stringify({
        entete: {
          date: '2026-08-20', etat_inspection: 'Togo', place: 'Lomé (DXXX)',
          exploitant: 'Asky Airlines', aeronef: 'B738', immatriculation: '5V-TAA',
          vol_depuis: 'KP001', type_inspection: 'SAFA',
        },
        items: {
          A01: { controle: true, remarque: 'RAS' },
          A05: { controle: true, ecart: { categorie: '2', standard: 'I', description: 'Checklist périmée', action: '2', suivi: 'Clôturé' } },
          B04: { controle: true, ecart: { categorie: '1', description: 'Extincteur mal arrimé' } },
          // Item inconnu du paramétrage : il ne doit pas entrer dans la fiche.
          ZZ9: { controle: true },
        },
        classe_action: '3a', inspecteurs: 'AGBEKO K.',
        equipe: [{ id: 'x1', nom: 'AGBEKO', prenom: 'Kodjo', numero: 'INS-OPS-04',
          specialite: 'Inspection sur Air de trafic (SAFA/SANA)', niveau: 'Senior' }],
      }),
    });
    verifier('fiche renseignée créée', fiche.statut === 201);
    const detail = await srv.appel(`${M}/poi/${fiche.corps.id}`);
    verifier('équipe d’inspection conservée sur la fiche',
      (detail.corps.equipe || []).length === 1
      && detail.corps.equipe[0].numero === 'INS-OPS-04'
      && detail.corps.equipe[0].niveau === 'Senior');
    verifier('item hors paramétrage écarté', !detail.corps.items.ZZ9 && !!detail.corps.items.A01);
    verifier('constat retenu par sa catégorie',
      detail.corps.items.A05.ecart.categorie === '2' && detail.corps.items.A01.ecart === null);

    // ── Circuit : soumission, renvoi, validation ──
    verifier('validation refusée avant soumission',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/valider`, { method: 'POST', body: '{}' })).statut === 400);
    verifier('fiche soumise',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/soumettre`, { method: 'POST', body: '{}' })).statut === 200);
    verifier('étape « validation » atteinte',
      (await srv.appel(`${M}/poi`)).corps.poi.find((p) => p.id === fiche.corps.id).etape === 'validation');
    verifier('fiche soumise non modifiable',
      (await srv.appel(`${M}/poi/${fiche.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ inspecteurs: 'X' }),
      })).statut === 400);
    verifier('soumission non rejouable',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/soumettre`, { method: 'POST', body: '{}' })).statut === 400);
    // ── Commentaires de validation ──
    verifier('commentaires enregistrés sur une fiche soumise',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/commentaires`, {
        method: 'PUT',
        body: JSON.stringify({ entrees: [
          { cible: 'item.B04', texte: 'Préciser la nature du défaut' },
          { cible: 'general', texte: 'Joindre la photo du panneau' },
          { cible: 'entete.aoc', texte: '   ' },
        ] }),
      })).statut === 200);
    const avecCommentaires = await srv.appel(`${M}/poi/${fiche.corps.id}`);
    verifier('version en cours ouverte, entrées vides écartées',
      avecCommentaires.corps.commentaires.length === 1
      && avecCommentaires.corps.commentaires[0].entrees.length === 2
      && !avecCommentaires.corps.commentaires[0].close_le);
    verifier('auteur de la soumission rendu en clair',
      !!avecCommentaires.corps.soumis_par_nom
      && avecCommentaires.corps.soumis_par_nom !== avecCommentaires.corps.soumis_par,
      `${avecCommentaires.corps.soumis_par} → ${avecCommentaires.corps.soumis_par_nom}`);
    verifier('commentaires modifiables tant que la fiche est soumise',
      avecCommentaires.corps.commentaires_modifiables === true);
    verifier('réécriture de la version en cours, sans nouvelle version',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/commentaires`, {
        method: 'PUT', body: JSON.stringify({ entrees: [{ cible: 'general', texte: 'Revu' }] }),
      })).statut === 200
      && (await srv.appel(`${M}/poi/${fiche.corps.id}`)).corps.commentaires.length === 1);

    verifier('fiche renvoyée à l’inspecteur',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/renvoyer`, {
        method: 'POST', body: JSON.stringify({ motif: 'Préciser le constat B04' }),
      })).statut === 200);
    const detailRenvoi = await srv.appel(`${M}/poi/${fiche.corps.id}`);
    verifier('le renvoi fige la version de commentaires',
      detailRenvoi.corps.commentaires[0].close_le
      && detailRenvoi.corps.commentaires[0].issue === 'renvoi'
      && detailRenvoi.corps.commentaires_modifiables === false);
    verifier('commentaires refusés hors étape de validation',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/commentaires`, {
        method: 'PUT', body: JSON.stringify({ entrees: [] }),
      })).statut === 400);
    const renvoyee = (await srv.appel(`${M}/poi`)).corps.poi.find((p) => p.id === fiche.corps.id);
    verifier('renvoi ramène au brouillon, motif conservé',
      renvoyee.statut === 'brouillon' && renvoyee.etape === 'soumission'
      && renvoyee.motif_renvoi === 'Préciser le constat B04');
    verifier('fiche renvoyée de nouveau modifiable',
      (await srv.appel(`${M}/poi/${fiche.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ entete: renvoyee.entete, items: detail.corps.items,
          classe_action: '3a', inspecteurs: 'AGBEKO K.' }),
      })).statut === 200);
    verifier('renvoi impossible hors soumission',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/renvoyer`, { method: 'POST', body: '{}' })).statut === 400);
    await srv.appel(`${M}/poi/${fiche.corps.id}/soumettre`, { method: 'POST', body: '{}' });

    // Un second tour ouvre une nouvelle version, sans toucher à la première.
    await srv.appel(`${M}/poi/${fiche.corps.id}/commentaires`, {
      method: 'PUT', body: JSON.stringify({ entrees: [{ cible: 'general', texte: 'Deuxième lecture' }] }),
    });
    const deuxVersions = await srv.appel(`${M}/poi/${fiche.corps.id}`);
    verifier('nouvelle version au tour suivant',
      deuxVersions.corps.commentaires.length === 2
      && deuxVersions.corps.commentaires[1].version === 2
      && deuxVersions.corps.commentaires[0].issue === 'renvoi');

    const inspectionsAvant = (await srv.appel(`${M}/inspections`)).corps.length;
    const validation = await srv.appel(`${M}/poi/${fiche.corps.id}/valider`, { method: 'POST', body: '{}' });
    verifier('fiche validée', validation.statut === 201, JSON.stringify(validation.corps));
    verifier('trois items contrôlés reportés', validation.corps.items === 3);
    verifier('deux écarts reportés', validation.corps.ecarts === 2);

    const inspections = await srv.appel(`${M}/inspections`);
    verifier('une inspection de plus aux états', inspections.corps.length === inspectionsAvant + 1);
    const nee = inspections.corps.find((i) => i.id === validation.corps.inspection_id);
    verifier('l’inspection porte les clés de la fiche',
      nee.date === '2026-08-20' && nee.pays === 'Togo' && nee.exploitant === 'Asky Airlines'
      && nee.aeronef === 'B738' && nee.immatriculation === '5V-TAA' && nee.vol === 'KP001');
    verifier('items inspectés comptés', nee.itemsInspectes === 3, String(nee.itemsInspectes));
    verifier('inspection ouverte tant qu’il y a des écarts', nee.status === 'Ouvert', nee.status);
    verifier('l’inspection renvoie à sa fiche',
      nee.origine === 'poi' && nee.poi_reference === fiche.corps.reference);
    verifier('écarts rattachés aux items SAFA',
      nee.anomalies.map((a) => a.itemCode).sort().join(',') === 'A05,B04');
    verifier('écart sans action propre reprend la classe d’action de la fiche',
      nee.anomalies.find((a) => a.itemCode === 'B04').action === '3a');
    verifier('écart avec action propre la conserve',
      nee.anomalies.find((a) => a.itemCode === 'A05').action === '2');
    verifier('statut du constat reporté sur l’écart',
      nee.anomalies.find((a) => a.itemCode === 'A05').suivi === 'Clôturé',
      JSON.stringify(nee.anomalies.map((a) => `${a.itemCode}:${a.suivi}`)));
    const apresValidation = await srv.appel(`${M}/poi/${fiche.corps.id}`);
    verifier('la validation fige la version de commentaires',
      apresValidation.corps.commentaires[1].issue === 'validation'
      && !!apresValidation.corps.commentaires[1].close_le);
    verifier('validateur rendu en clair', !!apresValidation.corps.valide_par_nom);
    verifier('fiche validée verrouillée',
      (await srv.appel(`${M}/poi/${fiche.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ inspecteurs: 'AUTRE' }),
      })).statut === 400);
    verifier('validation non rejouable',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/valider`, { method: 'POST', body: '{}' })).statut === 400);
    verifier('fiche listée avec ses compteurs',
      (await srv.appel(`${M}/poi`)).corps.poi.find((p) => p.id === fiche.corps.id).ecarts === 2);
    verifier('fiche inconnue introuvable',
      (await srv.appel(`${M}/poi/inexistant`)).statut === 404);

    // ── Pièces jointes et transmission ──
    const pieces = await srv.appel(`${M}/poi/${fiche.corps.id}/pieces`);
    verifier('pièces d’une fiche listées', pieces.statut === 200
      && Array.isArray(pieces.corps.pieces) && pieces.corps.pieces.length === 0);
    verifier('pièces modifiables tant que la fiche n’est pas transmise',
      pieces.corps.modifiable === true);
    verifier('pièce inconnue introuvable',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/pieces/inexistante`, { method: 'DELETE' })).statut === 404);
    // Une pièce déposée : elle suivra la fiche jusqu'au partage.
    const frPiece = '----oasis-piece';
    const depotPiece = await srv.appel(`${M}/poi/${fiche.corps.id}/pieces`, {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${frPiece}` },
      body: [`--${frPiece}`, 'Content-Disposition: form-data; name="file"; filename="lettre.pdf"',
        'Content-Type: application/pdf', '', '%PDF-1.4 piece', `--${frPiece}--`, ''].join('\r\n'),
    });
    verifier('pièce déposée sur la fiche', depotPiece.statut === 201, `statut ${depotPiece.statut}`);

    // ── Communications écrites (classe 2 ou 3) ──
    verifier('transmission refusée sans communication écrite en classe 3',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/transmettre`, {
        method: 'POST', body: '{}',
      })).statut === 400);
    verifier('destinataire manquant refusé',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/communiquer`, {
        method: 'POST', body: JSON.stringify({ cible: 'exploitant', objet: 'Test' }),
      })).statut === 400);
    verifier('adresse invalide refusée',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/communiquer`, {
        method: 'POST',
        body: JSON.stringify({ cible: 'exploitant', destinataire: 'pas-une-adresse', objet: 'Test' }),
      })).statut === 400);
    const communication = await srv.appel(`${M}/poi/${fiche.corps.id}/communiquer`, {
      method: 'POST',
      body: JSON.stringify({
        cible: 'exploitant', destinataire: 'qse@asky.test',
        copie: 'ops@asky.test', objet: 'Inspection SAFA — POI', message: 'Lettre type.',
      }),
    });
    verifier('communication à l’exploitant consignée', communication.statut === 200,
      JSON.stringify(communication.corps).slice(0, 160));
    // La lettre est consignée quoi qu'il arrive : partie si un serveur de
    // messagerie répond, consignée avec son motif d'échec sinon — l'agent la
    // relaie alors autrement, et la fiche en garde trace. Le contrôle ne
    // suppose donc pas l'absence de serveur SMTP sur la machine de test.
    verifier('sort de l’envoi rapporté sans perdre la communication',
      communication.corps.envoye === true
      || (communication.corps.envoye === false && !!communication.corps.erreur),
      JSON.stringify({ envoye: communication.corps.envoye, erreur: communication.corps.erreur }));
    const ficheCom = await srv.appel(`${M}/poi/${fiche.corps.id}`);
    verifier('communication portée par la fiche',
      (ficheCom.corps.communications || []).length === 1
      && ficheCom.corps.communications[0].cible === 'exploitant'
      && ficheCom.corps.communications[0].destinataire === 'qse@asky.test');
    // La seconde communication — à l'autorité de surveillance — vaut
    // transmission : la fiche n'attend plus qu'on la déclare partie.
    const versAutorite = await srv.appel(`${M}/poi/${fiche.corps.id}/communiquer`, {
      method: 'POST',
      body: JSON.stringify({
        cible: 'autorite', destinataire: 'aac@etat.test',
        objet: 'Inspection SAFA — autorité', message: 'Lettre type.',
      }),
    });
    verifier('les deux communications parties valent transmission',
      versAutorite.statut === 200 && versAutorite.corps.transmise === true,
      JSON.stringify(versAutorite.corps).slice(0, 120));
    verifier('la fiche porte son horodatage de transmission',
      !!(await srv.appel(`${M}/poi/${fiche.corps.id}`)).corps.transmis_le);
    // La route de transmission manuelle refuse alors : c'est déjà fait.
    verifier('transmission manuelle sans objet une fois la fiche partie',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/transmettre`, {
        method: 'POST', body: JSON.stringify({ destinataire: 'X' }),
      })).statut === 400);

    const apresTransmission = await srv.appel(`${M}/poi/${fiche.corps.id}/pieces`);
    verifier('pièces figées après transmission', apresTransmission.corps.modifiable === false);
    verifier('suppression d’une pièce refusée après transmission',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/pieces/inexistante`, { method: 'DELETE' })).statut === 403);
    verifier('transmission non rejouable',
      (await srv.appel(`${M}/poi/${fiche.corps.id}/transmettre`, { method: 'POST', body: '{}' })).statut === 400);
    const listeApres = (await srv.appel(`${M}/poi`)).corps.poi.find((p) => p.id === fiche.corps.id);
    verifier('date et destinataires de transmission conservés',
      !!listeApres.transmis_le
      && listeApres.transmis_a === 'qse@asky.test, aac@etat.test', listeApres.transmis_a);
    verifier('circuit achevé : étape « transmise »', listeApres.etape === 'transmise');

    // Une fiche encore en brouillon ne se transmet pas.
    const brouillon = await srv.appel(`${M}/poi`, {
      method: 'POST',
      body: JSON.stringify({ entete: { date: '2026-08-21', etat_inspection: 'Togo' } }),
    });
    verifier('étape « soumission » sur un brouillon',
      (await srv.appel(`${M}/poi`)).corps.poi.find((p) => p.id === brouillon.corps.id).etape === 'soumission');
    verifier('brouillon non transmissible',
      (await srv.appel(`${M}/poi/${brouillon.corps.id}/transmettre`, { method: 'POST', body: '{}' })).statut === 400);
    await srv.appel(`${M}/poi/${brouillon.corps.id}`, { method: 'DELETE' });

    // ── Pays ──
    const pays = await srv.appel(`${M}/pays`);
    verifier('249 pays amorcés', pays.corps.pays.length === 249, pays.corps.pays.length);
    verifier('pays triés par nom',
      pays.corps.pays.every((p, i) => i === 0
        || String(p.nom).localeCompare(pays.corps.pays[i - 1].nom, 'fr') >= 0));
    verifier('bigramme ISO sur chaque pays',
      pays.corps.pays.every((p) => /^[A-Z]{2}$/.test(p.iso2)));
    verifier('bigrammes uniques',
      new Set(pays.corps.pays.map((p) => p.iso2)).size === pays.corps.pays.length);
    const membres = pays.corps.pays.filter((p) => p.uemoa);
    verifier('huit membres de l’UEMOA marqués', membres.length === 8,
      membres.map((p) => p.iso2).join(' '));
    verifier('AAC renseignée pour chaque membre de l’UEMOA',
      membres.every((p) => p.aac && p.adresse && p.emails.length),
      membres.filter((p) => !(p.aac && p.adresse && p.emails.length)).map((p) => p.iso2).join(' '));
    const togo = pays.corps.pays.find((p) => p.iso2 === 'TG');
    verifier('Togo renseigné', !!togo && /ANAC/.test(togo.aac) && togo.site.includes('anac-togo'),
      togo && togo.aac);
    verifier('plusieurs emails possibles',
      pays.corps.pays.some((p) => p.emails.length > 1));

    const nouveauPays = await srv.appel(`${M}/pays`, {
      method: 'POST',
      body: JSON.stringify({ nom: 'Essaie-Land', iso2: 'zz', aac: 'AAC Essai',
        emails: 'a@essai.test ; b@essai.test', uemoa: true }),
    });
    verifier('pays créé', nouveauPays.statut === 201);
    const cree = (await srv.appel(`${M}/pays`)).corps.pays.find((p) => p.id === nouveauPays.corps.id);
    verifier('bigramme mis en capitales', cree.iso2 === 'ZZ');
    verifier('emails éclatés en liste',
      cree.emails.length === 2 && cree.emails[1] === 'b@essai.test', JSON.stringify(cree.emails));
    verifier('appartenance UEMOA retenue', cree.uemoa === true);
    verifier('bigramme en double refusé',
      (await srv.appel(`${M}/pays`, {
        method: 'POST', body: JSON.stringify({ nom: 'Autre', iso2: 'ZZ' }),
      })).statut === 400);
    verifier('bigramme à trois lettres refusé',
      (await srv.appel(`${M}/pays`, {
        method: 'POST', body: JSON.stringify({ nom: 'Autre', iso2: 'ZZZ' }),
      })).statut === 400);
    verifier('pays sans nom refusé',
      (await srv.appel(`${M}/pays`, {
        method: 'POST', body: JSON.stringify({ iso2: 'ZY' }),
      })).statut === 400);
    verifier('appartenance UEMOA modifiable seule',
      (await srv.appel(`${M}/pays/${cree.id}`, {
        method: 'PUT', body: JSON.stringify({ uemoa: false }),
      })).statut === 200);
    verifier('appartenance retirée',
      (await srv.appel(`${M}/pays`)).corps.pays.find((p) => p.id === cree.id).uemoa === false);
    verifier('pays désactivable',
      (await srv.appel(`${M}/pays/${cree.id}/actif`, { method: 'PUT', body: '{}' })).corps.actif === false);
    verifier('pays supprimé',
      (await srv.appel(`${M}/pays/${cree.id}`, { method: 'DELETE' })).statut === 200);
    verifier('pays inconnu introuvable',
      (await srv.appel(`${M}/pays/inexistant`, { method: 'DELETE' })).statut === 404);

    // ── Aéroports ──
    const apt = await srv.appel(`${M}/aeroports`);
    verifier('aéroports amorcés', apt.corps.aeroports.length === 51, apt.corps.aeroports.length);
    verifier('aéroports triés par pays puis intitulé',
      apt.corps.aeroports.every((a, i) => i === 0
        || String(a.pays).localeCompare(apt.corps.aeroports[i - 1].pays, 'fr') >= 0));
    verifier('huit pays représentés',
      new Set(apt.corps.aeroports.map((a) => a.pays)).size === 8);
    verifier('code OACI et statut portés',
      apt.corps.aeroports.every((a) => a.code && a.statut));
    const lome = apt.corps.aeroports.find((a) => a.code === 'DXXX');
    verifier('aéroport de Lomé au dispositif',
      !!lome && lome.pays === 'Togo' && /Gnassingbé/.test(lome.nom), lome && lome.nom);
    // Deux intitulés du classeur portaient une parenthèse fermante orpheline.
    verifier('intitulés nettoyés de leurs parenthèses orphelines',
      apt.corps.aeroports.every((a) => a.nom.split(')').length - 1
        === a.nom.split('(').length - 1));

    const nouvelAeroport = await srv.appel(`${M}/aeroports`, {
      method: 'POST',
      body: JSON.stringify({ pays: 'Togo', nom: 'Essai', code: 'dxes', statut: 'National' }),
    });
    verifier('aéroport créé', nouvelAeroport.statut === 201);
    verifier('code OACI mis en capitales',
      (await srv.appel(`${M}/aeroports`)).corps.aeroports
        .find((a) => a.id === nouvelAeroport.corps.id).code === 'DXES');
    verifier('code OACI en double refusé',
      (await srv.appel(`${M}/aeroports`, {
        method: 'POST', body: JSON.stringify({ pays: 'Togo', nom: 'Autre', code: 'DXES' }),
      })).statut === 400);
    verifier('aéroport sans pays refusé',
      (await srv.appel(`${M}/aeroports`, {
        method: 'POST', body: JSON.stringify({ nom: 'Sans pays' }),
      })).statut === 400);
    verifier('aéroport sans intitulé refusé',
      (await srv.appel(`${M}/aeroports`, {
        method: 'POST', body: JSON.stringify({ pays: 'Togo' }),
      })).statut === 400);
    verifier('aéroport modifiable',
      (await srv.appel(`${M}/aeroports/${nouvelAeroport.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ statut: 'International' }),
      })).statut === 200);
    verifier('modification vers un code déjà pris refusée',
      (await srv.appel(`${M}/aeroports/${nouvelAeroport.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ code: 'DXXX' }),
      })).statut === 400);
    verifier('aéroport désactivable',
      (await srv.appel(`${M}/aeroports/${nouvelAeroport.corps.id}/actif`, {
        method: 'PUT', body: '{}',
      })).corps.actif === false);
    verifier('aéroport supprimé',
      (await srv.appel(`${M}/aeroports/${nouvelAeroport.corps.id}`, { method: 'DELETE' })).statut === 200);
    verifier('aéroport inconnu introuvable',
      (await srv.appel(`${M}/aeroports/inexistant`, { method: 'DELETE' })).statut === 404);
    verifier('liste revenue à son état initial',
      (await srv.appel(`${M}/aeroports`)).corps.aeroports.length === 51);

    // ── Nomenclature des aéronefs ──
    // Près de dix mille lignes, servies par pages de désignations : on vérifie
    // que la pagination ne coupe pas un groupe, que les filtres se croisent et
    // que les facettes suivent le filtre courant.
    const aer1 = await srv.appel(`${M}/aeronefs`);
    verifier('nomenclature des aéronefs amorcée', aer1.corps.total > 9000, aer1.corps.total);
    verifier('nomenclature paginée par désignation',
      aer1.corps.pages > 1 && aer1.corps.lignes.length >= aer1.corps.taille_page,
      `${aer1.corps.pages} pages`);
    verifier('lignes triées par désignation',
      aer1.corps.lignes.every((a, i) => i === 0
        || a.designation.localeCompare(aer1.corps.lignes[i - 1].designation, 'fr') >= 0));
    // Une désignation ne se retrouve pas à cheval sur deux pages.
    const desPage1 = new Set(aer1.corps.lignes.map((a) => a.designation));
    const aer2 = await srv.appel(`${M}/aeronefs?page=2`);
    verifier('une désignation ne chevauche pas deux pages',
      aer2.corps.lignes.every((a) => !desPage1.has(a.designation)));
    verifier('facettes servies avec la page',
      aer1.corps.designations.length === aer1.corps.total_designations
      && aer1.corps.constructeurs.length > 0 && aer1.corps.etats.length > 0);

    const unAeronef = aer1.corps.lignes[0];
    const parDesignation = await srv.appel(`${M}/aeronefs?designation=${encodeURIComponent(unAeronef.designation)}`);
    verifier('filtre par désignation',
      parDesignation.corps.lignes.every((a) => a.designation === unAeronef.designation)
      && parDesignation.corps.total_designations === 1);
    // Une liste déroulante ne se réduit pas à sa propre sélection — on doit
    // pouvoir changer de désignation sans repasser par la remise à zéro — mais
    // les autres se restreignent bien à ce que la désignation laisse voir.
    verifier('liste des désignations non réduite à sa propre sélection',
      parDesignation.corps.designations.length === aer1.corps.total_designations);
    verifier('facettes voisines restreintes par le filtre',
      parDesignation.corps.constructeurs.length < aer1.corps.constructeurs.length);
    const parRecherche = await srv.appel(`${M}/aeronefs?q=${encodeURIComponent(unAeronef.constructeur)}`);
    verifier('recherche plein texte sur la nomenclature',
      parRecherche.corps.total > 0 && parRecherche.corps.total < aer1.corps.total);
    verifier('recherche sans réponse rendue vide',
      (await srv.appel(`${M}/aeronefs?q=zzzzintrouvable`)).corps.total === 0);

    const nouvelAeronef = await srv.appel(`${M}/aeronefs`, {
      method: 'POST',
      body: JSON.stringify({
        designation: 'zz9', modele: 'Essai-1', constructeur: 'ESSAI', etat_conception: 'TOGO',
      }),
    });
    verifier('aéronef créé', nouvelAeronef.statut === 201);
    verifier('désignation mise en capitales',
      (await srv.appel(`${M}/aeronefs?q=Essai-1`)).corps.lignes[0].designation === 'ZZ9');
    verifier('aéronef en double refusé',
      (await srv.appel(`${M}/aeronefs`, {
        method: 'POST',
        body: JSON.stringify({
          designation: 'ZZ9', modele: 'Essai-1', constructeur: 'ESSAI', etat_conception: 'TOGO',
        }),
      })).corps.error === 'existant');
    verifier('aéronef sans modèle refusé',
      (await srv.appel(`${M}/aeronefs`, {
        method: 'POST', body: JSON.stringify({ designation: 'ZZ8' }),
      })).statut === 400);
    verifier('aéronef modifiable',
      (await srv.appel(`${M}/aeronefs/${nouvelAeronef.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ constructeur: 'ESSAI II' }),
      })).statut === 200);
    verifier('aéronef désactivable',
      (await srv.appel(`${M}/aeronefs/${nouvelAeronef.corps.id}/actif`, {
        method: 'PUT', body: '{}',
      })).corps.actif === false);
    verifier('filtre sur les inactifs',
      (await srv.appel(`${M}/aeronefs?actif=0`)).corps.total === 1);
    verifier('aéronef supprimé',
      (await srv.appel(`${M}/aeronefs/${nouvelAeronef.corps.id}`, { method: 'DELETE' })).statut === 200);
    verifier('aéronef inconnu introuvable',
      (await srv.appel(`${M}/aeronefs/inexistant`, { method: 'DELETE' })).statut === 404);
    verifier('les aéronefs ne sont plus une famille de paramètres',
      !(await srv.appel(`${M}/parametres`)).corps.familles.aeronefs);

    // ── Plan d'actions correctives et preuves d'un écart ──
    const inspectionsPac = (await srv.appel(`${M}/inspections`)).corps;
    const ecartPac = inspectionsPac.flatMap((i) => i.anomalies || [])[0];
    verifier('un écart disponible pour le suivi', !!ecartPac);
    verifier('plan enregistré sans soumission',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/pac`, {
        method: 'PUT',
        body: JSON.stringify({ cause_primaire: 'Procédure non appliquée' }),
      })).corps.soumis === false);
    verifier('soumission refusée sans action',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/pac`, {
        method: 'PUT', body: JSON.stringify({ soumettre: true }),
      })).statut === 400);
    verifier('plan soumis',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/pac`, {
        method: 'PUT',
        body: JSON.stringify({
          action_curative: 'Checklist remplacée', curative_date_prevue: '2026-09-05',
          actions_correctives: 'Contrôle mensuel des trousses de bord',
          corrective_date_prevue: '2026-10-01', soumettre: true,
        }),
      })).corps.soumis === true);
    const apresPac = (await srv.appel(`${M}/inspections`)).corps
      .flatMap((i) => i.anomalies || []).find((a) => a.id === ecartPac.id);
    verifier('plan porté par l’écart, avec date et auteur',
      apresPac.pac.cause_primaire === 'Procédure non appliquée'
      && apresPac.pac.actions_correctives === 'Contrôle mensuel des trousses de bord'
      && !!apresPac.pac.soumis_le && !!apresPac.pac.soumis_par);
    // Le suivi déjà renseigné à l'inspection ne bouge pas : la soumission du
    // plan ne remplace pas un constat déclaré clos sur place.
    verifier('suivi existant préservé par la soumission du plan',
      apresPac.suivi === ecartPac.suivi || (!ecartPac.suivi && apresPac.suivi === 'En cours'),
      `${ecartPac.suivi || '(vide)'} → ${apresPac.suivi}`);
    // ── Évaluation et suivi par l'autorité ──
    verifier('acceptation du plan enregistrée',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/evaluation`, {
        method: 'PUT',
        body: JSON.stringify({ accepte: true, date_acceptation: '2026-09-02' }),
      })).corps.evaluation.acceptation.accepte === 'OUI');
    verifier('suivi vide refusé',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/evaluation/suivi`, {
        method: 'POST', body: JSON.stringify({ texte: '   ' }),
      })).statut === 400);
    verifier('suivi consigné',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/evaluation/suivi`, {
        method: 'POST', body: JSON.stringify({ texte: 'Preuves reçues, contrôle programmé' }),
      })).statut === 201);
    const avecEval = (await srv.appel(`${M}/inspections`)).corps
      .flatMap((i) => i.anomalies || []).find((a) => a.id === ecartPac.id);
    verifier('suivi daté et signé',
      (avecEval.evaluation.verification.suivis || []).length === 1
      && !!avecEval.evaluation.verification.suivis[0].date
      && !!avecEval.evaluation.verification.suivis[0].auteur);
    verifier('clôture prononcée solde l’écart',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/evaluation`, {
        method: 'PUT',
        body: JSON.stringify({ mise_oeuvre_effective: true, date_solde: '2026-10-10', solde_par: 'AAC Togo' }),
      })).statut === 200);
    const solde = (await srv.appel(`${M}/inspections`)).corps
      .flatMap((i) => i.anomalies || []).find((a) => a.id === ecartPac.id);
    verifier('écart soldé au suivi',
      solde.suivi === 'Clôturé' && solde.evaluation.cloture.solde_par === 'AAC Togo');
    verifier('évaluation refusée sur un écart inconnu',
      (await srv.appel(`${M}/ecarts/inexistant/evaluation`, { method: 'PUT', body: '{}' })).statut === 404);

    verifier('preuve inconnue introuvable',
      (await srv.appel(`${M}/ecarts/${ecartPac.id}/preuves/inexistante`, { method: 'DELETE' })).statut === 404);
    verifier('plan refusé sur un écart inconnu',
      (await srv.appel(`${M}/ecarts/inexistant/pac`, { method: 'PUT', body: '{}' })).statut === 404);

    // ── Contacts ──
    const c1 = await srv.appel(`${M}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ etat: 'Togo', nom: 'KOFFI', prenom: 'Ama', fonction: 'Coordonnatrice' }),
    });
    verifier('contact créé', c1.statut === 201);
    verifier('contact sans nom refusé',
      (await srv.appel(`${M}/contacts`, {
        method: 'POST', body: JSON.stringify({ etat: 'Togo', prenom: 'X' }),
      })).statut === 400);
    verifier('contact désactivable',
      (await srv.appel(`${M}/contacts/${c1.corps.id}/actif`, { method: 'PUT', body: '{}' })).corps.actif === false);
    verifier('contacts listés', (await srv.appel(`${M}/contacts`)).corps.length === 1);
    verifier('contact supprimé',
      (await srv.appel(`${M}/contacts/${c1.corps.id}`, { method: 'DELETE' })).statut === 200);

    // ── Dépôts ──
    verifier('aucun dépôt au départ', (await srv.appel(`${M}/depots`)).corps.length === 0);
    verifier('dépôt inconnu introuvable',
      (await srv.appel(`${M}/depots/inexistant`, { method: 'DELETE' })).statut === 404);

    // ── Exports ──
    const exportInsp = await srv.appel(`${M}/inspections/export-xlsx`, {
      method: 'POST', body: JSON.stringify({ filtres: {} }),
    });
    verifier('export des inspections servi', exportInsp.statut === 200);
    const exportEcarts = await srv.appel(`${M}/ecarts/export-xlsx`, {
      method: 'POST', body: JSON.stringify({ filtres: {} }),
    });
    verifier('export des écarts servi', exportEcarts.statut === 200);
    verifier('modèle d’import servi', (await srv.appel(`${M}/import/modele`)).statut === 200);
    verifier('export d’une famille de paramètres servi',
      (await srv.appel(`${M}/parametres/export-xlsx`, {
        method: 'POST', body: JSON.stringify({ famille: 'items' }),
      })).statut === 200);
    verifier('export d’une famille inconnue refusé',
      (await srv.appel(`${M}/parametres/export-xlsx`, {
        method: 'POST', body: JSON.stringify({ famille: 'inconnue' }),
      })).statut === 400);

    // ── Communication entre États membres ──
    // Une requête porte sur une inspection, parfois sur un écart précis ; elle
    // s'adresse à plusieurs États, accepte des échanges, et se referme.
    const inspCom = (await srv.appel(`${M}/inspections`)).corps[0] || {};
    const reqCreee = await srv.appel(`${M}/requetes`, {
      method: 'POST',
      body: JSON.stringify({
        objet: 'Suivi de l’écart A05', message: 'Merci de préciser les mesures prises.',
        etats_destinataires: ['Togo', 'Sénégal'], etat_emetteur: 'Bénin',
        inspection_id: inspCom.id, ecart_id: (inspCom.anomalies || [])[0] && inspCom.anomalies[0].id,
      }),
    });
    verifier('requête créée', reqCreee.statut === 201 && !!reqCreee.corps.id, reqCreee.corps.error);
    verifier('objet requis', (await srv.appel(`${M}/requetes`, {
      method: 'POST', body: JSON.stringify({ message: 'x', etats_destinataires: ['Togo'] }),
    })).statut === 400);
    verifier('au moins un État destinataire', (await srv.appel(`${M}/requetes`, {
      method: 'POST', body: JSON.stringify({ objet: 'x', message: 'y', etats_destinataires: [] }),
    })).statut === 400);

    const reqId = reqCreee.corps.id;
    const fil = await srv.appel(`${M}/requetes/${reqId}`);
    verifier('requête rattachée à son inspection',
      fil.statut === 200 && fil.corps.inspection_id === inspCom.id
      && !!fil.corps.objet_reference.exploitant,
      JSON.stringify(fil.corps.objet_reference || {}).slice(0, 80));
    verifier('deux États destinataires retenus',
      (fil.corps.etats_destinataires || []).join(',') === 'Togo,Sénégal');

    verifier('échange ajouté au fil',
      (await srv.appel(`${M}/requetes/${reqId}/echanges`, {
        method: 'POST', body: JSON.stringify({ message: 'Extincteur remplacé le 22/03.' }),
      })).statut === 201);
    verifier('message vide refusé',
      (await srv.appel(`${M}/requetes/${reqId}/echanges`, {
        method: 'POST', body: JSON.stringify({ message: '  ' }),
      })).statut === 400);
    verifier('le fil porte son échange',
      ((await srv.appel(`${M}/requetes/${reqId}`)).corps.echanges || []).length === 1);

    verifier('discussion close',
      (await srv.appel(`${M}/requetes/${reqId}/cloturer`, { method: 'POST', body: '{}' })).statut === 200);
    verifier('une discussion close n’accepte plus d’échange',
      (await srv.appel(`${M}/requetes/${reqId}/echanges`, {
        method: 'POST', body: JSON.stringify({ message: 'encore un mot' }),
      })).statut === 409);
    verifier('discussion rouverte',
      (await srv.appel(`${M}/requetes/${reqId}/rouvrir`, { method: 'POST', body: '{}' })).statut === 200);
    verifier('requête inconnue introuvable',
      (await srv.appel(`${M}/requetes/inexistante`)).statut === 404);

    // ── Partage d'une transmission ──
    // Ce qu'un État met à disposition d'un autre est une copie figée de sa
    // transmission : la lettre telle qu'elle est partie, et ses pièces.
    const poiValide = ((await srv.appel(`${M}/poi`)).corps.poi || []).find((x) => x.statut === 'validee');
    if (poiValide) {
      await srv.appel(`${M}/poi/${poiValide.id}/communiquer`, {
        method: 'POST',
        body: JSON.stringify({
          cible: 'autorite', destinataire: 'aac@exemple.org',
          objet: 'Communication de contrôle', message: 'Corps de la lettre.',
        }),
      });
      const partage = await srv.appel(`${M}/poi/${poiValide.id}/partager`, {
        method: 'POST',
        body: JSON.stringify({ etats: ['Togo', 'Mali'], elements: { autorite: true, pieces: true } }),
      });
      // Le partage désigne les pièces de la fiche sous le même nom de fichier,
      // sans copie.
      const paPiece = (srv.donnees('ramp').partages || []).find((x) => x.poi_id === poiValide.id) || {};
      const piecePartagee = (paPiece.pieces || [])[0];
      const cheminPiece = piecePartagee ? `uploads/ramp/poi/${piecePartagee.fichier}` : '';
      verifier('le partage emporte les pièces de la fiche',
        !!piecePartagee && srv.fichierExiste(cheminPiece), JSON.stringify(paPiece.pieces || []).slice(0, 80));
      verifier('partage sans État refusé',
        (await srv.appel(`${M}/poi/${poiValide.id}/partager`, {
          method: 'POST', body: JSON.stringify({ etats: [], elements: { autorite: true } }),
        })).statut === 400);
      // On n'écrit pas au nom d'un État qu'on ne représente pas : une
      // correspondance officielle engage l'autorité qui la signe.
      verifier('requête au nom d’un État inconnu refusée',
        (await srv.appel(`${M}/requetes`, {
          method: 'POST',
          body: JSON.stringify({
            objet: 'Usurpation', message: 'Test',
            etats_destinataires: ['Togo'], etat_emetteur: 'Atlantide',
          }),
        })).statut === 403);

      // Un État déjà servi ne reçoit pas une seconde copie de la même fiche.
      verifier('second partage au même État refusé',
        (await srv.appel(`${M}/poi/${poiValide.id}/partager`, {
          method: 'POST', body: JSON.stringify({ etats: ['Togo'], elements: { autorite: true } }),
        })).statut === 400);
      verifier('partage sans élément refusé',
        (await srv.appel(`${M}/poi/${poiValide.id}/partager`, {
          method: 'POST', body: JSON.stringify({ etats: ['Togo'], elements: {} }),
        })).statut === 400);

      const partages = await srv.appel(`${M}/partages`);
      const pa = (partages.corps.partages || [])[0] || {};
      verifier('partage listé avec sa copie figée',
        partages.statut === 200 && !!pa.reference
        && (pa.communications || []).some((c) => c.objet === 'Communication de contrôle'
          && c.cible === 'autorite'),
        JSON.stringify(pa.communications || []).slice(0, 80));
      verifier('destinataires du partage retenus',
        (pa.etats || []).join(',') === 'Togo,Mali', (pa.etats || []).join(','));
      verifier('les États destinataires sont ceux de l’UEMOA',
        (partages.corps.etats || []).length === 8, String((partages.corps.etats || []).length));
      verifier('partage inconnu introuvable',
        (await srv.appel(`${M}/partages/inexistant`)).statut === 404);

      // Le formulaire de partage rappelle ce qui est déjà mis à disposition,
      // et permet de le retirer État par État.
      const faits = await srv.appel(`${M}/poi/${poiValide.id}/partages`);
      verifier('partages d’une fiche listés pour son formulaire',
        faits.statut === 200 && (faits.corps.partages || []).length === 1
        && faits.corps.partages[0].rappelable === true,
        JSON.stringify(faits.corps.partages || []).slice(0, 90));
      // La fiche supprimée par le gestionnaire : ce qu'un partage désigne
      // encore reste pour l'État qui l'a reçu.
      verifier('fiche partagée supprimée par le gestionnaire',
        (await srv.appel(`${M}/poi/${poiValide.id}`, { method: 'DELETE' })).statut === 200);
      if (piecePartagee) {
        verifier('la pièce partagée reste sur le disque',
          srv.fichierExiste(cheminPiece));
        verifier('et reste téléchargeable depuis le partage',
          (await srv.appel(`${M}/partages/${paPiece.id}/pieces/${piecePartagee.id}/fichier`)).statut === 200);
      }
      verifier('rappel d’un État non destinataire refusé',
        (await srv.appel(`${M}/partages/${pa.id}/rappeler`, {
          method: 'POST', body: JSON.stringify({ etat: 'Sénégal' }),
        })).statut === 400);
      const rappel = await srv.appel(`${M}/partages/${pa.id}/rappeler`, {
        method: 'POST', body: JSON.stringify({ etat: 'Mali' }),
      });
      verifier('rappel : l’État retiré perd l’accès',
        rappel.statut === 200 && rappel.corps.retire === false
        && (rappel.corps.etats || []).join(',') === 'Togo', JSON.stringify(rappel.corps));
      // Le dernier destinataire retiré emporte la copie : elle n'a plus d'objet.
      const dernier = await srv.appel(`${M}/partages/${pa.id}/rappeler`, {
        method: 'POST', body: JSON.stringify({ etat: 'Togo' }),
      });
      verifier('dernier rappel : la copie disparaît',
        dernier.statut === 200 && dernier.corps.retire === true
        && (await srv.appel(`${M}/partages/${pa.id}`)).statut === 404);
      if (piecePartagee) {
        verifier('plus rien ne la désigne : la pièce quitte le disque',
          !srv.fichierExiste(cheminPiece));
      }
    }

    // ── Vue AAC / Vue Prestataire ──
    // La bascule n'est pas un habillage : en vue Prestataire, les routes ne
    // servent que les inspections de l'exploitant, et n'acceptent plus d'écriture.
    const vueDepart = await srv.appel(`${M}/vue`);
    verifier('bascule de vue offerte au super-administrateur',
      vueDepart.statut === 200 && vueDepart.corps.disponible === true
      && vueDepart.corps.vue === 'aac');

    // Une inspection au nom du prestataire retenu par défaut : c'est elle, et
    // elle seule, que la vue Prestataire doit laisser voir.
    const prestataire = vueDepart.corps.prestataires[0] || {};
    await importer([{ ...insp, exploitant: prestataire.nom, vol: 'PR001', immatriculation: '5V-PRE' }]);
    const listeAac = (await srv.appel(`${M}/inspections`)).corps;
    const toutes = listeAac.length;
    // Une inspection d'un autre exploitant : elle doit disparaître de la vue.
    const horsPerimetre = (listeAac.find((i) => i.exploitant !== prestataire.nom) || {}).id;

    // Instance regardée : le poste d'AAC tenu vient du socle, commun au portail
    // et aux six modules. Le super-administrateur passe sur l'écran d'un État
    // membre, et ne voit alors que ce que cet État voit.
    const instDepart = await srv.appel(`${M}/instance`);
    verifier('instances proposées au super-administrateur',
      (instDepart.corps.instances || []).length === 8,
      String((instDepart.corps.instances || []).length));
    verifier('instance prise',
      (await srv.appel(`${M}/instance`, {
        method: 'PUT', body: JSON.stringify({ instance: 'Niger' }),
      })).corps.instance === 'Niger');
    const auNiger = await srv.appel(`${M}/requetes`);
    verifier('au poste du Niger, seules ses requêtes',
      (auNiger.corps.mes_etats || []).join() === 'Niger'
      && (auNiger.corps.requetes || []).every((r) => r.etat_emetteur === 'Niger'
        || (r.etats_destinataires || []).includes('Niger')),
      JSON.stringify(auNiger.corps.mes_etats));
    verifier('instance inconnue refusée',
      (await srv.appel(`${M}/instance`, {
        method: 'PUT', body: JSON.stringify({ instance: 'France' }),
      })).statut === 400);
    verifier('retour à la vue régionale',
      (await srv.appel(`${M}/instance`, {
        method: 'PUT', body: JSON.stringify({ instance: '' }),
      })).corps.instance === '');

    const bascule = await srv.appel(`${M}/vue`, {
      method: 'PUT', body: JSON.stringify({ vue: 'prestataire' }),
    });
    verifier('passage en vue Prestataire',
      bascule.statut === 200 && bascule.corps.vue === 'prestataire' && !!bascule.corps.prestataire_id);

    const ctxPrest = await srv.appel(`${M}/context`);
    verifier('rôle adapté à la vue Prestataire',
      ctxPrest.corps.user.role_ramp === 'Prestataire', ctxPrest.corps.user.role_ramp);
    const inspPrest = await srv.appel(`${M}/inspections`);
    verifier('inspections restreintes à l’exploitant de la vue',
      inspPrest.corps.length > 0 && inspPrest.corps.length < toutes
      && inspPrest.corps.every((i) => i.exploitant === prestataire.nom),
      `${inspPrest.corps.length} / ${toutes}`);
    verifier('inspection d’un autre exploitant introuvable en vue Prestataire',
      (await srv.appel(`${M}/inspections/${horsPerimetre}`)).statut === 404);
    verifier('import fermé à la vue Prestataire',
      (await importer([insp])).statut === 403);
    verifier('suppression fermée à la vue Prestataire',
      (await srv.appel(`${M}/inspections/${horsPerimetre}`, { method: 'DELETE' })).statut === 403);
    verifier('générateur de tables fermé à la vue Prestataire',
      (await srv.appel(`${M}/tables/champs`)).statut === 403);
    verifier('communication entre États fermée à la vue Prestataire',
      (await srv.appel(`${M}/requetes`)).statut === 403);
    verifier('éléments partagés fermés à la vue Prestataire',
      (await srv.appel(`${M}/partages`)).statut === 403);
    verifier('carnet de contacts fermé à la vue Prestataire',
      (await srv.appel(`${M}/contacts`)).statut === 403);
    const exportPrest = await srv.appel(`${M}/inspections/export-xlsx`, {
      method: 'POST', body: JSON.stringify({ filtres: {} }),
    });
    verifier('export encore servi en vue Prestataire', exportPrest.statut === 200);

    // ── Mes utilisateurs (vue Prestataire) ──
    const mesUsers = await srv.appel(`${M}/mes-utilisateurs`);
    verifier('« Mes Utilisateurs » ouvert en vue Prestataire',
      mesUsers.statut === 200 && Array.isArray(mesUsers.corps.utilisateurs)
      && (mesUsers.corps.droits || []).length === 5,
      `${mesUsers.statut} — ${(mesUsers.corps.droits || []).map((d) => d.cle).join(' ')}`);
    const creeCompte = await srv.appel(`${M}/mes-utilisateurs`, {
      method: 'POST',
      body: JSON.stringify({ email: 'agent@abe.bj', nom: 'DOSSOU', prenom: 'Ada',
        role: 'PRESTATAIRE', droits: ['inspections', 'ecarts'] }),
    });
    verifier('compte de l’organisme créé',
      creeCompte.statut === 201 && !!creeCompte.corps.temp_password, creeCompte.corps.error);
    verifier('compte créé rattaché et limité au module',
      (await srv.appel(`${M}/mes-utilisateurs`)).corps.utilisateurs
        .some((u) => u.id === 'agent@abe.bj' && (u.droits || []).length === 2));
    verifier('courriel déjà pris refusé',
      (await srv.appel(`${M}/mes-utilisateurs`, {
        method: 'POST', body: JSON.stringify({ email: 'agent@abe.bj' }),
      })).statut === 409);
    verifier('droits confiés modifiables',
      (await srv.appel(`${M}/mes-utilisateurs/agent%40abe.bj`, {
        method: 'PUT', body: JSON.stringify({ droits: ['inspections'], actif: false }),
      })).corps.droits.join() === 'inspections');
    verifier('mot de passe réinitialisable',
      !!(await srv.appel(`${M}/mes-utilisateurs/agent%40abe.bj/reset-password`, { method: 'POST' }))
        .corps.new_password);
    verifier('mot de passe provisoire protégé par le mot de passe du demandeur',
      (await srv.appel(`${M}/mes-utilisateurs/agent%40abe.bj/reveal-password`, {
        method: 'POST', body: JSON.stringify({ admin_password: 'faux' }),
      })).statut === 403);
    verifier('compte hors périmètre introuvable',
      (await srv.appel(`${M}/mes-utilisateurs/inconnu%40ailleurs.bj`, { method: 'DELETE' })).statut === 404);
    verifier('compte supprimé',
      (await srv.appel(`${M}/mes-utilisateurs/agent%40abe.bj`, { method: 'DELETE' })).statut === 200);

    const retour = await srv.appel(`${M}/vue`, { method: 'PUT', body: JSON.stringify({ vue: 'aac' }) });
    verifier('retour en vue AAC', retour.statut === 200 && retour.corps.vue === 'aac');
    verifier('« Mes Utilisateurs » fermé hors vue Prestataire',
      (await srv.appel(`${M}/mes-utilisateurs`)).statut === 403);
    verifier('toutes les inspections retrouvées en vue AAC',
      (await srv.appel(`${M}/inspections`)).corps.length === toutes);

    // ── Le module est monté et déclaré ──
    const modules = await srv.appel('/api/modules');
    const ramp = (modules.corps || []).find((m) => m.code === 'RAMP');
    verifier('module RAMP au catalogue', !!ramp && ramp.installed === true);
    verifier('module RAMP nommé « RAMP Inspections »',
      !!ramp && ramp.name.fr === 'RAMP Inspections', ramp && ramp.name.fr);

    return bilan('RAMP');
  } finally {
    await srv.arreter();
  }
};
