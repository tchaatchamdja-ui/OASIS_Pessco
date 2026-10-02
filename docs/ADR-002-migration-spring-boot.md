# ADR-002 : Réécriture du socle en Java 21 / Spring Boot, puis bascule PostgreSQL

**Statut :** **Accepté** — 26 septembre 2026
**Décideurs :** maîtrise d'ouvrage OASIS (arbitrage n° 1 de [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md))
**Remplace :** la question laissée ouverte par [ADR-001](ADR-001-magasin-de-donnees.md), rouvert le 26 septembre
**Fonde :** [fiche technique URSAC/GT2](CONFORMITE-FICHE-TECHNIQUE.md) du 2 août 2026, §3.2

---

## Contexte

La fiche technique prescrit un **backend API REST en Java 21 / Spring Boot** et **PostgreSQL 16**.
Le livré est en Node/Express sur un magasin de fichiers JSON. Sur les dix couches techniques du
§3.2, une seule est conforme ; ces deux lignes-là sont les plus visibles de l'écart.

ADR-001 avait différé PostgreSQL, au motif que la réplication n'était pas spécifiée. **Elle
l'était** — §3.3 de la fiche, sept semaines plus tôt. Cet ADR est donc caduc, et la question
revient entière.

### Le fait qui décide

**La question « Java » et la question « PostgreSQL » n'en font qu'une.**

ADR-001 mesure précisément ce qui bloque PostgreSQL : `store.load()` et `store.save()` sont
**synchrones**, aucun client PostgreSQL ne l'est, et **450 accès** en dépendent — dont 381 dans
les modules. Un `await` oublié y rend une promesse là où un tableau est attendu, sans erreur ni
trace, sur des actes de surveillance.

**En Java, ce problème n'existe pas.** JDBC et JPA sont bloquants par conception, sur un pool de
threads. La conversion asynchrone — le poste de risque le plus élevé du chemin Node —
**disparaît**.

| | Chemin A : PostgreSQL en Node | Chemin B : Spring Boot puis PostgreSQL |
|---|---|---|
| Durée | 3 à 6 semaines + stabilisation | 4 à 7 mois (1 dév.), 3 à 4 (2 dév.) |
| Risque | **Élevé** — 450 accès, échec silencieux | Maîtrisé — le compilateur et 621 contrôles |
| Ferme dans la fiche | 1 couche | **2 couches + les 5 atouts du §4** |
| Transactions | Non | Oui (`@Transactional`) |
| Typage | Non | Oui |
| Maintenance par les AAC | Node | **Java — ce qu'elles recrutent** |

Le coût marginal de B sur A est bien plus faible qu'il n'y paraît, **parce que A est de toute
façon dû**, et que A est le chemin risqué.

---

## Décision

**Réécrire le socle et les modules en Java 21 / Spring Boot, module par module, par
étranglement progressif — puis basculer sur PostgreSQL 16, ce que la réécriture rend presque
gratuit.**

Le front n'est pas touché : 62 979 lignes de JavaScript sans cadre parlent au serveur par
`/api/…` et ne verront rien, tant que le contrat REST est tenu. **React + TypeScript, que la
fiche prescrit au §3.2, n'entre pas dans cette décision** — c'est une réécriture de 63 000
lignes sans gain fonctionnel, et le mode dégradé livré en vague 3 ne l'exige pas.

---

## Ce qui rend cette migration praticable

**Le cahier de recette existe déjà.** Sur 734 contrôles, **621 passent par HTTP avec session**
et n'appellent aucune fonction interne : 604 des suites métier, 17 du parcours navigateur. Ils
se rejouent tels quels contre le backend Java et disent, route par route, si le contrat est
tenu. La plupart des migrations n'ont pas cela.

**Le schéma cible est écrit et éprouvé.** `src/store_pg.js` et `scripts/migrer-pg.js` ont repris
les données réelles — 14 collections, 3 203 entrées de journal, chaîne vérifiée après reprise.

**Les modules sont cloisonnés par préfixe d'API** (`/api/m/ramp/…`), ce qui permet de remplacer
un module sans toucher aux autres.

---

## Les cinq points durs, et leur parade

### 1. La chaîne SHA-256 du journal d'audit — le risque n° 1

Une sérialisation qui diffère d'un espace, d'un ordre de clés ou d'un échappement fait déclarer
**faux tout l'historique** par `verifyChain()`. La garantie du §F.3 tombe, et elle tombe sur les
données existantes.

