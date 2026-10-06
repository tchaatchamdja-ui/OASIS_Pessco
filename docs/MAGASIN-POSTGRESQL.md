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

## Ce qui restait à faire, et ce que cela a coûté

> **Achevé le 2 octobre 2026.** Cette section décrit l'état d'avant la bascule et
> les trois chemins qui s'offraient. Elle est conservée parce qu'elle dit le
> raisonnement : c'est le chemin 1 qui a été pris, module par module, et les quinze
> collections sont aujourd'hui en base. Le récit de chacune suit, plus bas.

**La bascule.** `DATABASE_URL` posé, l'application continuait d'écrire dans des
fichiers.

La raison n'était pas le magasin, elle était au-dessus : **`store.load()` et
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

> **C'est le chemin 1 qui a été pris** (ADR-002, jalon n° 7), collection par
> collection, chacune derrière les contrôles qui la gardent. Les quinze y sont.

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

## Neuvième et dixième : `referentiels` et `module_rights`

*2 octobre 2026. Même cas que `users`, donc même traitement — et une seule
mécanique pour les trois.*

Les deux relèvent exactement du cas de `users` : elles sont lues depuis des
prédicats synchrones. `referentiels.getAll()` est appelé **45 fois** hors de son
module ; `module_rights` l'est par `getRights`, `can`, `effectivePrivilege` et
`accesAuModule`, qui **sont** des prédicats.

Trois mécaniques pour une seule idée auraient fait trois choses à tenir
d'accord. `src/annuaire.js` portait celle de `users` ; elle vit désormais dans
**`src/instantane.js`**, qui sert les trois et dit en un seul endroit le
compromis et ce qu'il ne garantit pas. `annuaire.js` reste, réduit à la vue
« comptes » — c'est sous ce nom que `src/auth.js` le lit et que les contrôles
l'éprouvent.

Les trois collections sont relues **ensemble**, en parallèle : ce sont trois
allers-retours vers la même base, et les enchaîner triplerait la latence de
chaque requête.

### Les lectures rendent l'instantané, non une copie

Copier 45 fois par requête un objet de 25 Ko serait coûteux pour rien. Vérifié
avant de le décider : **aucun appelant extérieur ne mute** ce que `getAll()`
rend — ils passent tous le résultat à un `.find` ou un `.filter`. Ceux qui
écrivent passent par les quatre fonctions d'écriture, qui travaillent sur ce que
la base vient de rendre.

Les deux écritures internes qui mutaient leur argument — `removeCascade` par
`splice`, et le nettoyage des orphelins — travaillent désormais sur une copie.
Muter l'instantané l'aurait rendu faux pour la suite de la requête, sans qu'une
seule erreur le dise.

### Un `forEach` qui aurait rendu un compte faux

L'import de référentiel par classeur parcourait deux `forEach` imbriqués —
feuilles, puis lignes — et y écrivait. Les écritures devenues asynchrones, un
`forEach` les aurait **lancées sans les attendre** : les feuilles parent et
enfant se seraient croisées, les codes parents n'auraient pas été résolvables au
moment voulu, et le compte rendu — « 12 ajouts, 3 mises à jour » — aurait été
rendu avant que rien ne soit écrit.

Ce sont des boucles `for…of` maintenant. C'est le même piège que `.map()` sur un
appel asynchrone, à ceci près qu'il ne lève rien : il rend simplement un chiffre
faux à qui vient d'importer un référentiel.

---

## Onzième : `profil_risque` — le premier magasin de module

*2 octobre 2026. Le plus petit des cinq, pris pour mesurer le coût réel avant
d'engager les quatre autres.*

Les cinq collections de module portent les **381 appels** mesurés au départ. La
propagation n'y est pas de la nature des trois précédentes : ces données ne sont
pas lues par des prédicats mais **dans le corps des gestionnaires**, qui sont déjà
asynchrones depuis la bascule des journaux d'audit. L'instantané par requête ne
conviendrait donc pas — et ne devrait pas convenir : une évaluation est un acte
d'autorité, en écriture permanente, où lire un état vieux de quelques
millisecondes ne se défend pas.

La conversion est donc franche. `profil_risque` est le plus petit : **12 appels,
5 fichiers, 23 contrôles**. Le coût de portage a été celui qu'on attendait. Ce que
la conversion a trouvé ne l'était pas.

