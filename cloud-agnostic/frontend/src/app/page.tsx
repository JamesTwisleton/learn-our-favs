export const dynamic = "force-dynamic";

async function getBackendHealth() {
  const base = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    if (!res.ok) return { status: `error ${res.status}` };
    return (await res.json()) as Record<string, unknown>;
  } catch (e) {
    return { status: "unreachable", detail: String(e) };
  }
}

export default async function Home() {
  const health = await getBackendHealth();
  return (
    <>
      <h1>Learn My Faves</h1>
      <p style={{ color: "#a0a0a0" }}>
        Cloud-agnostic demonstration architecture. This frontend is a thin client
        of the Java 25 Spring Boot API.
      </p>
      <h2>Backend health</h2>
      <pre
        style={{
          background: "#1c1c1c",
          border: "1px solid #2e2e2e",
          borderRadius: 8,
          padding: 16,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(health, null, 2)}
      </pre>
      <p style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
        Start the backend with <code>mvn spring-boot:run</code> in{" "}
        <code>../backend</code> and the infra with{" "}
        <code>docker compose up -d</code> in <code>..</code>.
      </p>
    </>
  );
}
