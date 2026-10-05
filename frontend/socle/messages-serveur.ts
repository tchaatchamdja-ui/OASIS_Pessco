// OASIS — Phrases d'erreur du serveur, en anglais et en portugais.
//
// Beaucoup de routes répondent par une phrase française plutôt que par un
// code. Le serveur ne connaît pas la langue de l'agent ; l'écran, si. La
// phrase reçue est donc traduite ici, à l'affichage, par `oasisMessageErreur`
// (oasis-commun.js). Une phrase absente de la table se lit en français, comme
// avant.
//
// Clé : la phrase française telle que le serveur l'écrit. Une phrase à trous
// garde ses trous sous la forme {0}, {1}… ; les deux traductions les
// reprennent, dans l'ordre qui leur convient.
//
// Vocabulaire commun avec les écrans : carence → deficiency / deficiência ;
// constatation, écart → finding / constatação ; infraction → breach /
// infração ; formulaire, fiche → form / formulário ; dossier → file /
// processo ; PAC → CAP / PAC ; gestionnaire → manager / gestor ; validateur →
// approver / validador ; AAC → CAA / AAC.
//
// La suite de fumée « traductions » vérifie que chaque phrase émise par le
// serveur a ici ses deux traductions.
///
//
// ── Ce que le typage ajoute à une table de données ──
//
// Les trois langues sont **positionnelles** : l'indice 0 est le français, 1
// l'anglais, 2 le portugais. Rien ne le disait, et une entrée à deux éléments au
// lieu de trois se lisait « traduction manquante » à l'affichage — un
// `undefined` rendu tel quel. Le type le refuse désormais à la construction.
//
// La suite « traductions » vérifie en plus que chaque phrase émise par le
// serveur a bien son entrée ici. Les deux contrôles ne se remplacent pas : l'un
// tient la forme, l'autre la couverture.
//
// Ce fichier ne touche pas à `window` : voir `globales/oasis-messages-serveur.ts`.

/**
 * Un mot et son genre, pour les gabarits qui s'accordent. Le second élément est
 * absent quand la langue n'accorde pas — l'anglais —, ou quand le mot est
 * invariable.
 */
export type MotGenre = readonly [string, string?];

/** Un gabarit de phrase, décliné au masculin et au féminin. */
export interface Gabarit {
  readonly m: string;
  readonly f: string;
  readonly desactivableM?: string;
  readonly desactivableF?: string;
}


