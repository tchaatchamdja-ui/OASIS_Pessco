// OASIS — Gestion des Droits du module (charte PESSCO).
// Réservé SuperAdmin / Admin AAC. Cible : les utilisateurs du portail ayant le
// module dans « Accès aux modules ». Privilège par défaut : Lecteur.
const DR = {
  module: window.DR_MODULE || 'PLAN',
  user: null,
  users: [],
  domaines: [],
  secteurs: [],
  prestataires: [],
  privileges: [],
  scopePrivileges: [],
  defaultPrivilege: 'LECTEUR',
  search: '',
  filterPriv: '',
  editing: null,
  draft: null,
  page: 'privileges',          // 'privileges' | 'audit'
  theme: localStorage.getItem('pr_theme') || 'blue-dark',
  lang: localStorage.getItem('pr_lang') || 'fr',
  sidebarCollapsed: localStorage.getItem('pr_sidebar') === 'true',
  auditActions: {},
  audit: { entries: [], total: 0, integrity: null },
  auditFilters: { user: '', action: '', from: '', to: '', q: '' },
};

// Icônes de la barre latérale (le jeu ICONS de PESSCO ne les couvre pas).
const DR_ICONS = {
  privileges: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="2.6"/><path d="M8.2 16.4a4.2 4.2 0 0 1 7.6 0"/></svg>',
  audit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="14" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>',
  chevronLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>',
};

const drApi = (p, o) => api('/api/m/droits' + p, o);
const drEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const drDom = (id) => (DR.domaines.find((d) => d.id === id) || {}).nom || id || '—';
const drSec = (id) => (DR.secteurs.find((s) => s.id === id) || {}).nom || '';
const drPrest = (id) => {
  const p = DR.prestataires.find((x) => x.id === id);
  return p ? (p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom) : id || '—';
};

// Libellé de l'espace dont la page règle les droits (une même page sert
// plusieurs modules, via ?module=). Les quatre noms vivent au répertoire de
// traduction, comme le reste de l'écran.
const drModuleLabel = () => {
  const nom = dt(`mod_${DR.module}`);
  return nom === `mod_${DR.module}` ? DR.module : nom;
};

// Ce qu'un échelon ouvre dépend du module — prendre une sanction n'est pas la
// prononcer, et les inspections sur aire de trafic ont leurs propres rôles.
// Les descriptions, communes comme propres à un module, sont au répertoire de
// traduction ; `dtPrivDesc` choisit la bonne.
const drPrivDesc = (p) => dtPrivDesc(p);

async function drBoot() {
  try {
    // Un compte d'organisme n'a rien à régler ici : le serveur le refuse, et
    // l'écran le dit plutôt que de rester vide.
    const ctx = await drApi(`/context?module=${DR.module}`).catch((e) => {
      if (String(e && e.message).includes('reserve_autorite')) {
        document.getElementById('app').innerHTML =
          `<div style="padding:2rem;color:#991b1b;">${drEsc(dt('reserve_autorite'))}</div>`;
      }
      throw e;
    });
    DR.user = ctx.user;
    DR.privileges = ctx.privileges;
    DR.scopePrivileges = ctx.scopePrivileges;
    DR.defaultPrivilege = ctx.defaultPrivilege;
    DR.auditActions = ctx.auditActions || {};
    DR.sidebarCollapsed = localStorage.getItem('pr_sidebar') === 'true';
    document.documentElement.setAttribute('data-theme', DR.theme);
    document.body.classList.toggle('app-sidebar-collapsed', DR.sidebarCollapsed);
    localStorage.setItem('pr_user', JSON.stringify({
      id: ctx.user.username, nom: ctx.user.nom || ctx.user.username,
      prenom: ctx.user.prenom || '', role: ctx.user.role,
    }));

    if (!['SUPERADMIN', 'ADMIN'].includes(ctx.user.role)) {
      drShell(`<div class="card" style="padding:2rem;text-align:center;color:#991b1b;">${drEsc(dt('reserve_admin'))}</div>`);
      return;
    }
    const [refs, users] = await Promise.all([drApi('/refs'), drApi(`/${DR.module}/users`)]);
    DR.domaines = refs.domaines;
    DR.secteurs = refs.secteurs;
    DR.prestataires = refs.prestataires || [];
    DR.users = users;
    drRender();
  } catch (e) {
    document.getElementById('app').innerHTML =
      `<div style="padding:2rem;color:#991b1b;">${drEsc(dt('module_indisponible', e.message))}</div>`;
  }
}

