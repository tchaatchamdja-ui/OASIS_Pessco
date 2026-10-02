// Module « Planification de la Surveillance » — cycles de surveillance des
// prestataires et synchronisation des profils de risque vers le plan.
const referentiels = require('../../referentiels');
const { asynchrone } = require('../../route');
const moduleRights = require('../../module_rights');
const instances = require('../../instances');
const db = require('./store');
const D = require('./domaine');
const { valider } = require('../../valider');

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig, audit } = deps;

  // Les profils de risque arrivent du module voisin par le bus, qui ignore le
  // compte : l'instance se pose ici. Ceux d'un plan sont ceux de son instance
  // à lui — un plan validé au Togo ne se compare pas aux notations du Bénin.
  const profilsVus = async (req) => instances.filtrer(
    await D.riskProfiles(), instances.courante(req.user, loadConfig), loadConfig);
  const profilsDuPlan = async (plan) => instances.filtrer(
    await D.riskProfiles(), instances.de(plan, loadConfig), loadConfig);

  // ── Cycles de surveillance des prestataires ──
  app.get(`${M}/prestataires-risques`, requireAuth, asynchrone(async (req, res) => {
    // Les cycles **avant** la liste : lus dans le `map`, chacun des trente
    // prestataires aurait rendu un aller-retour, et une promesse là où un
    // enregistrement est attendu.
    const [profs, cycles] = await Promise.all([profilsVus(req), db.list('cycles')]);
    const prest = instances.refs(req.user, loadConfig).prestataires || [];
    // Un prestataire n'apparaît que s'il a un profil de risque validé :
    // la page « Profils de risque » reflète ainsi « Synthèses Profils ».
    res.json(prest.map((p) => {
      const rp = profs.find((r) => r.prestataire_id === p.id);
      if (!rp) return null;
      const cyc = cycles.find((c) => c.prestataire_id === p.id) || {};
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
  }));

  // Le client enregistre les dates de cycle en PUT ; POST conservé pour
  // compatibilité (sans PUT, Express renvoyait une 404 HTML que le client
  // tentait de parser en JSON).
  const majCycle = asynchrone(async (req, res) => {
    const pr = (referentiels.getAll().prestataires || []).find((x) => x.id === req.params.id) || {};
    if (!moduleRights.can('PLAN', req.user.username, 'VALIDATEUR', pr.domaine_id || '', pr.secteur_id || '')) {
      return res.status(403).json({ error: 'privilege_insuffisant' });
    }
    // Tiré hors de la transformation : rejouée, elle doit reposer le même.
    const nouvelId = db.uid();
    await db.transformer((d) => {
      d.cycles = d.cycles || [];
      const i = d.cycles.findIndex((c) => c.prestataire_id === req.params.id);
      // Une date effacée arrive vide et le validateur la recopie vide (option
      // `effacer`) : le cycle se vide, l'ancienne date ne lui survit pas.
      const dates = {};
      ['debut_cycle', 'fin_cycle'].forEach((k) => {
        if (req.valide[k] !== undefined) dates[k] = req.valide[k];
      });
      const rec = { prestataire_id: req.params.id, ...dates, updatedAt: new Date().toISOString() };
      if (i >= 0) d.cycles[i] = { ...d.cycles[i], ...rec }; else d.cycles.push({ id: nouvelId, ...rec });
      return d;
    });
    return res.json({ ok: true });
  });
  // Un cycle, ce sont deux dates. Le corps entrait ici tel quel : le
  // prestataire, l'identifiant du rang et sa date de mise à jour s'y
  // réécrivaient depuis le client.
  const SCHEMA_CYCLE = { debut_cycle: { type: 'date' }, fin_cycle: { type: 'date' } };
  app.post(`${M}/prestataires/:id/cycle`, requireAuth, valider(SCHEMA_CYCLE, { effacer: true }), majCycle);
  app.put(`${M}/prestataires/:id/cycle`, requireAuth, valider(SCHEMA_CYCLE, { effacer: true }), majCycle);

  // ── Synchronisation des risques → plan ──
  app.get(`${M}/plans/:id/sync-risques`, requireAuth, asynchrone(async (req, res) => {
    const plan = await db.get('plans', req.params.id);
    if (!plan) return res.status(404).json({ error: 'not_found' });
    const changes = await D.ecartsRisques(plan, await profilsDuPlan(plan));
    return res.json({ has_changes: changes.length > 0, changes });
  }));

  // Plan déjà validé : les changements alimentent un amendement (nouvelle
  // version en brouillon) plutôt que le plan en vigueur.
  //
  // Travaille sur l'état en cours de transformation, et n'écrit rien : l'ouverture
  // de l'amendement, la copie de ses activités et l'application des écarts sont un
  // seul geste. C'étaient autant d'écritures qu'il y a d'activités, plus deux ; un
  // échec au milieu laissait une version en brouillon à moitié recopiée, que rien
  // ne distinguait d'un amendement réel.
  const cibleDeSynchro = (d, plan, username, nouvelId) => {
    if (!D.STATUTS_EN_VIGUEUR.includes(plan.statut)) return { cible: plan, amended: false };
    const { id: _old, ...base } = plan;
    const cible = {
      ...base, statut: 'brouillon', version: (plan.version || 1) + 1,
      parent_plan_id: plan.id, createdAt: new Date().toISOString(), created_by: username,
      id: nouvelId,
    };
    d.plans = d.plans || [];
    d.plans.push(cible);
    const acts = d.activites || [];
    acts.filter((a) => a.plan_id === plan.id).forEach((a) => {
      const { id: _aid, ...ab } = a;
      acts.push({
        ...ab, plan_id: nouvelId, parent_activite_id: a.parent_activite_id || a.id,
        createdAt: new Date().toISOString(), id: db.uid(),
      });
    });
    d.activites = acts;
    return { cible, amended: true };
  };

  app.post(`${M}/plans/:id/apply-sync`, requireAuth, asynchrone(async (req, res) => {
    const plan = await db.get('plans', req.params.id);
    if (!plan) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'CONTRIBUTEUR', plan)) return D.refus(res);
    const ids = (req.body && (req.body.prestataire_ids || req.body.items)) || [];
    const retenus = new Set(ids.map((x) => (typeof x === 'string' ? x : x.prestataire_id)));
    // Les écarts sont calculés **avant** la transformation : ils viennent du bus,
    // donc d'une attente, et un transformateur ne doit rien attendre d'ailleurs —
    // il peut être rejoué. Ce qui s'écrit ensuite s'écrit d'un seul coup.
    const changes = (await D.ecartsRisques(plan, await profilsDuPlan(plan)))
      .filter((c) => retenus.has(c.prestataire_id));
    const prestataires = referentiels.getAll().prestataires || [];
    // Tiré hors de la transformation : rejouée, elle doit reposer le même, et
    // c'est cet identifiant que la réponse rend à l'écran.
    const nouvelId = db.uid();

    let cibleId = plan.id;
    let amended = false;
    let created = 0;
    let updated = 0;
    await db.transformer((d) => {
      created = 0; updated = 0;
      const courant = (d.plans || []).find((x) => x.id === req.params.id) || plan;
      const issu = cibleDeSynchro(d, courant, req.user.username, nouvelId);
      cibleId = issu.cible.id;
      amended = issu.amended;
      const acts = d.activites || [];
      changes.forEach((c) => {
        const miennes = acts.filter((a) => a.plan_id === cibleId && a.prestataire_id === c.prestataire_id);
        if (!miennes.length) {
          const pr = prestataires.find((x) => x.id === c.prestataire_id) || {};
          acts.push({
            plan_id: cibleId, prestataire_id: c.prestataire_id,
            // Née d'un plan, elle appartient à l'instance de ce plan.
            instance: issu.cible.instance || '',
            secteur_id: pr.secteur_id || '', domaine_id: pr.domaine_id || '',
            objet: `Surveillance ${pr.trigramme || pr.nom || ''}`.trim(),
            titre: `Surveillance ${pr.trigramme || pr.nom || ''}`.trim(),
            risk_label: c.apres.risk_label, cycle_mois: c.apres.csrbo,
            statut: 'planifiee', priorite: 'normale', nombre_inspecteurs: 1,
            createdAt: new Date().toISOString(), id: db.uid(),
          });
          created += 1;
        } else {
          miennes.forEach((a) => {
            const j = acts.findIndex((x) => x.id === a.id);
            acts[j] = {
              ...acts[j], risk_label: c.apres.risk_label, cycle_mois: c.apres.csrbo,
              updatedAt: new Date().toISOString(),
            };
            updated += 1;
          });
        }
      });
      d.activites = acts;
      return d;
    });

    await audit.log(req.user.username, 'PLAN_SYNC_RISQUES', { plan: cibleId, created, updated, amended });
    return res.json({ ok: true, created, updated, amended, target_plan_id: cibleId });
  }));
};
