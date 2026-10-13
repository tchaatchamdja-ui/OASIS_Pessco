// OASIS — L'écran du profil (ADR-003, 5.e.2).
//
// Troisième pièce d'`app.js`, et le seul écran où un agent change **ses propres**
// identifiants : sa photo, son nom, sa fonction, et son mot de passe.
//
// ── Aucun état, et c'est la première fois de 5.e ──
//
// Ce bloc ne portait pas une seule variable mutable : tout ce qu'il affiche vient
// de `ME`, que `loadMe()` rafraîchit après chaque enregistrement. C'est pourquoi
// il a pu être converti sans décider où mettre quoi que ce soit.
//
// ── Les deux sections facultatives, et leurs deux branches ──
//
// `pfExtraSection` rend une carte **active** ou **grisée** selon le rôle : les
// prestataires voient la leur, les indépendants la leur, les autres les voient
// toutes deux éteintes. Chaque branche change le balisage de six façons — la
// classe de la carte, la phrase de réserve, l'attribut `disabled` de chaque
// champ, et la présence du bouton d'enregistrement. Deux gardes de la preuve
// exigent que le balisage comparé porte les deux.
//
// ── Ce que ce module lit encore d'`app.js` ──
//
// `fmtDate`, `reglesMotDePasse`, `phoneFieldHtml`, `phoneFieldValue` et
// `loadMe`. Les quatre premiers partent en 5.e.4 avec le bloc du téléphone ; le
// cinquième appartient à `app-demarrage`, déjà converti, et est déclaré là-bas.
import { confirmer } from '../socle/toast';
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t } from './traductions';
import { tr } from './libelles';
import { splitName } from './comptes';
import { cameraIcon } from './parametres';
import type { Moi } from './etat';
import type { Enregistrement } from './schemas';
import type { DonneesErreur } from '../socle/commun';
import { fmtDate, loadRefs, reglesMotDePasse } from './outils';
import { phoneFieldHtml, phoneFieldValue } from './telephone';

/** Un champ d'une section facultative : l'id, le libellé, la valeur, la lecture seule. */
export type ChampExtra = [string, string, string | undefined | null, boolean?];

/**
 * Ce qu'un geste du profil envoie.
 *
 * Chaque geste n'envoie **que ce qu'il touche** — le serveur fusionne le
 * correctif —, et c'est pourquoi aucun champ n'est requis. C'est la différence
 * avec l'édition d'un compte par un administrateur (5.e.1), qui envoie tout et
 * peut donc effacer : ici, un champ absent n'est pas un champ vidé.
 */
export interface Correctif {
  nom?: string;
  prenom?: string;
  telephone?: string;
  fonction?: string;
  photo?: string;
  extra?: Record<string, string>;
}

declare global {
  interface Window {
    /** Dépose une photo de profil choisie dans le sélecteur de fichier. */
    uploadProfilePhoto: (inputEl: HTMLInputElement) => void;
    /** Retire la photo de profil, confirmation demandée. */
    removeProfilePhoto: () => Promise<void>;
    /** Enregistre les quatre informations personnelles. */
    saveProfileInfos: () => void;
    /** Change le mot de passe de l'agent connecté. */
    submitProfilePassword: () => Promise<void>;
    /** Enregistre l'une des deux sections facultatives. */
    saveProfileExtra: (key: string) => void;
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
 * L'original écrit `ME.user` sans précaution : rendu avant la session, il lève.
 * On lève aussi, en nommant la cause — le choix tenu depuis 5.d.1.
 */
function compte(): Moi {
  const m = window.ME;
  if (!m) throw new Error("l'écran du profil a été rendu sans session : `ME` est vide");
  return m;
}

/** L'instance installée ici. L'original écrit `ME.instance.etat`, qui lève sans elle. */
function instanceLocale(): { etat?: string; codeEtat?: string } {
  const i = compte().instance;
  if (!i) throw new Error("la session ne porte pas l'instance installée");
  return i;
}

const valeur = (id: string): string => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`champ introuvable dans l’écran du profil : « ${id} »`);
  return (el as HTMLInputElement).value;
};

