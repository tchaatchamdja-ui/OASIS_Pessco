# ADR-001 : Magasin de données des instances nationales

> **⚠ ROUVERT le 26 septembre 2026 — son raisonnement est caduc.**
>
> Cet ADR diffère la bascule PostgreSQL au motif, écrit en toutes lettres, que
> **« la réplication n'est pas spécifiée »**. Elle l'était : la [fiche technique
> URSAC/GT2 du 2 août 2026](CONFORMITE-FICHE-TECHNIQUE.md) — antérieure de sept
> semaines à cet ADR — la spécifie au §3.3, *réplication logique PostgreSQL
> asynchrone vers un serveur central jouant le rôle de sauvegarde, tolérante aux
> coupures de connectivité*, et consacre son §4 entier à justifier PostgreSQL.
>
> Cet ADR a donc été écrit sans la réponse qu'il réclamait, et sa suite n° 1 —
> « obtenir la spécification de la réplication auprès de l'URSAC » — était déjà
> accomplie au moment où elle a été écrite. **Le document est conservé tel quel**
> : la chronologie d'une erreur de décision vaut d'être lisible, et le reste de
> son analyse — les mesures, le coût des 450 accès, le risque de l'option A —
> demeure exact.
>
> Ce qui change : l'option C (« rester sur les fichiers, spécifier la
> réplication ») n'a plus d'objet, son préalable étant levé.
>
> **L'arbitrage est rendu : chemin B — Spring Boot puis PostgreSQL.** Il est
> consigné par [ADR-002](ADR-002-migration-spring-boot.md), qui remplace celui-ci.
> L'option A de cet ADR — porter l'application Node en asynchrone — est écartée.
>
> Un fait découvert depuis, et qui pèse sur cet arbitrage : **la difficulté que
> cet ADR décrit — 450 accès synchrones à convertir — n'existe pas en Java**,
> où JDBC bloque par conception. Les deux questions n'en font qu'une.
>
> ---
>
> **Addendum du 28 septembre 2026 — l'option A revient, et c'est assumé.**
>
> Le jalon n° 7 d'ADR-002 tranche : **le magasin bascule sur PostgreSQL avant
> tout le reste**. Or Node continuera de servir tout ce qui n'est pas migré, et
> devra donc parler à la base. C'est exactement l'option A de cet ADR — porter
> l'application Node en asynchrone — que la note ci-dessus écartait.
>
> Elle est rétablie, et la raison de son rejet est tombée : cet ADR l'écartait
> comme « le prix fort, payé maintenant, pour un besoin qui n'est pas encore
> formulé ». Le besoin est formulé — fiche technique §3.3 et §4 — et
> l'arbitrage est rendu. Ce qui reste exact de l'analyse d'alors, c'est le
> **coût** (450 accès) et le **risque** (un `await` oublié rend une promesse là
> où un tableau est attendu, sans erreur) : les deux tiennent toujours, et
> commandent une conversion module par module, chacun derrière sa suite.
>
> S'y ajoute un risque que cet ADR n'avait pas vu, mesuré depuis contre un vrai
> serveur : **la conversion en asynchrone crée des pertes d'écriture à
> l'intérieur d'un même processus**, parce que `load` et `save` synchrones
> interdisaient aujourd'hui toute intercalation. Voir
> [MAGASIN-POSTGRESQL.md](MAGASIN-POSTGRESQL.md).

**Statut :** ~~Proposé~~ — **clos le 26 septembre 2026, remplacé par [ADR-002](ADR-002-migration-spring-boot.md)**
**Date :** 25 septembre 2026 — rouvert le 26 septembre 2026
**Décideurs :** maîtrise d'ouvrage OASIS ; URSAC/UEMOA pour l'exigence de réplication
**Remplace :** la ligne « Production : PostgreSQL 16 » portée par `src/store.js` depuis l'origine

---

## Contexte

L'application sert six modules métier sur un magasin de fichiers JSON
(`src/store.js`, deux fonctions : `load`, `save`). Le code annonce depuis le
premier jour que PostgreSQL 16 prendra la place, une base par État, avec
réplication logique vers un serveur central UEMOA. L'audit du 24 septembre en a
fait le constat ARCH-01.

