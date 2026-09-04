// Module « Mesures d'Application » — états exportables des carences et des mesures.
//
// Deux formats, une seule source : les lignes que l'écran affiche, filtrées
// comme il les filtre. Le classeur sert au retraitement, le PDF à la
// transmission — d'où un document daté, titré et paginé plutôt qu'une capture
// de tableau.
const XLSX = require('xlsx-js-style');

const AUTORITE = 'UEMOA / URSAC — OASIS';
const SOUS_TITRE = 'Outil d’Administration et de Supervision Intégrée de la Sécurité';

const texte = (v) => String(v === undefined || v === null ? '' : v);
const date = (v) => {
  const s = texte(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : '';
};
const echapper = (v) => texte(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ══════════════════════════════════════
//  Classeur
// ══════════════════════════════════════
// L'entête est figée et filtrable : un état de cent lignes se trie sur place,
// sans qu'il faille le reconstruire.
const ENTETE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  fill: { fgColor: { rgb: '1A365D' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: ['top', 'bottom', 'left', 'right'].reduce((a, c) => (
    { ...a, [c]: { style: 'thin', color: { rgb: '1A365D' } } }), {}),
};
const CELLULE = {
  font: { sz: 10 },
  alignment: { vertical: 'top', wrapText: true },
  border: ['top', 'bottom', 'left', 'right'].reduce((a, c) => (
    { ...a, [c]: { style: 'thin', color: { rgb: 'D8DEE8' } } }), {}),
};

function feuille(colonnes, lignes) {
  const entetes = colonnes.map((c) => c.titre);
  const ws = XLSX.utils.aoa_to_sheet([entetes, ...lignes]);
  const fin = XLSX.utils.decode_range(ws['!ref']);
  for (let l = fin.s.r; l <= fin.e.r; l += 1) {
    for (let c = fin.s.c; c <= fin.e.c; c += 1) {
      const ref = XLSX.utils.encode_cell({ r: l, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = l === 0 ? ENTETE : {
        ...CELLULE,
        // Une ligne sur deux se teinte : cent lignes se suivent mieux ainsi.
        ...(l % 2 === 0 ? { fill: { fgColor: { rgb: 'F5F7FA' } } } : {}),
      };
    }
  }
  ws['!cols'] = colonnes.map((c) => ({ wch: c.largeur || 18 }));
  ws['!rows'] = [{ hpt: 26 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: fin.e.r, c: fin.e.c } }) };
  return ws;
}

function classeur(nomFeuille, colonnes, lignes) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, feuille(colonnes, lignes), nomFeuille);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ══════════════════════════════════════
//  Document PDF
// ══════════════════════════════════════
// A4 paysage : les états portent huit à dix colonnes, que le portrait
// écraserait. L'entête du tableau se répète à chaque page.
function documentHtml({ titre, criteres, colonnes, lignes }) {
  const maintenant = new Date();
  const horodatage = `${date(maintenant.toISOString())} à ${maintenant.toISOString().slice(11, 16)} UTC`;
  const cellules = (l) => l.map((v, i) => `<td class="${colonnes[i].classe || ''}">${
    echapper(v)}</td>`).join('');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; color: #0f172a; font-size: 8.5pt; }
  .entete { border-bottom: 2px solid #1a365d; padding-bottom: 6px; margin-bottom: 10px;
            display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .autorite { font-size: 10pt; font-weight: 700; color: #1a365d; letter-spacing: .02em; }
  .sous-titre { font-size: 7.5pt; color: #64748b; margin-top: 1px; }
  .titre { font-size: 13pt; font-weight: 700; margin: 0; }
  .edition { font-size: 7.5pt; color: #64748b; text-align: right; white-space: nowrap; }
  .criteres { font-size: 7.5pt; color: #334155; margin: 0 0 8px;
              background: #f1f5f9; border-left: 3px solid #1a365d; padding: 4px 8px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { background: #1a365d; color: #fff; font-size: 7.5pt; font-weight: 700;
       text-transform: uppercase; letter-spacing: .03em; text-align: left;
       padding: 5px 6px; border: .5pt solid #1a365d; }
  td { padding: 4px 6px; border: .5pt solid #d8dee8; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f7f9fc; }
  tr { page-break-inside: avoid; }
  td.centre { text-align: center; }
  td.etroit { white-space: nowrap; }
  .vide { text-align: center; color: #64748b; font-style: italic; padding: 14px; }
  .pied { margin-top: 10px; border-top: .5pt solid #d8dee8; padding-top: 4px;
          font-size: 7pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style></head>
<body>
  <div class="entete">
    <div>
      <div class="autorite">${echapper(AUTORITE)}</div>
      <div class="sous-titre">${echapper(SOUS_TITRE)}</div>
      <h1 class="titre">${echapper(titre)}</h1>
    </div>
    <div class="edition">Édité le ${echapper(horodatage)}<br>${lignes.length} ligne(s)</div>
  </div>
  <p class="criteres"><strong>Critères :</strong> ${echapper(criteres || 'aucun filtre')}</p>
  <table>
    <thead><tr>${colonnes.map((c) => `<th style="width:${c.part}">${echapper(c.titre)}</th>`).join('')}</tr></thead>
    <tbody>${lignes.length
      ? lignes.map((l) => `<tr>${cellules(l)}</tr>`).join('')
      : `<tr><td class="vide" colspan="${colonnes.length}">Aucune ligne ne correspond aux critères retenus.</td></tr>`}
    </tbody>
  </table>
  <div class="pied">
    <span>${echapper(AUTORITE)} — Mesures d’Application</span>
    <span>Document de travail — diffusion interne</span>
  </div>
</body></html>`;
}

// ══════════════════════════════════════
//  Les deux états
// ══════════════════════════════════════

const COLONNES_CARENCES = [
  { titre: 'Référence', largeur: 16, part: '9%', classe: 'etroit' },
  { titre: 'Origine', largeur: 20, part: '10%' },
  { titre: 'Objet', largeur: 40, part: '20%' },
  { titre: 'Description', largeur: 50, part: '21%' },
  { titre: 'Prestataire', largeur: 26, part: '13%' },
  { titre: 'Ouverture', largeur: 12, part: '7%', classe: 'centre etroit' },
  { titre: 'Échéance', largeur: 12, part: '7%', classe: 'centre etroit' },
  { titre: 'Statut', largeur: 18, part: '8%', classe: 'centre' },
  { titre: 'Clôture', largeur: 12, part: '5%', classe: 'centre etroit' },
];

const ORIGINES = {
  SURV: 'Exécution de la Surveillance',
  SAFA: 'RAMP Inspections',
  CARE: 'Relevée ici',
};
const STATUTS_CARE = {
  a_traiter: 'À traiter', sous_mesure: 'Sous mesure',
  traitee: 'Traitée', classee: 'Classée',
};

const ligneCarence = (c) => [
  texte(c.reference), ORIGINES[c.origine] || texte(c.origine),
  texte(c.titre), texte(c.description),
  texte(c.prestataire_nom), date(c.date_ouverture), date(c.date_due_cloture),
  STATUTS_CARE[c.statut_care] || texte(c.statut_care), date(c.date_cloture),
];

const COLONNES_MESURES = [
  { titre: 'Référence', largeur: 16, part: '9%', classe: 'etroit' },
  { titre: 'Carence', largeur: 16, part: '9%', classe: 'etroit' },
  { titre: 'Prestataire', largeur: 26, part: '14%' },
  { titre: 'Catégorie', largeur: 22, part: '12%' },
  { titre: 'Type', largeur: 22, part: '12%' },
  { titre: 'Description de la sanction', largeur: 45, part: '19%' },
  { titre: 'Date de sanction', largeur: 14, part: '7%', classe: 'centre etroit' },
  { titre: 'Portée', largeur: 20, part: '9%' },
  { titre: 'Échéance', largeur: 14, part: '5%', classe: 'centre etroit' },
  { titre: 'Statut de suivi', largeur: 20, part: '9%', classe: 'centre' },
];

const PORTEES = {
  temporelle: 'Limitée dans le temps', illimitee: 'Illimitée', sans_objet: 'Sans objet',
};
const SUIVIS = {
  attendu: 'Plan attendu', en_cours: 'En cours de mise en œuvre', solde: 'Soldé',
  sans_suite: 'Sans suite', sans_objet: 'Suivi sans objet', recours: 'Recours',
};
// Le statut affiché se déduit comme à l'écran : le suivi fait foi dès qu'il
// est posé, le circuit de la mesure prend le relais sinon.
const suiviDe = (m) => {
  if (SUIVIS[m.suivi_statut]) return SUIVIS[m.suivi_statut];
  if (m.recours_intente) return SUIVIS.recours;
  if (m.statut === 'annulee') return SUIVIS.sans_suite;
  if (m.statut === 'cloturee') return SUIVIS.solde;
  if (m.statut === 'en_cours') return SUIVIS.en_cours;
  return SUIVIS.attendu;
};

const ligneMesure = (m, libelleCategorie, libelleType) => {
  const portee = PORTEES[m.portee] || '';
  const duree = m.portee === 'temporelle' && m.duree_valeur
    ? ` (${m.duree_valeur} ${m.duree_unite || 'jours'})` : '';
  return [
    texte(m.reference), texte(m.constatation_ref), texte(m.prestataire_nom),
    libelleCategorie(m.categorie), libelleType(m.type_mesure),
    texte(m.description || m.objet),
    date(m.date_sanction || m.date_emission), portee + duree,
    date(m.date_echeance), suiviDe(m),
  ];
};

module.exports = {
  classeurCarences: (rows) => classeur('Carences', COLONNES_CARENCES, rows.map(ligneCarence)),
  htmlCarences: (rows, criteres) => documentHtml({
    titre: 'État des carences', criteres,
    colonnes: COLONNES_CARENCES, lignes: rows.map(ligneCarence),
  }),
  classeurMesures: (rows, cat, typ) => classeur('Mesures', COLONNES_MESURES,
    rows.map((m) => ligneMesure(m, cat, typ))),
  htmlMesures: (rows, criteres, cat, typ) => documentHtml({
    titre: 'État des mesures d’application', criteres,
    colonnes: COLONNES_MESURES, lignes: rows.map((m) => ligneMesure(m, cat, typ)),
  }),
};
