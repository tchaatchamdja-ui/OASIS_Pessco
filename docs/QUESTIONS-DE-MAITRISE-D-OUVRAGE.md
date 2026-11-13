# Questions de maîtrise d'ouvrage

*Registre ouvert le 13 novembre 2026.*

Ce registre porte les questions que la **mesure** a fait apparaître et que le
code ne peut pas trancher. Chacune dit ce qui a été mesuré, où, et quelle
décision est demandée — jamais laquelle prendre.

Il existe pour la même raison que le garde des pages sans chemin
(`tests/smoke/surv.smoke.js`, `PAGES_SANS_CHEMIN`) : *nommer sans décider*. Une
question laissée dans un commentaire se perd ; une question qu'un agent tranche
au passage est une décision prise par personne.

Une entrée se ferme par une décision écrite, non par une correction silencieuse.

---

## Q-01 — Deux exigences réglementaires désignent des secteurs qui n'existent pas

**Statut :** ouverte · **mesurée le** 12 novembre 2026, confirmée le 13.

### Ce qui est mesuré

Le référentiel porte **huit** secteurs : `AMO, CAMO, CAT, STA, ATO, MED, ANP,
ADM`. Il porte **deux** exigences, et chacune nomme un secteur absent de ces
huit :

| Référence | `secteur_id` déclaré | `domaine_id` | Secteur existant ? |
|---|---|---|---|
| `RAB-OPS 1.037` | `OPS-TAC` | `OPS` | **non** |
| `RAB-145.A.30` | `AIR-OMA` | `AIR` | **non** |

Mesuré dans les **deux** magasins — `data/referentiels.json` (exploitation) et
`tests/fixtures/referentiels.json` (jeu d'essai des suites). Les deux exigences
sont `statut: actif`.

### Pourquoi cela se voit, et où

Tout écran qui propose des exigences **par secteur** en propose zéro :

* le sélecteur de dispositions réglementaires du paramétrage des checklists ;
* la liste des exigences du formulaire de constatation
  (`_execExigencesDuSecteur`, `exec-dossier-actions.js`).

Un défaut de code y concourait et a été corrigé le 12 novembre 2026 (ADR-003,
n° 5.f.84) : trois appels comparaient un **identifiant** à un **code** sans
accepter l'autre, et `execClesDePortee` accepte désormais les deux. *La
correction est faite et éprouvée ; la liste reste vide pour une seconde raison,
qui est celle-ci.* C'est pourquoi cette entrée existe : une correction de code
qui ne change rien à l'écran laisse croire que le code est encore en cause.

### Pourquoi aucun contrôle ne le dit

Le détecteur d'orphelins (`src/referentiels.js`, `CHILDREN`) **exclut les
exigences, délibérément** : son commentaire le dit — « les exigences et
prestataires ne sont pas touchés ». L'exclusion est juste pour la
**suppression** en cascade : effacer un secteur ne doit pas emporter les
exigences réglementaires qui s'y rattachent. Mais elle vaut aussi pour le
**comptage**, et le comptage est muet.

*Ne pas supprimer et ne pas voir sont deux décisions ; une seule a été prise.*

### La décision demandée

Trois issues, et le choix n'appartient pas au code :

1. **Les deux exigences sont à rattacher** à l'un des huit secteurs — alors
   lesquels ? `OPS-TAC` et `AIR-OMA` ressemblent à une nomenclature antérieure,
   et personne ici ne peut dire à quoi elle correspond aujourd'hui.
2. **Les deux secteurs manquent au référentiel** et sont à créer — alors sous
   quels domaines, et avec quel libellé officiel ?
3. **Les deux exigences sont périmées** et passent à `statut: inactif`, ou
   sortent du référentiel.

Et, quelle que soit l'issue : **le détecteur d'orphelins doit-il compter les
exigences sans les supprimer ?** C'est la correction qui empêcherait la
prochaine de passer inaperçue, et elle est indépendante des trois autres.

---

## Q-02 — Deux boîtes du navigateur subsistent hors du module SURV

**Statut :** ouverte · **mesurée le** 13 novembre 2026.

### Ce qui est mesuré

Deux appels aux boîtes natives du navigateur restent dans le dépôt :

| Fichier | Geste |
|---|---|
| `public/modules/ramp/js/ramp-pac.js:539` | `window.confirm('Retirer ce suivi ?')` |
| `frontend/portail/instances.ts:213` | `window.prompt('Nom de la nouvelle instance (l’État) :')` |

Le module SURV n'en porte plus aucune : la dernière, le motif d'un renvoi en
correction, est passée par `oasisSaisir` le 13 novembre 2026 (ADR-003,
n° 5.f.86).

### Ce que cela coûte, mesuré

Une boîte native n'est **ni traduite, ni aux couleurs de l'application**, et
surtout elle est **hors de portée d'une suite** : le navigateur l'ouvre hors de
la page. La contre-épreuve du 13 novembre le dit sans ambiguïté — `window.prompt`
remis en place, la ronde du circuit ne rougit pas sur une assertion, elle
**meurt** : « Runtime.callFunctionOn timed out », cinq minutes d'attente, aucun
contrôle rendu. *Un geste qui bloque la page ne se mesure pas mal : il ne se
mesure pas.*

Ces deux gestes-là sont donc, aujourd'hui, inéprouvables.

### La décision demandée

Les deux appartiennent à des écrans qui ne sont pas celui-ci — RAMP et le
portail. **Les convertir au passage serait une modification non demandée dans
un écran dont ce tour ne répond pas.** La question est donc de les inscrire au
chantier de leur écran, ou de les tenir pour acceptables là où ils sont.

Le remplacement est connu et sans surprise : `oasisConfirmer` pour l'un,
`oasisSaisir` pour l'autre, tous deux déjà employés partout ailleurs.

---

## Clos — Q-00 : « `GET /constatations` rend une liste vide »

**Statut :** **retirée le 13 novembre 2026 — la mesure était fausse.**

Un commentaire de `tests/smoke/surv-coquille.smoke.js` annonçait un défaut : la
route rendrait une liste vide quand le magasin du module en porte quatre.

Les quatre sont dans `data/execution.json` — le magasin de **développement**.
**Une suite ne tourne jamais dessus** : le harnais copie `tests/fixtures/` dans
un bac neuf à chaque passage (`copierDonnees`, `tests/smoke/harness.js`), et
`tests/fixtures/execution.json` porte **zéro** constatation. La route rendait
donc exactement ce que son bac contenait.

*On ne lit pas l'état d'un serveur dans un fichier qu'il ne sert pas.*

L'entrée est conservée plutôt qu'effacée : elle dit où la mesure a dérapé, et
elle empêche de rouvrir la question. Le relevé est devenu un **contrôle** —
« le bac n'en porte aucune, et la ronde pose les deux qu'il faut » —, de sorte
que le jour où le jeu d'essai en portera, il le dira.
