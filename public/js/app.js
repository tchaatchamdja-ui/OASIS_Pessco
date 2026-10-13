// OASIS — logique du portail (socle Phase 1)
// Logo de l'application (/img/oasis-logo.svg appliqué en masque : il prend la
// couleur du contexte, donc reste lisible sur les 5 thèmes).
// `OASIS_LOGO_IMG` vient de `/app/etat.js`, chargé avant ce fichier. C'était le
// dernier nom lexical qui empêchait `app-demarrage.js` d'être converti : il la
// lit pour poser la marque dans la barre. Ne pas la redéclarer.

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
// `PRIO_COLORS` est parti dans `frontend/portail/icones.ts` (5.d.5) : l'écran
// « Modules » de la configuration le lit aussi, et un `const` du premier niveau
// est une globale **lexicale** qu'aucun module ne peut atteindre. Le sas des
// icônes le pose sur `window`, **avant** ce fichier, et la carte du portail
// ci-dessous le lit donc en propriété. **Ne pas le redéclarer ici** : un `const`
// masquerait la propriété et deux palettes coexisteraient sans une erreur.
//
// C'est un prêt dans l'autre sens — le premier de 5.d : jusqu'ici les modules
// empruntaient à `app.js`. `scripts/comparer-parametres.js` confronte les cinq
// teintes à celles de ce fichier, lues dans `git`, parce que les deux côtés de
// la comparaison lisent désormais la même palette construite.
// Teinte propre à un module, quand son thème en réunit plusieurs : les quatre
// cartes de « Surveillance et inspections » ne se ressemblent plus.
const COULEURS_MODULE = {
  PLAN: '#0059ff',
  SURV: '#ed580e',
  RAMP: '#ff9500',
  CARE: '#ff0000',
};
// `LEVEL_COLORS` est parti dans `frontend/portail/organigramme.ts` (5.d.3) : ce
// fichier ne l'utilisait pas — seul `app-config.js` le lit —, et un `const` du
// premier niveau est une globale **lexicale** qu'aucun module ne peut atteindre.
// Le sas le pose sur `window`. **Ne pas le redéclarer ici.**
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

// ── Les libellés français littéraux : partis dans un module typé (5.e.0) ──
//
// `CFG_I18N` et `tr` vivent désormais dans `frontend/portail/libelles.ts`, et le
// sas les pose sur `window` — `tr` seulement : la table était un `const` du
// premier niveau, donc absente de `window`, et personne ne la lit.
//
// C'était le nom le plus **emprunté** du portail : quatre modules convertis en
// 5.d lisaient `window.tr`. Ils l'importent maintenant de sa source, et leurs
// déclarations sont parties avec leurs lectures.
//
// Le compilateur y a trouvé une clé en double — `'Domaines'`, une fois en titre
// de section et une fois en colonne, avec la **même** valeur. Un littéral d'objet
// garde la dernière ; le doublon est retiré, et le comparateur le prouve en
// relevant les clés de la table d'origine, où il est déjà effondré.
//
// Éprouvé par `scripts/comparer-barre.js` : les **65 libellés** dans les trois
// langues plus une quatrième absente, et les clés qui n'en sont pas.