### Trois gestes en faisaient plusieurs

| Geste | Écritures avant | Après |
|---|---|---|
| Mettre à jour une évaluation, puis horodater son étape | 2 | **1** |
| Supprimer une évaluation, libérer son parent, ses deux séries de réunions | **4** | **1** |
| Ouvrir un cycle de réévaluation, puis le rattacher | 2 | **1** |

Entre ces écritures, l'application montrait des états qui n'ont jamais été voulus :
une évaluation disparue dont le parent se disait encore « réévaluation en cours »,
des comptes rendus rattachés à rien, un statut posé dont l'étape n'était pas
horodatée. Un échec au milieu les y laissait pour de bon.

C'est pour cela que le magasin expose `transformer` et non seulement `insert` /
`update` / `remove` : un geste composite s'écrit d'un seul coup, ou il n'est pas
atomique.

### Une garde hors de l'écriture ne garde rien

Deux endroits vérifiaient un état avant d'écrire :

- **la réévaluation** — « aucune n'est déjà lancée ». Deux demandes parties
  ensemble passaient toutes deux le contrôle, créaient deux clones, et le second
  `enfant_id` écrasait le premier : un clone qu'aucun écran n'atteint plus, et que
  rien ne signale ;
- **le verrou d'une évaluation validée** — l'import de notes par classeur. Parti
  au moment où le directeur valide, il se posait **après** la décision : les notes
  qui la fondent changeaient après elle, et le profil servi à la Planification
  n'était plus celui qui avait été arrêté.

Les deux gardes n'étaient pas fausses. Elles étaient **hors de l'écriture
qu'elles gardaient**. Elles se relisent désormais dans la transformation, sur
l'état qu'on va écrire.

### Le transformateur recevait l'objet du cache

Celui-ci n'était pas prévu : un contrôle que je venais d'écrire l'a trouvé.

Sur fichiers, `store.load` rend **l'objet du cache**, partagé par tout le
processus. Un transformateur qui le mute en place — `arr.splice(i, 1)`,
`arr[i] = …`, la façon naturelle d'écrire — le mutait donc pour tout le monde,
avant la moindre écriture. Deux conséquences, mesurées :

```
en mémoire après l'échec : {"items":[1,2,99]}
sur le disque            : {"items":[1,2]}
```

L'écriture est refusée, et la donnée est fausse quand même — **durablement** : le
cache est indexé sur la date du fichier, que rien n'a changée. Et si le
transformateur contient un `await`, son état intermédiaire est lisible par une
autre requête.

La base n'a jamais eu ce défaut : chaque essai y relit le JSON, donc un objet
neuf. Le transformateur reçoit maintenant une copie dans les deux régimes, ce qui
est tout l'objet de cette façade — un appel converti doit se comporter de la même
façon sur fichiers et en base. Coût : un clonage par écriture, quelques
millisecondes sur la plus grosse collection, pour une trentaine d'écritures par
jour.

### `INCHANGE`, et pourquoi ce n'est pas `undefined`

Un transformateur ne trouve pas toujours de quoi travailler : la ligne visée
n'existe pas, la transformation ne change rien. Réécrire quand même coûte un
aller-retour sur la collection entière — la bibliothèque documentaire porte ses
pièces en base64, jusqu'à 3,5 Mo l'une — pour répondre `404`.

D'où un refus explicite, `magasin.INCHANGE`. **Il fallait un symbole.** Un
`return` oublié rend `undefined` ; le prendre pour « ne rien écrire » ferait
disparaître une écriture sans erreur ni trace, c'est-à-dire exactement le défaut
que `modifier` existe pour empêcher. `undefined` lève donc, et nomme l'oubli.

### Un vert creux, retiré plutôt que gardé

J'avais écrit une rafale de dix réévaluations simultanées. Elle passait. La
contre-épreuve — l'ancienne logique en trois temps, la garde hors de l'écriture —
**la passait aussi** : dix requêtes HTTP contre un gestionnaire rapide se
sérialisent, et la fenêtre ne s'ouvre jamais.

C'est la deuxième fois que ce piège se présente ici ; la première était le
compteur du second facteur. Le contrôle est remplacé par deux qui mordent :

