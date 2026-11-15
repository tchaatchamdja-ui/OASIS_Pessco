// OASIS — Planification : la coquille de l'écran — démarrage, chargement des
// données, navigation, barre latérale, rendu de la page, volet du calendrier,
// fenêtre modale (ADR-003, 5.c — n° 5.f.109).
//
// Converti à la lettre depuis `pl-shell.js`, le dernier fichier de PLAN. Les
// pages qu'il aiguille sont rendues par d'autres paquets, chargés après lui :
// il les lit sur la page au moment du rendu, comme il les lisait par leur nom.
import { _userM2Role, type AccesPlan } from './droits';
import { PLAN_ICONS } from './icones';
import { etat, requis, tp } from './partage';

/** Une entrée de la barre latérale. */
interface EntreeNav {
  labelKey: string;
  icon: string;
  subs?: { id: string; labelKey: string }[];
}

/** Le compte, tel que la barre supérieure l'affiche. */
interface Compte {
  nom?: string;
  prenom?: string;
}

// ══════════════════════════════════════
//  NAVIGATION CONFIG
// ══════════════════════════════════════

// Une date se lit jj/mm/aaaa à l'écran, quand elle s'enregistre aaaa-mm-jj.
// La conversion se fait sur la chaîne, sans passer par `Date` : « 2026-11-20 »
// interprété comme minuit UTC recule d'un jour pour qui vit à l'ouest de
// Greenwich, et la date affichée ne serait plus celle qui est enregistrée.
export function planDateFr(valeur: unknown): string {
  const s = String(valeur || '').substring(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

// La suite `planification-navigateur` lit cette table dans la source — une
// entrée par ligne, la clé en tête — pour savoir quelles pages l'écran déclare.
const PLAN_NAV: Record<string, EntreeNav> = {
  dashboard: { labelKey: 'dashboard', icon: 'dashboard' },
  prestataires: { labelKey: 'profils_de_risques', icon: 'risk_profile' },
  plans: { labelKey: 'nav_plans', icon: 'plans' },
  workflow: { labelKey: 'workflow', icon: 'workflow' },
  'mes-activites': { labelKey: 'nav_mes_activites', icon: 'plans' },
  historique: { labelKey: 'historique', icon: 'history' },
  // Paramètres removed - managed from portal Configuration
};

// ── Aller à une page, par la page ──
//
// `index.html` remplace `window.planNavigateTo` après le premier rendu, pour
// dire au portail la page ouverte. L'ancien fichier, un script classique,
// appelait le nom nu, qui suivait ce remplacement ; un module appellerait sa
// propre fonction et le portail ne saurait plus rien. Les appels internes
// passent donc par la page.
const naviguer = (page: string, sub?: string): void => requis('planNavigateTo')(page, sub);

// ══════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════

export function initPlanificationModule(): void {
  const S = etat();
  S.user = window.PESSCO?.user || JSON.parse(localStorage.getItem('pr_user') || 'null');
  S.lang = window.PESSCO?.lang || localStorage.getItem('pr_lang') || 'fr';
  S.theme = window.oasisThemeNormalise(window.PESSCO?.theme || window.oasisThemeEnregistre());
  if (!S.user) { window.location.href = '/login'; return; }
  document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
  document.documentElement.setAttribute('data-theme', S.theme);
  void planLoadData().then(() => {
    planRenderApp();
    naviguer('dashboard');
  });
}

// Le module ne se monte qu'une fois, depuis index.html, qui attend le contexte
// du serveur. Ce second démarrage montait l'écran sur le seul compte gardé en
// mémoire du navigateur : il s'ouvrait donc à un compte dont le contexte
// venait d'être refusé, la page d'accueil s'affichant sous un boot en échec.
// `initPlanificationModule` reste pour le mode hébergé (PESSCO).

// ── Data Loading ──
export async function planLoadData(): Promise<void> {
  const api = window.api;
  const M = window.PLAN_MODULE_API;
  try {
    const shared = window.PESSCO?.sharedData || {};
    const domaines = shared.domaines || await api('/api/domaines');
    const secteurs = shared.secteurs || await api('/api/secteurs');
    const sousActivites = shared.sousActivites || await api('/api/sous-activites');
    const prestataires = shared.prestataires || await api('/api/prestataires');
    const aac = shared.aac || await api('/api/aac');

    const [plans, stats, inspecteurs, typesSupervision, exigences, riskProfiles,
      modesSupervision, themesSupervision, prestataireRisques, allActivites] = await Promise.all([
      api(`${M}/plans`),
      api(`${M}/stats`),
      api('/api/inspecteurs'),
      api('/api/types-supervision'),
      api('/api/exigences'),
      api('/api/shared/risk-profiles').catch(() => []),
      api('/api/modes-supervision').catch(() => []),
      api('/api/themes-supervision').catch(() => []),
      api(`${M}/prestataires-risques`).catch(() => []),
      api(`${M}/all-activites`).catch(() => []),
    ]);

    etat().data = {
      domaines, secteurs, sousActivites, prestataires, aac, plans, stats,
      inspecteurs, typesSupervision, exigences, riskProfiles,
      modesSupervision, themesSupervision, prestataireRisques, allActivites,
    };

    // Privilèges du module (Gestion des Droits) : ils gouvernent
    // l'édition dans les deux super-menus, au même titre que dans
    // « Profils de Risques ».
    try {
      etat().access = await api('/api/m/droits/PLAN/my-access');
    } catch {
      const aucun: AccesPlan = { hasAccess: false, privilege: '', secteurs: {} };
      etat().access = aucun;
    }
  } catch (e) {
    console.error('Planification data load error:', e);
  }
}

// ══════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════

export function planNavigateTo(page: string, sub = ''): void {
  const S = etat();
  // Ferme tout modal/slider ouvert avant changement de page. Le volet du
  // calendrier se retire aussi de l'état : sans cela, le rendu qui suit le
  // reconstruisait aussitôt, et un clic dans la barre latérale ne le fermait
  // qu'en apparence.
  S.calendrierVolet = false;
  document.querySelectorAll('.modal-overlay, .pr-slicer, .pr-slicer-overlay').forEach((el) => el.remove());
  S.currentPage = page;
  S.currentSub = sub;
  if (page !== 'plan-detail') {
    S.selectedPlan = null;
  }
  planUpdateNavUI();
  planRenderPage();
  document.querySelector('.app-sidebar')?.classList.remove('mobile-open');
  document.querySelector('.sidebar-backdrop')?.classList.remove('show');
}

export function planUpdateNavUI(): void {
  const S = etat();
  document.querySelectorAll<HTMLElement>('.nav-btn').forEach((btn) => {
    const p = btn.dataset.page;
    btn.classList.toggle('active', p === S.currentPage || (S.currentPage === 'plan-detail' && p === 'plans'));
  });
  // MAJ du titre de la barre supérieure : Module / Page courante
  const _key = S.currentPage === 'plan-detail' ? 'plans' : S.currentPage;
  const _cfg = PLAN_NAV[_key];
  const _label = _cfg ? (tp(_cfg.labelKey) || _cfg.labelKey) : '';
  const _span = document.querySelector('.app-header .header-module-title span');
  if (_span) _span.textContent = tp('module_title') + (_label ? ' / ' + _label : '');
}

export function planSetTheme(theme: string): void {
  // Changer de thème ou de langue, c'est reprendre l'écran de fond : le
  // volet du calendrier se referme, comme au moindre pas dans le menu.
  planFermerCalendrier();
  etat().theme = theme;
  window.oasisAppliquerTheme(theme);
}

export function planSetLang(lang: string): void {
  planFermerCalendrier();
  const S = etat();
  S.lang = lang;
  localStorage.setItem('pr_lang', lang);
  // L'attribut `lang` de la page suit : un lecteur d'écran prononce alors
  // l'écran dans la langue où il est écrit.
  window.oasisPoserLangue(lang);
  if (window.PESSCO) window.PESSCO.lang = lang;
  planRenderApp();
  naviguer(S.currentPage, S.currentSub);
}

const CHEVRON_DROIT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>';
const CHEVRON_GAUCHE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';

export function planToggleSidebar(): void {
  const S = etat();
  S.sidebarCollapsed = !S.sidebarCollapsed;
  localStorage.setItem('plan_sidebar', String(S.sidebarCollapsed));
  document.querySelector('.app-sidebar')?.classList.toggle('collapsed', S.sidebarCollapsed);
  document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed', S.sidebarCollapsed);
  document.body.classList.toggle('app-sidebar-collapsed', S.sidebarCollapsed);
  // Update chevron direction
  const toggleBtn = document.querySelector('.sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = S.sidebarCollapsed ? CHEVRON_DROIT : CHEVRON_GAUCHE;
  }
}

export function planToggleMobileSidebar(): void {
  document.querySelector('.app-sidebar')?.classList.toggle('mobile-open');
  document.querySelector('.sidebar-backdrop')?.classList.toggle('show');
}

export function planResetFilters(): void {
  etat().filters = { domaine: '', secteur: '', prestataire: '', sousActivite: '', theme: '', statut: '', search: '', annee: '' };
  planRenderPage();
}

// ══════════════════════════════════════
//  RENDER APP SHELL
// ══════════════════════════════════════

export function planRenderApp(): void {
  const S = etat();
  const compte = S.user as Compte | null | undefined;
  const initials = (compte?.nom || 'U').split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

  let navHtml = '';
  for (const [key, config] of Object.entries(PLAN_NAV)) {
    navHtml += `<button class="nav-btn ${S.currentPage === key ? 'active' : ''}" data-page="${key}" onclick="planNavigateTo('${key}')" title="${tp(config.labelKey)}">
            ${PLAN_ICONS[config.icon] || ''} <span>${tp(config.labelKey)}</span>
        </button>`;
  }

  // L'en-tête de la barre latérale est vide : le retour au portail est posé
  // par la coquille commune, qui remplace le bouton de déconnexion. Une
  // version propre au module vivait ici, sous condition de `window.PESSCO` —
  // que ce module met à null — et appelait `backToPortal`, qu'il ne définit
  // pas. Elle ne pouvait donc que rester invisible, ou échouer si la
  // condition changeait.
  const courante = PLAN_NAV[S.currentPage];
  document.getElementById('app')!.innerHTML = `
    <div class="app-layout ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header"></div>
            <nav class="sidebar-nav">${navHtml}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${window.OASIS_THEMES.map((th) =>
    `<div class="theme-dot ${S.theme === th ? 'active' : ''}" data-theme="${th}" onclick="planSetTheme('${th}')" title="${window.oasisNomTheme(th)}"></div>`,
  ).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR', 'EN', 'PT'].map((l) =>
    `<button class="lang-btn ${S.lang === l.toLowerCase() ? 'active' : ''}" onclick="planSetLang('${l.toLowerCase()}')">${l}</button>`,
  ).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="planToggleSidebar()">
                ${S.sidebarCollapsed ? CHEVRON_DROIT : PLAN_ICONS.chevron}
            </button>
        </aside>
        <div class="sidebar-backdrop" onclick="planToggleMobileSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="planToggleMobileSidebar()" aria-label="${tp('ouvrir_menu')}" title="${tp('ouvrir_menu')}">${PLAN_ICONS.menu}</button>
                    <div class="header-module-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--accent)">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>${tp('module_title')}${courante ? ' / ' + (tp(courante.labelKey) || courante.labelKey) : ''}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="plan-notif-bell" onclick="planToggleNotifPanel()" title="Notifications" style="position:relative;cursor:pointer;padding:0.35rem;">
                        ${PLAN_ICONS.bell}
                        <span class="plan-notif-badge" id="planNotifBadge" style="display:none;"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <span>${((compte?.prenom || '') + ' ' + (compte?.nom || '')).trim()}</span>
                        <span class="role-badge">${_userM2Role()}</span>
                    </div>
                    <button class="btn-logout">${PLAN_ICONS.logout} ${tp('logout')}</button>
                </div>
            </header>
            <main class="main-content" id="planPageContent"></main>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  RENDER PAGE CONTENT
// ══════════════════════════════════════

/** Le rendu d'une page de l'aiguillage, lu sur la page au moment du rendu. */
const rendre = (nom: 'planRenderDashboard' | 'planRenderPlans' | 'planRenderPlanDetail' | 'planRenderPrestataires'
  | 'planRenderWorkflow' | 'planRenderMesActivites' | 'planRenderHistory'): string => requis(nom)();

export function planRenderPage(): void {
  const S = etat();
  const el = document.getElementById('planPageContent');
  if (!el) return;

  const config = PLAN_NAV[S.currentPage];
  let subNav = '';
  if (config?.subs?.length) {
    const premier = config.subs[0];
    if (!S.currentSub && premier) S.currentSub = premier.id;
    subNav = `<div class="sub-nav">${config.subs.map((s) =>
      `<button class="sub-nav-btn ${S.currentSub === s.id ? 'active' : ''}" onclick="PLAN_STATE.currentSub='${s.id}';planRenderPage();">${tp(s.labelKey)}</button>`,
    ).join('')}</div>`;
  }

  let content = '';
  switch (S.currentPage) {
    case 'dashboard': content = rendre('planRenderDashboard'); break;
    case 'plans': content = rendre('planRenderPlans'); break;
    case 'plan-detail': content = rendre('planRenderPlanDetail'); break;
    case 'prestataires': content = rendre('planRenderPrestataires'); break;
    case 'workflow': content = rendre('planRenderWorkflow'); break;
    case 'mes-activites': content = rendre('planRenderMesActivites'); break;
    case 'historique': content = rendre('planRenderHistory'); break;
    default: content = `<div class="text-center">${tp('no_data')}</div>`;
  }
  el.innerHTML = subNav + content;

  // ── Les discussions du plan, chargées après le rendu ──
  //
  // L'ancien minuteur lisait le plan choisi **cent millisecondes plus tard**,
  // non au moment du rendu (n° 5.f.106) : quitter le détail dans l'intervalle
  // le faisait lire `null`, et lever une exception. Le plan est lu ici, au
  // rendu ; le minuteur ne charge que si ce détail est encore celui qu'on
  // regarde — sinon un autre rendu a posé le sien.
  const plan = S.currentPage === 'plan-detail' ? S.selectedPlan as { id: string } | null : null;
  if (plan) {
    const id = plan.id;
    setTimeout(() => {
      const ouvert = etat().selectedPlan as { id?: string } | null;
      if (etat().currentPage === 'plan-detail' && ouvert && ouvert.id === id) requis('planLoadComments')(id);
    }, 100);
  }

  // Le volet du calendrier se refait avec la page : ses commandes appellent
  // `planRenderPage()` comme les autres écrans.
  if (S.calendrierVolet) _planDessinerVoletCalendrier();

  // Les flèches du calendrier se règlent sur la largeur une fois la page posée.
  setTimeout(() => window.planCalNavEtat && window.planCalNavEtat(), 0);

  // Update notification badge
  requis('planUpdateNotifBadge')();
}

// ══════════════════════════════════════
//  VOLET « CALENDRIER »
// ══════════════════════════════════════
// L'écran ne figure plus dans la barre latérale : il s'ouvre depuis le
// calendrier du tableau de bord et sort de la droite, comme les volets du
// module « Profils de Risque ». Le bouton « Retour » précède son titre et
// ramène à ce qu'on regardait.
export function planOuvrirCalendrier(): void {
  etat().calendrierVolet = true;
  _planDessinerVoletCalendrier(true);
  setTimeout(() => window.planCalNavEtat && window.planCalNavEtat(), 0);
}

export function planFermerCalendrier(): void {
  etat().calendrierVolet = false;
  const volet = document.getElementById('planVolet');
  const fond = document.getElementById('planVoletFond');
  if (!volet) return;
  volet.classList.remove('open');
  if (fond) fond.classList.remove('open');
  setTimeout(() => { volet.remove(); if (fond) fond.remove(); }, 350);
}

function _planDessinerVoletCalendrier(ouverture?: boolean): void {
  const corps = requis('planRenderCalendar')();
  const existant = document.getElementById('planVolet');
  // Rendu suivant : on remplace le contenu sans rejouer le glissement.
  if (existant && !ouverture) {
    existant.querySelector('.pr-slicer-body')!.innerHTML = corps;
    return;
  }
  if (existant) existant.remove();
  const fondExistant = document.getElementById('planVoletFond');
  if (fondExistant) fondExistant.remove();

  const fond = document.createElement('div');
  fond.id = 'planVoletFond';
  fond.className = 'pr-slicer-overlay';
  fond.addEventListener('click', planFermerCalendrier);

  const volet = document.createElement('div');
  volet.id = 'planVolet';
  volet.className = 'pr-slicer';
  volet.innerHTML = `
        <div class="pr-slicer-header">
            <div class="pr-slicer-titre">
                <button class="pr-slicer-back" onclick="planFermerCalendrier()">${PLAN_ICONS.back}<span>${tp('back')}</span></button>
                <h3>${tp('calendrier')}</h3>
            </div>
            <button class="pr-slicer-close" onclick="planFermerCalendrier()">${PLAN_ICONS.close}</button>
        </div>
        <div class="pr-slicer-body">${corps}</div>`;

  document.body.appendChild(fond);
  document.body.appendChild(volet);
  requestAnimationFrame(() => { fond.classList.add('open'); volet.classList.add('open'); });
}

// ── Modal helper ──
export function planShowModal(title: string, bodyHtml: string, footerHtml = '', size = ''): void {
  const existing = document.getElementById('planModal');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'planModal';
  // size === 'modal-drawer' : volet latéral sortant de la droite
  const drawer = String(size).includes('modal-drawer');
  div.className = `modal-overlay${drawer ? ' drawer-overlay' : ''}`;
  div.innerHTML = `<div class="modal ${size}">
        <div class="modal-header"><h3>${title}</h3><button class="btn-icon" onclick="planCloseModal()" aria-label="${tp('close')}" title="${tp('close')}">${PLAN_ICONS.close}</button></div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', (e) => { if (e.target === div) planCloseModal(); });
}

export function planCloseModal(): void {
  const m = document.getElementById('planModal');
  if (m) m.remove();
}
