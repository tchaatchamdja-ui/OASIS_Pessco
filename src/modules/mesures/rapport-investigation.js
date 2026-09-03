// Module « Mesures d'Application » — rapport d'investigation en PDF.
//
// L'instance décisionnelle reçoit l'investigation entière sous une forme qui
// se transmet et s'archive : en-tête de l'autorité, repères de la carence,
// équipe, travaux menés, éléments collectés, rapport de synthèse. Le document
// est autonome — styles en ligne, rien à charger depuis le réseau — parce que
// le moteur de rendu le compose hors de toute session.
//
// La mise en page reprend celle des documents transmis par « Exécution de la
// Surveillance » : A4, marges de 18 mm, titres sur fond de teinte, tables à
// filets fins, et un pied numéroté.

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
              border-bottom: 1px solid #cbd5e1; }
.bloc-corps { padding: 7px 9px; }
.etiquette { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em;
             color: #64748b; margin-bottom: 2px; }
.vide { color: #94a3b8; font-style: italic; }
.rapport { border: 1px solid #cbd5e1; border-left: 3px solid #1a365d;
           border-radius: 3px; padding: 9px 11px; background: #f8fafc; }
.pied { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 8pt; color: #94a3b8;
        border-top: 1px solid #e2e8f0; padding-top: 4px; display: flex; }
.pied .droite { margin-left: auto; }
`;

// Une pièce n'est pas jointe au PDF : elle est nommée, avec sa date, pour que
// l'instance sache ce qui existe et où le demander.
const listePieces = (pieces) => {
  const l = (pieces || []).filter((p) => p.nom || p.intitule);
  if (!l.length) return '<p class="vide">Aucune pièce.</p>';
  return `<table><thead><tr><th style="width:14mm;">N°</th><th>Intitulé</th></tr></thead><tbody>
    ${l.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nom || p.intitule)}</td></tr>`).join('')}
  </tbody></table>`;
};

/**
 * @param {object} o
 * @param {object} o.carence      carence traitée, telle que le module la sert
 * @param {object} o.traitement   traitement, dont l'investigation
 * @param {object} o.aac          identité de l'autorité (nom, pays, logo)
 * @param {string} o.libelleType  (code) => libellé d'un type d'investigation
 */
function html({ carence, traitement, aac, libelleType }) {
  const c = carence || {};
  const inv = (traitement || {}).investigation || {};
  const t = libelleType || ((code) => code);
  const a = aac || {};

  const repere = (titre, valeur) => `<dt>${esc(titre)}</dt><dd>${valeur
    ? esc(valeur) : '<span class="vide">—</span>'}</dd>`;

  const equipe = (inv.equipe || []).length
    ? `<table><thead><tr><th>Nom</th><th>Prénom</th><th>Courriel</th><th>Contact</th></tr></thead><tbody>
        ${inv.equipe.map((p) => `<tr><td>${esc(p.nom)}</td><td>${esc(p.prenom)}</td>
          <td>${esc(p.email)}</td><td>${esc(p.contact)}</td></tr>`).join('')}
      </tbody></table>`
    : '<p class="vide">Aucun enquêteur désigné.</p>';

  const travaux = (inv.travaux || []).length
    ? inv.travaux.map((w, i) => `<div class="bloc">
        <div class="bloc-titre">${i + 1}. ${esc(t(w.type) || 'Investigation')}</div>
        <div class="bloc-corps">
          <div class="etiquette">Résultats</div>
          <div>${w.resultats ? par(w.resultats) : '<span class="vide">Non renseignés.</span>'}</div>
          <div class="etiquette" style="margin-top:6px;">Éléments de preuve</div>
          ${listePieces(w.pieces)}
        </div>
      </div>`).join('')
    : '<p class="vide">Aucune investigation consignée.</p>';

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Rapport d'investigation — ${esc(c.reference || '')}</title>
<style>${CSS}</style></head>
<body>
  <div class="entete">
    ${a.logo ? `<img class="logo" src="${esc(a.logo)}" alt="">` : ''}
    <div class="qui">
      <div class="autorite">${esc(a.nom || 'Autorité de l’aviation civile')}</div>
      <div class="pays">${esc(a.pays || '')}</div>
    </div>
    <div class="doc">
      Rapport d'investigation<br>
      ${esc(c.reference || '')}<br>
      Édité le ${jour(new Date().toISOString())}
    </div>
  </div>

  <h1>Rapport d'investigation</h1>
  <p class="sous">Investigation menée pour établir les faits d'une carence relevée dans le cadre
     de la surveillance continue de la sécurité.</p>

  <h2>1. Carence</h2>
  <dl class="reperes">
    ${repere('Référence', c.reference)}
    ${repere('Prestataire', c.prestataire_nom)}
    ${repere('Objet', c.titre)}
    ${repere('Criticité', c.criticite)}
    ${repere('Ouverture', jour(c.date_ouverture))}
    ${repere('Échéance', jour(c.date_due_cloture))}
  </dl>
  <div class="etiquette">Description</div>
  <div>${c.description ? par(c.description) : '<span class="vide">Non renseignée.</span>'}</div>

  <h2>2. Équipe d'investigation</h2>
  ${equipe}

  <h2>3. Investigations réalisées</h2>
  ${travaux}

  <h2>4. Autres éléments collectés</h2>
  <div>${inv.autres_texte ? par(inv.autres_texte) : '<span class="vide">Aucun élément consigné.</span>'}</div>
  <div class="etiquette" style="margin-top:6px;">Pièces jointes</div>
  ${listePieces(inv.autres_pieces)}

  <h2>5. Résultat de l'investigation</h2>
  <div class="rapport">${inv.rapport ? par(inv.rapport)
    : '<span class="vide">Le rapport de synthèse n’a pas été rédigé.</span>'}</div>

  ${inv.soumise_le ? `<p class="sous" style="margin-top:14px;">
    Investigation soumise le ${jour(inv.soumise_le)}${inv.soumise_par
      ? ` par ${esc(inv.soumise_par)}` : ''}.</p>` : ''}

  <div class="pied">
    <span>${esc(a.nom || '')} — Rapport d'investigation ${esc(c.reference || '')}</span>
    <span class="droite">Document interne</span>
  </div>
</body></html>`;
}

module.exports = { html };
