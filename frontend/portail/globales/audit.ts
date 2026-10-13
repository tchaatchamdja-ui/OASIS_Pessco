// OASIS — Le journal d'audit, posé en globales (ADR-003, 5.e.3).
//
// **Un seul nom** : la vue, que `demarrage.ts` appelle à travers `window` comme
// les quatre autres. Cet écran n'a ni geste nommé — son unique bouton est branché
// par un écouteur, non par un attribut `onclick` — ni état.
import { renderAudit } from '../audit';

window.renderAudit = renderAudit;
