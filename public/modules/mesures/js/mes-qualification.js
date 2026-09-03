/* OASIS / Mesures d'Application — étape « Qualification et Mesures ».
 *
 * L'instance décisionnelle siège sur la carence : elle lit l'investigation,
 * consigne ses réunions, dit si l'infraction est constituée, et arrête le cas
 * échéant les mesures d'application.
 *
 * Troisième fichier du module après mes-app.js et mes-traitement.js, pour la
 * même raison : le garde-fou du smoke refuse un fichier au-delà de 2000 lignes.
 * Il lit l'état commun (MES_STATE) et les utilitaires déclarés par mes-app.js ;
 * il est chargé après eux, et rien ici ne s'exécute au chargement.
 */

const mesQualification = () => (MES_STATE.traitement || {}).qualification || {
    comite_code: '', membres: [], sessions: [], reunions: [],
    infraction_constituee: false, nature: '', caracterisation: '', circonstances: '',
    mesures: [], pieces: [],
};

const mesQualModifiable = () => mesPeutEcrire();

// ── Section B — le rapport d'investigation ──
// Il est repris tel que l'investigation l'a laissé, et le PDF donne
// l'investigation entière : équipe, travaux, éléments collectés, synthèse.
function mesSectionRapportInvestigation() {
    const inv = (MES_STATE.traitement || {}).investigation || {};
    const c = MES_STATE.carenceEnCours || {};
    const lien = `${MES_API}/constatations/${encodeURIComponent(c.id || '')}/rapport-investigation.pdf`;
    return mesSection('B', 'Rapport d’investigation', `
        <div class="mes-champ">
            <label>Résultat de l’investigation</label>
            <div class="mes-lecture">${inv.rapport ? _mesEsc(inv.rapport)
                : '<span class="mes-preuve-vide">Aucun rapport de synthèse n’a été rédigé.</span>'}</div>
        </div>
        <div class="mes-pac-ligne">
            <dt>Investigation soumise</dt>
            <dd>${inv.soumise_le ? `${_mesEsc(mesDate(inv.soumise_le))}${inv.soumise_par
                ? ` · ${_mesEsc(inv.soumise_par)}` : ''}` : '<span class="mes-preuve-vide">—</span>'}</dd>
        </div>
        <a class="btn btn-outline btn-sm" style="margin-top:.6rem;" target="_blank" rel="noopener"
           href="${_mesAttr(lien)}">${MES_ICONS.download} Rapport d’investigation (PDF)</a>
        <p class="mes-preuve-vide" style="margin-top:.3rem;">Le document reprend l’investigation
           entière : équipe, travaux menés, éléments collectés et synthèse.</p>`);
}

// ── Section C — l'instance décisionnelle ──
function mesSectionInstance() {
    const q = mesQualification();
    const off = mesQualModifiable() ? '' : 'disabled';
    const comites = mesComites();

    const membres = (q.membres || []).map((p, i) => `
        <tr data-rang="${i}">
            <td><input class="mes-input" data-champ="nom" value="${_mesAttr(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${_mesAttr(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${_mesAttr(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${_mesAttr(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="Retirer" onclick="mesQualRetirerMembre(${i})">${MES_ICONS.x}</button>`}</td>
        </tr>`).join('');

    const sessions = (q.sessions || []).map((s, i) => `
        <tr data-rang="${i}">
            <td><input type="date" class="mes-input" data-champ="date" value="${_mesAttr(s.date || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="objet" value="${_mesAttr(s.objet || '')}"
                       placeholder="Objet de la réunion" ${off}></td>
            <td class="mes-actions">${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="Retirer" onclick="mesQualRetirerSession(${i})">${MES_ICONS.x}</button>`}</td>
        </tr>`).join('');

    return mesSection('C', 'Instance décisionnelle', `
        <div class="mes-champ">
            <label>Nom de l’instance</label>
            <select class="mes-select" id="mesQualComite" ${off}>
                <option value="">—</option>
                ${comites.map((c) => `<option value="${_mesAttr(c.code)}"
                    ${q.comite_code === c.code ? 'selected' : ''}>${_mesEsc(c.libelle)}</option>`).join('')}
            </select>
            ${comites.length ? '' : `<p class="mes-note">Aucun comité décisionnel n’est paramétré.
                Le menu Paramètres du module en tient la liste.</p>`}
        </div>
        <div class="mes-champ">
            <label>Membres de l’instance</label>
            <div class="mes-table-wrap">
                <table class="mes-table" id="mesQualMembres">
                    <thead><tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Contact</th><th></th></tr></thead>
                    <tbody>${membres || `<tr><td colspan="5" class="mes-preuve-vide">
                        Aucun membre désigné</td></tr>`}</tbody>
                </table>
            </div>
            ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                onclick="mesQualAjouterMembre()">${MES_ICONS.add} Ajouter un membre</button>`}
        </div>
        <div class="mes-champ" style="margin-bottom:0;">
            <label>Dates de session</label>
            <div class="mes-table-wrap">
                <table class="mes-table" id="mesQualSessions">
                    <thead><tr><th style="width:170px;">Date</th><th>Objet de la réunion</th><th></th></tr></thead>
                    <tbody>${sessions || `<tr><td colspan="3" class="mes-preuve-vide">
                        Aucune session enregistrée</td></tr>`}</tbody>
                </table>
            </div>
            ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                onclick="mesQualAjouterSession()">${MES_ICONS.add} Ajouter une date</button>`}
        </div>`);
}

