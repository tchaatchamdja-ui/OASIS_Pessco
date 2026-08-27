// Remise d'un document officiel au prestataire, par courriel.
//
// Le message ne porte aucune pièce jointe : les documents restent dans OASIS,
// où le prestataire les télécharge depuis son compte — la remise est ainsi
// tracée et authentifiée. Rapports d'activité et constatations hors activités
// de supervision suivent le même chemin ; il est écrit ici une seule fois.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const courriel = require('../../email');
const auth = require('../../auth');
const R = require('./roles');
const pdf = require('../../pdf');

// Adresses des comptes du prestataire à qui l'organisme a confié la réception
// des courriels. Elles s'ajoutent au destinataire saisi : l'agent de l'AAC
// écrit à l'interlocuteur, l'organisme décide qui d'autre en est informé.
function adressesDuPrestataire(prestataireId) {
  if (!prestataireId) return [];
  return auth.getUsers()
    .filter((u) => u.active !== false
      && u.role === 'PRESTATAIRE'
      && R.prestatairesDe(u).includes(prestataireId)
      && R.aLeDroit(u, 'emails'))
    .map((u) => u.email || u.username)
    .filter(Boolean);
}

const ADRESSE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;

// Les pièces jointes du module vivent hors de data/ : ce sont des fichiers,
// pas des enregistrements.
const DOSSIER_UPLOADS = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'execution',
);

