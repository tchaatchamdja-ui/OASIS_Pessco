// Socle — validation des corps de requête (SEC-08).
//
// Chaque route décrit ce qu'elle accepte ; ce qui n'est pas décrit n'est pas
// recopié. Les handlers lisent `req.valide` plutôt que `req.body` : le typage
// et les bornes sont acquis avant d'entrer dans la logique métier.
//
//   app.post(chemin, requireAuth, valider({
//     objet:   { type: 'texte',  requis: true, max: 300 },
//     annee:   { type: 'entier', min: 2000, max: 2100 },
//     actif:   { type: 'booleen' },
//     debut:   { type: 'date' },
//     themes:  { type: 'liste',  max: 200 },
//   }), (req, res) => { const d = req.valide; … });

const TYPES = {
  // Une chaîne est ébarbée et bornée ; au-delà de la borne elle est refusée,
  // pas tronquée — tronquer changerait le sens de la donnée sans le dire.
  texte: (v, r) => {
    if (typeof v === 'number' || typeof v === 'boolean') v = String(v);
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    if (t.length > (r.max === undefined ? 2000 : r.max)) return undefined;
    if (r.parmi && !r.parmi.includes(t)) return undefined;
    return t;
  },
  entier: (v, r) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const min = r.min === undefined ? -1e12 : r.min;
    const max = r.max === undefined ? 1e12 : r.max;
    if (n < min || n > max) return undefined;
    return Math.round(n);
  },
  booleen: (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1 || v === '1') return true;
    if (v === 'false' || v === 0 || v === '0') return false;
    return undefined;
  },
  // Date au format ISO : seule la partie calendaire est retenue.
  date: (v) => {
    if (typeof v !== 'string') return undefined;
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
    if (!m) return undefined;
    return Number.isNaN(new Date(m[1]).getTime()) ? undefined : m[1];
  },
  liste: (v, r) => {
    if (!Array.isArray(v)) return undefined;
    if (v.length > (r.max === undefined ? 500 : r.max)) return undefined;
    return v;
  },
  // Objet libre : la structure interne relève du handler, mais la taille est
  // bornée pour ne pas stocker n'importe quoi.
  objet: (v, r) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
    if (Object.keys(v).length > (r.max === undefined ? 200 : r.max)) return undefined;
    return v;
  },
};

// Valeur d'un champ facultatif que le client a vidé, par type. Un booléen ou un
// objet vide n'a pas de sens d'effacement : il reste absent.
const VIDES = { texte: '', date: '', entier: null, liste: [] };

// `options.effacer` : pour une route de modification. Un champ facultatif
// présent mais vide y est recopié vide, et efface donc la valeur enregistrée.
// Sans l'option, le vide vaut absence — ce qui convient à une création, mais
// rendait tout effacement impossible à une modification fusionnée avec
// l'existant : le lieu ou la description vidés revenaient à l'identique.
function valider(schema, options = {}) {
  return (req, res, next) => {
    const recu = req.body || {};
    const propre = {};
    const manquants = [];
    const invalides = [];

    for (const [cle, regle] of Object.entries(schema)) {
      const lecteur = TYPES[regle.type];
      if (!lecteur) throw new Error(`type de validation inconnu : ${regle.type}`);
      const brut = recu[cle];
      const absent = brut === undefined || brut === null || brut === '';
      if (absent) {
        if (regle.requis) manquants.push(cle);
        else if (options.effacer && brut !== undefined && regle.type in VIDES) {
          const vide = VIDES[regle.type];
          propre[cle] = Array.isArray(vide) ? [] : vide;
        }
        continue;
      }
      const valeur = lecteur(brut, regle);
      if (valeur === undefined) { invalides.push(cle); continue; }
      propre[cle] = valeur;
    }

    if (manquants.length || invalides.length) {
      return res.status(400).json({
        error: 'corps_invalide',
        manquants: manquants.length ? manquants : undefined,
        invalides: invalides.length ? invalides : undefined,
      });
    }
    req.valide = propre;
    return next();
  };
}

// ── Enregistrement de forme libre, mais borné ──────────────────────────
// Certaines collections n'ont pas de forme arrêtée : les réponses d'une
// checklist portent une clé par champ paramétré, le barème des indicateurs
// suit ce que l'administrateur y a mis. On ne peut pas les décrire champ par
// champ — on peut refuser ce qui n'est pas un enregistrement : trop de champs,
// un nom de champ qui n'en est pas un, une valeur démesurée, une profondeur
// sans fin. Et retirer ce que le serveur seul écrit : sans quoi le client
// choisissait son identifiant et signait à la place d'un autre.
const RESERVES = ['id', 'instance', 'created_by', 'createdAt', 'updatedAt', 'auteur'];

const MAX_CHAMPS = 100;
const MAX_TEXTE = 20000;
const MAX_LISTE = 500;
const NOM_CHAMP = /^[A-Za-z0-9_.-]{1,64}$/;

// Une valeur acceptable : un scalaire, ou une liste / un objet de scalaires
// jusqu'à la profondeur donnée.
function valeurBornee(v, profondeur) {
  if (v === null) return true;
  const t = typeof v;
  if (t === 'boolean') return true;
  if (t === 'number') return Number.isFinite(v);
  if (t === 'string') return v.length <= MAX_TEXTE;
  if (profondeur <= 0) return false;
  if (Array.isArray(v)) {
    return v.length <= MAX_LISTE && v.every((x) => valeurBornee(x, profondeur - 1));
  }
  if (t === 'object') {
    const cles = Object.keys(v);
    return cles.length <= MAX_CHAMPS
      && cles.every((k) => NOM_CHAMP.test(k) && valeurBornee(v[k], profondeur - 1));
  }
  return false;
}

// `reserves` : les champs que le serveur pose lui-même, retirés du corps sans
// que la requête soit refusée — le client les envoie souvent par recopie de
// l'enregistrement qu'il vient de lire.
function enregistrement(options) {
  const o = options || {};
  const reserves = o.reserves || RESERVES;
  const profondeur = o.profondeur === undefined ? 3 : o.profondeur;
  return (req, res, next) => {
    const recu = req.body || {};
    if (!recu || typeof recu !== 'object' || Array.isArray(recu)) {
      return res.status(400).json({ error: 'corps_invalide' });
    }
    const cles = Object.keys(recu).filter((k) => !reserves.includes(k));
    if (cles.length > MAX_CHAMPS) {
      return res.status(400).json({ error: 'corps_invalide', motif: 'trop_de_champs' });
    }
    const invalides = cles.filter((k) => !NOM_CHAMP.test(k) || !valeurBornee(recu[k], profondeur));
    if (invalides.length) {
      return res.status(400).json({ error: 'corps_invalide', invalides });
    }
    const propre = {};
    cles.forEach((k) => { propre[k] = recu[k]; });
    req.valide = propre;
    return next();
  };
}

module.exports = { valider, enregistrement, TYPES };