const texte = (v: unknown): string => (v == null ? '' : String(v));

export const ROLE_LABELS: Readonly<Record<string, string>> = { SUPERADMIN: 'SuperAdmin', ADMIN: 'Admin AAC', ADMIN_PRESTATAIRE: 'Admin Prestataires', AAC: 'Utilisateur AAC', INSPECTEUR: 'Utilisateur AAC', PRESTATAIRE: 'Utilisateur Prestataire', INDEPENDANT: 'Utilisateur Indépendant' };

export function uploadProfilePhoto(inputEl: HTMLInputElement): void {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  // Les deux mégaoctets sont vérifiés ici **et** par le serveur : celui-ci refuse
  // la requête, celui-là évite de lire 40 Mo en mémoire pour rien.
  if (file.size > 2 * 1024 * 1024) { showToast(t('image_trop_lourde'), 'error'); return; }
  const reader = new FileReader();
  // ── Une divergence assumée, et invisible dans un navigateur ──
  //
  // L'original écrit `reader.onload = () => saveProfile({…})`, qui **rend** la
  // promesse de l'enregistrement. Le type de `onload` ne laisse rien rendre, et
  // `void` l'écarte donc. Rien ne lit cette valeur — `FileReader` l'ignore —, mais
  // la différence est réelle et la preuve en a dépendu : elle attendait cette
  // promesse pour savoir quand l'enregistrement était fini. Elle vide désormais la
  // file des micro-tâches des deux côtés, ce qui ne dépend plus de personne.
  reader.onload = () => { void saveProfile({ photo: String(reader.result) }); };
  reader.readAsDataURL(file);
}

export async function removeProfilePhoto(): Promise<void> {
  if (!await confirmer(t('confirmer_suppr_photo'))) return;
  // Sans `await`, comme l'original : la confirmation referme, l'enregistrement
  // suit. L'attendre changerait le moment où cette promesse se résout.
  void saveProfile({ photo: '' });
}

async function saveProfile(patch: Correctif): Promise<void> {
  const res = await appel('/api/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    showToast(t('profil_maj'), 'success');
    await window.loadMe();
    renderProfile();
  } else showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

export function saveProfileInfos(): void {
  void saveProfile({
    nom: valeur('pfNom').trim(),
    prenom: valeur('pfPrenom').trim(),
    telephone: phoneFieldValue('pfTel'),
    fonction: valeur('pfFonction').trim(),
  });
}

export async function submitProfilePassword(): Promise<void> {
  const oldPassword = valeur('pfOld');
  const newPassword = valeur('pfNew');
  const confirmVal = valeur('pfConfirm');
  if (!oldPassword) { showToast(t('confirmer_mdp_actuel'), 'warning'); return; }
  if (newPassword !== confirmVal) { showToast(t('mdp_discordants'), 'error'); return; }
  const res = await appel('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (res.ok) {
    showToast(t('mdp_modifie'), 'success');
    // Les trois champs sont vidés : un mot de passe qui reste dans un champ après
  // son changement est un mot de passe qu'on laisse derrière soi.
    ['pfOld', 'pfNew', 'pfConfirm'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) (el as HTMLInputElement).value = '';
    });
    await window.loadMe();
    renderProfile();
  } else {
    const data = await res.json().catch(() => ({})) as DonneesErreur & { details?: unknown };
    const msg =
      data.error === 'policy' ? t('mdp_politique', reglesMotDePasse(data.details))
      : window.oasisMessageErreur(data, res.status);
    showToast(msg, 'error', 4500);
  }
}

