/* OASIS — Travailler sans réseau, et le savoir.
 *
 * Les TDR déclarent le mode dégradé **obligatoire** pour les activités de
 * terrain (fiche technique §2, contrainte n° 3). Un inspecteur sur une aire de
 * trafic remplit sa fiche devant l'appareil ; le réseau, lui, n'est pas garanti.
 *
 * Le service worker (`/sw.js`) sert les écrans déjà vus. Ce fichier-ci fait le
 * reste : il retient les écritures que le réseau n'a pas pu porter, les rejoue
 * quand il revient, et — c'est le plus important — **le montre**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CE QUI PEUT ÊTRE DIFFÉRÉ, ET CE QUI NE LE PEUT PAS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Toutes les écritures ne se valent pas. Différer la saisie d'une fiche
 * d'inspection est le but même du mode dégradé. Différer une validation, une
 * transmission à l'exploitant ou une clôture d'écart serait autre chose : ce
 * sont des actes d'autorité, pris par quelqu'un qui décide, à un moment qui
 * compte. Les rejouer trois heures plus tard sur un dossier qui a bougé
 * entre-temps, c'est signer à l'aveugle.
 *
 * La table `DIFFERABLES` nomme donc les seules écritures admises — la saisie,
 * le brouillon, les commentaires. Tout le reste échoue franchement, avec un
 * message qui dit qu'il faut du réseau. **Une liste d'autorisation, jamais une
 * liste d'exclusion** : ce qu'on oublie d'y inscrire est refusé, et c'est le
 * bon sens du refus.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CE QUE L'AGENT VOIT, ET POURQUOI C'EST LA PARTIE QUI COMPTE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Une écriture différée rend un 202 à l'écran qui l'a demandée, et cet écran
 * affichera « enregistré ». C'est vrai du point de vue de l'agent — sa saisie
 * est retenue et ne se perdra pas — mais ce n'est pas encore vrai du serveur.
 *
 * Cet écart ne se rattrape pas au cas par cas : il y a des centaines d'appels
 * dans les six modules. Il se rattrape par le bandeau, qui reste à l'écran tant
 * qu'il y a quelque chose en attente et qui dit combien. L'agent travaille en
 * sachant où il en est ; c'est la seule honnêteté possible ici, et elle vaut
 * mieux qu'un silence.
 *
 * Un rejeu qui échoue ne disparaît jamais. Il passe en « à reprendre », avec sa
 * date de saisie et la raison du refus, et il y reste jusqu'à ce qu'un humain
 * s'en occupe. Perdre une saisie de terrain en silence serait le pire défaut
 * que ce fichier puisse avoir.
 */
