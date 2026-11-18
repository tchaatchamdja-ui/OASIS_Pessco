// OASIS — « Mesures d'Application » (CARE) : le traitement d'une carence,
// publié pour la page (ADR-003, 5.c — n° 5.f.122).
//
// ── La surface, mesurée ──
//
// `mes-traitement.js` portait cinquante-sept noms au premier niveau.
// **Quarante-deux** étaient sur `window` — fonctions, et `const` que son
// `Object.assign` reposait. Quinze n'y étaient pas, et c'est ici que la mesure
// change la conversion : **cinq de ces `const` sont lus ailleurs**, par leur
// nom nu, ce qu'un script classique permet et qu'un module ne permet plus —
// `mesRangAtteint` par la qualification, `mesEtapeCourante` et
// `mesMajTraitement` par le volet de `mes-app.js`, `mesSection` et
// `mesLigneFiche` par la qualification encore, le suivi et les états. Le sas
// les pose sur `window`, où la lecture nue les retrouve — la leçon de
// `CURRENT_LANG` (n° 5.c.1).
//
// Les dix autres — `MES_STATUTS_ORIGINE`, `mesStatutOrigine`,
// `mesEtapeAtteinte`, `MES_CHEVRON`, `mesInvestigation`, `mesInvSoumise`,
// `mesInvModifiable`, `mesMajInvestigation`, `mesRedessinerInvestigation`,
// `MES_CONFIRMATION` — ne sont lus par personne : ils quittent la portée
// globale, et c'est la différence déclarée.
//
// Le sas pose les quarante-sept, un à un, depuis les trois parties du
// traitement (`fil-commun.ts`, `investigation.ts`, `traitement.ts`).
import {
  MES_DECISIONS, MES_ETAPES, mesAideDecision, mesConfirmationCocher, mesConfirmationRepondre,
  mesConfirmerEtape, mesEtapeCourante, mesLigneFiche, mesNomDecision, mesNomEtape, mesRangAtteint,
  mesSection, mesTraitementClos, mesTraitementModifiable,
} from '../fil-commun';
import {
  mesActionsInvestigation, mesCollecterInvestigation, mesEnregistrerInvestigation,
  mesInvAjouterEnqueteur, mesInvAjouterTravail, mesInvMajTitre, mesInvRetirerEnqueteur,
  mesInvRetirerPiece, mesInvRetirerTravail, mesInvTeleverser, mesPiecesHtml,
  mesRenvoisInvestigation, mesSectionAutresElements, mesSectionEquipe, mesSectionRapport,
  mesSectionTravaux, mesSoumettreInvestigation,
} from '../investigation';
import {
  mesActionsEtape, mesBarreInferieure, mesCollecterTraitement, mesEnregistrerTraitement,
  mesEtapeInfo, mesEtatEtape, mesFilAvancement, mesMajTraitement, mesPrendreDecision,
  mesRetirerPieceTraitement, mesSectionCarence, mesSectionDecision, mesSectionInformations,
  mesSectionPac, mesTeleverserPieceTraitement, mesVoirEtape,
} from '../traitement';

