/* OASIS — Planification : « Mes Activités »
 *
 * Les activités des plans validés, rangées par responsable. La page répond à
 * une question que le détail d'un plan ne sait pas poser : ce qui attend une
 * personne, tous plans confondus.
 *
 * « Validées et non archivées » : le plan est en vigueur — validé, approuvé
 * par le DG, ou transmis. Un plan archivé, un brouillon, une version
 * remplacée n'y figurent pas.
 *
 * Le filtre « Responsable » s'ouvre sur le compte courant lorsqu'il est
 * inscrit au référentiel des inspecteurs : la page porte son nom, « Mes
 * Activités », et se vide de ce présupposé dès qu'on l'efface.
 */

// Statuts d'un plan en vigueur — les mêmes que côté serveur.
const PLAN_MA_STATUTS = ['valide', 'approuve_dg', 'transmis'];

const PLAN_MA_FILTRES = { responsable: null, prestataire: '', secteur: '', mode: '', du: '', au: '' };

// Le compte courant, retrouvé parmi les inspecteurs par son adresse.
function _planMaMoi() {
    const courriel = String((PLAN_STATE.user || {}).username || '').trim().toLowerCase();
    if (!courriel) return '';
    const i = (PLAN_STATE.data.inspecteurs || [])
        .find((x) => String(x.email || '').trim().toLowerCase() === courriel);
    return i ? i.id : '';
}

const _planMaNomInspecteur = (id) => {
    const i = (PLAN_STATE.data.inspecteurs || []).find((x) => x.id === id);
    if (!i) return '';
    return ((i.nom || '') + ' ' + (i.prenom || '')).trim() || i.email || '';
};

// Activités retenues : celles des plans en vigueur, passées au filtre.
function _planMaActivites() {
    const F = PLAN_MA_FILTRES;
    const plans = {};
    (PLAN_STATE.data.plans || []).forEach((p) => { plans[p.id] = p; });
    return (PLAN_STATE.data.allActivites || [])
        .filter((a) => PLAN_MA_STATUTS.includes(a.plan_statut || (plans[a.plan_id] || {}).statut || ''))
        .filter((a) => (F.responsable === null || !F.responsable ? true : a.responsable_id === F.responsable))
        .filter((a) => (!F.prestataire || a.prestataire_id === F.prestataire))
        .filter((a) => (!F.secteur || a.secteur_id === F.secteur))
        .filter((a) => (!F.mode || a.mode_supervision_id === F.mode))
        // La période retient l'activité qui la chevauche, non celle qui y tient
        // tout entière : une activité à cheval sur deux mois appartient aux deux.
        .filter((a) => (!F.du || String(a.date_fin || '').substring(0, 10) >= F.du))
        .filter((a) => (!F.au || String(a.date_debut || '').substring(0, 10) <= F.au))
        .sort((x, y) => {
            const nx = _planMaNomInspecteur(x.responsable_id) || '￿';
            const ny = _planMaNomInspecteur(y.responsable_id) || '￿';
            return nx.localeCompare(ny)
                || String(x.date_debut || '').localeCompare(String(y.date_debut || ''));
        });
}

// Prestataires offerts au filtre : ceux du secteur retenu. Sans secteur, tous.
// Un prestataire hors référentiel du secteur n'a pas à figurer dans une liste
// qui ne rendrait aucune ligne.
function _planMaPrestataires() {
    const tous = PLAN_STATE.data.prestataires || [];
    const s = PLAN_MA_FILTRES.secteur;
    return s ? tous.filter((p) => p.secteur_id === s) : tous;
}

window.planMaSetFiltre = function (champ, valeur) {
    PLAN_MA_FILTRES[champ] = valeur;
    // Le prestataire retenu peut ne pas appartenir au nouveau secteur : il
    // disparaîtrait de la liste tout en continuant de filtrer en sourdine.
    if (champ === 'secteur' && PLAN_MA_FILTRES.prestataire
        && !_planMaPrestataires().some((p) => p.id === PLAN_MA_FILTRES.prestataire)) {
        PLAN_MA_FILTRES.prestataire = '';
    }
    planRenderPage();
};

window.planMaReinit = function () {
    Object.keys(PLAN_MA_FILTRES).forEach((k) => { PLAN_MA_FILTRES[k] = ''; });
    planRenderPage();
};

window.planMaOuvrir = function (actId) {
    const a = (PLAN_STATE.data.allActivites || []).find((x) => x.id === actId);
    if (!a) return;
    planShowActivityModal(a.plan_id, a.id, { lecture: true });
};

