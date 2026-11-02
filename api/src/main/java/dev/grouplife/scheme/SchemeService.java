package dev.grouplife.scheme;

import dev.grouplife.common.error.ConflictException;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.policy.PolicyRepository;
import dev.grouplife.scheme.SchemeDtos.CreateSchemeRequest;
import dev.grouplife.scheme.SchemeDtos.SchemeView;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SchemeService {

    private final SchemeRepository schemes;
    private final PolicyRepository policies;
    private final Clock clock;

    public SchemeService(SchemeRepository schemes, PolicyRepository policies, Clock clock) {
        this.schemes = schemes;
        this.policies = policies;
        this.clock = clock;
    }

    public SchemeView create(CreateSchemeRequest request) {
        if (schemes.existsByRegistrationNumber(request.registrationNumber())) {
            throw new ConflictException(
                    "A scheme with registration number %s already exists".formatted(request.registrationNumber()));
        }
        var scheme = schemes.save(new Scheme(request.name(), request.registrationNumber(),
                request.contactEmail(), clock.instant()));
        return toView(scheme);
    }

    @Transactional(readOnly = true)
    public List<SchemeView> list() {
        return schemes.findAll(Sort.by("name")).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public SchemeView get(UUID id) {
        return toView(schemes.findById(id).orElseThrow(() -> new NotFoundException("Scheme", id)));
    }

    private SchemeView toView(Scheme scheme) {
        return new SchemeView(scheme.getId(), scheme.getName(), scheme.getRegistrationNumber(),
                scheme.getContactEmail(), policies.countBySchemeId(scheme.getId()), scheme.getCreatedAt());
    }
}
