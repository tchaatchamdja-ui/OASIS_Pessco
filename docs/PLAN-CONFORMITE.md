# Plan de mise en conformité à la fiche technique URSAC/GT2

**État des lieux de référence :** [CONFORMITE-FICHE-TECHNIQUE.md](CONFORMITE-FICHE-TECHNIQUE.md)
**Date :** 26 septembre 2026
**Statut :** proposition — les arbitrages de la section 2 appartiennent au GT2

---

## 1. La décision qui gouverne tout le reste

**La question « migrer vers Java 21 / Spring Boot » et la question « basculer sur
PostgreSQL » sont la même question.** C'est le fait le plus utile de ce document, et il n'est
pas évident.

[ADR-001](ADR-001-magasin-de-donnees.md) a différé PostgreSQL pour une raison précise :
`store.load()` et `store.save()` sont **synchrones**, aucun client PostgreSQL ne l'est, et
rendre le magasin asynchrone rend asynchrone **450 accès dont 381 dans les modules**. Un
`await` oublié y rend une promesse là où un tableau est attendu — sans erreur, sans trace.

**En Java, ce problème n'existe pas.** JDBC et JPA sont bloquants par conception, sur un pool
de threads. La conversion asynchrone qui bloque PostgreSQL aujourd'hui **disparaît** si le
backend est réécrit en Spring Boot.

| Chemin | Ce qu'il coûte | Ce qu'il ferme dans la fiche |
|---|---|---|
| **A.** PostgreSQL en Node | 450 accès à convertir, **risque élevé** sur des actes de surveillance. 3 à 6 semaines + stabilisation | La couche « base de données » seule |
| **B.** Spring Boot **puis** PostgreSQL | 4 à 7 mois (un développeur), 3 à 4 (deux) | **Deux couches du §3.2**, les cinq atouts du §4, les transactions, le typage, et l'écart le plus visible au TDR |

Le coût marginal de B par rapport à A est bien plus faible qu'il n'y paraît, **parce que A est
de toute façon dû** et que A est le chemin risqué. Si le backend doit un jour être en Java,
le faire **avant** PostgreSQL et non après évite de payer deux fois.

> **Arbitrage n° 1 — RENDU le 26 septembre 2026 : chemin B, Spring Boot puis PostgreSQL.**
> Consigné par [ADR-002](ADR-002-migration-spring-boot.md), qui porte le séquencement, les
> cinq points durs et leurs parades. Le premier jalon — les contrats d'octets de scrypt et de
> la chaîne d'audit — est **fait** et gardé par trois contrôles.

---

## 2. Ce qui ne peut pas être fait — et pourquoi

Cette section est la plus importante du document. Elle sépare **ce qui est impossible** de ce
qui est seulement **coûteux**, et dit ce qui reste faisable dans chaque cas.

### 2.1 Hors du code — actes institutionnels ou juridiques

Aucun développement ne les produit. Ils appartiennent au responsable de traitement, à la
Commission ou aux États.

| Exigence | Pourquoi c'est hors de portée | Ce qui *est* faisable ici |
|---|---|---|
| **Test d'intrusion indépendant** avant recette (§2) | Exige par définition un tiers extérieur au projet | Préparer le périmètre, l'environnement de test, et corriger ce qu'il rapportera |
| **Désignation des DPO** (par AAC + coordination Commission) | Acte institutionnel | — |
| **AIPD** avant mise en production (obligatoire pour le module médical) | Doit être conduite par le responsable de traitement | Fournir la trame et toutes les données techniques qu'elle réclame |
| **Accord-cadre de partage** entre les huit États et la Commission | Acte juridique | Écrire les exigences techniques qu'il devra porter |
| **Procédure de notification des violations** aux autorités nationales | Organisationnel | Écrire la procédure et la sonde qui la déclenche |
| **Hébergement sur les infrastructures propres de chaque AAC** | Décision et budget de chaque État | **Déjà faisable** : Docker + `OASIS_DATA_DIR` le permettent aujourd'hui |
| **Serveur de temps synchronisé** (§3.3) | Infrastructure | Poser le code qui horodate depuis une source déclarée et **refuse de démarrer** si elle est absente |

### 2.2 Bloqué faute de spécification ou d'accès — pas impossible, indisponible

