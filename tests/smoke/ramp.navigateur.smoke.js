// RAMP dans un navigateur — la suite n° 0.b de l'écran « Inspections
// d'aéronefs sur aire de trafic » (ADR-003, 5.f.14).
//
// ── Pourquoi un fichier de plus, et non des contrôles dans `ramp.smoke.js` ──
//
// `ramp.smoke.js` est une suite **HTTP** : elle éprouve les routes du module,
// sans navigateur. Lui ajouter puppeteer mêlerait deux régimes dans un fichier,
// et le plus lent ralentirait le plus rapide à chaque passage.
//
// Un écran, une suite de navigateur — c'est ce qui permet au relevé des gestes
// de **lancer la suite de l'écran qu'il mesure** : `scripts/relever-gestes.js`
// lit le nom de la suite dans sa table des écrans, et l'instrumentation voyage
// avec elle.
//
// ── Ce que cette suite éprouve, et ce qu'elle n'éprouve pas encore ──
//
// Elle monte l'écran, vérifie que la barre porte ce que la source déclare, que
// toute page que l'aiguillage sait rendre est atteignable, puis parcourt les
// sept pages **par de vrais clics** : chacune se remplit, elles diffèrent,
// aucune ne déborde, et la console reste muette.
//
// Elle n'exerce **aucune écriture**. C'est délibéré, et c'est la méthode qui a
// porté le portail à 66 gestes couverts et SURV à 38 : on ouvre d'abord
// l'écran, on mesure ce que cela couvre, puis on ajoute les rondes d'écriture
// une par une — chacune avec l'assertion du résultat **en base** et le retour
// en arrière. Un contrôle d'écriture qui laisse le bac dans un état que le
// suivant hérite est pire que pas de contrôle.
//
// ── La mesure qui a précédé l'écriture de ce fichier ──
//
// Les sept pages ont été ouvertes à la main avant qu'une assertion soit écrite :
// contenu de **424** caractères (« Contacts ») à **49 210** (« Paramètres », qui
// porte 773 gestes à lui seul), **aucun débordement**, et **aucun incident de
// console**. Les seuils ci-dessous viennent de là, et non d'une supposition.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const SOURCE_NAV = path.join(RACINE, 'public', 'modules', 'ramp', 'js', 'ramp-app.js');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// ── Les entrées de menu, et la garde qui en cache certaines ──
//
// `RAMP_NAV` déclare huit pages, et la barre n'en montre que **sept** à un
// super-administrateur en vue AAC. Ce n'est pas un défaut : trois drapeaux
// conditionnent l'affichage, et le contrôle doit les lire plutôt que de
// s'étonner.
//
//   · `aac: true`        — masqué en vue Prestataire ;
//   · `prestataire: true` — réservé à la vue Prestataire, et soumis de surcroît
//                           à un droit confié (`rampPeutGererComptes`) ;
//   · `reserve: '…'`      — soumis à un droit nommé.
//
// Une page sans drapeau doit donc être dans la barre ; une page à drapeau peut
// ne pas y être, et le contrôle dit laquelle et pourquoi. *Un contrôle qui
// exigerait les huit mesurerait sa propre ignorance des droits.*
function navDeclaree() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const bloc = /const RAMP_NAV = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : RAMP_NAV introuvable dans public/modules/ramp/js/ramp-app.js —'
      + ' le contrôle ne sait plus quelles pages l’écran déclare.');
  }
  const entrees = [...bloc[1].matchAll(/^\s{4}(\w+):\s*\{([^}]*)\}/gm)]
    .map((m) => ({ cle: m[1], gardee: /\b(aac|prestataire|reserve)\s*:/.test(m[2]) }));
  if (!entrees.length) throw new Error('refus : RAMP_NAV ne se lit plus entrée par entrée.');
  return entrees;
}

// Les cas de l'aiguillage, et ce qui peut les ouvrir. Lus dans la source : une
// liste tenue ici aurait divergé, et le contrôle aurait mesuré sa propre liste.
function aiguillageEtChemins() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const rendues = [...texte.matchAll(/^\s*case '(\w+)': return ramp\w+\(\);/gm)].map((m) => m[1]);
  if (!rendues.length) {
    throw new Error('refus : l’aiguillage de rampCorpsDeLaPage ne se lit plus dans ramp-app.js.');
  }
  // Le défaut de l'aiguillage est une page atteignable sans cas nommé.
  const defaut = /default: return ramp(\w+)\(\);/.exec(texte);
  // Tout ce qu'un geste de l'écran sait ouvrir, tous fichiers confondus : une
  // page peut n'avoir aucune entrée de menu et rester atteignable par un bouton
  // — « Traiter », sur la table des inspections, ouvre `inspection`.
  const js = path.join(RACINE, 'public', 'modules', 'ramp', 'js');
  const ouvrables = new Set();
  fs.readdirSync(js).filter((f) => f.endsWith('.js')).forEach((f) => {
    const t = fs.readFileSync(path.join(js, f), 'utf8');
    for (const m of t.matchAll(/rampNavigateTo\(\s*'(\w+)'/g)) ouvrables.add(m[1]);
  });
  return { rendues, ouvrables: [...ouvrables], defaut: defaut ? defaut[1] : null };
}

