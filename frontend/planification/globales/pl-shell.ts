// OASIS — « Planification » : la coquille de l'écran, ses droits, ses icônes et
// sa barre de filtres, publiés pour les gabarits et les autres paquets de PLAN
// (ADR-003, 5.c — n° 5.f.109).
//
// `pl-shell.js` posait trente-deux noms au premier niveau. Vingt-sept sont lus
// hors du module : par les autres paquets — les droits, la fenêtre modale, la
// barre de filtres, la navigation, les icônes —, par `index.html` — le
// chargement, le rendu de la coquille, la navigation qu'il enveloppe —, et par
// les gestes que la coquille dessine. Les cinq autres — la table de la barre
// latérale, le privilège de contribution, la lecture des droits, le libellé du
// rôle, le dessin du volet — quittent la portée globale.
//
// ── Quatre globales lexicales devenues des propriétés de la page ──
//
// `PLAN_ICONS`, `PL_VALIDE` et les deux listes de statuts étaient des `const`
// de premier niveau : des globales **lexicales**, atteintes par leur nom nu, et
// absentes de `window`. Un paquet ne peut pas en poser ; il les pose sur
// `window`, où le nom nu les atteint encore. Une seule copie sur la page, que
// les autres paquets lisent par leur nom comme avant — ils ne les importent
// pas, ce qui en ferait une copie par paquet.
import {
  initPlanificationModule, planCloseModal, planDateFr, planFermerCalendrier, planLoadData, planNavigateTo,
  planOuvrirCalendrier, planRenderApp, planRenderPage, planResetFilters, planSetLang, planSetTheme, planShowModal,
  planToggleMobileSidebar, planToggleSidebar, planUpdateNavUI,
} from '../coquille';
import {
  _canContribute, _canValidate, _isAdmin, _meilleurPriv, _privOn, PL_STATUTS_AMENDEMENT, PL_STATUTS_EN_VIGUEUR,
  PL_VALIDE,
} from '../droits';
import { _planBoutonsAnnees, _renderFilterBar } from '../filtres';
import { PLAN_ICONS as ICONES } from '../icones';

declare global {
  interface Window {
    /** Le démarrage en mode hébergé (PESSCO). */
    initPlanificationModule?: typeof initPlanificationModule;
    /** Recharger les données de l'écran. */
    planLoadData?: typeof planLoadData;
    /** Une date au format du module. */
    planDateFr?: typeof planDateFr;
    /** Aller à une page de l'écran — `index.html` l'enveloppe après le premier rendu. */
    planNavigateTo?: typeof planNavigateTo;
    /** La barre latérale remise à la page courante. */
    planUpdateNavUI?: typeof planUpdateNavUI;
    /** Le thème choisi dans la barre latérale. */
    planSetTheme?: typeof planSetTheme;
    /** La langue choisie dans la barre latérale. */
    planSetLang?: typeof planSetLang;
    /** La barre latérale repliée ou dépliée. */
    planToggleSidebar?: typeof planToggleSidebar;
    /** La barre latérale sur un petit écran. */
    planToggleMobileSidebar?: typeof planToggleMobileSidebar;
    /** Les filtres remis à zéro. */
    planResetFilters?: typeof planResetFilters;
    /** La coquille de l'écran. */
    planRenderApp?: typeof planRenderApp;
    /** Redessiner la page courante. */
    planRenderPage?: typeof planRenderPage;
    /** Le volet du calendrier, ouvert. */
    planOuvrirCalendrier?: typeof planOuvrirCalendrier;
    /** Le volet du calendrier, refermé. */
    planFermerCalendrier?: typeof planFermerCalendrier;
    /** La fenêtre modale du module. */
    planShowModal?: typeof planShowModal;
    /** La refermer. */
    planCloseModal?: typeof planCloseModal;
    /** Le privilège du compte sur un secteur. */
    _privOn?: typeof _privOn;
    /** Le meilleur privilège du compte, tous secteurs confondus. */
    _meilleurPriv?: typeof _meilleurPriv;
    /** Le compte est-il administrateur au portail ? */
    _isAdmin?: typeof _isAdmin;
    /** Le privilège de validation, sur un secteur ou en général. */
    _canValidate?: typeof _canValidate;
    /** Le privilège de contribution, sur un secteur ou en général. */
    _canContribute?: typeof _canContribute;
    /** La barre de filtres d'une page. */
    _renderFilterBar?: typeof _renderFilterBar;
    /** Les boutons d'années d'une barre de filtres. */
    _planBoutonsAnnees?: typeof _planBoutonsAnnees;
  }

  // Lus par leur nom nu, sur la seule page de PLAN, où ce sas les pose avant
  // tout autre paquet du module. Un `var` déclaré est une propriété de
  // `globalThis` : c'est ce qu'ils sont devenus.
  /** Les icônes du module. */
  // eslint-disable-next-line no-var
  var PLAN_ICONS: Record<string, string>;
  /** Les privilèges qui valident. */
  // eslint-disable-next-line no-var
  var PL_VALIDE: string[];
  /** Les statuts d'un plan en vigueur. */
  // eslint-disable-next-line no-var
  var PL_STATUTS_EN_VIGUEUR: string[];
  /** Les statuts d'un amendement en circuit. */
  // eslint-disable-next-line no-var
  var PL_STATUTS_AMENDEMENT: string[];
}

window.PLAN_ICONS = ICONES;
window.PL_VALIDE = PL_VALIDE;
window.PL_STATUTS_EN_VIGUEUR = PL_STATUTS_EN_VIGUEUR;
window.PL_STATUTS_AMENDEMENT = PL_STATUTS_AMENDEMENT;

window.initPlanificationModule = initPlanificationModule;
window.planLoadData = planLoadData;
window.planDateFr = planDateFr;
window.planNavigateTo = planNavigateTo;
window.planUpdateNavUI = planUpdateNavUI;
window.planSetTheme = planSetTheme;
window.planSetLang = planSetLang;
window.planToggleSidebar = planToggleSidebar;
window.planToggleMobileSidebar = planToggleMobileSidebar;
window.planResetFilters = planResetFilters;
window.planRenderApp = planRenderApp;
window.planRenderPage = planRenderPage;
window.planOuvrirCalendrier = planOuvrirCalendrier;
window.planFermerCalendrier = planFermerCalendrier;
window.planShowModal = planShowModal;
window.planCloseModal = planCloseModal;
window._privOn = _privOn;
window._meilleurPriv = _meilleurPriv;
window._isAdmin = _isAdmin;
window._canValidate = _canValidate;
window._canContribute = _canContribute;
window._renderFilterBar = _renderFilterBar;
window._planBoutonsAnnees = _planBoutonsAnnees;
