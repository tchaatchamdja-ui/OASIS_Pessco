/* OASIS — Attente : l'aéronef en orbite, posé partout où l'on patiente.
 *
 * Un seul dessin, servi par `oasisLoaderHtml()`. Les écrans existants n'ont
 * rien à changer : tout `.loading-spinner` vide et tout bloc marqué
 * `data-oasis-loader` reçoit le globe, y compris ceux qu'un module crée en
 * cours de route.
 */
(function () {
  // Le module s'annonce avant d'avoir chargé ses propres traductions : les
  // deux textes de l'attente vivent donc ici, dans les trois langues. La
  // langue est celle que le portail a retenue.
  const LEGENDES = {
    'Chargement du module…': { en: 'Loading the module…', pt: 'A carregar o módulo…' },
    'Chargement…': { en: 'Loading…', pt: 'A carregar…' },
    // Le deux-points prend une espace avant en français, jamais en anglais :
    // la ponctuation appartient au texte, pas au code qui l'assemble.
    'Module indisponible : ': { en: 'Module unavailable: ', pt: 'Módulo indisponível: ' },
  };
  function langue() {
    try { return (localStorage.getItem('pr_lang') || 'fr').slice(0, 2); } catch (e) { return 'fr'; }
  }
  function traduire(texte) {
    const e = LEGENDES[texte];
    return (e && e[langue()]) || texte;
  }

  const SVG = () => `
    <svg class="oasis-loader" viewBox="0 0 120 120" role="img" aria-label="${traduire('Chargement…')}">
      <ellipse class="oasis-loader-orbite" cx="60" cy="60" rx="44" ry="30"></ellipse>
      <circle class="oasis-loader-sphere" cx="60" cy="60" r="20"></circle>
      <g class="oasis-loader-grille">
        <ellipse cx="60" cy="60" rx="20" ry="7.5"></ellipse>
        <path d="M41.5 52.5h37M41.5 67.5h37"></path>
        <ellipse class="oasis-loader-meridien" cx="60" cy="60" rx="8" ry="20"></ellipse>
        <ellipse class="oasis-loader-meridien oasis-loader-meridien-2" cx="60" cy="60" rx="14" ry="20"></ellipse>
        <ellipse class="oasis-loader-meridien oasis-loader-meridien-3" cx="60" cy="60" rx="18.5" ry="20"></ellipse>
      </g>
      <!-- L'appareil : la marque OASIS elle-même — l'aéronef et sa traînée,
           tels qu'ils figurent devant le sigle sur le portail. Le tracé vient
           de /img/oasis-logo.svg, ses quatre sous-tracés réunis et leurs
           coordonnées arrondies à l'unité : à cette taille, la décimale ne se
           voit pas et le fichier pèse le tiers. La marque garde son attitude
           propre tout au long du tour : couchée sur la trajectoire, elle se
           retrouverait tête en bas sous le globe — un logo ne se renverse pas.
           Sa boîte va de (112, 13) à (650, 497) — centre (381, 255). -->
      <g class="oasis-loader-avion">
       <g class="oasis-loader-profondeur">
        <path transform="scale(.058) translate(-381 -255)"
              d="M541,41C557,43 573,46 589,46C593,46 596,45 598,43C608,35 617,27 627,21C632,18 638,16
                 643,16C647,16 648,18 647,22C643,34 635,44 626,52C619,60 613,66 615,79C617,92 617,107
                 619,120C620,129 615,138 606,142C603,135 601,128 599,121C596,112 593,102 589,93C587,87 586,87
                 582,91C570,100 559,110 548,119C537,128 527,136 517,145C513,148 508,148 504,151C516,151 527,149
                 537,146C545,144 553,142 561,141C566,140 567,142 565,146C559,163 552,180 545,198C545,198 545,199
                 544,200C541,206 539,207 534,202C532,200 530,198 529,195C526,192 525,192 522,195C509,204 498,214
                 486,225C466,243 447,261 429,282C400,314 374,348 351,385C350,386 349,387 349,388C347,388 346,387
                 345,385C329,364 312,344 293,325C288,320 288,320 293,315C298,311 302,305 307,300C311,297 314,297
                 318,300C328,307 336,316 344,325C348,330 349,330 352,325C363,309 376,294 389,279C414,250 442,225
                 471,201C482,192 492,184 502,175C503,174 507,172 504,169C502,166 499,162 494,163C492,163 491,167
                 489,168C473,182 457,195 441,209C417,229 393,250 369,271C358,282 346,291 334,302C331,304 330,304
                 327,302C324,298 320,295 316,292C314,290 312,290 310,292C300,300 290,308 281,316C278,319 278,321
                 280,324C283,327 286,330 289,333C292,336 292,338 289,341C275,353 261,365 247,378C237,389 227,400
                 219,413C213,422 209,432 209,443C209,460 217,472 232,480C240,484 249,486 258,488C261,488 264,488
                 267,490C267,493 265,493 264,493C241,495 218,495 196,486C178,479 166,466 162,447C160,434 163,421
                 168,410C179,388 196,371 213,355C225,344 238,334 251,324C261,316 272,307 284,300C295,293 306,284
                 316,275C323,270 331,265 338,259C353,248 367,236 382,225C398,213 413,201 428,189C464,159 501,129
                 536,98C546,90 556,82 565,73C566,73 568,72 568,70C567,68 565,68 562,67C550,62 537,58
                 524,53C517,51 518,50 522,44C528,38 534,41 541,41zM424,448C402,466 378,480 352,491C349,492
                 346,492 343,491C304,473 268,449 240,415C236,410 236,408 240,403C248,393 257,385 265,375C268,370
                 272,371 275,376C282,383 288,390 294,399C306,418 326,427 345,438C347,439 349,439 351,438C381,422
                 409,403 426,372C437,353 443,333 443,311C443,303 443,295 443,287C443,284 444,281 446,278C455,267
                 466,257 477,247C480,245 483,242 485,239C487,238 489,236 491,237C493,238 493,240 493,242C491,271
                 493,300 491,329C489,340 487,351 484,361C476,390 460,413 439,434C434,439 429,443
                 424,448zM483,104C460,135 435,162 406,187C379,211 352,233 322,253C302,266 281,279 259,290C254,292
                 251,295 252,301C254,308 251,312 245,316C233,323 223,332 212,341C211,342 210,344 208,344C205,339
                 206,334 205,328C204,322 204,321 198,325C177,339 158,355 145,378C137,393 134,408 136,425C136,430
                 136,436 137,442C133,441 132,439 131,437C108,405 110,366 136,334C151,316 169,304 189,293C214,278
                 241,266 266,253C314,228 359,199 402,167C433,143 462,118 490,90C491,90 492,89 494,89C491,95
                 487,99 483,104zM335,195C310,207 285,216 258,222C254,223 252,225 252,229C252,234 252,239
                 252,244C252,247 251,248 249,250C235,256 221,263 207,269C207,269 206,269 205,270C203,268 204,266
                 204,264C204,241 204,217 204,194C204,189 205,186 211,185C253,177 293,164 331,144C334,142 338,140
                 342,137C345,135 348,135 351,137C363,143 376,150 389,157C394,159 391,162 388,163C378,170 368,177
                 358,184C352,190 343,190 335,195z"></path>
       </g>
      </g>
    </svg>`;

  function oasisLoaderHtml(legende) {
    return `<div class="oasis-loader-bloc">${SVG()}${legende
      ? `<span>${String(legende).replace(/[&<>]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>` : ''}</div>`;
  }

  // Un conteneur déjà servi ne se redessine pas : l'animation repartirait de
  // zéro à chaque passage de l'observateur.
  function poser(el) {
    if (!el || el.querySelector('.oasis-loader')) return;
    const legende = el.hasAttribute('data-oasis-loader') ? traduire(el.textContent.trim()) : '';
    el.innerHTML = oasisLoaderHtml(legende);
    if (legende) el.removeAttribute('data-oasis-loader');
  }

  function balayer(racine) {
    (racine || document).querySelectorAll('.loading-spinner, [data-oasis-loader]')
      .forEach(poser);
  }

  // Un module qui ne démarre pas le dit de la même façon partout, et dans la
  // langue retenue : le message était recopié dans chacune des pages.
  function oasisModuleIndisponible(cause) {
    const detail = (cause && cause.message) ? cause.message : String(cause == null ? '' : cause);
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return `<div style="padding:2rem;color:#991b1b;">${traduire('Module indisponible : ')}${esc(detail)}</div>`;
  }

  window.oasisLoaderHtml = oasisLoaderHtml;
  window.oasisLoaderPoser = balayer;
  window.oasisModuleIndisponible = oasisModuleIndisponible;

  document.addEventListener('DOMContentLoaded', () => {
    balayer();
    // Les écrans se redessinent : un disque d'attente peut apparaître bien
    // après le chargement de la page. On n'examine que les nœuds ajoutés, et
    // une seule fois par trame — un module qui redessine sa page à chaque
    // frappe produit des dizaines de mutations pour un seul rendu.
    let prevu = false;
    const observateur = new MutationObserver((mutations) => {
      if (prevu) return;
      const ajouts = mutations.some((m) => m.addedNodes.length);
      if (!ajouts) return;
      prevu = true;
      requestAnimationFrame(() => { prevu = false; balayer(); });
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}());
