package int_.uemoa.ursac.oasis.magasin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import javax.sql.DataSource;
import org.postgresql.ds.PGSimpleDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Le magasin, lu comme Node le lit — fichier ou base, collection par collection.
 *
 * <h2>Pourquoi ce module ne sait que lire</h2>
 *
 * <p>{@code src/store.js} écrit par fichier temporaire puis renomme : un
 * lecteur concurrent ne voit donc jamais un fichier à moitié écrit, et lire
 * depuis Java pendant que Node sert est sans danger.
 *
 * <p>Écrire, en revanche, ne l'est pas. Deux processus qui lisent, modifient
 * et réécrivent le même fichier se perdent l'un l'autre : la seconde écriture
 * efface la première, sans erreur, sans trace. C'est la raison d'être de
 * {@code src/verrou.js}, et elle ne cesse pas parce que le second écrivain
 * parle Java — elle empire, puisque le verrou ne le voit même pas.
 *
 * <h2>Deux régimes, et une liste qui doit s'accorder avec celle de Node</h2>
 *
 * <p>La bascule sur PostgreSQL se fait collection par collection (ADR-002,
 * étape B). Tant qu'elle n'est pas achevée, une partie des données vit dans la
 * base et le reste dans des fichiers — et <b>les deux socles doivent être
 * d'accord sur laquelle est laquelle</b>.
 *
 * <p>C'est ce que {@link #MIGREES} et {@link #JOURNAUX_MIGRES} déclarent, et
 * elles recopient mot pour mot celles de {@code src/magasin.js}. Un contrôle de
 * la suite « taille » compare les deux listes : si elles divergent, Java lit un
 * fichier que personne n'écrit plus, et rend une donnée périmée <b>sans aucune
 * erreur</b>.
 *
 * <p>Ce n'est pas une crainte abstraite. Les journaux d'audit sont passés en
 * base le 29 septembre 2026 et ce fichier ne le savait pas : en régime base, le
 * fichier {@code module_audit.jsonl} n'existe même plus, et la vérification de
 * chaîne rendait <b>{@code valid: true, total: 0}</b> — un satisfecit sur un
 * journal vide, c'est-à-dire le pire mode de défaillance possible pour un outil
 * d'autorité.
 *
 * <h2>Le cache, et pourquoi il regarde la version</h2>
 *
 * <p>Node modifie ces données pendant que nous servons. Un cache qui ne verrait
 * pas la modification servirait des droits périmés — et un droit périmé, sur un
 * outil d'autorité, est un droit faux.
 *
 * <p>Sur fichier, la date et la taille font la clé, comme côté Node. En base,
 * c'est la colonne {@code rev} pour une collection, et le nombre de lignes pour
 * un journal en ajout seul. Dans les deux cas, la marque change dès que la
 * donnée change, et jamais autrement.
 */
@Component
public class Magasin {

  private static final Logger trace = LoggerFactory.getLogger(Magasin.class);

  /**
   * Les collections servies par la base. <b>Recopie de {@code MIGREES} dans
   * {@code src/magasin.js}</b> — un contrôle compare les deux.
   */
  public static final Set<String> MIGREES = Set.of(
      "ramp_aeronefs",
      "emails",
      "notifications",
      "mfa_challenges",
      "users",
      "sessions",
      "referentiels",
      "module_rights",
      "profil_risque",
      "planification");

  /**
   * Les journaux servis par la base. <b>Recopie de {@code JOURNAUX_MIGRES} dans
   * {@code src/magasin.js}</b>.
   */
  public static final Set<String> JOURNAUX_MIGRES = Set.of(
      "audit",
      "module_audit");

  private final ObjectMapper json = new ObjectMapper();
  private final Path repertoire;
  private final AdressePostgres adresse;
  private final DataSource base;
  private final Map<String, Entree> cache = new ConcurrentHashMap<>();

  private record Entree(String marque, JsonNode valeur) {}

  private record EntreeJournal(String marque, List<JsonNode> lignes) {}

