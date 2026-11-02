package dev.grouplife.claim;

import static dev.grouplife.claim.ClaimRepository.forMember;
import static dev.grouplife.claim.ClaimRepository.withStatusIn;

import dev.grouplife.claim.ClaimDtos.ClaimDetail;
import dev.grouplife.claim.ClaimDtos.ClaimSummary;
import dev.grouplife.claim.ClaimDtos.PayoutView;
import dev.grouplife.claim.ClaimDtos.SubmitClaimRequest;
import dev.grouplife.claim.ClaimDtos.TransitionRequest;
import dev.grouplife.claim.ClaimDtos.TransitionView;
import dev.grouplife.common.PageResponse;
import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.member.Member;
import dev.grouplife.member.MemberService;
import dev.grouplife.security.CurrentUser;
import dev.grouplife.security.Role;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ClaimService {

    /** Transitions that make up assessment and settlement, reserved for assessors. */
    private static final Set<ClaimStatus> ASSESSOR_TARGETS =
            EnumSet.of(ClaimStatus.UNDER_ASSESSMENT, ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.PAID);

    private final ClaimRepository claims;
    private final MemberService memberService;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public ClaimService(ClaimRepository claims, MemberService memberService, ApplicationEventPublisher events,
            Clock clock) {
        this.claims = claims;
        this.memberService = memberService;
        this.events = events;
        this.clock = clock;
    }

    public ClaimDetail submit(SubmitClaimRequest request, CurrentUser user) {
        if (user.is(Role.ASSESSOR)) {
            throw new AccessDeniedException("Assessors cannot submit claims");
        }
        Member member = memberService.findVisibleTo(request.memberId(), user);
        ClaimEligibility.check(member, request.coverType(), request.eventDate(), LocalDate.now(clock));
        if (claims.existsByMemberIdAndCoverTypeAndStatusIn(member.getId(), request.coverType(),
                ClaimStatus.OPEN_OR_SETTLED)) {
            throw new BusinessRuleException("DUPLICATE_CLAIM",
                    "The member already has an open or paid %s claim".formatted(request.coverType()));
        }

        String claimNumber = "CLM-%06d".formatted(claims.nextClaimNumber());
        Instant now = clock.instant();
        Claim claim = claims.save(Claim.submit(claimNumber, member, request.coverType(), request.eventDate(),
                request.description().trim(), user.username(), now));
        events.publishEvent(ClaimTransitionedEvent.of(claim, null, user.username(), now));
        return toDetail(claim, user);
    }

    public ClaimDetail transition(UUID id, TransitionRequest request, CurrentUser user) {
        Claim claim = findVisibleTo(id, user);
        ClaimStatus target = request.targetStatus();
        if (!mayPerform(user, claim, target)) {
            throw new AccessDeniedException("You may not move this claim to " + target);
        }

        ClaimStatus from = claim.getStatus();
        Instant now = clock.instant();
        claim.transitionTo(target, user.username(), request.reason(), now);
        if (target == ClaimStatus.APPROVED) {
            claim.recordPayouts(payoutSplit(claim));
        }
        claims.flush();
        events.publishEvent(ClaimTransitionedEvent.of(claim, from, user.username(), now));
        return toDetail(claim, user);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClaimSummary> search(Collection<ClaimStatus> statuses, UUID memberId, CurrentUser user,
            Pageable pageable) {
        UUID scopedMember = user.is(Role.MEMBER) ? user.memberId() : memberId;
        Specification<Claim> spec = Specification.allOf(withStatusIn(statuses), forMember(scopedMember));
        return PageResponse.of(claims.findAll(spec, pageable).map(ClaimService::toSummary));
    }

    @Transactional(readOnly = true)
    public ClaimDetail get(UUID id, CurrentUser user) {
        return toDetail(findVisibleTo(id, user), user);
    }

    private Claim findVisibleTo(UUID id, CurrentUser user) {
        Claim claim = claims.findById(id).orElseThrow(() -> new NotFoundException("Claim", id));
        if (user.is(Role.MEMBER) && !user.ownsMember(claim.getMember().getId())) {
            // Same response as a missing claim, so members cannot probe for other people's claim ids.
            throw new NotFoundException("Claim", id);
        }
        return claim;
    }

    /** Assessors assess, decide and pay. Members may withdraw their own claim; assessors may cancel too. */
    static boolean mayPerform(CurrentUser user, Claim claim, ClaimStatus target) {
        if (ASSESSOR_TARGETS.contains(target)) {
            return user.is(Role.ASSESSOR);
        }
        if (target == ClaimStatus.CANCELLED) {
            return user.is(Role.ASSESSOR) || user.ownsMember(claim.getMember().getId());
        }
        return false;
    }

    private static List<PayoutCalculator.Share> payoutSplit(Claim claim) {
        Member member = claim.getMember();
        if (!member.hasCompleteBeneficiaryAllocation()) {
            throw new BusinessRuleException("BENEFICIARIES_INCOMPLETE",
                    "The member's beneficiary allocations must total 100% before the claim can be approved");
        }
        return PayoutCalculator.split(claim.getCoverAmount(), member.getBeneficiaries().stream()
                .map(b -> new PayoutCalculator.Allocation(b.getFullName(), b.getAllocationPercent()))
                .toList());
    }

    static ClaimSummary toSummary(Claim c) {
        return new ClaimSummary(c.getId(), c.getClaimNumber(), c.getMember().getId(), c.getMember().fullName(),
                c.getCoverType(), c.getEventDate(), c.getStatus(), c.getCoverAmount(), c.getSubmittedAt(),
                c.getDecidedAt());
    }

    static ClaimDetail toDetail(Claim c, CurrentUser user) {
        Set<ClaimStatus> allowed = c.getStatus().allowedTargets().stream()
                .filter(target -> mayPerform(user, c, target))
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(ClaimStatus.class)));
        return new ClaimDetail(c.getId(), c.getClaimNumber(), c.getMember().getId(), c.getMember().fullName(),
                c.getMember().getPolicy().getPolicyNumber(), c.getCoverType(), c.getEventDate(), c.getDescription(),
                c.getStatus(), c.getCoverAmount(), c.getSubmittedAt(), c.getDecidedAt(), allowed,
                c.getTransitions().stream()
                        .map(t -> new TransitionView(t.getFromStatus(), t.getToStatus(), t.getActor(), t.getReason(),
                                t.getOccurredAt()))
                        .toList(),
                c.getPayouts().stream()
                        .map(p -> new PayoutView(p.getBeneficiaryName(), p.getAllocationPercent(), p.getAmount()))
                        .toList());
    }
}