(function horsLigne() {
  if (window.__oasisHorsLigne) return;
  window.__oasisHorsLigne = true;

  const BASE = 'oasis-hors-ligne';
  const MAGASIN = 'file';
  const VERSION_BASE = 1;

  // ── Ce qui peut attendre le réseau ──
  // Saisie et brouillon seulement. Les transitions de circuit — soumettre,
  // valider, renvoyer, transmettre, clôturer — en sont délibérément absentes.
  const DIFFERABLES = [
    // RAMP : la fiche d'inspection sur l'aire de trafic (le POI). L'inspecteur
    // la remplit devant l'appareil — c'est le cas que les TDR visent en propre.
    { methode: 'POST', motif: /^\/api\/m\/ramp\/poi$/, quoi: 'fiche d’inspection' },
    { methode: 'PUT', motif: /^\/api\/m\/ramp\/poi\/[^/]+$/, quoi: 'fiche d’inspection' },
    { methode: 'PUT', motif: /^\/api\/m\/ramp\/poi\/[^/]+\/commentaires$/, quoi: 'commentaires de la fiche' },

    // SURV : le dossier rempli sur site, et les constatations qu'on y relève.
    // Les bornes `$` comptent : elles écartent `/submit`, `/close`, `/return`,
    // `/transmettre`, `/validate-pac` — des actes, non de la saisie.
    { methode: 'PUT', motif: /^\/api\/m\/execution\/dossiers\/[^/]+$/, quoi: 'dossier de surveillance' },
    { methode: 'POST', motif: /^\/api\/m\/execution\/constatations$/, quoi: 'constatation' },
    { methode: 'PUT', motif: /^\/api\/m\/execution\/constatations\/[^/]+$/, quoi: 'constatation' },
  ];

  const differable = (methode, chemin) =>
    DIFFERABLES.find((d) => d.methode === methode && d.motif.test(chemin)) || null;

  // ── La file, dans IndexedDB ──
  // `localStorage` ne tiendrait pas : les fiches SAFA portent 54 items et leurs
  // constats, et il plafonne à quelques mégaoctets partagés avec le reste.
  let basePromesse = null;
  function base() {
    if (basePromesse) return basePromesse;
    basePromesse = new Promise((resoudre, rejeter) => {
      const d = indexedDB.open(BASE, VERSION_BASE);
      d.onupgradeneeded = () => {
        if (!d.result.objectStoreNames.contains(MAGASIN)) {
          d.result.createObjectStore(MAGASIN, { keyPath: 'id', autoIncrement: true });
        }
      };
      d.onsuccess = () => resoudre(d.result);
      d.onerror = () => rejeter(d.error);
    });
    return basePromesse;
  }

  function transaction(mode, geste) {
    return base().then((db) => new Promise((resoudre, rejeter) => {
      const t = db.transaction(MAGASIN, mode);
      const r = geste(t.objectStore(MAGASIN));
      t.oncomplete = () => resoudre(r && r.result !== undefined ? r.result : undefined);
      t.onerror = () => rejeter(t.error);
      t.onabort = () => rejeter(t.error);
    }));
  }

  const enfiler = (entree) => transaction('readwrite', (m) => m.add(entree));
  const toute = () => transaction('readonly', (m) => m.getAll());
  const retirer = (id) => transaction('readwrite', (m) => m.delete(id));
  const remplacer = (entree) => transaction('readwrite', (m) => m.put(entree));

  // ── L'état, et ceux qui l'écoutent ──
  const etat = { enLigne: navigator.onLine, enAttente: 0, aReprendre: 0, rejeuEnCours: false };
  const auditeurs = new Set();
  const prevenir = () => auditeurs.forEach((f) => { try { f({ ...etat }); } catch (e) { /* un écran sourd n'arrête rien */ } });

  async function recompter() {
    const tout = await toute().catch(() => []);
    etat.enAttente = tout.filter((e) => !e.echec).length;
    etat.aReprendre = tout.filter((e) => e.echec).length;
    prevenir();
    dessiner();
  }

  // ── Le rejeu ──
  // Dans l'ordre de saisie : une fiche créée puis modifiée doit être créée
  // avant d'être modifiée, sans quoi la modification tombe sur un néant.
  async function rejouer() {
    if (etat.rejeuEnCours || !navigator.onLine) return;
    etat.rejeuEnCours = true;
    prevenir();
    try {
      const tout = (await toute().catch(() => []))
        .filter((e) => !e.echec)
        .sort((a, b) => a.id - b.id);
      for (const entree of tout) {
        let reponse;
        try {
          reponse = await window.fetch(entree.url, {
            method: entree.methode,
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Differe': entree.capture },
            body: entree.corps,
          });
        } catch (e) {
          // Le réseau est retombé : on s'arrête là, l'ordre est préservé et le
          // reste attendra le prochain retour.
          break;
        }
        if (reponse.ok) {
          await retirer(entree.id);
        } else {
          // Refusé par le serveur : le dossier a bougé, les droits ont changé,
          // la saisie est invalide. On ne la jette pas — un humain tranchera.
          const detail = await reponse.text().catch(() => '');
          await remplacer({
            ...entree,
            echec: true,
            statut: reponse.status,
            raison: detail.slice(0, 300),
            echoueLe: new Date().toISOString(),
          });
        }
        await recompter();
      }
    } finally {
      etat.rejeuEnCours = false;
      await recompter();
    }
  }

  // ── L'enveloppe de fetch ──
  // Elle vient **après** celle d'`oasis-requete.js` : l'en-tête d'origine
  // applicative est déjà posé quand on arrive ici.
  const fetchAvant = window.fetch.bind(window);

  window.fetch = async function fetchHorsLigne(entree, options) {
    const o = options || {};
    const methode = String(o.method || (entree instanceof Request ? entree.method : 'GET')).toUpperCase();
    let url;
    try {
      url = new URL(typeof entree === 'string' ? entree : entree.url, window.location.href);
    } catch { return fetchAvant(entree, options); }

    const aNous = url.origin === window.location.origin;
    // Le rejeu se marque lui-même : sans cela, une écriture rejouée qui
    // échouerait sur le réseau se remettrait dans la file qu'elle quitte.
    const estRejeu = o.headers && new Headers(o.headers).has('X-OASIS-Differe');
    if (!aNous || methode === 'GET' || estRejeu) return fetchAvant(entree, options);

    const admis = differable(methode, url.pathname);
    try {
      const reponse = await fetchAvant(entree, options);
      // Une écriture passée alors que la file n'est pas vide : le réseau est
      // revenu sans que l'évènement l'ait dit. On en profite.
      if (reponse.ok && etat.enAttente) rejouer();
      return reponse;
    } catch (e) {
      // Panne de réseau — et non une erreur du serveur, qui aurait répondu.
      if (!admis) throw e;
      const corps = typeof o.body === 'string' ? o.body : null;
      if (corps === null) throw e;   // un téléversement ne se met pas en file
      await enfiler({
        methode, url: url.pathname + url.search, corps,
        quoi: admis.quoi, capture: new Date().toISOString(), echec: false,
      });
      await recompter();
      return new Response(
        JSON.stringify({ differe: true, capture: new Date().toISOString(), quoi: admis.quoi }),
        { status: 202, headers: { 'Content-Type': 'application/json', 'X-OASIS-Differe': '1' } },
      );
    }
  };

  // ── Le bandeau ──
  let bandeau = null;
  function dessiner() {
    const doitParaitre = !etat.enLigne || etat.enAttente > 0 || etat.aReprendre > 0;
    if (!doitParaitre) {
      if (bandeau) { bandeau.remove(); bandeau = null; }
      return;
    }
    if (!bandeau) {
      bandeau = document.createElement('div');
      bandeau.className = 'oasis-hl-bandeau';
      bandeau.setAttribute('role', 'status');
      bandeau.setAttribute('aria-live', 'polite');
      (document.body || document.documentElement).appendChild(bandeau);
    }
    bandeau.classList.toggle('hors-ligne', !etat.enLigne);
    bandeau.classList.toggle('a-reprendre', etat.aReprendre > 0);
    const morceaux = [];
    morceaux.push(etat.enLigne ? 'Connexion rétablie' : 'Hors ligne — la saisie est retenue');
    if (etat.enAttente) {
      morceaux.push(`${etat.enAttente} enregistrement${etat.enAttente > 1 ? 's' : ''} en attente`);
    }
    if (etat.aReprendre) {
      morceaux.push(`${etat.aReprendre} à reprendre`);
    }
    if (etat.rejeuEnCours) morceaux.push('envoi en cours…');
    bandeau.textContent = morceaux.join(' · ');
  }

  // ── Le service worker ──
  // Sans lui, une page rechargée hors réseau n'est qu'un écran d'erreur.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* refusé : l'application tient quand même */ });
    });
  }

  window.addEventListener('online', () => { etat.enLigne = true; prevenir(); dessiner(); rejouer(); });
  window.addEventListener('offline', () => { etat.enLigne = false; prevenir(); dessiner(); });

  // ── Ce que les écrans peuvent appeler ──
  window.oasisHorsLigne = {
    etat: () => ({ ...etat }),
    file: () => toute().catch(() => []),
    rejouer,
    // Une entrée en échec, reprise par un humain : remise en file, ou jetée en
    // connaissance de cause. Rien ne part sans un geste explicite.
    reprendre: async (id) => {
      const tout = await toute();
      const e = tout.find((x) => x.id === id);
      if (!e) return false;
      await remplacer({ ...e, echec: false, statut: undefined, raison: undefined });
      await recompter();
      rejouer();
      return true;
    },
    abandonner: async (id) => { await retirer(id); await recompter(); return true; },
    differable,
    DIFFERABLES,
  };

  // Au chargement : compter ce qui attend depuis la dernière session, et le
  // rejouer si le réseau est là. Une saisie faite hier ne doit pas attendre
  // qu'on y repense.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { recompter().then(rejouer); });
  } else {
    recompter().then(rejouer);
  }
}());
