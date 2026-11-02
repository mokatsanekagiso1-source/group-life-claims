package dev.grouplife.premium;

import dev.grouplife.premium.PremiumDtos.PremiumQuote;
import dev.grouplife.premium.PremiumDtos.PremiumSchedule;
import dev.grouplife.premium.PremiumDtos.RateBandView;
import dev.grouplife.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Premiums", description = "Monthly premiums from the age-band rate table")
public class PremiumController {

    private final PremiumService service;

    public PremiumController(PremiumService service) {
        this.service = service;
    }

    @GetMapping("/members/{memberId}/premium")
    @Operation(summary = "Monthly premium for a member", description = "asOf defaults to today.")
    public PremiumQuote memberPremium(@PathVariable UUID memberId, @RequestParam(required = false) LocalDate asOf,
            @AuthenticationPrincipal Jwt jwt) {
        return service.quoteForMember(memberId, asOf, CurrentUser.from(jwt));
    }

    @GetMapping("/policies/{policyId}/premium-schedule")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Monthly premium schedule for all active members of a policy")
    public PremiumSchedule schedule(@PathVariable UUID policyId, @RequestParam(required = false) LocalDate asOf) {
        return service.scheduleForPolicy(policyId, asOf);
    }

    @GetMapping("/premium-rates")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "The age-band rate table")
    public List<RateBandView> rates() {
        return service.rateBands();
    }
}
