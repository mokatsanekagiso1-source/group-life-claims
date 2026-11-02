package dev.grouplife.notification;

import dev.grouplife.notification.Notification.Type;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class NotificationDtos {

    private NotificationDtos() {}

    public record NotificationView(UUID id, Type type, String title, String body, String link, boolean read,
            Instant createdAt) {}

    public record NotificationFeed(long unread, List<NotificationView> items) {}

    public record UnreadCount(long unread) {}
}
