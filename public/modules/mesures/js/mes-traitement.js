/* OASIS / Mesures d'Application — traitement d'une carence.
 *
 * Le fil d'avancement, les sections de l'étape « Suite à donner » et celles de
 * l'étape « Investigations ».
 * Séparé de mes-app.js, qui portait déjà la coquille, les cinq écrans et le
 * formulaire de mesure : le fichier passait les 2000 lignes que le garde-fou
 * du smoke refuse.
 *
 * Ce fichier lit l'état commun (MES_STATE) et les utilitaires du module
 * (_mesEsc, mesApi, mesToast…) déclarés par mes-app.js ; il est chargé après
 * lui, et rien ici ne s'exécute au chargement.
 */
// ══════════════════════════════════════
//  Fil d'avancement du traitement d'une carence
// ══════════════════════════════════════
//
// Quatre étapes. « Suite à donner » va du déclenchement du traitement à la
// décision ; « Investigations » rassemble les preuves qui établissent les
// faits ; « Qualification et Mesures » dit si l'infraction est constituée et
// arrête les sanctions ; « Suivi des Mesures » en suit la mise en œuvre.
// Les quatre étapes ne retiennent que leur clé : le nom se lit dans la langue
// retenue, au moment de l'afficher.
const MES_ETAPES = [
    { cle: 'suite' }, { cle: 'investigations' }, { cle: 'qualification' }, { cle: 'suivi' },
];
const mesNomEtape = (cle) => mt(`fil_${cle}`);

// Les trois suites possibles. Classer clôt le traitement ici — la carence
// reste suivie par le plan d'actions de son module d'origine ; les deux autres
// poussent le fil d'un cran.
const MES_DECISIONS = [
    { cle: 'classer', classe: 'mes-btn-classer-vert' },
    { cle: 'investiguer', classe: 'mes-btn-investiguer' },
    { cle: 'mesures', classe: 'mes-btn-mesure' },
];
const mesNomDecision = (cle) => mt(`suite_${cle}`);
const mesAideDecision = (cle) => mt(`suite_${cle}_aide`);

// Les statuts du module d'origine sont des codes de circuit : on les rend
// lisibles ici plutôt que de servir « pac_soumis » à l'agent qui décide.
const MES_STATUTS_ORIGINE = {
    ouverte: 'orig_ouverte', ouvert: 'orig_ouverte',
    pac_soumis: 'orig_pac_soumis', pac_valide: 'orig_pac_valide', pac_rejetee: 'orig_pac_rejetee',
    soldee: 'orig_soldee', cloturee: 'orig_cloturee',
    en_cours: 'orig_en_cours', brouillon: 'orig_brouillon',
};
const mesStatutOrigine = (v) => {
    const code = String(v || '').trim();
    if (!code) return '';
    if (MES_STATUTS_ORIGINE[code]) return mt(MES_STATUTS_ORIGINE[code]);
    // Un code inconnu se lit quand même : les tirets bas deviennent des espaces.
    return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};

// Étape où le traitement en est. L'étape *regardée* peut être antérieure : on
// consulte ce qu'une étape franchie porte sans revenir en arrière.
const mesEtapeAtteinte = () => (MES_STATE.traitement || {}).etape || 'suite';
const mesRangAtteint = () => Math.max(0, MES_ETAPES.findIndex((e) => e.cle === mesEtapeAtteinte()));
const mesEtapeCourante = () => MES_STATE.etapeVue || mesEtapeAtteinte();

function mesVoirEtape(cle) {
    const rang = MES_ETAPES.findIndex((e) => e.cle === cle);
    if (rang < 0 || rang > mesRangAtteint()) return;
    mesMajTraitement();
    MES_STATE.etapeVue = cle;
    mesAfficherSlider({ anime: false });
}

// Ce que chaque étape dit du traitement : où il en est, et de quand.
function mesEtapeInfo(cle) {
    const t = MES_STATE.traitement || {};
    if (cle === 'suite') {
        if (!t.decision) return mt('fil_instruction');
        const d = MES_DECISIONS.find((x) => x.cle === t.decision);
        return mt('fil_decide_le', mesDate(t.decide_le), d ? mesNomDecision(d.cle) : t.decision);
    }
    if (cle === 'investigations') {
        const inv = (t.investigation || {});
        const n = (inv.travaux || []).length;
        if (inv.soumise_le) {
            return inv.soumise_par
                ? mt('fil_soumise_par', mesDate(inv.soumise_le), inv.soumise_par)
                : mt('fil_soumise_le', mesDate(inv.soumise_le));
        }
        if (!n && !(inv.equipe || []).length) return mt('fil_inv_a_ouvrir');
        return mt('fil_enqueteurs', (inv.equipe || []).length, n);
    }
    if (cle === 'suivi') {
        if (t.cloture_le) return mt('fil_cloture_le', mesDate(t.cloture_le));
        const liste = t.mesures || [];
        if (!liste.length) return mt('fil_aucune_a_suivre');
        const soldees = liste.filter((m) => (m.suivi_statut || mesStatutSuivi(m)) === 'solde').length;
        return mt('fil_soldees', soldees, liste.length);
    }
    return mt('fil_a_venir');
}

