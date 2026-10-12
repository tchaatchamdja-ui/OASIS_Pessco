// OASIS — Les paramètres de l'instance (ADR-003, 5.d.5).
//
// Sixième pièce de la réécriture d'`app-config.js`, et la dernière avant
// `renderConfig` : l'identité de l'Administration, les règles de sécurité,
// l'activation des modules et le bloc système.
//
// ── Le seul état du bloc, et il ne le quitte pas ──
//
// `AAC_CFG` retient la configuration que le dernier rendu de l'écran a lue, pour
// que la fenêtre d'édition l'ouvre remplie. C'était un `let` du premier niveau
// d'`app-config.js` — une globale lexicale —, et aucun autre fichier ne le
// lisait : il devient une variable privée du module, sans passer par `window`.
//
// C'est la différence avec `CURRENT_CFG` et `CFG_OPEN`, qui ont dû monter sur
// `window` parce que du code resté en JavaScript les atteint. La règle est la
// même depuis 5.b : **la dépendance, non l'interface, décide**.
//
// ── Ce que ce module lit encore du monde ──
//
// `tr` (sa table `CFG_I18N` est un `const` d'`app.js`), `loadMe`, `renderConfig`
// et `oasisMessageErreur`. Les trois premiers partiront avec `app.js` ;
// `oasisMessageErreur` appartient au socle et y reste.
//
// `closeRefModal` n'est **pas** lu sur `window` : il appartient au module des
// référentiels (5.d.1), et c'est de là qu'il est importé. La fenêtre de
// l'Administration partage la racine `cfgModalRoot` avec celles des
// référentiels, et c'est donc la même fermeture — un couplage que l'original
// n'écrivait nulle part, et que cet import rend visible.
import { confirmer } from '../socle/toast';
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { PRIO_COLORS, icon, moduleIcon } from './icones';
import { closeRefModal } from './referentiels';
import { t } from './traductions';

/** L'identité de l'Administration. Tous les champs peuvent manquer. */
export interface Aac {
  nom?: string;
  sigle?: string;
  bigramme?: string;
  etat?: string;
  ville?: string;
  adresse1?: string;
  adresse2?: string;
  emailAdmin?: string;
  logo?: string;
}

/**
 * Ce que l'écran de l'Administration lit de la configuration.
 *
 * `instance` est **requis**, et ce n'est pas une facilité : `cfgSectionAAC` et
 * `openAacEdit` lisent `instance.defaultLang` sans précaution, comme l'original.
 * Le déclarer optionnel obligerait à inventer un comportement que l'original n'a
 * pas.
 */
export interface ConfigAac {
  aac?: Aac;
  instance: { defaultLang: string };
}

/** Les sept réglages que l'écran « Sécurité » montre, sur les treize du bloc. */
export interface ConfigSecurite {
  security: {
    passwordMinLength: number;
    passwordMaxAgeDays: number;
    maxFailedAttempts: number;
    sessionTimeoutMinutes: number;
    singleSession: boolean;
    forceChangeOnFirstLogin: boolean;
    mfaEnabled: boolean;
  };
}

/** Le magasin et la réplication, tels que l'écran « Système » les montre. */
export interface ConfigSysteme {
  database: {
    driver: string;
    note: string;
    postgres: { host: string; port: number; database: string };
  };
  replication: { enabled: boolean; centralUrl: string };
}

/** Une carte du catalogue des modules, telle que `/api/modules` la rend. */
export interface ModuleCatalogue {
  code: string;
  tdr: string;
  priority: number;
  enabled: boolean;
  name: Record<string, string> & { fr: string };
}

declare global {
  interface Window {
    /** La sous-vue « Organisation » : l'identité de l'Administration. */
    cfgSectionAAC: (cfg: ConfigAac) => string;
    /** L'appareil photo du bouton de dépôt du logo. Lu par personne hors d'ici. */
    cameraIcon: () => string;
    /** Ouvre la fenêtre d'édition de l'Administration. */
    openAacEdit: () => void;
    /** Dépose un logo choisi dans le sélecteur de fichier. */
    uploadAacLogo: (champ: HTMLInputElement) => void;
    /** Retire le logo, confirmation demandée. */
    removeAacLogo: () => Promise<void>;
    /** Enregistre la fenêtre d'édition de l'Administration. */
    saveAAC: () => Promise<void>;
    /** La sous-vue « Sécurité » : sept réglages. */
    cfgSectionSecurite: (cfg: ConfigSecurite) => string;
    /** Enregistre les sept réglages de sécurité. */
    saveSecurite: () => Promise<void>;
    /** La sous-vue « Modules » : une ligne par carte du catalogue. */
    cfgSectionModules: (modules: ModuleCatalogue[]) => string;
    /** La sous-vue « Système » : le magasin et la réplication. */
    cfgSectionSysteme: (cfg: ConfigSysteme) => string;
    /** Enregistre les deux réglages de réplication. */
    saveSysteme: () => Promise<void>;
  }
}

