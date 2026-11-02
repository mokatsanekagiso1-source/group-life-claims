package dev.grouplife.security;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record LoginResponse(String accessToken, Instant expiresAt, String username, Role role, UUID memberId) {}

    public record MeResponse(String username, Role role, UUID memberId) {}
}
