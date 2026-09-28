// Module « Inspections d'aéronefs sur aire de trafic » (RAMP) — D.8
//
// Reprise intégrale de l'application RAMP (Express + Prisma/PostgreSQL + React),
// posée sur le socle OASIS : authentification et sessions, droits par
// domaine/secteur (espace RAMP), journal d'audit, stockage JSON.
//
// Ce que le socle reprend à sa charge, et que le module ne redéploie donc pas :
//   · comptes, mots de passe, sessions et écran de connexion (RAMP portait son
//     propre modèle `User`, son JWT et sa page de login) ;
//   · rôles : les trois rôles RAMP se déduisent du privilège RAMP (roles.js) ;
//   · journal d'audit : le modèle `AuditLog` de RAMP est remplacé par le
//     journal du socle, qui trace déjà les appels aux préfixes du module ;
//   · thème, langue et coquille de module.
//
// Routes groupées par objet :
//   1. paramètres   — contexte, sept familles de paramètres, dépôts, contacts
//   2. inspections  — inspections et écarts
//   3. échanges     — lecture et écriture des classeurs Excel
const auth = require('../../auth');
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const db = require('./store');
const vues = require('./vues');

const M = '/api/m/ramp';

module.exports = {
  register(app, deps) {
    // Chaque route s'authentifie par `requireAuth`, qui repose `req.user` : la
    // vue active (AAC / Prestataire) s'applique donc juste après, sur chaque
    // route, et non une seule fois en amont.
    const depsVue = { ...deps, requireAuth: [deps.requireAuth, vues.middleware] };

    require('./routes-parametres')(app, depsVue, M);
    require('./routes-poi')(app, depsVue, M);
    require('./routes-echanges')(app, depsVue, M);
    require('./routes-inspections')(app, depsVue, M);
    require('./routes-communication')(app, depsVue, M);

    if (deps.services) {
      // Le profil de risque d'un exploitant ne passe pas par le bus. Ce module
      // publiait « RAMP.ecartsParExploitant » — inspections, items, écarts et
      // score pondéré, exploitant par exploitant — à l'intention du module
      // « Profil de Risque », qui ne l'a jamais consommé : son objet est le
      // prestataire surveillé de l'État, non l'exploitant étranger contrôlé sur
      // aire de trafic. Le profil de risque des inspections RAMP sera tenu ici,
      // où les données sont, et n'aura rien à demander à personne.
      //
      // Ce que le module publie tient donc en deux contrats, tous deux servis
      // aux « Mesures d'Application », plus le volume par instance que le socle
      // demande avant de supprimer une instance.
      deps.services.publish('RAMP.volumeParInstance', () => {
        const parInstance = {};
        ['inspections', 'poi'].forEach((coll) => {
          db.list(coll).forEach((r) => {
            const i = r.instance || '';
            parInstance[i] = (parInstance[i] || 0) + 1;
          });
        });
        return parInstance;
      }, { description: 'Nombre d’enregistrements du module, par instance' });

      // Un écart de catégorie 3 est un manquement grave relevé sur aire de
      // trafic : il appelle une mesure d'application, au même titre qu'une
      // constatation critique de la surveillance. Le module le publie sous le
      // même contrat que « SURV.constatationsOuvertes » — les Mesures
      // d'Application n'ont donc rien à savoir de RAMP pour l'instruire, et
      // fonctionnent aussi bien si ce module n'est pas déployé.
      deps.services.publish('RAMP.constatationsCritiques', () => {
        const inspections = new Map(db.list('inspections').map((i) => [i.id, i]));
        // L'AAC qui a relevé l'écart est celle qui instruira la mesure : la
        // carence part sous l'instance de son inspection, et les « Mesures
        // d'Application » la rangent sous la même plutôt que sous la leur.
        const instanceDeLInspection = vues.resolveurInstance(deps.loadConfig);
        // Rapprochement de l'exploitant, en deux temps.
        //
        // 1. La liste des exploitants du module le nomme, dit son pays et son
        //    appartenance à l'UEMOA. Une inspection ne garde que le libellé
        //    saisi ; c'est cette liste qui en donne la forme canonique.
        // 2. Le référentiel du portail l'identifie — mais seulement s'il est
        //    prestataire de l'État : la plupart des exploitants contrôlés sur
        //    aire de trafic sont étrangers et n'y figurent pas. Le consommateur
        //    reçoit donc toujours le nom, et l'identifiant quand il existe.
        //
        // La clé de rapprochement ignore la casse, les accents et la
        // ponctuation : « Air Côte d'Ivoire » et « Air Cote d Ivoire »
        // désignent le même exploitant.
        const norm = (v) => String(v || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();

        const parExploitant = new Map();
        db.list('parametres')
          .filter((p) => p.type === 'exploitants' && p.label)
          .forEach((p) => parExploitant.set(norm(p.label), p));
        // Libellés des items du programme : l'objet d'un écart, c'est l'item
        // contrôlé — son code et son intitulé, rien d'autre.
        const items = new Map(db.list('parametres')
          .filter((p) => p.type === 'items')
          .map((p) => [p.code, p.label]));
        const parCle = new Map();
        (referentiels.getAll().prestataires || []).forEach((p) => {
          if (p.nom) parCle.set(norm(p.nom), p.id);
          if (p.trigramme) parCle.set(norm(p.trigramme), p.id);
        });
        return db.list('ecarts')
          .filter((ec) => String(ec.categorie) === '3')
          .map((ec) => {
            const i = inspections.get(ec.inspection_id) || {};
            const solde = /clôtur|cloture|soldé|solde/i.test(String(ec.suivi || ''));
            const exploitant = parExploitant.get(norm(i.exploitant)) || {};
            return {
              id: `ramp:${ec.id}`,
              instance: instanceDeLInspection(i),
              reference: `${i.poi_reference || i.id || ''}${ec.itemCode ? ` · ${ec.itemCode}` : ''}`,
              titre: [ec.itemCode, items.get(ec.itemCode)].filter(Boolean).join(' — '),
              description: ec.description || '',
              prestataire_id: parCle.get(norm(i.exploitant)) || '',
              // Le libellé de la liste des exploitants fait foi : deux
              // orthographes d'un même exploitant se rejoignent sous un seul
              // nom. À défaut, celui que l'inspection a saisi.
              prestataire_nom: exploitant.label || i.exploitant || '',
              exploitant_pays: exploitant.pays || '',
              exploitant_uemoa: !!exploitant.uemoa,
              domaine_id: '',
              // Catégorie 3 SAFA : la plus grave des trois, d'où « critique ».
              criticite: 'critique',
              statut: solde ? 'soldee' : 'ouverte',
              date_ouverture: i.date || '',
              date_due_cloture: '',
              origine: 'RAMP',
              inspection_id: ec.inspection_id,
              immatriculation: i.immatriculation || '',
              action: ec.action || '',
            };
          });
      }, {
        description: 'Écarts RAMP de catégorie 3, appelant une mesure d’application',
      });

      // Plan d'actions correctives déposé sur un écart, publié sous le même
      // contrat que celui de « Exécution de la Surveillance ». Les clés sont
      // celles des carences servies plus haut — « ramp:<écart> » — pour que le
      // consommateur rapproche l'un de l'autre sans rien savoir d'ici.
      deps.services.publish('RAMP.pacDeConstatation', () => {
        const parConstatation = {};
        db.list('ecarts').forEach((ec) => {
          const pac = ec.pac || {};
          const preuves = (ec.preuves || []).map((p) => ({
            intitule: p.intitule || p.nom_origine || '',
            depose_le: p.depose_le || '',
            commentaire: p.commentaire || '',
            action: p.action || '',
          }));
          if (!pac.soumis_le && !preuves.length && !pac.cause_primaire) return;
          parConstatation[`ramp:${ec.id}`] = {
            cause_primaire: pac.cause_primaire || '',
            action_curative: pac.action_curative || '',
            curative_date_prevue: pac.curative_date_prevue || '',
            actions_correctives: pac.actions_correctives || '',
            corrective_date_prevue: pac.corrective_date_prevue || '',
            statut: ec.suivi || '',
            date_soumission: pac.soumis_le || '',
            date_validation: pac.cloture_le || '',
            motif_rejet: pac.motif_rejet || '',
            preuves,
          };
        });
        return parConstatation;
      }, {
        description: 'Plan d’actions correctives déposé sur un écart, par carence',
        retour: '{ "ramp:<ecart_id>": { cause_primaire, action_curative, actions_correctives, statut, preuves[] } }',
      });
    }
  },

  // Asynchrone depuis que la nomenclature des aéronefs est en base : c'est le
  // seul amorçage du module qui passe par le réseau (ADR-002, jalon n° 9).
  async seed() {
    db.seed();
    await db.seedAeronefs();
    db.seedAeroports();
    db.seedPays();
    db.completerActions();
    // Le statut « En cours » a été retiré : les données déjà saisies le
    // portent encore, et repassent en « Ouvert ».
    db.retirerStatutEnCours();
    // Toute inspection porte une référence POI-xxxx. Celles reprises d'un
    // classeur qui n'en portait pas la reçoivent ici, une fois.
    db.referencerInspections();
    // Un module fraîchement installé n'a encore aucun droit attribué : sans
    // amorce, le privilège par défaut (Lecteur) empêcherait quiconque — y
    // compris le super-administrateur — d'importer la première inspection et
    // donc d'attribuer les droits depuis l'application. On ne touche qu'aux
    // comptes SUPERADMIN, et seulement s'ils n'ont pas déjà été paramétrés.
    auth.getUsers()
      .filter((u) => u.role === 'SUPERADMIN' && moduleRights.getRights('RAMP', u.username).isDefault)
      .forEach((u) => moduleRights.setRights('RAMP', u.username, {
        privilege: 'GESTIONNAIRE', scopes: [],
        updatedAt: new Date().toISOString(), updatedBy: 'installation',
      }));
  },
};
