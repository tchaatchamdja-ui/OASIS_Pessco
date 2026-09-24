/* OASIS — portail : les instances du dispositif.
   Deux portées de super-administration, le bandeau qui nomme l'instance
   regardée, et l'écran qui les ouvre, les met en sommeil ou les supprime.
   Chargé après app.js, dont il emploie `api`, `esc`, `icon` et `showToast`.
   ─────────────────────────────────────────────────────────────────────── */

// ── Deux portées de super-administration ──
// Le régional administre toutes les instances et passe de l'une à l'autre en
// barre supérieure ; le national n'administre que la sienne. Un compte dont la
// portée n'est pas déclarée est régional — c'est ce qu'étaient tous les
// super-administrateurs avant que la distinction n'existe.
const PORTEE_LABELS = { regionale: 'SuperAdmin régional', nationale: 'SuperAdmin national' };
const porteeDe = (u) => (String((u || {}).portee || '') === 'nationale' ? 'nationale' : 'regionale');
// Qui peut désigner la portée d'un autre : le régional seul.
const jeSuisRegional = () => ME.user.role === 'SUPERADMIN'
  && porteeDe(ME.user) === 'regionale';

// Bloc « portée de super-administration », commun aux deux formulaires. Il ne
// s'affiche qu'au régional — lui seul désigne les autres — et seulement quand
// le rôle retenu est SuperAdmin. L'instance n'est demandée que pour un
// national : le régional les administre toutes.
function porteeFieldsHtml(prefixe, u) {
  if (!jeSuisRegional()) return '';
  const p = porteeDe(u);
  const inst = (u && u.instance) || (ME.instance_vue || {}).courante || ME.instance.etat;
  const listeInst = ((ME.instance_vue || {}).instances) || [];
  return `
  <div id="${prefixe}PorteeWrap" style="display:none;">
    <div class="shell-form-group" style="margin-bottom:1rem;">
      <label>${t('portee_super_admin')}</label>
      <select class="shell-input" id="${prefixe}Portee">
        <option value="regionale" ${p === 'regionale' ? 'selected' : ''}>${t('superadmin_regional')}</option>
        <option value="nationale" ${p === 'nationale' ? 'selected' : ''}>${t('superadmin_national')}</option>
      </select>
    </div>
    <div class="shell-form-group" id="${prefixe}InstanceWrap" style="margin-bottom:1rem;">
      <label>${t('instance_administree')}</label>
      <select class="shell-input" id="${prefixe}Instance">
        ${listeInst.map((e) => `<option value="${esc(e)}" ${e === inst ? 'selected' : ''}>${esc(e)}</option>`).join('')}
      </select>
    </div>
  </div>`;
}

// Le bloc suit le rôle choisi, et l'instance ne se demande qu'au national.
function brancherPortee(prefixe, selectRole) {
  const wrap = document.getElementById(`${prefixe}PorteeWrap`);
  if (!wrap) return;
  const sel = document.getElementById(`${prefixe}Portee`);
  const instWrap = document.getElementById(`${prefixe}InstanceWrap`);
  const majAffichage = () => {
    wrap.style.display = selectRole.value === 'SUPERADMIN' ? '' : 'none';
    instWrap.style.display = sel.value === 'nationale' ? '' : 'none';
  };
  selectRole.addEventListener('change', majAffichage);
  sel.addEventListener('change', majAffichage);
  majAffichage();
}

// ── Instance regardée ──
// OASIS s'installe une fois par État : le bandeau nomme celle dont on tient le
// poste. Le super-administrateur de l'Union en change ici, et le choix vaut
// aussitôt pour le portail comme pour les six modules — organismes,
// inspecteurs, comptes, plans, dossiers et carences suivent. Les autres
// comptes lisent la leur, sans en changer.
const PORTAIL_VUE_REGIONALE = 'Vue régionale (toutes les instances)';

function majBandeauInstance() {
  const zone = document.getElementById('instanceBadge');
  if (!zone) return;
  const vue = ME.instance_vue || {};
  if (!vue.disponible || !(vue.instances || []).length) {
    // L'instance du compte, non celle installée ici : le super-administrateur
    // national du Togo travaille au Togo, quel que soit l'État sur lequel le
    // déploiement a été posé. Le bigramme suit l'AAC de cette instance ; une
    // instance qu'on n'a pas encore renseignée n'en a pas, et le nom suffit.
    const etat = vue.courante || ME.instance.etat;
    const code = (ME.aac && ME.aac.bigramme)
      || (etat === ME.instance.etat ? ME.instance.codeEtat : '');
    zone.className = 'portal-header-instance';
    zone.textContent = code ? `${etat} (${code})` : etat;
    return;
  }
  const options = [{ valeur: '', libelle: PORTAIL_VUE_REGIONALE }]
    .concat(vue.instances.map((e) => ({ valeur: e, libelle: e })))
    // Ouvrir une instance depuis la liste elle-même : c'est là qu'on constate
    // qu'elle manque.
    .concat([{ valeur: '__nouvelle__', libelle: '＋ Nouvelle instance…' }]);
  zone.className = 'portal-header-instance portal-header-instance-choix';
  zone.innerHTML = `<select id="instanceSelect" title="${t('instance_regardee')}"
      aria-label="${t('instance_regardee')}">${options.map((o) =>
    `<option value="${esc(o.valeur)}"${o.valeur === (vue.courante || '') ? ' selected' : ''}>${esc(o.libelle)}</option>`).join('')}</select>`;
  document.getElementById('instanceSelect').onchange = (e) => changerInstance(e.target.value);
}