Le piège n'est pas théorique. `JSON.stringify` de JavaScript place **les clés entières devant,
triées numériquement** : `{b, 10, a, 2, 1}` se sérialise `{"1","2","10","b","a"}`. Un
`LinkedHashMap` Java rendrait l'ordre d'insertion, et romprait la chaîne.

**Parade — sceller, ancrer, repartir.** À l'instant où le rédacteur d'un journal change, ce
journal est vérifié une dernière fois sous Node, son empreinte finale est consignée comme
**ancre**, et Java repart de cette ancre avec une forme canonique déclarée
(**RFC 8785 / JSON Canonicalization Scheme**, pour laquelle il existe des bibliothèques Java).
L'historique reste vérifiable par l'outil Node, archivé avec lui.

Cette règle s'applique **par journal**, à la date où son rédacteur change — jamais deux
rédacteurs sur une même chaîne.

*Pourquoi pas reproduire la sémantique JavaScript en Java ?* C'est faisable, et les vecteurs
ci-dessous le rendraient même testable. Mais ce serait une contrainte permanente sur un système
qui vivra des années : chaque nouvel objet de détail devrait se sérialiser comme le ferait
JavaScript. Le sceau coûte une ligne d'explication à un auditeur ; l'autre coûte une vigilance
sans fin.

### 2. scrypt — la panne qui ne dit rien

`crypto.scryptSync(password, salt, 64)`, paramètres par défaut de Node : **N=16384, r=8, p=1**.
Et le piège : Node reçoit le sel **en chaîne** et l'encode en UTF-8 — les octets salés sont les
**32 caractères ASCII de l'hexadécimal**, non les 16 octets qu'il représente. Une implémentation
qui décode l'hexadécimal produit un tout autre condensé, et **refuse tout le monde**, sans un
message d'erreur.

**Parade — les vecteurs de conformité**, décrits ci-dessous.

### 3. Puppeteer / Chromium pour le rendu PDF

Aucun équivalent Java. Deux voies : garder un micro-service Node pour le seul rendu, ou refaire
les gabarits sur un moteur Java. **Recommandé : garder le micro-service** — il est isolé
(`src/pdf.js`), il fonctionne, et le réécrire n'apporte rien à la conformité.

### 4. Les classeurs tableur

Apache POI est solide et couvre le besoin, mais les classeurs stylés (`xlsx-js-style`) sont à
réécrire. Six fichiers concernés. Sans difficulté, mais sans raccourci.

### 5. Manifestes de module et bus de services

`module_loader.js` découvre les modules à chaud. En Spring, ce sont des `@Configuration` et le
contexte d'application — plus rigide, plus solide. **À repenser, non à traduire.**

---

## Les vecteurs de conformité — la recette d'entrée du Java

Les deux premiers points durs sont désormais **figés en contrat vérifiable** :

- `scripts/vecteurs-conformite.js` — produit et vérifie les vecteurs
- `tests/conformite/vecteurs.json` — les paramètres, les règles de sérialisation, et des cas
  choisis pour ce qu'ils cassent : accents, barre oblique non échappée, caractère hors du plan
  multilingue de base, **ordre des clés entières**, guillemets et commandes

Trois contrôles de la suite « unitaires » les tiennent : que les vecteurs décrivent bien le
calcul, et que **le code en service** produise bien ce qu'ils annoncent. Contre-éprouvés — un
séparateur changé d'un caractère, un sel décodé au lieu d'être pris tel quel : les deux
tombent.

**Le jour où le Java existe, il doit satisfaire ces vecteurs avant d'écrire une seule ligne de
route.** Ils ont été écrits avant lui, et c'est leur raison d'être.

---

## Le séquencement

*Revu le 28 septembre 2026 par le jalon n° 7 : le magasin passe en tête. La séquence
ci-dessous supposait des modules indépendants ; le jalon n° 6 a montré qu'ils partagent un
noyau et un magasin sans verrou, et qu'un seul runtime peut donc écrire.*

Étranglement progressif, une passerelle en tête qui route par préfixe. **Du plus petit au plus
gros**, pour que les erreurs se paient sur les petits :

