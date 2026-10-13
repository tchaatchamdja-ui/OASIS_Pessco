// OASIS — Les libellés français littéraux (ADR-003, 5.e.0).
//
// Première pièce d'`app.js`, et le nom le plus **emprunté** du portail : cinq
// modules convertis en 5.d lisent `window.tr` faute de pouvoir l'atteindre
// autrement. Sa table était un `const` du premier niveau — une globale
// lexicale —, et c'est elle, non l'interface, qui bloquait la conversion. Pour
// la sixième fois.
//
// ── Deux mécanismes de traduction, et pourquoi ils restent deux ──
//
// `traductions.fr.ts` traduit des **clés** (`cfg_save`, `aucun_logo`) ;
// celui-ci traduit des **libellés français littéraux** (`'Sigle'`,
// `"Date d'adoption"`), qui sont à la fois la clé et la valeur française.
//
// Les réunir serait une amélioration, et donc un changement : il faudrait
// inventer une clé pour chacun des soixante-cinq libellés et réécrire tous leurs
// appels. Six étapes se sont interdit cela — convertir sans changer. Le
// rapprochement est un chantier à part, et le dire ici évite qu'on le croie fait.
//
// ── Ce qui a changé, et c'est le typage seul ──
//
// `CFG_I18N[fr]` rendait `undefined` sur une clé absente, et le code le traitait
// déjà (`if (!e) return fr`). Le type le dit maintenant, et le traitement n'a pas
// bougé d'un caractère.
import { langueRetenue } from './traductions';

// `tr` n'est plus publié sur `window` depuis la dépose du pont (5.e.5) : les
// dix modules qui l'appellent l'importent d'ici. Le prêt de 5.e.0 est rendu, et
// la déclaration part avec la publication — un `interface Window` qui nomme un
// nom que rien ne pose est une affirmation fausse sur le monde.

/**
 * Les libellés de l'écran de configuration : sections, tables et colonnes.
 * `fr → [en, pt]`, repris mot pour mot d'`app.js`.
 */
