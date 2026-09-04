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
const MES_ETAPES = [
    { cle: 'suite', libelle: 'Suite à donner' },
    { cle: 'investigations', libelle: 'Investigations' },
    { cle: 'qualification', libelle: 'Qualification et Mesures' },
    { cle: 'suivi', libelle: 'Suivi des Mesures' },
];

// Les trois suites possibles. Classer clôt le traitement ici — la carence
// reste suivie par le plan d'actions de son module d'origine ; les deux autres
// poussent le fil d'un cran.
const MES_DECISIONS = [
    { cle: 'classer', libelle: 'Classer', classe: 'mes-btn-classer-vert',
      aide: 'Aucune mesure d’application ne sera prise.' },
    { cle: 'investiguer', libelle: 'Investiguer', classe: 'mes-btn-investiguer',
      aide: 'Le traitement passe à l’étape « Investigations ».' },
    { cle: 'mesures', libelle: 'Prendre des mesures', classe: 'mes-btn-mesure',
      aide: 'Le traitement passe à l’étape « Qualification et Mesures ».' },
];

// Les statuts du module d'origine sont des codes de circuit : on les rend
// lisibles ici plutôt que de servir « pac_soumis » à l'agent qui décide.
const MES_STATUTS_ORIGINE = {
    ouverte: 'Ouverte', ouvert: 'Ouverte',
    pac_soumis: 'PAC soumis', pac_valide: 'PAC validé', pac_rejetee: 'PAC rejeté',
    soldee: 'Soldée', cloturee: 'Clôturée',
    en_cours: 'En cours', brouillon: 'Brouillon',
};
const mesStatutOrigine = (v) => {
    const code = String(v || '').trim();
    if (!code) return '';
    if (MES_STATUTS_ORIGINE[code]) return MES_STATUTS_ORIGINE[code];
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
        if (!t.decision) return 'Instruction en cours : plan d’actions, informations, puis décision';
        const d = MES_DECISIONS.find((x) => x.cle === t.decision) || {};
        return `Décidé le ${mesDate(t.decide_le)} — ${d.libelle || t.decision}`;
    }
    if (cle === 'investigations') {
        const inv = (t.investigation || {});
        const n = (inv.travaux || []).length;
        if (inv.soumise_le) return `Soumise le ${mesDate(inv.soumise_le)}${inv.soumise_par ? ` par ${inv.soumise_par}` : ''}`;
        if (!n && !(inv.equipe || []).length) return 'Investigation à ouvrir';
        return `${(inv.equipe || []).length} enquêteur(s) · ${n} investigation(s) consignée(s)`;
    }
    if (cle === 'suivi') {
        if (t.cloture_le) return `Traitement clôturé le ${mesDate(t.cloture_le)}`;
        const liste = t.mesures || [];
        if (!liste.length) return 'Aucune mesure à suivre';
        const soldees = liste.filter((m) => (m.suivi_statut || mesStatutSuivi(m)) === 'solde').length;
        return `${soldees} mesure(s) soldée(s) sur ${liste.length}`;
    }
    return 'Étape à venir';
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
                    onclick="mesVoirEtape('${_mesAttr(e.cle)}')">${_mesEsc(e.libelle)}</button>`;
    }).join('');
    return `
    <div class="mes-proc-barre">
        <div class="eval-steps mes-proc-fil">${etapes}</div>
        <div class="mes-proc-actions">${mesActionsEtape()}</div>
    </div>`;
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
        const d = MES_DECISIONS.find((x) => x.cle === t.decision) || {};
        return `<span class="mes-badge cloturee">${_mesEsc(d.libelle || t.decision)}</span>`;
    }
    // « Enregistrer » vit dans la barre inférieure : la barre du fil ne porte
    // que les décisions, qui font avancer le traitement.
    const boutons = [];
    if (mesPeutDecider()) {
        MES_DECISIONS.forEach((d) => boutons.push(`<button class="btn btn-sm ${d.classe}"
            title="${_mesAttr(d.aide)}"
            onclick="mesPrendreDecision('${d.cle}')">${_mesEsc(d.libelle)}</button>`));
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
    const source = c.origine === 'CARE' ? (c.origine_libelle || 'Relevée par le module')
        : (c.origine === 'SAFA' ? 'RAMP Inspections' : 'Exécution de la Surveillance');
    // Deux colonnes pour les repères, qui tiennent sur une ligne chacun. La
    // description, elle, court sur toute la largeur : la serrer sur une demie
    // la rendait illisible.
    return mesSection('A', 'Carence', `
        <div class="mes-deux-colonnes">
            <dl style="margin:0;">
                ${mesLigneFiche('Référence', c.reference)}
                ${mesLigneFiche('Objet', c.titre)}
                ${mesLigneFiche('Prestataire', (prest && prest.nom) || c.prestataire_nom)}
                ${mesLigneFiche('Source', source)}
            </dl>
            <dl style="margin:0;">
                ${mesLigneFiche('Criticité', c.criticite)}
                ${mesLigneFiche('Ouverture', mesDate(c.date_ouverture))}
                ${mesLigneFiche('Échéance', mesDate(c.date_due_cloture))}
                ${mesLigneFiche('Statut (module d’origine)', mesStatutOrigine(c.statut))}
            </dl>
        </div>
        <dl style="margin:.4rem 0 0;">${mesLigneFiche('Description', c.description)}</dl>`);
}

// Section 1 — le plan d'actions soumis par le prestataire, tel que le module
// qui a relevé la carence le publie. Rien n'y est modifiable : c'est la pièce
// du dossier, pas une saisie.
function mesSectionPac() {
    const pac = (MES_STATE.traitement || {}).pac;
    if (!pac) {
        return mesSection('B', 'Plan d’action soumis',
            '<p class="mes-preuve-vide">Aucun plan d’actions n’a été soumis pour cette carence.</p>');
    }
    const ligne = mesLigneFiche;
    // Deux colonnes : à gauche ce que l'organisme s'engage à faire, à droite ce
    // qu'il en produit comme preuve.
    const preuves = (pac.preuves || []).map((p) => `<div class="mes-pac-ligne">
        <dt>${_mesEsc(p.action === 'curative' ? 'Action curative'
            : (p.action === 'corrective' ? 'Action corrective' : 'Preuve'))}</dt>
        <dd>${_mesEsc(p.intitule || '—')}${p.depose_le ? ` · ${_mesEsc(mesDate(p.depose_le))}` : ''}
            ${p.commentaire ? `<br><span class="mes-preuve-vide">${_mesEsc(p.commentaire)}</span>` : ''}</dd>
    </div>`).join('');
    return mesSection('B', 'Plan d’action soumis', `<div class="mes-deux-colonnes">
        <section>
            <div class="mes-colonne-titre">Plan soumis</div>
            <dl style="margin:0;">
                ${ligne('Cause primaire', pac.cause_primaire)}
                ${ligne('Action curative', pac.action_curative)}
                ${ligne('Date prévue (curative)', mesDate(pac.curative_date_prevue))}
                ${ligne('Actions correctives', pac.actions_correctives)}
                ${ligne('Date prévue (corrective)', mesDate(pac.corrective_date_prevue))}
                ${ligne('Statut (module d’origine)', mesStatutOrigine(pac.statut))}
                ${ligne('Soumis le', mesDate(pac.date_soumission))}
                ${pac.motif_rejet ? ligne('Motif de rejet', pac.motif_rejet) : ''}
            </dl>
        </section>
        <section>
            <div class="mes-colonne-titre">Preuves soumises</div>
            <dl style="margin:0;">
                ${preuves || '<p class="mes-preuve-vide">Aucune preuve déposée.</p>'}
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
                   placeholder="Intitulé de la pièce" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="Ouvrir">${MES_ICONS.download}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer"
                onclick="mesRetirerPieceTraitement(${i})">${MES_ICONS.x}</button>`}
        </div>`).join('');
    // Même partage que le plan d'actions : ce qui est établi à gauche, ce qui
    // l'appuie à droite.
    return mesSection('C', 'Informations additionnelles', `<div class="mes-deux-colonnes">
        <div class="mes-champ">
            <label>Informations complémentaires recueillies sur la constatation</label>
            <textarea class="mes-input" id="mesTrtInfos" rows="6" ${off}
                      placeholder="Ce que l’instruction a établi en plus du plan d’actions">${_mesEsc(t.informations || '')}</textarea>
        </div>
        <div class="mes-champ">
            <label>Pièces jointes</label>
            <div id="mesTrtPieces">${pieces || '<div class="mes-preuve-vide">Aucune pièce</div>'}</div>
            ${off ? '' : `<input type="file" id="mesTrtFichier" multiple style="display:none;"
                    onchange="mesTeleverserPieceTraitement(this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesTrtFichier').click()">
                    ${MES_ICONS.add} Ajouter une pièce</button>`}
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
            ? `<p class="mes-note">Aucune mesure d’application n’est prise. Le suivi se poursuit
               par le plan d’actions correctives soumis dans le module d’origine (Exécution de la
               Surveillance ou RAMP Inspections) — c’est là qu’il se solde.</p>`
            : '';
        return mesSection('D', 'Justifications de la décision', `
            <p><strong>${_mesEsc(choisie ? choisie.libelle : t.decision)}</strong>
               ${t.decide_le ? `· ${_mesEsc(mesDate(t.decide_le))}` : ''}
               ${t.decide_par ? `· ${_mesEsc(t.decide_par)}` : ''}</p>
            ${t.decision_motif ? `<p class="mes-pac-ligne" style="display:block;">${_mesEsc(t.decision_motif)}</p>` : ''}
            ${rappel}`);
    }
    if (!decideur) {
        return mesSection('D', 'Justifications de la décision',
            '<p class="mes-preuve-vide">Aucune décision n’a encore été prise. Elle relève du validateur.</p>');
    }
    // Les trois suites sont portées par la barre du fil, en haut à droite :
    // ce sont les actions de l'étape. Ne reste ici que ce qui les motive.
    return mesSection('D', 'Justifications de la décision', `
        <div class="mes-champ">
            <textarea class="mes-input" id="mesTrtMotif" rows="3"
                      placeholder="Ce qui motive la suite retenue"></textarea>
        </div>
        <ul class="mes-decision-aide">
            ${MES_DECISIONS.map((d) => `<li><strong>${_mesEsc(d.libelle)}</strong> — ${_mesEsc(d.aide)}</li>`).join('')}
        </ul>
        <p class="mes-preuve-vide">La suite retenue se choisit en haut à droite, sur la ligne du fil
           d’avancement.</p>`);
}

// Barre inférieure du volet. Elle porte l'enregistrement, à droite, quelle que
// soit l'étape : sans elle, l'étape « Suite à donner » n'avait aucun pied et le
// volet se terminait sur le vide.
function mesBarreInferieure(ro, champsMesure, etape) {
    if (champsMesure) {
        return ro ? '' : `<div class="mes-slider-footer">
            <button class="btn btn-outline btn-sm" onclick="mesFermerSlider()">Annuler</button>
            <button class="btn btn-primary btn-sm" onclick="mesEnregistrerMesure()">${MES_ICONS.check} Enregistrer</button>
        </div>`;
    }
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
                title="Conserver les informations recueillies">${MES_ICONS.check} Enregistrer</button>
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
                   placeholder="Intitulé de la pièce" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="Ouvrir">${MES_ICONS.download}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer"
                onclick="mesInvRetirerPiece('${cle}',${i})">${MES_ICONS.x}</button>`}
        </div>`).join('');
    return `<div id="mesInvPieces_${cle}">${lignes || '<div class="mes-preuve-vide">Aucune pièce</div>'}</div>
        ${off ? '' : `<input type="file" id="mesInvFichier_${cle}" multiple style="display:none;"
                onchange="mesInvTeleverser('${cle}', this.files)">
            <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                    onclick="document.getElementById('mesInvFichier_${cle}').click()">
                ${MES_ICONS.add} Ajouter une pièce</button>`}`;
}

// Ce que l'instance décisionnelle a demandé en renvoyant la carence. L'équipe
// doit le lire avant de reprendre : c'est la commande qui lui est faite.
function mesRenvoisInvestigation() {
    const renvois = (mesInvestigation().renvois || []);
    if (!renvois.length) return '';
    return renvois.slice().reverse().map((r) => `
        <div class="mes-note mes-note-renvoi">
            <strong>Renvoyée pour investigations complémentaires</strong>
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
                title="Retirer" onclick="mesInvRetirerEnqueteur(${i})">${MES_ICONS.x}</button>`}</td>
        </tr>`).join('');
    return mesSection('A', 'Équipe d’investigation', `
        <div class="mes-table-wrap">
            <table class="mes-table" id="mesInvEquipe">
                <thead><tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Contact</th><th></th></tr></thead>
                <tbody>${lignes || `<tr><td colspan="5" class="mes-preuve-vide">
                    Aucun enquêteur désigné</td></tr>`}</tbody>
            </table>
        </div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.5rem;"
            onclick="mesInvAjouterEnqueteur()">${MES_ICONS.add} Ajouter un enquêteur</button>`}`);
}

// Section B — les travaux menés, autant de blocs que de besoin. Le type choisi
// tient lieu de titre du bloc.
function mesSectionTravaux() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    const types = mesTypesInvestigation();
    const blocs = (inv.travaux || []).map((t, i) => {
        const titre = (types.find((x) => x.code === t.type) || {}).libelle || 'Investigation';
        return `<div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${_mesEsc(titre)}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer ce bloc"
                    onclick="mesInvRetirerTravail(${i})">${MES_ICONS.x}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-champ">
                    <label>Type d’investigation</label>
                    <select class="mes-select" data-champ="type" ${off} onchange="mesInvMajTitre(${i}, this.value)">
                        <option value="">—</option>
                        ${types.map((x) => `<option value="${_mesAttr(x.code)}"
                            ${t.type === x.code ? 'selected' : ''}>${_mesEsc(x.libelle)}</option>`).join('')}
                    </select>
                </div>
                <div class="mes-champ">
                    <label>Résultats</label>
                    <textarea class="mes-input" data-champ="resultats" rows="4" ${off}
                              placeholder="Ce que l’investigation a établi">${_mesEsc(t.resultats || '')}</textarea>
                </div>
                <div class="mes-champ">
                    <label>Éléments de preuve</label>
                    ${mesPiecesHtml(`travail${i}`, t.pieces, off)}
                </div>
            </div>
        </div>`;
    }).join('');
    return mesSection('B', 'Investigations réalisées', `
        <div id="mesInvTravaux">${blocs || '<p class="mes-preuve-vide">Aucune investigation consignée</p>'}</div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.5rem;"
            onclick="mesInvAjouterTravail()">${MES_ICONS.add} Ajouter une investigation</button>`}
        ${types.length ? '' : `<p class="mes-note">Aucun type d’investigation n’est paramétré.
            Le menu Paramètres du module en tient la liste.</p>`}`);
}

