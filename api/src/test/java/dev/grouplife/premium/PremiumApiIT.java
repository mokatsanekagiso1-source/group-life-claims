package dev.grouplife.premium;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import dev.grouplife.security.Role;
import dev.grouplife.support.ApiFixtures;
import dev.grouplife.support.IntegrationTest;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class PremiumApiIT extends IntegrationTest {

    @Test
    void memberPremiumUsesTheMigratedRateTable() {
        String admin = tokenFor(Role.ADMIN, null);
        var fixtures = new ApiFixtures(this, admin);
        UUID policyId = fixtures.policy();
        UUID memberId = fixtures.member(policyId, LocalDate.now().minusYears(1));

        JsonNode quote = get("/api/members/" + memberId + "/premium", admin).getBody();

        // Age 35 falls in the 30-39 band (0.00045): 1 200 000 × 0.00045 = 540.00
        assertThat(quote.get("age").asInt()).isEqualTo(35);
        assertThat(quote.get("monthlyRate").decimalValue()).isEqualByComparingTo("0.00045");
        assertThat(quote.get("monthlyPremium").decimalValue()).isEqualByComparingTo("540.00");
    }

    @Test
    void policyScheduleOnlyIncludesMembersActiveOnTheDate() {
        String admin = tokenFor(Role.ADMIN, null);
        var fixtures = new ApiFixtures(this, admin);
        UUID policyId = fixtures.policy();
        fixtures.member(policyId, LocalDate.now().minusYears(1));
        fixtures.member(policyId, LocalDate.now().plusMonths(1));

        JsonNode schedule = get("/api/policies/" + policyId + "/premium-schedule", admin).getBody();

        assertThat(schedule.get("memberCount").asInt()).isEqualTo(1);
        assertThat(schedule.get("totalMonthlyPremium").decimalValue()).isEqualByComparingTo("540.00");
    }

    @Test
    void scheduleIsAdminOnly() {
        String assessor = tokenFor(Role.ASSESSOR, null);

        assertThat(get("/api/policies/" + UUID.randomUUID() + "/premium-schedule", assessor).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