| Preuve | Où | Contre-épreuve |
|---|---|---|
| Dix gardes dans la transformation, une seule passe | « unitaires », en processus | La même garde hors de la transformation en laisse passer plusieurs |
| La garde est **dans** le `db.transformer` | « taille », sur la forme | Retirée, le contrôle tombe |

Le premier marqueur de forme ne mordait pas non plus : il cherchait le nom du
champ, qui apparaît aussi dans la mise à jour du parent, à l'intérieur de la même
transformation. C'est le **refus** qui sert de marqueur maintenant.

### Six routes de classeur qu'aucun contrôle n'exerçait

Export des indicateurs, modèle, export des notes, import d'indicateurs : ces
routes lisent le magasin trois fois chacune, en boucle sur les familles. Un
`await` oublié y rendrait un classeur **vide et bien formé** — trois feuilles,
leurs entêtes, aucune ligne. Rien ne l'aurait dit, et personne ne les exerçait.
Elles portent six contrôles maintenant, tous contre-éprouvés.

Deux `forEach` y sont devenus `for…of`, comme pour l'import de référentiel.

### Le coût, mesuré

| | |
|---|---|
| Contrôles, quatre régimes | **813** sur fichiers et bus différé · **823** en base |
| Dont nouveaux | **16** |
| Node contre Java, **neuf** collections en base | **38 / 38** à l'octet |
| Maillons SHA-256 revérifiés de part et d'autre | **1 582** |
| Suite « droits » par la passerelle | **20 / 20** ; Java arrêté, 3 tombent aussitôt |

Les quatre suivants suivent la même recette ; les trois défauts trouvés ici —
gestes composites, gardes hors de l'écriture, mutation du cache — s'y
retrouveront, et deux d'entre eux sont désormais gardés par un contrôle de forme.

---

## Douzième : `planification`, et la composition

*2 octobre 2026. 68 appels, 6 fichiers. Le module où un geste du métier en vaut
le plus d'ici.*

### Jusqu'à une dizaine d'écritures pour un seul geste

| Geste du métier | Écritures avant | Après |
|---|---|---|
| Valider un plan amendant une version | statut + 1 par avis d'activité + **2 par ancêtre retiré** + la décision au circuit | **1** |
| Appliquer la synchronisation des risques | ouverture de l'amendement + **1 par activité recopiée** + 1 par écart appliqué | **1** |
| Sortir un plan des archives | statut + 1 par exception d'activité + la décision | **1** |
| Annuler un amendement | retrait + la décision | **1** |
| Amender | le nouveau plan + 1 par activité copiée + la décision | **1** |

Ce qui compte n'est pas le nombre. C'est qu'entre ces écritures, **un plan était
validé et son circuit ne le disait pas** — un acte d'autorité sans sa
justification —, une version était retirée sans que rien ne dise par quoi, et un
amendement à moitié recopié ne se distinguait pas d'un amendement réel.

`D.inscrireWf` pose désormais l'entrée de circuit *dans* l'état qu'on écrit, et
n'écrit rien elle-même. `retirerAncetres` et `cibleDeSynchro` font de même : elles
reçoivent l'état, le modifient, et c'est la transformation qui l'enregistre.

### Deux gardes de route étaient des prédicats synchrones

```js
const lecturePlan = (req, res, next) => (D.peutLire(req, D.planDe(req.params.id)) ? next() : D.refus(res));
```

`D.planDe` lit la base. Ces deux gardes sont donc asynchrones, et passent par
`asynchrone` **comme un gestionnaire** : Express 4 ne traite pas mieux un
middleware `async` qu'un gestionnaire, et sans l'enveloppe un échec laisse la
requête ouverte sans erreur ni trace.

### Le vocabulaire des magasins de module, extrait

`src/magasin_module.js` porte `list`, `get`, `insert`, `update`, `remove`,
`removeWhere` et `transformer` **une fois**, pour les cinq modules. Les trois
défauts du premier module ont montré que la subtilité est réelle ; écrite cinq
fois, il aurait fallu tenir cinq copies d'accord.

### Un garde-fou qui dénonçait 150 lignes correctes, puis 8

Le contrôle « aucun magasin de module lu sans `await` » s'est trompé deux fois
avant de tenir :

1. **Critère « le magasin requiert la façade »** — le magasin de RAMP la requiert
   depuis le jalon n° 9 pour la seule nomenclature des aéronefs, tandis que ses
   autres collections restent sur fichiers. 150 lignes parfaitement correctes
   désignées.
