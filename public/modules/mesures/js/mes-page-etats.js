/* OASIS / Mesures d'Application — menu « États ».
 *
 * Situation d'ensemble du module, à l'image du menu « États » d'« Exécution de
 * la Surveillance » : cinq sous-menus qui disent où en est chaque dossier, ce
 * qui attend, ce qui est en retard et ce qui est clos. On y entre pour savoir
 * quoi faire ensuite, non pour saisir.
 *
 * Ce que SURV suit — des activités et leur circuit — CARE le suit sur deux
 * objets : la carence, qui se traite en quatre étapes, et la mesure, qui se
 * suit une fois arrêtée. Les cinq sous-menus les couvrent tous les deux.
 *
 * Sixième fichier du module, pour la raison des autres : le garde-fou du smoke
 * refuse un fichier au-delà de 2000 lignes. Chargé après eux, il lit l'état
 * commun (MES_STATE) et leurs utilitaires ; rien ici ne s'exécute au chargement.
 */

const MES_ETATS = { sub: 'a_traiter', ouvertes: {} };

// Les quatre étapes du traitement, dans l'ordre du fil. Le sous-menu
// « Traitements en cours » ouvre une section par étape.
const MES_ETATS_ETAPES = [
    { cle: 'suite', titre: 'Suite à donner',
      aide: 'Le traitement est déclenché ; la suite à donner n’est pas arrêtée.' },
    { cle: 'investigations', titre: 'Investigations',
      aide: 'L’enquête est ouverte ; son rapport n’est pas soumis à l’instance.' },
    { cle: 'qualification', titre: 'Qualification et Mesures',
      aide: 'L’instance siège ; l’infraction n’est pas encore qualifiée.' },
    { cle: 'suivi', titre: 'Suivi des Mesures',
      aide: 'Les mesures sont arrêtées ; leur mise en œuvre se suit.' },
];

// ── Répartition ──
// Une seule lecture des carences pour les quatre sous-menus : chacune tombe
// dans un seul seau, et les comptes s'en déduisent. Les mesures se suivent au
// menu qui porte leur nom ; les états ne parlent que du dossier.
function mesEtatsRepartir() {
    const jour = mesJour();
    const carences = MES_STATE.data.constatations || [];

    const enRetard = (c) => !!c.date_due_cloture && c.date_due_cloture < jour;
    const jours = (echeance) => {
        if (!echeance) return null;
        const d = new Date(`${echeance}T00:00:00Z`);
        const n = new Date(`${jour}T00:00:00Z`);
        if (Number.isNaN(d.getTime())) return null;
        return Math.round((d - n) / 86400000);
    };

    const classees = carences.filter((c) => c.classee);
    const ouvertes = carences.filter((c) => !c.classee);
    // Une carence est « à traiter » tant qu'aucune décision n'a été prise :
    // c'est le geste que le menu Carences appelle « Déclencher Traitement ».
    const aTraiter = ouvertes.filter((c) => !c.traitement_etape || c.traitement_etape === 'suite')
        .filter((c) => !c.traitement_decision);
    const enCours = ouvertes.filter((c) => c.traitement_etape && !c.traitement_clos
        && !(c.traitement_etape === 'suite' && !c.traitement_decision));
    const cloturees = ouvertes.filter((c) => c.traitement_clos);

    return {
        jours,
        aTraiter: aTraiter.map((c) => ({ ...c, retard: enRetard(c), reste: jours(c.date_due_cloture) })),
        enCours: enCours.map((c) => ({ ...c, retard: enRetard(c), reste: jours(c.date_due_cloture) })),
        cloturees,
        classees,
    };
}

// Le délai restant se lit comme dans SURV : le retard se voit, l'échéance
// proche se signale, le reste ne pèse pas.
function mesEtatsDelai(reste) {
    if (reste === null || reste === undefined) return '<span class="mes-delai">—</span>';
    if (reste < 0) return `<span class="mes-delai retard">${Math.abs(reste)} j de retard</span>`;
    if (reste === 0) return '<span class="mes-delai urgent">Aujourd’hui</span>';
    if (reste <= 7) return `<span class="mes-delai urgent">${reste} j</span>`;
    if (reste <= 30) return `<span class="mes-delai proche">${reste} j</span>`;
    return `<span class="mes-delai">${reste} j</span>`;
}

// Les tables du menu reprennent le format des deux listes du module : même
// entête au thème, mêmes filets — on passe de l'une à l'autre sans dépaysement.
function mesEtatsTableau(colonnes, lignes, vide) {
    if (!lignes) return `<p class="mes-etats-vide">${_mesEsc(vide)}</p>`;
    return `<div class="mes-table-wrap mes-etats-corps">
        <table class="mes-table mes-table-plate">
            <thead><tr>${colonnes.map((c) => {
        const style = [c.largeur ? `width:${c.largeur}` : '', c.centre ? 'text-align:center' : '']
            .filter(Boolean).join(';');
        return `<th${style ? ` style="${style};"` : ''}>${_mesEsc(c.titre)}</th>`;
    }).join('')}</tr></thead>
            <tbody>${lignes}</tbody>
        </table>
    </div>`;
}

