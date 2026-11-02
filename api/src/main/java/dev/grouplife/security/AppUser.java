package dev.grouplife.security;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String username;
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private Role role;

    /** Set for MEMBER users: the member record they may act on. */
    private UUID memberId;

    protected AppUser() {}

    public AppUser(String username, String passwordHash, Role role, UUID memberId) {
        if (role == Role.MEMBER && memberId == null) {
            throw new IllegalArgumentException("A MEMBER user must be linked to a member record");
        }
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.memberId = memberId;
    }

    public UUID getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public UUID getMemberId() {
        return memberId;
    }
}