2. **Balayage ligne à ligne** — `await Promise.all([db.list('plans'),
   db.list('activites')])` ne porte qu'un `await` pour deux appels, et tient
   parfois sur trois lignes. Huit appels corrects désignés.

Il balaie maintenant **par instruction**, et reconnaît un magasin converti à deux
formes dont aucune n'est une déclaration qu'on peut oublier de poser : bâti sur
`magasinDeModule('<nom>')` avec ce nom dans la liste des migrées, ou un
`const list = async` écrit à la main.

### Six routes converties qu'aucun contrôle n'exerçait

`apply-sync`, `transmettre`, `approuver-dg`, les archives du plan, et les deux
exceptions d'archive posées activité par activité. **Deuxième fois que la
conversion révèle ce trou** — les six routes de classeur de `profil_risque`
étaient dans le même cas, et c'est devenu la chose à vérifier avant de convertir :
quelles routes la suite touche-t-elle réellement ?

Dix contrôles les couvrent. Et trois contre-épreuves n'ont pas mordu :

| Contre-épreuve | Ce qu'elle a montré |
|---|---|
| `await` retiré sur la lecture du plan dans `apply-sync` | Sans effet : la transformation relit l'état elle-même. |
| `await` retiré devant `db.transformer` | Sans effet par HTTP — la réponse part avant l'écriture, mais la requête suivante arrive après. C'est le **garde-fou de forme** qui l'attrape, vérifié plutôt que supposé. |
| Copie des activités supprimée | **Mon assertion était trop faible** : « la cible porte des activités » passait, la synchronisation en créant de neuves. Elle porte maintenant sur `parent_activite_id`, qui n'appartient qu'à une copie. |

### Le coût, mesuré

| | |
|---|---|
| Contrôles, quatre régimes | **825** sur fichiers et bus différé · **835** en base |
| Dont nouveaux | **12** |
| Node contre Java, **dix** collections en base | **38 / 38** à l'octet |
| Maillons SHA-256 revérifiés de part et d'autre | **1 582** |
| Suites « droits » et « PLAN » par la passerelle | **20 / 20** et **62 / 62** |

Restent `mesures`, `ramp` et `execution`.

---

## Treizième : `mesures` — un numéro qui ne se partage pas

*2 octobre 2026. 118 appels, 3 fichiers. Le module des actes de sanction.*

### Le geste le plus sensible de la bascule

```js
function prochaineReference() {
  const d = load();                       // lire
  const rang = Math.max(d.dernier_numero, plancher) + 1;
  d.dernier_numero = rang;                // modifier
  save(d);                                // réécrire
  return `MES-${rang}`;
}
```

Deux mesures prononcées ensemble liraient le même dernier numéro et porteraient
**la même référence**. Cette référence est notifiée au prestataire et désigne un
acte d'autorité : deux actes sous un seul numéro ne se distinguent plus.

L'allocateur est devenu **pur** — il avance le compteur dans l'état qu'on écrit et
rend la référence. C'est ce qui permet d'en tirer plusieurs dans la même
transformation : l'instance arrête souvent trois ou quatre mesures d'un coup.

La distinction est en fait tenue **deux fois** — par le compteur et par le
plancher calculé sur les références présentes. La contre-épreuve l'a montré :
figer le compteur seul ne suffisait pas à produire un doublon, il fallait retirer
les deux. Le contrôle le dit maintenant.

### Deux gardes que leur propre commentaire dénonçait

```js
// Chacune vérifie le statut de départ : sans cette garde, un double clic
// notifierait deux fois, et une mesure clôturée pourrait être « notifiée ».
```

La garde était **hors de l'écriture**. Deux requêtes simultanées lisaient toutes
deux « projet », et la notification partait deux fois — exactement ce que le
commentaire annonçait. Même forme pour la réécriture d'une mesure clôturée.

Onze refus de ce module se relisent désormais dans la transformation.

### Le dossier de traitement s'ouvrait deux fois

Deux routes faisaient « chercher le dossier, le créer s'il n'existe pas ». Deux
requêtes parties ensemble n'en trouvaient aucune et ouvraient **deux dossiers pour
la même carence** — or `traitementDe` n'en rend qu'un : le travail consigné dans
l'autre devenait inatteignable, sans qu'aucune erreur le dise. Les deux routes
passent par une seule fonction, qui pose le dossier en une transformation.

