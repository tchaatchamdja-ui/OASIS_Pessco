// Module « Planification de la Surveillance » — circuit du plan.
// Soumission, validation, approbation DG, transmission, rejet et archivage ;
// amendement (nouvelle version), désarchivage, versions et commentaires.
const db = require('./store');
const { asynchrone } = require('../../route');
const D = require('./domaine');
const { valider } = require('../../valider');

// Une transition = un statut. Soumettre relève du contributeur ; décider
// (valider, rejeter, archiver, approuver, transmettre) relève du validateur.
const TRANSITIONS = {
  soumettre: 'soumis',
  valider: 'valide',
  'approuver-dg': 'approuve_dg',
  transmettre: 'transmis',
  rejeter: 'rejete',
  // Rejet définitif : le plan reste consultable mais n'est plus modifiable
  'rejeter-annuler': 'rejete_clos',
  archiver: 'archive',
};

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, audit } = deps;
  const nomComplet = D.nomComplet(auth);

  // Une version validée remplace la précédente, qui se retire. Elle n'est pas
  // archivée : on range aux archives un plan arrivé à son terme, et confondre
  // les deux sorts faisait passer chaque amendement pour une fin de plan.
  // La version retirée garde sa place dans la lignée — versions, historique,
  // processus déjà menés — mais ne figure plus ni parmi les plans en vigueur
  // ni parmi les archives.
  //
  // Travaille sur l'état en cours de transformation : la remontée de la lignée
  // faisait deux écritures par ancêtre — le statut, puis l'inscription au
  // circuit —, et une version pouvait rester retirée sans que rien ne dise par
  // quoi.
  const retirerAncetres = (d, rec, username) => {
    const plans = d.plans || [];
    let ancetre = plans.find((p) => p.id === rec.parent_plan_id);
    const vus = new Set();
    while (ancetre && !vus.has(ancetre.id)) {
      vus.add(ancetre.id);
      if (D.STATUTS_EN_VIGUEUR.includes(ancetre.statut)) {
        const i = plans.findIndex((p) => p.id === ancetre.id);
        plans[i] = {
          ...plans[i],
          statut: D.STATUT_REMPLACE, remplace_le: new Date().toISOString(),
          remplace_par_qui: username, remplace_par: rec.id,
          updatedAt: new Date().toISOString(),
        };
        D.inscrireWf(d, ancetre.id, 'remplacer', username,
          { commentaire: `Remplacé par la version ${rec.version || ''}`.trim() });
      }
      ancetre = ancetre.parent_plan_id
        ? plans.find((p) => p.id === ancetre.parent_plan_id) : null;
    }
  };

  // ── Une transition, une transformation ──
  //
  // Valider un plan, c'était jusqu'à une dizaine d'écritures : le statut, les avis
  // saisis activité par activité, les versions remplacées avec leur inscription au
  // circuit, et la décision elle-même. Entre elles, l'application montrait un plan
  // validé dont le circuit ne portait pas la validation — un acte d'autorité sans
  // sa justification —, et un échec au milieu l'y laissait pour de bon.
  Object.entries(TRANSITIONS).forEach(([route, statut]) => {
    app.post(`${M}/plans/:id/${route}`, requireAuth, asynchrone(async (req, res) => {
      const requis = route === 'soumettre' ? 'CONTRIBUTEUR' : 'VALIDATEUR';
      if (!D.peut(req, requis, await D.planDe(req.params.id))) return D.refus(res);
      const body = req.body || {};
      const commentaire = body.commentaire || body.motif || '';
      const champ = route.replace(/-/g, '_');

      let rec = null;
      await db.transformer((d) => {
        rec = null;
        const plans = d.plans || [];
        const i = plans.findIndex((p) => p.id === req.params.id);
        if (i < 0) return db.INCHANGE;
        plans[i] = {
          ...plans[i],
          statut,
          [`${champ}_le`]: new Date().toISOString(),
          [`${champ}_par`]: req.user.username,
          // `undefined` et non le motif d'avant : la clé disparaît à la
          // sérialisation, et le motif ne vaut que pour la transition qui le
          // porte. C'est `commentaire_rejet`, juste dessous, qui survit.
          motif: body.motif || undefined,
          // Le motif du dernier rejet reste visible pour la reprise du plan. Lu
          // sur l'état qu'on écrit, et non par une seconde lecture d'avant.
          commentaire_rejet: ['rejeter', 'rejeter-annuler'].includes(route) ? commentaire
            : (route === 'soumettre' ? '' : plans[i].commentaire_rejet),
          updatedAt: new Date().toISOString(),
        };
        rec = plans[i];
        d.plans = plans;

        // Commentaires de validation saisis activité par activité
        const acts = d.activites || [];
        (body.activity_comments || []).forEach((c) => {
          const j = acts.findIndex((a) => a.id === c.activity_id
            || (c.activity_objet && (a.objet || a.titre) === c.activity_objet && a.plan_id === rec.id));
          if (j >= 0) {
            acts[j] = { ...acts[j], commentaire_validation: c.commentaire, updatedAt: new Date().toISOString() };
          }
        });
        d.activites = acts;

        if (route === 'valider' && rec.parent_plan_id) retirerAncetres(d, rec, req.user.username);
        D.inscrireWf(d, rec.id, route, req.user.username, { motif: body.motif || '', commentaire });
        return d;
      });

      if (!rec) return res.status(404).json({ error: 'not_found' });
      await audit.log(req.user.username, `PLAN_${route.toUpperCase().replace(/-/g, '_')}`, { id: rec.id });
      return res.json(rec);
    }));
  });

  // ── Amendement ──
  // Amender un plan en vigueur crée une nouvelle version en brouillon
  // (copie des activités) ; le plan validé reste la référence tant que
  // l'amendement n'est pas validé à son tour.
  app.post(`${M}/plans/:id/amender`, requireAuth, asynchrone(async (req, res) => {
    const src = await D.planDe(req.params.id);
    if (!src) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'CONTRIBUTEUR', src)) return D.refus(res);

    const motif = (req.body && req.body.motif) || '';
    // Tirés hors de la transformation : rejouée, elle doit reposer les mêmes.
    const nouvelId = db.uid();
    let refus = null;
    let child = null;
    await db.transformer((d) => {
      refus = null; child = null;
      const plans = d.plans || [];
      const parent = plans.find((p) => p.id === req.params.id);
      if (!parent) { refus = { code: 404, corps: { error: 'not_found' } }; return db.INCHANGE; }
      if (!D.STATUTS_EN_VIGUEUR.includes(parent.statut)) {
        refus = { code: 409, corps: { error: 'plan_non_amendable', statut: parent.statut } };
        return db.INCHANGE;
      }
      // Un plan n'a qu'un amendement à la fois. Ouvrir le second donnerait deux
      // héritiers de la même version : chacun copierait les activités d'alors, et
      // valider l'un effacerait le travail fait dans l'autre.
      //
      // **Le contrôle se fait ici, et non avant.** Vérifié avant la
      // transformation, deux demandes simultanées le passaient toutes deux — et
      // produisaient exactement les deux héritiers qu'il existe pour interdire.
      // L'amendement en cours est nommé dans le refus, pour que l'écran sache où
      // renvoyer.
      const enCours = plans.find((p) => p.parent_plan_id === parent.id
        && D.STATUTS_AMENDEMENT.includes(p.statut));
      if (enCours) {
        refus = {
          code: 409,
          corps: { error: 'amendement_en_cours', amendement: enCours.id, version: enCours.version },
        };
        return db.INCHANGE;
      }

      const { id: _old, ...base } = parent;
      child = {
        ...base, statut: 'brouillon', version: (parent.version || 1) + 1,
        parent_plan_id: parent.id, motif_amendement: motif,
        createdAt: new Date().toISOString(), created_by: req.user.username,
        date_soumission: '', date_validation: '',
        id: nouvelId,
      };
      plans.push(child);
      d.plans = plans;

      // parent_activite_id = identifiant racine, il relie une activité à ses
      // copies dans les versions suivantes (comparaison des amendements).
      const acts = d.activites || [];
      acts.filter((a) => a.plan_id === parent.id).forEach((a) => {
        const { id: _aid, ...ab } = a;
        acts.push({
          ...ab, plan_id: nouvelId, parent_activite_id: a.parent_activite_id || a.id,
          createdAt: new Date().toISOString(), id: db.uid(),
        });
      });
      d.activites = acts;

      D.inscrireWf(d, nouvelId, 'amender', req.user.username, { motif, source: parent.id });
      return d;
    });

    if (refus) return res.status(refus.code).json(refus.corps);
    await audit.log(req.user.username, 'PLAN_AMENDER', { source: src.id, amendement: child.id });
    return res.json({ ok: true, new_plan_id: child.id, parent_plan_id: src.id, plan: child });
  }));

  // Sortie des archives : le plan revient parmi les plans validés, avec ses
  // activités. Une version remplacée par une autre n'y a pas droit — elle a
  // été archivée par le versionnement, pas par une décision de rangement.
  app.post(`${M}/plans/:id/desarchiver`, requireAuth, asynchrone(async (req, res) => {
    const p = await D.planDe(req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'VALIDATEUR', p)) return D.refus(res);

    let refus = null;
    let rec = null;
    await db.transformer((d) => {
      refus = null; rec = null;
      const plans = d.plans || [];
      const i = plans.findIndex((x) => x.id === req.params.id);
      if (i < 0) { refus = { code: 404, corps: { error: 'not_found' } }; return db.INCHANGE; }
      // Les deux refus se relisent ici : sortir des archives deux fois de suite
      // n'a pas de sens, et une version remplacée n'y a pas droit — elle a été
      // archivée par le versionnement, non par une décision de rangement.
      if (plans[i].statut !== 'archive') {
        refus = { code: 409, corps: { error: 'plan_non_archive' } }; return db.INCHANGE;
      }
      if (plans[i].remplace_par) {
        refus = { code: 409, corps: { error: 'version_remplacee' } }; return db.INCHANGE;
      }
      plans[i] = {
        ...plans[i], statut: 'valide',
        desarchiver_le: new Date().toISOString(),
        desarchiver_par: req.user.username,
        updatedAt: new Date().toISOString(),
      };
      rec = plans[i];
      d.plans = plans;
      // Le plan revenant en entier, les exceptions posées activité par activité
      // n'ont plus d'objet.
      d.activites = (d.activites || []).map((a) => (a.plan_id === req.params.id && Number(a.desarchivee) === 1
        ? { ...a, desarchivee: 0, updatedAt: new Date().toISOString() } : a));
      D.inscrireWf(d, req.params.id, 'desarchiver', req.user.username, {});
      return d;
    });

    if (refus) return res.status(refus.code).json(refus.corps);
    await audit.log(req.user.username, 'PLAN_DESARCHIVER', { id: p.id });
    return res.json(rec);
  }));

  // Annuler l'amendement : la version en brouillon et ses activités sont
  // supprimées, le plan d'origine reste en vigueur.
  app.post(`${M}/plans/:id/annuler-amendement`, requireAuth, asynchrone(async (req, res) => {
    const child = await D.planDe(req.params.id);
    if (!child) return res.status(404).json({ error: 'not_found' });
    if (!child.parent_plan_id) return res.status(409).json({ error: 'pas_un_amendement' });
    if (!D.peut(req, 'CONTRIBUTEUR', child)) return D.refus(res);

    let refus = null;
    await db.transformer((d) => {
      refus = null;
      const vise = (d.plans || []).find((x) => x.id === req.params.id);
      if (!vise) { refus = { code: 404, corps: { error: 'not_found' } }; return db.INCHANGE; }
      if (!vise.parent_plan_id) {
        refus = { code: 409, corps: { error: 'pas_un_amendement' } }; return db.INCHANGE;
      }
      // Le retrait et l'inscription au circuit étaient deux écritures : entre
      // elles, l'amendement avait disparu sans que rien ne dise qui l'avait
      // annulé, ni pourquoi.
      D.retirerPlan(d, vise.id);
      D.inscrireWf(d, vise.parent_plan_id, 'annuler-amendement', req.user.username,
        { commentaire: (req.body && req.body.commentaire) || '', amendement: vise.id });
      return d;
    });

    if (refus) return res.status(refus.code).json(refus.corps);
    await audit.log(req.user.username, 'PLAN_ANNULER_AMENDEMENT', { amendement: child.id, plan: child.parent_plan_id });
    return res.json({ ok: true, parent_plan_id: child.parent_plan_id });
  }));

  // Le circuit, les versions et le fil de discussion suivent le sort du plan :
  // les lire suppose d'avoir accès au plan, y écrire suppose d'y contribuer.
  // Ces quatre routes n'opposaient aucun refus — n'importe quelle session
  // écrivait dans le fil d'un plan et en effaçait les avis.
  //
  // Les deux gardes lisent le plan, donc la base : elles sont asynchrones, et
  // passent par `asynchrone` comme un gestionnaire. Sans l'enveloppe, un échec
  // laisserait la requête ouverte sans erreur ni trace — un middleware `async`
  // n'est pas mieux traité par Express 4 qu'un gestionnaire.
  const lecturePlan = asynchrone(async (req, res, next) => (D.peutLire(req, await D.planDe(req.params.id))
    ? next() : D.refus(res)));
  const ecriturePlan = asynchrone(async (req, res, next) => (D.peut(req, 'CONTRIBUTEUR', await D.planDe(req.params.id))
    ? next() : D.refus(res)));

  app.get(`${M}/plans/:id/workflow`, requireAuth, lecturePlan, asynchrone(async (req, res) =>
    res.json((await db.list('workflow')).filter((w) => w.plan_id === req.params.id)
      .map((w) => ({ ...w, user_display_name: nomComplet(w.user) })))));

  // ── Versions & commentaires ──
  app.get(`${M}/plans/:id/versions`, requireAuth, lecturePlan, asynchrone(async (req, res) =>
    res.json((await db.list('versions')).filter((v) => v.plan_id === req.params.id))));

  // Ce qu'une version consignée retient : son numéro, ce qui l'a motivée, et
  // le commentaire du rédacteur. Le plan et l'auteur viennent de la requête.
  const SCHEMA_VERSION = {
    version: { type: 'texte', max: 20 },
    motif: { type: 'texte', max: 500 },
    commentaire: { type: 'texte', max: 4000 },
  };

  app.post(`${M}/plans/:id/versions`, requireAuth, ecriturePlan, valider(SCHEMA_VERSION),
    asynchrone(async (req, res) => res.json(await db.insert('versions', {
      ...req.valide, plan_id: req.params.id, auteur: req.user.username,
    }))));

  app.get(`${M}/plans/:id/commentaires`, requireAuth, lecturePlan, asynchrone(async (req, res) => {
    // Le fil reprend toutes les versions du plan, depuis la première.
    const chaine = await D.familleDuPlan(req.params.id);
    const versions = {};
    chaine.forEach((p) => { versions[p.id] = p.version || 1; });
    const ids = new Set(Object.keys(versions).length ? Object.keys(versions) : [req.params.id]);

    // Les deux collections ensemble : enchaîner deux allers-retours doublerait
    // l'attente d'un fil de discussion.
    const [tousCommentaires, toutWorkflow] = await Promise.all([
      db.list('commentaires'), db.list('workflow'),
    ]);
    const commentaires = tousCommentaires
      .filter((c) => ids.has(c.plan_id))
      .map((c) => ({ ...c, plan_version: versions[c.plan_id], user_display_name: nomComplet(c.auteur || c.user_id) }));
    // Les décisions de validation / rejet rejoignent le fil de discussion
    const decisions = toutWorkflow
      .filter((w) => ids.has(w.plan_id) && w.commentaire
        && ['valider', 'rejeter', 'rejeter-annuler', 'validation', 'rejet'].includes(w.action))
      .map((w) => ({ ...w, timeline_type: 'workflow', plan_version: versions[w.plan_id], user_display_name: nomComplet(w.user) }));
    const tri = (x) => x.date_action || x.date_creation || x.createdAt || '';
    res.json([...commentaires, ...decisions].sort((a, b) => String(tri(a)).localeCompare(String(tri(b)))));
  }));

  // Un avis au fil de discussion, et rien d'autre : le plan vient du chemin,
  // l'auteur de la session, la date du magasin. Le corps n'apportait aucune
  // borne — ni sur la taille de l'avis, ni sur les champs qui l'accompagnaient.
  app.post(`${M}/plans/:id/commentaires`, requireAuth, ecriturePlan,
    valider({ contenu: { type: 'texte', requis: true, max: 4000 } }),
    asynchrone(async (req, res) => res.json(await db.insert('commentaires', {
      ...req.valide, plan_id: req.params.id, auteur: req.user.username,
    }))));

  // Retirer un avis du fil : son auteur, ou le Gestionnaire du plan. Un
  // contributeur voisin n'efface pas la remarque d'un autre.
  app.delete(`${M}/commentaires/:id`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('commentaires', req.params.id);
    if (!c) return res.status(404).json({ error: 'not_found' });
    const plan = await D.planDe(c.plan_id);
    const sien = (c.auteur || c.user_id) === req.user.username;
    if (!D.peut(req, sien ? 'CONTRIBUTEUR' : 'GESTIONNAIRE', plan)) return D.refus(res);
    return res.json({ ok: await db.remove('commentaires', req.params.id) });
  }));
};