// Barre du fil : les chevrons à gauche, les actions de l'étape à droite.
function mesFilAvancement() {
    const vue = mesEtapeCourante();
    const rang = MES_ETAPES.findIndex((e) => e.cle === mesEtapeAtteinte());
    const atteint = mesRangAtteint();
    const etapes = MES_ETAPES.map((e, i) => {
        const classe = i < rang ? 'done' : (i === rang ? 'current' : '');
        const atteinte = i <= atteint;
        return `<button type="button"
                    class="eval-step mes-proc-step ${classe}${vue === e.cle ? ' selected' : ''}${
                        atteinte ? '' : ' verrouillee'}"
                    ${atteinte ? '' : 'disabled'}
                    title="${_mesAttr(mesEtapeInfo(e.cle))}"
                    onclick="mesVoirEtape('${_mesAttr(e.cle)}')">${_mesEsc(mesNomEtape(e.cle))}</button>`;
    }).join('');
    return `
    <div class="mes-proc-barre">
        <div class="eval-steps mes-proc-fil">${etapes}</div>
        <div class="mes-proc-actions">${mesEtatEtape()}${mesActionsEtape()}</div>
    </div>`;
}

// L'état de l'étape regardée, en PDF. Un vrai lien, comme ceux des listes : un
// enregistrement lancé par script serait écarté sans bruit une fois l'attente
// du serveur passée, et le rendu d'un document prend quelques secondes.
// Il précède les actions : il se consulte à tout moment, y compris sur une
// étape close, quand les actions ne s'offrent plus.
function mesEtatEtape() {
    const c = MES_STATE.carenceEnCours;
    if (!c || !MES_STATE.traitement) return '';
    const etape = mesEtapeCourante();
    const libelle = MES_ETAPES.some((e) => e.cle === etape) ? mesNomEtape(etape) : '';
    const url = `${MES_API}/constatations/${encodeURIComponent(c.id)}/etapes/${etape}.pdf`;
    return `<a class="btn btn-sm mes-btn-export" download href="${_mesAttr(url)}"
        title="${_mesAttr(mt('telecharger_etape', libelle))}"
        >${typeof MES_ICONES_ETAT === 'object' ? MES_ICONES_ETAT.pdf : ''} ${mt('exporter_pdf')}</a>`;
}

// Actions de l'étape regardée. Sur « Suite à donner » : enregistrer ce qui a
// été recueilli, et arrêter la suite — les trois décisions possibles.
function mesActionsEtape() {
    const etape = mesEtapeCourante();
    if (etape === 'investigations') return mesActionsInvestigation();
    if (etape === 'qualification') {
        return typeof mesActionsQualification === 'function' ? mesActionsQualification() : '';
    }
    if (etape === 'suivi') {
        return typeof mesActionsSuivi === 'function' ? mesActionsSuivi() : '';
    }
    if (etape !== 'suite') return '';
    const t = MES_STATE.traitement || {};
    if (t.decision) {
        const d = MES_DECISIONS.find((x) => x.cle === t.decision);
        return `<span class="mes-badge cloturee">${_mesEsc(d ? mesNomDecision(d.cle) : t.decision)}</span>`;
    }
    // « Enregistrer » vit dans la barre inférieure : la barre du fil ne porte
    // que les décisions, qui font avancer le traitement.
    const boutons = [];
    if (mesPeutDecider()) {
        MES_DECISIONS.forEach((d) => boutons.push(`<button class="btn btn-sm ${d.classe}"
            title="${_mesAttr(mesAideDecision(d.cle))}"
            onclick="mesPrendreDecision('${d.cle}')">${_mesEsc(mesNomDecision(d.cle))}</button>`));
    }
    return boutons.join('');
}

// Section repliable, sur le modèle du formulaire de notification du module
// « Exécution de la Surveillance » : une carte par section, sa lettre d'ordre,
// son titre et son chevron. Tout est déplié à l'ouverture — on vient lire le
// dossier, pas le chercher.
const MES_CHEVRON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
    + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline points="6 9 12 15 18 9"/></svg>';

const mesSection = (lettre, titre, corps) => `<div class="mes-section ouverte">
    <div class="mes-section-entete" onclick="this.parentElement.classList.toggle('ouverte')">
        <span class="mes-section-lettre">${_mesEsc(lettre)}</span>
        <span class="mes-section-titre">${_mesEsc(titre)}</span>
        <span class="mes-section-chevron">${MES_CHEVRON}</span>
    </div>
    <div class="mes-section-corps">${corps}</div></div>`;

const mesLigneFiche = (t, v) => `<div class="mes-pac-ligne"><dt>${_mesEsc(t)}</dt>
    <dd>${v ? _mesEsc(v) : '<span class="mes-preuve-vide">—</span>'}</dd></div>`;