// ── Shell (charte PESSCO ; le chrome OASIS est injecté par module-chrome.js) ──
function drShell(content) {
  const u = DR.user || {};
  const initials = ((u.prenom || '')[0] || '') + ((u.nom || u.username || 'U')[0] || '');
  const C = DR.sidebarCollapsed;
  document.getElementById('app').innerHTML = `
  <div class="app-layout ${C ? 'sidebar-collapsed' : ''}">
    <aside class="app-sidebar ${C ? 'collapsed' : ''}">
      <div class="sidebar-header"></div>
      <nav class="sidebar-nav">
        <button class="nav-btn ${DR.page === 'privileges' ? 'active' : ''}" onclick="drGo('privileges')" title="${drEsc(dt('nav_privileges'))}">
          ${DR_ICONS.privileges} <span>${dt('nav_privileges')}</span></button>
        <button class="nav-btn ${DR.page === 'audit' ? 'active' : ''}" onclick="drGo('audit')" title="${drEsc(dt('nav_audit'))}">
          ${DR_ICONS.audit} <span>${dt('nav_audit')}</span></button>
      </nav>
      <div class="sidebar-footer">
        <div class="theme-selector sidebar-theme-selector">
          ${['blue-dark', 'corporate', 'grey'].map((th) =>
            `<div class="theme-dot ${DR.theme === th ? 'active' : ''}" data-theme="${th}" onclick="drSetTheme('${th}')" title="${th}"></div>`).join('')}
        </div>
        <div class="lang-selector sidebar-lang-selector">
          ${['FR', 'EN', 'PT'].map((l) =>
            `<button class="lang-btn ${DR.lang === l.toLowerCase() ? 'active' : ''}" onclick="drSetLang('${l.toLowerCase()}')">${l}</button>`).join('')}
        </div>
      </div>
      <button class="sidebar-toggle" onclick="drToggleSidebar()" title="${drEsc(C ? dt('etendre') : dt('reduire'))}">
        ${C ? DR_ICONS.chevronRight : DR_ICONS.chevronLeft}
      </button>
    </aside>
    <div class="app-content">
      <header class="app-header">
        <div class="header-left"><div class="header-module-title">${ICONS.shield || ''} <span>${dt('module_titre')}</span></div></div>
        <div class="header-right">
          <div class="user-info">
            <div class="user-avatar">${drEsc(initials.toUpperCase())}</div>
            <span>${drEsc(((u.prenom || '') + ' ' + (u.nom || '')).trim() || u.username || '')}</span>
            <span class="role-badge">${drEsc(u.role || '')}</span>
          </div>
          <button class="btn-logout">${dt('deconnexion')}</button>
        </div>
      </header>
      <main class="main-content" id="drContent">${content}</main>
    </div>
  </div>
  <div id="drModalRoot"></div>`;
}

// Thème, langue et rétraction : même comportement que le super-menu Profils de Risques
window.drSetTheme = function (th) {
  DR.theme = th;
  localStorage.setItem('pr_theme', th);
  document.documentElement.setAttribute('data-theme', th);
  document.querySelectorAll('.theme-dot').forEach((d) => d.classList.toggle('active', d.dataset.theme === th));
};

window.drSetLang = function (lang) {
  DR.lang = lang;
  localStorage.setItem('pr_lang', lang);
  drRender();
};

