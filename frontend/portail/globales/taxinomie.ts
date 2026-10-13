// OASIS — Le personnel et la taxinomie, posés en globales (ADR-003, 5.d.4).
//
// Deux gestes : déplier une fiche de personnel, déplier un accordéon. Les deux
// sont nommés dans des attributs `onclick` que ce module écrit.
//
// `cfgSectionPersonnel` et `cfgSectionDomaines` sont déposées le 13 octobre 2026
// (5.e.5) : `renderConfig` les **importe** depuis 5.d.6, et seul le comparateur
// les lisait encore sur `window`.
import { toggleAcc, togglePers } from '../taxinomie';

window.togglePers = togglePers;
window.toggleAcc = toggleAcc;