### Le circuit complet n'était exercé par aucun contrôle

Investigation, qualification, suivi : le cœur du module, et c'est là que les
mesures sont **prononcées**. Vingt-trois contrôles le traversent maintenant de
bout en bout, dont celui qui vérifie que deux mesures arrêtées d'un même geste
portent deux références distinctes.

**Troisième fois que la conversion révèle ce trou** — après les six routes de
classeur de `profil_risque` et les six routes de PLAN. Ce n'est plus une surprise :
c'est une étape de la recette.

### Le garde-fou a cessé de couvrir ce module sans le dire

La fabrique `magasinDeModule` prend des options depuis ce module-ci — « Mesures
d'Application » tire ses identifiants lui-même et porte ses propres dates, et
changer la forme de ses enregistrements en passant n'aurait pas été une conversion
mais une migration de données. Ma regex de détection exigeait une parenthèse juste
après le nom de la collection : `magasinDeModule('mesures', { … })` ne
correspondait plus, et **la couverture est tombée en silence**.

C'est le défaut que ce garde-fou existe pour empêcher, dans le garde-fou lui-même.
Il reconnaît maintenant le nom seul, quoi qui suive.

### Et une phrase rendue invisible à qui doit la traduire

En portant un message de refus dans une variable pour le rendre après la
transformation, je l'ai sorti de l'endroit où le garde-fou des traductions le lit —
après `error:`. Il l'a dit. Le refus porte donc un **code**, et la phrase reste là
où la réponse se forme.

### Le coût, mesuré

| | |
|---|---|
| Contrôles, quatre régimes | **849** sur fichiers et bus différé · **859** en base |
| Dont nouveaux | **24** |
| Node contre Java, **onze** collections en base | **38 / 38** à l'octet |
| Maillons SHA-256 revérifiés de part et d'autre | **1 582** |
| Suite « droits » par la passerelle | **20 / 20** |

---

## Quatorzième : `ramp`, et un socle qui sert deux régimes

*2 octobre 2026. 155 appels, 7 fichiers, et **86 gestionnaires de route encore
synchrones** — presque tous ceux du module.*

### Des références allouées par lots

Un classeur d'inspections porte le mois entier. Les références `POI-xxxx`
s'allouaient donc déjà par lots, pour ne pas réécrire le magasin à chaque ligne ;
l'allocateur est devenu pur, et le lot se tire dans la transformation qui écrit
les inspections. Deux actes d'inspection ne partagent pas un numéro — une requête
entre États en cite un.

L'import d'un classeur allouait les références, insérait les inspections neuves et
leurs écarts, puis **écrivait une fois par inspection mise à jour**. Deux cents
lignes faisaient deux cents écritures ; entre elles, un import à moitié fait.

### Le socle des vues sert maintenant deux régimes

`src/vues_prestataire.js` porte la bascule AAC / Prestataire pour RAMP **et** pour
« Exécution de la Surveillance ». Quand RAMP est passé en base et l'autre pas
encore, le socle a dû servir les deux côtés à la fois — c'est exactement ce que la
façade existe pour permettre.

Son middleware est enveloppé **là où il est défini**, et non à chaque montage :
deux modules le montent, et Express 4 ne traite pas mieux un middleware `async`
qu'un gestionnaire.

### Trois `forEach` qui auraient effacé les pièces d'autrui

Le retrait d'un partage demande au magasin, pièce par pièce, si le fichier est
encore désigné ailleurs. En `forEach`, les questions partent sans attendre les
réponses : des pièces qu'un autre partage tient encore seraient effacées, et
l'État destinataire tomberait sur « Fichier introuvable ». Ce sont des `for…of`.

### Un contrôle qui existait et ne gardait rien

« Les écarts partent avec leur inspection » passait **avec la cascade
supprimée** — la contre-épreuve l'a montré. Un second contrôle lit maintenant les
orphelins là où la donnée vit : aucune route ne les sert, et c'est bien le problème
qu'il garde.

Et l'allocation groupée n'était exercée par rien : la suite n'importait jamais
qu'une inspection neuve à la fois, donc le lot valait toujours un. Rendre la même
référence pour tout le lot passait sans broncher. Deux inspections neuves dans un
même classeur sont désormais contrôlées — c'est le cas ordinaire.

