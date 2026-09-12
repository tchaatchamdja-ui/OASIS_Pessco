// OASIS — logique du portail (socle Phase 1)
// Logo de l'application (/img/oasis-logo.svg appliqué en masque : il prend la
// couleur du contexte, donc reste lisible sur les 5 thèmes).
const OASIS_LOGO_IMG = '<span class="oasis-logo-img" role="img" aria-label="OASIS"></span>';

// Nom complet : les majuscules formant le sigle OASIS sont légèrement agrandies.
const OASIS_FULLNAME_HTML =
  '<span class="sigle-cap">O</span>utils d\'<span class="sigle-cap">A</span>dministration' +
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
    oasisSessionPerdue();
    throw new Error('unauthenticated');
  }
  return res;
}

// Les règles de mot de passe non tenues arrivent du serveur en codes : la phrase
// se compose ici, dans la langue de l'écran. Une chaîne reçue telle quelle —
// d'un serveur antérieur à ce changement — s'affiche sans être traduite plutôt
// que de disparaître.
function reglesMotDePasse(details) {
  return (details || [])
    .map((d) => (typeof d === 'string' ? d : t('mdp_regle_' + d.regle, d.n)))
    .join(', ');
}

// Valeur passée en argument d'un gestionnaire inline. `esc` seul ne suffit
// pas : il laisse passer le guillemet une fois l'entité redécodée, et une
// valeur importée d'un classeur peut refermer l'attribut pour en ouvrir un
// autre. On sérialise en littéral JavaScript, puis on échappe pour l'attribut.
function escArg(v) {
  return esc(JSON.stringify(String(v ?? '')));
}

// L'échappement vient du socle (oasis-commun.js), comme dans chaque module.
function esc(s) { return oasisEsc(s); }

// ── Recherche des écrans du portail ──
// Le geste est celui du menu « Inspections » de RAMP : au repos une pastille
// qui dit « Rechercher », et le champ la remplace au clic, en s'étirant sur
// tout ce que la ligne laisse jusqu'au premier bouton. Il se referme s'il
// repart vide — le rang retrouve alors sa place.
const PORTAIL_RECHERCHE = { ouverte: false, valeur: '' };

function searchInputHtml(ph) {
  const ouverte = PORTAIL_RECHERCHE.ouverte || !!PORTAIL_RECHERCHE.valeur;
  const libelle = esc(ph || 'Rechercher...');
  return `
    <div class="cfg-search-wrap${ouverte ? ' ouverte' : ''}" id="portailRecherche">
      <button class="cfg-search-loupe" type="button" title="${libelle}" aria-label="${libelle}"
              onclick="portailOuvrirRecherche()">${icon('search', 14)}<span>Rechercher</span></button>
      <input class="cfg-search-input" type="search" placeholder="${libelle}" aria-label="${libelle}"
             value="${esc(PORTAIL_RECHERCHE.valeur)}"
             oninput="portailChercher(this)" onblur="portailFermerRechercheSiVide()">
      ${ouverte ? `<button class="shell-btn-icon cfg-search-reset" type="button" title="${t('vider_recherche')}"
              onmousedown="event.preventDefault()" onclick="portailViderRecherche()">${icon('x', 14)}</button>` : ''}
    </div>`;
}

// Le champ remplace la pastille sans redessiner l'écran : re-rendre ferait
// perdre le focus, et le filtrage travaille déjà sur le DOM en place.
window.portailOuvrirRecherche = function () {
  PORTAIL_RECHERCHE.ouverte = true;
  const boite = document.getElementById('portailRecherche');
  if (!boite) return;
  boite.classList.add('ouverte');
  // Le bouton de vidage n'existe qu'ouverte : il est posé ici plutôt que
  // d'attendre un redessin, qui ferait perdre le focus.
  if (!boite.querySelector('.cfg-search-reset')) {
    const reset = document.createElement('button');
    reset.className = 'shell-btn-icon cfg-search-reset';
    reset.type = 'button';
    reset.title = 'Vider la recherche';
    reset.innerHTML = icon('x', 14);
    reset.onmousedown = (e) => e.preventDefault();
    reset.onclick = portailViderRecherche;
    boite.appendChild(reset);
  }
  const champ = boite.querySelector('.cfg-search-input');
  if (champ) champ.focus();
};

window.portailChercher = function (inp) {
  PORTAIL_RECHERCHE.valeur = inp.value;
  filterScope(inp);
};

