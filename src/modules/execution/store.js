// Module « Exécution de la Surveillance » — accès aux données.
//
// Reprise du module PESSCO (Flask + SQLite) sur le socle OASIS. Les tables
// `exec_*` deviennent les collections de ce module ; les jointures SQL sont
// remplacées par des enrichissements explicites au moment de la lecture.
//
// ── Cinquième et dernier magasin de module en base (ADR-002, jalon n° 13) ──
//
// Le vocabulaire commun aux cinq vit dans `src/magasin_module.js`. Ce module tire
// ses identifiants lui-même et ne porte pas de dates automatiques : d'où les deux
// options, comme « Mesures d'Application » et RAMP.
//
// Il porte deux gestes qu'une conversion naïve aurait cassés :
//
//   · `removeDossier` retirait un dossier et ses trois dépendances par **quatre
//     écritures**. Entre elles, des constatations et des rapports sans dossier
//     pour les atteindre — ce que la fonction existe précisément pour empêcher ;
//   · la composition des références (`references.js`) déduit le numéro suivant des
//     références existantes, puis l'enregistrement s'écrit séparément. Deux
//     créations simultanées auraient porté la même — et une référence désigne un
//     acte de surveillance.
const crypto = require('crypto');
const { magasinDeModule } = require('../../magasin_module');

const base = magasinDeModule('execution', { identifiantParLeMagasin: false, horodater: false });

const COLLECTIONS = [
  'notifications',      // exec_notifications
  'echanges',           // exec_echanges
  'dossiers',           // exec_dossiers
  'constatations',      // exec_constatations (FNC / PAC)
  'rapports',           // exec_rapports
  'criticites',         // exec_criticites
  'types_cas',          // exec_types_cas
  'checklists',         // exec_checklists
  'checklist_items',    // exec_checklist_items
  'checklist_statuts',  // exec_checklist_statuts
  'checklist_sous_themes', // exec_checklist_sous_themes
  'checklist_responses',   // exec_checklist_responses
  'vues',               // vue active (AAC / Prestataire) par utilisateur
  'parametres',         // délais du processus et autres réglages du module
  'rappels',            // rappels adressés aux responsables d'activités
  'processus',          // intervenants par secteur, étape par étape
  'roles_equipe',       // rôles d'une équipe d'audit / inspection
];

const { load, save, transformer, list, get, insert, update, remove, removeWhere, INCHANGE } = base;



const uid = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();

async function seed() {
  const existant = await load();
  if (Object.keys(existant).length) return;
  const vide = {};
  COLLECTIONS.forEach((c) => { vide[c] = []; });
  await save({ ...vide, createdAt: now() });
}

// Retrait d'un dossier et de tout ce qui n'existe que par lui.
//
// **Une seule transformation**, là où il y en avait quatre. Entre elles,
// l'application portait des constatations et des rapports dont le dossier avait
// disparu — exactement ce que cette fonction existe pour empêcher — et un échec au
// milieu les y laissait pour de bon.
//
// ── Les constatations ne sont pas détruites, elles sont retirées ──
//
// Une constatation peut fonder une mesure d'application prise dans un autre
// module. Jusqu'ici, le module source demandait à CARE s'il avait bâti quelque
// chose, puis supprimait ; depuis que le bus est asynchrone, une mesure peut être
// prononcée **entre la question et la suppression**, et la sanction perdait alors
// l'écart qui la fonde.
//
// Décision de la maîtrise d'ouvrage du 3 octobre 2026 : on marque au lieu
// d'effacer. La constatation porte `retire_le`, disparaît de toutes les listes, et
// ne se détruit pas. La fenêtre existe toujours ; **il ne s'y passe plus rien
// d'irréversible**, et c'est ce qui la rend sans conséquence.
//
// Le reste — rapports, réponses de checklist, le dossier lui-même — est détruit :
// aucun autre module n'y rattache quoi que ce soit.
async function removeDossier(id, par) {
  if (!id) return false;
  let ote = false;
  await transformer((d) => {
    const arr = d.dossiers || [];
    const i = arr.findIndex((r) => r.id === id);
    ote = i >= 0;
    if (!ote) return INCHANGE;
    arr.splice(i, 1);
    base.marquerRetire(d, 'constatations', (c) => c.dossier_id === id, par);
    d.rapports = (d.rapports || []).filter((r) => r.dossier_id !== id);
    d.checklist_responses = (d.checklist_responses || []).filter((r) => r.dossier_id !== id);
    return d;
  });
  return ote;
}

// Référence séquentielle « PREFIXE-ANNÉE-001 », identique à PESSCO.
module.exports = {
  ...base,
  COLLECTIONS, removeDossier, uid, now, seed,
};
