package faves.learn.platform.local;

import faves.learn.platform.ports.SecretStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory secret store for local development. Values are lost on restart —
 * that is fine for a dev stack. On AWS / GCP this is Secrets Manager /
 * Secret Manager, and the reference is an ARN / resource name.
 */
@Component
@ConditionalOnProperty(name = "app.cloud-provider", havingValue = "local")
public class LocalSecretStore implements SecretStore {

    private final Map<String, String> store = new ConcurrentHashMap<>();

    @Override
    public String put(String logicalName, String value) {
        String reference = "local-secret://" + logicalName + "/" + UUID.randomUUID();
        store.put(reference, value);
        return reference;
    }

    @Override
    public String get(String reference) {
        return store.get(reference);
    }

    @Override
    public void delete(String reference) {
        store.remove(reference);
    }
}
