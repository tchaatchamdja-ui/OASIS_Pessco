# Le socle Java — première tranche

Jalon n° 6 d'[ADR-002](../docs/ADR-002-migration-spring-boot.md) : migrer un module, **et
mesurer le coût réel** avant d'engager les six autres.

Le module choisi est « Gestion des Droits », le plus petit par le nombre de contrôles.
**Les huit routes de lecture sont servies par Java. L'écriture reste au Node.**

## Le résultat, mesuré

| | |
|---|---|
| Routes de lecture migrées | **8 / 8** |
| Réponses **identiques à l'octet** à celles de Node | **14 / 14** comparaisons, sur les données réelles |
| Maillons SHA-256 revérifiés par Java | **1 582** — PLAN 337, SURV 812, RAMP 312, CARE 121 |
| Contrôles de la suite « droits » à travers la passerelle | **20 / 20** |
| Java côté serveur | ~700 lignes pour ~180 lignes de Node |

Deux écarts au premier essai, tous deux de forme et corrigés : `/me` omettait `updatedAt` et
`updatedBy` quand un enregistrement existe, et `/audit/verify` ajoutait `brokenAt` et
`codeModule` sur une chaîne intacte — ce qui aurait fait afficher une rupture à l'entrée zéro.

## Lancer

```bash
cd conformite-java && mvn install     # les contrats d'octets, dont ce socle dépend
```

```bash
scripts/cible-essai.sh 4899           # le socle Node, sur un jeu neuf
```

```bash
OASIS_DATA_DIR=/tmp/oasis-cible-4899/data mvn spring-boot:run
```

```bash
node scripts/passerelle.js            # 4850 → Node 4899, Java 4900
```

```bash
OASIS_SMOKE_BASE=http://localhost:4850 npm run smoke -- droits
```

L'en-tête `X-OASIS-Servi-Par` dit qui a répondu. Sans lui, un 20/20 ne prouverait rien : une
table de routage mal écrite enverrait tout au Node, et tout passerait au vert.

## Ce que cette tranche a appris — et qui change la suite

### 1. DROITS n'est pas un module. C'est le noyau.

Son manifeste déclare `provides: []` et `requires: []` : par le bus de services, c'est une
feuille. **Dix-sept fichiers du socle Node l'interrogent pourtant** pour décider ce qu'un compte
peut lire et écrire dans chacun des six modules. Le manifeste ne ment pas, il ne dit
simplement pas le couplage réel — qui passe par le code, non par le bus.

Conséquence pour le séquencement d'ADR-002 : l'unité d'étranglement n'est pas « un module »,
c'est « le socle ». Tout module a besoin d'authentification, de droits, d'instances et
d'audit, et ces quatre-là sont du socle.

### 2. L'écriture ne peut pas basculer avant le magasin partagé.

`src/store.js` écrit par fichier temporaire puis renomme : **lire depuis Java pendant que Node
sert est sans danger**. Écrire ne l'est pas — lire, modifier, réécrire, et la modification de
l'autre a disparu, sans erreur ni trace. C'est la raison d'être de `src/verrou.js`, et elle ne
cesse pas parce que le second écrivain parle Java : elle empire, puisque le verrou ne le voit
même pas.

S'y ajoute la règle du sceau d'ADR-002 : deux rédacteurs sur une chaîne SHA-256 la rompent.

`PUT /:module/users/:username` rend donc un **501** explicite côté Java, et la passerelle
continue de le router vers Node. Le dire franchement vaut mieux que de le servir mal.

### 3. La session ne se rafraîchit pas depuis Java.

Node met à jour `lastActivity` à chaque requête ; Java ne peut pas, pour la même raison. Un
agent qui resterait une demi-heure sur un seul écran servi par Java verrait sa session expirer
alors qu'il travaille. Tant que le portail reste servi par Node, le cas ne se présente pas —
le portail rafraîchit. **Il faudra le régler avant qu'un écran entier passe à Java**, et la
réponse est le magasin partagé, non un second écrivain.

### 4. Les vecteurs de conformité étaient incomplets.

La chaîne du socle scelle quatre champs ; **celle des modules en scelle six** — `objet` et
`ref` s'intercalent. Les vecteurs d'ADR-002 ne portaient que la première. Une réécriture qui
s'y serait fiée aurait cru le contrat satisfait et rompu 1 582 entrées.

Corrigé : `ChaineModule` côté Java, trois cas de plus aux vecteurs, deux contrôles de plus à la
suite Node. C'est la deuxième fois que ce chantier révèle un trou dans ses propres garde-fous,
et la leçon est la même — **un contrat ne vaut que pour ce qu'il énumère**.

## Ce qu'il faut décider avant de continuer

Ces quatre constats convergent vers une question que le GT2 doit trancher :

**faut-il migrer le socle avant les modules, et PostgreSQL avant tout ?**

La séquence d'ADR-002 — modules du plus petit au plus gros, socle en dernier — supposait des
modules indépendants. Ils ne le sont pas : ils partagent un noyau et un magasin sans verrou.
Tant que ce magasin est un répertoire de fichiers, **un seul runtime peut écrire**, et la
migration ne peut avancer qu'en lecture.