| Ordre | Module | Contrôles qui le gardent |
|---|---|---|
| **0** | **Le magasin — bascule sur PostgreSQL** | 12 (suite « magasin-pg ») |
| 1 | DROITS | 20 |
| 2 | PR — Profils de Risque | 23 |
| 3 | PLAN — Plans de Surveillance | 53 |
| 4 | CARE — Mesures d'Application | 62 |
| 5 | SURV — Exécution de la Surveillance | 103 |
| 6 | RAMP — Inspections sur aire de trafic | 299 |
| 7 | **Le socle** (authentification, comptes, référentiels, audit) | 59 + 17 |

À chaque étape, la suite du module doit passer **contre le Java** avant que la route ne bascule.
L'application reste servie sans interruption.

~~PostgreSQL entre au moment du socle, ou plus tôt si un module migré en a besoin : en Java,
c'est une dépendance, non un chantier.~~ — **faux, et corrigé par le jalon n° 7.** PostgreSQL
est une dépendance en Java ; il est un chantier en Node, où 450 appels synchrones deviennent
asynchrones et où le geste lire-modifier-réécrire perd la garantie que lui donnait justement
d'être synchrone. Le magasin passe donc en tête, et non au moment du socle.

---

## Conséquences

**Ce qui devient plus facile**
- Transactions sur plusieurs entités — aujourd'hui inexistantes, et c'est le manque que l'on
  défendrait le moins devant un auditeur.
- Vérification à la compilation sur 18 000 lignes qui n'en ont aucune.
- Row-Level Security, `pgcrypto`, réplication logique native : les cinq atouts du §4.
- **Maintenance par les équipes des AAC**, qui recrutent en Java. C'est probablement la vraie
  raison d'être de la prescription.

**Ce qui devient plus difficile**
- Deux runtimes cohabitent pendant plusieurs mois : deux déploiements, deux jeux de journaux,
  une passerelle à tenir.
- Le rendu PDF reste en Node — une dépendance de plus à exploiter.
- Le front reste en JavaScript sans cadre : l'écart au §3.2 sur le frontend demeure, et doit
  être assumé par écrit auprès du GT2.

**Ce qu'il faudra revoir**
- Si le GT2 exige aussi React + TypeScript : c'est un second chantier, de même ampleur, et il
  doit faire l'objet de son propre ADR.
- Si un module migré devait écrire dans un journal encore tenu par Node : **interdit** — voir la
  règle du sceau ci-dessus.

---

## Suites

1. [x] **Figer les contrats d'octets** — fait : `scripts/vecteurs-conformite.js`,
       `tests/conformite/vecteurs.json`, trois contrôles, contre-éprouvés.
2. [x] **Éprouver les vecteurs en Java** — **fait le 26 septembre 2026**
       ([`conformite-java/`](../conformite-java/README.md)). JDK 21, Bouncy Castle 1.78.1,
       Jackson pour la seule lecture ; quatre tests, zéro échec, contre-éprouvés tous les deux.

       > **Les deux contrats se reproduisent.** Conséquence directe pour le plan :
       > **aucune réinitialisation générale des mots de passe n'est nécessaire**, et la chaîne
       > d'audit existante reste reproductible — le sceau recommandé ci-dessus devient un
       > choix d'ingénierie, non une contrainte subie.

       Les deux moitiés — vecteurs à jour côté Node, contrats satisfaits côté Java — tournent
       en intégration continue.
3. [~] **Choisir l'outil de construction et la disposition du dépôt.** Le jalon n° 2 a
       tranché par l'usage : **Maven**, en monodépôt. `conformite-java/` en est le premier
       occupant ; le socle prendra `backend-java/` à côté. À confirmer formellement avant
       d'engager le module DROITS.
5. [x] **Rendre la suite de fumée exécutable contre une adresse** — **fait le 26 septembre
       2026**. `OASIS_SMOKE_BASE=http://… npm run smoke -- <suite>` : le harnais ne démarre
       alors rien et s'adresse à ce qui écoute là.

       | Suite | Contre une adresse | Hors de portée |
       |---|---|---|
       | socle | 56 | 3 |
       | droits | 20 | — |
       | profil-risque | 22 | 1 |
       | planification | 50 | 3 |
       | execution (SURV) | 103 | — |
       | mesures (CARE) | 62 | — |
       | ramp | 294 | 5 |
       | parcours (navigateur) | 25 | — |
       | **Total** | **632** | **12** |

       Les 12 hors de portée lisent le disque du serveur — le reste d'un enregistrement
       effacé, un fichier de preuve. Ils ne sont ni réussis ni échoués : ils sont **déclarés**,
       et le bilan les compte à part. Les passer silencieusement gonflerait le vert d'une
       assurance qu'on n'a pas.

       Deux contrôles ont même gagné à la manœuvre : les partages et les écarts se lisent
       désormais par leur route plutôt que par le fichier — ce qui éprouve la route au passage.

       **La cible doit repartir des fixtures à chaque exécution**, et ne sert qu'une suite à la
       fois : `scripts/cible-essai.sh`. Sans cela, le second passage échoue sur un jeu de
       données déjà consommé, et l'on croit à une régression.
