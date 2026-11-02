package dev.grouplife.scheme;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchemeRepository extends JpaRepository<Scheme, UUID> {

    boolean existsByRegistrationNumber(String registrationNumber);
}
