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
      // Ce que le module tient par instance : le portail s'en sert pour
      // savoir si une instance peut être supprimée sans rien perdre.
      // Les quatre contrats sont asynchrones depuis que `execution` vit en base
      // (ADR-002, jalon n° 13) : le bus rend une promesse par contrat, et PLAN
      // comme CARE les attendent depuis l'étape A.
      deps.services.publish('SURV.volumeParInstance', async () => {
        const parInstance = {};
        const rangs = await Promise.all(['notifications', 'dossiers', 'constatations', 'rapports']
          .map((coll) => db.list(coll)));
        rangs.flat().forEach((r) => {
          const i = r.instance || '';
          parInstance[i] = (parInstance[i] || 0) + 1;
        });
        return parInstance;
      }, { description: 'Nombre d’enregistrements du module, par instance' });

      deps.services.publish('SURV.activitesDeclenchees', async () => (await db.list('notifications'))
        .map((n) => n.activite_id)
        .filter(Boolean), {
        description: 'Identifiants des activités pour lesquelles une notification existe',
      });

      // Les Mesures d'Application se prennent sur une constatation. Elles
      // n'ont pas besoin du dossier entier : la référence, le prestataire, la
      // criticité et l'échéance suffisent à les instruire.
      // ── Pourquoi `listTout` et non `list` ──
      //
      // Une constatation retirée par la surveillance **reste servie ici**, avec sa
      // marque. Les « Mesures d'Application » ont pu prononcer une sanction sur
      // elle : lui cacher le fondement de sa propre décision serait le pire des
      // deux maux — la mesure s'afficherait sans objet, et personne ne saurait
      // pourquoi. Le consommateur reçoit donc la carence et l'information qu'elle
      // a été retirée, à lui d'en tirer ce qu'il doit.
      deps.services.publish('SURV.constatationsOuvertes', async () => (await db.listTout('constatations'))
        .filter((c) => !String(c.statut || '').startsWith('direct_'))
        .map((c) => ({
          id: c.id,
          // Retirée par la surveillance : la carence n'est plus poursuivie à la
          // source, mais ce qui a été bâti dessus garde son fondement.
          retire_le: c.retire_le || '',
          // L'instance qui a relevé la carence : les Mesures d'Application la
          // rangent sous la même, plutôt que de la donner à la leur.
          instance: c.instance || '',
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

      // Plan d'actions correctives soumis par le prestataire. Les Mesures
      // d'Application en ont besoin pour décider de la suite à donner : on ne
      // classe pas une carence sans avoir lu ce que l'organisme propose. Le
      // contrat est le même que celui de « RAMP Inspections » — le
      // consommateur n'a donc pas à savoir d'où vient la carence.
      // `listTout` pour la même raison : le plan d'actions correctives d'une
      // carence retirée reste lisible par qui a bâti dessus.
      deps.services.publish('SURV.pacDeConstatation', async () => {
        const parConstatation = {};
        (await db.listTout('constatations')).forEach((c) => {
          const pac = (c.actions_correctives || [])[0];
          if (!pac) return;
          const preuve = (p) => ({
            intitule: p.intitule || p.filename || p.nom_origine || '',
            depose_le: p.date || p.depose_le || '',
            commentaire: p.commentaire || '',
          });
          parConstatation[c.id] = {
            cause_primaire: pac.cause_primaire || '',
            action_curative: pac.action_curative || '',
            curative_date_prevue: pac.curative_date_prevue || '',
            actions_correctives: pac.actions_correctives || '',
            corrective_date_prevue: pac.corrective_date_prevue || '',
            statut: c.statut || '',
            date_soumission: c.date_soumission_pac || '',
            date_validation: c.date_validation_pac || '',
            motif_rejet: c.motif_rejet_pac || '',
            preuves: [
              ...(pac.curative_preuves || []).map((p) => ({ ...preuve(p), action: 'curative' })),
              ...(pac.corrective_preuves || []).map((p) => ({ ...preuve(p), action: 'corrective' })),
            ],
          };
        });
        return parConstatation;
      }, {
        description: 'Plan d’actions correctives soumis, par constatation',
        retour: '{ <constatation_id>: { cause_primaire, action_curative, actions_correctives, statut, preuves[] } }',
      });
    }
  },

  async seed() {
    await db.seed();
    // Un module fraîchement installé n'a encore aucun droit attribué : sans
    // amorce, le privilège par défaut (Lecteur) empêcherait quiconque — y
    // compris le super-administrateur — d'ouvrir le premier acte et donc
    // d'attribuer les droits depuis l'application. On ne touche qu'aux
    // comptes SUPERADMIN, et seulement s'ils n'ont pas déjà été paramétrés.
    // En série : chaque pose relit la table, et `Promise.all` les ferait se
    // heurter sur la même collection pour rien — ils sont trois ou quatre.
    for (const u of auth.getUsers()
      .filter((x) => x.role === 'SUPERADMIN' && moduleRights.getRights(R.MODULE, x.username).isDefault)) {
      await moduleRights.setRights(R.MODULE, u.username, {
        privilege: 'GESTIONNAIRE', scopes: [],
        updatedAt: new Date().toISOString(), updatedBy: 'installation',
      });
    }
  },
};
