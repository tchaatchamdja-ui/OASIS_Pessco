// Module « Exécution de la Surveillance » — bascule Vue AAC / Vue Prestataire.
//
// Le module sert deux publics : l'autorité (AAC), qui conduit la surveillance,
// et le prestataire, qui reçoit les notifications et répond aux constatations.
// Le front distingue les deux par le rôle M3 de l'utilisateur.
//
// Pour recetter et démontrer le côté prestataire sans créer de compte dédié,
// le super-administrateur peut basculer de vue. La bascule n'est pas cosmétique :
// le middleware ci-dessous présente le super-administrateur aux routes comme un
// utilisateur prestataire rattaché au prestataire choisi, de sorte que les
// mêmes cloisonnements de données s'appliquent — on voit exactement ce que
// verrait ce prestataire.
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const db = require('./store');
const { MODULE } = require('./roles');

const VUES = ['aac', 'prestataire'];

// Seul le super-administrateur dispose de la bascule.
const peutBasculer = (user) => !!user && user.role === 'SUPERADMIN';

function vueDe(username) {
  const rec = db.get('vues', username);
  if (!rec || !VUES.includes(rec.vue)) return { vue: 'aac', prestataire_id: '' };
  return { vue: rec.vue, prestataire_id: rec.prestataire_id || '' };
}

function definirVue(username, vue, prestataireId) {
  const rec = {
    id: username,
    vue: VUES.includes(vue) ? vue : 'aac',
    prestataire_id: prestataireId || '',
    date_maj: db.now(),
  };
  if (db.get('vues', username)) db.update('vues', username, rec);
  else db.insert('vues', rec);
  return vueDe(username);
}

// Prestataire retenu par défaut : le premier actif, pour que la bascule
// fonctionne sans réglage préalable.
function prestataireParDefaut() {
  const liste = referentiels.getAll().prestataires || [];
  const actif = liste.find((p) => p.statut !== 'inactif') || liste[0];
  return actif ? actif.id : '';
}

// Middleware : applique la vue active à la requête. `req.user` n'est jamais
// modifié en place — c'est l'enregistrement partagé du cache utilisateurs.
// `req.userReel` conserve le compte réellement connecté : c'est lui, et non
// la vue simulée, qui décide du droit de basculer.
// `prestataires` porte le périmètre complet ; `prestataire_id` en garde le
// premier élément, valeur par défaut des formulaires du front repris de PESSCO.
const enPrestataire = (req, liste, origine) => {
  req.user = { ...req.user, role: 'PRESTATAIRE', prestataire_id: liste[0] || '', prestataires: liste };
  req.vuePrestataire = { prestataires: liste, origine };
};

function middleware(req, res, next) {
  req.userReel = req.user;

  // Privilège « Prestataire » attribué dans Gestion des Droits : le compte
  // travaille en permanence dans le périmètre des prestataires retenus en
  // portée. Aucune portée renseignée = aucun accès aux données du module.
  if (moduleRights.getRights(MODULE, req.user.username).privilege === 'PRESTATAIRE') {
    enPrestataire(req, moduleRights.prestatairesDuScope(MODULE, req.user.username), 'privilege');
    return next();
  }

  // Compte prestataire du portail : périmètre limité à son rattachement.
  if (req.user.role === 'PRESTATAIRE') {
    enPrestataire(req, req.user.prestataire_id ? [req.user.prestataire_id] : [], 'compte');
    return next();
  }

  if (!peutBasculer(req.user)) return next();
  const active = vueDe(req.user.username);
  if (active.vue !== 'prestataire') return next();
  const prestataireId = active.prestataire_id || prestataireParDefaut();
  if (!prestataireId) return next();
  enPrestataire(req, [prestataireId], 'bascule');
  next();
}

module.exports = { VUES, peutBasculer, vueDe, definirVue, prestataireParDefaut, middleware };
