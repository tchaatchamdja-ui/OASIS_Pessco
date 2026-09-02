/* OASIS — Module « Inspections d'aéronefs sur aire de trafic »
 * Écran « Statistiques » et écran « Importation ».
 */

// ══════════════════════════════════════
//  Écran 2 — Statistiques
// ══════════════════════════════════════
// Quatre blocs repliables : la situation générale par exploitant, les
// répartitions, l'évolution mensuelle et l'évolution annuelle.

const RAMP_BLOCS = { situation: true, repartitions: true, temporel: true };

function rampBasculerBloc(cle) {
    RAMP_BLOCS[cle] = !RAMP_BLOCS[cle];
    rampRenderPage();
}

function rampBasculerLigne(exploitant) {
    RAMP_STATE.lignesDepliees[exploitant] = !RAMP_STATE.lignesDepliees[exploitant];
    rampRenderPage();
}

// Situation générale : pour chaque exploitant, le nombre d'écarts par
// catégorie, le taux de clôture de chacune et le score normalisé — puis le
// même découpage item par item, sous une ligne dépliable.
function rampSituation() {
    const { inspections, ecarts } = rampFiltrer();
    const pond = rampPonderations();
    const taux = (clos, total) => (total > 0 ? `${Math.round((clos / total) * 100)} %` : '—');

    const brut = {};
    const neuf = () => ({
        insp: 0, items: 0,
        cat: { 1: 0, 2: 0, 3: 0, G: 0 },
        clos: { 1: 0, 2: 0, 3: 0, G: 0 },
        score: { 1: 0, 2: 0, 3: 0, G: 0 },
        scoreTotal: 0, totalEcarts: 0, closEcarts: 0, items_detail: {},
    });

    inspections.forEach((i) => {
        const e = i.exploitant || 'Inconnu';
        if (!brut[e]) brut[e] = neuf();
        brut[e].insp += 1;
        brut[e].items += Number(i.itemsInspectes) || 0;
    });

    ecarts.forEach((a) => {
        const e = a.inspection.exploitant || 'Inconnu';
        if (!brut[e]) brut[e] = neuf();
        const b = brut[e];
        const cat = ['1', '2', '3'].includes(String(a.categorie)) ? String(a.categorie) : 'G';
        const poids = pond[a.categorie] === undefined ? 1 : pond[a.categorie];
        const clos = rampEstClos(a.inspection.status);
        const code = a.itemCode || 'Inconnu';

        b.totalEcarts += 1;
        b.scoreTotal += poids;
        b.cat[cat] += 1;
        b.score[cat] += poids;
        if (clos) { b.closEcarts += 1; b.clos[cat] += 1; }

        if (!b.items_detail[code]) {
            b.items_detail[code] = { code, total: 0, clos: 0, cat: { 1: 0, 2: 0, 3: 0, G: 0 }, closCat: { 1: 0, 2: 0, 3: 0, G: 0 } };
        }
        const it = b.items_detail[code];
        it.total += 1;
        it.cat[cat] += 1;
        if (clos) { it.clos += 1; it.closCat[cat] += 1; }
    });

    return Object.entries(brut).map(([exploitant, b]) => {
        // Le score se rapporte toujours aux items inspectés : dix écarts sur
        // mille items ne valent pas dix écarts sur cent.
        const score = (v) => (b.items > 0 ? Number((v / b.items).toFixed(3)) : 0);
        return {
            exploitant, inspections: b.insp, items: b.items,
            cat1: b.cat['1'], cat2: b.cat['2'], cat3: b.cat['3'], catG: b.cat.G,
            taux1: taux(b.clos['1'], b.cat['1']), taux2: taux(b.clos['2'], b.cat['2']),
            taux3: taux(b.clos['3'], b.cat['3']), tauxG: taux(b.clos.G, b.cat.G),
            score1: score(b.score['1']), score2: score(b.score['2']),
            score3: score(b.score['3']), scoreG: score(b.score.G),
            scoreTotal: score(b.scoreTotal),
            totalEcarts: b.totalEcarts, tauxCloture: taux(b.closEcarts, b.totalEcarts),
            detail: Object.values(b.items_detail).map((it) => ({
                ...it,
                tauxCloture: taux(it.clos, it.total),
                taux1: taux(it.closCat['1'], it.cat['1']), taux2: taux(it.closCat['2'], it.cat['2']),
                taux3: taux(it.closCat['3'], it.cat['3']), tauxG: taux(it.closCat.G, it.cat.G),
            })).sort((x, y) => y.total - x.total),
        };
    }).sort((a, b) => b.scoreTotal - a.scoreTotal);
}

// ── Anneaux des répartitions ──
// Le modèle du tableau de bord : un disque, le total au centre, et une légende
// qui commande l'affichage — un clic retire une part, un autre la remet.
const RAMP_PALETTE_STATS = ['#1d4ed8', '#0d9488', '#f59e0b', '#dc2626', '#7c3aed',
    '#0891b2', '#65a30d', '#db2777', '#ea580c', '#475569'];

function rampAnneauStats(cle, entrees, vide) {
    const masques = (RAMP_STATE.anneauxMasques || {})[cle] || {};
    const tri = entrees.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!tri.length) return `<div class="ramp-vide">${_rEsc(vide)}</div>`;

    const total = tri.reduce((n, [lbl, v]) => n + (masques[lbl] ? 0 : v), 0);
    const r = 54;
    const circonference = 2 * Math.PI * r;
    let debut = 0;
    const arcs = tri.map(([lbl, n], i) => {
        if (masques[lbl] || !total) return '';
        const part = (n / total) * circonference;
        const arc = `<circle cx="70" cy="70" r="${r}" fill="none"
                stroke="${RAMP_PALETTE_STATS[i % RAMP_PALETTE_STATS.length]}" stroke-width="18"
                stroke-dasharray="${part.toFixed(2)} ${(circonference - part).toFixed(2)}"
                stroke-dashoffset="${(-debut).toFixed(2)}"
                transform="rotate(-90 70 70)"><title>${_rAttr(lbl)} : ${n}</title></circle>`;
        debut += part;
        return arc;
    }).join('');

    const legende = tri.map(([lbl, n], i) => {
        const off = !!masques[lbl];
        const pct = total && !off ? Math.round((n / total) * 100) : 0;
        return `<button type="button" class="ramp-cat-ligne${off ? ' masquee' : ''}"
                    aria-pressed="${!off}" title="${off ? 'Afficher' : 'Retirer'} sur le graphique"
                    onclick="rampBasculerPartAnneau(${_rArg(cle)}, ${_rArg(lbl)})">
            <span class="ramp-cat-nom">
                <i class="ramp-pastille" style="background:${RAMP_PALETTE_STATS[i % RAMP_PALETTE_STATS.length]};"></i>
                ${_rEsc(lbl)}</span>
            <span class="ramp-cat-val">${n}</span>
            <span class="ramp-cat-pct">${off ? '—' : `${pct} %`}</span>
        </button>`;
    }).join('');

    return `
    <div class="ramp-anneau-bloc">
        <svg class="ramp-anneau" viewBox="0 0 140 140" role="img"
             aria-label="Répartition : ${_rAttr(total)} au total">
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--border)" stroke-width="18"/>
            ${arcs}
            <text x="70" y="79" class="ramp-anneau-total">${total}</text>
        </svg>
        <div class="ramp-anneau-legende">${legende}</div>
    </div>`;
}

function rampBasculerPartAnneau(cle, libelle) {
    if (!RAMP_STATE.anneauxMasques) RAMP_STATE.anneauxMasques = {};
    if (!RAMP_STATE.anneauxMasques[cle]) RAMP_STATE.anneauxMasques[cle] = {};
    const m = RAMP_STATE.anneauxMasques[cle];
    m[libelle] = !m[libelle];
    rampRenderPage();
}

// Barres horizontales jointives : les dix premières valeurs, sans blanc entre
// elles — la silhouette de l'ensemble se lit d'un trait.
function rampBarresCollees(entrees, vide) {
    const tri = entrees.filter(([, n]) => n > 0);
    if (!tri.length) return `<div class="ramp-vide">${_rEsc(vide)}</div>`;
    const max = Math.max(...tri.map((e) => e[1]));
    return `<div class="ramp-barres-collees">
        ${tri.map(([lbl, n], i) => `
        <div class="ramp-barre-collee" title="${_rAttr(lbl)} : ${n}">
            <span class="ramp-barre-collee-lbl">${_rEsc(lbl)}</span>
            <span class="ramp-barre-collee-piste">
                <!-- Le dégradé se fonce d'une barre à l'autre : le rang se lit
                     à la teinte autant qu'à la longueur. -->
                <span class="ramp-barre-collee-seg"
                      style="width:${(n / max) * 100}%;--rang:${(i / Math.max(1, tri.length - 1)).toFixed(3)};"></span>
            </span>
            <strong class="ramp-barre-collee-val">${n}</strong>
        </div>`).join('')}
    </div>`;
}