declare global {
  interface Window {
    MES_ETAPES?: typeof MES_ETAPES;
    mesNomEtape?: typeof mesNomEtape;
    MES_DECISIONS?: typeof MES_DECISIONS;
    mesNomDecision?: typeof mesNomDecision;
    mesAideDecision?: typeof mesAideDecision;
    mesRangAtteint?: typeof mesRangAtteint;
    mesEtapeCourante?: typeof mesEtapeCourante;
    mesVoirEtape?: typeof mesVoirEtape;
    mesEtapeInfo?: typeof mesEtapeInfo;
    mesFilAvancement?: typeof mesFilAvancement;
    mesEtatEtape?: typeof mesEtatEtape;
    mesActionsEtape?: typeof mesActionsEtape;
    mesSection?: typeof mesSection;
    mesLigneFiche?: typeof mesLigneFiche;
    mesSectionCarence?: typeof mesSectionCarence;
    mesSectionPac?: typeof mesSectionPac;
    mesSectionInformations?: typeof mesSectionInformations;
    mesSectionDecision?: typeof mesSectionDecision;
    mesBarreInferieure?: typeof mesBarreInferieure;
    mesTraitementClos?: typeof mesTraitementClos;
    mesTraitementModifiable?: typeof mesTraitementModifiable;
    mesPiecesHtml?: typeof mesPiecesHtml;
    mesRenvoisInvestigation?: typeof mesRenvoisInvestigation;
    mesSectionEquipe?: typeof mesSectionEquipe;
    mesSectionTravaux?: typeof mesSectionTravaux;
    mesSectionAutresElements?: typeof mesSectionAutresElements;
    mesSectionRapport?: typeof mesSectionRapport;
    mesCollecterInvestigation?: typeof mesCollecterInvestigation;
    mesInvAjouterEnqueteur?: typeof mesInvAjouterEnqueteur;
    mesInvRetirerEnqueteur?: typeof mesInvRetirerEnqueteur;
    mesInvAjouterTravail?: typeof mesInvAjouterTravail;
    mesInvRetirerTravail?: typeof mesInvRetirerTravail;
    mesInvMajTitre?: typeof mesInvMajTitre;
    mesInvRetirerPiece?: typeof mesInvRetirerPiece;
    mesInvTeleverser?: typeof mesInvTeleverser;
    mesActionsInvestigation?: typeof mesActionsInvestigation;
    mesConfirmerEtape?: typeof mesConfirmerEtape;
    mesConfirmationCocher?: typeof mesConfirmationCocher;
    mesConfirmationRepondre?: typeof mesConfirmationRepondre;
    mesSoumettreInvestigation?: typeof mesSoumettreInvestigation;
    mesEnregistrerInvestigation?: typeof mesEnregistrerInvestigation;
    mesCollecterTraitement?: typeof mesCollecterTraitement;
    mesMajTraitement?: typeof mesMajTraitement;
    mesRetirerPieceTraitement?: typeof mesRetirerPieceTraitement;
    mesTeleverserPieceTraitement?: typeof mesTeleverserPieceTraitement;
    mesEnregistrerTraitement?: typeof mesEnregistrerTraitement;
    mesPrendreDecision?: typeof mesPrendreDecision;
  }
}

window.MES_ETAPES = MES_ETAPES;
window.mesNomEtape = mesNomEtape;
window.MES_DECISIONS = MES_DECISIONS;
window.mesNomDecision = mesNomDecision;
window.mesAideDecision = mesAideDecision;
window.mesRangAtteint = mesRangAtteint;
window.mesEtapeCourante = mesEtapeCourante;
window.mesVoirEtape = mesVoirEtape;
window.mesEtapeInfo = mesEtapeInfo;
window.mesFilAvancement = mesFilAvancement;
window.mesEtatEtape = mesEtatEtape;
window.mesActionsEtape = mesActionsEtape;
window.mesSection = mesSection;
window.mesLigneFiche = mesLigneFiche;
window.mesSectionCarence = mesSectionCarence;
window.mesSectionPac = mesSectionPac;
window.mesSectionInformations = mesSectionInformations;
window.mesSectionDecision = mesSectionDecision;
window.mesBarreInferieure = mesBarreInferieure;
window.mesTraitementClos = mesTraitementClos;
window.mesTraitementModifiable = mesTraitementModifiable;
window.mesPiecesHtml = mesPiecesHtml;
window.mesRenvoisInvestigation = mesRenvoisInvestigation;
window.mesSectionEquipe = mesSectionEquipe;
window.mesSectionTravaux = mesSectionTravaux;
window.mesSectionAutresElements = mesSectionAutresElements;
window.mesSectionRapport = mesSectionRapport;
window.mesCollecterInvestigation = mesCollecterInvestigation;
window.mesInvAjouterEnqueteur = mesInvAjouterEnqueteur;
window.mesInvRetirerEnqueteur = mesInvRetirerEnqueteur;
window.mesInvAjouterTravail = mesInvAjouterTravail;
window.mesInvRetirerTravail = mesInvRetirerTravail;
window.mesInvMajTitre = mesInvMajTitre;
window.mesInvRetirerPiece = mesInvRetirerPiece;
window.mesInvTeleverser = mesInvTeleverser;
window.mesActionsInvestigation = mesActionsInvestigation;
window.mesConfirmerEtape = mesConfirmerEtape;
window.mesConfirmationCocher = mesConfirmationCocher;
window.mesConfirmationRepondre = mesConfirmationRepondre;
window.mesSoumettreInvestigation = mesSoumettreInvestigation;
window.mesEnregistrerInvestigation = mesEnregistrerInvestigation;
window.mesCollecterTraitement = mesCollecterTraitement;
window.mesMajTraitement = mesMajTraitement;
window.mesRetirerPieceTraitement = mesRetirerPieceTraitement;
window.mesTeleverserPieceTraitement = mesTeleverserPieceTraitement;
window.mesEnregistrerTraitement = mesEnregistrerTraitement;
window.mesPrendreDecision = mesPrendreDecision;
