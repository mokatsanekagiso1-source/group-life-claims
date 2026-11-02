package dev.grouplife.member;

import dev.grouplife.common.PageResponse;
import dev.grouplife.member.MemberDtos.CreateMemberRequest;
import dev.grouplife.member.MemberDtos.ExitMemberRequest;
import dev.grouplife.member.MemberDtos.MemberDetail;
import dev.grouplife.member.MemberDtos.MemberSummary;
import dev.grouplife.member.MemberDtos.ReplaceBeneficiariesRequest;
import dev.grouplife.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Members", description = "Employees covered by a policy, and their beneficiaries")
public class MemberController {

    private final MemberService service;

    public MemberController(MemberService service) {
        this.service = service;
    }

    @GetMapping("/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "Search members")
    public PageResponse<MemberSummary> search(
            @RequestParam(required = false) UUID policyId,
            @RequestParam(required = false) MemberStatus status,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 20, sort = {"lastName", "firstName"}, direction = Sort.Direction.ASC)
            Pageable pageable) {
        return service.search(policyId, status, search, pageable);
    }

    @PostMapping("/policies/{policyId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add a member to a policy")
    public MemberDetail create(@PathVariable UUID policyId, @Valid @RequestBody CreateMemberRequest request) {
        return service.create(policyId, request);
    }

    @GetMapping("/members/{id}")
    @Operation(summary = "Get a member", description = "Members may only read their own record.")
    public MemberDetail get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.get(id, CurrentUser.from(jwt));
    }

    @PostMapping("/members/{id}/exit")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Record that a member has left the policy")
    public MemberDetail exit(@PathVariable UUID id, @Valid @RequestBody ExitMemberRequest request) {
        return service.exit(id, request.exitDate());
    }

    @PutMapping("/members/{id}/beneficiaries")
    @Operation(summary = "Replace a member's beneficiaries",
            description = "Allocations must total exactly 100%. Admins, or the member themselves.")
    public MemberDetail replaceBeneficiaries(@PathVariable UUID id,
            @Valid @RequestBody ReplaceBeneficiariesRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.replaceBeneficiaries(id, request, CurrentUser.from(jwt));
    }
}
