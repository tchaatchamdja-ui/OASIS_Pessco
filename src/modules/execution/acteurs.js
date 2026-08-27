// Module « Exécution de la Surveillance » — acteurs déclarés au menu Processus.
//
// Le menu Processus dit, secteur par secteur, qui intervient à chaque étape.
// Ce fichier en tire deux services :
//   • informer   — la liste lisible des intervenants attendus à une étape ;
//   • restreindre — le contrôle « ce compte est-il l'un d'eux ? ».
//
// Deux garde-fous gouvernent tout le reste :
//   1. Rien de déclaré, rien de restreint. Sans processus applicable, ou sans
//      acteur déclaré à l'étape, le privilège de « Gestion des Droits » reste
//      seul juge. Un paramétrage incomplet ne doit jamais bloquer le circuit.
//   2. Le gestionnaire du module passe outre. C'est la porte de sortie quand
//      un processus est mal renseigné ou qu'un intervenant est absent.
const referentiels = require('../../referentiels');
const db = require('./store');
const R = require('./roles');

const refs = () => referentiels.getAll();

// Processus applicable : celui du secteur d'abord, celui du domaine à défaut.
// Un processus sans portée sert de modèle général pour son type.
function processusDe(type, secteurId, domaineId) {
  const liste = db.list('processus').filter((p) => p.type === type && p.actif !== 0);
  return liste.find((p) => p.secteur_id && p.secteur_id === secteurId)
    || liste.find((p) => !p.secteur_id && p.domaine_id && p.domaine_id === domaineId)
    || liste.find((p) => !p.secteur_id && !p.domaine_id)
    || null;
}

// Acteurs déclarés pour une clé d'étape. Une sous-étape muette hérite de son
// étape : déclarer « Validation » couvre ses sous-étapes tant qu'on ne les a
// pas détaillées.
function entreesDe(proc, cle) {
  if (!proc || !proc.acteurs) return [];
  const direct = proc.acteurs[cle];
  if (Array.isArray(direct) && direct.length) return direct;
  const parent = String(cle).split(':')[0];
  const herite = proc.acteurs[parent];
  return (parent !== cle && Array.isArray(herite)) ? herite : [];
}

const compteDeLInspecteur = (id) => {
  const i = (refs().inspecteurs || []).find((x) => x.id === id);
  if (!i) return '';
  return i.user_id || i.email || '';
};

const nomDeLInspecteur = (id) => {
  const i = (refs().inspecteurs || []).find((x) => x.id === id);
  return i ? (`${i.prenom || ''} ${i.nom || ''}`.trim() || i.nom || '') : '';
};

// Poste de l'organigramme : le titulaire, et l'intérimaire quand l'intérim
// est actif — l'intérim existe précisément pour que l'étape reste franchie.
function comptesDuPoste(posteId) {
  const o = (refs().organisation || []).find((x) => x.id === posteId);
  if (!o) return { comptes: [], noms: [] };
  const ids = [o.titulaire_id];
  if (o.interim_actif && o.interim_id) ids.push(o.interim_id);
  const valides = ids.filter(Boolean);
  return {
    comptes: valides.map(compteDeLInspecteur).filter(Boolean),
    noms: valides.map(nomDeLInspecteur).filter(Boolean),
  };
}

// Équipe de l'activité : elle est constituée au dossier, pas au processus.
// `role` vide vise toute l'équipe.
function comptesDeLEquipe(dossier, role) {
  let equipe = (dossier || {}).realisation_equipe || [];
  if (typeof equipe === 'string') { try { equipe = JSON.parse(equipe); } catch { equipe = []; } }
  const membres = (Array.isArray(equipe) ? equipe : [])
    .map((m) => (typeof m === 'string' ? { nom: m, role: '' } : m))
    .filter((m) => !role || m.role === role);
  const inspecteurs = refs().inspecteurs || [];
  const comptes = membres.map((m) => {
    const i = inspecteurs.find((x) => `${x.prenom || ''} ${x.nom || ''}`.trim() === String(m.nom || '').trim());
    return i ? (i.user_id || i.email || '') : '';
  }).filter(Boolean);
  return { comptes, noms: membres.map((m) => m.nom).filter(Boolean) };
}

const LIBELLES_ROLE = {
  responsable_activite: 'Responsable d’activité',
  validateur: 'Validateur',
  gestionnaire: 'Gestionnaire',
  hierarchie: 'Responsable hiérarchique',
  equipe_audit: 'Équipe d’audit / inspection',
  contributeur: 'Contributeur',
  observateur: 'Observateur',
  autre: 'Autre acteur',
};

// Ce que l'étape attend, sous deux formes : les comptes qui peuvent agir, et
// la description lisible qu'on affiche à l'écran.
function attendus(type, contexte, cle) {
  const proc = processusDe(type, contexte.secteur_id, contexte.domaine_id);
  const entrees = entreesDe(proc, cle);
  if (!entrees.length) return { processus: proc, declare: false, comptes: [], lignes: [] };

  const comptes = new Set();
  const lignes = entrees.map((a) => {
    const role = a.role_libre || LIBELLES_ROLE[a.role] || a.role || '';
    if (a.role === 'hierarchie') {
      const { comptes: c, noms } = comptesDuPoste(a.poste_id);
      c.forEach((x) => comptes.add(x));
      return { role, cible: a.poste_nom || '—', personnes: noms };
    }
    if (a.role === 'equipe_audit') {
      const { comptes: c, noms } = comptesDeLEquipe(contexte.dossier, a.role_equipe);
      c.forEach((x) => comptes.add(x));
      return {
        role,
        cible: a.role_equipe_nom || a.role_equipe || 'Toute l’équipe',
        personnes: noms,
      };
    }
    const compte = compteDeLInspecteur(a.acteur_id);
    if (compte) comptes.add(compte);
    return { role, cible: a.acteur_nom || '', personnes: a.acteur_nom ? [a.acteur_nom] : [] };
  });

  return { processus: proc, declare: true, comptes: [...comptes], lignes };
}

// Le contrôle. `null` = rien à opposer ; sinon, le motif du refus.
function refusEventuel(user, type, contexte, cle) {
  // Le gestionnaire du module passe outre : sans cette porte, un processus
  // incomplet arrêterait le circuit sans recours applicatif.
  if (R.isAdmin(user, referentiels)) return null;
  const a = attendus(type, contexte, cle);
  if (!a.declare) return null;
  // Aucun compte résolu : le processus nomme des rôles sans titulaire connu.
  // On n'oppose rien — la désignation est incomplète, pas l'agent en faute.
  if (!a.comptes.length) return null;
  if (a.comptes.includes(user.username)) return null;
  const qui = a.lignes.map((l) => `${l.role}${l.cible ? ` (${l.cible})` : ''}`).join(', ');
  return `Étape réservée aux intervenants désignés au processus : ${qui}`;
}

module.exports = { processusDe, entreesDe, attendus, refusEventuel, LIBELLES_ROLE };
