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

  const resultats = [];
  for (const s of choisies) {
    try {
      resultats.push([s.nom, await s.run(s.port)]);
    } catch (e) {
      console.error(`\n✗ ${s.nom} — exception : ${e.message}`);
      resultats.push([s.nom, false]);
    }
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
  process.exit(resultats.every(([, ok]) => ok) && !touches.length ? 0 : 1);
})();
