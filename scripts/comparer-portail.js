#!/usr/bin/env node
// OASIS — Équivalence du portail converti (ADR-003, 5.c).
//
// Équivalence de `/js/{i18n,icons}.js` (ancien) et `/app/{i18n,icons}.js` (converti),
// mesurée dans un navigateur sur toute la surface : chaque clé dans chaque langue,
// chaque icône à deux tailles, les effets sur le DOM, et les palettes.
//
// Un contexte isolé par version : le même `window` chargerait les deux et le
// second écraserait le premier — on comparerait le nouveau avec lui-même.
const path = require('path'); const fs = require('fs');
const R = path.join(__dirname, '..');
process.chdir(R);
if (!fs.existsSync('public/js/i18n.js')) {
  console.error('ancien fichier absent : la comparaison ne mesurerait rien'); process.exit(2);
}
const { demarrer } = require(path.join(R, 'tests', 'smoke', 'harness.js'));
const puppeteer = require(path.join(R, 'node_modules', 'puppeteer'));

const LANGUES = ['fr', 'en', 'pt', 'de', ''];
const PAGE = '<!doctype html><html lang="fr"><body>'
  + '<span data-i18n="nav_home"></span><input data-i18n-placeholder="rechercher_module">'
  + '<b data-i18n-title="nav_home"></b>'
  + '<button class="lang-btn">FR</button><button class="lang-btn">EN</button><button class="lang-btn">PT</button>'
  + '<div class="theme-dot" data-theme="corporate"></div></body></html>';

const CORPS = (langues) => {
  const out = { traductions: {}, dom: {}, icones: {}, modules: {}, palettes: {} };
  // ── L'état AU CHARGEMENT, avant tout `applyLang` ──
  //
  // C'est le cas normal : une page qui s'ouvre et que personne ne bascule.
  // `app.js` lit `CURRENT_LANG` nu dès son premier rendu — s'il n'est pas posé, la
  // lecture lève `ReferenceError` et l'écran s'arrête net.
  //
  // Ma première comparaison ne le relevait pas : elle appelait `applyLang` avant
  // de lire, ce qui reposait le nom. Retirer la pose au chargement laissait donc
  // « aucun écart » sur un portail qui ne s'ouvrirait plus. C'est le défaut le
  // plus grave que cette comparaison pouvait manquer, et elle le manquait.
  out.chargement = {
    surWindow: window.CURRENT_LANG,
    // eslint-disable-next-line no-eval
    nu: (() => { try { return eval('CURRENT_LANG'); } catch (e) { return `ERREUR: ${e.name}`; } })(),
    lang: document.documentElement.lang,
    theme: document.documentElement.getAttribute('data-theme'),
  };
  const cles = window.__CLES;
  for (const lg of langues) {
    window.applyLang(lg);
    const par = {};
    for (const k of cles) par[k] = window.t(k);
    par.__absente__ = window.t('__cle_qui_n_existe_pas__');
    par.__trou1__ = window.t('nav_home', 'X');
    out.traductions[lg] = par;
    out.dom[lg] = {
      lang: document.documentElement.lang,
      texte: document.querySelector('[data-i18n]').textContent,
      placeholder: document.querySelector('[data-i18n-placeholder]').placeholder,
      title: document.querySelector('[data-i18n-title]').title,
      actifs: [...document.querySelectorAll('.lang-btn')].map((b) => b.classList.contains('active')),
      retenu: localStorage.getItem('pr_lang'),
      // ── `CURRENT_LANG`, des DEUX façons dont il est lu ──
      //
      // C'est le nom le plus risqué de la conversion : il était un `let` au
      // premier niveau d'un script, donc une globale **lexicale**, absente de
      // `window`, et deux fichiers du portail le lisent en identifiant nu. Un
      // module ne peut pas créer de globale lexicale ; le sas le pose donc sur
      // `window`, où une lecture nue le retrouve.
      //
      // Ma première comparaison ne le relevait pas du tout : retirer la ligne qui
      // le tient à jour laissait « aucun écart ». Un vert sur le seul point qui
      // méritait d'être mesuré.
      surWindow: window.CURRENT_LANG,
      // eslint-disable-next-line no-eval
      nu: (() => { try { return eval('CURRENT_LANG'); } catch (e) { return `ERREUR: ${e.name}`; } })(),
    };
  }
  for (const n of [...window.__ICONES, '__inconnue__']) out.icones[n] = [window.icon(n), window.icon(n, 32)];
  for (const c of ['PLAN', 'SURV', 'CARE', 'RAMP', 'REG', 'DOC', 'CERT', 'RISK', 'FORM', 'COM', 'PAY', '__XX__']) {
    out.modules[c] = window.moduleIcon(c, 20);
  }
  out.enveloppe = window._icon('<line x1="1" y1="2" x2="3" y2="4"/>', 24);
  for (const p of ['blue-dark', 'corporate', 'retro-avionics', 'grey', 'inconnu']) {
    window.applyTheme(p);
    out.palettes[p] = {
      attribut: document.documentElement.getAttribute('data-theme'),
      pastille: document.querySelector('.theme-dot').classList.contains('active'),
      retenu: localStorage.getItem('pr_theme'),
    };
  }
  return out;
};

