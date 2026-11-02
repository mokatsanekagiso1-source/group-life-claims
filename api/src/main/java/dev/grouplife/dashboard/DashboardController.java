package dev.grouplife.dashboard;

import dev.grouplife.common.PageResponse;
import dev.grouplife.dashboard.DashboardDtos.ActivityItem;
import dev.grouplife.dashboard.DashboardDtos.Dashboard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Dashboard", description = "Operational overview for staff")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "Claims KPIs, monthly volume, aging claims and recent activity")
    public Dashboard dashboard(@AuthenticationPrincipal Jwt jwt) {
        return service.dashboard(jwt.getSubject());
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "Every claim status change, newest first")
    public PageResponse<ActivityItem> activity(@ParameterObject @PageableDefault(size = 25) Pageable pageable) {
        return service.activity(pageable);
    }
}