Le magasin PostgreSQL est **écrit** (`src/store_pg.js`) et sa reprise de données
**éprouvée** sur les données réelles : 14 collections, 3 203 entrées de journal,
chaîne SHA-256 vérifiée après reprise, six contrôles de contrat. Ce qui n'est
pas fait, c'est la bascule.

### Ce que disent les mesures

| | |
|---|---|
| Données d'une AAC | **5 Mo**, dont 1,9 Mo de nomenclature d'aéronefs figée |
| Les huit États réunis | **≈ 39 Mo** |
| Écritures auditées par jour actif | **32** en moyenne ; 1 à 6 les jours récents |
| Coût d'une écriture auditée | **0,124 ms**, constant depuis PERF-01 |
| Appels directs `store.load` / `store.save` | 69 |
| Appels via les magasins de module | **381** |
| Gestionnaires de route déjà asynchrones | **5 sur 386** |

**L'argument de performance est nul.** À 39 Mo et trente écritures par jour,
aucun moteur de base n'apporte de vitesse ; le format en ajout seul a déjà réglé
le seul coût qui croissait.

### Ce qui reste, et qui est réel

1. **Concurrence entre processus.** Le magasin par fichiers n'a pas de verrou :
   deux processus servant le même répertoire s'écrasent en silence. Une seule
   instance sert aujourd'hui une AAC — la situation tient tant que cela dure, et
   rien dans le code ne l'impose.
2. **Réplication vers le serveur central UEMOA.** `config/oasis.config.json`
   porte `replication.enabled: false`, un `centralUrl` et un intervalle de
   quinze minutes. **Aucun code ne l'implémente** : c'est une intention déclarée,
   sans rien derrière.
3. **Exploitation.** Une base infogérée donne la restauration à un instant
   donné ; les fichiers donnent des archives horodatées (`scripts/sauvegarde.sh`).

### La contrainte qui décide

**La réplication n'est pas spécifiée.** On ne sait pas ce qui remonte au central
(tout ? les seuls actes de surveillance ? des agrégats ?), à quelle maille, dans
quel sens, ni ce qu'il advient d'un conflit. Or c'est le seul besoin que
PostgreSQL sert vraiment ici.

Choisir le magasin avant de connaître cette exigence, c'est risquer de bâtir le
mauvais ouvrage : une réplication logique PostgreSQL native impose la même
version, un réseau ouvert entre les huit États et le central, et réplique des
tables — quand l'exigence porte peut-être sur des actes métier.

---

## Décision proposée

**Différer la bascule. Spécifier la réplication d'abord.**

Le magasin PostgreSQL et sa reprise restent en place, éprouvés, prêts. Les
fichiers continuent de servir. La prochaine dépense d'ingénierie va à la
spécification de la réplication — d'où découlera le magasin, et non l'inverse.

---

## Options considérées

### Option A — Porter l'application en asynchrone, basculer sur PostgreSQL

| Dimension | Évaluation |
|---|---|
| Complexité | **Haute** — 450 accès, 381 gestionnaires de route à convertir |
| Coût | 3 à 6 semaines, plus la stabilisation |
| Scalabilité | Bien au-delà du besoin (39 Mo, 30 écritures/jour) |
| Familiarité de l'équipe | Le code d'origine RAMP venait de Prisma/PostgreSQL |
| Risque | **Élevé** — un `await` oublié rend une promesse là où un tableau est attendu, sans erreur ni trace |

**Pour** : durabilité honnête — une écriture confirmée est une écriture en base ;
concurrence réglée ; socle de la réplication native.
**Contre** : le prix fort, payé maintenant, pour un besoin qui n'est pas encore
formulé. Le risque porte sur des actes de surveillance et des mesures
d'application.

### Option B — Lire en mémoire, écrire derrière (file d'attente)

| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne — rien ne change dans les routes |
| Coût | 1 à 2 semaines |
| Scalabilité | Suffisante |
| Familiarité de l'équipe | Bonne |
| Risque | **Inacceptable en l'état** |

**Pour** : la bascule sans toucher aux 450 accès.
**Contre** : une réponse « enregistré » précède l'écriture réelle. Sur un acte
d'autorité, dire qu'on a enregistré ce qu'on n'a pas écrit ne se défend pas —
sauf à ajouter une file persistante et sa reprise, c'est-à-dire la complexité
qu'on voulait éviter, sans la durabilité de l'option A.

