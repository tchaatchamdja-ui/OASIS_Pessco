// OASIS — « Mesures d'Application » (CARE) : le tableau de bord, et ses
// répartitions (ADR-003, 5.c — n° 5.f.124).
//
// Converti à la lettre depuis `mes-app.js` : le balisage est rendu caractère
// pour caractère. Redessiner passe par la page — `mesRenderPage`, que la
// coquille pose —, comme l'ancien fichier appelait le nom nu : ce module ne
// l'importe pas, et le paquet reste sans cycle.
import {
  MES_STATE, _mesAttr, _mesEsc, mesCategories, mesJour, mesLibelleCategorie, mesLibelleType, mesTypes,
} from './etat';
import {
  MES_CLES_ORIGINE, MES_CLES_STATUT, MES_CLOS, MES_COULEURS_CATEGORIE, MES_COULEUR_PAR_CODE,
  MES_COULEUR_PAR_SOURCE, MES_ICONS, MES_STATUT_CARE, mesEnRetard, mesLibelleStatut, mesOrigine,
} from './libelles';
import { mt, requis } from './partage';

/** Une part d'une répartition : son intitulé, son effectif, sa teinte — et sa clé, si elle commande. */
export interface Segment { cle?: string; label: string; value: number; color: string | undefined }
/** Ce qu'une répartition dessine, et ce qu'un clic sur une part commande. */
export interface OptionsRepartition {
  camembert?: boolean;
  action?: string;
  retenue?: string;
  infobulle?: string;
  unite?: string;
}

const opt = (v: string | undefined, l: unknown, cur: string): string => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;

