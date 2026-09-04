/* OASIS / Mesures d'Application — étape « Suivi des Mesures ».
 *
 * Dernière étape du traitement d'une carence. Les mesures ont été arrêtées à
 * la qualification et sont entrées au registre ; il s'agit ici de suivre leur
 * mise en œuvre — ce que le prestataire en a fait, où en est chacune, et ce
 * qu'il en produit comme pièce.
 *
 * Le suivi n'entretient pas de copie des mesures : il écrit sur celles du
 * registre, si bien que le menu « Mesures » lit aussitôt ce qui est saisi ici.
 *
 * Quatrième fichier du module, pour la raison des trois autres : le garde-fou
 * du smoke refuse un fichier au-delà de 2000 lignes. Chargé après eux, il lit
 * l'état commun (MES_STATE) et leurs utilitaires ; rien ici ne s'exécute au
 * chargement.
 */

const mesSuivi = () => (MES_STATE.traitement || {}).suivi || { commentaire_general: '' };
const mesSuiviMesures = () => ((MES_STATE.traitement || {}).mesures) || [];

// Un dossier classé, ou clôturé faute de suivi à conduire, ne se saisit plus :
// l'étape se consulte. Le serveur repose la même garde.
const mesSuiviClos = () => mesTraitementClos() || !!(MES_STATE.traitement || {}).cloture_le;
const mesSuiviModifiable = () => mesPeutEcrire() && !mesSuiviClos();

// ── Section A — ce que la qualification a retenu ──
// La carence et la nature de l'infraction : de quoi se souvenir, en tête de
// l'étape, de ce qui a valu les mesures. Rien n'y est modifiable.
function mesSectionSuiviMesures() {
    const c = MES_STATE.carenceEnCours || {};
    const q = (MES_STATE.traitement || {}).qualification || {};
    return mesSection('A', 'Mesures', `
        <div class="mes-champ">
            <label>Description de la carence</label>
            <div class="mes-lecture">${c.description ? _mesEsc(c.description)
                : '<span class="mes-preuve-vide">—</span>'}</div>
        </div>
        <div class="mes-champ" style="margin-bottom:0;">
            <label>Nature de l’infraction</label>
            <div class="mes-lecture">${q.nature ? _mesEsc(q.nature)
                : '<span class="mes-preuve-vide">—</span>'}</div>
        </div>`);
}

