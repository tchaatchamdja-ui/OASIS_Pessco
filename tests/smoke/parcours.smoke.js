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
      await page.evaluate((x) => window.cfgNavigate(x), sous);
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
    const distinctes = new Set(empreintes.values()).size;
    verifier('les sous-vues de la configuration diffèrent les unes des autres',
      distinctes >= sousVues.length - 1,
      `${distinctes} empreinte(s) distincte(s) pour ${sousVues.length} sous-vues`);
    verifier('aucune sous-vue de la configuration ne déborde à droite',
      sousVuesDebordantes.length === 0, sousVuesDebordantes.join(' · '));

    // La bascule de langue agit sur la coquille du portail, et sur l'attribut
    // `lang` du document — celui qui commande la prononciation d'un lecteur
    // d'écran. Les six modules le laissaient figé à « fr » ; le portail, non.
    etape = 'bascule de langue';
    const langues = await page.evaluate(async () => {
      const lu = () => ({
        lang: document.documentElement.lang,
        menu: (document.querySelector('.portal-nav-btn[data-view="users"]') || {}).textContent || '',
      });
      const avant = lu();
      window.applyLang('en');
      await new Promise((r) => setTimeout(r, 300));
      const apres = lu();
      window.applyLang('fr');
      await new Promise((r) => setTimeout(r, 300));
      return { avant, apres, retour: lu() };
    });
    verifier('la bascule de langue change l’attribut « lang » du document',
      langues.avant.lang === 'fr' && langues.apres.lang === 'en' && langues.retour.lang === 'fr',
      `${langues.avant.lang} → ${langues.apres.lang} → ${langues.retour.lang}`);
    verifier('la bascule de langue traduit les menus du portail',
      langues.avant.menu.trim() !== langues.apres.menu.trim()
      && langues.avant.menu.trim() === langues.retour.menu.trim(),
      `« ${langues.avant.menu.trim()} » → « ${langues.apres.menu.trim()} »`);

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
    const ecranDroits = await navigateur.newPage();
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

    // ── Le mode dégradé (TDR §F.2 ; fiche technique §2, contrainte n° 3) ──
    //
    // C'est le seul endroit de la suite où l'on peut couper le réseau pour de
    // vrai : Puppeteer le fait, et rien d'autre ici ne le peut. Sans cette
    // épreuve, le hors-ligne serait une intention.
    etape = 'hors-ligne';
    // Cet onglet n'est pas surveillé, et c'est voulu : on y coupe le réseau
    // exprès, donc les requêtes y échouent exprès. Les compter au verdict
    // ferait échouer la suite sur ce qu'elle vient d'éprouver.
    const ramp = await navigateur.newPage();
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
