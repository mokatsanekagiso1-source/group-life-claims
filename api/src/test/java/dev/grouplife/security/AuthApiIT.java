package dev.grouplife.security;

import static org.assertj.core.api.Assertions.assertThat;

import dev.grouplife.support.IntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AuthApiIT extends IntegrationTest {

    @Test
    void loginReturnsATokenThatIdentifiesTheUser() {
        String token = tokenFor(Role.ASSESSOR, null);

        var me = get("/api/auth/me", token);

        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().get("role").asText()).isEqualTo("ASSESSOR");
        assertThat(me.getBody().get("username").asText()).startsWith("assessor-");
    }

    @Test
    void unknownUserAndWrongPasswordGetTheSame401() {
        String token = tokenFor(Role.ADMIN, null);
        String username = get("/api/auth/me", token).getBody().get("username").asText();

        var wrongPassword = login(username, "wrong");
        var unknownUser = login("nobody-" + username, PASSWORD);

        assertThat(wrongPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknownUser.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(wrongPassword.getBody().get("detail").asText())
                .isEqualTo(unknownUser.getBody().get("detail").asText())
                .isEqualTo("Invalid username or password");
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokenFor(Role.ASSESSOR, null);

        var response = get("/api/auth/me", token.substring(0, token.length() - 4) + "AAAA");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void staffEndpointsRejectTheWrongRole() {
        String assessor = tokenFor(Role.ASSESSOR, null);

        var response = post("/api/schemes", Map.of("name", "X", "registrationNumber", unique("R"),
                "contactEmail", "x@example.com"), assessor);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("type").asText()).isEqualTo("urn:grouplife:problem:forbidden");
    }
}
