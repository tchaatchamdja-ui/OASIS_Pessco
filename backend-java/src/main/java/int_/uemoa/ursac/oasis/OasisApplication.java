package int_.uemoa.ursac.oasis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Le socle OASIS en Spring Boot — première tranche (ADR-002, jalon n° 6).
 *
 * <p>Il ne sert que « Gestion des Droits », et seulement en lecture. Tout le
 * reste appartient encore au socle Node, qui tourne à côté : c'est ce que
 * l'étranglement progressif veut dire.
 *
 * <p>Le répertoire de données est celui que Node sert, en lecture seule —
 * {@code oasis.data-dir}. Aucune écriture n'en part : deux écrivains sur un
 * magasin par fichiers se perdent l'un l'autre.
 */
@SpringBootApplication
public class OasisApplication {

  public static void main(String[] args) {
    SpringApplication.run(OasisApplication.class, args);
  }
}
