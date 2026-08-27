// Rendu PDF des documents composés en HTML par le front.
//
// Les rapports sont mis en page en HTML, avec leurs règles d'impression (A4,
// sauts de page, en-têtes répétés). Les rendre ici, dans le même moteur que
// celui du navigateur, garantit que le PDF transmis est exactement ce que
// l'aperçu montre — sans réécrire la mise en page pour un moteur tiers.
//
// Le navigateur est démarré à la première demande et conservé : son lancement
// coûte quelques secondes, la conversion d'un document quelques centaines de
// millisecondes.
let puppeteer = null;
try { puppeteer = require('puppeteer'); } catch { /* moteur absent */ }

let navigateur = null;
let demarrage = null;

// Le conteneur d'exécution n'offre pas toujours les espaces de noms que le
// bac à sable de Chromium réclame ; le processus y est déjà isolé.
const OPTIONS = { headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] };

function disponible() {
  return !!puppeteer;
}

async function obtenirNavigateur() {
  if (navigateur && navigateur.connected !== false) return navigateur;
  if (!demarrage) {
    demarrage = puppeteer.launch(OPTIONS)
      .then((n) => {
        navigateur = n;
        // Un navigateur qui tombe ne doit pas condamner les rendus suivants.
        n.on('disconnected', () => { navigateur = null; demarrage = null; });
        return n;
      })
      .catch((e) => { demarrage = null; throw e; });
  }
  return demarrage;
}

// Renvoie un Buffer PDF, ou lève une erreur explicite.
async function depuisHtml(html) {
  if (!disponible()) {
    throw new Error('Moteur de rendu PDF indisponible sur ce serveur');
  }
  const n = await obtenirNavigateur();
  const page = await n.newPage();
  try {
    // Le document est autonome (styles et images en ligne) : rien à charger
    // depuis le réseau, l'attente porte sur la mise en page seule.
    await page.setContent(String(html), { waitUntil: 'load', timeout: 30000 });
    await page.emulateMediaType('print');
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30000,
    });
  } finally {
    await page.close().catch(() => {});
  }
}

async function fermer() {
  const n = navigateur;
  navigateur = null;
  demarrage = null;
  if (n) await n.close().catch(() => {});
}

module.exports = { disponible, depuisHtml, fermer };
