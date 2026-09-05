/**
 * Provider-agnostic ports. Every cloud-specific capability the application uses
 * is expressed here as an interface with no AWS or GCP type in its signature.
 *
 * <p>The discipline that makes cloud portability real rather than decorative
 * (PRD §7): <strong>no provider-specific claim, key format, or error type may
 * leak through these interfaces into the domain layer.</strong> An abstraction
 * that only truly works on one cloud is worse than none, because it hides the
 * coupling.
 *
 * <p>Implementations live in {@code faves.learn.platform.aws},
 * {@code faves.learn.platform.gcp}, and {@code faves.learn.platform.local}
 * (the docker-compose stack). One is activated by the {@code CLOUD_PROVIDER}
 * configuration value, which Terraform sets (ADR 0009).
 */
package faves.learn.platform.ports;
