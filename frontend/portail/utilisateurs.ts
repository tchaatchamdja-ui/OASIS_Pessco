// OASIS — L'écran des comptes (ADR-003, 5.e.1).
//
// Deuxième pièce d'`app.js`, et la plus lourde : six onglets, cinq fenêtres, et
// **quatre gestes qui écrivent** — dont l'effacement d'un compte, qui est
// irréversible et demande le mot de passe de celui qui le prononce.
//
// ── Trois états, et aucun n'a eu à monter sur `window` ──
//
// `USER_TAB`, `USER_COLLAPSED` et `ALL_MODULES` étaient des `let` du premier
// niveau d'`app.js` — des globales **lexicales**. Aucun autre fichier ne les
// lisait : ils deviennent privés au module. Troisième fois (`AAC_CFG` en 5.d.5,
// `PORTAIL_RECHERCHE` en 5.e.0), et toujours le même critère — **ce qu'un autre
// fichier doit atteindre**, non la nature de la donnée.
//
// ── Ce que la conversion ne corrige pas, et qui est nommé ──
//
// `submitEditUser` envoie **tous** les champs de la fenêtre, y compris vides. Le
// serveur les écrit, donc un champ que la fenêtre n'aurait pas su relire effacerait
// la valeur enregistrée. C'est le défaut que la suite « parcours » nomme depuis
// 5.c — *le champ effacé parce qu'il est parti vide* —, et c'est la même famille
// que celui que j'ai introduit puis corrigé en 5.d.5.
//
// Il n'est **pas** corrigé ici : le corriger changerait ce que la route reçoit, et
// six étapes se sont interdit de changer en convertissant. Mais le typage le rend
// visible — les champs facultatifs de la fenêtre sont lus par `valeurFacultative`,
// qui dit en son nom que l'absence et le vide s'y confondent.
//
// ── Ce qui reste emprunté à `app.js` ──
//
// `fmtDate`, `reglesMotDePasse`, `phoneFieldHtml` et `phoneFieldValue`. Les deux
// derniers sont le bloc du téléphone, prévu pour 5.e.4 ; les deux premiers
// partiront avec lui.
import { confirmer } from '../socle/toast';
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t } from './traductions';
import { fermer, racineExigee, tousDans } from './fenetres';
import { searchInputHtml, portailReinitialiserRecherche } from './barre';
import {
  PORTEE_LABELS, brancherPortee, porteeDe, porteeFieldsHtml,
} from './instances';
import type { Moi } from './etat';
import type { Enregistrement } from './schemas';
// Les types, les deux tables d'onglets et les deux lectures pures : extraits
// parce que ce fichier dépassait les 600 lignes du garde-fou (voir `comptes.ts`).
import {
  PRESTA_TABS, USER_TABS, splitName, userRole,
  type Compte, type ModuleCompte, type Onglet,
} from './comptes';
import type { DonneesErreur } from '../socle/commun';
import { fmtDate, loadRefs, reglesMotDePasse } from './outils';
import { phoneFieldHtml, phoneFieldValue } from './telephone';

declare global {
  interface Window {
    /** Change d'onglet, vide la recherche, redessine. */
    setUserTab: (id: string) => void;
    /** Replie ou déplie la barre latérale des comptes. */
    toggleUserSidebar: () => void;
    /** Enregistre les accès aux modules d'un compte. */
    saveUserModules: (username: string) => Promise<void>;
    /** Enregistre la fenêtre d'édition d'un compte. */
    submitEditUser: (username: string) => Promise<void>;
    /** Referme la fenêtre des comptes. */
    closeUserModal: () => void;

    // Les sept noms déposés (5.e.5) et les deux du téléphone (importés depuis
    // 5.e.4) ne sont plus déclarés : seul `renderUsers` les appelait, et il les
    // importe.
  }
}

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

