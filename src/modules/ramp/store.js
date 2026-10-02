// Module « Inspections d'aéronefs sur aire de trafic » — accès aux données.
//
// Reprise de l'application RAMP (Express + Prisma/PostgreSQL) sur le socle
// OASIS. Les modèles Prisma deviennent les collections de `ramp` ; la relation Inspection → Anomaly, portée par une clé
// étrangère et un `onDelete: Cascade`, se rejoue ici par `inspection_id` et une
// suppression explicite des écarts.
//
//   Inspection → inspections
//   Anomaly    → ecarts
//   Setting    → parametres
//   Depot      → depots
//   Contact    → contacts
//
// Les modèles `User` et `AuditLog` de RAMP n'ont pas d'équivalent ici : le
// socle porte déjà les comptes, les sessions et le journal d'audit.
// En base depuis ADR-002, jalon n° 13 — quatrième magasin de module. Le
// vocabulaire commun aux cinq vit dans `src/magasin_module.js`, dont l'en-tête dit
// ce que `transformer` existe pour empêcher.
//
// Ce module tire ses identifiants lui-même, avec un préfixe parlant, et porte ses
// propres dates : d'où les deux options. Changer la forme de ses enregistrements
// en passant n'aurait pas été une conversion mais une migration de données.
//
// La nomenclature des aéronefs, elle, est en base depuis le jalon n° 9 et garde
// son propre magasin : on la lit constamment, on l'écrit rarement, et une
// écriture d'inspection n'a pas à la réécrire.
const crypto = require('crypto');
const { magasinDeModule } = require('../../magasin_module');
const magasin = require('../../magasin');

const base = magasinDeModule('ramp', { identifiantParLeMagasin: false, horodater: false });

const COLLECTIONS = ['inspections', 'ecarts', 'parametres', 'depots', 'contacts', 'aeroports', 'pays', 'poi',
  // Requêtes entre États membres, et leurs fils d'échanges.
  'requetes',
  // Transmissions mises à disposition d'autres États : copies figées.
  'partages',
  // Vue active (AAC / Prestataire) du super-administrateur, un enregistrement
  // par compte. Une base antérieure n'a pas la collection : elle se crée à la
  // première bascule.
  'vues'];

// Familles de paramètres, telles que l'application d'origine les nomme.
// « groupes » réunit les items SAFA. C'était jusqu'ici
// un simple champ de texte sur l'item ; c'est désormais une liste à part
// entière, qu'on tient comme les autres — on y ajoute un groupe, on le renomme,
// on le désactive.
// « states » n'y figure plus non plus : les pays portent désormais leur
// bigramme ISO, leur autorité de l'aviation civile et ses coordonnées, et
// forment leur propre liste — bien au-delà d'un simple libellé.
// « aeronefs » ne figure plus ici : la nomenclature des aéronefs compte près de
// dix mille lignes et vit dans son propre fichier (`ramp_aeronefs.json`). La
// mêler aux paramètres ferait relire et réécrire un mégaoctet à chaque
// écriture du module, et la servirait en entier au chargement de l'écran.
const FAMILLES = ['exploitants', 'groupes', 'items',
  'categories', 'actions', 'statuts'];

// États couverts par le dispositif. RAMP en tenait deux listes : les neuf
// États du champ des inspections, et les dix-sept du carnet d'adresses.
const ETATS_INSPECTION = ['Bénin', 'Burkina Faso', "Côte d'Ivoire", 'Guinée-Bissau',
  'Mali', 'Mauritanie', 'Niger', 'Sénégal', 'Togo'];
const ETATS_CONTACT = ['UEMOA', 'Bénin', 'Burkina Faso', 'Cap Vert', "Côte d'Ivoire",
  'Gambie', 'Ghana', 'Guinée', 'Guinée-Bissau', 'Libéria', 'Mali', 'Mauritanie',
  'Niger', 'Nigéria', 'Sénégal', 'Sierra Leone', 'Togo'];

