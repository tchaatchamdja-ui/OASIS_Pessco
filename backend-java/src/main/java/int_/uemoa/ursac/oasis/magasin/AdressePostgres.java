package int_.uemoa.ursac.oasis.magasin;

import java.net.URI;
import java.util.Objects;

/**
 * L'adresse de la base, telle que Node la donne, traduite pour JDBC.
 *
 * <p>Les deux socles lisent la même variable — {@code DATABASE_URL} — mais ne
 * la comprennent pas de la même façon. Node la passe à {@code pg} sous la forme
 * d'une URL ordinaire :
 *
 * <pre>postgres://oasis:motdepasse@serveur:5432/oasis?sslmode=require</pre>
 *
 * <p>JDBC n'accepte pas cette forme : il veut un préfixe {@code jdbc:} et
 * refuse les identifiants dans l'URL. La traduction est donc explicite, et
 * c'est elle qu'il faut éprouver — une adresse mal traduite ne se voit pas, elle
 * se solde par un refus de connexion au démarrage, loin de la cause.
 *
 * <p><b>Une seule variable, et c'est délibéré.</b> Deux adresses à tenir, une
 * par socle, divergeraient : l'un servirait une base, l'autre une autre, et
 * chacun aurait raison de son côté. La même variable interdit cet écart.
 */
public record AdressePostgres(String jdbc, String utilisateur, String motDePasse) {

  /**
   * Traduit une adresse {@code postgres://…} ou {@code postgresql://…}. Rend
   * {@code null} si l'adresse est absente ou vide : c'est le régime des
   * fichiers, et il n'a rien d'anormal.
   *
   * @throws IllegalArgumentException si l'adresse est donnée mais illisible —
   *     mieux vaut refuser de démarrer que servir en silence le mauvais régime.
   */
  public static AdressePostgres depuis(String brute) {
    if (brute == null || brute.isBlank()) {
      return null;
    }
    String adresse = brute.trim();
    if (adresse.startsWith("jdbc:")) {
      // Déjà traduite : l'opérateur sait ce qu'il fait, on n'y touche pas.
      return new AdressePostgres(adresse, null, null);
    }
    if (!adresse.startsWith("postgres://") && !adresse.startsWith("postgresql://")) {
      throw new IllegalArgumentException(
          "adresse de base incomprise : « " + masquer(adresse) + " » — attendu postgres://…");
    }
    URI uri;
    try {
      uri = new URI(adresse);
    } catch (Exception e) {
      throw new IllegalArgumentException("adresse de base illisible : " + e.getMessage(), e);
    }
    String hote = Objects.requireNonNullElse(uri.getHost(), "localhost");
    int port = uri.getPort() > 0 ? uri.getPort() : 5432;
    String base = Objects.requireNonNullElse(uri.getPath(), "").replaceFirst("^/", "");
    if (base.isEmpty()) {
      throw new IllegalArgumentException("adresse de base sans nom de base : " + masquer(adresse));
    }

    String utilisateur = null;
    String motDePasse = null;
    String identifiants = uri.getUserInfo();
    if (identifiants != null && !identifiants.isBlank()) {
      int sep = identifiants.indexOf(':');
      utilisateur = sep < 0 ? identifiants : identifiants.substring(0, sep);
      motDePasse = sep < 0 ? null : identifiants.substring(sep + 1);
    }

    // La requête est reportée telle quelle : `sslmode=require` y vit, et JDBC le
    // comprend sous le même nom.
    String requete = uri.getQuery();
    String jdbc = "jdbc:postgresql://" + hote + ":" + port + "/" + base
        + (requete == null || requete.isBlank() ? "" : "?" + requete);
    return new AdressePostgres(jdbc, utilisateur, motDePasse);
  }

  /** Une adresse citée dans un message d'erreur ne porte pas son mot de passe. */
  static String masquer(String adresse) {
    return adresse.replaceAll("://([^:@/]+):[^@/]*@", "://$1:••••@");
  }

  /** Ce qu'on peut écrire dans une trace : jamais le mot de passe. */
  @Override
  public String toString() {
    return "AdressePostgres[" + masquer(jdbc) + ", utilisateur=" + utilisateur + "]";
  }
}