/**
 * La session, exigée.
 *
 * L'original écrit `ME.user.role` sans précaution : appelé avant la session, il
 * lève. On lève aussi, en nommant la cause — le choix fait en 5.d.1, 5.d.5,
 * 5.d.6 et 5.e.0. Aucun chemin n'y mène : cet écran n'existe qu'une fois la
 * session chargée.
 */
function compte(): Moi {
  const m = window.ME;
  if (!m) throw new Error("l'écran des comptes a été rendu sans session : `ME` est vide");
  return m;
}

/**
 * La valeur d'un champ, ou la chaîne vide s'il n'est pas dans la fenêtre.
 *
 * Nommée ainsi parce que l'original l'écrit ainsi — `document.getElementById('euPortee')
 * ? …value : ''` —, et que c'est **le** défaut de cet écran : un champ absent et
 * un champ vide partent de la même façon, et le serveur écrit les deux. Voir
 * l'en-tête du fichier.
 */
const valeurFacultative = (id: string): string =>
  (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';

/**
 * La valeur d'un champ **attendu**.
 *
 * L'original écrit `document.getElementById('euNom').value` : un champ absent y
 * lève. On lève aussi, en nommant le champ — la correction de 5.d.5, où un repli
 * silencieux faisait partir une requête avec un champ vidé.
 */
const valeur = (id: string): string => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`champ introuvable dans la fenêtre : « ${id} »`);
  return (el as HTMLInputElement | HTMLSelectElement).value;
};

const texte = (v: unknown): string => (v == null ? '' : String(v));

/**
 * La racine des fenêtres de cet écran.
 *
 * L'original écrit `document.getElementById('userModalRoot').innerHTML = …` sans
 * précaution : la racine absente y lève. On lève aussi, en nommant la cause.
 *
 * `closeUserModal`, lui, reste permissif, et la distinction est voulue :
 * **refermer une fenêtre qui n'est pas là n'est pas une erreur, en ouvrir une
 * dans le vide l'est.** C'est le choix fait pour `closeRefModal` en 5.d.1.
 *
 * Les deux conduites et les deux racines vivent dans `./fenetres` depuis le
 * 14 octobre 2026 (5.e.10) : le portail n'en a que deux, et l'identifiant y vient
 * du **type** — une racine qui n'existe pas ne compile plus.
 */
const racine = (): HTMLElement => racineExigee('userModalRoot');

/** Un élément **attendu** de la fenêtre ouverte. L'original lève aussi. */
function element(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`élément introuvable dans la fenêtre : « ${id} »`);
  return el;
}

/**
 * L'État installé ici.
 *
 * L'original écrit `ME.instance.etat`, qui lève si le bloc manque. On lève aussi.
 * Un `etat` absent rend la chaîne vide — exactement ce que faisait `esc(undefined)`.
 */
function etatInstalle(): string {
  const i = compte().instance;
  if (!i) throw new Error("la session ne porte pas l'instance installée");
  return i.etat ?? '';
}

/**
 * L'onglet courant.
 *
 * L'original écrit `USER_TABS.find(…).label` : une sous-vue inconnue y lève.
 * Seuls les six boutons de la barre la posent, et `setUserTab` est leur unique
 * porte — mais il fallait traiter le cas, et le refus nomme l'onglet.
 */
function ongletCourant(): Onglet {
  const tb = USER_TABS.find((x) => x.id === USER_TAB);
  if (!tb) throw new Error(`onglet de comptes inconnu : « ${USER_TAB} »`);
  return tb;
}

let USER_TAB = 'SUPERADMIN';
let USER_COLLAPSED = false;

export function setUserTab(id: string): void {
  USER_TAB = id;
  portailReinitialiserRecherche();
  renderUsers();
}

export function toggleUserSidebar(): void {
  USER_COLLAPSED = !USER_COLLAPSED;
  renderUsers();
}

