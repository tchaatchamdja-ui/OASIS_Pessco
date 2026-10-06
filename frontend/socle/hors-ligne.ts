// OASIS — Travailler sans réseau, et le savoir.
//
// Les TDR déclarent le mode dégradé **obligatoire** pour les activités de
// terrain (fiche technique §2, contrainte n° 3). Un inspecteur sur une aire de
// trafic remplit sa fiche devant l'appareil ; le réseau, lui, n'est pas garanti.
//
// Le service worker (`/sw.js`) sert les écrans déjà vus. Ce fichier-ci fait le
// reste : il retient les écritures que le réseau n'a pas pu porter, les rejoue
// quand il revient, et — c'est le plus important — **le montre**.
//
// ────────────────────────────────────────────────────────────────────────────
// CE QUI PEUT ÊTRE DIFFÉRÉ, ET CE QUI NE LE PEUT PAS
// ────────────────────────────────────────────────────────────────────────────
//
// Toutes les écritures ne se valent pas. Différer la saisie d'une fiche
// d'inspection est le but même du mode dégradé. Différer une validation, une
// transmission à l'exploitant ou une clôture d'écart serait autre chose : ce
// sont des actes d'autorité, pris par quelqu'un qui décide, à un moment qui
// compte. Les rejouer trois heures plus tard sur un dossier qui a bougé
// entre-temps, c'est signer à l'aveugle.
//
// La table `DIFFERABLES` nomme donc les seules écritures admises — la saisie,
// le brouillon, les commentaires. Tout le reste échoue franchement, avec un
// message qui dit qu'il faut du réseau. **Une liste d'autorisation, jamais une
// liste d'exclusion** : ce qu'on oublie d'y inscrire est refusé, et c'est le
// bon sens du refus.
//
// ────────────────────────────────────────────────────────────────────────────
// CE QUE L'AGENT VOIT, ET POURQUOI C'EST LA PARTIE QUI COMPTE
// ────────────────────────────────────────────────────────────────────────────
//
// Une écriture différée rend un 202 à l'écran qui l'a demandée, et cet écran
// affichera « enregistré ». C'est vrai du point de vue de l'agent — sa saisie
// est retenue et ne se perdra pas — mais ce n'est pas encore vrai du serveur.
//
// Cet écart ne se rattrape pas au cas par cas : il y a des centaines d'appels
// dans les six modules. Il se rattrape par le bandeau, qui reste à l'écran tant
// qu'il y a quelque chose en attente et qui dit combien. L'agent travaille en
// sachant où il en est ; c'est la seule honnêteté possible ici, et elle vaut
// mieux qu'un silence.
//
// Un rejeu qui échoue ne disparaît jamais. Il passe en « à reprendre », avec sa
// date de saisie et la raison du refus, et il y reste jusqu'à ce qu'un humain
// s'en occupe. Perdre une saisie de terrain en silence serait le pire défaut
// que ce fichier puisse avoir.
///
//
// Le socle, en TypeScript (ADR-003, 5.b) — **le dernier des douze**. Ce fichier ne
// touche pas à `window` pour publier : voir `globales/oasis-hors-ligne.ts`.

/** Une écriture que le réseau peut porter plus tard. */
export interface Differable {
  readonly methode: string;
  readonly motif: RegExp;
  readonly quoi: string;
}

/** Une entrée de la file, telle qu'IndexedDB la garde. */
export interface Entree {
  id: number;
  methode: string;
  url: string;
  corps: string;
  quoi: string;
  /** Quand l'agent a saisi — non quand le rejeu partira. */
  capture: string;
  /** Vrai quand le serveur a refusé le rejeu : l'entrée attend un humain. */
  echec: boolean;
  statut?: number | undefined;
  raison?: string | undefined;
  echoueLe?: string | undefined;
}

/** Ce que le bandeau et les écrans lisent. */
export interface Etat {
  enLigne: boolean;
  enAttente: number;
  aReprendre: number;
  rejeuEnCours: boolean;
}

/** Ce que les écrans peuvent appeler. */
export interface ApiHorsLigne {
  etat: () => Etat;
  file: () => Promise<Entree[]>;
  rejouer: () => Promise<void>;
  reprendre: (id: number) => Promise<boolean>;
  abandonner: (id: number) => Promise<boolean>;
  differable: (methode: string, chemin: string) => Differable | null;
  DIFFERABLES: readonly Differable[];
}

declare global {
  interface Window {
    /** Vrai dès que l'enveloppe est posée : un second chargement ne refait rien. */
    __oasisHorsLigne?: boolean;
  }
}

  const BASE = 'oasis-hors-ligne';
  const MAGASIN = 'file';
  const VERSION_BASE = 1;

  // ── Ce qui peut attendre le réseau ──
  // Saisie et brouillon seulement. Les transitions de circuit — soumettre,
  // valider, renvoyer, transmettre, clôturer — en sont délibérément absentes.
