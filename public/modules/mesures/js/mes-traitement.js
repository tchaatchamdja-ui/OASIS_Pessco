/* OASIS / Mesures d'Application — traitement d'une carence.
 *
 * Le fil d'avancement et les trois sections de l'étape « Suite à donner ».
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
// Quatre étapes. Seule « Suite à donner » est instruite : elle va du
// déclenchement du traitement à la décision. Les trois suivantes sont
// déclarées pour que le fil se lise en entier ; elles seront construites plus
// tard, et le disent plutôt que de faire croire à un écran vide.
const MES_ETAPES = [
    { cle: 'suite', libelle: 'Suite à donner' },
    { cle: 'investigations', libelle: 'Investigations', aVenir: true },
    { cle: 'qualification', libelle: 'Qualification et Mesures', aVenir: true },
    { cle: 'suivi', libelle: 'Suivi des Mesures', aVenir: true },
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
    return 'Étape à construire ultérieurement';
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
    if (mesEtapeCourante() !== 'suite') return '';
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

const mesSection = (titre, corps) => `<div class="mes-section">
    <h4>${_mesEsc(titre)}</h4><div class="mes-section-corps">${corps}</div></div>`;

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
    return mesSection('Carence', `
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
        return mesSection('Plan d’action soumis',
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
    return mesSection('Plan d’action soumis', `<div class="mes-deux-colonnes">
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
    const off = mesPeutEcrire() ? '' : 'disabled';
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
    return mesSection('Informations additionnelles', `<div class="mes-deux-colonnes">
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
        return mesSection('Justifications de la décision', `
            <p><strong>${_mesEsc(choisie ? choisie.libelle : t.decision)}</strong>
               ${t.decide_le ? `· ${_mesEsc(mesDate(t.decide_le))}` : ''}
               ${t.decide_par ? `· ${_mesEsc(t.decide_par)}` : ''}</p>
            ${t.decision_motif ? `<p class="mes-pac-ligne" style="display:block;">${_mesEsc(t.decision_motif)}</p>` : ''}
            ${rappel}`);
    }
    if (!decideur) {
        return mesSection('Justifications de la décision',
            '<p class="mes-preuve-vide">Aucune décision n’a encore été prise. Elle relève du validateur.</p>');
    }
    // Les trois suites sont portées par la barre du fil, en haut à droite :
    // ce sont les actions de l'étape. Ne reste ici que ce qui les motive.
    return mesSection('Justifications de la décision', `
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
    if (etape !== 'suite' || !mesPeutEcrire()) return '';
    return `<div class="mes-slider-footer">
        <button class="btn btn-primary btn-sm" onclick="mesEnregistrerTraitement()"
                title="Conserver les informations recueillies">${MES_ICONS.check} Enregistrer</button>
    </div>`;
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
});
