#!/usr/bin/env node
// OASIS — Comparer un fichier du socle avant et après sa conversion (ADR-003, 5.b).
//
//   node scripts/comparer-socle.js oasis-utils
//
// Rend 0 si les deux fichiers se comportent à l'identique sur toutes les sondes,
// 1 sinon, en nommant celles qui diffèrent.
//
// ── Pourquoi un outil, et pas un contrôle de la campagne ──
//
// La comparaison n'est possible **qu'avant** la bascule : après, l'ancien
// fichier n'existe plus. C'est donc un outil de migration, employé une fois par
// fichier — mais neuf fois encore, et il porte le relevé de ce qui a été prouvé
// pour chacun. Les sondes restent ici après la conversion : c'est le registre.
//
// ── Les deux leçons payées, écrites ici pour ne pas les repayer ──
//
// **La page porte la balise elle-même.** Un script injecté après le chargement
// trouve `DOMContentLoaded` déjà passé : son branchement ne tourne pas, et les
// sondes qui le mesurent rendent la même chose des deux côtés — identiques **à
// ne rien faire**. Mesuré sur `oasis-loader` : trois verts vides sur treize, et
// c'étaient les trois qui comptaient.
//
// **Les sondes asynchrones s'attendent.** Sans `await`, on compare deux fois la
// chaîne « [object Promise] », ce qui est toujours vrai.
const puppeteer = require('puppeteer');
const { demarrer } = require('../tests/smoke/harness');

// Un jeu de sondes par fichier. `prealables` charge les fichiers du socle dont
// celui-ci a besoin — `oasis-utils` lit `oasisEsc`, `oasisSessionPerdue` et
// `oasisMessageErreur`, et sans eux l'on ne mesurerait que des exceptions.
//
// `attendus` nomme les sondes dont la différence est **voulue**, avec sa raison.
// Une conversion peut légitimement améliorer quelque chose ; ce qu'elle ne doit
// pas faire, c'est qu'un écart passe pour acceptable **parce qu'on l'a regardé et
// trouvé plausible**. Un écart non déclaré fait échouer l'outil, et un `attendu`
// qui ne se produit pas le fait échouer aussi — sinon la déclaration survivrait à
// ce qu'elle décrit.
const JEUX = {
  'oasis-utils': {
    prealables: ['oasis-requete', 'oasis-commun', 'oasis-toast'],
    avant: "localStorage.setItem('pr_token','jeton-essai'); window.APP_STATE={lang:'fr'};",
    sondes: [
      "Object.getOwnPropertyNames(window).filter(n=>/^(api|escapeHtml|formatDate|showToast|_pesSearchInput)$/.test(n)).sort().join(',')",
      // `ICONS` est le cas qui a retenu ce fichier pour la fin : `const` au
      // premier niveau, donc globale **lexicale** et non propriété de `window`.
      // Après conversion il est posé sur `window`, ce qui le rend lisible des
      // deux façons — les ~90 lectures nues continuent, et `window.ICONS`
      // fonctionne enfin. La sonde vérifie les deux.
      "typeof ICONS",
      "typeof window.ICONS",
      "Object.keys(ICONS).length",
      "Object.keys(ICONS).sort().join(',')",
      "ICONS.shield === window.ICONS.shield",
      "formatDate(null)",
      "formatDate('2026-10-05T12:00:00Z')",
      "(()=>{window.APP_STATE={lang:'en'};const v=formatDate('2026-10-05T12:00:00Z');window.APP_STATE={lang:'fr'};return v;})()",
      "formatDate('pas une date')",
      "escapeHtml('<b>&\"x\"</b>')",
      "typeof showToast",
      // L'appel d'API : le jeton, les deux en-têtes, et la fusion des options.
      "(async()=>{let vu=null;const o=window.fetch;window.fetch=async(u,i)=>{vu={u,h:i.headers};return{status:200,ok:true,json:async()=>({ok:1})};};const r=await api('/api/x',{headers:{'X-Perso':'1'}});window.fetch=o;return JSON.stringify([r,vu.u,vu.h]);})()",
      // Un 401 doit lever, et appeler `oasisSessionPerdue`.
      "(async()=>{let perdue=0;const op=window.oasisSessionPerdue;window.oasisSessionPerdue=()=>{perdue++;};const o=window.fetch;window.fetch=async()=>({status:401,ok:false,json:async()=>({})});let msg='';try{await api('/api/x');}catch(e){msg=e.message;}window.fetch=o;window.oasisSessionPerdue=op;return perdue+'|'+msg;})()",
      // Un refus ordinaire lève avec le message du serveur, traduit par le socle.
      "(async()=>{const o=window.fetch;window.fetch=async()=>({status:400,ok:false,json:async()=>({error:'champ_requis'})});let msg='';try{await api('/api/x');}catch(e){msg=e.message;}window.fetch=o;return msg;})()",
    ],
    attendus: {
      'typeof window.ICONS': 'L’ancien `const ICONS` ne posait rien sur `window` ; '
        + 'le sas l’y pose. Le nom devient lisible des deux façons — c’est la correction '
        + 'du défaut qui avait vidé l’icône de la coquille DROITS.',
      'ICONS.shield === window.ICONS.shield': 'Même cause : la lecture par `window` '
        + 'levait, elle rend maintenant le même objet que la lecture nue.',
    },
  },
};

