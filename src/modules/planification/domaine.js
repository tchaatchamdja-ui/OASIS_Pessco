// Module « Planification de la Surveillance » — règles du métier partagées par
// les routes : rôle du module, profils de risque, plans en vigueur, privilèges,
// verrou d'exécution, schémas de saisie et journal de circuit.
const referentiels = require('../../referentiels');
const services = require('../../services');
const moduleRights = require('../../module_rights');
const { ROLES_PRESTATAIRE } = require('../../vues_prestataire');
const db = require('./store');

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

// Amender un plan en vigueur ouvre une version suivante, qui chemine dans le
// circuit tant qu'elle n'est pas validée à son tour : ces statuts-là sont ceux
// d'un amendement en cours. Le plan d'origine reste la référence entre-temps.
const STATUTS_AMENDEMENT = ['brouillon', 'soumis', 'en_revue', 'rejete'];

// Plans en vigueur dont une version suivante chemine encore.
function plansEnAmendement(plans) {
  const parents = new Set((plans || [])
    .filter((p) => p.parent_plan_id && STATUTS_AMENDEMENT.includes(p.statut))
    .map((p) => p.parent_plan_id));
  return (plans || []).filter((p) => STATUTS_EN_VIGUEUR.includes(p.statut) && parents.has(p.id));
}

function plansValides(filtre) {
  const f = filtre || {};
  const acts = db.list('activites');
  return db.list('plans')
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
        // L'instance qui a programmé le plan : « Exécution de la Surveillance »
        // ne déclenche que les activités de l'instance dont elle tient le poste.
        instance: p.instance || '',
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

// ── Droits du module ──
// Le privilège de « Gestion des Droits » (module PLAN) gouverne l'écriture,
// avec ses portées par domaine et secteur. Les deux super-menus partagent
// le même espace de privilèges.

// La planification est l'affaire de l'Autorité : le module n'a pas d'écran
// côté organisme, et le programme annuel — qui sera inspecté, quand, sur quel
// site — n'a pas à être servi à l'un des inspectés. Le socle accorde
// « Lecteur » par défaut à tout compte : sans cette garde, une session
// prestataire lisait le plan national et les dates de visite de ses
// concurrents.
const estPrestataire = (user) => !!user && ROLES_PRESTATAIRE.includes(user.role);

// Espace de privilèges du module, et case correspondante d'« Accès aux
// modules ». Le nom était écrit en clair à chaque appel : la garde du contexte
// le demandait sous `D.RIGHTS`, qui n'existait pas — elle comparait donc
// `undefined` à la liste des modules ouverts, et refusait le module à tout
// compte qui n'est pas super-administrateur.
const RIGHTS = 'PLAN';

const peut = (req, privilege, plan) => !estPrestataire(req.user) && moduleRights.can(
  RIGHTS, req.user.username, privilege,
  (plan && plan.domaine_id) || '', (plan && plan.secteur_id) || '',
);

// Lecture : tout privilège convient, sauf « Aucun » posé sur la portée — et
// sauf un compte rattaché à un organisme surveillé.
const peutLire = (req, plan) => !!req.user && !estPrestataire(req.user)
  && moduleRights.effectivePrivilege(
    RIGHTS, req.user.username,
    (plan && plan.domaine_id) || '', (plan && plan.secteur_id) || '',
  ) !== 'AUCUN';

const refus = (res) => res.status(403).json({ error: 'privilege_insuffisant' });
const planDe = (id) => db.list('plans').find((x) => x.id === id) || null;

// ── Activités verrouillées par l'exécution ──
// Une activité dont le circuit a commencé dans « Exécution de la Surveillance »
// ne se réécrit plus : l'amendement du plan la recopie, mais telle quelle. Le
// verrou suit la lignée (`parent_activite_id`), sinon une copie amendée
// échapperait au déclenchement de son ancêtre.
const activitesDeclenchees = () => new Set(services.callOr('SURV.activitesDeclenchees', []) || []);

// Toutes les copies d'une même activité partagent leur racine : l'amendement
// pose `parent_activite_id = parent_activite_id || id`. Comparer les racines
// verrouille donc aussi bien l'activité déclenchée que ses copies, dans un
// sens comme dans l'autre.
const racine = (act) => (act ? (act.parent_activite_id || act.id) : '');

const racinesDeclenchees = () => {
  const declenchees = activitesDeclenchees();
  if (!declenchees.size) return new Set();
  const toutes = db.list('activites');
  const racines = new Set();
  declenchees.forEach((id) => {
    const a = toutes.find((x) => x.id === id);
    racines.add(a ? racine(a) : id);
  });
  return racines;
};

const estVerrouillee = (act) => !!act && racinesDeclenchees().has(racine(act));

const refusVerrou = (res) => res.status(409).json({
  error: 'activite_declenchee',
  message: 'Activité déjà déclenchée dans l’exécution de la surveillance : elle n’est pas amendable.',
});

// Journal du circuit d'un plan.
const wf = (planId, action, user, extra) => db.createIn('workflow', {
  plan_id: planId, action, user, date: new Date().toISOString(), ...(extra || {}),
});

// Nom complet de l'auteur, résolu depuis l'annuaire des utilisateurs.
const nomComplet = (auth) => (identifiant) => {
  if (!identifiant) return '';
  const u = (auth.getUsers() || []).find((x) => x.username === identifiant
    || x.email === identifiant || x.id === identifiant);
  if (!u) return identifiant;
  const complet = `${(u.nom || '').toUpperCase()} ${u.prenom || ''}`.trim();
  return complet || u.username || identifiant;
};

// Lignée du plan : ses ascendants, lui-même, puis ses descendants. Un
// amendement abandonné dans une branche voisine n'est pas repris.
const familleDuPlan = (planId) => {
  const tous = db.list('plans');
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

// Profils concernés par un plan : ceux de son secteur / domaine, sinon tous.
// `profils` — déjà resserrés sur l'instance du plan par la route appelante —
// évite qu'un plan se compare aux notations d'un autre État ; à défaut, tous.
const profilsDuPlan = (plan, profils) => {
  const secteurs = referentiels.getAll().secteurs || [];
  return (profils || riskProfiles()).filter((p) => {
    if (plan.secteur_id) return p.secteur_id === plan.secteur_id;
    if (plan.domaine_id) {
      const sec = secteurs.find((s) => s.id === p.secteur_id);
      return (p.domaine_id || (sec && sec.domaine_id)) === plan.domaine_id;
    }
    return true;
  });
};

// Écarts entre le plan et les profils de risque en vigueur.
const ecartsRisques = (plan, profils) => {
  const acts = db.list('activites').filter((a) => a.plan_id === plan.id);
  return profilsDuPlan(plan, profils).map((p) => {
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

// ── Schémas de saisie ──
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

module.exports = {
  RIGHTS,
  roleM2, riskProfiles, plansValides, STATUTS_EN_VIGUEUR,
  STATUTS_AMENDEMENT, plansEnAmendement,
  peut, peutLire, estPrestataire, refus, planDe,
  racine, racinesDeclenchees, estVerrouillee, refusVerrou,
  wf, nomComplet, familleDuPlan, ecartsRisques,
  SCHEMA_PLAN, SCHEMA_ACTIVITE
};
