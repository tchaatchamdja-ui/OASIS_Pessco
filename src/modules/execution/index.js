// Module « Exécution de la Surveillance » (SURV) — D.7.1
//
// Reprise intégrale du module homonyme de PESSCO, posée sur le socle OASIS :
// authentification et sessions, droits par domaine/secteur (espace SURV),
// référentiels partagés, journal d'audit, stockage JSON. Les activités à
// exécuter proviennent du module Planification via le bus de services
// (`PLAN.plansValides`) : aucun accès direct à ses données.
//
// Les routes sont regroupées par processus métier, dans l'ordre du circuit :
//   1. notifications  — déclenchement, échanges, accord du prestataire
//   2. dossiers       — réalisation, rédaction, constatations FNC/PAC
//   3. rapports       — validation, signatures, transmission, tableau de bord
//   4. paramètres     — checklists, criticités, types de cas, comptes
//   5. états          — délais du processus, archivage, rappels
const auth = require('../../auth');
const moduleRights = require('../../module_rights');
const db = require('./store');
const R = require('./roles');
const vues = require('./vues');

const M = '/api/m/execution';

module.exports = {
  register(app, deps) {
    // Chaque route du module s'authentifie via `requireAuth`, qui repose
    // `req.user` : la vue active (AAC / Prestataire) doit donc s'appliquer
    // juste après, sur chaque route, et non une seule fois en amont.
    const depsVue = { ...deps, requireAuth: [deps.requireAuth, vues.middleware] };

    require('./routes-parametres')(app, depsVue, M);
    require('./routes-notifications')(app, depsVue, M);
    require('./routes-dossiers')(app, depsVue, M);
    require('./routes-rapports')(app, depsVue, M);
    require('./routes-etats')(app, depsVue, M);

    // Une activité déclenchée ne se réécrit plus : Plans de Surveillance
    // interroge ce service pour verrouiller, lors d'un amendement, les lignes
    // dont le circuit a déjà commencé ici.
    if (deps.services) {
      deps.services.publish('SURV.activitesDeclenchees', () => db.list('notifications')
        .map((n) => n.activite_id)
        .filter(Boolean), {
        description: 'Identifiants des activités pour lesquelles une notification existe',
      });

      // Les Mesures d'Application se prennent sur une constatation. Elles
      // n'ont pas besoin du dossier entier : la référence, le prestataire, la
      // criticité et l'échéance suffisent à les instruire.
      deps.services.publish('SURV.constatationsOuvertes', () => db.list('constatations')
        .filter((c) => !String(c.statut || '').startsWith('direct_'))
        .map((c) => ({
          id: c.id,
          reference: c.reference || '',
          titre: c.cas_type || c.titre || '',
          description: c.description || '',
          prestataire_id: c.prestataire_id || '',
          domaine_id: c.domaine_id || '',
          criticite: c.criticite || c.gravite || '',
          statut: c.statut || '',
          date_ouverture: c.date_ouverture || '',
          date_due_cloture: c.date_due_cloture || c.date_due || '',
        })), {
        description: 'Constatations opposables au prestataire (hors circuit direct en cours)',
      });
    }
  },

  seed() {
    db.seed();
    // Un module fraîchement installé n'a encore aucun droit attribué : sans
    // amorce, le privilège par défaut (Lecteur) empêcherait quiconque — y
    // compris le super-administrateur — d'ouvrir le premier acte et donc
    // d'attribuer les droits depuis l'application. On ne touche qu'aux
    // comptes SUPERADMIN, et seulement s'ils n'ont pas déjà été paramétrés.
    auth.getUsers()
      .filter((u) => u.role === 'SUPERADMIN' && moduleRights.getRights(R.MODULE, u.username).isDefault)
      .forEach((u) => moduleRights.setRights(R.MODULE, u.username, {
        privilege: 'GESTIONNAIRE', scopes: [],
        updatedAt: new Date().toISOString(), updatedBy: 'installation',
      }));
  },
};