// Section d'ouverture — de quelle carence il s'agit. Elle vient telle que le
// module qui l'a relevée la publie ; rien n'y est modifiable.
function mesSectionCarence() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return '';
    const prest = (MES_STATE.data.prestataires || []).find((p) => p.id === c.prestataire_id);
    const source = c.origine === 'CARE' ? (c.origine_libelle || mt('relevee_par'))
        : mesOrigine(c.origine === 'RAMP' ? 'RAMP' : 'SURV');
    // Deux colonnes pour les repères, qui tiennent sur une ligne chacun. La
    // description, elle, court sur toute la largeur : la serrer sur une demie
    // la rendait illisible.
    return mesSection('A', mt('sec_carence'), `
        <div class="mes-deux-colonnes">
            <dl style="margin:0;">
                ${mesLigneFiche(mt('fiche_reference'), c.reference)}
                ${mesLigneFiche(mt('fiche_objet'), c.titre)}
                ${mesLigneFiche(mt('fiche_prestataire'), (prest && prest.nom) || c.prestataire_nom)}
                ${mesLigneFiche(mt('fiche_source'), source)}
            </dl>
            <dl style="margin:0;">
                ${mesLigneFiche(mt('fiche_criticite'), c.criticite)}
                ${mesLigneFiche(mt('fiche_ouverture'), mesDate(c.date_ouverture))}
                ${mesLigneFiche(mt('fiche_echeance'), mesDate(c.date_due_cloture))}
                ${mesLigneFiche(mt('fiche_statut_origine'), mesStatutOrigine(c.statut))}
            </dl>
        </div>
        <dl style="margin:.4rem 0 0;">${mesLigneFiche(mt('fiche_description'), c.description)}</dl>`);
}

// Section 1 — le plan d'actions soumis par le prestataire, tel que le module
// qui a relevé la carence le publie. Rien n'y est modifiable : c'est la pièce
// du dossier, pas une saisie.
function mesSectionPac() {
    const pac = (MES_STATE.traitement || {}).pac;
    if (!pac) {
        return mesSection('B', mt('sec_pac'),
            `<p class="mes-preuve-vide">${mt('pac_aucun')}</p>`);
    }
    const ligne = mesLigneFiche;
    // Deux colonnes : à gauche ce que l'organisme s'engage à faire, à droite ce
    // qu'il en produit comme preuve.
    const preuves = (pac.preuves || []).map((p) => `<div class="mes-pac-ligne">
        <dt>${_mesEsc(p.action === 'curative' ? mt('pac_curative')
            : (p.action === 'corrective' ? mt('pac_corrective_une') : mt('pac_preuve')))}</dt>
        <dd>${_mesEsc(p.intitule || '—')}${p.depose_le ? ` · ${_mesEsc(mesDate(p.depose_le))}` : ''}
            ${p.commentaire ? `<br><span class="mes-preuve-vide">${_mesEsc(p.commentaire)}</span>` : ''}</dd>
    </div>`).join('');
    return mesSection('B', mt('sec_pac'), `<div class="mes-deux-colonnes">
        <section>
            <div class="mes-colonne-titre">${mt('pac_soumis_col')}</div>
            <dl style="margin:0;">
                ${ligne(mt('pac_cause'), pac.cause_primaire)}
                ${ligne(mt('pac_curative'), pac.action_curative)}
                ${ligne(mt('pac_curative_date'), mesDate(pac.curative_date_prevue))}
                ${ligne(mt('pac_corrective'), pac.actions_correctives)}
                ${ligne(mt('pac_corrective_date'), mesDate(pac.corrective_date_prevue))}
                ${ligne(mt('fiche_statut_origine'), mesStatutOrigine(pac.statut))}
                ${ligne(mt('pac_soumis_le'), mesDate(pac.date_soumission))}
                ${pac.motif_rejet ? ligne(mt('pac_motif_rejet'), pac.motif_rejet) : ''}
            </dl>
        </section>
        <section>
            <div class="mes-colonne-titre">${mt('pac_preuves')}</div>
            <dl style="margin:0;">
                ${preuves || `<p class="mes-preuve-vide">${mt('aucune_preuve')}</p>`}
            </dl>
        </section>
    </div>`);
}

