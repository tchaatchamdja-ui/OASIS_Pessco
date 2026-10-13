// Parcours — l'application dans un vrai navigateur.
//
// Les neuf autres suites parlent à l'API ou lisent les sources. Aucune
// n'exécute le front : un script qui s'arrête sur une référence absente, une
// page qui ne se monte pas, un écran qui reste vide — rien de tout cela ne se
// voit d'une réponse HTTP à 200. C'est arrivé : la page des témoins de
// connexion a servi pendant des heures un `i18n.js` interrompu dès sa dernière
// ligne, et la suite était au vert.
//
// Ici, Chromium ouvre les écrans et l'on regarde ce que la console dit. Le
// navigateur vient de Puppeteer, déjà présent pour le rendu des PDF : aucune
// dépendance de plus.
//
// La connexion se fait avec le compte d'amorçage du harnais, sur une copie
// jetable de `data/` — jamais sur les données de travail.
const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// Ce qu'on ne veut pas voir dans une console. Deux exceptions, et deux
// seulement : les 401 d'un écran ouvert avant la session, et le refus du
// script que cette suite insère elle-même pour éprouver la politique de
// contenu — c'est le résultat attendu, non un incident.
const ATTENDU = /status of 401|Content Security Policy directive/;

// ── Et les refus qu'un contrôle provoque lui-même ──
//
// Certains contrôles éprouvent un **refus** : effacer un compte sans le mot de
// passe de l'opérateur rend un 403, et le navigateur le journalise en erreur.
// C'est le résultat attendu, non un incident.
//
// Une exception de plus dans `ATTENDU` aurait rendu la suite **aveugle à tous
// les 403** — y compris celui d'une écriture qu'un en-tête manquant ferait
// refuser, qui est précisément ce que ce relevé doit attraper. L'exception est
// donc liée à **l'étape** qui provoque le refus : partout ailleurs, un 403
// reste un incident.
const ATTENDU_PAR_ETAPE = [
  { etape: /création et effacement d’un compte/, motif: /status of 403/ },
];

// `ou` change en cours de route : le relevé est donc désigné par une fonction,
// et les écouteurs ne se posent qu'une fois.
function surveiller(page, ou, etape) {
  const noter = (l) => ou().push(`${etape()} — ${l}`);
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const texte = m.text();
    if (ATTENDU.test(texte)) return;
    if (ATTENDU_PAR_ETAPE.some((e) => e.etape.test(etape()) && e.motif.test(texte))) return;
    noter(`console : ${texte.slice(0, 160)}`);
  });
  page.on('pageerror', (e) => noter(`exception : ${String(e.message).slice(0, 160)}`));
  page.on('requestfailed', (r) => noter(`requête échouée : ${r.url().slice(-70)} (${(r.failure() || {}).errorText})`));
  page.on('response', (r) => {
    if (r.status() >= 500) noter(`${r.status()} sur ${r.url().slice(-70)}`);
  });
}

