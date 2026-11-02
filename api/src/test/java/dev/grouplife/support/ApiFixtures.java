package dev.grouplife.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;

/** Builds schemes, policies and members through the API as an admin. */
public final class ApiFixtures {

    private final IntegrationTest test;
    private final String adminToken;

    public ApiFixtures(IntegrationTest test, String adminToken) {
        this.test = test;
        this.adminToken = adminToken;
    }

    /** A policy with all cover types, a 3× salary multiple and a 6-month waiting period. */
    public UUID policy() {
        var scheme = test.post("/api/schemes", Map.of(
                "name", "Integration Scheme Ltd",
                "registrationNumber", IntegrationTest.unique("SYN"),
                "contactEmail", "hr@integration.example.com"), adminToken);
        assertThat(scheme.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        var policy = test.post("/api/schemes/" + id(scheme.getBody()) + "/policies", Map.of(
                "policyNumber", IntegrationTest.unique("GL"),
                "coverTypes", List.of("DEATH", "DISABILITY", "FUNERAL"),
                "coverMultiple", 3,
                "waitingPeriodMonths", 6,
                "effectiveDate", LocalDate.now().minusYears(5).toString()), adminToken);
        assertThat(policy.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return id(policy.getBody());
    }

    /** A 35-year-old member on 400 000 a year (cover 1 200 000). */
    public UUID member(UUID policyId, LocalDate joinDate) {
        var member = test.post("/api/policies/" + policyId + "/members", Map.of(
                "employeeNumber", IntegrationTest.unique("E"),
                "firstName", "Integration",
                "lastName", "Member",
                "email", "integration.member@example.com",
                "dateOfBirth", LocalDate.now().minusYears(35).minusDays(10).toString(),
                "annualSalary", 400000,
                "joinDate", joinDate.toString()), adminToken);
        assertThat(member.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return id(member.getBody());
    }

    public void beneficiaries(UUID memberId, Map<String, Integer> allocations) {
        var body = Map.of("beneficiaries", allocations.entrySet().stream()
                .map(e -> Map.of("fullName", e.getKey(), "relationship", "Family", "allocationPercent", e.getValue()))
                .toList());
        var response = test.put("/api/members/" + memberId + "/beneficiaries", body, adminToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    public static UUID id(JsonNode node) {
        return UUID.fromString(node.get("id").asText());
    }
}