let ALL_MODULES: ModuleCompte[] = [];
export async function renderUsers(): Promise<void> {
  const [res, modRes] = await Promise.all([appel('/api/users'), appel('/api/modules')]);
  const allUsers = await res.json() as Compte[];
  ALL_MODULES = await modRes.json() as ModuleCompte[];
  if (!Object.keys(window.REFS).length) await loadRefs();
  const isPresta = PRESTA_TABS.includes(USER_TAB);
  const prestataires = (window.REFS.prestataires ?? []) as Enregistrement[];
  const prestaName = (id?: string | null) => { const p = prestataires.find((x) => x.id === id); return p ? texte(p.nom) : ''; };
  const counts: Record<string, number> = Object.fromEntries(USER_TABS.map((tb) => [tb.id, allUsers.filter((u) => userRole(u) === tb.id).length]));
  const users = allUsers.filter((u) => userRole(u) === USER_TAB);
  const sidebarItems = USER_TABS.map(
    (tb) => `<button class="cfg-sidebar-item ${USER_TAB === tb.id ? 'active' : ''}" onclick="setUserTab('${tb.id}')" title="${escapeHtml(tb.label)}">
      <span class="cfg-sidebar-icon">${icon(tb.icon, 17)}</span>
      <span class="cfg-sidebar-label">${escapeHtml(tb.label)}</span>
    </button>`
  ).join('');
  const isSuper = compte().user.role === 'SUPERADMIN';
  const rows = users
    .map((u) => {
      const nm = splitName(u);
      const badges = [];
      badges.push(u.active ? `<span class="shell-badge badge-active">${escapeHtml(t('status_active'))}</span>` : `<span class="shell-badge badge-inactive">${escapeHtml(t('status_inactive'))}</span>`);
      if (u.locked) badges.push(`<span class="shell-badge badge-inactive">${escapeHtml(t('status_locked'))}</span>`);
      if (u.mustChange) badges.push(`<span class="shell-badge badge-neutral">${escapeHtml(t('status_mustchange'))}</span>`);
      const nbMods = Array.isArray(u.modules) ? u.modules.length : 0;
      const modCell = isSuper
        ? `<button class="shell-btn shell-btn-sm shell-btn-outline" data-modules="${escapeHtml(u.username)}">${icon('grid', 13)} ${nbMods}/${ALL_MODULES.length}</button>`
        : `<span class="shell-badge badge-neutral">${nbMods} module(s)</span>`;
      const actions = [];
      if (USER_TAB === 'AAC') {
        const already = ((window.REFS.inspecteurs ?? []) as Enregistrement[]).some((p) => texte(p.email).toLowerCase() === (u.email || u.username).toLowerCase());
        actions.push(`<button class="shell-btn-icon" data-topersonnel="${escapeHtml(u.username)}" title="${already ? 'Déjà dans le Personnel AAC' : 'Générer dans le Personnel AAC'}" aria-label="${already ? 'Déjà dans le Personnel AAC' : 'Générer dans le Personnel AAC'}" ${already ? 'disabled style="opacity:.4;cursor:default;"' : ''}>${icon('userPlus', 15)}</button>`);
      }
      if (isSuper) actions.push(`<button class="shell-btn-icon" data-edit="${escapeHtml(u.username)}" title="${t('edit')}" aria-label="${t('edit')}">${icon('edit', 15)}</button>`);
      if (u.locked) actions.push(`<button class="shell-btn-icon" data-action="unlock" data-user="${escapeHtml(u.username)}" title="${escapeHtml(t('action_unlock'))}" aria-label="${escapeHtml(t('action_unlock'))}">${icon('unlock', 15)}</button>`);
      const canToggle = u.username !== compte().user.username && !(compte().user.role === 'ADMIN' && (u.role === 'ADMIN' || u.role === 'SUPERADMIN'));
      if (canToggle) actions.push(`<button class="shell-btn-icon" data-action="toggle-active" data-user="${escapeHtml(u.username)}" title="${t('action_toggle')}" aria-label="${t('action_toggle')}">${icon('power', 15)}</button>`);
      actions.push(`<button class="shell-btn-icon" data-action="reset-password" data-user="${escapeHtml(u.username)}" title="${t('reinitialiser_mdp')}" aria-label="${t('reinitialiser_mdp')}">${icon('key', 15)}</button>`);
      // Effacement : le droit à l'effacement demande un geste, pas seulement
      // une route. Réservé au super-administrateur, et jamais sur soi-même.
      if (isSuper && u.username !== compte().user.username) {
        actions.push(`<button class="shell-btn-icon" data-effacer="${escapeHtml(u.username)}" style="color:#b91c1c;" title="${escapeHtml(t('effacer_compte'))}" aria-label="${escapeHtml(t('effacer_compte'))}">${icon('trash', 15)}</button>`);
      }
      let prestaCell = '';
      if (isPresta) {
        prestaCell = isSuper
          ? `<td><select class="shell-input shell-input-sm" data-presta="${escapeHtml(u.username)}"><option value="">—</option>${prestataires.map((p) => `<option value="${escapeHtml(p.id)}" ${u.prestataire_id === p.id ? 'selected' : ''}>${escapeHtml(p.nom)}</option>`).join('')}</select></td>`
          : `<td>${escapeHtml(prestaName(u.prestataire_id)) || '<span style="color:var(--text-muted);">—</span>'}</td>`;
      }
      // L'onglet SuperAdmin dit la portée de chacun, et l'instance qu'un
      // national administre : c'est ce qui les distingue.
      const porteeCell = USER_TAB === 'SUPERADMIN'
        ? `<td><span class="shell-badge ${porteeDe(u) === 'regionale' ? 'badge-active' : 'badge-neutral'}">${escapeHtml(PORTEE_LABELS[porteeDe(u)])}</span>${
          porteeDe(u) === 'nationale' ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:.15rem;">${escapeHtml(u.instance || etatInstalle())}</div>` : ''}</td>`
        : '';
      return `
      <tr class="${u.active ? '' : 'row-inactive'}">
        <td>${escapeHtml(nm.nom)}</td>
        <td>${escapeHtml(nm.prenom) || '<span style="color:var(--text-muted);">—</span>'}</td>
        <td class="cell-identifiant"><strong>${escapeHtml(u.email || u.username)}</strong></td>
        ${porteeCell}
        ${prestaCell}
        <td>${modCell}</td>
        <td>${badges.join(' ')}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td class="actions-cell">${actions.join('')}</td>
      </tr>`;
    })
    .join('');

  const vue = document.getElementById('mainView');
  if (!vue) throw new Error("la vue principale est absente : « mainView » n'est pas dans le document");
  vue.innerHTML = `
    <div class="portal-page-header">
      <h2>${escapeHtml(t('users_title'))}</h2>
      <div class="portal-page-actions">
        <button class="shell-btn shell-btn-primary" id="newUserBtn">${icon('userPlus', 15)} ${escapeHtml(t('users_new'))}</button>
      </div>
    </div>
    <div class="cfg-layout users-layout">
      <div class="cfg-sidebar ${USER_COLLAPSED ? 'collapsed' : ''}">
        <button class="cfg-sidebar-toggle" onclick="toggleUserSidebar()" aria-label="${escapeHtml(t("sous_menu_basculer"))}" title="${escapeHtml(t("sous_menu_basculer"))}">${USER_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
        ${sidebarItems}
      </div>
      <div class="cfg-content">
        <div class="portal-page-header">
          <h3>${escapeHtml(ongletCourant().label)} <span class="shell-badge badge-neutral">${counts[USER_TAB] ?? 0} utilisateur(s)</span></h3>
          <div class="portal-page-actions">${searchInputHtml('Rechercher un utilisateur...')}</div>
        </div>
        <!-- La table dense du portail, comme toutes les autres : c'était la
             seule à ne pas l'être, et c'est elle qui débordait. -->
        <div class="shell-table-container">
          <table class="shell-table shell-table-compact">
            <thead><tr>
              <th>${t('col_nom')}</th><th>${t('col_prenoms')}</th><th>Email (identifiant)</th>${USER_TAB === 'SUPERADMIN' ? '<th>' + t('col_portee') + '</th>' : ''}${isPresta ? '<th>' + t('col_prestataire') + '</th>' : ''}<th>${t('col_acces_modules')}</th>
              <th>${escapeHtml(t('users_col_status'))}</th><th>${escapeHtml(t('users_col_created'))}</th><th>${escapeHtml(t('users_col_actions'))}</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="${7 + (isPresta ? 1 : 0) + (USER_TAB === 'SUPERADMIN' ? 1 : 0)}" style="color:var(--text-muted);">${t('aucun_utilisateur_categorie')}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="userModalRoot"></div>`;

  document.getElementById('newUserBtn')?.addEventListener('click', showNewUserModal);
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      // `dataset.x` peut manquer, et l'original l'envoyait tel quel — la chaîne
      // « undefined » dans l'URL. On garde ce comportement : les deux attributs
      // sont posés par le balisage juste rendu, et inventer un repli ici
      // masquerait un rendu cassé au lieu de le montrer.
      const action = texte(btn.dataset.action);
      const username = texte(btn.dataset.user);
      if (action === 'reset-password' && !await confirmer(t('confirmer_reset_mdp'))) return;
      const res = await appel(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(action === 'reset-password' ? t('mdp_reinitialise') : 'OK', 'success');
        renderUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error === 'forbidden_target' ? t('admin_pas_sur_admin')
          : data.details ? reglesMotDePasse(data.details) : window.oasisMessageErreur(data, res.status);
        showToast(msg, 'error', 4000);
      }
    });
  });
  document.querySelectorAll<HTMLSelectElement>('[data-presta]').forEach((sel) => sel.addEventListener('change', async () => {
    const res = await appel(`/api/users/${encodeURIComponent(texte(sel.dataset.presta))}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-prestataire', prestataire_id: sel.value }),
    });
    if (res.ok) showToast(t('prestataire_enregistre'), 'success');
    else showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
  }));
  document.querySelectorAll<HTMLElement>('[data-topersonnel]:not([disabled])').forEach((btn) => btn.addEventListener('click', async () => {
    const res = await appel(`/api/users/${encodeURIComponent(texte(btn.dataset.topersonnel))}/to-personnel`, { method: 'POST' });
    if (res.ok) { await loadRefs(); showToast(t('ajoute_personnel'), 'success'); renderUsers(); }
    else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error === 'exists' ? t('deja_present_personnel') : window.oasisMessageErreur(d, res.status), 'error');
    }
  }));
  // ── Les trois fenêtres ouvertes depuis la table ──
  //
  // L'original écrit `showModulesModal(users.find(…))` : un compte introuvable
  // donne `undefined`, et la fenêtre lève sur `u.modules`. Le `?` ci-dessous ne
  // change rien d'atteignable — le bouton porte l'identifiant que la ligne
  // vient de rendre —, et évite d'affirmer ce qu'on peut vérifier.
  const ouvrir = (attr: string, fenetre: (u: Compte) => void) => {
    document.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((btn) => btn.addEventListener('click', () => {
      const u = users.find((x) => x.username === btn.dataset[attr]);
      if (u) fenetre(u);
    }));
  };
  ouvrir('modules', showModulesModal);
  ouvrir('edit', showEditUserModal);
  ouvrir('effacer', showEffacerUserModal);
}

