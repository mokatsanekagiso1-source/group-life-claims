package dev.grouplife.claim;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Logs committed claim transitions. The database audit trail remains the system of record. */
@Component
class ClaimActivityLogger {

    private static final Logger log = LoggerFactory.getLogger(ClaimActivityLogger.class);

    @TransactionalEventListener
    void on(ClaimTransitionedEvent event) {
        log.info("Claim {} {} -> {} by {}", event.claimNumber(), event.from(), event.to(), event.actor());
    }
}
