package dev.grouplife.scheme;

import dev.grouplife.scheme.SchemeDtos.CreateSchemeRequest;
import dev.grouplife.scheme.SchemeDtos.SchemeView;
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
@RequestMapping("/api/schemes")
@Tag(name = "Schemes", description = "Employers holding group policies")
public class SchemeController {

    private final SchemeService service;

    public SchemeController(SchemeService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "List schemes")
    public List<SchemeView> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ASSESSOR')")
    @Operation(summary = "Get a scheme")
    public SchemeView get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a scheme")
    public SchemeView create(@Valid @RequestBody CreateSchemeRequest request) {
        return service.create(request);
    }
}
