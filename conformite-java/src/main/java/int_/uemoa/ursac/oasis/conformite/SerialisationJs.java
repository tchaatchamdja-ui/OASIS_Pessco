package int_.uemoa.ursac.oasis.conformite;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * {@code JSON.stringify} de JavaScript, reproduit — parce que c'est lui qui
 * scelle la chaîne d'audit.
 *
 * <p>L'empreinte de chaque entrée du journal se calcule sur une chaîne dont le
 * dernier morceau est le détail sérialisé. Si cette sérialisation diffère d'un
 * espace, d'un ordre de clés ou d'un échappement, {@code verifyChain()}
 * déclare faux <strong>tout l'historique</strong> — et la garantie
 * d'inaltérabilité du §F.3 tombe, sur les données existantes.
 *
 * <p>Jackson ne convient pas ici. Non qu'il soit mauvais, mais il n'a aucune
 * raison de reproduire les bizarreries d'un autre langage : c'est ce contrat-là
 * qu'on écrit, pas du JSON en général.
 *
 * <h2>Les trois règles qui surprennent</h2>
 *
 * <ol>
 *   <li><strong>Les clés entières passent devant</strong>, triées
 *       numériquement, avant les autres qui gardent leur ordre d'insertion.
 *       {@code {b, 10, a, 2, 1}} se rend {@code {"1","2","10","b","a"}}. C'est
 *       la règle que rate un {@code LinkedHashMap}, et elle suffit à rompre la
 *       chaîne.</li>
 *   <li><strong>Les caractères non ASCII ne sont pas échappés.</strong>
 *       « Bénin » s'écrit tel quel, en UTF-8 — et non {@code Bénin}.</li>
 *   <li><strong>La barre oblique n'est pas échappée.</strong> Plusieurs
 *       sérialiseurs écrivent {@code \/} par prudence héritée du HTML ; celui
 *       de JavaScript, non.</li>
 * </ol>
 *
 * <p>Aucun espace : ni après le deux-points, ni après la virgule.
 */
public final class SerialisationJs {

  private SerialisationJs() {}

  /** Sérialise une valeur comme le ferait {@code JSON.stringify}, sans indentation. */
  public static String ecrire(Object valeur) {
    StringBuilder sortie = new StringBuilder();
    ecrireDans(sortie, valeur);
    return sortie.toString();
  }

  private static void ecrireDans(StringBuilder sortie, Object valeur) {
    if (valeur == null) {
      sortie.append("null");
    } else if (valeur instanceof String texte) {
      ecrireTexte(sortie, texte);
    } else if (valeur instanceof Boolean || valeur instanceof Number) {
      sortie.append(valeur);
    } else if (valeur instanceof Map<?, ?> objet) {
      ecrireObjet(sortie, objet);
    } else if (valeur instanceof Iterable<?> liste) {
      ecrireListe(sortie, liste);
    } else {
      throw new IllegalArgumentException(
          "type non prévu au contrat : " + valeur.getClass().getName());
    }
  }

  private static void ecrireListe(StringBuilder sortie, Iterable<?> liste) {
    sortie.append('[');
    boolean premier = true;
    for (Object element : liste) {
      if (!premier) {
        sortie.append(',');
      }
      premier = false;
      ecrireDans(sortie, element);
    }
    sortie.append(']');
  }

  private static void ecrireObjet(StringBuilder sortie, Map<?, ?> objet) {
    sortie.append('{');
    boolean premier = true;
    for (Object cle : ordonnerCles(objet)) {
      if (!premier) {
        sortie.append(',');
      }
      premier = false;
      ecrireTexte(sortie, String.valueOf(cle));
      sortie.append(':');
      ecrireDans(sortie, objet.get(cle));
    }
    sortie.append('}');
  }

  /**
   * L'ordre des clés selon JavaScript : d'abord les indices de tableau —
   * entiers non signés canoniques — triés numériquement, puis le reste dans
   * l'ordre où il a été inséré.
   *
   * <p>La carte reçue doit donc préserver son ordre d'insertion : un
   * {@code LinkedHashMap}, jamais un {@code HashMap}, dont l'ordre n'a aucun
   * sens et rendrait le résultat dépendant du hasard.
   */
  static List<Object> ordonnerCles(Map<?, ?> objet) {
    List<Object> entieres = new ArrayList<>();
    List<Object> autres = new ArrayList<>();
    for (Object cle : objet.keySet()) {
      if (estIndiceDeTableau(String.valueOf(cle))) {
        entieres.add(cle);
      } else {
        autres.add(cle);
      }
    }
    entieres.sort(Comparator.comparingLong(c -> Long.parseLong(String.valueOf(c))));
    List<Object> ordre = new ArrayList<>(entieres);
    ordre.addAll(autres);
    return ordre;
  }

  /**
   * Une clé est un « indice de tableau » si elle est un entier non signé écrit
   * sous sa forme canonique. « 007 » n'en est pas un — il ne repasserait pas
   * identique — ni « -1 », ni « 1.0 », ni la chaîne vide.
   */
  private static boolean estIndiceDeTableau(String cle) {
    if (cle.isEmpty() || cle.length() > 10) {
      return false;
    }
    for (int i = 0; i < cle.length(); i++) {
      if (cle.charAt(i) < '0' || cle.charAt(i) > '9') {
        return false;
      }
    }
    // « 0 » est canonique ; « 00 » et « 01 » ne le sont pas.
    return cle.equals("0") || cle.charAt(0) != '0';
  }

  private static void ecrireTexte(StringBuilder sortie, String texte) {
    sortie.append('"');
    for (int i = 0; i < texte.length(); i++) {
      char c = texte.charAt(i);
      switch (c) {
        case '"' -> sortie.append("\\\"");
        case '\\' -> sortie.append("\\\\");
        case '\b' -> sortie.append("\\b");
        case '\f' -> sortie.append("\\f");
        case '\n' -> sortie.append("\\n");
        case '\r' -> sortie.append("\\r");
        case '\t' -> sortie.append("\\t");
        default -> {
          if (c < 0x20) {
            sortie.append(String.format("\\u%04x", (int) c));
          } else {
            // Tout le reste tel quel, y compris les accents et les signes
            // hors du plan multilingue de base : la sortie est en UTF-8.
            sortie.append(c);
          }
        }
      }
    }
    sortie.append('"');
  }
}