4. [x] **Monter la passerelle** — faite : `scripts/passerelle.js`. Une liste d'autorisation,
       encore : elle nomme ce qui est migré, et tout le reste va au Node par défaut. L'en-tête
       `X-OASIS-Servi-Par` dit qui a répondu — sans lui, un vert ne prouverait rien.

6. [x] **Migrer DROITS et mesurer le coût réel** — **fait le 26 septembre 2026**
       ([`backend-java/`](../backend-java/README.md)). Huit routes de lecture, **14 réponses
       sur 14 identiques à l'octet** à celles de Node sur les données réelles, **1 582 maillons
       SHA-256 revérifiés**, et **20/20 contrôles** à travers la passerelle. ~700 lignes de
       Java pour ~180 lignes de Node.

       > **Quatre constats qui changent la suite de cet ADR.**
       >
       > **1. DROITS n'est pas un module, c'est le noyau.** Son manifeste déclare
       > `provides: []` / `requires: []`, mais **dix-sept fichiers** du socle l'interrogent
       > pour décider ce qu'un compte peut faire dans chacun des six modules. Le couplage
       > passe par le code, non par le bus de services.
       >
       > **2. L'écriture ne peut pas basculer avant le magasin partagé.** Lire depuis Java
       > est sans danger — `store.save` écrit par renommage atomique. Écrire ne l'est pas :
       > deux écrivains se perdent l'un l'autre, et le verrou ne voit même pas le second.
       > `PUT …/users/:username` rend donc un 501 explicite et reste routé vers Node.
       >
       > **3. La session ne se rafraîchit pas depuis Java**, pour la même raison. Sans
       > conséquence tant que le portail reste servi par Node ; bloquant dès qu'un écran
       > entier passera à Java.
       >
       > **4. Ces vecteurs étaient incomplets.** La chaîne des modules scelle **six** champs,
       > non quatre. Une réécriture fiée au seul contrat du socle aurait rompu 1 582 entrées
       > en croyant avoir tout éprouvé. Corrigé — mais c'est la deuxième fois que ce chantier
       > révèle un trou dans ses propres garde-fous.

7. [x] **Trancher le séquencement, à la lumière du jalon n° 6** — **tranché le 28 septembre
       2026 : le magasin d'abord.** La séquence retenue plus haut — modules du plus petit au
       plus gros, socle en dernier — supposait des modules indépendants. Ils ne le sont pas :
       ils partagent un noyau et un magasin sans verrou. Tant que ce magasin est un répertoire
       de fichiers, **un seul runtime peut écrire**, et la migration ne peut avancer qu'en
       lecture.

       Deux voies étaient ouvertes : **(a)** migrer le socle d'abord, les modules Node
       l'interrogeant par API ; **(b)** basculer le magasin sur PostgreSQL d'abord, puis
       reprendre module par module. **La voie (b) est retenue** : elle lève la contrainte à sa
       racine au lieu de la contourner, et elle acquitte en même temps le §3.2 de la fiche
       technique.

       **Une réserve levée par la mesure, et elle corrige cette ADR.** La voie (b) était
       présentée ici comme apportant « les verrous et les transactions qu'un répertoire n'a
       pas ». C'est vrai du moteur et **faux du portage** : `src/store_pg.js` rejouait le
       contrat des fichiers — une collection entière se lit, une collection entière s'écrit —
       et deux agents qui lisent, ajoutent chacun une ligne et réécrivent en perdaient une,
       *en base exactement comme sur fichier*. Mesuré contre PostgreSQL 16.15 le 28 septembre.

       Ce que la mesure a aussi montré : si le geste est sûr aujourd'hui sur fichiers, c'est
       pour une raison que personne n'avait écrite — **`load` et `save` sont synchrones, donc
       rien ne s'intercale entre les deux**. Rendre le magasin asynchrone détruit cette
       garantie *avant même qu'un second processus existe*. La conversion en asynchrone n'est
       donc pas seulement un coût : c'est une régression de correction, à traiter comme telle.

       D'où le geste ajouté au magasin : `modifier(nom, defaut, transformer)`, lire-modifier-
       réécrire atomique par `rev` comparé à l'écriture. Cinquante écritures concurrentes,
       aucune perdue. **C'est lui, et non `save`, que la conversion devra employer partout où
       un appel lit pour réécrire.**

