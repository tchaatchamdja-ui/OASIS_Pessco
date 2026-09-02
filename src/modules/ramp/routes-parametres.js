// Module « Inspections d'aéronefs sur aire de trafic » — contexte, paramétrage,
// dépôt de fichiers et carnet de contacts.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const multipart = require('../../multipart');
const db = require('./store');
const R = require('./roles');
const vues = require('./vues');
const comptesPrestataire = require('../../comptes_prestataire');

// Les fichiers déposés vivent hors de data/ : ce sont des fichiers, pas des
// enregistrements.
const DOSSIER_DEPOTS = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'ramp',
);
const EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.doc', '.zip', '.png', '.jpg', '.jpeg'];
const TAILLE_MAX = 50 * 1024 * 1024;

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, loadConfig } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const admin = (req) => R.isAdmin(req.user, referentiels);
  const texte = (v) => String(v == null ? '' : v).trim();
  const norm = (v) => String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // ══════════════════════════════════════
  //  Contexte utilisateur
  // ══════════════════════════════════════

  const vueUtilisateur = (u) => ({
    id: u.username, username: u.username,
    nom: u.nom || '', prenom: u.prenom || '', email: u.email || '',
    role: u.role,
    role_ramp: R.roleRamp(u, referentiels),
    etats: R.etatsDe(u, referentiels),
    actif: u.active !== false, photo: u.photo || '',
  });

  // Bascule AAC / Prestataire : état courant, joint au contexte pour que la
  // barre supérieure affiche les boutons au bon endroit et dans le bon état.
  // Un compte prestataire n'a pas de bascule : il annonce seulement la vue
  // qu'il tient, et l'exploitant dont il voit les données.
  const etatVue = (req) => {
    const reel = req.userReel || req.user;
    const perimetre = req.vuePrestataire || null;
    // Le nom de l'organisme, qu'il ait ou non des inspections à son nom : un
    // compte prestataire doit lire à qui il appartient dès la barre.
    const nomPrestataire = (ids) => (referentiels.getAll().prestataires || [])
      .filter((p) => (ids || []).includes(p.id)).map((p) => p.nom).join(', ');
    // Les États membres de l'UEMOA, tels que le paramétrage « Pays » les
    // déclare : c'est parmi eux que le super-administrateur choisit le poste
    // d'AAC dont il veut voir l'écran.
    const membresUemoa = db.list('pays').filter((p) => p.uemoa && p.actif !== false)
      .map((p) => p.nom).sort((a, b) => a.localeCompare(b, 'fr'));
    const superadmin = reel.role === 'SUPERADMIN';
    const base = {
      vue: perimetre ? 'prestataire' : 'aac',
      origine: perimetre ? perimetre.origine : '',
      exploitants: perimetre ? perimetre.exploitants : [],
      prestataire_nom: perimetre ? nomPrestataire(perimetre.prestataires) : '',
      // Poste d'AAC tenu : réservé au super-administrateur.
      etat_aac: superadmin ? (vues.vueDe(reel.username).etat_aac || '') : '',
      etats_aac: superadmin ? (membresUemoa.length ? membresUemoa : db.ETATS_INSPECTION) : [],
    };
    // Bascule et gestion des droits : réservées à l'Autorité, quel que soit
    // l'écran regardé. Le rôle qui compte est celui du compte connecté, non
    // celui que la vue simule.
    base.gestion_droits = vues.ROLES_AAC.includes(reel.role);
    if (!vues.peutBasculer(reel)) {
      return { ...base, disponible: false, prestataire_id: (perimetre && perimetre.prestataires[0]) || '', prestataires: [] };
    }
    const active = vues.vueDe(reel.username);
    return {
      ...base,
      disponible: true,
      vue: active.vue,
      prestataire_id: active.prestataire_id || vues.prestataireParDefaut(),
      prestataires: (referentiels.getAll().prestataires || [])
        .map((p) => ({ id: p.id, nom: p.nom, trigramme: p.trigramme })),
    };
  };

  app.get(`${M}/context`, requireAuth, (req, res) => {
    res.json({
      user: vueUtilisateur(req.user),
      privilege: R.meilleurPrivilege(req.user, referentiels),
      etats_inspection: db.ETATS_INSPECTION,
      etats_contact: db.ETATS_CONTACT,
      vue: etatVue(req),
      // Ce que l'organisme a confié au compte : les écrans de la vue
      // Prestataire s'y règlent.
      droits_prestataire: R.estPrestataire(req.user)
        ? R.droitsDe(auth.findUser((req.userReel || req.user).username))
        : R.DROITS_PRESTATAIRE.map((d) => d.cle),
      // L'administrateur de l'organisme gère les comptes d'office.
      admin_prestataire: ((req.userReel || req.user) || {}).role === 'ADMIN_PRESTATAIRE',
    });
  });

  app.get(`${M}/moi`, requireAuth, (req, res) => res.json(vueUtilisateur(req.user)));

  app.get(`${M}/vue`, requireAuth, (req, res) => res.json(etatVue(req)));

  app.put(`${M}/vue`, requireAuth, (req, res) => {
    const reel = req.userReel || req.user;
    if (!vues.peutBasculer(reel)) return refuser(res, 'Bascule réservée au super-administrateur');
    const d = req.body || {};
    if (!vues.VUES.includes(d.vue)) return res.status(400).json({ error: 'Vue inconnue' });
    const prestataireId = d.vue === 'prestataire'
      ? (d.prestataire_id || vues.vueDe(reel.username).prestataire_id || vues.prestataireParDefaut())
      : '';
    if (d.vue === 'prestataire' && !prestataireId) {
      return res.status(400).json({ error: 'Aucun prestataire disponible pour la vue Prestataire' });
    }
    // Le prestataire choisi en barre supérieure doit exister : c'est lui qui
    // borne les données servies.
    if (prestataireId && !(referentiels.getAll().prestataires || []).some((p) => p.id === prestataireId)) {
      return res.status(400).json({ error: 'Prestataire inconnu' });
    }
    // Poste d'AAC : seul le super-administrateur en change, et seulement pour
    // un État membre. Passer en vue Prestataire le libère.
    const membres = db.list('pays').filter((p) => p.uemoa && p.actif !== false).map((p) => p.nom);
    const connus = membres.length ? membres : db.ETATS_INSPECTION;
    let etatAac = '';
    if (d.vue === 'aac' && reel.role === 'SUPERADMIN') {
      const demande = d.etat_aac === undefined
        ? vues.vueDe(reel.username).etat_aac : texte(d.etat_aac);
      if (demande && !connus.includes(demande)) {
        return res.status(400).json({ error: 'État membre inconnu' });
      }
      etatAac = demande;
    }
    vues.definirVue(reel.username, d.vue, prestataireId, etatAac);
    return res.json({ status: 'ok', vue: d.vue, prestataire_id: prestataireId, etat_aac: etatAac });
  });

  // ══════════════════════════════════════
  //  Mes utilisateurs — comptes rattachés à l'exploitant
  // ══════════════════════════════════════
  // Les routes vivent dans le socle (`src/comptes_prestataire.js`), partagées
  // avec les autres modules qui offrent cet écran. Le module n'en déclare que
  // ses libellés, ses droits et le champ où il les range.
  comptesPrestataire.register(app, deps, M, {
    module: R.MODULE,
    champDroits: 'droits_safa',
    droits: R.DROITS_PRESTATAIRE,
    roles: R,
    vueUtilisateur,
    now: db.now,
    libelles: {
      admin: 'Administrateur de l’exploitant',
      aideAdmin: 'Gère les comptes de l’organisme et ses échanges avec l’Autorité.',
      agent: 'Utilisateur de l’exploitant',
      aideAgent: 'Accède à ce que l’administrateur de l’organisme lui confie.',
      sansRattachement: 'Aucun exploitant rattaché au compte',
    },
  });

  // ══════════════════════════════════════
  //  Paramètres
  // ══════════════════════════════════════
  // Sept familles : États, exploitants, aéronefs, items SAFA, catégories
  // d'écart, actions SAFA et statuts de suivi.

  app.get(`${M}/parametres`, requireAuth, (req, res) => {
    const tous = db.list('parametres');
    // Le numéro d'ordre commande d'abord — c'est lui qui range les groupes
    // d'items à l'écran. À numéro égal, le code ou l'intitulé départage.
    const familles = {};
    db.FAMILLES.forEach((f) => {
      familles[f] = tous.filter((p) => p.type === f)
        .sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0)
          || String(a.code || a.label).localeCompare(String(b.code || b.label)));
    });
    res.json({ familles, modifiable: admin(req) });
  });

  app.post(`${M}/parametres`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const d = req.body || {};
    const type = texte(d.type);
    const label = texte(d.label);
    if (!db.FAMILLES.includes(type)) return res.status(400).json({ error: 'Famille inconnue' });
    if (!label) return res.status(400).json({ error: 'Libellé requis' });
    // Un groupe d'items porte un code technique dérivé de son intitulé : les
    // items le retiennent, si bien qu'un groupe renommé garde les siens.
    const code = type === 'groupes' ? db.codeDeGroupe(label) : texte(d.code);
    if (type === 'groupes') {
      if (!code) return res.status(400).json({ error: 'Intitulé inexploitable' });
      if (db.list('parametres').some((x) => x.type === 'groupes' && x.code === code)) {
        return res.status(400).json({ error: 'Un groupe porte déjà cet intitulé' });
      }
    }
    const p = {
      id: db.uid('par'), type, label, code,
      cat: texte(d.cat), description: texte(d.description),
      // Le numéro d'ordre range les groupes d'items à l'écran. Un nouveau
      // groupe se place en fin de liste tant qu'on ne lui en donne pas.
      ordre: Number(d.ordre) || 0,
      // La pondération ne vaut que pour les catégories : ailleurs elle
      // n'aurait pas de sens et resterait un champ mort à l'écran.
      ponderation: type === 'categories' ? (Number(d.ponderation) || 0) : null,
      // Un exploitant porte son pays de provenance et dit s'il a été certifié
      // dans un État membre de l'UEMOA.
      pays: type === 'exploitants' ? texte(d.pays) : '',
      uemoa: type === 'exploitants' ? !!d.uemoa : false,
      actif: true,
    };
    db.insert('parametres', p);
    res.status(201).json({ status: 'ok', id: p.id, code: p.code });
  });

  app.put(`${M}/parametres/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = db.get('parametres', req.params.id);
    if (!p) return res.status(404).json({ error: 'Paramètre non trouvé' });
    const d = req.body || {};
    const patch = {};
    if (d.label !== undefined) {
      if (!texte(d.label)) return res.status(400).json({ error: 'Libellé requis' });
      patch.label = texte(d.label);
    }
    // Le code d'un groupe ne suit pas son intitulé : les items déjà rattachés
    // le portent, et un renommage ne doit pas les détacher.
    if (d.code !== undefined && p.type !== 'groupes') patch.code = texte(d.code);
    if (d.cat !== undefined) patch.cat = texte(d.cat);
    if (d.description !== undefined) patch.description = texte(d.description);
    if (d.ordre !== undefined) patch.ordre = Number(d.ordre) || 0;
    if (d.ponderation !== undefined && p.type === 'categories') {
      patch.ponderation = Number(d.ponderation) || 0;
    }
    if (p.type === 'exploitants') {
      if (d.pays !== undefined) patch.pays = texte(d.pays);
      if (d.uemoa !== undefined) patch.uemoa = !!d.uemoa;
    }
    db.update('parametres', p.id, patch);
    res.json({ status: 'ok' });
  });

  // Désactiver plutôt que supprimer : un paramètre retiré des listes reste
  // lisible sur les inspections déjà importées qui le portent.
  app.put(`${M}/parametres/:id/actif`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = db.get('parametres', req.params.id);
    if (!p) return res.status(404).json({ error: 'Paramètre non trouvé' });
    db.update('parametres', p.id, { actif: !p.actif });
    res.json({ status: 'ok', actif: !p.actif });
  });

  app.delete(`${M}/parametres/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = db.get('parametres', req.params.id);
    if (!p) return res.status(404).json({ error: 'Paramètre non trouvé' });
    // Un paramètre encore porté par une inspection ou un écart ne se supprime
    // pas : la donnée deviendrait illisible. Il se désactive.
    const utilise = compterUsages(p);
    if (utilise) {
      return res.status(400).json({
        error: `Paramètre utilisé ${utilise} fois — désactivez-le plutôt que de le supprimer`,
      });
    }
    db.remove('parametres', p.id);
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Pays
  // ══════════════════════════════════════
  // Les 249 entités de l'ISO 3166-1, avec l'autorité de l'aviation civile du
  // pays et ses coordonnées. Deux cent cinquante lignes courtes : la liste part
  // entière et l'écran la filtre.

  app.get(`${M}/pays`, requireAuth, (req, res) => {
    const liste = db.list('pays').slice()
      .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
    res.json({ pays: liste, modifiable: admin(req) });
  });

  // Plusieurs adresses de contact par autorité : on accepte aussi bien un
  // tableau qu'une saisie séparée par des virgules, des points-virgules ou des
  // retours à la ligne.
  const listeEmails = (v) => (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,;\n]/))
    .map((e) => texte(e)).filter(Boolean);

  const champsPays = (d) => {
    const c = {};
    if (d.nom !== undefined) c.nom = texte(d.nom);
    if (d.iso2 !== undefined) c.iso2 = texte(d.iso2).toUpperCase();
    if (d.aac !== undefined) c.aac = texte(d.aac);
    if (d.adresse !== undefined) c.adresse = texte(d.adresse);
    if (d.site !== undefined) c.site = texte(d.site);
    if (d.emails !== undefined) c.emails = listeEmails(d.emails);
    if (d.uemoa !== undefined) c.uemoa = !!d.uemoa;
    return c;
  };

  const bigrammeValide = (v) => /^[A-Z]{2}$/.test(v);

  app.post(`${M}/pays`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = champsPays(req.body || {});
    if (!p.nom) return res.status(400).json({ error: 'Nom requis' });
    if (!p.iso2) return res.status(400).json({ error: 'Bigramme requis' });
    if (!bigrammeValide(p.iso2)) return res.status(400).json({ error: 'Bigramme : deux lettres attendues' });
    if (db.list('pays').some((x) => x.iso2 === p.iso2)) {
      return res.status(400).json({ error: `Le bigramme ${p.iso2} désigne déjà un pays` });
    }
    const cree = {
      id: db.uid('pay'), aac: '', adresse: '', site: '', emails: [], uemoa: false,
      ...p, actif: true,
    };
    db.insert('pays', cree);
    res.status(201).json({ status: 'ok', id: cree.id });
  });

  app.put(`${M}/pays/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = db.get('pays', req.params.id);
    if (!p) return res.status(404).json({ error: 'Pays non trouvé' });
    const patch = champsPays(req.body || {});
    if (patch.nom === '') return res.status(400).json({ error: 'Nom requis' });
    if (patch.iso2 !== undefined) {
      if (!bigrammeValide(patch.iso2)) return res.status(400).json({ error: 'Bigramme : deux lettres attendues' });
      if (db.list('pays').some((x) => x.id !== p.id && x.iso2 === patch.iso2)) {
        return res.status(400).json({ error: `Le bigramme ${patch.iso2} désigne déjà un pays` });
      }
    }
    db.update('pays', p.id, patch);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/pays/:id/actif`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = db.get('pays', req.params.id);
    if (!p) return res.status(404).json({ error: 'Pays non trouvé' });
    db.update('pays', p.id, { actif: p.actif === false });
    res.json({ status: 'ok', actif: p.actif === false });
  });

  app.delete(`${M}/pays/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const p = db.get('pays', req.params.id);
    if (!p) return res.status(404).json({ error: 'Pays non trouvé' });
    // Un pays cité par une inspection ne se supprime pas : la ligne
    // deviendrait illisible. Il se désactive.
    const utilise = db.list('inspections').filter((i) => i.pays === p.nom).length;
    if (utilise) {
      return res.status(400).json({
        error: `Pays cité par ${utilise} inspection(s) — désactivez-le plutôt`,
      });
    }
    db.remove('pays', p.id);
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Aéroports
  // ══════════════════════════════════════
  // Une cinquantaine de plateformes : la liste part entière, et l'écran la
  // filtre. Pas de pagination ici — ce serait servir moins de lignes qu'une
  // page n'en montre.

  app.get(`${M}/aeroports`, requireAuth, (req, res) => {
    const liste = db.list('aeroports').slice().sort((a, b) =>
      String(a.pays).localeCompare(String(b.pays), 'fr')
      || String(a.nom).localeCompare(String(b.nom), 'fr'));
    res.json({ aeroports: liste, modifiable: admin(req) });
  });

  const champsAeroport = (d) => ({
    pays: texte(d.pays),
    nom: texte(d.nom),
    code: texte(d.code).toUpperCase(),
    statut: texte(d.statut),
  });

  app.post(`${M}/aeroports`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = champsAeroport(req.body || {});
    if (!a.pays) return res.status(400).json({ error: 'Pays requis' });
    if (!a.nom) return res.status(400).json({ error: 'Intitulé requis' });
    // Le code OACI identifie la plateforme : deux aéroports ne le partagent pas.
    if (a.code && db.list('aeroports').some((x) => x.code === a.code)) {
      return res.status(400).json({ error: `Le code ${a.code} désigne déjà un aéroport` });
    }
    const cree = { id: db.uid('apt'), ...a, actif: true };
    db.insert('aeroports', cree);
    res.status(201).json({ status: 'ok', id: cree.id });
  });

  app.put(`${M}/aeroports/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = db.get('aeroports', req.params.id);
    if (!a) return res.status(404).json({ error: 'Aéroport non trouvé' });
    const d = req.body || {};
    const patch = {};
    ['pays', 'nom', 'code', 'statut'].forEach((k) => {
      if (d[k] === undefined) return;
      patch[k] = k === 'code' ? texte(d[k]).toUpperCase() : texte(d[k]);
    });
    if (patch.pays === '') return res.status(400).json({ error: 'Pays requis' });
    if (patch.nom === '') return res.status(400).json({ error: 'Intitulé requis' });
    if (patch.code && db.list('aeroports').some((x) => x.id !== a.id && x.code === patch.code)) {
      return res.status(400).json({ error: `Le code ${patch.code} désigne déjà un aéroport` });
    }
    db.update('aeroports', a.id, patch);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/aeroports/:id/actif`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = db.get('aeroports', req.params.id);
    if (!a) return res.status(404).json({ error: 'Aéroport non trouvé' });
    db.update('aeroports', a.id, { actif: a.actif === false });
    res.json({ status: 'ok', actif: a.actif === false });
  });

  app.delete(`${M}/aeroports/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = db.get('aeroports', req.params.id);
    if (!a) return res.status(404).json({ error: 'Aéroport non trouvé' });
    db.remove('aeroports', a.id);
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Nomenclature des aéronefs
  // ══════════════════════════════════════
  // Près de dix mille lignes : le filtrage se fait ici, et l'écran ne reçoit
  // qu'une page. Servir la liste entière tiendrait un mégaoctet à chaque
  // affichage, pour un écran qui n'en montre que quelques dizaines de lignes.

  const TAILLE_PAGE = 50;

  app.get(`${M}/aeronefs`, requireAuth, (req, res) => {
    const q = req.query || {};
    const cherche = norm(q.q);

    // Socle commun : ce que la recherche et l'état d'activité laissent passer,
    // avant que les trois listes déroulantes ne s'appliquent.
    let socle = db.aeronefs();
    if (q.actif === '1') socle = socle.filter((a) => a.actif !== false);
    if (q.actif === '0') socle = socle.filter((a) => a.actif === false);
    if (cherche) {
      socle = socle.filter((a) => norm(
        `${a.designation} ${a.modele} ${a.constructeur} ${a.etat_conception}`,
      ).includes(cherche));
    }

    const CRITERES = {
      designation: (a) => a.designation === q.designation,
      constructeur: (a) => a.constructeur === q.constructeur,
      etat: (a) => a.etat_conception === q.etat,
    };
    // `sauf` laisse un critère de côté : une liste déroulante ne se réduit pas
    // à sa propre sélection, sinon on ne pourrait plus en changer sans tout
    // remettre à zéro. Elle montre ce que les *autres* filtres laissent voir.
    const filtrer = (sauf) => Object.keys(CRITERES)
      .filter((k) => q[k] && k !== sauf)
      .reduce((l, k) => l.filter(CRITERES[k]), socle);

    let liste = filtrer(null);
    const valeurs = (sauf, champ) => [...new Set(filtrer(sauf).map((a) => a[champ]).filter(Boolean))]
      .sort((x, y) => String(x).localeCompare(String(y), 'fr'));

    liste = liste.slice().sort((a, b) =>
      String(a.designation).localeCompare(String(b.designation), 'fr')
      || String(a.modele).localeCompare(String(b.modele), 'fr'));

    // La pagination compte les désignations, non les lignes : une page ne doit
    // pas couper un groupe en deux.
    const designations = [...new Set(liste.map((a) => a.designation))];
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const pages = Math.max(1, Math.ceil(designations.length / TAILLE_PAGE));
    const retenues = new Set(designations.slice((page - 1) * TAILLE_PAGE, page * TAILLE_PAGE));

    res.json({
      lignes: liste.filter((a) => retenues.has(a.designation)),
      total: liste.length,
      total_designations: designations.length,
      page: Math.min(page, pages),
      pages,
      taille_page: TAILLE_PAGE,
      // Les facettes ne dépendent pas de la page affichée.
      designations: valeurs('designation', 'designation'),
      constructeurs: valeurs('constructeur', 'constructeur'),
      etats: valeurs('etat', 'etat_conception'),
      modifiable: admin(req),
    });
  });

  const champsAeronef = (d) => ({
    designation: texte(d.designation).toUpperCase(),
    modele: texte(d.modele),
    constructeur: texte(d.constructeur),
    etat_conception: texte(d.etat_conception),
  });

  // Correspondance modèle-variante → désignation OACI, pour les seuls
  // appareils que les inspections citent : les statistiques s'en servent pour
  // regrouper les inspections d'une même désignation.
  app.get(`${M}/aeronefs/correspondances`, requireAuth, (req, res) => {
    const cites = [...new Set(db.list('inspections').map((i) => i.aeronef).filter(Boolean))];
    const socle = db.aeronefs();
    const normal = (v) => String(v || '').trim().toUpperCase();
    const parDesignation = new Set(socle.map((a) => normal(a.designation)));
    const parModele = new Map();
    socle.forEach((a) => { if (!parModele.has(normal(a.modele))) parModele.set(normal(a.modele), a.designation); });

    const table = {};
    cites.forEach((valeur) => {
      const v = normal(valeur);
      if (parDesignation.has(v)) { table[valeur] = valeur; return; }
      if (parModele.has(v)) { table[valeur] = parModele.get(v); return; }
      // À défaut, la racine du modèle : « B737-800 » se range sous « B737 ».
      const racine = v.split(/[-/ ]/)[0];
      table[valeur] = parDesignation.has(racine) ? racine : valeur;
    });
    res.json({ correspondances: table });
  });

  app.post(`${M}/aeronefs`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = champsAeronef(req.body || {});
    if (!a.designation) return res.status(400).json({ error: 'Désignation requise' });
    if (!a.modele) return res.status(400).json({ error: 'Modèle-variante requis' });
    // La nomenclature ne porte pas deux fois le même appareil : désignation,
    // modèle et constructeur l'identifient.
    const existe = db.aeronefs().some((x) => x.designation === a.designation
      && x.modele === a.modele && x.constructeur === a.constructeur);
    if (existe) return res.status(400).json({ error: 'Cet aéronef figure déjà dans la nomenclature' });
    const cree = db.insertAeronef({ id: db.uid('aer'), ...a, actif: true });
    res.status(201).json({ status: 'ok', id: cree.id });
  });

  app.put(`${M}/aeronefs/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = db.getAeronef(req.params.id);
    if (!a) return res.status(404).json({ error: 'Aéronef non trouvé' });
    const d = req.body || {};
    const patch = {};
    ['designation', 'modele', 'constructeur', 'etat_conception'].forEach((k) => {
      if (d[k] === undefined) return;
      patch[k] = k === 'designation' ? texte(d[k]).toUpperCase() : texte(d[k]);
    });
    if (patch.designation === '') return res.status(400).json({ error: 'Désignation requise' });
    if (patch.modele === '') return res.status(400).json({ error: 'Modèle-variante requis' });
    db.updateAeronef(a.id, patch);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/aeronefs/:id/actif`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = db.getAeronef(req.params.id);
    if (!a) return res.status(404).json({ error: 'Aéronef non trouvé' });
    db.updateAeronef(a.id, { actif: a.actif === false });
    res.json({ status: 'ok', actif: a.actif === false });
  });

  app.delete(`${M}/aeronefs/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const a = db.getAeronef(req.params.id);
    if (!a) return res.status(404).json({ error: 'Aéronef non trouvé' });
    // Un appareil cité par une inspection ne se supprime pas : la ligne
    // deviendrait illisible. Il se désactive.
    const utilise = db.list('inspections')
      .filter((i) => i.aeronef === a.designation || i.aeronef === a.modele).length;
    if (utilise) {
      return res.status(400).json({
        error: `Aéronef cité par ${utilise} inspection(s) — désactivez-le plutôt`,
      });
    }
    db.removeAeronef(a.id);
    res.json({ status: 'ok' });
  });

  function compterUsages(p) {
    const inspections = db.list('inspections');
    const ecarts = db.list('ecarts');
    // Un groupe n'est pas porté par une inspection mais par des items : c'est
    // eux qu'il faut compter, sans quoi on supprimerait le groupe sous eux.
    if (p.type === 'groupes') {
      return db.list('parametres').filter((x) => x.type === 'items' && x.cat === p.code).length;
    }
    if (p.type === 'exploitants') return inspections.filter((i) => i.exploitant === p.label).length;
    if (p.type === 'statuts') return inspections.filter((i) => i.status === p.label).length;
    if (p.type === 'items') return ecarts.filter((e) => e.itemCode === p.code).length;
    if (p.type === 'categories') return ecarts.filter((e) => e.categorie === p.code).length;
    if (p.type === 'actions') return ecarts.filter((e) => e.action === p.code).length;
    return 0;
  }

  // ══════════════════════════════════════
  //  Dépôt de fichiers
  // ══════════════════════════════════════
  // Les États déposent ici leurs relevés mensuels. Le déposant et le
  // gestionnaire modifient ou retirent ; le coordonnateur régional consulte.

  const peutModifierDepot = (req, d) => admin(req) || d.depose_par === req.user.username;
  const peutTelecharger = (req, d) => peutModifierDepot(req, d)
    || R.roleRamp(req.user, referentiels) === 'Coordonnateur Régional';

  app.get(`${M}/depots`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, 'Hors de la vue Prestataire');
    res.json(db.list('depots').slice()
      .sort((a, b) => String(b.depose_le || '').localeCompare(String(a.depose_le || ''))));
  });

  app.post(`${M}/depots`, requireAuth, multipart(), (req, res) => {
    if (!R.canContribute(req.user)) return refuser(res, 'Non autorisé à déposer');
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const d = req.body || {};
    const nom = texte(d.nom);
    const annee = texte(d.annee);
    const mois = texte(d.mois);
    if (!nom || !annee || !mois) {
      return res.status(400).json({ error: 'Nom, année et mois sont obligatoires' });
    }
    const ext = path.extname(f.filename || '').toLowerCase();
    if (!EXTENSIONS.includes(ext)) return res.status(400).json({ error: 'Type de fichier non autorisé' });
    if (f.buffer.length > TAILLE_MAX) return res.status(400).json({ error: 'Fichier trop volumineux (50 Mo maximum)' });

    fs.mkdirSync(DOSSIER_DEPOTS, { recursive: true });
    const surDisque = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_DEPOTS, surDisque), f.buffer);

    const depot = {
      id: db.uid('dep'), nom, annee, mois,
      nom_origine: f.filename, fichier: surDisque, taille: f.buffer.length,
      depose_par: req.user.username, depose_le: db.now(),
    };
    db.insert('depots', depot);
    res.status(201).json({ status: 'ok', id: depot.id });
  });

  app.put(`${M}/depots/:id`, requireAuth, (req, res) => {
    const dep = db.get('depots', req.params.id);
    if (!dep) return res.status(404).json({ error: 'Dépôt introuvable' });
    if (!peutModifierDepot(req, dep)) return refuser(res, 'Seul le déposant ou le gestionnaire modifie ce dépôt');
    const d = req.body || {};
    db.update('depots', dep.id, {
      nom: texte(d.nom) || dep.nom,
      annee: texte(d.annee) || dep.annee,
      mois: texte(d.mois) || dep.mois,
    });
    res.json({ status: 'ok' });
  });

  app.delete(`${M}/depots/:id`, requireAuth, (req, res) => {
    const dep = db.get('depots', req.params.id);
    if (!dep) return res.status(404).json({ error: 'Dépôt introuvable' });
    if (!peutModifierDepot(req, dep)) return refuser(res, 'Seul le déposant ou le gestionnaire supprime ce dépôt');
    const chemin = path.join(DOSSIER_DEPOTS, path.basename(dep.fichier || ''));
    if (dep.fichier && fs.existsSync(chemin)) fs.unlinkSync(chemin);
    db.remove('depots', dep.id);
    res.json({ status: 'ok' });
  });

  app.get(`${M}/depots/:id/fichier`, requireAuth, (req, res) => {
    const dep = db.get('depots', req.params.id);
    if (!dep) return res.status(404).json({ error: 'Dépôt introuvable' });
    if (!peutTelecharger(req, dep)) return refuser(res, 'Téléchargement non autorisé');
    const chemin = path.join(DOSSIER_DEPOTS, path.basename(dep.fichier || ''));
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    res.setHeader('Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(dep.nom_origine || dep.fichier)}`);
    res.sendFile(chemin);
  });

  // ══════════════════════════════════════
  //  Carnet de contacts
  // ══════════════════════════════════════
  // Les correspondants de chaque État. Un coordonnateur national ne tient que
  // le carnet du sien.

  app.get(`${M}/contacts`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, 'Hors de la vue Prestataire');
    res.json(db.list('contacts').slice().sort((a, b) =>
      String(a.etat || '').localeCompare(String(b.etat || ''))
      || String(a.nom || '').localeCompare(String(b.nom || ''))));
  });

  const champsContact = (d) => ({
    etat: texte(d.etat), nom: texte(d.nom), prenom: texte(d.prenom),
    email: texte(d.email), telephone: texte(d.telephone),
    fonction: texte(d.fonction), autres: texte(d.autres),
  });

  app.post(`${M}/contacts`, requireAuth, (req, res) => {
    const c = champsContact(req.body || {});
    if (!c.etat || !c.nom || !c.prenom) {
      return res.status(400).json({ error: 'État, nom et prénoms sont obligatoires' });
    }
    if (!R.couvreEtat(req.user, referentiels, c.etat)) {
      return refuser(res, `Vous ne gérez pas les contacts de « ${c.etat} »`);
    }
    const contact = {
      id: db.uid('con'), ...c, actif: true,
      cree_par: req.user.username, date_creation: db.now(),
    };
    db.insert('contacts', contact);
    res.status(201).json({ status: 'ok', id: contact.id });
  });

  app.put(`${M}/contacts/:id`, requireAuth, (req, res) => {
    const contact = db.get('contacts', req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact non trouvé' });
    const c = champsContact({ ...contact, ...(req.body || {}) });
    if (!c.etat || !c.nom || !c.prenom) {
      return res.status(400).json({ error: 'État, nom et prénoms sont obligatoires' });
    }
    // Les deux États comptent : celui d'où le contact part, et celui où il va.
    if (!R.couvreEtat(req.user, referentiels, contact.etat)
      || !R.couvreEtat(req.user, referentiels, c.etat)) {
      return refuser(res, 'Contact hors de votre périmètre');
    }
    db.update('contacts', contact.id, c);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/contacts/:id/actif`, requireAuth, (req, res) => {
    const contact = db.get('contacts', req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact non trouvé' });
    if (!R.couvreEtat(req.user, referentiels, contact.etat)) {
      return refuser(res, 'Contact hors de votre périmètre');
    }
    db.update('contacts', contact.id, { actif: !contact.actif });
    res.json({ status: 'ok', actif: !contact.actif });
  });

  app.delete(`${M}/contacts/:id`, requireAuth, (req, res) => {
    const contact = db.get('contacts', req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact non trouvé' });
    if (!admin(req) && !R.couvreEtat(req.user, referentiels, contact.etat)) {
      return refuser(res, 'Contact hors de votre périmètre');
    }
    db.remove('contacts', contact.id);
    res.json({ status: 'ok' });
  });
};
