// CARE dans un navigateur — la suite n° 0.b de l'écran « Mesures d'application »
// (ADR-003, 5.f.18).
//
// Cinquième écran, et le patron ne change plus : barre conforme à la source,
// atteignabilité de toute page de l'aiguillage, tour des pages par de vrais
// clics, puis la ronde des gestes **des** pages — volets et fenêtres ouverts
// puis refermés, bascules dans les deux sens. Aucune écriture.
//
// ── La mesure qui a précédé l'écriture ──
//
// Les cinq pages ont été ouvertes à la main : de **657** caractères (« États »)
// à **3 001** (« Tableau de bord »), aucun débordement, **aucun incident de
// console**. Les seuils ci-dessous viennent de là.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const SOURCE_NAV = path.join(RACINE, 'public', 'modules', 'mesures', 'js', 'mes-app.js');
const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';

function pagesDeclarees() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const bloc = /const MES_NAV = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : MES_NAV introuvable dans public/modules/mesures/js/mes-app.js —'
      + ' le contrôle ne sait plus quelles pages l’écran déclare.');
  }
  const cles = [...bloc[1].matchAll(/^\s{4}([\w-]+):\s*\{/gm)].map((m) => m[1]);
  if (!cles.length) throw new Error('refus : MES_NAV ne se lit plus entrée par entrée.');
  return cles;
}

// L'aiguillage de CARE porte quatre cas **et un défaut** : le tableau de bord
// n'a pas de `case`, il est ce que l'aiguillage rend quand il ne reconnaît rien.
// Un contrôle qui exigerait un cas par entrée de menu le dénoncerait à tort.
function aiguillageEtChemins() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const rendues = [...texte.matchAll(/^\s*case '([\w-]+)': corps = mes\w+\(\);/gm)].map((m) => m[1]);
  if (!rendues.length) {
    throw new Error('refus : l’aiguillage de CARE ne se lit plus dans mes-app.js.');
  }
  const js = path.join(RACINE, 'public', 'modules', 'mesures', 'js');
  const ouvrables = new Set();
  fs.readdirSync(js).filter((f) => f.endsWith('.js')).forEach((f) => {
    const t = fs.readFileSync(path.join(js, f), 'utf8');
    for (const m of t.matchAll(/mesNavigateTo\(\s*'([\w-]+)'/g)) ouvrables.add(m[1]);
    for (const m of t.matchAll(/currentPage\s*=\s*'([\w-]+)'/g)) ouvrables.add(m[1]);
  });
  return { rendues, ouvrables: [...ouvrables] };
}

