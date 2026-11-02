package dev.grouplife.claim;

import static dev.grouplife.claim.ClaimStatus.APPROVED;
import static dev.grouplife.claim.ClaimStatus.CANCELLED;
import static dev.grouplife.claim.ClaimStatus.PAID;
import static dev.grouplife.claim.ClaimStatus.REJECTED;
import static dev.grouplife.claim.ClaimStatus.SUBMITTED;
import static dev.grouplife.claim.ClaimStatus.UNDER_ASSESSMENT;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ClaimStatusTest {

    /** The lifecycle from the project brief, written out independently of the implementation. */
    private static final Map<ClaimStatus, Set<ClaimStatus>> SPEC = Map.of(
            SUBMITTED, EnumSet.of(UNDER_ASSESSMENT, CANCELLED),
            UNDER_ASSESSMENT, EnumSet.of(APPROVED, REJECTED, CANCELLED),
            APPROVED, EnumSet.of(PAID),
            REJECTED, EnumSet.noneOf(ClaimStatus.class),
            PAID, EnumSet.noneOf(ClaimStatus.class),
            CANCELLED, EnumSet.noneOf(ClaimStatus.class));

    static Stream<Arguments> everyPair() {
        return Stream.of(ClaimStatus.values())
                .flatMap(from -> Stream.of(ClaimStatus.values()).map(to -> Arguments.of(from, to)));
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @MethodSource("everyPair")
    void allowsExactlyTheSpecifiedTransitions(ClaimStatus from, ClaimStatus to) {
        assertThat(from.canTransitionTo(to)).isEqualTo(SPEC.get(from).contains(to));
    }

    @Test
    void terminalStatesAreRejectedPaidAndCancelled() {
        assertThat(EnumSet.allOf(ClaimStatus.class).stream().filter(ClaimStatus::isTerminal))
                .containsExactlyInAnyOrder(REJECTED, PAID, CANCELLED);
    }

    @Test
    void allowedTargetsIsADefensiveCopy() {
        SUBMITTED.allowedTargets().clear();

        assertThat(SUBMITTED.allowedTargets()).containsExactlyInAnyOrder(UNDER_ASSESSMENT, CANCELLED);
    }

    @Test
    void onlyRejectionAndCancellationRequireAReason() {
        assertThat(EnumSet.allOf(ClaimStatus.class).stream().filter(ClaimStatus::requiresReason))
                .containsExactlyInAnyOrder(REJECTED, CANCELLED);
    }
}
