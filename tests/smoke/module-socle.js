// OASIS — Le socle des suites de navigateur d'un module : SURV d'abord, PLAN ensuite.
//
// ── Né pour SURV, ouvert à PLAN le 14 novembre 2026 ──
//
// Il s'appelait `surv-socle.js`. La première suite de PLAN qui n'est pas
// `planification.navigateur.smoke.js` avait besoin de la même mise en place —
// et la copier aurait fait deux socles qui divergent, le défaut que ce fichier
// est né pour éviter. Trois choses seulement distinguent un module d'un autre :
// son chemin, l'élément où il pose son contenu, et la largeur de fenêtre que sa
// suite d'origine emploie. Elles sont des paramètres ; `surv-socle.js` les
// fixe pour SURV, et ses treize suites n'ont pas bougé (ADR-003, n° 5.f.99).
//
// ── Pourquoi ce fichier existe ──
//
// `surv.smoke.js` a atteint **8 726 lignes**, et le garde-fou de taille l'a dit
// deux tours de suite. Son découpage était nommé dans l'ADR depuis trois tours ;
// il ne pouvait pas commencer, parce que **toute ronde a besoin de la même mise
// en place** : un sas de messagerie, un serveur, un navigateur au délai de
// protocole relevé, le mouchard des gestes, le relevé des incidents de console
// avec ses refus déclarés, et une session ouverte sur l'écran du module. Couper
// le fichier en deux sans extraire cela aurait fait **deux copies** de cent dix
// lignes qui divergeraient — le défaut que ce dépôt rencontre le plus souvent,
// et qu'il vient justement de refermer sur les huit dépôts de pièces du module
// (n° 5.f.81).
//
// La mise en place vit donc ici, et chaque suite de SURV n'est plus que ses
// rondes. *Un fichier qu'on n'arrive pas à couper n'est pas trop long : il est
// trop lié.*
//
// ── Ce que le socle décide, et ce qu'il laisse à chaque suite ──
//
// Il décide tout ce qui est commun et rien de ce qui est propre. En
// particulier, les **déclarations** — refus attendus, messages de console
// attendus, abandons de navigation attendus — sont passées par chaque suite :
// elles disent ce que *ses* rondes provoquent exprès, et le socle vérifie
// qu'elles sont toutes venues. Une déclaration portée par le socle pour le
// compte d'une autre suite deviendrait une déclaration muette, c'est-à-dire un
// filtre qui cache au lieu de dispenser.
//
// Les trois contrôles de fin — console propre, déclarations toutes venues,
// abandons tous venus — appartiennent donc à **chaque** suite, et non à la
// première : une suite qui salirait la console sans avoir le contrôle qui la
// regarde ne serait pas éprouvée du tout.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan, abandonsAttendus } = require('./harness');
// Un serveur de messagerie d'essai : sans lui, la transmission d'un rapport
// n'était mesurable que par son refus (voir `messagerie-essai.js`).
const messagerie = require('./messagerie-essai');

const RACINE = path.join(__dirname, '..', '..');
// Les valeurs de SURV, que `surv-socle.js` passe telles quelles.
const SURV = { module: 'execution', contenu: 'exec-content', largeur: 1280 };
const M = `/api/m/${SURV.module}`;
const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

/**
 * Mène une suite de navigateur sur l'écran d'un module.
 *
 * `rondes` reçoit le contexte et fait le travail ; tout le reste est ici.
 *
 * @param {object} o
 * @param {number} o.port         le port de la suite (voir `suites.js`)
 * @param {string} o.nom          le nom du bilan — « SURV », « SURV (pièces) »
 * @param {string} o.titre        la ligne annoncée au début de la suite
 * @param {Array}  [o.refus]      les refus HTTP que ses rondes provoquent exprès
 * @param {Array}  [o.messages]   les messages de console qu'elles provoquent exprès
 * @param {Array}  [o.abandons]   les abandons de navigation qu'elles provoquent
 * @param {Function} o.rondes     async (ctx) => void
 * @param {object}  [o.ecran]     { module, contenu, largeur } — SURV par défaut
 */
