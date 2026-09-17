#!/usr/bin/env node
// OASIS — reprise des restes laissés par d'anciennes suppressions.
//
// Les routes de suppression corrigées en septembre 2026 emportent désormais
// ce qui n'existe que par l'enregistrement supprimé. Avant elles, trois sortes
// de restes s'étaient accumulées ; ce script les retire, une fois.
//
//   1. Planification — décisions de circuit, avis et versions d'un plan
//      disparu : plus aucun écran ne les atteint.
//   2. Planification — amendement dont le plan parent a disparu : il est
//      détaché de ce parent et devient la tête de sa lignée. L'identifiant
//      disparu est conservé sous `parent_disparu`.
//   3. Exécution de la Surveillance — réponses de checklist d'un dossier
//      disparu.
//
// Usage :
//   node scripts/reprise-orphelins.js              relevé à blanc, rien n'est écrit
//   node scripts/reprise-orphelins.js --appliquer  reprise, tracée au journal d'audit
//
// Sauvegarder d'abord : scripts/sauvegarde.sh. Le script est idempotent : une
// fois passé, il ne trouve plus rien. Il ne touche jamais aux deux journaux
// d'audit chaînés, sinon pour y ajouter une entrée par la voie ordinaire.
const store = require('../src/store');
const audit = require('../src/audit');

const APPLIQUER = process.argv.includes('--appliquer');

const pl = store.load('planification', {});
const ex = store.load('execution', {});

const plans = new Set((pl.plans || []).map((p) => p.id));
const dossiers = new Set((ex.dossiers || []).map((d) => d.id));

const releve = {};

// 1. Restes de plans disparus.
['workflow', 'commentaires', 'versions'].forEach((coll) => {
  const restes = (pl[coll] || []).filter((x) => x.plan_id && !plans.has(x.plan_id));
  releve[`planification.${coll}`] = {
    nombre: restes.length,
    plans_disparus: [...new Set(restes.map((x) => x.plan_id))],
  };
  if (APPLIQUER && restes.length) pl[coll] = pl[coll].filter((x) => !restes.includes(x));
});

// 2. Amendements rattachés à un parent disparu.
const detaches = (pl.plans || []).filter((p) => p.parent_plan_id && !plans.has(p.parent_plan_id));
releve['planification.plans (parent disparu)'] = {
  nombre: detaches.length,
  plans: detaches.map((p) => ({ id: p.id, titre: p.titre, version: p.version, parent_disparu: p.parent_plan_id })),
};
if (APPLIQUER) {
  detaches.forEach((p) => {
    p.parent_disparu = p.parent_plan_id;
    p.parent_plan_id = '';
  });
}

// 3. Réponses de checklist d'un dossier disparu.
const reponses = (ex.checklist_responses || []).filter((r) => r.dossier_id && !dossiers.has(r.dossier_id));
releve['execution.checklist_responses'] = {
  nombre: reponses.length,
  dossiers_disparus: [...new Set(reponses.map((r) => r.dossier_id))],
};
if (APPLIQUER && reponses.length) {
  ex.checklist_responses = ex.checklist_responses.filter((r) => !reponses.includes(r));
}

const total = Object.values(releve).reduce((n, r) => n + r.nombre, 0);
console.log(JSON.stringify(releve, null, 2));
console.log(`\n${total} élément(s) ${APPLIQUER ? 'repris' : 'à reprendre'}${APPLIQUER ? '' : ' — relevé à blanc, rien n’a été écrit'}.`);

if (APPLIQUER && total) {
  store.save('planification', pl);
  store.save('execution', ex);
  audit.log('système', 'REPRISE_ORPHELINS', Object.fromEntries(
    Object.entries(releve).map(([k, r]) => [k, r.nombre]),
  ));
  console.log('Reprise tracée au journal d’audit.');
}