// ── L'état partagé vient de `/app/etat.js`, chargé avant ce fichier ──
//
// Ces six noms étaient déclarés ici en `let`, au premier niveau : des globales
// **lexicales**, invisibles à un module. Tant qu'elles l'étaient, aucun fichier
// du portail ne pouvait être converti seul — `portail-instances.js` lit `ME` et
// `CFG_SUB`, `app-demarrage.js` écrit `ME` et `CURRENT_VIEW`.
//
// Ils sont désormais posés sur `window` par `frontend/portail/globales/etat.ts`.
// Les lectures et les affectations de ce fichier n'ont pas changé d'un
// caractère : un nom non déclaré atteint la propriété de `window`. **Ne pas les
// redéclarer** — un `let ME` masquerait la propriété, et un module lirait un
// état figé sans que rien ne le dise. Un garde-fou de forme le refuse.

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
// ── La barre d'écran : partie dans un module typé (5.e.0) ──
//
// La recherche, l'export PDF et Excel, l'import de classeur et le filtre client
// vivent désormais dans `frontend/portail/barre.ts` ; le sas pose les douze noms
// que les attributs `onclick` du balisage appellent.
//
// `PORTAIL_RECHERCHE` part avec eux, et **ne doit pas être redéclaré ici** :
// c'était un `const` du premier niveau, donc une globale lexicale qu'aucun module
// ne peut atteindre, et personne d'autre ne le lisait — il est devenu privé au
// module, comme `AAC_CFG` en 5.d.5.
//
// `searchInputHtml` et `exportBar` étaient les deux autres prêts des modules de
// 5.d ; ils les importent maintenant de leur source, et les quatre comparateurs
// qui les fabriquaient chargent le module construit — un vrai balisage des deux
// côtés, au lieu d'un marqueur d'un seul.
//
// Une divergence assumée : `window.open` peut rendre `null` quand le navigateur
// bloque les fenêtres, et l'original écrivait dedans sans le vérifier
// (`TypeError`, console, rien à l'écran). Le module **lève**, en nommant la cause.
//
// Éprouvé par `scripts/comparer-barre.js` : les deux **documents PDF entiers**,
// le corps de l'import, le balisage de la fenêtre d'import, et le champ de
// recherche dans ses quatre états — atteints par les gestes des deux côtés.


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
    // Le groupe « surveillance » n'a plus d'en-tête : le bloc PESSCO qui ferme
    // la page dit déjà son nom, en grand. Les autres gardent le leur — rien ne
    // les nomme ailleurs.
    const entete = th.code === 'surveillance' ? '' : `
      <div class="portal-group-header">
        ${th.icon ? `<span class="group-icon">${icon(th.icon, 18)}</span>` : ''}
        ${esc(t('theme_' + th.code))}
        <span class="group-count">${mods.length}</span>
      </div>`;
    return `
    <div class="portal-group">${entete}
      <div class="portal-grid">${mods.map(card).join('')}</div>
    </div>`;
  }).join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-titleblock">
      <div class="portal-titleblock-sigle">
        <span class="tb-word"><span class="tb-o">O</span>ASIS<span class="oasis-pessco">pessco</span>
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
    <div class="portal-modules ${MODULES_VIEW === 'list' ? 'list-view' : ''}" id="portalModules">${groups}</div>
    <!-- Le nom du dispositif ferme la page, au même corps que le bloc titre qui
         l'ouvre. Le développé n'est pas traduit : c'est celui qui forme le
         sigle — P·E·S·S·CO — et il ne le formerait plus dans une autre langue. -->
    <div class="portal-brandmark">
      <div class="portal-brandmark-sigle">PESSCO</div>
      <div class="portal-brandmark-sub">Planification, Exécution et Suivi de la Surveillance Continue</div>
    </div>`;


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

// ── L'écran des comptes : parti dans un module typé (5.e.1) ──
//
// Les six onglets, les cinq fenêtres et les quatre gestes qui écrivent vivent
// désormais dans `frontend/portail/utilisateurs.ts` ; le sas pose les douze noms
// que le balisage et `app-demarrage` appellent.
//
// `USER_TAB`, `USER_COLLAPSED` et `ALL_MODULES` partent avec eux et **ne doivent
// pas être redéclarés ici** : c'étaient des `let` du premier niveau, donc des
// globales lexicales, et personne d'autre ne les lisait — ils sont devenus privés
// au module. Troisième fois après `AAC_CFG` (5.d.5) et `PORTAIL_RECHERCHE` (5.e.0).
//
// Ce que la conversion **ne corrige pas**, et qui est nommé là-bas :
// `submitEditUser` envoie tous les champs de la fenêtre, vides compris, et le
// serveur les écrit. C'est *le champ effacé parce qu'il est parti vide*, que la
// suite « parcours » nomme depuis 5.c. Le typage le rend visible — les champs
// facultatifs passent par `valeurFacultative`, qui dit en son nom que l'absence
// et le vide s'y confondent — mais le comportement est intact.
//
// Quatre noms restent empruntés à ce fichier : `fmtDate`, `reglesMotDePasse`,
// `phoneFieldHtml` et `phoneFieldValue`. Les deux derniers sont le bloc du
// téléphone, prévu pour 5.e.4.
//
// Éprouvé par `scripts/comparer-utilisateurs.js` : 100 comparaisons — les six
// onglets aux deux privilèges, **les écouteurs posés après le rendu** (six
// familles, et un bouton muet ne se voit dans aucun balisage), les quatre
// fenêtres avec le focus qu'elles posent, et les quatre corps de requête dont
// celui de l'effacement.

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
