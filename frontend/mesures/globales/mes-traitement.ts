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
// Le sas posait les quarante-sept, un à un, depuis les trois parties du
// traitement (`fil-commun.ts`, `investigation.ts`, `traitement.ts`).
//
// ── La façade retirée (n° 5.f.125) ──
//
// Huit noms ne sont plus posés : personne ne les lit sur `window` — ni un
// gestionnaire en ligne, ni un autre paquet, ni la page. Le sas ne pose plus
// que les trente-neuf qu'on y lit. Les noms retirés : `mesAideDecision`,
// `mesEtapeInfo`, `mesEtatEtape`, `mesActionsEtape`, `mesPiecesHtml`,
// `mesCollecterInvestigation`, `mesActionsInvestigation`,
// `mesCollecterTraitement`.
import {
  MES_DECISIONS, MES_ETAPES, mesConfirmationCocher, mesConfirmationRepondre, mesConfirmerEtape,
  mesEtapeCourante, mesLigneFiche, mesNomDecision, mesNomEtape, mesRangAtteint, mesSection,
  mesTraitementClos, mesTraitementModifiable,
} from '../fil-commun';
import {
  mesEnregistrerInvestigation, mesInvAjouterEnqueteur, mesInvAjouterTravail, mesInvMajTitre,
  mesInvRetirerEnqueteur, mesInvRetirerPiece, mesInvRetirerTravail, mesInvTeleverser,
  mesRenvoisInvestigation, mesSectionAutresElements, mesSectionEquipe, mesSectionRapport,
  mesSectionTravaux, mesSoumettreInvestigation,
} from '../investigation';
import {
  mesBarreInferieure, mesEnregistrerTraitement, mesFilAvancement, mesMajTraitement,
  mesPrendreDecision, mesRetirerPieceTraitement, mesSectionCarence, mesSectionDecision,
  mesSectionInformations, mesSectionPac, mesTeleverserPieceTraitement, mesVoirEtape,
} from '../traitement';

declare global {
  interface Window {
    MES_ETAPES?: typeof MES_ETAPES;
    mesNomEtape?: typeof mesNomEtape;
    MES_DECISIONS?: typeof MES_DECISIONS;
    mesNomDecision?: typeof mesNomDecision;
    mesRangAtteint?: typeof mesRangAtteint;
    mesEtapeCourante?: typeof mesEtapeCourante;
    mesVoirEtape?: typeof mesVoirEtape;
    mesFilAvancement?: typeof mesFilAvancement;
    mesSection?: typeof mesSection;
    mesLigneFiche?: typeof mesLigneFiche;
    mesSectionCarence?: typeof mesSectionCarence;
    mesSectionPac?: typeof mesSectionPac;
    mesSectionInformations?: typeof mesSectionInformations;
    mesSectionDecision?: typeof mesSectionDecision;
    mesBarreInferieure?: typeof mesBarreInferieure;
    mesTraitementClos?: typeof mesTraitementClos;
    mesTraitementModifiable?: typeof mesTraitementModifiable;
    mesRenvoisInvestigation?: typeof mesRenvoisInvestigation;
    mesSectionEquipe?: typeof mesSectionEquipe;
    mesSectionTravaux?: typeof mesSectionTravaux;
    mesSectionAutresElements?: typeof mesSectionAutresElements;
    mesSectionRapport?: typeof mesSectionRapport;
    mesInvAjouterEnqueteur?: typeof mesInvAjouterEnqueteur;
    mesInvRetirerEnqueteur?: typeof mesInvRetirerEnqueteur;
    mesInvAjouterTravail?: typeof mesInvAjouterTravail;
    mesInvRetirerTravail?: typeof mesInvRetirerTravail;
    mesInvMajTitre?: typeof mesInvMajTitre;
    mesInvRetirerPiece?: typeof mesInvRetirerPiece;
    mesInvTeleverser?: typeof mesInvTeleverser;
    mesConfirmerEtape?: typeof mesConfirmerEtape;
    mesConfirmationCocher?: typeof mesConfirmationCocher;
    mesConfirmationRepondre?: typeof mesConfirmationRepondre;
    mesSoumettreInvestigation?: typeof mesSoumettreInvestigation;
    mesEnregistrerInvestigation?: typeof mesEnregistrerInvestigation;
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
window.mesRangAtteint = mesRangAtteint;
window.mesEtapeCourante = mesEtapeCourante;
window.mesVoirEtape = mesVoirEtape;
window.mesFilAvancement = mesFilAvancement;
window.mesSection = mesSection;
window.mesLigneFiche = mesLigneFiche;
window.mesSectionCarence = mesSectionCarence;
window.mesSectionPac = mesSectionPac;
window.mesSectionInformations = mesSectionInformations;
window.mesSectionDecision = mesSectionDecision;
window.mesBarreInferieure = mesBarreInferieure;
window.mesTraitementClos = mesTraitementClos;
window.mesTraitementModifiable = mesTraitementModifiable;
window.mesRenvoisInvestigation = mesRenvoisInvestigation;
window.mesSectionEquipe = mesSectionEquipe;
window.mesSectionTravaux = mesSectionTravaux;
window.mesSectionAutresElements = mesSectionAutresElements;
window.mesSectionRapport = mesSectionRapport;
window.mesInvAjouterEnqueteur = mesInvAjouterEnqueteur;
window.mesInvRetirerEnqueteur = mesInvRetirerEnqueteur;
window.mesInvAjouterTravail = mesInvAjouterTravail;
window.mesInvRetirerTravail = mesInvRetirerTravail;
window.mesInvMajTitre = mesInvMajTitre;
window.mesInvRetirerPiece = mesInvRetirerPiece;
window.mesInvTeleverser = mesInvTeleverser;
window.mesConfirmerEtape = mesConfirmerEtape;
window.mesConfirmationCocher = mesConfirmationCocher;
window.mesConfirmationRepondre = mesConfirmationRepondre;
window.mesSoumettreInvestigation = mesSoumettreInvestigation;
window.mesEnregistrerInvestigation = mesEnregistrerInvestigation;
window.mesMajTraitement = mesMajTraitement;
window.mesRetirerPieceTraitement = mesRetirerPieceTraitement;
window.mesTeleverserPieceTraitement = mesTeleverserPieceTraitement;
window.mesEnregistrerTraitement = mesEnregistrerTraitement;
window.mesPrendreDecision = mesPrendreDecision;
