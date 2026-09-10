/* OASIS — marquage des requêtes de l'application.
   Le serveur refuse toute écriture sur /api qui ne porte pas l'en-tête
   X-OASIS-Request : un formulaire hébergé sur un autre site ne peut pas
   l'ajouter, ce qui ferme la porte aux requêtes forgées (CSRF).
   Ce fichier enveloppe fetch une fois pour toutes, afin qu'aucun appel — y
   compris les téléversements et les imports de fichiers — ne soit oublié.
   À charger en tête de chaque page, avant les scripts applicatifs.
   ─────────────────────────────────────────────────────────────────────── */
(function marquerRequetes() {
  // ── Session perdue ──
  // Un 401 dit que la session n'est plus : la page ne peut rien en tirer, il
  // faut revenir à la connexion. Chaque client HTTP le traitait à sa façon —
  // deux modules ne le traitaient pas du tout et restaient figés sur une
  // erreur nue. Le retour se fait ici, une fois pour tous.
  //
  // Un module vit en cadre dans le portail : `window.location` y ouvrirait la
  // page de connexion dans le cadre, entourée de la coquille du portail. C'est
  // la fenêtre entière qui doit y revenir.
  window.oasisSessionPerdue = function oasisSessionPerdue() {
    if (window.__oasisSessionPerdue) return;
    window.__oasisSessionPerdue = true;
    try {
      localStorage.removeItem('pr_user');
      localStorage.removeItem('pr_token');
    } catch (e) { /* stockage fermé : la session tombe quand même */ }
    const cible = '/login.html';
    try { (window.top || window).location.href = cible; }
    catch (e) { window.location.href = cible; }
  };

  if (window.__oasisRequeteMarquee) return;
  window.__oasisRequeteMarquee = true;

  const fetchOrigine = window.fetch.bind(window);

  // Une requête part vers l'application si son URL est relative ou vise la
  // même origine ; les appels vers l'extérieur ne sont pas touchés.
  const versApplication = (entree) => {
    try {
      const url = new URL(typeof entree === 'string' ? entree : entree.url, window.location.href);
      return url.origin === window.location.origin;
    } catch { return false; }
  };

  window.fetch = function fetchMarque(entree, options) {
    if (!versApplication(entree)) return fetchOrigine(entree, options);

    // Requête décrite par un objet Request : on le recrée avec l'en-tête.
    if (entree instanceof Request && !options) {
      const requete = new Request(entree, {});
      requete.headers.set('X-OASIS-Request', '1');
      return fetchOrigine(requete);
    }

    const o = { ...(options || {}) };
    const entetes = new Headers(o.headers || {});
    entetes.set('X-OASIS-Request', '1');
    o.headers = entetes;
    return fetchOrigine(entree, o);
  };
}());
