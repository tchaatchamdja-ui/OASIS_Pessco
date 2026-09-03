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
    comite_code: '', membres: [], reunions: [],
    infraction_constituee: false, infraction_non_constituee: false,
    renvoi_demande: false, renvoi_motif: '',
    nature: '', caracterisation: '', circonstances: '',
    mesures: [], pieces: [],
};

const mesQualModifiable = () => mesPeutEcrire();

// ── Section B — le rapport d'investigation ──
// Il est repris tel que l'investigation l'a laissé, et le PDF donne
// l'investigation entière : équipe, travaux, éléments collectés, synthèse.
function mesSectionRapportInvestigation() {
    const t = MES_STATE.traitement || {};
    const inv = t.investigation || {};
    const c = MES_STATE.carenceEnCours || {};
    // La suite à donner peut mener droit ici : « Prendre des mesures » saute
    // l'investigation. La section le dit plutôt que d'offrir un rapport vide
    // et un PDF qui n'a rien à rendre.
    const menee = !!(inv.soumise_le || inv.rapport
        || (inv.travaux || []).length || (inv.equipe || []).length);
    if (!menee) {
        return mesSection('B', 'Rapport d’investigation', `
            <p class="mes-preuve-vide">Aucune investigation n’a été menée sur cette carence :
               la suite à donner est passée directement à la qualification.</p>
            ${t.decision_motif ? `<div class="mes-champ" style="margin-top:.6rem;margin-bottom:0;">
                <label>Motif de la décision</label>
                <div class="mes-lecture">${_mesEsc(t.decision_motif)}</div>
            </div>` : ''}`);
    }
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
        <div class="mes-champ" style="margin-bottom:0;">
            <label>Membres de l’instance</label>
            <div class="mes-table-wrap">
                <table class="mes-table mes-table-claire" id="mesQualMembres">
                    <thead><tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Contact</th><th></th></tr></thead>
                    <tbody>${membres || `<tr><td colspan="5" class="mes-preuve-vide">
                        Aucun membre désigné</td></tr>`}</tbody>
                </table>
            </div>
            ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                onclick="mesQualAjouterMembre()">${MES_ICONS.add} Ajouter un membre</button>`}
        </div>`);
}