| Exigence | Ce qui manque | Ce qui est faisable **dès maintenant** |
|---|---|---|
| **OACI iSTARs** (§2, interopérabilité) | Identifiants, spécification d'API, accord avec l'OACI | Définir le **contrat d'adaptateur**, livrer le bouchon et ses contrôles |
| **OLF** | Idem | Idem |
| **Services de paiement par État** (D.10) | Huit fournisseurs, huit contrats, huit jeux d'identifiants | Définir le contrat d'adaptateur commun et un bouchon par État |

Pour ces trois, le travail faisable aujourd'hui vaut la peine : le jour où la spécification
arrive, **le branchement est d'une journée** au lieu d'un chantier.

### 2.3 Possible, mais c'est un arbitrage avant d'être un chantier

Ces briques remplaceraient du code qui fonctionne par un **service de plus à exploiter**. La
fiche elle-même rappelle que *« les équipes IT des AAC sont réduites »* — et c'est l'argument
qu'elle donne pour écarter les microservices. Le même argument s'applique ici.

| Brique | Remplace | Mon avis |
|---|---|---|
| **MinIO** (S3 versionné) | pièces jointes en base64 dans les enregistrements JSON | **À faire.** C'est le point faible réel du magasin actuel : les pièces gonflent les fichiers et ne sont pas versionnées |
| **Keycloak** (OIDC) | `src/auth.js` | **À arbitrer.** Les fonctions attendues sont toutes présentes et éprouvées. Le gain est la conformité et la fédération d'identité ; le coût est un service critique de plus par AAC |
| **Prometheus + Grafana** | `src/trace.js` + `/api/health` | **À arbitrer.** Deux services de plus. Le SLA 99,5 % du §F.4 se mesure difficilement sans eux |
| **K3s** | déploiement Docker simple | **Déconseillé.** Un orchestrateur pour un nœud unique par État : coût d'exploitation réel, bénéfice faible |
| **Camunda / Flowable** (BPMN) | moteur de processus écrit à la main | **À arbitrer, en dernier.** Le plus lourd des cinq, et celui dont le code actuel s'acquitte le mieux |
| **React + TypeScript** | 63 434 lignes de front sans cadre | **Tranché le 3 octobre 2026 : on y va** — [ADR-003](ADR-003-cadre-du-frontend.md). L'avis ci-dessous était technique et sa mesure juste ; la conformité à la fiche est une exigence de la maîtrise d'ouvrage, non un arbitrage d'ingénierie. *Avis d'alors : déconseillé — réécriture complète, aucun gain fonctionnel, l'offline-first ne l'exige pas.* |

> **Arbitrage n° 2 attendu du GT2 :** lesquelles de ces six briques sont exigées à la recette,
> et lesquelles peuvent être remplacées par une équivalence fonctionnelle documentée ?

---

## 3. Ce qui peut être fait, ici, dans le code

Tout ce qui suit ne dépend d'aucune décision extérieure. Les estimations sont en
jours-développeur et supposent la suite de 702 contrôles maintenue au vert à chaque étape.

| # | Chantier | Ferme | Effort |
|---|---|---|---|
| 1 | **Registre des traitements** par module | §5 | 2 j *(document)* |
| 2 | **Journalisation des consultations** de données sensibles | §5 | 2–3 j |
| 3 | **Durées de conservation** paramétrables + purge automatisée | §5 | 4–5 j |
| 4 | **Pseudonymisation** des tableaux de bord et exports d'analyse | §5 | 3–4 j |
| 5 | **Horodatage** depuis une source de temps déclarée | §3.3 | 1–2 j |
| 6 | **Chiffrement au repos** — applicatif sur fichiers, `pgcrypto` sur PostgreSQL | §2, §5 | 3–5 j |
| 7 | **Versionnage documentaire** — avec ou sans MinIO | §3.2 | 5–8 j |
| 8 | **Bascule PostgreSQL** | §3.2, §3.3, §4 | *voir §1* |
| 9 | **Une base par État** (isolation physique) | §3.3 | 5–8 j *(après 8)* |
| 10 | **Réplication logique asynchrone** vers le central + API d'échange | §2, §3.3 | 15–20 j *(après 8)* |
| 11 | **Row-Level Security** | §4 | 3–5 j *(après 8)* |
| 12 | **Offline-first** : manifeste, service worker, cache, file d'écritures différées | §2 | **15–20 j** |
| 13 | **Adaptateurs iSTARs / OLF / paiement** (contrats + bouchons) | §2 | 5–8 j |
| 14 | Les **six modules TDR restants** (D.1, D.2, D.3, D.4, D.5, D.9, D.10) | couverture | *hors conformité d'architecture* |