function planRenderMesActivites() {
    // Premier passage : le filtre s'ouvre sur le compte courant.
    if (PLAN_MA_FILTRES.responsable === null) PLAN_MA_FILTRES.responsable = _planMaMoi();
    const F = PLAN_MA_FILTRES;
    const actes = _planMaActivites();
    const cumul = actes.reduce((n, a) => n + (Number(_planDureeEntre(a.date_debut, a.date_fin)) || 0), 0);

    const opt = (v, libelle, retenu) =>
        `<option value="${_esc(v)}" ${retenu === v ? 'selected' : ''}>${_esc(libelle)}</option>`;
    const responsables = (PLAN_STATE.data.inspecteurs || [])
        .map((i) => [i.id, _planMaNomInspecteur(i.id)])
        .filter(([, nom]) => nom)
        .sort((x, y) => x[1].localeCompare(y[1]));

    const lignes = actes.map((a) => {
        const prest = (PLAN_STATE.data.prestataires || []).find((p) => p.id === a.prestataire_id);
        const sect = (PLAN_STATE.data.secteurs || []).find((s) => s.id === a.secteur_id);
        const mode = (PLAN_STATE.data.modesSupervision || []).find((m) => m.id === a.mode_supervision_id);
        const typeS = (PLAN_STATE.data.typesSupervision || []).find((x) => x.id === a.type_supervision_id);
        const duree = _planDureeEntre(a.date_debut, a.date_fin);
        return `<tr class="plan-ma-ligne" onclick="planMaOuvrir('${a.id}')" title="${_esc(tp('activity_detail'))}">
            <td>${_esc(_planMaNomInspecteur(a.responsable_id) || '—')}</td>
            <td>${prest ? _esc(prest.nom) : '—'}</td>
            <td>${_esc(a.objet || a.titre || '—')}</td>
            <td>${sect ? _esc(sect.code + ' - ' + sect.nom) : '—'}</td>
            <td>${mode ? _esc(mode.mode || mode.libelle || '') : '—'} / ${typeS ? _esc(typeS.type_supervision || typeS.libelle || '') : '—'}</td>
            <td>${_esc(a.lieu_activite || '—')}</td>
            <td class="plan-ma-date">${planDateFr(a.date_debut) || '—'}</td>
            <td class="plan-ma-date">${planDateFr(a.date_fin) || '—'}</td>
            <td class="plan-ma-duree">${duree || '—'}</td>
        </tr>`;
    }).join('');

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('nav_mes_activites')}</h2>
            <div class="page-actions">
                <button class="btn btn-primary btn-sm" onclick="planOuvrirCalendrier()">
                    ${PLAN_ICONS.calendar} ${tp('cal_voir_detail')}
                </button>
            </div>
        </div>

        <div class="plan-filter-bar">
            <select class="form-select" onchange="planMaSetFiltre('responsable', this.value)">
                ${opt('', tp('tous_responsables'), F.responsable)}
                ${responsables.map(([id, nom]) => opt(id, nom, F.responsable)).join('')}
            </select>
            <select class="form-select" onchange="planMaSetFiltre('secteur', this.value)">
                ${opt('', tp('tous_secteurs'), F.secteur)}
                ${(PLAN_STATE.data.secteurs || []).map((s) => opt(s.id, s.code + ' - ' + s.nom, F.secteur)).join('')}
            </select>
            <select class="form-select" onchange="planMaSetFiltre('prestataire', this.value)">
                ${opt('', tp('tous_prestataires'), F.prestataire)}
                ${_planMaPrestataires().map((p) => opt(p.id, p.nom, F.prestataire)).join('')}
            </select>
            <select class="form-select" onchange="planMaSetFiltre('mode', this.value)">
                ${opt('', tp('tous_modes'), F.mode)}
                ${(PLAN_STATE.data.modesSupervision || []).map((m) => opt(m.id, m.mode || m.libelle || '', F.mode)).join('')}
            </select>
            <label class="plan-ma-periode">${tp('periode_du')}
                <input type="date" class="form-input" value="${_esc(F.du)}"
                       onchange="planMaSetFiltre('du', this.value)">
            </label>
            <label class="plan-ma-periode">${tp('periode_au')}
                <input type="date" class="form-input" value="${_esc(F.au)}"
                       onchange="planMaSetFiltre('au', this.value)">
            </label>
            <button class="btn-icon-reset" onclick="planMaReinit()"
                    title="${_esc(tp('reset_filters'))}">${PLAN_ICONS.reset}</button>
        </div>

        <div class="card">
            <div class="card-header card-header-flex plan-ma-entete">
                <h3>${tp('activities')} (${actes.length})</h3>
                <span class="plan-ma-cumul">${tp('mes_act_cumul', cumul)}</span>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table plan-ma-table">
                    <colgroup>
                        <col style="width:13%"><col style="width:13%"><col style="width:16%">
                        <col style="width:12%"><col style="width:11%"><col style="width:8%">
                        <col style="width:10%"><col style="width:10%"><col style="width:7%">
                    </colgroup>
                    <thead><tr>
                        <th>${tp('col_responsable')}</th>
                        <th>${tp('provider')}</th>
                        <th>${tp('objet')}</th>
                        <th>${tp('sector')}</th>
                        <th>${tp('col_mode_type')}</th>
                        <th>${tp('col_lieu')}</th>
                        <th>${tp('start_date')}</th>
                        <th>${tp('end_date')}</th>
                        <th>${tp('col_duree')}</th>
                    </tr></thead>
                    <tbody>${lignes || `<tr><td colspan="9" class="text-center text-muted">${tp('mes_act_aucune')}</td></tr>`}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}