// Le panneau n'a plus de bandeau de titre : il répétait le sous-menu qui le
// surmonte. Reste ce que le sous-menu ne dit pas — ce que le panneau contient,
// et le nombre de dossiers en retard, glissé au fil du texte.
const mesEtatsCarte = (alerte, intro, corps) => `
    <div class="mes-card mes-etats-carte">
        <p class="mes-etats-intro">${intro}${
        alerte ? ` <span class="mes-etats-compte retard">${_mesEsc(alerte)}</span>` : ''}</p>
        ${corps}
    </div>`;

// Les deux gestes que toute ligne offre : ouvrir le dossier, lire son
// histoire. Le reste dépend du sous-menu.
const mesEtatsActions = (id) => `
    <button class="btn btn-outline btn-sm mes-btn-icone" title="Ouvrir le traitement"
            onclick="mesMesureDepuisConstatation('${id}')">${MES_ICONS.edit}</button>
    <button class="btn btn-outline btn-sm mes-btn-icone" title="Historique du traitement"
            onclick="mesHistorique('${id}')">${MES_ICONES_ETAT.clock}</button>`;

const mesEtatsLigneCarence = (c, colonnes) => `
    <tr class="mes-etats-ligne" onclick="if(!event.target.closest('button'))mesMesureDepuisConstatation('${c.id}')">
        ${colonnes}
        <td class="mes-actions mes-etats-actions">${mesEtatsActions(c.id)}</td>
    </tr>`;

const mesEtatsReperes = (c) => `
    <td><strong>${_mesEsc(c.reference || '—')}</strong>
        <div class="mes-sous-titre">${_mesEsc(c.origine ? mesOrigine(c.origine) : '')}</div></td>
    <td>${_mesEsc(c.titre || '—')}</td>
    <td>${_mesEsc(c.prestataire_nom || '—')}</td>`;

// ── Sous-menu 1 : carences à traiter ──
function mesEtatsPanATraiter(R) {
    const lignes = R.aTraiter.map((c) => mesEtatsLigneCarence(c, `
        ${mesEtatsReperes(c)}
        <td>${_mesEsc(mesDate(c.date_ouverture))}</td>
        <td>${_mesEsc(mesDate(c.date_due_cloture))}</td>
        <td style="text-align:center;">${mesEtatsDelai(c.reste)}</td>`)).join('');
    const retard = R.aTraiter.filter((c) => c.retard).length;
    return mesEtatsCarte(retard ? `${retard} en retard` : '',
        'Carences reçues des modules de surveillance ou relevées ici, sur lesquelles aucune '
        + 'suite n’a encore été arrêtée. Ouvrir le dossier déclenche leur traitement.',
        mesEtatsTableau([
            { titre: 'Référence', largeur: '150px' }, { titre: 'Objet', largeur: '280px' },
            { titre: 'Prestataire', largeur: '160px' }, { titre: 'Ouverture', largeur: '110px' },
            { titre: 'Échéance', largeur: '110px' },
            { titre: 'Délai', largeur: '120px', centre: true },
            { titre: 'Actions', largeur: '100px', centre: true },
        ], lignes, 'Aucune carence n’attend de suite à donner.'));
}

// ── Sous-menu 2 : traitements en cours, une section par étape ──
function mesEtatsPanEnCours(R) {
    return MES_ETATS_ETAPES.map((e) => {
        const items = R.enCours.filter((c) => (c.traitement_etape || 'suite') === e.cle);
        const retard = items.filter((c) => c.retard).length;
        const lignes = items.map((c) => mesEtatsLigneCarence(c, `
            ${mesEtatsReperes(c)}
            <td>${_mesEsc(mesDate(c.date_due_cloture))}</td>
            <td style="text-align:center;">${mesEtatsDelai(c.reste)}</td>
            <td class="mes-cell-statut">${mesBadgeStatutCare(c.statut_care)}</td>`)).join('');
        // Chaque étape est un volet : on déplie ce qui appelle une action.
        const ouvert = MES_ETATS.ouvertes[e.cle] !== undefined
            ? MES_ETATS.ouvertes[e.cle] : items.length > 0;
        return `
            <details class="mes-card mes-etats-section" ${ouvert ? 'open' : ''}
                     ontoggle="MES_ETATS.ouvertes['${e.cle}']=this.open;">
                <summary>
                    <span class="mes-etats-chevron">${MES_ICONS.chevron}</span>
                    <span class="mes-etats-titre">${_mesEsc(e.titre)}</span>
                    <span class="mes-etats-compte${items.length > 1 ? ' alerte' : ''}">${items.length}</span>
                    ${retard ? `<span class="mes-etats-compte retard">${retard} en retard</span>` : ''}
                </summary>
                <div class="mes-etats-section-corps">
                    <p class="mes-etats-intro">${_mesEsc(e.aide)}</p>
                    ${mesEtatsTableau([
        { titre: 'Référence', largeur: '150px' }, { titre: 'Objet', largeur: '280px' },
        { titre: 'Prestataire', largeur: '160px' }, { titre: 'Échéance', largeur: '110px' },
        { titre: 'Délai', largeur: '120px', centre: true },
        { titre: 'Statut', largeur: '130px', centre: true },
        { titre: 'Actions', largeur: '100px', centre: true },
    ], lignes, 'Aucun dossier à cette étape.')}
                </div>
            </details>`;
    }).join('');
}

