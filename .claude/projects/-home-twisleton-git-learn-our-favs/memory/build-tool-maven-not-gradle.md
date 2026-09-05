---
name: build-tool-maven-not-gradle
description: JVM projects in this repo use Maven, never Gradle
metadata:
  type: feedback
---

For any JVM/Java module in the learn-our-favs repo (notably the `cloud-agnostic`
backend), use **Maven** (`pom.xml`, `mvnw`). Not Gradle.

**Why:** The user stopped a scaffold mid-pass specifically to correct Gradle →
Maven. Stated plainly: "Use maven not gradle".

**How to apply:** Scaffold Spring Boot with a `pom.xml`. If a wrapper is needed,
run `mvn -N wrapper:wrapper` rather than hand-writing wrapper files. Don't
propose Gradle as an option for this repo.
