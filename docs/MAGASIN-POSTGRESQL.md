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

## Deuxième collection : `emails`, le registre des envois

*29 septembre 2026. Cinq fichiers, une propagation qui s'arrête à un appelant.*

Choisie parce que `queue()` **rendait déjà une promesse** : la propagation ne
franchit donc pas ses cinq appelants, et une seule route du socle — `/api/emails`
— a dû être reprise. Et parce que son écriture est le cas d'école du geste que
`modifier` existe pour tenir : **l'identifiant dérive de la longueur du
registre**. Deux envois simultanés liraient la même liste, y pousseraient chacun
une ligne portant le même `id`, et l'un des deux disparaîtrait — dans le registre
même qui doit dire ce qui est parti.

Mesuré, sur les fichiers comme en base : trois envois lancés ensemble, **trois
entrées, trois identifiants distincts**. Avec `load` puis `save` à la place du
`modifier` : **une seule entrée**.

### Deux garde-fous ont fait leur travail

Le contrôle « aucune collection passée en base n'est encore lue par `store` » a
trouvé un appel que rien d'autre n'aurait signalé : `src/migration_ramp.js`
reprend l'origine des courriels sortis du module, au démarrage. Il lisait le
fichier — qui serait resté figé au dernier jour des fichiers, sans la moindre
erreur. La reprise passe désormais par la façade, dans une transformation
atomique, et le serveur l'attend avant d'écouter.

### Et un contrôle à moi qui passait pour la mauvaise raison

Le contrôle des trois envois concurrents **passait avant même que `modifier`
existe**. Cause : un Mailpit écoutait sur le port 1025 du poste. `sendMail`
étant alors joignable, les trois envois s'espaçaient sur le réseau et leurs
inscriptions au registre ne se croisaient plus.

L'épreuve force donc désormais une configuration sans hôte SMTP, où
l'inscription au registre est le **seul** temps asynchrone. Après quoi la
contre-épreuve mord : une entrée au lieu de trois. C'est la troisième fois que
ce chantier produit un vert qui ne prouvait rien — base de papier, journal vide,
messagerie joignable — et la leçon ne change pas : **un contrôle qui n'a jamais
échoué n'a pas encore été éprouvé.**

## Troisième et quatrième : les journaux d'audit

*29 septembre 2026. `audit` et `module_audit` — la plus grosse conversion du
chantier, et la plus haute en enjeu.*

64 inscriptions dans 12 fichiers, 21 fichiers touchés, **+874 / −366 lignes**.
Le retour de `audit.log` n'était utilisé nulle part : les 64 appels étaient tous
en pose-et-oublie, ce qui a rendu la conversion mécanique — mais pas anodine.

### Le vrai risque n'était pas l'ajout, c'était le chaînage

Ajouter est sans danger : cent insertions concurrentes donnent cent lignes, des
deux côtés. **Inscrire une entrée chaînée ne l'est pas** : c'est lire la
dernière, en dériver l'empreinte, puis ajouter. Deux inscriptions concurrentes
qui lisent la même dernière entrée en posent deux prétendant le même
prédécesseur — et *une chaîne forchée ne se répare pas*, une entrée inscrite ne
se réécrivant jamais.

Ce geste était sûr sur fichiers pour la raison qu'on connaît maintenant : `log`
n'avait aucun `await`. Il l'est de nouveau, explicitement :

| | chaînage atomique | geste naïf |
|---|---|---|
| **Fichiers** — file d'attente par journal | 20 entrées, chaîne intacte | 20 entrées, **chaîne rompue**, sans bruit |
| **Base** — index unique `(nom, cle, rang)` | 20 entrées, chaîne intacte | 1 entrée, chaîne intacte, **19 refus** |

### La garantie est dans le schéma, non dans le code

Le premier essai posait la condition « le bout de la chaîne n'a pas bougé » dans
le `WHERE` de l'insertion. **Il ne protégeait rien, et la mesure l'a dit du
premier coup** : vingt inscriptions concurrentes, chaîne rompue. Un `UPDATE …
WHERE rev = …` verrouille la ligne qu'il modifie et le second attend ; une
insertion n'a **aucune ligne à verrouiller** — deux insertions simultanées
évaluent la même sous-requête, y lisent le même bout, et passent toutes les
deux.