// Les 54 items du programme SAFA, avec leur groupe d'origine.
const ITEMS_SAFA = [
  ['A01', 'Flight Deck', 'General Condition'], ['A02', 'Flight Deck', 'Emergency Exit'],
  ['A03', 'Flight Deck', 'Equipment'], ['A04', 'Flight Deck', 'Manuals'],
  ['A05', 'Flight Deck', 'Checklists'], ['A06', 'Flight Deck', 'Radio Navigation Charts'],
  ['A07', 'Flight Deck', 'Minimum Equipment List'], ['A08', 'Flight Deck', 'Certificate of Registration'],
  ['A09', 'Flight Deck', 'Noise certificate'], ['A10', 'Flight Deck', 'AOC or equivalent'],
  ['A11', 'Flight Deck', 'Radio license'], ['A12', 'Flight Deck', 'Certificate of Airworthiness'],
  ['A13', 'Flight Deck', 'Flight Preparation'], ['A14', 'Flight Deck', 'Weight and balance sheet'],
  ['A15', 'Flight Deck', 'Hand fire extinguishers'], ['A16', 'Flight Deck', 'Life jackets/flotation device'],
  ['A17', 'Flight Deck', 'Harness'], ['A18', 'Flight Deck', 'Oxygen equipment'],
  ['A19', 'Flight Deck', 'Flash light'], ['A20', 'Flight Deck', 'Flight crew license'],
  ['A21', 'Flight Deck', 'Journey log book'], ['A22', 'Flight Deck', 'Maintenance release'],
  ['A23', 'Flight Deck', 'Defect notification and rectification'], ['A24', 'Flight Deck', 'Preflight inspection'],
  ['B01', 'Safety/Cabin', 'General Internal Condition'],
  ['B02', 'Safety/Cabin', 'Cabin Attendants Station/Crew Rest Area'],
  ['B03', 'Safety/Cabin', 'First Aid Kit/Emergency Medical Kit'],
  ['B04', 'Safety/Cabin', 'Hand fire extinguishers'], ['B05', 'Safety/Cabin', 'Life jackets/Flotation devices'],
  ['B06', 'Safety/Cabin', 'Seat belt and seat condition'],
  ['B07', 'Safety/Cabin', 'Emergency exit, lightning and marking, Torches'],
  ['B08', 'Safety/Cabin', 'Slides/Life Rafts, ELT'], ['B09', 'Safety/Cabin', 'Oxygen Supply'],
  ['B10', 'Safety/Cabin', 'Safety instructions'], ['B11', 'Safety/Cabin', 'Cabin crew members'],
  ['B12', 'Safety/Cabin', 'Access to emergency exits'], ['B13', 'Safety/Cabin', 'Safety of passenger baggage'],
  ['B14', 'Safety/Cabin', 'Seat capacity'],
  ['C01', 'Aircraft Condition', 'General External Condition'], ['C02', 'Aircraft Condition', 'Doors and Hatches'],
  ['C03', 'Aircraft Condition', 'Flight Controls'], ['C04', 'Aircraft Condition', 'Wheels, tyres and brakes'],
  ['C05', 'Aircraft Condition', 'Undercarriage, skids/floats'], ['C06', 'Aircraft Condition', 'Wheel well'],
  ['C07', 'Aircraft Condition', 'Powerplant and Pylon'], ['C08', 'Aircraft Condition', 'Fan blades'],
  ['C09', 'Aircraft Condition', 'Propellers, rotors main/tail'], ['C10', 'Aircraft Condition', 'Obvious repairs'],
  ['C11', 'Aircraft Condition', 'Obvious unrepaired damage'], ['C12', 'Aircraft Condition', 'Leakage'],
  ['D01', 'Cargo', 'General Condition of Cargo Compartment'], ['D02', 'Cargo', 'Dangerous Goods'],
  ['D03', 'Cargo', 'Safety of Cargo on Board'],
  ['E01', 'General', 'General'],
];

