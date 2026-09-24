// OASIS — Tests de fumée : `npm run smoke`
//
// Un fichier par module, plus le socle. Chaque suite démarre son propre
// serveur sur une copie temporaire de data/ : la base de travail n'est jamais
// touchée. Le filet minimal avant d'intégrer un nouveau module.
//
//   npm run smoke            toutes les suites
//   npm run smoke -- plan    seulement les suites dont le nom contient « plan »
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
];

(async () => {
  const filtre = process.argv[2];
  const choisies = filtre ? suites.filter((s) => s.nom.includes(filtre)) : suites;
  if (!choisies.length) {
    console.error(`Aucune suite ne correspond à « ${filtre} ». Disponibles : ${suites.map((s) => s.nom).join(', ')}`);
    process.exit(2);
  }

  const resultats = [];
  for (const s of choisies) {
    try {
      resultats.push([s.nom, await s.run(s.port)]);
    } catch (e) {
      console.error(`\n✗ ${s.nom} — exception : ${e.message}`);
      resultats.push([s.nom, false]);
    }
  }

  console.log('\n═══ Bilan ═══');
  resultats.forEach(([nom, ok]) => console.log(` ${ok ? '✓' : '✗'} ${nom}`));
  process.exit(resultats.every(([, ok]) => ok) ? 0 : 1);
})();
