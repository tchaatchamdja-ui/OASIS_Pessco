/* OASIS / Mesures d'Application — états exportables et historique d'une carence.
 *
 * Deux services rendus aux deux listes du module : sortir ce que l'écran
 * montre — classeur ou document — et rouvrir le fil d'un dossier, daté et
 * signé, sans quitter la liste.
 *
 * Cinquième fichier du module, pour la raison des autres : le garde-fou du
 * smoke refuse un fichier au-delà de 2000 lignes. Chargé après eux, il lit
 * l'état commun (MES_STATE) et leurs utilitaires ; rien ici ne s'exécute au
 * chargement.
 */

// ══════════════════════════════════════
//  États exportables
// ══════════════════════════════════════
// L'export reprend les critères de l'écran : on sort ce qu'on regarde, non la
// totalité de la base. Le classeur se télécharge, le document s'ouvre dans un
// onglet — c'est la façon dont chacun se consulte.

const MES_ICONES_ETAT = {
    pdf: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
        + '<polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/>'
        + '<line x1="8" y1="17" x2="13" y2="17"/></svg>',
    excel: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'
        + '<line x1="9" y1="9" x2="9" y2="21"/></svg>',
    clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
};

const mesParametresCarences = () => {
    const F = MES_STATE.filtres;
    return new URLSearchParams(Object.entries({
        origine: F.crit_origine || '', statut: F.crit_statut || '',
        prestataire: F.crit_prest || '', recherche: F.crit_recherche || '',
    }).filter((x) => x[1])).toString();
};

const mesParametresMesures = () => {
    const F = MES_STATE.filtres;
    return new URLSearchParams(Object.entries({
        categorie: F.mes_categorie || '', suivi: F.mes_statut || '',
        prestataire: F.mes_prest || '', recherche: F.mes_recherche || '',
        carence: F.mes_carence || '',
    }).filter((x) => x[1])).toString();
};

// Deux liens de même facture : le classeur pour retraiter, le document pour
// transmettre. Ce sont de vrais liens, non des téléchargements lancés par
// script : un navigateur écarte sans bruit un enregistrement dont le geste de
// l'utilisateur n'est plus « frais », et l'attente du serveur suffit à
// l'épuiser — le rendu d'un PDF prend quelques secondes. Un lien n'a pas cette
// fragilité, et la réponse porte « Content-Disposition: attachment », qui dit
// au navigateur d'enregistrer plutôt que d'ouvrir.
const MES_EXPORTS = {
    constatations: 'mesParametresCarences',
    mesures: 'mesParametresMesures',
};

function mesUrlExport(base, format) {
    const fabrique = window[MES_EXPORTS[base]];
    const requete = typeof fabrique === 'function' ? fabrique() : '';
    return `${MES_API}/${base}/export.${format}${requete ? `?${requete}` : ''}`;
}

function mesBoutonsExport(base) {
    const lien = (format, icone, libelle, aide) => `<a class="btn btn-sm mes-btn-export" download
        data-export="${_mesAttr(base)}" data-format="${format}"
        href="${_mesAttr(mesUrlExport(base, format))}"
        title="${_mesAttr(aide)}">${icone} ${libelle}</a>`;
    return `<div class="mes-exports">
        ${lien('xlsx', MES_ICONES_ETAT.excel, mt('exporter_excel'), mt('excel_aide'))}
        ${lien('pdf', MES_ICONES_ETAT.pdf, mt('exporter_pdf'), mt('pdf_aide'))}
    </div>`;
}

// La recherche ne redessine que le corps de la table : sans cela, l'adresse
// des liens resterait celle d'avant la frappe.
function mesMajLiensExport() {
    document.querySelectorAll('a[data-export]').forEach((a) => {
        a.href = mesUrlExport(a.dataset.export, a.dataset.format);
    });
}

// ══════════════════════════════════════
//  Historique d'une carence
// ══════════════════════════════════════
// Le fil du traitement, daté et signé. Une section par étape, et sous chacune
// ce qui s'y est passé. Ce qui n'est pas advenu reste visible, en attente : on
// lit d'un coup d'œil où en est le dossier et ce qu'il reste à faire.

const MES_HISTO_ETAPES = ['suite', 'investigations', 'qualification', 'suivi'];

