// OASIS — Le journal d'audit, posé en globales (ADR-003, 5.e.3).
//
// Sas, construit vers `public/app/audit.js`. **Un seul nom** : la vue, lue par
// `app-demarrage`. Cet écran n'a ni geste nommé — son unique bouton est branché
// par un écouteur, non par un attribut `onclick` — ni état.
import { renderAudit } from '../audit';

window.renderAudit = renderAudit;