export async function renderProfile(): Promise<void> {
  const u = compte().user;
  const ex = u.extra || {};
  const nm = splitName(u);
  if (!Object.keys(window.REFS).length) await loadRefs();
  const prestaNom = texte(((window.REFS.prestataires ?? []) as Enregistrement[]).find((p) => p.id === u.prestataire_id)?.nom);
  const initials = `${(nm.nom || u.username)[0] || ''}${(nm.prenom || '')[0] || ''}`.toUpperCase();
  const photoBox = u.photo
    ? `<img src="${u.photo}" alt="Photo de profil" class="pf-photo-img">`
    : `<div class="pf-photo-initials">${escapeHtml(initials)}</div>`;
  // Un tuple, et non `string[]` : avec `noUncheckedIndexedAccess`, `r[0]` d'un
  // tableau rendrait `string | undefined`, et il faudrait traiter un cas qui
  // n'existe pas. Le tuple dit ce que la ligne est — un libellé et une valeur.
  const lignes: [string, string][] = [
    ['Identifiant (email)', escapeHtml(u.email || u.username)],
    ['Rôle', `<span class="shell-badge badge-neutral">${escapeHtml(ROLE_LABELS[u.role] || u.role)}</span>`],
    ['Statut', u.active ? '<span class="shell-badge badge-active">Actif</span>' : '<span class="shell-badge badge-inactive">Inactif</span>'],
    ['Instance', `${escapeHtml(instanceLocale().etat)} (${escapeHtml(instanceLocale().codeEtat)})`],
    ['Compte créé le', fmtDate(u.createdAt)],
    ['Mot de passe modifié le', fmtDate(u.passwordChangedAt)],
  ];
  const infoRows = lignes
    .map((r) => `<tr><td class="aac-info-lbl">${tr(r[0])}</td><td class="aac-info-val">${r[1]}</td></tr>`)
    .join('');

  const vue = document.getElementById('mainView');
  if (!vue) throw new Error("la vue principale est absente : « mainView » n'est pas dans le document");
  vue.innerHTML = `
    <div class="portal-page-header"><h2>Mon profil</h2></div>
    <div class="pf-layout">
      <div class="pf-side shell-card">
        <div class="pf-photo-frame">${photoBox}</div>
        <div class="aac-logo-btns" style="margin-top:.6rem;">
          <label class="shell-btn shell-btn-outline aac-logo-iconbtn" title="${u.photo ? 'Changer la photo' : 'Ajouter une photo'}">${cameraIcon()}
            <input type="file" accept="image/*" style="display:none;" onchange="uploadProfilePhoto(this)">
          </label>
          ${u.photo ? `<button class="shell-btn shell-btn-danger aac-logo-iconbtn" onclick="removeProfilePhoto()" title="${t('supprimer_photo')}">${icon('trash', 15)}</button>` : ''}
        </div>
        <div class="pf-name">${escapeHtml(nm.nom)} ${escapeHtml(nm.prenom)}</div>
        <div class="pf-role">${escapeHtml(ROLE_LABELS[u.role] || u.role)}</div>
      </div>

      <div class="pf-main pf-compact">
        <div class="shell-card">
          <div class="portal-page-header"><h3>Informations personnelles</h3></div>
          <div class="shell-form-row">
            <div class="shell-form-group"><label>${t('col_nom')}</label><input class="shell-input" id="pfNom" value="${escapeHtml(nm.nom)}"></div>
            <div class="shell-form-group"><label>${t('col_prenoms')}</label><input class="shell-input" id="pfPrenom" value="${escapeHtml(nm.prenom)}"></div>
          </div>
          <div class="shell-form-row">
            ${phoneFieldHtml('pfTel', u.telephone)}
            <div class="shell-form-group"><label>Fonction</label><input class="shell-input" id="pfFonction" value="${escapeHtml(u.fonction || '')}"></div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="saveProfileInfos()">${icon('save', 13)} Enregistrer</button>
          </div>
        </div>

        <div class="shell-card">
          <div class="portal-page-header"><h3>${t('details_compte')}</h3></div>
          <div class="shell-table-container">
            <table class="shell-table shell-table-compact aac-info-table"><tbody>${infoRows}</tbody></table>
          </div>
        </div>

        ${pfExtraSection('presta', 'Prestataires', "(à renseigner par les admin et utilisateurs provenant d'un prestataire)", ['ADMIN_PRESTATAIRE', 'PRESTATAIRE'].includes(u.role), [
          ['pxStructure', 'Structure / Prestataire', prestaNom, true],
          ['pxPoste', 'Fonction / Poste', ex.poste],
          ['pxService', 'Service / Département', ex.service],
          ['pxAdresse', 'Adresse professionnelle', ex.adressePro],
        ])}

        ${pfExtraSection('indep', 'Indépendants', '(à renseigner par les utilisateurs indépendant)', u.role === 'INDEPENDANT', [
          ['ixProfession', 'Profession', ex.profession],
          ['ixOrganisation', 'Organisation / Cabinet', ex.organisation],
          ['ixAgrement', "N° d'agrément / licence", ex.agrement],
          ['ixAdresse', 'Adresse', ex.adresse],
        ])}

        <div class="shell-card">
          <div class="portal-page-header"><h3>${icon('lock', 15)} Modifier mon mot de passe</h3></div>
          <div class="shell-form-row">
            <div class="shell-form-group"><label>${t('chgpwd_old')}</label><input class="shell-input" type="password" id="pfOld" autocomplete="current-password"></div>
            <div class="shell-form-group"><label>${t('chgpwd_new')}</label><input class="shell-input" type="password" id="pfNew" autocomplete="new-password"></div>
          </div>
          <div class="shell-form-row">
            <div class="shell-form-group"><label>${t('chgpwd_confirm')}</label><input class="shell-input" type="password" id="pfConfirm" autocomplete="new-password"></div>
            <div class="shell-form-group" style="align-self:end;"><button class="shell-btn shell-btn-primary shell-btn-sm" onclick="submitProfilePassword()">${icon('key', 13)} Changer le mot de passe</button></div>
          </div>
          <p style="font-size:.72rem;color:var(--text-muted);">12 caractères min. (majuscules, minuscules, chiffres, caractères spéciaux), sans réutilisation.</p>
        </div>
      </div>
    </div>`;
}

