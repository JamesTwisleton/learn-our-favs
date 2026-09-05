package faves.learn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the cloud-agnostic Learn My Faves API.
 *
 * <p>The application mints its own session token and never lets a provider
 * token reach the domain layer (PRD §3.2). Cloud-specific behaviour —
 * identity, object storage, secrets — sits behind the interfaces in
 * {@code faves.learn.platform.ports}, selected by the {@code CLOUD_PROVIDER}
 * setting (ADR 0009).
 */
@SpringBootApplication
public class LearnMyFavesApplication {

    public static void main(String[] args) {
        SpringApplication.run(LearnMyFavesApplication.class, args);
    }
}