// Catégories d'écart et leur pondération. La pondération sert au score
// normalisé : un écart de catégorie 3 pèse plus lourd qu'un écart de
// catégorie 1 dans la note d'un exploitant.
const CATEGORIES_DEFAUT = [
  ['1', 'Cat 1', 1], ['2', 'Cat 2', 2], ['3', 'Cat 3', 3], ['G', 'Cat G', 0.5],
];

// Actions SAFA consécutives à un écart, dans l'ordre de gravité croissante.
const ACTIONS_DEFAUT = [
  ['1', 'Information au commandant de bord'],
  ['2', "Information à l'autorité et à l'exploitant"],
  ['3a', 'Restriction de vol'],
  ['3b', 'Actions correctives avant le vol'],
  ['3c', "Immobilisation de l'aéronef"],
];

const EXPLOITANTS_DEFAUT = ['Asky Airlines', "Air Côte d'Ivoire", 'Air Sénégal',
  'Sky Mali', 'Air Burkina', 'Mauritania Airlines'];
const STATUTS_DEFAUT = ['Ouvert', 'Clôturé'];

// Code technique dérivé d'un intitulé. Il est stocké sur l'item, de sorte
// qu'un groupe renommé garde les siens.
const codeDeGroupe = (libelle) => String(libelle || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 40);

const { load, save, transformer, list, get, insert, update, remove, INCHANGE } = base;

const uid = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();

// Reprise des bases antérieures aux groupes d'items.
//
// `seed()` ne s'exécute que sur une base absente : une base déjà créée n'aurait
// donc jamais de groupes, et ses 54 items resteraient orphelins. On les crée
// ici depuis les intitulés que les items portent en clair, puis on remplace ce
// libellé par le code du groupe. Idempotent : une base déjà reprise ne bouge
// plus, puisqu'il n'y a plus de `cat` sans groupe correspondant.
// Les cinq reprises de démarrage suivent la même forme : elles lisent, décident,
// et n'écrivent que s'il y a quelque chose à reprendre. Toutes passent par une
// transformation — `INCHANGE` quand il n'y a rien à faire, ce qui évite de
// réécrire deux cents kilo-octets à chaque démarrage.
async function reprendreGroupes() {
  let faits = 0;
  await transformer((d) => {
  faits = 0;
  const params = d.parametres || [];
  const codesConnus = new Set(params.filter((p) => p.type === 'groupes').map((p) => p.code));
  const items = params.filter((p) => p.type === 'items');

  // Un `cat` qui ne désigne aucun groupe connu est un intitulé hérité :
  // il devient un groupe.
  const aCreer = new Map();
  items.forEach((it) => {
    const c = String(it.cat || '').trim();
    if (!c || codesConnus.has(c) || aCreer.has(c)) return;
    aCreer.set(c, codeDeGroupe(c));
  });

  // Les groupes déjà en base peuvent être antérieurs au numéro d'ordre : sans
  // ce rattrapage, ils resteraient à zéro et se rangeraient par ordre
  // alphabétique, non dans celui du programme. On numérote dans l'ordre où ils
  // figurent, qui est celui de leur création.
  const groupes = params.filter((p) => p.type === 'groupes');
  let rang = groupes.reduce((n, g) => Math.max(n, Number(g.ordre) || 0), 0);
  const aNumeroter = groupes.filter((g) => !Number(g.ordre));
  aNumeroter.forEach((g) => { rang += 1; g.ordre = rang; });

  if (!aCreer.size && !aNumeroter.length) return INCHANGE;

  [...aCreer.entries()].forEach(([libelle, code]) => {
    rang += 1;
    params.push({
      id: uid('par'), type: 'groupes', label: libelle, code,
      cat: '', description: '', ordre: rang, ponderation: null, actif: true,
    });
  });
  items.forEach((it) => {
    const code = aCreer.get(String(it.cat || '').trim());
    if (code) it.cat = code;
  });
  d.parametres = params;
  faits = aCreer.size + aNumeroter.length;
  return d;
  });
  return faits;
}

