package int_.uemoa.ursac.oasis.securite;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;

/**
 * Un compte du portail, tel que {@code data/users.json} le porte.
 *
 * <p>La classe enveloppe le nœud brut plutôt que de le recopier champ par
 * champ : le socle Node ajoute des champs au fil du temps — {@code portee},
 * {@code prestataire_id}, {@code modules} — et une projection Java figée
 * perdrait silencieusement ceux qu'elle ne connaît pas. Ce qui est lu est
 * nommé ; le reste passe, intact.
 */
public class Utilisateur {

  private final JsonNode brut;

  public Utilisateur(JsonNode brut) {
    this.brut = brut;
  }

  public String identifiant() {
    return brut.path("username").asText("");
  }

  public String role() {
    return brut.path("role").asText("");
  }

  public String nom() {
    return brut.path("nom").asText("");
  }

  public String prenom() {
    return brut.path("prenom").asText("");
  }

  public String nomComplet() {
    String complet = brut.path("fullName").asText("");
    return complet.isBlank() ? identifiant() : complet;
  }

  public String courriel() {
    String c = brut.path("email").asText("");
    return c.isBlank() ? identifiant() : c;
  }

  public boolean actif() {
    return brut.path("active").asBoolean(true);
  }

  public String prestataireId() {
    return brut.path("prestataire_id").asText("");
  }

  public String instance() {
    return brut.path("instance").asText("");
  }

  public String portee() {
    return brut.path("portee").asText("");
  }

  /**
   * « Accès aux modules ». {@code null} quand le champ n'a jamais été
   * renseigné — ce qui n'est pas la même chose qu'une liste vide : l'absence
   * ouvre tous les modules, par convention héritée de l'état de l'application
   * avant que ce champ n'existe. La liste vide, elle, n'en ouvre aucun.
   */
  public List<String> modules() {
    JsonNode m = brut.path("modules");
    if (!m.isArray()) {
      return null;
    }
    List<String> codes = new ArrayList<>();
    m.forEach(x -> codes.add(x.asText()));
    return codes;
  }

  /**
   * Le compte tel qu'une route peut le rendre : sans le sel, sans le condensé,
   * sans l'historique des mots de passe. Même retrait que {@code publicUser}
   * côté Node — et ce n'est pas une politesse, c'est ce qui empêche un
   * condensé de sortir par une route de lecture.
   */
  public JsonNode vuePublique() {
    ObjectNode copie = brut.deepCopy();
    copie.remove("salt");
    copie.remove("hash");
    copie.remove("passwordHistory");
    return copie;
  }
}
