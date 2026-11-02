package dev.grouplife.claim;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import dev.grouplife.security.Role;
import dev.grouplife.support.ApiFixtures;
import dev.grouplife.support.IntegrationTest;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ClaimSubmissionRulesIT extends IntegrationTest {

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
    void eventInsideTheWaitingPeriodIsRejected() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusMonths(2));

        assertRule(submit(memberId, "DEATH", LocalDate.now()), "WAITING_PERIOD");
    }

    @Test
    void eventBeforeTheMemberJoinedIsRejected() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(1));

        assertRule(submit(memberId, "DEATH", LocalDate.now().minusYears(2)), "MEMBER_NOT_ACTIVE");
    }

    @Test
    void eventAfterTheMemberExitedIsRejected() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        var exit = post("/api/members/" + memberId + "/exit",
                Map.of("exitDate", LocalDate.now().minusMonths(1).toString()), admin);
        assertThat(exit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(exit.getBody().get("status").asText()).isEqualTo("EXITED");

        assertRule(submit(memberId, "DEATH", LocalDate.now().minusDays(1)), "MEMBER_NOT_ACTIVE");
    }

    @Test
    void secondOpenClaimForTheSameCoverIsRejected() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        assertThat(submit(memberId, "DEATH", LocalDate.now()).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertRule(submit(memberId, "DEATH", LocalDate.now()), "DUPLICATE_CLAIM");
        assertThat(submit(memberId, "FUNERAL", LocalDate.now()).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void futureEventDateIsRejected() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));

        assertRule(submit(memberId, "DEATH", LocalDate.now().plusDays(1)), "EVENT_DATE_IN_FUTURE");
    }

    @Test
    void unknownMemberIs404() {
        var response = submit(UUID.randomUUID(), "DEATH", LocalDate.now());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("type").asText()).isEqualTo("urn:grouplife:problem:not-found");
    }

    private ResponseEntity<JsonNode> submit(UUID memberId, String coverType, LocalDate eventDate) {
        return post("/api/claims", Map.of(
                "memberId", memberId,
                "coverType", coverType,
                "eventDate", eventDate.toString(),
                "description", "Integration test claim"), admin);
    }

    private static void assertRule(ResponseEntity<JsonNode> response, String code) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json");
        assertThat(response.getBody().get("type").asText()).isEqualTo("urn:grouplife:problem:business-rule");
        assertThat(response.getBody().get("code").asText()).isEqualTo(code);
    }
}
