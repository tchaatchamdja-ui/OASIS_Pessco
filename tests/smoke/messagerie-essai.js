// OASIS — Un serveur de messagerie d'essai, pour mesurer ce qui part.
//
// ── Pourquoi ce fichier existe ──
//
// La transmission d'un rapport **envoie un courriel**, et c'est la seule
// mécanique du module qui sorte de l'application. Le jeu d'essai pointe la
// messagerie sur `localhost:1025` — le Mailpit d'un poste de développement —, et
// rien n'y écoute pendant une campagne : `transmission.transmettre` lève, la
// route rend **502**, et le geste n'était mesurable que par son refus.
//
// Deux contrôles ont été écrits sur ce refus, et chacun porte une note disant
// pourquoi il ne va pas plus loin. Elles étaient justes pour la constatation —
// atteindre la transmission y coûtait quatre conditions fabriquées. Elles ne le
// sont plus pour le rapport : l'écran compose le document lui-même, le
// destinataire vient de la notification, l'objet et le message sont rédigés par
// le formulaire. **Tout est réel sauf le serveur de messagerie.**
//
// Il manquait donc une seule pièce, et c'est elle. Ce qu'elle rend mesurable :
//
//   · `envoye: true` — la route ne se contente plus de dire « transmis » ;
//   · **le message ne porte aucune pièce jointe**. C'est une promesse que
//     l'écran écrit en toutes lettres — « il annonce des liens de
//     téléchargement, que le prestataire suit depuis son compte OASIS » — et
//     qu'aucun contrôle ne tenait. La tenir exige de lire ce qui est parti ;
//   · les liens annoncés, et l'adresse par laquelle le prestataire s'authentifie ;
//   · les destinataires en copie cachée, qui ne figurent dans aucun en-tête :
//     ils n'existent que dans les `RCPT TO` du dialogue.
//
// ── Un port libre, et non le 1025 ──
//
// Prendre 1025 aurait buté sur le Mailpit de qui en fait tourner un, et la
// campagne aurait rougi sur l'outil de son auteur. Le sas écoute donc sur un
// port que le système lui donne, et le serveur d'essai y est dirigé par
// `OASIS_SMTP_HOST`/`OASIS_SMTP_PORT` — le chemin déclaré pour désigner une
// messagerie (voir `surcharge` dans `src/email.js`), celui qu'emploie un
// hébergement.
//
// ── Ce qu'il implémente, et ce qu'il n'implémente pas ──
//
// Le strict dialogue que `nodemailer` mène sans chiffrement ni authentification :
// la salutation, `EHLO`, `MAIL FROM`, `RCPT TO`, `DATA`, `QUIT`. Il n'annonce ni
// `STARTTLS` ni `AUTH` — ce qui n'est pas offert n'est pas demandé. Il ne juge
// rien : il accepte tout et garde tout. *Un sas qui refuserait mesurerait ses
// propres règles, non celles de l'application.*
const net = require('net');

// Les en-têtes d'un message, lues telles qu'elles sont parties. Le corps suit la
// première ligne vide ; le pliage des en-têtes longues (RFC 5322) est défait,
// sans quoi une adresse coupée en deux ne se retrouverait pas.
function analyser(brut) {
  const texte = String(brut || '').replace(/\r\n/g, '\n');
  const coupure = texte.indexOf('\n\n');
  const hautBrut = coupure === -1 ? texte : texte.slice(0, coupure);
  const corps = coupure === -1 ? '' : texte.slice(coupure + 2);
  const entetes = {};
  hautBrut.replace(/\n[ \t]+/g, ' ').split('\n').forEach((ligne) => {
    const i = ligne.indexOf(':');
    if (i <= 0) return;
    const nom = ligne.slice(0, i).trim().toLowerCase();
    const valeur = ligne.slice(i + 1).trim();
    entetes[nom] = entetes[nom] ? `${entetes[nom]}, ${valeur}` : valeur;
  });
  return {
    entetes,
    corps,
    // Ce qu'un destinataire lit, accents compris et lignes recollées.
    texte: decoder(corps, entetes['content-transfer-encoding']),
    brut: texte,
  };
}

// Les adresses d'une commande `MAIL FROM:<a@b>` ou `RCPT TO:<a@b> SIZE=…`.
const adresse = (commande) => (/<([^>]*)>/.exec(commande) || [, ''])[1];