### Le passage outillé, et pourquoi il a été défait

Un script a enveloppé les 86 gestionnaires : forme régulière, `node --check` en
filet. Un second devait poser les `await` et rendre asynchrones les fonctions
englobantes ; il a rendu asynchrones des **aides pures** — `texte`, `admin`,
`voitTout`. Défait, et refait à la main : onze aides converties, et leurs appels
avec elles.

---

## Quinzième : `execution` — et le magasin est entièrement en base

*2 octobre 2026. 237 appels, 8 fichiers, 84 gestionnaires synchrones. Le dernier.*

### Des références sans compteur

`references.js` compose les références du circuit — activité, notification,
rapport, constatation, dossier — selon un modèle que l'administrateur définit au
menu Paramètres. Le numéro d'ordre se déduit **des références existantes** : il n'y
a pas de compteur persisté.

La référence se calculait, puis l'enregistrement s'écrivait dans un second temps.
En synchrone, rien ne s'intercalait ; converti sans précaution, deux actes ouverts
ensemble auraient porté la même référence. `suivanteDans` est donc pure, et
`insererAvec` écrit l'enregistrement avec sa référence en une transformation.

Le cas le plus dense : la soumission d'un rapport tirait **deux numéros par deux
lectures** — la référence de base et le numéro de version — avant trois écritures.
Deux soumissions simultanées auraient produit deux rapports « v1 » sous la même
référence.

### Ce qu'une clôture rend opposable

| Geste | Écritures avant | Après |
|---|---|---|
| Clôturer un dossier | statut + **1 par constatation rendue opposable** | **1** |
| Valider le rapport final | rapport + dossier + 1 par constatation | **1** |
| Amender un rapport validé | rapport + dossier + 1 par constatation | **1** |
| Transmettre (deux routes) | rapport + 1 par constatation (+ dossier) | **1** |
| Archiver les activités hors plan | **2 par activité** | **1** |
| Importer une checklist (trois routes) | **1 par ligne** | **1** |

Ce qui compte n'est pas le nombre. Clôturer un dossier rend opposables au
prestataire les constatations en brouillon : entre les deux écritures, un dossier
clos dont les constatations ne l'étaient pas — et un échec au milieu les y laissait
**inopposables pour toujours**.

### Le défaut que seul un contrôle de comportement pouvait voir

```js
res.json(rows.map(enrichirFnc));
```

`enrichirFnc` touche la base depuis la bascule. `.map` rend donc un tableau de
**promesses**, et `res.json` les sérialise en objets vides : une liste pleine
d'enregistrements sans aucun champ, sans la moindre erreur.

**Le garde-fou de forme ne peut pas le voir** — ce n'est pas un appel au magasin,
c'est un `map`. Ce sont trois contrôles de la suite SURV qui l'ont dit, sur quatre
listes dans ce cas. C'est la limite de ce que la forme garde, et la raison pour
laquelle les contrôles de comportement ne se remplacent pas.

### Deux autres choses trouvées en chemin

Le garde-fou avait laissé passer un `await` manquant : `if ((db.list(…)` — sa
parenthèse ouvrante masquait l'appel à la détection. C'est le balayage manuel qui
l'a trouvé, et la composition des références en dépendait entièrement.

Et une route montée **avant** la déclaration de son gestionnaire : un `const` ne
vit qu'à partir de sa déclaration, et le serveur refusait de démarrer. Le
gestionnaire est monté tel quel, non réenveloppé dans une flèche — l'enveloppe
reçoit `next` d'Express, et une flèche à deux arguments le lui retirait.

### Un contrôle qui tombait pour une bonne raison

« Une collection non migrée ne l'est dans aucun régime » prenait son témoin dans
une liste de collections réelles, par leur complément. **Les quinze étant migrées,
il n'en restait aucun.** Le contrôle porte désormais sur un nom qui n'existe pas :
c'est la liste d'autorisation qui décide, et un nom qui n'y figure pas n'est jamais
servi par la base, quel que soit l'état de la migration.

### Le coût, mesuré — et le total

| | |
|---|---|
| Contrôles, quatre régimes | **854** sur fichiers et bus différé · **864** en base |
| Node contre Java, **treize** collections en base | **38 / 38** à l'octet |
| Maillons SHA-256 revérifiés de part et d'autre | **1 582** |
| Suites « droits » et « SURV » par la passerelle | **20 / 20** et **103 / 103** |
| `data/users.json` après chaque campagne | intact |

