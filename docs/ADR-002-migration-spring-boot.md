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

Étranglement progressif, une passerelle en tête qui route par préfixe. **Du plus petit au plus
gros**, pour que les erreurs se paient sur les petits :

| Ordre | Module | Contrôles qui le gardent |
|---|---|---|
| 1 | DROITS | 20 |
| 2 | PR — Profils de Risque | 23 |
| 3 | PLAN — Plans de Surveillance | 53 |
| 4 | CARE — Mesures d'Application | 62 |
| 5 | SURV — Exécution de la Surveillance | 103 |
| 6 | RAMP — Inspections sur aire de trafic | 299 |
| 7 | **Le socle** (authentification, comptes, référentiels, audit) | 59 + 17 |

À chaque étape, la suite du module doit passer **contre le Java** avant que la route ne bascule.
L'application reste servie sans interruption.

PostgreSQL entre au moment du socle, ou plus tôt si un module migré en a besoin : en Java, c'est
une dépendance, non un chantier.

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
2. [ ] **Éprouver les vecteurs en Java** — un projet minimal, sans Spring, qui ne fait que
       satisfaire les deux contrats. **C'est le premier jalon, et il conditionne tout le
       reste** : si scrypt ne se reproduit pas, le plan change (réinitialisation générale des
       mots de passe, à décider avant de commencer).
3. [ ] **Choisir l'outil de construction** (Maven ou Gradle) et la disposition du dépôt :
       monodépôt avec `backend-java/` à côté de l'existant, ou dépôt séparé.
4. [ ] **Monter la passerelle** de routage par préfixe, avec bascule route par route.
5. [ ] **Rendre la suite de fumée exécutable contre une base quelconque** — elle lance
       aujourd'hui `server.js` elle-même (`tests/smoke/harness.js`). Lui donner une adresse
       plutôt qu'un processus la rend utilisable contre le Java sans la réécrire.
6. [ ] **Migrer DROITS**, le plus petit, et mesurer le coût réel avant d'engager la suite.
7. [ ] **Acter par écrit auprès du GT2** que le frontend reste en JavaScript sans cadre.
