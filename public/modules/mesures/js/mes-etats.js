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
        ${lien('xlsx', MES_ICONES_ETAT.excel, 'Exporter Excel',
            'Classeur Excel des lignes affichées, filtres compris')}
        ${lien('pdf', MES_ICONES_ETAT.pdf, 'Exporter PDF',
            'Document PDF des lignes affichées, filtres compris')}
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
    const dec = { classer: 'Classer', investiguer: 'Investiguer', mesures: 'Prendre des mesures' };

    return [
        {
            id: 'suite', titre: 'Suite à donner',
            sous: [{
                nom: 'Instruction et décision',
                jalons: [
                    j(t.date_creation, 'Traitement déclenché', t.created_by),
                    t.decide_le && j(t.decide_le, `Décision : ${dec[t.decision] || t.decision}`,
                        t.decide_par, t.decision_motif),
                ].filter(Boolean),
            }],
        },
        {
            id: 'investigations', titre: 'Investigations',
            sous: [
                {
                    nom: 'Conduite de l’enquête',
                    jalons: [
                        (inv.equipe || []).length
                            && j(inv.soumise_le || t.decide_le, `${inv.equipe.length} enquêteur(s) désigné(s)`, ''),
                        (inv.travaux || []).length
                            && j(inv.soumise_le || t.decide_le, `${inv.travaux.length} investigation(s) consignée(s)`, ''),
                        inv.soumise_le && j(inv.soumise_le, 'Investigation soumise', inv.soumise_par),
                    ].filter(Boolean),
                },
                {
                    nom: 'Renvois de l’instance',
                    jalons: (inv.renvois || []).map((r) => j(r.renvoye_le,
                        'Renvoyée pour complément d’enquête', r.renvoye_par, r.motif, true)).filter(Boolean),
                },
            ],
        },
        {
            id: 'qualification', titre: 'Qualification et Mesures',
            sous: [
                {
                    nom: 'Instance décisionnelle',
                    jalons: [
                        (q.membres || []).length && j(t.qualifie_le || inv.soumise_le,
                            `${q.membres.length} membre(s) siégeant`, ''),
                        ...(q.reunions || []).map((r) => j(r.date, `Réunion — ${r.objet || 'séance'}`,
                            '', r.resultat)),
                    ].filter(Boolean),
                },
                {
                    nom: 'Qualification',
                    jalons: [
                        q.infraction_constituee && j(t.qualifie_le, 'Infraction constituée', t.qualifie_par, q.nature),
                        q.infraction_non_constituee && j(t.classe_le, 'Infraction non constituée', t.classe_par),
                        t.classe_le && j(t.classe_le, 'Carence classée sans suite', t.classe_par),
                        t.qualifie_le && j(t.qualifie_le, 'Qualification validée', t.qualifie_par),
                    ].filter(Boolean),
                },
                {
                    nom: 'Recours',
                    jalons: [
                        t.recours_ouvert_le && j(t.recours_ouvert_le, 'Examen de recours ouvert', t.recours_ouvert_par),
                        ...(q.mesures || []).filter((m) => m.recours_intente && (m.recours || {}).decision)
                            .map((m) => j(t.recours_ouvert_le,
                                `Recours — ${({ maintenir: 'mesure maintenue', modifier: 'mesure modifiée', annuler: 'mesure annulée' })[m.recours.decision]}`,
                                '', m.recours.commentaire)),
                    ].filter(Boolean),
                },
            ],
        },
        {
            id: 'suivi', titre: 'Suivi des Mesures',
            sous: [
                {
                    nom: 'Mesures au registre',
                    jalons: (mesures || []).map((m) => j(m.date_creation,
                        `${m.reference} — ${mesLibelleCategorie(m.categorie)}`, m.created_by,
                        (MES_SUIVI[mesStatutSuivi(m)] || {}).libelle)).filter(Boolean),
                },
                {
                    nom: 'Clôture',
                    jalons: [
                        (t.suivi || {}).maj_le && j(t.suivi.maj_le, 'Suivi mis à jour', t.suivi.maj_par),
                        t.cloture_le && j(t.cloture_le, 'Traitement clôturé', t.cloture_par),
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
    } catch (e) { mesToast(e.message || 'Historique indisponible', 'error'); return; }

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
                    </div>`).join('') : '<div class="mes-histo-attente">En attente</div>'}
            </div>`).join('');
        return `
            <section class="${classe}">
                <header>
                    <span class="mes-histo-puce"></span>
                    <h4>${_mesEsc(e.titre)}</h4>
                    <span class="mes-histo-etat">${faite ? 'Franchie' : (courante ? 'En cours' : 'À venir')}</span>
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
                <span style="flex:1;">${MES_ICONES_ETAT.clock} Historique du traitement</span>
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
                        clos ? 'Traitement clos' : 'Traitement en cours'}</div>
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
        const nom = { temporelle: 'Limitée dans le temps', illimitee: 'Illimitée', sans_objet: 'Sans objet' }[m.portee];
        if (!nom) return '';
        const duree = m.portee === 'temporelle' && m.duree_valeur
            ? ` · ${m.duree_valeur} ${m.duree_unite || 'jours'}` : '';
        return `${nom}${duree}`;
    };

    const blocs = liees.map((m) => {
        const suivi = MES_SUIVI[mesStatutSuivi(m)] || {};
        return `<div class="mes-bloc">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${_mesEsc(m.reference || 'Mesure')}</span>
                <span class="mes-badge ${_mesAttr(suivi.classe || '')}"
                      title="${_mesAttr(suivi.aide || '')}">${_mesEsc(suivi.libelle || '—')}</span>
            </div>
            <div class="mes-bloc-corps">
                <dl style="margin:0;">
                    ${mesLigneFiche('Catégorie', mesLibelleCategorie(m.categorie))}
                    ${mesLigneFiche('Type', mesLibelleType(m.type_mesure))}
                    ${mesLigneFiche('Date de sanction', mesDate(m.date_sanction || m.date_emission))}
                    ${mesLigneFiche('Portée', portee(m))}
                    ${mesLigneFiche('Échéance', mesDate(m.date_echeance))}
                </dl>
                <div class="mes-champ" style="margin:.5rem 0 0;">
                    <label>Description de la sanction</label>
                    <div class="mes-lecture">${m.description ? _mesEsc(m.description)
            : '<span class="mes-preuve-vide">—</span>'}</div>
                </div>
                ${m.suivi_commentaire ? `<div class="mes-champ" style="margin:.5rem 0 0;">
                    <label>Commentaire de suivi</label>
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