// Nom sous lequel une pièce est présentée : l'intitulé, débarrassé de tout ce
// qui pourrait désigner un chemin, et suffixé par l'extension attendue.
const nomDePresentation = (propose, ext) => {
  const base = String(propose || '')
    .replace(/[\\/\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(new RegExp(`${ext.replace('.', '\\.')}$`, 'i'), '')
    .slice(0, 120)
    .trim();
  return `${base || 'piece-jointe'}${ext}`;
};

const adresses = (v) => String(v || '').split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);

// Racine publique de l'application, telle que le prestataire y accède.
const racineApp = () => String(process.env.APP_URL || 'http://localhost:4750')
  .replace(/\/login\.html\/?$/i, '').replace(/\/+$/, '');

const lienDe = (piece) => {
  const nom = path.basename(String(piece.path || ''));
  if (!nom) return '';
  return `${racineApp()}/api/m/execution/uploads/${encodeURIComponent(nom)}`
    + `?nom=${encodeURIComponent(piece.intitule || piece.filename || nom)}`;
};

// Erreur porteuse du code HTTP à rendre : la route n'a plus qu'à la relayer.
class ErreurTransmission extends Error {
  constructor(statut, message) { super(message); this.statut = statut; }
}

// Le document est déposé au même endroit que les pièces jointes : c'est un
// fichier, pas un enregistrement, et il se sert par la même route. La mise en
// page HTML est rendue en PDF — le format sous lequel un document officiel se
// transmet, et se lit partout à l'identique.
async function deposerPdf(contenu, base, { dossierUploads, nomDePresentation }) {
  if (!fs.existsSync(dossierUploads)) fs.mkdirSync(dossierUploads, { recursive: true });
  const octets = await pdf.depuisHtml(contenu);
  const nom = `${crypto.randomBytes(6).toString('hex')}.pdf`;
  fs.writeFileSync(path.join(dossierUploads, nom), octets);
  return { filename: nomDePresentation(base, '.pdf'), path: `/api/m/execution/uploads/${nom}` };
}

// Envoie le courriel et renvoie ce qu'il faut consigner : le document produit,
// les pièces qui l'accompagnent et les destinataires. Lève une
// ErreurTransmission si quoi que ce soit empêche la remise — rien n'est alors
// à acter, puisque rien n'est parti.
async function transmettre(corps, options) {
  const { dossierUploads, nomDePresentation, base, origine, reference, journal, prestataire_id } = options;

  const destinataires = adresses(corps.destinataire);
  // Les comptes du prestataire à qui la réception des courriels a été confiée
  // reçoivent en copie, sans écraser ce que l'agent a saisi.
  const copies = [...new Set([
    ...adresses(corps.copie),
    ...adressesDuPrestataire(prestataire_id).filter((x) => !adresses(corps.destinataire).includes(x)),
  ])];
  const copiesCachees = adresses(corps.copie_cachee);
  if (!destinataires.length) throw new ErreurTransmission(400, 'Destinataire manquant');
  const invalide = [...destinataires, ...copies, ...copiesCachees].find((a) => !ADRESSE.test(a));
  if (invalide) throw new ErreurTransmission(400, `Adresse invalide : ${invalide}`);
  const objet = String(corps.objet || '').trim();
  if (!objet) throw new ErreurTransmission(400, 'Objet manquant');

  const piece = corps.piece || {};
  const contenu = String(piece.contenu || '');
  if (!contenu) throw new ErreurTransmission(400, 'Document à transmettre manquant');

  let document;
  try {
    document = await deposerPdf(contenu, piece.nom || base || 'document',
      { dossierUploads, nomDePresentation });
  } catch (e) {
    throw new ErreurTransmission(503, `Le PDF n'a pas pu être produit : ${(e && e.message) || e}`);
  }

  // Pièces complémentaires déjà téléversées par l'inspecteur : on ne retient
  // que le chemin et l'intitulé, jamais ce que le front prétend d'autre.
  const jointes = (Array.isArray(corps.fichiers) ? corps.fichiers : [])
    .filter((f) => f && f.path)
    .map((f) => ({
      path: String(f.path),
      filename: String(f.filename || ''),
      intitule: String(f.intitule || f.filename || ''),
    }));

  const liens = [
    `• ${document.filename} : ${lienDe(document)}`,
    ...jointes.map((f) => `• ${f.intitule} : ${lienDe(f)}`),
  ].join('\n');
  const message = `${String(corps.message || '')}

————————————————————————————————
Documents mis à votre disposition dans OASIS
Accès à l'application : ${racineApp()}/login.html

${liens}

Le téléchargement de ces documents requiert la connexion à votre compte OASIS.`;

  const envoi = await courriel.queue({
    to: destinataires.join(', '),
    cc: copies.join(', ') || undefined,
    bcc: copiesCachees.join(', ') || undefined,
    subject: objet,
    body: message,
    origine,
    reference,
    ...(journal || {}),
  });

  if (envoi && envoi.status === 'error') {
    const smtp = courriel.etatSmtp();
    // « ECONNREFUSED » ne dit rien à qui administre l'outil : on nomme le
    // serveur de messagerie visé, seule information exploitable ici.
    const injoignable = /ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND/.test(envoi.error || '');
    const ou = smtp.host ? ` (${smtp.host}:${smtp.port})` : '';
    throw new ErreurTransmission(502, injoignable
      ? `Le serveur de messagerie${ou} ne répond pas : rien n'a été transmis.`
      : `Le courriel n'a pas pu être envoyé${ou} : ${envoi.error}`);
  }

  // Sans SMTP configuré, le message est consigné mais ne part pas : la
  // transmission est acquise, l'appelant doit le dire plutôt que le taire.
  return { document, jointes, destinataires, envoye: envoi && envoi.status === 'sent' };
}

// Relaie une ErreurTransmission au client ; toute autre erreur reste une
// anomalie serveur et doit remonter.
function repondreErreur(res, e) {
  if (e instanceof ErreurTransmission) return res.status(e.statut).json({ error: e.message });
  throw e;
}

// Avis simple au prestataire : pas de document remis, juste l'information que
// quelque chose l'attend dans OASIS. Adressé aux seuls comptes à qui
// l'organisme a confié la réception des courriels ; sans destinataire, rien
// n'est envoyé et le circuit n'en est pas affecté.
function avertirPrestataire(prestataireId, { objet, message, origine, reference, journal }) {
  const destinataires = adressesDuPrestataire(prestataireId);
  if (!destinataires.length) return Promise.resolve({ status: 'aucun_destinataire' });
  return courriel.queue({
    to: destinataires.join(', '),
    subject: objet,
    body: `${message}

————————————————————————————————
Accès à l'application : ${racineApp()}/login.html`,
    origine,
    reference,
    ...(journal || {}),
  }).catch(() => ({ status: 'error' }));
}

module.exports = {
  transmettre, repondreErreur, ErreurTransmission, avertirPrestataire, adressesDuPrestataire,
  racineApp, lienDe, nomDePresentation, DOSSIER_UPLOADS,
};