// ── Section B — le plan d'action, mesure par mesure ──
// Un bloc par mesure : à gauche ce que l'instance a arrêté, en lecture ; à
// droite et en dessous, ce que le suivi y ajoute.
function mesBlocSuiviMesure(m, i) {
    const off = mesSuiviModifiable() ? '' : 'disabled';
    const ro = !!off;
    const statut = m.suivi_statut || mesStatutSuivi(m);
    const pieces = (Array.isArray(m.suivi_pieces) ? m.suivi_pieces : []).map((p, k) => `
        <div class="mes-preuve" data-chemin="${_mesAttr(p.path || '')}">
            <input class="mes-input" value="${_mesAttr(p.nom || '')}"
                   placeholder="Intitulé de la pièce" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="Ouvrir">${MES_ICONS.download}</a>` : ''}
            ${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer"
                onclick="mesSuiviRetirerPiece(${i}, ${k})">${MES_ICONS.x}</button>`}
        </div>`).join('');

    return `<div class="mes-bloc" data-rang="${i}" data-mesure="${_mesAttr(m.id || '')}">
        <div class="mes-bloc-entete">
            <span class="mes-bloc-titre">${_mesEsc(m.reference || 'Mesure')}</span>
        </div>
        <div class="mes-bloc-corps">
            <div class="mes-paire">
                <div class="mes-champ">
                    <label>Catégorie de mesure</label>
                    <div class="mes-lecture">${_mesEsc(mesLibelleCategorie(m.categorie) || '—')}</div>
                </div>
                <div class="mes-champ">
                    <label>Type de mesure</label>
                    <div class="mes-lecture">${_mesEsc(mesLibelleType(m.type_mesure) || '—')}</div>
                </div>
            </div>
            <div class="mes-champ">
                <label>Description de la sanction</label>
                <div class="mes-lecture">${m.description ? _mesEsc(m.description)
                    : '<span class="mes-preuve-vide">—</span>'}</div>
            </div>
            <div class="mes-trois">
                <div class="mes-champ">
                    <label>Date de sanction</label>
                    <div class="mes-lecture">${_mesEsc(mesDate(m.date_sanction || m.date_emission))}</div>
                </div>
                <div class="mes-champ">
                    <label>Échéance</label>
                    <div class="mes-lecture">${_mesEsc(mesDate(m.date_echeance))}</div>
                </div>
                <div class="mes-champ">
                    <label>Date de fin de sanction</label>
                    <div class="mes-lecture">${_mesEsc(mesDate(m.date_fin_sanction))}</div>
                </div>
            </div>
            <div class="mes-champ">
                <label>Commentaire de suivi</label>
                <textarea class="mes-input" data-champ="suivi_commentaire" rows="3" ${off}
                          placeholder="Ce que le prestataire en a fait, et ce qui reste dû"
                    >${_mesEsc(m.suivi_commentaire || '')}</textarea>
            </div>
            <div class="mes-champ">
                <div class="mes-champ-entete">
                    <label>Statut de suivi</label>
                    <label class="mes-case">
                        <input type="checkbox" data-champ="recours_intente" ${off}
                               ${m.recours_intente ? 'checked' : ''}
                               onchange="mesSuiviRecours(${i}, this.checked)">
                        <span>Recours intenté par le prestataire</span>
                    </label>
                </div>
                <select class="mes-select" data-champ="suivi_statut" ${off || (m.recours_intente ? 'disabled' : '')}
                        onchange="mesSuiviStatut(${i}, this.value)">
                    ${Object.entries(MES_SUIVI).map(([cle, e]) => `<option value="${_mesAttr(cle)}"
                        ${statut === cle ? 'selected' : ''}>${_mesEsc(e.libelle)}</option>`).join('')}
                </select>
                <p class="mes-note">${_mesEsc((MES_SUIVI[statut] || {}).aide || '')}</p>
            </div>
            <div class="mes-champ" style="margin-bottom:0;">
                <label>Pièces jointes</label>
                <div class="mes-suivi-pieces">${pieces
                    || '<div class="mes-preuve-vide">Aucune pièce</div>'}</div>
                ${ro ? '' : `<input type="file" id="mesSuiviFichier_${i}" multiple style="display:none;"
                        onchange="mesSuiviTeleverser(${i}, this.files)">
                    <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                            onclick="document.getElementById('mesSuiviFichier_${i}').click()">
                        ${MES_ICONS.add} Ajouter une pièce</button>`}
            </div>
        </div>
    </div>`;
}

function mesSectionPlanAction() {
    const off = mesSuiviModifiable() ? '' : 'disabled';
    const mesures = mesSuiviMesures();
    const blocs = mesures.map(mesBlocSuiviMesure).join('');
    return mesSection('B', 'Plan d’action', `
        <div id="mesSuiviMesures">${blocs || `<p class="mes-preuve-vide">Aucune mesure n’est
            rattachée à cette carence : l’étape de qualification n’en a arrêté aucune.</p>`}</div>
        <div class="mes-champ" style="margin-top:.9rem;margin-bottom:0;">
            <label>Commentaire général</label>
            <textarea class="mes-input" id="mesSuiviCommentaire" rows="4" ${off}
                      placeholder="Tout autre commentaire de suivi, qui ne porte sur aucune mesure en particulier"
                >${_mesEsc(mesSuivi().commentaire_general || '')}</textarea>
        </div>`);
}

