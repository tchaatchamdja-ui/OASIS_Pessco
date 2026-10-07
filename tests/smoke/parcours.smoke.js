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
    verifier('la bascule de langue traduit les menus du portail',
      langues.avant.menu.trim() !== langues.apres.menu.trim()
      && langues.avant.menu.trim() === langues.retour.menu.trim(),
      `« ${langues.avant.menu.trim()} » → « ${langues.apres.menu.trim()} »`);

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