9. [~] **Convertir les appels du magasin, collection par collection.** 69 appels directs, 381
       par les magasins de module, 5 gestionnaires de route asynchrones sur 386. Chaque appel
       qui lit pour réécrire devient un `modifier` ; chaque suite garde sa bascule.

       **Étape A — le bus rendu asynchrone par contrat, faite le 28 septembre 2026.**

       Le graphe du bus a été relevé avant de choisir : **il n'a qu'une seule composante**.
       PLAN et SURV forment un cycle (`PLAN.plansValides` ↔ `SURV.activitesDeclenchees`), et
       `src/instances.js` consomme `volumeParInstance` de **chacun** des six modules.
       « Avancer par grappes de bus » n'est donc pas une voie intermédiaire : c'est le grand
       soir — 15 collections et 386 gestionnaires d'un coup.

       D'où cette étape, qui n'est ni l'une ni l'autre : `services.call` et `callOr` rendent
       désormais une promesse **quoi que fasse le producteur**. Faite pendant que tous les
       producteurs sont encore synchrones, elle se vérifie sous les contrôles existants —
       `await` sur une valeur qui n'est pas une promesse la rend telle quelle. Le jour de
       chaque bascule, il n'y aura plus rien à reprendre chez les consommateurs.

       | | |
       |---|---|
       | Consommations du bus converties | **7**, dans 6 fichiers |
       | Gestionnaires de route enveloppés | **57** au total |
       | Fichiers touchés | **14** |
       | Lignes | **+367 / −190** |
       | Contrôles | **757, verts — et 757 avec `OASIS_BUS_DIFFERE=1`** |

       `OASIS_BUS_DIFFERE=1` rend tout producteur asynchrone : c'est la mise en situation de
       la bascule, et **la recette de chacune des suivantes**. Deux contrôles de forme s'y
       ajoutent — aucun appel au bus consommé sans `await`, tout gestionnaire asynchrone
       enveloppé — et trois contrôles de comportement sur le contrat du bus.

       **Ce que l'étape a ouvert, et qui reste à fermer.** Les cinq suppressions gardées par
       `src/suites_care.js` — trois dans SURV, une dans RAMP, une sur les constatations —
       **vérifient auprès de CARE puis effacent**. Tant que le bus était synchrone, rien ne
       s'intercalait entre les deux gestes. Ce n'est plus vrai : entre la vérification et
       l'effacement, CARE peut avoir prononcé une mesure sur la constatation qu'on supprime.
       La vérification lit les données d'un module et l'effacement écrit celles d'un autre :
       **aucun `modifier` ne couvre les deux**. Il y faudra une transaction entre modules —
       ce que PostgreSQL donnera, et qu'un répertoire de fichiers n'a jamais donné. En
       attendant, la fenêtre est bornée (rien n'est attendu entre les deux gestes, et ces
       suppressions sont réservées aux administrateurs), et le sens du refus protège du pire :
       un `await` oublié refuserait *toutes* les suppressions au lieu de les laisser passer.

       **Étape B — les collections, par ordre croissant de propagation** : `mfa_challenges`
       (1 fichier) → les journaux (3, 2) → `emails` (5) → `users`/`sessions` (8) →
       `module_rights` (16) → `instances` (18) → `referentiels` (24) → les cinq collections
       de module.

       **`emails` passée le 29 septembre 2026.** Prise avant `mfa_challenges`, qui la
       précède par la propagation mais qu'**aucun contrôle n'exerce** — la MFA est
       désactivée dans la configuration d'essai. Convertir sans filet n'apprend rien.

       `queue()` rendant déjà une promesse, la propagation s'arrête à ses cinq appelants et
       une seule route du socle a été reprise. 5 fichiers, +98/−37 lignes. Son écriture
       dérive l'identifiant de la longueur du registre : trois envois simultanés donnent
       **trois entrées et trois identifiants distincts** avec `modifier`, **une seule** avec
       `load` puis `save`.

       Deux enseignements de plus :

       > **Le garde-fou « plus rien par `store` » a trouvé ce que rien d'autre n'aurait
       > signalé** : `src/migration_ramp.js` reprend l'origine des courriels au démarrage,
       > en lisant le fichier — qui serait resté figé au dernier jour des fichiers, sans
       > erreur. La reprise passe par la façade, et le serveur l'attend avant d'écouter.
       >
       > **Un de mes contrôles passait pour la mauvaise raison.** Les trois envois
       > concurrents passaient *avant* que `modifier` existe : un Mailpit écoutait sur le
       > port 1025 du poste, `sendMail` était joignable, et les trois envois s'espaçaient sur
       > le réseau. L'épreuve force désormais une configuration sans hôte SMTP. Troisième
       > vert vide de ce chantier — base de papier, journal vide, messagerie joignable.

       **Les journaux d'audit passés le 29 septembre 2026** — `audit` et `module_audit`, la
       plus grosse conversion du chantier et la plus haute en enjeu. 64 inscriptions dans 12
       fichiers, 21 fichiers touchés, +874/−366 lignes. Le retour de `log` n'était utilisé
       nulle part, ce qui a rendu la conversion mécanique.

       > **Le risque n'était pas l'ajout, c'était le chaînage.** Cent insertions concurrentes
       > donnent cent lignes. Mais inscrire une entrée chaînée, c'est lire la dernière, en
       > dériver l'empreinte, puis ajouter : deux inscriptions concurrentes en posent deux
       > prétendant le même prédécesseur, et **une chaîne forchée ne se répare pas**.
       >
       > **La garantie est dans le schéma, non dans un protocole.** Le premier essai posait
       > la condition dans le `WHERE` de l'insertion ; il ne protégeait rien, et vingt
       > inscriptions concurrentes l'ont montré du premier coup — un `UPDATE` verrouille la
       > ligne qu'il change, une insertion n'a **aucune ligne à verrouiller**. C'est donc un
       > index unique `(nom, cle, rang)` qui tient la chaîne. Un protocole se contourne, une
       > contrainte non : **la base refuse une chaîne forchée quel que soit le code qui
       > l'écrit, y compris le socle Java.**
       >
       > **Les garde-fous de forme ne regardaient pas `server.js`** — 1 200 lignes, la moitié
       > des inscriptions au journal, la lecture du plafond d'écritures. L'angle mort s'est vu
       > parce qu'une contre-épreuve refusait de mordre. Le contrôle élargi a aussitôt trouvé
       > un gestionnaire asynchrone sans enveloppe qui dormait là.
       >
       > **La vérification d'horloge écrivait au journal hors de la chaîne de démarrage**,
       > avant que les tables existent, et son `catch` avalait l'échec. Un contrôle de la
       > suite « socle » l'a dit — pas moi.

       Deux garde-fous de plus : toute inscription au journal est attendue, et le plafond
       d'écritures est lu avec `await` — sans quoi il rendrait une promesse toujours vraie et
       **ne se déclencherait plus jamais**, sans erreur ni trace.

       **`notifications` et `mfa_challenges` passées le 30 septembre 2026.** Les deux plus
       petites du socle — et la seconde est la plus sensible de la bascule. `verifyChallenge`
       lit le défi, incrémente son compteur d'essais, réécrit : dix codes faux lancés
       ensemble liraient tous `attempts: 0`, et **le plafond de cinq essais ne se
       déclencherait jamais**. Mesuré en processus : restes annoncés `4, 3, 2, 1, 0` avec le
       verdict arrêté dans la transformation, `4, 4, 4, 4, 4, 4, 4, 4, 4, 4` avec le compteur
       lu au-dehors.

       > **Le filet manquait, et il a été écrit d'abord.** `mfa_challenges` était la plus
       > isolée du socle depuis le début, et écartée deux fois pour cela : **aucun des
       > contrôles ne traversait l'authentification à deux facteurs**, éteinte dans la
       > configuration d'essai. Une suite lui est consacrée — 11 contrôles, son propre
       > serveur, `OASIS_MFA=1` — écrite avant la conversion.
       >
       > **Une concurrence que le réseau ne reproduit pas.** Le premier contrôle du compteur
       > passait par dix requêtes HTTP simultanées ; il passait, et ne prouvait rien. Deux
       > requêtes ne se chevauchent côté serveur que si chaque traitement dure assez
       > longtemps : mesuré, dix requêtes vers un gestionnaire retardé de 30 ms se chevauchent
       > à dix, vers celui-ci elles s'enchaînent. La preuve est passée en processus.
       > Cinquième vert vide de ce chantier.

       **Première collection passée le 28 septembre 2026** : `ramp_aeronefs`, la nomenclature
       des aéronefs — la plus isolée qui soit encore gardée. 8 fonctions de magasin, 7 routes,
       9 fichiers touchés, +213/−109 lignes, **299 contrôles verts dans les deux régimes**.
       `src/magasin.js` porte la liste d'autorisation des collections migrées et sert les deux
       régimes ; sans `DATABASE_URL`, tout reste sur fichiers.

       Trois enseignements qui portent sur les quatorze collections suivantes :

       > **1. L'unité de conversion n'est pas le module, c'est la grappe.** `profil_risque`
       > semblait plus isolée — un seul fichier de magasin, 23 contrôles. Mais le module
       > publie `PR.riskProfiles`, que PLAN appelle de façon synchrone : **le bus de services
       > propage l'asynchronisme**, et la conversion aurait entraîné deux modules.
       >
       > **2. L'amorçage remonte jusqu'au démarrage.** `seed()` du module, `seedAll` du
       > chargeur, puis le démarrage : le serveur attend désormais l'amorçage avant d'écouter.
       > Servir une route dont la collection n'est pas posée rendrait une liste vide, que
       > l'écran croirait.
       >
       > **3. « Vérifier puis écrire » cesse d'être sûr**, et rien ne le signale. Trois routes
       > le faisaient ; elles passent leur vérification dans la transformation de `modifier`.
       > Une traduction mécanique en `await` compile, répond juste, et perd une écriture de
       > temps à autre.

       Deux contrôles de forme ferment les portes : aucune collection migrée n'est plus lue
       par `store` — un appel oublié lirait le fichier figé, sans erreur —, et tout
       gestionnaire de route asynchrone passe par `asynchrone` — sans quoi un rejet laisse la
       requête ouverte, sans trace, Express 4 ne regardant pas la promesse.

