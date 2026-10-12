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
// Trois noms ne sont que **prêtés** à ce fichier en attendant sa conversion :
// `LEVEL_COLORS` — qui était un `const` lexical d'`app.js`, que seul
// `app-config.js` lisait —, `orgChainFor` et `circuitHtml`, que la fiche d'une
// personne lit encore. **Ne pas les redéclarer**, ni `ORG_VIEW`, désormais privée
// au module : une copie lexicale ferait que la bascule des présentations n'agirait
// plus sur ce que l'écran rend.
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



window.togglePers = function (id) {
  const k = 'pers-' + id;
  if (CFG_OPEN.has(k)) CFG_OPEN.delete(k);
  else CFG_OPEN.add(k);
  renderConfig();
};

function cfgSectionPersonnel() {
  const coll = 'inspecteurs';
  const schema = REF_SCHEMAS[coll];
  const DETAIL_KEYS = ['numero_inspecteur', 'domaines', 'specialites', 'niveau_qualification'];
  const tableFields = schema.fields.filter((f) => !DETAIL_KEYS.includes(f.k));
  const detailFields = schema.fields.filter((f) => DETAIL_KEYS.includes(f.k));
  const colspan = tableFields.length + 2; // chevron + actions
  const rows = (REFS[coll] || [])
    .map((r) => {
      const open = CFG_OPEN.has('pers-' + r.id);
      const chain = orgChainFor(r.id);
      const cells = tableFields.map((f) => `<td>${fieldValue(f, r)}</td>`).join('');
      const detailInfo = detailFields
        .map((f) => `<div class="pers-info-item"><span class="pers-info-lbl">${esc(tr(f.l))}</span><span class="pers-info-val">${fieldValue(f, r)}</span></div>`)
        .join('');
      return `
      <tr>
        <td><button class="shell-btn-icon pers-toggle" onclick="togglePers('${r.id}')" title="${t('audit_col_details')}" aria-label="${t('audit_col_details')}" style="transform:rotate(${open ? 90 : 0}deg);">${icon('chevronRight', 14)}</button></td>
        ${cells}
        <td class="actions-cell">
          <button class="shell-btn-icon" onclick="openRefModal('${coll}','${r.id}')" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">${icon('edit', 15)}</button>
          <button class="shell-btn-icon" onclick="deleteRef('${coll}','${r.id}')" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
        </td>
      </tr>
      <tr class="pers-detail-row" style="${open ? '' : 'display:none;'}">
        <td colspan="${colspan}" style="background:var(--bg);">
          <div class="pers-info-grid">${detailInfo}</div>
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.6rem 0 .4rem;">${t('circuit_validation')}</div>
          ${circuitHtml(chain)}
        </td>
      </tr>`;
    })
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${esc(tr(schema.title))}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un membre du personnel...')}
      ${exportBar('inspecteurs', tr("Liste du personnel de l'Administration"))}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('${coll}')">${icon('plus', 13)} ${esc(t('add'))}</button>
    </div>
  </div>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr><th></th>${tableFields.map((f) => `<th>${esc(tr(f.l))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="${colspan}" style="color:var(--text-muted);">${t('aucun_element')}</td></tr>`}</tbody>
    </table>
  </div>`;
}







// ── Accordéons hiérarchiques (Domaines / Secteurs / Sous-activités / Thèmes) ──
const CFG_OPEN = new Set();

window.toggleAcc = function (key) {
  if (CFG_OPEN.has(key)) CFG_OPEN.delete(key);
  else CFG_OPEN.add(key);
  renderConfig();
};

function statutBadge(s) {
  return s === 'inactif'
    ? '<span class="shell-badge badge-inactive">Inactif</span>'
    : '<span class="shell-badge badge-active">Actif</span>';
}

function accActions(coll, id) {
  return `<span style="display:flex;gap:.15rem;" onclick="event.stopPropagation()">
    <button class="shell-btn-icon" onclick="openRefModal('${coll}','${id}')" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">${icon('edit', 15)}</button>
    <button class="shell-btn-icon" style="color:#dc2626;" onclick="deleteRef('${coll}','${id}')" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}">${icon('trash', 15)}</button>
  </span>`;
}

function accAddBtn(coll, defaults, label) {
  const json = JSON.stringify(JSON.stringify(defaults || {}));
  return `<button class="shell-btn shell-btn-outline shell-btn-sm" style="margin-top:.6rem;" onclick='openRefModal("${coll}","",${json})'>${icon('plus', 13)} ${esc(label)}</button>`;
}

function accItem(key, color, headerHtml, actionsHtml, bodyHtml, dense) {
  const open = CFG_OPEN.has(key);
  return `
  <div class="cfg-acc-item ${open ? 'open' : ''}" style="margin-bottom:${dense ? '.1rem' : '.5rem'};">
    <div class="cfg-acc-header" style="border-left:4px solid ${color};" onclick="toggleAcc('${key}')">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">${headerHtml}</div>
      <div style="display:flex;align-items:center;gap:.35rem;">${actionsHtml}<span class="cfg-acc-chevron" style="display:flex;">${icon('chevronRight', 15)}</span></div>
    </div>
    <div class="cfg-acc-body">${bodyHtml}</div>
  </div>`;
}

// Sous-menu « Domaines & Secteurs » : accordéons Domaines → Secteurs → Sous-activités
function cfgSectionDomaines() {
  const domaines = REFS.domaines || [];
  const secteurs = REFS.secteurs || [];
  const sousActivites = REFS.sous_activites || [];
  const themes = REFS.themes_supervision || [];

  const themeRow = (th) => `
    <div class="cfg-module-row" style="border-left:3px solid ${LEVEL_COLORS[3]};padding-left:.75rem;">
      <div>
        <strong>${th.code ? `<span class="shell-badge badge-neutral" style="margin-right:.4rem;">${esc(th.code)}</span>` : ''}${esc(th.libelle)}</strong>
        ${th.description ? `<div style="font-size:.75rem;color:var(--text-muted);">${esc(th.description)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:.35rem;">${statutBadge(th.statut)}${accActions('themes_supervision', th.id)}</div>
    </div>`;

  const items = domaines
    .map((d) => {
      const dSecteurs = secteurs.filter((s) => s.domaine_id === d.id);
      const secteurItems = dSecteurs
        .map((s) => {
          const sSas = sousActivites.filter((x) => x.secteur_id === s.id);
          const saItems = sSas
            .map((x) => {
              const saThemes = themes.filter((th) => th.sous_activite_id === x.id);
              return accItem(
                'sa-' + x.id,
                LEVEL_COLORS[2],
                `<span class="shell-badge badge-neutral">${esc(x.code)}</span> <strong style="margin-left:.35rem;">${esc(x.nom)}</strong>
                 <span class="shell-badge badge-neutral">${saThemes.length} thème(s)</span>`,
                accActions('sous_activites', x.id),
                (saThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_theme') + '</p>') +
                  accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, sous_activite_id: x.id, statut: 'actif' }, 'Thème'),
                true
              );
            })
            .join('');
          const directThemes = themes.filter((th) => th.secteur_id === s.id && !th.sous_activite_id);
          const directBlock = `
            <div style="margin-top:.4rem;">
              <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.35rem 0 .25rem;">${t('themes_du_secteur')}</div>
              ${directThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_theme_secteur') + '</p>'}
              ${accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, statut: 'actif' }, 'Thème')}
            </div>`;
          const nbThemes = themes.filter((th) => th.secteur_id === s.id || sSas.some((x) => x.id === th.sous_activite_id)).length;
          return accItem(
            'sect-' + s.id,
            LEVEL_COLORS[1],
            `<strong style="color:${LEVEL_COLORS[1]};">${esc(s.code)}</strong> — ${esc(s.nom)}
             <span class="shell-badge badge-neutral">Cycle ${esc(s.csn)} mois</span>
             <span class="shell-badge badge-neutral">${sSas.length} sous-activité(s)</span>
             <span class="shell-badge badge-neutral">${nbThemes} thème(s)</span>
             ${statutBadge(s.statut)}`,
            accActions('secteurs', s.id),
            (saItems || '') +
              accAddBtn('sous_activites', { secteur_id: s.id }, 'Sous-activité') +
              directBlock,
            true
          );
        })
        .join('');
      return accItem(
        'dom-' + d.id,
        LEVEL_COLORS[0],
        `<strong style="color:${LEVEL_COLORS[0]};">${esc(d.code)}</strong> — ${esc(d.nom)}
         <span class="shell-badge badge-neutral">${dSecteurs.length} secteur(s)</span>
         ${statutBadge(d.statut)}`,
        accActions('domaines', d.id),
        (secteurItems || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_secteur') + '</p>') +
          accAddBtn('secteurs', { domaine_id: d.id }, 'Secteur'),
        true
      );
    })
    .join('');

  const orphans = themes.filter((th) => !th.secteur_id && !th.sous_activite_id);
  const orphanBlock = orphans.length
    ? `<div style="margin-top:1rem;">
        <div class="portal-page-header"><h3>${tr('Thèmes non rattachés')}</h3></div>
        ${orphans.map(themeRow).join('')}
      </div>`
    : '';

  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${tr('Domaines | Secteurs | Sous-activités | Thèmes')}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un domaine / secteur...')}
      ${exportBar('activites', tr('Domaines | Secteurs | Sous-activités | Thèmes'), 'exportPdfActivites()')}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('domaines')">${icon('plus', 13)} Domaine</button>
    </div>
  </div>
  <div class="cfg-accordion cfg-acc-dense">${items || '<p style="color:var(--text-muted);">' + t('aucun_domaine_defini') + '</p>'}</div>
  ${orphanBlock}`;
}


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