### Option C — Rester sur les fichiers, spécifier la réplication *(recommandée)*

| Dimension | Évaluation |
|---|---|
| Complexité | **Nulle** côté magasin |
| Coût | La spécification seule |
| Scalabilité | Éprouvée au volume réel, avec une marge de deux ordres de grandeur |
| Familiarité de l'équipe | Le code en place |
| Risque | Faible, et **borné** : un seul processus par instance |

**Pour** : rien à convertir ; le magasin PostgreSQL attend, écrit et éprouvé ;
la décision se prend quand l'exigence est connue.
**Contre** : la contrainte « un seul processus par instance » reste tacite ;
aucune restauration à un instant donné.

### Option D — PostgreSQL au central seulement, les États poussent

| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne, et **portée par le central** |
| Coût | Dépend de la spécification |
| Scalabilité | Le central agrège huit fois 5 Mo |
| Familiarité de l'équipe | À construire |
| Risque | Moyen — un protocole à définir |

**Pour** : découple la question. Les AAC gardent leurs fichiers ; le central
tient une base et reçoit des actes métier par API, non des tables répliquées.
C'est probablement ce que « réplication vers le serveur central » veut dire, et
c'est ce que `replication.centralUrl` — une adresse HTTP, non un flux
PostgreSQL — laisse entendre.
**Contre** : ne règle ni la concurrence ni la restauration côté AAC.

---

## Analyse des compromis

Le compromis n'est pas « fichiers contre base ». Il est **« payer maintenant
450 conversions pour un besoin non spécifié, ou spécifier d'abord »**.

Trois faits l'orientent :

1. **Le volume ne décide rien.** 39 Mo et trente écritures par jour tiennent
   dans n'importe quoi. Qui invoquerait la performance se tromperait de raison.
2. **La réplication décide de tout**, et elle n'existe qu'en intention. Un
   `centralUrl` en HTTPS suggère une API, pas une réplication logique
   PostgreSQL — deux architectures qui n'ont pas le même magasin idéal.
3. **Le risque de l'option A est réel et mal placé.** Convertir 381
   gestionnaires sous 675 contrôles automatiques reste une opération où une
   promesse oubliée se lit comme une donnée vide. On l'accepte pour un besoin
   établi, pas pour une échéance sans date.

L'option C n'est pas l'immobilisme : le magasin est écrit, la reprise éprouvée,
les contrats gardés par six contrôles. C'est une **option d'attente qui a été
payée** — il ne reste qu'à l'exercer le jour venu.

---

## Conséquences

**Ce qui devient plus facile**
- Aucune conversion à mener ; l'effort va à la spécification de la réplication.
- Le jour de la bascule, magasin et reprise sont prêts et éprouvés.
- Les six contrôles de contrat empêchent les deux magasins de diverger d'ici là.

**Ce qui devient plus difficile**
- ~~La contrainte « un seul processus par instance » doit être écrite et
  tenue~~ — faite : le verrou la tient (`src/verrou.js`). Elle devient une
  contrainte explicite du déploiement, non plus une hypothèse tacite.
- Pas de restauration à un instant donné : les archives horodatées restent le
  seul recours, et leur planification doit être vérifiée.

**Ce qu'il faudra revoir**
- Dès que la réplication est spécifiée — c'est l'événement déclencheur.
- Si une instance doit servir plusieurs processus (montée en charge, haute
  disponibilité), la concurrence devient bloquante et l'option A s'impose.
- Si une exigence de conservation impose la restauration à un instant donné.

---

## Suites

1. [x] ~~**Obtenir la spécification de la réplication** auprès de l'URSAC~~ —
       **elle existait déjà** : fiche technique du 2 août 2026, §3.3. Réplication
       logique PostgreSQL asynchrone vers le serveur central, tolérante aux
       coupures. Le préalable est levé ; c'est ce qui rouvre cet ADR.

       **Un point à trancher, relevé le 9 octobre 2026** en couvrant l'écran qui
       règle la réplication (ADR-003, 5.c.10). Le serveur n'écrit `centralUrl` que
       si elle est **non vide** (`if (replication.centralUrl)`) : vider le champ et
       enregistrer rend « Configuration enregistrée. » et **garde l'ancienne
       adresse**. L'opérateur ne peut donc pas effacer la cible par l'écran, et rien
       ne le lui dit.

       Le comportement est **fixé par un contrôle de parcours**, non corrigé : ce que
       signifie « effacer l'adresse du central » — désactiver la cible, ou être
       refusé — appartient à cette spécification. La trancher ici, et le contrôle
       suivra.