export const MESSAGES: Readonly<Record<string, readonly [string, string]>> = {
  'À compléter avant soumission : {0}': ['To be completed before submission: {0}', 'A completar antes da submissão: {0}'],
  'À compléter avant validation : {0}': ['To be completed before validation: {0}', 'A completar antes da validação: {0}'],
  "Action réservée à l'AAC": ['Action restricted to the CAA', 'Ação reservada à AAC'],
  'Activité non réinitialisable : {0} constatation(s) et {1} rapport(s) en dépendent': ['Activity cannot be reset: {0} finding(s) and {1} report(s) depend on it', 'Atividade não reinicializável: dela dependem {0} constatação(ões) e {1} relatório(s)'],
  'Adresse invalide : {0}': ['Invalid address: {0}', 'Endereço inválido: {0}'],
  'Au moins un élément à partager': ['At least one item to share', 'Pelo menos um elemento a partilhar'],
  'Au moins un État destinataire': ['At least one recipient State', 'Pelo menos um Estado destinatário'],
  'Aucun champ à mettre à jour': ['No field to update', 'Nenhum campo a atualizar'],
  'Aucun mot de passe temporaire disponible': ['No temporary password available', 'Nenhuma palavra-passe temporária disponível'],
  'Aucun prestataire disponible pour la vue Prestataire': ['No provider available for the Provider view', 'Nenhum prestador disponível para a vista Prestador'],
  'Aucun traitement ouvert sur cette carence': ['No processing open on this deficiency', 'Nenhum tratamento aberto sobre esta deficiência'],
  'Aucune donnée à exporter': ['No data to export', 'Nenhum dado a exportar'],
  'Aucune donnée à importer': ['No data to import', 'Nenhum dado a importar'],
  'Aucune donnée choisie': ['No data selected', 'Nenhum dado selecionado'],
  'Aucune investigation': ['No investigation', 'Nenhuma investigação'],
  'Aucune mesure n’a été arrêtée': ['No measure has been decided', 'Nenhuma medida foi decidida'],
  'Aucune mesure n’est contestée': ['No measure is contested', 'Nenhuma medida é contestada'],
  'Aucune modification': ['No change', 'Nenhuma alteração'],
  'Bigramme : deux lettres attendues': ['Two-letter code: two letters expected', 'Código de duas letras: duas letras esperadas'],
  'Ce comité a déjà siégé sur une mesure': ['This committee has already sat on a measure', 'Este comité já deliberou sobre uma medida'],
  'Ces États ont déjà reçu cette transmission': ['These States have already received this transmission', 'Estes Estados já receberam esta transmissão'],
  'Cet État n’est pas destinataire du partage': ['This State is not a recipient of the share', 'Este Estado não é destinatário da partilha'],
  'Cette infraction a été classée': ['This breach has been dismissed', 'Esta infração foi arquivada'],
  "Classe d'action {0} : la communication écrite à l'exploitant est requise": ['Action class {0}: written communication to the operator is required', 'Classe de ação {0}: a comunicação escrita ao operador é obrigatória'],
  'Classeur illisible': ['Unreadable workbook', 'Livro de cálculo ilegível'],
  'Classeur vide': ['Empty workbook', 'Livro de cálculo vazio'],
  'Colonnes introuvables : {0}. Intitulés lus : {1}': ['Columns not found: {0}. Headings read: {1}', 'Colunas não encontradas: {0}. Títulos lidos: {1}'],
  'Des mesures sont rattachées à cette infraction': ['Measures are attached to this breach', 'Existem medidas associadas a esta infração'],
  'Document expiré': ['Document expired', 'Documento expirado'],
  'Document vide': ['Empty document', 'Documento vazio'],
  'Données sans relation entre elles': ['Unrelated data', 'Dados sem relação entre si'],
  'Droit non confié à ce compte': ['Right not granted to this account', 'Direito não atribuído a esta conta'],
  'État émetteur indéterminé': ['Sending State undetermined', 'Estado emissor indeterminado'],
  'État, nom et prénoms sont obligatoires': ['State, surname and first names are required', 'Estado, apelido e nomes próprios são obrigatórios'],
  'Fiche transmise à l’exploitant — ses pièces ne se modifient plus': ['Form transmitted to the operator — its attachments can no longer be changed', 'Formulário transmitido ao operador — os seus anexos já não podem ser alterados'],
  'Fichier expiré — relancez l’export': ['File expired — run the export again', 'Ficheiro expirado — relance a exportação'],
  'Fichier introuvable sur le serveur': ['File not found on the server', 'Ficheiro não encontrado no servidor'],
  "Format non reconnu — colonne 'Ordre' introuvable dans les 20 premières lignes.": ["Unrecognised format — 'Order' column not found in the first 20 rows.", "Formato não reconhecido — coluna 'Ordem' não encontrada nas 20 primeiras linhas."],
  "Format non reconnu — colonne 'Ordre' introuvable.": ["Unrecognised format — 'Order' column not found.", "Formato não reconhecido — coluna 'Ordem' não encontrada."],
  "Format non reconnu — colonne 'Thème' introuvable.": ["Unrecognised format — 'Theme' column not found.", "Formato não reconhecido — coluna 'Tema' não encontrada."],
  'Format non supporté — utilisez .xlsx': ['Unsupported format — use .xlsx', 'Formato não suportado — utilize .xlsx'],
  'Formulaire soumis à validation — demandez son renvoi pour le reprendre': ['Form submitted for validation — ask for it to be sent back to resume it', 'Formulário submetido a validação — peça a sua devolução para o retomar'],
  'Formulaire validé — suppression réservée au gestionnaire': ['Form validated — deletion restricted to the manager', 'Formulário validado — eliminação reservada ao gestor'],
  'Import refusé pour : {0} — hors de votre périmètre': ['Import refused for: {0} — outside your scope', 'Importação recusada para: {0} — fora do seu âmbito'],
  'Impossible de créer une FNC sur un dossier clôturé': ['A finding cannot be created on a closed file', 'Não é possível criar uma constatação num processo encerrado'],
  'Impossible de supprimer votre propre compte': ['You cannot delete your own account', 'Não pode eliminar a sua própria conta'],
  'Infraction non classée': ['Breach not dismissed', 'Infração não arquivada'],
  'Intitulé inexploitable': ['Unusable title', 'Título inutilizável'],
  'L’infraction n’a pas été déclarée non constituée': ['The breach has not been declared unestablished', 'A infração não foi declarada não constituída'],
  'La carence n’est pas à l’étape Investigations': ['The deficiency is not at the Investigations step', 'A deficiência não está na etapa Investigações'],
  'La carence n’est pas à l’étape Qualification et Mesures': ['The deficiency is not at the Qualification and Measures step', 'A deficiência não está na etapa Qualificação e Medidas'],
  'La carence n’est pas à l’étape Suivi des Mesures': ['The deficiency is not at the Measures Follow-up step', 'A deficiência não está na etapa Acompanhamento das Medidas'],
  'La clôture ne vaut que sur une infraction constituée': ['Closure only applies to an established breach', 'O encerramento só se aplica a uma infração constituída'],
  'La confirmation n’est pas ouverte à ce stade': ['Confirmation is not open at this stage', 'A confirmação não está aberta nesta fase'],
  'La date de début doit être dans l’année {0}.': ['The start date must fall within {0}.', 'A data de início deve estar no ano {0}.'],
  'La date de fin doit être postérieure ou égale à la date de début.': ['The end date must be on or after the start date.', 'A data de fim deve ser igual ou posterior à data de início.'],
  'La FNC doit être ouverte, PAC rejetée ou PAC accepté pour soumettre un PAC': ['The finding must be open, CAP rejected or CAP accepted to submit a CAP', 'A constatação deve estar aberta, com PAC rejeitado ou PAC aceite para submeter um PAC'],
  'La notification n’est pas au stade de la réception': ['The notification is not at the receipt stage', 'A notificação não está na fase de receção'],
  'Le bigramme {0} désigne déjà un pays': ['The code {0} already designates a country', 'O código {0} já designa um país'],
  'Le code {0} désigne déjà un aéroport': ['The code {0} already designates an airport', 'O código {0} já designa um aeroporto'],
  "Le rapport doit être signé par l'inspecteur et le directeur avant transmission": ['The report must be signed by the inspector and the director before transmission', 'O relatório deve ser assinado pelo inspetor e pelo diretor antes da transmissão'],
  'Le renvoi n’a pas été demandé par l’instance': ['The decision panel has not requested a send-back', 'A instância decisória não pediu a devolução'],
  'Le suivi ne s’ouvre que sur une infraction constituée': ['Follow-up only opens on an established breach', 'O acompanhamento só se abre sobre uma infração constituída'],
  'Libellé inexploitable': ['Unusable label', 'Designação inutilizável'],
  'Mot de passe incorrect': ['Incorrect password', 'Palavra-passe incorreta'],
  'Moteur de rendu PDF indisponible sur ce serveur': ['PDF rendering engine unavailable on this server', 'Motor de geração de PDF indisponível neste servidor'],
  'Nom de fichier vide': ['Empty file name', 'Nome de ficheiro vazio'],
  'Nom, année et mois sont obligatoires': ['Name, year and month are required', 'Nome, ano e mês são obrigatórios'],
  'Renseignez au moins une action avant de soumettre': ['Enter at least one action before submitting', 'Indique pelo menos uma ação antes de submeter'],
  'Requête multipart invalide': ['Invalid multipart request', 'Pedido multipart inválido'],
  'Seul l’État émetteur referme la discussion': ['Only the sending State closes the discussion', 'Só o Estado emissor encerra a discussão'],
  "Seul l'initiateur peut supprimer ce brouillon": ['Only the initiator can delete this draft', 'Só o iniciador pode eliminar este rascunho'],
  'Transition impossible depuis le statut « {0} »': ['Transition impossible from the status “{0}”', 'Transição impossível a partir do estado «{0}»'],
  "Transmission réservée à l'Autorité": ['Transmission restricted to the Authority', 'Transmissão reservada à Autoridade'],
  'Type de fichier non autorisé': ['File type not allowed', 'Tipo de ficheiro não autorizado'],
  'Type de fichier non autorisé ({0})': ['File type not allowed ({0})', 'Tipo de ficheiro não autorizado ({0})'],
  'Un dossier clôturé ne s’arrête pas': ['A closed file cannot be stopped', 'Um processo encerrado não pode ser interrompido'],
  'Un rapport transmis est requis pour clôturer': ['A transmitted report is required to close', 'É necessário um relatório transmitido para encerrar'],
  'Un recours est en cours d’examen : la carence ne se clôture pas': ['An appeal is under review: the deficiency cannot be closed', 'Um recurso está em análise: a deficiência não pode ser encerrada'],
  'Une mesure a déjà été prise sur cette carence': ['A measure has already been taken on this deficiency', 'Já foi tomada uma medida sobre esta deficiência'],
  'Une mesure a déjà été prise sur cette infraction': ['A measure has already been taken on this breach', 'Já foi tomada uma medida sobre esta infração'],
  'Une mesure au moins requiert le suivi de sa mise en œuvre': ['At least one measure requires follow-up of its implementation', 'Pelo menos uma medida requer o acompanhamento da sua implementação'],
  'Vous n\'écrivez pas au nom de « {0} »': ['You do not write on behalf of “{0}”', 'Não escreve em nome de «{0}»'],
  'Vous ne gérez pas les contacts de « {0} »': ['You do not manage the contacts of “{0}”', 'Não gere os contactos de «{0}»'],
};

