// OASIS — « Mesures d'Application » (CARE) : la coquille — barre latérale,
// barre supérieure, aiguillage des pages, filtres, thème et langue, volet du
// dossier (ADR-003, 5.c — n° 5.f.124).
//
// Reprise du module « Suivi des Carences » de PESSCO. La coquille suit la
// charte du module « Exécution de la Surveillance » : même barre latérale
// (entrées, sélecteurs de thème et de langue, bouton de repli), même barre
// supérieure (titre « Module / Page », identité, rôle), même pied.
//
// Converti à la lettre depuis `mes-app.js` : le balisage est rendu caractère
// pour caractère. Ce fichier importe les pages ; les pages, elles, lisent la
// coquille sur la page — le paquet reste sans cycle. Ce que les étapes du
// dossier publient se lit aussi sur la page, au moment de l'appel.
import {
  MES_STATE, _mesAttr, _mesEsc, mesPeutEcrire, mesRole,
} from './etat';
import {
  mesAfficherVolet, mesCollecterConstat, mesDegeler, mesFiger,
} from './constats';
import { MES_CLOS, MES_ICONS, MES_NAV, mesNavLabel } from './libelles';
import {
  mesLignesCritiques, mesLignesMesures, mesRenderCritiques, mesRenderMesures,
} from './listes';
import { mt, requis } from './partage';
import { mesRenderDashboard } from './tableau-de-bord';
import type { CleFiltre } from './etat';

// Les sections du volet, publiées par les étapes du dossier.
const mesFilAvancement = (): string => requis('mesFilAvancement')();
const mesSectionCarence = (): string => requis('mesSectionCarence')();
const mesSectionPac = (): string => requis('mesSectionPac')();
const mesSectionInformations = (): string => requis('mesSectionInformations')();
const mesSectionDecision = (): string => requis('mesSectionDecision')();
const mesQualCorps = (): string => requis('mesQualCorps')();
const mesRenvoisInvestigation = (): string => requis('mesRenvoisInvestigation')();
const mesSectionEquipe = (): string => requis('mesSectionEquipe')();
const mesSectionTravaux = (): string => requis('mesSectionTravaux')();
const mesSectionAutresElements = (): string => requis('mesSectionAutresElements')();
const mesSectionRapport = (): string => requis('mesSectionRapport')();
const mesSectionSuiviMesures = (): string => requis('mesSectionSuiviMesures')();
const mesSectionPlanAction = (): string => requis('mesSectionPlanAction')();
const mesBarreInferieure = (ro: boolean, etape: string): string => requis('mesBarreInferieure')(ro, etape);

// Chevron du bouton de repli : il montre le geste suivant, pas l'état courant.
export function mesChevronRepli(): string | undefined {
  return MES_STATE.sidebarCollapsed
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
    : MES_ICONS.chevron;
}

