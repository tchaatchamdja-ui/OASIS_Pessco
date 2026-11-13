// OASIS — Tests de fumée : `npm run smoke`
//
// Un fichier par module, plus le socle. Chaque suite démarre son propre
// serveur sur une copie temporaire de data/ : la base de travail n'est jamais
// touchée. Le filet minimal avant d'intégrer un nouveau module.
//
//   npm run smoke            toutes les suites
//   npm run smoke -- plan    seulement les suites dont le nom contient « plan »
//
// ── Le bac, en premier, et avant la liste ──
//
// Cette ligne doit rester la première. La liste ci-dessous est construite avec des
// `require` : **toutes** les suites sont donc chargées, y compris pour un passage
// filtré, et l'une d'elles tire `src/store`, qui fige son répertoire de données à
// l'import. Chargé après, le bac n'aurait aucun effet — et les contrôles qui
// écrivent en processus écriraient dans le vrai `data/`. C'est ainsi que
// `data/users.json` a été détruit. `bac.js` refuse de se charger trop tard.
const bac = require('./bac');

// ── La table vit à côté, et c'est ce qui permet de l'éprouver ──
//
// Elle était ici, construite avec des `require` : la lire chargeait les vingt
// suites. `suites.js` ne porte que des chaînes — nom, port, fichier — et c'est
// le lanceur qui en tire les modules. Un contrôle peut donc vérifier qu'aucun
// port n'est partagé sans monter un navigateur (`unitaires`).
const { SUITES, choisir } = require('./suites');
// Le verrou de la campagne : il refuse d'en jouer deux à la fois (voir plus bas).
const verrouCampagne = require('./verrou-campagne');
// eslint-disable-next-line global-require, import/no-dynamic-require
const suites = SUITES.map((s) => ({ ...s, run: require(s.fichier) }));