/* Noms des objets et des champs que citent les erreurs normalisées (src/erreurs.js).
 *
 * Le serveur répond { error: 'introuvable', objet: 'carence' } ; l'écran
 * compose « Carence introuvable », « Deficiency not found », « Deficiência não
 * encontrada ». Pour chaque langue : le nom, et son genre là où la phrase
 * s'accorde — « requis/requise », « obrigatório/a », « encontrado/a ».
 * L'anglais n'accorde pas : son genre est omis.
 */

export const OBJETS: Readonly<Record<string, readonly [MotGenre, MotGenre, MotGenre]>> = {
  activite: [['Activité', 'f'], ['Activity'], ['Atividade', 'f']],
  aeronef: [['Aéronef', 'm'], ['Aircraft'], ['Aeronave', 'f']],
  aeroport: [['Aéroport', 'm'], ['Airport'], ['Aeroporto', 'm']],
  bigramme: [['Bigramme', 'm'], ['Two-letter code'], ['Código de duas letras', 'm']],
  carence: [['Carence', 'f'], ['Deficiency'], ['Deficiência', 'f']],
  categorie: [['Catégorie', 'f'], ['Category'], ['Categoria', 'f']],
  checklist: [['Checklist', 'f'], ['Checklist'], ['Lista de verificação', 'f']],
  comite: [['Comité', 'm'], ['Committee'], ['Comité', 'm']],
  commentaire: [['Commentaire', 'm'], ['Comment'], ['Comentário', 'm']],
  constatation: [['Constatation', 'f'], ['Finding'], ['Constatação', 'f']],
  contact: [['Contact', 'm'], ['Contact'], ['Contacto', 'm']],
  courriel: [['Courriel', 'm'], ['Email'], ['Correio eletrónico', 'm']],
  decision: [['Décision', 'f'], ['Decision'], ['Decisão', 'f']],
  depot: [['Dépôt', 'm'], ['Upload'], ['Depósito', 'm']],
  designation: [['Désignation', 'f'], ['Designation'], ['Designação', 'f']],
  destinataire: [['Destinataire', 'm'], ['Recipient'], ['Destinatário', 'm']],
  discussion: [['Discussion', 'f'], ['Discussion'], ['Discussão', 'f']],
  dossier: [['Dossier', 'm'], ['File'], ['Processo', 'm']],
  ecart: [['Écart', 'm'], ['Finding'], ['Constatação', 'f']],
  echange: [['Échange', 'm'], ['Exchange'], ['Troca', 'f']],
  element: [['Élément', 'm'], ['Item'], ['Elemento', 'm']],
  etape: [['Étape', 'f'], ['Step'], ['Etapa', 'f']],
  etat: [['État', 'm'], ['State'], ['Estado', 'm']],
  famille: [['Famille', 'f'], ['Family'], ['Família', 'f']],
  fichier: [['Fichier', 'm'], ['File'], ['Ficheiro', 'm']],
  fnc: [['FNC', 'f'], ['Non-conformity report'], ['FNC', 'f']],
  formulaire: [['Formulaire', 'm'], ['Form'], ['Formulário', 'm']],
  groupe: [['Groupe', 'm'], ['Group'], ['Grupo', 'm']],
  infraction: [['Infraction', 'f'], ['Breach'], ['Infração', 'f']],
  inspection: [['Inspection', 'f'], ['Inspection'], ['Inspeção', 'f']],
  instance: [['Instance', 'f'], ['Instance'], ['Instância', 'f']],
  intitule: [['Intitulé', 'm'], ['Title'], ['Título', 'm']],
  investigation: [['Investigation', 'f'], ['Investigation'], ['Investigação', 'f']],
  item: [['Item', 'm'], ['Item'], ['Item', 'm']],
  libelle: [['Libellé', 'm'], ['Label'], ['Designação', 'f']],
  message: [['Message', 'm'], ['Message'], ['Mensagem', 'f']],
  mesure: [['Mesure', 'f'], ['Measure'], ['Medida', 'f']],
  modele_variante: [['Modèle-variante', 'm'], ['Model-variant'], ['Modelo-variante', 'm']],
  mot_de_passe: [['Mot de passe', 'm'], ['Password'], ['Palavra-passe', 'f']],
  motif: [['Motif', 'm'], ['Reason'], ['Motivo', 'm']],
  nom: [['Nom', 'm'], ['Name'], ['Nome', 'm']],
  notification: [['Notification', 'f'], ['Notification'], ['Notificação', 'f']],
  objet: [['Objet', 'm'], ['Subject'], ['Assunto', 'm']],
  pac: [['PAC', 'm'], ['CAP'], ['PAC', 'm']],
  parametre: [['Paramètre', 'm'], ['Setting'], ['Parâmetro', 'm']],
  partage: [['Partage', 'm'], ['Share'], ['Partilha', 'f']],
  pays: [['Pays', 'm'], ['Country'], ['País', 'm']],
  piece: [['Pièce', 'f'], ['Attachment'], ['Anexo', 'm']],
  plan_valide: [['Plan validé', 'm'], ['Validated plan'], ['Plano validado', 'm']],
  portee: [['Portée', 'f'], ['Scope'], ['Âmbito', 'm']],
  prestataire: [['Prestataire', 'm'], ['Service provider'], ['Prestador', 'm']],
  preuve: [['Preuve', 'f'], ['Evidence'], ['Prova', 'f']],
  processus: [['Processus', 'm'], ['Process'], ['Processo', 'm']],
  rapport: [['Rapport', 'm'], ['Report'], ['Relatório', 'm']],
  reception: [['Réception', 'f'], ['Receipt'], ['Receção', 'f']],
  requete: [['Requête', 'f'], ['Request'], ['Pedido', 'm']],
  suivi: [['Suivi', 'm'], ['Follow-up'], ['Acompanhamento', 'm']],
  traitement: [['Traitement', 'm'], ['Processing'], ['Tratamento', 'm']],
  type: [['Type', 'm'], ['Type'], ['Tipo', 'm']],
  type_processus: [['Type de processus', 'm'], ['Process type'], ['Tipo de processo', 'm']],
  utilisateur: [['Utilisateur', 'm'], ['User'], ['Utilizador', 'm']],
  vue: [['Vue', 'f'], ['View'], ['Vista', 'f']],
};

