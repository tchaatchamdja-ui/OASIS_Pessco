// OASIS — « Mesures d'Application » (CARE) : la coquille, publiée pour la page
// (ADR-003, 5.c — n° 5.f.124). Le dernier fichier de CARE.
//
// ── La surface, mesurée ──
//
// `mes-app.js` portait quatre-vingt-dix noms au premier niveau. **Soixante-
// quinze** étaient sur `window` : ses cinquante fonctions, et les `const` que
// son `Object.assign` reposait — vingt-cinq, `mt` mis à part, que le sas des
// libellés pose déjà. Le sas les pose tous, un à un : la page les appelle
// (`MES_STATE`, `mesLoadData`, `mesRenderApp`, `mesNavigateTo` au démarrage),
// le balisage aussi, et les sept autres paquets de CARE les lisent sur
// `window`.
//
// Quinze n'y étaient pas — des tables et des aides que seul ce fichier lisait :
// `_mesAttr`, `_mesNorm`, `mesNavLabel`, `MES_CLES_ORIGINE`, les trois tables de
// couleurs, `MES_STATUT_CARE`, `mesRole`, `mesEstAdmin`, `mesEstSuperAdmin`,
// `MES_CLOS`, `mesEnRetard`, `MES_LIBELLE_ETAPE`, `mesFiger`. Plus aucun script
// classique ne reste sur la page pour les lire par leur nom, et aucun
// gestionnaire en ligne ne les nomme — la recherche a porté sur le fichier
// lui-même cette fois : ils quittent la portée globale, et c'est la différence
// déclarée.
//
// La frontière de la cohabitation (`restant.d.ts`) disparaît avec ce fichier :
// plus rien de CARE n'est en JavaScript. Ses types globaux vivent dans
// `etat.ts`, ses déclarations de `window` ici.
import {
  _mesChemin, _mesEsc, MES_API, MES_STATE, mesApi, mesCategories, mesComites, mesDate, mesJour,
  mesLibelleCategorie, mesLibelleType, mesLoadData, mesPeutDecider, mesPeutEcrire,
  mesRechargerMesures, mesRechargerParametres, mesToast, mesTypes, mesTypesDe,
  mesTypesInvestigation,
} from '../etat';
import {
  MES_CLES_STATUT, MES_ICONS, MES_NAV, MES_SUIVI, mesAideSuivi, mesBadgeStatutCare,
  mesLibelleCare, mesLibelleEtape, mesLibelleStatut, mesLibelleSuivi, mesOrigine,
  mesStatutMesure, mesStatutSuivi,
} from '../libelles';
import {
  mesAfficherSlider, mesChevronRepli, mesFermerSlider, mesFormulaireMesure, mesMesurerPied,
  mesNavigateTo, mesRechercher, mesRechercherMaintenant, mesRenderApp, mesRenderPage,
  mesResetFiltresCritiques, mesResetFiltresDashboard, mesResetFiltresMesures, mesSetFiltre,
  mesSetLang, mesSetTheme, mesToggleSidebar,
} from '../coquille';
import {
  mesGrapheCategorie, mesGrapheSource, mesRenderDashboard, mesRepartition,
} from '../tableau-de-bord';
import {
  mesBoutonTraitement, mesCritiquesFiltrees, mesFaireLeSuivi, mesFiltreCarence,
  mesLignesCritiques, mesLignesMesures, mesMesureDepuisConstatation, mesMesuresFiltrees,
  mesOuvrirTableMesures, mesRenderCritiques, mesRenderMesures, mesSupprimerMesure,
} from '../listes';
import {
  mesAfficherVolet, mesCollecterConstat, mesConstatDelai, mesConstatFormulaire, mesDegeler,
  mesEnregistrerConstat, mesFermerVolet, mesOuvrirConstat, mesSupprimerConstat,
} from '../constats';