// ── Saisie ──
// Ce qui est tapé se relève avant tout redessin, comme aux autres étapes :
// ajouter une pièce ou changer un statut ne doit rien perdre.
function mesCollecterSuivi() {
    const racine = document.getElementById('mesSuiviMesures');
    if (!racine) return null;
    const val = (bloc, champ) => {
        const el = bloc.querySelector(`[data-champ="${champ}"]`);
        return el ? String(el.value || '').trim() : '';
    };
    const mesures = [...racine.querySelectorAll('.mes-bloc')].map((bloc) => ({
        id: bloc.dataset.mesure || '',
        suivi_commentaire: val(bloc, 'suivi_commentaire'),
        suivi_statut: val(bloc, 'suivi_statut'),
        recours_intente: !!(bloc.querySelector('[data-champ="recours_intente"]') || {}).checked,
        suivi_pieces: [...bloc.querySelectorAll('.mes-suivi-pieces .mes-preuve')].map((r) => ({
            nom: (r.querySelector('input') || {}).value || '', path: r.dataset.chemin || '',
        })),
    }));
    const zone = document.getElementById('mesSuiviCommentaire');
    return { commentaire_general: zone ? zone.value : '', mesures };
}

// La saisie se replie sur l'état : les mesures du traitement portent ce qui
// vient d'être tapé, et le redessin les retrouve.
const mesMajSuivi = () => {
    const saisi = mesCollecterSuivi();
    if (!saisi) return;
    const parId = new Map(saisi.mesures.map((m) => [m.id, m]));
    const t = MES_STATE.traitement || {};
    MES_STATE.traitement = {
        ...t,
        suivi: { ...(t.suivi || {}), commentaire_general: saisi.commentaire_general },
        mesures: (t.mesures || []).map((m) => (parId.has(m.id) ? { ...m, ...parId.get(m.id) } : m)),
    };
};

const mesSuiviRedessiner = () => mesAfficherSlider({ anime: false });

function mesSuiviModifier(action) {
    mesMajSuivi();
    const t = MES_STATE.traitement || {};
    const mesures = (t.mesures || []).slice();
    action(mesures);
    MES_STATE.traitement = { ...t, mesures };
    mesSuiviRedessiner();
}

// Changer le statut redessine : l'aide qui l'accompagne doit suivre le choix.
const mesSuiviStatut = (i, valeur) => mesSuiviModifier((mesures) => {
    if (mesures[i]) mesures[i] = { ...mesures[i], suivi_statut: valeur };
});

// Un recours suspend le suivi : le statut passe à « Recours » et cesse de se
// choisir, tant que l'instance ne l'a pas examiné. Le décocher rend la main.
const mesSuiviRecours = (i, coche) => mesSuiviModifier((mesures) => {
    if (!mesures[i]) return;
    mesures[i] = {
        ...mesures[i],
        recours_intente: !!coche,
        suivi_statut: coche ? 'recours'
            : (mesures[i].suivi_statut === 'recours' ? '' : mesures[i].suivi_statut),
    };
});

const mesSuiviRetirerPiece = (i, k) => mesSuiviModifier((mesures) => {
    if (!mesures[i]) return;
    const pieces = (mesures[i].suivi_pieces || []).filter((_, n) => n !== k);
    mesures[i] = { ...mesures[i], suivi_pieces: pieces };
});

async function mesSuiviTeleverser(i, fichiers) {
    if (!fichiers || !fichiers.length) return;
    mesMajSuivi();
    const t = MES_STATE.traitement || {};
    const mesures = (t.mesures || []).slice();
    if (!mesures[i]) return;
    const pieces = (mesures[i].suivi_pieces || []).slice();
    for (const f of fichiers) {
        try {
            const corps = new FormData();
            corps.append('file', f);
            const r = await mesApi('/upload', { method: 'POST', body: corps });
            pieces.push({ nom: r.filename, path: r.path, size: r.size });
        } catch (e) { mesToast(e.message || 'Dépôt impossible', 'error'); }
    }
    mesures[i] = { ...mesures[i], suivi_pieces: pieces };
    MES_STATE.traitement = { ...t, mesures };
    mesSuiviRedessiner();
}

async function mesEnregistrerSuivi() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    mesMajSuivi();
    const corps = mesCollecterSuivi();
    if (!corps) return;
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/suivi`, {
            method: 'PUT', body: JSON.stringify(corps),
        });
        // Le registre a bougé : la liste des mesures et celle des carences le
        // disent, l'une par ses statuts de suivi, l'autre par sa clôture.
        MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`);
        await mesRechargerMesures();
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesToast('Suivi enregistré');
        mesSuiviRedessiner();
    } catch (e) { mesToast(e.message || 'Enregistrement impossible', 'error'); }
}

