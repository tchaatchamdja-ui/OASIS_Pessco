# Le magasin PostgreSQL — état, et ce qui reste

*ARCH-01 de l'audit du 24 septembre 2026. La décision, elle, est portée par
[ADR-001](ADR-001-magasin-de-donnees.md) : ce document dit l'état du chantier,
l'ADR dit ce qu'on en fait et pourquoi.*

Depuis l'origine, `src/store.js` porte en tête : « Production : remplacée par
PostgreSQL 16 ». L'application sert aujourd'hui six modules sur des fichiers
JSON. Ce document dit ce qui est fait, ce qui ne l'est pas, et pourquoi.

## Ce qui est fait

**Le magasin PostgreSQL existe et tient le contrat** (`src/store_pg.js`).

Deux tables, et pas une de plus :

| Table | Rôle |
|---|---|
| `collections (nom, valeur JSON, rev, maj)` | Une collection sous son nom. `load` la lit, `save` la remplace, `modifier` la modifie sans perdre l'écriture d'un autre. |
| `journal (nom, ordre BIGSERIAL, entree JSON)` | Une entrée d'audit par ligne, insérée, jamais réécrite. |

`JSON` et non `JSONB` : la raison est plus bas, et elle a coûté les six chaînes
d'audit à la première épreuve contre un vrai serveur.

Ce que des fichiers ne peuvent pas donner, et que la base donne :

- **Écriture atomique** sans fichier temporaire ni renommage ;
- **accès concurrent** — mais seulement par `modifier`, et non par `save` : la
  base rend atomique l'écriture, pas le lire-modifier-réécrire. Voir plus bas ;
- **sauvegarde à chaud** et **réplication logique** vers le serveur central
  UEMOA, qui est la raison d'être du choix ;
- pour le journal d'audit, **la dernière entrée sans tout relire** —
  `ORDER BY ordre DESC LIMIT 1` là où le fichier en lignes relit l'ensemble.

**La reprise des données existe et a été jouée** (`scripts/migrer-pg.js`) :

```bash
DATABASE_URL=postgres://… node scripts/migrer-pg.js --verifier
```

Sur les données réelles : **14 collections et 3 203 entrées de journal**
reprises, relues et comparées au fichier sans écart ; rejouée, elle n'ajoute
rien. Rien n'est transformé — empreintes du journal comprises — et **la chaîne
SHA-256 se vérifie après la reprise comme avant**.

**Six contrôles** (suite « unitaires ») éprouvent les deux magasins sur les
mêmes gestes, et **douze de plus** (suite « magasin-pg ») éprouvent celui-ci
contre un vrai serveur — ce que les six premiers ne pouvaient pas faire.

## Ce qui n'est pas fait, et pourquoi

**La bascule.** `DATABASE_URL` posé, l'application continue d'écrire dans des
fichiers.

La raison n'est pas le magasin, elle est au-dessus : **`store.load()` et
`store.save()` sont synchrones**, et aucun client PostgreSQL ne l'est. Rendre
le magasin asynchrone rend asynchrone tout ce qui l'appelle.

L'ampleur, mesurée :

| | |
|---|---|
| Appels directs à `store.load` / `store.save` | **69** |
| Appels aux magasins de module (`db.list`, `db.get`, `db.save`…) | **381** |
| Gestionnaires de route déjà asynchrones | **5 sur 386** |

Ce n'est donc pas une conversion mécanique : 381 gestionnaires et les fonctions
internes des cinq magasins de module changeraient de nature.

### Trois chemins, et ce qu'ils coûtent

**1. Porter l'application en asynchrone.** Le chemin droit, et le seul qui
donne une durabilité honnête : une écriture confirmée à l'agent est une
écriture dans la base. Coût : tout le code de routes, en une fois — un `await`
oublié rend une promesse là où un tableau est attendu, sans erreur. À faire
module par module, chacun derrière sa suite de fumée.

**2. Lire en mémoire, écrire derrière.** Les lectures viennent d'un instantané
tenu en mémoire, les écritures partent vers la base en file. Rien ne change
dans les routes. Mais une réponse « enregistré » précède l'écriture réelle :
sur des actes de surveillance et des mesures d'application, dire qu'on a
enregistré ce qu'on n'a pas encore écrit n'est pas acceptable — sauf à ajouter
une file persistante et une reprise, c'est-à-dire la complexité qu'on voulait
éviter.

**3. Rester sur les fichiers.** Défendable tant qu'une instance sert une AAC
depuis un seul processus, ce qui est le cas. Le journal d'audit est déjà en
ajout seul (PERF-01), et le coût d'écriture ne croît plus. Ce qui manque
demeure : la concurrence entre processus, et la réplication vers l'UEMOA.

## La première collection est passée — ce qu'elle a coûté