async function seed() {
  const existant = await load();
  if (Object.keys(existant).length) { await reprendreGroupes(); return; }
  const vide = {};
  COLLECTIONS.forEach((c) => { vide[c] = []; });

  const params = [];
  const ajouter = (type, label, extra) => params.push({
    id: uid('par'), type, label, code: '', cat: '', description: '',
    ordre: 0, ponderation: null, actif: true, ...(extra || {}),
  });
  EXPLOITANTS_DEFAUT.forEach((s) => ajouter('exploitants', s));
  STATUTS_DEFAUT.forEach((s) => ajouter('statuts', s));
  // Les cinq parties du programme SAFA deviennent les groupes d'items. Un
  // item retient le code de son groupe, non son intitulé : renommer un groupe
  // ne détache donc pas les items qui s'y rattachent.
  const groupes = new Map();
  ITEMS_SAFA.forEach(([, groupe]) => {
    if (!groupes.has(groupe)) groupes.set(groupe, codeDeGroupe(groupe));
  });
  [...groupes.entries()].forEach(([libelle, code], i) =>
    ajouter('groupes', libelle, { code, ordre: i + 1 }));
  ITEMS_SAFA.forEach(([code, groupe, label]) =>
    ajouter('items', label, { code, cat: groupes.get(groupe) }));
  CATEGORIES_DEFAUT.forEach(([code, label, p]) => ajouter('categories', label, { code, ponderation: p }));
  ACTIONS_DEFAUT.forEach(([code, label]) => ajouter('actions', label, { code }));
  vide.parametres = params;

  await save({ ...vide, createdAt: now() });
}

// Classes d'action du formulaire d'inspection (POI).
//
// Le formulaire papier en porte sept, de « aucun constat » à l'interdiction
// d'exploitation immédiate ; le paramétrage d'origine n'en connaissait que
// cinq. On complète, sans toucher à celles qui existent — un gestionnaire a pu
// les renommer.
const ACTIONS_POI = [
  ['0', 'Aucun constat'],
  ['3d', "Interdiction d'exploitation immédiate"],
];

async function completerActions() {
  let faits = 0;
  await transformer((d) => {
    const params = d.parametres || [];
    const connus = new Set(params.filter((p) => p.type === 'actions').map((p) => p.code));
    const aCreer = ACTIONS_POI.filter(([code]) => !connus.has(code));
    faits = aCreer.length;
    if (!faits) return INCHANGE;
    aCreer.forEach(([code, label]) => params.push({
      id: uid('par'), type: 'actions', label, code,
      cat: '', description: '', ordre: 0, ponderation: null, actif: true,
    }));
    d.parametres = params;
    return d;
  });
  return faits;
}

// Retrait du statut « En cours ».
// Le suivi d'un écart n'a que deux états qui comptent : ouvert, ou clos. Le
// troisième, intermédiaire, ne servait qu'à dire qu'on s'en occupait — ce que
// le plan d'actions correctives dit déjà. Les enregistrements qui le portaient
// repassent en « Ouvert ». Idempotente : sans rien à reprendre, elle ne
// réécrit pas le fichier.
const STATUT_RETIRE = 'En cours';
const STATUT_REPRIS = 'Ouvert';

async function retirerStatutEnCours() {
  let touches = 0;
  await transformer((d) => {
    touches = 0;
    const params = (d.parametres || []).filter((p) => {
      const aRetirer = p.type === 'statuts' && p.label === STATUT_RETIRE;
      if (aRetirer) touches += 1;
      return !aRetirer;
    });

    (d.ecarts || []).forEach((e) => {
      if (e.suivi === STATUT_RETIRE) { e.suivi = STATUT_REPRIS; touches += 1; }
    });
    (d.inspections || []).forEach((i) => {
      if (i.status === STATUT_RETIRE) { i.status = STATUT_REPRIS; touches += 1; }
    });

    if (!touches) return INCHANGE;
    d.parametres = params;
    return d;
  });
  return touches;
}