export function mesRenderApp(): void {
  const S = MES_STATE;
  // Ce qui est saisi dans un volet ouvert n'existe que dans le DOM : on le
  // relève avant de réécrire `#app`, sinon il partirait avec.
  if (S.sliderOpen) {
    requis('mesMajTraitement')();
    const majQualification = window.mesMajQualification;
    if (typeof majQualification === 'function') majQualification();
  }
  if (S.constatEnCours) S.constatEnCours = { ...S.constatEnCours, ...mesCollecterConstat() };
  document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
  const u = S.user || {};
  const initiales = ((u.prenom || u.nom || 'U')[0] + ((u.nom || '')[1] || '')).toUpperCase();

  const nav = Object.entries(MES_NAV).map(([cle, cfg]) => `
        <button class="nav-btn ${S.currentPage === cle ? 'active' : ''}" data-page="${cle}"
                onclick="mesNavigateTo('${cle}')" title="${_mesAttr(mt(cfg.cle))}">
            ${MES_ICONS[cfg.icon] || ''} <span>${_mesEsc(mt(cfg.cle))}</span>
        </button>`).join('');

  const titrePage = MES_NAV[S.currentPage] ? mesNavLabel(S.currentPage) : '';
  const titre = titrePage ? mt('module_titre_page', titrePage) : mt('module_titre');
  // `.sidebar-header` est rendu **vide**, et c'est le contrat du socle : il en
  // remplit le contenu de la marque OASIS (`module-chrome.js`), et son
  // observateur le refait à chaque rendu de cet écran (ADR-003, 5.e.8). Le
  // retour, c'est le bouton que le socle met à la place de « Déconnexion ».
  const { OASIS_THEMES, oasisNomTheme } = window;

  document.getElementById('app')!.innerHTML = `
    <div class="app-layout mes-module ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header">
            </div>
            <nav class="sidebar-nav">${nav}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${OASIS_THEMES.map((th) =>
                        `<div class="theme-dot ${S.theme === th ? 'active' : ''}" data-theme="${th}"
                              onclick="mesSetTheme('${th}')" title="${oasisNomTheme(th)}"></div>`).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR', 'EN', 'PT'].map((l) =>
                        `<button class="lang-btn ${S.lang === l.toLowerCase() ? 'active' : ''}"
                                 onclick="mesSetLang('${l.toLowerCase()}')">${l}</button>`).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="mesToggleSidebar()">${mesChevronRepli()}</button>
        </aside>
        <div class="sidebar-backdrop" onclick="mesToggleSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="mesToggleSidebar()" aria-label="${_mesAttr(mt("ouvrir_menu"))}" title="${_mesAttr(mt("ouvrir_menu"))}">${MES_ICONS.menu}</button>
                    <div class="header-module-title">
                        <span style="color:var(--mes-accent);display:flex;">${MES_ICONS.shield}</span>
                        <span>${_mesEsc(titre)}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="user-info">
                        <div class="user-avatar">${_mesEsc(initiales)}</div>
                        <span>${_mesEsc(`${u.prenom || ''} ${u.nom || ''}`.trim())}</span>
                        <span class="role-badge">${_mesEsc(mesRole())}</span>
                    </div>
                    <button class="btn-logout">${MES_ICONS.logout} Déconnexion</button>
                </div>
            </header>
            <main class="main-content" id="mes-content"></main>
        </div>
    </div>
    <div class="mes-slider-overlay" id="mesSliderOverlay" onclick="mesFermerSlider()"></div>
    <div class="mes-slider" id="mesSlider"></div>
    <div id="mesModalRoot"></div>
    <div id="mesVoletRoot"></div>`;

  // Les volets sont remontés dans l'état où on les avait laissés, sans
  // rejouer leur glissement — un volet déjà ouvert n'a pas à s'ouvrir une
  // seconde fois.
  if (S.sliderOpen) mesAfficherSlider({ anime: false });
  if (S.constatEnCours) mesAfficherVolet({ anime: false });
}

// ── Filtres ──
// Un filtre retenu redessine l'écran ; la recherche, elle, ne redessine que le
// corps du tableau — re-rendre la page entière ferait perdre le curseur à
// chaque frappe.
export function mesSetFiltre(cle: CleFiltre, valeur: string): void {
  MES_STATE.filtres[cle] = valeur;
  mesRenderPage();
}

export function mesRechercher(cle: CleFiltre, valeur: string): void {
  MES_STATE.filtres[cle] = valeur;
  // La table se redessine une fois la frappe arrêtée, non à chaque touche.
  window.oasisSaisieDifferee(`mes_${cle}`, () => mesRechercherMaintenant());
}

export function mesRechercherMaintenant(): void {
  const corps = document.querySelector<HTMLElement>('[data-corps]');
  if (!corps) { mesRenderPage(); return; }
  corps.innerHTML = corps.dataset.corps === 'mesures'
    ? mesLignesMesures() : mesLignesCritiques();
  const majLiens = window.mesMajLiensExport;
  if (typeof majLiens === 'function') majLiens();
}

// Remises à zéro, écran par écran : chacun ne relâche que ses propres filtres.
export function mesResetFiltresDashboard(): void {
  const F = MES_STATE.filtres;
  F.db_prest = ''; F.db_cat = ''; F.db_type = ''; F.db_statut = ''; F.db_echeance = '';
  mesRenderPage();
}