export function mesRenderDashboard(): string {
  const F = MES_STATE.filtres;
  const aujourdhui = mesJour();
  let liste = MES_STATE.data.mesures;

  const echeance = (m: { date_echeance?: string; statut?: string }, genre: string): boolean => {
    const clos = MES_CLOS.includes(m.statut || '');
    if (genre === 'sans') return !m.date_echeance;
    if (genre === 'retard') return !!m.date_echeance && m.date_echeance < aujourdhui && !clos;
    if (genre === 'proche') {
      if (!m.date_echeance || clos) return false;
      const j = (new Date(m.date_echeance).getTime() - new Date(aujourdhui).getTime()) / 86400000;
      return j >= 0 && j <= 30;
    }
    return true;
  };
  if (F.db_prest) liste = liste.filter((m) => m.prestataire_id === F.db_prest);
  if (F.db_cat) liste = liste.filter((m) => m.categorie === F.db_cat);
  if (F.db_type) liste = liste.filter((m) => m.type_mesure === F.db_type);
  if (F.db_statut) liste = liste.filter((m) => m.statut === F.db_statut);
  if (F.db_echeance) liste = liste.filter((m) => echeance(m, F.db_echeance));

  const compte = (s: string): number => liste.filter((m) => m.statut === s).length;
  const enRetard = liste.filter(mesEnRetard).length;
  const proche = liste.filter((m) => echeance(m, 'proche')).length;

  const segmentsCategorie: Segment[] = mesCategories().map((c, i) => ({
    cle: c.code,
    label: c.libelle,
    value: liste.filter((m) => m.categorie === c.code).length,
    color: MES_COULEUR_PAR_CODE[c.code] || MES_COULEURS_CATEGORIE[i % MES_COULEURS_CATEGORIE.length],
  }));
  const parCategorie = mesCategories().length
    ? mesRepartition(segmentsCategorie, {
      camembert: false, action: 'mesGrapheCategorie',
      retenue: MES_STATE.categorieGraphe || '', infobulle: mt('infobulle_filtrer_types'),
    })
    : `<div class="mes-preuve-vide">${mt('aucune_categorie_param')}</div>`;

  // Les types affichés suivent la catégorie retenue au graphique voisin :
  // cliquer sur « Sanction administrative » ne montre plus que ses types.
  const catRetenue = MES_STATE.categorieGraphe || '';
  const listeType = catRetenue ? liste.filter((m) => m.categorie === catRetenue) : liste;
  const compteurType: Record<string, number> = {};
  listeType.forEach((m) => { compteurType[String(m.type_mesure)] = (compteurType[String(m.type_mesure)] || 0) + 1; });
  const segmentsType: Segment[] = Object.entries(compteurType).sort((x, y) => y[1] - x[1])
    .map(([t, n], i) => ({
      label: mesLibelleType(t), value: n,
      color: MES_COULEURS_CATEGORIE[i % MES_COULEURS_CATEGORIE.length],
    }));
  const parType = segmentsType.length
    ? mesRepartition(segmentsType, { camembert: true })
    : `<div class="mes-preuve-vide">${mt('aucune_donnee')}</div>`;

  // ── Cartes d'indicateurs ──
  // Elles reprennent celles du tableau de bord d'« Exécution de la
  // Surveillance » : le socle les rend (`oasisKpiCarte`), chacune porte son
  // intitulé, la mesure, une précision et une figure qui dit de quoi il
  // s'agit. Deux groupes titrés — ce que l'Autorité a décidé, et ce qui
  // l'appelait à décider.
  const clos = liste.filter((m) => MES_CLOS.includes(m.statut || '')).length;
  const tauxCloture = liste.length ? Math.round((clos / liste.length) * 100) : 0;
  const visees = new Set(liste.map((m) => m.prestataire_id).filter(Boolean)).size;
  const volumeStatut = MES_CLES_STATUT.map((s) => compte(s));

  // ── Côté constatations ──
  // C'est l'écart relevé qui appelle la mesure : le tableau de bord montre
  // les deux bouts de la chaîne. Ce que le module en a fait, et non l'état que
  // la carence porte chez celui qui l'a relevée : une constatation soldée chez
  // le surveillant reste à traiter ici tant qu'aucune décision n'a été prise.
  const constatations = MES_STATE.data.constatations || [];
  const constPortee = F.db_prest
    ? constatations.filter((c) => c.prestataire_id === F.db_prest) : constatations;
  const reglees = constPortee.filter((c) => c.classee || c.traitement_clos).length;
  const tauxRegle = constPortee.length ? Math.round((reglees / constPortee.length) * 100) : 0;
  const classees = constPortee.filter((c) => c.classee).length;
  const partClassees = constPortee.length ? Math.round((classees / constPortee.length) * 100) : 0;

  const segmentsSource: Segment[] = MES_CLES_ORIGINE.map((cle) => ({
    cle,
    label: mesOrigine(cle),
    value: constPortee.filter((c) => (c.origine || 'SURV') === cle).length,
    color: MES_COULEUR_PAR_SOURCE[cle],
  }));
  const parSource = constPortee.length
    ? mesRepartition(segmentsSource, {
      camembert: false, action: 'mesGrapheSource',
      retenue: MES_STATE.sourceGraphe || '', infobulle: mt('infobulle_filtrer_statuts'),
    })
    : `<div class="mes-preuve-vide">${mt('aucune_carence')}</div>`;

  // Le graphique dit ce que la colonne « Statut » du menu Carences affiche :
  // l'état de la carence dans ce module, non celui qu'elle porte ailleurs.
  // Une source retenue au graphique voisin resserre les statuts sur elle.
  const sourceRetenue = MES_STATE.sourceGraphe || '';
  const carencesStatut = sourceRetenue
    ? constPortee.filter((c) => (c.origine || 'SURV') === sourceRetenue) : constPortee;
  const segmentsStatutConstat: Segment[] = Object.entries(MES_STATUT_CARE).map(([cle, st]) => ({
    // Le statut se nomme par sa clé de traduction, comme la pastille et la
    // colonne « Statut » : la table ne porte plus de libellé en dur.
    label: mt(st.cle),
    value: carencesStatut.filter((c) => (c.statut_care || 'a_traiter') === cle).length,
    color: st.couleur,
  }));
  const parStatutConstat = carencesStatut.length
    ? mesRepartition(segmentsStatutConstat, { camembert: true, unite: 'carence' })
    : `<div class="mes-preuve-vide">${mt('aucune_carence')}</div>`;
  // Carences dont le traitement n'est pas ouvert : c'est ce qui reste à faire,
  // et c'est ce que la colonne « Statut » du menu Carences appelle « À
  // traiter ».
  const aTraiter = constPortee
    .filter((c) => (c.statut_care || 'a_traiter') === 'a_traiter').length;
  // Part de ce qui reste à faire, sur l'échelle de la carte : au-delà du
  // quart, l'aiguille est au rouge.
  const positionATraiter = constPortee.length
    ? Math.min(100, Math.round((aTraiter / constPortee.length) * 400)) : 0;

  const { oasisKpiGroupe, oasisKpiCarte } = window;
  const cartes = `
    <div class="oasis-kpi-groupes">
        ${oasisKpiGroupe(mt('grp_mesures'), [
            oasisKpiCarte({
                titre: mt('kpi_mesures_prises'), couleur: '#b91c1c',
                valeur: liste.length,
                precision: mt('kpi_visees', visees),
                figure: { type: 'barres', valeurs: volumeStatut },
            }),
            oasisKpiCarte({
                titre: mt('kpi_echeance_depassee'), couleur: '#dc2626', alerte: !!enRetard,
                valeur: enRetard,
                precision: proche ? mt('kpi_proche', proche) : mt('kpi_aucune_proche'),
                figure: { type: 'retard', pastille: mt('kpi_depassee'), legende: mt('kpi_emission') },
            }),
            oasisKpiCarte({
                titre: mt('kpi_taux_cloture'), couleur: '#059669',
                valeur: `${tauxCloture} %`,
                precision: mt('kpi_cloturees_sur', clos, liste.length),
                figure: { type: 'cloture', pct: tauxCloture },
            }),
        ])}
        ${oasisKpiGroupe(mt('grp_carences'), [
            oasisKpiCarte({
                titre: mt('kpi_constatations'), couleur: '#ea580c',
                valeur: constPortee.length,
                precision: mt('kpi_reglees', reglees, tauxRegle),
                figure: { type: 'jauge', pct: tauxRegle },
            }),
            oasisKpiCarte({
                titre: mt('kpi_a_traiter'), couleur: '#dc2626', alerte: !!aTraiter,
                valeur: aTraiter,
                precision: mt('kpi_sur_carences', constPortee.length),
                figure: { type: 'echelle', position: positionATraiter, min: mt('kpi_maitrise'), max: mt('kpi_a_traiter') },
            }),
            // Classée : l'autorité a décidé qu'aucune mesure ne serait prise.
            oasisKpiCarte({
                titre: mt('kpi_classees'), couleur: '#7c3aed',
                valeur: classees,
                precision: mt('kpi_sur_carences', constPortee.length),
                figure: { type: 'jauge', pct: partClassees },
            }),
        ])}
    </div>`;

  return `
    <div class="mes-page-header">
        <h2>${mt('nav_dashboard')}</h2>
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select" onchange="mesSetFiltre('db_prest',this.value)">
                <option value="">${mt('tous_prestataires')}</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.db_prest)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_cat',this.value)">
                <option value="">${mt('toutes_categories')}</option>
                ${mesCategories().map((c) => opt(c.code, c.libelle, F.db_cat)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_type',this.value)">
                <option value="">${mt('tous_types')}</option>
                ${mesTypes().map((t) => opt(t.code, t.libelle, F.db_type)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_statut',this.value)">
                <option value="">${mt('tous_statuts')}</option>
                ${MES_CLES_STATUT.map((v) => opt(v, mesLibelleStatut(v), F.db_statut)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_echeance',this.value)">
                <option value="">${mt('toutes_echeances')}</option>
                ${opt('retard', mt('ech_retard'), F.db_echeance)}
                ${opt('proche', mt('ech_proche'), F.db_echeance)}
                ${opt('sans', mt('ech_sans'), F.db_echeance)}
            </select>
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresDashboard()"
                    title="${_mesAttr(mt('reinit_filtres'))}" aria-label="${_mesAttr(mt('reinit_filtres'))}">${MES_ICONS.reset}</button>
        </div>
    </div>
    ${cartes}
    <div class="mes-grille-2">
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_categorie')}</div>${parCategorie}
        </div>
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_source')}</div>${parSource}
        </div>
    </div>
    <div class="mes-grille-2">
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_type_mesure')}${catRetenue
                ? ` — ${_mesEsc(mesLibelleCategorie(catRetenue))}` : ''}</div>${parType}
        </div>
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_statut_carence')}${sourceRetenue
                ? ` — ${_mesEsc(mesOrigine(sourceRetenue))}` : ''}</div>${parStatutConstat}
        </div>
    </div>
    `;
}

