package int_.uemoa.ursac.oasis.magasin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Le magasin de fichiers JSON, lu comme Node le lit.
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
 * <p>D'où une classe qui n'expose aucune écriture. Ce n'est pas une étape
 * vers l'écriture : c'est la forme juste tant que deux runtimes partagent un
 * répertoire. Le jour où le magasin sera PostgreSQL, la question disparaît —
 * une base a des verrous et des transactions, c'est même ce qu'on lui demande.
 *
 * <h2>Le cache, et pourquoi il regarde la date</h2>
 *
 * <p>Node modifie ces fichiers pendant que nous servons. Un cache qui ne
 * verrait pas la modification servirait des droits périmés — et un droit
 * périmé, sur un outil d'autorité, est un droit faux. La date et la taille du
 * fichier font donc la clé, comme côté Node.
 */
@Component
public class Magasin {

  private final ObjectMapper json = new ObjectMapper();
  private final Path repertoire;
  private final Map<String, Entree> cache = new ConcurrentHashMap<>();

  private record Entree(String marque, JsonNode valeur) {}

  public Magasin(@Value("${oasis.data-dir}") String repertoireDonnees) {
    this.repertoire = Path.of(repertoireDonnees);
  }

  /** Le répertoire servi — la sonde le dit, pour qu'on sache sur quoi on tourne. */
  public Path repertoire() {
    return repertoire;
  }

  /**
   * Une collection, ou {@code null} si le fichier n'existe pas. Un fichier
   * illisible rend {@code null} lui aussi : c'est ce que fait Node, et le
   * contraire ferait tomber une requête pour une virgule de trop.
   */
  public JsonNode lire(String nom) {
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
   * Les lignes d'un journal en ajout seul ({@code .jsonl}). Une ligne abîmée
   * est ignorée plutôt que de faire échouer la lecture entière : elle rompra
   * la chaîne, ce que la vérification dira — c'est son rôle, pas celui de la
   * lecture. Même règle que {@code src/journal.js}.
   */
  public List<JsonNode> journal(String nom) {
    Path fichier = repertoire.resolve(nom + ".jsonl");
    if (!Files.isReadable(fichier)) {
      return List.of();
    }
    try {
      return Files.readAllLines(fichier).stream()
          .filter(l -> !l.isBlank())
          .map(l -> {
            try {
              return json.readTree(l);
            } catch (IOException e) {
              return null;
            }
          })
          .filter(java.util.Objects::nonNull)
          .toList();
    } catch (IOException e) {
      return List.of();
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
