// OASIS — logique du portail (socle Phase 1)
// Logo de l'application (/img/oasis-logo.svg appliqué en masque : il prend la
// couleur du contexte, donc reste lisible sur les 5 thèmes).
const OASIS_LOGO_IMG = '<span class="oasis-logo-img" role="img" aria-label="OASIS"></span>';

// Nom complet : les majuscules formant le sigle OASIS sont légèrement agrandies.
const OASIS_FULLNAME_HTML =
  '<span class="sigle-cap">O</span>util d\'<span class="sigle-cap">A</span>dministration' +
  ' et de <span class="sigle-cap">S</span>upervision' +
  ' <span class="sigle-cap">I</span>ntégrée de la <span class="sigle-cap">S</span>écurité';

// ── Téléphone : indicatif pays + numéro ──
// Indicatifs UEMOA en tête, puis principaux partenaires.
const PHONE_CODES = [
  { c: '+229', l: 'Bénin' }, { c: '+226', l: 'Burkina Faso' }, { c: '+225', l: "Côte d'Ivoire" },
  { c: '+245', l: 'Guinée-Bissau' }, { c: '+223', l: 'Mali' }, { c: '+227', l: 'Niger' },
  { c: '+221', l: 'Sénégal' }, { c: '+228', l: 'Togo' },
  { c: '+233', l: 'Ghana' }, { c: '+234', l: 'Nigéria' }, { c: '+237', l: 'Cameroun' },
  { c: '+235', l: 'Tchad' }, { c: '+241', l: 'Gabon' }, { c: '+242', l: 'Congo' },
  { c: '+243', l: 'RD Congo' }, { c: '+212', l: 'Maroc' }, { c: '+216', l: 'Tunisie' },
  { c: '+213', l: 'Algérie' }, { c: '+33', l: 'France' }, { c: '+32', l: 'Belgique' },
  { c: '+41', l: 'Suisse' }, { c: '+1', l: 'États-Unis / Canada' }, { c: '+44', l: 'Royaume-Uni' },
  { c: '+351', l: 'Portugal' }, { c: '+34', l: 'Espagne' },
];
const DEFAULT_PHONE_CODE = '+229';

// « +229 97 00 00 00 » → { code: '+229', number: '97 00 00 00' }
function splitPhone(value) {
  const v = String(value || '').trim();
  if (!v) return { code: DEFAULT_PHONE_CODE, number: '' };
  const match = PHONE_CODES
    .filter((p) => v.startsWith(p.c))
    .sort((a, b) => b.c.length - a.c.length)[0];
  if (match) return { code: match.c, number: v.slice(match.c.length).trim() };
  return { code: v.startsWith('+') ? '' : DEFAULT_PHONE_CODE, number: v };
}

function phoneFieldHtml(id, value, label) {
  const { code, number } = splitPhone(value);
  const opts = PHONE_CODES.map((p) =>
    `<option value="${p.c}" ${p.c === code ? 'selected' : ''}>${p.c} · ${esc(p.l)}</option>`).join('');
  return `<div class="shell-form-group">
    <label>${esc(label || 'Téléphone')}</label>
    <div class="phone-field">
      <select class="shell-input phone-code" id="${id}Code">${opts}</select>
      <input class="shell-input phone-number" id="${id}" type="tel" inputmode="tel"
             placeholder="97 00 00 00" value="${esc(number)}">
    </div>
  </div>`;
}

// Valeur à enregistrer : « indicatif numéro » (vide si aucun numéro saisi)
function phoneFieldValue(id) {
  const num = (document.getElementById(id).value || '').trim();
  if (!num) return '';
  const codeEl = document.getElementById(id + 'Code');
  const code = codeEl ? codeEl.value : '';
  return (code ? code + ' ' : '') + num;
}

// Cale la base de l'aéroport sur celle de la tour de contrôle (sous-titre).

// Affichage des modules : 'grid' (défaut) ou 'list'
let MODULES_VIEW = localStorage.getItem('oasis_modules_view') === 'list' ? 'list' : 'grid';
window.setModulesView = function (mode) {
  MODULES_VIEW = mode === 'list' ? 'list' : 'grid';
  localStorage.setItem('oasis_modules_view', MODULES_VIEW);
  const box = document.getElementById('portalModules');
  if (box) box.classList.toggle('list-view', MODULES_VIEW === 'list');
  document.querySelectorAll('.portal-viewmode-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0) === (MODULES_VIEW === 'grid'));
  });
};
const PRIO_COLORS = { 1: '#2563eb', 2: '#0891b2', 3: '#f59e0b', 4: '#10b981', 5: '#8b5cf6' };
// Teinte propre à un module, quand son thème en réunit plusieurs : les quatre
// cartes de « Surveillance et inspections » ne se ressemblent plus.
const COULEURS_MODULE = {
  PLAN: '#0059ff',
  SURV: '#ed580e',
  SAFA: '#ff9500',
  CARE: '#ff0000',
};
const LEVEL_COLORS = ['#2563eb', '#0891b2', '#f59e0b', '#10b981', '#8b5cf6'];
// `icon` est facultatif : un thème qui n'en déclare pas voit son titre commencer
// au premier mot. La surveillance continue s'en passe — son intitulé porte déjà
// son sigle, et la loupe n'y ajoutait rien.
const THEMES_ORDER = [
  { code: 'surveillance' },
  { code: 'reglementation', icon: 'fileText' },
  { code: 'cert_risques', icon: 'award' },
  { code: 'personnel_coop', icon: 'users' },
  { code: 'services', icon: 'creditCard' },
];

// Traductions des libellés de Configuration (sections + colonnes). fr → [en, pt]
const CFG_I18N = {
  // Titres de sections / tables
  'Niveaux hiérarchiques': ['Hierarchical levels', 'Níveis hierárquicos'],
  'Entités organisationnelles': ['Organisational entities', 'Entidades organizacionais'],
  'Domaines': ['Domains', 'Domínios'],
  'Secteurs': ['Sectors', 'Setores'],
  'Sous-activités': ['Sub-activities', 'Subatividades'],
  'Thèmes de supervision': ['Oversight themes', 'Temas de supervisão'],
  'Liste des exigences': ['Requirements list', 'Lista de requisitos'],
  'Prestataires de services': ['Service providers', 'Prestadores de serviços'],
  "Liste du personnel de l'Administration": ['Administration staff list', 'Lista do pessoal da Administração'],
  'Types de supervision': ['Oversight types', 'Tipos de supervisão'],
  'Modes de supervision': ['Oversight modes', 'Modos de supervisão'],
  'Niveaux de qualification': ['Qualification levels', 'Níveis de qualificação'],
  "Spécialités d'inspecteur": ['Inspector specialities', 'Especialidades de inspetor'],
  "Détails sur l'Administration": ['Administration details', 'Detalhes da Administração'],
  'Organigramme': ['Org chart', 'Organograma'],
  'Domaines / Secteurs / Sous-activités / Thèmes': ['Domains / Sectors / Sub-activities / Themes', 'Domínios / Setores / Subatividades / Temas'],
  'Thèmes non rattachés': ['Unlinked themes', 'Temas não associados'],
  // Colonnes / champs
  'Type de niveau': ['Level type', 'Tipo de nível'],
  'Ordre': ['Order', 'Ordem'],
  'Niveau': ['Level', 'Nível'],
  'Sigle': ['Acronym', 'Sigla'],
  'Libellé': ['Label', 'Rótulo'],
  'Poste': ['Position', 'Cargo'],
  'Titulaire': ['Holder', 'Titular'],
  'Intérimaire': ['Deputy', 'Substituto'],
  'Rattachement': ['Parent', 'Vínculo'],
  'Code': ['Code', 'Código'],
  'Nom': ['Name', 'Nome'],
  'Prénoms': ['First names', 'Nomes próprios'],
  'Prénom': ['First name', 'Nome próprio'],
  'Description': ['Description', 'Descrição'],
  'Statut': ['Status', 'Estado'],
  'Domaine': ['Domain', 'Domínio'],
  'Cycle (mois)': ['Cycle (months)', 'Ciclo (meses)'],
  'Secteur': ['Sector', 'Setor'],
  'Sous-activité': ['Sub-activity', 'Subatividade'],
  'Référence': ['Reference', 'Referência'],
  'Règlement': ['Regulation', 'Regulamento'],
  "Date d'adoption": ['Adoption date', 'Data de adoção'],
  'Sans règlement': ['No regulation', 'Sem regulamento'],
  'Thème': ['Theme', 'Tema'],
  'Moyen de contrôle': ['Control means', 'Meio de controlo'],
  'Trigramme': ['Trigram', 'Trigrama'],
  'Dirigeant': ['Manager', 'Dirigente'],
  'Point focal': ['Focal point', 'Ponto focal'],
  'Email': ['Email', 'Email'],
  'Réf. agrément': ['Approval ref.', 'Ref. aprovação'],
  'Réf Personnel': ['Staff ref.', 'Ref. pessoal'],
  'Inspecteur ?': ['Inspector?', 'Inspetor?'],
  'N° inspecteur': ['Inspector no.', 'N.º inspetor'],
  'Domaines': ['Domains', 'Domínios'],
  'Spécialités': ['Specialities', 'Especialidades'],
  'Niveau de qualification': ['Qualification level', 'Nível de qualificação'],
  'Type': ['Type', 'Tipo'],
  'Durée standard (j)': ['Standard duration (d)', 'Duração padrão (d)'],
  'Mode': ['Mode', 'Modo'],
  'Spécialité': ['Speciality', 'Especialidade'],
  // Lignes du tableau « Détails sur l'Administration »
  'Nom complet': ['Full name', 'Nome completo'],
  'Bigramme': ['Bigram', 'Bigrama'],
  'État': ['State', 'Estado'],
  'Ville': ['City', 'Cidade'],
  'Adresse 1': ['Address 1', 'Endereço 1'],
  'Adresse 2': ['Address 2', 'Endereço 2'],
  'Email administrateur': ['Admin email', 'Email do administrador'],
  'Langue par défaut': ['Default language', 'Idioma predefinido'],
  'Accès aux Modules': ['Module access', 'Acesso aos módulos'],
};
function tr(fr) {
  const e = CFG_I18N[fr];
  if (!e) return fr;
  return CURRENT_LANG === 'en' ? e[0] : CURRENT_LANG === 'pt' ? e[1] : fr;
}

let ME = null;
let CURRENT_VIEW = 'home';
let REFS = {};
let CFG_SUB = 'organisation';
let CFG_COLLAPSED = false;
let NOTIF_LAST_SEEN = parseInt(localStorage.getItem('oasis_notif_seen') || '0', 10);

async function api(path, options) {
  // En-tête d'origine applicative : un formulaire d'un autre site ne peut pas
  // l'ajouter, le serveur refuse donc les écritures qui en sont dépourvues.
  const o = { ...(options || {}) };
  o.headers = { ...(o.headers || {}), 'X-OASIS-Request': '1' };
  const res = await fetch(path, o);
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('unauthenticated');
  }
  return res;
}