// ── Le corps tel qu'un destinataire le lit ──
//
// `nodemailer` encode en *quoted-printable* : les accents partent en `=C3=A9` et
// les lignes longues sont coupées par un `=` final. Chercher « Accès à
// l'application » dans ce corps-là **ne trouve rien**, et le premier contrôle
// écrit ici l'a appris en rougissant sur un message parfaitement conforme. Le
// sas rend donc les deux : le corps reçu, et le texte décodé.
function decoder(corps, encodage) {
  const brut = String(corps || '');
  if (!/quoted-printable/i.test(String(encodage || ''))) return brut;
  const sansCoupures = brut.replace(/=\r?\n/g, '');
  const octets = [];
  for (let i = 0; i < sansCoupures.length; i += 1) {
    const c = sansCoupures[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(sansCoupures.slice(i + 1, i + 3))) {
      octets.push(parseInt(sansCoupures.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      octets.push(c.charCodeAt(0) & 0xff);
    }
  }
  return Buffer.from(octets).toString('utf8');
}

/**
 * Démarre le sas et rend de quoi le diriger et le relever.
 *
 * `env` se passe tel quel à `demarrer()` du harnais : c'est ce qui dirige le
 * serveur d'essai vers ce sas plutôt que vers la messagerie du jeu d'essai.
 */
function demarrer() {
  const recus = [];
  const serveur = net.createServer((socket) => {
    let tampon = '';
    let enDonnees = false;
    let courant = { de: '', pour: [], brut: '' };
    socket.setEncoding('utf8');
    socket.write('220 oasis-essai ESMTP\r\n');
    socket.on('data', (bloc) => {
      tampon += bloc;
      for (;;) {
        if (enDonnees) {
          // Fin des données : un point seul sur sa ligne. Tant qu'elle n'est pas
          // arrivée, on garde ce qu'on a — un message tient rarement dans un
          // seul bloc, et un rapport moins que tout.
          const fin = tampon.indexOf('\r\n.\r\n');
          if (fin === -1) return;
          courant.brut += tampon.slice(0, fin);
          tampon = tampon.slice(fin + 5);
          enDonnees = false;
          recus.push({ ...courant, ...analyser(courant.brut) });
          courant = { de: '', pour: [], brut: '' };
          socket.write('250 2.0.0 Ok : message retenu par le sas\r\n');
          continue;
        }
        const saut = tampon.indexOf('\r\n');
        if (saut === -1) return;
        const ligne = tampon.slice(0, saut);
        tampon = tampon.slice(saut + 2);
        const haut = ligne.toUpperCase();
        if (haut.startsWith('EHLO') || haut.startsWith('HELO')) {
          // Ni STARTTLS ni AUTH : ce qui n'est pas annoncé n'est pas demandé.
          socket.write('250-oasis-essai\r\n250 8BITMIME\r\n');
        } else if (haut.startsWith('MAIL FROM')) {
          courant.de = adresse(ligne);
          socket.write('250 2.1.0 Ok\r\n');
        } else if (haut.startsWith('RCPT TO')) {
          // La copie cachée ne figure dans aucun en-tête : elle n'est ici.
          courant.pour.push(adresse(ligne));
          socket.write('250 2.1.5 Ok\r\n');
        } else if (haut === 'DATA') {
          enDonnees = true;
          socket.write('354 Envoyez les données, terminées par <CRLF>.<CRLF>\r\n');
        } else if (haut === 'QUIT') {
          socket.write('221 2.0.0 Au revoir\r\n');
          socket.end();
          return;
        } else {
          socket.write('250 2.0.0 Ok\r\n');
        }
      }
    });
    // Une coupure de la part du client n'est pas une anomalie du sas.
    socket.on('error', () => {});
  });

  return new Promise((resoudre, rejeter) => {
    serveur.once('error', rejeter);
    // Port 0 : le système en donne un libre. Boucle locale seulement — ce sas
    // accepte tout, et il n'a rien à offrir au réseau.
    serveur.listen(0, '127.0.0.1', () => {
      const { port } = serveur.address();
      resoudre({
        port,
        recus,
        // Ce qu'il faut ajouter à l'environnement du serveur d'essai pour qu'il
        // écrive ici. `OASIS_SMTP_HOST` suffit à activer la messagerie
        // (`surcharge` pose `enabled: true` avec l'hôte).
        env: { OASIS_SMTP_HOST: '127.0.0.1', OASIS_SMTP_PORT: String(port) },
        arreter: () => new Promise((fini) => serveur.close(() => fini())),
      });
    });
  });
}

module.exports = { demarrer, analyser };
