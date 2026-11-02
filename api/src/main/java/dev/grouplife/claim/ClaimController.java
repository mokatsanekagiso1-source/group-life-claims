package dev.grouplife.claim;

import dev.grouplife.claim.ClaimDtos.ClaimDetail;
import dev.grouplife.claim.ClaimDtos.ClaimSummary;
import dev.grouplife.claim.ClaimDtos.SubmitClaimRequest;
import dev.grouplife.claim.ClaimDtos.TransitionRequest;
import dev.grouplife.common.PageResponse;
import dev.grouplife.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/claims")
@Tag(name = "Claims", description = "Submit, assess and settle claims")
public class ClaimController {

    private final ClaimService service;

    public ClaimController(ClaimService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Submit a claim",
            description = "Members submit for themselves; admins may submit on a member's behalf.")
    public ClaimDetail submit(@Valid @RequestBody SubmitClaimRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.submit(request, CurrentUser.from(jwt));
    }

    @GetMapping
    @Operation(summary = "Search claims", description = "Members only see their own claims.")
    public PageResponse<ClaimSummary> search(
            @RequestParam(required = false) List<ClaimStatus> status,
            @RequestParam(required = false) UUID memberId,
            @ParameterObject @PageableDefault(size = 20, sort = "submittedAt", direction = Sort.Direction.ASC)
            Pageable pageable,
            @AuthenticationPrincipal Jwt jwt) {
        return service.search(status, memberId, CurrentUser.from(jwt), pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a claim with its audit trail and payout split")
    public ClaimDetail get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.get(id, CurrentUser.from(jwt));
    }

    @PostMapping("/{id}/transitions")
    @Operation(summary = "Move a claim to a new status",
            description = "Allowed moves: SUBMITTED→UNDER_ASSESSMENT|CANCELLED, UNDER_ASSESSMENT→APPROVED|REJECTED|CANCELLED, "
                    + "APPROVED→PAID. Anything else returns 409. REJECTED and CANCELLED need a reason.")
    public ClaimDetail transition(@PathVariable UUID id, @Valid @RequestBody TransitionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.transition(id, request, CurrentUser.from(jwt));
    }
}
