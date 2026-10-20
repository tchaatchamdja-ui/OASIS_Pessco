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
    // ── Les fichiers convertis comptent toujours, et c'est le point ──
    //
    // `login-page.js` et `cookies-page.js` ont quitté `public/js/` pour
    // `frontend/portail/pages/` (ADR-003, 5.c). Leurs huit gestes n'ont pas
    // disparu — ils ont changé de fichier. Un relevé qui ne lirait que
    // `public/js/` verrait le dénominateur **baisser à chaque conversion**, et
    // la couverture monter sans qu'un seul geste soit couvert de plus.
    //
    // C'est la même faute que celle du 6 octobre, en plus perfide : là, le
    // dénominateur était faux ; ici, il serait faux **dans le sens flatteur**, et
    // le rapport dirait « 30 % » là où rien n'a bougé.
    sources: () => {
      const liste = [];
      const js = path.join(RACINE, 'public', 'js');
      if (fs.existsSync(js)) {
        fs.readdirSync(js).filter((f) => f.endsWith('.js'))
          .forEach((f) => liste.push(path.join('public/js', f)));
      }
      // ── Tout `frontend/portail/`, et non le seul `pages/` ──
      //
      // Deuxième fois que ce dénominateur baisse à une conversion. Hier
      // `login-page.js` et `cookies-page.js` sont partis vers `pages/`, et la
      // liste ne lisait que `public/js/` ; aujourd'hui `modules-host.js` est
      // parti vers la **racine** de `frontend/portail/`, et la liste ne lisait
      // que `pages/`. Le geste `window:message` a disparu du relevé sans cesser
      // d'exister.
      //
      // Corriger le chemin une fois de plus serait attendre la troisième. On lit
      // donc l'ensemble, récursivement : un fichier converti compte, où qu'il
      // atterrisse.
      const racinePortail = path.join(RACINE, 'frontend', 'portail');
      const parcourir = (abs, rel) => {
        if (!fs.existsSync(abs)) return;
        fs.readdirSync(abs, { withFileTypes: true }).forEach((e) => {
          if (e.isDirectory()) { parcourir(path.join(abs, e.name), `${rel}/${e.name}`); return; }
          if (e.name.endsWith('.ts')) liste.push(`${rel}/${e.name}`);
        });
      };
      parcourir(racinePortail, 'frontend/portail');
      liste.push('public/index.html');
      return liste;
    },
    page: '/index.html',
    // ── La suite qui exerce cet écran, nommée et non supposée ──
    //
    // L'outil lançait `parcours` en dur. C'était juste tant qu'un seul écran
    // avait une suite de navigateur ; SURV a la sienne depuis le 14 octobre 2026
    // (`surv.smoke.js`, ADR-003 n° 5.f.1), et mesurer sa couverture en lançant
    // le parcours du portail aurait rendu **zéro** — un zéro de la mesure, non
    // de l'écran, et impossible à distinguer du vrai.
    suite: 'parcours',
  },
};

// ── Les cinq écrans de module, et pourquoi une fabrique et non cinq entrées ──
//
// Ils ont tous la même forme : `public/modules/<nom>/js/*.js` pour le JavaScript
// non converti, `index.html` pour le balisage de la page, et `frontend/<nom>/`
// pour ce qui aura été converti. Écrire cinq entrées serait écrire cinq fois la
// même chose, et la cinquième aurait divergé.
//
// Les sources **convertibles comptent toujours** — c'est la leçon payée deux
// fois sur le portail : un relevé qui ne lirait que `public/modules/<nom>/js/`
// verrait le dénominateur **baisser à chaque conversion**, et la couverture
// monter sans qu'un seul geste soit couvert de plus.
const ecranDeModule = (nom) => ({
  sources: () => {
    const liste = [];
    const js = path.join(RACINE, 'public', 'modules', nom, 'js');
    if (fs.existsSync(js)) {
      fs.readdirSync(js).filter((f) => f.endsWith('.js'))
        .forEach((f) => liste.push(`public/modules/${nom}/js/${f}`));
    }
    const converti = path.join(RACINE, 'frontend', nom);
    const parcourir = (abs, rel) => {
      if (!fs.existsSync(abs)) return;
      fs.readdirSync(abs, { withFileTypes: true }).forEach((e) => {
        if (e.isDirectory()) { parcourir(path.join(abs, e.name), `${rel}/${e.name}`); return; }
        if (/\.tsx?$/.test(e.name)) liste.push(`${rel}/${e.name}`);
      });
    };
    parcourir(converti, `frontend/${nom}`);
    const page = path.join(RACINE, 'public', 'modules', nom, 'index.html');
    if (fs.existsSync(page)) liste.push(`public/modules/${nom}/index.html`);
    return liste;
  },
  page: `/modules/${nom}/index.html`,
});

