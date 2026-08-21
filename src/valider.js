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

function valider(schema) {
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

module.exports = { valider, TYPES };
