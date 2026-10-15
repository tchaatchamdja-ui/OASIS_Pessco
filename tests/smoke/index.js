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

const suites = [
  { nom: 'socle', port: 4791, run: require('./socle.smoke') },
  { nom: 'profil-risque', port: 4792, run: require('./profil-risque.smoke') },
  { nom: 'planification', port: 4793, run: require('./planification.smoke') },
  { nom: 'droits', port: 4794, run: require('./droits.smoke') },
  { nom: 'execution', port: 4795, run: require('./execution.smoke') },
  { nom: 'mesures', port: 4796, run: require('./mesures.smoke') },
  { nom: 'ramp', port: 4797, run: require('./ramp.smoke') },
  // Garde-fou de taille : ne démarre aucun serveur, lit les sources.
  { nom: 'taille', port: 0, run: require('./taille.smoke') },
  // Garde-fou des traductions : même chose, sur les tables de libellés.
  { nom: 'traductions', port: 0, run: require('./traductions.smoke') },
  // Unitaires : les règles prises à part, sans passer par HTTP.
  { nom: 'unitaires', port: 0, run: require('./unitaires.smoke') },
  // Magasin PostgreSQL : ce qu'une base de papier ne peut pas dire. Cinq
  // contrôles lisent le schéma ; les douze autres demandent OASIS_PG_ESSAI.
  { nom: 'magasin-pg', port: 0, run: require('./magasin-pg.smoke') },
  // Authentification à deux facteurs : son propre serveur, avec OASIS_MFA=1.
  // Aucune autre suite ne la traverse — elle est éteinte partout ailleurs.
  { nom: 'mfa', port: 4799, run: require('./mfa.smoke') },
  // Parcours : les écrans dans un vrai navigateur, console comprise.
  { nom: 'parcours', port: 4798, run: require('./parcours.smoke') },
  // Frontend : ce que le TypeScript affirme du socle global, vérifié dans un
  // navigateur. Une déclaration n'est pas une mesure — deux défauts l'ont dit.
  { nom: 'frontend', port: 4790, run: require('./frontend.smoke') },
  // SURV dans un navigateur : la suite n° 0.b du premier des cinq écrans de
  // module (ADR-003, 5.f.1). Un écran, une suite — « parcours » porte déjà
  // 3 200 lignes, et le relevé des gestes lance la suite de l'écran qu'il mesure.
  { nom: 'surv', port: 4797, run: require('./surv.smoke') },
  // RAMP dans un navigateur : la suite n° 0.b du deuxième écran de module
  // (ADR-003, 5.f.14). Son nom porte « navigateur » pour que le filtre de
  // l'argument la distingue de `ramp`, la suite HTTP du même module — le relevé
  // des gestes lance la suite par son nom, et deux noms dont l'un contient
  // l'autre lui en feraient lancer deux.
  { nom: 'ramp-navigateur', port: 4797, run: require('./ramp.navigateur.smoke') },
  // DROITS dans un navigateur : le plus petit des six écrans, et le seul
  // entièrement converti. C'est lui qui a montré que le mouchard était aveugle
  // aux gestionnaires de React (ADR-003, 5.f.16).
  { nom: 'droits-navigateur', port: 4797, run: require('./droits.navigateur.smoke') },
  // PLAN dans un navigateur : le quatrième écran à recevoir sa suite
  // (ADR-003, 5.f.17). Son nom porte « navigateur » pour que le filtre de
  // l'argument la distingue de `planification`, la suite HTTP du même module.
  { nom: 'planification-navigateur', port: 4797, run: require('./planification.navigateur.smoke') },
  // CARE et PR dans un navigateur : les deux derniers des six écrans
  // (ADR-003, 5.f.18). Les six sont désormais mesurés, et plus un seul n'est
  // dispensé pour absence d'instrument.
  { nom: 'mesures-navigateur', port: 4797, run: require('./mesures.navigateur.smoke') },
  { nom: 'profil-risque-navigateur', port: 4797, run: require('./profil-risque.navigateur.smoke') },
];

(async () => {
  const filtre = process.argv[2];
  const choisies = filtre ? suites.filter((s) => s.nom.includes(filtre)) : suites;
  if (!choisies.length) {
    console.error(`Aucune suite ne correspond à « ${filtre} ». Disponibles : ${suites.map((s) => s.nom).join(', ')}`);
    process.exit(2);
  }

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

  const apres = empreinte();
  const touches = Object.keys({ ...avant, ...apres }).filter((f) => avant[f] !== apres[f]);
  if (touches.length) {
    console.error('\n✗✗ LES DONNÉES DE TRAVAIL ONT ÉTÉ MODIFIÉES PAR LES CONTRÔLES ✗✗');
    console.error(`   ${bac.DONNEES_DE_TRAVAIL}`);
    touches.forEach((f) => console.error(`   · ${f} — ${avant[f] || '(absent)'} → ${apres[f] || '(effacé)'}`));
    console.error('   Un module du socle a servi le vrai répertoire : voir tests/smoke/bac.js.');
    console.error('   Restaurer depuis sauvegardes/ avant toute autre chose.');
  }
  bac.effacer();

  console.log('\n═══ Bilan ═══');
  resultats.forEach(([nom, ok]) => console.log(` ${ok ? '✓' : '✗'} ${nom}`));
  process.exit(resultats.every(([, ok]) => ok) && !touches.length && !baseTouchee ? 0 : 1);
})();