~~**La bascule du magasin est complète**~~ : treize collections nommées et les deux
journaux chaînés vivent en PostgreSQL, et le même code sert les fichiers quand
aucune adresse n'est donnée.

> **« Complète » était faux**, et relevé le 6 octobre 2026 : `data/` porte **quatorze**
> collections hors journaux. `instances` n'est pas migrée — c'est le jalon n° 14
> d'[ADR-002](ADR-002-migration-spring-boot.md), mesuré et non engagé : 15 accès au magasin
> dans un seul fichier, mais **135 appels** à convertir dans 18 fichiers, et deux de ses
> fonctions décident ce qu'un agent voit des autres États.
>
> Le compte « treize » était juste ; c'est le mot « complète » qui a étendu au magasin entier
> ce qui valait pour les cinq collections de module.

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

---

## Rejouer l'épreuve — les deux régimes

*Posé le 3 octobre 2026 en fermant [ADR-001](ADR-001-magasin-de-donnees.md) suite n° 3.*

La bascule était déclarée complète — elle ne l'est pas tout à fait, `instances` restant sur
fichiers (voir l'encadré plus haut) ; mais elle l'est pour les treize collections qui y sont
passées, et c'est de celles-là qu'il s'agit ici. Ce qui manquait n'était pas une
vérification mais sa **répétition** : elle avait été faite une fois, à la main, et rien ne
la rejouait. La campagne par défaut rend 5 des 17 contrôles du magasin, et aucune de ses
treize suites ne sert la base.

La tâche `base` de la CI rejoue les deux épreuves à chaque poussée. Pour les rejouer à la
main :

```bash
docker run -d --name oasis-pg -e POSTGRES_PASSWORD=essai -p 5433:5432 postgres:16
docker exec oasis-pg psql -U postgres -c 'CREATE DATABASE oasis_recette'
```

Les 17 contrôles du magasin, pris à part :

```bash
OASIS_PG_ESSAI='postgres://postgres:essai@localhost:5433/oasis_recette' npm run smoke -- magasin-pg
```

Et la campagne entière, l'application servie depuis la base — c'est l'épreuve du jalon
n° 13 :

```bash
DATABASE_URL='postgres://postgres:essai@localhost:5433/oasis_recette' npm run smoke
```

### Les deux variables sont distinctes à dessein

`OASIS_PG_ESSAI` ne se confond pas avec `DATABASE_URL`. La suite du magasin **écrit**, et
l'on ne veut pas qu'une adresse posée pour tout autre chose la dirige sur une base qui
compte. Elle travaille dans un schéma à elle, `oasis_essai`, créé puis détruit.

### Chaque suite a son schéma — y compris celles qui ne démarrent aucun serveur

Les suites qui démarrent un serveur reçoivent chacune un schéma, où les fixtures sont
reprises, détruit à l'arrêt. **Les quatre qui tournent dans le processus de la campagne
n'en avaient aucun**, et `unitaires` écrivait donc `users`, `sessions`, `emails` et
`mfa_challenges` dans le schéma `public` de la base visée.

Ce n'est pas un désordre : en régime base, `save('users', …)` **remplace la collection
entière**. Un `npm run smoke` lancé sur une base qui compte y aurait écrasé les comptes
par les quinze du jeu d'essai — l'incident du 29 septembre 2026 sur `data/users.json`,
transposé à PostgreSQL, et cette fois sans archive horodatée pour s'en remettre.

La campagne relève désormais l'empreinte du schéma `public` avant et après, et **refuse si
quoi que ce soit a bougé**. C'est l'analogue exact du relevé qui garde `data/`, et c'est
lui qui a trouvé le défaut.

### Mesurer *pendant*, pas *après*

Le premier relevé, fait après la campagne, ne montrait que quatre collections : chaque
suite détruit son schéma en partant. Il a fallu interroger la base **pendant** qu'une
suite tournait pour voir ce qu'elle y faisait réellement — les quinze collections, `ramp`
à la révision 47, 46 entrées de `module_audit`. Une campagne verte en régime base ne
prouve rien si l'on n'a pas vérifié qu'elle a touché la base.