export function pfExtraSection(key: string, title: string, hint: string, enabled: boolean, fields: ChampExtra[]): string {
  const inputs = fields
    .map(([id, label, val, readonly]) => `<div class="shell-form-group"><label>${escapeHtml(label)}${readonly ? ' <span style="font-size:.65rem;color:var(--text-muted);">(auto)</span>' : ''}</label><input class="shell-input" id="${id}" value="${escapeHtml(val || '')}" ${(!enabled || readonly) ? 'disabled' : ''}></div>`)
    .join('');
  return `
    <div class="shell-card ${enabled ? '' : 'pf-section-disabled'}">
      <div class="portal-page-header"><h3>${escapeHtml(title)} <span style="font-size:.72rem;font-weight:400;color:var(--text-muted);">${escapeHtml(hint)}</span></h3></div>
      ${enabled ? '' : '<p style="font-size:.75rem;color:var(--text-muted);">' + t('section_reservee') + '</p>'}
      <div class="shell-form-row">${inputs}</div>
      ${enabled ? `<div style="display:flex;justify-content:flex-end;"><button class="shell-btn shell-btn-primary shell-btn-sm" onclick="saveProfileExtra('${key}')">${icon('save', 13)} Enregistrer</button></div>` : ''}
    </div>`;
}

export function saveProfileExtra(key: string): void {
  // ── La lecture d'un champ **facultatif** : la section peut être grisée ──
  //
  // Un champ `disabled` existe, mais une section d'un autre rôle n'a pas les
  // siens dans le document. L'original rend alors la chaîne vide, et le serveur
  // écrit ce vide dans `extra` : c'est le même défaut que `submitEditUser`
  // (5.e.1), et il n'est pas corrigé ici non plus — le corriger changerait ce que
  // la route reçoit. Le nom le dit.
  const facultatif = (id: string) => {
    const el = document.getElementById(id);
    return el ? (el as HTMLInputElement).value.trim() : '';
  };
  const extra = key === 'presta'
    ? { poste: facultatif('pxPoste'), service: facultatif('pxService'), adressePro: facultatif('pxAdresse') }
    : { profession: facultatif('ixProfession'), organisation: facultatif('ixOrganisation'), agrement: facultatif('ixAgrement'), adresse: facultatif('ixAdresse') };
  void saveProfile({ extra });
}