*28 septembre 2026. `ramp_aeronefs`, la nomenclature des aéronefs.*

Choisie pour être **la plus isolée qui soit encore gardée** : son propre
fichier, un seul module, aucun service publié sur le bus, et une quinzaine de
contrôles qui l'exercent de bout en bout. Deux collections paraissaient plus
isolées encore, et perdent toutes deux pour des raisons qui valent d'être
dites :

| Candidate | Pourquoi elle perd |
|---|---|
| `mfa_challenges` | Deux appels, un seul fichier — la plus isolée de toutes. Mais **aucun contrôle ne l'exerce** : la MFA est désactivée dans la configuration d'essai. Convertir sans filet n'apprend rien. |
| `profil_risque` | Un seul fichier de magasin, 23 contrôles. Mais le module **publie `PR.riskProfiles`** sur le bus de services, que PLAN appelle de façon synchrone. Rendre PR asynchrone rendrait PLAN asynchrone : **le bus propage l'asynchronisme**, et la conversion aurait entraîné deux modules au lieu d'un. |

Le second constat est le plus important pour la suite : **l'unité de conversion
n'est pas le module, c'est la grappe qu'un service publié rend solidaire.**

### Le coût, mesuré

| | |
|---|---|
| Fonctions de magasin converties | **8** |
| Routes converties | **7** — six de nomenclature, plus le contexte de la fiche POI |
| Fichiers touchés | **9**, dont 4 qui ne parlent pas d'aéronefs |
| Lignes | **+213 / −109** |
| Contrôles qui la gardent, inchangés | **299** (suite « ramp »), verts sur fichiers **et** en base |

Les quatre fichiers « qui ne parlent pas d'aéronefs » sont le prix réel : le
chargeur de modules, le démarrage du serveur, et trois modules sans rapport dont
il a fallu envelopper les gestionnaires asynchrones. **Une collection isolée
n'a pas de conversion isolée.**

### Trois choses apprises, et qui serviront aux quatorze suivantes

**1. L'amorçage remonte jusqu'au démarrage.** `seedAeronefs` devient
asynchrone, donc `seed()` du module, donc `seedAll` du chargeur, donc le
démarrage lui-même. Le serveur **attend** désormais l'amorçage avant d'écouter :
servir une route dont la nomenclature n'est pas encore posée rendrait une liste
vide, et l'écran la croirait.

**2. « Vérifier puis écrire » cesse d'être sûr.** Trois routes le faisaient —
refus d'un doublon, bascule d'activité, refus d'une suppression. Entre la
vérification et l'écriture, une autre requête s'intercale désormais. Les trois
passent leur vérification **dans** la transformation de `modifier`. Rien dans le
langage ne le signale : le code traduit mécaniquement compile, répond juste, et
perd une écriture sur mille.

**3. Express 4 ne regarde pas la promesse d'un gestionnaire `async`.** Un rejet
ne mène nulle part : pas d'erreur 500, pas de trace, **la requête reste
ouverte**. Six gestionnaires l'étaient déjà, sans enveloppe — le cas était rare,
il allait devenir la règle. `src/route.js` les enveloppe, et un contrôle de
forme impose l'enveloppe à tout nouveau.

### Ce que les contrôles disent, et ce qu'ils ne diraient pas

Les 299 contrôles de RAMP passent dans les deux régimes. **Cela seul ne prouve
rien** : une façade qui retomberait silencieusement sur les fichiers les
passerait aussi. La preuve est dans la base — `ramp_aeronefs` seule y figure,
9 550 appareils, `rev = 5` : l'amorçage **et** les quatre écritures de la suite
y sont allés. Les quatorze autres collections sont restées sur fichiers.

Et un contrôle de forme ferme la porte derrière : **aucune collection migrée ne
peut plus être lue par `store`**. Un appel synchrone oublié lirait le fichier
figé au dernier jour des fichiers — sans erreur, avec une liste plausible et
périmée.

---

### Décidé le 28 septembre 2026 : le chemin 1, et en tête de tout

Le jalon n° 7 d'[ADR-002](ADR-002-migration-spring-boot.md) tranche : **le
magasin bascule avant les modules**, par le chemin 1, module par module, chacun
derrière sa suite de fumée.

Deux précisions que la mesure impose au chemin 1, et qui ne figuraient pas dans
sa description ci-dessus :

1. **Chaque appel qui lit pour réécrire devient un `modifier`**, non un `load`
   suivi d'un `save`. Traduire mécaniquement en `await` introduirait des pertes
   d'écriture là où il n'y en avait pas.
2. La conversion se fait **module par module**, et un module converti ne peut
   pas partager une collection avec un module qui ne l'est pas : l'un écrirait
   en base, l'autre dans un fichier. L'ordre de conversion suit donc les
   collections, non les écrans.