window.drToggleSidebar = function () {
  DR.sidebarCollapsed = !DR.sidebarCollapsed;
  localStorage.setItem('pr_sidebar', DR.sidebarCollapsed);
  const layout = document.querySelector('.app-layout');
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed', DR.sidebarCollapsed);
  if (layout) layout.classList.toggle('sidebar-collapsed', DR.sidebarCollapsed);
  document.body.classList.toggle('app-sidebar-collapsed', DR.sidebarCollapsed);
  const btn = document.querySelector('.sidebar-toggle');
  if (btn) {
    btn.innerHTML = DR.sidebarCollapsed ? DR_ICONS.chevronRight : DR_ICONS.chevronLeft;
    btn.title = DR.sidebarCollapsed ? dt('etendre') : dt('reduire');
  }
};

function drRender() {
  drShell(DR.page === 'audit' ? drAuditHtml() : drPageHtml());
}

window.drGo = async function (page, userFilter) {
  DR.page = page;
  if (page === 'audit') {
    DR.auditFilters.user = userFilter || '';
    await drLoadAudit();
  }
  drRender();
};

function drPageHtml() {
  const q = DR.search.toLowerCase();
  const rows = DR.users
    .filter((u) => !DR.filterPriv || u.privilege === DR.filterPriv)
    .filter((u) => !q || [u.fullName, u.email, u.username, u.role].join(' ').toLowerCase().includes(q))
    .map(drRowHtml)
    .join('');

  const counts = DR.privileges.map((p) => `${dtPriv(p)} : ${DR.users.filter((u) => u.privilege === p).length}`).join(' · ');

  return `
    <div class="page-header">
      <h2>${dt('page_titre', drModuleLabel())}</h2>
      <p class="page-subtitle">${dt('page_sous_titre')}</p>
    </div>
    <div class="filters-bar" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;">
      <input class="form-control" style="max-width:280px;" placeholder="${drEsc(dt('rechercher_utilisateur'))}"
             value="${drEsc(DR.search)}" oninput="drSetSearch(this.value)">
      <select class="form-control" style="max-width:220px;" onchange="drSetFilter(this.value)">
        <option value="">${dt('tous_privileges')}</option>
        ${DR.privileges.map((p) => `<option value="${p}" ${DR.filterPriv === p ? 'selected' : ''}>${dtPriv(p)}</option>`).join('')}
      </select>
      <span style="margin-left:auto;font-size:.75rem;color:var(--text-muted);">${dt('compte_utilisateurs', DR.users.length, counts)}</span>
    </div>
    <div class="card dr-table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>${dt('col_nom')}</th><th>${dt('col_prenoms')}</th><th>${dt('col_email')}</th><th>${dt('col_role_portail')}</th>
          <th>${dt('col_privilege_general')}</th><th>${dt('col_portees')}</th><th style="width:90px;"></th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="text-center" style="padding:2rem;color:var(--text-muted);">${dt('aucun_utilisateur')}</td></tr>`}</tbody>
      </table>
    </div>`;
}

function drRowHtml(u) {
  const priv = `<span class="dr-priv dr-priv-${u.privilege}">${dtPriv(u.privilege)}</span>`
    + (u.isDefault ? ` <span style="font-size:.65rem;color:var(--text-muted);">${dt('defaut_court')}</span>` : '');
  // En mode prestataire, la portée est la liste des prestataires accessibles.
  const scopes = u.privilege === 'PRESTATAIRE'
    ? ((u.scopes || []).map((s) =>
        `<span class="dr-chip dr-chip-PRESTATAIRE">${drEsc(drPrest(s.prestataire_id))}</span>`).join('')
       || `<span class="dr-chip dr-chip-AUCUN">${dt('aucun_prestataire')}</span>`)
    : ((u.scopes || []).map((s) =>
        `<span class="dr-chip dr-chip-${s.privilege}">${drEsc(drDom(s.domaine_id))}${s.secteur_id ? ' › ' + drEsc(drSec(s.secteur_id)) : ''} — ${dtPriv(s.privilege)}</span>`).join('') || '—');
  return `<tr${u.active ? '' : ' style="opacity:.55;"'}>
    <td><strong>${drEsc(u.nom)}</strong></td>
    <td>${drEsc(u.prenom)}</td>
    <td>${drEsc(u.email)}</td>
    <td><span class="badge">${drEsc(u.role)}</span></td>
    <td>${priv}</td>
    <td><div class="dr-scopes">${scopes}</div></td>
    <td style="white-space:nowrap;">
      <button class="btn btn-primary btn-sm" onclick="drEdit('${drEsc(u.username)}')">${dt('modifier')}</button>
      <button class="btn btn-sm" onclick="drGo('audit','${drEsc(u.username)}')" title="${drEsc(dt('journal_utilisateur'))}">${dt('journal')}</button>
    </td>
  </tr>`;
}

// ══════════ Journal d'audit ══════════
async function drLoadAudit() {
  const f = DR.auditFilters;
  const qs = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
  DR.audit = await drApi(`/${DR.module}/audit?${qs.toString()}`);
}

window.drAuditFilter = async function (key, value) {
  DR.auditFilters[key] = value;
  await drLoadAudit();
  const el = document.getElementById('drContent');
  if (el) el.innerHTML = drAuditHtml();
  if (key === 'q') {
    const inp = el && el.querySelector('#drAuditQ');
    if (inp) { inp.focus(); inp.setSelectionRange(value.length, value.length); }
  }
};
window.drAuditReset = async function () {
  DR.auditFilters = { user: '', action: '', from: '', to: '', q: '' };
  await drLoadAudit();
  const el = document.getElementById('drContent');
  if (el) el.innerHTML = drAuditHtml();
};

const drTs = (ts) => {
  const d = new Date(ts);
  // Le format suit la langue retenue, comme les libellés.
  const loc = { fr: 'fr-FR', en: 'en-GB', pt: 'pt-PT' }[DR.lang] || 'fr-FR';
  return d.toLocaleDateString(loc) + ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

function drAuditHtml() {
  const f = DR.auditFilters;
  const integ = DR.audit.integrity || {};
  const banner = integ.valid
    ? `<div class="dr-integrity ok">${drEsc(dt('integrite_ok', integ.total))}</div>`
    : `<div class="dr-integrity ko">${drEsc(dt('integrite_ko', integ.brokenAt))}</div>`;

  const target = f.user ? DR.users.find((u) => u.username === f.user) : null;

  const rows = DR.audit.entries.map((e) => `
    <tr>
      <td style="white-space:nowrap;">${drEsc(String(e.id).padStart(4, '0'))}</td>
      <td style="white-space:nowrap;">${drEsc(drTs(e.ts))}</td>
      <td>${drEsc(drUserLabel(e.user))}</td>
      <td><span class="dr-act dr-act-${drEsc(e.action)}">${drEsc(e.actionLabel)}</span></td>
      <td>${drEsc(e.objet || '—')}</td>
      <td class="dr-mono">${drEsc(e.ref || '—')}</td>
      <td class="dr-mono dr-detail">${drEsc(drDetails(e.details))}</td>
      <td class="dr-mono dr-hash" title="${drEsc(e.hash)}">${drEsc((e.hash || '').slice(0, 10))}…</td>
    </tr>`).join('');

  return `
    <div class="page-header">
      <h2>${dt('audit_titre', drModuleLabel())}</h2>
      <p class="page-subtitle">${dt('audit_sous_titre')}</p>
    </div>
    ${banner}
    ${target ? `<div class="dr-scoped-user">${dt('journal_de')} <strong>${drEsc(target.fullName)}</strong> (${drEsc(target.email)})
      <button class="btn btn-sm" onclick="drAuditFilter('user','')">${dt('voir_tout_module')}</button></div>` : ''}
    <div class="filters-bar dr-audit-filters">
      <input id="drAuditQ" class="form-control" placeholder="${drEsc(dt('rechercher'))}" value="${drEsc(f.q)}"
             oninput="drAuditFilter('q', this.value)">
      <select class="form-control" onchange="drAuditFilter('user', this.value)">
        <option value="">${dt('tous_utilisateurs')}</option>
        ${DR.users.map((u) => `<option value="${drEsc(u.username)}" ${f.user === u.username ? 'selected' : ''}>${drEsc(u.fullName)}</option>`).join('')}
      </select>
      <select class="form-control" onchange="drAuditFilter('action', this.value)">
        <option value="">${dt('toutes_actions')}</option>
        ${Object.entries(DR.auditActions).map(([k, lb]) => `<option value="${k}" ${f.action === k ? 'selected' : ''}>${drEsc(lb)}</option>`).join('')}
      </select>
      <input type="date" class="form-control" value="${drEsc(f.from)}" onchange="drAuditFilter('from', this.value)" title="${drEsc(dt('du'))}">
      <input type="date" class="form-control" value="${drEsc(f.to)}" onchange="drAuditFilter('to', this.value)" title="${drEsc(dt('au'))}">
      <button class="btn btn-sm" onclick="drAuditReset()">${dt('reinitialiser')}</button>
      <span class="dr-count">${dt('compte_entrees', DR.audit.total)}</span>
    </div>
    <div class="card dr-table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>${dt('col_numero')}</th><th>${dt('col_horodatage')}</th><th>${dt('col_utilisateur')}</th><th>${dt('col_action')}</th>
          <th>${dt('col_objet')}</th><th>${dt('col_reference')}</th><th>${dt('col_details')}</th><th>${dt('col_empreinte')}</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="8" class="text-center" style="padding:2rem;color:var(--text-muted);">${dt('aucune_entree')}</td></tr>`}</tbody>
      </table>
    </div>`;
}