/* États que citent les règles d'état (« statut_requis », « deja », « fige »).
 * Comme les noms d'objets : par langue, la forme masculine puis la féminine
 * quand la langue accorde — « rapport validé », « notification validée ».
 */

export const ETATS: Readonly<Record<string, readonly [MotGenre, MotGenre, MotGenre]>> = {
  accepte: [['accepté', 'acceptée'], ['accepted'], ['aceite', 'aceite']],
  accuse: [['accusé', 'accusée'], ['acknowledged'], ['confirmado', 'confirmada']],
  annule: [['annulé', 'annulée'], ['cancelled'], ['anulado', 'anulada']],
  arrete: [['arrêté', 'arrêtée'], ['stopped'], ['interrompido', 'interrompida']],
  acte: [['acté', 'actée'], ['acknowledged'], ['registado', 'registada']],
  brouillon: [['en brouillon', 'en brouillon'], ['in draft'], ['em rascunho', 'em rascunho']],
  classe: [['classé', 'classée'], ['dismissed'], ['arquivado', 'arquivada']],
  clos: [['clos', 'close'], ['closed'], ['encerrado', 'encerrada']],
  cloture: [['clôturé', 'clôturée'], ['closed'], ['encerrado', 'encerrada']],
  en_preparation: [['en préparation', 'en préparation'], ['in preparation'], ['em preparação', 'em preparação']],
  envoye: [['envoyé', 'envoyée'], ['sent'], ['enviado', 'enviada']],
  solde: [['soldé', 'soldée'], ['closed out'], ['saldado', 'saldada']],
  soumis: [['soumis', 'soumise'], ['submitted'], ['submetido', 'submetida']],
  transmis: [['transmis', 'transmise'], ['transmitted'], ['transmitido', 'transmitida']],
  valide: [['validé', 'validée'], ['validated'], ['validado', 'validada']],
};

