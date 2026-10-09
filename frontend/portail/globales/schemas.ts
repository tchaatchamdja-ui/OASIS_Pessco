// OASIS — Les schémas des référentiels, posés en globales (ADR-003, 5.d).
//
// Sas, construit vers `public/app/schemas.js`, et **chargé avant `app.js`** :
// les deux fichiers du portail restés en JavaScript appellent ces onze noms en
// identifiants nus, et les trouvent déjà posés.
//
// ── Pourquoi un sas, et non un import ──
//
// `app-config.js` est un script classique de 1 443 lignes. Il ne peut pas
// importer : il lit ses dépendances dans la portée globale. Le sas est donc la
// seule façon de lui donner un module — c'est la recette de cohabitation qui a
// servi pour le socle, l'état, les icônes et les traductions.
//
// ── Ce qui doit rester vrai ──
//
// `app-config.js` **ne doit plus déclarer** aucun de ces noms. Un
// `const REF_SCHEMAS` réintroduit là-bas serait une globale **lexicale** : elle
// masquerait la propriété de `window` pour tout ce fichier, et les deux
// versions des schémas coexisteraient — l'une lue par les tables, l'autre par
// les fenêtres, sans une erreur. C'est le mode de défaillance que 5.b a
// documenté, et le garde-fou de la suite « taille » le refuse.
import {
  REF_SCHEMAS, STATUT_FIELD, VISIBILITE_FIELD, champsVisibles, domaineOptions,
  fieldValue, instanceOptions, personnelName, personnelOptions, refLabel,
  secteurOptions,
} from '../schemas';
import type { Champ, Enregistrement, Option, Schema } from '../schemas';

declare global {
  interface Window {
    /** Les onze référentiels du portail, et leurs champs. */
    REF_SCHEMAS: Record<string, Schema>;
    /** Le champ « Statut », partagé par neuf schémas. */
    STATUT_FIELD: Champ;
    /** Le champ « Visible par les instances », porté par la taxinomie. */
    VISIBILITE_FIELD: Champ;
    /** Champs d'un schéma que le compte courant doit voir. */
    champsVisibles: (schema: Schema) => Champ[];
    /** La valeur d'un champ, en balisage, telle qu'une table l'affiche. */
    fieldValue: (field: Champ, record: Enregistrement) => string;
    /** Le libellé d'un enregistrement désigné par son identifiant. */
    refLabel: (coll: string, id: unknown, field: string) => string;
    /** Options des domaines, des secteurs, du personnel, des instances. */
    domaineOptions: () => Option[];
    secteurOptions: () => Option[];
    personnelOptions: () => Option[];
    instanceOptions: () => Option[];
    /** Le nom d'une personne du répertoire. */
    personnelName: (id: unknown) => string;
  }
}

window.REF_SCHEMAS = REF_SCHEMAS;
window.STATUT_FIELD = STATUT_FIELD;
window.VISIBILITE_FIELD = VISIBILITE_FIELD;
window.champsVisibles = champsVisibles;
window.fieldValue = fieldValue;
window.refLabel = refLabel;
window.domaineOptions = domaineOptions;
window.secteurOptions = secteurOptions;
window.personnelOptions = personnelOptions;
window.instanceOptions = instanceOptions;
window.personnelName = personnelName;