10. [~] **Le socle Java lit PostgreSQL** — fait le 1ᵉʳ octobre 2026, et il était temps.

       **Le jalon n° 9 l'avait cassé sans que rien ne le dise.** Les journaux d'audit sont
       passés en base le 29 septembre ; `Magasin.java` lisait toujours les fichiers, et en
       régime base `module_audit.jsonl` n'existe même plus. La vérification de chaîne
       annonçait **`{valid: true, total: 0}`** — un satisfecit sur un journal vide, le pire
       mode de défaillance pour un outil d'autorité. Aucun contrôle ne l'a dit.

       `Magasin` route désormais collection par collection, et ses deux listes recopient
       celles de `src/magasin.js`. **Un contrôle de la suite « taille » compare les deux** :
       leur divergence ferait lire à Java un fichier que personne n'écrit plus.

       `DATABASE_URL` est la même variable pour les deux socles — deux adresses à tenir
       divergeraient, et chacun servirait une base différente en ayant raison de son côté. La
       traduction vers JDBC est explicite et éprouvée par 10 contrôles ; une adresse donnée
       mais incomprise **arrête le démarrage** plutôt que de servir en silence le mauvais
       régime, et le mot de passe n'apparaît dans aucun message ni aucune trace.

       | | |
       |---|---|
       | Réponses identiques à l'octet, en régime base | **14 / 14** |
       | Maillons SHA-256 revérifiés **depuis PostgreSQL** | **1 582** |
       | Suite « droits » à travers la passerelle | **20 / 20** — Java 11, Node 7 |

       **La première comparaison donnait 14/14 et ne prouvait rien** : les fixtures portent un
       `module_audit` vide, et les deux socles répondaient `total: 0`. Deuxième fois que ce jeu
       vide produit un vert creux ici.

       Ce que cela **ferme** : le point n° 2 du jalon n° 6 — « l'écriture ne peut pas basculer
       avant le magasin partagé » — n'a plus de raison d'être pour les collections migrées,
       une base ayant les verrous qu'un répertoire n'a pas. Ce qui **reste ouvert** : le point
       n° 3, la session, `sessions` n'étant pas encore migrée.

