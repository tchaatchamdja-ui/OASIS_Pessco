// Module « Inspections d'aéronefs sur aire de trafic » — échanges de classeurs.
//
// RAMP lisait et écrivait les classeurs dans le navigateur, en chargeant
// SheetJS depuis un CDN. OASIS ne charge rien depuis l'extérieur : lecture et
// écriture se font ici, comme partout ailleurs dans l'application.
//
// L'import se fait en deux temps, pour que rien n'entre sans avoir été vu :
//   1. POST /import/analyser — le classeur est lu et rendu tel qu'il sera
//      importé, chaque ligne marquée « nouvelle », « mise à jour » ou
//      « doublon » ;
//   2. POST /inspections/import — l'agent confirme, et l'écriture a lieu.
const crypto = require('crypto');
const XLSX = require('xlsx');
// L'écriture avec styles : le paquet « xlsx » de la communauté les ignore.
const XLSXS = require('xlsx-js-style');
const referentiels = require('../../referentiels');
const multipart = require('../../multipart');
const db = require('./store');
const R = require('./roles');
const vues = require('./vues');

const TAILLE_MAX = 8 * 1024 * 1024;

// Comparaison tolérante aux accents, à la casse et aux séparateurs : les
// classeurs viennent de neuf États et n'intitulent pas leurs colonnes deux
// fois de la même façon.
const norm = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[\s_.-]+/g, '');

// Intitulés acceptés pour chaque colonne, dans l'ordre où on les cherche.
const COLONNES = {
  // Référence de la fiche d'inspection (Proof of Inspection), quand l'État en
  // tient une : elle accompagne l'inspection au lieu d'être ressaisie ici.
  poi_reference: ['POI', 'Réf. POI', 'Ref POI', 'Référence POI', 'Reference POI', 'POI Ref'],
  date: ['Date'],
  pays: ['Pays', 'Etat', 'État'],
  exploitant: ['Exploitant', 'Operateur', 'Opérateur', 'Operator'],
  aeronef: ['Aéronef', 'Aeronef', 'Aircraft', 'Type'],
  immatriculation: ['Immatriculation', 'Immat', 'Registration'],
  vol: ['N° Vol', 'No Vol', 'N Vol', 'Vol', 'Flight'],
  status: ['Statut', 'Status'],
  itemsInspectes: ['Items Inspectés', 'Items Inspectes', 'NbItems', 'Nb Items', 'ItemsInspectes'],
  itemCode: ['Item'],
  stdRef: ['Std Ref.', 'Std Ref', 'StdRef', 'Référence', 'Reference'],
  description: ['Description'],
  categorie: ['Catégorie', 'Categorie', 'Cat'],
  action: ['Action'],
  suivi: ['Suivi'],
};

