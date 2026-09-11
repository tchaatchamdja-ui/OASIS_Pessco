/* OASIS — Exécution de la Surveillance
 * Suite de exec-constatations.js : le suivi des PAC — fil d'avancement, motifs, ajustements d'échéance, volet de suivi et pièces jointes.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ══════════════════════════════════════
//  PAC FOLLOW-UP SLIDER
// ══════════════════════════════════════

// ══════════════════════════════════════
//  Fil d'avancement du Suivi des PAC
// ══════════════════════════════════════
// Quatre étapes, chacune bornée par un jalon vérifiable :
//   Soumission     transmission de la constatation → soumission du PAC par le prestataire
//   Acceptation    soumission du PAC → acceptation du plan par l'AAC
//   Mise en oeuvre acceptation du plan → acceptation des preuves de mise en oeuvre
//   Clôture        l'AAC solde la constatation
// Un PAC renvoyé au prestataire ramène le fil à l'étape Soumission.
const EXEC_PAC_ETAPES = [
    { id: 'soumission', cle: 'pac_etape_soumission' },
    { id: 'acceptation', cle: 'pac_etape_acceptation' },
    { id: 'mise_oeuvre', cle: 'pac_etape_mise_oeuvre' },
    { id: 'cloture', cle: 'pac_etape_cloture' },
];

function execPacEtat(statut, evaluationANAC, submitInfo) {
    const acceptation = (evaluationANAC && evaluationANAC.acceptation) || {};
    const verification = (evaluationANAC && evaluationANAC.verification) || {};
    const cloture = (evaluationANAC && evaluationANAC.cloture) || {};

    const soldee = statut === 'soldee';
    const rejete = statut === 'pac_rejetee';
    // Le statut fait foi autant que la saisie : un PAC porté à « pac_valide »
    // est accepté, même si le bloc d'évaluation a été vidé par un
    // enregistrement antérieur. Sans cela le circuit se retrouvait bloqué,
    // sans action ni côté AAC ni côté prestataire.
    const valide = statut === 'pac_valide';
    // Le PAC a été soumis au moins une fois — un renvoi annule ce jalon, le
    // prestataire devant soumettre de nouveau.
    const soumis = !rejete && (statut === 'pac_soumis' || valide || soldee || !!submitInfo
        || acceptation.accepte === 'OUI');
    const accepte = acceptation.accepte === 'OUI' || valide || soldee;
    // Preuves de mise en oeuvre acceptées : prononcé explicite de l'AAC,
    // isolement et risques traités, ou mise en oeuvre déclarée effective.
    const preuvesAcceptees = verification.preuves_acceptees === 'OUI'
        || (verification.isolement_realise === 'OUI' && verification.risques_traites === 'OUI')
        || cloture.mise_en_oeuvre_effective === 'OUI';

    const faites = {
        soumission: soumis,
        acceptation: accepte,
        // Une constatation soldée a nécessairement franchi la mise en oeuvre.
        mise_oeuvre: (accepte && preuvesAcceptees) || soldee,
        cloture: soldee,
    };
    return {
        faites,
        soldee,
        rejete,
        courante: EXEC_PAC_ETAPES.map((e) => e.id).find((id) => !faites[id]) || null,
    };
}

function execPacFilHtml(statut, evaluationANAC, submitInfo, actionsHtml) {
    const etat = execPacEtat(statut, evaluationANAC, submitInfo);
    const etapes = EXEC_PAC_ETAPES.map((e) => {
        const cls = ['eval-step', 'exec-pac-step',
            etat.faites[e.id] ? 'done' : '',
            // Un PAC renvoyé signale le retour à l'étape Soumission en rouge.
            !etat.faites[e.id] && etat.courante === e.id && etat.rejete && e.id === 'soumission' ? 'rejected' : '',
            !etat.faites[e.id] && etat.courante === e.id && !(etat.rejete && e.id === 'soumission') ? 'current' : '',
        ].filter(Boolean).join(' ');
        const label = te(e.cle);
        return `<div class="${cls}" title="${_escAttr(label)}">${_esc(label)}</div>`;
    }).join('');
    return `<div class="exec-proc-barre exec-pac-barre">
        <div class="eval-steps exec-proc-fil">${etapes}</div>
        ${actionsHtml ? `<div class="exec-proc-actions-etape">${actionsHtml}</div>` : ''}
    </div>`;
}

// ══════════════════════════════════════
//  Amendement du PAC : champs suivis et motifs
// ══════════════════════════════════════
// Comparés à la dernière version acceptée du plan. Toute divergence lève un
// drapeau et réclame le motif de la modification avant toute soumission.
const EXEC_PAC_CHAMPS_SUIVIS = [
    { cle: 'cause_primaire', id: 'pac_cause_primaire', libelle: 'cause_root', ancre: 'pac_cause_primaire' },
    { cle: 'action_curative', id: 'pac_action_curative', libelle: 'action_curative_correction', ancre: 'pac_action_curative' },
    { cle: 'curative_date_prevue', id: 'pac_curative_date_prevue', libelle: 'date_prevue_curative', ancre: 'pac_action_curative' },
    { cle: 'actions_correctives', id: 'pac_actions_correctives', libelle: 'action_corrective_prevention', ancre: 'pac_actions_correctives' },
    { cle: 'corrective_date_prevue', id: 'pac_corrective_date_prevue', libelle: 'date_prevue_corrective', ancre: 'pac_actions_correctives' },
];

const EXEC_PAC_MOTIFS = [
    'motif_nouvelle_cause', 'motif_nouvelle_action', 'motif_refonte_action',
    'motif_modification_date', 'motif_observations_aac', 'motif_correction_mineure', 'motif_autres',
];

// Bloc posé sous le champ : drapeau, intitulé du champ, motif, précision.
function _execPacMotifHtml(champ, valeurInitiale, motif, editable, modifie) {
    const m = motif || {};
    const autre = m.motif === 'motif_autres';
    if (!editable) {
        // Lecture seule (AAC, versions figées) : le motif enregistré s'affiche
        // tel quel, précédé du drapeau.
        if (!m.motif) return '';
        const texte = m.motif === 'motif_autres' ? (m.precision || te('motif_autres')) : te(m.motif);
        return `<div class="exec-pac-motif visible" data-cle="${champ.cle}">
            <span class="exec-pac-drapeau" title="${te('champ_amende')}">${EXEC_ICONS.flag || '⚑'}</span>
            <span class="exec-pac-motif-champ">${te(champ.libelle)}</span>
            <span class="exec-pac-motif-valeur">${_esc(texte)}</span>
        </div>`;
    }
    return `<div class="exec-pac-motif${(modifie || m.motif) ? ' visible' : ''}" id="motif_bloc_${champ.cle}" data-cle="${champ.cle}"
                 data-initial="${_escAttr(valeurInitiale || '')}">
        <span class="exec-pac-drapeau" title="${te('champ_amende')}">${EXEC_ICONS.flag || '⚑'}</span>
        <span class="exec-pac-motif-champ">${te(champ.libelle)}</span>
        <select class="form-input exec-pac-motif-select" id="motif_sel_${champ.cle}"
                onchange="execPacMotifChange('${champ.cle}')">
            <option value="">${te('motif_choisir')}</option>
            ${EXEC_PAC_MOTIFS.map((k) => `<option value="${k}"${m.motif === k ? ' selected' : ''}>${te(k)}</option>`).join('')}
        </select>
        <input type="text" class="form-input exec-pac-motif-precision" id="motif_txt_${champ.cle}"
               placeholder="${te('motif_preciser')}" value="${_escAttr(m.precision || '')}"${autre ? '' : ' hidden'}>
    </div>`;
}

// Affiche ou masque le champ de précision selon le motif retenu.
window.execPacMotifChange = function (cle) {
    const sel = document.getElementById(`motif_sel_${cle}`);
    const txt = document.getElementById(`motif_txt_${cle}`);
    if (!sel || !txt) return;
    txt.hidden = sel.value !== 'motif_autres';
    // Le signalement rouge s'efface dès que le motif est renseigné.
    if (sel.value) sel.classList.remove('exec-pac-manquant');
    if (!txt.hidden) { txt.oninput = () => txt.classList.toggle('exec-pac-manquant', !txt.value.trim()); txt.focus(); }
};

// Un champ suivi vient d'être touché : le bloc de motif suit la divergence
// avec la version acceptée, sans reconstruire le formulaire.
window.execPacSurveillerChamp = function (cle) {
    const champ = EXEC_PAC_CHAMPS_SUIVIS.find((c) => c.cle === cle);
    const saisie = champ && document.getElementById(champ.id);
    const bloc = document.getElementById(`motif_bloc_${cle}`);
    if (!saisie || !bloc) return;
    const modifie = String(saisie.value || '').trim() !== String(bloc.dataset.initial || '').trim();
    bloc.classList.toggle('visible', modifie);
    saisie.classList.toggle('exec-pac-champ-amende', modifie);
    if (!modifie) {
        const sel = document.getElementById(`motif_sel_${cle}`);
        const txt = document.getElementById(`motif_txt_${cle}`);
        if (sel) sel.value = '';
        if (txt) { txt.value = ''; txt.hidden = true; }
    }
};

// Motifs saisis, et champs amendés restés sans motif.
function _execPacMotifs() {
    const motifs = {};
    const manquants = [];
    EXEC_PAC_CHAMPS_SUIVIS.forEach((champ) => {
        const bloc = document.getElementById(`motif_bloc_${champ.cle}`);
        const saisie = document.getElementById(champ.id);
        if (!bloc || !saisie) return;
        if (String(saisie.value || '').trim() === String(bloc.dataset.initial || '').trim()) return;
        const motif = (document.getElementById(`motif_sel_${champ.cle}`) || {}).value || '';
        const precision = ((document.getElementById(`motif_txt_${champ.cle}`) || {}).value || '').trim();
        if (!motif || (motif === 'motif_autres' && !precision)) {
            manquants.push({ champ, motif });
            return;
        }
        motifs[champ.cle] = { motif, precision: motif === 'motif_autres' ? precision : '' };
    });
    return { motifs, manquants };
}

// Bloc repliable des versions du PAC : le bandeau porte l'état de son bloc.
window.execPacBlocToggle = function (bouton) {
    const bloc = bouton && bouton.parentElement;
    if (!bloc) return;
    const ouvert = bloc.classList.toggle('ouvert');
    bouton.setAttribute('aria-expanded', String(ouvert));
};

// Volet des commentaires de suivi : replié par défaut, déplié à la demande.
window.execPacVoletToggle = function () {
    const volet = document.getElementById('execPacVolet');
    if (!volet) return;
    const ouvert = volet.classList.toggle('ouvert');
    const poignee = volet.querySelector('.exec-pac-volet-poignee');
    if (poignee) {
        poignee.setAttribute('aria-expanded', String(ouvert));
        poignee.title = ouvert ? te('volet_replier') : te('volet_deplier');
    }
};

// ══════════════════════════════════════
//  AJUSTEMENT DU RAPPEL DE LA CONSTATATION
// ══════════════════════════════════════
// Revenir sur un délai, une criticité ou l'énoncé d'une constatation déjà
// notifiée engage l'administration : réservé aux comptes SUPERADMIN et ADMIN
// sur leur portée, confirmé par mot de passe, et tracé dans le volet de droite.
const EXEC_AJUST_PORTEES = {
    prorogation: { champs: ['delai_solde'], couleur: '#0284c7' },
    criticite: { champs: ['delai_solde', 'criticite'], couleur: '#f97316' },
    complet: {
        champs: ['delai_solde', 'criticite', 'date_ouverture', 'description', 'ref_reglementaires'],
        couleur: '#7c3aed',
    },
};

function _execPeutAjuster() {
    return ['SUPERADMIN', 'ADMIN'].includes((EXEC_STATE.user || {}).role) && _execCanValidate();
}

function _execAjustBoutons(fnc) {
    if (!_execPeutAjuster()) return '';
    const b = (portee, libelle) => `<button type="button" class="btn btn-sm btn-outline exec-ajust-btn"
        onclick="event.stopPropagation();execAjustOuvrir('${fnc.id}','${portee}')"
        title="${_escAttr(te('ajust_' + portee + '_aide'))}">${_esc(libelle)}</button>`;
    return `<span class="exec-ajust-actions" onclick="event.stopPropagation();">
        ${b('prorogation', te('ajust_prorogation'))}
        ${b('criticite', te('ajust_criticite'))}
        ${b('complet', te('ajust_complet'))}
    </span>`;
}

// Volet de traçabilité, sur le modèle des commentaires de suivi : le dernier
// ajustement déplié, les précédents repliés.
function _execAjustVoletHtml(fnc) {
    const liste = fnc.ajustements || [];
    const cartes = liste.map((a, i) => {
        const deplie = i === liste.length - 1;
        const couleur = (EXEC_AJUST_PORTEES[a.portee] || {}).couleur || '#0284c7';
        return `<div class="exec-suivi-comm exec-ajust-carte${deplie ? '' : ' replie'}"
                     style="border-left-color:${couleur};">
            <div class="exec-suivi-comm-tete" onclick="execSuiviCommToggle(this)">
                <span class="exec-suivi-comm-chevron">${EXEC_ICONS.chevronDown}</span>
                <strong>${te('ajust_rang')} ${i + 1}</strong>
                <span>
                    <em class="exec-suivi-auteur">${_esc(a.auteur || '')}</em>
                    ${a.date ? _formatDate(String(a.date).slice(0, 10)) : ''}
                </span>
            </div>
            <div class="exec-suivi-comm-corps">
                <div class="exec-suivi-comm-items">
                    <span style="background:${couleur}22;color:${couleur};">${te('ajust_' + a.portee)}</span>
                </div>
                <div class="exec-ajust-changements">
                    ${(a.changements || []).map((c) => `<div class="exec-ajust-ligne">
                        <span class="lib">${_esc(c.libelle || c.champ)}</span>
                        <span class="avant">${_esc(c.avant || '—')}</span>
                        ${EXEC_ICONS.next || '→'}
                        <span class="apres">${_esc(c.apres || '—')}</span>
                    </div>`).join('')}
                </div>
                <div class="exec-suivi-comm-texte">${_esc(a.motif || '')}</div>
            </div>
        </div>`;
    }).join('');
    // Volet rabattable à l'horizontale, sur le modèle des détails de suivi :
    // replié il ne montre que sa poignée verticale.
    return `
    <div class="exec-pac-volet exec-rappel-volet" id="execAjustVolet">
        <button type="button" class="exec-pac-volet-poignee" onclick="execAjustVoletToggle()"
                title="${_escAttr(te('volet_deplier'))}" aria-expanded="false" aria-controls="execAjustVoletCorps">
            <span class="exec-pac-volet-chevron">${EXEC_ICONS.chevronDown}</span>
            <span class="exec-pac-volet-titre">${te('ajust_journal')}${liste.length ? ` (${liste.length})` : ''}</span>
        </button>
        <div class="exec-pac-volet-corps" id="execAjustVoletCorps">
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header exec-teinte-ambre" onclick="execAjustVoletToggle()">
                    <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                    <span class="exec-form-section-title">${te('ajust_journal')}</span>
                    <span class="exec-suivi-comm-compte">${liste.length}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                    <div class="exec-ajust-liste">
                        ${cartes || `<em class="exec-ajust-vide">${te('ajust_aucun')}</em>`}
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

window.execAjustVoletToggle = function () {
    const volet = document.getElementById('execAjustVolet');
    if (!volet) return;
    const ouvert = volet.classList.toggle('ouvert');
    const poignee = volet.querySelector('.exec-pac-volet-poignee');
    if (poignee) {
        poignee.setAttribute('aria-expanded', String(ouvert));
        poignee.title = ouvert ? te('volet_replier') : te('volet_deplier');
    }
};

window.execAjustOuvrir = function (fncId, portee) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    const cfg = EXEC_AJUST_PORTEES[portee];
    if (!cfg) return;
    const dateOuv = String(fnc.date_ouverture || fnc.date_creation || '').slice(0, 10);
    const champ = {
        delai_solde: `<div class="form-group">
            <label class="form-label" for="ajust_delai_solde">${te('delai_solde')}</label>
            <input type="number" min="1" class="form-input" id="ajust_delai_solde"
                   value="${_escAttr(fnc.delai_solde || '')}" oninput="execAjustEcheance()">
        </div>`,
        criticite: `<div class="form-group">
            <label class="form-label" for="ajust_criticite">${te('criticite_label')}</label>
            <select class="form-select" id="ajust_criticite">
                ${_execCriticiteOptions(fnc.criticite || fnc.gravite)}
            </select>
        </div>`,
        date_ouverture: `<div class="form-group">
            <label class="form-label" for="ajust_date_ouverture">${te('date_ouverture')}</label>
            <input type="date" class="form-input" id="ajust_date_ouverture"
                   value="${_escAttr(dateOuv)}" onchange="execAjustEcheance()">
        </div>`,
        description: `<div class="form-group">
            <label class="form-label" for="ajust_description">${te('description_constatation')}</label>
            <textarea class="form-input" id="ajust_description" rows="4">${_esc(fnc.description || fnc.titre || '')}</textarea>
        </div>`,
        ref_reglementaires: `<div class="form-group">
            <label class="form-label" for="ajust_ref_reglementaires">${te('ref_reglementaires_label')}</label>
            <input type="text" class="form-input" id="ajust_ref_reglementaires"
                   value="${_escAttr(fnc.ref_reglementaires || fnc.exigence_ref || '')}">
        </div>`,
    };
    // Les mesures de la constatation — date d'ouverture, délai, criticité,
    // échéance — se lisent sur une même grille : ce sont les quatre bornes
    // d'un même engagement, elles doivent s'aligner.
    const mesures = ['date_ouverture', 'delai_solde', 'criticite'].filter((c) => cfg.champs.includes(c));
    const textes = cfg.champs.filter((c) => !mesures.includes(c));
    const corps = `
    <div class="exec-proc-bloc exec-ajust-form" data-date-ouverture="${_escAttr(dateOuv)}">
        <p class="exec-ajust-intro">${te('ajust_intro')}</p>
        <div class="exec-ajust-mesures">
            ${mesures.map((c) => champ[c] || '').join('')}
            <div class="form-group">
                <label class="form-label">${te('date_due_label')}</label>
                <input type="text" class="form-input exec-ajust-echeance" id="ajust_apercu_echeance" readonly>
            </div>
        </div>
        ${textes.map((c) => champ[c] || '').join('')}
        <div class="form-group">
            <label class="form-label" for="ajust_motif">${te('ajust_motif')}</label>
            <textarea class="form-input" id="ajust_motif" rows="3"
                      placeholder="${_escAttr(te('ajust_motif_aide'))}"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label" for="ajust_mdp">${te('ajust_mot_de_passe')}</label>
            <input type="password" class="form-input" id="ajust_mdp" autocomplete="current-password">
        </div>
        <p class="exec-proc-erreur" id="ajust_erreur"></p>
    </div>`;
    const pied = `
        <button class="btn btn-outline" onclick="execAjustRetour('${fncId}')">${te('cancel')}</button>
        <button class="btn btn-primary" onclick="execAjustAppliquer('${fncId}','${portee}')">
            ${EXEC_ICONS.check || ''} ${te('appliquer')}
        </button>`;
    // Bandeau : le retour au formulaire de suivi précède l'intitulé, et la
    // croix de fermeture n'a plus lieu d'être.
    const titre = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execAjustRetour('${fncId}')">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.edit || ''} ${te('ajust_' + portee)} — ${_esc(fnc.reference || '')}`;
    execShowSlider(titre, corps, pied, 'third');
    document.querySelector('#execSlider .exec-slider-close')?.remove();
    execAjustEcheance();
};

// Retour : le formulaire de suivi d'où l'on vient reprend la main.
window.execAjustRetour = function (fncId) {
    execCloseSlider();
    setTimeout(() => execOpenPACSlider(fncId), 80);
};

// Aperçu de l'échéance : elle découle du délai et de la date d'ouverture,
// autant la montrer avant de valider.
window.execAjustEcheance = function () {
    const boite = document.querySelector('.exec-ajust-form');
    const apercu = document.getElementById('ajust_apercu_echeance');
    if (!boite || !apercu) return;
    const delai = parseInt((document.getElementById('ajust_delai_solde') || {}).value, 10);
    const ouv = (document.getElementById('ajust_date_ouverture') || {}).value || boite.dataset.dateOuverture;
    if (Number.isNaN(delai) || !/^\d{4}-\d{2}-\d{2}$/.test(String(ouv || ''))) { apercu.value = '—'; return; }
    const d = new Date(`${ouv}T00:00:00`);
    d.setDate(d.getDate() + delai);
    apercu.value = _formatDate(d.toISOString().slice(0, 10));
};

window.execAjustAppliquer = async function (fncId, portee) {
    const cfg = EXEC_AJUST_PORTEES[portee];
    const err = document.getElementById('ajust_erreur');
    const val = (id) => (document.getElementById(id) || {}).value;
    const motif = String(val('ajust_motif') || '').trim();
    const mdp = String(val('ajust_mdp') || '');
    if (!motif) { err.textContent = te('ajust_motif_requis'); return; }
    if (!mdp) { err.textContent = te('ajust_mot_de_passe_requis'); return; }
    const champs = {};
    cfg.champs.forEach((c) => {
        const v = val('ajust_' + c);
        if (v !== undefined) champs[c] = v;
    });
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/ajuster`, {
            method: 'PUT',
            body: JSON.stringify({ portee, champs, motif, admin_password: mdp }),
        });
        execCloseSlider();
        await execRefreshDynamic();
        _execToast(te('ajust_ok'), 'success');
        execOpenPACSlider(fncId);
    } catch (e) {
        err.textContent = (e && e.message) || te('action_impossible');
    }
};

// ── Suivi du PAC : contexte, fabriques de HTML, puis ouverture du volet ──
// Le formulaire est le plus dense du module : on sépare ce qui se calcule (les
// droits, les données) de ce qui s'écrit (chaque section de l'écran). Toutes
// les fabriques reçoivent le même contexte `c`.

// Droits et état du circuit : qui écrit quoi, à quelle étape.
function _execPacDroits(fnc, fncId) {
    // ── Role + status flags ──────────────────────────────────────────
    const isAAC = _execIsAAC();
    const isPostulant = !isAAC;
    const statut = fnc.statut || 'ouvert';
    const isSoldee = statut === 'soldee';
    const isPACSoumis = statut === 'pac_soumis';
    const isPACRejete = statut === 'pac_rejetee';
    const isOuverte = statut === 'ouvert' || statut === 'ouverte';

    // ── Évaluation de l'AAC : lue tôt, le fil et les droits d'écriture en dépendent ──
    let evalData = {};
    if (fnc.commentaire_evaluation) {
        if (typeof fnc.commentaire_evaluation === 'object') {
            evalData = fnc.commentaire_evaluation;
        } else {
            try { evalData = JSON.parse(fnc.commentaire_evaluation); } catch (e) {
                evalData = { legacy_comment: fnc.commentaire_evaluation };
            }
        }
    }
    const evaluationANAC = evalData.evaluation_anac || {};
    const submitInfo = evalData.submit_info || null;
    const etatFil = execPacEtat(statut, evaluationANAC, submitInfo);

    // Étape « Mise en oeuvre », côté prestataire : deux modes d'écriture, choisis
    // par bouton. `preuves` n'ouvre que le dépôt des preuves ; `amendement`
    // rouvre tout le plan et remettra l'acceptation en jeu à la soumission.
    const modePac = (EXEC_STATE.pacMode && EXEC_STATE.pacMode.fncId === fncId)
        ? (EXEC_STATE.pacMode.modes || []) : [];
    const enMiseEnOeuvre = isPostulant && !isSoldee && etatFil.courante === 'mise_oeuvre';
    if (!enMiseEnOeuvre && modePac.length) EXEC_STATE.pacMode = null;
    // Les deux modes se cumulent. À la soumission, l'amendement l'emporte :
    // le plan repart en acceptation, preuves comprises.
    const modes = enMiseEnOeuvre ? modePac : [];
    const modeAmendement = modes.includes('amendement');
    const modePreuves = modes.includes('preuves');
    const modeSoumission = modeAmendement ? 'amendement' : (modePreuves ? 'preuves' : null);

    // PAC fields are filled ONLY by the postulant (applicant). AAC users always see them read-only.
    const pacEditable = !isSoldee && isPostulant
        && (isOuverte || isPACRejete || modeAmendement);
    // Dépôt des preuves : ouvert aussi quand le plan est figé mais que le
    // prestataire a demandé à joindre ses preuves de mise en oeuvre.
    const preuvesEditable = pacEditable || modePreuves;
    // L'évaluation n'a pas d'objet tant que le plan n'est pas soumis : les
    // « Résultats du Suivi » et les commentaires restent en lecture seule
    // jusqu'à l'étape Acceptation.
    const evaluationOuverte = etatFil.faites.soumission;
    const aacEditable = isAAC && !isSoldee && evaluationOuverte;
    // Postulant only sees the AAC evaluation section once the FNC is soldée.
    const showAACSection = isAAC || isSoldee;

    const pacRO = pacEditable ? '' : 'readonly';
    const aacRO = aacEditable ? '' : 'readonly';
    const aacDis = aacEditable ? '' : 'disabled';
    const lockedBg = (editable) => editable ? '' : 'background:var(--bg);';
    return {
        isAAC, isPostulant, statut, isSoldee, isPACSoumis, isPACRejete, isOuverte,
        evalData, evaluationANAC, submitInfo, etatFil, enMiseEnOeuvre, modes,
        modeAmendement, modePreuves, modeSoumission, pacEditable, preuvesEditable,
        evaluationOuverte, aacEditable, showAACSection, pacRO, aacRO, aacDis, lockedBg,
    };
}

// Données affichées : intitulés résolus, échéance, plan, évaluation et suivi.
function _execPacDonnees(fnc, droits) {
    const { isAAC, evalData, evaluationANAC } = droits;
    // ── Resolve domaine + prestataire ────────────────────────────────
    const domaines = EXEC_STATE.data.domaines || [];
    const domaineObj = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const domaineName = domaineObj ? domaineObj.nom : (fnc.domaine || fnc.domaine_id || '-');

    const prestataires = EXEC_STATE.data.prestataires || [];
    let prestataireName = '-';
    if (fnc.prestataire_id) {
        const prestObj = prestataires.find(p => p.id === fnc.prestataire_id);
        prestataireName = prestObj ? prestObj.nom : (fnc.prestataire_nom || fnc.prestataire_id);
    } else if (fnc.prestataire_nom) {
        prestataireName = fnc.prestataire_nom;
    } else if (fnc.dossier_id) {
        const dossiers = EXEC_STATE.data.dossiers || [];
        const rel = dossiers.find(d => d.id === fnc.dossier_id);
        if (rel) prestataireName = rel.prestataire_nom || '-';
    }

    // ── Compute date due ─────────────────────────────────────────────
    let dateDue = fnc.date_due_cloture;
    if (!dateDue || dateDue.length < 8 || isNaN(new Date(dateDue).getTime())) {
        const dl = parseInt(fnc.delai_solde || fnc.delai_correction || '0');
        const dO = fnc.date_ouverture || fnc.date_creation;
        if (dl > 0 && dO) { const d = new Date(dO); d.setDate(d.getDate() + dl); dateDue = d.toISOString().slice(0,10); } else { dateDue = ''; }
    }

    // ── Parse PAC data ───────────────────────────────────────────────
    const actions = fnc.actions_correctives || [];
    const pac = actions[0] || {};

    const acceptation = evaluationANAC.acceptation || {};
    const verification = evaluationANAC.verification || {};
    const cloture = evaluationANAC.cloture || {};
    const itemsComments = evalData.items_comments || {};
    // Commentaires de suivi : le fil courant, précédé des échanges enregistrés
    // item par item dans l'ancienne présentation en table.
    const commentairesSuivi = [
        // Les échanges de l'ancienne table sont réputés transmis.
        ...Object.entries(itemsComments).flatMap(([cle, liste]) => (liste || []).map((c) => ({
            date: c.date || '', auteur: c.auteur || '',
            items: [cle === 'cause_primaire' ? 'cause' : cle], precision: '', texte: c.texte || '',
            publie: true,
        }))),
        ...(evalData.suivi_commentaires || []),
    ]
        .filter((c) => c.publie || isAAC)      // le prestataire ne lit que le transmis
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const rejetInfo = evalData.rejet_info || null;
    const preuvesInfo = evalData.preuves_info || null;
    const preuvesRefus = evalData.preuves_refus || null;
    const retourMiseEnOeuvre = evalData.retour_mise_oeuvre || null;
    const versionsPac = fnc.versions_pac || [];

    return {
        domaineName, prestataireName, dateDue, pac, acceptation, verification, cloture,
        commentairesSuivi, rejetInfo, preuvesInfo, preuvesRefus, retourMiseEnOeuvre, versionsPac,
    };
}

// Fabriques dépendant du mode d'édition : motifs d'amendement, preuves, versions.
function _execPacOutils(fnc, c) {
    const { pac, modeAmendement, preuvesEditable, versionsPac } = c;
    const pacAccepte = ((fnc.pac_accepte || {}).actions_correctives || [])[0] || pac;
    const motifsEnregistres = pac.motifs_amendement || {};
    const motifBloc = (cle) => {
        const champ = EXEC_PAC_CHAMPS_SUIVIS.find((c) => c.cle === cle);
        if (!champ) return '';
        const initiale = pacAccepte[cle] || '';
        const modifie = String(pac[cle] || '').trim() !== String(initiale).trim();
        return _execPacMotifHtml(champ, initiale, motifsEnregistres[cle], modeAmendement, modifie);
    };
    const surveille = (cle) => (modeAmendement
        ? `oninput="execPacSurveillerChamp('${cle}')" onchange="execPacSurveillerChamp('${cle}')"` : '');
    // Champ déjà divergent à l'ouverture (brouillon enregistré avant soumission).
    const classeAmendee = (cle) => (modeAmendement
        && String(pac[cle] || '').trim() !== String(pacAccepte[cle] || '').trim()
        ? ' exec-pac-champ-amende' : '');

    const renderProofList = (proofs, containerId, editable) => {
        if (!proofs || !Array.isArray(proofs) || proofs.length === 0) return '';
        return proofs
            .map((p, i) => _execPreuveHtml(typeof p === 'string' ? { filename: p } : p, i + 1, editable))
            .join('');
    };

    const renderUploadZone = (prefix, listId, editable) => {
        if (!editable) return '';
        return `<div style="margin-top:0.35rem;padding:0.5rem;border:2px dashed var(--border);border-radius:6px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.75rem;" onclick="execUploadPACProof('${prefix}')">
            ${EXEC_ICONS.upload} ${te('upload_zone')}
            <input type="file" id="${prefix}_input" style="display:none;" multiple onchange="execHandlePACProofUpload(this.files, '${listId}')">
        </div>`;
    };
    const renderVersionsPac = () => {
        if (!versionsPac.length) return '';
        const ligne = (libelle, valeur) => valeur
            ? `<div style="margin-top:0.3rem;"><span style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${libelle}</span><div>${valeur}</div></div>`
            : '';
        return `<div class="exec-pac-versions">
            <button type="button" class="exec-pac-versions-bandeau" aria-expanded="false"
                    onclick="execPacBlocToggle(this)">
                <span class="exec-pac-versions-pastille">${versionsPac.length}</span>
                <span class="exec-pac-versions-titre">${te('versions_pac')}</span>
                <span class="exec-pac-versions-chevron">${EXEC_ICONS.chevronDown}</span>
            </button>
            <div class="exec-pac-versions-corps">
                ${versionsPac.map((v, i) => {
                    const p = (v.actions_correctives || [])[0] || {};
                    const acc = v.acceptation || {};
                    const detail = [
                        `${te('amende_le')} ${_formatDate((v.date || '').slice(0, 10))}`,
                        v.auteur ? _esc(v.auteur) : '',
                        acc.date ? `${te('date_acceptation')} ${_formatDate(acc.date)}` : '',
                    ].filter(Boolean).join(' · ');
                    return `<div class="exec-pac-version">
                        <button type="button" class="exec-pac-versions-bandeau" aria-expanded="false"
                                onclick="execPacBlocToggle(this)">
                            <span class="exec-pac-versions-titre">${te('version_n')} ${i + 1}
                                <span style="font-weight:normal;color:var(--text-muted);">— ${detail}</span>
                            </span>
                            <span class="exec-pac-versions-chevron">${EXEC_ICONS.chevronDown}</span>
                        </button>
                        <div class="exec-pac-version-corps">
                            ${ligne(te('cause_root'), _esc(p.cause_primaire || ''))}
                            ${ligne(te('action_curative_correction'), _esc(p.action_curative || ''))}
                            ${ligne(te('action_corrective_prevention'), _esc(p.actions_correctives || ''))}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    };
    return { motifBloc, surveille, classeAmendee, renderProofList, renderUploadZone, renderVersionsPac };
}

// Boutons du circuit, portés par la ligne du fil d'avancement.
function _execPacActionsFil(c) {
    const {
        fncId, isAAC, isPostulant, isOuverte, isPACRejete, isPACSoumis,
        isSoldee, enMiseEnOeuvre, modes, modeSoumission, etatFil,
    } = c;
    let filActions = '';
    if (isPostulant && (isOuverte || isPACRejete)) {
        filActions = `<button class="btn btn-primary btn-sm" onclick="execSubmitPAC('${fncId}')">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    } else if (isPostulant && isPACSoumis) {
        // État désactivé : le PAC attend l'examen de l'AAC.
        filActions = `<button class="btn btn-primary btn-sm" disabled title="${te('pac_soumis')}">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    }
    // Étape Mise en oeuvre, côté prestataire : joindre les preuves, rouvrir le
    // plan, ou les deux. La soumission n'a de sens qu'un mode au moins choisi.
    if (enMiseEnOeuvre) {
        const btn = (mode, cle) => `<button class="btn btn-sm ${modes.includes(mode) ? 'btn-primary' : 'btn-outline'}"
            aria-pressed="${modes.includes(mode)}" onclick="execPacModeEdition('${fncId}', '${mode}')">${te(cle)}</button>`;
        filActions += ` ${btn('preuves', 'ajouter_preuves')}`;
        filActions += ` ${btn('amendement', 'amender_pac')}`;
        filActions += modeSoumission
            ? ` <button class="btn btn-primary btn-sm" onclick="execSoumettreMiseEnOeuvre('${fncId}', '${modeSoumission}')">${EXEC_ICONS.send} ${te('soumettre')}</button>`
            : ` <button class="btn btn-primary btn-sm" disabled title="${te('choisir_mode_pac')}">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    }
    if (isAAC && isPACSoumis) {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execReturnPACtoPostulant('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer')}</button>`;
    }
    // Étape Mise en oeuvre, côté AAC : statuer sur les preuves déposées.
    if (isAAC && !isSoldee && etatFil.courante === 'mise_oeuvre') {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execPreuvesNonAcceptables('${fncId}')">${EXEC_ICONS.x} ${te('preuves_non_acceptables')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPreuves('${fncId}')">${EXEC_ICONS.check} ${te('acceptation')}</button>`;
    }
    // Étape Clôture, côté AAC : renvoyer à la mise en oeuvre, ou clôturer.
    if (isAAC && !isSoldee && etatFil.courante === 'cloture') {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execRenvoyerMiseEnOeuvre('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execCloseFNC('${fncId}')">${EXEC_ICONS.check} ${te('cloturer')}</button>`;
    }
    // Étape Acceptation, côté AAC : accepter le plan seul, ou plan et preuves.
    // Le second jalon clôt d'un coup l'acceptation et la mise en oeuvre.
    if (isAAC && isPACSoumis && etatFil.courante === 'acceptation') {
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPAC('${fncId}', false)">${EXEC_ICONS.check} ${te('accepter_pac')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPAC('${fncId}', true)">${EXEC_ICONS.check} ${te('accepter_pac_preuves')}</button>`;
    }
    return filActions;
}

// Bandeaux d’information : renvois, soumissions, preuves, clôture.
function _execPacBandeauxHtml(c) {
    const {
        fnc, isSoldee, submitInfo, modes, modeAmendement, modePreuves,
        verification, rejetInfo, preuvesInfo, preuvesRefus, retourMiseEnOeuvre,
    } = c;
    return `
    ${rejetInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('pac_renvoye_titre')} ${rejetInfo.date ? `(${_formatDate(rejetInfo.date)})` : ''} ${rejetInfo.auteur ? `— ${_esc(rejetInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(rejetInfo.motif || '')}</div>
    </div>` : ''}
    ${submitInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.check} ${te('pac_soumis_titre')} ${submitInfo.date ? `(${_formatDate(submitInfo.date)})` : ''} ${submitInfo.auteur ? `— ${_esc(submitInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#14532d;"><strong>${te('motif')} :</strong> ${_esc(submitInfo.motif || '')}</div>
    </div>` : ''}
    ${preuvesInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;">
        <div style="font-weight:600;color:#1e40af;font-size:0.85rem;">${EXEC_ICONS.check} ${te('preuves_soumises_titre')} ${preuvesInfo.date ? `(${_formatDate(preuvesInfo.date)})` : ''} ${preuvesInfo.auteur ? `— ${_esc(preuvesInfo.auteur)}` : ''}</div>
    </div>` : ''}
    ${preuvesRefus ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('preuves_refusees_titre')} ${preuvesRefus.date ? `(${_formatDate(preuvesRefus.date)})` : ''} ${preuvesRefus.auteur ? `— ${_esc(preuvesRefus.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(preuvesRefus.motif || '')}</div>
    </div>` : ''}
    ${verification.preuves_acceptees === 'OUI' ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('preuves_acceptees_titre')} ${verification.date_acceptation_preuves ? `(${_formatDate(verification.date_acceptation_preuves)})` : ''} ${verification.acceptees_par ? `— ${_esc(verification.acceptees_par)}` : ''}</div>
    </div>` : ''}
    ${verification.verification_terrain && !isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;">
        <div style="font-weight:600;color:#92400e;font-size:0.85rem;">${EXEC_ICONS.alarm} ${te('verification_terrain_annoncee')}</div>
    </div>` : ''}
    ${retourMiseEnOeuvre ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('renvoye_mise_oeuvre')} ${retourMiseEnOeuvre.date ? `(${_formatDate(retourMiseEnOeuvre.date)})` : ''} ${retourMiseEnOeuvre.auteur ? `— ${_esc(retourMiseEnOeuvre.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(retourMiseEnOeuvre.motif || '')}</div>
    </div>` : ''}
    ${modes.length ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;">
        ${modeAmendement && modePreuves
            ? `<div style="font-weight:600;color:#92400e;font-size:0.85rem;">${te('mode_mixte_actif')}</div>`
            : `<div style="font-weight:600;color:#92400e;font-size:0.85rem;">${modeAmendement ? te('mode_amendement_actif') : te('mode_preuves_actif')}</div>`}
    </div>` : ''}
    ${isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('constatation_soldee')}${fnc.date_solde ? ` — ${te('date_solde')} : ${_formatDate(fnc.date_solde.slice(0,10))}` : ''}</div>
    </div>` : ''}`;
}

// Section A — rappel de la constatation et volet d’ajustement.
function _execPacRappelHtml(c) {
    const {
        fnc, domaineName, prestataireName, dateDue,
    } = c;
    return `
    <div class="exec-rappel-rangee">
    <div class="exec-form-section expanded exec-rappel-corps">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">A</span>
            <span class="exec-form-section-title">${te('rappel_constatation')}</span>
            ${_execAjustBoutons(fnc)}
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <div style="display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr 1fr 1fr;gap:0.6rem;font-size:0.78rem;margin-bottom:0.6rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('provider')}</div>
                    <div><strong>${_esc(prestataireName)}</strong></div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('domaine_label')}</div>
                    <div>${_esc(domaineName)}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('date_ouverture')}</div>
                    <div>${fnc.date_ouverture ? _formatDate(fnc.date_ouverture) : (fnc.date_creation ? _formatDate(fnc.date_creation.slice(0,10)) : '-')}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('delai_label')}</div>
                    <div><strong>${_esc(fnc.delai_solde || '-')} ${te('jours')}</strong></div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('criticite_label')}</div>
                    <div>${_execGraviteBadge(fnc.criticite || fnc.gravite)}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('date_due_label')}</div>
                    <div style="color:#dc2626;font-weight:600;">${dateDue ? _formatDate(dateDue) : '-'}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:0.85rem;margin-top:0.4rem;font-size:0.8rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;font-weight:600;">${te('description_constatation')}</div>
                    <p style="margin:0.2rem 0 0 0;color:var(--text);">${_esc(fnc.description || fnc.titre || '')}</p>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;font-weight:600;">${te('ref_reglementaires_label')}</div>
                    <div>${_esc(fnc.ref_reglementaires || fnc.exigence_ref || '-')}</div>
                </div>
            </div>
        </div>
    </div>
    ${_execAjustVoletHtml(fnc)}
    </div>`;
}

// Section B, colonne gauche — le plan d’actions correctives et ses preuves.
function _execPacPlanHtml(c) {
    const {
        isSoldee, isPACSoumis, isPACRejete, pacEditable, preuvesEditable, pacRO,
        lockedBg, prestataireName, pac, motifBloc, surveille, classeAmendee,
        renderProofList, renderUploadZone, renderVersionsPac,
    } = c;
    return `
        <div class="exec-pac-col-gauche">
            <!-- Section 2 : Plan d'Actions Correctives -->
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <span class="exec-form-section-letter">B</span>
                    <span class="exec-form-section-title">${te('plan_actions_correctives')}${isPACSoumis || isPACRejete || isSoldee ? ` <span style="font-weight:normal;color:var(--text-muted);font-size:0.78rem;">(Soumis par ${_esc(prestataireName)})</span>` : ''}</span>
                    <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;">
                    <div class="form-group">
                        <label for="pac_cause_primaire" style="font-size:0.8rem;font-weight:600;">${te('cause_root')}</label>
                        <textarea class="form-input${classeAmendee('cause_primaire')}" id="pac_cause_primaire" rows="2" ${pacRO} ${surveille('cause_primaire')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.cause_primaire || '')}</textarea>
                        ${motifBloc('cause_primaire')}
                    </div>
                    <!-- La date prévue accompagne l'intitulé de l'action, à
                         l'extrême droite de sa ligne ; les preuves occupent
                         ensuite toute la largeur. -->
                    <div class="form-group" style="margin-top:0.55rem;">
                        <div class="exec-pac-ligne-action">
                            <label for="pac_action_curative" style="font-size:0.8rem;font-weight:600;">${te('action_curative_correction')}</label>
                            <div class="exec-pac-date-inline">
                                <label for="pac_curative_date_prevue">${te('date_prevue')}</label>
                                <input type="date" class="form-input${classeAmendee('curative_date_prevue')}" id="pac_curative_date_prevue" value="${_escAttr(pac.curative_date_prevue || '')}" ${pacRO} ${surveille('curative_date_prevue')} style="${lockedBg(pacEditable)}">
                            </div>
                        </div>
                        <textarea class="form-input${classeAmendee('action_curative')}" id="pac_action_curative" rows="2" ${pacRO} ${surveille('action_curative')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.action_curative || '')}</textarea>
                        ${motifBloc('action_curative')}
                        ${motifBloc('curative_date_prevue')}
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                        <div id="pac_curative_preuves_list">${renderProofList(pac.curative_preuves, 'pac_curative_preuves_list', preuvesEditable)}</div>
                        ${renderUploadZone('pac_curative_preuves', 'pac_curative_preuves_list', preuvesEditable)}
                    </div>
                    <div class="form-group" style="margin-top:0.55rem;">
                        <div class="exec-pac-ligne-action">
                            <label for="pac_actions_correctives" style="font-size:0.8rem;font-weight:600;">${te('action_corrective_prevention')}</label>
                            <div class="exec-pac-date-inline">
                                <label for="pac_corrective_date_prevue">${te('date_prevue')}</label>
                                <input type="date" class="form-input${classeAmendee('corrective_date_prevue')}" id="pac_corrective_date_prevue" value="${_escAttr(pac.corrective_date_prevue || '')}" ${pacRO} ${surveille('corrective_date_prevue')} style="${lockedBg(pacEditable)}">
                            </div>
                        </div>
                        <textarea class="form-input${classeAmendee('actions_correctives')}" id="pac_actions_correctives" rows="2" ${pacRO} ${surveille('actions_correctives')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.actions_correctives || '')}</textarea>
                        ${motifBloc('actions_correctives')}
                        ${motifBloc('corrective_date_prevue')}
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                        <div id="pac_corrective_preuves_list">${renderProofList(pac.corrective_preuves, 'pac_corrective_preuves_list', preuvesEditable)}</div>
                        ${renderUploadZone('pac_corrective_preuves', 'pac_corrective_preuves_list', preuvesEditable)}
                    </div>
                    ${renderVersionsPac()}
                </div>
            </div>

        </div>`;
}

// Section B, volet droit — les commentaires de suivi de l’Autorité.
function _execPacSuiviHtml(c) {
    const {
        isAAC, isSoldee, evaluationOuverte, aacEditable, pac, commentairesSuivi,
    } = c;
    return `
        <div class="exec-pac-volet" id="execPacVolet">
            <button type="button" class="exec-pac-volet-poignee" onclick="execPacVoletToggle()"
                    title="${te('volet_deplier')}" aria-expanded="false" aria-controls="execPacVoletCorps">
                <span class="exec-pac-volet-chevron">${EXEC_ICONS.chevronDown}</span>
                <span class="exec-pac-volet-titre">${te('details_suivi')}</span>
            </button>
            <div class="exec-pac-volet-corps" id="execPacVoletCorps">
                <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                    <div class="exec-form-section-header exec-teinte-ambre" onclick="execPacVoletToggle()">
                        <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                        <span class="exec-form-section-title">${te('details_suivi')}</span>
                    </div>
                    <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                        <p style="font-size:0.74rem;color:var(--text-muted);margin:0 0 0.5rem 0;">${te('details_suivi_intro')}</p>
                        <div id="pac_suivi_liste" class="exec-suivi-liste">
                            ${commentairesSuivi.length
                                ? (() => { let rang = 0; const dernier = commentairesSuivi.length - 1;
                                    return commentairesSuivi
                                        .map((c, i) => _execCommentaireSuiviHtml(c, aacEditable,
                                            c.publie ? ++rang : 0, i === dernier))
                                        .join(''); })()
                                : `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>`}
                        </div>
                        ${isAAC && !isSoldee && !evaluationOuverte ? `
                        <p class="exec-suivi-attente">${te('suivi_attente_soumission')}</p>` : ''}
                        ${aacEditable ? `
                        <!-- Rédaction réservée à l'AAC : items visés, précision, texte -->
                        <div class="exec-suivi-composeur">
                            <div class="exec-suivi-items">
                                ${EXEC_PAC_ITEMS_COMMENTABLES.map((it) => `<label class="exec-suivi-puce">
                                    <input type="checkbox" value="${it}" onchange="execSuiviItemsChange(this)"> <span>${te(`item_${it}`)}</span>
                                </label>`).join('')}
                                <label class="exec-suivi-puce">
                                    <input type="checkbox" value="autres" id="pac_suivi_autres" onchange="execSuiviItemsChange(this)"> <span>${te('motif_autres')}</span>
                                </label>
                                <input type="text" class="form-input exec-suivi-precision" id="pac_suivi_precision"
                                       placeholder="${te('motif_preciser')}" hidden>
                            </div>
                            <div class="exec-suivi-saisie">
                                <textarea class="form-input" id="pac_suivi_texte" rows="2" disabled
                                          placeholder="${te('suivi_choisir_item')}"></textarea>
                                <button class="btn btn-sm btn-primary" id="pac_suivi_ajouter" disabled
                                        onclick="execAjouterCommentaireSuivi()">${te('ajouter_commentaire')}</button>
                            </div>
                            <!-- Pièces jointes du commentaire, déposées avant l'ajout. -->
                            <div class="exec-suivi-pj">
                                <div id="pac_suivi_pj_liste"></div>
                                <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()">
                                    ${EXEC_ICONS.upload} ${te('joindre_fichier')}
                                </button>
                                <input type="file" style="display:none;" multiple
                                       onchange="execSuiviJoindreFichiers(this)">
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

// Section C — résultats du suivi : acceptation, vérification, clôture. Elle
// n'apparaît qu'à l'Autorité, et au prestataire une fois la constatation soldée.
function _execPacResultatsHtml(c) {
    const {
        fnc, aacEditable, showAACSection, aacRO, aacDis, lockedBg,
        pac, acceptation, verification, cloture, renderProofList, renderUploadZone,
    } = c;
    if (!showAACSection) return '';
    return `
    <div class="exec-form-section expanded exec-resultats" id="exec_resultats_suivi" style="margin-top:0.6rem;">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">C</span>
            <span class="exec-form-section-title">${te('resultats_suivi')}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <!-- Trois blocs de largeurs 1 / 3 / 2, de hauteurs alignées. -->
            <div style="display:grid;grid-template-columns:1fr 3fr 2fr;gap:0.85rem;align-items:stretch;">

                <!-- C1 Acceptation -->
                <div class="exec-resultats-bloc">
                    <div class="exec-resultats-bloc-titre">${te('acceptation_propositions')}</div>
                    <label class="exec-pac-case">
                        <input type="checkbox" id="anac_pac_accepte" onchange="execPacTeinteResultats()" ${acceptation.accepte === 'OUI' ? 'checked' : ''} ${aacDis}>
                        <span>${te('pac_accepte')}</span>
                    </label>
                    <div class="form-group" style="margin-top:0.45rem;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_acceptation')}</label>
                        <input type="date" class="form-input" id="anac_date_acceptation" value="${_escAttr(acceptation.date || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                    </div>
                </div>

                <!-- C2 Commentaire général de suivi : autant d'entrées que de
                     suivis, chacune datée et signée. -->
                <div class="exec-resultats-bloc" style="display:flex;flex-direction:column;">
                    <div class="exec-resultats-bloc-titre">${te('commentaire_general_suivi')}</div>
                    <div id="anac_suivis_list" class="exec-suivis" style="flex:1;">
                        ${(verification.suivis || []).length
                            ? (verification.suivis || []).map((s) => _execSuiviHtml(s, aacEditable)).join('')
                            : `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_suivi')}</em>`}
                    </div>
                    ${aacEditable ? `<div style="display:flex;gap:0.35rem;margin-top:0.45rem;">
                        <textarea class="form-input" id="anac_suivi_saisie" rows="1" placeholder="${te('suivi_placeholder')}" style="flex:1;font-size:0.76rem;padding:0.3rem;"></textarea>
                        <button class="btn btn-sm btn-primary" onclick="execAjouterSuivi()" style="padding:0.3rem 0.55rem;font-size:0.72rem;">${te('ajouter_suivi')}</button>
                    </div>` : ''}
                    <label class="exec-pac-case" style="margin-top:0.45rem;">
                        <input type="checkbox" id="anac_verif_terrain" onchange="execPacTeinteResultats()" ${verification.verification_terrain ? 'checked' : ''} ${aacDis}>
                        <span>${te('verifier_terrain')}</span>
                    </label>
                </div>

                <!-- C3 Preuves de mise en oeuvre recueillies -->
                <div class="exec-resultats-bloc">
                    <div class="exec-resultats-bloc-titre">${te('preuves_recueillies')}</div>
                    <div id="anac_preuves_mise_oeuvre_list">${renderProofList(verification.preuves_mise_oeuvre, 'anac_preuves_mise_oeuvre_list', aacEditable)}</div>
                    ${renderUploadZone('anac_preuves_mise_oeuvre', 'anac_preuves_mise_oeuvre_list', aacEditable)}
                </div>

            </div>

            <!-- 3d Clôture : pleine largeur, sous les trois blocs -->
            <div class="exec-resultats-bloc" style="margin-top:0.85rem;">
                <div class="exec-resultats-bloc-titre">${te('cloture_fnc')}</div>
                    <label class="exec-pac-case">
                        <input type="checkbox" id="anac_mise_effective" onchange="execPacTeinteResultats()" ${cloture.mise_en_oeuvre_effective === 'OUI' ? 'checked' : ''} ${aacDis}>
                        <span>${te('mise_oeuvre_effective')}</span>
                    </label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.45rem;">
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_solde')}</label>
                            <input type="date" class="form-input" id="anac_date_solde" value="${_escAttr(cloture.date_solde || (fnc.date_solde ? fnc.date_solde.slice(0,10) : ''))}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('solde_par')}</label>
                            <input type="text" class="form-input" id="anac_solde_par" value="${_escAttr(cloture.solde_par || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                    </div>
            </div>
        </div>`;
}

// Volet « Suivi du PAC » : assemble le contexte, les sections, puis l'affiche.
async function execOpenPACSlider(fncId) {
    let fnc;
    let echangesPac = [];
    try {
        [fnc, echangesPac] = await Promise.all([
            api(`${EXEC_MODULE_API}/constatations/${fncId}`),
            api(`${EXEC_MODULE_API}/constatations/${fncId}/echanges`).catch(() => []),
        ]);
    } catch (e) {
        console.error('Load constatation error:', e);
        return;
    }
    if (!fnc) return;
    echangesPac = echangesPac || [];
    EXEC_STATE.selectedConstatation = fnc;
    // Le formulaire se rappelle lui-même à chaque étape : la provenance ne
    // doit se perdre que si l'on passe à une autre constatation.
    execPrendreRetour('pac:' + fncId);

    const droits = _execPacDroits(fnc, fncId);
    const donnees = _execPacDonnees(fnc, droits);
    const c = { fnc, fncId, ...droits, ...donnees };
    Object.assign(c, _execPacOutils(fnc, c));

    const bodyHtml = `
    <div class="exec-proc-entete-collant">${execPacFilHtml(c.statut, c.evaluationANAC, c.submitInfo, _execPacActionsFil(c))}</div>
    ${_execPacBandeauxHtml(c)}
    ${_execPacRappelHtml(c)}

    <!-- Section B — PAC (à gauche) + Commentaires de suivi (à droite) -->
    <div class="exec-pac-rangee">
        ${_execPacPlanHtml(c)}
        ${_execPacSuiviHtml(c)}
    </div>

    ${_execPacResultatsHtml(c)}`;

    // ── Barre du bas ─────────────────────────────────────────────────
    // Annuler abandonne les saisies en cours sans refermer le formulaire.
    let footerHtml = `<button class="btn btn-outline" onclick="execAnnulerSaisiePAC('${fncId}')">${te('cancel')}</button>`;

    // Brouillon — visible for AAC and Postulant when not soldée
    if (!c.isSoldee) {
        footerHtml += ` <button class="btn btn-outline" onclick="execSaveDraftPAC('${fncId}')">${te('sauver_brouillon')}</button>`;
    }

    // Soumettre, Renvoyer, Accepter PAC, Accepter PAC et Preuves, Non
    // acceptable, Acceptable, Clôturer : tous sur la ligne du fil.

    // Export PDF de la fiche complète, à tout moment du circuit.
    footerHtml += ` <button class="btn btn-primary" onclick="execExporterFncPdf('${fncId}')">${EXEC_ICONS.download} ${te('export_pdf')}</button>`;

    // Bandeau : sortie du formulaire à l'extrême gauche, avant son intitulé.
    // Retour ramène là d'où l'on vient quand une provenance a été armée, et
    // referme simplement le volet sinon.
    const titreHtml = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execRetourVolet()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.constatations} ${te('suivi_pac')} — ${_esc(fnc.reference || '')}`;
    execShowSlider(titreHtml, bodyHtml, footerHtml, 'max');
    EXEC_STATE.voletRejouer = () => execOpenPACSlider(fncId);
    // Le formulaire se rejoue à chaque étape : pas de glissement du volet ni de
    // fondu du corps entre deux états.
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
    // Le bandeau porte l'accès aux discussions à la place de la croix.
    _execPacInstallerDiscussions(fncId, echangesPac, c.isSoldee);
    execPacTeinteResultats();
}


function _collectProofsFromContainer(containerId) {
    const proofs = [];
    document.querySelectorAll(`#${containerId} > div`).forEach((div, i) => {
        const d = div.dataset || {};
        if (!d.path) return;
        proofs.push({
            numero: i + 1,
            filename: d.filename || d.intitule || '',
            path: d.path,
            intitule: d.intitule || '',
            commentaire: d.commentaire || '',
            date: d.date || '',
        });
    });
    return proofs;
}

// ── Pièces jointes : intitulé, commentaire, numérotation ─────────
// Une pièce se lit de la même façon qu'elle vienne du serveur ou d'un dépôt
// à l'instant : un seul gabarit, et une renumérotation après chaque retrait.
function _execPreuveHtml(p, numero, editable) {
    const intitule = p.intitule || p.filename || '';
    const fichier = p.filename || '';
    // Le fichier s'ouvre dans un onglet, servi sous l'intitulé de la pièce ;
    // son nom d'origine ne paraît nulle part.
    const lien = p.path
        ? `${p.path}${p.path.includes('?') ? '&' : '?'}nom=${encodeURIComponent(intitule)}`
        : '';
    const date = (p.date || '').slice(0, 10);
    return `<div class="exec-preuve" data-path="${_escAttr(p.path || '')}" data-filename="${_escAttr(fichier)}"
                 data-intitule="${_escAttr(intitule)}" data-commentaire="${_escAttr(p.commentaire || '')}"
                 data-date="${_escAttr(date)}">
        <div class="exec-preuve-tete">
            <span class="exec-preuve-num">${numero}</span>
            ${EXEC_ICONS.file}
            ${lien
                ? `<a class="exec-preuve-intitule" href="${_escAttr(lien)}" target="_blank" rel="noopener"
                       title="${te('ouvrir_piece')}">${_esc(intitule)}</a>`
                : `<span class="exec-preuve-intitule">${_esc(intitule)}</span>`}
            ${date ? `<span class="exec-preuve-date" title="${te('preuve_date')}">${_formatDate(date)}</span>` : ''}
            ${editable ? `<button type="button" class="btn btn-sm btn-outline" title="${te('modifier_piece')}"
                onclick="execPreuveModifier(this)">${EXEC_ICONS.edit}</button>
            <button type="button" class="btn btn-sm btn-danger" title="${te('supprimer')}"
                onclick="execPreuveSupprimer(this)">${EXEC_ICONS.x}</button>` : ''}
        </div>
        <div class="exec-preuve-comm"${p.commentaire ? '' : ' hidden'}>${_esc(p.commentaire || '')}</div>
    </div>`;
}

// Reprise de l'intitulé et du commentaire d'une pièce déjà déposée.
window.execPreuveModifier = async function (bouton) {
    const ligne = bouton.closest('.exec-preuve');
    if (!ligne) return;
    const d = ligne.dataset;
    const saisie = await _execPreuveModal(d.intitule || d.filename || '', {
        titre: te('modifier_piece'),
        intitule: d.intitule || '',
        commentaire: d.commentaire || '',
        valider: te('enregistrer'),
    });
    if (!saisie) return;
    d.intitule = saisie.intitule;
    d.commentaire = saisie.commentaire;
    const titre = ligne.querySelector('.exec-preuve-intitule');
    if (titre) {
        titre.textContent = saisie.intitule;
        if (titre.tagName === 'A' && d.path) {
            titre.href = `${d.path}${d.path.includes('?') ? '&' : '?'}nom=${encodeURIComponent(saisie.intitule)}`;
        }
    }
    const comm = ligne.querySelector('.exec-preuve-comm');
    if (comm) {
        comm.textContent = saisie.commentaire;
        comm.hidden = !saisie.commentaire;
    }
};

function _execRenumeroterPreuves(container) {
    if (!container) return;
    [...container.children].forEach((div, i) => {
        const num = div.querySelector('.exec-preuve-num');
        if (num) num.textContent = String(i + 1);
    });
}

window.execPreuveSupprimer = function (bouton) {
    const ligne = bouton.closest('.exec-preuve');
    const container = ligne && ligne.parentElement;
    if (ligne) ligne.remove();
    _execRenumeroterPreuves(container);
};

// Boîte de dialogue posée avant l'envoi : intitulé de la pièce, puis
// commentaire facultatif adressé à l'AAC. Résout à `null` si l'on renonce.
function _execPreuveModal(nomFichier, reprise) {
    return new Promise((resolve) => {
        document.getElementById('exec_preuve_modal')?.remove();
        const r = reprise || {};
        const defaut = r.intitule !== undefined && r.intitule !== ''
            ? r.intitule
            : String(nomFichier || '').replace(/\.[^.]+$/, '');
        const el = document.createElement('div');
        el.id = 'exec_preuve_modal';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
        const fermer = (valeur) => { el.remove(); resolve(valeur); };
        el.onclick = (e) => { if (e.target === el) fermer(null); };
        el.innerHTML = `
        <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 1rem;font-size:1rem;font-weight:700;">${r.titre || te('preuve_dialogue_titre')}</h3>
            <div class="form-group" style="margin-bottom:0.85rem;">
                <label for="exec_preuve_intitule" style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">${te('preuve_intitule')} *</label>
                <input type="text" id="exec_preuve_intitule" class="form-input" value="${_escAttr(defaut)}" placeholder="${te('preuve_intitule_exemple')}">
            </div>
            <div class="form-group" style="margin-bottom:1.25rem;">
                <label for="exec_preuve_commentaire" style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">${te('preuve_commentaire')}</label>
                <textarea id="exec_preuve_commentaire" class="form-input" rows="3" style="resize:vertical;" placeholder="${te('preuve_commentaire_aide')}">${_esc(r.commentaire || '')}</textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
                <button class="btn btn-outline" id="exec_preuve_annuler">${te('cancel')}</button>
                <button class="btn btn-primary" id="exec_preuve_ok">${r.valider || te('ajouter')}</button>
            </div>
        </div>`;
        document.body.appendChild(el);
        const champ = el.querySelector('#exec_preuve_intitule');
        champ.focus();
        champ.select();
        el.querySelector('#exec_preuve_annuler').onclick = () => fermer(null);
        el.querySelector('#exec_preuve_ok').onclick = () => {
            const intitule = (champ.value || '').trim();
            if (!intitule) { _execToast(te('preuve_intitule_requis'), 'warning'); champ.focus(); return; }
            fermer({ intitule, commentaire: (el.querySelector('#exec_preuve_commentaire').value || '').trim() });
        };
        champ.onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('#exec_preuve_ok').click(); };
    });
}

function execUploadPACProof(inputPrefix) {
    document.getElementById(`${inputPrefix}_input`)?.click();
}

async function execHandlePACProofUpload(files, containerId) {
    if (!files || files.length === 0) return;
    const container = document.getElementById(containerId);
    for (const file of files) {
        // L'intitulé est demandé avant l'envoi : renoncer n'envoie rien.
        const saisie = await _execPreuveModal(file.name);
        if (!saisie) continue;
        const formData = new FormData();
        formData.append('file', file);
        // Le serveur enregistre la pièce sous cet intitulé, non sous le nom
        // du fichier choisi sur le poste.
        formData.append('nom', saisie.intitule);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok' && container) {
                container.insertAdjacentHTML('beforeend', _execPreuveHtml({
                    filename: data.filename, path: data.path,
                    intitule: saisie.intitule, commentaire: saisie.commentaire,
                    date: new Date().toISOString().slice(0, 10),
                }, container.children.length + 1, true));
                _execRenumeroterPreuves(container);
            }
        } catch (e) {
            console.error('Upload PAC proof error:', e);
            _execToast((e && e.message) || 'Erreur lors du dépôt de la pièce', 'error');
        }
    }
}

// ── Per-item comment thread (Détails du suivi) ───────────────────