// L'appel d'API : un `fetch` nu, comme dans les cinq modules précédents.
// L'en-tête anti-CSRF est posé par l'enveloppe du socle sur tout appel vers
// l'application, et le retour à la connexion sur 401 est `sessionPerdue`.
async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

/** Les trois langues de l'instance, dans leur propre langue. */
const LIBELLES_LANGUE: Record<string, string> = { fr: 'Français', en: 'English', pt: 'Português' };

// ── Lire un champ de la fenêtre, et pourquoi cela lève ──
//
// Les trois gestes d'enregistrement écrivent `document.getElementById(id).value`
// dans l'original : un champ absent y lève une `TypeError`. Mon premier jet
// rendait `'' `, et c'était une divergence que rien n'aurait dite — la requête
// serait partie avec un champ **vidé**, et le serveur l'aurait écrit.
//
// Trouvée par un contre-essai monté pour autre chose : en renommant l'un des
// identifiants pour prouver que c'est bien ce module qui s'exécute, le sigle de
// l'Administration est parti vide au lieu que rien ne parte. *Un contre-essai
// qui mord ailleurs qu'où on l'attend dit quelque chose de plus que ce qu'on lui
// demandait.*
//
// On lève donc, avec un message qui nomme le champ. La divergence est le texte,
// et elle est assertée par `scripts/comparer-parametres.js`.
const champ = (id: string): HTMLInputElement | HTMLSelectElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`champ introuvable dans la fenêtre : « ${id} »`);
  return el as HTMLInputElement | HTMLSelectElement;
};
const valeur = (id: string): string => champ(id).value;
const coche = (id: string): boolean => (champ(id) as HTMLInputElement).checked;

// ── L'état du bloc ──
//
// Posé par `cfgSectionAAC` à chaque rendu, relu par `openAacEdit`. Privé : rien
// d'autre ne le lit, ici ou ailleurs.
let AAC_CFG: ConfigAac | null = null;

// Le balisage est repris **caractère pour caractère** d'`app-config.js`, retours
// à la ligne et indentation compris : `scripts/comparer-parametres.js` compare
// les chaînes à l'identique, et une espace de plus y serait un écart.
export function cfgSectionAAC(cfg: ConfigAac): string {
  AAC_CFG = cfg;
  const aac = cfg.aac || {};
  const val = (v?: string) => (v ? escapeHtml(v) : '<span style="color:var(--text-muted);">—</span>');
  const langLabel = LIBELLES_LANGUE[cfg.instance.defaultLang] || cfg.instance.defaultLang;
  const logoBox = aac.logo
    ? `<img src="${aac.logo}" alt="Logo AAC" class="aac-logo-preview">`
    : `<div class="aac-logo-empty">${icon('landmark', 30)}<span>${t('aucun_logo')}</span></div>`;
  const lignes: [string, string][] = [
    ['Nom complet', val(aac.nom)],
    ['Sigle', val(aac.sigle)],
    ['Bigramme', val(aac.bigramme)],
    ['État', val(aac.etat)],
    ['Ville', val(aac.ville)],
    ['Adresse 1', val(aac.adresse1)],
    ['Adresse 2', val(aac.adresse2)],
    ['Email administrateur', val(aac.emailAdmin)],
    ['Langue par défaut', escapeHtml(langLabel)],
  ];
  // Un tuple, et non `string[]` : avec `noUncheckedIndexedAccess`, `r[0]` d'un
  // tableau rendrait `string | undefined`, et il faudrait traiter un cas qui
  // n'existe pas. Le tuple dit ce que la ligne est — un libellé et une valeur.
  const rows = lignes
    .map((r) => `<tr><td class="aac-info-lbl">${window.tr(r[0])}</td><td class="aac-info-val">${r[1]}</td></tr>`)
    .join('');

  return `
  <div class="portal-page-header"><h3>${window.tr("Détails sur l'Administration")}</h3>
    <div class="portal-page-actions"><button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openAacEdit()">${icon('edit', 14)} Modifier</button></div>
  </div>
  <div class="aac-presentation aac-presentation-compact">
    <div class="aac-logo-col">
      <div class="aac-logo-frame">${logoBox}</div>
      <div class="aac-logo-btns">
        <label class="shell-btn shell-btn-outline aac-logo-iconbtn" title="${aac.logo ? 'Changer le logo' : 'Charger un logo'}">${cameraIcon()}
          <input type="file" accept="image/*" style="display:none;" onchange="uploadAacLogo(this)">
        </label>
        ${aac.logo ? `<button class="shell-btn shell-btn-danger aac-logo-iconbtn" onclick="removeAacLogo()" title="${t('supprimer_logo')}">${icon('trash', 15)}</button>` : ''}
      </div>
    </div>
    <div class="aac-detail-col">
      <h2 class="aac-title">${aac.nom ? escapeHtml(aac.nom) : "Administration de l'Aviation Civile"}</h2>
      <div class="aac-badges">
        ${aac.sigle ? `<span class="shell-badge badge-neutral aac-badge-sigle">${escapeHtml(aac.sigle)}</span>` : ''}
        ${aac.bigramme ? `<span class="shell-badge badge-neutral">${escapeHtml(aac.bigramme)}</span>` : ''}
      </div>
      <div class="shell-table-container" style="margin-top:1rem;">
        <table class="shell-table aac-info-table"><tbody>${rows}</tbody></table>
      </div>
    </div>
  </div>`;
}