function drUserLabel(username) {
  const u = DR.users.find((x) => x.username === username);
  return u ? `${u.fullName} (${u.username})` : username;
}

function drDetails(d) {
  if (!d) return '';
  const skip = ['methode', 'url'];
  const parts = Object.entries(d).filter(([k]) => !skip.includes(k)).map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(' · ') : (d.url || '');
}

window.drSetSearch = function (v) {
  DR.search = v;
  const el = document.getElementById('drContent');
  if (el) el.innerHTML = drPageHtml();
  const inp = el && el.querySelector('input.form-control');
  if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); }
};
window.drSetFilter = function (v) {
  DR.filterPriv = v;
  const el = document.getElementById('drContent');
  if (el) el.innerHTML = drPageHtml();
};

// ── Édition ──
window.drEdit = function (username) {
  const u = DR.users.find((x) => x.username === username);
  if (!u) return;
  DR.editing = username;
  DR.draft = {
    privilege: u.privilege || DR.defaultPrivilege,
    scopes: (u.scopes || []).map((s) => ({ ...s })),
  };
  drRenderModal();
};

window.drCloseModal = function () {
  DR.editing = null;
  DR.draft = null;
  document.getElementById('drModalRoot').innerHTML = '';
};

// Les deux formes de portée n'ont rien en commun : on repart d'une liste vide
// en changeant de privilège plutôt que de traîner des portées sans objet.
window.drSetPrivilege = function (p) {
  const avant = DR.draft.privilege;
  DR.draft.privilege = p;
  if ((avant === 'PRESTATAIRE') !== (p === 'PRESTATAIRE')) DR.draft.scopes = [];
  drRenderModal();
};

