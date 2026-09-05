package faves.learn.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Baseline security. Health and actuator probes are open; everything else needs
 * a valid session token.
 *
 * <p>The session token is minted by this application, not the IdP (PRD §3.2):
 * the IdP authenticates, we exchange its assertion for our own JWT carrying
 * {@code user_id} and {@code is_staff} only. Band roles are resolved per request
 * (ADR 0004), never read from the token. The resource-server decoder wiring for
 * that token is the next slice — see docs/READ-IN-THIS-ORDER.md.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health", "/actuator/health/**", "/actuator/info").permitAll()
                .anyRequest().permitAll()   // TODO: .authenticated() once the token decoder is wired
            );
        return http;
    }
}
