// Référentiels de configuration du portail (repris du module Configuration PESSCO) :
// organisation, domaines/secteurs/sous-activités, thèmes, exigences, prestataires,
// inspecteurs, types/modes de supervision, niveaux de qualification.
const crypto = require('crypto');
const store = require('./store');

const COLLECTIONS = [
  'organisation_levels',
  'organisation',
  'domaines',
  'secteurs',
  'sous_activites',
  'themes_supervision',
  'exigences',
  'prestataires',
  'inspecteurs',
  'types_supervision',
  'modes_supervision',
  'niveaux_qualifications',
  'specialites_inspecteur',
  'organisation_assignments',
];

function uid() {
  return crypto.randomBytes(6).toString('hex');
}

function seedReferentiels() {
  const existing = store.load('referentiels', null);
  if (existing) return;
  const data = {
    organisation_levels: [
      { id: uid(), type: 'Administration', ordre: 1 },
      { id: uid(), type: 'Direction', ordre: 2 },
      { id: uid(), type: 'Service', ordre: 3 },
      { id: uid(), type: 'Division', ordre: 4 },
    ],
    organisation: [],
    domaines: [
      { id: 'OPS', code: 'OPS', nom: 'Exploitation aérienne', description: 'Opérations de transport aérien et travail aérien', statut: 'actif' },
      { id: 'AIR', code: 'AIR', nom: 'Navigabilité', description: 'Navigabilité des aéronefs et organismes de maintenance', statut: 'actif' },
      { id: 'PEL', code: 'PEL', nom: 'Licences du personnel', description: 'Licences et qualifications du personnel aéronautique', statut: 'actif' },
      { id: 'ANS', code: 'ANS', nom: 'Navigation aérienne', description: 'Services de la navigation aérienne', statut: 'actif' },
      { id: 'AGA', code: 'AGA', nom: 'Aérodromes', description: 'Certification et surveillance des aérodromes', statut: 'actif' },
      { id: 'MED', code: 'MED', nom: 'Médecine aéronautique', description: 'Centres et examinateurs de médecine aéronautique', statut: 'actif' },
    ],
    secteurs: [
      { id: 'OPS-TAC', code: 'TAC', domaine_id: 'OPS', nom: 'Transport aérien commercial', csn: 24, statut: 'actif' },
      { id: 'OPS-TA', code: 'TA', domaine_id: 'OPS', nom: 'Travail aérien', csn: 36, statut: 'actif' },
      { id: 'AIR-OMA', code: 'OMA', domaine_id: 'AIR', nom: 'Organismes de maintenance', csn: 24, statut: 'actif' },
      { id: 'PEL-OF', code: 'OF', domaine_id: 'PEL', nom: 'Organismes de formation', csn: 36, statut: 'actif' },
      { id: 'ANS-ATS', code: 'ATS', domaine_id: 'ANS', nom: 'Services de la circulation aérienne', csn: 24, statut: 'actif' },
      { id: 'AGA-CERT', code: 'ADR', domaine_id: 'AGA', nom: 'Aérodromes certifiés', csn: 36, statut: 'actif' },
    ],
    sous_activites: [
      { id: uid(), code: 'PAX', secteur_id: 'OPS-TAC', nom: 'Transport de passagers' },
      { id: uid(), code: 'CGO', secteur_id: 'OPS-TAC', nom: 'Transport de fret' },
    ],
    themes_supervision: [
      { id: uid(), code: 'SGS', libelle: 'Système de gestion de la sécurité (SGS)', domaine_id: 'OPS', secteur_id: 'OPS-TAC', description: 'Évaluation du SGS des exploitants', statut: 'actif' },
      { id: uid(), code: 'NAV', libelle: 'Maintien de la navigabilité', domaine_id: 'AIR', secteur_id: 'AIR-OMA', description: 'Gestion du maintien de la navigabilité', statut: 'actif' },
    ],
    exigences: [
      { id: uid(), reglement: 'RAB-OPS (Exploitation)', reference: 'RAB-OPS 1.037', libelle: "Programme de prévention des accidents et de sécurité des vols", date_adoption: '2023-06-15', domaine_id: 'OPS', secteur_id: 'OPS-TAC', theme: 'SGS', moyen_controle: 'Examen documentaire + entretien', statut: 'actif' },
      { id: uid(), reglement: 'RAB-OPS (Exploitation)', reference: 'RAB-OPS 1.085', libelle: "Responsabilités de l'équipage", date_adoption: '2023-06-15', domaine_id: 'OPS', secteur_id: 'OPS-TAC', theme: 'OPS', moyen_controle: 'Examen documentaire', statut: 'actif' },
      { id: uid(), reglement: 'RAB-145 (Maintenance)', reference: 'RAB-145.A.30', libelle: "Exigences en matière de personnel de l'organisme de maintenance", date_adoption: '2022-11-02', domaine_id: 'AIR', secteur_id: 'AIR-OMA', theme: 'Personnel', moyen_controle: 'Inspection sur site', statut: 'actif' },
    ],
    prestataires: [
      { id: uid(), nom: 'Air Bénin Express', trigramme: 'ABE', domaine_id: 'OPS', secteur_id: 'OPS-TAC', dirigeant: 'K. Adjovi', point_focal: 'S. Dossou', email_prestataire: 'contact@abe.bj', ref_agrement: 'CTA-BJ-001', statut: 'actif' },
      { id: uid(), nom: 'AeroMaint Cotonou', trigramme: 'AMC', domaine_id: 'AIR', secteur_id: 'AIR-OMA', dirigeant: 'F. Houngbo', point_focal: 'R. Zinsou', email_prestataire: 'contact@aeromaint.bj', ref_agrement: 'OMA-BJ-004', statut: 'actif' },
    ],
    inspecteurs: [
      { id: uid(), nom: 'AHOYO', prenom: 'Marcelin', numero_inspecteur: 'INS-OPS-01', email: 'm.ahoyo@aac.bj', specialite: 'Opérations aériennes', niveau_qualification: 'Qualifié', statut: 'actif' },
      { id: uid(), nom: 'KOSSOU', prenom: 'Estelle', numero_inspecteur: 'INS-AIR-02', email: 'e.kossou@aac.bj', specialite: 'Navigabilité', niveau_qualification: 'Senior', statut: 'actif' },
    ],
    types_supervision: [
      { id: uid(), type_supervision: 'Audit', description: 'Évaluation systématique et documentée', duree_standard: 5, statut: 'actif' },
      { id: uid(), type_supervision: 'Inspection', description: 'Vérification ciblée sur site', duree_standard: 2, statut: 'actif' },
      { id: uid(), type_supervision: 'Contrôle inopiné', description: 'Vérification sans préavis', duree_standard: 1, statut: 'actif' },
      { id: uid(), type_supervision: 'Suivi de PAC', description: "Vérification de la mise en œuvre des plans d'actions correctives", duree_standard: 1, statut: 'actif' },
    ],
    modes_supervision: [
      { id: uid(), mode: 'Sur site', description: 'Activité conduite dans les locaux du prestataire', statut: 'actif' },
      { id: uid(), mode: 'Hors site', description: 'Examen documentaire à distance', statut: 'actif' },
      { id: uid(), mode: 'Mixte', description: 'Combinaison sur site et hors site', statut: 'actif' },
    ],
    niveaux_qualifications: [
      { id: uid(), libelle: 'Stagiaire', ordre: 1, statut: 'actif' },
      { id: uid(), libelle: 'En formation (OJT)', ordre: 2, statut: 'actif' },
      { id: uid(), libelle: 'Qualifié', ordre: 3, statut: 'actif' },
      { id: uid(), libelle: 'Senior', ordre: 4, statut: 'actif' },
      { id: uid(), libelle: 'Formateur', ordre: 5, statut: 'actif' },
    ],
    specialites_inspecteur: [
      { id: uid(), libelle: 'Exploitation technique (OPS)', domaines: ['OPS'], statut: 'actif' },
      { id: uid(), libelle: 'Navigabilité (AIR)', domaines: ['AIR'], statut: 'actif' },
      { id: uid(), libelle: 'Licences du personnel (PEL)', domaines: ['PEL'], statut: 'actif' },
      { id: uid(), libelle: 'Navigation aérienne (ANS)', domaines: ['ANS'], statut: 'actif' },
      { id: uid(), libelle: 'Aérodromes (AGA)', domaines: ['AGA'], statut: 'actif' },
      { id: uid(), libelle: 'Médecine aéronautique (MED)', domaines: ['MED'], statut: 'actif' },
    ],
  };
  store.save('referentiels', data);
}

