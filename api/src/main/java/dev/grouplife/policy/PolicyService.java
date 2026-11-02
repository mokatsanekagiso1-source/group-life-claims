package dev.grouplife.policy;

import dev.grouplife.common.error.ConflictException;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.member.MemberRepository;
import dev.grouplife.policy.PolicyDtos.CreatePolicyRequest;
import dev.grouplife.policy.PolicyDtos.PolicyView;
import dev.grouplife.scheme.Scheme;
import dev.grouplife.scheme.SchemeRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PolicyService {

    private final PolicyRepository policies;
    private final SchemeRepository schemes;
    private final MemberRepository members;
    private final Clock clock;

    public PolicyService(PolicyRepository policies, SchemeRepository schemes, MemberRepository members,
            Clock clock) {
        this.policies = policies;
        this.schemes = schemes;
        this.members = members;
        this.clock = clock;
    }

    public PolicyView create(UUID schemeId, CreatePolicyRequest request) {
        Scheme scheme = schemes.findById(schemeId).orElseThrow(() -> new NotFoundException("Scheme", schemeId));
        if (policies.existsByPolicyNumber(request.policyNumber())) {
            throw new ConflictException("Policy number %s is already in use".formatted(request.policyNumber()));
        }
        var policy = policies.save(new Policy(scheme, request.policyNumber(), request.coverTypes(),
                request.coverMultiple(), request.waitingPeriodMonths(), request.effectiveDate(), clock.instant()));
        return toView(policy);
    }

    @Transactional(readOnly = true)
    public List<PolicyView> listForScheme(UUID schemeId) {
        if (!schemes.existsById(schemeId)) {
            throw new NotFoundException("Scheme", schemeId);
        }
        return policies.findBySchemeIdOrderByPolicyNumber(schemeId).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public PolicyView get(UUID id) {
        return toView(find(id));
    }

    public Policy find(UUID id) {
        return policies.findById(id).orElseThrow(() -> new NotFoundException("Policy", id));
    }

    private PolicyView toView(Policy policy) {
        return new PolicyView(policy.getId(), policy.getScheme().getId(), policy.getScheme().getName(),
                policy.getPolicyNumber(), policy.getCoverTypes(), policy.getCoverMultiple(),
                policy.getWaitingPeriodMonths(), policy.getEffectiveDate(), policy.getStatus(),
                members.countByPolicyId(policy.getId()));
    }
}