declare global {
  interface Window {
    // `etat.ts`
    MES_STATE?: typeof MES_STATE;
    MES_API?: typeof MES_API;
    mesApi?: typeof mesApi;
    _mesEsc?: typeof _mesEsc;
    _mesChemin?: typeof _mesChemin;
    mesPeutDecider?: typeof mesPeutDecider;
    mesPeutEcrire?: typeof mesPeutEcrire;
    mesCategories?: typeof mesCategories;
    mesTypes?: typeof mesTypes;
    mesTypesDe?: typeof mesTypesDe;
    mesLibelleCategorie?: typeof mesLibelleCategorie;
    mesLibelleType?: typeof mesLibelleType;
    mesJour?: typeof mesJour;
    mesDate?: typeof mesDate;
    mesToast?: typeof mesToast;
    mesLoadData?: typeof mesLoadData;
    mesRechargerMesures?: typeof mesRechargerMesures;
    mesTypesInvestigation?: typeof mesTypesInvestigation;
    mesComites?: typeof mesComites;
    mesRechargerParametres?: typeof mesRechargerParametres;
    // `libelles.ts`
    MES_ICONS?: typeof MES_ICONS;
    MES_NAV?: typeof MES_NAV;
    mesOrigine?: typeof mesOrigine;
    mesLibelleCare?: typeof mesLibelleCare;
    mesBadgeStatutCare?: typeof mesBadgeStatutCare;
    MES_CLES_STATUT?: typeof MES_CLES_STATUT;
    mesLibelleStatut?: typeof mesLibelleStatut;
    MES_SUIVI?: typeof MES_SUIVI;
    mesLibelleSuivi?: typeof mesLibelleSuivi;
    mesAideSuivi?: typeof mesAideSuivi;
    mesStatutSuivi?: typeof mesStatutSuivi;
    mesStatutMesure?: typeof mesStatutMesure;
    mesLibelleEtape?: typeof mesLibelleEtape;
    // `coquille.ts`
    mesChevronRepli?: typeof mesChevronRepli;
    mesRenderApp?: typeof mesRenderApp;
    mesSetFiltre?: typeof mesSetFiltre;
    mesRechercher?: typeof mesRechercher;
    mesRechercherMaintenant?: typeof mesRechercherMaintenant;
    mesResetFiltresDashboard?: typeof mesResetFiltresDashboard;
    mesResetFiltresMesures?: typeof mesResetFiltresMesures;
    mesResetFiltresCritiques?: typeof mesResetFiltresCritiques;
    mesNavigateTo?: typeof mesNavigateTo;
    mesRenderPage?: typeof mesRenderPage;
    mesToggleSidebar?: typeof mesToggleSidebar;
    mesSetTheme?: typeof mesSetTheme;
    mesSetLang?: typeof mesSetLang;
    mesFermerSlider?: typeof mesFermerSlider;
    mesMesurerPied?: typeof mesMesurerPied;
    mesAfficherSlider?: typeof mesAfficherSlider;
    mesFormulaireMesure?: typeof mesFormulaireMesure;
    // `tableau-de-bord.ts`
    mesRenderDashboard?: typeof mesRenderDashboard;
    mesRepartition?: typeof mesRepartition;
    mesGrapheSource?: typeof mesGrapheSource;
    mesGrapheCategorie?: typeof mesGrapheCategorie;
    // `listes.ts`
    mesFiltreCarence?: typeof mesFiltreCarence;
    mesMesuresFiltrees?: typeof mesMesuresFiltrees;
    mesLignesMesures?: typeof mesLignesMesures;
    mesOuvrirTableMesures?: typeof mesOuvrirTableMesures;
    mesFaireLeSuivi?: typeof mesFaireLeSuivi;
    mesRenderMesures?: typeof mesRenderMesures;
    mesBoutonTraitement?: typeof mesBoutonTraitement;
    mesCritiquesFiltrees?: typeof mesCritiquesFiltrees;
    mesLignesCritiques?: typeof mesLignesCritiques;
    mesRenderCritiques?: typeof mesRenderCritiques;
    mesMesureDepuisConstatation?: typeof mesMesureDepuisConstatation;
    mesSupprimerMesure?: typeof mesSupprimerMesure;
    // `constats.ts`
    mesDegeler?: typeof mesDegeler;
    mesCollecterConstat?: typeof mesCollecterConstat;
    mesOuvrirConstat?: typeof mesOuvrirConstat;
    mesAfficherVolet?: typeof mesAfficherVolet;
    mesFermerVolet?: typeof mesFermerVolet;
    mesConstatFormulaire?: typeof mesConstatFormulaire;
    mesEnregistrerConstat?: typeof mesEnregistrerConstat;
    mesSupprimerConstat?: typeof mesSupprimerConstat;
    mesConstatDelai?: typeof mesConstatDelai;
  }
}