11. [x] **`users` et `sessions` migrées** — faites le 1ᵉʳ octobre 2026, et par une autre voie
       que les précédentes.

       **Une conversion mécanique aurait été une faute, et c'est mesuré.** `getUsers()` et
       `findUser()` sont appelés depuis des prédicats de rôle **synchrones** employés dans
       **101 appels et 545 chaînes de tableau** à travers les six modules : chaque
       `liste.filter(canRead)` aurait dû devenir `await Promise.all(liste.map(…))`. Plus un
       portage, une réécriture de la couche module — pour une donnée lue constamment et écrite
       une fois par semaine.

       L'annuaire est donc tenu en mémoire (`src/annuaire.js`) et **rafraîchi une fois par
       requête**, dans `requireAuth`. Garantie **plus forte** que l'ancienne : toutes les
       lectures d'une requête voient le même annuaire. Deux contrôles de forme imposent ce
       rafraîchissement — retiré, rien ne tombe et l'application servirait l'annuaire du
       dernier démarrage.

       Les douze écritures ne reportent que **les champs réellement changés**. Réécrire
       l'enregistrement entier aurait effacé le décompte de tentatives infructueuses qu'une
       connexion incrémente — et le compte aurait cessé de se bloquer. Mesuré en séquence :
       `failedAttempts` à **3** en réécrivant tout, à **4** en reportant les champs changés.

       **Ce que le régime base a révélé du harnais.** Chaque suite recevait une copie neuve de
       `data/`, mais **la base était partagée** : la suite « socle » efface un compte, les
       suivantes le cherchaient. Et **les fixtures n'entraient jamais dans la base** — trois
       comptes au lieu de quinze, aucun privilège, et les contrôles de droits rendaient des
       listes vides. Chaque suite reçoit désormais son propre schéma, garni des fixtures et
       détruit à l'arrêt ; `srv.donnees()` lit là où la donnée vit.

       | | |
       |---|---|
       | Contrôles, quatre régimes | **795** sur fichiers · **793** en base (2 hors de portée) |
       | Réponses identiques à l'octet, Node contre Java | **14 / 14** |
       | Maillons SHA-256 revérifiés depuis la base | **1 582** |
       | Suite « droits » à travers la passerelle | **20 / 20** |

       **Le point n° 3 du jalon n° 6 est levé** : une session ouverte par Node dans la base
       est reconnue par Java à travers elle. Le rafraîchissement de `lastActivity` par Java
       n'est pas écrit — mais rien ne l'empêche plus.