// Référence d'un formulaire d'inspection : POI-0001, POI-0002…
// Le compteur est persisté et ne redescend jamais : une référence libérée par
// une suppression n'est pas réattribuée.
//
// Une même suite pour les fiches et les inspections : une fiche donne la
// sienne à l'inspection qu'elle crée, et deux actes ne portent jamais le même
// numéro. Le plancher les relit donc toutes les deux — sans quoi un compteur
// perdu réattribuerait une référence déjà portée par une inspection.
const REF_POI = /^POI-(\d+)$/;
const numeroteRef = (rang) => `POI-${String(rang).padStart(4, '0')}`;

function plancherReferencePoi(d) {
  const plusHaut = (liste, champ) => (liste || []).reduce((n, x) => {
    const c = REF_POI.exec(String((x || {})[champ] || ''));
    return c ? Math.max(n, Number(c[1])) : n;
  }, 0);
  return Math.max(plusHaut(d.poi, 'reference'), plusHaut(d.inspections, 'poi_reference'));
}

// ── Allouer des références, dans l'état qu'on écrit ──
//
// Les deux allocateurs sont **purs** : ils avancent le compteur dans l'état en
// cours de transformation et rendent les références. Lire le compteur,
// l'incrémenter et réécrire en trois temps aurait donné la même référence `POI-42`
// à deux inspections parties ensemble — or elle désigne un acte d'autorité, et une
// requête entre États la cite.
//
// Les routes composent donc : la référence et l'acte qui la porte s'écrivent
// ensemble. `allouerReferencesPoi` en tire plusieurs d'un coup, pour un classeur
// importé — ligne à ligne, un import de plusieurs milliers d'écarts aurait
// réécrit le magasin à chaque tour.
const allouerReferencesPoi = (d, combien) => {
  if (!combien) return [];
  const debut = Math.max(Number(d.dernier_poi) || 0, plancherReferencePoi(d));
  d.dernier_poi = debut + combien;
  return Array.from({ length: combien }, (v, k) => numeroteRef(debut + k + 1));
};

const allouerReferencePoi = (d) => allouerReferencesPoi(d, 1)[0];

// ── Toute inspection porte sa référence ──
// Les inspections reprises d'un classeur n'en avaient que si le classeur en
// portait une : la plupart s'affichaient sans référence, et rien ne les
// désignait en une ligne — ni à l'écran, ni dans une requête entre États.
// Elles la reçoivent ici, les plus anciennes d'abord, pour que la suite des
// numéros suive celle des actes.
async function referencerInspections() {
  let faits = 0;
  await transformer((d) => {
  faits = 0;
  const sans = (d.inspections || []).filter((i) => !REF_POI.test(String(i.poi_reference || '')));
  if (!sans.length) return INCHANGE;
  let rang = Math.max(Number(d.dernier_poi) || 0, plancherReferencePoi(d));
  sans.sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))
    || String(a.date_creation || '').localeCompare(String(b.date_creation || '')));
  sans.forEach((i) => {
    rang += 1;
    i.poi_reference = numeroteRef(rang);
    // Référence donnée par le module : un classeur qui apporterait celle du
    // rapport papier prendra sa place.
    i.reference_auto = true;
  });
  d.dernier_poi = rang;
  faits = sans.length;
  return d;
  });
  return faits;
}

// ══════════════════════════════════════
//  Pays
// ══════════════════════════════════════
// Les 249 entités de la norme ISO 3166-1 : nom, bigramme, autorité de
// l'aviation civile et ses coordonnées, et l'appartenance à l'UEMOA. Les huit
// États membres arrivent renseignés ; les autres restent à compléter.
//
// Comme pour les aéroports, `seed()` ne rejouant pas sur une base existante,
// l'amorçage se fait ici, une fois, et se souvient de l'avoir fait.
async function seedPays() {
  let faits = 0;
  await transformer((d) => {
    faits = 0;
    if ((d.pays || []).length || d.pays_amorces) return INCHANGE;
    // eslint-disable-next-line global-require
    const reference = require('./pays-reference.json');
    d.pays = reference.map(([nom, iso2, aac, adresse, site, emails, uemoa]) => ({
      id: uid('pay'), nom, iso2, aac, adresse, site,
      emails: emails ? emails.split(',').map((e) => e.trim()).filter(Boolean) : [],
      uemoa: !!uemoa, actif: true,
    }));
    d.pays_amorces = now();
    faits = d.pays.length;
    return d;
  });
  return faits;
}