/**
 * L'appareil photo du bouton de dépôt du logo.
 *
 * Il n'est pas dans `icones.ts`, et c'est délibéré : il n'y était pas non plus.
 * Le déplacer serait un changement de plus dans une conversion qui doit n'en
 * faire aucun — il rejoindra la table le jour où quelqu'un l'y demandera.
 *
 * Le sas le publie quand même, bien que personne ne le lise hors d'ici : une
 * `function` au premier niveau d'un script classique **était** sur `window`, et
 * retirer un nom de la surface est un changement qui se décide, non qui se
 * glisse dans une conversion (la règle que `_icon` tient depuis 5.c).
 */
export function cameraIcon(): string {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
}

/**
 * Ouvre la fenêtre d'édition, remplie de ce que le dernier rendu a lu.
 *
 * ── La divergence assumée, et pourquoi elle en reste une ──
 *
 * L'original écrit `const cfg = AAC_CFG || {}`, puis lit `cfg.instance.defaultLang`
 * : appelée **avant** le premier rendu de l'écran, la fonction lève
 * `TypeError: Cannot read properties of undefined (reading 'defaultLang')`.
 *
 * Le chemin est inatteignable — le bouton « Modifier » n'existe que dans le
 * balisage que `cfgSectionAAC` vient de rendre, et il pose `AAC_CFG` en entrant.
 * Mais il fallait le traiter, et le compilateur ne laisse pas écrire `{}` là où un
 * `instance` est attendu. Alors on lève **aussi**, avec un message qui nomme la
 * cause : c'est le même choix qu'en 5.d.1 pour un référentiel inconnu.
 *
 * La divergence est donc le texte du message, et elle est assertée par
 * `scripts/comparer-parametres.js` : si l'un des deux cessait de lever, le
 * contrôle le dirait.
 */