export const DIFFERABLES: readonly Differable[] = [
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

export const differable = (methode: string, chemin: string): Differable | null =>
    DIFFERABLES.find((d) => d.methode === methode && d.motif.test(chemin)) || null;

  // ── La file, dans IndexedDB ──
  // `localStorage` ne tiendrait pas : les fiches SAFA portent 54 items et leurs
  // constats, et il plafonne à quelques mégaoctets partagés avec le reste.
  let basePromesse: Promise<IDBDatabase> | null = null;
  function base(): Promise<IDBDatabase> {
    if (basePromesse) return basePromesse;
    basePromesse = new Promise<IDBDatabase>((resoudre, rejeter) => {
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

  function transaction<T>(mode: IDBTransactionMode, geste: (m: IDBObjectStore) => IDBRequest | void): Promise<T> {
    return base().then((db) => new Promise<T>((resoudre, rejeter) => {
      const t = db.transaction(MAGASIN, mode);
      const r = geste(t.objectStore(MAGASIN));
      t.oncomplete = () => resoudre((r && r.result !== undefined ? r.result : undefined) as T);
      t.onerror = () => rejeter(t.error);
      t.onabort = () => rejeter(t.error);
    }));
  }

  const enfiler = (entree: Omit<Entree, 'id'>) => transaction<number>('readwrite', (m) => m.add(entree));
  const toute = () => transaction<Entree[]>('readonly', (m) => m.getAll());
  const retirer = (id: number) => transaction<void>('readwrite', (m) => m.delete(id));
  const remplacer = (entree: Entree) => transaction<void>('readwrite', (m) => m.put(entree));

  // ── L'état, et ceux qui l'écoutent ──
  const etat: Etat = { enLigne: navigator.onLine, enAttente: 0, aReprendre: 0, rejeuEnCours: false };
  const auditeurs = new Set<(e: Etat) => void>();
  const prevenir = () => auditeurs.forEach((f) => { try { f({ ...etat }); } catch { /* un écran sourd n'arrête rien */ } });

  async function recompter(): Promise<void> {
    const tout = await toute().catch(() => []);
    etat.enAttente = tout.filter((e) => !e.echec).length;
    etat.aReprendre = tout.filter((e) => e.echec).length;
    prevenir();
    dessiner();
  }

  // ── Le rejeu ──
  // Dans l'ordre de saisie : une fiche créée puis modifiée doit être créée
  // avant d'être modifiée, sans quoi la modification tombe sur un néant.
export async function rejouer(): Promise<void> {
    if (etat.rejeuEnCours || !navigator.onLine) return;
    etat.rejeuEnCours = true;
    prevenir();
    try {
      const tout = (await toute().catch(() => []))
        .filter((e) => !e.echec)
        .sort((a, b) => a.id - b.id);
      for (const entree of tout) {
        let reponse: Response;
        try {
          reponse = await window.fetch(entree.url, {
            method: entree.methode,
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Differe': entree.capture },
            body: entree.corps,
          });
        } catch {
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
  /**
   * Enveloppe `fetch` une fois pour toutes, et lance la file.
   *
   * L'appel est dans le sas, non ici : envelopper une globale et enregistrer un
   * service worker sont des gestes de publication. Le garde `__oasisHorsLigne`
   * reste, pour la même raison qu'en amont — deux chargements ne doivent pas
   * empiler deux enveloppes.
   */
export function brancher(): boolean {
  if (window.__oasisHorsLigne) return false;
  window.__oasisHorsLigne = true;
  envelopperFetch();
  brancherEvenements();
  return true;
}

// Deux gestes, et non un : le fichier d'origine les sépare par le bandeau, que
// `recompter` appelle. Les réunir aurait enfermé `dessiner` dans la portée de
// l'enveloppe, hors d'atteinte de son appelant — c'est ce qu'une première
// écriture avait fait, et la construction l'a refusée.
function envelopperFetch(): void {
  // Elle vient **après** celle d'`oasis-requete` : l'en-tête d'origine
  // applicative est déjà posé quand on arrive ici.
  const fetchAvant = window.fetch.bind(window);

  window.fetch = async function fetchHorsLigne(entree: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const o = options || {};
    const methode = String(o.method || (entree instanceof Request ? entree.method : 'GET')).toUpperCase();
    let url: URL;
    try {
      url = new URL(typeof entree === 'string' ? entree : (entree as Request).url, window.location.href);
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
}

  // ── Le bandeau ──
  let bandeau: HTMLElement | null = null;
  function dessiner(): void {
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

// ── Les évènements, le service worker, et le rattrapage au chargement ──
function brancherEvenements(): void {
  // Sans le service worker, une page rechargée hors réseau n'est qu'un écran
  // d'erreur.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* refusé : l'application tient quand même */ });
    });
  }

  window.addEventListener('online', () => { etat.enLigne = true; prevenir(); dessiner(); rejouer(); });
  window.addEventListener('offline', () => { etat.enLigne = false; prevenir(); dessiner(); });

  // Au chargement : compter ce qui attend depuis la dernière session, et le
  // rejouer si le réseau est là. Une saisie faite hier ne doit pas attendre
  // qu'on y repense.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { recompter().then(rejouer); });
  } else {
    recompter().then(rejouer);
  }
  }

  // ── Ce que les écrans peuvent appeler ──
export const API: ApiHorsLigne = {
    etat: () => ({ ...etat }),
    file: () => toute().catch(() => []),
    rejouer,
    // Une entrée en échec, reprise par un humain : remise en file, ou jetée en
    // connaissance de cause. Rien ne part sans un geste explicite.
    reprendre: async (id: number) => {
      const tout = await toute();
      const e = tout.find((x) => x.id === id);
      if (!e) return false;
      await remplacer({ ...e, echec: false, statut: undefined, raison: undefined });
      await recompter();
      rejouer();
      return true;
    },
    abandonner: async (id: number) => { await retirer(id); await recompter(); return true; },
    differable,
    DIFFERABLES,
  };
