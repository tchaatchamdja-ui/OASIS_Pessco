/* OASIS — Portail
 * Suite de app-config.js : la navigation, les notifications et le démarrage du portail.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ══════════ Navigation ══════════
// Les vues `mod_<CODE>` sont ajoutées par /js/modules-host.js à partir des
// manifestes des modules installés.
const VIEWS = { home: renderHome, profile: renderProfile, users: renderUsers, audit: renderAudit, config: renderConfig };

function navigate(view) {
  CURRENT_VIEW = view;
  portailReinitialiserRecherche();
  // Sortie d'un module plein écran : restaure la sidebar et la tagline du portail
  if (!String(view).startsWith('mod_') && typeof planSetModuleChrome === 'function') planSetModuleChrome(false);
  document.querySelectorAll('.portal-nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('mainView').innerHTML = '<div class="loading-spinner"></div>';
  (VIEWS[view] || renderHome)().catch((err) => {
    if (err.message !== 'unauthenticated') {
      document.getElementById('mainView').innerHTML = `<div class="shell-card">Erreur de chargement : ${esc(err.message)}</div>`;
    }
  });
}

// ══════════ Notifications ══════════
async function refreshNotifications() {
  try {
    const res = await api('/api/notifications');
    const notifs = await res.json();
    const unseen = notifs.filter((n) => n.id > NOTIF_LAST_SEEN).length;
    const badge = document.getElementById('notifBadge');
    badge.style.display = unseen ? 'flex' : 'none';
    badge.textContent = unseen;
    return notifs;
  } catch {
    return [];
  }
}

// ══════════ Init ══════════
async function loadMe() {
  const res = await api('/api/me');
  ME = await res.json();
  document.getElementById('userName').textContent = ME.user.fullName;
  document.getElementById('userRole').textContent = ME.user.role;
  const avatarEl = document.getElementById('userAvatar');
  if (ME.user.photo) {
    avatarEl.innerHTML = `<img src="${ME.user.photo}" alt="">`;
    avatarEl.classList.add('has-photo');
  } else {
    avatarEl.classList.remove('has-photo');
    avatarEl.textContent = (ME.user.fullName || ME.user.username).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  }
  majBandeauInstance();
  const logoEl = document.getElementById('sidebarLogo');
  const logo = ME.aac && ME.aac.logo;
  if (logo) {
    logoEl.innerHTML = `<img src="${logo}" alt="Logo AAC">`;
    logoEl.style.display = 'flex';
  } else {
    logoEl.innerHTML = '';
    logoEl.style.display = 'none';
  }
  document.querySelectorAll('.portal-nav-btn[data-roles]').forEach((btn) => {
    btn.style.display = btn.dataset.roles.split(',').includes(ME.user.role) ? '' : 'none';
  });
  if (ME.user.mustChange) document.getElementById('pwdModal').style.display = 'flex';
}

// Bouton de rétraction/extension de la barre latérale (identique aux modules)
const CHEV_RIGHT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>';
const CHEV_LEFT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
window.toggleSidebar = function () {
  const collapsed = document.body.classList.toggle('app-sidebar-collapsed');
  const btn = document.getElementById('sidebarToggle');
  if (btn) {
    btn.innerHTML = collapsed ? CHEV_RIGHT : CHEV_LEFT;
    btn.title = collapsed ? t('sb_expand') : t('sb_collapse');
  }
};

function initIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 18);
  });
  document.getElementById('brandLogo').innerHTML = OASIS_LOGO_IMG;
  const sbBtn = document.getElementById('sidebarToggle');
  if (sbBtn) {
    const collapsed = document.body.classList.contains('app-sidebar-collapsed');
    sbBtn.innerHTML = collapsed ? CHEV_RIGHT : CHEV_LEFT;
    sbBtn.title = collapsed ? t('sb_expand') : t('sb_collapse');
  }
}

window.onLangChange = () => navigate(CURRENT_VIEW);

document.getElementById('sidebarNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.portal-nav-btn');
  if (btn) navigate(btn.dataset.view);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

document.getElementById('notifBell').addEventListener('click', async () => {
  const panel = document.getElementById('notifPanel');
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    return;
  }
  const notifs = await refreshNotifications();
  panel.innerHTML =
    `<div style="padding:.7rem 1rem;font-weight:700;color:var(--primary);border-bottom:1px solid var(--border);">${esc(t('notif_title'))}</div>` +
    (notifs.length
      ? notifs.map((n) => `<div class="portal-notif-item">${esc(n.message)}<div class="notif-ts">${fmtDate(n.ts)}</div></div>`).join('')
      : `<div class="portal-notif-item">${esc(t('notif_empty'))}</div>`);
  panel.style.display = 'block';
  if (notifs.length) {
    NOTIF_LAST_SEEN = Math.max(...notifs.map((n) => n.id));
    localStorage.setItem('oasis_notif_seen', String(NOTIF_LAST_SEEN));
    document.getElementById('notifBadge').style.display = 'none';
  }
});

document.getElementById('pwdSubmit').addEventListener('click', async () => {
  const oldPassword = document.getElementById('pwdOld').value;
  const newPassword = document.getElementById('pwdNew').value;
  const confirmVal = document.getElementById('pwdConfirm').value;
  if (newPassword !== confirmVal) return showToast(t('mdp_discordants'), 'error');
  const res = await api('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (res.ok) {
    document.getElementById('pwdModal').style.display = 'none';
    showToast(t('mdp_change'), 'success');
    loadMe();
  } else {
    const data = await res.json().catch(() => ({}));
    const msg =
      data.error === 'policy' ? t('mdp_politique', reglesMotDePasse(data.details))
      : oasisMessageErreur(data, res.status);
    showToast(msg, 'error', 4500);
  }
});

(async function init() {
  document.body.classList.remove('app-sidebar-collapsed'); // barre latérale étendue à l'ouverture
  initIcons();
  applyLang(localStorage.getItem('pr_lang') || 'fr');
  await loadMe();
  // Vues des modules installés (nécessite la session ouverte)
  if (typeof moduleHostRegisterViews === 'function') await moduleHostRegisterViews(true);
  navigate('home');
  refreshNotifications();
  setInterval(refreshNotifications, 60000);
})().catch((e) => {
  // Sans session, `api` renvoie déjà la fenêtre à la connexion et interrompt
  // le démarrage : le rejet qui s'ensuit est attendu, il n'a pas à s'afficher
  // en console. Tout autre échec, lui, doit se voir.
  if (!e || e.message !== 'unauthenticated') console.error(e);
});