function getAll() {
  return store.load('referentiels', {});
}

// Collections dont le « code » est une clé secondaire : unique, il sert de
// référence dans les fichiers Excel à la place de l'identifiant technique.
const CODE_KEYED = ['domaines', 'secteurs', 'sous_activites', 'themes_supervision'];

const normCode = (v) => String(v == null ? '' : v).trim().toUpperCase();

// Renvoie l'enregistrement qui utilise déjà ce code (hors exceptId), sinon null
function findByCode(collection, code, exceptId, data) {
  const c = normCode(code);
  if (!c || !CODE_KEYED.includes(collection)) return null;
  const list = (data || getAll())[collection] || [];
  return list.find((r) => normCode(r.code) === c && r.id !== exceptId) || null;
}

function createItem(collection, item) {
  if (!COLLECTIONS.includes(collection)) return null;
  const data = getAll();
  if (CODE_KEYED.includes(collection)) {
    if (!normCode(item.code)) return { error: 'code_required' };
    if (findByCode(collection, item.code, null, data)) return { error: 'duplicate_code' };
  }
  const record = { id: uid(), ...item };
  if (CODE_KEYED.includes(collection)) record.code = normCode(record.code);
  data[collection] = data[collection] || [];
  data[collection].push(record);
  store.save('referentiels', data);
  return record;
}

