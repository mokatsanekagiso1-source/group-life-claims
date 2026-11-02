package dev.grouplife.claim;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.security.ProblemDetailSecurityHandler;
import dev.grouplife.security.SecurityConfig;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Web layer only: security, request validation and RFC 9457 error mapping. */
@WebMvcTest(ClaimController.class)
@Import({SecurityConfig.class, ProblemDetailSecurityHandler.class})
@ActiveProfiles("test")
class ClaimControllerTest {

    private static final UUID CLAIM_ID = UUID.randomUUID();

    @Autowired
    MockMvc mvc;

    @MockitoBean
    ClaimService service;

    @Test
    void requestsWithoutATokenGetA401Problem() throws Exception {
        mvc.perform(get("/api/claims"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value("urn:grouplife:problem:unauthorized"))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void invalidTransitionIsA409WithTheAllowedMoves() throws Exception {
        when(service.transition(eq(CLAIM_ID), any(), any()))
                .thenThrow(new InvalidClaimTransitionException(ClaimStatus.SUBMITTED, ClaimStatus.PAID));

        mvc.perform(post("/api/claims/{id}/transitions", CLAIM_ID).with(as("ASSESSOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetStatus\":\"PAID\"}"))
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value("urn:grouplife:problem:invalid-claim-transition"))
                .andExpect(jsonPath("$.detail").value("A claim cannot move from SUBMITTED to PAID"))
                .andExpect(jsonPath("$.from").value("SUBMITTED"))
                .andExpect(jsonPath("$.to").value("PAID"))
                .andExpect(jsonPath("$.allowed.length()").value(2));
    }

    @Test
    void businessRuleViolationIsA422WithACode() throws Exception {
        when(service.submit(any(), any()))
                .thenThrow(new BusinessRuleException("WAITING_PERIOD", "The event date falls within the waiting period"));

        mvc.perform(post("/api/claims").with(as("MEMBER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"memberId":"%s","coverType":"DEATH","eventDate":"2026-01-01","description":"x"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.type").value("urn:grouplife:problem:business-rule"))
                .andExpect(jsonPath("$.code").value("WAITING_PERIOD"));
    }

    @Test
    void invalidBodyIsA400ListingEachField() throws Exception {
        mvc.perform(post("/api/claims").with(as("MEMBER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"coverType\":\"DEATH\",\"description\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:grouplife:problem:validation"))
                .andExpect(jsonPath("$.errors.memberId").exists())
                .andExpect(jsonPath("$.errors.eventDate").exists())
                .andExpect(jsonPath("$.errors.description").exists());
    }

    @Test
    void accessDeniedFromTheServiceIsA403Problem() throws Exception {
        when(service.transition(eq(CLAIM_ID), any(), any()))
                .thenThrow(new AccessDeniedException("nope"));

        mvc.perform(post("/api/claims/{id}/transitions", CLAIM_ID).with(as("MEMBER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetStatus\":\"APPROVED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.type").value("urn:grouplife:problem:forbidden"));
    }

    private static JwtRequestPostProcessor as(String role) {
        return jwt()
                .jwt(token -> token.subject(role.toLowerCase())
                        .claim("role", role)
                        .claim("memberId", UUID.randomUUID().toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
    }
}