export function openAacEdit(): void {
  const cfg = AAC_CFG;
  if (!cfg) throw new Error("l'Administration n'a pas encore été rendue : `AAC_CFG` est vide");
  const aac = cfg.aac || {};
  const input = (id: string, label: string, value?: string) => `
    <div class="shell-form-group"><label>${label}</label><input class="shell-input" id="${id}" value="${escapeHtml(value || '')}"></div>`;
  const racine = document.getElementById('cfgModalRoot');
  if (!racine) return;
  racine.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:600px;">
      <div class="shell-modal-header"><h3>${escapeHtml(t('cfg_aac'))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          ${input('aacNom', "Nom de l'administration", aac.nom)}
          ${input('aacSigle', 'Sigle', aac.sigle)}
        </div>
        <div class="shell-form-row">
          ${input('aacEtat', 'État', aac.etat)}
          ${input('aacBigramme', 'Bigramme', aac.bigramme)}
        </div>
        <div class="shell-form-row">
          ${input('aacVille', 'Ville', aac.ville)}
          ${input('aacAdresse1', 'Adresse 1', aac.adresse1)}
        </div>
        <div class="shell-form-row">
          ${input('aacAdresse2', 'Adresse 2', aac.adresse2)}
          ${input('aacEmail', 'Email administrateur', aac.emailAdmin)}
        </div>
        <div class="shell-form-group"><label>${t('langue_defaut')}</label>
          <select class="shell-input" id="aacLang">
            <option value="fr" ${cfg.instance.defaultLang === 'fr' ? 'selected' : ''}>${t('langue_francais')}</option>
            <option value="en" ${cfg.instance.defaultLang === 'en' ? 'selected' : ''}>English</option>
            <option value="pt" ${cfg.instance.defaultLang === 'pt' ? 'selected' : ''}>${t('langue_portugais')}</option>
          </select>
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveAAC()">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
}

/**
 * Enregistre le logo, ou l'efface — une chaîne vide est l'effacement.
 *
 * Privée : les deux gestes du logo y mènent, rien d'autre.
 */
async function saveAacLogo(dataUrl: string): Promise<void> {
  const res = await appel('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aac: { logo: dataUrl } }),
  });
  if (res.ok) {
    showToast(dataUrl ? t('logo_enregistre') : t('logo_supprime'), 'success');
    await window.loadMe();
    void window.renderConfig();
  } else showToast(t('erreur_fichier_volumineux'), 'error', 4000);
}

export function uploadAacLogo(champ: HTMLInputElement): void {
  const file = champ.files && champ.files[0];
  if (!file) return;
  // Les deux mégaoctets sont vérifiés ici **et** par le serveur : celui-ci
  // refuse la requête, celui-là évite de lire 40 Mo en mémoire pour rien.
  if (file.size > 2 * 1024 * 1024) { showToast(t('image_trop_lourde'), 'error'); return; }
  const reader = new FileReader();
  reader.onload = () => saveAacLogo(String(reader.result));
  reader.readAsDataURL(file);
}

export async function removeAacLogo(): Promise<void> {
  if (!await confirmer(t('confirmer_suppr_logo'))) return;
  // Sans `await`, comme l'original : la confirmation referme, l'enregistrement
  // suit. L'attendre changerait le moment où cette promesse se résout, et rien
  // ici n'en a besoin.
  void saveAacLogo('');
}

export async function saveAAC(): Promise<void> {
  const gv = (id: string) => valeur(id).trim();
  const res = await appel('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aac: {
        nom: gv('aacNom'), sigle: gv('aacSigle'), etat: gv('aacEtat'), bigramme: gv('aacBigramme'),
        ville: gv('aacVille'), adresse1: gv('aacAdresse1'), adresse2: gv('aacAdresse2'),
        emailAdmin: gv('aacEmail'),
      },
      instance: { etat: gv('aacEtat'), codeEtat: gv('aacBigramme'), defaultLang: valeur('aacLang') },
    }),
  });
  if (res.ok) {
    closeRefModal();
    showToast(t('cfg_saved'), 'success');
    await window.loadMe();
    void window.renderConfig();
  } else showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