// ── Inspections et écarts par État ──
// Deux histogrammes jumeaux, l'un en volumes, l'autre en parts. Cliquer sur un
// État le retire des deux calculs : les totaux et les taux se refont sans lui.
function rampBarresEtats(parEtatInsp, parEtatEcarts, mode) {
    const exclus = RAMP_STATE.etatsExclus || {};
    // Les deux séries s'affichent ensemble, ou l'une seule.
    const serie = RAMP_STATE.etatsSerie || 'toutes';
    const voirI = serie !== 'ecarts';
    const voirE = serie !== 'inspections';
    const noms = [...new Set([...Object.keys(parEtatInsp), ...Object.keys(parEtatEcarts)])]
        .filter((n) => (parEtatInsp[n] || 0) + (parEtatEcarts[n] || 0) > 0)
        .sort((a, b) => (parEtatInsp[b] || 0) - (parEtatInsp[a] || 0));
    if (!noms.length) return `<div class="ramp-vide">${rt('kpi_aucune_inspection')}</div>`;

    const retenus = noms.filter((n) => !exclus[n]);
    const totalI = retenus.reduce((t, n) => t + (parEtatInsp[n] || 0), 0);
    const totalE = retenus.reduce((t, n) => t + (parEtatEcarts[n] || 0), 0);

    const valeur = (n, quoi) => {
        const brut = quoi === 'i' ? (parEtatInsp[n] || 0) : (parEtatEcarts[n] || 0);
        if (mode !== 'taux') return brut;
        const total = quoi === 'i' ? totalI : totalE;
        return total ? Math.round((brut / total) * 1000) / 10 : 0;
    };
    const max = Math.max(1, ...retenus.flatMap((n) => [
        voirI ? valeur(n, 'i') : 0, voirE ? valeur(n, 'e') : 0]));
    const affiche = (v) => (mode === 'taux' ? `${v} %` : v);

    return `
    <div class="ramp-histo-etats">
        ${noms.map((n) => {
        const off = !!exclus[n];
        const vi = valeur(n, 'i');
        const ve = valeur(n, 'e');
        return `<button type="button" class="ramp-histo-etat${off ? ' exclu' : ''}"
                    aria-pressed="${!off}"
                    title="${_rAttr(n)} — ${off ? 'exclu du calcul, cliquez pour réintégrer'
                        : `${affiche(vi)} inspection(s), ${affiche(ve)} écart(s) ; cliquez pour retirer`}"
                    onclick="rampBasculerEtatGraphe(${_rArg(n)})">
            <!-- La valeur s'écrit dans la barre, à la verticale : sous la
                 colonne, deux nombres par État se chevauchaient. -->
            <span class="ramp-histo-etat-barres">
                ${voirI ? `<span class="ramp-histo-etat-barre insp"
                      style="height:${off ? 2 : Math.max(2, (vi / max) * 100)}%;">
                    ${off ? '' : `<b>${affiche(vi)}</b>`}</span>` : ''}
                ${voirE ? `<span class="ramp-histo-etat-barre ecart"
                      style="height:${off ? 2 : Math.max(2, (ve / max) * 100)}%;">
                    ${off ? '' : `<b>${affiche(ve)}</b>`}</span>` : ''}
            </span>
            ${off ? '<span class="ramp-histo-etat-val">—</span>' : ''}
            <span class="ramp-histo-etat-lbl">${_rEsc(n)}</span>
        </button>`;
    }).join('')}
    </div>
    <div class="ramp-legende">
        ${voirI ? `<span><i class="ramp-pastille" style="background:var(--primary);"></i>${rt('kpi_inspections')}</span>` : ''}
        ${voirE ? `<span><i class="ramp-pastille" style="background:#dc2626;"></i>${rt('c_ecarts')}</span>` : ''}
    </div>`;
}

// Les deux histogrammes suivent la même série : ce qu'on choisit sur l'un vaut
// pour l'autre.
// Les boutons de série, posés sur la ligne de titre du graphique.
// ══════════════════════════════════════
//  Répartition temporelle
// ══════════════════════════════════════
// Les inspections et leurs écarts dans le temps, au pas choisi : mois,
// trimestre, semestre ou année. Chaque pas porte sa liste de périodes, où l'on
// coche celles que l'on veut voir.

// Les trois pas infra-annuels se lisent sur une année donnée ; l'année, elle,
// a son propre graphique, sous les premiers.
const RAMP_GRANULARITES = () => [
    ['mois', rt('stats_mensuel')], ['trimestre', rt('stats_trimestriel')],
    ['semestre', rt('stats_semestriel')],
];

// La période d'une date, au pas demandé : sa clé de tri et son intitulé.
function rampPeriodeDe(date, pas) {
    const d = rampParseDate(date);
    if (!d) return null;
    const an = d.getFullYear();
    const m = d.getMonth();
    if (pas === 'annee') return { cle: String(an), label: String(an), annee: an };
    // L'année étant fixée pour ces trois pas, l'intitulé s'en passe.
    if (pas === 'semestre') return { cle: `${an}-S${Math.floor(m / 6) + 1}`, label: `S${Math.floor(m / 6) + 1}`, annee: an };
    if (pas === 'trimestre') return { cle: `${an}-T${Math.floor(m / 3) + 1}`, label: `T${Math.floor(m / 3) + 1}`, annee: an };
    return { cle: `${an}-${String(m + 1).padStart(2, '0')}`, label: RAMP_MOIS_COURT[m], annee: an };
}

// L'année sur laquelle portent les graphiques infra-annuels : celle en cours
// tant qu'elle est représentée, la plus récente sinon.
function rampAnneeTemps(inspections) {
    const annees = [...new Set((inspections || []).map((i) => {
        const d = rampParseDate(i.date);
        return d ? String(d.getFullYear()) : '';
    }).filter(Boolean))].sort();
    if (RAMP_STATE.tempsAnnee && annees.includes(RAMP_STATE.tempsAnnee)) return RAMP_STATE.tempsAnnee;
    const enCours = String(new Date().getFullYear());
    if (annees.includes(enCours)) return enCours;
    return annees[annees.length - 1] || enCours;
}

// Les cinq dernières années présentes dans les données.
function rampCinqDernieresAnnees(inspections) {
    return rampPeriodesDisponibles(inspections, 'annee').map(([cle]) => cle).slice(-5);
}

function rampChoisirAnneeTemps(annee) {
    RAMP_STATE.tempsAnnee = annee;
    rampRenderPage();
}

