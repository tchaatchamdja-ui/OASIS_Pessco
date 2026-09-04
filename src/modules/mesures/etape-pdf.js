// Module « Mesures d'Application » — une étape du traitement, en PDF.
//
// Chaque étape du fil se transmet et s'archive telle qu'elle a été renseignée :
// le document reprend ses sections dans l'ordre de l'écran, y compris ce qui
// n'a pas été rempli — un champ vide dit qu'il l'est, il ne disparaît pas.
//
// La mise en page est celle du rapport d'investigation, dont ce fichier reprend
// la feuille : même autorité en tête, mêmes titres sur fond de teinte, mêmes
// tables à filets fins. Le document est autonome — styles en ligne, rien à
// charger — parce que le moteur de rendu le compose hors de toute session.

const esc = (v) => String(v === undefined || v === null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Un texte saisi sur plusieurs lignes garde ses retours à la ligne.
const par = (v) => esc(v).replace(/\r?\n/g, '<br>');

const jour = (v) => {
  const d = String(v || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return esc(v || '');
  const [a, m, j] = d.split('-');
  return `${j}/${m}/${a}`;
};

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 10.5pt; line-height: 1.45; color: #1e293b; margin: 0;
}
.entete { display: flex; align-items: flex-start; gap: 14px; border-bottom: 2px solid #1a365d;
          padding-bottom: 10px; margin-bottom: 18px; }
.entete .logo { width: 64px; height: 64px; object-fit: contain; }
.entete .qui { flex: 1; }
.entete .autorite { font-size: 12pt; font-weight: 700; color: #1a365d; }
.entete .pays { font-size: 9pt; color: #64748b; }
.entete .doc { text-align: right; font-size: 9pt; color: #64748b; }
h1 { font-size: 15pt; color: #1a365d; margin: 0 0 4px; }
.sous { font-size: 9.5pt; color: #64748b; margin: 0 0 18px; }
h2 { font-size: 11pt; color: #fff; background: #1a365d; margin: 18px 0 8px;
     padding: 5px 9px; border-radius: 3px; page-break-after: avoid; }
h3 { font-size: 10.5pt; color: #1a365d; margin: 12px 0 4px; page-break-after: avoid; }
table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
th { background: #f1f5f9; font-size: 9pt; text-transform: uppercase; letter-spacing: .03em; color: #475569; }
dl.reperes { display: grid; grid-template-columns: 42mm 1fr 42mm 1fr; gap: 0; margin: 0 0 8px; }
dl.reperes dt { font-size: 9pt; color: #64748b; padding: 3px 6px 3px 0; }
dl.reperes dd { margin: 0; padding: 3px 10px 3px 0; }
.bloc { border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 8px; page-break-inside: avoid; }
.bloc-titre { background: #f1f5f9; padding: 4px 9px; font-weight: 700; font-size: 10pt;
              border-bottom: 1px solid #cbd5e1; display: flex; gap: 8px; }
.bloc-titre .marque { margin-left: auto; font-weight: 400; font-size: 9pt; color: #64748b; }
.bloc-corps { padding: 7px 9px; }
.etiquette { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em;
             color: #64748b; margin-bottom: 2px; }
.vide { color: #94a3b8; font-style: italic; }
.rapport { border: 1px solid #cbd5e1; border-left: 3px solid #1a365d;
           border-radius: 3px; padding: 9px 11px; background: #f8fafc; }
.etat { display: inline-block; padding: 1px 7px; border-radius: 9px; font-size: 8.5pt;
        font-weight: 700; background: #e2e8f0; color: #475569; }
/* Le pied ferme le document plutôt que de se répéter : posé en « fixed », le
   moteur de rendu le rejoue à la même hauteur sur chaque page et il barre le
   texte qui s'y trouve. */
.pied { margin-top: 14px; font-size: 8pt; color: #94a3b8;
        border-top: 1px solid #e2e8f0; padding-top: 4px; display: flex; }
.pied .droite { margin-left: auto; }
`;

const ETAPES = {
  suite: {
    titre: 'Suite à donner',
    sous: 'Instruction de la carence — plan d’actions soumis, informations recueillies, '
      + 'et décision de l’autorité sur la suite à lui donner.',
  },
  investigations: {
    titre: 'Investigations',
    sous: 'Actes d’enquête menés pour établir les faits : équipe, travaux, éléments '
      + 'collectés et rapport de synthèse.',
  },
  qualification: {
    titre: 'Qualification et Mesures',
    sous: 'Séance de l’instance décisionnelle : qualification de l’infraction, mesures '
      + 'd’application arrêtées, et examen des recours le cas échéant.',
  },
  suivi: {
    titre: 'Suivi des Mesures',
    sous: 'Mise en œuvre des mesures arrêtées : où en est chacune, ce que le prestataire '
      + 'en a fait, et ce qui reste dû.',
  },
};

const DECISIONS = { classer: 'Classer', investiguer: 'Investiguer', mesures: 'Prendre des mesures' };
const PORTEES = { temporelle: 'Limitée dans le temps', illimitee: 'Illimitée', sans_objet: 'Sans objet' };
const SUIVIS = {
  attendu: 'Plan attendu', en_cours: 'En cours de mise en œuvre', solde: 'Soldé',
  sans_suite: 'Sans suite', sans_objet: 'Suivi sans objet', recours: 'Recours',
};
const DECISIONS_RECOURS = {
  maintenir: 'Maintenir la mesure', modifier: 'Modifier la mesure', annuler: 'Annuler la mesure',
};

const repere = (titre, valeur) => `<dt>${esc(titre)}</dt><dd>${valeur
  ? esc(valeur) : '<span class="vide">—</span>'}</dd>`;

const texteOuVide = (v, quoi) => (v ? par(v) : `<span class="vide">${esc(quoi)}</span>`);

// Une pièce n'est pas jointe au document : elle est nommée, pour que le
// lecteur sache ce qui existe et où le demander.
const listePieces = (pieces) => {
  const l = (pieces || []).filter((p) => p.nom || p.intitule);
  if (!l.length) return '<p class="vide">Aucune pièce.</p>';
  return `<table><thead><tr><th style="width:14mm;">N°</th><th>Intitulé</th></tr></thead><tbody>
    ${l.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nom || p.intitule)}</td></tr>`).join('')}
  </tbody></table>`;
};

const listePersonnes = (gens, quoi) => ((gens || []).length
  ? `<table><thead><tr><th>Nom</th><th>Prénom</th><th>Courriel</th><th>Contact</th></tr></thead><tbody>
      ${gens.map((p) => `<tr><td>${esc(p.nom)}</td><td>${esc(p.prenom)}</td>
        <td>${esc(p.email)}</td><td>${esc(p.contact)}</td></tr>`).join('')}
    </tbody></table>`
  : `<p class="vide">${esc(quoi)}</p>`);

// La carence ouvre trois des quatre étapes : elle rappelle de quoi il s'agit.
const sectionCarence = (c, n) => `
  <h2>${n}. Carence</h2>
  <dl class="reperes">
    ${repere('Référence', c.reference)}
    ${repere('Prestataire', c.prestataire_nom)}
    ${repere('Objet', c.titre)}
    ${repere('Criticité', c.criticite)}
    ${repere('Ouverture', jour(c.date_ouverture))}
    ${repere('Échéance', jour(c.date_due_cloture))}
  </dl>
  <div class="etiquette">Description</div>
  <div>${texteOuVide(c.description, 'Non renseignée.')}</div>`;

// ── Étape 1 — la suite à donner ──
function corpsSuite(c, t, pac) {
  const plan = pac ? `
    <dl class="reperes">
      ${repere('Statut du plan', pac.statut)}
      ${repere('Déposé le', jour(pac.date_depot || pac.depose_le))}
      ${repere('Échéance', jour(pac.date_echeance))}
      ${repere('Référence', pac.reference)}
    </dl>
    <div class="etiquette">Actions annoncées</div>
    <div>${texteOuVide(pac.description || pac.actions, 'Non détaillées.')}</div>
    <div class="etiquette" style="margin-top:6px;">Preuves déposées</div>
    ${listePieces((pac.preuves || []).map((p) => ({ nom: p.intitule || p.nom })))}`
    : '<p class="vide">Aucun plan d’actions n’a été soumis pour cette carence.</p>';

  return `
    ${sectionCarence(c, 1)}
    <h2>2. Plan d’action soumis</h2>
    ${plan}
    <h2>3. Informations additionnelles</h2>
    <div>${texteOuVide(t.informations, 'Aucune information recueillie.')}</div>
    <div class="etiquette" style="margin-top:6px;">Pièces jointes</div>
    ${listePieces(t.pieces)}
    <h2>4. Décision sur la suite à donner</h2>
    <dl class="reperes">
      ${repere('Décision', DECISIONS[t.decision] || t.decision)}
      ${repere('Prise le', jour(t.decide_le))}
      ${repere('Par', t.decide_par)}
      ${repere('Étape atteinte', (ETAPES[t.etape] || {}).titre)}
    </dl>
    <div class="etiquette">Justifications de la décision</div>
    <div class="rapport">${texteOuVide(t.decision_motif, 'Non motivée.')}</div>`;
}

// ── Étape 2 — les investigations ──
function corpsInvestigations(c, t, libelleType) {
  const inv = t.investigation || {};
  const travaux = (inv.travaux || []).length
    ? inv.travaux.map((w, i) => `<div class="bloc">
        <div class="bloc-titre"><span>${i + 1}. ${esc(libelleType(w.type) || 'Investigation')}</span></div>
        <div class="bloc-corps">
          <div class="etiquette">Résultats</div>
          <div>${texteOuVide(w.resultats, 'Non renseignés.')}</div>
          <div class="etiquette" style="margin-top:6px;">Éléments de preuve</div>
          ${listePieces(w.pieces)}
        </div>
      </div>`).join('')
    : '<p class="vide">Aucune investigation consignée.</p>';

  const renvois = (inv.renvois || []).length
    ? `<table><thead><tr><th style="width:28mm;">Date</th><th>Motif</th><th style="width:45mm;">Par</th></tr></thead><tbody>
        ${inv.renvois.map((r) => `<tr><td>${jour(r.renvoye_le)}</td>
          <td>${par(r.motif)}</td><td>${esc(r.renvoye_par)}</td></tr>`).join('')}
      </tbody></table>`
    : '<p class="vide">Aucun renvoi de l’instance.</p>';

  return `
    ${sectionCarence(c, 1)}
    <h2>2. Équipe d’investigation</h2>
    ${listePersonnes(inv.equipe, 'Aucun enquêteur désigné.')}
    <h2>3. Investigations réalisées</h2>
    ${travaux}
    <h2>4. Autres éléments collectés</h2>
    <div>${texteOuVide(inv.autres_texte, 'Aucun élément complémentaire.')}</div>
    <div class="etiquette" style="margin-top:6px;">Pièces jointes</div>
    ${listePieces(inv.autres_pieces)}
    <h2>5. Résultat de l’investigation</h2>
    <div class="rapport">${texteOuVide(inv.rapport, 'Aucun rapport de synthèse n’a été rédigé.')}</div>
    <h2>6. Soumission et renvois</h2>
    <dl class="reperes">
      ${repere('Soumise le', jour(inv.soumise_le))}
      ${repere('Par', inv.soumise_par)}
    </dl>
    ${renvois}`;
}

// Une mesure arrêtée, telle que l'instance l'a fixée.
const blocMesure = (m, i, libelleCategorie, libelleType) => {
  const duree = m.portee === 'temporelle' && m.duree_valeur
    ? `${m.duree_valeur} ${m.duree_unite || 'jours'}` : '';
  const marque = m.statut_recours === 'annulee' ? 'Annulée sur recours'
    : (m.statut_recours === 'modifiee' ? 'Modifiée sur recours' : '');
  const avant = m.version_precedente || null;
  return `<div class="bloc">
    <div class="bloc-titre"><span>${i + 1}. ${esc(libelleCategorie(m.categorie) || 'Mesure')}</span>
      ${marque ? `<span class="marque">${esc(marque)}</span>` : ''}</div>
    <div class="bloc-corps">
      <dl class="reperes">
        ${repere('Type', libelleType(m.type_mesure))}
        ${repere('Date de sanction', jour(m.date_sanction))}
        ${repere('Portée', PORTEES[m.portee] || '')}
        ${repere('Durée', duree)}
        ${repere('Fin de sanction', jour(m.date_fin))}
        ${repere('Suivi requis', m.suivi_requis ? 'Oui' : 'Non')}
      </dl>
      <div class="etiquette">Description de la sanction</div>
      <div>${texteOuVide(m.commentaire, 'Non renseignée.')}</div>
      ${avant ? `<div class="etiquette" style="margin-top:6px;">Version précédente</div>
        <dl class="reperes">
          ${repere('Type', libelleType(avant.type_mesure))}
          ${repere('Date de sanction', jour(avant.date_sanction))}
          ${repere('Portée', PORTEES[avant.portee] || '')}
          ${repere('Fin de sanction', jour(avant.date_fin))}
        </dl>
        <div>${texteOuVide(avant.commentaire, 'Non renseignée.')}</div>` : ''}
    </div>
  </div>`;
};

// ── Étape 3 — la qualification et les mesures ──
function corpsQualification(c, t, libelleCategorie, libelleType, libelleComite) {
  const q = t.qualification || {};
  const inv = t.investigation || {};

  const reunions = (q.reunions || []).length
    ? `<table><thead><tr><th style="width:28mm;">Date</th><th>Objet</th><th>Résultat</th></tr></thead><tbody>
        ${q.reunions.map((r) => `<tr><td>${jour(r.date)}</td>
          <td>${esc(r.objet)}</td><td>${par(r.resultat)}</td></tr>`).join('')}
      </tbody></table>`
    : '<p class="vide">Aucune séance consignée.</p>';

  const mesures = (q.mesures || []).length
    ? q.mesures.map((m, i) => blocMesure(m, i, libelleCategorie, libelleType)).join('')
    : '<p class="vide">Aucune mesure arrêtée.</p>';

  const contestees = (q.mesures || [])
    .map((m, i) => ({ m, i })).filter((x) => x.m.recours_intente);
  const recours = contestees.length
    ? contestees.map(({ m, i }) => {
      const r = m.recours || {};
      return `<div class="bloc">
        <div class="bloc-titre"><span>${i + 1}. ${esc(libelleCategorie(m.categorie) || 'Mesure')}</span>
          <span class="marque">${esc(DECISIONS_RECOURS[r.decision] || 'En examen')}</span></div>
        <div class="bloc-corps">
          <div class="etiquette">Recours intenté</div>
          <div>${texteOuVide(r.intente_texte, 'Non détaillé.')}</div>
          <div class="etiquette" style="margin-top:6px;">Pièces jointes du recours</div>
          ${listePieces(r.pieces)}
          <div class="etiquette" style="margin-top:6px;">Instance d’examen</div>
          <div>${texteOuVide(libelleComite(r.instance_code), 'Non désignée.')}</div>
          <div class="etiquette" style="margin-top:6px;">Équipe du recours</div>
          ${listePersonnes(r.membres, 'Aucun membre désigné.')}
          <div class="etiquette" style="margin-top:6px;">Commentaire sur le recours</div>
          <div>${texteOuVide(r.commentaire, 'Aucun.')}</div>
          <div class="etiquette" style="margin-top:6px;">Pièces jointes de la décision</div>
          ${listePieces(r.decision_pieces)}
        </div>
      </div>`;
    }).join('')
    : '<p class="vide">Aucune mesure n’est contestée.</p>';

  return `
    ${sectionCarence(c, 1)}
    <h2>2. Rapport d’investigation</h2>
    <dl class="reperes">
      ${repere('Soumise le', jour(inv.soumise_le))}
      ${repere('Par', inv.soumise_par)}
    </dl>
    <div class="rapport">${texteOuVide(inv.rapport,
    'Aucune investigation n’a été menée : la suite à donner est passée directement à la qualification.')}</div>
    <h2>3. Instance décisionnelle</h2>
    <dl class="reperes">${repere('Nom de l’instance', libelleComite(q.comite_code))}</dl>
    <div class="etiquette">Membres</div>
    ${listePersonnes(q.membres, 'Aucun membre désigné.')}
    <div class="etiquette" style="margin-top:6px;">Séances</div>
    ${reunions}
    <h2>4. Qualification de l’infraction</h2>
    <dl class="reperes">
      ${repere('Infraction constituée', q.infraction_constituee ? 'Oui' : 'Non')}
      ${repere('Infraction non constituée', q.infraction_non_constituee ? 'Oui' : 'Non')}
      ${repere('Renvoi demandé', q.renvoi_demande ? 'Oui' : 'Non')}
      ${repere('Validée le', jour(t.qualifie_le))}
    </dl>
    <div class="etiquette">Nature de l’infraction</div>
    <div>${texteOuVide(q.nature, 'Non renseignée.')}</div>
    <div class="etiquette" style="margin-top:6px;">Caractérisation</div>
    <div>${texteOuVide(q.caracterisation, 'Non renseignée.')}</div>
    <div class="etiquette" style="margin-top:6px;">Circonstances</div>
    <div>${texteOuVide(q.circonstances, 'Non renseignées.')}</div>
    ${q.renvoi_demande ? `<div class="etiquette" style="margin-top:6px;">Motif du renvoi</div>
      <div>${texteOuVide(q.renvoi_motif, 'Non motivé.')}</div>` : ''}
    <h2>5. Mesures d’application</h2>
    ${mesures}
    <div class="etiquette" style="margin-top:6px;">Décision de l’instance</div>
    ${listePieces(q.pieces)}
    <h2>6. Recours</h2>
    ${recours}`;
}

// ── Étape 4 — le suivi des mesures ──
function corpsSuivi(c, t, mesures, libelleCategorie, libelleType) {
  const q = t.qualification || {};
  const suivi = t.suivi || {};
  const statutDe = (m) => {
    if (SUIVIS[m.suivi_statut]) return SUIVIS[m.suivi_statut];
    if (m.recours_intente) return SUIVIS.recours;
    if (m.statut === 'annulee') return SUIVIS.sans_suite;
    if (m.statut === 'cloturee') return SUIVIS.solde;
    if (m.statut === 'en_cours') return SUIVIS.en_cours;
    return SUIVIS.attendu;
  };

  const blocs = (mesures || []).length
    ? mesures.map((m, i) => `<div class="bloc">
        <div class="bloc-titre"><span>${i + 1}. ${esc(m.reference || 'Mesure')}</span>
          <span class="marque">${esc(statutDe(m))}</span></div>
        <div class="bloc-corps">
          <dl class="reperes">
            ${repere('Catégorie', libelleCategorie(m.categorie))}
            ${repere('Type', libelleType(m.type_mesure))}
            ${repere('Date de sanction', jour(m.date_sanction || m.date_emission))}
            ${repere('Échéance', jour(m.date_echeance))}
            ${repere('Fin de sanction', jour(m.date_fin_sanction))}
            ${repere('Recours intenté', m.recours_intente ? 'Oui' : 'Non')}
          </dl>
          <div class="etiquette">Description de la sanction</div>
          <div>${texteOuVide(m.description, 'Non renseignée.')}</div>
          <div class="etiquette" style="margin-top:6px;">Commentaire de suivi</div>
          <div>${texteOuVide(m.suivi_commentaire, 'Aucun commentaire de suivi.')}</div>
          <div class="etiquette" style="margin-top:6px;">Pièces jointes</div>
          ${listePieces(m.suivi_pieces)}
        </div>
      </div>`).join('')
    : '<p class="vide">Aucune mesure n’est rattachée à cette carence.</p>';

  return `
    <h2>1. Mesures</h2>
    <div class="etiquette">Description de la carence</div>
    <div>${texteOuVide(c.description, 'Non renseignée.')}</div>
    <div class="etiquette" style="margin-top:6px;">Nature de l’infraction</div>
    <div>${texteOuVide(q.nature, 'Non renseignée.')}</div>
    <h2>2. Plan d’action</h2>
    ${blocs}
    <div class="etiquette" style="margin-top:8px;">Commentaire général</div>
    <div class="rapport">${texteOuVide(suivi.commentaire_general, 'Aucun commentaire général.')}</div>
    <h2>3. Clôture</h2>
    <dl class="reperes">
      ${repere('Suivi mis à jour le', jour(suivi.maj_le))}
      ${repere('Par', suivi.maj_par)}
      ${repere('Traitement clôturé le', jour(t.cloture_le))}
      ${repere('Par', t.cloture_par)}
    </dl>`;
}

/**
 * @param {object} o
 * @param {string} o.etape             clé de l'étape : suite, investigations, qualification, suivi
 * @param {object} o.carence           carence traitée, telle que le module la sert
 * @param {object} o.traitement        traitement, avec ses quatre étapes
 * @param {Array}  o.mesures           mesures au registre issues de cette carence
 * @param {object} o.pac               plan d'actions publié par le module d'origine
 * @param {object} o.aac               identité de l'autorité (nom, pays, logo)
 * @param {Function} o.libelleType     (code) => libellé d'un type — d'investigation ou de mesure
 * @param {Function} o.libelleCategorie (code) => libellé d'une catégorie de mesure
 * @param {Function} o.libelleComite   (code) => libellé d'un comité décisionnel
 */
function html(o) {
  const c = o.carence || {};
  const t = o.traitement || {};
  const a = o.aac || {};
  const cle = ETAPES[o.etape] ? o.etape : 'suite';
  const meta = ETAPES[cle];
  const id = (f) => (typeof f === 'function' ? f : ((v) => v || ''));
  const type = id(o.libelleType);
  const categorie = id(o.libelleCategorie);
  const comite = id(o.libelleComite);

  const corps = cle === 'investigations' ? corpsInvestigations(c, t, type)
    : (cle === 'qualification' ? corpsQualification(c, t, categorie, type, comite)
      : (cle === 'suivi' ? corpsSuivi(c, t, o.mesures, categorie, type)
        : corpsSuite(c, t, o.pac)));

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${esc(meta.titre)} — ${esc(c.reference || '')}</title>
<style>${CSS}</style></head>
<body>
  <div class="entete">
    ${a.logo ? `<img class="logo" src="${esc(a.logo)}" alt="">` : ''}
    <div class="qui">
      <div class="autorite">${esc(a.nom || 'Autorité de l’aviation civile')}</div>
      <div class="pays">${esc(a.pays || '')}</div>
    </div>
    <div class="doc">
      Traitement d’une carence<br>
      ${esc(c.reference || '')}<br>
      Édité le ${jour(new Date().toISOString())}
    </div>
  </div>

  <h1>${esc(meta.titre)}</h1>
  <p class="sous">${esc(meta.sous)}</p>
  ${corps}

  <div class="pied">
    <span>${esc(a.nom || '')} — Mesures d’Application</span>
    <span class="droite">Document de travail — diffusion interne</span>
  </div>
</body></html>`;
}

module.exports = { html, ETAPES };