// Section 2 — ce que l'autorité a recueilli en plus du plan d'actions.
function mesSectionInformations() {
    const t = MES_STATE.traitement || {};
    const off = mesTraitementModifiable() ? '' : 'disabled';
    const pieces = (t.pieces || []).map((p, i) => `
        <div class="mes-preuve" data-genre="traitement" data-chemin="${_mesAttr(p.path || '')}">
            <input class="mes-input" value="${_mesAttr(p.nom || '')}"
                   placeholder="${_mesAttr(mt('intitule_piece'))}" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${_mesAttr(mt('ouvrir'))}">${MES_ICONS.download}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}"
                onclick="mesRetirerPieceTraitement(${i})">${MES_ICONS.x}</button>`}
        </div>`).join('');
    // Même partage que le plan d'actions : ce qui est établi à gauche, ce qui
    // l'appuie à droite.
    return mesSection('C', mt('sec_informations'), `<div class="mes-deux-colonnes">
        <div class="mes-champ">
            <label>${mt('infos_label')}</label>
            <textarea class="mes-input" id="mesTrtInfos" rows="6" ${off}
                      placeholder="${_mesAttr(mt('infos_exemple'))}">${_mesEsc(t.informations || '')}</textarea>
        </div>
        <div class="mes-champ">
            <label>${mt('pieces_jointes')}</label>
            <div id="mesTrtPieces">${pieces || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
            ${off ? '' : `<input type="file" id="mesTrtFichier" multiple style="display:none;"
                    onchange="mesTeleverserPieceTraitement(this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesTrtFichier').click()">
                    ${MES_ICONS.add} ${mt('ajouter_piece')}</button>`}
        </div>
    </div>`);
}

// Section 3 — la décision sur la suite à donner. Elle engage l'autorité : elle
// relève du validateur, et se lit après coup pour tous les autres.
function mesSectionDecision() {
    const t = MES_STATE.traitement || {};
    const prise = !!t.decision;
    const decideur = mesPeutDecider();
    const choisie = MES_DECISIONS.find((d) => d.cle === t.decision);

    if (prise) {
        const rappel = t.decision === 'classer'
            ? `<p class="mes-note">${mt('classer_rappel')}</p>`
            : '';
        return mesSection('D', mt('sec_decision'), `
            <p><strong>${_mesEsc(choisie ? mesNomDecision(choisie.cle) : t.decision)}</strong>
               ${t.decide_le ? `· ${_mesEsc(mesDate(t.decide_le))}` : ''}
               ${t.decide_par ? `· ${_mesEsc(t.decide_par)}` : ''}</p>
            ${t.decision_motif ? `<p class="mes-pac-ligne" style="display:block;">${_mesEsc(t.decision_motif)}</p>` : ''}
            ${rappel}`);
    }
    if (!decideur) {
        return mesSection('D', mt('sec_decision'),
            `<p class="mes-preuve-vide">${mt('decision_aucune')}</p>`);
    }
    // Les trois suites sont portées par la barre du fil, en haut à droite :
    // ce sont les actions de l'étape. Ne reste ici que ce qui les motive.
    return mesSection('D', mt('sec_decision'), `
        <div class="mes-champ">
            <textarea class="mes-input" id="mesTrtMotif" rows="3"
                      placeholder="${_mesAttr(mt('decision_motif_exemple'))}"></textarea>
        </div>
        <ul class="mes-decision-aide">
            ${MES_DECISIONS.map((d) => `<li><strong>${_mesEsc(mesNomDecision(d.cle))}</strong> — ${
                _mesEsc(mesAideDecision(d.cle))}</li>`).join('')}
        </ul>
        <p class="mes-preuve-vide">${mt('suite_en_haut')}</p>`);
}

// Barre inférieure du volet. Elle porte l'enregistrement, à droite, quelle que
// soit l'étape : sans elle, l'étape « Suite à donner » n'avait aucun pied et le
// volet se terminait sur le vide.
function mesBarreInferieure(ro, etape) {
    if (!mesTraitementModifiable()
        || !['suite', 'investigations', 'qualification', 'suivi'].includes(etape)) return '';
    // Un suivi clos — dossier classé, ou clôturé faute de suivi à conduire —
    // ne s'enregistre plus : il se consulte.
    if (etape === 'suivi' && typeof mesSuiviClos === 'function' && mesSuiviClos()) return '';
    if (etape === 'investigations' && mesInvSoumise()) return '';
    // Une qualification close ne s'enregistre plus : elle se consulte.
    if (etape === 'qualification' && typeof mesQualClose === 'function' && mesQualClose()) return '';
    // Chaque étape enregistre ce qui lui est propre : les informations
    // recueillies pour la suite à donner, les actes d'enquête, la qualification.
    const geste = {
        investigations: 'mesEnregistrerInvestigation()',
        qualification: 'mesEnregistrerQualification()',
        suivi: 'mesEnregistrerSuivi()',
    }[etape] || 'mesEnregistrerTraitement()';
    return `<div class="mes-slider-footer">
        <button class="btn btn-primary btn-sm" onclick="${geste}"
                title="${_mesAttr(mt('conserver_infos'))}">${MES_ICONS.check} ${mt('enregistrer')}</button>
    </div>`;
}

// ══════════════════════════════════════
//  Étape « Investigations »
// ══════════════════════════════════════
//
// Rassembler les preuves matérielles et documentaires — témoignages, dossiers,
// relevés — pour établir les faits. Quatre sections : qui a enquêté, ce qui a
// été fait, ce qui a été collecté par ailleurs, et le rapport qui en tire
// l'analyse et les recommandations.

const mesInvestigation = () => (MES_STATE.traitement || {}).investigation
    || { equipe: [], travaux: [], autres_texte: '', autres_pieces: [], rapport: '' };

// Une investigation soumise est close : tous ses champs passent en lecture,
// et rien ne s'y ajoute plus.
const mesInvSoumise = () => !!mesInvestigation().soumise_le;

// Un traitement clos ne se réécrit plus, à aucune de ses étapes : la carence a
// été classée. Le dossier se consulte.
const mesTraitementClos = () => {
    const c = MES_STATE.carenceEnCours || {};
    const t = MES_STATE.traitement || {};
    return !!(c.classee || t.classe_le);
};
const mesTraitementModifiable = () => mesPeutEcrire() && !mesTraitementClos();

const mesInvModifiable = () => mesTraitementModifiable() && !mesInvSoumise();

// Liste de pièces, réutilisée par les trois endroits qui en portent : un
// travail d'investigation, les autres éléments collectés, et le formulaire de
// l'étape précédente.
function mesPiecesHtml(cle, liste, off) {
    const lignes = (liste || []).map((p, i) => `
        <div class="mes-preuve" data-chemin="${_mesAttr(p.path || '')}">
            <input class="mes-input" value="${_mesAttr(p.nom || '')}"
                   placeholder="${_mesAttr(mt('intitule_piece'))}" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${_mesAttr(mt('ouvrir'))}">${MES_ICONS.download}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}"
                onclick="mesInvRetirerPiece('${cle}',${i})">${MES_ICONS.x}</button>`}
        </div>`).join('');
    return `<div id="mesInvPieces_${cle}">${lignes || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
        ${off ? '' : `<input type="file" id="mesInvFichier_${cle}" multiple style="display:none;"
                onchange="mesInvTeleverser('${cle}', this.files)">
            <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                    onclick="document.getElementById('mesInvFichier_${cle}').click()">
                ${MES_ICONS.add} ${mt('ajouter_piece')}</button>`}`;
}

