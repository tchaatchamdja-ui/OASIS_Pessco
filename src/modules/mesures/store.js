// Module « Mesures d'Application » — accès aux données.
//
// Reprise du module PESSCO (Flask + SQLite) sur le socle OASIS. Les tables du
// module deviennent les collections de `mesures` :
//   mesures_application → mesures
//   mes_categories      → categories
//   mes_types           → types
//
// En base depuis ADR-002, jalon n° 13. Le vocabulaire commun aux cinq modules
// vit dans `src/magasin_module.js` ; ce module-ci tire ses identifiants lui-même,
// avec un préfixe parlant, et porte ses propres dates — d'où les deux options.
//
// ── Ce que la bascule rendait dangereux ici ──
//
// Les deux compteurs de référence. `prochaineReference` lit le dernier numéro,
// l'incrémente et réécrit : **c'est le geste le plus sensible de ce module.**
// Rendu asynchrone sans précaution, deux mesures prononcées ensemble liraient le
// même dernier numéro et porteraient la même référence `MES-0042` — référence
// notifiée au prestataire, et qui désigne un acte d'autorité. Elles passent par
// `transformer`.
const crypto = require('crypto');
const { magasinDeModule } = require('../../magasin_module');

const base = magasinDeModule('mesures', { identifiantParLeMagasin: false, horodater: false });

// « constatations » : celles que le module relève lui-même, faute d'un module
// producteur — un signalement, un contrôle inopiné, une saisine. Celles des
// autres modules arrivent par le bus de services et ne sont jamais stockées ici.
// « classements » : la décision de ne donner aucune suite à une infraction.
// Elle est prise ici, y compris sur une infraction reçue d'un autre module —
// dont les données ne sont jamais modifiées.
// « traitements » : le fil d'avancement d'une carence — ce que l'autorité a
// recueilli en plus du plan d'actions, et la décision sur la suite à donner.
// Un enregistrement par carence, quelle que soit son origine ; les données du
// module producteur ne sont jamais touchées.
// « types_investigation » : ce que l'équipe a fait pour établir les faits —
// une visite, un entretien, l'examen d'enregistrements. La liste est
// paramétrable au menu du module ; les trois valeurs d'origine couvrent les
// moyens ordinaires d'une investigation.
// « comites » : les comités décisionnels qui siègent pour qualifier une
// carence et arrêter la sanction. La liste se tient au menu Paramètres ; elle
// part vide, chaque autorité nommant les siens.
const COLLECTIONS = ['mesures', 'categories', 'types', 'constatations', 'classements',
  'traitements', 'types_investigation', 'comites'];

const TYPES_INVESTIGATION_DEFAUT = [
  ['inspection_terrain', 'Inspection / Observations sur le terrain'],
  ['entretien', 'Entretien'],
  ['analyse_enregistrements', 'Analyse des enregistrements'],
];

// Catégories et types livrés d'origine : ce sont les valeurs du formulaire
// « Nouvelle mesure » de PESSCO. Elles restent modifiables au menu Paramètres.
const CATEGORIES_DEFAUT = [
  { code: 'administrative', libelle: 'Mesure administrative' },
  { code: 'sanction', libelle: 'Sanction administrative' },
  { code: 'penale', libelle: 'Sanction pénale' },
];

const TYPES_DEFAUT = [
  ['administrative', 'recommandation_verbale', 'Recommandation verbale'],
  ['administrative', 'recommandation_ecrite', 'Recommandation écrite'],
  ['administrative', 'reunion_securite', 'Réunion de sécurité'],
  ['administrative', 'lettre_correction', 'Lettre de correction'],
  ['administrative', 'preavis', 'Préavis'],
  ['administrative', 'surveillance_renforcee', 'Surveillance renforcée'],
  ['administrative', 'formation_recyclage', 'Formation de recyclage'],
  ['administrative', 'action_urgence', "Action d'urgence"],
  ['sanction', 'avertissement', 'Avertissement'],
  ['sanction', 'blame', 'Blâme'],
  ['sanction', 'restriction', 'Restriction'],
  ['sanction', 'suspension', 'Suspension'],
  ['sanction', 'revocation', 'Révocation'],
  ['sanction', 'amende_administrative', 'Amende administrative'],
  ['penale', 'saisine_judiciaire', 'Saisine judiciaire'],
];

const uid = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();

const typesInvestigationDefaut = () => TYPES_INVESTIGATION_DEFAUT.map(([code, libelle], i) => ({
  id: `mti_${code}`, code, libelle, ordre: i,
}));

async function seed() {
  const existant = await base.load();
  if (Object.keys(existant).length) return;
  const vide = {};
  COLLECTIONS.forEach((c) => { vide[c] = []; });
  vide.categories = CATEGORIES_DEFAUT.map((c, i) => ({
    id: `mca_${c.code}`, code: c.code, libelle: c.libelle, ordre: i,
  }));
  vide.types = TYPES_DEFAUT.map(([cat, code, libelle], i) => ({
    id: `mty_${code}`, categorie_code: cat, code, libelle, ordre: i,
  }));
  vide.types_investigation = typesInvestigationDefaut();
  await base.save({ ...vide, createdAt: now() });
}

// Les instances déjà installées n'ont pas la liste : on l'amorce au démarrage
// plutôt que d'ouvrir un écran de paramétrage vide.
async function seedTypesInvestigation() {
  await base.transformer((d) => {
    if ((d.types_investigation || []).length) return base.INCHANGE;
    d.types_investigation = typesInvestigationDefaut();
    return d;
  });
}

// ── Numérotation continue : MES-0001, MES-0002… ──
//
// Le rang est conservé à part et jamais recalculé depuis les mesures présentes :
// une mesure supprimée rendrait sinon sa référence, qui a pu être notifiée à un
// prestataire. Le plus grand numéro en base sert de plancher, pour les données
// antérieures à ce compteur.
//
// **Le calcul se fait dans la transformation, et il le faut.** Lire le dernier
// numéro, l'incrémenter et réécrire est le geste qu'une conversion asynchrone
// naïve casse : deux mesures prononcées ensemble liraient le même rang et
// porteraient la même référence. Un acte d'autorité ne partage pas son numéro.
// L'allocateur est **pur** : il avance le compteur dans l'état qu'on est en train
// d'écrire et rend la référence. C'est ce qui permet d'en tirer plusieurs dans la
// même transformation — l'instance arrête souvent trois ou quatre mesures d'un
// coup, et chacune aurait sinon demandé son propre aller-retour, donc sa propre
// occasion de collision.
const allouer = (cle, prefixe, coll, motif) => (d) => {
  const plancher = (d[coll] || []).reduce((n, r) => {
    const c = motif.exec(String(r.reference || ''));
    return c ? Math.max(n, Number(c[1])) : n;
  }, 0);
  const rang = Math.max(Number(d[cle]) || 0, plancher) + 1;
  d[cle] = rang;
  return `${prefixe}-${String(rang).padStart(4, '0')}`;
};

const allouerReference = allouer('dernier_numero', 'MES', 'mesures', /^MES-(\d+)$/);
// Même règle pour les constatations que le module relève lui-même.
const allouerReferenceConstat = allouer('dernier_numero_constat', 'CST', 'constatations', /^CST-(\d+)$/);

module.exports = {
  ...base,
  COLLECTIONS, CATEGORIES_DEFAUT, uid, now,
  seed, seedTypesInvestigation,
  allouerReference, allouerReferenceConstat,
};