// Le choix de l'année : une seule à la fois.
function rampAnneeTempsBoutons(inspections) {
    const courante = rampAnneeTemps(inspections);
    const annees = [...new Set(inspections.map((i) => {
        const d = rampParseDate(i.date);
        return d ? String(d.getFullYear()) : '';
    }).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
    if (!annees.length) return '';
    return `<select class="ramp-select ramp-select-annee" title="Année observée"
                onchange="rampChoisirAnneeTemps(this.value)">
        ${annees.map((a) => `<option value="${_rAttr(a)}" ${a === courante ? 'selected' : ''}>${_rEsc(a)}</option>`).join('')}
    </select>`;
}

// Les périodes présentes dans les données, au pas courant.
function rampPeriodesDisponibles(inspections, pas) {
    const vues = new Map();
    inspections.forEach((i) => {
        const p = rampPeriodeDe(i.date, pas);
        if (p && !vues.has(p.cle)) vues.set(p.cle, p.label);
    });
    return [...vues.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const rampPasCourant = () => RAMP_STATE.tempsPas || 'mois';
const rampPeriodesRetenues = () => (RAMP_STATE.tempsSelection || {})[rampPasCourant()] || [];

function rampSerieTempsBoutons() {
    const serie = RAMP_STATE.tempsSerie || 'toutes';
    return `<span class="ramp-bascule">
        ${[['toutes', rt('stats_les_deux')], ['inspections', rt('kpi_inspections')], ['ecarts', rt('c_ecarts')]]
        .map(([cle, lbl]) => `<button type="button" class="${serie === cle ? 'actif' : ''}"
                onclick="rampSerieTemps(${_rArg(cle)})">${_rEsc(lbl)}</button>`).join('')}
    </span>`;
}

// Quatre boutons de pas ; chacun ouvre la liste des périodes qu'il porte, où
// l'on coche celles à garder.
function rampGranulariteBoutons(inspections) {
    const pas = rampPasCourant();
    const menu = RAMP_STATE.tempsMenu || '';
    return `<span class="ramp-bascule ramp-granularites">
        ${RAMP_GRANULARITES().map(([cle, lbl]) => {
        const retenues = (RAMP_STATE.tempsSelection || {})[cle] || [];
        const periodes = rampPeriodesDisponibles(inspections, cle);
        return `<span class="ramp-granularite${menu === cle ? ' ouvert' : ''}">
            <button type="button" class="${pas === cle ? 'actif' : ''}"
                    onclick="rampPasTemps(${_rArg(cle)})">${_rEsc(lbl)}${
                retenues.length ? ` (${retenues.length})` : ''}</button>
            <button type="button" class="ramp-granularite-fleche${pas === cle ? ' actif' : ''}"
                    title="${_rAttr(rt('stats_choisir_periodes'))}" aria-expanded="${menu === cle}"
                    onclick="rampMenuTemps(${_rArg(cle)})">${RAMP_ICONS.chevronBas}</button>
            ${menu === cle ? `<span class="ramp-multi-panneau">
                ${periodes.length ? periodes.map(([k, lb]) => `
                <label class="ramp-multi-choix">
                    <input type="checkbox" ${retenues.includes(k) ? 'checked' : ''}
                           onchange="rampBasculerPeriode(${_rArg(cle)}, ${_rArg(k)})">
                    <span>${_rEsc(lb)}</span>
                </label>`).join('')
                : `<span class="ramp-sous-titre">${rt('stats_aucune_periode')}</span>`}
                ${retenues.length ? `<button class="btn btn-outline btn-sm ramp-multi-vider"
                        onclick="rampViderPeriodes(${_rArg(cle)})">${rt('f_tout_retirer')}</button>` : ''}
            </span>` : ''}
        </span>`;
    }).join('')}
    </span>`;
}

function rampAnnuelPeriodes(inspections) {
    const retenues = (RAMP_STATE.tempsSelection || {}).annee
        || rampCinqDernieresAnnees(inspections);
    const periodes = rampPeriodesDisponibles(inspections, 'annee');
    const ouvert = RAMP_STATE.tempsMenu === 'annee';
    return `<span class="ramp-bascule ramp-granularites">
        <span class="ramp-granularite${ouvert ? ' ouvert' : ''}">
            <button type="button" class="actif" onclick="rampMenuTemps(${_rArg('annee')})">${rt('stats_annees')}${
    retenues.length ? ` (${retenues.length})` : ''}</button>
            <button type="button" class="ramp-granularite-fleche actif"
                    title="${_rAttr(rt('stats_choisir_periodes'))}" aria-expanded="${ouvert}"
                    onclick="rampMenuTemps(${_rArg('annee')})">${RAMP_ICONS.chevronBas}</button>
            ${ouvert ? `<span class="ramp-multi-panneau">
                ${periodes.length ? periodes.map(([k, lb]) => `
                <label class="ramp-multi-choix">
                    <input type="checkbox" ${retenues.includes(k) ? 'checked' : ''}
                           onchange="rampBasculerPeriode(${_rArg('annee')}, ${_rArg(k)})">
                    <span>${_rEsc(lb)}</span>
                </label>`).join('')
                : `<span class="ramp-sous-titre">${rt('stats_aucune_periode')}</span>`}
                ${retenues.length ? `<button class="btn btn-outline btn-sm ramp-multi-vider"
                        onclick="rampViderPeriodes(${_rArg('annee')})">${rt('f_tout_retirer')}</button>` : ''}
            </span>` : ''}
        </span>
    </span>`;
}

function rampSerieTemps(cle) { RAMP_STATE.tempsSerie = cle; rampRenderPage(); }

function rampPasTemps(cle) {
    RAMP_STATE.tempsPas = cle;
    RAMP_STATE.tempsMenu = '';
    rampRenderPage();
}

function rampMenuTemps(cle) {
    RAMP_STATE.tempsMenu = RAMP_STATE.tempsMenu === cle ? '' : cle;
    // Ouvrir la liste d'un pas infra-annuel, c'est vouloir ce pas-là ; les
    // années, elles, ont leur graphique à part.
    if (RAMP_STATE.tempsMenu && cle !== 'annee') RAMP_STATE.tempsPas = cle;
    rampRenderPage();
}

function rampBasculerPeriode(pas, cle) {
    if (!RAMP_STATE.tempsSelection) RAMP_STATE.tempsSelection = {};
    // Toucher une case fige la sélection : elle part de ce qui est affiché.
    const liste = RAMP_STATE.tempsSelection[pas]
        || (pas === 'annee' ? rampCinqDernieresAnnees(RAMP_STATE.data.inspections) : []);
    RAMP_STATE.tempsSelection[pas] = liste.includes(cle)
        ? liste.filter((x) => x !== cle) : [...liste, cle];
    rampRenderPage();
}

function rampViderPeriodes(pas) {
    if (!RAMP_STATE.tempsSelection) RAMP_STATE.tempsSelection = {};
    RAMP_STATE.tempsSelection[pas] = [];
    rampRenderPage();
}

// L'histogramme lui-même, jumeau de celui des États : deux barres par période,
// valeurs écrites dans les barres.
function rampBarresTemps(inspections, ecarts, mode, options) {
    const o = options || {};
    const pas = o.pas || rampPasCourant();
    // À défaut de choix, l'évolution annuelle s'en tient aux cinq dernières
    // années : au-delà, les colonnes se serrent sans rien apprendre.
    const retenues = (RAMP_STATE.tempsSelection || {})[pas]
        || (pas === 'annee' ? rampCinqDernieresAnnees(inspections) : []);
    // Les pas infra-annuels s'observent sur une seule année.
    const annee = o.pas === 'annee' ? null : rampAnneeTemps(inspections);
    const serie = RAMP_STATE.tempsSerie || 'toutes';
    const voirI = serie !== 'ecarts';
    const voirE = serie !== 'inspections';

    const parPeriode = new Map();
    const ajouter = (date, quoi) => {
        const p = rampPeriodeDe(date, pas);
        if (!p) return;
        if (annee && String(p.annee) !== String(annee)) return;
        if (retenues.length && !retenues.includes(p.cle)) return;
        if (!parPeriode.has(p.cle)) parPeriode.set(p.cle, { label: p.label, i: 0, e: 0 });
        parPeriode.get(p.cle)[quoi] += 1;
    };
    inspections.forEach((i) => ajouter(i.date, 'i'));
    ecarts.forEach((a) => ajouter((a.inspection || {}).date, 'e'));

    const lignes = [...parPeriode.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (!lignes.length) {
        return `<div class="ramp-vide">Aucune donnée${annee ? ` en ${annee}` : ''}</div>`;
    }

    const totalI = lignes.reduce((t, [, v]) => t + v.i, 0);
    const totalE = lignes.reduce((t, [, v]) => t + v.e, 0);
    const val = (v, quoi) => {
        const brut = quoi === 'i' ? v.i : v.e;
        if (mode !== 'taux') return brut;
        const total = quoi === 'i' ? totalI : totalE;
        return total ? Math.round((brut / total) * 1000) / 10 : 0;
    };
    const max = Math.max(1, ...lignes.flatMap(([, v]) => [
        voirI ? val(v, 'i') : 0, voirE ? val(v, 'e') : 0]));
    const affiche = (v) => (mode === 'taux' ? `${v} %` : v);

    return `
    <div class="ramp-histo-etats">
        ${lignes.map(([, v]) => `
        <div class="ramp-histo-etat" title="${_rAttr(v.label)} — ${affiche(val(v, 'i'))} inspection(s), ${affiche(val(v, 'e'))} écart(s)">
            <span class="ramp-histo-etat-barres">
                ${voirI ? `<span class="ramp-histo-etat-barre insp"
                      style="height:${Math.max(2, (val(v, 'i') / max) * 100)}%;">
                    <b>${affiche(val(v, 'i'))}</b></span>` : ''}
                ${voirE ? `<span class="ramp-histo-etat-barre ecart"
                      style="height:${Math.max(2, (val(v, 'e') / max) * 100)}%;">
                    <b>${affiche(val(v, 'e'))}</b></span>` : ''}
            </span>
            <span class="ramp-histo-etat-lbl">${_rEsc(v.label)}</span>
        </div>`).join('')}
    </div>
    <div class="ramp-legende">
        ${voirI ? `<span><i class="ramp-pastille" style="background:var(--primary);"></i>${rt('kpi_inspections')}</span>` : ''}
        ${voirE ? `<span><i class="ramp-pastille" style="background:#dc2626;"></i>${rt('c_ecarts')}</span>` : ''}
    </div>`;
}

function rampSerieEtatsBoutons() {
    const serie = RAMP_STATE.etatsSerie || 'toutes';
    return `<span class="ramp-bascule">
        ${[['toutes', rt('stats_les_deux')], ['inspections', rt('kpi_inspections')], ['ecarts', rt('c_ecarts')]]
        .map(([cle, lbl]) => `<button type="button" class="${serie === cle ? 'actif' : ''}"
                onclick="rampSerieEtats(${_rArg(cle)})">${_rEsc(lbl)}</button>`).join('')}
    </span>`;
}

function rampSerieEtats(cle) {
    RAMP_STATE.etatsSerie = cle;
    rampRenderPage();
}

function rampBasculerEtatGraphe(nom) {
    if (!RAMP_STATE.etatsExclus) RAMP_STATE.etatsExclus = {};
    RAMP_STATE.etatsExclus[nom] = !RAMP_STATE.etatsExclus[nom];
    rampRenderPage();
}

function rampStatsAeronefMode(mode) {
    RAMP_STATE.statsAeronefMode = mode;
    rampRenderPage();
}

// ══════════════════════════════════════
//  Générateur de tables
// ══════════════════════════════════════
// Les champs du module à gauche, la table en construction à droite. On glisse
// ce qu'on veut extraire ; un champ sans relation avec ceux déjà posés se
// signale en rouge et ne part pas à l'export.

async function rampOuvrirGenerateur() {
    if (!RAMP_STATE.tableChamps) {
        try {
            const r = await rampApi('/tables/champs');
            RAMP_STATE.tableChamps = r.champs || [];
            RAMP_STATE.tableLiees = r.liees || {};
        } catch (e) { rampToast(e.message || 'Catalogue indisponible', 'error'); return; }
    }
    if (!(RAMP_STATE.tableChamps || []).length) {
        rampToast(rt('gen_aucune_donnee'), 'error');
        return;
    }
    RAMP_STATE.tableColonnes = RAMP_STATE.tableColonnes || [];
    rampVoletGenerateur();
}

const rampChampTable = (cle) => (RAMP_STATE.tableChamps || []).find((c) => c.cle === cle);

// Deux familles se joignent-elles ? Le catalogue le dit ; à défaut, une
// famille ne se joint qu'à elle-même.
function rampFamillesCompatibles(a, b) {
    const liees = RAMP_STATE.tableLiees || {};
    return (liees[a] || [a]).includes(b);
}

// Un champ est en conflit s'il ne se joint pas à l'un de ceux déjà posés.
function rampChampEnConflit(cle) {
    const champ = rampChampTable(cle);
    if (!champ) return false;
    return (RAMP_STATE.tableColonnes || []).some((c) => {
        if (c.cle === cle) return false;
        const autre = rampChampTable(c.cle);
        return autre && !rampFamillesCompatibles(champ.famille, autre.famille);
    });
}

const RAMP_FAMILLES_TABLE = () => ({
    inspection: rt('gen_famille_inspection'), ecart: rt('gen_famille_ecart'),
    contact: rt('gen_famille_contact'),
});

// Les filtres de l'export : ils ne touchent pas aux écrans, ils bornent
// seulement les données que la table emportera.
const RAMP_GEN_FILTRES = () => [
    ['etat', rt('f_etats'), (i) => i.pays],
    ['annee', rt('f_annees'), (i) => String(i.date || '').slice(0, 4)],
    ['exploitant', rt('f_exploitants'), (i) => i.exploitant],
    ['aeronef', rt('f_aeronefs'), (i) => i.aeronef],
    ['immatriculation', rt('f_immat'), (i) => i.immatriculation],
    ['statut', rt('f_statuts'), (i) => i.status],
];
const RAMP_GEN_FILTRES_ECART = () => [
    ['categorie', rt('f_categories'), (a) => a.categorie],
    ['action', rt('f_actions'), (a) => a.action],
];

function rampGenBarreFiltres() {
    const F = RAMP_STATE.tableFiltres || {};
    const inspections = RAMP_STATE.data.inspections || [];
    const tri = (t) => [...new Set(t.filter(Boolean).map(String))]
        .sort((a, b) => a.localeCompare(b, 'fr'));

    const liste = (cle, vide, valeurs) => `
        <select class="ramp-select" onchange="rampGenFiltre(${_rArg(cle)}, this.value)">
            <option value="">${_rEsc(vide)}</option>
            ${valeurs.map((v) => `<option value="${_rAttr(v)}" ${
    String(F[cle] || '') === String(v) ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
        </select>`;

    const desInspections = RAMP_GEN_FILTRES().map(([cle, vide, valeurDe]) =>
        liste(cle, vide, tri(inspections.map(valeurDe)))).join('');
    const desEcarts = RAMP_GEN_FILTRES_ECART().map(([cle, vide, valeurDe]) =>
        liste(cle, vide, tri(inspections.flatMap((i) => (i.anomalies || []).map(valeurDe))))).join('');

    const poses = Object.entries(F).filter(([, v]) => v).length;
    // Le dernier filtre partage sa case avec le bouton de remise à zéro : la
    // barre tient ainsi sur deux rangs de quatre.
    const listes = `${desInspections}${desEcarts}`;
    const coupe = listes.lastIndexOf('<select');
    return `
    <div class="ramp-filtres ramp-gen-filtres">
        ${listes.slice(0, coupe)}
        <span class="ramp-gen-filtres-fin">
            ${listes.slice(coupe)}
            <button class="btn btn-outline btn-sm ramp-btn-icone"
                    title="${_rAttr(rt('f_reinitialiser'))}${poses ? ` (${poses})` : ''}"
                    onclick="rampGenFiltresReset()">${RAMP_ICONS.reset}</button>
        </span>
    </div>`;
}

// Ce que la table totalise : la colonne de bout de ligne, les sous-totaux des
// groupes, la ligne finale.
const RAMP_GEN_TOTAUX = () => [
    ['colonnes', rt('gen_total_colonnes')],
    ['sousTotaux', rt('gen_sous_totaux')],
    ['general', rt('gen_total_general')],
];

const rampGenTotaux = () => ({
    colonnes: true, sousTotaux: true, general: true, ...(RAMP_STATE.tableTotaux || {}),
});

function rampGenTotauxCases() {
    const T = rampGenTotaux();
    return `
    <div class="ramp-gen-totaux">
        <div class="ramp-card-titre">${rt('gen_totaux')}</div>
        <div class="ramp-gen-totaux-liste">
            ${RAMP_GEN_TOTAUX().map(([cle, lbl]) => `
            <label class="ramp-champ-case">
                <input type="checkbox" ${T[cle] ? 'checked' : ''}
                       onchange="rampGenTotal(${_rArg(cle)}, this.checked)">
                <span>${_rEsc(lbl)}</span>
            </label>`).join('')}
        </div>
    </div>`;
}

function rampGenTotal(cle, valeur) {
    RAMP_STATE.tableTotaux = { ...rampGenTotaux(), [cle]: valeur };
    rampVoletGenerateur();
}

function rampGenFiltre(cle, valeur) {
    RAMP_STATE.tableFiltres = { ...(RAMP_STATE.tableFiltres || {}), [cle]: valeur };
    rampVoletGenerateur();
}

function rampGenFiltresReset() {
    RAMP_STATE.tableFiltres = {};
    rampVoletGenerateur();
}

// Redessiner la modale ne doit pas renvoyer les listes en haut : on relève où
// elles étaient, et on les y remet une fois le contenu remplacé.
const RAMP_GEN_ZONES = ['.ramp-modal-body', '.ramp-gen-source', '.ramp-gen-cible'];

function rampGenDefilements() {
    const racine = document.getElementById('rampModalRoot');
    if (!racine) return null;
    return RAMP_GEN_ZONES.map((sel) => {
        const el = racine.querySelector(sel);
        return el ? el.scrollTop : 0;
    });
}

function rampGenRestaurer(positions) {
    if (!positions) return;
    const racine = document.getElementById('rampModalRoot');
    if (!racine) return;
    RAMP_GEN_ZONES.forEach((sel, i) => {
        const el = racine.querySelector(sel);
        if (el) el.scrollTop = positions[i] || 0;
    });
}

function rampVoletGenerateur() {
    const defilements = rampGenDefilements();
    const champs = RAMP_STATE.tableChamps || [];
    const poses = RAMP_STATE.tableColonnes || [];
    const conflits = poses.filter((c) => rampChampEnConflit(c.cle)).length;

    const parFamille = {};
    champs.forEach((c) => {
        if (!parFamille[c.famille]) parFamille[c.famille] = [];
        parFamille[c.famille].push(c);
    });

    const disponibles = Object.entries(parFamille).map(([famille, liste]) => `
        <div class="ramp-gen-famille">
            <div class="ramp-gen-famille-titre">${_rEsc(RAMP_FAMILLES_TABLE()[famille] || famille)}</div>
            ${liste.map((c) => `
            <div class="ramp-gen-champ${poses.some((p) => p.cle === c.cle) ? ' pose' : ''}"
                 draggable="true" data-cle="${_rAttr(c.cle)}"
                 ondragstart="rampGenDragStart(event, ${_rArg(c.cle)})"
                 ondblclick="rampGenAjouter(${_rArg(c.cle)})"
                 title="Glissez à droite, ou double-cliquez">
                <span>${_rEsc(c.label)}</span>
                <i>${c.type === 'nombre' ? '123' : 'abc'}</i>
            </div>`).join('')}
        </div>`).join('');

    const choisies = poses.length ? poses.map((c, i) => {
        const def = rampChampTable(c.cle) || {};
        const conflit = rampChampEnConflit(c.cle);
        const role = c.role || 'donnee';
        return `
        <div class="ramp-gen-pose${conflit ? ' conflit' : ''}" draggable="true"
             ondragstart="rampGenOrdreDebut(event, ${i})"
             ondragover="event.preventDefault();"
             ondrop="rampGenOrdreDepose(event, ${i})"
             title="${_rAttr(rt('gen_ordre'))}">
            <span class="ramp-gen-poignee">⋮⋮</span>
            <span class="ramp-gen-pose-nom" title="${conflit
                ? 'Sans relation avec les autres données choisies' : ''}">
                ${_rEsc(def.label || c.cle)}
                ${conflit ? `<b>${rt('gen_sans_relation')}</b>` : ''}
            </span>
            <span class="ramp-bascule">
                <button type="button" class="${role === 'regroupement' ? 'actif' : ''}"
                        title="Regrouper les données sur ce champ (en lignes)"
                        onclick="rampGenRole(${i}, 'regroupement')">${rt('gen_regrouper')}</button>
                <button type="button" class="${role === 'croisement' ? 'actif' : ''}"
                        title="Croiser : ce champ ouvre les colonnes du tableau"
                        onclick="rampGenRole(${i}, 'croisement')">${rt('gen_croiser')}</button>
                <button type="button" class="${role === 'donnee' ? 'actif' : ''}"
                        title="Donnée observée dans les cellules"
                        onclick="rampGenRole(${i}, 'donnee')">${rt('gen_donnee')}</button>
            </span>
            ${role === 'donnee' ? `<span class="ramp-bascule">
                <button type="button" class="${c.mode === 'somme' ? '' : 'actif'}"
                        onclick="rampGenMode(${i}, 'valeurs')">${rt('gen_valeurs')}</button>
                <button type="button" class="${c.mode === 'somme' ? 'actif' : ''}"
                        onclick="rampGenMode(${i}, 'somme')"
                        title="${def.type === 'nombre' ? 'Somme des valeurs' : 'Nombre d’occurrences'}">
                    ${def.type === 'nombre' ? rt('gen_somme') : rt('gen_nombre')}</button>
            </span>` : ''}
            <button class="btn btn-outline btn-sm ramp-btn-icone" title="Retirer"
                    onclick="rampGenRetirer(${i})">${RAMP_ICONS.x}</button>
        </div>`;
    }).join('') : `<p class="ramp-gen-vide">${rt('gen_glisser')}</p>`;

    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal ramp-modal-large" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="display:flex;">${RAMP_ICONS.list}</span>
                <span style="flex:1;">${rt('gen_titre')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone"
                        onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                ${rampGenBarreFiltres()}
                <div class="ramp-gen">
                    <div class="ramp-gen-source">
                        <div class="ramp-card-titre">${rt('gen_disponibles')}</div>
                        ${disponibles}
                    </div>
                    <div>
                        <div class="ramp-gen-cible" ondragover="event.preventDefault();"
                             ondrop="rampGenDrop(event)">
                            <div class="ramp-card-titre">
                                <span>${rt('gen_cible')}</span>
                                <span class="ramp-sous-titre">${rt('gen_donnees', poses.length)}${
    conflits ? ` · ${conflits} ${rt('gen_sans_relation')}` : ''}</span>
                            </div>
                            ${choisies}
                        </div>
                        ${rampGenTotauxCases()}
                    </div>
                </div>
            </div>
            <div class="ramp-modal-footer ramp-gen-bas">
                <span class="ramp-sous-titre">${
    poses.some((c) => c.role === 'regroupement' || c.role === 'croisement')
        ? 'Tableau croisé : lignes regroupées, colonnes croisées.'
        : 'Table à plat : marquez un champ « Regrouper » pour croiser.'}</span>
                <span id="rampGenLien"></span>
                <span style="flex:1;"></span>
                ${poses.length ? `<button class="btn btn-outline btn-sm" onclick="rampGenVider()">
                    ${RAMP_ICONS.reset} ${rt('gen_vider')}</button>` : ''}
                <button class="btn btn-primary btn-sm" ${poses.length && !conflits ? '' : 'disabled'}
                        onclick="rampGenExporter()">
                    ${RAMP_ICONS.download} ${rt('gen_exporter')}</button>
            </div>
        </div>
    </div>`);
    rampGenRestaurer(defilements);
}

function rampGenDragStart(ev, cle) {
    ev.dataTransfer.setData('text/plain', cle);
    ev.dataTransfer.effectAllowed = 'copy';
}

function rampGenDrop(ev) {
    ev.preventDefault();
    const cle = ev.dataTransfer.getData('text/plain');
    if (cle) rampGenAjouter(cle);
}

function rampGenAjouter(cle) {
    const champ = rampChampTable(cle);
    if (!champ) return;
    const poses = RAMP_STATE.tableColonnes || [];
    if (poses.some((c) => c.cle === cle)) { rampToast(rt('m_deja_choisie')); return; }
    // Un compteur ou une mesure part en somme ; le reste en valeurs.
    // Un compteur arrive en donnée sommée ; le reste regroupe par défaut.
    const mesure = /compte|nb_|items/.test(cle) || champ.type === 'nombre';
    RAMP_STATE.tableColonnes = [...poses, {
        cle,
        role: mesure ? 'donnee' : 'regroupement',
        mode: mesure ? 'somme' : 'valeurs',
    }];
    rampVoletGenerateur();
}

function rampGenRetirer(i) {
    RAMP_STATE.tableColonnes = (RAMP_STATE.tableColonnes || []).filter((_, k) => k !== i);
    rampVoletGenerateur();
}

function rampGenMode(i, mode) {
    RAMP_STATE.tableColonnes = (RAMP_STATE.tableColonnes || [])
        .map((c, k) => (k === i ? { ...c, mode } : c));
    rampVoletGenerateur();
}

// Le rôle d'un champ : il regroupe, il croise, ou c'est la donnée observée.
// Ordre des colonnes : il commande la table, on le change en glissant.
function rampGenOrdreDebut(ev, i) {
    ev.dataTransfer.setData('application/x-ramp-ordre', String(i));
    ev.dataTransfer.effectAllowed = 'move';
    ev.stopPropagation();
}

function rampGenOrdreDepose(ev, cible) {
    const brut = ev.dataTransfer.getData('application/x-ramp-ordre');
    if (brut === '') return;
    ev.preventDefault();
    ev.stopPropagation();
    const depart = Number(brut);
    const liste = [...(RAMP_STATE.tableColonnes || [])];
    if (Number.isNaN(depart) || depart === cible || !liste[depart]) return;
    const [deplace] = liste.splice(depart, 1);
    liste.splice(cible, 0, deplace);
    RAMP_STATE.tableColonnes = liste;
    rampVoletGenerateur();
}

function rampGenRole(i, role) {
    RAMP_STATE.tableColonnes = (RAMP_STATE.tableColonnes || [])
        .map((c, k) => (k === i ? { ...c, role } : c));
    rampVoletGenerateur();
}

function rampGenVider() { RAMP_STATE.tableColonnes = []; rampVoletGenerateur(); }

function rampGenExporter() {
    const colonnes = (RAMP_STATE.tableColonnes || []);
    if (!colonnes.length) { rampToast(rt('m_aucune_donnee_choisie'), 'error'); return; }
    if (colonnes.some((c) => rampChampEnConflit(c.cle))) {
        rampToast(rt('gen_retirer_conflits'), 'error');
        return;
    }
    rampTelechargerTable(colonnes);
}

// L'export de la table : le fichier part, et un lien de secours reste dans la
// modale — utile quand le navigateur refuse un téléchargement lancé depuis un
// cadre.
async function rampTelechargerTable(colonnes) {
    try {
        // Le serveur prépare le classeur et rend une adresse : on y navigue,
        // et c'est le navigateur qui enregistre le fichier. Pas de blob, donc
        // rien qu'un navigateur puisse refuser.
        const r = await rampApi('/tables/export-xlsx', {
            method: 'POST',
            body: JSON.stringify({
                colonnes, filtres: RAMP_STATE.tableFiltres || {},
                totaux: rampGenTotaux(), differe: true,
            }),
        });
        const url = r.url || `${RAMP_API}/tables/fichier/${r.jeton}`;
        const zone = document.getElementById('rampGenLien');
        if (zone) {
            zone.innerHTML = `<a class="btn btn-outline btn-sm" href="${_rAttr(url)}"
                    download="table_safa.xlsx">
                ${RAMP_ICONS.download} ${rt('gen_telecharger', r.lignes)}</a>`;
        }
        window.location.assign(url);
        rampToast(rt('gen_export_lance'));
    } catch (e) { rampToast(e.message || rt('gen_export_impossible'), 'error'); }
}

function rampRenderStatistiques() {
    const { inspections, ecarts } = rampFiltrer();
    const situation = rampAppliquerTri(rampSituation(), 'situation', (o, k) => o[k]);

    const items = inspections.reduce((s, i) => s + (Number(i.itemsInspectes) || 0), 0);
    const exploitants = new Set(inspections.map((i) => i.exploitant || 'Inconnu')).size;
    const ratio = inspections.length ? (ecarts.length / inspections.length).toFixed(2) : '0.00';

    // ── Répartitions ──
    // Les groupes viennent du paramétrage : un groupe créé à la main y figure
    // comme les cinq d'origine, et un item sans groupe ne se range plus d'office
    // sous « General ».
    const parGroupe = {};
    rampFamille('groupes').forEach((g) => { parGroupe[g.label] = 0; });
    const parAction = {};
    const parItem = {};
    const parAeronef = {};
    const parEtat = {};
    ecarts.forEach((a) => {
        const gr = rampGroupeDeLItem(a.itemCode);
        parGroupe[gr] = (parGroupe[gr] || 0) + 1;
        const act = a.action || 'Non précisée';
        parAction[act] = (parAction[act] || 0) + 1;
        const it = a.itemCode || 'Inconnu';
        parItem[it] = (parItem[it] || 0) + 1;
    });
    const corr = RAMP_STATE.aeronefsCorrespondances || {};
    const parEtatEcarts = {};
    ecarts.forEach((a) => {
        const p = (a.inspection || {}).pays || 'Inconnu';
        parEtatEcarts[p] = (parEtatEcarts[p] || 0) + 1;
    });
    inspections.forEach((i) => {
        const brut = i.aeronef || 'Inconnu';
        const ae = RAMP_STATE.statsAeronefMode === 'designation' ? (corr[brut] || brut) : brut;
        parAeronef[ae] = (parAeronef[ae] || 0) + 1;
        const p = i.pays || 'Inconnu';
        parEtat[p] = (parEtat[p] || 0) + 1;
    });


    const bloc = (cle, titre, corps, extra) => `
        <div class="ramp-card" style="padding:0;">
            <div class="ramp-card-titre ramp-depliant" style="padding:.7rem 1rem;margin:0;"
                 onclick="rampBasculerBloc('${cle}')">
                <span><span class="ramp-chevron">${RAMP_BLOCS[cle] ? '▾' : '▸'}</span> ${_rEsc(titre)}</span>
                ${extra || ''}
            </div>
            ${RAMP_BLOCS[cle] ? `<div style="padding:0 1rem 1rem;">${corps}</div>` : ''}
        </div>`;

    const listeSimple = (entrees, vide) => {
        const tri = entrees.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
        if (!tri.length) return `<div class="ramp-vide">${_rEsc(vide)}</div>`;
        const max = Math.max(...tri.map((e) => e[1]));
        return tri.map(([lbl, n]) => `
            <div class="ramp-barre-ligne">
                <div class="ramp-barre-entete"><span>${_rEsc(lbl)}</span><strong>${n}</strong></div>
                <div class="ramp-barre-piste">
                    <div class="ramp-barre-seg" style="width:${(n / max) * 100}%;background:var(--ramp-accent);"></div>
                </div>
            </div>`).join('');
    };


    // ── Situation générale ──
    const cel = (v, style) => `<td style="text-align:center;${style || ''}">${_rEsc(v)}</td>`;
    const lignesSituation = situation.length === 0
        ? `<tr><td colspan="16" class="ramp-table-vide">${rt('aucune_donnee')}</td></tr>`
        : situation.map((r) => {
            const ouvert = !!RAMP_STATE.lignesDepliees[r.exploitant];
            const detail = ouvert ? r.detail.map((it) => `
                <tr class="ramp-detail">
                    <td style="padding-left:1.8rem;">${_rEsc(it.code)}${rampLibelleItem(it.code)
                        ? ` — ${_rEsc(rampLibelleItem(it.code))}` : ''}</td>
                    ${cel('—')}${cel('—')}
                    ${cel(it.cat['1'])}${cel(it.taux1)}
                    ${cel(it.cat['2'])}${cel(it.taux2)}
                    ${cel(it.cat['3'])}${cel(it.taux3)}
                    ${cel(it.cat.G)}${cel(it.tauxG)}
                    ${cel(it.total)}${cel(it.tauxCloture)}${cel('—')}
                </tr>`).join('') : '';
            return `<tr class="ramp-depliant" onclick="rampBasculerLigne(${_rArg(r.exploitant)})">
                <td><span class="ramp-chevron">${ouvert ? '▾' : '▸'}</span> <strong>${_rEsc(r.exploitant)}</strong></td>
                ${cel(r.inspections)}${cel(r.items)}
                ${cel(r.cat1)}${cel(r.taux1)}
                ${cel(r.cat2)}${cel(r.taux2)}
                ${cel(r.cat3, 'font-weight:700;color:#b91c1c;')}${cel(r.taux3)}
                ${cel(r.catG)}${cel(r.tauxG)}
                ${cel(r.totalEcarts)}${cel(r.tauxCloture)}
                ${cel(r.scoreTotal.toFixed(3), 'font-weight:700;')}
            </tr>${detail}`;
        }).join('');

    // Les mêmes cartes qu'au tableau de bord, rendues par le socle : les deux
    // écrans montrent les mêmes mesures, ils doivent les montrer pareil.
    const closEcarts = ecarts.filter((a) => rampEstClos(a.inspection.status)).length;
    const tauxCloture = ecarts.length ? Math.round((closEcarts / ecarts.length) * 100) : 0;
    const sansEcart = inspections.filter((i) => (i.anomalies || []).length === 0).length;
    const couverture = inspections.length ? Math.round((sansEcart / inspections.length) * 100) : 0;
    const parTrimestre = [0, 0, 0, 0];
    inspections.forEach((i) => {
        const d = rampParseDate(i.date);
        if (d) parTrimestre[Math.floor(d.getMonth() / 3)] += 1;
    });
    const volumeCat = { 1: 0, 2: 0, 3: 0, G: 0 };
    ecarts.forEach((a) => {
        if (volumeCat[a.categorie] === undefined) volumeCat.G += 1;
        else volumeCat[a.categorie] += 1;
    });

    return `
    <div class="ramp-page-header">
        <h2>${rt('stats_titre')}</h2>
        ${rampVuePrestataire() ? '' : `<button class="btn btn-primary btn-sm" onclick="rampOuvrirGenerateur()">
            ${RAMP_ICONS.download} ${rt('gen_bouton')}</button>`}
    </div>
    <div class="oasis-kpi-groupes pleine cinq">
        ${oasisKpiGroupe('', [
            oasisKpiCarte({
                titre: 'Inspections', couleur: '#1d4ed8', valeur: inspections.length,
                precision: `${exploitants} exploitant${exploitants > 1 ? 's' : ''}`,
                figure: { type: 'barres', valeurs: parTrimestre },
            }),
            oasisKpiCarte({
                titre: 'Items inspectés', couleur: '#0d9488', valeur: items,
                precision: inspections.length
                    ? `${Math.round(items / inspections.length)} par inspection`
                    : 'Aucune inspection',
                figure: { type: 'jauge', pct: couverture },
            }),
            oasisKpiCarte({
                titre: 'Total des écarts', couleur: '#dc2626', valeur: ecarts.length,
                precision: `${sansEcart} inspection(s) sans écart`,
                figure: { type: 'barres', valeurs: [volumeCat['1'], volumeCat['2'], volumeCat['3'], volumeCat.G] },
            }),
            oasisKpiCarte({
                titre: 'Ratio', couleur: '#f59e0b', valeur: ratio,
                precision: 'Écarts par inspection',
                figure: { type: 'echelle', position: Math.min(100, Math.round((Number(ratio) / 3) * 100)),
                    min: 'Faible', max: 'Élevé' },
            }),
            oasisKpiCarte({
                titre: 'Écarts clôturés', couleur: '#059669', valeur: `${tauxCloture} %`,
                precision: `${closEcarts} sur ${ecarts.length}`,
                figure: { type: 'cloture', pct: tauxCloture },
            }),
        ])}
    </div>
    ${rampBarreFiltres({ etat: false, cinq: true })}

    ${bloc('situation', rt('stats_situation'), `
        <p class="ramp-note">
            ${rt('stats_cliquer_exploitant')} Le score est la somme
            des pondérations de catégorie rapportée aux items inspectés : il permet de comparer
            deux exploitants inspectés inégalement.
        </p>
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead>
                    <tr>
                        ${rampTh('situation', 'exploitant', rt('stats_exploitant'))}
                        ${rampTh('situation', 'inspections', rt('stats_insp'), 'width:70px;text-align:center;')}
                        ${rampTh('situation', 'items', rt('c_items'), 'width:70px;text-align:center;')}
                        ${rampTh('situation', 'cat1', rt('cat_court_1'), 'width:60px;text-align:center;')}
                        <th style="width:80px;text-align:center;">Clôt. 1</th>
                        ${rampTh('situation', 'cat2', rt('cat_court_2'), 'width:60px;text-align:center;')}
                        <th style="width:80px;text-align:center;">Clôt. 2</th>
                        ${rampTh('situation', 'cat3', rt('cat_court_3'), 'width:60px;text-align:center;')}
                        <th style="width:80px;text-align:center;">Clôt. 3</th>
                        ${rampTh('situation', 'catG', rt('cat_court_g'), 'width:60px;text-align:center;')}
                        <th style="width:80px;text-align:center;">Clôt. G</th>
                        ${rampTh('situation', 'totalEcarts', rt('c_ecarts'), 'width:70px;text-align:center;')}
                        <th style="width:90px;text-align:center;">${rt('stats_taux_cloture')}</th>
                        ${rampTh('situation', 'scoreTotal', rt('score'), 'width:80px;text-align:center;')}
                    </tr>
                </thead>
                <tbody>${lignesSituation}</tbody>
            </table>
        </div>`,
        `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();rampExporterSituation()">
            ${RAMP_ICONS.download} Excel</button>`)}

    ${bloc('repartitions', rt('stats_repartitions'), `
        <div class="ramp-grille-repartitions">
            <div>
                <div class="ramp-card-titre">${rt('stats_par_groupe')}</div>
                ${rampAnneauStats('groupes', Object.entries(parGroupe), rt('aucun_ecart'))}
            </div>
            <div>
                <div class="ramp-card-titre">${rt('stats_par_action')}</div>
                ${rampAnneauStats('actions', Object.entries(parAction), rt('aucun_ecart'))}
            </div>
            ${rampVuePrestataire() ? '' : `
            <div>
                <div class="ramp-card-titre">${rt('stats_dix_items')}</div>
                ${rampBarresCollees(Object.entries(parItem).sort((a, b) => b[1] - a[1]).slice(0, 10), rt('aucun_ecart'))}
            </div>
            <div>
                <div class="ramp-card-titre">
                    <span>${rt('stats_dix_aeronefs')}</span>
                    <span class="ramp-bascule">
                        <button type="button" class="${RAMP_STATE.statsAeronefMode === 'designation' ? '' : 'actif'}"
                                onclick="rampStatsAeronefMode('modele')">${rt('stats_modele')}</button>
                        <button type="button" class="${RAMP_STATE.statsAeronefMode === 'designation' ? 'actif' : ''}"
                                onclick="rampStatsAeronefMode('designation')">${rt('stats_designation')}</button>
                    </span>
                </div>
                ${rampBarresCollees(Object.entries(parAeronef).sort((a, b) => b[1] - a[1]).slice(0, 10), rt('kpi_aucune_inspection'))}
            </div>
            <div>
                <div class="ramp-card-titre">
                    <span>${rt('stats_etats_nombre')}</span>
                    ${rampSerieEtatsBoutons()}
                </div>
                ${rampBarresEtats(parEtat, parEtatEcarts, 'nombre')}
            </div>
            <div>
                <div class="ramp-card-titre">
                    <span>${rt('stats_etats_taux')}</span>
                </div>
                ${rampBarresEtats(parEtat, parEtatEcarts, 'taux')}
            </div>`}
        </div>`)}

    ${rampVuePrestataire() ? '' : bloc('temporel', rt('stats_temporel'), `
        <div class="ramp-grille-repartitions">
            <div class="pleine">
                <!-- Tout sur la ligne d'entête : l'intitulé, puis la série,
                     l'année observée et le pas de temps. -->
                <div class="ramp-card-titre">
                    <span>${rt('stats_repartition_nombre', _rEsc(rampAnneeTemps(inspections)))}</span>
                    ${rampSerieTempsBoutons()}${rampAnneeTempsBoutons(inspections)}${rampGranulariteBoutons(inspections)}
                </div>
                ${rampBarresTemps(inspections, ecarts, 'nombre')}
            </div>
            <div class="pleine">
                <div class="ramp-card-titre">
                    <span>${rt('stats_repartition_taux', _rEsc(rampAnneeTemps(inspections)))}</span>
                </div>
                ${rampBarresTemps(inspections, ecarts, 'taux')}
            </div>
            <div>
                <div class="ramp-card-titre">
                    <span>${rt('stats_annuel_nombre')}</span>
                    ${rampAnnuelPeriodes(inspections)}
                </div>
                ${rampBarresTemps(inspections, ecarts, 'nombre', { pas: 'annee' })}
            </div>
            <div>
                <div class="ramp-card-titre">
                    <span>${rt('stats_annuel_taux')}</span>
                </div>
                ${rampBarresTemps(inspections, ecarts, 'taux', { pas: 'annee' })}
            </div>
        </div>`)}
    ${rampBarrePays(true)}`;
}

// L'export reprend le tableau tel qu'il est affiché, détail déplié compris :
// c'est ce que l'agent regarde qu'il emporte.
async function rampExporterSituation() {
    const situation = rampSituation();
    const lignes = [];
    situation.forEach((r) => {
        lignes.push([r.exploitant, 'Exploitant (total)', 'Tous', r.inspections, r.items,
            r.cat1, r.taux1, r.cat2, r.taux2, r.cat3, r.taux3, r.catG, r.tauxG,
            r.totalEcarts, r.tauxCloture, r.scoreTotal]);
        r.detail.forEach((it) => {
            const libelle = rampLibelleItem(it.code);
            lignes.push([r.exploitant, 'Détail (item)',
                libelle ? `${it.code} — ${libelle}` : it.code, '', '',
                it.cat['1'], it.taux1, it.cat['2'], it.taux2, it.cat['3'], it.taux3,
                it.cat.G, it.tauxG, it.total, it.tauxCloture, '']);
        });
    });
    await rampTelecharger('/situation/export-xlsx', { lignes }, 'situation_safa.xlsx');
}

// ══════════════════════════════════════
//  Téléchargement d'un classeur composé par le serveur
// ══════════════════════════════════════
// Le module s'affiche dans une iframe : selon le navigateur, le téléchargement
// d'une URL blob: y est ignoré sans le moindre message. On passe donc par un
// lien ancré au document du parent quand il est accessible.

// Remettre un fichier au navigateur. Le lien reste en place le temps que le
// téléchargement démarre : retiré aussitôt, certains navigateurs l'abandonnent.
// Le module vit dans un cadre ; si le cadre refuse le téléchargement, la page
// parente prend le relais.
function rampEnregistrerFichier(blob, nomFichier) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    try {
        a.click();
    } catch (e) {
        window.open(url, '_blank');
    }
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
    }, 20000);
    return url;
}

async function rampTelecharger(chemin, corps, nomFichier) {
    try {
        const r = await fetch(RAMP_API + chemin, {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corps || {}),
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({ error: r.statusText }));
            throw new Error(err.error || r.statusText);
        }
        const blob = await r.blob();
        rampEnregistrerFichier(blob, nomFichier);
    } catch (e) {
        rampToast(e.message || 'Export impossible', 'error');
    }
}