  private final Map<String, EntreeJournal> cacheJournal = new ConcurrentHashMap<>();

  public Magasin(
      @Value("${oasis.data-dir}") String repertoireDonnees,
      @Value("${oasis.database-url:}") String adresseBase) {
    this.repertoire = Path.of(repertoireDonnees);
    this.adresse = AdressePostgres.depuis(adresseBase);
    this.base = this.adresse == null ? null : ouvrir(this.adresse);
    if (this.adresse == null) {
      trace.info("magasin : fichiers seulement, dans {}", repertoire);
    } else {
      trace.info("magasin : {} collection(s) et {} journal/journaux en base — {}",
          MIGREES.size(), JOURNAUX_MIGRES.size(), adresse);
    }
  }

  private static DataSource ouvrir(AdressePostgres a) {
    PGSimpleDataSource source = new PGSimpleDataSource();
    source.setUrl(a.jdbc());
    if (a.utilisateur() != null) {
      source.setUser(a.utilisateur());
    }
    if (a.motDePasse() != null) {
      source.setPassword(a.motDePasse());
    }
    return source;
  }

  /** Le répertoire servi — la sonde le dit, pour qu'on sache sur quoi on tourne. */
  public Path repertoire() {
    return repertoire;
  }

  /** Vrai quand une base est configurée. La sonde le dit aussi. */
  public boolean surBase() {
    return base != null;
  }

  /**
   * Une collection vient-elle de la base ? Un nom qui porte un chemin — comme
   * {@code ../config/oasis.config} — est un fichier de paramétrage, et non une
   * collection : il n'est jamais en base.
   */
  private boolean enBase(String nom) {
    return base != null && !nom.contains("/") && MIGREES.contains(nom);
  }

  /**
   * Une collection, ou {@code null} si elle n'existe pas. Une donnée illisible
   * rend {@code null} elle aussi : c'est ce que fait Node, et le contraire
   * ferait tomber une requête pour une virgule de trop.
   */
  public JsonNode lire(String nom) {
    return enBase(nom) ? lireEnBase(nom) : lireFichier(nom);
  }

  private JsonNode lireFichier(String nom) {
    Path fichier = repertoire.resolve(nom + ".json");
    String marque = marqueDe(fichier);
    if (marque == null) {
      cache.remove(nom);
      return null;
    }
    Entree connue = cache.get(nom);
    if (connue != null && connue.marque().equals(marque)) {
      return connue.valeur();
    }
    try {
      JsonNode valeur = json.readTree(Files.readString(fichier));
      cache.put(nom, new Entree(marque, valeur));
      return valeur;
    } catch (IOException | RuntimeException e) {
      return null;
    }
  }

  /**
   * La colonne est de type {@code json} et non {@code jsonb} : le texte revient
   * tel qu'il a été écrit, ordre des clés compris. C'est ce qui rend l'empreinte
   * d'une entrée d'audit vérifiable ici comme côté Node — {@code jsonb}
   * réordonne, et l'empreinte couvre l'ordre.
   *
   * <p>La marque du cache est {@code rev}, qui avance à chaque écriture.
   */
  private JsonNode lireEnBase(String nom) {
    try (Connection c = base.getConnection();
        PreparedStatement q = c.prepareStatement(
            "SELECT valeur::text AS texte, rev FROM collections WHERE nom = ?")) {
      q.setString(1, nom);
      try (ResultSet r = q.executeQuery()) {
        if (!r.next()) {
          cache.remove(nom);
          return null;
        }
        String marque = "rev:" + r.getInt("rev");
        Entree connue = cache.get(nom);
        if (connue != null && connue.marque().equals(marque)) {
          return connue.valeur();
        }
        JsonNode valeur = json.readTree(r.getString("texte"));
        cache.put(nom, new Entree(marque, valeur));
        return valeur;
      }
    } catch (SQLException | IOException | RuntimeException e) {
      // Une base injoignable n'est pas une collection vide : le dire, et rendre
      // `null` comme un fichier absent. Taire l'erreur ferait croire à des
      // droits inexistants plutôt qu'à une panne.
      trace.error("collection « {} » illisible en base : {}", nom, e.getMessage());
      return null;
    }
  }