(async () => {
  const filtre = process.argv[2];
  const choisies = choisir(suites, filtre);
  if (!choisies.length) {
    console.error(`Aucune suite ne correspond à « ${filtre} ». Disponibles : ${suites.map((s) => s.nom).join(', ')}`);
    process.exit(2);
  }

  // ── Une campagne ne double pas une autre ──
  //
  // Les seize ports sont à elle le temps qu'elle dure. Lancée par-dessus une
  // campagne en cours, la seconde rougit sur « le port 48xx répond déjà », un
  // message qui décrit un serveur orphelin d'un passage interrompu là où il n'y
  // a que le passage en cours. Fait deux jours de suite, et cherché dans le
  // code avant de le trouver dans ma propre impatience (n° 5.f.80).
  //
  // Une **suite seule** ne le prend pas — deux suites différentes tournent
  // ensemble, chacune sur son port —, mais elle le **consulte** : une campagne
  // joue tous les ports, le sien compris. Elle ne le consultait pas, et le
  // relevé des gestes s'est jeté sur la campagne d'un autre worktree (n° 5.f.91).
  const verrou = filtre ? null : verrouCampagne.prendre();
  const regard = filtre && choisies.some((s) => s.port !== 0)
    ? verrouCampagne.consulter() : null;
  const refus = (verrou && verrou.refus) || (regard && regard.refus);
  if (refus) {
    console.error(`\n✗ ${refus}\n`);
    process.exit(2);
  }
  if (verrou && verrou.repris) console.log(`  ◌ ${verrou.repris}`);

  // ── Les données de travail, relevées avant et après ──
  //
  // Le bac et son verrou empêchent la cause connue. Celui-ci dit si quelque chose
  // a quand même écrit dans `data/` — c'est la seule chose qui ne se rattrape pas,
  // et elle s'est produite sans qu'aucun contrôle ne le signale. Une empreinte par
  // fichier : taille et date, ce qui suffit à voir une réécriture.
  const empreinte = () => {
    const fs = require('fs');
    const dossier = bac.DONNEES_DE_TRAVAIL;
    if (!fs.existsSync(dossier)) return {};
    return Object.fromEntries(fs.readdirSync(dossier)
      .filter((f) => f.endsWith('.json') || f.endsWith('.jsonl'))
      .map((f) => {
        const s = fs.statSync(require('path').join(dossier, f));
        return [f, `${s.size}@${s.mtimeMs}`];
      }));
  };
  const avant = empreinte();

  // ── Et la base de travail, relevée de la même façon ──
  //
  // `data/` a un verrou et un relevé ; la base n'avait ni l'un ni l'autre. Les
  // suites qui démarrent un serveur reçoivent chacune **son schéma** — le
  // harnais le crée, y reprend les fixtures, et le détruit. Mais quatre suites
  // tournent **dans ce processus** et n'en ont pas : `unitaires` écrivait donc
  // `users`, `sessions`, `emails` et `mfa_challenges` dans le schéma `public`
  // de la base visée par `DATABASE_URL`.
  //
  // Et en régime base, `save('users', …)` **remplace la collection entière**.
  // Un `npm run smoke` lancé sur une base qui compte y aurait écrasé les
  // comptes par les quinze du jeu d'essai. C'est l'incident qui a détruit
  // `data/users.json` le 29 septembre 2026, transposé à PostgreSQL — et cette
  // fois sans aucune sauvegarde horodatée pour s'en remettre.
  //
  // La cause est corrigée (`bacBase` ci-dessous donne un schéma aux suites de
  // ce processus). Ce relevé dit si quelque chose a quand même écrit ailleurs :
  // c'est lui qui a trouvé le défaut, et c'est lui qui le tiendra fermé.
  const ADRESSE_BASE = process.env.DATABASE_URL || '';
  const empreinteBase = async () => {
    if (!ADRESSE_BASE) return null;
    // eslint-disable-next-line global-require
    const { Pool } = require('pg');
    const p = new Pool({ connectionString: ADRESSE_BASE });
    try {
      const r = await p.query(`
        SELECT 'collections:' || nom || '=' || md5(valeur::text) AS e
          FROM public.collections
        UNION ALL
        SELECT 'journal:' || nom || '=' || count(*)::text
          FROM public.journal GROUP BY nom
        ORDER BY 1`);
      return r.rows.map((x) => x.e);
    } catch (e) {
      // Les tables n'existent pas encore : c'est le cas normal d'une base
      // vierge, et il n'y a donc rien à préserver.
      return /does not exist/.test(e.message) ? [] : [`ERREUR: ${e.message}`];
    } finally {
      await p.end();
    }
  };
  const avantBase = await empreinteBase();

  // Un schéma pour les suites de ce processus, créé ici et détruit à la fin.
  // Sans lui, elles écrivent dans `public` — voir ci-dessus.
  const bacBase = ADRESSE_BASE ? await (async () => {
    const nom = `oasis_smoke_parent_${Math.random().toString(36).slice(2, 8)}`;
    // eslint-disable-next-line global-require
    const { Pool } = require('pg');
    const p = new Pool({ connectionString: ADRESSE_BASE });
    await p.query(`DROP SCHEMA IF EXISTS ${nom} CASCADE`);
    await p.query(`CREATE SCHEMA ${nom}`);
    await p.end();
    const sep = ADRESSE_BASE.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${ADRESSE_BASE}${sep}options=-c%20search_path%3D${nom}`;
    console.log(`base : les suites de ce processus écrivent dans le schéma ${nom}`);
    return nom;
  })() : null;

  const resultats = [];
  for (const s of choisies) {
    try {
      resultats.push([s.nom, await s.run(s.port)]);
    } catch (e) {
      console.error(`\n✗ ${s.nom} — exception : ${e.message}`);
      resultats.push([s.nom, false]);
    }
  }

  // Le schéma du parent part avant le relevé : ses tables sont ailleurs que
  // dans `public`, mais le détruire d'abord évite de laisser un schéma derrière
  // soi quand le relevé échoue.
  if (bacBase) {
    process.env.DATABASE_URL = ADRESSE_BASE;
    // eslint-disable-next-line global-require
    const { Pool } = require('pg');
    const p = new Pool({ connectionString: ADRESSE_BASE });
    await p.query(`DROP SCHEMA IF EXISTS ${bacBase} CASCADE`);
    await p.end();
  }

  const apresBase = await empreinteBase();
  const baseTouchee = avantBase !== null
    && JSON.stringify(avantBase) !== JSON.stringify(apresBase);
  if (baseTouchee) {
    console.error('\n✗✗ LA BASE DE TRAVAIL A ÉTÉ MODIFIÉE PAR LES CONTRÔLES ✗✗');
    console.error(`   ${ADRESSE_BASE.replace(/:\/\/[^@]*@/, '://…@')}, schéma public`);
    const tous = [...new Set([...(avantBase || []), ...(apresBase || [])])].sort();
    tous.filter((e) => !(avantBase || []).includes(e) || !(apresBase || []).includes(e))
      .forEach((e) => console.error(`   · ${e}`));
    console.error('   Une suite a écrit hors de son schéma : voir le relevé dans ce fichier.');
  }

  // Le répertoire de travail a bougé — reste à savoir par la faute de qui.
  //
  // Le garde-fou concluait qu'un module du socle avait servi le vrai
  // répertoire, et conseillait une restauration. Ce n'est qu'une des deux
  // causes : **un autre processus** peut servir ce répertoire pendant la suite
  // — le serveur de développement, que `.claude/launch.json` fait pointer sur
  // `data/` faute d'un répertoire de test. Son seul démarrage touche les
  // fichiers et ajoute son entrée au journal. Accuser les contrôles est alors
  // faux, et conseiller une restauration est pire : elle réécrirait un journal
  // chaîné qu'il ne faut pas toucher.
  //
  // Le verrou d'ADR-001 porte le numéro du processus qui tient le répertoire.
  // On le lit avant d'accuser.
  const tenant = (() => {
    try {
      // `fs` n'est en portée que dans `empreinte` : on le reprend ici.
      const fs = require('fs');
      const path = require('path');
      const v = JSON.parse(fs.readFileSync(path.join(bac.DONNEES_DE_TRAVAIL, '.verrou'), 'utf8'));
      if (!v || typeof v.pid !== 'number' || v.pid === process.pid) return null;
      // Un verrou périmé n'accuse personne : le processus doit vivre.
      try { process.kill(v.pid, 0); } catch { return null; }
      return v;
    } catch { return null; }
  })();

  const apres = empreinte();
  const touches = Object.keys({ ...avant, ...apres }).filter((f) => avant[f] !== apres[f]);
  if (touches.length && tenant) {
    console.error('\n✗✗ UN AUTRE PROCESSUS SERT LE RÉPERTOIRE DE TRAVAIL ✗✗');
    console.error(`   ${bac.DONNEES_DE_TRAVAIL}`);
    touches.forEach((f) => console.error(`   · ${f} — ${avant[f] || '(absent)'} → ${apres[f] || '(effacé)'}`));
    console.error(`   Tenu par le processus ${tenant.pid}${tenant.machine ? ` sur ${tenant.machine}` : ''} :`);
    console.error(`     ps -p ${tenant.pid} -o pid,command`);
    console.error('   Ce ne sont donc pas les contrôles qui ont écrit, et il n’y a rien');
    console.error('   à restaurer : une restauration réécrirait le journal chaîné.');
    console.error('   Faire servir un répertoire de test à ce processus — pour le serveur');
    console.error('   de développement, un OASIS_DATA_DIR dans .claude/launch.json.');
  } else if (touches.length) {
    console.error('\n✗✗ LES DONNÉES DE TRAVAIL ONT ÉTÉ MODIFIÉES PAR LES CONTRÔLES ✗✗');
    console.error(`   ${bac.DONNEES_DE_TRAVAIL}`);
    touches.forEach((f) => console.error(`   · ${f} — ${avant[f] || '(absent)'} → ${apres[f] || '(effacé)'}`));
    console.error('   Aucun autre processus ne tient ce répertoire : un module du socle');
    console.error('   l’a servi lui-même — voir tests/smoke/bac.js.');
    console.error('   Restaurer depuis sauvegardes/ avant toute autre chose.');
  }
  bac.effacer();

  console.log('\n═══ Bilan ═══');
  resultats.forEach(([nom, ok]) => console.log(` ${ok ? '✓' : '✗'} ${nom}`));
  process.exit(resultats.every(([, ok]) => ok) && !touches.length && !baseTouchee ? 0 : 1);
})();
