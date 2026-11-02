package dev.grouplife.claim;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import dev.grouplife.security.Role;
import dev.grouplife.support.ApiFixtures;
import dev.grouplife.support.IntegrationTest;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;

class ClaimCollaborationIT extends IntegrationTest {

    private static final byte[] PDF = "%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);

    private String member;
    private String assessor;
    private String otherAssessor;
    private UUID claimId;

    @BeforeEach
    void setUp() {
        var fixtures = new ApiFixtures(this, tokenFor(Role.ADMIN, null));
        UUID memberId = fixtures.member(fixtures.policy(), LocalDate.now().minusYears(2));
        member = tokenFor(Role.MEMBER, memberId);
        assessor = tokenFor(Role.ASSESSOR, null);
        otherAssessor = tokenFor(Role.ASSESSOR, null);
        claimId = ApiFixtures.id(post("/api/claims", Map.of("memberId", memberId, "coverType", "DEATH",
                "eventDate", LocalDate.now().toString(), "description", "Collaboration test"), member).getBody());
    }

    @Test
    void membersNeverSeeInternalNotes() {
        assertThat(post(notes(), Map.of("body", "Please upload the death certificate.", "internal", false), assessor)
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(post(notes(), Map.of("body", "Employer confirmed salary.", "internal", true), assessor)
                .getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(post(notes(), Map.of("body", "Uploading it now.", "internal", false), member).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        assertThat(get(notes(), member).getBody()).hasSize(2);
        JsonNode staffView = get(notes(), assessor).getBody();
        assertThat(staffView).hasSize(3);
        assertThat(staffView.get(1).get("internal").asBoolean()).isTrue();
    }

    @Test
    void membersCannotWriteInternalNotes() {
        var response = post(notes(), Map.of("body", "Secret", "internal", true), member);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void uploadsAreCheckedByContentAndCanBeDownloaded() {
        var uploaded = upload("death-certificate.pdf", PDF, member);
        assertThat(uploaded.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(uploaded.getBody().get("contentType").asText()).isEqualTo("application/pdf");
        assertThat(uploaded.getBody().get("category").asText()).isEqualTo("DEATH_CERTIFICATE");

        var disguised = upload("totally-a.pdf", "MZ this is an executable".getBytes(StandardCharsets.US_ASCII), member);
        assertThat(disguised.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(disguised.getBody().get("code").asText()).isEqualTo("UNSUPPORTED_DOCUMENT");

        assertThat(get(documents(), assessor).getBody()).hasSize(1);
        String documentId = uploaded.getBody().get("id").asText();
        var headers = new HttpHeaders();
        headers.setBearerAuth(assessor);
        ResponseEntity<byte[]> download = rest.exchange(documents() + "/" + documentId + "/content", HttpMethod.GET,
                new HttpEntity<>(headers), byte[].class);
        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getBody()).isEqualTo(PDF);
        assertThat(download.getHeaders().getContentDisposition().getFilename()).isEqualTo("death-certificate.pdf");
    }

    @Test
    void anAssessorPicksUpAClaimAndOnlyTheyCanReleaseIt() {
        JsonNode assigned = post("/api/claims/" + claimId + "/assignment", Map.of("toMe", true), assessor).getBody();
        String username = get("/api/auth/me", assessor).getBody().get("username").asText();
        assertThat(assigned.get("assignee").asText()).isEqualTo(username);

        var stolenRelease = post("/api/claims/" + claimId + "/assignment", Map.of("toMe", false), otherAssessor);
        assertThat(stolenRelease.getBody().get("code").asText()).isEqualTo("NOT_ASSIGNEE");

        JsonNode mine = get("/api/claims?assignee=me", assessor).getBody();
        assertThat(mine.get("content").get(0).get("id").asText()).isEqualTo(claimId.toString());
    }

    @Test
    void theMemberIsNotifiedWhenTheirClaimMoves() {
        post("/api/claims/" + claimId + "/transitions", Map.of("targetStatus", "UNDER_ASSESSMENT"), assessor);

        JsonNode feed = get("/api/notifications", member).getBody();
        assertThat(feed.get("unread").asLong()).isEqualTo(1);
        assertThat(feed.get("items").get(0).get("title").asText()).endsWith("under assessment");

        String id = feed.get("items").get(0).get("id").asText();
        assertThat(post("/api/notifications/" + id + "/read", null, member).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(get("/api/notifications/unread-count", member).getBody().get("unread").asLong()).isZero();
    }

    @Test
    void theDashboardSummarisesClaims() {
        JsonNode dashboard = get("/api/dashboard", assessor).getBody();

        assertThat(dashboard.get("openClaims").asLong()).isPositive();
        assertThat(dashboard.get("submittedByMonth")).hasSize(6);
        assertThat(dashboard.get("recentActivity").size()).isPositive();
        assertThat(get("/api/dashboard", member).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private String notes() {
        return "/api/claims/" + claimId + "/notes";
    }

    private String documents() {
        return "/api/claims/" + claimId + "/documents";
    }

    private ResponseEntity<JsonNode> upload(String fileName, byte[] content, String token) {
        var body = new LinkedMultiValueMap<String, Object>();
        body.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return fileName;
            }
        });
        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        return rest.exchange(documents() + "?category=DEATH_CERTIFICATE", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
    }
}