// SURV, le plus lourd des six (ADR-003, suite n° 5.f.0), et le seul à porter
// aujourd'hui une suite de navigateur.
ECRANS.execution = { ...ecranDeModule('execution'), suite: 'surv' };

// ── Les cinq autres, et pourquoi `suite: null` et non rien du tout ──
//
// `suite` valait jusqu'ici `ecran.suite || 'parcours'`. Un écran de module
// ajouté sans suite aurait donc fait lancer **le parcours du portail**, qui ne
// clique rien dans un module : le relevé aurait annoncé **0 geste exercé**.
//
// Ce zéro-là est le pire des résultats, parce qu'il est **indiscernable du
// vrai** : « 0 sur 365 » se lit « cet écran n'est pas couvert » alors qu'il
// faudrait lire « cet écran n'est pas mesuré ». C'est la faute que l'entrée du
// portail dénonce douze lignes plus haut, et elle serait revenue par la porte
// de la valeur par défaut.
//
// `suite: null` déclare donc l'absence, et l'outil la respecte : il fige
// l'inventaire — les noms, les occurrences, les formes — et **ne prétend à
// aucune couverture**. Le défaut implicite, lui, est supprimé : un écran sans
// `suite` est désormais refusé plutôt que mesuré de travers.
ECRANS.ramp = { ...ecranDeModule('ramp'), suite: 'ramp-navigateur' };
ECRANS.profil_risque = { ...ecranDeModule('profil_risque'), suite: 'profil-risque-navigateur' };
ECRANS.planification = { ...ecranDeModule('planification'), suite: 'planification-navigateur' };
ECRANS.mesures = { ...ecranDeModule('mesures'), suite: 'mesures-navigateur' };
ECRANS.droits = { ...ecranDeModule('droits'), suite: 'droits-navigateur' };

// ── Nommer un gestionnaire JSX ──
//
// Une flèche est une **forme**, non un nom : `onClick={() => ouvrir(x)}` est le
// geste « ouvrir », et le nommer « () => ouvrir(x) » rendrait deux gestes pour
// deux flèches qui appellent la même fonction. On retire donc l'en-tête de la
// flèche, puis l'on nomme comme partout ailleurs — même fonction des deux côtés,
// c'est la leçon de 5.f.3.
const nomDuGestionnaireJsx = (corps) => {
  let c = String(corps || '').trim();
  const flecheParenthesee = /^(?:async\s*)?\(([^)]*)\)\s*=>\s*/.exec(c);
  const flecheNue = /^(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>\s*/.exec(c);
  const tete = flecheParenthesee || flecheNue;
  if (tete) c = c.slice(tete[0].length).trim();
  // Un corps en bloc : `() => { f(); g(); }` — on nomme par le premier geste.
  if (c.startsWith('{')) c = c.slice(1, -1).trim();
  // Une référence nue est son propre nom : `onClick={fermer}`.
  const nue = /^([A-Za-z_$][\w$.]*)$/.exec(c);
  if (nue) return nue[1];
  // ── Une garde n'est pas un geste ──
  //
  // `(e) => { if (e.target === e.currentTarget) surFermer(); }` se nommait
  // « if » : le premier mot du bloc n'est pas toujours un nom. C'est la même
  // règle que la garde `event.stopPropagation` de 5.f.0, sous une autre forme —
  // le geste est ce que la garde **protège**, non la garde.
  const MOTS_CLES = new Set(['if', 'for', 'while', 'switch', 'try', 'catch',
    'return', 'const', 'let', 'var', 'do', 'else', 'typeof', 'await', 'new']);
  const nomme = nomDuGestionnaire(c);
  if (!MOTS_CLES.has(nomme)) return nomme;
  for (const appel of c.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$.]*)\s*\(/g)) {
    const n = appel[2];
    if (!MOTS_CLES.has(n.split('.')[0])) return n;
  }
  return nomme;
};

