package dev.grouplife;

import static org.assertj.core.api.Assertions.assertThat;

import dev.grouplife.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ApplicationSmokeIT extends IntegrationTest {

    @Test
    void healthEndpointReportsUp() {
        var response = rest.getForEntity("/actuator/health", String.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void openApiDocumentIsPublic() {
        var response = rest.getForEntity("/v3/api-docs", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Group Life Claims API", "/api/claims/{id}/transitions");
    }

    @Test
    void protectedEndpointsNeedAToken() {
        var response = rest.getForEntity("/api/premium-rates", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