module.exports = async function parcoursSmoke(port) {
  console.log('\n── Parcours : l’application dans un navigateur ──');
  const srv = await demarrer({ port });
  let navigateur = null;
  try {
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    // ── Le mouchard des gestes (ADR-003, 5.c — `scripts/relever-gestes.js`) ──
    //
    // Posé seulement si `OASIS_MOUCHARD` l'est : la campagne ordinaire n'en
    // porte rien. Il sert au relevé de couverture des gestes, et il est branché
    // **ici** plutôt que dans l'outil, pour une raison apprise à ses dépens.
    //
    // La première version de l'outil **rejouait** ce que fait cette suite. Elle
    // s'est trompée de sélecteur — `.cfg-nav-item[data-cfg]`, qui ne désigne
    // rien, là où la suite emploie `.cfg-sidebar-item` —, et a donc rendu
    // « aucune sous-vue exercée » en mesurant sa propre cécité. Une imitation
    // d'un parcours ne mesure pas ce parcours. On instrumente donc l'original.
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const ouvrirPage = async () => {
      const p = await navigateur.newPage();
      if (mouchard) await p.evaluateOnNewDocument(mouchard);
      return p;
    };
    const page = await ouvrirPage();
    await page.setViewport({ width: 1280, height: 900 });
    // Deux relevés : ce que dit la console avant la session, et ce qu'elle dit
    // après. Les confondre ferait passer une erreur de la page de connexion
    // pour du bruit d'écran non connecté.
    const avantSession = [];
    const apresSession = [];
    let incidents = avantSession;
    let etape = 'page de connexion';
    surveiller(page, () => incidents, () => etape);

    // ── La page de connexion ──
    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    const formulaire = await page.$('#loginForm');
    verifier('la page de connexion se monte', !!formulaire);

    // Elle est servie sous la politique stricte : un script en ligne n'y
    // passe pas. Le vérifier ici, c'est vérifier qu'elle s'en accommode.
    const sansInline = await page.evaluate(() => {
      window.__injecte = false;
      const s = document.createElement('script');
      s.textContent = 'window.__injecte = true';
      document.body.appendChild(s);
      return window.__injecte === false;
    });
    verifier('un script inséré dans la page de connexion ne s’exécute pas', sansInline);

    // Palette et langue répondent, sans gestionnaire en ligne.
    const bascules = await page.evaluate(() => {
      document.querySelector('.theme-dot[data-theme="retro-avionics"]').click();
      const theme = document.documentElement.getAttribute('data-theme');
      document.querySelector('.lang-btn[data-lang="pt"]').click();
      const langue = document.documentElement.lang;
      document.querySelector('.lang-btn[data-lang="fr"]').click();
      return { theme, langue };
    });
    verifier('palette et langue répondent sur la page de connexion',
      bascules.theme === 'retro-avionics' && bascules.langue === 'pt', JSON.stringify(bascules));

    // L'œil montre la saisie et se renomme : le nom accessible dit ce que le
    // clic va faire, et un attribut, lui, ne suit pas `data-i18n` tout seul.
    const oeil = await page.evaluate(() => {
      const b = document.getElementById('voirMdp');
      const champ = document.getElementById('password');
      const repos = { type: champ.type, nom: b.getAttribute('aria-label') };
      b.click();
      const montre = { type: champ.type, nom: b.getAttribute('aria-label'), presse: b.getAttribute('aria-pressed') };
      b.click();
      return { repos, montre, retour: champ.type };
    });
    verifier('l’œil de la page de connexion montre le mot de passe et se renomme',
      oeil.repos.type === 'password' && oeil.montre.type === 'text'
      && oeil.montre.presse === 'true' && oeil.retour === 'password'
      && oeil.repos.nom && oeil.montre.nom && oeil.repos.nom !== oeil.montre.nom,
      JSON.stringify(oeil));

    // ── La connexion ──
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    verifier('la connexion mène au portail', /\/(index\.html)?$/.test(new URL(page.url()).pathname),
      page.url());

    verifier('la page de connexion ne lève aucune erreur',
      avantSession.length === 0, avantSession.slice(0, 3).join(' · '));

    // ── Le portail ──
    incidents = apresSession;
    etape = 'portail';
    await page.waitForSelector('#mainView', { timeout: 10000 });
    const accueil = await page.evaluate(() => ({
      nom: (document.getElementById('userName') || {}).textContent || '',
      menus: [...document.querySelectorAll('.portal-nav-btn')]
        .filter((b) => b.offsetParent !== null).map((b) => b.dataset.view),
      contenu: (document.getElementById('mainView') || {}).textContent.trim().length,
    }));
    verifier('le portail affiche le compte connecté', accueil.nom.length > 0, accueil.nom);
    verifier('les menus du super-administrateur sont là',
      ['home', 'users', 'config', 'audit'].every((v) => accueil.menus.includes(v)),
      accueil.menus.join(' '));
    verifier('l’accueil n’est pas vide', accueil.contenu > 50, `${accueil.contenu} caractères`);

    // ── Les écrans du portail ──
    // `navigate()` pose d'abord une attente, puis le rendu la remplace : un
    // écran mesuré trop tôt paraît vide sans l'être. On attend donc que
    // l'attente ait disparu — ce qu'un œil humain fait sans y penser.
    const ouvrir = async (vue) => {
      await page.evaluate((v) => document.querySelector(`.portal-nav-btn[data-view="${v}"]`).click(), vue);
      await page.waitForFunction(() => {
        const vueEl = document.getElementById('mainView');
        return vueEl && !vueEl.querySelector('.loading-spinner') && vueEl.textContent.trim().length > 50;
      }, { timeout: 15000 }).catch(() => { /* le contrôle qui suit le dira */ });
    };

    // C'est la page Utilisateurs qui a débordé à droite ; on y revient, et on
    // mesure plutôt que de croire.
    for (const vue of ['users', 'audit', 'config']) {
      etape = `écran « ${vue} »`;
      await ouvrir(vue);
      const etat = await page.evaluate(() => ({
        debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        contenu: document.getElementById('mainView').textContent.trim().length,
        erreurAffichee: /Erreur de chargement/.test(document.getElementById('mainView').textContent),
      }));
      verifier(`l’écran « ${vue} » se remplit`,
        etat.contenu > 50 && !etat.erreurAffichee, `${etat.contenu} caractères`);
      verifier(`l’écran « ${vue} » ne déborde pas à droite`,
        etat.debordement <= 0, `${etat.debordement} px`);
    }

    // ── Le portail, avant sa réécriture (ADR-003, suite 5.c) ──
    //
    // Les contrôles ci-dessus ouvrent trois vues sur cinq et vérifient qu'elles
    // se remplissent. Mesuré avant d'écrire ceux-ci : le portail déclare **cinq
    // vues** — `profile` n'était jamais ouverte —, sa configuration porte
    // **onze sous-vues** dont une seule était atteinte (celle qui s'affiche par
    // défaut), et **aucun** de ses quarante gestes n'était exercé.
    //
    // C'est la situation de l'écran des droits avant sa suite n° 0, en moins
    // extrême. Ces contrôles sont donc posés **avant** la reprise, et non après :
    // on ne mesure pas une réécriture contre rien.

    // La vue du profil, que rien n'ouvrait.
    etape = 'écran « profile »';
    await ouvrir('profile');
    const profil = await page.evaluate(() => {
      const v = document.getElementById('mainView');
      const champs = [...v.querySelectorAll('input, select, textarea')]
        .map((e) => e.id || e.name).filter(Boolean);
      return {
        contenu: v.textContent.trim().length,
        champs,
        debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        erreur: /Erreur de chargement/.test(v.textContent),
      };
    });
    verifier('la vue du profil se remplit et porte ses champs',
      profil.contenu > 50 && !profil.erreur && profil.champs.length >= 3,
      `${profil.contenu} caractères, champs : ${profil.champs.slice(0, 6).join(' ')}`);
    verifier('la vue du profil ne déborde pas à droite',
      profil.debordement <= 0, `${profil.debordement} px`);

    // Les onze sous-vues de la configuration. La liste se **lit dans la barre**,
    // non dans ce fichier : `instances` n'apparaît qu'à une instance régionale,
    // et une liste écrite ici aurait échoué ailleurs — ou, pire, cessé de
    // couvrir une sous-vue ajoutée plus tard.
    etape = 'configuration';
    await ouvrir('config');
    const sousVues = await page.evaluate(() => [...document.querySelectorAll('.cfg-sidebar-item')]
      .map((b) => (b.getAttribute('onclick') || '').match(/cfgNavigate\('([^']+)'\)/))
      .filter(Boolean).map((m) => m[1]));
    verifier('les sous-vues de la configuration sont lisibles depuis la barre',
      sousVues.length >= 8, `${sousVues.length} : ${sousVues.join(' ')}`);

    const sousVuesMuettes = [];
    const sousVuesDebordantes = [];
    const empreintes = new Map();
    for (const sous of sousVues) {
      etape = `configuration « ${sous} »`;
      /* eslint-disable no-await-in-loop */
      // ── Attendre que le contenu **change**, non qu'il soit non trivial ──
      //
      // Première écriture : on attendait « plus de trente caractères et pas
      // d'attente en cours ». Condition déjà vraie du contenu **précédent** :
      // l'attente rendait aussitôt, et les onze sous-vues ont été mesurées à
      // 1 490 caractères — la même, onze fois. Le contrôle était vert et vide,
      // et c'est le contre-essai qui l'a dit.
      const avantTexte = await page.evaluate(() => {
        const z = document.querySelector('.cfg-content');
        return z ? z.textContent.trim() : '';
      });
      // ── On **clique** le bouton, on n'appelle pas la fonction ──
      //
      // La première écriture faisait `window.cfgNavigate(sous)`. Cela éprouve la
      // fonction, non le geste : l'onglet pouvait être masqué, désactivé, ou ne
      // plus porter son `onclick`, et les onze contrôles restaient verts sur un
      // écran où personne n'aurait pu atteindre une seule sous-vue.
      //
      // Mesuré avant de corriger (`scripts/relever-gestes.js`) : sur les **121
      // gestes** du portail, **trois** étaient exercés. `cfgNavigate` n'en était
      // pas, bien que onze contrôles passent par lui.
      //
      // Le clic, lui, traverse tout : l'élément doit exister, être trouvable, et
      // porter son gestionnaire. Et si le bouton disparaît, le contrôle le dit
      // au lieu de réussir à côté.
      const clique = await page.evaluate((x) => {
        const b = [...document.querySelectorAll('.cfg-sidebar-item')]
          .find((e) => (e.getAttribute('onclick') || '').includes(`cfgNavigate('${x}')`));
        if (!b) return false;
        b.click();
        return true;
      }, sous);
      if (!clique) sousVuesMuettes.push(`${sous} (bouton introuvable)`);
      await page.waitForFunction((precedent) => {
        const z = document.querySelector('.cfg-content');
        if (!z || z.querySelector('.loading-spinner, [data-oasis-loader]')) return false;
        const t = z.textContent.trim();
        return t.length > 30 && t !== precedent;
      }, { timeout: 15000 }, avantTexte).catch(() => { /* les relevés ci-dessous le diront */ });
      // Le rendu est synchrone pour certaines sous-vues, différé pour celles qui
      // chargent un référentiel : on attend la disparition de l'attente, comme
      // pour les vues du portail.
      // `.cfg-content` est le contenu de la **sous-vue**, sans la barre latérale.
      // Une première écriture retombait sur `mainView` faute de trouver un
      // `#cfgContent` qui n'existe pas : or `mainView` porte toute la vue, barre
      // comprise, donc toujours plus de trente caractères. La sonde ne pouvait
      // pas voir une sous-vue vide — mesuré en en vidant une, le contrôle
      // restait vert. Pas de repli, donc : un conteneur absent est un échec.
      const etat = await page.evaluate(() => {
        const z = document.querySelector('.cfg-content');
        return {
          contenu: z ? z.textContent.trim().length : 0,
          erreur: z ? /Erreur de chargement|Erreur :/.test(z.textContent) : true,
          debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          // Une empreinte du contenu : deux sous-vues distinctes ne peuvent pas
          // la partager, et onze identiques dénoncent une sonde immobile.
          empreinte: z ? `${z.textContent.trim().length}:${z.textContent.trim().slice(0, 120)}` : 'absent',
        };
      });
      if (etat.contenu <= 30 || etat.erreur) sousVuesMuettes.push(`${sous} (${etat.contenu}c${etat.erreur ? ', erreur' : ''})`);
      if (etat.debordement > 0) sousVuesDebordantes.push(`${sous} (${etat.debordement} px)`);
      empreintes.set(sous, etat.empreinte);
    }
    verifier('chaque sous-vue de la configuration se remplit',
      sousVuesMuettes.length === 0,
      sousVuesMuettes.length ? sousVuesMuettes.join(' · ') : `${sousVues.length} sous-vues`);
    // ── Et le contrôle refuse de passer si les onze se ressemblent ──
    //
    // C'est la non-vacuité, dite par le contrôle lui-même plutôt que laissée à
    // qui le relit. Onze sous-vues qui rendent la même chose, c'est une sonde
    // qui n'a pas changé de page — et c'est exactement ce qui est arrivé.
    //
    // ── Et il refuse aussi de passer sur **zéro** sous-vue ──
    //
    // Première écriture : `distinctes >= sousVues.length - 1`. Sur une liste
    // vide, cela donne `0 >= -1`, c'est-à-dire **vrai**. Le contrôle écrit
    // contre la vacuité l'était donc lui-même dans le seul cas où la barre ne
    // rend rien — et ce cas n'est pas théorique : retirer le `onclick` des
    // onze boutons le produit, et c'est le contre-essai qui l'a montré.
    //
    // Les deux contre-essais de la veille — une sous-vue muette, un
    // `cfgNavigate` immobile — passaient tous deux par une liste **pleine**. Un
    // contre-essai ne couvre que le chemin qu'il emprunte.
    const distinctes = new Set(empreintes.values()).size;
    verifier('les sous-vues de la configuration diffèrent les unes des autres',
      sousVues.length >= 8 && distinctes >= sousVues.length - 1,
      `${distinctes} empreinte(s) distincte(s) pour ${sousVues.length} sous-vues`);
    verifier('aucune sous-vue de la configuration ne déborde à droite',
      sousVuesDebordantes.length === 0, sousVuesDebordantes.join(' · '));

    // La bascule de langue agit sur la coquille du portail, et sur l'attribut
    // `lang` du document — celui qui commande la prononciation d'un lecteur
    // d'écran. Les six modules le laissaient figé à « fr » ; le portail, non.
    etape = 'bascule de langue';
    // On **presse le bouton**, on n'appelle pas `applyLang`. Même raison que pour
    // les sous-vues : l'appel direct éprouve la fonction et laisserait ces deux
    // contrôles verts sur une barre dont les trois boutons auraient perdu leur
    // gestionnaire — c'est-à-dire sur un portail où personne ne peut changer de
    // langue. Le relevé des gestes l'a dit : `applyLang` n'était **pas** exercé,
    // bien que deux contrôles passent par lui.
    const langues = await page.evaluate(async () => {
      const lu = () => ({
        lang: document.documentElement.lang,
        menu: (document.querySelector('.portal-nav-btn[data-view="users"]') || {}).textContent || '',
      });
      const presser = (lg) => {
        const b = [...document.querySelectorAll('.lang-btn')]
          .find((e) => (e.getAttribute('onclick') || '').includes(`applyLang('${lg}')`));
        if (!b) return false;
        b.click();
        return true;
      };
      const avant = lu();
      const presseEn = presser('en');
      await new Promise((r) => setTimeout(r, 300));
      const apres = lu();
      const presseFr = presser('fr');
      await new Promise((r) => setTimeout(r, 300));
      return { avant, apres, retour: lu(), boutons: presseEn && presseFr };
    });
    verifier('les trois boutons de langue portent leur gestionnaire',
      langues.boutons === true, JSON.stringify(langues.boutons));
    verifier('la bascule de langue change l’attribut « lang » du document',
      langues.avant.lang === 'fr' && langues.apres.lang === 'en' && langues.retour.lang === 'fr',
      `${langues.avant.lang} → ${langues.apres.lang} → ${langues.retour.lang}`);
    // ── Et elle redessine la **vue**, non seulement les menus ──
    //
    // `poserLangue` retraduit les éléments marqués `data-i18n` : les boutons de
    // navigation en portent, donc les deux contrôles ci-dessus passaient même
    // sans que la vue soit redessinée. Le contenu, lui, est produit en HTML par
    // les fonctions de rendu, et seul un redessin le retraduit — c'est l'objet de
    // `onLangChange`.
    //
    // Mesuré en contre-essayant la conversion du démarrage : ôter
    // `window.onLangChange` laissait la suite verte. Un portail dont les menus
    // suivent la langue et dont le contenu reste en français, sans un mot.
    const vueTraduite = await page.evaluate(async () => {
      const lire = () => (document.getElementById('mainView') || {}).textContent || '';
      const presser = (lg) => {
        const b = [...document.querySelectorAll('.lang-btn')]
          .find((e) => (e.getAttribute('onclick') || '').includes(`applyLang('${lg}')`));
        if (b) b.click();
      };
      const avant = lire().trim();
      presser('en');
      await new Promise((r) => setTimeout(r, 1200));
      const apres = lire().trim();
      presser('fr');
      await new Promise((r) => setTimeout(r, 1200));
      return { avant: avant.length, apres: apres.length, change: avant !== apres, rendu: lire().trim() === avant };
    });
    verifier('la bascule de langue redessine le contenu de la vue',
      vueTraduite.avant > 50 && vueTraduite.change && vueTraduite.rendu,
      JSON.stringify(vueTraduite));

    verifier('la bascule de langue traduit les menus du portail',
      langues.avant.menu.trim() !== langues.apres.menu.trim()
      && langues.avant.menu.trim() === langues.retour.menu.trim(),
      `« ${langues.avant.menu.trim()} » → « ${langues.apres.menu.trim()} »`);

    // ── L'état partagé est bien partagé, dans les deux sens (ADR-003, 5.c.3) ──
    //
    // Sept noms sont passés de `let` au premier niveau d'`app.js` à des propriétés
    // de `window`, posées par `/app/etat.js`. Toute la migration du portail en
    // dépend : tant qu'ils étaient lexicaux, aucun de ses fichiers ne pouvait être
    // converti seul.
    //
    // Ce que ce contrôle éprouve n'est pas qu'ils existent — c'est **qu'ils soient
    // la même chose** pour les deux régimes :
    //
    //   · les fichiers en JavaScript les écrivent par affectation nue. Si un `let`
    //     réapparaissait, l'affectation irait dans la globale lexicale et la
    //     propriété de `window` resterait à sa valeur initiale. **Sans erreur** ;
    //   · un module les lit sur `window`. Il lirait alors un état figé.
    //
    // On vérifie donc les deux sens : une écriture nue atteint `window`, et une
    // écriture sur `window` est vue par une lecture nue.
    etape = 'état partagé du portail';
    const partage = await page.evaluate(() => {
      const noms = ['ME', 'CURRENT_VIEW', 'CFG_SUB', 'REFS', 'CFG_COLLAPSED', 'NOTIF_LAST_SEEN', 'VIEWS'];
      const surWindow = noms.filter((n) => Object.prototype.hasOwnProperty.call(window, n));
      // Sens 1 : une affectation nue, comme celles d'`app-demarrage.js`.
      // eslint-disable-next-line no-eval
      eval('CURRENT_VIEW = "__essai_nu__"');
      const vuSurWindow = window.CURRENT_VIEW;
      // Sens 2 : une écriture sur `window`, comme celle d'un module.
      window.CURRENT_VIEW = '__essai_window__';
      // eslint-disable-next-line no-eval
      const vuEnNu = eval('CURRENT_VIEW');
      window.CURRENT_VIEW = 'home';
      return {
        surWindow,
        chargees: noms.filter((n) => window[n] !== undefined),
        vuSurWindow,
        vuEnNu,
        // `ME` doit porter la session : l'état n'est pas qu'un sac de valeurs
        // initiales, il est rempli par `loadMe()`.
        meRempli: !!(window.ME && window.ME.user && window.ME.user.role),
        vuesPosees: Object.keys(window.VIEWS || {}).length,
      };
    });
    verifier('les sept noms de l’état partagé sont des propriétés de window',
      partage.surWindow.length === 7, partage.surWindow.join(', '));
    verifier('une écriture nue du portail atteint l’état sur window',
      partage.vuSurWindow === '__essai_nu__', String(partage.vuSurWindow));
    verifier('une écriture sur window est vue par une lecture nue',
      partage.vuEnNu === '__essai_window__', String(partage.vuEnNu));
    verifier('l’état partagé porte la session et les vues du portail',
      partage.meRempli && partage.vuesPosees >= 5,
      `ME rempli: ${partage.meRempli} · ${partage.vuesPosees} vue(s)`);

    // ── Une vue par module monté, et non seulement par carte ──
    //
    // L'hôte des modules enregistre **deux** familles de vues : une par module
    // installé (`mod_<CODE>`, l'accès direct) et une par carte du portail, qui
    // ouvre le premier module de la carte.
    //
    // Mesuré en contre-essayant : retirer la **première** famille laissait la
    // suite verte. Le contrôle qui monte un module clique une carte, donc passe
    // par la seconde ; l'accès direct n'était couvert par personne.
    //
    // La liste des modules montés vient du serveur, non d'une table écrite ici :
    // le huitième module sera couvert sans qu'on y pense.
    const vuesModulesMontees = await page.evaluate(async () => {
      const r = await fetch('/api/modules/super-menus');
      const registre = r.ok ? await r.json() : [];
      const codes = [...new Set(registre.map((m) => m.code))];
      const posees = Object.keys(window.VIEWS || {});
      return { codes, manquantes: codes.filter((c) => !posees.includes(`mod_${c}`)) };
    });
    verifier('chaque module monté a sa vue d’accès direct dans le portail',
      vuesModulesMontees.codes.length >= 5 && vuesModulesMontees.manquantes.length === 0,
      `${vuesModulesMontees.codes.length} module(s) — manquante(s) : ${vuesModulesMontees.manquantes.join(', ') || 'aucune'}`);

    // ── Les gestes d'affichage du portail, **pressés** (ADR-003, 5.c.0) ──
    //
    // Le relevé de `scripts/relever-gestes.js` a donné **4 gestes exercés sur 78**.
    // Les contrôles qui suivent en couvrent le bloc non destructeur : les
    // palettes, les replis de barre, les onglets, la recherche, les fenêtres de
    // référentiel. Les gestes qui **écrivent** sont déclarés non couverts et
    // motivés dans `tests/smoke/gestes-non-couverts.json` — ils demandent des
    // données d'essai et une vérification de retour en arrière, et ce sera leur
    // propre séance.
    //
    // Chacun est **pressé**, jamais appelé : c'est toute la leçon du jour. Un
    // appel direct éprouve la fonction et laisse le contrôle vert sur un bouton
    // qui a perdu son gestionnaire.
    //
    // Le détecteur est commun à tous : on cherche l'élément par le texte de son
    // `onclick`, on le presse, et l'on vérifie **un effet observable**. Un bouton
    // introuvable est un échec nommé, non un contrôle qu'on saute.
    etape = 'gestes d’affichage du portail';
    const presser = async (motif, apres = 250) => page.evaluate(async (m, d) => {
      const e = [...document.querySelectorAll('[onclick]')]
        .find((x) => (x.getAttribute('onclick') || '').includes(m));
      if (!e) return false;
      e.click();
      await new Promise((r) => setTimeout(r, d));
      return true;
    }, motif, apres);

    // Les trois palettes. L'effet est l'attribut du document et la préférence
    // rangée : une palette qui s'applique sans être retenue se perd au rechargement.
    await ouvrir('home');
    const palettes = [];
    for (const cle of ['corporate', 'retro-avionics', 'blue-dark']) {
      const presse = await presser(`applyTheme('${cle}')`);
      const etat = await page.evaluate(() => ({
        attribut: document.documentElement.getAttribute('data-theme'),
        retenu: (() => { try { return localStorage.getItem('pr_theme'); } catch { return null; } })(),
      }));
      palettes.push({ cle, presse, ...etat });
    }
    verifier('les trois pastilles de palette s’appliquent et se retiennent',
      palettes.every((p) => p.presse && p.attribut === p.cle && p.retenu === p.cle),
      JSON.stringify(palettes));

    // Les replis de barre. L'effet est une classe sur le corps ou sur la barre :
    // un repli qui ne replie rien est le genre de geste qu'on croit tenu.
    const replis = {
      portail: await page.evaluate(async () => {
        const b = document.getElementById('sidebarToggle');
        if (!b) return null;
        const avant = document.body.className;
        b.click();
        await new Promise((r) => setTimeout(r, 250));
        const pendant = document.body.className;
        b.click();
        await new Promise((r) => setTimeout(r, 250));
        return { change: avant !== pendant, rendu: document.body.className === avant };
      }),
    };
    verifier('le repli de la barre du portail agit et se défait',
      replis.portail && replis.portail.change && replis.portail.rendu,
      JSON.stringify(replis.portail));

    // Les deux présentations des modules — grille et liste. L'effet est le
    // nombre de cartes **et** la classe du conteneur : seule la classe change,
    // et un contrôle qui ne lirait que le nombre ne verrait rien.
    const vuesModules = [];
    for (const mode of ['list', 'grid']) {
      const presse = await presser(`setModulesView('${mode}')`);
      // L'effet est la classe `list-view` sur `#portalModules`, **lue dans la
      // source du geste** et non devinée. Deux viseurs faux avant celui-ci :
      // `#mainView > *` rendait le bloc de titre, et `.portal-card`.parentElement
      // le `.portal-grid` — tous deux de classe invariable. Le geste marchait ;
      // c'est le contrôle qui regardait ailleurs.
      const etat = await page.evaluate(() => {
        const z = document.getElementById('portalModules');
        return {
          liste: !!z && z.classList.contains('list-view'),
          retenu: (() => { try { return localStorage.getItem('oasis_modules_view'); } catch { return null; } })(),
          cartes: document.querySelectorAll('.portal-card').length,
        };
      });
      vuesModules.push({ mode, presse, ...etat });
    }
    verifier('les deux présentations des modules se commandent depuis leurs boutons',
      vuesModules.every((v) => v.presse && v.cartes > 0)
      && vuesModules[0].liste === true && vuesModules[1].liste === false
      && vuesModules[0].retenu === 'list' && vuesModules[1].retenu === 'grid',
      JSON.stringify(vuesModules));

    // La recherche du portail : ouvrir, chercher, vider. Les trois gestes se
    // tiennent — vider sans avoir cherché ne prouve rien.
    //
    // **Elle n'est pas sur l'accueil.** `searchInputHtml()` est posée sur la vue
    // « utilisateurs » et dans quatre sous-vues de configuration, jamais sur la
    // grille des modules. Ma première écriture la cherchait là et rendait
    // « bouton introuvable » : c'était mon viseur, non un geste mort — vérifié
    // en relevant les `onclick` de la page plutôt qu'en le supposant.
    await ouvrir('users');
    const recherche = await (async () => {
      const ouverte = await presser('portailOuvrirRecherche()');
      // ── Le filtre est éprouvé **dans les deux sens** ──
      //
      // Il travaille sur le DOM en place : on compte les lignes visibles du
      // tableau, non les cartes du portail — il n'y en a aucune ici.
      //
      // Le bac d'essai ne donne **qu'une ligne** à cette vue, mesuré. « Une ligne
      // qui disparaît » serait donc un contrôle mince : un filtre qui cache tout,
      // quoi qu'on tape, le passerait. On éprouve donc les deux sens — un terme
      // **tiré de la ligne elle-même**, qui doit la garder, puis un terme absurde,
      // qui doit la cacher. Sur une seule ligne, c'est ce qui fait la différence
      // entre mesurer un filtre et mesurer une disparition.
      const saisi = await page.evaluate(async () => {
        const champ = document.querySelector('.cfg-search-input');
        if (!champ) return null;
        const lignes = () => [...document.querySelectorAll('#mainView tbody tr')]
          .filter((r) => r.offsetParent !== null);
        const taper = async (v) => {
          champ.value = v;
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise((r) => setTimeout(r, 400));
          return lignes().length;
        };
        const avant = lignes().length;
        if (!avant) return { avant: 0 };
        // Un fragment pris dans la première cellule : il doit retenir la ligne.
        const mot = (lignes()[0].textContent.trim().split(/\s+/)[0] || '').slice(0, 4);
        const gardees = await taper(mot);
        const cachees = await taper('zzzqqq');
        return { avant, mot, gardees, cachees };
      });
      // ── Le bouton de vidage se presse par l'élément, non par son attribut ──
      //
      // `portailOuvrirRecherche` le crée en code et lui pose
      // `reset.onclick = portailViderRecherche` — une **propriété**, non un
      // attribut `onclick=`. Un sélecteur `[onclick]` ne le voit donc pas, et mon
      // détecteur commun rendait « bouton introuvable » sur un bouton bien
      // présent et bien branché.
      //
      // La même cécité touche le relevé des gestes : voir
      // `scripts/relever-gestes.js`, qui lit désormais les deux formes.
      const videe = await page.evaluate(async () => {
        const b = document.querySelector('.cfg-search-reset');
        if (!b) return false;
        b.click();
        await new Promise((r) => setTimeout(r, 300));
        return true;
      });
      const apres = await page.evaluate(() => {
        const champ = document.querySelector('.cfg-search-input');
        return champ ? champ.value : null;
      });
      return { ouverte, saisi, videe, apres };
    })();
    verifier('la recherche du portail s’ouvre, filtre et se vide',
      recherche.ouverte && recherche.videe && !recherche.apres
      && recherche.saisi && recherche.saisi.avant > 0
      && recherche.saisi.gardees === recherche.saisi.avant
      && recherche.saisi.cachees === 0,
      JSON.stringify(recherche));

    // Les onglets de la vue « utilisateurs », et le repli de sa barre. C'est la
    // vue qui avait débordé à droite : elle garde deux contrôles de plus.
    await ouvrir('users');
    const ongletsUtilisateurs = await page.evaluate(async () => {
      const boutons = [...document.querySelectorAll('[onclick^="setUserTab"]')];
      const empreintes = [];
      for (const b of boutons) {
        b.click();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 300));
        const z = document.querySelector('.cfg-content, #mainView');
        empreintes.push(z ? z.textContent.trim().length : 0);
      }
      return { nombre: boutons.length, empreintes };
    });
    verifier('les onglets de la vue « utilisateurs » se commandent et diffèrent',
      ongletsUtilisateurs.nombre >= 2
      && new Set(ongletsUtilisateurs.empreintes).size >= ongletsUtilisateurs.nombre - 1,
      JSON.stringify(ongletsUtilisateurs));

    // ── Changer d'onglet remet la recherche au repos ──
    //
    // `setUserTab` appelle `portailReinitialiserRecherche` : le filtre ne porte
    // que sur ce qu'on regarde. Ce contrôle est ici, et non dans la preuve
    // mécanique de 5.e.1, pour une raison qui vaut d'être écrite : là-bas le côté
    // « origine » lit `searchInputHtml` sur `window` et le côté « nouvelle »
    // l'importe, donc deux copies de l'état — et la comparaison mesurerait
    // l'empaquetage. **Ici il n'y en a qu'une**, celle que la page sert.
    //
    // Contre-essayé en ôtant l'appel : le champ garde sa valeur d'un onglet à
    // l'autre, et ce contrôle tombe.
    const rechercheOnglets = await page.evaluate(async () => {
      const champ = () => document.querySelector('#portailRecherche .cfg-search-input');
      const loupe = () => document.querySelector('#portailRecherche .cfg-search-loupe');
      if (!champ() || !loupe()) return { champs: false };
      loupe().click();
      const c = champ();
      c.value = 'ZZZ-introuvable';
      c.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      const avant = champ() ? champ().value : null;
      const onglets = [...document.querySelectorAll('.cfg-sidebar-item')]
        .filter((b) => (b.getAttribute('onclick') || '').includes('setUserTab'));
      if (onglets.length < 2) return { champs: false };
      onglets[1].click();
      await new Promise((r) => setTimeout(r, 900));
      return { champs: true, avant, apres: champ() ? champ().value : null };
    });
    verifier('changer d’onglet des comptes remet la recherche au repos',
      rechercheOnglets.champs === true
      && rechercheOnglets.avant === 'ZZZ-introuvable'
      && rechercheOnglets.apres === '',
      JSON.stringify(rechercheOnglets));

    // Les fenêtres de référentiel : dix-huit occurrences à elles deux, le plus
    // gros bloc du relevé. On en ouvre une et on la referme — l'effet est la
    // présence du panneau, non son contenu.
    // Les boutons de référentiel ne sont pas dans toutes les sous-vues : relevé
    // dans la page, ils sont dans six des onze — `organisation` en porte onze,
    // `domaines` quatre-vingt-trois. On navigue donc vers une sous-vue nommée et
    // l'on attend qu'elle soit là : ma première écriture regardait la sous-vue
    // par défaut aussitôt après avoir ouvert la configuration, et n'y trouvait
    // rien parce qu'elle n'était pas encore dessinée.
    await ouvrir('config');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.cfg-sidebar-item')]
        .find((e) => (e.getAttribute('onclick') || '').includes("cfgNavigate('organisation')"));
      if (b) b.click();
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[onclick^="openRefModal"]').length > 0,
      { timeout: 10000 },
    ).catch(() => { /* le contrôle le dira */ });
    const fenetreRef = await page.evaluate(async () => {
      const bouton = [...document.querySelectorAll('[onclick^="openRefModal"]')][0];
      if (!bouton) return { bouton: false };
      // L'effet est le contenu de `#cfgModalRoot`, que `closeRefModal` vide.
      // Mon premier viseur cherchait `[class*="modal"]`, qui attrape des
      // conteneurs toujours présents : il rendait « pas refermée » sur une
      // fenêtre bien refermée.
      const racine = () => (document.getElementById('cfgModalRoot') || {}).innerHTML || '';
      bouton.click();
      await new Promise((r) => setTimeout(r, 500));
      const ouverte = racine().length > 50;
      const fermeture = [...document.querySelectorAll('[onclick^="closeRefModal"]')][0];
      if (fermeture) fermeture.click();
      await new Promise((r) => setTimeout(r, 400));
      return { bouton: true, ouverte, fermee: racine().length === 0, boutonFermeture: !!fermeture };
    });
    verifier('une fenêtre de référentiel s’ouvre et se referme par ses boutons',
      fenetreRef.bouton && fenetreRef.ouverte && fenetreRef.boutonFermeture && fenetreRef.fermee,
      JSON.stringify(fenetreRef));

    // ── L'écran « Gestion des Droits », avant sa réécriture ──
    //
    // Aucun contrôle ne l'ouvrait : les vingt contrôles de la suite « droits »
    // parlent à l'API, et une API verte ne dit rien d'un écran qui reste blanc.
    //
    // Ces contrôles sont posés **avant** la reprise en React + TypeScript
    // (ADR-003), et non après : on ne mesure pas une réécriture contre rien. Ils
    // décrivent ce que l'écran fait aujourd'hui, et c'est à eux que la version
    // réécrite devra répondre — à l'identique.
    etape = 'écran « Gestion des Droits »';
    // Son propre onglet : la page principale reste au portail, que les contrôles
    // suivants y retrouvent. L'avoir emmenée ailleurs les a cassés une fois.
    const ecranDroits = await ouvrirPage();
    surveiller(ecranDroits, () => incidents, () => etape);
    await ecranDroits.goto(`${srv.base}/modules/droits/index.html?module=PLAN`,
      { waitUntil: 'networkidle2' });
    // Le rendu remplace l'attente : on l'attend, comme pour les écrans du portail.
    // `innerText` et non `textContent` : celui-ci **compte le source des scripts
    // en ligne**, et la page en porte une trentaine de lignes. L'écran paraissait
    // donc « rempli » alors qu'il ne rendait rien du tout — c'est arrivé, et seuls
    // les autres contrôles l'ont dit. `innerText` ne voit que ce qui s'affiche.
    await ecranDroits.waitForFunction(
      () => !document.querySelector('[data-oasis-loader]')
        && (document.body.innerText || '').trim().length > 200,
      { timeout: 15000 },
    ).catch(() => { /* les contrôles qui suivent le diront */ });

    const droits = await ecranDroits.evaluate(() => {
      const texte = document.body.innerText || '';
      const lignes = document.querySelectorAll('.data-table tbody tr');
      return {
        titre: document.title,
        contenu: texte.trim().length,
        attente: !!document.querySelector('[data-oasis-loader]'),
        debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // Les comptes ayant accès au module, un par ligne.
        lignes: lignes.length,
        // Chaque ligne porte un privilège, en pastille.
        pastilles: document.querySelectorAll('.dr-priv').length,
        // Les deux pages du module : privilèges et journal d'audit.
        navigation: document.querySelectorAll('.sidebar-nav-item, [data-dr-page]').length,
        refus: /reserve_autorite|reserve_admin|module_indisponible/.test(texte),
      };
    });

    verifier('l’écran des droits se monte et se remplit',
      droits.contenu > 200 && !droits.attente && !droits.refus,
      `${droits.contenu} caractères`);
    verifier('l’écran des droits liste les comptes avec leur privilège',
      droits.lignes > 0 && droits.pastilles > 0,
      `${droits.lignes} ligne(s), ${droits.pastilles} pastille(s)`);
    verifier('l’écran des droits ne déborde pas à droite',
      droits.debordement <= 0, `${droits.debordement} px`);

    // Le journal d'audit est la seconde page du module, et la seule qui dise si
    // la chaîne tient : un écran qui ne la montre pas rend la garantie du §F.3
    // invisible à qui doit la lire.
    const audit = await ecranDroits.evaluate(() => {
      const cible = [...document.querySelectorAll('.sidebar-nav-item, [data-dr-page], a, button')]
        .find((el) => /audit|journal/i.test(el.textContent || ''));
      if (!cible) return null;
      cible.click();
      return true;
    });
    if (audit) {
      await new Promise((r) => setTimeout(r, 1500));
      const etatAudit = await ecranDroits.evaluate(() => ({
        integrite: !!document.querySelector('.dr-integrity'),
        intacte: !!document.querySelector('.dr-integrity.ok'),
        contenu: (document.body.innerText || '').trim().length,
      }));
      verifier('l’écran des droits montre l’intégrité de la chaîne d’audit',
        etatAudit.integrite && etatAudit.intacte,
        `bandeau ${etatAudit.integrite ? 'présent' : 'absent'}, ${etatAudit.intacte ? 'intacte' : 'rompue'}`);
    } else {
      verifier('l’écran des droits offre sa page de journal d’audit', false, 'aucun élément trouvé');
    }

    // ── L'attribution d'un privilège, par l'écran ──
    //
    // C'est l'acte du module : donner à un compte le droit d'agir sur un module.
    // La suite « droits » l'éprouve par l'API ; **rien ne l'éprouvait par
    // l'écran**, et c'est l'écran que l'agent emploie. Un bouton qui n'ouvre
    // rien, une fenêtre qui n'enregistre pas, un privilège qui ne se repose pas
    // sur la ligne : la réponse HTTP reste 200.
    //
    // Posé avant la reprise en React (ADR-003), comme les quatre précédents.
    etape = 'attribution d’un privilège';
    await ecranDroits.evaluate(() => {
      const nav = [...document.querySelectorAll('.sidebar-nav-item, [data-dr-page], a, button')]
        .find((el) => /privil/i.test(el.textContent || ''));
      if (nav) nav.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const attribution = await ecranDroits.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      // La première ligne dont le privilège n'est pas déjà « Gestionnaire ».
      const lignes = [...document.querySelectorAll('.data-table tbody tr')];
      const ligne = lignes.find((tr) => !/GESTIONNAIRE/i.test(
        (tr.querySelector('.dr-priv') || {}).className || ''));
      if (!ligne) return { erreur: 'aucune ligne modifiable' };
      const avant = (ligne.querySelector('.dr-priv') || {}).textContent || '';
      const nom = (ligne.querySelector('td strong') || {}).textContent || '';

      const bouton = [...ligne.querySelectorAll('button')]
        .find((b) => /modifi/i.test(b.textContent || ''));
      if (!bouton) return { erreur: 'aucun bouton de modification' };
      bouton.click();
      await attendre(400);

      const fenetre = document.querySelector('.dr-modal, .modal');
      if (!fenetre) return { erreur: 'la fenêtre ne s’est pas ouverte', avant, nom };

      // Le choix « Gestionnaire », parmi les privilèges proposés.
      const choix = [...fenetre.querySelectorAll('input[type="radio"]')]
        .find((r) => String(r.value).toUpperCase() === 'GESTIONNAIRE');
      if (!choix) return { erreur: 'privilège « Gestionnaire » non proposé', avant, nom };
      choix.click();
      await attendre(200);

      const valider = [...fenetre.querySelectorAll('button')]
        .find((b) => /enregistr|valider|appliquer/i.test(b.textContent || ''));
      if (!valider) return { erreur: 'aucun bouton d’enregistrement', avant, nom };
      valider.click();
      await attendre(1500);

      // La ligne doit porter le nouveau privilège, sans rechargement de page.
      const relue = [...document.querySelectorAll('.data-table tbody tr')]
        .find((tr) => ((tr.querySelector('td strong') || {}).textContent || '') === nom);
      return {
        nom,
        avant,
        apres: relue ? ((relue.querySelector('.dr-priv') || {}).textContent || '') : '(ligne perdue)',
        fenetreFermee: !document.querySelector('.dr-modal, .modal'),
      };
    });

    verifier('l’écran attribue un privilège, et la ligne le porte aussitôt',
      !attribution.erreur
      && /gestionnaire/i.test(attribution.apres)
      && attribution.fenetreFermee,
      attribution.erreur || `${attribution.nom} : « ${attribution.avant} » → « ${attribution.apres} »`);

    // Et le serveur l'a bien reçu : ce que l'écran montre doit être ce qui est
    // enregistré, non ce qu'il espère. L'API le dit, depuis le même navigateur.
    if (!attribution.erreur) {
      const enregistre = await ecranDroits.evaluate(async () => {
        const r = await fetch('/api/m/droits/PLAN/users', { credentials: 'same-origin' });
        return r.ok ? await r.json() : null;
      });
      const compte = (enregistre || []).find((u) => (u.nom || '') === attribution.nom);
      verifier('et le serveur porte le privilège attribué',
        !!compte && compte.privilege === 'GESTIONNAIRE' && !compte.isDefault,
        compte ? `${compte.privilege}${compte.isDefault ? ' (par défaut)' : ''}` : 'compte introuvable');
    } else {
      verifier('et le serveur porte le privilège attribué', false, 'attribution non faite');
    }

    await ecranDroits.close();

    // ── Un module, dans son cadre ──
    // Le portail monte les modules en iframe : un module qui ne démarre pas
    // laisse un cadre vide, et le portail, lui, répond toujours 200.
    etape = 'module en cadre';
    await ouvrir('home');
    const ouverture = await page.evaluate(() => {
      // Une carte fermée au compte ne monte rien : on prend une carte ouverte.
      const carte = document.querySelector('.portal-card[data-module][data-enabled="true"]');
      if (!carte) return null;
      const code = carte.dataset.module;
      carte.click();
      return code;
    });
    if (ouverture) {
      const frame = await page.waitForSelector('#prFrame', { timeout: 10000 });
      const contenu = await frame.contentFrame();
      await new Promise((r) => setTimeout(r, 2500));   // le module charge ses données
      const dedans = contenu ? await contenu.evaluate(() => ({
        titre: document.title,
        corps: document.body.textContent.trim().length,
        attente: !!document.querySelector('[data-oasis-loader]'),
      })) : null;
      verifier(`le module « ${ouverture} » se monte dans le portail`,
        dedans && dedans.corps > 200 && !dedans.attente, JSON.stringify(dedans));
    } else {
      verifier('une carte de module ouverte est offerte au portail', false, 'aucune carte ouverte');
    }

    // ── Le retour d'un module défait le plein écran ──
    //
    // Entrer dans un module pose `module-fullscreen` sur le corps : le module
    // occupe l'écran et porte son titre. **Sortir doit le défaire**, sinon le
    // portail reste sans sa barre supérieure — un écran dont on ne peut plus
    // naviguer, et qui ne lève rien.
    //
    // Mesuré en contre-essayant la conversion du démarrage : ôter le geste
    // laissait la suite verte. Le contrôle qui monte un module n'en sortait
    // jamais.
    etape = 'retour d’un module';
    const retour = await page.evaluate(async () => {
      const dedans = document.body.classList.contains('module-fullscreen');
      window.planBackToPortal();
      await new Promise((r) => setTimeout(r, 1500));
      return {
        dedans,
        dehors: !document.body.classList.contains('module-fullscreen'),
        accueil: ((document.getElementById('mainView') || {}).textContent || '').trim().length,
        barreRendue: !document.body.classList.contains('app-sidebar-collapsed'),
      };
    });
    verifier('le retour d’un module défait le plein écran et rouvre l’accueil',
      retour.dedans && retour.dehors && retour.accueil > 50 && retour.barreRendue,
      JSON.stringify(retour));

    // ── Les instances du dispositif : ouvrir, basculer, supprimer ──
    //
    // `supprimerInstance` **retire l'instance d'un État**, sans retour. C'est le
    // geste le plus lourd du portail, et il était déclaré non couvert. Sa
    // conversion (ADR-003, 5.c.6) est le moment de le couvrir — comme l'effacement
    // des préférences et la pastille des notifications l'ont été.
    //
    // La ronde est complète et **par de vrais clics** : on ouvre une instance
    // d'essai, on la met en sommeil, on la réveille, puis on la supprime. Trois
    // gestes d'écriture, et chacun est vérifié par l'état de la table après coup.
    //
    // Elle ne laisse rien derrière elle : l'instance créée est celle qu'on
    // supprime. Le bac de données est jetable, mais un contrôle qui laisse un
    // reste fait échouer le suivant pour une raison qui n'est pas la sienne.
    etape = 'instances du dispositif';
    await ouvrir('config');
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.cfg-sidebar-item')]
        .find((e) => (e.getAttribute('onclick') || '').includes("cfgNavigate('instances')"));
      if (b) b.click();
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[onclick^="ouvrirInstance"]').length > 0,
      { timeout: 10000 },
    ).catch(() => { /* le contrôle le dira */ });

    const NOM_ESSAI = 'Essai-Parcours';
    // `ouvrirInstance` demande le nom par `prompt` : une fenêtre du navigateur,
    // qu'il faut accepter avec la valeur. Posé **avant** le clic.
    const repondrePrompt = (d) => { void d.accept(NOM_ESSAI); };
    page.on('dialog', repondrePrompt);
    const ouverte = await page.evaluate(async () => {
      const b = [...document.querySelectorAll('[onclick^="ouvrirInstance"]')][0];
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 2000));
      return { bouton: true, lignes: document.querySelectorAll('.shell-table tbody tr').length };
    });
    page.off('dialog', repondrePrompt);
    const presente = await page.evaluate((nom) => {
      const tr = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(nom));
      return tr ? { trouvee: true, texte: tr.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) } : { trouvee: false };
    }, NOM_ESSAI);
    verifier('une instance s’ouvre depuis la configuration',
      ouverte.bouton && presente.trouvee, JSON.stringify({ ...ouverte, ...presente }));

    // La mise en sommeil, puis le réveil : l'état de la ligne doit suivre.
    const bascule = await page.evaluate(async (nom) => {
      const presser = async () => {
        const tr = [...document.querySelectorAll('.shell-table tbody tr')]
          .find((r) => r.textContent.includes(nom));
        if (!tr) return null;
        const b = tr.querySelector('[onclick^="basculerInstance"]');
        if (!b) return null;
        b.click();
        await new Promise((r) => setTimeout(r, 1800));
        const apres = [...document.querySelectorAll('.shell-table tbody tr')]
          .find((r) => r.textContent.includes(nom));
        return apres ? apres.className.includes('row-inactive') : null;
      };
      const endormie = await presser();
      const reveillee = await presser();
      return { endormie, reveillee };
    }, NOM_ESSAI);
    verifier('une instance se met en sommeil et se réveille par son bouton',
      bascule.endormie === true && bascule.reveillee === false, JSON.stringify(bascule));

    // La suppression, avec sa confirmation **pressée**, non contournée : la
    // fenêtre du socle est un dialogue de la page, non du navigateur.
    const supprimee = await page.evaluate(async (nom) => {
      const tr = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(nom));
      if (!tr) return { ligne: false };
      const b = tr.querySelector('[onclick^="supprimerInstance"]');
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 400));
      const oui = document.querySelector('.oasis-confirm-oui');
      if (!oui) return { confirmation: false };
      oui.click();
      await new Promise((r) => setTimeout(r, 2000));
      return {
        ligne: true,
        bouton: true,
        confirmation: true,
        partie: ![...document.querySelectorAll('.shell-table tbody tr')]
          .some((r) => r.textContent.includes(nom)),
      };
    }, NOM_ESSAI);
    verifier('une instance se supprime, confirmation pressée',
      supprimee.ligne && supprimee.bouton && supprimee.confirmation && supprimee.partie,
      JSON.stringify(supprimee));

    // ── Un référentiel, de bout en bout : créer, modifier, supprimer ──
    //
    // Le plus gros bloc de gestes non exercés du portail — `openRefModal` huit
    // fois, `closeRefModal` dix, `saveRef`, `deleteRef` quatre — et ce sont des
    // **écritures** : ces tables commandent les organigrammes, les domaines, les
    // qualifications. Un référentiel qui n'enregistre pas, ou qui enregistre à
    // côté, se découvre à l'usage.
    //
    // `organisation_levels` est choisi pour deux raisons mesurées : son schéma
    // n'a que deux champs — un texte et un nombre —, et **rien ne référence un
    // niveau qu'on vient de créer**. La ronde ne laisse donc rien derrière elle,
    // et c'est la même discipline que pour les instances.
    //
    // Tout est **pressé** : le bouton d'ajout, le bouton d'enregistrement, la
    // ligne à modifier, et la confirmation de suppression.
    etape = 'référentiel de bout en bout';
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.cfg-sidebar-item')]
        .find((e) => (e.getAttribute('onclick') || '').includes("cfgNavigate('organisation')"));
      if (b) b.click();
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[onclick="openRefModal(\'organisation_levels\')"]').length > 0,
      { timeout: 10000 },
    ).catch(() => { /* le contrôle le dira */ });

    const NIVEAU = 'Essai-Niveau-Parcours';
    const refCreation = await page.evaluate(async (nom) => {
      const ajout = document.querySelector('[onclick="openRefModal(\'organisation_levels\')"]');
      if (!ajout) return { ajout: false };
      ajout.click();
      await new Promise((r) => setTimeout(r, 500));
      const type = document.querySelector('#cfgModalRoot [data-field="type"]');
      const ordre = document.querySelector('#cfgModalRoot [data-field="ordre"]');
      if (!type || !ordre) return { ajout: true, champs: false };
      type.value = nom;
      ordre.value = '99';
      const enregistrer = [...document.querySelectorAll('#cfgModalRoot [onclick^="saveRef"]')][0];
      if (!enregistrer) return { ajout: true, champs: true, enregistrer: false };
      enregistrer.click();
      await new Promise((r) => setTimeout(r, 2000));
      const ligne = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(nom));
      return {
        ajout: true,
        champs: true,
        enregistrer: true,
        creee: !!ligne,
        ordre: ligne ? /99/.test(ligne.textContent) : null,
        fenetreFermee: ((document.getElementById('cfgModalRoot') || {}).innerHTML || '') === '',
      };
    }, NIVEAU);
    // ── « et la referme » est satisfait par le redessin, non par la fermeture ──
    //
    // Mesuré en contre-essayant : ôter le `closeRefModal()` du chemin de succès de
    // `saveRef` **ne fait pas tomber ce contrôle**. La raison est dans le
    // gabarit — `<div id="cfgModalRoot">` fait partie de la vue de configuration,
    // que `renderConfig()` redessine ; la fenêtre part avec elle.
    //
    // L'appel explicite est donc **redondant sur ce chemin**, et cette assertion
    // ne l'éprouve pas. Elle éprouve que la fenêtre n'est plus là après
    // enregistrement, ce qui est ce qu'un agent constate — mais il faut dire
    // lequel des deux gestes l'obtient, sinon on croira l'autre couvert.
    //
    // La ligne n'est pas retirée : elle est défensive, et `app-config.js` est le
    // prochain fichier réécrit. Ôter du code mort d'un fichier qu'on va refaire
    // est du remue-ménage, non du ménage.
    verifier('un référentiel se crée depuis sa fenêtre et la referme',
      refCreation.creee && refCreation.ordre === true && refCreation.fenetreFermee,
      JSON.stringify(refCreation));

    const refEdition = await page.evaluate(async (nom) => {
      const ligne = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(nom));
      if (!ligne) return { ligne: false };
      const editer = ligne.querySelector('[onclick^="openRefModal"]');
      if (!editer) return { ligne: true, bouton: false };
      editer.click();
      await new Promise((r) => setTimeout(r, 500));
      const ordre = document.querySelector('#cfgModalRoot [data-field="ordre"]');
      const type = document.querySelector('#cfgModalRoot [data-field="type"]');
      if (!ordre || !type) return { ligne: true, bouton: true, champs: false };
      // La fenêtre doit porter la valeur enregistrée : une fenêtre d'édition qui
      // s'ouvre vide ferait écraser l'enregistrement par du vide.
      const relu = { type: type.value, ordre: String(ordre.value) };
      ordre.value = '98';
      [...document.querySelectorAll('#cfgModalRoot [onclick^="saveRef"]')][0].click();
      await new Promise((r) => setTimeout(r, 2000));
      const apres = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(nom));
      return { ligne: true, bouton: true, champs: true, relu, modifiee: apres ? /98/.test(apres.textContent) : null };
    }, NIVEAU);
    verifier('une fenêtre d’édition porte la valeur enregistrée et la remplace',
      refEdition.relu && refEdition.relu.type === NIVEAU && refEdition.relu.ordre === '99'
      && refEdition.modifiee === true,
      JSON.stringify(refEdition));

    const refSuppression = await page.evaluate(async (nom) => {
      const ligne = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(nom));
      if (!ligne) return { ligne: false };
      const b = ligne.querySelector('[onclick^="deleteRef"]');
      if (!b) return { ligne: true, bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 400));
      const oui = document.querySelector('.oasis-confirm-oui');
      if (!oui) return { ligne: true, bouton: true, confirmation: false };
      oui.click();
      await new Promise((r) => setTimeout(r, 2000));
      return {
        ligne: true,
        bouton: true,
        confirmation: true,
        partie: ![...document.querySelectorAll('.shell-table tbody tr')]
          .some((r) => r.textContent.includes(nom)),
      };
    }, NIVEAU);
    verifier('un référentiel se supprime, confirmation pressée',
      refSuppression.confirmation && refSuppression.partie, JSON.stringify(refSuppression));

    // ── L'import d'un classeur : la seule écriture en masse du portail ──
    //
    // `doImport` lit un fichier Excel et écrit **autant de lignes qu'il en
    // contient**. Les autres écritures du portail touchent une ligne, décidée
    // par l'agent ; celle-ci en touche un nombre décidé par le fichier. C'est
    // le geste dont une erreur ne se répare pas à la main.
    //
    // Il ne se couvre pas en une ronde comme les précédents : il lui faut un
    // classeur. Celui-ci n'est pas écrit de toutes pièces — il est **pris à la
    // fenêtre elle-même** (le lien « Télécharger le modèle »), rempli d'une
    // ligne, et renvoyé. Un classeur fabriqué dans le test porterait les
    // en-têtes que je crois justes ; celui-là porte ceux que l'application
    // sert. Le jour où les deux divergeront, c'est le contrôle du modèle qui le
    // dira — non l'import qui échouerait sans raison lisible.
    //
    // `domaines` est choisi, et non l'une des trois autres collections
    // importables depuis l'écran : c'est la seule qui porte un **code**.
    // Prestataires, exigences et personnel ne sont pas clés par code, et un
    // second import y dupliquerait les lignes. Or la propriété qui distingue ce
    // geste est précisément la **mise à jour sur le code** — importer deux fois
    // le même fichier ne doit pas doubler les lignes. Sur une collection sans
    // code, ce contrôle n'existerait pas, et l'import ne serait éprouvé qu'à
    // moitié.
    //
    // La ronde se défait : la ligne importée est supprimée **par l'écran**,
    // confirmation pressée, et le référentiel est recompté avant et après.
    etape = 'import d’un classeur';
    const CODE_IMPORT = 'ZZ-ESSAI';

    // Le modèle, demandé par la page : c'est elle qui porte le cookie de
    // session. Le classeur revient en base 64 faute de pouvoir traverser
    // autrement la frontière du navigateur.
    const modeleB64 = await page.evaluate(async () => {
      const r = await fetch('/api/referentiels/activites/template');
      if (!r.ok) return null;
      const octets = new Uint8Array(await r.arrayBuffer());
      let s = '';
      for (const o of octets) s += String.fromCharCode(o);
      return btoa(s);
    });
    const COLONNES_DOMAINES = ['code', 'nom', 'description', 'statut'];
    let classeurModele = null;
    let enTetes = null;
    if (modeleB64) {
      classeurModele = XLSX.read(Buffer.from(modeleB64, 'base64'), { type: 'buffer' });
      const feuille = classeurModele.Sheets.Domaines;
      enTetes = feuille ? (XLSX.utils.sheet_to_json(feuille, { header: 1 })[0] || []) : null;
    }
    verifier('le modèle offert par la fenêtre d’import porte les colonnes du référentiel',
      !!enTetes && JSON.stringify(enTetes) === JSON.stringify(COLONNES_DOMAINES),
      JSON.stringify({ feuilles: classeurModele ? classeurModele.SheetNames : null, enTetes }));

    // La ligne est posée **dans l'ordre des en-têtes servis**, non dans celui
    // que j'ai écrit plus haut : si le modèle change de colonnes, la valeur
    // suit, et c'est le contrôle d'au-dessus qui dénonce le changement.
    const dossierClasseurs = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-import-'));
    const ecrireClasseur = (nom) => {
      const wb = XLSX.read(Buffer.from(modeleB64, 'base64'), { type: 'buffer' });
      const valeurs = {
        code: CODE_IMPORT, nom, description: 'Ligne posée par la suite « parcours »', statut: 'actif',
      };
      XLSX.utils.sheet_add_aoa(wb.Sheets.Domaines,
        [(enTetes || COLONNES_DOMAINES).map((h) => (valeurs[h] === undefined ? '' : valeurs[h]))],
        { origin: -1 });
      const chemin = path.join(dossierClasseurs, `domaines-${nom}.xlsx`);
      fs.writeFileSync(chemin, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
      return chemin;
    };

    const lireDomaines = () => page.evaluate(async () => {
      const r = await fetch('/api/referentiels/domaines');
      const d = await r.json().catch(() => null);
      return Array.isArray(d) ? d.map((x) => ({ id: x.id, code: x.code, nom: x.nom })) : null;
    });

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.cfg-sidebar-item')]
        .find((e) => (e.getAttribute('onclick') || '').includes("cfgNavigate('domaines')"));
      if (b) b.click();
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[onclick^="openImportModal"]').length > 0,
      { timeout: 10000 },
    ).catch(() => { /* le contrôle le dira */ });

    // Le geste complet : presser « Importer » de la barre (`openImportModal`),
    // déposer le fichier, presser « Importer » de la fenêtre (`doImport`).
    const importer = async (chemin) => {
      const avant = await lireDomaines();
      const ouverte = await page.evaluate(() => {
        const b = document.querySelector('[onclick^="openImportModal"]');
        if (!b) return false;
        b.click();
        return true;
      });
      if (!ouverte) return { barre: false };
      await page.waitForSelector('#importFile', { timeout: 5000 }).catch(() => { /* dit plus bas */ });
      const champ = await page.$('#importFile');
      if (!champ) return { barre: true, fenetre: false };
      await champ.uploadFile(chemin);
      const presse = await page.evaluate(() => {
        const b = document.querySelector('#cfgModalRoot [onclick^="doImport"]');
        if (!b) return false;
        b.click();
        return true;
      });
      await new Promise((r) => setTimeout(r, 3000));
      const rendu = await page.evaluate((code) => ({
        message: (document.querySelector('.oasis-toast-message') || {}).textContent || null,
        alEcran: [...document.querySelectorAll('.cfg-acc-item')]
          .some((e) => e.textContent.includes(code)),
      }), CODE_IMPORT);
      return {
        barre: true, fenetre: true, presse, avant, apres: await lireDomaines(),
        message: rendu.message ? rendu.message.trim() : null,
        alEcran: rendu.alEcran,
      };
    };

    const NOM_1 = 'Essai Import Parcours';
    const premier = modeleB64 ? await importer(ecrireClasseur(NOM_1)) : { barre: false };
    const poseeUneFois = (premier.apres || []).filter((d) => d.code === CODE_IMPORT);
    // `alEcran` n'est pas un ornement : contre-essayé en ôtant la relecture et
    // le redessin du chemin de succès, les données arrivent bien en base, le
    // bandeau annonce « 1 ajout » — et **l'écran ne montre rien**. C'est le
    // défaut qui fait importer deux fois.
    verifier('un classeur importé depuis la fenêtre entre dans le référentiel, et s’affiche',
      premier.presse === true
      && poseeUneFois.length === 1 && poseeUneFois[0].nom === NOM_1
      && (premier.apres || []).length === (premier.avant || []).length + 1
      && premier.alEcran === true
      && /1\s*ajout/.test(premier.message || ''),
      JSON.stringify({ ...premier, avant: (premier.avant || []).length, apres: (premier.apres || []).length }));

    // ── Le second import : ce qui distingue ce geste des autres écritures ──
    //
    // Même code, nom différent. Le compte rendu doit annoncer une **mise à
    // jour** et aucun ajout, et la ligne porter le nouveau nom.
    //
    // J'avais écrit ce contrôle contre la duplication. Les contre-essais ont
    // montré que ce n'est pas par là que le défaut arrive : désactiver la mise
    // à jour sur le code ne crée pas de doublon — le référentiel refuse un code
    // déjà pris — mais rend un compte rendu de **« 0 ajout, 0 mise à jour —
    // 1 ligne ignorée »**. L'import ne fait rien et le dit à moitié.
    //
    // Le vrai danger est l'autre : une mise à jour **annoncée et non
    // appliquée**. Contre-essayé en ôtant l'écriture du chemin de mise à jour,
    // le compte rendu annonce « 0 ajout(s), 1 mise(s) à jour » et la ligne
    // garde son ancien nom. C'est pour celui-là que `reprise[0].nom` est
    // assertée, et non seulement le message.
    const NOM_2 = 'Essai Import Repris';
    const second = modeleB64 ? await importer(ecrireClasseur(NOM_2)) : { barre: false };
    const reprise = (second.apres || []).filter((d) => d.code === CODE_IMPORT);
    verifier('un second import du même code met la ligne à jour, et ne la duplique pas',
      second.presse === true
      && reprise.length === 1 && reprise[0].nom === NOM_2
      && (second.apres || []).length === (second.avant || []).length
      && /0\s*ajout/.test(second.message || '') && /1\s*mise/.test(second.message || ''),
      JSON.stringify({ ...second, avant: (second.avant || []).length, apres: (second.apres || []).length }));

    // La ronde se défait, par l'écran.
    const defaite = await page.evaluate(async (code) => {
      const item = [...document.querySelectorAll('.cfg-acc-item')]
        .find((e) => e.textContent.includes(code));
      if (!item) return { item: false };
      const b = item.querySelector('[onclick^="deleteRef"]');
      if (!b) return { item: true, bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 400));
      const oui = document.querySelector('.oasis-confirm-oui');
      if (!oui) return { item: true, bouton: true, confirmation: false };
      oui.click();
      await new Promise((r) => setTimeout(r, 2000));
      return { item: true, bouton: true, confirmation: true };
    }, CODE_IMPORT);
    const apresDefaite = await lireDomaines();
    verifier('la ligne importée se retire par l’écran, et le référentiel revient à son compte',
      defaite.confirmation === true
      && !(apresDefaite || []).some((d) => d.code === CODE_IMPORT)
      && (apresDefaite || []).length === (premier.avant || []).length,
      JSON.stringify({ defaite, restantes: (apresDefaite || []).length, attendu: (premier.avant || []).length }));
    fs.rmSync(dossierClasseurs, { recursive: true, force: true });

    // ── Les trois écritures de la configuration de l'instance ──
    //
    // `saveAAC`, `saveSecurite`, `saveSysteme`. Elles se ressemblent et se
    // couvrent ensemble, parce que le danger qu'elles portent est **le même**, et
    // qu'il n'est pas celui qu'on croit.
    //
    // Chacune envoie **tout son bloc** à chaque enregistrement : les sept
    // paramètres de sécurité, les huit champs de l'identité, les deux de la
    // réplication. Un champ que la fenêtre n'a pas su relire part donc **vide ou
    // faux** avec les autres, et écrase l'enregistré. C'est exactement le défaut
    // que `submitEditUser` a montré hier — le prénom effacé par une fenêtre
    // ouverte vide — et c'est pourquoi l'assertion qui compte ici n'est pas ce qui
    // change, mais **ce qui ne doit pas changer**.
    //
    // Chaque ronde lit donc la configuration entière avant, modifie **un seul**
    // champ par l'écran, et vérifie les deux choses : le champ visé a bougé, et
    // aucun autre n'a bougé. Puis elle remet la valeur d'origine.
    //
    // Les champs visés sont choisis pour ne rien pouvoir rompre : `maxFailedAttempts`
    // n'agit qu'au-delà du nombre d'échecs, `centralUrl` ne commande aucun code
    // (ADR-001 : la réplication n'existe qu'en intention), et `ville` est un
    // libellé. **Les champs qu'on n'a pas touchés sont ceux qui romperaient la
    // séance** : `mfaEnabled`, `forceChangeOnFirstLogin`, `sessionTimeoutMinutes`
    // et `defaultLang` décident de la session même qui exécute ces contrôles.
    etape = 'configuration de l’instance';
    const lireConfig = () => page.evaluate(async () => {
      const r = await fetch('/api/config');
      return r.ok ? r.json() : null;
    });
    // L'écran de configuration **d'abord** : les éléments de sa barre latérale
    // n'existent pas ailleurs. Appelée depuis la vue du profil, la première
    // écriture de cette fonction ne cliquait rien et rendait sans erreur — le
    // contrôle suivant disait alors « le logo ne s'est pas remplacé » sur un
    // écran qui ne portait pas de logo. *Un déplacement qui échoue en silence
    // fait accuser le code de ce que la navigation n'a pas fait.*
    const allerSousVue = async (sous) => {
      await page.evaluate(async (s) => {
        const vue = document.querySelector('.portal-nav-btn[data-view="config"]');
        if (vue && !vue.classList.contains('active')) {
          vue.click();
          await new Promise((r) => setTimeout(r, 900));
        }
        const b = [...document.querySelectorAll('.cfg-sidebar-item')]
          .find((e) => (e.getAttribute('onclick') || '').includes(`cfgNavigate('${s}')`));
        if (b) b.click();
      }, sous);
      await new Promise((r) => setTimeout(r, 700));
    };

    // ── 1. La réplication : la plus simple, et elle cache une asymétrie ──
    await allerSousVue('systeme');
    const cfgAvantSys = await lireConfig();
    const URL_ESSAI = 'https://essai-parcours.invalid/central';
    const sysEcrit = await page.evaluate(async (url) => {
      const champ = document.getElementById('repUrl');
      const bouton = document.querySelector('[onclick="saveSysteme()"]');
      if (!champ || !bouton) return { champs: false };
      const luDAbord = champ.value;
      champ.value = url;
      bouton.click();
      await new Promise((r) => setTimeout(r, 1500));
      return { champs: true, luDAbord };
    }, URL_ESSAI);
    const cfgApresSys = await lireConfig();
    verifier('l’adresse du serveur central s’enregistre, et le reste de la configuration ne bouge pas',
      sysEcrit.champs === true
      && sysEcrit.luDAbord === ((cfgAvantSys || {}).replication || {}).centralUrl
      && ((cfgApresSys || {}).replication || {}).centralUrl === URL_ESSAI
      && JSON.stringify((cfgApresSys || {}).security) === JSON.stringify((cfgAvantSys || {}).security)
      && ((cfgApresSys || {}).replication || {}).enabled === ((cfgAvantSys || {}).replication || {}).enabled,
      JSON.stringify({ sysEcrit, avant: (cfgAvantSys || {}).replication, apres: (cfgApresSys || {}).replication }));

    // ── L'asymétrie, nommée plutôt que découverte un jour en production ──
    //
    // Le serveur n'écrit l'adresse que si elle est **non vide**
    // (`if (replication.centralUrl)`). Vider le champ et enregistrer rend donc
    // « enregistré » — et garde l'ancienne adresse. Ce contrôle ne bénit pas ce
    // comportement : il le **fixe**, pour que sa correction soit un choix et non
    // une surprise. La case à cocher, elle, accepte bien `false`.
    const sysVide = await page.evaluate(async () => {
      const champ = document.getElementById('repUrl');
      const bouton = document.querySelector('[onclick="saveSysteme()"]');
      if (!champ || !bouton) return { champs: false };
      champ.value = '';
      bouton.click();
      await new Promise((r) => setTimeout(r, 1500));
      const bandeau = document.querySelector('.oasis-toast-message');
      return { champs: true, bandeau: bandeau ? bandeau.textContent.trim() : null };
    });
    const cfgApresVide = await lireConfig();
    verifier('une adresse centrale vidée n’efface pas l’enregistrée, et le bandeau annonce pourtant l’enregistrement',
      sysVide.champs === true
      && ((cfgApresVide || {}).replication || {}).centralUrl === URL_ESSAI
      && !!sysVide.bandeau,
      JSON.stringify({ sysVide, apres: (cfgApresVide || {}).replication }));

    // Remise en place, par l'écran.
    const sysRendu = await page.evaluate(async (url) => {
      const champ = document.getElementById('repUrl');
      champ.value = url;
      document.querySelector('[onclick="saveSysteme()"]').click();
      await new Promise((r) => setTimeout(r, 1500));
      return true;
    }, ((cfgAvantSys || {}).replication || {}).centralUrl || 'https://central.uemoa.int');
    const cfgRenduSys = await lireConfig();
    verifier('et l’adresse d’origine se remet par le même écran',
      sysRendu === true
      && JSON.stringify((cfgRenduSys || {}).replication) === JSON.stringify((cfgAvantSys || {}).replication),
      JSON.stringify({ avant: (cfgAvantSys || {}).replication, rendu: (cfgRenduSys || {}).replication }));

    // ── 2. La sécurité : sept paramètres partent ensemble ──
    await allerSousVue('securite');
    const cfgAvantSec = await lireConfig();
    const secEcrit = await page.evaluate(async () => {
      const champ = document.getElementById('secMaxFail');
      const bouton = document.querySelector('[onclick="saveSecurite()"]');
      if (!champ || !bouton) return { champs: false };
      const luDAbord = champ.value;
      const cases = ['secSingle', 'secForce', 'secMfa']
        .map((id) => [id, (document.getElementById(id) || {}).checked]);
      champ.value = String(parseInt(luDAbord, 10) + 3);
      bouton.click();
      await new Promise((r) => setTimeout(r, 1500));
      return { champs: true, luDAbord, cases };
    });
    const cfgApresSec = await lireConfig();
    // ── Ce qui ne doit pas bouger : les **douze** autres paramètres ──
    //
    // L'écran en montre sept ; le bloc `security` en porte treize. Les six que
    // l'écran n'offre pas — les quatre exigences de composition du mot de passe,
    // le plafond d'écritures par minute, la profondeur de l'historique — ne
    // doivent pas davantage être dérangés par un enregistrement.
    //
    // **Et il faut dire ce que ce contrôle n'attrape pas.** Contre-essayé en
    // supprimant `mfaEnabled` du corps de la requête : il **reste vert**. Le
    // serveur n'applique qu'un booléen qu'il reçoit (`typeof === 'boolean'`), si
    // bien qu'une case que la fenêtre n'aurait pas su relire ne peut pas éteindre
    // un drapeau par omission. Le défaut de `submitEditUser` — le champ effacé
    // parce qu'il est parti vide — **n'a pas d'équivalent ici**, et c'est le
    // serveur qui l'empêche, non l'écran.
    //
    // Ce qu'il attrape, c'est la valeur **inversée** : contre-essayé en envoyant
    // `!checked`, il rend `mfaEnabled: true` et le contrôle de remise en place
    // dénonce en plus que la ronde ne se défait pas. Au passage, la séance a
    // survécu à cette MFA allumée — elle n'est vérifiée qu'à la connexion, et la
    // session était déjà ouverte.
    const sansLeChamp = (s) => {
      const c = { ...(s || {}) };
      delete c.maxFailedAttempts;
      return JSON.stringify(c);
    };
    verifier('les paramètres de sécurité s’enregistrent, et les douze autres traversent intacts',
      secEcrit.champs === true
      && secEcrit.luDAbord === String(((cfgAvantSec || {}).security || {}).maxFailedAttempts)
      && ((cfgApresSec || {}).security || {}).maxFailedAttempts
         === ((cfgAvantSec || {}).security || {}).maxFailedAttempts + 3
      && sansLeChamp((cfgApresSec || {}).security) === sansLeChamp((cfgAvantSec || {}).security),
      JSON.stringify({ secEcrit, avant: (cfgAvantSec || {}).security, apres: (cfgApresSec || {}).security }));

    const secRendu = await page.evaluate(async (valeur) => {
      const champ = document.getElementById('secMaxFail');
      if (!champ) return false;
      champ.value = String(valeur);
      document.querySelector('[onclick="saveSecurite()"]').click();
      await new Promise((r) => setTimeout(r, 1500));
      return true;
    }, ((cfgAvantSec || {}).security || {}).maxFailedAttempts);
    const cfgRenduSec = await lireConfig();
    verifier('et les paramètres de sécurité reviennent à l’identique',
      secRendu === true
      && JSON.stringify((cfgRenduSec || {}).security) === JSON.stringify((cfgAvantSec || {}).security),
      JSON.stringify({ avant: (cfgAvantSec || {}).security, rendu: (cfgRenduSec || {}).security }));

    // ── La même asymétrie, du côté des nombres — et elle n'était pas nommée ──
    //
    // L'adresse centrale vidée est gardée, et un contrôle le fixe depuis 5.c.13.
    // Les quatre nombres de sécurité ont **exactement** la même propriété, et
    // personne ne l'avait écrite : le serveur ne retient que ce qui est
    // strictement positif (`parseInt`, puis `n > 0`). Saisir `0` dans « longueur
    // minimale du mot de passe », ou un texte, laisse donc la valeur d'avant — et
    // l'écran annonce « Configuration enregistrée ».
    //
    // Trouvée en convertissant le bloc (5.d.5), en bâtissant le régime
    // `secMinLen: '0'` de la comparaison. Celle-ci montre que les deux versions
    // envoient la même chose ; elle ne pouvait pas dire ce que le serveur en fait.
    //
    // Ce contrôle ne bénit pas ce comportement : il le **fixe**. Une longueur
    // minimale de mot de passe qu'on croit avoir mise à zéro et qui vaut toujours
    // douze est une surprise sans gravité ; l'inverse n'en serait pas une.
    const secZero = await page.evaluate(async () => {
      const champ = document.getElementById('secMinLen');
      const bouton = document.querySelector('[onclick="saveSecurite()"]');
      if (!champ || !bouton) return { champs: false };
      const luDAbord = champ.value;
      champ.value = '0';
      bouton.click();
      await new Promise((r) => setTimeout(r, 1500));
      const bandeau = document.querySelector('.oasis-toast-message');
      return { champs: true, luDAbord, bandeau: bandeau ? bandeau.textContent.trim() : null };
    });
    const cfgApresZero = await lireConfig();
    verifier('une longueur minimale mise à zéro ne s’applique pas, et le bandeau annonce pourtant l’enregistrement',
      secZero.champs === true
      && secZero.luDAbord === String(((cfgAvantSec || {}).security || {}).passwordMinLength)
      && JSON.stringify((cfgApresZero || {}).security) === JSON.stringify((cfgAvantSec || {}).security)
      && !!secZero.bandeau,
      JSON.stringify({ secZero, avant: (cfgAvantSec || {}).security, apres: (cfgApresZero || {}).security }));

    // ── 3. L'identité de l'Administration : la fenêtre doit porter l'enregistré ──
    //
    // `openAacEdit` ouvre une fenêtre de **huit champs** et un sélecteur de langue.
    // `saveAAC` les renvoie tous, et renvoie en plus `instance.codeEtat` et
    // `instance.defaultLang` — le bigramme et la langue par défaut du déploiement.
    // Une fenêtre qui s'ouvrirait sans la langue sélectionnée basculerait donc la
    // langue de l'instance au premier enregistrement, sans que personne l'ait
    // demandé. C'est ce que le contrôle regarde.
    await allerSousVue('organisation');
    const cfgAvantAac = await lireConfig();
    const VILLE = 'Essai-Ville-Parcours';
    const aacEcrit = await page.evaluate(async (ville) => {
      const ouvrir = document.querySelector('[onclick="openAacEdit()"]');
      if (!ouvrir) return { ouvrir: false };
      ouvrir.click();
      await new Promise((r) => setTimeout(r, 500));
      const champ = (id) => document.getElementById(id);
      const ids = ['aacNom', 'aacSigle', 'aacEtat', 'aacBigramme', 'aacVille', 'aacAdresse1', 'aacAdresse2', 'aacEmail'];
      if (ids.some((i) => !champ(i)) || !champ('aacLang')) return { ouvrir: true, champs: false };
      const luDAbord = {};
      ids.forEach((i) => { luDAbord[i] = champ(i).value; });
      luDAbord.aacLang = champ('aacLang').value;
      champ('aacVille').value = ville;
      const enregistrer = document.querySelector('#cfgModalRoot [onclick="saveAAC()"]');
      if (!enregistrer) return { ouvrir: true, champs: true, bouton: false };
      enregistrer.click();
      await new Promise((r) => setTimeout(r, 2000));
      return {
        ouvrir: true, champs: true, bouton: true, luDAbord,
        alEcran: [...document.querySelectorAll('.aac-info-val')].some((e) => e.textContent.includes(ville)),
      };
    }, VILLE);
    const cfgApresAac = await lireConfig();
    const aacAvant = (cfgAvantAac || {}).aac || {};
    const aacApres = (cfgApresAac || {}).aac || {};
    const sansVille = (a) => {
      const c = { ...(a || {}) };
      delete c.ville;
      return JSON.stringify(c);
    };
    // Le logo est une image en base 64 : il est **comparé** comme le reste, mais
    // jamais **rapporté** — un échec rendait 1,4 Mo de diagnostic, donc illisible.
    const lisible = (a) => {
      const c = { ...(a || {}) };
      if (c.logo) c.logo = `[image de ${c.logo.length} caractères]`;
      return c;
    };
    verifier('l’identité de l’Administration se modifie, et la fenêtre portait bien l’enregistré',
      aacEcrit.bouton === true
      // La fenêtre lue : si elle s'ouvrait vide, ces trois-là seraient vides et
      // l'enregistrement les effacerait.
      && (aacEcrit.luDAbord || {}).aacNom === aacAvant.nom
      && (aacEcrit.luDAbord || {}).aacBigramme === aacAvant.bigramme
      && (aacEcrit.luDAbord || {}).aacLang === ((cfgAvantAac || {}).instance || {}).defaultLang
      && aacApres.ville === VILLE
      && aacEcrit.alEcran === true
      // Et ce qui ne devait pas bouger n'a pas bougé.
      && sansVille(aacApres) === sansVille(aacAvant)
      && ((cfgApresAac || {}).instance || {}).defaultLang === ((cfgAvantAac || {}).instance || {}).defaultLang
      && ((cfgApresAac || {}).instance || {}).codeEtat === ((cfgAvantAac || {}).instance || {}).codeEtat,
      JSON.stringify({ aacEcrit, avant: lisible(aacAvant), apres: lisible(aacApres) }));

    const aacRendu = await page.evaluate(async (ville) => {
      const ouvrir = document.querySelector('[onclick="openAacEdit()"]');
      if (!ouvrir) return false;
      ouvrir.click();
      await new Promise((r) => setTimeout(r, 500));
      const champ = document.getElementById('aacVille');
      if (!champ) return false;
      champ.value = ville;
      document.querySelector('#cfgModalRoot [onclick="saveAAC()"]').click();
      await new Promise((r) => setTimeout(r, 2000));
      return true;
    }, aacAvant.ville || '');
    const cfgRenduAac = await lireConfig();
    verifier('et l’identité revient à l’identique',
      aacRendu === true
      && JSON.stringify((cfgRenduAac || {}).aac) === JSON.stringify(aacAvant),
      JSON.stringify({ avant: lisible(aacAvant), rendu: lisible((cfgRenduAac || {}).aac) }));

    // ── L'organigramme : le rattachement par glisser-déposer, et l'intérim ──
    //
    // Six gestes, dont quatre que **mon relevé ne voyait pas**. L'extracteur et le
    // mouchard ne connaissaient que `click`, `change`, `submit` et `input` : les
    // sept attributs `ondragstart` / `ondragover` / `ondragleave` / `ondrop` de
    // cet écran n'étaient ni exercés ni déclarés non couverts — **ils n'existaient
    // pas pour l'outil**. Un geste qu'un outil ne sait pas voir ne manque jamais à
    // l'appel.
    //
    // La liste des événements est élargie (ADR-003, 5.c.11), le dénominateur passe
    // de 78 à 84, et ces quatre-là se couvrent ici.
    etape = 'organigramme : rattachement et intérim';
    const lireOrg = (quoi) => page.evaluate(async (c) => {
      const r = await fetch(`/api/referentiels/${c}`);
      return r.ok ? r.json() : null;
    }, quoi);

    await allerSousVue('organigramme');

    // ── 1. Le rattachement : une ronde parfaite, parce que le retrait existe ──
    //
    // Déposer crée un rattachement, la croix de la pastille le retire. C'est le
    // seul geste d'écriture du portail dont l'inverse est **offert par l'écran au
    // même endroit** : la ronde ne laisse donc rien, pas même une trace de
    // registre.
    //
    // Le glisser-déposer ne se « presse » pas. On dispatche deux vrais `DragEvent`
    // portant **le même** `DataTransfer` — c'est ce que fait un navigateur, et
    // c'est ce qui compte : `orgDragStart` y écrit l'identifiant, `orgDrop` l'y
    // relit. Deux objets différents donneraient un dépôt vide, et le contrôle
    // mesurerait son propre montage.
    const rattAvant = await lireOrg('organisation_assignments');
    const depot = await page.evaluate(async () => {
      const personne = document.querySelector('.org-person-item');
      const cible = document.querySelector('.org-node');
      if (!personne || !cible) return { elements: false };
      const nom = (personne.querySelector('span') || {}).textContent || '';
      const dt = new DataTransfer();
      const glisser = (type) => cible.dispatchEvent(
        new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
      personne.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true }));
      const porte = dt.getData('text/plain');
      // Le survol se mesure **dans les deux sens** : un retour visuel qui
      // s'allume sans s'éteindre laisse toutes les entités marquées après un
      // glisser abandonné. `dragleave` est le geste qui l'éteint.
      glisser('dragover');
      const survol = cible.classList.contains('org-drop-hover');
      glisser('dragleave');
      const survolEteint = !cible.classList.contains('org-drop-hover');
      glisser('dragover');
      glisser('drop');
      await new Promise((r) => setTimeout(r, 2000));
      return {
        elements: true, nom: nom.trim(), porte, survol, survolEteint,
        pastille: [...document.querySelectorAll('.org-person-chip')]
          .some((c) => c.textContent.includes(nom.trim())),
        encoreAuPanneau: [...document.querySelectorAll('.org-person-item')]
          .some((e) => ((e.querySelector('span') || {}).textContent || '').trim() === nom.trim()),
      };
    });
    const rattApres = await lireOrg('organisation_assignments');
    verifier('un rattachement se crée en déposant un nom sur une entité, et la pastille paraît',
      depot.elements === true
      // `dragstart` a bien écrit dans le transfert : sans cela le dépôt serait
      // vide et `orgDrop` sortirait sans rien faire — en silence.
      && !!depot.porte
      // `dragover` marque la cible, `dragleave` la démarque : le retour visuel
      // du survol s'allume **et s'éteint**.
      && depot.survol === true && depot.survolEteint === true
      && (rattApres || []).length === (rattAvant || []).length + 1
      && depot.pastille === true
      // Et le nom quitte le panneau du personnel disponible.
      && depot.encoreAuPanneau === false,
      JSON.stringify({ depot, avant: (rattAvant || []).length, apres: (rattApres || []).length }));

    const retrait = await page.evaluate(async (nom) => {
      const pastille = [...document.querySelectorAll('.org-person-chip')]
        .find((c) => c.textContent.includes(nom));
      if (!pastille) return { pastille: false };
      const croix = pastille.querySelector('.org-chip-x');
      if (!croix) return { pastille: true, croix: false };
      croix.click();
      await new Promise((r) => setTimeout(r, 2000));
      return {
        pastille: true, croix: true,
        partie: ![...document.querySelectorAll('.org-person-chip')].some((c) => c.textContent.includes(nom)),
        rendueAuPanneau: [...document.querySelectorAll('.org-person-item')]
          .some((e) => ((e.querySelector('span') || {}).textContent || '').trim() === nom),
      };
    }, depot.nom || '');
    const rattRendu = await lireOrg('organisation_assignments');
    verifier('et la croix de la pastille le retire, le nom revenant au panneau',
      retrait.croix === true && retrait.partie === true && retrait.rendueAuPanneau === true
      && JSON.stringify(rattRendu) === JSON.stringify(rattAvant),
      JSON.stringify({ retrait, avant: (rattAvant || []).length, rendu: (rattRendu || []).length }));

    // Les deux présentations de l'organigramme, pressées depuis leurs boutons.
    const presentations = await page.evaluate(async () => {
      const bouton = (v) => [...document.querySelectorAll('[onclick^="setOrgView"]')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`'${v}'`));
      if (!bouton('tree') || !bouton('list')) return { boutons: false };
      bouton('tree').click();
      await new Promise((r) => setTimeout(r, 800));
      const arbre = document.querySelectorAll('.org-tree-node').length;
      bouton('list').click();
      await new Promise((r) => setTimeout(r, 800));
      const liste = document.querySelectorAll('.org-node').length;
      return { boutons: true, arbre, liste, arbreApres: document.querySelectorAll('.org-tree-node').length };
    });
    verifier('les deux présentations de l’organigramme se commandent, et diffèrent',
      presentations.boutons === true
      && presentations.arbre > 0 && presentations.liste > 0
      // Et le retour à la liste défait l'arbre : sans cette moitié, un bouton qui
      // n'effacerait rien passerait.
      && presentations.arbreApres === 0,
      JSON.stringify(presentations));

    // ── 2. L'intérim : ce qu'une ronde ne peut pas défaire, et pourquoi ──
    //
    // Signaler un intérim redirige **les demandes de validation** vers
    // l'intérimaire. C'est l'écriture de cet écran qui porte un effet d'autorité :
    // qui valide quoi pendant une absence.
    //
    // La ronde lève l'intérim, mais **ne se défait pas entièrement**, et c'est
    // voulu par l'application, non une faiblesse du contrôle :
    //
    //   · le **registre** garde une entrée fermée — c'est sa raison d'être, un
    //     registre qui s'efface ne sert à rien ;
    //   · une **notification** est émise à l'activation, et rien ne la retire.
    //
    // Les deux traces sont donc *attendues*, et le contrôle les **mesure** plutôt
    // que de les subir : l'entrée doit être fermée, et une seule.
    const orgAvant = await lireOrg('organisation');
    const interimPose = await page.evaluate(async () => {
      const bouton = document.querySelector('[onclick*="orgStartInterim"]');
      if (!bouton) return { bouton: false };
      const noeud = bouton.closest('.org-node') || bouton.closest('.org-tree-box');
      const sigle = noeud ? (noeud.querySelector('strong') || {}).textContent : null;
      bouton.click();
      await new Promise((r) => setTimeout(r, 500));
      const choix = document.getElementById('interimSelect');
      if (!choix) return { bouton: true, fenetre: false };
      const option = [...choix.options].find((o) => o.value);
      if (!option) return { bouton: true, fenetre: true, option: false };
      choix.value = option.value;
      const activer = document.querySelector('#cfgModalRoot [onclick^="orgConfirmInterim"]');
      if (!activer) return { bouton: true, fenetre: true, option: true, activer: false };
      activer.click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        bouton: true, fenetre: true, option: true, activer: true,
        sigle: sigle ? sigle.trim() : null, interimaire: option.textContent.trim(),
        // L'écran doit montrer l'intérim actif, et offrir le retour du titulaire.
        alEcran: !!document.querySelector('.org-interim-on'),
        retourOffert: !!document.querySelector('[onclick*="orgEndInterim"]'),
      };
    });
    const orgApres = await lireOrg('organisation');
    const noeudModifie = (liste, sigle) => (liste || []).find((o) => o.sigle === sigle) || {};
    const avantN = noeudModifie(orgAvant, interimPose.sigle);
    const apresN = noeudModifie(orgApres, interimPose.sigle);
    const ouvertes = (n) => (n.registre || []).filter((e) => e.role === 'interim' && !e.end).length;
    verifier('un intérim se signale depuis le poste, et le registre l’ouvre',
      interimPose.activer === true
      && apresN.interim_actif === true && !!apresN.interim_id
      && (apresN.registre || []).length === (avantN.registre || []).length + 1
      && ouvertes(apresN) === ouvertes(avantN) + 1
      && interimPose.alEcran === true && interimPose.retourOffert === true,
      JSON.stringify({ interimPose, avant: { reg: (avantN.registre || []).length, ouvertes: ouvertes(avantN) },
        apres: { interim: apresN.interim_id, actif: apresN.interim_actif, reg: (apresN.registre || []).length, ouvertes: ouvertes(apresN) } }));

    // Le registre, lu par son propre bouton — et il doit porter « En cours ».
    const registreLu = await page.evaluate(async () => {
      const b = document.querySelector('[onclick*="openPosteRegistre"]');
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 600));
      const corps = document.querySelector('#cfgModalRoot .shell-modal-body');
      const texte = corps ? corps.textContent : '';
      const lignes = corps ? corps.querySelectorAll('tbody tr').length : 0;
      const fermer = document.querySelector('#cfgModalRoot [onclick="closeRefModal()"]');
      if (fermer) fermer.click();
      await new Promise((r) => setTimeout(r, 300));
      return { bouton: true, lignes, enCours: /En cours/.test(texte), interimaire: /[Ii]ntérimaire/.test(texte) };
    });
    verifier('le registre du poste s’ouvre et montre l’intérim en cours',
      registreLu.bouton === true && registreLu.lignes >= 1
      && registreLu.enCours === true && registreLu.interimaire === true,
      JSON.stringify(registreLu));

    const interimLeve = await page.evaluate(async () => {
      const b = document.querySelector('[onclick*="orgEndInterim"]');
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        bouton: true,
        plusDActif: !document.querySelector('.org-interim-on'),
        signalerOffert: !!document.querySelector('[onclick*="orgStartInterim"]'),
      };
    });
    const orgLeve = await lireOrg('organisation');
    const leveN = noeudModifie(orgLeve, interimPose.sigle);
    verifier('le titulaire revient, et le registre referme l’entrée sans en perdre la trace',
      interimLeve.bouton === true
      && leveN.interim_actif === false && !leveN.interim_id
      // La trace reste, fermée : c'est ce qu'un registre doit faire.
      && (leveN.registre || []).length === (apresN.registre || []).length
      && ouvertes(leveN) === 0
      && interimLeve.plusDActif === true && interimLeve.signalerOffert === true,
      JSON.stringify({ interimLeve, registre: leveN.registre, ouvertes: ouvertes(leveN) }));

    // ── Les exigences réglementaires : quatre gestes, dont le plus lourd de l'écran ──
    //
    // Une exigence est l'objet **réglementaire** du dispositif : c'est elle que la
    // surveillance vient vérifier. Sa référence et son libellé fondent un écart, et
    // un écart fonde une mesure d'application. Une exigence rattachée au mauvais
    // règlement, ou dont le libellé s'est perdu, fait une surveillance mal fondée —
    // et cela ne se voit pas à l'écran.
    //
    // `saveReglement` est **l'écriture la plus lourde du portail** : renommer un
    // règlement réécrit **toutes** les exigences du groupe, une requête par
    // exigence, dans une boucle sans retour en arrière. Un renommage qui s'arrête
    // au milieu **scinde le règlement en deux groupes** — et chaque moitié a l'air
    // normale.
    //
    // D'où l'ordre de cette ronde, qui n'est pas indifférent : on **crée d'abord**
    // une exigence dans le groupe, pour que le renommage porte sur **deux**. Le jeu
    // d'essai n'en a qu'une par règlement, et une boucle qui s'arrête au premier
    // tour est juste quand il n'y en a qu'un. *Un contrôle de masse sur un seul
    // élément ne mesure pas la masse.*
    etape = 'exigences et règlements';
    const lireExigences = () => lireOrg('exigences');

    await allerSousVue('exigences');

    // Les bandeaux sont fermés par défaut : déplier est un préalable, et c'est
    // aussi l'un des quatre gestes.
    const deplie = await page.evaluate(async () => {
      const groupe = document.querySelector('.exig-group');
      if (!groupe) return { groupe: false };
      const ferme = groupe.classList.contains('collapsed');
      groupe.querySelector('.exig-banner').click();
      await new Promise((r) => setTimeout(r, 800));
      const apres = document.querySelector('.exig-group');
      return {
        groupe: true, fermeDAbord: ferme,
        ouvert: apres ? !apres.classList.contains('collapsed') : null,
        reglement: apres ? (apres.querySelector('.exig-banner-title') || {}).textContent.trim() : null,
      };
    });
    verifier('un groupe d’exigences se déplie depuis son bandeau',
      deplie.groupe === true && deplie.fermeDAbord === true && deplie.ouvert === true,
      JSON.stringify(deplie));

    // ── 1. Une exigence ajoutée au groupe hérite de son règlement ──
    //
    // Le « + » du bandeau passe le règlement et la date **en paramètres** ; le
    // panneau les montre en lecture seule, et l'enregistrement les renvoie. Une
    // exigence créée là et qui ressortirait sans règlement serait orpheline —
    // visible dans « Sans règlement », donc perdue pour l'agent qui la cherche.
    const exigAvant = await lireExigences();
    const REFERENCE = 'ESSAI-PARCOURS 1.001';
    const LIBELLE = 'Exigence posée par la suite « parcours »';
    const exigCreee = await page.evaluate(async (ref, lib) => {
      const groupe = document.querySelector('.exig-group');
      const plus = groupe && groupe.querySelector('.exig-banner-right [onclick^="openExigDrawer"]');
      if (!plus) return { plus: false };
      plus.click();
      await new Promise((r) => setTimeout(r, 500));
      const tiroir = document.querySelector('.exig-drawer');
      if (!tiroir || !document.getElementById('exReference')) return { plus: true, tiroir: false };
      // Le règlement est montré en lecture seule : c'est ce que l'agent voit, et
      // ce que l'enregistrement doit renvoyer.
      const enTete = (tiroir.querySelector('.exig-reg-readonly') || {}).textContent || '';
      document.getElementById('exReference').value = ref;
      document.getElementById('exLibelle').value = lib;
      const enregistrer = tiroir.querySelector('[onclick^="saveExigDrawer"]');
      if (!enregistrer) return { plus: true, tiroir: true, bouton: false };
      enregistrer.click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        plus: true, tiroir: true, bouton: true, enTete: enTete.trim(),
        tiroirFerme: (document.getElementById('exigDrawerRoot') || {}).innerHTML === '',
        alEcran: [...document.querySelectorAll('.exig-group:not(.collapsed) tbody tr')]
          .some((r) => r.textContent.includes(ref)),
      };
    }, REFERENCE, LIBELLE);
    const exigApres = await lireExigences();
    const nouvelle = (exigApres || []).find((e) => e.reference === REFERENCE) || {};
    const voisine = (exigAvant || []).find((e) => (e.reglement || '') === (nouvelle.reglement || ''));
    verifier('une exigence ajoutée au bandeau hérite du règlement et de sa date d’adoption',
      exigCreee.bouton === true
      && (exigApres || []).length === (exigAvant || []).length + 1
      && nouvelle.libelle === LIBELLE
      && !!nouvelle.reglement && !!voisine
      && nouvelle.reglement === voisine.reglement
      && nouvelle.date_adoption === voisine.date_adoption
      && exigCreee.alEcran === true && exigCreee.tiroirFerme === true,
      JSON.stringify({ exigCreee, nouvelle, heriteDe: voisine && voisine.reglement }));

    // ── 2. La modification, et le règlement que le panneau n'envoie pas ──
    //
    // En édition, `saveExigDrawer` n'envoie que la référence, le libellé et le
    // statut : **ni le règlement ni la date**. L'exigence les garde uniquement
    // parce que le serveur **fusionne** le correctif à l'enregistrement
    // (`{ ...existant, ...correctif }`). C'est un couplage qui ne se voit d'aucun
    // des deux côtés, et que la réécriture en React peut défaire sans s'en
    // apercevoir : d'où l'assertion explicite.
    const LIBELLE_2 = 'Exigence modifiée par la suite « parcours »';
    const exigModifiee = await page.evaluate(async (ref, lib2) => {
      const ligne = [...document.querySelectorAll('.exig-group:not(.collapsed) tbody tr')]
        .find((r) => r.textContent.includes(ref));
      if (!ligne) return { ligne: false };
      const editer = ligne.querySelector('[onclick^="openExigDrawer"]');
      if (!editer) return { ligne: true, bouton: false };
      editer.click();
      await new Promise((r) => setTimeout(r, 500));
      const champRef = document.getElementById('exReference');
      const champLib = document.getElementById('exLibelle');
      if (!champRef || !champLib) return { ligne: true, bouton: true, champs: false };
      // Un panneau d'édition qui s'ouvrirait vide ferait écraser l'enregistré.
      const luDAbord = { reference: champRef.value, libelle: champLib.value };
      champLib.value = lib2;
      document.querySelector('.exig-drawer [onclick^="saveExigDrawer"]').click();
      await new Promise((r) => setTimeout(r, 2500));
      return { ligne: true, bouton: true, champs: true, luDAbord };
    }, REFERENCE, LIBELLE_2);
    const exigEditee = await lireExigences();
    const modifiee = (exigEditee || []).find((e) => e.reference === REFERENCE) || {};
    verifier('le panneau d’une exigence porte l’enregistré, et la modifier ne perd pas son règlement',
      exigModifiee.champs === true
      && (exigModifiee.luDAbord || {}).reference === REFERENCE
      && (exigModifiee.luDAbord || {}).libelle === LIBELLE
      && modifiee.libelle === LIBELLE_2
      // Le couplage nommé plus haut : ni l'un ni l'autre n'est envoyé.
      && modifiee.reglement === nouvelle.reglement
      && modifiee.date_adoption === nouvelle.date_adoption,
      JSON.stringify({ exigModifiee, modifiee }));

    // Le panneau se referme par son bouton d'annulation, sans rien écrire.
    const tiroirAnnule = await page.evaluate(async (ref) => {
      const ligne = [...document.querySelectorAll('.exig-group:not(.collapsed) tbody tr')]
        .find((r) => r.textContent.includes(ref));
      if (!ligne) return { ligne: false };
      ligne.querySelector('[onclick^="openExigDrawer"]').click();
      await new Promise((r) => setTimeout(r, 500));
      const ouvert = !!document.querySelector('.exig-drawer');
      const champ = document.getElementById('exLibelle');
      if (champ) champ.value = 'CE TEXTE NE DOIT PAS ÊTRE ENREGISTRÉ';
      const annuler = [...document.querySelectorAll('.exig-drawer [onclick="closeExigDrawer()"]')].pop();
      if (!annuler) return { ligne: true, ouvert, annuler: false };
      annuler.click();
      await new Promise((r) => setTimeout(r, 500));
      return { ligne: true, ouvert, annuler: true, ferme: !document.querySelector('.exig-drawer') };
    }, REFERENCE);
    const exigAnnulee = await lireExigences();
    verifier('le panneau se referme par son annulation, et n’écrit rien',
      tiroirAnnule.ouvert === true && tiroirAnnule.ferme === true
      && JSON.stringify(exigAnnulee) === JSON.stringify(exigEditee),
      JSON.stringify(tiroirAnnule));

    // ── Déplier un groupe **par son nom** ──
    //
    // Nécessaire, et je l'ai appris en échouant : renommer un règlement **replie
    // son groupe**. L'état d'ouverture (`EXIG_OPEN`) est indexé par le nom du
    // règlement, qui vient précisément de changer — le groupe renommé n'est donc
    // plus dans l'ensemble des ouverts. C'est un désagrément d'écran, non un
    // défaut de donnée ; il est noté ici plutôt que corrigé dans un fichier qu'on
    // réécrit.
    const deplierGroupe = (nom) => page.evaluate(async (n) => {
      const trouve = () => [...document.querySelectorAll('.exig-group')]
        .find((g) => (g.querySelector('.exig-banner-title') || {}).textContent.includes(n));
      const g = trouve();
      if (!g) return false;
      if (g.classList.contains('collapsed')) {
        g.querySelector('.exig-banner').click();
        await new Promise((r) => setTimeout(r, 900));
      }
      const apres = trouve();
      return !!apres && !apres.classList.contains('collapsed');
    }, nom);

    // ── 3. Le renommage du règlement : deux exigences, et non une ──
    const groupeAvant = (exigEditee || []).filter((e) => (e.reglement || '') === nouvelle.reglement);
    const NOUVEAU_REG = 'ESSAI-PARCOURS (Règlement renommé)';
    const renomme = await page.evaluate(async (nouveau) => {
      const bouton = document.querySelector('.exig-group:not(.collapsed) .exig-banner-right [onclick^="openReglementForm"]');
      if (!bouton) return { bouton: false };
      bouton.click();
      await new Promise((r) => setTimeout(r, 500));
      const nom = document.getElementById('rgNom');
      const date = document.getElementById('rgDate');
      if (!nom || !date) return { bouton: true, formulaire: false };
      const luDAbord = { nom: nom.value, date: date.value };
      const corps = document.querySelector('#exigDrawerRoot .shell-modal-body');
      const annonce = corps ? corps.textContent : '';
      nom.value = nouveau;
      document.querySelector('#exigDrawerRoot [onclick^="saveReglement"]').click();
      await new Promise((r) => setTimeout(r, 3500));
      // Le groupe renommé est replié : l'état d'ouverture est indexé par le nom.
      // Constaté plutôt que subi — c'est ce qui a fait échouer la première
      // écriture de la suite de cette ronde.
      const renommeReplie = [...document.querySelectorAll('.exig-group')]
        .filter((g) => (g.querySelector('.exig-banner-title') || {}).textContent.includes(nouveau))
        .every((g) => g.classList.contains('collapsed'));
      return { bouton: true, formulaire: true, luDAbord, renommeReplie,
        annonce: annonce.replace(/\s+/g, ' ').trim().slice(-60) };
    }, NOUVEAU_REG);
    const exigRenommee = await lireExigences();
    const groupeApres = (exigRenommee || []).filter((e) => (e.reglement || '') === NOUVEAU_REG);
    const ailleurs = (liste) => (liste || []).filter((e) => (e.reglement || '') !== nouvelle.reglement
      && (e.reglement || '') !== NOUVEAU_REG);
    verifier('renommer un règlement réécrit toutes ses exigences, et seulement les siennes',
      renomme.formulaire === true
      // Le contrôle refuse de se contenter d'une : une boucle qui s'arrête au
      // premier tour est juste quand il n'y en a qu'un, et ne prouve rien.
      && groupeAvant.length >= 2
      && (renomme.luDAbord || {}).nom === nouvelle.reglement
      && !!(renomme.luDAbord || {}).date
      && groupeApres.length === groupeAvant.length
      // La date du groupe suit le renommage, puisque le formulaire la porte.
      && groupeApres.every((e) => e.date_adoption === (renomme.luDAbord || {}).date)
      // Et les exigences des autres règlements n'ont pas bougé.
      && JSON.stringify(ailleurs(exigRenommee)) === JSON.stringify(ailleurs(exigEditee))
      // Le repli du groupe renommé, constaté : si un jour il ne se replie plus,
      // ce contrôle le dira au lieu de laisser la surprise à la ronde suivante.
      && renomme.renommeReplie === true,
      JSON.stringify({ renomme, avant: groupeAvant.length, apres: groupeApres.length,
        restantes: (exigRenommee || []).map((e) => e.reglement) }));

    // Le renommage se défait par le même formulaire.
    const regRendu = await page.evaluate(async (ancien, nouveau) => {
      const groupe = [...document.querySelectorAll('.exig-group')]
        .find((g) => (g.querySelector('.exig-banner-title') || {}).textContent.includes(nouveau));
      const bouton = groupe && groupe.querySelector('.exig-banner-right [onclick^="openReglementForm"]');
      if (!bouton) return false;
      bouton.click();
      await new Promise((r) => setTimeout(r, 500));
      document.getElementById('rgNom').value = ancien;
      document.querySelector('#exigDrawerRoot [onclick^="saveReglement"]').click();
      await new Promise((r) => setTimeout(r, 3500));
      return true;
    }, nouvelle.reglement || '', NOUVEAU_REG);
    const reDeplie = await deplierGroupe(nouvelle.reglement || '');
    // Puis l'exigence d'essai est retirée, et le référentiel doit revenir à l'identique.
    const exigSupprimee = await page.evaluate(async (ref) => {
      const ligne = [...document.querySelectorAll('.exig-group tbody tr')]
        .find((r) => r.textContent.includes(ref));
      if (!ligne) return { ligne: false };
      const b = ligne.querySelector('[onclick^="deleteRef"]');
      if (!b) return { ligne: true, bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 400));
      const oui = document.querySelector('.oasis-confirm-oui');
      if (!oui) return { ligne: true, bouton: true, confirmation: false };
      oui.click();
      await new Promise((r) => setTimeout(r, 2500));
      return { ligne: true, bouton: true, confirmation: true };
    }, REFERENCE);
    const exigRendu = await lireExigences();
    verifier('le renommage se défait, et le référentiel des exigences revient à l’identique',
      regRendu === true && reDeplie === true && exigSupprimee.confirmation === true
      && JSON.stringify(exigRendu) === JSON.stringify(exigAvant),
      JSON.stringify({ regRendu, reDeplie, exigSupprimee,
        avant: (exigAvant || []).map((e) => `${e.reference}/${e.reglement}`),
        rendu: (exigRendu || []).map((e) => `${e.reference}/${e.reglement}`) }));

    // ── Le profil, et les quatre dépôts de fichiers ──
    //
    // Cinq gestes, dont quatre qui passent par un fichier. Le chemin est celui de
    // l'import (5.c.9) : un fichier sur le disque, posé dans le champ par le
    // navigateur. Ce qui change, c'est qu'il faut **rendre l'original** —
    // et l'original du logo de l'AAC pèse 374 498 caractères en base 64.
    //
    // La ronde du logo le décode donc en un fichier et le **redépose**. Si les
    // deux dépôts rendaient des octets différents, la configuration ne reviendrait
    // pas à l'identique, et le contrôle le dirait. C'est la seule façon de rendre
    // un fichier par l'écran qui l'a reçu.
    etape = 'profil et dépôts de fichiers';

    // Une image d'essai minuscule, mais **valide** : un PNG de 1×1 que le
    // navigateur accepte de lire et que le serveur accepte de stocker.
    const PNG_ESSAI = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
      'base64',
    );
    const dossierImages = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-images-'));
    const ecrireImage = (nom, octets) => {
      const chemin = path.join(dossierImages, nom);
      fs.writeFileSync(chemin, octets);
      return chemin;
    };

    // ── 1. Les informations du profil : quatre champs qui partent ensemble ──
    //
    // Même famille que l'identité de l'AAC : `saveProfileInfos` envoie nom,
    // prénom, téléphone et fonction **à chaque fois**. Un champ que l'écran n'a pas
    // su relire part vide et écrase l'enregistré — et il s'agit ici du **compte
    // connecté**, celui dont le nom s'affiche en haut de chaque écran.
    //
    // Le champ visé est `fonction`, qui ne commande rien. Nom et prénom sont
    // **relus et asservis** : ils construisent `fullName` côté serveur.
    await page.evaluate(() => document.querySelector('.portal-nav-btn[data-view="profile"]').click());
    await page.waitForSelector('#pfFonction', { timeout: 10000 }).catch(() => { /* dit plus bas */ });
    const lireMoi = () => page.evaluate(async () => {
      const r = await fetch('/api/me');
      const d = r.ok ? await r.json() : null;
      const u = (d && (d.user || d)) || {};
      // ── Les champs absents, normalisés — et pourquoi il faut le dire ──
      //
      // Le compte d'amorçage n'a **aucune clé** `fonction` ni `telephone` : le
      // premier enregistrement du profil les matérialise à la chaîne vide. La
      // ronde ne peut donc pas rendre l'enregistrement **à l'identique** au sens
      // strict, et comparer sans normaliser faisait échouer la remise en place
      // sur `undefined ≠ ""`.
      //
      // Ce n'est pas un défaut : c'est un écran qui envoie ses quatre champs et un
      // serveur qui écrit ce qu'il reçoit. Mais c'est une asymétrie, et une
      // asymétrie qu'on normalise sans la nommer redevient une surprise.
      return {
        nom: u.nom ?? '', prenom: u.prenom ?? '', fullName: u.fullName ?? '',
        fonction: u.fonction ?? '', telephone: u.telephone ?? '',
        photo: u.photo ? u.photo.length : 0,
      };
    });
    const moiAvant = await lireMoi();
    const FONCTION = 'Fonction d’essai (parcours)';
    const profilEcrit = await page.evaluate(async (fonction) => {
      const champs = ['pfNom', 'pfPrenom', 'pfTel', 'pfFonction'];
      if (champs.some((i) => !document.getElementById(i))) return { champs: false };
      const luDAbord = {};
      champs.forEach((i) => { luDAbord[i] = document.getElementById(i).value; });
      document.getElementById('pfFonction').value = fonction;
      const b = document.querySelector('[onclick="saveProfileInfos()"]');
      if (!b) return { champs: true, bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        champs: true, bouton: true, luDAbord,
        alEcran: (document.querySelector('#pfFonction') || {}).value === fonction,
      };
    }, FONCTION);
    const moiApres = await lireMoi();
    verifier('la fonction du profil s’enregistre, et le nom du compte connecté ne bouge pas',
      profilEcrit.bouton === true
      // La fenêtre portait l'enregistré : sinon l'enregistrement l'effacerait.
      && (profilEcrit.luDAbord || {}).pfNom === moiAvant.nom
      && (profilEcrit.luDAbord || {}).pfPrenom === moiAvant.prenom
      && moiApres.fonction === FONCTION
      && moiApres.nom === moiAvant.nom && moiApres.prenom === moiAvant.prenom
      && moiApres.fullName === moiAvant.fullName
      && moiApres.telephone === moiAvant.telephone
      && profilEcrit.alEcran === true,
      JSON.stringify({ profilEcrit, avant: moiAvant, apres: moiApres }));

    const profilRendu = await page.evaluate(async (fonction) => {
      const champ = document.getElementById('pfFonction');
      if (!champ) return false;
      champ.value = fonction;
      document.querySelector('[onclick="saveProfileInfos()"]').click();
      await new Promise((r) => setTimeout(r, 2500));
      return true;
    }, moiAvant.fonction || '');
    const moiRendu = await lireMoi();
    verifier('et la fonction revient à sa valeur d’origine',
      profilRendu === true && JSON.stringify(moiRendu) === JSON.stringify(moiAvant),
      JSON.stringify({ avant: moiAvant, rendu: moiRendu }));

    // ── 2. La photo du profil : une ronde parfaite, le compte n'en ayant pas ──
    //
    // Le bouton de retrait **n'existe pas** tant qu'il n'y a pas de photo : il faut
    // donc en déposer une pour qu'il paraisse. Le contrôle le vérifie dans les deux
    // sens — c'est ce qui distingue « le dépôt a marché » de « l'écran s'est mis à
    // jour ».
    const photoPosee = await page.evaluate(async () => {
      const avant = !!document.querySelector('[onclick="removeProfilePhoto()"]');
      return { boutonRetraitAvant: avant, champ: !!document.querySelector('.pf-side input[type="file"]') };
    });
    const champPhoto = await page.$('.pf-side input[type="file"]');
    if (champPhoto) await champPhoto.uploadFile(ecrireImage('photo.png', PNG_ESSAI));
    await new Promise((r) => setTimeout(r, 2500));
    const moiPhoto = await lireMoi();
    const photoRendu = await page.evaluate(() => ({
      boutonRetrait: !!document.querySelector('[onclick="removeProfilePhoto()"]'),
      image: !!document.querySelector('.pf-photo-frame img'),
    }));
    verifier('une photo de profil se dépose, et le bouton de retrait paraît avec elle',
      photoPosee.champ === true && photoPosee.boutonRetraitAvant === false
      && moiAvant.photo === 0 && moiPhoto.photo > 0
      && photoRendu.boutonRetrait === true && photoRendu.image === true,
      JSON.stringify({ photoPosee, photoRendu, avant: moiAvant.photo, apres: moiPhoto.photo }));

    const photoRetiree = await page.evaluate(async () => {
      const b = document.querySelector('[onclick="removeProfilePhoto()"]');
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 400));
      const oui = document.querySelector('.oasis-confirm-oui');
      if (!oui) return { bouton: true, confirmation: false };
      oui.click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        bouton: true, confirmation: true,
        boutonRetrait: !!document.querySelector('[onclick="removeProfilePhoto()"]'),
      };
    });
    const moiSansPhoto = await lireMoi();
    verifier('et elle se retire, confirmation pressée, le bouton partant avec elle',
      photoRetiree.confirmation === true && moiSansPhoto.photo === 0
      && photoRetiree.boutonRetrait === false,
      JSON.stringify({ photoRetiree, apres: moiSansPhoto.photo }));

    // ── 3. Le logo de l'AAC : rendre l'original, et non « un » logo ──
    //
    // Celui-ci n'est pas une ronde facile : l'instance **a** un logo, de 374 498
    // caractères. Le remplacer puis en remettre « un » ne serait pas une remise en
    // place. On décode donc l'original en un fichier, et on le **redépose par le
    // même champ** : si les deux dépôts ne rendaient pas les mêmes octets, la
    // comparaison finale le dirait.
    await allerSousVue('organisation');
    const logoAvant = await page.evaluate(async () => {
      const r = await fetch('/api/config');
      const d = r.ok ? await r.json() : null;
      return ((d || {}).aac || {}).logo || '';
    });
    const b64Logo = (logoAvant.split(',')[1] || '');
    const cheminOriginal = b64Logo ? ecrireImage('logo-original.png', Buffer.from(b64Logo, 'base64')) : null;
    const champLogo = await page.$('.aac-logo-col input[type="file"]');
    if (champLogo) await champLogo.uploadFile(ecrireImage('logo-essai.png', PNG_ESSAI));
    await new Promise((r) => setTimeout(r, 2500));
    const logoEssai = await page.evaluate(async () => {
      const r = await fetch('/api/config');
      const d = r.ok ? await r.json() : null;
      return {
        logo: ((d || {}).aac || {}).logo || '',
        alEcran: !!document.querySelector('.aac-logo-preview'),
        retraitOffert: !!document.querySelector('[onclick="removeAacLogo()"]'),
      };
    });
    verifier('le logo de l’AAC se remplace par l’écran',
      !!champLogo && !!logoAvant && logoEssai.logo !== logoAvant
      && logoEssai.logo.startsWith('data:image/png;base64,')
      && logoEssai.logo.length < logoAvant.length
      && logoEssai.alEcran === true && logoEssai.retraitOffert === true,
      JSON.stringify({ avant: logoAvant.length, essai: logoEssai.logo.length,
        alEcran: logoEssai.alEcran, retraitOffert: logoEssai.retraitOffert }));

    // Le retrait, confirmation pressée — puis le dépôt de l'original.
    const logoRetire = await page.evaluate(async () => {
      const b = document.querySelector('[onclick="removeAacLogo()"]');
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 400));
      const oui = document.querySelector('.oasis-confirm-oui');
      if (!oui) return { bouton: true, confirmation: false };
      oui.click();
      await new Promise((r) => setTimeout(r, 2500));
      const r2 = await fetch('/api/config');
      const d = r2.ok ? await r2.json() : null;
      return {
        bouton: true, confirmation: true,
        logo: ((d || {}).aac || {}).logo || '',
        placeVide: !!document.querySelector('.aac-logo-empty'),
      };
    });
    const champLogo2 = await page.$('.aac-logo-col input[type="file"]');
    if (champLogo2 && cheminOriginal) await champLogo2.uploadFile(cheminOriginal);
    await new Promise((r) => setTimeout(r, 3000));
    const logoRendu = await page.evaluate(async () => {
      const r = await fetch('/api/config');
      const d = r.ok ? await r.json() : null;
      return ((d || {}).aac || {}).logo || '';
    });
    verifier('le logo se retire, et l’original se redépose octet pour octet',
      logoRetire.confirmation === true && logoRetire.logo === ''
      && logoRetire.placeVide === true
      // L'égalité stricte : un redépôt qui changerait le type MIME ou le codage
      // rendrait une chaîne différente, et la configuration ne serait pas rendue.
      && logoRendu === logoAvant,
      JSON.stringify({ retire: (logoRetire.logo || '').length, placeVide: logoRetire.placeVide,
        original: logoAvant.length, rendu: logoRendu.length,
        identique: logoRendu === logoAvant }));
    fs.rmSync(dossierImages, { recursive: true, force: true });

    // ── La création et l'effacement d'un compte ──
    //
    // Ce bloc est la **correction d'un plan que j'avais annoncé et qui ne tient
    // pas**. J'avais écrit que créer un compte par l'écran permettrait de s'y
    // connecter, et donc de lever d'un coup les trois dispenses qui demandent « un
    // compte dédié » : `pwdSubmit` (changement imposé au premier accès),
    // `saveProfileExtra` (bloc réservé à un rôle prestataire) et
    // `submitProfilePassword`.
    //
    // **C'est impossible, et c'est voulu.** Le mot de passe temporaire est tiré au
    // hasard et part par courriel ; or ce courriel est marqué `secret: true` dans
    // `src/email.js`, et son corps **n'est pas conservé** — le registre garde
    // « (corps retiré : ce message portait un secret) ». Aucune route ne rend jamais
    // un mot de passe : les deux seules générations du serveur passent directement
    // à `email.accountCreated` et `email.passwordReset`.
    //
    // Un essai ne peut donc pas obtenir ce mot de passe autrement qu'en le posant
    // lui-même dans le bac, ce qui serait un geste du harnais et non de l'écran.
    // Les trois dispenses restent, avec cette raison-là — qui est meilleure que
    // celle qu'elles portaient.
    //
    // Ce qui **est** couvrable, et l'est ici : la création de bout en bout, les deux
    // chemins d'abandon qui ne doivent rien écrire, et l'effacement — qui exige de
    // l'opérateur **son propre mot de passe**.
    etape = 'création et effacement d’un compte';
    const lireComptes = () => page.evaluate(async () => {
      const r = await fetch('/api/users');
      const d = r.ok ? await r.json() : null;
      const l = Array.isArray(d) ? d : ((d || {}).users || []);
      return l.map((u) => ({ username: u.username, role: u.role, nom: u.nom }));
    });

    await page.evaluate(() => document.querySelector('.portal-nav-btn[data-view="users"]').click());
    await new Promise((r) => setTimeout(r, 900));
    await page.evaluate(() => {
      const b = document.querySelector('[onclick="setUserTab(\'AAC\')"]');
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 900));

    const comptesAvant = await lireComptes();
    const COURRIEL = 'essai.parcours@anac.bj';

    // ── Les deux chemins d'abandon : ils ne doivent rien écrire ──
    //
    // La croix et le bouton « Annuler » referment la même fenêtre par deux
    // écouteurs distincts. Les deux sont éprouvés **la fenêtre remplie** : une
    // annulation qui enregistrerait ce qu'on vient de taper est le genre de défaut
    // qu'on ne découvre qu'après avoir créé un compte par mégarde.
    const abandons = await page.evaluate(async (courriel) => {
      const resultat = {};
      for (const quoi of ['closeModal', 'cancelModal']) {
        document.getElementById('newUserBtn').click();
        await new Promise((r) => setTimeout(r, 500));
        const champ = document.getElementById('nuEmail');
        if (!champ) { resultat[quoi] = { fenetre: false }; continue; }
        document.getElementById('nuNom').value = 'ABANDON';
        champ.value = courriel;
        const b = document.getElementById(quoi);
        if (!b) { resultat[quoi] = { fenetre: true, bouton: false }; continue; }
        b.click();
        await new Promise((r) => setTimeout(r, 500));
        resultat[quoi] = {
          fenetre: true, bouton: true,
          ferme: (document.getElementById('userModalRoot') || {}).innerHTML === '',
        };
      }
      return resultat;
    }, COURRIEL);
    const comptesApresAbandon = await lireComptes();
    verifier('les deux chemins d’abandon de la création referment la fenêtre sans rien écrire',
      (abandons.closeModal || {}).ferme === true && (abandons.cancelModal || {}).ferme === true
      && JSON.stringify(comptesApresAbandon) === JSON.stringify(comptesAvant),
      JSON.stringify({ abandons, avant: (comptesAvant || []).length, apres: (comptesApresAbandon || []).length }));

    // ── Le rôle commande les champs offerts, dans les deux sens ──
    const cree = await page.evaluate(async (courriel) => {
      document.getElementById('newUserBtn').click();
      await new Promise((r) => setTimeout(r, 500));
      const role = document.getElementById('nuRole');
      const enveloppe = document.getElementById('nuPrestaWrap');
      if (!role || !enveloppe) return { fenetre: false };
      const cacheDAbord = enveloppe.style.display === 'none';
      role.value = 'PRESTATAIRE';
      role.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      const montre = enveloppe.style.display !== 'none';
      role.value = 'AAC';
      role.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      const recache = enveloppe.style.display === 'none';
      document.getElementById('nuNom').value = 'ESSAI';
      document.getElementById('nuPrenom').value = 'Parcours';
      document.getElementById('nuEmail').value = courriel;
      document.getElementById('createUser').click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        fenetre: true, cacheDAbord, montre, recache,
        ferme: (document.getElementById('userModalRoot') || {}).innerHTML === '',
        alEcran: [...document.querySelectorAll('.shell-table tbody tr')]
          .some((r) => r.textContent.includes(courriel)),
      };
    }, COURRIEL);
    const comptesApres = await lireComptes();
    const nouveauCompte = (comptesApres || []).find((u) => u.username === COURRIEL) || {};
    verifier('un compte se crée par l’écran, le rôle commandant les champs offerts dans les deux sens',
      cree.fenetre === true
      // Le champ du prestataire paraît sur un rôle prestataire **et repart** sur un
      // autre : sans la seconde moitié, un champ qui ne se cache jamais passerait.
      && cree.cacheDAbord === true && cree.montre === true && cree.recache === true
      && nouveauCompte.role === 'AAC' && nouveauCompte.nom === 'ESSAI'
      && (comptesApres || []).length === (comptesAvant || []).length + 1
      && cree.ferme === true && cree.alEcran === true,
      JSON.stringify({ cree, nouveauCompte }));

    // ── L'effacement : il demande à l'opérateur **son** mot de passe ──
    //
    // Et le contrôle l'éprouve d'abord avec un **mauvais** : un effacement qui
    // passerait sans le bon mot de passe ferait de la corbeille un clic. Le refus
    // doit se voir dans la fenêtre, et le compte rester.
    const refusEffacement = await page.evaluate(async (courriel) => {
      const ligne = [...document.querySelectorAll('.shell-table tbody tr')]
        .find((r) => r.textContent.includes(courriel));
      if (!ligne) return { ligne: false };
      const b = ligne.querySelector('[data-effacer]');
      if (!b) return { ligne: true, bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 500));
      const champ = document.getElementById('efAdminPwd');
      if (!champ) return { ligne: true, bouton: true, fenetre: false };
      champ.value = 'ce-mot-de-passe-est-faux';
      document.getElementById('efValider').click();
      await new Promise((r) => setTimeout(r, 1800));
      const boite = document.getElementById('efErreur');
      return {
        ligne: true, bouton: true, fenetre: true,
        message: boite ? boite.textContent.trim() : null,
        encoreOuverte: !!document.getElementById('efAdminPwd'),
      };
    }, COURRIEL);
    const comptesApresRefus = await lireComptes();
    verifier('un effacement sans le mot de passe de l’opérateur est refusé, et le compte reste',
      refusEffacement.fenetre === true
      && !!refusEffacement.message && refusEffacement.encoreOuverte === true
      && JSON.stringify(comptesApresRefus) === JSON.stringify(comptesApres),
      JSON.stringify({ refusEffacement, restants: (comptesApresRefus || []).length }));

    // Puis avec le bon — celui du harnais, qui est l'opérateur de cette séance.
    const efface = await page.evaluate(async (courriel, mdp) => {
      const champ = document.getElementById('efAdminPwd');
      if (!champ) return { fenetre: false };
      champ.value = mdp;
      document.getElementById('efValider').click();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        fenetre: true,
        ferme: (document.getElementById('userModalRoot') || {}).innerHTML === '',
        partie: ![...document.querySelectorAll('.shell-table tbody tr')]
          .some((r) => r.textContent.includes(courriel)),
      };
    }, COURRIEL, MOT_DE_PASSE);
    const comptesRendus = await lireComptes();
    verifier('et avec le bon, le compte s’efface et la liste revient à son état',
      efface.fenetre === true && efface.ferme === true && efface.partie === true
      && JSON.stringify(comptesRendus) === JSON.stringify(comptesAvant),
      JSON.stringify({ efface, avant: (comptesAvant || []).length, rendus: (comptesRendus || []).length }));

    // ── Changer l'identifiant de connexion demande le mot de passe de l'opérateur ──
    //
    // J'avais écrit ce contrôle en croyant que ce geste vérifiait la **forme** de
    // l'adresse. Il fait autre chose, et de plus important : l'adresse **est**
    // l'identifiant de connexion, et la changer révèle un champ qui exige le mot de
    // passe du super-administrateur. Le geste est un `input`, non un clic — le
    // mouchard ne le voyait pas avant que la liste des événements soit élargie
    // (5.c.11).
    //
    // Éprouvé dans les deux sens : le champ paraît quand l'adresse diffère, et
    // **repart** quand on remet l'originale. Sans la seconde moitié, un champ qui
    // ne se cacherait jamais passerait — et il demanderait un mot de passe pour une
    // modification qui n'en a pas besoin.
    const identifiant = await page.evaluate(async () => {
      const ligne = [...document.querySelectorAll('.shell-table tbody tr')][0];
      if (!ligne) return { ligne: false };
      const editer = ligne.querySelector('[data-edit]');
      if (!editer) return { ligne: true, bouton: false };
      editer.click();
      await new Promise((r) => setTimeout(r, 600));
      const champ = document.getElementById('euEmail');
      const enveloppe = document.getElementById('euAdminPwdWrap');
      if (!champ || !enveloppe) return { ligne: true, bouton: true, fenetre: false };
      const originale = champ.value;
      const cacheDAbord = enveloppe.style.display === 'none';
      const taper = async (valeur) => {
        champ.value = valeur;
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 250));
        return enveloppe.style.display !== 'none';
      };
      const demandeSiChange = await taper('autre.adresse@anac.bj');
      const repartSiRemise = !(await taper(originale));
      // Et la fenêtre se referme par son annulation, sans enregistrer.
      const annuler = [...document.querySelectorAll('#userModalRoot [onclick="closeUserModal()"]')].pop();
      if (annuler) annuler.click();
      await new Promise((r) => setTimeout(r, 400));
      return {
        ligne: true, bouton: true, fenetre: true, originale,
        cacheDAbord, demandeSiChange, repartSiRemise,
        ferme: (document.getElementById('userModalRoot') || {}).innerHTML === '',
      };
    });
    const comptesApresForme = await lireComptes();
    verifier('changer l’identifiant de connexion réclame le mot de passe de l’opérateur, et le rend quand on renonce',
      identifiant.fenetre === true
      && identifiant.cacheDAbord === true
      && identifiant.demandeSiChange === true && identifiant.repartSiRemise === true
      && identifiant.ferme === true
      && JSON.stringify(comptesApresForme) === JSON.stringify(comptesRendus),
      JSON.stringify(identifiant));

    // ── La chaîne d'audit, vérifiée depuis son écran ──
    //
    // Le journal est chaîné en SHA-256 ; l'écran offre un bouton qui le fait dire.
    // Toutes les écritures des rondes précédentes y sont passées : si la chaîne
    // était rompue, elle le serait par l'une d'elles.
    const chaine = await page.evaluate(async () => {
      document.querySelector('.portal-nav-btn[data-view="audit"]').click();
      await new Promise((r) => setTimeout(r, 1500));
      const b = document.getElementById('verifyBtn');
      if (!b) return { bouton: false };
      b.click();
      await new Promise((r) => setTimeout(r, 1500));
      const m = document.querySelector('.oasis-toast-message');
      const fond = document.querySelector('.oasis-toast-fond');
      return {
        bouton: true,
        message: m ? m.textContent.trim() : null,
        genre: fond ? fond.className : null,
      };
    });
    verifier('la chaîne du journal d’audit se vérifie depuis son écran, après toutes ces écritures',
      chaine.bouton === true && !!chaine.message
      // Le genre du bandeau est « succes » — sans double « s » : c'est le mot
      // français. Mon premier motif cherchait « success » et rendait rouge un
      // journal intègre.
      && /succes/.test(chaine.genre || '') && /intègre/.test(chaine.message)
      && !/#/.test(chaine.message),
      JSON.stringify(chaine));

    // ── Les droits d'un compte, et sa fiche : les deux écritures les plus lourdes ──
    //
    // `saveUserModules` **donne ou retire l'accès d'un compte à un module** ;
    // `submitEditUser` modifie sa fiche. Ce sont les deux gestes du portail dont
    // une régression silencieuse coûterait le plus — un agent qui perd l'accès à
    // son module, ou dont le nom change sans qu'il l'ait demandé.
    //
    // Les deux rondes sont **réversibles** : on bascule, on vérifie, on rétablit,
    // on vérifie encore. Le second constat est celui qui vaut — une écriture qui
    // marche dans un sens et pas dans l'autre est à moitié éprouvée.
    //
    // Le compte visé est `admin@anac.bj`, **non celui qui est connecté** : se
    // modifier soi-même romprait la session, et tout ce qui suit.
    etape = 'droits et fiche d’un compte';
    await ouvrir('users');
    await page.evaluate(() => {
      const o = [...document.querySelectorAll('[onclick^="setUserTab"]')]
        .find((b) => (b.getAttribute('onclick') || '').includes("'ADMIN'"));
      if (o) o.click();
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-modules="admin@anac.bj"]').length > 0,
      { timeout: 10000 },
    ).catch(() => { /* le contrôle le dira */ });

    const accesModules = await page.evaluate(async () => {
      const compte = 'admin@anac.bj';
      const pastille = () => {
        const b = document.querySelector(`[data-modules="${compte}"]`);
        return b ? b.textContent.replace(/\s+/g, '') : null;
      };
      // ── On rebascule **le même** module, non « le premier non coché » ──
      //
      // Première écriture : la fonction prenait le premier module décoché à
      // chaque appel. Le second appel en trouvait donc un **autre** — RAMP
      // accordé, puis CARE accordé — et la pastille passait de 2/11 à 3/11 à
      // 4/11. Le contrôle a dit « rendu: 4/11 » là où il attendait 2/11 : il a
      // dénoncé ma ronde, qui n'en était pas une.
      //
      // Le module visé est donc nommé au premier passage et redonné au second.
      const basculerUn = async (voulu) => {
        document.querySelector(`[data-modules="${compte}"]`).click();
        await new Promise((r) => setTimeout(r, 600));
        const cases = [...document.querySelectorAll('#userModalRoot [data-mod]')];
        if (!cases.length) return { cases: 0 };
        const cible = voulu
          ? cases.find((c) => c.dataset.mod === voulu)
          : (cases.find((c) => !c.checked) || cases[0]);
        if (!cible) return { cases: cases.length, cible: false };
        const module = cible.dataset.mod;
        cible.checked = !cible.checked;
        const enregistrer = document.querySelector('#userModalRoot [onclick^="saveUserModules"]');
        if (!enregistrer) return { cases: cases.length, bouton: false };
        enregistrer.click();
        await new Promise((r) => setTimeout(r, 2000));
        return { cases: cases.length, bouton: true, module };
      };
      const avant = pastille();
      const premier = await basculerUn();
      const apres = pastille();
      const second = await basculerUn(premier.module);
      const rendu = pastille();
      return { avant, apres, rendu, premier, second };
    });
    verifier('l’accès d’un compte à un module se donne, et se retire',
      accesModules.premier && accesModules.premier.bouton
      && accesModules.avant && accesModules.apres && accesModules.avant !== accesModules.apres
      && accesModules.rendu === accesModules.avant,
      JSON.stringify(accesModules));

    const fiche = await page.evaluate(async () => {
      const compte = 'admin@anac.bj';
      const ligne = () => {
        const b = document.querySelector(`[data-edit="${compte}"]`);
        return b ? b.closest('tr').textContent.replace(/\s+/g, ' ').trim() : null;
      };
      const ecrire = async (prenom) => {
        document.querySelector(`[data-edit="${compte}"]`).click();
        await new Promise((r) => setTimeout(r, 600));
        const champ = document.getElementById('euPrenom');
        if (!champ) return { champ: false };
        const lu = champ.value;
        champ.value = prenom;
        const envoyer = document.querySelector('#userModalRoot [onclick^="submitEditUser"]');
        if (!envoyer) return { champ: true, bouton: false };
        envoyer.click();
        await new Promise((r) => setTimeout(r, 2000));
        return { champ: true, bouton: true, lu };
      };
      const avant = ligne();
      const premier = await ecrire('Essai-Prenom');
      const apres = ligne();
      // On rétablit la valeur que la fenêtre portait, non une valeur devinée.
      const second = await ecrire(premier.lu);
      const rendu = ligne();
      return { avant, apres, rendu, luDAbord: premier.lu, bouton: premier.bouton };
    });
    verifier('la fiche d’un compte se modifie, et la modification se défait',
      fiche.bouton
      && typeof fiche.luDAbord === 'string'
      && fiche.apres && fiche.apres.includes('Essai-Prenom')
      && fiche.rendu === fiche.avant,
      JSON.stringify(fiche));





    // ── La pastille des notifications, éprouvée sur un état fabriqué ──
    //
    // Deux écritures fausses avant celle-ci, et elles disent la même chose :
    //
    //   1. « elle s'affiche et porte un nombre ». Le jeu d'essai porte
    //      quatre-vingt-quatorze notifications, et j'en avais déduit que le compte
    //      en verrait. **Mesuré : l'API en rend zéro pour lui** — elles sont
    //      rangées par instance, et aucune ne lui est destinée. La pastille disait
    //      vrai, et c'est le contrôle qui avait tort ;
    //   2. « elle s'accorde au compte rendu par l'API ». Vrai, et **vide de
    //      sens** : avec zéro notification, la pastille porte « 0 » qu'on l'écrive
    //      ou non. Ôter la ligne qui l'écrit laissait le contrôle vert.
    //
    // On **fabrique** donc l'état que le jeu ne donne pas : trois notifications
    // rendues par un `fetch` substitué, puis `refreshNotifications()` appelée, et
    // l'on regarde la pastille. C'est la fonction qu'on éprouve, non le geste —
    // celui-ci (`notifBell`) est déclaré non couvert ailleurs —, mais son effet est
    // bien celui qu'un agent voit.
    etape = 'pastille des notifications';
    const pastille = await page.evaluate(async () => {
      const vrai = window.fetch;
      window.fetch = (entree, options) => {
        if (String(entree).includes('/api/notifications')) {
          return Promise.resolve(new Response(JSON.stringify([
            { id: 101, message: 'un', ts: '2026-10-08T10:00:00.000Z' },
            { id: 102, message: 'deux', ts: '2026-10-08T10:01:00.000Z' },
            { id: 103, message: 'trois', ts: '2026-10-08T10:02:00.000Z' },
          ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return vrai(entree, options);
      };
      const lu = window.NOTIF_LAST_SEEN;
      window.NOTIF_LAST_SEEN = 0;
      try {
        await window.refreshNotifications();
        const p = document.getElementById('notifBadge');
        return p ? { texte: p.textContent, affichee: p.style.display === 'flex' } : { absente: true };
      } finally {
        window.fetch = vrai;
        window.NOTIF_LAST_SEEN = lu;
        await window.refreshNotifications();
      }
    });
    verifier('la pastille des notifications porte le nombre non vu',
      !pastille.absente && pastille.texte === '3' && pastille.affichee,
      JSON.stringify(pastille));

    // ── Les six bascules d'affichage, chacune dans les deux sens ──
    //
    // Aucune n'écrit. Ce qui les rend néanmoins dignes d'un contrôle est la leçon
    // de trois séances : **une bascule qui s'allume sans s'éteindre passe un
    // contrôle unilatéral**. Le survol du glisser-déposer (5.c.11) et la
    // présentation de l'organigramme (5.c.11) l'ont montré tous les deux, et dans
    // les deux cas la moitié manquante était celle qui défait.
    //
    // Chacune est donc mesurée **trois fois** : l'état de départ, l'état après le
    // premier geste, l'état après le second. Un contrôle qui ne lirait que le
    // deuxième ne distinguerait pas « la bascule agit » de « elle était déjà là ».
    etape = 'bascules d’affichage';

    // Une bascule générique : un sélecteur de bouton, un sélecteur d'état, et le
    // **mode** de lecture de cet état. Écrite une fois plutôt que six.
    //
    // Le mode est un mot, non une expression : la page porte une politique de
    // contenu sans `unsafe-eval` — que cette suite éprouve elle-même —, et un
    // `new Function` y serait refusé. Le contrôle aurait alors échoué pour une
    // raison qui n'a rien à voir avec ce qu'il mesure.
    const vaEtVient = (bouton, cible, mode) => page.evaluate(async (b, c, m) => {
      const lire = () => {
        const el = document.querySelector(c);
        if (!el) return null;
        if (m.startsWith('classe:')) return el.classList.contains(m.slice(7));
        if (m === 'affiche') return el.style.display !== 'none';
        if (m === 'bloc') return el.style.display === 'block';
        return null;
      };
      const presser = async () => {
        const el = document.querySelector(b);
        if (!el) return false;
        el.click();
        await new Promise((r) => setTimeout(r, 900));
        return true;
      };
      const depart = lire();
      if (depart === null) return { cible: false };
      if (!await presser()) return { cible: true, bouton: false };
      const apres = lire();
      if (!await presser()) return { cible: true, bouton: true, apres, second: false };
      return { cible: true, bouton: true, depart, apres, rendu: lire(), second: true };
    }, bouton, cible, mode);

    const basculeVaEtVient = (nom, r) => {
      verifier(nom,
        r.cible === true && r.bouton === true && r.second === true
        // Le geste change l'état…
        && r.apres !== r.depart
        // …et le refaire le rend. Sans cette moitié, une bascule qui ne se défait
        // jamais passerait.
        && r.rendu === r.depart,
        JSON.stringify(r));
    };

    // 1. La barre de la configuration.
    await allerSousVue('domaines');
    basculeVaEtVient('la barre de la configuration se replie et se déplie',
      await vaEtVient('[onclick="toggleCfgSidebar()"]', '.cfg-sidebar',
        'classe:collapsed'));

    // 2. Un accordéon de la taxinomie — le geste de l'en-tête, non celui du
    //    bandeau d'exigences : deux fonctions différentes pour un même aspect.
    basculeVaEtVient('un accordéon de la taxinomie s’ouvre et se referme',
      await vaEtVient('.cfg-acc-item .cfg-acc-header', '.cfg-acc-item',
        'classe:open'));

    // 3. Le dépli d'une fiche de personnel : ce n'est pas une classe mais une
    //    **ligne de table** qui paraît. Le contrôle lit donc son affichage.
    await allerSousVue('inspecteurs');
    basculeVaEtVient('le détail d’une fiche de personnel se déplie et se replie',
      await vaEtVient('.pers-toggle', '.pers-detail-row',
        'affiche'));

    // 4. Les champs réservés aux inspecteurs, commandés par un **sélecteur**.
    //
    //    Celui-ci n'est pas un clic : c'est un `change`. Et il ne se mesure pas
    //    sur une classe mais sur l'affichage des champs qu'il commande — lesquels
    //    décident si l'on peut saisir un numéro d'inspecteur et des domaines.
    const champsInspecteur = await page.evaluate(async () => {
      const ajouter = document.querySelector('[onclick="openRefModal(\'inspecteurs\')"]');
      if (!ajouter) return { bouton: false };
      ajouter.click();
      await new Promise((r) => setTimeout(r, 700));
      const sel = document.querySelector('#cfgModalRoot [data-field="est_inspecteur"]');
      const champs = () => [...document.querySelectorAll('#cfgModalRoot .insp-only')];
      if (!sel || !champs().length) return { bouton: true, fenetre: false };
      const visibles = () => champs().filter((el) => el.style.display !== 'none').length;
      const total = champs().length;
      const depart = visibles();
      const poser = async (v) => {
        sel.value = v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 300));
        return visibles();
      };
      const avecOui = await poser('oui');
      const avecNon = await poser('non');
      const fermer = document.querySelector('#cfgModalRoot [onclick="closeRefModal()"]');
      if (fermer) fermer.click();
      await new Promise((r) => setTimeout(r, 400));
      return { bouton: true, fenetre: true, total, depart, avecOui, avecNon };
    });
    verifier('le sélecteur « Inspecteur ? » montre et cache les champs qui lui sont propres',
      champsInspecteur.fenetre === true
      && champsInspecteur.total > 0
      // Une fiche neuve s'ouvre sur « non » : les champs sont donc cachés.
      && champsInspecteur.depart === 0
      && champsInspecteur.avecOui === champsInspecteur.total
      && champsInspecteur.avecNon === 0,
      JSON.stringify(champsInspecteur));

    // 5. La barre des utilisateurs — même aspect, autre écran, autre fonction.
    await page.evaluate(() => document.querySelector('.portal-nav-btn[data-view="users"]').click());
    await new Promise((r) => setTimeout(r, 900));
    basculeVaEtVient('la barre des utilisateurs se replie et se déplie',
      await vaEtVient('[onclick="toggleUserSidebar()"]', '.cfg-sidebar',
        'classe:collapsed'));

    // 6. Le panneau des notifications.
    //
    //    Son écouteur est lui-même une bascule — un second clic le referme. Il est
    //    pressé **ici**, après le contrôle de la pastille : l'ouvrir marque les
    //    notifications comme vues, et la pastille serait alors mesurée sur un état
    //    que ce geste vient de changer.
    basculeVaEtVient('le panneau des notifications s’ouvre et se referme par la cloche',
      await vaEtVient('#notifBell', '#notifPanel',
        'bloc'));

    // ── Le mode dégradé (TDR §F.2 ; fiche technique §2, contrainte n° 3) ──
    //
    // C'est le seul endroit de la suite où l'on peut couper le réseau pour de
    // vrai : Puppeteer le fait, et rien d'autre ici ne le peut. Sans cette
    // épreuve, le hors-ligne serait une intention.
    etape = 'hors-ligne';
    // Cet onglet n'est pas surveillé, et c'est voulu : on y coupe le réseau
    // exprès, donc les requêtes y échouent exprès. Les compter au verdict
    // ferait échouer la suite sur ce qu'elle vient d'éprouver.
    const ramp = await ouvrirPage();
    await ramp.goto(`${srv.base}/modules/ramp/index.html`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    const socle = await ramp.evaluate(async () => ({
      horsLigne: typeof window.oasisHorsLigne === 'object',
      manifeste: !!document.querySelector('link[rel="manifest"]'),
      sw: 'serviceWorker' in navigator
        && !!(await navigator.serviceWorker.getRegistration()),
    }));
    verifier('RAMP embarque le socle du mode dégradé',
      socle.horsLigne && socle.manifeste && socle.sw, JSON.stringify(socle));

    // La liste d'autorisation : la saisie se diffère, l'acte d'autorité non.
    const admis = await ramp.evaluate(() => {
      const d = (m, u) => !!window.oasisHorsLigne.differable(m, u);
      return {
        fiche: d('POST', '/api/m/ramp/poi'),
        brouillon: d('PUT', '/api/m/ramp/poi/abc'),
        dossier: d('PUT', '/api/m/execution/dossiers/abc'),
        constatation: d('POST', '/api/m/execution/constatations'),
        valider: d('POST', '/api/m/ramp/poi/abc/valider'),
        transmettre: d('POST', '/api/m/ramp/poi/abc/transmettre'),
        soumettreDossier: d('PUT', '/api/m/execution/dossiers/abc/submit'),
        cloturer: d('PUT', '/api/m/execution/constatations/abc/close'),
        effacerCompte: d('DELETE', '/api/users/qui@que.bj'),
      };
    });
    verifier('la saisie de terrain est différable, dans les deux modules',
      admis.fiche && admis.brouillon && admis.dossier && admis.constatation,
      JSON.stringify(admis));
    // Les bornes des motifs comptent : « /submit » et « /close » partagent le
    // préfixe de la saisie, et ce sont des actes.
    verifier('un acte d’autorité ne se diffère pas',
      !admis.valider && !admis.transmettre && !admis.soumettreDossier
      && !admis.cloturer && !admis.effacerCompte, JSON.stringify(admis));

    // Réseau coupé, pour de bon.
    await ramp.setOfflineMode(true);
    const horsReseau = await ramp.evaluate(async () => {
      const r = await fetch('/api/m/ramp/poi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essai: 'saisie sur l’aire de trafic' }),
      });
      const corps = await r.json().catch(() => ({}));
      const file = await window.oasisHorsLigne.file();
      return { statut: r.statut || r.status, differe: !!corps.differe, enFile: file.length };
    });
    verifier('hors réseau, la saisie est retenue plutôt que perdue',
      horsReseau.statut === 202 && horsReseau.differe && horsReseau.enFile === 1,
      JSON.stringify(horsReseau));

    // Un acte d'autorité, lui, doit échouer franchement.
    const refus = await ramp.evaluate(async () => {
      try {
        await fetch('/api/m/ramp/poi/abc/valider', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        return 'passé';
      } catch (e) { return 'refusé'; }
    });
    verifier('hors réseau, un acte d’autorité échoue franchement',
      refus === 'refusé', refus);

    // Et l'agent le voit : le bandeau est là, et il dit ce qui attend.
    const bandeau = await ramp.evaluate(() => {
      const b = document.querySelector('.oasis-hl-bandeau');
      return b ? { texte: b.textContent, horsLigne: b.classList.contains('hors-ligne') } : null;
    });
    verifier('le bandeau annonce le hors-ligne et ce qui attend',
      bandeau && bandeau.horsLigne && /en attente/.test(bandeau.texte),
      JSON.stringify(bandeau));

    // Un écran déjà vu se recharge sans réseau : c'est ce que seul le service
    // worker peut donner, et c'est la raison d'être de la contrainte n° 3.
    await ramp.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    const debout = await ramp.evaluate(() => ({
      titre: document.title,
      corps: document.body.textContent.trim().length,
    }));
    verifier('hors réseau, un écran déjà vu se recharge',
      /OASIS/.test(debout.titre) && debout.corps > 100, JSON.stringify(debout));

    // Le réseau revient : la file part toute seule, et se vide.
    await ramp.setOfflineMode(false);
    await ramp.evaluate(() => window.oasisHorsLigne.rejouer());
    const apresRetour = await ramp.evaluate(async () => {
      for (let i = 0; i < 40; i += 1) {
        const f = await window.oasisHorsLigne.file();
        if (!f.length) return { reste: 0 };
        if (f.every((e) => e.echec)) return { reste: f.length, echecs: f.map((e) => e.statut) };
        await new Promise((r) => { setTimeout(r, 50); });
      }
      return { reste: (await window.oasisHorsLigne.file()).length };
    });
    // Le serveur refusera cette saisie d'essai — elle n'a pas la forme d'une
    // fiche. Ce qui est éprouvé ici, c'est que le rejeu a bien eu lieu et que
    // le refus est **gardé** au lieu d'être jeté : perdre une saisie de terrain
    // en silence serait le pire défaut possible.
    verifier('au retour du réseau, la file est rejouée et un refus est gardé',
      apresRetour.reste === 0
      || (Array.isArray(apresRetour.echecs) && apresRetour.echecs.every((s) => s >= 400)),
      JSON.stringify(apresRetour));
    await ramp.close();

    // ── La page des témoins, et son unique geste (ADR-003, 5.c) ──
    //
    // Convertie en TypeScript le 7 octobre 2026. Elle n'a qu'un geste —
    // « Effacer mes préférences sur cet appareil » — et il était **déclaré non
    // couvert**. Le convertir est le moment de le couvrir : c'est le seul endroit
    // de l'application où un agent efface quelque chose sans qu'un serveur soit
    // en cause, et il n'a pas d'effet de bord sur les autres contrôles — le
    // navigateur de cette page lui est propre.
    //
    // Trois choses sont éprouvées, et la troisième est celle qui compte :
    //   · la durée de session **vient du serveur**, et non d'un nombre en dur ;
    //   · le geste efface bien les préférences rangées ;
    //   · il **ne touche pas** au témoin de session. Effacer ses préférences n'est
    //     pas se déconnecter, et confondre les deux déconnecterait un agent qui
    //     voulait seulement remettre son thème à zéro.
    etape = 'page des témoins';
    // `ouvrirPage` et non `newPage` : c'est elle qui pose le mouchard des gestes.
    // Écrit `newPage` la première fois, le geste d'effacement était **couvert et
    // absent du relevé** — un contrôle qui mord, et un rapport qui l'ignore.
    const temoins = await ouvrirPage();
    // ── « Venue du serveur » se mesure à la requête, non au nombre ──
    //
    // Première écriture : le contrôle lisait la durée affichée et vérifiait
    // qu'elle porte un chiffre. Or le secours du code **est** 30, et la
    // configuration d'essai dit **30** aussi : couper la requête laissait le
    // contrôle vert sur un nombre écrit en dur. Mesuré en coupant l'appel.
    //
    // On observe donc l'appel lui-même. C'est ce que l'affirmation veut dire, et
    // c'est la seule chose qui distingue les deux cas quand les deux valeurs
    // coïncident — ce qui est le cas le plus probable, puisque le secours a été
    // choisi pour ressembler à la configuration.
    const appels = [];
    temoins.on('request', (r) => appels.push(r.url()));
    try {
      await temoins.goto(`${srv.base}/cookies.html`, { waitUntil: 'networkidle2' });
      const avant = await temoins.evaluate(() => {
        // Des préférences à effacer, et un témoin qui ne doit pas l'être.
        localStorage.setItem('pr_theme', 'corporate');
        localStorage.setItem('ramp_filtre_essai', '1');
        localStorage.setItem('garde_essai', 'reste');
        return {
          duree: (document.getElementById('dureeSession') || {}).textContent || '',
          clefs: Object.keys(localStorage).length,
        };
      });
      const demandee = appels.some((u) => u.includes('/api/politique-session'));
      verifier('la page des témoins demande la durée de session au serveur et l’affiche',
        demandee && /\d/.test(avant.duree) && !/\{0\}/.test(avant.duree),
        `demandée: ${demandee} · affichée: ${JSON.stringify(avant.duree)}`);

      // `alert()` arrête une page sans navigateur devant : on l'accepte.
      temoins.on('dialog', (d) => { void d.accept(); });
      const apres = await temoins.evaluate(async () => {
        const b = document.getElementById('effacer');
        if (!b) return { bouton: false };
        b.click();
        await new Promise((r) => setTimeout(r, 400));
        return {
          bouton: true,
          theme: localStorage.getItem('pr_theme'),
          rampParti: localStorage.getItem('ramp_filtre_essai') === null,
          gardeReste: localStorage.getItem('garde_essai') === 'reste',
          lang: document.documentElement.lang,
        };
      });
      verifier('le geste d’effacement retire les préférences et épargne le reste',
        apres.bouton && apres.theme === null && apres.rampParti && apres.gardeReste,
        JSON.stringify(apres));
      const session = await temoins.evaluate(async () => {
        const r = await fetch('/api/politique-session', { credentials: 'same-origin' });
        return r.status;
      });
      verifier('effacer ses préférences ne déconnecte pas',
        session === 200, `/api/politique-session → ${session}`);
    } finally {
      await temoins.close();
    }

    // ── Le départ de session : le dernier geste de la suite, et il faut qu'il le soit ──
    //
    // `logoutBtn` ferme la session. Pressé n'importe où ailleurs, il ferait
    // échouer tout ce qui suit — c'est la raison que portait sa dispense depuis
    // trois jours : « à couvrir en dernier geste de la suite ». Il l'est.
    //
    // Deux choses sont mesurées, et la seconde est celle qui compte : la fenêtre
    // **entière** part vers la page de connexion — non un panneau, non un cadre —,
    // et la session est **réellement** close côté serveur. Une redirection sans
    // fermeture laisserait un cookie valide derrière une page d'apparence
    // déconnectée.
    etape = 'départ de session';
    const departSession = await page.evaluate(() => !!document.getElementById('logoutBtn'));
    if (departSession) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
        page.evaluate(() => document.getElementById('logoutBtn').click()),
      ]);
    }
    const apresDepart = await page.evaluate(async () => {
      const r = await fetch('/api/me', { credentials: 'same-origin' });
      return { url: window.location.pathname, formulaire: !!document.getElementById('loginForm'), statut: r.status };
    });
    verifier('le départ de session renvoie la fenêtre entière à la connexion, et la session est close',
      departSession === true
      && apresDepart.url === '/login.html' && apresDepart.formulaire === true
      // 401 : le cookie ne vaut plus rien. Sans cette moitié, une redirection
      // cosmétique passerait, et la session resterait ouverte derrière.
      && apresDepart.statut === 401,
      JSON.stringify({ departSession, ...apresDepart }));

    // ── Le verdict ──
    // Tout ce qui précède peut passer avec une console pleine d'erreurs : ce
    // sont elles que cette suite existe pour voir.
    verifier('aucune erreur de console ni requête échouée sur le parcours',
      apresSession.length === 0, apresSession.slice(0, 4).join(' · '));
  } finally {
    // Le journal du mouchard, relevé sur **toutes** les pages encore ouvertes et
    // avant de fermer le navigateur : une page fermée n'a plus de `window`, et
    // un relevé fait après la fermeture rendrait zéro geste — c'est-à-dire la
    // mesure de rien, présentée comme une couverture nulle.
    if (process.env.OASIS_MOUCHARD && navigateur) {
      // Le registre durable est dans `localStorage`, partagé par toutes les
      // pages de l'origine : il survit à la fermeture de celles que la suite
      // ferme en route. Relevé en mémoire en plus, pour dire combien de pages
      // ont effectivement porté l'instrumentation.
      const vu = { enLigne: [], ecouteurs: [], propriete: [], poses: 0, pages: 0 };
      for (const p of await navigateur.pages()) {
        try {
          const j = await p.evaluate(() => {
            const d = JSON.parse(localStorage.getItem('__oasis_gestes') || 'null');
            return { durable: d, vivante: !!window.__gestes, poses: window.__gestes ? window.__gestes.poses : 0 };
          });
          if (j.vivante) { vu.pages += 1; vu.poses += j.poses; }
          if (j.durable && !vu.enLigne.length) {
            vu.enLigne.push(...j.durable.enLigne);
            vu.ecouteurs.push(...j.durable.ecouteurs);
            vu.propriete.push(...(j.durable.propriete || []));
          }
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    srv.arreter();
  }
  return bilan('Parcours');
};