// Section C — ce qui a été recueilli hors des travaux ci-dessus.
function mesSectionAutresElements() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    return mesSection('C', 'Autres éléments collectés', `<div class="mes-deux-colonnes">
        <div class="mes-champ">
            <label>Éléments recueillis</label>
            <textarea class="mes-input" id="mesInvAutres" rows="6" ${off}
                      placeholder="Témoignages, dossiers, relevés obtenus par ailleurs">${_mesEsc(inv.autres_texte || '')}</textarea>
        </div>
        <div class="mes-champ">
            <label>Pièces jointes</label>
            ${mesPiecesHtml('autres', inv.autres_pieces, off)}
        </div>
    </div>`);
}

// Section D — le rapport sur le cas.
function mesSectionRapport() {
    const inv = mesInvestigation();
    const off = mesInvModifiable() ? '' : 'disabled';
    return mesSection('D', 'Résultat de l’investigation', `
        <div class="mes-champ">
            <label>Rapport sur le cas</label>
            <textarea class="mes-input" id="mesInvRapport" rows="10" ${off}
                      placeholder="Synthèse des faits établis, analyse de la législation applicable, et recommandations"
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
    titre.textContent = (t && t.libelle) || 'Investigation';
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
        } catch (e) { mesToast(e.message || 'Dépôt impossible', 'error'); }
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
            title="${_mesAttr(`Soumise le ${mesDate(inv.soumise_le)}${
                inv.soumise_par ? ` par ${inv.soumise_par}` : ''}`)}">Investigation soumise</span>`;
    }
    if (!mesPeutDecider() || mesTraitementClos()) return '';
    return `<button class="btn btn-sm mes-btn-mesure"
        title="Clôt l’investigation et passe à « Qualification et Mesures ». Les éléments consignés ne se modifieront plus."
        onclick="mesSoumettreInvestigation()">${MES_ICONS.check} Soumettre</button>`;
}

