// Module « Inspections d'aéronefs sur aire de trafic » (SAFA) — D.8
//
// Reprise intégrale de l'application RAMP (Express + Prisma/PostgreSQL + React),
// posée sur le socle OASIS : authentification et sessions, droits par
// domaine/secteur (espace SAFA), journal d'audit, stockage JSON.
//
// Ce que le socle reprend à sa charge, et que le module ne redéploie donc pas :
//   · comptes, mots de passe, sessions et écran de connexion (RAMP portait son
//     propre modèle `User`, son JWT et sa page de login) ;
//   · rôles : les trois rôles RAMP se déduisent du privilège SAFA (roles.js) ;
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

    // Le poids des écarts relevés sur aire de trafic, exploitant par
    // exploitant. Le Profil de Risque s'en saisira sans lire les données d'ici.
    if (deps.services) {
      deps.services.publish('SAFA.volumeParInstance', () => {
        const parInstance = {};
        ['inspections', 'poi'].forEach((coll) => {
          db.list(coll).forEach((r) => {
            const i = r.instance || '';
            parInstance[i] = (parInstance[i] || 0) + 1;
          });
        });
        return parInstance;
      }, { description: 'Nombre d’enregistrements du module, par instance' });

      deps.services.publish('SAFA.ecartsParExploitant', () => {
        const inspections = new Map(db.list('inspections').map((i) => [i.id, i]));
        const ponderations = {};
        db.list('parametres')
          .filter((p) => p.type === 'categories')
          .forEach((p) => { ponderations[p.code] = Number(p.ponderation) || 0; });

        const parExploitant = {};
        db.list('inspections').forEach((i) => {
          const e = i.exploitant || 'Inconnu';
          if (!parExploitant[e]) parExploitant[e] = { inspections: 0, items: 0, ecarts: 0, score: 0 };
          parExploitant[e].inspections += 1;
          parExploitant[e].items += Number(i.itemsInspectes) || 0;
        });
        db.list('ecarts').forEach((ec) => {
          const i = inspections.get(ec.inspection_id);
          if (!i) return;
          const e = i.exploitant || 'Inconnu';
          if (!parExploitant[e]) parExploitant[e] = { inspections: 0, items: 0, ecarts: 0, score: 0 };
          parExploitant[e].ecarts += 1;
          parExploitant[e].score += ponderations[ec.categorie] === undefined ? 1 : ponderations[ec.categorie];
        });
        // Le score brut ne dit rien seul : dix écarts sur mille items pèsent
        // moins que dix sur cent. C'est le score rapporté aux items qui compte.
        Object.values(parExploitant).forEach((v) => {
          v.score_normalise = v.items > 0 ? Number((v.score / v.items).toFixed(4)) : 0;
        });
        return parExploitant;
      }, {
        description: 'Écarts SAFA par exploitant : inspections, items, écarts et score normalisé',
      });

      // Un écart de catégorie 3 est un manquement grave relevé sur aire de
      // trafic : il appelle une mesure d'application, au même titre qu'une
      // constatation critique de la surveillance. Le module le publie sous le
      // même contrat que « SURV.constatationsOuvertes » — les Mesures
      // d'Application n'ont donc rien à savoir de RAMP pour l'instruire, et
      // fonctionnent aussi bien si ce module n'est pas déployé.
      deps.services.publish('SAFA.constatationsCritiques', () => {
        const inspections = new Map(db.list('inspections').map((i) => [i.id, i]));
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
              id: `safa:${ec.id}`,
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
              origine: 'SAFA',
              inspection_id: ec.inspection_id,
              immatriculation: i.immatriculation || '',
              action: ec.action || '',
            };
          });
      }, {
        description: 'Écarts SAFA de catégorie 3, appelant une mesure d’application',
      });

      // Plan d'actions correctives déposé sur un écart, publié sous le même
      // contrat que celui de « Exécution de la Surveillance ». Les clés sont
      // celles des carences servies plus haut — « safa:<écart> » — pour que le
      // consommateur rapproche l'un de l'autre sans rien savoir d'ici.
      deps.services.publish('SAFA.pacDeConstatation', () => {
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
          parConstatation[`safa:${ec.id}`] = {
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
        retour: '{ "safa:<ecart_id>": { cause_primaire, action_curative, actions_correctives, statut, preuves[] } }',
      });
    }
  },

  seed() {
    db.seed();
    db.seedAeronefs();
    db.seedAeroports();
    db.seedPays();
    db.completerActions();
    // Le statut « En cours » a été retiré : les données déjà saisies le
    // portent encore, et repassent en « Ouvert ».
    db.retirerStatutEnCours();
    // Un module fraîchement installé n'a encore aucun droit attribué : sans
    // amorce, le privilège par défaut (Lecteur) empêcherait quiconque — y
    // compris le super-administrateur — d'importer la première inspection et
    // donc d'attribuer les droits depuis l'application. On ne touche qu'aux
    // comptes SUPERADMIN, et seulement s'ils n'ont pas déjà été paramétrés.
    auth.getUsers()
      .filter((u) => u.role === 'SUPERADMIN' && moduleRights.getRights('SAFA', u.username).isDefault)
      .forEach((u) => moduleRights.setRights('SAFA', u.username, {
        privilege: 'GESTIONNAIRE', scopes: [],
        updatedAt: new Date().toISOString(), updatedBy: 'installation',
      }));
  },
};
