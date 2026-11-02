package dev.grouplife.member;

import dev.grouplife.policy.CoverType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class MemberDtos {

    private MemberDtos() {}

    public record CreateMemberRequest(
            @NotBlank @Size(max = 50) String employeeNumber,
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotBlank @Email @Size(max = 200) String email,
            @NotNull @Past LocalDate dateOfBirth,
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal annualSalary,
            @NotNull LocalDate joinDate) {}

    public record ExitMemberRequest(@NotNull LocalDate exitDate) {}

    public record BeneficiaryRequest(
            @NotBlank @Size(max = 200) String fullName,
            @NotBlank @Size(max = 50) String relationship,
            @NotNull @DecimalMin("0.01") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2)
            BigDecimal allocationPercent) {}

    public record ReplaceBeneficiariesRequest(@NotEmpty @Size(max = 10) List<@Valid BeneficiaryRequest> beneficiaries) {}

    public record BeneficiaryView(UUID id, String fullName, String relationship, BigDecimal allocationPercent) {}

    public record MemberSummary(UUID id, String employeeNumber, String fullName, String email, MemberStatus status,
            String schemeName, String policyNumber, LocalDate joinDate) {}

    public record MemberDetail(UUID id, String employeeNumber, String firstName, String lastName, String email,
            LocalDate dateOfBirth, BigDecimal annualSalary, LocalDate joinDate, LocalDate exitDate,
            MemberStatus status, UUID policyId, String policyNumber, UUID schemeId, String schemeName,
            Set<CoverType> coverTypes, BigDecimal coverAmount, LocalDate waitingPeriodEndsOn,
            List<BeneficiaryView> beneficiaries) {}
}
