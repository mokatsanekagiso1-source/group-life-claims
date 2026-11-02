package dev.grouplife.support;

import com.fasterxml.jackson.databind.JsonNode;
import dev.grouplife.security.AppUser;
import dev.grouplife.security.AppUserRepository;
import dev.grouplife.security.Role;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base for API tests against a real PostgreSQL in Docker. One container is shared by every test
 * class (and the cached Spring context), so tests isolate themselves with unique data rather than
 * by truncating tables. Skipped when Docker is unavailable.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
public abstract class IntegrationTest {

    protected static final String PASSWORD = "Integration1!";

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    protected TestRestTemplate rest;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Creates a user with a unique name and returns a bearer token for them. */
    protected String tokenFor(Role role, UUID memberId) {
        String username = role.name().toLowerCase() + "-" + UUID.randomUUID();
        users.save(new AppUser(username, passwordEncoder.encode(PASSWORD), role, memberId));
        return login(username, PASSWORD).getBody().get("accessToken").asText();
    }

    protected ResponseEntity<JsonNode> login(String username, String password) {
        return rest.postForEntity("/api/auth/login", Map.of("username", username, "password", password),
                JsonNode.class);
    }

    protected ResponseEntity<JsonNode> get(String path, String token) {
        return exchange(HttpMethod.GET, path, null, token);
    }

    protected ResponseEntity<JsonNode> post(String path, Object body, String token) {
        return exchange(HttpMethod.POST, path, body, token);
    }

    protected ResponseEntity<JsonNode> put(String path, Object body, String token) {
        return exchange(HttpMethod.PUT, path, body, token);
    }

    private ResponseEntity<JsonNode> exchange(HttpMethod method, String path, Object body, String token) {
        var headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
