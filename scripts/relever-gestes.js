#!/usr/bin/env node
// OASIS — Relevé des gestes d'un écran, et de ceux qu'un parcours exerce.
//
// ADR-003, suite n° 5.c : chaque écran est **mesuré avant d'être réécrit**. Cet
// outil fait la mesure, et il existe parce que la première l'avait faite à la
// main et s'était trompée.
//
// ── Pourquoi « nommer » et non « compter » ──
//
// Le relevé du portail du 6 octobre 2026 annonçait **quarante gestes**. Il y en
// a **cent vingt et un** : les quarante étaient ceux d'`app.js`, et le portail
// porte neuf fichiers — `app-config.js` seul en a cinquante-six. Un compte fait
// à la main sur le fichier qu'on regarde est un compte du fichier qu'on
// regarde.
//
// Et « 121 » ne sert à rien non plus pour la couverture : il ne dit pas
// **lequel** manque. Chaque geste est donc nommé par ce qu'il appelle, et le
// rapport est une liste, non un chiffre.
//
// ── Pourquoi la mesure se fait dans un navigateur ──
//
// On ne peut pas lire un fichier et en déduire ce qu'un parcours exerce. Il faut
// cliquer et regarder ce qui part. L'instrumentation est posée **avant** que les
// scripts de la page ne tournent (`evaluateOnNewDocument`), et elle enregistre
// deux choses :
//
//   · tout clic réel qui atteint un élément porteur d'un gestionnaire en ligne —
//     par un écouteur en phase de capture sur le document, qui voit passer ce
//     qu'il ne déclenche pas ;
//   · toute invocation d'un écouteur posé par `addEventListener`, dont la pose
//     est enveloppée.
//
// Les deux sont nécessaires : le portail emploie les deux formes, et une mesure
// qui n'en verrait qu'une rendrait un chiffre plausible et faux — ce qui est
// exactement le défaut qu'on cherche à ne plus commettre.
//
// ── Ce que cet outil refuse de faire ──
//
// Il ne rend **jamais** « tout va bien ». S'il n'enregistre aucun geste, il le
// dit comme un échec de la mesure et non comme un résultat : une sonde muette et
// un écran inerte se ressemblent, et la seule façon de les distinguer est de
// refuser le silence.
//
// Usage :  node scripts/relever-gestes.js [portail]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const { demarrer } = require(path.join(RACINE, 'tests', 'smoke', 'harness.js'));

// Les écrans et leurs sources. Le portail d'abord, parce qu'il est le prochain
// réécrit ; les cinq autres suivront, et la table est ici pour qu'ils n'aient
// qu'une ligne à ajouter.
const ECRANS = {
  portail: {
    sources: () => [
      ...fs.readdirSync(path.join(RACINE, 'public', 'js'))
        .filter((f) => f.endsWith('.js')).map((f) => path.join('public/js', f)),
      'public/index.html',
    ],
    page: '/index.html',
  },
};

