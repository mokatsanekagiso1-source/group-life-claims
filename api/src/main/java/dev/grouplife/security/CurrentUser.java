package dev.grouplife.security;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;

/** The authenticated caller, read from the access token. */
public record CurrentUser(String username, Role role, UUID memberId) {

    static final String ROLE_CLAIM = "role";
    static final String MEMBER_ID_CLAIM = "memberId";

    public static CurrentUser from(Jwt jwt) {
        String memberId = jwt.getClaimAsString(MEMBER_ID_CLAIM);
        return new CurrentUser(jwt.getSubject(), Role.valueOf(jwt.getClaimAsString(ROLE_CLAIM)),
                memberId == null ? null : UUID.fromString(memberId));
    }

    public boolean is(Role role) {
        return this.role == role;
    }

    public boolean ownsMember(UUID memberId) {
        return role == Role.MEMBER && memberId != null && memberId.equals(this.memberId);
    }
}