window.portailViderRecherche = function () {
  PORTAIL_RECHERCHE.valeur = '';
  PORTAIL_RECHERCHE.ouverte = false;
  const boite = document.getElementById('portailRecherche');
  if (!boite) return;
  const champ = boite.querySelector('.cfg-search-input');
  if (champ) { champ.value = ''; filterScope(champ); }
  boite.classList.remove('ouverte');
  const reset = boite.querySelector('.cfg-search-reset');
  if (reset) reset.remove();
};

window.portailFermerRechercheSiVide = function () {
  if (PORTAIL_RECHERCHE.valeur) return;
  portailViderRecherche();
};

// Changer d'écran ou de sous-menu remet la recherche au repos : elle ne porte
// que sur ce qu'on regarde.
function portailReinitialiserRecherche() {
  PORTAIL_RECHERCHE.ouverte = false;
  PORTAIL_RECHERCHE.valeur = '';
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
          <label>${t('fichier_renseigne')}</label>
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
  if (!file) return showToast(t('choisir_xlsx'), 'warning');
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
    } else showToast(oasisMessageErreur(d, res.status, t('erreur_import')), 'error');
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
  // Modules ouverts au compte, tels que « Accès aux modules » les déclare. Une
  // liste jamais renseignée les ouvre tous : c'était l'état de l'application
  // avant que ce champ n'existe, et le super-administrateur y a toujours accès
  // — c'est lui qui coche les cases.
  const mesModules = Array.isArray(ME.user.modules) ? ME.user.modules : null;
  const ouvert = (code) => ME.user.role === 'SUPERADMIN' || !mesModules
    || mesModules.includes(code);

  const card = (m) => {
    const color = COULEURS_MODULE[m.code] || PRIO_COLORS[m.priority] || '#64748b';
    const name = m.name[CURRENT_LANG] || m.name.fr;
    const desc = m.desc[CURRENT_LANG] || m.desc.fr;
    // Un module fermé au compte se voit, éteint : il dit ce que l'application
    // fait, sans laisser croire qu'un clic l'ouvrira.
    const accessible = ouvert(m.code);
    // La carte ne porte ni priorité, ni état d'activation, ni point du TdR :
    // ce sont des informations de feuille de route, pas d'usage.
    return `
    <div class="portal-card${accessible ? '' : ' portal-card-ferme'}" style="--module-color:${color};"
         data-module="${esc(m.code)}" data-enabled="${accessible ? 'true' : 'false'}"
         ${accessible ? '' : 'title="' + t('module_non_ouvert') + '" aria-disabled="true"'}>
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
      // Carte éteinte : le clic ne mène nulle part, il dit pourquoi.
      if (!enabled) {
        showToast(t('module_non_ouvert'), 'error');
        return;
      }
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
  portailReinitialiserRecherche();
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
      if (isSuper) actions.push(`<button class="shell-btn-icon" data-edit="${esc(u.username)}" title="${t('edit')}">${icon('edit', 15)}</button>`);
      if (u.locked) actions.push(`<button class="shell-btn-icon" data-action="unlock" data-user="${esc(u.username)}" title="${esc(t('action_unlock'))}">${icon('unlock', 15)}</button>`);
      const canToggle = u.username !== ME.user.username && !(ME.user.role === 'ADMIN' && (u.role === 'ADMIN' || u.role === 'SUPERADMIN'));
      if (canToggle) actions.push(`<button class="shell-btn-icon" data-action="toggle-active" data-user="${esc(u.username)}" title="${t('action_toggle')}">${icon('power', 15)}</button>`);
      actions.push(`<button class="shell-btn-icon" data-action="reset-password" data-user="${esc(u.username)}" title="${t('reinitialiser_mdp')}">${icon('key', 15)}</button>`);
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
              <th>${t('col_nom')}</th><th>${t('col_prenoms')}</th><th>Email (identifiant)</th>${USER_TAB === 'SUPERADMIN' ? '<th>' + t('col_portee') + '</th>' : ''}${isPresta ? '<th>' + t('col_prestataire') + '</th>' : ''}<th>${t('col_acces_modules')}</th>
              <th>${esc(t('users_col_status'))}</th><th>${esc(t('users_col_created'))}</th><th>${esc(t('users_col_actions'))}</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="${7 + (isPresta ? 1 : 0) + (USER_TAB === 'SUPERADMIN' ? 1 : 0)}" style="color:var(--text-muted);">${t('aucun_utilisateur_categorie')}</td></tr>`}</tbody>
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
      if (action === 'reset-password' && !await oasisConfirmer(t('confirmer_reset_mdp'))) return;
      const res = await api(`/api/users/${encodeURIComponent(username)}`, {
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
          : data.details ? reglesMotDePasse(data.details) : oasisMessageErreur(data, res.status);
        showToast(msg, 'error', 4000);
      }
    });
  });
  document.querySelectorAll('[data-presta]').forEach((sel) => sel.addEventListener('change', async () => {
    const res = await api(`/api/users/${encodeURIComponent(sel.dataset.presta)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-prestataire', prestataire_id: sel.value }),
    });
    if (res.ok) showToast(t('prestataire_enregistre'), 'success');
    else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
  }));
  document.querySelectorAll('[data-topersonnel]:not([disabled])').forEach((btn) => btn.addEventListener('click', async () => {
    const res = await api(`/api/users/${encodeURIComponent(btn.dataset.topersonnel)}/to-personnel`, { method: 'POST' });
    if (res.ok) { await loadRefs(); showToast(t('ajoute_personnel'), 'success'); renderUsers(); }
    else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error === 'exists' ? t('deja_present_personnel') : oasisMessageErreur(d, res.status), 'error');
    }
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
  if (res.ok) { closeUserModal(); showToast(t('acces_modules_enregistre'), 'success'); renderUsers(); }
  else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

function showEditUserModal(u) {
  const root = document.getElementById('userModalRoot');
  const nm = splitName(u);
  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:560px;">
      <div class="shell-modal-header"><h3>${t('modifier_utilisateur')}</h3><button class="shell-btn-icon" onclick="closeUserModal()" style="color:#fff;">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          <div class="shell-form-group"><label>${t('col_nom')}</label><input class="shell-input" id="euNom" value="${esc(nm.nom)}"></div>
          <div class="shell-form-group"><label>${t('col_prenoms')}</label><input class="shell-input" id="euPrenom" value="${esc(nm.prenom)}"></div>
        </div>
        <div class="shell-form-row">
          ${phoneFieldHtml('euTel', u.telephone)}
          <div class="shell-form-group"><label>${t('users_col_role')}</label>
            <select class="shell-input" id="euRole">${USER_TABS.map((tb) => `<option value="${tb.id}" ${userRole(u) === tb.id ? 'selected' : ''}>${esc(tb.label)}</option>`).join('')}</select>
          </div>
        </div>
        ${porteeFieldsHtml('eu', u)}
        <div class="shell-form-group" style="margin-bottom:.5rem;">
          <label>${t('email_identifiant')}</label>
          <input class="shell-input" type="email" id="euEmail" value="${esc(u.email || u.username)}">
        </div>
        <div class="shell-form-group" id="euAdminPwdWrap" style="display:none;">
          <label style="color:#dc2626;">${t('confirmer_superadmin')}</label>
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
  if (res.ok) { closeUserModal(); showToast(t('utilisateur_modifie'), 'success'); renderUsers(); }
  else {
    const d = await res.json().catch(() => ({}));
    const msg = d.error === 'admin_password' ? t('mdp_superadmin_incorrect')
      : d.error === 'exists' ? t('compte_existe_email')
      : d.error === 'invalid_email' ? t('email_invalide')
      : oasisMessageErreur(d, res.status);
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
          <div class="shell-form-group"><label>${t('col_nom')}</label><input class="shell-input" id="nuNom"></div>
          <div class="shell-form-group"><label>${t('col_prenoms')}</label><input class="shell-input" id="nuPrenom"></div>
        </div>
        <div class="shell-form-group" style="margin-bottom:1rem;">
          <label>${t('email_sert_identifiant')}</label>
          <input class="shell-input" type="email" id="nuEmail" placeholder="${t('ex_courriel_aac')}">
        </div>
        <div class="shell-form-group" style="margin-bottom:1rem;">
          <label>${esc(t('users_col_role'))}</label>
          <select class="shell-input" id="nuRole">
            ${USER_TABS.map((tb) => `<option value="${tb.id}" ${tb.id === USER_TAB ? 'selected' : ''}>${esc(tb.label)}</option>`).join('')}
          </select>
        </div>
        ${porteeFieldsHtml('nu', null)}
        <div class="shell-form-group" id="nuPrestaWrap" style="margin-bottom:1rem;${PRESTA_TABS.includes(USER_TAB) ? '' : 'display:none;'}">
          <label>${t('prestataire_provenance')}</label>
          <select class="shell-input" id="nuPresta"><option value="">—</option>${(REFS.prestataires || []).map((p) => `<option value="${esc(p.id)}">${esc(p.nom)}</option>`).join('')}</select>
        </div>
        ${ME.user.role === 'SUPERADMIN' ? `
        <div class="shell-form-group" style="margin-bottom:.5rem;">
          <label>${t('acces_modules')}</label>
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
      showToast(t('utilisateur_cree'), 'success');
      renderUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.details ? t('mdp_politique', reglesMotDePasse(data.details))
        : data.error === 'exists' ? t('compte_existe_email')
        : data.error === 'invalid_email' ? t('email_invalide_identifiant')
        : oasisMessageErreur(data, res.status);
      showToast(msg, 'error', 4500);
    }
  });
}