// ── Section D — la qualification ──
function mesSectionQualification() {
    const q = mesQualification();
    const off = mesQualModifiable() ? '' : 'disabled';
    const constituee = !!q.infraction_constituee;

    const nonConstituee = !!q.infraction_non_constituee;
    const renvoi = !!q.renvoi_demande;

    // Les réunions de l'instance : ce que chaque séance a produit. Autant de
    // blocs que de séances tenues.
    const reunions = (q.reunions || []).map((r, i) => `
        <div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${r.date ? _mesEsc(mesDate(r.date)) : 'Réunion'}${
                    r.objet ? ` — ${_mesEsc(r.objet)}` : ''}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer cette réunion"
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

    // Les deux cases disent la même décision par ses deux faces : cocher l'une
    // décoche l'autre. Tant qu'aucune n'est cochée, la qualification n'est pas
    // arrêtée.
    return mesSection('D', 'Qualification de l’infraction', `
        <div id="mesQualReunions">${reunions
            || '<p class="mes-preuve-vide">Aucune réunion consignée</p>'}</div>
        ${off ? '' : `<div class="mes-actions-rang" style="margin-bottom:.9rem;">
            <button class="btn btn-outline btn-sm" onclick="mesQualAjouterReunion()">
                ${MES_ICONS.add} Ajouter une réunion</button>
            <button class="btn btn-outline btn-sm" onclick="mesEnregistrerQualification()">
                ${MES_ICONS.check} Enregistrer</button>
        </div>`}
        <div class="mes-cases-exclusives">
            <label class="mes-case">
                <input type="checkbox" id="mesQualConstituee" ${constituee ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerInfraction(this.checked)">
                <span>Infraction constituée</span>
            </label>
            <label class="mes-case">
                <input type="checkbox" id="mesQualNonConstituee" ${nonConstituee ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerNonInfraction(this.checked)">
                <span>Infraction non constituée</span>
            </label>
            <label class="mes-case">
                <input type="checkbox" id="mesQualRenvoi" ${renvoi ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerRenvoi(this.checked)">
                <span>Renvoyer pour des investigations complémentaires</span>
            </label>
        </div>
        ${renvoi ? `<div class="mes-champ" style="margin-top:.6rem;margin-bottom:0;">
            <label>Investigations complémentaires demandées</label>
            <textarea class="mes-input" id="mesQualRenvoiMotif" rows="4" ${off}
                      placeholder="Ce que l’instance attend de l’équipe d’investigation">${_mesEsc(q.renvoi_motif || '')}</textarea>
        </div>` : ''}
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
        // Une sanction court sur une durée ou sans terme : les deux cases
        // disent la même portée par ses deux faces, elles s'excluent.
        const temporelle = m.portee === 'temporelle';
        const illimitee = m.portee === 'illimitee';
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
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>Date de sanction</label>
                        <input type="date" class="mes-input" data-champ="date_sanction"
                               value="${_mesAttr(m.date_sanction || '')}" ${off}>
                    </div>
                    <div class="mes-champ">
                        <label>Portée</label>
                        <div class="mes-cases-exclusives" style="padding-top:.35rem;">
                            <label class="mes-case">
                                <input type="checkbox" data-champ="temporelle" ${temporelle ? 'checked' : ''} ${off}
                                       onchange="mesQualPorteeMesure(${i}, 'temporelle', this.checked)">
                                <span>Temporelle</span>
                            </label>
                            <label class="mes-case">
                                <input type="checkbox" data-champ="illimitee" ${illimitee ? 'checked' : ''} ${off}
                                       onchange="mesQualPorteeMesure(${i}, 'illimitee', this.checked)">
                                <span>Illimitée</span>
                            </label>
                        </div>
                    </div>
                </div>
                ${temporelle ? `<div class="mes-paire">
                    <div class="mes-champ">
                        <label>Durée de la sanction</label>
                        <div class="mes-duree">
                            <input type="number" min="0" class="mes-input" data-champ="duree_valeur"
                                   value="${_mesAttr(m.duree_valeur || '')}" ${off}
                                   oninput="mesQualDureeVersTerme(${i})">
                            <select class="mes-select" data-champ="duree_unite" ${off}
                                    onchange="mesQualDureeVersTerme(${i})">
                                ${['jours', 'mois'].map((u) => `<option value="${u}"
                                    ${(m.duree_unite || 'jours') === u ? 'selected' : ''}>${u}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="mes-champ">
                        <label>Date de fin de sanction</label>
                        <input type="date" class="mes-input" data-champ="date_fin"
                               value="${_mesAttr(m.date_fin || '')}" ${off}
                               onchange="mesQualTermeVersDuree(${i})">
                    </div>
                </div>` : ''}
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
        reunions: lignes('#mesQualReunions .mes-bloc').map((b) => ({
            date: val(b, 'date'), objet: val(b, 'objet'), resultat: val(b, 'resultat'),
        })),
        infraction_constituee: !!(coche && coche.checked),
        infraction_non_constituee: !!(document.getElementById('mesQualNonConstituee') || {}).checked,
        renvoi_demande: !!(document.getElementById('mesQualRenvoi') || {}).checked,
        renvoi_motif: (document.getElementById('mesQualRenvoiMotif') || {}).value || '',
        nature: txt('mesQualNature'),
        caracterisation: txt('mesQualCaracterisation'),
        circonstances: txt('mesQualCirconstances'),
        mesures: lignes('#mesQualMesures .mes-bloc').map((b) => {
            const coche = (champ) => !!(b.querySelector(`[data-champ="${champ}"]`) || {}).checked;
            const portee = coche('temporelle') ? 'temporelle' : (coche('illimitee') ? 'illimitee' : '');
            return {
                categorie: val(b, 'categorie'), type_mesure: val(b, 'type_mesure'),
                date_sanction: val(b, 'date_sanction'), portee,
                // Durée et terme n'ont de sens que pour une sanction temporelle.
                duree_valeur: portee === 'temporelle' ? Number(val(b, 'duree_valeur')) || 0 : 0,
                duree_unite: portee === 'temporelle' ? (val(b, 'duree_unite') || 'jours') : '',
                date_fin: portee === 'temporelle' ? val(b, 'date_fin') : '',
                commentaire: val(b, 'commentaire'),
            };
        }),
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
const mesQualAjouterReunion = () => mesQualModifier((q) => q.reunions.push({ date: '', objet: '', resultat: '' }));
const mesQualRetirerReunion = (i) => mesQualModifier((q) => { q.reunions = q.reunions.filter((_, k) => k !== i); });
const mesQualAjouterMesure = () => mesQualModifier((q) => q.mesures.push({
    categorie: (mesCategories()[0] || {}).code || '', type_mesure: '',
    date_sanction: '', portee: '', duree_valeur: '', duree_unite: 'jours',
    date_fin: '', commentaire: '',
}));

// ── Durée et terme : chacun se déduit de l'autre ──
// La date de sanction sert d'ancre. Poser la durée fixe le terme ; poser le
// terme donne la durée. Les deux champs restent d'accord sans que l'agent ait
// à faire le calcul.
function mesAjouterDuree(depart, valeur, unite) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(depart || '') || !valeur) return '';
    const d = new Date(`${depart}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    if (unite === 'mois') {
        const jour = d.getUTCDate();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + valeur);
        // Trois mois après le 31 janvier tombent au 30 avril : on ne déborde
        // pas sur le mois suivant.
        const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        d.setUTCDate(Math.min(jour, dernier));
    } else {
        d.setUTCDate(d.getUTCDate() + valeur);
    }
    return d.toISOString().slice(0, 10);
}

const mesBloc = (i) => document.querySelectorAll('#mesQualMesures .mes-bloc')[i];
const mesChampBloc = (i, champ) => (mesBloc(i) || document).querySelector(`[data-champ="${champ}"]`);

// La durée vient d'être saisie : le terme suit.
function mesQualDureeVersTerme(i) {
    const depart = (mesChampBloc(i, 'date_sanction') || {}).value || '';
    const valeur = Number((mesChampBloc(i, 'duree_valeur') || {}).value) || 0;
    const unite = (mesChampBloc(i, 'duree_unite') || {}).value || 'jours';
    const fin = mesChampBloc(i, 'date_fin');
    if (!fin) return;
    if (!depart) {
        mesToast('Renseignez d’abord la date de sanction', 'warning');
        return;
    }
    fin.value = mesAjouterDuree(depart, valeur, unite);
}

// Le terme vient d'être posé : la durée s'en déduit, dans l'unité retenue.
function mesQualTermeVersDuree(i) {
    const depart = (mesChampBloc(i, 'date_sanction') || {}).value || '';
    const fin = (mesChampBloc(i, 'date_fin') || {}).value || '';
    const champ = mesChampBloc(i, 'duree_valeur');
    const unite = (mesChampBloc(i, 'duree_unite') || {}).value || 'jours';
    if (!champ || !depart || !fin) return;
    const d1 = new Date(`${depart}T00:00:00Z`);
    const d2 = new Date(`${fin}T00:00:00Z`);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()) || d2 < d1) { champ.value = ''; return; }
    if (unite === 'mois') {
        let mois = (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth());
        if (d2.getUTCDate() < d1.getUTCDate()) mois -= 1;
        champ.value = String(Math.max(0, mois));
    } else {
        champ.value = String(Math.round((d2 - d1) / 86400000));
    }
}

// Cocher une portée décoche l'autre ; décocher celle qui l'était laisse la
// portée indéterminée.
const mesQualPorteeMesure = (i, portee, coche) => mesQualModifier((q) => {
    if (q.mesures[i]) q.mesures[i].portee = coche ? portee : '';
});
const mesQualRetirerMesure = (i) => mesQualModifier((q) => { q.mesures = q.mesures.filter((_, k) => k !== i); });
const mesQualRetirerPiece = (i) => mesQualModifier((q) => { q.pieces = q.pieces.filter((_, k) => k !== i); });

// Cocher « Infraction constituée » ouvre les trois champs de qualification et
// la section des mesures ; la décocher les referme.
// Les trois faces d'une même décision : cocher l'une décoche les deux autres.
const mesQualBasculerInfraction = (coche) => mesQualModifier((q) => {
    q.infraction_constituee = !!coche;
    if (coche) { q.infraction_non_constituee = false; q.renvoi_demande = false; }
});
const mesQualBasculerNonInfraction = (coche) => mesQualModifier((q) => {
    q.infraction_non_constituee = !!coche;
    if (coche) { q.infraction_constituee = false; q.renvoi_demande = false; }
});
const mesQualBasculerRenvoi = (coche) => mesQualModifier((q) => {
    q.renvoi_demande = !!coche;
    if (coche) { q.infraction_constituee = false; q.infraction_non_constituee = false; }
});

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

// Actions de l'étape, à l'extrême droite du fil. Chacune n'est offerte que si
// la case qui la justifie est cochée : on ne renvoie pas sans l'avoir demandé,
// on ne classe pas une infraction constituée, on ne suit pas ce qui ne l'est
// pas.
function mesActionsQualification() {
    const q = mesQualification();
    if (!mesPeutDecider()) return '';
    const bouton = (actif, classe, aide, geste, libelle) => `<button class="btn btn-sm ${classe}"
        ${actif ? '' : 'disabled'} title="${_mesAttr(aide)}"
        onclick="${geste}">${_mesEsc(libelle)}</button>`;
    return [
        bouton(!!q.renvoi_demande, 'mes-btn-investiguer',
            'Renvoie la carence à l’étape Investigations pour un complément d’enquête. '
            + 'Cochez « Renvoyer pour des investigations complémentaires » pour l’activer.',
            'mesQualRenvoyer()', 'Renvoyer'),
        bouton(!!q.infraction_non_constituee, 'mes-btn-classer-vert',
            'Classe la carence : aucune mesure ne sera prise. '
            + 'Cochez « Infraction non constituée » pour l’activer.',
            'mesQualClasser()', 'Classer'),
        bouton(!!q.infraction_constituee, 'mes-btn-mesure',
            'Passe le traitement à l’étape « Suivi des Mesures ». '
            + 'Cochez « Infraction constituée » pour l’activer.',
            'mesQualSuivi()', 'Valider'),
    ].join('');
}

// Les trois issues enregistrent d'abord ce qui est saisi : la décision s'appuie
// dessus, et le serveur relit la qualification pour vérifier la case cochée.
async function mesQualIssue(chemin, question, fait) {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    if (!confirm(question)) return;
    mesMajQualification();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/qualification`, {
            method: 'PUT', body: JSON.stringify(mesQualification()),
        });
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/qualification/${chemin}`, { method: 'POST' });
        MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`);
        MES_STATE.etapeVue = '';
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesToast(fait);
        mesAfficherSlider({ anime: false });
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || 'Opération impossible', 'error'); }
}

const mesQualRenvoyer = () => mesQualIssue('renvoyer',
    'Renvoyer la carence pour des investigations complémentaires ?\n'
    + 'L’étape Investigations se rouvre et l’équipe y lira ce qui lui est demandé.',
    'Carence renvoyée en investigation');

const mesQualClasser = () => mesQualIssue('classer',
    'Classer la carence ?\nL’infraction n’étant pas constituée, aucune mesure ne sera prise.',
    'Carence classée');

const mesQualSuivi = () => mesQualIssue('suivi',
    'Passer au suivi des mesures ?',
    'Traitement passé au suivi des mesures');

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
    mesQualAjouterReunion, mesQualRetirerReunion,
    mesQualAjouterMesure, mesQualRetirerMesure, mesQualCategorieMesure, mesQualPorteeMesure,
    mesQualDureeVersTerme, mesQualTermeVersDuree, mesAjouterDuree,
    mesQualBasculerInfraction, mesQualBasculerNonInfraction, mesQualBasculerRenvoi,
    mesActionsQualification, mesQualRenvoyer, mesQualClasser, mesQualSuivi,
    mesQualTeleverser, mesQualRetirerPiece,
    mesMajQualification, mesEnregistrerQualification,
});