## La base a été éprouvée pour de bon — et elle a tout cassé

*28 septembre 2026, PostgreSQL 16.15, sur une copie des données réelles.*

Les six contrôles de contrat employaient une base de papier : une `Map` qui rend
ce qu'on lui écrit. Elle dit le contrat et le SQL, non le serveur. Le code
n'avait jamais tourné contre un vrai PostgreSQL. Il l'a fait. **Deux défauts en
sont sortis, et la base de papier les avait couverts tous les deux — parce
qu'elle était plus fidèle que le vrai serveur.**

### 1. `jsonb` réordonne les clés, et rompt les six chaînes d'audit

`jsonb` range les clés d'un objet par longueur puis par octets. Rien n'est
perdu ; rien ne revient dans l'ordre écrit. Or le sceau d'une entrée d'audit
couvre `JSON.stringify(details)` : changer l'ordre du texte change l'empreinte.

Première reprise, avec le schéma d'origine :

| Chaîne | Sur fichiers | Après un aller-retour en `jsonb` |
|---|---|---|
| socle (`audit`) | intacte, 1 667 | **rompue à la 29ᵉ** |
| PLAN | intacte, 337 | **rompue à la 1ʳᵉ** |
| SURV | intacte, 812 | **rompue à la 1ʳᵉ** |
| SAFA | intacte, 275 | **rompue à la 1ʳᵉ** |
| RAMP | intacte, 37 | **rompue à la 1ʳᵉ** |
| CARE | intacte, 121 | **rompue à la 1ʳᵉ** |

Les quinze collections revenaient elles aussi différentes — même longueur, ordre
autre.

La 29ᵉ mérite un mot : les vingt-huit premières entrées du socle portaient des
`details` dont l'ordre survivait par chance. **Un petit échantillon serait
passé.** Il a fallu les données réelles pour que le défaut se montre.

**Corrigé** : les deux colonnes sont en `json`, qui conserve le texte donné.
Coût : l'indexation GIN et les opérateurs de `jsonb`, dont aucun n'est employé
ici — on lit une collection par son nom, jamais dans son contenu. Après quoi :
**15 collections et 3 249 entrées reprises, les six chaînes intactes**.

### 2. La base ne règle pas la concurrence — le portage la reconduit

C'était pourtant la raison du choix. Deux agents lisent une collection, y
ajoutent chacun une ligne, la réécrivent : **une des deux disparaît, en base
exactement comme sur fichier.** PostgreSQL rend l'*écriture* atomique ; il ne
rend pas atomique le *lire-modifier-réécrire*, et c'est ce geste-là que font
presque tous les appels du socle.

Et la mesure en dit une de plus, qui n'était écrite nulle part : **si ce geste
est sûr aujourd'hui, c'est parce que `load` et `save` sont synchrones.** Node ne
rend la main qu'aux `await`, et il n'y en a pas entre les deux. Rendre le
magasin asynchrone détruit cette garantie — *avant même qu'un second processus
existe*. La conversion n'est donc pas seulement un coût : c'est une régression
de correction, à traiter comme telle.

**Ajouté** : `modifier(nom, defaut, transformer)` — lire, transformer, n'écrire
que si `rev` n'a pas bougé, recommencer sinon, refuser après vingt essais plutôt
qu'écraser. Cinquante écritures concurrentes, aucune perdue. C'est lui, et non
`save`, que la conversion devra employer partout où un appel lit pour réécrire.

Le journal, lui, n'avait rien à perdre : il est en ajout seul, et 100 insertions
concurrentes donnent 100 lignes.

### La suite qui garde tout cela

`tests/smoke/magasin-pg.smoke.js` — **12 contrôles**, dont deux contre-épreuves
qui les empêchent d'être vides : la même chaîne rangée en `jsonb` doit se
rompre, et `save` concurrent doit bien perdre une écriture. Sans elles, les
contrôles passeraient aussi sur une base où rien ne se serait jamais croisé.

```bash
docker run -d --name oasis-pg -e POSTGRES_PASSWORD=essai -p 5433:5432 postgres:16
OASIS_PG_ESSAI='postgres://postgres:essai@localhost:5433/postgres' npm run smoke -- magasin-pg
```

Sans `OASIS_PG_ESSAI`, trois contrôles lisent le schéma et les huit autres se
déclarent **hors de portée** — jamais tus. La variable est distincte de
`DATABASE_URL` à dessein : cette suite écrit, et un `DATABASE_URL` posé pour
autre chose ne doit pas la diriger sur une base qui compte. Tout se passe dans
un schéma `oasis_essai`, créé puis détruit.

Pour reprendre un jeu de données complet :

```bash
DATABASE_URL='postgres://…' OASIS_DATA_DIR=/chemin/vers/data node scripts/migrer-pg.js --verifier
```