export function showModulesModal(u: Compte): void {
  const root = racine();
  const cur = new Set(Array.isArray(u.modules) ? u.modules : []);
  const items = ALL_MODULES.map(
    (m) => `<label class="multi-check-item"><input type="checkbox" data-mod="${m.code}" ${cur.has(m.code) ? 'checked' : ''}> ${m.icon} ${escapeHtml(m.name.fr || m.code)} <span class="shell-badge badge-neutral">${m.tdr}</span></label>`
  ).join('');
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:520px;">
      <div class="shell-modal-header"><h3>Accès aux modules — ${escapeHtml(u.email || u.username)}</h3><button class="shell-btn-icon" onclick="closeUserModal()" style="color:#fff;" aria-label="${escapeHtml(t("fermer"))}" title="${escapeHtml(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body"><div class="multi-check">${items}</div></div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeUserModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveUserModules('${escapeHtml(u.username)}')">${icon('save', 14)} Enregistrer</button>
      </div>
    </div>
  </div>`;
}

export async function saveUserModules(username: string): Promise<void> {
  const modules = tousDans<HTMLInputElement>('userModalRoot', '[data-mod]:checked').map((c) => texte(c.dataset.mod));
  const res = await appel(`/api/users/${encodeURIComponent(username)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-modules', modules }),
  });
  if (res.ok) { closeUserModal(); showToast(t('acces_modules_enregistre'), 'success'); renderUsers(); }
  else showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

