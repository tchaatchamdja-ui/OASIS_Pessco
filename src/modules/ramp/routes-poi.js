// Module « Inspections d'aéronefs sur aire de trafic » — formulaire d'inspection.
//
// Le « Proof of Inspection » (POI) est la fiche que l'inspecteur remplit sur
// l'aire de trafic : un en-tête qui identifie le vol et l'appareil, les 54
// items du programme SAFA cochés un à un, et pour chacun un constat éventuel.
//
// Jusqu'ici les inspections n'entraient qu'importées d'un classeur. Le POI les
// fait naître dans l'outil : tant qu'il est en brouillon il ne produit rien ;
// une fois validé, il écrit l'inspection et ses écarts — c'est-à-dire ce que
// les états et les statistiques lisent. Le formulaire reste conservé, verrouillé,
// comme pièce justificative de ce qui a été relevé.
//
// Le circuit compte trois étapes, comme celui des activités du module
// « Exécution de la Surveillance » :
//
//   Soumission    l'inspecteur remplit la fiche, puis la soumet
//   Validation    le valideur l'accepte — l'inspection et ses écarts naissent —
//                 ou la renvoie à son auteur
//   Transmission  la fiche part chez l'exploitant ; les preuves se figent
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const auth = require('../../auth');
const courriel = require('../../email');
const multipart = require('../../multipart');
const db = require('./store');
const R = require('./roles');
const instances = require('../../instances');

// Les preuves recueillies sur l'aire de trafic — photographies, copies de
// documents — vivent hors de data/ : ce sont des fichiers, pas des
// enregistrements.
const DOSSIER_PIECES = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'ramp', 'poi',
);
const EXTENSIONS_PIECES = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic',
  '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.zip'];
const TAILLE_PIECE_MAX = 25 * 1024 * 1024;

// Référentiels d'inspection du formulaire papier : ICAO, constructeur,
// national. Ils ne varient pas d'un État à l'autre — d'où leur place ici,
// et non dans les paramètres du module.
const STANDARDS = [
  { code: 'I', label: 'OACI' },
  { code: 'M', label: 'Constructeur' },
  { code: 'N', label: 'National' },
];

const TYPES_EXPLOITATION = [
  'Transport aérien commercial (Annexe 6 Partie I)',
  'Aviation générale (Annexe 6 Partie II)',
  'Exploitation d’hélicoptères (Annexe 6 Partie III)',
];

const CONFIGURATIONS = ['Passagers', 'Fret', 'Mixte'];
const TYPES_INSPECTION = ['SAFA', 'SANA'];

// Champs de l'en-tête. Tous du texte : c'est une fiche, pas un formulaire de
// saisie comptable, et l'inspecteur doit pouvoir écrire ce qu'il constate.
// Inspecteurs retenus sur la fiche : identifiant et libellés figés au moment
// du choix — le référentiel peut changer, la fiche dit qui a inspecté ce jour-là.
const CHAMPS_INSPECTEUR = ['id', 'nom', 'prenom', 'numero', 'specialite', 'niveau'];