/* Le mot qui joint deux états attendus : « arrêtée ou clôturée ». */

export const OU: readonly [string, string, string] = ['ou', 'or', 'ou'];

/* Rôles auxquels une action est réservée (erreur « reserve »). Chaque langue
 * garde sa préposition : « au validateur », « aux administrateurs ».
 */

export const ROLES: Readonly<Record<string, readonly [string, string, string]>> = {
  administrateurs: ['aux administrateurs', 'to administrators', 'aos administradores'],
  admins_gestionnaires: ['aux administrateurs et aux gestionnaires', 'to administrators and managers', 'aos administradores e gestores'],
  deposant_gestionnaire: ['au déposant et au gestionnaire', 'to the uploader and the manager', 'a quem depositou e ao gestor'],
  gestionnaire: ['au gestionnaire du module', 'to the module manager', 'ao gestor do módulo'],
  gestionnaire_portee: ['au gestionnaire du module, sur sa portée', 'to the module manager, within their scope', 'ao gestor do módulo, no seu âmbito'],
  prestataire_notifie: ['au prestataire notifié', 'to the notified provider', 'ao prestador notificado'],
  super_admin: ['au super-administrateur', 'to the super administrator', 'ao superadministrador'],
  super_admin_aac: ['au super-administrateur et à l’administrateur AAC, sur leur portée', 'to the super administrator and the CAA administrator, within their scope', 'ao superadministrador e ao administrador da AAC, no seu âmbito'],
  super_admin_regional: ['au super-administrateur régional', 'to the regional super administrator', 'ao superadministrador regional'],
  validateur: ['au validateur', 'to the approver', 'ao validador'],
  validateur_gestionnaire: ['au validateur et au gestionnaire', 'to the approver and the manager', 'ao validador e ao gestor'],
  vue_aac: ['à la vue AAC', 'to the CAA view', 'à vista AAC'],
  vue_prestataire: ['à la vue Prestataire', 'to the Provider view', 'à vista Prestador'],
};