// ══════════════════════════════════════
//  Écran 5 — Importation
// ══════════════════════════════════════
// Deux temps : le classeur est lu et rendu tel qu'il sera importé, puis
// l'agent confirme. Rien n'entre sans avoir été vu.

function rampCartesImport(T, lues) {
    const nouvelles = T.nouvelles || 0;
    const majs = T.majs || 0;
    const doublons = T.doublons || 0;
    const hors = T.hors_perimetre || 0;
    const retenues = Math.max(0, lues - doublons - hors);
    const part = lues ? Math.round((retenues / lues) * 100) : 0;

    return `<div class="oasis-kpi-groupes ramp-kpi-ligne">${oasisKpiGroupe('', [
        oasisKpiCarte({
            titre: 'Lignes lues', couleur: '#1d4ed8',
            valeur: lues,
            precision: `${retenues} retenue${retenues > 1 ? 's' : ''} à l’import`,
            figure: { type: 'barres', valeurs: [nouvelles, majs, doublons, hors] },
        }),
        oasisKpiCarte({
            titre: 'Nouvelles', couleur: '#16a34a',
            valeur: nouvelles,
            precision: `${part} % du classeur`,
            figure: { type: 'cloture', pct: part },
        }),
        oasisKpiCarte({
            titre: 'Mises à jour', couleur: '#f59e0b',
            valeur: majs,
            precision: 'Inspections déjà connues',
            figure: { type: 'jauge', pct: lues ? Math.round((majs / lues) * 100) : 0 },
        }),
        oasisKpiCarte({
            titre: 'Écartées', couleur: '#dc2626', alerte: !!hors,
            valeur: doublons + hors,
            precision: `${doublons} doublon(s) · ${hors} hors périmètre`,
            figure: { type: 'jauge', pct: lues ? Math.round(((doublons + hors) / lues) * 100) : 0 },
        }),
    ])}</div>`;
}