La garantie est donc posée dans le schéma : `(nom, cle, rang)` unique, `rang`
étant le numéro de l'entrée dans sa chaîne, `cle` le code du module. Ce n'est pas
seulement plus sûr, c'est d'une autre nature : **un protocole se contourne, une
contrainte non**. La base refuse désormais une chaîne forchée quel que soit le
code qui l'écrit — y compris le socle Java.

L'index est **partiel, sur `rang > 0`** : une entrée simplement ajoutée n'a pas
de rang, et sans cette réserve deux ajouts non chaînés se refuseraient l'un
l'autre. Le revers est dit et gardé : relevé sur les journaux réels, **1 623
entrées du socle et 1 582 des modules, aucune sans numéro, aucun numéro en
double dans sa chaîne**, et deux contrôles le tiennent pour les suivantes.

### Deux défauts trouvés au passage

**Les garde-fous de forme ne regardaient pas `server.js`.** Ils scannaient
`public/` et `src/` ; le fichier de 1 200 lignes qui porte la moitié des
inscriptions au journal et la lecture du plafond d'écritures leur échappait.
L'angle mort s'est vu parce qu'une contre-épreuve refusait de mordre. Corrigé —
et le contrôle élargi a immédiatement trouvé un gestionnaire asynchrone sans
enveloppe qui dormait là.

**La vérification d'horloge écrivait au journal hors de la chaîne de
démarrage**, donc avant que les tables existent, et son `catch` avalait l'échec
en silence. L'entrée « horodatage non vérifié » était perdue — et c'est un
contrôle de la suite « socle » qui l'a dit, non moi.

### Ce que le passage a rendu plus rapide

`log` ne relit plus le journal entier, mais **seulement sa propre chaîne** :
`all()`, qui regroupait les 3 205 entrées par module à chaque écriture, a disparu
du chemin d'écriture. En base, c'est un index qui répond.

## Cinquième et sixième : `notifications` et `mfa_challenges`

*30 septembre 2026. Les deux plus petites du socle — et la plus sensible.*

`notifications` : trois appels, deux fichiers, le même identifiant dérivé d'une
longueur que `emails` avait déjà montré.

`mfa_challenges` : un seul fichier, et **le geste le plus sensible de toute la
bascule**. `verifyChallenge` lit le défi, incrémente son compteur d'essais,
réécrit. Rendu asynchrone sans précaution, dix codes faux lancés ensemble
liraient tous `attempts: 0` et n'en écriraient qu'un : le plafond de cinq essais
tomberait, et **une force brute disposerait d'autant d'essais qu'elle saurait en
lancer en parallèle**.

Mesuré, en processus :

| Dix codes faux lancés ensemble | restes annoncés | plafond |
|---|---|---|
| verdict arrêté **dans** la transformation | `4, 3, 2, 1, 0` | atteint |
| compteur lu **au-dehors** | `4, 4, 4, 4, 4, 4, 4, 4, 4, 4` | **jamais atteint** |

### Le filet qui manquait, écrit d'abord

`mfa_challenges` était la plus isolée du socle depuis le début, et c'est pour
cela qu'elle avait été écartée deux fois : **aucun des contrôles ne traversait
l'authentification à deux facteurs**. Elle est éteinte dans la configuration
d'essai, et personne n'avait posé `OASIS_MFA=1`. La fiche l'exige en production,
le démarrage refuse de se taire quand elle manque — et rien ne l'éprouvait.

Une suite lui est donc consacrée, **écrite avant la conversion** : 11 contrôles,
son propre serveur, `OASIS_MFA=1`. Le harnais accepte désormais des variables
d'environnement pour cela.

Ce qui ne peut pas s'éprouver, et c'est voulu : le code à usage unique n'est pas
récupérable. Il part par courriel, et le registre des envois retire le corps des
messages à secret. **Aucun contrôle ne peut donc réussir une ouverture de session
à deux facteurs** — ce sont les refus qui s'éprouvent, et ce sont eux qui
comptent.

### Une concurrence que le réseau ne reproduit pas

Le premier contrôle du compteur passait par dix requêtes HTTP simultanées. Il
passait — **et il ne prouvait rien** : deux requêtes ne se chevauchent côté
serveur que si chaque traitement dure assez longtemps. Mesuré : dix requêtes vers
un gestionnaire retardé de 30 ms se chevauchent bien à dix, mais vers celui-ci,
qui dure une milliseconde, elles s'enchaînent.

La preuve est donc en processus, où le croisement peut être forcé ; la suite
« mfa » garde le parcours et le dit franchement. **Cinquième vert vide de ce
chantier** — base de papier, journal vide, messagerie joignable, `server.js` hors
périmètre, et maintenant une concurrence que le réseau ne reproduit pas.