// ══════════════════════════════════════
//  Aéroports
// ══════════════════════════════════════
// Les plateformes des États du dispositif : pays, intitulé, code OACI et
// statut. Une cinquantaine de lignes — elles tiennent avec les autres données
// du module, à la différence de la nomenclature des aéronefs.
//
// `seed()` ne s'exécutant que sur une base absente, une base déjà créée n'aurait
// jamais d'aéroports : on les y ajoute ici. Idempotent — une liste déjà en
// place n'est pas retouchée, et un aéroport supprimé ne revient pas.
async function seedAeroports() {
  let faits = 0;
  await transformer((d) => {
    faits = 0;
    if ((d.aeroports || []).length || d.aeroports_amorces) return INCHANGE;
    // eslint-disable-next-line global-require
    const reference = require('./aeroports-reference.json');
    d.aeroports = reference.map(([pays, nom, code, statut]) => ({
      id: uid('apt'), pays, nom, code, statut, actif: true,
    }));
    // Marque posée une fois pour toutes : sans elle, une liste vidée à la main se
    // reconstituerait au démarrage suivant.
    d.aeroports_amorces = now();
    faits = d.aeroports.length;
    return d;
  });
  return faits;
}

// ══════════════════════════════════════
//  Nomenclature des aéronefs
// ══════════════════════════════════════
// Désignation OACI, modèle-variante, constructeur et État de conception. La
// liste est une donnée de référence : on la lit constamment, on l'écrit
// rarement. Elle vit donc à part des données d'exploitation, dans son propre
// fichier — une écriture d'inspection ne la réécrit pas.
//
// ── Première collection passée en base (ADR-002, jalon n° 9) ──
//
// Ces huit fonctions sont **asynchrones**, seules du module à l'être. Elles
// passent par `magasin` et non par `store` : selon la configuration, la
// nomenclature vit dans un fichier ou dans PostgreSQL, et rien ici ne change.
//
// Les trois écritures emploient `modifier`, non `load` puis `save`. La
// différence n'est pas de style : entre une lecture et une écriture séparées,
// une autre requête s'intercale désormais — ce qui ne pouvait pas arriver tant
// que le magasin était synchrone. Deux ajouts simultanés en perdraient un.

const aeronefs = async () => (await magasin.load('ramp_aeronefs', {})).aeronefs || [];

// Le geste atomique, exposé tel quel : une route qui doit **vérifier puis
// écrire** — un doublon, un compte d'usages — ne peut pas le faire en deux
// appels, l'un lisant l'état d'avant l'autre. Elle passe sa vérification ici.
const modifierAeronefs = (transformer) => magasin.modifier('ramp_aeronefs', {}, transformer);

// Amorçage depuis la nomenclature livrée avec le module. Idempotent : une
// liste déjà en place n'est pas retouchée — et le `modifier` garantit qu'un
// second amorçage lancé en même temps ne la double pas non plus.
async function seedAeronefs() {
  let poses = 0;
  await magasin.modifier('ramp_aeronefs', {}, (d) => {
    if ((d.aeronefs || []).length) return d;
    // eslint-disable-next-line global-require
    const reference = require('./aeronefs-reference.json');
    const liste = reference.map(([designation, modele, constructeur, etat]) => ({
      id: uid('aer'), designation, modele, constructeur, etat_conception: etat, actif: true,
    }));
    poses = liste.length;
    return { aeronefs: liste, createdAt: now() };
  });
  return poses;
}

