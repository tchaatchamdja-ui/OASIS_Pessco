# Le magasin PostgreSQL — état, et ce qui reste

*ARCH-01 de l'audit du 24 septembre 2026.*

Depuis l'origine, `src/store.js` porte en tête : « Production : remplacée par
PostgreSQL 16 ». L'application sert aujourd'hui six modules sur des fichiers
JSON. Ce document dit ce qui est fait, ce qui ne l'est pas, et pourquoi.

## Ce qui est fait

**Le magasin PostgreSQL existe et tient le contrat** (`src/store_pg.js`).

Deux tables, et pas une de plus :

| Table | Rôle |
|---|---|
| `collections (nom, valeur JSONB, maj)` | Une collection sous son nom. `load` la lit, `save` la remplace en une instruction. |
| `journal (nom, ordre BIGSERIAL, entree JSONB)` | Une entrée d'audit par ligne, insérée, jamais réécrite. |

Ce que des fichiers ne peuvent pas donner, et que la base donne :

- **Écriture atomique** sans fichier temporaire ni renommage ;
- **accès concurrent** : deux processus servant la même base ne se perdent plus
  l'un l'autre — aujourd'hui, la dernière écriture écrase l'autre en silence ;
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
mêmes gestes : c'est ce qui les empêchera de diverger.

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

### Recommandation

Le chemin 1, module par module, quand la réplication vers le serveur central
devient une échéance — c'est elle qui rend la base nécessaire, non la
performance. D'ici là, le magasin et sa reprise sont écrits, éprouvés et
attendent ; les fichiers tiennent.

## Éprouver la base pour de bon

Les six contrôles emploient une base de papier : elle dit le contrat et le SQL,
non le serveur — ni les types, ni les verrous, ni le réseau. **Le code n'a pas
encore tourné contre un vrai PostgreSQL**, faute d'en avoir un ici. Pour le
faire :

```bash
docker run -d --name oasis-pg -e POSTGRES_PASSWORD=essai -p 5432:5432 postgres:16
export DATABASE_URL='postgres://postgres:essai@localhost:5432/postgres'
node scripts/migrer-pg.js --verifier
```

La reprise crée les tables, copie tout et compare. C'est la première chose à
faire avant d'envisager la bascule.
