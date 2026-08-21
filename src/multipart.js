// Socle — lecture des requêtes multipart/form-data.
//
// Express 4 ne sait décoder que JSON et urlencoded. Les modules qui reçoivent
// des fichiers (téléversements, imports xlsx) branchent ce middleware sur
// leurs seules routes concernées ; il expose `req.files` et complète
// `req.body` avec les champs texte du formulaire.
//
// Volontairement minimal : tout est gardé en mémoire, avec une taille
// maximale, ce qui suffit aux pièces jointes bureautiques manipulées par
// OASIS et évite une dépendance externe.

const TAILLE_MAX_DEFAUT = 25 * 1024 * 1024; // 25 Mo

// Découpe le corps brut sur la frontière et reconstitue chaque partie.
function analyser(buffer, frontiere) {
  const sep = Buffer.from(`--${frontiere}`);
  const parties = [];
  let debut = buffer.indexOf(sep);
  if (debut < 0) return parties;
  debut += sep.length;

  while (debut < buffer.length) {
    // Fin du corps : « --frontiere-- »
    if (buffer[debut] === 0x2d && buffer[debut + 1] === 0x2d) break;
    // Saut du CRLF qui suit la frontière
    if (buffer[debut] === 0x0d && buffer[debut + 1] === 0x0a) debut += 2;

    const finEntetes = buffer.indexOf('\r\n\r\n', debut, 'utf8');
    if (finEntetes < 0) break;
    const entetes = buffer.slice(debut, finEntetes).toString('utf8');

    const finPartie = buffer.indexOf(sep, finEntetes);
    if (finPartie < 0) break;
    // Le CRLF précédant la frontière n'appartient pas au contenu.
    const contenu = buffer.slice(finEntetes + 4, finPartie - 2);

    const disposition = /content-disposition:[^\r\n]*/i.exec(entetes);
    const ligne = disposition ? disposition[0] : '';
    const nom = /name="([^"]*)"/i.exec(ligne);
    const fichier = /filename="([^"]*)"/i.exec(ligne);
    const type = /content-type:\s*([^\r\n]+)/i.exec(entetes);

    parties.push({
      name: nom ? nom[1] : '',
      filename: fichier ? fichier[1] : null,
      mimetype: type ? type[1].trim() : 'application/octet-stream',
      buffer: contenu,
    });

    debut = finPartie + sep.length;
  }
  return parties;
}

// Middleware Express. `options.tailleMax` borne le corps accepté.
function multipart(options) {
  const tailleMax = (options && options.tailleMax) || TAILLE_MAX_DEFAUT;

  return function (req, res, next) {
    const ct = req.headers['content-type'] || '';
    if (!ct.toLowerCase().startsWith('multipart/form-data')) return next();

    const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
    if (!m) return res.status(400).json({ error: 'Requête multipart invalide' });
    const frontiere = (m[1] || m[2]).trim();

    const morceaux = [];
    let taille = 0;
    let arrete = false;

    req.on('data', (c) => {
      if (arrete) return;
      taille += c.length;
      if (taille > tailleMax) {
        arrete = true;
        res.status(413).json({ error: 'Fichier trop volumineux' });
        req.destroy();
        return;
      }
      morceaux.push(c);
    });

    req.on('end', () => {
      if (arrete) return;
      const parties = analyser(Buffer.concat(morceaux), frontiere);
      req.files = {};
      req.body = req.body || {};
      parties.forEach((p) => {
        if (!p.name) return;
        if (p.filename !== null) req.files[p.name] = p;
        else req.body[p.name] = p.buffer.toString('utf8');
      });
      next();
    });

    req.on('error', () => { if (!arrete) next(); });
  };
}

module.exports = multipart;
module.exports.analyser = analyser;
