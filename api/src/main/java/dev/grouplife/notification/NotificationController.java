package dev.grouplife.notification;

import dev.grouplife.notification.NotificationDtos.NotificationFeed;
import dev.grouplife.notification.NotificationDtos.NotificationView;
import dev.grouplife.notification.NotificationDtos.UnreadCount;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "The signed-in user's in-app notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Latest 30 notifications and the unread count")
    public NotificationFeed feed(@AuthenticationPrincipal Jwt jwt) {
        return service.feed(jwt.getSubject());
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread count, cheap enough to poll")
    public UnreadCount unread(@AuthenticationPrincipal Jwt jwt) {
        return new UnreadCount(service.unreadCount(jwt.getSubject()));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark one notification as read")
    public NotificationView markRead(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.markRead(id, jwt.getSubject());
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark every notification as read")
    public void markAllRead(@AuthenticationPrincipal Jwt jwt) {
        service.markAllRead(jwt.getSubject());
    }
}