// Portées du privilège « Prestataire » : une ligne par prestataire retenu,
// choisi par secteur d'activité puis par nom. `_secteur` n'aide qu'à filtrer
// la seconde liste ; le serveur ne retient que `prestataire_id`.
window.drAddPrestataire = function () {
  DR.draft.scopes.push({ prestataire_id: '', _secteur: '' });
  drRenderModal();
};
window.drRemovePrestataire = function (i) { DR.draft.scopes.splice(i, 1); drRenderModal(); };
window.drScopePrestSecteur = function (i, v) {
  DR.draft.scopes[i]._secteur = v;
  DR.draft.scopes[i].prestataire_id = '';
  drRenderModal();
};
window.drScopePrestNom = function (i, v) {
  DR.draft.scopes[i].prestataire_id = v;
  drRenderModal();
};
window.drAddScope = function () {
  DR.draft.scopes.push({ domaine_id: '', secteur_id: '', privilege: DR.defaultPrivilege });
  drRenderModal();
};
window.drRemoveScope = function (i) { DR.draft.scopes.splice(i, 1); drRenderModal(); };
window.drScopeDomaine = function (i, v) {
  DR.draft.scopes[i].domaine_id = v;
  DR.draft.scopes[i].secteur_id = '';
  drRenderModal();
};
window.drScopeSecteur = function (i, v) { DR.draft.scopes[i].secteur_id = v; };
window.drScopePriv = function (i, v) { DR.draft.scopes[i].privilege = v; drRenderModal(); };