// Actions de l'étape, à l'extrême droite du fil. Clôturer ferme le dossier ;
// l'action de recours le fait reculer à la qualification, où l'instance
// examinera ce que le prestataire conteste.
function mesActionsSuivi() {
    if (mesSuiviClos()) {
        return `<span class="mes-badge cloturee">Traitement clôturé</span>`;
    }
    if (!mesPeutDecider()) return '';
    const recours = mesSuiviMesures().filter((m) => m.recours_intente).length;
    const bouton = (actif, classe, aide, geste, libelle) => `<button class="btn btn-sm ${classe}"
        ${actif ? '' : 'disabled'} title="${_mesAttr(aide)}"
        onclick="${geste}">${_mesEsc(libelle)}</button>`;
    return [
        bouton(!!recours, 'mes-btn-investiguer',
            recours ? `${recours} mesure(s) contestée(s) : le traitement revient à l’étape
                « Qualification et Mesures » pour examen du recours.`
                : 'Cochez « Recours intenté par le prestataire » sur au moins une mesure.',
            'mesSuiviActionRecours()', 'Action de Recours'),
        bouton(!recours, 'mes-btn-mesure',
            recours ? 'Un recours est en cours d’examen : le dossier ne se clôt pas.'
                : 'Clôt la carence : le suivi des mesures est terminé.',
            'mesSuiviCloturer()', 'Clôturer'),
    ].join('');
}

// Les deux issues enregistrent d'abord ce qui est saisi : le serveur relit le
// suivi pour vérifier qu'un recours a bien été coché.
async function mesSuiviIssue(chemin, confirmation, fait) {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    if (!await mesConfirmerEtape(confirmation)) return;
    mesMajSuivi();
    const corps = mesCollecterSuivi();
    try {
        if (corps) {
            await mesApi(`/constatations/${encodeURIComponent(c.id)}/suivi`, {
                method: 'PUT', body: JSON.stringify(corps),
            });
        }
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/suivi/${chemin}`, { method: 'POST' });
        MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`);
        MES_STATE.etapeVue = '';
        await mesRechargerMesures();
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesToast(fait);
        mesSuiviRedessiner();
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || 'Opération impossible', 'error'); }
}

const mesSuiviCloturer = () => mesSuiviIssue('cloturer', {
    titre: 'Clôturer la carence',
    depuis: 'suivi', vers: '',
    consequence: 'Le suivi des mesures est terminé et le dossier se ferme.',
    points: [
        'Aucun recours n’est pendant sur les mesures de cette carence.',
        'Le dossier est clos : il ne se réécrira plus.',
    ],
    aveu: 'Je confirme que le suivi est terminé.',
    libelle: 'Clôturer', classe: 'mes-btn-mesure',
}, 'Carence clôturée');

const mesSuiviActionRecours = () => mesSuiviIssue('recours', {
    titre: 'Ouvrir l’examen du recours',
    depuis: 'suivi', vers: 'qualification',
    consequence: 'Le fil recule à la qualification, où l’instance examinera la contestation.',
    points: [
        'Une section « Recours » y ouvre un bloc par mesure contestée.',
        'Le suivi des mesures contestées reste suspendu jusqu’à la décision.',
    ],
    aveu: 'Je confirme qu’un recours a été formé.',
    libelle: 'Ouvrir le recours', classe: 'mes-btn-investiguer',
}, 'Recours ouvert : le dossier revient à la qualification');

Object.assign(window, {
    mesSuivi, mesSuiviMesures, mesSuiviClos, mesSuiviModifiable,
    mesActionsSuivi, mesSuiviRecours, mesSuiviCloturer, mesSuiviActionRecours,
    mesSectionSuiviMesures, mesSectionPlanAction,
    mesCollecterSuivi, mesMajSuivi, mesSuiviStatut,
    mesSuiviTeleverser, mesSuiviRetirerPiece, mesEnregistrerSuivi,
});