function updateItem(collection, id, patch) {
  if (!COLLECTIONS.includes(collection)) return null;
  const data = getAll();
  const list = data[collection] || [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  if (CODE_KEYED.includes(collection) && patch.code !== undefined) {
    if (!normCode(patch.code)) return { error: 'code_required' };
    if (findByCode(collection, patch.code, id, data)) return { error: 'duplicate_code' };
    patch = { ...patch, code: normCode(patch.code) };
  }
  list[idx] = { ...list[idx], ...patch, id };
  store.save('referentiels', data);
  return list[idx];
}

// Hiérarchie des activités supervisées : supprimer un parent supprime ses
// enfants, sinon ils subsistent invisibles dans l'interface mais réapparaissent
// à l'export. Les exigences et prestataires ne sont pas touchés.
const CHILDREN = {
  domaines: [['secteurs', 'domaine_id'], ['themes_supervision', 'domaine_id']],
  secteurs: [['sous_activites', 'secteur_id'], ['themes_supervision', 'secteur_id']],
  sous_activites: [['themes_supervision', 'sous_activite_id']],
};

function removeCascade(data, collection, id, counts) {
  const list = data[collection] || [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  list.splice(idx, 1);
  counts[collection] = (counts[collection] || 0) + 1;
  for (const [childColl, fk] of CHILDREN[collection] || []) {
    const doomed = (data[childColl] || []).filter((r) => r[fk] === id).map((r) => r.id);
    for (const childId of doomed) removeCascade(data, childColl, childId, counts);
  }
  return true;
}

function deleteItem(collection, id) {
  if (!COLLECTIONS.includes(collection)) return false;
  const data = getAll();
  const counts = {};
  if (!removeCascade(data, collection, id, counts)) return false;
  store.save('referentiels', data);
  return counts;
}

// Enregistrements dont le parent n'existe plus : invisibles dans l'interface,
// ils fausseraient les exports. `apply` = true pour les supprimer.
function orphans(apply) {
  const data = getAll();
  const counts = {};
  let changed = true;
  while (changed) {
    changed = false;
    for (const [parent, links] of Object.entries(CHILDREN)) {
      const ids = new Set((data[parent] || []).map((r) => r.id));
      for (const [childColl, fk] of links) {
        for (const child of (data[childColl] || []).slice()) {
          if (!child[fk] || ids.has(child[fk])) continue;
          counts[childColl] = (counts[childColl] || 0) + 1;
          if (apply) {
            const arr = data[childColl];
            arr.splice(arr.findIndex((r) => r.id === child.id), 1);
            changed = true;
          }
        }
      }
      if (!apply) break; // sans suppression, une seule passe suffit au comptage
    }
    if (!apply) break;
  }
  if (apply) store.save('referentiels', data);
  return counts;
}

// Doublons de code présents en base (contrôle d'intégrité)
function duplicateCodes() {
  const data = getAll();
  const out = {};
  for (const coll of CODE_KEYED) {
    const seen = new Map();
    for (const r of data[coll] || []) {
      const c = normCode(r.code);
      if (!c) continue;
      seen.set(c, (seen.get(c) || 0) + 1);
    }
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([c, n]) => ({ code: c, count: n }));
    if (dups.length) out[coll] = dups;
  }
  return out;
}

module.exports = {
  COLLECTIONS, CODE_KEYED, seedReferentiels, getAll, createItem, updateItem, deleteItem,
  orphans, findByCode, normCode, duplicateCodes,
};
