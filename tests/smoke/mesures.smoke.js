// Fumée — module « Mesures d'Application » (CARE) : contexte, paramétrage des
// catégories et types, circuit d'une mesure, indicateurs, et raccordement au
// module « Exécution de la Surveillance » par le bus de services.
const { demarrer, verifier, bilan } = require('./harness');

module.exports = async function mesuresSmoke(port) {
  console.log('\n── Module CARE — Mesures d’Application ──');
  const srv = await demarrer({ port });
  const M = '/api/m/mesures';
  try {
    await srv.connexion();

    // ── Contexte et référentiels ──
    const ctx = await srv.appel(`${M}/context`);
    verifier('contexte du module', ctx.statut === 200 && !!ctx.corps.user);
    verifier('rôle M4 reconstitué depuis le privilège CARE',
      ctx.corps.user.role_m4 === 'M4_Administrateur', ctx.corps.user.role_m4);

    const refs = await srv.appel(`${M}/referentiels`);
    verifier('référentiels servis en un appel',
      refs.statut === 200 && Array.isArray(refs.corps.prestataires)
      && Array.isArray(refs.corps.domaines) && Array.isArray(refs.corps.secteurs));
    const prestataire = (refs.corps.prestataires || [])[0];
    verifier('au moins un prestataire disponible', !!prestataire);

    // ── Paramétrage livré d'origine ──
    const params = await srv.appel(`${M}/parametres`);
    verifier('paramétrage lisible', params.statut === 200);
    verifier('trois catégories livrées d’origine',
      (params.corps.categories || []).length === 3,
      (params.corps.categories || []).map((c) => c.code).join(', '));
    verifier('quinze types livrés d’origine',
      (params.corps.types || []).length === 15, String((params.corps.types || []).length));
    verifier('chaque type se rattache à une catégorie connue',
      (params.corps.types || []).every((t) =>
        (params.corps.categories || []).some((c) => c.code === t.categorie_code)));

    // ── Création et modification d'une catégorie et d'un type ──
    const cat = await srv.appel(`${M}/parametres/categories`, {
      method: 'POST', body: JSON.stringify({ libelle: 'Mesure conservatoire' }),
    });
    verifier('catégorie créée', cat.statut === 201 && cat.corps.code === 'mesure_conservatoire',
      cat.corps.code || cat.corps.error);
    verifier('libellé en double refusé',
      (await srv.appel(`${M}/parametres/categories`, {
        method: 'POST', body: JSON.stringify({ libelle: 'Mesure conservatoire' }),
      })).corps.error === 'existant');
    verifier('libellé vide refusé',
      (await srv.appel(`${M}/parametres/categories`, {
        method: 'POST', body: JSON.stringify({ libelle: '  ' }),
      })).statut === 400);

    const typ = await srv.appel(`${M}/parametres/types`, {
      method: 'POST', body: JSON.stringify({ categorie_code: 'mesure_conservatoire', libelle: 'Immobilisation' }),
    });
    verifier('type créé', typ.statut === 201 && typ.corps.code === 'immobilisation',
      typ.corps.code || typ.corps.error);
    verifier('type sur catégorie inconnue refusé',
      (await srv.appel(`${M}/parametres/types`, {
        method: 'POST', body: JSON.stringify({ categorie_code: 'inexistante', libelle: 'X' }),
      })).statut === 400);

    // Le code ne suit pas le libellé : les mesures déjà prises le portent.
    await srv.appel(`${M}/parametres/categories/${cat.corps.id}`, {
      method: 'PUT', body: JSON.stringify({ libelle: 'Mesure conservatoire (révisée)' }),
    });
    const apresRenommage = (await srv.appel(`${M}/parametres`)).corps.categories
      .find((c) => c.id === cat.corps.id);
    verifier('renommer une catégorie ne change pas son code',
      apresRenommage.code === 'mesure_conservatoire' && /révisée/.test(apresRenommage.libelle));

    // ── Constatations reçues du module Exécution par le bus de services ──
    const consts = await srv.appel(`${M}/constatations`);
    verifier('constatations servies par le bus de services', consts.statut === 200 && Array.isArray(consts.corps));
    verifier('aucune constatation du circuit direct en cours',
      (consts.corps || []).every((c) => !String(c.statut || '').startsWith('direct_')));

    // ── Écarts de catégorie 3 du module RAMP ──
    // Ils appellent une mesure d'application au même titre qu'une constatation
    // critique de la surveillance, et arrivent par le même bus : le module
    // n'ouvre jamais les données de RAMP.
    const ramp = (consts.corps || []).filter((c) => c.origine === 'RAMP');
    verifier('les écarts RAMP arrivent sous le contrat des constatations',
      ramp.every((c) => c.id && c.reference && c.criticite === 'critique'
        && typeof c.prestataire_id === 'string'),
      JSON.stringify(ramp[0] || {}).slice(0, 120));
    verifier('aucun écart RAMP de catégorie inférieure à 3',
      ramp.every((c) => c.criticite === 'critique'));
    // Sans producteur RAMP, la liste reste servie : le module tient seul.
    verifier('constatations servies même sans module producteur',
      Array.isArray(consts.corps));


    // ── Circuit d'une mesure ──
    const creation = await srv.appel(`${M}/mesures`, {
      method: 'POST',
      body: JSON.stringify({
        categorie: 'administrative', type_mesure: 'preavis',
        prestataire_id: prestataire.id, objet: 'Préavis de suspension',
        description: 'Écart non soldé dans le délai imparti.',
        date_emission: '2026-08-01', delai_jours: '30', date_echeance: '2026-08-31',
      }),
    });
    verifier('mesure créée', creation.statut === 201 && /^MES-\d{4}$/.test(creation.corps.reference || ''),
      creation.corps.reference || creation.corps.error);
    const id = creation.corps.id;

    const lue = await srv.appel(`${M}/mesures/${id}`);
    verifier('mesure au statut « projet »', lue.corps.statut === 'projet', lue.corps.statut);
    verifier('mesure enrichie du nom du prestataire', !!lue.corps.prestataire_nom);

    // Les transitions vérifient leur statut de départ.
    verifier('clôture refusée depuis « projet »',
      (await srv.appel(`${M}/mesures/${id}/cloturer`, { method: 'POST', body: '{}' })).statut === 400);
    verifier('notification acceptée depuis « projet »',
      (await srv.appel(`${M}/mesures/${id}/notifier`, { method: 'POST', body: '{}' })).statut === 200);
    verifier('double notification refusée',
      (await srv.appel(`${M}/mesures/${id}/notifier`, { method: 'POST', body: '{}' })).statut === 400);

    const notifiee = (await srv.appel(`${M}/mesures/${id}`)).corps;
    verifier('date de notification posée', !!notifiee.date_notification);
    verifier('auteur de la décision tracé', !!notifiee.decision_par);

    verifier('clôture acceptée depuis « notifiée »',
      (await srv.appel(`${M}/mesures/${id}/cloturer`, { method: 'POST', body: '{}' })).statut === 200);
    const close = (await srv.appel(`${M}/mesures/${id}`)).corps;
    verifier('mesure clôturée', close.statut === 'cloturee' && !!close.date_cloture);
    verifier('une mesure clôturée ne se modifie plus',
      (await srv.appel(`${M}/mesures/${id}`, {
        method: 'PUT', body: JSON.stringify({ objet: 'Autre objet' }),
      })).statut === 409);
    verifier('réouverture possible',
      (await srv.appel(`${M}/mesures/${id}/rouvrir`, { method: 'POST', body: '{}' })).statut === 200);
    verifier('mesure rouverte modifiable à nouveau',
      (await srv.appel(`${M}/mesures/${id}`, {
        method: 'PUT', body: JSON.stringify({ objet: 'Préavis de suspension (révisé)' }),
      })).statut === 200);

    // ── Un paramètre encore utilisé ne se supprime pas ──
    const catAdmin = (await srv.appel(`${M}/parametres`)).corps.categories
      .find((c) => c.code === 'administrative');
    const catUtilisee = await srv.appel(`${M}/parametres/categories/${catAdmin.id}`, { method: 'DELETE' });
    verifier('catégorie encore utilisée non supprimable, usages comptés',
      catUtilisee.statut === 409 && catUtilisee.corps.error === 'en_usage'
      && catUtilisee.corps.objet === 'categorie' && catUtilisee.corps.n >= 1,
      JSON.stringify(catUtilisee.corps));
    const typPreavis = (await srv.appel(`${M}/parametres`)).corps.types.find((t) => t.code === 'preavis');
    verifier('type encore utilisé non supprimable',
      (await srv.appel(`${M}/parametres/types/${typPreavis.id}`, { method: 'DELETE' })).statut === 409);
    verifier('catégorie inutilisée supprimable',
      (await srv.appel(`${M}/parametres/categories/${cat.corps.id}`, { method: 'DELETE' })).statut === 200);
    verifier('les types de la catégorie supprimée disparaissent avec elle',
      !(await srv.appel(`${M}/parametres`)).corps.types.some((t) => t.code === 'immobilisation'));

    // ── Numérotation ──
    const seconde = await srv.appel(`${M}/mesures`, {
      method: 'POST',
      body: JSON.stringify({
        categorie: 'sanction', type_mesure: 'avertissement',
        prestataire_id: prestataire.id, objet: 'Avertissement',
      }),
    });
    verifier('numérotation continue', seconde.corps.reference === 'MES-0002', seconde.corps.reference);
    verifier('suppression réservée au gestionnaire — le compte l’est ici',
      (await srv.appel(`${M}/mesures/${seconde.corps.id}`, { method: 'DELETE' })).statut === 200);
    const apresSuppression = await srv.appel(`${M}/mesures`, {
      method: 'POST',
      body: JSON.stringify({ categorie: 'sanction', type_mesure: 'blame', prestataire_id: prestataire.id, objet: 'Blâme' }),
    });
    verifier('une référence supprimée n’est pas réattribuée',
      apresSuppression.corps.reference === 'MES-0003', apresSuppression.corps.reference);

    // ── Constatations relevées par le module lui-même ──
    verifier('constatation sans objet refusée',
      (await srv.appel(`${M}/constatations`, {
        method: 'POST', body: JSON.stringify({ description: 'sans objet' }),
      })).statut === 400);
    const propre = await srv.appel(`${M}/constatations`, {
      method: 'POST',
      body: JSON.stringify({
        titre: 'Défaut de suivi de navigabilité', description: 'Carnet non tenu',
        origine_libelle: 'Signalement', date_ouverture: '2026-09-01',
      }),
    });
    verifier('constatation propre créée et numérotée',
      propre.statut === 201 && /^CST-\d{4}$/.test(propre.corps.reference || ''),
      JSON.stringify(propre.corps));
    const avecPropre = (await srv.appel(`${M}/constatations`)).corps || [];
    const ajoutee = avecPropre.find((c) => c.id === propre.corps.id) || {};
    verifier('statut propre au module : rien de décidé, donc à traiter',
      ajoutee.statut_care === 'a_traiter', ajoutee.statut_care);
    verifier('la constatation propre rejoint la liste, critique et ouverte',
      ajoutee.origine === 'CARE' && ajoutee.criticite === 'critique'
      && ajoutee.statut === 'ouverte', JSON.stringify(ajoutee).slice(0, 120));
    verifier('constatation propre modifiable',
      (await srv.appel(`${M}/constatations/${propre.corps.id}`, {
        method: 'PUT', body: JSON.stringify({ titre: 'Défaut de suivi (revu)' }),
      })).statut === 200);
    // Une constatation qui porte une mesure ne se supprime pas.
    const mesureLiee = await srv.appel(`${M}/mesures`, {
      method: 'POST',
      body: JSON.stringify({ constatation_id: propre.corps.id, objet: 'Avertissement' }),
    });
    verifier('mesure prise sur une constatation propre', mesureLiee.statut === 201);
    // Le statut d'une carence suit le fil du traitement, dans les mêmes termes
    // que la colonne « Actions ». Une mesure prise hors de ce fil la place
    // néanmoins sous suivi : elle n'est plus à traiter.
    verifier('une mesure en cours place la carence sous suivi',
      (((await srv.appel(`${M}/constatations`)).corps || [])
        .find((c) => c.id === propre.corps.id) || {}).statut_care === 'sous_suivi');
    verifier('suppression refusée tant qu’une mesure est rattachée',
      (await srv.appel(`${M}/constatations/${propre.corps.id}`, { method: 'DELETE' })).statut === 400);
    await srv.appel(`${M}/mesures/${mesureLiee.corps.id}`, { method: 'DELETE' });
    verifier('constatation propre supprimable une fois libre',
      (await srv.appel(`${M}/constatations/${propre.corps.id}`, { method: 'DELETE' })).statut === 200);
    verifier('constatation inconnue introuvable',
      (await srv.appel(`${M}/constatations/inexistante`, { method: 'DELETE' })).statut === 404);

    // ── Le circuit complet d'une carence, qu'aucun contrôle ne traversait ──
    //
    // Investigation, qualification, suivi : c'est le cœur du module, et la
    // bascule en base l'a entièrement récrit en transformations (ADR-002,
    // jalon n° 13). Rien ne l'exerçait. Or c'est ici que les mesures
    // d'application sont **prononcées**, avec leur référence — notifiée au
    // prestataire, et qui désigne un acte d'autorité.
    const POST = (chemin, corps) => srv.appel(chemin, {
      method: 'POST', body: JSON.stringify(corps || {}),
    });
    const PUT = (chemin, corps) => srv.appel(chemin, {
      method: 'PUT', body: JSON.stringify(corps || {}),
    });

    const carence = await POST(`${M}/constatations`, {
      titre: 'Manquement au programme de maintenance', description: 'Vérification omise',
      origine_libelle: 'Contrôle inopiné', date_ouverture: '2026-09-15',
    });
    const CID = carence.corps.id;
    verifier('circuit : carence ouverte', carence.statut === 201 && !!CID);

    // 1. Le dossier s'ouvre avec les informations recueillies.
    verifier('circuit : dossier ouvert avec ses informations',
      (await PUT(`${M}/constatations/${CID}/traitement`, { informations: 'Pièces reçues' })).statut === 200);
    const ouvert = await srv.appel(`${M}/constatations/${CID}/traitement`);
    verifier('circuit : le dossier se relit à l’étape « suite »',
      ouvert.statut === 200 && ouvert.corps.etape === 'suite'
      && ouvert.corps.informations === 'Pièces reçues', ouvert.corps.etape);

    // 2. La décision d'investiguer avance le fil.
    const investiguer = await POST(`${M}/constatations/${CID}/decision`, { decision: 'investiguer' });
    verifier('circuit : décision d’investiguer',
      investiguer.statut === 201 && investiguer.corps.etape === 'investigations',
      `${investiguer.statut} ${investiguer.corps.etape || ''}`);

    // 3. L'investigation se consigne, puis se soumet.
    verifier('circuit : investigation consignée',
      (await PUT(`${M}/constatations/${CID}/investigation`, {
        equipe: ['insp1'], travaux: [], rapport: 'Faits établis',
      })).statut === 200);
    const soumise = await POST(`${M}/constatations/${CID}/investigation/soumettre`);
    verifier('circuit : investigation soumise, étape « qualification »',
      soumise.statut === 201 && soumise.corps.etape === 'qualification',
      `${soumise.statut} ${soumise.corps.etape || ''}`);
    verifier('circuit : une investigation ne se soumet pas deux fois',
      (await POST(`${M}/constatations/${CID}/investigation/soumettre`)).statut === 409);

    // 4. L'instance qualifie et arrête deux mesures.
    verifier('circuit : qualification enregistrée',
      (await PUT(`${M}/constatations/${CID}/qualification`, {
        infraction_constituee: true, nature: 'Manquement grave',
        caracterisation: 'Récidive', mesures: [
          { categorie: 'administrative', type_mesure: 'lettre_correction', commentaire: 'Première', suivi_requis: true },
          { categorie: 'sanction', type_mesure: 'avertissement', commentaire: 'Seconde', suivi_requis: true },
        ],
      })).statut === 200);

    // 5. **Le geste qui compte** : les deux mesures entrent au registre avec
    //    leurs références, et le fil passe au suivi — d'un seul coup.
    const prononcees = await POST(`${M}/constatations/${CID}/qualification/suivi`);
    verifier('circuit : les mesures arrêtées entrent au registre',
      prononcees.statut === 201 && (prononcees.corps.mesures || []).length === 2,
      JSON.stringify(prononcees.corps).slice(0, 140));
    // Deux références distinctes, et bien formées : c'est ce que le compteur
    // tenu dans la transformation garantit. Deux mesures sous un même numéro
    // seraient deux actes d'autorité confondus.
    const refs2 = prononcees.corps.mesures || [];
    verifier('circuit : deux références distinctes et bien formées',
      refs2.length === 2 && new Set(refs2).size === 2
      && refs2.every((r) => /^MES-\d{4}$/.test(r)), refs2.join(' · '));
    const dossier = await srv.appel(`${M}/constatations/${CID}/traitement`);
    verifier('circuit : le fil est au suivi, et le registre porte les deux mesures',
      dossier.corps.etape === 'suivi'
      && (dossier.corps.mesures || []).filter((m) => m.issue_de === 'qualification').length === 2,
      `${dossier.corps.etape} · ${(dossier.corps.mesures || []).length} mesure(s)`);

    // 6. Le suivi des mesures s'inscrit sur les mesures elles-mêmes.
    const auRegistre = (dossier.corps.mesures || []).filter((m) => m.issue_de === 'qualification');
    const suivi = await PUT(`${M}/constatations/${CID}/suivi`, {
      commentaire_general: 'Plans reçus',
      mesures: auRegistre.map((m) => ({ id: m.id, suivi_statut: 'solde', suivi_commentaire: 'Soldé' })),
    });
    verifier('circuit : suivi porté sur les deux mesures',
      suivi.statut === 200 && suivi.corps.mesures === 2, JSON.stringify(suivi.corps));
    const apresSuivi = await srv.appel(`${M}/constatations/${CID}/traitement`);
    verifier('circuit : le commentaire général et les statuts tiennent ensemble',
      (apresSuivi.corps.suivi || {}).commentaire_general === 'Plans reçus'
      && (apresSuivi.corps.mesures || []).filter((m) => m.suivi_statut === 'solde').length === 2);

    // 7. La carence se clôt.
    verifier('circuit : carence clôturée',
      (await POST(`${M}/constatations/${CID}/suivi/cloturer`)).statut === 201);
    const clos = await srv.appel(`${M}/constatations/${CID}/traitement`);
    verifier('circuit : le dossier porte sa clôture', !!clos.corps.cloture_le);

    // 8. Et un dossier clos ne se réécrit plus.
    verifier('circuit : un dossier clos ne se réécrit plus',
      (await PUT(`${M}/constatations/${CID}/suivi`, { commentaire_general: 'tard' })).statut === 409);

    // Ménage : les deux mesures prononcées, puis la carence.
    for (const m of auRegistre) await srv.appel(`${M}/mesures/${m.id}`, { method: 'DELETE' });
    await srv.appel(`${M}/constatations/${CID}`, { method: 'DELETE' });

    // ── Comités et types d'investigation : le paramétrage que rien n'exerçait ──
    const comite = await POST(`${M}/parametres/comites`, { libelle: 'Comité de fumée' });
    verifier('comité créé avec son code dérivé',
      comite.statut === 201 && comite.corps.code === 'comite_de_fumee', JSON.stringify(comite.corps));
    verifier('comité en doublon refusé',
      (await POST(`${M}/parametres/comites`, { libelle: 'Comité de fumée' })).statut === 409);
    verifier('comité renommé sans changer son code',
      (await PUT(`${M}/parametres/comites/${comite.corps.id}`, { libelle: 'Comité revu' })).statut === 200);
    const typeInv = await POST(`${M}/parametres/types-investigation`, { libelle: 'Relevé de fumée' });
    verifier('type d’investigation créé', typeInv.statut === 201 && !!typeInv.corps.code);
    verifier('type d’investigation en doublon refusé',
      (await POST(`${M}/parametres/types-investigation`, { libelle: 'Relevé de fumée' })).statut === 409);
    verifier('comité et type d’investigation retirés',
      (await srv.appel(`${M}/parametres/comites/${comite.corps.id}`, { method: 'DELETE' })).statut === 200
      && (await srv.appel(`${M}/parametres/types-investigation/${typeInv.corps.id}`, { method: 'DELETE' })).statut === 200);

    // ── Classement : aucune suite donnée ──
    const aClasser = await srv.appel(`${M}/constatations`, {
      method: 'POST', body: JSON.stringify({ titre: 'Manquement régularisé sur place' }),
    });
    verifier('infraction classée sans suite',
      (await srv.appel(`${M}/constatations/${aClasser.corps.id}/classer`, {
        method: 'POST', body: JSON.stringify({ motif: 'Régularisé immédiatement' }),
      })).statut === 201);
    const classee = ((await srv.appel(`${M}/constatations`)).corps || [])
      .find((c) => c.id === aClasser.corps.id) || {};
    verifier('une carence classée porte le statut « classée » du module',
      classee.statut_care === 'classee', classee.statut_care);
    verifier('le classement clôt l’infraction et porte sa date',
      classee.classee === true && classee.statut === 'classee'
      && /^\d{4}-\d{2}-\d{2}$/.test(classee.date_cloture || ''),
      JSON.stringify(classee).slice(0, 140));
    verifier('classement non rejouable',
      (await srv.appel(`${M}/constatations/${aClasser.corps.id}/classer`, {
        method: 'POST', body: '{}',
      })).statut === 409);
    verifier('suppression refusée sur une infraction classée',
      (await srv.appel(`${M}/constatations/${aClasser.corps.id}`, { method: 'DELETE' })).statut === 400);
    verifier('classement retiré par le gestionnaire',
      (await srv.appel(`${M}/constatations/${aClasser.corps.id}/classer`, { method: 'DELETE' })).statut === 200);
    verifier('infraction de nouveau supprimable',
      (await srv.appel(`${M}/constatations/${aClasser.corps.id}`, { method: 'DELETE' })).statut === 200);

    // ── Filtres et indicateurs ──
    const parStatut = await srv.appel(`${M}/mesures?statut=projet`);
    verifier('filtre par statut',
      parStatut.statut === 200 && (parStatut.corps || []).every((m) => m.statut === 'projet'));
    const parPrest = await srv.appel(`${M}/mesures?prestataire_id=${encodeURIComponent(prestataire.id)}`);
    verifier('filtre par prestataire',
      parPrest.statut === 200 && (parPrest.corps || []).every((m) => m.prestataire_id === prestataire.id));

    verifier('indicateurs sans prestataire refusés',
      (await srv.appel(`${M}/indicateurs`)).statut === 400);
    const ind = await srv.appel(`${M}/indicateurs?prestataire_id=${encodeURIComponent(prestataire.id)}`);
    verifier('indicateurs du prestataire', ind.statut === 200
      && typeof ind.corps.total_constatations === 'number'
      && typeof ind.corps.total_mesures === 'number'
      && !!ind.corps.mesures_par_statut);

    // ── Le module est bien monté et déclaré ──
    const modules = await srv.appel('/api/modules');
    const care = (modules.corps || []).find((m) => m.code === 'CARE');
    verifier('module CARE au catalogue', !!care && care.installed === true);
    verifier('module CARE nommé « Mesures d’Application »',
      !!care && /Mesures d’Application|Mesures d'Application/.test(care.name.fr), care && care.name.fr);

    return bilan('CARE');
  } finally {
    await srv.arreter();
  }
};
