// Module « Planification de la Surveillance » — référentiels partagés,
// contexte, statistiques et plans.
const referentiels = require('../../referentiels');
const { asynchrone } = require('../../route');
const moduleRights = require('../../module_rights');
const { valider } = require('../../valider');
const db = require('./store');
const D = require('./domaine');
const instances = require('../../instances');
const { inconnu, reserve } = require('../../erreurs');

module.exports = async function register(app, deps, M) {
  const { requireAuth, auth, loadConfig, audit } = deps;

  // ── Instance regardée ──
  // Chaque AAC tient son instance ; les plans et les activités qu'elle a
  // programmés ne sont servis qu'à elle. Le super-administrateur prend en
  // barre supérieure le poste d'une autre, ou les regarde toutes — la vue
  // régionale, où l'instance retenue est vide et rien n'est écarté.
  const instanceCourante = (req) => instances.courante(req.user, loadConfig);
  const parInstance = (req, rangs) => instances.filtrer(rangs, instanceCourante(req), loadConfig);

  // Garde de lecture : les données de surveillance du module ne sortent pas
  // vers un compte sans privilège, ni vers un organisme surveillé. Les
  // référentiels du portail (inspecteurs, types, thèmes…) restent ouverts :
  // ce sont des nomenclatures, servies aussi aux fronts des autres modules.
  const lecture = (req, res, next) => (D.peutLire(req) ? next() : D.refus(res));

  // ── Référentiels partagés attendus par le module ──
  app.get('/api/inspecteurs', requireAuth,
    (req, res) => res.json(instances.refs(req.user, loadConfig).inspecteurs || []));
  app.get('/api/types-supervision', requireAuth,
    (req, res) => res.json(instances.refs(req.user, loadConfig).types_supervision || []));
  app.get('/api/modes-supervision', requireAuth,
    (req, res) => res.json(instances.refs(req.user, loadConfig).modes_supervision || []));
  app.get('/api/themes-supervision', requireAuth,
    (req, res) => res.json(instances.refs(req.user, loadConfig).themes_supervision || []));
  app.get('/api/exigences', requireAuth,
    (req, res) => res.json(instances.refs(req.user, loadConfig).exigences || []));
  // Les profils de risque viennent du module voisin par le bus : le bus ignore
  // qui l'interroge, l'instance regardée se pose donc ici, comme sur les plans.
  app.get('/api/shared/risk-profiles', requireAuth, lecture,
    asynchrone(async (req, res) => res.json(parInstance(req, await D.riskProfiles()))));
  // Même contrat, exposé en HTTP pour les fronts des autres modules. Un front
  // demande ce que son compte a le droit de voir : l'instance regardée borne
  // donc la réponse, ici comme sur les autres listes.
  app.get('/api/shared/surveillance-plans', requireAuth, lecture,
    (req, res) => res.json(parInstance(req, D.plansValides(req.query))));
  app.get(`${M}/plans-valides`, requireAuth, lecture,
    (req, res) => res.json(parInstance(req, D.plansValides(req.query))));
  app.get(`${M}/risk-profiles`, requireAuth, lecture,
    asynchrone(async (req, res) => res.json(parInstance(req, await D.riskProfiles()))));

  // Contexte du module (utilisateur + rôle M2)
  app.get(`${M}/context`, requireAuth, (req, res) => {
    // Sans accès au module, l'écran ne s'ouvre pas : il se montait sur une
    // coquille vide où chaque geste échouait sans qu'on sache pourquoi. Un
    // compte d'organisme surveillé est dans ce cas même la case cochée : le
    // module n'a pas d'écran de son côté, et toutes ses listes lui sont
    // refusées.
    if (D.estPrestataire(req.user) || !moduleRights.accesAuModule(D.RIGHTS, req.user.username)) {
      return res.status(403).json({ error: 'no_module_access' });
    }
    const cfg = loadConfig();
    const u = auth.publicUser(req.user);
    res.json({
      user: {
        ...u,
        role_m2: D.roleM2(req.user),
        role: D.roleM2(req.user).replace('M2_', ''),
        nom: u.nom || u.username,
        prenom: u.prenom || '',
      },
      aac: instances.aac(req.user, loadConfig),
      instance: cfg.instance,
      // Instance regardée : la barre supérieure en fait une liste déroulante.
      instance_vue: instances.etat(req.user, loadConfig),
    });
  });

  app.get(`${M}/instance`, requireAuth, (req, res) => res.json(instances.etat(req.user, loadConfig)));

  app.put(`${M}/instance`, requireAuth, (req, res) => {
    if (!instances.estRegional(req.user)) {
      return reserve(res, 'super_admin_regional');
    }
    // Vide : la vue régionale. Sinon, une instance déclarée — le nom borne ce
    // que les écrans serviront, il ne s'invente pas.
    const demandee = String((req.body || {}).instance || '').trim();
    if (demandee && !instances.liste(loadConfig).includes(demandee)) {
      return inconnu(res, 'instance');
    }
    instances.definir(req.user.username, demandee);
    return res.json({ status: 'ok', instance: demandee });
  });

  // ── Statistiques ──
  app.get(`${M}/stats`, requireAuth, lecture, (req, res) => {
    const plans = parInstance(req, db.list('plans'));
    const acts = parInstance(req, db.list('activites'));
    // Les plans que la surveillance suit : validés, approuvés ou transmis. Une
    // version archivée n'en fait pas partie, elle a été remplacée.
    const enVigueur = new Set(plans.filter((p) => D.STATUTS_EN_VIGUEUR.includes(p.statut)).map((p) => p.id));
    res.json({
      total_plans: plans.length,
      plans_valides: plans.filter((p) => D.STATUTS_EN_VIGUEUR.includes(p.statut)).length,
      plans_brouillon: plans.filter((p) => !p.statut || p.statut === 'brouillon').length,
      // Le tableau de bord distingue ce qui attend une décision de ce qui a
      // été refusé : sans ces deux compteurs, ses cartes restaient à zéro.
      plans_soumis: plans.filter((p) => p.statut === 'soumis').length,
      plans_rejetes: plans.filter((p) => p.statut === 'rejete').length,
      plans_archives: plans.filter((p) => p.statut === 'archive').length,
      // Versions retirées par une version suivante : hors jeu, sans être des
      // plans rangés à leur terme.
      plans_remplaces: plans.filter((p) => p.statut === D.STATUT_REMPLACE).length,
      // Plans en vigueur dont une version suivante chemine encore : le tableau
      // de bord en fait une carte.
      plans_en_amendement: D.plansEnAmendement(plans).length,
      total_activites: acts.length,
      // Ce qui reste à réaliser ne se compte que dans les plans en vigueur :
      // une activité d'un brouillon n'est encore inscrite nulle part, et celle
      // d'une version archivée a été remplacée. Le tableau de bord l'annonçait
      // déjà ainsi — « inscrites aux plans validés » — en comptant pourtant
      // toutes les activités du magasin.
      activites_planifiees: acts.filter((a) => a.statut !== 'realisee' && enVigueur.has(a.plan_id)).length,
      activites_realisees: acts.filter((a) => a.statut === 'realisee').length,
      // « Couverts par un plan » : les organismes qu'une activité d'un plan en
      // vigueur désigne, et non tout le parc de l'instance — la carte comptait
      // le référentiel entier, plan ou pas.
      prestataires: new Set(acts
        .filter((a) => enVigueur.has(a.plan_id) && a.prestataire_id)
        .map((a) => a.prestataire_id)).size,
    });
  });

  // ── Plans ──
  // Les plans sont renvoyés avec leur nombre d'activités, et le détail avec
  // ses activités : le client les lit directement sur l'objet plan.
  app.get(`${M}/plans`, requireAuth, lecture, (req, res) => {
    const acts = db.list('activites');
    // Un privilège posé à « Aucun » sur un domaine ferme aussi la liste :
    // sinon le plan y figurait, seul son détail était refusé.
    res.json(parInstance(req, db.list('plans')).filter((p) => D.peutLire(req, p)).map((p) => ({
      ...p, nb_activites: acts.filter((a) => a.plan_id === p.id).length,
    })));
  });

  app.get(`${M}/plans/:id`, requireAuth, asynchrone(async (req, res) => {
    const p = db.list('plans').find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    if (!D.peutLire(req, p)) return D.refus(res);
    // L'écran de détail lit ses activités ici : le verrou d'exécution doit
    // donc y figurer, comme sur /all-activites.
    const racines = await D.racinesDeclenchees();
    const activites = db.list('activites').filter((a) => a.plan_id === p.id)
      .map((a) => ({ ...a, verrouillee: racines.has(D.racine(a)) ? 1 : 0 }));
    return res.json({ ...p, activites, nb_activites: activites.length });
  }));

  // Le corps validé — et lui seul — entre en base : `req.body` y faisait entrer
  // tout le reste, à commencer par `statut`, qui n'appartient qu'au circuit.
  app.post(`${M}/plans`, requireAuth, valider(D.SCHEMA_PLAN), asynchrone(async (req, res) => {
    if (!D.peut(req, 'CONTRIBUTEUR', req.valide)) return D.refus(res);
    // Le plan appartient à l'instance sous laquelle il est ouvert : c'est elle
    // qui le verra, et « Exécution de la Surveillance » avec elle.
    const rec = db.insert('plans', {
      ...req.valide, statut: 'brouillon', instance: instanceCourante(req),
      created_by: req.user.username,
    });
    await audit.log(req.user.username, 'PLAN_CREE', { id: rec.id });
    return res.json(rec);
  }));

  // Modifier un plan, ce n'est pas décider de son sort : le statut, la version
  // et les traces de décision restent aux routes du circuit, qui exigent un
  // Validateur. Sans le schéma, un Contributeur posait ici `statut: valide` et
  // son plan entrait en vigueur — servi à « Exécution de la Surveillance »
  // sans qu'aucun validateur ne l'ait vu.
  app.put(`${M}/plans/:id`, requireAuth, valider(D.SCHEMA_PLAN, { effacer: true }), (req, res) => {
    if (!D.peut(req, 'CONTRIBUTEUR', D.planDe(req.params.id))) return D.refus(res);
    const rec = db.update('plans', req.params.id, req.valide);
    return rec ? res.json(rec) : res.status(404).json({ error: 'not_found' });
  });

  app.delete(`${M}/plans/:id`, requireAuth, (req, res) => {
    if (!D.peut(req, 'GESTIONNAIRE', D.planDe(req.params.id))) return D.refus(res);
    const d = db.load();
    if (!(d.plans || []).some((p) => p.id === req.params.id)) return res.status(404).json({ error: 'not_found' });
    // Un plan amendé porte la lignée de ses versions suivantes : le supprimer
    // la couperait, et ses amendements citeraient un parent disparu. Seule la
    // dernière version d'une lignée — un plan sans descendant — se supprime.
    const amendements = (d.plans || []).filter((p) => p.parent_plan_id === req.params.id);
    if (amendements.length) {
      return res.status(409).json({ error: 'plan_amende', amendements: amendements.map((p) => p.id) });
    }
    D.retirerPlan(d, req.params.id);
    db.save(d);
    return res.json({ ok: true });
  });
};
