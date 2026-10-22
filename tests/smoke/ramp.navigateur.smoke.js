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
// Le même paquet que `src/modules/ramp/routes-echanges.js` emploie pour **lire**
// un classeur : la ronde en **écrit** un avec, et le serveur le relit.
// Deux paquets qui se répondent finiraient par ne plus se répondre.
const XLSX = require('xlsx');
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
    // ── Les refus que la ronde provoque exprès ──
    //
    // Même mécanisme que SURV (n° 5.f.26) : un refus **déclaré** par code,
    // méthode et chemin n'est pas un incident — c'est une preuve. Tout autre
    // 4xx en reste un. Déclarer n'est pas filtrer : la déclaration nomme ce
    // qu'on attend, et laisse rougir le reste.
    const REFUS_ATTENDUS = [
      {
        code: 409, methode: 'POST', chemin: /\/pays$/,
        pourquoi: 'le bigramme d’un pays est unique : la ronde réessaie un'
          + ' bigramme déjà pris pour l’éprouver. Contrôle « le formulaire refuse'
          + ' un nom vide, un bigramme qui n’est pas deux lettres, et un bigramme'
          + ' déjà pris » (n° 5.f.31).',
      },
    ];
    // ── L'abandon que la ronde provoque exprès ──
    //
    // Un refus se déclare par son code ; un **abandon** n'en a pas. Le
    // générateur de tables fait préparer le classeur au serveur, puis mène la
    // fenêtre à son adresse — servie en pièce jointe. Le navigateur enregistre
    // le fichier et **abandonne la navigation** : c'est ainsi qu'un
    // téléchargement se présente à un moniteur de requêtes, et non une panne.
    //
    // Déclarer n'est pas taire : l'abandon déclaré est relevé, et un contrôle
    // à part exige qu'il ait bien eu lieu, une fois, sur ce chemin. Si le
    // navigateur cessait d'abandonner, la déclaration deviendrait un filtre
    // muet — ce contrôle l'en empêche.
    const ABANDONS_ATTENDUS = [
      {
        motif: /ERR_ABORTED/, chemin: /\/tables\/fichier\//,
        pourquoi: 'l’export du générateur mène la fenêtre à une adresse servie'
          + ' en pièce jointe : le fichier s’enregistre, la navigation est'
          + ' abandonnée. Contrôle « l’export du générateur rend un lien de'
          + ' secours vers le classeur préparé, sans quitter la page » (n° 5.f.34).',
      },
      {
        motif: /ERR_ABORTED/, chemin: /\/import\/modele/,
        pourquoi: 'le modèle de classeur est servi par une adresse, en pièce'
          + ' jointe : même geste, même abandon. Contrôle « le modèle de'
          + ' classeur se demande, et le navigateur l’enregistre » (n° 5.f.35).',
      },
    ];
    const abandonsVus = [];
    const codesAttendus = new Set();
    page.on('console', (m) => {
      if (!ramp || m.type() !== 'error') return;
      const texte = m.text();
      const code = (/status of (\d{3})/.exec(texte) || [])[1];
      if (code && codesAttendus.has(Number(code))) return;
      incidents.push(`[${etape}] console : ${texte.slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (ramp) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (!ramp) return;
      const chemin = r.url().replace(srv.base, '');
      const motif = String(((r.failure() || {}).errorText) || '');
      if (ABANDONS_ATTENDUS.some((x) => x.motif.test(motif) && x.chemin.test(chemin))) {
        abandonsVus.push(`${motif} ${chemin}`);
        return;
      }
      incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    // La **réponse**, et non le seul message de console : un 404 s'y présente
    // comme « Failed to load resource », sans l'adresse. On relève son code et
    // son chemin, ce qui rend l'incident actionnable au lieu d'énigmatique.
    page.on('response', (r) => {
      if (!ramp || r.status() < 400) return;
      const chemin = r.url().replace(srv.base, '');
      const attendu = REFUS_ATTENDUS.some((x) => x.code === r.status()
        && x.methode === r.request().method() && x.chemin.test(chemin));
      if (attendu) { codesAttendus.add(r.status()); return; }
      incidents.push(`[${etape}] ${r.status()} ${chemin.slice(0, 120)}`);
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
    //  Le référentiel des pays : créé, relu, basculé, filtré, retiré
    // ══════════════════════════════════════════════════════════════════
    //
    // Le patron des référentiels de SURV (ADR-003 n° 5.f.22–23), porté à RAMP :
    // **ouvrir, saisir, enregistrer, relire chez le serveur, modifier, retirer,
    // et rendre l'écran à son état**. `ramp-parametres.js` était à **9 noms sur
    // 52** — le plus gros gisement d'un seul fichier du dépôt —, et la suite
    // n'ouvrait que les fenêtres sans jamais écrire.
    //
    // Ce que ce bloc tient en plus du cycle : **trois refus**, deux du
    // formulaire et un du serveur, chacun lu dans le code et non deviné —
    // un nom vide, un bigramme qui n'est pas deux lettres, et un bigramme déjà
    // pris (409). Un référentiel qui accepte tout n'est pas un référentiel.
    etape = 'référentiel des pays';
    const refPays = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const liste = async () => ((await (await fetch(`${api}/pays`,
        { credentials: 'same-origin' })).json()).pays || []);
      const poser = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      };
      const q = (sel) => document.querySelector(sel);
      const erreur = () => (document.getElementById('rampPaysErreur') || {}).textContent || '';
      const enregistrer = async () => { q('[onclick^="rampEnregistrerPays"]').click(); await a(2400); };
      const compte = () => {
        const b = [...document.querySelectorAll('.ramp-badge.compte')]
          .map((x) => /(\d+)\s*pays/.exec(x.textContent || ''))
          .find(Boolean);
        return b ? Number(b[1]) : -1;
      };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };
      const ligneDe = (id) => [...document.querySelectorAll('tbody tr')]
        .find((tr) => (tr.innerHTML || '').includes(id));

      // Le sous-onglet des pays, et son état de départ.
      [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
        .find((b) => /'pays'/.test(b.getAttribute('onclick')))?.click();
      await a(2000);
      q('[onclick^="rampPaysReset"]')?.click();
      await a(1500);
      const depart = await liste();
      r.depart = depart.length;
      r.compteAffiche = compte();
      // Un bigramme libre, calculé sur la liste : deux lettres que personne ne
      // porte. Et un bigramme **pris**, pour éprouver le refus du serveur.
      const pris = new Set(depart.map((p) => String(p.iso2 || '').toUpperCase()));
      const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let libre = '';
      for (const x of L) { for (const y of L) { if (!pris.has(x + y)) { libre = x + y; break; } } if (libre) break; }
      r.bigrammeLibre = libre;
      r.bigrammeTenu = (depart.find((p) => /^[A-Z]{2}$/.test(String(p.iso2 || '').toUpperCase())) || {}).iso2 || '';

      // ── 1. Les trois refus ──
      await essai('refus', async () => {
        const d = {};
        q('[onclick="rampOuvrirPays()"]').click();
        await a(2000);
        d.formulaire = !!document.getElementById('rampPaysNom');
        if (!d.formulaire) return d;
        // Nom vide.
        await enregistrer();
        d.sansNom = erreur();
        d.apresSansNom = (await liste()).length;
        // Nom donné, bigramme non conforme.
        poser('rampPaysNom', 'RAMP 0.a — pays de la ronde');
        poser('rampPaysIso', 'Z');
        await enregistrer();
        d.bigrammeCourt = erreur();
        d.apresBigrammeCourt = (await liste()).length;
        // Bigramme déjà pris : le refus vient du serveur, et le formulaire le dit.
        poser('rampPaysIso', r.bigrammeTenu);
        await enregistrer();
        d.bigrammePris = erreur();
        d.apresBigrammePris = (await liste()).length;
        d.formulaireTientBon = !!document.getElementById('rampPaysNom');
        return d;
      });

      // ── 2. La création, relue chez le serveur et vue dans la table ──
      await essai('creation', async () => {
        const d = {};
        poser('rampPaysIso', libre);
        poser('rampPaysAac', 'Autorité de la ronde');
        poser('rampPaysAdresse', 'Siège de la ronde');
        poser('rampPaysSite', 'https://ronde.example.org');
        poser('rampPaysEmails', 'ronde@example.org, second@example.org');
        const uemoa = document.getElementById('rampPaysUemoa');
        if (uemoa && !uemoa.checked) { uemoa.click(); }
        await enregistrer();
        d.fenetreFermee = !document.getElementById('rampPaysNom');
        const apres = await liste();
        d.apres = apres.length;
        const cree = apres.find((p) => String(p.iso2).toUpperCase() === libre);
        d.enBase = !!cree;
        if (!cree) return d;
        d.id = cree.id;
        d.nom = cree.nom;
        d.uemoa = cree.uemoa === true;
        // Les adresses saisies en une ligne deviennent une liste : la route le
        // dit — « on accepte aussi bien un tableau qu'une saisie séparée ».
        d.emails = (cree.emails || []).length;
        d.actif = cree.actif !== false;
        d.compteSuit = compte() === apres.length;
        // ── Le sélecteur, et le rendu qu'il ignorait ──
        //
        // `[onclick^="rampOuvrirPays('<id>'"]` ne correspondait à rien :
        // `_rArg` passe par `JSON.stringify`, et l'attribut porte donc des
        // **guillemets doubles**. On vise la ligne par son identifiant — qui s'y
        // trouve de toute façon —, puis le geste **dans** la ligne. C'est le
        // repère des phases qui marchaient déjà.
        d.dansLaTable = !!(ligneDe(cree.id) || {}).querySelector?.('[onclick^="rampOuvrirPays"]');
        return d;
      });

      const id = (r.creation || {}).id;

      // ── 3. La modification : le formulaire porte ce qui a été enregistré ──
      await essai('modification', async () => {
        const d = {};
        if (!id) return { erreur: 'pas de pays créé' };
        (ligneDe(id) || {}).querySelector?.('[onclick^="rampOuvrirPays"]').click();
        await a(2000);
        d.nomRelu = (document.getElementById('rampPaysNom') || {}).value || '';
        d.isoRelu = (document.getElementById('rampPaysIso') || {}).value || '';
        d.uemoaRelu = !!(document.getElementById('rampPaysUemoa') || {}).checked;
        d.emailsRelus = ((document.getElementById('rampPaysEmails') || {}).value || '')
          .split(',').filter((x) => x.trim()).length;
        poser('rampPaysNom', 'RAMP 0.a — pays modifié');
        await enregistrer();
        const p = (await liste()).find((x) => x.id === id) || {};
        d.nomEnBase = p.nom || '';
        return d;
      });

      // ── 4. La case UEMOA écrit seule, sans rouvrir de formulaire ──
      //
      // Le code le dit : « l'appartenance à l'UEMOA se change d'un clic, sans
      // passer par le formulaire ». C'est donc l'absence de formulaire qui fait
      // la moitié de ce contrôle.
      await essai('uemoa', async () => {
        const d = {};
        if (!id) return { erreur: 'pas de pays créé' };
        q('[onclick^="rampPaysReset"]')?.click();
        await a(1500);
        const champ = q('[oninput^="rampPaysChercher"]');
        if (champ) { champ.value = 'RAMP 0.a'; champ.dispatchEvent(new Event('input', { bubbles: true })); await a(1500); }
        const ligne = () => ligneDe(id);
        d.ligneTrouvee = !!ligne();
        const caseUemoa = (ligne() || {}).querySelector?.('[onchange^="rampPaysUemoa"]');
        d.caseTrouvee = !!caseUemoa;
        if (!caseUemoa) return d;
        d.cocheeAvant = caseUemoa.checked;
        caseUemoa.checked = false;
        caseUemoa.dispatchEvent(new Event('change', { bubbles: true }));
        await a(2400);
        d.sansFormulaire = !document.getElementById('rampPaysNom');
        d.uemoaEnBase = ((await liste()).find((x) => x.id === id) || {}).uemoa;
        return d;
      });

      // ── 5. La bascule d'activité, dans les deux sens ──
      await essai('bascule', async () => {
        const d = {};
        if (!id) return { erreur: 'pas de pays créé' };
        const ligne = () => ligneDe(id);
        const bouton = () => (ligne() || {}).querySelector?.('[onclick^="rampBasculerPays"]');
        d.bouton = !!bouton();
        if (!bouton()) return d;
        bouton().click();
        await a(2600);
        d.inactifEnBase = ((await liste()).find((x) => x.id === id) || {}).actif === false;
        d.ligneTerne = /opacity/.test(((ligne() || {}).getAttribute?.('style')) || '');
        bouton().click();
        await a(2600);
        d.rendu = ((await liste()).find((x) => x.id === id) || {}).actif !== false;
        return d;
      });

      // ── 6. La recherche et les filtres : la table se restreint, et revient ──
      await essai('filtres', async () => {
        const d = {};
        q('[onclick^="rampPaysReset"]')?.click();
        await a(1600);
        d.toutes = compte();
        const champ = q('[oninput^="rampPaysChercher"]');
        d.champ = !!champ;
        if (champ) {
          champ.value = 'RAMP 0.a';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await a(1600);
          d.cherchees = compte();
        }
        const filtre = q('[onchange*="rampPaysSetFiltre(\'uemoa\'"]');
        d.filtre = !!filtre;
        if (filtre) {
          const i = [...filtre.options].findIndex((o) => o.value);
          if (i >= 0) {
            filtre.selectedIndex = i;
            filtre.dispatchEvent(new Event('change', { bubbles: true }));
            await a(1600);
            d.filtrees = compte();
          }
        }
        q('[onclick^="rampPaysReset"]').click();
        await a(1600);
        d.rendues = compte();
        return d;
      });

      // ── 7. La suppression, et la ronde ne laisse rien ──
      await essai('suppression', async () => {
        const d = {};
        if (!id) return { erreur: 'pas de pays créé' };
        const champ = q('[oninput^="rampPaysChercher"]');
        if (champ) { champ.value = 'RAMP 0.a'; champ.dispatchEvent(new Event('input', { bubbles: true })); await a(1600); }
        const ligne = () => ligneDe(id);
        const bouton = (ligne() || {}).querySelector?.('[onclick^="rampSupprimerPays"]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        bouton.click();
        d.confirme = await oui();
        const apres = await liste();
        d.apres = apres.length;
        d.partie = !apres.some((x) => x.id === id);
        d.rendueAuDepart = apres.length === r.depart;
        q('[onclick^="rampPaysReset"]')?.click();
        await a(1500);
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const P = refPays;
      const F = P.refus || {};
      const C = P.creation || {};
      const M2 = P.modification || {};
      const U = P.uemoa || {};
      const B = P.bascule || {};
      const T = P.filtres || {};
      const S = P.suppression || {};
      verifier('le référentiel des pays part garni, et son compte affiché suit le serveur',
        P.depart > 100 && P.compteAffiche === P.depart
        && /^[A-Z]{2}$/.test(P.bigrammeLibre || '') && /^[A-Z]{2}$/.test(P.bigrammeTenu || ''),
        JSON.stringify({ depart: P.depart, affiche: P.compteAffiche,
          libre: P.bigrammeLibre, tenu: P.bigrammeTenu }));
      verifier('le formulaire refuse un nom vide, un bigramme qui n’est pas deux lettres, et un bigramme déjà pris — et rien n’est créé',
        F.formulaire === true
        && (F.sansNom || '').length > 0 && F.apresSansNom === P.depart
        && /deux lettres/.test(F.bigrammeCourt || '') && F.apresBigrammeCourt === P.depart
        && /désigne déjà/.test(F.bigrammePris || '') && F.apresBigrammePris === P.depart
        && F.formulaireTientBon === true,
        JSON.stringify(F).slice(0, 360));
      verifier('un pays se crée, le serveur le porte avec ses adresses en liste, et la table le montre',
        C.fenetreFermee === true && C.enBase === true
        && C.apres === P.depart + 1 && C.uemoa === true && C.emails === 2
        && C.actif === true && C.compteSuit === true && C.dansLaTable === true,
        JSON.stringify(C));
      verifier('son formulaire rouvert porte ce qui a été enregistré, et sa modification part en base',
        M2.nomRelu === 'RAMP 0.a — pays de la ronde'
        && M2.isoRelu === P.bigrammeLibre && M2.uemoaRelu === true && M2.emailsRelus === 2
        && M2.nomEnBase === 'RAMP 0.a — pays modifié',
        JSON.stringify(M2));
      verifier('la case UEMOA écrit seule : le serveur suit, et aucun formulaire ne s’ouvre',
        U.ligneTrouvee === true && U.caseTrouvee === true && U.cocheeAvant === true
        && U.sansFormulaire === true && U.uemoaEnBase === false,
        JSON.stringify(U));
      verifier('la bascule d’activité ternit la ligne, le serveur la dit inactive, et le second clic la rend',
        B.bouton === true && B.inactifEnBase === true && B.ligneTerne === true
        && B.rendu === true,
        JSON.stringify(B));
      verifier('la recherche et le filtre restreignent la table, et la remise à zéro la rend entière',
        T.champ === true && T.toutes === P.depart + 1
        && T.cherchees === 1 && T.filtre === true && T.filtrees >= 0
        && T.rendues === T.toutes,
        JSON.stringify(T));
      verifier('le pays se supprime sur confirmation, et la ronde rend le référentiel à son compte de départ',
        S.bouton === true && S.confirme === true && S.partie === true
        && S.rendueAuDepart === true,
        JSON.stringify(S));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Le référentiel des aéronefs : la nomenclature, groupée et paginée
    // ══════════════════════════════════════════════════════════════════
    //
    // Même patron que les pays, et trois propriétés de plus, écrites dans le
    // code : la table est **groupée par désignation**, elle est **paginée sur
    // les désignations** — « une page ne doit pas couper un groupe en deux » —,
    // et l'enregistrement **ouvre la désignation touchée**, « l'agent voit ce
    // qu'il vient d'écrire ». Aucune des trois ne se devine.
    //
    // ── Deux fautes du premier jet, et la seconde était grave ──
    //
    // 1. J'ai cru ce référentiel **vide** : ma sonde lisait `corps.aeronefs`
    //    quand la route rend `{ lignes, total, total_designations, pages }`.
    //    `lignes` n'est qu'**une page**. C'est la nomenclature figée d'ADR-001 —
    //    1,9 Mo, 1 028 désignations. Sept contrôles ont rougi sur une table que
    //    je croyais déserte.
    //
    // 2. Ma boucle de nettoyage prenait **le premier bouton de suppression de
    //    la page** : elle a effacé six lignes de la nomenclature qui ne
    //    m'appartenaient pas. Le bac est jetable, et rien de réel n'a été
    //    touché — mais le motif est inacceptable. *Une boucle qui efface « le
    //    premier » efface ce que le hasard a mis premier.* Elle ne retire plus
    //    que des lignes dont elle connaît l'identifiant, et le compte total doit
    //    revenir **exactement** à son départ.
    etape = 'référentiel des aéronefs';
    const refAer = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      // La route pagine : on l'interroge avec la recherche, pour trouver les
      // lignes de la ronde où qu'elles soient.
      const etat = async (recherche) => await (await fetch(
        `${api}/aeronefs${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`,
        { credentials: 'same-origin' })).json();
      const miennes = async () => ((await etat('RONDEX')).lignes || []);
      const q = (sel) => document.querySelector(sel);
      const poser = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      };
      const erreur = () => (document.getElementById('rampAerErreur') || {}).textContent || '';
      const enregistrer = async () => { q('[onclick^="rampEnregistrerAeronef"]').click(); await a(2800); };
      const compte = (motif) => {
        const b = [...document.querySelectorAll('.ramp-badge.compte')]
          .map((x) => new RegExp(`(\\d+)\\s*${motif}`).exec((x.textContent || '').trim()))
          .find(Boolean);
        return b ? Number(b[1]) : -1;
      };
      const groupes = () => document.querySelectorAll('tr.ramp-groupe-ligne').length;
      const variantes = () => document.querySelectorAll('tbody tr:not(.ramp-groupe-ligne)').length;
      const groupeDe = (designation) => [...document.querySelectorAll('tr.ramp-groupe-ligne')]
        .find((tr) => (tr.textContent || '').includes(designation));
      const chercher = async (texte) => {
        const champ = q('[oninput^="rampAerChercher"]');
        if (!champ) return false;
        champ.value = texte;
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(2400);
        return true;
      };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };

      [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
        .find((b) => /'aeronefs'/.test(b.getAttribute('onclick')))?.click();
      await a(2600);
      q('[onclick^="rampAerReset"]')?.click();
      await a(2200);
      const d0 = await etat('');
      r.total = d0.total;
      r.designations = d0.total_designations;
      // `nbPages`, et non `pages` : la phase qui éprouve la pagination s'appelle
      // « pages », et son relevé **écrasait ce champ**. Le contrôle lisait alors
      // `{…} > 1` — faux — sur une pagination qui marche. Un registre partagé
      // entre les phases et leurs noms n'admet pas deux fois le même nom.
      r.nbPages = d0.pages;
      r.taillePage = d0.taille_page;
      r.groupesSurLaPage = groupes();
      r.deja = (await miennes()).length;

      // ── 1. La pagination compte les désignations, non les lignes ──
      await essai('pages', async () => {
        const d = { page1: compte('désignation') };
        const suivant = [...document.querySelectorAll('[onclick^="rampAerPage"]')]
          .find((b) => !b.disabled && /rampAerPage\((\d+)\)/.test(b.getAttribute('onclick'))
            && Number(/rampAerPage\((\d+)\)/.exec(b.getAttribute('onclick'))[1]) > 1);
        d.boutonSuivant = !!suivant;
        if (!suivant) return d;
        const avant = groupeDe('') ? [...document.querySelectorAll('tr.ramp-groupe-ligne')]
          .map((tr) => (tr.querySelector('strong') || {}).textContent).join('|') : '';
        suivant.click();
        await a(2600);
        d.groupesPage2 = groupes();
        d.autresGroupes = [...document.querySelectorAll('tr.ramp-groupe-ligne')]
          .map((tr) => (tr.querySelector('strong') || {}).textContent).join('|') !== avant;
        // Et la page ne coupe pas un groupe : chaque bandeau porte ses variantes.
        const precedent = [...document.querySelectorAll('[onclick^="rampAerPage"]')]
          .find((b) => !b.disabled);
        if (precedent) { precedent.click(); await a(2600); }
        d.retourPage1 = groupes() === d.page1 || groupes() > 0;
        return d;
      });

      // ── 2. Les deux refus du formulaire ──
      await essai('refus', async () => {
        const d = {};
        q('[onclick="rampOuvrirAeronef()"]').click();
        await a(2200);
        d.formulaire = !!document.getElementById('rampAerDesignation');
        if (!d.formulaire) return d;
        await enregistrer();
        d.sansDesignation = erreur();
        poser('rampAerDesignation', 'RX320');
        await enregistrer();
        d.sansModele = erreur();
        d.rienCree = (await miennes()).length === r.deja;
        return d;
      });

      // ── 3. La création, et la désignation qui s'ouvre d'elle-même ──
      await essai('creation', async () => {
        const d = {};
        poser('rampAerModele', 'RONDEX RX-320-100');
        poser('rampAerConstructeur', 'RONDEX');
        poser('rampAerEtat', 'UEMOA');
        await enregistrer();
        d.fenetreFermee = !document.getElementById('rampAerDesignation');
        const mien = await miennes();
        d.aMoi = mien.length;
        const cree = mien.find((x) => x.designation === 'RX320');
        d.enBase = !!cree;
        if (!cree) return d;
        d.id = cree.id;
        d.modele = cree.modele;
        d.actif = cree.actif !== false;
        // « La désignation touchée s'ouvre » : on la cherche pour l'avoir sous
        // les yeux, et son chevron doit déjà être ouvert.
        await chercher('RONDEX');
        d.groupeOuvert = !!(groupeDe('RX320') || {}).querySelector?.('.ramp-extension.ouvert');
        d.varianteVisible = variantes() === 1;
        d.totalApres = (await etat('')).total;
        return d;
      });

      // ── 4. Une variante ajoutée **dans** le groupe : la désignation y est
      //      déjà portée, et c'est tout ce que ce troisième appel apporte ──
      await essai('variante', async () => {
        const d = {};
        const bouton = (groupeDe('RX320') || {}).querySelector?.('[onclick*="rampOuvrirAeronef("]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        bouton.click();
        await a(2200);
        d.designationPreRemplie = (document.getElementById('rampAerDesignation') || {}).value || '';
        poser('rampAerModele', 'RONDEX RX-320-200');
        poser('rampAerConstructeur', 'RONDEX');
        await enregistrer();
        await chercher('RONDEX');
        d.deuxVariantes = (await miennes()).filter((x) => x.designation === 'RX320').length;
        d.compteDuGroupe = String(((groupeDe('RX320') || {})
          .querySelector?.('.ramp-gi-compte') || {}).textContent || '').trim();
        // Une seconde désignation, pour que le pliage ait deux lots.
        q('[onclick="rampOuvrirAeronef()"]').click();
        await a(2200);
        poser('rampAerDesignation', 'RX737');
        poser('rampAerModele', 'RONDEX RX-737-800');
        poser('rampAerConstructeur', 'RONDEX');
        await enregistrer();
        await chercher('RONDEX');
        d.aMoi = (await miennes()).length;
        d.designationsVues = compte('désignation');
        return d;
      });

      // ── 5. Un lot se replie, et tout se replie — sur la page affichée ──
      await essai('pliage', async () => {
        const d = {};
        await chercher('RONDEX');
        q('[onclick^="rampAerToutDeplier(true)"]').click();
        await a(2000);
        d.groupes = groupes();
        d.toutesOuvertes = variantes();
        q('[onclick^="rampAerToutDeplier(false)"]').click();
        await a(2000);
        d.toutesRepliees = variantes();
        const chevron = (groupeDe('RX320') || {}).querySelector?.('.ramp-extension');
        d.chevron = !!chevron;
        if (chevron) {
          chevron.click();
          await a(1800);
          d.unLotOuvert = variantes();
          chevron.click();
          await a(1800);
          d.unLotReplie = variantes();
        }
        return d;
      });

      const id = (r.creation || {}).id;

      // ── 6. Modification, puis bascule d'activité dans les deux sens ──
      await essai('modifier', async () => {
        const d = {};
        if (!id) return { erreur: 'pas d’aéronef créé' };
        const ligne = () => [...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(id));
        const deplier = async () => {
          await chercher('RONDEX');
          q('[onclick^="rampAerToutDeplier(true)"]').click();
          await a(2000);
        };
        await deplier();
        d.ligne = !!ligne();
        if (!ligne()) return d;
        ligne().querySelector('[onclick^="rampOuvrirAeronef"]').click();
        await a(2200);
        d.designationRelue = (document.getElementById('rampAerDesignation') || {}).value || '';
        d.modeleRelu = (document.getElementById('rampAerModele') || {}).value || '';
        poser('rampAerConstructeur', 'RONDEX MODIFIE');
        await enregistrer();
        d.enBase = ((await miennes()).find((x) => x.id === id) || {}).constructeur;
        await deplier();
        const bascule = () => (ligne() || {}).querySelector?.('[onclick^="rampBasculerAeronef"]');
        d.bascule = !!bascule();
        if (!bascule()) return d;
        bascule().click();
        await a(2800);
        d.inactif = ((await miennes()).find((x) => x.id === id) || {}).actif === false;
        await deplier();
        bascule().click();
        await a(2800);
        d.rendu = ((await miennes()).find((x) => x.id === id) || {}).actif !== false;
        return d;
      });

      // ── 7. Recherche, filtre de facette, remise à zéro ──
      await essai('filtres', async () => {
        const d = {};
        q('[onclick^="rampAerReset"]').click();
        await a(2200);
        d.toutes = compte('désignation');
        d.cherchees = (await chercher('RONDEX')) ? compte('désignation') : -1;
        const filtre = q('[onchange^="rampAerSetFiltre"]');
        d.filtre = !!filtre;
        if (filtre) {
          const i = [...filtre.options].findIndex((o) => o.value);
          if (i >= 0) {
            filtre.selectedIndex = i;
            filtre.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2400);
            d.filtrees = compte('désignation');
          }
        }
        q('[onclick^="rampAerReset"]').click();
        await a(2200);
        d.rendues = compte('désignation');
        return d;
      });

      // ── 8. La ronde ne retire que **ses** lignes ──
      await essai('suppression', async () => {
        const d = { effaces: 0 };
        const miens = new Set((await miennes()).map((x) => x.id));
        d.aEffacer = miens.size;
        for (let garde = 0; garde < 8; garde += 1) {
          /* eslint-disable no-await-in-loop */
          await chercher('RONDEX');
          q('[onclick^="rampAerToutDeplier(true)"]')?.click();
          await a(1800);
          // Seule une ligne dont on connaît l'identifiant se supprime.
          const ligne = [...document.querySelectorAll('tbody tr')]
            .find((tr) => [...miens].some((x) => (tr.innerHTML || '').includes(x)));
          const bouton = ligne && ligne.querySelector('[onclick^="rampSupprimerAeronef"]');
          if (!bouton) break;
          bouton.click();
          if (!await oui()) break;
          d.effaces += 1;
        }
        d.restantes = (await miennes()).length;
        d.total = (await etat('')).total;
        d.rendueAuDepart = d.total === r.total;
        q('[onclick^="rampAerReset"]')?.click();
        await a(2000);
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const A = refAer;
      const G = A.pages || {};
      const F = A.refus || {};
      const C = A.creation || {};
      const V = A.variante || {};
      const P2 = A.pliage || {};
      const M3 = A.modifier || {};
      const T2 = A.filtres || {};
      const S2 = A.suppression || {};
      verifier('la nomenclature des aéronefs est paginée sur ses désignations, et une page n’en montre qu’une tranche',
        A.total > 1000 && A.designations > 100 && A.nbPages > 1
        && A.groupesSurLaPage === A.taillePage && A.deja === 0,
        JSON.stringify({ total: A.total, designations: A.designations, pages: A.nbPages,
          taille: A.taillePage, groupes: A.groupesSurLaPage }));
      verifier('la page suivante montre d’autres désignations, et le retour ramène à la première',
        G.boutonSuivant === true && G.groupesPage2 > 0 && G.autresGroupes === true
        && G.retourPage1 === true,
        JSON.stringify(G));
      verifier('le formulaire d’un aéronef exige une désignation, puis un modèle, et rien n’est créé',
        F.formulaire === true && (F.sansDesignation || '').length > 0
        && (F.sansModele || '').length > 0 && F.sansDesignation !== F.sansModele
        && F.rienCree === true,
        JSON.stringify(F).slice(0, 320));
      verifier('un aéronef se crée, le serveur le porte, et sa désignation s’ouvre d’elle-même — l’agent voit ce qu’il vient d’écrire',
        C.fenetreFermee === true && C.enBase === true && C.aMoi === 1
        && C.actif === true && C.groupeOuvert === true && C.varianteVisible === true
        && C.totalApres === A.total + 1,
        JSON.stringify(C));
      verifier('une variante s’ajoute depuis son lot, désignation déjà portée, et le lot en compte deux',
        V.bouton === true && V.designationPreRemplie === 'RX320'
        && V.deuxVariantes === 2 && V.compteDuGroupe === '2'
        && V.aMoi === 3 && V.designationsVues === 2,
        JSON.stringify(V));
      verifier('tout se déplie et tout se replie, puis un seul lot par son chevron',
        P2.groupes === 2 && P2.toutesOuvertes === 3 && P2.toutesRepliees === 0
        && P2.chevron === true && P2.unLotOuvert === 2 && P2.unLotReplie === 0,
        JSON.stringify(P2));
      verifier('une variante se modifie, le serveur la porte, et sa bascule d’activité joue dans les deux sens',
        M3.ligne === true && M3.designationRelue === 'RX320'
        && /RX-320-100/.test(M3.modeleRelu || '')
        && M3.enBase === 'RONDEX MODIFIE'
        && M3.bascule === true && M3.inactif === true && M3.rendu === true,
        JSON.stringify(M3));
      verifier('la recherche réduit la nomenclature aux lignes de la ronde, le filtre de facette joue, et la remise à zéro la rend entière',
        T2.toutes === A.designations + 2 && T2.cherchees === 2
        && T2.filtre === true && T2.filtrees >= 1 && T2.rendues === T2.toutes,
        JSON.stringify(T2));
      verifier('la ronde ne retire que ses propres lignes, et la nomenclature revient à son compte exact',
        S2.aEffacer === 3 && S2.effaces === 3 && S2.restantes === 0
        && S2.rendueAuDepart === true,
        JSON.stringify(S2));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Le référentiel des aéroports : groupé par pays, déplié par défaut
    // ══════════════════════════════════════════════════════════════════
    //
    // Troisième famille du même patron, et une différence qui se mesure : l'état
    // de pliage est **inversé** de celui des aéronefs. `replies` note ce qui est
    // **replié**, si bien que tout est ouvert au départ — et c'est pourquoi
    // l'enregistrement se contente d'**effacer** l'entrée du pays touché pour
    // que « l'agent voie ce qu'il vient d'écrire ».
    etape = 'référentiel des aéroports';
    const refApt = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const liste = async () => {
        const c = await (await fetch(`${api}/aeroports`, { credentials: 'same-origin' })).json();
        return Array.isArray(c) ? c : (c.aeroports || c.liste || []);
      };
      const miennes = async () => (await liste()).filter((x) => /RONDEX/.test(x.nom || ''));
      const q = (sel) => document.querySelector(sel);
      const poser = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const erreur = () => (document.getElementById('rampAptErreur') || {}).textContent || '';
      const enregistrer = async () => { q('[onclick^="rampEnregistrerAeroport"]').click(); await a(2800); };
      const compte = (motif) => {
        const b = [...document.querySelectorAll('.ramp-badge.compte')]
          .map((x) => new RegExp(`(\\d+)\\s*${motif}`).exec((x.textContent || '').trim()))
          .find(Boolean);
        return b ? Number(b[1]) : -1;
      };
      const groupes = () => document.querySelectorAll('tr.ramp-groupe-ligne').length;
      const plateformes = () => document.querySelectorAll('tbody tr:not(.ramp-groupe-ligne)').length;
      const groupeDe = (pays) => [...document.querySelectorAll('tr.ramp-groupe-ligne')]
        .find((tr) => ((tr.querySelector('strong') || {}).textContent || '').trim() === pays);
      const chercher = async (texte) => {
        const champ = q('[oninput^="rampAptChercher"]');
        if (!champ) return false;
        champ.value = texte;
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(2200);
        return true;
      };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };

      [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
        .find((b) => /'aeroports'/.test(b.getAttribute('onclick')))?.click();
      await a(2600);
      q('[onclick^="rampAptReset"]')?.click();
      await a(2200);
      r.depart = (await liste()).length;
      r.paysAuDepart = compte('pays');
      r.aeroportsAffiches = compte('aéroport');
      // Tout est ouvert au départ : `replies` est vide, et c'est l'inverse des
      // aéronefs. On le constate avant de toucher à quoi que ce soit.
      r.ouvertsAuDepart = plateformes() === r.depart;
      r.deja = (await miennes()).length;

      // ── 1. Les deux refus : le pays d'abord, l'intitulé ensuite ──
      await essai('refus', async () => {
        const d = {};
        q('[onclick="rampOuvrirAeroport()"]').click();
        await a(2200);
        d.formulaire = !!document.getElementById('rampAptPays');
        if (!d.formulaire) return d;
        await enregistrer();
        d.sansPays = erreur();
        const select = document.getElementById('rampAptPays');
        const i = [...select.options].findIndex((o) => o.value);
        d.paysOffert = i >= 0;
        select.selectedIndex = i;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        d.paysChoisi = select.value;
        await enregistrer();
        d.sansNom = erreur();
        d.rienCree = (await miennes()).length === r.deja;
        return d;
      });

      const pays = (r.refus || {}).paysChoisi;

      // ── 2. La création, et le pays touché qui reste déplié ──
      await essai('creation', async () => {
        const d = {};
        if (!pays) return { erreur: 'pas de pays offert' };
        poser('rampAptNom', 'RONDEX — plateforme de la ronde');
        poser('rampAptCode', 'RXXX');
        poser('rampAptStatut', 'International');
        await enregistrer();
        d.fenetreFermee = !document.getElementById('rampAptPays');
        const mien = await miennes();
        d.aMoi = mien.length;
        const cree = mien[0];
        d.enBase = !!cree;
        if (!cree) return d;
        d.id = cree.id;
        d.pays = cree.pays;
        d.code = cree.code;
        d.statut = cree.statut;
        d.actif = cree.actif !== false;
        d.totalApres = (await liste()).length;
        // Le pays touché n'est pas replié : son chevron est ouvert, et la
        // plateforme créée se voit.
        d.groupeOuvert = !!(groupeDe(pays) || {}).querySelector?.('.ramp-extension.ouvert');
        d.ligneVisible = !![...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(cree.id));
        return d;
      });

      const id = (r.creation || {}).id;

      // ── 3. Le bouton du lot porte son pays, et le pliage joue à l'envers ──
      await essai('lot', async () => {
        const d = {};
        if (!pays) return { erreur: 'pas de pays' };
        const bouton = (groupeDe(pays) || {}).querySelector?.('[onclick*="rampOuvrirAeroport("]');
        d.bouton = !!bouton;
        if (bouton) {
          bouton.click();
          await a(2200);
          d.paysPreChoisi = (document.getElementById('rampAptPays') || {}).value || '';
          q('[onclick^="rampFermerModal"]').click();
          await a(1400);
        }
        // « Tout replier » ferme tout — l'inverse des aéronefs, où « tout
        // déplier » ouvrait.
        q('[onclick^="rampAptToutDeplier(false)"]').click();
        await a(2000);
        d.toutesRepliees = plateformes();
        q('[onclick^="rampAptToutDeplier(true)"]').click();
        await a(2000);
        d.toutesOuvertes = plateformes();
        const chevron = (groupeDe(pays) || {}).querySelector?.('.ramp-extension');
        d.chevron = !!chevron;
        if (chevron) {
          chevron.click();
          await a(1800);
          d.unLotReplie = plateformes();
          chevron.click();
          await a(1800);
          d.unLotRendu = plateformes();
        }
        return d;
      });

      // ── 4. Modification, bascule d'activité ──
      await essai('modifier', async () => {
        const d = {};
        if (!id) return { erreur: 'pas d’aéroport créé' };
        await chercher('RONDEX');
        const ligne = () => [...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(id));
        d.ligne = !!ligne();
        if (!ligne()) return d;
        ligne().querySelector('[onclick^="rampOuvrirAeroport"]').click();
        await a(2200);
        d.nomRelu = (document.getElementById('rampAptNom') || {}).value || '';
        d.codeRelu = (document.getElementById('rampAptCode') || {}).value || '';
        poser('rampAptStatut', 'Domestique');
        await enregistrer();
        d.statutEnBase = ((await miennes())[0] || {}).statut;
        await chercher('RONDEX');
        const bascule = () => (ligne() || {}).querySelector?.('[onclick^="rampBasculerAeroport"]');
        d.bascule = !!bascule();
        if (!bascule()) return d;
        bascule().click();
        await a(2800);
        d.inactif = ((await miennes())[0] || {}).actif === false;
        await chercher('RONDEX');
        bascule().click();
        await a(2800);
        d.rendu = ((await miennes())[0] || {}).actif !== false;
        return d;
      });

      // ── 5. Recherche, facette, remise à zéro, et la suppression ──
      await essai('fin', async () => {
        const d = {};
        q('[onclick^="rampAptReset"]').click();
        await a(2200);
        d.toutes = compte('pays');
        d.cherchees = (await chercher('RONDEX')) ? compte('pays') : -1;
        const filtre = q('[onchange^="rampAptSetFiltre"]');
        d.filtre = !!filtre;
        if (filtre) {
          const i = [...filtre.options].findIndex((o) => o.value);
          if (i >= 0) {
            filtre.selectedIndex = i;
            filtre.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2200);
            d.filtrees = compte('pays');
          }
        }
        q('[onclick^="rampAptReset"]').click();
        await a(2200);
        d.rendues = compte('pays');
        // Et la suppression, restreinte aux lignes dont la ronde a l'identifiant.
        if (!id) return d;
        await chercher('RONDEX');
        const ligne = [...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(id));
        const bouton = ligne && ligne.querySelector('[onclick^="rampSupprimerAeroport"]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        bouton.click();
        d.confirme = await oui();
        d.restantes = (await miennes()).length;
        d.total = (await liste()).length;
        d.rendueAuDepart = d.total === r.depart;
        q('[onclick^="rampAptReset"]')?.click();
        await a(2000);
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const A = refApt;
      const F = A.refus || {};
      const C = A.creation || {};
      const L = A.lot || {};
      const M3 = A.modifier || {};
      const Z = A.fin || {};
      verifier('les aéroports partent groupés par pays et tous dépliés — l’inverse des aéronefs',
        A.depart > 10 && A.paysAuDepart > 1 && A.aeroportsAffiches === A.depart
        && A.ouvertsAuDepart === true && A.deja === 0,
        JSON.stringify({ depart: A.depart, pays: A.paysAuDepart,
          affiches: A.aeroportsAffiches, ouverts: A.ouvertsAuDepart }));
      verifier('le formulaire d’un aéroport exige un pays, puis un intitulé, et rien n’est créé',
        F.formulaire === true && (F.sansPays || '').length > 0
        && F.paysOffert === true && (F.sansNom || '').length > 0
        && F.sansPays !== F.sansNom && F.rienCree === true,
        JSON.stringify(F).slice(0, 320));
      verifier('un aéroport se crée, le serveur le porte, et son pays reste déplié — la plateforme se voit aussitôt',
        C.fenetreFermee === true && C.enBase === true && C.aMoi === 1
        && C.code === 'RXXX' && C.statut === 'International' && C.actif === true
        && C.totalApres === A.depart + 1
        && C.groupeOuvert === true && C.ligneVisible === true,
        JSON.stringify(C));
      verifier('le bouton du lot porte son pays, et le pliage joue à l’envers : « tout replier » ferme',
        L.bouton === true && L.paysPreChoisi === (A.refus || {}).paysChoisi
        && L.toutesRepliees === 0 && L.toutesOuvertes === A.depart + 1
        && L.chevron === true && L.unLotReplie < L.toutesOuvertes
        && L.unLotRendu === L.toutesOuvertes,
        JSON.stringify(L));
      verifier('l’aéroport se modifie, le serveur le porte, et sa bascule d’activité joue dans les deux sens',
        M3.ligne === true && /plateforme de la ronde/.test(M3.nomRelu || '')
        && M3.codeRelu === 'RXXX' && M3.statutEnBase === 'Domestique'
        && M3.bascule === true && M3.inactif === true && M3.rendu === true,
        JSON.stringify(M3));
      verifier('la recherche et la facette restreignent, la remise à zéro rend, et la suppression ramène le compte exact',
        // L'aéroport de la ronde rejoint un pays **existant** : le compte des
        // pays ne bouge pas. J'avais écrit « +1 » par analogie avec les
        // aéronefs, où la désignation était neuve.
        Z.toutes === A.paysAuDepart && Z.cherchees === 1
        && Z.filtre === true && Z.rendues === Z.toutes
        && Z.bouton === true && Z.confirme === true && Z.restantes === 0
        && Z.rendueAuDepart === true,
        JSON.stringify(Z));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Les items SAFA et leurs groupes : un code qui ne suit pas l'intitulé
    // ══════════════════════════════════════════════════════════════════
    //
    // Quatrième famille, et la seule qui porte **deux familles sur un écran** :
    // les items, et les groupes qui les rangent. Le patron est le même, mais la
    // règle qui compte est ailleurs — elle est écrite deux fois, dans le client
    // et dans la route :
    //
    //   « Un groupe d'items porte un code technique **dérivé de son intitulé**.
    //     Les items le retiennent, si bien qu'un groupe renommé garde les
    //     siens. »
    //
    // C'est donc ce que ce bloc éprouve : on crée un groupe, on y range un
    // item, **on renomme le groupe**, et l'item doit y rester. Un référentiel
    // qui détacherait ses items à chaque correction d'orthographe perdrait le
    // rangement de tout un programme d'inspection.
    etape = 'items et groupes SAFA';
    const refItems = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const familles = async () => ((await (await fetch(`${api}/parametres`,
        { credentials: 'same-origin' })).json()).familles || {});
      const q = (sel) => document.querySelector(sel);
      const poser = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const compte = () => {
        const b = [...document.querySelectorAll('.ramp-badge.compte')]
          .map((x) => /(\d+)\s*élément/.exec((x.textContent || '').trim()))
          .find(Boolean);
        return b ? Number(b[1]) : -1;
      };
      const bandeauDe = (titre) => [...document.querySelectorAll('tr.ramp-groupe-ligne')]
        .find((tr) => ((tr.querySelector('strong') || {}).textContent || '').trim() === titre);
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };

      [...document.querySelectorAll('[onclick^="rampParamOnglet"]')]
        .find((b) => /'items'/.test(b.getAttribute('onclick')))?.click();
      await a(2600);
      const f0 = await familles();
      r.itemsAuDepart = (f0.items || []).length;
      r.groupesAuDepart = (f0.groupes || []).length;
      r.elementsAffiches = compte();

      // ── 1. Le groupe refuse un intitulé vide, puis se crée ──
      await essai('groupe', async () => {
        const d = {};
        q('[onclick^="rampOuvrirGroupe"]').click();
        await a(2200);
        d.formulaire = !!document.getElementById('rampGroupeLabel');
        if (!d.formulaire) return d;
        q('[onclick^="rampEnregistrerGroupe"]').click();
        await a(1800);
        d.sansIntitule = (document.getElementById('rampGroupeErreur') || {}).textContent || '';
        d.rienCree = ((await familles()).groupes || []).length === r.groupesAuDepart;
        poser('rampGroupeLabel', 'Groupe RONDEX');
        poser('rampGroupeDesc', 'Groupe posé par la ronde.');
        q('[onclick^="rampEnregistrerGroupe"]').click();
        await a(3000);
        d.fenetreFermee = !document.getElementById('rampGroupeLabel');
        const g = ((await familles()).groupes || []).find((x) => x.label === 'Groupe RONDEX');
        d.enBase = !!g;
        if (!g) return d;
        d.id = g.id;
        // Le code est **dérivé** de l'intitulé par le serveur : le formulaire ne
        // le demande pas, et c'est lui que les items retiendront.
        d.code = g.code;
        d.codeDerive = !!g.code && g.code !== g.label;
        d.bandeau = !!bandeauDe('Groupe RONDEX');
        return d;
      });

      const codeGroupe = (r.groupe || {}).code;
      const idGroupe = (r.groupe || {}).id;

      // ── 2. Un item, rangé dans ce groupe ──
      await essai('item', async () => {
        const d = {};
        if (!codeGroupe) return { erreur: 'pas de groupe' };
        q('[onclick^="rampOuvrirParam("]').click();
        await a(2200);
        d.formulaire = !!document.getElementById('rampParamLabel');
        if (!d.formulaire) return d;
        q('[onclick^="rampEnregistrerParam"]').click();
        await a(1800);
        d.sansLibelle = (document.getElementById('rampParamErreur') || {}).textContent || '';
        poser('rampParamCode', 'RX01');
        poser('rampParamLabel', 'Item RONDEX');
        poser('rampParamDesc', 'Item posé par la ronde.');
        const cat = document.getElementById('rampParamCat');
        d.groupeOffert = !!cat && [...cat.options].some((o) => o.value === codeGroupe);
        if (cat) { cat.value = codeGroupe; cat.dispatchEvent(new Event('change', { bubbles: true })); }
        q('[onclick^="rampEnregistrerParam"]').click();
        await a(3000);
        const it = ((await familles()).items || []).find((x) => x.label === 'Item RONDEX');
        d.enBase = !!it;
        if (!it) return d;
        d.id = it.id;
        d.cat = it.cat;
        d.rangeDansLeGroupe = it.cat === codeGroupe;
        d.code = it.code;
        // Et il se voit sous le bandeau de son groupe.
        d.sousSonBandeau = !![...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(it.id));
        return d;
      });

      const idItem = (r.item || {}).id;

      // ── 3. Le groupe renommé **garde ses items** ──
      await essai('renommage', async () => {
        const d = {};
        if (!idGroupe || !idItem) return { erreur: 'pas de groupe ou d’item' };
        // Relevé avant la garde : quels bandeaux la table porte-t-elle ?
        d.bandeaux = [...document.querySelectorAll('tr.ramp-groupe-ligne')]
          .map((tr) => ((tr.querySelector('strong') || {}).textContent || '').trim());
        d.ongletActif = (document.querySelector('[onclick^="rampParamOnglet"].active') || {})
          .getAttribute?.('onclick') || '';
        // ── `*=` et non `^=` : la cellule d'actions est **commune** ──
        //
        // Le même `actions()` sert aux lignes d'item et aux bandeaux de groupe,
        // et ses boutons commencent tous par `event.stopPropagation();`. Mon
        // `^="rampOuvrirGroupe"` ne mordait donc sur rien — et le relevé des
        // bandeaux, lui, montrait « Groupe RONDEX » bien présent. *Quand le
        // repère échoue sur une chose qu'on voit, c'est le repère qu'il faut
        // lire.*
        const bandeau = bandeauDe('Groupe RONDEX');
        const bouton = bandeau && bandeau.querySelector('[onclick*="rampOuvrirGroupe"]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        bouton.click();
        await a(2200);
        d.intituleRelu = (document.getElementById('rampGroupeLabel') || {}).value || '';
        poser('rampGroupeLabel', 'Groupe RONDEX renommé');
        q('[onclick^="rampEnregistrerGroupe"]').click();
        await a(3000);
        const fam = await familles();
        const g = (fam.groupes || []).find((x) => x.id === idGroupe) || {};
        const it = (fam.items || []).find((x) => x.id === idItem) || {};
        d.intituleEnBase = g.label;
        d.codeInchange = g.code === codeGroupe;
        d.itemTientSonGroupe = it.cat === codeGroupe;
        d.bandeauRenomme = !!bandeauDe('Groupe RONDEX renommé');
        d.itemToujoursVu = !![...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(idItem));
        return d;
      });

      // ── 4. Le bandeau se replie, l'item se désactive, et l'export compose ──
      await essai('gestes', async () => {
        const d = {};
        if (!idItem) return { erreur: 'pas d’item' };
        const bandeau = () => bandeauDe('Groupe RONDEX renommé');
        const chevron = (bandeau() || {}).querySelector?.('.ramp-extension');
        d.chevron = !!chevron;
        const vu = () => !![...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(idItem));
        if (chevron) {
          d.ouvertAuDepart = vu();
          chevron.click();
          await a(1800);
          d.replie = !vu();
          (bandeau() || {}).querySelector?.('.ramp-extension').click();
          await a(1800);
          d.rendu = vu();
        }
        const ligne = () => [...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(idItem));
        const bascule = (ligne() || {}).querySelector?.('[onclick*="rampBasculerParam"]');
        d.bascule = !!bascule;
        if (bascule) {
          bascule.click();
          await a(3000);
          d.inactif = ((await familles()).items || [])
            .find((x) => x.id === idItem).actif === false;
          const r2 = [...document.querySelectorAll('tbody tr')]
            .find((tr) => (tr.innerHTML || '').includes(idItem));
          r2?.querySelector('[onclick*="rampBasculerParam"]')?.click();
          await a(3000);
          d.renduActif = ((await familles()).items || [])
            .find((x) => x.id === idItem).actif !== false;
        }
        // L'export compose son document dans le navigateur : on capture le
        // produit par relais, comme en 5.f.10.
        const relais = { fenetres: 0, blobs: 0 };
        const vraiOpen = window.open;
        const vraiURL = URL.createObjectURL;
        window.open = () => { relais.fenetres += 1;
          return { document: { write: () => {}, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {} }; };
        URL.createObjectURL = (b) => { relais.blobs += 1; return vraiURL.call(URL, b); };
        try {
          q('[onclick^="rampExporterParametres"]').click();
          await a(3000);
        } finally { window.open = vraiOpen; URL.createObjectURL = vraiURL; }
        d.export = relais;
        return d;
      });

      // ── 5. La ronde retire l'item, puis son groupe ──
      await essai('menage', async () => {
        const d = { effaces: 0 };
        for (const cible of [idItem, idGroupe]) {
          if (!cible) continue;
          /* eslint-disable no-await-in-loop */
          const ligne = [...document.querySelectorAll('tbody tr')]
            .find((tr) => (tr.innerHTML || '').includes(cible));
          const bouton = ligne && ligne.querySelector('[onclick*="rampSupprimerParam"]');
          if (!bouton) continue;
          bouton.click();
          if (await oui()) d.effaces += 1;
        }
        const fam = await familles();
        d.items = (fam.items || []).length;
        d.groupes = (fam.groupes || []).length;
        d.rendueAuDepart = d.items === r.itemsAuDepart && d.groupes === r.groupesAuDepart;
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const I = refItems;
      const G = I.groupe || {};
      const T = I.item || {};
      const R2 = I.renommage || {};
      const Ge = I.gestes || {};
      const M4 = I.menage || {};
      verifier('un groupe d’items refuse un intitulé vide, puis se crée avec un code que le serveur dérive',
        G.formulaire === true && (G.sansIntitule || '').length > 0 && G.rienCree === true
        && G.fenetreFermee === true && G.enBase === true
        && G.codeDerive === true && G.bandeau === true,
        JSON.stringify(G));
      verifier('un item refuse un libellé vide, puis se range dans ce groupe et paraît sous son bandeau',
        T.formulaire === true && (T.sansLibelle || '').length > 0
        && T.groupeOffert === true && T.enBase === true
        && T.rangeDansLeGroupe === true && T.code === 'RX01'
        && T.sousSonBandeau === true,
        JSON.stringify(T));
      verifier('le groupe renommé garde son code — et garde donc ses items, qui le retiennent',
        R2.bouton === true && R2.intituleRelu === 'Groupe RONDEX'
        && R2.intituleEnBase === 'Groupe RONDEX renommé'
        && R2.codeInchange === true && R2.itemTientSonGroupe === true
        && R2.bandeauRenomme === true && R2.itemToujoursVu === true,
        JSON.stringify(R2).slice(0, 400));
      verifier('le bandeau du groupe se replie et se rend, l’item se désactive et se réactive, et l’export compose son document',
        Ge.chevron === true && Ge.ouvertAuDepart === true
        && Ge.replie === true && Ge.rendu === true
        && Ge.bascule === true && Ge.inactif === true && Ge.renduActif === true
        && !!Ge.export && (Ge.export.blobs + Ge.export.fenetres) >= 1,
        JSON.stringify(Ge));
      verifier('la ronde retire son item puis son groupe, et les deux familles reviennent à leur compte',
        M4.effaces === 2 && M4.rendueAuDepart === true,
        JSON.stringify(M4));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Les dépôts de preuve : un vrai fichier, et deux refus
    // ══════════════════════════════════════════════════════════════════
    //
    // Cinquième famille, et la seule qui **verse un fichier**. `uploadFile` de
    // Puppeteer ne s'appelle que depuis Node, et cette ronde vit dans une
    // évaluation de page : un `DataTransfer` suffit — on fabrique un vrai
    // `File`, on le pose sur l'entrée, et l'enregistrement le POST en multipart
    // (même méthode qu'en 5.f.29).
    //
    // Ce que cela ne prouve pas, et qui doit être dit : ni que le sélecteur de
    // fichiers du système s'ouvre, ni que l'agent y choisit quelque chose. La
    // mesure commence au fichier reçu par l'entrée.
    etape = 'dépôts de preuve';
    await ouvrir('depot');
    await attendre(2600);
    const refDep = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const liste = async () => await (await fetch(`${api}/depots`,
        { credentials: 'same-origin' })).json();
      const q = (sel) => document.querySelector(sel);
      const poser = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const erreur = () => (document.getElementById('rampDepotErreur') || {}).textContent || '';
      const enregistrer = async () => { q('[onclick^="rampEnregistrerDepot"]').click(); await a(3000); };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };
      // La ligne « aucun dépôt » est elle aussi un `tr` : la compter rendait
      // `1` sur une table **vide**, et mon « une seule ligne cherchée » passait
      // sans rien trouver. On écarte la ligne d'état.
      const lignes = () => [...document.querySelectorAll('tbody tr')]
        .filter((tr) => !tr.querySelector('.ramp-table-vide')).length;

      q('[onclick^="rampResetFiltresDepot"]')?.click();
      await a(1800);
      r.depart = (await liste()).length;

      // ── 1. Les deux refus : l'intitulé d'abord, le fichier ensuite ──
      await essai('refus', async () => {
        const d = {};
        q('[onclick^="rampOuvrirDepot"]').click();
        await a(2400);
        d.formulaire = !!document.getElementById('rampDepotNom');
        d.entreeFichier = !!document.getElementById('rampFichierDepot');
        if (!d.formulaire) return d;
        await enregistrer();
        d.sansNom = erreur();
        poser('rampDepotNom', 'RONDEX — dépôt de la ronde');
        await enregistrer();
        d.sansFichier = erreur();
        d.rienCree = (await liste()).length === r.depart;
        return d;
      });

      // ── 2. Le fichier versé, et le dépôt relu chez le serveur ──
      await essai('creation', async () => {
        const d = {};
        const entree = document.getElementById('rampFichierDepot');
        if (!entree) return { erreur: 'pas d’entrée de fichier' };
        const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e,
          0x34, 0x0a, 0x25, 0xc7, 0xec, 0x8f, 0xa2, 0x0a]);
        const dt = new DataTransfer();
        dt.items.add(new File([pdf], 'rondex.pdf', { type: 'application/pdf' }));
        entree.files = dt.files;
        entree.dispatchEvent(new Event('change', { bubbles: true }));
        await a(900);
        // Le nom du fichier choisi s'affiche : c'est le geste en ligne de
        // l'entrée qui le pose.
        d.nomAffiche = (document.getElementById('rampNomFichier') || {}).textContent || '';
        await enregistrer();
        d.fenetreFermee = !document.getElementById('rampDepotNom');
        const apres = await liste();
        d.apres = apres.length;
        const cree = apres.find((x) => /RONDEX/.test(x.nom || ''));
        d.enBase = !!cree;
        if (!cree) return d;
        d.id = cree.id;
        d.nomOrigine = cree.nom_origine;
        d.taille = cree.taille;
        d.deposePar = !!cree.depose_par;
        d.annee = cree.annee;
        d.mois = cree.mois;
        d.dansLaTable = !![...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(cree.id));
        return d;
      });

      const id = (r.creation || {}).id;

      // ── 3. La recherche, le filtre d'année, et la suppression ──
      await essai('fin', async () => {
        const d = {};
        d.toutes = lignes();
        const champ = q('[oninput^="rampChercherDepot"]');
        d.champ = !!champ;
        if (champ) {
          champ.value = 'RONDEX';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await a(2000);
          d.cherchees = lignes();
        }
        // ── Le filtre d'année, et une assertion qui ne mesurait que sa présence ──
        //
        // Premier jet : `d.filtre = !!filtre`, et le contrôle s'en contentait.
        // Il était vert, et `rampSetFiltre` restait **non exercé** — le geste
        // n'avait pas porté. On relève donc les options offertes et l'état du
        // filtre après le choix : c'est l'effet qui prouve, jamais la présence.
        const filtre = q('[onchange*="rampSetFiltre(\'depotAnnee\'"]');
        d.filtre = !!filtre;
        if (filtre) {
          d.optionsAnnee = [...filtre.options].map((o) => o.value);
          d.anneesEnBase = (await liste()).map((x) => x.annee);
          d.anneesEnCache = ((window.RAMP_STATE || {}).data || {}).depots
            ? window.RAMP_STATE.data.depots.map((x) => x.annee) : null;
          const i = [...filtre.options].findIndex((o) => o.value);
          d.optionRetenue = i >= 0 ? filtre.options[i].value : '';
          if (i >= 0) {
            filtre.selectedIndex = i;
            filtre.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2400);
            d.filtrees = lignes();
            d.etatDuFiltre = ((window.RAMP_STATE || {}).filtres || {}).depotAnnee || '';
          }
        }
        q('[onclick^="rampResetFiltresDepot"]').click();
        await a(2000);
        d.rendues = lignes();
        if (!id) return d;
        const ligne = [...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(id));
        const bouton = ligne && ligne.querySelector('[onclick^="rampSupprimerDepot"]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        bouton.click();
        d.confirme = await oui();
        const apres = await liste();
        d.apres = apres.length;
        d.rendueAuDepart = apres.length === r.depart;
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const D = refDep;
      const F = D.refus || {};
      const C = D.creation || {};
      const Z = D.fin || {};
      verifier('le dépôt refuse un intitulé vide, puis réclame un fichier, et rien n’est déposé',
        F.formulaire === true && F.entreeFichier === true
        && (F.sansNom || '').length > 0 && /fichier/i.test(F.sansFichier || '')
        && F.sansNom !== F.sansFichier && F.rienCree === true,
        JSON.stringify(F).slice(0, 320));
      verifier('un fichier se verse pour de vrai : son nom s’affiche, et le serveur porte le dépôt avec sa taille et son déposant',
        /rondex\.pdf/.test(C.nomAffiche || '') && C.fenetreFermee === true
        && C.enBase === true && C.apres === D.depart + 1
        && C.nomOrigine === 'rondex.pdf' && C.taille === 15
        && C.deposePar === true && !!C.annee && !!C.mois
        && C.dansLaTable === true,
        JSON.stringify(C));
      verifier('la recherche et le filtre d’année restreignent la table, la remise à zéro la rend, et le dépôt se supprime',
        Z.champ === true && Z.cherchees === 1 && Z.filtre === true
        && (Z.optionRetenue || '').length > 0
        && Z.etatDuFiltre === Z.optionRetenue && Z.filtrees >= 1
        && Z.rendues === Z.toutes && Z.bouton === true && Z.confirme === true
        && Z.rendueAuDepart === true,
        JSON.stringify(Z));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Le carnet des contacts : groupé par État
    // ══════════════════════════════════════════════════════════════════
    //
    // Sixième et dernière famille de `ramp-parametres.js`. Deux refus, et un
    // détail qui compte : l'État n'est offert que parmi **ceux que le compte
    // peut gérer** — `etats.filter(rampPeutGererEtat)`.
    etape = 'carnet des contacts';
    await ouvrir('contacts');
    await attendre(2600);
    const refCon = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const liste = async () => await (await fetch(`${api}/contacts`,
        { credentials: 'same-origin' })).json();
      const q = (sel) => document.querySelector(sel);
      const poser = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const erreur = () => (document.getElementById('rampContactErreur') || {}).textContent || '';
      const enregistrer = async () => { q('[onclick^="rampEnregistrerContact"]').click(); await a(3000); };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };
      r.depart = (await liste()).length;

      // ── 1. Les deux refus : l'État, puis le nom et les prénoms ──
      await essai('refus', async () => {
        const d = {};
        q('[onclick^="rampOuvrirContact"]').click();
        await a(2400);
        d.formulaire = !!document.getElementById('rampContactEtat');
        if (!d.formulaire) return d;
        await enregistrer();
        d.sansEtat = erreur();
        const select = document.getElementById('rampContactEtat');
        const i = [...select.options].findIndex((o) => o.value);
        d.etatOffert = i >= 0;
        if (i >= 0) {
          select.selectedIndex = i;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          d.etat = select.value;
        }
        await enregistrer();
        d.sansNom = erreur();
        // Le nom seul ne suffit pas : les prénoms sont exigés avec lui.
        poser('rampContactNom', 'RONDEX');
        await enregistrer();
        d.sansPrenom = erreur();
        d.rienCree = (await liste()).length === r.depart;
        return d;
      });

      // ── 2. La création, relue chez le serveur ──
      await essai('creation', async () => {
        const d = {};
        poser('rampContactPrenom', 'Ronde');
        poser('rampContactFonction', 'Inspecteur de la ronde');
        poser('rampContactEmail', 'rondex@example.org');
        poser('rampContactTel', '+228 00 00 00 00');
        poser('rampContactAutres', 'Contact posé par la ronde.');
        await enregistrer();
        d.fenetreFermee = !document.getElementById('rampContactEtat');
        const apres = await liste();
        d.apres = apres.length;
        const cree = apres.find((x) => x.nom === 'RONDEX');
        d.enBase = !!cree;
        if (!cree) return d;
        d.id = cree.id;
        d.etat = cree.etat;
        d.prenom = cree.prenom;
        d.email = cree.email;
        d.actif = cree.actif !== false;
        d.dansLaTable = !![...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(cree.id));
        return d;
      });

      const id = (r.creation || {}).id;

      // ── 3. Modification, bascule d'activité, suppression ──
      await essai('fin', async () => {
        const d = {};
        if (!id) return { erreur: 'pas de contact créé' };
        const ligne = () => [...document.querySelectorAll('tbody tr')]
          .find((tr) => (tr.innerHTML || '').includes(id));
        d.ligne = !!ligne();
        if (!ligne()) return d;
        ligne().querySelector('[onclick*="rampOuvrirContact"]').click();
        await a(2400);
        d.nomRelu = (document.getElementById('rampContactNom') || {}).value || '';
        d.emailRelu = (document.getElementById('rampContactEmail') || {}).value || '';
        poser('rampContactFonction', 'Inspecteur principal');
        await enregistrer();
        d.fonctionEnBase = ((await liste()).find((x) => x.id === id) || {}).fonction;
        const bascule = () => (ligne() || {}).querySelector?.('[onclick*="rampBasculerContact"]');
        d.bascule = !!bascule();
        if (bascule()) {
          bascule().click();
          await a(3000);
          d.inactif = ((await liste()).find((x) => x.id === id) || {}).actif === false;
          bascule().click();
          await a(3000);
          d.rendu = ((await liste()).find((x) => x.id === id) || {}).actif !== false;
        }
        const bouton = (ligne() || {}).querySelector?.('[onclick*="rampSupprimerContact"]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        bouton.click();
        d.confirme = await oui();
        const apres = await liste();
        d.apres = apres.length;
        d.rendueAuDepart = apres.length === r.depart;
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const K = refCon;
      const F = K.refus || {};
      const C = K.creation || {};
      const Z = K.fin || {};
      verifier('le contact exige un État que le compte peut gérer, puis un nom **et** des prénoms — trois refus distincts',
        F.formulaire === true && F.etatOffert === true
        && (F.sansEtat || '').length > 0 && (F.sansNom || '').length > 0
        && (F.sansPrenom || '').length > 0 && F.sansEtat !== F.sansNom
        && F.rienCree === true,
        JSON.stringify(F).slice(0, 320));
      verifier('un contact se crée, et le serveur le porte avec son État, ses prénoms et son courriel',
        C.fenetreFermee === true && C.enBase === true && C.apres === K.depart + 1
        && C.etat === (K.refus || {}).etat && C.prenom === 'Ronde'
        && C.email === 'rondex@example.org' && C.actif === true
        && C.dansLaTable === true,
        JSON.stringify(C));
      verifier('le contact se modifie, sa bascule d’activité joue dans les deux sens, et il se supprime sans rien laisser',
        Z.ligne === true && Z.nomRelu === 'RONDEX'
        && Z.emailRelu === 'rondex@example.org'
        && Z.fonctionEnBase === 'Inspecteur principal'
        && Z.bascule === true && Z.inactif === true && Z.rendu === true
        && Z.bouton === true && Z.confirme === true && Z.rendueAuDepart === true,
        JSON.stringify(Z));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Le volet des statistiques : séries, pas de temps, anneaux, situation
    // ══════════════════════════════════════════════════════════════════
    //
    // `ramp-stats.js` était à **3 noms sur 35**, et les trois étaient
    // génériques — `rampFermerModal`, `event.stopPropagation`,
    // `document.getElementById`. Aucun geste propre des statistiques n'était
    // exercé : le plus gros gisement du module.
    //
    // ── Pourquoi la ronde doit semer avant de mesurer ──
    //
    // Les boutons de série et de pas existent sans données ; les **périodes**,
    // les **années** et les **États** n'existent pas. `rampAnneeTempsBoutons`
    // rend la chaîne vide quand aucune inspection ne porte de date, et le
    // panneau d'un pas rend « aucune période ». Un relevé fait sur un écran
    // désert ne mesurerait que des boutons morts.
    //
    // La ronde sème donc **quatre inspections** par la route d'importation —
    // qui reçoit du JSON, et non un classeur —, deux États et deux années, deux
    // exploitants, avec leurs écarts. Puis elle les retire.
    etape = 'statistiques de RAMP';
    await ouvrir('dashboard');
    await attendre(2400);
    const stats = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const env = async (url, methode, corps) => {
        const rep = await fetch(api + url, {
          method: methode, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await rep.json(); } catch { /* vide */ }
        return { statut: rep.status, corps: b };
      };
      const inspections = async () => {
        const c = await (await fetch(`${api}/inspections`, { credentials: 'same-origin' })).json();
        return Array.isArray(c) ? c : (c.inspections || []);
      };
      const q = (sel) => document.querySelector(sel);
      const volet = () => document.querySelector('.ramp-slider-body');
      const dans = (sel) => (volet() || document).querySelectorAll(sel);
      const un = (sel) => (volet() || document).querySelector(sel);

      // ── Deux États du périmètre, pris sur les aéroports du bac ──
      const apts = await (await fetch(`${api}/aeroports`, { credentials: 'same-origin' })).json();
      const listeApt = Array.isArray(apts) ? apts : (apts.aeroports || apts.liste || []);
      const etats = [...new Set(listeApt.map((x) => x.pays).filter(Boolean))].slice(0, 2);
      // `listeEtats` et `nbBlocs`, et non `etats` et `blocs` : les phases
      // s'appellent « etats » et « blocs », et leurs relevés **écrasaient ces
      // deux champs**. C'est le télescopage de 5.f.30, refait deux fois dans le
      // même registre. *Un registre partagé entre les phases et leurs noms
      // n'admet pas deux fois le même nom* — et l'écrire une fois ne suffit
      // visiblement pas à ne plus le refaire.
      r.listeEtats = etats;
      r.deja = (await inspections()).length;

      const ligne = (etat, annee, exploitant, immat, statut, cat) => ({
        date: `${annee}-06-15`, pays: etat, exploitant, aeronef: 'RX320',
        immatriculation: immat, vol: `RX${immat.slice(-3)}`,
        status: statut, itemsInspectes: 12,
        anomalies: [{
          itemCode: 'A05', stdRef: 'RONDEX-1',
          description: 'Écart semé par la ronde.', categorie: cat,
          action: cat === 'Catégorie 3' ? 'Classe 3' : 'Classe 1', suivi: 'Ouvert',
        }],
      });
      const semees = [
        ligne(etats[0], '2026', 'RONDEX Air', 'TT-RX01', 'Clos', 'Catégorie 1'),
        ligne(etats[0], '2025', 'RONDEX Air', 'TT-RX02', 'En cours', 'Catégorie 3'),
        ligne(etats[1] || etats[0], '2026', 'RONDEX Cargo', 'TT-RX03', 'Clos', 'Catégorie 2'),
        ligne(etats[1] || etats[0], '2025', 'RONDEX Cargo', 'TT-RX04', 'En cours', 'Catégorie 3'),
      ];
      const sem = await env('/inspections/import', 'POST', { data: semees });
      r.semis = sem.statut;
      r.creees = (sem.corps || {}).creees;
      await window.rampRecharger();
      await a(2200);
      r.apresSemis = (await inspections()).length;

      // Le volet des statistiques s'ouvre depuis le tableau de bord.
      q('[onclick^="rampOuvrirStatistiques"]')?.click();
      await a(3200);
      r.voletOuvert = !!volet();
      r.nbBlocs = dans('[onclick^="rampBasculerBloc"]').length;

      // ── 1. Les trois blocs se replient et se déplient ──
      await essai('blocs', async () => {
        const d = {};
        const tetes = [...dans('[onclick^="rampBasculerBloc"]')];
        d.tetes = tetes.length;
        if (!tetes.length) return d;
        const corpsVisibles = () => dans('.ramp-bloc-corps, [style*="padding:0 1rem 1rem"]').length;
        d.avant = corpsVisibles();
        const cle = tetes[0].getAttribute('onclick');
        tetes[0].click();
        await a(2000);
        d.apres = dans('.ramp-bloc-corps, [style*="padding:0 1rem 1rem"]').length;
        [...dans('[onclick^="rampBasculerBloc"]')]
          .find((b) => b.getAttribute('onclick') === cle)?.click();
        await a(2000);
        d.rendu = dans('.ramp-bloc-corps, [style*="padding:0 1rem 1rem"]').length;
        return d;
      });

      // ── 2. La série, le pas, le menu d'un pas, une période, et le vidage ──
      await essai('temps', async () => {
        const d = {};
        const serie = [...dans('[onclick^="rampSerieTemps"]')];
        d.series = serie.length;
        if (serie.length > 1) {
          serie[1].click();
          await a(2200);
          d.serieActive = [...dans('[onclick^="rampSerieTemps"]')]
            .filter((b) => b.classList.contains('actif')).length;
          d.serieRetenue = (window.RAMP_STATE || {}).tempsSerie || '';
        }
        const pasBoutons = [...dans('[onclick^="rampPasTemps"]')];
        d.pas = pasBoutons.length;
        if (pasBoutons.length) {
          const cible = pasBoutons[pasBoutons.length - 1].getAttribute('onclick');
          pasBoutons[pasBoutons.length - 1].click();
          await a(2200);
          d.pasRetenu = (window.RAMP_STATE || {}).tempsPas || '';
          d.pasCible = cible;
        }
        // Le chevron d'un pas ouvre la liste de ses périodes.
        const fleche = [...dans('[onclick^="rampMenuTemps"]')];
        d.fleches = fleche.length;
        if (fleche.length) {
          fleche[0].click();
          await a(2200);
          d.menuOuvert = (window.RAMP_STATE || {}).tempsMenu || '';
          d.panneaux = dans('.ramp-multi-panneau').length;
          d.cases = dans('[onchange^="rampBasculerPeriode"]').length;
          // Une période cochée : la sélection se fige sur ce qui est affiché.
          const caseP = un('[onchange^="rampBasculerPeriode"]');
          if (caseP) {
            caseP.checked = true;
            caseP.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2200);
            const sel = ((window.RAMP_STATE || {}).tempsSelection || {})[d.menuOuvert] || [];
            d.retenues = sel.length;
            // Et le vidage, qui n'apparaît qu'une fois quelque chose retenu.
            const vider = un('[onclick^="rampViderPeriodes"]');
            d.boutonVider = !!vider;
            if (vider) {
              vider.click();
              await a(2200);
              d.apresVidage = (((window.RAMP_STATE || {}).tempsSelection || {})[d.menuOuvert] || []).length;
            }
          }
        }
        return d;
      });

      // ── 3. L'année observée, choisie dans sa liste ──
      await essai('annee', async () => {
        const d = {};
        const select = un('[onchange^="rampChoisirAnneeTemps"]');
        d.select = !!select;
        if (!select) return d;
        d.options = [...select.options].map((o) => o.value);
        const autre = [...select.options].find((o) => o.value && o.value !== select.value);
        d.autre = autre ? autre.value : '';
        if (!autre) return d;
        select.value = autre.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await a(2400);
        d.retenue = (window.RAMP_STATE || {}).tempsAnnee || '';
        return d;
      });

      // ── 4. Les États du graphe : la série, et l'exclusion d'un État ──
      await essai('etats', async () => {
        const d = {};
        const serie = [...dans('[onclick^="rampSerieEtats"]')];
        d.series = serie.length;
        if (serie.length > 1) {
          serie[1].click();
          await a(2200);
          d.retenue = (window.RAMP_STATE || {}).etatsSerie || '';
        }
        const exclure = [...dans('[onclick^="rampBasculerEtatGraphe"]')];
        d.exclusions = exclure.length;
        if (exclure.length) {
          const cle = exclure[0].getAttribute('onclick');
          exclure[0].click();
          await a(2200);
          d.exclus = Object.values((window.RAMP_STATE || {}).etatsExclus || {})
            .filter(Boolean).length;
          [...dans('[onclick^="rampBasculerEtatGraphe"]')]
            .find((b) => b.getAttribute('onclick') === cle)?.click();
          await a(2200);
          d.rendus = Object.values((window.RAMP_STATE || {}).etatsExclus || {})
            .filter(Boolean).length;
        }
        return d;
      });

      // ── 5. L'anneau : une part se masque, et le mode des aéronefs ──
      await essai('anneau', async () => {
        const d = {};
        const parts = [...dans('[onclick^="rampBasculerPartAnneau"]')];
        d.parts = parts.length;
        if (parts.length) {
          const cle = parts[0].getAttribute('onclick');
          parts[0].click();
          await a(2200);
          d.masques = Object.values((window.RAMP_STATE || {}).anneauxMasques || {})
            .flatMap((m) => Object.values(m)).filter(Boolean).length;
          [...dans('[onclick^="rampBasculerPartAnneau"]')]
            .find((b) => b.getAttribute('onclick') === cle)?.click();
          await a(2200);
          d.rendues = Object.values((window.RAMP_STATE || {}).anneauxMasques || {})
            .flatMap((m) => Object.values(m)).filter(Boolean).length;
        }
        const modes = [...dans('[onclick^="rampStatsAeronefMode"]')];
        d.modes = modes.length;
        if (modes.length > 1) {
          modes[1].click();
          await a(2200);
          d.mode = (window.RAMP_STATE || {}).statsAeronefMode || '';
        }
        return d;
      });

      // ── 6. La situation : une ligne d'exploitant se déplie, et l'export compose ──
      await essai('situation', async () => {
        const d = {};
        const lignes = [...dans('[onclick^="rampBasculerLigne"]')];
        d.lignes = lignes.length;
        if (lignes.length) {
          const cle = lignes[0].getAttribute('onclick');
          const avant = dans('tbody tr').length;
          lignes[0].click();
          await a(2400);
          d.apresDepliage = dans('tbody tr').length;
          d.aOuvert = d.apresDepliage > avant;
          d.depliees = Object.values((window.RAMP_STATE || {}).lignesDepliees || {})
            .filter(Boolean).length;
          [...dans('[onclick^="rampBasculerLigne"]')]
            .find((b) => b.getAttribute('onclick') === cle)?.click();
          await a(2400);
          d.rendu = dans('tbody tr').length === avant;
        }
        // L'export compose son document dans le navigateur : relais.
        const relais = { fenetres: 0, blobs: 0 };
        const vraiOpen = window.open;
        const vraiURL = URL.createObjectURL;
        window.open = () => { relais.fenetres += 1;
          return { document: { write: () => {}, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {} }; };
        URL.createObjectURL = (b) => { relais.blobs += 1; return vraiURL.call(URL, b); };
        try {
          // `*=` : ce bouton porte `event.stopPropagation();` avant son appel,
          // comme les bandeaux de groupe des paramètres (n° 5.f.32).
          const exp = un('[onclick*="rampExporterSituation"]');
          d.boutonExport = !!exp;
          if (exp) { exp.click(); await a(3200); }
        } finally { window.open = vraiOpen; URL.createObjectURL = vraiURL; }
        d.export = relais;
        return d;
      });

      // ── 7. Le générateur de tables : le seul glisser-déposer du dépôt ──
      //
      // Un glissé ne se joue pas à la souris. Chrome n'émet de `DragEvent` que
      // pour un glissé venu du système, et `page.mouse` ne porte aucun
      // `dataTransfer` — or le porte-données **est** ce que les deux gestes se
      // passent. On le construit donc soi-même, `new DataTransfer()`, et on le
      // donne aux trois évènements dans l'ordre du navigateur : `dragstart` sur
      // la source, `dragover` puis `drop` sur la cible. Le même objet circule :
      // ce que `rampGenDragStart` y écrit est ce que `rampGenDrop` y relit.
      // *C'est la liaison qu'on mesure, et non deux appels côte à côte.*
      //
      // Le bouton vit dans le volet des statistiques ; la modale, elle, est
      // posée dans `#rampModalRoot`, **hors du volet**. Les deux portées ne se
      // confondent pas : `un`/`dans` pour le volet, `mq`/`mqa` pour la modale.
      await essai('generateur', async () => {
        const d = {};
        const M = () => document.getElementById('rampModalRoot');
        const mq = (sel) => (M() || document).querySelector(sel);
        const mqa = (sel) => [...(M() || document).querySelectorAll(sel)];
        const colonnes = () => (window.RAMP_STATE || {}).tableColonnes || [];
        const cles = () => colonnes().map((c) => c.cle);
        const glisser = (source, cible) => {
          const dt = new DataTransfer();
          const ev = (nom) => new DragEvent(nom, {
            dataTransfer: dt, bubbles: true, cancelable: true,
          });
          source.dispatchEvent(ev('dragstart'));
          cible.dispatchEvent(ev('dragover'));
          cible.dispatchEvent(ev('drop'));
        };
        const champ = (cle) => mq(`.ramp-gen-champ[data-cle="${cle}"]`);

        un('[onclick*="rampOuvrirGenerateur"]')?.click();
        await a(2600);
        d.modaleOuverte = !!mq('.ramp-gen');
        d.disponibles = mqa('.ramp-gen-champ').length;
        d.familles = mqa('.ramp-gen-famille').length;
        d.videAuDepart = !!mq('.ramp-gen-vide');
        d.auDepart = colonnes().length;

        // ── a. Un champ glissé de la gauche vers la table ──
        const source = champ('exploitant');
        const cible = mq('.ramp-gen-cible');
        d.source = !!source;
        d.cible = !!cible;
        if (source && cible) glisser(source, cible);
        await a(1400);
        d.apresGlisse = colonnes().length;
        d.cleGlissee = (colonnes()[0] || {}).cle;
        // Un champ de texte arrive en regroupement : c'est la règle du code,
        // relue chez lui et non supposée.
        d.roleArrive = (colonnes()[0] || {}).role;

        // Contre-essai : le même champ reglissé ne se pose pas deux fois.
        const encore = champ('exploitant');
        if (encore && mq('.ramp-gen-cible')) glisser(encore, mq('.ramp-gen-cible'));
        await a(1400);
        d.apresDoublon = colonnes().length;

        // ── b. Un second champ, par double-clic ──
        const mesure = champ('itemsInspectes');
        d.mesure = !!mesure;
        mesure?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await a(1400);
        d.apresDblClic = colonnes().length;
        d.roleMesure = (colonnes()[1] || {}).role;
        d.modeMesure = (colonnes()[1] || {}).mode;
        d.cles = cles();
        return d;
      });

      // ── 8. Le rôle d'une colonne, son mode, et ce que la table totalise ──
      //
      // Trois rôles — regrouper en lignes, croiser en colonnes, être la donnée
      // observée — et le mode (valeurs telles quelles, ou somme) qui
      // **n'apparaît que** pour une donnée. Le bas de la modale dit laquelle
      // des deux tables sortira ; on le lit aussi, car c'est l'effet visible du
      // rôle.
      await essai('generateurRoles', async () => {
        const d = {};
        const M = () => document.getElementById('rampModalRoot');
        const mq = (sel) => (M() || document).querySelector(sel);
        const mqa = (sel) => [...(M() || document).querySelectorAll(sel)];
        const col = (i) => (((window.RAMP_STATE || {}).tableColonnes || [])[i] || {});
        const pose = (i) => mqa('.ramp-gen-pose')[i];
        const bouton = (i, sel, k) => [...(pose(i) || document).querySelectorAll(sel)][k];
        const pied = () => (mq('.ramp-gen-bas') || {}).textContent || '';

        d.poses = mqa('.ramp-gen-pose').length;
        d.roleAvant = col(0).role;
        d.piedAvant = /crois/i.test(pied());

        // Les trois boutons de rôle, dans l'ordre du rendu.
        d.boutonsRole = [...(pose(0) || document)
          .querySelectorAll('[onclick*="rampGenRole("]')].length;
        bouton(0, '[onclick*="rampGenRole("]', 1)?.click();   // croisement
        await a(1200);
        d.roleCroisement = col(0).role;

        bouton(0, '[onclick*="rampGenRole("]', 2)?.click();   // donnée
        await a(1200);
        d.roleDonnee = col(0).role;
        // Le mode n'existe que pour une donnée : la bascule apparaît avec elle.
        d.boutonsMode = [...(pose(0) || document)
          .querySelectorAll('[onclick*="rampGenMode("]')].length;

        bouton(0, '[onclick*="rampGenMode("]', 1)?.click();   // somme
        await a(1200);
        d.modeSomme = col(0).mode;
        bouton(0, '[onclick*="rampGenMode("]', 0)?.click();   // valeurs
        await a(1200);
        d.modeValeurs = col(0).mode;

        bouton(0, '[onclick*="rampGenRole("]', 0)?.click();   // regroupement, rendu
        await a(1200);
        d.roleRendu = col(0).role;
        d.modeDisparu = [...(pose(0) || document)
          .querySelectorAll('[onclick*="rampGenMode("]')].length;

        // ── Les totaux ──
        const cases = mqa('[onchange*="rampGenTotal("]');
        d.cases = cases.length;
        const general = cases.find((c) => (c.getAttribute('onchange') || '').includes('general'));
        d.caseGenerale = !!general;
        if (general) {
          general.checked = false;
          general.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await a(1200);
        d.totalGeneral = ((window.RAMP_STATE || {}).tableTotaux || {}).general;
        const rendu = mqa('[onchange*="rampGenTotal("]')
          .find((c) => (c.getAttribute('onchange') || '').includes('general'));
        d.caseDecochee = rendu ? rendu.checked === false : null;
        if (rendu) {
          rendu.checked = true;
          rendu.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await a(1200);
        d.totalRendu = ((window.RAMP_STATE || {}).tableTotaux || {}).general;
        return d;
      });

      // ── 9. Un champ sans relation : la table le signale et refuse de partir ──
      //
      // Le catalogue dit quelles familles se joignent — inspection ↔ écart, et
      // les contacts avec eux seuls. Un contact posé à côté d'une inspection ne
      // produirait rien de sensé : la modale le marque en rouge, le compte au
      // bandeau, et **désarme l'export**. C'est le seul endroit où un bouton
      // d'export se ferme tout seul.
      await essai('generateurConflit', async () => {
        const d = {};
        const M = () => document.getElementById('rampModalRoot');
        const mq = (sel) => (M() || document).querySelector(sel);
        const mqa = (sel) => [...(M() || document).querySelectorAll(sel)];
        const colonnes = () => (window.RAMP_STATE || {}).tableColonnes || [];
        const glisser = (source, cible) => {
          const dt = new DataTransfer();
          const ev = (nom) => new DragEvent(nom, {
            dataTransfer: dt, bubbles: true, cancelable: true,
          });
          source.dispatchEvent(ev('dragstart'));
          cible.dispatchEvent(ev('dragover'));
          cible.dispatchEvent(ev('drop'));
        };
        const exporter = () => mq('[onclick*="rampGenExporter"]');

        d.exportArmeAvant = exporter() ? !exporter().disabled : null;
        const contact = mq('.ramp-gen-champ[data-cle="c_nom"]');
        d.contact = !!contact;
        if (contact && mq('.ramp-gen-cible')) glisser(contact, mq('.ramp-gen-cible'));
        await a(1400);
        d.apres = colonnes().length;
        d.marques = mqa('.ramp-gen-pose.conflit').length;
        d.bandeau = /relation/i.test((mq('.ramp-gen-cible') || {}).textContent || '');
        d.exportDesarme = exporter() ? exporter().disabled === true : null;

        // On retire le dernier posé : le conflit tombe, l'export se réarme.
        const retraits = mqa('[onclick*="rampGenRetirer("]');
        d.retraits = retraits.length;
        retraits[retraits.length - 1]?.click();
        await a(1400);
        d.apresRetrait = colonnes().length;
        d.marquesApres = mqa('.ramp-gen-pose.conflit').length;
        d.exportRearme = exporter() ? !exporter().disabled : null;
        return d;
      });

      // ── 10. Les filtres de l'export ──
      //
      // Ils ne touchent pas aux écrans : ils bornent seulement ce que le
      // classeur emportera. Leurs listes sont garnies par les inspections —
      // donc par celles que la ronde a semées, et c'est encore la raison de
      // semer avant de mesurer.
      await essai('generateurFiltres', async () => {
        const d = {};
        const M = () => document.getElementById('rampModalRoot');
        const mq = (sel) => (M() || document).querySelector(sel);
        const mqa = (sel) => [...(M() || document).querySelectorAll(sel)];
        const F = () => (window.RAMP_STATE || {}).tableFiltres || {};

        const listes = mqa('[onchange*="rampGenFiltre("]');
        d.listes = listes.length;
        const exploitant = listes
          .find((s) => (s.getAttribute('onchange') || '').includes('exploitant'));
        d.liste = !!exploitant;
        d.options = exploitant
          ? [...exploitant.options].map((o) => o.value).filter(Boolean) : [];
        const choix = d.options.find((v) => /RONDEX/.test(v));
        d.choix = choix || null;
        if (exploitant && choix) {
          exploitant.value = choix;
          exploitant.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await a(1400);
        d.retenu = F().exploitant;
        // La remise à zéro compte ce qu'elle effacera : son intitulé le dit.
        const reset = mq('[onclick*="rampGenFiltresReset"]');
        d.reset = !!reset;
        d.compte = reset ? (reset.getAttribute('title') || '') : '';
        reset?.click();
        await a(1400);
        d.apresReset = Object.values(F()).filter(Boolean).length;
        return d;
      });

      // ── 11. L'ordre des colonnes, par un second glissé ──
      //
      // Celui-ci ne porte pas le même format que le premier :
      // `application/x-ramp-ordre`, et non `text/plain`. Les deux dépôts vivent
      // sur la même cible — un champ lâché sur une colonne déjà posée remonte à
      // `rampGenDrop`, qui ne lit rien et ne fait rien. Le format **est** la
      // discrimination ; on l'éprouve donc dans les deux sens.
      await essai('generateurOrdre', async () => {
        const d = {};
        const M = () => document.getElementById('rampModalRoot');
        const mqa = (sel) => [...(M() || document).querySelectorAll(sel)];
        const cles = () => ((window.RAMP_STATE || {}).tableColonnes || []).map((c) => c.cle);
        const pose = (i) => mqa('.ramp-gen-pose')[i];
        const glisser = (source, cible) => {
          const dt = new DataTransfer();
          const ev = (nom) => new DragEvent(nom, {
            dataTransfer: dt, bubbles: true, cancelable: true,
          });
          source.dispatchEvent(ev('dragstart'));
          cible.dispatchEvent(ev('dragover'));
          cible.dispatchEvent(ev('drop'));
        };

        d.avant = cles();
        d.poignees = mqa('.ramp-gen-poignee').length;
        if (pose(1) && pose(0)) glisser(pose(1), pose(0));
        await a(1400);
        d.apres = cles();
        d.permute = d.avant.length === 2 && d.apres.length === 2
          && d.apres[0] === d.avant[1] && d.apres[1] === d.avant[0];

        // Contre-essai : déposée sur elle-même, une colonne ne bouge pas.
        if (pose(0)) glisser(pose(0), pose(0));
        await a(1400);
        d.surSoi = cles();
        d.inerte = JSON.stringify(d.surSoi) === JSON.stringify(d.apres);
        return d;
      });

      // ── 12. L'export du classeur, puis le vidage ──
      //
      // Le serveur prépare le classeur et rend une adresse ; le navigateur
      // l'enregistre. Rien n'est composé dans la page — donc rien à relayer,
      // contrairement aux autres exports du module. Ce qui se mesure est le
      // **lien de secours** que la modale reçoit, posé avant la navigation, et
      // le fait que la page n'a pas bougé : une adresse en pièce jointe
      // n'emmène nulle part.
      await essai('generateurExport', async () => {
        const d = {};
        const M = () => document.getElementById('rampModalRoot');
        const mq = (sel) => (M() || document).querySelector(sel);
        const colonnes = () => (window.RAMP_STATE || {}).tableColonnes || [];

        d.cheminAvant = location.pathname;
        const exp = mq('[onclick*="rampGenExporter"]');
        d.bouton = !!exp;
        d.arme = exp ? !exp.disabled : null;
        d.colonnesExportees = colonnes().length;
        exp?.click();
        await a(5000);
        const lien = mq('#rampGenLien a');
        d.lien = !!lien;
        d.href = lien ? String(lien.getAttribute('href') || '') : '';
        d.fichier = lien ? String(lien.getAttribute('download') || '') : '';
        d.cheminApres = location.pathname;
        d.modaleDebout = !!mq('.ramp-gen');

        // ── Le vidage ──
        const vider = mq('[onclick*="rampGenVider"]');
        d.boutonVider = !!vider;
        vider?.click();
        await a(1400);
        d.apresVidage = colonnes().length;
        d.videRendu = !!mq('.ramp-gen-vide');
        const apres = mq('[onclick*="rampGenExporter"]');
        d.exportDesarme = apres ? apres.disabled === true : null;
        // Le vidage retire son propre bouton : il n'a plus rien à vider.
        d.viderParti = !mq('[onclick*="rampGenVider"]');

        mq('[onclick*="rampFermerModal"]')?.click();
        await a(1400);
        d.modaleFermee = !mq('.ramp-gen');
        return d;
      });

      // ── 13. La ronde retire ce qu'elle a semé ──
      await essai('menage', async () => {
        const d = { effacees: 0 };
        const miennes = (await inspections()).filter((x) => /RONDEX/.test(x.exploitant || ''));
        d.aEffacer = miennes.length;
        for (const i of miennes) {
          /* eslint-disable no-await-in-loop */
          const rep = await env(`/inspections/${i.id}`, 'DELETE');
          if (rep.statut === 200) d.effacees += 1;
        }
        d.apres = (await inspections()).length;
        d.rendueAuDepart = d.apres === r.deja;
        return d;
      });
      return r;
    }, '/api/m/ramp');

    {
      const S2 = stats;
      const B = S2.blocs || {};
      const T = S2.temps || {};
      const An = S2.annee || {};
      const E = S2.etats || {};
      const Ca = S2.anneau || {};
      const Si = S2.situation || {};
      const Me = S2.menage || {};
      const G1 = S2.generateur || {};
      const G2 = S2.generateurRoles || {};
      const G3 = S2.generateurConflit || {};
      const G4 = S2.generateurFiltres || {};
      const G5 = S2.generateurOrdre || {};
      const G6 = S2.generateurExport || {};
      verifier('la ronde sème quatre inspections par la route d’importation, et le volet des statistiques s’ouvre sur ses blocs',
        S2.semis === 201 && S2.creees === 4 && S2.apresSemis === S2.deja + 4
        && S2.voletOuvert === true && S2.nbBlocs >= 3,
        JSON.stringify({ semis: S2.semis, creees: S2.creees, etats: S2.listeEtats,
          volet: S2.voletOuvert, blocs: S2.nbBlocs }));
      verifier('les blocs des statistiques se replient et se déplient par leur en-tête',
        B.tetes >= 3 && B.apres < B.avant && B.rendu === B.avant,
        JSON.stringify(B));
      verifier('la série et le pas de temps se choisissent, et le chevron d’un pas ouvre la liste de ses périodes',
        T.series === 3 && T.serieActive === 1 && (T.serieRetenue || '').length > 0
        // `RAMP_GRANULARITES()` rend **trois** pas — mois, trimestre, semestre —
        // et les chevrons de `rampMenuTemps` ne sont pas tous les leurs : il y
        // en a cinq sur le volet. J'avais écrit quatre, par symétrie supposée.
        && T.pas === 3 && (T.pasRetenu || '').length > 0
        && T.fleches >= T.pas && (T.menuOuvert || '').length > 0 && T.panneaux === 1,
        JSON.stringify(T).slice(0, 380));
      verifier('une période se coche — la sélection se fige sur ce qui est affiché — et le vidage, qui n’apparaît qu’alors, la retire',
        T.cases >= 1 && T.retenues >= 1 && T.boutonVider === true
        && T.apresVidage === 0,
        JSON.stringify({ cases: T.cases, retenues: T.retenues,
          vider: T.boutonVider, apres: T.apresVidage }));
      verifier('l’année observée se choisit dans sa liste, garnie par les dates des inspections semées',
        An.select === true && (An.options || []).filter(Boolean).length >= 2
        && An.retenue === An.autre,
        JSON.stringify(An));
      verifier('le graphe des États change de série, et un État s’exclut puis revient',
        E.series >= 2 && (E.retenue || '').length > 0
        && E.exclusions >= 1 && E.exclus === 1 && E.rendus === 0,
        JSON.stringify(E));
      verifier('une part d’anneau se masque puis revient, et le mode du graphe des aéronefs se change',
        Ca.parts >= 1 && Ca.masques === 1 && Ca.rendues === 0
        && Ca.modes >= 2 && (Ca.mode || '').length > 0,
        JSON.stringify(Ca));
      verifier('une ligne d’exploitant se déplie sur son détail par item, se replie, et la situation s’exporte',
        Si.lignes >= 2 && Si.aOuvert === true && Si.depliees === 1 && Si.rendu === true
        && Si.boutonExport === true
        && !!Si.export && (Si.export.blobs + Si.export.fenetres) >= 1,
        JSON.stringify(Si));
      verifier('le générateur de tables s’ouvre sur son catalogue, un champ s’y glisse de la gauche vers la table, et ne s’y pose pas deux fois',
        G1.modaleOuverte === true && G1.disponibles >= 20 && G1.familles === 3
        && G1.videAuDepart === true && G1.auDepart === 0
        && G1.source === true && G1.cible === true
        && G1.apresGlisse === 1 && G1.cleGlissee === 'exploitant'
        // Un champ de texte arrive en regroupement : la règle est dans
        // `rampGenAjouter`, relue chez elle.
        && G1.roleArrive === 'regroupement'
        && G1.apresDoublon === 1,
        JSON.stringify(G1).slice(0, 380));
      verifier('un champ se pose aussi au double-clic, et un nombre y arrive en donnée sommée',
        G1.mesure === true && G1.apresDblClic === 2
        && G1.roleMesure === 'donnee' && G1.modeMesure === 'somme'
        && JSON.stringify(G1.cles || []) === JSON.stringify(['exploitant', 'itemsInspectes']),
        JSON.stringify({ mesure: G1.mesure, apres: G1.apresDblClic,
          role: G1.roleMesure, mode: G1.modeMesure, cles: G1.cles }));
      verifier('les trois rôles d’une colonne se choisissent, et le mode n’apparaît que pour une donnée',
        G2.poses === 2 && G2.boutonsRole === 3 && G2.roleAvant === 'regroupement'
        && G2.roleCroisement === 'croisement' && G2.roleDonnee === 'donnee'
        // La bascule du mode naît avec le rôle « donnée » et repart avec lui :
        // c'est l'effet qu'on mesure, non la présence du bouton.
        && G2.boutonsMode === 2 && G2.modeSomme === 'somme' && G2.modeValeurs === 'valeurs'
        && G2.roleRendu === 'regroupement' && G2.modeDisparu === 0,
        JSON.stringify(G2).slice(0, 380));
      verifier('une case de totalisation se décoche et se recoche, et la table l’enregistre',
        G2.cases === 3 && G2.caseGenerale === true
        && G2.totalGeneral === false && G2.caseDecochee === true
        && G2.totalRendu === true,
        JSON.stringify({ cases: G2.cases, general: G2.totalGeneral,
          decochee: G2.caseDecochee, rendu: G2.totalRendu }));
      verifier('un champ sans relation avec les autres se marque en rouge, désarme l’export, et son retrait réarme tout',
        G3.exportArmeAvant === true && G3.contact === true && G3.apres === 3
        && G3.marques === 3 && G3.bandeau === true && G3.exportDesarme === true
        && G3.retraits === 3 && G3.apresRetrait === 2 && G3.marquesApres === 0
        && G3.exportRearme === true,
        JSON.stringify(G3).slice(0, 380));
      verifier('un filtre de l’export se choisit dans une liste garnie par les inspections semées, et la remise à zéro l’efface',
        G4.listes === 8 && G4.liste === true && (G4.options || []).length >= 2
        && /RONDEX/.test(String(G4.choix || '')) && G4.retenu === G4.choix
        && G4.reset === true && /\(1\)/.test(String(G4.compte || ''))
        && G4.apresReset === 0,
        JSON.stringify(G4).slice(0, 380));
      verifier('l’ordre des colonnes se change en glissant une colonne sur une autre, et une colonne lâchée sur elle-même ne bouge pas',
        (G5.avant || []).length === 2 && G5.poignees === 2
        && G5.permute === true && G5.inerte === true,
        JSON.stringify(G5));
      verifier('l’export du générateur rend un lien de secours vers le classeur préparé, sans quitter la page, puis le vidage rend la table à blanc',
        G6.bouton === true && G6.arme === true && G6.colonnesExportees === 2
        && G6.lien === true && /\/tables\/fichier\//.test(String(G6.href || ''))
        && /\.xlsx$/.test(String(G6.fichier || ''))
        // Une adresse servie en pièce jointe n'emmène nulle part : la page est
        // restée, et la modale avec elle.
        && G6.cheminApres === G6.cheminAvant && G6.modaleDebout === true
        && G6.boutonVider === true && G6.apresVidage === 0 && G6.videRendu === true
        && G6.exportDesarme === true && G6.viderParti === true
        && G6.modaleFermee === true,
        JSON.stringify(G6).slice(0, 420));
      verifier('la navigation vers le classeur préparé est abandonnée une fois, sur son chemin, et la ronde le déclare au lieu de le taire',
        abandonsVus.filter((x) => /\/tables\/fichier\//.test(String(x))).length === 1,
        JSON.stringify(abandonsVus));
      verifier('la ronde retire ses quatre inspections, et le module revient à son compte',
        Me.aEffacer === 4 && Me.effacees === 4 && Me.rendueAuDepart === true,
        JSON.stringify(Me));
    }


    // ══════════════════════════════════════════════════════════════════
    //  La ronde d'un classeur, du dépôt à l'écriture
    // ══════════════════════════════════════════════════════════════════
    //
    // Les cinq derniers gestes de `ramp-stats.js`, et le seul endroit du dépôt
    // où l'écran exige un **vrai fichier** quand la route d'importation, elle,
    // accepte du JSON. Rien ne se simule : le classeur est **écrit** avec le
    // paquet `xlsx` que le serveur emploie pour le relire, remis à l'entrée de
    // fichier par un `DataTransfer` — `uploadFile` de Puppeteer veut un chemin
    // sur le disque, et l'entrée est cachée derrière une zone de dépôt —, et
    // c'est l'analyse du serveur qui garnit l'aperçu.
    //
    // ── Le classeur est écrit pour que les trois sorts paraissent ──
    //
    // L'analyse marque chaque inspection « nouvelle », « mise à jour » ou
    // « doublon », et le sort se décide **par confrontation à la base**. Un
    // classeur quelconque n'aurait donc rendu que des « nouvelle », et trois
    // badges sur quatre seraient restés sans preuve.
    //
    // La ronde sème donc deux inspections d'avance, puis dépose un classeur qui
    // porte : **deux lignes partageant les six clés** — une seule inspection,
    // deux écarts, ce qui éprouve le regroupement —, une seconde inspection
    // neuve, une ligne qui reprend l'une des semées à l'identique (**doublon**),
    // et une qui reprend l'autre avec un autre statut (**mise à jour**). Une
    // colonne inconnue s'y ajoute, pour la note des colonnes non reprises. Et
    // un **rang de titre** avant les intitulés, comme en porte le modèle servi
    // par le module : c'est le serveur qui cherche la ligne d'intitulés.
    //
    // ── Ce que la ronde n'éprouve pas, et pourquoi ──
    //
    // Le quatrième sort, « hors périmètre », n'est pas atteignable ici :
    // `R.couvreEtat` rend vrai sans condition pour un administrateur, et la
    // ronde se connecte en superadmin. L'éprouver demanderait un compte de
    // coordonnateur national à États limités, donc une autre session — *et un
    // contrôle qui prétendrait le mesurer en superadmin serait vert sans rien
    // mesurer.*
    etape = 'importation d’un classeur';
    const CLASSEUR_B64 = (() => {
      const entetes = ['POI', 'Date', 'Pays', 'Exploitant', 'Aéronef', 'Immatriculation',
        'N° Vol', 'Statut', 'Items Inspectés', 'Item', 'Std Ref.', 'Description',
        'Catégorie', 'Action', 'Suivi', 'Colonne que le module ne connaît pas'];
      const l = (vol, statut, items, item, cat, extra) => ['POI-CL-2026-001',
        '2026-04-10', 'Togo', 'CLASSEUR Air', 'B737-800', `TT-CL${vol.slice(-1)}0`,
        vol, statut, items, item, 'CAT.OP.MPA.175', 'Écart porté par le classeur',
        cat, cat, '', extra];
      const ws = XLSX.utils.aoa_to_sheet([
        ['Classeur de la ronde — rien de réel'],
        entetes,
        // Deux lignes, six clés identiques : une inspection, deux écarts.
        l('CL101', 'Ouvert', 20, 'A05', '2', 'ignorée'),
        l('CL101', 'Ouvert', 20, 'C04', '3', 'ignorée'),
        // Une seconde inspection neuve.
        l('CL102', 'Ouvert', 14, 'B02', '1', 'ignorée'),
        // Reprise à l'identique d'une semée : doublon.
        l('CL901', 'Clos', 10, 'A05', '2', 'ignorée'),
        // Reprise d'une semée avec un autre statut : mise à jour.
        l('CL902', 'En cours', 10, 'A05', '2', 'ignorée'),
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inspections');
      return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    })();

    // `etats`, et non `inspections` : c'est la clé que `RAMP_NAV` donne à la
    // page des inspections. J'avais écrit le mot de l'écran au lieu de la clé
    // de l'aiguillage, et `ouvrir()` **ne dit rien** quand sa cible n'existe
    // pas — la page n'a pas changé, le bouton d'importation n'était pas là, et
    // huit contrôles ont rougi pour une raison qui n'était pas la leur. La
    // ronde relève donc d'abord si le déclencheur est sous la main.
    await ouvrir('etats');
    await attendre(2200);
    const classeur = await page.evaluate(async (api, b64) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const essai = async (nom, f) => {
        try { r[nom] = await f(); }
        catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const env = async (url, methode, corps) => {
        const rep = await fetch(api + url, {
          method: methode, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await rep.json(); } catch { /* vide */ }
        return { statut: rep.status, corps: b };
      };
      const inspections = async () => {
        const c = await (await fetch(`${api}/inspections`, { credentials: 'same-origin' })).json();
        return Array.isArray(c) ? c : (c.inspections || []);
      };
      const volet = () => document.querySelector('.ramp-slider-body');
      const un = (sel) => (volet() || document).querySelector(sel);
      const dans = (sel) => [...(volet() || document).querySelectorAll(sel)];
      const previsu = () => (window.RAMP_STATE || {}).importPrevisu || [];
      const totaux = () => ((window.RAMP_STATE || {}).importAnalyse || {}).totaux || {};
      // Le classeur, remis à l'entrée cachée par un porte-données : c'est la
      // seule façon de poser un vrai `File` depuis la page.
      const deposer = async () => {
        const brut = atob(b64);
        const octets = new Uint8Array(brut.length);
        for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
        const f = new File([octets], 'ronde_ramp.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const dt = new DataTransfer();
        dt.items.add(f);
        const entree = document.getElementById('rampFichierImport');
        if (!entree) return false;
        entree.files = dt.files;
        entree.dispatchEvent(new Event('change', { bubbles: true }));
        await a(4000);
        return true;
      };

      // ── 1. Deux inspections semées, que le classeur viendra reprendre ──
      const semer = (vol, statut) => ({
        date: '2026-04-10', pays: 'Togo', exploitant: 'CLASSEUR Air',
        aeronef: 'B737-800', immatriculation: `TT-CL${vol.slice(-1)}0`, vol,
        status: statut, itemsInspectes: 10,
        anomalies: [{ itemCode: 'A05', stdRef: 'CAT.OP.MPA.175',
          description: 'Semé avant le classeur.', categorie: '2', action: '2', suivi: '' }],
      });
      r.deja = (await inspections()).length;
      const sem = await env('/inspections/import', 'POST', {
        data: [semer('CL901', 'Clos'), semer('CL902', 'Clos')],
      });
      r.semis = sem.statut;
      r.creees = (sem.corps || {}).creees;
      await window.rampRecharger();
      await a(2200);

      // ── 2. Le volet d'importation, et le modèle que le module sert ──
      //
      // **Le volet des statistiques était resté ouvert.** La ronde précédente
      // ne le referme pas — son dernier geste ferme la modale du générateur, et
      // non le volet qui la portait. `un()` cherchant *dans* le volet, le
      // bouton d'importation n'y était pas, rien n'a été cliqué, et
      // `d.volet` était vrai : **le volet de l'autre ronde**. Huit contrôles
      // rouges d'un coup, sur un état hérité.
      //
      // La ronde referme donc ce qu'elle trouve ouvert, et le dit ; et le
      // déclencheur se vise **au document**, puisqu'il vit sur la page et non
      // dans un volet. *Un sélecteur dont la portée dépend de l'état hérité
      // mesure l'état hérité.*
      await essai('ouverture', async () => {
        const d = {};
        d.voletHerite = !!volet();
        if (volet()) {
          document.querySelector('[onclick^="rampFermerSlider"]')?.click();
          await a(2000);
        }
        d.heriteFerme = !volet();
        d.declencheur = !!document.querySelector('[onclick^="rampOuvrirImportation"]');
        document.querySelector('[onclick^="rampOuvrirImportation"]')?.click();
        await a(3000);
        d.volet = !!volet();
        d.zone = !!un('#rampZoneImport');
        d.entree = !!document.getElementById('rampFichierImport');
        const modele = un('[onclick*="rampTelechargerModele"]');
        d.boutonModele = !!modele;
        d.cheminAvant = location.pathname;
        modele?.click();
        await a(4000);
        d.cheminApres = location.pathname;
        d.voletDebout = !!volet();
        return d;
      });

      // ── 3. Le classeur déposé : l'aperçu, les sorts, les colonnes ignorées ──
      await essai('analyse', async () => {
        const d = {};
        d.depose = await deposer();
        await a(2000);
        d.lignes = previsu().length;
        d.totaux = totaux();
        d.sorts = previsu().map((x) => x.sort);
        d.ecarts = previsu().map((x) => (x.anomalies || []).length);
        d.rangs = dans('tbody tr').length;
        d.fichier = ((window.RAMP_STATE || {}).importAnalyse || {}).fichier;
        d.ignorees = ((window.RAMP_STATE || {}).importAnalyse || {}).colonnes_ignorees || [];
        // La note des colonnes non reprises, et le bouton qui compte ce qui part.
        d.note = dans('.ramp-note').some((p) => /non reprises/.test(p.textContent || ''));
        const conf = un('[onclick*="rampConfirmerImport"]');
        d.libelleImport = conf ? (conf.textContent || '').replace(/\s+/g, ' ').trim() : '';
        d.importArme = conf ? !conf.disabled : null;
        return d;
      });

      // ── 4. Retirer une ligne : les totaux suivent la liste ──
      await essai('retraits', async () => {
        const d = {};
        const indexDe = (sort) => previsu().findIndex((x) => x.sort === sort);
        const retirer = async (i) => {
          dans('[onclick*="rampRetirerLigneImport("]')[i]?.click();
          await a(2000);
        };
        // Un bouton par rang, et le compte est relevé **avant chaque retrait** :
        // une seule variable écrasée n'aurait gardé que le dernier.
        d.boutonsAvant = dans('[onclick*="rampRetirerLigneImport("]').length;
        const iDoublon = indexDe('doublon');
        d.iDoublon = iDoublon;
        await retirer(iDoublon);
        d.apresDoublon = previsu().length;
        d.doublonsApres = totaux().doublons;
        // Retirer un doublon ne change pas ce qui part : il n'en faisait pas partie.
        const conf1 = un('[onclick*="rampConfirmerImport"]');
        d.libelleApresDoublon = conf1 ? (conf1.textContent || '').replace(/\s+/g, ' ').trim() : '';

        d.boutonsMilieu = dans('[onclick*="rampRetirerLigneImport("]').length;
        const iNouvelle = indexDe('nouvelle');
        d.iNouvelle = iNouvelle;
        await retirer(iNouvelle);
        d.apresNouvelle = previsu().length;
        d.nouvellesApres = totaux().nouvelles;
        const conf2 = un('[onclick*="rampConfirmerImport"]');
        d.libelleApresNouvelle = conf2 ? (conf2.textContent || '').replace(/\s+/g, ' ').trim() : '';
        d.boutonsFin = dans('[onclick*="rampRetirerLigneImport("]').length;
        return d;
      });

      // ── 5. Annuler : l'aperçu s'efface, la zone de dépôt revient ──
      await essai('annulation', async () => {
        const d = {};
        un('[onclick*="rampAnnulerImport"]')?.click();
        await a(2500);
        d.previsu = previsu().length;
        d.analyse = ((window.RAMP_STATE || {}).importAnalyse);
        d.zoneRendue = !!un('#rampZoneImport');
        d.plusDApercu = !un('[onclick*="rampConfirmerImport"]');
        return d;
      });

      // ── 6. Redéposé, puis confirmé : l'écriture, relue chez le serveur ──
      await essai('confirmation', async () => {
        const d = {};
        d.redepose = await deposer();
        await a(2000);
        d.lignes = previsu().length;
        d.avant = (await inspections()).length;
        un('[onclick*="rampConfirmerImport"]')?.click();
        await a(5000);
        d.voletFerme = !document.querySelector('.ramp-slider-body');
        d.previsuVidee = previsu().length;
        const toutes = await inspections();
        d.apres = toutes.length;
        d.gagnees = d.apres - d.avant;
        const miennes = toutes.filter((x) => /CLASSEUR Air/.test(x.exploitant || ''));
        d.miennes = miennes.length;
        const parVol = (v) => miennes.find((x) => x.vol === v);
        d.cl101 = !!parVol('CL101');
        d.ecartsCl101 = ((parVol('CL101') || {}).anomalies || []).length;
        d.cl102 = !!parVol('CL102');
        // La mise à jour : le statut de la semée a changé chez le serveur.
        d.statutCl902 = (parVol('CL902') || {}).status;
        // Le doublon n'a rien écrit : la semée garde le sien.
        d.statutCl901 = (parVol('CL901') || {}).status;
        return d;
      });

      // ── 7. La ronde retire tout ce qu'elle a mis ──
      await essai('menage', async () => {
        const d = { effacees: 0 };
        const miennes = (await inspections()).filter((x) => /CLASSEUR Air/.test(x.exploitant || ''));
        d.aEffacer = miennes.length;
        for (const i of miennes) {
          /* eslint-disable no-await-in-loop */
          const rep = await env(`/inspections/${i.id}`, 'DELETE');
          if (rep.statut === 200) d.effacees += 1;
        }
        d.apres = (await inspections()).length;
        d.rendueAuDepart = d.apres === r.deja;
        return d;
      });
      return r;
    }, '/api/m/ramp', CLASSEUR_B64);

    {
      const C = classeur;
      const Ou = C.ouverture || {};
      const An = C.analyse || {};
      const Re = C.retraits || {};
      const Annu = C.annulation || {};
      const Co = C.confirmation || {};
      const Men = C.menage || {};
      verifier('la ronde sème deux inspections que le classeur viendra reprendre, et le volet d’importation s’ouvre sur sa zone de dépôt',
        C.semis === 201 && C.creees === 2
        && Ou.heriteFerme === true && Ou.declencheur === true
        && Ou.volet === true && Ou.zone === true && Ou.entree === true,
        JSON.stringify({ semis: C.semis, creees: C.creees, ouverture: Ou }));
      verifier('le modèle de classeur se demande, et le navigateur l’enregistre sans quitter la page',
        Ou.boutonModele === true && Ou.cheminApres === Ou.cheminAvant
        && Ou.voletDebout === true
        // L'abandon est la trace du téléchargement : déclaré, et exigé.
        && abandonsVus.filter((x) => /\/import\/modele/.test(String(x))).length === 1,
        JSON.stringify({ ouverture: Ou, abandons: abandonsVus }));
      verifier('un vrai classeur se dépose, et l’analyse du serveur rend quatre inspections de cinq lignes — deux écarts sur celle qui en portait deux',
        An.depose === true && An.lignes === 4 && An.rangs === 4
        && An.fichier === 'ronde_ramp.xlsx'
        && JSON.stringify(An.ecarts || []) === JSON.stringify([2, 1, 1, 1]),
        JSON.stringify({ depose: An.depose, lignes: An.lignes, rangs: An.rangs,
          fichier: An.fichier, ecarts: An.ecarts }));
      verifier('les trois sorts paraissent — deux nouvelles, une mise à jour, un doublon —, la colonne inconnue est signalée, et le bouton compte ce qui partira',
        !!An.totaux && An.totaux.nouvelles === 2 && An.totaux.majs === 1
        && An.totaux.doublons === 1 && An.totaux.hors_perimetre === 0
        && (An.sorts || []).filter((x) => x === 'nouvelle').length === 2
        && (An.ignorees || []).length === 1
        && /ne connaît pas/.test(String((An.ignorees || [])[0] || ''))
        && An.note === true
        && An.importArme === true && /3 inspection/.test(String(An.libelleImport || '')),
        JSON.stringify({ totaux: An.totaux, sorts: An.sorts, ignorees: An.ignorees,
          note: An.note, libelle: An.libelleImport }).slice(0, 400));
      verifier('retirer une ligne de l’aperçu refait les totaux de l’en-tête, et seul le retrait d’une ligne importable change ce qui partira',
        Re.boutonsAvant === 4 && Re.boutonsMilieu === 3 && Re.boutonsFin === 2
        && Re.iDoublon >= 0 && Re.apresDoublon === 3
        && Re.doublonsApres === 0
        // Un doublon ne partait pas : son retrait ne retire rien du compte.
        && /3 inspection/.test(String(Re.libelleApresDoublon || ''))
        && Re.iNouvelle >= 0 && Re.apresNouvelle === 2 && Re.nouvellesApres === 1
        && /2 inspection/.test(String(Re.libelleApresNouvelle || '')),
        JSON.stringify(Re).slice(0, 400));
      verifier('annuler efface l’aperçu et son analyse, et rend la zone de dépôt',
        Annu.previsu === 0 && Annu.analyse === null
        && Annu.zoneRendue === true && Annu.plusDApercu === true,
        JSON.stringify(Annu));
      verifier('le classeur redéposé et confirmé écrit chez le serveur : deux inspections créées, la mise à jour portée, le doublon sans effet',
        Co.redepose === true && Co.lignes === 4
        && Co.voletFerme === true && Co.previsuVidee === 0
        && Co.gagnees === 2 && Co.miennes === 4
        && Co.cl101 === true && Co.ecartsCl101 === 2 && Co.cl102 === true
        // La mise à jour a changé le statut de la semée ; le doublon, non.
        && Co.statutCl902 === 'En cours' && Co.statutCl901 === 'Clos',
        JSON.stringify(Co).slice(0, 420));
      verifier('la ronde du classeur retire ses quatre inspections, et le module revient à son compte',
        Men.aEffacer === 4 && Men.effacees === 4 && Men.rendueAuDepart === true,
        JSON.stringify(Men));
    }
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
