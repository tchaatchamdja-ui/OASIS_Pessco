/**
 * OASIS — les petits outils que chaque module réécrivait.
 *
 * Six modules, six façons d'échapper un texte ; deux clients HTTP identiques au
 * caractère près ; cinq copies de la même bascule de thème ; un anti-rebond de
 * recherche que le socle possédait déjà mais que trois modules ne chargeaient
 * pas. Chaque copie divergeait un peu : une échappait les guillemets, l'autre
 * non ; l'une traitait un zéro comme un vide ; l'un des clients imposait un
 * type JSON jusque sur les dépôts de fichiers, qui partaient ainsi sans leur
 * frontière multipart. Ils vivent ici, une fois, et chaque module s'y branche
 * sous le nom qu'il employait — rien n'est à renommer dans ses gabarits.
 *
 * À charger après oasis-requete.js (qui fournit oasisSessionPerdue), avant les
 * scripts du module.
 */
(function () {
  // ── Échappement ──
  // Un seul barème, le plus sûr : les cinq caractères, dans le texte comme dans
  // un attribut. Échapper un guillemet dans du texte ne change rien à
  // l'affichage ; ne pas l'échapper dans un attribut le refermait. Seuls
  // `null` et `undefined` donnent un vide : un zéro est une valeur, il s'affiche.
  const ENTITES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function oasisEsc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, (c) => ENTITES[c]);
  }

  // ── Client HTTP ──
  // Ce que l'on attend d'un appel à l'API d'un module : la session suivie, le
  // corps en JSON — sauf un dépôt de fichier, dont le navigateur écrit lui-même
  // l'en-tête et la frontière —, une session perdue renvoyée à la connexion,
  // l'erreur du serveur rendue telle qu'il l'a dite, et un 204 lu comme vide.
  async function oasisJson(url, options) {
    const o = { credentials: 'same-origin', ...(options || {}) };
    const entetes = { ...(o.headers || {}) };
    if (!(o.body instanceof FormData) && !entetes['Content-Type']) {
      entetes['Content-Type'] = 'application/json';
    }
    o.headers = entetes;
    const r = await fetch(url, o);
    if (r.status === 401) {
      if (typeof window.oasisSessionPerdue === 'function') window.oasisSessionPerdue();
      throw new Error('Session expirée');
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(err.error || r.statusText);
    }
    return r.status === 204 ? null : r.json();
  }

  // ── Thème ──
  // La bascule commune : l'attribut qui porte les couleurs, la préférence
  // retenue, et la pastille active. Chaque module y ajoute ce qui lui est
  // propre — un volet à refermer, un état à tenir.
  function oasisAppliquerTheme(theme) {
    try { localStorage.setItem('pr_theme', theme); } catch (e) { /* stockage fermé */ }
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach((d) => {
      d.classList.toggle('active', d.dataset.theme === theme);
    });
  }

  // ── Saisie différée ──
  // Un champ de recherche redessine sa liste à chaque frappe : on attend que la
  // frappe s'arrête, puis on rend le curseur là où il était — le redessin
  // recrée souvent le champ lui-même. Un minuteur par champ, pour que deux
  // recherches voisines ne s'annulent pas l'une l'autre.
  const minuteurs = new Map();
  function oasisSaisieDifferee(champ, appliquer, delai) {
    const cle = (champ && (champ.id || champ.name)) || champ;
    const id = champ && champ.id;
    const pos = champ && champ.selectionStart;
    clearTimeout(minuteurs.get(cle));
    minuteurs.set(cle, setTimeout(() => {
      minuteurs.delete(cle);
      appliquer();
      if (!id) return;
      const el = document.getElementById(id);
      if (!el || el === document.activeElement) return;
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch (e) { /* champ non textuel */ }
    }, delai === undefined ? 300 : delai));
  }

  window.oasisEsc = oasisEsc;
  window.oasisJson = oasisJson;
  window.oasisAppliquerTheme = oasisAppliquerTheme;
  window.oasisSaisieDifferee = oasisSaisieDifferee;
}());