export function mesResetFiltresMesures(): void {
  const F = MES_STATE.filtres;
  F.mes_categorie = ''; F.mes_statut = ''; F.mes_prest = ''; F.mes_recherche = '';
  F.mes_carence = '';
  mesRenderPage();
}

export function mesResetFiltresCritiques(): void {
  const F = MES_STATE.filtres;
  F.crit_origine = ''; F.crit_statut = ''; F.crit_prest = ''; F.crit_recherche = '';
  mesRenderPage();
}

export function mesNavigateTo(page: string): void {
  // Changer d'écran referme le volet : il appartient à la page qu'on quitte,
  // et le laisser ouvert par-dessus la suivante n'aurait pas de sens.
  if (MES_STATE.sliderOpen) mesFermerSlider();
  MES_STATE.currentPage = page;
  mesRenderApp();
  mesRenderPage();
  window.parent.postMessage({ type: 'mes:page', page }, '*');
}

export function mesRenderPage(): void {
  const el = document.getElementById('mes-content');
  if (!el) return;
  let corps = '';
  switch (MES_STATE.currentPage) {
    case 'mesures': corps = mesRenderMesures(); break;
    case 'critiques': corps = mesRenderCritiques(); break;
    case 'etats': corps = requis('mesRenderEtats')(); break;
    case 'parametres': corps = requis('mesRenderParametres')(); break;
    default: corps = mesRenderDashboard();
  }
  // Le pied de page vient du chrome du socle (`module-chrome.js`), qui
  // l'injecte dans .app-content : le module n'en pose pas de second.
  el.innerHTML = corps;
}

// Replier la barre, changer de thème ou de langue ne redessine plus la
// coquille entière : `mesRenderApp` réécrit tout `#app`, volets compris, et
// une saisie en cours partait avec eux. Chacune de ces trois commandes ne
// touche désormais que ce qui la concerne.
export function mesToggleSidebar(): void {
  const S = MES_STATE;
  S.sidebarCollapsed = !S.sidebarCollapsed;
  localStorage.setItem('mes_sidebar', String(S.sidebarCollapsed));
  document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
  // `.mes-module` habille aussi le body : c'est « .app-layout » qu'il faut
  // viser, sinon la classe se pose sur le body et la colonne de contenu ne
  // reprend jamais la largeur libérée par la barre.
  document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed', !!S.sidebarCollapsed);
  document.querySelector('.app-sidebar')?.classList.toggle('collapsed', !!S.sidebarCollapsed);
  // La flèche du bouton indique le geste suivant : elle seule change de sens.
  const bouton = document.querySelector('.sidebar-toggle');
  if (bouton) bouton.innerHTML = String(mesChevronRepli());
}

export function mesSetTheme(theme: string): void {
  MES_STATE.theme = theme;
  window.oasisAppliquerTheme(theme);
}

export function mesSetLang(lang: string): void {
  MES_STATE.lang = lang;
  localStorage.setItem('pr_lang', lang);
  // L'attribut `lang` de la page suit : un lecteur d'écran prononce alors
  // l'écran dans la langue où il est écrit.
  window.oasisPoserLangue(lang);
  // Les libellés changent : la coquille doit être redessinée. Les volets
  // ouverts sont alors remontés tels quels, saisie comprise. Les commandes
  // posées dans la barre supérieure — instance regardée, gestion des droits —
  // vivent hors de la coquille : elles se redessinent à part, sans quoi elles
  // gardaient la langue d'avant.
  mesRenderApp();
  mesRenderPage();
  const dessinerActions = window.mesDessinerActions;
  if (typeof dessinerActions === 'function') dessinerActions();
}

// ── Le volet du dossier ──
export function mesFermerSlider(): void {
  MES_STATE.mesureEnCours = null;
  MES_STATE.carenceEnCours = null;
  MES_STATE.traitement = null;
  MES_STATE.etapeVue = '';
  MES_STATE.sliderOpen = false;
  document.getElementById('mesSlider')?.classList.remove('open');
  document.getElementById('mesSliderOverlay')?.classList.remove('open');
}