export function cfgSectionSecurite(cfg: ConfigSecurite): string {
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${escapeHtml(t('cfg_security'))} <span class="shell-badge badge-neutral">TDR §F.3</span></h3></div>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>${t('longueur_min_mdp')}</label><input class="shell-input" type="number" id="secMinLen" value="${cfg.security.passwordMinLength}"></div>
      <div class="shell-form-group"><label>${t('validite_mdp')}</label><input class="shell-input" type="number" id="secMaxAge" value="${cfg.security.passwordMaxAgeDays}"></div>
    </div>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Tentatives avant blocage</label><input class="shell-input" type="number" id="secMaxFail" value="${cfg.security.maxFailedAttempts}"></div>
      <div class="shell-form-group"><label>${t('deconnexion_inactivite')}</label><input class="shell-input" type="number" id="secTimeout" value="${cfg.security.sessionTimeoutMinutes}"></div>
    </div>
    <div class="cfg-module-row">
      <strong>${t('session_unique')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="secSingle" ${cfg.security.singleSession ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="cfg-module-row">
      <strong>${t('mdp_premiere_connexion')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="secForce" ${cfg.security.forceChangeOnFirstLogin ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="cfg-module-row">
      <div>
        <strong>Authentification multifacteur (MFA)</strong>
        <div style="font-size:.72rem;color:var(--text-muted);">
          ${t('code_usage_unique')}
        </div>
      </div>
      <label class="cfg-toggle"><input type="checkbox" id="secMfa" ${cfg.security.mfaEnabled ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="shell-btn shell-btn-primary" onclick="saveSecurite()">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
    </div>
  </div>`;
}

/**
 * Enregistre les sept réglages.
 *
 * Les quatre nombres partent **en chaînes**, comme dans l'original : c'est le
 * serveur qui les convertit (`parseInt`), et il ne retient que ce qui est
 * strictement positif. Envoyer `Number(...)` d'ici changerait ce que la route
 * reçoit, et une conversion que l'original ne fait pas est une divergence même
 * quand elle paraît inoffensive.
 */
export async function saveSecurite(): Promise<void> {
  const res = await appel('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      security: {
        passwordMinLength: valeur('secMinLen'),
        passwordMaxAgeDays: valeur('secMaxAge'),
        maxFailedAttempts: valeur('secMaxFail'),
        sessionTimeoutMinutes: valeur('secTimeout'),
        singleSession: coche('secSingle'),
        forceChangeOnFirstLogin: coche('secForce'),
        mfaEnabled: coche('secMfa'),
      },
    }),
  });
  if (res.ok) showToast(t('cfg_saved'), 'success');
  else showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

export function cfgSectionModules(modules: ModuleCatalogue[]): string {
  const rows = modules
    // Le tri porte sur une **copie** : trier la liste rendue par l'API en place
    // n'aurait aucun lecteur ici, mais c'est l'original qui a raison — et 5.d.0
    // a montré ce que coûte un tri sur place (il réordonnait `REFS`).
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(
      (m) => `
    <div class="cfg-module-row">
      <div style="display:flex;align-items:center;gap:.6rem;">
        <span style="color:${PRIO_COLORS[m.priority]};display:flex;">${moduleIcon(m.code, 18)}</span>
        <strong>${escapeHtml(m.name[window.CURRENT_LANG ?? ''] || m.name.fr)}</strong>
        <span class="shell-badge badge-neutral">${escapeHtml(m.tdr)} · P${m.priority}</span>
      </div>
      <label class="cfg-toggle">
        <input type="checkbox" data-module-toggle="${escapeHtml(m.code)}" ${m.enabled ? 'checked' : ''}>
        <span class="track"></span>
      </label>
    </div>`,
    )
    .join('');
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${escapeHtml(t('cfg_modules'))}</h3></div>
    ${rows}
  </div>`;
}

export function cfgSectionSysteme(cfg: ConfigSysteme): string {
  return `
  <div class="shell-card" style="margin-bottom:1rem;">
    <div class="portal-page-header"><h3>${escapeHtml(t('cfg_db'))}</h3></div>
    <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">${escapeHtml(cfg.database.note)}</p>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Pilote actuel</label><input class="shell-input" value="${escapeHtml(cfg.database.driver)}" disabled></div>
      <div class="shell-form-group"><label>PostgreSQL cible</label><input class="shell-input" value="${escapeHtml(cfg.database.postgres.host)}:${cfg.database.postgres.port}/${escapeHtml(cfg.database.postgres.database)}" disabled></div>
    </div>
  </div>
  <div class="shell-card">
    <div class="portal-page-header"><h3>${escapeHtml(t('cfg_replication'))}</h3></div>
    <div class="cfg-module-row">
      <strong>${t('replication_activee')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="repEnabled" ${cfg.replication.enabled ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="shell-form-group" style="margin-top:.75rem;">
      <label>${t('url_serveur_central')}</label>
      <input class="shell-input" id="repUrl" value="${escapeHtml(cfg.replication.centralUrl)}">
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="shell-btn shell-btn-primary" onclick="saveSysteme()">${icon('save', 14)} ${escapeHtml(t('cfg_save'))}</button>
    </div>
  </div>`;
}

export async function saveSysteme(): Promise<void> {
  const res = await appel('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replication: {
        enabled: coche('repEnabled'),
        centralUrl: valeur('repUrl').trim(),
      },
    }),
  });
  if (res.ok) showToast(t('cfg_saved'), 'success');
  else showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}
