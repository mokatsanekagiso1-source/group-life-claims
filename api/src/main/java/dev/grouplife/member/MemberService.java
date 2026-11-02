package dev.grouplife.member;

import static dev.grouplife.member.MemberRepository.inPolicy;
import static dev.grouplife.member.MemberRepository.matching;
import static dev.grouplife.member.MemberRepository.withStatus;

import dev.grouplife.common.PageResponse;
import dev.grouplife.common.error.ConflictException;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.member.Member.NewBeneficiary;
import dev.grouplife.member.MemberDtos.BeneficiaryView;
import dev.grouplife.member.MemberDtos.CreateMemberRequest;
import dev.grouplife.member.MemberDtos.MemberDetail;
import dev.grouplife.member.MemberDtos.MemberSummary;
import dev.grouplife.member.MemberDtos.ReplaceBeneficiariesRequest;
import dev.grouplife.policy.Policy;
import dev.grouplife.policy.PolicyRepository;
import dev.grouplife.security.CurrentUser;
import dev.grouplife.security.Role;
import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MemberService {

    private final MemberRepository members;
    private final PolicyRepository policies;
    private final Clock clock;

    public MemberService(MemberRepository members, PolicyRepository policies, Clock clock) {
        this.members = members;
        this.policies = policies;
        this.clock = clock;
    }

    public MemberDetail create(UUID policyId, CreateMemberRequest request) {
        Policy policy = policies.findById(policyId).orElseThrow(() -> new NotFoundException("Policy", policyId));
        if (members.existsByPolicyIdAndEmployeeNumber(policyId, request.employeeNumber())) {
            throw new ConflictException(
                    "Employee number %s is already on this policy".formatted(request.employeeNumber()));
        }
        var member = members.save(new Member(policy, request.employeeNumber(), request.firstName(),
                request.lastName(), request.email(), request.dateOfBirth(), request.annualSalary(),
                request.joinDate(), clock.instant()));
        return toDetail(member);
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberSummary> search(UUID policyId, MemberStatus status, String search, Pageable pageable) {
        Specification<Member> spec = Specification.allOf(inPolicy(policyId), withStatus(status), matching(search));
        return PageResponse.of(members.findAll(spec, pageable).map(MemberService::toSummary));
    }

    @Transactional(readOnly = true)
    public MemberDetail get(UUID id, CurrentUser user) {
        return toDetail(findVisibleTo(id, user));
    }

    public MemberDetail exit(UUID id, LocalDate exitDate) {
        Member member = find(id);
        member.exit(exitDate);
        return toDetail(member);
    }

    public MemberDetail replaceBeneficiaries(UUID id, ReplaceBeneficiariesRequest request, CurrentUser user) {
        Member member = findVisibleTo(id, user);
        if (user.is(Role.ASSESSOR)) {
            throw new AccessDeniedException("Assessors cannot change beneficiaries");
        }
        member.replaceBeneficiaries(request.beneficiaries().stream()
                .map(b -> new NewBeneficiary(b.fullName().trim(), b.relationship().trim(), b.allocationPercent()))
                .toList());
        members.flush();
        return toDetail(member);
    }

    public Member find(UUID id) {
        return members.findById(id).orElseThrow(() -> new NotFoundException("Member", id));
    }

    /** Members may only see their own record; staff see everyone. */
    public Member findVisibleTo(UUID id, CurrentUser user) {
        if (user.is(Role.MEMBER) && !user.ownsMember(id)) {
            throw new AccessDeniedException("Members may only access their own record");
        }
        return find(id);
    }

    static MemberSummary toSummary(Member m) {
        return new MemberSummary(m.getId(), m.getEmployeeNumber(), m.fullName(), m.getEmail(), m.getStatus(),
                m.getPolicy().getScheme().getName(), m.getPolicy().getPolicyNumber(), m.getJoinDate());
    }

    static MemberDetail toDetail(Member m) {
        Policy policy = m.getPolicy();
        return new MemberDetail(m.getId(), m.getEmployeeNumber(), m.getFirstName(), m.getLastName(), m.getEmail(),
                m.getDateOfBirth(), m.getAnnualSalary(), m.getJoinDate(), m.getExitDate(), m.getStatus(),
                policy.getId(), policy.getPolicyNumber(), policy.getScheme().getId(), policy.getScheme().getName(),
                policy.getCoverTypes(), m.coverAmount(), m.waitingPeriodEndsOn(),
                m.getBeneficiaries().stream()
                        .map(b -> new BeneficiaryView(b.getId(), b.getFullName(), b.getRelationship(),
                                b.getAllocationPercent()))
                        .toList());
    }
}
