// Fumée — module « Exécution de la Surveillance » : paramétrage repris de
// PESSCO, consommation des plans validés via le bus, et circuit complet d'un
// acte de surveillance (notification → accord → dossier → rapport → clôture).
const { demarrer, verifier, bilan, horsPortee } = require('./harness');

const M = '/api/m/execution';

module.exports = async function executionSmoke(port) {
  console.log('\n── Module SURV — Exécution de la Surveillance ──');
  const srv = await demarrer({ port });
  const P = (chemin, corps) => srv.appel(chemin, { method: 'POST', body: JSON.stringify(corps || {}) });
  const PUT = (chemin, corps) => srv.appel(chemin, { method: 'PUT', body: JSON.stringify(corps || {}) });
  try {
    await srv.connexion();
    // La vue active est persistée : on repart de la vue AAC, quel que soit
    // l'état laissé par une session précédente.
    await PUT(`${M}/vue`, { vue: 'aac' });

    // ── Contexte et rôle M3 reconstitué depuis les droits SURV ──
    const ctx = await srv.appel(`${M}/context`);
    verifier('contexte du module', ctx.statut === 200 && ctx.corps.user && ctx.corps.user.id);
    verifier('rôle M3 déduit du privilège SURV',
      /^M3_/.test((ctx.corps.user || {}).role_m3 || ''), (ctx.corps.user || {}).role_m3);

    // ── Paramétrage migré depuis PESSCO ──
    const criticites = await srv.appel(`${M}/criticites`);
    verifier('criticités paramétrées', criticites.statut === 200 && criticites.corps.length >= 3);
    const typesCas = await srv.appel(`${M}/types-cas`);
    verifier('types de cas paramétrés', typesCas.statut === 200 && typesCas.corps.length >= 2);
    const statuts = await srv.appel(`${M}/exec-checklist-statuts`);
    verifier('statuts de checklist', statuts.statut === 200 && statuts.corps.length >= 4);
    const checklists = await srv.appel(`${M}/exec-checklists`);
    verifier('checklists reprises', checklists.statut === 200 && checklists.corps.length >= 1);
    const items = await srv.appel(`${M}/exec-checklist-items`);
    verifier('items de checklist repris', items.statut === 200 && items.corps.length > 100);
    const sousThemes = await srv.appel(`${M}/exec-checklist-sous-themes`);
    verifier('sous-thèmes rattachés à un thème du référentiel',
      sousThemes.statut === 200 && sousThemes.corps.length > 0
      && sousThemes.corps.every((s) => !!s.theme_id));

    // ── Plans validés : fournis par le module Planification ──
    const plans = await srv.appel(`${M}/plans-valides`);
    verifier('plans validés obtenus via le bus', plans.statut === 200 && Array.isArray(plans.corps));
    verifier('activités déjà déclenchées isolées',
      (plans.corps || []).every((p) => Array.isArray(p.excluded_activites)));

    // ── Circuit complet sur la première activité disponible ──
    const plan = (plans.corps || []).find((p) => (p.activites || []).length);
    const activite = plan ? plan.activites[0] : null;
    verifier('au moins une activité planifiée à exécuter', !!activite);

    if (activite) {
      const creation = await P(`${M}/notifications`, {
        activite_id: activite.id, plan_id: plan.id, prestataire_id: activite.prestataire_id,
        objet: 'Fumée — audit de conformité', type_supervision: 'Audit',
        date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
        lieu: 'Siège', perimetre: 'Ensemble des processus',
      });
      verifier('notification créée', creation.statut === 201 && creation.corps.reference, JSON.stringify(creation.corps).slice(0, 100));
      const notifId = (creation.corps || {}).id;

      const relecture = await srv.appel(`${M}/notifications/${notifId}`);
      verifier('champs du formulaire restitués sous leurs noms d’origine',
        relecture.corps.objet === 'Fumée — audit de conformité'
        && relecture.corps.date_debut_prevue === '2026-09-01');

      verifier('accord refusé tant que la notification n’est pas envoyée',
        (await PUT(`${M}/notifications/${notifId}/validate-accord`)).statut === 409);

      verifier('soumission', (await PUT(`${M}/notifications/${notifId}/submit`)).statut === 200);
      verifier('validation', (await PUT(`${M}/notifications/${notifId}/validate`)).statut === 200);
      verifier('envoi au prestataire', (await PUT(`${M}/notifications/${notifId}/send`)).statut === 200);

      const echange = await P(`${M}/notifications/${notifId}/echanges`, { contenu: 'Dates confirmées.' });
      verifier('échange enregistré', echange.statut === 201);
      const fil = await srv.appel(`${M}/notifications/${notifId}/echanges`);
      verifier('auteur de l’échange résolu',
        fil.statut === 200 && fil.corps.length === 1 && fil.corps[0].auteur_nom);

      // Accord : la référence d'activité est frappée et le dossier s'ouvre.
      const accord = await PUT(`${M}/notifications/${notifId}/validate-accord`, {
        date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03',
      });
      verifier('accord acté', accord.statut === 200 && accord.corps.statut === 'acte');
      verifier('référence d’activité générée',
        /^ACT-.+-\d{4}-\d{3}$/.test((accord.corps || {}).reference_activite || ''), accord.corps.reference_activite);
      const dossierId = (accord.corps || {}).dossier_id;
      verifier('dossier d’exécution ouvert automatiquement', !!dossierId);

      // L'activité déclenchée disparaît des plans à notifier.
      const apres = await srv.appel(`${M}/plans-valides`);
      const encore = (apres.corps || []).some((p) => (p.activites || []).some((a) => a.id === activite.id));
      verifier('activité déclenchée retirée des plans à notifier', !encore);

      const dossier = await srv.appel(`${M}/dossiers/${dossierId}`);
      verifier('dossier joint aux informations de la notification',
        dossier.statut === 200 && dossier.corps.notif_reference && dossier.corps.current_step === 'realisation');

      // Constatation ouverte pendant la réalisation.
      const fnc = await P(`${M}/constatations`, {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'majeur',
        description: 'Écart relevé lors du contrôle documentaire.',
      });
      verifier('constatation créée en brouillon',
        fnc.statut === 201 && fnc.corps.statut === 'brouillon', JSON.stringify(fnc.corps).slice(0, 100));

      verifier('clôture de la réalisation',
        (await PUT(`${M}/dossiers/${dossierId}/close-realisation`)).statut === 200);

      const soumission = await PUT(`${M}/dossiers/${dossierId}/submit`);
      verifier('rapport v1 créé à la soumission',
        soumission.statut === 200 && soumission.corps.version === 1
        && /-v1$/.test(soumission.corps.rapport_ref || ''));
      const rapportId = (soumission.corps || {}).rapport_id;

      verifier('clôture refusée avant transmission du rapport',
        (await PUT(`${M}/dossiers/${dossierId}/close`)).statut === 400);

      // ── Et la garde ci-dessus ne se contourne pas par le PUT générique ──
      //
      // `PUT /dossiers/:id` sert l'enregistrement du contenu — réalisation,
      // rédaction, annexes. Il recopiait tout ce qu'on lui donnait, cycle de vie
      // compris : mesuré le 8 novembre 2026, `{ statut: 'cloture' }` rendait 200
      // sur le dossier que `/close` venait de refuser à la ligne précédente.
      // *Toutes les gardes de transition étaient facultatives.*
      //
      // Et clôturer n'est pas une formalité : `/close` rend du même geste les
      // constatations **opposables** à l'organisme. Clôturer par le PUT
      // générique sautait cette moitié, et laissait des constatations
      // inopposables pour toujours.
      //
      // Les trois contrôles se tiennent ensemble : le refus, le magasin qui n'a
      // pas bougé, et le contenu qui passe encore. Sans le troisième, on aurait
      // pu fermer la route entière et croire l'avoir gardée.
      {
        const refus = await PUT(`${M}/dossiers/${dossierId}`, { statut: 'cloture', current_step: 'cloture' });
        const apres = (await srv.appel(`${M}/dossiers/${dossierId}`)).corps || {};
        verifier('le cycle de vie d’un dossier ne s’écrit pas par le PUT générique',
          refus.statut === 400 && (refus.corps || {}).error === 'champs_reserves'
          && (((refus.corps || {}).champs) || []).includes('statut')
          && apres.statut !== 'cloture',
          JSON.stringify({ statut: refus.statut, corps: refus.corps, enBase: apres.statut }));

        const refusArchive = await PUT(`${M}/dossiers/${dossierId}`, {
          archive: 1, archive_par: 'personne', date_archivage: '1970-01-01',
        });
        const apresArchive = (await srv.appel(`${M}/dossiers/${dossierId}`)).corps || {};
        verifier('ni le drapeau d’archivage, ni son auteur, ni sa date',
          refusArchive.statut === 400
          && Number(apresArchive.archive || 0) !== 1
          && !apresArchive.archive_par,
          JSON.stringify({ statut: refusArchive.statut,
            champs: (refusArchive.corps || {}).champs,
            archive: apresArchive.archive, par: apresArchive.archive_par }));

        const contenu = await PUT(`${M}/dossiers/${dossierId}`, { conclusion: 'Conclusion de la ronde.' });
        const apresContenu = (await srv.appel(`${M}/dossiers/${dossierId}`)).corps || {};
        verifier('et le contenu du dossier s’écrit toujours par cette route',
          contenu.statut === 200 && apresContenu.conclusion === 'Conclusion de la ronde.',
          JSON.stringify({ statut: contenu.statut, conclusion: apresContenu.conclusion }));
      }

      const renvoi = await PUT(`${M}/dossiers/${dossierId}/return`, { observations: 'Préciser la synthèse.' });
      verifier('renvoi pour correction', renvoi.statut === 200);
      const v2 = await PUT(`${M}/dossiers/${dossierId}/submit`);
      verifier('nouvelle version après correction', v2.statut === 200 && v2.corps.version === 2);
      const rapportV2 = (v2.corps || {}).rapport_id;

      const validation = await PUT(`${M}/rapports/${rapportV2}/validate`);
      verifier('rapport validé et référence définitive attribuée',
        validation.statut === 200 && /^RAPF-/.test(validation.corps.final_reference || ''));
      // Le rapport est validé mais pas encore transmis : la clôture attend.
      verifier('clôture refusée sur rapport validé non transmis',
        (await PUT(`${M}/dossiers/${dossierId}/close`)).statut === 400);

      // La validation a rendu la constatation opposable ; un amendement la
      // ramène au brouillon, le rapport qui la portait n'étant plus validé.
      verifier('constatation opposable après validation',
        (await srv.appel(`${M}/constatations/${fnc.corps.id}`)).corps.statut === 'ouvert');
      verifier('amendement du rapport validé',
        (await PUT(`${M}/rapports/${rapportV2}/amend`, { observations: 'Reprise du chapitre 3' })).statut === 200);
      verifier('constatation remise en brouillon par l’amendement',
        (await srv.appel(`${M}/constatations/${fnc.corps.id}`)).corps.statut === 'brouillon');
      // Le circuit reprend : nouvelle version, soumise puis validée.
      const v3 = await PUT(`${M}/dossiers/${dossierId}/submit`);
      const rapportV3 = (v3.corps || {}).rapport_id;
      verifier('nouvelle version après amendement', v3.statut === 200 && !!rapportV3);
      verifier('rapport revalidé', (await PUT(`${M}/rapports/${rapportV3}/validate`)).statut === 200);

      // ── `/send` ouvre les constatations restées en brouillon, comme ses sœurs ──
      //
      // Son commentaire l'affirmait ; le code ne le faisait pas. La validation
      // ouvre celles qui existent alors, de sorte que la fenêtre est étroite —
      // mais une constatation relevée **entre** la validation et l'envoi restait
      // `brouillon`, donc inopposable, le rapport étant parti chez l'organisme.
      // C'est précisément ce que la route sœur `/transmit` écrit vouloir éviter
      // (n° 5.f.78).
      const tardive = await P(`${M}/constatations`, {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'mineur',
        titre: 'Écart relevé après la validation',
        description: 'Posée entre la validation du rapport et son envoi.',
      });
      verifier('une constatation relevée après la validation du rapport naît en brouillon',
        tardive.statut === 201 && tardive.corps.statut === 'brouillon');
      const envoiSimple = await PUT(`${M}/rapports/${rapportV3}/send`);
      const tardiveApres = await srv.appel(`${M}/constatations/${tardive.corps.id}`);
      verifier('l’envoi simple du rapport la rend opposable, et ne laisse rien en brouillon',
        envoiSimple.statut === 200
        && (tardiveApres.corps || {}).statut === 'ouvert',
        JSON.stringify({ envoi: envoiSimple.statut,
          statut: (tardiveApres.corps || {}).statut }));
      await srv.appel(`${M}/constatations/${tardive.corps.id}`, { method: 'DELETE' });

      verifier('transmission refusée sans les deux signatures',
        (await PUT(`${M}/rapports/${rapportV3}/transmit`)).statut === 400);
      verifier('signature inspecteur', (await PUT(`${M}/rapports/${rapportV3}/sign-inspector`)).statut === 200);
      verifier('signature directeur', (await PUT(`${M}/rapports/${rapportV3}/sign-director`)).statut === 200);
      verifier('transmission au prestataire',
        (await PUT(`${M}/rapports/${rapportV3}/transmit`)).statut === 200);

      const fncOuverte = await srv.appel(`${M}/constatations/${fnc.corps.id}`);
      verifier('constatation devenue opposable à la transmission',
        fncOuverte.corps.statut === 'ouvert');


      verifier('dossier clôturé', (await PUT(`${M}/dossiers/${dossierId}/close`)).statut === 200);

      // ── Menu « États » : arrêt d'un processus, archivage, suppression ──
      // Un dossier clôturé ne s'arrête plus : le circuit est déjà achevé.
      verifier('arrêt refusé sur un dossier clôturé',
        (await PUT(`${M}/activites-en-cours/${notifId}/arreter`, { motif: 'essai' })).statut === 400);
      verifier('dossier archivé',
        (await PUT(`${M}/dossiers/${dossierId}/archiver`)).statut === 200);
      // L'archivage laisse vivre les constatations : leur suivi est distinct.
      const constatationsApres = (await srv.appel(`${M}/constatations`)).corps || [];
      verifier('constatations non archivées avec l’activité',
        constatationsApres.some((c) => c.dossier_id === dossierId && c.statut !== 'archive'));
      const archive = (await srv.appel(`${M}/dossiers`)).corps.find((d) => d.id === dossierId) || {};
      verifier('archivage porté sur le dossier', Number(archive.archive) === 1 && !!archive.date_archivage);
      verifier('dossier sorti des archives',
        (await PUT(`${M}/dossiers/${dossierId}/desarchiver`)).statut === 200);
      const revenu = (await srv.appel(`${M}/dossiers`)).corps.find((d) => d.id === dossierId) || {};
      verifier('dossier revenu parmi les clôturés', !Number(revenu.archive));

      // ── L'autorité des gestes destructeurs : une seule règle, et sa portée ──
      //
      // Cinq routes du module détruisent. Elles se gardaient de **trois** façons
      // différentes, mesuré le 8 novembre 2026 :
      //
      // | Route | Garde |
      // |---|---|
      // | `/dossiers/:id`, `/constatations/:id`, `/rapports/:id`, `/activites/:id` | gestionnaire du module, **toutes portées confondues** |
      // | `/activites-en-cours/:id` | rôle portail **SUPERADMIN**, **aucune portée** |
      // | `/activites-en-cours/:id/reinitialiser` | gestionnaire **et** validateur de la portée |
      //
      // Conséquence du premier patron : un gestionnaire dont la portée est un
      // secteur pouvait détruire dans tous les autres. La maîtrise d'ouvrage a
      // tranché — **gestionnaire du module, dans la portée de l'objet**, le rôle
      // portail hors jeu — et les cinq routes tiennent désormais cette règle
      // (ADR-003, n° 5.f.75).
      //
      // Ce bloc l'éprouve sur un compte réel, dont la portée se déplace : hors
      // de la portée le geste est refusé, dans la portée il passe, et le refus
      // **nomme la portée** plutôt que le privilège.
      {
        const COMPTE = 'm.ahoyo@anac.bj';
        const DROITS = `/api/m/droits/SURV/users/${encodeURIComponent(COMPTE)}`;
        const refs = (await srv.appel('/api/m/droits/refs')).corps || {};
        const secteurs = refs.secteurs || [];
        const d = (await srv.appel(`${M}/dossiers/${dossierId}`)).corps || {};
        const sienSecteur = d.secteur_id || '';
        const autre = secteurs.find((x) => x.id && x.id !== sienSecteur) || {};
        const sien = secteurs.find((x) => x.id === sienSecteur) || {};
        verifier('le jeu d’essai offre deux secteurs distincts, et le dossier en porte un',
          !!sienSecteur && !!autre.id && autre.id !== sienSecteur,
          JSON.stringify({ dossier: sienSecteur, autre: autre.id, secteurs: secteurs.length }));

        const poser = async (secteur) => (await srv.appel(DROITS, {
          method: 'PUT',
          body: JSON.stringify({
            // Privilège de base **lecteur** : sans cela le compte serait
            // gestionnaire partout, et la portée ne déciderait de rien.
            privilege: 'LECTEUR',
            scopes: secteur
              ? [{ domaine_id: secteur.domaine_id || '', secteur_id: secteur.id, privilege: 'GESTIONNAIRE' }]
              : [],
          }),
        })).statut;

        // ── 1. Hors de sa portée : refusé, et le refus nomme la portée ──
        verifier('le privilège se pose sur un seul secteur', await poser(autre) === 200);
        await srv.connexion(COMPTE);
        const refuse = await srv.appel(`${M}/dossiers/${dossierId}`, {
          method: 'DELETE', headers: { 'X-OASIS-Request': '1' },
        });
        await srv.connexion();
        const toujoursLa = ((await srv.appel(`${M}/dossiers`)).corps || [])
          .some((x) => x.id === dossierId);
        verifier('un gestionnaire hors de sa portée ne détruit pas un dossier, et le refus nomme la portée',
          refuse.statut === 403
          // `reserve()` rend `{ error: 'reserve', role: <code> }` : c'est `role`
          // qui porte le vocabulaire, et le socle le traduit.
          && (refuse.corps || {}).role === 'gestionnaire_portee'
          && toujoursLa === true,
          JSON.stringify({ statut: refuse.statut, corps: refuse.corps, present: toujoursLa }));

        // ── 2. Un rapport transmis ne se supprime pas, même dans la portée ──
        verifier('le privilège se déplace sur le secteur du dossier', await poser(sien) === 200);
        await srv.connexion(COMPTE);
        const transmis = await srv.appel(`${M}/rapports/${rapportV3}`, {
          method: 'DELETE', headers: { 'X-OASIS-Request': '1' },
        });
        // ── 3. Et dans la portée, une version dépassée part — avec son auteur ──
        const ancienne = await srv.appel(`${M}/rapports/${rapportId}`, {
          method: 'DELETE', headers: { 'X-OASIS-Request': '1' },
        });
        await srv.connexion();
        const restants = (await srv.appel(`${M}/rapports`)).corps || [];
        const trace = ((await srv.appel(`${M}/rapports/${rapportId}`)).corps) || {};
        verifier('un rapport transmis refuse d’être supprimé, et il est toujours là',
          transmis.statut === 409
          && (transmis.corps || {}).error === 'rapport_transmis'
          && restants.some((r) => r.id === rapportV3),
          JSON.stringify({ statut: transmis.statut, corps: transmis.corps,
            present: restants.some((r) => r.id === rapportV3) }));
        verifier('une version dépassée se retire dans la portée, disparaît des listes, et retient son auteur',
          ancienne.statut === 200
          && !restants.some((r) => r.id === rapportId),
          JSON.stringify({ statut: ancienne.statut,
            encoreListe: restants.some((r) => r.id === rapportId),
            relecture: trace.error || trace.statut || 'absent' }));

        // Le compte est rendu à ce qu'il était : une portée laissée posée
        // changerait ce que les blocs suivants mesurent.
        verifier('le compte d’essai est rendu à sa portée d’origine', await poser(null) === 200);
      }

      // ── Constatation hors activités : commentaires de validation ──
      // Le valideur annote champ par champ ; la décision fige la version,
      // et le motif du renvoi en découle.
      const directe = await P(`${M}/constatations`, {
        direct: true,
        prestataire_id: ((await srv.appel('/api/referentiels/prestataires')).corps || [])[0].id,
        domaine_id: 'AIR', criticite: 'majeur',
        titre: 'Écart hors activité', description: 'Relevé lors d’une visite inopinée.',
      });
      verifier('constatation hors activité créée',
        directe.statut === 201 && directe.corps.statut === 'direct_brouillon',
        JSON.stringify(directe.corps).slice(0, 120));
      // ── Le titre et le type de cas sont deux champs, et la création garde
      //    les deux ──
      //
      // Elle n'en gardait aucun des deux comme tel : `titre` n'était pas porté
      // par l'enregistrement — le formulaire l'écrivait, le PUT l'acceptait, la
      // création le jetait —, et le repli `cas_type: … || d.titre` le logeait
      // dans un `<select>` de types de cas dont aucune option ne vaut une
      // phrase libre. Mesuré le 9 novembre 2026 : créée avec un titre, la
      // constatation relue ne portait **aucune clé** `titre`, et son champ
      // « Titre » rendait « — » (n° 5.f.77).
      const relueTitre = await srv.appel(`${M}/constatations/${directe.corps.id}`);
      verifier('la création garde le titre, et ne le loge pas dans le type de cas',
        (relueTitre.corps || {}).titre === 'Écart hors activité'
        && ((relueTitre.corps || {}).cas_type || '') === '',
        JSON.stringify({ titre: (relueTitre.corps || {}).titre,
          cas_type: (relueTitre.corps || {}).cas_type }));
      // Le type de cas donné reste le type de cas, et n'emporte pas le titre.
      const avecCas = await P(`${M}/constatations`, {
        direct: true, prestataire_id: directe.corps.prestataire_id || undefined,
        domaine_id: 'AIR', criticite: 'majeur',
        titre: 'Le titre', cas_type: 'isole', description: 'Les deux à la fois.',
      });
      const relueCas = await srv.appel(`${M}/constatations/${avecCas.corps.id}`);
      verifier('titre et type de cas donnés ensemble restent distincts',
        (relueCas.corps || {}).titre === 'Le titre'
        && (relueCas.corps || {}).cas_type === 'isole',
        JSON.stringify({ titre: (relueCas.corps || {}).titre,
          cas_type: (relueCas.corps || {}).cas_type }));
      await srv.appel(`${M}/constatations/${avecCas.corps.id}`, { method: 'DELETE' });
      verifier('commentaires refusés avant soumission',
        (await PUT(`${M}/constatations/${directe.corps.id}/commentaires-validation`, {
          entrees: [{ cible: 'titre', texte: 'Préciser' }],
        })).statut === 409);
      verifier('constatation soumise',
        (await PUT(`${M}/constatations/${directe.corps.id}/direct-soumettre`)).statut === 200);
      verifier('commentaires de validation enregistrés',
        (await PUT(`${M}/constatations/${directe.corps.id}/commentaires-validation`, {
          entrees: [
            { cible: 'description', texte: 'Détailler les faits constatés' },
            { cible: 'general', texte: 'Joindre la preuve photographique' },
            { cible: 'titre', texte: '  ' },
          ],
        })).statut === 200);
      const avecCom = await srv.appel(`${M}/constatations/${directe.corps.id}`);
      verifier('une version ouverte, entrées vides écartées',
        (avecCom.corps.commentaires_validation || []).length === 1
        && avecCom.corps.commentaires_validation[0].entrees.length === 2
        && !avecCom.corps.commentaires_validation[0].close_le);
      verifier('renvoi motivé par les commentaires',
        (await PUT(`${M}/constatations/${directe.corps.id}/direct-renvoyer`, {
          motif: 'Description : Détailler les faits constatés ; Commentaire général : Joindre la preuve photographique',
        })).statut === 200);
      const apresRenvoi = await srv.appel(`${M}/constatations/${directe.corps.id}`);
      verifier('le renvoi fige la version',
        apresRenvoi.corps.commentaires_validation[0].issue === 'renvoi'
        && !!apresRenvoi.corps.commentaires_validation[0].close_le
        && apresRenvoi.corps.statut === 'direct_renvoye');
      await PUT(`${M}/constatations/${directe.corps.id}/direct-soumettre`);
      await PUT(`${M}/constatations/${directe.corps.id}/commentaires-validation`, {
        entrees: [{ cible: 'general', texte: 'Deuxième lecture : conforme' }],
      });
      verifier('validation ferme la seconde version',
        (await PUT(`${M}/constatations/${directe.corps.id}/direct-valider`)).statut === 200);
      const apresValidation = await srv.appel(`${M}/constatations/${directe.corps.id}`);
      verifier('deux versions conservées, la dernière validée',
        apresValidation.corps.commentaires_validation.length === 2
        && apresValidation.corps.commentaires_validation[1].issue === 'validation');

      // Le PUT générique sert la rédaction : il ne pose ni le statut ni les
    // termes opposables d'une constatation notifiée — ceux-là relèvent des
    // routes de transition et de /ajuster, avec mot de passe et motif.
    await PUT(`${M}/constatations/${directe.corps.id}`, { statut: 'soldee', criticite: 'mineure' });
    const apresPut = await srv.appel(`${M}/constatations/${directe.corps.id}`);
    verifier('le PUT générique ne pose pas le statut',
      apresPut.corps.statut !== 'soldee', apresPut.corps.statut);

    const stats = await srv.appel(`${M}/dashboard-stats`);
      verifier('tableau de bord alimenté',
        stats.statut === 200 && stats.corps.notifications_actees >= 1 && stats.corps.rapports_transmis_ytd >= 1);

      // ── Suppression gardée par « Mesures d'Application » ──
      // La constatation du scénario y devient une carence. Une suite donnée,
      // ni elle ni l'acte qui la porte ne se suppriment plus.
      const CARE = '/api/m/mesures';
      const carenceSurv = ((await srv.appel(`${CARE}/constatations`)).corps || [])
        .find((c) => c.id === fnc.corps.id);
      verifier('constatation reprise comme carence', !!carenceSurv);
      const classeSurv = await P(`${CARE}/constatations/${fnc.corps.id}/classer`, { motif: 'Essai de garde' });
      verifier('carence SURV classée', classeSurv.statut === 200 || classeSurv.statut === 201, `statut ${classeSurv.statut}`);
      const refusFnc = await srv.appel(`${M}/constatations/${fnc.corps.id}`, { method: 'DELETE' });
      verifier('constatation suivie : suppression refusée',
        refusFnc.statut === 409 && refusFnc.corps.error === 'suites_care', `statut ${refusFnc.statut}`);
      const refusActe = await srv.appel(`${M}/activites/${activite.id}`, { method: 'DELETE' });
      verifier('acte portant une constatation suivie : remise à zéro refusée',
        refusActe.statut === 409 && refusActe.corps.error === 'suites_care', `statut ${refusActe.statut}`);
      verifier('classement SURV retiré',
        (await srv.appel(`${CARE}/constatations/${fnc.corps.id}/classer`, { method: 'DELETE' })).statut === 200);

      // Une réponse de checklist, pour vérifier qu'elle part avec le dossier.
      // Elle ne se lit que sous l'identifiant de celui-ci : laissée derrière,
      // elle ne reparaît jamais et s'accumule — la base en portait trente et
      // une, d'un acte remis à zéro de longue date.
      const reponse = await P(`${M}/exec-checklist-responses`, {
        dossier_id: dossierId, checklist_id: checklists.corps[0].id,
        item_id: items.corps[0].id, statut_id: statuts.corps[0].id,
      });
      verifier('réponse de checklist enregistrée', reponse.statut === 201);
      const reponsesDu = async () => ((await srv.appel(`${M}/exec-checklist-responses`)).corps || [])
        .filter((r) => r.dossier_id === dossierId);
      verifier('réponse rattachée au dossier', (await reponsesDu()).length >= 1);

      // Remise à zéro : l'activité doit pouvoir être redéclenchée.
      verifier('suppression de l’acte par l’administrateur',
        (await srv.appel(`${M}/activites/${activite.id}`, { method: 'DELETE' })).statut === 200);
      const rendu = await srv.appel(`${M}/plans-valides`);
      verifier('activité rendue au déclenchement',
        (rendu.corps || []).some((p) => (p.activites || []).some((a) => a.id === activite.id)));
      verifier('rapport supprimé avec l’acte',
        (await srv.appel(`${M}/rapports/${rapportId}`)).statut === 404);
      verifier('réponses de checklist emportées avec le dossier',
        (await reponsesDu()).length === 0);
    }

    // ── Délais du processus (menu Paramètres → Délais) ──
    const delaisLus = await srv.appel(`${M}/parametres/delais`);
    verifier('délais du processus servis avec leurs valeurs par défaut',
      delaisLus.statut === 200 && delaisLus.corps.valeurs.redaction_rapport === 15
      && delaisLus.corps.modifiable === true);
    const delaisMaj = await PUT(`${M}/parametres/delais`, {
      valeurs: { ...delaisLus.corps.valeurs, redaction_rapport: 21, horizon_a_declencher: 6 },
    });
    verifier('délais enregistrés', delaisMaj.statut === 200 && delaisMaj.corps.valeurs.redaction_rapport === 21);
    verifier('délais relus depuis le stockage',
      (await srv.appel(`${M}/parametres/delais`)).corps.valeurs.horizon_a_declencher === 6);
    // Une valeur absurde retombe sur le défaut plutôt que de corrompre l'alerte.
    const delaisSales = await PUT(`${M}/parametres/delais`, { valeurs: { validation_rapport: 'abc' } });
    verifier('valeur invalide ramenée au défaut', delaisSales.corps.valeurs.validation_rapport === 7);
    await PUT(`${M}/parametres/delais`, { valeurs: delaisLus.corps.valeurs });

    verifier('délai d’archivage servi', delaisLus.corps.valeurs.archivage_apres_cloture === 30);

    // ── Composition des références (Paramètres → Autres paramètres) ──
    const refsLues = await srv.appel(`${M}/parametres/references`);
    verifier('compositions de référence servies',
      refsLues.statut === 200 && refsLues.corps.modeles.notification.segments.length === 3
      && refsLues.corps.segments.some((x) => x.cle === 'prestataire'));
    const majRefs = await PUT(`${M}/parametres/references`, {
      modeles: {
        ...refsLues.corps.modeles,
        notification: {
          separateur: '/',
          segments: [{ type: 'prefixe', valeur: 'NT' }, { type: 'domaine' },
            { type: 'annee_courte' }, { type: 'numero', longueur: 4 }],
        },
      },
    });
    verifier('composition enregistrée',
      majRefs.statut === 200 && majRefs.corps.modeles.notification.separateur === '/');
    // Une composition sans numéro d'ordre ne distinguerait plus deux objets.
    const sansNumero = await PUT(`${M}/parametres/references`, {
      modeles: { ...refsLues.corps.modeles, dossier: { separateur: '-', segments: [{ type: 'prefixe', valeur: 'D' }] } },
    });
    verifier('numéro d’ordre rétabli d’office',
      sansNumero.corps.modeles.dossier.segments.some((x) => x.type === 'numero'));
    await PUT(`${M}/parametres/references`, { modeles: refsLues.corps.modeles });

    // ── Rappels aux responsables ──
    const rappel = await srv.appel(`${M}/rappels`, {
      method: 'POST',
      body: JSON.stringify({ destinataire: 'm.ahoyo@anac.bj', objet: 'Activité à déclencher', message: 'Essai' }),
    });
    verifier('rappel enregistré', rappel.statut === 201 && rappel.corps.destinataire === 'm.ahoyo@anac.bj');
    verifier('rappel repris dans le journal',
      ((await srv.appel(`${M}/rappels`)).corps || []).some((r) => r.id === rappel.corps.id));
    verifier('rappel sans destinataire refusé',
      (await srv.appel(`${M}/rappels`, { method: 'POST', body: '{}' })).statut === 400);

    // ── Rôles et droits confiés aux comptes d'un organisme ──
    const roleModule = await srv.appel(`${M}/mes-utilisateurs`);
    verifier('« Mes utilisateurs » fermé hors vue Prestataire, rôle nommé',
      roleModule.statut === 403 && roleModule.corps.error === 'reserve' && roleModule.corps.role === 'vue_prestataire',
      JSON.stringify(roleModule.corps));

    // ── Comptes prestataire : réservés aux comptes rattachés ──
    verifier('« Mes utilisateurs » fermé aux comptes AAC',
      (await srv.appel(`${M}/mes-utilisateurs`)).statut === 403);

    // ── Bascule Vue AAC / Vue Prestataire (super-administrateur) ──
    const vueInitiale = await srv.appel(`${M}/vue`);
    verifier('bascule de vue offerte au super-administrateur',
      vueInitiale.statut === 200 && vueInitiale.corps.disponible === true
      && vueInitiale.corps.vue === 'aac');

    const bascule = await PUT(`${M}/vue`, { vue: 'prestataire' });
    verifier('passage en vue Prestataire',
      bascule.statut === 200 && bascule.corps.vue === 'prestataire' && bascule.corps.prestataire_id);
    const pid = (bascule.corps || {}).prestataire_id;

    const moiPrest = await srv.appel(`${M}/moi`);
    verifier('rôle et rattachement adaptés à la vue',
      moiPrest.corps.role_m3 === 'M3_Prestataire' && moiPrest.corps.prestataire_id === pid);

    // Le cloisonnement des données suit la vue, il n'est pas seulement affiché.
    const dossiersVue = await srv.appel(`${M}/dossiers`);
    verifier('dossiers restreints au prestataire de la vue',
      dossiersVue.statut === 200
      && (dossiersVue.corps || []).every((d) => d.prestataire_id === pid && d.statut === 'cloture'));
    const mesUsers = await srv.appel(`${M}/mes-utilisateurs`);
    verifier('« Mes utilisateurs » ouvert en vue Prestataire', mesUsers.statut === 200);
    // La page décrit les rôles et les droits qu'un organisme peut confier.
    // Nommer les droits attendus plutôt que les compter : l'ajout d'un droit
    // doit signaler ce qui manque, pas seulement qu'il y en a un de plus.
    const droitsAttendus = ['notifications', 'echanges', 'rapports',
      'constatations', 'utilisateurs', 'emails'];
    const droitsRendus = (mesUsers.corps.droits || []).map((d) => d.cle);
    verifier('rôles et droits d’organisme décrits',
      (mesUsers.corps.roles || []).some((r) => r.cle === 'ADMIN_PRESTATAIRE')
      && droitsAttendus.every((c) => droitsRendus.includes(c))
      && droitsRendus.length === droitsAttendus.length);
    // Seuls les comptes du prestataire ayant accès au module y figurent.
    verifier('comptes restreints au prestataire et au module',
      (mesUsers.corps.utilisateurs || [])
        .every((u) => u.prestataire_id === pid && (!u.modules.length || u.modules.includes('SURV'))));
    const compte = (mesUsers.corps.utilisateurs || [])[0];
    if (compte) {
      // Rôle et droits confiés portent sur le compte du portail lui-même.
      const maj = await PUT(`${M}/mes-utilisateurs/${compte.id}`, {
        role: 'PRESTATAIRE', droits: ['notifications', 'rapports'], actif: true,
      });
      verifier('rôle et droits confiés enregistrés',
        maj.statut === 200 && maj.corps.role === 'PRESTATAIRE'
        && maj.corps.droits.join(',') === 'notifications,rapports');
      const relu = (await srv.appel(`${M}/mes-utilisateurs`)).corps.utilisateurs
        .find((u) => u.id === compte.id) || {};
      verifier('droits relus depuis le portail', (relu.droits || []).join(',') === 'notifications,rapports');
      // Sans le droit « utilisateurs », la page se ferme au compte lui-même.
      if (compte.id === (await srv.appel(`${M}/moi`)).corps.username) {
        verifier('page fermée au compte privé du droit',
          (await srv.appel(`${M}/mes-utilisateurs`)).statut === 403);
      }
      await PUT(`${M}/mes-utilisateurs/${compte.id}`, {
        role: compte.role, droits: compte.droits, actif: compte.actif !== false,
      });
    }

    // ══ Le périmètre des routes est celui de la liste ══
    //
    // Le contrôle ci-dessus — « comptes restreints au prestataire et au
    // module » — porte sur la **liste**. Les routes, elles, ne regardaient que
    // le rattachement : `cible()` omettait le filtre d'accès au module que la
    // liste applique. Les deux périmètres divergeaient donc, au rebours de
    // l'invariant écrit en tête de `src/comptes_prestataire.js`.
    //
    // Mesuré le 9 novembre 2026 sur un compte créé depuis SURV puis rattaché au
    // seul module RAMP : absent de la liste de SURV, et pourtant, depuis SURV,
    // réinitialiser son mot de passe rendait **200**, le révéler en clair
    // **200**, modifier ses droits **200**, le détruire **200**.
    //
    // Ce que cela ouvrait : le droit « utilisateurs » est propre à chaque module
    // (`droits_surv` ici, un autre champ pour RAMP). Un agent à qui l'on confie
    // les comptes dans un module seul pouvait saisir le mot de passe d'un
    // collègue qui n'a jamais eu accès qu'à l'autre.
    //
    // La ronde déplace l'accès au module **entre deux requêtes**, et exige que
    // les trois routes passent de 200 à 404 — un compte hors du périmètre
    // n'existe pas (ADR-003 n° 5.f.76).
    const HORS = 'hors.module@test.int';
    const ne = await srv.appel(`${M}/mes-utilisateurs`, {
      method: 'POST',
      body: JSON.stringify({ email: HORS, nom: 'Hors', prenom: 'Module', role: 'PRESTATAIRE' }),
    });
    const dansLaListe = async () => ((await srv.appel(`${M}/mes-utilisateurs`)).corps.utilisateurs || [])
      .some((u) => u.id === HORS);
    verifier('un compte créé depuis SURV naît avec l’accès à SURV, et paraît dans la liste',
      ne.statut === 201 && !!ne.corps.temp_password && await dansLaListe(),
      JSON.stringify({ statut: ne.statut, dansLaListe: await dansLaListe() }));

    // Les trois routes, tant que le compte a l'accès au module.
    const troisRoutes = async () => ({
      reset: (await srv.appel(`${M}/mes-utilisateurs/${HORS}/reset-password`, { method: 'POST' })).statut,
      reveal: (await srv.appel(`${M}/mes-utilisateurs/${HORS}/reveal-password`, {
        method: 'POST', body: JSON.stringify({ admin_password: 'Aerosup@2026!Uemoa' }),
      })).statut,
      maj: (await PUT(`${M}/mes-utilisateurs/${HORS}`, { nom: 'Touche' })).statut,
    });
    const avecAcces = await troisRoutes();
    verifier('tant qu’il a l’accès au module, les trois routes agissent sur lui',
      avecAcces.reset === 200 && avecAcces.reveal === 200 && avecAcces.maj === 200,
      JSON.stringify(avecAcces));

    // On lui retire l'accès à SURV par la gestion des comptes du portail.
    const horsSurv = await PUT(`/api/users/${HORS}`, { action: 'set-modules', modules: ['RAMP'] });
    verifier('l’accès à SURV retiré, le compte quitte la liste de SURV',
      horsSurv.statut === 200 && (await dansLaListe()) === false,
      JSON.stringify({ statut: horsSurv.statut, dansLaListe: await dansLaListe() }));

    const sansAcces = await troisRoutes();
    verifier('hors du module, les trois routes ne le trouvent plus — 404, et non 403',
      sansAcces.reset === 404 && sansAcces.reveal === 404 && sansAcces.maj === 404,
      JSON.stringify(sansAcces));

    // ── Et la route qui détruisait un compte n'existe plus ──
    //
    // Elle détruisait réellement le compte du portail (mesuré : sept comptes
    // puis six), alors qu'aucun des deux écrans ne l'offrait — les deux n'ont
    // qu'un bouton « Désactiver ». Et elle n'avait rien de la cérémonie que le
    // portail exige pour le même geste : mot de passe du demandeur, fiche du
    // répertoire du personnel, sessions fermées, entrée au journal d'audit.
    //
    // Le contrôle porte sur la **propriété**, non sur le code de réponse : le
    // compte survit à la tentative.
    //
    // ── Et il faut lui rendre l'accès au module d'abord ──
    //
    // La première version de ce contrôle passait **pour une mauvaise raison**,
    // et la contre-épreuve l'a dit : route remise, il restait vert. Le compte
    // venait d'être sorti de SURV par le contrôle précédent ; la route, remise,
    // ne le trouvait donc pas — le périmètre la masquait. Deux gardes en série,
    // dont le second n'était pas éprouvé.
    //
    // L'accès est rendu avant la tentative : il ne reste alors, entre la requête
    // et un compte détruit, que l'absence de la route.
    //
    // *Un contrôle qui passe pour une autre raison que celle qu'il annonce ne
    // garde rien — et seule la contre-épreuve le dit.*
    const rendu = await PUT(`/api/users/${HORS}`, { action: 'set-modules', modules: ['SURV'] });
    verifier('l’accès à SURV rendu, le compte reparaît dans la liste',
      rendu.statut === 200 && await dansLaListe(),
      JSON.stringify({ statut: rendu.statut, dansLaListe: await dansLaListe() }));
    const comptesAvant = ((await srv.appel('/api/users')).corps || []).length;
    const detruire = await srv.appel(`${M}/mes-utilisateurs/${HORS}`, { method: 'DELETE' });
    const comptesApres = ((await srv.appel('/api/users')).corps || []).length;
    verifier('aucune route du module ne détruit un compte du portail',
      detruire.statut !== 200 && comptesApres === comptesAvant && comptesAvant > 0,
      JSON.stringify({ statut: detruire.statut, comptes: [comptesAvant, comptesApres] }));

    // Le bac rendu : l'effacement passe par le portail et sa cérémonie — c'est
    // précisément ce que la route retirée ne faisait pas.
    const efface = await srv.appel(`/api/users/${HORS}`, {
      method: 'DELETE', body: JSON.stringify({ adminPassword: 'Aerosup@2026!Uemoa' }),
    });
    verifier('le portail, lui, efface — sur mot de passe du demandeur, et en le tracant',
      efface.statut === 200 && efface.corps.efface === HORS
      && ((await srv.appel('/api/users')).corps || []).length === comptesAvant - 1,
      JSON.stringify({ statut: efface.statut, corps: efface.corps }));

    const retour = await PUT(`${M}/vue`, { vue: 'aac' });
    verifier('retour en vue AAC', retour.statut === 200 && retour.corps.vue === 'aac');
    verifier('rôle AAC rétabli',
      (await srv.appel(`${M}/moi`)).corps.role_m3 === 'M3_Administrateur');

    // Un compte non super-administrateur ne dispose pas de la bascule.
    await srv.connexion('m.ahoyo@anac.bj');
    const vueAutre = await srv.appel(`${M}/vue`);
    verifier('bascule masquée aux autres comptes',
      vueAutre.statut === 200 && vueAutre.corps.disponible === false);
    verifier('bascule refusée aux autres comptes',
      (await PUT(`${M}/vue`, { vue: 'prestataire' })).statut === 403);
    await srv.connexion();

    // ── Remise d'un document bureautique composé par le front ──
    //
    // Les fiches de constat et de suivi sont **composées dans le navigateur**,
    // non par le serveur : il n'y a pas de route qui les fabrique. En Word, le
    // front dépose le document composé puis le réclame par une requête GET —
    // le détour existe parce qu'une URL `blob:` téléchargée depuis une iframe
    // est ignorée sans message par certains navigateurs.
    //
    // Ce dépôt a un contrat qui mérite d'être tenu : éphémère, **nominatif** et
    // à **usage unique**. C'est cela qu'on éprouve ici, et non le document —
    // dont le contenu, lui, ne quitte jamais le client.
    const DOC = `${M}/documents/word`;
    verifier('un document vide est refusé au dépôt',
      (await P(DOC, { nom: 'x.doc', contenu: '' })).statut === 400);

    const depot = await P(DOC, { nom: 'Fiche_Constat_ESSAI.doc', contenu: '<html><body>Essai</body></html>' });
    verifier('le dépôt rend un jeton',
      depot.statut === 200 && /^[0-9a-f]{32}$/.test((depot.corps || {}).jeton || ''),
      `${depot.statut} — ${JSON.stringify(depot.corps).slice(0, 60)}`);

    const remise = await srv.appel(`${DOC}/${(depot.corps || {}).jeton}`);
    verifier('le document part en pièce jointe, typé Word et interdit au reniflage',
      remise.statut === 200
      && /application\/msword/.test(remise.entetes['content-type'] || '')
      && remise.entetes['x-content-type-options'] === 'nosniff'
      && /^attachment;/.test(remise.entetes['content-disposition'] || '')
      && /Fiche_Constat_ESSAI\.doc/.test(remise.entetes['content-disposition'] || ''),
      JSON.stringify({
        statut: remise.statut, type: remise.entetes['content-type'],
        nosniff: remise.entetes['x-content-type-options'],
        disposition: remise.entetes['content-disposition'],
      }));
    // Le contenu est rendu tel qu'il a été déposé. La route le préfixe d'une
    // BOM pour Word ; elle n'est pas contrôlée ici, le décodeur de `fetch`
    // retirant une BOM de tête avant que le texte nous parvienne — l'affirmer
    // d'ici serait affirmer une propriété du décodeur, non de la route.
    verifier('le contenu déposé est rendu intact',
      String(remise.corps) === '<html><body>Essai</body></html>',
      JSON.stringify(String(remise.corps).slice(0, 50)));

    verifier('le jeton ne sert qu’une fois',
      (await srv.appel(`${DOC}/${(depot.corps || {}).jeton}`)).statut === 404);
    verifier('un jeton inventé ne rend rien',
      (await srv.appel(`${DOC}/0123456789abcdef0123456789abcdef`)).statut === 404);

    // ── L'export des constatations en classeur ──
    //
    // L'écran l'obtient en posant `window.location.href` sur cette route : le
    // navigateur télécharge la réponse, guidé par `Content-Disposition`, et la
    // page ne manipule aucun blob. La conséquence pour une suite de navigateur
    // est qu'elle **ne peut pas** cliquer ce geste — la page part, et
    // l'évaluation meurt avec elle (ADR-003 n° 5.f.24).
    //
    // C'est donc ici qu'il s'éprouve, par ce que la route rend.
    const XLSX = `${M}/constatations/export-xlsx`;
    const toutesFnc = (await srv.appel(`${M}/constatations`)).corps || [];
    const idsFnc = toutesFnc.slice(0, 3).map((c) => c.id);
    if (!idsFnc.length) {
      horsPortee('l’export des constatations rend un classeur', 'aucune constatation dans le bac');
    } else {
      const parUrl = await srv.appel(`${XLSX}?ids=${idsFnc.join(',')}&titre=Essai&filtres=aucun`);
      verifier('l’export des constatations rend un classeur en pièce jointe',
        parUrl.statut === 200
        && /spreadsheet|excel|octet-stream/i.test(parUrl.entetes['content-type'] || '')
        && /^attachment;/.test(parUrl.entetes['content-disposition'] || '')
        && String(parUrl.corps).length > 200,
        JSON.stringify({ statut: parUrl.statut, type: parUrl.entetes['content-type'],
          disposition: (parUrl.entetes['content-disposition'] || '').slice(0, 60),
          taille: String(parUrl.corps).length }));
      // ── La seconde voie : un POST qui **prépare**, et non qui sert ──
      //
      // Une liste trop longue pour une adresse passe par un POST. Or un POST ne
      // peut pas être une navigation : le garde d'origine (SEC-06) refuse une
      // écriture sans `X-OASIS-Request`, en-tête qu'un formulaire de navigation
      // ne peut pas poser. L'écran devait donc fabriquer son téléchargement —
      // le patron qui échoue sans bruit quand la préparation prend quelques
      // secondes, ce qui est le cas d'une liste assez longue pour arriver ici.
      //
      // Le POST dépose désormais la pièce sous un jeton et rend l'adresse d'un
      // GET que le navigateur suit (n° 5.f.71).
      const prepare = await P(XLSX, { ids: idsFnc, titre: 'Essai', filtres: 'aucun' });
      const jetonFnc = (prepare.corps || {}).jeton || '';
      const servi = jetonFnc
        ? await srv.appel(`${M}/constatations/fichier/${jetonFnc}`) : { statut: 0 };
      const rejoue = jetonFnc
        ? await srv.appel(`${M}/constatations/fichier/${jetonFnc}`) : { statut: 0 };
      verifier('une liste trop longue se prépare par un POST et se retire par une navigation, une seule fois',
        prepare.statut === 200
        && /^[0-9a-f]{32}$/.test(jetonFnc)
        && (prepare.corps || {}).url === `${M}/constatations/fichier/${jetonFnc}`
        && (prepare.corps || {}).lignes === idsFnc.length
        // Le POST ne sert plus le classeur : il ne rend que de quoi le chercher.
        && !/spreadsheet/i.test(prepare.entetes['content-type'] || '')
        // Et le GET le sert, en pièce jointe.
        && servi.statut === 200
        && /spreadsheet|excel|octet-stream/i.test(servi.entetes['content-type'] || '')
        && /^attachment;/.test(servi.entetes['content-disposition'] || '')
        && String(servi.corps).length > 200
        // À usage unique : un jeton rejoué ne rend plus rien.
        && rejoue.statut === 404,
        JSON.stringify({ prepare: { statut: prepare.statut, corps: prepare.corps },
          servi: servi.statut, rejoue: rejoue.statut }));

      verifier('un jeton de pièce préparée inventé ne rend rien',
        (await srv.appel(`${M}/constatations/fichier/0123456789abcdef0123456789abcdef`))
          .statut === 404);

      // ── Le nom de la pièce, dans les deux formes de la RFC 6266 ──
      //
      // Une navigation nomme le fichier par l'en-tête, non par la page : c'est
      // le serveur qui décide, et un nom hors de l'ASCII ne tient pas dans un
      // `filename="…"`.
      verifier('la pièce se nomme dans les deux formes que la RFC 6266 prévoit',
        /filename="[\x20-\x7e]+"/.test(parUrl.entetes['content-disposition'] || '')
        && /filename\*=UTF-8''/.test(parUrl.entetes['content-disposition'] || ''),
        parUrl.entetes['content-disposition']);

      // ── Un refus devient une page, puisque le navigateur l'affiche ──
      //
      // Une navigation ne porte pas `X-OASIS-Request` : c'est à cela que le
      // serveur la reconnaît. Un `{"error":"…"}` dans un onglet nu n'est pas une
      // réponse à un agent qui attendait un fichier.
      const refusEnPage = await srv.appel(
        `${M}/constatations/fichier/0123456789abcdef0123456789abcdef`,
        { headers: { 'X-OASIS-Request': '' } },
      );
      verifier('le refus d’un téléchargement suivi par le navigateur est une page lisible, non un objet JSON',
        refusEnPage.statut === 404
        && /text\/html/.test(refusEnPage.entetes['content-type'] || '')
        && /<!doctype html>/i.test(String(refusEnPage.corps))
        && /n’existe plus/.test(String(refusEnPage.corps))
        && /404 piece_expiree/.test(String(refusEnPage.corps)),
        JSON.stringify({ statut: refusEnPage.statut,
          type: refusEnPage.entetes['content-type'],
          extrait: String(refusEnPage.corps).slice(0, 90) }));
    }

    // ── Les trois classeurs de paramétrage, servis en pièce jointe ──
    //
    // Ces trois exports passaient par `await fetch` puis une ancre fabriquée ;
    // ils passent désormais par une navigation (n° 5.f.71). La ronde de
    // navigateur de SURV **ne les exerce pas** — aucun des cinq exports de ce
    // module n'est à son relevé —, de sorte que c'est ici, et seulement ici,
    // que la moitié serveur de la conversion se mesure : le type, la pièce
    // jointe, et le nom dans les deux formes.
    {
      // `exec-checklists`, et non `checklists` : ma première rédaction s'est
      // trompée de route, et le corps du 404 **est une chaîne** — dont
      // `.length` valait quinze, de sorte que le garde « aucune checklist dans
      // le bac » ne s'est pas déclenché et que l'identifiant exercé était un
      // caractère. *Un garde qui lit `.length` ne distingue pas une liste d'une
      // phrase ; `Array.isArray` le fait.*
      const liste = (await srv.appel(`${M}/exec-checklists`)).corps;
      const checklists = Array.isArray(liste) ? liste : [];
      if (!checklists.length) {
        horsPortee('les classeurs de paramétrage se servent en pièce jointe',
          'aucune checklist dans le bac');
      } else {
        const cl = checklists[0];
        const brutsDossiers = (await srv.appel(`${M}/dossiers`)).corps;
        const dossiers = Array.isArray(brutsDossiers) ? brutsDossiers : [];
        const chemins = [
          [`${M}/checklists/${cl.id}/export-xlsx`, 'items d’une checklist'],
          [`${M}/checklists/${cl.id}/sous-themes/export-xlsx`, 'sous-thèmes'],
          ...(dossiers.length
            ? [[`${M}/checklist-fill/${dossiers[0].id}/${cl.id}/export-xlsx`, 'checklist renseignée']]
            : []),
        ];
        const servis = [];
        for (const [chemin, quoi] of chemins) {
          // eslint-disable-next-line no-await-in-loop
          const r = await srv.appel(chemin);
          servis.push({
            quoi,
            statut: r.statut,
            piece: /^attachment;/.test(r.entetes['content-disposition'] || ''),
            deuxFormes: /filename="[\x20-\x7e]+"/.test(r.entetes['content-disposition'] || '')
              && /filename\*=UTF-8''/.test(r.entetes['content-disposition'] || ''),
            classeur: /spreadsheet|excel|octet-stream/i.test(r.entetes['content-type'] || ''),
            taille: String(r.corps).length,
          });
        }
        verifier(`les ${servis.length} classeurs de paramétrage se servent en pièce jointe, nommée dans les deux formes`,
          servis.length >= 2
          && servis.every((x) => x.statut === 200 && x.piece && x.deuxFormes
            && x.classeur && x.taille > 200),
          JSON.stringify(servis));
      }
    }

    // ── Transmettre une constatation sans serveur de messagerie ──
    //
    // La transmission **envoie un courriel**. Sans serveur de messagerie, elle
    // doit refuser — et refuser **proprement** : dire que rien n'a été transmis,
    // plutôt que de laisser croire à un envoi. C'est cette propriété qu'on
    // éprouve ici, le geste n'étant pas cliquable dans une suite de navigateur
    // sans salir son relevé d'incidents (ADR-003 n° 5.f.24).
    // Elle a **deux** refus, et chacun dit sa raison. Le premier est une
    // exigence de la route ; le second est l'état du monde.
    if (idsFnc.length) {
      const sansDestinataire = await P(`${M}/constatations/${idsFnc[0]}/transmettre`, {});
      verifier('la transmission d’une constatation refuse sans destinataire',
        sansDestinataire.statut === 400
        && /destinataire/i.test(JSON.stringify(sansDestinataire.corps || '')),
        `${sansDestinataire.statut} — ${JSON.stringify(sansDestinataire.corps).slice(0, 120)}`);

      // ── Le refus du serveur de messagerie n'est pas éprouvé ici, et pourquoi ──
      //
      // Pour l'atteindre il faudrait franchir quatre gardes : le statut
      // `direct_valide`, un destinataire valide, un objet, et une pièce dont le
      // contenu serait fabriqué pour l'occasion. On éprouverait alors un refus
      // d'**environnement** — l'absence de serveur SMTP — au prix d'un document
      // inventé, ce qui n'éprouve plus l'écran.
      //
      // Le refus a été **mesuré une fois**, dans le navigateur, et il est
      // propre : `502`, « Le serveur de messagerie (localhost:1025) ne répond
      // pas : rien n'a été transmis. » La route ne laisse pas croire à un envoi,
      // et c'est la seule chose qui importait de savoir.
      //
      // *Un contrôle qui doit fabriquer ses quatre conditions n'éprouve plus
      // qu'une chose : qu'on sait les fabriquer.*
    }

    // Nominatif : le dépôt appartient au compte qui l'a fait. Un autre compte
    // authentifié, porteur d'un jeton valide et non consommé, n'obtient rien.
    const aMoi = await P(DOC, { nom: 'Fiche_Suivi_ESSAI.doc', contenu: '<html>y</html>' });
    await srv.connexion('m.ahoyo@anac.bj');
    verifier('le document déposé est refusé à un autre compte',
      (await srv.appel(`${DOC}/${(aMoi.corps || {}).jeton}`)).statut === 404);
    await srv.connexion();
    verifier('et reste disponible pour celui qui l’a déposé',
      (await srv.appel(`${DOC}/${(aMoi.corps || {}).jeton}`)).statut === 200);

    // ── Privilège « Prestataire » attribué dans Gestion des Droits ──
    // Contrairement à la bascule, il n'est pas réversible depuis le module :
    // le compte travaille en permanence dans le périmètre de son prestataire.
    // Ce contrôle vient en dernier, l'identité du compte d'essai changeant.
    const prestataires = (await srv.appel('/api/referentiels/prestataires')).corps || [];
    const droits = '/api/m/droits/SURV/users/superadmin%40anac.bj';
    if (prestataires.length) {
      const cible = prestataires[0].id;
      const pose = await srv.appel(droits, {
        method: 'PUT',
        body: JSON.stringify({ privilege: 'PRESTATAIRE', scopes: [{ prestataire_id: cible }] }),
      });
      verifier('privilège Prestataire enregistré sur l’espace SURV',
        pose.statut === 200 && pose.corps.privilege === 'PRESTATAIRE');
      const moi = await srv.appel(`${M}/moi`);
      verifier('le privilège Prestataire ouvre la vue Prestataire',
        moi.corps.role_m3 === 'M3_Prestataire' && moi.corps.prestataire_id === cible);
      verifier('constatations restreintes aux prestataires de la portée',
        ((await srv.appel(`${M}/constatations`)).corps || []).every((c) => c.prestataire_id === cible));

      // Plusieurs prestataires en portée : le périmètre est leur réunion.
      if (prestataires.length > 1) {
        const deux = prestataires.slice(0, 2).map((p) => p.id);
        await srv.appel(droits, {
          method: 'PUT',
          body: JSON.stringify({ privilege: 'PRESTATAIRE', scopes: deux.map((id) => ({ prestataire_id: id })) }),
        });
        const plans = (await srv.appel(`${M}/plans-valides`)).corps || [];
        verifier('périmètre étendu à plusieurs prestataires',
          plans.every((p) => (p.activites || []).every((a) => deux.includes(a.prestataire_id))));
        // Le périmètre porte bien la réunion des prestataires retenus.
        const moiDeux = await srv.appel(`${M}/moi`);
        verifier('rattachement issu de la portée', deux.includes(moiDeux.corps.prestataire_id));
      }

      // Aucune portée : plus aucune donnée du module n'est accessible.
      await srv.appel(droits, {
        method: 'PUT', body: JSON.stringify({ privilege: 'PRESTATAIRE', scopes: [] }),
      });
      const vides = await Promise.all([
        srv.appel(`${M}/plans-valides`), srv.appel(`${M}/notifications`),
        srv.appel(`${M}/dossiers`), srv.appel(`${M}/constatations`), srv.appel(`${M}/rapports`),
      ]);
      verifier('sans prestataire retenu, aucune donnée du module',
        vides.every((r) => r.statut === 200 && Array.isArray(r.corps) && r.corps.length === 0),
        vides.map((r) => (Array.isArray(r.corps) ? r.corps.length : r.statut)).join('/'));
    }

    return bilan('Module SURV');
  } finally {
    srv.arreter();
  }
};
