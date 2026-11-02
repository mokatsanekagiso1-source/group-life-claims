package dev.grouplife.security;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByUsername(String username);

    boolean existsByRole(Role role);

    List<AppUser> findByRole(Role role);

    List<AppUser> findByMemberId(UUID memberId);
}