function mesHistoriqueEtapes(t, mesures) {
    const j = (date, libelle, acteur, detail, alerte) => (date || detail ? {
        date: date || '', libelle, acteur: acteur || '', detail: detail || '', alerte: !!alerte,
    } : null);
    const inv = t.investigation || {};
    const q = t.qualification || {};
    const dec = (cle) => (MES_DECISIONS.some((d) => d.cle === cle) ? mesNomDecision(cle) : cle);

    return [
        {
            id: 'suite', titre: mt('fil_suite'),
            sous: [{
                nom: mt('h_instruction'),
                jalons: [
                    j(t.date_creation, mt('h_traitement_declenche'), t.created_by),
                    t.decide_le && j(t.decide_le, mt('h_decision', dec(t.decision)),
                        t.decide_par, t.decision_motif),
                ].filter(Boolean),
            }],
        },
        {
            id: 'investigations', titre: mt('fil_investigations'),
            sous: [
                {
                    nom: mt('h_conduite_enquete'),
                    jalons: [
                        (inv.equipe || []).length
                            && j(inv.soumise_le || t.decide_le, mt('h_enqueteurs', inv.equipe.length), ''),
                        (inv.travaux || []).length
                            && j(inv.soumise_le || t.decide_le, mt('h_investigations', inv.travaux.length), ''),
                        inv.soumise_le && j(inv.soumise_le, mt('investigation_soumise'), inv.soumise_par),
                    ].filter(Boolean),
                },
                {
                    nom: mt('h_renvois'),
                    jalons: (inv.renvois || []).map((r) => j(r.renvoye_le,
                        mt('h_renvoyee'), r.renvoye_par, r.motif, true)).filter(Boolean),
                },
            ],
        },
        {
            id: 'qualification', titre: mt('fil_qualification'),
            sous: [
                {
                    nom: mt('sec_instance'),
                    jalons: [
                        (q.membres || []).length && j(t.qualifie_le || inv.soumise_le,
                            mt('h_membres', q.membres.length), ''),
                        ...(q.reunions || []).map((r) => j(r.date, mt('h_reunion', r.objet || mt('q_seance')),
                            '', r.resultat)),
                    ].filter(Boolean),
                },
                {
                    nom: mt('fil_qualification'),
                    jalons: [
                        q.infraction_constituee && j(t.qualifie_le, mt('h_infraction_constituee'), t.qualifie_par, q.nature),
                        q.infraction_non_constituee && j(t.classe_le, mt('h_infraction_non_constituee'), t.classe_par),
                        t.classe_le && j(t.classe_le, mt('h_carence_classee'), t.classe_par),
                        t.qualifie_le && j(t.qualifie_le, mt('h_qualification_validee'), t.qualifie_par),
                    ].filter(Boolean),
                },
                {
                    nom: mt('onglet_recours'),
                    jalons: [
                        t.recours_ouvert_le && j(t.recours_ouvert_le, mt('h_recours_ouvert'), t.recours_ouvert_par),
                        ...(q.mesures || []).filter((m) => m.recours_intente && (m.recours || {}).decision)
                            .map((m) => j(t.recours_ouvert_le,
                                mt('h_recours_decision', mt({ maintenir: 'h_mesure_maintenue',
                                    modifier: 'h_mesure_modifiee', annuler: 'h_mesure_annulee' }[m.recours.decision])),
                                '', m.recours.commentaire)),
                    ].filter(Boolean),
                },
            ],
        },
        {
            id: 'suivi', titre: mt('fil_suivi'),
            sous: [
                {
                    nom: mt('h_mesures_registre'),
                    jalons: (mesures || []).map((m) => j(m.date_creation,
                        `${m.reference} — ${mesLibelleCategorie(m.categorie)}`, m.created_by,
                        mesLibelleSuivi(mesStatutSuivi(m)))).filter(Boolean),
                },
                {
                    nom: mt('h_cloture'),
                    jalons: [
                        (t.suivi || {}).maj_le && j(t.suivi.maj_le, mt('h_suivi_maj'), t.suivi.maj_par),
                        t.cloture_le && j(t.cloture_le, mt('traitement_cloture'), t.cloture_par),
                    ].filter(Boolean),
                },
            ],
        },
    ];
}

