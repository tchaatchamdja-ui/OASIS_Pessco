// OASIS — Le socle des suites de navigateur de SURV.
//
// La mise en place commune vit désormais dans `module-socle.js`, ouverte à
// PLAN (ADR-003, n° 5.f.99). Ce fichier la fixe pour SURV, et les treize
// suites de SURV continuent de l'appeler sans rien changer.
const socle = require('./module-socle');

/**
 * Mène une suite de navigateur sur l'écran SURV — voir `surModule`.
 * @param {object} o  les options de `surModule`, sans `ecran`
 */
const surSURV = (o) => socle.surModule({ ...o, ecran: socle.SURV });

module.exports = {
  surSURV,
  M: socle.M,
  IDENTIFIANT: socle.IDENTIFIANT,
  MOT_DE_PASSE: socle.MOT_DE_PASSE,
  RACINE: socle.RACINE,
};
