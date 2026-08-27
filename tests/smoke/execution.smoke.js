// Fumée — module « Exécution de la Surveillance » : paramétrage repris de
// PESSCO, consommation des plans validés via le bus, et circuit complet d'un
// acte de surveillance (notification → accord → dossier → rapport → clôture).
const { demarrer, verifier, bilan } = require('./harness');

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
        (await PUT(`${M}/notifications/${notifId}/validate-accord`)).statut === 400);

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

      const stats = await srv.appel(`${M}/dashboard-stats`);
      verifier('tableau de bord alimenté',
        stats.statut === 200 && stats.corps.notifications_actees >= 1 && stats.corps.rapports_transmis_ytd >= 1);

      // Remise à zéro : l'activité doit pouvoir être redéclenchée.
      verifier('suppression de l’acte par l’administrateur',
        (await srv.appel(`${M}/activites/${activite.id}`, { method: 'DELETE' })).statut === 200);
      const rendu = await srv.appel(`${M}/plans-valides`);
      verifier('activité rendue au déclenchement',
        (rendu.corps || []).some((p) => (p.activites || []).some((a) => a.id === activite.id)));
      verifier('rapport supprimé avec l’acte',
        (await srv.appel(`${M}/rapports/${rapportId}`)).statut === 404);
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
    verifier('« Mes utilisateurs » fermé hors vue Prestataire', roleModule.statut === 403);

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