async function mesHistorique(constatationId) {
    const c = MES_STATE.data.constatations.find((x) => x.id === constatationId);
    if (!c) return;
    let t = {};
    try {
        t = await mesApi(`/constatations/${encodeURIComponent(constatationId)}/traitement`);
    } catch (e) { mesToast(e.message || mt('h_indisponible'), 'error'); return; }

    const atteinte = MES_HISTO_ETAPES.indexOf(t.etape || 'suite');
    const clos = !!(t.classe_le || t.cloture_le);
    const etapes = mesHistoriqueEtapes(t, t.mesures || []);
    const quand = (v) => {
        const s = String(v || '');
        if (!s) return '—';
        const heure = s.length > 10 ? ` ${s.slice(11, 16)}` : '';
        return `${mesDate(s)}${heure}`;
    };

    const corps = etapes.map((e, rang) => {
        const faite = rang < atteinte || (clos && rang <= atteinte);
        const courante = !clos && rang === atteinte;
        const classe = ['mes-histo-etape', faite ? 'faite' : '', courante ? 'courante' : '']
            .filter(Boolean).join(' ');
        const sous = e.sous.map((s) => `
            <div class="mes-histo-sous${s.jalons.length ? '' : ' vide'}">
                <div class="mes-histo-sous-nom">${_mesEsc(s.nom)}</div>
                ${s.jalons.length ? s.jalons.map((x) => `
                    <div class="mes-histo-jalon">
                        <span class="mes-histo-date">${_mesEsc(quand(x.date))}</span>
                        <span class="mes-histo-libelle">${_mesEsc(x.libelle)}</span>
                        ${x.acteur ? `<span class="mes-histo-acteur">${_mesEsc(x.acteur)}</span>` : ''}
                        ${x.detail ? `<span class="mes-histo-detail${
                            x.alerte ? ' alerte' : ''}">${_mesEsc(x.detail)}</span>` : ''}
                    </div>`).join('') : `<div class="mes-histo-attente">${mt('h_en_attente')}</div>`}
            </div>`).join('');
        return `
            <section class="${classe}">
                <header>
                    <span class="mes-histo-puce"></span>
                    <h4>${_mesEsc(e.titre)}</h4>
                    <span class="mes-histo-etat">${faite ? mt('h_franchie') : (courante ? mt('h_en_cours') : mt('h_a_venir'))}</span>
                </header>
                <div class="mes-histo-sous-liste">${sous}</div>
            </section>`;
    }).join('');

    MES_STATE.histoOuvert = true;
    const el = document.getElementById('mesModalRoot');
    if (!el) return;
    el.innerHTML = `
    <div class="mes-modal-fond mes-histo-fond" onclick="mesFermerHistorique()">
        <div class="mes-volet-histo" onclick="event.stopPropagation();">
            <div class="mes-modal-header">
                <span style="flex:1;">${MES_ICONES_ETAT.clock} ${mt('historique_traitement')}</span>
                <button class="btn btn-outline btn-sm mes-btn-icone"
                        onclick="mesFermerHistorique()">${MES_ICONS.close}</button>
            </div>
            <div class="mes-modal-body">
                <div class="mes-histo">
                    <div class="mes-histo-entete">
                        <div class="mes-histo-objet">${_mesEsc(c.titre || c.reference || '—')}</div>
                        <div class="mes-histo-meta">${_mesEsc(c.reference || '')}${
                            c.prestataire_nom ? ` · ${_mesEsc(c.prestataire_nom)}` : ''}</div>
                    </div>
                    ${corps}
                    <div class="mes-histo-fin ${clos ? 'clos' : ''}">${
                        clos ? mt('h_traitement_clos') : mt('h_traitement_en_cours')}</div>
                </div>
            </div>
        </div>
    </div>`;
}

function mesFermerHistorique() {
    MES_STATE.histoOuvert = false;
    const el = document.getElementById('mesModalRoot');
    if (el) el.innerHTML = '';
}

// ══════════════════════════════════════
//  Mesures prises sur une carence
// ══════════════════════════════════════
// Le menu Carences dit combien de mesures une carence a values ; il ne disait
// pas lesquelles. Ce volet les montre là où la question se pose, sans quitter
// la liste ni ouvrir le dossier de traitement.