async function changerInstance(valeur) {
  const vue = ME.instance_vue || {};
  if (valeur === '__nouvelle__') return ouvrirInstance();
  if ((vue.courante || '') === (valeur || '')) return;
  const res = await api('/api/instance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instance: valeur }),
  });
  if (!res.ok) {
    showToast(t('instance_changement_impossible'), 'error');
    majBandeauInstance();
    return;
  }
  // L'instance commande le périmètre de tous les écrans : on recharge le
  // portail plutôt que de rafraîchir liste après liste.
  window.location.reload();
}

// Une instance nouvelle part vide : ni organismes, ni inspecteurs, ni
// nomenclatures. Son super-administrateur national la garnira.
async function ouvrirInstance() {
  const nom = (window.prompt('Nom de la nouvelle instance (l’État) :') || '').trim();
  majBandeauInstance();
  if (!nom) return;
  const res = await api('/api/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    showToast(d.error === 'portee_nationale' ? t('reserve_superadmin_regional')
      : oasisMessageErreur(d, res.status, t('nom_instance_invalide')), 'error');
    return;
  }
  ME.instance_vue = { ...(ME.instance_vue || {}), instances: d.instances };
  majBandeauInstance();
  showToast(t('instance_ouverte', nom), 'success');
  if (CFG_SUB === 'instances') { await cfgChargerInstances(); renderConfig(); }
}

// ── Instances du dispositif ──
// Le régional les ouvre, les met en sommeil, et supprime celles qui ne portent
// rien. Une instance désactivée garde ses données mais ne se prend plus en
// barre et ne laisse plus entrer les siens ; une instance supprimée l'est sans
// retour, d'où le refus dès qu'un enregistrement s'y rattache.
let CFG_INSTANCES = [];

async function cfgChargerInstances() {
  const res = await api('/api/instances');
  CFG_INSTANCES = res.ok ? await res.json() : [];
}

function cfgSectionInstances() {
  const rows = CFG_INSTANCES.map((i) => `
    <tr class="${i.active ? '' : 'row-inactive'}">
      <td><strong>${esc(i.nom)}</strong>${i.locale ? ' <span class="shell-badge badge-neutral">' + t('installee_ici') + '</span>' : ''}</td>
      <td>${esc(i.aac) || '<span style="color:var(--text-muted);">—</span>'}</td>
      <td>${i.donnees ? `${i.donnees} enregistrement(s)` : '<span style="color:var(--text-muted);">vide</span>'}</td>
      <td>${i.active ? '<span class="shell-badge badge-active">Active</span>' : '<span class="shell-badge badge-inactive">' + t('desactivee') + '</span>'}</td>
      <td class="actions-cell">
        ${i.locale ? '<span style="color:var(--text-muted);font-size:.75rem;">—</span>' : `
        <button class="shell-btn-icon" onclick="basculerInstance(${escArg(i.nom)})" title="${i.active ? 'Désactiver' : 'Réactiver'}" aria-label="${i.active ? 'Désactiver' : 'Réactiver'}">${icon('power', 15)}</button>
        <button class="shell-btn-icon" onclick="supprimerInstance(${escArg(i.nom)})" title="${i.donnees ? 'Suppression impossible : des données y sont rattachées' : 'Supprimer'}" aria-label="${i.donnees ? 'Suppression impossible : des données y sont rattachées' : 'Supprimer'}" ${i.donnees ? 'disabled style="opacity:.35;cursor:default;"' : 'style="color:#dc2626;"'}>${icon('trash', 15)}</button>`}
      </td>
    </tr>`).join('');
  return `
  <div class="portal-page-header">
    <h3>Instances <span class="shell-badge badge-neutral">${CFG_INSTANCES.length}</span></h3>
    <div class="portal-page-actions">
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="ouvrirInstance()">${icon('plus', 13)} Nouvelle instance</button>
    </div>
  </div>
  <p style="font-size:.78rem;color:var(--text-muted);margin:0 0 .75rem;">
    Une instance désactivée conserve ses données mais ne se prend plus en barre supérieure,
    et ses comptes ne peuvent plus se connecter. La suppression n'est offerte que si rien ne s'y rattache.
  </p>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr><th>Instance</th><th>AAC</th><th>${t('donnees_col')}</th><th>${t('users_col_status')}</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

window.basculerInstance = async function (nom) {
  const res = await api(`/api/instances/${encodeURIComponent(nom)}/activite`, { method: 'PUT' });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return showToast(d.error === 'instance_locale' ? t('instance_locale_non_desactivable')
    : oasisMessageErreur(d, res.status), 'error');
  showToast(d.active ? t('instance_reactivee', nom) : t('instance_desactivee', nom), 'success');
  await cfgChargerInstances();
  renderConfig();
};

window.supprimerInstance = async function (nom) {
  if (!await oasisConfirmer(t('confirmer_suppr_instance', nom))) return;
  const res = await api(`/api/instances/${encodeURIComponent(nom)}`, { method: 'DELETE' });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    return showToast(d.error === 'instance_non_vide' ? t('instance_non_vide_n', d.donnees)
      : d.error === 'instance_locale' ? t('instance_locale_non_supprimable')
      : oasisMessageErreur(d, res.status), 'error', 4500);
  }
  showToast(t('instance_supprimee', nom), 'success');
  ME.instance_vue = { ...(ME.instance_vue || {}), instances: ((ME.instance_vue || {}).instances || []).filter((e) => e !== nom) };
  majBandeauInstance();
  await cfgChargerInstances();
  renderConfig();
};
