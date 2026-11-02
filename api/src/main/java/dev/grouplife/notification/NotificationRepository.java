package dev.grouplife.notification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findTop30ByRecipientOrderByCreatedAtDesc(String recipient);

    long countByRecipientAndReadAtIsNull(String recipient);

    Optional<Notification> findByIdAndRecipient(UUID id, String recipient);

    @Modifying
    @Query("update Notification n set n.readAt = :at where n.recipient = :recipient and n.readAt is null")
    int markAllRead(@Param("recipient") String recipient, @Param("at") Instant at);
}