// ── Sous-menu 3 : carences clôturées ──
function mesEtatsPanCloturees(R) {
    const lignes = R.cloturees.map((c) => mesEtatsLigneCarence(c, `
        ${mesEtatsReperes(c)}
        <td>${_mesEsc(mesDate(c.date_ouverture))}</td>
        <td>${_mesEsc(mesDate(c.traitement_cloture_le || c.date_cloture))}</td>
        <td style="text-align:center;">${c.mesures_liees || 0}</td>`)).join('');
    return mesEtatsCarte('',
        'Carences dont le traitement est clos : les mesures ont été arrêtées et aucune '
        + 'n’appelle plus de suivi. Le dossier se consulte, il ne se réécrit plus.',
        mesEtatsTableau([
            { titre: 'Référence', largeur: '150px' }, { titre: 'Objet', largeur: '280px' },
            { titre: 'Prestataire', largeur: '160px' }, { titre: 'Ouverture', largeur: '110px' },
            { titre: 'Clôture', largeur: '110px' },
            { titre: 'Mesures', largeur: '90px', centre: true },
            { titre: 'Actions', largeur: '100px', centre: true },
        ], lignes, 'Aucune carence clôturée.'));
}

// ── Sous-menu 4 : carences classées ──
function mesEtatsPanClassees(R) {
    const lignes = R.classees.map((c) => mesEtatsLigneCarence(c, `
        ${mesEtatsReperes(c)}
        <td>${_mesEsc(mesDate(c.date_ouverture))}</td>
        <td>${_mesEsc(mesDate(c.date_cloture))}</td>
        <td>${c.classement_motif
        ? _mesEsc(c.classement_motif) : '<span class="mes-preuve-vide">—</span>'}</td>`)).join('');
    return mesEtatsCarte('',
        'Carences closes sans mesure d’application : l’autorité a jugé qu’aucune suite '
        + 'n’était à leur donner, ou l’instance que l’infraction n’était pas constituée.',
        mesEtatsTableau([
            { titre: 'Référence', largeur: '150px' }, { titre: 'Objet', largeur: '260px' },
            { titre: 'Prestataire', largeur: '150px' }, { titre: 'Ouverture', largeur: '110px' },
            { titre: 'Classement', largeur: '110px' }, { titre: 'Motif', largeur: '240px' },
            { titre: 'Actions', largeur: '100px', centre: true },
        ], lignes, 'Aucune carence classée.'));
}

// ── L'écran ──
function mesRenderEtats() {
    const R = mesEtatsRepartir();
    const retards = R.aTraiter.filter((c) => c.retard).length
        + R.enCours.filter((c) => c.retard).length;

    const onglets = [
        { cle: 'a_traiter', titre: 'Carences à traiter', compte: R.aTraiter.length },
        { cle: 'en_cours', titre: 'Traitements en cours', compte: R.enCours.length },
        { cle: 'cloturees', titre: 'Carences clôturées', compte: R.cloturees.length },
        { cle: 'classees', titre: 'Carences classées', compte: R.classees.length },
    ];
    const barre = `<div class="mes-sous-onglets mes-onglets-rang" role="tablist">
        <div class="mes-onglets-bande">${onglets.map((o) => `
            <button type="button" role="tab"
                    class="mes-sous-onglet${MES_ETATS.sub === o.cle ? ' actif' : ''}"
                    aria-selected="${MES_ETATS.sub === o.cle}"
                    onclick="mesEtatsVoir('${o.cle}')">${_mesEsc(o.titre)}
                <span class="mes-sous-onglet-compte">${o.compte}</span></button>`).join('')}
        </div>
    </div>`;

    const corps = {
        en_cours: () => mesEtatsPanEnCours(R),
        cloturees: () => mesEtatsPanCloturees(R),
        classees: () => mesEtatsPanClassees(R),
    }[MES_ETATS.sub] || (() => mesEtatsPanATraiter(R));

    return `
    <div class="mes-page-header">
        <h2>États</h2>
        ${retards ? `<span class="mes-etats-alerte">${retards} échéance${
        retards > 1 ? 's' : ''} dépassée${retards > 1 ? 's' : ''}</span>` : ''}
    </div>
    <p class="mes-note">
        Situation d’ensemble du module : ce qui attend une suite, ce qui est en cours de
        traitement, ce dont la mise en œuvre se suit, et ce qui est clos. Une ligne s’ouvre
        sur son dossier.
    </p>
    ${barre}
    <div class="mes-etats">${corps()}</div>`;
}

function mesEtatsVoir(cle) {
    MES_ETATS.sub = cle;
    mesRenderPage();
}

Object.assign(window, {
    MES_ETATS, MES_ETATS_ETAPES, mesEtatsRepartir, mesEtatsDelai,
    mesRenderEtats, mesEtatsVoir,
});
