// OASIS — La fermeture des fenêtres de configuration, posée en globales
// (ADR-003, 5.e.10).
//
// **Un seul nom**, et il est publié parce que quatre attributs `onclick` du
// balisage l'appellent : celui des référentiels, celui de l'import de classeur,
// ceux de l'organigramme et celui des paramètres de l'Administration.
//
// Il était publié par le sas des référentiels, qui ne le définit plus : la
// racine `cfgModalRoot` a désormais son module (`../fenetres`), et *le sas qui
// publie un nom est celui de son définisseur* — la règle de 5.b, qui a déjà
// servi à `onLangChange` et à `loadRefs`.
//
// La surface du portail est **inchangée** par ce déplacement : même nom, même
// fonction, même page. Le relevé figé de `tests/smoke/surface-portail.json` en
// est la preuve — un refactoring qui changerait la surface ne serait pas un
// refactoring.
import { closeRefModal } from '../fenetres';

window.closeRefModal = closeRefModal;