// Ce que l'instance décisionnelle a demandé en renvoyant la carence. L'équipe
// doit le lire avant de reprendre : c'est la commande qui lui est faite.
function mesRenvoisInvestigation() {
    const renvois = (mesInvestigation().renvois || []);
    if (!renvois.length) return '';
    return renvois.slice().reverse().map((r) => `
        <div class="mes-note mes-note-renvoi">
            <strong>${mt('renvoyee_complement')}</strong>
            — ${_mesEsc(mesDate(r.renvoye_le))}${r.renvoye_par ? ` · ${_mesEsc(r.renvoye_par)}` : ''}
            ${r.motif ? `<div style="margin-top:.3rem;white-space:pre-wrap;">${_mesEsc(r.motif)}</div>` : ''}
        </div>`).join('');
}

// Section A — qui a mené l'investigation.
function mesSectionEquipe() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    const lignes = (inv.equipe || []).map((p, i) => `
        <tr data-rang="${i}">
            <td><input class="mes-input" data-champ="nom" value="${_mesAttr(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${_mesAttr(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${_mesAttr(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${_mesAttr(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}" onclick="mesInvRetirerEnqueteur(${i})">${MES_ICONS.x}</button>`}</td>
        </tr>`).join('');
    return mesSection('A', mt('sec_equipe'), `
        <div class="mes-table-wrap">
            <table class="mes-table" id="mesInvEquipe">
                <thead><tr><th>${mt('col_nom')}</th><th>${mt('col_prenom')}</th><th>${
                    mt('col_email')}</th><th>${mt('col_contact')}</th><th></th></tr></thead>
                <tbody>${lignes || `<tr><td colspan="5" class="mes-preuve-vide">${
                    mt('aucun_enqueteur')}</td></tr>`}</tbody>
            </table>
        </div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.5rem;"
            onclick="mesInvAjouterEnqueteur()">${MES_ICONS.add} ${mt('ajouter_enqueteur')}</button>`}`);
}