// Hauteur réelle du bandeau UEMOA, relevée sur la page : le volet s'arrête
// juste au-dessus. La mesurer vaut mieux que la deviner — le bandeau grandit
// d'une ligne dès que la fenêtre se resserre.
export function mesMesurerPied(): void {
  const pied = document.querySelector('.oasis-module-footer');
  const h = pied ? Math.round(pied.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty('--mes-pied', `${h || 44}px`);
}

// Le bandeau passe sur deux lignes quand la fenêtre se resserre : le volet
// suit, sinon il le recouvrirait de nouveau.
window.addEventListener('resize', () => { if (MES_STATE.sliderOpen) mesMesurerPied(); });

export function mesAfficherSlider(o?: { anime?: boolean }): void {
  const el = document.getElementById('mesSlider');
  if (!el) return;
  mesMesurerPied();
  // Ajouter une ligne ou cocher une case redessine le volet entier : sans
  // cela, la page remontait en haut à chaque geste et il fallait redescendre
  // à l'endroit où l'on travaillait. La position de lecture est reprise.
  const corpsAvant = el.querySelector('.mes-slider-body');
  const defilement = corpsAvant ? corpsAvant.scrollTop : 0;
  el.innerHTML = mesFormulaireMesure();
  if (defilement) {
    const corps = el.querySelector('.mes-slider-body');
    if (corps) corps.scrollTop = defilement;
  }
  const fond = document.getElementById('mesSliderOverlay');
  const sansAnimation = !!(o && o.anime === false);
  if (sansAnimation) { mesFiger(el); mesFiger(fond); }
  el.classList.add('open');
  fond?.classList.add('open');
  if (sansAnimation) { mesDegeler(el); mesDegeler(fond); }
  MES_STATE.sliderOpen = true;
}

// Volet du traitement d'une carence. Il n'affiche que les sections de l'étape
// regardée : le formulaire de mesure autonome qu'il portait jadis n'avait plus
// de porte d'entrée depuis que la mesure se décide à la qualification.
export function mesFormulaireMesure(): string {
  const m: { statut?: string } = MES_STATE.mesureEnCours || {};
  const clos = MES_CLOS.includes(m.statut || '');
  // Une mesure clôturée ou annulée se consulte, elle ne se réécrit plus.
  const ro = clos || !mesPeutEcrire();

  // Le volet suit le fil de la carence : tant que la suite à donner n'est
  // pas décidée, ce sont les sections de la première étape qui s'affichent.
  const etape = requis('mesEtapeCourante')();

  return `
    <div class="mes-slider-header">
        <button class="btn btn-outline btn-sm mes-btn-retour" onclick="mesFermerSlider()"
                title="${_mesAttr(mt('retour'))}">${MES_ICONS.back} ${mt('retour')}</button>
        <span class="mes-slider-titre">${mt('traitement_carence')}</span>
    </div>
    ${mesFilAvancement()}
    <div class="mes-slider-body">
        ${clos ? `<p class="mes-note">${mt('mesure_close_consulte')}</p>` : ''}
        ${etape === 'suite' ? `
            ${mesSectionCarence()}
            ${mesSectionPac()}
            ${mesSectionInformations()}
            ${mesSectionDecision()}` : ''}
        ${etape === 'qualification' ? mesQualCorps() : ''}
        ${etape === 'investigations' ? `
            ${mesRenvoisInvestigation()}
            ${mesSectionEquipe()}
            ${mesSectionTravaux()}
            ${mesSectionAutresElements()}
            ${mesSectionRapport()}` : ''}
        ${etape === 'suivi' ? `
            ${mesSectionSuiviMesures()}
            ${mesSectionPlanAction()}` : ''}
        <p class="mes-erreur" id="mesFormErreur"></p>
    </div>
    ${mesBarreInferieure(ro, etape)}`;
}
