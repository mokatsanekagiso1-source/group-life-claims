package dev.grouplife;

import static org.assertj.core.api.Assertions.assertThat;

import dev.grouplife.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.http.HttpStatus;

/** Spring Boot disables metrics export in tests by default; this class opts back in to check Prometheus. */
@AutoConfigureObservability
class ApplicationSmokeIT extends IntegrationTest {

    @LocalManagementPort
    int managementPort;

    @Test
    void healthEndpointReportsUpOnTheManagementPort() {
        var response = rest.getForEntity(management("/actuator/health"), String.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void prometheusExportsTheClaimMetrics() {
        var response = rest.getForEntity(management("/actuator/prometheus"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
                .contains("grouplife_claims_status{")
                .contains("status=\"UNDER_ASSESSMENT\"")
                .contains("http_server_requests_seconds");
    }

    @Test
    void actuatorIsNotServedOnThePublicPort() {
        assertThat(rest.getForEntity("/actuator/prometheus", String.class).getStatusCode())
                .isIn(HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED);
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

    private String management(String path) {
        return "http://localhost:" + managementPort + path;
    }
}
