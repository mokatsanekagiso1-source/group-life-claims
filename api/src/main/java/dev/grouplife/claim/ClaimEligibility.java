package dev.grouplife.claim;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.member.Member;
import dev.grouplife.policy.CoverType;
import dev.grouplife.policy.Policy;
import java.time.LocalDate;

/** Rules a claim must pass at submission. Pure logic, so it is tested without Spring or a database. */
public final class ClaimEligibility {

    private ClaimEligibility() {}

    public static void check(Member member, CoverType coverType, LocalDate eventDate, LocalDate today) {
        if (eventDate.isAfter(today)) {
            throw new BusinessRuleException("EVENT_DATE_IN_FUTURE", "The event date cannot be in the future");
        }
        Policy policy = member.getPolicy();
        if (!policy.covers(coverType)) {
            throw new BusinessRuleException("COVER_TYPE_NOT_COVERED",
                    "Policy %s does not include %s cover".formatted(policy.getPolicyNumber(), coverType));
        }
        if (!policy.isInForceOn(eventDate)) {
            throw new BusinessRuleException("POLICY_NOT_IN_FORCE",
                    "Policy %s was not in force on %s".formatted(policy.getPolicyNumber(), eventDate));
        }
        if (!member.isActiveOn(eventDate)) {
            throw new BusinessRuleException("MEMBER_NOT_ACTIVE",
                    "The member was not active on the event date %s".formatted(eventDate));
        }
        LocalDate waitingPeriodEnd = member.waitingPeriodEndsOn();
        if (eventDate.isBefore(waitingPeriodEnd)) {
            throw new BusinessRuleException("WAITING_PERIOD",
                    "The event date falls within the waiting period, which ends on %s".formatted(waitingPeriodEnd));
        }
    }
}