// L'identifiant d'une cible d'écouteur, cherché d'abord dans l'expression
// elle-même, puis dans les douze lignes qui précèdent sa pose.
function identifiantDeLaCible(expr, lignes, indice) {
  const direct = /getElementById\(['"]([\w-]+)['"]\)|querySelector\(\s*['"]#([\w-]+)/.exec(expr);
  if (direct) return direct[1] || direct[2];
  const nom = /^[A-Za-z_$][\w$]*$/.test(expr) ? expr : null;
  if (!nom) return null;
  // ── On remonte tout le fichier, et non douze lignes ──
  //
  // La fenêtre de douze était la distance observée dans les fichiers en
  // JavaScript. Un fichier converti déclare ses éléments en tête — `const oeil =
  // document.getElementById('voirMdp')` est à vingt-cinq lignes de son
  // écouteur — et le geste retombait en « indécidable » : la couverture passait
  // de 14 à 13 pour une raison de mise en page.
  //
  // On prend donc la **dernière** pose avant l'écouteur, où qu'elle soit. Le
  // risque est nommé : une variable réaffectée entre-temps donnerait un
  // rapprochement faux. Ces fichiers n'en ont pas — une pose, un `const` —, et le
  // jour où il en paraîtra une, c'est ce commentaire qui dira où regarder.
  for (let j = indice; j >= 0; j -= 1) {
    const pose = new RegExp(`\\b${nom}\\s*=[^=][^;]*?(?:getElementById\\(['"]([\\w-]+)['"]\\)|querySelector\\(\\s*['"]#([\\w-]+))`).exec(lignes[j]);
    if (pose) return pose[1] || pose[2];
  }
  return null;
}

// ── Le relevé statique : quels gestes existent ──
// ── Un commentaire n'est pas un geste, et il a fallu qu'un en soit compté ──
//
// Le 13 octobre 2026 (ADR-003, 5.e.5), l'en-tête du sas de la barre d'écran a
// gagné une phrase expliquant qu'`exportBar` écrit `onclick="${pdf}"` — la
// forme interpolée qui avait failli coûter deux boutons d'export. Le relevé a
// aussitôt compté **un geste de plus**, et la suite « taille » l'a dit : 130
// occurrences contre 129 figées.
//
// Le garde-fou a donc mordu sur ce qu'il devait — une dérive de l'inventaire —
// pour une cause qui n'en était pas une. C'est la même faute que la suite
// « frontend » avait déjà nommée sur un commentaire JSX : *un commentaire
// n'affirme rien et n'appelle rien*.
//
// Les commentaires sont **blanchis sur place**, et non retirés : l'inventaire
// retient le numéro de ligne de chaque geste, et des lignes qui glissent
// feraient paraître modifié tout ce qui suit. Un découpage à la main, non une
// expression rationnelle : `'https://…'` porte deux barres obliques dans une
// chaîne, et les blanchir couperait du vrai code.
function blanchirCommentaires(code) {
  const sortie = code.split('');
  const blanc = (debut, fin) => {
    for (let k = debut; k < fin && k < code.length; k += 1) {
      if (code[k] !== '\n') sortie[k] = ' ';
    }
  };
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '/') {
      const debut = i;
      while (i < code.length && code[i] !== '\n') i += 1;
      blanc(debut, i);
    } else if (c === '/' && code[i + 1] === '*') {
      const debut = i;
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i += 1;
      i += 2;
      blanc(debut, i);
    } else if (c === '"' || c === "'" || c === '`') {
      const fin = c;
      i += 1;
      while (i < code.length && code[i] !== fin) {
        if (code[i] === '\\') i += 2; else i += 1;
      }
      i += 1;
    } else i += 1;
  }
  return sortie.join('');
}