export const CFG_I18N: Readonly<Record<string, readonly [string, string]>> = {
  // Titres de sections / tables
  'Niveaux hiérarchiques': ['Hierarchical levels', 'Níveis hierárquicos'],
  'Entités organisationnelles': ['Organisational entities', 'Entidades organizacionais'],
  'Domaines': ['Domains', 'Domínios'],
  'Secteurs': ['Sectors', 'Setores'],
  'Sous-activités': ['Sub-activities', 'Subatividades'],
  'Thèmes de supervision': ['Oversight themes', 'Temas de supervisão'],
  'Liste des exigences': ['Requirements list', 'Lista de requisitos'],
  'Prestataires de services': ['Service providers', 'Prestadores de serviços'],
  "Liste du personnel de l'Administration": ['Administration staff list', 'Lista do pessoal da Administração'],
  'Types de supervision': ['Oversight types', 'Tipos de supervisão'],
  'Modes de supervision': ['Oversight modes', 'Modos de supervisão'],
  'Niveaux de qualification': ['Qualification levels', 'Níveis de qualificação'],
  "Spécialités d'inspecteur": ['Inspector specialities', 'Especialidades de inspetor'],
  "Détails sur l'Administration": ['Administration details', 'Detalhes da Administração'],
  'Organigramme': ['Org chart', 'Organograma'],
  'Domaines / Secteurs / Sous-activités / Thèmes': ['Domains / Sectors / Sub-activities / Themes', 'Domínios / Setores / Subatividades / Temas'],
  'Thèmes non rattachés': ['Unlinked themes', 'Temas não associados'],
  // Colonnes / champs
  'Type de niveau': ['Level type', 'Tipo de nível'],
  'Ordre': ['Order', 'Ordem'],
  'Niveau': ['Level', 'Nível'],
  'Sigle': ['Acronym', 'Sigla'],
  'Libellé': ['Label', 'Rótulo'],
  'Poste': ['Position', 'Cargo'],
  'Titulaire': ['Holder', 'Titular'],
  'Intérimaire': ['Deputy', 'Substituto'],
  'Rattachement': ['Parent', 'Vínculo'],
  'Code': ['Code', 'Código'],
  'Nom': ['Name', 'Nome'],
  'Prénoms': ['First names', 'Nomes próprios'],
  'Prénom': ['First name', 'Nome próprio'],
  'Description': ['Description', 'Descrição'],
  'Statut': ['Status', 'Estado'],
  'Domaine': ['Domain', 'Domínio'],
  'Cycle (mois)': ['Cycle (months)', 'Ciclo (meses)'],
  'Secteur': ['Sector', 'Setor'],
  'Sous-activité': ['Sub-activity', 'Subatividade'],
  'Référence': ['Reference', 'Referência'],
  'Règlement': ['Regulation', 'Regulamento'],
  "Date d'adoption": ['Adoption date', 'Data de adoção'],
  'Sans règlement': ['No regulation', 'Sem regulamento'],
  'Thème': ['Theme', 'Tema'],
  'Moyen de contrôle': ['Control means', 'Meio de controlo'],
  'Trigramme': ['Trigram', 'Trigrama'],
  'Dirigeant': ['Manager', 'Dirigente'],
  'Point focal': ['Focal point', 'Ponto focal'],
  'Email': ['Email', 'Email'],
  'Réf. agrément': ['Approval ref.', 'Ref. aprovação'],
  'Réf Personnel': ['Staff ref.', 'Ref. pessoal'],
  'Inspecteur ?': ['Inspector?', 'Inspetor?'],
  'N° inspecteur': ['Inspector no.', 'N.º inspetor'],
  // `'Domaines'` n'est **pas** répété ici : la table d'origine le portait deux
  // fois — une fois en titre de section, une fois en colonne —, avec la **même**
  // valeur. Un littéral d'objet JavaScript garde la dernière ; le compilateur,
  // lui, refuse le doublon, et c'est lui qui l'a trouvé. Les deux valeurs étant
  // identiques, le retrait ne change rien — et le comparateur le prouve : il
  // relève les clés de la table d'origine, où le doublon est déjà effondré.
  'Spécialités': ['Specialities', 'Especialidades'],
  'Niveau de qualification': ['Qualification level', 'Nível de qualificação'],
  'Type': ['Type', 'Tipo'],
  'Durée standard (j)': ['Standard duration (d)', 'Duração padrão (d)'],
  'Mode': ['Mode', 'Modo'],
  'Spécialité': ['Speciality', 'Especialidade'],
  // Lignes du tableau « Détails sur l'Administration »
  'Nom complet': ['Full name', 'Nome completo'],
  'Bigramme': ['Bigram', 'Bigrama'],
  'État': ['State', 'Estado'],
  'Ville': ['City', 'Cidade'],
  'Adresse 1': ['Address 1', 'Endereço 1'],
  'Adresse 2': ['Address 2', 'Endereço 2'],
  'Email administrateur': ['Admin email', 'Email do administrador'],
  'Langue par défaut': ['Default language', 'Idioma predefinido'],
  'Accès aux Modules': ['Module access', 'Acesso aos módulos'],
};

/**
 * Le libellé dans la langue de l'écran, ou le français tel quel.
 *
 * La langue est lue sur `window` — c'est `applyLang` qui la tient à jour, et
 * `langueRetenue()` ne suivrait pas une bascule faite par le sas des libellés.
 * Le repli sur `langueRetenue()` sert les pages qui ne posent pas la globale.
 */
export function tr(fr: string): string {
  const e = CFG_I18N[fr];
  if (!e) return fr;
  const langue = window.CURRENT_LANG ?? langueRetenue();
  return langue === 'en' ? e[0] : langue === 'pt' ? e[1] : fr;
}
