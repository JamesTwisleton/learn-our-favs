package faves.learn.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.*} configuration. {@code cloudProvider} selects which
 * {@code faves.learn.platform.*} implementation is active (ADR 0009).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String cloudProvider,
        String kafkaTopicPrefix,
        ObjectStore objectStore,
        SessionToken sessionToken,
        Matching matching) {

    public record ObjectStore(String endpoint, String bucket) {}

    public record SessionToken(String signingKey) {}

    public record Matching(double autoAccept, double promptFloor) {}
}