const CHAMPS_ENTETE = ['date', 'heure_debut', 'heure_fin', 'place', 'etat_inspection',
  'autorite', 'exploitant', 'aoc', 'type_inspection', 'type_exploitation', 'etat_exploitant',
  'route_depuis', 'vol_depuis', 'route_vers', 'vol_vers', 'affreteur', 'etat_affreteur',
  'aeronef', 'immatriculation', 'numero_construction', 'etat_licences', 'etat_licences_2',
  'configuration'];

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;

  // Instance regardée : une fiche d'inspection appartient à l'AAC qui l'a
  // ouverte, comme l'inspection qui en naîtra.
  const instanceCourante = (req) => instances.courante(req.userReel || req.user, loadConfig);
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const texte = (v) => String(v == null ? '' : v).trim();
  const admin = (req) => R.isAdmin(req.user, referentiels);

  const items = () => db.list('parametres').filter((p) => p.type === 'items' && p.actif !== false);

  // Un POI ne se lit que dans son périmètre : un coordonnateur national voit
  // les fiches de son État, les autres profils voient tout.
  const dansPerimetre = (req, p) =>
    R.couvreEtat(req.user, referentiels, (p.entete || {}).etat_inspection || '');

  // Les pièces se modifient tant que la fiche n'est pas partie chez
  // l'exploitant : après, elles font partie de ce qui lui a été notifié et ne
  // se retouchent plus.
  const piecesFigees = (p) => !!p.transmis_le;

  const vuePiece = (pj) => ({
    id: pj.id, intitule: pj.intitule, commentaire: pj.commentaire,
    nom_origine: pj.nom_origine, taille: pj.taille,
    depose_par: pj.depose_par, depose_le: pj.depose_le,
  });

  // Vue de liste : l'en-tête et les compteurs suffisent, les 54 items ne
  // servent qu'à l'ouverture d'une fiche.
  const resume = (p) => ({
    id: p.id,
    reference: p.reference,
    statut: p.statut,
    entete: p.entete,
    controles: Object.values(p.items || {}).filter((i) => i.controle).length,
    ecarts: Object.values(p.items || {}).filter((i) => i.ecart && i.ecart.categorie).length,
    classe_action: p.classe_action || '',
    inspecteurs: p.inspecteurs || '',
    equipe: p.equipe || [],
    cree_par: p.cree_par,
    cree_le: p.cree_le,
    valide_par: p.valide_par || '',
    valide_par_nom: nomAffiche(p.valide_par),
    valide_le: p.valide_le || '',
    soumis_par: p.soumis_par || '',
    soumis_par_nom: nomAffiche(p.soumis_par),
    transmis_par_nom: nomAffiche(p.transmis_par),
    commentaires: (p.commentaires || []).length,
    soumis_le: p.soumis_le || '',
    renvoye_le: p.renvoye_le || '',
    motif_renvoi: p.motif_renvoi || '',
    etape: etapeDe(p),
    inspection_id: p.inspection_id || '',
    pieces: (p.pieces || []).length,
    communications: (p.communications || []).length,
    transmis_le: p.transmis_le || '',
    transmis_a: p.transmis_a || '',
  });

  // Le formulaire ne retient que les items connus du paramétrage : c'est lui
  // qui fait foi, et un item retiré des paramètres ne doit pas ressurgir.
  function normaliserItems(brut) {
    const connus = new Map(items().map((i) => [i.code, i]));
    const propres = {};
    Object.keys(brut || {}).forEach((code) => {
      if (!connus.has(code)) return;
      const v = brut[code] || {};
      const e = v.ecart || {};
      const categorie = texte(e.categorie);
      propres[code] = {
        controle: !!v.controle,
        remarque: texte(v.remarque),
        // Un constat n'existe que par sa catégorie : sans elle, la description
        // est une simple remarque et ne deviendra pas un écart.
        ecart: categorie ? {
          categorie,
          standard: texte(e.standard),
          description: texte(e.description),
          action: texte(e.action),
          // Statut de suivi du constat : l'exploitant l'a-t-il soldé avant la
          // fin de l'inspection ? Les valeurs viennent du paramétrage.
          suivi: texte(e.suivi),
        } : null,
      };
    });
    return propres;
  }

  const corpsPoi = (d) => {
    const entete = {};
    CHAMPS_ENTETE.forEach((k) => { entete[k] = texte((d.entete || {})[k]); });
    return {
      entete,
      items: normaliserItems(d.items),
      classe_action: texte(d.classe_action),
      statut_suivi: texte(d.statut_suivi),
      inspecteurs: texte(d.inspecteurs),
      equipe: (Array.isArray(d.equipe) ? d.equipe : []).map((m) => {
        const propre = {};
        CHAMPS_INSPECTEUR.forEach((k) => { propre[k] = texte(m[k]); });
        return propre;
      }).filter((m) => m.nom || m.prenom || m.numero),
      commentaires_pic: texte(d.commentaires_pic),
      informations: texte(d.informations),
    };
  };

  // Une fiche transmise ne se modifie plus, quel qu'en soit le contenu.
  const transmise = (p) => !!p.transmis_le;

  // Le nom d'un compte, tel qu'on l'écrit sur une fiche : « KOFFI Ama » plutôt
  // que « a.koffi@anac.bj ». On cherche d'abord au personnel de l'AAC, puis
  // aux comptes du socle ; à défaut, l'identifiant reste, faute de mieux.
  function nomAffiche(username) {
    const id = texte(username);
    if (!id) return '';
    const refs = referentiels.getAll();
    const p = (refs.inspecteurs || []).find((i) => i.user_id === id || i.email === id);
    if (p && (p.nom || p.prenom)) return `${texte(p.nom)} ${texte(p.prenom)}`.trim();
    const u = auth.getUsers().find((x) => x.username === id);
    if (u) {
      const nom = `${texte(u.nom)} ${texte(u.prenom)}`.trim() || texte(u.fullName);
      if (nom) return nom;
    }
    return id;
  }

  // Personnel AAC déclaré inspecteur et actif, avec ses libellés en clair.
  function inspecteursActifs() {
    const refs = referentiels.getAll();
    const specialites = new Map((refs.specialites_inspecteur || []).map((s) => [s.id, s.libelle]));
    const niveaux = new Map((refs.niveaux_qualifications || []).map((n) => [n.id, n.libelle]));
    const clair = (v, table) => (table.get(v) || texte(v));
    return (refs.inspecteurs || [])
      // « est_inspecteur » distingue, dans le personnel de l'AAC, ceux qui
      // inspectent. Une fiche qui ne porte pas la mention est un inspecteur :
      // le champ est venu après, et le référentiel n'a longtemps listé qu'eux.
      .filter((i) => !/^(non|false|0)$/i.test(String(i.est_inspecteur || ''))
        && String(i.statut || 'actif').toLowerCase() === 'actif')
      .map((i) => ({
        id: i.id,
        nom: texte(i.nom),
        prenom: texte(i.prenom),
        numero: texte(i.numero_inspecteur),
        // La spécialité tient dans un champ libre chez les uns, dans une liste
        // d'identifiants chez les autres : on rend les deux.
        specialite: [texte(i.specialite), ...(i.specialites || []).map((s) => clair(s, specialites))]
          .filter(Boolean).join(' · '),
        niveau: clair(i.niveau_qualification, niveaux),
        email: texte(i.email),
      }))
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
  }

  // Étape courante du circuit, telle que le fil d'avancement l'affiche.
  const etapeDe = (p) => {
    if (transmise(p)) return 'transmise';
    if (p.statut === 'validee') return 'transmission';
    if (p.statut === 'soumis') return 'validation';
    return 'soumission';
  };

  // ══════════════════════════════════════
  //  Lecture
  // ══════════════════════════════════════

  app.get(`${M}/poi/contexte`, requireAuth, (req, res) => {
    // Tout ce que le formulaire met dans ses listes déroulantes vient d'ici :
    // les items et les catégories du paramétrage, les exploitants, les
    // aéroports, les pays, la nomenclature des aéronefs. Un seul appel, pour
    // que l'écran s'ouvre d'un coup.
    const params = db.list('parametres');
    const actifs = (type) => params.filter((p) => p.type === type && p.actif !== false)
      .sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0)
        || String(a.code || a.label).localeCompare(String(b.code || b.label)));
    const groupes = actifs('groupes');
    res.json({
      groupes: groupes.map((g) => ({ code: g.code, label: g.label, description: g.description || '' })),
      items: actifs('items').map((i) => ({ code: i.code, label: i.label, groupe: i.cat, description: i.description || '' })),
      categories: actifs('categories').map((c) => ({ code: c.code, label: c.label, ponderation: c.ponderation })),
      actions: actifs('actions').map((a) => ({ code: a.code, label: a.label })),
      statuts: actifs('statuts').map((s) => s.label),
      exploitants: actifs('exploitants').map((e) => e.label),
      standards: STANDARDS,
      types_exploitation: TYPES_EXPLOITATION,
      types_inspection: TYPES_INSPECTION,
      configurations: CONFIGURATIONS,
      etats_inspection: db.ETATS_INSPECTION.filter((e) => R.couvreEtat(req.user, referentiels, e)),
      pays: db.list('pays').filter((p) => p.actif !== false)
        .map((p) => p.nom).sort((a, b) => a.localeCompare(b, 'fr')),
      // L'autorité de surveillance de chaque État, avec ses adresses : la
      // communication écrite lui est adressée sans ressaisie.
      autorites: db.list('pays').filter((p) => p.actif !== false && (p.aac || (p.emails || []).length))
        .map((p) => ({ pays: p.nom, aac: p.aac || '', emails: p.emails || [], site: p.site || '' })),
      aeroports: db.list('aeroports').filter((a) => a.actif !== false)
        .map((a) => ({ pays: a.pays, nom: a.nom, code: a.code })),
      // Les inspecteurs viennent du référentiel du portail (Personnel AAC) :
      // seuls ceux marqués inspecteurs et actifs. Spécialités et niveaux y
      // sont des identifiants — on les rend en clair, l'écran n'a pas à
      // connaître les référentiels du socle.
      inspecteurs: inspecteursActifs(),
      aeronefs: [...new Set(db.aeronefs().filter((a) => a.actif !== false).map((a) => a.designation))]
        .sort((a, b) => String(a).localeCompare(String(b), 'fr')),
      peut_saisir: R.canContribute(req.user),
    });
  });

  app.get(`${M}/poi`, requireAuth, (req, res) => {
    const liste = instances.filtrer(db.list('poi'), instanceCourante(req), loadConfig)
      .filter((p) => dansPerimetre(req, p))
      .sort((a, b) => String(b.cree_le || '').localeCompare(String(a.cree_le || '')));
    res.json({ poi: liste.map(resume), peut_saisir: R.canContribute(req.user) });
  });

  app.get(`${M}/poi/:id`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    res.json({
      ...p,
      cree_par_nom: nomAffiche(p.cree_par),
      soumis_par_nom: nomAffiche(p.soumis_par),
      valide_par_nom: nomAffiche(p.valide_par),
      transmis_par_nom: nomAffiche(p.transmis_par),
      commentaires: (p.commentaires || []).map((v) => ({
        ...v, cree_par_nom: nomAffiche(v.cree_par), close_par_nom: nomAffiche(v.close_par),
      })),
      // L'écran nomme l'expéditeur d'une notification ; l'identifiant ne dit
      // rien à qui relit la fiche.
      communications: (p.communications || []).map((c) => ({
        ...c, envoye_par_nom: nomAffiche(c.envoye_par),
      })),
      // Le valideur écrit ses observations tant que la fiche est chez lui.
      commentaires_modifiables: R.canValidate(req.user) && p.statut === 'soumis',
    });
  });

  // ══════════════════════════════════════
  //  Commentaires de validation
  // ══════════════════════════════════════
  // Le valideur annote la fiche champ par champ avant de trancher. Ses
  // observations vivent par versions : celle en cours se modifie jusqu'à la
  // validation ou le renvoi, qui la ferment ; le tour suivant en ouvre une
  // nouvelle. Rien ne s'écrase — l'inspecteur retrouve ce qui lui a été
  // demandé à chaque passage.

  const versionCourante = (p) => (p.commentaires || []).find((v) => !v.close_le) || null;

  app.put(`${M}/poi/:id/commentaires`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canValidate(req.user)) return refuser(res, 'Réservé au valideur du module');
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    if (p.statut !== 'soumis') {
      return res.status(400).json({
        error: 'Les commentaires ne se saisissent que sur une fiche soumise à validation',
      });
    }
    const entrees = (Array.isArray((req.body || {}).entrees) ? req.body.entrees : [])
      .map((e) => ({ cible: texte(e.cible), texte: texte(e.texte) }))
      .filter((e) => e.texte);

    const versions = (p.commentaires || []).slice();
    const ouverte = versionCourante(p);
    if (ouverte) {
      ouverte.entrees = entrees;
      ouverte.modifie_le = db.now();
    } else {
      versions.push({
        version: versions.length + 1,
        cree_par: req.user.username,
        cree_le: db.now(),
        modifie_le: db.now(),
        entrees,
        close_le: '', close_par: '', issue: '',
      });
    }
    db.update('poi', p.id, { commentaires: versions });
    return res.json({ status: 'ok' });
  });

  // La version en cours se ferme sur la décision : elle devient l'archive de
  // ce qui a été observé à ce tour.
  function cloreCommentaires(p, req, issue) {
    const versions = (p.commentaires || []).slice();
    const ouverte = versions.find((v) => !v.close_le);
    if (!ouverte) return versions;
    ouverte.close_le = db.now();
    ouverte.close_par = req.user.username;
    ouverte.issue = issue;
    return versions;
  }

  // ══════════════════════════════════════
  //  Écriture
  // ══════════════════════════════════════

  app.post(`${M}/poi`, requireAuth, (req, res) => {
    if (!R.canContribute(req.user)) return refuser(res, 'Non autorisé à saisir une inspection');
    const corps = corpsPoi(req.body || {});
    const etat = corps.entete.etat_inspection;
    if (etat && !R.couvreEtat(req.user, referentiels, etat)) {
      return refuser(res, `État hors de votre périmètre (${etat})`);
    }
    const p = {
      id: db.uid('poi'),
      reference: db.prochaineReferencePoi(),
      instance: instanceCourante(req),
      statut: 'brouillon',
      ...corps,
      cree_par: req.user.username,
      cree_le: db.now(),
      soumis_par: '', soumis_le: '', renvoye_le: '', motif_renvoi: '',
      valide_par: '', valide_le: '', inspection_id: '', pieces: [],
    };
    db.insert('poi', p);
    res.status(201).json({ status: 'ok', id: p.id, reference: p.reference });
  });

  app.put(`${M}/poi/:id`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canContribute(req.user)) return refuser(res);
    // Une fiche validée a produit une inspection et ses écarts : la rouvrir
    // les ferait mentir. Elle se consulte, elle ne se corrige plus.
    if (p.statut === 'validee') {
      return res.status(400).json({ error: 'Formulaire validé — il ne peut plus être modifié' });
    }
    if (transmise(p)) {
      return res.status(400).json({ error: 'Formulaire transmis — il ne peut plus être modifié' });
    }
    if (p.statut === 'soumis') {
      return res.status(400).json({
        error: 'Formulaire soumis à validation — demandez son renvoi pour le reprendre',
      });
    }
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    const corps = corpsPoi(req.body || {});
    const etat = corps.entete.etat_inspection;
    if (etat && !R.couvreEtat(req.user, referentiels, etat)) {
      return refuser(res, `État hors de votre périmètre (${etat})`);
    }
    db.update('poi', p.id, corps);
    res.json({ status: 'ok' });
  });

  // Ce qu'il faut avoir renseigné pour qu'une fiche devienne une inspection.
  function manquants(p) {
    const e = p.entete || {};
    const requis = [['date', 'Date'], ['etat_inspection', 'État d’inspection'],
      ['exploitant', 'Exploitant'], ['aeronef', 'Type d’aéronef'],
      ['immatriculation', 'Immatriculation']];
    const trous = requis.filter(([k]) => !texte(e[k])).map(([, label]) => label);
    const controles = Object.values(p.items || {}).filter((i) => i.controle).length;
    if (!controles) trous.push('au moins un item contrôlé');
    if (!(p.equipe || []).length && !texte(p.inspecteurs)) trous.push('inspecteur');
    // Un constat sans description ne dit rien à celui qui le lira ensuite.
    const muets = Object.entries(p.items || {})
      .filter(([, i]) => i.ecart && i.ecart.categorie && !texte(i.ecart.description))
      .map(([code]) => code);
    if (muets.length) trous.push(`description du constat : ${muets.join(', ')}`);
    return trous;
  }

  // ── Soumission ──
  // L'inspecteur ferme sa saisie et passe la main au valideur. Les contrôles
  // de complétude sont ceux de la validation : mieux vaut les faire ici, tant
  // que l'auteur a encore la fiche en main.

  app.post(`${M}/poi/:id/soumettre`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canContribute(req.user)) return refuser(res, 'Non autorisé à soumettre une inspection');
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    if (p.statut !== 'brouillon') {
      return res.status(400).json({ error: 'Seul un brouillon se soumet' });
    }
    const trous = manquants(p);
    if (trous.length) {
      return res.status(400).json({ error: `À compléter avant soumission : ${trous.join(', ')}` });
    }
    db.update('poi', p.id, {
      statut: 'soumis', soumis_par: req.user.username, soumis_le: db.now(),
      renvoye_le: '', motif_renvoi: '',
    });
    return res.json({ status: 'ok' });
  });

  // ── Renvoi ──
  // Le valideur rend la fiche à son auteur, avec le motif : c'est le seul
  // chemin de retour, une fiche validée ayant déjà produit son inspection.

  app.post(`${M}/poi/:id/renvoyer`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canValidate(req.user)) return refuser(res, 'Réservé au valideur du module');
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    if (p.statut !== 'soumis') {
      return res.status(400).json({ error: 'Seule une fiche soumise se renvoie' });
    }
    db.update('poi', p.id, {
      statut: 'brouillon', renvoye_le: db.now(),
      motif_renvoi: texte((req.body || {}).motif),
      commentaires: cloreCommentaires(p, req, 'renvoi'),
    });
    return res.json({ status: 'ok' });
  });

  app.post(`${M}/poi/:id/valider`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canValidate(req.user)) return refuser(res, 'Réservé au valideur du module');
    if (p.statut === 'validee') {
      return res.status(400).json({ error: 'Formulaire déjà validé' });
    }
    // La validation prend la suite de la soumission : une fiche encore en
    // brouillon n'est pas passée par son auteur.
    if (p.statut !== 'soumis') {
      return res.status(400).json({ error: 'Soumettez la fiche avant de la valider' });
    }
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    const trous = manquants(p);
    if (trous.length) {
      return res.status(400).json({ error: `À compléter avant validation : ${trous.join(', ')}` });
    }

    const e = p.entete;
    const controles = Object.entries(p.items || {}).filter(([, i]) => i.controle);
    const constats = Object.entries(p.items || {}).filter(([, i]) => i.ecart && i.ecart.categorie);

    // L'inspection porte les six clés que l'import connaît déjà : une fiche
    // saisie et une ligne importée décrivent le même acte, et se reconnaissent
    // comme telles.
    const inspection = {
      id: db.uid('ins'),
      date: e.date,
      pays: e.etat_inspection,
      exploitant: e.exploitant,
      aeronef: e.aeronef,
      immatriculation: e.immatriculation,
      vol: e.vol_depuis || e.vol_vers || '',
      // Le statut de suivi vient de la fiche ; à défaut, une inspection sans
      // constat est close, une inspection qui en porte reste ouverte.
      status: p.statut_suivi || (constats.length ? 'Ouvert' : 'Clôturé'),
      itemsInspectes: controles.length,
      date_creation: db.now(),
      origine: 'poi',
      poi_id: p.id,
      poi_reference: p.reference,
    };

    const ecarts = constats.map(([code, i]) => ({
      id: db.uid('eca'),
      inspection_id: inspection.id,
      itemCode: code,
      stdRef: i.ecart.standard || '',
      description: i.ecart.description,
      categorie: i.ecart.categorie,
      // À défaut d'action par constat, celle de la fiche s'applique : le
      // formulaire papier ne porte qu'une classe d'action pour l'inspection.
      action: i.ecart.action || p.classe_action || '',
      suivi: i.ecart.suivi || '',
    }));

    db.insertMany({ inspections: [inspection], ecarts });
    db.update('poi', p.id, {
      statut: 'validee',
      valide_par: req.user.username,
      valide_le: db.now(),
      inspection_id: inspection.id,
      commentaires: cloreCommentaires(p, req, 'validation'),
    });

    res.status(201).json({
      status: 'ok',
      inspection_id: inspection.id,
      items: controles.length,
      ecarts: ecarts.length,
      message: `Inspection créée : ${controles.length} item(s) contrôlé(s), ${ecarts.length} écart(s).`,
    });
  });

  // ══════════════════════════════════════
  //  Pièces jointes
  // ══════════════════════════════════════
  // Les preuves recueillies : une photographie, une copie de document. Chacune
  // porte son intitulé et, si besoin, un commentaire. Elles se remplacent et se
  // retirent tant que la fiche n'a pas été transmise à l'exploitant.

  const piece = (p, pid) => (p.pieces || []).find((x) => x.id === pid);

  function ecrireFichier(f) {
    const ext = path.extname(f.filename || '').toLowerCase();
    if (!EXTENSIONS_PIECES.includes(ext)) {
      return { erreur: `Type de fichier non autorisé (${EXTENSIONS_PIECES.join(', ')})` };
    }
    if (f.buffer.length > TAILLE_PIECE_MAX) {
      return { erreur: 'Fichier trop volumineux (25 Mo maximum)' };
    }
    fs.mkdirSync(DOSSIER_PIECES, { recursive: true });
    const surDisque = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_PIECES, surDisque), f.buffer);
    return { surDisque };
  }

  // À n'appeler qu'une fois la désignation retirée de la fiche : un fichier
  // qu'un partage désigne encore reste pour l'État qui l'a reçu.
  const effacerFichier = (nom) => {
    if (!nom || db.fichierPoiDesigne(nom)) return;
    try { fs.unlinkSync(path.join(DOSSIER_PIECES, path.basename(nom))); }
    catch (e) { /* le fichier a déjà disparu : rien à défaire */ }
  };

  // Garde commune aux trois écritures : la fiche existe, elle est dans le
  // périmètre, l'agent contribue, et elle n'est pas encore partie.
  function fichePourPiece(req, res) {
    const p = db.get('poi', req.params.id);
    if (!p) { res.status(404).json({ error: 'Formulaire non trouvé' }); return null; }
    if (!R.canContribute(req.user)) { refuser(res); return null; }
    if (!dansPerimetre(req, p)) { refuser(res, 'Formulaire hors de votre périmètre'); return null; }
    if (piecesFigees(p)) {
      res.status(403).json({
        error: 'Fiche transmise à l’exploitant — ses pièces ne se modifient plus',
      });
      return null;
    }
    return p;
  }

  app.get(`${M}/poi/:id/pieces`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    res.json({
      pieces: (p.pieces || []).map(vuePiece),
      modifiable: R.canContribute(req.user) && !piecesFigees(p),
    });
  });

  app.post(`${M}/poi/:id/pieces`, requireAuth, multipart(), (req, res) => {
    const p = fichePourPiece(req, res);
    if (!p) return undefined;
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const d = req.body || {};
    const intitule = texte(d.intitule) || f.filename;
    const { surDisque, erreur } = ecrireFichier(f);
    if (erreur) return res.status(400).json({ error: erreur });

    const pj = {
      id: db.uid('pj'), intitule, commentaire: texte(d.commentaire),
      nom_origine: f.filename, fichier: surDisque, taille: f.buffer.length,
      depose_par: req.user.username, depose_le: db.now(),
    };
    db.update('poi', p.id, { pieces: (p.pieces || []).concat([pj]) });
    return res.status(201).json({ status: 'ok', id: pj.id });
  });

  // Remplacement du fichier, ou correction de l'intitulé et du commentaire :
  // c'est la même route, selon qu'un fichier accompagne ou non l'envoi.
  app.post(`${M}/poi/:id/pieces/:pid`, requireAuth, multipart(), (req, res) => {
    const p = fichePourPiece(req, res);
    if (!p) return undefined;
    const pj = piece(p, req.params.pid);
    if (!pj) return res.status(404).json({ error: 'Pièce non trouvée' });
    const d = req.body || {};
    const maj = { ...pj };
    if (d.intitule !== undefined) maj.intitule = texte(d.intitule) || pj.intitule;
    if (d.commentaire !== undefined) maj.commentaire = texte(d.commentaire);

    const f = (req.files || {}).file;
    if (f) {
      const { surDisque, erreur } = ecrireFichier(f);
      if (erreur) return res.status(400).json({ error: erreur });
      maj.fichier = surDisque;
      maj.nom_origine = f.filename;
      maj.taille = f.buffer.length;
      maj.depose_par = req.user.username;
      maj.depose_le = db.now();
    }
    db.update('poi', p.id, {
      pieces: (p.pieces || []).map((x) => (x.id === pj.id ? maj : x)),
    });
    if (maj.fichier !== pj.fichier) effacerFichier(pj.fichier);
    return res.json({ status: 'ok' });
  });

  app.delete(`${M}/poi/:id/pieces/:pid`, requireAuth, (req, res) => {
    const p = fichePourPiece(req, res);
    if (!p) return undefined;
    const pj = piece(p, req.params.pid);
    if (!pj) return res.status(404).json({ error: 'Pièce non trouvée' });
    db.update('poi', p.id, { pieces: (p.pieces || []).filter((x) => x.id !== pj.id) });
    effacerFichier(pj.fichier);
    return res.json({ status: 'ok' });
  });

  app.get(`${M}/poi/:id/pieces/:pid/fichier`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    const pj = piece(p, req.params.pid);
    if (!pj) return res.status(404).json({ error: 'Pièce non trouvée' });
    const chemin = path.join(DOSSIER_PIECES, path.basename(pj.fichier || ''));
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    res.setHeader('Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(pj.nom_origine || pj.fichier)}`);
    return res.sendFile(chemin);
  });

  // ══════════════════════════════════════
  //  Transmission à l'exploitant
  // ══════════════════════════════════════
  // La fiche part chez l'exploitant : c'est le moment où les preuves cessent
  // d'être retouchables. On enregistre la date et le destinataire ; l'envoi
  // lui-même reste à la main de l'agent, l'outil n'expédie rien.

  // Communication écrite : à l'exploitant, à l'autorité de surveillance, ou
  // les deux. Les constats de catégorie 2 ou 3 l'exigent — c'est la classe
  // d'action de la fiche qui le dit.
  const ADRESSE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;
  const listeAdresses = (v) => String(v || '').split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);
  const CIBLES_ENVOI = { exploitant: 'Exploitant', autorite: 'Autorité de surveillance' };

  app.post(`${M}/poi/:id/communiquer`, requireAuth, async (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canContribute(req.user)) return refuser(res);
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    if (p.statut !== 'validee') {
      return res.status(400).json({ error: 'Validez la fiche avant de communiquer' });
    }
    const d = req.body || {};
    const cible = CIBLES_ENVOI[texte(d.cible)] ? texte(d.cible) : '';
    if (!cible) return res.status(400).json({ error: 'Destinataire de la communication inconnu' });
    const destinataires = listeAdresses(d.destinataire);
    if (!destinataires.length) return res.status(400).json({ error: 'Destinataire manquant' });
    const copies = listeAdresses(d.copie);
    const copiesCachees = listeAdresses(d.copie_cachee);
    const invalide = [...destinataires, ...copies, ...copiesCachees].find((a) => !ADRESSE.test(a));
    if (invalide) return res.status(400).json({ error: `Adresse invalide : ${invalide}` });
    const objet = texte(d.objet);
    if (!objet) return res.status(400).json({ error: 'Objet manquant' });

    const envoi = await courriel.queue({
      to: destinataires.join(', '),
      cc: copies.join(', ') || undefined,
      bcc: copiesCachees.join(', ') || undefined,
      subject: objet,
      body: texte(d.message),
      origine: 'communication_ramp',
      reference: p.reference,
      poi_id: p.id,
    });
    // La communication écrite est une obligation du programme : elle se
    // consigne même si le serveur de messagerie ne répond pas — l'agent la
    // relaiera par un autre canal, et la fiche garde trace de ce qui a été
    // rédigé, pour qui, et quand.
    const parti = !!(envoi && envoi.status === 'sent');
    const smtp = courriel.etatSmtp();
    const echec = envoi && envoi.status === 'error'
      ? `${envoi.error}${smtp.host ? ` (${smtp.host}:${smtp.port})` : ''}` : '';

    const envois = (p.communications || []).concat([{
      id: db.uid('com'), cible,
      destinataire: destinataires.join(', '),
      copie: copies.join(', '), copie_cachee: copiesCachees.join(', '),
      objet, message: texte(d.message),
      envoye: parti, erreur: echec,
      envoye_le: db.now(), envoye_par: req.user.username,
    }]);
    const patch = { communications: envois };

    // La transmission ne se déclare plus à la main : quand les deux
    // communications sont parties — à l'exploitant et à l'autorité qui le
    // surveille — la fiche est transmise, et l'horodatage le dit.
    const cibles = new Set(envois.map((c) => c.cible));
    const toutesFaites = Object.keys(CIBLES_ENVOI).every((k) => cibles.has(k));
    if (toutesFaites && !transmise(p)) {
      patch.transmis_le = db.now();
      patch.transmis_par = req.user.username;
      patch.transmis_a = envois.map((c) => c.destinataire).filter(Boolean).join(', ');
    }
    db.update('poi', p.id, patch);
    return res.json({
      status: 'ok', envoye: parti, erreur: echec, destinataires,
      transmise: !!patch.transmis_le || transmise(p),
    });
  });

  app.post(`${M}/poi/:id/transmettre`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (!R.canContribute(req.user)) return refuser(res);
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    if (p.statut !== 'validee') {
      return res.status(400).json({ error: 'Validez la fiche avant de la transmettre' });
    }
    if (transmise(p)) return res.status(400).json({ error: 'Fiche déjà transmise' });
    // Classes 2 et 3 : les constats significatifs ou majeurs appellent une
    // communication écrite. Sans elle, la transmission n'est pas acquise.
    const classe = texte(p.classe_action);
    const exigee = /^(2|3)/.test(classe);
    const faites = (p.communications || []).map((c) => c.cible);
    if (exigee && !faites.includes('exploitant')) {
      return res.status(400).json({
        error: `Classe d'action ${classe} : la communication écrite à l'exploitant est requise`,
      });
    }
    db.update('poi', p.id, {
      transmis_le: db.now(),
      transmis_par: req.user.username,
      transmis_a: texte((req.body || {}).destinataire)
        || (p.communications || []).map((c) => c.destinataire).join(', '),
    });
    return res.json({ status: 'ok' });
  });

  app.delete(`${M}/poi/:id`, requireAuth, (req, res) => {
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    // Une fiche validée est la pièce justificative de son inspection : seul le
    // gestionnaire du module peut la retirer, et l'inspection reste.
    if (p.statut === 'validee' && !admin(req)) {
      return refuser(res, 'Formulaire validé — suppression réservée au gestionnaire');
    }
    if (p.statut !== 'validee' && !R.canContribute(req.user)) return refuser(res);
    if (!dansPerimetre(req, p)) return refuser(res, 'Formulaire hors de votre périmètre');
    // Les preuves partent avec la fiche : les laisser sur le disque
    // accumulerait des fichiers que plus rien ne désigne. Celles qu'un partage
    // désigne encore restent pour l'État qui les a reçues.
    db.remove('poi', p.id);
    (p.pieces || []).forEach((pj) => effacerFichier(pj.fichier));
    res.json({ status: 'ok' });
  });
};

module.exports.STANDARDS = STANDARDS;
module.exports.CHAMPS_ENTETE = CHAMPS_ENTETE;