// Section B — les travaux menés, autant de blocs que de besoin. Le type choisi
// tient lieu de titre du bloc.
function mesSectionTravaux() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    const types = mesTypesInvestigation();
    const blocs = (inv.travaux || []).map((t, i) => {
        const titre = (types.find((x) => x.code === t.type) || {}).libelle || mt('investigation');
        return `<div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${_mesEsc(titre)}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer_bloc'))}" aria-label="${_mesAttr(mt('retirer_bloc'))}"
                    onclick="mesInvRetirerTravail(${i})">${MES_ICONS.x}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-champ">
                    <label>${mt('type_investigation')}</label>
                    <select class="mes-select" data-champ="type" ${off} onchange="mesInvMajTitre(${i}, this.value)">
                        <option value="">—</option>
                        ${types.map((x) => `<option value="${_mesAttr(x.code)}"
                            ${t.type === x.code ? 'selected' : ''}>${_mesEsc(x.libelle)}</option>`).join('')}
                    </select>
                </div>
                <div class="mes-champ">
                    <label>${mt('resultats')}</label>
                    <textarea class="mes-input" data-champ="resultats" rows="4" ${off}
                              placeholder="${_mesAttr(mt('resultat_exemple'))}">${_mesEsc(t.resultats || '')}</textarea>
                </div>
                <div class="mes-champ">
                    <label>${mt('elements_preuve')}</label>
                    ${mesPiecesHtml(`travail${i}`, t.pieces, off)}
                </div>
            </div>
        </div>`;
    }).join('');
    return mesSection('B', mt('sec_investigations'), `
        <div id="mesInvTravaux">${blocs || `<p class="mes-preuve-vide">${mt('aucune_investigation')}</p>`}</div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.5rem;"
            onclick="mesInvAjouterTravail()">${MES_ICONS.add} ${mt('ajouter_investigation')}</button>`}
        ${types.length ? '' : `<p class="mes-note">${mt('aucun_type_inv_param')}</p>`}`);
}

// Section C — ce qui a été recueilli hors des travaux ci-dessus.
function mesSectionAutresElements() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    return mesSection('C', mt('sec_autres'), `<div class="mes-deux-colonnes">
        <div class="mes-champ">
            <label>${mt('elements_recueillis')}</label>
            <textarea class="mes-input" id="mesInvAutres" rows="6" ${off}
                      placeholder="${_mesAttr(mt('autres_exemple'))}">${_mesEsc(inv.autres_texte || '')}</textarea>
        </div>
        <div class="mes-champ">
            <label>${mt('pieces_jointes')}</label>
            ${mesPiecesHtml('autres', inv.autres_pieces, off)}
        </div>
    </div>`);
}

// Section D — le rapport sur le cas.
function mesSectionRapport() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    return mesSection('D', mt('sec_rapport'), `
        <div class="mes-champ">
            <label>${mt('rapport_cas')}</label>
            <textarea class="mes-input" id="mesInvRapport" rows="10" ${off}
                      placeholder="${_mesAttr(mt('rapport_exemple'))}"
                      >${_mesEsc(inv.rapport || '')}</textarea>
        </div>`);
}

// La saisie vit dans le DOM tant qu'elle n'est pas enregistrée : on la relève
// avant tout redessin, comme pour la mesure et le traitement.
function mesCollecterInvestigation() {
    const t = document.getElementById('mesInvRapport');
    if (!t) return null;
    const pieces = (cle) => [...document.querySelectorAll(`#mesInvPieces_${cle} .mes-preuve`)]
        .map((r) => ({ nom: (r.querySelector('input') || {}).value || '', path: r.dataset.chemin || '' }));
    const val = (racine, champ) => ((racine.querySelector(`[data-champ="${champ}"]`) || {}).value || '');
    return {
        equipe: [...document.querySelectorAll('#mesInvEquipe tbody tr[data-rang]')].map((tr) => ({
            nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
            email: val(tr, 'email'), contact: val(tr, 'contact'),
        })),
        travaux: [...document.querySelectorAll('#mesInvTravaux .mes-bloc')].map((b, i) => ({
            type: val(b, 'type'), resultats: val(b, 'resultats'), pieces: pieces(`travail${i}`),
        })),
        autres_texte: (document.getElementById('mesInvAutres') || {}).value || '',
        autres_pieces: pieces('autres'),
        rapport: t.value,
    };
}

const mesMajInvestigation = () => {
    const saisi = mesCollecterInvestigation();
    if (saisi) MES_STATE.traitement = { ...(MES_STATE.traitement || {}), investigation: saisi };
};

const mesRedessinerInvestigation = () => mesAfficherSlider({ anime: false });

function mesInvAjouterEnqueteur() {
    mesMajInvestigation();
    mesInvestigation().equipe.push({ nom: '', prenom: '', email: '', contact: '' });
    mesRedessinerInvestigation();
}
function mesInvRetirerEnqueteur(i) {
    mesMajInvestigation();
    const inv = mesInvestigation();
    inv.equipe = inv.equipe.filter((_, k) => k !== i);
    MES_STATE.traitement.investigation = inv;
    mesRedessinerInvestigation();
}
function mesInvAjouterTravail() {
    mesMajInvestigation();
    const types = mesTypesInvestigation();
    mesInvestigation().travaux.push({ type: (types[0] || {}).code || '', resultats: '', pieces: [] });
    mesRedessinerInvestigation();
}
function mesInvRetirerTravail(i) {
    mesMajInvestigation();
    const inv = mesInvestigation();
    inv.travaux = inv.travaux.filter((_, k) => k !== i);
    MES_STATE.traitement.investigation = inv;
    mesRedessinerInvestigation();
}
// Le titre du bloc suit le type retenu : il se met à jour sans redessiner tout
// le volet, pour ne pas interrompre la saisie en cours dans le bloc voisin.
function mesInvMajTitre(i, code) {
    const bloc = document.querySelectorAll('#mesInvTravaux .mes-bloc')[i];
    const titre = bloc && bloc.querySelector('.mes-bloc-titre');
    if (!titre) return;
    const t = mesTypesInvestigation().find((x) => x.code === code);
    titre.textContent = (t && t.libelle) || mt('investigation');
}

function mesInvRetirerPiece(cle, i) {
    mesMajInvestigation();
    const inv = mesInvestigation();
    if (cle === 'autres') inv.autres_pieces = inv.autres_pieces.filter((_, k) => k !== i);
    else {
        const rang = Number(String(cle).replace('travail', ''));
        const t = inv.travaux[rang];
        if (t) t.pieces = (t.pieces || []).filter((_, k) => k !== i);
    }
    MES_STATE.traitement.investigation = inv;
    mesRedessinerInvestigation();
}

async function mesInvTeleverser(cle, fichiers) {
    if (!fichiers || !fichiers.length) return;
    mesMajInvestigation();
    const inv = mesInvestigation();
    const cible = cle === 'autres' ? inv
        : inv.travaux[Number(String(cle).replace('travail', ''))];
    if (!cible) return;
    const clef = cle === 'autres' ? 'autres_pieces' : 'pieces';
    cible[clef] = cible[clef] || [];
    for (const f of fichiers) {
        try {
            const corps = new FormData();
            corps.append('file', f);
            const r = await mesApi('/upload', { method: 'POST', body: corps });
            cible[clef].push({ nom: r.filename, path: r.path, size: r.size });
        } catch (e) { mesToast(e.message || mt('depot_impossible'), 'error'); }
    }
    MES_STATE.traitement.investigation = inv;
    mesRedessinerInvestigation();
}

