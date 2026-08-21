// Module « Exécution de la Surveillance » — composition des références.
//
// Chaque objet du circuit porte une référence : activité, notification,
// rapport, constatation. Sa composition n'est pas figée dans le code : un
// administrateur la définit dans Paramètres → Autres paramètres, en ordonnant
// des segments (préfixe, État, domaine, secteur, prestataire, année, mois,
// numéro d'ordre). À défaut de modèle enregistré, le format historique du
// module s'applique, à l'identique.
const db = require('./store');

// Segments proposés à l'administrateur. `valeur` lit le contexte de l'objet
// pour lequel la référence est produite.
const SEGMENTS = {
  prefixe: { libelle: 'Préfixe', saisie: true, valeur: (ctx, arg) => arg || '' },
  etat: { libelle: 'Code État (bigramme)', valeur: (ctx) => ctx.etat || '' },
  domaine: { libelle: 'Code domaine', valeur: (ctx) => ctx.domaine || '' },
  secteur: { libelle: 'Code secteur', valeur: (ctx) => ctx.secteur || '' },
  prestataire: { libelle: 'Code prestataire', valeur: (ctx) => ctx.prestataire || '' },
  annee: { libelle: 'Année (AAAA)', valeur: (ctx) => String(ctx.annee || new Date().getFullYear()) },
  annee_courte: { libelle: 'Année (AA)', valeur: (ctx) => String(ctx.annee || new Date().getFullYear()).slice(-2) },
  mois: { libelle: 'Mois (MM)', valeur: () => String(new Date().getMonth() + 1).padStart(2, '0') },
  texte: { libelle: 'Texte libre', saisie: true, valeur: (ctx, arg) => arg || '' },
  numero: { libelle: 'Numéro d’ordre', longueur: true, valeur: () => '' },  // posé en dernier lieu
};

// Modèles par défaut : ils reproduisent les références actuelles.
const MODELES_DEFAUT = {
  activite: {
    separateur: '-',
    segments: [
      { type: 'prefixe', valeur: 'ACT' }, { type: 'etat' }, { type: 'domaine' },
      { type: 'annee' }, { type: 'numero', longueur: 3 },
    ],
  },
  notification: {
    separateur: '-',
    segments: [{ type: 'prefixe', valeur: 'NOTIF' }, { type: 'annee' }, { type: 'numero', longueur: 3 }],
  },
  rapport: {
    separateur: '-',
    segments: [{ type: 'prefixe', valeur: 'RAP' }, { type: 'annee' }, { type: 'numero', longueur: 3 }],
  },
  rapport_final: {
    separateur: '-',
    segments: [{ type: 'prefixe', valeur: 'RAPF' }, { type: 'annee' }, { type: 'numero', longueur: 3 }],
  },
  constatation: {
    separateur: '-',
    segments: [
      { type: 'prefixe', valeur: 'FNC' }, { type: 'domaine' },
      { type: 'annee' }, { type: 'numero', longueur: 3 },
    ],
  },
  dossier: {
    separateur: '-',
    segments: [{ type: 'prefixe', valeur: 'DOSS' }, { type: 'annee' }, { type: 'numero', longueur: 3 }],
  },
};

// Où chaque référence est stockée : la numérotation se poursuit par famille.
const SOURCES = {
  activite: { coll: 'notifications', champ: 'reference_activite' },
  notification: { coll: 'notifications', champ: 'reference' },
  rapport: { coll: 'rapports', champ: 'reference' },
  rapport_final: { coll: 'dossiers', champ: 'final_reference' },
  constatation: { coll: 'constatations', champ: 'reference' },
  dossier: { coll: 'dossiers', champ: 'reference' },
};

function modeles() {
  const enregistre = (db.list('parametres') || []).find((p) => p.id === 'references') || {};
  return { ...MODELES_DEFAUT, ...(enregistre.modeles || {}) };
}

// Partie fixe de la référence : tout sauf le numéro d'ordre.
function prefixeDe(modele, contexte) {
  const sep = modele.separateur === undefined ? '-' : modele.separateur;
  const parties = (modele.segments || [])
    .filter((s) => s.type !== 'numero')
    .map((s) => {
      const seg = SEGMENTS[s.type];
      return seg ? String(seg.valeur(contexte || {}, s.valeur) || '').trim() : '';
    })
    .filter(Boolean);
  return { texte: parties.join(sep), sep };
}

// Référence suivante pour une famille donnée. Le numéro d'ordre reprend la
// numérotation des références partageant la même partie fixe.
function suivante(type, contexte) {
  const modele = modeles()[type] || MODELES_DEFAUT[type];
  const source = SOURCES[type];
  if (!modele || !source) return '';
  const { texte, sep } = prefixeDe(modele, contexte);
  const segNumero = (modele.segments || []).find((s) => s.type === 'numero');
  if (!segNumero) return texte;

  const debut = texte ? `${texte}${sep}` : '';
  const existantes = db.list(source.coll)
    .map((r) => r[source.champ])
    .filter((v) => typeof v === 'string' && v.startsWith(debut));
  let seq = 1;
  existantes.forEach((v) => {
    const n = parseInt(String(v).slice(debut.length), 10);
    if (!Number.isNaN(n) && n >= seq) seq = n + 1;
  });
  return `${debut}${String(seq).padStart(Number(segNumero.longueur) || 3, '0')}`;
}

module.exports = { SEGMENTS, MODELES_DEFAUT, SOURCES, modeles, suivante };
