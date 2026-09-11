/* ══════════════════════════════════════════════════════════════════════
   Menu « Processus » — intervenants par secteur d'activité.

   Un processus décrit, pour un secteur donné, qui agit à chaque étape (et
   sous-étape) du circuit d'une activité de surveillance ou du circuit d'une
   constatation. Le module n'impose pas la liste des acteurs : chaque étape
   porte les siens, choisis parmi les rôles courants ou nommés librement,
   parce que les organisations ne découpent pas les responsabilités de la
   même façon d'un secteur à l'autre.

   Réservé aux comptes SUPERADMIN et ADMIN du portail, et aux Gestionnaires
   du module.
   ────────────────────────────────────────────────────────────────────── */

const EXEC_PROC_CFG = { liste: [], chargee: false, edite: null, filtre: { type: '', secteur: '' } };

// Rôles proposés par défaut. « Autre » ouvre un intitulé libre : la liste ne
// prétend pas couvrir toutes les organisations.
const EXEC_PROC_ROLES = [
  { id: 'responsable_activite', label: 'Responsable d’activité' },
  { id: 'validateur', label: 'Validateur' },
  { id: 'gestionnaire', label: 'Gestionnaire' },
  { id: 'hierarchie', label: 'Responsable hiérarchique' },
  { id: 'equipe_audit', label: 'Équipe d’audit / inspection' },
  { id: 'contributeur', label: 'Contributeur' },
  { id: 'observateur', label: 'Observateur' },
  { id: 'autre', label: 'Autre acteur' },
];

// Rôles tenus au sein de l'équipe qui mène l'activité. On ne désigne pas ici
// une personne : l'équipe est constituée activité par activité, le processus
// dit seulement quel rôle de l'équipe intervient à cette étape.
// La liste vient du paramètre « Équipe d'audit / inspection » — la même que
// celle proposée à l'étape Réalisation.
const _execProcRolesEquipe = () => _execRolesEquipe()
  .map((label) => ({ id: label, label }));

// Deux rôles se désignent autrement qu'en nommant une personne : le
// responsable hiérarchique par son poste à l'organigramme, l'équipe d'audit
// par le rôle qu'y tient l'intervenant.
const _execProcDesignation = (role) => (role === 'hierarchie' ? 'poste'
  : (role === 'equipe_audit' ? 'equipe' : 'personne'));

// Postes de l'organigramme (Configuration → Organigramme du portail).
function _execProcPostes() {
  return (EXEC_STATE.data.organisation || [])
    .slice()
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
}
const _execProcPosteLibelle = (o) => `${o.poste || o.libelle || o.sigle || o.id}`
  + (o.sigle ? ` — ${o.sigle}` : '');

// Étapes et sous-étapes de chaque circuit. Les libellés viennent des mêmes
// tables que les fils d'avancement, pour que la configuration et l'écran de
// travail parlent le même langage.
function _execProcCfgEtapes(type) {
  if (type === 'constatation') {
    return [
      { id: 'preparation', label: 'Préparation', sous: [] },
      { id: 'validation', label: 'Validation', sous: [{ id: 'renvoi', label: 'Renvoi' }, { id: 'rejet', label: 'Rejet' }] },
      { id: 'transmission', label: 'Transmission', sous: [] },
      { id: 'pac_soumission', label: 'PAC — Soumission', sous: [] },
      { id: 'pac_acceptation', label: 'PAC — Acceptation', sous: [] },
      { id: 'pac_mise_oeuvre', label: 'PAC — Mise en œuvre', sous: [] },
      { id: 'pac_cloture', label: 'PAC — Clôture', sous: [] },
    ];
  }
  return [
    { id: 'notification', label: 'Notification', sous: [
      { id: 'soumission', label: 'Soumission' },
      { id: 'validation', label: 'Validation' },
      { id: 'transmission', label: 'Transmission' },
    ] },
    { id: 'confirmation', label: 'Confirmation', sous: [] },
    { id: 'realisation', label: 'Réalisation', sous: [] },
    { id: 'rapport', label: 'Rapport', sous: [] },
    { id: 'validation', label: 'Validation', sous: [] },
    { id: 'transmission', label: 'Transmission', sous: [] },
  ];
}

