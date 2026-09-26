package int_.uemoa.ursac.oasis.conformite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * La recette d'entrée du backend Java (ADR-002, suite n° 2).
 *
 * <p>Les vecteurs sont produits par {@code scripts/vecteurs-conformite.js}
 * depuis l'implémentation Node en service, et trois contrôles de la suite de
 * fumée les empêchent de se périmer. Ce test les rejoue côté Java.
 *
 * <p>Tant qu'il ne passe pas, aucune route Spring n'a de sens : le socle
 * n'aurait ni les mots de passe existants, ni la chaîne d'audit existante.
 */
@DisplayName("Contrats d'octets — scrypt et la chaîne d'audit")
class VecteursTest {

  private static JsonNode vecteurs;

  @BeforeAll
  static void lireLesVecteurs() throws IOException {
    // Le fichier vit dans le dépôt Node, un cran au-dessus : il n'est pas
    // recopié ici. Une copie divergerait, et c'est exactement ce que ces
    // vecteurs existent pour empêcher.
    Path fichier = Path.of("..", "tests", "conformite", "vecteurs.json");
    assertTrue(Files.exists(fichier),
        "vecteurs introuvables — les produire : node scripts/vecteurs-conformite.js --ecrire");
    vecteurs = new ObjectMapper().readTree(Files.readString(fichier));
  }

  @Test
  @DisplayName("scrypt reproduit le condensé de Node, sel pris tel quel")
  void scrypt() {
    List<String> echecs = new ArrayList<>();
    for (JsonNode cas : vecteurs.path("scrypt").path("cas")) {
      String obtenu = MotDePasse.condenser(
          cas.path("motDePasse").asText(), cas.path("sel").asText());
      String attendu = cas.path("attendu").asText();
      if (!MotDePasse.correspond(attendu, obtenu)) {
        echecs.add(cas.path("quoi").asText() + " → " + obtenu.substring(0, 24) + "…");
      }
    }
    assertEquals(List.of(), echecs,
        "le condensé diffère : les comptes existants ne pourraient plus se connecter");
  }

  @Test
  @DisplayName("la sérialisation rend exactement ce que JSON.stringify rendrait")
  void serialisation() {
    List<String> echecs = new ArrayList<>();
    for (JsonNode cas : vecteurs.path("chaine").path("cas")) {
      String obtenu = SerialisationJs.ecrire(detailsDuCas(cas));
      String attendu = cas.path("json_attendu").asText();
      if (!attendu.equals(obtenu)) {
        echecs.add(cas.path("quoi").asText() + "\n    attendu : " + attendu + "\n    obtenu  : " + obtenu);
      }
    }
    assertEquals(List.of(), echecs, "la sérialisation s'écarte du contrat");
  }

  @Test
  @DisplayName("l'empreinte de chaque entrée est celle de la chaîne existante")
  void empreintes() {
    List<String> echecs = new ArrayList<>();
    for (JsonNode cas : vecteurs.path("chaine").path("cas")) {
      JsonNode entree = cas.path("entree");
      String obtenue = ChaineAudit.empreinte(
          cas.path("precedent").asText(),
          entree.path("ts").asText(),
          entree.path("user").asText(),
          entree.path("action").asText(),
          detailsDuCas(cas));
      String attendue = cas.path("attendu").asText();
      if (!attendue.equals(obtenue)) {
        echecs.add(cas.path("quoi").asText() + " → " + obtenue.substring(0, 16) + "…");
      }
    }
    assertEquals(List.of(), echecs,
        "l'empreinte diffère : verifyChain() déclarerait faux tout l'historique");
  }

  @Test
  @DisplayName("l'ordre des clés est bien appliqué, et non hérité du fichier")
  void ordreDesClesVraimentApplique() {
    JsonNode cas = null;
    for (JsonNode c : vecteurs.path("chaine").path("cas")) {
      if (c.has("desordre")) {
        cas = c;
      }
    }
    assertTrue(cas != null, "le cas en désordre a disparu des vecteurs");
    // On part du désordre, jamais de « details » : le fichier porte déjà
    // l'ordre corrigé, et s'y fier ferait passer ce test sans rien prouver.
    Map<String, Object> depuisLeDesordre = new LinkedHashMap<>();
    for (JsonNode paire : cas.path("desordre")) {
      depuisLeDesordre.put(paire.get(0).asText(), paire.get(1).asText());
    }
    assertEquals(cas.path("json_attendu").asText(), SerialisationJs.ecrire(depuisLeDesordre),
        "les clés entières doivent passer devant, triées numériquement");
  }

  /**
   * Le détail du cas, en carte qui garde son ordre. Jackson lit dans l'ordre
   * du fichier, lequel est déjà celui que produirait JavaScript — c'est
   * pourquoi le test précédent existe séparément.
   */
  private static Map<String, Object> detailsDuCas(JsonNode cas) {
    return enCarte(cas.path("entree").path("details"));
  }

  private static Map<String, Object> enCarte(JsonNode noeud) {
    Map<String, Object> carte = new LinkedHashMap<>();
    Iterator<Map.Entry<String, JsonNode>> champs = noeud.fields();
    while (champs.hasNext()) {
      Map.Entry<String, JsonNode> champ = champs.next();
      carte.put(champ.getKey(), enValeur(champ.getValue()));
    }
    return carte;
  }

  private static Object enValeur(JsonNode n) {
    if (n.isObject()) {
      return enCarte(n);
    }
    if (n.isArray()) {
      List<Object> liste = new ArrayList<>();
      n.forEach(e -> liste.add(enValeur(e)));
      return liste;
    }
    if (n.isNull()) {
      return null;
    }
    if (n.isBoolean()) {
      return n.asBoolean();
    }
    if (n.isIntegralNumber()) {
      return n.asLong();
    }
    if (n.isNumber()) {
      return n.asDouble();
    }
    return n.asText();
  }
}