function drRenderModal() {
  const u = DR.users.find((x) => x.username === DR.editing);
  if (!u) return;
  const d = DR.draft;

  const privOptions = DR.privileges.map((p) => `
    <label class="dr-radio ${d.privilege === p ? 'selected' : ''}">
      <input type="radio" name="drPriv" value="${p}" ${d.privilege === p ? 'checked' : ''} onchange="drSetPrivilege('${p}')">
      <span class="dr-radio-text">
        <strong>${dtPriv(p)}${p === DR.defaultPrivilege ? ` <em style="font-weight:400;font-size:.7rem;">${dt('par_defaut')}</em>` : ''}</strong>
        <span class="dr-radio-desc">${drPrivDesc(p)}</span>
      </span>
    </label>`).join('');

  const modePrestataire = d.privilege === 'PRESTATAIRE';
  const retenus = new Set(d.scopes.map((s) => s.prestataire_id).filter(Boolean));

  // Secteurs réellement porteurs de prestataires, dans l'ordre alphabétique.
  const secteursPrest = DR.secteurs
    .filter((s) => (DR.prestataires || []).some((p) => p.secteur_id === s.id))
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom)));

  const prestataireRows = d.scopes.map((s, i) => {
    const secteur = s._secteur
      || ((DR.prestataires || []).find((p) => p.id === s.prestataire_id) || {}).secteur_id
      || '';
    // Un prestataire déjà retenu sur une autre ligne n'est plus proposé.
    const ailleurs = new Set(d.scopes.filter((_, j) => j !== i).map((x) => x.prestataire_id).filter(Boolean));
    const choix = (DR.prestataires || [])
      .filter((p) => !secteur || p.secteur_id === secteur)
      .filter((p) => !ailleurs.has(p.id));
    return `<div class="dr-prest-row">
      <select class="form-control" onchange="drScopePrestSecteur(${i}, this.value)">
        <option value="">${dt('tous_secteurs')}</option>
        ${secteursPrest.map((sc) => `<option value="${sc.id}" ${secteur === sc.id ? 'selected' : ''}>${drEsc(sc.code ? `${sc.code} — ${sc.nom}` : sc.nom)}</option>`).join('')}
      </select>
      <select class="form-control" onchange="drScopePrestNom(${i}, this.value)">
        <option value="">${dt('choisir_prestataire')}</option>
        ${choix.map((p) => `<option value="${p.id}" ${s.prestataire_id === p.id ? 'selected' : ''}>${drEsc(p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom)}</option>`).join('')}
      </select>
      <button class="btn btn-sm" onclick="drRemovePrestataire(${i})" title="${drEsc(dt('retirer_prestataire'))}">✕</button>
    </div>`;
  }).join('');

  const scopeRows = d.scopes.map((s, i) => {
    if (modePrestataire) return '';
    const secs = DR.secteurs.filter((x) => x.domaine_id === s.domaine_id);
    return `<div class="dr-scope-row">
      <select class="form-control" onchange="drScopeDomaine(${i}, this.value)">
        <option value="">${dt('choisir_domaine')}</option>
        ${DR.domaines.map((dm) => `<option value="${dm.id}" ${s.domaine_id === dm.id ? 'selected' : ''}>${drEsc(dm.nom)}</option>`).join('')}
      </select>
      <select class="form-control" onchange="drScopeSecteur(${i}, this.value)" ${s.domaine_id ? '' : 'disabled'}>
        <option value="">${dt('tout_domaine')}</option>
        ${secs.map((sc) => `<option value="${sc.id}" ${s.secteur_id === sc.id ? 'selected' : ''}>${drEsc(sc.nom)}</option>`).join('')}
      </select>
      <select class="form-control" onchange="drScopePriv(${i}, this.value)">
        ${DR.scopePrivileges.map((p) => `<option value="${p}" ${s.privilege === p ? 'selected' : ''}>${p === 'AUCUN' ? dt('aucun_pas_acces') : dtPriv(p)}</option>`).join('')}
      </select>
      <button class="btn btn-sm" onclick="drRemoveScope(${i})" title="${drEsc(dt('retirer_portee'))}">✕</button>
    </div>`;
  }).join('');

  document.getElementById('drModalRoot').innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)drCloseModal()">
    <div class="modal dr-modal" style="max-width:660px;">
      <div class="modal-header">
        <h3>${dt('modal_titre', drEsc(u.fullName))}</h3>
        <button class="btn-icon" onclick="drCloseModal()" style="color:#fff;">✕</button>
      </div>
      <div class="modal-body">
        <p class="dr-user-line">${drEsc(u.email)} · ${dt('role_portail_court')} : ${drEsc(u.role)}</p>

        <div class="form-group">
          <label class="form-label">${dt('col_privilege_general')}</label>
          <div class="dr-radio-list">${privOptions}</div>
        </div>

        ${modePrestataire ? `
        <div class="form-group">
          <label class="form-label">${dt('portee_prestataires')}</label>
          <p class="dr-hint">${dt('hint_prestataires')}</p>
          ${d.scopes.length ? `<div class="dr-prest-head"><span>${dt('col_secteur')}</span><span>${dt('col_prestataire')}</span><span></span></div>` : ''}
          ${prestataireRows}
          <button class="btn btn-sm btn-primary" onclick="drAddPrestataire()">${dt('ajouter_prestataire')}</button>
          <p class="dr-hint">${dt('prestataires_retenus', retenus.size)}</p>
        </div>` : `
        <div class="form-group">
          <label class="form-label">${dt('portees_particulieres')}</label>
          <p class="dr-hint">${dt('hint_portees')}</p>
          ${d.scopes.length ? `<div class="dr-scope-head">
            <span>${dt('col_domaine')}</span><span>${dt('col_secteur')}</span><span>${dt('col_privilege')}</span><span></span>
          </div>` : ''}
          ${scopeRows}
          <button class="btn btn-sm btn-primary" onclick="drAddScope()">${dt('ajouter_portee')}</button>
        </div>`}

        <div id="drModalError" class="dr-error"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="drCloseModal()">${dt('annuler')}</button>
        <button class="btn btn-primary" onclick="drSave()">${dt('enregistrer')}</button>
      </div>
    </div>
  </div>`;
}

window.drSave = async function () {
  const d = DR.draft;
  const err = document.getElementById('drModalError');
  // En mode prestataire la portée est une simple liste de prestataires ;
  // une liste vide est valide et signifie « aucun accès ».
  const modePrestataire = d.privilege === 'PRESTATAIRE';
  if (modePrestataire && (d.scopes || []).some((s) => !s.prestataire_id)) {
    err.textContent = dt('err_ligne_prestataire');
    return;
  }
  if (!modePrestataire && (d.scopes || []).some((s) => !s.domaine_id)) {
    err.textContent = dt('err_portee_domaine');
    return;
  }
  // `_secteur` ne sert qu'au filtrage de la liste : il n'est pas transmis.
  const scopes = modePrestataire
    ? (d.scopes || []).filter((s) => s.prestataire_id).map((s) => ({ prestataire_id: s.prestataire_id }))
    : (d.scopes || []).filter((s) => s.domaine_id && s.privilege);
  try {
    await drApi(`/${DR.module}/users/${encodeURIComponent(DR.editing)}`, {
      method: 'PUT',
      body: JSON.stringify({ privilege: d.privilege, scopes }),
    });
    DR.users = await drApi(`/${DR.module}/users`);
    drCloseModal();
    drRender();
  } catch (e) {
    err.textContent = e.message;
  }
};
