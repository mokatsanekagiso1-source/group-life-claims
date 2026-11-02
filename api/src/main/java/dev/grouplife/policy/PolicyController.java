package dev.grouplife.policy;

import dev.grouplife.policy.PolicyDtos.CreatePolicyRequest;
import dev.grouplife.policy.PolicyDtos.PolicyView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Policies", description = "Group life policies and their cover terms")
public class PolicyController {

    private final PolicyService service;

    public PolicyController(PolicyService service) {
        this.service = service;
    }

    @GetMapping("/schemes/{schemeId}/policies")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "List a scheme's policies")
    public List<PolicyView> list(@PathVariable UUID schemeId) {
        return service.listForScheme(schemeId);
    }

    @PostMapping("/schemes/{schemeId}/policies")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a policy for a scheme")
    public PolicyView create(@PathVariable UUID schemeId, @Valid @RequestBody CreatePolicyRequest request) {
        return service.create(schemeId, request);
    }

    @GetMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "Get a policy")
    public PolicyView get(@PathVariable UUID id) {
        return service.get(id);
    }
}