  /** Une collection qui est une liste, vide plutôt que nulle. */
  public List<JsonNode> liste(String nom) {
    JsonNode n = lire(nom);
    if (n == null || !n.isArray()) {
      return List.of();
    }
    return java.util.stream.StreamSupport.stream(n.spliterator(), false).toList();
  }

  /** Une collection qui est un objet, jamais nulle. */
  public JsonNode objet(String nom) {
    JsonNode n = lire(nom);
    return (n != null && n.isObject()) ? n : json.createObjectNode();
  }

  /**
   * Les lignes d'un journal en ajout seul. Une ligne abîmée est ignorée plutôt
   * que de faire échouer la lecture entière : elle rompra la chaîne, ce que la
   * vérification dira — c'est son rôle, pas celui de la lecture. Même règle que
   * {@code src/journal.js}.
   */
  public List<JsonNode> journal(String nom) {
    return (base != null && JOURNAUX_MIGRES.contains(nom))
        ? journalEnBase(nom)
        : journalFichier(nom);
  }

  private List<JsonNode> journalFichier(String nom) {
    Path fichier = repertoire.resolve(nom + ".jsonl");
    if (!Files.isReadable(fichier)) {
      return List.of();
    }
    try {
      return Files.readAllLines(fichier).stream()
          .filter(l -> !l.isBlank())
          .map(this::noeudOuNull)
          .filter(java.util.Objects::nonNull)
          .toList();
    } catch (IOException e) {
      return List.of();
    }
  }

  /**
   * Un journal en ajout seul ne perd ni ne réordonne jamais : son nombre de
   * lignes suffit donc comme marque de cache. {@code ordre} fait foi pour
   * l'ordre, comme la position dans le fichier.
   */
  private List<JsonNode> journalEnBase(String nom) {
    try (Connection c = base.getConnection()) {
      String marque;
      try (PreparedStatement q = c.prepareStatement(
          "SELECT count(*) AS n FROM journal WHERE nom = ?")) {
        q.setString(1, nom);
        try (ResultSet r = q.executeQuery()) {
          r.next();
          marque = "n:" + r.getLong("n");
        }
      }
      EntreeJournal connue = cacheJournal.get(nom);
      if (connue != null && connue.marque().equals(marque)) {
        return connue.lignes();
      }
      List<JsonNode> lignes = new ArrayList<>();
      try (PreparedStatement q = c.prepareStatement(
          "SELECT entree::text AS texte FROM journal WHERE nom = ? ORDER BY ordre")) {
        q.setString(1, nom);
        try (ResultSet r = q.executeQuery()) {
          while (r.next()) {
            JsonNode n = noeudOuNull(r.getString("texte"));
            if (n != null) {
              lignes.add(n);
            }
          }
        }
      }
      List<JsonNode> figees = List.copyOf(lignes);
      cacheJournal.put(nom, new EntreeJournal(marque, figees));
      return figees;
    } catch (SQLException | RuntimeException e) {
      // Surtout pas une liste vide silencieuse : ce journal-là atteste des
      // actes d'autorité, et « vide » se lirait comme « rien n'a eu lieu ».
      trace.error("journal « {} » illisible en base : {}", nom, e.getMessage());
      return List.of();
    }
  }

  private JsonNode noeudOuNull(String texte) {
    try {
      return json.readTree(texte);
    } catch (IOException e) {
      return null;
    }
  }

  private String marqueDe(Path fichier) {
    try {
      var attributs = Files.readAttributes(fichier, java.nio.file.attribute.BasicFileAttributes.class);
      return attributs.size() + ":" + attributs.lastModifiedTime().toMillis();
    } catch (IOException e) {
      return null;
    }
  }
}
