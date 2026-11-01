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