// Effacement d'un compte : irréversible, donc confirmé par le mot de passe de
// celui qui le demande — comme un changement d'identifiant. La boîte dit aussi
// ce que l'effacement n'emporte pas : les actes posés et le journal d'audit
// restent, et l'identifiant y subsiste. Le taire serait promettre à tort.
export function showEffacerUserModal(u: Compte): void {
  const root = racine();
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:520px;">
      <div class="shell-modal-header"><h3>${escapeHtml(t('effacer_compte'))}</h3><button class="shell-btn-icon" onclick="closeUserModal()" style="color:#fff;" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <p style="margin-bottom:.9rem;">${escapeHtml(t('effacer_compte_qui'))} <strong>${escapeHtml(u.email || u.username)}</strong></p>
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1rem;">${escapeHtml(t('effacer_compte_portee'))}</p>
        <div class="shell-form-group">
          <label>${escapeHtml(t('effacer_compte_mdp'))}</label>
          <input class="shell-input" type="password" id="efAdminPwd" autocomplete="off">
        </div>
        <div id="efErreur" class="login-error" style="margin-top:.8rem;"></div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeUserModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-danger" id="efValider">${escapeHtml(t('effacer_compte'))}</button>
      </div>
    </div>
  </div>`;
  // ── Les cibles d'écouteur gardent leur `getElementById` à l'assignation ──
  //
  // `relever-gestes.js` nomme une cible en remontant la variable jusqu'à son
  // `document.getElementById('…')`. Écrites avec l'accesseur `element(…)`, six
  // cibles de cet écran sont devenues **indécidables** et la couverture du
  // portail est tombée de 66 à 60 — sans que rien ne soit moins éprouvé.
  // L'outil lit la source ; la source lui reste donc lisible (ADR-003, 5.e.1).
  const efValider = document.getElementById('efValider');
  const efAdminPwd = document.getElementById('efAdminPwd');
  if (!efValider || !efAdminPwd) throw new Error("la fenêtre d'effacement n'a pas ses champs");
  efValider.addEventListener('click', () => { void effacerUtilisateur(u.username); });
  (efAdminPwd as HTMLInputElement).focus();
}

export async function effacerUtilisateur(username: string): Promise<void> {
  const boite = element('efErreur');
  boite.style.display = 'none';
  const res = await appel(`/api/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword: valeur('efAdminPwd') }),
  });
  if (res.ok) { closeUserModal(); showToast(t('compte_efface'), 'success'); renderUsers(); return; }
  const data = await res.json().catch(() => ({})) as DonneesErreur;
  boite.textContent = data.error === 'dernier_superadmin' ? t('dernier_superadmin')
    : window.oasisMessageErreur(data, res.status);
  boite.style.display = 'block';
}

