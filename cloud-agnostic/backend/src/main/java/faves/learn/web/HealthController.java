package faves.learn.web;

import faves.learn.config.AppProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Cheap human-readable health/info endpoint. The real probes are
 * {@code /actuator/health/liveness} and {@code /actuator/health/readiness}
 * (used by Kubernetes).
 */
@RestController
public class HealthController {

    private final AppProperties props;

    public HealthController(AppProperties props) {
        this.props = props;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "service", "learn-my-faves-backend",
                "cloudProvider", props.cloudProvider(),
                "kafkaTopicPrefix", props.kafkaTopicPrefix());
    }
}
