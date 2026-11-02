package dev.grouplife.member;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import dev.grouplife.security.Role;
import dev.grouplife.support.ApiFixtures;
import dev.grouplife.support.IntegrationTest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class MemberApiIT extends IntegrationTest {

    private ApiFixtures fixtures;
    private String admin;
    private UUID policyId;

    @BeforeEach
    void setUp() {
        admin = tokenFor(Role.ADMIN, null);
        fixtures = new ApiFixtures(this, admin);
        policyId = fixtures.policy();
    }

    @Test
    void memberDetailShowsCoverAndWaitingPeriod() {
        LocalDate joined = LocalDate.now().minusMonths(2);
        UUID memberId = fixtures.member(policyId, joined);

        JsonNode member = get("/api/members/" + memberId, admin).getBody();

        assertThat(member.get("coverAmount").decimalValue()).isEqualByComparingTo("1200000.00");
        assertThat(member.get("waitingPeriodEndsOn").asText()).isEqualTo(joined.plusMonths(6).toString());
        assertThat(member.get("status").asText()).isEqualTo("ACTIVE");
    }

    @Test
    void beneficiaryAllocationsMustTotal100() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(1));

        var response = put("/api/members/" + memberId + "/beneficiaries", Map.of("beneficiaries", List.of(
                Map.of("fullName", "A", "relationship", "Spouse", "allocationPercent", 50),
                Map.of("fullName", "B", "relationship", "Child", "allocationPercent", 40))), admin);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody().get("code").asText()).isEqualTo("ALLOCATION_NOT_100");
        assertThat(get("/api/members/" + memberId, admin).getBody().get("beneficiaries")).isEmpty();
    }

    @Test
    void membersCanManageTheirOwnBeneficiariesButNotOthers() {
        UUID ownId = fixtures.member(policyId, LocalDate.now().minusYears(1));
        UUID otherId = fixtures.member(policyId, LocalDate.now().minusYears(1));
        String member = tokenFor(Role.MEMBER, ownId);
        var body = Map.of("beneficiaries", List.of(
                Map.of("fullName", "Only Child", "relationship", "Child", "allocationPercent", 100)));

        assertThat(put("/api/members/" + ownId + "/beneficiaries", body, member).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(put("/api/members/" + otherId + "/beneficiaries", body, member).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(get("/api/members/" + otherId, member).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void searchIsStaffOnlyAndFiltersByPolicyAndText() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(1));

        JsonNode page = get("/api/members?policyId=" + policyId + "&search=integration", admin).getBody();
        assertThat(page.get("totalElements").asInt()).isEqualTo(1);
        assertThat(page.get("content").get(0).get("id").asText()).isEqualTo(memberId.toString());

        String member = tokenFor(Role.MEMBER, memberId);
        assertThat(get("/api/members", member).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void validationErrorsAreReportedPerField() {
        var response = post("/api/policies/" + policyId + "/members", Map.of(
                "employeeNumber", "",
                "email", "not-an-email",
                "annualSalary", -1), admin);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        JsonNode errors = response.getBody().get("errors");
        assertThat(errors.has("employeeNumber")).isTrue();
        assertThat(errors.has("email")).isTrue();
        assertThat(errors.has("annualSalary")).isTrue();
        assertThat(errors.has("dateOfBirth")).isTrue();
    }

    @Test
    void duplicateEmployeeNumberOnAPolicyIsAConflict() {
        Map<String, Object> body = Map.of(
                "employeeNumber", unique("E"),
                "firstName", "Dup",
                "lastName", "Licate",
                "email", "dup@example.com",
                "dateOfBirth", "1990-01-01",
                "annualSalary", 300000,
                "joinDate", "2024-01-01");
        assertThat(post("/api/policies/" + policyId + "/members", body, admin).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        var duplicate = post("/api/policies/" + policyId + "/members", body, admin);

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(duplicate.getBody().get("type").asText()).isEqualTo("urn:grouplife:problem:conflict");
    }
}
