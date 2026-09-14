// OASIS — Chrome commun aux modules PESSCO chargés en iframe.
// Injecte dans le shell du module : les boutons de super-menu (barre supérieure
// gauche), le bouton « Retour au portail » (à la place de Déconnexion) et la
// marque OASIS en tête de la barre latérale.
(function () {
  // Super-menus déclarés par les manifestes des modules installés
  // (/api/modules/super-menus). Rien n'est codé en dur : déposer un module
  // dans src/modules/ suffit à le voir apparaître ici.
  let SUPERS = [];
  // Un module seul sur sa carte du portail n'a aucun voisin : la barre reste
  // vide plutôt que d'afficher un onglet unique menant à la page courante.
  const visibleSupers = () => (SUPERS.length > 1 ? SUPERS : []);
  const CURRENT = window.OASIS_MODULE_KEY;

  // Privilège général dans le module (Gestion des Droits), affiché sous le nom.
  const MODULE_CODE = window.OASIS_MODULE_RIGHTS || 'PLAN';
  let MODULE_PRIVILEGE = null;
  const privLabel = (p) => (p ? p.charAt(0) + p.slice(1).toLowerCase() : '');

  // À chaque ouverture d'un super-menu, la barre latérale du module est étendue.
  try {
    localStorage.setItem('pr_sidebar', 'false');
    localStorage.setItem('plan_sidebar', 'false');
  } catch (e) { /* stockage indisponible */ }
  if (window.APP_STATE) window.APP_STATE.sidebarCollapsed = false;
  if (window.PLAN_STATE) window.PLAN_STATE.sidebarCollapsed = false;

  const SVG = {
    risk: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    plan: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>',
    rights: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  };

  const css = `
    .oasis-super-tabs { display: inline-flex; gap: .4rem; align-items: center; }
    .oasis-super-btn {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .4rem .8rem; border-radius: 8px; border: 1px solid transparent;
      background: rgba(255,255,255,.14); color: inherit;
      font-size: .84rem; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .oasis-super-btn:hover { background: rgba(255,255,255,.24); }
    .oasis-super-btn.active { background: var(--primary, #1a365d); color: #fff; border-color: var(--primary, #1a365d); }
    /* Actions propres au module, à droite des super-menus */
    .oasis-module-actions { display: inline-flex; gap: .4rem; align-items: center; margin-left: .6rem; }
    .oasis-module-actions:empty { display: none; }
    .oasis-super-tabs:empty + .oasis-module-actions { margin-left: 0; }
    /* Le nom cède la place aux boutons quand la barre se resserre : il se
       tronque, plutôt que de déborder sur le bloc utilisateur. */
    .oasis-module-actions { min-width: 0; }
    .oasis-module-actions > button { flex: 0 0 auto; }
    .oasis-module-name {
      font-size: calc(.92rem + 2px); font-weight: 600; white-space: nowrap;
      min-width: 0; overflow: hidden; text-overflow: ellipsis;
    }
    .oasis-sep { flex: 0 0 auto; opacity: .45; margin: 0 .15rem; }
    /* Mention : ce sur quoi porte la session, en évidence mais non cliquable. */
    .oasis-module-mention {
      flex: 0 0 auto; font-size: .82rem; font-weight: 700; white-space: nowrap;
      padding: .18rem .6rem; border-radius: 999px;
      background: rgba(255, 255, 255, .16);
    }
    /* Choix porté par la barre : le prestataire dont on tient le compte, par
       exemple. Même silhouette que les boutons d'action, en liste déroulante. */
    .oasis-super-select {
      flex: 0 0 auto; max-width: 15rem;
      padding: .4rem .6rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,.28);
      background: rgba(255,255,255,.14); color: inherit;
      font-size: .82rem; font-weight: 600; cursor: pointer;
    }
    .oasis-super-select:hover { background: rgba(255,255,255,.24); }
    /* Les options se rendent dans la palette du système : sans cela, sur fond
       clair, le texte hérité de la barre resterait illisible. */
    .oasis-super-select option { color: #1e293b; background: #fff; }
    /* Orange foncé : le retour au portail se distingue des actions du module,
       quel que soit le thème de couleur retenu. */
    .oasis-back-btn {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .45rem .85rem; border-radius: 8px; border: none;
      background: #c2410c; color: #fff;
      font-size: .82rem; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .oasis-back-btn:hover { filter: brightness(1.15); }
    .oasis-brand {
      display: flex; align-items: center; gap: .55rem; line-height: 1.15;
      padding: .4rem .9rem; overflow: hidden; white-space: nowrap;
      width: 100%; box-sizing: border-box;
    }
    .sidebar-header:has(.oasis-brand) { padding: 0 !important; }
    .oasis-brand-logo {
      display: block; flex-shrink: 0; height: 34px; width: 38px;
      background-color: currentColor;
      -webkit-mask: url('/img/oasis-logo.svg') no-repeat center / contain;
      mask: url('/img/oasis-logo.svg') no-repeat center / contain;
    }
    .oasis-brand-sigle {
      font-family: "Brush Script MT", "Segoe Script", "Lucida Handwriting", "Monotype Corsiva", "Apple Chancery", cursive;
      font-size: 1.35rem; font-weight: 700; font-style: italic;
    }
    /* Barre latérale rétractée (ou écran étroit) : logo seul */
    .app-sidebar.collapsed .oasis-brand { padding: .4rem .25rem; justify-content: center; }
    .app-sidebar.collapsed .oasis-brand-sigle { display: none; }
    .app-sidebar.collapsed .oasis-brand-logo { height: 28px; width: 31px; }
    @media (max-width: 1024px) {
      .oasis-brand { padding: .4rem .25rem; justify-content: center; }
      .oasis-brand-sigle { display: none; }
      .oasis-brand-logo { height: 28px; width: 31px; }
    }
    /* Bloc utilisateur aligné sur le portail : nom, rôle en dessous, photo à droite */
    .user-info.oasis-user { display: flex; align-items: center; gap: .6rem; }
    .oasis-user-text {
      display: flex; flex-direction: column; align-items: flex-end;
      text-align: right; line-height: 1.15;
    }
    .oasis-user-name { font-size: .82rem; font-weight: 600; color: var(--text); }
    .oasis-user-role { font-size: .68rem; color: var(--text-muted); }
    /* Barre supérieure : jamais de débordement horizontal de la page.
       Sous 1100 px les libellés des boutons cèdent la place aux icônes. */
    .app-header { min-width: 0; gap: .5rem; }
    .header-left, .header-right { min-width: 0; }
    .header-left { overflow: hidden; }
    .oasis-super-tabs { flex-wrap: nowrap; min-width: 0; }
    .user-info.oasis-user { min-width: 0; }
    .oasis-user-text { min-width: 0; }
    .oasis-user-name, .oasis-user-role {
      max-width: 22ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    @media (max-width: 1100px) {
      .oasis-super-btn { padding: .4rem .55rem; }
      .oasis-back-btn { padding: .45rem .6rem; }
      .oasis-super-btn .oasis-btn-label,
      .oasis-back-btn .oasis-btn-label { display: none; }
    }
    @media (max-width: 720px) {
      .user-info.oasis-user .oasis-user-text { display: none; }
    }
    /* Barre inférieure toujours visible (comme sur le portail) */
    .oasis-module-footer {
      padding: .9rem 2rem; text-align: center;
      font-size: .75rem; color: var(--text-muted);
      border-top: 1px solid var(--border);
      position: sticky; bottom: 0; z-index: 80;
      background: var(--bg-card);
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  window.oasisGoSuper = function (key) {
    const s = SUPERS.find((x) => x.key === key);
    if (s && key !== CURRENT) window.location.href = s.src;
  };
  // La coquille se dessine avant que le module n'ait chargé son dictionnaire :
  // ses deux libellés vivent donc ici, comme ceux de l'écran d'attente. La
  // langue est celle que le portail a retenue.
  const LEGENDES = {
    retour_portail: { fr: 'Retour au portail', en: 'Back to the portal', pt: 'Voltar ao portal' },
    aucun_acces: { fr: 'Aucun accès', en: 'No access', pt: 'Sem acesso' },
    // Le même pied que le portail : les trois versions y sont déjà, on les
    // reprend au mot près pour que les deux écrans ne se contredisent pas.
    pied: {
      fr: '© 2026 UEMOA / URSAC — OASIS · Outils d\'Administration et de Supervision Intégrée de la Sécurité',
      en: '© 2026 UEMOA / URSAC — OASIS · Integrated Safety Oversight Platform',
      pt: '© 2026 UEMOA / URSAC — OASIS · Plataforma Integrada de Supervisão da Segurança',
    },
  };
  const langue = () => {
    try { return (window.PESSCO?.lang || localStorage.getItem('pr_lang') || 'fr').slice(0, 2); }
    catch (e) { return 'fr'; }
  };
  const legende = (cle) => (LEGENDES[cle] || {})[langue()] || (LEGENDES[cle] || {}).fr || cle;

  window.oasisBackToPortal = function () {
    parent.postMessage({ type: 'oasis:back-portal' }, '*');
  };

  // Le serveur filtre déjà les super-menus selon le rôle du porteur de session
  // et selon la carte du portail du module courant : on n'obtient donc que les
  // modules entre lesquels cette barre permet réellement de naviguer.
  fetch(`/api/modules/super-menus?module=${encodeURIComponent(CURRENT || '')}`, { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : []))
    .then((liste) => {
      SUPERS = Array.isArray(liste) ? liste : [];
      const courant = SUPERS.find((s) => s.key === CURRENT);
      // Un module peut porter en barre un nom plus court que celui de son
      // manifeste, trop long pour la place disponible.
      MODULE_LABEL = window.OASIS_MODULE_LABEL || (courant ? courant.label : '');
      const tabs = document.querySelector('.oasis-super-tabs');
      if (tabs) tabs.innerHTML = superTabsHtml();
      dessinerActions();
    })
    .catch(() => {});

  // Privilège dans le module : affiché sous le nom en barre supérieure.
  fetch(`/api/m/droits/${MODULE_CODE}/me`, { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d) return;
      // Privilège issu de « Gestion des Droits » : même espace (module) pour
      // tous les super-menus, donc même libellé partout.
      MODULE_PRIVILEGE = d.hasAccess ? privLabel(d.privilege) : legende('aucun_acces');
      const el = document.querySelector('.oasis-user-role');
      if (el) el.textContent = MODULE_PRIVILEGE;
    })
    .catch(() => {});

  // ── Actions propres au module dans la barre supérieure ──
  // Un module déclare ses propres boutons (bascule de vue, mode d'affichage…)
  // sans réécrire la barre : le socle en garde la mise en forme et la place.
  // Chaque action : { key, label, icon (HTML optionnel), active, onClick }.
  let ACTIONS = [];
  let MODULE_LABEL = window.OASIS_MODULE_LABEL || '';
  // Mention portée par la barre : ce sur quoi l'utilisateur travaille — le
  // prestataire dont il tient le compte, par exemple. Ce n'est pas une action.
  let MENTION = '';
  window.oasisModuleActions = function (liste) {
    ACTIONS = Array.isArray(liste) ? liste : [];
    dessinerActions();
  };
  window.oasisModuleMention = function (texte) {
    MENTION = texte || '';
    dessinerActions();
  };

  function dessinerActions() {
    const zone = document.querySelector('.oasis-module-actions');
    if (!zone) return;
    zone.innerHTML = '';
    // Sans onglets de super-menu, rien n'identifie le module dans la barre :
    // on y inscrit son nom, suivi d'un séparateur quand des actions le suivent.
    if (MODULE_LABEL && !visibleSupers().length) {
      const nom = document.createElement('span');
      nom.className = 'oasis-module-name';
      nom.textContent = MODULE_LABEL;
      zone.appendChild(nom);
      if (ACTIONS.length) {
        const sep = document.createElement('span');
        sep.className = 'oasis-sep';
        sep.textContent = '|';
        zone.appendChild(sep);
      }
    }
    if (MENTION) {
      const m = document.createElement('span');
      m.className = 'oasis-module-mention';
      m.textContent = MENTION;
      zone.appendChild(m);
      if (ACTIONS.length) {
        const sep = document.createElement('span');
        sep.className = 'oasis-sep';
        sep.textContent = '|';
        zone.appendChild(sep);
      }
    }
    ACTIONS.forEach((a) => {
      // Une action peut être un choix plutôt qu'un bouton : le module fournit
      // ses options, la barre en garde la mise en forme.
      if (a.type === 'select') {
        const sel = document.createElement('select');
        sel.className = 'oasis-super-select';
        sel.title = a.label || '';
        (a.options || []).forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          if (String(o.value) === String(a.value)) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.onchange = () => a.onChange(sel.value);
        zone.appendChild(sel);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'oasis-super-btn' + (a.active ? ' active' : '');
      btn.title = a.label;
      btn.innerHTML = (a.icon || '') + `<span class="oasis-btn-label">${a.label}</span>`;
      btn.onclick = () => a.onClick(a.key);
      zone.appendChild(btn);
    });
  }

  // Icône par clé de super-menu ; un module inconnu du socle reste affichable.
  const SVG_OF = { risques: () => SVG.risk, plans: () => SVG.plan, droits: () => SVG.rights };
  function superTabsHtml() {
    return visibleSupers().map((s) =>
      `<button class="oasis-super-btn ${s.key === CURRENT ? 'active' : ''}" onclick="oasisGoSuper('${s.key}')" title="${s.label}">${(SVG_OF[s.key] || (() => ''))()}<span class="oasis-btn-label">${s.label}</span></button>`
    ).join('');
  }

  function injectChrome() {
    // 1) Super-menus dans la barre supérieure, à gauche (remplacent le titre)
    const left = document.querySelector('.header-left');
    if (left && !left.querySelector('.oasis-super-tabs')) {
      const title = left.querySelector('.header-module-title');
      if (title) title.remove();
      const wrap = document.createElement('div');
      wrap.className = 'oasis-super-tabs';
      wrap.innerHTML = superTabsHtml();
      left.appendChild(wrap);
    }
    if (left && !left.querySelector('.oasis-module-actions')) {
      const zone = document.createElement('div');
      zone.className = 'oasis-module-actions';
      left.appendChild(zone);
      dessinerActions();
    }

    // 2) « Retour au portail » à la place de la déconnexion
    const logout = document.querySelector('.btn-logout');
    if (logout && !document.querySelector('.oasis-back-btn')) {
      const btn = document.createElement('button');
      btn.className = 'oasis-back-btn';
      btn.innerHTML = SVG.back + `<span class="oasis-btn-label">${legende('retour_portail')}</span>`;
      btn.title = legende('retour_portail');
      btn.onclick = window.oasisBackToPortal;
      logout.replaceWith(btn);
    }

    // 3) Marque OASIS en tête de la barre latérale du module
    const sh = document.querySelector('.sidebar-header');
    if (sh && !sh.querySelector('.oasis-brand')) {
      const b = document.createElement('div');
      b.className = 'oasis-brand';
      b.innerHTML =
        '<span class="oasis-brand-logo" role="img" aria-label="OASIS"></span>' +
        '<span class="oasis-brand-sigle">OASIS</span>';
      sh.innerHTML = '';
      sh.appendChild(b);
    }

    // 4) Bloc utilisateur : nom + rôle en dessous, photo/initiales à droite
    const ui = document.querySelector('.user-info');
    if (ui && !ui.classList.contains('oasis-user')) {
      const avatar = ui.querySelector('.user-avatar');
      const roleEl = ui.querySelector('.role-badge');
      const nameEl = ui.querySelector('span:not(.role-badge)');
      const txt = document.createElement('div');
      txt.className = 'oasis-user-text';
      const n = document.createElement('div');
      n.className = 'oasis-user-name';
      n.textContent = nameEl ? nameEl.textContent.trim() : '';
      const r = document.createElement('div');
      r.className = 'oasis-user-role';
      // Privilège général du module ; à défaut, rôle affiché par le module
      r.textContent = MODULE_PRIVILEGE || (roleEl ? roleEl.textContent.trim() : '');
      txt.append(n, r);
      ui.classList.add('oasis-user');
      ui.innerHTML = '';
      ui.appendChild(txt);
      if (avatar) ui.appendChild(avatar);
    }

    // 5) Barre inférieure permanente
    const content = document.querySelector('.app-content');
    if (content && !content.querySelector('.oasis-module-footer')) {
      const f = document.createElement('footer');
      f.className = 'oasis-module-footer';
      f.textContent = legende('pied');
      content.appendChild(f);
    }
  }

  // Le shell du module est re-rendu à chaque navigation : ré-injecter en continu
  const mo = new MutationObserver(() => injectChrome());
  document.addEventListener('DOMContentLoaded', () => {
    injectChrome();
    mo.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  });
})();