// Actions de l'étape « Investigations », à l'extrême droite du fil : soumettre
// clôt l'enquête et pousse le traitement à l'étape suivante.
function mesActionsInvestigation() {
    const inv = mesInvestigation();
    if (inv.soumise_le) {
        return `<span class="mes-badge cloturee"
            title="${_mesAttr(inv.soumise_par
                ? mt('fil_soumise_par', mesDate(inv.soumise_le), inv.soumise_par)
                : mt('fil_soumise_le', mesDate(inv.soumise_le)))}">${mt('investigation_soumise')}</span>`;
    }
    if (!mesPeutDecider() || mesTraitementClos()) return '';
    return `<button class="btn btn-sm mes-btn-mesure"
        title="${_mesAttr(mt('clore_investigation'))}"
        onclick="mesSoumettreInvestigation()">${MES_ICONS.check} ${mt('soumettre')}</button>`;
}

// ══════════════════════════════════════
//  Formulaire de confirmation d'un passage d'étape
// ══════════════════════════════════════
//
// Une étape franchie ne se rejoue pas : l'investigation se fige, la
// qualification se clôt, les mesures entrent au registre. Le geste demande
// donc d'être voulu, non seulement cliqué — d'où un formulaire plutôt qu'une
// alerte du navigateur : il nomme l'étape quittée et celle atteinte, dit ce
// que l'action entraîne, et n'ouvre son bouton qu'une fois la case cochée.

let MES_CONFIRMATION = null;

function mesConfirmerEtape(o) {
    const el = document.getElementById('mesModalRoot');
    if (!el) return Promise.resolve(false);
    return new Promise((resolve) => {
        MES_CONFIRMATION = resolve;
        const libelleEtape = (cle) => (MES_ETAPES.some((e) => e.cle === cle) ? mesNomEtape(cle) : '');
        const depuis = libelleEtape(o.depuis || mesEtapeCourante());
        const vers = o.vers ? libelleEtape(o.vers) : '';
        el.innerHTML = `
        <div class="mes-modal-fond mes-confirm-fond" onclick="mesConfirmationRepondre(false)">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${_mesEsc(o.titre || mt('confirmer_action'))}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone"
                            onclick="mesConfirmationRepondre(false)" aria-label="${_mesAttr(mt("annuler"))}" title="${_mesAttr(mt("annuler"))}">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-confirm-fil">
                        <span class="mes-confirm-etape">${_mesEsc(depuis)}</span>
                        <span class="mes-confirm-fleche">→</span>
                        <span class="mes-confirm-etape cible">${_mesEsc(vers || mt('dossier_clos'))}</span>
                    </div>
                    <p class="mes-confirm-texte">${_mesEsc(o.consequence || '')}</p>
                    ${(o.points || []).length ? `<ul class="mes-confirm-points">${
                        o.points.map((p) => `<li>${_mesEsc(p)}</li>`).join('')}</ul>` : ''}
                    <label class="mes-case mes-confirm-case">
                        <input type="checkbox" id="mesConfirmCase"
                               onchange="mesConfirmationCocher(this.checked)">
                        <span>${_mesEsc(o.aveu || mt('aveu_action'))}</span>
                    </label>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm"
                            onclick="mesConfirmationRepondre(false)">${mt('annuler')}</button>
                    <button class="btn btn-sm ${_mesAttr(o.classe || 'btn-primary')}"
                            id="mesConfirmValider" disabled
                            onclick="mesConfirmationRepondre(true)">${MES_ICONS.check} ${
                        _mesEsc(o.libelle || mt('confirmer'))}</button>
                </div>
            </div>
        </div>`;
        const cases = document.getElementById('mesConfirmCase');
        if (cases) cases.focus();
    });
}

function mesConfirmationCocher(coche) {
    const b = document.getElementById('mesConfirmValider');
    if (b) b.disabled = !coche;
}

function mesConfirmationRepondre(ok) {
    const el = document.getElementById('mesModalRoot');
    if (el) el.innerHTML = '';
    const resoudre = MES_CONFIRMATION;
    MES_CONFIRMATION = null;
    if (resoudre) resoudre(!!ok);
}

async function mesSoumettreInvestigation() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    if (!await mesConfirmerEtape({
        titre: mt('soumettre_investigation'),
        depuis: 'investigations', vers: 'qualification',
        consequence: mt('inv_consequence'),
        points: [mt('inv_detail1'), mt('inv_detail2')],
        aveu: mt('aveu_investigation'),
        libelle: mt('soumettre'), classe: 'mes-btn-mesure',
    })) return;
    // Ce qui est saisi part avant la soumission : elle le fige.
    mesMajInvestigation();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/investigation`, {
            method: 'PUT', body: JSON.stringify(mesInvestigation()),
        });
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/investigation/soumettre`, { method: 'POST' });
        MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`);
        MES_STATE.etapeVue = '';
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesToast(mt('investigation_soumise'));
        mesAfficherSlider({ anime: false });
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || mt('soumission_impossible'), 'error'); }
}

async function mesEnregistrerInvestigation() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    mesMajInvestigation();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/investigation`, {
            method: 'PUT', body: JSON.stringify(mesInvestigation()),
        });
        mesToast(mt('investigation_enregistree'));
    } catch (e) { mesToast(e.message || mt('enregistrement_impossible'), 'error'); }
}

