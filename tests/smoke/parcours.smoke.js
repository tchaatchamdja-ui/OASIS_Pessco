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
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// Ce qu'on ne veut pas voir dans une console. Deux exceptions, et deux
// seulement : les 401 d'un écran ouvert avant la session, et le refus du
// script que cette suite insère elle-même pour éprouver la politique de
// contenu — c'est le résultat attendu, non un incident.
const ATTENDU = /status of 401|Content Security Policy directive/;

// `ou` change en cours de route : le relevé est donc désigné par une fonction,
// et les écouteurs ne se posent qu'une fois.
function surveiller(page, ou, etape) {
  const noter = (l) => ou().push(`${etape()} — ${l}`);
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const texte = m.text();
    if (ATTENDU.test(texte)) return;
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
    const page = await navigateur.newPage();
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

    // ── Le verdict ──
    // Tout ce qui précède peut passer avec une console pleine d'erreurs : ce
    // sont elles que cette suite existe pour voir.
    verifier('aucune erreur de console ni requête échouée sur le parcours',
      apresSession.length === 0, apresSession.slice(0, 4).join(' · '));
  } finally {
    if (navigateur) await navigateur.close();
    srv.arreter();
  }
  return bilan('Parcours');
};