module.exports = async function rampNavigateurSmoke(port) {
  console.log('\n── RAMP : l’écran « Inspections sur aire de trafic » dans un navigateur ──');

  const srv = await demarrer({ port });
  let navigateur = null;
  const incidents = [];
  try {
    // Délai de protocole : voir la raison dans `surv.smoke.js` (n° 5.f.30) —
    // une campagne de huit suites de navigateur a dépassé le défaut.
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });
    // Le mouchard des gestes, posé seulement si `OASIS_MOUCHARD` l'est — même
    // règle que les deux autres suites de navigateur : l'outil instrumente la
    // vraie suite au lieu d'en rejouer une imitation.
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: 1440, height: 900 });

    // La console est relevée **dès la première page**, et les incidents de la
    // connexion sont écartés : une erreur de la page de connexion passerait
    // sinon pour une erreur de RAMP.
    let ramp = false;
    let etape = 'montage';
    page.on('console', (m) => {
      if (ramp && m.type() === 'error') incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (ramp) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (ramp) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    // La **réponse**, et non le seul message de console : un 404 s'y présente
    // comme « Failed to load resource », sans l'adresse. On relève son code et
    // son chemin, ce qui rend l'incident actionnable au lieu d'énigmatique.
    page.on('response', (r) => {
      if (!ramp || r.status() < 400) return;
      incidents.push(`[${etape}] ${r.status()} ${r.url().replace(srv.base, '').slice(0, 120)}`);
    });

    // ── La session, puis l'écran ──
    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    ramp = true;
    await page.goto(`${srv.base}/modules/ramp/index.html`, { waitUntil: 'networkidle2' });
    // Le module monte sa coquille puis charge ses données : on attend la barre,
    // et non un délai fixe.
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.getElementById('ramp-content');
        return el && el.textContent.trim().length > 200;
      },
      { timeout: 20000 },
    ).catch(() => { /* le contrôle qui suit le dira */ });

    const monte = await page.evaluate(() => ({
      pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page),
      contenu: (document.getElementById('ramp-content') || { textContent: '' }).textContent.trim().length,
      attente: !!document.querySelector('[data-oasis-loader]'),
    }));
    verifier('l’écran RAMP se monte, avec sa barre et son contenu',
      monte.pages.length > 0 && monte.contenu > 200 && !monte.attente,
      JSON.stringify(monte));

    // ── La barre porte ce que la source déclare, gardes comprises ──
    let declarees = [];
    let refus = null;
    try { declarees = navDeclaree(); } catch (e) { refus = e.message; }
    const libres = declarees.filter((d) => !d.gardee).map((d) => d.cle);
    const gardees = declarees.filter((d) => d.gardee).map((d) => d.cle);
    const manquantes = libres.filter((p) => !monte.pages.includes(p));
    const inattendues = monte.pages.filter((p) => !declarees.some((d) => d.cle === p));
    verifier('la barre de RAMP porte toute page sans garde, et aucune page non déclarée',
      !refus && libres.length > 0 && !manquantes.length && !inattendues.length,
      refus || `${declarees.length} déclarées, dont ${gardees.length} gardée(s) : ${gardees.join(', ')}`
        + `${manquantes.length ? ` — absentes : ${manquantes.join(', ')}` : ''}`
        + `${inattendues.length ? ` — inattendues : ${inattendues.join(', ')}` : ''}`);

    // ── Toute page que l'aiguillage sait rendre est atteignable ──
    //
    // La leçon de SURV, où **quatre** pages sur treize ne l'étaient par rien
    // (n° 5.f.2) : une page que l'aiguillage rend et qu'aucun chemin n'ouvre est
    // soit un écran oublié d'un menu, soit du code mort. Les deux se corrigent,
    // mais pas de la même façon, et ce n'est pas à la conversion d'en décider.
    //
    // RAMP s'en sort mieux : son seul cas sans entrée de menu, `inspection`, est
    // ouvert par le bouton « Traiter » de la table des inspections — dont il est
    // la suite. Le contrôle le vérifie plutôt que de le croire.
    let aiguillage = null;
    let refusAiguillage = null;
    try { aiguillage = aiguillageEtChemins(); } catch (e) { refusAiguillage = e.message; }
    if (refusAiguillage) {
      verifier('toute page de RAMP que l’aiguillage rend est atteignable', false, refusAiguillage);
    } else {
      const sansChemin = aiguillage.rendues.filter((p) => !declarees.some((d) => d.cle === p)
        && !aiguillage.ouvrables.includes(p));
      verifier('toute page de RAMP que l’aiguillage rend est atteignable',
        sansChemin.length === 0,
        sansChemin.length ? `sans chemin : ${sansChemin.join(', ')}`
          : `${aiguillage.rendues.length} cas rendus, ${aiguillage.ouvrables.length} ouvrable(s)`
            + ` par un geste, défaut « ${aiguillage.defaut} »`);
    }

    // ── Les sept pages, par de vrais clics ──
    const vues = {};
    for (const cle of monte.pages) {
      etape = cle;
      /* eslint-disable no-await-in-loop */
      await page.evaluate((c) => document.querySelector(`.nav-btn[data-page="${c}"]`)?.click(), cle);
      await page.waitForFunction(
        () => {
          const el = document.getElementById('ramp-content');
          return el && el.textContent.trim().length > 50;
        },
        { timeout: 15000 },
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, 1400));
      vues[cle] = await page.evaluate(() => {
        const z = document.getElementById('ramp-content');
        return {
          longueur: z ? z.textContent.trim().length : 0,
          // Le débordement se mesure sur le document, non sur le conteneur :
          // c'est la page entière qui ne doit pas se décaler.
          debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          empreinte: z ? z.textContent.trim().slice(0, 140) : '',
        };
      });
    }
    etape = 'pages';

    const maigres = Object.entries(vues).filter(([, v]) => v.longueur < 200).map(([c, v]) => `${c}=${v.longueur}`);
    verifier('chaque page de RAMP se remplit',
      maigres.length === 0,
      maigres.length ? `trop maigres : ${maigres.join(', ')}`
        : Object.entries(vues).map(([c, v]) => `${c}=${v.longueur}`).join(' '));

    // Deux pages identiques diraient que le clic n'a rien changé : le contrôle
    // de remplissage serait vert sur un écran bloqué.
    const empreintes = Object.entries(vues).map(([c, v]) => [c, v.empreinte]);
    const jumelles = [];
    for (let i = 0; i < empreintes.length; i += 1) {
      for (let j = i + 1; j < empreintes.length; j += 1) {
        if (empreintes[i][1] === empreintes[j][1]) jumelles.push(`${empreintes[i][0]}=${empreintes[j][0]}`);
      }
    }
    verifier('les pages de RAMP diffèrent les unes des autres',
      jumelles.length === 0, jumelles.join(', ') || `${empreintes.length} pages distinctes`);

    const debordantes = Object.entries(vues).filter(([, v]) => v.debord > 0).map(([c, v]) => `${c}=${v.debord}px`);
    verifier('aucune page de RAMP ne déborde à droite',
      debordantes.length === 0, debordantes.join(', ') || 'aucun débordement');

    // ── Les gestes de chaque page, ouverts puis refermés ──
    //
    // Le tour des sept pages ne couvre **qu'un seul geste nommé** : les sept
    // boutons de la barre appellent tous `rampNavigateTo`. Le chiffre est juste
    // et il est maigre — la valeur de ce tour est dans les contrats qu'il tient
    // (barre, aiguillage, débordement, console), non dans sa couverture.
    //
    // Ce qui couvre, ce sont les gestes **des** pages. Cette ronde n'écrit rien
    // en base : elle ouvre des volets, des fenêtres et des sous-onglets, et les
    // referme. Chaque bascule est éprouvée **dans les deux sens** — *une
    // bascule qui s'allume sans s'éteindre passe un contrôle sans rien dire.*
    //
    // Un piège mesuré avant d'écrire : `.ramp-slider` **survit** à la fermeture
    // du volet ; c'est `.ramp-slider-body` qui paraît et disparaît. Le premier
    // aurait fait un contrôle vert à l'ouverture et vert à la fermeture.
    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const ouvrir = (cle) => page.evaluate(
      (c) => document.querySelector(`.nav-btn[data-page="${c}"]`)?.click(), cle,
    );

    // Les exports de RAMP, comme ceux de SURV, composent leur document dans le
    // navigateur : on relaie `window.open` et `URL.createObjectURL` pour
    // capturer le **produit**. Ce que cela ne prouve pas est dit en 5.f.12 — ni
    // l'ouverture de la fenêtre, ni l'enregistrement du fichier.
    const poserLeRelais = () => page.evaluate(() => {
      window.__relais = { fenetres: [], blobs: 0 };
      window.__vraiOpen = window.open;
      window.__vraiURL = URL.createObjectURL;
      window.open = () => {
        const recu = { html: '' };
        window.__relais.fenetres.push(recu);
        return {
          document: { write: (h) => { recu.html += String(h || ''); }, close: () => {} },
          focus: () => {}, print: () => {}, close: () => {},
        };
      };
      URL.createObjectURL = (b) => { window.__relais.blobs += 1; return window.__vraiURL.call(URL, b); };
    });
    const oterLeRelais = () => page.evaluate(() => {
      window.open = window.__vraiOpen;
      URL.createObjectURL = window.__vraiURL;
      const r = window.__relais;
      return { documents: r.fenetres.map((f) => f.html.length), blobs: r.blobs };
    });

    etape = 'dashboard';
    await ouvrir('dashboard');
    await attendre(2200);
    await poserLeRelais();
    const tdb = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      r.triables = document.querySelectorAll('#ramp-content [onclick^="rampTrier"]').length;
      document.querySelector('#ramp-content [onclick^="rampTrier"]')?.click();
      await a(1200);
      document.querySelector('[onclick^="rampResetFiltres"]')?.click();
      await a(1200);
      // Le volet des statistiques : ouvert, garni, refermé.
      document.querySelector('[onclick^="rampOuvrirStatistiques"]')?.click();
      await a(2800);
      const corps = document.querySelector('.ramp-slider-body');
      r.voletOuvert = !!corps;
      r.voletGarni = corps ? corps.textContent.trim().length : 0;
      document.querySelector('[onclick^="rampFermerSlider"]')?.click();
      await a(1500);
      r.voletReferme = !document.querySelector('.ramp-slider-body');
      return r;
    });
    verifier('le volet des statistiques de RAMP s’ouvre garni, et se referme par son geste',
      tdb.triables > 0 && tdb.voletOuvert === true && tdb.voletGarni > 500
      && tdb.voletReferme === true,
      JSON.stringify(tdb));

    etape = 'etats';
    await ouvrir('etats');
    await attendre(2200);
    const inspections = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      // La recherche ronde : elle se déplie, se saisit, et se vide.
      document.querySelector('[onclick^="rampOuvrirRecherche"]')?.click();
      await a(1400);
      const champ = document.querySelector('#rampRechercheRonde .ramp-recherche-champ');
      r.champOuvert = !!champ;
      if (champ) {
        champ.value = 'zzz-aucune-inspection';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(1400);
        r.saisie = (document.querySelector('#rampRechercheRonde .ramp-recherche-champ') || {}).value || '';
        document.querySelector('[onclick^="rampViderRecherche"]')?.click();
        await a(1400);
        r.videe = (document.querySelector('#rampRechercheRonde .ramp-recherche-champ') || { value: '' }).value;
      }
      // Le volet d'importation, puis celui d'ajout d'une inspection : deux
      // volets, deux gestes de fermeture distincts.
      document.querySelector('[onclick^="rampOuvrirImportation"]')?.click();
      await a(2500);
      r.importation = !!document.querySelector('.ramp-slider-body');
      document.querySelector('[onclick^="rampFermerSlider"]')?.click();
      await a(1500);
      r.importationFermee = !document.querySelector('.ramp-slider-body');
      document.querySelector('[onclick^="rampAjouterInspection"]')?.click();
      await a(3000);
      r.ajout = !!document.querySelector('.ramp-slider-body');
      document.querySelector('[onclick^="rampFermerPoi"]')?.click();
      await a(2000);
      r.ajoutFerme = !document.querySelector('.ramp-slider-body');
      document.querySelector('[onclick^="rampExporterInspections"]')?.click();
      await a(1500);
      return r;
    });
    verifier('la recherche ronde des inspections se déplie, se saisit et se vide',
      inspections.champOuvert === true && inspections.saisie === 'zzz-aucune-inspection'
      && inspections.videe === '',
      JSON.stringify({ ouverte: inspections.champOuvert, saisie: inspections.saisie,
        videe: inspections.videe }));
    verifier('les volets d’importation et d’ajout d’inspection s’ouvrent et se referment',
      inspections.importation === true && inspections.importationFermee === true
      && inspections.ajout === true && inspections.ajoutFerme === true,
      JSON.stringify(inspections));

    etape = 'ecarts';
    await ouvrir('ecarts');
    await attendre(2200);
    await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('[onclick^="rampOuvrirRecherche"]')?.click();
      await a(1200);
      document.querySelector('[onclick^="rampExporterEcarts"]')?.click();
      await a(1500);
    });

    etape = 'partages';
    await ouvrir('partages');
    await attendre(2200);
    const partages = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const onglets = [...document.querySelectorAll('[onclick^="rampComOnglet"]')]
        .map((b) => b.getAttribute('onclick'));
      // La longueur du panneau, et non un préfixe de texte : ce contrôle-ci
      // passait sur 120 caractères, et il y passait **par chance** — le haut de
      // la page des paramètres a montré qu'un préfixe peut être commun à tous
      // les onglets. On mesure donc ce qui change par nature.
      const empreintes = [];
      for (const o of onglets) {
        [...document.querySelectorAll('[onclick^="rampComOnglet"]')]
          .find((b) => b.getAttribute('onclick') === o)?.click();
        /* eslint-disable no-await-in-loop */
        await a(1600);
        const z = document.getElementById('ramp-content');
        empreintes.push(`${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}`);
      }
      document.querySelector('[onclick^="rampComRegReset"]')?.click();
      await a(1200);
      return { onglets: onglets.length, distincts: new Set(empreintes).size, empreintes };
    });
    verifier('les sous-onglets des partages régionaux rendent chacun leur contenu',
      partages.onglets >= 3 && partages.distincts === partages.onglets,
      JSON.stringify(partages));


    etape = 'depot';
    await ouvrir('depot');
    await attendre(2200);
    const depot = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      document.querySelector('[onclick^="rampResetFiltresDepot"]')?.click();
      await a(1200);
      document.querySelector('[onclick^="rampOuvrirDepot"]')?.click();
      await a(2200);
      const racine = () => (document.getElementById('rampModalRoot') || { innerHTML: '' }).innerHTML.length;
      r.fenetre = racine();
      document.querySelector('[onclick^="rampFermerModal"]')?.click();
      await a(1200);
      r.fenetreFermee = racine();
      return r;
    });
    verifier('la fenêtre d’un dépôt de preuve s’ouvre et se referme',
      depot.fenetre > 200 && depot.fenetreFermee === 0, JSON.stringify(depot));

    etape = 'contacts';
    await ouvrir('contacts');
    await attendre(2200);
    const contacts = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      document.querySelector('[onclick^="rampOuvrirContact"]')?.click();
      await a(2200);
      const racine = () => (document.getElementById('rampModalRoot') || { innerHTML: '' }).innerHTML.length;
      r.fenetre = racine();
      document.querySelector('[onclick^="rampFermerModal"]')?.click();
      await a(1200);
      r.fenetreFermee = racine();
      document.querySelector('[onclick^="rampExporterContacts"]')?.click();
      await a(1500);
      return r;
    });
    verifier('la fenêtre d’un contact s’ouvre et se referme',
      contacts.fenetre > 200 && contacts.fenetreFermee === 0, JSON.stringify(contacts));

    etape = 'parametres';
    await ouvrir('parametres');
    await attendre(2600);
    const params = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      // Six référentiels, six sous-onglets : chacun doit rendre autre chose.
      const onglets = [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
        .map((b) => b.getAttribute('onclick'));
      // ── L'empreinte d'un panneau n'est pas le haut de sa page ──
      //
      // Première écriture : les 160 premiers caractères de `#ramp-content`. Ils
      // sont **identiques pour les six**, parce que le haut de la page est la
      // barre d'onglets elle-même, suivie de son chapeau. Le contrôle rendait
      // « 1 distinct sur 6 » sur six onglets qui marchent — 49 210, 2 276,
      // 29 125, 11 929, 13 724 et 4 729 caractères, mesurés.
      //
      // Ce qui distingue un référentiel, c'est **ce qu'il tabule** : les
      // intitulés de ses colonnes le nomment. Et l'onglet actif doit suivre le
      // clic, sans quoi six panneaux distincts pourraient défiler sans que la
      // barre le dise.
      const empreintes = [];
      const actifs = [];
      for (const o of onglets) {
        [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
          .find((b) => b.getAttribute('onclick') === o)?.click();
        /* eslint-disable no-await-in-loop */
        await a(1500);
        const z = document.getElementById('ramp-content');
        empreintes.push([...z.querySelectorAll('thead th')].map((e) => e.textContent.trim()).join('|'));
        const actif = z.querySelector('[onclick^="rampParamOnglet"].active');
        actifs.push(actif ? actif.getAttribute('onclick') === o : false);
      }
      r.onglets = onglets.length;
      r.distincts = new Set(empreintes).size;
      r.actifSuitLeClic = actifs.every(Boolean);
      // La barre des paramètres se replie et se déplie : les deux sens.
      const barre = () => document.querySelectorAll('[onclick^="rampParamOnglet"]').length;
      document.querySelector('[onclick^="rampBasculerBarreParam"]')?.click();
      await a(1500);
      r.replieeLargeur = barre();
      document.querySelector('[onclick^="rampBasculerBarreParam"]')?.click();
      await a(1500);
      r.deplieeLargeur = barre();
      // Et la fenêtre d'un pays du référentiel.
      [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
        .find((b) => /'pays'/.test(b.getAttribute('onclick')))?.click();
      await a(1800);
      document.querySelector('[onclick^="rampPaysReset"]')?.click();
      await a(1200);
      document.querySelector('[onclick^="rampOuvrirPays"]')?.click();
      await a(2200);
      const racine = () => (document.getElementById('rampModalRoot') || { innerHTML: '' }).innerHTML.length;
      r.fenetrePays = racine();
      document.querySelector('[onclick^="rampFermerModal"]')?.click();
      await a(1200);
      r.fenetrePaysFermee = racine();
      return r;
    });
    verifier('les six sous-onglets des paramètres tabulent chacun leur référentiel, et la barre suit',
      params.onglets >= 6 && params.distincts === params.onglets
      && params.actifSuitLeClic === true,
      JSON.stringify({ onglets: params.onglets, distincts: params.distincts,
        actifSuitLeClic: params.actifSuitLeClic }));
    verifier('la fenêtre d’un pays du référentiel s’ouvre et se referme',
      params.fenetrePays > 200 && params.fenetrePaysFermee === 0,
      JSON.stringify({ ouverte: params.fenetrePays, fermee: params.fenetrePaysFermee }));

    // ══════════════════════════════════════════════════════════════════
    //  La ronde d'une fiche d'inspection, de la saisie à la suppression
    // ══════════════════════════════════════════════════════════════════
    //
    // Le cycle du POI est jumeau de celui du dossier de SURV : brouillon →
    // soumis → validée, avec un renvoi qui ramène en saisie. Chaque palier est
    // relu **chez le serveur**, et la ronde ne laisse rien.
    //
    // ── Ce que la soumission exige, lu dans la route et non devinée ──
    //
    // `POST /poi/:id/soumettre` refuse par un **400 qui dit ce qui manque** :
    // date, État d'inspection, exploitant, type d'aéronef, immatriculation, au
    // moins un item contrôlé, et un inspecteur. Le premier essai de cette ronde
    // a reçu ce refus ; la route l'écrit, il n'y avait rien à élucider.
    //
    // ── Comment les champs se visent, sans un seul identifiant ──
    //
    // Aucun champ du formulaire ne porte d'`id` ni de `name` : ils sont liés par
    // leur gestionnaire, `oninput="rampPoiChamp('immatriculation', …)"`. On les
    // vise donc **par la liaison que l'application déclare elle-même** — ce qui
    // est plus sûr qu'une position dans la grille, et se lit.
    //
    // ── Et une case à cocher qui perdait son propre clic ──
    //
    // `element.click()` sur la case d'un item **ne portait pas** : son
    // gestionnaire redessine la table des items. Poser `checked` puis dépêcher
    // `change` porte. Mesuré dans les deux sens avant d'écrire.
    etape = 'ronde';
    await ouvrir('etats');
    await attendre(2400);
    const ronde = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((x) => setTimeout(x, ms));
      const o = {};
      const jget = async (u) => (await (await fetch(api + u, { credentials: 'same-origin' })).json());
      const pois = async () => ((await jget('/poi')).poi || []);
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(4000);
        return true;
      };
      const z = () => document.querySelector('.ramp-slider-body');
      const champ = (c) => z().querySelector(`[oninput*="rampPoiChamp('${c}'"],`
        + ` [onchange*="rampPoiChamp('${c}'"], [onchange*="rampPoiChampOuvert('${c}'"]`);
      const lignes = () => (document.getElementById('rampPoiItems')
        || { querySelectorAll: () => [] }).querySelectorAll('tr').length;

      o.avant = (await pois()).length;
      document.querySelector('[onclick^="rampAjouterInspection"]')?.click();
      await a(3500);

      // La date et le type d'inspection sont posés d'office : le formulaire
      // s'ouvre sur aujourd'hui, en SAFA.
      o.defauts = {
        date: (champ('date') || {}).value || '',
        type: (champ('type_inspection') || {}).value || '',
      };

      // Trois listes et un texte : l'exploitant, l'aéronef, le lieu, et
      // l'immatriculation.
      for (const c of ['exploitant', 'aeronef', 'place']) {
        const e = champ(c);
        if (e && e.options && e.options.length > 1) {
          e.selectedIndex = 1;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          /* eslint-disable no-await-in-loop */
          await a(900);
        }
      }
      const im = champ('immatriculation');
      if (im) {
        im.value = 'TT-RONDE';
        im.dispatchEvent(new Event('input', { bubbles: true }));
        await a(800);
      }

      // Les items : tout déplier, tout replier, et un regroupement seul.
      document.querySelector('[onclick^="rampPoiToutDeplier(true)"]')?.click();
      await a(1800);
      o.lignesDepliees = lignes();
      document.querySelector('[onclick^="rampPoiToutDeplier(false)"]')?.click();
      await a(1800);
      o.lignesRepliees = lignes();
      document.querySelector('[onclick^="rampPoiToutDeplier(true)"]')?.click();
      await a(1800);
      const groupe = document.querySelector('#rampPoiItems [onclick^="rampPoiBasculerGroupe"]');
      if (groupe) {
        const avant = lignes();
        groupe.click();
        await a(1600);
        o.groupeReplie = [avant, lignes()];
      }

      // Un item contrôlé — par sa propriété, non par un clic simulé.
      const caseItem = document.getElementById('rampPoiItems')?.querySelector('input[type="checkbox"]');
      o.caseTrouvee = !!caseItem;
      if (caseItem) {
        caseItem.checked = true;
        caseItem.dispatchEvent(new Event('change', { bubbles: true }));
        await a(1800);
      }

      // Un inspecteur, pris dans la liste de l'équipe.
      const liste = [...z().querySelectorAll('select')]
        .find((x) => /rampPoiAjouterInspecteur/.test(x.getAttribute('onchange') || ''));
      o.listeInspecteurs = liste ? liste.options.length : 0;
      if (liste && liste.options.length > 1) {
        liste.value = liste.options[1].value;
        liste.dispatchEvent(new Event('change', { bubbles: true }));
        await a(2000);
      }

      // Le sélecteur d'aéronef, ouvert et refermé.
      const racine = () => (document.getElementById('rampModalRoot') || { innerHTML: '' }).innerHTML.length;
      document.querySelector('[onclick^="rampOuvrirSelecteurAeronef"]')?.click();
      await a(2400);
      o.selecteur = racine();
      document.querySelector('[onclick^="rampFermerModal"]')?.click();
      await a(1200);
      o.selecteurFerme = racine();

      // ── Enregistrement ──
      document.querySelector('[onclick^="rampEnregistrerPoi"]')?.click();
      await a(3500);
      let l = await pois();
      o.apres = l.length;
      const fiche = l[0] || {};
      o.id = fiche.id;
      o.enregistre = {
        statut: fiche.statut,
        reference: fiche.reference || '',
        exploitant: (fiche.entete || {}).exploitant || '',
        immatriculation: (fiche.entete || {}).immatriculation || '',
        etat: (fiche.entete || {}).etat_inspection || '',
        equipe: (fiche.equipe || []).length,
      };

      // ── Soumission ──
      document.querySelector('[onclick^="rampSoumettrePoi"]')?.click();
      o.soumissionConfirmee = await oui();
      await a(1500);
      // ── Une liste n'est pas l'enregistrement ──
      //
      // `GET /poi` rend `liste.map(resume)` : un **résumé**, qui porte le
      // statut, l'en-tête et l'équipe, mais **pas les items**. La première
      // version de ce contrôle y lisait les items contrôlés et rendait **0** —
      // alors que la route de soumission *refuse* sans item contrôlé, et
      // qu'elle avait accepté. La contradiction était dans ma lecture, non dans
      // l'écran : je mesurais la projection au lieu du fait.
      //
      // L'enregistrement complet se lit par `GET /poi/:id`.
      const soumiseResume = (await pois())[0] || {};
      const soumise = o.id ? await jget(`/poi/${o.id}`) : {};
      o.soumise = {
        statut: soumiseResume.statut,
        itemsControles: Object.values(soumise.items || {}).filter((i) => i.controle).length,
      };
      o.gestesApresSoumission = [...new Set([...z().querySelectorAll('[onclick]')]
        .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
        .filter(Boolean))];

      // ── Un commentaire de validation, puis le renvoi qu'il motive ──
      document.querySelector('[onclick^="rampPoiBasculerCommentaires"]')?.click();
      await a(1400);
      document.querySelector('[onclick^="rampPoiAjouterCommentaire"]')?.click();
      await a(1600);
      const zoneCom = [...z().querySelectorAll('textarea')].pop();
      if (zoneCom) {
        zoneCom.value = 'Observation de la ronde RAMP.';
        zoneCom.dispatchEvent(new Event('input', { bubbles: true }));
        await a(900);
      }
      document.querySelector('[onclick^="rampEnregistrerCommentaires"]')?.click();
      await a(3000);
      o.renvoiOffert = !!document.querySelector('[onclick^="rampRenvoyerPoi"]');
      document.querySelector('[onclick^="rampRenvoyerPoi"]')?.click();
      await a(2400);
      o.fenetreRenvoi = racine();
      document.querySelector('[onclick^="rampConfirmerRenvoi"]')?.click();
      await a(4000);
      o.apresRenvoi = ((await pois())[0] || {}).statut;

      // ── Resoumission, puis validation ──
      document.querySelector('[onclick^="rampSoumettrePoi"]')?.click();
      o.resoumise = await oui();
      await a(1500);
      o.statutResoumis = ((await pois())[0] || {}).statut;
      const avantValidation = await jget('/inspections');
      o.inspectionsAvant = Array.isArray(avantValidation) ? avantValidation.length : -1;
      document.querySelector('[onclick^="rampValiderPoi"]')?.click();
      await a(2500);
      o.fenetreValidation = racine();
      document.querySelector('[onclick^="rampConfirmerValidation"]')?.click();
      await a(4500);
      o.statutValide = ((await pois())[0] || {}).statut;
      const apresValidation = await jget('/inspections');
      o.inspectionsApres = Array.isArray(apresValidation) ? apresValidation.length : -1;
      o.inspectionCreee = (apresValidation || [])[0] || null;

      // ── Le ménage, et ce qu'il a fallu mesurer pour l'écrire ──
      //
      // Supprimer la fiche validée rend **200** — elle reste donc réversible
      // jusqu'au bout, comme le dossier de SURV. Mais **l'inspection qu'elle a
      // produite lui survit** : c'est l'acte officiel, et il ne disparaît pas
      // avec son brouillon. La ronde doit donc effacer les deux, sans quoi elle
      // laisserait une inspection dans le bac — et le contrôle suivant
      // hériterait d'un état qu'il n'a pas créé.
      const dFiche = await fetch(`${api}/poi/${o.id}`, {
        method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
      });
      o.suppressionFiche = dFiche.status;
      o.ficheRestante = (await pois()).some((p) => p.id === o.id);
      const survivante = ((await jget('/inspections')) || [])[0];
      o.inspectionSurvit = !!survivante;
      if (survivante) {
        const dInsp = await fetch(`${api}/inspections/${survivante.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        o.suppressionInspection = dInsp.status;
      }
      o.inspectionsFin = ((await jget('/inspections')) || []).length;
      o.poiFin = (await pois()).length;
      return o;
    }, '/api/m/ramp');

    verifier('le formulaire d’inspection s’ouvre sur aujourd’hui, en SAFA',
      /^\d{4}-\d{2}-\d{2}$/.test(ronde.defauts.date) && ronde.defauts.type === 'SAFA',
      JSON.stringify(ronde.defauts));
    verifier('les items de la fiche se déplient et se replient tous',
      ronde.lignesDepliees > ronde.lignesRepliees && ronde.lignesRepliees > 0
      && !!ronde.groupeReplie && ronde.groupeReplie[1] < ronde.groupeReplie[0],
      JSON.stringify({ depliees: ronde.lignesDepliees, repliees: ronde.lignesRepliees,
        groupe: ronde.groupeReplie }));
    verifier('le sélecteur d’aéronef s’ouvre et se referme',
      ronde.selecteur > 1000 && ronde.selecteurFerme === 0,
      JSON.stringify({ ouvert: ronde.selecteur, ferme: ronde.selecteurFerme }));
    verifier('la fiche s’enregistre en brouillon, et le serveur porte sa saisie',
      ronde.apres === ronde.avant + 1 && ronde.enregistre.statut === 'brouillon'
      && /^POI-/.test(ronde.enregistre.reference)
      && ronde.enregistre.immatriculation === 'TT-RONDE'
      && !!ronde.enregistre.exploitant && !!ronde.enregistre.etat
      && ronde.enregistre.equipe === 1,
      JSON.stringify(ronde.enregistre));
    verifier('la fiche se soumet, et sa soumission prouve l’item contrôlé qu’elle exige',
      ronde.soumissionConfirmee === true && ronde.soumise.statut === 'soumis'
      && ronde.soumise.itemsControles >= 1,
      JSON.stringify(ronde.soumise));
    verifier('la soumission ouvre les gestes du valideur',
      (ronde.gestesApresSoumission || []).includes('rampValiderPoi')
      && (ronde.gestesApresSoumission || []).includes('rampRenvoyerPoi'),
      (ronde.gestesApresSoumission || []).join(', '));
    verifier('le renvoi, motivé par un commentaire, ramène la fiche en saisie',
      ronde.renvoiOffert === true && ronde.fenetreRenvoi > 200
      && ronde.apresRenvoi === 'brouillon',
      JSON.stringify({ offert: ronde.renvoiOffert, fenetre: ronde.fenetreRenvoi,
        apres: ronde.apresRenvoi }));
    verifier('la fiche resoumise se valide, et son inspection est inscrite aux états',
      ronde.resoumise === true && ronde.statutResoumis === 'soumis'
      && ronde.fenetreValidation > 200 && ronde.statutValide === 'validee'
      && ronde.inspectionsApres === ronde.inspectionsAvant + 1,
      JSON.stringify({ resoumis: ronde.statutResoumis, valide: ronde.statutValide,
        inspections: [ronde.inspectionsAvant, ronde.inspectionsApres] }));
    verifier('la fiche validée reste supprimable, mais son inspection lui survit',
      ronde.suppressionFiche === 200 && ronde.ficheRestante === false
      && ronde.inspectionSurvit === true,
      JSON.stringify({ suppression: ronde.suppressionFiche, restante: ronde.ficheRestante,
        inspectionSurvit: ronde.inspectionSurvit }));
    verifier('la ronde de RAMP ne laisse rien : ni fiche, ni inspection',
      ronde.poiFin === 0 && ronde.inspectionsFin === 0
      && ronde.suppressionInspection === 200,
      JSON.stringify({ poi: ronde.poiFin, inspections: ronde.inspectionsFin,
        suppressionInspection: ronde.suppressionInspection }));

    const produits = await oterLeRelais();
    // Trois exports ont été cliqués — inspections, écarts, contacts. Le bac n'a
    // ni inspection ni écart : ceux-là peuvent n'avoir rien à produire et le
    // disent par un message, non par un document. Le contrôle exige donc
    // **au moins un** produit, et non trois : affirmer trois serait affirmer
    // une propriété du jeu d'essai, non des gestes.
    verifier('les exports de RAMP remettent au moins un document à son mécanisme',
      (produits.documents || []).some((n) => n > 500) || produits.blobs > 0,
      JSON.stringify(produits));

    verifier('aucune erreur de console ni requête échouée sur RAMP',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
  } finally {
    // Le journal du mouchard, relevé **avant** de fermer : une page fermée n'a
    // plus de `window`, et le relevé rendrait zéro geste — la mesure de rien,
    // présentée comme une couverture nulle.
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = { enLigne: [], ecouteurs: [], propriete: [], jsx: [], poses: 0, pages: 0 };
      for (const p of await navigateur.pages()) {
        try {
          /* eslint-disable no-await-in-loop */
          const j = await p.evaluate(() => {
            const d = JSON.parse(localStorage.getItem('__oasis_gestes') || 'null');
            return { durable: d, vivante: !!window.__gestes, poses: window.__gestes ? window.__gestes.poses : 0 };
          });
          if (j.vivante) { vu.pages += 1; vu.poses += j.poses; }
          if (j.durable && !vu.enLigne.length) {
            vu.enLigne.push(...j.durable.enLigne);
            vu.ecouteurs.push(...j.durable.ecouteurs);
            vu.propriete.push(...(j.durable.propriete || []));
            vu.jsx.push(...(j.durable.jsx || []));
          }
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('RAMP (navigateur)');
};