window.MES_STATE = MES_STATE;
window.MES_API = MES_API;
window.mesApi = mesApi;
window._mesEsc = _mesEsc;
window._mesChemin = _mesChemin;
window.mesPeutDecider = mesPeutDecider;
window.mesPeutEcrire = mesPeutEcrire;
window.mesCategories = mesCategories;
window.mesTypes = mesTypes;
window.mesTypesDe = mesTypesDe;
window.mesLibelleCategorie = mesLibelleCategorie;
window.mesLibelleType = mesLibelleType;
window.mesJour = mesJour;
window.mesDate = mesDate;
window.mesToast = mesToast;
window.mesLoadData = mesLoadData;
window.mesRechargerMesures = mesRechargerMesures;
window.mesTypesInvestigation = mesTypesInvestigation;
window.mesComites = mesComites;
window.mesRechargerParametres = mesRechargerParametres;
window.MES_ICONS = MES_ICONS;
window.MES_NAV = MES_NAV;
window.mesOrigine = mesOrigine;
window.mesLibelleCare = mesLibelleCare;
window.mesBadgeStatutCare = mesBadgeStatutCare;
window.MES_CLES_STATUT = MES_CLES_STATUT;
window.mesLibelleStatut = mesLibelleStatut;
window.MES_SUIVI = MES_SUIVI;
window.mesLibelleSuivi = mesLibelleSuivi;
window.mesAideSuivi = mesAideSuivi;
window.mesStatutSuivi = mesStatutSuivi;
window.mesStatutMesure = mesStatutMesure;
window.mesLibelleEtape = mesLibelleEtape;
window.mesChevronRepli = mesChevronRepli;
window.mesRenderApp = mesRenderApp;
window.mesSetFiltre = mesSetFiltre;
window.mesRechercher = mesRechercher;
window.mesRechercherMaintenant = mesRechercherMaintenant;
window.mesResetFiltresDashboard = mesResetFiltresDashboard;
window.mesResetFiltresMesures = mesResetFiltresMesures;
window.mesResetFiltresCritiques = mesResetFiltresCritiques;
window.mesNavigateTo = mesNavigateTo;
window.mesRenderPage = mesRenderPage;
window.mesToggleSidebar = mesToggleSidebar;
window.mesSetTheme = mesSetTheme;
window.mesSetLang = mesSetLang;
window.mesFermerSlider = mesFermerSlider;
window.mesMesurerPied = mesMesurerPied;
window.mesAfficherSlider = mesAfficherSlider;
window.mesFormulaireMesure = mesFormulaireMesure;
window.mesRenderDashboard = mesRenderDashboard;
window.mesRepartition = mesRepartition;
window.mesGrapheSource = mesGrapheSource;
window.mesGrapheCategorie = mesGrapheCategorie;
window.mesFiltreCarence = mesFiltreCarence;
window.mesMesuresFiltrees = mesMesuresFiltrees;
window.mesLignesMesures = mesLignesMesures;
window.mesOuvrirTableMesures = mesOuvrirTableMesures;
window.mesFaireLeSuivi = mesFaireLeSuivi;
window.mesRenderMesures = mesRenderMesures;
window.mesBoutonTraitement = mesBoutonTraitement;
window.mesCritiquesFiltrees = mesCritiquesFiltrees;
window.mesLignesCritiques = mesLignesCritiques;
window.mesRenderCritiques = mesRenderCritiques;
window.mesMesureDepuisConstatation = mesMesureDepuisConstatation;
window.mesSupprimerMesure = mesSupprimerMesure;
window.mesDegeler = mesDegeler;
window.mesCollecterConstat = mesCollecterConstat;
window.mesOuvrirConstat = mesOuvrirConstat;
window.mesAfficherVolet = mesAfficherVolet;
window.mesFermerVolet = mesFermerVolet;
window.mesConstatFormulaire = mesConstatFormulaire;
window.mesEnregistrerConstat = mesEnregistrerConstat;
window.mesSupprimerConstat = mesSupprimerConstat;
window.mesConstatDelai = mesConstatDelai;