// Les pièces et le texte saisis vivent dans le DOM tant qu'ils ne sont pas
// enregistrés : on les relève avant tout redessin, comme pour la mesure.
function mesCollecterTraitement() {
    const infos = document.getElementById('mesTrtInfos');
    if (!infos) return null;
    return {
        informations: infos.value,
        pieces: [...document.querySelectorAll('#mesTrtPieces .mes-preuve')].map((r) => ({
            nom: (r.querySelector('input') || {}).value || '',
            path: r.dataset.chemin || '',
        })),
    };
}

const mesMajTraitement = () => {
    const saisi = mesCollecterTraitement();
    if (saisi) MES_STATE.traitement = { ...(MES_STATE.traitement || {}), ...saisi };
};

function mesRetirerPieceTraitement(i) {
    mesMajTraitement();
    const t = MES_STATE.traitement || {};
    t.pieces = (t.pieces || []).filter((_, k) => k !== i);
    mesAfficherSlider({ anime: false });
}

async function mesTeleverserPieceTraitement(fichiers) {
    if (!fichiers || !fichiers.length) return;
    mesMajTraitement();
    const t = MES_STATE.traitement || {};
    t.pieces = t.pieces || [];
    for (const f of fichiers) {
        try {
            const corps = new FormData();
            corps.append('file', f);
            const r = await mesApi('/upload', { method: 'POST', body: corps });
            t.pieces.push({ nom: r.filename, path: r.path, size: r.size });
        } catch (e) { mesToast(e.message || mt('depot_impossible'), 'error'); }
    }
    mesAfficherSlider({ anime: false });
}

async function mesEnregistrerTraitement(silencieux) {
    const c = MES_STATE.carenceEnCours;
    if (!c) return false;
    mesMajTraitement();
    const t = MES_STATE.traitement || {};
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`, {
            method: 'PUT',
            body: JSON.stringify({ informations: t.informations || '', pieces: t.pieces || [] }),
        });
        if (!silencieux) mesToast(mt('informations_enregistrees'));
        return true;
    } catch (e) { mesToast(e.message || mt('enregistrement_impossible'), 'error'); return false; }
}

async function mesPrendreDecision(decision) {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    const choisie = MES_DECISIONS.find((d) => d.cle === decision) || {};
    const nomDecision = choisie.cle ? mesNomDecision(choisie.cle) : decision;
    if (!await mesConfirmerEtape({
        titre: nomDecision,
        depuis: 'suite',
        vers: { investiguer: 'investigations', mesures: 'qualification' }[decision] || '',
        consequence: choisie.cle ? mesAideDecision(choisie.cle) : '',
        points: [decision === 'classer' ? mt('classer_consequence') : mt('suite_consequence')],
        aveu: mt('aveu_decision'),
        libelle: nomDecision, classe: choisie.classe || 'btn-primary',
    })) return;
    // Ce qui a été saisi part avec la décision : elle s'appuie dessus.
    if (!await mesEnregistrerTraitement(true)) return;
    const motif = (document.getElementById('mesTrtMotif') || {}).value || '';
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/decision`, {
            method: 'POST', body: JSON.stringify({ decision, motif }),
        });
        MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`);
        MES_STATE.data.constatations = await mesApi('/constatations');
        // La vue suit l'étape que la décision vient de faire atteindre.
        MES_STATE.etapeVue = '';
        mesToast(mt('decision_enregistree', nomDecision));
        mesAfficherSlider({ anime: false });
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || mt('decision_impossible'), 'error'); }
}

// Les gestionnaires posés dans le balisage sont appelés depuis la page : ils
// doivent être joignables globalement. L'export vit ici, avec ce qu'il nomme —
// le poser dans mes-app.js, chargé avant, l'aurait fait échouer au chargement.
Object.assign(window, {
    MES_ETAPES, MES_DECISIONS, mesNomEtape, mesNomDecision, mesAideDecision,
    mesVoirEtape, mesFilAvancement, mesBarreInferieure, mesEtatEtape,
    mesConfirmerEtape, mesConfirmationCocher, mesConfirmationRepondre,
    mesTeleverserPieceTraitement, mesRetirerPieceTraitement,
    mesEnregistrerTraitement, mesPrendreDecision,
    mesSectionEquipe, mesSectionTravaux, mesSectionAutresElements, mesSectionRapport,
    mesInvAjouterEnqueteur, mesInvRetirerEnqueteur,
    mesInvAjouterTravail, mesInvRetirerTravail, mesInvMajTitre,
    mesInvTeleverser, mesInvRetirerPiece, mesEnregistrerInvestigation,
    mesActionsInvestigation, mesSoumettreInvestigation, mesRenvoisInvestigation,
    mesTraitementClos, mesTraitementModifiable,
});
