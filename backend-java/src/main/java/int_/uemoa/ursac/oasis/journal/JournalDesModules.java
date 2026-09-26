package int_.uemoa.ursac.oasis.journal;

import com.fasterxml.jackson.databind.JsonNode;
import int_.uemoa.ursac.oasis.conformite.SerialisationJs;
import int_.uemoa.ursac.oasis.magasin.Magasin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Le journal d'audit des modules, lu et vérifié — jamais écrit.
 *
 * <h2>Une seconde formule, que les vecteurs ne couvraient pas</h2>
 *
 * <p>La chaîne du socle scelle quatre champs ; celle des modules en scelle
 * <strong>six</strong> : {@code objet} et {@code ref} s'ajoutent entre
 * l'action et le détail.
 *
 * <pre>sha256( precedent |ts |user |action |objet |ref |json(details) )</pre>
 *
 * <p>Les vecteurs de conformité d'ADR-002 ne portaient que la première. Une
 * réécriture qui s'y serait fiée aurait cru le contrat satisfait et rompu la
 * chaîne des modules — 1 582 entrées. C'est la deuxième fois que ce travail
 * révèle un trou dans ses propres garde-fous, et la leçon est la même : un
 * contrat ne vaut que pour ce qu'il énumère.
 *
 * <h2>Plusieurs noms, plusieurs chaînes</h2>
 *
 * <p>Un module renommé garde ses anciennes entrées sous leur ancien code —
 * y toucher effacerait ce qu'elles attestent. Chaque chaîne se vérifie donc
 * pour elle-même, en repartant de la genèse ; elles se lisent ensemble, triées
 * par le temps. {@code RAMP} porte ainsi l'héritage de {@code SAFA}.
 */
@Component
public class JournalDesModules {

  public static final String GENESE = "OASIS-MODULE-GENESIS";

  /** Les libellés d'action, tels que l'écran les affiche. */
  public static final Map<String, String> ACTIONS = new LinkedHashMap<>();

  static {
    ACTIONS.put("CREATION", "Création");
    ACTIONS.put("MODIFICATION", "Enregistrement");
    ACTIONS.put("SUPPRESSION", "Suppression");
    ACTIONS.put("SOUMISSION", "Soumission");
    ACTIONS.put("VALIDATION", "Validation");
    ACTIONS.put("APPROBATION", "Approbation");
    ACTIONS.put("REJET", "Rejet");
    ACTIONS.put("TRANSMISSION", "Transmission");
    ACTIONS.put("ARCHIVAGE", "Archivage");
    ACTIONS.put("AMENDEMENT", "Amendement");
    ACTIONS.put("REEVALUATION", "Réévaluation");
    ACTIONS.put("IMPORT", "Import");
    ACTIONS.put("SYNCHRONISATION", "Synchronisation");
    ACTIONS.put("DROITS", "Modification des droits");
  }

  /** Un module renommé : du plus ancien nom au nom courant. */
  private static final Map<String, List<String>> ANCIENS_CODES = Map.of("RAMP", List.of("SAFA"));

  private final Magasin magasin;

  public JournalDesModules(Magasin magasin) {
    this.magasin = magasin;
  }

  private List<String> codesDe(String moduleCode) {
    List<String> codes = new ArrayList<>(ANCIENS_CODES.getOrDefault(moduleCode, List.of()));
    codes.add(moduleCode);
    return codes;
  }

  /** Les entrées d'un module, de la plus ancienne à la plus récente. */
  public List<JsonNode> entrees(String moduleCode) {
    Map<String, List<JsonNode>> parCode = parCodeModule();
    List<String> codes = codesDe(moduleCode);
    if (codes.size() == 1) {
      return parCode.getOrDefault(moduleCode, List.of());
    }
    List<JsonNode> tout = new ArrayList<>();
    codes.forEach(c -> tout.addAll(parCode.getOrDefault(c, List.of())));
    tout.sort((a, b) -> a.path("ts").asText("").compareTo(b.path("ts").asText("")));
    return tout;
  }

  /**
   * Vérifie la chaîne d'un module. Chaque code a la sienne, et une seule
   * rompue suffit à répondre non — c'est la garantie du §F.3, elle ne se
   * découpe pas.
   */
  public Map<String, Object> verifier(String moduleCode) {
    Map<String, List<JsonNode>> parCode = parCodeModule();
    int total = 0;
    for (String code : codesDe(moduleCode)) {
      List<JsonNode> entrees = parCode.getOrDefault(code, List.of());
      String precedent = GENESE;
      for (JsonNode e : entrees) {
        total += 1;
        if (!precedent.equals(e.path("prevHash").asText())
            || !empreinte(precedent, e).equals(e.path("hash").asText())) {
          // Une chaîne intacte rend deux champs ; une chaîne rompue en rend
          // quatre. Ce n'est pas un détail de forme : le même écran lit les
          // deux, et un `brokenAt: 0` sur une chaîne saine lui ferait
          // afficher une rupture à l'entrée zéro.
          Map<String, Object> rompue = new LinkedHashMap<>();
          rompue.put("valid", false);
          rompue.put("brokenAt", e.path("id").asInt());
          rompue.put("codeModule", code);
          rompue.put("total", total);
          return rompue;
        }
        precedent = e.path("hash").asText();
      }
    }
    Map<String, Object> intacte = new LinkedHashMap<>();
    intacte.put("valid", true);
    intacte.put("total", total);
    return intacte;
  }

  /**
   * L'empreinte d'une entrée de module. Six champs, et le détail sérialisé
   * selon les règles de JavaScript — ordre des clés entières compris.
   */
  public String empreinte(String precedent, JsonNode e) {
    Map<String, Object> details = enCarte(e.path("details"));
    String aSceller = String.join("|",
        precedent,
        e.path("ts").asText(""),
        e.path("user").asText(""),
        e.path("action").asText(""),
        e.path("objet").asText(""),
        e.path("ref").asText(""),
        SerialisationJs.ecrire(details));
    return sha256(aSceller);
  }

  private Map<String, List<JsonNode>> parCodeModule() {
    Map<String, List<JsonNode>> parCode = new LinkedHashMap<>();
    for (JsonNode e : magasin.journal("module_audit")) {
      parCode.computeIfAbsent(e.path("codeModule").asText(""), k -> new ArrayList<>()).add(e);
    }
    return parCode;
  }

  private static Map<String, Object> enCarte(JsonNode noeud) {
    Map<String, Object> carte = new LinkedHashMap<>();
    if (noeud == null || !noeud.isObject()) {
      return carte;
    }
    noeud.fields().forEachRemaining(champ -> carte.put(champ.getKey(), enValeur(champ.getValue())));
    return carte;
  }

  private static Object enValeur(JsonNode n) {
    if (n.isObject()) {
      return enCarte(n);
    }
    if (n.isArray()) {
      List<Object> liste = new ArrayList<>();
      n.forEach(x -> liste.add(enValeur(x)));
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

  private static String sha256(String texte) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(texte.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 introuvable", e);
    }
  }

}
