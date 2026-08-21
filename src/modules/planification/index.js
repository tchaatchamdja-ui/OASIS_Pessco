// OASIS — Backend du module « Planification de la Surveillance » (reprise intégrale PESSCO).
// Endpoints attendus par le front PESSCO :
//   /api/m/planification/*  (plans, activités, workflow, versions, commentaires)
//   /api/inspecteurs, /api/types-supervision, /api/exigences,
//   /api/modes-supervision, /api/themes-supervision, /api/shared/risk-profiles
const crypto = require('crypto');
const store = require('../../store');
const referentiels = require('../../referentiels');
const services = require('../../services');
const moduleRights = require('../../module_rights');
const { valider } = require('../../valider');

const uid = () => crypto.randomBytes(8).toString('hex');
const load = () => store.load('planification', {});
const save = (d) => store.save('planification', d);
const list = (coll) => load()[coll] || [];

function seed() {
  if (store.load('planification', null)) return;
  save({ plans: [], activites: [], workflow: [], versions: [], commentaires: [], cycles: [] });
}

function createIn(coll, item) {
  const d = load();
  const rec = { id: uid(), createdAt: new Date().toISOString(), ...item };
  d[coll] = d[coll] || [];
  d[coll].push(rec);
  save(d);
  return rec;
}
function updateIn(coll, id, patch) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return null;
  arr[i] = { ...arr[i], ...patch, id, updatedAt: new Date().toISOString() };
  save(d);
  return arr[i];
}
function deleteIn(coll, id) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return false;
  arr.splice(i, 1);
  save(d);
  return true;
}

// Rôle module M2 dérivé du rôle portail
function roleM2(user) {
  if (!user) return 'M2_Non Autorisé';
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return 'M2_Administrateur';
  if (user.role === 'AAC' || user.role === 'INSPECTEUR') return 'M2_Planificateur';
  return 'M2_Consultation';
}

// Profils de risque : produits par le module « Profils de Risques » et
// obtenus via le bus de services. Aucun accès direct aux collections d'un
// autre module — si ce module n'est pas monté, la liste est simplement vide.
function riskProfiles() {
  return services.callOr('PR.riskProfiles', []);
}

// ── Service publié : plans de surveillance en vigueur ──
// Consommé par le module « Exécution de la Surveillance » (D.7.1) : seuls
// les plans validés (et leurs suites : approuvés DG, transmis) alimentent
// l'exécution. Les brouillons, les plans soumis, rejetés et les versions
// remplacées (archivées) en sont exclus.
const STATUTS_EN_VIGUEUR = ['valide', 'approuve_dg', 'transmis'];

function plansValides(filtre) {
  const f = filtre || {};
  const acts = list('activites');
  return list('plans')
    .filter((p) => STATUTS_EN_VIGUEUR.includes(p.statut))
    .filter((p) => (!f.annee || String(p.annee) === String(f.annee))
      && (!f.secteur_id || p.secteur_id === f.secteur_id)
      && (!f.domaine_id || p.domaine_id === f.domaine_id))
    .map((p) => {
      const activites = acts
        .filter((a) => a.plan_id === p.id)
        .filter((a) => !f.prestataire_id || a.prestataire_id === f.prestataire_id)
        .map((a) => ({
          id: a.id,
          plan_id: a.plan_id,
          prestataire_id: a.prestataire_id || '',
          secteur_id: a.secteur_id || p.secteur_id || '',
          sous_activite_ids: a.sous_activite_ids || (a.sous_activite_id ? [a.sous_activite_id] : []),
          themes_couverts: a.themes_couverts || [],
          objet: a.objet || a.titre || '',
          description: a.description_activite || '',
          mode_supervision_id: a.mode_supervision_id || '',
          type_supervision_id: a.type_supervision_id || '',
          lieu_activite: a.lieu_activite || '',
          responsable_id: a.responsable_id || '',
          nombre_inspecteurs: a.nombre_inspecteurs || 1,
          date_debut: a.date_debut || '',
          date_fin: a.date_fin || '',
          priorite: a.priorite || 'normale',
          risk_label: a.risk_label || '',
          cycle_mois: a.cycle_mois || null,
          statut: a.statut || 'planifiee',
        }));
      return {
        id: p.id,
        titre: p.titre || '',
        annee: p.annee || null,
        type: p.type || '',
        domaine_id: p.domaine_id || '',
        secteur_id: p.secteur_id || '',
        version: p.version || 1,
        statut: p.statut,
        parent_plan_id: p.parent_plan_id || '',
        date_validation: p.valider_le || p.date_validation || '',
        valide_par: p.valider_par || '',
        nb_activites: activites.length,
        activites,
      };
    })
    .filter((p) => !f.prestataire_id || p.activites.length > 0);
}