// ── Section D — la qualification ──
function mesSectionQualification() {
    const q = mesQualification();
    const off = mesQualModifiable() ? '' : 'disabled';
    const constituee = !!q.infraction_constituee;

    const reunions = (q.reunions || []).map((r, i) => `
        <div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${r.date ? _mesEsc(mesDate(r.date)) : 'Réunion'}${
                    r.objet ? ` — ${_mesEsc(r.objet)}` : ''}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer ce bloc"
                    onclick="mesQualRetirerReunion(${i})">${MES_ICONS.x}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>Date de la réunion</label>
                        <input type="date" class="mes-input" data-champ="date" value="${_mesAttr(r.date || '')}" ${off}>
                    </div>
                    <div class="mes-champ">
                        <label>Objet</label>
                        <input class="mes-input" data-champ="objet" value="${_mesAttr(r.objet || '')}"
                               placeholder="Objet de la réunion tenue" ${off}>
                    </div>
                </div>
                <div class="mes-champ" style="margin-bottom:0;">
                    <label>Résultat de la réunion</label>
                    <textarea class="mes-input" data-champ="resultat" rows="3" ${off}
                              placeholder="Ce que la réunion a établi">${_mesEsc(r.resultat || '')}</textarea>
                </div>
            </div>
        </div>`).join('');

    return mesSection('D', 'Qualification de l’infraction', `
        <div id="mesQualReunions">${reunions
            || '<p class="mes-preuve-vide">Aucune réunion consignée</p>'}</div>
        ${off ? '' : `<div class="mes-actions-rang">
            <button class="btn btn-outline btn-sm" onclick="mesQualAjouterReunion()">
                ${MES_ICONS.add} Ajouter une réunion</button>
            <button class="btn btn-outline btn-sm" onclick="mesEnregistrerQualification()">
                ${MES_ICONS.check} Enregistrer</button>
        </div>`}
        <label class="mes-case" style="margin-top:.9rem;">
            <input type="checkbox" id="mesQualConstituee" ${constituee ? 'checked' : ''} ${off}
                   onchange="mesQualBasculerInfraction(this.checked)">
            <span>Infraction constituée</span>
        </label>
        ${constituee ? `
        <div class="mes-champ" style="margin-top:.6rem;">
            <label>Nature de l’infraction</label>
            <input class="mes-input" id="mesQualNature" value="${_mesAttr(q.nature || '')}" ${off}
                   placeholder="Ce qui est reproché">
        </div>
        <div class="mes-deux-colonnes">
            <div class="mes-champ">
                <label>Caractérisation de l’infraction</label>
                <textarea class="mes-input" id="mesQualCaracterisation" rows="5" ${off}
                          placeholder="Les éléments qui la constituent">${_mesEsc(q.caracterisation || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>Circonstances atténuantes</label>
                <textarea class="mes-input" id="mesQualCirconstances" rows="5" ${off}
                          placeholder="Ce qui en atténue la portée">${_mesEsc(q.circonstances || '')}</textarea>
            </div>
        </div>` : ''}`);
}

// ── Section E — les mesures arrêtées ──
// Elle ne s'ouvre que si l'infraction est constituée : sans infraction, il n'y
// a pas de mesure d'application à prendre.
function mesSectionMesuresArretees() {
    const q = mesQualification();
    if (!q.infraction_constituee) {
        return mesSection('E', 'Mesures d’application',
            `<p class="mes-preuve-vide">Aucune mesure ne se prend tant que l’infraction n’est pas
             constituée. Cochez « Infraction constituée » à la section précédente.</p>`);
    }
    const off = mesQualModifiable() ? '' : 'disabled';
    const cats = mesCategories();

    const blocs = (q.mesures || []).map((m, i) => {
        const libelleCat = (cats.find((c) => c.code === m.categorie) || {}).libelle || 'Mesure';
        const types = mesTypesDe(m.categorie);
        return `<div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${_mesEsc(libelleCat)}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer cette mesure"
                    onclick="mesQualRetirerMesure(${i})">${MES_ICONS.x}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>Catégorie de mesure</label>
                        <select class="mes-select" data-champ="categorie" ${off}
                                onchange="mesQualCategorieMesure(${i}, this.value)">
                            <option value="">—</option>
                            ${cats.map((c) => `<option value="${_mesAttr(c.code)}"
                                ${m.categorie === c.code ? 'selected' : ''}>${_mesEsc(c.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>Type de mesure</label>
                        <select class="mes-select" data-champ="type_mesure" ${off}>
                            <option value="">—</option>
                            ${types.map((t) => `<option value="${_mesAttr(t.code)}"
                                ${m.type_mesure === t.code ? 'selected' : ''}>${_mesEsc(t.libelle)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mes-champ" style="margin-bottom:0;">
                    <label>Commentaire</label>
                    <textarea class="mes-input" data-champ="commentaire" rows="3" ${off}
                              placeholder="Ce qui motive la mesure">${_mesEsc(m.commentaire || '')}</textarea>
                </div>
            </div>
        </div>`;
    }).join('');

    const pieces = (q.pieces || []).map((p, i) => `
        <div class="mes-preuve" data-chemin="${_mesAttr(p.path || '')}">
            <input class="mes-input" value="${_mesAttr(p.nom || '')}" placeholder="Intitulé de la pièce" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="Ouvrir">${MES_ICONS.download}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer"
                onclick="mesQualRetirerPiece(${i})">${MES_ICONS.x}</button>`}
        </div>`).join('');

    return mesSection('E', 'Mesures d’application', `
        <div id="mesQualMesures">${blocs || '<p class="mes-preuve-vide">Aucune mesure arrêtée</p>'}</div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
            onclick="mesQualAjouterMesure()">${MES_ICONS.add} Ajouter une mesure</button>`}
        <div class="mes-champ" style="margin-top:.9rem;margin-bottom:0;">
            <label>Décision de l’instance</label>
            <div id="mesQualPieces">${pieces || '<div class="mes-preuve-vide">Aucune pièce</div>'}</div>
            ${off ? '' : `<input type="file" id="mesQualFichier" multiple style="display:none;"
                    onchange="mesQualTeleverser(this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesQualFichier').click()">
                    ${MES_ICONS.add} Ajouter une pièce</button>`}
        </div>`);
}

// ══════════════════════════════════════
//  Saisie : relevé, ajouts, retraits
// ══════════════════════════════════════

function mesCollecterQualification() {
    if (!document.getElementById('mesQualComite')) return null;
    const val = (racine, champ) => ((racine.querySelector(`[data-champ="${champ}"]`) || {}).value || '');
    const lignes = (sel) => [...document.querySelectorAll(sel)];
    const coche = document.getElementById('mesQualConstituee');
    const txt = (id) => (document.getElementById(id) || {}).value || '';
    return {
        comite_code: (document.getElementById('mesQualComite') || {}).value || '',
        membres: lignes('#mesQualMembres tbody tr[data-rang]').map((tr) => ({
            nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
            email: val(tr, 'email'), contact: val(tr, 'contact'),
        })),
        sessions: lignes('#mesQualSessions tbody tr[data-rang]').map((tr) => ({
            date: val(tr, 'date'), objet: val(tr, 'objet'),
        })),
        reunions: lignes('#mesQualReunions .mes-bloc').map((b) => ({
            date: val(b, 'date'), objet: val(b, 'objet'), resultat: val(b, 'resultat'),
        })),
        infraction_constituee: !!(coche && coche.checked),
        nature: txt('mesQualNature'),
        caracterisation: txt('mesQualCaracterisation'),
        circonstances: txt('mesQualCirconstances'),
        mesures: lignes('#mesQualMesures .mes-bloc').map((b) => ({
            categorie: val(b, 'categorie'), type_mesure: val(b, 'type_mesure'),
            commentaire: val(b, 'commentaire'),
        })),
        pieces: lignes('#mesQualPieces .mes-preuve').map((r) => ({
            nom: (r.querySelector('input') || {}).value || '', path: r.dataset.chemin || '',
        })),
    };
}

const mesMajQualification = () => {
    const saisi = mesCollecterQualification();
    if (saisi) MES_STATE.traitement = { ...(MES_STATE.traitement || {}), qualification: saisi };
};

const mesQualRedessiner = () => mesAfficherSlider({ anime: false });

// Un ajout ou un retrait relève la saisie en cours avant de redessiner : rien
// de ce qui est tapé ne se perd.
function mesQualModifier(action) {
    mesMajQualification();
    const q = mesQualification();
    action(q);
    MES_STATE.traitement.qualification = q;
    mesQualRedessiner();
}

const mesQualAjouterMembre = () => mesQualModifier((q) => q.membres.push({ nom: '', prenom: '', email: '', contact: '' }));
const mesQualRetirerMembre = (i) => mesQualModifier((q) => { q.membres = q.membres.filter((_, k) => k !== i); });
const mesQualAjouterSession = () => mesQualModifier((q) => q.sessions.push({ date: '', objet: '' }));
const mesQualRetirerSession = (i) => mesQualModifier((q) => { q.sessions = q.sessions.filter((_, k) => k !== i); });
const mesQualAjouterReunion = () => mesQualModifier((q) => q.reunions.push({ date: '', objet: '', resultat: '' }));
const mesQualRetirerReunion = (i) => mesQualModifier((q) => { q.reunions = q.reunions.filter((_, k) => k !== i); });
const mesQualAjouterMesure = () => mesQualModifier((q) => q.mesures.push({
    categorie: (mesCategories()[0] || {}).code || '', type_mesure: '', commentaire: '',
}));
const mesQualRetirerMesure = (i) => mesQualModifier((q) => { q.mesures = q.mesures.filter((_, k) => k !== i); });
const mesQualRetirerPiece = (i) => mesQualModifier((q) => { q.pieces = q.pieces.filter((_, k) => k !== i); });

// Cocher « Infraction constituée » ouvre les trois champs de qualification et
// la section des mesures ; la décocher les referme.
const mesQualBasculerInfraction = (coche) => mesQualModifier((q) => { q.infraction_constituee = !!coche; });

// Changer de catégorie vide le type : les types sont propres à leur catégorie.
const mesQualCategorieMesure = (i, code) => mesQualModifier((q) => {
    if (q.mesures[i]) { q.mesures[i].categorie = code; q.mesures[i].type_mesure = ''; }
});

async function mesQualTeleverser(fichiers) {
    if (!fichiers || !fichiers.length) return;
    mesMajQualification();
    const q = mesQualification();
    q.pieces = q.pieces || [];
    for (const f of fichiers) {
        try {
            const corps = new FormData();
            corps.append('file', f);
            const r = await mesApi('/upload', { method: 'POST', body: corps });
            q.pieces.push({ nom: r.filename, path: r.path, size: r.size });
        } catch (e) { mesToast(e.message || 'Dépôt impossible', 'error'); }
    }
    MES_STATE.traitement.qualification = q;
    mesQualRedessiner();
}

async function mesEnregistrerQualification() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    mesMajQualification();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/qualification`, {
            method: 'PUT', body: JSON.stringify(mesQualification()),
        });
        mesToast('Qualification enregistrée');
    } catch (e) { mesToast(e.message || 'Enregistrement impossible', 'error'); }
}

Object.assign(window, {
    mesQualification, mesSectionRapportInvestigation, mesSectionInstance,
    mesSectionQualification, mesSectionMesuresArretees,
    mesQualAjouterMembre, mesQualRetirerMembre,
    mesQualAjouterSession, mesQualRetirerSession,
    mesQualAjouterReunion, mesQualRetirerReunion,
    mesQualAjouterMesure, mesQualRetirerMesure, mesQualCategorieMesure,
    mesQualBasculerInfraction, mesQualTeleverser, mesQualRetirerPiece,
    mesMajQualification, mesEnregistrerQualification,
});