// ── Répartition : le modèle du module « Exécution de la Surveillance » ──
// Un camembert porte le total en son centre — il suit les filtres du tableau
// de bord — et, à côté, chaque part se lit en clair : intitulé, effectif, et
// une barre qui dit son poids relatif.
export function mesRepartition(segments: Segment[] | null | undefined, options?: OptionsRepartition): string {
  const o = options || {};
  const avecCamembert = o.camembert !== false;
  // Une part cliquable commande un autre graphique : l'appelant dit lequel.
  const action = o.action || '';
  const retenue = o.retenue || '';
  const infobulle = o.infobulle || mt('filtrer');
  // Ce que le creux du camembert compte : des mesures par défaut, mais la
  // répartition des carences en compte d'autres.
  const unite = o.unite || 'mesure';
  const parts = (segments || []).filter((s) => s && s.value > 0);
  const total = (segments || []).reduce((n, s) => n + (s.value || 0), 0);
  const max = Math.max(1, ...(segments || []).map((s) => s.value || 0));

  // Le camembert se dessine en dégradé conique : aucune bibliothèque, et la
  // part se calcule au pourcentage près.
  let angle = 0;
  const tranches = parts.map((s) => {
    const debut = angle;
    angle += (s.value / total) * 100;
    return `${s.color} ${debut}% ${angle}%`;
  });
  const camembert = !avecCamembert ? '' : (total
        ? `<div class="mes-camembert" style="background:conic-gradient(${tranches.join(', ')});">
               <div class="mes-camembert-creux">
                   <strong>${total}</strong>
                   <span>${_mesEsc(unite)}${total > 1 ? 's' : ''}</span>
               </div>
           </div>`
        : '<div class="mes-camembert vide"><div class="mes-camembert-creux"><strong>0</strong></div></div>');

    return `
    <div class="mes-repartition">
        ${camembert}
        <table class="mes-repartition-tab">
            <tbody>
                ${(segments || []).map((s) => {
                    // Une part porteuse d'une clé commande un autre graphique :
                    // on la désigne comme telle, et un second clic la relâche.
                    const actif = s.cle && s.cle === retenue;
                    const attrs = s.cle && action
                        ? ` class="cliquable${actif ? ' actif' : ''}" role="button" tabindex="0"
                            title="${_mesAttr(infobulle)}" onclick="${action}('${s.cle}')"`
                        : '';
                    return `
                <tr${attrs}>
                    <td><span class="mes-repartition-badge" style="background:${s.color};">${_mesEsc(s.label)}</span></td>
                    <td class="num">${s.value || 0}</td>
                    <td>
                        <div class="mes-repartition-piste">
                            <div class="mes-repartition-barre"
                                 style="width:${Math.round(((s.value || 0) / max) * 100)}%;background:${s.color};"></div>
                        </div>
                    </td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// Retenir une source de carence, ou la relâcher si elle l'était déjà.
export function mesGrapheSource(cle: string): void {
  MES_STATE.sourceGraphe = MES_STATE.sourceGraphe === cle ? '' : cle;
  requis('mesRenderPage')();
}

// Retenir une catégorie, ou la relâcher si elle l'était déjà.
export function mesGrapheCategorie(code: string): void {
  MES_STATE.categorieGraphe = MES_STATE.categorieGraphe === code ? '' : code;
  requis('mesRenderPage')();
}
