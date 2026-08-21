/* OASIS — marquage des requêtes de l'application.
   Le serveur refuse toute écriture sur /api qui ne porte pas l'en-tête
   X-OASIS-Request : un formulaire hébergé sur un autre site ne peut pas
   l'ajouter, ce qui ferme la porte aux requêtes forgées (CSRF).
   Ce fichier enveloppe fetch une fois pour toutes, afin qu'aucun appel — y
   compris les téléversements et les imports de fichiers — ne soit oublié.
   À charger en tête de chaque page, avant les scripts applicatifs.
   ─────────────────────────────────────────────────────────────────────── */
(function marquerRequetes() {
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
