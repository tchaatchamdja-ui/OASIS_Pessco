/* OASIS — Portail
 * Suite de app.js : la configuration : référentiels, organisation, personnel, domaines, AAC, organigramme, sécurité, modules, système.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ══════════ Configuration (layout PESSCO) ══════════

const CFG_TABS = [
  { section: 'cfg_sec_referentiels' },
  { id: 'organisation', labelKey: 'cfg_organisation', icon: 'users' },
  { id: 'organigramme', labelKey: 'cfg_organigramme', icon: 'sitemap' },
  { id: 'domaines', labelKey: 'cfg_domaines', icon: 'globe' },
  { id: 'exigences', labelKey: 'cfg_exigences', icon: 'fileText' },
  { id: 'prestataires', labelKey: 'cfg_prestataires', icon: 'briefcase' },
  { id: 'inspecteurs', labelKey: 'cfg_inspecteurs', icon: 'userCheck' },
  { id: 'autres', labelKey: 'cfg_autres', icon: 'sliders' },
  { section: 'cfg_sec_plateforme' },
  { id: 'instances', labelKey: 'Instances', icon: 'globe', regionalOnly: true },
  { id: 'securite', labelKey: 'cfg_security', icon: 'shield' },
  { id: 'modules', labelKey: 'cfg_modules', icon: 'grid' },
  { id: 'systeme', labelKey: 'cfg_systeme', icon: 'database' },
];


// ── Schémas des référentiels : partis dans un module typé (ADR-003, 5.d) ──
//
// Les onze schémas, les six fournisseurs d'options et `fieldValue` vivent
// désormais dans `frontend/portail/schemas.ts`, et un sas les pose sur `window`
// avant le chargement de ce fichier (`public/app/schemas.js`, voir index.html).
//
// Ce fichier les appelle toujours en identifiants nus — `REF_SCHEMAS`,
// `champsVisibles`, `fieldValue`, `refLabel`, `personnelName`… — qui atteignent
// maintenant les propriétés de `window`. **Il ne doit pas les redéclarer** : un
// `const REF_SCHEMAS` ici serait une globale lexicale qui masquerait la
// propriété pour tout ce fichier, et deux versions des schémas coexisteraient
// sans une erreur.
//
// L'extraction est éprouvée par `scripts/comparer-schemas.js` : 2 820
// comparaisons sur les données réelles, et trois divergences assumées —
// dont la correction d'un tri qui modifiait `REFS` sur place.

// ── Le CRUD générique des référentiels : parti dans un module typé (5.d.1) ──
//
// `refTable`, `openRefModal`, `closeRefModal`, `saveRef`, `deleteRef`,
// `orgTypeChanged`, `toggleInspectorFields` et `orgTopLevelType` vivent
// désormais dans `frontend/portail/referentiels.ts` ; un sas les pose sur
// `window` avant le chargement de ce fichier (`public/app/referentiels.js`).
//
// `CURRENT_CFG` est monté sur `window` avec eux (voir `frontend/portail/etat.ts`) :
// c'était un `let` du premier niveau, donc une globale lexicale qu'aucun module ne
// peut atteindre, et `openRefModal` y lit le sigle et le nom de l'Administration.
// Ce fichier continue de l'écrire par une affectation nue, et **ne doit pas le
// redéclarer**.
//
// Trois dépendances restent dans l'autre sens : le module lit `tr`,
// `searchInputHtml` et `exportBar` sur `window`, parce que leurs tables et leur
// état vivent encore dans `app.js`.
//
// L'extraction est éprouvée par `scripts/comparer-referentiels.js` : 640
// comparaisons de balisage, caractère pour caractère, sur les données réelles et
// en quatre régimes. Les cinq gestes qui touchent au document ou à l'API sont
// couverts par la ronde complète de la suite « parcours » (5.c.7).


// Exigences groupées par règlement (bandeaux rétractables ; date d'adoption à droite)
// ── Les exigences réglementaires : parties dans un module typé (5.d.2) ──
//
// `toggleExigGroup`, `cfgSectionExigences`, `openExigDrawer`, `closeExigDrawer`,
// `saveExigDrawer`, `openReglementForm` et `saveReglement` vivent désormais dans
// `frontend/portail/exigences.ts` ; un sas les pose sur `window` avant le
// chargement de ce fichier (`public/app/exigences.js`).
//
// `EXIG_OPEN` — l'ensemble des bandeaux dépliés — et `fmtDay` sont partis avec
// eux : ce bloc en était le seul lecteur. **Ne pas les redéclarer ici** : un
// `const EXIG_OPEN` serait une globale lexicale, et l'écran lirait un état que
// la bascule ne touche plus.
//
// L'extraction est éprouvée par `scripts/comparer-exigences.js` : 84
// comparaisons de balisage, caractère pour caractère, en sept régimes — bandeaux
// fermés, dépliés, un seul déplié, les trois langues, et un jeu bricolé qui porte
// une exigence orpheline et un règlement sans date. Les quatre gestes qui
// touchent au document ou à l'API sont couverts par la suite « parcours » (5.c.12).


// ── L'organigramme : parti dans un module typé (5.d.3) ──
//
// Les douze gestes, les deux présentations, le registre d'un poste et la chaîne
// de validation vivent désormais dans `frontend/portail/organigramme.ts` ; un sas
// les pose sur `window` avant le chargement de ce fichier.
//
// `LEVEL_COLORS`, `orgChainFor` et `circuitHtml` sont **prêtés** par ce sas. Plus
// aucun code de ce fichier ne les lit depuis 5.d.4 — mais les comparateurs de
// 5.d.3 et 5.d.4 en ont besoin pour faire tourner les versions d'origine, qui les
// lisaient dans la portée globale. Le prêt se rendra avec ce fichier (5.d.6).
//
// **Ne pas redéclarer `ORG_VIEW`**, désormais privée au module : une copie
// lexicale ferait que la bascule des présentations n'agirait plus sur ce que
// l'écran rend.
//
// `normalizeOrgTopLevel` part avec eux, et son effet de bord est nommé là-bas :
// elle **écrit dans `REFS`** à chaque rendu, pour aligner l'entité de niveau 1 sur
// l'identité de l'Administration. La conversion ne corrige pas, elle rend visible.
//
// Éprouvé par `scripts/comparer-organigramme.js` : 243 comparaisons, caractère
// pour caractère, en onze régimes — dont un cycle de rattachement et une
// hiérarchie de sept niveaux, tous deux fabriqués après des contre-essais qui ne
// mordaient pas. Les dix gestes qui touchent au document ou à l'API sont couverts
// par la suite « parcours » (5.c.11).


// ── Le personnel et la taxinomie : partis dans un module typé (5.d.4) ──
//
// `cfgSectionPersonnel`, `cfgSectionDomaines`, `togglePers`, `toggleAcc` et les
// quatre fabriques d'accordéon vivent désormais dans
// `frontend/portail/taxinomie.ts` ; un sas pose les quatre premiers sur `window`.
//
// `CFG_OPEN` part avec eux, et c'est **lui** qui imposait de convertir les deux
// écrans d'un seul coup : l'ensemble des éléments dépliés sert aux fiches du
// personnel comme aux accordéons de la taxinomie. **Ne pas le redéclarer ici** —
// une copie lexicale ferait que déplier une fiche n'agirait plus sur ce que
// l'écran rend.
//
// Éprouvé par `scripts/comparer-taxinomie.js` : 20 comparaisons de balisage en
// dix régimes — tout replié, tout déplié, les deux mélanges, les deux régimes
// d'instance, les collections renversées, un jeu bricolé (domaine sans secteur,
// thème orphelin, fiche non-inspecteur) et le vide.


// ── Accordéons hiérarchiques (Domaines / Secteurs / Sous-activités / Thèmes) ──


// ── Sections de configuration ──

let AAC_CFG = null;
function cfgSectionAAC(cfg) {
  AAC_CFG = cfg;
  const aac = cfg.aac || {};
  const val = (v) => (v ? esc(v) : '<span style="color:var(--text-muted);">—</span>');
  const langLabel = { fr: 'Français', en: 'English', pt: 'Português' }[cfg.instance.defaultLang] || cfg.instance.defaultLang;
  const logoBox = aac.logo
    ? `<img src="${aac.logo}" alt="Logo AAC" class="aac-logo-preview">`
    : `<div class="aac-logo-empty">${icon('landmark', 30)}<span>${t('aucun_logo')}</span></div>`;
  const rows = [
    ['Nom complet', val(aac.nom)],
    ['Sigle', val(aac.sigle)],
    ['Bigramme', val(aac.bigramme)],
    ['État', val(aac.etat)],
    ['Ville', val(aac.ville)],
    ['Adresse 1', val(aac.adresse1)],
    ['Adresse 2', val(aac.adresse2)],
    ['Email administrateur', val(aac.emailAdmin)],
    ['Langue par défaut', esc(langLabel)],
  ]
    .map((r) => `<tr><td class="aac-info-lbl">${tr(r[0])}</td><td class="aac-info-val">${r[1]}</td></tr>`)
    .join('');

  return `
  <div class="portal-page-header"><h3>${tr("Détails sur l'Administration")}</h3>
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
      <h2 class="aac-title">${aac.nom ? esc(aac.nom) : "Administration de l'Aviation Civile"}</h2>
      <div class="aac-badges">
        ${aac.sigle ? `<span class="shell-badge badge-neutral aac-badge-sigle">${esc(aac.sigle)}</span>` : ''}
        ${aac.bigramme ? `<span class="shell-badge badge-neutral">${esc(aac.bigramme)}</span>` : ''}
      </div>
      <div class="shell-table-container" style="margin-top:1rem;">
        <table class="shell-table aac-info-table"><tbody>${rows}</tbody></table>
      </div>
    </div>
  </div>`;
}

function cameraIcon() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
}

window.openAacEdit = function () {
  const cfg = AAC_CFG || {};
  const aac = (cfg.aac) || {};
  const input = (id, label, value) => `
    <div class="shell-form-group"><label>${label}</label><input class="shell-input" id="${id}" value="${esc(value || '')}"></div>`;
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:600px;">
      <div class="shell-modal-header"><h3>${esc(t('cfg_aac'))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
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
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveAAC()">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
};

async function saveAacLogo(dataUrl) {
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aac: { logo: dataUrl } }),
  });
  if (res.ok) {
    showToast(dataUrl ? t('logo_enregistre') : t('logo_supprime'), 'success');
    await loadMe();
    renderConfig();
  } else showToast(t('erreur_fichier_volumineux'), 'error', 4000);
}

window.uploadAacLogo = function (inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast(t('image_trop_lourde'), 'error');
  const reader = new FileReader();
  reader.onload = () => saveAacLogo(reader.result);
  reader.readAsDataURL(file);
};

window.removeAacLogo = async function () {
  if (!await oasisConfirmer(t('confirmer_suppr_logo'))) return;
  saveAacLogo('');
};

window.saveAAC = async function () {
  const gv = (id) => document.getElementById(id).value.trim();
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aac: {
        nom: gv('aacNom'), sigle: gv('aacSigle'), etat: gv('aacEtat'), bigramme: gv('aacBigramme'),
        ville: gv('aacVille'), adresse1: gv('aacAdresse1'), adresse2: gv('aacAdresse2'),
        emailAdmin: gv('aacEmail'),
      },
      instance: { etat: gv('aacEtat'), codeEtat: gv('aacBigramme'), defaultLang: document.getElementById('aacLang').value },
    }),
  });
  if (res.ok) {
    closeRefModal();
    showToast(t('cfg_saved'), 'success');
    await loadMe();
    renderConfig();
  } else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};


function cfgSectionSecurite(cfg) {
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_security'))} <span class="shell-badge badge-neutral">TDR §F.3</span></h3></div>
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
      <button class="shell-btn shell-btn-primary" onclick="saveSecurite()">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
    </div>
  </div>`;
}

window.saveSecurite = async function () {
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      security: {
        passwordMinLength: document.getElementById('secMinLen').value,
        passwordMaxAgeDays: document.getElementById('secMaxAge').value,
        maxFailedAttempts: document.getElementById('secMaxFail').value,
        sessionTimeoutMinutes: document.getElementById('secTimeout').value,
        singleSession: document.getElementById('secSingle').checked,
        forceChangeOnFirstLogin: document.getElementById('secForce').checked,
        mfaEnabled: document.getElementById('secMfa').checked,
      },
    }),
  });
  if (res.ok) showToast(t('cfg_saved'), 'success');
  else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

function cfgSectionModules(modules) {
  const rows = modules
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(
      (m) => `
    <div class="cfg-module-row">
      <div style="display:flex;align-items:center;gap:.6rem;">
        <span style="color:${PRIO_COLORS[m.priority]};display:flex;">${moduleIcon(m.code, 18)}</span>
        <strong>${esc(m.name[CURRENT_LANG] || m.name.fr)}</strong>
        <span class="shell-badge badge-neutral">${esc(m.tdr)} · P${m.priority}</span>
      </div>
      <label class="cfg-toggle">
        <input type="checkbox" data-module-toggle="${esc(m.code)}" ${m.enabled ? 'checked' : ''}>
        <span class="track"></span>
      </label>
    </div>`
    )
    .join('');
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_modules'))}</h3></div>
    ${rows}
  </div>`;
}

function cfgSectionSysteme(cfg) {
  return `
  <div class="shell-card" style="margin-bottom:1rem;">
    <div class="portal-page-header"><h3>${esc(t('cfg_db'))}</h3></div>
    <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">${esc(cfg.database.note)}</p>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Pilote actuel</label><input class="shell-input" value="${esc(cfg.database.driver)}" disabled></div>
      <div class="shell-form-group"><label>PostgreSQL cible</label><input class="shell-input" value="${esc(cfg.database.postgres.host)}:${cfg.database.postgres.port}/${esc(cfg.database.postgres.database)}" disabled></div>
    </div>
  </div>
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_replication'))}</h3></div>
    <div class="cfg-module-row">
      <strong>${t('replication_activee')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="repEnabled" ${cfg.replication.enabled ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="shell-form-group" style="margin-top:.75rem;">
      <label>${t('url_serveur_central')}</label>
      <input class="shell-input" id="repUrl" value="${esc(cfg.replication.centralUrl)}">
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="shell-btn shell-btn-primary" onclick="saveSysteme()">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
    </div>
  </div>`;
}

window.saveSysteme = async function () {
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replication: {
        enabled: document.getElementById('repEnabled').checked,
        centralUrl: document.getElementById('repUrl').value.trim(),
      },
    }),
  });
  if (res.ok) showToast(t('cfg_saved'), 'success');
  else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

window.cfgNavigate = function (sub) {
  CFG_SUB = sub;
  portailReinitialiserRecherche();
  renderConfig();
};

window.toggleCfgSidebar = function () {
  CFG_COLLAPSED = !CFG_COLLAPSED;
  renderConfig();
};


async function renderConfig() {
  const [cfgRes, modulesRes] = await Promise.all([api('/api/config'), api('/api/modules')]);
  const cfg = await cfgRes.json();
  CURRENT_CFG = cfg;
  const modules = await modulesRes.json();
  if (!Object.keys(REFS).length) await loadRefs();
  if (CFG_SUB === 'instances' && jeSuisRegional()) await cfgChargerInstances();
  normalizeOrgTopLevel(cfg);

  let content = '';
  switch (CFG_SUB) {
    case 'organisation': content = cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation'); break;
    case 'organigramme': content = cfgSectionOrganigramme(); break;
    case 'domaines': content = cfgSectionDomaines(); break;
    case 'themes': CFG_SUB = 'domaines'; content = cfgSectionDomaines(); break;
    case 'exigences': content = cfgSectionExigences(); break;
    case 'prestataires': content = refTable('prestataires', true); break;
    case 'inspecteurs': content = cfgSectionPersonnel(); break;
    case 'autres': content = refTable('types_supervision', true) + refTable('modes_supervision') + refTable('niveaux_qualifications') + refTable('specialites_inspecteur'); break;
    case 'securite': content = cfgSectionSecurite(cfg); break;
    case 'modules': content = cfgSectionModules(modules); break;
    case 'systeme': content = cfgSectionSysteme(cfg); break;
    case 'instances': content = cfgSectionInstances(); break;
    default: content = cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation');
  }

  const sidebarItems = CFG_TABS.filter((tab) => !tab.regionalOnly || jeSuisRegional()).map((tab) => {
    if (tab.section) return `<div class="cfg-sidebar-section">${esc(t(tab.section))}</div>`;
    return `
    <button class="cfg-sidebar-item ${CFG_SUB === tab.id ? 'active' : ''}" onclick="cfgNavigate('${tab.id}')" title="${esc(t(tab.labelKey))}">
      <span class="cfg-sidebar-icon">${icon(tab.icon, 17)}</span>
      <span class="cfg-sidebar-label">${esc(t(tab.labelKey))}</span>
    </button>`;
  }).join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-page-header"><h2>${esc(t('config_title'))}</h2></div>
    <div class="cfg-layout">
      <div class="cfg-sidebar ${CFG_COLLAPSED ? 'collapsed' : ''}">
        <button class="cfg-sidebar-toggle" onclick="toggleCfgSidebar()" aria-label="${esc(t("sous_menu_basculer"))}" title="${esc(t("sous_menu_basculer"))}">${CFG_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
        ${sidebarItems}
      </div>
      <div class="cfg-content">${content}</div>
    </div>
    <div id="cfgModalRoot"></div>`;

  document.querySelectorAll('[data-module-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const code = toggle.dataset.moduleToggle;
      const res = await api(`/api/modules/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: toggle.checked }),
      });
      if (res.ok) showToast(toggle.checked ? t('module_active', code) : t('module_desactive', code), 'success');
      else {
        toggle.checked = !toggle.checked;
        showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
      }
    });
  });
}
