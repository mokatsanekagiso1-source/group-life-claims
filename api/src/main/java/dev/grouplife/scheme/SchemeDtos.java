package dev.grouplife.scheme;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class SchemeDtos {

    private SchemeDtos() {}

    public record CreateSchemeRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 50) String registrationNumber,
            @NotBlank @Email @Size(max = 200) String contactEmail) {}

    public record SchemeView(UUID id, String name, String registrationNumber, String contactEmail,
            long policyCount, Instant createdAt) {}
}