// ── Le nom d'un gestionnaire en ligne, et les trois formes qu'il prend ──
//
// Le relevé du 14 octobre 2026 sur l'écran SURV (23 731 lignes) a mis au jour
// trois défauts de cette fonction, qu'un écran de 1 192 lignes n'avait pas
// révélés. Les voici, et ce qu'elles coûtaient :
//
// 1. **Un gestionnaire qui n'est qu'une garde** — `onclick="event.stopPropagation();"`
//    — rendait un nom **vide** : la garde était ôtée, et il ne restait rien.
//    Quatre gestes de SURV étaient sans nom. La garde est désormais le nom quand
//    elle est tout ce qu'il y a.
//
// 2. **Un gestionnaire qui commence par une affectation** —
//    `onchange="EXEC_STATE.filters.domaine=this.value;execRenderPage()"` — était
//    nommé par ses quarante-huit premiers caractères. Vingt-cinq gestes de SURV
//    portaient un fragment de code pour nom, et deux fragments ne différant que
//    par une interpolation (`''` contre `'${q}'`) comptaient pour **deux gestes
//    distincts** là où il n'y a qu'un réglage. Le nom est désormais la **cible
//    de l'affectation**, et les interpolations sont retirées avant de nommer :
//    le même réglage ne compte plus deux fois.
//
// 3. **`on<événement> =` dans du JavaScript n'est pas un attribut.**
//    `let onchange = f.k === 'est_inspecteur' ? ' onchange="…"' : '';`
//    (`referentiels.ts`) était lu comme un attribut, et rendait le nom
//    `onchange="orgTypeChanged()"` — un nom qui n'existe pas. Un attribut
//    s'écrit sans espace avant son `=` ; une affectation en porte toujours un.
//    Relevé : **aucun attribut du dépôt** n'a d'espace avant son `=`, et toutes
//    les occurrences de `on<événement> =` sont du code.
//
// C'est la même leçon que les commentaires blanchis, un cran plus loin : *ce qui
// ressemble à un attribut n'en est pas un.*
const nomDuGestionnaire = (corps) => {
  // Les interpolations d'abord : deux gestionnaires qui ne diffèrent que par une
  // valeur insérée sont **un** geste, et non deux.
  const normalise = corps.replace(/\$\{[^}]*\}/g, '${}').trim();
  const sansGarde = normalise.replace(/^event\.stopPropagation\(\)\s*;\s*/, '');
  // Rien après la garde : la garde **est** le geste.
  if (!sansGarde) return 'event.stopPropagation';
  const appel = /^([A-Za-z_$][\w$.]*)\s*\(/.exec(sansGarde);
  if (appel) return appel[1];
  // Une affectation : la cible la nomme. `EXEC_STATE.filters.domaine=this.value;…`
  const affectation = /^([A-Za-z_$][\w$.[\]'"]*)\s*=(?!=)/.exec(sansGarde);
  if (affectation) return affectation[1];
  return sansGarde.slice(0, 48);
};

function relever(fichiers) {
  const gestes = [];
  for (const rel of fichiers) {
    const abs = path.join(RACINE, rel);
    if (!fs.existsSync(abs)) continue;
    const texte = blanchirCommentaires(fs.readFileSync(abs, 'utf8'));
    // Sans espace avant le `=` : voir le point 3 ci-dessus.
    const motifEnLigne = new RegExp(`\\bon(${EVENEMENTS.join('|')})=\\s*(["'\`])((?:\\\\.|(?!\\2).)*)\\2`, 'g');
    for (const m of texte.matchAll(motifEnLigne)) {
      const corps = m[3].trim();
      gestes.push({
        fichier: rel,
        ligne: texte.slice(0, m.index).split('\n').length,
        forme: 'en ligne',
        evenement: m[1],
        nom: nomDuGestionnaire(corps),
        source: corps.slice(0, 120),
      });
    }
    // ── Troisième forme : le gestionnaire posé en **propriété** ──
    //
    // `reset.onclick = portailViderRecherche` n'est ni un attribut `onclick=` ni
    // un `addEventListener` : les deux relevés ci-dessus le manquaient, et le
    // mouchard aussi — son écouteur de capture cherche `closest('[onclick]')`,
    // qui ne voit pas une propriété.
    //
    // Trouvé en écrivant un contrôle pour le vidage de la recherche : il rendait
    // « bouton introuvable » sur un bouton bien présent et bien branché. Deux
    // gestes du portail sont dans ce cas — peu, mais la cécité ne se compte pas
    // en nombre de cas manqués.
    // ── Quatrième forme : le gestionnaire **en propriété JSX** ──
    //
    // Un écran converti en React ne porte plus un seul `onclick="…"` : ses
    // gestionnaires sont des propriétés, `onClick={fermer}` ou
    // `onClick={() => ouvrir(x)}`. Aucun des trois relevés ci-dessus ne les
    // voit — ni attribut de balisage, ni `addEventListener`, ni propriété d'un
    // élément du DOM.
    //
    // Conséquence, mesurée le 15 octobre 2026 : **DROITS rendait zéro geste**,
    // et l'outil traitait ce zéro comme une panne de chemin. L'écran en porte
    // trente.
    //
    // C'est, poussée à son terme, la faute que l'entrée du portail dénonce deux
    // fois : *un dénominateur qui baisse à chaque conversion*. Ici il ne baisse
    // pas, il **disparaît** — et la conversion achevée d'un écran se serait
    // accompagnée de l'arrêt silencieux de sa mesure. Le plus converti des six
    // écrans était le seul qu'on ne mesurait plus.
    if (/\.(tsx|jsx)$/.test(rel)) {
      const motifJsx = /\bon([A-Z][A-Za-z]+)=\{/g;
      for (const m of texte.matchAll(motifJsx)) {
        // Les accolades s'imbriquent — `onClick={() => f({a: 1})}` —, et aucune
        // expression régulière ne les équilibre : on compte.
        let i = m.index + m[0].length;
        let profondeur = 1;
        while (i < texte.length && profondeur > 0) {
          if (texte[i] === '{') profondeur += 1;
          else if (texte[i] === '}') profondeur -= 1;
          i += 1;
        }
        if (profondeur !== 0) continue;
        const corps = texte.slice(m.index + m[0].length, i - 1).trim();
        gestes.push({
          fichier: rel,
          ligne: texte.slice(0, m.index).split('\n').length,
          forme: 'propriété JSX',
          evenement: m[1].toLowerCase(),
          nom: nomDuGestionnaireJsx(corps),
          source: corps.slice(0, 120),
          id: null,
        });
      }
    }

    const motifPropriete = new RegExp(`\\b([\\w$.[\\]'"]+)\\.on(${EVENEMENTS.join('|')})\\s*=\\s*([A-Za-z_$][\\w$.]*)`, 'g');
    for (const m of texte.matchAll(motifPropriete)) {
      gestes.push({
        fichier: rel, ligne: texte.slice(0, m.index).split('\n').length,
        forme: 'propriété', evenement: m[2], nom: m[3],
        source: m[0].slice(0, 120), id: null,
      });
    }

    const lignes = texte.split('\n');
    lignes.forEach((l, i) => {
      // ── Le chaînage optionnel, que la conversion introduit ──
      //
      // Un fichier converti écrit `oeil?.addEventListener(…)` : sous `strict`, la
      // cible peut être nulle, et le `?.` est la façon honnête de le dire. Le
      // motif ne le connaissait pas, et il a **fait baisser la couverture** de 14
      // à 12 au moment de la conversion de deux pages — sans qu'un seul geste
      // cesse d'être exercé.
      //
      // La direction était la bonne (on sous-estime, on ne flatte pas), mais le
      // chiffre était faux. Trouvé en comparant le relevé d'avant et d'après : un
      // relevé qui bouge quand rien n'a bougé est un relevé qui mesure sa propre
      // syntaxe.
      const m = /(?:([\w$.[\]'"()#-]+)\s*)?\??\.addEventListener\(\s*['"]([a-z]+)['"]/.exec(l);
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
// ── Les événements qu'un relevé de gestes doit connaître ──
//
// Quatre, jusqu'au 9 octobre : `click`, `change`, `submit`, `input`. C'était
// faux, et faux **dans le sens flatteur** — le dénominateur manquait huit
// occurrences et cinq noms, si bien que le rapport annonçait 28 sur 78 là où
// c'est 28 sur 83.
//
// Trouvé en allant couvrir l'organigramme : ses quatre gestes de glisser-déposer
// (`orgDragStart`, `orgAllowDrop`, `orgDragLeave`, `orgDrop`) n'étaient **ni dans
// le relevé ni dans la liste des dispenses**. Ils n'étaient pas déclarés non
// couverts : ils n'existaient pas. Un geste qu'un outil ne sait pas voir ne
// manque jamais à l'appel.
//
// `mousedown` y figure bien qu'il ne porte ici que des `preventDefault` : la
// règle de ce relevé est de **déclarer plutôt que filtrer**, et un filtre
// silencieux cacherait un jour un vrai geste. `load` n'y figure pas, et c'est
// dit : les trois `reader.onload` du portail sont des retours de lecture de
// fichier, non des gestes d'un agent.
const EVENEMENTS = ['click', 'change', 'submit', 'input', 'blur', 'mousedown',
  'dragstart', 'dragover', 'dragleave', 'drop'];

const MOUCHARD = () => {
  const CLE = '__oasis_gestes';
  const journal = { enLigne: [], ecouteurs: [], propriete: [], jsx: [], poses: 0 };
  Object.defineProperty(window, '__gestes', { value: journal, enumerable: false });

  const garder = (champ, valeur) => {
    journal[champ].push(valeur);
    try {
      const d = JSON.parse(localStorage.getItem(CLE)
        || '{"enLigne":[],"ecouteurs":[],"propriete":[],"jsx":[],"poses":0}');
      d.propriete = d.propriete || [];
      d.jsx = d.jsx || [];
      d[champ].push(valeur);
      localStorage.setItem(CLE, JSON.stringify(d));
    } catch { /* stockage fermé : le registre en mémoire reste */ }
  };

  // Les gestionnaires en ligne : un écouteur en **capture** sur le document voit
  // tout événement qui descend, y compris ceux qu'il ne déclenche pas lui-même.
  //
  // Le drapeau de capture manquait, et le commentaire au-dessus annonçait depuis
  // trois jours ce que le code ne faisait pas. Sans effet sur les quatre
  // événements d'alors — tous remontent —, mais `blur` **ne remonte pas** : la
  // seule façon de le voir depuis le document est la descente. Un commentaire
  // juste sur un code qui ne l'est pas est la pire des deux erreurs : il dispense
  // de regarder.
  //
  // La liste est celle du relevé statique, recopiée dans la page : ce code est
  // sérialisé par Puppeteer et n'a pas accès aux constantes du module.
  ['click', 'change', 'submit', 'input', 'blur', 'mousedown',
    'dragstart', 'dragover', 'dragleave', 'drop'].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (!(e.target instanceof Element)) return;
      const attribut = e.target.closest(`[on${type}]`);
      if (attribut) garder('enLigne', attribut.getAttribute(`on${type}`).trim().slice(0, 160));
      // ── Quatrième forme : le gestionnaire **en propriété JSX** ──
      //
      // Un écran converti en React ne pose ni attribut ni propriété d'élément :
      // il attache **un** écouteur par type à la racine, et distribue lui-même.
      // Les trois lectures ci-dessus ne voyaient donc **rien** de DROITS —
      // mesuré le 15 octobre 2026 : après un vrai clic sur un de ses boutons,
      // `enLigne` restait vide.
      //
      // Et c'était la panne la plus sournoise qui soit : l'écran **le plus
      // converti** devenait le seul non mesuré, et chacune des quatre
      // conversions à venir aurait mis sa couverture à zéro sans qu'on le sache.
      //
      // React laisse ses props sur le nœud, sous une clé `__reactProps$<alea>`.
      // On remonte la lignée, on y cherche `on<Type>`, et l'on garde **la source
      // de la fonction** — non son nom tiré ici. Le nommage appartient au côté
      // Node, qui applique `nomDuGestionnaireJsx`, la même fonction que
      // l'extracteur statique. *Deux côtés qui nomment séparément finissent par
      // nommer différemment* — c'est la leçon payée en 5.f.3, et elle n'est pas
      // à repayer.
      // ── `onChange` de React **est** l'événement natif `input` ──
      //
      // React ne branche pas `onChange` sur le `change` du DOM : il l'appelle à
      // chaque frappe, c'est-à-dire sur `input`. Chercher le seul `onInput`
      // laissait donc `surRecherche` non reconnu — alors que son contrôle était
      // **vert** : la table se restreignait bien, et se rendait bien.
      //
      // Le cas est instructif : *un contrôle vert ne prouve pas que la mesure a
      // vu le geste.* Les deux instruments sont indépendants, et c'est
      // précisément pourquoi ils se contredisent utilement.
      const majuscule = `on${type.charAt(0).toUpperCase()}${type.slice(1)}`;
      const candidats = type === 'input' ? [majuscule, 'onChange'] : [majuscule];
      for (let n = e.target; n; n = n.parentElement) {
        const cle = Object.keys(n).find((k) => k.indexOf('__reactProps') === 0);
        if (!cle) continue;
        const props = n[cle] || {};
        const nomProp = candidats.find((c) => typeof props[c] === 'function');
        if (!nomProp) continue;
        const h = props[nomProp];
        garder('jsx', { nom: h.name || '', source: String(h).slice(0, 220) });
        break;
      }
      // La **propriété**, que `closest('[on…]')` ne voit pas : un
      // `el.onclick = fn` n'ajoute aucun attribut. On remonte donc la lignée à
      // la main et l'on garde le nom de la fonction posée.
      for (let n = e.target; n; n = n.parentElement) {
        const fn = n[`on${type}`];
        if (typeof fn !== 'function' || n.hasAttribute(`on${type}`)) continue;
        // ── Le nom ne suffit pas : la fonction est **anonyme** ──
        //
        // `window.portailViderRecherche = function () {…}` ne donne aucun nom à
        // la fonction : l'inférence de nom de JavaScript s'applique à
        // `const x = function(){}` et aux propriétés d'un littéral, **pas** à
        // une affectation sur un membre. `fn.name` rend donc la chaîne vide, et
        // le geste restait non rapproché — un « non exercé » faux sur un geste
        // que la suite presse.
        //
        // On cherche donc la fonction **par son identité** parmi les globales :
        // c'est exact, et c'est le seul rapprochement qui le soit.
        let nom = fn.name;
        if (!nom) {
          try {
            nom = Object.getOwnPropertyNames(window).find((k) => {
              try { return window[k] === fn; } catch { return false; }
            }) || '(anonyme)';
          } catch { nom = '(anonyme)'; }
        }
        garder('propriete', nom);
        break;
      }
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
function lancerLaSuite(journal, suite) {
  const r = spawnSync('npm', ['run', 'smoke', '--', suite], {
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

  // ── Un écran sans suite de navigateur : l'inventaire, et rien de plus ──
  if (ecran.suite === null) {
    const noms = new Set(gestes.map((g) => g.nom));
    console.log(`\n═══ ${quoi} — ${noms.size} gestes nommés, ${gestes.length} occurrences ═══\n`);
    console.log('  aucune suite de navigateur : la couverture n’est pas mesurée.');
    console.log('  Ce n’est pas « 0 % » — c’est « non mesuré », et les deux ne se disent pas');
    console.log('  du même ton. La suite n° 0.b de cet écran le changera.\n');
    const parFichier = {};
    gestes.forEach((g) => { (parFichier[g.fichier] ||= []).push(g); });
    Object.entries(parFichier)
      .sort((x, y) => y[1].length - x[1].length)
      .forEach(([f, liste]) => {
        console.log(`── ${f} — ${new Set(liste.map((g) => g.nom)).size} noms, ${liste.length} occurrences ──`);
      });
    const cibleSeule = path.join(RACINE, 'tests', 'smoke', `gestes-${quoi}.json`);
    fs.writeFileSync(cibleSeule, `${JSON.stringify({
      releve: new Date().toISOString().slice(0, 10),
      gestesNommes: noms.size,
      occurrences: gestes.length,
      // `null` et non `0` : le relevé dit ce qu'il sait, et dit qu'il ne sait
      // pas le reste. Les garde-fous s'appuient sur cette distinction.
      sansSuite: true,
      exerces: null,
      indecidables: null,
      gestes,
    }, null, 1)}\n`);
    console.log(`Relevé figé dans tests/smoke/gestes-${quoi}.json — inventaire seul.`);
    return;
  }
  if (!ecran.suite) {
    console.error(`l’écran « ${quoi} » ne déclare pas de suite. Poser le nom de sa suite`
      + ' de navigateur, ou `suite: null` si elle n’existe pas encore — mesurer un écran'
      + ' de module avec le parcours du portail rendrait « 0 exercé », indiscernable du vrai.');
    process.exit(2);
  }

  const journal = path.join(require('os').tmpdir(), `oasis-gestes-${process.pid}.json`);
  const suite = ecran.suite;
  const { code, sortie } = lancerLaSuite(journal, suite);
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
    console.error(`la suite « ${suite} » est rouge (code ${code}) : le parcours s’est `
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
  // ── Les deux côtés nomment **avec la même fonction**, et il a fallu un écran
  //    de 23 731 lignes pour que l'écart se voie ──
  //
  // Ce rapprochement avait sa propre règle de nommage : le premier appel du
  // gestionnaire, et rien d'autre. L'extracteur, lui, a gagné trois règles le
  // 14 octobre 2026 (5.f.0) — la garde seule, la cible d'une affectation, les
  // interpolations normalisées.
  //
  // **Les trois n'avaient été appliquées que d'un côté.** Un sous-onglet des
  // constatations, dont le gestionnaire est
  // `EXEC_STATE.currentConstSub='list';execRenderPage();`, était relevé sous le
  // nom `EXEC_STATE.currentConstSub` et reconnu au vol sous le nom
  // `execRenderPage` : cliqué, il comptait pour non exercé.
  //
  // L'erreur allait dans le sens pessimiste — une couverture sous-estimée — et
  // c'est précisément pourquoi elle pouvait durer : *une mesure qui se trompe en
  // sa défaveur ne se fait pas remarquer.* Les deux côtés appellent désormais
  // `nomDuGestionnaire`.
  const vues = new Set(exerces.enLigne.map(nomDuGestionnaire).filter(Boolean));
  const ecouteursVus = new Set(exerces.ecouteurs);
  const proprietesVues = new Set(exerces.propriete || []);
  // ── Nommer un gestionnaire JSX **vu au vol**, comme on nomme celui qui est
  //    écrit dans la source ──
  //
  // Le mouchard garde deux choses : le `name` de la fonction et sa source. Le
  // `name` vaut quand il en est un — `onClick={surFermer}` donne bien
  // « surFermer ». Mais une flèche anonyme reçoit de JavaScript le nom de la
  // **propriété** qui la porte : `onClick`, `onChange`. Ce n'est pas un nom de
  // geste, c'est le nom de la place.
  //
  // Dans ce cas, on nomme par la source — et par `nomDuGestionnaireJsx`, la
  // fonction que l'extracteur statique applique au même texte. Un seul nommage
  // des deux côtés, par construction.
  const jsxVus = new Set((exerces.jsx || []).map((v) => {
    const nom = String((v && v.nom) || '');
    if (nom && !/^on[A-Z]/.test(nom)) return nom;
    return nomDuGestionnaireJsx(String((v && v.source) || ''));
  }).filter(Boolean));
  gestes.forEach((g) => {
    if (g.forme === 'en ligne') { g.exerce = vues.has(g.nom); return; }
    if (g.forme === 'propriété') { g.exerce = proprietesVues.has(g.nom); return; }
    if (g.forme === 'propriété JSX') { g.exerce = jsxVus.has(g.nom); return; }
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
  console.log(`  exercés par la suite « ${suite} » : ${nExerces}`
    + `  (${Math.round((nExerces / noms.size) * 100)} %)`);
  console.log(`  non exercés                       : ${nAbsents}`);
  console.log(`  indécidables (cible non nommée)   : ${nIndecidables}`);
  console.log(`  pages instrumentées / écouteurs   : ${exerces.pages} / ${exerces.poses}\n`);

  const parFichier = {};
  gestes.forEach((g) => { (parFichier[g.fichier] ||= []).push(g); });
  for (const [f, liste] of Object.entries(parFichier)) {
    const n = liste.filter((g) => g.exerce === true).length;
    const noms = new Map();
    liste.forEach((g) => {
      const e = noms.get(g.nom) || { total: 0, exerce: 0, indecidable: 0 };
      e.total += 1;
      if (g.exerce === true) e.exerce += 1;
      if (g.exerce === null) e.indecidable += 1;
      noms.set(g.nom, e);
    });
    // ── La ligne nomme son unité, et porte les deux ──
    //
    // Elle ne disait que `n/total`, sans dire de quoi. Ce sont des
    // **occurrences** : un même nom posé à trois endroits y compte trois fois,
    // quand le bilan du haut compte des **noms**. J'ai écrit « gestes » pour les
    // deux pendant plusieurs entrées d'ADR, et rien ne m'a contredit — parce que
    // la mesure elle-même ne nommait pas ce qu'elle comptait.
    //
    // Ce qui l'a trahie : `exec-rapports.js — 2/6` avec **une seule ligne
    // verte**, celle d'un nom posé deux fois. Deux noms exercés ne s'écrivent
    // pas sur une ligne. *Une mesure qui ne nomme pas son unité laisse celui qui
    // la lit en choisir une.*
    const nomsExerces = [...noms.values()].filter((e) => e.exerce > 0).length;
    console.log(`── ${f} — ${n}/${liste.length} occurrences, ${nomsExerces}/${noms.size} noms ──`);
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
