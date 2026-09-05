package faves.learn.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the provider-agnostic ports (ADR 0009). Each implementation package
 * ({@code platform.local}, {@code platform.aws}, {@code platform.gcp}) declares
 * its beans {@code @ConditionalOnProperty(name = "app.cloud-provider", ...)}, so
 * exactly one set is active. This class only turns on configuration-properties
 * binding; the conditionals live with the implementations.
 */
@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class PlatformConfig {
}
