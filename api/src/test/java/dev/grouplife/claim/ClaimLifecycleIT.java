package dev.grouplife.claim;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import dev.grouplife.security.Role;
import dev.grouplife.support.ApiFixtures;
import dev.grouplife.support.IntegrationTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ClaimLifecycleIT extends IntegrationTest {

    private ApiFixtures fixtures;
    private UUID policyId;
    private String assessor;

    @BeforeEach
    void setUp() {
        fixtures = new ApiFixtures(this, tokenFor(Role.ADMIN, null));
        policyId = fixtures.policy();
        assessor = tokenFor(Role.ASSESSOR, null);
    }

    @Test
    void claimGoesFromSubmissionToPaymentWithAFullAuditTrail() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        var allocations = new LinkedHashMap<String, Integer>();
        allocations.put("Spouse Member", 60);
        allocations.put("Child Member", 40);
        fixtures.beneficiaries(memberId, allocations);
        String member = tokenFor(Role.MEMBER, memberId);

        var submitted = submit(memberId, "DEATH", LocalDate.now().minusDays(3), member);
        assertThat(submitted.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode claim = submitted.getBody();
        assertThat(claim.get("status").asText()).isEqualTo("SUBMITTED");
        assertThat(claim.get("claimNumber").asText()).matches("CLM-\\d{6}");
        assertThat(claim.get("coverAmount").decimalValue()).isEqualByComparingTo("1200000.00");
        assertThat(texts(claim.get("allowedTransitions"))).containsExactly("CANCELLED");

        UUID claimId = ApiFixtures.id(claim);
        transition(claimId, "UNDER_ASSESSMENT", null, assessor, HttpStatus.OK);
        transition(claimId, "APPROVED", "Documents verified", assessor, HttpStatus.OK);
        JsonNode paid = transition(claimId, "PAID", "EFT batch 42", assessor, HttpStatus.OK).getBody();

        assertThat(paid.get("status").asText()).isEqualTo("PAID");
        assertThat(paid.get("decidedAt").isNull()).isFalse();
        assertThat(paid.get("payouts")).hasSize(2);
        BigDecimal paidOut = BigDecimal.ZERO;
        for (JsonNode payout : paid.get("payouts")) {
            paidOut = paidOut.add(payout.get("amount").decimalValue());
        }
        assertThat(paidOut).isEqualByComparingTo("1200000.00");

        JsonNode trail = get("/api/claims/" + claimId, member).getBody().get("transitions");
        assertThat(texts(trail, "toStatus")).containsExactly("SUBMITTED", "UNDER_ASSESSMENT", "APPROVED", "PAID");
        assertThat(trail.get(0).get("fromStatus").isNull()).isTrue();
        assertThat(trail.get(0).get("actor").asText()).startsWith("member-");
        assertThat(trail.get(2).get("actor").asText()).startsWith("assessor-");
        assertThat(trail.get(2).get("reason").asText()).isEqualTo("Documents verified");
    }

    @Test
    void invalidTransitionReturns409ProblemAndChangesNothing() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        UUID claimId = ApiFixtures.id(submit(memberId, "FUNERAL", LocalDate.now(), tokenFor(Role.MEMBER, memberId))
                .getBody());

        JsonNode problem = transition(claimId, "PAID", null, assessor, HttpStatus.CONFLICT).getBody();

        assertThat(problem.get("type").asText()).isEqualTo("urn:grouplife:problem:invalid-claim-transition");
        assertThat(problem.get("from").asText()).isEqualTo("SUBMITTED");
        assertThat(texts(problem.get("allowed"))).containsExactlyInAnyOrder("UNDER_ASSESSMENT", "CANCELLED");
        assertThat(get("/api/claims/" + claimId, assessor).getBody().get("transitions")).hasSize(1);
    }

    @Test
    void approvalIsBlockedUntilBeneficiariesTotal100() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        UUID claimId = ApiFixtures.id(submit(memberId, "DEATH", LocalDate.now(), tokenFor(Role.MEMBER, memberId))
                .getBody());
        transition(claimId, "UNDER_ASSESSMENT", null, assessor, HttpStatus.OK);

        JsonNode problem = transition(claimId, "APPROVED", null, assessor, HttpStatus.UNPROCESSABLE_ENTITY).getBody();

        assertThat(problem.get("code").asText()).isEqualTo("BENEFICIARIES_INCOMPLETE");
        assertThat(get("/api/claims/" + claimId, assessor).getBody().get("status").asText())
                .isEqualTo("UNDER_ASSESSMENT");
    }

    @Test
    void rejectionNeedsAReason() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        UUID claimId = ApiFixtures.id(submit(memberId, "DISABILITY", LocalDate.now(), tokenFor(Role.MEMBER, memberId))
                .getBody());
        transition(claimId, "UNDER_ASSESSMENT", null, assessor, HttpStatus.OK);

        JsonNode problem = transition(claimId, "REJECTED", " ", assessor, HttpStatus.UNPROCESSABLE_ENTITY).getBody();
        assertThat(problem.get("code").asText()).isEqualTo("REASON_REQUIRED");

        JsonNode rejected = transition(claimId, "REJECTED", "Not permanent", assessor, HttpStatus.OK).getBody();
        assertThat(rejected.get("status").asText()).isEqualTo("REJECTED");
        assertThat(rejected.get("allowedTransitions")).isEmpty();
    }

    @Test
    void membersOnlySeeAndActOnTheirOwnClaims() {
        UUID ownerId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        UUID otherId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        String owner = tokenFor(Role.MEMBER, ownerId);
        String other = tokenFor(Role.MEMBER, otherId);
        UUID claimId = ApiFixtures.id(submit(ownerId, "DEATH", LocalDate.now(), owner).getBody());

        assertThat(get("/api/claims/" + claimId, other).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(submit(ownerId, "FUNERAL", LocalDate.now(), other).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(get("/api/claims", other).getBody().get("totalElements").asInt()).isZero();
        assertThat(get("/api/claims", owner).getBody().get("totalElements").asInt()).isEqualTo(1);

        transition(claimId, "UNDER_ASSESSMENT", null, owner, HttpStatus.FORBIDDEN);
        transition(claimId, "CANCELLED", "Lodged by mistake", owner, HttpStatus.OK);
    }

    @Test
    void assessorQueueFiltersByStatus() {
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(2));
        String member = tokenFor(Role.MEMBER, memberId);
        UUID claimId = ApiFixtures.id(submit(memberId, "DEATH", LocalDate.now(), member).getBody());

        JsonNode queue = get("/api/claims?status=SUBMITTED&status=UNDER_ASSESSMENT&memberId=" + memberId, assessor)
                .getBody();

        assertThat(texts(queue.get("content"), "id")).containsExactly(claimId.toString());
        assertThat(get("/api/claims?status=PAID&memberId=" + memberId, assessor).getBody().get("content")).isEmpty();
    }

    private ResponseEntity<JsonNode> submit(UUID memberId, String coverType, LocalDate eventDate, String token) {
        return post("/api/claims", Map.of(
                "memberId", memberId,
                "coverType", coverType,
                "eventDate", eventDate.toString(),
                "description", "Integration test claim"), token);
    }

    private ResponseEntity<JsonNode> transition(UUID claimId, String target, String reason, String token,
            HttpStatus expected) {
        var body = new LinkedHashMap<String, Object>();
        body.put("targetStatus", target);
        body.put("reason", reason);
        var response = post("/api/claims/" + claimId + "/transitions", body, token);
        assertThat(response.getStatusCode()).as("%s -> %s: %s", claimId, target, response.getBody())
                .isEqualTo(expected);
        return response;
    }

    private static List<String> texts(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(node -> values.add(node.asText()));
        return values;
    }

    private static List<String> texts(JsonNode array, String field) {
        List<String> values = new ArrayList<>();
        array.forEach(node -> values.add(node.get(field).asText()));
        return values;
    }
}