// L'identifiant d'une cible d'écouteur, cherché d'abord dans l'expression
// elle-même, puis dans les douze lignes qui précèdent sa pose.
function identifiantDeLaCible(expr, lignes, indice) {
  const direct = /getElementById\(['"]([\w-]+)['"]\)|querySelector\(\s*['"]#([\w-]+)/.exec(expr);
  if (direct) return direct[1] || direct[2];
  const nom = /^[A-Za-z_$][\w$]*$/.test(expr) ? expr : null;
  if (!nom) return null;
  for (let j = indice; j >= Math.max(0, indice - 12); j -= 1) {
    const pose = new RegExp(`\\b${nom}\\s*=[^=][^;]*?(?:getElementById\\(['"]([\\w-]+)['"]\\)|querySelector\\(\\s*['"]#([\\w-]+))`).exec(lignes[j]);
    if (pose) return pose[1] || pose[2];
  }
  return null;
}

// ── Le relevé statique : quels gestes existent ──
function relever(fichiers) {
  const gestes = [];
  for (const rel of fichiers) {
    const abs = path.join(RACINE, rel);
    if (!fs.existsSync(abs)) continue;
    const texte = fs.readFileSync(abs, 'utf8');
    for (const m of texte.matchAll(/\bon(click|change|submit|input)\s*=\s*(["'`])((?:\\.|(?!\2).)*)\2/g)) {
      const corps = m[3].trim();
      // Le nom du geste est la fonction appelée. `event.stopPropagation()` en
      // tête n'est pas un geste : c'est une précaution à l'intérieur d'un geste.
      const sansGarde = corps.replace(/^event\.stopPropagation\(\)\s*;\s*/, '');
      const appel = (/^([A-Za-z_$][\w$.]*)\s*\(/.exec(sansGarde) || [])[1] || sansGarde.slice(0, 48);
      gestes.push({
        fichier: rel,
        ligne: texte.slice(0, m.index).split('\n').length,
        forme: 'en ligne',
        evenement: m[1],
        nom: appel,
        source: corps.slice(0, 120),
      });
    }
    const lignes = texte.split('\n');
    lignes.forEach((l, i) => {
      const m = /(?:([\w$.[\]'"()#-]+)\s*)?\.addEventListener\(\s*['"]([a-z]+)['"]/.exec(l);
      if (!m) return;
      const cible = m[1] || '?';
      gestes.push({
        fichier: rel, ligne: i + 1, forme: 'écouteur', evenement: m[2],
        nom: `${cible.slice(-40)}:${m[2]}`, source: l.trim().slice(0, 120),
        // ── L'identifiant de la cible, remonté dans la source ──
        //
        // `oeil.addEventListener('click', …)` ne nomme pas d'élément : la
        // variable a été posée plus haut. Le mouchard, lui, voit l'élément et
        // rend `button#monId`. Sans rapprochement, le geste reste
        // « indécidable » — et quatorze indécidables sur cent vingt et un, soit
        // douze pour cent du relevé, c'est un « je ne sais pas » assez fréquent
        // pour qu'on apprenne à l'ignorer.
        //
        // On remonte donc jusqu'à douze lignes au-dessus pour trouver où la
        // variable a été posée. Douze, parce que c'est la distance qu'on
        // observe ici entre la pose et l'usage ; au-delà, on préfère
        // « indécidable » à un rapprochement deviné.
        id: identifiantDeLaCible(cible, lignes, i),
      });
    });
  }
  return gestes;
}

// ── L'instrumentation, posée avant les scripts de la page ──
//
// Elle tient deux registres pour une seule raison : **la suite ouvre trois
// pages et en ferme deux**. Une page fermée n'a plus de `window`, et un relevé
// fait à la fin du parcours n'en voyait qu'une sur trois — c'est-à-dire un
// tiers du parcours présenté comme le parcours entier.
//
// Le registre durable est donc `localStorage`, que toutes les pages d'une même
// origine partagent et qui survit à leur fermeture. Le registre en mémoire
// reste, parce qu'il sert au contre-essai de l'instrumentation elle-même.
//
// Ce que cela coûte, et qui est dit plutôt que découvert : deux pages qui
// enregistrent **au même instant** peuvent se perdre une écriture, le cycle
// lire-modifier-écrire n'étant pas atomique entre contextes. Pour un relevé de
// couverture, perdre un doublon est sans effet — un geste exercé deux fois
// reste exercé. Perdre le **seul** enregistrement d'un geste rendrait un
// faux « non couvert », donc une alarme en trop et jamais en moins : c'est le
// sens dans lequel on veut se tromper.
const MOUCHARD = () => {
  const CLE = '__oasis_gestes';
  const journal = { enLigne: [], ecouteurs: [], poses: 0 };
  Object.defineProperty(window, '__gestes', { value: journal, enumerable: false });

  const garder = (champ, valeur) => {
    journal[champ].push(valeur);
    try {
      const d = JSON.parse(localStorage.getItem(CLE) || '{"enLigne":[],"ecouteurs":[],"poses":0}');
      d[champ].push(valeur);
      localStorage.setItem(CLE, JSON.stringify(d));
    } catch { /* stockage fermé : le registre en mémoire reste */ }
  };

  // Les gestionnaires en ligne : un écouteur en **capture** sur le document voit
  // tout événement qui descend, y compris ceux qu'il ne déclenche pas lui-même.
  ['click', 'change', 'submit', 'input'].forEach((type) => {
    document.addEventListener(type, (e) => {
      const cible = e.target instanceof Element ? e.target.closest(`[on${type}]`) : null;
      if (cible) garder('enLigne', cible.getAttribute(`on${type}`).trim().slice(0, 160));
    }, true);
  });

  // Les écouteurs posés en code : on enveloppe la pose pour voir l'invocation.
  const pose = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, ...reste) {
    if (typeof fn !== 'function' || fn.__trace) return pose.call(this, type, fn, ...reste);
    journal.poses += 1;
    const cible = this instanceof Element
      ? `${this.tagName.toLowerCase()}${this.id ? `#${this.id}` : ''}` : String(this);
    const enveloppe = function (...args) {
      garder('ecouteurs', `${cible}:${type}`);
      return fn.apply(this, args);
    };
    enveloppe.__trace = true;
    return pose.call(this, type, enveloppe, ...reste);
  };
};

// ── On lance la vraie suite, on ne la rejoue pas ──
//
// La première version de cet outil **réimplémentait** le parcours de
// `tests/smoke/parcours.smoke.js`. Elle s'est trompée de sélecteur — elle
// cherchait `.cfg-nav-item[data-cfg]`, qui ne désigne rien, là où la suite
// emploie `.cfg-sidebar-item` — et a donc rendu « aucune sous-vue exercée » en
// mesurant **sa propre cécité**, non la couverture.
//
// C'est le défaut que ce dépôt rencontre le plus souvent, et toujours sous la
// même forme : un instrument qui mesure autre chose que ce qu'il annonce. La
// correction n'est pas de rectifier le sélecteur — c'est de supprimer
// l'imitation. `OASIS_MOUCHARD` fait poser l'instrumentation par la suite
// elle-même, sur chacune de ses pages, et écrire son journal avant de fermer.
//
// La conséquence est voulue : ce que l'outil mesure **est** ce que la campagne
// exerce, et il ne peut plus en diverger.
function lancerLaSuite(journal) {
  const r = spawnSync('npm', ['run', 'smoke', '--', 'parcours'], {
    cwd: RACINE, env: { ...process.env, OASIS_MOUCHARD: journal }, encoding: 'utf8',
  });
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}` };
}

async function principal() {
  const quoi = process.argv[2] || 'portail';
  const ecran = ECRANS[quoi];
  if (!ecran) {
    console.error(`écran inconnu : ${quoi} — connus : ${Object.keys(ECRANS).join(', ')}`);
    process.exit(2);
  }

  const gestes = relever(ecran.sources());
  if (!gestes.length) {
    console.error('aucun geste relevé : la source a changé de forme, ou le chemin est faux.');
    process.exit(2);
  }

  const journal = path.join(require('os').tmpdir(), `oasis-gestes-${process.pid}.json`);
  const { code, sortie } = lancerLaSuite(journal);
  if (!fs.existsSync(journal)) {
    console.error('la suite n’a pas écrit de journal. Sortie :\n'
      + sortie.split('\n').slice(-12).join('\n'));
    process.exit(1);
  }
  const exerces = JSON.parse(fs.readFileSync(journal, 'utf8'));
  fs.unlinkSync(journal);

  // ── Une mesure muette est un échec de la mesure, non un résultat ──
  if (!exerces.enLigne.length && !exerces.ecouteurs.length) {
    console.error(`AUCUN geste enregistré sur ${exerces.pages} page(s), `
      + `${exerces.poses} écouteur(s) posé(s). L’instrumentation n’a rien vu : `
      + 'mesure invalide, et non « écran inerte ».');
    process.exit(1);
  }
  // Une suite rouge mesure un parcours interrompu : le relevé serait partiel et
  // le dirait « couverture ».
  if (code !== 0) {
    console.error(`la suite « parcours » est rouge (code ${code}) : le parcours s’est `
      + 'arrêté en route, et le relevé serait partiel. Corriger la suite d’abord.');
    process.exit(1);
  }

  // ── L'identité d'un geste est **la fonction qu'il appelle** ──
  //
  // Première écriture : on comparait la source du gestionnaire, mot pour mot.
  // Elle ne pouvait pas marcher, et c'est le contre-essai qui l'a montré — la
  // source d'un gestionnaire est souvent un **gabarit** :
  //
  //     onclick="cfgNavigate('${tab.id}')"      ← ce que la source écrit
  //     onclick="cfgNavigate('general')"        ← ce que le navigateur porte
  //
  // La comparaison littérale rendait donc « non exercé » pour onze sous-vues
  // que la suite clique onze fois. Encore un instrument qui mesurait sa propre
  // forme au lieu de son objet.
  //
  // Ce que cela coûte, et qui est dit : deux gestes appelant la **même**
  // fonction avec des arguments différents ne se distinguent plus — exercer
  // `openRefModal('domaines')` marque les huit `openRefModal` comme exercés.
  // La couverture est donc comptée en **gestes nommés distincts**, et le
  // nombre d'occurrences est donné à côté : annoncer 8/121 sur un seul clic
  // serait une couverture surévaluée d'un facteur huit.
  const nomAppele = (source) => {
    const sansGarde = source.replace(/^event\.stopPropagation\(\)\s*;\s*/, '').trim();
    return (/^([A-Za-z_$][\w$.]*)\s*\(/.exec(sansGarde) || [])[1] || null;
  };
  const vues = new Set(exerces.enLigne.map(nomAppele).filter(Boolean));
  const ecouteursVus = new Set(exerces.ecouteurs);
  gestes.forEach((g) => {
    if (g.forme === 'en ligne') { g.exerce = vues.has(g.nom); return; }
    // Un écouteur est identifié par sa cible et son événement. La cible relevée
    // dans la source est une expression ; celle vue au vol est l'élément. On
    // rapproche par l'identifiant quand la source en porte un, et l'on marque
    // « indécidable » plutôt que « non exercé » dans le cas contraire : dire
    // « non couvert » de ce qu'on ne sait pas rapprocher serait une fausse
    // alarme, et une fausse alarme répétée se fait ignorer.
    if (!g.id) { g.exerce = null; return; }
    g.exerce = ecouteursVus.has(`${g.id}`) || [...ecouteursVus]
      .some((v) => v.endsWith(`#${g.id}:${g.evenement}`));
  });

  // La couverture se compte sur les gestes **nommés distincts** : un nom exercé
  // une fois l'est, quels que soient ses arguments. Les occurrences sont dites
  // à côté, parce qu'elles disent la taille de l'écran et non sa couverture.
  const noms = new Map();
  gestes.forEach((g) => {
    const e = noms.get(g.nom) || { total: 0, exerce: false, indecidable: true };
    e.total += 1;
    if (g.exerce === true) e.exerce = true;
    if (g.exerce !== null) e.indecidable = false;
    noms.set(g.nom, e);
  });
  const distincts = [...noms.values()];
  const nExerces = distincts.filter((e) => e.exerce).length;
  const nIndecidables = distincts.filter((e) => e.indecidable && !e.exerce).length;
  const nAbsents = distincts.length - nExerces - nIndecidables;

  console.log(`\n═══ ${quoi} — ${noms.size} gestes nommés, ${gestes.length} occurrences ═══\n`);
  console.log(`  exercés par la suite « parcours » : ${nExerces}`
    + `  (${Math.round((nExerces / noms.size) * 100)} %)`);
  console.log(`  non exercés                       : ${nAbsents}`);
  console.log(`  indécidables (cible non nommée)   : ${nIndecidables}`);
  console.log(`  pages instrumentées / écouteurs   : ${exerces.pages} / ${exerces.poses}\n`);

  const parFichier = {};
  gestes.forEach((g) => { (parFichier[g.fichier] ||= []).push(g); });
  for (const [f, liste] of Object.entries(parFichier)) {
    const n = liste.filter((g) => g.exerce === true).length;
    console.log(`── ${f} — ${n}/${liste.length} ──`);
    const noms = new Map();
    liste.forEach((g) => {
      const e = noms.get(g.nom) || { total: 0, exerce: 0, indecidable: 0 };
      e.total += 1;
      if (g.exerce === true) e.exerce += 1;
      if (g.exerce === null) e.indecidable += 1;
      noms.set(g.nom, e);
    });
    [...noms.entries()]
      .sort((a, b) => (a[1].exerce ? 1 : 0) - (b[1].exerce ? 1 : 0) || b[1].total - a[1].total)
      .forEach(([nom, e]) => {
        const marque = e.exerce ? '✓' : (e.indecidable === e.total ? '?' : '·');
        console.log(`   ${marque} ${String(e.total).padStart(2)}×  ${nom}`);
      });
  }

  const cible = path.join(RACINE, 'tests', 'smoke', `gestes-${quoi}.json`);
  fs.writeFileSync(cible, `${JSON.stringify({
    releve: new Date().toISOString().slice(0, 10),
    gestesNommes: noms.size,
    occurrences: gestes.length,
    exerces: nExerces,
    indecidables: nIndecidables,
    gestes,
  }, null, 1)}\n`);
  console.log(`\nRelevé figé dans ${path.relative(RACINE, cible)}`);
}

// ── Le garde de module, et pourquoi il n'est pas décoratif ──
//
// Sans lui, `require()` de ce fichier **lance la mesure entière** : le
// contre-essai de l'instrumentation l'a appris en démarrant un second serveur
// et en réécrivant le relevé avant même d'avoir commencé. Un outil qui agit à
// l'import ne s'éprouve pas.
if (require.main === module) {
  principal().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { MOUCHARD, relever, ECRANS };