// Valeur passée en argument d'un gestionnaire inline. `esc` seul ne suffit
// pas : il laisse passer le guillemet une fois l'entité redécodée, et une
// valeur importée d'un classeur peut refermer l'attribut pour en ouvrir un
// autre. On sérialise en littéral JavaScript, puis on échappe pour l'attribut.
function escArg(v) {
  return esc(JSON.stringify(String(v ?? '')));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function searchInputHtml(ph) {
  return `<div class="cfg-search-wrap">${icon('search', 14)}<input class="shell-input cfg-search-input" type="search" placeholder="${esc(ph || 'Rechercher...')}" oninput="filterScope(this)"></div>`;
}

function exportBar(coll, title, pdfFn) {
  const pdf = pdfFn || `exportPdf('${esc(title)}')`;
  return `
    <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="${pdf}" title="Exporter PDF">${icon('fileText', 13)} Exporter PDF</button>
    <a class="shell-btn shell-btn-primary shell-btn-sm" href="/api/referentiels/${coll}/export" title="Exporter Excel">${icon('download', 13)} Exporter Excel</a>
    <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openImportModal('${coll}','${esc(title)}')" title="Importer">${icon('layers', 13)} Importer</button>`;
}

function pdfWindow(title, bodyHtml) {
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:18px;color:#111}h2,h3{color:#1a365d}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}th,td{border:1px solid #ccc;padding:5px 7px;font-size:11px;text-align:left}
    th{background:#eef2f7}.actions-cell,button,input,.shell-btn-icon{display:none!important}</style></head>
    <body><h2>${esc(title)}</h2>${bodyHtml}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

window.exportPdf = function (title) {
  const scope = document.querySelector('.cfg-content') || document.getElementById('mainView');
  const tables = [...scope.querySelectorAll('.shell-table-container')].map((c) => c.outerHTML).join('');
  pdfWindow(title, `<div>${tables}</div>`);
};

// PDF Activités supervisées : construit 4 tables depuis les référentiels
window.exportPdfActivites = function () {
  const table = (heading, cols, rows) => `
    <h3>${esc(heading)}</h3>
    <table><thead><tr>${cols.map((c) => `<th>${esc(c[1])}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(c[2] ? c[2](r) : (r[c[0]] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const domCode = (id) => refLabel('domaines', id, 'code');
  const secCode = (id) => refLabel('secteurs', id, 'code');
  const body =
    table(tr('Domaines'), [['code', tr('Code')], ['nom', tr('Nom')], ['description', tr('Description')], ['statut', tr('Statut')]], REFS.domaines || []) +
    table(tr('Secteurs'), [['code', tr('Code')], ['nom', tr('Nom')], ['domaine_id', tr('Domaine'), (r) => domCode(r.domaine_id)], ['csn', tr('Cycle (mois)')], ['statut', tr('Statut')]], REFS.secteurs || []) +
    table(tr('Sous-activités'), [['code', tr('Code')], ['nom', tr('Nom')], ['secteur_id', tr('Secteur'), (r) => secCode(r.secteur_id)]], REFS.sous_activites || []) +
    table(tr('Thèmes de supervision'), [['code', tr('Code')], ['libelle', tr('Libellé')], ['domaine_id', tr('Domaine'), (r) => domCode(r.domaine_id)], ['secteur_id', tr('Secteur'), (r) => secCode(r.secteur_id)], ['statut', tr('Statut')]], REFS.themes_supervision || []);
  pdfWindow(tr('Domaines / Secteurs / Sous-activités / Thèmes'), body);
};

window.openImportModal = function (coll, title) {
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:460px;">
      <div class="shell-modal-header"><h3>Importer Excel — ${esc(title)}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeRefModal()">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:.75rem;">1. Téléchargez le modèle, renseignez-le, puis importez-le (.xlsx).</p>
        <a class="shell-btn shell-btn-outline" href="/api/referentiels/${coll}/template" style="margin-bottom:1rem;">${icon('download', 14)} Télécharger le modèle (.xlsx)</a>
        <div class="shell-form-group">
          <label>Fichier renseigné (.xlsx)</label>
          <input class="shell-input" type="file" id="importFile" accept=".xlsx">
        </div>
        <div id="importResult" style="font-size:.8rem;margin-top:.6rem;"></div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="doImport('${coll}')">${icon('layers', 14)} Importer</button>
      </div>
    </div>
  </div>`;
};

window.doImport = function (coll) {
  const file = document.getElementById('importFile').files[0];
  if (!file) return showToast('Sélectionnez un fichier .xlsx.', 'warning');
  const reader = new FileReader();
  reader.onload = async () => {
    const res = await api(`/api/referentiels/${coll}/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileB64: reader.result }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const errs = d.errors || [];
      const msg = `${d.added || 0} ajout(s), ${d.updated || 0} mise(s) à jour`
        + (errs.length ? ` — ${errs.length} ligne(s) ignorée(s)` : '');
      showToast(msg, errs.length ? 'warning' : 'success', errs.length ? 8000 : 4000);
      if (errs.length) console.warn('Import — lignes ignorées :\n' + errs.join('\n'));
      closeRefModal();
      await loadRefs();
      renderConfig();
    } else showToast(d.error === 'parse_error' ? 'Fichier illisible.' : 'Erreur import.', 'error');
  };
  reader.readAsDataURL(file);
};

// Filtre client : tables, accordéons (domaines), groupes (exigences)
window.filterScope = function (inp) {
  const q = inp.value.trim().toLowerCase();
  const scope = inp.closest('.cfg-content') || document.getElementById('mainView');
  const groups = scope.querySelectorAll('.exig-group');
  if (groups.length) {
    groups.forEach((g) => {
      const m = !q || g.textContent.toLowerCase().includes(q);
      g.style.display = m ? '' : 'none';
      if (m && q) g.classList.remove('collapsed');
    });
    return;
  }
  const accItems = scope.querySelectorAll('.cfg-accordion > .cfg-acc-item');
  if (accItems.length) {
    accItems.forEach((it) => { it.style.display = !q || it.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    return;
  }
  scope.querySelectorAll('tbody tr').forEach((tr) => {
    if (tr.classList.contains('pers-detail-row')) return;
    tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};


// Retour d'action : le panneau du socle, commun au portail et aux modules.
// Si la feuille commune n'est pas chargée, le message part en console plutôt
// que d'interrompre le geste qui l'a produit.
function showToast(message, type = 'success', duration = 4000) {
  if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
  return window.oasisToast(message, type, duration);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(CURRENT_LANG) + ' ' + d.toLocaleTimeString(CURRENT_LANG, { hour: '2-digit', minute: '2-digit' });
}

async function loadRefs() {
  const res = await api('/api/referentiels');
  REFS = await res.json();
}

// ══════════ Accueil ══════════

async function renderHome() {
  const [statsRes, modulesRes] = await Promise.all([api('/api/stats'), api('/api/modules')]);
  const stats = await statsRes.json();
  const modules = await modulesRes.json();

  // Chaque module d'un même thème porte sa propre teinte : les quatre cartes
  // de « Surveillance et inspections » se distinguent au premier regard.
  const card = (m) => {
    const color = COULEURS_MODULE[m.code] || PRIO_COLORS[m.priority] || '#64748b';
    const name = m.name[CURRENT_LANG] || m.name.fr;
    const desc = m.desc[CURRENT_LANG] || m.desc.fr;
    // La carte ne porte ni priorité, ni état d'activation, ni point du TdR :
    // ce sont des informations de feuille de route, pas d'usage.
    return `
    <div class="portal-card" style="--module-color:${color};" data-module="${esc(m.code)}" data-enabled="true">
      <div class="portal-card-icon-wrap">${moduleIcon(m.code, 26)}</div>
      <div class="portal-card-title">${esc(name)}</div>
      <div class="portal-card-desc">${esc(desc)}</div>
    </div>`;
  };

  // L'ordre des cartes est celui de config/modules.json : la feuille de route
  // range les modules dans l'ordre où ils s'enchaînent métier. Trier sur le
  // numéro de TdR le défaisait — D.8 y passait après D.7.2.
  const rang = new Map(modules.map((m, i) => [m.code, i]));
  const groups = THEMES_ORDER.map((th) => {
    const mods = modules
      // Un module non activé n'a rien à montrer : sa carte ne s'affiche pas.
      .filter((m) => m.theme === th.code && m.enabled)
      .sort((a, b) => rang.get(a.code) - rang.get(b.code));
    if (!mods.length) return '';
    return `
    <div class="portal-group">
      <div class="portal-group-header">
        ${th.icon ? `<span class="group-icon">${icon(th.icon, 18)}</span>` : ''}
        ${esc(t('theme_' + th.code))}
        <span class="group-count">${mods.length}</span>
      </div>
      <div class="portal-grid">${mods.map(card).join('')}</div>
    </div>`;
  }).join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-titleblock">
      <div class="portal-titleblock-sigle">
        <span class="tb-word"><span class="tb-o">O</span>ASIS
        </span>
        <span class="tb-flight" aria-hidden="true">
          <span class="tb-trail"></span>
          <span class="tb-plane">
            <svg viewBox="-32 -32 64 64" fill="currentColor"><g transform="rotate(90)"><path d="M0 -28 C4.5 -28 7 -19 7 -10 L28 4 V11 L7 2 V15 L13 21 V26 L0 21 L-13 26 V21 L-7 15 V2 L-28 11 V4 L-7 -10 C-7 -19 -4.5 -28 0 -28 Z"/></g></svg>
          </span>
        </span>
      </div>
      <div class="portal-titleblock-sub">
        <span class="tb-tower" aria-hidden="true">
          <svg viewBox="0 0 40 133" fill="currentColor">
            <path d="M13 133 L27 133 L24.5 62 L15.5 62 Z"/>
            <rect x="10.5" y="55.5" width="19" height="6.5" rx="2"/>
            <path d="M5 55.5 L35 55.5 L30.5 34 L9.5 34 Z"/>
            <path d="M11.5 51 L28.5 51 L26.3 38.5 L13.7 38.5 Z" fill="var(--bg)"/>
            <rect x="19.4" y="38.5" width="1.2" height="12.5"/>
            <rect x="1.5" y="26" width="37" height="8" rx="2"/>
            <rect x="19" y="8" width="2" height="18"/>
            <circle class="tb-tower-beacon" cx="20" cy="5.5" r="3.2"/>
          </svg>
        </span>
        <span class="tb-fullname">${OASIS_FULLNAME_HTML}</span>
      </div>
    </div>
    <div class="portal-page-header">
      <div class="portal-viewmode">
        <button class="portal-viewmode-btn ${MODULES_VIEW === 'grid' ? 'active' : ''}"
                onclick="setModulesView('grid')" title="${esc(t('view_grid'))}">${icon('grid', 16)}</button>
        <button class="portal-viewmode-btn ${MODULES_VIEW === 'list' ? 'active' : ''}"
                onclick="setModulesView('list')" title="${esc(t('view_list'))}">${icon('list', 16)}</button>
      </div>
    </div>
    <div class="portal-modules ${MODULES_VIEW === 'list' ? 'list-view' : ''}" id="portalModules">${groups}</div>`;


  document.querySelectorAll('.portal-card[data-module]').forEach((cardEl) => {
      cardEl.addEventListener('click', async () => {
      const enabled = cardEl.dataset.enabled === 'true';
      const code = cardEl.dataset.module;
      // Le registre des modules peut ne pas avoir encore été chargé (session
      // ouverte après le script) : on le redemande avant de renoncer.
      if (enabled && !VIEWS[`mod_${code}`] && typeof moduleHostRegisterViews === 'function') {
        await moduleHostRegisterViews(true);
      }
      if (enabled && VIEWS[`mod_${code}`]) { navigate(`mod_${code}`); return; }
      showToast(enabled ? t('mod_toast_enabled') : t('mod_toast_disabled'), enabled ? 'success' : 'warning');
    });
  });
}

// ══════════ Utilisateurs ══════════

const USER_TABS = [
  { id: 'SUPERADMIN', label: 'SuperAdmin', icon: 'shield' },
  { id: 'ADMIN', label: 'Admin AAC', icon: 'userCheck' },
  { id: 'ADMIN_PRESTATAIRE', label: 'Admin Prestataires', icon: 'userCheck' },
  { id: 'AAC', label: 'Utilisateurs AAC', icon: 'users' },
  { id: 'PRESTATAIRE', label: 'Utilisateurs Prestataires', icon: 'briefcase' },
  { id: 'INDEPENDANT', label: 'Utilisateurs Indépendants', icon: 'userPlus' },
];
const PRESTA_TABS = ['ADMIN_PRESTATAIRE', 'PRESTATAIRE'];


let USER_TAB = 'SUPERADMIN';
let USER_COLLAPSED = false;

window.setUserTab = function (id) {
  USER_TAB = id;
  renderUsers();
};

window.toggleUserSidebar = function () {
  USER_COLLAPSED = !USER_COLLAPSED;
  renderUsers();
};

function userRole(u) {
  return u.role === 'INSPECTEUR' ? 'AAC' : u.role;
}

function splitName(u) {
  if (u.nom || u.prenom) return { nom: u.nom || '', prenom: u.prenom || '' };
  const parts = String(u.fullName || '').trim().split(/\s+/);
  return { nom: parts[0] || '', prenom: parts.slice(1).join(' ') };
}

let ALL_MODULES = [];
async function renderUsers() {
  const [res, modRes] = await Promise.all([api('/api/users'), api('/api/modules')]);
  const allUsers = await res.json();
  ALL_MODULES = await modRes.json();
  if (!Object.keys(REFS).length) await loadRefs();
  const isPresta = PRESTA_TABS.includes(USER_TAB);
  const prestataires = REFS.prestataires || [];
  const prestaName = (id) => { const p = prestataires.find((x) => x.id === id); return p ? p.nom : ''; };
  const counts = Object.fromEntries(USER_TABS.map((tb) => [tb.id, allUsers.filter((u) => userRole(u) === tb.id).length]));
  const users = allUsers.filter((u) => userRole(u) === USER_TAB);
  const sidebarItems = USER_TABS.map(
    (tb) => `<button class="cfg-sidebar-item ${USER_TAB === tb.id ? 'active' : ''}" onclick="setUserTab('${tb.id}')" title="${esc(tb.label)}">
      <span class="cfg-sidebar-icon">${icon(tb.icon, 17)}</span>
      <span class="cfg-sidebar-label">${esc(tb.label)}</span>
    </button>`
  ).join('');
  const isSuper = ME.user.role === 'SUPERADMIN';
  const rows = users
    .map((u) => {
      const nm = splitName(u);
      const badges = [];
      badges.push(u.active ? `<span class="shell-badge badge-active">${esc(t('status_active'))}</span>` : `<span class="shell-badge badge-inactive">${esc(t('status_inactive'))}</span>`);
      if (u.locked) badges.push(`<span class="shell-badge badge-inactive">${esc(t('status_locked'))}</span>`);
      if (u.mustChange) badges.push(`<span class="shell-badge badge-neutral">${esc(t('status_mustchange'))}</span>`);
      const nbMods = Array.isArray(u.modules) ? u.modules.length : 0;
      const modCell = isSuper
        ? `<button class="shell-btn shell-btn-sm shell-btn-outline" data-modules="${esc(u.username)}">${icon('grid', 13)} ${nbMods}/${ALL_MODULES.length}</button>`
        : `<span class="shell-badge badge-neutral">${nbMods} module(s)</span>`;
      const actions = [];
      if (USER_TAB === 'AAC') {
        const already = (REFS.inspecteurs || []).some((p) => (p.email || '').toLowerCase() === (u.email || u.username).toLowerCase());
        actions.push(`<button class="shell-btn-icon" data-topersonnel="${esc(u.username)}" title="${already ? 'Déjà dans le Personnel AAC' : 'Générer dans le Personnel AAC'}" ${already ? 'disabled style="opacity:.4;cursor:default;"' : ''}>${icon('userPlus', 15)}</button>`);
      }
      if (isSuper) actions.push(`<button class="shell-btn-icon" data-edit="${esc(u.username)}" title="Modifier">${icon('edit', 15)}</button>`);
      if (u.locked) actions.push(`<button class="shell-btn-icon" data-action="unlock" data-user="${esc(u.username)}" title="${esc(t('action_unlock'))}">${icon('unlock', 15)}</button>`);
      const canToggle = u.username !== ME.user.username && !(ME.user.role === 'ADMIN' && (u.role === 'ADMIN' || u.role === 'SUPERADMIN'));
      if (canToggle) actions.push(`<button class="shell-btn-icon" data-action="toggle-active" data-user="${esc(u.username)}" title="Activer/Désactiver">${icon('power', 15)}</button>`);
      actions.push(`<button class="shell-btn-icon" data-action="reset-password" data-user="${esc(u.username)}" title="Réinitialiser le mot de passe">${icon('key', 15)}</button>`);
      let prestaCell = '';
      if (isPresta) {
        prestaCell = isSuper
          ? `<td><select class="shell-input shell-input-sm" data-presta="${esc(u.username)}"><option value="">—</option>${prestataires.map((p) => `<option value="${esc(p.id)}" ${u.prestataire_id === p.id ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}</select></td>`
          : `<td>${esc(prestaName(u.prestataire_id)) || '<span style="color:var(--text-muted);">—</span>'}</td>`;
      }
      // L'onglet SuperAdmin dit la portée de chacun, et l'instance qu'un
      // national administre : c'est ce qui les distingue.
      const porteeCell = USER_TAB === 'SUPERADMIN'
        ? `<td><span class="shell-badge ${porteeDe(u) === 'regionale' ? 'badge-active' : 'badge-neutral'}">${esc(PORTEE_LABELS[porteeDe(u)])}</span>${
          porteeDe(u) === 'nationale' ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:.15rem;">${esc(u.instance || ME.instance.etat)}</div>` : ''}</td>`
        : '';
      return `
      <tr class="${u.active ? '' : 'row-inactive'}">
        <td>${esc(nm.nom)}</td>
        <td>${esc(nm.prenom) || '<span style="color:var(--text-muted);">—</span>'}</td>
        <td><strong>${esc(u.email || u.username)}</strong></td>
        ${porteeCell}
        ${prestaCell}
        <td>${modCell}</td>
        <td>${badges.join(' ')}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td class="actions-cell">${actions.join('')}</td>
      </tr>`;
    })
    .join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-page-header">
      <h2>${esc(t('users_title'))}</h2>
      <div class="portal-page-actions">
        <button class="shell-btn shell-btn-primary" id="newUserBtn">${icon('userPlus', 15)} ${esc(t('users_new'))}</button>
      </div>
    </div>
    <div class="cfg-layout users-layout">
      <div class="cfg-sidebar ${USER_COLLAPSED ? 'collapsed' : ''}">
        <button class="cfg-sidebar-toggle" onclick="toggleUserSidebar()">${USER_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
        ${sidebarItems}
      </div>
      <div class="cfg-content">
        <div class="portal-page-header">
          <h3>${esc(USER_TABS.find((tb) => tb.id === USER_TAB).label)} <span class="shell-badge badge-neutral">${counts[USER_TAB]} utilisateur(s)</span></h3>
          <div class="portal-page-actions">${searchInputHtml('Rechercher un utilisateur...')}</div>
        </div>
        <div class="shell-table-container">
          <table class="shell-table">
            <thead><tr>
              <th>Nom</th><th>Prénoms</th><th>Email (identifiant)</th>${USER_TAB === 'SUPERADMIN' ? '<th>Portée</th>' : ''}${isPresta ? '<th>Prestataire</th>' : ''}<th>Accès aux Modules</th>
              <th>${esc(t('users_col_status'))}</th><th>${esc(t('users_col_created'))}</th><th>${esc(t('users_col_actions'))}</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="${7 + (isPresta ? 1 : 0) + (USER_TAB === 'SUPERADMIN' ? 1 : 0)}" style="color:var(--text-muted);">Aucun utilisateur dans cette catégorie.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="userModalRoot"></div>`;

  document.getElementById('newUserBtn').addEventListener('click', showNewUserModal);
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const username = btn.dataset.user;
      if (action === 'reset-password' && !confirm('Générer un nouveau mot de passe temporaire et l\'envoyer par email à l\'utilisateur ?')) return;
      const res = await api(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(action === 'reset-password' ? 'Mot de passe réinitialisé — email envoyé.' : 'OK', 'success');
        renderUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error === 'forbidden_target' ? "Un Admin AAC ne peut pas désactiver un Admin AAC ou un SuperAdmin."
          : data.details ? data.details.join(', ') : 'Erreur';
        showToast(msg, 'error', 4000);
      }
    });
  });
  document.querySelectorAll('[data-presta]').forEach((sel) => sel.addEventListener('change', async () => {
    const res = await api(`/api/users/${encodeURIComponent(sel.dataset.presta)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-prestataire', prestataire_id: sel.value }),
    });
    showToast(res.ok ? 'Prestataire enregistré.' : 'Erreur', res.ok ? 'success' : 'error');
  }));
  document.querySelectorAll('[data-topersonnel]:not([disabled])').forEach((btn) => btn.addEventListener('click', async () => {
    const res = await api(`/api/users/${encodeURIComponent(btn.dataset.topersonnel)}/to-personnel`, { method: 'POST' });
    if (res.ok) { await loadRefs(); showToast('Ajouté à la Liste du personnel de l\'Administration.', 'success'); renderUsers(); }
    else { const d = await res.json().catch(() => ({})); showToast(d.error === 'exists' ? 'Déjà présent dans le Personnel AAC.' : 'Erreur', 'error'); }
  }));
  document.querySelectorAll('[data-modules]').forEach((btn) => btn.addEventListener('click', () => showModulesModal(users.find((u) => u.username === btn.dataset.modules))));
  document.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => showEditUserModal(users.find((u) => u.username === btn.dataset.edit))));
}

function showModulesModal(u) {
  const root = document.getElementById('userModalRoot');
  const cur = new Set(Array.isArray(u.modules) ? u.modules : []);
  const items = ALL_MODULES.map(
    (m) => `<label class="multi-check-item"><input type="checkbox" data-mod="${m.code}" ${cur.has(m.code) ? 'checked' : ''}> ${m.icon} ${esc(m.name.fr || m.code)} <span class="shell-badge badge-neutral">${m.tdr}</span></label>`
  ).join('');
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:520px;">
      <div class="shell-modal-header"><h3>Accès aux modules — ${esc(u.email || u.username)}</h3><button class="shell-btn-icon" onclick="closeUserModal()" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body"><div class="multi-check">${items}</div></div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeUserModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveUserModules('${esc(u.username)}')">${icon('save', 14)} Enregistrer</button>
      </div>
    </div>
  </div>`;
}

window.saveUserModules = async function (username) {
  const modules = [...document.querySelectorAll('#userModalRoot [data-mod]:checked')].map((c) => c.dataset.mod);
  const res = await api(`/api/users/${encodeURIComponent(username)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-modules', modules }),
  });
  if (res.ok) { closeUserModal(); showToast('Accès aux modules enregistré.', 'success'); renderUsers(); }
  else showToast('Erreur', 'error');
};

function showEditUserModal(u) {
  const root = document.getElementById('userModalRoot');
  const nm = splitName(u);
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:560px;">
      <div class="shell-modal-header"><h3>Modifier l'utilisateur</h3><button class="shell-btn-icon" onclick="closeUserModal()" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          <div class="shell-form-group"><label>Nom</label><input class="shell-input" id="euNom" value="${esc(nm.nom)}"></div>
          <div class="shell-form-group"><label>Prénoms</label><input class="shell-input" id="euPrenom" value="${esc(nm.prenom)}"></div>
        </div>
        <div class="shell-form-row">
          ${phoneFieldHtml('euTel', u.telephone)}
          <div class="shell-form-group"><label>Rôle</label>
            <select class="shell-input" id="euRole">${USER_TABS.map((tb) => `<option value="${tb.id}" ${userRole(u) === tb.id ? 'selected' : ''}>${esc(tb.label)}</option>`).join('')}</select>
          </div>
        </div>
        ${porteeFieldsHtml('eu', u)}
        <div class="shell-form-group" style="margin-bottom:.5rem;">
          <label>Email (identifiant de connexion)</label>
          <input class="shell-input" type="email" id="euEmail" value="${esc(u.email || u.username)}">
        </div>
        <div class="shell-form-group" id="euAdminPwdWrap" style="display:none;">
          <label style="color:#dc2626;">Confirmez avec VOTRE mot de passe SuperAdmin (modification de l'identifiant)</label>
          <input class="shell-input" type="password" id="euAdminPwd">
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeUserModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="submitEditUser('${esc(u.username)}')">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
  brancherPortee('eu', document.getElementById('euRole'));
  const orig = (u.email || u.username);
  document.getElementById('euEmail').addEventListener('input', (e) => {
    document.getElementById('euAdminPwdWrap').style.display = e.target.value.trim().toLowerCase() !== orig ? 'block' : 'none';
  });
}

window.submitEditUser = async function (username) {
  const body = {
    action: 'edit',
    nom: document.getElementById('euNom').value.trim(),
    prenom: document.getElementById('euPrenom').value.trim(),
    telephone: phoneFieldValue('euTel'),
    role: document.getElementById('euRole').value,
    portee: document.getElementById('euPortee') ? document.getElementById('euPortee').value : '',
    instance: document.getElementById('euInstance') ? document.getElementById('euInstance').value : '',
    email: document.getElementById('euEmail').value.trim(),
    adminPassword: document.getElementById('euAdminPwd') ? document.getElementById('euAdminPwd').value : '',
  };
  const res = await api(`/api/users/${encodeURIComponent(username)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (res.ok) { closeUserModal(); showToast('Utilisateur modifié.', 'success'); renderUsers(); }
  else {
    const d = await res.json().catch(() => ({}));
    const msg = d.error === 'admin_password' ? 'Mot de passe SuperAdmin incorrect.'
      : d.error === 'exists' ? 'Un compte existe déjà avec cet email.'
      : d.error === 'invalid_email' ? 'Email invalide.'
      : 'Erreur';
    showToast(msg, 'error', 4500);
  }
};

window.closeUserModal = function () { document.getElementById('userModalRoot').innerHTML = ''; };


function showNewUserModal() {
  const root = document.getElementById('userModalRoot');
  root.innerHTML = `
  <div class="shell-modal-overlay" id="newUserOverlay">
    <div class="shell-modal" style="max-width:520px;">
      <div class="shell-modal-header"><h3>${esc(t('users_new'))}</h3><button class="shell-btn-icon" id="closeModal" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          <div class="shell-form-group"><label>Nom</label><input class="shell-input" id="nuNom"></div>
          <div class="shell-form-group"><label>Prénoms</label><input class="shell-input" id="nuPrenom"></div>
        </div>
        <div class="shell-form-group" style="margin-bottom:1rem;">
          <label>Email — sert d'identifiant de connexion</label>
          <input class="shell-input" type="email" id="nuEmail" placeholder="prenom.nom@anac.bj">
        </div>
        <div class="shell-form-group" style="margin-bottom:1rem;">
          <label>${esc(t('users_col_role'))}</label>
          <select class="shell-input" id="nuRole">
            ${USER_TABS.map((tb) => `<option value="${tb.id}" ${tb.id === USER_TAB ? 'selected' : ''}>${esc(tb.label)}</option>`).join('')}
          </select>
        </div>
        ${porteeFieldsHtml('nu', null)}
        <div class="shell-form-group" id="nuPrestaWrap" style="margin-bottom:1rem;${PRESTA_TABS.includes(USER_TAB) ? '' : 'display:none;'}">
          <label>Prestataire de provenance</label>
          <select class="shell-input" id="nuPresta"><option value="">—</option>${(REFS.prestataires || []).map((p) => `<option value="${esc(p.id)}">${esc(p.nom)}</option>`).join('')}</select>
        </div>
        ${ME.user.role === 'SUPERADMIN' ? `
        <div class="shell-form-group" style="margin-bottom:.5rem;">
          <label>Accès aux modules</label>
          <div class="multi-check">${ALL_MODULES.map((m) => `<label class="multi-check-item"><input type="checkbox" data-newmod="${m.code}"> ${m.icon} ${esc(m.name.fr || m.code)}</label>`).join('')}</div>
        </div>` : ''}
        <p style="font-size:.75rem;color:var(--text-muted);">Le mot de passe temporaire est généré automatiquement et envoyé par email à l'utilisateur. Valable 48 h ; à changer à la première connexion.</p>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" id="cancelModal">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" id="createUser">${esc(t('add'))}</button>
      </div>
    </div>
  </div>`;
  const close = () => (root.innerHTML = '');
  document.getElementById('closeModal').addEventListener('click', close);
  document.getElementById('cancelModal').addEventListener('click', close);
  document.getElementById('nuRole').addEventListener('change', (e) => {
    document.getElementById('nuPrestaWrap').style.display = PRESTA_TABS.includes(e.target.value) ? '' : 'none';
  });
  brancherPortee('nu', document.getElementById('nuRole'));
  document.getElementById('createUser').addEventListener('click', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: document.getElementById('nuNom').value.trim(),
        prenom: document.getElementById('nuPrenom').value.trim(),
        email: document.getElementById('nuEmail').value.trim(),
        role: document.getElementById('nuRole').value,
        portee: document.getElementById('nuPortee') ? document.getElementById('nuPortee').value : '',
        instance: document.getElementById('nuInstance') ? document.getElementById('nuInstance').value : '',
        prestataire_id: document.getElementById('nuPresta').value,
        modules: [...document.querySelectorAll('#userModalRoot [data-newmod]:checked')].map((c) => c.dataset.newmod),
      }),
    });
    if (res.ok) {
      close();
      showToast('Utilisateur créé — email d\'identifiants envoyé.', 'success');
      renderUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.details ? 'Mot de passe : ' + data.details.join(', ')
        : data.error === 'exists' ? 'Un compte existe déjà avec cet email.'
        : data.error === 'invalid_email' ? 'Email invalide (il sert d\'identifiant).'
        : 'Erreur';
      showToast(msg, 'error', 4500);
    }
  });
}

// ══════════ Profil personnel ══════════

const ROLE_LABELS = { SUPERADMIN: 'SuperAdmin', ADMIN: 'Admin AAC', ADMIN_PRESTATAIRE: 'Admin Prestataires', AAC: 'Utilisateur AAC', INSPECTEUR: 'Utilisateur AAC', PRESTATAIRE: 'Utilisateur Prestataire', INDEPENDANT: 'Utilisateur Indépendant' };

window.uploadProfilePhoto = function (inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast('Image trop lourde (max 2 Mo).', 'error');
  const reader = new FileReader();
  reader.onload = () => saveProfile({ photo: reader.result });
  reader.readAsDataURL(file);
};

window.removeProfilePhoto = function () {
  if (!confirm('Supprimer la photo de profil ?')) return;
  saveProfile({ photo: '' });
};

async function saveProfile(patch) {
  const res = await api('/api/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    showToast('Profil mis à jour.', 'success');
    await loadMe();
    renderProfile();
  } else showToast('Erreur', 'error');
}

window.saveProfileInfos = function () {
  saveProfile({
    nom: document.getElementById('pfNom').value.trim(),
    prenom: document.getElementById('pfPrenom').value.trim(),
    telephone: phoneFieldValue('pfTel'),
    fonction: document.getElementById('pfFonction').value.trim(),
  });
};

window.submitProfilePassword = async function () {
  const oldPassword = document.getElementById('pfOld').value;
  const newPassword = document.getElementById('pfNew').value;
  const confirmVal = document.getElementById('pfConfirm').value;
  if (!oldPassword) return showToast('Confirmez votre mot de passe actuel.', 'warning');
  if (newPassword !== confirmVal) return showToast('Les deux mots de passe ne correspondent pas.', 'error');
  const res = await api('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (res.ok) {
    showToast('Mot de passe modifié.', 'success');
    ['pfOld', 'pfNew', 'pfConfirm'].forEach((id) => (document.getElementById(id).value = ''));
    await loadMe();
    renderProfile();
  } else {
    const data = await res.json().catch(() => ({}));
    const msg =
      data.error === 'policy' ? 'Mot de passe : ' + (data.details || []).join(', ')
      : data.error === 'reused' ? "Réutilisation d'un ancien mot de passe interdite."
      : data.error === 'wrong_old' ? 'Mot de passe actuel incorrect.'
      : 'Erreur';
    showToast(msg, 'error', 4500);
  }
};

async function renderProfile() {
  const u = ME.user;
  const ex = u.extra || {};
  const nm = splitName(u);
  if (!Object.keys(REFS).length) await loadRefs();
  const prestaNom = (REFS.prestataires || []).find((p) => p.id === u.prestataire_id)?.nom || '';
  const initials = `${(nm.nom || u.username)[0] || ''}${(nm.prenom || '')[0] || ''}`.toUpperCase();
  const photoBox = u.photo
    ? `<img src="${u.photo}" alt="Photo de profil" class="pf-photo-img">`
    : `<div class="pf-photo-initials">${esc(initials)}</div>`;
  const infoRows = [
    ['Identifiant (email)', esc(u.email || u.username)],
    ['Rôle', `<span class="shell-badge badge-neutral">${esc(ROLE_LABELS[u.role] || u.role)}</span>`],
    ['Statut', u.active ? '<span class="shell-badge badge-active">Actif</span>' : '<span class="shell-badge badge-inactive">Inactif</span>'],
    ['Instance', `${esc(ME.instance.etat)} (${esc(ME.instance.codeEtat)})`],
    ['Compte créé le', fmtDate(u.createdAt)],
    ['Mot de passe modifié le', fmtDate(u.passwordChangedAt)],
  ]
    .map((r) => `<tr><td class="aac-info-lbl">${tr(r[0])}</td><td class="aac-info-val">${r[1]}</td></tr>`)
    .join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-page-header"><h2>Mon profil</h2></div>
    <div class="pf-layout">
      <div class="pf-side shell-card">
        <div class="pf-photo-frame">${photoBox}</div>
        <div class="aac-logo-btns" style="margin-top:.6rem;">
          <label class="shell-btn shell-btn-outline aac-logo-iconbtn" title="${u.photo ? 'Changer la photo' : 'Ajouter une photo'}">${cameraIcon()}
            <input type="file" accept="image/*" style="display:none;" onchange="uploadProfilePhoto(this)">
          </label>
          ${u.photo ? `<button class="shell-btn shell-btn-danger aac-logo-iconbtn" onclick="removeProfilePhoto()" title="Supprimer la photo">${icon('trash', 15)}</button>` : ''}
        </div>
        <div class="pf-name">${esc(nm.nom)} ${esc(nm.prenom)}</div>
        <div class="pf-role">${esc(ROLE_LABELS[u.role] || u.role)}</div>
      </div>

      <div class="pf-main pf-compact">
        <div class="shell-card">
          <div class="portal-page-header"><h3>Informations personnelles</h3></div>
          <div class="shell-form-row">
            <div class="shell-form-group"><label>Nom</label><input class="shell-input" id="pfNom" value="${esc(nm.nom)}"></div>
            <div class="shell-form-group"><label>Prénoms</label><input class="shell-input" id="pfPrenom" value="${esc(nm.prenom)}"></div>
          </div>
          <div class="shell-form-row">
            ${phoneFieldHtml('pfTel', u.telephone)}
            <div class="shell-form-group"><label>Fonction</label><input class="shell-input" id="pfFonction" value="${esc(u.fonction || '')}"></div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="saveProfileInfos()">${icon('save', 13)} Enregistrer</button>
          </div>
        </div>

        <div class="shell-card">
          <div class="portal-page-header"><h3>Détails du compte</h3></div>
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
            <div class="shell-form-group"><label>Mot de passe actuel</label><input class="shell-input" type="password" id="pfOld" autocomplete="current-password"></div>
            <div class="shell-form-group"><label>Nouveau mot de passe</label><input class="shell-input" type="password" id="pfNew" autocomplete="new-password"></div>
          </div>
          <div class="shell-form-row">
            <div class="shell-form-group"><label>Confirmer le nouveau mot de passe</label><input class="shell-input" type="password" id="pfConfirm" autocomplete="new-password"></div>
            <div class="shell-form-group" style="align-self:end;"><button class="shell-btn shell-btn-primary shell-btn-sm" onclick="submitProfilePassword()">${icon('key', 13)} Changer le mot de passe</button></div>
          </div>
          <p style="font-size:.72rem;color:var(--text-muted);">12 caractères min. (majuscules, minuscules, chiffres, caractères spéciaux), sans réutilisation.</p>
        </div>
      </div>
    </div>`;
}

function pfExtraSection(key, title, hint, enabled, fields) {
  const inputs = fields
    .map(([id, label, val, readonly]) => `<div class="shell-form-group"><label>${esc(label)}${readonly ? ' <span style="font-size:.65rem;color:var(--text-muted);">(auto)</span>' : ''}</label><input class="shell-input" id="${id}" value="${esc(val || '')}" ${(!enabled || readonly) ? 'disabled' : ''}></div>`)
    .join('');
  return `
    <div class="shell-card ${enabled ? '' : 'pf-section-disabled'}">
      <div class="portal-page-header"><h3>${esc(title)} <span style="font-size:.72rem;font-weight:400;color:var(--text-muted);">${esc(hint)}</span></h3></div>
      ${enabled ? '' : '<p style="font-size:.75rem;color:var(--text-muted);">Section réservée à ce type d\'utilisateur.</p>'}
      <div class="shell-form-row">${inputs}</div>
      ${enabled ? `<div style="display:flex;justify-content:flex-end;"><button class="shell-btn shell-btn-primary shell-btn-sm" onclick="saveProfileExtra('${key}')">${icon('save', 13)} Enregistrer</button></div>` : ''}
    </div>`;
}

window.saveProfileExtra = function (key) {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const extra = key === 'presta'
    ? { poste: g('pxPoste'), service: g('pxService'), adressePro: g('pxAdresse') }
    : { profession: g('ixProfession'), organisation: g('ixOrganisation'), agrement: g('ixAgrement'), adresse: g('ixAdresse') };
  saveProfile({ extra });
};

// ══════════ Journal d'audit ══════════

async function renderAudit() {
  const [entriesRes, verifyRes] = await Promise.all([api('/api/audit'), api('/api/audit/verify')]);
  const entries = await entriesRes.json();
  const verify = await verifyRes.json();

  const verifyBanner = verify.valid
    ? `<span class="shell-badge badge-active">${esc(t('audit_ok'))} (${verify.total})</span>`
    : `<span class="shell-badge badge-inactive">${esc(t('audit_broken'))} #${verify.brokenAt}</span>`;

  const rows = entries
    .map(
      (e) => `
      <tr>
        <td>${e.id}</td>
        <td style="white-space:nowrap;">${fmtDate(e.ts)}</td>
        <td><strong>${esc(e.user)}</strong></td>
        <td><span class="shell-badge badge-neutral">${esc(e.action)}</span></td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;">${esc(JSON.stringify(e.details))}</td>
        <td style="font-family:monospace;font-size:.68rem;color:var(--text-muted);">${esc(e.hash.slice(0, 12))}…</td>
      </tr>`
    )
    .join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-page-header">
      <h2>${esc(t('audit_title'))}</h2>
      <div class="portal-page-actions">
        ${verifyBanner}
        <button class="shell-btn shell-btn-outline" id="verifyBtn">${icon('link', 14)} ${esc(t('audit_verify'))}</button>
      </div>
    </div>
    <div class="shell-table-container">
      <table class="shell-table shell-table-compact">
        <thead><tr>
          <th>${esc(t('audit_col_id'))}</th><th>${esc(t('audit_col_ts'))}</th><th>${esc(t('audit_col_user'))}</th>
          <th>${esc(t('audit_col_action'))}</th><th>${esc(t('audit_col_details'))}</th><th>${esc(t('audit_col_hash'))}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  document.getElementById('verifyBtn').addEventListener('click', async () => {
    const res = await api('/api/audit/verify');
    const v = await res.json();
    showToast(v.valid ? `${t('audit_ok')} — ${v.total} entrées` : `${t('audit_broken')} #${v.brokenAt}`, v.valid ? 'success' : 'error', 4000);
  });
}

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


// ── Schémas des référentiels (CRUD générique) ──
function domaineOptions() {
  return (REFS.domaines || []).map((d) => ({ v: d.id, t: `${d.code} — ${d.nom}` }));
}
function secteurOptions() {
  return (REFS.secteurs || []).map((s) => ({ v: s.id, t: `${s.code} — ${s.nom}` }));
}
function refLabel(coll, id, field) {
  const rec = (REFS[coll] || []).find((r) => r.id === id);
  return rec ? rec[field] : id || '—';
}
const STATUT_FIELD = { k: 'statut', l: 'Statut', type: 'select', options: () => [{ v: 'actif', t: 'Actif' }, { v: 'inactif', t: 'Inactif' }] };

// ── Visibilité par instance ──
// La taxinomie de la surveillance est commune à l'Union, mais tout n'est pas
// offert partout : un domaine, un secteur, une sous-activité ou un thème peut
// n'être proposé qu'à certains États. Rien de coché vaut « toutes les
// instances » — c'est le cas par défaut, et le plus fréquent.
//
// Le champ n'a de sens que pour qui dispose de la liste des instances, c'est-
// à-dire le super-administrateur de l'Union : ailleurs, il ne s'affiche pas.
const instanceOptions = () => (((ME.instance_vue || {}).instances) || [])
  .map((e) => ({ v: e, t: e }));

const VISIBILITE_FIELD = {
  k: 'visibilite',
  l: 'Visible par les instances',
  type: 'multiselect',
  options: instanceOptions,
  only: () => instanceOptions().length > 0,
  resolve: (v) => (Array.isArray(v) && v.length ? v.join(', ') : 'Toutes'),
};

// Champs d'un schéma que le compte courant doit voir.
const champsVisibles = (schema) => (schema.fields || []).filter((f) => !f.only || f.only());
function personnelOptions() {
  return (REFS.inspecteurs || []).map((p) => ({ v: p.id, t: `${p.nom || ''} ${p.prenom || ''}`.trim() || p.numero_inspecteur || p.id }));
}
function personnelName(id) {
  const p = (REFS.inspecteurs || []).find((x) => x.id === id);
  return p ? `${p.nom || ''} ${p.prenom || ''}`.trim() : id;
}

const REF_SCHEMAS = {
  organisation_levels: {
    title: 'Niveaux hiérarchiques',
    fields: [
      { k: 'type', l: 'Type de niveau' },
      { k: 'ordre', l: 'Ordre', type: 'number' },
    ],
  },
  organisation: {
    title: 'Entités organisationnelles',
    fields: [
      { k: 'type', l: 'Niveau', type: 'select', options: () => (REFS.organisation_levels || []).sort((a, b) => a.ordre - b.ordre).map((lv) => ({ v: lv.type, t: lv.type })) },
      { k: 'sigle', l: 'Sigle' },
      { k: 'libelle', l: 'Libellé' },
      { k: 'poste', l: 'Poste' },
      { k: 'titulaire_id', l: 'Titulaire', type: 'select', allowEmpty: true, options: personnelOptions, resolve: (v) => (v ? personnelName(v) : '—') },
      { k: 'interim_id', l: 'Intérimaire', type: 'select', allowEmpty: true, options: personnelOptions, resolve: (v) => (v ? personnelName(v) : '—') },
      { k: 'parent_id', l: 'Rattachement', type: 'select', allowEmpty: true, options: () => (REFS.organisation || []).map((o) => ({ v: o.id, t: `${o.sigle} — ${o.libelle}` })), resolve: (v) => (v ? refLabel('organisation', v, 'sigle') : '—') },
      { k: 'ordre', l: 'Ordre', type: 'number' },
    ],
  },
  domaines: {
    title: 'Domaines',
    fields: [{ k: 'code', l: 'Code' }, { k: 'nom', l: 'Nom' }, { k: 'description', l: 'Description' }, STATUT_FIELD, VISIBILITE_FIELD],
  },
  secteurs: {
    title: 'Secteurs',
    fields: [
      { k: 'code', l: 'Code' },
      { k: 'nom', l: 'Nom' },
      { k: 'domaine_id', l: 'Domaine', type: 'select', options: domaineOptions, resolve: (v) => refLabel('domaines', v, 'code') },
      { k: 'csn', l: 'Cycle (mois)', type: 'number' },
      STATUT_FIELD,
      VISIBILITE_FIELD,
    ],
  },
  sous_activites: {
    title: 'Sous-activités',
    fields: [
      { k: 'code', l: 'Code' },
      { k: 'nom', l: 'Nom' },
      { k: 'secteur_id', l: 'Secteur', type: 'select', options: secteurOptions, resolve: (v) => refLabel('secteurs', v, 'code') },
      VISIBILITE_FIELD,
    ],
  },
  themes_supervision: {
    title: 'Thèmes de supervision',
    fields: [
      { k: 'code', l: 'Code' },
      { k: 'libelle', l: 'Libellé' },
      { k: 'domaine_id', l: 'Domaine', type: 'select', allowEmpty: true, options: domaineOptions, resolve: (v) => refLabel('domaines', v, 'code') },
      { k: 'secteur_id', l: 'Secteur', type: 'select', allowEmpty: true, options: secteurOptions, resolve: (v) => refLabel('secteurs', v, 'code') },
      { k: 'sous_activite_id', l: 'Sous-activité', type: 'select', allowEmpty: true, options: () => (REFS.sous_activites || []).map((x) => ({ v: x.id, t: `${x.code} — ${x.nom}` })), resolve: (v) => (v ? refLabel('sous_activites', v, 'code') : '—') },
      { k: 'description', l: 'Description' },
      STATUT_FIELD,
      VISIBILITE_FIELD,
    ],
  },
  exigences: {
    title: 'Liste des exigences',
    fields: [
      { k: 'reglement', l: 'Règlement' },
      { k: 'date_adoption', l: "Date d'adoption", type: 'date' },
      { k: 'reference', l: 'Référence' },
      { k: 'libelle', l: 'Libellé' },
      STATUT_FIELD,
    ],
  },
  prestataires: {
    title: 'Prestataires de services',
    fields: [
      { k: 'nom', l: 'Nom' },
      { k: 'trigramme', l: 'Trigramme' },
      { k: 'domaine_id', l: 'Domaine', type: 'select', allowEmpty: true, options: domaineOptions, resolve: (v) => refLabel('domaines', v, 'code') },
      { k: 'secteur_id', l: 'Secteur', type: 'select', allowEmpty: true, options: secteurOptions, resolve: (v) => refLabel('secteurs', v, 'code') },
      { k: 'dirigeant', l: 'Dirigeant' },
      { k: 'point_focal', l: 'Point focal' },
      { k: 'email_prestataire', l: 'Email' },
      { k: 'ref_agrement', l: 'Réf. agrément' },
      STATUT_FIELD,
    ],
  },
  inspecteurs: {
    title: "Liste du personnel de l'Administration",
    fields: [
      { k: 'ref_personnel', l: 'Réf Personnel' },
      { k: 'nom', l: 'Nom' },
      { k: 'prenom', l: 'Prénom' },
      { k: 'email', l: 'Email' },
      { k: 'est_inspecteur', l: 'Inspecteur ?', type: 'select', options: () => [{ v: 'non', t: 'Non' }, { v: 'oui', t: 'Oui' }] },
      { k: 'numero_inspecteur', l: 'N° inspecteur', inspectorOnly: true },
      { k: 'domaines', l: 'Domaines', type: 'multiselect', inspectorOnly: true, options: domaineOptions, itemLabel: (v) => refLabel('domaines', v, 'code') },
      { k: 'specialites', l: 'Spécialités', type: 'multiselect', inspectorOnly: true, options: () => (REFS.specialites_inspecteur || []).filter((s) => s.statut !== 'inactif').map((s) => ({ v: s.id, t: s.libelle })), itemLabel: (v) => refLabel('specialites_inspecteur', v, 'libelle') },
      { k: 'niveau_qualification', l: 'Niveau de qualification', inspectorOnly: true, type: 'select', allowEmpty: true, options: () => (REFS.niveaux_qualifications || []).sort((a, b) => a.ordre - b.ordre).map((n) => ({ v: n.libelle, t: n.libelle })) },
      STATUT_FIELD,
    ],
  },
  specialites_inspecteur: {
    title: "Spécialités d'inspecteur",
    fields: [
      { k: 'libelle', l: 'Spécialité' },
      { k: 'domaines', l: 'Domaines', type: 'multiselect', options: domaineOptions, itemLabel: (v) => refLabel('domaines', v, 'code') },
      STATUT_FIELD,
    ],
  },
  types_supervision: {
    title: 'Types de supervision',
    fields: [
      { k: 'type_supervision', l: 'Type' },
      { k: 'description', l: 'Description' },
      { k: 'duree_standard', l: 'Durée standard (j)', type: 'number' },
      STATUT_FIELD,
    ],
  },
  modes_supervision: {
    title: 'Modes de supervision',
    fields: [{ k: 'mode', l: 'Mode' }, { k: 'description', l: 'Description' }, STATUT_FIELD],
  },
  niveaux_qualifications: {
    title: 'Niveaux de qualification',
    fields: [{ k: 'libelle', l: 'Libellé' }, { k: 'ordre', l: 'Ordre', type: 'number' }, STATUT_FIELD],
  },
};

function fieldValue(field, record) {
  const raw = record[field.k];
  if (field.inspectorOnly && record.est_inspecteur !== 'oui') return '<span style="color:var(--text-muted);">—</span>';
  if (field.type === 'multiselect') {
    const arr = Array.isArray(raw) ? raw : [];
    if (!arr.length) return '<span style="color:var(--text-muted);">—</span>';
    return arr.map((v) => `<span class="shell-badge badge-neutral">${esc(field.itemLabel ? field.itemLabel(v) : v)}</span>`).join(' ');
  }
  if (field.resolve) return field.resolve(raw);
  if (field.k === 'est_inspecteur') {
    return raw === 'oui'
      ? '<span class="shell-badge badge-active">Inspecteur</span>'
      : '<span class="shell-badge badge-neutral">Non</span>';
  }
  if (field.k === 'statut') {
    return raw === 'inactif'
      ? `<span class="shell-badge badge-inactive">Inactif</span>`
      : `<span class="shell-badge badge-active">Actif</span>`;
  }
  return esc(raw ?? '—');
}

function refTable(coll) {
  const schema = REF_SCHEMAS[coll];
  const rows = (REFS[coll] || [])
    .map(
      (r) => `
    <tr>
      ${champsVisibles(schema).map((f) => `<td>${fieldValue(f, r)}</td>`).join('')}
      <td class="actions-cell">
        <button class="shell-btn-icon" onclick="openRefModal('${coll}','${r.id}')" title="${esc(t('edit'))}">${icon('edit', 15)}</button>
        <button class="shell-btn-icon" onclick="deleteRef('${coll}','${r.id}')" title="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
      </td>
    </tr>`
    )
    .join('');
  return `
  <div class="portal-page-header" style="margin-top:1.25rem;">
    <h3>${esc(tr(schema.title))}</h3>
    <div class="portal-page-actions">
      ${coll === 'prestataires' ? searchInputHtml('Rechercher un prestataire...') + exportBar('prestataires', tr('Prestataires de services')) : ''}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('${coll}')">${icon('plus', 13)} ${esc(t('add'))}</button>
    </div>
  </div>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr>${champsVisibles(schema).map((f) => `<th>${esc(tr(f.l))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="${champsVisibles(schema).length + 1}" style="color:var(--text-muted);">Aucun élément.</td></tr>`}</tbody>
    </table>
  </div>`;
}

// Exigences groupées par règlement (bandeaux rétractables ; date d'adoption à droite)
const EXIG_OPEN = new Set(); // vide = tous les bandeaux fermés par défaut
window.toggleExigGroup = function (key) {
  const k = key || '__none__';
  if (EXIG_OPEN.has(k)) EXIG_OPEN.delete(k);
  else EXIG_OPEN.add(k);
  renderConfig();
};

function cfgSectionExigences() {
  const list = REFS.exigences || [];
  const groups = {};
  list.forEach((e) => {
    const key = e.reglement || '';
    (groups[key] = groups[key] || []).push(e);
  });
  const keys = Object.keys(groups).sort((a, b) => (a || 'zzz').localeCompare(b || 'zzz'));
  const blocks = keys
    .map((key) => {
      const items = groups[key];
      const collapsed = !EXIG_OPEN.has(key || '__none__');
      const dateAdoption = (items.find((x) => x.date_adoption) || {}).date_adoption || '';
          const rows = items
        .map(
          (e) => `
        <tr>
          <td><strong>${esc(e.reference || '')}</strong></td>
          <td style="white-space:normal;">${esc(e.libelle || '')}</td>
          <td>${e.statut === 'inactif' ? '<span class="shell-badge badge-inactive">Inactif</span>' : '<span class="shell-badge badge-active">Actif</span>'}</td>
          <td class="actions-cell">
            <button class="shell-btn-icon" onclick="openExigDrawer('${e.id}')" title="${esc(t('edit'))}">${icon('edit', 15)}</button>
            <button class="shell-btn-icon" onclick="deleteRef('exigences','${e.id}')" title="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
          </td>
        </tr>`
        )
        .join('');
      return `
      <div class="exig-group ${collapsed ? 'collapsed' : ''}">
        <div class="exig-banner" onclick="toggleExigGroup(${escArg(key)})">
          <span class="exig-banner-title"><span class="exig-chevron">${icon('chevronRight', 15)}</span>${esc(key || tr('Sans règlement'))} <span class="shell-badge" style="background:rgba(255,255,255,.2);color:#fff;">${items.length}</span></span>
          <span class="exig-banner-right" onclick="event.stopPropagation()">
            <span class="exig-banner-date">${dateAdoption ? `${tr("Date d'adoption")} : ${esc(fmtDay(dateAdoption))}` : ''}</span>
            <button class="shell-btn-icon" style="color:#fff;" onclick="openReglementForm(${escArg(key)})" title="Modifier règlement / date">${icon('edit', 15)}</button>
            <button class="shell-btn-icon" style="color:#fff;" onclick="openExigDrawer(null,${escArg(key)},${escArg(dateAdoption)})" title="Ajouter une exigence">${icon('plus', 15)}</button>
          </span>
        </div>
        <div class="exig-body">
          <div class="shell-table-container">
            <table class="shell-table shell-table-compact exig-table">
              <thead><tr><th>${tr('Référence')}</th><th>${tr('Libellé')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    })
    .join('');
  return `
  <div class="portal-page-header" style="margin-top:1.25rem;">
    <h3>${esc(tr('Liste des exigences'))}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher une exigence / règlement...')}
      ${exportBar('exigences', tr('Liste des exigences'))}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openExigDrawer(null,null,null,true)">${icon('plus', 13)} ${esc(t('add'))}</button>
    </div>
  </div>
  ${blocks || `<p style="color:var(--text-muted);">Aucune exigence.</p>`}
  <div id="exigDrawerRoot"></div>`;
}

// Drawer (panneau latéral droit, ~1/3 écran) — champs Référence, Libellé, Statut
window.openExigDrawer = function (id, presetReglement, presetDate, newGroup) {
  const e = id ? (REFS.exigences || []).find((x) => x.id === id) : null;
  const reglement = e ? e.reglement : (presetReglement || '');
  const date = e ? e.date_adoption : (presetDate || '');
  const showRegFields = !!newGroup; // création d'un nouveau règlement : champs éditables
  const regBlock = showRegFields
    ? `<div class="shell-form-group"><label>${tr('Règlement')}</label><input class="shell-input" id="exReglement" value=""></div>
       <div class="shell-form-group"><label>${tr("Date d'adoption")}</label><input class="shell-input" type="date" id="exDate" value=""></div>`
    : `<div class="exig-reg-readonly">${icon('fileText', 14)} <strong>${esc(reglement || tr('Sans règlement'))}</strong>${date ? ` · ${esc(fmtDay(date))}` : ''}</div>`;
  document.getElementById('exigDrawerRoot').innerHTML = `
  <div class="exig-drawer-overlay" onclick="closeExigDrawer()"></div>
  <div class="exig-drawer">
    <div class="exig-drawer-header"><h3>${id ? tr('Liste des exigences') : (newGroup ? 'Nouveau règlement' : 'Nouvelle exigence')}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeExigDrawer()">${icon('x', 18)}</button></div>
    <div class="exig-drawer-body">
      ${regBlock}
      <div class="shell-form-group"><label>${tr('Référence')}</label><input class="shell-input" id="exReference" value="${esc(e ? e.reference : '')}"></div>
      <div class="shell-form-group"><label>${tr('Libellé')}</label><textarea class="shell-input exig-libelle" id="exLibelle" rows="6">${esc(e ? e.libelle : '')}</textarea></div>
      <div class="shell-form-group"><label>${tr('Statut')}</label>
        <select class="shell-input" id="exStatut"><option value="actif" ${!e || e.statut !== 'inactif' ? 'selected' : ''}>Actif</option><option value="inactif" ${e && e.statut === 'inactif' ? 'selected' : ''}>Inactif</option></select>
      </div>
    </div>
    <div class="exig-drawer-footer">
      <button class="shell-btn shell-btn-outline" onclick="closeExigDrawer()">${esc(t('cancel'))}</button>
      <button class="shell-btn shell-btn-primary" onclick="saveExigDrawer(${escArg(id || '')}, ${showRegFields}, ${escArg(reglement || '')}, ${escArg(date || '')})">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
    </div>
  </div>`;
};

window.closeExigDrawer = function () { const r = document.getElementById('exigDrawerRoot'); if (r) r.innerHTML = ''; };

window.saveExigDrawer = async function (id, showRegFields, reglement, date) {
  const body = {
    reference: document.getElementById('exReference').value.trim(),
    libelle: document.getElementById('exLibelle').value.trim(),
    statut: document.getElementById('exStatut').value,
  };
  if (showRegFields) {
    body.reglement = document.getElementById('exReglement').value.trim();
    body.date_adoption = document.getElementById('exDate').value;
  } else if (!id) {
    body.reglement = reglement;
    body.date_adoption = date;
  }
  const res = await api(id ? `/api/referentiels/exigences/${id}` : '/api/referentiels/exigences', {
    method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (res.ok) { closeExigDrawer(); await loadRefs(); renderConfig(); showToast('OK', 'success'); }
  else showToast('Erreur', 'error');
};

// Formulaire séparé : Règlement + Date d'adoption (s'applique à toutes les exigences du groupe)
window.openReglementForm = function (reglement) {
  const items = (REFS.exigences || []).filter((e) => (e.reglement || '') === reglement);
  const date = (items.find((x) => x.date_adoption) || {}).date_adoption || '';
  document.getElementById('exigDrawerRoot').innerHTML = `
  <div class="shell-modal-overlay" style="left:0;top:0;" onclick="closeExigDrawer()"></div>
  <div class="shell-modal-overlay" style="left:0;top:0;background:none;pointer-events:none;">
    <div class="shell-modal" style="max-width:440px;pointer-events:auto;">
      <div class="shell-modal-header"><h3>${tr('Règlement')} / ${tr("Date d'adoption")}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeExigDrawer()">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-group" style="margin-bottom:.75rem;"><label>${tr('Règlement')}</label><input class="shell-input" id="rgNom" value="${esc(reglement)}"></div>
        <div class="shell-form-group"><label>${tr("Date d'adoption")}</label><input class="shell-input" type="date" id="rgDate" value="${esc(date)}"></div>
        <p style="font-size:.72rem;color:var(--text-muted);margin-top:.5rem;">Appliqué à ${items.length} exigence(s) de ce règlement.</p>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeExigDrawer()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveReglement(${escArg(reglement)})">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
};

window.saveReglement = async function (oldReglement) {
  const nom = document.getElementById('rgNom').value.trim();
  const date = document.getElementById('rgDate').value;
  const items = (REFS.exigences || []).filter((e) => (e.reglement || '') === oldReglement);
  for (const e of items) {
    await api(`/api/referentiels/exigences/${e.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...e, reglement: nom, date_adoption: date }),
    });
  }
  closeExigDrawer(); await loadRefs(); renderConfig(); showToast('Règlement mis à jour.', 'success');
};

function fmtDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString(CURRENT_LANG);
}

// Chaîne de validation d'une personne : de son entité de rattachement jusqu'à la racine
function orgChainFor(personId) {
  const assigns = (REFS.organisation_assignments || []).filter((a) => a.person_id === personId);
  if (!assigns.length) return null;
  const byId = Object.fromEntries((REFS.organisation || []).map((o) => [o.id, o]));
  let node = byId[assigns[0].org_id];
  const chain = [];
  const guard = new Set();
  while (node && !guard.has(node.id)) {
    guard.add(node.id);
    chain.push(node);
    node = node.parent_id ? byId[node.parent_id] : null;
  }
  return chain.length ? chain : null;
}

function circuitHtml(chain) {
  if (!chain) return '<span style="color:var(--text-muted);font-size:.8rem;">Non rattaché à l\'organigramme.</span>';
  return `<div class="pers-circuit">${chain
    .map((n, i) => {
      const color = LEVEL_COLORS[Math.min(i, LEVEL_COLORS.length - 1)];
      const last = i === chain.length - 1;
      const absent = !!n.interim_actif && !!n.interim_id;
      const validateur = absent ? personnelName(n.interim_id) : n.titulaire_id ? personnelName(n.titulaire_id) : n.poste ? 'Poste vacant' : '';
      const sub = (n.poste || validateur)
        ? `<span class="pers-circuit-sub">${esc([n.poste, validateur].filter(Boolean).join(' · '))}${absent ? ' <span class="pers-circuit-interim">intérim</span>' : ''}</span>`
        : '';
      return `<span class="pers-circuit-step" title="${esc(n.libelle)} (${esc(n.type)})${absent ? ' — intérim : ' + esc(personnelName(n.interim_id)) + ', titulaire notifié' : ''}">
          <span class="pers-circuit-sigle" style="border-bottom:2px solid ${color};color:${color};">${esc(n.sigle)}</span>${sub}
        </span>${last ? '' : '<span class="pers-circuit-arrow">→</span>'}`;
    })
    .join('')}</div>`;
}

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
        <td><button class="shell-btn-icon pers-toggle" onclick="togglePers('${r.id}')" title="Détails" style="transform:rotate(${open ? 90 : 0}deg);">${icon('chevronRight', 14)}</button></td>
        ${cells}
        <td class="actions-cell">
          <button class="shell-btn-icon" onclick="openRefModal('${coll}','${r.id}')" title="${esc(t('edit'))}">${icon('edit', 15)}</button>
          <button class="shell-btn-icon" onclick="deleteRef('${coll}','${r.id}')" title="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
        </td>
      </tr>
      <tr class="pers-detail-row" style="${open ? '' : 'display:none;'}">
        <td colspan="${colspan}" style="background:var(--bg);">
          <div class="pers-info-grid">${detailInfo}</div>
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.6rem 0 .4rem;">Circuit de validation — de son niveau au plus haut niveau</div>
          ${circuitHtml(chain)}
        </td>
      </tr>`;
    })
    .join('');
  return `
  <div class="portal-page-header" style="margin-top:1.25rem;">
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
      <tbody>${rows || `<tr><td colspan="${colspan}" style="color:var(--text-muted);">Aucun élément.</td></tr>`}</tbody>
    </table>
  </div>`;
}

window.openRefModal = function (coll, id, defaultsJson) {
  const schema = REF_SCHEMAS[coll];
  let record = {};
  if (id) record = (REFS[coll] || []).find((r) => r.id === id) || {};
  else if (defaultsJson) {
    try { record = JSON.parse(defaultsJson); } catch { record = {}; }
  }
  const root = document.getElementById('cfgModalRoot');
  const isOrg = coll === 'organisation';
  const orgTop = isOrg ? orgTopLevelType() : null;
  const aacRef = (CURRENT_CFG && CURRENT_CFG.aac) || {};
  const orgIsTop = isOrg && record.type === orgTop;
  window.__ORG_AUTO = { top: orgTop, sigle: aacRef.sigle || '', nom: aacRef.nom || '' };
  const inputs = champsVisibles(schema)
    .map((f) => {
      const val = record[f.k] ?? '';
      const wrapCls = f.inspectorOnly ? 'shell-form-group insp-only' : 'shell-form-group';
      let onchange = f.k === 'est_inspecteur' ? ' onchange="toggleInspectorFields()"' : '';
      if (isOrg && f.k === 'type') onchange = ' onchange="orgTypeChanged()"';
      if (isOrg && (f.k === 'sigle' || f.k === 'libelle')) {
        const autoVal = f.k === 'sigle' ? (aacRef.sigle || '') : (aacRef.nom || '');
        const useVal = orgIsTop ? autoVal : val;
        return `
        <div class="shell-form-group" style="margin-bottom:.75rem;">
          <label>${esc(tr(f.l))}</label>
          <input class="shell-input org-${f.k}-input" type="text" data-field="${f.k}" value="${esc(useVal)}" ${orgIsTop ? 'disabled' : ''}>
          <span class="org-auto-note" style="font-size:.7rem;color:var(--text-muted);${orgIsTop ? '' : 'display:none;'}">Repris automatiquement depuis « Détails sur l'Administration ».</span>
        </div>`;
      }
      if (f.type === 'multiselect') {
        const opts = f.options ? f.options() : [];
        const vals = Array.isArray(record[f.k]) ? record[f.k].map(String) : [];
        return `
        <div class="${wrapCls}" style="margin-bottom:.75rem;">
          <label>${esc(tr(f.l))}</label>
          <div class="multi-check">
            ${opts.length
              ? opts.map((o) => `<label class="multi-check-item"><input type="checkbox" data-multi="${f.k}" value="${esc(o.v)}" ${vals.includes(String(o.v)) ? 'checked' : ''}> ${esc(o.t)}</label>`).join('')
              : '<span style="color:var(--text-muted);font-size:.8rem;">Aucune option — voir « Autres configurations ».</span>'}
          </div>
        </div>`;
      }
      if (f.type === 'select') {
        const opts = (f.options ? f.options() : []).filter((o) => !(coll === 'organisation' && f.k === 'parent_id' && o.v === id));
        return `
        <div class="${wrapCls}" style="margin-bottom:.75rem;">
          <label>${esc(tr(f.l))}</label>
          <select class="shell-input" data-field="${f.k}"${onchange}>
            ${f.allowEmpty ? `<option value="">—</option>` : ''}
            ${opts.map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}
          </select>
        </div>`;
      }
      return `
      <div class="${wrapCls}" style="margin-bottom:.75rem;">
        <label>${esc(tr(f.l))}</label>
        <input class="shell-input" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" data-field="${f.k}" value="${esc(val)}">
      </div>`;
    })
    .join('');

  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:560px;">
      <div class="shell-modal-header"><h3>${esc(tr(schema.title))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">${inputs}</div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveRef('${coll}','${id || ''}')">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
  if (coll === 'inspecteurs') toggleInspectorFields();
};

window.toggleInspectorFields = function () {
  const sel = document.querySelector('#cfgModalRoot [data-field="est_inspecteur"]');
  const show = sel && sel.value === 'oui';
  document.querySelectorAll('#cfgModalRoot .insp-only').forEach((el) => {
    el.style.display = show ? '' : 'none';
  });
};

window.closeRefModal = function () {
  document.getElementById('cfgModalRoot').innerHTML = '';
};

window.orgTypeChanged = function () {
  const auto = window.__ORG_AUTO || {};
  const sel = document.querySelector('#cfgModalRoot [data-field="type"]');
  const sigleIn = document.querySelector('#cfgModalRoot .org-sigle-input');
  const libelleIn = document.querySelector('#cfgModalRoot .org-libelle-input');
  const isTop = sel && sel.value === auto.top;
  [ [sigleIn, auto.sigle], [libelleIn, auto.nom] ].forEach(([inp, v]) => {
    if (!inp) return;
    const note = inp.parentElement.querySelector('.org-auto-note');
    if (isTop) {
      inp.value = v || '';
      inp.disabled = true;
      if (note) note.style.display = '';
    } else {
      inp.disabled = false;
      if (note) note.style.display = 'none';
    }
  });
};

window.saveRef = async function (coll, id) {
  const body = {};
  document.querySelectorAll('#cfgModalRoot [data-field]').forEach((input) => {
    body[input.dataset.field] = input.type === 'number' ? Number(input.value) : input.value;
  });
  // Champs multi-valeurs (domaines, spécialités…)
  document.querySelectorAll('#cfgModalRoot [data-multi]').forEach((input) => {
    const k = input.dataset.multi;
    if (!Array.isArray(body[k])) body[k] = [];
    if (input.checked) body[k].push(input.value);
  });
  // Niveau d'ordre 1 : sigle & libellé repris de « Détails sur l'Administration »
  if (coll === 'organisation') {
    const auto = window.__ORG_AUTO || {};
    if (auto.top && body.type === auto.top) {
      if (auto.sigle) body.sigle = auto.sigle;
      if (auto.nom) body.libelle = auto.nom;
    }
  }
  // Registre des titulaires : journalise tout changement de titulaire de poste
  if (coll === 'organisation' && id && body.titulaire_id !== undefined) {
    const old = (REFS.organisation || []).find((o) => o.id === id);
    if (old && body.titulaire_id !== (old.titulaire_id || '')) {
      const registre = Array.isArray(old.registre) ? old.registre.map((e) => ({ ...e })) : [];
      const openTit = [...registre].reverse().find((e) => e.role === 'titulaire' && !e.end);
      if (openTit) openTit.end = new Date().toISOString();
      if (body.titulaire_id) registre.push({ role: 'titulaire', person_id: body.titulaire_id, start: new Date().toISOString(), end: null });
      body.registre = registre;
    }
  }
  const res = await api(id ? `/api/referentiels/${coll}/${id}` : `/api/referentiels/${coll}`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    closeRefModal();
    await loadRefs();
    renderConfig();
    showToast('OK', 'success');
  } else {
    const d = await res.json().catch(() => ({}));
    showToast(
      d.error === 'duplicate_code' ? `Le code « ${body.code || ''} » est déjà utilisé.`
      : d.error === 'code_required' ? 'Le code est obligatoire.'
      : 'Erreur',
      'error', 5000
    );
  }
};

window.deleteRef = async function (coll, id) {
  if (!confirm(t('confirm_delete'))) return;
  const res = await api(`/api/referentiels/${coll}/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadRefs();
    renderConfig();
    showToast('OK', 'success');
  } else showToast('Erreur', 'error');
};

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
    <button class="shell-btn-icon" onclick="openRefModal('${coll}','${id}')" title="${esc(t('edit'))}">${icon('edit', 15)}</button>
    <button class="shell-btn-icon" style="color:#dc2626;" onclick="deleteRef('${coll}','${id}')" title="${esc(t('delete'))}">${icon('trash', 15)}</button>
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
                (saThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">Aucun thème.</p>') +
                  accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, sous_activite_id: x.id, statut: 'actif' }, 'Thème'),
                true
              );
            })
            .join('');
          const directThemes = themes.filter((th) => th.secteur_id === s.id && !th.sous_activite_id);
          const directBlock = `
            <div style="margin-top:.4rem;">
              <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.35rem 0 .25rem;">Thèmes rattachés au secteur</div>
              ${directThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">Aucun thème rattaché directement au secteur.</p>'}
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
        (secteurItems || '<p style="color:var(--text-muted);font-size:.8rem;">Aucun secteur.</p>') +
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
  <div class="portal-page-header">
    <h3>${tr('Domaines / Secteurs / Sous-activités / Thèmes')}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un domaine / secteur...')}
      ${exportBar('activites', tr('Domaines / Secteurs / Sous-activités / Thèmes'), 'exportPdfActivites()')}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('domaines')">${icon('plus', 13)} Domaine</button>
    </div>
  </div>
  <div class="cfg-accordion cfg-acc-dense">${items || '<p style="color:var(--text-muted);">Aucun domaine défini.</p>'}</div>
  ${orphanBlock}`;
}


// ── Sections de configuration ──

let AAC_CFG = null;
let CURRENT_CFG = null;
function cfgSectionAAC(cfg) {
  AAC_CFG = cfg;
  const aac = cfg.aac || {};
  const val = (v) => (v ? esc(v) : '<span style="color:var(--text-muted);">—</span>');
  const langLabel = { fr: 'Français', en: 'English', pt: 'Português' }[cfg.instance.defaultLang] || cfg.instance.defaultLang;
  const logoBox = aac.logo
    ? `<img src="${aac.logo}" alt="Logo AAC" class="aac-logo-preview">`
    : `<div class="aac-logo-empty">${icon('landmark', 30)}<span>Aucun logo</span></div>`;
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
        ${aac.logo ? `<button class="shell-btn shell-btn-danger aac-logo-iconbtn" onclick="removeAacLogo()" title="Supprimer le logo">${icon('trash', 15)}</button>` : ''}
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
      <div class="shell-modal-header"><h3>${esc(t('cfg_aac'))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;">${icon('x', 18)}</button></div>
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
        <div class="shell-form-group"><label>Langue par défaut</label>
          <select class="shell-input" id="aacLang">
            <option value="fr" ${cfg.instance.defaultLang === 'fr' ? 'selected' : ''}>Français</option>
            <option value="en" ${cfg.instance.defaultLang === 'en' ? 'selected' : ''}>English</option>
            <option value="pt" ${cfg.instance.defaultLang === 'pt' ? 'selected' : ''}>Português</option>
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
    showToast(dataUrl ? 'Logo enregistré.' : 'Logo supprimé.', 'success');
    await loadMe();
    renderConfig();
  } else showToast('Erreur (fichier trop volumineux ?)', 'error', 4000);
}

window.uploadAacLogo = function (inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast('Image trop lourde (max 2 Mo).', 'error');
  const reader = new FileReader();
  reader.onload = () => saveAacLogo(reader.result);
  reader.readAsDataURL(file);
};

window.removeAacLogo = function () {
  if (!confirm('Supprimer le logo ?')) return;
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
  } else showToast('Erreur', 'error');
};

let ORG_VIEW = 'list'; // 'list' | 'tree'

window.setOrgView = function (v) {
  ORG_VIEW = v;
  renderConfig();
};

window.orgDragStart = function (ev, personId) {
  ev.dataTransfer.setData('text/plain', personId);
  ev.dataTransfer.effectAllowed = 'move';
};
window.orgAllowDrop = function (ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add('org-drop-hover');
};
window.orgDragLeave = function (ev) {
  ev.currentTarget.classList.remove('org-drop-hover');
};
window.orgDrop = async function (ev, orgId) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('org-drop-hover');
  const personId = ev.dataTransfer.getData('text/plain');
  if (!personId) return;
  const exists = (REFS.organisation_assignments || []).some((a) => a.org_id === orgId && a.person_id === personId);
  if (exists) return showToast('Déjà rattaché.', 'warning');
  const res = await api('/api/referentiels/organisation_assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, person_id: personId, person_type: 'inspecteur' }),
  });
  if (res.ok) {
    await loadRefs();
    renderConfig();
    showToast('Personnel rattaché.', 'success');
  } else showToast('Erreur', 'error');
};
window.openPosteRegistre = function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  if (!node) return;
  const reg = (Array.isArray(node.registre) ? node.registre : []).slice().reverse();
  const rows = reg
    .map((e) => {
      const roleBadge =
        e.role === 'interim'
          ? '<span class="shell-badge" style="background:#fef3c7;color:#92400e;">Intérimaire</span>'
          : '<span class="shell-badge badge-active">Titulaire</span>';
      const fin = e.end ? fmtDate(e.end) : '<span class="shell-badge badge-active">En cours</span>';
      return `<tr><td>${roleBadge}</td><td>${esc(personnelName(e.person_id))}</td><td>${fmtDate(e.start)}</td><td>${fin}</td></tr>`;
    })
    .join('');
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:640px;">
      <div class="shell-modal-header"><h3>Registre — ${esc(node.poste || node.sigle)}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-table-container">
          <table class="shell-table shell-table-compact">
            <thead><tr><th>Rôle</th><th>Personne</th><th>Début (jour / heure)</th><th>Fin (jour / heure)</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" style="color:var(--text-muted);">Aucun enregistrement.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="shell-modal-footer"><button class="shell-btn shell-btn-outline" onclick="closeRefModal()">Fermer</button></div>
    </div>
  </div>`;
};

window.orgStartInterim = function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  if (!node) return;
  const titNom = node.titulaire_id ? personnelName(node.titulaire_id) : null;
  const opts = personnelOptions().filter((o) => o.v !== node.titulaire_id);
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:440px;">
      <div class="shell-modal-header"><h3>Signaler un intérim — ${esc(node.poste || node.sigle)}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">Titulaire : <strong>${esc(titNom || 'Poste vacant')}</strong>. Sélectionnez l'intérimaire qui recevra les demandes de validation.</p>
        <div class="shell-form-group">
          <label>Intérimaire</label>
          <select class="shell-input" id="interimSelect">
            <option value="">— Choisir —</option>
            ${opts.map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="orgConfirmInterim('${nodeId}')">Activer l'intérim</button>
      </div>
    </div>
  </div>`;
};

window.orgConfirmInterim = async function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  const interimId = document.getElementById('interimSelect').value;
  if (!interimId) return showToast('Sélectionnez un intérimaire.', 'warning');
  const registre = Array.isArray(node.registre) ? [...node.registre] : [];
  registre.push({ role: 'interim', person_id: interimId, start: new Date().toISOString(), end: null });
  const res = await api(`/api/referentiels/organisation/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...node, interim_id: interimId, interim_actif: true, registre }),
  });
  if (!res.ok) return showToast('Erreur', 'error');
  const posteLbl = node.poste || node.sigle;
  const interimNom = personnelName(interimId);
  const titNom = node.titulaire_id ? personnelName(node.titulaire_id) : null;
  await api('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Intérim (${posteLbl}) : les demandes de validation sont redirigées vers ${interimNom}.`, type: 'warning' }),
  });
  if (titNom) {
    await api('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${titNom}, vos validations (${posteLbl}) sont assurées par ${interimNom} pendant votre absence.`, type: 'info' }),
    });
  }
  closeRefModal();
  await loadRefs();
  renderConfig();
  refreshNotifications();
  showToast(`Intérim activé — validations vers ${interimNom}.`, 'success', 4000);
};

window.orgEndInterim = async function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  if (!node) return;
  const registre = Array.isArray(node.registre) ? node.registre.map((e) => ({ ...e })) : [];
  const open = [...registre].reverse().find((e) => e.role === 'interim' && !e.end);
  if (open) open.end = new Date().toISOString();
  const res = await api(`/api/referentiels/organisation/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...node, interim_id: '', interim_actif: false, registre }),
  });
  if (!res.ok) return showToast('Erreur', 'error');
  await loadRefs();
  renderConfig();
  showToast('Titulaire de retour — intérimaire retiré.', 'success');
};

window.orgUnassign = async function (id) {
  const res = await api(`/api/referentiels/organisation_assignments/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadRefs();
    renderConfig();
    showToast('Rattachement retiré.', 'success');
  } else showToast('Erreur', 'error');
};

function orgPersonName(p) {
  return `${esc(p.nom || '')} ${esc(p.prenom || '')}`.trim() || esc(p.numero_inspecteur || p.id);
}

function orgAssignedChips(orgId) {
  const assigns = (REFS.organisation_assignments || []).filter((a) => a.org_id === orgId);
  if (!assigns.length) return '';
  const persons = REFS.inspecteurs || [];
  return `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem;">${assigns
    .map((a) => {
      const p = persons.find((x) => x.id === a.person_id);
      if (!p) return '';
      return `<span class="org-person-chip">${orgPersonName(p)}<span class="org-chip-x" onclick="orgUnassign('${a.id}')" title="Retirer">${icon('x', 12)}</span></span>`;
    })
    .join('')}</div>`;
}

function cfgSectionOrganigramme() {
  const levels = (REFS.organisation_levels || []).slice().sort((a, b) => a.ordre - b.ordre);
  const levelIndex = Object.fromEntries(levels.map((lv, i) => [lv.type, i]));
  const entites = REFS.organisation || [];
  const persons = REFS.inspecteurs || [];
  const children = (pid) => entites.filter((o) => (o.parent_id || '') === pid).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  // Panneau personnel (glisser-déposer) — masque les personnes déjà rattachées
  const assignedIds = new Set((REFS.organisation_assignments || []).map((a) => a.person_id));
  const available = persons.filter((p) => !assignedIds.has(p.id));
  const personnelPanel = `
    <div class="org-personnel">
      <div class="org-personnel-title">${icon('users', 15)} Personnel AAC</div>
      <p style="font-size:.72rem;color:var(--text-muted);margin-bottom:.5rem;">Glissez un nom vers une entité de l'organigramme.</p>
      ${
        available.length
          ? available
              .map(
                (p) => `<div class="org-person-item" draggable="true" ondragstart="orgDragStart(event,'${p.id}')" title="Réf : ${esc(p.ref_personnel || p.numero_inspecteur || '—')}">${icon('userCheck', 14)} <span>${orgPersonName(p)}</span></div>`
              )
              .join('')
          : `<p style="font-size:.8rem;color:var(--text-muted);">${persons.length ? 'Tout le personnel est rattaché.' : 'Aucun personnel — voir sous-menu « Personnel AAC ».'}</p>`
      }
    </div>`;

  const posteLine = (node) => {
    if (!node.poste && !node.titulaire_id && !node.interim_id) return '';
    const tit = node.titulaire_id ? personnelName(node.titulaire_id) : 'Poste vacant';
    const absent = !!node.interim_actif && !!node.interim_id;
    const titClass = absent ? 'org-titulaire org-titulaire-off' : 'org-titulaire';
    let interimHtml = '';
    if (node.interim_id) {
      interimHtml = `<span class="org-interim ${absent ? 'org-interim-on' : ''}">${icon('userCheck', 12)} Intérim : ${esc(personnelName(node.interim_id))}${absent ? ' <span class="shell-badge badge-active">Actif</span>' : ''}</span>`;
    }
    const canInterim = !!node.titulaire_id || !!node.poste;
    const toggle = absent
      ? `<button class="shell-btn shell-btn-danger org-poste-btn" onclick="event.stopPropagation();orgEndInterim('${node.id}')">Titulaire de retour</button>`
      : canInterim
      ? `<button class="shell-btn shell-btn-outline org-poste-btn" onclick="event.stopPropagation();orgStartInterim('${node.id}')">Signaler intérim</button>`
      : '';
    const nbReg = Array.isArray(node.registre) ? node.registre.length : 0;
    const registreBtn = `<button class="shell-btn shell-btn-outline org-poste-btn" onclick="event.stopPropagation();openPosteRegistre('${node.id}')">Registre${nbReg ? ` (${nbReg})` : ''}</button>`;
    return `<div class="org-poste">
      ${node.poste ? `<span class="org-poste-nom">${esc(node.poste)}</span>` : ''}
      <span class="${titClass}">${icon('userCheck', 12)} ${esc(tit)}</span>
      ${interimHtml}
      ${toggle}
      ${registreBtn}
    </div>`;
  };
  const editBtn = (node) =>
    `<button class="shell-btn-icon org-edit" onclick="event.stopPropagation();openRefModal('organisation','${node.id}')" title="Poste & titulaire">${icon('edit', 14)}</button>`;

  // Vue liste (indentée) — présentation actuelle
  const renderNodeList = (node, depth) => {
    const color = LEVEL_COLORS[levelIndex[node.type] ?? depth] || '#64748b';
    return `
    <div class="org-node" style="margin-left:${depth * 1.5}rem;border-left:3px solid ${color};"
         ondragover="orgAllowDrop(event)" ondragleave="orgDragLeave(event)" ondrop="orgDrop(event,'${node.id}')">
      <div style="display:flex;align-items:center;gap:.4rem;">
        <div style="flex:1;"><strong style="color:${color};">${esc(node.sigle)}</strong> — ${esc(node.libelle)}
          <span class="shell-badge badge-neutral" style="margin-left:.4rem;">${esc(node.type)}</span></div>
        ${editBtn(node)}
      </div>
      ${posteLine(node)}
      ${orgAssignedChips(node.id)}
    </div>
    ${children(node.id).map((c) => renderNodeList(c, depth + 1)).join('')}`;
  };

  // Vue hiérarchique verticale (arbre)
  const renderNodeTree = (node, depth) => {
    const color = LEVEL_COLORS[levelIndex[node.type] ?? depth] || '#64748b';
    const kids = children(node.id);
    return `
    <div class="org-tree-node">
      <div class="org-tree-box" style="border-top:3px solid ${color};"
           ondragover="orgAllowDrop(event)" ondragleave="orgDragLeave(event)" ondrop="orgDrop(event,'${node.id}')">
        <div style="display:flex;align-items:center;justify-content:center;gap:.3rem;"><strong style="color:${color};">${esc(node.sigle)}</strong>${editBtn(node)}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">${esc(node.libelle)}</div>
        ${posteLine(node)}
        ${orgAssignedChips(node.id)}
      </div>
      ${kids.length ? `<div class="org-tree-children">${kids.map((c) => renderNodeTree(c, depth + 1)).join('')}</div>` : ''}
    </div>`;
  };

  const roots = children('');
  const body = !roots.length
    ? '<p style="color:var(--text-muted);">Aucune entité définie — renseignez la section Organisation.</p>'
    : ORG_VIEW === 'tree'
    ? `<div class="org-tree">${roots.map((r) => renderNodeTree(r, 0)).join('')}</div>`
    : roots.map((r) => renderNodeList(r, 0)).join('');

  return `
  <div class="portal-page-header">
    <h3>${esc(t('cfg_organigramme'))}</h3>
    <div class="portal-page-actions">
      <div class="org-view-toggle">
        <button class="org-view-btn ${ORG_VIEW === 'list' ? 'active' : ''}" onclick="setOrgView('list')">${icon('list', 14)} Liste</button>
        <button class="org-view-btn ${ORG_VIEW === 'tree' ? 'active' : ''}" onclick="setOrgView('tree')">${icon('sitemap', 14)} Hiérarchie</button>
      </div>
    </div>
  </div>
  <div class="org-layout">
    ${personnelPanel}
    <div class="org-canvas shell-card">${body}</div>
  </div>`;
}

function cfgSectionSecurite(cfg) {
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_security'))} <span class="shell-badge badge-neutral">TDR §F.3</span></h3></div>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Longueur minimale du mot de passe</label><input class="shell-input" type="number" id="secMinLen" value="${cfg.security.passwordMinLength}"></div>
      <div class="shell-form-group"><label>Validité du mot de passe (jours)</label><input class="shell-input" type="number" id="secMaxAge" value="${cfg.security.passwordMaxAgeDays}"></div>
    </div>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Tentatives avant blocage</label><input class="shell-input" type="number" id="secMaxFail" value="${cfg.security.maxFailedAttempts}"></div>
      <div class="shell-form-group"><label>Déconnexion après inactivité (minutes)</label><input class="shell-input" type="number" id="secTimeout" value="${cfg.security.sessionTimeoutMinutes}"></div>
    </div>
    <div class="cfg-module-row">
      <strong>Session unique par utilisateur</strong>
      <label class="cfg-toggle"><input type="checkbox" id="secSingle" ${cfg.security.singleSession ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="cfg-module-row">
      <strong>Changement de mot de passe à la première connexion</strong>
      <label class="cfg-toggle"><input type="checkbox" id="secForce" ${cfg.security.forceChangeOnFirstLogin ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="cfg-module-row">
      <div>
        <strong>Authentification multifacteur (MFA)</strong>
        <div style="font-size:.72rem;color:var(--text-muted);">
          Code à usage unique envoyé sur l'e-mail ou le téléphone du profil, valable 10 minutes.
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
  else showToast('Erreur', 'error');
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
      <strong>Réplication asynchrone activée</strong>
      <label class="cfg-toggle"><input type="checkbox" id="repEnabled" ${cfg.replication.enabled ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="shell-form-group" style="margin-top:.75rem;">
      <label>URL du serveur central UEMOA</label>
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
  else showToast('Erreur', 'error');
};

window.cfgNavigate = function (sub) {
  CFG_SUB = sub;
  renderConfig();
};

window.toggleCfgSidebar = function () {
  CFG_COLLAPSED = !CFG_COLLAPSED;
  renderConfig();
};

function orgTopLevelType() {
  const levels = (REFS.organisation_levels || []).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  return levels.length ? levels[0].type : null;
}

// Le niveau d'ordre 1 (l'Administration) reprend sigle & libellé depuis « Détails sur l'Administration »
function normalizeOrgTopLevel(cfg) {
  const topType = orgTopLevelType();
  const aac = (cfg && cfg.aac) || {};
  if (!topType) return;
  (REFS.organisation || []).forEach((o) => {
    if (o.type === topType) {
      if (aac.sigle) o.sigle = aac.sigle;
      if (aac.nom) o.libelle = aac.nom;
    }
  });
}

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
    case 'prestataires': content = refTable('prestataires'); break;
    case 'inspecteurs': content = cfgSectionPersonnel(); break;
    case 'autres': content = refTable('types_supervision') + refTable('modes_supervision') + refTable('niveaux_qualifications') + refTable('specialites_inspecteur'); break;
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
        <button class="cfg-sidebar-toggle" onclick="toggleCfgSidebar()">${CFG_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
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
      if (res.ok) showToast(`Module ${code} ${toggle.checked ? 'activé' : 'désactivé'}.`, 'success');
      else {
        toggle.checked = !toggle.checked;
        showToast('Erreur', 'error');
      }
    });
  });
}

// ══════════ Navigation ══════════
// Les vues `mod_<CODE>` sont ajoutées par /js/modules-host.js à partir des
// manifestes des modules installés.
const VIEWS = { home: renderHome, profile: renderProfile, users: renderUsers, audit: renderAudit, config: renderConfig };

function navigate(view) {
  CURRENT_VIEW = view;
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
  if (newPassword !== confirmVal) return showToast('Les deux mots de passe ne correspondent pas.', 'error');
  const res = await api('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (res.ok) {
    document.getElementById('pwdModal').style.display = 'none';
    showToast('Mot de passe changé.', 'success');
    loadMe();
  } else {
    const data = await res.json().catch(() => ({}));
    const msg =
      data.error === 'policy' ? 'Mot de passe : ' + (data.details || []).join(', ')
      : data.error === 'reused' ? 'Réutilisation d\'un ancien mot de passe interdite.'
      : data.error === 'wrong_old' ? 'Mot de passe actuel incorrect.'
      : 'Erreur';
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
})();
