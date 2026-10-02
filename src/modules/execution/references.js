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

// Les modèles enregistrés, lus dans l'état qu'on regarde ou qu'on écrit. Deux
// formes : `modelesDans(d)` est pure — une transformation s'en sert sans rien
// attendre — et `modeles()` lit le magasin, pour les écrans de paramétrage.
function modelesDans(d) {
  const enregistre = ((d || {}).parametres || []).find((p) => p.id === 'references') || {};
  return { ...MODELES_DEFAUT, ...(enregistre.modeles || {}) };
}

const modeles = async () => modelesDans(await db.load());

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

// ── Référence suivante pour une famille donnée ──
//
// Le numéro d'ordre reprend la numérotation des références partageant la même
// partie fixe. Il n'y a donc **pas de compteur persisté** : la suite se déduit de
// ce qui existe.
//
// C'est précisément ce qui rendait la conversion dangereuse. La référence se
// calculait, puis l'enregistrement s'écrivait dans un second temps. Sur fichiers
// et en synchrone, rien ne s'intercalait ; converti sans précaution, deux actes
// ouverts ensemble auraient lu la même numérotation et porté **la même
// référence** — `ACT-TG-NAV-2026-001` deux fois, pour deux actes de surveillance
// distincts.
//
// `suivanteDans(d, …)` est donc **pure** : elle lit l'état qu'on est en train
// d'écrire. Les routes composent — la référence et l'acte qui la porte dans la
// même transformation.
function suivanteDans(d, type, contexte) {
  const modele = modelesDans(d)[type] || MODELES_DEFAUT[type];
  const source = SOURCES[type];
  if (!modele || !source) return '';
  const { texte, sep } = prefixeDe(modele, contexte);
  const segNumero = (modele.segments || []).find((s) => s.type === 'numero');
  if (!segNumero) return texte;

  const debut = texte ? `${texte}${sep}` : '';
  const existantes = ((d || {})[source.coll] || [])
    .map((r) => r[source.champ])
    .filter((v) => typeof v === 'string' && v.startsWith(debut));
  let seq = 1;
  existantes.forEach((v) => {
    const n = parseInt(String(v).slice(debut.length), 10);
    if (!Number.isNaN(n) && n >= seq) seq = n + 1;
  });
  return `${debut}${String(seq).padStart(Number(segNumero.longueur) || 3, '0')}`;
}

// Pour qui ne compose pas : un aperçu, un écran de paramétrage. Une référence
// destinée à être écrite se tire par `suivanteDans`, dans la transformation.
const suivante = async (type, contexte) => suivanteDans(await db.load(), type, contexte);

// Insérer un enregistrement **avec** sa référence, en une transformation. C'est le
// geste ordinaire : quatre routes créent un objet du circuit, et chacune doit
// nommer ce qu'elle crée au moment même où elle l'écrit.
async function insererAvec(coll, type, contexte, rec) {
  let pose = null;
  await db.transformer((d) => {
    pose = { ...rec, reference: suivanteDans(d, type, contexte) };
    d[coll] = d[coll] || [];
    d[coll].push(pose);
    return d;
  });
  return pose;
}

module.exports = {
  SEGMENTS, MODELES_DEFAUT, SOURCES,
  modeles, modelesDans, suivante, suivanteDans, insererAvec,
};