2. [x] **Écrire la contrainte d'un seul processus par instance** — faite
       (`src/verrou.js`). Le serveur pose un `.verrou` dans le répertoire de
       données et refuse de démarrer si un autre le tient ; un verrou laissé par
       un arrêt brutal est repris, celui d'une autre machine est refusé faute de
       pouvoir le vérifier. Huit contrôles, et le geste dans `DEPLOYMENT.md`.
3. [x] **Éprouver `src/store_pg.js` contre un vrai PostgreSQL** — fait, et ce
       point méritait d'être rouvert avant d'être coché.

       Il l'avait été **une fois, à la main**, le 1ᵉʳ octobre 2026. Relu le
       3 octobre, l'état réel était celui-ci : la campagne par défaut rend **5
       des 17 contrôles** du magasin — les douze qui interrogent un vrai moteur
       se déclarent hors de portée faute de `OASIS_PG_ESSAI` — et **aucune des
       treize suites ne sert la base**, faute de `DATABASE_URL`. La CI ne
       démarrait aucun PostgreSQL. ADR-002 jalon n° 13 était donc **déclaré clos
       sur une épreuve que rien ne rejouait** : un `json` devenu `jsonb`, un
       `rev` mal comparé, une chaîne d'audit qui forche — rien ne l'aurait dit.

       Ce qui est en place maintenant, et qui tourne à chaque poussée :

       | Épreuve | Ce qu'elle couvre |
       |---|---|
       | `OASIS_PG_ESSAI` + `smoke -- magasin-pg` | **17/17** contrôles du magasin contre PostgreSQL 16 — aller-retour octet pour octet, contre-épreuve `jsonb` qui rompt la chaîne, 50 écritures concurrentes, 100 ajouts au journal, deux chaînes mêlées |
       | `DATABASE_URL` + `npm run smoke` | **la campagne entière servie depuis la base** — les 386 routes, les quinze collections, les deux journaux chaînés. C'est l'épreuve du jalon n° 13, et elle n'existait pas |
       | `npm run smoke` sans adresse | le régime fichiers, éprouvé **pour lui-même**. Les deux régimes se vérifient, pas l'un à la place de l'autre |

       Vérifié non vide : pendant la suite RAMP en régime base, le schéma isolé
       porte les **quinze** collections, `ramp` à la révision 47 et 46 entrées de
       `module_audit`. Le premier relevé, fait *après* la campagne, ne montrait
       que quatre collections — parce que chaque suite détruit son schéma en
       partant. Mesurer après ne disait rien ; il a fallu mesurer **pendant**.

       **Et le défaut que cela a trouvé.** Les quatre collections vues dans le
       schéma `public` n'étaient pas un reste : `unitaires.smoke.js` y écrivait
       `users`, `sessions`, `emails` et `mfa_challenges`. Les suites qui
       démarrent un serveur reçoivent chacune son schéma ; les quatre qui
       tournent **dans le processus parent** n'en avaient aucun. Or en régime
       base, `save('users', …)` **remplace la collection entière** : un
       `npm run smoke` lancé sur une base qui compte y aurait écrasé les comptes
       par les quinze du jeu d'essai. C'est l'incident qui a détruit
       `data/users.json` le 29 septembre 2026, transposé à PostgreSQL — et cette
       fois sans aucune sauvegarde horodatée pour s'en remettre.

       Corrigé — les suites du parent ont leur schéma — et **tenu** : la
       campagne relève l'empreinte du schéma `public` avant et après, et refuse
       si quoi que ce soit a bougé. C'est l'analogue exact du relevé qui garde
       `data/`, et c'est lui qui a trouvé le défaut. Contre-essayé dans les deux
       cas qui comptent : base vierge — il nomme ce qui a été créé ; base déjà
       peuplée — il montre les empreintes qui changent, c'est-à-dire la donnée
       remplacée.

       Cinq garde-fous de forme tiennent la tâche de CI, chacun contre-essayé :
       le service doit être un PostgreSQL, les deux épreuves doivent être
       lancées avec leurs adresses — distinctes à dessein —, et la campagne sur
       fichiers ne doit porter **aucune** adresse de base.
