// Module « Planification de la Surveillance » — accès aux données.
// Six collections dans `planification` : plans, activités, workflow, versions,
// commentaires et cycles de surveillance.
//
// En base depuis ADR-002, jalon n° 13. Le vocabulaire commun aux cinq modules —
// `list`, `get`, `insert`, `update`, `remove`, `transformer` — vit dans
// `src/magasin_module.js`, dont l'en-tête dit ce que `transformer` empêche.
//
// Ce module est celui où la composition compte le plus : valider un plan pose son
// statut, reporte les avis saisis activité par activité, retire les versions
// remplacées **et** inscrit la décision au circuit. C'était jusqu'à une dizaine
// d'écritures ; c'est une transformation.
const { magasinDeModule } = require('../../magasin_module');

const base = magasinDeModule('planification');

// ── Une septième collection, et pourquoi elle existe ──
//
// `profils_directs` porte les profils de risque **écrits depuis cet écran**.
// Le producteur normal d'un profil est le module PR : il le **dérive** d'une
// évaluation validée (`PR.riskProfiles` est une projection, non une table), et
// le bus de services est à sens unique. L'écran de PLAN portait pourtant un
// formulaire qui en fabriquait un, dont l'enregistrement postait vers une route
// qui n'existait pas — un geste mort depuis l'origine.
//
// La maîtrise d'ouvrage a tranché le 4 novembre 2026 : écrire la route. Un
// profil ainsi posé n'a derrière lui ni évaluation, ni instance, ni validation,
// et il alimente les plans au même titre que ceux qui en ont une. Il porte donc
// `origine: 'plan'`, son auteur et sa date : *dans un dispositif audité, un
// acte d'autorité se distingue de celui qu'un circuit a fondé.*
const VIDE = {
  plans: [], activites: [], workflow: [], versions: [], commentaires: [], cycles: [],
  profils_directs: [],
};

async function seed() {
  const existant = await base.load();
  if (!Object.keys(existant).length) {
    await base.save({ ...VIDE });
    return;
  }
  await retirerLesVersionsRemplacees();
}

// Une version remplacée par la suivante était rangée aux archives, avec les
// plans qu'on y range à leur terme : deux sorts distincts sous un même statut.
// Elle porte désormais le sien — « remplace » —, et les données déjà en place
// le reprennent au démarrage.
async function retirerLesVersionsRemplacees() {
  await base.transformer((d) => {
    let touche = 0;
    (d.plans || []).forEach((p) => {
      if (p.statut === 'archive' && p.remplace_par) { p.statut = 'remplace'; touche += 1; }
    });
    return touche ? d : base.INCHANGE;
  });
}

module.exports = { ...base, seed };