async function mesSoumettreInvestigation() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    if (!confirm('Soumettre l’investigation ?\nElle sera close, ses éléments ne se modifieront plus, '
        + 'et le traitement passera à « Qualification et Mesures ».')) return;
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
        mesToast('Investigation soumise');
        mesAfficherSlider({ anime: false });
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || 'Soumission impossible', 'error'); }
}

async function mesEnregistrerInvestigation() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    mesMajInvestigation();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/investigation`, {
            method: 'PUT', body: JSON.stringify(mesInvestigation()),
        });
        mesToast('Investigation enregistrée');
    } catch (e) { mesToast(e.message || 'Enregistrement impossible', 'error'); }
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
        } catch (e) { mesToast(e.message || 'Dépôt impossible', 'error'); }
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
        if (!silencieux) mesToast('Informations enregistrées');
        return true;
    } catch (e) { mesToast(e.message || 'Enregistrement impossible', 'error'); return false; }
}

async function mesPrendreDecision(decision) {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    const choisie = MES_DECISIONS.find((d) => d.cle === decision) || {};
    if (!confirm(`${choisie.libelle} ?\n${choisie.aide || ''}`)) return;
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
        mesToast(`Décision enregistrée : ${choisie.libelle}`);
        mesAfficherSlider({ anime: false });
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || 'Décision impossible', 'error'); }
}

// Les gestionnaires posés dans le balisage sont appelés depuis la page : ils
// doivent être joignables globalement. L'export vit ici, avec ce qu'il nomme —
// le poser dans mes-app.js, chargé avant, l'aurait fait échouer au chargement.
Object.assign(window, {
    MES_ETAPES, MES_DECISIONS,
    mesVoirEtape, mesFilAvancement, mesBarreInferieure,
    mesTeleverserPieceTraitement, mesRetirerPieceTraitement,
    mesEnregistrerTraitement, mesPrendreDecision,
    mesSectionEquipe, mesSectionTravaux, mesSectionAutresElements, mesSectionRapport,
    mesInvAjouterEnqueteur, mesInvRetirerEnqueteur,
    mesInvAjouterTravail, mesInvRetirerTravail, mesInvMajTitre,
    mesInvTeleverser, mesInvRetirerPiece, mesEnregistrerInvestigation,
    mesActionsInvestigation, mesSoumettreInvestigation, mesRenvoisInvestigation,
    mesTraitementClos, mesTraitementModifiable,
});