async function getAeronef(id) {
  return (await aeronefs()).find((a) => a.id === id) || null;
}

async function insertAeronef(a) {
  await magasin.modifier('ramp_aeronefs', {}, (d) => ({
    ...d, aeronefs: (d.aeronefs || []).concat([a]),
  }));
  return a;
}

// Le patch s'applique **dans** la transformation, sur la version que la base
// vient de rendre : appliqué au dehors, il écraserait la modification d'un
// autre. `rendu` retient la ligne écrite, pour la rendre à l'appelant.
async function updateAeronef(id, patch) {
  let rendu = null;
  await magasin.modifier('ramp_aeronefs', {}, (d) => {
    const arr = (d.aeronefs || []).slice();
    const i = arr.findIndex((a) => a.id === id);
    if (i < 0) return d;
    arr[i] = { ...arr[i], ...patch };
    rendu = arr[i];
    return { ...d, aeronefs: arr };
  });
  return rendu;
}

async function removeAeronef(id) {
  let retire = false;
  await magasin.modifier('ramp_aeronefs', {}, (d) => {
    const arr = (d.aeronefs || []).filter((a) => a.id !== id);
    retire = arr.length !== (d.aeronefs || []).length;
    return retire ? { ...d, aeronefs: arr } : d;
  });
  return retire;
}

// Insertion groupée : une seule écriture pour tout un import. Ligne par ligne, un
// import de plusieurs milliers d'écarts aurait relu et réécrit le magasin à chaque
// tour — et, en base, autant d'allers-retours.
async function insertMany(entrees) {
  await transformer((d) => {
    Object.entries(entrees).forEach(([coll, items]) => {
      d[coll] = (d[coll] || []).concat(items);
    });
    return d;
  });
}

// Supprimer une inspection emporte ses écarts, comme le faisait la cascade
// déclarée au schéma Prisma. **Une seule transformation pour les deux
// collections** : entre deux écritures, les écarts d'une inspection disparue
// restaient lisibles et plus rien ne les rattachait.
async function removeInspection(id) {
  let ote = false;
  await transformer((d) => {
    const arr = d.inspections || [];
    const i = arr.findIndex((r) => r.id === id);
    ote = i >= 0;
    if (!ote) return INCHANGE;
    arr.splice(i, 1);
    d.ecarts = (d.ecarts || []).filter((e) => e.inspection_id !== id);
    return d;
  });
  return ote;
}

// Un fichier du dossier des fiches est-il encore désigné, par une fiche ou par
// un partage ? Un partage garde les pièces de la fiche telles qu'elles étaient
// — mais sous le même nom de fichier, sans copie. Effacer ce fichier parce que
// la fiche ne le désigne plus le retirait aussi à l'État destinataire, qui
// tombait sur « Fichier introuvable ». Un fichier ne s'efface donc que lorsque
// plus rien ne le désigne ; l'appelant retire d'abord la désignation.
async function fichierPoiDesigne(nom) {
  const cible = String(nom || '').split(/[\\/]/).pop();
  if (!cible) return false;
  const d = await load();
  const dans = (pieces) => (pieces || []).some((p) => String(p.fichier || '').split(/[\\/]/).pop() === cible);
  return (d.poi || []).some((p) => dans(p.pieces)) || (d.partages || []).some((pa) => dans(pa.pieces));
}

module.exports = {
  ...base,
  COLLECTIONS, FAMILLES, ETATS_INSPECTION, ETATS_CONTACT, codeDeGroupe,
  CATEGORIES_DEFAUT, seed, insertMany, removeInspection,
  fichierPoiDesigne,
  uid, now,
  seedAeronefs, aeronefs, modifierAeronefs, getAeronef, insertAeronef, updateAeronef, removeAeronef,
  seedAeroports, seedPays, completerActions, retirerStatutEnCours,
  allouerReferencePoi, allouerReferencesPoi, referencerInspections,
};