export function showEditUserModal(u: Compte): void {
  const root = racine();
  const nm = splitName(u);
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:560px;">
      <div class="shell-modal-header"><h3>${t('modifier_utilisateur')}</h3><button class="shell-btn-icon" onclick="closeUserModal()" style="color:#fff;" aria-label="${escapeHtml(t("fermer"))}" title="${escapeHtml(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          <div class="shell-form-group"><label>${t('col_nom')}</label><input class="shell-input" id="euNom" value="${escapeHtml(nm.nom)}"></div>
          <div class="shell-form-group"><label>${t('col_prenoms')}</label><input class="shell-input" id="euPrenom" value="${escapeHtml(nm.prenom)}"></div>
        </div>
        <div class="shell-form-row">
          ${phoneFieldHtml('euTel', u.telephone)}
          <div class="shell-form-group"><label>${t('users_col_role')}</label>
            <select class="shell-input" id="euRole">${USER_TABS.map((tb) => `<option value="${tb.id}" ${userRole(u) === tb.id ? 'selected' : ''}>${escapeHtml(tb.label)}</option>`).join('')}</select>
          </div>
        </div>
        ${porteeFieldsHtml('eu', u)}
        <div class="shell-form-group" style="margin-bottom:.5rem;">
          <label>${t('email_identifiant')}</label>
          <input class="shell-input" type="email" id="euEmail" value="${escapeHtml(u.email || u.username)}">
        </div>
        <div class="shell-form-group" id="euAdminPwdWrap" style="display:none;">
          <label style="color:#dc2626;">${t('confirmer_superadmin')}</label>
          <input class="shell-input" type="password" id="euAdminPwd">
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeUserModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="submitEditUser('${escapeHtml(u.username)}')">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
  brancherPortee('eu', element('euRole') as HTMLSelectElement);
  const orig = (u.email || u.username);
  const euEmail = document.getElementById('euEmail');
  if (!euEmail) throw new Error("la fenêtre d'édition n'a pas son champ d'identifiant");
  euEmail.addEventListener('input', (e) => {
    const champ = e.target as HTMLInputElement;
    element('euAdminPwdWrap').style.display = champ.value.trim().toLowerCase() !== orig ? 'block' : 'none';
  });
}