12. [x] **`referentiels` et `module_rights` migrées** — faites le 2 octobre 2026. Même cas que
       `users` — lues depuis des prédicats synchrones, 45 appels pour la première, quatre
       prédicats pour la seconde — donc même traitement.

       Trois mécaniques pour une seule idée auraient fait trois choses à tenir d'accord :
       celle de l'annuaire vit désormais dans **`src/instantane.js`**, qui sert les trois et
       dit en un seul endroit le compromis et ce qu'il ne garantit pas. Les trois sont relues
       **ensemble et en parallèle** — trois allers-retours enchaînés tripleraient la latence
       de chaque requête.

       > **Un `forEach` qui aurait rendu un compte faux.** L'import de référentiel par
       > classeur écrivait dans deux `forEach` imbriqués. Les écritures devenues asynchrones,
       > il les aurait **lancées sans les attendre** : feuilles parent et enfant croisées,
       > codes parents non résolvables, et un compte rendu — « 12 ajouts » — rendu avant que
       > rien ne soit écrit. Ce piège ne lève rien : il rend un chiffre faux.
       >
       > **Les lectures rendent l'instantané, non une copie** — 45 copies d'un objet de 25 Ko
       > par requête seraient coûteuses pour rien. Vérifié avant de le décider : aucun
       > appelant extérieur ne le mute. Les deux écritures internes qui mutaient leur argument
       > travaillent désormais sur une copie.

       | | |
       |---|---|
       | Contrôles, quatre régimes | **795** sur fichiers · **793** en base |
       | Node contre Java, **huit** collections en base | **14 / 14** à l'octet |
       | Maillons SHA-256 revérifiés de part et d'autre | **1 582** |
       | Suite « droits » par la passerelle | **20 / 20** |

13. [ ] **Les cinq collections de module** — `planification`, `execution`, `mesures`,
       `profil_risque`, `ramp`. C'est là que se trouvent les **381 appels** mesurés au départ,
       par les magasins de module (`db.list`, `db.get`, `db.save`). Propagation d'une autre
       nature : ces appels ne sont pas des prédicats mais le corps même des gestionnaires.

8. [ ] **Acter par écrit auprès du GT2** que le frontend reste en JavaScript sans cadre.
