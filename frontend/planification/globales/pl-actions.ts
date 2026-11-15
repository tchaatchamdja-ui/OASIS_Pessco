// OASIS — « Planification » : les actes du circuit, les commentaires, l'export
// et les pastilles, publiés pour les fichiers restés en JavaScript et pour les
// paquets convertis (ADR-003, 5.c — n° 5.f.108).
//
// `pl-actions.js` posait trente-six noms au premier niveau. Vingt-sept sont
// lus hors du module : vingt-trois par d'autres fichiers — `_esc` par neuf
// modules, les pastilles par quatre, les actes par le détail d'un plan et la
// page de validation, les commentaires et la cloche par `pl-shell.js` —, et
// quatre par les boutons de ses propres fenêtres : la soumission confirmée, la
// décision appliquée, le commentaire enregistré ou retiré. Les neuf autres —
// la lecture des commentaires saisis, le libellé d'un type, la couleur d'un
// risque, la palette et son cache, les alertes de la cloche — quittent la
// portée globale ; le cache des couleurs reste unique, ce module n'étant
// chargé que par ce paquet.
import {
  _esc, _escAttr, _planTypeBadge, _prestataireColor, _riskBadge, _statusBadge, _statusColor, planExportPDF,
  planToggleNotifPanel, planUpdateNotifBadge,
} from '../affichage';
import {
  _parseActivityCommentsFromText, planAmend, planApplyDecision, planApprouverDG, planCancelAmendment,
  planConfirmSubmit, planCreateComment, planDeleteComment, planLoadComments, planReject, planRejectClose,
  planShowCommentModal, planShowValidationComment, planShowWorkflowHistory, planSubmit, planTransmettre,
  planValidate,
} from '../decisions';

declare global {
  interface Window {
    /** L'échappement d'un texte pour le balisage — posé sur la seule page de PLAN. */
    _esc?: typeof _esc;
    /** L'échappement d'une valeur d'attribut. */
    _escAttr?: typeof _escAttr;
    /** La pastille d'un statut. */
    _statusBadge?: typeof _statusBadge;
    /** La couleur d'un statut. */
    _statusColor?: typeof _statusColor;
    /** La pastille du type d'un plan. */
    _planTypeBadge?: typeof _planTypeBadge;
    /** La pastille d'un niveau de risque. */
    _riskBadge?: typeof _riskBadge;
    /** La teinte d'un organisme, stable d'une vue à l'autre. */
    _prestataireColor?: typeof _prestataireColor;
    /** L'export d'un plan, remis à la fenêtre d'impression. */
    planExportPDF?: typeof planExportPDF;
    /** La pastille de la cloche. */
    planUpdateNotifBadge?: typeof planUpdateNotifBadge;
    /** Le panneau des notifications. */
    planToggleNotifPanel?: typeof planToggleNotifPanel;
    /** La soumission d'un plan — sa confirmation. */
    planSubmit?: typeof planSubmit;
    /** La soumission confirmée. */
    planConfirmSubmit?: typeof planConfirmSubmit;
    /** La validation d'un plan — sa confirmation. */
    planValidate?: typeof planValidate;
    /** Le rejet d'un plan — sa confirmation. */
    planReject?: typeof planReject;
    /** Le rejet définitif — sa confirmation. */
    planRejectClose?: typeof planRejectClose;
    /** La décision confirmée. */
    planApplyDecision?: typeof planApplyDecision;
    /** L'approbation du directeur. */
    planApprouverDG?: typeof planApprouverDG;
    /** La transmission au prestataire. */
    planTransmettre?: typeof planTransmettre;
    /** L'amendement d'un plan validé. */
    planAmend?: typeof planAmend;
    /** L'annulation d'un amendement. */
    planCancelAmendment?: typeof planCancelAmendment;
    /** Le commentaire de validation d'une activité, en lecture. */
    planShowValidationComment?: typeof planShowValidationComment;
    /** Les discussions d'un plan. */
    planLoadComments?: typeof planLoadComments;
    /** La fenêtre d'un commentaire. */
    planShowCommentModal?: typeof planShowCommentModal;
    /** Le commentaire enregistré. */
    planCreateComment?: typeof planCreateComment;
    /** Le commentaire retiré, sur confirmation. */
    planDeleteComment?: typeof planDeleteComment;
    /** L'historique du circuit d'un plan. */
    planShowWorkflowHistory?: typeof planShowWorkflowHistory;
    /** Les commentaires par activité d'un texte de décision. */
    _parseActivityCommentsFromText?: typeof _parseActivityCommentsFromText;
  }
}

window._esc = _esc;
window._escAttr = _escAttr;
window._statusBadge = _statusBadge;
window._statusColor = _statusColor;
window._planTypeBadge = _planTypeBadge;
window._riskBadge = _riskBadge;
window._prestataireColor = _prestataireColor;
window.planExportPDF = planExportPDF;
window.planUpdateNotifBadge = planUpdateNotifBadge;
window.planToggleNotifPanel = planToggleNotifPanel;
window.planSubmit = planSubmit;
window.planConfirmSubmit = planConfirmSubmit;
window.planValidate = planValidate;
window.planReject = planReject;
window.planRejectClose = planRejectClose;
window.planApplyDecision = planApplyDecision;
window.planApprouverDG = planApprouverDG;
window.planTransmettre = planTransmettre;
window.planAmend = planAmend;
window.planCancelAmendment = planCancelAmendment;
window.planShowValidationComment = planShowValidationComment;
window.planLoadComments = planLoadComments;
window.planShowCommentModal = planShowCommentModal;
window.planCreateComment = planCreateComment;
window.planDeleteComment = planDeleteComment;
window.planShowWorkflowHistory = planShowWorkflowHistory;
window._parseActivityCommentsFromText = _parseActivityCommentsFromText;