const nom = process.argv[2];
const jeu = JEUX[nom];
if (!jeu) {
  console.error(`Jeu de sondes inconnu : ${nom}\nDisponibles : ${Object.keys(JEUX).join(', ')}`);
  process.exit(2);
}

async function sonder(nav, base, repertoire) {
  const page = await nav.newPage();
  const incidents = [];
  page.on('pageerror', (e) => incidents.push(String(e.message).slice(0, 120)));
  await page.setRequestInterception(true);
  // La page porte les balises **elle-même** : `DOMContentLoaded` se déclenche
  // alors après les scripts, comme sur une vraie page. Voir l'en-tête.
  const balise = (r, f) => `<script src="/shared/${r}/${f}.js"><\/script>`;
  const corps = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
    + (jeu.avant ? `<script>${jeu.avant}<\/script>` : '')
    // Les préalables sont pris dans leur régime courant : converti s'il l'est,
    // d'origine sinon. C'est l'état réel des pages pendant la cohabitation.
    + (jeu.prealables || []).map((f) => balise(estConverti(f) ? 'app' : 'js', f)).join('')
    + balise(repertoire, nom)
    + '</body></html>';
  page.on('request', (r) => (r.url().endsWith('/__comparaison')
    ? r.respond({ status: 200, contentType: 'text/html', body: corps })
    : r.continue()));
  await page.goto(`${base}/__comparaison`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 400));
  const out = {};
  for (const s of jeu.sondes) {
    /* eslint-disable no-await-in-loop */
    out[s] = await page.evaluate(
      `(async () => { try { return String(await (${s})); } catch (e) { return 'ERREUR: ' + e.message.slice(0,80); } })()`,
    );
  }
  await page.close();
  return { out, incidents };
}

function estConverti(f) {
  // eslint-disable-next-line global-require
  const fs = require('fs');
  // eslint-disable-next-line global-require
  const path = require('path');
  return fs.existsSync(path.join(__dirname, '..', 'frontend', 'socle', 'globales', `${f}.ts`));
}

(async () => {
  const srv = await demarrer({ port: 4781 });
  const nav = await puppeteer.launch({
    headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const ancien = await sonder(nav, srv.base, 'js');
    const neuf = await sonder(nav, srv.base, 'app');
    const attendus = jeu.attendus || {};
    const nonDeclares = [];
    const attendusAbsents = new Set(Object.keys(attendus));
    for (const s of jeu.sondes) {
      const egal = ancien.out[s] === neuf.out[s];
      const declare = Object.prototype.hasOwnProperty.call(attendus, s);
      if (!egal && declare) attendusAbsents.delete(s);
      if (!egal && !declare) nonDeclares.push(s);
      const marque = egal ? '  =' : (declare ? '  ≈' : ' ≠≠');
      console.log(`${marque} ${s.slice(0, 96)}`);
      console.log(`      ${String(ancien.out[s]).slice(0, 180)}`);
      if (!egal) console.log(`      → ${String(neuf.out[s]).slice(0, 180)}`);
      if (!egal && declare) console.log(`      ↳ écart déclaré : ${attendus[s]}`);
    }
    attendusAbsents.forEach((s) => console.log(
      `  ⚠ écart déclaré qui ne s’est pas produit : ${s.slice(0, 90)}`,
    ));
    const ecarts = nonDeclares.length + attendusAbsents.size;
    // Une exception au chargement rendrait des sondes « identiques » et fausses :
    // les deux côtés échoueraient de la même façon.
    [['ancien', ancien], ['nouveau', neuf]].forEach(([quoi, r]) => {
      if (r.incidents.length) console.log(`  ⚠ ${quoi} — exceptions : ${r.incidents.join(' · ')}`);
    });
    const exceptions = ancien.incidents.length + neuf.incidents.length;
    const declares = Object.keys(attendus).length - attendusAbsents.size;
    console.log(`\n${ecarts === 0 ? 'CONFORME' : `${ecarts} ÉCART(S) NON DÉCLARÉ(S)`}`
      + ` — ${jeu.sondes.length} sondes, ${declares} écart(s) déclaré(s) et vérifié(s) — ${nom}`
      + (exceptions ? ` · ${exceptions} exception(s) au chargement` : ''));
    process.exitCode = ecarts === 0 && exceptions === 0 ? 0 : 1;
  } finally {
    await nav.close();
    await srv.arreter();
  }
})().catch((e) => { console.error(e); process.exit(1); });