// Clé d'une case du tableau : « étape » ou « étape:sous-étape ».
const _execProcCle = (etape, sous) => (sous ? `${etape}:${sous}` : etape);

// Configurer un processus relève du gouvernement du module, comme le reste
// du paramétrage. Les comptes portail d'administration en disposent d'office.
function _execPeutProcessus() {
  return _execGouverneModule() || _execAdministreParc();
}

async function execProcCfgCharger() {
  try {
    EXEC_PROC_CFG.liste = await api(`${EXEC_MODULE_API}/processus`) || [];
  } catch (e) {
    EXEC_PROC_CFG.liste = [];
  }
  // Postes de l'organigramme : chargés à l'ouverture du menu, le reste du
  // module n'en a pas l'usage.
  if (!EXEC_STATE.data.organisation) {
    try { EXEC_STATE.data.organisation = await api('/api/referentiels/organisation') || []; }
    catch (e) { EXEC_STATE.data.organisation = []; }
  }
  EXEC_PROC_CFG.chargee = true;
  execRenderPage();
}

function execRenderProcessus() {
  if (!_execPeutProcessus()) {
    return `<div class="page-content"><div class="card"><p>${te('acces_refuse')}</p></div></div>`;
  }
  if (!EXEC_PROC_CFG.chargee) {
    execProcCfgCharger();
    return `<div class="page-content"><div class="card"><p>${te('chargement')}</p></div></div>`;
  }

  const secteurs = EXEC_STATE.data.secteurs || [];
  const domaines = EXEC_STATE.data.domaines || [];
  const nomSecteur = (id) => {
    const s = secteurs.find((x) => x.id === id);
    return s ? `${s.code ? s.code + ' - ' : ''}${s.nom || ''}` : '—';
  };
  const nomDomaine = (id) => {
    const d = domaines.find((x) => x.id === id);
    return d ? (d.code || d.nom || '') : '';
  };

  const F = EXEC_PROC_CFG.filtre;
  let liste = EXEC_PROC_CFG.liste;
  if (F.type) liste = liste.filter((p) => p.type === F.type);
  if (F.secteur) liste = liste.filter((p) => p.secteur_id === F.secteur);

  const nbActeurs = (p) => Object.values(p.acteurs || {})
    .reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);

  const lignes = liste.length ? liste.map((p) => `
    <tr class="exec-act-row" style="cursor:pointer;"
        onclick="if(!event.target.closest('button'))execProcCfgEditer('${p.id}')">
      <td><strong>${_esc(p.libelle || '')}</strong></td>
      <td>${p.type === 'constatation' ? te('proc_type_constatation') : te('proc_type_activite')}</td>
      <td>${_esc(nomDomaine(p.domaine_id))}</td>
      <td>${_esc(nomSecteur(p.secteur_id))}</td>
      <td style="text-align:center;">${_execProcCfgEtapes(p.type).length}</td>
      <td style="text-align:center;">${nbActeurs(p)}</td>
      <td class="exec-etats-actions">
        <button class="btn btn-sm btn-outline btn-icon-only" onclick="execProcCfgEditer('${p.id}')"
                title="${_escAttr(te('modifier'))}">${EXEC_ICONS.edit}</button>
        <button class="btn btn-sm btn-outline btn-icon-only" onclick="execProcCfgDupliquer('${p.id}')"
                title="${_escAttr(te('proc_dupliquer'))}">${EXEC_ICONS.file}</button>
        <button class="btn btn-sm btn-outline btn-icon-only" style="color:#dc2626;border-color:#dc2626;"
                onclick="execProcCfgSupprimer('${p.id}')" title="${_escAttr(te('supprimer'))}">${EXEC_ICONS.x}</button>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1.5rem;">${te('no_data')}</td></tr>`;

  return `
  <div class="page-content">
    <div class="page-header exec-dash-entete">
      <div>
        <h2>${te('processus')}</h2>
      </div>
      <button class="btn btn-primary btn-sm" onclick="execProcCfgEditer('')">
        ${EXEC_ICONS.add || ''} ${te('proc_nouveau')}
      </button>
    </div>

    <div class="exec-filter-bar" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
      <select class="form-select" style="max-width:220px;"
              onchange="EXEC_PROC_CFG.filtre.type=this.value;execRenderPage()">
        <option value="">${te('proc_tous_types')}</option>
        <option value="activite" ${F.type === 'activite' ? 'selected' : ''}>${te('proc_type_activite')}</option>
        <option value="constatation" ${F.type === 'constatation' ? 'selected' : ''}>${te('proc_type_constatation')}</option>
      </select>
      <select class="form-select" style="max-width:280px;"
              onchange="EXEC_PROC_CFG.filtre.secteur=this.value;execRenderPage()">
        <option value="">${te('all_sectors')}</option>
        ${secteurs.map((s) => `<option value="${s.id}" ${F.secteur === s.id ? 'selected' : ''}>${_esc(nomSecteur(s.id))}</option>`).join('')}
      </select>
    </div>

    <div class="card">
      <table class="exec-data-table exec-compact-table">
        <thead><tr>
          <th>${te('proc_libelle')}</th>
          <th style="width:170px;">${te('proc_type')}</th>
          <th style="width:110px;">${te('domaine')}</th>
          <th style="width:220px;">${te('secteur_label')}</th>
          <th style="width:90px;text-align:center;">${te('proc_etapes')}</th>
          <th style="width:100px;text-align:center;">${te('proc_acteurs')}</th>
          <th style="width:140px;text-align:center;">${te('actions')}</th>
        </tr></thead>
        <tbody>${lignes}</tbody>
      </table>
    </div>
  </div>`;
}