// ══════════ Profil personnel ══════════

const ROLE_LABELS = { SUPERADMIN: 'SuperAdmin', ADMIN: 'Admin AAC', ADMIN_PRESTATAIRE: 'Admin Prestataires', AAC: 'Utilisateur AAC', INSPECTEUR: 'Utilisateur AAC', PRESTATAIRE: 'Utilisateur Prestataire', INDEPENDANT: 'Utilisateur Indépendant' };

window.uploadProfilePhoto = function (inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast(t('image_trop_lourde'), 'error');
  const reader = new FileReader();
  reader.onload = () => saveProfile({ photo: reader.result });
  reader.readAsDataURL(file);
};

window.removeProfilePhoto = async function () {
  if (!await oasisConfirmer(t('confirmer_suppr_photo'))) return;
  saveProfile({ photo: '' });
};

async function saveProfile(patch) {
  const res = await api('/api/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    showToast(t('profil_maj'), 'success');
    await loadMe();
    renderProfile();
  } else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
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
  if (!oldPassword) return showToast(t('confirmer_mdp_actuel'), 'warning');
  if (newPassword !== confirmVal) return showToast(t('mdp_discordants'), 'error');
  const res = await api('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (res.ok) {
    showToast(t('mdp_modifie'), 'success');
    ['pfOld', 'pfNew', 'pfConfirm'].forEach((id) => (document.getElementById(id).value = ''));
    await loadMe();
    renderProfile();
  } else {
    const data = await res.json().catch(() => ({}));
    const msg =
      data.error === 'policy' ? t('mdp_politique', reglesMotDePasse(data.details))
      : oasisMessageErreur(data, res.status);
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
          ${u.photo ? `<button class="shell-btn shell-btn-danger aac-logo-iconbtn" onclick="removeProfilePhoto()" title="${t('supprimer_photo')}">${icon('trash', 15)}</button>` : ''}
        </div>
        <div class="pf-name">${esc(nm.nom)} ${esc(nm.prenom)}</div>
        <div class="pf-role">${esc(ROLE_LABELS[u.role] || u.role)}</div>
      </div>

      <div class="pf-main pf-compact">
        <div class="shell-card">
          <div class="portal-page-header"><h3>Informations personnelles</h3></div>
          <div class="shell-form-row">
            <div class="shell-form-group"><label>${t('col_nom')}</label><input class="shell-input" id="pfNom" value="${esc(nm.nom)}"></div>
            <div class="shell-form-group"><label>${t('col_prenoms')}</label><input class="shell-input" id="pfPrenom" value="${esc(nm.prenom)}"></div>
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

function pfExtraSection(key, title, hint, enabled, fields) {
  const inputs = fields
    .map(([id, label, val, readonly]) => `<div class="shell-form-group"><label>${esc(label)}${readonly ? ' <span style="font-size:.65rem;color:var(--text-muted);">(auto)</span>' : ''}</label><input class="shell-input" id="${id}" value="${esc(val || '')}" ${(!enabled || readonly) ? 'disabled' : ''}></div>`)
    .join('');
  return `
    <div class="shell-card ${enabled ? '' : 'pf-section-disabled'}">
      <div class="portal-page-header"><h3>${esc(title)} <span style="font-size:.72rem;font-weight:400;color:var(--text-muted);">${esc(hint)}</span></h3></div>
      ${enabled ? '' : '<p style="font-size:.75rem;color:var(--text-muted);">' + t('section_reservee') + '</p>'}
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
    showToast(v.valid ? `${t('audit_ok')} — ${t('entrees_n', v.total)}` : `${t('audit_broken')} #${v.brokenAt}`, v.valid ? 'success' : 'error', 4000);
  });
}