export async function submitEditUser(username: string): Promise<void> {
  const body = {
    action: 'edit',
    nom: valeur('euNom').trim(),
    prenom: valeur('euPrenom').trim(),
    telephone: phoneFieldValue('euTel'),
    role: valeur('euRole'),
    portee: valeurFacultative('euPortee'),
    instance: valeurFacultative('euInstance'),
    email: valeur('euEmail').trim(),
    adminPassword: valeurFacultative('euAdminPwd'),
  };
  const res = await appel(`/api/users/${encodeURIComponent(username)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (res.ok) { closeUserModal(); showToast(t('utilisateur_modifie'), 'success'); renderUsers(); }
  else {
    const d = await res.json().catch(() => ({}));
    const msg = d.error === 'admin_password' ? t('mdp_superadmin_incorrect')
      : d.error === 'exists' ? t('compte_existe_email')
      : d.error === 'invalid_email' ? t('email_invalide')
      : window.oasisMessageErreur(d, res.status);
    showToast(msg, 'error', 4500);
  }
}

export function closeUserModal(): void {
  fermer('userModalRoot');
}


export function showNewUserModal(): void {
  const root = racine();
  root.innerHTML = `
  <div class="shell-modal-overlay" id="newUserOverlay">
    <div class="shell-modal" style="max-width:520px;">
      <div class="shell-modal-header"><h3>${escapeHtml(t('users_new'))}</h3><button class="shell-btn-icon" id="closeModal" style="color:#fff;" aria-label="${escapeHtml(t("fermer"))}" title="${escapeHtml(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          <div class="shell-form-group"><label>${t('col_nom')}</label><input class="shell-input" id="nuNom"></div>
          <div class="shell-form-group"><label>${t('col_prenoms')}</label><input class="shell-input" id="nuPrenom"></div>
        </div>
        <div class="shell-form-group" style="margin-bottom:1rem;">
          <label>${t('email_sert_identifiant')}</label>
          <input class="shell-input" type="email" id="nuEmail" placeholder="${t('ex_courriel_aac')}">
        </div>
        <div class="shell-form-group" style="margin-bottom:1rem;">
          <label>${escapeHtml(t('users_col_role'))}</label>
          <select class="shell-input" id="nuRole">
            ${USER_TABS.map((tb) => `<option value="${tb.id}" ${tb.id === USER_TAB ? 'selected' : ''}>${escapeHtml(tb.label)}</option>`).join('')}
          </select>
        </div>
        ${porteeFieldsHtml('nu', null)}
        <div class="shell-form-group" id="nuPrestaWrap" style="margin-bottom:1rem;${PRESTA_TABS.includes(USER_TAB) ? '' : 'display:none;'}">
          <label>${t('prestataire_provenance')}</label>
          <select class="shell-input" id="nuPresta"><option value="">—</option>${((window.REFS.prestataires ?? []) as Enregistrement[]).map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nom)}</option>`).join('')}</select>
        </div>
        ${compte().user.role === 'SUPERADMIN' ? `
        <div class="shell-form-group" style="margin-bottom:.5rem;">
          <label>${t('acces_modules')}</label>
          <div class="multi-check">${ALL_MODULES.map((m) => `<label class="multi-check-item"><input type="checkbox" data-newmod="${m.code}"> ${m.icon} ${escapeHtml(m.name.fr || m.code)}</label>`).join('')}</div>
        </div>` : ''}
        <p style="font-size:.75rem;color:var(--text-muted);">Le mot de passe temporaire est généré automatiquement et envoyé par email à l'utilisateur. Valable 48 h ; à changer à la première connexion.</p>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" id="cancelModal">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" id="createUser">${escapeHtml(t('add'))}</button>
      </div>
    </div>
  </div>`;
  const close = () => (root.innerHTML = '');
  const closeModal = document.getElementById('closeModal');
  const cancelModal = document.getElementById('cancelModal');
  const nuRole = document.getElementById('nuRole');
  const createUser = document.getElementById('createUser');
  if (!closeModal || !cancelModal || !nuRole || !createUser) {
    throw new Error('la fenêtre de création n’a pas ses champs');
  }
  closeModal.addEventListener('click', close);
  cancelModal.addEventListener('click', close);
  nuRole.addEventListener('change', (e) => {
    const champ = e.target as HTMLSelectElement;
    element('nuPrestaWrap').style.display = PRESTA_TABS.includes(champ.value) ? '' : 'none';
  });
  brancherPortee('nu', nuRole as HTMLSelectElement);
  createUser.addEventListener('click', async () => {
    const res = await appel('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: valeur('nuNom').trim(),
        prenom: valeur('nuPrenom').trim(),
        email: valeur('nuEmail').trim(),
        role: valeur('nuRole'),
        portee: valeurFacultative('nuPortee'),
        instance: valeurFacultative('nuInstance'),
        prestataire_id: valeur('nuPresta'),
        modules: tousDans<HTMLInputElement>('userModalRoot', '[data-newmod]:checked').map((c) => texte(c.dataset.newmod)),
      }),
    });
    if (res.ok) {
      close();
      showToast(t('utilisateur_cree'), 'success');
      renderUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.details ? t('mdp_politique', reglesMotDePasse(data.details))
        : data.error === 'exists' ? t('compte_existe_email')
        : data.error === 'invalid_email' ? t('email_invalide_identifiant')
        : window.oasisMessageErreur(data, res.status);
      showToast(msg, 'error', 4500);
    }
  });
}