4. [~] **Vérifier la planification des sauvegardes** sur l'instance de
       production (`scripts/sauvegarde.sh`), seule protection en l'absence de base.

       **Ce point était mal formulé, et c'est pourquoi il n'avançait pas.**
       « Vérifier » est un geste qu'on fait une fois ; une planification, elle,
       se défait sans bruit — une tâche `cron` emportée par un conteneur
       recréé, un disque plein, un `tar` interrompu, un répertoire remonté
       ailleurs. Dans tous ces cas **l'application continue de servir
       parfaitement**, et le jour où l'on apprend qu'elle n'était plus protégée
       est le jour où l'on en avait besoin. C'est la même leçon que la suite
       n° 3 : une vérification qui ne se rejoue pas ne vérifie rien.

       **Fait (`src/sauvegardes.js`)** : le serveur dit lui-même l'état des
       sauvegardes, dans `GET /api/health` et à la trace — au démarrage **puis
       chaque jour**, parce qu'un serveur qui tourne des semaines n'aurait dit la
       chose qu'une fois, le jour où elle était encore vraie.

       Cinq verdicts, parce que la conduite à tenir diffère pour chacun :

       | Verdict | Niveau | Pourquoi il est distinct |
       |---|---|---|
       | `ok` | `info` | Une archive de taille plausible, dans le seuil |
       | `perimee` | **`erreur`** | La planification s'est arrêtée, et `age_h` dit depuis quand |
       | `tronquee` | **`erreur`** | Un `tar` interrompu — **l'archive est fraîche et elle ne vaut rien.** Sans ce plancher, la sonde l'aurait comptée « ok » : c'est le cas le plus silencieux des cinq |
       | `aucune` | **`erreur`** | Le répertoire existe et ne porte rien |
       | `non_configure` | `alerte` | **La sonde ne sait pas.** Elle ne dit pas « ok » faute de pouvoir regarder |

       Les deux derniers choix sont les seuls qui méritent discussion.
       « Introuvable » n'est pas « à jour » : une sonde qui rassure faute de
       pouvoir regarder fournit l'assurance exacte qu'on n'a pas. Et
       `non_configure` est une **alerte**, non une erreur : crier « erreur » sur
       ce qu'on ignore est la meilleure façon de faire ignorer les vraies. Enfin
       le `statut` global ne passe pas à `degrade` — le service n'est pas
       dégradé, il est non protégé, et confondre les deux ferait ignorer
       `degrade`.

       Onze contrôles, dont trois contre-essayés : la sonde rendue complaisante
       sur un répertoire absent, le plancher de taille ôté, et le script renommant
       ses archives sans que la sonde le sache — ce dernier parce que le motif de
       la sonde et le nom que le script **fabrique** doivent s'accorder, sinon
       elle dirait « aucune sauvegarde » sur une instance parfaitement
       sauvegardée et l'on apprendrait à ignorer l'alerte. Un douzième vérifie
       que tout verdict ajouté plus tard porte sa phrase et son niveau : sans
       lui, il partirait sous son nom brut au niveau `info`, c'est-à-dire celui
       qu'on ne lit pas.

       **Ce qui reste, et qui ne m'appartient pas.** Il faut, sur l'instance de
       production : planifier `scripts/sauvegarde.sh` (la ligne de `crontab` est
       dans `DEPLOYMENT.md` § 5), poser `OASIS_SAUVEGARDES_DIR` si les archives
       ne vont pas dans `./sauvegardes`, et brancher l'alerte de l'hébergeur sur
       `"niveau":"erreur"`. Puis **restaurer une archive une fois** : une
       sauvegarde jamais restaurée est une hypothèse, pas une protection — et
       c'est la seule partie que ni la sonde ni moi ne pouvons faire à votre
       place. Le point reste donc ouvert jusqu'à ce constat.
5. [x] ~~Rouvrir cet ADR à la réception de la spécification.~~ — fait le
       26 septembre 2026.
6. [x] ~~**Trancher l'arbitrage n° 1**~~ — rendu le 26 septembre 2026 :
       **chemin B, Spring Boot puis PostgreSQL**. Voir
       [ADR-002](ADR-002-migration-spring-boot.md). Plus rien n'est ouvert ici.