---

## 4. Le plan, en vagues

### Vague 0 — Sans regret, immédiate — **✅ FAITE le 26 septembre 2026**

Chantiers **1, 2, 3, 4, 5**. Ce qui est dû quelle que soit la suite, et que rien ne rend
caduc : le registre est un document, les trois autres sont des règles métier que leurs
contrôles protègent et qui se réécrivent en une journée dans n'importe quel langage.

**Et rouvrir [ADR-001](ADR-001-magasin-de-donnees.md)** — fait. Sa suite n° 1 — *« obtenir la
spécification de la réplication auprès de l'URSAC »* — est **déjà répondue** par la fiche du
2 août : réplication logique PostgreSQL asynchrone, tolérante aux coupures, vers un serveur
central de sauvegarde. ADR-001 a été écrit sans cette réponse ; son raisonnement tombe.

*Ferme les quatre écarts les plus visibles du §5 — le bloc que tout auditeur regarde en premier.*

**Ce qui a été livré**

| Chantier | Livrable | Contrôles |
|---|---|---|
| 1 — Registre des traitements | [REGISTRE-DES-TRAITEMENTS.md](REGISTRE-DES-TRAITEMENTS.md), 13 traitements | 1 garde : un module monté absent du registre fait échouer la suite |
| 2 — Journalisation des consultations | `src/consultations.js` | 5 |
| 3 — Conservation et purge | `src/retention.js`, `GET /api/retention`, `POST /api/retention/purger` | 11 |
| 4 — Pseudonymisation | **sans objet aujourd'hui** — garde posée | 2 |
| 5 — Horodatage | `src/horloge.js`, client SNTP sans dépendance | 3 |

**702 → 724 contrôles** (+22). Toutes les gardes ont été contre-éprouvées : réintroduire le défaut
les fait tomber.

**Le chantier 4 mérite un mot.** La fiche demande la pseudonymisation « dans les tableaux de
bord statistiques et les exports d'analyse ». Vérifié en service : **il n'y a rien à
pseudonymiser** — les agrégats se font par État, domaine, secteur et exploitant, jamais par
personne. Écrire un moteur de pseudonymisation que rien n'appellerait aurait été du code mort.
Ce qui est livré à la place est le **garde** qui ausculte les réponses des tableaux de bord et
tombe dès qu'un courriel, un prénom, un identifiant de compte ou un téléphone y paraît. Le jour
où un axe « par inspecteur » sera ajouté, il le dira — et c'est à ce moment-là que le moteur
s'écrira, pour un besoin réel.

### Vague 1 — Le socle — **chemin B retenu, 4 à 7 mois** *(voir [ADR-002](ADR-002-migration-spring-boot.md))*

Chantier **8**, par le chemin A ou B. Si B, le strangler fig module par module, du plus petit
au plus gros — DROITS (20 contrôles), PR (23), PLAN (53), CARE (62), SURV (103), RAMP (299),
socle en dernier. **621 des 702 contrôles se rejouent tels quels** contre le nouveau backend :
ils passent par HTTP avec session et n'appellent aucune fonction interne. C'est le cahier de
recette de la migration, et il existe déjà.

*Ferme la couche « base de données » du §3.2, les cinq atouts du §4, et — si B — la couche
« backend applicatif ».*

### Vague 2 — Souveraineté *(≈ 6 semaines, après la vague 1)*

Chantiers **9, 10, 11, 6**. Une base par État, la réplication vers le central, la sécurité au
niveau des lignes, le chiffrement au repos.

*Ferme le §3.3 en entier et la contrainte structurante n° 1.*

### Vague 3 — Offline-first — **✅ FAITE le 26 septembre 2026**

Chantier **12**, en commençant par **RAMP** — le module de terrain déjà livré — puis SURV.
Elle peut être menée **en parallèle** des vagues 1 et 2 : elle ne touche que le front, qui ne
bouge pas si le contrat REST est tenu.

*Ferme la contrainte structurante n° 3, le seul manque purement fonctionnel.*

**Ce qui a été livré**

