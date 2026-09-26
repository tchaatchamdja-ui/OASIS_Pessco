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
> réplication ») n'a plus d'objet, son préalable étant levé. La décision se
> reporte sur le chemin de la bascule, arbitrage n° 1 de
> [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md) — PostgreSQL en Node, ou Spring Boot
> puis PostgreSQL.
>
> Un fait découvert depuis, et qui pèse sur cet arbitrage : **la difficulté que
> cet ADR décrit — 450 accès synchrones à convertir — n'existe pas en Java**,
> où JDBC bloque par conception. Les deux questions n'en font qu'une.

**Statut :** ~~Proposé~~ — **rouvert, en attente de l'arbitrage n° 1 du GT2**
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
2. [x] **Écrire la contrainte d'un seul processus par instance** — faite
       (`src/verrou.js`). Le serveur pose un `.verrou` dans le répertoire de
       données et refuse de démarrer si un autre le tient ; un verrou laissé par
       un arrêt brutal est repris, celui d'une autre machine est refusé faute de
       pouvoir le vérifier. Huit contrôles, et le geste dans `DEPLOYMENT.md`.
3. [ ] **Éprouver `src/store_pg.js` contre un vrai PostgreSQL** — il n'a tourné
       que contre une base de papier. Trois commandes dans
       `docs/MAGASIN-POSTGRESQL.md`.
4. [ ] **Vérifier la planification des sauvegardes** sur l'instance de
       production (`scripts/sauvegarde.sh`), seule protection en l'absence de base.
5. [x] ~~Rouvrir cet ADR à la réception de la spécification.~~ — fait le
       26 septembre 2026.
6. [ ] **Trancher l'arbitrage n° 1** de [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md) :
       PostgreSQL en Node (3 à 6 semaines, risque élevé sur 450 accès), ou
       Spring Boot puis PostgreSQL (4 à 7 mois, et la conversion asynchrone
       disparaît). C'est désormais la seule question ouverte ici.