function rampRenderImportation() {
    if (!rampPeutImporter()) {
        return `<div class="ramp-page-header"><h2>Importation</h2></div>
            <div class="ramp-vide">L'importation est réservée aux coordonnateurs nationaux
            et au gestionnaire du module.</div>`;
    }
    const P = RAMP_STATE.importPrevisu;
    const analyse = RAMP_STATE.importAnalyse;

    if (!P.length) {
        return `
        <div class="ramp-page-header">
            <h2>Importation</h2>
            <span class="ramp-sous-titre">Reprise d'un relevé d'inspections au format Excel</span>
        </div>
        ${rampCartesInspections()}
        <p class="ramp-note">
            Le classeur porte une ligne par écart : les lignes qui partagent la date, l'État,
            l'exploitant, l'aéronef, l'immatriculation et le numéro de vol forment une seule
            inspection. Une inspection déjà connue n'est pas recréée — seul son statut, son
            nombre d'items inspectés ou sa référence POI est mis à jour. La colonne « POI »
            rattache l'inspection à sa fiche : laissée vide, elle n'empêche rien.
        </p>
        <div class="ramp-card">
            <div class="ramp-depot-zone" id="rampZoneImport"
                 onclick="document.getElementById('rampFichierImport').click()">
                ${RAMP_ICONS.upload}
                <div style="margin-top:.5rem;font-weight:600;">Choisir un classeur (.xlsx)</div>
                <div style="font-size:.8rem;">ou déposez-le ici</div>
            </div>
            <input type="file" id="rampFichierImport" accept=".xlsx,.xls" style="display:none;"
                   onchange="rampAnalyserClasseur(this.files[0]); this.value='';">
            <div style="margin-top:.8rem;text-align:center;">
                <button class="btn btn-outline btn-sm" onclick="rampTelechargerModele()">
                    ${RAMP_ICONS.download} Télécharger le modèle</button>
            </div>
        </div>`;
    }

    const badge = (sort) => ({
        nouvelle: '<span class="ramp-badge neuf">Nouvelle</span>',
        maj: '<span class="ramp-badge maj">Mise à jour</span>',
        doublon: '<span class="ramp-badge doublon">Doublon</span>',
    }[sort] || '');

    const T = (analyse || {}).totaux || {};
    const importables = P.filter((l) => l.sort !== 'doublon' && !l.hors_perimetre).length;

    return `
    <div class="ramp-page-header">
        <h2>Importation — aperçu</h2>
        <span class="ramp-sous-titre">${_rEsc((analyse || {}).fichier || '')}</span>
    </div>
    ${rampCartesImport(T, P.length)}
    ${(analyse || {}).colonnes_ignorees && analyse.colonnes_ignorees.length
        ? `<p class="ramp-note">Colonnes du classeur non reprises :
            ${_rEsc(analyse.colonnes_ignorees.join(', '))}.</p>` : ''}
    ${T.hors_perimetre
        ? `<p class="ramp-note" style="border-left-color:#b91c1c;background:rgba(185,28,28,.08);">
            ${T.hors_perimetre} ligne(s) portent un État que vous ne couvrez pas : elles seront écartées.</p>` : ''}
    <div class="ramp-actions-bar">
        <button class="btn btn-outline btn-sm" onclick="rampAnnulerImport()">${RAMP_ICONS.x} Annuler</button>
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampConfirmerImport()" ${importables ? '' : 'disabled'}>
            ${RAMP_ICONS.check} Importer ${importables} inspection(s)</button>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:110px;">POI</th>
                    <th style="width:100px;">Date</th><th style="width:120px;">État</th>
                    <th>Exploitant</th><th style="width:110px;">Aéronef</th>
                    <th style="width:120px;">Immat.</th><th style="width:80px;">Vol</th>
                    <th style="width:70px;text-align:center;">Items</th>
                    <th style="width:70px;text-align:center;">Écarts</th>
                    <th style="width:110px;">Sort</th>
                    <th style="width:60px;text-align:center;">Retirer</th>
                </tr></thead>
                <tbody>
                    ${P.map((l, n) => `<tr ${l.hors_perimetre ? 'style="opacity:.55;"' : ''}>
                        <td>${l.poi_reference
                            ? `<strong class="ramp-code">${_rEsc(l.poi_reference)}</strong>`
                            : '<span class="ramp-vide">—</span>'}</td>
                        <td>${_rEsc(rampDate(l.date))}</td>
                        <td>${_rEsc(l.pays || '—')}${l.hors_perimetre
                            ? ' <span class="ramp-badge doublon">hors périmètre</span>' : ''}</td>
                        <td><strong>${_rEsc(l.exploitant || '—')}</strong></td>
                        <td>${_rEsc(l.aeronef || '—')}</td>
                        <td>${_rEsc(l.immatriculation || '—')}</td>
                        <td>${_rEsc(l.vol || '—')}</td>
                        <td style="text-align:center;">${l.itemsInspectes || 0}</td>
                        <td style="text-align:center;">${(l.anomalies || []).length}</td>
                        <td>${badge(l.sort)}</td>
                        <td class="ramp-cell-actions">
                            <button class="btn btn-outline btn-sm ramp-btn-icone"
                                    onclick="rampRetirerLigneImport(${n})" title="Retirer">${RAMP_ICONS.x}</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

async function rampAnalyserClasseur(fichier) {
    if (!fichier) return;
    const fd = new FormData();
    fd.append('file', fichier);
    try {
        const r = await fetch(`${RAMP_API}/import/analyser`, {
            method: 'POST', credentials: 'same-origin', body: fd,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || r.statusText);
        RAMP_STATE.importAnalyse = d;
        RAMP_STATE.importPrevisu = d.lignes || [];
        rampRenderPage();
    } catch (e) {
        rampToast(e.message || 'Classeur illisible', 'error');
    }
}

function rampRetirerLigneImport(n) {
    RAMP_STATE.importPrevisu.splice(n, 1);
    // Les totaux suivent la liste : retirer une ligne doit se voir en tête.
    const P = RAMP_STATE.importPrevisu;
    RAMP_STATE.importAnalyse.totaux = {
        nouvelles: P.filter((l) => l.sort === 'nouvelle').length,
        majs: P.filter((l) => l.sort === 'maj').length,
        doublons: P.filter((l) => l.sort === 'doublon').length,
        hors_perimetre: P.filter((l) => l.hors_perimetre).length,
    };
    rampRenderPage();
}

function rampAnnulerImport() {
    RAMP_STATE.importPrevisu = [];
    RAMP_STATE.importAnalyse = null;
    rampRenderPage();
}

async function rampConfirmerImport() {
    const aImporter = RAMP_STATE.importPrevisu
        .filter((l) => l.sort !== 'doublon' && !l.hors_perimetre);
    if (!aImporter.length) { rampToast('Rien à importer', 'error'); return; }
    try {
        const r = await rampApi('/inspections/import', {
            method: 'POST', body: JSON.stringify({ data: aImporter }),
        });
        RAMP_STATE.importPrevisu = [];
        RAMP_STATE.importAnalyse = null;
        // L'import fait, le volet se referme sur les états rafraîchis.
        rampFermerSlider();
        await rampRecharger();
        rampToast(r.message || 'Importation effectuée');
    } catch (e) {
        rampToast(e.message || 'Importation impossible', 'error');
    }
}

// Le modèle est servi par une adresse : on y navigue, et c'est le navigateur
// qui enregistre le fichier. Passer par une URL blob: ne marche pas ici — la
// politique de contenu du socle ne l'autorise pas.
function rampTelechargerModele() {
    window.location.assign(`${RAMP_API}/import/modele`);
    rampToast(rt('import_modele_lance'));
}

Object.assign(window, {
    RAMP_BLOCS, rampBasculerBloc, rampBasculerLigne,
    rampSituation, rampRenderStatistiques, rampAnneauStats, rampBasculerPartAnneau,
    rampBarresCollees, rampStatsAeronefMode, RAMP_PALETTE_STATS,
    rampBarresEtats, rampBasculerEtatGraphe, rampSerieEtats, rampSerieEtatsBoutons,
    RAMP_GRANULARITES, rampPeriodeDe, rampPeriodesDisponibles, rampPasCourant,
    rampPeriodesRetenues, rampSerieTempsBoutons, rampGranulariteBoutons, rampBarresTemps,
    rampSerieTemps, rampPasTemps, rampMenuTemps, rampBasculerPeriode, rampViderPeriodes,
    rampAnneeTemps, rampChoisirAnneeTemps, rampAnneeTempsBoutons, rampAnnuelPeriodes,
    rampCinqDernieresAnnees,
    rampOuvrirGenerateur, rampVoletGenerateur, rampChampTable, rampChampEnConflit,
    rampFamillesCompatibles, rampGenDragStart, rampGenDrop, rampGenAjouter, rampGenRetirer,
    rampGenMode, rampGenRole, rampGenVider, rampGenExporter, RAMP_FAMILLES_TABLE,
    rampGenBarreFiltres, rampGenFiltre, rampGenFiltresReset,
    rampGenDefilements, rampGenRestaurer, RAMP_GEN_ZONES,
    RAMP_GEN_TOTAUX, rampGenTotaux, rampGenTotauxCases, rampGenTotal,
    rampGenOrdreDebut, rampGenOrdreDepose, RAMP_GEN_FILTRES, RAMP_GEN_FILTRES_ECART,
    rampTelechargerTable, rampEnregistrerFichier, rampExporterSituation, rampTelecharger,
    rampRenderImportation, rampCartesImport, rampAnalyserClasseur, rampRetirerLigneImport,
    rampAnnulerImport, rampConfirmerImport, rampTelechargerModele,
});