/* Gabarits des erreurs normalisées : pour chaque code, la phrase de chaque
 * langue, au masculin et au féminin quand la langue accorde. {objet} reçoit le
 * nom ; placé au milieu de la phrase, il y perd sa majuscule
 * (« Unknown view »). Une précision reçue du serveur se joint entre
 * parenthèses : « Écart hors de votre périmètre (Togo) ». */

export const GABARITS: Readonly<Record<string, readonly Gabarit[]>> = {
  introuvable: [
    { m: '{objet} introuvable', f: '{objet} introuvable' },
    { m: '{objet} not found', f: '{objet} not found' },
    { m: '{objet} não encontrado', f: '{objet} não encontrada' },
  ],
  requis: [
    { m: '{objet} requis', f: '{objet} requise' },
    { m: '{objet} required', f: '{objet} required' },
    { m: '{objet} obrigatório', f: '{objet} obrigatória' },
  ],
  inconnu: [
    { m: '{objet} inconnu', f: '{objet} inconnue' },
    { m: 'Unknown {objet}', f: 'Unknown {objet}' },
    { m: '{objet} desconhecido', f: '{objet} desconhecida' },
  ],
  existant: [
    { m: '{objet} déjà existant', f: '{objet} déjà existante' },
    { m: '{objet} already exists', f: '{objet} already exists' },
    { m: '{objet} já existente', f: '{objet} já existente' },
  ],
  hors_perimetre: [
    { m: '{objet} hors de votre périmètre', f: '{objet} hors de votre périmètre' },
    { m: '{objet} outside your scope', f: '{objet} outside your scope' },
    { m: '{objet} fora do seu âmbito', f: '{objet} fora do seu âmbito' },
  ],
  statut_requis: [
    { m: 'Action possible seulement sur un {objet} {etat}', f: 'Action possible seulement sur une {objet} {etat}' },
    { m: 'Only possible when the {objet} is {etat}', f: 'Only possible when the {objet} is {etat}' },
    { m: 'Ação possível apenas quando o {objet} está {etat}', f: 'Ação possível apenas quando a {objet} está {etat}' },
  ],
  deja: [
    { m: '{objet} déjà {etat}', f: '{objet} déjà {etat}' },
    { m: '{objet} already {etat}', f: '{objet} already {etat}' },
    { m: '{objet} já {etat}', f: '{objet} já {etat}' },
  ],
  fige: [
    { m: '{objet} {etat} : modification impossible', f: '{objet} {etat} : modification impossible' },
    { m: '{objet} {etat}: no further changes', f: '{objet} {etat}: no further changes' },
    { m: '{objet} {etat}: alteração impossível', f: '{objet} {etat}: alteração impossível' },
  ],
  en_usage: [
    {
      m: '{objet} utilisé {n} fois : suppression impossible',
      f: '{objet} utilisée {n} fois : suppression impossible',
      desactivableM: ' — désactivez-le plutôt',
      desactivableF: ' — désactivez-la plutôt',
    },
    {
      m: '{objet} used {n} time(s): cannot be deleted',
      f: '{objet} used {n} time(s): cannot be deleted',
      desactivableM: ' — deactivate it instead',
      desactivableF: ' — deactivate it instead',
    },
    {
      m: '{objet} utilizado {n} vez(es): eliminação impossível',
      f: '{objet} utilizada {n} vez(es): eliminação impossível',
      desactivableM: ' — desative-o em vez disso',
      desactivableF: ' — desative-a em vez disso',
    },
  ],
};
