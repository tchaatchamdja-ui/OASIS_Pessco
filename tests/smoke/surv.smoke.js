// SURV dans un navigateur — la suite n° 0.b de l'écran « Exécution de la
// Surveillance » (ADR-003, 5.f.1).
//
// ── Pourquoi une suite à part, et non des contrôles de plus dans « parcours » ──
//
// `parcours.smoke.js` porte 3 200 lignes et 110 contrôles, tous sur le portail et
// les deux pages qui l'entourent. Y ajouter un second écran ferait un fichier que
// personne ne lirait, et le garde-fou de taille le refuserait à bon droit.
//
// Un écran, une suite. C'est aussi ce qui permet au relevé des gestes de **lancer
// la suite de l'écran qu'il mesure** : `scripts/relever-gestes.js` lit le nom de
// la suite dans la table des écrans, et l'instrumentation voyage avec elle.
//
// ── Ce que cette suite éprouve, et ce qu'elle n'éprouve pas encore ──
//
// Elle monte l'écran, parcourt ses sept pages **par de vrais clics**, et vérifie
// que chacune se remplit, qu'elles diffèrent, qu'aucune ne déborde, et que la
// console reste muette.
//
// Elle n'exerce **aucune écriture**. C'est délibéré, et c'est la méthode qui a
// porté le portail de 14 gestes couverts à 66 : on ouvre d'abord l'écran, on
// mesure ce que cela couvre, puis on ajoute les rondes d'écriture une par une —
// chacune avec l'assertion du résultat **en base** et le retour en arrière. Un
// contrôle d'écriture qui laisse le bac dans un état que le suivant hérite est
// pire que pas de contrôle.
//
// ── La mesure qui a précédé l'écriture de ce fichier ──
//
// Les sept pages ont été ouvertes à la main avant qu'une assertion soit écrite :
// contenu de 759 à 3 873 caractères, aucun débordement, **aucun incident de
// console**. Les seuils ci-dessous viennent de là, et non d'une supposition.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan, abandonsAttendus } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const SOURCE_NAV = path.join(RACINE, 'public', 'modules', 'execution', 'js', 'exec-app.js');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// ── Les pages que l'aiguillage sait rendre, et celles qu'un menu offre ──
//
// Mesuré le 14 octobre 2026, en cherchant par où atteindre l'écran des activités
// (`exec-activites.js`, 69 occurrences, le fichier le plus chargé de SURV) :
// l'aiguillage de `execRenderPage` porte **treize** cas, les deux tables de
// navigation en offrent **neuf**, et **quatre pages ne sont atteignables par
// rien** — ni par un menu, ni par un appel de `execNavigateTo`, ni par une
// ancre d'URL.
//
// Ce n'est pas un détail de dénominateur : c'est une question de maîtrise
// d'ouvrage. Une page que l'aiguillage sait rendre et qu'aucun chemin n'ouvre est
// soit un écran oublié d'un menu, soit du code mort. Les deux se corrigent, mais
// pas de la même façon, et ce n'est pas à la conversion d'en décider.
//
// Le contrôle refuse donc une page **non déclarée**. La déclaration est dans
// `PAGES_SANS_CHEMIN` ci-dessous, avec ce que la mesure dit de chacune.
//
// *Les quatre ont été tranchées.* Trois ont été rendues à la barre, la
// quatrième effacée, et la table est vide depuis le 8 novembre 2026 — l'état
// que le garde décrit juste en dessous. Le paragraphe ci-dessus est conservé
// parce qu'il dit ce que le garde fait, non où en est le dépôt.
// ── Mesuré le 8 novembre 2026 : plus aucune page de SURV n'est sans chemin ──
//
// La table est **vide**, et c'est une mesure, non un vœu : le contrôle refuse
// une page sans chemin qui ne serait pas déclarée ici, et refuse aussi une
// déclaration qui ne correspondrait plus. Vide, elle dit donc que les treize
// cas de l'aiguillage sont tous ouverts par un menu ou par un appel.
//
// Elle a porté quatre pages, et les quatre ont été tranchées par la maîtrise
// d'ouvrage une fois la mesure faite — c'est l'office de ce garde, qui nomme
// sans décider :
//
//   · `declenchement` — 1 125 lignes, 26 gestes, le circuit de la notification
//     d'activité. **Rendue à la barre** le 7 novembre 2026 (n° 5.f.72),
//     réservée à qui contribue.
//   · `execution` — le tableau des dossiers et ses quatre filtres, dont le seul
//     geste propre est la **suppression** d'un dossier. **Rendue à la barre**
//     le 8 novembre 2026 (n° 5.f.73), après que cette suppression a reçu la
//     garde de la référence saisie, qu'elle n'avait pas et que son équivalente
//     du menu « États » avait déjà.
//   · `prestataires` — le suivi des dossiers par organisme et par domaine, dont
//     le geste propre est l'**archivage** d'un dossier clos. **Rendue à la
//     barre** le 8 novembre 2026, après correction de cet archivage : il
//     écrasait le statut réel du dossier au lieu de poser le drapeau `archive`,
//     et n'écrivait ni date ni auteur.
//   · `prestataire_home` — 148 caractères et **zéro geste**. **Supprimée** le
//     8 novembre 2026 : seule des quatre à ne porter aucune capacité.
//
// *Deux des trois pages rendues portaient un défaut que leur inaccessibilité
// seule empêchait de nuire.* Ouvrir une porte, c'est répondre de ce qu'il y a
// derrière.
const PAGES_SANS_CHEMIN = {
};

// ── Les pages attendues se **lisent dans la source**, non dans une liste ──
//
// `EXEC_NAV` déclare les sept pages de l'écran. Une liste tenue ici aurait
// divergé au premier ajout, et le contrôle aurait alors mesuré sa propre liste —
// le défaut que ce dépôt a rencontré le plus souvent.
//
// On refuse si la table ne se lit pas : une table illisible et un écran sans
// pages se ressemblent, et seul le refus les distingue.
function pagesDeclarees() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const bloc = /const EXEC_NAV = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : EXEC_NAV introuvable dans public/modules/execution/js/exec-app.js —'
      + ' le contrôle ne sait plus quelles pages l’écran déclare.');
  }
  return [...bloc[1].matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1]);
}

// Les cas de l'aiguillage, et les clés des deux tables de navigation. Lus dans la
// source : une liste tenue ici aurait divergé, et le contrôle aurait mesuré sa
// propre liste.
function aiguillageEtMenus() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const rendues = [...texte.matchAll(/^\s*case '(\w+)': content = exec\w+\(\);/gm)].map((m) => m[1]);
  const menus = new Set();
  for (const nom of ['EXEC_NAV', 'EXEC_NAV_PRESTATAIRE']) {
    const bloc = new RegExp(`const ${nom} = \\{([\\s\\S]*?)\\n\\};`).exec(texte);
    if (!bloc) continue;
    for (const m of bloc[1].matchAll(/^\s{4}(\w+):\s*\{/gm)) menus.add(m[1]);
  }
  if (!rendues.length || !menus.size) {
    throw new Error('refus : l’aiguillage de execRenderPage ou les tables de navigation ne se'
      + ' lisent plus dans exec-app.js — le contrôle ne sait plus quelles pages existent.');
  }
  return { rendues, menus: [...menus] };
}

module.exports = async function survSmoke(port) {
  console.log('\n── SURV : l’écran « Exécution de la Surveillance » dans un navigateur ──');

  const srv = await demarrer({ port });
  let navigateur = null;
  const incidents = [];
  try {
    // ── Le délai de protocole, et une campagne rougie par la charge ──
    //
    // Le 20 octobre 2026, `planification-navigateur` a rendu
    // « Runtime.callFunctionOn timed out » au terme d'une campagne de huit
    // suites de navigateur — et la même suite, rejouée seule, a passé. Ce
    // n'était pas un défaut de l'écran : c'était le **délai de protocole par
    // défaut** de Puppeteer, atteint sous la charge.
    //
    // Un aléa qui fait rougir une campagne coûte autant qu'un vrai défaut :
    // il faut le lire, le rejouer, l'écarter. Le délai est donc posé — cinq
    // minutes, bien au-delà de toute évaluation que ces rondes demandent, et
    // bien en dessous d'un blocage réel, qui doit toujours finir par rendre.
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });
    // Le mouchard des gestes, posé seulement si `OASIS_MOUCHARD` l'est — même
    // règle que la suite « parcours », et pour la même raison : l'outil
    // instrumente la vraie suite au lieu d'en rejouer une imitation.
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: 1280, height: 900 });

    // La console est relevée **dès la première page**, et les incidents de la
    // connexion sont écartés : une erreur de la page de connexion passerait
    // sinon pour une erreur de SURV.
    let surv = false;
    let etape = 'montage';
    // Les refus déclarés (voir `REFUS_ATTENDUS` plus bas) laissent aussi une
    // trace en console : « Failed to load resource: … 409 », **sans l'adresse**
    // — c'est la cécité du message que 5.f.6 avait déjà relevée. On tient donc
    // le compte des refus déclarés rencontrés, et l'on dispense le message de
    // console qui porte **le même code**. Rien de plus large : un 409 non
    // déclaré garde son message, et un message dont le code n'a pas été déclaré
    // reste un incident.
    const codesAttendus = new Set();
    page.on('console', (m) => {
      if (!surv || m.type() !== 'error') return;
      const texte = m.text();
      const code = (/status of (\d{3})/.exec(texte) || [])[1];
      if (code && codesAttendus.has(Number(code))) return;
      incidents.push(`[${etape}] console : ${texte.slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (surv) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    // ── L'abandon que la réinitialisation d'un mot de passe provoque ──
    //
    // `execResetMesUserPw` pose `window.location.href = 'mailto:…'` pour que
    // l'administrateur transmette le nouveau mot de passe. Le navigateur mène
    // la fenêtre à l'adresse, n'a pas de protocole pour la servir, et
    // **abandonne la navigation** — `net::ERR_ABORTED`, sans code de réponse.
    //
    // Déclarer n'est pas taire : le contrôle d'`abandons` exige que l'abandon
    // soit venu. S'il cessait de venir — parce que le geste aurait cessé de
    // composer le courriel —, la déclaration deviendrait un filtre muet.
    const abandons = abandonsAttendus([
      {
        motif: /ERR_ABORTED/, chemin: /^mailto:/,
        pourquoi: 'la réinitialisation d’un mot de passe compose le courriel qui'
          + ' le transmet. Contrôle « le mot de passe réinitialisé est annoncé'
          + ' dans la langue du module, et le courriel composé » (n° 5.f.76).',
      },
    ]);
    page.on('requestfailed', (r) => {
      if (!surv) return;
      const chemin = r.url().replace(srv.base, '');
      const motif = String(((r.failure() || {}).errorText) || '');
      if (abandons.attendu(motif, chemin)) return;
      incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    // ── La réponse, et non le seul message de console ──
    //
    // Un 404 se présente en console comme « Failed to load resource », **sans
    // l'adresse**. Le premier passage de la ronde du dossier en a signalé un, et
    // il a fallu réinstrumenter pour savoir lequel. On relève donc la réponse :
    // son code et son adresse, ce qui rend l'incident actionnable au lieu
    // d'énigmatique.
    // ── Les refus que la ronde **provoque exprès** ──
    //
    // Certains contrôles éprouvent un refus : une notification envoyée qui
    // refuse d'être effacée (409), par exemple. Ce refus est la propriété
    // mesurée — le relever comme un incident ferait rougir le contrôle de la
    // console sur un comportement correct, et le premier passage l'a fait.
    //
    // Ils sont donc **déclarés**, un par un, avec leur code, leur adresse et
    // leur raison. Pas de filtre large : un 409 ailleurs reste un incident, et
    // une déclaration qui cesserait de correspondre cesserait de dispenser.
    const REFUS_ATTENDUS = [
      {
        code: 409, methode: 'DELETE', chemin: /\/notifications\/[\w-]+$/,
        pourquoi: 'une notification envoyée refuse d’être effacée : elle s’annule.'
          + ' Éprouvé par « une notification envoyée refuse d’être effacée, s’annule,'
          + ' et se retire alors » (n° 5.f.26).',
      },
      {
        code: 404, methode: 'GET', chemin: /\/notifications\/[\w-]+$/,
        pourquoi: 'la ronde relève l’**absence** d’une activité qu’elle vient de'
          + ' supprimer définitivement : le 404 est la preuve, non l’incident.'
          + ' Éprouvé par « la bonne référence l’emporte : le serveur ne connaît'
          + ' plus l’activité » (n° 5.f.30).',
      },
      {
        code: 403, methode: 'POST', chemin: /\/mes-utilisateurs\/[^/]+\/reveal-password$/,
        pourquoi: 'lire un mot de passe temporaire exige que le demandeur prouve'
          + ' son identité : la ronde présente d’abord un mauvais mot de passe,'
          + ' et le refus est la propriété mesurée. Éprouvé par « l’œil refuse'
          + ' un mauvais mot de passe » (n° 5.f.76).',
      },
    ];
    page.on('response', (r) => {
      if (!surv || r.status() < 400) return;
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
    surv = true;
    await page.goto(`${srv.base}/modules/execution/index.html`, { waitUntil: 'networkidle2' });
    // Le module monte sa coquille puis charge ses données : on attend la barre,
    // et non un délai fixe.
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.getElementById('exec-content');
        return el && el.textContent.trim().length > 200;
      },
      { timeout: 20000 },
    ).catch(() => { /* le contrôle qui suit le dira */ });

    const monte = await page.evaluate(() => ({
      pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page),
      contenu: (document.getElementById('exec-content') || { textContent: '' }).textContent.trim().length,
      attente: !!document.querySelector('[data-oasis-loader]'),
      retour: document.querySelectorAll('.oasis-back-btn').length,
    }));
    // ── Instrumentation de la chasse au second dossier (n° 5.f.26) ──
    //
    // ── La ronde part-elle d'un magasin vide ? ──
    //
    // Question d'apparence oiseuse, et qui a coûté un tour entier. La suite
    // rendait 80/87 sur un code qui avait rendu 87/87 la veille, et le commit
    // d'alors rougissait aussi : un second dossier apparaissait pendant la
    // ronde, d'identifiant **stable d'un passage à l'autre** quand celui de la
    // chaîne varie. Il n'était nulle part sur disque, et un bac neuf en portait
    // zéro. C'était un serveur orphelin de 7 h 51, resté d'un passage
    // interrompu sur le port de cette suite, que le harnais réutilisait en
    // silence — avec ses données. Le harnais le refuse désormais.
    //
    // Reste ce contrôle, qui vaut mieux que le relevé qui l'a trouvé : il dit
    // en une ligne que la ronde juge **ses** écritures, et non celles d'un
    // autre. S'il rougit, ce n'est pas la ronde qu'il faut lire.
    const auMontage = await page.evaluate(async (api) => {
      try {
        return (await (await fetch(`${api}/dossiers`, { credentials: 'same-origin' })).json())
          .map((d) => d.id);
      } catch { return ['(illisible)']; }
    }, '/api/m/execution');
    verifier('la ronde part d’un magasin vide — aucun dossier d’un autre passage',
      Array.isArray(auMontage) && auMontage.length === 0,
      `${auMontage.length} dossier(s) au montage : ${JSON.stringify(auMontage).slice(0, 160)}`);

    verifier('l’écran SURV se monte, avec sa barre et son contenu',
      monte.pages.length > 0 && monte.contenu > 200 && !monte.attente,
      JSON.stringify(monte));

    // ── La barre porte ce que la source déclare ──
    let declarees = [];
    let refus = null;
    try { declarees = pagesDeclarees(); } catch (e) { refus = e.message; }
    const manquantes = declarees.filter((p) => !monte.pages.includes(p));
    const inattendues = monte.pages.filter((p) => !declarees.includes(p));
    verifier('la barre de SURV porte exactement les pages que la source déclare',
      !refus && declarees.length > 0 && !manquantes.length && !inattendues.length,
      refus || `déclarées : ${declarees.length}${manquantes.length ? ` — absentes : ${manquantes.join(', ')}` : ''}`
        + `${inattendues.length ? ` — inattendues : ${inattendues.join(', ')}` : ''}`);

    // ── Toute page que l'aiguillage sait rendre est atteignable, ou déclarée ──
    let aiguillage = null;
    let refusAiguillage = null;
    try { aiguillage = aiguillageEtMenus(); } catch (e) { refusAiguillage = e.message; }
    if (refusAiguillage) {
      verifier('toute page de SURV est atteignable, ou déclarée sans chemin', false, refusAiguillage);
    } else {
      const sansChemin = aiguillage.rendues.filter((p) => !aiguillage.menus.includes(p));
      const nonDeclarees = sansChemin.filter((p) => !PAGES_SANS_CHEMIN[p]);
      // Une déclaration périmée est une déclaration qui ment : une page déclarée
      // sans chemin qui en retrouve un doit faire rougir, comme une dispense de
      // geste devenue fausse (5.c.0).
      const declarationsPerimees = Object.keys(PAGES_SANS_CHEMIN)
        .filter((p) => !sansChemin.includes(p));
      sansChemin.filter((p) => PAGES_SANS_CHEMIN[p])
        .forEach((p) => console.log(`    ◌ page sans chemin, déclarée : ${p}`));
      verifier('toute page de SURV est atteignable, ou déclarée sans chemin',
        !nonDeclarees.length && !declarationsPerimees.length,
        [
          nonDeclarees.length ? `sans chemin et non déclarée(s) : ${nonDeclarees.join(', ')}` : '',
          declarationsPerimees.length ? `déclaration(s) périmée(s) : ${declarationsPerimees.join(', ')}` : '',
        ].filter(Boolean).join(' · ')
          || `${aiguillage.rendues.length} pages rendues, ${aiguillage.menus.length} offertes par un menu,`
            + ` ${sansChemin.length} déclarée(s) sans chemin`);
    }

    // ── Chaque page, par un vrai clic ──
    //
    // Le clic, et non `execNavigateTo(…)` : un contrôle qui appelle la fonction
    // prouve que la fonction marche, non que le bouton y mène. La leçon est de
    // 5.e.6, où un contrôle appelait `window.planBackToPortal()` — un nom
    // qu'aucun module ne connaît.
    const rendus = new Map();
    for (const cle of monte.pages) {
      /* eslint-disable no-await-in-loop */
      const vu = await page.evaluate(async (k) => {
        const b = document.querySelector(`.nav-btn[data-page="${k}"]`);
        if (!b) return { clic: false };
        b.click();
        await new Promise((r) => setTimeout(r, 1800));
        const el = document.getElementById('exec-content');
        const html = el ? el.innerHTML : '';
        return {
          clic: true,
          longueur: el ? el.textContent.trim().length : 0,
          empreinte: html.length,
          active: (document.querySelector('.nav-btn.active') || {}).dataset?.page || null,
          debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          attente: !!document.querySelector('[data-oasis-loader]'),
        };
      }, cle);
      rendus.set(cle, vu);
      verifier(`la page « ${cle} » de SURV se remplit au clic de son bouton`,
        vu.clic && vu.longueur > 200 && !vu.attente && vu.active === cle,
        JSON.stringify(vu));
    }

    // ── Elles diffèrent, et c'est ce qui distingue « rendue » de « rendue la
    //    même » ──
    //
    // Le portail a appris la leçon en 5.c : sept sous-vues « se remplissaient »
    // toutes, et trois rendaient le même balisage. Un contrôle par page ne le
    // voit pas ; celui-ci le voit.
    const empreintes = [...rendus.entries()].map(([k, v]) => [k, v.empreinte]);
    const doublons = empreintes.filter(([, e], i) => e > 0
      && empreintes.findIndex(([, f]) => f === e) !== i);
    verifier('les pages de SURV diffèrent les unes des autres',
      doublons.length === 0 && empreintes.length > 1,
      doublons.length ? `mêmes empreintes : ${doublons.map(([k]) => k).join(', ')}`
        : `${empreintes.length} pages, de ${Math.min(...empreintes.map((e) => e[1]))} à ${Math.max(...empreintes.map((e) => e[1]))} caractères`);

    // ── Aucune ne déborde ──
    //
    // Mesuré à 1 280 de large. Un débordement horizontal coupe des colonnes de
    // table sans rien lever, et c'est un défaut que seul un navigateur dit.
    const debordent = [...rendus.entries()].filter(([, v]) => v.debord > 0);
    verifier('aucune page de SURV ne déborde à droite',
      debordent.length === 0,
      debordent.length ? debordent.map(([k, v]) => `${k} : ${v.debord}px`).join(', ')
        : `${rendus.size} pages mesurées à 1280 de large`);

    // ══════════════════════════════════════════════════════════════════════════
    //  La ronde du dossier, par les constatations (ADR-003, 5.f.3)
    // ══════════════════════════════════════════════════════════════════════════
    //
    // ── Pourquoi cette ronde existe, et par où elle passe ──
    //
    // Les 309 gestes que la suite n° 0.b ne couvrait pas vivent **dans** les
    // pages, et la plupart dans le volet d'un dossier d'activité. Deux obstacles
    // ont été mesurés avant d'écrire une assertion :
    //
    //   1. **le bac n'a aucun dossier** — le tableau n'affiche alors que ses deux
    //      boutons. *Un contre-essai qui ne mord pas dit que les données
    //      n'exercent pas le code* : la ronde fabrique donc son régime ;
    //   2. **la page du tableau des dossiers n'était atteignable par rien**
    //      (5.f.2) — elle l'est depuis le 8 novembre 2026 (n° 5.f.73). Le volet,
    //      lui, l'a toujours été : la page « Constatations » porte un bouton qui
    //      l'ouvre. La ronde passe donc par là, et c'est pourquoi elle crée une
    //      constatation en plus du dossier. *Le chemin de contournement est
    //      resté* : il éprouve la porte que les constatations offrent, qui est
    //      celle qu'un inspecteur emprunte réellement.
    //
    // ── Et un troisième obstacle, trouvé à la mesure ──
    //
    // La page « Constatations » a **trois sous-onglets**, et son défaut est
    // « Suivi ». Une constatation en brouillon est dans « En Préparation » : la
    // ronde a d'abord mesuré une table vide avec une constatation bien créée.
    // Le sous-onglet est un geste de plus, et la suite n° 0.b ne le touchait pas.
    //
    // ── Ce que la ronde laisse derrière elle ──
    //
    // Rien. La constatation part **par son propre geste** — c'est la seule
    // écriture de cette ronde, et son nettoyage *est* sa preuve. Le dossier et sa
    // notification partent par l'API, faute de geste atteignable : le seul bouton
    // qui efface un dossier est sur la page sans chemin. C'est écrit ici parce que
    // c'est une conséquence de 5.f.2, et non une commodité.
    // ══════════════════════════════════════════════════════════════════
    //  Le circuit de la notification d'activité, par les onglets du
    //  Déclenchement — et le sélecteur de validateur qui ne listait rien
    // ══════════════════════════════════════════════════════════════════
    //
    // `exec-notifications.js` portait **3 gestes exercés sur 26**, et c'est le
    // fichier le moins couvert de SURV. C'est pourtant la **première étape du
    // circuit de surveillance** : l'AAC annonce à l'organisme l'activité qu'un
    // plan validé a programmée, et rien ne s'exécute avant cela.
    //
    // ── Deux chemins mènent aux mêmes transitions ──
    //
    // La ronde du dossier (n° 5.f.26) parcourt déjà ce circuit, mais par la
    // **vue du circuit** (`execProcAction`), qui appelle les routes
    // directement. Les onglets du Déclenchement forment l'autre chemin, avec
    // leurs propres gestes — et c'est dans celui-là que vivait le défaut.
    //
    // ── Ce que le jeu d'essai offre, mesuré avant d'écrire ──
    //
    // Un plan validé, deux activités dans la fenêtre des 31 jours, aucune
    // notification. Le circuit se parcourt donc de bout en bout sur l'une, en
    // laissant l'autre intacte.
    etape = 'circuit de la notification';
    // Le préfixe passe **en argument** de chaque évaluation, comme le reste de
    // cette suite le fait. `EXEC_MODULE_API` est un `const` de premier niveau :
    // une liaison du périmètre lexical, **absente de `window`** — à la
    // différence de `EXEC_STATE`, que `exec-adapters.js` publie. Ma première
    // rédaction lisait `window.EXEC_MODULE_API`, qui valait `undefined` :
    // l'adresse composée « undefined/notifications » rendait un 404, et
    // l'exception a emporté la suite.
    const API_SURV = '/api/m/execution';

    await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('.nav-btn[data-page="declenchement"]')?.click();
      await attendre(3000);
    });

    const notifOuverture = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const onglets = [...document.querySelectorAll('.exec-workflow-tabs .exec-tab')];
      d.onglets = onglets.length;
      d.libelles = onglets.map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim());
      // Les quatre onglets se rendent chacun, et leur badge dit un compte.
      d.badges = onglets.map((b) => (b.querySelector('.exec-tab-badge') || {}).textContent || '');
      d.parOnglet = {};
      for (const b of onglets) {
        b.click();
        /* eslint-disable no-await-in-loop */
        await attendre(1500);
        const cle = window.EXEC_STATE.triggerTab;
        d.parOnglet[cle] = {
          lignes: document.querySelectorAll('.exec-data-table tbody tr').length,
          actif: (document.querySelector('.exec-tab.active') || {}).textContent
            ? (document.querySelector('.exec-tab.active').textContent || '').replace(/\s+/g, ' ').trim() : '',
        };
      }
      // Retour sur « à notifier », d'où part le circuit.
      //
      // `onglets[0]?.click()` et non `onglets[0].click()` : au premier passage,
      // la page ne s'ouvrait pas — sa clé manquait à la barre (n° 5.f.72) —, la
      // liste était vide, et la sonde a **levé**. L'exception a emporté la suite
      // entière : aucun des douze contrôles n'a pu rendre son verdict, et le
      // relevé n'a rien appris de ce qui n'allait pas. *Une sonde ne doit jamais
      // pouvoir casser ce qu'elle observe* — tout accès indexé est donc gardé.
      onglets[0]?.click();
      await attendre(1600);
      d.declencher = [...document.querySelectorAll('[onclick^="execStartNotification"]')].length;
      const boutonContacts = document.querySelector('[onclick^="execShowContacts"]');
      d.contacts = [...document.querySelectorAll('[onclick^="execShowContacts"]')].length;
      // L'organisme de la première ligne : le volet des contacts écrit dans son
      // enregistrement, et la ronde doit savoir lequel pour le rendre ensuite.
      d.prestataireDeLaLigne = boutonContacts
        ? (/execShowContacts\('([^']*)'\)/.exec(boutonContacts.getAttribute('onclick') || '') || [])[1] || ''
        : '';
      return d;
    });

    // ── 1. Les contacts de l'organisme, avant de l'avertir ──
    //
    // `execShowContacts` ouvre la liste des interlocuteurs ; une ligne s'ajoute,
    // et l'enregistrement part au serveur. C'est la seule page du module qui
    // écrive dans le référentiel des organismes.
    const notifContacts = await page.evaluate(async (prestataireId) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      document.querySelector('[onclick^="execShowContacts"]')?.click();
      await attendre(2400);
      d.volet = !!document.getElementById('contact_dirigeant');
      if (!d.volet) return d;
      d.champsFixes = ['contact_dirigeant', 'contact_fonction_resp', 'contact_email_prest',
        'contact_point_focal', 'contact_fonction_pf', 'contact_email_pf', 'contact_numero_pf']
        .filter((x) => !!document.getElementById(x)).length;
      const compter = () => document.querySelectorAll('#contacts_additional_container .contact-row').length;
      d.avant = compter();
      document.querySelector('[onclick^="execAddContactRow"]')?.click();
      await attendre(900);
      d.apres = compter();
      d.ajoutee = d.apres === d.avant + 1;
      // La ligne neuve se remplit, puis on la retire : la ronde n'écrit pas
      // dans le référentiel des organismes, qu'elle ne saurait pas rendre.
      const lignes = [...document.querySelectorAll('#contacts_additional_container .contact-row')];
      const neuve = lignes[lignes.length - 1];
      d.champsDeLaLigne = neuve ? neuve.querySelectorAll('input').length : 0;
      // Le retrait est posé en ligne sur le bouton : `this.parentElement.remove()`.
      neuve?.querySelector('[onclick*="parentElement.remove"]')?.click();
      await attendre(700);
      d.retiree = compter() === d.avant;
      d.boutonEnregistrer = !!document.querySelector('[onclick^="execSaveContactChanges"]');

      // ── L'enregistrement, et sa restitution ──
      //
      // C'est la seule écriture de ce volet, et elle porte sur le **référentiel
      // des organismes**, que le portail partage avec tous les modules. La ronde
      // relève donc la valeur d'avant, écrit la sienne, vérifie que le serveur
      // la porte, puis **rend l'ancienne**. Sans cette restitution, le contrôle
      // couvrirait un geste au prix d'un référentiel modifié pour les suites
      // qui viennent après.
      const champFonction = document.getElementById('contact_fonction_pf');
      d.valeurAvant = champFonction ? champFonction.value : null;
      if (champFonction) {
        champFonction.value = 'Responsable qualité — ronde SURV';
        document.querySelector('[onclick^="execSaveContactChanges"]')?.click();
        await attendre(3600);
        const relu = async () => {
          const l = (await window.api('/api/prestataires')) || [];
          return (l.find((p) => p.id === prestataireId) || {}).fonction_point_focal || '';
        };
        d.ecriteAuServeur = (await relu()).includes('ronde SURV');
        // ── Le volet rouvert doit porter ce qu'on vient d'enregistrer ──
        //
        // Il portait l'ancienne valeur : `execSaveContactChanges` appelait un
        // `loadSharedData` **qui n'existe nulle part**, et retombait sur son
        // propre cache. Treize fichiers du module lisent ce cache, dont le
        // formulaire de notification pour l'interlocuteur. Corrigé le
        // 7 novembre 2026 (n° 5.f.72) : le référentiel se relit au serveur.
        document.querySelector('[onclick^="execShowContacts"]')?.click();
        await attendre(2400);
        const reouvert = document.getElementById('contact_fonction_pf');
        if (reouvert) {
          d.voletRouvertGarni = reouvert.value.includes('ronde SURV');
          reouvert.value = d.valeurAvant;
          document.querySelector('[onclick^="execSaveContactChanges"]')?.click();
          await attendre(3600);
          d.valeurRendue = (await relu()) === d.valeurAvant;
        }
      }

      document.querySelector('[onclick^="execCloseSlider"]')?.click();
      await attendre(1200);
      d.ferme = !document.querySelector('[onclick^="execAddContactRow"]');
      return d;
    }, notifOuverture.prestataireDeLaLigne || '');

    // ── 2. Le formulaire, pré-garni par l'activité du plan ──
    //
    // `execStartNotification` compose le **périmètre** à partir des
    // sous-activités de l'activité et des thèmes qu'elle couvre : une ligne par
    // sous-activité, ses thèmes entre parenthèses. C'est la propriété forte du
    // geste — le reste est de la recopie.
    const notifFormulaire = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const val = (id) => (document.getElementById(id) || {}).value || '';
      document.querySelector('[onclick^="execStartNotification"]')?.click();
      await attendre(3200);
      d.formulaire = !!document.getElementById('notif_objet');
      if (!d.formulaire) return d;
      d.champs = ['notif_prestataire_id', 'notif_objet', 'notif_perimetre', 'notif_date_debut',
        'notif_date_fin', 'notif_lieu', 'notif_type_supervision']
        .filter((x) => !!document.getElementById(x)).length;
      d.objet = val('notif_objet');
      d.perimetre = val('notif_perimetre');
      // Une ligne par sous-activité, et des thèmes entre parenthèses.
      d.lignesPerimetre = d.perimetre.split('\n').filter((l) => l.trim().startsWith('-')).length;
      d.perimetreAvecThemes = /\(.+\)/.test(d.perimetre);
      d.prestataire = val('notif_prestataire_id');
      d.dates = [val('notif_date_debut'), val('notif_date_fin')];

      // `execUpdatePrestataireFields` : changer d'organisme regarnit les champs
      // qui en dépendent. On relève l'avant et l'après du même champ.
      const sel = document.getElementById('notif_prestataire_id');
      const autres = [...(sel ? sel.options : [])].map((o) => o.value)
        .filter((v) => v && v !== d.prestataire);
      d.autresOrganismes = autres.length;
      if (autres.length) {
        d.interlocuteurAvant = val('notif_interlocuteur');
        sel.value = autres[0];
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await attendre(1400);
        d.interlocuteurApres = val('notif_interlocuteur');
        // Rendu à l'organisme de l'activité : la notification doit partir au bon.
        sel.value = d.prestataire;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await attendre(1400);
        d.organismeRendu = val('notif_prestataire_id') === d.prestataire;
      }

      // `execAddEquipeMember` : une ligne d'équipe, deux listes et un retrait.
      const equipe = () => document.querySelectorAll('#notif_equipe_container > div').length;
      d.equipeAvant = equipe();
      document.querySelector('[onclick^="execAddEquipeMember"]')?.click();
      await attendre(900);
      d.equipeApres = equipe();
      const ligneEquipe = [...document.querySelectorAll('#notif_equipe_container > div')].pop();
      const listesEquipe = ligneEquipe ? [...ligneEquipe.querySelectorAll('select')] : [];
      d.listesEquipe = listesEquipe.length;
      d.inspecteursOfferts = listesEquipe[0]
        ? [...listesEquipe[0].options].filter((o) => o.value).length : 0;
      d.rolesOfferts = listesEquipe[1]
        ? [...listesEquipe[1].options].filter((o) => o.value).length : 0;
      const premierDe = (sel) => (sel ? [...sel.options].filter((o) => o.value)[0] : null);
      const insp = premierDe(listesEquipe[0]);
      if (insp) { listesEquipe[0].value = insp.value; d.inspecteurRetenu = insp.value; }
      const role = premierDe(listesEquipe[1]);
      if (role) { listesEquipe[1].value = role.value; d.roleRetenu = role.value; }

      // `execAddProgrammeLine` : une ligne de programme, quatre champs.
      const prog = () => document.querySelectorAll('#notif_programme_table tbody tr:not(#notif_prog_empty)').length;
      d.progAvant = prog();
      document.querySelector('[onclick^="execAddProgrammeLine"]')?.click();
      await attendre(900);
      d.progApres = prog();
      const ligneProg = [...document.querySelectorAll('#notif_programme_table tbody tr')].pop();
      const champsProg = ligneProg ? [...ligneProg.querySelectorAll('input[data-field]')] : [];
      d.champsProgramme = champsProg.map((i) => i.dataset.field).join(',');
      champsProg.forEach((i) => {
        if (i.dataset.field === 'date') i.value = '2026-11-23';
        if (i.dataset.field === 'horaire') i.value = '09:00-12:00';
        if (i.dataset.field === 'actions') i.value = 'Ouverture et revue documentaire';
        if (i.dataset.field === 'correspondant') i.value = 'Direction technique';
      });
      // Une ligne vide ne doit pas partir : `_collectNotificationForm` ne
      // retient que celles qui portent une date ou une action.
      document.querySelector('[onclick^="execAddProgrammeLine"]')?.click();
      await attendre(700);
      d.progAvecVide = prog();
      // Et elle se retire par son geste — `this.closest('tr').remove()`, posé en
      // ligne sur le bouton. Les deux lignes de programme du formulaire le
      // portent, et c'est la seule façon de défaire une ligne de trop.
      const vide = [...document.querySelectorAll('#notif_programme_table tbody tr')].pop();
      vide?.querySelector('[onclick*="closest"]')?.click();
      await attendre(700);
      d.progApresRetrait = prog();
      d.ligneVideRetiree = d.progApresRetrait === d.progApres;
      return d;
    });

    // ── 3. L'aperçu, puis le brouillon ──
    //
    // L'aperçu du formulaire compose la **fiche officielle** — en-tête de
    // l'autorité, organisme, équipe, programme — et offre deux issues : revenir
    // au formulaire, ou soumettre. On revient, pour que l'enregistrement du
    // brouillon passe par son propre geste.
    const notifApercu = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      document.querySelector('[onclick^="execPreviewNotificationFromForm"]')?.click();
      await attendre(2600);
      const fiche = document.querySelector('.fiche-notification');
      d.fiche = !!fiche;
      if (fiche) {
        const texte = (fiche.innerText || '').replace(/\s+/g, ' ');
        d.texte = texte.slice(0, 220);
        // Le document porte la substance de la saisie, et non un gabarit vide.
        d.porteLeProgramme = /Ouverture et revue documentaire/.test(texte);
        d.porteLAutorite = /Aviation Civile/i.test(texte);
        d.sections = fiche.querySelectorAll('section, header').length;
      }
      d.retourFormulaire = !!document.querySelector('[onclick^="execOpenNotificationForm"]');
      d.soumettreDepuisApercu = !!document.querySelector('[onclick^="execSubmitNotificationForValidation"]');
      document.querySelector('[onclick^="execOpenNotificationForm"]')?.click();
      await attendre(2600);
      // Le retour rend le formulaire garni de ce qui avait été saisi.
      d.revenu = !!document.getElementById('notif_objet');
      d.programmeRendu = document.querySelectorAll('#notif_programme_table tbody tr:not(#notif_prog_empty)').length;
      return d;
    });

    const notifBrouillon = await page.evaluate(async (API) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const notifs = async () => (await window.api(`${API}/notifications`)) || [];
      d.avant = (await notifs()).length;
      const lieu = document.getElementById('notif_lieu');
      if (!lieu) { d.formulaireAbsent = true; return d; }
      lieu.value = 'Siège de l’organisme — ronde SURV';
      document.querySelector('[onclick^="execSaveNotificationDraft"]')?.click();
      await attendre(4000);
      d.voletFerme = !document.getElementById('notif_objet');
      const apres = await notifs();
      d.apres = apres.length;
      // ── Quatre noms qui changent en chemin ──
      //
      // Le formulaire envoie `lieu`, `perimetre`, `equipe` et `objet` ; le
      // magasin range `lieu_activite`, `perimetre_activite`, `equipe_membres` et
      // `objet_activite`. La route fait la correspondance dans les deux sens,
      // de sorte que rien n'est perdu — mais un contrôle qui cherche le nom de
      // l'écran dans l'enregistrement ne trouve rien, et c'est ce qui est
      // arrivé à ma première rédaction. *Deux vocabulaires pour une même chose
      // sont ce qui a coûté le plus cher à ce dépôt* (n° 5.f.69).
      const mienne = apres.find((n) => (n.lieu_activite || n.lieu || '').includes('ronde SURV'));
      d.creee = !!mienne;
      if (!mienne) {
        d.nomsRendus = Object.keys(apres[apres.length - 1] || {}).join(',').slice(0, 200);
        return d;
      }
      d.id = mienne.id;
      d.statut = mienne.statut;
      d.reference = mienne.reference || '';
      // Le serveur force le brouillon à la création, quoi que l'écran envoie.
      d.enBrouillon = mienne.statut === 'brouillon';
      // Et il porte ce que le formulaire a composé : équipe, programme, périmètre.
      d.equipeEnBase = (mienne.equipe_membres || mienne.equipe || []).length;
      d.programmeEnBase = (mienne.programme || []).length;
      d.perimetreEnBase = String(mienne.perimetre || mienne.perimetre_activite || '').length > 10;
      d.activiteLiee = mienne.activite_id || '';
      return d;
    }, API_SURV);

    // ── 4. La reprise du brouillon, et l'aperçu depuis l'enregistrement ──
    const notifReprise = await page.evaluate(async (id, API) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      window.EXEC_STATE.triggerTab = 'brouillons';
      window.execRenderPage();
      await attendre(2000);
      d.ongletBrouillons = document.querySelectorAll('.exec-data-table tbody tr').length;
      d.boutonModifier = !!document.querySelector(`[onclick="execEditNotification('${id}')"]`);
      document.querySelector(`[onclick="execEditNotification('${id}')"]`)?.click();
      await attendre(3400);
      d.formulaireRouvert = !!document.getElementById('notif_objet');
      if (d.formulaireRouvert) {
        d.lieuRendu = (document.getElementById('notif_lieu') || {}).value || '';
        d.programmeRendu = document.querySelectorAll('#notif_programme_table tbody tr:not(#notif_prog_empty)').length;
        d.equipeRendue = document.querySelectorAll('#notif_equipe_container > div').length;
        document.querySelector('[onclick^="execCloseSlider"]')?.click();
        await attendre(1600);
      }
      return d;
    }, notifBrouillon.id || '', API_SURV);

    // ── 5. La soumission, et le sélecteur de validateur ──
    //
    // C'est ici que vivait le défaut, et c'est la **première transition du
    // circuit de surveillance** : sans elle, rien ne va au-delà du brouillon.
    //
    // Le sélecteur interrogeait `/api/users` et y filtrait sur `role_m3`. Ce
    // champ n'y existe pas : il est **dérivé** du privilège SURV, et seule la
    // route du module le compose. La liste était donc toujours vide et le
    // bouton refusait toujours. Mesuré avant la correction : zéro validateur
    // par `/api/users`, un par `…/utilisateurs`.
    //
    // Le contrôle exige donc les deux moitiés : que la liste porte au moins un
    // validateur, **et** que le refus vienne quand on ne choisit personne.
    const notifSoumission = await page.evaluate(async (id, API) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const statut = async () => {
        const l = (await window.api(`${API}/notifications`)) || [];
        return (l.find((n) => n.id === id) || {}).statut;
      };
      window.EXEC_STATE.triggerTab = 'brouillons';
      window.execRenderPage();
      await attendre(1800);
      document.querySelector(`[onclick="execSubmitBrouillon('${id}')"]`)?.click();
      await attendre(2600);
      const liste = document.getElementById('validator_picker_select');
      d.selecteur = !!liste;
      if (!liste) return d;
      d.validateursOfferts = [...liste.options].filter((o) => o.value).length;
      d.premier = d.validateursOfferts ? [...liste.options].filter((o) => o.value)[0].textContent.trim() : '';
      // Sans choix, le bouton refuse — et rien ne part.
      document.getElementById('validator_picker_confirm')?.click();
      await attendre(1600);
      d.refusSansChoix = !!document.getElementById('validator_picker_select');
      d.statutApresRefus = await statut();
      // Puis le renoncement : le sélecteur se ferme et rien n'a changé.
      document.getElementById('validator_picker_cancel')?.click();
      await attendre(1200);
      d.ferme = !document.getElementById('validator_picker_select');
      d.statutApresRenoncement = await statut();
      // Et pour de bon.
      document.querySelector(`[onclick="execSubmitBrouillon('${id}')"]`)?.click();
      await attendre(2600);
      const liste2 = document.getElementById('validator_picker_select');
      if (liste2) {
        const premiere = [...liste2.options].filter((o) => o.value)[0];
        if (!premiere) return d;
        liste2.value = premiere.value;
        d.validateurRetenu = liste2.value;
        document.getElementById('validator_picker_confirm')?.click();
        await attendre(4000);
      }
      d.statut = await statut();
      d.ongletCourant = window.EXEC_STATE.triggerTab;
      // Le validateur désigné est porté par l'enregistrement : c'est le nom que
      // l'écran a choisi, et non une chaîne vide.
      const l = (await window.api(`${API}/notifications`)) || [];
      const n = l.find((x) => x.id === id) || {};
      d.validateurEnBase = n.validateur_id || '';
      d.dateSoumission = !!n.date_soumission;
      return d;
    }, notifBrouillon.id || '', API_SURV);

    // ── 6. Le renvoi, puis la validation et la transmission ──
    //
    // Le renvoi fait **reculer** le circuit : la notification redevient un
    // brouillon, avec son motif. C'est la seule étape qui recule, et elle doit
    // laisser l'enregistrement reprenable.
    const notifCircuit = await page.evaluate(async (id, API) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const lire = async () => {
        const l = (await window.api(`${API}/notifications`)) || [];
        return l.find((n) => n.id === id) || {};
      };
      const saisir = async (texte) => {
        const champ = document.querySelector('.oasis-saisie-champ');
        if (!champ) return false;
        champ.value = texte;
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(500);
        document.querySelector('.oasis-confirm-oui')?.click();
        return true;
      };

      window.EXEC_STATE.triggerTab = 'soumis';
      window.execRenderPage();
      await attendre(2000);
      d.ongletSoumis = document.querySelectorAll('.exec-data-table tbody tr').length;
      d.gestesOfferts = ['execPreviewNotification', 'execValidateNotification',
        'execRejectNotification', 'execCancelNotification']
        .filter((g) => !!document.querySelector(`[onclick^="${g}('${id}'"]`)
          || !!document.querySelector(`[onclick*="${g}('${id}'"]`)).join(',');

      // L'aperçu depuis l'enregistrement, qui relit le serveur.
      document.querySelector(`[onclick="execPreviewNotification('${id}')"]`)?.click();
      await attendre(2800);
      const fiche = document.querySelector('.fiche-notification');
      d.apercu = !!fiche;
      d.apercuPorteLaReference = fiche ? /ronde SURV/.test(fiche.innerText || '') : null;
      // Soumise, la fiche offre les deux décisions du validateur.
      d.apercuOffreValider = !!document.querySelector(`[onclick="execValidateNotification('${id}')"]`);
      document.querySelector('[onclick^="execCloseSlider"]')?.click();
      await attendre(1600);

      // ── Le renvoi ──
      document.querySelector(`[onclick="execRejectNotification('${id}')"]`)?.click();
      await attendre(1800);
      d.renvoiDemandeUnMotif = !!document.querySelector('.oasis-saisie-champ');
      if (d.renvoiDemandeUnMotif) {
        await saisir('Périmètre à préciser — motif de la ronde');
        await attendre(4000);
      }
      const apresRenvoi = await lire();
      d.statutApresRenvoi = apresRenvoi.statut;
      d.motifPorte = apresRenvoi.motif_rejet || '';

      // Resoumise, puis validée.
      window.EXEC_STATE.triggerTab = 'brouillons';
      window.execRenderPage();
      await attendre(1800);
      document.querySelector(`[onclick="execSubmitBrouillon('${id}')"]`)?.click();
      await attendre(2600);
      const liste = document.getElementById('validator_picker_select');
      if (liste) {
        const premiere = [...liste.options].filter((o) => o.value)[0];
        if (premiere) {
          liste.value = premiere.value;
          document.getElementById('validator_picker_confirm')?.click();
          await attendre(4000);
        }
      }
      d.statutResoumis = (await lire()).statut;

      window.EXEC_STATE.triggerTab = 'soumis';
      window.execRenderPage();
      await attendre(1800);
      document.querySelector(`[onclick="execValidateNotification('${id}')"]`)?.click();
      await attendre(4000);
      const validee = await lire();
      d.statutValide = validee.statut;
      d.validateurDeLActe = validee.validateur_id || '';
      d.dateValidation = !!validee.date_validation;

      // La transmission.
      window.EXEC_STATE.triggerTab = 'soumis';
      window.execRenderPage();
      await attendre(1800);
      d.boutonTransmettre = !!document.querySelector(`[onclick="execSendNotification('${id}')"]`);
      document.querySelector(`[onclick="execSendNotification('${id}')"]`)?.click();
      await attendre(4000);
      const envoyee = await lire();
      d.statutEnvoye = envoyee.statut;
      d.dateEnvoi = !!envoyee.date_envoi;
      d.envoyePar = envoyee.envoye_par || '';
      return d;
    }, notifBrouillon.id || '', API_SURV);

    // ── 7. L'onglet des envoyés : l'accord, le fil, et le retour en arrière ──
    //
    // Une notification transmise attend l'accord de l'organisme sur les dates et
    // le périmètre. Le volet de la ligne les porte, et `execValidateAccordRow`
    // les arrête. Le fil d'échange, lui, est le canal de la négociation.
    //
    // **Et le retour en arrière** : `execCancelNotification` est offert depuis
    // cet onglet, c'est-à-dire sur une notification **déjà transmise**. La route
    // n'y oppose aucun garde de statut, à la différence des quatre autres
    // transitions. Le contrôle relève le fait plutôt que de le supposer voulu.
    const notifEnvoyes = await page.evaluate(async (id, API) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const lire = async () => {
        const l = (await window.api(`${API}/notifications`)) || [];
        return l.find((n) => n.id === id) || {};
      };
      window.EXEC_STATE.triggerTab = 'envoyes';
      window.execRenderPage();
      await attendre(2200);
      d.ligne = !!document.querySelector(`[onclick^="execToggleEnvoiPanel('${id}'"]`);
      if (!d.ligne) return d;

      // Le volet de la ligne : replié, il se déplie et porte ses trois champs.
      const volet = () => document.getElementById(`exec_envoi_panel_${id}`);
      d.repliéAvant = volet() ? volet().style.display === 'none' : null;
      document.querySelector(`[onclick^="execToggleEnvoiPanel('${id}'"]`)?.click();
      await attendre(1200);
      d.deplie = volet() ? volet().style.display !== 'none' : null;
      d.champsAccord = ['exec_row_debut_', 'exec_row_fin_', 'exec_row_perimetre_']
        .filter((p) => !!document.getElementById(p + id)).length;

      const poser = (p, v) => {
        const e = document.getElementById(p + id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };

      // ── L'ordre n'est pas libre, et c'est la mesure qui l'a dit ──
      //
      // Valider l'accord porte le statut à `acte`, et l'onglet « envoyés »
      // **écarte délibérément** les `acte` (`envoyeItems.filter(n => n.statut
      // !== 'acte')`). La ligne disparaît donc, et avec elle le fil d'échange et
      // l'annulation. Ma première rédaction validait l'accord d'abord : les deux
      // gestes suivants ne trouvaient plus de ligne, et deux contrôles
      // rougissaient sur une cause qui n'était pas la leur.
      //
      // Le fil et l'annulation passent donc **avant** l'accord, qui ferme
      // l'étape — et c'est cette fermeture que le contrôle exige en relevant que
      // la ligne quitte l'onglet.

      // Le fil d'échange : il s'ouvre, refuse un message vide, puis le porte.
      await attendre(400);
      document.querySelector(`[onclick="execOpenExchangeSlider('${id}')"]`)?.click();
      await attendre(3000);
      d.filOuvert = !!document.getElementById('exec_exchange_msg');
      if (d.filOuvert) {
        const echanges = async () => (await window.api(`${API}/notifications/${id}/echanges`)) || [];
        d.avantMessage = (await echanges()).length;
        // Vide, rien ne part.
        document.querySelector(`[onclick="execSendExchangeMessage('${id}')"]`)?.click();
        await attendre(2000);
        d.apresVide = (await echanges()).length;
        const champ = document.getElementById('exec_exchange_msg');
        if (champ) {
          champ.value = 'Les dates proposées conviennent — message de la ronde.';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
        }
        document.querySelector(`[onclick="execSendExchangeMessage('${id}')"]`)?.click();
        await attendre(4000);
        const apres = await echanges();
        d.apresMessage = apres.length;
        // `contenu`, et non `message` : c'est le nom que `db.insert('echanges')`
        // range. Ma première rédaction cherchait celui de l'écran, et relevait
        // une chaîne vide sur un message pourtant bien parti.
        d.dernier = (apres[apres.length - 1] || {}).contenu || '';
      }
      document.querySelector('[onclick^="execCloseSlider"]')?.click();
      await attendre(1600);

      // ── Le retour en arrière d'une notification transmise ──
      //
      // La route de l'annulation n'oppose **aucun garde de statut**, à la
      // différence des quatre autres transitions : elle ramène au brouillon ce
      // qu'on lui donne. L'écran, lui, n'offre le geste que sur cet onglet.
      window.EXEC_STATE.triggerTab = 'envoyes';
      window.execRenderPage();
      await attendre(1800);
      d.annulationOfferteSurEnvoyee = !!document.querySelector(`[onclick="execCancelNotification('${id}', 'envoyes')"]`);
      document.querySelector(`[onclick="execCancelNotification('${id}', 'envoyes')"]`)?.click();
      await attendre(1800);
      d.annulationDemandeUnMotif = !!document.querySelector('.oasis-saisie-champ');
      // Renoncer à l'invite n'annule rien : `motif === null` arrête le geste.
      document.querySelector('.oasis-confirm-non')?.click();
      await attendre(2600);
      d.statutApresRenoncement = (await lire()).statut;
      // Puis pour de bon.
      document.querySelector(`[onclick="execCancelNotification('${id}', 'envoyes')"]`)?.click();
      await attendre(1800);
      const champ = document.querySelector('.oasis-saisie-champ');
      if (champ) {
        champ.value = 'Report demandé par l’organisme — ronde SURV';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(500);
        document.querySelector('.oasis-confirm-oui')?.click();
        await attendre(4000);
      }
      const annulee = await lire();
      d.statutApresAnnulation = annulee.statut;
      d.motifAnnulation = annulee.motif_rejet || '';

      // ── L'accord, qui ferme l'étape ──
      //
      // Il faut donc refaire le circuit : annulée, la notification est de
      // nouveau un brouillon. Les trois gestes de l'accord — celui de la ligne
      // comme les deux de la vue du circuit — n'étaient exercés **par rien**, et
      // c'est pourtant l'acte qui arrête les dates et le périmètre convenus
      // avec l'organisme.
      const refaireLeCircuit = async () => {
        window.EXEC_STATE.triggerTab = 'brouillons';
        window.execRenderPage();
        await attendre(1800);
        document.querySelector(`[onclick="execSubmitBrouillon('${id}')"]`)?.click();
        await attendre(2600);
        const liste = document.getElementById('validator_picker_select');
        const premiere = liste ? [...liste.options].filter((o) => o.value)[0] : null;
        if (premiere) {
          liste.value = premiere.value;
          document.getElementById('validator_picker_confirm')?.click();
          await attendre(4000);
        }
        window.EXEC_STATE.triggerTab = 'soumis';
        window.execRenderPage();
        await attendre(1800);
        document.querySelector(`[onclick="execValidateNotification('${id}')"]`)?.click();
        await attendre(4000);
        window.EXEC_STATE.triggerTab = 'soumis';
        window.execRenderPage();
        await attendre(1800);
        document.querySelector(`[onclick="execSendNotification('${id}')"]`)?.click();
        await attendre(4000);
        return (await lire()).statut;
      };
      d.statutRefait = await refaireLeCircuit();

      window.EXEC_STATE.triggerTab = 'envoyes';
      window.execRenderPage();
      await attendre(1800);
      document.querySelector(`[onclick^="execToggleEnvoiPanel('${id}'"]`)?.click();
      await attendre(1200);
      poser('exec_row_debut_', '2026-11-24');
      poser('exec_row_fin_', '2026-11-26');
      poser('exec_row_perimetre_', 'Périmètre arrêté avec l’organisme — ronde SURV');
      await attendre(800);
      d.boutonAccord = !!document.querySelector(`[onclick="execValidateAccordRow('${id}')"]`);
      document.querySelector(`[onclick="execValidateAccordRow('${id}')"]`)?.click();
      await attendre(4000);
      const accord = await lire();
      d.accordDebut = accord.date_debut_effective || '';
      d.accordFin = accord.date_fin_effective || '';
      d.accordPerimetre = (accord.perimetre_valide || '').includes('ronde SURV');
      d.statutApresAccord = accord.statut;
      // L'accord **ferme l'étape** : la ligne quitte l'onglet des envoyés.
      window.EXEC_STATE.triggerTab = 'envoyes';
      window.execRenderPage();
      await attendre(1800);
      d.ligneQuitteLOnglet = !document.querySelector(`[onclick^="execToggleEnvoiPanel('${id}'"]`);
      return d;
    }, notifBrouillon.id || '', API_SURV);

    // ── 8. La ronde ne laisse rien ──
    //
    // Le brouillon s'efface par son geste, qui demande confirmation. Et
    // l'activité du plan redevient « à notifier » : c'est `plans-valides` qui
    // l'exclut tant qu'une notification la porte, de sorte que l'effacement la
    // rend au premier onglet. *Une ronde qui ne rend pas ce qu'elle a pris fait
    // rougir celles qui la suivent.*
    const notifMenage = await page.evaluate(async (id, API) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const notifs = async () => (await window.api(`${API}/notifications`)) || [];
      const aNotifier = async () => {
        const plans = (await window.api(`${API}/plans-valides`)) || [];
        return plans.reduce((n, p) => n + (p.activites || []).length, 0);
      };
      d.avantMenage = await aNotifier();
      // ── Une transition sans bouton, et pourquoi elle passe par la route ──
      //
      // L'accord a porté la notification à `acte`, et aucun onglet n'offre alors
      // de geste : « envoyés » écarte les `acte`, et « brouillons » ne les voit
      // pas. Le seul geste qui efface une activité actée est la suppression
      // définitive de la page « Processus », déjà exercée par sa propre ronde.
      //
      // La ronde ramène donc la notification au brouillon **par la route** —
      // celle de l'annulation, qui n'oppose aucun garde de statut —, puis
      // l'efface **par son geste**. C'est la même règle que la ronde du dossier
      // s'est donnée : par l'API seulement là où aucun geste atteignable ne fait
      // l'affaire, et dit plutôt que tu.
      await window.api(`${API}/notifications/${id}/cancel`, {
        method: 'PUT', body: JSON.stringify({ motif: 'Ménage de la ronde SURV' }),
      });
      // ── Redessiner ne relit pas : il faut rafraîchir d'abord ──
      //
      // `execRenderPage` dessine depuis `EXEC_STATE.data`, que la route n'a pas
      // touché. Les gestes de l'écran appellent tous `execRefreshDynamic()`
      // avant de redessiner ; une écriture faite par la route doit en faire
      // autant, sans quoi l'onglet rend l'état d'avant et le bouton cherché
      // n'existe pas. *Mon oubli relevait « pas de bouton » sur une
      // notification pourtant revenue au brouillon.*
      await window.execRefreshDynamic();
      window.EXEC_STATE.triggerTab = 'brouillons';
      window.execRenderPage();
      await attendre(2200);
      d.bouton = !!document.querySelector(`[onclick="execDeleteBrouillon('${id}')"]`);
      if (!d.bouton) return d;
      document.querySelector(`[onclick="execDeleteBrouillon('${id}')"]`)?.click();
      await attendre(1600);
      d.confirmation = !!document.querySelector('.oasis-confirm-oui');
      document.querySelector('.oasis-confirm-non')?.click();
      await attendre(2600);
      d.resteApresRefus = (await notifs()).some((n) => n.id === id);
      document.querySelector(`[onclick="execDeleteBrouillon('${id}')"]`)?.click();
      await attendre(1600);
      document.querySelector('.oasis-confirm-oui')?.click();
      await attendre(4000);
      d.partie = !(await notifs()).some((n) => n.id === id);
      d.apresMenage = await aNotifier();
      // L'activité est rendue au premier onglet.
      d.activiteRendue = d.apresMenage === d.avantMenage + 1;
      return d;
    }, notifBrouillon.id || '', API_SURV);

    {
      const O = notifOuverture || {};
      const C = notifContacts || {};
      const F = notifFormulaire || {};
      const A = notifApercu || {};
      const B = notifBrouillon || {};
      const R = notifReprise || {};
      const S = notifSoumission || {};
      const X = notifCircuit || {};
      const E = notifEnvoyes || {};
      const M = notifMenage || {};

      verifier('la page du Déclenchement porte ses quatre onglets, chacun se rend, et « à notifier » offre ses deux gestes par ligne',
        O.onglets === 4
        && Object.keys(O.parOnglet || {}).length === 4
        // Le premier onglet porte les activités d'un plan validé non encore
        // notifiées : le jeu d'essai en offre deux.
        && (O.parOnglet || {}).a_notifier && O.parOnglet.a_notifier.lignes >= 1
        && O.declencher >= 1 && O.contacts >= 1,
        JSON.stringify(O).slice(0, 460));

      verifier('les contacts d’un organisme s’ouvrent avec leurs sept champs, une ligne s’ajoute et se retire, et le volet se referme',
        C.volet === true && C.champsFixes === 7
        && C.ajoutee === true && C.champsDeLaLigne === 3
        && C.retiree === true && C.boutonEnregistrer === true && C.ferme === true
        // L'écriture part au serveur, le volet rouvert la porte, et la ronde
        // rend la valeur d'avant : le référentiel des organismes est partagé.
        && C.ecriteAuServeur === true && C.voletRouvertGarni === true
        && C.valeurRendue === true,
        JSON.stringify(C).slice(0, 400));

      verifier('le formulaire s’ouvre pré-garni par l’activité du plan, son périmètre composé des sous-activités et de leurs thèmes',
        F.formulaire === true && F.champs === 7
        // La propriété forte du geste : le périmètre est **composé**, une ligne
        // par sous-activité, ses thèmes entre parenthèses.
        && F.lignesPerimetre >= 1 && F.perimetreAvecThemes === true
        && !!F.prestataire && !!F.dates[0]
        // Changer d'organisme regarnit les champs qui en dépendent, et
        // l'organisme de l'activité est rendu.
        && (F.autresOrganismes === 0 || F.organismeRendu === true),
        JSON.stringify({ ...F, perimetre: String(F.perimetre || '').slice(0, 120) }).slice(0, 520));

      verifier('l’équipe et le programme s’ajoutent ligne par ligne, avec leurs listes et leurs quatre champs, et une ligne vide ne compte pas',
        F.equipeApres === F.equipeAvant + 1
        && F.listesEquipe === 2 && F.inspecteursOfferts >= 1 && F.rolesOfferts >= 1
        && F.progApres === F.progAvant + 1
        && F.champsProgramme === 'date,horaire,actions,correspondant'
        // La ligne de trop se retire par son geste, et le programme retrouve son
        // compte : rien d'autre ne défait une ligne ajoutée.
        && F.ligneVideRetiree === true,
        JSON.stringify({ equipe: [F.equipeAvant, F.equipeApres], listes: F.listesEquipe,
          inspecteurs: F.inspecteursOfferts, roles: F.rolesOfferts,
          prog: [F.progAvant, F.progApres, F.progAvecVide], champs: F.champsProgramme }));

      verifier('l’aperçu compose la fiche officielle avec la substance saisie, et le retour rend le formulaire garni',
        A.fiche === true && A.porteLeProgramme === true && A.porteLAutorite === true
        && A.retourFormulaire === true && A.soumettreDepuisApercu === true
        && A.revenu === true && A.programmeRendu >= 1,
        JSON.stringify(A).slice(0, 460));

      verifier('le brouillon s’enregistre, le serveur le porte en brouillon avec son équipe, son programme et son périmètre, et le lie à l’activité',
        B.voletFerme === true && B.apres === B.avant + 1 && B.creee === true
        // Le serveur force le brouillon à la création, quoi que l'écran envoie.
        && B.enBrouillon === true
        && B.equipeEnBase >= 1 && B.programmeEnBase >= 1 && B.perimetreEnBase === true
        && !!B.activiteLiee && !!B.reference,
        JSON.stringify(B).slice(0, 460));

      verifier('le brouillon se rouvre garni de ce qui a été enregistré — son lieu, son programme et son équipe',
        R.boutonModifier === true && R.formulaireRouvert === true
        && String(R.lieuRendu).includes('ronde SURV')
        && R.programmeRendu >= 1 && R.equipeRendue >= 1,
        JSON.stringify(R).slice(0, 400));

      // ── Le contrôle du défaut ──
      verifier('le sélecteur de validateur liste les validateurs du module, refuse sans choix, et la soumission désigne celui qui a été retenu',
        S.selecteur === true
        // Le défaut : la liste était **toujours vide**, le champ `role_m3`
        // n'existant pas sur la route interrogée.
        && S.validateursOfferts >= 1
        // Sans choix, le sélecteur reste et rien ne part.
        && S.refusSansChoix === true && S.statutApresRefus === 'brouillon'
        // Renoncer ne décide rien.
        && S.ferme === true && S.statutApresRenoncement === 'brouillon'
        // Et avec un choix, la notification est soumise au nom de ce validateur.
        && S.statut === 'soumis' && !!S.validateurRetenu
        && S.validateurEnBase === S.validateurRetenu && S.dateSoumission === true,
        JSON.stringify(S).slice(0, 520));

      verifier('le renvoi fait reculer le circuit avec son motif, et la notification resoumise se valide puis se transmet',
        X.ongletSoumis >= 1
        && X.apercu === true && X.apercuPorteLaReference === true
        && X.apercuOffreValider === true
        // La seule étape qui recule, et elle exige un motif.
        && X.renvoiDemandeUnMotif === true
        && X.statutApresRenvoi === 'brouillon'
        && String(X.motifPorte).includes('motif de la ronde')
        && X.statutResoumis === 'soumis'
        && X.statutValide === 'valide' && !!X.validateurDeLActe && X.dateValidation === true
        && X.boutonTransmettre === true
        && X.statutEnvoye === 'envoye' && X.dateEnvoi === true && !!X.envoyePar,
        JSON.stringify(X).slice(0, 560));

      verifier('le volet d’une ligne transmise se déplie sur ses trois champs, et le fil d’échange refuse un message vide avant de porter le vrai',
        E.ligne === true && E.repliéAvant === true && E.deplie === true
        && E.champsAccord === 3
        && E.filOuvert === true
        // Vide, rien ne part ; écrit, il part.
        && E.apresVide === E.avantMessage
        && E.apresMessage === E.avantMessage + 1
        && String(E.dernier).includes('message de la ronde'),
        JSON.stringify(E).slice(0, 560));

      verifier('l’accord arrête les dates et le périmètre convenus, et ferme l’étape : la ligne quitte l’onglet des envoyés',
        // Le circuit refait, puisque l'annulation l'avait ramené au brouillon.
        E.statutRefait === 'envoye'
        && E.boutonAccord === true
        && E.accordDebut === '2026-11-24' && E.accordFin === '2026-11-26'
        && E.accordPerimetre === true
        // `validate-accord` porte le statut à `acte`…
        && E.statutApresAccord === 'acte'
        // …et l'onglet écarte délibérément les `acte` : l'étape est close.
        && E.ligneQuitteLOnglet === true,
        JSON.stringify({ refait: E.statutRefait, bouton: E.boutonAccord,
          debut: E.accordDebut, fin: E.accordFin, perimetre: E.accordPerimetre,
          statut: E.statutApresAccord, quitte: E.ligneQuitteLOnglet }));

      verifier('une notification transmise s’annule et redevient brouillon — renoncer à l’invite ne décide rien, le motif est porté',
        E.annulationOfferteSurEnvoyee === true
        && E.annulationDemandeUnMotif === true
        // Renoncer n'annule rien : la notification reste transmise.
        && E.statutApresRenoncement === 'envoye'
        && E.statutApresAnnulation === 'brouillon'
        && String(E.motifAnnulation).includes('Report demandé'),
        JSON.stringify({ offerte: E.annulationOfferteSurEnvoyee, invite: E.annulationDemandeUnMotif,
          apresRenoncement: E.statutApresRenoncement, apres: E.statutApresAnnulation,
          motif: E.motifAnnulation }));

      verifier('ramenée au brouillon, la notification s’efface sur confirmation — son refus ne l’efface pas —, et l’activité du plan redevient « à notifier »',
        M.bouton === true && M.confirmation === true
        && M.resteApresRefus === true
        && M.partie === true
        // L'activité redevient notifiable : c'est `plans-valides` qui l'exclut
        // tant qu'une notification la porte.
        && M.activiteRendue === true,
        JSON.stringify(M));
    }

    // ── Pourquoi ce bloc vient **avant** la ronde du dossier ──
    //
    // L'onglet « à notifier » liste les activités d'un plan validé que nulle
    // notification ne porte encore. Placé après les autres rondes, ce bloc le
    // trouvait **vide** : elles avaient consommé les deux activités du jeu
    // d'essai, et chacun de ses douze contrôles rougissait sur une cause qui
    // n'était pas la sienne.
    //
    // Il part donc du magasin vierge — ce que le premier contrôle de cette suite
    // atteste —, et il **rend ce qu'il prend** : son dernier contrôle exige que
    // l'activité redevienne notifiable. *Une ronde qui ne rend pas ce qu'elle a
    // pris fait rougir celles qui la suivent, et c'est la leçon que son
    // emplacement a coûtée.*
    etape = 'ronde du dossier';
    const M = '/api/m/execution';
    const chaine = await page.evaluate(async (api) => {
      const env = async (url, methode, corps) => {
        const r = await fetch(url, {
          method: methode,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await r.json(); } catch { /* corps vide */ }
        return { statut: r.status, corps: b };
      };
      const plans = await (await fetch(`${api}/plans-valides`, { credentials: 'same-origin' })).json();
      const plan = (plans || []).find((p) => (p.activites || []).length);
      if (!plan) return { plan: false };
      const a = plan.activites[0];
      const n = await env(`${api}/notifications`, 'POST', {
        activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
        objet: 'SURV 0.c — ronde de couverture', type_supervision: 'Audit',
        date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
        lieu: 'Siège', perimetre: 'Ensemble des processus',
      });
      if (n.statut !== 201) return { plan: true, notif: n.statut };
      const notifId = n.corps.id;
      const pas = {};
      for (const etapeNotif of ['submit', 'validate', 'send']) {
        /* eslint-disable no-await-in-loop */
        pas[etapeNotif] = (await env(`${api}/notifications/${notifId}/${etapeNotif}`, 'PUT')).statut;
      }
      const accord = await env(`${api}/notifications/${notifId}/validate-accord`, 'PUT', {
        date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03',
      });
      const dossierId = (accord.corps || {}).dossier_id;
      // ── **Deux** constatations, et c'est la validation du rapport qui l'exige ──
      //
      // La ronde n'en créait qu'une. Elle servait deux fins : ouvrir le volet du
      // dossier, et éprouver sa propre suppression. Les deux ont cessé de tenir
      // ensemble le jour où la ronde a validé le rapport : **valider fait sortir
      // la constatation de « En Préparation »**, et le bouton qui l'efface part
      // avec elle. Mesuré — `{"bouton":false}` — sur un geste qui marche.
      //
      // Deux constatations donc : l'une s'efface avant qu'on ouvre le volet,
      // l'autre porte la ligne qui l'ouvre.
      const fnc = await env(`${api}/constatations`, 'POST', {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'majeur',
        description: 'SURV 0.c — écart qui ouvre le volet.',
      });
      const fncJetable = await env(`${api}/constatations`, 'POST', {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'mineur',
        description: 'SURV 0.c — écart que la ronde efface.',
      });
      return {
        plan: true, notifId, pas, accord: accord.statut, dossierId,
        fnc: fnc.statut, fncId: (fnc.corps || {}).id, fncStatut: (fnc.corps || {}).statut,
        fncJetable: (fncJetable.corps || {}).id,
      };
    }, M);
    verifier('la chaîne d’un dossier se construit : notification, accord, constatation',
      chaine.plan && chaine.pas && Object.values(chaine.pas).every((c) => c === 200)
      && chaine.accord === 200 && !!chaine.dossierId
      && chaine.fnc === 201 && chaine.fncStatut === 'brouillon',
      JSON.stringify(chaine));

    if (chaine.fncId) {
      // Le module garde ses données en mémoire : un changement de page ne les
      // relit pas. On recharge l'écran — mesuré, et non supposé : la première
      // écriture de cette ronde changeait de page et mesurait une table vide.
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
      await page.waitForFunction(
        () => {
          const el = document.getElementById('exec-content');
          return el && el.textContent.trim().length > 200;
        },
        { timeout: 20000 },
      ).catch(() => {});

      const enPreparation = await page.evaluate(async () => {
        document.querySelector('.nav-btn[data-page="constatations"]').click();
        await new Promise((r) => setTimeout(r, 2000));
        const onglets = [...document.querySelectorAll('.exec-tab')]
          .map((b) => (b.getAttribute('onclick') || '').match(/currentConstSub='(\w+)'/))
          .filter(Boolean).map((m) => m[1]);
        const bouton = [...document.querySelectorAll('.exec-tab')]
          .find((x) => /currentConstSub='list'/.test(x.getAttribute('onclick') || ''));
        if (!bouton) return { onglets, sousOnglet: false };
        bouton.click();
        await new Promise((r) => setTimeout(r, 1800));
        const contenu = document.getElementById('exec-content');
        return {
          onglets,
          sousOnglet: true,
          notre: contenu.textContent.includes('SURV 0.c'),
          versDossier: document.querySelectorAll('[onclick^="execOpenDossierSlider"]').length,
          effacer: document.querySelectorAll('[onclick^="execDeleteConstatation"]').length,
        };
      });
      verifier('le sous-onglet « En Préparation » montre les constatations du dossier',
        enPreparation.sousOnglet && enPreparation.onglets.length === 3
        && enPreparation.notre && enPreparation.versDossier >= 2 && enPreparation.effacer >= 2,
        JSON.stringify(enPreparation));

      // ── Deux bascules de la page, chacune dans les deux sens ──
      //
      // *Une bascule qui s'allume sans s'éteindre passe un contrôle
      // unilatéral* — la leçon du portail (5.c.11), payée deux fois là-bas.
      // ── L'état se lit par la **classe qui le porte**, non par la chaîne entière ──
      //
      // Premier jet : comparaison de `className` d'un bout à l'autre. Rouge sur
      // un geste qui marche — la chaîne de départ portait une espace de fin que
      // le redessin ne remet pas. *Une assertion sur une chaîne entière mesure
      // aussi ce qui n'a pas de sens.*
      const bascules = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const replieEtat = () => !!document.querySelector('.app-layout')?.classList.contains('sidebar-collapsed');
        const presser = async () => {
          const b = document.querySelector('[onclick^="execToggleSidebar"]');
          if (!b) return null;
          b.click();
          await attendre(900);
          return replieEtat();
        };
        const depart = replieEtat();
        const apresUn = await presser();
        const apresDeux = await presser();
        return { depart, apresUn, apresDeux };
      });
      verifier('la barre latérale de SURV se replie et se déplie',
        bascules.apresUn === !bascules.depart && bascules.apresDeux === bascules.depart,
        JSON.stringify(bascules));

      const filtre = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const lignes = () => document.querySelectorAll('#exec-content table tbody tr').length;
        const depart = lignes();
        const t = [...document.querySelectorAll('[onclick]')]
          .find((e) => /filters\.trimestre='1'/.test(e.getAttribute('onclick') || ''));
        if (!t) return { bouton: false };
        t.click();
        await attendre(1500);
        const filtre1 = lignes();
        document.querySelector('[onclick^="execResetFilters"]')?.click();
        await attendre(1500);
        return { bouton: true, depart, filtre1, remis: lignes() };
      });
      verifier('un filtre de trimestre restreint la table, et la remise à zéro la rend',
        filtre.bouton && filtre.remis === filtre.depart && filtre.filtre1 <= filtre.depart,
        JSON.stringify(filtre));

      // ── L'écriture, et son retour en arrière dans le même geste ──
      //
      // `execDeleteConstatation` demande confirmation par le widget du socle. On
      // presse « oui », puis l'on demande au **serveur** si la constatation est
      // partie : ce que l'écran montre doit être ce qui est enregistré, non ce
      // qu'il espère.
      //
      // ── Et pourquoi ces trois contrôles passent **avant** le volet ──
      //
      // Ils étaient après, et deux sont tombés le jour où la ronde a validé le
      // rapport : la validation fait sortir la constatation de « En Préparation »,
      // donc la table perd une ligne et le bouton d'effacement disparaît. Les
      // deux rouges portaient sur des gestes qui marchent.
      //
      // *Un contrôle dont la précondition est l'état de la page doit passer avant
      // ce qui change cet état.* L'ordre d'une ronde fait partie de la ronde —
      // c'est la même leçon que l'ordre d'un relevé, apprise en 5.f.6 sur le
      // ménage qui masquait un rapport.
      const effacement = await page.evaluate(async (ctx) => {
        // ── Le bouton se désigne par **l'identifiant qu'il porte** ──
        //
        // Deux essais avant celui-ci, et les deux disaient quelque chose :
        //
        //   · « la dernière ligne, puisque la jetable a été créée en second » —
        //     faux, la table trie par date **décroissante**, et c'est l'autre qui
        //     est partie. Vert sur « il en reste une », faux sur *laquelle* ;
        //     seule l'assertion ajoutée par prudence l'a dit ;
        //   · « la ligne dont le texte porte la description » — la ligne est
        //     trouvée, et le bouton n'y est pas : chaque constatation occupe
        //     **deux** `<tr>`, le résumé qui porte les actions et le détail,
        //     masqué, qui porte le texte.
        //
        // L'identifiant, lui, ne dépend ni d'un tri ni d'une mise en page : la
        // ronde sait quelle constatation elle a créée, et le balisage le nomme
        // dans son `onclick`. *Désigner par ce qu'on a créé, non par où cela
        // s'affiche.*
        const b = document.querySelector(`[onclick^="execDeleteConstatation('${ctx.jetable}'"]`);
        if (!b) return { bouton: false, cherche: ctx.jetable };
        b.click();
        await new Promise((r) => setTimeout(r, 600));
        const oui = document.querySelector('.oasis-confirm-oui');
        if (!oui) return { bouton: true, confirmation: false };
        oui.click();
        await new Promise((r) => setTimeout(r, 2200));
        const r = await fetch(`${ctx.api}/constatations`, { credentials: 'same-origin' });
        const liste = r.ok ? await r.json() : [];
        return {
          bouton: true,
          confirmation: true,
          // Il en restait deux : celle qui ouvre le volet doit survivre.
          restantes: (liste || []).filter((c) => (c.description || '').includes('SURV 0.c')).length,
          jetableEncore: (liste || []).some((c) => (c.description || '').includes('que la ronde efface')),
        };
      }, { api: M, jetable: chaine.fncJetable });
      verifier('une constatation s’efface par son geste, et le serveur ne la porte plus',
        effacement.bouton && effacement.confirmation
        && effacement.restantes === 1 && effacement.jetableEncore === false,
        JSON.stringify(effacement));


      // ── Le volet du dossier, geste par geste ──
      //
      // Les sélecteurs viennent d'une mesure, non d'une lecture : la première
      // écriture de cette séquence cherchait `.real-prog-objet` et le corps du
      // volet par `[class*="slider"]`, et les deux rendaient **zéro** — un
      // contrôle qui aurait passé en ne regardant rien. Le programme est un
      // `#realisation_programme_table`, le volet un `#execSlider`.
      const volet = await page.evaluate(async (dossierId) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const corps = () => (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        const b = document.querySelector('[onclick^="execOpenDossierSlider"]');
        if (!b) return { bouton: false };
        b.click();
        await attendre(3000);
        const r = { bouton: true, ouvert: !!document.getElementById('execSlider') };
        r.etapes = document.querySelectorAll('[onclick^="execSwitchDossierStep"]').length;

        // 1. L'étape « Notification » redessine le volet, et le retour le redessine.
        const avant = corps();
        document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="notification"]')?.click();
        await attendre(1600);
        const surNotification = corps();
        document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="realisation"]')?.click();
        await attendre(1600);
        r.pas = { avant, surNotification, revenu: corps() };

        // ── Le geste de fermeture s'éprouve **ici**, et pas à la fin ──
        //
        // Il l'était à la fin, jusqu'à ce que la ronde aille jusqu'à la clôture :
        // `execCloseDossier` referme le volet lui-même, et le geste n'était plus
        // pressé par personne — la couverture a perdu un nom sans qu'aucun
        // contrôle ne tombe.
        //
        // *Un geste couvert par effet de bord n'est pas un geste couvert.* On le
        // presse donc tant que la ligne qui réouvre le volet est là : après la
        // validation du rapport, la constatation quitte « En Préparation » et
        // cette ligne disparaît.
        document.querySelector('[onclick^="execCloseSlider"]')?.click();
        await attendre(1300);
        r.fermeParSonGeste = !document.getElementById('execSlider');
        document.querySelector('[onclick^="execOpenDossierSlider"]')?.click();
        await attendre(3000);
        r.reouvert = !!document.getElementById('execSlider');

        // 1 ter. Le sélecteur de checklists : ouvert, annulé, puis ouvert et **validé**
        //
        // Le jeu d'essai porte deux modèles de checklist ; le sélecteur n'en
        // propose qu'un, et le dit : *« filtrées par le secteur de l'activité
        // (1 disponible) »*. Le filtre vient du secteur du prestataire du
        // dossier, et le contrôle ne suppose donc **aucun nombre** : il exige
        // qu'il y en ait au moins un, et coche le premier.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        r.picker = !!document.querySelector('[onclick^="shellCloseModal"]');
        r.casesProposees = document.querySelectorAll('.picker-chk-cb').length;
        document.querySelector('[onclick^="shellCloseModal"]')?.click();
        await attendre(900);
        r.pickerReferme = !document.querySelector('[onclick^="shellCloseModal"]');

        // Annulé, rien ne doit avoir été retenu — c'est l'autre moitié du geste,
        // et celle qu'un contrôle unilatéral oublie.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        const cases = [...document.querySelectorAll('.picker-chk-cb')];
        if (cases[0]) {
          cases[0].checked = true;
          r.checklistCochee = cases[0].value;
          document.querySelector('[onclick^="execSaveChecklistsPicker"]')?.click();
          await attendre(3000);
        }
        r.gestesDeChecklist = [...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)\s*\(/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean).filter((n, i, a) => a.indexOf(n) === i);
        const retenues = async () => {
          const d = await (await fetch(`/api/m/execution/dossiers/${dossierId}`, { credentials: 'same-origin' })).json();
          try { return JSON.parse(d.realisation_checklists || '[]'); } catch { return null; }
        };
        r.retenuesApresChoix = await retenues();

        // ── Le retrait, ici et pas à la rédaction ──
        //
        // Son bouton n'existe **qu'à l'étape Réalisation** : relevé à la
        // rédaction, il n'y est pas. Le premier jet l'y cherchait et rendait
        // « bouton absent » sur un geste qui marche, trois étapes plus loin.
        const retirer = document.querySelector('[onclick^="execRemoveDossierChecklist"]');
        r.boutonRetirer = !!retirer;
        if (retirer) {
          retirer.click();
          await attendre(700);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.retraitConfirme = !!oui;
          if (oui) { oui.click(); await attendre(3000); }
        }
        r.retenuesApresRetrait = await retenues();

        // Et l'on en retient une de nouveau : la rédaction a besoin d'une
        // checklist pour que son geste de validation existe.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        const encore = [...document.querySelectorAll('.picker-chk-cb')];
        if (encore[0]) {
          encore[0].checked = true;
          document.querySelector('[onclick^="execSaveChecklistsPicker"]')?.click();
          await attendre(3000);
        }

        // ── Le remplisseur de checklist : 141 items, 31 regroupements ──
        //
        // C'est le plus gros morceau du volet, et un éditeur **plein écran** :
        // il se superpose à tout, replie la barre du portail et mémorise son
        // état pour le restaurer en partant.
        //
        // Les chiffres ci-dessous ne sont pas écrits en dur : le contrôle exige
        // qu'il y ait des items et des regroupements, et compare les états
        // **entre eux**. Le jeu d'essai en porte 141 et 31 aujourd'hui ; un
        // modèle de checklist changé ne doit pas faire rougir une mesure de
        // pliage.
        const ouvrirRemplisseur = document.querySelector('[onclick^="execOpenChecklistFiller"]');
        r.boutonRemplisseur = !!ouvrirRemplisseur;
        if (ouvrirRemplisseur) {
          ouvrirRemplisseur.click();
          await attendre(4500);
          const groupes = (sel) => document.querySelectorAll(`#execChkFillerGroups details.exec-chk-grp${sel || ''}`).length;
          const lignesVisibles = () => [...document.querySelectorAll('#execChkFillerGroups tr[data-item-id]')]
            .filter((tr) => tr.style.display !== 'none').length;
          r.remplisseur = {
            wrap: !!document.getElementById('execChkFillerWrap'),
            items: document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').length,
            groupes: groupes(),
          };

          // Tout déplier, tout plier : les deux sens, comme toute bascule.
          document.querySelector('[onclick^="execChkFillExpandAll(true)"]')?.click();
          await attendre(1200);
          r.remplisseur.ouvertsApresDepliage = groupes('[open]');
          document.querySelector('[onclick^="execChkFillExpandAll(false)"]')?.click();
          await attendre(1200);
          r.remplisseur.ouvertsApresPliage = groupes('[open]');
          document.querySelector('[onclick^="execChkFillExpandAll(true)"]')?.click();
          await attendre(1200);

          // La recherche : un terme qui ne peut rien trouver, puis le retour.
          const champ = document.getElementById('execChkFillSearch');
          if (champ) {
            r.remplisseur.avantRecherche = lignesVisibles();
            champ.value = 'zzzz-aucun-item-ne-porte-ceci';
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            await attendre(1200);
            r.remplisseur.apresRecherche = lignesVisibles();
            champ.value = '';
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            await attendre(1200);
            r.remplisseur.apresRemise = lignesVisibles();
          }

          // Un statut renseigné. Le geste est un **écouteur délégué** sur le
          // conteneur des regroupements : le relevé des gestes le nomme
          // `groupsEl:change` et le tient pour **indécidable**, sa cible étant
          // une variable locale sans identifiant. Exercé ici malgré tout — un
          // geste qu'on ne sait pas rapprocher n'est pas un geste qu'on renonce
          // à éprouver.
          const statut = document.querySelector('#execChkFillerGroups .exec-chk-fill-statut');
          if (statut) {
            const choix = [...statut.options]
              .find((o) => /satisfaisant/i.test(o.textContent) && !/non/i.test(o.textContent))
              || statut.options[0];
            statut.value = choix.value;
            r.reponse = { item: statut.dataset.item, statut: choix.value };
            statut.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2800);
          }
          const reponses = await (await fetch('/api/m/execution/exec-checklist-responses', { credentials: 'same-origin' })).json();
          r.reponsesEnBase = (reponses || [])
            .filter((x) => x.dossier_id === dossierId)
            .map((x) => ({ item: x.item_id, statut: x.statut_id }));

          // ── Un item « non satisfaisant » engendre une constatation ──
          //
          // Le bouton de génération est rendu pour **chaque** item, mais masqué
          // tant que le statut n'est pas non satisfaisant. On ne devine pas
          // lequel l'est : l'écran garde sa propre notion dans
          // `_execChkFillerCtx.nonSatIds`, et c'est elle qu'on lit. Deviner
          // d'après un libellé reviendrait à éprouver ma lecture du français,
          // non la règle de l'écran.
          const ctxFiller = window._execChkFillerCtx || {};
          const nonSat = (ctxFiller.nonSatIds || [])[0];
          r.nonSatConnu = !!nonSat;
          const second = [...document.querySelectorAll('#execChkFillerGroups .exec-chk-fill-statut')]
            .find((sel) => sel.dataset.item !== (r.reponse || {}).item);
          if (nonSat && second) {
            const item2 = second.dataset.item;
            const bouton = () => document.querySelector(
              `#execChkFillerGroups .exec-chk-gen-btn[data-item="${item2}"]`);
            r.genAvant = !!bouton() && bouton().style.display === 'none';
            second.value = nonSat;
            second.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2500);
            r.genVisible = !!bouton() && bouton().style.display !== 'none';

            // Le geste demande confirmation : elle est pressée, comme partout
            // ailleurs dans cette ronde.
            bouton()?.click();
            await attendre(800);
            document.querySelector('.oasis-confirm-oui')?.click();
            await attendre(3500);
            r.itemEngendre = item2;
            r.genDesactive = !!bouton() && bouton().disabled === true;
            const consts = await (await fetch('/api/m/execution/constatations', { credentials: 'same-origin' })).json();
            r.constatationEngendree = (consts || [])
              .filter((c) => c.checklist_item_id === item2)
              .map((c) => ({ cas: c.cas_type || '', liee: c.checklist_item_id, dossier: c.dossier_id }));
            // Diagnostic : combien de dossiers le bac porte-t-il à cet instant,
            // et lesquels ? Le contrôle a rougi en annonçant deux dossiers là où
            // la ronde n'en construit qu'un.
            const dos = await (await fetch('/api/m/execution/dossiers', { credentials: 'same-origin' })).json();
            r.dossiersAuFiller = (dos || []).map((d) => d.id);
            r.constatationsAuFiller = (consts || []).length;
          }

          document.querySelector('[onclick^="execCloseChecklistFiller"]')?.click();
          await attendre(2000);
          r.remplisseurReferme = !document.getElementById('execChkFillerWrap');
        }


        // 2. Un membre d'équipe, une ligne de programme.
        //
        // ── Après les checklists, et c'est mesuré ──
        //
        // Ce bloc était **avant** le sélecteur de checklists. Son enregistrement
        // a aussitôt rendu une équipe **vide** : valider le sélecteur redessine
        // le volet, et la ligne d'équipe ajoutée plus tôt partait avec. Le
        // contrôle de l'équipe est tombé — sur un geste qui marche.
        //
        // *Un geste qui redessine efface ce que les précédents ont saisi.* Dans
        // une ronde, ce qui se saisit vient donc **après** ce qui redessine.
        r.equipeAvant = document.querySelectorAll('.real-equipe-nom').length;
        document.querySelector('[onclick^="execAddRealisationEquipeMember"]')?.click();
        await attendre(600);
        r.equipeApres = document.querySelectorAll('.real-equipe-nom').length;
        // ── Le programme : une **ligne de saisie**, non une ligne de plus ──
        //
        // Mesuré : la table porte déjà une ligne, celle du message « aucune
        // ligne » (`#real_prog_empty`), et le geste la **remplace**. Compter les
        // lignes rendait donc 1 avant et 1 après, et l'assertion « une de plus »
        // était fausse — fausse sur un geste qui marche.
        //
        // Ce qu'on mesure est donc ce qui compte : le message part, et la ligne
        // neuve porte ses champs de saisie.
        r.progVideAvant = !!document.getElementById('real_prog_empty');
        r.progSaisieAvant = document.querySelectorAll('#realisation_programme_table tbody [data-field="date"]').length;
        document.querySelector('[onclick^="execAddRealisationProgrammeLine"]')?.click();
        await attendre(600);
        r.progVideApres = !!document.getElementById('real_prog_empty');
        r.progSaisieApres = document.querySelectorAll('#realisation_programme_table tbody [data-field="date"]').length;

        // 4. L'inspecteur choisi, puis l'enregistrement de la réalisation.
        const sel = document.querySelector('.real-equipe-nom');
        const opt = sel ? [...sel.options].find((o) => o.value) : null;
        if (sel && opt) { sel.value = opt.value; r.inspecteur = opt.value; }
        document.querySelector('[onclick^="execSaveRealisation"]')?.click();
        await attendre(2600);
        return r;
      }, chaine.dossierId);
      verifier('le volet du dossier s’ouvre, et changer d’étape le redessine',
        volet.bouton && volet.ouvert && volet.etapes >= 2
        && volet.pas.avant > 0 && volet.pas.surNotification !== volet.pas.avant,
        JSON.stringify(volet.pas || {}));
      verifier('le volet se referme par son geste, et la ligne le réouvre',
        volet.fermeParSonGeste === true && volet.reouvert === true,
        JSON.stringify({ ferme: volet.fermeParSonGeste, reouvert: volet.reouvert }));
      verifier('un membre d’équipe et une ligne de programme s’ajoutent au volet',
        volet.equipeApres === volet.equipeAvant + 1
        && volet.progVideAvant === true && volet.progVideApres === false
        && volet.progSaisieApres === volet.progSaisieAvant + 1,
        JSON.stringify({
          equipe: [volet.equipeAvant, volet.equipeApres],
          messageVide: [volet.progVideAvant, volet.progVideApres],
          champsDeSaisie: [volet.progSaisieAvant, volet.progSaisieApres],
        }));
      verifier('le sélecteur de checklists s’ouvre, propose les modèles du secteur, et se referme',
        volet.picker === true && volet.pickerReferme === true && volet.casesProposees >= 1,
        JSON.stringify({ ouvert: volet.picker, referme: volet.pickerReferme, cases: volet.casesProposees }));

      // ══════════════════════════════════════════════════════════════════
      //  « Exporter PDF » de la fiche de notification (ADR-003, 5.f.74)
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Le geste qui n'a jamais rien exporté ──
      //
      // `execGenerateNotificationPdf` appelait `GET …/notifications/:id/pdf` —
      // **route qui n'existe pas** : aucune n'est montée sous ce chemin, et il
      // n'y a pas de route générique qui l'attrape. L'appel rendait donc
      // toujours un 404, le geste tombait toujours dans son repli — l'aperçu, et
      // « imprimez avec Ctrl-P » —, et son libellé promettait ce qu'il ne
      // faisait pas. Sa seconde branche attendait un `notification_pdf_path` que
      // rien n'écrit nulle part dans le dépôt.
      //
      // Le relevé disait qu'aucune ronde ne l'avait jamais exercé (n° 5.f.71).
      // *C'est l'unique raison pour laquelle le 404 n'avait jamais été vu* : le
      // contrôle de la console de cette suite l'aurait relevé au premier clic.
      //
      // Le module n'a jamais produit de PDF au serveur : sa convention est de
      // composer un document dans le client et de l'ouvrir en fenêtre, avec son
      // impression. Le geste la suit désormais, et ce bloc mesure **le produit**
      // — comme celui du rapport, et pour la même raison : un relais mesure le
      // geste jusqu'à la porte, jamais au-delà.
      etape = 'document de la fiche';
      const ficheDoc = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        // Le volet est ouvert à l'étape « Réalisation » : le bouton est à
        // l'étape « Notification ».
        document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="notification"]')?.click();
        await attendre(2000);
        const bouton = document.querySelector('[onclick^="execGenerateNotificationPdf"]');
        r.bouton = !!bouton;
        // *Et l'ancre de l'ancienne branche morte n'est plus là* : elle visait un
        // champ que rien n'écrit, et elle portait un `download` — le patron que
        // le garde de forme interdit.
        r.ancreMorte = !!document.querySelector('#execSlider a[download][href*="notification"]');
        if (!bouton) return r;

        const recus = [];
        const vraiOpen = window.open;
        window.open = () => {
          const doc = { html: '' };
          recus.push(doc);
          return {
            document: { write: (h) => { doc.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        try {
          bouton.click();
          await attendre(3000);
        } finally {
          window.open = vraiOpen;
        }
        r.documents = recus.length;
        const doc = recus[0];
        if (doc) {
          const porte = (motif) => new RegExp(motif).test(doc.html || '');
          r.doc = {
            complet: porte('<!DOCTYPE html>') && porte('</html>'),
            titre: (/<title>([^<]*)<\/title>/.exec(doc.html) || [])[1] || '',
            contenu: porte('id="fiche-content"'),
            // Le corps de la fiche lui-même, et non une page vide : le bloc
            // `official-doc-page` et le titre du document officiel.
            fiche: porte('official-doc-page') && porte('fiche-notification'),
            titreOfficiel: porte('Fiche de notification d.activité de surveillance'),
            // Les feuilles du module, par lien et non recopiées : une seconde
            // copie en JavaScript divergerait au premier ajustement.
            feuilles: (doc.html.match(/<link rel="stylesheet"/g) || []).length,
            feuilleFiche: porte('exec-processus\\.css'),
            feuilleImpression: porte('exec-impression\\.css'),
            // Les deux gestes que le document porte lui-même.
            imprimer: porte('onclick="window\\.print\\(\\)"'),
            fermer: porte('onclick="window\\.close\\(\\)"'),
            // Le bouton passe `autoPrint` : l'écouteur est donc là.
            ecouteurImpression: porte("addEventListener\\('load'"),
            taille: (doc.html || '').length,
          };
        }
        // Le volet est rendu à l'étape où la ronde l'avait laissé.
        document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="realisation"]')?.click();
        await attendre(1600);
        r.revenuARealisation = !!document.querySelector('#realisation_programme_table');
        return r;
      });

      verifier('le geste « Exporter PDF » de la fiche compose un document, et l’ancre morte a disparu du volet',
        ficheDoc.bouton === true && ficheDoc.ancreMorte === false
        && ficheDoc.documents === 1
        && !!ficheDoc.doc && ficheDoc.doc.complet === true
        && ficheDoc.doc.contenu === true && ficheDoc.doc.taille > 2000,
        JSON.stringify({ bouton: ficheDoc.bouton, ancre: ficheDoc.ancreMorte,
          documents: ficheDoc.documents, doc: ficheDoc.doc }));

      verifier('le document porte la fiche elle-même, son titre officiel, et les feuilles du module par lien',
        !!ficheDoc.doc && ficheDoc.doc.fiche === true
        && ficheDoc.doc.titreOfficiel === true
        && ficheDoc.doc.titre.length > 0
        && ficheDoc.doc.feuilles >= 4
        && ficheDoc.doc.feuilleFiche === true && ficheDoc.doc.feuilleImpression === true,
        JSON.stringify({ fiche: ficheDoc.doc && ficheDoc.doc.fiche,
          titre: ficheDoc.doc && ficheDoc.doc.titre,
          officiel: ficheDoc.doc && ficheDoc.doc.titreOfficiel,
          feuilles: ficheDoc.doc && ficheDoc.doc.feuilles }));

      verifier('et il porte ses propres gestes — imprimer, fermer, et l’écouteur que « autoPrint » ajoute',
        !!ficheDoc.doc && ficheDoc.doc.imprimer === true && ficheDoc.doc.fermer === true
        && ficheDoc.doc.ecouteurImpression === true
        && ficheDoc.revenuARealisation === true,
        JSON.stringify({ imprimer: ficheDoc.doc && ficheDoc.doc.imprimer,
          fermer: ficheDoc.doc && ficheDoc.doc.fermer,
          ecouteur: ficheDoc.doc && ficheDoc.doc.ecouteurImpression,
          revenu: ficheDoc.revenuARealisation }));

      verifier('la checklist retenue dans le sélecteur est enregistrée sur le dossier',
        !!volet.checklistCochee
        && Array.isArray(volet.retenuesApresChoix)
        && volet.retenuesApresChoix.includes(volet.checklistCochee),
        JSON.stringify({ cochee: volet.checklistCochee, retenues: volet.retenuesApresChoix }));
      verifier('la checklist retenue ouvre ses deux gestes dans le volet',
        (volet.gestesDeChecklist || []).includes('execOpenChecklistFiller')
        && (volet.gestesDeChecklist || []).includes('execRemoveDossierChecklist'),
        (volet.gestesDeChecklist || []).join(', '));
      verifier('le remplisseur de checklist s’ouvre, avec ses items et ses regroupements',
        volet.boutonRemplisseur === true && volet.remplisseur
        && volet.remplisseur.wrap === true
        && volet.remplisseur.items > 0 && volet.remplisseur.groupes > 0,
        JSON.stringify(volet.remplisseur || { bouton: volet.boutonRemplisseur }));
      verifier('« tout déplier » et « tout plier » agissent sur tous les regroupements',
        !!volet.remplisseur
        && volet.remplisseur.ouvertsApresDepliage === volet.remplisseur.groupes
        && volet.remplisseur.ouvertsApresPliage === 0,
        JSON.stringify(volet.remplisseur
          ? { groupes: volet.remplisseur.groupes, deplies: volet.remplisseur.ouvertsApresDepliage,
            plies: volet.remplisseur.ouvertsApresPliage } : {}));
      verifier('la recherche du remplisseur restreint les items, et sa remise à zéro les rend',
        !!volet.remplisseur
        && volet.remplisseur.avantRecherche > 0
        && volet.remplisseur.apresRecherche === 0
        && volet.remplisseur.apresRemise === volet.remplisseur.avantRecherche,
        JSON.stringify(volet.remplisseur
          ? { avant: volet.remplisseur.avantRecherche, pendant: volet.remplisseur.apresRecherche,
            apres: volet.remplisseur.apresRemise } : {}));
      verifier('un statut renseigné dans le remplisseur est enregistré, et le serveur le porte',
        !!volet.reponse
        && (volet.reponsesEnBase || []).some((x) => x.item === volet.reponse.item
          && x.statut === volet.reponse.statut),
        JSON.stringify({ attendu: volet.reponse, enBase: volet.reponsesEnBase }));
      verifier('un statut non satisfaisant fait paraître le geste qui engendre une constatation',
        volet.nonSatConnu === true && volet.genAvant === true && volet.genVisible === true,
        JSON.stringify({ nonSatConnu: volet.nonSatConnu, masqueAvant: volet.genAvant,
          visibleApres: volet.genVisible }));
      verifier('la constatation engendrée depuis un item est portée par le serveur, et liée à cet item',
        !!volet.itemEngendre
        && (volet.constatationEngendree || []).length === 1
        && /^Checklist —/.test(volet.constatationEngendree[0].cas)
        && volet.constatationEngendree[0].liee === volet.itemEngendre,
        JSON.stringify({ item: volet.itemEngendre, enBase: volet.constatationEngendree,
          dossiers: volet.dossiersAuFiller, constatations: volet.constatationsAuFiller }));
      verifier('le geste se referme sur lui-même : l’item pourvu ne peut plus en engendrer',
        volet.genDesactive === true,
        JSON.stringify({ desactive: volet.genDesactive }));

      verifier('le remplisseur se referme par son geste',
        volet.remplisseurReferme === true,
        JSON.stringify({ referme: volet.remplisseurReferme }));

      verifier('la checklist se retire du dossier par son geste, et le serveur ne la porte plus',
        volet.boutonRetirer === true && volet.retraitConfirme === true
        && Array.isArray(volet.retenuesApresRetrait) && volet.retenuesApresRetrait.length === 0,
        JSON.stringify({ bouton: volet.boutonRetirer, confirme: volet.retraitConfirme,
          apres: volet.retenuesApresRetrait }));

      // ── L'écriture de la réalisation, vérifiée **en base** ──
      //
      // Ce que l'écran montre doit être ce qui est enregistré, non ce qu'il
      // espère. On redemande donc le dossier au serveur.
      const enregistre = await page.evaluate(async (ctx) => {
        const r = await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' });
        const d = r.ok ? await r.json() : null;
        if (!d) return { dossier: false };
        let equipe = d.realisation_equipe;
        if (typeof equipe === 'string') { try { equipe = JSON.parse(equipe); } catch { equipe = null; } }
        return { dossier: true, equipe, noms: (equipe || []).map((m) => m.nom) };
      }, { api: M, id: chaine.dossierId });
      verifier('l’équipe de réalisation s’enregistre, et le serveur la porte',
        enregistre.dossier && !!volet.inspecteur
        && (enregistre.noms || []).includes(volet.inspecteur),
        JSON.stringify({ attendu: volet.inspecteur, ...enregistre }));

      // ══════════════════════════════════════════════════════════════════════
      //  Le dossier avance : terrain clos, rapport rédigé, dossier soumis
      // ══════════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi cela pouvait ne pas se faire, et pourquoi cela se fait ──
      //
      // En 5.f.4, `execCloseRealisation` avait été **laissé de côté** : il fait
      // avancer le dossier, et *une ronde dont le ménage dépend de l'état qu'elle
      // vient de changer n'est pas une ronde.* La prudence était juste ; la
      // mesure la lève.
      //
      // Mesuré, dans cet ordre : le terrain clos, le dossier passe à
      // « redaction » ; soumis, il passe à « validation » et devient `soumis` ;
      // et **il reste supprimable dans les deux états** (200), sa constatation
      // aussi. Le ménage de la ronde tient donc sur tout le cycle qu'elle
      // parcourt — ce n'était pas écrit nulle part, et aucune suite ne l'avait
      // éprouvé.
      const avance = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const confirmer = async () => {
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3800);
          return true;
        };
        const r = {};

        // 1. La clôture du terrain, confirmation pressée.
        document.querySelector('[onclick^="execCloseRealisation"]')?.click();
        await attendre(700);
        r.clotureConfirmee = await confirmer();
        r.etapesApresCloture = document.querySelectorAll('[onclick^="execSwitchDossierStep"]').length;

        // 1 bis. La checklist du dossier, validée puis retirée — à la rédaction,
        //        où l'onglet « Checklist et autres doc. » les porte.
        const valider = document.querySelector('[onclick^="execSetDossierChecklistValidee"]');
        r.boutonValiderChecklist = !!valider;
        if (valider) {
          valider.click();
          await attendre(700);
          r.checklistValideeConfirmee = await confirmer();
        }

        // 2. Une annexe, et l'objet de l'activité rédigé.
        r.annexeAvant = document.querySelectorAll('#execSlider [class*="annexe"]').length;
        document.querySelector('[onclick^="execAddAnnexeBlock"]')?.click();
        await attendre(800);
        r.annexeApres = document.querySelectorAll('#execSlider [class*="annexe"]').length;
        const objet = document.getElementById('dossier_objet_activite');
        r.objet = objet ? 'SURV 0.c — objet rédigé par la ronde.' : null;
        if (objet) objet.value = r.objet;
        document.querySelector('[onclick^="execSaveDossier"]')?.click();
        await attendre(2600);

        // ── 2 bis. Les exports : ce qu'ils fabriquent, et non ce qu'ils rendent ──
        //
        // Ces gestes ne parlent pas au serveur : ils composent le document dans
        // le navigateur, puis l'ouvrent par `window.open` ou le téléchargent par
        // une ancre sur un `Blob`. Il n'y a donc **pas de réponse HTTP** à
        // mesurer — c'était la méthode que j'avais annoncée à tort en 5.f.10.
        //
        // On capture donc le **produit** : `window.open` et
        // `URL.createObjectURL` sont relayés le temps des clics, et l'on
        // éprouve le document composé.
        //
        // ── Ce que cela ne prouve pas, et qui doit être dit ──
        //
        // Ni que le navigateur ouvre la fenêtre, ni qu'il enregistre le
        // fichier : seulement que le geste a fabriqué le bon document et l'a
        // remis au bon mécanisme. Le rendu et le téléchargement appartiennent au
        // navigateur, et un navigateur sans tête ne les fait pas comme un autre.
        // *Un relais mesure le geste jusqu'à la porte, jamais au-delà.*
        //
        // Les variantes **Word** de ces mêmes fiches ne sont pas cliquées ici :
        // elles posent `window.location.href` sur la pièce jointe, ce qui
        // emporterait la page et la ronde avec. Leur chemin passe par le
        // serveur, et il est éprouvé pour lui-même — huit contrôles sur le
        // dépôt éphémère, dans la suite HTTP.
        const relais = { fenetres: [], blobs: [] };
        const vraiOpen = window.open;
        const vraiURL = URL.createObjectURL;
        window.open = () => {
          const recu = { html: '' };
          relais.fenetres.push(recu);
          return {
            document: {
              write: (h) => { recu.html += String(h || ''); },
              close: () => {},
            },
            focus: () => {},
            print: () => {},
            close: () => {},
          };
        };
        URL.createObjectURL = (blob) => { relais.blobs.push(blob); return vraiURL.call(URL, blob); };

        const clic = async (prefixe) => {
          const b = document.querySelector(`#execSlider [onclick^="${prefixe}"]`);
          if (!b) return false;
          b.click();
          await attendre(1200);
          return true;
        };
        r.exports = {
          classeur: await clic('execExportConstatations'),
          fichesDuDossier: await clic('execFichesConstatDossier'),
          ficheConstat: await clic('execExportFicheConstat'),
          ficheSuivi: await clic('execExportFicheSuivi'),
        };
        // Les documents ouverts, dans l'ordre des clics.
        r.documentsOuverts = relais.fenetres.map((f) => ({
          longueur: f.html.length,
          html: /<html/i.test(f.html),
          tableau: /<table|<section|rubrique/i.test(f.html),
        }));
        // Et le classeur, lu dans son Blob — un `revokeObjectURL` ne détruit pas
        // l'objet, seulement son adresse.
        r.classeurs = [];
        for (const b of relais.blobs) {
          const texte = await b.text();
          r.classeurs.push({
            type: b.type, longueur: texte.length,
            lignes: texte.trim().split('\n').length,
            tabulations: (texte.match(/\t/g) || []).length,
            // Un classeur bien formé a autant de colonnes à chaque ligne que
            // dans son en-tête. C'est une propriété de la table, et non de son
            // contenu — elle ne se dément pas si le jeu d'essai change.
            colonnes: texte.trim().split('\n').map((l) => l.split('\t').length),
          });
        }
        window.open = vraiOpen;
        URL.createObjectURL = vraiURL;

        // 3. La soumission, confirmation pressée.
        document.querySelector('[onclick^="execSubmitDossier"]')?.click();
        await attendre(800);
        r.soumissionConfirmee = await confirmer();
        r.gestesDeValidation = [...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)\s*\(/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean)
          .filter((n, i, a) => a.indexOf(n) === i);
        return r;
      });
      verifier('clore le terrain fait passer le dossier à la rédaction, et une annexe s’y ajoute',
        avance.clotureConfirmee === true && avance.etapesApresCloture >= 3
        && avance.annexeApres > avance.annexeAvant,
        JSON.stringify({
          cloture: avance.clotureConfirmee,
          etapes: avance.etapesApresCloture,
          annexes: [avance.annexeAvant, avance.annexeApres],
        }));

      const avanceEnBase = await page.evaluate(async (ctx) => {
        const d = await (await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' })).json();
        const liste = (v) => {
          if (typeof v !== 'string') return Array.isArray(v) ? v : null;
          try { return JSON.parse(v); } catch { return null; }
        };
        return {
          statut: d.statut, etape: d.current_step, objet: d.objet_activite || '',
          validees: liste(d.checklists_validees), retenues: liste(d.realisation_checklists),
        };
      }, { api: M, id: chaine.dossierId });
      verifier('les quatre exports de la rédaction fabriquent chacun leur document',
        !!avance.exports && avance.exports.classeur === true
        && avance.exports.fichesDuDossier === true
        && avance.exports.ficheConstat === true && avance.exports.ficheSuivi === true,
        JSON.stringify(avance.exports));
      verifier('les documents ouverts en fenêtre sont des pages complètes et garnies',
        (avance.documentsOuverts || []).length === 3
        && (avance.documentsOuverts || []).every((d) => d.html && d.tableau && d.longueur > 500),
        JSON.stringify(avance.documentsOuverts));
      verifier('le classeur des constatations porte un en-tête et ses lignes, toutes de même largeur',
        (avance.classeurs || []).length === 1
        && avance.classeurs[0].lignes >= 2
        && avance.classeurs[0].colonnes.length >= 2
        && new Set(avance.classeurs[0].colonnes).size === 1
        && /excel|spreadsheet/i.test(avance.classeurs[0].type),
        JSON.stringify(avance.classeurs));

      verifier('la checklist du dossier se valide à la rédaction, et le serveur la porte',
        avance.boutonValiderChecklist === true && avance.checklistValideeConfirmee === true
        && (avanceEnBase.validees || []).includes(volet.checklistCochee),
        JSON.stringify({ valider: avance.boutonValiderChecklist, validees: avanceEnBase.validees }));
      verifier('le dossier soumis porte en base son objet, son statut et son étape',
        avance.soumissionConfirmee === true
        && avanceEnBase.statut === 'soumis' && avanceEnBase.etape === 'validation'
        && avanceEnBase.objet === avance.objet,
        JSON.stringify({ attendu: avance.objet, ...avanceEnBase }));

      verifier('l’étape « Validation » offre ses gestes',
        (avance.gestesDeValidation || []).includes('execValidateRapport')
        && (avance.gestesDeValidation || []).includes('execReturnDossier'),
        (avance.gestesDeValidation || []).join(', '));

      // ── Le rapport que la soumission fait naître ──
      //
      // **Correction d'une affirmation de 5.f.5.** Il y était écrit que « le geste
      // de l'écran ne passe pas par la même route que la suite HTTP », parce que
      // la liste des rapports était revenue vide. Elle l'était pour une raison
      // bien plus simple, et de mon fait : *le relevé interrogeait `/rapports`
      // **après** avoir supprimé le dossier*, et supprimer un dossier emporte ses
      // rapports.
      //
      // Mesuré proprement : le geste appelle bien `PUT /dossiers/:id/submit`, le
      // même que la suite HTTP, et il en naît un rapport **`…-v1`, statut
      // `soumis`**. L'assertion que 5.f.5 avait renoncé à écrire est donc écrite
      // ici — et la leçon de 5.f.5 tenait pour la mauvaise raison : ce n'était
      // pas une vérité héritée d'une autre suite, c'était ma mesure qui regardait
      // après le ménage.
      const rapport = await page.evaluate(async (ctx) => {
        const liste = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const miens = (liste || []).filter((r) => r.dossier_id === ctx.id);
        return { tous: (liste || []).length, miens: miens.length, premier: miens[0] || null };
      }, { api: M, id: chaine.dossierId });
      verifier('la soumission fait naître un rapport « v1 » soumis, porté par le dossier',
        rapport.miens === 1 && rapport.premier
        && rapport.premier.version === 1 && rapport.premier.statut === 'soumis'
        && /-v1$/.test(rapport.premier.reference || ''),
        JSON.stringify(rapport.premier
          ? { reference: rapport.premier.reference, version: rapport.premier.version, statut: rapport.premier.statut }
          : rapport));

      // ── Le renvoi, et pourquoi c'est celui-là qu'on exerce ──
      //
      // Des trois gestes de l'étape « Validation », le renvoi est le seul que la
      // ronde sait **défaire d'elle-même** : il ramène le dossier à la rédaction,
      // d'où la soumission l'a tiré, et l'on sait déjà que la soumission
      // fonctionne. Valider un rapport, lui, l'avance vers la transmission et les
      // suites de « Mesures d'Application » — un état dont la réversibilité n'est
      // pas mesurée, et qu'on n'exerce donc pas.
      const renvoi = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        document.querySelector('[onclick^="execReturnDossier"]')?.click();
        await attendre(700);
        const oui = document.querySelector('.oasis-confirm-oui');
        const confirme = !!oui;
        if (oui) oui.click();
        await attendre(3800);
        return { confirme };
      });
      const renvoiEnBase = await page.evaluate(async (ctx) => {
        const d = await (await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' })).json();
        return { statut: d.statut, etape: d.current_step };
      }, { api: M, id: chaine.dossierId });
      verifier('le renvoi ramène le dossier à la rédaction, et le serveur le porte',
        renvoi.confirme === true && renvoiEnBase.etape === 'redaction',
        JSON.stringify({ ...renvoi, ...renvoiEnBase }));

      // ── La seconde soumission, puis la validation du rapport ──
      //
      // ── Pourquoi la validation s'exerce maintenant, et pas avant ──
      //
      // 5.f.5 et 5.f.6 l'avaient écartée faute de savoir si elle se défaisait.
      // La mesure a été faite, à trois paliers et sur trois dossiers distincts —
      // un palier ne se mesure pas sur un dossier qu'on vient de détruire :
      //
      // | Palier | Suppression du dossier |
      // |---|---|
      // | rapport **soumis** | 200 |
      // | rapport **validé** | **200** |
      // | rapport **transmis** | la transmission elle-même refuse (400) : non mesuré |
      // | dossier **clôturé** | non mesuré — le jeu d'essai n'a pas de troisième activité |
      //
      // Validé, le dossier reste donc supprimable : la ronde peut valider. Transmettre
      // et clôturer restent hors de portée, et les deux raisons sont écrites.
      const secondCycle = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const confirmer = async () => {
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3800);
          return true;
        };
        const r = {};
        document.querySelector('[onclick^="execSubmitDossier"]')?.click();
        await attendre(800);
        r.resoumission = await confirmer();

        // ── L'aperçu du rapport, avant la décision ──
        //
        // `execPreviewRapport` est le geste par lequel un valideur lit ce qu'il
        // va valider. Il appelle `execDownloadRapport` pour obtenir le document
        // composé par le serveur, le met dans une iframe, et ouvre à côté un
        // pavé d'observations — ouvert à l'écriture **seulement** si le compte
        // peut valider et si le rapport est au statut « soumis ». C'est le cas
        // ici, et c'est cette branche de permission qu'on éprouve.
        //
        // Deux définitions de ce nom existaient, dans deux fichiers chargés l'un
        // après l'autre ; la seconde l'emportait en silence. La première a été
        // retirée (n° 5.f.11), et un garde-fou refuse qu'un doublon revienne.
        const apercu = document.querySelector('[onclick^="execPreviewRapport"]');
        r.boutonApercu = !!apercu;
        if (apercu) {
          apercu.click();
          await attendre(3500);
          const zone = document.getElementById('apercu_commentaires');
          r.apercu = {
            rendu: !!document.querySelector('.exec-apercu-rapport'),
            // L'iframe n'est là que si le document a été obtenu : sa présence
            // prouve que `execDownloadRapport` a rendu quelque chose.
            document: !!document.querySelector('iframe.exec-apercu-cadre'),
            zone: !!zone,
            ouverte: !!zone && !zone.readOnly,
            retour: !!document.querySelector('[onclick^="execBackToValidation"]'),
          };

          // Une observation écrite, enregistrée, puis relue chez le serveur.
          if (zone && !zone.readOnly) {
            r.observation = `Observation de la ronde ${Date.now()}`;
            zone.value = r.observation;
            zone.dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelector('[onclick^="execSaveApercuComments"]')?.click();
            await attendre(2500);
          }

          // Et le retour : le volet revient à l'étape Validation, qui offre de
          // nouveau sa décision. Le bouton est donc **repris après** le retour,
          // et non gardé d'avant — l'aperçu a remplacé le contenu du volet.
          document.querySelector('[onclick^="execBackToValidation"]')?.click();
          await attendre(2500);
          r.revenuAValidation = !!document.querySelector('[onclick^="execValidateRapport"]');
        }

        const bouton = document.querySelector('[onclick^="execValidateRapport"]');
        r.boutonValider = !!bouton;
        if (bouton) {
          bouton.click();
          await attendre(800);
          r.validationConfirmee = await confirmer();
        }
        return r;
      });
      const cycleEnBase = await page.evaluate(async (ctx) => {
        const raps = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const miens = (raps || []).filter((x) => x.dossier_id === ctx.id)
          .map((x) => ({ version: x.version, statut: x.statut, apercu: x.commentaires_apercu || '' }))
          .sort((a, b) => a.version - b.version);
        return { rapports: miens };
      }, { api: M, id: chaine.dossierId });

      verifier('l’aperçu du rapport se rend, document compris, et son pavé d’observations est ouvert au valideur',
        secondCycle.boutonApercu === true && secondCycle.apercu
        && secondCycle.apercu.rendu === true && secondCycle.apercu.document === true
        && secondCycle.apercu.zone === true && secondCycle.apercu.ouverte === true
        && secondCycle.apercu.retour === true,
        JSON.stringify(secondCycle.apercu || { bouton: secondCycle.boutonApercu }));
      verifier('une observation saisie dans l’aperçu est enregistrée, et le serveur la porte',
        !!secondCycle.observation
        && (cycleEnBase.rapports || []).some((x) => x.apercu === secondCycle.observation),
        JSON.stringify({ attendue: secondCycle.observation,
          enBase: (cycleEnBase.rapports || []).map((x) => x.apercu) }));
      verifier('le retour de l’aperçu ramène le volet à l’étape Validation',
        secondCycle.revenuAValidation === true,
        JSON.stringify({ revenu: secondCycle.revenuAValidation }));
      verifier('une seconde soumission fait un rapport « v2 », et la validation le marque valide',
        secondCycle.resoumission === true && secondCycle.boutonValider === true
        && secondCycle.validationConfirmee === true
        && cycleEnBase.rapports.length === 2
        && cycleEnBase.rapports[1].version === 2
        && cycleEnBase.rapports[1].statut === 'valide',
        JSON.stringify({ ...secondCycle, ...cycleEnBase }));

      // ── L'envoi à l'organisme, puis la clôture : le cycle jusqu'au bout ──
      //
      // ── Le refus 400 de 5.f.7, élucidé ──
      //
      // La transmission y était notée « hors de portée : la route refuse (400),
      // non élucidé ». Le refus **est explicite dans la route**, et il est
      // légitime : `PUT /rapports/:id/transmit` exige que le rapport soit
      // *signé par l'inspecteur **et** par le directeur*.
      //
      // Et ce n'est pas la route que l'écran emprunte ici. Le bouton « Envoyer »
      // qui paraît dès que le rapport est validé appelle `/rapports/:id/send` —
      // la « transmission simple », qui n'exige que le statut `valide`. Les deux
      // coexistent et ne font pas la même chose : `/transmit` ouvre en outre les
      // constatations restées en brouillon, `/send` non.
      //
      // *Un 400 n'est pas une énigme : c'est une phrase que la route écrit.* La
      // lire a coûté deux minutes là où « non élucidé » coûtait un jalon.
      //
      // Mesuré ensuite, sur deux dossiers distincts : après `/send` le dossier
      // reste supprimable (200), et après `/close` aussi (200), clôturé. Les deux
      // derniers paliers du cycle sont donc couverts, et la ronde ne laisse
      // toujours rien.
      const finDuCycle = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const confirmer = async () => {
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3800);
          return true;
        };
        const r = {};
        const envoi = document.querySelector('[onclick^="execSendRapportValidated"]');
        r.boutonEnvoi = !!envoi;
        if (envoi) {
          envoi.click();
          await attendre(800);
          r.envoiConfirme = await confirmer();
        }
        // La clôture n'est offerte qu'une fois le rapport transmis : c'est écrit
        // dans le balisage, et le contrôle le vérifie en la trouvant.
        const cloture = document.querySelector('[onclick^="execCloseDossier"]');
        r.boutonCloture = !!cloture;
        if (cloture) {
          cloture.click();
          await attendre(800);
          r.clotureConfirmee = await confirmer();
        }
        // `execCloseDossier` referme le volet lui-même.
        r.voletReferme = !document.getElementById('execSlider');
        return r;
      });
      const finEnBase = await page.evaluate(async (ctx) => {
        const d = await (await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' })).json();
        const raps = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const dernier = (raps || []).filter((x) => x.dossier_id === ctx.id)
          .sort((a, b) => b.version - a.version)[0] || null;
        // La référence est relevée ici parce que deux blocs en ont besoin — l'écran
        // « Dossiers » pour retrouver sa ligne, et la suppression pour la saisir.
        return {
          statut: d.statut, etape: d.current_step,
          rapport: dernier ? dernier.statut : null,
          reference: String(d.reference || d.notification_ref || ''),
        };
      }, { api: M, id: chaine.dossierId });
      verifier('le rapport validé s’envoie à l’organisme, et le serveur le dit transmis',
        finDuCycle.boutonEnvoi === true && finDuCycle.envoiConfirme === true
        && finEnBase.rapport === 'transmis',
        JSON.stringify({ bouton: finDuCycle.boutonEnvoi, confirme: finDuCycle.envoiConfirme, rapport: finEnBase.rapport }));
      verifier('la clôture, offerte seulement après la transmission, clôt le dossier en base',
        finDuCycle.boutonCloture === true && finDuCycle.clotureConfirmee === true
        && finEnBase.statut === 'cloture' && finDuCycle.voletReferme === true,
        JSON.stringify({ bouton: finDuCycle.boutonCloture, confirme: finDuCycle.clotureConfirmee,
          statut: finEnBase.statut, voletReferme: finDuCycle.voletReferme }));

      // ══════════════════════════════════════════════════════════════════
      //  L'écran « Dossiers » — le suivi par organisme (ADR-003, 5.f.73)
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi ce bloc est ici, et pas dans une ronde à lui ──
      //
      // Ses trois onglets séparent les dossiers **en cours**, **clôturés** et
      // **archivés**, et son seul geste propre archive un dossier clos. La
      // clôture coûte huit gestes à atteindre ; la ronde vient de la franchir,
      // et le dossier est clôturé à cet instant précis. *Un état qui coûte huit
      // gestes ne s'atteint pas deux fois.*
      //
      // ── Et pourquoi cet écran n'était mesurable par rien jusqu'ici ──
      //
      // Il n'était dans aucune barre : l'aiguillage le rendait, et rien ne le
      // montrait (n° 5.f.2). La maîtrise d'ouvrage l'a rendu au menu le
      // 8 novembre 2026, et c'est ce qui rend ce bloc possible.
      //
      // ── Ce que la mesure avait trouvé derrière cette porte fermée ──
      //
      // Deux conventions d'archivage, dont une seule était lue. Le module marque
      // l'archivage par le champ `archive` ; cet écran écrivait `statut:
      // 'archive'` par le PUT générique, et le relisait en six endroits. Un
      // dossier « archivé » par son bouton perdait donc son statut réel, sans
      // date ni auteur, et restait invisible des archives ; à l'inverse, un
      // dossier archivé par la vraie route s'affichait ici parmi les clôturés.
      // Corrigé avant l'ouverture de la porte, et **tenu par un garde de forme**
      // dans `taille.smoke.js` — aucune ronde ne peut cliquer un bouton que
      // rien n'affiche, et c'est ce garde qui empêche le retour en arrière.
      //
      // ── Et il rend ce qu'il prend ──
      //
      // Le dossier est désarchivé en partant : les blocs qui suivent le
      // trouvent clôturé, comme ils l'ont toujours trouvé.
      etape = 'écran Dossiers';
      const suivi = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const env = async (url, methode, corps) => {
          const rep = await fetch(url, {
            method: methode,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(corps ? { body: JSON.stringify(corps) } : {}),
          });
          let b = null; try { b = await rep.json(); } catch { /* corps vide */ }
          return { statut: rep.status, corps: b };
        };
        const enBase = async () => {
          const rep = await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' });
          const b = await rep.json().catch(() => ({}));
          return b.dossier || b;
        };
        // Les onglets de cet écran portent leur clé dans leur `onclick` :
        // `EXEC_STATE.dossierPageTab='…'`.
        const onglet = (cle) => [...document.querySelectorAll('.exec-tab')]
          .find((b) => new RegExp(`dossierPageTab='${cle}'`).test(b.getAttribute('onclick') || ''));
        const aller = async (cle) => { onglet(cle)?.click(); await attendre(1800); };
        const lignes = () => [...document.querySelectorAll('#dossier_page_content tbody tr')];
        const porteLeDossier = () => lignes()
          .some((tr) => (tr.textContent || '').includes(ctx.reference));

        // Le client tient ses données du montage : la clôture vient d'être
        // écrite par un geste du volet, mais les autres pages lisent le cache.
        if (typeof window.execRefreshDynamic === 'function') {
          await window.execRefreshDynamic();
          await attendre(1500);
        }
        // Même précaution que pour les filtres : l'onglet choisi vit dans
        // `EXEC_STATE`, et ce bloc en change trois fois.
        r.ongletAuDepart = String(window.EXEC_STATE.dossierPageTab || '');
        document.querySelector('.nav-btn[data-page="prestataires"]')?.click();
        await attendre(2500);
        r.page = ((document.getElementById('exec-content') || {}).textContent || '').trim().length;

        // ── 1. Les trois onglets, et chacun rend son contenu ──
        const vus = [];
        for (const cle of ['en_cours', 'clotures', 'archives']) {
          /* eslint-disable no-await-in-loop */
          const b = onglet(cle);
          if (!b) { vus.push({ cle, bouton: false }); continue; }
          await aller(cle);
          const zone = document.getElementById('dossier_page_content');
          vus.push({
            cle,
            bouton: true,
            actif: !!onglet(cle)?.classList.contains('active'),
            contenu: zone ? (zone.textContent || '').trim().length : 0,
            empreinte: zone ? zone.innerHTML.length : 0,
          });
        }
        r.onglets = vus;
        r.ongletsDistincts = new Set(vus.map((v) => v.empreinte).filter((e) => e > 0)).size;

        // ── 2. Le dossier clôturé est dans « clôturés », et pas ailleurs ──
        await aller('en_cours');
        r.avantDansEnCours = porteLeDossier();
        await aller('clotures');
        r.avantDansClotures = porteLeDossier();
        await aller('archives');
        r.avantDansArchives = porteLeDossier();

        // ── 3. Le tri d'une colonne inverse l'ordre, et le dit par sa flèche ──
        await aller('clotures');
        const entete = [...document.querySelectorAll('#dossier_page_content th')]
          .find((th) => /execSortDossiersClotures/.test(th.getAttribute('onclick') || ''));
        r.triOffert = !!entete;
        if (entete) {
          const avant = lignes().map((tr) => (tr.textContent || '').trim()).join('|');
          const flecheAvant = (entete.textContent || '').trim();
          entete.click();
          await attendre(1500);
          const apres = lignes().map((tr) => (tr.textContent || '').trim()).join('|');
          const entete2 = [...document.querySelectorAll('#dossier_page_content th')]
            .find((th) => /execSortDossiersClotures/.test(th.getAttribute('onclick') || ''));
          r.flecheChange = !!entete2 && (entete2.textContent || '').trim() !== flecheAvant;
          // Une seule ligne ne peut pas changer d'ordre : la flèche est alors le
          // seul témoin, et c'est écrit plutôt que supposé.
          r.ordreChange = apres !== avant;
          r.lignesAuTri = lignes().length;
        }

        // ── 4. L'archivage : son geste, et ce que le serveur en retient ──
        await aller('clotures');
        const bouton = lignes()
          .map((tr) => tr.querySelector('[onclick^="execArchiveDossier"]'))
          .find(Boolean);
        r.boutonArchiver = !!bouton;
        if (bouton) {
          const avant = await enBase();
          r.statutAvant = avant.statut;
          r.archiveAvant = Number(avant.archive) || 0;
          // La confirmation du socle, le temps du geste.
          const orig = window.oasisConfirmer;
          window.oasisConfirmer = async () => true;
          try { bouton.click(); await attendre(3000); } finally { window.oasisConfirmer = orig; }
          const apres = await enBase();
          r.statutApres = apres.statut;
          r.archiveApres = Number(apres.archive) || 0;
          r.dateArchivage = String(apres.date_archivage || '');
          r.archivePar = String(apres.archive_par || '');

          // ── 5. La ligne a changé d'onglet, et les deux décomptes suivent ──
          if (typeof window.execRefreshDynamic === 'function') {
            await window.execRefreshDynamic();
            await attendre(1500);
          }
          document.querySelector('.nav-btn[data-page="prestataires"]')?.click();
          await attendre(2000);
          await aller('clotures');
          r.apresDansClotures = porteLeDossier();
          await aller('archives');
          r.apresDansArchives = porteLeDossier();
          r.libelles = [...document.querySelectorAll('.exec-tab')]
            .map((b) => (b.textContent || '').trim().replace(/\s+/g, ' '));

          // ── 6. Rendu à l'état trouvé : le désarchivage est aux « États » ──
          r.desarchive = (await env(`${ctx.api}/dossiers/${ctx.id}/desarchiver`, 'PUT', {})).statut;
          const rendu = await enBase();
          r.statutRendu = rendu.statut;
          r.archiveRendu = Number(rendu.archive) || 0;
        }
        // L'onglet rendu à ce qu'il était, et le dossier relu une dernière fois
        // par le client : les blocs suivants lisent le cache, non le magasin.
        window.EXEC_STATE.dossierPageTab = r.ongletAuDepart || 'en_cours';
        if (typeof window.execRefreshDynamic === 'function') {
          await window.execRefreshDynamic();
          await attendre(1200);
        }
        r.ongletRendu = String(window.EXEC_STATE.dossierPageTab || '') === (r.ongletAuDepart || 'en_cours');
        return r;
      }, { api: M, id: chaine.dossierId, reference: finEnBase.reference });

      // ── Pourquoi « deux empreintes » et non trois ──
      //
      // Les trois onglets rendent **le même balisage quand ils sont vides** —
      // une carte portant « Aucune donnée ». À cet instant la ronde n'a qu'un
      // dossier, et il est clôturé : « en cours » et « archivés » sont donc
      // légitimement identiques, et exiger trois empreintes ferait rougir ce
      // contrôle sur un non-défaut. *La leçon de 5.c portait sur des vues
      // **garnies** qui rendaient la même chose ; un même vide n'est pas un
      // doublon.* Ce que le contrôle tient, c'est que l'onglet qui porte le
      // dossier se distingue des deux autres, et que le dossier n'est que là.
      verifier('l’écran « Dossiers » rend ses trois onglets, et le dossier clôturé n’est que dans « clôturés »',
        suivi.page > 200
        && (suivi.onglets || []).length === 3
        && (suivi.onglets || []).every((o) => o.bouton === true && o.actif === true && o.contenu > 0)
        && suivi.ongletsDistincts >= 2
        && suivi.avantDansClotures === true
        && suivi.avantDansEnCours === false && suivi.avantDansArchives === false,
        JSON.stringify({ page: suivi.page, onglets: suivi.onglets,
          distincts: suivi.ongletsDistincts, enCours: suivi.avantDansEnCours,
          clotures: suivi.avantDansClotures, archives: suivi.avantDansArchives }));

      verifier('le tri d’une colonne des dossiers clôturés se renverse, et sa flèche le dit',
        suivi.triOffert === true && suivi.flecheChange === true
        // Une seule ligne ne peut pas changer d'ordre : la flèche tient alors
        // seule, et le contrôle ne réclame l'inversion que s'il y a de quoi.
        && (suivi.lignesAuTri <= 1 || suivi.ordreChange === true),
        JSON.stringify({ offert: suivi.triOffert, fleche: suivi.flecheChange,
          ordre: suivi.ordreChange, lignes: suivi.lignesAuTri }));

      verifier('archiver un dossier clos pose le drapeau « archive », conserve son statut, et horodate son auteur',
        suivi.boutonArchiver === true
        && suivi.statutAvant === 'cloture' && suivi.archiveAvant === 0
        && suivi.archiveApres === 1
        // *Le statut réel survit* : c'est la propriété que le défaut détruisait.
        && suivi.statutApres === 'cloture'
        && (suivi.dateArchivage || '').length > 0
        && (suivi.archivePar || '').length > 0,
        JSON.stringify({ bouton: suivi.boutonArchiver, avant: suivi.statutAvant,
          archiveAvant: suivi.archiveAvant, apres: suivi.statutApres,
          archive: suivi.archiveApres, date: suivi.dateArchivage, par: suivi.archivePar }));

      verifier('archivé, le dossier quitte « clôturés » pour « archivés » — et le geste des « États » le rend',
        suivi.apresDansClotures === false && suivi.apresDansArchives === true
        && suivi.desarchive === 200
        && suivi.statutRendu === 'cloture' && suivi.archiveRendu === 0
        && suivi.ongletRendu === true,
        JSON.stringify({ clotures: suivi.apresDansClotures, archives: suivi.apresDansArchives,
          libelles: suivi.libelles, desarchive: suivi.desarchive,
          statutRendu: suivi.statutRendu, archiveRendu: suivi.archiveRendu }));

      // ══════════════════════════════════════════════════════════════════
      //  Le plan d'actions correctives, côté AAC
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi ici, et nulle part ailleurs ──
      //
      // Le PAC ne s'ouvre que pour une constatation **en vigueur**, et une
      // constatation n'y entre pas quand on veut : poser son statut par l'API
      // est **refusé (400)**, mesuré. C'est la **transmission du rapport** qui
      // l'ouvre — relevé palier par palier : création « brouillon », soumission
      // du dossier « brouillon », validation du rapport « brouillon », envoi
      // → **« ouvert »**.
      //
      // La ronde vient donc de passer par le seul état qui donne accès au PAC, et
      // c'est la seule raison pour laquelle ce bloc est ici et non dans une ronde
      // à lui. *Un état qui coûte huit gestes à atteindre ne s'atteint pas deux
      // fois.*
      //
      // ── Et une table vide sur une donnée bien créée ──
      //
      // Le premier relevé rendait « Suivi 0 » et aucun bouton de PAC, sur une
      // constatation `ouvert` en base. Le client tenait ses données **du
      // montage** : la chaîne d'API les avait créées derrière son dos.
      // `execRefreshDynamic()` les relit, et la table porte alors « Suivi 1 ».
      // C'est un geste de montage, non une assertion — et il est écrit ici parce
      // qu'il était la cause d'un rouge, non une commodité.
      //
      // ── Ce que ce bloc ne couvre pas, et qui n'est pas de sa faute ──
      //
      // `exec-pac.js` porte 35 gestes nommés ; le côté AAC en offre **sept**. Les
      // autres — soumettre le plan, l'accepter ou le renvoyer, déclarer la mise
      // en œuvre, accepter ou refuser les preuves, solder la fiche — appartiennent
      // à la **vue Prestataire**, ou à des états que seule cette vue fait
      // naître : c'est l'organisme inspecté qui propose son plan, et l'AAC qui
      // l'arbitre. Les couvrir demande de basculer de vue, et c'est une ronde à
      // part.
      etape = 'plan d’actions correctives';
      const pac = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        if (typeof window.execRefreshDynamic === 'function') {
          await window.execRefreshDynamic();
          await attendre(2500);
        }
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const suivi = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /suivi/i.test(b.textContent || '') && !/terrain/i.test(b.textContent || ''));
        if (suivi) { suivi.click(); await attendre(2600); }
        // Le bouton est désigné par l'identifiant que son `onclick` porte, et non
        // par un rang dans la table : la leçon de 5.f.7.
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        const volet = () => (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        r.ouvert = volet();
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];

        // Les deux volets repliables du PAC, chacun dans les deux sens. La
        // propriété qui change est la classe de leur conteneur, non le nombre de
        // champs — la leçon de 5.f.17.
        const ouverts = () => document.querySelectorAll('#execSlider details[open],'
          + ' #execSlider .exec-pac-bloc.ouvert, #execSlider [aria-expanded="true"]').length;
        r.pliAvant = ouverts();
        document.querySelector('#execSlider [onclick^="execPacVoletToggle"]')?.click();
        await attendre(1600);
        r.pliApres = ouverts();
        document.querySelector('#execSlider [onclick^="execAjustVoletToggle"]')?.click();
        await attendre(1600);
        r.pliAjust = ouverts();

        // Le plan saisi, puis enregistré en brouillon.
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        r.saisie = {
          cause: poser('pac_cause_primaire', 'SURV 0.c — cause primaire de la ronde.'),
          actions: poser('pac_actions_correctives', 'SURV 0.c — actions correctives de la ronde.'),
          date: poser('pac_corrective_date_prevue', '2026-12-31'),
        };
        await attendre(1200);
        document.querySelector('[onclick^="execSaveDraftPAC"]')?.click();
        await attendre(4000);
        // ── Le plan se lit au premier niveau de la constatation ──
        //
        // `execSaveDraftPAC` enregistre un **tableau** `actions_correctives`, et
        // non un objet `pac` : le premier relevé lisait `pac.cause_primaire` et
        // rendait `null` sur un enregistrement qui avait porté. Lu dans
        // `_collectPACData`, qui dit exactement ce qu'il assemble.
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        const plan = ((fnc || {}).actions_correctives || [])[0] || {};
        r.enBase = {
          cause: plan.cause_primaire || '',
          actions: plan.actions_correctives || '',
          date: plan.corrective_date_prevue || '',
        };

        // La fiche de la constatation, exportée : son produit est capturé par
        // relais, comme les autres documents composés dans le navigateur.
        const recu = { fenetres: [] };
        const vraiOpen = window.open;
        window.open = () => {
          const f = { html: '' };
          recu.fenetres.push(f);
          return {
            document: { write: (h) => { f.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        document.querySelector('[onclick^="execExporterFncPdf"]')?.click();
        await attendre(2500);
        window.open = vraiOpen;
        r.documents = recu.fenetres.map((f) => f.html.length);

        // Et le retour, qui referme le volet du PAC.
        document.querySelector('[onclick^="execRetourVolet"], [onclick^="execAnnulerSaisiePAC"]')?.click();
        await attendre(2200);
        r.referme = volet();
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('le plan d’actions correctives s’ouvre pour une constatation en vigueur',
        pac.bouton === true && pac.ouvert > 5000
        && (pac.gestes || []).includes('execSaveDraftPAC'),
        JSON.stringify({ bouton: pac.bouton, ouvert: pac.ouvert,
          gestes: (pac.gestes || []).length }));
      verifier('les volets repliables du plan d’actions se replient',
        pac.pliApres !== pac.pliAvant || pac.pliAjust !== pac.pliApres,
        JSON.stringify({ avant: pac.pliAvant, apres: pac.pliApres, ajust: pac.pliAjust }));
      verifier('le plan d’actions saisi s’enregistre en brouillon, et le serveur le porte',
        pac.saisie && pac.saisie.cause === true && pac.saisie.actions === true
        && !!pac.enBase && /cause primaire de la ronde/.test(pac.enBase.cause)
        && /actions correctives de la ronde/.test(pac.enBase.actions)
        && pac.enBase.date === '2026-12-31',
        JSON.stringify({ saisie: pac.saisie, enBase: pac.enBase }));
      verifier('la fiche de la constatation s’exporte, et le volet du plan se referme',
        (pac.documents || []).some((n) => n > 500) && pac.referme === 0,
        JSON.stringify({ documents: pac.documents, referme: pac.referme }));

      // ══════════════════════════════════════════════════════════════════
      //  La vue Prestataire, et le plan d'actions arbitré
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi cette ronde vaut double ──
      //
      // Le PAC se joue à deux : **l'organisme inspecté propose son plan, et
      // l'Autorité l'arbitre**. Le côté AAC, couvert plus haut, n'offre que sept
      // des 35 gestes de `exec-pac.js` ; les autres n'existent que dans la vue
      // Prestataire, ou dans les états qu'elle fait naître.
      //
      // Cette ronde couvre donc les deux à la fois : la **vue Prestataire**,
      // éprouvée côté serveur depuis longtemps et jamais à l'écran, et la
      // soumission du plan qui ouvre l'arbitrage.
      //
      // ── La bascule recharge la page, et elle **persiste** ──
      //
      // `execAppliquerVue` écrit la vue chez le serveur puis appelle
      // `window.location.reload()` : « le rôle conditionne la navigation, les
      // menus et le périmètre des données », dit le commentaire — on recharge
      // plutôt que de rafraîchir écran par écran.
      //
      // La conséquence pour une suite est double. Il faut **réattendre le
      // montage** après la bascule, et il faut **revenir en vue AAC** avant de
      // finir : la vue est persistée chez le serveur, et une campagne qui la
      // laisserait sur « Prestataire » livrerait à la suivante un compte qui ne
      // voit plus que cinq pages. La suite HTTP du module s'en protège déjà par
      // un `PUT /vue` en tête ; celle-ci se protège en rétablissant.
      etape = 'vue prestataire';
      const basculer = async (libelle) => {
        await page.evaluate((mot) => {
          const b = [...document.querySelectorAll('.oasis-module-actions button')]
            .find((x) => new RegExp(mot, 'i').test(x.textContent || ''));
          if (b) b.click();
        }, libelle);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
          .catch(() => { /* le contrôle qui suit le dira */ });
        await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
        await page.waitForFunction(
          () => {
            const el = document.getElementById('exec-content');
            return el && el.textContent.trim().length > 100;
          }, { timeout: 20000 },
        ).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
      };

      const barreAvant = await page.evaluate(() => [...document.querySelectorAll('.oasis-module-actions button')]
        .map((b) => (b.textContent || '').trim()));
      await basculer('Vue Prestataire');

      const enPrestataire = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        r.pages = [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page);
        // Les cinq pages de la vue, parcourues par de vrais clics.
        const vues = {};
        for (const cle of r.pages) {
          document.querySelector(`.nav-btn[data-page="${cle}"]`)?.click();
          /* eslint-disable no-await-in-loop */
          await attendre(2400);
          const z = document.getElementById('exec-content');
          vues[cle] = z ? z.textContent.trim().length : 0;
        }
        r.vues = vues;

        // Le plan d'actions, du côté de celui qui le propose.
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        poser('pac_cause_primaire', 'SURV 0.c — cause vue par l’organisme.');
        poser('pac_actions_correctives', 'SURV 0.c — plan proposé par l’organisme.');
        poser('pac_corrective_date_prevue', '2027-01-31');
        await attendre(1200);
        document.querySelector('[onclick^="execSubmitPAC"]')?.click();
        await attendre(1000);
        const oui = document.querySelector('.oasis-confirm-oui');
        r.confirme = !!oui;
        if (oui) { oui.click(); await attendre(4500); }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        const plan = ((fnc || {}).actions_correctives || [])[0] || {};
        r.enBase = { statut: fnc.statut, actions: plan.actions_correctives || '' };
        return r;
      }, { api: M, fncId: chaine.fncId });

      // ── La barre de la vue Prestataire, contre la source ──
      let prestDeclarees = [];
      let refusPrest = null;
      try {
        const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
        const bloc = /const EXEC_NAV_PRESTATAIRE = \{([\s\S]*?)\n\};/.exec(texte);
        if (!bloc) throw new Error('EXEC_NAV_PRESTATAIRE introuvable dans exec-app.js');
        prestDeclarees = [...bloc[1].matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1]);
      } catch (e) { refusPrest = e.message; }
      const prestManquantes = prestDeclarees.filter((p) => !(enPrestataire.pages || []).includes(p));
      const prestInattendues = (enPrestataire.pages || []).filter((p) => !prestDeclarees.includes(p));
      verifier('la bascule en vue Prestataire rend exactement les pages que la source déclare',
        !refusPrest && prestDeclarees.length > 0
        && !prestManquantes.length && !prestInattendues.length,
        refusPrest || `${prestDeclarees.length} déclarées, barre : ${(enPrestataire.pages || []).join(', ')}`
          + `${prestManquantes.length ? ` — absentes : ${prestManquantes.join(', ')}` : ''}`
          + `${prestInattendues.length ? ` — inattendues : ${prestInattendues.join(', ')}` : ''}`);
      verifier('chaque page de la vue Prestataire se remplit',
        Object.values(enPrestataire.vues || {}).length > 0
        && Object.values(enPrestataire.vues || {}).every((n) => n > 100),
        JSON.stringify(enPrestataire.vues));
      verifier('le plan d’actions proposé par l’organisme est soumis, et le serveur le dit « pac_soumis »',
        enPrestataire.bouton === true
        && (enPrestataire.gestes || []).includes('execSubmitPAC')
        && !!enPrestataire.enBase && enPrestataire.enBase.statut === 'pac_soumis'
        && /plan proposé par l’organisme/.test(enPrestataire.enBase.actions),
        JSON.stringify({ bouton: enPrestataire.bouton, confirme: enPrestataire.confirme,
          enBase: enPrestataire.enBase }));

      // ══ Les comptes de l'organisme, tenus par l'organisme ══
      //
      // `exec-utilisateurs.js` portait **2 gestes exercés sur 10** : l'écran se
      // rendait — la ronde des cinq pages l'ouvrait —, mais aucun de ses boutons
      // n'était cliqué. C'est le pire des états : la page passe le contrôle « se
      // remplit », et ce qu'elle fait n'est mesuré par rien.
      //
      // Ce que l'avoir exercé a montré, et que rien ne regardait :
      //
      //   · **six libellés sur sept s'affichaient en clé brute.** Le fichier
      //     demandait ses libellés à `pt`, la table de quinze que le portail
      //     prête à la coquille, avec des clés reprises de PR — que cette table
      //     ne porte pas. `pt` rendant la clé quand elle manque, le mot de passe
      //     généré s'annonçait par « password_gen », et la fenêtre de l'œil
      //     s'intitulait « confirm_admin_password ». Chaque appel portait un
      //     repli français à côté, et **aucun ne pouvait servir** : il gardait de
      //     l'absence de la *fonction*, quand c'est la *clé* qui manquait ;
      //   · **le périmètre des routes était plus large que celui de la liste**
      //     (voir la suite HTTP, n° 5.f.76) ;
      //   · **une route détruisait le compte du portail**, qu'aucun des deux
      //     écrans n'offrait et qui n'avait rien de la cérémonie du portail.
      //
      // La ronde ci-dessous exerce les sept gestes, et asserte en base.
      etape = 'comptes de l’organisme';
      const COMPTE = 'ronde.surv@test.int';
      const comptes = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const ligneDe = (ref) => [...document.querySelectorAll('#mesUsersTable tbody tr')]
          .find((l) => l.textContent.includes(ref)) || null;
        const r = {};
        document.querySelector('.nav-btn[data-page="mes_utilisateurs"]')?.click();
        await attendre(2600);
        r.gestes = [...new Set([...document.querySelectorAll('#exec-content [onclick],#exec-content [oninput]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(
            e.getAttribute('onclick') || e.getAttribute('oninput') || '') || [])[1])
          .filter(Boolean))];
        r.lignesAvant = document.querySelectorAll('#mesUsersTable tbody tr').length;

        // ── 1. la recherche : elle filtre, et elle rend ──
        const champ = document.getElementById('mesUsersSearch');
        if (champ) {
          champ.value = 'aucun-compte-ne-porte-ceci';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await attendre(900);
        }
        r.filtreVide = document.querySelectorAll('#mesUsersTable tbody tr').length;
        r.filtreDit = (document.getElementById('mesUsersTable') || {}).textContent.trim().slice(0, 40);
        if (champ) {
          champ.value = '';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await attendre(900);
        }
        r.filtreRendu = document.querySelectorAll('#mesUsersTable tbody tr').length;

        // ── 2. un compte ouvert par la fenêtre, un seul droit confié ──
        //
        // Par un **clic**, et non par un appel de la fonction : le relevé des
        // gestes crédite le gestionnaire posé sur l'élément, non la fonction
        // qu'il nomme. Le premier passage de cette ronde appelait
        // `execOpenMesUserModal()` directement — les deux boutons qui le portent
        // restaient non exercés, et le relevé l'a dit.
        document.querySelector('.portal-page-actions [onclick^="execOpenMesUserModal"]')?.click();
        await attendre(900);
        r.fenetreNeuve = ['muEmail', 'muNom', 'muPrenom', 'muActif', 'muRole']
          .every((i) => !!document.getElementById(i));
        r.droitsOfferts = document.querySelectorAll('.mu-droit').length;
        poser('muEmail', ctx.compte);
        poser('muNom', 'Ronde');
        poser('muPrenom', 'SURV');
        poser('muRole', 'PRESTATAIRE');
        [...document.querySelectorAll('.mu-droit')].forEach((c) => { c.checked = c.value === 'rapports'; });
        document.querySelector('[onclick^="execSaveMesUser"]')?.click();
        await attendre(3200);
        r.fenetreFermee = !document.getElementById('shellModal');
        r.lignesApres = document.querySelectorAll('#mesUsersTable tbody tr').length;
        const ligne = ligneDe(ctx.compte);
        r.ligne = ligne ? ligne.textContent.replace(/\s+/g, ' ').trim() : null;
        if (!ligne) return r;
        r.boutons = [...ligne.querySelectorAll('[onclick]')]
          .map((b) => (/^\s*([A-Za-z_$][\w$]*)/.exec(b.getAttribute('onclick')) || [])[1]);

        // ── 3. l'œil : un mauvais mot de passe, puis le bon ──
        const oeil = ligne.querySelector('[onclick^="execRevealMesUserPassword"]');
        r.oeil = !!oeil;
        if (oeil) {
          oeil.click();
          await attendre(900);
          // Les libellés de la fenêtre : la clé brute s'y lisait.
          const fen = document.getElementById('shellModal');
          r.libelles = fen ? {
            titre: (fen.querySelector('.shell-modal-header h3') || {}).textContent || '',
            champ: (fen.querySelector('.shell-form-group label') || {}).textContent || '',
            boutons: [...fen.querySelectorAll('.shell-modal-footer button')]
              .map((b) => (b.textContent || '').trim()),
          } : null;
          poser('mesAdminPwConfirm', 'ce-n-est-pas-le-bon');
          document.querySelector('[onclick^="execDoRevealMesUserPassword"]')?.click();
          await attendre(1800);
          r.refusGardeLaFenetre = !!document.getElementById('mesAdminPwConfirm');
          poser('mesAdminPwConfirm', ctx.motDePasse);
          document.querySelector('[onclick^="execDoRevealMesUserPassword"]')?.click();
          await attendre(2200);
          const clair = document.getElementById(`mes-pw-clear-${ctx.compte}`);
          const masque = document.getElementById(`mes-pw-mask-${ctx.compte}`);
          r.revele = clair && masque
            ? { affiche: clair.style.display, masque: masque.style.display,
              longueur: (clair.textContent || '').length }
            : null;
        }

        // ── 4. la fenêtre se rouvre garnie, et l'édition part ──
        (ligneDe(ctx.compte) || { querySelector: () => null })
          .querySelector('[onclick^="execOpenMesUserModal"]')?.click();
        await attendre(1000);
        r.rouvertGarnie = (document.getElementById('muEmail') || {}).value === ctx.compte
          && (document.getElementById('muNom') || {}).value === 'Ronde';
        r.droitsCoches = [...document.querySelectorAll('.mu-droit:checked')].map((c) => c.value);
        poser('muPrenom', 'Renommee');
        [...document.querySelectorAll('.mu-droit')].forEach((c) => {
          c.checked = ['rapports', 'constatations'].includes(c.value);
        });
        document.querySelector('[onclick^="execSaveMesUser"]')?.click();
        await attendre(3200);
        r.apresEdition = (ligneDe(ctx.compte) || {}).textContent?.replace(/\s+/g, ' ').trim() || null;

        // ── 5. la bascule : on désactive, on ne supprime pas ──
        const bascule = (ligneDe(ctx.compte) || { querySelector: () => null })
          .querySelector('[onclick^="execToggleMesUser"]');
        r.bascule = bascule ? bascule.getAttribute('onclick') : null;
        if (bascule) { bascule.click(); await attendre(3200); }
        const apres = ligneDe(ctx.compte);
        r.inactive = apres ? apres.className : null;
        r.lignesApresBascule = document.querySelectorAll('#mesUsersTable tbody tr').length;

        // ── 6. la réinitialisation, et le courriel qu'elle compose ──
        const reinit = apres && apres.querySelector('[onclick^="execResetMesUserPw"]');
        r.reinit = !!reinit;
        if (reinit) {
          reinit.click();
          await attendre(1000);
          const question = document.querySelector('.oasis-confirm-fond');
          r.question = question ? {
            message: (question.querySelector('.oasis-confirm-message') || {}).textContent || '',
            rouge: /danger/.test(question.className),
          } : null;
          const oui = document.querySelector('.oasis-confirm-oui');
          // Le bandeau se retire de lui-même au bout de quatre secondes : le
          // lire après coûte le contrôle. Premier passage attendu 4 500 ms,
          // annonce relevée vide — le geste était juste, la mesure trop tard.
          if (oui) { oui.click(); await attendre(2200); }
          r.annonce = (document.querySelector('.oasis-toast-message') || {}).textContent || '';
          await attendre(2500);     // le rechargement de la table finit
        }
        return r;
      }, { compte: COMPTE, motDePasse: MOT_DE_PASSE });

      const enBaseCompte = await page.evaluate(async (ctx) => {
        const l = await (await fetch(`${ctx.api}/mes-utilisateurs`, { credentials: 'same-origin' })).json();
        return ((l || {}).utilisateurs || []).find((u) => (u.id || u.username) === ctx.compte) || null;
      }, { api: M, compte: COMPTE });

      verifier('l’écran des comptes de l’organisme porte ses cinq gestes, et la recherche filtre puis rend',
        (comptes.gestes || []).includes('execOpenMesUserModal')
        && (comptes.gestes || []).includes('_pesSearchInput')
        && comptes.filtreVide === 0 && /Aucun utilisateur/.test(comptes.filtreDit || '')
        && comptes.filtreRendu === comptes.lignesAvant && comptes.lignesAvant >= 2,
        JSON.stringify({ gestes: comptes.gestes, avant: comptes.lignesAvant,
          filtre: comptes.filtreVide, dit: comptes.filtreDit, rendu: comptes.filtreRendu }));

      verifier('un compte s’ouvre par la fenêtre avec un seul droit confié, et sa ligne porte les quatre gestes',
        comptes.fenetreNeuve === true && comptes.droitsOfferts === 6
        && comptes.fenetreFermee === true
        && comptes.lignesApres === comptes.lignesAvant + 1
        && /SURV Ronde/.test(comptes.ligne || '') && /1 sur 6/.test(comptes.ligne || '')
        && ['execRevealMesUserPassword', 'execOpenMesUserModal', 'execResetMesUserPw',
          'execToggleMesUser'].every((g) => (comptes.boutons || []).includes(g)),
        JSON.stringify({ fenetre: comptes.fenetreNeuve, droits: comptes.droitsOfferts,
          lignes: [comptes.lignesAvant, comptes.lignesApres], ligne: comptes.ligne,
          boutons: comptes.boutons }));

      // ── Les libellés de la fenêtre, et non leurs clés ──
      //
      // Ce contrôle est le garde du défaut mesuré : il refuse qu'un libellé de
      // cette fenêtre soit une clé. Rendre `te` à `pt` le ferait rougir.
      verifier('la fenêtre de l’œil est intitulée dans la langue du module, et non par ses clés',
        !!comptes.libelles
        && /Confirmer votre mot de passe/.test(comptes.libelles.titre)
        && /Mot de passe/.test(comptes.libelles.champ)
        && (comptes.libelles.boutons || []).join(' ') === 'Annuler Confirmer'
        && !/[a-z]+_[a-z_]+/.test(`${comptes.libelles.titre} ${comptes.libelles.champ} `
          + `${(comptes.libelles.boutons || []).join(' ')}`),
        JSON.stringify(comptes.libelles));

      verifier('l’œil refuse un mauvais mot de passe, et rend le mot de passe temporaire avec le bon',
        comptes.oeil === true && comptes.refusGardeLaFenetre === true
        && !!comptes.revele && comptes.revele.affiche === 'inline'
        && comptes.revele.masque === 'none' && comptes.revele.longueur >= 8,
        JSON.stringify({ oeil: comptes.oeil, refus: comptes.refusGardeLaFenetre,
          revele: comptes.revele }));

      verifier('la fenêtre se rouvre garnie, l’édition part au serveur, et les droits suivent',
        comptes.rouvertGarnie === true
        && JSON.stringify(comptes.droitsCoches) === JSON.stringify(['rapports'])
        && /Renommee Ronde/.test(comptes.apresEdition || '') && /2 sur 6/.test(comptes.apresEdition || '')
        && !!enBaseCompte && enBaseCompte.prenom === 'Renommee'
        && JSON.stringify((enBaseCompte.droits || []).sort()) === JSON.stringify(['constatations', 'rapports']),
        JSON.stringify({ garnie: comptes.rouvertGarnie, coches: comptes.droitsCoches,
          apres: comptes.apresEdition, enBase: enBaseCompte && { prenom: enBaseCompte.prenom,
            droits: enBaseCompte.droits, actif: enBaseCompte.actif } }));

      verifier('le compte se désactive au lieu de disparaître : la ligne reste, et le serveur le dit inactif',
        /false/.test(comptes.bascule || '') && comptes.inactive === 'row-inactive'
        && comptes.lignesApresBascule === comptes.lignesApres
        && !!enBaseCompte && enBaseCompte.actif === false,
        JSON.stringify({ bascule: comptes.bascule, classe: comptes.inactive,
          lignes: comptes.lignesApresBascule, enBase: enBaseCompte && enBaseCompte.actif }));

      verifier('le mot de passe réinitialisé est annoncé dans la langue du module, et le courriel composé',
        comptes.reinit === true && !!comptes.question
        && /Réinitialiser le mot de passe/.test(comptes.question.message)
        && comptes.question.rouge === true
        && /^Mot de passe généré : /.test(comptes.annonce || '')
        && (comptes.annonce || '').length > 22
        && abandons.compte(/^mailto:/) >= 1,
        JSON.stringify({ question: comptes.question,
          annonce: (comptes.annonce || '').slice(0, 24), mailto: abandons.compte(/^mailto:/) }));

      // ── Retour en vue AAC, et l'arbitrage ──
      //
      // Le retour n'est pas une politesse : la vue est **persistée chez le
      // serveur**, et la laisser sur « Prestataire » livrerait à la campagne
      // suivante un compte qui ne voit plus que cinq pages.
      etape = 'arbitrage du plan';
      await basculer('Vue AAC');
      const arbitrage = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        r.pages = [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page);
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const suivi = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /suivi/i.test(b.textContent || '') && !/terrain/i.test(b.textContent || ''));
        if (suivi) { suivi.click(); await attendre(2600); }
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        // Le plan soumis fait paraître les gestes de l'arbitre : accepter, ou
        // renvoyer au postulant. Ils n'existaient pas à l'état « ouvert ».
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        const accepter = document.querySelector('[onclick^="execAccepterPAC"]');
        r.boutonAccepter = !!accepter;
        if (accepter) {
          accepter.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.confirme = !!oui;
          if (oui) { oui.click(); await attendre(4500); }
        }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        r.enBase = { statut: fnc.statut };
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('le retour en vue AAC rend les pages de l’Autorité',
        (arbitrage.pages || []).includes('plan_surveillance')
        && (arbitrage.pages || []).includes('processus')
        && (arbitrage.pages || []).length > (enPrestataire.pages || []).length,
        JSON.stringify({ aac: (arbitrage.pages || []).length,
          prestataire: (enPrestataire.pages || []).length }));
      verifier('le plan soumis fait paraître les gestes de l’arbitre, absents à l’état « ouvert »',
        (arbitrage.gestes || []).includes('execAccepterPAC')
        && (arbitrage.gestes || []).includes('execReturnPACtoPostulant')
        && !(pac.gestes || []).includes('execAccepterPAC'),
        JSON.stringify({ apresSoumission: (arbitrage.gestes || []).filter((g) => /PAC|FNC/.test(g)),
          aEtatOuvert: (pac.gestes || []).filter((g) => /PAC|FNC/.test(g)) }));
      verifier('le plan accepté par l’Autorité est marqué « pac_valide » en base',
        arbitrage.boutonAccepter === true && arbitrage.confirme === true
        && !!arbitrage.enBase && arbitrage.enBase.statut === 'pac_valide',
        JSON.stringify(arbitrage.enBase));

      // ══════════════════════════════════════════════════════════════════
      //  La fin du cycle : mise en œuvre, preuves, fiche soldée
      // ══════════════════════════════════════════════════════════════════
      //
      // Le plan accepté, il reste à l'exécuter et à le prouver. La chaîne est à
      // deux de nouveau, et chaque geste n'existe que dans l'état que le
      // précédent crée :
      //
      //   · l'organisme déclare la **mise en œuvre** et verse ses preuves
      //     (`submit-preuves`, qui exige `pac_valide` et **ne change pas le
      //     statut** — il horodate `date_preuves_mise_oeuvre`) ;
      //   · l'Autorité les **accepte** ou les refuse, puis **solde la fiche**
      //     (`close` → `soldee`).
      //
      // C'est le dernier palier du suivi d'une constatation, et le terme du
      // circuit qu'ouvre une inspection.
      etape = 'mise en œuvre du plan';
      await basculer('Vue Prestataire');
      const miseEnOeuvre = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        // ── Le bouton de soumission est **désactivé** tant qu'aucun mode n'est
        //    choisi, et le code le dit ──
        //
        // « La soumission n'a de sens qu'un mode au moins choisi » :
        // `execPacModeEdition` arrête si l'organisme verse des **preuves** ou
        // **amende** son plan, et le bouton n'apparaît qu'ensuite. Le premier
        // essai cliquait un bouton désactivé et rendait « pas d'horodatage » sur
        // un geste qui marche.
        //
        // On prend la branche des preuves : l'amendement exige un motif par
        // champ divergent, et refuse sans — ce serait une autre ronde.
        const mode = [...document.querySelectorAll('#execSlider [onclick^="execPacModeEdition"]')]
          .find((b) => /'preuves'/.test(b.getAttribute('onclick') || ''));
        r.boutonMode = !!mode;
        if (mode) { mode.click(); await attendre(2200); }
        const soumettre = [...document.querySelectorAll('#execSlider [onclick^="execSoumettreMiseEnOeuvre"]')]
          .find((b) => !b.disabled && !/amendement/.test(b.getAttribute('onclick') || ''));
        r.boutonMiseEnOeuvre = !!soumettre;
        if (soumettre) {
          soumettre.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.confirme = !!oui;
          if (oui) { oui.click(); await attendre(4500); }
        }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        r.enBase = {
          statut: fnc.statut,
          // La route horodate le versement sans changer le statut : c'est **cet
          // horodatage** qui prouve que le geste a porté, et non une transition.
          preuves: !!fnc.date_preuves_mise_oeuvre,
        };
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('l’organisme choisit son mode, déclare la mise en œuvre, et le serveur horodate son versement',
        miseEnOeuvre.bouton === true && miseEnOeuvre.boutonMode === true
        && miseEnOeuvre.boutonMiseEnOeuvre === true
        && miseEnOeuvre.confirme === true
        && !!miseEnOeuvre.enBase && miseEnOeuvre.enBase.preuves === true
        && miseEnOeuvre.enBase.statut === 'pac_valide',
        JSON.stringify({ mode: miseEnOeuvre.boutonMode,
          soumission: miseEnOeuvre.boutonMiseEnOeuvre, enBase: miseEnOeuvre.enBase }));

      etape = 'solde de la fiche';
      await basculer('Vue AAC');
      const solde = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const suivi = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /suivi/i.test(b.textContent || '') && !/terrain/i.test(b.textContent || ''));
        if (suivi) { suivi.click(); await attendre(2600); }
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];

        // ══════════════════════════════════════════════════════════════
        //  Le suivi de la fiche : discussions, commentaires, suivis
        // ══════════════════════════════════════════════════════════════
        //
        // `exec-pac-suivi.js` était à **0 geste sur 10** : la suite ne savait
        // rien de ce panneau. Il n'est pourtant atteignable qu'ici — « un suivi
        // reste amendable tant que la constatation n'est pas clôturée » —, et
        // c'est pourquoi cette section s'insère dans la ronde du solde plutôt
        // que de vivre à part.
        //
        // L'ordre n'est pas libre : `execEnvoyerEchangePac` **recharge le
        // volet** quand il a envoyé. Les discussions passent donc d'abord ;
        // tout ce qu'on poserait avant serait emporté sans trace.
        //
        // Chaque phase est gardée : une faute dans l'une ne doit pas emporter
        // les contrôles des autres, ni ceux du solde qui suivent.
        const essai = async (nom, f) => {
          try { r[nom] = await f(); } catch (e) { r[nom] = { erreur: String(e && e.message || e) }; }
        };

        // ── 1. Le tiroir des discussions, et la zone qui grandit ──
        await essai('disc', async () => {
          const d = {};
          const bouton = document.querySelector('.exec-pac-discussions');
          d.bouton = !!bouton;
          if (!bouton) return d;
          bouton.click();
          await attendre(1200);
          const tiroir = () => document.getElementById('execPacTiroir');
          d.ouvert = !!tiroir() && tiroir().classList.contains('ouvert');
          // La zone de réponse se dilate sur sa propre hauteur de contenu :
          // `oninput="this.style.height=this.scrollHeight+'px'"`. Quatre lignes
          // doivent la faire grandir — sinon le geste n'a pas porté.
          const zone = document.getElementById('exec_pac_echange_msg');
          d.zone = !!zone;
          if (zone) {
            d.hauteurAvant = Math.round(zone.getBoundingClientRect().height);
            zone.value = 'un\ndeux\ntrois\nquatre';
            zone.dispatchEvent(new Event('input', { bubbles: true }));
            await attendre(500);
            d.hauteurApres = Math.round(zone.getBoundingClientRect().height);
            // Le message, puis l'envoi : le serveur doit le porter.
            zone.value = 'SURV 0.d — message de la ronde au prestataire.';
            zone.dispatchEvent(new Event('input', { bubbles: true }));
            const envoyer = tiroir().querySelector('[onclick^="execEnvoyerEchangePac"]');
            d.boutonEnvoyer = !!envoyer;
            if (envoyer) { envoyer.click(); await attendre(4500); }
            const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
              { credentials: 'same-origin' })).json();
            d.echangesEnBase = (fnc.echanges || []).length;
            const ech = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}/echanges`,
              { credentials: 'same-origin' })).json();
            d.echangesParLaRoute = Array.isArray(ech) ? ech.length : -1;
            d.contenuPorte = (Array.isArray(ech) ? ech : [])
              .some((x) => /SURV 0\.d/.test(x.contenu || ''));
            // Le tiroir est resté ouvert — le code le rouvre lui-même.
            d.resteOuvert = !!tiroir() && tiroir().classList.contains('ouvert');
          }
          document.querySelector('[onclick^="execPacDiscussionsFermer"]')?.click();
          await attendre(900);
          d.referme = !!tiroir() && !tiroir().classList.contains('ouvert');
          return d;
        });

        // ── 2. Le composeur de commentaires, et ses deux gardes ──
        await essai('comm', async () => {
          const c = {};
          const composeur = () => document.querySelector('.exec-suivi-composeur');
          const texte = () => document.getElementById('pac_suivi_texte');
          const ajouter = () => document.getElementById('pac_suivi_ajouter');
          const precision = () => document.getElementById('pac_suivi_precision');
          const liste = () => document.getElementById('pac_suivi_liste');
          const blocs = () => [...liste().querySelectorAll('.exec-suivi-comm')];
          c.composeur = !!composeur();
          if (!composeur()) return c;
          // La garde : « le commentaire ne s'ouvre qu'une fois l'item désigné ».
          c.texteFermeAuDepart = texte().disabled === true;
          c.boutonFermeAuDepart = ajouter().disabled === true;
          c.precisionCacheeAuDepart = precision().hidden === true;

          const cases = () => [...composeur().querySelectorAll('.exec-suivi-items input')];
          const premiere = cases().find((x) => x.value !== 'autres');
          premiere.click();
          await attendre(700);
          c.texteOuvert = texte().disabled === false;
          c.boutonOuvert = ajouter().disabled === false;
          // L'item choisi s'inscrit, numéroté sans trou.
          c.ligneInscrite = /^1\. /.test(texte().value);

          // « Autres » réclame sa précision, et la rend visible.
          const autres = document.getElementById('pac_suivi_autres');
          autres.click();
          await attendre(700);
          c.precisionVisible = precision().hidden === false;
          c.deuxLignes = texte().value.split('\n').filter((l) => /^\d\. /.test(l)).length;

          // Décocher retire la ligne de l'item — **sauf si l'AAC y a écrit**.
          // C'est la règle du code : « ses mots priment sur la case ». On
          // l'éprouve dans les deux sens, sur deux items.
          autres.click();
          await attendre(700);
          c.ligneAutresPartie = !/Autres|autres/i.test(texte().value);
          c.precisionRecachee = precision().hidden === true;
          texte().value = `${texte().value.replace(/\s+$/, '')} des mots de l’Autorité`;
          premiere.click();
          await attendre(700);
          c.ligneEcriteRestee = /des mots de l’Autorité/.test(texte().value);

          // Le refus : « Autres » coché sans précision n'ajoute rien.
          premiere.click();
          autres.click();
          await attendre(700);
          texte().value = '1. essai — sans précision';
          const avantRefus = blocs().length;
          ajouter().click();
          await attendre(900);
          c.refuseSansPrecision = blocs().length === avantRefus;

          // ── Une pièce jointe, versée pour de vrai ──
          //
          // `uploadFile` de Puppeteer ne s'appelle que depuis Node, et cette
          // ronde vit dans une évaluation de page. Un `DataTransfer` suffit : on
          // fabrique un vrai `File`, on le pose sur l'entrée, et le `change`
          // déclenche `execSuiviJoindreFichiers`, qui le **POST au serveur**.
          //
          // Ce que cela ne prouve pas, et qui doit être dit : ni que le
          // sélecteur de fichiers du système s'ouvre, ni que l'utilisateur y
          // choisit quelque chose. Aucune suite ne peut l'éprouver. Ce qui est
          // mesuré commence au fichier reçu par l'entrée.
          //
          // C'est ce chemin qui rendait `403 origine_non_reconnue` jusqu'à ce
          // tour : dix-huit versements du projet appelaient `fetch` sans
          // l'en-tête d'origine. Ce contrôle est la preuve que celui-ci aboutit.
          const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e,
            0x34, 0x0a, 0x25, 0xc7, 0xec, 0x8f, 0xa2, 0x0a]);
          const pieces = () => [...document.querySelectorAll('#pac_suivi_pj_liste .exec-suivi-pj-item')];
          const entree = composeur().querySelector('[onchange*="execSuiviJoindreFichiers"]');
          c.entreeFichier = !!entree;
          const verser = async (nom) => {
            const dt = new DataTransfer();
            dt.items.add(new File([pdf], nom, { type: 'application/pdf' }));
            entree.files = dt.files;
            entree.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2600);
          };
          if (entree) {
            await verser('preuve-ronde-1.pdf');
            c.pjUne = pieces().length;
            c.pjNom = pieces()[0] ? (pieces()[0].dataset.filename || '') : '';
            c.pjChemin = pieces()[0] ? (pieces()[0].dataset.path || '') : '';
            await verser('preuve-ronde-2.pdf');
            c.pjDeux = pieces().length;
            // La pastille se retire d'elle-même : son bouton porte
            // `onclick="this.parentElement.remove()"`, et rien d'autre.
            pieces()[1].querySelector('button').click();
            await attendre(700);
            c.pjApresRetrait = pieces().length;
            // Et l'entrée s'est vidée : `input.value = ''` à la fin du geste,
            // sans quoi le même fichier ne pourrait pas être redéposé.
            c.entreeVidee = entree.value === '';
          }

          // La précision donnée, le commentaire s'ajoute — en brouillon.
          precision().value = 'ronde SURV 0.d';
          texte().value = '1. essai — commentaire de la ronde';
          ajouter().click();
          await attendre(1200);
          c.ajoute = blocs().length === avantRefus + 1;
          const dernier = () => blocs()[blocs().length - 1];
          c.brouillon = !!dernier().querySelector('.exec-suivi-brouillon');
          c.modifiable = !!dernier().querySelector('[onclick*="execModifierCommentaireSuivi"]');
          // Le brouillon emporte la pièce déposée, et l'affiche.
          c.commFichiers = (() => {
            try { return JSON.parse(dernier().dataset.fichiers || '[]').length; }
            catch { return -1; }
          })();
          c.commLienPiece = !!dernier().querySelector('.exec-suivi-comm-pj a');
          c.composeurSansPiece = pieces().length === 0;
          // Le composeur repart à zéro.
          c.composeurVide = texte().value === '' && precision().value === ''
            && composeur().querySelectorAll('.exec-suivi-items input:checked').length === 0;

          // Il se replie et se déplie d'un clic sur son en-tête.
          const tete = dernier().querySelector('.exec-suivi-comm-tete')
            || dernier().firstElementChild;
          tete.click();
          await attendre(600);
          c.replie = dernier().classList.contains('replie');
          tete.click();
          await attendre(600);
          c.deplie = !dernier().classList.contains('replie');

          // « Modifier » n'édite pas : il **reprend** le brouillon dans le
          // composeur et retire le bloc. Deux effets, un seul geste.
          const avantReprise = blocs().length;
          dernier().querySelector('[onclick*="execModifierCommentaireSuivi"]').click();
          await attendre(900);
          c.reprisRetire = blocs().length === avantReprise - 1;
          c.reprisDansLeComposeur = /commentaire de la ronde/.test(texte().value)
            && precision().value === 'ronde SURV 0.d';
          // « Les pièces du brouillon repartent avec lui dans le composeur » :
          // la pastille est reconstruite — seconde pose du même geste, et la
          // seule qui prouve que la reprise n'oublie pas les fichiers.
          c.pieceRevenue = pieces().length;
          c.pieceRevenueRetirable = !!(pieces()[0] && pieces()[0].querySelector('button'));
          // Reposé tel quel, pour la suite.
          ajouter().click();
          await attendre(1200);
          c.repose = blocs().length === avantReprise;

          // Et il s'efface, sur confirmation du socle.
          dernier().querySelector('[onclick*="execSupprimerCommentaireSuivi"]').click();
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          c.confirmeEffacement = !!oui;
          if (oui) { oui.click(); await attendre(1200); }
          c.apresEffacement = blocs().length;
          // Reposé une dernière fois : c'est lui que l'acceptation publiera.
          precision().value = 'ronde SURV 0.d';
          const uneCase = cases().find((x) => x.value !== 'autres');
          if (!uneCase.checked) { uneCase.click(); await attendre(700); }
          if (entree) await verser('preuve-publiee.pdf');
          texte().value = '1. essai — commentaire que l’acceptation publiera';
          ajouter().click();
          await attendre(1200);
          c.finalPose = blocs().length;
          return c;
        });

        // ── 3. Les suivis : ajoutés, repris, effacés ──
        await essai('suivis', async () => {
          const s = {};
          const zone = () => document.getElementById('anac_suivi_saisie');
          const liste = () => document.getElementById('anac_suivis_list');
          const lignes = () => [...liste().querySelectorAll('.exec-suivi')];
          s.zone = !!zone();
          if (!zone()) return s;
          s.avant = lignes().length;
          s.videAnnonce = !!liste().querySelector('.exec-suivi-vide');
          const ajouter = document.querySelector('[onclick^="execAjouterSuivi"]');
          s.boutonAjouter = !!ajouter;
          zone().value = 'SURV 0.d — premier suivi de la ronde';
          ajouter?.click();
          await attendre(900);
          s.apresAjout = lignes().length;
          s.videRetire = !liste().querySelector('.exec-suivi-vide');
          s.zoneVidee = zone().value === '';

          // « Modifier » reprend le texte dans la zone et retire la ligne.
          lignes()[lignes().length - 1].querySelector('[onclick^="execModifierSuivi"]').click();
          await attendre(900);
          s.reprisRetire = lignes().length === s.apresAjout - 1;
          s.reprisDansLaZone = /premier suivi de la ronde/.test(zone().value);
          ajouter?.click();
          await attendre(900);
          s.repose = lignes().length === s.apresAjout;

          // Un second, puis effacé sur confirmation.
          zone().value = 'SURV 0.d — second suivi, celui qu’on efface';
          ajouter?.click();
          await attendre(900);
          s.deux = lignes().length === s.apresAjout + 1;
          lignes()[lignes().length - 1].querySelector('[onclick^="execSupprimerSuivi"]').click();
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          s.confirme = !!oui;
          if (oui) { oui.click(); await attendre(1200); }
          s.apresEffacement = lignes().length;
          return s;
        });

        const accepter = document.querySelector('[onclick^="execAccepterPreuves"]');
        r.boutonPreuves = !!accepter;
        if (accepter) {
          accepter.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (oui) { oui.click(); await attendre(4500); }
        }

        // ── 4. Ce que l'acceptation emporte, et ce qu'elle ferme ──
        //
        // Suivis et commentaires ne vivent que dans la page jusqu'ici :
        // `_collectFullEvalData()` les relève au moment de l'enregistrement.
        // C'est donc le geste du métier — accepter les preuves — qui les porte
        // au serveur, et c'est par lui qu'on prouve la persistance, non par un
        // appel que l'écran ne fait pas.
        //
        // Et il fait une seconde chose, que le code annonce : « les
        // commentaires en attente deviennent visibles du prestataire dès que
        // l'AAC rend une décision : ils ne sont alors plus modifiables ».
        // Le brouillon devient donc publié, et perd ses boutons.
        await essai('porte', async () => {
          const p = {};
          const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
            { credentials: 'same-origin' })).json();
          let ev = fnc.commentaire_evaluation;
          if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
          ev = ev || {};
          const suivis = ((ev.evaluation_anac || {}).verification || {}).suivis || [];
          const comms = ev.suivi_commentaires || [];
          p.suivisEnBase = suivis.length;
          p.suiviPorte = suivis.some((x) => /premier suivi de la ronde/.test(x.texte || ''));
          p.suiviEffacePasRevenu = !suivis.some((x) => /celui qu’on efface/.test(x.texte || ''));
          p.commsEnBase = comms.length;
          p.commPorte = comms.some((x) => /l’acceptation publiera/.test(x.texte || ''));
          const publie = comms.find((x) => /l’acceptation publiera/.test(x.texte || '')) || {};
          p.piecePortee = (publie.fichiers || []).length;
          p.pieceNommee = ((publie.fichiers || [])[0] || {}).filename || '';
          p.pieceCheminServeur = ((publie.fichiers || [])[0] || {}).path || '';
          p.tousPublies = comms.length > 0 && comms.every((x) => x.publie === true);
          // Dans le volet rouvert, un commentaire publié n'offre plus ses gestes.
          const liste = document.getElementById('pac_suivi_liste');
          p.blocsRendus = liste ? liste.querySelectorAll('.exec-suivi-comm').length : -1;
          p.plusModifiable = liste
            ? liste.querySelectorAll('[onclick*="execModifierCommentaireSuivi"]').length === 0 : null;
          return p;
        });

        // Le geste qui solde : il referme le circuit d'une constatation.
        const solder = document.querySelector('[onclick^="execCloseFNC"]');
        r.boutonSolde = !!solder;
        if (solder) {
          solder.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.confirme = !!oui;
          if (oui) { oui.click(); await attendre(4500); }
        }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        r.enBase = { statut: fnc.statut, dateSolde: !!fnc.date_solde };
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('l’Autorité accepte les preuves, puis solde la fiche : le serveur la dit « soldee »',
        solde.bouton === true && solde.boutonPreuves === true
        && solde.boutonSolde === true && solde.confirme === true
        && !!solde.enBase && solde.enBase.statut === 'soldee'
        && solde.enBase.dateSolde === true,
        JSON.stringify({ preuves: solde.boutonPreuves, solde: solde.boutonSolde,
          enBase: solde.enBase }));

      // ── Les contrôles du panneau de suivi (n° 5.f.28) ──
      const D = solde.disc || {};
      const C = solde.comm || {};
      const S = solde.suivis || {};
      const P = solde.porte || {};
      verifier('le tiroir des discussions s’ouvre, sa zone de réponse grandit avec son contenu, et se referme par son geste',
        D.bouton === true && D.ouvert === true && D.zone === true
        && D.hauteurApres > D.hauteurAvant && D.referme === true,
        JSON.stringify({ ouvert: D.ouvert, avant: D.hauteurAvant, apres: D.hauteurApres,
          referme: D.referme, erreur: D.erreur }));
      verifier('un message part chez le serveur, se relit par la route des échanges, et le tiroir reste ouvert',
        D.boutonEnvoyer === true && D.contenuPorte === true
        && D.echangesParLaRoute >= 1 && D.resteOuvert === true,
        JSON.stringify({ envoye: D.contenuPorte, parLaRoute: D.echangesParLaRoute,
          surLaFiche: D.echangesEnBase, reste: D.resteOuvert, erreur: D.erreur }));
      verifier('le composeur de commentaires reste fermé tant qu’aucun item n’est désigné, et s’ouvre dès qu’il l’est',
        C.composeur === true && C.texteFermeAuDepart === true
        && C.boutonFermeAuDepart === true && C.precisionCacheeAuDepart === true
        && C.texteOuvert === true && C.boutonOuvert === true && C.ligneInscrite === true,
        JSON.stringify(C).slice(0, 300));
      verifier('« Autres » réclame sa précision, et la refuse absente : rien ne s’ajoute',
        C.precisionVisible === true && C.deuxLignes === 2
        && C.precisionRecachee === true && C.refuseSansPrecision === true,
        JSON.stringify({ visible: C.precisionVisible, lignes: C.deuxLignes,
          recachee: C.precisionRecachee, refuse: C.refuseSansPrecision, erreur: C.erreur }));
      verifier('décocher un item retire sa ligne — sauf si l’Autorité y a écrit : ses mots priment sur la case',
        C.ligneAutresPartie === true && C.ligneEcriteRestee === true,
        JSON.stringify({ partie: C.ligneAutresPartie, restee: C.ligneEcriteRestee,
          erreur: C.erreur }));
      verifier('le commentaire s’ajoute en brouillon, modifiable, et le composeur repart à zéro',
        C.ajoute === true && C.brouillon === true && C.modifiable === true
        && C.composeurVide === true,
        JSON.stringify({ ajoute: C.ajoute, brouillon: C.brouillon,
          modifiable: C.modifiable, composeurVide: C.composeurVide, erreur: C.erreur }));
      verifier('il se replie et se déplie d’un clic sur son en-tête',
        C.replie === true && C.deplie === true,
        JSON.stringify({ replie: C.replie, deplie: C.deplie, erreur: C.erreur }));
      verifier('« Modifier » n’édite pas : il reprend le brouillon dans le composeur et retire le bloc',
        C.reprisRetire === true && C.reprisDansLeComposeur === true && C.repose === true,
        JSON.stringify({ retire: C.reprisRetire, repris: C.reprisDansLeComposeur,
          repose: C.repose, erreur: C.erreur }));
      verifier('une pièce jointe se verse pour de vrai, se nomme, et sa pastille se retire d’elle-même',
        C.entreeFichier === true && C.pjUne === 1 && /preuve-ronde-1/.test(C.pjNom || '')
        && /^\/api\/m\/execution\/uploads\//.test(C.pjChemin || '')
        && C.pjDeux === 2 && C.pjApresRetrait === 1 && C.entreeVidee === true,
        JSON.stringify({ entree: C.entreeFichier, une: C.pjUne, nom: C.pjNom,
          chemin: C.pjChemin, deux: C.pjDeux, apres: C.pjApresRetrait,
          videe: C.entreeVidee, erreur: C.erreur }));
      verifier('le brouillon emporte la pièce déposée, l’affiche, et vide le composeur de la sienne',
        C.commFichiers === 1 && C.commLienPiece === true && C.composeurSansPiece === true,
        JSON.stringify({ fichiers: C.commFichiers, lien: C.commLienPiece,
          composeur: C.composeurSansPiece, erreur: C.erreur }));
      verifier('et sa reprise ne l’oublie pas : la pastille est reconstruite, retirable',
        C.pieceRevenue === 1 && C.pieceRevenueRetirable === true,
        JSON.stringify({ revenue: C.pieceRevenue, retirable: C.pieceRevenueRetirable,
          erreur: C.erreur }));
      verifier('un brouillon s’efface sur confirmation du socle',
        C.confirmeEffacement === true && C.apresEffacement === 0 && C.finalPose === 1,
        JSON.stringify({ confirme: C.confirmeEffacement, apres: C.apresEffacement,
          final: C.finalPose, erreur: C.erreur }));
      verifier('un suivi s’ajoute et chasse la mention « aucun suivi », se reprend par son geste, et s’efface sur confirmation',
        S.zone === true && S.videAnnonce === true && S.apresAjout === 1
        && S.videRetire === true && S.zoneVidee === true
        && S.reprisRetire === true && S.reprisDansLaZone === true && S.repose === true
        && S.deux === true && S.confirme === true && S.apresEffacement === 1,
        JSON.stringify(S).slice(0, 300));
      verifier('l’acceptation des preuves emporte suivis et commentaires chez le serveur, et publie les brouillons — qui perdent alors leurs gestes',
        P.suiviPorte === true && P.suiviEffacePasRevenu === true
        && P.commPorte === true && P.tousPublies === true
        && P.blocsRendus === 1 && P.plusModifiable === true
        && P.piecePortee === 1 && /preuve-publiee/.test(P.pieceNommee || '')
        && /^\/api\/m\/execution\/uploads\//.test(P.pieceCheminServeur || ''),
        JSON.stringify(P));

      // Le volet a déjà été refermé par la clôture — `execCloseDossier` appelle
      // `execCloseSlider` lui-même. Le contrôle du geste de fermeture est donc
      // mené **avant** la fin du cycle, sur le volet encore ouvert : voir plus
      // haut, « changer d'étape le redessine ». Ici on ne vérifie que l'absence.
      verifier('le volet est refermé à la fin de la ronde',
        finDuCycle.voletReferme === true, JSON.stringify({ referme: finDuCycle.voletReferme }));


      // ══════════════════════════════════════════════════════════════════
      //  L'aperçu du rapport, et quatre gestes qui ne sont pas de l'écran
      // ══════════════════════════════════════════════════════════════════
      //
      // `exec-rapports.js` était à **0 geste sur 6**. Le relevé en nommait six ;
      // quatre n'en sont pas — et c'est la lecture du code qui le dit, non le
      // compte.
      //
      // `window.print`, `window.close`, `this.parentElement.style.display` et
      // l'écouteur `load` vivent **dans la chaîne de caractères du document que
      // l'application fabrique** : ils s'exécutent dans la fenêtre ouverte, pas
      // dans une page de l'application. Le mouchard instrumente les pages de
      // l'application ; il ne les verra jamais, et il a raison.
      //
      // Ils n'en sont pas moins réels, et ce bloc les éprouve autrement : non en
      // les déclenchant, mais en constatant que **le document produit les
      // porte**. C'est la même distinction qu'en 5.f.10 — un relais mesure le
      // geste jusqu'à la porte, jamais au-delà ; ici on mesure ce qui franchit
      // la porte.
      //
      // Et le seul vrai geste d'écran du fichier, `execDownloadRapport`, porte
      // une distinction qui se mesure à deux faces : son second argument
      // `autoPrint` ajoute — ou n'ajoute pas — l'écouteur qui ouvre la boîte
      // d'impression.
      etape = 'aperçu du rapport';
      const apercuRapport = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        document.querySelector('.nav-btn[data-page="rapports"]')?.click();
        await attendre(3000);
        const lignes = [...document.querySelectorAll('[onclick^="execDownloadRapport"]')];
        r.gestes = lignes.length;
        if (!lignes.length) return r;

        // Relais : le document est écrit dans la fenêtre ouverte, et c'est lui
        // qu'on veut lire.
        const recus = [];
        const vraiOpen = window.open;
        window.open = () => {
          const doc = { html: '' };
          recus.push(doc);
          return {
            document: { write: (h) => { doc.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        try {
          const sansImpression = lignes
            .find((e) => /execDownloadRapport\('[^']+'\)/.test(e.getAttribute('onclick') || ''));
          const avecImpression = lignes
            .find((e) => /execDownloadRapport\('[^']+',\s*true\)/.test(e.getAttribute('onclick') || ''));
          r.deuxGestesDistincts = !!sansImpression && !!avecImpression;
          sansImpression?.click();
          await attendre(3000);
          avecImpression?.click();
          await attendre(3000);
        } finally {
          window.open = vraiOpen;
        }
        r.documents = recus.length;
        const [sans, avec] = recus;
        const porte = (h, motif) => new RegExp(motif).test(h || '');
        if (sans) {
          r.sans = {
            docComplet: porte(sans.html, '<!DOCTYPE html>') && porte(sans.html, '</html>'),
            titre: (/<title>([^<]*)<\/title>/.exec(sans.html) || [])[1] || '',
            contenu: porte(sans.html, 'id="report-content"'),
            // Les deux boutons du bandeau du document, et son bandeau refermable.
            imprimer: porte(sans.html, 'onclick="window\\.print\\(\\)"'),
            fermer: porte(sans.html, 'onclick="window\\.close\\(\\)"'),
            bandeauRefermable: porte(sans.html, "this\\.parentElement\\.style\\.display='none'"),
            // Et **pas** d'écouteur d'impression : c'est la face sans `autoPrint`.
            ecouteurImpression: porte(sans.html, "addEventListener\\('load'"),
            taille: (sans.html || '').length,
          };
        }
        if (avec) {
          r.avec = {
            ecouteurImpression: porte(avec.html, "addEventListener\\('load'"),
            appelleImprimer: porte(avec.html, 'window\\.print\\(\\)'),
            taille: (avec.html || '').length,
          };
        }
        return r;
      });

      verifier('la page des rapports offre les deux gestes d’aperçu, et chacun fabrique son document',
        apercuRapport.gestes >= 2 && apercuRapport.deuxGestesDistincts === true
        && apercuRapport.documents === 2
        && !!apercuRapport.sans && apercuRapport.sans.docComplet === true
        && apercuRapport.sans.contenu === true
        && apercuRapport.sans.titre.length > 0,
        JSON.stringify({ gestes: apercuRapport.gestes, documents: apercuRapport.documents,
          sans: apercuRapport.sans }));
      verifier('le document produit porte lui-même ses gestes — imprimer, fermer, et son bandeau refermable',
        !!apercuRapport.sans && apercuRapport.sans.imprimer === true
        && apercuRapport.sans.fermer === true
        && apercuRapport.sans.bandeauRefermable === true,
        JSON.stringify(apercuRapport.sans));
      verifier('et « autoPrint » se mesure à deux faces : l’écouteur d’impression n’est là que sur la seconde demande',
        !!apercuRapport.sans && !!apercuRapport.avec
        && apercuRapport.sans.ecouteurImpression === false
        && apercuRapport.avec.ecouteurImpression === true
        && apercuRapport.avec.appelleImprimer === true,
        JSON.stringify({ sans: apercuRapport.sans && apercuRapport.sans.ecouteurImpression,
          avec: apercuRapport.avec && apercuRapport.avec.ecouteurImpression }));

      // ══════════════════════════════════════════════════════════════════
      //  Les référentiels de l'écran : créés, vus, relus, retirés
      // ══════════════════════════════════════════════════════════════════
      //
      // L'écran des paramètres porte cinq familles de référentiels et le plus
      // gros gisement de gestes non couverts de SURV. Le patron est le même pour
      // chacune, et il est **réversible par construction** : ouvrir la fenêtre,
      // saisir, enregistrer, relire chez le serveur, supprimer, relire encore.
      //
      // ── Le défaut que cette ronde a trouvé ──
      //
      // Une criticité enregistrée partait bien chez le serveur et **ne
      // paraissait pas dans la table** : `execRefreshDynamic()` ne recharge que
      // ce qui bouge en cours de travail, et les référentiels sont chargés une
      // fois par session derrière le verrou `_staticLoaded` d'`execLoadData()`.
      // L'opérateur ne voyait son ajout qu'après un rechargement de page.
      //
      // Deux familles sur cinq étaient dans ce cas — les statuts de checklist et
      // les rôles d'équipe avaient déjà leur rechargement dédié. Corrigé par
      // `execRefreshReferentielsConstatation` (n° 5.f.22).
      //
      // Le contrôle ci-dessous **l'aurait pris**, et c'est pour cela qu'il
      // vérifie les deux : la table **et** le serveur. *Une écriture qui ne se
      // voit pas est une écriture dont l'opérateur doute.*
      etape = 'référentiels';
      const referentiels = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const lire = async (c) => {
          try { return await (await fetch(`${api}/${c}`, { credentials: 'same-origin' })).json(); }
          catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3200);
          return true;
        };
        // Les boutons de la table, comptés par famille : c'est **là** que se
        // voit ce qui a été écrit.
        const lignes = (geste) => document.querySelectorAll(`[onclick^="${geste}"]`).length;

        document.querySelector('.nav-btn[data-page="parametres"]')?.click();
        await attendre(3000);

        // La barre des paramètres, dans les deux sens.
        const sousMenus = () => document.querySelectorAll('[onclick*="_execParamSub"]').length;
        r.sousMenus = sousMenus();
        document.querySelector('[onclick^="execBasculerBarreParam"]')?.click();
        await attendre(1600);
        r.barreRepliee = sousMenus();
        document.querySelector('[onclick^="execBasculerBarreParam"]')?.click();
        await attendre(1600);
        r.barreDepliee = sousMenus();

        // Les quatre sous-menus, chacun rendant son contenu.
        const empreintes = [];
        for (const b of [...document.querySelectorAll('[onclick*="_execParamSub"]')]) {
          const h = b.getAttribute('onclick');
          [...document.querySelectorAll('[onclick*="_execParamSub"]')]
            .find((x) => x.getAttribute('onclick') === h)?.click();
          /* eslint-disable no-await-in-loop */
          await attendre(2000);
          const z = document.getElementById('exec-content');
          empreintes.push(`${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}`);
        }
        r.sousMenusParcourus = empreintes.length;
        r.sousMenusDistincts = new Set(empreintes).size;

        // ── Famille 1 : la criticité ──
        const premier = [...document.querySelectorAll('[onclick*="_execParamSub"]')]
          .find((b) => /constatations/.test(b.getAttribute('onclick') || ''));
        if (premier) { premier.click(); await attendre(2400); }
        r.crit = { avant: (await lire('criticites')).length, lignesAvant: lignes('execDeleteCriticite') };
        document.querySelector('[onclick^="execOpenCriticiteModal"]')?.click();
        await attendre(2200);
        poser('critItem', 'SURV 0.c — criticité de la ronde');
        poser('critAlias', 'RND');
        poser('critNiveau', '9');
        await attendre(900);
        document.querySelector('[onclick^="execSaveCriticite"]')?.click();
        await attendre(3500);
        const crits = await lire('criticites');
        r.crit.apres = crits.length;
        r.crit.lignesApres = lignes('execDeleteCriticite');
        const critNouvelle = crits.find((c) => /criticité de la ronde/.test(c.item || ''));
        r.crit.enBase = !!critNouvelle;
        // Et le retrait, par le bouton que porte **sa** ligne.
        if (critNouvelle) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteCriticite"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(critNouvelle.id));
          r.crit.boutonRetrait = !!b;
          if (b) { b.click(); r.crit.confirme = await confirmer(); }
          r.crit.fin = (await lire('criticites')).length;
          r.crit.lignesFin = lignes('execDeleteCriticite');
        }

        // ── Famille 2 : le type de cas ──
        r.tc = { avant: (await lire('types-cas')).length, lignesAvant: lignes('execDeleteTypeCas') };
        document.querySelector('[onclick^="execOpenTypeCasModal"]')?.click();
        await attendre(2200);
        poser('tcItem', 'SURV 0.c — type de cas de la ronde');
        poser('tcDesc', 'Posé par la ronde, retiré par elle.');
        poser('tcOrdre', '9');
        await attendre(900);
        document.querySelector('[onclick^="execSaveTypeCas"]')?.click();
        await attendre(3500);
        const tcs = await lire('types-cas');
        r.tc.apres = tcs.length;
        r.tc.lignesApres = lignes('execDeleteTypeCas');
        const tcNouveau = tcs.find((c) => /type de cas de la ronde/.test(c.item || ''));
        r.tc.enBase = !!tcNouveau;
        if (tcNouveau) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteTypeCas"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(tcNouveau.id));
          r.tc.boutonRetrait = !!b;
          if (b) { b.click(); r.tc.confirme = await confirmer(); }
          r.tc.fin = (await lire('types-cas')).length;
          r.tc.lignesFin = lignes('execDeleteTypeCas');
        }

        // ── Famille 3 : le rôle d'équipe, qui a son propre rechargement ──
        const autres = [...document.querySelectorAll('[onclick*="_execParamSub"]')]
          .find((b) => /autres/.test(b.getAttribute('onclick') || ''));
        if (autres) { autres.click(); await attendre(2500); }
        r.role = { avant: (await lire('exec-roles-equipe')).length };
        document.querySelector('[onclick^="execOpenRoleEquipeModal"]')?.click();
        await attendre(2400);
        poser('req_item', 'SURV 0.c — rôle de la ronde');
        poser('req_ordre', '9');
        poser('req_description', 'Posé par la ronde, retiré par elle.');
        await attendre(900);
        document.querySelector('[onclick^="execSaveRoleEquipe"]')?.click();
        await attendre(3500);
        const roles = await lire('exec-roles-equipe');
        r.role.apres = roles.length;
        r.role.lignesApres = lignes('execDeleteRoleEquipe');
        const roleNouveau = roles.find((x) => /rôle de la ronde/.test(x.item || ''));
        r.role.enBase = !!roleNouveau;
        if (roleNouveau) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteRoleEquipe"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(roleNouveau.id));
          r.role.boutonRetrait = !!b;
          if (b) {
            b.click();
            await attendre(1200);
            // Ce retrait-là passe par la confirmation du module, non par celle
            // du socle : deux fenêtres de confirmation coexistent dans SURV.
            const oui = document.querySelector('.oasis-confirm-oui, .exec-proc-confirm-oui,'
              + ' [onclick*="execProcConfirmerOui"]')
              || [...document.querySelectorAll('button')]
                .find((x) => /^(Supprimer|Confirmer|Oui)$/i.test((x.textContent || '').trim()));
            r.role.confirme = !!oui;
            if (oui) { oui.click(); await attendre(3200); }
          }
          r.role.fin = (await lire('exec-roles-equipe')).length;
        }
        return r;
      }, M);

      verifier('la barre des paramètres se replie et se déplie, et ses quatre sous-menus rendent chacun leur contenu',
        referentiels.sousMenus > 0 && referentiels.barreDepliee === referentiels.sousMenus
        && referentiels.sousMenusParcourus >= 4
        && referentiels.sousMenusDistincts === referentiels.sousMenusParcourus,
        JSON.stringify({ sousMenus: referentiels.sousMenus, repliee: referentiels.barreRepliee,
          depliee: referentiels.barreDepliee, parcourus: referentiels.sousMenusParcourus,
          distincts: referentiels.sousMenusDistincts }));

      // ── Le contrôle qui a trouvé le défaut : la table **et** le serveur ──
      //
      // `lignesApres > lignesAvant` est la moitié qui manquait. Sans elle, le
      // contrôle aurait été vert sur un écran qui n'affichait pas ce qu'il
      // venait d'écrire.
      verifier('une criticité créée paraît dans la table, est portée par le serveur, et se retire',
        referentiels.crit.apres === referentiels.crit.avant + 1
        && referentiels.crit.enBase === true
        && referentiels.crit.lignesApres > referentiels.crit.lignesAvant
        && referentiels.crit.boutonRetrait === true && referentiels.crit.confirme === true
        && referentiels.crit.fin === referentiels.crit.avant
        && referentiels.crit.lignesFin === referentiels.crit.lignesAvant,
        JSON.stringify(referentiels.crit));
      verifier('un type de cas créé paraît dans la table, est porté par le serveur, et se retire',
        referentiels.tc.apres === referentiels.tc.avant + 1
        && referentiels.tc.enBase === true
        && referentiels.tc.lignesApres > referentiels.tc.lignesAvant
        && referentiels.tc.boutonRetrait === true && referentiels.tc.confirme === true
        && referentiels.tc.fin === referentiels.tc.avant
        && referentiels.tc.lignesFin === referentiels.tc.lignesAvant,
        JSON.stringify(referentiels.tc));
      // ── Les trois familles restantes : checklist, statut, délais ──
      //
      // Le patron ne change pas, et deux particularités ont été relevées avant
      // d'écrire : les gestionnaires de statuts et de sous-thèmes rendent dans
      // la fenêtre du **socle** (`#shellModal`), non dans le volet du module ;
      // et celui des sous-thèmes s'ouvre **depuis l'éditeur de checklist**, non
      // depuis le sous-menu. Un contrôle qui l'aurait cherché sur la page aurait
      // rendu « gestionnaire introuvable » sur un geste qui marche.
      etape = 'checklists et délais';
      const suite2 = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        // ── Le préfixe du module, et la faute que j'ai refaite ──
        //
        // Le client appelle `api('exec-checklists')`, et `execRoute()` de
        // `exec-boot.js` traduit tout `/api/exec-*` en
        // `/api/m/execution/exec-*`. Un `fetch` brut, lui, ne traduit rien : le
        // premier jet de cette ronde a reçu **404 sur `/api/exec-checklists`**,
        // et cinq contrôles ont rougi pour cette seule raison.
        //
        // C'est la deuxième fois : en 5.f.9 j'avais pris la même adresse pour
        // fausse chez le client, alors que la mienne l'était. *Une adresse qui
        // marche dans l'écran et pas dans l'essai ne dit rien de l'écran : elle
        // dit que l'essai n'emprunte pas le même chemin.*
        const lire = async (c) => {
          try { return await (await fetch(`${api}/${c}`,
            { credentials: 'same-origin' })).json(); } catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3200);
          return true;
        };
        const shell = () => (document.getElementById('shellModal') || { innerHTML: '' }).innerHTML.length;

        const sousMenu = (nom) => [...document.querySelectorAll('[onclick*="_execParamSub"]')]
          .find((x) => new RegExp(nom).test(x.getAttribute('onclick') || ''));
        sousMenu('checklists')?.click();
        await attendre(2500);

        // ── Famille 4 : la checklist, et son éditeur ──
        r.chk = { avant: (await lire('exec-checklists')).length };
        document.querySelector('[onclick^="execOpenChecklistModal"]')?.click();
        await attendre(2400);
        poser('clRef', 'RONDE-0.c');
        poser('clNom', 'SURV 0.c — checklist de la ronde');
        poser('clDesc', 'Posée par la ronde, retirée par elle.');
        // La portée : une case au moins, sans quoi la checklist ne s'applique
        // à rien. Le geste est `_clCocherPortee`.
        const portee = document.querySelector('#shellModal input[type="checkbox"], .modal input[type="checkbox"]');
        if (portee && !portee.checked) { portee.click(); await attendre(900); }
        await attendre(800);
        document.querySelector('[onclick^="execSaveChecklist"]')?.click();
        await attendre(3500);
        const chks = await lire('exec-checklists');
        r.chk.apres = chks.length;
        const chkNouvelle = chks.find((c) => /checklist de la ronde/.test(c.nom || ''));
        r.chk.enBase = !!chkNouvelle;
        r.chk.lignes = document.querySelectorAll('[onclick^="execDeleteChecklist"]').length;

        // L'éditeur de la checklist créée : une ligne d'item ajoutée, puis le
        // gestionnaire des sous-thèmes qu'il porte.
        if (chkNouvelle) {
          const ouvrir = [...document.querySelectorAll('[onclick^="execOpenChecklistEditor"]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(chkNouvelle.id));
          r.chk.boutonEditeur = !!ouvrir;
          if (ouvrir) {
            ouvrir.click();
            await attendre(3500);
            r.editeur = { ouvert: !!document.getElementById('execCliEditorWrap') };
            const items = async () => (await lire('exec-checklist-items'))
              .filter((i) => i.checklist_id === chkNouvelle.id).length;
            r.editeur.itemsAvant = await items();
            document.querySelector('#execCliEditorWrap [onclick^="execAddChecklistRow"]')?.click();
            await attendre(3200);
            r.editeur.itemsApres = await items();
            r.editeur.lignes = document.querySelectorAll('#execCliEditorWrap tbody tr').length;

            // ── Famille 5 : le sous-thème, depuis l'éditeur ──
            document.querySelector('#execCliEditorWrap [onclick^="execOpenSousThemesManager"]')?.click();
            await attendre(2600);
            r.st = { manager: shell(), avant: (await lire('exec-checklist-sous-themes')).length };
            document.querySelector('#shellModal [onclick^="execOpenSousThemeModal"]')?.click();
            await attendre(2400);
            // Les champs du sous-thème ne portent pas tous un identifiant connu
            // d'avance : on renseigne ce que la fenêtre offre — le thème par sa
            // liste, les textes par un marqueur.
            const liste = document.querySelector('#shellModal select');
            if (liste && liste.options.length > 1) {
              liste.selectedIndex = 1;
              liste.dispatchEvent(new Event('change', { bubbles: true }));
              await attendre(800);
            }
            [...document.querySelectorAll('#shellModal input[type="text"], #shellModal input:not([type])')]
              .forEach((e, i) => {
                e.value = i === 0 ? 'SURV 0.c — sous-thème de la ronde' : `RND${i}`;
                e.dispatchEvent(new Event('input', { bubbles: true }));
              });
            await attendre(800);
            document.querySelector('#shellModal [onclick^="execSaveSousTheme"]')?.click();
            await attendre(3500);
            const sts = await lire('exec-checklist-sous-themes');
            r.st.apres = sts.length;
            const stNouveau = sts.find((x) => /sous-thème de la ronde/.test(x.libelle || x.item || ''));
            r.st.enBase = !!stNouveau;
            if (stNouveau) {
              const b = [...document.querySelectorAll('[onclick^="execDeleteSousTheme"]')]
                .find((x) => (x.getAttribute('onclick') || '').includes(stNouveau.id));
              r.st.boutonRetrait = !!b;
              if (b) { b.click(); r.st.confirme = await confirmer(); }
              r.st.fin = (await lire('exec-checklist-sous-themes')).length;
            }
            document.querySelector('[onclick^="shellCloseModal"]')?.click();
            await attendre(1500);
            document.querySelector('[onclick^="execCloseChecklistEditor"]')?.click();
            await attendre(2000);
            r.editeur.ferme = !document.getElementById('execCliEditorWrap');
          }
          // Et la checklist retirée : ses items partent avec elle.
          const b = [...document.querySelectorAll('[onclick^="execDeleteChecklist"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(chkNouvelle.id));
          r.chk.boutonRetrait = !!b;
          if (b) { b.click(); r.chk.confirme = await confirmer(); }
          r.chk.fin = (await lire('exec-checklists')).length;
          r.chk.itemsFin = (await lire('exec-checklist-items'))
            .filter((i) => i.checklist_id === chkNouvelle.id).length;
        }

        // ── Famille 6 : le statut de checklist, dans la fenêtre du socle ──
        document.querySelector('[onclick^="execOpenStatutsManager"]')?.click();
        await attendre(2600);
        r.statut = { manager: shell(), avant: (await lire('exec-checklist-statuts')).length };
        document.querySelector('#shellModal [onclick^="execOpenStatutModal"]')?.click();
        await attendre(2400);
        poser('stLib', 'SURV 0.c — statut de la ronde');
        poser('stAlias', 'RND');
        poser('stCol', '#123456');
        poser('stOrd', '9');
        await attendre(800);
        document.querySelector('[onclick^="execSaveStatut"]')?.click();
        await attendre(3500);
        const statuts = await lire('exec-checklist-statuts');
        r.statut.apres = statuts.length;
        const statutNouveau = statuts.find((x) => /statut de la ronde/.test(x.libelle || ''));
        r.statut.enBase = !!statutNouveau;
        if (statutNouveau) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteStatut"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(statutNouveau.id));
          r.statut.boutonRetrait = !!b;
          if (b) { b.click(); r.statut.confirme = await confirmer(); }
          r.statut.fin = (await lire('exec-checklist-statuts')).length;
        }
        document.querySelector('[onclick^="shellCloseModal"]')?.click();
        await attendre(1500);

        // ── Famille 7 : les délais du processus, et leur propre réversibilité ──
        //
        // `execEtatsDelaisDefaut` rétablit les valeurs d'origine : le geste de
        // retour en arrière **est** un geste de l'écran, et c'est le seul
        // référentiel de cette ronde qui n'a pas besoin qu'on le lui invente.
        sousMenu('delais')?.click();
        await attendre(2600);
        // ── La route nomme ses valeurs « valeurs », et non « delais » ──
        //
        // Premier jet : `(corps || {}).delais`, qui rendait un objet vide. La
        // route répond `{ valeurs, defauts, modifiable }` — et c'est le message
        // d'échec, instrumenté pour nommer la **forme** de la réponse, qui l'a
        // dit : « forme: valeurs,defauts,modifiable ».
        //
        // *Un message d'échec qui ne dit que « 0 » fait deviner ; celui qui dit
        // la forme de ce qu'il a lu fait trouver.*
        const delais = async () => {
          const rep = await fetch(`${api}/parametres/delais`, { credentials: 'same-origin' });
          r.delaisStatut = rep.status;
          const corps = await rep.json().catch(() => null);
          r.delaisForme = corps ? Object.keys(corps).join(',') : 'illisible';
          return (corps || {}).valeurs || {};
        };
        const avantDelais = await delais();
        const cle = Object.keys(avantDelais)[0];
        r.delais = { cle, avant: avantDelais[cle], cles: Object.keys(avantDelais).length };
        poser(`delai_${cle}`, String((avantDelais[cle] || 0) + 11));
        await attendre(800);
        document.querySelector('[onclick^="execEtatsEnregistrerDelais"]')?.click();
        await attendre(3200);
        r.delais.apres = (await delais())[cle];
        // ── « Valeurs par défaut » remplit le formulaire, il n'enregistre pas ──
        //
        // Premier jet : on cliquait le geste et l'on attendait une confirmation,
        // puis le serveur rétabli. Ni l'une ni l'autre : `execEtatsDelaisDefaut`
        // **pose les valeurs d'origine dans les champs**, et rien de plus — il
        // n'y a pas de confirmation parce qu'il n'y a pas d'écriture.
        //
        // Le rétablissement demande donc **deux** gestes, et le contrôle y gagne :
        // il distingue ce que porte le **formulaire** de ce que porte
        // l'**enregistrement**. *Un geste qui prépare n'est pas un geste qui
        // écrit, et un contrôle qui les confond passe à côté des deux.*
        document.querySelector('[onclick^="execEtatsDelaisDefaut"]')?.click();
        await attendre(1200);
        r.delais.champRendu = Number((document.getElementById(`delai_${cle}`) || {}).value);
        r.delais.avantSecondEnregistrement = (await delais())[cle];
        document.querySelector('[onclick^="execEtatsEnregistrerDelais"]')?.click();
        await attendre(3200);
        r.delais.rendu = (await delais())[cle];
        return r;
      }, M);

      verifier('une checklist créée paraît dans la table, est portée par le serveur, et se retire avec ses items',
        suite2.chk.apres === suite2.chk.avant + 1 && suite2.chk.enBase === true
        && suite2.chk.boutonRetrait === true && suite2.chk.confirme === true
        && suite2.chk.fin === suite2.chk.avant && suite2.chk.itemsFin === 0,
        JSON.stringify(suite2.chk));
      verifier('l’éditeur de checklist s’ouvre, une ligne d’item s’y ajoute, et il se referme',
        !!suite2.editeur && suite2.editeur.ouvert === true
        && suite2.editeur.itemsApres === suite2.editeur.itemsAvant + 1
        && suite2.editeur.ferme === true,
        JSON.stringify(suite2.editeur));
      verifier('un sous-thème créé depuis l’éditeur est porté par le serveur, et se retire',
        !!suite2.st && suite2.st.manager > 500
        && suite2.st.apres === suite2.st.avant + 1 && suite2.st.enBase === true
        && suite2.st.fin === suite2.st.avant,
        JSON.stringify(suite2.st));
      verifier('un statut de checklist créé est porté par le serveur, et se retire',
        !!suite2.statut && suite2.statut.manager > 500
        && suite2.statut.apres === suite2.statut.avant + 1 && suite2.statut.enBase === true
        && suite2.statut.boutonRetrait === true && suite2.statut.confirme === true
        && suite2.statut.fin === suite2.statut.avant,
        JSON.stringify(suite2.statut));
      verifier('un délai du processus s’enregistre, et les valeurs par défaut le rétablissent en deux gestes',
        !!suite2.delais && !!suite2.delais.cle
        && suite2.delais.apres === suite2.delais.avant + 11
        // Le geste des défauts n'a touché que le champ : le serveur porte encore
        // la valeur modifiée à cet instant.
        && suite2.delais.champRendu === suite2.delais.avant
        && suite2.delais.avantSecondEnregistrement === suite2.delais.apres
        && suite2.delais.rendu === suite2.delais.avant,
        JSON.stringify({ ...suite2.delais, statut: suite2.delaisStatut,
          forme: suite2.delaisForme }));

      verifier('un rôle d’équipe créé est porté par le serveur, et se retire',
        referentiels.role.apres === referentiels.role.avant + 1
        && referentiels.role.enBase === true
        && referentiels.role.fin === referentiels.role.avant,
        JSON.stringify(referentiels.role));

      // ══════════════════════════════════════════════════════════════════
      //  La constatation directe : créée hors dossier, et son circuit
      // ══════════════════════════════════════════════════════════════════
      //
      // Une constatation n'est pas toujours la suite d'une inspection : l'écran
      // permet d'en ouvrir une **directement**, avec son propre circuit —
      // saisie, commentaires, validation, transmission à l'organisme.
      //
      // ── Où elle se crée, et ce que cela coûte de le savoir ──
      //
      // Les trois sous-onglets de la page offrent les mêmes exports, mais
      // **seul « En Préparation » porte le bouton « Nouvelle Constatation »** —
      // relevé en parcourant les trois avant d'écrire. Un contrôle qui l'aurait
      // cherché sur « Suivi » aurait rendu « bouton introuvable » sur un geste
      // qui marche.
      //
      // ── Son ménage est à elle ──
      //
      // Elle n'a **pas de dossier**, et la suppression du dossier de la ronde ne
      // l'emportera donc pas. Elle part par son propre geste, et le contrôle le
      // vérifie — sans quoi la campagne suivante hériterait d'une constatation
      // que personne n'a créée.
      etape = 'constatation directe';
      const directe = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const toutes = async () => {
          try { return await (await fetch(`${api}/constatations`,
            { credentials: 'same-origin' })).json(); } catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e || e.options.length < 2) return '';
          e.selectedIndex = 1;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3500);
          return true;
        };
        const volet = () => (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;

        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3200);

        // Les trois sous-onglets, et leurs exports capturés par relais.
        const recu = { fenetres: [], blobs: 0 };
        const vraiOpen = window.open;
        const vraiURL = URL.createObjectURL;
        window.open = () => {
          const f = { html: '' };
          recu.fenetres.push(f);
          return {
            document: { write: (h) => { f.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        URL.createObjectURL = (b) => { recu.blobs += 1; return vraiURL.call(URL, b); };
        const onglets = [...document.querySelectorAll('.exec-tab')].map((b) => b.getAttribute('onclick'));
        r.onglets = onglets.length;
        const empreintes = [];
        for (const h of onglets) {
          [...document.querySelectorAll('.exec-tab')]
            .find((x) => x.getAttribute('onclick') === h)?.click();
          /* eslint-disable no-await-in-loop */
          await attendre(2200);
          const z = document.getElementById('exec-content');
          empreintes.push(`${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}`);
        }
        r.ongletsDistincts = new Set(empreintes).size;

        // ── Les exports viennent **après** la création ──
        //
        // Premier jet : ils étaient cliqués ici, et ne produisaient **rien** —
        // les trois tables étaient vides à cet instant, et un export sans
        // donnée dit « aucune donnée » par un message, non par un document.
        // Ils sont donc déplacés après la constatation créée, où il y a quelque
        // chose à exporter. *L'ordre fait partie de la mesure*, pour la
        // cinquième fois de cette suite.

        // ── « En Préparation » : le seul sous-onglet qui crée ──
        const prep = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /'list'/.test(b.getAttribute('onclick') || ''));
        if (prep) { prep.click(); await attendre(2600); }
        const avantIds = new Set((await toutes()).map((c) => c.id));
        r.avant = avantIds.size;
        const nouvelle = document.querySelector('[onclick^="execOpenConstatationDirecteForm"]');
        r.boutonNouvelle = !!nouvelle;
        if (!nouvelle) return r;
        nouvelle.click();
        await attendre(3200);
        r.formulaire = volet();

        // Les listes en cascade : l'organisme puis le secteur, dont les
        // gestionnaires recalculent ce qui suit.
        const prest = document.querySelector('#execSlider [onchange*="execCdOnPrestataireChange"]');
        if (prest && prest.options.length > 1) {
          prest.selectedIndex = 1;
          prest.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(1600);
        }
        r.choix = {
          domaine: choisir('cd_domaine'),
          secteur: choisir('cd_secteur'),
        };
        await attendre(1400);
        poser('cd_titre', 'SURV 0.c — constatation directe de la ronde');
        poser('cd_description', 'Ouverte par la ronde, retirée par elle.');
        // La criticité commande le délai, qui commande la date due : trois
        // gestes qui s'enchaînent, et c'est leur enchaînement qu'on éprouve.
        r.choix.criticite = choisir('cd_criticite');
        await attendre(1600);
        r.delaiCalcule = (document.getElementById('cd_delai') || {}).value || '';
        r.dateCalculee = (document.getElementById('cd_date_due') || {}).value || '';
        r.choix.cas = choisir('cd_cas');
        poser('cd_reco', 'Recommandation de la ronde.');
        await attendre(1200);

        document.querySelector('[onclick^="execSaveConstatationDirecte"]')?.click();
        await attendre(4000);
        const apres = await toutes();
        r.apres = apres.length;
        // ── On reconnaît sa création par **différence**, non par un champ ──
        //
        // Premier jet : `c.titre || c.description` comparé au texte saisi. Le
        // champ porté par l'enregistrement n'est ni l'un ni l'autre, et le
        // relevé rendait `null` sur une création qui avait porté — 2 avant, 3
        // après, et introuvable. *Ce qu'une ronde vient de créer se reconnaît à
        // ce qui n'était pas là, et non à un champ qu'on suppose.*
        const mienne = apres.find((c) => !avantIds.has(c.id));
        r.creee = mienne ? {
          id: mienne.id, statut: mienne.statut, dossier: mienne.dossier_id || null,
          // Les champs sont relevés pour mémoire, non pour identifier.
          champs: Object.keys(mienne).filter((k) => /titre|descr|reference/.test(k)).join(','),
        } : null;
        if (!mienne) return r;

        // ── L'export PDF se clique ; celui en classeur **ne peut pas** ──
        //
        // `execExporterConstatationsXlsx` pose `window.location.href` sur la
        // route d'export : le navigateur **quitte la page**, et l'évaluation en
        // cours meurt avec elle — « Execution context was destroyed », mesuré au
        // premier passage. Le relais de `window.open` n'y change rien : ce n'est
        // pas une fenêtre qui s'ouvre, c'est la page qui part.
        //
        // C'est la famille de 5.f.11, et la réponse est la même : la route
        // `/constatations/export-xlsx` se prouve **en HTTP** — code, type,
        // pièce jointe, taille —, et huit contrôles l'y attendent dans
        // `execution.smoke.js`. *Un geste qui emporte la page ne se clique pas
        // dans une suite qui tient la page.*
        document.querySelector('[onclick^="execExporterConstatationsPdf"]')?.click();
        await attendre(2400);
        window.open = vraiOpen;
        URL.createObjectURL = vraiURL;
        r.exports = { documents: recu.fenetres.map((f) => f.html.length), blobs: recu.blobs };

        // ── Son circuit : consulter, commenter, valider, transmettre ──
        const ouvrir = async () => {
          const b = [...document.querySelectorAll('[onclick^="execOpenConstatationDirecteSlider"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(mienne.id));
          if (!b) return false;
          b.click();
          await attendre(3500);
          return true;
        };
        r.ouverte = await ouvrir();
        r.gestesCircuit = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];

        // ── Les trois clics du panneau de commentaires sont partis d'ici ──
        //
        // Ils y étaient — la poignée, « Ajouter », « Enregistrer » — et ils ne
        // touchaient **rien** : à l'arrivée le panneau est déjà déplié, de
        // sorte que le premier clic le repliait et que les deux suivants
        // n'avaient plus de cible. Aucune assertion ne portait sur eux, et
        // rien ne l'a dit. Le panneau est éprouvé dans la ronde du prononcé,
        // plus bas, dans l'ordre que l'écran impose (n° 5.f.77).

        // La validation, puis la transmission à l'organisme.
        // ── Cette validation ne demande **pas** confirmation ──
        //
        // Mon assertion l'exigeait, par analogie avec les autres gestes décisifs
        // de cet écran — soumettre, clôturer, effacer : tous passent par
        // `oasisConfirmer`. Celui-ci non : le statut est passé de
        // `direct_soumis` à `direct_valide` **sans qu'aucune fenêtre
        // n'apparaisse**, et le relevé disait « validationConfirmee: false » sur
        // une validation qui avait porté.
        //
        // L'assertion était donc fausse, non l'écran. Ce qui compte est le
        // **changement d'état**, et c'est lui qu'on éprouve. Que ce geste seul
        // ne demande rien est une inconstance de l'écran, relevée et non
        // tranchée : c'est à la maîtrise d'ouvrage de dire si valider une
        // constatation doit se confirmer comme le reste.
        //
        // *Un contrôle écrit par analogie éprouve l'analogie, non le geste.*
        const valider = document.querySelector('#execSlider [onclick^="execValidateConstatationDirecte"]');
        r.boutonValider = !!valider;
        if (valider) {
          valider.click();
          await attendre(1000);
          r.validationDemandeConfirmation = !!document.querySelector('.oasis-confirm-oui');
          if (r.validationDemandeConfirmation) await confirmer();
          await attendre(3200);
        }
        r.statutApresValidation = ((await toutes()).find((c) => c.id === mienne.id) || {}).statut;

        // ── La transmission n'est **pas** cliquée, et la raison est nommée ──
        //
        // Transmettre une constatation **envoie un courriel**. Sans serveur de
        // messagerie, la route refuse — proprement : **502**, « le serveur de
        // messagerie (localhost:1025) ne répond pas : rien n'a été transmis ».
        // C'est le bon comportement, et c'est une limite de l'environnement
        // d'essai, non un défaut de l'écran.
        //
        // Le geste a donc été cliqué une fois, pour mesurer ; il ne l'est plus,
        // parce qu'un 502 attendu salirait le relevé des incidents de console et
        // ferait passer une limite connue pour une anomalie. Le **refus**, lui,
        // est éprouvé pour lui-même dans la suite HTTP — comme l'a été le 400 de
        // la transmission signée en 5.f.8.
        r.boutonTransmettre = !!document.querySelector('#execSlider [onclick^="execTransmettreConstatation"]');

        // ── Le ménage : elle n'a pas de dossier, elle part par son geste ──
        document.querySelector('[onclick^="execCloseSlider"], [onclick^="execRetourVolet"]')?.click();
        await attendre(2000);
        const suppr = await fetch(`${api}/constatations/${mienne.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        r.suppression = suppr.status;
        r.fin = (await toutes()).filter((c) => c.id === mienne.id).length;
        return r;
      }, M);

      verifier('les trois sous-onglets des constatations rendent chacun leur contenu',
        directe.onglets >= 3 && directe.ongletsDistincts === directe.onglets,
        JSON.stringify({ onglets: directe.onglets, distincts: directe.ongletsDistincts }));
      verifier('l’export PDF des constatations remet un document, une fois qu’il y a matière',
        !!directe.exports
        && ((directe.exports.documents || []).some((n) => n > 500) || directe.exports.blobs > 0),
        JSON.stringify(directe.exports));
      verifier('le formulaire d’une constatation directe s’ouvre, et la criticité choisie calcule son délai et sa date',
        directe.boutonNouvelle === true && directe.formulaire > 2000
        && !!directe.choix && !!directe.choix.criticite
        && Number(directe.delaiCalcule) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(directe.dateCalculee),
        JSON.stringify({ formulaire: directe.formulaire, choix: directe.choix,
          delai: directe.delaiCalcule, date: directe.dateCalculee }));
      verifier('la constatation directe s’enregistre sans dossier, et le serveur la porte',
        directe.apres === directe.avant + 1 && !!directe.creee
        && !directe.creee.dossier,
        JSON.stringify({ avant: directe.avant, apres: directe.apres, creee: directe.creee }));
      verifier('son circuit se parcourt : validée, et le geste de transmission lui est offert',
        directe.ouverte === true
        && (directe.gestesCircuit || []).includes('execValidateConstatationDirecte')
        && directe.boutonValider === true
        && !!directe.creee && directe.statutApresValidation !== directe.creee.statut
        && directe.boutonTransmettre === true,
        JSON.stringify({ ouverte: directe.ouverte, boutonValider: directe.boutonValider,
          // Relevé pour mémoire : ce geste ne demande pas confirmation, quand
          // tous les autres gestes décisifs de l'écran la demandent.
          demandeConfirmation: directe.validationDemandeConfirmation,
          creee: (directe.creee || {}).statut, valide: directe.statutApresValidation,
          transmission: directe.boutonTransmettre,
          gestes: (directe.gestesCircuit || []).length }));
      verifier('la constatation directe ne survit pas à la ronde, qui l’efface elle-même',
        directe.suppression === 200 && directe.fin === 0,
        JSON.stringify({ suppression: directe.suppression, reste: directe.fin }));

      // ══════════════════════════════════════════════════════════════════
      //  Le prononcé d'une constatation : commenter, renvoyer, corriger,
      //  rejeter — et la remise à l'organisme
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Trois clics qui ne touchaient rien, et que rien ne disait ──
      //
      // La ronde ci-dessus ouvrait le volet d'une constatation soumise, puis
      // cliquait **la poignée** du panneau de commentaires, « Ajouter », et
      // « Enregistrer ». Mesuré le 9 novembre 2026 : à l'ouverture le panneau
      // est **déjà déplié** — `EXEC_CD_COM.replie` vaut `false`. Le premier
      // clic le **replie** donc, et le panneau replié se réduit à sa poignée :
      // les deux boutons suivants **n'existent plus**. `saisie` valait 0 après
      // les trois clics, et aucun commentaire n'était parti au serveur.
      //
      // Le relevé des gestes le disait depuis le début —
      // `execCdAjouterCommentaire` et `execCdEnregistrerCommentaires` non
      // exercés, quand `execCdBasculerCommentaires` l'était — et personne ne
      // l'avait lu. Rien n'avait rougi : **aucune assertion ne portait sur ces
      // trois clics**. Ils étaient là pour couvrir des gestes, non pour
      // éprouver un résultat.
      //
      // *Un clic sans assertion ne garde rien, et ne se trahit même pas : il
      // passe pour du travail fait.* Les trois sont retirés de la ronde
      // ci-dessus, et le panneau est éprouvé ici, dans l'ordre que l'écran
      // impose — on ajoute d'abord, on replie ensuite.
      //
      // ── Ce que le panneau est, et pourquoi il vaut une ronde ──
      //
      // C'est le seul endroit du module où une décision se **motive champ par
      // champ**. Le valideur annote la constatation — « Description : ne nomme
      // pas l'exigence manquée » —, ces annotations vivent par **versions**, et
      // le renvoi les transmet **comme motif** : pas de double saisie, et le
      // rédacteur relit en tête de son formulaire exactement ce qui lui est
      // demandé. La version se **fige** au prononcé, et le tour suivant en
      // ouvre une autre : l'historique des tours est donc lisible.
      //
      // La ronde parcourt le circuit entier, chaque palier relu **chez le
      // serveur** : commenter, renvoyer, corriger, resoumettre, rejeter. Puis
      // la remise à l'organisme sur une seconde constatation, validée.
      etape = 'prononcé d’une constatation';
      const prononce = await page.evaluate(async (api) => {
        const at = (ms) => new Promise((r) => setTimeout(r, ms));
        const J = async (u, m, b) => {
          const r = await fetch(u, {
            method: m || 'GET', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: b ? JSON.stringify(b) : undefined,
          });
          let c = null; try { c = await r.json(); } catch { c = null; }
          return { statut: r.status, corps: c };
        };
        const r = {};
        const q = (s) => document.querySelector(`#execSlider ${s}`);
        const tous = (s) => document.querySelectorAll(`#execSlider ${s}`).length;
        const lire = async (id) => (await J(`${api}/constatations/${id}`)).corps || {};
        const prestataires = EXEC_STATE.data.prestataires || [];
        const domaines = EXEC_STATE.data.domaines || [];
        // Le jeu d'essai fournit la matière ; la ronde ne la suppose pas.
        r.matiere = { prestataires: prestataires.length, domaines: domaines.length };
        if (!prestataires.length || !domaines.length) return r;

        // Le gabarit : créée puis soumise par l'API, parce que ce qui est
        // éprouvé ici commence **à la validation**. La ronde ci-dessus a déjà
        // éprouvé la création par le formulaire.
        const neuve = async (titre) => {
          const c = await J(`${api}/constatations`, 'POST', {
            prestataire_id: prestataires[0].id, domaine_id: domaines[0].id,
            titre, description: 'Portée par la ronde du prononcé.',
            criticite: 'majeure', delai_solde: '30', direct: true,
          });
          const id = (c.corps || {}).id;
          if (id) await J(`${api}/constatations/${id}/direct-soumettre`, 'PUT');
          return id;
        };
        const liste = async () => {
          await execRefreshDynamic();
          document.querySelector('.nav-btn[data-page="constatations"]')?.click();
          await at(2800);
          [...document.querySelectorAll('.exec-tab')]
            .find((b) => /'list'/.test(b.getAttribute('onclick') || ''))?.click();
          await at(2200);
        };
        const geste = (id, nom) => [...document.querySelectorAll(`[onclick^="${nom}"]`)]
          .find((x) => (x.getAttribute('onclick') || '').includes(id));

        // ── Le titre, qui ne tenait pas à la création ──
        //
        // `POST /constatations` ne portait pas `titre` : le formulaire
        // l'écrivait, le volet le rendait « — », et il ne revenait qu'au
        // premier enregistrement suivant. Corrigé le 9 novembre 2026 ; ce
        // contrôle est ce qui le garde.
        const TITRE = 'SURV 0.c — le titre que la création doit garder';
        const idA = await neuve(TITRE);
        r.cree = idA ? (await lire(idA)) : {};
        r.titreTenu = (r.cree.titre || '') === TITRE;
        r.casLibre = r.cree.cas_type || '';
        if (!idA) return r;

        // ── La ligne de la table : son détail, et la colonne qui l'arrête ──
        await liste();
        const ligne = [...document.querySelectorAll('tr[onclick]')]
          .find((t) => (t.getAttribute('onclick') || '').includes(idA));
        const detail = () => {
          const d = document.getElementById(`fnc_accordion_${idA}`);
          return d ? d.style.display : 'absent';
        };
        r.ligne = { presente: !!ligne, avant: detail() };
        if (ligne) { ligne.click(); await at(900); r.ligne.depliee = detail(); ligne.click(); await at(700); r.ligne.repliee = detail(); }
        // La colonne des actions arrête le clic : sans quoi presser un bouton
        // déplierait aussi la ligne qui le porte.
        const cellule = ligne ? ligne.querySelector('.exec-etats-actions') : null;
        r.ligne.cellule = !!cellule;
        if (cellule) { cellule.click(); await at(700); r.ligne.apresCellule = detail(); }

        // ══ 1 — Le panneau de commentaires, dans l'ordre que l'écran impose ══
        const ouvrir = async () => {
          await liste();
          const b = geste(idA, 'execOpenConstatationDirecteSlider');
          if (!b) return false;
          b.click(); await at(3400);
          return true;
        };
        r.ouvert = await ouvrir();
        r.arrivee = {
          etape: typeof EXEC_CD !== 'undefined' ? EXEC_CD.etape : '',
          replie: typeof EXEC_CD_COM !== 'undefined' ? EXEC_CD_COM.replie : null,
          ajouter: tous('[onclick^="execCdAjouterCommentaire"]'),
          enregistrer: tous('[onclick^="execCdEnregistrerCommentaires"]'),
          poignee: tous('[onclick^="execCdBasculerCommentaires"]'),
        };

        // Un commentaire : ajouté, visé sur un champ, rédigé.
        q('[onclick^="execCdAjouterCommentaire"]')?.click();
        await at(1500);
        r.ajout = {
          saisie: (EXEC_CD_COM.saisie || []).length,
          texte: tous('.exec-cd-com-texte'),
          cible: tous('[onchange^="execCdCommentaireChamp"]'),
          retirer: tous('[onclick^="execCdRetirerCommentaire"]'),
        };
        const sel = q('[onchange^="execCdCommentaireChamp"]');
        if (sel) { sel.value = 'description'; sel.dispatchEvent(new Event('change', { bubbles: true })); await at(1300); }
        r.cibleChoisie = (EXEC_CD_COM.saisie[0] || {}).cible;
        const OBS = 'La description ne nomme pas l’exigence manquée.';
        const ta = q('.exec-cd-com-texte');
        if (ta) { ta.value = OBS; ta.dispatchEvent(new Event('input', { bubbles: true })); await at(900); }
        r.texteSaisi = (EXEC_CD_COM.saisie[0] || {}).texte === OBS;

        // Un second, aussitôt retiré : ce qui est retiré est **celui-là**, et
        // le premier garde son texte.
        q('[onclick^="execCdAjouterCommentaire"]')?.click();
        await at(1300);
        r.deux = (EXEC_CD_COM.saisie || []).length;
        const retirs = [...document.querySelectorAll('#execSlider [onclick^="execCdRetirerCommentaire"]')];
        retirs[retirs.length - 1]?.click();
        await at(1300);
        r.apresRetrait = { nombre: (EXEC_CD_COM.saisie || []).length,
          premierIntact: (EXEC_CD_COM.saisie[0] || {}).texte === OBS };

        // Enregistré, et relu chez le serveur : une version **ouverte**.
        q('[onclick^="execCdEnregistrerCommentaires"]')?.click();
        await at(3200);
        const avecVersion = await lire(idA);
        r.versionOuverte = (avecVersion.commentaires_validation || []).map((v) => ({
          version: v.version, close: !!v.close_le, issue: v.issue || '',
          entrees: (v.entrees || []).map((e) => `${e.cible}|${e.texte}`),
        }));

        // La poignée : maintenant qu'il y a quelque chose, elle replie et rend.
        q('[onclick^="execCdBasculerCommentaires"]')?.click();
        await at(1300);
        r.replie = { etat: EXEC_CD_COM.replie, ajouter: tous('[onclick^="execCdAjouterCommentaire"]') };
        q('[onclick^="execCdBasculerCommentaires"]')?.click();
        await at(1300);
        r.deplie = { etat: EXEC_CD_COM.replie, ajouter: tous('[onclick^="execCdAjouterCommentaire"]') };

        // Le fil d'avancement : une étape ouverte se consulte.
        const fil = [...document.querySelectorAll('#execSlider [onclick^="execCdConsulter"]')];
        r.fil = fil.map((b) => (/'([^']+)'/.exec(b.getAttribute('onclick')) || [])[1]);
        const ailleurs = fil.find((b) => !/validation/.test(b.getAttribute('onclick') || ''));
        if (ailleurs) { ailleurs.click(); await at(2800); }
        r.consulte = EXEC_CD.etape;

        // ══ 2 — Le renvoi, dont le motif **est** le commentaire ══
        r.rouvert = await ouvrir();
        q('[onclick^="execCdAjouterCommentaire"]')?.click();
        await at(1400);
        const ta2 = q('.exec-cd-com-texte');
        if (ta2) { ta2.value = OBS; ta2.dispatchEvent(new Event('input', { bubbles: true })); await at(900); }
        q('[onclick^="execRenvoyerConstatationModal"]')?.click();
        await at(1600);
        const fenetre = document.getElementById('exec_confirm_modal');
        r.modaleRenvoi = { presente: !!fenetre,
          rappelle: !!fenetre && (fenetre.textContent || '').includes('l’exigence manquée') };
        document.getElementById('exec_confirm_ok')?.click();
        await at(3600);
        const renvoyee = await lire(idA);
        r.renvoi = {
          statut: renvoyee.statut,
          motifDuCommentaire: (renvoyee.motif_renvoi || '').includes(OBS),
          journal: (renvoyee.decisions_validation || []).map((d) => d.type),
          versions: (renvoyee.commentaires_validation || []).map((v) => `${v.version}/${v.issue}/${v.close_le ? 'figee' : 'ouverte'}`),
        };

        // ══ 3 — La correction, par le formulaire que la ligne rouvre ══
        await liste();
        const bModif = geste(idA, 'execOpenConstatationDirecteFormById');
        r.boutonModifier = !!bModif;
        if (bModif) { bModif.click(); await at(3400); }
        r.formulaire = {
          longueur: (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length,
          titre: (document.getElementById('cd_titre') || {}).value || '',
          dateDue: (document.getElementById('cd_date_due') || {}).value || '',
        };
        // La zone des références donne le focus à sa saisie.
        document.getElementById('cd_ref_tags')?.click();
        await at(500);
        r.focusRef = document.activeElement
          && document.activeElement.id === 'cd_ref_input';
        // Une référence, posée par la touche Entrée ; la même, qui ne se
        // dédouble pas.
        const exigences = EXEC_STATE.data.exigences || [];
        const REF = (exigences[0] || {}).reference || 'RAB-OPS 1.037';
        const saisieRef = document.getElementById('cd_ref_input');
        const poserRef = async () => {
          if (!saisieRef) return;
          saisieRef.value = REF;
          saisieRef.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          await at(900);
        };
        await poserRef();
        r.refs = { une: document.querySelectorAll('#cd_ref_tags .cd-ref-tag').length,
          valeur: [...document.querySelectorAll('#cd_ref_tags .cd-ref-tag')].map((t) => t.dataset.ref).join(',') };
        await poserRef();
        r.refs.apresDoublon = document.querySelectorAll('#cd_ref_tags .cd-ref-tag').length;
        // Le délai commande la date due, et le changer la recalcule.
        const champDelai = document.getElementById('cd_delai');
        if (champDelai) { champDelai.value = '45'; champDelai.dispatchEvent(new Event('input', { bubbles: true })); await at(900); }
        r.dateRecalculee = (document.getElementById('cd_date_due') || {}).value || '';
        // Une preuve versée : la zone de dépôt délègue à son entrée cachée,
        // puis le fichier part au serveur et paraît dans la liste.
        document.querySelector('#execSlider [onclick^="document.getElementById(\'cd_proof_input\')"]')?.click();
        await at(500);
        const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
        const entreePreuve = document.getElementById('cd_proof_input');
        r.entreePreuve = !!entreePreuve;
        if (entreePreuve) {
          const dt = new DataTransfer();
          dt.items.add(new File([pdf], 'preuve-du-prononce.pdf', { type: 'application/pdf' }));
          entreePreuve.files = dt.files;
          entreePreuve.dispatchEvent(new Event('change', { bubbles: true }));
          await at(3000);
        }
        r.preuve = [...document.querySelectorAll('#cd_preuves_list > div')]
          .map((e) => ({ chemin: e.dataset.path || '', nom: (e.querySelector('span') || {}).textContent }));
        // La fiche de constat, imprimée depuis le formulaire : son produit est
        // capturé par relais, comme les autres documents de cette suite.
        const recu = [];
        const vraiOpen = window.open;
        window.open = () => {
          const f = { html: '' };
          recu.push(f);
          return { document: { write: (h) => { f.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {} };
        };
        q('[onclick^="execFicheConstatPdf"]')?.click();
        await at(2400);
        window.open = vraiOpen;
        r.fiche = recu.map((f) => f.html.length);
        // « Soumettre » siège sur la ligne du fil : il enregistre **et**
        // resoumet, d'un seul geste.
        document.querySelector('#execSlider .exec-proc-actions-etape [onclick^="execSaveConstatationDirecte"]')?.click();
        await at(4200);
        const corrigee = await lire(idA);
        r.corrigee = { statut: corrigee.statut, refs: corrigee.ref_reglementaires,
          delai: String(corrigee.delai_solde || ''), date: corrigee.date_due_cloture,
          preuves: (corrigee.preuves_constatation || []).length, titre: corrigee.titre };

        // ══ 4 — L'historique du tour précédent, et le rejet ══
        r.rouvert2 = await ouvrir();
        r.historique = {
          bandeau: tous('.exec-cd-journal'),
          decisions: tous('.exec-cd-decision'),
          versionsCloses: tous('[onclick^="execCdBasculerVersion"]'),
        };
        const vers = q('[onclick^="execCdBasculerVersion"]');
        if (vers) { vers.click(); await at(1600); }
        r.versionRelue = (q('.exec-cd-com-version') || { textContent: '' })
          .textContent.replace(/\s+/g, ' ').trim();
        // Le bandeau de l'historique se replie par son entête.
        q('.exec-cd-journal .exec-form-section-header')?.click();
        await at(900);
        r.historique.replie = !!q('.exec-cd-journal:not(.expanded)');

        // La fenêtre du rejet, d'abord **refusée** : rien ne doit bouger.
        q('[onclick^="execRejeterConstatationModal"]')?.click();
        await at(1400);
        r.modaleRejet = !!document.getElementById('exec_confirm_modal');
        document.querySelector('#exec_confirm_modal [onclick^="document.getElementById"]')?.click();
        await at(900);
        r.rejetRenonce = { fenetre: !!document.getElementById('exec_confirm_modal'),
          statut: (await lire(idA)).statut };
        // Puis prononcé.
        q('[onclick^="execRejeterConstatationModal"]')?.click();
        await at(1400);
        document.getElementById('exec_confirm_ok')?.click();
        await at(3600);
        const rejetee = await lire(idA);
        r.rejet = { statut: rejetee.statut,
          journal: (rejetee.decisions_validation || []).map((d) => d.type),
          versions: (rejetee.commentaires_validation || []).map((v) => `${v.version}/${v.issue}`) };

        // ══ 5 — La remise à l'organisme ══
        const idB = await neuve('SURV 0.c — la constatation remise');
        r.validee = (await J(`${api}/constatations/${idB}/direct-valider`, 'PUT')).statut;
        await liste();
        const bB = geste(idB, 'execOpenConstatationDirecteSlider');
        r.ouvertB = !!bB;
        if (bB) { bB.click(); await at(3400); }
        r.remise = {
          etape: EXEC_CD.etape,
          courriel: !!document.getElementById('exec_courriel_transmission'),
          destinataire: (document.getElementById('courriel_destinataire') || {}).value || '',
          objetPorteLaReference: ((document.getElementById('courriel_objet') || {}).value || '')
            .includes(((await lire(idB)).reference) || '\u0000'),
          relais: tous('[onclick^="this.nextElementSibling.click"]'),
          // ── La transmission n'est **pas** cliquée, et la raison est nommée ──
          // Transmettre envoie un courriel ; sans serveur de messagerie la
          // route refuse proprement — 502, « rien n'a été transmis ». C'est
          // une limite de l'environnement d'essai, et le refus est éprouvé
          // pour lui-même dans la suite HTTP.
          envoyer: tous('[onclick^="execTransmettreConstatation"]'),
        };
        // Le bouton délègue au sélecteur caché ; le fichier choisi part au
        // serveur et paraît comme pièce du courriel.
        q('[onclick^="this.nextElementSibling.click"]')?.click();
        await at(600);
        const entreeB = q('[onchange^="execCourrielAjouterFichiers"]');
        r.remise.entree = !!entreeB;
        if (entreeB) {
          const dt = new DataTransfer();
          dt.items.add(new File([pdf], 'annexe-de-la-remise.pdf', { type: 'application/pdf' }));
          entreeB.files = dt.files;
          entreeB.dispatchEvent(new Event('change', { bubbles: true }));
          await at(3200);
        }
        r.remise.pieces = [...document.querySelectorAll('#courriel_pieces .exec-piece[data-path]')]
          .map((l) => l.dataset.filename);

        // ══ 6 — Le sous-onglet « Terrain », que rien n'exerçait ══
        //
        // Il ne montre que les constatations dont la vérification sur place est
        // prononcée **et** les preuves acceptées : le jeu d'essai n'en porte
        // aucune, et la table y rend « Aucune donnée ». La ronde pose donc
        // l'évaluation qui fait entrer la sienne, puis déplie son détail.
        await J(`${api}/constatations/${idB}`, 'PUT', {
          commentaire_evaluation: {
            evaluation_anac: {
              verification: { verification_terrain: true, preuves_acceptees: 'OUI' },
              acceptation: { accepte: 'OUI' },
            },
          },
        });
        await execRefreshDynamic();
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await at(2600);
        [...document.querySelectorAll('.exec-tab')]
          .find((b) => /'terrain'/.test(b.getAttribute('onclick') || ''))?.click();
        await at(2400);
        const ligneT = [...document.querySelectorAll('.exec-terrain-ligne')];
        r.terrain = { lignes: ligneT.length,
          avant: (document.querySelector('.exec-terrain-detail') || {}).hidden };
        ligneT[0]?.click();
        await at(1200);
        r.terrain.apres = (document.querySelector('.exec-terrain-detail') || {}).hidden;
        r.terrain.detail = (document.querySelector('.exec-terrain-detail') || { textContent: '' })
          .textContent.trim().length;

        // ══ Le ménage : les deux constatations partent, et rien ne reste ══
        for (const id of [idA, idB]) {
          /* eslint-disable no-await-in-loop */
          await J(`${api}/constatations/${id}`, 'DELETE');
        }
        const reste = ((await J(`${api}/constatations`)).corps || [])
          .filter((c) => [idA, idB].includes(c.id)).length;
        r.menage = reste;
        return r;
      }, M);

      verifier('le titre d’une constatation survit à sa création, et ne se loge pas dans le type de cas',
        prononce.titreTenu === true && prononce.casLibre === '',
        JSON.stringify({ titre: (prononce.cree || {}).titre, cas: prononce.casLibre }));
      verifier('la ligne de la table déplie son détail et le replie, et la colonne des actions arrête le clic',
        prononce.ligne && prononce.ligne.presente === true
        && prononce.ligne.depliee === 'table-row' && prononce.ligne.repliee === 'none'
        && prononce.ligne.cellule === true && prononce.ligne.apresCellule === 'none',
        JSON.stringify(prononce.ligne));
      verifier('le panneau de commentaires est déplié à l’arrivée, et ses deux gestes y sont offerts',
        prononce.ouvert === true && prononce.arrivee
        && prononce.arrivee.etape === 'validation' && prononce.arrivee.replie === false
        && prononce.arrivee.ajouter === 1 && prononce.arrivee.enregistrer === 1
        && prononce.arrivee.poignee === 1,
        JSON.stringify(prononce.arrivee));
      verifier('un commentaire s’ajoute avec sa cible, son retrait et sa zone de texte',
        prononce.ajout && prononce.ajout.saisie === 1 && prononce.ajout.texte === 1
        && prononce.ajout.cible === 1 && prononce.ajout.retirer === 1,
        JSON.stringify(prononce.ajout));
      verifier('la cible se choisit et le texte se saisit, sans que la frappe redessine le panneau',
        prononce.cibleChoisie === 'description' && prononce.texteSaisi === true,
        JSON.stringify({ cible: prononce.cibleChoisie, texte: prononce.texteSaisi }));
      verifier('un second commentaire se retire par son rang, et le premier garde son texte',
        prononce.deux === 2 && prononce.apresRetrait
        && prononce.apresRetrait.nombre === 1 && prononce.apresRetrait.premierIntact === true,
        JSON.stringify({ deux: prononce.deux, apres: prononce.apresRetrait }));
      verifier('les commentaires enregistrés ouvrent une version chez le serveur, qui porte la cible et le texte',
        (prononce.versionOuverte || []).length === 1
        && prononce.versionOuverte[0].version === 1
        && prononce.versionOuverte[0].close === false
        && prononce.versionOuverte[0].entrees.length === 1
        && /^description\|/.test(prononce.versionOuverte[0].entrees[0]),
        JSON.stringify(prononce.versionOuverte));
      verifier('la poignée replie le panneau — ses gestes partent avec lui — et le rend',
        prononce.replie && prononce.replie.etat === true && prononce.replie.ajouter === 0
        && prononce.deplie && prononce.deplie.etat === false && prononce.deplie.ajouter === 1,
        JSON.stringify({ replie: prononce.replie, deplie: prononce.deplie }));
      verifier('le fil d’avancement ouvre les étapes atteintes, et en consulter une change l’étape rendue',
        (prononce.fil || []).length >= 2 && prononce.fil.includes('validation')
        && prononce.consulte && prononce.consulte !== 'validation',
        JSON.stringify({ fil: prononce.fil, consulte: prononce.consulte }));
      verifier('la fenêtre du renvoi rappelle le commentaire qui lui servira de motif',
        prononce.rouvert === true && prononce.modaleRenvoi
        && prononce.modaleRenvoi.presente === true && prononce.modaleRenvoi.rappelle === true,
        JSON.stringify(prononce.modaleRenvoi));
      verifier('le renvoi prononcé fige la version, journalise la décision, et son motif est le commentaire',
        prononce.renvoi && prononce.renvoi.statut === 'direct_renvoye'
        && prononce.renvoi.motifDuCommentaire === true
        && JSON.stringify(prononce.renvoi.journal) === JSON.stringify(['renvoi'])
        && JSON.stringify(prononce.renvoi.versions) === JSON.stringify(['1/renvoi/figee']),
        JSON.stringify(prononce.renvoi));
      verifier('une constatation renvoyée se rouvre par le geste de sa ligne, garnie et modifiable',
        prononce.boutonModifier === true && prononce.formulaire
        && prononce.formulaire.longueur > 8000
        && prononce.formulaire.titre.length > 10
        && /^\d{4}-\d{2}-\d{2}$/.test(prononce.formulaire.dateDue),
        JSON.stringify(prononce.formulaire));
      verifier('la zone des références donne le focus à sa saisie, et une référence posée ne se dédouble pas',
        prononce.focusRef === true && prononce.refs
        && prononce.refs.une === 1 && prononce.refs.apresDoublon === 1
        && prononce.refs.valeur.length > 3,
        JSON.stringify({ focus: prononce.focusRef, refs: prononce.refs }));
      verifier('le délai changé recalcule la date d’échéance, et une preuve versée paraît avec son chemin',
        /^\d{4}-\d{2}-\d{2}$/.test(prononce.dateRecalculee || '')
        && prononce.dateRecalculee !== (prononce.formulaire || {}).dateDue
        && prononce.entreePreuve === true && (prononce.preuve || []).length === 1
        && /uploads\//.test(prononce.preuve[0].chemin)
        && /preuve-du-prononce\.pdf/.test(prononce.preuve[0].nom || ''),
        JSON.stringify({ date: prononce.dateRecalculee, preuve: prononce.preuve }));
      verifier('la fiche de constat s’imprime depuis le formulaire, et compose un document',
        (prononce.fiche || []).some((n) => n > 2000),
        JSON.stringify(prononce.fiche));
      verifier('« Soumettre » enregistre et resoumet d’un geste, et le serveur porte les trois corrections',
        prononce.corrigee && prononce.corrigee.statut === 'direct_soumis'
        && (prononce.corrigee.refs || '').length > 3
        && prononce.corrigee.delai === '45'
        && prononce.corrigee.date === prononce.dateRecalculee
        && prononce.corrigee.preuves === 1,
        JSON.stringify(prononce.corrigee));
      verifier('le tour suivant relit le précédent : l’historique de la décision, et la version figée qui s’ouvre',
        prononce.rouvert2 === true && prononce.historique
        && prononce.historique.bandeau === 1 && prononce.historique.decisions === 1
        && prononce.historique.versionsCloses === 1
        && /Version 1/.test(prononce.versionRelue || '')
        && /exigence manquée/.test(prononce.versionRelue || '')
        && prononce.historique.replie === true,
        JSON.stringify({ historique: prononce.historique, relue: (prononce.versionRelue || '').slice(0, 110) }));
      verifier('la fenêtre du rejet se refuse sans rien changer, puis prononcée elle arrête la constatation',
        prononce.modaleRejet === true && prononce.rejetRenonce
        && prononce.rejetRenonce.fenetre === false
        && prononce.rejetRenonce.statut === 'direct_soumis'
        && prononce.rejet && prononce.rejet.statut === 'direct_rejete'
        && JSON.stringify(prononce.rejet.journal) === JSON.stringify(['renvoi', 'rejet'])
        && (prononce.rejet.versions || []).join(' ') === '1/renvoi 2/rejet',
        JSON.stringify({ renonce: prononce.rejetRenonce, rejet: prononce.rejet }));
      verifier('une constatation validée s’ouvre sur sa remise, dont le courriel est composé d’avance',
        prononce.validee === 200 && prononce.ouvertB === true && prononce.remise
        && prononce.remise.etape === 'transmission' && prononce.remise.courriel === true
        && /@/.test(prononce.remise.destinataire)
        && prononce.remise.objetPorteLaReference === true
        && prononce.remise.relais === 1 && prononce.remise.envoyer === 1,
        JSON.stringify(prononce.remise));
      verifier('le geste d’annexe délègue au sélecteur caché, et le fichier choisi devient pièce du courriel',
        prononce.remise && prononce.remise.entree === true
        && (prononce.remise.pieces || []).length === 1
        && /annexe-de-la-remise\.pdf/.test(prononce.remise.pieces[0] || ''),
        JSON.stringify({ entree: (prononce.remise || {}).entree, pieces: (prononce.remise || {}).pieces }));
      verifier('le sous-onglet « Terrain » retient la constatation vérifiée sur place, et déplie son détail',
        prononce.terrain && prononce.terrain.lignes >= 1
        && prononce.terrain.avant === true && prononce.terrain.apres === false
        && prononce.terrain.detail > 100,
        JSON.stringify(prononce.terrain));
      verifier('les deux constatations du prononcé ne survivent pas à la ronde',
        prononce.menage === 0, JSON.stringify({ reste: prononce.menage }));

      // ══════════════════════════════════════════════════════════════════
      //  Le processus : sa configuration, qui commande tout le reste
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Ce que la mesure a appris avant qu'une ligne soit écrite ──
      //
      // Le relevé disait `exec-notifications.js` : **1 geste exercé sur 25**. Le
      // circuit d'une notification — soumettre, valider, envoyer, accorder —
      // était donc presque entièrement non couvert, et la ronde du dossier le
      // parcourt par l'API faute de mieux.
      //
      // J'ai cru d'abord que ces gestes étaient échoués sur la page
      // `declenchement`, l'une des quatre qu'aucun chemin n'ouvre (n° 5.f.2).
      // *Depuis le 7 novembre 2026, cette page est au menu (n° 5.f.72) ; ce qui
      // suit décrit l'état où elle ne l'était pas.*
      // **Mesuré, c'est faux** : forcée dans le navigateur, cette page ne rend
      // que deux gestes, et `execStartNotification` est aussi appelé depuis la
      // page **`processus`**, qui est au menu. Le circuit est donc atteignable.
      //
      // Mais il est atteignable **derrière une porte** : la page `processus` ne
      // liste pas des activités, elle liste des **processus configurés**, et le
      // jeu d'essai n'en porte aucun — « Aucune donnée », quel que soit le
      // filtre. Pour déclencher une activité, il faut d'abord qu'un processus
      // existe.
      //
      // Cette ronde ouvre donc cette porte. Le circuit de la notification la
      // suivra, et il sait maintenant par où passer.
      //
      // *Un gisement qu'on croit inaccessible l'est parfois seulement derrière
      // une étape qu'on n'avait pas cherchée.*
      etape = 'configuration du processus';
      const processus = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const lire = async () => {
          try { return await (await fetch(`${api}/processus`, { credentials: 'same-origin' })).json(); }
          catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e || e.options.length < 2) return '';
          e.selectedIndex = 1;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        // ── SURV a **deux** fenêtres de confirmation, et une ronde doit les
        //    connaître toutes deux ──
        //
        // Celle du socle (`oasisConfirmer`) pose un bouton `.oasis-confirm-oui` ;
        // celle du module (`execProcConfirmer`) pose un
        // `[data-rep="oui"]` dans un `.exec-proc-dialogue`. Les suppressions de
        // processus passent par la seconde, et le premier jet de cette ronde ne
        // cherchait que la première : les deux processus posés **restaient**,
        // « fin: 2 » au lieu de 0.
        //
        // *Un geste qui demande confirmation ne dit pas laquelle : il faut
        // l'avoir lu, ou les essayer toutes.*
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui')
            || document.querySelector('.exec-proc-dialogue [data-rep="oui"]')
            || document.querySelector('[data-rep="oui"]');
          if (!oui) return false;
          oui.click();
          await attendre(3200);
          return true;
        };

        document.querySelector('.nav-btn[data-page="processus"]')?.click();
        await attendre(3200);
        const z = () => document.getElementById('exec-content');
        r.listeVide = z().textContent.includes('Aucune donnée');
        const avant = await lire();
        r.avant = (avant || []).length;
        const avantIds = new Set((avant || []).map((x) => x.id));

        // Le formulaire de configuration.
        document.querySelector('[onclick^="execProcCfgEditer"]')?.click();
        await attendre(3500);
        r.formulaire = (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        poser('pcfg_libelle', 'SURV 0.c — processus de la ronde');
        r.choix = { type: choisir('pcfg_type'), domaine: choisir('pcfg_domaine'), secteur: choisir('pcfg_secteur') };
        poser('pcfg_description', 'Posé par la ronde, retiré par elle.');
        await attendre(1200);

        // ── Un acteur ajouté, et les acteurs ne sont pas dans un tableau ──
        //
        // Premier jet : les lignes d'un `tbody` — **0 avant, 0 après**. Second
        // jet : les enfants de `.pcfg-acteurs` — **9 avant, 9 après**, car il y
        // a un bloc par étape du circuit et chacun porte soit ses acteurs, soit
        // un « aucun acteur » qu'une ligne ajoutée **remplace**.
        //
        // Ce qui change, ce sont les **lignes d'acteur**, et elles se
        // reconnaissent à leurs listes de choix. Troisième lecture du même
        // geste, et la troisième est celle que le code décrit : un bloc par
        // étape, dont le contenu bascule entre le vide et les lignes.
        const acteurs = () => document.querySelectorAll('#execSlider .pcfg-acteurs select').length;
        const blocsVides = () => document.querySelectorAll('#execSlider .pcfg-vide').length;
        const acteursAvant = acteurs();
        const videsAvant = blocsVides();
        document.querySelector('[onclick^="execProcCfgAjouterActeur"]')?.click();
        await attendre(1800);
        r.acteurs = [acteursAvant, acteurs()];
        r.blocsVides = videsAvant > blocsVides();
        // Les listes de la ligne d'acteur sont renseignées, sinon l'enregistrement
        // peut refuser une ligne vide.
        [...document.querySelectorAll('#execSlider .pcfg-acteurs select')].forEach((sel) => {
          if (sel.options.length > 1) {
            sel.selectedIndex = 1;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await attendre(1200);

        document.querySelector('[onclick^="execProcCfgEnregistrer"]')?.click();
        await attendre(4000);
        const apres = await lire();
        r.apres = (apres || []).length;
        const mien = (apres || []).find((x) => !avantIds.has(x.id));
        r.cree = mien ? { id: mien.id, libelle: mien.libelle || '', type: mien.type || '' } : null;
        r.listeApres = !z().textContent.includes('Aucune donnée');
        if (!mien) return r;

        // Dupliqué, puis les deux retirés : la ronde ne laisse rien.
        const dupliquer = [...document.querySelectorAll('[onclick^="execProcCfgDupliquer"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(mien.id));
        r.boutonDupliquer = !!dupliquer;
        if (dupliquer) {
          dupliquer.click();
          await attendre(2400);
          const valider = document.querySelector('[onclick^="execProcCfgDupliquerValider"]');
          r.boutonDupliquerValider = !!valider;
          if (valider) { valider.click(); await attendre(3500); }
          r.apresDuplication = ((await lire()) || []).length;
        }
        // Tous ceux que la ronde a créés partent, le copié comme l'original.
        const aEffacer = ((await lire()) || []).filter((x) => !avantIds.has(x.id)).map((x) => x.id);
        r.aEffacer = aEffacer.length;
        for (const id of aEffacer) {
          const b = [...document.querySelectorAll('[onclick^="execProcCfgSupprimer"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(id));
          if (b) { b.click(); /* eslint-disable no-await-in-loop */ await confirmer(); }
        }
        r.fin = ((await lire()) || []).filter((x) => !avantIds.has(x.id)).length;
        return r;
      }, M);

      verifier('la page du processus part d’une liste vide, et sa configuration s’ouvre garnie',
        processus.listeVide === true && processus.formulaire > 3000
        && !!processus.choix && !!processus.choix.domaine,
        JSON.stringify({ vide: processus.listeVide, formulaire: processus.formulaire,
          choix: processus.choix }));
      verifier('un acteur s’ajoute à l’étape du circuit, dont le bloc cesse d’être vide',
        !!processus.acteurs && processus.acteurs[1] > processus.acteurs[0]
        && processus.blocsVides === true,
        JSON.stringify({ acteurs: processus.acteurs, unBlocDeMoinsVide: processus.blocsVides }));
      verifier('le processus configuré est porté par le serveur, et la liste cesse d’être vide',
        processus.apres === processus.avant + 1 && !!processus.cree
        && /processus de la ronde/.test(processus.cree.libelle)
        && processus.listeApres === true,
        JSON.stringify({ avant: processus.avant, apres: processus.apres,
          cree: processus.cree, listeApres: processus.listeApres }));
      verifier('il se duplique, et la ronde retire tout ce qu’elle a posé',
        processus.boutonDupliquer === true && processus.apresDuplication > processus.apres
        && processus.aEffacer >= 2 && processus.fin === 0,
        JSON.stringify({ duplique: processus.apresDuplication, aEffacer: processus.aEffacer,
          fin: processus.fin }));

      // ══════════════════════════════════════════════════════════════════
      //  Le circuit guidé d'une activité, et la notification par ses gestes
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Comment on y entre, après trois fausses pistes ──
      //
      // Le circuit guidé (`EXEC_PROC`) porte les gestes de la notification —
      // déclencher, soumettre, valider, transmettre. Trois lectures ont été
      // nécessaires pour trouver sa porte :
      //
      //   · la page `declenchement` les rend, mais **aucun chemin ne l'ouvrait**
      //     alors — elle est au menu depuis le 7 novembre 2026 (n° 5.f.72) ;
      //   · la page `processus` ne liste que les **processus configurés**, avec
      //     leurs gestes d'édition — pas de déclenchement ;
      //   · la porte est sur la page des **plans** : « Déclencher hors plan »,
      //     `execProcNouvelleActivite()`, qui ouvre un formulaire d'activité.
      //
      // *Un circuit ne se trouve pas là où il s'affiche, mais là où il
      // commence.*
      //
      // La ronde crée donc une activité hors plan, et parcourt le circuit par
      // ses gestes — là où la ronde du dossier, plus haut, le fait par l'API
      // faute d'avoir su par où passer.

      // ══════════════════════════════════════════════════════════════════
      //  Les états des activités : arrêter, reprendre, archiver, supprimer
      // ══════════════════════════════════════════════════════════════════
      //
      // Le dernier gros gisement de SURV, et le seul qui **écrit sur l'état du
      // circuit** plutôt que sur son contenu. Dix gestes d'action, et chacun
      // exige une activité dans un état que la ronde ne construisait pas.
      //
      // La ronde s'en construit donc un : le plan porte **deux** activités, la
      // chaîne n'en déclenche qu'une. La seconde sert ici — déclenchée par
      // l'API jusqu'à « envoyé », sans dossier, elle paraît dans « en cours »
      // et dans « en vie », là où vivent les boutons.
      //
      // Chaque geste est rendu à son état par son inverse, et le dernier —
      // la suppression définitive — emporte ce que ce bloc a créé. Rien ne
      // reste pour les blocs qui suivent.
      etape = 'états des activités';
      const etats = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const essai = async (nom, f) => {
          try { r[nom] = await f(); }
          catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
        };
        const env = async (url, methode, corps) => {
          const rep = await fetch(url, {
            method: methode, credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(corps ? { body: JSON.stringify(corps) } : {}),
          });
          let b = null; try { b = await rep.json(); } catch { /* corps vide */ }
          return { statut: rep.status, corps: b };
        };
        // La boîte du module, avec ou sans saisie (n° 5.f.25).
        const repondre = async (valeur) => {
          await attendre(800);
          const boite = document.querySelector('.exec-proc-dialogue');
          if (!boite) return false;
          if (valeur !== undefined && valeur !== null) {
            const champ = boite.querySelector('.exec-proc-dialogue-saisie');
            if (champ) { champ.value = valeur; champ.dispatchEvent(new Event('input', { bubbles: true })); }
          }
          boite.querySelector('[data-rep="oui"]').click();
          await attendre(3200);
          return true;
        };
        const sousOnglet = (cle) => [...document.querySelectorAll('[onclick*="EXEC_ETATS.sub="]')]
          .find((b) => new RegExp(`sub='${cle}'`).test(b.getAttribute('onclick') || ''));
        const aller = async (cle) => { sousOnglet(cle)?.click(); await attendre(2200); };

        document.querySelector('.nav-btn[data-page="etats"]')?.click();
        await attendre(3200);

        // ── 1. Les cinq sous-onglets rendent chacun leur contenu ──
        await essai('onglets', async () => {
          const o = { cles: [], rendus: [] };
          for (const cle of ['a_declencher', 'en_vie', 'en_cours', 'cloturees', 'archivees']) {
            const b = sousOnglet(cle);
            o.cles.push(!!b);
            /* eslint-disable no-await-in-loop */
            await aller(cle);
            const page = document.querySelector('.page-content.exec-etats');
            o.rendus.push({
              cle,
              actif: !!(sousOnglet(cle) || {}).classList?.contains('active'),
              contenu: page ? page.innerHTML.length : 0,
            });
          }
          return o;
        });

        // ── 2. Une seconde activité déclenchée, et le rappel ──
        await essai('rappel', async () => {
          const d = {};
          const plans = await (await fetch(`${ctx.api}/plans-valides`,
            { credentials: 'same-origin' })).json();
          // ── Ce que la route exclut, et ma garde qui l'ignorait ──
          //
          // Premier jet : je cherchais un plan portant **deux** activités, parce
          // que le plan du bac en porte deux. Dix contrôles ont rougi sur
          // `planADeuxActivites: false`.
          //
          // `GET /plans-valides` **écarte les activités déjà déclenchées** : la
          // chaîne en a consommé une au montage, il n'en reste donc qu'une. La
          // « seconde activité » du plan est la **première** que cette route
          // rende encore. Le relevé des plans reste, il tranche en une ligne.
          d.plans = (plans || []).map((p) => `${(p.reference || p.titre || '?').slice(0, 24)}:${(p.activites || []).length}`);
          const plan = (plans || []).find((p) => (p.activites || []).length >= 1);
          d.planADeuxActivites = !!plan;
          if (!plan) return d;
          const a = plan.activites[0];
          d.planId = plan.id;
          const n = await env(`${ctx.api}/notifications`, 'POST', {
            activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
            objet: 'SURV 0.e — activité des états', type_supervision: 'Audit',
            date_debut_prevue: '2026-11-02', date_fin_prevue: '2026-11-04',
            lieu: 'Siège', perimetre: 'Ensemble des processus',
          });
          d.creee = n.statut;
          if (n.statut !== 201) return d;
          d.notifId = n.corps.id;
          d.reference = n.corps.reference || '';
          d.activiteId = a.id;
          for (const pas of ['submit', 'validate', 'send']) {
            /* eslint-disable no-await-in-loop */
            d[pas] = (await env(`${ctx.api}/notifications/${d.notifId}/${pas}`, 'PUT')).statut;
          }
          await window.execRefreshDynamic();
          await aller('en_cours');

          const bouton = [...document.querySelectorAll('[onclick^="execEtatsRappel"]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(plan.id));
          d.boutonRappel = !!bouton;
          if (!bouton) return d;
          bouton.click();
          await attendre(3000);
          const dest = document.getElementById('rappel_dest');
          d.volet = !!dest;
          if (!dest) return d;
          d.destinataires = dest.options.length;
          d.note = (document.querySelector('.exec-proc-note') || {}).textContent?.trim().slice(0, 80) || '';
          // ── Le refus : sans destinataire, rien ne part ──
          const avant = ((await (await fetch(`${ctx.api}/rappels`,
            { credentials: 'same-origin' })).json()) || []).length;
          const choisi = dest.value;
          dest.value = '';
          document.querySelector('[onclick^="execEtatsEnvoyerRappel"]').click();
          await attendre(1400);
          d.refus = (document.getElementById('rappel_erreur') || {}).textContent || '';
          d.rappelsApresRefus = ((await (await fetch(`${ctx.api}/rappels`,
            { credentials: 'same-origin' })).json()) || []).length;
          d.rienNEstParti = d.rappelsApresRefus === avant;
          // Puis le destinataire rendu, et l'envoi.
          dest.value = choisi;
          const msg = document.getElementById('rappel_msg');
          if (msg) msg.value = 'SURV 0.e — rappel de la ronde.';
          document.querySelector('[onclick^="execEtatsEnvoyerRappel"]').click();
          await attendre(3500);
          const apres = (await (await fetch(`${ctx.api}/rappels`,
            { credentials: 'same-origin' })).json()) || [];
          d.rappelsApres = apres.length;
          d.enBase = apres.some((x) => /rappel de la ronde/.test(x.message || ''));
          d.voletReferme = !document.getElementById('rappel_dest');
          return d;
        });

        const notifId = (r.rappel || {}).notifId;
        const reference = (r.rappel || {}).reference;
        const activiteId = (r.rappel || {}).activiteId;
        const planId = (r.rappel || {}).planId;

        // ── 3. Arrêter, reprendre, archiver, désarchiver l'activité ──
        await essai('circuit', async () => {
          const d = {};
          if (!notifId) return { erreur: 'pas de notification' };
          await aller('en_vie');
          const ligne = () => [...document.querySelectorAll('.exec-act-row')]
            .find((tr) => (tr.innerHTML || '').includes(notifId));
          const geste = (prefixe) => {
            const l = ligne();
            return l ? l.querySelector(`[onclick^="${prefixe}"]`) : null;
          };
          d.ligneTrouvee = !!ligne();
          if (!ligne()) return d;
          // Les boutons s'excluent : tant que le circuit court, il n'y a que
          // « Arrêter » ; arrêté, « Reprendre » et « Archiver » paraissent.
          d.avant = {
            arreter: !!geste('execEtatsArreter'),
            reprendre: !!geste('execEtatsReprendre'),
            archiver: !!geste('execEtatsArchiverActivite'),
            supprimer: !!geste('execEtatsSupprimer'),
            historique: !!geste('execProcHistorique'),
          };
          // ── L'historique : il ne raconte que ce que la ronde a posé ──
          //
          // Trois jalons au moins — créée, soumise, validée — puisque la ronde
          // a franchi ces trois pas par l'API. Un historique qui en rendrait
          // moins ne lirait pas la notification qu'on lui désigne.
          geste('execProcHistorique').click();
          await attendre(3000);
          d.histoEtapes = document.querySelectorAll('.exec-histo-etape').length;
          d.histoJalons = document.querySelectorAll('.exec-histo-jalon').length;
          d.histoCourante = document.querySelectorAll('.exec-histo-etape.courante').length;
          d.histoFaites = document.querySelectorAll('.exec-histo-etape.faite').length;
          document.querySelector('#execSlider [onclick^="execCloseSlider"]')?.click();
          await attendre(1600);
          await aller('en_vie');

          geste('execEtatsArreter').click();
          d.boiteMotif = await repondre('SURV 0.e — arrêt par la ronde.');
          const apresArret = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          // Le serveur écrit **`arret`** (routes-etats.js), non `arretee`. Mon
          // premier jet acceptait l'un **ou** le motif, et passait par le second
          // terme : une assertion à deux branches dont une suffit ne mesure que
          // la plus facile. Les deux sont exigées, et nommées juste.
          d.arreteEnBase = Number(apresArret.arret) === 1;
          d.motifEnBase = apresArret.motif_arret || '';
          await aller('en_vie');
          d.apresArret = {
            arreter: !!geste('execEtatsArreter'),
            reprendre: !!geste('execEtatsReprendre'),
            archiver: !!geste('execEtatsArchiverActivite'),
            marquee: !!(ligne() || {}).classList?.contains('exec-etats-arretee'),
          };
          // Reprendre, et le circuit repart.
          geste('execEtatsReprendre').click();
          await repondre();
          const apresReprise = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.repriseEnBase = Number(apresReprise.arret) === 0;
          await aller('en_vie');
          d.apresReprise = { arreter: !!geste('execEtatsArreter'),
            reprendre: !!geste('execEtatsReprendre') };

          // Arrêtée de nouveau, puis archivée.
          geste('execEtatsArreter').click();
          await repondre('SURV 0.e — arrêt avant archivage.');
          await aller('en_vie');
          geste('execEtatsArchiverActivite').click();
          await repondre();
          const apresArchive = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.archiveeEnBase = Number(apresArchive.archive) === 1;
          await aller('en_vie');
          d.partieDesEnVie = !ligne();
          await aller('archivees');
          // ── Deux repères, parce que les deux tables ne nomment pas la même chose ──
          //
          // Premier jet : le même repère partout — une ligne qui contient
          // l'identifiant de la notification. Il tient dans « en vie », dont les
          // boutons portent `execEtatsArreter('<notifId>')`. Dans les archives,
          // **aucun bouton ne porte la notification** : l'historique et le
          // désarchivage portent l'identifiant de l'**activité**. Trois contrôles
          // ont rougi en cascade sur ce seul écart.
          const ligneArchivee = () => [...document.querySelectorAll('.exec-act-row')]
            .find((tr) => (tr.innerHTML || '').includes(activiteId));
          d.dansLesArchives = !!ligneArchivee();
          // Le lot d'archives se replie d'un clic sur son titre.
          const titre = document.querySelector('.exec-etats-groupe-titre');
          d.groupeTrouve = !!titre;
          if (titre) {
            const groupe = titre.closest('.exec-etats-groupe');
            d.groupeOuvertAvant = groupe.classList.contains('ouvert');
            titre.click();
            await attendre(700);
            d.groupeApresClic = groupe.classList.contains('ouvert');
            titre.click();
            await attendre(700);
            d.groupeRendu = groupe.classList.contains('ouvert') === d.groupeOuvertAvant;
          }
          // Et elle sort des archives par son geste.
          const sortir = (ligneArchivee() || {}).querySelector?.('[onclick^="execEtatsDesarchiverActivite"]');
          d.boutonSortir = !!sortir;
          if (sortir) { sortir.click(); await repondre(); }
          const apresSortie = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.sortieEnBase = !Number(apresSortie.archive);
          return d;
        });

        // ── 4. Le dossier clôturé s'archive, et revient ──
        await essai('dossier', async () => {
          const d = {};
          await aller('cloturees');
          const bouton = [...document.querySelectorAll('[onclick^="execEtatsArchiver("]')][0];
          d.bouton = !!bouton;
          if (!bouton) return d;
          const idDossier = (/execEtatsArchiver\('([^']+)'/.exec(bouton.getAttribute('onclick')) || [])[1];
          d.dossierId = idDossier;
          bouton.click();
          await repondre();
          const apres = await (await fetch(`${ctx.api}/dossiers/${idDossier}`,
            { credentials: 'same-origin' })).json();
          d.archiveEnBase = Number(apres.archive) === 1 || apres.statut === 'archive';
          await aller('archivees');
          const retour = [...document.querySelectorAll('[onclick^="execEtatsArchiver("]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(idDossier));
          d.boutonRetour = !!retour;
          if (retour) { retour.click(); await repondre(); }
          const rendu = await (await fetch(`${ctx.api}/dossiers/${idDossier}`,
            { credentials: 'same-origin' })).json();
          d.renduEnBase = !Number(rendu.archive) && rendu.statut !== 'archive';
          return d;
        });

        // ── 5. Le plan archivé, et sa sortie par le geste de l'écran ──
        //
        // `plansArchivesPlanif` est vide dans le bac, et c'est **par
        // construction** : les quatre plans archivés du jeu sont des versions
        // remplacées, que la règle écarte — « on range aux archives un plan
        // arrivé à son terme, et confondre les deux sorts faisait passer chaque
        // amendement pour une fin de plan ». La ronde archive donc le plan
        // elle-même, par la route de la Planification, et le geste de l'écran
        // le lui rend.
        await essai('plan', async () => {
          const d = {};
          if (!planId) return { erreur: 'pas de plan' };
          d.archive = (await env(`/api/m/planification/plans/${planId}/archiver`, 'POST', {})).statut;
          await window.execLoadData();
          await aller('archivees');
          const bouton = [...document.querySelectorAll('[onclick*="execEtatsDesarchiverPlan"]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(planId));
          d.boutonDesarchiver = !!bouton;
          d.groupes = document.querySelectorAll('.exec-etats-groupe').length;
          if (!bouton) return d;
          bouton.click();
          await repondre();
          const plan = await (await fetch(`/api/m/planification/plans/${planId}`,
            { credentials: 'same-origin' })).json();
          d.statutRendu = plan.statut;
          return d;
        });

        // ── 6. La suppression définitive, et sa double garde ──
        await essai('suppression', async () => {
          const d = {};
          if (!notifId) return { erreur: 'pas de notification' };
          await aller('en_vie');
          const ligne = () => [...document.querySelectorAll('.exec-act-row')]
            .find((tr) => (tr.innerHTML || '').includes(notifId));
          const bouton = () => (ligne() || {}).querySelector?.('[onclick^="execEtatsSupprimer"]');
          d.ligne = !!ligne();
          d.bouton = !!bouton();
          if (!bouton()) return d;
          d.reference = reference;
          // Première garde : une référence qui ne correspond pas refuse.
          bouton().click();
          await repondre('référence inventée');
          const encore = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.surviteAuMauvaisCode = !!encore && encore.id === notifId;
          // Seconde : la bonne référence emporte tout.
          await aller('en_vie');
          bouton().click();
          await repondre(reference);
          const rep = await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' });
          d.statutApres = rep.status;
          const notifs = await (await fetch(`${ctx.api}/notifications`,
            { credentials: 'same-origin' })).json();
          d.encoreListee = (notifs || []).some((x) => x.id === notifId);
          return d;
        });
        return r;
      }, { api: M });

      {
        const O = etats.onglets || {};
        const R2 = etats.rappel || {};
        const C = etats.circuit || {};
        const D2 = etats.dossier || {};
        const P2 = etats.plan || {};
        const S2 = etats.suppression || {};
        verifier('les cinq sous-onglets des états existent, s’activent, et rendent chacun leur contenu',
          Array.isArray(O.cles) && O.cles.length === 5 && O.cles.every(Boolean)
          && (O.rendus || []).length === 5
          && (O.rendus || []).every((x) => x.actif === true && x.contenu > 400),
          JSON.stringify(O).slice(0, 320));
        verifier('l’activité que le plan n’a pas encore déclenchée se déclenche, et son rappel s’ouvre sur un destinataire désigné',
          R2.planADeuxActivites === true && R2.creee === 201
          && R2.submit === 200 && R2.validate === 200 && R2.send === 200
          && R2.boutonRappel === true && R2.volet === true && R2.destinataires >= 1
          && (R2.note || '').length > 0,
          JSON.stringify(R2).slice(0, 420));
        verifier('sans destinataire le rappel refuse et rien ne part ; le destinataire rendu, le serveur le porte',
          (R2.refus || '').length > 0 && R2.rienNEstParti === true
          && R2.enBase === true && R2.voletReferme === true,
          JSON.stringify({ refus: R2.refus, rien: R2.rienNEstParti,
            avant: R2.rappelsApresRefus, apres: R2.rappelsApres, enBase: R2.enBase }));
        verifier('les boutons de la ligne s’excluent : le circuit qui court n’offre qu’« Arrêter »',
          !!C.avant && C.avant.arreter === true && C.avant.reprendre === false
          && C.avant.archiver === false && C.avant.supprimer === true
          && C.avant.historique === true,
          JSON.stringify({ avant: C.avant, erreur: C.erreur }));
        verifier('l’historique de l’activité rend ses étapes, et ses jalons sont ceux que la ronde a posés',
          C.histoEtapes >= 4 && C.histoJalons >= 3 && C.histoCourante === 1
          && C.histoFaites >= 1,
          JSON.stringify({ etapes: C.histoEtapes, jalons: C.histoJalons,
            courante: C.histoCourante, faites: C.histoFaites }));
        verifier('le processus s’arrête sur un motif que le serveur garde, et la ligne offre alors « Reprendre » et « Archiver »',
          C.boiteMotif === true && C.arreteEnBase === true
          && /arrêt par la ronde/.test(C.motifEnBase || '')
          && !!C.apresArret && C.apresArret.arreter === false
          && C.apresArret.reprendre === true && C.apresArret.archiver === true
          && C.apresArret.marquee === true,
          JSON.stringify({ motif: C.motifEnBase, apres: C.apresArret, erreur: C.erreur }));
        verifier('il se reprend, et la ligne redevient ce qu’elle était',
          C.repriseEnBase === true && !!C.apresReprise
          && C.apresReprise.arreter === true && C.apresReprise.reprendre === false,
          JSON.stringify({ reprise: C.repriseEnBase, apres: C.apresReprise }));
        verifier('arrêtée puis archivée, l’activité quitte « en vie » pour les archives, et y revient par son geste',
          C.archiveeEnBase === true && C.partieDesEnVie === true
          && C.dansLesArchives === true && C.boutonSortir === true
          && C.sortieEnBase === true,
          JSON.stringify({ archivee: C.archiveeEnBase, partie: C.partieDesEnVie,
            archives: C.dansLesArchives, sortie: C.sortieEnBase }));
        verifier('un lot d’archives se replie d’un clic sur son titre, et se redéplie',
          C.groupeTrouve === true && C.groupeApresClic !== C.groupeOuvertAvant
          && C.groupeRendu === true,
          JSON.stringify({ avant: C.groupeOuvertAvant, apres: C.groupeApresClic,
            rendu: C.groupeRendu }));
        verifier('un dossier clôturé s’archive, le serveur le porte, et il revient par son geste',
          D2.bouton === true && D2.archiveEnBase === true
          && D2.boutonRetour === true && D2.renduEnBase === true,
          JSON.stringify(D2));
        verifier('un plan archivé forme son lot, et le geste de l’écran le rend aux plans validés',
          P2.archive === 200 && P2.boutonDesarchiver === true && P2.groupes >= 1
          && P2.statutRendu === 'valide',
          JSON.stringify(P2));
        verifier('la suppression définitive refuse une référence qui ne correspond pas, et n’emporte rien',
          S2.bouton === true && S2.surviteAuMauvaisCode === true,
          JSON.stringify({ bouton: S2.bouton, reference: S2.reference,
            survit: S2.surviteAuMauvaisCode, erreur: S2.erreur }));
        verifier('la bonne référence l’emporte : le serveur ne connaît plus l’activité',
          (S2.statutApres === 404 || S2.statutApres === 400)
          && S2.encoreListee === false,
          JSON.stringify({ statut: S2.statutApres, listee: S2.encoreListee }));
      }

      etape = 'circuit guidé';
      const circuit = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const notifs = async () => {
          try { return await (await fetch(`${api}/notifications`, { credentials: 'same-origin' })).json(); }
          catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e) return '';
          // La première option réelle : l'option vide est un intitulé, non un choix.
          const i = [...e.options].findIndex((o) => o.value);
          if (i < 0) return '';
          e.selectedIndex = i;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        // Les deux fenêtres de confirmation de SURV — celle du socle et celle du
        // module (n° 5.f.25).
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui')
            || document.querySelector('.exec-proc-dialogue [data-rep="oui"]')
            || document.querySelector('[data-rep="oui"]');
          if (!oui) return false;
          oui.click();
          await attendre(3500);
          return true;
        };

        const avant = await notifs();
        const avantIds = new Set((avant || []).map((n) => n.id));
        r.avant = avantIds.size;

        document.querySelector('.nav-btn[data-page="plan_surveillance"]')?.click();
        await attendre(3200);
        const porte = document.querySelector('[onclick^="execProcNouvelleActivite"]');
        r.porte = !!porte;
        if (!porte) return r;
        porte.click();
        await attendre(3500);
        r.formulaire = (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;

        // ── Les listes en cascade : le domaine commande le secteur, qui
        //    commande l'organisme ──
        //
        // Mesuré avant d'écrire : à l'ouverture, `hp_secteur` et
        // `hp_prestataire` ne portent **qu'une** option — leur intitulé. Elles
        // se remplissent quand le domaine est choisi. Un contrôle qui les aurait
        // renseignées d'emblée aurait choisi dans le vide.
        poser('hp_annee', String(new Date().getFullYear()));
        // ── La cascade dépend des **données**, et la ronde doit la chercher ──
        //
        // Premier jet : le premier domaine, puis le premier secteur, puis le
        // premier organisme. Le secteur retenu n'en portait **aucun** —
        // `prestataire: ""` —, et la création s'arrêtait sans un mot : le geste
        // valide côté client, et ne part pas.
        //
        // On parcourt donc les couples (domaine, secteur) jusqu'à en trouver un
        // que le jeu d'essai peuple. *Un formulaire en cascade ne se remplit pas
        // par le premier choix de chaque liste : il se remplit par le chemin que
        // les données autorisent.*
        const options = (id) => [...(document.getElementById(id) || { options: [] }).options]
          .filter((o) => o.value).map((o) => o.value);
        const poserListe = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        r.cascade = { essais: 0 };
        for (const dom of options('hp_domaine')) {
          poserListe('hp_domaine', dom);
          /* eslint-disable no-await-in-loop */
          await attendre(1600);
          for (const sec of options('hp_secteur')) {
            poserListe('hp_secteur', sec);
            await attendre(1400);
            r.cascade.essais += 1;
            const prest = options('hp_prestataire');
            if (prest.length) {
              poserListe('hp_prestataire', prest[0]);
              await attendre(1200);
              r.cascade.domaine = dom;
              r.cascade.secteur = sec;
              r.cascade.prestataire = prest[0];
              break;
            }
          }
          if (r.cascade.prestataire) break;
        }
        r.cascade.type = choisir('hp_type');
        r.cascade.mode = choisir('hp_mode');
        r.cascade.responsable = choisir('hp_responsable');
        r.cascade.type = choisir('hp_type');
        r.cascade.mode = choisir('hp_mode');
        r.cascade.responsable = choisir('hp_responsable');
        poser('hp_debut', '2026-11-02');
        poser('hp_fin', '2026-11-04');
        poser('hp_nb_inspecteurs', '2');
        poser('hp_lieu', 'Siège de l’organisme');
        poser('hp_objet', 'SURV 0.c — activité hors plan de la ronde');
        await attendre(1200);

        document.querySelector('[onclick^="execProcCreerHorsPlan"]')?.click();
        await attendre(1000);
        r.creationConfirmee = await confirmer();
        await attendre(2000);
        const apres = await notifs();
        r.apres = (apres || []).length;
        const mienne = (apres || []).find((n) => !avantIds.has(n.id));
        r.creee = mienne ? { id: mienne.id, statut: mienne.statut, objet: mienne.objet || '' } : null;
        if (!mienne) return r;

        // ── Le circuit, par ses gestes ──
        // `EXEC_PROC` n'est pas encore peuplé à cet instant — il l'est quand le
        // circuit s'ouvre sur une étape. Le relevé le note sans en faire une
        // condition : ce qui compte est que les gestes du circuit répondent, et
        // ils sont relevés juste après.
        r.etat = window.EXEC_PROC
          ? { etape: window.EXEC_PROC.etape, notif: !!window.EXEC_PROC.notif } : null;
        r.gestesCircuit = [...new Set([...document.querySelectorAll('[onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))].filter((n) => /^execProc|^execStart|^execEdit/.test(n));

        const statut = async () => ((await notifs()).find((n) => n.id === mienne.id) || {}).statut;
        const agir = async (geste) => {
          const b = [...document.querySelectorAll('[onclick^="execProcAction"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(`'${geste}'`));
          if (!b) return false;
          b.click();
          await attendre(1000);
          await confirmer();
          await attendre(2500);
          return true;
        };
        r.soumise = await agir('submit');
        r.statutSoumise = await statut();
        r.validee = await agir('validate');
        r.statutValidee = await statut();
        r.transmise = await agir('send');
        r.statutTransmise = await statut();

        // ── Le ménage, et la propriété qu'il a révélée ──
        //
        // Une notification **envoyée ne s'efface pas** : la suppression rend
        // **409**, mesuré. C'est juste — elle est partie chez l'organisme, et un
        // acte transmis ne se retire pas d'un trait.
        //
        // Elle **s'annule** : `cancel` la ramène à `brouillon`, et c'est de là
        // qu'elle peut être retirée. Le ménage de cette ronde est donc lui-même
        // un contrôle de la règle — *ce qui ne s'efface pas doit pouvoir se
        // défaire, et la différence se mesure.*
        const refus = await fetch(`${api}/notifications/${mienne.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        r.suppressionEnvoyee = refus.status;
        const annulation = await fetch(`${api}/notifications/${mienne.id}/cancel`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          body: JSON.stringify({ motif: 'Annulation par la ronde.' }),
        });
        r.annulation = annulation.status;
        r.statutAnnulee = await statut();
        const suppr = await fetch(`${api}/notifications/${mienne.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        r.suppression = suppr.status;
        r.fin = (await notifs()).filter((n) => n.id === mienne.id).length;
        return r;
      }, M);

      verifier('la porte du circuit guidé est sur la page des plans, et son formulaire s’ouvre garni',
        circuit.porte === true && circuit.formulaire > 3000,
        JSON.stringify({ porte: circuit.porte, formulaire: circuit.formulaire }));
      verifier('les listes du formulaire se remplissent en cascade, et la ronde trouve un couple que les données peuplent',
        !!circuit.cascade && !!circuit.cascade.domaine
        && !!circuit.cascade.secteur && !!circuit.cascade.prestataire
        && circuit.cascade.essais > 0,
        JSON.stringify(circuit.cascade));
      verifier('l’activité hors plan crée sa notification en brouillon, et le serveur la porte',
        circuit.apres === circuit.avant + 1 && !!circuit.creee
        && circuit.creee.statut === 'brouillon'
        && /activité hors plan de la ronde/.test(circuit.creee.objet),
        JSON.stringify({ avant: circuit.avant, apres: circuit.apres, creee: circuit.creee,
          etat: circuit.etat }));
      verifier('la notification parcourt son circuit par ses gestes : soumise, validée, transmise',
        circuit.soumise === true && circuit.statutSoumise === 'soumis'
        && circuit.validee === true && circuit.statutValidee === 'valide'
        // Le dernier statut est **`envoye`**, et non « transmis » : je l'avais
        // supposé par analogie avec le rapport, qui dit « transmis ». Mesuré.
        && circuit.transmise === true && circuit.statutTransmise === 'envoye',
        JSON.stringify({ soumise: [circuit.soumise, circuit.statutSoumise],
          validee: [circuit.validee, circuit.statutValidee],
          transmise: [circuit.transmise, circuit.statutTransmise] }));
      verifier('une notification envoyée refuse d’être effacée, s’annule, et se retire alors',
        circuit.suppressionEnvoyee === 409
        && circuit.annulation === 200 && circuit.statutAnnulee === 'brouillon'
        && circuit.suppression === 200 && circuit.fin === 0,
        JSON.stringify({ refusEnvoyee: circuit.suppressionEnvoyee, annulation: circuit.annulation,
          apresAnnulation: circuit.statutAnnulee, suppression: circuit.suppression,
          reste: circuit.fin }));

      // ── Et la ronde ne laisse rien — en **un** geste, et c'est mesuré ──
      //
      // Le premier jet supprimait le dossier **puis** la notification, et le
      // second appel rendait 404. L'instrumentation des réponses, posée pour
      // nommer ce 404, a dit lequel : la suppression d'un dossier **emporte sa
      // notification et ses échanges** — « l'activité redevient à notifier »,
      // écrit dans la route elle-même.
      //
      // Le contrôle vérifie donc la cascade au lieu de la refaire. C'est un cas
      // de plus du même enseignement : *un nettoyage qu'on écrit sans mesurer
      // ajoute du bruit, et le bruit cache les vrais incidents.*
      // ── Et le ménage se fait désormais **par le geste de l'écran** ──
      //
      // Il se faisait par l'API : la page qui porte ce bouton n'était dans
      // aucune barre (n° 5.f.2), et il n'y avait pas d'autre moyen. Elle y est
      // depuis le 8 novembre 2026 (n° 5.f.73), et *un contrôle qui appelle la
      // route prouve que la route marche, non que le bouton l'atteint.*
      //
      // Le geste a reçu au même moment la garde qu'il n'avait pas. Il emporte le
      // dossier, **sa notification et tous ses échanges** — l'activité redevient
      // « à notifier » —, et il ne demandait qu'un oui/non, là où le même effet
      // offert par le menu « États » exige de **saisir la référence**. La ronde
      // éprouve donc les deux moitiés de cette garde : une référence qui ne
      // correspond pas n'emporte rien, et la bonne emporte tout.
      //
      // Deux détours que la mesure a imposés, et qui sont écrits plutôt que
      // supposés :
      //
      //   · le tableau **masque les dossiers clôturés** par défaut, et celui de
      //     la ronde l'est. Il faut poser le filtre de statut sur « clôturé »
      //     pour que la ligne paraisse — ce qui exerce le filtre au passage ;
      //   · si le geste laissait le dossier, le repli par l'API le retire tout
      //     de même, pour que les blocs suivants trouvent le magasin rendu. Le
      //     contrôle, lui, exige que ce soit **le geste** qui l'ait fait : le
      //     repli sauve la suite, il ne sauve pas le verdict.
      const menage = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const sortie = {};
        const liste = async () => await (await fetch(`${ctx.api}/dossiers`,
          { credentials: 'same-origin' })).json().catch(() => []);
        const existe = async () => ((await liste()) || []).some((d) => d.id === ctx.dossierId);

        // La boîte du module, avec sa saisie.
        const repondre = async (valeur) => {
          await attendre(900);
          const boite = document.querySelector('.exec-proc-dialogue');
          if (!boite) return false;
          const champ = boite.querySelector('.exec-proc-dialogue-saisie');
          if (champ) {
            champ.value = valeur;
            champ.dispatchEvent(new Event('input', { bubbles: true }));
          }
          sortie.boiteDemandeSaisie = !!champ;
          boite.querySelector('[data-rep="oui"]').click();
          await attendre(3000);
          return true;
        };

        if (typeof window.execRefreshDynamic === 'function') {
          await window.execRefreshDynamic();
          await attendre(1500);
        }
        // ── Les filtres sont pris en note **avant** d'y toucher ──
        //
        // Ce bloc pose le filtre de statut sur « clôturé » pour faire paraître
        // la ligne. `EXEC_STATE.filters` est partagé par tout l'écran : laissé
        // en place, il a fait rougir **deux contrôles du tableau de bord**, qui
        // court après celui-ci — la piste y était déjà restreinte, et un filtre
        // de plus ne la restreignait plus. *La leçon était déjà écrite dans
        // cette suite pour le jeu d'essai ; elle vaut aussi pour l'état du
        // client.*
        sortie.filtresAuDepart = JSON.stringify(window.EXEC_STATE.filters || {});
        document.querySelector('.nav-btn[data-page="execution"]')?.click();
        await attendre(2500);
        sortie.page = ((document.getElementById('exec-content') || {}).textContent || '').trim().length;

        // ── Le filtre de statut : sans lui, la ligne clôturée n'est pas là ──
        const lignes = () => [...document.querySelectorAll('#exec-content tbody tr')];
        sortie.lignesAvantFiltre = lignes()
          .filter((tr) => (tr.textContent || '').includes(ctx.reference)).length;
        const choix = [...document.querySelectorAll('#exec-content select')]
          .find((sel) => /filters\.statut/.test(sel.getAttribute('onchange') || ''));
        sortie.filtreStatut = !!choix;
        if (choix) {
          choix.value = 'cloture';
          choix.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2000);
        }
        sortie.lignesApresFiltre = lignes()
          .filter((tr) => (tr.textContent || '').includes(ctx.reference)).length;

        // ── La mauvaise référence n'emporte rien ──
        const bouton = () => lignes()
          .filter((tr) => (tr.textContent || '').includes(ctx.reference))
          .map((tr) => tr.querySelector('[onclick^="execDeleteDossier"]'))
          .find(Boolean);
        sortie.bouton = !!bouton();
        if (sortie.bouton) {
          bouton()?.click();
          sortie.boiteAuMauvaisCode = await repondre('CE-N-EST-PAS-LA-REFERENCE');
          sortie.survitAuMauvaisCode = await existe();

          // ── La bonne l'emporte, et avec elle toute sa chaîne ──
          if (typeof window.execRefreshDynamic === 'function') {
            await window.execRefreshDynamic();
            await attendre(1200);
          }
          const choix2 = [...document.querySelectorAll('#exec-content select')]
            .find((sel) => /filters\.statut/.test(sel.getAttribute('onchange') || ''));
          if (choix2 && choix2.value !== 'cloture') {
            choix2.value = 'cloture';
            choix2.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2000);
          }
          bouton()?.click();
          sortie.boiteALaBonne = await repondre(ctx.reference);
          sortie.partiParLeGeste = !(await existe());
        }

        // ── Et les filtres sont rendus tels qu'ils étaient ──
        window.EXEC_STATE.filters = JSON.parse(sortie.filtresAuDepart);
        if (typeof window.execRenderPage === 'function') {
          window.execRenderPage();
          await attendre(1200);
        }
        sortie.filtresRendus = JSON.stringify(window.EXEC_STATE.filters || {}) === sortie.filtresAuDepart;

        // ── Le repli : il sauve la suite, non le verdict ──
        sortie.repli = 0;
        if (await existe()) {
          const rep = await fetch(`${ctx.api}/dossiers/${ctx.dossierId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'X-OASIS-Request': '1' },
          });
          sortie.repli = rep.status;
        }
        // Ce que `dossier` dit maintenant : « il est parti », quel qu'ait été le
        // chemin. Le contrôle, lui, distingue les deux chemins.
        const dossier = (sortie.partiParLeGeste || sortie.repli === 200) ? 200 : 0;
        const restes = await (await fetch(`${ctx.api}/dossiers`, { credentials: 'same-origin' })).json();
        const notifs = await (await fetch(`${ctx.api}/notifications`, { credentials: 'same-origin' })).json();
        const rapports = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const consts = await (await fetch(`${ctx.api}/constatations`, { credentials: 'same-origin' })).json();
        return {
          ...sortie,
          dossier,
          dossierEncore: (restes || []).some((d) => d.id === ctx.dossierId),
          notifEncore: (notifs || []).some((n) => n.id === ctx.notifId),
          // La cascade porte aussi les rapports : c'est **cette** interrogation,
          // faite après la suppression, qui avait fait écrire une fausse
          // conclusion en 5.f.5.
          rapportsEncore: (rapports || []).filter((r) => r.dossier_id === ctx.dossierId).length,
          // Et les constatations — dont celle qu'un item de checklist a
          // engendrée. La cascade se mesure sur tout ce que la ronde a créé,
          // non sur ce dont on se souvient qu'elle a créé.
          constatationsEncore: (consts || []).filter((c) => c.dossier_id === ctx.dossierId).length,
        };
      }, {
        api: M,
        dossierId: chaine.dossierId,
        notifId: chaine.notifId,
        reference: finEnBase.reference || finEnBase.notification_ref || '',
      });
      verifier('le tableau des dossiers masque les clôturés, et son filtre de statut les rend',
        menage.page > 200 && menage.filtreStatut === true
        && menage.lignesAvantFiltre === 0 && menage.lignesApresFiltre === 1,
        JSON.stringify({ page: menage.page, filtre: menage.filtreStatut,
          avant: menage.lignesAvantFiltre, apres: menage.lignesApresFiltre }));

      verifier('supprimer un dossier demande sa référence saisie, et une référence fausse n’emporte rien',
        menage.bouton === true && menage.boiteAuMauvaisCode === true
        && menage.boiteDemandeSaisie === true
        && menage.survitAuMauvaisCode === true,
        JSON.stringify({ bouton: menage.bouton, boite: menage.boiteAuMauvaisCode,
          saisie: menage.boiteDemandeSaisie, survit: menage.survitAuMauvaisCode }));

      verifier('effacer le dossier par le geste de l’écran emporte sa notification, ses rapports et ses constatations : la ronde ne laisse rien, et rend les filtres',
        menage.boiteALaBonne === true && menage.partiParLeGeste === true
        // Les filtres de l'écran sont partagés : les laisser posés fait rougir
        // les blocs suivants, et c'est arrivé.
        && menage.filtresRendus === true
        // Le repli n'a pas eu à servir : s'il avait servi, le geste n'aurait
        // pas fait son office, et c'est cela que le contrôle refuse.
        && menage.repli === 0
        && menage.dossier === 200 && !menage.dossierEncore && !menage.notifEncore
        && menage.rapportsEncore === 0 && menage.constatationsEncore === 0,
        JSON.stringify(menage));
    }

    // ══════════════════════════════════════════════════════════════════
    //  La composition des références — Paramètres → Autres paramètres
    // ══════════════════════════════════════════════════════════════════
    //
    // Dix gestes nommés, et le meilleur terrain de mesure de l'écran : chaque
    // geste a un effet **visible et dénombrable**. Les segments d'une référence
    // s'ordonnent (préfixe, État, domaine, année, numéro d'ordre), et un aperçu
    // montre aussitôt ce que donnera la prochaine référence produite.
    //
    // La propriété que ce bloc tient, et qu'aucun compte de lignes ne dirait :
    // deux de ces gestes **ne reconstruisent pas la page** — c'est écrit dans
    // leur commentaire, « reconstruire la page retirerait le curseur du champ à
    // chaque lettre ». On le mesure par `document.activeElement`, seul témoin
    // qui distingue un rafraîchissement local d'un rendu complet.
    //
    // La ronde ajoute **un** segment, l'exerce de bout en bout, puis le retire ;
    // elle rend enfin le serveur à ses modèles par défaut par le geste prévu
    // pour cela.
    etape = 'composition des références';
    const refsA = await page.evaluate(async (api) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const lire = async () => {
        try {
          return await (await fetch(`${api}/parametres/references`,
            { credentials: 'same-origin' })).json();
        } catch { return null; }
      };
      const depart = await lire();
      r.modifiable = !!(depart && depart.modifiable);
      r.avant = JSON.stringify((depart || {}).modeles || {});

      document.querySelector('.nav-btn[data-page="parametres"]')?.click();
      await attendre(2500);
      const sousMenu = (nom) => [...document.querySelectorAll('[onclick*="_execParamSub"]')]
        .find((x) => new RegExp(nom).test(x.getAttribute('onclick') || ''));
      sousMenu('autres')?.click();
      await attendre(2500);

      const blocs = () => [...document.querySelectorAll('.exec-ref-objet')];
      const bloc = () => blocs()[0];
      const segs = () => [...bloc().querySelectorAll('.exec-ref-segment')];
      const apercu = () => (bloc().querySelector('.exec-ref-apercu') || {}).textContent || '';
      const total = () => (bloc().querySelector('.exec-ref-total') || {}).textContent || '';

      // ── Les six objets du circuit, et leur aperçu lisible fermé ──
      r.objets = blocs().length;
      r.apercusGarnis = blocs()
        .map((b) => (b.querySelector('.exec-ref-apercu') || {}).textContent || '')
        .filter((t) => t.trim().length > 0).length;
      r.fermes = blocs().filter((b) => !b.open).length;

      // ── La section se déplie par son résumé, et l'aperçu ne bouge pas ──
      const apercuFerme = apercu();
      bloc().querySelector('summary').click();
      await attendre(900);
      r.ouvertApresClic = bloc().open;
      r.apercuInchangeParOuverture = apercu() === apercuFerme;
      r.segDepart = segs().length;
      r.totalDepart = total();

      // ── Un segment s'ajoute ──
      bloc().querySelector('[onclick^="execRefsAjouter"]')?.click();
      await attendre(1400);
      r.segApresAjout = segs().length;
      r.totalApresAjout = total();
      // Le nouveau segment est un « texte libre » vide : l'aperçu l'écarte,
      // puisqu'il filtre les parties vides. Le compte, lui, l'a vu.
      r.apercuApresAjout = apercu();
      r.apercuIgnoreLeVide = apercu() === apercuFerme;

      // ── Sa valeur se saisit, et le rendu suit la frappe sans rendu complet ──
      const derniere = () => segs()[segs().length - 1];
      const champ = derniere().querySelector('[oninput*="execRefsSaisir"][oninput*="valeur"]');
      r.champTrouve = !!champ;
      if (champ) {
        champ.focus();
        champ.value = 'RONDE';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(700);
        r.renduDeLaLigne = (derniere().querySelector('.exec-ref-rendu') || {}).textContent || '';
        // Le témoin qui distingue un rafraîchissement local d'un rendu complet :
        // un rendu complet remplacerait le champ, et le curseur serait perdu.
        r.curseurGarde = document.activeElement === champ;
        r.apercuPorteLaSaisie = /RONDE/.test(apercu());
      }

      // ── Le séparateur change, et seul l'aperçu est refait ──
      const sep = bloc().querySelector('[oninput*="execRefsMajSeparateur"]');
      r.sepTrouve = !!sep;
      if (sep) {
        r.sepAvant = sep.value;
        sep.focus();
        sep.value = '.';
        sep.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(700);
        r.apercuAvecPoint = apercu();
        r.sepCurseurGarde = document.activeElement === sep;
        r.sepPasDeTiret = !apercu().includes('-') && apercu().includes('.');
      }
      return r;
    }, M);

    verifier('l’onglet « Autres paramètres » porte la composition des six objets du circuit, aperçu lisible section fermée',
      refsA.objets === 6 && refsA.apercusGarnis === 6 && refsA.fermes === 6,
      JSON.stringify({ objets: refsA.objets, garnis: refsA.apercusGarnis, fermes: refsA.fermes }));
    verifier('une section se déplie par son résumé, et son aperçu ne devait rien à l’ouverture',
      refsA.ouvertApresClic === true && refsA.apercuInchangeParOuverture === true,
      JSON.stringify({ ouvert: refsA.ouvertApresClic, inchange: refsA.apercuInchangeParOuverture }));
    verifier('un segment s’ajoute : le compte le voit, l’aperçu l’écarte tant qu’il est vide',
      refsA.segApresAjout === refsA.segDepart + 1
      && refsA.totalApresAjout !== refsA.totalDepart
      && refsA.apercuIgnoreLeVide === true,
      JSON.stringify({ avant: refsA.segDepart, apres: refsA.segApresAjout,
        total: refsA.totalApresAjout, apercu: refsA.apercuApresAjout }));
    verifier('la valeur d’un segment se saisit : le rendu de la ligne et l’aperçu suivent, et le curseur reste dans le champ',
      refsA.renduDeLaLigne === 'RONDE' && refsA.apercuPorteLaSaisie === true
      && refsA.curseurGarde === true,
      JSON.stringify({ rendu: refsA.renduDeLaLigne, apercu: refsA.apercuPorteLaSaisie,
        curseur: refsA.curseurGarde }));
    verifier('le séparateur change, l’aperçu se recompose, et le curseur reste là aussi',
      refsA.sepAvant === '-' && refsA.sepPasDeTiret === true && refsA.sepCurseurGarde === true,
      JSON.stringify({ avant: refsA.sepAvant, apercu: refsA.apercuAvecPoint,
        curseur: refsA.sepCurseurGarde }));

    const refsB = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const bloc = () => [...document.querySelectorAll('.exec-ref-objet')][0];
      const segs = () => [...bloc().querySelectorAll('.exec-ref-segment')];
      const apercu = () => (bloc().querySelector('.exec-ref-apercu') || {}).textContent || '';
      const derniere = () => segs()[segs().length - 1];
      const rendu = (d) => (d.querySelector('.exec-ref-rendu') || {}).textContent || '';

      // ── Le type du segment change, et le numéro d'ordre prend sa longueur ──
      const choix = derniere().querySelector('select');
      choix.value = 'numero';
      choix.focus();
      choix.dispatchEvent(new Event('change', { bubbles: true }));
      await attendre(1600);
      // ── Le contre-essai du témoin ──
      //
      // `document.activeElement` ne prouve rien tant qu'on n'a pas montré qu'il
      // **distingue**. `execRefsMajSegment`, lui, appelle `execRenderPage()` :
      // le nœud du menu doit donc avoir quitté le document. Si ce relevé était
      // vert aussi, les trois contrôles de curseur ne mesureraient que le fait
      // qu'un champ garde le focus quand on ne touche à rien.
      r.choixDetache = !document.contains(choix);
      r.renduNumero = rendu(derniere());
      const longueur = derniere().querySelector('[oninput*="execRefsSaisir"][oninput*="longueur"]');
      r.longueurTrouvee = !!longueur;
      r.longueurDefaut = longueur ? Number(longueur.value) : null;

      // ── La longueur se saisit, et le rendu se rallonge ──
      if (longueur) {
        longueur.value = '5';
        longueur.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(700);
        r.renduRallonge = rendu(derniere());
      }

      // ── Le segment monte d'un rang : l'ordre change, le contenu non ──
      const sep = (bloc().querySelector('[oninput*="execRefsMajSeparateur"]') || {}).value || '.';
      const avant = apercu();
      r.ordreAvant = avant;
      // La garde du premier rang est **dans le balisage**, non dans la fonction :
      // le bouton « Monter » du rang 1 est `disabled`. On la constate là où elle
      // est, au lieu de cliquer un bouton mort et d'appeler cela une preuve.
      r.monterDuPremierDesarme = !!segs()[0].querySelector('[onclick*="execRefsDeplacer"][onclick*="-1"]').disabled;
      derniere().querySelector('[onclick*="execRefsDeplacer"][onclick*="-1"]').click();
      await attendre(1600);
      r.ordreApres = apercu();
      const parts = (t) => t.split(sep).filter(Boolean).sort().join('|');
      r.memesParties = parts(avant) === parts(r.ordreApres);
      r.ordreADifferé = avant !== r.ordreApres;

      // ── Et il se retire : le compte revient à son départ ──
      r.segAvantRetrait = segs().length;
      const cible = [...segs()].find((s) => (s.querySelector('select') || {}).value === 'numero'
        && Number((s.querySelector('[oninput*="longueur"]') || {}).value) === 5);
      r.cibleTrouvee = !!cible;
      cible?.querySelector('[onclick*="execRefsRetirer"]').click();
      await attendre(1600);
      r.segApresRetrait = segs().length;
      r.apercuFinal = apercu();
      return r;
    });

    verifier('le type d’un segment se change, et le numéro d’ordre arrive avec ses trois chiffres',
      refsB.renduNumero === '001' && refsB.longueurTrouvee === true && refsB.longueurDefaut === 3,
      JSON.stringify(refsB));
    // Le contre-essai des trois contrôles de curseur ci-dessus : ce geste-ci
    // reconstruit la page, et son nœud doit avoir quitté le document.
    verifier('et ce geste-là reconstruit bien la page : son propre menu quitte le document — le témoin du curseur distingue',
      refsB.choixDetache === true,
      JSON.stringify({ detache: refsB.choixDetache }));
    verifier('la longueur du numéro se saisit, et son rendu se rallonge d’autant',
      refsB.renduRallonge === '00001',
      JSON.stringify({ rendu: refsB.renduRallonge }));
    verifier('un segment monte d’un rang : l’aperçu change d’ordre sans changer de contenu, et le rang 1 ne peut pas monter',
      refsB.ordreADifferé === true && refsB.memesParties === true
      && refsB.monterDuPremierDesarme === true,
      JSON.stringify({ avant: refsB.ordreAvant, apres: refsB.ordreApres,
        memes: refsB.memesParties, premierDesarme: refsB.monterDuPremierDesarme }));
    verifier('le segment ajouté se retire, et le compte revient à son départ',
      refsB.cibleTrouvee === true && refsB.segApresRetrait === refsB.segAvantRetrait - 1
      && refsB.segApresRetrait === refsA.segDepart,
      JSON.stringify({ depart: refsA.segDepart, avant: refsB.segAvantRetrait,
        apres: refsB.segApresRetrait }));

    const refsC = await page.evaluate(async ({ api, avant }) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const lire = async () => {
        try {
          return await (await fetch(`${api}/parametres/references`,
            { credentials: 'same-origin' })).json();
        } catch { return null; }
      };
      const bloc = () => [...document.querySelectorAll('.exec-ref-objet')][0];
      const segs = () => [...bloc().querySelectorAll('.exec-ref-segment')];
      const enregistrer = async () => {
        document.querySelector('[onclick^="execRefsEnregistrer"]')?.click();
        await attendre(2200);
      };

      // ── L'enregistrement est relu chez le serveur ──
      await enregistrer();
      const apres = await lire();
      r.sepChezLeServeur = ((apres || {}).modeles || {}).activite
        ? apres.modeles.activite.separateur : null;

      // ── Le serveur impose un numéro d'ordre ──
      //
      // « Une référence sans numéro d'ordre ne distinguerait plus deux
      // objets » : le serveur en pose un si la composition reçue n'en porte
      // aucun. On retire donc tous les numéros par le geste de l'écran, on
      // enregistre, et l'on relit ce que le serveur a gardé.
      let garde = 0;
      for (;;) {
        const n = [...segs()].find((s) => (s.querySelector('select') || {}).value === 'numero');
        if (!n || garde > 6) break;
        n.querySelector('[onclick*="execRefsRetirer"]').click();
        garde += 1;
        /* eslint-disable no-await-in-loop */
        await attendre(1500);
      }
      r.numerosRetires = garde;
      r.plusAucunNumeroAuClient = ![...segs()]
        .some((s) => (s.querySelector('select') || {}).value === 'numero');
      await enregistrer();
      const impose = await lire();
      const segServeur = (((impose || {}).modeles || {}).activite || {}).segments || [];
      r.numeroImpose = segServeur.filter((s) => s.type === 'numero').length;
      r.longueurImposee = (segServeur.find((s) => s.type === 'numero') || {}).longueur;

      // ── Le geste « compositions par défaut », et le serveur rendu tel quel ──
      document.querySelector('[onclick^="execRefsDefaut"]')?.click();
      await attendre(1600);
      await enregistrer();
      const fin = await lire();
      r.rendu = JSON.stringify((fin || {}).modeles || {});
      r.identiqueAuDepart = r.rendu === avant;
      return r;
    }, { api: M, avant: refsA.avant });

    verifier('l’enregistrement de la composition est relu chez le serveur, séparateur compris',
      refsA.modifiable === true && refsC.sepChezLeServeur === '.',
      JSON.stringify({ modifiable: refsA.modifiable, separateur: refsC.sepChezLeServeur }));
    verifier('le serveur impose un numéro d’ordre : une composition qui n’en porte plus en reçoit un',
      refsC.numerosRetires > 0 && refsC.plusAucunNumeroAuClient === true
      && refsC.numeroImpose === 1 && refsC.longueurImposee === 3,
      JSON.stringify(refsC));
    verifier('le geste « compositions par défaut » rend le serveur à l’état où la ronde l’a trouvé',
      refsC.identiqueAuDepart === true,
      `rendu ${String(refsC.rendu).slice(0, 90)} · départ ${String(refsA.avant).slice(0, 90)}`);

    // ══════════════════════════════════════════════════════════════════
    //  Le tableau de bord : la piste des activités, et ses commandes
    // ══════════════════════════════════════════════════════════════════
    //
    // La propriété de ce Gantt n'est pas qu'il défile : c'est que **ses
    // commandes se ferment quand la piste tient tout entière dans son cadre**.
    // Le code le dit : « sur un large écran, une piste qui tient tout entière
    // ne bougeait pas d'un clic, et les boutons passaient pour cassés ».
    //
    // D'où la seule forme honnête de ce contrôle : à deux faces. Cliquer un
    // bouton désarmé et constater que rien ne bouge serait un faux vert — on
    // aurait mesuré un bouton mort et appelé cela une preuve. On resserre donc
    // la fenêtre pour faire déborder la piste, et l'on vérifie les deux états.
    // La fenêtre est rendue à sa taille d'origine ensuite : une ronde qui ne
    // rend pas ce qu'elle a changé fait rougir celles qui la suivent.
    // ══════════════════════════════════════════════════════════════════
    //  Le régime du tableau de bord — fabriqué, et non hérité d'un cache
    // ══════════════════════════════════════════════════════════════════
    //
    // ── Deux contrôles qui passaient sur un cache périmé ──
    //
    // Le 8 novembre 2026, deux contrôles de ce qui suit ont rougi après une
    // correction qui ne les concernait pas : le ménage de la ronde du dossier,
    // jusque-là fait par l'API, se fait désormais par le geste de l'écran
    // (n° 5.f.73). Le geste appelle `execRefreshDynamic()`, l'appel d'API non.
    //
    // *Le cache du client gardait donc une notification et des constatations
    // que le serveur n'avait plus*, et ces deux contrôles vivaient de cette
    // péremption :
    //
    //   · le filtre « non initiée » de la piste ne restreignait que parce
    //     qu'une activité paraissait encore engagée — `execAvancement` rend
    //     `non_initiee` dès qu'il n'y a pas de notification, et sans cache
    //     périmé les **deux** activités du jeu le sont ;
    //   · les boutons d'année du formulaire de statistiques se composent des
    //     années des **constatations** — sans aucune, la rangée n'existe pas,
    //     et il n'y avait plus rien à cliquer.
    //
    // Ils ne mesuraient donc pas ce qu'ils annonçaient. *Un contrôle qui dépend
    // de données que la ronde a déjà détruites mesure la péremption du cache,
    // non l'écran.* Le régime est désormais **fabriqué** — une notification en
    // brouillon pour qu'une activité se distingue de l'autre, une constatation
    // directe pour qu'une année existe — et rendu à la fin.
    etape = 'régime du tableau de bord';
    const regime = await page.evaluate(async (api) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const env = async (url, methode, corps) => {
        const rep = await fetch(url, {
          method: methode,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await rep.json(); } catch { /* corps vide */ }
        return { statut: rep.status, corps: b };
      };
      const r = {};
      const plans = await (await fetch(`${api}/plans-valides`, { credentials: 'same-origin' })).json();
      const plan = (plans || []).find((x) => (x.activites || []).length);
      r.plan = !!plan;
      if (plan) {
        const a = plan.activites[0];
        const n = await env(`${api}/notifications`, 'POST', {
          activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
          objet: 'SURV — régime du tableau de bord', type_supervision: 'Audit',
          date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
          lieu: 'Siège', perimetre: 'Ensemble des processus',
        });
        r.notif = n.statut;
        r.notifId = (n.corps || {}).id;
        r.prestataireId = a.prestataire_id;
      }
      // Une constatation **directe** : elle n'a pas de dossier, donc rien à
      // construire autour d'elle, et elle porte une date — ce qui suffit à la
      // rangée des années.
      const c = await env(`${api}/constatations`, 'POST', {
        direct: true, prestataire_id: r.prestataireId || '', domaine_id: 'AIR',
        criticite: 'mineur', description: 'SURV — écart qui donne son année au formulaire.',
      });
      r.fnc = c.statut;
      r.fncId = (c.corps || {}).id;
      if (typeof window.execRefreshDynamic === 'function') {
        await window.execRefreshDynamic();
        await attendre(1800);
      }
      // Ce que le client voit après relecture : c'est cela que les deux blocs
      // qui suivent vont mesurer.
      r.notifsEnCache = (window.EXEC_STATE.data.notifications || []).length;
      r.fncsEnCache = (window.EXEC_STATE.data.constatations || []).length;
      return r;
    }, M);
    verifier('le régime du tableau de bord est fabriqué : une activité engagée, et une année',
      regime.plan === true && regime.notif === 201 && !!regime.notifId
      && regime.fnc === 201 && !!regime.fncId
      && regime.notifsEnCache >= 1 && regime.fncsEnCache >= 1,
      JSON.stringify(regime));

    etape = 'piste des activités';
    await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('.nav-btn[data-page="dashboard"]')?.click();
      await attendre(3200);
    });

    const ganttLarge = await page.evaluate(() => {
      const cadre = document.querySelector('#execSuiviActivitesRoot .exec-gantt-cadre');
      const boutons = [...document.querySelectorAll('#execSuiviActivitesRoot .exec-suivi-nav .btn')];
      return {
        cadre: !!cadre,
        deborde: cadre ? cadre.scrollWidth > cadre.clientWidth + 1 : null,
        boutons: boutons.length,
        desarmes: boutons.filter((b) => b.disabled).length,
        raisons: boutons.filter((b) => b.disabled && (b.title || '').length > 0).length,
      };
    });

    await page.setViewport({ width: 620, height: 900 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2200)));
    const ganttSerre = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const cadre = () => document.querySelector('#execSuiviActivitesRoot .exec-gantt-cadre');
      const boutons = () => [...document.querySelectorAll('#execSuiviActivitesRoot .exec-suivi-nav .btn')];
      const commande = (motif) => boutons().find((b) => new RegExp(motif)
        .test(b.getAttribute('onclick') || ''));
      r.deborde = cadre() ? cadre().scrollWidth > cadre().clientWidth + 1 : null;
      r.desarmes = boutons().filter((b) => b.disabled).length;

      // ── Les commandes font défiler la piste ──
      // `scrollBy`/`scrollTo` sont en `behavior: 'smooth'` : on laisse le temps
      // à l'animation, sans quoi on relèverait la position de départ.
      cadre().scrollLeft = 0;
      await attendre(400);
      commande('execGanttDefiler\\(1\\)')?.click();
      await attendre(1500);
      r.apresAvancer = Math.round(cadre().scrollLeft);
      commande('execGanttBord\\(1\\)')?.click();
      await attendre(1500);
      r.apresFin = Math.round(cadre().scrollLeft);
      r.maxPossible = Math.round(cadre().scrollWidth - cadre().clientWidth);
      commande('execGanttBord\\(-1\\)')?.click();
      await attendre(1500);
      r.apresDebut = Math.round(cadre().scrollLeft);
      commande('execGanttAujourdhui')?.click();
      await attendre(1500);
      r.apresAujourdhui = Math.round(cadre().scrollLeft);
      r.traitDuJour = !!cadre().querySelector('.g-aujourdhui');

      // ── Un filtre du panneau : la carte est refaite, et le décocher rétablit ──
      const carte = () => document.getElementById('execSuiviActivitesRoot');
      const lignes = () => [...carte().querySelectorAll('.g-nom')]
        .map((e) => e.textContent.trim()).join('|');
      const cases = () => [...carte().querySelectorAll('[onchange*="execGanttFiltrer"]')];
      r.cases = cases().length;
      const noeudAvant = carte();
      const avant = lignes();
      const uneCase = cases().find((c) => /avancements/.test(c.getAttribute('onchange') || ''));
      r.caseTrouvee = !!uneCase;
      if (uneCase) {
        uneCase.click();
        await attendre(1200);
        r.carteRemplacee = carte() !== noeudAvant;
        r.apresFiltre = lignes();
        // Le même filtre, décoché : la carte ayant été remplacée, il faut le
        // retrouver par son `onchange`, non par le nœud d'avant.
        const meme = cases().find((c) => c.getAttribute('onchange') === uneCase.getAttribute('onchange'));
        r.memeCaseRetrouvee = !!meme;
        r.cochee = meme ? meme.checked : null;
        meme?.click();
        await attendre(1200);
        r.retabli = lignes();
        r.identiqueApresRetour = r.retabli === avant;
        r.filtreARestreint = r.apresFiltre !== avant;
      }
      return r;
    });
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

    verifier('la piste des activités tient dans son cadre à 1280 px, et ses commandes se ferment en disant pourquoi',
      ganttLarge.cadre === true && ganttLarge.deborde === false
      && ganttLarge.boutons === 5 && ganttLarge.desarmes === 5
      && ganttLarge.raisons === 5,
      JSON.stringify(ganttLarge));
    verifier('la fenêtre resserrée, la piste déborde et les commandes s’arment — le témoin distingue les deux états',
      ganttSerre.deborde === true && ganttSerre.desarmes === 0,
      JSON.stringify({ deborde: ganttSerre.deborde, desarmes: ganttSerre.desarmes }));
    verifier('les commandes mènent la piste : avancer, le bout, le début, et le trait du jour',
      ganttSerre.apresAvancer > 0
      && ganttSerre.apresFin === ganttSerre.maxPossible
      && ganttSerre.apresDebut === 0
      && ganttSerre.traitDuJour === true && ganttSerre.apresAujourdhui >= 0,
      JSON.stringify({ avancer: ganttSerre.apresAvancer, fin: ganttSerre.apresFin,
        max: ganttSerre.maxPossible, debut: ganttSerre.apresDebut,
        aujourdhui: ganttSerre.apresAujourdhui, trait: ganttSerre.traitDuJour }));
    verifier('un filtre du panneau refait la carte, restreint la piste, et se décoche sans rien laisser',
      ganttSerre.cases > 0 && ganttSerre.caseTrouvee === true
      && ganttSerre.carteRemplacee === true && ganttSerre.filtreARestreint === true
      && ganttSerre.identiqueApresRetour === true,
      JSON.stringify({ cases: ganttSerre.cases, remplacee: ganttSerre.carteRemplacee,
        restreint: ganttSerre.filtreARestreint, retabli: ganttSerre.identiqueApresRetour,
        avantApres: `${ganttSerre.apresFiltre} ≠ ${ganttSerre.retabli}` }));

    // ══════════════════════════════════════════════════════════════════
    //  Le formulaire de statistiques — indicateurs, situation, période
    // ══════════════════════════════════════════════════════════════════
    //
    // Il occupe le volet, se rejoue à chaque geste, et garde son état dans
    // `EXEC_STATE` : onglet, indicateur, filtres et période. On l'exerce donc
    // par ses gestes, et l'on relève à chaque fois ce que l'écran rend — non ce
    // que l'état porte, qui ne prouverait que l'affectation.
    etape = 'formulaire de statistiques';
    const stats = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const volet = () => document.getElementById('execSlider');
      const dans = (sel) => (volet() || document).querySelectorAll(sel);
      const un = (sel) => (volet() || document).querySelector(sel);

      // ── Le formulaire s'ouvre dans le volet, avec ses deux sous-menus ──
      document.querySelector('[onclick^="execShowStatistiquesAdvanced"]')?.click();
      await attendre(2600);
      r.voletOuvert = !!volet() && volet().classList.contains('open');
      r.onglets = [...dans('.exec-stats-onglet')].map((b) => b.textContent.trim());
      r.cartes = dans('[onclick^="execStatsIndicateur"]').length;
      // Sans prestataire retenu, les constatations de la ronde datent toutes du
      // même jour : la piste n'a pas d'étendue, et la chronologie ne paraît pas.
      r.chronoAvantPrest = !!document.getElementById('execChrono');

      // ── Une carte d'indicateur s'ouvre, et un second clic la referme ──
      const carte = () => [...dans('[onclick^="execStatsIndicateur"]')]
        .find((b) => /execStatsIndicateur\('[a-z_]+'\)/.test(b.getAttribute('onclick') || ''));
      const detail = () => dans('.exec-stats-detail, [class*="stats-detail"]').length;
      r.detailAvant = detail();
      const premiere = carte();
      r.cleIndicateur = premiere ? (premiere.getAttribute('onclick') || '') : '';
      premiere?.click();
      await attendre(2000);
      r.detailApres = detail();
      r.actifs = dans('.cliquable.actif, .actif').length;
      // Le même geste, retrouvé par sa clé : le formulaire s'est rejoué.
      [...dans('[onclick^="execStatsIndicateur"]')]
        .find((b) => b.getAttribute('onclick') === r.cleIndicateur)?.click();
      await attendre(2000);
      r.detailReferme = detail();

      // ── La chronologie n'existe que si les données s'étendent dans le temps ──
      //
      // Premier jet : j'ai exercé la chronologie d'emblée, et trois contrôles
      // ont rougi — `raccourcis: 0`. Elle ne se rend pas : `_execStatsPeriode`
      // la borne sur les dates des constatations, et tout ce que la ronde crée
      // date du même jour. Le relevé disait « 0 raccourci » ; j'avais écrit
      // « les poignées » avant de regarder s'il y avait une piste.
      //
      // L'écran y mène pourtant, par son propre geste : « un prestataire retenu
      // impose son cycle de surveillance », et un cycle, lui, s'étend. On
      // choisit donc un prestataire — et cette règle devient un contrôle, au
      // lieu d'un détour pour atteindre le suivant.
      const selPrest = [...dans('select')]
        .find((x) => /statsFilters\.prestataire/.test(x.getAttribute('onchange') || ''));
      r.selPrestTrouve = !!selPrest;
      if (selPrest) {
        const i = [...selPrest.options].findIndex((o) => o.value);
        r.prestOffert = i >= 0;
        if (i >= 0) {
          selPrest.selectedIndex = i;
          selPrest.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2600);
        }
        r.periodeDuCycle = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
        r.chronoApresPrest = !!document.getElementById('execChrono');
        r.bandeauCycle = dans('.exec-chrono-cycle').length;
      }

      // ── Les raccourcis de période, et les bornes au clavier ──
      const raccourci = (n) => [...dans('.exec-chrono-btn')]
        .find((b) => new RegExp(`execStatsPeriodeDerniers\\(${n}\\)`).test(b.getAttribute('onclick') || ''));
      r.raccourcis = dans('.exec-chrono-btn').length;
      raccourci(3)?.click();
      await attendre(2200);
      r.periode3 = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      r.dateDebutRendue = (document.getElementById('execChronoDateDebut') || {}).value || '';

      const dDebut = document.getElementById('execChronoDateDebut');
      const dFin = document.getElementById('execChronoDateFin');
      r.champsDates = !!dDebut && !!dFin;
      if (dDebut && dFin) {
        // Les bornes se saisissent à l'envers : le geste les remet dans l'ordre.
        dDebut.value = '2026-09-30';
        dFin.value = '2026-09-01';
        dFin.dispatchEvent(new Event('change', { bubbles: true }));
        await attendre(2200);
        r.periodeRemiseEnOrdre = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      }

      // ── Les poignées ne se croisent pas : celle qu'on pousse repousse l'autre ──
      const a = document.getElementById('execChronoDebut');
      const b = document.getElementById('execChronoFin');
      r.poignees = !!a && !!b;
      if (a && b) {
        a.value = String(Number(a.max));
        b.value = '0';
        a.focus();
        a.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(600);
        r.poigneeFinRepoussee = Number(document.getElementById('execChronoFin').value);
        r.poigneeMax = Number(a.max);
        // Le relâchement arrête la période, et le formulaire se rejoue.
        document.getElementById('execChronoDebut')
          .dispatchEvent(new Event('change', { bubbles: true }));
        await attendre(2200);
        r.periodeApresRelachement = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      }
      // La période est rendue à « tout », pour ne pas fausser la suite.
      [...dans('.exec-chrono-btn')]
        .find((x) => /execStatsPeriode\('',''\)/.test(x.getAttribute('onclick') || ''))?.click();
      await attendre(2200);
      r.periodeRendue = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      return r;
    });

    verifier('le formulaire de statistiques s’ouvre dans le volet, avec ses deux sous-menus et ses cartes d’indicateurs',
      stats.voletOuvert === true && stats.onglets.length === 2 && stats.cartes >= 5,
      JSON.stringify({ volet: stats.voletOuvert, onglets: stats.onglets,
        cartes: stats.cartes, chrono: stats.chronoAvantPrest }));
    verifier('une carte d’indicateur s’ouvre sur son détail, et le second clic la referme',
      stats.detailAvant === 0 && stats.detailApres > 0 && stats.detailReferme === 0,
      JSON.stringify({ avant: stats.detailAvant, apres: stats.detailApres,
        referme: stats.detailReferme, cle: stats.cleIndicateur }));
    verifier('un prestataire retenu impose son cycle de surveillance comme période, et la chronologie paraît alors',
      stats.selPrestTrouve === true && stats.prestOffert === true
      && /"debut":"\d{4}-\d{2}-\d{2}","fin":"\d{4}-\d{2}-\d{2}"/.test(stats.periodeDuCycle || '')
      && stats.chronoApresPrest === true && stats.bandeauCycle === 1,
      JSON.stringify({ periode: stats.periodeDuCycle, chrono: stats.chronoApresPrest,
        bandeau: stats.bandeauCycle }));
    verifier('le raccourci des trois derniers mois arrête la période, et la borne saisie se lit dans le champ',
      stats.raccourcis >= 4 && /debut/.test(stats.periode3) && stats.dateDebutRendue.length === 10,
      JSON.stringify({ raccourcis: stats.raccourcis, periode: stats.periode3,
        champ: stats.dateDebutRendue }));
    verifier('deux bornes saisies à l’envers sont remises dans l’ordre par le geste lui-même',
      stats.champsDates === true
      && /"debut":"2026-09-01","fin":"2026-09-30"/.test(stats.periodeRemiseEnOrdre || ''),
      String(stats.periodeRemiseEnOrdre));
    verifier('les poignées de la chronologie ne se croisent pas : celle qu’on pousse repousse l’autre',
      stats.poignees === true && stats.poigneeFinRepoussee === stats.poigneeMax
      && /debut/.test(stats.periodeApresRelachement || ''),
      JSON.stringify({ fin: stats.poigneeFinRepoussee, max: stats.poigneeMax,
        apres: stats.periodeApresRelachement, rendue: stats.periodeRendue }));

    const stats2 = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const volet = () => document.getElementById('execSlider');
      const dans = (sel) => (volet() || document).querySelectorAll(sel);
      const un = (sel) => (volet() || document).querySelector(sel);
      const F = () => (window.EXEC_STATE || {}).statsFilters || {};

      // ── Les filtres du formulaire ──
      // Le domaine remet le secteur à vide : un secteur d'un autre domaine
      // filtrerait sur rien, et l'écran ne le dirait pas.
      const selDomaine = [...dans('select')]
        .find((s) => /statsFilters\.domaine/.test(s.getAttribute('onchange') || ''));
      r.selects = dans('select').length;
      r.domaineTrouve = !!selDomaine;
      if (selDomaine) {
        const i = [...selDomaine.options].findIndex((o) => o.value);
        if (i >= 0) {
          selDomaine.selectedIndex = i;
          selDomaine.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2200);
        }
        r.domainePose = F().domaine;
        r.secteurRemisAVide = F().secteur === '';
        // Le secteur, ensuite : sa liste ne porte que ceux du domaine retenu.
        //
        // Le motif dit `secteur=this.value`, et non `statsFilters.secteur` :
        // le gestionnaire du **domaine** porte lui aussi `statsFilters.secteur`
        // — c'est lui qui le remet à vide. Mon premier motif l'a donc choisi, et
        // j'ai re-sélectionné le domaine en croyant prendre le secteur. *Un
        // sélecteur qui apparie un fragment commun à deux gestionnaires n'en
        // désigne aucun.*
        const selSecteur = [...dans('select')]
          .find((x) => /statsFilters\.secteur=this\.value/.test(x.getAttribute('onchange') || ''));
        const j = selSecteur ? [...selSecteur.options].findIndex((o) => o.value) : -1;
        r.secteurOffert = j >= 0;
        if (j >= 0) {
          selSecteur.selectedIndex = j;
          r.valeurChoisie = selSecteur.value;
          selSecteur.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2200);
          r.secteurPose = F().secteur;
          r.domaineTenu = F().domaine === r.domainePose;
        }
      }
      const annee = [...dans('[onclick*="statsFilters.annee"]')]
        .find((b) => /annee='\d{4}'/.test(b.getAttribute('onclick') || ''));
      r.anneeTrouvee = !!annee;
      annee?.click();
      await attendre(2200);
      r.anneePosee = F().annee;
      // La remise à zéro reconstruit l'objet entier des filtres.
      un('[onclick*="statsFilters={domaine"]')?.click();
      await attendre(2200);
      r.apresReset = JSON.stringify(F());
      r.toutVide = Object.values(F()).every((v) => v === '');

      // ── Le sous-menu « Situation générale », et ses deux exports ──
      [...dans('.exec-stats-onglet')]
        .find((b) => /statsOnglet='situation'/.test(b.getAttribute('onclick') || ''))?.click();
      await attendre(2600);
      r.carteSituation = !!document.getElementById('execSituationGeneraleCard');
      r.tableSg = !!un('table.sg-prest-table');
      r.lignesSg = dans('tbody tr.sg-ligne-prest').length;
      r.boutonsExport = dans('.sg-export-btn').length;

      // Les exports composent le document dans le navigateur : on capture le
      // produit par relais, comme en 5.f.10 — il n'y a pas de réponse HTTP.
      const relais = { fenetres: 0, blobs: 0 };
      const vraiOpen = window.open;
      const vraiURL = URL.createObjectURL;
      window.open = () => {
        relais.fenetres += 1;
        return { document: { write: () => {}, close: () => {} },
          focus: () => {}, print: () => {}, close: () => {} };
      };
      URL.createObjectURL = (b) => { relais.blobs += 1; return vraiURL.call(URL, b); };
      try {
        un('[onclick^="execExportSituationGenerale(\'xlsx\'"]')?.click();
        await attendre(1800);
        un('[onclick^="execExportSituationGenerale(\'pdf\'"]')?.click();
        await attendre(1800);
      } finally {
        window.open = vraiOpen;
        URL.createObjectURL = vraiURL;
      }
      r.exports = relais;

      // ── Retour aux indicateurs, et le volet se referme par son geste ──
      [...dans('.exec-stats-onglet')]
        .find((b) => /statsOnglet='indicateurs'/.test(b.getAttribute('onclick') || ''))?.click();
      await attendre(2400);
      r.revenuAuxIndicateurs = dans('[onclick^="execStatsIndicateur"]').length > 0;
      un('[onclick^="execCloseSlider"]')?.click();
      await attendre(1600);
      r.voletFerme = !document.getElementById('execSlider')
        || !document.getElementById('execSlider').classList.contains('open');
      return r;
    });

    verifier('le domaine choisi remet le secteur à vide, puis un secteur du domaine se pose sans le chasser',
      stats2.domaineTrouve === true && !!stats2.domainePose
      && stats2.secteurRemisAVide === true
      && stats2.secteurOffert === true && !!stats2.secteurPose
      && stats2.domaineTenu === true,
      JSON.stringify({ domaine: stats2.domainePose, vide: stats2.secteurRemisAVide,
        offert: stats2.secteurOffert, choisie: stats2.valeurChoisie,
        secteur: stats2.secteurPose, domaineTenu: stats2.domaineTenu }));
    verifier('l’année se pose, et la remise à zéro vide tous les filtres d’un seul geste',
      stats2.anneeTrouvee === true && /^\d{4}$/.test(String(stats2.anneePosee))
      && stats2.toutVide === true,
      JSON.stringify({ annee: stats2.anneePosee, apresReset: stats2.apresReset }));
    verifier('le sous-menu « Situation générale » rend sa table et ses deux exports',
      stats2.carteSituation === true && stats2.tableSg === true
      && stats2.lignesSg > 0 && stats2.boutonsExport === 2,
      JSON.stringify({ carte: stats2.carteSituation, table: stats2.tableSg,
        lignes: stats2.lignesSg, boutons: stats2.boutonsExport }));
    verifier('les deux exports de la situation générale fabriquent chacun leur document',
      !!stats2.exports && stats2.exports.blobs >= 1 && stats2.exports.fenetres >= 1,
      JSON.stringify(stats2.exports));
    verifier('le retour aux indicateurs retrouve ses cartes, et le volet se referme par son geste',
      stats2.revenuAuxIndicateurs === true && stats2.voletFerme === true,
      JSON.stringify({ revenu: stats2.revenuAuxIndicateurs, ferme: stats2.voletFerme }));

    // ── Le régime du tableau de bord est rendu ──
    //
    // Dernier geste de la ronde, et il porte son propre contrôle : la suite n'a
    // qu'un jeu d'essai, et ce qu'on y laisse, la campagne suivante le trouve.
    etape = 'restitution du régime';
    const rendu = await page.evaluate(async (ctx) => {
      const env = async (url, methode) => {
        const rep = await fetch(url, {
          method: methode, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
        });
        return rep.status;
      };
      const r = {};
      if (ctx.fncId) r.fnc = await env(`${ctx.api}/constatations/${ctx.fncId}`, 'DELETE');
      if (ctx.notifId) r.notif = await env(`${ctx.api}/notifications/${ctx.notifId}`, 'DELETE');
      const notifs = await (await fetch(`${ctx.api}/notifications`, { credentials: 'same-origin' })).json();
      const fncs = await (await fetch(`${ctx.api}/constatations`, { credentials: 'same-origin' })).json();
      r.notifRestante = (notifs || []).some((n) => n.id === ctx.notifId);
      r.fncRestante = (fncs || []).some((c) => c.id === ctx.fncId);
      // Et l'activité redevient notifiable, comme la ronde du dossier l'exige
      // d'elle-même : c'est `plans-valides` qui l'écarte tant qu'une
      // notification la porte.
      const plans = await (await fetch(`${ctx.api}/plans-valides`, { credentials: 'same-origin' })).json();
      r.activitesRendues = (plans || []).reduce((n, p) => n + (p.activites || []).length, 0);
      return r;
    }, { api: M, notifId: regime.notifId, fncId: regime.fncId });
    verifier('le régime fabriqué pour le tableau de bord est rendu : la ronde ne laisse rien',
      rendu.fnc === 200 && rendu.notif === 200
      && rendu.notifRestante === false && rendu.fncRestante === false
      && rendu.activitesRendues >= 2,
      JSON.stringify(rendu));

    verifier('aucune erreur de console ni requête échouée sur SURV',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
    abandons.verifier('SURV');
  } finally {
    // Le journal du mouchard, relevé avant de fermer : une page fermée n'a plus
    // de `window`, et le relevé rendrait zéro geste — la mesure de rien,
    // présentée comme une couverture nulle.
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = {
        enLigne: [], ecouteurs: [], propriete: [], jsx: [], barre: [], poses: 0, pages: 0,
      };
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
            // Les actions remises au socle : quatrième canal du
            // mouchard (ADR-003, 5.f.43).
            vu.barre.push(...(j.durable.barre || []));
          }
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('SURV');
};