| Pièce | Rôle |
|---|---|
| `public/sw.js` | Sert les écrans déjà vus. Trois régimes : navigation réseau d'abord, ressources cache d'abord, lectures d'API réseau d'abord avec repli marqué. Les écritures n'y passent jamais. |
| `public/shared/js/oasis-hors-ligne.js` | La file des écritures différées (IndexedDB), son rejeu ordonné, et le bandeau. |
| `public/manifest.webmanifest` + icônes 192/512 | L'application s'installe sur l'écran d'accueil. |
| RAMP et SURV | Les deux modules de terrain, branchés. |

**La décision qui gouverne ce chantier : une liste d'autorisation, pas une liste d'exclusion.**
Différer la saisie d'une fiche d'inspection est le but du mode dégradé. Différer une
validation, une transmission à l'exploitant ou une clôture d'écart serait autre chose : ce
sont des actes d'autorité, pris par quelqu'un qui décide, à un moment qui compte. Les rejouer
trois heures plus tard sur un dossier qui a bougé, c'est signer à l'aveugle. Seules six
écritures de saisie sont admises ; **ce qu'on oublie d'inscrire est refusé**, et un contrôle
de source arrête quiconque y ajouterait un verbe de circuit.

**Ce qui est assumé et écrit.** Une écriture différée rend un 202, et l'écran affichera
« enregistré ». C'est vrai pour l'agent — sa saisie est retenue — mais pas encore pour le
serveur. Cet écart ne se rattrape pas au cas par cas sur des centaines d'appels : il se
rattrape par le bandeau, qui reste tant qu'il y a quelque chose en attente et qui dit combien.
Un rejeu refusé ne disparaît jamais : il passe en « à reprendre » avec sa date de saisie et la
raison du refus. Perdre une saisie de terrain en silence serait le pire défaut possible.

**Huit contrôles dans la suite « parcours », réseau réellement coupé** (`setOfflineMode`) —
c'est le seul endroit de la suite où cela soit possible. Plus deux gardes de source.
**724 → 734 contrôles.**

### Vague 4 — Les briques d'infrastructure *(arbitrage n° 2)*

Chantier **7** (MinIO) d'abord — il corrige un vrai défaut. Puis, selon l'arbitrage :
Keycloak, Prometheus/Grafana, Camunda.

### Vague 5 — Les six modules TDR restants

Hors conformité d'architecture. C'est le gros du produit qui reste à écrire, et l'architecture
modulaire est justement ce qui permet de l'ajouter sans refonte.

---

## 5. Ce que chaque vague rapporte

Sur **35 prescriptions vérifiables** de la fiche (§2, §3.2, §3.3, §4, §5) :

| Étape | Conformes | Partielles | Non conformes |
|---|---|---|---|
| **Aujourd'hui** | **4** | 5 | 26 |
| Après vague 0 | 8 | 5 | 22 |
| Après vague 1 *(chemin B)* | 15 | 4 | 16 |
| Après vague 2 | 21 | 2 | 12 |
| Après vague 3 | 23 | 2 | 10 |
| Après vague 4 *(toutes briques)* | **28** | 2 | 5 |

Les cinq irréductibles sont ceux de la section 2.1 — actes institutionnels et juridiques. Le
sixième, React/TypeScript, ne l'est plus : la maîtrise d'ouvrage l'a tranché le 3 octobre 2026
([ADR-003](ADR-003-cadre-du-frontend.md)), et il se ferme module par module. Ce document
conserve l'avis contraire qu'il portait — il était technique, et sa mesure du volume était
juste ; ce qu'il n'avait pas à trancher, c'est l'exigence.

**Aucun chemin ne mène à 35 sur 35 par le code seul.** C'est une conclusion, pas un aveu : une
fiche technique de ce niveau décrit autant une organisation qu'un logiciel.

---

## 6. Ce que j'attends du GT2 pour commencer

1. **Arbitrage n° 1** — chemin A (PostgreSQL en Node) ou B (Spring Boot puis PostgreSQL) ?
2. **Arbitrage n° 2** — quelles briques d'infrastructure sont exigées à la recette, et
   lesquelles acceptent une équivalence fonctionnelle documentée ?
3. **Une date de recette**, qui décide de ce qui entre dans les vagues et de ce qui attend.

En l'absence de ces réponses, **la vague 0 peut démarrer aujourd'hui** : elle ne dépend
d'aucun arbitrage, elle ferme les écarts les plus exposés, et rien de ce qu'elle produit n'est
perdu si le chemin B est retenu ensuite.