// Une date de classeur arrive en numéro de série Excel, en chaîne ISO ou en
// JJ/MM/AAAA. Les trois ressortent en ISO.
function dateISO(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const p = s.split(/[-/.]/);
  if (p.length >= 3) {
    let j; let m; let a;
    if (p[0].length === 4) { a = +p[0]; m = +p[1]; j = +p[2]; }
    else { j = +p[0]; m = +p[1]; a = +p[2]; if (a < 100) a += 2000; }
    if (a && m && j) {
      const d = new Date(Date.UTC(a, m - 1, j));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return s;
}

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const texte = (v) => String(v == null ? '' : v).trim();

  // ── Mise en forme du classeur ──
  // Les niveaux de regroupement se distinguent par leur fond, du plus foncé au
  // plus clair, et un filet ferme chaque groupe.
  const BLEU = '1A365D';
  // Des teintes claires : la lecture reste douce, le texte y demeure sombre.
  const TEINTES_NIVEAU = ['CFE0F3', 'E1ECF8', 'EDF4FB', 'F5F9FD'];
  const TEXTE_NIVEAU = ['1A365D', '1A365D', '2C5282', '2C5282'];
  const BORD = { style: 'thin', color: { rgb: 'C7D2E0' } };
  const bordures = (bas) => ({
    top: BORD, bottom: bas ? { style: 'medium', color: { rgb: BLEU } } : BORD,
    left: BORD, right: BORD,
  });

  const classeur = (titre, entetes, lignes, largeurs, onglet, deco) => {
    const grille = [[titre], [], entetes, ...lignes];
    const ws = XLSXS.utils.aoa_to_sheet(grille);
    ws['!cols'] = largeurs.map((w) => ({ wch: w }));
    ws['!freeze'] = { xSplit: 0, ySplit: 3 };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: entetes.length - 1 } }];
    ws['!rows'] = [{ hpt: 22 }];

    const nbCol = Math.max(entetes.length, ...lignes.map((l) => l.length), 1);
    const cellule = (r, c) => {
      const ref = XLSXS.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      return ws[ref];
    };

    // Titre et entêtes.
    for (let c = 0; c < nbCol; c += 1) {
      cellule(0, c).s = {
        font: { bold: true, sz: 13, color: { rgb: BLEU } },
        alignment: { vertical: 'center' },
      };
      cellule(2, c).s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: BLEU } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: bordures(false),
      };
    }

    // Le corps : chaque ligne peut porter un niveau de regroupement, une fin de
    // groupe, ou être la ligne des totaux.
    const marques = (deco && deco.lignes) || [];
    lignes.forEach((ligne, i) => {
      const m = marques[i] || {};
      for (let c = 0; c < nbCol; c += 1) {
        const cel = cellule(3 + i, c);
        const style = { border: bordures(!!m.finGroupe) };
        if (m.total) {
          style.font = { bold: true, color: { rgb: BLEU } };
          style.fill = { fgColor: { rgb: 'B9D2EC' } };
        } else if (m.niveau !== undefined && m.niveau !== null) {
          const n = Math.min(m.niveau, TEINTES_NIVEAU.length - 1);
          style.font = { bold: true, color: { rgb: TEXTE_NIVEAU[n] } };
          style.fill = { fgColor: { rgb: TEINTES_NIVEAU[n] } };
        } else if (i % 2 === 1) {
          style.fill = { fgColor: { rgb: 'F5F8FC' } };
        }
        if (typeof cel.v === 'number') style.alignment = { horizontal: 'right' };
        cel.s = style;
      }
    });

    const wb = XLSXS.utils.book_new();
    XLSXS.utils.book_append_sheet(wb, ws, onglet);
    return XLSXS.write(wb, { type: 'buffer', bookType: 'xlsx' });
  };

  const envoyer = (res, buffer, nom) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.send(buffer);
  };

  // ══════════════════════════════════════
  //  Lecture d'un classeur
  // ══════════════════════════════════════

  // Les classeurs ne commencent pas tous par leurs intitulés : le modèle servi
  // par le module porte d'abord son titre, et un relevé d'État peut porter un
  // en-tête d'autorité. On cherche donc la ligne d'intitulés — la première où
  // au moins trois colonnes connues se reconnaissent — et on lit à partir d'elle.
  const INTITULES_CONNUS = Object.values(COLONNES).flat().map(norm);

  function lireFeuille(ws) {
    const grille = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const reconnues = (ligne) => ligne.filter((c) => INTITULES_CONNUS.includes(norm(c))).length;
    let rang = grille.findIndex((ligne) => reconnues(ligne) >= 3);
    if (rang < 0) rang = 0;
    const entetes = grille[rang].map((c, i) => (texte(c) || `_${i}`));
    return grille.slice(rang + 1)
      .filter((ligne) => ligne.some((c) => texte(c) !== ''))
      .map((ligne) => Object.fromEntries(entetes.map((k, i) => [k, ligne[i] === undefined ? '' : ligne[i]])));
  }

  app.post(`${M}/import/analyser`, requireAuth, multipart(), (req, res) => {
    if (!R.canContribute(req.user)) return refuser(res, 'Non autorisé à importer');
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    if (!/\.(xlsx|xls)$/i.test(f.filename || '')) {
      return res.status(400).json({ error: 'Format non supporté — utilisez .xlsx' });
    }
    if (f.buffer.length > TAILLE_MAX) {
      return res.status(400).json({ error: 'Fichier trop volumineux (8 Mo maximum)' });
    }

    let lignes;
    try {
      const wb = XLSX.read(f.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      lignes = lireFeuille(ws);
    } catch (e) {
      return res.status(400).json({ error: 'Classeur illisible' });
    }
    if (!lignes.length) return res.status(400).json({ error: 'Classeur vide' });

    // Repérage des colonnes : une seule fois, sur les intitulés du classeur.
    const intitules = Object.keys(lignes[0]);
    const colonne = {};
    Object.entries(COLONNES).forEach(([champ, candidats]) => {
      const trouve = candidats
        .map((c) => intitules.find((k) => norm(k) === norm(c)))
        .find(Boolean);
      if (trouve) colonne[champ] = trouve;
    });
    const manquantes = ['date', 'exploitant'].filter((c) => !colonne[c]);
    if (manquantes.length) {
      return res.status(400).json({
        error: `Colonnes introuvables : ${manquantes.join(', ')}. `
          + `Intitulés lus : ${intitules.slice(0, 12).join(', ')}`,
      });
    }
    const lire = (ligne, champ) => (colonne[champ] === undefined ? '' : ligne[colonne[champ]]);

    // Les lignes d'un même acte d'inspection se regroupent sur les six clés :
    // un classeur porte une ligne par écart, pas une par inspection.
    const CLES = ['date', 'pays', 'exploitant', 'aeronef', 'immatriculation', 'vol'];
    const groupes = new Map();
    lignes.forEach((l) => {
      const insp = {
        date: dateISO(lire(l, 'date')),
        pays: texte(lire(l, 'pays')),
        exploitant: texte(lire(l, 'exploitant')),
        aeronef: texte(lire(l, 'aeronef')),
        immatriculation: texte(lire(l, 'immatriculation')),
        vol: texte(lire(l, 'vol')),
      };
      const cle = CLES.map((k) => insp[k]).join(' ');
      if (!groupes.has(cle)) {
        groupes.set(cle, {
          ...insp,
          poi_reference: texte(lire(l, 'poi_reference')),
          status: texte(lire(l, 'status')) || 'Inconnu',
          itemsInspectes: parseInt(lire(l, 'itemsInspectes'), 10) || 0,
          anomalies: [],
        });
      }
      // Le classeur porte une ligne par écart : la référence peut n'être
      // renseignée que sur l'une d'elles.
      const refPoi = texte(lire(l, 'poi_reference'));
      if (refPoi && !groupes.get(cle).poi_reference) groupes.get(cle).poi_reference = refPoi;

      const item = texte(lire(l, 'itemCode'));
      if (item) {
        groupes.get(cle).anomalies.push({
          itemCode: item,
          stdRef: texte(lire(l, 'stdRef')),
          description: texte(lire(l, 'description')),
          categorie: texte(lire(l, 'categorie')),
          action: texte(lire(l, 'action')),
          suivi: texte(lire(l, 'suivi')),
        });
      }
    });

    // Confrontation à l'existant, pour dire à l'agent ce qui va se passer.
    const existantes = new Map(db.list('inspections')
      .map((i) => [CLES.map((k) => texte(i[k])).join(' '), i]));
    const apercu = [...groupes.values()].map((g) => {
      const cle = CLES.map((k) => g[k]).join(' ');
      const deja = existantes.get(cle);
      let sort = 'nouvelle';
      if (deja) {
        const statutChange = (deja.status || 'Inconnu') !== g.status;
        const itemsChanges = g.itemsInspectes > 0 && (deja.itemsInspectes || 0) !== g.itemsInspectes;
        sort = (statutChange || itemsChanges) ? 'maj' : 'doublon';
      }
      const horsPerimetre = !!g.pays && !R.couvreEtat(req.user, referentiels, g.pays);
      return { ...g, sort, hors_perimetre: horsPerimetre };
    });

    res.json({
      fichier: f.filename,
      colonnes_lues: Object.keys(colonne),
      colonnes_ignorees: intitules.filter((k) =>
        !Object.values(colonne).includes(k)),
      lignes: apercu,
      totaux: {
        nouvelles: apercu.filter((a) => a.sort === 'nouvelle').length,
        majs: apercu.filter((a) => a.sort === 'maj').length,
        doublons: apercu.filter((a) => a.sort === 'doublon').length,
        hors_perimetre: apercu.filter((a) => a.hors_perimetre).length,
      },
    });
  });

  // Modèle de classeur, pour que les États sachent quoi remplir.
  app.get(`${M}/import/modele`, requireAuth, (req, res) => {
    // La référence POI ouvre la ligne : c'est elle qui rattache l'inspection
    // à sa fiche quand l'État en tient une. Laissée vide, elle n'empêche rien.
    const entetes = ['POI', 'Date', 'Pays', 'Exploitant', 'Aéronef', 'Immatriculation', 'N° Vol',
      'Statut', 'Items Inspectés', 'Item', 'Std Ref.', 'Description', 'Catégorie', 'Action', 'Suivi'];
    const exemple = [
      ['POI-TG-2026-014', '2026-03-14', 'Togo', 'Asky Airlines', 'B737-800', '5V-TTT', 'KP041',
        'Ouvert', 48, 'A05', 'CAT.OP.MPA.175', 'Checklist non à jour', '2', '2', ''],
      ['POI-TG-2026-014', '2026-03-14', 'Togo', 'Asky Airlines', 'B737-800', '5V-TTT', 'KP041',
        'Ouvert', 48, 'C04', 'CAT.IDE.A.100', 'Usure marquée du pneu', '3', '3b', ''],
    ];
    envoyer(res, classeur(
      "Modèle d'import — Inspections sur aire de trafic",
      entetes, exemple, [18, 12, 14, 20, 14, 16, 10, 12, 14, 8, 18, 44, 10, 10, 14], 'Inspections',
    ), 'modele_import_safa.xlsx');
  });

  // ══════════════════════════════════════
  //  Exports
  // ══════════════════════════════════════
  // Les filtres appliqués à l'écran sont repostés ici : c'est ce que l'agent
  // regarde qu'il exporte, pas la base entière.

  // `req` porte la vue active : en vue Prestataire, l'export ne peut pas
  // sortir plus que ce que l'écran montre.
  const filtrer = (corps, req) => {
    const F = corps || {};
    const ecartsDe = new Map();
    db.list('ecarts').forEach((e) => {
      if (!ecartsDe.has(e.inspection_id)) ecartsDe.set(e.inspection_id, []);
      ecartsDe.get(e.inspection_id).push(e);
    });
    const retenues = vues.filtrerInspections(req, db.list('inspections'), loadConfig).filter((i) => {
      const ecarts = ecartsDe.get(i.id) || [];
      if (F.annee && String(i.date || '').slice(0, 4) !== String(F.annee)) return false;
      // Le trimestre arrive seul ou en liste ; une liste vide ne filtre rien.
      const trimestres = Array.isArray(F.trimestre)
        ? F.trimestre.map(String).filter(Boolean)
        : (F.trimestre ? [String(F.trimestre)] : []);
      if (trimestres.length) {
        const m = parseInt(String(i.date || '').slice(5, 7), 10);
        if (!m || !trimestres.includes(String(Math.floor((m - 1) / 3) + 1))) return false;
      }
      // Les États retenus par la barre du bas s'ajoutent au filtre d'État.
      const etats = Array.isArray(F.paysUemoa) ? F.paysUemoa.filter(Boolean) : [];
      if (etats.length && !etats.includes(i.pays)) return false;
      if (F.etat && i.pays !== F.etat) return false;
      if (F.exploitant && i.exploitant !== F.exploitant) return false;
      if (F.aeronef && i.aeronef !== F.aeronef) return false;
      if (F.immatriculation && i.immatriculation !== F.immatriculation) return false;
      if (F.statut && i.status !== F.statut) return false;
      if (F.categorie && !ecarts.some((a) => String(a.categorie) === String(F.categorie))) return false;
      if (F.action && !ecarts.some((a) => String(a.action) === String(F.action))) return false;
      return true;
    });
    return retenues.map((i) => ({ ...i, anomalies: ecartsDe.get(i.id) || [] }));
  };

  // ══════════════════════════════════════
  //  Générateur de tables
  // ══════════════════════════════════════
  // Le catalogue des champs que le module sait extraire, rangés par famille.
  // Deux familles sont liées quand une donnée de l'une mène à l'autre : une
  // inspection porte ses écarts, un dépôt ne mène à rien d'autre.
  const CHAMPS_TABLE = [
    // Inspections
    { cle: 'date', label: 'Date', famille: 'inspection', type: 'texte' },
    { cle: 'annee', label: 'Année', famille: 'inspection', type: 'texte' },
    { cle: 'trimestre', label: 'Trimestre', famille: 'inspection', type: 'texte' },
    { cle: 'mois', label: 'Mois', famille: 'inspection', type: 'texte' },
    { cle: 'pays', label: 'État', famille: 'inspection', type: 'texte' },
    { cle: 'exploitant', label: 'Exploitant', famille: 'inspection', type: 'texte' },
    { cle: 'aeronef', label: 'Aéronef', famille: 'inspection', type: 'texte' },
    { cle: 'immatriculation', label: 'Immatriculation', famille: 'inspection', type: 'texte' },
    { cle: 'vol', label: 'N° de vol', famille: 'inspection', type: 'texte' },
    { cle: 'poi_reference', label: 'Référence POI', famille: 'inspection', type: 'texte' },
    { cle: 'status', label: 'Statut de l’inspection', famille: 'inspection', type: 'texte' },
    { cle: 'itemsInspectes', label: 'Items inspectés', famille: 'inspection', type: 'nombre' },
    { cle: 'nb_ecarts', label: 'Nombre d’écarts', famille: 'inspection', type: 'nombre' },
    // Écarts — liés aux inspections
    { cle: 'e_itemCode', label: 'Item', famille: 'ecart', type: 'texte' },
    { cle: 'e_item_label', label: 'Libellé de l’item', famille: 'ecart', type: 'texte' },
    { cle: 'e_stdRef', label: 'Référentiel', famille: 'ecart', type: 'texte' },
    { cle: 'e_description', label: 'Description du constat', famille: 'ecart', type: 'texte' },
    { cle: 'e_categorie', label: 'Catégorie', famille: 'ecart', type: 'texte' },
    { cle: 'e_action', label: 'Classe d’action', famille: 'ecart', type: 'texte' },
    { cle: 'e_suivi', label: 'Statut de suivi', famille: 'ecart', type: 'texte' },
    { cle: 'e_compte', label: 'Écart (unité)', famille: 'ecart', type: 'nombre' },
    // Contacts — sans lien avec les inspections
    { cle: 'c_nom', label: 'Contact — nom', famille: 'contact', type: 'texte' },
    { cle: 'c_organisme', label: 'Contact — organisme', famille: 'contact', type: 'texte' },
    { cle: 'c_pays', label: 'Contact — État', famille: 'contact', type: 'texte' },
    { cle: 'c_email', label: 'Contact — courriel', famille: 'contact', type: 'texte' },
  ];

  // Les familles qui se joignent : inspection ↔ écart. Les autres restent
  // seules — mêler un dépôt à une inspection ne produirait rien de sensé.
  const FAMILLES_LIEES = { inspection: ['inspection', 'ecart'], ecart: ['inspection', 'ecart'] };
  const famillesCompatibles = (a, b) => (FAMILLES_LIEES[a] || [a]).includes(b);

  app.get(`${M}/tables/champs`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, 'Hors de la vue Prestataire');
    res.json({ champs: CHAMPS_TABLE, liees: FAMILLES_LIEES });
  });

  // Les lignes de base d'une famille, à plat : une ligne par écart pour la
  // famille « écart », une par inspection sinon.
  function lignesSource(familles, filtres, req) {
    const libelles = Object.fromEntries(db.list('parametres')
      .filter((p) => p.type === 'items').map((p) => [p.code, p.label]));
    const veutEcart = familles.includes('ecart');

    if (familles.includes('contact')) {
      return db.list('contacts').map((c) => ({
        c_nom: [c.prenom, c.nom].filter(Boolean).join(' ') || c.nom || '',
        c_organisme: c.organisme || '', c_pays: c.pays || '', c_email: c.email || '',
      }));
    }

    const lignes = [];
    filtrer(filtres, req).forEach((i) => {
      const base = {
        date: i.date || '',
        annee: String(i.date || '').slice(0, 4),
        trimestre: (() => {
          const m = parseInt(String(i.date || '').slice(5, 7), 10);
          return m ? `T${Math.floor((m - 1) / 3) + 1}` : '';
        })(),
        mois: String(i.date || '').slice(5, 7),
        pays: i.pays || '', exploitant: i.exploitant || '', aeronef: i.aeronef || '',
        immatriculation: i.immatriculation || '', vol: i.vol || '',
        poi_reference: i.poi_reference || '', status: i.status || '',
        itemsInspectes: Number(i.itemsInspectes) || 0,
        nb_ecarts: (i.anomalies || []).length,
      };
      if (!veutEcart) { lignes.push(base); return; }
      if (!(i.anomalies || []).length) {
        lignes.push({ ...base, e_itemCode: '', e_item_label: '', e_stdRef: '',
          e_description: '', e_categorie: '', e_action: '', e_suivi: '', e_compte: 0 });
        return;
      }
      i.anomalies.forEach((a) => lignes.push({
        ...base,
        e_itemCode: a.itemCode || '', e_item_label: libelles[a.itemCode] || '',
        e_stdRef: a.stdRef || '', e_description: a.description || '',
        e_categorie: a.categorie || '', e_action: a.action || '',
        e_suivi: a.suivi || i.status || '', e_compte: 1,
      }));
    });
    return lignes;
  }

  // La table demandée : à plat, ou regroupée sur les colonnes de valeurs avec
  // les mesures sommées.
  // Un classeur préparé attend qu'on vienne le chercher : le navigateur le
  // télécharge alors par une navigation ordinaire, sans blob — certains
  // navigateurs refusent un téléchargement lancé par script hors du clic.
  const CLASSEURS = new Map();
  const DUREE_CLASSEUR = 5 * 60 * 1000;

  function deposerClasseur(buffer, nom, utilisateur) {
    const jeton = crypto.randomBytes(16).toString('hex');
    CLASSEURS.set(jeton, { buffer, nom, utilisateur, expire: Date.now() + DUREE_CLASSEUR });
    // On profite du passage pour balayer ce qui a expiré.
    CLASSEURS.forEach((v, k) => { if (v.expire < Date.now()) CLASSEURS.delete(k); });
    return jeton;
  }

  app.get(`${M}/tables/fichier/:jeton`, requireAuth, (req, res) => {
    const item = CLASSEURS.get(req.params.jeton);
    if (!item || item.expire < Date.now()) {
      CLASSEURS.delete(req.params.jeton);
      return res.status(404).json({ error: 'Fichier expiré — relancez l’export' });
    }
    if (item.utilisateur && item.utilisateur !== req.user.username) return refuser(res);
    CLASSEURS.delete(req.params.jeton);
    envoyer(res, item.buffer, item.nom);
    return undefined;
  });

  app.post(`${M}/tables/export-xlsx`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, 'Hors de la vue Prestataire');
    const corps = req.body || {};
    const colonnes = (corps.colonnes || [])
      .map((c) => ({ role: 'donnee', mode: 'valeurs', ...c, def: CHAMPS_TABLE.find((x) => x.cle === c.cle) }))
      .filter((c) => c.def);
    if (!colonnes.length) return res.status(400).json({ error: 'Aucune donnée choisie' });

    // Les familles doivent se joindre deux à deux, sinon la table n'a pas de sens.
    const familles = [...new Set(colonnes.map((c) => c.def.famille))];
    const incompatible = familles.find((f) => familles.some((g) => !famillesCompatibles(f, g)));
    if (incompatible) return res.status(400).json({ error: 'Données sans relation entre elles' });

    const source = lignesSource(familles, corps.filtres, req);

    // Chaque colonne porte son rôle : elle regroupe (en ligne), elle croise
    // (en colonne), ou elle est la donnée observée — valeurs telles quelles ou
    // somme. Le classeur sort alors en tableau croisé.
    const lignesDim = colonnes.filter((c) => c.role === 'regroupement');
    const colonnesDim = colonnes.filter((c) => c.role === 'croisement');
    const mesures = colonnes.filter((c) => c.role !== 'regroupement' && c.role !== 'croisement');
    const nombre = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const valeurMesure = (l, m) => (m.mode === 'somme'
      ? (m.def.type === 'nombre' ? nombre(l[m.cle]) : (l[m.cle] ? 1 : 0))
      : (l[m.cle] ?? ''));

    // Ce que l'utilisateur veut voir totalisé.
    const T = corps.totaux || {};
    const voirTotalColonnes = T.colonnes !== false;
    const voirSousTotaux = T.sousTotaux !== false;
    const voirTotalGeneral = T.general !== false;

    let entetes;
    let lignes;
    // Ce que la mise en forme doit savoir : quelles lignes portent un niveau,
    // ferment un groupe, ou totalisent.
    let decoration = null;

    if (!lignesDim.length && !colonnesDim.length) {
      // Rien à regrouper : la table reprend les lignes telles quelles.
      entetes = colonnes.map((c) => (c.mode === 'somme'
        ? `${c.def.label} (${c.def.type === 'nombre' ? 'somme' : 'nombre'})` : c.def.label));
      lignes = source.map((l) => colonnes.map((c) => valeurMesure(l, c)));
      const sommes = colonnes.map((c, k) => (c.mode === 'somme'
        ? lignes.reduce((t, ligne) => t + nombre(ligne[k]), 0) : ''));
      if (voirTotalGeneral && colonnes.some((c) => c.mode === 'somme')) {
        sommes[0] = 'TOTAL';
        decoration = { lignes: [...lignes.map(() => ({})), {}, { total: true }] };
        lignes.push([], sommes);
      }
    } else {
      // Tableau croisé à la manière d'un tableau dynamique : chaque valeur de
      // regroupement ouvre une ligne d'entête, et ce qui en dépend se range
      // dessous — niveaux imbriqués, puis le détail s'il a été demandé.
      const mesure = mesures.find((m) => m.mode === 'somme') || mesures[0];
      const detail = mesures.filter((m) => m.mode !== 'somme');
      const cleColonne = (l) => colonnesDim.map((d) => String(l[d.cle] ?? '—')).join(' · ');

      const colonnesVues = [];
      if (colonnesDim.length) {
        source.forEach((l) => {
          const c = cleColonne(l);
          if (!colonnesVues.includes(c)) colonnesVues.push(c);
        });
        colonnesVues.sort((a, b) => String(a).localeCompare(String(b), 'fr'));
      }

      const apport = (l) => {
        if (!mesure) return 1;
        return mesure.def.type === 'nombre' ? nombre(l[mesure.cle]) : (l[mesure.cle] ? 1 : 0);
      };
      const cellules = (liste) => {
        if (!colonnesVues.length) return [liste.reduce((t, l) => t + apport(l), 0)];
        return colonnesVues.map((c) => liste
          .filter((l) => cleColonne(l) === c)
          .reduce((t, l) => t + apport(l), 0));
      };

      const largeurLibelle = lignesDim.length;
      const lignesSortie = [];
      const marques = [];

      // Un niveau de regroupement : une ligne d'entête par valeur, puis le
      // niveau suivant en retrait, et enfin le détail au dernier niveau.
      const parcourir = (liste, niveau) => {
        const champ = lignesDim[niveau];
        const paquets = new Map();
        liste.forEach((l) => {
          const v = String(l[champ.cle] ?? '');
          if (!paquets.has(v)) paquets.set(v, []);
          paquets.get(v).push(l);
        });
        [...paquets.entries()]
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'fr'))
          .forEach(([valeur, sousListe]) => {
            const libelle = Array(largeurLibelle).fill('');
            libelle[niveau] = valeur || '(non renseigné)';
            const vals = cellules(sousListe);
            // Sans sous-totaux, la ligne de groupe ne porte que son intitulé.
            const valsGroupe = voirSousTotaux ? vals : vals.map(() => '');
            lignesSortie.push([...libelle, ...Array(detail.length).fill(''), ...valsGroupe,
              ...(voirTotalColonnes
                ? [voirSousTotaux ? vals.reduce((t, v) => t + v, 0) : ''] : [])]);
            marques.push({ niveau });

            if (niveau + 1 < lignesDim.length) {
              parcourir(sousListe, niveau + 1);
              // Le groupe se referme sur un filet, pour le détacher du suivant.
              if (marques.length) marques[marques.length - 1].finGroupe = true;
              return;
            }
            // Dernier niveau : le détail demandé se range sous l'entête, chaque
            // donnée dans sa propre colonne.
            if (!detail.length) return;
            sousListe.forEach((l) => {
              const cellulesDetail = colonnesVues.length
                ? colonnesVues.map((c) => (cleColonne(l) === c ? apport(l) : 0))
                : [apport(l)];
              lignesSortie.push([
                ...Array(largeurLibelle).fill(''),
                ...detail.map((d) => (l[d.cle] ?? '')),
                ...cellulesDetail,
                ...(voirTotalColonnes ? [cellulesDetail.reduce((t, v) => t + v, 0)] : []),
              ]);
              marques.push({});
            });
            if (marques.length) marques[marques.length - 1].finGroupe = true;
          });
      };
      parcourir(source, 0);

      const enteteMesure = mesure
        ? `${mesure.def.label}${mesure.mode === 'somme' ? ' (somme)' : ''}` : 'Nombre';
      entetes = [
        ...lignesDim.map((d) => d.def.label),
        ...detail.map((d) => d.def.label),
        ...(colonnesVues.length ? colonnesVues : [enteteMesure]),
        ...(voirTotalColonnes ? ['Total'] : []),
      ];

      const totaux = [...Array(largeurLibelle).fill(''), ...Array(detail.length).fill('')];
      totaux[0] = 'TOTAL GÉNÉRAL';
      const totalCol = cellules(source);
      if (voirTotalGeneral) {
        lignes = [...lignesSortie, [], [...totaux, ...totalCol,
          ...(voirTotalColonnes ? [totalCol.reduce((t, v) => t + v, 0)] : [])]];
        decoration = { lignes: [...marques, {}, { total: true }] };
      } else {
        lignes = lignesSortie;
        decoration = { lignes: marques };
      }
    }

    const largeurs = entetes.map((e) => Math.min(44, Math.max(12, String(e).length + 4)));
    const titre = texte(corps.titre) || 'Table générée — Inspections sur aire de trafic';
    const buffer = classeur(titre, entetes, lignes, largeurs, 'Table', decoration);

    // Le client peut demander le fichier tout de suite, ou un jeton pour aller
    // le chercher par une navigation — c'est ce que fait le générateur.
    if (corps.differe) {
      const jeton = deposerClasseur(buffer, 'table_safa.xlsx', req.user.username);
      return res.json({ jeton, url: `${M}/tables/fichier/${jeton}`, lignes: lignes.length });
    }
    envoyer(res, buffer, 'table_safa.xlsx');
    return undefined;
  });

  const ENTETES_INSP = ['Date', 'Pays', 'Exploitant', 'Aéronef', 'Immatriculation', 'N° Vol',
    'Statut', 'Items Inspectés', 'Item', 'Std Ref.', 'Description', 'Catégorie', 'Action', 'Suivi'];

  app.post(`${M}/inspections/export-xlsx`, requireAuth, (req, res) => {
    const inspections = filtrer((req.body || {}).filtres, req);
    const lignes = [];
    inspections.forEach((i) => {
      const base = [i.date || '', i.pays || '', i.exploitant || '', i.aeronef || '',
        i.immatriculation || '', i.vol || '', i.status || '', Number(i.itemsInspectes) || 0];
      if (!i.anomalies.length) {
        lignes.push([...base, '', '', 'Aucun écart constaté', '', '', '']);
        return;
      }
      i.anomalies.forEach((a) => lignes.push([...base,
        a.itemCode || '', a.stdRef || '', a.description || '',
        a.categorie || '', a.action || '', a.suivi || '']));
    });
    envoyer(res, classeur('Inspections sur aire de trafic', ENTETES_INSP, lignes,
      [12, 14, 20, 14, 16, 10, 12, 14, 8, 18, 44, 10, 10, 14], 'Inspections'),
    'inspections_safa.xlsx');
  });

  const ENTETES_ECARTS = ['Item', 'Libellé item', 'Std Ref.', 'Description', 'Catégorie', 'Action',
    'Date', 'Pays', 'Exploitant', 'Aéronef', 'Immatriculation', 'Statut', 'Suivi'];

  app.post(`${M}/ecarts/export-xlsx`, requireAuth, (req, res) => {
    const libelles = Object.fromEntries(db.list('parametres')
      .filter((p) => p.type === 'items').map((p) => [p.code, p.label]));
    const lignes = [];
    filtrer((req.body || {}).filtres, req).forEach((i) => {
      const F = (req.body || {}).filtres || {};
      i.anomalies
        .filter((a) => (!F.categorie || String(a.categorie) === String(F.categorie))
          && (!F.action || String(a.action) === String(F.action)))
        .forEach((a) => lignes.push([
          a.itemCode || '', libelles[a.itemCode] || '', a.stdRef || '', a.description || '',
          a.categorie || '', a.action || '', i.date || '', i.pays || '', i.exploitant || '',
          i.aeronef || '', i.immatriculation || '', i.status || '', a.suivi || '',
        ]));
    });
    envoyer(res, classeur('Écarts relevés sur aire de trafic', ENTETES_ECARTS, lignes,
      [8, 34, 18, 44, 10, 10, 12, 14, 20, 14, 16, 12, 14], 'Ecarts'),
    'ecarts_safa.xlsx');
  });

  // Situation générale par exploitant, avec le détail par item.
  app.post(`${M}/situation/export-xlsx`, requireAuth, (req, res) => {
    const donnees = (req.body || {}).lignes;
    if (!Array.isArray(donnees)) return res.status(400).json({ error: 'Aucune donnée à exporter' });
    const entetes = ['Exploitant', 'Ligne', 'Item', 'Inspections', 'Items inspectés',
      'Cat 1', 'Taux clôt. 1', 'Cat 2', 'Taux clôt. 2', 'Cat 3', 'Taux clôt. 3',
      'Cat G', 'Taux clôt. G', 'Total écarts', 'Taux clôture', 'Score'];
    const lignes = donnees.map((l) => entetes.map((_, n) => (l[n] === undefined ? '' : l[n])));
    envoyer(res, classeur('Situation générale par exploitant', entetes, lignes,
      [24, 18, 34, 12, 14, 8, 12, 8, 12, 8, 12, 8, 12, 12, 12, 10], 'Situation'),
    'situation_safa.xlsx');
  });

  app.post(`${M}/parametres/export-xlsx`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, 'Hors de la vue Prestataire');
    const famille = String((req.body || {}).famille || '');
    if (!db.FAMILLES.includes(famille)) return res.status(400).json({ error: 'Famille inconnue' });
    // Le groupe d'items est stocké par son code : c'est son intitulé qu'on
    // exporte, un code technique ne se lit pas dans un classeur.
    const groupes = Object.fromEntries(db.list('parametres')
      .filter((p) => p.type === 'groupes').map((p) => [p.code, p.label]));
    const entetes = ['Code', famille === 'items' ? 'Item' : 'Libellé',
      "Groupe d'items", 'Description', 'Pondération', 'Actif'];
    const lignes = db.list('parametres').filter((p) => p.type === famille)
      .map((p) => [p.code || '', p.label || '',
        groupes[p.cat] || p.cat || '', p.description || '',
        p.ponderation === null || p.ponderation === undefined ? '' : p.ponderation,
        p.actif === false ? 'Non' : 'Oui']);
    envoyer(res, classeur(`Paramètres — ${famille}`, entetes, lignes,
      [12, 44, 22, 50, 14, 8], 'Parametres'), `parametres_${famille}.xlsx`);
  });

  app.post(`${M}/contacts/export-xlsx`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, 'Hors de la vue Prestataire');
    const entetes = ['État', 'Nom', 'Prénoms', 'Fonction', 'Courriel', 'Téléphone', 'Autres', 'Actif'];
    const lignes = db.list('contacts')
      .sort((a, b) => String(a.etat).localeCompare(String(b.etat))
        || String(a.nom).localeCompare(String(b.nom)))
      .map((c) => [c.etat || '', c.nom || '', c.prenom || '', c.fonction || '',
        c.email || '', c.telephone || '', c.autres || '', c.actif === false ? 'Non' : 'Oui']);
    envoyer(res, classeur('Carnet de contacts', entetes, lignes, [18, 20, 20, 26, 30, 18, 30, 8], 'Contacts'),
      'contacts_safa.xlsx');
  });
};

module.exports.dateISO = dateISO;
module.exports.COLONNES = COLONNES;