async function surModule({
  port, nom, titre, refus = [], messages = [], abandons: abandonsDeclares = [], rondes,
  ecran = SURV,
}) {
  const api = `/api/m/${ecran.module}`;
  console.log(`\n── ${titre} ──`);

  // ── Le sas de messagerie se lève **avant** le serveur ──
  //
  // Le serveur lit l'adresse de sa messagerie au démarrage, et le sas reçoit
  // son port du système : il faut donc le connaître avant de lancer le serveur.
  // `sas.env` porte les deux variables qui l'y dirigent.
  const sas = await messagerie.demarrer();
  const srv = await demarrer({ port, env: sas.env });
  let navigateur = null;
  const incidents = [];
  try {
    // ── Le délai de protocole, et une campagne rougie par la charge ──
    //
    // Le 20 octobre 2026, `planification-navigateur` a rendu
    // « Runtime.callFunctionOn timed out » au terme d'une campagne de huit
    // suites de navigateur — et la même suite, rejouée seule, a passé. Ce
    // n'était pas un défaut de l'écran : c'était le **délai de protocole par
    // défaut** de Puppeteer, atteint sous la charge.
    //
    // Un aléa qui fait rougir une campagne coûte autant qu'un vrai défaut :
    // il faut le lire, le rejouer, l'écarter. Le délai est donc posé — cinq
    // minutes, bien au-delà de toute évaluation que ces rondes demandent, et
    // bien en dessous d'un blocage réel, qui doit toujours finir par rendre.
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });
    // Le mouchard des gestes, posé seulement si `OASIS_MOUCHARD` l'est — même
    // règle que la suite « parcours », et pour la même raison : l'outil
    // instrumente la vraie suite au lieu d'en rejouer une imitation.
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: ecran.largeur || 1280, height: 900 });

    // La console est relevée **dès la première page**, et les incidents de la
    // connexion sont écartés : une erreur de la page de connexion passerait
    // sinon pour une erreur du module.
    let dansLeModule = false;
    let etape = 'montage';
    // ── Les refus déclarés laissent aussi une trace en console ──
    //
    // « Failed to load resource: … 409 », **sans l'adresse** — c'est la cécité
    // du message que 5.f.6 avait déjà relevée. On tient donc le compte des
    // refus déclarés rencontrés, et l'on dispense le message de console qui
    // porte **le même code**. Rien de plus large : un 409 non déclaré garde son
    // message, et un message dont le code n'a pas été déclaré reste un
    // incident.
    const codesAttendus = new Set();
    // ── Et les traces que l'écran écrit **lui-même** ──
    //
    // Un refus déclaré dispense le message qui porte son code. Il ne dispense
    // pas la trace que l'écran écrit de son côté — `console.error('Upload PJ
    // error:', e)` — et cette trace est **voulue** : un téléversement qui échoue
    // doit laisser de quoi diagnostiquer, refus propre ou panne de réseau,
    // l'écran ne sachant pas d'avance lequel.
    //
    // Elle se déclare donc comme un refus, et de la même façon : un motif, sa
    // raison, et le compte de ses venues. *Déclarer n'est pas taire* — le
    // contrôle de fin exige que chaque déclaration ait servi, faute de quoi
    // elle est devenue un filtre muet.
    const MESSAGES_ATTENDUS = messages.map((x) => ({ ...x, vus: 0 }));
    page.on('console', (m) => {
      if (!dansLeModule || m.type() !== 'error') return;
      const texte = m.text();
      const code = (/status of (\d{3})/.exec(texte) || [])[1];
      if (code && codesAttendus.has(Number(code))) return;
      const declare = MESSAGES_ATTENDUS.find((x) => x.motif.test(texte));
      if (declare) { declare.vus += 1; return; }
      incidents.push(`[${etape}] console : ${texte.slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (dansLeModule) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    // ── Les abandons de navigation qu'une ronde provoque ──
    //
    // `execResetMesUserPw` pose `window.location.href = 'mailto:…'` pour que
    // l'administrateur transmette le nouveau mot de passe. Le navigateur mène
    // la fenêtre à l'adresse, n'a pas de protocole pour la servir, et
    // **abandonne la navigation** — `net::ERR_ABORTED`, sans code de réponse.
    //
    // Déclarer n'est pas taire : le contrôle d'`abandons` exige que l'abandon
    // soit venu. S'il cessait de venir — parce que le geste aurait cessé de
    // composer le courriel —, la déclaration deviendrait un filtre muet.
    const abandons = abandonsAttendus(abandonsDeclares);
    page.on('requestfailed', (r) => {
      if (!dansLeModule) return;
      const chemin = r.url().replace(srv.base, '');
      const motif = String(((r.failure() || {}).errorText) || '');
      if (abandons.attendu(motif, chemin)) return;
      incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    // ── La réponse, et non le seul message de console ──
    //
    // Un 404 se présente en console comme « Failed to load resource », **sans
    // l'adresse**. Le premier passage de la ronde du dossier en a signalé un, et
    // il a fallu réinstrumenter pour savoir lequel. On relève donc la réponse :
    // son code et son adresse, ce qui rend l'incident actionnable au lieu
    // d'énigmatique.
    //
    // Les refus qu'une ronde **provoque exprès** sont déclarés par sa suite, un
    // par un, avec leur code, leur adresse et leur raison. Pas de filtre large :
    // un 409 ailleurs reste un incident, et une déclaration qui cesserait de
    // correspondre cesserait de dispenser.
    page.on('response', (r) => {
      if (!dansLeModule || r.status() < 400) return;
      const chemin = r.url().replace(srv.base, '');
      const attendu = refus.some((x) => x.code === r.status()
        && x.methode === r.request().method() && x.chemin.test(chemin));
      if (attendu) { codesAttendus.add(r.status()); return; }
      incidents.push(`[${etape}] ${r.status()} ${chemin.slice(0, 120)}`);
    });

    // ── La session, puis l'écran ──
    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    dansLeModule = true;
    await page.goto(`${srv.base}/modules/${ecran.module}/index.html`, { waitUntil: 'networkidle2' });
    // Le module monte sa coquille puis charge ses données : on attend la barre,
    // et non un délai fixe.
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      (id) => {
        const el = document.getElementById(id);
        return el && el.textContent.trim().length > 200;
      },
      { timeout: 20000 },
      ecran.contenu,
    ).catch(() => { /* le contrôle qui suit le dira */ });

    // ── Le jalon, et pourquoi c'est une fonction ──
    //
    // Les trois écouteurs ci-dessus étiquettent chaque incident par l'endroit où
    // la ronde en était. C'était une variable que les rondes réaffectaient ;
    // elles vivent maintenant dans un autre fichier, et une variable ne se
    // réaffecte pas d'un fichier à l'autre. `jalon('…')` la pose.
    await rondes({
      srv, page, navigateur, sas, M: api, incidents,
      jalon: (v) => { etape = v; },
      abandons,
    });

    verifier(`aucune erreur de console ni requête échouée sur ${nom}`,
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
    // ── Une déclaration qui ne correspond plus ne dispense plus rien ──
    //
    // Elle **cache**. Chacune doit donc être venue — et le contrôle n'est posé
    // que s'il y a quelque chose à vérifier : une suite qui ne déclare rien
    // n'a pas besoin d'un contrôle qui serait vrai sans rien regarder.
    // `abandons.verifier` applique déjà cette règle de son côté, en rougissant
    // sur une liste vide.
    if (MESSAGES_ATTENDUS.length) {
      const muettes = MESSAGES_ATTENDUS.filter((x) => x.vus === 0);
      verifier(`chaque message de console déclaré est bien venu : aucune déclaration muette (${nom})`,
        muettes.length === 0,
        muettes.length ? muettes.map((x) => String(x.motif)).join(' · ')
          : MESSAGES_ATTENDUS.map((x) => `${x.motif.source.slice(0, 28)} ×${x.vus}`).join(' · '));
    }
    if (abandonsDeclares.length) abandons.verifier(nom);
  } finally {
    // Le journal du mouchard, relevé avant de fermer : une page fermée n'a plus
    // de `window`, et le relevé rendrait zéro geste — la mesure de rien,
    // présentée comme une couverture nulle.
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = {
        enLigne: [], ecouteurs: [], propriete: [], jsx: [], barre: [], poses: 0, pages: 0,
      };
      for (const p of await navigateur.pages()) {
        try {
          /* eslint-disable no-await-in-loop */
          const j = await p.evaluate(() => {
            const d = JSON.parse(localStorage.getItem('__oasis_gestes') || 'null');
            return { durable: d, vivante: !!window.__gestes, poses: window.__gestes ? window.__gestes.poses : 0 };
          });
          if (j.vivante) { vu.pages += 1; vu.poses += j.poses; }
          if (j.durable && !vu.enLigne.length) {
            vu.enLigne.push(...j.durable.enLigne);
            vu.ecouteurs.push(...j.durable.ecouteurs);
            vu.propriete.push(...(j.durable.propriete || []));
            vu.jsx.push(...(j.durable.jsx || []));
            // Les actions remises au socle : quatrième canal du
            // mouchard (ADR-003, 5.f.43).
            vu.barre.push(...(j.durable.barre || []));
          }
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
    await sas.arreter();
  }
  return bilan(nom);
}

module.exports = {
  surModule, SURV, M, IDENTIFIANT, MOT_DE_PASSE, RACINE,
};