// ── Formulaire ──────────────────────────────────────────────────────
window.execProcCfgEditer = function (id) {
  const secteurs = EXEC_STATE.data.secteurs || [];
  const domaines = EXEC_STATE.data.domaines || [];
  const p = id ? EXEC_PROC_CFG.liste.find((x) => x.id === id) : null;
  const courant = p ? JSON.parse(JSON.stringify(p)) : {
    id: '', libelle: '', type: 'activite', secteur_id: '', domaine_id: '', description: '', acteurs: {},
  };
  EXEC_PROC_CFG.edite = courant;

  const corps = `
  <div class="exec-proc-bloc">
    <div class="form-group pcfg-ligne-titre">
      <label class="form-label" for="pcfg_libelle">${te('proc_libelle')}</label>
      <input type="text" class="form-control" id="pcfg_libelle" value="${_escAttr(courant.libelle)}">
    </div>
    <div class="exec-ajust-mesures pcfg-ligne-trois">
      <div class="form-group">
        <label class="form-label" for="pcfg_type">${te('proc_type')}</label>
        <select class="form-control" id="pcfg_type" onchange="execProcCfgTypeChange()">
          <option value="activite" ${courant.type === 'activite' ? 'selected' : ''}>${te('proc_type_activite')}</option>
          <option value="constatation" ${courant.type === 'constatation' ? 'selected' : ''}>${te('proc_type_constatation')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="pcfg_domaine">${te('domaine')}</label>
        <select class="form-control" id="pcfg_domaine">
          <option value="">—</option>
          ${domaines.map((d) => `<option value="${d.id}" ${courant.domaine_id === d.id ? 'selected' : ''}>${_esc(d.code || d.nom)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="pcfg_secteur">${te('secteur_label')}</label>
        <select class="form-control" id="pcfg_secteur">
          <option value="">—</option>
          ${secteurs.map((s) => `<option value="${s.id}" ${courant.secteur_id === s.id ? 'selected' : ''}>${_esc((s.code ? s.code + ' - ' : '') + (s.nom || ''))}</option>`).join('')}
        </select>
      </div>
    </div>
    <label class="form-label pcfg-label-fort" for="pcfg_description">${te('description')}</label>
    <textarea class="form-control" id="pcfg_description" rows="1">${_esc(courant.description || '')}</textarea>
  </div>
  <h4 class="exec-proc-col-titre">${te('proc_acteurs_par_etape')}</h4>
  <div id="pcfg_etapes">${_execProcCfgEtapesHtml(courant)}</div>
  <p class="exec-proc-erreur" id="pcfg_erreur"></p>`;

  const pied = `
    <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel')}</button>
    ${courant.id ? `<button class="btn btn-outline" onclick="execProcCfgDupliquer('${courant.id}')">
      ${EXEC_ICONS.file || ''} ${te('proc_dupliquer')}</button>` : ''}
    <button class="btn btn-primary" onclick="execProcCfgEnregistrer()">
      ${EXEC_ICONS.check || ''} ${te('save')}
    </button>`;

  const titre = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execCloseSlider()">
      ${EXEC_ICONS.back || ''} ${te('back')}
    </button>${EXEC_ICONS.trigger || ''} ${courant.id ? te('proc_modifier') : te('proc_nouveau')}`;
  execShowSlider(titre, corps, pied, 'half');
  document.querySelector('#execSlider .exec-slider-close')?.remove();
};

// Le tableau des acteurs suit le type retenu : changer de circuit recompose
// les étapes, en gardant les acteurs déjà saisis sur les clés communes.
window.execProcCfgTypeChange = function () {
  const c = EXEC_PROC_CFG.edite;
  if (!c) return;
  c.acteurs = _execProcCfgLire();
  c.type = (document.getElementById('pcfg_type') || {}).value || 'activite';
  const hote = document.getElementById('pcfg_etapes');
  if (hote) hote.innerHTML = _execProcCfgEtapesHtml(c);
};

function _execProcCfgEtapesHtml(courant) {
  const etapes = _execProcCfgEtapes(courant.type);
  const acteurs = courant.acteurs || {};
  const bloc = (cle, libelle, sousEtape) => {
    const liste = acteurs[cle] || [];
    return `
    <div class="pcfg-etape${sousEtape ? ' sous' : ''}" data-cle="${_escAttr(cle)}">
      <div class="pcfg-etape-tete">
        <span class="pcfg-etape-nom">${_esc(libelle)}</span>
        <button type="button" class="btn btn-sm btn-outline" onclick="execProcCfgAjouterActeur('${_escAttr(cle)}')">
          ${EXEC_ICONS.add || '+'} ${te('proc_ajouter_acteur')}
        </button>
      </div>
      <div class="pcfg-acteurs">
        ${liste.length ? liste.map((a, i) => _execProcCfgActeurHtml(cle, a, i)).join('')
          : `<em class="pcfg-vide">${te('proc_aucun_acteur')}</em>`}
      </div>
    </div>`;
  };
  return etapes.map((e) => bloc(e.id, e.label, false)
    + (e.sous || []).map((s) => bloc(_execProcCle(e.id, s.id), `↳ ${s.label}`, true)).join('')).join('');
}

function _execProcCfgActeurHtml(cle, a, i) {
  const inspecteurs = EXEC_STATE.data.inspecteurs || [];
  const designation = _execProcDesignation(a.role);
  const cible = designation === 'poste'
    ? `<select class="form-control pcfg-poste">
         <option value="">${te('proc_poste_non_designe')}</option>
         ${_execProcPostes().map((o) => `<option value="${o.id}" ${a.poste_id === o.id ? 'selected' : ''}>${_esc(_execProcPosteLibelle(o))}</option>`).join('')}
       </select>`
    : (designation === 'equipe'
      ? `<select class="form-control pcfg-role-equipe">
           <option value="">${te('proc_equipe_non_designe')}</option>
           ${_execProcRolesEquipe().map((r) => `<option value="${r.id}" ${a.role_equipe === r.id ? 'selected' : ''}>${_esc(r.label)}</option>`).join('')}
         </select>`
      : `<select class="form-control pcfg-acteur-id">
           <option value="">${te('proc_acteur_non_designe')}</option>
           ${inspecteurs.map((u) => {
            const nom = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.nom || u.id;
            return `<option value="${u.id}" ${a.acteur_id === u.id ? 'selected' : ''}>${_esc(nom)}</option>`;
          }).join('')}
         </select>`);
  return `
  <div class="pcfg-acteur" data-index="${i}">
    <select class="form-control pcfg-role" onchange="execProcCfgRoleChange(this)">
      ${EXEC_PROC_ROLES.map((r) => `<option value="${r.id}" ${a.role === r.id ? 'selected' : ''}>${_esc(r.label)}</option>`).join('')}
    </select>
    <input type="text" class="form-control pcfg-role-libre" placeholder="${_escAttr(te('proc_role_libre'))}"
           value="${_escAttr(a.role_libre || '')}" ${a.role === 'autre' ? '' : 'hidden'}>
    ${cible}
    <button type="button" class="btn btn-sm btn-outline btn-icon-only" style="color:#dc2626;border-color:#dc2626;"
            onclick="execProcCfgRetirerActeur(this)" title="${_escAttr(te('supprimer'))}">${EXEC_ICONS.x}</button>
  </div>`;
}

// Changer de rôle change la nature de la cible : poste, rôle d'équipe ou
// personne. On refait le tableau plutôt que de bricoler la ligne en place.
window.execProcCfgRoleChange = function (select) {
  const c = EXEC_PROC_CFG.edite;
  const libre = select.parentElement.querySelector('.pcfg-role-libre');
  if (libre) libre.hidden = select.value !== 'autre';
  if (!c) return;
  c.acteurs = _execProcCfgLire();
  document.getElementById('pcfg_etapes').innerHTML = _execProcCfgEtapesHtml(c);
};

window.execProcCfgAjouterActeur = function (cle) {
  const c = EXEC_PROC_CFG.edite;
  if (!c) return;
  c.acteurs = _execProcCfgLire();
  c.acteurs[cle] = [...(c.acteurs[cle] || []), { role: 'responsable_activite', acteur_id: '', role_libre: '' }];
  document.getElementById('pcfg_etapes').innerHTML = _execProcCfgEtapesHtml(c);
};

window.execProcCfgRetirerActeur = function (bouton) {
  const c = EXEC_PROC_CFG.edite;
  bouton.closest('.pcfg-acteur')?.remove();
  if (c) c.acteurs = _execProcCfgLire();
  const hote = document.getElementById('pcfg_etapes');
  if (hote && c) hote.innerHTML = _execProcCfgEtapesHtml(c);
};

// Relit le tableau depuis le DOM : la saisie n'est jamais perdue quand le
// formulaire se recompose (ajout d'acteur, changement de type).
function _execProcCfgLire() {
  const acteurs = {};
  document.querySelectorAll('#pcfg_etapes .pcfg-etape').forEach((bloc) => {
    const cle = bloc.dataset.cle;
    const liste = [...bloc.querySelectorAll('.pcfg-acteur')].map((ligne) => {
      const role = (ligne.querySelector('.pcfg-role') || {}).value || '';
      const libre = (ligne.querySelector('.pcfg-role-libre') || {}).value || '';
      const acteurId = (ligne.querySelector('.pcfg-acteur-id') || {}).value || '';
      const posteId = (ligne.querySelector('.pcfg-poste') || {}).value || '';
      const roleEquipe = (ligne.querySelector('.pcfg-role-equipe') || {}).value || '';
      const u = (EXEC_STATE.data.inspecteurs || []).find((x) => x.id === acteurId);
      const o = _execProcPostes().find((x) => x.id === posteId);
      // Rôle d'équipe laissé vide : toute l'équipe est acteur de l'étape.
      const re = _execProcRolesEquipe().find((x) => x.id === roleEquipe);
      return {
        role,
        role_libre: role === 'autre' ? libre : '',
        acteur_id: acteurId,
        acteur_nom: u ? (`${u.prenom || ''} ${u.nom || ''}`.trim() || u.nom || '') : '',
        poste_id: posteId,
        poste_nom: o ? _execProcPosteLibelle(o) : '',
        role_equipe: roleEquipe,
        role_equipe_nom: re ? re.label : '',
      };
    });
    if (liste.length) acteurs[cle] = liste;
  });
  return acteurs;
}

window.execProcCfgEnregistrer = async function () {
  const c = EXEC_PROC_CFG.edite;
  const err = document.getElementById('pcfg_erreur');
  const val = (id) => (document.getElementById(id) || {}).value || '';
  const corps = {
    libelle: val('pcfg_libelle').trim(),
    type: val('pcfg_type'),
    domaine_id: val('pcfg_domaine'),
    secteur_id: val('pcfg_secteur'),
    description: val('pcfg_description'),
    acteurs: _execProcCfgLire(),
  };
  if (!corps.libelle) { err.textContent = te('proc_libelle_requis'); return; }
  try {
    if (c && c.id) await api(`${EXEC_MODULE_API}/processus/${c.id}`, { method: 'PUT', body: JSON.stringify(corps) });
    else await api(`${EXEC_MODULE_API}/processus`, { method: 'POST', body: JSON.stringify(corps) });
    execCloseSlider();
    await execProcCfgCharger();
    _execToast(te('proc_enregistre'), 'success');
  } catch (e) {
    err.textContent = (e && e.message) || te('action_impossible');
  }
};

// Duplication : le processus copié sert de patron. Le nouvel intitulé et le
// secteur visé sont demandés d'emblée — c'est ce qui change le plus souvent.
window.execProcCfgDupliquer = async function (id) {
  const src = EXEC_PROC_CFG.liste.find((x) => x.id === id);
  if (!src) return;
  const secteurs = EXEC_STATE.data.secteurs || [];
  const corps = `
  <div class="exec-proc-bloc">
    <p class="exec-ajust-intro">${te('proc_dupliquer_intro').replace('{source}', _esc(src.libelle))}</p>
    <label class="form-label" for="pcfg_dup_libelle">${te('proc_libelle')}</label>
    <input type="text" class="form-control" id="pcfg_dup_libelle" value="${_escAttr(src.libelle + ' (copie)')}">
    <label class="form-label" for="pcfg_dup_secteur">${te('secteur_label')}</label>
    <select class="form-control" id="pcfg_dup_secteur">
      <option value="">—</option>
      ${secteurs.map((s) => `<option value="${s.id}" ${src.secteur_id === s.id ? 'selected' : ''}>${_esc((s.code ? s.code + ' - ' : '') + (s.nom || ''))}</option>`).join('')}
    </select>
    <p class="exec-proc-erreur" id="pcfg_dup_erreur"></p>
  </div>`;
  const pied = `
    <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel')}</button>
    <button class="btn btn-primary" onclick="execProcCfgDupliquerValider('${id}')">
      ${EXEC_ICONS.file || ''} ${te('proc_dupliquer')}
    </button>`;
  execShowSlider(`${EXEC_ICONS.file || ''} ${te('proc_dupliquer')}`, corps, pied, 'third');
};

window.execProcCfgDupliquerValider = async function (id) {
  const err = document.getElementById('pcfg_dup_erreur');
  const libelle = ((document.getElementById('pcfg_dup_libelle') || {}).value || '').trim();
  if (!libelle) { err.textContent = te('proc_libelle_requis'); return; }
  try {
    await api(`${EXEC_MODULE_API}/processus/${id}/dupliquer`, {
      method: 'POST',
      body: JSON.stringify({ libelle, secteur_id: (document.getElementById('pcfg_dup_secteur') || {}).value || '' }),
    });
    execCloseSlider();
    await execProcCfgCharger();
    _execToast(te('proc_duplique'), 'success');
  } catch (e) {
    err.textContent = (e && e.message) || te('action_impossible');
  }
};

window.execProcCfgSupprimer = async function (id) {
  const p = EXEC_PROC_CFG.liste.find((x) => x.id === id);
  const ok = await execProcConfirmer({
    titre: te('proc_supprimer'),
    message: te('proc_supprimer_message').replace('{libelle}', (p && p.libelle) || ''),
    libelle: te('supprimer'),
  });
  if (!ok) return;
  try {
    await api(`${EXEC_MODULE_API}/processus/${id}`, { method: 'DELETE' });
    await execProcCfgCharger();
    _execToast(te('proc_supprime'), 'success');
  } catch (e) {
    _execToast((e && e.message) || te('action_impossible'), 'error');
  }
};

window.execRenderProcessus = execRenderProcessus;
window._execPeutProcessus = _execPeutProcessus;
window.EXEC_PROC_CFG = EXEC_PROC_CFG;