function mesMesuresDeCarence(constatationId) {
    const c = (MES_STATE.data.constatations || []).find((x) => x.id === constatationId);
    if (!c) return;
    const liees = (MES_STATE.data.mesures || [])
        .filter((m) => m.constatation_id === constatationId)
        .sort((a, b) => String(a.reference || '').localeCompare(String(b.reference || '')));

    const portee = (m) => {
        const nom = { temporelle: mt('limitee_temps'), illimitee: mt('illimitee'), sans_objet: mt('sans_objet') }[m.portee];
        if (!nom) return '';
        const duree = m.portee === 'temporelle' && m.duree_valeur
            ? ` · ${m.duree_valeur} ${m.duree_unite || 'jours'}` : '';
        return `${nom}${duree}`;
    };

    const blocs = liees.map((m) => {
        const cleSuivi = mesStatutSuivi(m);
        const suivi = MES_SUIVI[cleSuivi] || {};
        return `<div class="mes-bloc">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${_mesEsc(m.reference || mt('mesure'))}</span>
                <span class="mes-badge ${_mesAttr(suivi.classe || '')}"
                      title="${_mesAttr(MES_SUIVI[cleSuivi] ? mesAideSuivi(cleSuivi) : '')}">${
                          _mesEsc(MES_SUIVI[cleSuivi] ? mesLibelleSuivi(cleSuivi) : '—')}</span>
            </div>
            <div class="mes-bloc-corps">
                <dl style="margin:0;">
                    ${mesLigneFiche(mt('fiche_categorie'), mesLibelleCategorie(m.categorie))}
                    ${mesLigneFiche(mt('fiche_type'), mesLibelleType(m.type_mesure))}
                    ${mesLigneFiche(mt('fiche_date_sanction'), mesDate(m.date_sanction || m.date_emission))}
                    ${mesLigneFiche(mt('fiche_portee'), portee(m))}
                    ${mesLigneFiche(mt('col_echeance'), mesDate(m.date_echeance))}
                </dl>
                <div class="mes-champ" style="margin:.5rem 0 0;">
                    <label>${mt('fiche_desc_sanction')}</label>
                    <div class="mes-lecture">${m.description ? _mesEsc(m.description)
            : '<span class="mes-preuve-vide">—</span>'}</div>
                </div>
                ${m.suivi_commentaire ? `<div class="mes-champ" style="margin:.5rem 0 0;">
                    <label>${mt('commentaire_suivi')}</label>
                    <div class="mes-lecture">${_mesEsc(m.suivi_commentaire)}</div>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');

    const el = document.getElementById('mesModalRoot');
    if (!el) return;
    el.innerHTML = `
    <div class="mes-modal-fond mes-histo-fond" onclick="mesFermerHistorique()">
        <div class="mes-volet-histo" onclick="event.stopPropagation();">
            <div class="mes-modal-header">
                <span style="flex:1;">${MES_ICONS.shield} Mesures prises sur cette carence</span>
                <button class="btn btn-outline btn-sm mes-btn-icone"
                        onclick="mesFermerHistorique()">${MES_ICONS.close}</button>
            </div>
            <div class="mes-modal-body">
                <div class="mes-histo-entete">
                    <div class="mes-histo-objet">${_mesEsc(c.titre || c.reference || '—')}</div>
                    <div class="mes-histo-meta">${_mesEsc(c.reference || '')}${
    c.prestataire_nom ? ` · ${_mesEsc(c.prestataire_nom)}` : ''} · ${liees.length} mesure(s)</div>
                </div>
                ${blocs || '<p class="mes-preuve-vide">Aucune mesure n’est rattachée à cette carence.</p>'}
                ${liees.length ? `<div class="mes-volet-actions">
                    <button class="btn btn-primary btn-sm"
                            onclick="mesOuvrirTableMesures('${c.id}')">
                        ${MES_ICONS.shield} Ouvrir la table des Mesures</button>
                </div>` : ''}
            </div>
        </div>
    </div>`;
}

Object.assign(window, {
    MES_ICONES_ETAT, MES_EXPORTS, mesBoutonsExport, mesUrlExport, mesMajLiensExport,
    mesParametresCarences, mesParametresMesures,
    mesHistorique, mesFermerHistorique, mesHistoriqueEtapes, mesMesuresDeCarence,
});