module.exports = async function mesuresNavigateurSmoke(port) {
  console.log('\n── CARE : l’écran « Mesures d’application » dans un navigateur ──');
  const srv = await demarrer({ port });
  let navigateur = null;
  const incidents = [];
  try {
    // Délai de protocole : voir la raison dans `surv.smoke.js` (n° 5.f.30) —
    // une campagne de huit suites de navigateur a dépassé le défaut.
    navigateur = await puppeteer.launch({
      headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: 1440, height: 900 });

    let care = false;
    let etape = 'montage';
    page.on('console', (m) => {
      if (care && m.type() === 'error') incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (care) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (care) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    page.on('response', (r) => {
      if (!care || r.status() < 400) return;
      incidents.push(`[${etape}] ${r.status()} ${r.url().replace(srv.base, '').slice(0, 120)}`);
    });

    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    care = true;
    await page.goto(`${srv.base}/modules/mesures/index.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.getElementById('mes-content');
        return el && el.textContent.trim().length > 200;
      }, { timeout: 20000 },
    ).catch(() => {});

    const monte = await page.evaluate(() => ({
      pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page),
      contenu: (document.getElementById('mes-content') || { textContent: '' }).textContent.trim().length,
      retour: document.querySelectorAll('.oasis-back-btn').length,
      mort: document.querySelectorAll('.btn-back-portal').length,
    }));
    verifier('l’écran CARE se monte, avec sa barre et son contenu',
      monte.pages.length > 0 && monte.contenu > 200
      && monte.retour === 1 && monte.mort === 0, JSON.stringify(monte));

    let declarees = [];
    let refus = null;
    try { declarees = pagesDeclarees(); } catch (e) { refus = e.message; }
    const manquantes = declarees.filter((p) => !monte.pages.includes(p));
    const inattendues = monte.pages.filter((p) => !declarees.includes(p));
    verifier('la barre de CARE porte exactement les pages que la source déclare',
      !refus && declarees.length > 0 && !manquantes.length && !inattendues.length,
      refus || `${declarees.length} déclarées`
        + `${manquantes.length ? ` — absentes : ${manquantes.join(', ')}` : ''}`
        + `${inattendues.length ? ` — inattendues : ${inattendues.join(', ')}` : ''}`);

    let aig = null;
    let refusAig = null;
    try { aig = aiguillageEtChemins(); } catch (e) { refusAig = e.message; }
    if (refusAig) {
      verifier('toute page de CARE que l’aiguillage rend est atteignable', false, refusAig);
    } else {
      const sansChemin = aig.rendues
        .filter((p) => !declarees.includes(p) && !aig.ouvrables.includes(p));
      verifier('toute page de CARE que l’aiguillage rend est atteignable',
        sansChemin.length === 0,
        sansChemin.length ? `sans chemin : ${sansChemin.join(', ')}`
          : `${aig.rendues.length} cas rendus, ${aig.ouvrables.length} ouvrable(s)`);
    }

    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const ouvrir = (cle) => page.evaluate(
      (c) => document.querySelector(`.nav-btn[data-page="${c}"]`)?.click(), cle,
    );
    const vues = {};
    for (const cle of monte.pages) {
      etape = cle;
      /* eslint-disable no-await-in-loop */
      await ouvrir(cle);
      await attendre(2400);
      vues[cle] = await page.evaluate(() => {
        const z = document.getElementById('mes-content');
        return {
          longueur: z ? z.textContent.trim().length : 0,
          debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          empreinte: z ? `${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}` : '',
        };
      });
    }
    etape = 'pages';
    const maigres = Object.entries(vues).filter(([, v]) => v.longueur < 200)
      .map(([c, v]) => `${c}=${v.longueur}`);
    verifier('chaque page de CARE se remplit', maigres.length === 0,
      maigres.length ? `trop maigres : ${maigres.join(', ')}`
        : Object.entries(vues).map(([c, v]) => `${c}=${v.longueur}`).join(' '));
    const emp = Object.entries(vues).map(([c, v]) => [c, v.empreinte]);
    const jumelles = [];
    for (let i = 0; i < emp.length; i += 1) {
      for (let j = i + 1; j < emp.length; j += 1) {
        if (emp[i][1] === emp[j][1]) jumelles.push(`${emp[i][0]}=${emp[j][0]}`);
      }
    }
    verifier('les pages de CARE diffèrent les unes des autres',
      jumelles.length === 0, jumelles.join(', ') || `${emp.length} pages distinctes`);
    const debordantes = Object.entries(vues).filter(([, v]) => v.debord > 0)
      .map(([c, v]) => `${c}=${v.debord}px`);
    verifier('aucune page de CARE ne déborde à droite',
      debordantes.length === 0, debordantes.join(', ') || 'aucun débordement');

    // ── Les gestes de chaque page ──
    etape = 'gestes';
    const gestes = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      // La racine est `mesModalRoot`, et non `mesModal` : le premier essai
      // mesurait un élément qui n'existe pas, et rendait 0 sur une fenêtre bien
      // ouverte. Lu dans `mesAfficherModal`.
      const modal = () => (document.getElementById('mesModalRoot') || { innerHTML: '' }).innerHTML.length;
      const volet = () => (document.getElementById('mesVoletRoot') || { innerHTML: '' }).innerHTML.length;
      const page_ = async (c) => {
        document.querySelector(`.nav-btn[data-page="${c}"]`)?.click();
        await a(2400);
      };
      // Tableau de bord : le graphe par catégorie, et la remise des filtres.
      await page_('dashboard');
      const contenu = () => (document.getElementById('mes-content') || { textContent: '' }).textContent.trim().length;
      r.tdbAvant = contenu();
      document.querySelector('[onclick^="mesGrapheCategorie"]')?.click();
      await a(1600);
      document.querySelector('[onclick^="mesResetFiltresDashboard"]')?.click();
      await a(1600);
      r.tdbApres = contenu();
      // Carences : la fenêtre d'un constat, ouverte et refermée.
      await page_('critiques');
      document.querySelector('[onclick^="mesResetFiltresCritiques"]')?.click();
      await a(1500);
      const constat = document.querySelector('[onclick^="mesOuvrirConstat"]');
      r.boutonConstat = !!constat;
      if (constat) {
        constat.click();
        await a(2500);
        r.constatOuvert = Math.max(modal(), volet());
        document.querySelector('[onclick^="mesFermerModal"], [onclick^="mesFermerVolet"]')?.click();
        await a(1500);
        r.constatFerme = Math.max(modal(), volet());
      }
      // Mesures et États : leurs gestes de lecture.
      await page_('mesures');
      document.querySelector('[onclick^="mesResetFiltresMesures"]')?.click();
      await a(1500);
      await page_('etats');
      const voir = document.querySelector('[onclick^="mesEtatsVoir"]');
      r.boutonEtats = !!voir;
      if (voir) { voir.click(); await a(2200); }
      r.etats = contenu();
      // Paramètres : la barre latérale dans les deux sens, un sous-menu, et la
      // fenêtre d'une catégorie.
      await page_('parametres');
      const sousMenus = () => document.querySelectorAll('[onclick^="mesParamSousMenu"]').length;
      r.sousMenus = sousMenus();
      document.querySelector('[onclick^="mesBasculerBarreParam"]')?.click();
      await a(1600);
      r.replie = sousMenus();
      document.querySelector('[onclick^="mesBasculerBarreParam"]')?.click();
      await a(1600);
      r.deplie = sousMenus();
      // ── L'ordre, encore : la fenêtre d'une catégorie avant le changement de
      //    sous-menu ──
      //
      // Premier essai : le second sous-menu était ouvert, **puis** la fenêtre
      // d'une catégorie cherchée. Or les catégories vivent dans le **premier**
      // sous-menu : changer de panneau avait emporté le bouton, et le contrôle
      // rendait « null » sur un geste qui marche. *Ce qui s'ouvre se prend là
      // où il vit, et avant ce qui déplace.*
      const categorie = document.querySelector('[onclick^="mesOuvrirCategorie"]');
      r.boutonCategorie = !!categorie;
      if (categorie) {
        categorie.click();
        await a(2400);
        r.categorieOuverte = Math.max(modal(), volet());
        document.querySelector('[onclick^="mesFermerModal"], [onclick^="mesFermerVolet"]')?.click();
        await a(1500);
        r.categorieFermee = Math.max(modal(), volet());
      }
      const second = [...document.querySelectorAll('[onclick^="mesParamSousMenu"]')][1];
      if (second) { second.click(); await a(1800); }
      r.apresSousMenu = contenu();
      const inutilise = document.querySelector('[onclick^="mesOuvrirCategorie"]');
      r.categorieEncore = !!inutilise;
      return r;
    });
    verifier('les gestes de lecture de CARE répondent sans vider leur page',
      gestes.tdbApres > 200 && gestes.etats > 200 && gestes.apresSousMenu > 200,
      JSON.stringify({ tdb: [gestes.tdbAvant, gestes.tdbApres], etats: gestes.etats,
        sousMenu: gestes.apresSousMenu }));
    verifier('la barre des paramètres de CARE se replie et se déplie',
      gestes.sousMenus > 0 && gestes.deplie === gestes.sousMenus,
      JSON.stringify({ avant: gestes.sousMenus, replie: gestes.replie, deplie: gestes.deplie }));
    verifier('les fenêtres de CARE s’ouvrent garnies et se referment par leur geste',
      gestes.boutonCategorie === true && gestes.categorieOuverte > 200
      && gestes.categorieFermee === 0,
      JSON.stringify({ constat: [gestes.constatOuvert, gestes.constatFerme],
        categorie: [gestes.categorieOuverte, gestes.categorieFermee] }));

    // ══════════════════════════════════════════════════════════════════
    //  La coquille de CARE : barre, thème, langue, filtres, recherche
    // ══════════════════════════════════════════════════════════════════
    //
    // CARE était à 11 gestes sur 87 — l'écran le plus pauvre après PR. Sa
    // coquille n'avait jamais été touchée : le repli de la barre, les pastilles
    // de thème, les boutons de langue, le volet latéral, les facettes du
    // tableau de bord et la recherche différée.
    //
    // La langue et le thème sont rendus à leur valeur de départ : un contrôle
    // qui les laisserait changés ferait lire aux suivants une autre page.
    etape = 'coquille de CARE';
    await ouvrir('dashboard');
    await attendre(2600);
    const rondeCare = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const S = () => window.MES_STATE || {};
      // Chercher le geste là où il est, plutôt que de supposer sa page : la
      // leçon de PR (n° 5.f.52), qui a coûté trois passages.
      const allerOu = async (selecteur) => {
        if (document.querySelector(selecteur)) return { deja: true };
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          /* eslint-disable no-await-in-loop */
          await a(2400);
          if (document.querySelector(selecteur)) return { page: p };
          const sous = [...document.querySelectorAll('.sub-nav-btn')];
          for (const b of sous) {
            b.click();
            await a(2000);
            if (document.querySelector(selecteur)) {
              return { page: p, sousVue: (b.textContent || '').trim().slice(0, 22) };
            }
          }
        }
        return { introuvable: true, pages: pages.length };
      };

      // ── 1. Le repli de la barre, pris dans les deux sens ──
      await essai('barre', async () => {
        const d = {};
        d.avant = !!S().sidebarCollapsed;
        const bouton = document.querySelector('[onclick*="mesToggleSidebar"]');
        d.bouton = !!bouton;
        bouton?.click();
        await a(1600);
        d.apres = !!S().sidebarCollapsed;
        document.querySelector('[onclick*="mesToggleSidebar"]')?.click();
        await a(1600);
        d.rendu = !!S().sidebarCollapsed === d.avant;
        return d;
      });

      // ── 2. Le thème et la langue, rendus à leur valeur de départ ──
      await essai('theme', async () => {
        const d = {};
        d.avant = S().theme;
        d.attributAvant = document.documentElement.getAttribute('data-theme');
        const points = [...document.querySelectorAll('[onclick*="mesSetTheme("]')];
        d.points = points.length;
        const autre = points.find((p) => !(p.getAttribute('onclick') || '').includes(`'${d.avant}'`));
        d.autreOffert = !!autre;
        const vise = autre
          ? (/mesSetTheme\('([^']+)'/.exec(autre.getAttribute('onclick') || '') || [])[1] : null;
        autre?.click();
        await a(1800);
        d.apres = S().theme;
        d.visePose = d.apres === vise;
        d.attributApres = document.documentElement.getAttribute('data-theme');
        [...document.querySelectorAll('[onclick*="mesSetTheme("]')]
          .find((p) => (p.getAttribute('onclick') || '').includes(`'${d.avant}'`))?.click();
        await a(1800);
        d.rendu = S().theme === d.avant;
        return d;
      });

      await essai('langue', async () => {
        const d = {};
        d.avant = S().lang;
        const temoin = () => (document.querySelector('.nav-btn span') || {}).textContent || '';
        d.temoinAvant = temoin();
        const boutons = [...document.querySelectorAll('[onclick*="mesSetLang("]')];
        d.boutons = boutons.length;
        const autre = boutons.find((b) => !(b.getAttribute('onclick') || '').includes(`'${d.avant}'`));
        d.autreOffert = !!autre;
        autre?.click();
        await a(2600);
        d.apres = S().lang;
        d.temoinApres = temoin();
        d.libelleChange = d.temoinApres !== d.temoinAvant && d.temoinApres !== '';
        [...document.querySelectorAll('[onclick*="mesSetLang("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(`'${d.avant}'`))?.click();
        await a(2600);
        d.rendu = S().lang === d.avant;
        d.temoinRendu = temoin() === d.temoinAvant;
        return d;
      });

      // ── 3. Les facettes du tableau de bord, et la recherche différée ──
      await essai('facettes', async () => {
        const d = {};
        d.ou = await allerOu('[onchange*="mesSetFiltre("]');
        const facettes = [...document.querySelectorAll('[onchange*="mesSetFiltre("]')];
        d.facettes = facettes.length;
        if (!facettes.length) return d;
        const s = facettes[0];
        const cle = (/mesSetFiltre\('([^']+)'/.exec(s.getAttribute('onchange') || '') || [])[1];
        d.cle = cle;
        const c = [...s.options].find((op) => op.value);
        d.offre = !!c;
        if (c) {
          s.value = c.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2200);
          d.retenu = (S().filtres || {})[cle] === c.value;
          // Et l'on rend l'état : les facettes de CARE sont globales elles aussi.
          const rendu = [...document.querySelectorAll('[onchange*="mesSetFiltre("]')]
            .find((x) => (x.getAttribute('onchange') || '').includes(`'${cle}'`));
          if (rendu) {
            rendu.value = '';
            rendu.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2000);
          }
          d.rendu = ((S().filtres || {})[cle] || '') === '';
        }
        return d;
      });
      return o;
    });

    // La recherche de CARE passe par le différé du socle, qui **relit le champ
    // par son identifiant** : une valeur posée à la main sur un élément que le
    // redessin a remplacé ne serait jamais lue. C'est la leçon de PLAN
    // (n° 5.f.48) — la frappe vient de `page.type`.
    // La phase des facettes a navigué pour trouver sa page : le champ de
    // recherche n'est pas forcément sous les yeux. On le cherche, comme le reste.
    const champRecherche = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const ici = () => [...document.querySelectorAll('input')]
        .find((x) => (x.getAttribute('oninput') || '').includes('mesRechercher('));
      let e = ici();
      if (!e) {
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          /* eslint-disable no-await-in-loop */
          await a(2400);
          e = ici();
          if (e) break;
        }
      }
      // Pas d'identifiant : `mesRechercher` passe une **clé** au socle, non
      // l'élément — `oasisSaisieDifferee('mes_xxx', …)`. Le champ n'en a donc
      // pas besoin, et nous le visons par son attribut.
      return e ? { id: e.id || '', cle: (/mesRechercher\('([^']+)'/.exec(e.getAttribute('oninput') || '') || [])[1] || '' } : null;
    });
    let recherche = { trouve: !!champRecherche };
    if (champRecherche) {
      const selecteur = champRecherche.id
        ? `#${champRecherche.id}`
        : `input[oninput*="mesRechercher('${champRecherche.cle}'"]`;
      recherche.selecteur = selecteur;
      await page.type(selecteur, 'ronde', { delay: 40 });
      // Le différé du socle : 300 ms après la dernière frappe, plus le redessin.
      await attendre(2400);
      recherche = {
        ...recherche,
        ...(await page.evaluate((sel, cle) => {
          const S = window.MES_STATE || {};
          const e = document.querySelector(sel);
          return {
            cle,
            retenu: (S.filtres || {})[cle] === 'ronde',
            champPorteLaValeur: e ? e.value === 'ronde' : false,
          };
        }, selecteur, champRecherche.cle)),
      };
      // Rendu : la recherche est un filtre global comme les autres.
      await page.evaluate((sel) => {
        const e = document.querySelector(sel);
        if (e) { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }
      }, selecteur);
      await attendre(2000);
      recherche.rendu = await page.evaluate((cle) => (((window.MES_STATE || {}).filtres || {})[cle] || '') === '', champRecherche.cle);
    }

    {
      const C = rondeCare;
      const Ba = C.barre || {};
      const Th = C.theme || {};
      const La = C.langue || {};
      const Fa = C.facettes || {};
      verifier('la barre latérale de CARE se replie et se relève',
        Ba.bouton === true && Ba.apres !== Ba.avant && Ba.rendu === true,
        JSON.stringify(Ba));
      verifier('le thème de CARE se change par ses pastilles, suit sur la racine du document, et se rend',
        Th.points >= 2 && Th.autreOffert === true
        && Th.visePose === true
        && Th.attributApres === Th.apres && Th.attributApres !== Th.attributAvant
        && Th.rendu === true,
        JSON.stringify(Th));
      verifier('la langue de CARE se change, les libellés de la barre suivent, et la ronde la rend',
        La.boutons >= 2 && La.autreOffert === true
        && La.apres !== La.avant && La.libelleChange === true
        && La.rendu === true && La.temoinRendu === true,
        JSON.stringify(La));
      verifier('une facette de CARE retient ce qu’on lui donne, et la ronde la rend',
        Fa.facettes >= 1 && Fa.offre === true
        && Fa.retenu === true && Fa.rendu === true,
        JSON.stringify(Fa));
      verifier('la recherche de CARE traverse le différé du socle, parvient à l’état, et la ronde la rend',
        recherche.trouve === true && recherche.retenu === true
        && recherche.champPorteLaValeur === true
        && recherche.rendu === true,
        JSON.stringify(recherche));
    }


    // ══════════════════════════════════════════════════════════════════
    //  La fiche de qualification : l'instance, et les trois faces d'une
    //  même décision
    // ══════════════════════════════════════════════════════════════════
    //
    // `mes-qualification.js` — **993 lignes, 26 gestes nommés, aucun exercé.**
    // C'est l'étape où l'instance décisionnelle siège sur une carence : elle lit
    // l'investigation, consigne ses réunions, dit si l'infraction est constituée,
    // et arrête le cas échéant les mesures d'application.
    //
    // ── Pourquoi aucun geste n'était atteignable ──
    //
    // L'étape n'existe que sur une carence **parvenue au rang
    // « qualification »** du fil d'avancement : `mesVoirEtape` refuse tout rang
    // supérieur à celui atteint, et `mesQualModifiable` ferme la saisie dès que
    // l'étape est franchie. Or le jeu de référence n'a **aucune constatation** —
    // les collections de CARE sont vides au départ, et les carences des autres
    // modules arrivent par le bus de services, qui n'en sert aucune ici.
    //
    // La ronde construit donc son dossier : elle ouvre une carence, l'instruit,
    // décide d'investiguer, consigne l'investigation et la soumet. Cinq appels
    // d'API — ceux-là même que `mesures.smoke.js` éprouve un à un — qui amènent
    // le fil au bon rang. **Ce n'est pas contourner l'écran : c'est lui donner
    // la pièce qu'il attend.** Tout ce qui suit passe par les gestes de l'écran.
    //
    // ── Les trois règles éprouvées ──
    //
    //  1. **Changer de volet ne perd pas la saisie.** `mesQualVoirVolet` relève
    //     la saisie en cours (`mesMajQualification`) avant de redessiner. Le
    //     volet qui n'est pas affiché n'a aucun champ dans le document : ce
    //     qu'il porte est repris de l'état, non remis à zéro.
    //  2. **Les trois cases disent une même décision par ses trois faces.**
    //     Cocher « constituée » décoche « non constituée » et « renvoi » ; et
    //     chacune commande ce que la fiche montre — le motif de renvoi, les
    //     trois champs de qualification, la section des mesures.
    //  3. **Un ajout relève avant de redessiner.** `mesQualModifier` passe par
    //     `mesMajQualification` : ajouter un membre ne perd pas la réunion qu'on
    //     venait de saisir.
    etape = 'fiche de qualification';
    const DOSSIER = 'Manquement au programme de maintenance (contrôle ' + Date.now() + ')';
    const TEMOIN_ENR = 'relevé au seul enregistrement — ' + Date.now();
    const qual = await page.evaluate(async (titre, TEMOIN_ENREGISTREMENT) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const S = () => window.MES_STATE || {};
      const Q = () => (S().traitement || {}).qualification || {};
      const vu = (sel) => !!document.querySelector(sel);
      const volet = (cle) => [...document.querySelectorAll('[onclick*="mesQualVoirVolet("]')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`'${cle}'`));

      // ── 0. Le dossier que l'écran attend : une carence au rang « qualification »
      await essai('dossier', async () => {
        const d = {};
        // Un comité, pour que la liste de l'instance offre autre chose que « — ».
        await window.mesApi('/parametres/comites', {
          method: 'POST', body: JSON.stringify({ libelle: 'Comité de discipline (contrôle)' }),
        }).catch(() => null);
        const cree = await window.mesApi('/constatations', {
          method: 'POST',
          body: JSON.stringify({
            titre, description: 'Vérification omise sur deux aéronefs',
            origine_libelle: 'Contrôle inopiné', date_ouverture: '2026-09-15',
          }),
        });
        d.cree = !!(cree && cree.id);
        if (!d.cree) return d;
        o.carence = cree.id;
        d.reference = cree.reference;
        const p = (chemin, methode, corps) => window.mesApi(chemin, {
          method: methode, ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        const racine = `/constatations/${encodeURIComponent(cree.id)}`;
        await p(`${racine}/traitement`, 'PUT', { informations: 'Pièces reçues du prestataire' });
        await p(`${racine}/decision`, 'POST', { decision: 'investiguer' });
        await p(`${racine}/investigation`, 'PUT', {
          equipe: [], travaux: [], rapport: 'Faits établis : deux visites omises.',
        });
        const soumise = await p(`${racine}/investigation/soumettre`, 'POST');
        d.etape = (soumise || {}).etape;
        // L'écran relit ses données, et non l'inverse.
        await window.mesLoadData();
        window.mesRenderPage();
        await a(2200);
        return d;
      });

      // ── 1. Ouvrir le dossier par le bouton de la ligne, non par l'état ──
      await essai('ouverture', async () => {
        const d = {};
        document.querySelector('.nav-btn[data-page="critiques"]')?.click();
        await a(2600);
        const bouton = [...document.querySelectorAll('[onclick*="mesMesureDepuisConstatation("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.carence));
        d.bouton = !!bouton;
        if (!bouton) return d;
        d.libelle = (bouton.textContent || '').trim().slice(0, 32);
        bouton.click();
        await a(3200);
        d.etapeAtteinte = (S().traitement || {}).etape;
        // `mesEtapeCourante` n'est **pas** exportée (lu dans la liste de
        // `Object.assign(window, …)` de mes-traitement.js) : mon premier jet
        // l'appelait et relevait une chaîne vide, qu'il prenait pour l'état de
        // l'écran. On relève donc ce que l'écran porte vraiment — l'étape
        // **regardée** reste vide, le fil s'ouvrant sur l'étape atteinte — et
        // c'est `mesQualModifiable()`, elle exportée, qui atteste que l'étape
        // courante est bien la qualification : elle est fausse dès que le rang
        // atteint diffère.
        d.etapeVue = (S().etapeVue || '');
        d.modifiable = window.mesQualModifiable ? window.mesQualModifiable() : null;
        // Les sections de l'étape : la carence, le rapport, l'instance, la
        // qualification.
        d.instance = vu('#mesQualComite');
        d.membres = vu('#mesQualMembres');
        d.reunions = vu('#mesQualReunions');
        d.cases = ['mesQualConstituee', 'mesQualNonConstituee', 'mesQualRenvoi']
          .filter((id) => !!document.getElementById(id)).length;
        // Le volet « recours » ne s'offre pas : aucune mesure n'est contestée.
        d.volets = document.querySelectorAll('[onclick*="mesQualVoirVolet("]').length;
        d.recoursAbsent = !volet('recours');
        return d;
      });

      // ── 2. Les trois faces d'une même décision ──
      await essai('faces', async () => {
        const d = {};
        const etat = () => ({
          constituee: !!Q().infraction_constituee,
          non: !!Q().infraction_non_constituee,
          renvoi: !!Q().renvoi_demande,
        });
        d.depart = etat();
        // « Non constituée » : les mesures n'ont plus d'objet.
        document.getElementById('mesQualNonConstituee')?.click();
        await a(2200);
        d.apresNon = etat();
        // « Renvoi » : le motif paraît, et les deux autres tombent.
        document.getElementById('mesQualRenvoi')?.click();
        await a(2200);
        d.apresRenvoi = etat();
        d.motifParu = vu('#mesQualRenvoiMotif');
        // « Constituée » : les trois champs de qualification paraissent.
        document.getElementById('mesQualConstituee')?.click();
        await a(2200);
        d.apresConstituee = etat();
        d.motifParti = !vu('#mesQualRenvoiMotif');
        d.champsParus = ['mesQualNature', 'mesQualCaracterisation', 'mesQualCirconstances']
          .filter((id) => !!document.getElementById(id)).length;
        // Et la section des mesures s'ouvre — elle disait n'avoir pas d'objet.
        volet('mesures')?.click();
        await a(2400);
        d.mesuresOuvertes = vu('[onclick*="mesQualAjouterMesure"]');
        volet('infraction')?.click();
        await a(2400);
        d.revenu = vu('#mesQualComite');
        return d;
      });

      // ── 3. Membres, réunions, et ce qu'un changement de volet ne perd pas ──
      await essai('saisie', async () => {
        const d = {};
        const lignes = () => document.querySelectorAll('#mesQualMembres tbody tr[data-rang]').length;
        const blocs = () => document.querySelectorAll('#mesQualReunions .mes-bloc').length;
        d.membresAvant = lignes();
        document.querySelector('[onclick*="mesQualAjouterMembre"]')?.click();
        await a(2200);
        d.membresApres = lignes();
        const ligne = document.querySelector('#mesQualMembres tbody tr[data-rang]');
        const champ = (racine, nom) => racine?.querySelector(`[data-champ="${nom}"]`);
        if (ligne) {
          champ(ligne, 'nom').value = 'DIALLO';
          champ(ligne, 'prenom').value = 'Aïssata';
          champ(ligne, 'email').value = 'a.diallo@anac.bj';
        }
        // Une réunion, saisie **après** le membre : l'ajout doit relever ce qui
        // précède, sans quoi le nom du membre serait perdu.
        d.reunionsAvant = blocs();
        document.querySelector('[onclick*="mesQualAjouterReunion"]')?.click();
        await a(2200);
        d.reunionsApres = blocs();
        d.membreTenu = (champ(document.querySelector('#mesQualMembres tbody tr[data-rang]'), 'nom') || {}).value;
        const bloc = document.querySelector('#mesQualReunions .mes-bloc');
        if (bloc) {
          champ(bloc, 'date').value = '2026-10-12';
          champ(bloc, 'objet').value = 'Première séance';
          champ(bloc, 'resultat').value = 'Infraction retenue à l’unanimité.';
        }
        // Les trois champs de la qualification.
        const poser = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
        poser('mesQualNature', 'Manquement grave au programme de maintenance');
        poser('mesQualCaracterisation', 'Récidive sur deux aéronefs');
        poser('mesQualCirconstances', 'Absence de personnel qualifié');
        // Le comité : la liste en offre un depuis la préparation.
        const comite = document.getElementById('mesQualComite');
        const choix = comite ? [...comite.options].find((op) => op.value) : null;
        d.comiteOffert = !!choix;
        if (choix) { comite.value = choix.value; }
        // Le passage au volet des mesures, et le retour : rien ne se perd.
        volet('mesures')?.click();
        await a(2400);
        d.partiPourMesures = !vu('#mesQualComite');
        volet('infraction')?.click();
        await a(2400);
        const l2 = document.querySelector('#mesQualMembres tbody tr[data-rang]');
        const b2 = document.querySelector('#mesQualReunions .mes-bloc');
        d.rendu = {
          membre: (champ(l2, 'nom') || {}).value,
          courriel: (champ(l2, 'email') || {}).value,
          reunion: (champ(b2, 'objet') || {}).value,
          nature: (document.getElementById('mesQualNature') || {}).value,
          comite: (document.getElementById('mesQualComite') || {}).value,
        };
        return d;
      });

      // ── 4. L'enregistrement, relu sur le serveur ──
      //
      // `mesEnregistrerQualification` ne recharge **rien** : il remet la
      // qualification et rend la main. Pour savoir ce que le serveur a gardé, on
      // le lui redemande — lire l'état du module ne dirait que ce que la page
      // croit tenir.
      await essai('enregistrement', async () => {
        const d = {};
        const bouton = document.querySelector('[onclick*="mesEnregistrerQualification"]');
        d.bouton = !!bouton;
        if (!bouton) return d;
        // ── Une règle tenue deux fois ne se contre-essaie pas une fois ──
        //
        // `mesEnregistrerQualification` relève la saisie avant d'envoyer — et
        // `mesQualVoirVolet` l'a déjà relevée au retour du volet précédent. Mon
        // premier contre-essai, qui retirait la relève de l'enregistrement, n'a
        // donc **rien** fait tomber : le second chemin suffisait. La leçon de
        // PR (n° 5.f.52), à nouveau.
        //
        // Le contrôle pose donc un témoin **après** le dernier changement de
        // volet : seule la relève de l'enregistrement peut le porter au serveur.
        const circonstances = document.getElementById('mesQualCirconstances');
        d.champTemoin = !!circonstances;
        if (circonstances) circonstances.value = TEMOIN_ENREGISTREMENT;
        bouton.click();
        await a(3000);
        const relu = await window.mesApi(`/constatations/${encodeURIComponent(o.carence)}/traitement`);
        const q = (relu || {}).qualification || {};
        d.etape = (relu || {}).etape;
        d.constituee = !!q.infraction_constituee;
        d.non = !!q.infraction_non_constituee;
        d.renvoi = !!q.renvoi_demande;
        d.membres = (q.membres || []).length;
        d.premierMembre = ((q.membres || [])[0] || {}).nom;
        d.courriel = ((q.membres || [])[0] || {}).email;
        d.reunions = (q.reunions || []).length;
        d.premiereReunion = ((q.reunions || [])[0] || {}).objet;
        d.resultatReunion = !!((q.reunions || [])[0] || {}).resultat;
        d.nature = q.nature;
        d.caracterisation = !!q.caracterisation;
        d.circonstances = q.circonstances === TEMOIN_ENREGISTREMENT;
        d.comite = q.comite_code;
        return d;
      });
      return o;
    }, DOSSIER, TEMOIN_ENR);

    {
      const Do = qual.dossier || {};
      const Ou = qual.ouverture || {};
      const Fa = qual.faces || {};
      const Sa = qual.saisie || {};
      const En = qual.enregistrement || {};
      verifier('une carence ouverte par l’API parvient au rang « qualification », et son bouton de ligne ouvre l’étape',
        Do.cree === true && /^CST-\d+$/.test(Do.reference || '')
        && Do.etape === 'qualification'
        && Ou.bouton === true && Ou.etapeAtteinte === 'qualification'
        && Ou.etapeVue === '' && Ou.modifiable === true
        && Ou.instance === true && Ou.membres === true && Ou.reunions === true
        && Ou.cases === 3
        // Deux volets, et non trois : « Recours » ne s'offre qu'avec une mesure
        // contestée — un onglet vide inviterait à un travail qui n'existe pas.
        && Ou.volets === 2 && Ou.recoursAbsent === true,
        JSON.stringify({ ...Do, ...Ou }).slice(0, 420));
      verifier('les trois cases de la qualification s’excluent, et chacune commande ce que la fiche montre',
        // Au départ, aucune n'est cochée : la qualification n'est pas arrêtée.
        Fa.depart.constituee === false && Fa.depart.non === false && Fa.depart.renvoi === false
        // « Non constituée » seule.
        && Fa.apresNon.non === true && Fa.apresNon.constituee === false
        // « Renvoi » décoche la précédente, et fait paraître son motif.
        && Fa.apresRenvoi.renvoi === true && Fa.apresRenvoi.non === false
        && Fa.motifParu === true
        // « Constituée » décoche les deux autres, retire le motif, ouvre les
        // trois champs et la section des mesures.
        && Fa.apresConstituee.constituee === true
        && Fa.apresConstituee.non === false && Fa.apresConstituee.renvoi === false
        && Fa.motifParti === true && Fa.champsParus === 3
        && Fa.mesuresOuvertes === true && Fa.revenu === true,
        JSON.stringify(Fa).slice(0, 460));
      verifier('un membre et une réunion s’ajoutent sans perdre ce qui précède, et le volet des mesures ne perd rien au retour',
        Sa.membresApres === Sa.membresAvant + 1
        && Sa.reunionsApres === Sa.reunionsAvant + 1
        // L'ajout de la réunion a relevé le membre déjà saisi.
        && Sa.membreTenu === 'DIALLO'
        && Sa.comiteOffert === true
        // Le volet a bien été quitté : sans cela on relirait le même DOM.
        && Sa.partiPourMesures === true
        && Sa.rendu.membre === 'DIALLO' && Sa.rendu.courriel === 'a.diallo@anac.bj'
        && Sa.rendu.reunion === 'Première séance'
        && /^Manquement grave/.test(Sa.rendu.nature || '')
        && !!Sa.rendu.comite,
        JSON.stringify(Sa).slice(0, 460));
      verifier('l’enregistrement rend au serveur l’instance, les réunions et la qualification de l’infraction',
        En.bouton === true && En.etape === 'qualification'
        && En.constituee === true && En.non === false && En.renvoi === false
        && En.membres === 1 && En.premierMembre === 'DIALLO'
        && En.courriel === 'a.diallo@anac.bj'
        && En.reunions === 1 && En.premiereReunion === 'Première séance'
        && En.resultatReunion === true
        && /^Manquement grave/.test(En.nature || '')
        && En.caracterisation === true
        // Le témoin posé après le dernier changement de volet : seule la relève
        // de l’enregistrement peut l’avoir porté au serveur.
        && En.champTemoin === true && En.circonstances === true
        && !!En.comite,
        JSON.stringify(En).slice(0, 460));
    }


    // ══════════════════════════════════════════════════════════════════
    //  Les mesures arrêtées : la portée, la durée et le terme
    // ══════════════════════════════════════════════════════════════════
    //
    // Le second volet de l'étape, celui où la sanction se rédige. Il prolonge la
    // ronde précédente : l'infraction y est constituée et enregistrée, ce qui
    // est la condition pour que la section s'ouvre — sans infraction, elle dit
    // qu'elle n'a pas d'objet, et c'est ce que le contrôle précédent a éprouvé.
    //
    // ── Les quatre règles éprouvées ──
    //
    //  1. **Le suivi est attendu par défaut.** `mesQualAjouterMesure` pose
    //     `suivi_requis: true` : c'est en le **décochant** que l'instance
    //     déclare qu'une mesure n'appelle pas de suivi de mise en œuvre, non en
    //     omettant de le cocher.
    //  2. **Changer de catégorie vide le type.** Les types sont propres à leur
    //     catégorie : garder l'ancien laisserait une sanction pénale de type
    //     « lettre de correction ».
    //  3. **Durée et terme se déduisent l'un de l'autre**, la date de sanction
    //     servant d'ancre — en jours comme en mois, et sans déborder sur le mois
    //     suivant. Un terme antérieur à la sanction laisse la durée vide et
    //     marque les deux champs : une sanction ne se lève pas avant d'être
    //     prononcée (règle commune du socle, `oasisDatesValider`).
    //  4. **La case « suivi requis » commande le bouton « Clôturer ».** Une
    //     seule mesure qui demande le suivi, et le dossier doit passer par
    //     l'étape de suivi : la clôture directe reste éteinte. C'est l'effet
    //     visible de la bascule, et c'est par lui qu'on la mesure.
    etape = 'mesures arrêtées';
    const mesuresArretees = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const S = () => window.MES_STATE || {};
      const Q = () => (S().traitement || {}).qualification || {};
      const volet = (cle) => [...document.querySelectorAll('[onclick*="mesQualVoirVolet("]')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`'${cle}'`));
      // ── Tout se requête à nouveau après chaque geste ──
      //
      // `mesQualModifier` redessine le volet entier : la portée cochée, la
      // catégorie changée, le retrait d'une mesure. Une référence gardée d'avant
      // désigne un élément détaché du document — elle se lit encore, et ne dit
      // plus rien de l'écran. On ne garde donc aucune poignée.
      const bloc = (i) => document.querySelectorAll('#mesQualMesures .mes-bloc')[i || 0];
      const champ = (nom, i) => (bloc(i) || document).querySelector(`[data-champ="${nom}"]`);
      const lire = (nom, i) => (champ(nom, i) || {}).value;
      const coche = (nom, i) => !!(champ(nom, i) || {}).checked;
      const poser = async (nom, valeur, evenement, attente) => {
        const e = champ(nom);
        if (!e) return false;
        e.value = valeur;
        e.dispatchEvent(new Event(evenement || 'change', { bubbles: true }));
        await a(attente || 1500);
        return true;
      };
      const portee = async (cle) => {
        const e = champ(cle);
        if (!e) return false;
        e.click();
        await a(2200);
        return true;
      };
      const cloturer = () => [...document.querySelectorAll('[onclick*="mesQualCloturer"]')][0];

      // ── 1. Une mesure s'ajoute, et changer sa catégorie vide son type ──
      await essai('ajout', async () => {
        const d = {};
        volet('mesures')?.click();
        await a(2600);
        d.sectionOuverte = !!document.querySelector('[onclick*="mesQualAjouterMesure"]');
        d.avant = document.querySelectorAll('#mesQualMesures .mes-bloc').length;
        document.querySelector('[onclick*="mesQualAjouterMesure"]')?.click();
        await a(2600);
        d.apres = document.querySelectorAll('#mesQualMesures .mes-bloc').length;
        // Les valeurs d'origine : une catégorie posée, le suivi attendu.
        d.categorieDefaut = lire('categorie');
        d.suiviDefaut = coche('suivi_requis');
        d.porteeDefaut = (Q().mesures || [])[0] ? (Q().mesures || [])[0].portee : null;
        // Un type de la catégorie posée.
        const types = champ('type_mesure');
        const premier = types ? [...types.options].find((op) => op.value) : null;
        d.typeOffert = !!premier;
        if (premier) { types.value = premier.value; }
        d.typePose = lire('type_mesure');
        // Une autre catégorie : le type doit tomber, et la liste changer.
        const cats = champ('categorie');
        const autre = cats ? [...cats.options]
          .find((op) => op.value && op.value !== d.categorieDefaut) : null;
        d.autreCategorie = autre ? autre.value : '';
        d.typesAvant = types ? types.options.length : 0;
        if (autre) await poser('categorie', autre.value, 'change', 2400);
        d.categorieApres = lire('categorie');
        d.typeApres = lire('type_mesure');
        d.typesApres = (champ('type_mesure') || { options: [] }).options.length;
        // ── Ce que le document ne peut pas prouver, l'état le prouve ──
        //
        // Le `<select>` du type est reconstruit avec les types de la nouvelle
        // catégorie : l'ancienne valeur n'y figurant pas, il retombe sur
        // l'option vide **tout seul**. Mon premier contre-essai, qui retirait
        // `type_mesure = ''` de `mesQualCategorieMesure`, n'a donc rien fait
        // tomber — la règle est tenue deux fois, et le document n'en montre
        // qu'une. C'est dans **l'état** que la seconde se lit : la relève a
        // recueilli l'ancien type avant le redessin, et seule la remise à vide
        // l'en ôte.
        d.typeDansEtat = ((Q().mesures || [])[0] || {}).type_mesure;
        // On repose un type de la nouvelle catégorie, pour la suite.
        const t2 = champ('type_mesure');
        const p2 = t2 ? [...t2.options].find((op) => op.value) : null;
        if (p2) { t2.value = p2.value; }
        d.typeRepose = lire('type_mesure');
        return d;
      });

      // ── 2. Les trois portées s'excluent ; « limitée dans le temps » ouvre la
      //      durée et le terme ──
      await essai('portee', async () => {
        const d = {};
        d.cases = ['temporelle', 'illimitee', 'sans_objet']
          .filter((c) => !!champ(c)).length;
        d.dureeAvant = !!champ('duree_valeur');
        await portee('temporelle');
        d.apresTemporelle = ((Q().mesures || [])[0] || {}).portee;
        d.dureeParue = !!champ('duree_valeur');
        d.termeParu = !!champ('date_fin');
        await portee('illimitee');
        d.apresIllimitee = ((Q().mesures || [])[0] || {}).portee;
        d.dureePartie = !champ('duree_valeur');
        d.temporelleDecochee = !coche('temporelle');
        // Décocher celle qui l'était laisse la portée indéterminée.
        await portee('illimitee');
        d.apresDecoche = ((Q().mesures || [])[0] || {}).portee;
        await portee('temporelle');
        d.rendu = ((Q().mesures || [])[0] || {}).portee;
        return d;
      });

      // ── 3. La durée et le terme, chacun déduit de l'autre ──
      await essai('duree', async () => {
        const d = {};
        d.ancre = await poser('date_sanction', '2026-10-01', 'change', 1800);
        // Trente jours depuis le 1er octobre : le 31.
        await poser('duree_valeur', '30', 'input', 1600);
        d.termeJours = lire('date_fin');
        // Trois mois depuis le 1er octobre : le 1er janvier. Le changement
        // d'unité rappelle le même calcul.
        await poser('duree_unite', 'mois', 'change', 1600);
        await poser('duree_valeur', '3', 'input', 1600);
        d.termeMois = lire('date_fin');
        // Le terme posé à la main : la durée s'en déduit, dans l'unité retenue.
        await poser('date_fin', '2026-12-01', 'change', 1600);
        d.dureeEnMois = lire('duree_valeur');
        await poser('duree_unite', 'jours', 'change', 1600);
        await poser('date_fin', '2026-12-01', 'change', 1600);
        d.dureeEnJours = lire('duree_valeur');
        // ── Une sanction ne se lève pas avant d'être prononcée ──
        await poser('date_fin', '2026-09-01', 'change', 1800);
        d.dureeVidee = lire('duree_valeur');
        d.champsMarques = ['date_sanction', 'date_fin']
          .filter((c) => (champ(c) || { classList: { contains: () => false } })
            .classList.contains('oasis-champ-invalide')).length;
        // On repose un terme recevable pour la suite.
        await poser('date_fin', '2026-12-01', 'change', 1800);
        d.termeRendu = lire('date_fin');
        d.dureeRendue = lire('duree_valeur');
        return d;
      });

      // ── 4. La case « suivi requis », le bouton « Clôturer », et le serveur ──
      await essai('suivi', async () => {
        const d = {};
        const bouton = cloturer();
        d.bouton = !!bouton;
        d.suiviCoche = coche('suivi_requis');
        d.cloturerEteint = bouton ? !!bouton.disabled : null;
        // On décoche : plus aucune mesure n'appelle le suivi, la clôture directe
        // s'offre.
        champ('suivi_requis')?.click();
        await a(2600);
        d.suiviApres = coche('suivi_requis');
        d.etatApres = ((Q().mesures || [])[0] || {}).suivi_requis;
        d.cloturerArme = cloturer() ? !cloturer().disabled : null;
        // Enregistré, puis relu sur le serveur.
        const enregistrer = document.querySelector('[onclick*="mesEnregistrerQualification"]');
        d.enregistrer = !!enregistrer;
        enregistrer?.click();
        await a(3000);
        const relu = await window.mesApi(`/constatations/${encodeURIComponent((S().carenceEnCours || {}).id)}/traitement`);
        const m = (((relu || {}).qualification || {}).mesures || [])[0] || {};
        d.auServeur = {
          nombre: (((relu || {}).qualification || {}).mesures || []).length,
          categorie: m.categorie, type: m.type_mesure, portee: m.portee,
          sanction: m.date_sanction, fin: m.date_fin,
          duree: m.duree_valeur, unite: m.duree_unite, suivi: m.suivi_requis,
        };
        // Et le retrait, qui ôte le bloc.
        document.querySelector('[onclick*="mesQualRetirerMesure"]')?.click();
        await a(2600);
        d.blocsApresRetrait = document.querySelectorAll('#mesQualMesures .mes-bloc').length;
        d.etatApresRetrait = (Q().mesures || []).length;
        // ── La symétrie des ajouts : ce qui s'ajoute se retire ──
        //
        // Le membre et la réunion vivent au volet « Qualification de
        // l'infraction » : leurs boutons de retrait n'existent pas ici. On y
        // revient plutôt que de les chercher là où ils ne sont pas.
        volet('infraction')?.click();
        await a(2600);
        document.querySelector('[onclick*="mesQualRetirerMembre"]')?.click();
        await a(2400);
        d.membresApresRetrait = document.querySelectorAll('#mesQualMembres tbody tr[data-rang]').length;
        document.querySelector('[onclick*="mesQualRetirerReunion"]')?.click();
        await a(2400);
        d.reunionsApresRetrait = document.querySelectorAll('#mesQualReunions .mes-bloc').length;
        d.etatMembres = (Q().membres || []).length;
        d.etatReunions = (Q().reunions || []).length;
        return d;
      });
      return o;
    });

    {
      const Aj = mesuresArretees.ajout || {};
      const Po = mesuresArretees.portee || {};
      const Du = mesuresArretees.duree || {};
      const Su = mesuresArretees.suivi || {};
      verifier('une mesure s’ajoute avec le suivi attendu, et changer sa catégorie vide son type',
        Aj.sectionOuverte === true && Aj.apres === Aj.avant + 1
        && !!Aj.categorieDefaut
        // Le suivi est attendu par défaut : c'est en le décochant qu'on le lève.
        && Aj.suiviDefaut === true
        // La portée, elle, part indéterminée : rien n'est supposé de la sanction.
        && Aj.porteeDefaut === ''
        && Aj.typeOffert === true && !!Aj.typePose
        // La catégorie change, le type tombe, et la liste n'est plus la même.
        && !!Aj.autreCategorie && Aj.categorieApres === Aj.autreCategorie
        && Aj.typeApres === '' && Aj.typesApres !== Aj.typesAvant
        && Aj.typeDansEtat === ''
        && !!Aj.typeRepose,
        JSON.stringify(Aj).slice(0, 420));
      verifier('les trois portées d’une mesure s’excluent, et « limitée dans le temps » seule ouvre la durée et le terme',
        Po.cases === 3
        // Avant tout choix, ni durée ni terme.
        && Po.dureeAvant === false
        && Po.apresTemporelle === 'temporelle'
        && Po.dureeParue === true && Po.termeParu === true
        // Une autre portée décoche la première, et referme les deux champs.
        && Po.apresIllimitee === 'illimitee'
        && Po.dureePartie === true && Po.temporelleDecochee === true
        // Décocher celle qui l'était laisse la portée indéterminée.
        && Po.apresDecoche === ''
        && Po.rendu === 'temporelle',
        JSON.stringify(Po));
      verifier('durée et terme se déduisent l’un de l’autre, en jours comme en mois, et un terme antérieur à la sanction laisse la durée vide',
        Du.ancre === true
        // Trente jours depuis le 1er octobre.
        && Du.termeJours === '2026-10-31'
        // Trois mois : le 1er janvier, sans déborder sur le mois suivant.
        && Du.termeMois === '2027-01-01'
        // Le terme posé à la main rend la durée, dans l'unité retenue.
        && Du.dureeEnMois === '2' && Du.dureeEnJours === '61'
        // Un terme antérieur à la sanction : la durée reste vide, et les deux
        // champs sont marqués par la règle commune du socle.
        && Du.dureeVidee === '' && Du.champsMarques === 2
        && Du.termeRendu === '2026-12-01' && Du.dureeRendue === '61',
        JSON.stringify(Du));
      verifier('la case « suivi requis » commande le bouton « Clôturer », et l’enregistrement rend la mesure au serveur',
        Su.bouton === true
        // Tant qu'une mesure appelle le suivi, la clôture directe reste éteinte.
        && Su.suiviCoche === true && Su.cloturerEteint === true
        && Su.suiviApres === false && Su.etatApres === false
        && Su.cloturerArme === true
        // Ce que le serveur a gardé.
        && Su.enregistrer === true && Su.auServeur.nombre === 1
        && !!Su.auServeur.categorie && !!Su.auServeur.type
        && Su.auServeur.portee === 'temporelle'
        && Su.auServeur.sanction === '2026-10-01' && Su.auServeur.fin === '2026-12-01'
        && Su.auServeur.duree === 61 && Su.auServeur.unite === 'jours'
        && Su.auServeur.suivi === false
        // Et le retrait ôte le bloc, dans le document comme dans l'état.
        && Su.blocsApresRetrait === 0 && Su.etatApresRetrait === 0
        // Ce qui s’ajoute se retire : le membre et la réunion de la ronde
        // précédente partent par leur propre geste.
        && Su.membresApresRetrait === 0 && Su.reunionsApresRetrait === 0
        && Su.etatMembres === 0 && Su.etatReunions === 0,
        JSON.stringify(Su).slice(0, 460));
    }

    verifier('aucune erreur de console ni requête échouée sur CARE',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
  } finally {
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = { enLigne: [], ecouteurs: [], propriete: [], jsx: [], barre: [], poses: 0, pages: 0 };
      for (const p of await navigateur.pages()) {
        try {
          /* eslint-disable no-await-in-loop */
          const j = await p.evaluate(() => {
            const d = JSON.parse(localStorage.getItem('__oasis_gestes') || 'null');
            return { durable: d, vivante: !!window.__gestes, poses: window.__gestes ? window.__gestes.poses : 0 };
          });
          if (j.vivante) { vu.pages += 1; vu.poses += j.poses; }
          if (j.durable && !vu.enLigne.length && !vu.jsx.length) {
            vu.enLigne.push(...j.durable.enLigne);
            vu.ecouteurs.push(...j.durable.ecouteurs);
            vu.propriete.push(...(j.durable.propriete || []));
            vu.jsx.push(...(j.durable.jsx || []));
            // Les actions remises au socle : quatrième canal du
            // mouchard (ADR-003, 5.f.43).
            vu.barre.push(...(j.durable.barre || []));
          }
        } catch { /* page déjà partie */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('CARE (navigateur)');
};