## Septième et huitième : `users` et `sessions` — et un choix de conception

*1ᵉʳ octobre 2026.*

### Pourquoi `getUsers()` est resté synchrone

Les cinq collections précédentes ont été converties en rendant asynchrone ce qui
les lit. Pour `users`, ce chemin aurait été une faute, et c'est mesuré :
`getUsers()` et `findUser()` sont appelés depuis des **prédicats de rôle
synchrones** — `compteA`, `canRead`, `canContribute` — eux-mêmes employés dans
**101 appels et 545 chaînes de tableau** à travers les six modules. Chaque
`liste.filter(canRead)` aurait dû devenir `await Promise.all(liste.map(…))`.
Ce n'aurait plus été un portage mais une réécriture de la couche module, pour une
donnée qu'on lit constamment et qu'on écrit une fois par semaine.

L'annuaire est donc tenu en mémoire (`src/annuaire.js`) et **rafraîchi une fois
par requête**, au seul endroit déjà asynchrone par lequel toute route protégée
passe : `requireAuth`. Les lectures restent synchrones, et toutes celles d'une
même requête voient le même annuaire.

**C'est une garantie plus forte que l'ancienne, non plus faible** : sans elle,
deux `getUsers()` d'un même gestionnaire pourraient rendre des listes
différentes, et une décision se prendrait sur l'une pendant qu'une autre
servirait à écrire.

**Ce qu'elle ne garantit pas, et il faut le dire** : à l'intérieur d'une requête,
l'instantané ne voit pas une écriture concurrente. C'est exactement ce que le
magasin par fichiers offrait, et cela ne met rien en péril parce que les
écritures, elles, sont atomiques.

Tout tient à un seul geste — `rafraichirAnnuaire()` dans `requireAuth`. Retiré,
rien ne tombe : l'application servirait l'annuaire du dernier démarrage, un
compte créé ne pourrait pas se connecter, un droit retiré continuerait d'ouvrir.
**Deux contrôles de forme l'imposent**, contre-éprouvés.

### Les écritures reportent les champs changés, et pas davantage

Douze écritures touchaient l'annuaire. Toutes suivaient la même forme : lire,
muter sur place, réécrire la liste entière. Rendues asynchrones telles quelles,
elles auraient effacé les écritures concurrentes sur **le même enregistrement**
— et l'une de ces écritures est le décompte de tentatives infructueuses, que la
connexion incrémente.

Un administrateur modifiant un nom aurait donc remis ce décompte à zéro, et **le
compte aurait cessé de se bloquer**. `annuaire.champsChanges(avant, après)` ne
reporte que ce que le gestionnaire a réellement changé. Mesuré, en séquence :

| | `failedAttempts` après | |
|---|---|---|
| réécrire l'enregistrement entier | **3** | l'incrément est perdu |
| reporter les seuls champs changés | **4** | les deux écritures coexistent |

### `sessions` : la table en mémoire fait foi

`getSession` reste synchrone — la table est la source, le magasin ne fait que la
garder d'un démarrage à l'autre. Seules l'ouverture, la fermeture et l'expiration
constatée persistent. La table est chargée avant que le serveur écoute.

### L'isolement des suites, qui n'existait plus

Le régime base a révélé un défaut du harnais : **chaque suite recevait une copie
neuve de `data/`, mais la base était partagée.** La suite « socle » efface un
compte, et les suivantes le cherchaient en vain ; l'amorçage ne reposait pas les
comptes du jeu d'essai, puisqu'il en trouvait déjà.

Pire : **les fixtures n'entraient jamais dans la base.** Le régime base n'avait
que les trois comptes de l'amorçage au lieu des quinze du jeu d'essai, et aucun
privilège — les contrôles de droits rendaient des listes vides. Le fichier
restait là, complet et ignoré.

Chaque suite reçoit désormais **son propre schéma PostgreSQL**, créé avant le
démarrage, garni des fixtures, détruit à l'arrêt. L'isolement est rendu, et de la
même façon des deux côtés : un répertoire à elle, un schéma à elle.

Et `srv.donnees()` lit maintenant **là où la donnée vit**. Un contrôle cherchait
les restes d'un compte effacé dans le fichier `users.json` — figé sur la copie
des fixtures — et les y trouvait toujours : il concluait que l'effacement n'avait
pas eu lieu.

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