function register(app, deps) {
  const { requireAuth, auth, loadConfig, audit } = deps;
  const M = '/api/m/planification';

  // Contrat exposé aux autres modules (Exécution de la Surveillance…)
  services.publish('PLAN.plansValides', plansValides, {
    module: 'PLAN',
    description: 'Plans de surveillance en vigueur (validés, approuvés DG, transmis) et leurs activités',
    parametres: '{ annee?, domaine_id?, secteur_id?, prestataire_id? }',
    retour: '[{ id, titre, annee, type, domaine_id, secteur_id, version, statut, date_validation, nb_activites, activites[] }]',
  });

  // ── Référentiels partagés attendus par le module ──
  app.get('/api/inspecteurs', requireAuth, (req, res) => res.json(referentiels.getAll().inspecteurs || []));
  app.get('/api/types-supervision', requireAuth, (req, res) => res.json(referentiels.getAll().types_supervision || []));
  app.get('/api/modes-supervision', requireAuth, (req, res) => res.json(referentiels.getAll().modes_supervision || []));
  app.get('/api/themes-supervision', requireAuth, (req, res) => res.json(referentiels.getAll().themes_supervision || []));
  app.get('/api/exigences', requireAuth, (req, res) => res.json(referentiels.getAll().exigences || []));
  app.get('/api/shared/risk-profiles', requireAuth, (req, res) => res.json(riskProfiles()));
  // Même contrat, exposé en HTTP pour les fronts des autres modules
  app.get('/api/shared/surveillance-plans', requireAuth, (req, res) => res.json(plansValides(req.query)));
  app.get(`${M}/plans-valides`, requireAuth, (req, res) => res.json(plansValides(req.query)));
  app.get(`${M}/risk-profiles`, requireAuth, (req, res) => res.json(riskProfiles()));

  // Contexte du module (utilisateur + rôle M2)
  app.get(`${M}/context`, requireAuth, (req, res) => {
    const cfg = loadConfig();
    const u = auth.publicUser(req.user);
    res.json({ user: { ...u, role_m2: roleM2(req.user), role: roleM2(req.user).replace('M2_', ''), nom: u.nom || u.username, prenom: u.prenom || '' }, aac: cfg.aac || {}, instance: cfg.instance });
  });

  // ── Statistiques ──
  app.get(`${M}/stats`, requireAuth, (req, res) => {
    const plans = list('plans');
    const acts = list('activites');
    res.json({
      total_plans: plans.length,
      plans_valides: plans.filter((p) => ['valide', 'approuve_dg', 'transmis'].includes(p.statut)).length,
      plans_brouillon: plans.filter((p) => !p.statut || p.statut === 'brouillon').length,
      total_activites: acts.length,
      activites_planifiees: acts.filter((a) => a.statut !== 'realisee').length,
      activites_realisees: acts.filter((a) => a.statut === 'realisee').length,
      prestataires: (referentiels.getAll().prestataires || []).length,
    });
  });

  // ── Plans ──
  // Les plans sont renvoyés avec leur nombre d'activités, et le détail avec
  // ses activités : le client les lit directement sur l'objet plan.
  app.get(`${M}/plans`, requireAuth, (req, res) => {
    const acts = list('activites');
    res.json(list('plans').map((p) => ({
      ...p, nb_activites: acts.filter((a) => a.plan_id === p.id).length,
    })));
  });
  app.get(`${M}/plans/:id`, requireAuth, (req, res) => {
    const p = list('plans').find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    const activites = list('activites').filter((a) => a.plan_id === p.id);
    res.json({ ...p, activites, nb_activites: activites.length });
  });
  // ── Droits du module ──
  // Le privilège de « Gestion des Droits » (module PLAN) gouverne l'écriture,
  // avec ses portées par domaine et secteur. Les deux super-menus partagent
  // le même espace de privilèges.
  const peut = (req, privilege, plan) => moduleRights.can(
    'PLAN', req.user.username, privilege,
    (plan && plan.domaine_id) || '', (plan && plan.secteur_id) || '',
  );
  const refus = (res) => res.status(403).json({ error: 'privilege_insuffisant' });
  const planDe = (id) => list('plans').find((x) => x.id === id) || null;

  // Les corps sont bornés avant d'entrer dans la logique : ce qui n'est pas
  // décrit ici n'a pas à être enregistré.
  const SCHEMA_PLAN = {
    titre: { type: 'texte', requis: true, max: 200 },
    annee: { type: 'entier', min: 2000, max: 2100 },
    type: { type: 'texte', max: 40, parmi: ['periodique', 'ponctuel', 'thematique'] },
    domaine_id: { type: 'texte', max: 40 },
    secteur_id: { type: 'texte', max: 40 },
  };
  const SCHEMA_ACTIVITE = {
    objet: { type: 'texte', max: 300 },
    titre: { type: 'texte', max: 300 },
    description_activite: { type: 'texte', max: 4000 },
    prestataire_id: { type: 'texte', max: 40 },
    secteur_id: { type: 'texte', max: 40 },
    sous_activite_id: { type: 'texte', max: 40 },
    sous_activite_ids: { type: 'liste', max: 100 },
    themes_couverts: { type: 'liste', max: 300 },
    type_supervision_id: { type: 'texte', max: 40 },
    mode_supervision_id: { type: 'texte', max: 40 },
    lieu_activite: { type: 'texte', max: 200 },
    date_debut: { type: 'date' },
    date_fin: { type: 'date' },
    responsable_id: { type: 'texte', max: 40 },
    nombre_inspecteurs: { type: 'entier', min: 1, max: 99 },
    priorite: { type: 'texte', max: 20, parmi: ['basse', 'normale', 'haute'] },
    risk_label: { type: 'texte', max: 20 },
    cycle_mois: { type: 'entier', min: 0, max: 120 },
    statut: { type: 'texte', max: 20, parmi: ['planifiee', 'realisee'] },
    commentaire_validation: { type: 'texte', max: 4000 },
  };

  app.post(`${M}/plans`, requireAuth, valider(SCHEMA_PLAN), (req, res) => {
    if (!peut(req, 'CONTRIBUTEUR', req.body || {})) return refus(res);
    const rec = createIn('plans', { statut: 'brouillon', ...(req.body || {}), created_by: req.user.username });
    audit.log(req.user.username, 'PLAN_CREE', { id: rec.id });
    res.json(rec);
  });
  app.put(`${M}/plans/:id`, requireAuth, (req, res) => {
    if (!peut(req, 'CONTRIBUTEUR', planDe(req.params.id))) return refus(res);
    const rec = updateIn('plans', req.params.id, req.body || {});
    return rec ? res.json(rec) : res.status(404).json({ error: 'not_found' });
  });
  app.delete(`${M}/plans/:id`, requireAuth, (req, res) => {
    if (!peut(req, 'GESTIONNAIRE', planDe(req.params.id))) return refus(res);
    if (!deleteIn('plans', req.params.id)) return res.status(404).json({ error: 'not_found' });
    const d = load();
    d.activites = (d.activites || []).filter((a) => a.plan_id !== req.params.id);
    save(d);
    res.json({ ok: true });
  });

  // ── Activités d'un plan ──
  app.get(`${M}/plans/:id/activites`, requireAuth, (req, res) =>
    res.json(list('activites').filter((a) => a.plan_id === req.params.id)));
  app.post(`${M}/plans/:id/activites`, requireAuth, valider(SCHEMA_ACTIVITE), (req, res) => {
    if (!peut(req, 'CONTRIBUTEUR', planDe(req.params.id))) return refus(res);
    res.json(createIn('activites', { ...(req.body || {}), plan_id: req.params.id }));
  });
  // Statut et version du plan portés par chaque activité (vue Calendrier)
  app.get(`${M}/all-activites`, requireAuth, (req, res) => {
    const plans = {};
    list('plans').forEach((p) => { plans[p.id] = p; });
    res.json(list('activites').map((a) => ({
      ...a,
      plan_statut: plans[a.plan_id]?.statut || '',
      plan_titre: plans[a.plan_id]?.titre || '',
      plan_version: plans[a.plan_id]?.version || 1,
    })));
  });
  app.put(`${M}/activites/:id`, requireAuth, valider(SCHEMA_ACTIVITE), (req, res) => {
    const act = list('activites').find((a) => a.id === req.params.id);
    if (!peut(req, 'CONTRIBUTEUR', act && planDe(act.plan_id))) return refus(res);
    const rec = updateIn('activites', req.params.id, req.body || {});
    return rec ? res.json(rec) : res.status(404).json({ error: 'not_found' });
  });
  app.delete(`${M}/activites/:id`, requireAuth, (req, res) => {
    const act = list('activites').find((a) => a.id === req.params.id);
    if (!peut(req, 'CONTRIBUTEUR', act && planDe(act.plan_id))) return refus(res);
    res.json({ ok: deleteIn('activites', req.params.id) });
  });

  // ── Workflow du plan (soumission → validation → DG → transmission) ──
  function wf(planId, action, user, extra) {
    createIn('workflow', { plan_id: planId, action, user, date: new Date().toISOString(), ...(extra || {}) });
  }
  const transitions = {
    soumettre: 'soumis',
    valider: 'valide',
    'approuver-dg': 'approuve_dg',
    transmettre: 'transmis',
    rejeter: 'rejete',
    // Rejet définitif : le plan reste consultable mais n'est plus modifiable
    'rejeter-annuler': 'rejete_clos',
    archiver: 'archive',
  };
  Object.entries(transitions).forEach(([route, statut]) => {
    app.post(`${M}/plans/:id/${route}`, requireAuth, (req, res) => {
      // Soumettre relève du contributeur ; décider (valider, rejeter,
      // archiver, approuver, transmettre) relève du validateur.
      const requis = route === 'soumettre' ? 'CONTRIBUTEUR' : 'VALIDATEUR';
      if (!peut(req, requis, planDe(req.params.id))) return refus(res);
      const body = req.body || {};
      const commentaire = body.commentaire || body.motif || '';
      const rec = updateIn('plans', req.params.id, {
        statut,
        [`${route.replace(/-/g, '_')}_le`]: new Date().toISOString(),
        [`${route.replace(/-/g, '_')}_par`]: req.user.username,
        motif: body.motif || undefined,
        // Le motif du dernier rejet reste visible pour la reprise du plan
        commentaire_rejet: ['rejeter', 'rejeter-annuler'].includes(route) ? commentaire
          : (route === 'soumettre' ? '' : rec_commentaire_rejet(req.params.id)),
      });
      if (!rec) return res.status(404).json({ error: 'not_found' });
      // Commentaires de validation saisis activité par activité
      (body.activity_comments || []).forEach((c) => {
        const act = list('activites').find((a) => a.id === c.activity_id
          || (c.activity_objet && (a.objet || a.titre) === c.activity_objet && a.plan_id === rec.id));
        if (act) updateIn('activites', act.id, { commentaire_validation: c.commentaire });
      });
      // Une nouvelle version validée remplace la précédente, qui est archivée.
      if (route === 'valider' && rec.parent_plan_id) {
        let ancetre = list('plans').find((p) => p.id === rec.parent_plan_id);
        const vus = new Set();
        while (ancetre && !vus.has(ancetre.id)) {
          vus.add(ancetre.id);
          if (['valide', 'approuve_dg', 'transmis'].includes(ancetre.statut)) {
            updateIn('plans', ancetre.id, {
              statut: 'archive', archiver_le: new Date().toISOString(),
              archiver_par: req.user.username, remplace_par: rec.id,
            });
            wf(ancetre.id, 'archiver', req.user.username,
              { commentaire: `Remplacé par la version ${rec.version || ''}`.trim() });
          }
          ancetre = ancetre.parent_plan_id
            ? list('plans').find((p) => p.id === ancetre.parent_plan_id) : null;
        }
      }
      wf(rec.id, route, req.user.username, { motif: body.motif || '', commentaire });
      audit.log(req.user.username, 'PLAN_' + route.toUpperCase().replace(/-/g, '_'), { id: rec.id });
      res.json(rec);
    });
  });

  // Motif de rejet déjà enregistré (conservé lors des autres transitions)
  function rec_commentaire_rejet(id) {
    const p = list('plans').find((x) => x.id === id);
    return p ? p.commentaire_rejet : undefined;
  }
  // ── Amendement ──
  // Amender un plan en vigueur crée une nouvelle version en brouillon
  // (copie des activités) ; le plan validé reste la référence tant que
  // l'amendement n'est pas validé à son tour.
  app.post(`${M}/plans/:id/amender`, requireAuth, (req, res) => {
    const src = list('plans').find((x) => x.id === req.params.id);
    if (!src) return res.status(404).json({ error: 'not_found' });
    if (!peut(req, 'CONTRIBUTEUR', src)) return refus(res);
    if (!['valide', 'approuve_dg', 'transmis'].includes(src.statut)) {
      return res.status(409).json({ error: 'plan_non_amendable', statut: src.statut });
    }
    const enCours = list('plans').find((p) => p.parent_plan_id === src.id
      && ['brouillon', 'soumis', 'en_revue', 'rejete'].includes(p.statut));
    if (enCours) return res.json({ ok: true, new_plan_id: enCours.id, deja_en_cours: true });

    const motif = (req.body && req.body.motif) || '';
    const { id: _old, ...base } = src;
    const child = createIn('plans', {
      ...base, statut: 'brouillon', version: (src.version || 1) + 1,
      parent_plan_id: src.id, motif_amendement: motif,
      createdAt: new Date().toISOString(), created_by: req.user.username,
      date_soumission: '', date_validation: '',
    });
    // parent_activite_id = identifiant racine, il relie une activité à ses
    // copies dans les versions suivantes (comparaison des amendements).
    list('activites').filter((a) => a.plan_id === src.id).forEach((a) => {
      const { id: _aid, ...ab } = a;
      createIn('activites', { ...ab, plan_id: child.id, parent_activite_id: a.parent_activite_id || a.id });
    });
    wf(child.id, 'amender', req.user.username, { motif, source: src.id });
    audit.log(req.user.username, 'PLAN_AMENDER', { source: src.id, amendement: child.id });
    res.json({ ok: true, new_plan_id: child.id, parent_plan_id: src.id, plan: child });
  });

  // Annuler l'amendement : la version en brouillon et ses activités sont
  // supprimées, le plan d'origine reste en vigueur.
  app.post(`${M}/plans/:id/annuler-amendement`, requireAuth, (req, res) => {
    const child = list('plans').find((x) => x.id === req.params.id);
    if (!child) return res.status(404).json({ error: 'not_found' });
    if (!child.parent_plan_id) return res.status(409).json({ error: 'pas_un_amendement' });
    if (!peut(req, 'CONTRIBUTEUR', child)) return refus(res);
    const d = load();
    d.activites = (d.activites || []).filter((a) => a.plan_id !== child.id);
    d.plans = (d.plans || []).filter((p) => p.id !== child.id);
    save(d);
    wf(child.parent_plan_id, 'annuler-amendement', req.user.username,
      { commentaire: (req.body && req.body.commentaire) || '', amendement: child.id });
    audit.log(req.user.username, 'PLAN_ANNULER_AMENDEMENT', { amendement: child.id, plan: child.parent_plan_id });
    res.json({ ok: true, parent_plan_id: child.parent_plan_id });
  });

  app.get(`${M}/plans/:id/workflow`, requireAuth, (req, res) =>
    res.json(list('workflow').filter((w) => w.plan_id === req.params.id)
      .map((w) => ({ ...w, user_display_name: nomComplet(w.user) }))));

  // ── Versions & commentaires ──
  app.get(`${M}/plans/:id/versions`, requireAuth, (req, res) =>
    res.json(list('versions').filter((v) => v.plan_id === req.params.id)));
  app.post(`${M}/plans/:id/versions`, requireAuth, (req, res) =>
    res.json(createIn('versions', { ...(req.body || {}), plan_id: req.params.id, auteur: req.user.username })));
  // Chaîne des versions d'un plan : racine puis amendements successifs.
  // Lignée du plan : ses ascendants, lui-même, puis ses descendants. Un
  // amendement abandonné dans une branche voisine n'est pas repris.
  const familleDuPlan = (planId) => {
    const tous = list('plans');
    const parId = {};
    tous.forEach((p) => { parId[p.id] = p; });
    const courant = parId[planId];
    if (!courant) return [];

    const ascendants = [];
    let a = courant.parent_plan_id ? parId[courant.parent_plan_id] : null;
    const vus = new Set([courant.id]);
    while (a && !vus.has(a.id) && ascendants.length < 50) {
      vus.add(a.id);
      ascendants.unshift(a);
      a = a.parent_plan_id ? parId[a.parent_plan_id] : null;
    }

    const descendants = [];
    let noeud = courant;
    while (descendants.length < 50) {
      const enfants = tous.filter((p) => p.parent_plan_id === noeud.id && !vus.has(p.id));
      if (!enfants.length) break;
      // Une seule lignée : on suit la version retenue (validée ou archivée)
      const suite = enfants.find((p) => ['valide', 'approuve_dg', 'transmis', 'archive'].includes(p.statut))
        || enfants[0];
      vus.add(suite.id);
      descendants.push(suite);
      noeud = suite;
    }
    return [...ascendants, courant, ...descendants];
  };

  // Nom complet de l'auteur, résolu depuis l'annuaire des utilisateurs
  const nomComplet = (identifiant) => {
    if (!identifiant) return '';
    const u = (auth.getUsers() || []).find((x) => x.username === identifiant
      || x.email === identifiant || x.id === identifiant);
    if (!u) return identifiant;
    const complet = `${(u.nom || '').toUpperCase()} ${u.prenom || ''}`.trim();
    return complet || u.username || identifiant;
  };

  app.get(`${M}/plans/:id/commentaires`, requireAuth, (req, res) => {
    // Le fil reprend toutes les versions du plan, depuis la première.
    const chaine = familleDuPlan(req.params.id);
    const versions = {};
    chaine.forEach((p) => { versions[p.id] = p.version || 1; });
    const ids = new Set(Object.keys(versions).length ? Object.keys(versions) : [req.params.id]);

    const commentaires = list('commentaires')
      .filter((c) => ids.has(c.plan_id))
      .map((c) => ({ ...c, plan_version: versions[c.plan_id], user_display_name: nomComplet(c.auteur || c.user_id) }));
    // Les décisions de validation / rejet rejoignent le fil de discussion
    const decisions = list('workflow')
      .filter((w) => ids.has(w.plan_id) && w.commentaire
        && ['valider', 'rejeter', 'rejeter-annuler', 'validation', 'rejet'].includes(w.action))
      .map((w) => ({ ...w, timeline_type: 'workflow', plan_version: versions[w.plan_id], user_display_name: nomComplet(w.user) }));
    const tri = (x) => x.date_action || x.date_creation || x.createdAt || '';
    res.json([...commentaires, ...decisions].sort((a, b) => String(tri(a)).localeCompare(String(tri(b)))));
  });
  app.post(`${M}/plans/:id/commentaires`, requireAuth, (req, res) =>
    res.json(createIn('commentaires', { ...(req.body || {}), plan_id: req.params.id, auteur: req.user.username })));
  app.delete(`${M}/commentaires/:id`, requireAuth, (req, res) =>
    res.json({ ok: deleteIn('commentaires', req.params.id) }));

  // ── Cycles de surveillance des prestataires ──
  app.get(`${M}/prestataires-risques`, requireAuth, (req, res) => {
    const profs = riskProfiles();
    const prest = referentiels.getAll().prestataires || [];
    // Un prestataire n'apparaît que s'il a un profil de risque validé :
    // la page « Profils de risque » reflète ainsi « Synthèses Profils ».
    res.json(prest.map((p) => {
      const rp = profs.find((r) => r.prestataire_id === p.id);
      if (!rp) return null;
      const cyc = list('cycles').find((c) => c.prestataire_id === p.id) || {};
      // Dates de cycle par défaut : issues du dernier profil de risque validé
      // (début = date de validation, fin = début + CSRBO mois).
      const debutDefaut = (rp.date_validation || '').substring(0, 10);
      let finDefaut = '';
      if (debutDefaut && rp.csrbo) {
        const f = new Date(debutDefaut);
        f.setMonth(f.getMonth() + Number(rp.csrbo));
        finDefaut = f.toISOString().substring(0, 10);
      }
      return {
        id: p.id, nom: p.nom, trigramme: p.trigramme || '',
        domaine_id: p.domaine_id || rp.domaine_id || '', secteur_id: p.secteur_id || rp.secteur_id || '',
        evaluation_id: rp.id,
        risk_label: rp.niveau, matrice: rp.matrice, intensite: rp.intensite,
        csn: rp.csn, csrbo: rp.csrbo, frequence: rp.frequence,
        resultats: rp.resultats,
        evaluation_date: rp.date_validation, cycle: rp.cycle,
        // Champs historiques conservés pour les appelants existants
        niveau_risque: rp.niveau, score_risque: rp.score, date_profil: rp.date_validation,
        debut_cycle: cyc.debut_cycle || p.debut_cycle || debutDefaut,
        fin_cycle: cyc.fin_cycle || p.fin_cycle || finDefaut,
      };
    }).filter(Boolean));
  });
  // Le client enregistre les dates de cycle en PUT ; POST conservé pour
  // compatibilité (sans PUT, Express renvoyait une 404 HTML que le client
  // tentait de parser en JSON).
  const majCycle = (req, res) => {
    const pr = (referentiels.getAll().prestataires || []).find((x) => x.id === req.params.id) || {};
    if (!moduleRights.can('PLAN', req.user.username, 'VALIDATEUR', pr.domaine_id || '', pr.secteur_id || '')) {
      return res.status(403).json({ error: 'privilege_insuffisant' });
    }
    const d = load();
    d.cycles = d.cycles || [];
    const i = d.cycles.findIndex((c) => c.prestataire_id === req.params.id);
    const rec = { prestataire_id: req.params.id, ...(req.body || {}), updatedAt: new Date().toISOString() };
    if (i >= 0) d.cycles[i] = { ...d.cycles[i], ...rec }; else d.cycles.push({ id: uid(), ...rec });
    save(d);
    res.json({ ok: true });
  };
  app.post(`${M}/prestataires/:id/cycle`, requireAuth, majCycle);
  app.put(`${M}/prestataires/:id/cycle`, requireAuth, majCycle);

  // ── Synchronisation des risques → plan ──
  // Profils concernés par un plan : ceux de son secteur / domaine, sinon tous.
  const profilsDuPlan = (plan) => {
    const secteurs = referentiels.getAll().secteurs || [];
    return riskProfiles().filter((p) => {
      if (plan.secteur_id) return p.secteur_id === plan.secteur_id;
      if (plan.domaine_id) {
        const sec = secteurs.find((s) => s.id === p.secteur_id);
        return (p.domaine_id || sec?.domaine_id) === plan.domaine_id;
      }
      return true;
    });
  };

  // Écarts entre le plan et les profils de risque en vigueur.
  const ecartsRisques = (plan) => {
    const acts = list('activites').filter((a) => a.plan_id === plan.id);
    return profilsDuPlan(plan).map((p) => {
      const mesActs = acts.filter((a) => a.prestataire_id === p.prestataire_id);
      const courant = { risk_label: p.niveau || '', csrbo: p.csrbo || null };
      if (!mesActs.length) {
        return { prestataire_id: p.prestataire_id, type: 'nouveau', current: courant, apres: courant };
      }
      const a = mesActs[0];
      const avant = { risk_label: a.risk_label || '', csrbo: a.cycle_mois || null };
      const modifie = avant.risk_label !== courant.risk_label || Number(avant.csrbo) !== Number(courant.csrbo);
      return modifie
        ? { prestataire_id: p.prestataire_id, type: 'modifie', avant, apres: courant }
        : null;
    }).filter(Boolean);
  };

  app.get(`${M}/plans/:id/sync-risques`, requireAuth, (req, res) => {
    const plan = list('plans').find((x) => x.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'not_found' });
    const changes = ecartsRisques(plan);
    res.json({ has_changes: changes.length > 0, changes });
  });

  app.post(`${M}/plans/:id/apply-sync`, requireAuth, (req, res) => {
    const plan = list('plans').find((x) => x.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'not_found' });
    if (!peut(req, 'CONTRIBUTEUR', plan)) return refus(res);
    const ids = (req.body && (req.body.prestataire_ids || req.body.items)) || [];
    const retenus = new Set(ids.map((x) => (typeof x === 'string' ? x : x.prestataire_id)));
    const changes = ecartsRisques(plan).filter((c) => retenus.has(c.prestataire_id));

    // Plan déjà validé : les changements alimentent un amendement (nouvelle
    // version en brouillon) plutôt que le plan en vigueur.
    let cible = plan;
    let amended = false;
    if (['valide', 'approuve_dg', 'transmis'].includes(plan.statut)) {
      const { id: _old, ...base } = plan;
      cible = createIn('plans', {
        ...base, statut: 'brouillon', version: (plan.version || 1) + 1,
        parent_plan_id: plan.id, createdAt: new Date().toISOString(), created_by: req.user.username,
      });
      list('activites').filter((a) => a.plan_id === plan.id).forEach((a) => {
        const { id: _aid, ...ab } = a;
        createIn('activites', { ...ab, plan_id: cible.id, parent_activite_id: a.parent_activite_id || a.id });
      });
      amended = true;
    }

    const prestataires = referentiels.getAll().prestataires || [];
    let created = 0; let updated = 0;
    changes.forEach((c) => {
      const acts = list('activites').filter((a) => a.plan_id === cible.id && a.prestataire_id === c.prestataire_id);
      if (!acts.length) {
        const pr = prestataires.find((x) => x.id === c.prestataire_id) || {};
        createIn('activites', {
          plan_id: cible.id, prestataire_id: c.prestataire_id,
          secteur_id: pr.secteur_id || '', domaine_id: pr.domaine_id || '',
          objet: `Surveillance ${pr.trigramme || pr.nom || ''}`.trim(),
          titre: `Surveillance ${pr.trigramme || pr.nom || ''}`.trim(),
          risk_label: c.apres.risk_label, cycle_mois: c.apres.csrbo,
          statut: 'planifiee', priorite: 'normale', nombre_inspecteurs: 1,
        });
        created++;
      } else {
        acts.forEach((a) => {
          updateIn('activites', a.id, { risk_label: c.apres.risk_label, cycle_mois: c.apres.csrbo });
          updated++;
        });
      }
    });

    audit.log(req.user.username, 'PLAN_SYNC_RISQUES', { plan: cible.id, created, updated, amended });
    res.json({ ok: true, created, updated, amended, target_plan_id: cible.id });
  });
  app.post(`${M}/plans/:id/import-risques`, requireAuth, (req, res) => {
    if (!peut(req, 'CONTRIBUTEUR', planDe(req.params.id))) return refus(res);
    const profs = riskProfiles();
    let created = 0;
    profs.forEach((p) => {
      createIn('activites', {
        plan_id: req.params.id, prestataire_id: p.prestataire_id, secteur_id: p.secteur_id,
        domaine_id: p.domaine_id, niveau_risque: p.niveau, statut: 'planifiee',
      });
      created++;
    });
    res.json({ ok: true, created });
  });
}

module.exports = { register, seed, riskProfiles, plansValides };