(async () => {
  const srv = await demarrer({ port: 4796 });
  const nav = await puppeteer.launch({ args: ['--no-sandbox'] });
  const ouvrir = async () => {
    const ctx = await nav.createBrowserContext();
    const page = await ctx.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (r.url().endsWith('/__vide')) r.respond({ contentType: 'text/html', body: PAGE });
      else r.continue();
    });
    return { ctx, page };
  };

  // Les listes de clés et d'icônes, relevées de l'ANCIEN fichier : c'est lui la
  // référence. Les relever du nouveau rendrait la comparaison circulaire — elle
  // ne verrait jamais une clé perdue.
  const { ctx: c0, page: p0 } = await ouvrir();
  await p0.goto(`${srv.base}/__vide`, { waitUntil: 'domcontentloaded' });
  await p0.addScriptTag({ url: `${srv.base}/shared/app/oasis-theme.js` });
  await p0.addScriptTag({ url: `${srv.base}/js/icons.js` });
  await p0.addScriptTag({ url: `${srv.base}/js/i18n.js` });
  const listes = await p0.evaluate(() => ({ cles: Object.keys(I18N.fr), icones: Object.keys(ICONS) }));
  await c0.close();
  console.log(`${listes.cles.length} clés × ${LANGUES.length} langues, ${listes.icones.length} icônes`);

  const relever = async (prefixe) => {
    const { ctx, page } = await ouvrir();
    await page.evaluateOnNewDocument((c, i) => { window.__CLES = c; window.__ICONES = i; },
      listes.cles, listes.icones);
    await page.goto(`${srv.base}/__vide`, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ url: `${srv.base}/shared/app/oasis-theme.js` });
    await page.addScriptTag({ url: `${srv.base}${prefixe}/icons.js` });
    await page.addScriptTag({ url: `${srv.base}${prefixe}/i18n.js` });
    const r = await page.evaluate(CORPS, LANGUES);
    await ctx.close();
    return r;
  };

  let ancien; let neuf;
  try {
    ancien = await relever('/js');
    neuf = await relever('/app');
  } finally { await nav.close(); await srv.arreter(); }

  const ecarts = []; let n = 0;
  const cmp = (quoi, a, b) => {
    n += 1;
    if (JSON.stringify(a) !== JSON.stringify(b)) ecarts.push(`${quoi} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
  };
  // L'état au chargement : identique **sauf** `surWindow`, l'ajout déclaré. La
  // lecture nue, elle, doit être la même des deux côtés — c'est elle que deux
  // fichiers du portail emploient.
  cmp('au chargement : lecture nue de CURRENT_LANG', ancien.chargement.nu, neuf.chargement.nu);
  cmp('au chargement : attribut lang', ancien.chargement.lang, neuf.chargement.lang);
  cmp('au chargement : palette appliquée', ancien.chargement.theme, neuf.chargement.theme);
  cmp('au chargement : window.CURRENT_LANG absent de l’ancien', ancien.chargement.surWindow, undefined);
  cmp('au chargement : window.CURRENT_LANG posé par le converti',
    neuf.chargement.surWindow, neuf.chargement.nu);

  for (const lg of LANGUES) {
    const A = ancien.traductions[lg]; const B = neuf.traductions[lg];
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) cmp(`t(${k}) · ${lg || '«»'}`, A[k], B[k]);
    // ── La seule différence attendue, et elle doit SE PRODUIRE ──
    //
    // La conversion **ajoute** `window.CURRENT_LANG`. Elle n'a pas le choix : un
    // module ne peut pas créer de globale lexicale, et deux fichiers du portail
    // lisent ce nom nu. Le sas le pose donc sur `window`.
    //
    // La différence est donc déclarée ici, et le contrôle exige qu'elle ait lieu —
    // une différence déclarée qui ne se produit pas est le signe que la mesure
    // regarde ailleurs. C'est la règle de `scripts/comparer-socle.js`.
    //
    // Ce que l'ajout change pour les lecteurs du socle, et qui est à dire :
    // `dates.ts` et `toast.ts` lisaient `window.CURRENT_LANG || localStorage`. Ils
    // trouvaient `undefined` et retombaient sur le stockage ; ils trouveront
    // désormais la valeur. Même langue dans tous les cas **sauf un** : en
    // navigation privée, l'écriture du stockage est avalée, et le socle rendait
    // alors la langue d'AVANT la bascule. Il rendra la bonne. C'est un
    // changement, et il est meilleur.
    const sansAjout = (d) => { const { surWindow, ...reste } = d; void surWindow; return reste; };
    cmp(`DOM après applyLang(${lg || '«»'})`, sansAjout(ancien.dom[lg]), sansAjout(neuf.dom[lg]));
    cmp(`window.CURRENT_LANG absent de l'ancien · ${lg || '«»'}`, ancien.dom[lg].surWindow, undefined);
    cmp(`window.CURRENT_LANG posé par le converti · ${lg || '«»'}`,
      neuf.dom[lg].surWindow, neuf.dom[lg].nu);
  }
  for (const k of new Set([...Object.keys(ancien.icones), ...Object.keys(neuf.icones)])) cmp(`icon(${k})`, ancien.icones[k], neuf.icones[k]);
  for (const k of Object.keys(ancien.modules)) cmp(`moduleIcon(${k})`, ancien.modules[k], neuf.modules[k]);
  cmp('_icon', ancien.enveloppe, neuf.enveloppe);
  for (const k of Object.keys(ancien.palettes)) cmp(`applyTheme(${k})`, ancien.palettes[k], neuf.palettes[k]);

  console.log(`${n} comparaisons`);
  if (ecarts.length) {
    console.log(`✗ ${ecarts.length} écart(s)`);
    ecarts.slice(0, 12).forEach((e) => console.log('   ', e));
    process.exit(1);
  }
  console.log('✓ aucun écart');
})().catch((e) => { console.error(e); process.exit(1); });
